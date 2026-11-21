import type { Station } from "@/app/(resident)/stations/directory";
import type { StationLocationPin } from "./station-locations.ts";

export const stationSelectionKey = (kind: "station" | "location", id: string) => `${kind}:${id}`;

export function resolveStationSelection(key: string | null, stations: readonly Station[], locations: readonly StationLocationPin[]) {
  return {
    station: key?.startsWith("station:") ? stations.find(station => stationSelectionKey("station", station.id) === key) ?? null : null,
    location: key?.startsWith("location:") ? locations.find(location => stationSelectionKey("location", location.id) === key) ?? null : null,
  };
}

export function afterAuthReportPath(value: unknown) {
  if (typeof value !== "string") return null;
  if (value === "/auth/setup") return value;
  const match = value.match(/^\/report\/(lost|found)(?:\?station=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$/i);
  return match ? `/report/${match[1]}${match[2] ? `?station=${match[2]}` : ""}` : null;
}
