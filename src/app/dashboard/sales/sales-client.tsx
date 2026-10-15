"use client";

import React, { useState, useTransition } from "react";
import { SaleStatus } from "@prisma/client";
import { createSaleInvoice, postDraftSale, cancelSale } from "@/app/actions/sale-actions";
import { formatCurrency, formatDate, getStatusClass } from "@/lib/utils";
import {
  ShoppingBag, Plus, Search, Clock, Trash2, X, Loader2, AlertCircle, AlertTriangle, Send, XCircle, Eye,
} from "lucide-react";

export interface SaleLineItem {
  id: string; productId: string; unitId: string; qty: number; unitPrice: number;
  costPriceAtSale: number; totalPrice: number; convertedQtyBase: number;
  product: { id: string; name: string; sku: string };
  unit: { id: string; name: string; symbol: string };
}

export interface SaleItem {
  id: string; invoiceNumber: string; customerId: string; saleDate: Date;
  status: SaleStatus; subtotal: number; discount: number; tax: number;
  total: number; paidAmount: number; dueAmount: number; notes: string | null;
  customer: { id: string; name: string; shopName: string | null; phone: string };
  lines: SaleLineItem[];
  createdBy: { id: string; name: string };
  payments: { id: string; amount: number }[];
}

interface SalesClientProps {
  initialSales: SaleItem[];
  customers: Array<{ id: string; name: string; shopName: string | null; creditLimit: number; currentBalance: number }>;
  products: Array<{ id: string; name: string; sku: string; sellingPrice: number; costPrice: number; currentStock: number; baseUnitId: string; baseUnit: { id: string; symbol: string } }>;
  units: Array<{ id: string; name: string; symbol: string }>;
}

interface NewSaleLine { productId: string; unitId: string; qty: string; unitPrice: string; conversionFactor: string; }
const emptyLine = (): NewSaleLine => ({ productId: "", unitId: "", qty: "1", unitPrice: "", conversionFactor: "1" });

