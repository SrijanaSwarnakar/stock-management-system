"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface SaleReportItem {
  id: string;
  invoiceNumber: string;
  saleDate: Date;
  customer: { id: string; name: string; shopName: string | null };
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

interface SalesReportClientProps {
  initialSales: SaleReportItem[];
  customers: { id: string; name: string }[];
}

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

export default function SalesReportClient({
  initialSales,
  customers,
}: SalesReportClientProps) {
  const [sales] = useState<SaleReportItem[]>(initialSales);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const sDate = new Date(s.saleDate).toISOString().split("T")[0];
      if (startDate && sDate < startDate) return false;
      if (endDate && sDate > endDate) return false;
      if (selectedCustomerId !== "ALL" && s.customer.id !== selectedCustomerId) return false;
      if (selectedStatus !== "ALL" && s.status !== selectedStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          s.invoiceNumber.toLowerCase().includes(q) ||
          s.customer.name.toLowerCase().includes(q) ||
          (s.customer.shopName ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sales, startDate, endDate, selectedCustomerId, selectedStatus, search]);

  const metrics = useMemo(() => {
    const totalInvoices = filteredSales.length;
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalPaid = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
    const totalDue = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);
    const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
    const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    return { totalInvoices, totalRevenue, totalPaid, totalDue, totalDiscount, avgInvoice };
  }, [filteredSales]);

  // Aggregate by date for trend chart
  const trendData = useMemo(() => {
    const dateMap: Record<string, { date: string; revenue: number; paid: number }> = {};
    filteredSales.forEach((s) => {
      const d = formatDate(s.saleDate);
      if (!dateMap[d]) {
        dateMap[d] = { date: d, revenue: 0, paid: 0 };
      }
      dateMap[d].revenue += s.total;
      dateMap[d].paid += s.paidAmount;
    });
    return Object.values(dateMap).slice(-15);
  }, [filteredSales]);

  // Status breakdown for Pie chart
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const handleExportCSV = () => {
    const headers = [
      "Invoice Number",
      "Date",
      "Customer",
      "Shop Name",
      "Status",
      "Subtotal",
      "Discount",
      "Total (NPR)",
      "Paid Amount",
      "Due Amount",
    ];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      formatDate(s.saleDate),
      s.customer.name,
      s.customer.shopName || "",
      s.status,
      s.subtotal,
      s.discount,
      s.total,
      s.paidAmount,
      s.dueAmount,
    ]);
    exportToCSV("Sales_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            Sales Performance Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze wholesale turnover, collection trends, and invoice settlements.
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
          Filters & Date Range
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
            <label className="text-xs text-muted-foreground block mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              <option value="PARTIAL">PARTIAL</option>
              <option value="PAID">PAID</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Revenue</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(metrics.totalRevenue)}</p>
          <span className="text-[11px] text-muted-foreground">{metrics.totalInvoices} invoices</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Collected Amount</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {metrics.totalRevenue > 0
              ? `${Math.round((metrics.totalPaid / metrics.totalRevenue) * 100)}% settled`
              : "0%"}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Outstanding Due</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(metrics.totalDue)}
          </p>
          <span className="text-[11px] text-muted-foreground">Pending collection</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Discounts</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(metrics.totalDiscount)}
          </p>
          <span className="text-[11px] text-muted-foreground">Promotional credit</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground font-medium uppercase">Average Invoice</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(metrics.avgInvoice)}</p>
          <span className="text-[11px] text-muted-foreground">Per order size</span>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Sales Revenue & Collections Timeline</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="paid" name="Collected" stroke="#10b981" fillOpacity={1} fill="url(#paidGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-foreground mb-2">Invoice Settlement Status</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Distribution of {filteredSales.length} invoice records
          </p>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sales Breakdown ({filteredSales.length})
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
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5 text-right">Subtotal</th>
                <th className="px-3 py-2.5 text-right">Discount</th>
                <th className="px-3 py-2.5 text-right">Net Total</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Due</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                    No sales invoices match the current filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 font-mono font-medium text-foreground">{s.invoiceNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(s.saleDate)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{s.customer.name}</div>
                      {s.customer.shopName && (
                        <div className="text-[11px] text-muted-foreground">{s.customer.shopName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(s.subtotal)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(s.discount)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(s.total)}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(s.dueAmount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : s.status === "PARTIAL"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {s.status}
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
