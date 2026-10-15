import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import SalesClient from "./sales-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales | Stock Management System",
  description: "Create and manage sales invoices with real-time stock validation.",
};

export default async function SalesPage() {
  await requireAuth();

  const [sales, customers, products, units] = await Promise.all([
    db.sale.findMany({
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, shopName: true, phone: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            unit: { select: { id: true, name: true, symbol: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        payments: { select: { id: true, amount: true } },
      },
    }),
    db.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shopName: true, creditLimit: true, currentBalance: true },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, sku: true, sellingPrice: true, costPrice: true,
        currentStock: true, baseUnitId: true,
        baseUnit: { select: { id: true, symbol: true } },
      },
    }),
    db.unit.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, symbol: true },
    }),
  ]);

  const serializedSales = sales.map((s) => ({
    ...s,
    saleDate: s.saleDate,
    lines: s.lines.map((l) => ({ ...l })),
  }));

  return (
    <SalesClient
      initialSales={serializedSales}
      customers={customers}
      products={products}
      units={units}
    />
  );
}
