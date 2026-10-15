"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { PurchaseStatus, MovementType, DocType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type PurchaseFilter = {
  supplierId?: string;
  status?: PurchaseStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getPurchases(filter: PurchaseFilter = {}) {
  const where: any = {};
  if (filter.supplierId && filter.supplierId !== "ALL") {
    where.supplierId = filter.supplierId;
  }
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { invoiceNumber: { contains: filter.search, mode: "insensitive" } },
      { supplier: { name: { contains: filter.search, mode: "insensitive" } } },
      { supplier: { companyName: { contains: filter.search, mode: "insensitive" } } },
    ];
  }

  return await db.purchase.findMany({
    where,
    orderBy: { purchaseDate: "desc" },
    include: {
      supplier: {
        select: { id: true, name: true, companyName: true, phone: true },
      },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createPurchaseInvoice(data: {
  supplierId: string;
  purchaseDate?: Date;
  lines: Array<{
    productId: string;
    unitId: string;
    qty: number;
    unitCost: number;
    conversionFactor?: number;
  }>;
  discount?: number;
  tax?: number;
  notes?: string;
  postImmediately?: boolean;
}) {
  const user = await requireManagerOrAdmin();

  if (!data.lines || data.lines.length === 0) {
    return { error: "At least one product line item is required." };
  }

  return await db.$transaction(async (tx) => {
    // 1. Generate sequence
    let seq = await tx.invoiceSequence.findUnique({
      where: { docType: DocType.PURCHASE_INVOICE },
    });

    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: {
          docType: DocType.PURCHASE_INVOICE,
          prefix: "PINV-2081-",
          fiscalYear: "2081/82",
          nextNumber: 1,
          padding: 6,
        },
      });
    }

    const invoiceNumber = `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`;

    await tx.invoiceSequence.update({
      where: { id: seq.id },
      data: { nextNumber: seq.nextNumber + 1 },
    });

    // 2. Calculate totals
    const discount = Number(data.discount) || 0;
    const tax = Number(data.tax) || 0;

    let subtotal = 0;
    const linePayloads = [];

    for (const line of data.lines) {
      const lineCost = line.qty * line.unitCost;
      subtotal += lineCost;

      const factor = line.conversionFactor || 1;
      const convertedQtyBase = line.qty * factor;

      linePayloads.push({
        productId: line.productId,
        unitId: line.unitId,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: lineCost,
        convertedQtyBase,
      });
    }

    const total = Math.max(0, subtotal - discount + tax);
    const status = data.postImmediately ? PurchaseStatus.POSTED : PurchaseStatus.DRAFT;

    // 3. Create purchase record
    const purchase = await tx.purchase.create({
      data: {
        invoiceNumber,
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate || new Date(),
        status,
        subtotal,
        discount,
        tax,
        total,
        paidAmount: 0,
        dueAmount: total,
        notes: data.notes?.trim() || null,
        createdById: user.id,
        postedAt: data.postImmediately ? new Date() : null,
        lines: {
          create: linePayloads,
        },
      },
      include: {
        supplier: true,
        lines: { include: { product: true, unit: true } },
      },
    });

    // 4. If posting immediately, update inventory & moving average cost
    if (data.postImmediately) {
      for (const line of linePayloads) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });

        if (!product) continue;

        const oldStock = product.currentStock;
        const oldCost = product.costPrice;
        const addedQty = line.convertedQtyBase;
        const unitCostInBase = line.totalCost / line.convertedQtyBase;

        const newStock = oldStock + addedQty;

        // Moving Weighted Average Cost (WAC) formula
        let newWAC = unitCostInBase;
        if (oldStock > 0 && newStock > 0) {
          newWAC = (oldStock * oldCost + addedQty * unitCostInBase) / newStock;
        }

        const roundedWAC = Math.round(newWAC * 100) / 100;

        // Update product cost and stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            costPrice: roundedWAC,
            currentStock: newStock,
          },
        });

        // Write immutable stock ledger movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: MovementType.PURCHASE,
            qty: addedQty,
            unitCost: unitCostInBase,
            runningBalance: newStock,
            runningAvgCost: roundedWAC,
            referenceType: "PURCHASE",
            referenceId: purchase.id,
            referenceDoc: invoiceNumber,
            notes: `Purchase Receipt from ${purchase.supplier.name}`,
            createdById: user.id,
          },
        });
      }

      // Update supplier balance (+ total payable)
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: {
          currentBalance: {
            increment: total,
          },
        },
      });
    }

    await logAuditEvent({
      action: data.postImmediately ? "PURCHASE_POST" : "PURCHASE_CREATE_DRAFT",
      entity: "Purchase",
      entityId: purchase.id,
      newValue: {
        invoiceNumber,
        supplier: purchase.supplier.name,
        total,
        status,
      },
      userId: user.id,
    });

    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/products");

    return { success: true, purchase };
  });
}

export async function postDraftPurchase(purchaseId: string) {
  const user = await requireManagerOrAdmin();

  return await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
        lines: true,
      },
    });

    if (!purchase) return { error: "Purchase invoice not found." };
    if (purchase.status !== PurchaseStatus.DRAFT) {
      return { error: `Purchase invoice is already ${purchase.status}.` };
    }

    for (const line of purchase.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) continue;

      const oldStock = product.currentStock;
      const oldCost = product.costPrice;
      const addedQty = line.convertedQtyBase;
      const unitCostInBase = line.totalCost / line.convertedQtyBase;

      const newStock = oldStock + addedQty;

      let newWAC = unitCostInBase;
      if (oldStock > 0 && newStock > 0) {
        newWAC = (oldStock * oldCost + addedQty * unitCostInBase) / newStock;
      }
      const roundedWAC = Math.round(newWAC * 100) / 100;

      await tx.product.update({
        where: { id: product.id },
        data: { costPrice: roundedWAC, currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.PURCHASE,
          qty: addedQty,
          unitCost: unitCostInBase,
          runningBalance: newStock,
          runningAvgCost: roundedWAC,
          referenceType: "PURCHASE",
          referenceId: purchase.id,
          referenceDoc: purchase.invoiceNumber,
          notes: `Posted draft purchase receipt from ${purchase.supplier.name}`,
          createdById: user.id,
        },
      });
    }

    // Update supplier current balance
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: { currentBalance: { increment: purchase.dueAmount } },
    });

    const updated = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: PurchaseStatus.POSTED,
        postedAt: new Date(),
      },
    });

    await logAuditEvent({
      action: "PURCHASE_POST",
      entity: "Purchase",
      entityId: purchase.id,
      newValue: { invoiceNumber: purchase.invoiceNumber, status: "POSTED" },
      userId: user.id,
    });

    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/products");

    return { success: true, purchase: updated };
  });
}
