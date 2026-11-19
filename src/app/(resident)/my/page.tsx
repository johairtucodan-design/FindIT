import Link from "@/app/app-link";
import ReportKind from "@/app/report-kind";
import { requireUser } from "@/lib/auth";
import { statusLabel, type Report } from "@/lib/reports";
import PrivateReportPhoto from "@/app/private-report-photo";
import { signReportPhoto } from "@/lib/report-photos";

export default async function MyReports() {
  const { client } = await requireUser();
  const { data, error } = await client.rpc("my_reports");
  if (error) throw new Error("Unable to load your reports. Please try again.");
  const reports = (data ?? []) as Report[];
  const photos = await Promise.all(reports.map(report => report.photo_path
    ? signReportPhoto(client.storage.from("item-photos"), report.photo_path)
    : Promise.resolve(null)));
  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Your activity</p><h1 className="page-title">My reports</h1><p className="muted mt-3">Your lost and found reports, with their current status.</p></div><div className="flex flex-wrap gap-3"><Link className="button" href="/report/lost">Report lost</Link><Link className="button secondary" href="/report/found">Report found</Link></div></div>
    {reports.length === 0 ? <section className="panel"><h2 className="text-xl font-bold">No reports yet</h2><p className="muted mt-3">Lost something, or found an item? Start a report above.</p></section> : <ul className="my-report-list">{reports.map((report, index) => <li key={report.id}><Link className="panel my-report-card" href={`/items/${report.id}`}>
      <div className="my-report-top"><ReportKind kind={report.kind}/><span className={`status ${report.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(report.status)}</span></div>
      <div className="my-report-content"><div className="my-report-thumb">{report.photo_path ? <PrivateReportPhoto itemId={report.id} title={report.title} initialUrl={photos[index]} compact/> : <span aria-hidden="true">⌕</span>}</div><div className="my-report-info"><h2 className="my-report-title">{report.title}</h2><p className="my-report-meta">{report.category} · {report.location_text}</p></div></div>
      <div className="my-report-footer"><span>{report.occurred_at.slice(0, 10)}</span><span>Listing: {report.publication_status}</span><span className="my-report-open">Open report <span aria-hidden="true">→</span></span></div>
    </Link></li>)}</ul>}
  </>;
}
