import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { SaleStatus, ReturnStatus } from "@prisma/client";
import ProfitLossClient from "./profit-loss-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profit & Loss | Stock Management System",
  description: "Trading profit and loss statement, gross margin, COGS, and overheads.",
};

export default async function ProfitLossPage() {
  await requireManagerOrAdmin();

  const [sales, returns, expenses] = await Promise.all([
    db.sale.findMany({
      where: {
        status: { in: [SaleStatus.POSTED, SaleStatus.PARTIAL, SaleStatus.PAID] },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discount: true,
        saleDate: true,
        lines: {
          select: {
            qty: true,
            costPriceAtSale: true,
            totalPrice: true,
          },
        },
      },
    }),
    db.saleReturn.findMany({
      where: { status: ReturnStatus.COMPLETED },
      select: {
        id: true,
        totalAmount: true,
        returnDate: true,
        lines: {
          select: {
            qty: true,
            costPriceAtSale: true,
          },
        },
      },
    }),
    db.expense.findMany({
      select: {
        id: true,
        amount: true,
        expenseDate: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <ProfitLossClient
      sales={sales}
      returns={returns}
      expenses={expenses}
    />
  );
}
