import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { PurchaseStatus } from "@prisma/client";
import MadeClient from "./made-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments Made | Stock Management System",
  description: "Record and track supplier payments against purchase invoices.",
};

export default async function PaymentsMadePage() {
  await requireManagerOrAdmin();

  const [payments, suppliers, openPurchases] = await Promise.all([
    db.supplierPayment.findMany({
      orderBy: { paymentDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, companyName: true } },
        purchase: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    db.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyName: true, currentBalance: true },
    }),
    db.purchase.findMany({
      where: { status: PurchaseStatus.POSTED, dueAmount: { gt: 0 } },
      orderBy: { purchaseDate: "desc" },
      select: { id: true, invoiceNumber: true, supplierId: true, total: true, dueAmount: true },
    }),
  ]);

  return (
    <MadeClient
      initialPayments={payments}
      suppliers={suppliers}
      openPurchases={openPurchases}
    />
  );
}
