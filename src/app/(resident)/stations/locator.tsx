"use client";

import { useState } from "react";
import { Icon } from "@/app/glyph";
import type { SourcedField, Station } from "./directory";
import type { StationLocationPin } from "@/lib/station-locations";
import { isGeoPoint, rankNearby, type GeoPoint } from "@/lib/geospatial";
import StationMap from "./station-map";

type DirectoryFilter = "all" | "mapped" | "review";

function needsLocationReview(station: Station) {
  return station.address.status === "conflict" || !station.coordinates.value;
}

function fieldStatus(field: SourcedField<unknown>) {
  return field.status === "conflict" ? "Sources conflict" : field.status === "not-published" ? "Not published" : field.value === null ? "Needs verification" : "Public source";
}

function missingLabel(field: SourcedField<unknown>, label: string) {
  return field.status === "conflict" ? `${label} withheld: sources conflict` : `${label} not published`;
}

function SourceDetail({ label, field, value }: { label: string; field: SourcedField<unknown>; value: string }) {
  return <div className="station-detail-row">
    <dt>{label}</dt><dd>{value}</dd>
    <dd className="station-detail-status">{fieldStatus(field)}</dd>
    <dd className="station-field-sources">{field.sources.length ? field.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label}</a>) : <span>No public source</span>}<small>Checked {field.checkedAt}</small></dd>
    {field.note && <dd className="station-detail-note">{field.note}</dd>}
  </div>;
}

