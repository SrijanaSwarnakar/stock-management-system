"use client";

import React, { useState, useTransition } from "react";
import { AdjustmentType } from "@prisma/client";
import { createStockAdjustment } from "@/app/actions/inventory-actions";
import { formatCurrency } from "@/lib/utils";
import {
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  ArrowRight,
  Clock,
  X,
  Loader2,
  FileText,
  UserCheck,
} from "lucide-react";

export interface StockAdjustmentItem {
  id: string;
  adjustmentNumber: string;
  adjustmentType: AdjustmentType;
  qty: number;
  unitCost: number;
  reason: string;
  createdAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    baseUnit: { symbol: string };
  };
  createdBy: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  costPrice: number;
  baseUnit: { symbol: string };
}

interface AdjustmentsClientProps {
  initialAdjustments: StockAdjustmentItem[];
  products: ProductOption[];
}

const TYPE_CONFIG: Record<AdjustmentType, { label: string; bg: string; color: string; isDecrease: boolean }> = {
  INCREASE: { label: "Found Stock / Audit (+)", bg: "#dcfce7", color: "#15803d", isDecrease: false },
  DECREASE: { label: "Discrepancy Deduction (-)", bg: "#fee2e2", color: "#991b1b", isDecrease: true },
  DAMAGE: { label: "Damaged Goods (-)", bg: "#fef3c7", color: "#92400e", isDecrease: true },
  EXPIRY: { label: "Expired Stock (-)", bg: "#fee2e2", color: "#b91c1c", isDecrease: true },
  THEFT: { label: "Pilferage / Theft (-)", bg: "#fee2e2", color: "#7f1d1d", isDecrease: true },
  CORRECTION: { label: "Physical Count Correction", bg: "#eef2ff", color: "#4f46e5", isDecrease: false },
};

export function AdjustmentsClient({ initialAdjustments, products }: AdjustmentsClientProps) {
  const [adjustments, setAdjustments] = useState<StockAdjustmentItem[]>(initialAdjustments);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(AdjustmentType.DAMAGE);
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const isDecrease = TYPE_CONFIG[adjustmentType].isDecrease;
  const signedQty = isDecrease ? -Math.abs(qty) : Math.abs(qty);
  const projectedStock = (selectedProduct?.currentStock || 0) + signedQty;

  const openModal = () => {
    setSelectedProductId(products[0]?.id || "");
    setAdjustmentType(AdjustmentType.DAMAGE);
    setQty(1);
    setReason("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProduct) {
      setFormError("Please select a product.");
      return;
    }

    if (projectedStock < 0) {
      setFormError(`Insufficient stock. Current stock is ${selectedProduct.currentStock} ${selectedProduct.baseUnit.symbol}.`);
      return;
    }

    startTransition(async () => {
      const res = await createStockAdjustment({
        productId: selectedProduct.id,
        adjustmentType,
        qty: Math.abs(qty),
        unitCost: selectedProduct.costPrice,
        reason,
      });

      if ("error" in res && res.error) {
        setFormError(res.error);
      } else if ("adjustment" in res && res.adjustment) {
        setAdjustments((prev) => [
          {
            ...res.adjustment,
            createdAt: new Date(res.adjustment.createdAt),
            product: {
              id: selectedProduct.id,
              name: selectedProduct.name,
              sku: selectedProduct.sku,
              baseUnit: selectedProduct.baseUnit,
            },
            createdBy: { id: "me", name: "Current User" },
            approvedBy: { id: "me", name: "Authorized" },
          },
          ...prev,
        ]);
        setIsModalOpen(false);
      }
    });
  };

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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Stock Adjustments</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Record inventory write-offs, shrinkage, damages, expiry, and physical stock count discrepancies.
          </p>
        </div>
        <button
          onClick={openModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-new-adjustment"
        >
          <Plus size={16} />
          <span>New Stock Adjustment</span>
        </button>
      </div>

      {/* Adjustments Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Adjustment Ref</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Product & SKU</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Category / Type</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Value Impact</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Reason / Authorization</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No stock adjustments recorded.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => {
                  const cfg = TYPE_CONFIG[adj.adjustmentType] || { label: adj.adjustmentType, bg: "#f3f4f6", color: "#374151", isDecrease: adj.qty < 0 };
                  const isPositive = adj.qty > 0;
                  const totalImpact = Math.abs(adj.qty) * adj.unitCost;
                  const dateStr = new Date(adj.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={adj.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                        {adj.adjustmentNumber}
                      </td>
                      <td style={{ padding: "1rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{adj.product.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            {adj.product.sku}
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
                            background: cfg.bg,
                            color: cfg.color,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: isPositive ? "var(--color-success)" : "var(--color-danger)",
                          }}
                        >
                          {isPositive ? `+${adj.qty}` : adj.qty} {adj.product.baseUnit.symbol}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
                        {formatCurrency(totalImpact)}
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div>
                          <div style={{ color: "var(--color-text-primary)" }}>{adj.reason}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                            By: {adj.createdBy.name} {adj.approvedBy ? `• Approved: ${adj.approvedBy.name}` : ""}
                          </div>
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

      {/* New Adjustment Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 480, padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Record Stock Adjustment</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "0.5rem", background: "#fee2e2", color: "#991b1b", fontSize: "0.8125rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currentStock} {p.baseUnit.symbol} on hand)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Adjustment Type & Reason Code
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                >
                  <option value={AdjustmentType.DAMAGE}>Damaged Goods (Carton breakage / leak)</option>
                  <option value={AdjustmentType.EXPIRY}>Expired Stock (Past best before)</option>
                  <option value={AdjustmentType.DECREASE}>Discrepancy (Physical count shortage)</option>
                  <option value={AdjustmentType.THEFT}>Pilferage / Theft</option>
                  <option value={AdjustmentType.INCREASE}>Found Stock (Surplus count addition)</option>
                  <option value={AdjustmentType.CORRECTION}>General Physical Correction</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Quantity ({selectedProduct?.baseUnit.symbol || "units"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "0.875rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.8125rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Current Stock:</span>
                  <span style={{ fontWeight: 600 }}>{selectedProduct?.currentStock} {selectedProduct?.baseUnit.symbol}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>Adjustment Effect:</span>
                  <span style={{ fontWeight: 700, color: signedQty > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                    {signedQty > 0 ? `+${signedQty}` : signedQty} {selectedProduct?.baseUnit.symbol}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.25rem", borderTop: "1px solid var(--color-border-light)" }}>
                  <span style={{ fontWeight: 600 }}>Projected Stock Balance:</span>
                  <span style={{ fontWeight: 800, color: projectedStock < 0 ? "var(--color-danger)" : "var(--color-primary)" }}>
                    {projectedStock} {selectedProduct?.baseUnit.symbol}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Detailed Reason / Justification *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. 8 bottles crushed during shelf restocking in warehouse Bay B"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>Record & Update Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
