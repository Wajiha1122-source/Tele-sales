"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useSession() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw || !localStorage.getItem("token")) router.replace("/");
    else setUser(JSON.parse(raw));
  }, [router]);
  return user;
}
