import Link from "@/app/app-link";
import {requireRole} from "@/lib/auth";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
import {assignUserAccess,saveStation} from "./actions";

const stationFields=[["name","Name"],["address","Address"],["phone","Contact phone"],["service_area","Barangay or city served"],["receiving_hours","Posted receiving hours"],["latitude","Latitude for map update"],["longitude","Longitude for map update"]];
type AdminAccount={user_id:string;email:string|null;full_name:string;role:"citizen"|"officer"|"admin";station_id:string|null;station_name:string|null;created_at:string};
type AccessChange={id:number;actor_id:string|null;target_id:string;previous_role:"citizen"|"officer"|"admin";new_role:"citizen"|"officer"|"admin";previous_station_id:string|null;new_station_id:string|null;created_at:string};

export default async function Manager({searchParams}:{searchParams:Promise<{station?:string;start?:string;end?:string}>}) {
  const {client,user}=await requireRole(["admin"]);
  const filters=await searchParams;
  const [stations,rule,candidates,users,audit]=await Promise.all([
    client.from("stations").select("*").order("name"),
    client.from("retention_rules").select("retention_days").single(),
    client.rpc("retention_candidates").limit(50),
    client.rpc("admin_user_directory"),
    client.from("profile_role_audit").select("id,actor_id,target_id,previous_role,new_role,previous_station_id,new_station_id,created_at").order("created_at",{ascending:false}).limit(12),
  ]);
  if(stations.error||users.error||audit.error) throw new Error("Unable to load FindIT administration data");
  const sites=(stations.data??[]).filter(site=>site.is_demo);
  const approvedDemoSites=sites.filter(site=>site.is_demo&&site.is_approved);
  const accounts=(users.data??[]) as AdminAccount[];
  const changes=(audit.data??[]) as AccessChange[];
  const accountById=new Map(accounts.map(account=>[account.user_id,account]));
  const siteName=(id:string|null)=>id?sites.find(site=>site.id===id)?.name??"Station record unavailable":"No station assigned";
  const station=sites.find(site=>site.id===filters.station)?.id??sites[0]?.id;
  const singaporeDate=(value:Date)=>value.toLocaleDateString("en-CA",{timeZone:"Asia/Singapore"});
  const day=(value:unknown,fallback:string)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:fallback;
  const start=day(filters.start,singaporeDate(new Date(Date.now()-29*86400000)));
  const end=day(filters.end,singaporeDate(new Date()));
  const summary=station?await client.rpc("station_summary",{station,start_day:start,end_day:end}).maybeSingle():null;
  const counts=summary?.data as {received:number;pending_claims:number;released:number}|null;
  return <>
    <div className="workspace-heading"><p className="eyebrow">Oversight and configuration</p><h1 className="page-title">Operations overview</h1><p className="muted">Review activity and manage the fictional stations used for FindIT handover demos.</p></div>
    <section id="users" className="panel workspace-section my-5">
      <h2 className="text-xl font-bold">FindIT user access</h2><p className="muted my-3">Assign Citizen/User, Staff, or Admin access for FindIT. This does not change Supabase email or password. Staff access must be scoped to an approved demo station; these assignments do not represent police authorization.</p>
      {!approvedDemoSites.length&&<p className="notice mb-4">Approve a clearly marked demo station before assigning staff access.</p>}
      <ul className="admin-users-list">{accounts.map(account=><li className="admin-user-card" key={account.user_id}>
        <div className="admin-user-identity"><span className="admin-user-avatar">{(account.full_name||account.email||"?").slice(0,1).toUpperCase()}</span><div><h3>{account.full_name||"FindIT user"}</h3><p>{account.email}</p><small>Current role: {account.role==="officer"?"Staff":account.role==="admin"?"Admin":"Citizen/User"} · {account.station_name||"No station assigned"}</small></div></div>
        {account.user_id===user.id?<p className="admin-self-access">For safety, you can’t change your own role or station assignment here.</p>:<WorkflowForm action={assignUserAccess.bind(null,account.user_id)} label="Save access">
          <label>FindIT role<select name="role" defaultValue={account.role}><option value="citizen">Citizen / User</option><option value="officer">Staff</option><option value="admin">Admin</option></select></label>
          <label>Staff station assignment<select name="station_id" defaultValue={account.station_id??""}><option value="">No station assignment</option>{approvedDemoSites.map(site=><option key={site.id} value={site.id}>{site.name} · demo station</option>)}</select><span className="report-hint">Only approved demo stations can be assigned. Citizen and Admin roles have no station.</span></label>
        </WorkflowForm>}
      </li>)}</ul>
      <div className="admin-access-audit"><h3>Recent role and station changes</h3>{changes.length?<ol className="timeline">{changes.map(change=>{
        const actor=change.actor_id?accountById.get(change.actor_id):null;const target=accountById.get(change.target_id);const before=change.previous_role==="officer"?"Staff":change.previous_role==="admin"?"Admin":"Citizen/User";const after=change.new_role==="officer"?"Staff":change.new_role==="admin"?"Admin":"Citizen/User";
        return <li key={change.id}><strong>{target?.email??"Deleted or unavailable user"}</strong><p className="muted">{before} → {after} · {siteName(change.previous_station_id)} → {siteName(change.new_station_id)}</p><small className="muted">Changed by {actor?.email??change.actor_id??"Trusted database operation"} · {new Date(change.created_at).toLocaleString("en-SG",{timeZone:"Asia/Singapore"})}</small></li>;
      })}</ol>:<p className="muted mt-2">No role or station changes recorded yet.</p>}</div>
    </section>
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
