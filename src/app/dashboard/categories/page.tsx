import type { Metadata } from "next";
import { CategoriesClient, type CategoryItem } from "./categories-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Categories",
};

const FALLBACK_CATEGORIES: CategoryItem[] = [
  {
    id: "cat_1",
    name: "Food & Groceries",
    slug: "food-groceries",
    description: "Rice, pulses, edible oils, spices and kitchen staples",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 18 },
  },
  {
    id: "cat_2",
    name: "Beverages",
    slug: "beverages",
    description: "Juices, energy drinks, mineral water, tea and coffee",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 12 },
  },
  {
    id: "cat_3",
    name: "Snacks & Confectionery",
    slug: "snacks-confectionery",
    description: "Instant noodles, biscuits, chips and chocolates",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 15 },
  },
  {
    id: "cat_4",
    name: "Personal Care",
    slug: "personal-care",
    description: "Soaps, shampoos, body lotions and toothpaste",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 22 },
  },
  {
    id: "cat_5",
    name: "Household & Cleaning",
    slug: "household-cleaning",
    description: "Detergents, fabric conditioners and surface cleaners",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 14 },
  },
  {
    id: "cat_6",
    name: "Dairy Products",
    slug: "dairy-products",
    description: "Butter, cheese, milk powder and ghee",
    imageUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { products: 9 },
  },
];

export default async function CategoriesPage() {
  let categories = FALLBACK_CATEGORIES;
  try {
    const dbCategories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    if (dbCategories && dbCategories.length > 0) {
      categories = dbCategories;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <CategoriesClient initialCategories={categories} />;
}
