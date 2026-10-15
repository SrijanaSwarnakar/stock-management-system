"use client";
import React, { useState, useTransition } from "react";
import { PaymentMethod } from "@prisma/client";
import { recordSupplierPayment } from "@/app/actions/payment-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, Plus, Search, X, Loader2, AlertCircle, Send, Banknote, Landmark, CreditCard, Smartphone } from "lucide-react";

export interface SupplierPaymentItem {
  id: string; paymentNumber: string; supplierId: string; purchaseId: string | null;
  amount: number; paymentMethod: PaymentMethod; paymentDate: Date;
  referenceNo: string | null; notes: string | null;
  supplier: { id: string; name: string; companyName: string | null };
  purchase: { id: string; invoiceNumber: string; total: number } | null;
  createdBy: { id: string; name: string };
}

interface MadeClientProps {
  initialPayments: SupplierPaymentItem[];
  suppliers: Array<{ id: string; name: string; companyName: string | null; currentBalance: number }>;
  openPurchases: Array<{ id: string; invoiceNumber: string; supplierId: string; total: number; dueAmount: number }>;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={13}/>, BANK_TRANSFER: <Landmark size={13}/>, CHEQUE: <CreditCard size={13}/>,
  ESEWA: <Smartphone size={13}/>, KHALTI: <Smartphone size={13}/>, OTHER: <CreditCard size={13}/>,
};

const emptyForm: {
  supplierId: string;
  purchaseId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNo: string;
  notes: string;
} = { supplierId: "", purchaseId: "", amount: "", paymentMethod: PaymentMethod.CASH, paymentDate: new Date().toISOString().split("T")[0], referenceNo: "", notes: "" };

