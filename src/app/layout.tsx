import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./auth/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindIT | Community lost and found",
  description: "A coursework prototype for police-coordinated community lost and found.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
            <Link href="/" className="text-2xl font-black tracking-tight text-teal-800">FindIT<span className="text-amber-600">.</span></Link>
            <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              {user ? <><Link href="/my" className="text-link">My reports</Link><form action={signOut}><button className="text-link">Sign out</button></form></> : <Link href="/auth" className="text-link">Sign in / Register</Link>}
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">Coursework prototype</span>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-5 py-12 sm:py-20">{children}</main>
        <footer className="mx-auto max-w-5xl border-t border-slate-200 px-5 py-6 text-sm text-slate-600">
          Demo stations only. No real police partnership is claimed.
        </footer>
      </body>
    </html>
  );
}
