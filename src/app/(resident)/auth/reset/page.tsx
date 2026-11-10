"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordLink } from "../actions";

export default function ResetPage() {
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try { setMessage(await requestPasswordLink(String(form.get("login") ?? ""))); }
    catch { setMessage({ error: "Unable to connect. Please try again." }); }
    finally { setPending(false); }
  }
  return <section className="panel mx-auto max-w-md"><p className="eyebrow">Account help</p><h1 className="page-title">Get a password link</h1><p className="muted mt-3">Enter your email or FindIT demo username. We’ll email a link to choose a password.</p><form onSubmit={submit} className="form-grid mt-6"><label className="auth-field"><span>Email or demo username</span><input name="login" autoComplete="username" required placeholder="findituser"/></label>{message.error && <p role="alert" className="error">{message.error}</p>}{message.success && <p role="status" className="notice">{message.success}</p>}<button className="button auth-submit" disabled={pending}>{pending ? "Requesting…" : "Email password link"}</button></form><Link className="text-link mt-5 inline-block" href="/auth">Back to sign in</Link></section>;
}
