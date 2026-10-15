"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createPurchaseReturn } from "@/app/actions/return-actions";
import {
  RotateCcw,
  Search,
  Plus,
  Eye,
  Calendar,
  Truck,
  Package,
  AlertCircle,
  FileText,
  X,
  Loader2,
  TrendingUp,
} from "lucide-react";

export interface PurchaseReturnItem {
  id: string;
  returnNumber: string;
  returnDate: Date;
  reason: string | null;
  totalAmount: number;
  purchase: {
    id: string;
    invoiceNumber: string;
    total: number;
    supplier: { id: string; name: string; companyName: string | null };
  };
  createdBy: { id: string; name: string };
  lines: {
    id: string;
    productId: string;
    qty: number;
    unitCost: number;
    totalCost: number;
    product: {
      id: string;
      name: string;
      sku: string;
      baseUnit: { symbol: string };
    };
  }[];
}

export interface EligiblePurchase {
  id: string;
  invoiceNumber: string;
  purchaseDate: Date;
  total: number;
  supplier: { id: string; name: string; companyName: string | null };
  lines: {
    id: string;
    productId: string;
    qty: number;
    unitCost: number;
    product: {
      id: string;
      name: string;
      sku: string;
      currentStock: number;
      baseUnit: { symbol: string };
    };
  }[];
  returns: {
    lines: { productId: string; qty: number }[];
  }[];
}

interface PurchaseReturnsClientProps {
  initialReturns: PurchaseReturnItem[];
  eligiblePurchases: EligiblePurchase[];
}

