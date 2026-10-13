import type { Metadata } from "next";
import { ProductsClient, type ProductItem } from "./products-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Products",
};

const FALLBACK_CATEGORIES = [
  { id: "cat_1", name: "Food & Groceries" },
  { id: "cat_2", name: "Beverages" },
  { id: "cat_3", name: "Snacks & Confectionery" },
  { id: "cat_4", name: "Personal Care" },
  { id: "cat_5", name: "Household & Cleaning" },
  { id: "cat_6", name: "Dairy Products" },
];

const FALLBACK_UNITS = [
  { id: "u_pcs", name: "Piece", symbol: "pcs" },
  { id: "u_ctn", name: "Carton", symbol: "ctn" },
  { id: "u_box", name: "Box", symbol: "box" },
  { id: "u_kg", name: "Kilogram", symbol: "kg" },
  { id: "u_ltr", name: "Liter", symbol: "ltr" },
  { id: "u_pkt", name: "Packet", symbol: "pkt" },
];

const FALLBACK_PRODUCTS: ProductItem[] = [
  {
    id: "p_1",
    name: "Wai Wai Instant Noodles 75g (Chicken)",
    sku: "WAI-WAI-75G",
    barcode: "8901234001011",
    categoryId: "cat_3",
    baseUnitId: "u_pcs",
    description: "Nepal's favorite pre-cooked brown noodles pack",
    imageUrl: null,
    costPrice: 20.5,
    sellingPrice: 25.0,
    minSellingPrice: 23.0,
    reorderThreshold: 150,
    currentStock: 600,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_3", name: "Snacks & Confectionery", slug: "snacks-confectionery" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
  {
    id: "p_2",
    name: "Real Mixed Fruit Juice 1L",
    sku: "REAL-MIX-1L",
    barcode: "8901234002022",
    categoryId: "cat_2",
    baseUnitId: "u_pcs",
    description: "100% natural mixed fruit blend tetra pack",
    imageUrl: null,
    costPrice: 245.0,
    sellingPrice: 290.0,
    minSellingPrice: 275.0,
    reorderThreshold: 50,
    currentStock: 240,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_2", name: "Beverages", slug: "beverages" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
  {
    id: "p_3",
    name: "Sunsilk Black Shine Shampoo 350ml",
    sku: "SUNSILK-BLK-350",
    barcode: "8901234003033",
    categoryId: "cat_4",
    baseUnitId: "u_pcs",
    description: "Amla pearl complex hair nourishing shampoo bottle",
    imageUrl: null,
    costPrice: 380.0,
    sellingPrice: 445.0,
    minSellingPrice: 420.0,
    reorderThreshold: 30,
    currentStock: 22, // Low stock demo
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_4", name: "Personal Care", slug: "personal-care" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
  {
    id: "p_4",
    name: "Surf Excel Easy Wash 1kg",
    sku: "SURF-EASY-1KG",
    barcode: "8901234004044",
    categoryId: "cat_5",
    baseUnitId: "u_pcs",
    description: "Superior stain removal washing powder pack",
    imageUrl: null,
    costPrice: 215.0,
    sellingPrice: 250.0,
    minSellingPrice: 240.0,
    reorderThreshold: 40,
    currentStock: 5, // Low stock demo
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_5", name: "Household & Cleaning", slug: "household-cleaning" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
  {
    id: "p_5",
    name: "Fortune Sunlite Refined Sunflower Oil 1L",
    sku: "FORTUNE-SUN-1L",
    barcode: "8901234006066",
    categoryId: "cat_1",
    baseUnitId: "u_pcs",
    description: "Enriched with Vitamin A and D edible cooking oil pouch",
    imageUrl: null,
    costPrice: 260.0,
    sellingPrice: 295.0,
    minSellingPrice: 285.0,
    reorderThreshold: 60,
    currentStock: 300,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_1", name: "Food & Groceries", slug: "food-groceries" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
  {
    id: "p_6",
    name: "Tokla CTC Pure Leaf Tea 500g",
    sku: "TOKLA-TEA-500G",
    barcode: "8901234010100",
    categoryId: "cat_2",
    baseUnitId: "u_pcs",
    description: "Jhapa Nepal estate blended strong CTC garden tea",
    imageUrl: null,
    costPrice: 220.0,
    sellingPrice: 260.0,
    minSellingPrice: 250.0,
    reorderThreshold: 35,
    currentStock: 0, // Out of stock demo
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    category: { id: "cat_2", name: "Beverages", slug: "beverages" },
    baseUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    priceHistories: [],
  },
];

export default async function ProductsPage() {
  let products = FALLBACK_PRODUCTS;
  let categories = FALLBACK_CATEGORIES;
  let units = FALLBACK_UNITS;

  try {
    const [dbProducts, dbCategories, dbUnits] = await Promise.all([
      db.product.findMany({
        orderBy: { name: "asc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          baseUnit: { select: { id: true, name: true, symbol: true } },
          priceHistories: {
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.unit.findMany({
        select: { id: true, name: true, symbol: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (dbProducts && dbProducts.length > 0) products = dbProducts;
    if (dbCategories && dbCategories.length > 0) categories = dbCategories;
    if (dbUnits && dbUnits.length > 0) units = dbUnits;
  } catch {
    // Database connection fallback during prerender
  }

  return (
    <ProductsClient
      initialProducts={products}
      categories={categories}
      units={units}
    />
  );
}
