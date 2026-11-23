"use client";

import { useEffect, useState } from "react";
import StationMap from "../stations/station-map";
import type { Station } from "../stations/directory";
import { formatRouteDistance, formatTravelTime, travelModeLabel, type TravelMode, type TravelRoute } from "@/lib/station-routing";

export type Point = { latitude: number; longitude: number };

function kmBetween(a: Point, [lat, lng]: readonly [number, number]) {
  const rad = Math.PI / 180;
  const h = Math.sin((lat - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(lat * rad) * Math.sin((lng - a.longitude) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function nearestStation(point: Point | null, stations: readonly Station[]) {
  if (!point) return null;
  let best: { station: Station; km: number } | null = null;
  for (const station of stations) {
    const at = station.coordinates.value;
    if (!at) continue;
    const km = kmBetween(point, at);
    if (!best || km < best.km) best = { station, km };
  }
  return best;
}

// Found reports: the pin is the location, and the closest station is offered as the place to turn the item over.
// Lost reports pass no stations, so this shows only the map pin.
export default function LocationPicker({ kind, stations, point, onPoint, preferredId, onPreferred }: {
  kind: "lost" | "found";
  stations: readonly Station[];
  point: Point | null;
  onPoint: (point: Point) => void;
  preferredId: string;
  onPreferred: (id: string) => void;
}) {
  const nearest = nearestStation(point, stations);
  const selected = stations.find(station => station.id === preferredId) ?? null;
  const [mode, setMode] = useState<TravelMode>("foot");
  const [route, setRoute] = useState<TravelRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState("");

  // A route only belongs to the pin and station it was requested for.
  useEffect(() => { setRoute(null); setRouteError(""); }, [point?.latitude, point?.longitude, preferredId, mode]);

  async function showRoute() {
    if (!point || !selected?.coordinates.value) return;
    setRouting(true); setRouteError("");
    try {
      const response = await fetch("/api/station-routes", {
        method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ mode: "route", origin: [point.latitude, point.longitude], station_id: selected.id, travel_mode: mode }),
      });
      const result = await response.json() as { error?: string; route?: TravelRoute };
      if (!response.ok || !result.route) throw new Error(result.error ?? "The route could not be calculated right now.");
      setRoute(result.route);
    } catch (error) {
      setRoute(null);
      setRouteError(error instanceof Error ? error.message : "The route could not be calculated right now.");
    } finally { setRouting(false); }
  }

  return <div className="pin-picker">
    <div className="pin-picker-map">
      <StationMap stations={stations} selectedKey={selected ? `station:${selected.id}` : null} selectedCoordinates={point ? [point.latitude, point.longitude] : null} selectedCoordinatesLabel={kind === "found" ? "Found here" : "Lost here"} active pickMode
        routeCoordinates={route?.coordinates ?? null}
        onSelect={key => { if (key.startsWith("station:")) onPreferred(key.slice("station:".length)); }}
        onPickCoordinate={([latitude, longitude]) => { const next = { latitude, longitude }; onPoint(next); const closest = nearestStation(next, stations); if (closest) onPreferred(closest.station.id); }}/>
    </div>
    <p className="pin-picker-hint">{point ? "Drag the pin to adjust it." + (kind === "found" && stations.length ? " Tap a station marker to choose a different one." : "") : `Tap the map where the item was ${kind === "found" ? "found" : "lost"}.`}</p>

    {kind === "found" && nearest && <div className="nearest-station" aria-live="polite">
      <p className="eyebrow">Closest station · {nearest.km.toFixed(1)} km</p>
      <strong>{nearest.station.name.value}</strong>
      <p className="muted">{nearest.station.address.value ?? "Address not published"}</p>
      {nearest.station.phone.value?.[0] && <p className="muted">{nearest.station.phone.value[0]}</p>}
      <div className="nearest-station-actions">
        <button className="button" type="button" aria-pressed={preferredId === nearest.station.id} onClick={() => onPreferred(nearest.station.id)}>
          {preferredId === nearest.station.id ? "Selected" : "Turn over to this station"}
        </button>
        {preferredId && <button className="text-link" type="button" onClick={() => onPreferred("")}>Don’t use a station</button>}
      </div>
      {selected && selected.id !== nearest.station.id && <p className="muted pin-picker-note">Selected instead: {selected.name.value}</p>}
    </div>}

    {kind === "found" && selected && selected.coordinates.value && point && <div className="route-panel" aria-live="polite">
      <div className="route-modes" role="group" aria-label="Route mode">
        {(["foot", "car"] as const).map(option => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)}>{travelModeLabel(option)}</button>)}
      </div>
      {route ? <p><strong>{formatTravelTime(route.duration_seconds)}</strong> · {formatRouteDistance(route.distance_meters)} to {selected.name.value}</p>
        : <p className="muted pin-picker-note">Show the route from this pin to {selected.name.value}. The pin is sent to the route service only when you tap this.</p>}
      {route && <ol className="route-steps">{route.steps.slice(0, 8).map((step, index) => <li key={`${index}-${step.instruction}`}>{step.instruction}</li>)}</ol>}
      {routeError && <p className="error" role="alert">{routeError}</p>}
      <button className="button secondary" type="button" onClick={showRoute} disabled={routing}>{routing ? "Finding route…" : route ? "Refresh route" : `Show ${travelModeLabel(mode)} route`}</button>
    </div>}
  </div>;
}
