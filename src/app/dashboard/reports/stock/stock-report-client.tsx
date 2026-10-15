"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  Warehouse,
  Download,
  Printer,
  Filter,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Search,
  Package,
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

export interface StockReportItem {
  id: string;
  name: string;
  sku: string;
  category: { id: string; name: string };
  baseUnit: { symbol: string };
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  reorderThreshold: number;
}

interface StockReportClientProps {
  initialProducts: StockReportItem[];
  categories: { id: string; name: string }[];
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function StockReportClient({
  initialProducts,
  categories,
}: StockReportClientProps) {
  const [products] = useState<StockReportItem[]>(initialProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryId !== "ALL" && p.category.id !== selectedCategoryId) return false;

      const isOutOfStock = p.currentStock <= 0;
      const isLowStock = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;

      if (stockStatusFilter === "OUT_OF_STOCK" && !isOutOfStock) return false;
      if (stockStatusFilter === "LOW_STOCK" && !isLowStock) return false;
      if (stockStatusFilter === "ADEQUATE" && (isOutOfStock || isLowStock)) return false;

      if (search) {
        const q = search.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, selectedCategoryId, stockStatusFilter, search]);

  const metrics = useMemo(() => {
    const totalSKUs = filtered.length;
    const totalItems = filtered.reduce((acc, p) => acc + Math.max(0, p.currentStock), 0);
    const costValuation = filtered.reduce(
      (acc, p) => acc + Math.max(0, p.currentStock) * p.costPrice,
      0
    );
    const retailValuation = filtered.reduce(
      (acc, p) => acc + Math.max(0, p.currentStock) * p.sellingPrice,
      0
    );
    const potentialMargin = retailValuation - costValuation;
    const potentialMarginPercent =
      retailValuation > 0 ? (potentialMargin / retailValuation) * 100 : 0;

    const lowStockCount = filtered.filter(
      (p) => p.currentStock > 0 && p.currentStock <= p.reorderThreshold
    ).length;
    const outOfStockCount = filtered.filter((p) => p.currentStock <= 0).length;

    return {
      totalSKUs,
      totalItems,
      costValuation,
      retailValuation,
      potentialMargin,
      potentialMarginPercent,
      lowStockCount,
      outOfStockCount,
    };
  }, [filtered]);

  // Category valuation bar chart
  const categoryBarData = useMemo(() => {
    const catMap: Record<string, { category: string; cost: number; retail: number }> = {};
    filtered.forEach((p) => {
      const cName = p.category.name;
      if (!catMap[cName]) {
        catMap[cName] = { category: cName, cost: 0, retail: 0 };
      }
      catMap[cName].cost += Math.max(0, p.currentStock) * p.costPrice;
      catMap[cName].retail += Math.max(0, p.currentStock) * p.sellingPrice;
    });
    return Object.values(catMap).slice(0, 10);
  }, [filtered]);

  // Stock health status pie chart
  const healthPieData = useMemo(() => {
    let adequate = 0;
    let low = 0;
    let out = 0;

    filtered.forEach((p) => {
      if (p.currentStock <= 0) out++;
      else if (p.currentStock <= p.reorderThreshold) low++;
      else adequate++;
    });

    return [
      { name: "Adequate Stock", value: adequate },
      { name: "Low Stock Alert", value: low },
      { name: "Out of Stock", value: out },
    ];
  }, [filtered]);

  const handleExportCSV = () => {
    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "Current Stock",
      "Unit",
      "Cost Price",
      "Selling Price",
      "Total Cost Valuation",
      "Total Retail Valuation",
      "Reorder Alert Level",
    ];
    const rows = filtered.map((p) => [
      p.sku,
      p.name,
      p.category.name,
      p.currentStock,
      p.baseUnit.symbol,
      p.costPrice,
      p.sellingPrice,
      p.currentStock * p.costPrice,
      p.currentStock * p.sellingPrice,
      p.reorderThreshold,
    ]);
    exportToCSV("Stock_Valuation_Report", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="text-primary" size={24} />
            Stock & Inventory Valuation Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor asset valuation at weighted-average cost vs retail prices and inventory health.
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
          Inventory Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <label className="text-xs text-muted-foreground block mb-1">Stock Level Status</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="ADEQUATE">Adequate / In Stock</option>
              <option value="LOW_STOCK">Low Stock (At or Below Reorder Level)</option>
              <option value="OUT_OF_STOCK">Out of Stock (Zero or Negative)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Product Search</label>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5">
              <Search size={14} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Cost Valuation</p>
          <p className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(metrics.costValuation)}
          </p>
          <span className="text-[11px] text-muted-foreground">Asset cost in warehouse</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Retail Valuation</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(metrics.retailValuation)}
          </p>
          <span className="text-[11px] text-muted-foreground">At selling price</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Potential Profit</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.potentialMargin)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {metrics.potentialMarginPercent.toFixed(1)}% gross margin
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground font-medium uppercase">Low Stock SKUs</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.lowStockCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Needs reordering</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground font-medium uppercase">Out of Stock</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {metrics.outOfStockCount}
          </p>
          <span className="text-[11px] text-muted-foreground">Zero inventory</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Valuation by Category (NPR)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Bar dataKey="cost" name="Cost Basis" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retail" name="Retail Basis" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-foreground mb-2">Inventory Stock Health</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Health of {filtered.length} products monitored
          </p>
        </div>
      </div>

      {/* Product Valuation Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Inventory Valuation Detail ({filtered.length} products)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Product Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5 text-center">Stock In Hand</th>
                <th className="px-3 py-2.5 text-right">Cost Price</th>
                <th className="px-3 py-2.5 text-right">Selling Price</th>
                <th className="px-3 py-2.5 text-right">Valuation (Cost)</th>
                <th className="px-3 py-2.5 text-right">Valuation (Retail)</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                    No products match the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOut = p.currentStock <= 0;
                  const isLow = p.currentStock > 0 && p.currentStock <= p.reorderThreshold;
                  const costTotal = Math.max(0, p.currentStock) * p.costPrice;
                  const retailTotal = Math.max(0, p.currentStock) * p.sellingPrice;

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{p.sku}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.category.name}</td>
                      <td className="px-3 py-2 text-center font-semibold text-foreground">
                        {p.currentStock.toFixed(2)} {p.baseUnit.symbol}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.costPrice)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(p.sellingPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(costTotal)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(retailTotal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isOut
                              ? "bg-rose-500/10 text-rose-500"
                              : isLow
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                        </span>
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
