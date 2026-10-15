import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import {
  FileText,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  Users,
  Truck,
  Receipt,
  ArrowRight,
  BarChart2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports & Analytics | Stock Management System",
  description: "Comprehensive financial, sales, inventory, and due reports.",
};

const REPORTS = [
  {
    title: "Sales Report",
    href: "/dashboard/reports/sales",
    icon: <FileText className="text-blue-500" size={24} />,
    description: "Analyze daily turnover, invoice settlement status, and customer revenue trends.",
    tag: "Revenue",
  },
  {
    title: "Purchase Report",
    href: "/dashboard/reports/purchases",
    icon: <ShoppingCart className="text-purple-500" size={24} />,
    description: "Track supplier procurement spending, purchase invoices, and inbound costs.",
    tag: "Procurement",
  },
  {
    title: "Profit & Loss (P&L)",
    href: "/dashboard/reports/profit-loss",
    icon: <TrendingUp className="text-emerald-500" size={24} />,
    description: "Gross margins, cost of goods sold (COGS), operating expenses, and net profit.",
    tag: "Financial Statement",
  },
  {
    title: "Stock & Valuation Report",
    href: "/dashboard/reports/stock",
    icon: <Warehouse className="text-amber-500" size={24} />,
    description: "Warehouse inventory valuation at cost vs retail, SKU levels, and reorder alerts.",
    tag: "Inventory",
  },
  {
    title: "Customer Dues Report",
    href: "/dashboard/reports/customer-dues",
    icon: <Users className="text-rose-500" size={24} />,
    description: "Accounts receivable tracking, customer debt, and credit limit compliance.",
    tag: "Receivables",
  },
  {
    title: "Supplier Dues Report",
    href: "/dashboard/reports/supplier-dues",
    icon: <Truck className="text-orange-500" size={24} />,
    description: "Accounts payable liability, outstanding vendor payments, and procurement dues.",
    tag: "Payables",
  },
  {
    title: "Expenses Report",
    href: "/dashboard/reports/expenses",
    icon: <Receipt className="text-teal-500" size={24} />,
    description: "Operating overheads breakdown, category allocations, and disbursement channels.",
    tag: "Overheads",
  },
];

export default async function ReportsHubPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BarChart2 className="text-primary" size={26} />
          Reports & Business Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an analytical module below to inspect financial statements, trading performance, and operational records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {r.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {r.tag}
                </span>
              </div>
              <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                {r.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {r.description}
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-4 pt-3 border-t border-border/50">
              <span>View Report</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
