"use client";

import React, { useState, useTransition } from "react";
import { PurchaseStatus } from "@prisma/client";
import { createPurchaseInvoice, postDraftPurchase } from "@/app/actions/purchase-actions";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Loader2,
  FileText,
  DollarSign,
  AlertCircle,
  Truck,
  Building2,
  Eye,
  Send,
} from "lucide-react";

export interface PurchaseLineItem {
  id: string;
  productId: string;
  unitId: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  convertedQtyBase: number;
  product: { id: string; name: string; sku: string };
  unit: { id: string; name: string; symbol: string };
}

export interface PurchaseItem {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  notes: string | null;
  supplier: { id: string; name: string; companyName: string | null; phone: string };
  lines: PurchaseLineItem[];
  createdBy: { id: string; name: string };
}

interface PurchasesClientProps {
  initialPurchases: PurchaseItem[];
  suppliers: Array<{ id: string; name: string; companyName: string | null }>;
  products: Array<{ id: string; name: string; sku: string; costPrice: number; baseUnitId: string; baseUnit: { id: string; symbol: string } }>;
  units: Array<{ id: string; name: string; symbol: string }>;
}

const STATUS_CONFIG: Record<PurchaseStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Draft Order", bg: "#f3f4f6", color: "#4b5563" },
  POSTED: { label: "Goods Received (Posted)", bg: "#d1fae5", color: "#065f46" },
  CANCELLED: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" },
};

