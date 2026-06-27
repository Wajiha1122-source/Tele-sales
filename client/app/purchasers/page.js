"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search, ShoppingBag } from "lucide-react";
import Shell from "../../components/Shell";
import { Button, Card, Notice, Status } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api, titleize } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

const stages = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATION", "PURCHASED", "ON_HOLD", "LOST"];
const emptyForm = {
  companyName: "",
  contactPerson: "",
  phone: "",
  whatsapp: "",
  email: "",
  city: "",
  productInterest: "",
  purchaseStage: "NEW",
  expectedValue: "",
  nextFollowupDate: "",
  notes: ""
};

function toForm(row) {
  return {
    companyName: row.company_name || "",
    contactPerson: row.contact_person || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    city: row.city || "",
    productInterest: row.product_interest || "",
    purchaseStage: row.purchase_stage || "NEW",
    expectedValue: row.expected_value || "",
    nextFollowupDate: row.next_followup_date ? row.next_followup_date.slice(0, 10) : "",
    notes: row.notes || ""
  };
}

export default function PurchasersPage() {
  const user = useSession();
  const [purchasers, setPurchasers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const canManage = !!user;
  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (stage) params.set("stage", stage);
    return api(`/purchasers?${params.toString()}`).then(setPurchasers).catch((error) => setMessage(error.message));
  }, [search, stage]);

  useEffect(() => { if (user) load(); }, [user, load]);
  const totalValue = useMemo(() => purchasers.reduce((sum, item) => sum + Number(item.expected_value || 0), 0), [purchasers]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, expectedValue: form.expectedValue === "" ? null : Number(form.expectedValue) };
      await api(editingId ? `/purchasers/${editingId}` : "/purchasers", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });
      setForm(emptyForm);
      setEditingId("");
      setMessage(editingId ? "Purchaser updated." : "Purchaser added.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  return <Shell user={user}>
    <Reveal variant="clip"><header className="page-hero mb-7">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">Purchasers module</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">Purchaser pipeline</h1>
      <p className="mt-2 text-slate-500">Track purchaser contacts, buying stage, expected value, and the next follow-up date.</p>
    </header></Reveal>
    <Notice message={message} error={message && !message.includes("added") && !message.includes("updated")} />

    <div className="mb-5 grid gap-4 md:grid-cols-3">
      <Card><ShoppingBag className="mb-4 text-violet-600" size={22} /><div className="text-3xl font-black text-violet-950">{purchasers.length}</div><div className="text-sm text-slate-500">Purchasers visible</div></Card>
      <Card><div className="text-3xl font-black text-violet-950">{purchasers.filter((item) => !["PURCHASED", "LOST"].includes(item.purchase_stage)).length}</div><div className="text-sm text-slate-500">Active opportunities</div></Card>
      <Card><div className="text-3xl font-black text-violet-950">{totalValue.toLocaleString()}</div><div className="text-sm text-slate-500">Expected value</div></Card>
    </div>

    <div className={`grid gap-5 ${canManage ? "xl:grid-cols-[minmax(0,1fr)_390px]" : ""}`}>
      <Reveal><Card title="Purchaser list">
        <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mb-4 grid gap-2 md:grid-cols-[1fr_190px_auto]">
          <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, product, or phone" /></div>
          <select value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{stages.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select>
          <button className="btn-primary">Search</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[62rem]"><thead><tr><th>Company</th><th>Contact</th><th>Interest</th><th>Stage</th><th>Value</th><th>Next follow-up</th>{canManage && <th></th>}</tr></thead><tbody>{purchasers.map((item) => <tr key={item.id}><td className="font-bold text-violet-950">{item.company_name}<div className="text-xs font-normal text-slate-400">{item.city || "-"}</div></td><td>{item.contact_person}<div className="text-xs text-slate-400">{item.phone || item.email || "-"}</div></td><td>{item.product_interest || "-"}</td><td><Status value={item.purchase_stage} /></td><td>{item.expected_value ? Number(item.expected_value).toLocaleString() : "-"}</td><td>{item.next_followup_date ? new Date(item.next_followup_date).toLocaleDateString() : "-"}</td>{canManage && <td><button type="button" onClick={() => { setEditingId(item.id); setForm(toForm(item)); }} className="inline-flex items-center gap-1 font-bold text-violet-700"><Edit3 size={14} />Edit</button></td>}</tr>)}</tbody></table></div>
        {!purchasers.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No purchasers match the current filters.</div>}
      </Card></Reveal>

      {canManage && <Reveal delay={100}><Card title={editingId ? "Edit purchaser" : "Add purchaser"} action={<Plus size={18} className="text-violet-500" />}>
        <form onSubmit={submit} className="space-y-3">
          <div><label>Company</label><input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></div>
          <div><label>Contact person</label><input required value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2"><div><label>Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div><label>WhatsApp</label><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></div></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2"><div><label>City</label><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div><div><label>Stage</label><select value={form.purchaseStage} onChange={(event) => setForm({ ...form, purchaseStage: event.target.value })}>{stages.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select></div></div>
          <div><label>Product interest</label><input value={form.productInterest} onChange={(event) => setForm({ ...form, productInterest: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2"><div><label>Expected value</label><input type="number" min="0" step="0.01" value={form.expectedValue} onChange={(event) => setForm({ ...form, expectedValue: event.target.value })} /></div><div><label>Next follow-up</label><input type="date" value={form.nextFollowupDate} onChange={(event) => setForm({ ...form, nextFollowupDate: event.target.value })} /></div></div>
          <div><label>Notes</label><textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          <Button loading={busy} className="btn-primary w-full">{editingId ? "Save purchaser" : "Add purchaser"}</Button>
          {editingId && <button type="button" className="btn-secondary w-full" onClick={() => { setEditingId(""); setForm(emptyForm); }}>Cancel edit</button>}
        </form>
      </Card></Reveal>}
    </div>
  </Shell>;
}
