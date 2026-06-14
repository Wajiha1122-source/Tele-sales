"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Crown, Gauge, PhoneCall, Sparkles, TrendingUp, Users } from "lucide-react";
import { api, titleize } from "../lib/api";
import { Card, Notice, Status } from "./ui";
import Reveal from "./Reveal";
import AnimatedNumber from "./AnimatedNumber";

export default function CeoDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/dashboard/summary"), api("/reports/all"), api("/leads/all")])
      .then(([summary, allReports, allLeads]) => {
        setData(summary);
        setReports(allReports);
        setLeads(allLeads);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  if (!data) return <Notice message={error || "Loading executive overview..."} error={!!error} />;

  const total = Number(data.leads.total) || 0;
  const converted = Number(data.leads.converted) || 0;
  const conversionRate = total ? Math.round((converted / total) * 100) : 0;
  const active = leads.filter((lead) => !["CONVERTED", "LOST"].includes(lead.status)).length;
  const pipeline = ["NEW", "CONTACTED", "IN_PROGRESS", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED"];
  const maxPipeline = Math.max(1, ...pipeline.map((status) => leads.filter((lead) => lead.status === status).length));
  const topExecutive = data.performance[0];

  const cards = [
    { label: "Total leads", value: total, icon: BriefcaseBusiness, detail: `${active} active now` },
    { label: "Converted", value: converted, icon: CheckCircle2, detail: `${conversionRate}% conversion` },
    { label: "Calls today", value: data.today.calls, icon: PhoneCall, detail: `${data.today.contacts} contacts reached` },
    { label: "Reports today", value: data.today.reports, icon: Users, detail: `${data.today.meetings} meetings set` }
  ];

  return <>
    <Reveal variant="clip">
      <header className="premium-dark relative mb-7 overflow-hidden rounded-[2rem] p-7 text-white md:p-9">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-white/10 bg-fuchsia-400/10 blur-2xl" />
        <div className="absolute bottom-0 right-24 h-32 w-64 rounded-t-full bg-violet-300/5 blur-xl" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_.8fr] xl:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-fuchsia-200"><Crown size={14} />CEO command center</div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-.045em] md:text-6xl">Clarity at the speed of your sales team.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-violet-100/60 md:text-base">Company-wide performance, pipeline movement, executive output, and immutable leadership guidance in one view.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-chip"><Gauge size={18} className="text-fuchsia-300" /><div className="mt-4 text-3xl font-black"><AnimatedNumber value={conversionRate} suffix="%" /></div><div className="text-xs text-violet-200/50">Lead conversion</div></div>
            <div className="glass-chip"><TrendingUp size={18} className="text-violet-300" /><div className="mt-4 text-3xl font-black"><AnimatedNumber value={active} /></div><div className="text-xs text-violet-200/50">Active opportunities</div></div>
          </div>
        </div>
      </header>
    </Reveal>

    <div className="ceo-metrics mb-6 grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, detail }, index) => <Reveal key={label} className="min-w-0" delay={index * 70} variant="scale"><Card className="metric-glow ceo-metric-card h-full"><div className="mb-3 flex items-center justify-between sm:mb-6"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700 transition duration-300 group-hover:rotate-3 sm:h-11 sm:w-11 sm:rounded-2xl"><Icon size={18} /></div><Sparkles size={14} className="hidden text-violet-200 sm:block" /></div><div className="text-3xl font-black tracking-[-.04em] text-violet-950 sm:text-4xl"><AnimatedNumber value={value} /></div><div className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{label}</div><div className="mt-1 truncate text-[10px] text-slate-400 sm:mt-3 sm:text-xs">{detail}</div></Card></Reveal>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Reveal variant="left"><Card title="Pipeline intelligence" action={<button onClick={() => router.push("/leads")} className="inline-flex items-center gap-1 text-xs font-bold text-violet-700">Explore pipeline <ArrowRight size={14} /></button>}>
        <div className="space-y-5">{pipeline.map((status) => {
          const count = leads.filter((lead) => lead.status === status).length;
          const width = Math.max(count ? 8 : 0, (count / maxPipeline) * 100);
          return <div key={status}><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleize(status)}</span><span className="text-sm font-black text-violet-950">{count}</span></div><div className="progress-track"><div className="progress-value" style={{ width: `${width}%` }} /></div></div>;
        })}</div>
      </Card></Reveal>

      <Reveal delay={100} variant="right"><Card className="h-full" title="Leadership pulse">
        <div className="rounded-2xl bg-gradient-to-br from-violet-950 to-purple-800 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-violet-300">Top executive - 30 days</div>
          <div className="mt-4 text-2xl font-black">{topExecutive?.name || "No activity yet"}</div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[["Calls", topExecutive?.calls || 0], ["Contacts", topExecutive?.contacts || 0], ["Leads", topExecutive?.leads || 0]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/10 p-3"><div className="text-xl font-black"><AnimatedNumber value={value} /></div><div className="text-[10px] uppercase text-violet-200/50">{label}</div></div>)}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={() => router.push("/reports")} className="group flex w-full items-center justify-between rounded-xl border border-violet-100 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50"><div><div className="text-sm font-bold text-violet-950">Review daily reports</div><div className="text-xs text-slate-400">Inspect activities and add remarks</div></div><ArrowRight size={16} className="text-violet-400 transition group-hover:translate-x-1" /></button>
          <button onClick={() => router.push("/leads")} className="group flex w-full items-center justify-between rounded-xl border border-violet-100 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50"><div><div className="text-sm font-bold text-violet-950">Review lead history</div><div className="text-xs text-slate-400">See Manager follow-ups and movement</div></div><ArrowRight size={16} className="text-violet-400 transition group-hover:translate-x-1" /></button>
        </div>
      </Card></Reveal>
    </div>

    <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)]">
      <Reveal className="min-w-0"><Card className="min-w-0" title="Executive performance - last 30 days">
        <div className="ceo-table-scroll w-full max-w-full overflow-x-auto"><table className="min-w-[34rem] w-full"><thead><tr><th>Executive</th><th>Reports</th><th>Calls</th><th>Contacts</th><th>Leads</th></tr></thead><tbody>{data.performance.map((person) => <tr key={person.id}><td className="font-bold text-violet-950">{person.name}</td><td>{person.reports}</td><td>{person.calls}</td><td>{person.contacts}</td><td>{person.leads}</td></tr>)}</tbody></table></div>
      </Card></Reveal>

      <Reveal className="min-w-0" delay={100}><Card className="min-w-0" title="Recent reports" action={<button onClick={() => router.push("/reports")} className="shrink-0 text-xs font-bold text-violet-700">Review all</button>}>
        <div className="min-w-0 space-y-3">{reports.slice(0, 5).map((report) => <button key={report.id} onClick={() => router.push("/reports")} className="group flex w-full min-w-0 items-center justify-between gap-3 rounded-xl bg-violet-50/60 p-3 text-left transition hover:bg-violet-100 sm:hover:translate-x-1"><div className="min-w-0"><div className="truncate text-sm font-bold text-violet-950">{report.executive_name}</div><div className="truncate text-xs text-slate-500">{new Date(report.date).toLocaleDateString()} - {report.total_calls} calls</div></div><ArrowRight size={16} className="shrink-0 text-violet-400 transition group-hover:translate-x-1" /></button>)}</div>
      </Card></Reveal>
    </div>

    <Reveal className="mt-5"><Card title="Recent lead movement" action={<button onClick={() => router.push("/leads")} className="text-xs font-bold text-violet-700">Open pipeline</button>}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{leads.slice(0, 6).map((lead) => <button key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="group rounded-2xl border border-violet-100 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-card"><div className="mb-3 flex items-start justify-between gap-3"><div className="font-bold text-violet-950">{lead.company_name}</div><Status value={lead.status} /></div><div className="text-sm text-slate-500">{lead.contact_person} - {lead.created_by_name}</div><div className="mt-4 flex items-center gap-1 text-xs font-bold text-violet-600 opacity-0 transition group-hover:opacity-100">Inspect timeline <ArrowRight size={13} /></div></button>)}</div>
    </Card></Reveal>
  </>;
}
