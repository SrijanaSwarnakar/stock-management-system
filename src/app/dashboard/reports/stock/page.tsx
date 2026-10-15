import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import StockReportClient from "./stock-report-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stock Report | Stock Management System",
  description: "Warehouse stock valuation, cost versus retail comparison, and inventory reorder alerts.",
};

export default async function StockReportPage() {
  await requireAuth();

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        baseUnit: { select: { symbol: true } },
      },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <StockReportClient
      initialProducts={products}
      categories={categories}
    />
  );
}
