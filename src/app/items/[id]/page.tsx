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
 const {data:history}=full?await client.from("report_history").select("id,created_at,actor_id").eq("item_id",id).order("created_at",{ascending:false}):{data:null};
 const {data:events}=full?await client.from("custody_events").select("id,station_id,actor_id,from_status,to_status,created_at").eq("item_id",id).order("created_at",{ascending:false}):{data:null};
 return <article className="panel mx-auto max-w-2xl"><Link href="/items" className="text-link">Back to listings</Link><p className="eyebrow mt-5">{report.kind} item</p><h1 className="page-title">{report.title}</h1><span className="status my-4">{statusLabel(report.status)}</span><p className="text-sm break-all">Report reference: {id}</p>
 {report.kind==="found"&&report.status==="pending_surrender"&&<p className="notice mt-4">Reported — Not Received. Reporting does not mean police hold this item.</p>}
 {full&&<p className="muted mt-3">Publication: {full.publication_status}. New reports and edits need staff approval.</p>}
 {photoUrl&&<img src={photoUrl} alt={`Photo of ${report.title}`} className="w-full max-h-96 object-contain my-5"/>}
 <dl className="detail-grid my-6">{[["Category",report.category],["Color",report.color],["Date",report.occurred_at.slice(0,10)],["Area",report.location_text]].map(([k,v])=><div key={k}><dt className="muted">{k}</dt><dd>{v}</dd></div>)}</dl><p className="whitespace-pre-wrap break-words">{report.description}</p>
 {full&&<section className="panel my-6"><h2 className="font-bold">Private record</h2><p className="whitespace-pre-wrap">{full.private_details||"No private proof clues"}</p><p>Contact: {full.contact_method||"Not provided"}</p><p>Intended drop-off: {full.intended_station_id||"Not selected"}</p><p>Custody station: {full.held_at_station_id||"Not received"}</p><p>Storage: {full.storage_location||"Not recorded"}</p><h3 className="font-bold mt-4">Edit history</h3>{history?.map(h=><p key={h.id} className="text-sm">{h.created_at} · Actor {h.actor_id}</p>)}</section>}
 {full&&full.reporter_id===user?.id&&<>{editable(full.status)&&full.publication_status!=="withdrawn"&&<Link className="button" href={`/report/${report.kind}?edit=${id}`}>Edit report</Link>}{full.publication_status!=="withdrawn"&&<WorkflowForm action={operate.bind(null,"withdraw_report",id)} label="Withdraw from public listings"><p>Withdrawal hides this report, retaining custody and edit history.</p></WorkflowForm>}</>}
 {published?.kind==="found"&&user&&full?.reporter_id!==user.id&&<section className="mt-7"><h2 className="font-bold text-xl">Submit a private ownership claim</h2><WorkflowForm action={operate.bind(null,"submit_claim",id)} label="Submit claim"><label>Ownership evidence<textarea name="evidence" required minLength={10} maxLength={3000} rows={4}/></label><p className="muted">Do not provide passwords or full identity documents. Submission does not approve ownership or authorize collection.</p></WorkflowForm></section>}
 {events&&events.length>0&&<section className="mt-6"><h2 className="font-bold">Custody history</h2>{events.map(e=><p key={e.id} className="text-sm break-all">{e.created_at}: {statusLabel(e.from_status)} to {statusLabel(e.to_status)} · Intake reference {e.id} · Actor {e.actor_id} · Station {e.station_id}</p>)}</section>}{!user&&published?.kind==="found"&&<Link className="button mt-5" href="/auth">Sign in to submit a private claim</Link>}</article>;
}
