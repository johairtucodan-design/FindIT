"use client";

import { useState, type FormEvent } from "react";
import type { Portal } from "@/lib/staff";
import { authenticate } from "./actions";

export default function AuthForm({ initialError, portal }: { initialError?: string; portal?: Portal }) {
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({ error: initialError });
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage({});
    try { setMessage(await authenticate(new FormData(event.currentTarget))); }
    catch { setMessage({ error: "Unable to connect. Your entries are kept; please try again." }); }
    finally { setPending(false); }
  }
  return (
    <section className={portal ? "portal-auth-card" : "panel mx-auto max-w-md"}>
      <p className="eyebrow">{portal ? "Secure workspace" : "Your FindIT account"}</p>
      <h1 className="page-title">{portal === "admin" ? "Administrator sign in" : portal === "station" ? "Station officer sign in" : register ? "Join the community" : "Welcome back"}</h1>
      <p className="muted mt-3">{portal ? "Use your existing FindIT email and password." : "Any citizen can report a lost or found item."}</p>
      <form onSubmit={submit} className="form-grid mt-7" noValidate>
        <input type="hidden" name="mode" value={portal ?? (register ? "register" : "login")} />
        {register && <label className="auth-field"><span>Full name</span><input name="full_name" autoComplete="name" placeholder="Your name" required maxLength={150} /></label>}
        <label className="auth-field"><span>Email address</span><input type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
        <label className="auth-field"><span>Password</span><input type="password" name="password" autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "At least 8 characters" : "Enter your password"} required minLength={register ? 8 : undefined} />{register && <span className="report-hint">Use at least 8 characters. You may need to confirm your email.</span>}</label>
        {message.error && <p className="error" role="alert">{message.error}</p>}
        {message.success && <p className="notice" role="status">{message.success}</p>}
        <button className="button auth-submit" disabled={pending}>{pending ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      {!portal && <button className="text-link mt-6" type="button" disabled={pending} onClick={() => { setRegister(!register); setMessage({}); }}>
          {register ? "Already registered? Sign in" : "New here? Create an account"}
        </button>}
    </section>
  );
}
