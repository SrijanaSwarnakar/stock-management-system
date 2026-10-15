"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { SaleStatus, MovementType, DocType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type SaleFilter = {
  customerId?: string;
  status?: SaleStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getSales(filter: SaleFilter = {}) {
  const where: Record<string, unknown> = {};
  if (filter.customerId && filter.customerId !== "ALL") {
    where.customerId = filter.customerId;
  }
  if (filter.status) {
    where.status = filter.status;
  }
  if (filter.search) {
    where.OR = [
      { invoiceNumber: { contains: filter.search, mode: "insensitive" } },
      { customer: { name: { contains: filter.search, mode: "insensitive" } } },
      { customer: { shopName: { contains: filter.search, mode: "insensitive" } } },
    ];
  }

  return await db.sale.findMany({
    where,
    orderBy: { saleDate: "desc" },
    include: {
      customer: { select: { id: true, name: true, shopName: true, phone: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      payments: { select: { id: true, amount: true } },
    },
  });
}

export async function createSaleInvoice(data: {
  customerId: string;
  saleDate?: Date;
  lines: Array<{
    productId: string;
    unitId: string;
    qty: number;
    unitPrice: number;
    conversionFactor?: number;
  }>;
  discount?: number;
  notes?: string;
  postImmediately?: boolean;
}) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.SALES_STAFF]);

  if (!data.lines || data.lines.length === 0) {
    return { error: "At least one product line item is required." };
  }

  return await db.$transaction(async (tx) => {
    // 1. Validate customer
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { error: "Customer not found." };
    if (!customer.isActive) return { error: "Customer account is inactive." };

    // 2. Generate invoice number sequence
    let seq = await tx.invoiceSequence.findUnique({
      where: { docType: DocType.SALE_INVOICE },
    });

    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: {
          docType: DocType.SALE_INVOICE,
          prefix: "SINV-2081-",
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

    // 3. Validate stock and build line payloads
    const discount = Number(data.discount) || 0;
    let subtotal = 0;

    interface LinePayload {
      productId: string;
      unitId: string;
      qty: number;
      unitPrice: number;
      costPriceAtSale: number;
      totalPrice: number;
      convertedQtyBase: number;
    }

    const linePayloads: LinePayload[] = [];
    const stockWarnings: string[] = [];

    for (const line of data.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) return { error: `Product not found.` };
      if (!product.isActive) return { error: `Product "${product.name}" is inactive.` };

      const factor = line.conversionFactor || 1;
      const convertedQtyBase = line.qty * factor;
      const lineTotal = line.qty * line.unitPrice;
      subtotal += lineTotal;

      // Stock check
      if (data.postImmediately) {
        if (product.currentStock < convertedQtyBase) {
          return {
            error: `Insufficient stock for "${product.name}". Available: ${product.currentStock.toFixed(2)}, Required: ${convertedQtyBase.toFixed(2)}.`,
          };
        }
      }

      linePayloads.push({
        productId: line.productId,
        unitId: line.unitId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        costPriceAtSale: product.costPrice, // WAC snapshot at time of sale
        totalPrice: lineTotal,
        convertedQtyBase,
      });
    }

    const total = Math.max(0, subtotal - discount);

    // 4. Soft credit limit warning (warn but do not block)
    if (customer.creditLimit > 0) {
      const newBalance = customer.currentBalance + total;
      if (newBalance > customer.creditLimit) {
        stockWarnings.push(
          `Credit limit warning: ${customer.name}'s balance (NPR ${newBalance.toFixed(2)}) will exceed credit limit (NPR ${customer.creditLimit.toFixed(2)}).`
        );
      }
    }

    const status = data.postImmediately ? SaleStatus.POSTED : SaleStatus.DRAFT;

    // 5. Create sale record
    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        saleDate: data.saleDate || new Date(),
        status,
        subtotal,
        discount,
        tax: 0,
        total,
        paidAmount: 0,
        dueAmount: total,
        notes: data.notes?.trim() || null,
        createdById: user.id,
        postedAt: data.postImmediately ? new Date() : null,
        lines: { create: linePayloads },
      },
      include: {
        customer: true,
        lines: { include: { product: true, unit: true } },
      },
    });

    // 6. If posting immediately, deduct stock and write ledger movements
    if (data.postImmediately) {
      for (const line of linePayloads) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) continue;

        const newStock = product.currentStock - line.convertedQtyBase;

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Immutable stock ledger entry (negative qty = outflow)
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: MovementType.SALE,
            qty: -line.convertedQtyBase,
            unitCost: line.costPriceAtSale,
            runningBalance: newStock,
            runningAvgCost: product.costPrice,
            referenceType: "SALE",
            referenceId: sale.id,
            referenceDoc: invoiceNumber,
            notes: `Sale to ${sale.customer.name}`,
            createdById: user.id,
          },
        });
      }

      // Update customer balance (they now owe us more)
      await tx.customer.update({
        where: { id: data.customerId },
        data: { currentBalance: { increment: total } },
      });
    }

    await logAuditEvent({
      action: data.postImmediately ? "SALE_POST" : "SALE_CREATE_DRAFT",
      entity: "Sale",
      entityId: sale.id,
      newValue: { invoiceNumber, customer: sale.customer.name, total, status },
      userId: user.id,
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/products");

    return { success: true, sale, warnings: stockWarnings };
  });
}

