"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { codespacesHost } from "@/lib/codespaces.mjs";
import { canOpenPortal, portals, type Portal } from "@/lib/staff";

export async function authenticate(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode");
  const register = mode === "register";
  const portal = mode === "station" || mode === "admin" ? mode : null;
  const fullName = String(form.get("full_name") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return { error: "Enter a valid email address and password." };
  if (register && (!fullName || fullName.length > 150 || password.length < 8)) return { error: "Enter your name (up to 150 characters) and a password of at least 8 characters." };
  const client = await createClient();
  let userId: string | undefined;
  if (register) {
    const host = codespacesHost(process.env);
    const origin = host ? `https://${host}` : (await headers()).get("origin");
    const { data, error } = await client.auth.signUp({ email, password, options: {
      data: { full_name: fullName },
      ...(origin ? { emailRedirectTo: `${origin}/auth/callback` } : {}),
    } });
    if (error) return { error: error.code === "over_email_send_rate_limit" ? "Too many confirmation emails. Please wait before trying again." : "Registration failed. Check your details, or try signing in if you already have an account." };
    if (!data.session) return { success: "Check your email to confirm your account, then sign in. If you already registered, use Sign in." };
    userId = data.user?.id;
  } else {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.code === "email_not_confirmed" ? "Confirm your email before signing in." : "Sign in failed. Check your email and password and try again." };
    userId = data.user.id;
  }
  if (portal) {
    const {data:profile,error:profileError}=userId?await client.from("profiles").select("role").eq("id",userId).single():{data:null,error:null};
    if (!canOpenPortal(portal, profile?.role)) {
      await client.auth.signOut({scope:"local"});
      return {error:!userId || profileError ? "Workspace access couldn’t be checked. Try signing in again." : portal === "admin" ? "This account does not have administrator access." : "This account does not have station officer access."};
    }
  }
  redirect(portal ? portals[portal].home : "/my");
}

async function endSession(destination: string) {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) redirect(`${destination}?error=signout`);
  redirect(destination);
}

export async function signOut() { await endSession("/auth"); }
export async function signOutOfPortal(portal: Portal) { await endSession(portals[portal === "admin" ? "admin" : "station"].login); }
