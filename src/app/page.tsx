export default function Home() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <>
      <p className="mb-5 text-sm font-bold uppercase tracking-widest text-teal-800">Community lost &amp; found</p>
      <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">A little help finding<br />what matters.</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">Report a lost item or something you found. FindIT explores how community reporting could connect with police handover and custody.</p>
      <aside className="mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-bold text-amber-950">A report is the first step</h2>
        <p className="mt-2 leading-relaxed text-amber-950">Hand this item to police. Reporting it does not mean police hold it.</p>
        <p className="mt-2 text-sm text-amber-900">Found reports begin as Pending Surrender. Receipt and custody must be confirmed separately by an officer.</p>
      </aside>
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold">Foundation preview</h2>
        <p className="mt-2 text-slate-600">Iteration 1: database, access policies and storage. Citizen reporting follows after the foundation review.</p>
        <p className="mt-4 text-sm text-slate-600">Supabase configuration: {configured ? "values present; connection verification pending" : "awaiting project connection"}.</p>
      </section>
      {/* TODO: Iteration 2 authentication, server role checks and citizen reporting. */}
      {/* TODO: Map, station directory UI, search/filters, receipt/custody screens, claims, AI matching, nearby alerts and notifications. */}
    </>
  );
}
