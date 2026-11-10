import Link from "@/app/app-link";
import {requireRole} from "@/lib/auth";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
import {saveStation} from "./actions";

const stationFields=[["name","Name"],["address","Address"],["phone","Contact phone"],["service_area","Barangay or city served"],["receiving_hours","Posted receiving hours"],["latitude","Latitude for map update"],["longitude","Longitude for map update"]];

export default async function Manager({searchParams}:{searchParams:Promise<{station?:string;start?:string;end?:string}>}) {
  const {client}=await requireRole(["admin"]);
  const filters=await searchParams;
  const [stations,rule,candidates]=await Promise.all([
    client.from("stations").select("*").order("name"),
    client.from("retention_rules").select("retention_days").single(),
    client.rpc("retention_candidates").limit(50),
  ]);
  if(stations.error) throw new Error("Unable to load station management");
  const sites=stations.data??[];
  const station=sites.find(site=>site.id===filters.station)?.id??sites[0]?.id;
  const singaporeDate=(value:Date)=>value.toLocaleDateString("en-CA",{timeZone:"Asia/Singapore"});
  const day=(value:unknown,fallback:string)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:fallback;
  const start=day(filters.start,singaporeDate(new Date(Date.now()-29*86400000)));
  const end=day(filters.end,singaporeDate(new Date()));
  const summary=station?await client.rpc("station_summary",{station,start_day:start,end_day:end}).maybeSingle():null;
  const counts=summary?.data as {received:number;pending_claims:number;released:number}|null;
  return <>
    <div className="workspace-heading"><p className="eyebrow">Oversight and configuration</p><h1 className="page-title">Operations overview</h1><p className="muted">Review activity and manage the fictional stations used for FindIT handover demos.</p></div>
    <section id="activity" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">Station activity</h2><p className="muted my-3">Receipt and handover events, plus claims still pending from the selected dates. Dates use Singapore time.</p>
      {station?<form className="form-grid filter-grid my-4">
        <label>Station<select name="station" defaultValue={station}>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>From<input name="start" type="date" defaultValue={start} required/></label>
        <label>Through<input name="end" type="date" defaultValue={end} min={start} required/></label>
        <button className="button">Apply dates</button>
      </form>:<p className="muted">Add a demo station to view activity.</p>}
      {summary?.error?<p className="error" role="alert">Activity unavailable. Check the date range is valid and no longer than one year.</p>:counts&&<dl className="workspace-metrics">{[["Received",counts.received],["Pending claims",counts.pending_claims],["Released",counts.released]].map(([label,value])=><div className="workspace-metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </section>
    <section id="retention" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">Retention review</h2><p className="muted my-3">This demo rule applies to records with a documented final custody event. Archiving removes the public listing and keeps the audit history.</p>
      {rule.error?<p className="error">The retention rule couldn’t be loaded.</p>:<WorkflowForm action={operate.bind(null,"set_retention","")} label="Save retention rule"><label>Days after custody ends<input name="days" type="number" min="1" max="3650" defaultValue={rule.data?.retention_days} required/></label></WorkflowForm>}
      {candidates.error?<p className="error">Archive candidates couldn’t be loaded.</p>:!candidates.data?.length?<p className="muted">No records qualify for review.</p>:<ul className="timeline">{candidates.data.map((row:{id:string;title:string;ended_at:string})=><li key={row.id}>
        <Link className="text-link" href={`/security/reports/${row.id}`}>{row.title}</Link><p className="muted text-sm">Custody ended {row.ended_at.slice(0,10)}</p>
        <WorkflowForm action={operate.bind(null,"archive_report",row.id)} label="Archive report"><label><span><input name="confirmed" type="checkbox" required/> Confirm archival</span></label></WorkflowForm>
      </li>)}</ul>}
    </section>
    <section id="demo" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">Demo cases</h2><p className="muted my-3">Add a matching fictional lost and found pair. Existing cases keep their current state.</p>
      <WorkflowForm action={operate.bind(null,"seed_demo_cases","")} label="Add fictional cases"><p className="text-sm muted">The found case starts as Reported — Not Received.</p></WorkflowForm>
    </section>
    <section id="stations" className="workspace-section mt-8"><h2 className="page-title">Demo station settings</h2><p className="muted my-3">Approved demo stations appear in the found report form. The public directory of real Iligan stations is separate.</p>
      {[...sites,null].map((site,index)=><details className="panel my-4" key={site?.id??index}><summary className="font-bold cursor-pointer">{site?.name??"Add demo station"}</summary>
        <WorkflowForm action={saveStation.bind(null,site?.id??"")} label="Save station">
          <div className="form-grid filter-grid">{stationFields.map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={site?.[key]??""} maxLength={250}/></label>)}</div>
          <label><span><input type="checkbox" name="is_approved" defaultChecked={site?.is_approved??false}/> Available for demo handovers</span></label>
        </WorkflowForm>
      </details>)}
    </section>
  </>;
}
