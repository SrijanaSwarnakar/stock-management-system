import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import ExpensesClient from "./expenses-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses | Stock Management System",
  description: "Track and manage business operational expenses by category.",
};

export default async function ExpensesPage() {
  await requireManagerOrAdmin();

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
      take: 200,
    }),
    db.expenseCategory.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expenses}
      initialCategories={categories}
    />
  );
}
