"use client";

import { usePathname } from "next/navigation";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

const links = [["/", "Home", "home"], ["/items", "Browse", "list"], ["/stations", "Stations", "pin"]] as const;

export default function ResidentTabBar() {
  const pathname = usePathname();
  return <nav aria-label="Quick navigation" className="mobile-tab-bar">
    {links.map(([href, label, icon]) => {
      const active = pathname === href || (href === "/items" && pathname.startsWith("/items/"));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon name={icon}/><span>{label}</span></Link>;
    })}
  </nav>;
}
