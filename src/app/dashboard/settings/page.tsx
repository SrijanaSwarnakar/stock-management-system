import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | Stock Management System",
  description: "Configure company identity, VAT rates, document numbering, and fiscal years.",
};

export default async function SettingsPage() {
  await requireAdmin();

  const [dbSettings, sequences] = await Promise.all([
    db.systemSetting.findMany(),
    db.invoiceSequence.findMany({ orderBy: { docType: "asc" } }),
  ]);

  const settingsMap: Record<string, string> = {};
  dbSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return (
    <SettingsClient
      initialSettings={settingsMap}
      sequences={sequences}
    />
  );
}
