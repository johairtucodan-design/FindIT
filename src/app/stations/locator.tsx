"use client";

import { useState } from "react";
import { Icon } from "../glyph";
import type { Station } from "./directory";

function distance([lat, lng]: readonly [number, number], [otherLat, otherLng]: readonly [number, number]) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat - otherLat) * rad / 2) ** 2
    + Math.cos(lat * rad) * Math.cos(otherLat * rad) * Math.sin((lng - otherLng) * rad / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export default function Locator({ stations }: { stations: readonly Station[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [activeMap, setActiveMap] = useState<string | null>(null);
  const terms = query.toLowerCase().trim().split(/\s+/);
  const results = stations.filter(s => terms.every(term => `${s.name} ${s.address}`.toLowerCase().includes(term)))
    .map(s => ({ ...s, km: position && s.pin ? distance(position, s.pin) : null }));
  if (position) results.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));

  function locate() {
    if (!navigator.geolocation) return setMessage("Location is unavailable. Search by station instead.");
    setMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition([coords.latitude, coords.longitude]);
      setMessage("Stations with pins are sorted by straight-line distance. Your location stays on this page.");
    }, () => setMessage("Location denied or unavailable. Search by station instead."), { timeout: 10000 });
  }

  return <>
    <div className="panel">
      <div className="form-grid filter-grid"><label>Search stations<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try Station 4 or Tubod"/></label>
      <button className="button secondary justify-self-start" type="button" onClick={locate}><Icon name="pin" size={18}/> Use my location</button></div>
      <p className="muted mt-3 text-sm" role="status">{message || `${results.length} locations`}</p>
    </div>
    {results.length ? <ul className="grid gap-4 mt-6 sm:grid-cols-2">{results.map(s => {
      const [lat, lng] = s.pin ?? [];
      const expanded = activeMap === s.name;
      return <li className="panel min-w-0" key={s.name}>
        <div className="flex items-start gap-3"><span className="quick-icon"><Icon name="pin"/></span>
        <div><p className="eyebrow">{s.type}</p><h2 className="mt-1 text-xl font-bold">{s.name}</h2><p className="muted mt-2">{s.address}</p></div></div>
        {s.km !== null && <p className="muted mt-3 text-sm">{s.km.toFixed(2)} km away in a straight line</p>}
        {!s.pin && !s.map && <p className="muted mt-3 text-sm">Exact pin for the new building is unverified.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {s.pin && <button className="button secondary" type="button" aria-expanded={expanded} onClick={() => setActiveMap(expanded ? null : s.name)}>{expanded ? "Hide map" : "Show map"}</button>}
          {s.pin && <a className="text-link" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noreferrer">OpenStreetMap</a>}
          {s.map && <a className="text-link" href={s.map} target="_blank" rel="noreferrer">View camp on map</a>}
          <a className="text-link" href={s.source} target="_blank" rel="noreferrer">{s.sourceHasPhoto ? "Source & photos" : "Location source"} <span className="sr-only">({s.publisher})</span></a>
        </div>
        {expanded && lat !== undefined && lng !== undefined && <>
          <iframe title={`Map of ${s.name}`} className="mt-4 h-64 w-full rounded-lg border border-[var(--line)]" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-.008}%2C${lat-.006}%2C${lng+.008}%2C${lat+.006}&layer=mapnik&marker=${lat}%2C${lng}`}/>
          <p className="muted mt-2 text-xs">Map data © OpenStreetMap contributors</p>
        </>}
      </li>;
    })}</ul> : <p className="panel mt-5">No stations match. Try a station number or clear your search.</p>}
  </>;
}
