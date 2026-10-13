import type { Metadata } from "next";
import { UsersClient, type UserItem } from "./users-client";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export const metadata: Metadata = {
  title: "User Management",
};

const FALLBACK_USERS: UserItem[] = [
  {
    id: "usr_1",
    name: "Bikram Sharma (Proprietor)",
    email: "admin@shreeganesh.com.np",
    role: Role.ADMIN,
    phone: "9851011111",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    _count: { createdSales: 45, createdPurchases: 22 },
  },
  {
    id: "usr_2",
    name: "Suman Shrestha (General Manager)",
    email: "manager@shreeganesh.com.np",
    role: Role.MANAGER,
    phone: "9851022222",
    isActive: true,
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-01-05"),
    _count: { createdSales: 120, createdPurchases: 65 },
  },
  {
    id: "usr_3",
    name: "Anil Thapa (Sales Executive)",
    email: "sales@shreeganesh.com.np",
    role: Role.SALES_STAFF,
    phone: "9851033333",
    isActive: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    _count: { createdSales: 310, createdPurchases: 0 },
  },
  {
    id: "usr_4",
    name: "Rajesh Maharjan (Warehouse Supervisor)",
    email: "inventory@shreeganesh.com.np",
    role: Role.INVENTORY_STAFF,
    phone: "9851044444",
    isActive: true,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    _count: { createdSales: 0, createdPurchases: 88 },
  },
];

export default async function UsersPage() {
  let users = FALLBACK_USERS;
  try {
    const dbUsers = await db.user.findMany({
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
    if (dbUsers && dbUsers.length > 0) {
      users = dbUsers;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <UsersClient initialUsers={users} />;
}
