"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetupPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (hash.get("type") !== "invite" || !access_token || !refresh_token) {
      setError("Open this page from your latest FindIT invitation email.");
      return;
    }
    const client = createClient(false);
    clientRef.current = client;
    client.auth.setSession({ access_token, refresh_token }).then(async ({ error }) => {
      window.history.replaceState(null, "", window.location.pathname);
      if (error) { setError("This invitation link could not be verified. Request a new one."); return; }
      const { data, error: userError } = await client.auth.getUser();
      if (!data.user || userError) { setError("This invitation link could not be verified. Request a new one."); return; }
      setReady(true);
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 8) { setError("Use a password of at least 8 characters."); return; }
    if (password !== form.get("confirm")) { setError("The passwords do not match."); return; }
    setError("");
    const { error } = await clientRef.current!.auth.updateUser({ password });
    if (error) { setError("Could not set your password. Please try again."); return; }
    setDone(true);
  }

  return <section className="panel mx-auto max-w-md"><p className="eyebrow">FindIT invitation</p><h1 className="page-title">{done ? "Account ready" : "Choose a password"}</h1>
    {done ? <div className="mt-5 grid gap-3"><p>You can now sign in using your invited email address and the password you chose.</p><Link className="button" href="/auth">Resident sign in</Link><Link className="text-link" href="/staff">Station sign in</Link><Link className="text-link" href="/admin">Admin sign in</Link></div>
      : <><p className="muted mt-3">Finish setting up your invited account. Use a password that you can share with teammates only if you intend to share this demo login.</p>{error && <p className="error mt-5" role="alert">{error}</p>}{ready && <form className="form-grid mt-6" onSubmit={submit}><label className="auth-field"><span>New password</span><input type="password" name="password" autoComplete="new-password" minLength={8} required/></label><label className="auth-field"><span>Confirm password</span><input type="password" name="confirm" autoComplete="new-password" minLength={8} required/></label><button className="button auth-submit">Set password</button></form>}</>}
  </section>;
}
