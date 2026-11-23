"use client";

import { usePathname } from "next/navigation";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

// Mobile-only bottom bar. Report is the primary action in the centre.
export default function ResidentTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const links = [
    ["/", "Home", "home"],
    ["/items", "Browse", "list"],
    ["/report", "Report", "plus"],
    ["/stations", "Stations", "pin"],
    signedIn ? ["/my", "Reports", "archive"] as const : ["/auth", "Sign in", "key"] as const,
  ] as const;
  const active = (href: string) => pathname === href
    || (href === "/items" && pathname.startsWith("/items/"))
    || (href === "/report" && pathname.startsWith("/report"));
  return <nav aria-label="Quick navigation" className="mobile-tab-bar">
    {links.map(([href, label, icon]) => {
      const current = active(href);
      return <Link key={href} href={href} aria-current={current ? "page" : undefined} className={href === "/report" ? "tab-primary" : undefined}>
        <Icon name={icon}/><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
