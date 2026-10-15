"use client";

import React, { useState, useTransition } from "react";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/app/actions/customer-actions";
import { formatCurrency, formatDate, getStatusClass } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Building2,
  Phone,
  Mail,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface CustomerItem {
  id: string;
  name: string;
  shopName: string | null;
  phone: string;
  email: string | null;
  panVatNumber: string | null;
  address: string | null;
  creditLimit: number;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { sales: number; payments: number };
}

interface CustomersClientProps {
  initialCustomers: CustomerItem[];
}

const emptyForm = {
  name: "",
  shopName: "",
  phone: "",
  email: "",
  panVatNumber: "",
  address: "",
  creditLimit: "",
  openingBalance: "",
};

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.shopName ?? "").toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      shopName: customer.shopName ?? "",
      phone: customer.phone,
      email: customer.email ?? "",
      panVatNumber: customer.panVatNumber ?? "",
      address: customer.address ?? "",
      creditLimit: String(customer.creditLimit),
      openingBalance: String(customer.openingBalance),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, {
          name: formData.name,
          shopName: formData.shopName,
          phone: formData.phone,
          email: formData.email,
          panVatNumber: formData.panVatNumber,
          address: formData.address,
          creditLimit: Number(formData.creditLimit),
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.customer) {
          setCustomers((prev) =>
            prev.map((item) =>
              item.id === editingCustomer.id
                ? {
                    ...item,
                    name: res.customer.name,
                    shopName: res.customer.shopName,
                    phone: res.customer.phone,
                    email: res.customer.email,
                    panVatNumber: res.customer.panVatNumber,
                    address: res.customer.address,
                    creditLimit: res.customer.creditLimit,
                  }
                : item
            )
          );
          setIsModalOpen(false);
        }
      } else {
        const res = await createCustomer({
          name: formData.name,
          shopName: formData.shopName,
          phone: formData.phone,
          email: formData.email,
          panVatNumber: formData.panVatNumber,
          address: formData.address,
          creditLimit: Number(formData.creditLimit),
          openingBalance: Number(formData.openingBalance),
        });

        if ("error" in res && res.error) {
          setFormError(res.error);
        } else if ("customer" in res && res.customer) {
          setCustomers((prev) => [
            {
              ...res.customer,
              createdAt: new Date(res.customer.createdAt),
              updatedAt: new Date(res.customer.updatedAt),
              _count: { sales: 0, payments: 0 },
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if ("error" in res && res.error) {
        alert(res.error);
      } else {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        setDeleteConfirm(null);
      }
    });
  };

  const handleToggleActive = (customer: CustomerItem) => {
    startTransition(async () => {
      const res = await updateCustomer(customer.id, {
        name: customer.name,
        phone: customer.phone,
        isActive: !customer.isActive,
      });
      if (res.customer) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customer.id ? { ...c, isActive: res.customer.isActive } : c
          )
        );
      }
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer accounts and credit limits</p>
        </div>
        <button id="btn-add-customer" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: "var(--color-success)" }}>
            {customers.filter((c) => c.isActive).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Outstanding</div>
          <div className="stat-value" style={{ color: "var(--color-warning)", fontSize: "1rem" }}>
            {formatCurrency(customers.reduce((s, c) => s + c.currentBalance, 0))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input
            id="customer-search"
            className="input"
            placeholder="Search by name, shop, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th style={{ textAlign: "right" }}>Credit Limit</th>
                <th style={{ textAlign: "right" }}>Outstanding</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Sales</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
                    <Users size={32} style={{ margin: "0 auto 0.5rem" }} />
                    <div>No customers found</div>
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{customer.name}</div>
                      {customer.shopName && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                          <Building2 size={11} style={{ display: "inline", marginRight: 3 }} />
                          {customer.shopName}
                        </div>
                      )}
                      {customer.panVatNumber && (
                        <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>PAN: {customer.panVatNumber}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>
                        <Phone size={12} style={{ display: "inline", marginRight: 4 }} />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                          <Mail size={11} style={{ display: "inline", marginRight: 3 }} />
                          {customer.email}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {customer.creditLimit > 0 ? formatCurrency(customer.creditLimit) : <span style={{ color: "var(--color-muted)" }}>No limit</span>}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      <span style={{ color: customer.currentBalance > 0 ? "var(--color-warning)" : "var(--color-success)", fontWeight: 600 }}>
                        {formatCurrency(customer.currentBalance)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={customer.isActive ? "badge badge-success" : "badge badge-neutral"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-neutral">{customer._count.sales}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          title={customer.isActive ? "Deactivate" : "Activate"}
                          onClick={() => handleToggleActive(customer)}
                        >
                          {customer.isActive ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Edit"
                          onClick={() => openEdit(customer)}
                        >
                          <Edit2 size={15} />
                        </button>
                        {customer._count.sales === 0 && (
                          <button
                            className="btn btn-ghost btn-icon btn-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm(customer.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Customer Name <span style={{ color: "var(--color-danger)" }}>*</span>
                    </label>
                    <input
                      id="customer-name"
                      className="input"
                      placeholder="Full name"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shop / Company Name</label>
                    <input
                      id="customer-shopname"
                      className="input"
                      placeholder="Business name (optional)"
                      value={formData.shopName}
                      onChange={(e) => setFormData((p) => ({ ...p, shopName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Phone <span style={{ color: "var(--color-danger)" }}>*</span>
                    </label>
                    <input
                      id="customer-phone"
                      className="input"
                      placeholder="98XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      id="customer-email"
                      className="input"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN / VAT Number</label>
                    <input
                      id="customer-pan"
                      className="input"
                      placeholder="PAN or VAT no."
                      value={formData.panVatNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, panVatNumber: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      id="customer-address"
                      className="input"
                      placeholder="Street, City"
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (NPR)</label>
                    <input
                      id="customer-credit-limit"
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0 = no limit"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData((p) => ({ ...p, creditLimit: e.target.value }))}
                    />
                  </div>
                  {!editingCustomer && (
                    <div className="form-group">
                      <label className="form-label">Opening Balance (NPR)</label>
                      <input
                        id="customer-opening-balance"
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.openingBalance}
                        onChange={(e) => setFormData((p) => ({ ...p, openingBalance: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button id="btn-save-customer" type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? <Loader2 size={16} className="spin" /> : null}
                  {editingCustomer ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Customer</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--color-muted)" }}>
                Are you sure you want to permanently delete this customer? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                id="btn-confirm-delete-customer"
                className="btn btn-danger"
                disabled={isPending}
                onClick={() => handleDelete(deleteConfirm)}
              >
                {isPending ? <Loader2 size={16} className="spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
