"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User as UserIcon,
  Activity,
  ArrowRight,
  Database,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogClientProps {
  initialLogs: AuditLogItem[];
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  USER_CREATE: { bg: "#eef2ff", color: "#4f46e5" },
  USER_UPDATE: { bg: "#f0fdf4", color: "#16a34a" },
  USER_ACTIVATE: { bg: "#ecfdf5", color: "#059669" },
  USER_DEACTIVATE: { bg: "#fef2f2", color: "#dc2626" },
  SALE_CREATE: { bg: "#fffbeb", color: "#d97706" },
  PURCHASE_RECEIVE: { bg: "#f5f3ff", color: "#7c3aed" },
  STOCK_ADJUST: { bg: "#fef3c7", color: "#b45309" },
};

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const [logs] = useState<AuditLogItem[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesEntity = selectedEntity === "ALL" || log.entity === selectedEntity;
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity.toLowerCase().includes(search.toLowerCase()) ||
      (log.entityId && log.entityId.toLowerCase().includes(search.toLowerCase())) ||
      (log.user && log.user.name.toLowerCase().includes(search.toLowerCase()));
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>System Audit Log</h1>
        <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Immutable trace of all administrative operations, master data updates, and transactions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by action, user, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.875rem 0.5rem 2.25rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--color-border)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["ALL", "User", "Product", "Sale", "Purchase", "StockMovement"].map((ent) => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: selectedEntity === ent ? "var(--color-primary)" : "white",
                color: selectedEntity === ent ? "white" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>User</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Action</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Entity</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Changes & Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No audit records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.action] || { bg: "#f3f4f6", color: "#374151" };
                  const formattedDate = new Date(log.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem", whiteSpace: "nowrap", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Clock size={13} style={{ color: "var(--color-text-muted)" }} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{log.user.name}</div>
                            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{log.user.role}</div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>System Task</span>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            background: actionStyle.bg,
                            color: actionStyle.color,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Database size={13} style={{ color: "var(--color-text-muted)" }} />
                          <span style={{ fontWeight: 600 }}>{log.entity}</span>
                        </div>
                        {log.entityId && (
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            background: "var(--color-background)",
                            padding: "0.375rem 0.625rem",
                            borderRadius: "0.375rem",
                            border: "1px solid var(--color-border-light)",
                            maxHeight: 60,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontFamily: "monospace",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {log.newValue
                            ? JSON.stringify(log.newValue)
                            : log.oldValue
                            ? JSON.stringify(log.oldValue)
                            : "Operation executed successfully"}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