export default function SalesClient({ initialSales, customers, products, units }: SalesClientProps) {
  const [sales, setSales] = useState<SaleItem[]>(initialSales);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "ALL">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SaleItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [cancelTarget, setCancelTarget] = useState<SaleItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const [newCustomerId, setNewCustomerId] = useState("");
  const [newSaleDate, setNewSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDiscount, setNewDiscount] = useState("0");
  const [newNotes, setNewNotes] = useState("");
  const [newLines, setNewLines] = useState<NewSaleLine[]>([emptyLine()]);

  const resetForm = () => {
    setNewCustomerId(""); setNewSaleDate(new Date().toISOString().split("T")[0]);
    setNewDiscount("0"); setNewNotes(""); setNewLines([emptyLine()]);
    setFormError(null); setFormWarnings([]);
  };

  const filtered = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = s.invoiceNumber.toLowerCase().includes(q) || s.customer.name.toLowerCase().includes(q) || (s.customer.shopName ?? "").toLowerCase().includes(q);
    return matchSearch && (statusFilter === "ALL" || s.status === statusFilter);
  });

  const updateLine = (idx: number, field: keyof NewSaleLine, value: string) => {
    setNewLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        if (product) { next[idx].unitId = product.baseUnitId; next[idx].unitPrice = String(product.sellingPrice); next[idx].conversionFactor = "1"; }
      }
      return next;
    });
  };

  const calcLineTotal = (line: NewSaleLine) => (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);
  const subtotal = newLines.reduce((s, l) => s + calcLineTotal(l), 0);
  const discount = parseFloat(newDiscount) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const selectedCustomer = customers.find((c) => c.id === newCustomerId);

  const handleSubmit = (postImmediately: boolean) => {
    setFormError(null); setFormWarnings([]);
    if (!newCustomerId) { setFormError("Please select a customer."); return; }
    const validLines = newLines.filter((l) => l.productId && l.unitId && parseFloat(l.qty) > 0);
    if (validLines.length === 0) { setFormError("Add at least one product line."); return; }
    startTransition(async () => {
      const res = await createSaleInvoice({
        customerId: newCustomerId, saleDate: new Date(newSaleDate), discount, notes: newNotes, postImmediately,
        lines: validLines.map((l) => ({ productId: l.productId, unitId: l.unitId, qty: parseFloat(l.qty), unitPrice: parseFloat(l.unitPrice), conversionFactor: parseFloat(l.conversionFactor) || 1 })),
      });
      if ("error" in res && res.error) { setFormError(res.error); return; }
      if ("sale" in res && res.sale) {
        if (res.warnings && res.warnings.length > 0) setFormWarnings(res.warnings);
        setSales((prev) => [{ ...res.sale, saleDate: new Date(res.sale.saleDate), lines: res.sale.lines, payments: [] } as unknown as SaleItem, ...prev]);
        setIsModalOpen(false); resetForm();
      }
    });
  };

  const handlePostDraft = (sale: SaleItem) => {
    startTransition(async () => {
      const res = await postDraftSale(sale.id);
      if ("error" in res && res.error) { alert(res.error); return; }
      if ("sale" in res) setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, status: SaleStatus.POSTED } : s));
    });
  };

  const handleCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    startTransition(async () => {
      const res = await cancelSale(cancelTarget.id, cancelReason);
      if ("error" in res && res.error) { alert(res.error); return; }
      setSales((prev) => prev.map((s) => s.id === cancelTarget.id ? { ...s, status: SaleStatus.CANCELLED } : s));
      setCancelTarget(null); setCancelReason("");
    });
  };

  const statusOptions: Array<SaleStatus | "ALL"> = ["ALL", SaleStatus.DRAFT, SaleStatus.POSTED, SaleStatus.PARTIAL, SaleStatus.PAID, SaleStatus.CANCELLED];

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div><h1 className="page-title">Sales</h1><p className="page-subtitle">Create and manage sales invoices</p></div>
        <button id="btn-new-sale" className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}><Plus size={16} />New Sale Invoice</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card"><div className="stat-label">Total Invoices</div><div className="stat-value">{sales.length}</div></div>
        <div className="stat-card"><div className="stat-label">Posted</div><div className="stat-value" style={{ color: "var(--color-success)" }}>{sales.filter(s => s.status === SaleStatus.POSTED || s.status === SaleStatus.PARTIAL || s.status === SaleStatus.PAID).length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-primary)" }}>{formatCurrency(sales.filter(s => s.status !== SaleStatus.CANCELLED && s.status !== SaleStatus.DRAFT).reduce((s,v)=>s+v.total,0))}</div></div>
        <div className="stat-card"><div className="stat-label">Outstanding</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-warning)" }}>{formatCurrency(sales.filter(s => s.status === SaleStatus.POSTED || s.status === SaleStatus.PARTIAL).reduce((s,v)=>s+v.dueAmount,0))}</div></div>
      </div>

      <div className="card" style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input id="sale-search" className="input" placeholder="Search invoice, customer…" value={search} onChange={(e)=>setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {statusOptions.map(s => <button key={s} className={`btn btn-sm ${statusFilter===s?"btn-primary":"btn-secondary"}`} onClick={()=>setStatusFilter(s)}>{s==="ALL"?"All":s.charAt(0)+s.slice(1).toLowerCase()}</button>)}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr>
              <th>Invoice</th><th>Customer</th><th>Date</th>
              <th style={{textAlign:"right"}}>Total</th><th style={{textAlign:"right"}}>Paid</th><th style={{textAlign:"right"}}>Due</th>
              <th style={{textAlign:"center"}}>Status</th><th style={{textAlign:"right"}}>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}><ShoppingBag size={32} style={{margin:"0 auto 0.5rem"}}/><div>No sales found</div></td></tr>
              ) : filtered.map(sale => (
                <tr key={sale.id}>
                  <td><div style={{fontWeight:600,fontFamily:"monospace",fontSize:"0.85rem"}}>{sale.invoiceNumber}</div><div style={{fontSize:"0.7rem",color:"var(--color-muted)"}}>{sale.lines.length} item(s)</div></td>
                  <td><div style={{fontWeight:500}}>{sale.customer.name}</div>{sale.customer.shopName && <div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>{sale.customer.shopName}</div>}</td>
                  <td style={{fontSize:"0.85rem",color:"var(--color-muted)"}}>{formatDate(sale.saleDate)}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{formatCurrency(sale.total)}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace",color:"var(--color-success)"}}>{formatCurrency(sale.paidAmount)}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace",color:sale.dueAmount>0?"var(--color-warning)":"var(--color-success)"}}>{formatCurrency(sale.dueAmount)}</td>
                  <td style={{textAlign:"center"}}><span className={getStatusClass(sale.status)}>{sale.status}</span></td>
                  <td style={{textAlign:"right"}}>
                    <div style={{display:"flex",justifyContent:"flex-end",gap:"0.5rem"}}>
                      <button className="btn btn-ghost btn-icon" title="View" onClick={()=>setViewingSale(sale)}><Eye size={15}/></button>
                      {sale.status===SaleStatus.DRAFT && <button className="btn btn-ghost btn-icon" title="Post" onClick={()=>handlePostDraft(sale)} disabled={isPending}><Send size={15}/></button>}
                      {(sale.status===SaleStatus.DRAFT||sale.status===SaleStatus.POSTED) && <button className="btn btn-ghost btn-icon btn-danger" title="Cancel" onClick={()=>{setCancelTarget(sale);setCancelReason("");}}><XCircle size={15}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={()=>setIsModalOpen(false)}>
          <div className="modal" style={{maxWidth:"860px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Sale Invoice</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setIsModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{maxHeight:"72vh",overflowY:"auto"}}>
              {formError && <div className="alert alert-error" style={{marginBottom:"1rem"}}><AlertCircle size={16}/> {formError}</div>}
              {formWarnings.map((w,i) => <div key={i} className="alert alert-warning" style={{marginBottom:"0.5rem"}}><AlertTriangle size={16}/> {w}</div>)}
              <div className="form-grid-2" style={{marginBottom:"1.25rem"}}>
                <div className="form-group">
                  <label className="form-label">Customer <span style={{color:"var(--color-danger)"}}>*</span></label>
                  <select id="sale-customer" className="input" value={newCustomerId} onChange={e=>setNewCustomerId(e.target.value)} required>
                    <option value="">— Select Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.shopName?` (${c.shopName})`:""}</option>)}
                  </select>
                  {selectedCustomer && selectedCustomer.creditLimit > 0 && (
                    <div style={{fontSize:"0.75rem",marginTop:"0.25rem",color:"var(--color-muted)"}}>
                      Limit: {formatCurrency(selectedCustomer.creditLimit)} | Outstanding: {formatCurrency(selectedCustomer.currentBalance)}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Date</label>
                  <input id="sale-date" className="input" type="date" value={newSaleDate} onChange={e=>setNewSaleDate(e.target.value)} />
                </div>
              </div>

              <div style={{marginBottom:"1rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                  <label className="form-label" style={{margin:0}}>Products <span style={{color:"var(--color-danger)"}}>*</span></label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setNewLines(p=>[...p,emptyLine()])}><Plus size={14}/> Add Line</button>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem"}}>
                    <thead><tr style={{borderBottom:"1px solid var(--color-border)"}}>
                      <th style={{padding:"0.5rem",textAlign:"left",color:"var(--color-muted)",fontWeight:500}}>Product</th>
                      <th style={{padding:"0.5rem",textAlign:"left",color:"var(--color-muted)",fontWeight:500}}>Unit</th>
                      <th style={{padding:"0.5rem",textAlign:"right",color:"var(--color-muted)",fontWeight:500,width:"90px"}}>Qty</th>
                      <th style={{padding:"0.5rem",textAlign:"right",color:"var(--color-muted)",fontWeight:500,width:"120px"}}>Price</th>
                      <th style={{padding:"0.5rem",textAlign:"right",color:"var(--color-muted)",fontWeight:500,width:"110px"}}>Total</th>
                      <th style={{width:"36px"}}></th>
                    </tr></thead>
                    <tbody>
                      {newLines.map((line, idx) => {
                        const sp = products.find(p=>p.id===line.productId);
                        return (
                          <tr key={idx} style={{borderBottom:"1px solid var(--color-border)"}}>
                            <td style={{padding:"0.4rem"}}>
                              <select className="input" style={{minWidth:"170px"}} value={line.productId} onChange={e=>updateLine(idx,"productId",e.target.value)}>
                                <option value="">— Product —</option>
                                {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.currentStock.toFixed(1)}</option>)}
                              </select>
                            </td>
                            <td style={{padding:"0.4rem"}}>
                              <select className="input" style={{minWidth:"80px"}} value={line.unitId} onChange={e=>updateLine(idx,"unitId",e.target.value)}>
                                <option value="">— Unit —</option>
                                {units.map(u=><option key={u.id} value={u.id}>{u.symbol}</option>)}
                              </select>
                            </td>
                            <td style={{padding:"0.4rem"}}>
                              <input className="input" type="number" min="0.01" step="0.01" style={{textAlign:"right"}} value={line.qty} onChange={e=>updateLine(idx,"qty",e.target.value)} />
                              {sp && <div style={{fontSize:"0.7rem",color:parseFloat(line.qty)>sp.currentStock?"var(--color-danger)":"var(--color-muted)",textAlign:"right"}}>Avail:{sp.currentStock.toFixed(1)}</div>}
                            </td>
                            <td style={{padding:"0.4rem"}}>
                              <input className="input" type="number" min="0" step="0.01" style={{textAlign:"right"}} value={line.unitPrice} onChange={e=>updateLine(idx,"unitPrice",e.target.value)} />
                            </td>
                            <td style={{padding:"0.4rem",textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{formatCurrency(calcLineTotal(line))}</td>
                            <td style={{padding:"0.4rem"}}>
                              {newLines.length>1 && <button type="button" className="btn btn-ghost btn-icon btn-danger" onClick={()=>setNewLines(p=>p.filter((_,i)=>i!==idx))}><Trash2 size={14}/></button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{marginTop:"1rem",display:"flex",justifyContent:"flex-end"}}>
                  <div style={{minWidth:"260px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem",color:"var(--color-muted)"}}><span>Subtotal</span><span style={{fontFamily:"monospace"}}>{formatCurrency(subtotal)}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem",alignItems:"center"}}>
                      <span style={{color:"var(--color-muted)"}}>Discount (NPR)</span>
                      <input id="sale-discount" className="input" type="number" min="0" step="0.01" value={newDiscount} onChange={e=>setNewDiscount(e.target.value)} style={{width:"110px",textAlign:"right"}} />
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid var(--color-border)",paddingTop:"0.5rem",fontWeight:700,fontSize:"1.05rem"}}>
                      <span>Grand Total</span><span style={{fontFamily:"monospace",color:"var(--color-primary)"}}>{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea id="sale-notes" className="input" rows={2} placeholder="Optional remarks…" value={newNotes} onChange={e=>setNewNotes(e.target.value)} style={{resize:"vertical"}} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={()=>setIsModalOpen(false)}>Cancel</button>
              <button id="btn-save-draft-sale" type="button" className="btn btn-secondary" disabled={isPending} onClick={()=>handleSubmit(false)}>
                {isPending?<Loader2 size={16} className="spin"/>:<Clock size={16}/>} Save Draft
              </button>
              <button id="btn-post-sale" type="button" className="btn btn-primary" disabled={isPending} onClick={()=>handleSubmit(true)}>
                {isPending?<Loader2 size={16} className="spin"/>:<Send size={16}/>} Post Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingSale && (
        <div className="modal-overlay" onClick={()=>setViewingSale(null)}>
          <div className="modal" style={{maxWidth:"700px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div><h2 className="modal-title">{viewingSale.invoiceNumber}</h2><span className={getStatusClass(viewingSale.status)}>{viewingSale.status}</span></div>
              <button className="btn btn-ghost btn-icon" onClick={()=>setViewingSale(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2" style={{marginBottom:"1rem"}}>
                <div><div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>Customer</div><div style={{fontWeight:600}}>{viewingSale.customer.name}</div>{viewingSale.customer.shopName&&<div style={{fontSize:"0.8rem"}}>{viewingSale.customer.shopName}</div>}</div>
                <div><div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>Date</div><div style={{fontWeight:500}}>{formatDate(viewingSale.saleDate)}</div></div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem",marginBottom:"1rem"}}>
                <thead><tr style={{borderBottom:"2px solid var(--color-border)"}}>
                  <th style={{padding:"0.5rem 0.25rem",textAlign:"left"}}>Product</th>
                  <th style={{padding:"0.5rem 0.25rem",textAlign:"right"}}>Qty</th>
                  <th style={{padding:"0.5rem 0.25rem",textAlign:"right"}}>Price</th>
                  <th style={{padding:"0.5rem 0.25rem",textAlign:"right"}}>Total</th>
                </tr></thead>
                <tbody>
                  {viewingSale.lines.map(line => (
                    <tr key={line.id} style={{borderBottom:"1px solid var(--color-border)"}}>
                      <td style={{padding:"0.5rem 0.25rem"}}><div style={{fontWeight:500}}>{line.product.name}</div><div style={{fontSize:"0.7rem",color:"var(--color-muted)"}}>{line.product.sku}</div></td>
                      <td style={{padding:"0.5rem 0.25rem",textAlign:"right",fontFamily:"monospace"}}>{line.qty} {line.unit.symbol}</td>
                      <td style={{padding:"0.5rem 0.25rem",textAlign:"right",fontFamily:"monospace"}}>{formatCurrency(line.unitPrice)}</td>
                      <td style={{padding:"0.5rem 0.25rem",textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{formatCurrency(line.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <div style={{minWidth:"240px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.35rem",color:"var(--color-muted)"}}><span>Subtotal</span><span style={{fontFamily:"monospace"}}>{formatCurrency(viewingSale.subtotal)}</span></div>
                  {viewingSale.discount>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.35rem",color:"var(--color-muted)"}}><span>Discount</span><span style={{fontFamily:"monospace"}}>- {formatCurrency(viewingSale.discount)}</span></div>}
                  <div style={{display:"flex",justifyContent:"space-between",borderTop:"2px solid var(--color-border)",paddingTop:"0.4rem",fontWeight:700}}><span>Total</span><span style={{fontFamily:"monospace",color:"var(--color-primary)"}}>{formatCurrency(viewingSale.total)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.35rem",color:"var(--color-success)"}}><span>Paid</span><span style={{fontFamily:"monospace"}}>{formatCurrency(viewingSale.paidAmount)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",color:viewingSale.dueAmount>0?"var(--color-warning)":"var(--color-success)",fontWeight:600}}><span>Due</span><span style={{fontFamily:"monospace"}}>{formatCurrency(viewingSale.dueAmount)}</span></div>
                </div>
              </div>
              {viewingSale.notes&&<div style={{marginTop:"1rem",padding:"0.75rem",background:"var(--color-bg-subtle)",borderRadius:"0.5rem",fontSize:"0.85rem"}}><strong>Notes:</strong> {viewingSale.notes}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setViewingSale(null)}>Close</button></div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="modal-overlay" onClick={()=>setCancelTarget(null)}>
          <div className="modal" style={{maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Cancel Invoice</h2></div>
            <div className="modal-body">
              <p style={{marginBottom:"1rem",color:"var(--color-muted)"}}>Cancel <strong>{cancelTarget.invoiceNumber}</strong>?{cancelTarget.status===SaleStatus.POSTED&&" Stock will be restored."}</p>
              <div className="form-group">
                <label className="form-label">Reason <span style={{color:"var(--color-danger)"}}>*</span></label>
                <input id="cancel-reason" className="input" placeholder="Cancellation reason" value={cancelReason} onChange={e=>setCancelReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setCancelTarget(null)}>Back</button>
              <button id="btn-confirm-cancel-sale" className="btn btn-danger" disabled={isPending||!cancelReason.trim()} onClick={handleCancel}>
                {isPending?<Loader2 size={16} className="spin"/>:<XCircle size={16}/>} Cancel Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