export default function PurchaseReturnsClient({
  initialReturns,
  eligiblePurchases,
}: PurchaseReturnsClientProps) {
  const [returns, setReturns] = useState<PurchaseReturnItem[]>(initialReturns);
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnItem | null>(null);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPurchase = eligiblePurchases.find((p) => p.id === selectedPurchaseId);

  // Compute maximum returnable quantity for each line in the selected purchase
  const lineReturnableMap = React.useMemo(() => {
    if (!selectedPurchase) return {};
    const map: Record<
      string,
      { max: number; unitCost: number; name: string; symbol: string; stock: number }
    > = {};

    selectedPurchase.lines.forEach((l) => {
      const alreadyReturned = selectedPurchase.returns.reduce((sum, ret) => {
        const match = ret.lines.find((rl) => rl.productId === l.productId);
        return sum + (match ? match.qty : 0);
      }, 0);
      const remainingFromPurchase = Math.max(0, l.qty - alreadyReturned);
      const allowedByStock = Math.min(remainingFromPurchase, l.product.currentStock);

      map[l.productId] = {
        max: allowedByStock,
        unitCost: l.unitCost,
        name: l.product.name,
        symbol: l.product.baseUnit.symbol,
        stock: l.product.currentStock,
      };
    });

    return map;
  }, [selectedPurchase]);

  const openCreateModal = () => {
    setSelectedPurchaseId("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setReturnQtys({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const handlePurchaseSelect = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setReturnQtys({});
    setFormError(null);
  };

  const handleQtyChange = (productId: string, val: number) => {
    setReturnQtys((prev) => ({
      ...prev,
      [productId]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const totalReturnAmount = Object.entries(returnQtys).reduce((sum, [productId, qty]) => {
    const meta = lineReturnableMap[productId];
    return sum + (meta ? qty * meta.unitCost : 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPurchaseId) {
      setFormError("Please select a purchase invoice to return from.");
      return;
    }

    const linesToReturn = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId,
        qty,
        unitCost: lineReturnableMap[productId]?.unitCost || 0,
      }));

    if (linesToReturn.length === 0) {
      setFormError("Please specify a return quantity greater than 0 for at least one item.");
      return;
    }

    // Check bounds
    for (const line of linesToReturn) {
      const meta = lineReturnableMap[line.productId];
      if (meta && line.qty > meta.max + 0.001) {
        setFormError(`Quantity for "${meta.name}" exceeds maximum allowed return quantity (${meta.max}).`);
        return;
      }
    }

    startTransition(async () => {
      const res = await createPurchaseReturn({
        purchaseId: selectedPurchaseId,
        returnDate: new Date(returnDate),
        reason,
        lines: linesToReturn,
      });

      if ("error" in res && res.error) {
        setFormError(res.error);
      } else if ("success" in res && res.purchaseReturn) {
        const newRet = {
          ...res.purchaseReturn,
          returnDate: new Date(res.purchaseReturn.returnDate),
          purchase: {
            id: selectedPurchase!.id,
            invoiceNumber: selectedPurchase!.invoiceNumber,
            total: selectedPurchase!.total,
            supplier: selectedPurchase!.supplier,
          },
        } as unknown as PurchaseReturnItem;

        setReturns((prev) => [newRet, ...prev]);
        setIsModalOpen(false);
      }
    });
  };

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.returnNumber.toLowerCase().includes(q) ||
      r.purchase.invoiceNumber.toLowerCase().includes(q) ||
      r.purchase.supplier.name.toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q)
    );
  });

  const totalDeducted = returns.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="text-blue-500" size={24} />
            Purchase Returns
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage goods returned to suppliers, inventory deductions, and supplier debit notes.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition shadow-sm"
        >
          <Plus size={16} />
          Record Purchase Return
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Returns</p>
            <p className="text-2xl font-bold text-foreground mt-1">{returns.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <RotateCcw size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Value Deducted</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalDeducted)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Eligible Purchases</p>
            <p className="text-2xl font-bold text-foreground mt-1">{eligiblePurchases.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search size={16} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by return #, purchase #, supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Returns Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Return #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purchase Invoice</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Debit Amount</th>
                <th className="px-4 py-3">Handled By</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No purchase returns recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-semibold">
                        {ret.returnNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(ret.returnDate)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                      {ret.purchase.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{ret.purchase.supplier.name}</div>
                      {ret.purchase.supplier.companyName && (
                        <div className="text-xs text-muted-foreground">{ret.purchase.supplier.companyName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ret.lines.length} {ret.lines.length === 1 ? "product" : "products"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(ret.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {ret.createdBy.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-muted hover:bg-muted/80 rounded transition text-foreground"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Return Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <RotateCcw size={18} className="text-blue-500" />
                  Return Details: {selectedReturn.returnNumber}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Processed on {formatDate(selectedReturn.returnDate)} by {selectedReturn.createdBy.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg text-xs">
              <div>
                <span className="text-muted-foreground block">Supplier</span>
                <span className="font-semibold text-foreground">{selectedReturn.purchase.supplier.name}</span>
                {selectedReturn.purchase.supplier.companyName && (
                  <span className="text-muted-foreground block">{selectedReturn.purchase.supplier.companyName}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block">Original Purchase Invoice</span>
                <span className="font-mono font-semibold text-foreground">{selectedReturn.purchase.invoiceNumber}</span>
              </div>
              {selectedReturn.reason && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Return Reason</span>
                  <span className="text-foreground">{selectedReturn.reason}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Returned Products (Deducted From Stock)
              </h4>
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-center">Quantity</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Debit Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedReturn.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{l.product.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{l.product.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {l.qty} {l.product.baseUnit.symbol}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(l.unitCost)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(l.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-bold text-foreground">
                    <td colSpan={3} className="px-3 py-2 text-right">
                      Total Debit Note Amount:
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedReturn.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReturn(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <RotateCcw size={18} className="text-blue-500" />
                  Record Purchase Return
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Return items to supplier, deduct from inventory, and generate debit adjustment.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Select Purchase Invoice *
                  </label>
                  <select
                    value={selectedPurchaseId}
                    onChange={(e) => handlePurchaseSelect(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Purchase Invoice --</option>
                    {eligiblePurchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.invoiceNumber} — {p.supplier.name} ({formatCurrency(p.total)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Return Date *
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  placeholder="e.g. Defective batch, wrong specification delivered, damaged packaging"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {selectedPurchase && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Items In Purchase (Enter Return Quantities)
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground font-semibold">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-center">Max Returnable</th>
                          <th className="px-3 py-2 text-center">In Stock</th>
                          <th className="px-3 py-2 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-right">Return Qty</th>
                          <th className="px-3 py-2 text-right">Debit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedPurchase.lines.map((l) => {
                          const meta = lineReturnableMap[l.productId] || {
                            max: 0,
                            unitCost: l.unitCost,
                            name: l.product.name,
                            symbol: l.product.baseUnit.symbol,
                            stock: l.product.currentStock,
                          };
                          const currentQty = returnQtys[l.productId] || 0;
                          const lineDebit = currentQty * meta.unitCost;

                          return (
                            <tr key={l.id} className={meta.max === 0 ? "opacity-50" : ""}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-foreground">{l.product.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{l.product.sku}</div>
                              </td>
                              <td className="px-3 py-2 text-center font-medium">
                                {meta.max.toFixed(2)} {meta.symbol}
                              </td>
                              <td className="px-3 py-2 text-center text-muted-foreground">
                                {meta.stock.toFixed(2)} {meta.symbol}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {formatCurrency(meta.unitCost)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={meta.max}
                                  step="any"
                                  disabled={meta.max <= 0}
                                  value={currentQty === 0 ? "" : currentQty}
                                  onChange={(e) => handleQtyChange(l.productId, parseFloat(e.target.value))}
                                  placeholder="0"
                                  className="w-20 bg-background border border-border rounded px-2 py-1 text-right text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(lineDebit)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-bold border-t border-border">
                          <td colSpan={5} className="px-3 py-2 text-right text-foreground">
                            Total Debit to Supplier:
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalReturnAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-medium hover:bg-muted text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || totalReturnAmount <= 0}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  Confirm Return & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
