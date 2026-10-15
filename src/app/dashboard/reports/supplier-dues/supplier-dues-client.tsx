"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  Truck,
  Download,
  Printer,
  Search,
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

export interface SupplierDueItem {
  id: string;
  name: string;
  companyName: string | null;
  phone: string;
  address: string | null;
  panVatNumber: string | null;
  currentBalance: number;
}

interface SupplierDuesClientProps {
  initialSuppliers: SupplierDueItem[];
}

export default function SupplierDuesClient({ initialSuppliers }: SupplierDuesClientProps) {
  const [suppliers] = useState<SupplierDueItem[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [onlyWithDues, setOnlyWithDues] = useState(true);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (onlyWithDues && s.currentBalance <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          s.name.toLowerCase().includes(q) ||
          (s.companyName ?? "").toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.panVatNumber ?? "").includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [suppliers, search, onlyWithDues]);

  const metrics = useMemo(() => {
    const totalPayables = suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0);
    const suppliersWithDuesCount = suppliers.filter((s) => s.currentBalance > 0).length;
    const totalSuppliersCount = suppliers.length;

    return { totalPayables, suppliersWithDuesCount, totalSuppliersCount };
  }, [suppliers]);

  // Top payables chart
  const topPayablesData = useMemo(() => {
    return [...suppliers]
      .filter((s) => s.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 10)
      .map((s) => ({
        name: s.companyName ? `${s.name} (${s.companyName})` : s.name,
        due: s.currentBalance,
      }));
  }, [suppliers]);

  const handleExportCSV = () => {
    const headers = [
      "Supplier Name",
      "Company Name",
      "PAN Number",
      "Phone",
      "Address",
      "Payable Due (NPR)",
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.companyName || "",
      s.panVatNumber || "",
      s.phone,
      s.address || "",
      s.currentBalance,
    ]);
    exportToCSV("Supplier_Dues_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="text-amber-500" size={24} />
            Supplier Accounts Payable Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Track business payables, vendor dues, and procurement liability.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Accounts Payable</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(metrics.totalPayables)}
          </p>
          <span className="text-[11px] text-muted-foreground">Total owed to vendors</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Vendors Awaiting Payment</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {metrics.suppliersWithDuesCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Suppliers with non-zero dues</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Active Suppliers</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {metrics.totalSuppliersCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Registered trade partners</span>
        </div>
      </div>

      {/* Top Payables Chart */}
      {topPayablesData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Top 10 Suppliers with Highest Payables (NPR)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPayablesData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Bar dataKey="due" name="Payable Due" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
              Supplier Accounts ({filtered.length})
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithDues}
                onChange={(e) => setOnlyWithDues(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              Show only suppliers with outstanding dues
            </label>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1 w-full sm:w-64">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendor, PAN, phone..."
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
                <th className="px-3 py-2.5">Supplier Name</th>
                <th className="px-3 py-2.5">Company / Firm</th>
                <th className="px-3 py-2.5">PAN #</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Address</th>
                <th className="px-3 py-2.5 text-right">Payable Balance</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No suppliers match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.companyName || "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{s.panVatNumber || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">{s.phone}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.address || "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(s.currentBalance)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {s.currentBalance > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                          PAYABLE DUE
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                          SETTLED
                        </span>
                      )}
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
