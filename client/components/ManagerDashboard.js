"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Flame, Target, TrendingUp, Users } from "lucide-react";
import { api } from "../lib/api";
import { Card, Notice, Status } from "./ui";
import Reveal from "./Reveal";
import AnimatedNumber from "./AnimatedNumber";

export default function ManagerDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/dashboard/summary"), api("/leads/all")])
      .then(([summary, allLeads]) => { setData(summary); setLeads(allLeads); })
      .catch((e) => setError(e.message));
  }, []);

  if (!data) return <Notice message={error || "Loading lead desk..."} error={!!error} />;

  const newLeads = leads.filter((lead) => lead.status === "NEW");
  const activeLeads = leads.filter((lead) => !["CONVERTED", "LOST"].includes(lead.status));
  const allWithoutFollowup = activeLeads.filter((lead) => !lead.last_followup);
  const needsFollowup = allWithoutFollowup.slice(0, 6);
  const stats = [
    { label: "New leads waiting", value: newLeads.length, icon: Flame, tone: "from-fuchsia-600 to-violet-700" },
    { label: "Active pipeline", value: activeLeads.length, icon: Target, tone: "from-violet-700 to-indigo-700" },
    { label: "In negotiation", value: leads.filter((lead) => lead.status === "NEGOTIATION").length, icon: TrendingUp, tone: "from-indigo-600 to-blue-700" },
    { label: "No follow-up yet", value: allWithoutFollowup.length, icon: Clock3, tone: "from-purple-700 to-fuchsia-700" }
  ];
  const executives = data.performance || [];

  return <>
    <Reveal variant="clip"><header className="relative mb-8 overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 p-7 shadow-card md:p-8">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="relative"><p className="mb-3 text-sm font-bold uppercase tracking-[.22em] text-violet-600">Manager lead desk</p><h1 className="text-3xl font-black tracking-[-.035em] text-violet-950 md:text-5xl">Turn new leads into next steps.</h1><p className="mt-3 max-w-2xl text-slate-500">Open a lead, record the conversation, and move its status forward. Every update is added to the lead timeline.</p></div>
    </header></Reveal>

    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, tone }, index) => <Reveal key={label} delay={index * 70} variant="scale"><div className={`metric-glow rounded-2xl bg-gradient-to-br ${tone} p-5 text-white shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-glow`}><Icon size={21} className="mb-5 text-white/70" /><div className="text-4xl font-black"><AnimatedNumber value={value} /></div><div className="mt-1 text-sm text-white/70">{label}</div></div></Reveal>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Reveal variant="left"><Card title="Follow-up queue" action={<button className="text-sm font-bold text-violet-700 hover:text-violet-950" onClick={() => router.push("/leads")}>View all</button>}>
        <div className="space-y-3">
          {needsFollowup.length ? needsFollowup.map((lead) => <button key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="group flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-left transition duration-300 hover:translate-x-1 hover:border-violet-300 hover:bg-violet-50">
            <div><div className="font-bold text-violet-950">{lead.company_name}</div><div className="mt-1 text-sm text-slate-500">{lead.contact_person} {lead.city ? `- ${lead.city}` : ""}</div></div>
            <div className="flex items-center gap-3"><Status value={lead.status} /><ArrowRight size={18} className="text-violet-400 transition group-hover:translate-x-1" /></div>
          </button>) : <div className="rounded-2xl bg-emerald-50 p-6 text-sm text-emerald-700">Every active lead has a follow-up. Nicely handled.</div>}
        </div>
      </Card></Reveal>

      <Reveal delay={100} variant="right"><Card title="Manager workflow">
        <div className="space-y-5">
          {[
            ["1", "Open a lead", "Review contact details and the full history."],
            ["2", "Add follow-up", "Write what happened and what comes next."],
            ["3", "Set status", "Move it to contacted, proposal, negotiation, converted, or lost."]
          ].map(([number, title, copy]) => <div key={number} className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 font-black text-violet-800">{number}</div><div><div className="font-bold text-violet-950">{title}</div><p className="text-sm leading-5 text-slate-500">{copy}</p></div></div>)}
        </div>
        <button onClick={() => router.push("/leads")} className="btn-primary mt-6 w-full">Manage lead pipeline <ArrowRight size={17} /></button>
      </Card></Reveal>
    </div>

    <Reveal className="mt-5"><Card title="Executive performance - last 30 days" action={<span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-500"><Users size={14} />{executives.length} executives</span>}>
      <div className="ceo-table-scroll w-full max-w-full overflow-x-auto">
        <table className="min-w-[34rem] w-full">
          <thead><tr><th>Executive</th><th>Reports</th><th>Calls</th><th>Contacts</th><th>Leads</th></tr></thead>
          <tbody>{executives.map((person) => <tr key={person.id}><td className="font-bold text-violet-950">{person.name}</td><td>{person.reports}</td><td>{person.calls}</td><td>{person.contacts}</td><td>{person.leads}</td></tr>)}</tbody>
        </table>
      </div>
      {!executives.length && <div className="rounded-2xl bg-violet-50 p-6 text-sm text-slate-500">No executive activity has been logged yet.</div>}
    </Card></Reveal>
  </>;
}
