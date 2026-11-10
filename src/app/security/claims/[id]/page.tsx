import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isUuid,statusLabel,type Report } from "@/lib/reports";
import { operate } from "@/app/operations";
import WorkflowForm from "@/app/workflow-form";

export default async function ReviewClaims({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!isUuid(id)) notFound();
  const {client}=await requireRole(["officer","admin"]);
  const {data,error}=await client.rpc("staff_reports").eq("id",id).maybeSingle();
  if(error) throw new Error("Station workspace unavailable");
  const report=data as Report|null;
  if(!report) notFound();
  const {data:claims,error:claimError}=await client.from("claims").select("id,private_answer,status,reviewed_by,reviewed_at,evidence_path")
    .eq("item_id",id).order("submitted_at",{ascending:false});
  if(claimError) throw new Error("Claims unavailable");
  const entries=await Promise.all((claims??[]).map(async claim=>{
    const signed=claim.evidence_path?await client.storage.from("claim-evidence").createSignedUrl(claim.evidence_path,300):null;
    return {...claim,imageUrl:signed?.data?.signedUrl};
  }));
  const canApprove=["received_by_police","in_custody"].includes(report.status);
  return <>
    <Link className="text-link" href="/security">Back to station workspace</Link>
    <p className="eyebrow mt-5">Private claim review</p><h1 className="page-title">{report.title}</h1>
    <p className="muted mt-3">Item status · {statusLabel(report.status)}</p>
    {!entries.length&&<p className="panel mt-6">No claims have been submitted for this item.</p>}
    {entries.map(claim=><section className="panel my-5" key={claim.id}>
      <span className="status">{statusLabel(claim.status)}</span>
      <h2 className="mt-3 font-bold break-all">Claim {claim.id}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words">{claim.private_answer}</p>
      {claim.imageUrl?<a className="text-link mt-3 inline-block" href={claim.imageUrl} target="_blank" rel="noreferrer">Open private evidence image</a>:
        claim.evidence_path&&<p className="muted mt-3">Image unavailable. Reload to try again.</p>}
      {claim.reviewed_at&&<p className="muted mt-3 text-sm break-words">Reviewed {new Date(claim.reviewed_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})} · {claim.reviewed_by}</p>}
      {claim.status==="submitted"&&<WorkflowForm action={operate.bind(null,"review_claim",claim.id)} label="Record decision">
        <label>Decision<select name="decision" defaultValue="" required><option value="" disabled>Select a decision</option><option value="approved" disabled={!canApprove}>Approve for pickup</option><option value="rejected">Reject claim</option></select></label>
        <p className="muted text-sm">{canApprove?"Approving this claim authorizes pickup and closes competing claims.":"Confirm physical receipt in the station workspace before approving pickup."}</p>
      </WorkflowForm>}
    </section>)}
    {report.status==="approved_for_pickup"&&<section className="panel mt-6">
      <h2 className="font-bold text-xl">Record handover</h2>
      <WorkflowForm action={operate.bind(null,"release_item",id)} label="Confirm handover">
        <label><span><input type="checkbox" name="confirmed" required/> I verified the claimant and physically handed over the item.</span></label>
      </WorkflowForm>
    </section>}
  </>;
}
