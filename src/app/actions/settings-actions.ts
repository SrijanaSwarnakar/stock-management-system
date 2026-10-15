"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { DocType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSystemSettings() {
  return await db.systemSetting.findMany({
    orderBy: { key: "asc" },
  });
}

export async function getInvoiceSequences() {
  return await db.invoiceSequence.findMany({
    orderBy: { docType: "asc" },
  });
}

export async function updateSystemSettings(settings: Record<string, string>) {
  try {
    const user = await requireAdmin();

    const updates = Object.entries(settings).map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(updates);

    await logAuditEvent({
      action: "SETTINGS_UPDATE",
      entity: "SystemSetting",
      entityId: "SYSTEM",
      newValue: settings,
      userId: user.id,
    });

    revalidatePath("/dashboard/settings");
    return { success: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update settings." };
  }
}

export async function updateInvoiceSequence(
  id: string,
  data: { prefix: string; fiscalYear: string; nextNumber?: number }
) {
  try {
    const user = await requireAdmin();

    const existing = await db.invoiceSequence.findUnique({ where: { id } });
    if (!existing) return { error: "Sequence not found." };

    const updated = await db.invoiceSequence.update({
      where: { id },
      data: {
        prefix: data.prefix.trim(),
        fiscalYear: data.fiscalYear.trim(),
        ...(data.nextNumber ? { nextNumber: Math.max(1, data.nextNumber) } : {}),
      },
    });

    await logAuditEvent({
      action: "SEQUENCE_UPDATE",
      entity: "InvoiceSequence",
      entityId: id,
      oldValue: { prefix: existing.prefix, fiscalYear: existing.fiscalYear, nextNumber: existing.nextNumber },
      newValue: { prefix: updated.prefix, fiscalYear: updated.fiscalYear, nextNumber: updated.nextNumber },
      userId: user.id,
    });

    revalidatePath("/dashboard/settings");
    return { success: true as const, sequence: updated };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update invoice sequence." };
  }
}
