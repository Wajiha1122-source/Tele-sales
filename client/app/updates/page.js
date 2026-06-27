"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, Pin, Plus } from "lucide-react";
import Shell from "../../components/Shell";
import { Button, Card, Notice, Status } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api, titleize } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
const audiences = ["ALL", "EXECUTIVE", "MANAGER", "CEO"];
const emptyForm = { title: "", body: "", priority: "NORMAL", audience: "ALL", pinned: false };

export default function UpdatesPage() {
  const user = useSession();
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = ["MANAGER", "CEO"].includes(user?.role);

  const load = useCallback(() => api("/updates").then(setUpdates).catch((error) => setMessage(error.message)), []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api(editingId ? `/updates/${editingId}` : "/updates", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyForm);
      setEditingId("");
      setMessage(editingId ? "Important update saved." : "Important update published.");
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
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">Important updates module</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">Important updates</h1>
      <p className="mt-2 text-slate-500">Pinned notices, leadership instructions, and team-wide operational updates.</p>
    </header></Reveal>
    <Notice message={message} error={message && !message.includes("published") && !message.includes("saved")} />

    <div className={`grid gap-5 ${canManage ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      <Reveal><Card title="Update feed" action={<Bell size={18} className="text-violet-500" />}>
        <div className="space-y-3">{updates.map((item) => <article key={item.id} className="rounded-2xl border border-violet-100 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50/60">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {item.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700"><Pin size={12} />Pinned</span>}
            <Status value={item.priority} />
            <span className="badge bg-slate-100 text-slate-600">{titleize(item.audience)}</span>
          </div>
          <h2 className="text-lg font-black text-violet-950">{item.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>{item.created_by_name} - {new Date(item.created_at).toLocaleString()}</span>
            {canManage && <button type="button" className="font-bold text-violet-700" onClick={() => { setEditingId(item.id); setForm({ title: item.title, body: item.body, priority: item.priority, audience: item.audience, pinned: item.pinned }); }}>Edit</button>}
          </div>
        </article>)}</div>
        {!updates.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No important updates have been published for your role.</div>}
      </Card></Reveal>

      {canManage && <Reveal delay={100}><Card title={editingId ? "Edit update" : "Publish update"} action={<Plus size={18} className="text-violet-500" />}>
        <form onSubmit={submit} className="space-y-3">
          <div><label>Title</label><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2"><div><label>Priority</label><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select></div><div><label>Audience</label><select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>{audiences.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select></div></div>
          <div><label>Update</label><textarea required rows="7" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></div>
          <label className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-violet-950"><input className="h-4 w-4 rounded" type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} />Pin this update</label>
          <Button loading={busy} className="btn-primary w-full">{editingId ? "Save update" : "Publish update"}</Button>
          {editingId && <button type="button" className="btn-secondary w-full" onClick={() => { setEditingId(""); setForm(emptyForm); }}>Cancel edit</button>}
        </form>
      </Card></Reveal>}
    </div>
  </Shell>;
}
