import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Dashboard | ${APP_NAME}`,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
