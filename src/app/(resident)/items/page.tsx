import { Suspense } from "react";
import { getViewer } from "@/lib/supabase/server";
import { statusLabel, type Report } from "@/lib/reports";
import { signReportPhoto } from "@/lib/report-photos";
import Link from "@/app/app-link";
import { Icon } from "@/app/glyph";
import ReportKind from "@/app/report-kind";
import PrivateReportPhoto from "@/app/private-report-photo";
import ListingFilters, { type Filters } from "./listing-filters";
import DemoPhoto from "./demo-photo";

const statuses = ["open","pending_surrender","received_by_police","in_custody","approved_for_pickup","released","closed"];
const tabs = [["", "All items"], ["lost", "Lost items"], ["found", "Found items"]] as const;

function listingsUrl(filters: Partial<Filters>) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return query.size ? `/items?${query}` : "/items";
}

async function Results({ filters }: { filters: Filters }) {
  const { client, user } = await getViewer();
  let query = client.from("public_items").select("*").order("occurred_at", { ascending: false }).limit(100);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  for (const [term, column] of [[filters.q,"title"],[filters.area,"location_text"],[filters.category,"category"]]) {
    const search = term.replace(/[%_\\]/g, "");
    if (search) query = query.ilike(column, `%${search}%`);
  }
  const { data, error } = await query;
  if (error) return <p className="error" role="alert">Listings couldn’t be loaded. <Link className="text-link" href="/items">Try again</Link>.</p>;
  if (!data?.length) return <section className="panel"><h2 className="font-bold text-xl">No matching listings</h2><p className="muted mt-2">Try a broader area or clear your filters.</p></section>;
  const reports = data as Report[];
  const { data: ownReports } = user ? await client.rpc("my_reports") : { data: null };
  const ownPaths = new Map(((ownReports ?? []) as Report[]).filter(r => r.photo_path).map(r => [r.id, r.photo_path!]));
  const photoEntries = await Promise.all(reports.map(async r => {
    const path = ownPaths.get(r.id);
    return [r.id, path ? await signReportPhoto(client.storage.from("item-photos"), path) : null] as const;
  }));
  const photoUrls = new Map(photoEntries);
  return <ul className="listing-grid">{reports.map(r => <li key={r.id}><Link className="panel report-card quick-card h-full" href={`/items/${r.id}`}>
    <div className="flex flex-wrap gap-2 items-center justify-between">{r.is_demo && <span className="demo-badge">Demo example</span>}<ReportKind kind={r.kind}/><span className={`status ${r.status === "pending_surrender" ? "pending" : ""}`}>{statusLabel(r.status)}</span></div>
    {r.is_demo && <DemoPhoto id={r.id} isDemo/>}
    {!r.is_demo && ownPaths.has(r.id) && <PrivateReportPhoto itemId={r.id} title={r.title} initialUrl={photoUrls.get(r.id) ?? null} compact/>}
    <h2 className="font-bold text-xl">{r.title}</h2><p>{r.category} · {r.location_text} · {r.occurred_at.slice(0,10)}</p><span className="quick-action">{r.is_demo ? "View demo example" : "View item"} <Icon name="arrow" size={17}/></span>
  </Link></li>)}</ul>;
}

export default async function Listings({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key].trim().slice(0, 120) : "";
  const filters = { q: value("q"), category: value("category"), area: value("area"), status: value("status"), kind: value("kind") };
  if (!statuses.includes(filters.status)) filters.status = "";
  if (!tabs.some(([kind]) => kind === filters.kind)) filters.kind = "";
  return <>
    <p className="eyebrow">Community discovery</p><h1 className="page-title">Browse lost and found items</h1><p className="muted mt-3">Search public reports and explore possible matches.</p>
    <aside className="demo-disclaimer mt-5">Synthetic coursework examples appear alongside community listings and are labeled <strong>Demo example</strong>. Their photos are representative illustrations. Found examples marked <strong>Reported — Not Received</strong> do not mean police hold the item. Matching stays within the demo or real reports.</aside>
    <p className="listing-photo-note">Only approved listings appear here. Signed-in reporters see their own uploaded photos; other reporters’ photos stay private to them and authorized staff.</p>
    <nav className="listing-tabs mt-6" aria-label="Report type">{tabs.map(([kind, label]) => <Link key={kind} className="button secondary" href={listingsUrl({ ...filters, kind })} aria-current={kind === filters.kind ? "page" : undefined}>{label}</Link>)}</nav>
    <ListingFilters filters={filters} filterKey={listingsUrl(filters)} statuses={statuses} clearUrl={listingsUrl({ kind: filters.kind })}/>
    <Suspense key={listingsUrl(filters)} fallback={<p className="panel muted" role="status">Loading listings…</p>}>
      <Results filters={filters}/>
    </Suspense>
  </>;
}
