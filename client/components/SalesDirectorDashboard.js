"use client";
import { useEffect, useState } from "react";
import { Activity, BarChart3, BriefcaseBusiness, PhoneCall, UserCheck, Users } from "lucide-react";
import { api, titleize } from "../lib/api";
import { Card, Notice } from "./ui";
import Reveal from "./Reveal";
import AnimatedNumber from "./AnimatedNumber";

export default function SalesDirectorDashboard() {
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/dashboard/summary"), api("/activities/all")])
      .then(([summary, allActivities]) => {
        setData(summary);
        setActivities(allActivities);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (!data) return <Notice message={error || "Loading sales director dashboard..."} error={!!error} />;

  const executives = data.performance || [];
  const totalCalls = executives.reduce((sum, person) => sum + Number(person.calls || 0), 0);
  const totalContacts = executives.reduce((sum, person) => sum + Number(person.contacts || 0), 0);
  const totalLeads = executives.reduce((sum, person) => sum + Number(person.leads || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const activitiesToday = activities.filter((item) => item.date?.slice(0, 10) === today);

  const cards = [
    { label: "Executives", value: executives.length, icon: Users, detail: "Active sales users" },
    { label: "Calls", value: totalCalls, icon: PhoneCall, detail: "Last 30 days" },
    { label: "Contacts", value: totalContacts, icon: UserCheck, detail: "Last 30 days" },
    { label: "Leads", value: totalLeads, icon: BriefcaseBusiness, detail: "Created by executives" }
  ];

  return <>
    <Reveal variant="clip"><header className="premium-dark mb-7 rounded-[2rem] p-7 text-white md:p-9">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-violet-100"><BarChart3 size={14} />Sales director</div>
        <h1 className="text-4xl font-black leading-[1.04] tracking-[-.04em] md:text-6xl">Executive performance at a glance.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-violet-100/65 md:text-base">Review each executive&apos;s output and the latest activity logged across the sales team.</p>
      </div>
    </header></Reveal>

    <div className="mb-6 grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, detail }, index) => <Reveal key={label} delay={index * 70} variant="scale"><Card className="h-full">
        <div className="mb-4 flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon size={18} /></div></div>
        <div className="text-3xl font-black tracking-[-.04em] text-violet-950 sm:text-4xl"><AnimatedNumber value={value} /></div>
        <div className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{label}</div>
        <div className="mt-2 text-[11px] text-slate-400 sm:text-xs">{detail}</div>
      </Card></Reveal>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Reveal><Card title="Executive performance - last 30 days" action={<span className="text-xs font-semibold text-violet-500">{executives.length} executives</span>}>
        <div className="ceo-table-scroll w-full max-w-full overflow-x-auto">
          <table className="min-w-[34rem] w-full">
            <thead><tr><th>Executive</th><th>Reports</th><th>Calls</th><th>Contacts</th><th>Leads</th></tr></thead>
            <tbody>{executives.map((person) => <tr key={person.id}><td className="font-bold text-violet-950">{person.name}</td><td>{person.reports}</td><td>{person.calls}</td><td>{person.contacts}</td><td>{person.leads}</td></tr>)}</tbody>
          </table>
        </div>
        {!executives.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No executive performance has been logged yet.</div>}
      </Card></Reveal>

      <Reveal delay={100}><Card title="Today logged activity" action={<span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-500"><Activity size={14} />{activitiesToday.length} today</span>}>
        <div className="space-y-3">
          {activitiesToday.slice(0, 8).map((item) => <div key={item.id} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <div className="mb-2 flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-bold text-violet-950">{item.company_name}</div><div className="truncate text-xs text-slate-500">{item.contact_person}</div></div><span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-violet-700">{item.time.slice(0, 5)}</span></div>
            <div className="flex flex-wrap gap-2"><span className="badge bg-fuchsia-100 text-fuchsia-700">{titleize(item.activity_type)}</span><span className="badge bg-slate-100 text-slate-600">{titleize(item.result)}</span></div>
            <div className="mt-3 text-xs font-semibold text-violet-700">{item.executive_name}</div>
          </div>)}
          {!activitiesToday.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No activity has been logged today.</div>}
        </div>
      </Card></Reveal>
    </div>

    <Reveal className="mt-5"><Card title="Recent executive activity" action={<span className="text-xs font-semibold text-violet-500">Latest 100 entries</span>}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activities.slice(0, 12).map((item) => <div key={item.id} className="rounded-2xl border border-violet-100 p-4">
          <div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-bold text-violet-950">{item.company_name}</div><div className="truncate text-xs text-slate-400">{item.contact_person}</div></div><span className="shrink-0 rounded-lg bg-violet-100 px-2 py-1 text-xs font-black text-violet-700">{item.time.slice(0, 5)}</span></div>
          <div className="flex flex-wrap gap-2"><span className="badge bg-fuchsia-100 text-fuchsia-700">{titleize(item.activity_type)}</span><span className="badge bg-slate-100 text-slate-600">{titleize(item.result)}</span></div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-violet-700">{item.executive_name}</span><span className={item.report_submitted ? "text-emerald-600" : "text-amber-600"}>{item.report_submitted ? "Report submitted" : "Awaiting report"}</span></div>
        </div>)}
      </div>
      {!activities.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No executive activity has been logged yet.</div>}
    </Card></Reveal>
  </>;
}
