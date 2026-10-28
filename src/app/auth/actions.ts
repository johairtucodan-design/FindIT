"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function authenticate(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const register = form.get("mode") === "register";
  const fullName = String(form.get("full_name") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return { error: "Enter a valid email address and password." };
  if (register && (!fullName || fullName.length > 150 || password.length < 8)) return { error: "Enter your name (up to 150 characters) and a password of at least 8 characters." };
  const client = await createClient();
  if (register) {
    const origin = (await headers()).get("origin");
    const { data, error } = await client.auth.signUp({ email, password, options: {
      data: { full_name: fullName },
      ...(origin ? { emailRedirectTo: `${origin}/auth/callback` } : {}),
    } });
    if (error) return { error: error.code === "over_email_send_rate_limit" ? "Too many confirmation emails. Please wait before trying again." : "Registration failed. Check your details, or try signing in if you already have an account." };
    if (!data.session) return { success: "Check your email to confirm your account, then sign in. If you already registered, use Sign in." };
  } else {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: error.code === "email_not_confirmed" ? "Confirm your email before signing in." : "Sign in failed. Check your email and password and try again." };
  }
  redirect("/my");
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) redirect("/auth?error=signout");
  redirect("/auth");
}
