"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── EXPENSE CATEGORIES ───────────────────────────────────────────────────────

export async function getExpenseCategories() {
  return await db.expenseCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createExpenseCategory(data: { name: string; description?: string }) {
  try {
    const user = await requireManagerOrAdmin();
    const cat = await db.expenseCategory.create({
      data: { name: data.name.trim(), description: data.description?.trim() || null },
    });
    await logAuditEvent({ action: "EXPENSE_CATEGORY_CREATE", entity: "ExpenseCategory", entityId: cat.id, newValue: { name: cat.name }, userId: user.id });
    revalidatePath("/dashboard/expenses");
    return { success: true as const, category: cat };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create category." };
  }
}

export async function updateExpenseCategory(id: string, data: { name: string; description?: string; isActive?: boolean }) {
  const user = await requireManagerOrAdmin();
  const existing = await db.expenseCategory.findUnique({ where: { id } });
  if (!existing) return { error: "Category not found." };
  const updated = await db.expenseCategory.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      isActive: typeof data.isActive === "boolean" ? data.isActive : existing.isActive,
    },
  });
  await logAuditEvent({ action: "EXPENSE_CATEGORY_UPDATE", entity: "ExpenseCategory", entityId: id, newValue: { name: updated.name }, userId: user.id });
  revalidatePath("/dashboard/expenses");
  return { success: true, category: updated };
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses(filter?: { categoryId?: string; from?: Date; to?: Date }) {
  const where: Record<string, unknown> = {};
  if (filter?.categoryId && filter.categoryId !== "ALL") where.categoryId = filter.categoryId;
  if (filter?.from || filter?.to) {
    where.expenseDate = {};
    if (filter.from) (where.expenseDate as Record<string, unknown>).gte = filter.from;
    if (filter.to) (where.expenseDate as Record<string, unknown>).lte = filter.to;
  }
  return await db.expense.findMany({
    where,
    orderBy: { expenseDate: "desc" },
    include: {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createExpense(data: {
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate?: Date;
  referenceNo?: string;
}) {
  try {
    const user = await requireManagerOrAdmin();
    if (data.amount <= 0) return { error: "Amount must be greater than zero." };

    const expense = await db.expense.create({
      data: {
        categoryId: data.categoryId,
        description: data.description.trim(),
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        expenseDate: data.expenseDate || new Date(),
        referenceNo: data.referenceNo?.trim() || null,
        createdById: user.id,
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logAuditEvent({
      action: "EXPENSE_CREATE",
      entity: "Expense",
      entityId: expense.id,
      newValue: { description: expense.description, amount: expense.amount, category: expense.category.name },
      userId: user.id,
    });

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/reports");
    return { success: true as const, expense };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to record expense." };
  }
}

export async function updateExpense(id: string, data: {
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate?: Date;
  referenceNo?: string;
}) {
  try {
    const user = await requireManagerOrAdmin();
    if (data.amount <= 0) return { error: "Amount must be greater than zero." };

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) return { error: "Expense not found." };

    const updated = await db.expense.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        description: data.description.trim(),
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        expenseDate: data.expenseDate || existing.expenseDate,
        referenceNo: data.referenceNo?.trim() || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await logAuditEvent({
      action: "EXPENSE_UPDATE",
      entity: "Expense",
      entityId: id,
      oldValue: { amount: existing.amount },
      newValue: { amount: updated.amount, description: updated.description },
      userId: user.id,
    });

    revalidatePath("/dashboard/expenses");
    return { success: true as const, expense: updated };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update expense." };
  }
}

export async function deleteExpense(id: string) {
  try {
    const user = await requireManagerOrAdmin();
    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) return { error: "Expense not found." };
    await db.expense.delete({ where: { id } });
    await logAuditEvent({ action: "EXPENSE_DELETE", entity: "Expense", entityId: id, oldValue: { amount: existing.amount, description: existing.description }, userId: user.id });
    revalidatePath("/dashboard/expenses");
    return { success: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete expense." };
  }
}
