import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { SaleStatus } from "@prisma/client";
import ReceivedClient from "./received-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments Received | Stock Management System",
  description: "Record and track customer payments against sales invoices.",
};

export default async function PaymentsReceivedPage() {
  await requireAuth();

  const [payments, customers, openSales] = await Promise.all([
    db.customerPayment.findMany({
      orderBy: { paymentDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        sale: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    db.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shopName: true, currentBalance: true },
    }),
    db.sale.findMany({
      where: { status: { in: [SaleStatus.POSTED, SaleStatus.PARTIAL] } },
      orderBy: { saleDate: "desc" },
      select: { id: true, invoiceNumber: true, customerId: true, total: true, dueAmount: true },
    }),
  ]);

  return (
    <ReceivedClient
      initialPayments={payments}
      customers={customers}
      openSales={openSales}
    />
  );
}
