import Locator from "./locator";
import { stationFromRow } from "./directory";
import { createClient } from "@/lib/supabase/server";
import type { StationLocationPin } from "@/lib/station-locations";
import { isUuid } from "@/lib/reports";

export default async function Stations({ searchParams }: { searchParams: Promise<{ location?: string | string[] }> }) {
  const params = await searchParams;
  const requestedLocationId = typeof params.location === "string" && isUuid(params.location) ? params.location : null;
  const client = await createClient();
  const [{ data, error }, { data: pins, error: pinError }] = await Promise.all([
    client.rpc("station_directory"), client.rpc("station_location_directory"),
  ]);
  if (error || pinError) throw new Error("Unable to load the public station map.");
  const stations = (data ?? []).map((row: Parameters<typeof stationFromRow>[0]) => stationFromRow(row));
  const locations = (pins ?? []) as StationLocationPin[];
  const initialLocationId = requestedLocationId && locations.some(pin => pin.id === requestedLocationId) ? requestedLocationId : null;
  return <>
    <p className="eyebrow">Iligan City directory</p>
    <h1 className="page-title">Find a police station</h1>
    <p className="muted mt-3">Search public station listings, select a map pin, and review each field’s source and check date.</p>
    {stations.length ? <Locator stations={stations} locations={locations} initialLocationId={initialLocationId}/> : <p className="panel mt-5">No sourced public references are available right now.</p>}
  </>;
}
