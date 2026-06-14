"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import Shell from "../../components/Shell";
import { Card, Notice, Status } from "../../components/ui";
import Reveal from "../../components/Reveal";
import { api } from "../../lib/api";
import { useSession } from "../../hooks/useSession";

export default function LeadsPage() {
  const user = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const route = user.role === "EXECUTIVE" ? "/leads/my" : "/leads/all";
    return api(`${route}?search=${encodeURIComponent(search)}`).then(setLeads).catch((e) => setError(e.message));
  }, [user, search]);

  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return null;

  const copy = {
    EXECUTIVE: { eyebrow: "Your pipeline", title: "My created leads", description: "Track the progress of leads you have passed into the sales pipeline.", action: "View" },
    MANAGER: { eyebrow: "Manager workflow", title: "Manage leads & follow-ups", description: "Open any lead to record a follow-up and update its pipeline status.", action: "Follow up" },
    CEO: { eyebrow: "Company pipeline", title: "All leads & oversight", description: "Review lead history, Manager updates, and add immutable CEO remarks.", action: "Review" }
  }[user.role];

  return <Shell user={user}>
    <Reveal variant="clip"><header className="page-hero mb-7">
      <p className="text-sm font-bold uppercase tracking-[.22em] text-violet-600">{copy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black text-violet-950 md:text-4xl">{copy.title}</h1>
      <p className="mt-2 text-slate-500">{copy.description}</p>
    </header></Reveal>
    <Notice message={error} error />
    <Reveal delay={80}><Card>
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="mb-4 flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, or phone" /></div>
        <button className="btn-primary">Search</button>
      </form>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Company</th><th>Contact</th><th>City</th><th>Status</th><th>Last follow-up</th><th></th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer"><td className="font-bold text-violet-950">{lead.company_name}</td><td>{lead.contact_person}<div className="text-xs text-slate-400">{lead.phone}</div></td><td>{lead.city || "-"}</td><td><Status value={lead.status} /></td><td>{lead.last_followup ? new Date(lead.last_followup).toLocaleDateString() : "-"}</td><td><span className="inline-flex items-center gap-1 font-bold text-violet-700">{copy.action}<ArrowRight size={15} /></span></td></tr>)}</tbody></table></div>
    </Card></Reveal>
  </Shell>;
}
