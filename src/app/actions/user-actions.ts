"use server";

import { db } from "@/lib/db";
import { requireAdmin, getCurrentUser } from "@/lib/auth-utils";
import { logAuditEvent } from "./audit-actions";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  await requireAdmin();

  return await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          createdSales: true,
          createdPurchases: true,
        },
      },
    },
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
}) {
  const currentUser = await requireAdmin();

  const existing = await db.user.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  });

  if (existing) {
    return { error: "A user with this email address already exists." };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const newUser = await db.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      phone: data.phone?.trim() || null,
      isActive: true,
    },
  });

  await logAuditEvent({
    action: "USER_CREATE",
    entity: "User",
    entityId: newUser.id,
    newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
    userId: currentUser.id,
  });

  revalidatePath("/dashboard/users");
  return { success: true, user: newUser };
}

export async function updateUser(
  id: string,
  data: {
    name: string;
    email: string;
    role: Role;
    phone?: string;
    isActive?: boolean;
    password?: string;
  }
) {
  const currentUser = await requireAdmin();

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };

  // Check email conflict if changing email
  if (data.email.toLowerCase().trim() !== user.email) {
    const existing = await db.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) return { error: "Another user already uses this email address." };
  }

  const updatePayload: any = {
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    role: data.role,
    phone: data.phone?.trim() || null,
  };

  if (typeof data.isActive === "boolean") {
    // Prevent disabling the current admin if they are updating themselves
    if (currentUser.id === id && !data.isActive) {
      return { error: "You cannot deactivate your own administrative account." };
    }
    updatePayload.isActive = data.isActive;
  }

  if (data.password && data.password.trim().length >= 6) {
    const salt = await bcrypt.genSalt(10);
    updatePayload.passwordHash = await bcrypt.hash(data.password.trim(), salt);
  }

  const updated = await db.user.update({
    where: { id },
    data: updatePayload,
  });

  await logAuditEvent({
    action: "USER_UPDATE",
    entity: "User",
    entityId: id,
    oldValue: { name: user.name, email: user.email, role: user.role, isActive: user.isActive },
    newValue: { name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive },
    userId: currentUser.id,
  });

  revalidatePath("/dashboard/users");
  return { success: true, user: updated };
}

export async function toggleUserStatus(id: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === id) {
    return { error: "You cannot change the active status of your own account." };
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return { error: "User not found." };

  const updated = await db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  await logAuditEvent({
    action: updated.isActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
    entity: "User",
    entityId: id,
    oldValue: { isActive: user.isActive },
    newValue: { isActive: updated.isActive },
    userId: currentUser.id,
  });

  revalidatePath("/dashboard/users");
  return { success: true, isActive: updated.isActive };
}
