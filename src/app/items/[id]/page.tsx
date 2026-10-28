import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { editable, isUuid, statusLabel, type Report } from "@/lib/reports";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { client, user } = await requireUser();
  const { data, error } = await client.rpc("item_detail", { target_id: id });
  if (error) throw new Error("Unable to load this report. Please try again.");
  const report = data?.[0] as Report | undefined;
  if (!report) notFound();
  let photoUrl: string | undefined;
  if (report.photo_path) {
    const { data } = await client.storage.from("item-photos").createSignedUrl(report.photo_path, 300);
    photoUrl = data?.signedUrl;
  }
  return <article className="panel mx-auto max-w-2xl">
    <Link className="text-link text-sm" href="/my">← My reports</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="eyebrow">{report.kind} item</p><span className={`status ${report.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(report.status)}</span></div>
    <h1 className="page-title mt-3">{report.title}</h1>
    {report.kind === "found" && report.status === "pending_surrender" && <aside className="notice mt-6">Hand this item to police. Reporting it does not mean police hold it.<p className="mt-2 text-sm">No police receipt or custody has been recorded.</p></aside>}
    {photoUrl ? <img className="mt-6 max-h-96 w-full rounded-xl bg-slate-100 object-contain" src={photoUrl} alt={`Photo of ${report.title}`} /> : report.photo_path ? <p className="error mt-6">Photo could not be loaded. Refresh to try again.</p> : null}
    <dl className="detail-grid mt-7">{[["Category", report.category], ["Color", report.color], ["Date", report.occurred_at.slice(0, 10)], ["Location", report.location_text]].map(([label, value]) => <div key={label}><dt className="muted text-sm">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
    <h2 className="mt-8 text-lg font-bold">Description</h2><p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{report.description}</p>
    <section className="mt-7 rounded-xl bg-slate-50 p-5"><h2 className="font-bold">Private details</h2><p className="muted mt-1 text-sm">Visible only to the reporter, officers and admins.</p><p className="mt-3 whitespace-pre-wrap break-words">{report.private_details || "No private details provided."}</p></section>
    {report.reporter_id === user.id && editable(report.status) && <Link className="button mt-7" href={`/report/${report.kind}?edit=${report.id}`}>Edit report</Link>}
  </article>;
}
