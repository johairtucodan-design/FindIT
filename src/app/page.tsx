import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  // Supabase may redirect confirmations to the project's configured site root.
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  return (
    <>
      <p className="mb-5 text-sm font-bold uppercase tracking-widest text-teal-800">Community lost &amp; found</p>
      <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">A little help finding<br />what matters.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">Report a lost item or something you found. FindIT explores how community reporting could connect with police handover and custody.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/report/lost" className="button">I lost something</Link><Link href="/report/found" className="button secondary">I found something</Link></div>
      <aside className="mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-950">A report is the first step</h2>
        <p className="mt-2 leading-relaxed text-amber-950">Hand this item to police. Reporting it does not mean police hold it.</p>
        <p className="mt-2 text-sm text-amber-900">Found reports begin as Pending Surrender. Receipt and custody must be confirmed separately by an officer.</p>
      </aside>
      <section className="mt-10 grid gap-5 sm:grid-cols-3" aria-label="How reporting works">
        {[["01", "Tell the community", "Sign in and describe what was lost or found."], ["02", "Keep track", "Your reports and their current status stay in My reports."], ["03", "Understand custody", "Police receipt and custody require a separate officer confirmation, planned for a later iteration."]].map(([number, title, text]) => <div className="panel" key={number}><span className="eyebrow">{number}</span><h2 className="mt-3 font-bold">{title}</h2><p className="muted mt-2 text-sm leading-relaxed">{text}</p></div>)}
      </section>
      {/* TODO: Map, station directory UI, search/filters, receipt/custody screens, claims, AI matching, nearby alerts and notifications. */}
    </>
  );
}
