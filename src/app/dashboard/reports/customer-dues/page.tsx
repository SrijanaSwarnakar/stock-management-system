import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import CustomerDuesClient from "./customer-dues-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer Dues Report | Stock Management System",
  description: "Track accounts receivable, outstanding customer balances, and credit limits.",
};

export default async function CustomerDuesReportPage() {
  await requireAuth();

  const customers = await db.customer.findMany({
    where: { isActive: true },
    orderBy: { currentBalance: "desc" },
    select: {
      id: true,
      name: true,
      shopName: true,
      phone: true,
      address: true,
      creditLimit: true,
      currentBalance: true,
    },
  });

  return <CustomerDuesClient initialCustomers={customers} />;
}
