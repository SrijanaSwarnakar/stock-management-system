"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin, requireRole } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export async function getCustomers() {
  return await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { sales: true, payments: true } },
    },
  });
}

export async function createCustomer(data: {
  name: string;
  shopName?: string;
  phone: string;
  email?: string;
  panVatNumber?: string;
  address?: string;
  creditLimit?: number;
  openingBalance?: number;
}) {
  try {
    const user = await requireManagerOrAdmin();

    const openingBalance = Number(data.openingBalance) || 0;
    const creditLimit = Number(data.creditLimit) || 0;

    const customer = await db.customer.create({
      data: {
        name: data.name.trim(),
        shopName: data.shopName?.trim() || null,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        panVatNumber: data.panVatNumber?.trim() || null,
        address: data.address?.trim() || null,
        creditLimit,
        openingBalance,
        currentBalance: openingBalance,
        isActive: true,
      },
    });

    await logAuditEvent({
      action: "CUSTOMER_CREATE",
      entity: "Customer",
      entityId: customer.id,
      newValue: { name: customer.name, phone: customer.phone, creditLimit },
      userId: user.id,
    });

    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/sales");
    return { success: true as const, customer };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create customer.";
    return { error: msg };
  }
}

export async function updateCustomer(
  id: string,
  data: {
    name: string;
    shopName?: string;
    phone: string;
    email?: string;
    panVatNumber?: string;
    address?: string;
    creditLimit?: number;
    isActive?: boolean;
  }
) {
  const user = await requireManagerOrAdmin();

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return { error: "Customer not found." };

  const updated = await db.customer.update({
    where: { id },
    data: {
      name: data.name.trim(),
      shopName: data.shopName?.trim() || null,
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      panVatNumber: data.panVatNumber?.trim() || null,
      address: data.address?.trim() || null,
      creditLimit: Number(data.creditLimit) || existing.creditLimit,
      isActive: typeof data.isActive === "boolean" ? data.isActive : existing.isActive,
    },
  });

  await logAuditEvent({
    action: "CUSTOMER_UPDATE",
    entity: "Customer",
    entityId: id,
    oldValue: { name: existing.name, phone: existing.phone },
    newValue: { name: updated.name, phone: updated.phone },
    userId: user.id,
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/sales");
  return { success: true, customer: updated };
}

export async function getCustomerDetails(id: string) {
  return await db.customer.findUnique({
    where: { id },
    include: {
      sales: {
        orderBy: { saleDate: "desc" },
        take: 20,
        include: { lines: true, payments: true },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 20,
      },
    },
  });
}

export async function deleteCustomer(id: string) {
  const user = await requireRole([Role.ADMIN]);

  const existing = await db.customer.findUnique({
    where: { id },
    include: { _count: { select: { sales: true } } },
  });
  if (!existing) return { error: "Customer not found." };
  if (existing._count.sales > 0)
    return { error: "Cannot delete customer with existing sales. Deactivate instead." };

  await db.customer.delete({ where: { id } });

  await logAuditEvent({
    action: "CUSTOMER_DELETE",
    entity: "Customer",
    entityId: id,
    oldValue: { name: existing.name },
    userId: user.id,
  });

  revalidatePath("/dashboard/customers");
  return { success: true as const };
}
