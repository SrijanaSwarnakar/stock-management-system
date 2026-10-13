"use client";

import React, { useState, useTransition } from "react";
import {
  createUnit,
  updateUnit,
  createUnitConversion,
  deleteUnitConversion,
} from "@/app/actions/unit-actions";
import {
  Layers,
  Plus,
  ArrowRight,
  Trash2,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  Scale,
  PackageCheck,
} from "lucide-react";

export interface UnitItem {
  id: string;
  name: string;
  symbol: string;
  isBaseUnit: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    productsAsBase: number;
  };
}

export interface UnitConversionItem {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  productId: string | null;
  createdAt: Date;
  fromUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  toUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

interface UnitsClientProps {
  initialUnits: UnitItem[];
  initialConversions: UnitConversionItem[];
}

export function UnitsClient({ initialUnits, initialConversions }: UnitsClientProps) {
  const [units, setUnits] = useState<UnitItem[]>(initialUnits);
  const [conversions, setConversions] = useState<UnitConversionItem[]>(initialConversions);

  // Unit modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", symbol: "", isBaseUnit: false });
  const [unitError, setUnitError] = useState<string | null>(null);

  // Conversion modal
  const [isConvModalOpen, setIsConvModalOpen] = useState(false);
  const [convForm, setConvForm] = useState({ fromUnitId: "", toUnitId: "", factor: 1 });
  const [convError, setConvError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({ name: "", symbol: "", isBaseUnit: false });
    setUnitError(null);
    setIsUnitModalOpen(true);
  };

  const openEditUnit = (u: UnitItem) => {
    setEditingUnit(u);
    setUnitForm({ name: u.name, symbol: u.symbol, isBaseUnit: u.isBaseUnit });
    setUnitError(null);
    setIsUnitModalOpen(true);
  };

  const handleUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUnitError(null);

    startTransition(async () => {
      if (editingUnit) {
        const res = await updateUnit(editingUnit.id, {
          name: unitForm.name,
          symbol: unitForm.symbol,
          isBaseUnit: unitForm.isBaseUnit,
        });

        if (res.error) {
          setUnitError(res.error);
        } else if (res.unit) {
          setUnits((prev) =>
            prev.map((u) =>
              u.id === editingUnit.id
                ? { ...u, name: res.unit.name, symbol: res.unit.symbol, isBaseUnit: res.unit.isBaseUnit }
                : u
            )
          );
          setIsUnitModalOpen(false);
        }
      } else {
        const res = await createUnit({
          name: unitForm.name,
          symbol: unitForm.symbol,
          isBaseUnit: unitForm.isBaseUnit,
        });

        if (res.error) {
          setUnitError(res.error);
        } else if (res.unit) {
          setUnits((prev) => [
            ...prev,
            {
              ...res.unit,
              createdAt: new Date(res.unit.createdAt),
              updatedAt: new Date(res.unit.updatedAt),
              _count: { productsAsBase: 0 },
            },
          ]);
          setIsUnitModalOpen(false);
        }
      }
    });
  };

  const openCreateConv = () => {
    setConvForm({
      fromUnitId: units[1]?.id || units[0]?.id || "",
      toUnitId: units[0]?.id || "",
      factor: 12,
    });
    setConvError(null);
    setIsConvModalOpen(true);
  };

  const handleConvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConvError(null);

