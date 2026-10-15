"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  Users,
  Download,
  Printer,
  Search,
  AlertCircle,
  Phone,
  Building,
  CreditCard,
  DollarSign,
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

export interface CustomerDueItem {
  id: string;
  name: string;
  shopName: string | null;
  phone: string;
  address: string | null;
  creditLimit: number;
  currentBalance: number;
}

interface CustomerDuesClientProps {
  initialCustomers: CustomerDueItem[];
}

export default function CustomerDuesClient({ initialCustomers }: CustomerDuesClientProps) {
  const [customers] = useState<CustomerDueItem[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [onlyWithDues, setOnlyWithDues] = useState(true);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (onlyWithDues && c.currentBalance <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          (c.shopName ?? "").toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [customers, search, onlyWithDues]);

  const metrics = useMemo(() => {
    const totalDues = customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
    const customersWithDuesCount = customers.filter((c) => c.currentBalance > 0).length;
    const overCreditLimitCount = customers.filter(
      (c) => c.creditLimit > 0 && c.currentBalance > c.creditLimit
    ).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);

    return { totalDues, customersWithDuesCount, overCreditLimitCount, totalCreditLimit };
  }, [customers]);

  // Top 10 highest dues customers for chart
  const topDuesData = useMemo(() => {
    return [...customers]
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 10)
      .map((c) => ({
        name: c.shopName ? `${c.name} (${c.shopName})` : c.name,
        due: c.currentBalance,
        limit: c.creditLimit,
      }));
  }, [customers]);

  const handleExportCSV = () => {
    const headers = [
      "Customer Name",
      "Shop Name",
      "Phone",
      "Address",
      "Credit Limit (NPR)",
      "Outstanding Due (NPR)",
      "Status",
    ];
    const rows = filtered.map((c) => [
      c.name,
      c.shopName || "",
      c.phone,
      c.address || "",
      c.creditLimit,
      c.currentBalance,
      c.creditLimit > 0 && c.currentBalance > c.creditLimit ? "EXCEEDED LIMIT" : "NORMAL",
    ]);
    exportToCSV("Customer_Dues_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="text-rose-500" size={24} />
            Customer Outstanding Dues Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Track customer receivables, credit limit exposure, and pending balances.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Receivables Due</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(metrics.totalDues)}
          </p>
          <span className="text-[11px] text-muted-foreground">Across all retail accounts</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Customers In Debt</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {metrics.customersWithDuesCount}
          </p>
          <span className="text-[11px] text-muted-foreground">With unpaid balance</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Over Credit Limit</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.overCreditLimitCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Credit threshold breach</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Authorized Credit</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(metrics.totalCreditLimit)}
          </p>
          <span className="text-[11px] text-muted-foreground">Total credit extended</span>
        </div>
      </div>

      {/* Top Dues Chart */}
      {topDuesData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Top 10 Customers with Highest Outstanding Dues (NPR)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDuesData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Bar dataKey="due" name="Outstanding Balance" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter Toolbar & Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Accounts ({filtered.length})
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithDues}
                onChange={(e) => setOnlyWithDues(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              Show only accounts with dues
            </label>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1 w-full sm:w-64">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer, shop, phone..."
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
                <th className="px-3 py-2.5">Customer Name</th>
                <th className="px-3 py-2.5">Shop / Business</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Address</th>
                <th className="px-3 py-2.5 text-right">Credit Limit</th>
                <th className="px-3 py-2.5 text-right">Outstanding Due</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No customers match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isOver = c.creditLimit > 0 && c.currentBalance > c.creditLimit;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition">
                      <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.shopName || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">{c.phone}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.address || "—"}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : "None"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(c.currentBalance)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isOver ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500">
                            EXCEEDED LIMIT
                          </span>
                        ) : c.currentBalance > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                            DUE ACTIVE
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                            CLEAR
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
