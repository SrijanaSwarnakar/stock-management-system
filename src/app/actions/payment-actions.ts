"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { PaymentMethod, SaleStatus, DocType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── CUSTOMER PAYMENTS (Money Received) ──────────────────────────────────────

export async function getCustomerPayments() {
  return await db.customerPayment.findMany({
    orderBy: { paymentDate: "desc" },
    include: {
      customer: { select: { id: true, name: true, shopName: true } },
      sale: { select: { id: true, invoiceNumber: true, total: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function recordCustomerPayment(data: {
  customerId: string;
  saleId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  referenceNo?: string;
  notes?: string;
}) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER, Role.SALES_STAFF]);

  if (data.amount <= 0) return { error: "Payment amount must be greater than zero." };

  return await db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return { error: "Customer not found." };

    // Validate specific sale if provided
    if (data.saleId) {
      const sale = await tx.sale.findUnique({ where: { id: data.saleId } });
      if (!sale) return { error: "Sale invoice not found." };
      if (sale.customerId !== data.customerId) return { error: "Sale does not belong to this customer." };
      if (sale.status === SaleStatus.CANCELLED) return { error: "Cannot record payment for a cancelled sale." };
      if (data.amount > sale.dueAmount + 0.01) {
        return { error: `Payment (NPR ${data.amount.toFixed(2)}) exceeds outstanding due (NPR ${sale.dueAmount.toFixed(2)}).` };
      }
    }

    // Generate payment number
    let seq = await tx.invoiceSequence.findUnique({ where: { docType: DocType.PAYMENT_RECEIVED } });
    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: { docType: DocType.PAYMENT_RECEIVED, prefix: "RCPT-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
      });
    }
    const paymentNumber = `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`;
    await tx.invoiceSequence.update({ where: { id: seq.id }, data: { nextNumber: seq.nextNumber + 1 } });

    // Create payment record
    const payment = await tx.customerPayment.create({
      data: {
        paymentNumber,
        customerId: data.customerId,
        saleId: data.saleId || null,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate || new Date(),
        referenceNo: data.referenceNo?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: user.id,
      },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        sale: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Reduce customer outstanding balance
    await tx.customer.update({
      where: { id: data.customerId },
      data: { currentBalance: { decrement: data.amount } },
    });

    // Update sale paid/due amounts if linked
    if (data.saleId) {
      const sale = await tx.sale.findUnique({ where: { id: data.saleId } });
      if (sale) {
        const newPaid = sale.paidAmount + data.amount;
        const newDue = Math.max(0, sale.total - newPaid);
        const newStatus = newDue <= 0.01 ? SaleStatus.PAID : newPaid > 0 ? SaleStatus.PARTIAL : sale.status;
        await tx.sale.update({
          where: { id: data.saleId },
          data: { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
        });
      }
    }

    await logAuditEvent({
      action: "PAYMENT_RECEIVED",
      entity: "CustomerPayment",
      entityId: payment.id,
      newValue: { paymentNumber, customer: customer.name, amount: data.amount, method: data.paymentMethod },
      userId: user.id,
    });

    revalidatePath("/dashboard/payments/received");
    revalidatePath("/dashboard/sales");
    revalidatePath("/dashboard/customers");

    return { success: true as const, payment };
  });
}

// ─── SUPPLIER PAYMENTS (Money Made) ──────────────────────────────────────────

export async function getSupplierPayments() {
  return await db.supplierPayment.findMany({
    orderBy: { paymentDate: "desc" },
    include: {
      supplier: { select: { id: true, name: true, companyName: true } },
      purchase: { select: { id: true, invoiceNumber: true, total: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function recordSupplierPayment(data: {
  supplierId: string;
  purchaseId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  referenceNo?: string;
  notes?: string;
}) {
  const user = await requireRole([Role.ADMIN, Role.MANAGER]);

  if (data.amount <= 0) return { error: "Payment amount must be greater than zero." };

  return await db.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) return { error: "Supplier not found." };

    if (data.purchaseId) {
      const purchase = await tx.purchase.findUnique({ where: { id: data.purchaseId } });
      if (!purchase) return { error: "Purchase invoice not found." };
      if (purchase.supplierId !== data.supplierId) return { error: "Purchase does not belong to this supplier." };
      if (data.amount > purchase.dueAmount + 0.01) {
        return { error: `Payment (NPR ${data.amount.toFixed(2)}) exceeds outstanding due (NPR ${purchase.dueAmount.toFixed(2)}).` };
      }
    }

    // Generate payment number
    let seq = await tx.invoiceSequence.findUnique({ where: { docType: DocType.PAYMENT_MADE } });
    if (!seq) {
      seq = await tx.invoiceSequence.create({
        data: { docType: DocType.PAYMENT_MADE, prefix: "PYMT-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
      });
    }
    const paymentNumber = `${seq.prefix}${String(seq.nextNumber).padStart(seq.padding, "0")}`;
    await tx.invoiceSequence.update({ where: { id: seq.id }, data: { nextNumber: seq.nextNumber + 1 } });

    const payment = await tx.supplierPayment.create({
      data: {
        paymentNumber,
        supplierId: data.supplierId,
        purchaseId: data.purchaseId || null,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate || new Date(),
        referenceNo: data.referenceNo?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: user.id,
      },
      include: {
        supplier: { select: { id: true, name: true, companyName: true } },
        purchase: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Reduce supplier outstanding balance (we owe less)
    await tx.supplier.update({
      where: { id: data.supplierId },
      data: { currentBalance: { decrement: data.amount } },
    });

    // Update purchase paid/due if linked
    if (data.purchaseId) {
      const purchase = await tx.purchase.findUnique({ where: { id: data.purchaseId } });
      if (purchase) {
        const newPaid = purchase.paidAmount + data.amount;
        const newDue = Math.max(0, purchase.total - newPaid);
        await tx.purchase.update({
          where: { id: data.purchaseId },
          data: { paidAmount: newPaid, dueAmount: newDue },
        });
      }
    }

    await logAuditEvent({
      action: "PAYMENT_MADE",
      entity: "SupplierPayment",
      entityId: payment.id,
      newValue: { paymentNumber, supplier: supplier.name, amount: data.amount, method: data.paymentMethod },
      userId: user.id,
    });

    revalidatePath("/dashboard/payments/made");
    revalidatePath("/dashboard/purchases");
    revalidatePath("/dashboard/suppliers");

    return { success: true as const, payment };
  });
}
