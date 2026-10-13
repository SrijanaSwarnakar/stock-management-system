import type { Metadata } from "next";
import { LedgerClient, type StockMovementItem } from "./ledger-client";
import { getStockLedger } from "@/app/actions/inventory-actions";
import { db } from "@/lib/db";
import { MovementType } from "@prisma/client";

export const metadata: Metadata = {
  title: "Stock Ledger",
};

const FALLBACK_PRODUCTS = [
  { id: "p_1", name: "Wai Wai Instant Noodles 75g (Chicken)", sku: "WAI-WAI-75G" },
  { id: "p_2", name: "Real Mixed Fruit Juice 1L", sku: "REAL-MIX-1L" },
  { id: "p_3", name: "Sunsilk Black Shine Shampoo 350ml", sku: "SUNSILK-BLK-350" },
  { id: "p_4", name: "Surf Excel Easy Wash 1kg", sku: "SURF-EASY-1KG" },
  { id: "p_5", name: "Fortune Sunlite Refined Sunflower Oil 1L", sku: "FORTUNE-SUN-1L" },
  { id: "p_6", name: "Tokla CTC Pure Leaf Tea 500g", sku: "TOKLA-TEA-500G" },
];

const FALLBACK_MOVEMENTS: StockMovementItem[] = [
  {
    id: "m_1",
    movementType: MovementType.OPENING,
    qty: 600,
    unitCost: 20.5,
    runningBalance: 600,
    runningAvgCost: 20.5,
    referenceType: "OPENING",
    referenceDoc: "OPENING-STOCK-2081",
    notes: "Initial inventory migration balance",
    createdAt: new Date("2026-10-10T08:00:00Z"),
    product: {
      id: "p_1",
      name: "Wai Wai Instant Noodles 75g (Chicken)",
      sku: "WAI-WAI-75G",
      baseUnit: { symbol: "pcs" },
    },
  },
  {
    id: "m_2",
    movementType: MovementType.PURCHASE,
    qty: 240,
    unitCost: 245.0,
    runningBalance: 240,
    runningAvgCost: 245.0,
    referenceType: "PURCHASE",
    referenceDoc: "PINV-2081-000001",
    notes: "Receipt from Dabur Nepal",
    createdAt: new Date("2026-10-11T10:30:00Z"),
    product: {
      id: "p_2",
      name: "Real Mixed Fruit Juice 1L",
      sku: "REAL-MIX-1L",
      baseUnit: { symbol: "pcs" },
    },
  },
  {
    id: "m_3",
    movementType: MovementType.SALE,
    qty: -48,
    unitCost: 245.0,
    runningBalance: 192,
    runningAvgCost: 245.0,
    referenceType: "SALE",
    referenceDoc: "SINV-2081-000001",
    notes: "Dispatch to Ram General Store",
    createdAt: new Date("2026-10-12T14:15:00Z"),
    product: {
      id: "p_2",
      name: "Real Mixed Fruit Juice 1L",
      sku: "REAL-MIX-1L",
      baseUnit: { symbol: "pcs" },
    },
  },
  {
    id: "m_4",
    movementType: MovementType.ADJUSTMENT_OUT,
    qty: -8,
    unitCost: 380.0,
    runningBalance: 22,
    runningAvgCost: 380.0,
    referenceType: "ADJUSTMENT",
    referenceDoc: "SADJ-2081-000001",
    notes: "Damaged bottles discarded during shelf stocking",
    createdAt: new Date("2026-10-13T09:00:00Z"),
    product: {
      id: "p_3",
      name: "Sunsilk Black Shine Shampoo 350ml",
      sku: "SUNSILK-BLK-350",
      baseUnit: { symbol: "pcs" },
    },
  },
];

export default async function StockLedgerPage() {
  let movements = FALLBACK_MOVEMENTS;
  let products = FALLBACK_PRODUCTS;

  try {
    const [ledgerData, dbProducts] = await Promise.all([
      getStockLedger({ pageSize: 50 }),
      db.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (ledgerData?.movements && ledgerData.movements.length > 0) {
      movements = ledgerData.movements;
    }
    if (dbProducts && dbProducts.length > 0) {
      products = dbProducts;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <LedgerClient initialMovements={movements} products={products} />;
}
