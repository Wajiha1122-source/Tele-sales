"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Notice } from "../../components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://tele-sales.onrender.com";

function SsoLoginContent() {
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("SSO login failed: invalid or expired token.");
      return;
    }
    window.location.replace(`${API_URL}/sso-login?token=${encodeURIComponent(token)}`);
  }, [params]);

  return <main className="login-canvas grid min-h-screen place-items-center p-6">
    <section className="login-panel w-full max-w-md text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
        <ShieldCheck size={22} />
      </div>
      <h1 className="text-2xl font-black text-violet-950">Starting secure sign-in</h1>
      <p className="mt-3 text-sm text-slate-500">Please wait while your Master Dashboard session is verified.</p>
      <Notice message={error} error />
    </section>
  </main>;
}

export default function SsoLoginPage() {
  return <Suspense fallback={<main className="login-canvas min-h-screen" />}>
    <SsoLoginContent />
  </Suspense>;
}
