"use client";

import React from "react";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Truck,
  ArrowRight,
  Store,
  CreditCard,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader, StatCard } from "@/components/ui/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface DashboardClientProps {
  metrics: {
    totalRevenue: number;
    totalReceivables: number;
    totalPayables: number;
    totalExpenses: number;
    estimatedGrossProfit: number;
    productsCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    customersCount: number;
    suppliersCount: number;
  };
  recentSales: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    shopName: string | null;
    amount: number;
    status: string;
    date: Date;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
    unit: string;
    threshold: number;
  }[];
  salesTrend: {
    month: string;
    sales: number;
    purchases: number;
    profit: number;
  }[];
  categoryRevenue: {
    name: string;
    value: number;
    color: string;
  }[];
  topProducts: {
    name: string;
    sold: number;
    revenue: number;
  }[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  POSTED: { bg: "#d1fae5", color: "#065f46" },
  PARTIAL: { bg: "#fef3c7", color: "#92400e" },
  PAID: { bg: "#d1fae5", color: "#065f46" },
  DRAFT: { bg: "#f3f4f6", color: "#4b5563" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
};

export default function DashboardClient({
  metrics,
  recentSales,
  lowStockProducts,
  salesTrend,
  categoryRevenue,
  topProducts,
}: DashboardClientProps) {
  const [currentDate, setCurrentDate] = React.useState<string>("");

  React.useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div className="page-container">
      <PageHeader
        title="Wholesale Operations Dashboard"
        subtitle={currentDate ? `Overview for ${currentDate} • Live Business Metrics` : "Business overview & live metrics"}
      />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          title="Total Sales Turnover"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle="All posted wholesale orders"
          icon={<Store size={18} />}
          gradient="#6366f1, #4f46e5"
        />
        <StatCard
          title="Customer Receivables"
          value={formatCurrency(metrics.totalReceivables)}
          subtitle="Outstanding customer debt"
          icon={<CreditCard size={18} />}
          gradient="#10b981, #059669"
        />
        <StatCard
          title="Supplier Payables"
          value={formatCurrency(metrics.totalPayables)}
          subtitle="Outstanding vendor dues"
          icon={<Truck size={18} />}
          gradient="#f59e0b, #d97706"
        />
        <StatCard
          title="Gross Trading Margin"
          value={formatCurrency(metrics.estimatedGrossProfit)}
          subtitle="Estimated trading surplus"
          icon={<TrendingUp size={18} />}
          gradient="#8b5cf6, #7c3aed"
        />
        <StatCard
          title="Total SKUs"
          value={String(metrics.productsCount)}
          subtitle={`${metrics.lowStockCount} low stock, ${metrics.outOfStockCount} out of stock`}
          icon={<Package size={18} />}
        />
        <StatCard
          title="Active Customers"
          value={String(metrics.customersCount)}
          subtitle="Registered retail shops"
          icon={<Users size={18} />}
        />
        <StatCard
          title="Trade Suppliers"
          value={String(metrics.suppliersCount)}
          subtitle="Wholesale vendors"
          icon={<Truck size={18} />}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpenses)}
          subtitle="Disbursed overheads"
          icon={<Receipt size={18} />}
        />
      </div>

      {/* ── Main Charts Row ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* Sales vs Purchases trend */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Revenue vs Purchases Timeline</h2>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                Monthly volume comparison (NPR)
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              {[
                { label: "Sales", color: "#6366f1" },
                { label: "Purchases", color: "#10b981" },
                { label: "Profit", color: "#f59e0b" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: "0.8125rem" }}
              />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#gSales)" name="Sales" />
              <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gPurchases)" name="Purchases" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category revenue pie */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Category Distribution</h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Share of catalog turnover
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryRevenue}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryRevenue.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: "0.5rem" }}>
            {categoryRevenue.map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ color: "var(--color-text-primary)" }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lower Row: Recent Sales & Low Stock Alerts ─────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Recent Invoices */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Recent Sales Invoices</h2>
            <Link
              href="/dashboard/sales"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.8125rem",
                color: "var(--color-primary)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem", color: "#9ca3af" }}>
                      No recent sales invoices.
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.75rem" }}>{sale.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{sale.customerName}</div>
                        {sale.shopName && <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{sale.shopName}</div>}
                      </td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>{formatDate(sale.date)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurrency(sale.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className="badge"
                          style={{
                            background: STATUS_COLORS[sale.status]?.bg ?? "#f3f4f6",
                            color: STATUS_COLORS[sale.status]?.color ?? "#374151",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                          }}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Low Stock Warnings</h2>
            </div>
            <span
              className="badge"
              style={{ background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: "0.6875rem" }}
            >
              {lowStockProducts.length} items
            </span>
          </div>
          <div style={{ padding: "0.5rem 0" }}>
            {lowStockProducts.length === 0 ? (
              <p style={{ textAlign: "center", padding: "1.5rem", fontSize: "0.8125rem", color: "#9ca3af" }}>
                All inventory items are currently above safety thresholds.
              </p>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.625rem 1.25rem",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {p.name}
                    </p>
                    <p style={{ margin: "0.125rem 0 0", fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                      Threshold: {p.threshold} {p.unit}
                    </p>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: p.stock <= 5 ? "#fee2e2" : "#fef3c7",
                      color: p.stock <= 5 ? "#991b1b" : "#92400e",
                      fontWeight: 700,
                    }}
                  >
                    {p.stock} {p.unit}
                  </span>
                </div>
              ))
            )}
            <div style={{ padding: "0.75rem 1.25rem" }}>
              <Link
                href="/dashboard/inventory"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.375rem",
                  fontSize: "0.8125rem",
                  color: "var(--color-primary)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                View full warehouse inventory <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Products ───────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Top Products Turnover</h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={topProducts} margin={{ top: 12, right: 24, left: 10, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={130} />
            <Tooltip
              formatter={(value: any) => [`NPR ${(Number(value) || 0).toLocaleString("en-NP")}`, "Revenue"]}
              contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: "0.8125rem" }}
            />
            <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
