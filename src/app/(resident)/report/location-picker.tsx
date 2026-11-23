"use client";

import StationMap from "../stations/station-map";
import type { Station } from "../stations/directory";

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

// Map-first location: the pin is the location. The closest station is offered as the place to take or check the item.
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
  const address = (station: Station) => station.address.value ?? "Address not published";
  return <div className="pin-picker">
    <div className="pin-picker-map">
      <StationMap stations={stations} selectedKey={selected ? `station:${selected.id}` : null} selectedCoordinates={point ? [point.latitude, point.longitude] : null} selectedCoordinatesLabel="Item location" active pickMode
        onSelect={key => { if (key.startsWith("station:")) onPreferred(key.slice("station:".length)); }}
        onPickCoordinate={([latitude, longitude]) => { const next = { latitude, longitude }; onPoint(next); const closest = nearestStation(next, stations); if (closest) onPreferred(closest.station.id); }}/>
    </div>
    <p className="pin-picker-hint">{point ? "Drag the pin to adjust it. Tap a station marker to choose a different one." : "Tap the map where the item was " + (kind === "found" ? "found" : "lost") + "."}</p>
    {nearest && <div className="nearest-station" aria-live="polite">
      <p className="eyebrow">Closest station · {nearest.km.toFixed(1)} km</p>
      <strong>{nearest.station.name.value}</strong>
      <p className="muted">{address(nearest.station)}</p>
      {nearest.station.phone.value?.[0] && <p className="muted">{nearest.station.phone.value[0]}</p>}
      <div className="nearest-station-actions">
        <button className="button" type="button" aria-pressed={preferredId === nearest.station.id} onClick={() => onPreferred(nearest.station.id)}>
          {preferredId === nearest.station.id ? "Selected" : kind === "found" ? "Turn over to this station" : "Check with this station"}
        </button>
        {preferredId && <button className="text-link" type="button" onClick={() => onPreferred("")}>Don’t use a station</button>}
      </div>
      {selected && selected.id !== nearest.station.id && <p className="muted pin-picker-note">Selected instead: {selected.name.value}</p>}
    </div>}
    {!nearest && selected && <p className="muted pin-picker-note">Selected: {selected.name.value}</p>}
  </div>;
}
