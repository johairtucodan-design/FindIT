"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/app/app-link";

const links = [
  ["/", "Home"],
  ["/items", "Browse items"],
  ["/stations", "Police stations"],
  ["/about", "About"],
] as const;

export default function ResidentNavigation({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navLinks = signedIn ? [...links, ["/my", "My reports"], ["/claims", "My claims"]] as const : links;
  const moreLinks = signedIn ? [["/about", "About"], ["/my", "My reports"], ["/claims", "My claims"]] as const : [["/about", "About"]] as const;
  const active = (href: string) => pathname === href || (href === "/items" && pathname.startsWith("/items/"));

  return <>
    <button
      className="nav-toggle"
      type="button" aria-label={open ? "Close more links" : "Open more links"}
      aria-expanded={open}
      aria-controls="resident-more-navigation"
      onClick={() => setOpen(value => !value)}
    >
      <span/><span/><span/>
    </button>
    <nav aria-label="Main navigation" className="site-nav desktop-navigation">
      {navLinks.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}
    </nav>
    <nav id="resident-more-navigation" aria-label="More navigation" className={`mobile-more${open ? " is-open" : ""}`}>
      {moreLinks.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    </nav>
  </>;
}
