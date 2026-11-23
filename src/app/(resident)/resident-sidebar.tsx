"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";

const explore = [["/", "Home", "home"], ["/items", "Browse items", "list"], ["/stations", "Police stations", "pin"], ["/about", "About FindIT", "shield"]] as const;
const account = [["/my", "My reports", "archive"], ["/claims", "My claims", "key"]] as const;

// Desktop-only navigation. The mobile shell uses ResidentTabBar and the top bar instead.
export default function ResidentSidebar({ signedIn, footer }: { signedIn: boolean; footer: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href === "/items" && pathname.startsWith("/items/")) || (href === "/report" && pathname.startsWith("/report"));
  const item = ([href, label, icon]: (typeof explore)[number] | (typeof account)[number]) => (
    <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}><Icon name={icon} size={18}/><span>{label}</span></Link>
  );
  return <aside className="app-sidebar" aria-label="Site navigation">
    <Link href="/" className="brand"><span className="brand-icon"><Icon name="mark"/></span><span className="brand-name">Find<span>IT</span></span></Link>
    <div className="sidebar-report">
      <p className="sidebar-group-label">Report an item</p>
      <Link className="button sidebar-report-button" href="/report/lost"><Icon name="plus" size={18}/> Lost item</Link>
      <Link className="button secondary sidebar-report-button" href="/report/found"><Icon name="box" size={18}/> Found item</Link>
    </div>
    <nav aria-label="Explore">
      <p className="sidebar-group-label">Explore</p>
      {explore.map(item)}
    </nav>
    {signedIn && <nav aria-label="Your account">
      <p className="sidebar-group-label">Your account</p>
      {account.map(item)}
    </nav>}
    <div className="sidebar-footer">{footer}</div>
  </aside>;
}
