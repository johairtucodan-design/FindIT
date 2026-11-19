import Link from "@/app/app-link";
import ReportKind from "@/app/report-kind";
import { createClient } from "@/lib/supabase/server";
import { statusLabel, type Report } from "@/lib/reports";
import DemoPhoto from "../items/demo-photo";

const kinds = [["", "All examples"], ["lost", "Lost examples"], ["found", "Found examples"]] as const;

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const params = await searchParams;
  const kind = params.kind === "lost" || params.kind === "found" ? params.kind : "";
  const client = await createClient();
  const { data, error } = await client.from("public_items").select("*").eq("is_demo", true).order("occurred_at", { ascending: false }).limit(100);
  const allReports = (data ?? []) as Report[];
  const reports = kind ? allReports.filter(report => report.kind === kind) : allReports;
  const count = (itemKind: string) => allReports.filter(report => report.kind === itemKind).length;

  return <>
    <p className="eyebrow">FindIT / demonstration mode</p>
    <h1 className="page-title">Explore the demo data</h1>
    <p className="muted mt-3">These are clearly marked synthetic examples for coursework testing. They are not actual community reports, people, locations, police handovers, or custody records.</p>
    <aside className="demo-disclaimer mt-5">Found examples start as <strong>Reported — Not Received</strong>. A report does not mean police hold the item. All area labels are synthetic; report photos are representative illustrations only.</aside>
    <div className="demo-counts mt-5" aria-label="Demo report totals"><span><strong>{count("lost")}</strong> lost examples</span><span><strong>{count("found")}</strong> found examples</span></div>
    <nav className="listing-tabs mt-5" aria-label="Filter demo examples">{kinds.map(([value, label]) => <Link key={value} className="button secondary" href={value ? `/demo?kind=${value}` : "/demo"} aria-current={kind === value ? "page" : undefined}>{label}</Link>)}</nav>
    {error ? <p className="error mt-5" role="alert">Demo examples could not be loaded. Try again later.</p> : reports.length ? <ul className="listing-grid mt-5">{reports.map(report => <li key={report.id}><Link className="panel report-card quick-card block h-full" href={`/items/${report.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="demo-badge">Demo example</span><ReportKind kind={report.kind}/><span className={`status ${report.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(report.status)}</span></div>
      <DemoPhoto id={report.id} isDemo={report.is_demo}/>
      <h2 className="mt-3 text-xl font-bold">{report.title}</h2><p className="muted mt-2">{report.category} · {report.location_text} · {report.occurred_at.slice(0, 10)}</p><span className="quick-action">View example</span>
    </Link></li>)}</ul> : <section className="panel mt-5"><h2 className="font-bold text-xl">No examples to show</h2><p className="muted mt-2">Try another demo category.</p></section>}
  </>;
}
