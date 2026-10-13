"use client";

import React, { useState } from "react";
import { MovementType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import {
  History,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileText,
  User,
  Package,
} from "lucide-react";

export interface StockMovementItem {
  id: string;
  movementType: MovementType;
  qty: number;
  unitCost: number;
  runningBalance: number;
  runningAvgCost: number;
  referenceType: string | null;
  referenceDoc: string | null;
  notes: string | null;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    baseUnit: { symbol: string };
  };
  createdBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface LedgerClientProps {
  initialMovements: StockMovementItem[];
  products: Array<{ id: string; name: string; sku: string }>;
}

const TYPE_CONFIG: Record<MovementType, { label: string; bg: string; color: string; isInflow: boolean }> = {
  OPENING: { label: "Opening Stock", bg: "#eef2ff", color: "#4f46e5", isInflow: true },
  PURCHASE: { label: "Purchase Receipt", bg: "#d1fae5", color: "#065f46", isInflow: true },
  SALE: { label: "Sales Dispatch", bg: "#fee2e2", color: "#991b1b", isInflow: false },
  PURCHASE_RETURN: { label: "Purchase Return", bg: "#fef3c7", color: "#92400e", isInflow: false },
  SALE_RETURN: { label: "Customer Return", bg: "#ecfdf5", color: "#047857", isInflow: true },
  ADJUSTMENT_IN: { label: "Stock Adjustment (+)", bg: "#dcfce7", color: "#15803d", isInflow: true },
  ADJUSTMENT_OUT: { label: "Stock Adjustment (-)", bg: "#fef2f2", color: "#b91c1c", isInflow: false },
};

export function LedgerClient({ initialMovements, products }: LedgerClientProps) {
  const [movements] = useState<StockMovementItem[]>(initialMovements);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const filteredMovements = movements.filter((m) => {
    const matchesProduct = selectedProduct === "ALL" || m.product.id === selectedProduct;
    const matchesType = selectedType === "ALL" || m.movementType === selectedType;
    const matchesSearch =
      m.product.name.toLowerCase().includes(search.toLowerCase()) ||
      m.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.referenceDoc && m.referenceDoc.toLowerCase().includes(search.toLowerCase())) ||
      (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()));

    return matchesProduct && matchesType && matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Stock Movements Ledger</h1>
        <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Immutable ledger audit trail of every warehouse inventory transaction, running balances, and costs.
        </p>
      </div>

      {/* Filter Bar */}
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
            placeholder="Search by invoice doc, notes, or product..."
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

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--color-border)",
            fontSize: "0.875rem",
            outline: "none",
            background: "white",
            maxWidth: 220,
          }}
        >
          <option value="ALL">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--color-border)",
            fontSize: "0.875rem",
            outline: "none",
            background: "white",
          }}
        >
          <option value="ALL">All Transaction Types</option>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <option key={type} value={type}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Date & Time</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Product Item</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Type</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Unit Cost</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Running Balance</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Reference Doc</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No stock movements found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const typeCfg = TYPE_CONFIG[m.movementType] || { label: m.movementType, bg: "#f3f4f6", color: "#374151", isInflow: m.qty > 0 };
                  const isPositive = m.qty > 0;
                  const dateStr = new Date(m.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem", whiteSpace: "nowrap", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Clock size={13} style={{ color: "var(--color-text-muted)" }} />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{m.product.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            {m.product.sku}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            background: typeCfg.bg,
                            color: typeCfg.color,
                          }}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          {isPositive ? (
                            <ArrowDownLeft size={14} style={{ color: "var(--color-success)" }} />
                          ) : (
                            <ArrowUpRight size={14} style={{ color: "var(--color-danger)" }} />
                          )}
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: "monospace",
                              color: isPositive ? "var(--color-success)" : "var(--color-danger)",
                            }}
                          >
                            {isPositive ? `+${m.qty}` : m.qty} {m.product.baseUnit.symbol}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
                        {formatCurrency(m.unitCost)}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--color-primary)" }}>
                          {m.runningBalance.toLocaleString("en-NP")} {m.product.baseUnit.symbol}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--color-text-primary)" }}>
                            {m.referenceDoc || "—"}
                          </div>
                          {m.notes && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                              {m.notes}
                            </div>
                          )}
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
