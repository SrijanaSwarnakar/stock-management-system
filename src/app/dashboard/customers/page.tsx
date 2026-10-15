import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import CustomersClient from "./customers-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers | Stock Management System",
  description: "Manage customer accounts, credit limits, and outstanding balances.",
};

export default async function CustomersPage() {
  await requireAuth();

  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { sales: true, payments: true } },
    },
  });

  const serialized = customers.map((c) => ({
    ...c,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return <CustomersClient initialCustomers={serialized} />;
}
