"use client";

import React, { useState, useTransition } from "react";
import { createSupplier, updateSupplier } from "@/app/actions/supplier-actions";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";

export interface SupplierItem {
  id: string;
  name: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  panVatNumber: string | null;
  address: string | null;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    purchases: number;
    payments: number;
  };
}

interface SuppliersClientProps {
  initialSuppliers: SupplierItem[];
}

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    panVatNumber: "",
    address: "",
    openingBalance: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
    s.phone.includes(search) ||
    (s.panVatNumber && s.panVatNumber.includes(search))
  );

  const totalPayables = suppliers.reduce((acc, s) => acc + s.currentBalance, 0);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      companyName: "",
      phone: "",
      email: "",
      panVatNumber: "",
      address: "",
      openingBalance: 0,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: SupplierItem) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      companyName: s.companyName || "",
      phone: s.phone,
      email: s.email || "",
      panVatNumber: s.panVatNumber || "",
      address: s.address || "",
      openingBalance: s.openingBalance,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, {
          name: formData.name,
          companyName: formData.companyName,
          phone: formData.phone,
          email: formData.email,
          panVatNumber: formData.panVatNumber,
          address: formData.address,
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.supplier) {
          setSuppliers((prev) =>
            prev.map((item) =>
              item.id === editingSupplier.id
                ? {
                    ...item,
                    name: res.supplier.name,
                    companyName: res.supplier.companyName,
                    phone: res.supplier.phone,
                    email: res.supplier.email,
                    panVatNumber: res.supplier.panVatNumber,
                    address: res.supplier.address,
                  }
                : item
            )
          );
          setIsModalOpen(false);
        }
      } else {
        const res = await createSupplier({
          name: formData.name,
          companyName: formData.companyName,
          phone: formData.phone,
          email: formData.email,
          panVatNumber: formData.panVatNumber,
          address: formData.address,
          openingBalance: Number(formData.openingBalance),
        });

        if ("error" in res && res.error) {
          setFormError(res.error);
        } else if ("supplier" in res && res.supplier) {
          setSuppliers((prev) => [
            {
              ...res.supplier,
              createdAt: new Date(res.supplier.createdAt),
              updatedAt: new Date(res.supplier.updatedAt),
              _count: { purchases: 0, payments: 0 },
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Suppliers & Vendors</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Wholesale manufacturers, authorized distributors, and supplier payable ledger balances.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-add-supplier"
        >
          <Plus size={16} />
          <span>Add Supplier</span>
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
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Active Suppliers</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>{suppliers.length}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Outstanding Payables</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-danger)" }}>
            {formatCurrency(totalPayables)}
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Amount owed to suppliers
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          maxWidth: 400,
          position: "relative",
        }}
      >
        <Search
          size={16}
          style={{ position: "absolute", left: "1.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by supplier name, PAN, phone..."
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

      {/* Suppliers Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Supplier Name & Company</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Contact Info</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>PAN / VAT</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Invoices</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Payable Due</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No suppliers match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "0.5rem",
                            background: "var(--brand-50)",
                            color: "var(--color-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{s.name}</div>
                          {s.companyName && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              {s.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1rem" }}>
                      <div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Phone size={12} style={{ color: "var(--color-text-muted)" }} />
                          <span>{s.phone}</span>
                        </div>
                        {s.address && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-text-muted)" }}>
                            <MapPin size={12} />
                            <span>{s.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1rem", fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                      {s.panVatNumber || "—"}
                    </td>
                    <td style={{ padding: "1rem 1rem" }}>
                      <span style={{ fontWeight: 600 }}>{s._count.purchases} purchases</span>
                    </td>
                    <td style={{ padding: "1rem 1rem" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: s.currentBalance > 0 ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      >
                        {formatCurrency(s.currentBalance)}
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                      <button
                        onClick={() => openEditModal(s)}
                        className="btn btn-ghost btn-sm"
                        title="Edit Supplier"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                {editingSupplier ? "Edit Supplier Details" : "Register New Supplier"}
              </h2>
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
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. CG Foods Nepal Pvt. Ltd."
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Trade Name / Brand
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. CG Corp / Wai Wai"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 01-5542300"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    PAN / VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.panVatNumber}
                    onChange={(e) => setFormData({ ...formData, panVatNumber: e.target.value })}
                    placeholder="e.g. 300123456"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Office / Warehouse Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Sanepa, Lalitpur"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              {!editingSupplier && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Opening Payable Due (NPR)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 125000"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>{editingSupplier ? "Update Supplier" : "Register Supplier"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
