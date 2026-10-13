"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function DashboardShell({ children, pageTitle }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="main-layout">
        <Topbar
          onMenuClick={() => setMobileMenuOpen((o) => !o)}
          pageTitle={pageTitle}
        />
        <main
          style={{ flex: 1, minHeight: 0 }}
          id="main-content"
          role="main"
        >
          {children}
        </main>
      </div>
    </>
  );
}
