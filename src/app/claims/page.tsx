import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { statusLabel } from "@/lib/reports";

export default async function Claims() {
  const {client,user}=await requireUser();
  const {data,error}=await client.from("claims")
    .select("id,item_id,status,submitted_at,reviewed_at,released_at")
    .eq("claimant_id",user.id).order("submitted_at",{ascending:false,nullsFirst:false});
  return <>
    <p className="eyebrow">Your activity</p><h1 className="page-title">My claims</h1>
    <p className="muted mt-3">See each ownership claim and its next step.</p>
    {error?<p className="error mt-6" role="alert">Claims couldn’t be loaded. <Link className="text-link" href="/claims">Try again</Link>.</p>:
      !data?.length?<section className="panel mt-6"><h2 className="font-bold text-xl">No claims yet</h2><p className="muted my-3">Open a found item listing to submit private proof of ownership.</p><Link className="button" href="/items?kind=found">Browse found items</Link></section>:
        <ul className="listing-grid mt-6">{data.map(claim=><li className="panel" key={claim.id}>
          <span className={`status ${claim.status==="submitted"?"pending":""}`}>{claim.released_at?"Returned":statusLabel(claim.status)}</span>
          <h2 className="mt-3 font-bold">Claim reference</h2><p className="muted text-sm break-all">{claim.id}</p>
          <p className="my-4">{claim.released_at?"The item has been handed over.":claim.status==="approved"?"Contact the demo station to arrange collection.":claim.status==="rejected"?"The review is closed. Contact the station if you have new information.":"Wait for station staff to review your proof."}</p>
          <ol className="timeline text-sm">
            <li><strong>Submitted</strong><br/><span className="muted">{claim.submitted_at?new Date(claim.submitted_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"}):"Date unavailable for this older claim"}</span></li>
            {claim.reviewed_at&&<li><strong>{statusLabel(claim.status)}</strong><br/><span className="muted">{new Date(claim.reviewed_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</span></li>}
            {claim.released_at&&<li><strong>Returned</strong><br/><span className="muted">{new Date(claim.released_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</span></li>}
          </ol>
        </li>)}</ul>}
  </>;
}
