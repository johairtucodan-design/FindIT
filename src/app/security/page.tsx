import Link from "@/app/app-link";
import {requireRole} from "@/lib/auth";
import {publicListingDraft,statusLabel,type Report} from "@/lib/reports";
import {isOperationalReport} from "@/lib/operations-queue";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
import ReportKind from "@/app/report-kind";
import GuestReportList, { type GuestReportRow } from "./guest-report-list";

export default async function Security({searchParams}:{searchParams:Promise<{q?:string;status?:string;tab?:string}>}) {
 const {client,profile}=await requireRole(["officer","admin"]);const filters=await searchParams;
 if(filters.tab==="guest"){
   const {data:guestRows,error:guestError}=await client.from("guest_reports").select("id,kind,title,category,color,description,location_text,occurred_at,contact_method,private_details,preferred_station_id,latitude,longitude,created_at").eq("status","pending_review").order("created_at",{ascending:true}).limit(100);
   if(guestError)throw new Error("Unable to load guest reports");
   const {data:names}=await client.from("stations").select("id,name");
   const stationNames=Object.fromEntries((names??[]).map((row:{id:string;name:string})=>[row.id,row.name]));
   return <>
     <div className="workspace-heading"><p className="eyebrow">Assigned-station workspace</p><h1 className="page-title">Guest reports</h1><p className="muted">Found reports submitted without an account. Review each one before you decide. Nothing here is published automatically.</p></div>
     <form className="panel form-grid filter-grid my-5" action="/security"><input type="hidden" name="tab" value="guest"/><label>Workspace<select name="tab" defaultValue="guest"><option value="receiving">Receiving queue</option><option value="review">Publication review</option><option value="inventory">Active custody inventory</option><option value="guest">Guest reports</option></select></label><button className="button secondary">Open</button></form>
     <GuestReportList reports={(guestRows??[]) as GuestReportRow[]} stationNames={stationNames}/>
   </>;
 }
 const {data,error}=await client.rpc("staff_reports");if(error)throw new Error("Unable to load station records");
 const reports=(data??[]) as (Report&{archived_at?:string|null})[];
 const q=typeof filters.q==="string"?filters.q.toLowerCase():"";
 const view=filters.tab==="inventory"?"inventory":filters.tab==="review"?"review":"receiving";
 const inventory=view==="inventory";
 const list=reports.filter(r=>isOperationalReport(r,view)&&(!q||`${r.id} ${r.title}`.toLowerCase().includes(q))&&(!filters.status||r.status===filters.status));
 const {data:assignedStation}=profile.role==="officer"&&profile.station_id?await client.from("stations").select("is_demo,is_approved").eq("id",profile.station_id).maybeSingle():{data:null};
 const metrics=[
   ["Awaiting receipt",reports.filter(r=>r.kind==="found"&&r.status==="pending_surrender"&&!r.held_at_station_id).length],
   ["In custody",reports.filter(r=>Boolean(r.held_at_station_id)&&["received_by_police","in_custody","approved_for_pickup"].includes(r.status)).length],
   ["Ready for pickup",reports.filter(r=>Boolean(r.held_at_station_id)&&r.status==="approved_for_pickup").length],
 ] as const;
 return <>
   <div className="workspace-heading"><p className="eyebrow">Assigned-station workspace</p><h1 className="page-title">{view==="inventory"?"Custody inventory":view==="review"?"Publication review":"Receiving queue"}</h1><p className="muted">{view==="inventory"?"Items appear here automatically after staff record physical receipt. Released items leave active inventory.":view==="review"?"Review publication separately. Approving a listing never records physical receipt.":"Found reports stay here as Reported — Not Received until staff confirm possession."}</p></div>
   <section className="custody-flow" aria-label="Receiving and custody steps"><div className={view==="receiving"?"is-current":""}><span>01</span><div><strong>Receive the found item</strong><p>Confirm physical possession at the assigned station.</p></div></div><span className="custody-flow-arrow" aria-hidden="true">→</span><div className={view==="inventory"?"is-current":""}><span>02</span><div><strong>Custody inventory</strong><p>Receipt moves the item here automatically; no second add step.</p></div></div></section>
   <dl className="workspace-metrics">{metrics.map(([label,count])=><div className="workspace-metric" key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
   {!profile.station_id&&profile.role==="officer"&&<p className="notice">Ask a FindIT administrator to assign your account to an approved public-reference station.</p>}
   {assignedStation?.is_demo&&<p className="notice">This is a legacy demo-station assignment. Synthetic records are excluded from operations. Ask an admin to assign this account to an approved public reference before publishing map pins.</p>}
   {(profile.role==="officer"||profile.role==="admin")&&<section className="panel flex flex-wrap items-center justify-between gap-4 my-5" aria-label="Manage station map pins"><div><p className="eyebrow">YOUR STATION MAP</p><h2 className="text-lg font-bold">Add a map pin</h2><p className="muted mt-1 text-sm">{profile.role==="admin"?"Choose an approved public-reference station, then place its pin.":"Add a public-reference location under your assigned station."} Pins publish directly without admin review.</p></div><Link className="button" href="/security/locations">Open map pin setup</Link></section>}
   <form className="panel form-grid filter-grid my-5"><label>Reference or title<input name="q" defaultValue={q}/></label><label>Workspace<select name="tab" defaultValue={view}><option value="receiving">Receiving queue</option><option value="review">Publication review</option><option value="inventory">Active custody inventory</option><option value="guest">Guest reports</option></select></label><label>Status<select name="status" defaultValue={filters.status??""}><option value="">All</option>{["open","pending_surrender","received_by_police","in_custody","approved_for_pickup","released"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><div className="flex flex-wrap gap-3 items-center"><button className="button">Filter</button><Link href="/security" className="text-link">Clear</Link></div></form>
   {!list.length&&<p className="panel">No operational reports match this view.</p>}
   {list.map(r=><section className="panel workspace-record my-5" key={r.id}>
     <div className="flex flex-wrap items-center gap-2 mb-3"><ReportKind kind={r.kind}/><span className={`status ${r.status==="pending_surrender"?"pending":""}`}>{statusLabel(r.status)}</span><span className="location-status">{view==="inventory"?"Active custody":view==="review"?"Awaiting publication decision":"Awaiting physical receipt"}</span></div>
     <h2><Link className="text-link text-xl" href={`/security/reports/${r.id}`}>{r.title}</Link></h2><p className="break-all text-sm muted">Reference: {r.id}</p><p className="mt-2">Publication: {r.publication_status} · Storage: {r.storage_location||"Not recorded"}</p>
     {view==="review"&&(r.publication_status==="pending"||r.publication_status==="rejected")&&<details className="mt-4" open><summary className="text-link">Review public listing</summary><div className="publication-preview"><p className="eyebrow">Automatic public listing preview</p><dl><div><dt>Title</dt><dd>{publicListingDraft(r).safe_title||"No safe title"}</dd></div><div><dt>Description</dt><dd>{publicListingDraft(r).safe_description||"No safe description"}</dd></div><div><dt>Approximate area</dt><dd>{publicListingDraft(r).safe_area||"No area provided"}</dd></div></dl></div><WorkflowForm action={operate.bind(null,"moderate_report",r.id)} label="" actions={[{name:"decision",value:"approved",label:"Approve publication",className:"button"},{name:"decision",value:"rejected",label:"Deny publication",className:"button secondary"}]}></WorkflowForm></details>}
     {view==="receiving"&&r.kind==="found"&&r.status==="pending_surrender"&&!r.held_at_station_id&&r.publication_status!=="withdrawn"&&r.intended_station_id&&<details className="mt-4"><summary className="text-link">Step 1 · Confirm physical receipt</summary><WorkflowForm action={operate.bind(null,"receive_item",r.id)} label="Confirm receipt & move to custody"><input type="hidden" name="station" value={r.intended_station_id}/><label>Storage location<input name="storage" required maxLength={200}/></label><label><span><input type="checkbox" name="confirmed" required/> I personally confirm physical possession at the assigned station.</span></label><p className="muted text-sm">This records the custody event and moves the report to Custody inventory automatically. You do not need to add it again.</p></WorkflowForm></details>}
     {r.kind==="found"&&(r.status==="received_by_police"||r.status==="in_custody")&&<details className="mt-4"><summary className="text-link">Update storage and custody</summary><WorkflowForm action={operate.bind(null,"store_item",r.id)} label="Record in custody"><label>Storage location<input name="storage" defaultValue={r.storage_location??""} required maxLength={200}/></label></WorkflowForm></details>}
     {r.kind==="found"&&<Link className="button secondary mt-4" href={`/security/claims/${r.id}`}>{r.status==="approved_for_pickup"?"Review claim and handover":"Review ownership claims"}</Link>}
   </section>)}
 </>;
}
