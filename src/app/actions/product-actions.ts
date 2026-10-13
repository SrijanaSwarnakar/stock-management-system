"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { MovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ProductFilterParams = {
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
};

export async function getProducts(params: ProductFilterParams = {}) {
  const where: any = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { sku: { contains: params.search, mode: "insensitive" } },
      { barcode: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.categoryId && params.categoryId !== "ALL") {
    where.categoryId = params.categoryId;
  }

  if (params.activeOnly) {
    where.isActive = true;
  }

  const products = await db.product.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      baseUnit: { select: { id: true, name: true, symbol: true } },
      priceHistories: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (params.lowStockOnly) {
    return products.filter((p) => p.currentStock <= p.reorderThreshold);
  }

  return products;
}

export async function createProduct(data: {
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  baseUnitId: string;
  description?: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  minSellingPrice?: number;
  reorderThreshold: number;
  openingStock?: number;
}) {
  const user = await requireManagerOrAdmin();

  // Validate SKU unique
  const existingSku = await db.product.findUnique({
    where: { sku: data.sku.trim().toUpperCase() },
  });

  if (existingSku) {
    return { error: `A product with SKU "${data.sku}" already exists.` };
  }

  if (data.barcode?.trim()) {
    const existingBarcode = await db.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (existingBarcode) {
      return { error: `A product with Barcode "${data.barcode}" already exists.` };
    }
  }

  const openingStock = data.openingStock || 0;

  const product = await db.product.create({
    data: {
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode?.trim() || null,
      categoryId: data.categoryId,
      baseUnitId: data.baseUnitId,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      minSellingPrice: data.minSellingPrice || data.costPrice,
      reorderThreshold: data.reorderThreshold || 10,
      currentStock: openingStock,
      isActive: true,
    },
    include: {
      category: true,
      baseUnit: true,
    },
  });

  // Record initial opening stock ledger movement if stock > 0
  if (openingStock > 0) {
    await db.stockMovement.create({
      data: {
        productId: product.id,
        movementType: MovementType.OPENING,
        qty: openingStock,
        unitCost: data.costPrice,
        runningBalance: openingStock,
        runningAvgCost: data.costPrice,
        referenceType: "OPENING",
        referenceDoc: "INITIAL-STOCK-SETUP",
        notes: "Opening inventory entry upon product creation",
        createdById: user.id,
      },
    });
  }

  // Record initial price history
  await db.productPriceHistory.create({
    data: {
      productId: product.id,
      oldCostPrice: data.costPrice,
      newCostPrice: data.costPrice,
      oldSellingPrice: data.sellingPrice,
      newSellingPrice: data.sellingPrice,
      changedById: user.id,
      reason: "Initial pricing set",
    },
  });

  await logAuditEvent({
    action: "PRODUCT_CREATE",
    entity: "Product",
    entityId: product.id,
    newValue: { name: product.name, sku: product.sku, costPrice: product.costPrice, sellingPrice: product.sellingPrice },
    userId: user.id,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  return { success: true, product };
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    sku: string;
    barcode?: string;
    categoryId: string;
    baseUnitId: string;
    description?: string;
    imageUrl?: string;
    costPrice: number;
    sellingPrice: number;
    minSellingPrice?: number;
    reorderThreshold: number;
    isActive?: boolean;
  }
) {
  const user = await requireManagerOrAdmin();

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product not found." };

  // Check SKU uniqueness
  if (data.sku.trim().toUpperCase() !== existing.sku) {
    const existingSku = await db.product.findUnique({
      where: { sku: data.sku.trim().toUpperCase() },
    });
    if (existingSku) return { error: `SKU "${data.sku}" is already in use by another product.` };
  }

  // Check price change to record in history
  const priceChanged =
    existing.costPrice !== data.costPrice || existing.sellingPrice !== data.sellingPrice;

  if (priceChanged) {
    await db.productPriceHistory.create({
      data: {
        productId: id,
        oldCostPrice: existing.costPrice,
        newCostPrice: data.costPrice,
        oldSellingPrice: existing.sellingPrice,
        newSellingPrice: data.sellingPrice,
        changedById: user.id,
        reason: "Manual price adjustment",
      },
    });
  }

  const updated = await db.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode?.trim() || null,
      categoryId: data.categoryId,
      baseUnitId: data.baseUnitId,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      minSellingPrice: data.minSellingPrice || data.costPrice,
      reorderThreshold: data.reorderThreshold,
      isActive: typeof data.isActive === "boolean" ? data.isActive : existing.isActive,
    },
    include: {
      category: true,
      baseUnit: true,
    },
  });

  await logAuditEvent({
    action: "PRODUCT_UPDATE",
    entity: "Product",
    entityId: id,
    oldValue: { name: existing.name, costPrice: existing.costPrice, sellingPrice: existing.sellingPrice },
    newValue: { name: updated.name, costPrice: updated.costPrice, sellingPrice: updated.sellingPrice },
    userId: user.id,
  });

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  return { success: true, product: updated };
}

export async function toggleProductStatus(id: string) {
  const user = await requireManagerOrAdmin();

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product not found." };

  const updated = await db.product.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await logAuditEvent({
    action: updated.isActive ? "PRODUCT_ACTIVATE" : "PRODUCT_DEACTIVATE",
    entity: "Product",
    entityId: id,
    newValue: { isActive: updated.isActive },
    userId: user.id,
  });

  revalidatePath("/dashboard/products");
  return { success: true, isActive: updated.isActive };
}
