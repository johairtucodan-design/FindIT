import WorkflowForm from "@/app/workflow-form";
import { reviewGuestReport } from "./guest-actions";

export type GuestReportRow = {
  id: string; kind: "lost" | "found"; title: string; category: string; color: string; description: string;
  location_text: string; occurred_at: string; contact_method: string; private_details: string | null;
  preferred_station_id: string | null; latitude: number; longitude: number; created_at: string;
};

const day = (value: string) => new Date(value).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" });

export default function GuestReportList({ reports, stationNames }: { reports: GuestReportRow[]; stationNames: Record<string, string> }) {
  if (!reports.length) return <section className="panel my-5"><h2 className="font-bold text-lg">No guest reports waiting</h2><p className="muted mt-2">New guest reports appear here for review before anything is shown publicly.</p></section>;
  return <div className="guest-review-list">
    {reports.map(report => {
      const station = report.preferred_station_id ? stationNames[report.preferred_station_id] ?? "Assigned station" : "No station chosen";
      return <section className="panel workspace-record my-5" key={report.id} aria-labelledby={`guest-${report.id}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3"><span className="kind-badge found">FOUND · GUEST</span><span className="location-status">{station}</span><span className="muted text-sm">Received {day(report.created_at)}</span></div>
        <h2 id={`guest-${report.id}`} className="text-lg font-bold">{report.title}</h2>
        <p className="muted text-sm mt-1">{report.category} · {report.color} · found {day(report.occurred_at)}</p>
        <p className="mt-3">{report.description}</p>
        <dl className="guest-review-facts">
          <div><dt>Place</dt><dd>{report.location_text}</dd></div>
          <div><dt>Map pin</dt><dd><a className="text-link" href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=18/${report.latitude}/${report.longitude}`} target="_blank" rel="noreferrer">{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</a></dd></div>
          <div><dt>Contact</dt><dd>{report.contact_method}</dd></div>
          {report.private_details && <div><dt>Private details</dt><dd className="whitespace-pre-wrap">{report.private_details}</dd></div>}
          <div><dt>Reference</dt><dd className="break-all">{report.id}</dd></div>
        </dl>
        <WorkflowForm action={reviewGuestReport.bind(null, report.id)} label="Mark reviewed" actions={[{ name: "decision", value: "reviewed", label: "Mark reviewed" }, { name: "decision", value: "dismissed", label: "Dismiss", className: "button secondary" }]}>
          <p className="muted text-sm">Check the station and contact before you decide. Marking a report reviewed records your decision; it does not publish the report.</p>
        </WorkflowForm>
      </section>;
    })}
  </div>;
}
