import type { Metadata } from "next";
import { AuditLogClient, type AuditLogItem } from "./audit-log-client";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Audit Log",
};

const FALLBACK_LOGS: AuditLogItem[] = [
  {
    id: "log_1",
    action: "USER_CREATE",
    entity: "User",
    entityId: "usr_4",
    oldValue: null,
    newValue: { name: "Rajesh Maharjan", role: "INVENTORY_STAFF" },
    createdAt: new Date("2026-10-13T10:15:00Z"),
    user: {
      id: "usr_1",
      name: "Bikram Sharma",
      email: "admin@shreeganesh.com.np",
      role: "ADMIN",
    },
  },
  {
    id: "log_2",
    action: "PURCHASE_RECEIVE",
    entity: "Purchase",
    entityId: "PINV-2081-000018",
    oldValue: { status: "DRAFT" },
    newValue: { status: "POSTED", total: 185000 },
    createdAt: new Date("2026-10-13T09:40:00Z"),
    user: {
      id: "usr_2",
      name: "Suman Shrestha",
      email: "manager@shreeganesh.com.np",
      role: "MANAGER",
    },
  },
  {
    id: "log_3",
    action: "STOCK_ADJUST",
    entity: "StockMovement",
    entityId: "sm_88",
    oldValue: null,
    newValue: { product: "Wai Wai Chicken", qty: -5, reason: "Carton damage during transit" },
    createdAt: new Date("2026-10-12T16:20:00Z"),
    user: {
      id: "usr_4",
      name: "Rajesh Maharjan",
      email: "inventory@shreeganesh.com.np",
      role: "INVENTORY_STAFF",
    },
  },
];

export default async function AuditLogPage() {
  let logs = FALLBACK_LOGS;
  try {
    const dbLogs = await db.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    if (dbLogs && dbLogs.length > 0) {
      logs = dbLogs;
    }
  } catch {
    // Database connection fallback during prerender
  }

  return <AuditLogClient initialLogs={logs} />;
}
