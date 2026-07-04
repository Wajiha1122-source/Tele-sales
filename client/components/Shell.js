"use client";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, ClipboardList, Crown, FileBarChart, LogOut, MessageSquareText, PackageCheck, ShoppingBag, Sparkles, Target, Users } from "lucide-react";
import RouteTransition from "./RouteTransition";

export default function Shell({ user, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const links = {
    EXECUTIVE: [
      { href: "/dashboard", label: "Daily workspace", icon: ClipboardList },
      { href: "/leads", label: "My leads", icon: Target },
      { href: "/purchasers", label: "Purchasers", icon: ShoppingBag },
      { href: "/suppliers", label: "Suppliers", icon: PackageCheck },
      { href: "/messages", label: "Direct messages", icon: MessageSquareText },
      { href: "/updates", label: "Important updates", icon: Bell }
    ],
    MANAGER: [
      { href: "/dashboard", label: "Lead desk", icon: BarChart3 },
      { href: "/leads", label: "Manage leads", icon: Target },
      { href: "/messages", label: "Direct messages", icon: MessageSquareText },
      { href: "/updates", label: "Important updates", icon: Bell },
      { href: "/report-center", label: "Generate report", icon: FileBarChart }
    ],
    CEO: [
      { href: "/dashboard", label: "Executive overview", icon: Crown },
      { href: "/leads", label: "All leads", icon: Target },
      { href: "/purchasers", label: "Purchasers", icon: ShoppingBag },
      { href: "/suppliers", label: "Suppliers", icon: PackageCheck },
      { href: "/messages", label: "Direct messages", icon: MessageSquareText },
      { href: "/updates", label: "Important updates", icon: Bell },
      { href: "/reports", label: "Reports & remarks", icon: Users },
      { href: "/report-center", label: "Generate report", icon: FileBarChart }
    ]
  }[user.role];
  const logout = () => { localStorage.clear(); router.push("/"); };
  return (
    <div className="min-h-screen lg:flex">
      <RouteTransition />
      <aside className="purple-grid sidebar-shell bg-ink p-5 text-white shadow-[18px_0_70px_rgba(24,3,40,.12)] lg:fixed lg:inset-y-0 lg:w-72">
        <div className="sidebar-brand mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-violet-600 font-black shadow-lg shadow-purple-950">I&C</div><div><div className="font-bold">Irshad & Company</div><div className="text-xs text-violet-200/60">Sales command system</div></div></div>
        <nav className="flex gap-2 overflow-auto lg:block lg:space-y-2">
          {links.map(({ href, label, icon: Icon }) => <button key={href} onClick={() => router.push(href)} className={`sidebar-link group flex min-w-fit items-center gap-3 rounded-xl px-3 py-3 text-sm lg:w-full ${pathname === href || (href === "/leads" && pathname.startsWith("/leads/")) ? "bg-white text-violet-950 shadow-lg shadow-black/10" : "text-violet-100/70 hover:bg-white/10 hover:text-white"}`}><span className="transition duration-200 group-hover:scale-125 group-hover:rotate-3"><Icon size={18} /></span>{label}</button>)}
        </nav>
        <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:block"><Sparkles size={18} className="mb-3 text-fuchsia-300" /><p className="text-xs leading-5 text-violet-100/60">{user.role === "MANAGER" ? "Move every lead forward with a clear follow-up and status." : user.role === "CEO" ? "Review performance and add immutable leadership remarks." : "Log the day in under two minutes."}</p></div>
        <div className="mt-8 border-t border-white/10 pt-5 lg:absolute lg:bottom-5 lg:left-5 lg:right-5">
          <div className="mb-3"><div className="text-sm font-semibold">{user.name}</div><div className="text-xs text-white/50">{user.role}</div></div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <main className="page-enter min-w-0 flex-1 p-4 lg:ml-72 lg:p-8 xl:p-10">{children}</main>
    </div>
  );
}
