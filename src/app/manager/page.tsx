import Link from "@/app/app-link";
import {requireRole} from "@/lib/auth";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
import {assignUserAccess} from "./actions";

type AdminAccount={user_id:string;email:string|null;full_name:string;role:"citizen"|"officer"|"admin";station_id:string|null;station_name:string|null;created_at:string};
type AccessChange={id:number;actor_id:string|null;target_id:string;previous_role:"citizen"|"officer"|"admin";new_role:"citizen"|"officer"|"admin";previous_station_id:string|null;new_station_id:string|null;created_at:string};
type LocationEvent={id:number;location_id:string;station_id:string;actor_id:string;event_type:string;created_at:string};

export default async function Manager({searchParams}:{searchParams:Promise<{station?:string;start?:string;end?:string}>}) {
  const {client,user}=await requireRole(["admin"]);
  const filters=await searchParams;
  const [stations,rule,candidates,users,audit,locationEvents]=await Promise.all([
    client.from("stations").select("id,name,is_demo,is_approved").order("name"),
    client.from("retention_rules").select("retention_days").single(),
    client.rpc("retention_candidates").limit(50),
    client.rpc("admin_user_directory"),
    client.from("profile_role_audit").select("id,actor_id,target_id,previous_role,new_role,previous_station_id,new_station_id,created_at").order("created_at",{ascending:false}).limit(12),
    client.from("station_location_events").select("id,location_id,station_id,actor_id,event_type,created_at").order("created_at",{ascending:false}).limit(20),
  ]);
  if(stations.error||users.error||audit.error||locationEvents.error) throw new Error("Unable to load FindIT administration data");
  const stationRows=stations.data??[];
  const publicStations=stationRows.filter(site=>!site.is_demo&&site.is_approved);
  const accounts=(users.data??[]) as AdminAccount[];
  const changes=(audit.data??[]) as AccessChange[];
  const events=(locationEvents.data??[]) as LocationEvent[];
  const accountById=new Map(accounts.map(account=>[account.user_id,account]));
  const siteName=(id:string|null)=>{
    if(!id)return "No station assigned";
    const site=stationRows.find(row=>row.id===id);
    return !site||site.is_demo?"Legacy demo station assignment":site.name;
  };
  const station=publicStations.find(site=>site.id===filters.station)?.id??publicStations[0]?.id;
  const singaporeDate=(value:Date)=>value.toLocaleDateString("en-CA",{timeZone:"Asia/Singapore"});
  const day=(value:unknown,fallback:string)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:fallback;
  const start=day(filters.start,singaporeDate(new Date(Date.now()-29*86400000)));
  const end=day(filters.end,singaporeDate(new Date()));
  const summary=station?await client.rpc("station_summary",{station,start_day:start,end_day:end}).maybeSingle():null;
  const counts=summary?.data as {received:number;pending_claims:number;released:number}|null;
  return <>
    <div className="workspace-heading"><p className="eyebrow">Oversight</p><h1 className="page-title">Operations overview</h1><p className="muted">Manage FindIT account permissions and inspect map and record activity. This admin console does not establish a police partnership.</p></div>
    <section id="users" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">FindIT user access</h2>
      <p className="muted my-3">Assign Citizen/User, Staff, or Admin access. Staff assignments give the account access to matching reports for that reference; they do not verify employment or police authorization. Assign accounts you control only.</p>
      {!publicStations.length&&<p className="notice mb-4">No approved public-reference stations are available for staff assignment.</p>}
      <ul className="admin-users-list">{accounts.map(account=>{
        const currentStation=stationRows.find(row=>row.id===account.station_id);
        const stationLabel=currentStation?.is_demo?"Legacy demo assignment":account.station_name||"No station assigned";
        return <li className="admin-user-card" key={account.user_id}>
          <div className="admin-user-identity"><span className="admin-user-avatar">{(account.full_name||account.email||"?").slice(0,1).toUpperCase()}</span><div><h3>{account.full_name||"FindIT user"}</h3><p>{account.email}</p><small>Current role: {account.role==="officer"?"Staff":account.role==="admin"?"Admin":"Citizen/User"} · {stationLabel}</small></div></div>
          {account.user_id===user.id?<p className="admin-self-access">For safety, you can’t change your own role or station assignment here.</p>:<WorkflowForm action={assignUserAccess.bind(null,account.user_id)} label="Save access">
            <label>FindIT role<select name="role" defaultValue={account.role}><option value="citizen">Citizen / User</option><option value="officer">Staff</option><option value="admin">Admin</option></select></label>
            <label>Staff reference assignment<select name="station_id" defaultValue={publicStations.some(site=>site.id===account.station_id)?account.station_id??"":""}><option value="">No station assignment</option>{publicStations.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><span className="report-hint">Only approved public references can be assigned. Demo station controls are retired; existing assignments are left unchanged until you update the account.</span></label>
          </WorkflowForm>}
        </li>;
      })}</ul>
      <div className="admin-access-audit"><h3>Recent role and station changes</h3>{changes.length?<ol className="timeline">{changes.map(change=>{
        const actor=change.actor_id?accountById.get(change.actor_id):null;const target=accountById.get(change.target_id);const before=change.previous_role==="officer"?"Staff":change.previous_role==="admin"?"Admin":"Citizen/User";const after=change.new_role==="officer"?"Staff":change.new_role==="admin"?"Admin":"Citizen/User";
        return <li key={change.id}><strong>{target?.email??"Deleted or unavailable user"}</strong><p className="muted">{before} → {after} · {siteName(change.previous_station_id)} → {siteName(change.new_station_id)}</p><small className="muted">Changed by {actor?.email??change.actor_id??"Trusted database operation"} · {new Date(change.created_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</small></li>;
      })}</ol>:<p className="muted mt-2">No role or station changes recorded yet.</p>}</div>
    </section>
    <section id="location-activity" className="panel workspace-section my-5">
      <p className="eyebrow">PUBLIC MAP</p><h2 className="text-xl font-bold">Map pin activity</h2>
      <p className="muted my-3">Assigned station staff publish their public-reference pins directly. Admin approval is not required; these entries do not confirm police authorization or item acceptance.</p>
      <Link className="button secondary mb-4" href="/security/locations">Add or manage map pins</Link>
      {events.length?<ol className="timeline location-audit">{events.map(event=>{
        const stationName=stationRows.find(row=>row.id===event.station_id)?.name??"Unavailable station";
        const actor=accountById.get(event.actor_id)?.email??"Unavailable account";
        const label=({published:"Published to public map",edited:"Updated public map pin",deactivated:"Removed pin from public map",proposed:"Proposed pin (older review flow)",resubmitted:"Resubmitted pin (older review flow)",approved:"Approved in older review flow",rejected:"Rejected in older review flow"} as Record<string,string>)[event.event_type]??event.event_type;
        return <li key={event.id}><strong>{label}</strong><p className="muted">{stationName} · Pin {event.location_id.slice(0,8)} · {actor}</p><small>{new Date(event.created_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</small></li>;
      })}</ol>:<p className="muted">No map pins have been published yet.</p>}
    </section>
    <section id="activity" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">Station activity</h2><p className="muted my-3">Receipt and handover events, plus claims pending in the selected dates. Synthetic examples are excluded. Dates use Singapore time.</p>
      {station?<form className="form-grid filter-grid my-4">
        <label>Public reference<select name="station" defaultValue={station}>{publicStations.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>From<input name="start" type="date" defaultValue={start} required/></label>
        <label>Through<input name="end" type="date" defaultValue={end} min={start} required/></label>
        <button className="button">Apply dates</button>
      </form>:<p className="muted">No approved public references are available.</p>}
      {summary?.error?<p className="error" role="alert">Activity unavailable. Check the date range is valid and no longer than one year.</p>:counts&&<dl className="workspace-metrics">{[["Received",counts.received],["Pending claims",counts.pending_claims],["Released",counts.released]].map(([label,value])=><div className="workspace-metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </section>
    <section id="retention" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">Retention review</h2><p className="muted my-3">Review records after documented custody ends. Synthetic examples are excluded; archival hides a public listing and preserves its event history.</p>
      {rule.error?<p className="error">The retention rule couldn’t be loaded.</p>:<WorkflowForm action={operate.bind(null,"set_retention","")} label="Save retention rule"><label>Days after custody ends<input name="days" type="number" min="1" max="3650" defaultValue={rule.data?.retention_days} required/></label></WorkflowForm>}
      {candidates.error?<p className="error">Archive candidates couldn’t be loaded.</p>:!candidates.data?.length?<p className="muted">No records qualify for review.</p>:<ul className="timeline">{candidates.data.map((row:{id:string;title:string;ended_at:string})=><li key={row.id}>
        <Link className="text-link" href={`/security/reports/${row.id}`}>{row.title}</Link><p className="muted text-sm">Custody ended {row.ended_at.slice(0,10)}</p>
        <WorkflowForm action={operate.bind(null,"archive_report",row.id)} label="Archive report"><label><span><input name="confirmed" type="checkbox" required/> Confirm archival</span></label></WorkflowForm>
      </li>)}</ul>}
    </section>
  </>;
}
