import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import AuthForm from "./auth-form";
import { Icon } from "../glyph";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user } = await getViewer();
  if (user && error !== "signout") redirect("/my");
  return <div className="auth-shell">
    <aside className="auth-aside">
      <span className="quick-icon"><Icon name="shield"/></span>
      <p className="hero-label mt-6"><span/> YOUR FINDIT ACCOUNT</p>
      <p className="auth-tagline">A place to keep track.</p>
      <p>Sign in to manage your reports and follow ownership claims privately.</p>
    </aside>
    <AuthForm initialError={error === "confirmation" ? "Confirmation failed or expired. Try signing in or registering again." : error === "signout" ? "Sign out failed. Please try again." : undefined} />
  </div>;
}
