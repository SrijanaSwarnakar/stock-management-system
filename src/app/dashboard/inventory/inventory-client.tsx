"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  Warehouse,
  Search,
  AlertTriangle,
  History,
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
} from "lucide-react";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderThreshold: number;
  category: { id: string; name: string };
  baseUnit: { id: string; name: string; symbol: string };
}

interface InventoryClientProps {
  initialProducts: InventoryItem[];
  metrics: {
    totalCostValuation: number;
    totalRetailValuation: number;
    potentialProfit: number;
    totalItemsCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function InventoryClient({ initialProducts, metrics }: InventoryClientProps) {
  const [products] = useState<InventoryItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterHealth, setFilterHealth] = useState<"ALL" | "GOOD" | "LOW" | "OUT">("ALL");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.name.toLowerCase().includes(search.toLowerCase());

    let matchesHealth = true;
    if (filterHealth === "OUT") matchesHealth = p.currentStock <= 0;
    else if (filterHealth === "LOW") matchesHealth = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;
    else if (filterHealth === "GOOD") matchesHealth = p.currentStock > p.reorderThreshold;

    return matchesSearch && matchesHealth;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Inventory Valuation & Stock</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Real-time warehouse inventory valuation (Weighted Average Cost), quantities on hand, and reorder levels.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/dashboard/inventory/adjustments"
            className="btn btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <SlidersHorizontal size={16} />
            <span>Stock Adjustments</span>
          </Link>
          <Link
            href="/dashboard/inventory/ledger"
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <History size={16} />
            <span>Stock Ledger</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Stock Cost Valuation</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-primary)" }}>
            {formatCurrency(metrics.totalCostValuation)}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Weighted average asset value
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Retail Realization Value</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-text-primary)" }}>
            {formatCurrency(metrics.totalRetailValuation)}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-success)", marginTop: "0.25rem", fontWeight: 600 }}>
            +{formatCurrency(metrics.potentialProfit)} projected gross
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Items On Hand</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {metrics.totalItemsCount.toLocaleString("en-NP")}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Across {products.length} registered SKUs
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Low / Out Alerts</div>
            <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-warning)" }}>
              {metrics.lowStockCount}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>low</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-danger)", marginLeft: "0.5rem" }}>
              {metrics.outOfStockCount}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>out</span>
          </div>
        </div>
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
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search stock by product, SKU, or category..."
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

        <div style={{ display: "flex", gap: "0.375rem" }}>
          {[
            { id: "ALL", label: "All Stock" },
            { id: "GOOD", label: "Healthy" },
            { id: "LOW", label: "Low Level" },
            { id: "OUT", label: "Out of Stock" },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setFilterHealth(h.id as any)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: filterHealth === h.id ? "var(--color-primary)" : "white",
                color: filterHealth === h.id ? "white" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Valuation Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Product & SKU</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Department</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Stock Qty</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Avg Cost Price</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Total Asset Value</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Reorder Threshold</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No inventory records match the search filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.currentStock <= 0;
                  const isLow = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;
                  const totalValue = p.currentStock * p.costPrice;

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{p.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            {p.sku}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem", color: "var(--color-text-secondary)" }}>{p.category.name}</td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                          {p.currentStock.toLocaleString("en-NP")}
                        </span>{" "}
                        <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                          {p.baseUnit.symbol}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                        {formatCurrency(totalValue)}
                      </td>
                      <td style={{ padding: "1rem 1rem", color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                        {p.reorderThreshold} {p.baseUnit.symbol}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        {isOut ? (
                          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.6875rem", fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.6875rem", fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>
                            Low Level
                          </span>
                        ) : (
                          <span style={{ padding: "0.2rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.6875rem", fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>
                            Adequate
                          </span>
                        )}
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