    startTransition(async () => {
      const res = await createUnitConversion({
        fromUnitId: convForm.fromUnitId,
        toUnitId: convForm.toUnitId,
        factor: Number(convForm.factor),
      });

      if (res.error) {
        setConvError(res.error);
      } else if (res.conversion) {
        setConversions((prev) => [
          {
            ...res.conversion!,
            createdAt: new Date(res.conversion!.createdAt),
            product: null,
          },
          ...prev,
        ]);
        setIsConvModalOpen(false);
      }
    });
  };

  const handleDeleteConv = (id: string) => {
    if (!confirm("Are you sure you want to delete this conversion rule?")) return;

    startTransition(async () => {
      const res = await deleteUnitConversion(id);
      if (res.error) {
        alert(res.error);
      } else {
        setConversions((prev) => prev.filter((c) => c.id !== id));
      }
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Units & Conversions</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Configure standard wholesale measurement units and conversion packaging multipliers.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={openCreateConv}
            className="btn btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            id="btn-add-conversion"
          >
            <Scale size={16} />
            <span>Add Conversion</span>
          </button>
          <button
            onClick={openCreateUnit}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            id="btn-add-unit"
          >
            <Plus size={16} />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Units List */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Layers size={18} style={{ color: "var(--color-primary)" }} />
            <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700 }}>Defined Measurement Units</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Symbol</th>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <td style={{ padding: "0.75rem 0", fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: "0.75rem 0", fontFamily: "monospace", color: "var(--color-primary)" }}>
                      {u.symbol}
                    </td>
                    <td style={{ padding: "0.75rem 0" }}>
                      {u.isBaseUnit ? (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "0.375rem",
                            background: "#d1fae5",
                            color: "#065f46",
                          }}
                        >
                          Base Unit
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Packaging</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 0", textAlign: "right" }}>
                      <button
                        onClick={() => openEditUnit(u)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "0.25rem 0.375rem" }}
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conversions List */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Scale size={18} style={{ color: "var(--color-success)" }} />
            <h2 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700 }}>Conversion Multipliers</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Packaging Formula</th>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Multiplier</th>
                  <th style={{ padding: "0.5rem 0", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {conversions.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "2rem 0", textAlign: "center", color: "var(--color-text-muted)" }}>
                      No conversion multipliers configured.
                    </td>
                  </tr>
                ) : (
                  conversions.map((conv) => (
                    <tr key={conv.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "0.75rem 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 600 }}>1 {conv.fromUnit.name}</span>
                          <ArrowRight size={13} style={{ color: "var(--color-text-muted)" }} />
                          <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                            {conv.factor} {conv.toUnit.symbol}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0", fontFamily: "monospace" }}>×{conv.factor}</td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteConv(conv.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "0.25rem 0.375rem", color: "var(--color-danger)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Unit Modal */}
      {isUnitModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 400, padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                {editingUnit ? "Edit Measurement Unit" : "Add Measurement Unit"}
              </h2>
              <button onClick={() => setIsUnitModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {unitError && (
              <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "0.5rem", background: "#fee2e2", color: "#991b1b", fontSize: "0.8125rem" }}>
                {unitError}
              </div>
            )}

            <form onSubmit={handleUnitSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Unit Name
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  placeholder="e.g. Dozen, Kilogram, Box"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Symbol (Short Code)
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.symbol}
                  onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })}
                  placeholder="e.g. dz, kg, box"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="unit-base"
                  checked={unitForm.isBaseUnit}
                  onChange={(e) => setUnitForm({ ...unitForm, isBaseUnit: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="unit-base" style={{ fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer" }}>
                  This is a base unit for ledger inventory tracking
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsUnitModalOpen(false)} className="btn btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>{editingUnit ? "Update Unit" : "Save Unit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Conversion Modal */}
      {isConvModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 420, padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Add Unit Conversion Rule</h2>
              <button onClick={() => setIsConvModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {convError && (
              <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "0.5rem", background: "#fee2e2", color: "#991b1b", fontSize: "0.8125rem" }}>
                {convError}
              </div>
            )}

            <form onSubmit={handleConvSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  From Packaging Unit (1 Unit)
                </label>
                <select
                  value={convForm.fromUnitId}
                  onChange={(e) => setConvForm({ ...convForm, fromUnitId: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Multiplier Factor
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={convForm.factor}
                  onChange={(e) => setConvForm({ ...convForm, factor: parseFloat(e.target.value) || 1 })}
                  placeholder="e.g. 24"
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  To Target Base Unit
                </label>
                <select
                  value={convForm.toUnitId}
                  onChange={(e) => setConvForm({ ...convForm, toUnitId: e.target.value })}
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", border: "1px solid var(--color-border)", fontSize: "0.875rem", outline: "none", background: "white" }}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setIsConvModalOpen(false)} className="btn btn-ghost" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                  <span>Save Conversion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
