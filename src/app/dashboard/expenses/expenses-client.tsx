"use client";
import React, { useState, useTransition } from "react";
import { PaymentMethod } from "@prisma/client";
import { createExpense, updateExpense, deleteExpense, createExpenseCategory } from "@/app/actions/expense-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt, Plus, Search, Edit2, Trash2, X, Loader2, AlertCircle, Tag, Filter, Banknote, Landmark, CreditCard, Smartphone
} from "lucide-react";

export interface ExpenseItem {
  id: string; categoryId: string; description: string; amount: number;
  paymentMethod: PaymentMethod; expenseDate: Date; referenceNo: string | null;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
}

export interface ExpenseCategoryItem {
  id: string; name: string; description: string | null; isActive: boolean;
}

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  initialCategories: ExpenseCategoryItem[];
}

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CASH: <Banknote size={13}/>, BANK_TRANSFER: <Landmark size={13}/>, CHEQUE: <CreditCard size={13}/>,
  ESEWA: <Smartphone size={13}/>, KHALTI: <Smartphone size={13}/>, OTHER: <CreditCard size={13}/>,
};

const emptyForm: {
  categoryId: string;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  referenceNo: string;
} = { categoryId: "", description: "", amount: "", paymentMethod: PaymentMethod.CASH, expenseDate: new Date().toISOString().split("T")[0], referenceNo: "" };

