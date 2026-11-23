import { requireRole } from "@/lib/auth";
import LocationManager from "./location-manager";
import { stationFromRow } from "@/app/(resident)/stations/directory";
import type { ManagedStationLocation } from "@/lib/station-locations";

export const metadata = { title: "FindIT | Map locations" };

export default async function StationLocations() {
  const { client, profile } = await requireRole(["officer", "admin"]);
  const [{ data: rows, error }, { data: stationRows, error: stationError }] = await Promise.all([
    client.rpc("station_locations_for_staff"), client.rpc("station_directory"),
  ]);
  if (error || stationError) throw new Error("Unable to load assigned station map locations.");
  const publicStations = ((stationRows ?? []) as (Parameters<typeof stationFromRow>[0] & { is_demo: boolean })[])
    .filter(row => !row.is_demo).map(stationFromRow);
  const stations = profile.role === "admin" ? publicStations : publicStations.filter(row => row.id === profile.station_id);
  const initialStationId = profile.role === "admin" ? stations[0]?.id ?? "" : profile.station_id ?? "";
  const locations = ((rows ?? []) as ManagedStationLocation[]).filter(pin => stations.some(station => station.id === pin.station_id));
  return <>
    <div className="workspace-heading"><p className="eyebrow">{profile.role === "admin" ? "Admin map tools" : "Assigned station"}</p><h1 className="page-title">Station map pins</h1><p className="muted">Add or manage public-reference map pins. This does not create a new station-directory listing.</p></div>
    {!stations.length && <p className="notice my-5">{profile.role === "admin" ? "There are no approved, non-demo public references available for map pins." : "Map-pin publishing needs an approved, non-demo station assignment. Ask a FindIT administrator to assign your account to an eligible station."}</p>}
    {stations.length ? <LocationManager stations={stations} initialStationId={initialStationId} locations={locations} allowStationSelection={profile.role === "admin"}/> : <section className="panel muted">Public map editing is unavailable until an eligible station reference is available.</section>}
  </>;
}
