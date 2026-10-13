import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: You do not have permission to perform this action.");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole([Role.ADMIN]);
}

export async function requireManagerOrAdmin() {
  return requireRole([Role.ADMIN, Role.MANAGER]);
}

/**
 * Checks if a given role can perform specific sensitive actions
 */
export function canPerform(role: Role, action: "manage_users" | "edit_products" | "post_sales" | "post_purchases" | "adjust_stock" | "view_reports" | "view_audit_log"): boolean {
  switch (action) {
    case "manage_users":
    case "view_audit_log":
      return role === Role.ADMIN;
    case "view_reports":
      return role === Role.ADMIN || role === Role.MANAGER;
    case "edit_products":
      return role === Role.ADMIN || role === Role.MANAGER || role === Role.INVENTORY_STAFF;
    case "post_purchases":
    case "adjust_stock":
      return role === Role.ADMIN || role === Role.MANAGER || role === Role.INVENTORY_STAFF;
    case "post_sales":
      return role === Role.ADMIN || role === Role.MANAGER || role === Role.SALES_STAFF;
    default:
      return false;
  }
}
