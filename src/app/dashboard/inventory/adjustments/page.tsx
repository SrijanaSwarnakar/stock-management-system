import type { Metadata } from "next";
import { AdjustmentsClient, type StockAdjustmentItem, type ProductOption } from "./adjustments-client";
import { getStockAdjustments } from "@/app/actions/inventory-actions";
import { db } from "@/lib/db";
import { AdjustmentType } from "@prisma/client";

export const metadata: Metadata = {
  title: "Stock Adjustments",
};

const FALLBACK_PRODUCTS: ProductOption[] = [
  { id: "p_1", name: "Wai Wai Instant Noodles 75g (Chicken)", sku: "WAI-WAI-75G", currentStock: 600, costPrice: 20.5, baseUnit: { symbol: "pcs" } },
  { id: "p_2", name: "Real Mixed Fruit Juice 1L", sku: "REAL-MIX-1L", currentStock: 240, costPrice: 245.0, baseUnit: { symbol: "pcs" } },
  { id: "p_3", name: "Sunsilk Black Shine Shampoo 350ml", sku: "SUNSILK-BLK-350", currentStock: 22, costPrice: 380.0, baseUnit: { symbol: "pcs" } },
  { id: "p_4", name: "Surf Excel Easy Wash 1kg", sku: "SURF-EASY-1KG", currentStock: 5, costPrice: 215.0, baseUnit: { symbol: "pcs" } },
  { id: "p_5", name: "Fortune Sunlite Refined Sunflower Oil 1L", sku: "FORTUNE-SUN-1L", currentStock: 300, costPrice: 260.0, baseUnit: { symbol: "pcs" } },
  { id: "p_6", name: "Tokla CTC Pure Leaf Tea 500g", sku: "TOKLA-TEA-500G", currentStock: 0, costPrice: 220.0, baseUnit: { symbol: "pcs" } },
];

const FALLBACK_ADJUSTMENTS: StockAdjustmentItem[] = [
  {
    id: "adj_1",
    adjustmentNumber: "SADJ-2081-000001",
    adjustmentType: AdjustmentType.DAMAGE,
    qty: -8,
    unitCost: 380.0,
    reason: "Damaged bottles discarded during shelf stocking",
    createdAt: new Date("2026-10-13T09:00:00Z"),
    product: {
      id: "p_3",
      name: "Sunsilk Black Shine Shampoo 350ml",
      sku: "SUNSILK-BLK-350",
      baseUnit: { symbol: "pcs" },
    },
    createdBy: { id: "usr_4", name: "Rajesh Maharjan" },
    approvedBy: { id: "usr_2", name: "Suman Shrestha" },
  },
  {
    id: "adj_2",
    adjustmentNumber: "SADJ-2081-000002",
    adjustmentType: AdjustmentType.INCREASE,
    qty: 15,
    unitCost: 20.5,
    reason: "Surplus discovered during periodic warehouse counting",
    createdAt: new Date("2026-10-12T15:30:00Z"),
    product: {
      id: "p_1",
      name: "Wai Wai Instant Noodles 75g (Chicken)",
      sku: "WAI-WAI-75G",
      baseUnit: { symbol: "pcs" },
    },
    createdBy: { id: "usr_4", name: "Rajesh Maharjan" },
    approvedBy: { id: "usr_1", name: "Bikram Sharma" },
  },
];

export default async function AdjustmentsPage() {
  let adjustments = FALLBACK_ADJUSTMENTS;
  let products = FALLBACK_PRODUCTS;

  try {
    const [dbAdjustments, dbProducts] = await Promise.all([
      getStockAdjustments(),
      db.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          costPrice: true,
          baseUnit: { select: { symbol: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    if (dbAdjustments && dbAdjustments.length > 0) adjustments = dbAdjustments;
    if (dbProducts && dbProducts.length > 0) products = dbProducts;
  } catch {
    // Database connection fallback during prerender
  }

  return <AdjustmentsClient initialAdjustments={adjustments} products={products} />;
}
