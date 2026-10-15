import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { PurchaseStatus, ReturnStatus } from "@prisma/client";
import PurchaseReturnsClient from "./returns-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Purchase Returns | Stock Management System",
  description: "Manage supplier purchase returns, stock deductions, and debit notes.",
};

export default async function PurchaseReturnsPage() {
  await requireManagerOrAdmin();

  const [returns, eligiblePurchases] = await Promise.all([
    db.purchaseReturn.findMany({
      orderBy: { returnDate: "desc" },
      include: {
        purchase: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            supplier: { select: { id: true, name: true, companyName: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        lines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                baseUnit: { select: { symbol: true } },
              },
            },
          },
        },
      },
    }),
    db.purchase.findMany({
      where: {
        status: PurchaseStatus.POSTED,
      },
      orderBy: { purchaseDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, companyName: true } },
        lines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                currentStock: true,
                baseUnit: { select: { symbol: true } },
              },
            },
          },
        },
        returns: {
          where: { status: ReturnStatus.COMPLETED },
          include: { lines: { select: { productId: true, qty: true } } },
        },
      },
      take: 100,
    }),
  ]);

  return (
    <PurchaseReturnsClient
      initialReturns={returns}
      eligiblePurchases={eligiblePurchases}
    />
  );
}
