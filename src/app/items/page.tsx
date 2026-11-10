import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { statusLabel, type Report } from "@/lib/reports";
import { Icon } from "../glyph";
import DemoPhoto from "./demo-photo";
const statuses=["open","pending_surrender","received_by_police","in_custody","approved_for_pickup","released","closed"];
export default async function Listings({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params=await searchParams;
  const value=(key:string)=>typeof params[key]==="string"?params[key].trim().slice(0,120):"";
  const filters={q:value("q"),category:value("category"),area:value("area"),status:value("status"),kind:value("kind")};
  const client=await createClient();
  let query=client.from("public_items").select("*").order("occurred_at",{ascending:false}).limit(100);
  if(statuses.includes(filters.status)) query=query.eq("status",filters.status);
  if(["lost","found"].includes(filters.kind)) query=query.eq("kind",filters.kind);
  for(const [term,column] of [[filters.q,"title"],[filters.area,"location_text"],[filters.category,"category"]]) {
    const search=term.replace(/[%_\\]/g,"");
    if(search) query=query.ilike(column,`%${search}%`);
  }
  const {data,error}=await query;
  return <><p className="eyebrow">Community discovery</p><h1 className="page-title">Browse lost and found items</h1><p className="muted mt-3">Search public listings approved by station staff.</p>
  <form className="panel form-grid filter-grid my-6">
    <label>Keyword<input name="q" defaultValue={filters.q} placeholder="e.g. silver keys"/></label><label>Category<input name="category" defaultValue={filters.category}/></label>
    <label>Approximate area<input name="area" defaultValue={filters.area}/></label>
    <label>Type<select name="kind" defaultValue={filters.kind}><option value="">All types</option><option value="lost">Lost</option><option value="found">Found</option></select></label>
    <label>Status<select name="status" defaultValue={filters.status}><option value="">All statuses</option>{statuses.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
    <div className="flex flex-wrap items-center gap-3"><button className="button"><Icon name="search" size={16}/> Search</button><Link href="/items" className="text-link">Clear</Link></div>
  </form>
  {error?<p className="error" role="alert">Listings couldn’t be loaded. <Link className="text-link" href="/items">Try again</Link>.</p>:!data?.length?<section className="panel"><h2 className="font-bold text-xl">No matching listings</h2><p className="muted mt-2">Try a broader area or clear your filters.</p></section>:
  <ul className="listing-grid">{(data as Report[]).map(r=><li key={r.id}><Link className="panel report-card quick-card h-full" href={`/items/${r.id}`}>
    <DemoPhoto id={r.id}/>
    <div className="flex flex-wrap gap-2 items-center justify-between"><span className="quick-icon"><Icon name={r.kind==="lost"?"search":"box"}/></span><span className={`status ${r.status==="pending_surrender"?"pending":""}`}>{statusLabel(r.status)}</span></div>
    <h2 className="font-bold text-xl">{r.title}</h2><p>{r.category} · {r.location_text} · {r.occurred_at.slice(0,10)}</p><span className="quick-action">View item <Icon name="arrow" size={17}/></span>
  </Link></li>)}</ul>}</>;
}
