import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { SaleStatus, ReturnStatus } from "@prisma/client";
import SaleReturnsClient from "./returns-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Returns | Stock Management System",
  description: "Manage customer sales returns, restocking, and credit adjustments.",
};

export default async function SalesReturnsPage() {
  await requireAuth();

  const [returns, eligibleSales] = await Promise.all([
    db.saleReturn.findMany({
      orderBy: { returnDate: "desc" },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            customer: { select: { id: true, name: true, shopName: true } },
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
    db.sale.findMany({
      where: {
        status: { in: [SaleStatus.POSTED, SaleStatus.PARTIAL, SaleStatus.PAID] },
      },
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
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
        returns: {
          where: { status: ReturnStatus.COMPLETED },
          include: { lines: { select: { productId: true, qty: true } } },
        },
      },
      take: 100,
    }),
  ]);

  return (
    <SaleReturnsClient
      initialReturns={returns}
      eligibleSales={eligibleSales}
    />
  );
}
