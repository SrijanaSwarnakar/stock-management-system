"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createSaleReturn } from "@/app/actions/return-actions";
import {
  RotateCcw,
  Search,
  Plus,
  Eye,
  Calendar,
  User,
  Package,
  AlertCircle,
  FileText,
  X,
  Loader2,
  DollarSign,
  TrendingDown,
} from "lucide-react";

export interface SaleReturnItem {
  id: string;
  returnNumber: string;
  returnDate: Date;
  reason: string | null;
  totalAmount: number;
  sale: {
    id: string;
    invoiceNumber: string;
    total: number;
    customer: { id: string; name: string; shopName: string | null };
  };
  createdBy: { id: string; name: string };
  lines: {
    id: string;
    productId: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      id: string;
      name: string;
      sku: string;
      baseUnit: { symbol: string };
    };
  }[];
}

export interface EligibleSale {
  id: string;
  invoiceNumber: string;
  saleDate: Date;
  total: number;
  customer: { id: string; name: string; shopName: string | null };
  lines: {
    id: string;
    productId: string;
    qty: number;
    unitPrice: number;
    product: { id: string; name: string; sku: string; baseUnit: { symbol: string } };
  }[];
  returns: {
    lines: { productId: string; qty: number }[];
  }[];
}

interface SaleReturnsClientProps {
  initialReturns: SaleReturnItem[];
  eligibleSales: EligibleSale[];
}

