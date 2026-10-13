import type { Metadata } from "next";
import { InventoryClient, type InventoryItem } from "./inventory-client";
import { getInventoryOverview } from "@/app/actions/inventory-actions";

export const metadata: Metadata = {
  title: "Inventory",
};

const FALLBACK_PRODUCTS: InventoryItem[] = [
  {
    id: "p_1",
    name: "Wai Wai Instant Noodles 75g (Chicken)",
    sku: "WAI-WAI-75G",
    costPrice: 20.5,
    sellingPrice: 25.0,
    currentStock: 600,
    reorderThreshold: 150,
    category: { id: "cat_3", name: "Snacks & Confectionery" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
  {
    id: "p_2",
    name: "Real Mixed Fruit Juice 1L",
    sku: "REAL-MIX-1L",
    costPrice: 245.0,
    sellingPrice: 290.0,
    currentStock: 240,
    reorderThreshold: 50,
    category: { id: "cat_2", name: "Beverages" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
  {
    id: "p_3",
    name: "Sunsilk Black Shine Shampoo 350ml",
    sku: "SUNSILK-BLK-350",
    costPrice: 380.0,
    sellingPrice: 445.0,
    currentStock: 22,
    reorderThreshold: 30,
    category: { id: "cat_4", name: "Personal Care" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
  {
    id: "p_4",
    name: "Surf Excel Easy Wash 1kg",
    sku: "SURF-EASY-1KG",
    costPrice: 215.0,
    sellingPrice: 250.0,
    currentStock: 5,
    reorderThreshold: 40,
    category: { id: "cat_5", name: "Household & Cleaning" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
  {
    id: "p_5",
    name: "Fortune Sunlite Refined Sunflower Oil 1L",
    sku: "FORTUNE-SUN-1L",
    costPrice: 260.0,
    sellingPrice: 295.0,
    currentStock: 300,
    reorderThreshold: 60,
    category: { id: "cat_1", name: "Food & Groceries" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
  {
    id: "p_6",
    name: "Tokla CTC Pure Leaf Tea 500g",
    sku: "TOKLA-TEA-500G",
    costPrice: 220.0,
    sellingPrice: 260.0,
    currentStock: 0,
    reorderThreshold: 35,
    category: { id: "cat_2", name: "Beverages" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
  },
];

const FALLBACK_METRICS = {
  totalCostValuation: 161860,
  totalRetailValuation: 188790,
  potentialProfit: 26930,
  totalItemsCount: 1167,
  lowStockCount: 2,
  outOfStockCount: 1,
};

export default async function InventoryPage() {
  let products = FALLBACK_PRODUCTS;
  let metrics = FALLBACK_METRICS;

  try {
    const data = await getInventoryOverview();
    if (data?.products && data.products.length > 0) {
      products = data.products;
      metrics = data.metrics;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <InventoryClient initialProducts={products} metrics={metrics} />;
}
