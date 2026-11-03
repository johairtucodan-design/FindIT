import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { statusLabel, type Report } from "@/lib/reports";
export default async function Listings({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const filters=await searchParams; const client=await createClient();
  let query=client.from("public_items").select("*").order("occurred_at",{ascending:false}).limit(100);
  for(const key of ["category","status","kind"]) if(filters[key]) query=query.eq(key,filters[key]);
  for(const [key,column] of [["q","title"],["area","location_text"]]) if(filters[key]) query=query.ilike(column,`%${filters[key].replace(/[%_]/g,"")}%`);
  const {data,error}=await query;
  return <><p className="eyebrow">Community discovery</p><h1 className="page-title">Lost and found listings</h1><p className="muted mt-3">Only staff-approved public details appear here. Reported found items may not be in police custody.</p>
  <form className="panel form-grid my-6"><label>Keyword<input name="q" defaultValue={filters.q}/></label><label>Category<input name="category" defaultValue={filters.category}/></label><label>Approximate area<input name="area" defaultValue={filters.area}/></label><label>Type<select name="kind" defaultValue={filters.kind??""}><option value="">All</option><option>lost</option><option>found</option></select></label><label>Status<select name="status" defaultValue={filters.status??""}><option value="">All</option>{["open","pending_surrender","received_by_police","in_custody","closed"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><button className="button">Search</button><Link href="/items" className="text-link">Clear filters</Link></form>
  {error?<p className="error">Listings unavailable. Check that the revised migration has been applied.</p>:!data?.length?<p className="panel">No published reports match these filters.</p>:<ul className="grid gap-4">{(data as Report[]).map(r=><li className="panel" key={r.id}><span className="status">{statusLabel(r.status)}</span><h2 className="mt-3 font-bold text-xl"><Link href={`/items/${r.id}`}>{r.title}</Link></h2><p>{r.category} · {r.location_text} · {r.occurred_at.slice(0,10)}</p></li>)}</ul>}</>;
}
