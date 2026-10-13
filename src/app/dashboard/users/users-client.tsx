"use client";

import React, { useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { createUser, updateUser, toggleUserStatus } from "@/app/actions/user-actions";
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Boxes,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Power,
  X,
  Loader2,
} from "lucide-react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    createdSales: number;
    createdPurchases: number;
  };
}

interface UsersClientProps {
  initialUsers: UserItem[];
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; icon: any }> = {
  ADMIN: { label: "Owner / Admin", color: "#4f46e5", bg: "#eef2ff", icon: ShieldCheck },
  MANAGER: { label: "General Manager", color: "#059669", bg: "#ecfdf5", icon: UserCheck },
  SALES_STAFF: { label: "Sales Staff", color: "#d97706", bg: "#fffbeb", icon: ShoppingBag },
  INVENTORY_STAFF: { label: "Inventory Staff", color: "#7c3aed", bg: "#f5f3ff", icon: Boxes },
};

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: Role;
    password: string;
  }>({
    name: "",
    email: "",
    phone: "",
    role: Role.SALES_STAFF,
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: Role.SALES_STAFF,
      password: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      password: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      if (editingUser) {
        const res = await updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          password: formData.password || undefined,
        });

        if (res.error) {
          setFormError(res.error);
        } else {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === editingUser.id
                ? {
                    ...u,
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone || null,
                  }
                : u
            )
          );
          setIsModalOpen(false);
        }
      } else {
        if (!formData.password || formData.password.length < 6) {
          setFormError("Password must be at least 6 characters.");
          return;
        }

        const res = await createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          password: formData.password,
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.user) {
          setUsers((prev) => [
            {
              ...res.user!,
              createdAt: new Date(res.user!.createdAt),
              updatedAt: new Date(res.user!.updatedAt),
              _count: { createdSales: 0, createdPurchases: 0 },
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
      const res = await toggleUserStatus(id);
      if (res.error) {
        alert(res.error);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: res.isActive! } : u))
        );
      }
    });
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === Role.ADMIN).length;

  return (
    <div className="page-container">
      {/* Page Header */}
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Users & Access Control</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Manage staff accounts, assign operational roles, and enforce security policies.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          id="btn-add-user"
        >
          <UserPlus size={16} />
          <span>Add New Staff</span>
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
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Total Staff</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.25rem" }}>{totalUsers}</div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>Active Accounts</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-success)", marginTop: "0.25rem" }}>
            {activeUsers}
          </div>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>System Admins</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)", marginTop: "0.25rem" }}>
            {adminCount}
          </div>
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
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
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
          {["ALL", Role.ADMIN, Role.MANAGER, Role.SALES_STAFF, Role.INVENTORY_STAFF].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: roleFilter === r ? "var(--color-primary)" : "white",
                color: roleFilter === r ? "white" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {r === "ALL" ? "All Roles" : ROLE_CONFIG[r as Role]?.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600 }}>Staff Member</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Contact</th>
                <th style={{ padding: "0.875rem 1rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.875rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const Icon = roleConfig.icon;
                  return (
                    <tr key={user.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: roleConfig.bg,
                              color: roleConfig.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              flexShrink: 0,
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{user.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.25rem 0.625rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: roleConfig.bg,
                            color: roleConfig.color,
                          }}
                        >
                          <Icon size={12} />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                        {user.phone || "—"}
                      </td>
                      <td style={{ padding: "1rem 1rem" }}>
                        {user.isActive ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.375rem",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              background: "#d1fae5",
                              color: "#065f46",
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "0.375rem",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              background: "#fee2e2",
                              color: "#991b1b",
                            }}
                          >
                            <XCircle size={12} />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            onClick={() => openEditModal(user)}
                            className="btn btn-ghost btn-sm"
                            title="Edit user details"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleToggle(user.id)}
                            className="btn btn-ghost btn-sm"
                            title={user.isActive ? "Deactivate user" : "Activate user"}
                            style={{ color: user.isActive ? "var(--color-danger)" : "var(--color-success)" }}
                          >
                            <Power size={14} />
                            <span>{user.isActive ? "Disable" : "Enable"}</span>
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

      {/* Add / Edit User Modal */}
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
              maxWidth: 480,
              padding: "1.75rem",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                {editingUser ? "Edit Staff Account" : "Create New Staff Account"}
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

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Anil Thapa"
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
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. anil@shreeganesh.com.np"
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
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9841234567"
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
                  Operational Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.875rem",
                    outline: "none",
                    background: "white",
                  }}
                >
                  <option value={Role.ADMIN}>Owner / Admin (Full Access)</option>
                  <option value={Role.MANAGER}>General Manager (Operational Access)</option>
                  <option value={Role.SALES_STAFF}>Sales Staff (Billing & Collections)</option>
                  <option value={Role.INVENTORY_STAFF}>Inventory Staff (Warehouse & Goods Receipt)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  {editingUser ? "Change Password (leave blank to keep current)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••••••" : "Minimum 6 characters"}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
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
                  <span>{editingUser ? "Update Staff" : "Create Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
