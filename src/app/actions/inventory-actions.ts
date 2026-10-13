"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { MovementType, AdjustmentType, DocType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type StockLedgerFilter = {
  productId?: string;
  movementType?: MovementType;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getInventoryOverview() {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true } },
      baseUnit: { select: { id: true, name: true, symbol: true } },
    },
  });

  const totalCostValuation = products.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);
  const totalItemsCount = products.reduce((acc, p) => acc + p.currentStock, 0);
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.reorderThreshold).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;

  return {
    products,
    metrics: {
      totalCostValuation,
      totalRetailValuation,
      potentialProfit: totalRetailValuation - totalCostValuation,
      totalItemsCount,
      lowStockCount,
      outOfStockCount,
    },
  };
}

export async function getStockLedger(filters: StockLedgerFilter = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 30;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filters.productId && filters.productId !== "ALL") {
    where.productId = filters.productId;
  }
  if (filters.movementType) {
    where.movementType = filters.movementType;
  }
  if (filters.search) {
    where.OR = [
      { referenceDoc: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
      { product: { name: { contains: filters.search, mode: "insensitive" } } },
      { product: { sku: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [movements, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            baseUnit: { select: { symbol: true } },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
    db.stockMovement.count({ where }),
  ]);

  return {
    movements,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

export async function getStockAdjustments() {
  return await db.stockAdjustment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          baseUnit: { select: { symbol: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });
}

export async function createStockAdjustment(data: {
  productId: string;
  adjustmentType: AdjustmentType;
  qty: number; // positive quantity input by user
  unitCost?: number;
  reason: string;
}) {
  const user = await requireManagerOrAdmin();

  if (!data.reason?.trim()) {
    return { error: "A detailed reason for the adjustment is required." };
  }

  if (data.qty <= 0) {
    return { error: "Quantity must be greater than zero." };
  }

  return await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: data.productId },
      include: { baseUnit: true },
    });

    if (!product) return { error: "Product not found." };

    // Determine signed quantity based on type
    const isOutflow =
      data.adjustmentType === AdjustmentType.DECREASE ||
      data.adjustmentType === AdjustmentType.DAMAGE ||
      data.adjustmentType === AdjustmentType.EXPIRY ||
      data.adjustmentType === AdjustmentType.THEFT;

    const signedQty = isOutflow ? -Math.abs(data.qty) : Math.abs(data.qty);
    const newStock = product.currentStock + signedQty;

    if (newStock < 0) {
      return {
        error: `Insufficient stock for decrease. Current stock is ${product.currentStock} ${product.baseUnit.symbol}, attempting to deduct ${data.qty}.`,
      };
    }

    // Sequence for adjustment
    let seq = await tx.invoiceSequence.findUnique({
      where: { docType: DocType.STOCK_ADJUSTMENT },
    });

    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: {
          docType: DocType.STOCK_ADJUSTMENT,
          prefix: "SADJ-2081-",
          fiscalYear: "2081/82",
          nextNumber: 1,
          padding: 6,
        },
      });
    }

    const adjustmentNumber = `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`;

    await tx.invoiceSequence.update({
      where: { id: seq.id },
      data: { nextNumber: seq.nextNumber + 1 },
    });

    const unitCost = data.unitCost !== undefined ? data.unitCost : product.costPrice;

    // 1. Create StockAdjustment
    const adjustment = await tx.stockAdjustment.create({
      data: {
        adjustmentNumber,
        productId: product.id,
        adjustmentType: data.adjustmentType,
        qty: signedQty,
        unitCost,
        reason: data.reason.trim(),
        createdById: user.id,
        approvedById: user.id,
      },
    });

    // 2. Create immutable StockMovement ledger entry
    const movementType = isOutflow ? MovementType.ADJUSTMENT_OUT : MovementType.ADJUSTMENT_IN;
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        movementType,
        qty: signedQty,
        unitCost,
        runningBalance: newStock,
        runningAvgCost: product.costPrice,
        referenceType: "ADJUSTMENT",
        referenceId: adjustment.id,
        referenceDoc: adjustmentNumber,
        notes: `Adjustment: ${data.adjustmentType} — ${data.reason.trim()}`,
        createdById: user.id,
      },
    });

    // 3. Update Product currentStock
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    // 4. Audit Log
    await logAuditEvent({
      action: "STOCK_ADJUSTMENT",
      entity: "StockAdjustment",
      entityId: adjustment.id,
      newValue: {
        adjustmentNumber,
        product: product.name,
        type: data.adjustmentType,
        qty: signedQty,
        previousStock: product.currentStock,
        newStock,
      },
      userId: user.id,
    });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/ledger");
    revalidatePath("/dashboard/inventory/adjustments");
    revalidatePath("/dashboard/products");

    return { success: true, adjustment, updatedProduct };
  });
}
