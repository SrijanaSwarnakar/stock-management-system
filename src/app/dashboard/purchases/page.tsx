import type { Metadata } from "next";
import { PurchasesClient, type PurchaseItem } from "./purchases-client";
import { getPurchases } from "@/app/actions/purchase-actions";
import { db } from "@/lib/db";
import { PurchaseStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Purchases",
};

const FALLBACK_SUPPLIERS: Array<{ id: string; name: string; companyName: string | null }> = [
  { id: "sup_1", name: "Chaudhary Group Foods Pvt. Ltd.", companyName: "CG Foods Nepal" },
  { id: "sup_2", name: "Dabur Nepal Pvt. Ltd.", companyName: "Dabur Nepal" },
  { id: "sup_3", name: "Unilever Nepal Limited", companyName: "Unilever Nepal" },
  { id: "sup_4", name: "Himalayan Beverage Distributors", companyName: "Himalayan Beverages" },
];

const FALLBACK_PRODUCTS = [
  { id: "p_1", name: "Wai Wai Instant Noodles 75g (Chicken)", sku: "WAI-WAI-75G", costPrice: 20.5, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
  { id: "p_2", name: "Real Mixed Fruit Juice 1L", sku: "REAL-MIX-1L", costPrice: 245.0, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
  { id: "p_3", name: "Sunsilk Black Shine Shampoo 350ml", sku: "SUNSILK-BLK-350", costPrice: 380.0, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
  { id: "p_4", name: "Surf Excel Easy Wash 1kg", sku: "SURF-EASY-1KG", costPrice: 215.0, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
  { id: "p_5", name: "Fortune Sunlite Refined Sunflower Oil 1L", sku: "FORTUNE-SUN-1L", costPrice: 260.0, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
  { id: "p_6", name: "Tokla CTC Pure Leaf Tea 500g", sku: "TOKLA-TEA-500G", costPrice: 220.0, baseUnitId: "u_pcs", baseUnit: { id: "u_pcs", symbol: "pcs" } },
];

const FALLBACK_UNITS = [
  { id: "u_pcs", name: "Piece", symbol: "pcs" },
  { id: "u_ctn", name: "Carton", symbol: "ctn" },
  { id: "u_box", name: "Box", symbol: "box" },
  { id: "u_kg", name: "Kilogram", symbol: "kg" },
  { id: "u_ltr", name: "Liter", symbol: "ltr" },
  { id: "u_pkt", name: "Packet", symbol: "pkt" },
];

const FALLBACK_PURCHASES: PurchaseItem[] = [
  {
    id: "pur_1",
    invoiceNumber: "PINV-2081-000001",
    supplierId: "sup_2",
    purchaseDate: new Date("2026-10-11T10:30:00Z"),
    status: PurchaseStatus.POSTED,
    subtotal: 58800,
    discount: 800,
    tax: 0,
    total: 58000,
    paidAmount: 0,
    dueAmount: 58000,
    notes: "Regular monthly shipment received at Kalimati warehouse",
    supplier: {
      id: "sup_2",
      name: "Dabur Nepal Pvt. Ltd.",
      companyName: "Dabur Nepal",
      phone: "+977-1-4428042",
    },
    lines: [
      {
        id: "pl_1",
        productId: "p_2",
        unitId: "u_pcs",
        qty: 240,
        unitCost: 245.0,
        totalCost: 58800,
        convertedQtyBase: 240,
        product: { id: "p_2", name: "Real Mixed Fruit Juice 1L", sku: "REAL-MIX-1L" },
        unit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
      },
    ],
    createdBy: { id: "usr_4", name: "Rajesh Maharjan" },
  },
  {
    id: "pur_2",
    invoiceNumber: "PINV-2081-000002",
    supplierId: "sup_1",
    purchaseDate: new Date("2026-10-12T11:00:00Z"),
    status: PurchaseStatus.DRAFT,
    subtotal: 41000,
    discount: 500,
    tax: 0,
    total: 40500,
    paidAmount: 0,
    dueAmount: 40500,
    notes: "Pending transport clearance from Sanepa factory",
    supplier: {
      id: "sup_1",
      name: "Chaudhary Group Foods Pvt. Ltd.",
      companyName: "CG Foods Nepal",
      phone: "+977-1-5542300",
    },
    lines: [
      {
        id: "pl_2",
        productId: "p_1",
        unitId: "u_pcs",
        qty: 2000,
        unitCost: 20.5,
        totalCost: 41000,
        convertedQtyBase: 2000,
        product: { id: "p_1", name: "Wai Wai Instant Noodles 75g (Chicken)", sku: "WAI-WAI-75G" },
        unit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
      },
    ],
    createdBy: { id: "usr_2", name: "Suman Shrestha" },
  },
];

export default async function PurchasesPage() {
  let purchases = FALLBACK_PURCHASES;
  let suppliers = FALLBACK_SUPPLIERS;
  let products = FALLBACK_PRODUCTS;
  let units = FALLBACK_UNITS;

  try {
    const [dbPurchases, dbSuppliers, dbProducts, dbUnits] = await Promise.all([
      getPurchases(),
      db.supplier.findMany({
        where: { isActive: true },
        select: { id: true, name: true, companyName: true },
        orderBy: { name: "asc" },
      }),
      db.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
          baseUnitId: true,
          baseUnit: { select: { id: true, symbol: true } },
        },
        orderBy: { name: "asc" },
      }),
      db.unit.findMany({
        select: { id: true, name: true, symbol: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (dbPurchases && dbPurchases.length > 0) purchases = dbPurchases;
    if (dbSuppliers && dbSuppliers.length > 0) suppliers = dbSuppliers;
    if (dbProducts && dbProducts.length > 0) products = dbProducts;
    if (dbUnits && dbUnits.length > 0) units = dbUnits;
  } catch {
    // Database connection fallback during prerender
  }

  return (
    <PurchasesClient
      initialPurchases={purchases}
      suppliers={suppliers}
      products={products}
      units={units}
    />
  );
}
