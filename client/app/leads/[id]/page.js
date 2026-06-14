"use client";
import { use, useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Crown, History, MessageSquareText } from "lucide-react";
import Shell from "../../../components/Shell";
import { Button, Card, Notice, Status } from "../../../components/ui";
import { api, titleize } from "../../../lib/api";
import { useSession } from "../../../hooks/useSession";

const statuses = ["CONTACTED", "IN_PROGRESS", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NO_RESPONSE"];

export default function LeadPage({ params }) {
  const { id } = use(params);
  const user = useSession();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("CONTACTED");
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/leads/${id}`).then(setLead).catch((e) => setMessage(e.message)), [id]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (user.role === "MANAGER") {
        await api("/followups/add", { method: "POST", body: JSON.stringify({ leadId: id, date: followupDate, notes, statusUpdate: status }) });
      } else {
        await api("/remarks/add", { method: "POST", body: JSON.stringify({ targetType: "LEAD", targetId: id, text: notes }) });
      }
      setNotes("");
      setMessage(user.role === "MANAGER" ? "Follow-up and status added to the timeline." : "CEO remark added permanently.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  return <Shell user={user}>
    <Notice message={message} error={message && !message.includes("added")} />
    {lead && <>
      <header className="mb-7">
        <p className="mb-2 text-sm font-bold uppercase tracking-[.22em] text-violet-600">{user.role === "MANAGER" ? "Manager follow-up workspace" : user.role === "CEO" ? "CEO lead oversight" : "Lead progress"}</p>
        <div className="mb-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black text-violet-950 md:text-4xl">{lead.company_name}</h1><Status value={lead.status} /></div>
        <p className="text-slate-500">{lead.contact_person} - {lead.phone || lead.email || "No contact details"}</p>
      </header>

      {user.role === "MANAGER" && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-100/70 p-4 text-sm text-violet-900"><CheckCircle2 size={20} /><strong>This lead is ready for your update.</strong> Record the follow-up and select its new status below.</div>}
      {user.role === "CEO" && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900"><Crown size={20} /><strong>CEO view:</strong> Review the complete history and add an immutable leadership remark.</div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <Card title="Complete lead timeline" action={<History size={19} className="text-violet-500" />}>
          <div className="space-y-5">{lead.timeline.map((event) => <div key={event.id} className="relative border-l-2 border-violet-200 pl-5"><span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-violet-600 shadow-md shadow-violet-300" /><div className="text-sm font-bold text-violet-950">{titleize(event.event_type)}</div><div className="mt-1 text-sm text-slate-600">{event.description}</div><div className="mt-2 text-xs text-slate-400">{event.actor_name} - {new Date(event.created_at).toLocaleString()}</div></div>)}</div>
        </Card>

        <div className="space-y-5">
          <Card title="Contact & context"><dl className="grid grid-cols-2 gap-4 text-sm">{[["WhatsApp", lead.whatsapp], ["Email", lead.email], ["City", lead.city], ["Industry", lead.industry], ["Source", lead.lead_source], ["Created by", lead.created_by_name]].map(([key, value]) => <div key={key}><dt className="text-xs font-bold uppercase text-slate-400">{key}</dt><dd className="mt-1 font-medium text-violet-950">{value || "-"}</dd></div>)}</dl>{lead.notes && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm">{lead.notes}</p>}</Card>

          {user.role === "MANAGER" && <Card title="Add Manager follow-up" action={<MessageSquareText size={19} className="text-violet-500" />}><form onSubmit={submit}><div className="mb-3"><label>Follow-up date</label><div className="relative"><CalendarDays className="absolute left-3 top-3 text-violet-400" size={17} /><input className="pl-10" type="date" required value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} /></div></div><div className="mb-3"><label>New lead status</label><select value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}</select></div><div><label>Follow-up notes</label><textarea required rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened, what was agreed, and what is the next step?" /></div><Button loading={busy} className="btn-primary mt-3 w-full">Save follow-up & update status</Button></form></Card>}

          {user.role === "CEO" && <Card title="Add CEO remark" action={<Crown size={19} className="text-fuchsia-500" />}><form onSubmit={submit}><div><label>Immutable leadership remark</label><textarea required rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add guidance, a decision, or an observation..." /></div><p className="mt-2 text-xs text-slate-400">CEO remarks cannot be edited or deleted after submission.</p><Button loading={busy} className="btn-primary mt-3 w-full">Add permanent remark</Button></form></Card>}
        </div>
      </div>
    </>}
  </Shell>;
}
