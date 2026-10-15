import type { Metadata } from "next";
import { SuppliersClient, type SupplierItem } from "./suppliers-client";
import { getSuppliers } from "@/app/actions/supplier-actions";

export const metadata: Metadata = {
  title: "Suppliers",
};

const FALLBACK_SUPPLIERS: SupplierItem[] = [
  {
    id: "sup_1",
    name: "Chaudhary Group Foods Pvt. Ltd.",
    companyName: "CG Foods Nepal",
    phone: "+977-1-5542300",
    email: "orders@cgcorpnepal.com",
    panVatNumber: "300123456",
    address: "Sanepa, Lalitpur",
    openingBalance: 125000,
    currentBalance: 125000,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { purchases: 8, payments: 4 },
  },
  {
    id: "sup_2",
    name: "Dabur Nepal Pvt. Ltd.",
    companyName: "Dabur Nepal",
    phone: "+977-1-4428042",
    email: "distributors@dabur.com.np",
    panVatNumber: "300456789",
    address: "Tinkune, Kathmandu",
    openingBalance: 84000,
    currentBalance: 84000,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { purchases: 12, payments: 6 },
  },
  {
    id: "sup_3",
    name: "Unilever Nepal Limited",
    companyName: "Unilever Nepal",
    phone: "+977-57-520123",
    email: "customercare@unilever.com.np",
    panVatNumber: "300789123",
    address: "Basamadi, Hetauda",
    openingBalance: 210000,
    currentBalance: 210000,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { purchases: 15, payments: 10 },
  },
  {
    id: "sup_4",
    name: "Himalayan Beverage Distributors",
    companyName: "Himalayan Beverages",
    phone: "+977-1-5260111",
    email: "sales@himalayanbeverage.com",
    panVatNumber: "601234567",
    address: "Satdobato, Lalitpur",
    openingBalance: 45000,
    currentBalance: 45000,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { purchases: 5, payments: 3 },
  },
];

export default async function SuppliersPage() {
  let suppliers = FALLBACK_SUPPLIERS;

  try {
    const dbSuppliers = await getSuppliers();
    if (dbSuppliers && dbSuppliers.length > 0) {
      suppliers = dbSuppliers;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <SuppliersClient initialSuppliers={suppliers} />;
}
