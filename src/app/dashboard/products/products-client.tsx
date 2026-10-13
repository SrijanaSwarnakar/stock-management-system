"use client";

import React, { useState, useTransition } from "react";
import { createProduct, updateProduct, toggleProductStatus } from "@/app/actions/product-actions";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  TrendingUp,
  History,
  X,
  Loader2,
  DollarSign,
  Tag,
  Barcode,
} from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  baseUnitId: string;
  description: string | null;
  imageUrl: string | null;
  costPrice: number;
  sellingPrice: number;
  minSellingPrice: number | null;
  reorderThreshold: number;
  currentStock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  priceHistories?: Array<{
    id: string;
    oldCostPrice: number;
    newCostPrice: number;
    oldSellingPrice: number;
    newSellingPrice: number;
    createdAt: Date;
  }>;
}

interface ProductsClientProps {
  initialProducts: ProductItem[];
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; symbol: string }>;
}

export function ProductsClient({ initialProducts, categories, units }: ProductsClientProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT" | "IN">("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    categoryId: categories[0]?.id || "",
    baseUnitId: units[0]?.id || "",
    description: "",
    costPrice: 0,
    sellingPrice: 0,
    minSellingPrice: 0,
    reorderThreshold: 10,
    openingStock: 0,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));

    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;

    let matchesStock = true;
    if (stockFilter === "LOW") {
      matchesStock = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;
    } else if (stockFilter === "OUT") {
      matchesStock = p.currentStock <= 0;
    } else if (stockFilter === "IN") {
      matchesStock = p.currentStock > p.reorderThreshold;
    }

    return matchesSearch && matchesCat && matchesStock;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      categoryId: categories[0]?.id || "",
      baseUnitId: units[0]?.id || "",
      description: "",
      costPrice: 0,
      sellingPrice: 0,
      minSellingPrice: 0,
      reorderThreshold: 10,
      openingStock: 0,
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      categoryId: p.categoryId,
      baseUnitId: p.baseUnitId,
      description: p.description || "",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      minSellingPrice: p.minSellingPrice || p.costPrice,
      reorderThreshold: p.reorderThreshold,
      openingStock: p.currentStock,
      isActive: p.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.sellingPrice < formData.costPrice) {
      if (!confirm("Selling price is lower than cost price (negative margin). Do you wish to continue?")) {
        return;
      }
    }

    startTransition(async () => {
      if (editingProduct) {
        const res = await updateProduct(editingProduct.id, {
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode,
          categoryId: formData.categoryId,
          baseUnitId: formData.baseUnitId,
          description: formData.description,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          minSellingPrice: Number(formData.minSellingPrice),
          reorderThreshold: Number(formData.reorderThreshold),
          isActive: formData.isActive,
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.product) {
          setProducts((prev) =>
            prev.map((item) =>
              item.id === editingProduct.id
                ? {
                    ...item,
                    name: res.product!.name,
                    sku: res.product!.sku,
                    barcode: res.product!.barcode,
                    categoryId: res.product!.categoryId,
                    baseUnitId: res.product!.baseUnitId,
                    description: res.product!.description,
                    costPrice: res.product!.costPrice,
                    sellingPrice: res.product!.sellingPrice,
                    minSellingPrice: res.product!.minSellingPrice,
                    reorderThreshold: res.product!.reorderThreshold,
                    isActive: res.product!.isActive,
                    category: res.product!.category,
                    baseUnit: res.product!.baseUnit,
                  }
                : item
            )
          );
          setIsModalOpen(false);
        }
      } else {
        const res = await createProduct({
          name: formData.name,
          sku: formData.sku,
          barcode: formData.barcode,
          categoryId: formData.categoryId,
          baseUnitId: formData.baseUnitId,
          description: formData.description,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice),
          minSellingPrice: Number(formData.minSellingPrice),
          reorderThreshold: Number(formData.reorderThreshold),
          openingStock: Number(formData.openingStock),
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.product) {
          setProducts((prev) => [
            {
              ...res.product!,
              createdAt: new Date(res.product!.createdAt),
              updatedAt: new Date(res.product!.updatedAt),
              priceHistories: [],
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }
      }
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await toggleProductStatus(id);
      if (res.error) {
        alert(res.error);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: res.isActive! } : p))
        );
      }
    });
  };

  // KPIs
  const totalCount = products.length;
  const lowStockCount = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.reorderThreshold).length;
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
  const avgMargin =
    products.length > 0
      ? (
          products.reduce((acc, p) => acc + (p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0), 0) /
          products.length
        ).toFixed(1)
      : "0";

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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Product Catalog</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Wholesale inventory items, cost prices, selling margins, and reorder alerts.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-add-product"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total SKU Catalog</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>{totalCount}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Low Stock Warning</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-warning)", marginTop: "0.25rem" }}>
            {lowStockCount}
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Out of Stock</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-danger)", marginTop: "0.25rem" }}>
            {outOfStockCount}
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Average Gross Margin</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-success)", marginTop: "0.25rem" }}>
            {avgMargin}%
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
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
            placeholder="Search by product name, SKU, or barcode..."
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
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--color-border)",
            fontSize: "0.875rem",
            outline: "none",
            background: "white",
          }}
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: "0.375rem" }}>
          {[
            { id: "ALL", label: "All Stock" },
            { id: "IN", label: "In Stock" },
            { id: "LOW", label: "Low Stock" },
            { id: "OUT", label: "Out of Stock" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStockFilter(s.id as any)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: stockFilter === s.id ? "var(--color-primary)" : "white",
                color: stockFilter === s.id ? "white" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Product Name & SKU</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Category</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Cost Price</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Selling Price</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Margin</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Stock on Hand</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const marginPct =
                    p.sellingPrice > 0
                      ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1)
                      : "0.0";
                  const isLowStock = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;
                  const isOutOfStock = p.currentStock <= 0;

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{p.name}</div>
                          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>
                            <span style={{ fontFamily: "monospace" }}>SKU: {p.sku}</span>
                            {p.barcode && <span>• Barcode: {p.barcode}</span>}
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
                            fontWeight: 600,
                            background: "var(--brand-50)",
                            color: "var(--color-primary)",
                          }}
                        >
                          {p.category.name}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td style={{ padding: "1rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: Number(marginPct) >= 15 ? "var(--color-success)" : Number(marginPct) >= 5 ? "var(--color-warning)" : "var(--color-danger)",
                          }}
                        >
                          {marginPct}%
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: isOutOfStock
                                ? "var(--color-danger)"
                                : isLowStock
                                ? "var(--color-warning)"
                                : "var(--color-text-primary)",
                            }}
                          >
                            {p.currentStock.toLocaleString("en-NP")} {p.baseUnit.symbol}
                          </span>
                          {isOutOfStock ? (
                            <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.15rem 0.35rem", borderRadius: "0.25rem", background: "#fee2e2", color: "#991b1b" }}>
                              OUT
                            </span>
                          ) : isLowStock ? (
                            <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.15rem 0.35rem", borderRadius: "0.25rem", background: "#fef3c7", color: "#92400e" }}>
                              LOW
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            onClick={() => openEditModal(p)}
                            className="btn btn-ghost btn-sm"
                            title="Edit Product"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
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

      {/* Add / Edit Product Modal */}
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
              maxWidth: 580,
              padding: "1.75rem",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                {editingProduct ? "Edit Product Catalog Item" : "Register New Wholesale Product"}
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
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Real Mixed Fruit Juice 1L"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. REAL-MIX-1L"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", fontFamily: "monospace" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Barcode (EAN-13)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 8901234002022"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Inventory Base Unit *
                  </label>
                  <select
                    required
                    value={formData.baseUnitId}
                    onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Cost Price (NPR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Selling Price (NPR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Min Price (Floor)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.minSellingPrice}
                    onChange={(e) => setFormData({ ...formData, minSellingPrice: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Reorder Threshold *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.reorderThreshold}
                    onChange={(e) => setFormData({ ...formData, reorderThreshold: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                  />
                </div>
                {!editingProduct && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                      Opening Stock Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.openingStock}
                      onChange={(e) => setFormData({ ...formData, openingStock: parseFloat(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Product Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Wholesale packaging specs, brand, carton size..."
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>{editingProduct ? "Save Changes" : "Create Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
