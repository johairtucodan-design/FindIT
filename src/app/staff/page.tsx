import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/app/auth/auth-form";
import { Icon } from "@/app/glyph";
import { staffDestination } from "@/lib/staff";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "FindIT | Staff sign in" };

export default async function StaffPage() {
  const { client, user } = await getViewer();
  if (user) {
    const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const destination = staffDestination(profile?.role);
    if (destination) redirect(destination);
  }

  return <div className="auth-shell">
    <aside className="auth-aside">
      <span className="quick-icon"><Icon name="shield"/></span>
      <p className="hero-label mt-6"><span/> FINDIT OPERATIONS</p>
      <p className="auth-tagline">A workspace for staff.</p>
      <p>Demo station officers handle reports, claims, and simulated handovers. Administrators manage stations and review activity.</p>
    </aside>
    <AuthForm staff />
  </div>;
}
