import { redirect } from "next/navigation";
import { getRoleProfile } from "@/lib/auth";
import { getViewer } from "@/lib/supabase/server";
import { canOpenPortal, portals, type Portal } from "@/lib/staff";
import AuthForm from "./(resident)/auth/auth-form";
import { signOutOfPortal } from "./(resident)/auth/actions";
import Link from "./app-link";
import { Icon } from "./glyph";

const info = {
  station: {
    label: "Station Operations", icon: "shield", title: "From report to return.",
    text: "Review reports, record physical receipt, and manage handovers for your assigned demo station.",
    features: [["01", "Receiving queue"], ["02", "Custody and claims"]],
  },
  admin: {
    label: "Administration", icon: "chart", title: "See the whole operation.",
    text: "Oversee demo stations, review activity, and manage record retention in one place.",
    features: [["01", "Station oversight"], ["02", "Audit and retention"]],
  },
} as const;

export default async function PortalLogin({ portal, error }: { portal: Portal; error?: string }) {
  const { user } = await getViewer();
  const profile = user ? await getRoleProfile() : null;
  const allowed = canOpenPortal(portal, profile?.role);
  if (allowed && error !== "signout") redirect(portals[portal].home);
  const content = info[portal];
  const other = portal === "admin" ? "station" : "admin";
  return <main id="main" className={`portal portal-login portal-${portal}`}>
    <section className="portal-intro">
      <Link href="/" className="portal-wordmark"><span><Icon name="mark"/></span>FindIT</Link>
      <div className="portal-intro-copy">
        <span className="portal-emblem"><Icon name={content.icon} size={32}/></span>
        <p className="portal-overline">{content.label} · Iligan City</p>
        <p className="portal-display">{content.title}</p>
        <p>{content.text}</p>
        <ul>{content.features.map(([number, feature]) => <li key={number}><span>{number}</span>{feature}</li>)}</ul>
      </div>
      <p className="portal-caption">FindIT · Demonstration environment</p>
    </section>
    <div className="portal-auth-area">
      {user ? <section className="portal-auth-card">
        <p className="eyebrow">Secure workspace</p>
        <h1 className="page-title">{allowed ? "Sign out failed" : "Different access required"}</h1>
        <p className="muted mt-3">{allowed ? "Try signing out again." : `You’re signed in, but this account doesn’t have ${portal === "admin" ? "administrator" : "station officer"} access.`}</p>
        <form className="mt-6" action={signOutOfPortal.bind(null, portal)}><button className="button">{allowed ? "Try again" : "Sign out to switch accounts"}</button></form>
      </section> : <AuthForm portal={portal} initialError={error === "signout" ? "Sign out failed. Try again." : undefined}/>}
      <nav className="portal-login-links" aria-label="Other sign-in pages">
        <Link href="/" className="text-link">Resident site</Link><Link href={portals[other].login} className="text-link">{other === "admin" ? "Admin sign-in" : "Station sign-in"}</Link>
      </nav>
    </div>
  </main>;
}
