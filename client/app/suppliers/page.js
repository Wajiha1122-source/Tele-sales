"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, MessageSquareText, PackageCheck, Plus, Search, Tags } from "lucide-react";
import Shell from "../../components/Shell";
import { Button, Card, Notice, Status } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api, titleize } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

const stages = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "SUPPLIED", "ON_HOLD", "LOST"];
const emptyForm = {
  categoryId: "",
  companyName: "",
  contactPerson: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  productInterest: "",
  supplyStage: "NEW",
  expectedValue: "",
  nextFollowupDate: "",
  notes: ""
};
const emptyCategory = { name: "", description: "" };

function toForm(row) {
  return {
    categoryId: row.category_id || "",
    companyName: row.company_name || "",
    contactPerson: row.contact_person || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    city: row.city || "",
    productInterest: row.product_interest || "",
    supplyStage: row.supply_stage || "NEW",
    expectedValue: row.expected_value || "",
    nextFollowupDate: row.next_followup_date ? row.next_followup_date.slice(0, 10) : "",
    notes: row.notes || ""
  };
}

export default function SuppliersPage() {
  const user = useSession();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isExecutive = user?.role === "EXECUTIVE";
  const isCeo = user?.role === "CEO";

  const groupedSuppliers = useMemo(() => {
    const groups = new Map();
    suppliers.forEach((item) => {
      const key = item.category_id || "uncategorized";
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: item.category_name || "Uncategorized",
          items: [],
          totalValue: 0
        });
      }
      const group = groups.get(key);
      group.items.push(item);
      group.totalValue += Number(item.expected_value || 0);
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );
  const totalValue = useMemo(() => suppliers.reduce((sum, item) => sum + Number(item.expected_value || 0), 0), [suppliers]);

  const loadCategories = useCallback(() => api("/suppliers/categories").then(setCategories), []);
  const loadSuppliers = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    if (categoryId) params.set("categoryId", categoryId);
    return api(`/suppliers?${params.toString()}`).then(setSuppliers);
  }, [categoryId, search, stage]);

  useEffect(() => {
    if (!user || user.role === "MANAGER") return;
    Promise.all([loadCategories(), loadSuppliers()]).catch((error) => setMessage(error.message));
  }, [user, loadCategories, loadSuppliers]);

  useEffect(() => {
    if (!form.categoryId && categories.length) setForm((current) => ({ ...current, categoryId: categories[0].id }));
  }, [categories, form.categoryId]);

  const createCategory = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await api("/suppliers/categories", {
        method: "POST",
        body: JSON.stringify(categoryForm)
      });
      setCategoryForm(emptyCategory);
      setForm((current) => ({ ...current, categoryId: saved.id }));
      setMessage("Category created.");
      await loadCategories();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitSupplier = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, expectedValue: form.expectedValue === "" ? null : Number(form.expectedValue) };
      await api(editingId ? `/suppliers/${editingId}` : "/suppliers", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
      setEditingId("");
      setMessage(editingId ? "Supplier updated." : "Supplier added.");
      await Promise.all([loadCategories(), loadSuppliers()]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const openComments = async (supplierId) => {
    setSelectedSupplierId(supplierId);
    try {
      const rows = await api(`/remarks/${supplierId}?targetType=SUPPLIER`);
      setComments(rows);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!selectedSupplierId) return;
    setBusy(true);
    try {
      await api("/remarks/add", {
        method: "POST",
        body: JSON.stringify({ targetType: "SUPPLIER", targetId: selectedSupplierId, text: commentText })
      });
      setCommentText("");
      setMessage("CEO comment added.");
      await openComments(selectedSupplierId);
      await loadSuppliers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  if (user.role === "MANAGER") {
    return <Shell user={user}><Notice message="Suppliers are managed by executives and reviewed by the CEO." error /></Shell>;
  }

  return <Shell user={user}>
    <Reveal variant="clip"><header className="page-hero mb-7">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">Suppliers module</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">{isCeo ? "Supplier review" : "Supplier pipeline"}</h1>
      <p className="mt-2 text-slate-500">{isCeo ? "Review executive supplier entries by category and add leadership comments." : "Create categories first, then add supplier entries under the right category."}</p>
    </header></Reveal>
    <Notice message={message} error={message && !message.includes("added") && !message.includes("updated") && !message.includes("created")} />

    <div className="mb-5 grid gap-4 md:grid-cols-3">
      <Card><PackageCheck className="mb-4 text-violet-600" size={22} /><div className="text-3xl font-black text-violet-950">{suppliers.length}</div><div className="text-sm text-slate-500">Suppliers visible</div></Card>
      <Card><Tags className="mb-4 text-violet-600" size={22} /><div className="text-3xl font-black text-violet-950">{categories.length}</div><div className="text-sm text-slate-500">Categories</div></Card>
      <Card><div className="text-3xl font-black text-violet-950">{totalValue.toLocaleString()}</div><div className="text-sm text-slate-500">Expected value</div></Card>
    </div>

    <div className={`grid gap-5 ${isExecutive ? "xl:grid-cols-[minmax(0,1fr)_390px]" : "xl:grid-cols-[minmax(0,1fr)_390px]"}`}>
      <Reveal><Card title={isCeo ? "Category-wise suppliers" : "Supplier list"}>
        <form onSubmit={(event) => { event.preventDefault(); loadSuppliers().catch((error) => setMessage(error.message)); }} className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_190px_auto]">
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, product, or phone" /></div>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{stages.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select>
          <button className="btn-primary">Search</button>
        </form>

        <div className="space-y-5">
          {groupedSuppliers.map((group) => <section key={group.id} className="rounded-2xl border border-violet-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-black text-violet-950">{group.name}</h2><p className="text-xs text-slate-400">{group.items.length} suppliers - {group.totalValue.toLocaleString()} expected value</p></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[64rem]"><thead><tr><th>Company</th><th>Executive</th><th>Contact</th><th>Interest</th><th>Stage</th><th>Value</th><th>Next follow-up</th><th></th></tr></thead><tbody>{group.items.map((item) => <tr key={item.id}><td className="font-bold text-violet-950">{item.company_name}<div className="text-xs font-normal text-slate-400">{item.city || "-"}</div></td><td>{item.created_by_name}</td><td>{item.contact_person}<div className="text-xs text-slate-400">{item.phone || item.email || "-"}</div></td><td>{item.product_interest || "-"}</td><td><Status value={item.supply_stage} /></td><td>{item.expected_value ? Number(item.expected_value).toLocaleString() : "-"}</td><td>{item.next_followup_date ? new Date(item.next_followup_date).toLocaleDateString() : "-"}</td><td>{isExecutive ? <button type="button" onClick={() => { setEditingId(item.id); setForm(toForm(item)); }} className="inline-flex items-center gap-1 font-bold text-violet-700"><Edit3 size={14} />Edit</button> : <button type="button" onClick={() => openComments(item.id)} className="inline-flex items-center gap-1 font-bold text-violet-700"><MessageSquareText size={14} />Comment {item.ceo_comment_count ? `(${item.ceo_comment_count})` : ""}</button>}</td></tr>)}</tbody></table></div>
          </section>)}
          {!groupedSuppliers.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No suppliers match the current filters.</div>}
        </div>
      </Card></Reveal>

      {isExecutive && <Reveal delay={100} className="space-y-5">
        <Card title="Create category" action={<Tags size={18} className="text-violet-500" />}>
          <form onSubmit={createCategory} className="space-y-3">
            <div><label>Category</label><input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Raw material suppliers" /></div>
            <div><label>Description</label><textarea rows="3" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></div>
            <Button loading={busy} className="btn-secondary w-full"><Plus size={16} />Create category</Button>
          </form>
        </Card>
        <Card title={editingId ? "Edit supplier" : "Add supplier"} action={<Plus size={18} className="text-violet-500" />}>
          <form onSubmit={submitSupplier} className="space-y-3">
            <div><label>Category</label><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><label>Company</label><input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></div>
            <div><label>Contact person</label><input required value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><label>Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div><label>WhatsApp</label><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></div></div>
            <div><label>Email</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><label>City</label><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div><div><label>Stage</label><select value={form.supplyStage} onChange={(event) => setForm({ ...form, supplyStage: event.target.value })}>{stages.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select></div></div>
            <div><label>Product interest</label><input value={form.productInterest} onChange={(event) => setForm({ ...form, productInterest: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><label>Expected value</label><input type="number" min="0" step="0.01" value={form.expectedValue} onChange={(event) => setForm({ ...form, expectedValue: event.target.value })} /></div><div><label>Next follow-up</label><input type="date" value={form.nextFollowupDate} onChange={(event) => setForm({ ...form, nextFollowupDate: event.target.value })} /></div></div>
            <div><label>Notes</label><textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            <Button loading={busy} className="btn-primary w-full">{editingId ? "Save supplier" : "Add supplier"}</Button>
            {editingId && <button type="button" className="btn-secondary w-full" onClick={() => { setEditingId(""); setForm({ ...emptyForm, categoryId: categories[0]?.id || "" }); }}>Cancel edit</button>}
          </form>
        </Card>
      </Reveal>}

      {isCeo && <Reveal delay={100}><Card title="CEO comment" action={<MessageSquareText size={18} className="text-violet-500" />}>
        {selectedSupplier ? <div className="space-y-4">
          <div className="rounded-2xl bg-violet-50 p-4"><div className="font-black text-violet-950">{selectedSupplier.company_name}</div><div className="text-sm text-slate-500">{selectedSupplier.category_name || "Uncategorized"} - {selectedSupplier.created_by_name}</div></div>
          <div className="max-h-56 space-y-2 overflow-y-auto">{comments.map((item) => <div key={item.id} className="rounded-xl border border-violet-100 p-3"><div className="whitespace-pre-wrap text-sm text-slate-700">{item.remark_text}</div><div className="mt-2 text-xs text-slate-400">{item.ceo_name} - {new Date(item.created_at).toLocaleString()}</div></div>)}{!comments.length && <div className="rounded-xl bg-violet-50 p-4 text-sm text-slate-500">No CEO comments yet.</div>}</div>
          <form onSubmit={addComment} className="space-y-3"><textarea required rows="5" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add CEO comment..." /><Button loading={busy} className="btn-primary w-full">Add comment</Button></form>
        </div> : <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">Choose a supplier from the list to add a CEO comment.</div>}
      </Card></Reveal>}
    </div>
  </Shell>;
}
