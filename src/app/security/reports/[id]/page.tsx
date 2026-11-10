import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isUuid, statusLabel, type Report } from "@/lib/reports";
import Link from "@/app/app-link";
import ReportKind from "@/app/report-kind";

export default async function StationReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { client } = await requireRole(["officer", "admin"]);
  const { data, error } = await client.rpc("staff_reports").eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load the station report.");
  const report = data as Report | null;
  if (!report) notFound();
  const [photo, history, custody] = await Promise.all([
    report.photo_path ? client.storage.from("item-photos").createSignedUrl(report.photo_path, 300) : null,
    client.from("report_history").select("id,created_at,event_type").eq("item_id",id).order("created_at",{ascending:false}),
    client.from("custody_events").select("id,created_at,from_status,to_status").eq("item_id",id).order("created_at",{ascending:false}),
  ]);
  const timestamp = (date: string) => new Date(date).toLocaleString("en-SG", { timeZone: "Asia/Singapore" });
  return <>
    <Link className="text-link" href="/security">Back to receiving queue</Link>
    <div className="workspace-heading mt-5">
      <div className="flex flex-wrap items-center gap-2"><ReportKind kind={report.kind}/><span className="status">{statusLabel(report.status)}</span></div>
      <h1 className="page-title">{report.title}</h1><p className="muted break-all">Reference: {id}</p>
    </div>
    <section className="panel workspace-record">
      <h2 className="text-xl font-bold">Private station record</h2>
      <dl className="detail-grid my-5">{[
        ["Category", report.category], ["Color", report.color], ["Date", report.occurred_at.slice(0, 10)], ["Reported location", report.location_text],
        ["Contact", report.contact_method], ["Storage", report.storage_location], ["Publication", report.publication_status],
      ].map(([label, value]) => <div key={label}><dt className="muted">{label}</dt><dd>{value || "Not recorded"}</dd></div>)}</dl>
      <h3 className="font-bold">Description</h3><p className="whitespace-pre-wrap break-words">{report.description}</p>
      {report.private_details && <div className="mt-4"><h3 className="font-bold">Private identifying details</h3><p className="whitespace-pre-wrap break-words">{report.private_details}</p></div>}
      {photo?.data?.signedUrl && <a className="text-link mt-4 inline-block" href={photo.data.signedUrl} target="_blank" rel="noreferrer">Open private report photo</a>}
      {report.kind === "found" && <div className="mt-5"><Link href={`/security/claims/${id}`} className="button">Review ownership claims</Link></div>}
    </section>
    <section className="panel my-5"><h2 className="text-xl font-bold">Custody history</h2>
      {custody.error ? <p className="error mt-3">Custody history couldn’t be loaded.</p> : !custody.data?.length ? <p className="muted mt-3">No custody events recorded.</p> :
        <ol className="timeline mt-3">{custody.data.map(event => <li key={event.id}>{statusLabel(event.from_status)} → {statusLabel(event.to_status)} <p className="muted text-sm">{timestamp(event.created_at)}</p></li>)}</ol>}
    </section>
    <section className="panel my-5"><h2 className="text-xl font-bold">Report history</h2>
      {history.error ? <p className="error mt-3">Report history couldn’t be loaded.</p> : !history.data?.length ? <p className="muted mt-3">No changes recorded.</p> :
        <ol className="timeline mt-3">{history.data.map(event => <li key={event.id}>{event.event_type} <p className="muted text-sm">{timestamp(event.created_at)}</p></li>)}</ol>}
    </section>
  </>;
}
