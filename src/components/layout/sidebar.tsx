"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
  Warehouse,
  Truck,
  ShoppingCart,
  Users,
  Store,
  CreditCard,
  Receipt,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Menu,
  X,
  TrendingUp,
  FileText,
  UserCog,
  ClipboardList,
} from "lucide-react";
import { APP_NAME, APP_NAME_SHORT } from "@/lib/constants";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={16} />,
  },
  // ── CATALOG ──────────────────────────────────────────────
  {
    label: "Products",
    href: "/dashboard/products",
    icon: <Package size={16} />,
    section: "Catalog",
  },
  {
    label: "Categories",
    href: "/dashboard/categories",
    icon: <Tag size={16} />,
  },
  {
    label: "Units",
    href: "/dashboard/units",
    icon: <Layers size={16} />,
  },
  // ── INVENTORY ─────────────────────────────────────────────
  {
    label: "Inventory",
    icon: <Warehouse size={16} />,
    section: "Inventory",
    children: [
      { label: "Stock Overview", href: "/dashboard/inventory", icon: <Warehouse size={14} /> },
      { label: "Stock Ledger",   href: "/dashboard/inventory/ledger", icon: <ClipboardList size={14} /> },
      { label: "Adjustments",    href: "/dashboard/inventory/adjustments", icon: <TrendingUp size={14} /> },
    ],
  },
  // ── PURCHASES ─────────────────────────────────────────────
  {
    label: "Suppliers",
    href: "/dashboard/suppliers",
    icon: <Truck size={16} />,
    section: "Purchases",
  },
  {
    label: "Purchases",
    href: "/dashboard/purchases",
    icon: <ShoppingCart size={16} />,
  },
  // ── SALES ─────────────────────────────────────────────────
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: <Users size={16} />,
    section: "Sales",
  },
  {
    label: "Sales",
    href: "/dashboard/sales",
    icon: <Store size={16} />,
  },
  // ── FINANCIAL ─────────────────────────────────────────────
  {
    label: "Payments",
    icon: <CreditCard size={16} />,
    section: "Financial",
    children: [
      { label: "Received", href: "/dashboard/payments/received", icon: <CreditCard size={14} /> },
      { label: "Made",     href: "/dashboard/payments/made",     icon: <CreditCard size={14} /> },
    ],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: <Receipt size={16} />,
  },
  // ── REPORTS ───────────────────────────────────────────────
  {
    label: "Reports",
    icon: <BarChart2 size={16} />,
    section: "Reports",
    children: [
      { label: "Sales Report",    href: "/dashboard/reports/sales",        icon: <FileText size={14} /> },
      { label: "Purchase Report", href: "/dashboard/reports/purchases",     icon: <FileText size={14} /> },
      { label: "Profit & Loss",   href: "/dashboard/reports/profit-loss",  icon: <TrendingUp size={14} /> },
      { label: "Stock Report",    href: "/dashboard/reports/stock",         icon: <Warehouse size={14} /> },
      { label: "Customer Dues",   href: "/dashboard/reports/customer-dues", icon: <Users size={14} /> },
      { label: "Supplier Dues",   href: "/dashboard/reports/supplier-dues", icon: <Truck size={14} /> },
      { label: "Expenses Report", href: "/dashboard/reports/expenses",      icon: <Receipt size={14} /> },
    ],
  },
  // ── ADMIN ─────────────────────────────────────────────────
  {
    label: "Users",
    href: "/dashboard/users",
    icon: <UserCog size={16} />,
    section: "Administration",
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit-log",
    icon: <ClipboardList size={16} />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings size={16} />,
  },
];

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isChildActive = item.children?.some(
    (c) => c.href && pathname.startsWith(c.href)
  );
  const [open, setOpen] = useState(isChildActive ?? false);

  // Auto-open if a child is active
  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  if (!item.children) {
    const active = item.href ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) : false;
    return (
      <Link
        href={item.href!}
        className={`sidebar-item ${active ? "active" : ""}`}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`sidebar-item w-full text-left ${isChildActive ? "active" : ""}`}
        style={{ justifyContent: "space-between" }}
        aria-expanded={open}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {item.icon}
          {item.label}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div style={{ paddingLeft: "2rem" }}>
          {item.children.map((child) => {
            const active = child.href
              ? pathname === child.href || pathname.startsWith(child.href)
              : false;
            return (
              <Link
                key={child.href}
                href={child.href!}
                className={`sidebar-item ${active ? "active" : ""}`}
                style={{ fontSize: "0.8125rem" }}
              >
                {child.icon}
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  let currentSection: string | undefined;
  const groupedItems = navItems.reduce<(NavItem & { _section?: string })[]>(
    (acc, item) => {
      if (item.section && item.section !== currentSection) {
        currentSection = item.section;
        acc.push({ ...item, _section: item.section });
      } else {
        acc.push(item);
      }
      return acc;
    },
    []
  );

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? "open" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "0.625rem",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.875rem",
                  color: "white",
                  letterSpacing: "-0.03em",
                  flexShrink: 0,
                }}
              >
                {APP_NAME_SHORT}
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "white",
                    lineHeight: 1.2,
                  }}
                >
                  {APP_NAME}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.6875rem",
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.2,
                  }}
                >
                  Wholesale System
                </p>
              </div>
            </div>
            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden"
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: "4px" }}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            const showSection =
              item.section &&
              (idx === 0 || navItems[idx - 1]?.section !== item.section);

            return (
              <div key={item.href ?? item.label}>
                {showSection && (
                  <p className="sidebar-section-label">{item.section}</p>
                )}
                <NavGroup item={item} pathname={pathname} />
              </div>
            );
          })}
        </nav>

        {/* Bottom user info placeholder */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              A
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Admin User
              </p>
              <p style={{ margin: 0, fontSize: "0.6875rem", color: "rgba(255,255,255,0.45)" }}>
                Owner
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