export async function postDraftSale(saleId: string) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.SALES_STAFF]);

  return await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { customer: true, lines: true },
    });

    if (!sale) return { error: "Sale invoice not found." };
    if (sale.status !== SaleStatus.DRAFT) {
      return { error: `Sale invoice is already ${sale.status}.` };
    }

    // Validate stock for each line
    for (const line of sale.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) continue;
      if (product.currentStock < line.convertedQtyBase) {
        return {
          error: `Insufficient stock for product (ID: ${line.productId}). Available: ${product.currentStock.toFixed(2)}, Required: ${line.convertedQtyBase.toFixed(2)}.`,
        };
      }
    }

    // Deduct stock and write ledger
    for (const line of sale.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) continue;

      const newStock = product.currentStock - line.convertedQtyBase;

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.SALE,
          qty: -line.convertedQtyBase,
          unitCost: line.costPriceAtSale,
          runningBalance: newStock,
          runningAvgCost: product.costPrice,
          referenceType: "SALE",
          referenceId: sale.id,
          referenceDoc: sale.invoiceNumber,
          notes: `Posted draft sale to ${sale.customer.name}`,
          createdById: user.id,
        },
      });
    }

    // Update customer balance
    await tx.customer.update({
      where: { id: sale.customerId },
      data: { currentBalance: { increment: sale.dueAmount } },
    });

    const updated = await tx.sale.update({
      where: { id: saleId },
      data: { status: SaleStatus.POSTED, postedAt: new Date() },
    });

    await logAuditEvent({
      action: "SALE_POST",
      entity: "Sale",
      entityId: sale.id,
      newValue: { invoiceNumber: sale.invoiceNumber, status: "POSTED" },
      userId: user.id,
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/products");

    return { success: true, sale: updated };
  });
}

export async function cancelSale(saleId: string, reason: string) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER]);

  return await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { customer: true, lines: true },
    });

    if (!sale) return { error: "Sale invoice not found." };
    if (sale.status === SaleStatus.CANCELLED) return { error: "Sale is already cancelled." };
    if (sale.paidAmount > 0) return { error: "Cannot cancel a sale with recorded payments. Process a return instead." };

    // If posted, restore stock
    if (sale.status === SaleStatus.POSTED) {
      for (const line of sale.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) continue;

        const newStock = product.currentStock + line.convertedQtyBase;

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: MovementType.SALE_RETURN,
            qty: line.convertedQtyBase,
            unitCost: line.costPriceAtSale,
            runningBalance: newStock,
            runningAvgCost: product.costPrice,
            referenceType: "SALE_CANCEL",
            referenceId: sale.id,
            referenceDoc: sale.invoiceNumber,
            notes: `Cancelled sale: ${reason}`,
            createdById: user.id,
          },
        });
      }

      // Reverse customer balance
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { currentBalance: { decrement: sale.dueAmount } },
      });
    }

    const updated = await tx.sale.update({
      where: { id: saleId },
      data: { status: SaleStatus.CANCELLED, notes: sale.notes ? `${sale.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}` },
    });

    await logAuditEvent({
      action: "SALE_CANCEL",
      entity: "Sale",
      entityId: sale.id,
      newValue: { invoiceNumber: sale.invoiceNumber, reason, status: "CANCELLED" },
      userId: user.id,
    });

    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/inventory");

    return { success: true, sale: updated };
  });
}
