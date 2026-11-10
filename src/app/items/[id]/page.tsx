import Link from "next/link";
import {notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {editable,isUuid,statusLabel,type Report} from "@/lib/reports";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
export default async function ItemPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;if(!isUuid(id))notFound();const client=await createClient();const {data:{user}}=await client.auth.getUser();
 let full:Report|undefined;
 if(user){const {data,error}=await client.rpc("item_detail",{target_id:id});if(error)throw new Error("Report could not be loaded");full=data?.[0];}
 const {data:published}=await client.from("public_items").select("*").eq("id",id).maybeSingle();const report=full??published as Report|undefined;if(!report)notFound();
 let photoUrl:string|undefined;if(full?.photo_path){const {data}=await client.storage.from("item-photos").createSignedUrl(full.photo_path,300);photoUrl=data?.signedUrl;}
 const {data:history}=full?await client.from("report_history").select("id,created_at,actor_id,event_type").eq("item_id",id).order("created_at",{ascending:false}):{data:null};
 const {data:events}=full?await client.from("custody_events").select("id,station_id,actor_id,from_status,to_status,created_at").eq("item_id",id).order("created_at",{ascending:false}):{data:null};
 const reportTime=Date.parse(report.occurred_at);
 const month=30*86400000;
 const matches=report.kind==="lost"?await client.from("public_items").select("id,title,location_text,occurred_at")
   .eq("kind","found").ilike("category",report.category.replace(/([%_\\])/g,"\\$1")).neq("status","released").neq("status","closed")
   .gte("occurred_at",new Date(reportTime-month).toISOString()).lte("occurred_at",new Date(reportTime+month).toISOString())
   .order("occurred_at",{ascending:false}).limit(100):null;
 const term=report.location_text.toLowerCase().trim();
 const distanceFromReport=(date:string)=>Math.abs(Date.parse(date)-reportTime);
 const areaMatch=(area:string)=>{const normalized=area.toLowerCase().trim();return Boolean(term&&normalized&&(term.includes(normalized)||normalized.includes(term)));};
 const suggested=(matches?.data??[]).sort((a,b)=>Number(areaMatch(b.location_text))-Number(areaMatch(a.location_text))||distanceFromReport(a.occurred_at)-distanceFromReport(b.occurred_at)).slice(0,5);
 const claimable=published?.kind==="found"&&!(["approved_for_pickup","released","closed"].includes(report.status));
 return <article className="panel mx-auto max-w-3xl"><Link href="/items" className="text-link">Back to listings</Link><p className="eyebrow mt-5">{report.kind} item</p><h1 className="page-title">{report.title}</h1><span className="status my-4">{statusLabel(report.status)}</span><p className="text-sm break-all">Report reference: {id}</p>
 {report.kind==="found"&&report.status==="pending_surrender"&&<p className="notice mt-4">Reported — Not Received. Reporting does not mean police hold this item.</p>}
 {full&&<p className="muted mt-3">Publication: {full.publication_status}. New reports and edits need staff approval.</p>}
 {photoUrl&&<img src={photoUrl} alt={`Photo of ${report.title}`} className="w-full max-h-96 object-contain my-5"/>}
 <dl className="detail-grid my-6">{[["Category",report.category],["Color",report.color],["Date",report.occurred_at.slice(0,10)],["Area",report.location_text]].map(([k,v])=><div key={k}><dt className="muted">{k}</dt><dd>{v}</dd></div>)}</dl><p className="whitespace-pre-wrap break-words">{report.description}</p>
 {full&&<section className="panel my-6"><h2 className="font-bold">Private record</h2><p className="whitespace-pre-wrap break-words">{full.private_details||"No private proof clues"}</p><p className="break-words">Contact: {full.contact_method||"Not provided"}</p><p className="break-words">Intended drop-off: {full.intended_station_id||"Not selected"}</p><p className="break-words">Custody station: {full.held_at_station_id||"Not received"}</p><p className="break-words">Storage: {full.storage_location||"Not recorded"}</p>
 {history&&history.length>0&&<><h3 className="font-bold mt-4 mb-3">Report history</h3><ol className="timeline">{history.map(h=><li key={h.id} className="text-sm"><strong>{h.event_type||"Report updated"}</strong><br/>{new Date(h.created_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})} · Actor {h.actor_id||"System"}</li>)}</ol></>}
 </section>}
 {full&&full.reporter_id===user?.id&&<>{editable(full.status)&&full.publication_status!=="withdrawn"&&<Link className="button" href={`/report/${report.kind}?edit=${id}`}>Edit report</Link>}{full.publication_status!=="withdrawn"&&<WorkflowForm action={operate.bind(null,"withdraw_report",id)} label="Withdraw from public listings"><p>Withdrawal hides this report, retaining custody and edit history.</p></WorkflowForm>}</>}
 {claimable&&user&&full?.reporter_id!==user.id&&<section className="mt-7"><h2 className="font-bold text-xl">Submit a private ownership claim</h2><WorkflowForm action={operate.bind(null,"submit_claim",id)} label="Submit claim"><label>Ownership evidence<textarea name="evidence" required minLength={10} maxLength={3000} rows={4}/></label><label>Evidence image (optional)<input name="attachment" type="file" accept="image/jpeg,image/png,image/webp"/><span className="muted font-normal">JPEG, PNG or WebP, up to 4 MiB.</span></label><p className="muted">Describe a detail that identifies your property. Keep passwords and full identity documents private.</p></WorkflowForm><Link className="text-link" href="/claims">Track my claims</Link></section>}
 {events&&events.length>0&&<section className="mt-6"><h2 className="font-bold mb-3">Custody history</h2><ol className="timeline">{events.map(e=><li key={e.id} className="text-sm"><strong>{statusLabel(e.from_status)} → {statusLabel(e.to_status)}</strong><br/>{new Date(e.created_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})} · Event {e.id} · Actor {e.actor_id} · Station {e.station_id}</li>)}</ol></section>}
 {!user&&claimable&&<Link className="button mt-5" href="/auth">Sign in to submit a private claim</Link>}
 {matches&&<section className="mt-7"><h2 className="font-bold text-xl">Possible matches</h2><p className="muted mt-2">Same category and within 30 days. Similar areas appear first. Station staff verify ownership.</p>
 {matches.error?<p className="muted mt-3">Suggestions couldn’t be loaded. <Link className="text-link" href="/items?kind=found">Browse found items</Link>.</p>:suggested.length?<ul className="timeline mt-4">{suggested.map(item=><li key={item.id}><Link className="text-link" href={`/items/${item.id}`}>{item.title}</Link><p className="muted text-sm">{item.location_text} · {item.occurred_at.slice(0,10)}</p></li>)}</ul>:<p className="muted mt-3">No possible matches yet. Check back as new listings are approved.</p>}</section>}
 </article>;
}
