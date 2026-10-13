"use client";

import React, { useState, useTransition } from "react";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/category-actions";
import {
  Tag,
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  X,
  Loader2,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    products: number;
  };
}

interface CategoriesClientProps {
  initialCategories: CategoryItem[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", imageUrl: "", isActive: true });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      imageUrl: cat.imageUrl || "",
      isActive: cat.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    if (!editingCategory) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, name, slug }));
    } else {
      setFormData((prev) => ({ ...prev, name }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          imageUrl: formData.imageUrl,
          isActive: formData.isActive,
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.category) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? {
                    ...c,
                    name: res.category.name,
                    slug: res.category.slug,
                    description: res.category.description,
                    imageUrl: res.category.imageUrl,
                    isActive: res.category.isActive,
                  }
                : c
            )
          );
          setIsModalOpen(false);
        }
      } else {
        const res = await createCategory({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          imageUrl: formData.imageUrl,
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.category) {
          setCategories((prev) => [
            {
              ...res.category,
              createdAt: new Date(res.category.createdAt),
              updatedAt: new Date(res.category.updatedAt),
              _count: { products: 0 },
            },
            ...prev,
          ]);
          setIsModalOpen(false);
        }
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.error) {
        alert(res.error);
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== id));
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Category Management</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Organize products into wholesale merchandise departments and categories.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-add-category"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Search Bar */}
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
          placeholder="Search categories..."
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

      {/* Category Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {filteredCategories.length === 0 ? (
          <div className="card" style={{ gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
            No categories match your search.
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1rem",
                position: "relative",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "0.5rem",
                        background: "var(--brand-50)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Tag size={18} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{cat.name}</h2>
                      <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                        /{cat.slug}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.375rem",
                      background: cat.isActive ? "#d1fae5" : "#f3f4f6",
                      color: cat.isActive ? "#065f46" : "#6b7280",
                    }}
                  >
                    {cat.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                {cat.description && (
                  <p
                    style={{
                      margin: "0.75rem 0 0",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {cat.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--color-border-light)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <Package size={14} style={{ color: "var(--color-text-muted)" }} />
                  <span style={{ fontWeight: 600 }}>{cat._count.products} products</span>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    onClick={() => openEditModal(cat)}
                    className="btn btn-ghost btn-sm"
                    title="Edit category"
                    style={{ padding: "0.25rem 0.5rem" }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="btn btn-ghost btn-sm"
                    title="Delete category"
                    style={{ padding: "0.25rem 0.5rem", color: "var(--color-danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: "1.75rem",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  borderRadius: "0.5rem",
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: "0.8125rem",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Confectionery & Biscuits"
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. confectionery-biscuits"
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.875rem",
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Department notes or wholesale packaging details..."
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.875rem",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              {editingCategory && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    id="cat-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <label htmlFor="cat-active" style={{ fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                    Active and available for products
                  </label>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPending}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
