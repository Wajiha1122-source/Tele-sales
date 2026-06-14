"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Layers3, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import { Button, Notice } from "../components/ui";

const sliderWords = ["conversations", "follow-ups", "decisions", "growth"];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [state, setState] = useState({ loading: false, error: "" });

  useEffect(() => { if (localStorage.getItem("token")) router.replace("/dashboard"); }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "" });
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  };

  return <main className="login-canvas min-h-screen overflow-hidden">
    <div className="login-orb login-orb-one" />
    <div className="login-orb login-orb-two" />
    <section className="relative z-10 grid min-h-screen lg:grid-cols-[1.15fr_.85fr]">
      <div className="purple-grid relative hidden overflow-hidden border-r border-white/10 bg-[#10021c]/95 p-10 text-white lg:flex lg:flex-col xl:p-16">
        <div className="login-brand-reveal flex items-center gap-3">
          <div className="brand-cube">I&C</div>
          <div><div className="font-black tracking-tight">Irshad & Company</div><div className="text-xs text-violet-300/60">Sales intelligence workspace</div></div>
        </div>

        <div className="my-auto max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[.22em] text-fuchsia-200"><Sparkles size={14} />Built for sales velocity</div>
          <h1 className="login-headline text-[clamp(3.1rem,4.5vw,4.75rem)] font-black leading-[.98] tracking-[-.045em]"><span>Turn daily work into</span><br /><span className="text-slider"><span>{sliderWords.map((word) => <i key={word}>{word}.</i>)}</span></span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-violet-100/60">One premium workspace for executive activity, Manager follow-ups, and CEO-level clarity.</p>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              [TrendingUp, "Live pipeline", "Know what moves"],
              [Layers3, "Full history", "Never lose context"],
              [ShieldCheck, "Role clarity", "Everyone sees the right work"]
            ].map(([Icon, title, copy], index) => <div key={title} className="login-feature" style={{ animationDelay: `${index * 120}ms` }}><Icon size={19} /><div className="mt-5 text-sm font-bold">{title}</div><div className="mt-1 text-xs leading-5 text-violet-200/50">{copy}</div></div>)}
          </div>
        </div>

        <div className="flex items-center gap-8 text-xs text-violet-200/45"><span className="flex items-center gap-2"><CheckCircle2 size={15} />Two-minute reporting</span><span className="flex items-center gap-2"><CheckCircle2 size={15} />Immutable leadership remarks</span></div>
      </div>

      <div className="relative flex items-center justify-center p-5 md:p-10">
        <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden"><div className="brand-cube">I&C</div><div className="font-black text-violet-950">Irshad & Company</div></div>
        <form onSubmit={submit} className="login-panel w-full max-w-[30rem]">
          <div className="mb-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-violet-700"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-600" />Secure workspace</div>
            <h2 className="text-4xl font-black tracking-[-.04em] text-violet-950">Welcome back.</h2>
            <p className="mt-3 text-slate-500">Sign in to continue to your role-specific command center.</p>
          </div>
          <Notice message={state.error} error />
          <div className="group mb-5"><label>Email address</label><input className="login-input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></div>
          <div className="group mb-7"><label>Password</label><input className="login-input" type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your secure password" /></div>
          <Button loading={state.loading} className="btn-primary group w-full py-3.5">Enter workspace <ArrowRight size={18} className="transition group-hover:translate-x-1" /></Button>
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} />Protected with encrypted authentication</div>
        </form>
      </div>
    </section>
  </main>;
}
