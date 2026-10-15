"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { DocType, MovementType, ReturnStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── HELPER: Generate Return Number ──────────────────────────────────────────

async function getNextSequence(
  tx: any,
  docType: DocType,
  defaultPrefix: string
) {
  let seq = await tx.invoiceSequence.findUnique({
    where: { docType },
  });

  if (!seq) {
    seq = await tx.invoiceSequence.create({
      data: {
        docType,
        prefix: defaultPrefix,
        fiscalYear: "2081/82",
        nextNumber: 1,
        padding: 6,
      },
    });
  }

  const numberStr = `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`;

  await tx.invoiceSequence.update({
    where: { id: seq.id },
    data: { nextNumber: seq.nextNumber + 1 },
  });

  return numberStr;
}

// ─── SALE RETURNS (Customer Returns Goods) ───────────────────────────────────

export async function getSaleReturns() {
  return await db.saleReturn.findMany({
    orderBy: { returnDate: "desc" },
    include: {
      sale: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          customer: { select: { id: true, name: true, shopName: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true, baseUnit: { select: { symbol: true } } } },
        },
      },
    },
  });
}

export async function createSaleReturn(data: {
  saleId: string;
  returnDate?: Date;
  reason?: string;
  lines: {
    productId: string;
    qty: number;
    unitPrice: number;
  }[];
}) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.SALES_STAFF]);

  if (!data.lines || data.lines.length === 0) {
    return { error: "Please add at least one item to return." };
  }

  for (const line of data.lines) {
    if (line.qty <= 0) {
      return { error: "Return quantity must be greater than zero." };
    }
  }

  return await db.$transaction(async (tx) => {
    // 1. Fetch sale with existing returns & lines
    const sale = await tx.sale.findUnique({
      where: { id: data.saleId },
      include: {
        customer: true,
        lines: true,
        returns: {
          where: { status: ReturnStatus.COMPLETED },
          include: { lines: true },
        },
      },
    });

    if (!sale) return { error: "Sale invoice not found." };

    // 2. Validate return quantities against original sale minus prior returns
    for (const returnLine of data.lines) {
      const originalLine = sale.lines.find((l) => l.productId === returnLine.productId);
      if (!originalLine) {
        return { error: `Product is not part of original invoice ${sale.invoiceNumber}.` };
      }

      const alreadyReturnedQty = sale.returns.reduce((sum, ret) => {
        const matching = ret.lines.find((l) => l.productId === returnLine.productId);
        return sum + (matching ? matching.qty : 0);
      }, 0);

      const maxReturnable = originalLine.qty - alreadyReturnedQty;
      if (returnLine.qty > maxReturnable + 0.0001) {
        return {
          error: `Cannot return ${returnLine.qty} units. Maximum returnable quantity is ${maxReturnable.toFixed(2)}.`,
        };
      }
    }

    // 3. Generate Return Number
    const returnNumber = await getNextSequence(tx, DocType.SALE_RETURN, "SRTN-2081-");

    // 4. Calculate total return amount & prepare lines
    let totalReturnAmount = 0;
    const returnLinesData = [];

    for (const line of data.lines) {
      const originalLine = sale.lines.find((l) => l.productId === line.productId)!;
      const lineTotal = line.qty * line.unitPrice;
      totalReturnAmount += lineTotal;

      returnLinesData.push({
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        costPriceAtSale: originalLine.costPriceAtSale,
        totalPrice: lineTotal,
      });
    }

    // 5. Create SaleReturn record
    const saleReturn = await tx.saleReturn.create({
      data: {
        returnNumber,
        saleId: sale.id,
        returnDate: data.returnDate ? new Date(data.returnDate) : new Date(),
        status: ReturnStatus.COMPLETED,
        reason: data.reason?.trim() || null,
        totalAmount: totalReturnAmount,
        createdById: user.id,
        lines: {
          create: returnLinesData,
        },
      },
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, baseUnit: { select: { symbol: true } } } },
          },
        },
      },
    });

    // 6. Restock products & record stock movements
    for (const line of returnLinesData) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
      });
      if (!product) continue;

      const newStock = product.currentStock + line.qty;

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.SALE_RETURN,
          qty: line.qty,
          unitCost: line.costPriceAtSale,
          runningBalance: newStock,
          runningAvgCost: product.costPrice,
          referenceType: "SALE_RETURN",
          referenceId: saleReturn.id,
          referenceDoc: returnNumber,
          notes: `Sale return from Invoice ${sale.invoiceNumber}. Reason: ${data.reason || "N/A"}`,
          createdById: user.id,
        },
      });
    }

    // 7. Adjust customer balance and sale due amount
    // Customer balance is credited (reduced by total return amount)
    await tx.customer.update({
      where: { id: sale.customerId },
      data: { currentBalance: { decrement: totalReturnAmount } },
    });

    const newSaleDue = Math.max(0, sale.dueAmount - totalReturnAmount);
    await tx.sale.update({
      where: { id: sale.id },
      data: { dueAmount: newSaleDue },
    });

    // 8. Log Audit Event
    await logAuditEvent({
      action: "SALE_RETURN",
      entity: "SaleReturn",
      entityId: saleReturn.id,
      newValue: {
        returnNumber,
        invoiceNumber: sale.invoiceNumber,
        customer: sale.customer.name,
        totalAmount: totalReturnAmount,
        linesCount: returnLinesData.length,
      },
      userId: user.id,
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/sales/returns");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/ledger");
    revalidatePath("/dashboard/customers");

    return { success: true as const, saleReturn };
  });
}

