"use client";

import React from "react";
import { Menu, Bell, Search } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

interface TopbarProps {
  onMenuClick: () => void;
  pageTitle?: string;
}

export function Topbar({ onMenuClick, pageTitle }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="btn btn-ghost btn-sm"
        style={{ display: "flex" }}
        aria-label="Open navigation menu"
        id="topbar-menu-button"
      >
        <Menu size={20} />
      </button>

      {/* Page title (mobile only) */}
      <span
        className="md:hidden"
        style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", flex: 1 }}
      >
        {pageTitle ?? APP_NAME}
      </span>

      {/* Search bar (desktop) */}
      <div
        style={{
          flex: 1,
          maxWidth: 420,
          display: "none", // hide for now — Phase 5+ will add global search
        }}
        className="search-bar-desktop"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "white",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "0.5rem 0.875rem",
          }}
        >
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input
            type="search"
            placeholder="Search products, invoices…"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "0.875rem",
              color: "var(--color-text-primary)",
              width: "100%",
            }}
            aria-label="Global search"
            id="topbar-global-search"
          />
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Notifications bell */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ position: "relative" }}
          aria-label="Notifications"
          id="topbar-notifications"
        >
          <Bell size={18} />
          {/* Unread dot */}
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-danger)",
              border: "2px solid var(--color-background)",
            }}
            aria-hidden="true"
          />
        </button>

        {/* Avatar */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "white",
            cursor: "pointer",
            userSelect: "none",
          }}
          title="Account"
          aria-label="User account"
          id="topbar-user-avatar"
        >
          A
        </div>
      </div>
    </header>
  );
}
