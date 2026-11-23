import Link from "@/app/app-link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { editable, isUuid, statusLabel, type Report } from "@/lib/reports";
import { eligibleFoundStatuses, matchWindowMs, rankItemMatches, type MatchFields } from "@/lib/item-matches";
import WorkflowForm from "@/app/workflow-form";
import { operate } from "@/app/operations";
import DemoPhoto from "../demo-photo";
import ReportKind from "@/app/report-kind";
import MatchScore from "./match-score";
import MatchBreakdown from "./match-breakdown";
import PrivateReportPhoto from "@/app/private-report-photo";
import { signReportPhoto } from "@/lib/report-photos";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { client, user } = await getViewer();
  const [{ data: published }, { data: details, error: detailError }] = await Promise.all([
    client.from("public_items").select("*").eq("id", id).maybeSingle(),
    user ? client.rpc("item_detail", { target_id: id }) : { data: null, error: null },
  ]);
  if (detailError) throw new Error("Report could not be loaded");
  const full: Report | undefined = details?.[0], report = full ?? published as Report | undefined;
  if (!report) notFound();

  const [photoUrl, { data: history }, { data: events }] = await Promise.all([
    full?.photo_path ? signReportPhoto(client.storage.from("item-photos"), full.photo_path) : Promise.resolve(null),
    full ? client.from("report_history").select("id,created_at,actor_id,event_type").eq("item_id", id).order("created_at", { ascending: false }) : { data: null },
    full ? client.from("custody_events").select("id,station_id,actor_id,from_status,to_status,created_at").eq("item_id", id).order("created_at", { ascending: false }) : { data: null },
  ]);
  const matchReport = published?.kind === "lost" ? published : full?.kind === "lost" ? full : undefined;
  const eligibleLost = matchReport?.kind === "lost" && matchReport.status === "open", reportTime = Date.parse(matchReport?.occurred_at ?? "");
  const matches = eligibleLost ? await client.from("public_items").select("id,kind,status,title,description,category,color,location_text,occurred_at")
    .eq("kind", "found").eq("is_demo", Boolean(matchReport?.is_demo)).in("status", [...eligibleFoundStatuses])
    .gte("occurred_at", new Date(reportTime - matchWindowMs).toISOString()).lte("occurred_at", new Date(reportTime + matchWindowMs).toISOString())
    .order("occurred_at", { ascending: false }).order("id").limit(100) : null;
  const suggested = eligibleLost ? rankItemMatches(matchReport as MatchFields, matches?.data ?? []) : [];
  const claimable = !report.is_demo && published?.kind === "found" && !( ["approved_for_pickup", "released", "closed"].includes(report.status));
  const isOwner = Boolean(full && user && full.reporter_id === user.id);

  return <article className="item-detail-page">
    <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/items" className="text-link">All reports</Link><span aria-hidden="true">/</span><span>{report.kind} item</span></nav>
    <header className="detail-heading">
      <div className="detail-heading-copy"><div className="detail-badges">{report.is_demo && <span className="demo-badge">Demo example</span>}<ReportKind kind={report.kind}/><span className={`status ${report.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(report.status)}</span></div><h1 className="page-title">{report.title}</h1><p className="detail-reference">Report reference <span>{id}</span></p></div>
      {isOwner && editable(full!.status) && full!.publication_status !== "withdrawn" && <Link className="button secondary" href={`/report/${report.kind}?edit=${id}`}>Edit report</Link>}
    </header>

    {report.kind === "found" && report.status === "pending_surrender" && <aside className="detail-custody-note"><span aria-hidden="true">!</span><p><strong>Reported — Not Received</strong></p></aside>}
    {full && <p className="detail-publication-note">Publication: {full.publication_status}. New reports and edits need staff approval.</p>}

    <div className="item-detail-grid">
      <div className="item-detail-main">
        <div className="detail-photo">{full?.photo_path ? <PrivateReportPhoto itemId={id} title={report.title} initialUrl={photoUrl}/> : report.is_demo ? <DemoPhoto id={id} isDemo credit emptyState/> : <div className="detail-photo-empty"><span aria-hidden="true">⌕</span><strong>No photo added</strong><p>A clear image can make an item easier to recognize.</p></div>}</div>
        <section className="detail-description"><p className="eyebrow">Report details</p><h2>About this item</h2><p>{report.description}</p></section>
      </div>
      <aside className="item-summary" aria-label="Report summary"><div className="summary-heading"><span className="eyebrow">At a glance</span><span className={`kind-badge ${report.kind}`}>{report.kind === "lost" ? "LOST ITEM" : "FOUND ITEM"}</span></div><dl className="detail-grid"><div><dt>Category</dt><dd>{report.category}</dd></div><div><dt>Color</dt><dd>{report.color}</dd></div><div><dt>Date {report.kind === "lost" ? "lost" : "found"}</dt><dd>{report.occurred_at.slice(0, 10)}</dd></div><div><dt>Approximate area</dt><dd>{report.location_text}</dd></div></dl><p className="summary-footnote">Area details are approximate. FindIT does not publish exact coordinates.</p></aside>
    </div>

    {isOwner && full!.publication_status !== "withdrawn" && <div className="detail-owner-actions"><span>Manage your report</span><WorkflowForm action={operate.bind(null, "withdraw_report", id)} label="Withdraw report"><p>Withdrawal hides this report from public listings while retaining its record history.</p></WorkflowForm></div>}

    {full && <section className="private-record panel"><div className="section-title"><p className="eyebrow">Authorized view</p><h2>Private report record</h2><p>Visible only to you and authorized station staff.</p></div><dl className="detail-grid"><div><dt>Private identifying details</dt><dd>{full.private_details || "No private proof clues"}</dd></div><div><dt>Account contact</dt><dd>{full.contact_method || "Not provided"}</dd></div><div><dt>Intended station</dt><dd>{full.intended_station_id || "Not selected"}</dd></div><div><dt>Custody station</dt><dd>{full.held_at_station_id || "Not received"}</dd></div><div><dt>Storage location</dt><dd>{full.storage_location || "Not recorded"}</dd></div></dl>
      {history?.length ? <><h3>Report activity</h3><ol className="timeline">{history.map(entry => <li key={entry.id} className="text-sm"><strong>{entry.event_type || "Report updated"}</strong><br/>{new Date(entry.created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} · Actor {entry.actor_id || "System"}</li>)}</ol></> : null}
    </section>}

    {claimable && user && full?.reporter_id !== user.id && <section className="detail-workflow"><div className="section-title"><p className="eyebrow">Private workflow</p><h2>Submit an ownership claim</h2><p>Describe a detail that identifies your property. Keep passwords and full identity documents private.</p></div><WorkflowForm action={operate.bind(null, "submit_claim", id)} label="Submit claim"><label>Ownership evidence<textarea name="evidence" required minLength={10} maxLength={3000} rows={4}/></label><label>Evidence image (optional)<input name="attachment" type="file" accept="image/jpeg,image/png,image/webp"/><span className="muted font-normal">JPEG, PNG or WebP, up to 4 MiB.</span></label></WorkflowForm><Link className="text-link" href="/claims">Track my claims</Link></section>}
    {events?.length ? <section className="detail-workflow"><div className="section-title"><p className="eyebrow">Authorized activity</p><h2>Custody history</h2></div><ol className="timeline">{events.map(event => <li key={event.id} className="text-sm"><strong>{statusLabel(event.from_status)} → {statusLabel(event.to_status)}</strong><br/>{new Date(event.created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })} · Event {event.id} · Actor {event.actor_id} · Station {event.station_id}</li>)}</ol></section> : null}
    {!user && claimable && <Link className="button mt-5" href="/auth">Sign in to submit a private claim</Link>}

    {report.kind === "lost" && <section className="matches-section detail-matches"><div className="matches-heading"><span className="matches-icon" aria-hidden="true">⌕</span><div><p className="eyebrow">Deterministic suggestions</p><h2>Possible matches</h2><p>Similarity scores are suggestions, not probabilities, proof of ownership, or police custody.</p></div></div>
      {!eligibleLost ? <p className="muted mt-4">Suggestions are available while this report is open.</p> : <><p className="muted mt-3">We compare {report.is_demo ? "other synthetic demo examples" : "public found reports"} by category (25%), details (30%), color (15%), date (15%), and approximate area (15%). Missing signals are reweighted. {full?.publication_status !== "approved" && isOwner ? "These suggestions are private to you and authorized station staff while your report awaits approval." : ""}</p>
        {matches?.error ? <p className="muted mt-3">Suggestions couldn’t be loaded. <Link className="text-link" href="/items?kind=found">Browse found items</Link>.</p> : suggested.length ? <ol className="match-list mt-5">{suggested.map(({ candidate: item, score, reasons, breakdown, notEnoughDetails }) => <li key={item.id} className="match-card">
          <div className="match-card-top"><div><p className="match-overline">FOUND REPORT</p><Link className="match-title" href={`/items/${item.id}`}>{item.title}</Link><p className="muted mt-2 text-sm">{item.occurred_at?.slice(0, 10)} · {statusLabel(item.status)}</p></div><MatchScore score={notEnoughDetails ? null : score}/></div>
          <div className="match-reasons">{reasons.map(reason => <span key={reason}>{reason}</span>)}</div>
          <MatchBreakdown signals={breakdown} category={item.category || "Not listed"} color={item.color || "Not listed"} date={item.occurred_at?.slice(0, 10) || "Not listed"} description={item.description || "No public description provided."}/>
        </li>)}</ol> : <p className="match-empty mt-4">No public found reports are ready to compare yet. Check again as listings are approved.</p>}</>}
    </section>}
  </article>;
}
