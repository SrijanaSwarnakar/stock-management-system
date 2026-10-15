"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  return await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { purchases: true, payments: true },
      },
    },
  });
}

export async function createSupplier(data: {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  panVatNumber?: string;
  address?: string;
  openingBalance?: number;
}) {
  try {
    const user = await requireManagerOrAdmin();

    const openingBalance = Number(data.openingBalance) || 0;

    const supplier = await db.supplier.create({
      data: {
        name: data.name.trim(),
        companyName: data.companyName?.trim() || null,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        panVatNumber: data.panVatNumber?.trim() || null,
        address: data.address?.trim() || null,
        openingBalance,
        currentBalance: openingBalance,
        isActive: true,
      },
    });

    await logAuditEvent({
      action: "SUPPLIER_CREATE",
      entity: "Supplier",
      entityId: supplier.id,
      newValue: { name: supplier.name, company: supplier.companyName, balance: supplier.currentBalance },
      userId: user.id,
    });

    revalidatePath("/dashboard/suppliers");
    revalidatePath("/dashboard/purchases");
    return { success: true as const, supplier };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create supplier.";
    return { error: msg };
  }
}

export async function updateSupplier(
  id: string,
  data: {
    name: string;
    companyName?: string;
    phone: string;
    email?: string;
    panVatNumber?: string;
    address?: string;
    isActive?: boolean;
  }
) {
  const user = await requireManagerOrAdmin();

  const existing = await db.supplier.findUnique({ where: { id } });
  if (!existing) return { error: "Supplier not found." };

  const updated = await db.supplier.update({
    where: { id },
    data: {
      name: data.name.trim(),
      companyName: data.companyName?.trim() || null,
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      panVatNumber: data.panVatNumber?.trim() || null,
      address: data.address?.trim() || null,
      isActive: typeof data.isActive === "boolean" ? data.isActive : existing.isActive,
    },
  });

  await logAuditEvent({
    action: "SUPPLIER_UPDATE",
    entity: "Supplier",
    entityId: id,
    oldValue: { name: existing.name, phone: existing.phone },
    newValue: { name: updated.name, phone: updated.phone },
    userId: user.id,
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/purchases");
  return { success: true, supplier: updated };
}

export async function getSupplierDetails(id: string) {
  return await db.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { purchaseDate: "desc" },
        take: 20,
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 20,
      },
    },
  });
}
