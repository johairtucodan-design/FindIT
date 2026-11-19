import { requireRole } from "@/lib/auth";
import LocationManager from "./location-manager";
import { stationFromRow } from "@/app/(resident)/stations/directory";
import type { ManagedStationLocation } from "@/lib/station-locations";

export const metadata = { title: "FindIT | Map locations" };

export default async function StationLocations() {
  const { client, profile } = await requireRole(["officer"]);
  const [{ data: rows, error }, { data: stationRows, error: stationError }] = await Promise.all([
    client.rpc("station_locations_for_staff"), client.rpc("station_directory"),
  ]);
  if (error || stationError) throw new Error("Unable to load assigned station map locations.");
  const stationRow = (stationRows ?? []).find((row: { id: string }) => row.id === profile.station_id);
  const station = stationRow ? stationFromRow(stationRow) : null;
  const locations = (rows ?? []) as ManagedStationLocation[];
  return <>
    <div className="workspace-heading"><p className="eyebrow">Assigned station</p><h1 className="page-title">Map locations</h1><p className="muted">Propose and maintain public-facing map pins for review.</p></div>
    {!station && <p className="notice my-5">Your staff account is not assigned to an approved public-reference station. Ask an admin to update the FindIT assignment before proposing public pins. Existing demo-station assignments are not eligible for public map submissions.</p>}
    <aside className="notice my-5"><strong>FindIT review is not station authorization.</strong> These pins are suggestions for public map display only. Never imply a station accepts a handover unless that has been officially confirmed.</aside>
    {station ? <LocationManager station={station} locations={locations}/> : <section className="panel muted">Public map editing is unavailable until this staff account is assigned to an approved public-reference station.</section>}
  </>;
}
