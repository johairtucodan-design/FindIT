import Link from "next/link";
import { getRoleProfile } from "@/lib/auth";

export default async function AccessDenied() {
  const profile = await getRoleProfile();
  const message = profile?.role === "admin"
    ? "You’re signed in as an administrator. Use the Admin console for map activity, or Station Ops for receiving and custody."
    : profile?.role === "officer" && !profile.station_id
      ? "Your account has Staff access, but no station is assigned yet. Ask a FindIT administrator to assign an approved public reference."
      : profile?.role === "citizen"
        ? "This workspace needs Staff or Admin access. Your current FindIT account has Citizen access."
        : "Your account does not have the role needed to access this page.";
  return <main className="site-width site-main" id="main"><section className="panel mx-auto max-w-lg"><p className="eyebrow">Restricted workspace</p><h1 className="page-title">Access denied</h1><p className="muted my-5">{message}</p><div className="flex flex-wrap gap-3"><Link className="button" href="/my">My reports</Link><Link className="button secondary" href="/staff">Station sign-in</Link><Link className="button secondary" href="/admin">Admin sign-in</Link></div></section></main>;
}