export function PurchasesClient({ initialPurchases, suppliers, products, units }: PurchasesClientProps) {
  const [purchases, setPurchases] = useState<PurchaseItem[]>(initialPurchases);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<Array<{ productId: string; unitId: string; qty: number; unitCost: number }>>([
    {
      productId: products[0]?.id || "",
      unitId: products[0]?.baseUnitId || units[0]?.id || "",
      qty: 10,
      unitCost: products[0]?.costPrice || 100,
    },
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier.companyName && p.supplier.companyName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const subtotal = lines.reduce((acc, l) => acc + l.qty * l.unitCost, 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);

  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId,
              unitId: selectedProd?.baseUnitId || l.unitId,
              unitCost: selectedProd?.costPrice || l.unitCost,
            }
          : l
      )
    );
  };

  const addLine = () => {
    const firstProd = products[0];
    setLines((prev) => [
      ...prev,
      {
        productId: firstProd?.id || "",
        unitId: firstProd?.baseUnitId || units[0]?.id || "",
        qty: 10,
        unitCost: firstProd?.costPrice || 100,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const openCreateModal = () => {
    setSupplierId(suppliers[0]?.id || "");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setLines([
      {
        productId: products[0]?.id || "",
        unitId: products[0]?.baseUnitId || units[0]?.id || "",
        qty: 10,
        unitCost: products[0]?.costPrice || 100,
      },
    ]);
    setDiscount(0);
    setTax(0);
    setNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSavePurchase = (postImmediately: boolean) => {
    setFormError(null);

    if (lines.length === 0) {
      setFormError("At least one line item is required.");
      return;
    }

    startTransition(async () => {
      const res = await createPurchaseInvoice({
        supplierId,
        purchaseDate: new Date(purchaseDate),
        lines,
        discount,
        tax,
        notes,
        postImmediately,
      });

      if ("error" in res && res.error) {
        setFormError(res.error);
      } else if ("purchase" in res && res.purchase) {
        setPurchases((prev) => [
          {
            ...res.purchase,
            purchaseDate: new Date(res.purchase.purchaseDate),
            createdBy: { id: "me", name: "Current User" },
          },
          ...prev,
        ]);
        setIsModalOpen(false);
      }
    });
  };

  const handlePostDraft = (purchaseId: string) => {
    if (!confirm("Posting this invoice will increase inventory and update Moving Weighted Average Cost. Continue?")) return;

    startTransition(async () => {
      const res = await postDraftPurchase(purchaseId);
      if (res.error) {
        alert(res.error);
      } else if (res.purchase) {
        setPurchases((prev) =>
          prev.map((p) =>
            p.id === purchaseId ? { ...p, status: PurchaseStatus.POSTED } : p
          )
        );
      }
    });
  };

  // KPIs
  const totalPurchasedAmount = purchases
    .filter((p) => p.status === PurchaseStatus.POSTED)
    .reduce((acc, p) => acc + p.total, 0);

  const totalDueAmount = purchases
    .filter((p) => p.status === PurchaseStatus.POSTED)
    .reduce((acc, p) => acc + p.dueAmount, 0);

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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Purchase Management</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Receive goods, generate purchase invoices, and automatically recompute Moving Weighted-Average Cost.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-new-purchase"
        >
          <Plus size={16} />
          <span>New Purchase Invoice</span>
        </button>
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
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Purchases Received</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-primary)" }}>
            {formatCurrency(totalPurchasedAmount)}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Posted invoices to date
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Unpaid Purchase Dues</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-danger)" }}>
            {formatCurrency(totalDueAmount)}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Current accounts payable
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Purchase Orders</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem" }}>{purchases.length}</div>
        </div>
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
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by invoice number or supplier name..."
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
            { id: "ALL", label: "All Invoices" },
            { id: PurchaseStatus.POSTED, label: "Posted" },
            { id: PurchaseStatus.DRAFT, label: "Drafts" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: statusFilter === st.id ? "var(--color-primary)" : "white",
                color: statusFilter === st.id ? "white" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Invoice #</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Lines</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Grand Total</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No purchase invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const cfg = STATUS_CONFIG[p.status];
                  const dateStr = new Date(p.purchaseDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                        {p.invoiceNumber}
                      </td>
                      <td style={{ padding: "1rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{p.supplier.name}</div>
                        {p.supplier.companyName && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {p.supplier.companyName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        {p.lines.length} items
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {formatCurrency(p.total)}
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
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        {p.status === PurchaseStatus.DRAFT && (
                          <button
                            onClick={() => handlePostDraft(p.id)}
                            className="btn btn-primary btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                          >
                            <Send size={12} />
                            <span>Post Goods</span>
                          </button>
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

      {/* Create Purchase Invoice Modal */}
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
            overflowY: "auto",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 760,
              padding: "1.75rem",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Create Wholesale Purchase Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "0.5rem", background: "#fee2e2", color: "#991b1b", fontSize: "0.8125rem" }}>
                {formError}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Supplier / Vendor *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 700 }}>Purchased Products</label>
                <button
                  type="button"
                  onClick={addLine}
                  className="btn btn-ghost btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}
                >
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div style={{ border: "1px solid var(--color-border)", borderRadius: "0.5rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "0.625rem 0.75rem", textAlign: "left" }}>Product</th>
                      <th style={{ padding: "0.625rem 0.75rem", textAlign: "left", width: 110 }}>Unit</th>
                      <th style={{ padding: "0.625rem 0.75rem", textAlign: "left", width: 90 }}>Qty</th>
                      <th style={{ padding: "0.625rem 0.75rem", textAlign: "left", width: 110 }}>Unit Cost</th>
                      <th style={{ padding: "0.625rem 0.75rem", textAlign: "right", width: 120 }}>Total (NPR)</th>
                      <th style={{ padding: "0.625rem 0.5rem", width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <select
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", fontSize: "0.8125rem", background: "white" }}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <select
                            value={line.unitId}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitId: newUnit } : l)));
                            }}
                            style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", fontSize: "0.8125rem", background: "white" }}
                          >
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.symbol})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, qty: val } : l)));
                            }}
                            style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", fontSize: "0.8125rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={line.unitCost}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitCost: val } : l)));
                            }}
                            style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", fontSize: "0.8125rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                          {formatCurrency(line.qty * line.unitCost)}
                        </td>
                        <td style={{ padding: "0.5rem 0.5rem", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 1}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Discounts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Invoice Notes & Delivery Challan Reference
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Truck number, delivery receipt, supplier remarks..."
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{formatCurrency(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                  <span>Discount (NPR):</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    style={{ width: 100, padding: "0.25rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", textAlign: "right" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                  <span>VAT / Tax (NPR):</span>
                  <input
                    type="number"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    style={{ width: 100, padding: "0.25rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--color-border)", textAlign: "right" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)", fontSize: "1rem", fontWeight: 800 }}>
                  <span>Grand Total:</span>
                  <span style={{ color: "var(--color-primary)", fontFamily: "monospace" }}>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePurchase(false)}
                className="btn btn-ghost"
                disabled={isPending}
                style={{ border: "1px solid var(--color-border)" }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSavePurchase(true)}
                className="btn btn-primary"
                disabled={isPending}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                <span>Receive & Post Immediately</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
