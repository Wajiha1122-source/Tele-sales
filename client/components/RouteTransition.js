"use client";

import { usePathname } from "next/navigation";

export default function RouteTransition() {
  const pathname = usePathname();

  return (
    <div key={pathname} className="route-transition" aria-hidden="true">
      <span />
      <span />
    </div>
  );
}
