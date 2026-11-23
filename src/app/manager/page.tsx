import Link from "@/app/app-link";
import {requireRole} from "@/lib/auth";
import {isUuid} from "@/lib/reports";
import WorkflowForm from "@/app/workflow-form";
import {operate} from "@/app/operations";
import {assignUserAccess} from "./actions";

type Role="citizen"|"officer"|"admin";
type AdminAccount={user_id:string;email:string|null;full_name:string;role:Role;station_id:string|null;station_name:string|null;created_at:string};
type AccessChange={id:number;actor_id:string|null;target_id:string;previous_role:Role;new_role:Role;previous_station_id:string|null;new_station_id:string|null;created_at:string};
type LocationEvent={id:number;location_id:string;station_id:string;actor_id:string;event_type:string;created_at:string};

const PAGE_SIZE=20;
const views=[["users","Users"],["changes","Access log"],["stations","Station activity"],["pins","Map pins"],["retention","Retention"]] as const;
type View=typeof views[number][0];
const roleLabel=(role:Role)=>role==="officer"?"Staff":role==="admin"?"Admin":"Citizen/User";
const dateLabel=(value:string)=>new Date(value).toLocaleString("en-SG",{timeZone:"Asia/Singapore"});

export default async function Manager({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const {client,user}=await requireRole(["admin"]);
  const params=await searchParams;
  const view=(views.find(([key])=>key===params.view)?.[0]??"users") as View;
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

  // Link builder: keeps the current view and filters, changing only what is passed.
  const linkFor=(next:Record<string,string|undefined>)=>{
    const merged:Record<string,string|undefined>={view,q:params.q,role:params.role,page:params.page,edit:params.edit,...next};
    const query=Object.entries(merged).filter(([,value])=>value).map(([key,value])=>`${key}=${encodeURIComponent(value!)}`).join("&");
    return `/manager${query?`?${query}`:""}`;
  };

  // Users view: search, role filter, paging, and one edit form at a time.
  const search=(params.q??"").trim().slice(0,120).toLowerCase();
  const roleFilter=(["citizen","officer","admin"] as const).find(role=>role===params.role);
  const filtered=accounts.filter(account=>(!roleFilter||account.role===roleFilter)&&(!search||`${account.full_name} ${account.email} ${account.station_name??""}`.toLowerCase().includes(search)));
  const pageCount=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(Math.max(1,Math.floor(Number(params.page))||1),pageCount);
  const rows=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const editing=params.edit&&isUuid(params.edit)?accountById.get(params.edit):undefined;
  const countOf=(role:Role)=>accounts.filter(account=>account.role===role).length;

  // Station activity view.
  const station=publicStations.find(site=>site.id===params.station)?.id??publicStations[0]?.id;
  const singaporeDate=(value:Date)=>value.toLocaleDateString("en-CA",{timeZone:"Asia/Singapore"});
  const day=(value:unknown,fallback:string)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:fallback;
  const start=day(params.start,singaporeDate(new Date(Date.now()-29*86400000)));
  const end=day(params.end,singaporeDate(new Date()));
  const summary=view==="stations"&&station?await client.rpc("station_summary",{station,start_day:start,end_day:end}).maybeSingle():null;
  const counts=summary?.data as {received:number;pending_claims:number;released:number}|null;

  let body;
  if(view==="users") {
    body=<section className="panel workspace-section" aria-labelledby="users-title">
      <div className="admin-section-head"><div><h2 id="users-title" className="text-xl font-bold">FindIT user access</h2><p className="muted mt-2">Assign Citizen/User, Staff, or Admin access. Staff assignments give the account access to matching reports for that reference; they do not verify employment or police authorization.</p></div></div>
      {!publicStations.length&&<p className="notice mt-4">No approved public-reference stations are available for staff assignment.</p>}
      <dl className="workspace-metrics">
        <div className="workspace-metric"><dt>All accounts</dt><dd>{accounts.length}</dd></div>
        <div className="workspace-metric"><dt>Citizen/User</dt><dd>{countOf("citizen")}</dd></div>
        <div className="workspace-metric"><dt>Staff</dt><dd>{countOf("officer")}</dd></div>
        <div className="workspace-metric"><dt>Admin</dt><dd>{countOf("admin")}</dd></div>
      </dl>
      {editing&&<div className="admin-edit-panel">
        <div className="admin-edit-head"><div><p className="eyebrow">Editing access</p><h3>{editing.full_name||"FindIT user"}</h3><p className="muted">{editing.email} · Current role: {roleLabel(editing.role)} · {editing.station_name||"No station assigned"}</p></div><Link className="text-link" href={linkFor({edit:undefined})}>Close</Link></div>
        {editing.user_id===user.id?<p className="admin-self-access">For safety, you can’t change your own role or station assignment here.</p>:<WorkflowForm action={assignUserAccess.bind(null,editing.user_id)} label="Save access">
          <label>FindIT role<select name="role" defaultValue={editing.role}><option value="citizen">Citizen / User</option><option value="officer">Staff</option><option value="admin">Admin</option></select></label>
          <label>Staff reference assignment<select name="station_id" defaultValue={publicStations.some(site=>site.id===editing.station_id)?editing.station_id??"":""}><option value="">No station assignment</option>{publicStations.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><span className="report-hint">Only approved public references can be assigned.</span></label>
        </WorkflowForm>}
      </div>}
      <form className="admin-toolbar" action="/manager" method="get">
        <input type="hidden" name="view" value="users"/>
        <label className="admin-search">Search users<input type="search" name="q" defaultValue={params.q??""} placeholder="Name, email or station"/></label>
        <label>Role<select name="role" defaultValue={roleFilter??""}><option value="">All roles</option><option value="citizen">Citizen / User</option><option value="officer">Staff</option><option value="admin">Admin</option></select></label>
        <button className="button">Apply</button>
        {(params.q||params.role)&&<Link className="text-link" href="/manager?view=users">Clear</Link>}
      </form>
      <p className="muted admin-count" role="status">{filtered.length===0?"No matching accounts.":`Showing ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE,filtered.length)} of ${filtered.length}`}</p>
      {rows.length>0&&<div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Station</th><th scope="col">Joined</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{rows.map(account=><tr key={account.user_id} className={account.user_id===editing?.user_id?"is-editing":undefined}>
          <td data-label="User"><div className="admin-user-identity"><span className="admin-user-avatar">{(account.full_name||account.email||"?").slice(0,1).toUpperCase()}</span><div><strong>{account.full_name||"FindIT user"}</strong><p>{account.email}</p></div></div></td>
          <td data-label="Role"><span className={`role-pill role-${account.role}`}>{roleLabel(account.role)}</span></td>
          <td data-label="Station">{account.station_name||"No station assigned"}</td>
          <td data-label="Joined">{new Date(account.created_at).toLocaleDateString("en-SG",{timeZone:"Asia/Singapore"})}</td>
          <td data-label="Actions"><Link className="button secondary admin-row-action" href={linkFor({edit:account.user_id})}>Edit access</Link></td>
        </tr>)}</tbody>
      </table></div>}
      {pageCount>1&&<nav className="admin-pager" aria-label="Pagination">
        {currentPage>1?<Link className="button secondary" href={linkFor({page:String(currentPage-1)})}>Previous</Link>:<span className="button secondary is-disabled" aria-disabled="true">Previous</span>}
        <span className="muted">Page {currentPage} of {pageCount}</span>
        {currentPage<pageCount?<Link className="button secondary" href={linkFor({page:String(currentPage+1)})}>Next</Link>:<span className="button secondary is-disabled" aria-disabled="true">Next</span>}
      </nav>}
    </section>;
  } else if(view==="changes") {
    body=<section className="panel workspace-section" aria-labelledby="changes-title">
      <h2 id="changes-title" className="text-xl font-bold">Recent role and station changes</h2>
      <p className="muted mt-2">The latest 12 access changes, newest first.</p>
      {changes.length?<ol className="timeline mt-4">{changes.map(change=>{
        const actor=change.actor_id?accountById.get(change.actor_id):null;const target=accountById.get(change.target_id);
        return <li key={change.id}><strong>{target?.email??"Deleted or unavailable user"}</strong><p className="muted">{roleLabel(change.previous_role)} → {roleLabel(change.new_role)} · {siteName(change.previous_station_id)} → {siteName(change.new_station_id)}</p><small className="muted">Changed by {actor?.email??change.actor_id??"Trusted database operation"} · {dateLabel(change.created_at)}</small></li>;
      })}</ol>:<p className="muted mt-4">No role or station changes recorded yet.</p>}
    </section>;
  } else if(view==="stations") {
    body=<section className="panel workspace-section" aria-labelledby="activity-title">
      <h2 id="activity-title" className="text-xl font-bold">Station activity</h2><p className="muted mt-2">Receipt and handover events, plus claims pending in the selected dates. Synthetic examples are excluded. Dates use Singapore time.</p>
      {station?<form className="admin-toolbar mt-4" action="/manager" method="get">
        <input type="hidden" name="view" value="stations"/>
        <label>Public reference<select name="station" defaultValue={station}>{publicStations.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>From<input name="start" type="date" defaultValue={start} required/></label>
        <label>Through<input name="end" type="date" defaultValue={end} min={start} required/></label>
        <button className="button">Apply dates</button>
      </form>:<p className="muted mt-4">No approved public references are available.</p>}
      {summary?.error?<p className="error mt-4" role="alert">Activity unavailable. Check the date range is valid and no longer than one year.</p>:counts&&<dl className="workspace-metrics">{[["Received",counts.received],["Pending claims",counts.pending_claims],["Released",counts.released]].map(([label,value])=><div className="workspace-metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    </section>;
  } else if(view==="pins") {
    body=<section className="panel workspace-section" aria-labelledby="pins-title">
      <p className="eyebrow">Public map</p><h2 id="pins-title" className="text-xl font-bold">Map pin activity</h2>
      <p className="muted mt-2">Assigned station staff publish their public-reference pins directly.</p>
      <Link className="button secondary my-4" href="/security/locations">Add or manage map pins</Link>
      {events.length?<ol className="timeline location-audit">{events.map(event=>{
        const stationName=stationRows.find(row=>row.id===event.station_id)?.name??"Unavailable station";
        const actor=accountById.get(event.actor_id)?.email??"Unavailable account";
        const label=({published:"Published to public map",edited:"Updated public map pin",deactivated:"Removed pin from public map",proposed:"Proposed pin (older review flow)",resubmitted:"Resubmitted pin (older review flow)",approved:"Approved in older review flow",rejected:"Rejected in older review flow"} as Record<string,string>)[event.event_type]??event.event_type;
        return <li key={event.id}><strong>{label}</strong><p className="muted">{stationName} · Pin {event.location_id.slice(0,8)} · {actor}</p><small>{dateLabel(event.created_at)}</small></li>;
      })}</ol>:<p className="muted">No map pins have been published yet.</p>}
    </section>;
  } else {
    body=<section className="panel workspace-section" aria-labelledby="retention-title">
      <h2 id="retention-title" className="text-xl font-bold">Retention review</h2><p className="muted mt-2">Review records after documented custody ends. Synthetic examples are excluded; archival hides a public listing and preserves its event history.</p>
      <div className="mt-4">{rule.error?<p className="error">The retention rule couldn’t be loaded.</p>:<WorkflowForm action={operate.bind(null,"set_retention","")} label="Save retention rule"><label>Days after custody ends<input name="days" type="number" min="1" max="3650" defaultValue={rule.data?.retention_days} required/></label></WorkflowForm>}</div>
      <div className="mt-6">{candidates.error?<p className="error">Archive candidates couldn’t be loaded.</p>:!candidates.data?.length?<p className="muted">No records qualify for review.</p>:<ul className="timeline">{candidates.data.map((row:{id:string;title:string;ended_at:string})=><li key={row.id}>
        <Link className="text-link" href={`/security/reports/${row.id}`}>{row.title}</Link><p className="muted text-sm">Custody ended {row.ended_at.slice(0,10)}</p>
        <WorkflowForm action={operate.bind(null,"archive_report",row.id)} label="Archive report"><label><span><input name="confirmed" type="checkbox" required/> Confirm archival</span></label></WorkflowForm>
      </li>)}</ul>}</div>
    </section>;
  }

  return <>
    <div className="workspace-heading"><p className="eyebrow">Oversight</p><h1 className="page-title">Operations overview</h1><p className="muted">Manage FindIT account permissions and inspect map and record activity.</p></div>
    <nav className="admin-tabs" aria-label="Admin sections">{views.map(([key,label])=><Link key={key} href={`/manager?view=${key}`} aria-current={key===view?"page":undefined}>{label}</Link>)}</nav>
    <div className="admin-view">{body}</div>
  </>;
}
