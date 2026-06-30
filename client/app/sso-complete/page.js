"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Notice } from "../../components/ui";

function SsoCompleteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const token = params.get("token");
      const user = params.get("user");
      const redirect = decodeURIComponent(params.get("redirect") || "/dashboard");
      if (!token || !user) throw new Error("SSO login failed: invalid session handoff.");
      localStorage.setItem("token", token);
      localStorage.setItem("user", decodeURIComponent(user));
      router.replace(redirect.startsWith("/") ? redirect : "/dashboard");
    } catch (caught) {
      setError(caught.message || "SSO login failed: invalid session handoff.");
    }
  }, [params, router]);

  return <main className="login-canvas grid min-h-screen place-items-center p-6">
    <section className="login-panel w-full max-w-md text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
        <ShieldCheck size={22} />
      </div>
      <h1 className="text-2xl font-black text-violet-950">Completing secure sign-in</h1>
      <p className="mt-3 text-sm text-slate-500">Please wait while your workspace opens.</p>
      <Notice message={error} error />
    </section>
  </main>;
}

export default function SsoCompletePage() {
  return <Suspense fallback={<main className="login-canvas min-h-screen" />}>
    <SsoCompleteContent />
  </Suspense>;
}