export default function SaleReturnsClient({
  initialReturns,
  eligibleSales,
}: SaleReturnsClientProps) {
  const [returns, setReturns] = useState<SaleReturnItem[]>(initialReturns);
  const [search, setSearch] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<SaleReturnItem | null>(null);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSale = eligibleSales.find((s) => s.id === selectedSaleId);

  // Compute maximum returnable quantity for each line in the selected sale
  const lineReturnableMap = React.useMemo(() => {
    if (!selectedSale) return {};
    const map: Record<string, { max: number; unitPrice: number; name: string; symbol: string }> = {};

    selectedSale.lines.forEach((l) => {
      const alreadyReturned = selectedSale.returns.reduce((sum, ret) => {
        const match = ret.lines.find((rl) => rl.productId === l.productId);
        return sum + (match ? match.qty : 0);
      }, 0);
      map[l.productId] = {
        max: Math.max(0, l.qty - alreadyReturned),
        unitPrice: l.unitPrice,
        name: l.product.name,
        symbol: l.product.baseUnit.symbol,
      };
    });

    return map;
  }, [selectedSale]);

  const openCreateModal = () => {
    setSelectedSaleId("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setReason("");
    setReturnQtys({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaleSelect = (saleId: string) => {
    setSelectedSaleId(saleId);
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
    return sum + (meta ? qty * meta.unitPrice : 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSaleId) {
      setFormError("Please select a sales invoice to return from.");
      return;
    }

    const linesToReturn = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId,
        qty,
        unitPrice: lineReturnableMap[productId]?.unitPrice || 0,
      }));

    if (linesToReturn.length === 0) {
      setFormError("Please specify a return quantity greater than 0 for at least one item.");
      return;
    }

    // Check bounds
    for (const line of linesToReturn) {
      const meta = lineReturnableMap[line.productId];
      if (meta && line.qty > meta.max + 0.001) {
        setFormError(`Quantity for "${meta.name}" exceeds maximum returnable quantity (${meta.max}).`);
        return;
      }
    }

    startTransition(async () => {
      const res = await createSaleReturn({
        saleId: selectedSaleId,
        returnDate: new Date(returnDate),
        reason,
        lines: linesToReturn,
      });

      if ("error" in res && res.error) {
        setFormError(res.error);
      } else if ("success" in res && res.saleReturn) {
        // Optimistically add to state
        const newRet = {
          ...res.saleReturn,
          returnDate: new Date(res.saleReturn.returnDate),
          sale: {
            id: selectedSale!.id,
            invoiceNumber: selectedSale!.invoiceNumber,
            total: selectedSale!.total,
            customer: selectedSale!.customer,
          },
        } as unknown as SaleReturnItem;

        setReturns((prev) => [newRet, ...prev]);
        setIsModalOpen(false);
      }
    });
  };

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.returnNumber.toLowerCase().includes(q) ||
      r.sale.invoiceNumber.toLowerCase().includes(q) ||
      r.sale.customer.name.toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q)
    );
  });

  const totalRefunded = returns.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="text-amber-500" size={24} />
            Sales Returns
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer returned goods, restocking, and customer credit notes.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition shadow-sm"
        >
          <Plus size={16} />
          Record Sale Return
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Returns</p>
            <p className="text-2xl font-bold text-foreground mt-1">{returns.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <RotateCcw size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Value Credited</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalRefunded)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Eligible Invoices</p>
            <p className="text-2xl font-bold text-foreground mt-1">{eligibleSales.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search size={16} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by return #, invoice #, customer..."
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
                <th className="px-4 py-3">Original Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Amount Credited</th>
                <th className="px-4 py-3">Handled By</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No sales returns found.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-amber-600 dark:text-amber-400 font-semibold">
                        {ret.returnNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(ret.returnDate)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                      {ret.sale.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{ret.sale.customer.name}</div>
                      {ret.sale.customer.shopName && (
                        <div className="text-xs text-muted-foreground">{ret.sale.customer.shopName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ret.lines.length} {ret.lines.length === 1 ? "product" : "products"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">
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
                  <RotateCcw size={18} className="text-amber-500" />
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
                <span className="text-muted-foreground block">Customer</span>
                <span className="font-semibold text-foreground">{selectedReturn.sale.customer.name}</span>
                {selectedReturn.sale.customer.shopName && (
                  <span className="text-muted-foreground block">{selectedReturn.sale.customer.shopName}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block">Original Sale Invoice</span>
                <span className="font-mono font-semibold text-foreground">{selectedReturn.sale.invoiceNumber}</span>
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
                Returned Products Restocked
              </h4>
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-center">Quantity</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Total Credited</th>
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
                      <td className="px-3 py-2 text-right">{formatCurrency(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {formatCurrency(l.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-bold text-foreground">
                    <td colSpan={3} className="px-3 py-2 text-right">
                      Total Credit Amount:
                    </td>
                    <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400">
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

      {/* Create Sale Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <RotateCcw size={18} className="text-amber-500" />
                  Record New Sale Return
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restock returned items and automatically credit customer balance.
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
                    Select Sales Invoice *
                  </label>
                  <select
                    value={selectedSaleId}
                    onChange={(e) => handleSaleSelect(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Sales Invoice --</option>
                    {eligibleSales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.invoiceNumber} — {s.customer.name} ({formatCurrency(s.total)})
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
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expired stock, customer ordered wrong size, packaging damaged"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {selectedSale && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Items In Invoice (Enter Return Quantities)
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground font-semibold">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-center">Max Returnable</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-right">Return Qty</th>
                          <th className="px-3 py-2 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedSale.lines.map((l) => {
                          const meta = lineReturnableMap[l.productId] || { max: 0, unitPrice: l.unitPrice, name: l.product.name, symbol: l.product.baseUnit.symbol };
                          const currentQty = returnQtys[l.productId] || 0;
                          const lineCredit = currentQty * meta.unitPrice;

                          return (
                            <tr key={l.id} className={meta.max === 0 ? "opacity-50" : ""}>
                              <td className="px-3 py-2">
                                <div className="font-medium text-foreground">{l.product.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{l.product.sku}</div>
                              </td>
                              <td className="px-3 py-2 text-center font-medium">
                                {meta.max.toFixed(2)} {meta.symbol}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {formatCurrency(meta.unitPrice)}
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
                              <td className="px-3 py-2 text-right font-medium text-rose-600 dark:text-rose-400">
                                {formatCurrency(lineCredit)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-bold border-t border-border">
                          <td colSpan={4} className="px-3 py-2 text-right text-foreground">
                            Total Credit to Customer:
                          </td>
                          <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400">
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
                  Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
