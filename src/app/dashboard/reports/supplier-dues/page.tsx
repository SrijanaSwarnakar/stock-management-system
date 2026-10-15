import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import SupplierDuesClient from "./supplier-dues-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supplier Dues Report | Stock Management System",
  description: "Track accounts payable, vendor dues, and procurement balances.",
};

export default async function SupplierDuesReportPage() {
  await requireAuth();

  const suppliers = await db.supplier.findMany({
    where: { isActive: true },
    orderBy: { currentBalance: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      phone: true,
      address: true,
      panVatNumber: true,
      currentBalance: true,
    },
  });

  return <SupplierDuesClient initialSuppliers={suppliers} />;
}
