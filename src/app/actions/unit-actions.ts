"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { revalidatePath } from "next/cache";

export async function getUnits() {
  const [units, conversions] = await Promise.all([
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

  return { units, conversions };
}

export async function createUnit(data: {
  name: string;
  symbol: string;
  isBaseUnit?: boolean;
}) {
  const user = await requireManagerOrAdmin();

  const existing = await db.unit.findFirst({
    where: {
      OR: [{ name: data.name.trim() }, { symbol: data.symbol.trim().toLowerCase() }],
    },
  });

  if (existing) {
    return { error: "A unit with this name or symbol already exists." };
  }

  const unit = await db.unit.create({
    data: {
      name: data.name.trim(),
      symbol: data.symbol.trim().toLowerCase(),
      isBaseUnit: !!data.isBaseUnit,
    },
  });

  await logAuditEvent({
    action: "UNIT_CREATE",
    entity: "Unit",
    entityId: unit.id,
    newValue: { name: unit.name, symbol: unit.symbol, isBaseUnit: unit.isBaseUnit },
    userId: user.id,
  });

  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard/products");
  return { success: true, unit };
}

export async function updateUnit(
  id: string,
  data: {
    name: string;
    symbol: string;
    isBaseUnit?: boolean;
  }
) {
  const user = await requireManagerOrAdmin();

  const existing = await db.unit.findUnique({ where: { id } });
  if (!existing) return { error: "Unit not found." };

  const conflict = await db.unit.findFirst({
    where: {
      AND: [
        { id: { not: id } },
        { OR: [{ name: data.name.trim() }, { symbol: data.symbol.trim().toLowerCase() }] },
      ],
    },
  });

  if (conflict) {
    return { error: "Another unit already uses this name or symbol." };
  }

  const updated = await db.unit.update({
    where: { id },
    data: {
      name: data.name.trim(),
      symbol: data.symbol.trim().toLowerCase(),
      isBaseUnit: typeof data.isBaseUnit === "boolean" ? data.isBaseUnit : existing.isBaseUnit,
    },
  });

  await logAuditEvent({
    action: "UNIT_UPDATE",
    entity: "Unit",
    entityId: id,
    oldValue: { name: existing.name, symbol: existing.symbol, isBaseUnit: existing.isBaseUnit },
    newValue: { name: updated.name, symbol: updated.symbol, isBaseUnit: updated.isBaseUnit },
    userId: user.id,
  });

  revalidatePath("/dashboard/units");
  revalidatePath("/dashboard/products");
  return { success: true, unit: updated };
}

export async function createUnitConversion(data: {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  productId?: string;
}) {
  const user = await requireManagerOrAdmin();

  if (data.fromUnitId === data.toUnitId) {
    return { error: "From Unit and To Unit cannot be the same." };
  }

  if (data.factor <= 0) {
    return { error: "Conversion factor must be greater than zero." };
  }

  const existing = await db.unitConversion.findFirst({
    where: {
      fromUnitId: data.fromUnitId,
      toUnitId: data.toUnitId,
      productId: data.productId || null,
    },
  });

  if (existing) {
    return { error: "A conversion rule between these units already exists." };
  }

  const conversion = await db.unitConversion.create({
    data: {
      fromUnitId: data.fromUnitId,
      toUnitId: data.toUnitId,
      factor: data.factor,
      productId: data.productId || null,
    },
    include: {
      fromUnit: true,
      toUnit: true,
    },
  });

  await logAuditEvent({
    action: "UNIT_CONVERSION_CREATE",
    entity: "UnitConversion",
    entityId: conversion.id,
    newValue: {
      from: conversion.fromUnit.symbol,
      to: conversion.toUnit.symbol,
      factor: conversion.factor,
    },
    userId: user.id,
  });

  revalidatePath("/dashboard/units");
  return { success: true, conversion };
}

export async function deleteUnitConversion(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const user = await requireManagerOrAdmin();

    await db.unitConversion.delete({ where: { id } });

    await logAuditEvent({
      action: "UNIT_CONVERSION_DELETE",
      entity: "UnitConversion",
      entityId: id,
      userId: user.id,
    });

    revalidatePath("/dashboard/units");
    return { success: true };
  } catch (error: any) {
    return { error: error?.message || "Failed to delete conversion rule" };
  }
}
