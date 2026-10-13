"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  Truck,
  AlertTriangle,
  ArrowRight,
  Store,
  CreditCard,
  Receipt,
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
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

// ─── Mock data (replaced with real DB queries in Phase 10) ───────────────────
const salesData = [
  { month: "May",  sales: 284000, purchases: 198000, profit: 86000 },
  { month: "Jun",  sales: 312000, purchases: 220000, profit: 92000 },
  { month: "Jul",  sales: 295000, purchases: 205000, profit: 90000 },
  { month: "Aug",  sales: 378000, purchases: 258000, profit: 120000 },
  { month: "Sep",  sales: 342000, purchases: 232000, profit: 110000 },
  { month: "Oct",  sales: 415000, purchases: 275000, profit: 140000 },
];

const topProducts = [
  { name: "Wai Wai Noodles", sold: 1240, revenue: 62000 },
  { name: "Coca-Cola 2L",    sold: 980,  revenue: 58800 },
  { name: "Lux Soap (6pk)",  sold: 720,  revenue: 36000 },
  { name: "Dairy Fresh Milk",sold: 680,  revenue: 40800 },
  { name: "Colgate 200g",    sold: 540,  revenue: 27000 },
];

const categoryRevenue = [
  { name: "Food & Groceries", value: 38, color: "#6366f1" },
  { name: "Beverages",        value: 22, color: "#10b981" },
  { name: "Personal Care",    value: 18, color: "#f59e0b" },
  { name: "Dairy Products",   value: 14, color: "#3b82f6" },
  { name: "Others",           value: 8,  color: "#8b5cf6" },
];

const lowStockProducts = [
  { name: "Surf Excel 1kg",   stock: 5,  unit: "pcs",   threshold: 20 },
  { name: "Nescafe 200g",     stock: 3,  unit: "jars",  threshold: 15 },
  { name: "Dettol Soap 75g",  stock: 8,  unit: "pcs",   threshold: 25 },
  { name: "Ariel 500g",       stock: 2,  unit: "pcs",   threshold: 10 },
];

const recentSales = [
  { id: "SINV-2026-000042", customer: "Ram Store",       amount: 28500,  status: "POSTED",  date: "13/10/2026" },
  { id: "SINV-2026-000041", customer: "Shyam Traders",   amount: 15200,  status: "PARTIAL", date: "12/10/2026" },
  { id: "SINV-2026-000040", customer: "Krishna Mart",    amount: 42000,  status: "POSTED",  date: "12/10/2026" },
  { id: "SINV-2026-000039", customer: "Laxmi Stores",    amount: 8900,   status: "PAID",    date: "11/10/2026" },
  { id: "SINV-2026-000038", customer: "Ganesh Wholesale",amount: 63200,  status: "POSTED",  date: "11/10/2026" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  POSTED:   { bg: "#d1fae5", color: "#065f46" },
  PARTIAL:  { bg: "#fef3c7", color: "#92400e" },
  PAID:     { bg: "#d1fae5", color: "#065f46" },
  DRAFT:    { bg: "#f3f4f6", color: "#4b5563" },
  CANCELLED:{ bg: "#fee2e2", color: "#991b1b" },
};

function formatTooltipValue(value: any) {
  const num = typeof value === "number" ? value : Number(value) || 0;
  return `NPR ${num.toLocaleString("en-NP")}`;
}

export default function DashboardPage() {
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
        title="Dashboard"
        subtitle={currentDate ? `Overview for ${currentDate}` : "Business overview & live metrics"}
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
          title="Today's Sales"
          value={formatCurrency(415000)}
          subtitle="vs NPR 342,000 last month"
          icon={<Store size={18} />}
          gradient="#6366f1, #4f46e5"
          trend={{ value: 21.3, label: "vs last month" }}
        />
        <StatCard
          title="Total Receivables"
          value={formatCurrency(1284500)}
          subtitle="Outstanding from customers"
          icon={<CreditCard size={18} />}
          gradient="#10b981, #059669"
          trend={{ value: -5.2, label: "vs last month" }}
        />
        <StatCard
          title="Total Payables"
          value={formatCurrency(687200)}
          subtitle="Outstanding to suppliers"
          icon={<Truck size={18} />}
          gradient="#f59e0b, #d97706"
        />
        <StatCard
          title="Monthly Profit"
          value={formatCurrency(140000)}
          subtitle="Gross profit, Oct 2026"
          icon={<TrendingUp size={18} />}
          gradient="#8b5cf6, #7c3aed"
          trend={{ value: 27.3, label: "vs last month" }}
        />
        <StatCard
          title="Total Products"
          value="248"
          subtitle="12 low stock, 4 out of stock"
          icon={<Package size={18} />}
        />
        <StatCard
          title="Active Customers"
          value="86"
          subtitle="3 new this month"
          icon={<Users size={18} />}
        />
        <StatCard
          title="Active Suppliers"
          value="34"
          subtitle="2 new this month"
          icon={<Truck size={18} />}
        />
        <StatCard
          title="This Month Expenses"
          value={formatCurrency(28500)}
          subtitle="Operating costs, Oct 2026"
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
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Revenue vs Purchases</h2>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                Last 6 months comparison
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              {[
                { label: "Sales", color: "#6366f1" },
                { label: "Purchases", color: "#10b981" },
                { label: "Profit", color: "#f59e0b" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "0.8125rem" }}
              />
              <Area type="monotone" dataKey="sales"     stroke="#6366f1" strokeWidth={2} fill="url(#salesGrad)"    name="Sales" />
              <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} fill="url(#purchaseGrad)" name="Purchases" />
              <Area type="monotone" dataKey="profit"    stroke="#f59e0b" strokeWidth={2} fill="url(#profitGrad)"   name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Revenue Pie */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>Revenue by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryRevenue}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryRevenue.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value}%`, "Share"]}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: "0.8125rem" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginTop: "0.5rem" }}>
            {categoryRevenue.map((cat) => (
              <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{cat.name}</span>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Recent Sales */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Recent Sales</h2>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => {
                  const sc = STATUS_COLORS[sale.status] ?? STATUS_COLORS.DRAFT;
                  return (
                    <tr key={sale.id}>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--color-primary)", fontWeight: 600 }}>
                          {sale.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{sale.customer}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(sale.amount)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {sale.status.charAt(0) + sale.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>{sale.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Low Stock Alerts</h2>
          </div>
          <div style={{ padding: "0.5rem 0" }}>
            {lowStockProducts.map((p) => (
              <div
                key={p.name}
                style={{
                  padding: "0.75rem 1.25rem",
                  borderBottom: "1px solid var(--color-border-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500 }}>{p.name}</p>
                  <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Min: {p.threshold} {p.unit}
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
            ))}
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
                View all inventory <ArrowRight size={14} />
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
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Top Selling Products — October 2026</h2>
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

      {/* Disclaimer */}
      <p
        style={{
          marginTop: "1.5rem",
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          textAlign: "center",
        }}
      >
        📊 Dashboard data is illustrative until Phase 10 connects real database queries.
      </p>
    </div>
  );
}
