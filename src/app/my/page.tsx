import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { statusLabel, type Report } from "@/lib/reports";

export default async function MyReports() {
  const { client } = await requireUser();
  const { data, error } = await client.rpc("my_reports");
  if (error) throw new Error("Unable to load your reports. Please try again.");
  const reports = (data ?? []) as Report[];
  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Your activity</p><h1 className="page-title">My reports</h1><p className="muted mt-3">Your lost and found reports, with their current status.</p></div><div className="flex flex-wrap gap-3"><Link className="button" href="/report/lost">Report lost</Link><Link className="button secondary" href="/report/found">Report found</Link></div></div>
    {reports.length === 0 ? <section className="panel"><h2 className="text-xl font-bold">No reports yet</h2><p className="muted mt-3">Lost something, or found an item? Start a report above.</p></section> : <ul className="grid gap-4">{reports.map(report => <li key={report.id}><Link className="panel report-card block" href={`/items/${report.id}`}><div className="flex flex-wrap items-center justify-between gap-3"><span className="eyebrow">{report.kind} item</span><span className={`status ${report.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(report.status)}</span></div><h2 className="mt-3 text-xl font-bold">{report.title}</h2><p className="muted mt-2">{report.category} · {report.location_text}</p><p className="muted mt-2 text-sm">{report.occurred_at.slice(0, 10)}</p></Link></li>)}</ul>}
  </>;
}
