"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Crown, MessageSquareText, PhoneCall } from "lucide-react";
import Shell from "../../components/Shell";
import { Button, Card, Notice } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api, titleize } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

export default function ReportsPage() {
  const user = useSession();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState("");
  const [details, setDetails] = useState({});
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api("/reports/all").then(setReports).catch((e) => setMessage(e.message)), []);
  useEffect(() => { if (user?.role === "CEO") load(); }, [user, load]);

  const openReport = async (id) => {
    if (selected === id) return setSelected("");
    setSelected(id);
    setRemark("");
    if (!details[id]) {
      try {
        const [activities, remarks] = await Promise.all([api(`/activities/by-report/${id}`), api(`/remarks/${id}`)]);
        setDetails((current) => ({ ...current, [id]: { activities, remarks } }));
      } catch (error) {
        setMessage(error.message);
      }
    }
  };

  const addRemark = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/remarks/add", { method: "POST", body: JSON.stringify({ targetType: "REPORT", targetId: selected, text: remark }) });
      const remarks = await api(`/remarks/${selected}`);
      setDetails((current) => ({ ...current, [selected]: { ...current[selected], remarks } }));
      setRemark("");
      setMessage("CEO remark added permanently.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  if (user.role !== "CEO") return <Shell user={user}><Notice message="Only the CEO can access company reports." error /></Shell>;

  return <Shell user={user}>
    <Reveal variant="clip"><header className="page-hero mb-7">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">CEO report oversight</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">Daily reports & remarks</h1>
      <p className="mt-2 text-slate-500">Review executive totals, inspect every activity, and add permanent CEO guidance.</p>
    </header></Reveal>
    <Notice message={message} error={message && !message.includes("added")} />
    <div className="space-y-4">{reports.map((report) => {
      const isOpen = selected === report.id;
      const reportDetails = details[report.id];
      return <Reveal key={report.id} variant="up"><Card className={isOpen ? "border-violet-300" : ""}>
        <button onClick={() => openReport(report.id)} className="grid w-full items-center gap-4 text-left md:grid-cols-[1.3fr_repeat(5,.55fr)_auto]">
          <div><div className="font-bold text-violet-950">{report.executive_name}</div><div className="text-sm text-slate-400">{new Date(report.date).toLocaleDateString()}</div></div>
          {[["Calls", report.total_calls], ["Contacts", report.contacts_reached], ["Interested", report.interested_count], ["Meetings", report.meetings_scheduled], ["Activities", report.activity_count]].map(([label, value]) => <div key={label}><div className="text-xs font-bold uppercase text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-violet-900">{value}</div></div>)}
          {isOpen ? <ChevronUp className="text-violet-500" /> : <ChevronDown className="text-violet-500" />}
        </button>

        {isOpen && <div className="mt-6 grid gap-5 border-t border-violet-100 pt-5 xl:grid-cols-[1.2fr_.8fr]">
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-violet-950"><PhoneCall size={18} />Activity log</h3>
            <div className="max-h-96 space-y-3 overflow-auto">{reportDetails?.activities?.length ? reportDetails.activities.map((activity) => <div key={activity.id} className="rounded-xl bg-violet-50/70 p-3"><div className="flex items-start justify-between gap-3"><div className="font-bold text-violet-950">{activity.company_name} - {activity.contact_person}</div><span className="text-xs font-bold text-violet-500">{activity.time.slice(0, 5)}</span></div><div className="mt-1 text-xs text-slate-500">{titleize(activity.activity_type)} - {titleize(activity.result)}</div>{activity.remarks && <p className="mt-2 text-sm text-slate-600">{activity.remarks}</p>}</div>) : <p className="text-sm text-slate-400">No activities recorded for this report.</p>}</div>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-violet-950"><Crown size={18} />CEO remarks</h3>
            <div className="mb-4 space-y-2">{reportDetails?.remarks?.map((item) => <div key={item.id} className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-3"><p className="text-sm text-fuchsia-950">{item.remark_text}</p><div className="mt-2 text-xs text-fuchsia-500">{item.ceo_name} - {new Date(item.created_at).toLocaleString()}</div></div>)}</div>
            <form onSubmit={addRemark}><label>New immutable remark</label><textarea required rows="4" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Leadership feedback or direction..." /><Button loading={busy} className="btn-primary mt-3 w-full"><MessageSquareText size={16} />Add permanent remark</Button></form>
          </div>
        </div>}
      </Card></Reveal>;
    })}</div>
  </Shell>;
}
