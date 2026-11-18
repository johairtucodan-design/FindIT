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

  return <>
    <button
      className="nav-toggle"
      type="button"
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      aria-controls="resident-navigation"
      onClick={() => setOpen(value => !value)}
    >
      <span/><span/><span/>
    </button>
    <nav id="resident-navigation" aria-label="Resident navigation" className={`site-nav${open ? " is-open" : ""}`}>
      {navLinks.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href || (href === "/items" && pathname.startsWith("/items/")) ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    </nav>
  </>;
}
