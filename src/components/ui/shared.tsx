"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
        marginBottom: "1.5rem",
      }}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" style={{ marginBottom: "0.375rem" }}>
            <ol style={{ display: "flex", alignItems: "center", gap: "0.375rem", listStyle: "none", margin: 0, padding: 0 }}>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  {i > 0 && <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", textDecoration: "none" }}>
                      {crumb.label}
                    </a>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

/** Loading spinner overlay */
export function LoadingSpinner({ message = "Loading…" }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        gap: "0.75rem",
        color: "var(--color-text-secondary)",
      }}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      <p style={{ margin: 0, fontSize: "0.875rem" }}>{message}</p>
    </div>
  );
}

/** Inline button-level spinner */
export function ButtonSpinner() {
  return <Loader2 size={14} className="animate-spin" aria-hidden="true" />;
}

/** Page skeleton loader */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="page-container" aria-busy="true" aria-label="Loading content">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="skeleton" style={{ height: 36, width: "30%" }} />
        <div className="skeleton" style={{ height: 48, width: "100%" }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 52, width: "100%" }} />
        ))}
      </div>
    </div>
  );
}

/** Stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="skeleton" style={{ height: 14, width: "60%" }} />
      <div className="skeleton" style={{ height: 32, width: "80%" }} />
      <div className="skeleton" style={{ height: 12, width: "40%" }} />
    </div>
  );
}

/** Generic error display */
export function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 2rem",
        gap: "0.75rem",
        textAlign: "center",
      }}
      role="alert"
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
        aria-hidden="true"
      >
        ⚠️
      </div>
      <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>{title}</h2>
      {message && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", maxWidth: 360 }}>
          {message}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }}>
          Try Again
        </button>
      )}
    </div>
  );
}

/** Empty state component */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: "0.5rem" }}>{action}</div>}
    </div>
  );
}

/** Data table wrapper with overflow handling */
export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table className="data-table" role="table">
        {children}
      </table>
    </div>
  );
}

/** Pagination controls */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.375rem",
        padding: "1rem 0",
      }}
      aria-label="Pagination"
      role="navigation"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="btn btn-secondary btn-sm"
        aria-label="Previous page"
      >
        ‹
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        );
      })}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="btn btn-secondary btn-sm"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/** Badge component */
export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
  const classMap: Record<string, string> = {
    DRAFT: "badge badge-neutral",
    POSTED: "badge badge-success",
    CANCELLED: "badge badge-danger",
    PARTIAL: "badge badge-warning",
    PAID: "badge badge-success",
    ACTIVE: "badge badge-success",
    INACTIVE: "badge badge-neutral",
    LOW: "badge badge-warning",
    OUT: "badge badge-danger",
  };
  const cls = classMap[status.toUpperCase()] ?? "badge badge-neutral";
  return <span className={cls}>{label}</span>;
}

/** Simple stats card */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  trend?: { value: number; label: string };
}) {
  const colored = !!gradient;
  return (
    <div
      className={`stat-card ${colored ? "" : ""}`}
      style={
        gradient
          ? {
              background: `linear-gradient(135deg, ${gradient})`,
              border: "none",
              color: "white",
            }
          : {}
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: colored ? "rgba(255,255,255,0.8)" : "var(--color-text-secondary)",
          }}
        >
          {title}
        </p>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "0.625rem",
              background: colored ? "rgba(255,255,255,0.2)" : "var(--color-surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colored ? "white" : "var(--color-primary)",
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "1.625rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: colored ? "white" : "var(--color-text-primary)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p
          style={{
            margin: "0.375rem 0 0",
            fontSize: "0.75rem",
            color: colored ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)",
          }}
        >
          {subtitle}
        </p>
      )}
      {trend && (
        <p
          style={{
            margin: "0.5rem 0 0",
            fontSize: "0.75rem",
            color: trend.value >= 0 ? (colored ? "rgba(255,255,255,0.9)" : "#10b981") : "#ef4444",
            fontWeight: 500,
          }}
        >
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}

/** Coming soon stub for unimplemented pages */
export function ComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "5rem 2rem",
          gap: "1.25rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "1.25rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
          }}
          aria-hidden="true"
        >
          🚧
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700 }}>{moduleName}</h2>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9375rem", color: "var(--color-text-secondary)", maxWidth: 400 }}>
            This module is being built in a future phase. Navigation is active so you can see the full structure.
          </p>
        </div>
        <span className="badge badge-info" style={{ fontSize: "0.8125rem" }}>
          Coming in Phase 5+
        </span>
      </div>
    </div>
  );
}
