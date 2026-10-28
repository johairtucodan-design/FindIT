"use client";

import { useState, type FormEvent } from "react";
import { authenticate } from "./actions";

export default function AuthForm({ initialError }: { initialError?: string }) {
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
    <section className="panel mx-auto max-w-md">
      <p className="eyebrow">Your FindIT account</p>
      <h1 className="page-title">{register ? "Join the community" : "Welcome back"}</h1>
      <p className="muted mt-3">Any citizen can report a lost or found item.</p>
      <form onSubmit={submit} className="form-grid mt-7" noValidate>
        <input type="hidden" name="mode" value={register ? "register" : "login"} />
        {register && <label>Full name<input name="full_name" autoComplete="name" required maxLength={150} /></label>}
        <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
        <label>Password<input type="password" name="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : undefined} /></label>
        {register && <p className="muted text-sm">Use at least 8 characters. You may need to confirm your email.</p>}
        {message.error && <p className="error" role="alert">{message.error}</p>}
        {message.success && <p className="notice" role="status">{message.success}</p>}
        <button className="button" disabled={pending}>{pending ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <button className="text-link mt-6" type="button" disabled={pending} onClick={() => { setRegister(!register); setMessage({}); }}>
        {register ? "Already registered? Sign in" : "New here? Create an account"}
      </button>
    </section>
  );
}
