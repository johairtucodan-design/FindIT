"use client";

import { useState } from "react";
import { Icon } from "@/app/glyph";
import type { SourcedField, Station } from "./directory";
import StationMap from "./station-map";

type DirectoryFilter = "all" | "mapped" | "review";

function distanceKm(from: readonly [number, number], to: readonly [number, number]) {
  const radians = Math.PI / 180;
  const lat1 = from[0] * radians, lon1 = from[1] * radians;
  const lat2 = to[0] * radians, lon2 = to[1] * radians;
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function needsLocationReview(station: Station) {
  return station.address.status === "conflict" || !station.coordinates.value;
}

function fieldStatus(field: SourcedField<unknown>) {
  return field.status === "conflict" ? "Sources conflict" : field.value === null ? "Needs verification" : "Public source";
}

function SourceDetail({ label, field, value }: { label: string; field: SourcedField<unknown>; value: string }) {
  return <div className="station-detail-row">
    <dt>{label}</dt><dd>{value}</dd>
    <dd className="station-detail-status">{fieldStatus(field)}</dd>
    <dd className="station-field-sources">{field.sources.length ? field.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label}</a>) : <span>No public source</span>}<small>Checked {field.checkedAt}</small></dd>
    {field.note && <dd className="station-detail-note">{field.note}</dd>}
  </div>;
}

export default function Locator({ stations }: { stations: readonly Station[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(stations[0]?.id ?? null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const term = query.trim().toLowerCase();
  const results = stations.filter(station => {
    const searchText = [station.name.value, station.address.value, ...(station.phone.value ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!term || searchText.includes(term)) && (filter === "all" || (filter === "mapped" ? Boolean(station.coordinates.value) : needsLocationReview(station)));
  });
  if (position) results.sort((a, b) => (a.coordinates.value ? distanceKm(position, a.coordinates.value) : Infinity) - (b.coordinates.value ? distanceKm(position, b.coordinates.value) : Infinity));
  const selected = results.find(station => station.id === selectedId) ?? results[0] ?? null;
  const pointCount = results.filter(station => station.coordinates.value).length;

  function locate() {
    if (!navigator.geolocation) return setMessage("Location is unavailable. Search by station instead.");
    setMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition([coords.latitude, coords.longitude]);
      setMessage("Your location stays on this page. Distances are straight-line estimates.");
    }, () => setMessage("Location denied or unavailable. Search by station instead."), { timeout: 10000 });
  }

  return <>
    <section className="station-search panel" aria-label="Search station directory">
      <div className="station-search-row">
        <label>Search stations<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Station name, area, or phone"/></label>
        <label>Show<select value={filter} onChange={event => setFilter(event.target.value as DirectoryFilter)}><option value="all">All public listings</option><option value="mapped">With sourced map pin</option><option value="review">Needs location verification</option></select></label>
        <button className="button secondary" type="button" onClick={locate}><Icon name="pin" size={18}/> Use my location</button>
      </div>
      <p className="muted mt-3 text-sm" role="status">{message || `${results.length} public listings · ${pointCount} sourced map pins`}</p>
    </section>

    <div className="station-view-toggle" role="group" aria-label="Station directory view">
      <button type="button" aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>Station list</button>
      <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>Map and details</button>
    </div>

    <div className="station-explorer">
      <section className={`station-list-pane${mobileView === "list" ? " is-mobile-active" : ""}`} aria-label="Station listings">
        <div className="station-list-heading"><div><p className="eyebrow">PUBLIC REFERENCES · ILIGAN CITY</p><h2>{results.length} listings</h2></div><span className="station-live"><i/>{pointCount} map pins</span></div>
        {results.length ? <ul className="station-list">{results.map((station, index) => {
          const active = station.id === selected?.id;
          const address = station.address.value ?? "Address needs verification";
          const state = station.address.status === "conflict" ? "Sources conflict" : station.coordinates.value ? "Map pin sourced" : "No exact pin";
          return <li key={station.id}>
            <button className={`station-option${active ? " is-selected" : ""}`} type="button" aria-pressed={active} aria-label={`Select ${station.name.value} on map`} onClick={() => { setSelectedId(station.id); setMobileView("map"); }}>
              <span className="station-option-top"><span className="station-number">{String(index + 1).padStart(2, "0")}</span><span className="station-type">{station.kind === "headquarters" ? "City headquarters" : "Police station"}</span><span className={`station-status${station.address.status === "conflict" ? " has-conflict" : ""}`}>{state}</span></span>
              <strong>{station.name.value}</strong><span className="station-address">{address}</span>
              <span className="station-address">{station.phone.value?.[0] ?? "Phone needs verification"}</span>
              {position && station.coordinates.value && <span className="station-distance">{distanceKm(position, station.coordinates.value).toFixed(1)} km away · straight-line estimate</span>}
              <span className="station-open">{active ? "Selected details" : "View station"}<Icon name="arrow" size={16}/></span>
            </button>
          </li>;
        })}</ul> : <p className="station-empty">No station listings match. Try a shorter search or another filter.</p>}
      </section>

      <section className={`station-map-pane${mobileView === "map" ? " is-mobile-active" : ""}`} aria-label="Selected station and map">
        <div className="station-map-heading"><div><p className="eyebrow">INTERACTIVE STATION MAP</p><h2>{selected?.name.value ?? "Station map"}</h2><p>{selected?.address.value ?? "Search the list to find public station information."}</p></div><span className={`map-pin-status${selected?.coordinates.value ? " is-pinned" : ""}`}><i/>{selected?.coordinates.value ? "Sourced map pin" : "Exact pin needs verification"}</span></div>
        <div className="station-map-frame"><StationMap stations={results} selectedId={selected?.id ?? null} active={mobileView === "map"} onSelect={id => { setSelectedId(id); setMobileView("map"); }}/></div>
        {selected && <div className="station-selected-details">
          <div className="station-details-title"><div><p className="eyebrow">SOURCE DETAILS</p><h3>{selected.name.value}</h3></div><span>{selected.address.status === "conflict" ? "Sources conflict" : "Public-source listing"}</span></div>
          <dl className="station-details-grid">
            <SourceDetail label="Address" field={selected.address} value={selected.address.value ?? "Needs verification"}/>
            <div className="station-detail-row"><dt>Phone</dt><dd>{selected.phone.value?.map(phone => <a className="station-phone" href={`tel:${phone.replace(/[^\d+]/g, "")}`} key={phone}>{phone}</a>) ?? "Needs verification"}</dd><dd className="station-detail-status">{fieldStatus(selected.phone)}</dd><dd className="station-field-sources">{selected.phone.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}<small>Checked {selected.phone.checkedAt}</small></dd></div>
            <SourceDetail label="Receiving hours" field={selected.receivingHours} value={selected.receivingHours.value ?? "Needs verification"}/>
            <SourceDetail label="Service area" field={selected.serviceArea} value={selected.serviceArea.value ?? "Needs verification"}/>
            <SourceDetail label="Coordinates" field={selected.coordinates} value={selected.coordinates.value?.map(number => number.toFixed(5)).join(", ") ?? "Needs verification"}/>
          </dl>
        </div>}
        <p className="station-directory-note">Public references only; FindIT has no confirmed police partners or authorized handover points. Confirm details with the station before visiting. Never share a precise lost-item location on this map.</p>
      </section>
    </div>
    {/* TODO: add a staffed process for station-directory corrections. */}
  </>;
}
