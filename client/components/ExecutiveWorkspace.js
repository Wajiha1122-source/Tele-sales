"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock3, Lock, Pencil, Plus, RotateCcw, Save, Sparkles, Zap } from "lucide-react";
import { api, titleize } from "../lib/api";
import { Button, Card, Notice, Status } from "./ui";
import Reveal from "./Reveal";

const freshActivity = () => ({
  time: new Date().toTimeString().slice(0, 5),
  companyName: "",
  contactPerson: "",
  phone: "",
  activityType: "COLD_CALL",
  result: "NO_ANSWER",
  remarks: ""
});
const emptyReport = { totalCalls: 0, contactsReached: 0, interestedCount: 0, meetingsScheduled: 0, remarks: "" };
const emptyLead = { companyName: "", contactPerson: "", phone: "", whatsapp: "", email: "", city: "", industry: "", leadSource: "", notes: "" };

export default function ExecutiveWorkspace() {
  const [report, setReport] = useState(emptyReport);
  const [reportId, setReportId] = useState("");
  const [activity, setActivity] = useState(freshActivity);
  const [activityEditId, setActivityEditId] = useState("");
  const [lead, setLead] = useState(emptyLead);
  const [leadEditId, setLeadEditId] = useState("");
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const [reports, mine] = await Promise.all([api("/reports/my"), api("/leads/my")]);
    const current = reports.find((item) => item.date.slice(0, 10) === today);
    if (current) {
      setReportId(current.id);
      setReport({
        totalCalls: current.total_calls,
        contactsReached: current.contacts_reached,
        interestedCount: current.interested_count,
        meetingsScheduled: current.meetings_scheduled,
        remarks: current.remarks || ""
      });
      setActivities(await api(`/activities/by-report/${current.id}`));
    }
    setLeads(mine.slice(0, 8));
  }, [today]);

  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);

  const field = (state, setter, name) => ({
    value: state[name],
    onChange: (event) => setter({ ...state, [name]: event.target.value })
  });

  const saveReport = async (event) => {
    event.preventDefault();
    setBusy("report");
    try {
      const saved = await api("/reports/create", { method: "POST", body: JSON.stringify(report) });
      setReportId(saved.id);
      setNotice("Today's report is saved.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const saveActivity = async (event) => {
    event.preventDefault();
    if (!reportId) return setNotice("Save today's report first.");
    setBusy("activity");
    try {
      const path = activityEditId ? `/activities/${activityEditId}` : "/activities/add";
      await api(path, { method: activityEditId ? "PUT" : "POST", body: JSON.stringify({ ...activity, reportId }) });
      setNotice(activityEditId ? "Activity updated." : "Activity added.");
      setActivity(freshActivity());
      setActivityEditId("");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const editActivity = (item) => {
    setActivityEditId(item.id);
    setActivity({
      time: item.time.slice(0, 5),
      companyName: item.company_name,
      contactPerson: item.contact_person,
      phone: item.phone || "",
      activityType: item.activity_type,
      result: item.result,
      remarks: item.remarks || ""
    });
    document.getElementById("activity-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const resetActivity = () => {
    setActivityEditId("");
    setActivity(freshActivity());
  };

  const saveLead = async (event) => {
    event.preventDefault();
    setBusy("lead");
    const normalized = Object.fromEntries(Object.entries(lead).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    try {
      await api(leadEditId ? `/leads/${leadEditId}` : "/leads/create", {
        method: leadEditId ? "PUT" : "POST",
        body: JSON.stringify(normalized)
      });
      setNotice(leadEditId ? "Lead details updated." : "Lead created and added to the pipeline.");
      setLead(emptyLead);
      setLeadEditId("");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const editLead = (item) => {
    if (item.followup_count > 0) return;
    setLeadEditId(item.id);
    setLead({
      companyName: item.company_name,
      contactPerson: item.contact_person,
      phone: item.phone || "",
      whatsapp: item.whatsapp || "",
      email: item.email || "",
      city: item.city || "",
      industry: item.industry || "",
      leadSource: item.lead_source || "",
      notes: item.notes || ""
    });
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const resetLead = () => {
    setLeadEditId("");
    setLead(emptyLead);
  };

  return <>
    <Reveal variant="clip"><header className="executive-hero mb-7 overflow-hidden rounded-[2rem] border border-violet-200/70 p-6 md:p-8">
      <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-violet-700"><Sparkles size={14} />{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="text-3xl font-black text-violet-950 md:text-5xl">Your day, in motion.</h1>
          <p className="mt-3 max-w-xl text-slate-600">Report fast, keep every conversation traceable, and hand clean leads to the Manager.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur"><Zap className="text-violet-600" /><div><div className="text-xs font-bold uppercase text-slate-400">Today logged</div><div className="text-2xl font-black text-violet-950">{activities.length} activities</div></div></div>
      </div>
    </header></Reveal>

    <Notice message={notice} error={notice && !notice.includes("saved") && !notice.includes("added") && !notice.includes("created") && !notice.includes("updated")} />

    <div className="grid gap-5 xl:grid-cols-2">
      <Reveal variant="left"><Card title="Daily totals" action={<span className="badge bg-violet-100 text-violet-800">{reportId ? "Saved" : "Not saved"}</span>}>
        <form onSubmit={saveReport}>
          <div className="grid grid-cols-2 gap-3">
            {[["totalCalls", "Calls made"], ["contactsReached", "Contacts reached"], ["interestedCount", "Interested"], ["meetingsScheduled", "Meetings"]].map(([name, label]) => <div key={name}><label>{label}</label><input type="number" min="0" {...field(report, setReport, name)} /></div>)}
          </div>
          <div className="mt-3"><label>General remarks</label><textarea rows="2" {...field(report, setReport, "remarks")} placeholder="Anything leadership should know?" /></div>
          <Button loading={busy === "report"} className="btn-primary mt-3 w-full"><Save size={16} />Save today&apos;s report</Button>
        </form>
      </Card></Reveal>

      <Reveal delay={70} variant="right"><Card title={activityEditId ? "Edit quick activity" : "Quick activity"} action={activityEditId ? <button onClick={resetActivity} className="inline-flex items-center gap-1 text-xs font-bold text-violet-600"><RotateCcw size={14} />Cancel edit</button> : <Clock3 size={18} className="text-violet-400" />}>
        <form id="activity-form" onSubmit={saveActivity}>
          <div className="grid grid-cols-2 gap-3">
            <div><label>Time</label><input type="time" required {...field(activity, setActivity, "time")} /></div>
            <div><label>Company</label><input required {...field(activity, setActivity, "companyName")} /></div>
            <div><label>Contact</label><input required {...field(activity, setActivity, "contactPerson")} /></div>
            <div><label>Phone</label><input {...field(activity, setActivity, "phone")} /></div>
            <div><label>Activity</label><select {...field(activity, setActivity, "activityType")}>{["COLD_CALL", "FOLLOW_UP_CALL", "WHATSAPP_MESSAGE", "EMAIL_SENT", "MEETING"].map((value) => <option key={value} value={value}>{titleize(value)}</option>)}</select></div>
            <div><label>Result</label><select {...field(activity, setActivity, "result")}>{["NO_ANSWER", "BUSY", "INTERESTED", "NOT_INTERESTED", "CALL_BACK_LATER"].map((value) => <option key={value} value={value}>{titleize(value)}</option>)}</select></div>
          </div>
          <div className="mt-3"><label>Remarks</label><input {...field(activity, setActivity, "remarks")} placeholder="Short note" /></div>
          <Button loading={busy === "activity"} className="btn-secondary mt-3 w-full">{activityEditId ? <Save size={16} /> : <Plus size={16} />}{activityEditId ? "Update activity" : "Add activity"}</Button>
        </form>
      </Card></Reveal>

      <Reveal delay={110}><Card title={leadEditId ? "Edit lead details" : "Create a lead"} action={leadEditId && <button onClick={resetLead} className="inline-flex items-center gap-1 text-xs font-bold text-violet-600"><RotateCcw size={14} />Cancel edit</button>}>
        <form id="lead-form" onSubmit={saveLead}>
          <div className="grid grid-cols-2 gap-3">
            <div><label>Company *</label><input required {...field(lead, setLead, "companyName")} /></div>
            <div><label>Contact person *</label><input required {...field(lead, setLead, "contactPerson")} /></div>
            <div><label>Phone</label><input {...field(lead, setLead, "phone")} /></div>
            <div><label>WhatsApp</label><input {...field(lead, setLead, "whatsapp")} /></div>
            <div><label>Email</label><input type="email" {...field(lead, setLead, "email")} /></div>
            <div><label>City</label><input {...field(lead, setLead, "city")} /></div>
            <div><label>Industry</label><input {...field(lead, setLead, "industry")} /></div>
            <div><label>Source</label><input {...field(lead, setLead, "leadSource")} /></div>
          </div>
          <div className="mt-3"><label>Notes</label><textarea rows="2" {...field(lead, setLead, "notes")} /></div>
          <Button loading={busy === "lead"} className="btn-primary mt-3 w-full">{leadEditId ? <Save size={16} /> : <Plus size={16} />}{leadEditId ? "Update lead" : "Create lead"}</Button>
        </form>
      </Card></Reveal>

      <Reveal delay={150}><Card title={`Today's activity (${activities.length})`}>
        <div className="max-h-[25rem] space-y-3 overflow-auto pr-1">{activities.length ? activities.map((item) => <div key={item.id} className="group flex items-start gap-3 rounded-2xl border border-violet-100/70 bg-violet-50/60 p-3.5 transition hover:border-violet-300 hover:bg-white hover:shadow-card"><span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-violet-600 shadow-sm">{item.time.slice(0, 5)}</span><div className="min-w-0 flex-1"><div className="text-sm font-bold text-violet-950">{item.company_name} - {item.contact_person}</div><div className="mt-1 text-xs text-slate-500">{titleize(item.activity_type)} - {titleize(item.result)}</div>{item.remarks && <p className="mt-2 truncate text-xs text-slate-400">{item.remarks}</p>}</div><button onClick={() => editActivity(item)} className="grid h-8 w-8 place-items-center rounded-lg text-violet-500 opacity-70 transition hover:bg-violet-100 hover:opacity-100" aria-label={`Edit activity for ${item.company_name}`}><Pencil size={15} /></button></div>) : <p className="text-sm text-slate-400">No activities logged yet.</p>}</div>
      </Card></Reveal>
    </div>

    <Reveal className="mt-5"><Card title="Recent leads" action={<span className="text-xs font-medium text-slate-400">Editable until the first Manager follow-up</span>}>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Created</th><th>Edit access</th></tr></thead><tbody>{leads.map((item) => {
        const locked = item.followup_count > 0;
        return <tr key={item.id}><td className="font-bold text-violet-950">{item.company_name}</td><td>{item.contact_person}</td><td><Status value={item.status} /></td><td>{new Date(item.created_at).toLocaleDateString()}</td><td>{locked ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400"><Lock size={14} />Locked after follow-up</span> : <button onClick={() => editLead(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-200"><Pencil size={14} />Edit lead</button>}</td></tr>;
      })}</tbody></table></div>
    </Card></Reveal>
  </>;
}