// ─── PURCHASE RETURNS (Returning Goods to Supplier) ───────────────────────────

export async function getPurchaseReturns() {
  return await db.purchaseReturn.findMany({
    orderBy: { returnDate: "desc" },
    include: {
      purchase: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          supplier: { select: { id: true, name: true, companyName: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true, baseUnit: { select: { symbol: true } } } },
        },
      },
    },
  });
}

export async function createPurchaseReturn(data: {
  purchaseId: string;
  returnDate?: Date;
  reason?: string;
  lines: {
    productId: string;
    qty: number;
    unitCost: number;
  }[];
}) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER]);

  if (!data.lines || data.lines.length === 0) {
    return { error: "Please add at least one item to return to supplier." };
  }

  for (const line of data.lines) {
    if (line.qty <= 0) {
      return { error: "Return quantity must be greater than zero." };
    }
  }

  return await db.$transaction(async (tx) => {
    // 1. Fetch purchase with existing returns & lines
    const purchase = await tx.purchase.findUnique({
      where: { id: data.purchaseId },
      include: {
        supplier: true,
        lines: true,
        returns: {
          where: { status: ReturnStatus.COMPLETED },
          include: { lines: true },
        },
      },
    });

    if (!purchase) return { error: "Purchase invoice not found." };

    // 2. Validate return quantities against original purchase and stock in hand
    for (const returnLine of data.lines) {
      const originalLine = purchase.lines.find((l) => l.productId === returnLine.productId);
      if (!originalLine) {
        return { error: `Product is not part of original purchase ${purchase.invoiceNumber}.` };
      }

      const alreadyReturnedQty = purchase.returns.reduce((sum, ret) => {
        const matching = ret.lines.find((l) => l.productId === returnLine.productId);
        return sum + (matching ? matching.qty : 0);
      }, 0);

      const maxReturnable = originalLine.qty - alreadyReturnedQty;
      if (returnLine.qty > maxReturnable + 0.0001) {
        return {
          error: `Cannot return ${returnLine.qty} units. Maximum returnable quantity against this purchase is ${maxReturnable.toFixed(2)}.`,
        };
      }

      // Check current stock availability
      const product = await tx.product.findUnique({ where: { id: returnLine.productId } });
      if (!product || product.currentStock < returnLine.qty) {
        return {
          error: `Insufficient stock on hand for "${product?.name || returnLine.productId}". Current stock is ${product?.currentStock ?? 0}, attempting to return ${returnLine.qty}.`,
        };
      }
    }

    // 3. Generate Return Number
    const returnNumber = await getNextSequence(tx, DocType.PURCHASE_RETURN, "PRTN-2081-");

    // 4. Calculate total return amount & prepare lines
    let totalReturnAmount = 0;
    const returnLinesData = [];

    for (const line of data.lines) {
      const lineCost = line.qty * line.unitCost;
      totalReturnAmount += lineCost;

      returnLinesData.push({
        productId: line.productId,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: lineCost,
      });
    }

    // 5. Create PurchaseReturn record
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        purchaseId: purchase.id,
        returnDate: data.returnDate ? new Date(data.returnDate) : new Date(),
        status: ReturnStatus.COMPLETED,
        reason: data.reason?.trim() || null,
        totalAmount: totalReturnAmount,
        createdById: user.id,
        lines: {
          create: returnLinesData,
        },
      },
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, baseUnit: { select: { symbol: true } } } },
          },
        },
      },
    });

    // 6. Deduct products from stock & record stock movements
    for (const line of returnLinesData) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
      });
      if (!product) continue;

      const newStock = product.currentStock - line.qty;

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.PURCHASE_RETURN,
          qty: -line.qty,
          unitCost: line.unitCost,
          runningBalance: newStock,
          runningAvgCost: product.costPrice,
          referenceType: "PURCHASE_RETURN",
          referenceId: purchaseReturn.id,
          referenceDoc: returnNumber,
          notes: `Purchase return to ${purchase.supplier.name} for Invoice ${purchase.invoiceNumber}. Reason: ${data.reason || "N/A"}`,
          createdById: user.id,
        },
      });
    }

    // 7. Adjust supplier balance and purchase due amount
    // Supplier balance is decremented (we owe them less)
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: { currentBalance: { decrement: totalReturnAmount } },
    });

    const newPurchaseDue = Math.max(0, purchase.dueAmount - totalReturnAmount);
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { dueAmount: newPurchaseDue },
    });

    // 8. Log Audit Event
    await logAuditEvent({
      action: "PURCHASE_RETURN",
      entity: "PurchaseReturn",
      entityId: purchaseReturn.id,
      newValue: {
        returnNumber,
        invoiceNumber: purchase.invoiceNumber,
        supplier: purchase.supplier.name,
        totalAmount: totalReturnAmount,
        linesCount: returnLinesData.length,
      },
      userId: user.id,
    });

    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/purchases/returns");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/ledger");
    revalidatePath("/dashboard/suppliers");

    return { success: true as const, purchaseReturn };
  });
}
