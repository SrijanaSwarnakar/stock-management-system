import type { Metadata } from "next";
import { UnitsClient, type UnitItem, type UnitConversionItem } from "./units-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Units & Conversions",
};

const FALLBACK_UNITS: UnitItem[] = [
  { id: "u_pcs", name: "Piece", symbol: "pcs", isBaseUnit: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 42 } },
  { id: "u_ctn", name: "Carton", symbol: "ctn", isBaseUnit: false, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 0 } },
  { id: "u_box", name: "Box", symbol: "box", isBaseUnit: false, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 0 } },
  { id: "u_kg", name: "Kilogram", symbol: "kg", isBaseUnit: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 12 } },
  { id: "u_ltr", name: "Liter", symbol: "ltr", isBaseUnit: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 8 } },
  { id: "u_pkt", name: "Packet", symbol: "pkt", isBaseUnit: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 25 } },
  { id: "u_dz", name: "Dozen", symbol: "dz", isBaseUnit: false, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), _count: { productsAsBase: 0 } },
];

const FALLBACK_CONVERSIONS: UnitConversionItem[] = [
  {
    id: "uc_1",
    fromUnitId: "u_ctn",
    toUnitId: "u_pcs",
    factor: 24,
    productId: null,
    createdAt: new Date("2026-01-01"),
    fromUnit: { id: "u_ctn", name: "Carton", symbol: "ctn" },
    toUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    product: null,
  },
  {
    id: "uc_2",
    fromUnitId: "u_box",
    toUnitId: "u_pcs",
    factor: 12,
    productId: null,
    createdAt: new Date("2026-01-01"),
    fromUnit: { id: "u_box", name: "Box", symbol: "box" },
    toUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    product: null,
  },
  {
    id: "uc_3",
    fromUnitId: "u_dz",
    toUnitId: "u_pcs",
    factor: 12,
    productId: null,
    createdAt: new Date("2026-01-01"),
    fromUnit: { id: "u_dz", name: "Dozen", symbol: "dz" },
    toUnit: { id: "u_pcs", name: "Piece", symbol: "pcs" },
    product: null,
  },
];

export default async function UnitsPage() {
  let units = FALLBACK_UNITS;
  let conversions = FALLBACK_CONVERSIONS;

  try {
    const [dbUnits, dbConversions] = await Promise.all([
      db.unit.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { productsAsBase: true },
          },
        },
      }),
      db.unitConversion.findMany({
        include: {
          fromUnit: true,
          toUnit: true,
          product: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (dbUnits && dbUnits.length > 0) units = dbUnits;
    if (dbConversions && dbConversions.length > 0) conversions = dbConversions;
  } catch {
    // Database connection fallback during prerender
  }

  return <UnitsClient initialUnits={units} initialConversions={conversions} />;
}
