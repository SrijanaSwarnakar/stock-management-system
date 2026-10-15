"use client";
import React, { useState, useTransition } from "react";
import { PaymentMethod } from "@prisma/client";
import { recordCustomerPayment } from "@/app/actions/payment-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Banknote, Plus, Search, X, Loader2, AlertCircle, CheckCircle2, CreditCard, Landmark, Smartphone } from "lucide-react";

export interface CustomerPaymentItem {
  id: string; paymentNumber: string; customerId: string; saleId: string | null;
  amount: number; paymentMethod: PaymentMethod; paymentDate: Date;
  referenceNo: string | null; notes: string | null;
  customer: { id: string; name: string; shopName: string | null };
  sale: { id: string; invoiceNumber: string; total: number } | null;
  createdBy: { id: string; name: string };
}

interface ReceivedClientProps {
  initialPayments: CustomerPaymentItem[];
  customers: Array<{ id: string; name: string; shopName: string | null; currentBalance: number }>;
  openSales: Array<{ id: string; invoiceNumber: string; customerId: string; total: number; dueAmount: number }>;
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={13}/>,
  BANK_TRANSFER: <Landmark size={13}/>,
  CHEQUE: <CreditCard size={13}/>,
  ESEWA: <Smartphone size={13}/>,
  KHALTI: <Smartphone size={13}/>,
  OTHER: <CreditCard size={13}/>,
};

const emptyForm: {
  customerId: string;
  saleId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNo: string;
  notes: string;
} = { customerId: "", saleId: "", amount: "", paymentMethod: PaymentMethod.CASH, paymentDate: new Date().toISOString().split("T")[0], referenceNo: "", notes: "" };

export default function ReceivedClient({ initialPayments, customers, openSales }: ReceivedClientProps) {
  const [payments, setPayments] = useState<CustomerPaymentItem[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return p.paymentNumber.toLowerCase().includes(q) || p.customer.name.toLowerCase().includes(q) || (p.customer.shopName??'').toLowerCase().includes(q);
  });

  const customerSales = openSales.filter(s => s.customerId === formData.customerId && s.dueAmount > 0.01);
  const selectedSale = openSales.find(s => s.id === formData.saleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await recordCustomerPayment({
        customerId: formData.customerId,
        saleId: formData.saleId || undefined,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(formData.paymentDate),
        referenceNo: formData.referenceNo,
        notes: formData.notes,
      });
      if ("error" in res && res.error) { setFormError(res.error); return; }
      if ("payment" in res && res.payment) {
        setPayments(prev => [{ ...res.payment, paymentDate: new Date(res.payment.paymentDate) } as CustomerPaymentItem, ...prev]);
        setIsModalOpen(false);
        setFormData(emptyForm);
      }
    });
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div><h1 className="page-title">Payments Received</h1><p className="page-subtitle">Record customer receipts against sales invoices</p></div>
        <button id="btn-new-payment-received" className="btn btn-primary" onClick={() => { setFormData(emptyForm); setFormError(null); setIsModalOpen(true); }}><Plus size={16}/>Record Payment</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card"><div className="stat-label">Total Records</div><div className="stat-value">{payments.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Received</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-success)" }}>{formatCurrency(totalReceived)}</div></div>
        <div className="stat-card"><div className="stat-label">Total Outstanding</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-warning)" }}>{formatCurrency(customers.reduce((s,c) => s + c.currentBalance, 0))}</div></div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}/>
          <input id="rcpt-search" className="input" placeholder="Search by receipt no., customer…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr>
              <th>Receipt No.</th><th>Customer</th><th>Linked Invoice</th><th>Date</th>
              <th style={{textAlign:"center"}}>Method</th><th style={{textAlign:"right"}}>Amount</th><th>Ref / Notes</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}><Banknote size={32} style={{margin:"0 auto 0.5rem"}}/><div>No payments recorded</div></td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td><div style={{fontFamily:"monospace",fontWeight:600,fontSize:"0.85rem"}}>{p.paymentNumber}</div></td>
                  <td><div style={{fontWeight:500}}>{p.customer.name}</div>{p.customer.shopName&&<div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>{p.customer.shopName}</div>}</td>
                  <td>{p.sale ? <span style={{fontFamily:"monospace",fontSize:"0.8rem"}}>{p.sale.invoiceNumber}</span> : <span style={{color:"var(--color-muted)",fontSize:"0.8rem"}}>General</span>}</td>
                  <td style={{fontSize:"0.85rem",color:"var(--color-muted)"}}>{formatDate(p.paymentDate)}</td>
                  <td style={{textAlign:"center"}}>
                    <span className="badge badge-neutral" style={{gap:"4px",display:"inline-flex",alignItems:"center"}}>{METHOD_ICONS[p.paymentMethod]} {p.paymentMethod.replace("_"," ")}</span>
                  </td>
                  <td style={{textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"var(--color-success)"}}>{formatCurrency(p.amount)}</td>
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
              <h2 className="modal-title">Record Payment Received</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setIsModalOpen(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" style={{marginBottom:"1rem"}}><AlertCircle size={16}/> {formError}</div>}
                <div className="form-grid-2">
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Customer <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="rcpt-customer" className="input" value={formData.customerId} onChange={e=>setFormData(p=>({...p,customerId:e.target.value,saleId:""}))} required>
                      <option value="">— Select Customer —</option>
                      {customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.shopName?` (${c.shopName})`:""} — Due: {formatCurrency(c.currentBalance)}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Against Invoice (optional)</label>
                    <select id="rcpt-sale" className="input" value={formData.saleId} onChange={e=>{
                      const sale = openSales.find(s=>s.id===e.target.value);
                      setFormData(p=>({...p,saleId:e.target.value,amount:sale?String(sale.dueAmount.toFixed(2)):p.amount}));
                    }}>
                      <option value="">— General Payment —</option>
                      {customerSales.map(s=><option key={s.id} value={s.id}>{s.invoiceNumber} (Due: {formatCurrency(s.dueAmount)})</option>)}
                    </select>
                    {selectedSale && <div style={{fontSize:"0.75rem",marginTop:"0.25rem",color:"var(--color-muted)"}}>Invoice total: {formatCurrency(selectedSale.total)} | Outstanding: {formatCurrency(selectedSale.dueAmount)}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (NPR) <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <input id="rcpt-amount" className="input" type="number" min="0.01" step="0.01" placeholder="0.00" value={formData.amount} onChange={e=>setFormData(p=>({...p,amount:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input id="rcpt-date" className="input" type="date" value={formData.paymentDate} onChange={e=>setFormData(p=>({...p,paymentDate:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="rcpt-method" className="input" value={formData.paymentMethod} onChange={e=>setFormData(p=>({...p,paymentMethod:e.target.value as PaymentMethod}))}>
                      {Object.values(PaymentMethod).map(m=><option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference No.</label>
                    <input id="rcpt-ref" className="input" placeholder="Cheque no., txn ID…" value={formData.referenceNo} onChange={e=>setFormData(p=>({...p,referenceNo:e.target.value}))}/>
                  </div>
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Notes</label>
                    <input id="rcpt-notes" className="input" placeholder="Optional remarks" value={formData.notes} onChange={e=>setFormData(p=>({...p,notes:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setIsModalOpen(false)}>Cancel</button>
                <button id="btn-save-payment-received" type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending?<Loader2 size={16} className="spin"/>:<CheckCircle2 size={16}/>} Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
