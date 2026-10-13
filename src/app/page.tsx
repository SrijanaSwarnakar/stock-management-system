import { redirect } from "next/navigation";

// Root page redirects to login (Phase 4) or dashboard
export default function RootPage() {
  redirect("/login");
}