export default function Locator({ stations, locations }: { stations: readonly Station[]; locations: readonly StationLocationPin[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [choosingOrigin, setChoosingOrigin] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(stations[0] ? `station:${stations[0].id}` : locations[0] ? `location:${locations[0].id}` : null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const term = query.trim().toLowerCase();
  const filteredStations = stations.filter(station => {
    const searchText = [station.name.value, station.address.value, ...(station.phone.value ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!term || searchText.includes(term)) && (filter === "all" || (filter === "mapped" ? Boolean(station.coordinates.value) : needsLocationReview(station)));
  });
  const visibleLocations = locations.filter(pin => !term || `${pin.name} ${pin.station_name} ${pin.description}`.toLowerCase().includes(term));
  const nearbyTargets = [
    ...filteredStations.map(station => ({ key: `station:${station.id}`, name: station.name.value ?? "Police station reference", type: "Station" as const, point: station.coordinates.value })),
    ...visibleLocations.map(pin => ({ key: `location:${pin.id}`, name: pin.name, type: "FindIT-reviewed suggestion" as const, point: [pin.latitude, pin.longitude] as const })),
  ];
  const closest = position ? rankNearby(position, nearbyTargets, target => target.point)[0] ?? null : null;
  const stationDistances = new Map((position ? rankNearby(position, filteredStations, station => station.coordinates.value) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const locationDistances = new Map((position ? rankNearby(position, visibleLocations, pin => [pin.latitude, pin.longitude] as const) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const results = position ? [...filteredStations].sort((a, b) => (stationDistances.get(a.id) ?? Infinity) - (stationDistances.get(b.id) ?? Infinity)) : filteredStations;
  const orderedLocations = position ? [...visibleLocations].sort((a, b) => (locationDistances.get(a.id) ?? Infinity) - (locationDistances.get(b.id) ?? Infinity)) : visibleLocations;
  const selectedLocation = visibleLocations.find(pin => selectedKey === `location:${pin.id}`) ?? null;
  const selected = selectedKey?.startsWith("station:") ? results.find(station => selectedKey === `station:${station.id}`) ?? null : null;
  const activeStation = selected ?? (selectedLocation || position ? null : results[0] ?? null);
  const activeKey = selectedLocation ? `location:${selectedLocation.id}` : activeStation ? `station:${activeStation.id}` : position ? closest?.entry.key ?? null : orderedLocations[0] ? `location:${orderedLocations[0].id}` : null;
  const pointCount = results.filter(station => station.coordinates.value).length;

  function useOrigin(value: unknown) {
    if (!isGeoPoint(value)) {
      setMessage("We couldn’t read a valid map point. Choose a point on the map or try again.");
      return;
    }
    const point: GeoPoint = [value[0], value[1]];
    const nearest = rankNearby(point, nearbyTargets, target => target.point)[0];
    setPosition([point[0], point[1]]);
    setChoosingOrigin(false);
    setSelectedKey(nearest?.entry.key ?? null);
    setMobileView("map");
    setMessage(nearest
      ? `Closest public listing: ${nearest.entry.name}, ${nearest.distanceKm.toFixed(1)} km away. Straight-line estimate; this starting point stays in your browser.`
      : "No public listings with verified map pins match the current search. Clear the search or use the station list.");
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Location sharing isn’t available here. Choose a starting point on the map instead.");
    setMessage("Requesting location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      useOrigin([coords.latitude, coords.longitude]);
    }, () => setMessage("Location was denied or unavailable. Choose a starting point on the map instead."), { timeout: 10000 });
  }

  return <>
    <section className="station-search panel" aria-label="Search station directory">
      <div className="station-search-row">
        <label>Search stations<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Station name, area, or phone"/></label>
        <label>Show<select value={filter} onChange={event => setFilter(event.target.value as DirectoryFilter)}><option value="all">All public listings</option><option value="mapped">With sourced map pin</option><option value="review">Needs location verification</option></select></label>
        <div className="station-origin-actions"><button className="button secondary" type="button" onClick={locate}><Icon name="pin" size={18}/> Use my location</button><button className="button secondary" type="button" aria-pressed={choosingOrigin} onClick={() => { setChoosingOrigin(value => !value); setMobileView("map"); setMessage(choosingOrigin ? "Map selection cancelled." : "Tap or drag the orange marker on the map to choose a starting point."); }}>{choosingOrigin ? "Cancel map pick" : "Choose on map"}</button>{position && <button className="text-link" type="button" onClick={() => { setPosition(null); setChoosingOrigin(false); setMessage("Starting point cleared."); }}>Clear point</button>}</div>
      </div>
      <p className="muted mt-3 text-sm" role="status">{message || `${results.length} public listings · ${pointCount} sourced station pins · ${visibleLocations.length} reviewed map suggestions`}</p>
      {position && closest && <div className="nearby-result"><div><p className="eyebrow">CLOSEST PUBLIC MAP LISTING</p><strong>{closest.entry.name}</strong><span>{closest.distanceKm.toFixed(1)} km · approximate straight-line distance · {closest.entry.type}</span></div><button className="button secondary" type="button" onClick={() => { setSelectedKey(closest.entry.key); setMobileView("map"); }}>Show on map</button></div>}
      {position && !closest && <p className="station-empty mt-3">No verified public map pins are available for the current search.</p>}
      {choosingOrigin && <p className="station-map-pick-hint" role="note">Tap the map to place the starting point. Drag the orange marker to fine-tune it.</p>}
    </section>

    <div className="station-view-toggle" role="group" aria-label="Station directory view">
      <button type="button" aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>Station list</button>
      <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>Map and details</button>
    </div>

    <div className="station-explorer">
      <section className={`station-list-pane${mobileView === "list" ? " is-mobile-active" : ""}`} aria-label="Station listings">
        <div className="station-list-heading"><div><p className="eyebrow">PUBLIC REFERENCES · ILIGAN CITY</p><h2>{results.length} listings</h2></div><span className="station-live"><i/>{pointCount} station pins</span></div>
        {results.length ? <ul className="station-list">{results.map((station, index) => {
          const active = `station:${station.id}` === activeKey;
          const address = station.address.value ?? missingLabel(station.address, "Address");
          const state = station.address.status === "conflict" ? "Sources conflict" : station.coordinates.value ? "Map pin sourced" : "No exact pin";
          return <li key={station.id}>
            <button className={`station-option${active ? " is-selected" : ""}`} type="button" aria-pressed={active} aria-label={`Select ${station.name.value} on map`} onClick={() => { setSelectedKey(`station:${station.id}`); setMobileView("map"); }}>
              <span className="station-option-top"><span className="station-number">{String(index + 1).padStart(2, "0")}</span><span className="station-type">{station.kind === "headquarters" ? "City headquarters" : "Police station"}</span><span className={`station-status${station.address.status === "conflict" ? " has-conflict" : ""}`}>{state}</span></span>
              <strong>{station.name.value}</strong><span className="station-address">{address}</span>
              <span className="station-address">{station.phone.value?.[0] ?? missingLabel(station.phone, "Phone")}</span>
              {position && (stationDistances.has(station.id) ? <span className="station-distance">{stationDistances.get(station.id)?.toFixed(1)} km away · straight-line estimate</span> : <span className="station-address">Distance unavailable · no verified map pin</span>)}
              <span className="station-open">{active ? "Selected details" : "View station"}<Icon name="arrow" size={16}/></span>
            </button>
          </li>;
        })}</ul> : <p className="station-empty">No station listings match. Try a shorter search or another filter.</p>}
        {orderedLocations.length > 0 && <ul className="station-pin-list"><li><h3>FindIT-reviewed map suggestions</h3><p className="muted text-xs">These are public map references, not station-approved handover locations.</p></li>{orderedLocations.map(pin => {
          const active = activeKey === `location:${pin.id}`;
          return <li key={pin.id}><button type="button" className={`station-pin-option${active ? " is-selected" : ""}`} aria-pressed={active} onClick={() => { setSelectedKey(`location:${pin.id}`); setMobileView("map"); }}><strong>{pin.name}</strong><span>{pin.station_name} · FindIT-reviewed suggestion</span>{position && locationDistances.has(pin.id) && <span className="station-distance">{locationDistances.get(pin.id)?.toFixed(1)} km away · straight-line estimate</span>}<small>{pin.description}</small></button></li>;
        })}</ul>}
      </section>

      <section className={`station-map-pane${mobileView === "map" ? " is-mobile-active" : ""}`} aria-label="Selected station and map">
        <div className="station-map-heading"><div><p className="eyebrow">INTERACTIVE STATION MAP</p><h2>{selectedLocation?.name ?? activeStation?.name.value ?? "Station map"}</h2><p>{selectedLocation ? selectedLocation.station_name : activeStation?.address.value ?? (activeStation ? missingLabel(activeStation.address, "Address") : "Search the list to find public station information.")}</p></div><span className={`map-pin-status${selectedLocation || activeStation?.coordinates.value ? " is-pinned" : ""}`}><i/>{selectedLocation ? "Reviewed map suggestion" : activeStation?.coordinates.value ? "Sourced map pin" : activeStation ? missingLabel(activeStation.coordinates, "Map pin") : "No selected location"}</span></div>
        <div className={`station-map-frame${choosingOrigin ? " is-picking" : ""}`}><StationMap stations={results} locations={locations} selectedKey={activeKey} selectedCoordinates={position} selectedCoordinatesLabel="Nearby search starting point" pickMode={choosingOrigin} active={mobileView === "map"} onSelect={key => { setSelectedKey(key); setMobileView("map"); }} onPickCoordinate={useOrigin}/></div>
        {selectedLocation && <div className="station-selected-details">
          <div className="station-details-title"><div><p className="eyebrow">FINDIT-REVIEWED SUGGESTION</p><h3>{selectedLocation.name}</h3></div><span>Not station-approved</span></div>
          <dl className="station-details-grid"><div className="station-detail-row"><dt>Station reference</dt><dd>{selectedLocation.station_name}</dd></div><div className="station-detail-row"><dt>Public description</dt><dd>{selectedLocation.description}</dd></div><div className="station-detail-row"><dt>Visit instructions</dt><dd>{selectedLocation.visit_instructions}</dd></div></dl>
          <p className="station-pin-disclaimer">Admin review only approves this FindIT listing for display. It does not confirm station permission, police partnership, item acceptance, or custody. Confirm with the station before visiting.</p>
        </div>}
        {activeStation && <div className="station-selected-details">
          <div className="station-details-title"><div><p className="eyebrow">SOURCE DETAILS</p><h3>{activeStation.name.value}</h3></div><span>{activeStation.address.status === "conflict" ? "Sources conflict" : "Public-source listing"}</span></div>
          <dl className="station-details-grid">
            <SourceDetail label="Address" field={activeStation.address} value={activeStation.address.value ?? missingLabel(activeStation.address, "Address")}/>
            <div className="station-detail-row"><dt>Phone</dt><dd>{activeStation.phone.value?.map(phone => <a className="station-phone" href={`tel:${phone.replace(/[^\d+]/g, "")}`} key={phone}>{phone}</a>) ?? missingLabel(activeStation.phone, "Phone")}</dd><dd className="station-detail-status">{fieldStatus(activeStation.phone)}</dd><dd className="station-field-sources">{activeStation.phone.sources.length ? activeStation.phone.sources.map(source => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.label}</a>) : <span>No public source</span>}<small>Checked {activeStation.phone.checkedAt}</small></dd>{activeStation.phone.note && <dd className="station-detail-note">{activeStation.phone.note}</dd>}</div>
            <SourceDetail label="Receiving hours" field={activeStation.receivingHours} value={activeStation.receivingHours.value ?? missingLabel(activeStation.receivingHours, "Receiving hours")}/>
            <SourceDetail label="Service area" field={activeStation.serviceArea} value={activeStation.serviceArea.value ?? missingLabel(activeStation.serviceArea, "Service area")}/>
            <SourceDetail label="Coordinates" field={activeStation.coordinates} value={activeStation.coordinates.value?.map(number => number.toFixed(5)).join(", ") ?? missingLabel(activeStation.coordinates, "Map pin")}/>
          </dl>
        </div>}
        <p className="station-directory-note">Public references only; FindIT has no confirmed police partners or authorized handover points. Confirm details with the station before visiting. Never share a precise lost-item location on this map.</p>
      </section>
    </div>
    {/* TODO: add a staffed process for station-directory corrections. */}
  </>;
}
