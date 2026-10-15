"use client";

import React, { useState, useTransition } from "react";
import { updateSystemSettings, updateInvoiceSequence } from "@/app/actions/settings-actions";
import { DocType } from "@prisma/client";
import {
  Settings,
  Building2,
  FileSpreadsheet,
  Calendar,
  Server,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Edit2,
  X,
  ShieldCheck,
  Hash,
} from "lucide-react";

export interface InvoiceSequenceItem {
  id: string;
  docType: DocType;
  prefix: string;
  fiscalYear: string;
  nextNumber: number;
  padding: number;
}

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  sequences: InvoiceSequenceItem[];
}

export default function SettingsClient({
  initialSettings,
  sequences: initialSequences,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"company" | "sequences" | "policies" | "system">("company");
  const [settings, setSettings] = useState<Record<string, string>>({
    COMPANY_NAME: initialSettings.COMPANY_NAME || "Nepal Wholesale Trading Pvt. Ltd.",
    COMPANY_ADDRESS: initialSettings.COMPANY_ADDRESS || "New Road, Kathmandu, Nepal",
    COMPANY_PHONE: initialSettings.COMPANY_PHONE || "+977-1-4250000",
    COMPANY_EMAIL: initialSettings.COMPANY_EMAIL || "info@nepalwholesale.com",
    COMPANY_PAN_VAT: initialSettings.COMPANY_PAN_VAT || "601234567",
    CURRENCY_SYMBOL: initialSettings.CURRENCY_SYMBOL || "NPR",
    DEFAULT_VAT_RATE: initialSettings.DEFAULT_VAT_RATE || "13",
    ACTIVE_FISCAL_YEAR: initialSettings.ACTIVE_FISCAL_YEAR || "2081/82",
    INVOICE_TERMS:
      initialSettings.INVOICE_TERMS ||
      "Goods once sold cannot be returned without original invoice. Credit settlement due in 30 days.",
  });

  const [sequences, setSequences] = useState<InvoiceSequenceItem[]>(initialSequences);
  const [editingSequence, setEditingSequence] = useState<InvoiceSequenceItem | null>(null);
  const [seqPrefix, setSeqPrefix] = useState("");
  const [seqFiscalYear, setSeqFiscalYear] = useState("");
  const [seqNextNumber, setSeqNextNumber] = useState(1);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSettingChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSavedSuccess(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    startTransition(async () => {
      const res = await updateSystemSettings(settings);
      if ("error" in res && res.error) {
        setStatusMessage(String(res.error));
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    });
  };

  const openEditSeq = (seq: InvoiceSequenceItem) => {
    setEditingSequence(seq);
    setSeqPrefix(seq.prefix);
    setSeqFiscalYear(seq.fiscalYear);
    setSeqNextNumber(seq.nextNumber);
  };

  const handleSaveSequence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSequence) return;
    startTransition(async () => {
      const res = await updateInvoiceSequence(editingSequence.id, {
        prefix: seqPrefix,
        fiscalYear: seqFiscalYear,
        nextNumber: seqNextNumber,
      });

      if ("success" in res && res.sequence) {
        setSequences((prev) =>
          prev.map((s) => (s.id === editingSequence.id ? { ...s, ...res.sequence } : s))
        );
        setEditingSequence(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="text-primary" size={24} />
          System Settings & Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure business trade identity, sequential document numbering, and fiscal parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab("company")}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "company"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 size={16} />
          Company Profile & VAT
        </button>

        <button
          onClick={() => setActiveTab("sequences")}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "sequences"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet size={16} />
          Invoice & Sequences
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "policies"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar size={16} />
          Trading Policies & Fiscal
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === "system"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Server size={16} />
          System Information
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <Check size={16} />
          <span>System configuration saved successfully.</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tab 1: Company Profile */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveSettings} className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-foreground">Registered Business Profile</h3>
            <p className="text-xs text-muted-foreground">
              These details appear on invoice printouts, tax receipts, and payment vouchers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Company / Firm Name *</label>
              <input
                type="text"
                value={settings.COMPANY_NAME}
                onChange={(e) => handleSettingChange("COMPANY_NAME", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">PAN / VAT Registration # *</label>
              <input
                type="text"
                value={settings.COMPANY_PAN_VAT}
                onChange={(e) => handleSettingChange("COMPANY_PAN_VAT", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Business Address *</label>
              <input
                type="text"
                value={settings.COMPANY_ADDRESS}
                onChange={(e) => handleSettingChange("COMPANY_ADDRESS", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Contact Phone *</label>
              <input
                type="text"
                value={settings.COMPANY_PHONE}
                onChange={(e) => handleSettingChange("COMPANY_PHONE", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Official Email Address</label>
              <input
                type="email"
                value={settings.COMPANY_EMAIL}
                onChange={(e) => handleSettingChange("COMPANY_EMAIL", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Default Base Currency</label>
              <input
                type="text"
                value={settings.CURRENCY_SYMBOL}
                onChange={(e) => handleSettingChange("CURRENCY_SYMBOL", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium text-foreground block mb-1">Invoice Footer Terms & Conditions</label>
              <textarea
                rows={3}
                value={settings.INVOICE_TERMS}
                onChange={(e) => handleSettingChange("INVOICE_TERMS", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Company Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Document Sequences */}
      {activeTab === "sequences" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-foreground">Document Number Sequences</h3>
            <p className="text-xs text-muted-foreground">
              Automated invoice and transaction code formatting per fiscal year rules.
            </p>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Document Type</th>
                  <th className="px-3 py-2.5">Prefix Format</th>
                  <th className="px-3 py-2.5">Fiscal Year</th>
                  <th className="px-3 py-2.5 text-center">Next Serial #</th>
                  <th className="px-3 py-2.5">Sample Output</th>
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sequences.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-2.5 font-semibold text-foreground">
                      {s.docType.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-primary font-medium">{s.prefix}</td>
                    <td className="px-3 py-2.5 text-muted-foreground font-mono">{s.fiscalYear}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                      {s.nextNumber}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {s.prefix}
                      {String(s.nextNumber).padStart(s.padding, "0")}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => openEditSeq(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-muted hover:bg-muted/80 rounded transition text-foreground"
                      >
                        <Edit2 size={12} />
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingSequence && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-foreground">
                    Configure {editingSequence.docType.replace("_", " ")} Sequence
                  </h4>
                  <button onClick={() => setEditingSequence(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveSequence} className="space-y-4 text-xs">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={seqPrefix}
                      onChange={(e) => setSeqPrefix(e.target.value)}
                      required
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Fiscal Year Label</label>
                    <input
                      type="text"
                      value={seqFiscalYear}
                      onChange={(e) => setSeqFiscalYear(e.target.value)}
                      required
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Next Serial Number</label>
                    <input
                      type="number"
                      min="1"
                      value={seqNextNumber}
                      onChange={(e) => setSeqNextNumber(parseInt(e.target.value) || 1)}
                      required
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingSequence(null)}
                      className="px-3 py-1.5 border border-border rounded-lg text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center gap-1.5"
                    >
                      {isPending && <Loader2 size={13} className="animate-spin" />}
                      Save Format
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trading Policies */}
      {activeTab === "policies" && (
        <form onSubmit={handleSaveSettings} className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-foreground">Tax & Fiscal Policies</h3>
            <p className="text-xs text-muted-foreground">
              Parameters governing system-wide VAT calculation and fiscal period boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Active Fiscal Year</label>
              <input
                type="text"
                value={settings.ACTIVE_FISCAL_YEAR}
                onChange={(e) => handleSettingChange("ACTIVE_FISCAL_YEAR", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
              <span className="text-[11px] text-muted-foreground">Standard Nepal Fiscal Year: 2081/82 (Shrawan–Ashad)</span>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Standard Nepal VAT Rate (%)</label>
              <input
                type="number"
                step="any"
                value={settings.DEFAULT_VAT_RATE}
                onChange={(e) => handleSettingChange("DEFAULT_VAT_RATE", e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
              <span className="text-[11px] text-muted-foreground">Statutory Inland Revenue Department rate (13%)</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Policies
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: System Information */}
      {activeTab === "system" && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-foreground">Infrastructure & Environment</h3>
            <p className="text-xs text-muted-foreground">
              Technical environment diagnostics and operational stack metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-2">
              <span className="text-muted-foreground font-semibold uppercase block">Application Runtime</span>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Framework</span>
                <span className="font-semibold text-foreground">Next.js 16 (App Router)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">React Engine</span>
                <span className="font-semibold text-foreground">React 19 Server Components</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">TypeScript</span>
                <span className="font-semibold text-foreground">Version 5.x Strict Mode</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">UI Design System</span>
                <span className="font-semibold text-foreground">Tailwind CSS + Lucide Icons</span>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-2">
              <span className="text-muted-foreground font-semibold uppercase block">Database & Storage</span>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Database Engine</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">PostgreSQL (Neon Cloud)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">ORM</span>
                <span className="font-semibold text-foreground">Prisma Client 5.22</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Inventory Costing Method</span>
                <span className="font-semibold text-foreground">Perpetual Weighted-Average Cost</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Auditing Ledger</span>
                <span className="font-semibold text-foreground">Immutable Append-Only Audit Logs</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
