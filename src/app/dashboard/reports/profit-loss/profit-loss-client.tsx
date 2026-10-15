"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, triggerPrint } from "@/lib/export-utils";
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Receipt,
  Layers,
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

export interface SaleWithLines {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  saleDate: Date;
  lines: {
    qty: number;
    costPriceAtSale: number;
    totalPrice: number;
  }[];
}

export interface ReturnWithLines {
  id: string;
  totalAmount: number;
  returnDate: Date;
  lines: {
    qty: number;
    costPriceAtSale: number;
  }[];
}

export interface ExpenseItemPL {
  id: string;
  amount: number;
  expenseDate: Date;
  category: { id: string; name: string };
}

interface ProfitLossClientProps {
  sales: SaleWithLines[];
  returns: ReturnWithLines[];
  expenses: ExpenseItemPL[];
}

const EXPENSE_COLORS = ["#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#64748b"];

export default function ProfitLossClient({
  sales,
  returns,
  expenses,
}: ProfitLossClientProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter by date range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.saleDate).toISOString().split("T")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const d = new Date(r.returnDate).toISOString().split("T")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [returns, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.expenseDate).toISOString().split("T")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Financial calculations
  const pnl = useMemo(() => {
    // 1. Revenue
    const grossSales = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
    const discounts = filteredSales.reduce((sum, s) => sum + s.discount, 0);
    const returnCredits = filteredReturns.reduce((sum, r) => sum + r.totalAmount, 0);
    const netRevenue = grossSales - discounts - returnCredits;

    // 2. Cost of Goods Sold (COGS)
    const grossCOGS = filteredSales.reduce(
      (sum, s) => sum + s.lines.reduce((lSum, l) => lSum + l.qty * l.costPriceAtSale, 0),
      0
    );
    const returnCOGS = filteredReturns.reduce(
      (sum, r) => sum + r.lines.reduce((lSum, l) => lSum + l.qty * l.costPriceAtSale, 0),
      0
    );
    const netCOGS = Math.max(0, grossCOGS - returnCOGS);

    // 3. Gross Profit
    const grossProfit = netRevenue - netCOGS;
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // 4. Operating Expenses
    const expenseByCategory: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category.name;
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });
    const totalExpenses = Object.values(expenseByCategory).reduce((sum, a) => sum + a, 0);

    // 5. Net Profit
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      grossSales,
      discounts,
      returnCredits,
      netRevenue,
      grossCOGS,
      returnCOGS,
      netCOGS,
      grossProfit,
      grossMarginPercent,
      expenseByCategory,
      totalExpenses,
      netProfit,
      netMarginPercent,
    };
  }, [filteredSales, filteredReturns, filteredExpenses]);

  // Chart data
  const comparisonData = useMemo(() => {
    return [
      { name: "Net Revenue", amount: pnl.netRevenue, fill: "#3b82f6" },
      { name: "COGS", amount: pnl.netCOGS, fill: "#64748b" },
      { name: "Gross Profit", amount: pnl.grossProfit, fill: "#10b981" },
      { name: "Operating Expenses", amount: pnl.totalExpenses, fill: "#f59e0b" },
      { name: "Net Profit", amount: pnl.netProfit, fill: pnl.netProfit >= 0 ? "#10b981" : "#ef4444" },
    ];
  }, [pnl]);

  const expensePieData = useMemo(() => {
    return Object.entries(pnl.expenseByCategory).map(([name, value]) => ({ name, value }));
  }, [pnl.expenseByCategory]);

  const handleExportCSV = () => {
    const headers = ["Financial Statement Item", "Amount (NPR)"];
    const rows: (string | number)[][] = [
      ["Gross Sales", pnl.grossSales],
      ["Less: Trade Discounts", -pnl.discounts],
      ["Less: Customer Sales Returns", -pnl.returnCredits],
      ["NET TURNOVER / REVENUE", pnl.netRevenue],
      ["", ""],
      ["Cost of Goods Sold (COGS)", pnl.grossCOGS],
      ["Less: COGS of Returned Stock", -pnl.returnCOGS],
      ["NET COST OF GOODS SOLD", pnl.netCOGS],
      ["", ""],
      ["GROSS PROFIT", pnl.grossProfit],
      ["Gross Profit Margin %", `${pnl.grossMarginPercent.toFixed(2)}%`],
      ["", ""],
      ["OPERATING EXPENSES:", ""],
      ...Object.entries(pnl.expenseByCategory).map(([cat, amt]) => [`  - ${cat}`, amt]),
      ["TOTAL OPERATING EXPENSES", pnl.totalExpenses],
      ["", ""],
      ["NET OPERATING PROFIT / (LOSS)", pnl.netProfit],
      ["Net Profit Margin %", `${pnl.netMarginPercent.toFixed(2)}%`],
    ];
    exportToCSV("Profit_And_Loss_Statement", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={24} />
            Profit & Loss Statement (P&L)
          </h1>
          <p className="text-sm text-muted-foreground">
            Accurate trading margin analysis based on weighted-average COGS and operating expenses.
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
            Export Statement (CSV)
          </button>
        </div>
      </div>

      {/* Date Range Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          <Calendar size={14} />
          Accounting Period
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Net Turnover</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(pnl.netRevenue)}
          </p>
          <span className="text-[11px] text-muted-foreground">After returns & discounts</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Gross Profit</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(pnl.grossProfit)}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {pnl.grossMarginPercent.toFixed(1)}% gross margin
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Operating Expenses</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(pnl.totalExpenses)}
          </p>
          <span className="text-[11px] text-muted-foreground">Overheads & utilities</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase">Net Bottomline Profit</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              pnl.netProfit >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(pnl.netProfit)}
          </p>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {pnl.netMarginPercent.toFixed(1)}% net margin
          </span>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Financial Flow Comparison (NPR)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-foreground mb-2">Operating Expense Allocation</h3>
          <div className="h-56 w-full">
            {expensePieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No recorded operating expenses in period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Total Overheads: {formatCurrency(pnl.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Formal Financial Statement Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-foreground">Income Statement (Profit & Loss)</h3>
            <p className="text-xs text-muted-foreground">Wholesale Trading Business • Currency: NPR</p>
          </div>
        </div>

        <div className="divide-y divide-border text-sm">
          {/* Revenue Section */}
          <div className="p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              1. Trading Revenue
            </h4>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Gross Sales Turnover</span>
              <span className="font-mono text-foreground">{formatCurrency(pnl.grossSales)}</span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Less: Trade Discounts Allowed</span>
              <span className="font-mono text-rose-500">({formatCurrency(pnl.discounts)})</span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Less: Sales Returns & Credit Adjustments</span>
              <span className="font-mono text-rose-500">({formatCurrency(pnl.returnCredits)})</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold border-t border-border text-foreground">
              <span>Net Revenue / Turnover</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(pnl.netRevenue)}</span>
            </div>
          </div>

          {/* COGS Section */}
          <div className="p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              2. Cost of Goods Sold (COGS)
            </h4>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Direct Inventory Cost of Invoiced Sales</span>
              <span className="font-mono text-foreground">{formatCurrency(pnl.grossCOGS)}</span>
            </div>
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Less: Cost of Returned Restocked Goods</span>
              <span className="font-mono text-emerald-500">({formatCurrency(pnl.returnCOGS)})</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold border-t border-border text-foreground">
              <span>Net Cost of Sales</span>
              <span className="font-mono text-foreground">{formatCurrency(pnl.netCOGS)}</span>
            </div>
          </div>

          {/* Gross Profit Subtotal */}
          <div className="p-4 bg-muted/20 flex justify-between items-center font-bold text-base">
            <div>
              <span className="text-foreground">3. Gross Profit</span>
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({pnl.grossMarginPercent.toFixed(1)}% margin)
              </span>
            </div>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(pnl.grossProfit)}
            </span>
          </div>

          {/* Operating Expenses Section */}
          <div className="p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              4. Operating Expenses
            </h4>
            {Object.keys(pnl.expenseByCategory).length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No recorded operating expenses.</p>
            ) : (
              Object.entries(pnl.expenseByCategory).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between py-1 text-muted-foreground text-xs">
                  <span>{cat}</span>
                  <span className="font-mono text-foreground">{formatCurrency(amount)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between py-1.5 font-bold border-t border-border text-foreground">
              <span>Total Operating Expenses</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(pnl.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Bottomline Net Profit */}
          <div className="p-5 bg-card border-t-2 border-primary flex justify-between items-center font-bold text-lg">
            <div>
              <span className="text-foreground">NET OPERATING PROFIT / (LOSS)</span>
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Net Margin: {pnl.netMarginPercent.toFixed(1)}%)
              </span>
            </div>
            <span
              className={`font-mono text-xl ${
                pnl.netProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(pnl.netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
