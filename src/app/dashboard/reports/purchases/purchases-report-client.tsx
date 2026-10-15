"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  ShoppingCart,
  Download,
  Printer,
  Filter,
  DollarSign,
  Truck,
  TrendingUp,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface PurchaseReportItem {
  id: string;
  invoiceNumber: string;
  purchaseDate: Date;
  supplier: { id: string; name: string; companyName: string | null };
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

interface PurchasesReportClientProps {
  initialPurchases: PurchaseReportItem[];
  suppliers: { id: string; name: string }[];
}

export default function PurchasesReportClient({
  initialPurchases,
  suppliers,
}: PurchasesReportClientProps) {
  const [purchases] = useState<PurchaseReportItem[]>(initialPurchases);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const pDate = new Date(p.purchaseDate).toISOString().split("T")[0];
      if (startDate && pDate < startDate) return false;
      if (endDate && pDate > endDate) return false;
      if (selectedSupplierId !== "ALL" && p.supplier.id !== selectedSupplierId) return false;
      if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.supplier.name.toLowerCase().includes(q) ||
          (p.supplier.companyName ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [purchases, startDate, endDate, selectedSupplierId, selectedStatus, search]);

  const metrics = useMemo(() => {
    const totalInvoices = filtered.length;
    const totalAmount = filtered.reduce((acc, p) => acc + p.total, 0);
    const totalPaid = filtered.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalDue = filtered.reduce((acc, p) => acc + p.dueAmount, 0);
    const totalTax = filtered.reduce((acc, p) => acc + p.tax, 0);

    return { totalInvoices, totalAmount, totalPaid, totalDue, totalTax };
  }, [filtered]);

  // Aggregate by date for trend
  const trendData = useMemo(() => {
    const dateMap: Record<string, { date: string; amount: number; paid: number }> = {};
    filtered.forEach((p) => {
      const d = formatDate(p.purchaseDate);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, amount: 0, paid: 0 };
      }
      dateMap[d].amount += p.total;
      dateMap[d].paid += p.paidAmount;
    });
    return Object.values(dateMap).slice(-15);
  }, [filtered]);

  const handleExportCSV = () => {
    const headers = [
      "Purchase Invoice #",
      "Date",
      "Supplier",
      "Company",
      "Status",
      "Subtotal",
      "Tax",
      "Total (NPR)",
      "Paid Amount",
      "Due Amount",
    ];
    const rows = filtered.map((p) => [
      p.invoiceNumber,
      formatDate(p.purchaseDate),
      p.supplier.name,
      p.supplier.companyName || "",
      p.status,
      p.subtotal,
      p.tax,
      p.total,
      p.paidAmount,
      p.dueAmount,
    ]);
    exportToCSV("Purchases_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="text-primary" size={24} />
            Purchases & Procurement Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Review supplier purchase orders, inbound goods costs, and payable dues.
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

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          <Filter size={14} />
          Filters & Parameters
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
            <label className="text-xs text-muted-foreground block mb-1">Supplier</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Procurement</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(metrics.totalAmount)}</p>
          <span className="text-[11px] text-muted-foreground">{metrics.totalInvoices} invoices</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Paid to Suppliers</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <span className="text-[11px] text-muted-foreground">Settled procurement</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Payable Dues</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(metrics.totalDue)}
          </p>
          <span className="text-[11px] text-muted-foreground">Pending supplier payment</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Tax Incurred</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(metrics.totalTax)}</p>
          <span className="text-[11px] text-muted-foreground">Input tax credit</span>
        </div>
      </div>

      {/* Purchases Trend Chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Purchases Timeline & Payments</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
              />
              <Bar dataKey="amount" name="Total Invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Purchases Breakdown ({filtered.length})
          </h3>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1 w-64">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search table..."
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
                <th className="px-3 py-2.5">Invoice #</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5 text-right">Subtotal</th>
                <th className="px-3 py-2.5 text-right">Tax</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Due</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                    No purchase invoices match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 font-mono font-medium text-foreground">{p.invoiceNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(p.purchaseDate)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{p.supplier.name}</div>
                      {p.supplier.companyName && (
                        <div className="text-[11px] text-muted-foreground">{p.supplier.companyName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.subtotal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.tax)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(p.total)}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(p.dueAmount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === "POSTED"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
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
