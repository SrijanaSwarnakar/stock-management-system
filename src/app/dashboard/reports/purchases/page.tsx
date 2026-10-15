import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import PurchasesReportClient from "./purchases-report-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchases Report | Stock Management System",
  description: "Comprehensive procurement, supplier expenditure, and payable dues report.",
};

export default async function PurchasesReportPage() {
  await requireAuth();

  const [purchases, suppliers] = await Promise.all([
    db.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, companyName: true } },
      },
    }),
    db.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <PurchasesReportClient
      initialPurchases={purchases}
      suppliers={suppliers}
    />
  );
}