export default function ExpensesClient({ initialExpenses, initialCategories }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = e.description.toLowerCase().includes(q) || e.category.name.toLowerCase().includes(q) || (e.referenceNo??'').toLowerCase().includes(q);
    const matchCat = catFilter === "ALL" || e.categoryId === catFilter;
    return matchSearch && matchCat;
  });

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  const openCreate = () => {
    setEditingExpense(null);
    setFormData(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setFormData({
      categoryId: expense.categoryId, description: expense.description,
      amount: String(expense.amount), paymentMethod: expense.paymentMethod,
      expenseDate: new Date(expense.expenseDate).toISOString().split("T")[0],
      referenceNo: expense.referenceNo ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null);
    startTransition(async () => {
      if (editingExpense) {
        const res = await updateExpense(editingExpense.id, {
          categoryId: formData.categoryId, description: formData.description,
          amount: parseFloat(formData.amount), paymentMethod: formData.paymentMethod,
          expenseDate: new Date(formData.expenseDate), referenceNo: formData.referenceNo,
        });
        if ("error" in res && res.error) { setFormError(res.error); return; }
        if ("expense" in res && res.expense) {
          setExpenses(prev => prev.map(ex => ex.id === editingExpense.id ? { ...res.expense, expenseDate: new Date(res.expense.expenseDate) } as ExpenseItem : ex));
          setIsModalOpen(false);
        }
      } else {
        const res = await createExpense({
          categoryId: formData.categoryId, description: formData.description,
          amount: parseFloat(formData.amount), paymentMethod: formData.paymentMethod,
          expenseDate: new Date(formData.expenseDate), referenceNo: formData.referenceNo,
        });
        if ("error" in res && res.error) { setFormError(res.error); return; }
        if ("expense" in res && res.expense) {
          setExpenses(prev => [{ ...res.expense, expenseDate: new Date(res.expense.expenseDate) } as ExpenseItem, ...prev]);
          setIsModalOpen(false);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteExpense(id);
      if ("error" in res && res.error) { alert(res.error); return; }
      setExpenses(prev => prev.filter(e => e.id !== id));
      setDeleteConfirm(null);
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault(); setCatError(null);
    startTransition(async () => {
      const res = await createExpenseCategory({ name: newCatName, description: newCatDesc });
      if ("error" in res && res.error) { setCatError(res.error); return; }
      if ("category" in res && res.category) {
        setCategories(prev => [...prev, { ...res.category, isActive: true }]);
        setNewCatName(""); setNewCatDesc(""); setIsCatModalOpen(false);
      }
    });
  };

  const catBreakdown = categories.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.categoryId === cat.id).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">Track operating costs by category</p></div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button id="btn-manage-categories" className="btn btn-secondary" onClick={() => { setIsCatModalOpen(true); setCatError(null); setNewCatName(""); setNewCatDesc(""); }}><Tag size={16}/>Categories</button>
          <button id="btn-add-expense" className="btn btn-primary" onClick={openCreate}><Plus size={16}/>Add Expense</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="stat-card"><div className="stat-label">Total Entries</div><div className="stat-value">{expenses.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Expenses</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-danger)" }}>{formatCurrency(totalAll)}</div></div>
        <div className="stat-card"><div className="stat-label">Filtered Total</div><div className="stat-value" style={{ fontSize: "0.9rem", color: "var(--color-warning)" }}>{formatCurrency(totalExpenses)}</div></div>
        <div className="stat-card"><div className="stat-label">Categories</div><div className="stat-value">{categories.length}</div></div>
      </div>

      {catBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expense Breakdown</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {catBreakdown.map(cat => (
              <div key={cat.id} style={{ background: "var(--color-bg-subtle)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", cursor: "pointer", border: catFilter === cat.id ? "2px solid var(--color-primary)" : "2px solid transparent" }}
                onClick={() => setCatFilter(c => c === cat.id ? "ALL" : cat.id)}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{cat.name}</div>
                <div style={{ fontFamily: "monospace", color: "var(--color-danger)", fontSize: "0.8rem" }}>{formatCurrency(cat.total)}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>{cat.count} entries</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}/>
          <input id="expense-search" className="input" placeholder="Search description, category…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
        </div>
        <select id="expense-cat-filter" className="input" style={{ width: "auto", minWidth: "180px" }} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="ALL">All Categories</option>
          {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead><tr>
              <th>Date</th><th>Category</th><th>Description</th>
              <th style={{textAlign:"center"}}>Method</th><th style={{textAlign:"right"}}>Amount</th>
              <th>Reference</th><th>By</th><th style={{textAlign:"right"}}>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:"3rem",color:"var(--color-muted)"}}><Receipt size={32} style={{margin:"0 auto 0.5rem"}}/><div>No expenses found</div></td></tr>
              ) : filtered.map(expense => (
                <tr key={expense.id}>
                  <td style={{fontSize:"0.85rem",color:"var(--color-muted)"}}>{formatDate(expense.expenseDate)}</td>
                  <td><span className="badge badge-neutral">{expense.category.name}</span></td>
                  <td style={{maxWidth:"220px"}}><div style={{fontWeight:500,fontSize:"0.875rem"}}>{expense.description}</div></td>
                  <td style={{textAlign:"center"}}>
                    <span className="badge badge-neutral" style={{gap:"4px",display:"inline-flex",alignItems:"center"}}>{METHOD_ICONS[expense.paymentMethod]} {expense.paymentMethod.replace(/_/g," ")}</span>
                  </td>
                  <td style={{textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"var(--color-danger)"}}>{formatCurrency(expense.amount)}</td>
                  <td style={{fontSize:"0.8rem",color:"var(--color-muted)"}}>{expense.referenceNo || "—"}</td>
                  <td style={{fontSize:"0.8rem",color:"var(--color-muted)"}}>{expense.createdBy.name}</td>
                  <td style={{textAlign:"right"}}>
                    <div style={{display:"flex",justifyContent:"flex-end",gap:"0.5rem"}}>
                      <button className="btn btn-ghost btn-icon" title="Edit" onClick={()=>openEdit(expense)}><Edit2 size={15}/></button>
                      <button className="btn btn-ghost btn-icon btn-danger" title="Delete" onClick={()=>setDeleteConfirm(expense.id)}><Trash2 size={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
                  <td colSpan={4} style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>Filtered Total</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--color-danger)" }}>{formatCurrency(totalExpenses)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Expense Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={()=>setIsModalOpen(false)}>
          <div className="modal" style={{maxWidth:"520px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingExpense?"Edit Expense":"Add Expense"}</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setIsModalOpen(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" style={{marginBottom:"1rem"}}><AlertCircle size={16}/> {formError}</div>}
                <div className="form-grid-2">
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Category <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="expense-category" className="input" value={formData.categoryId} onChange={e=>setFormData(p=>({...p,categoryId:e.target.value}))} required>
                      <option value="">— Select Category —</option>
                      {categories.filter(c=>c.isActive).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Description <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <input id="expense-description" className="input" placeholder="e.g. Office rent, Vehicle fuel" value={formData.description} onChange={e=>setFormData(p=>({...p,description:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (NPR) <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <input id="expense-amount" className="input" type="number" min="0.01" step="0.01" placeholder="0.00" value={formData.amount} onChange={e=>setFormData(p=>({...p,amount:e.target.value}))} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input id="expense-date" className="input" type="date" value={formData.expenseDate} onChange={e=>setFormData(p=>({...p,expenseDate:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method <span style={{color:"var(--color-danger)"}}>*</span></label>
                    <select id="expense-method" className="input" value={formData.paymentMethod} onChange={e=>setFormData(p=>({...p,paymentMethod:e.target.value as PaymentMethod}))}>
                      {Object.values(PaymentMethod).map(m=><option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference No.</label>
                    <input id="expense-ref" className="input" placeholder="Bill no., voucher ID…" value={formData.referenceNo} onChange={e=>setFormData(p=>({...p,referenceNo:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setIsModalOpen(false)}>Cancel</button>
                <button id="btn-save-expense" type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending?<Loader2 size={16} className="spin"/>:null}{editingExpense?"Save Changes":"Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="modal-overlay" onClick={()=>setIsCatModalOpen(false)}>
          <div className="modal" style={{maxWidth:"440px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Expense Categories</h2>
              <button className="btn btn-ghost btn-icon" onClick={()=>setIsCatModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{marginBottom:"1rem"}}>
                {categories.length === 0 && <p style={{color:"var(--color-muted)",fontSize:"0.875rem"}}>No categories yet. Add one below.</p>}
                {categories.map(cat => (
                  <div key={cat.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid var(--color-border)"}}>
                    <div><div style={{fontWeight:500}}>{cat.name}</div>{cat.description&&<div style={{fontSize:"0.75rem",color:"var(--color-muted)"}}>{cat.description}</div>}</div>
                    <span className={cat.isActive?"badge badge-success":"badge badge-neutral"}>{cat.isActive?"Active":"Inactive"}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddCategory}>
                <div style={{background:"var(--color-bg-subtle)",borderRadius:"0.5rem",padding:"1rem"}}>
                  <div style={{fontWeight:600,fontSize:"0.875rem",marginBottom:"0.75rem"}}>Add New Category</div>
                  {catError && <div className="alert alert-error" style={{marginBottom:"0.75rem"}}><AlertCircle size={14}/> {catError}</div>}
                  <div className="form-group">
                    <input id="cat-name" className="input" placeholder="Category name" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required/>
                  </div>
                  <div className="form-group">
                    <input id="cat-desc" className="input" placeholder="Description (optional)" value={newCatDesc} onChange={e=>setNewCatDesc(e.target.value)}/>
                  </div>
                  <button id="btn-add-expense-category" type="submit" className="btn btn-primary btn-sm" disabled={isPending || !newCatName.trim()}>
                    {isPending?<Loader2 size={14} className="spin"/>:<Plus size={14}/>} Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={()=>setDeleteConfirm(null)}>
          <div className="modal" style={{maxWidth:"400px"}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Delete Expense</h2></div>
            <div className="modal-body"><p style={{color:"var(--color-muted)"}}>Permanently delete this expense entry? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button id="btn-confirm-delete-expense" className="btn btn-danger" disabled={isPending} onClick={()=>handleDelete(deleteConfirm)}>
                {isPending?<Loader2 size={16} className="spin"/>:<Trash2 size={15}/>} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
