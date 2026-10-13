"use server";

import { db } from "@/lib/db";
import { requireManagerOrAdmin, requireAdmin } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  return await db.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
}) {
  const user = await requireManagerOrAdmin();

  const slug = (data.slug?.trim() || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/(^-|-$)/g, "");

  const existing = await db.category.findFirst({
    where: {
      OR: [{ name: data.name.trim() }, { slug }],
    },
  });

  if (existing) {
    return { error: "A category with this name or slug already exists." };
  }

  const category = await db.category.create({
    data: {
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      isActive: true,
    },
  });

  await logAuditEvent({
    action: "CATEGORY_CREATE",
    entity: "Category",
    entityId: category.id,
    newValue: { name: category.name, slug: category.slug },
    userId: user.id,
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  return { success: true, category };
}

export async function updateCategory(
  id: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
  }
) {
  const user = await requireManagerOrAdmin();

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return { error: "Category not found." };

  const slug = (data.slug?.trim() || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/(^-|-$)/g, "");

  // Check unique constraints if changing name/slug
  const conflict = await db.category.findFirst({
    where: {
      AND: [
        { id: { not: id } },
        { OR: [{ name: data.name.trim() }, { slug }] },
      ],
    },
  });

  if (conflict) {
    return { error: "Another category already exists with this name or slug." };
  }

  const updated = await db.category.update({
    where: { id },
    data: {
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      isActive: typeof data.isActive === "boolean" ? data.isActive : existing.isActive,
    },
  });

  await logAuditEvent({
    action: "CATEGORY_UPDATE",
    entity: "Category",
    entityId: id,
    oldValue: { name: existing.name, slug: existing.slug, isActive: existing.isActive },
    newValue: { name: updated.name, slug: updated.slug, isActive: updated.isActive },
    userId: user.id,
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  return { success: true, category: updated };
}

export async function deleteCategory(id: string) {
  const user = await requireAdmin();

  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) return { error: "Category not found." };

  if (category._count.products > 0) {
    return {
      error: `Cannot delete category "${category.name}" because it contains ${category._count.products} products. Move or delete those products first.`,
    };
  }

  await db.category.delete({ where: { id } });

  await logAuditEvent({
    action: "CATEGORY_DELETE",
    entity: "Category",
    entityId: id,
    oldValue: { name: category.name, slug: category.slug },
    userId: user.id,
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  return { success: true };
}
