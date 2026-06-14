import { LoaderCircle } from "lucide-react";
import { titleize } from "../lib/api";

export function Card({ title, action, children, className = "" }) {
  return (
    <section className={`card group ${className}`}>
      {(title || action) && <div className="mb-4 flex min-w-0 items-center justify-between gap-3"><h2 className="min-w-0 font-bold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Button({ loading, children, className = "btn-primary", ...props }) {
  return <button className={className} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle size={16} className="animate-spin" />}{children}</button>;
}

export function Status({ value }) {
  const colors = {
    NEW: "bg-violet-100 text-violet-800", CONVERTED: "bg-emerald-100 text-emerald-700",
    LOST: "bg-rose-100 text-rose-700", NEGOTIATION: "bg-amber-100 text-amber-700",
    CONTACTED: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-fuchsia-100 text-fuchsia-700",
    PROPOSAL_SENT: "bg-indigo-100 text-indigo-700", NO_RESPONSE: "bg-slate-100 text-slate-700"
  };
  return <span className={`badge ${colors[value] || "bg-slate-100 text-slate-700"}`}>{titleize(value)}</span>;
}

export function Notice({ message, error }) {
  if (!message) return null;
  return <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</div>;
}
