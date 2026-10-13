"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth-utils";

export type AuditLogFilter = {
  page?: number;
  pageSize?: number;
  entity?: string;
  action?: string;
  search?: string;
};

export async function logAuditEvent(params: {
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
}) {
  try {
    let uid = params.userId;
    if (!uid) {
      const user = await getCurrentUser();
      uid = user?.id;
    }

    return await db.auditLog.create({
      data: {
        userId: uid,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}

export async function getAuditLogs(filter: AuditLogFilter = {}) {
  await requireAdmin();

  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (filter.entity) {
    where.entity = filter.entity;
  }
  if (filter.action) {
    where.action = filter.action;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take: pageSize,
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
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}
