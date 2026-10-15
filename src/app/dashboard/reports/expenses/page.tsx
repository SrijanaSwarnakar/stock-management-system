import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import ExpensesReportClient from "./expenses-report-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses Report | Stock Management System",
  description: "Operating overhead expenses breakdown, category shares, and spending timeline.",
};

export default async function ExpensesReportPage() {
  await requireManagerOrAdmin();

  const [expenses, categories] = await Promise.all([
    db.expense.findMany({
      orderBy: { expenseDate: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    db.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ExpensesReportClient
      initialExpenses={expenses}
      categories={categories}
    />
  );
}
