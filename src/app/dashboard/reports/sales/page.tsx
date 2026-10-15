import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import SalesReportClient from "./sales-report-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Report | Stock Management System",
  description: "Detailed wholesale sales performance, collection trends, and invoice metrics.",
};

export default async function SalesReportPage() {
  await requireAuth();

  const [sales, customers] = await Promise.all([
    db.sale.findMany({
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
      },
    }),
    db.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <SalesReportClient
      initialSales={sales}
      customers={customers}
    />
  );
}