export default function MadeClient({ initialPayments, suppliers, openPurchases }: MadeClientProps) {
  const [payments, setPayments] = useState<SupplierPaymentItem[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return p.paymentNumber.toLowerCase().includes(q) || p.supplier.name.toLowerCase().includes(q) || (p.supplier.companyName??'').toLowerCase().includes(q);
  });

  const supplierPurchases = openPurchases.filter(p => p.supplierId === formData.supplierId && p.dueAmount > 0.01);
  const selectedPurchase = openPurchases.find(p => p.id === formData.purchaseId);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await recordSupplierPayment({
        supplierId: formData.supplierId,
        purchaseId: formData.purchaseId || undefined,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(formData.paymentDate),
        referenceNo: formData.referenceNo,
        notes: formData.notes,
      });
      if ("error" in res && res.error) { setFormError(res.error); return; }
      if ("payment" in res && res.payment) {
        setPayments(prev => [{ ...res.payment, paymentDate: new Date(res.payment.paymentDate) } as SupplierPaymentItem, ...prev]);
        setIsModalOpen(false);
        setFormData(emptyForm);
      }
    });
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div><h1 className="page-title">Payments Made</h1><p className="page-subtitle">Record payments to suppliers against purchase invoices</p></div>
        <button id="btn-new-payment-made" className="btn btn-primary" onClick={() => { setFormData(emptyForm); setFormError(null); setIsModalOpen(true); }}><Plus size={16}/>Record Payment</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card"><div className="stat-label">Total Records</div><div className="stat-value">{payments.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Paid Out</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-danger)" }}>{formatCurrency(totalPaid)}</div></div>
        <div className="stat-card"><div className="stat-label">Supplier Payables</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-warning)" }}>{formatCurrency(suppliers.reduce((s,sp) => s + sp.currentBalance, 0))}</div></div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}/>
          <input id="made-search" className="input" placeholder="Search by payment no., supplier…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr>
              <th>Payment No.</th><th>Supplier</th><th>Linked Invoice</th><th>Date</th>
              <th style={{textAlign:"center"}}>Method</th><th style={{textAlign:"right"}}>Amount</th><th>Ref / Notes</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}><Wallet size={32} style={{margin:"0 auto 0.5rem"}}/><div>No payments recorded</div></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td><div style={{fontFamily:"monospace",fontWeight:600,fontSize:"0.85rem"}}>{p.paymentNumber}</div></td>
                  <td><div style={{fontWeight:500}}>{p.supplier.name}</div>{p.supplier.companyName&&<div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>{p.supplier.companyName}</div>}</td>
                  <td>{p.purchase ? <span style={{fontFamily:"monospace",fontSize:"0.8rem"}}>{p.purchase.invoiceNumber}</span> : <span style={{color:"var(--color-muted)",fontSize:"0.8rem"}}>General</span>}</td>
                  <td style={{fontSize:"0.85rem",color:"var(--color-muted)"}}>{formatDate(p.paymentDate)}</td>
                  <td style={{textAlign:"center"}}>
                    <span className="badge badge-neutral" style={{gap:"4px",display:"inline-flex",alignItems:"center"}}>{METHOD_ICONS[p.paymentMethod]} {p.paymentMethod.replace(/_/g," ")}</span>
                  </td>
                  <td style={{textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"var(--color-danger)"}}>{formatCurrency(p.amount)}</td>
                  <td style={{fontSize:"0.8rem",color:"var(--color-muted)"}}>{p.referenceNo || p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={()=>setIsModalOpen(false)}>
          <div className="modal" style={{maxWidth:"520px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record Supplier Payment</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setIsModalOpen(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" style={{marginBottom:"1rem"}}><AlertCircle size={16}/> {formError}</div>}
                <div className="form-grid-2">
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Supplier <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="made-supplier" className="input" value={formData.supplierId} onChange={e=>setFormData(p=>({...p,supplierId:e.target.value,purchaseId:""}))} required>
                      <option value="">— Select Supplier —</option>
                      {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.companyName?` (${s.companyName})`:""} — Due: {formatCurrency(s.currentBalance)}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Against Invoice (optional)</label>
                    <select id="made-purchase" className="input" value={formData.purchaseId} onChange={e=>{
                      const pur = openPurchases.find(p=>p.id===e.target.value);
                      setFormData(p=>({...p,purchaseId:e.target.value,amount:pur?String(pur.dueAmount.toFixed(2)):p.amount}));
                    }}>
                      <option value="">— General Payment —</option>
                      {supplierPurchases.map(p=><option key={p.id} value={p.id}>{p.invoiceNumber} (Due: {formatCurrency(p.dueAmount)})</option>)}
                    </select>
                    {selectedPurchase && <div style={{fontSize:"0.75rem",marginTop:"0.25rem",color:"var(--color-muted)"}}>Invoice total: {formatCurrency(selectedPurchase.total)} | Outstanding: {formatCurrency(selectedPurchase.dueAmount)}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (NPR) <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <input id="made-amount" className="input" type="number" min="0.01" step="0.01" placeholder="0.00" value={formData.amount} onChange={e=>setFormData(p=>({...p,amount:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input id="made-date" className="input" type="date" value={formData.paymentDate} onChange={e=>setFormData(p=>({...p,paymentDate:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="made-method" className="input" value={formData.paymentMethod} onChange={e=>setFormData(p=>({...p,paymentMethod:e.target.value as PaymentMethod}))}>
                      {Object.values(PaymentMethod).map(m=><option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference No.</label>
                    <input id="made-ref" className="input" placeholder="Cheque no., txn ID…" value={formData.referenceNo} onChange={e=>setFormData(p=>({...p,referenceNo:e.target.value}))}/>
                  </div>
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Notes</label>
                    <input id="made-notes" className="input" placeholder="Optional remarks" value={formData.notes} onChange={e=>setFormData(p=>({...p,notes:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setIsModalOpen(false)}>Cancel</button>
                <button id="btn-save-payment-made" type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending?<Loader2 size={16} className="spin"/>:<Send size={16}/>} Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
