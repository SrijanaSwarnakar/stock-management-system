"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import { PaymentMethod } from "@prisma/client";
import {
  Receipt,
  Download,
  Printer,
  Filter,
  DollarSign,
  TrendingDown,
  Search,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface ExpenseReportItem {
  id: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: Date;
  referenceNo: string | null;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
}

interface ExpensesReportClientProps {
  initialExpenses: ExpenseReportItem[];
  categories: { id: string; name: string }[];
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

export default function ExpensesReportClient({
  initialExpenses,
  categories,
}: ExpensesReportClientProps) {
  const [expenses] = useState<ExpenseReportItem[]>(initialExpenses);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const eDate = new Date(e.expenseDate).toISOString().split("T")[0];
      if (startDate && eDate < startDate) return false;
      if (endDate && eDate > endDate) return false;
      if (selectedCategoryId !== "ALL" && e.category.id !== selectedCategoryId) return false;
      if (selectedMethod !== "ALL" && e.paymentMethod !== selectedMethod) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          e.description.toLowerCase().includes(q) ||
          e.category.name.toLowerCase().includes(q) ||
          (e.referenceNo ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate, selectedCategoryId, selectedMethod, search]);

  const metrics = useMemo(() => {
    const totalAmount = filtered.reduce((acc, e) => acc + e.amount, 0);
    const count = filtered.length;

    // Top category
    const catMap: Record<string, number> = {};
    filtered.forEach((e) => {
      catMap[e.category.name] = (catMap[e.category.name] || 0) + e.amount;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0] ? sortedCats[0][0] : "None";

    // Cash vs Non-Cash
    const cashTotal = filtered
      .filter((e) => e.paymentMethod === PaymentMethod.CASH)
      .reduce((acc, e) => acc + e.amount, 0);
    const cashPercent = totalAmount > 0 ? (cashTotal / totalAmount) * 100 : 0;

    return { totalAmount, count, topCategory, cashPercent };
  }, [filtered]);

  // Chart: Category distribution
  const categoryPieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filtered.forEach((e) => {
      catMap[e.category.name] = (catMap[e.category.name] || 0) + e.amount;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Chart: Timeline trend
  const trendData = useMemo(() => {
    const dateMap: Record<string, { date: string; amount: number }> = {};
    filtered.forEach((e) => {
      const d = formatDate(e.expenseDate);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, amount: 0 };
      }
      dateMap[d].amount += e.amount;
    });
    return Object.values(dateMap).slice(-15);
  }, [filtered]);

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Category",
      "Description",
      "Amount (NPR)",
      "Payment Method",
      "Reference / Receipt #",
      "Entered By",
    ];
    const rows = filtered.map((e) => [
      formatDate(e.expenseDate),
      e.category.name,
      e.description,
      e.amount,
      e.paymentMethod,
      e.referenceNo || "",
      e.createdBy.name,
    ]);
    exportToCSV("Expenses_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="text-primary" size={24} />
            Operating Expenses Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor overhead spending, categorized business expenses, and disbursement channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerPrint}
            className="flex items-center gap-2 px-3 py-2 border border-border bg-card hover:bg-muted text-foreground text-xs font-medium rounded-lg transition"
          >
            <Printer size={15} />
            Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition shadow-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          <Filter size={14} />
          Expense Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Payment Methods</option>
              {Object.values(PaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {m.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Expenses</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(metrics.totalAmount)}
          </p>
          <span className="text-[11px] text-muted-foreground">{metrics.count} entries</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Top Expense Driver</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
            {metrics.topCategory}
          </p>
          <span className="text-[11px] text-muted-foreground">Highest allocation</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Cash Disbursements</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {metrics.cashPercent.toFixed(1)}%
          </p>
          <span className="text-[11px] text-muted-foreground">Paid via physical cash</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Digital / Banking</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {(100 - metrics.cashPercent).toFixed(1)}%
          </p>
          <span className="text-[11px] text-muted-foreground">Bank, eSewa, cheque</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Expense Disbursements (NPR)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Bar dataKey="amount" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-foreground mb-2">Category Spending Share</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Categorized overhead distribution
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Expense Records ({filtered.length})
          </h3>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1 w-64">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search description, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-foreground"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-center">Payment Method</th>
                <th className="px-3 py-2.5">Reference #</th>
                <th className="px-3 py-2.5">Entered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No expense records match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(e.expenseDate)}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{e.category.name}</td>
                    <td className="px-3 py-2 text-foreground">{e.description}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                        {e.paymentMethod.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">
                      {e.referenceNo || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{e.createdBy.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
