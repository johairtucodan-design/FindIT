"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/app/glyph";
import type { SourcedField, Station } from "./directory";
import type { StationLocationPin } from "@/lib/station-locations";
import { isGeoPoint, rankNearby, type GeoPoint } from "@/lib/geospatial";
import { formatStepTime, formatTravelTime, type DrivingRoute, type RoutedStation } from "@/lib/station-routing";
import { resolveStationSelection, stationSelectionKey } from "@/lib/station-selection";
import StationMap from "./station-map";

type DirectoryFilter = "all" | "mapped" | "review";
type RouteState = DrivingRoute & { stationId: string };

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

function routeDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export default function Locator({ stations, locations }: { stations: readonly Station[]; locations: readonly StationLocationPin[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [choosingOrigin, setChoosingOrigin] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(stations[0] ? stationSelectionKey("station", stations[0].id) : locations[0] ? stationSelectionKey("location", locations[0].id) : null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [routedStations, setRoutedStations] = useState<RoutedStation[]>([]);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState("");
  const lastRequest = useRef(0);
  const term = query.trim().toLowerCase();
  const filteredStations = stations.filter(station => {
    const searchText = [station.name.value, station.address.value, ...(station.phone.value ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!term || searchText.includes(term)) && (filter === "all" || (filter === "mapped" ? Boolean(station.coordinates.value) : needsLocationReview(station)));
  });
  const visibleLocations = locations.filter(pin => !term || `${pin.name} ${pin.station_name} ${pin.description}`.toLowerCase().includes(term));
  const rankedIds = new Map(routedStations.map((entry, index) => [entry.station_id, index]));
  const stationDistances = new Map((position ? rankNearby(position, filteredStations, station => station.coordinates.value) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const results = position && routedStations.length
    ? [...filteredStations].sort((a, b) => (rankedIds.get(a.id) ?? Infinity) - (rankedIds.get(b.id) ?? Infinity))
    : position ? [...filteredStations].sort((a, b) => (stationDistances.get(a.id) ?? Infinity) - (stationDistances.get(b.id) ?? Infinity)) : filteredStations;
  const locationDistances = new Map((position ? rankNearby(position, visibleLocations, pin => [pin.latitude, pin.longitude]) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const orderedLocations = position ? [...visibleLocations].sort((a, b) => (locationDistances.get(a.id) ?? Infinity) - (locationDistances.get(b.id) ?? Infinity)) : visibleLocations;
  const selection = resolveStationSelection(selectedKey, results, visibleLocations);
  const selectedLocation = selection.location;
  const selected = selection.station;
  const activeStation = selected ?? (selectedLocation || position ? null : results[0] ?? null);
  const activeKey = selectedLocation ? stationSelectionKey("location", selectedLocation.id) : activeStation ? stationSelectionKey("station", activeStation.id) : null;
  const nearestRoute = results.map(station => ({ station, result: routedStations.find(entry => entry.station_id === station.id) })).find(entry => entry.result);
  const displayedRoute = activeStation && route?.stationId === activeStation.id ? route : null;
  const pointCount = results.filter(station => station.kind === "station" && station.coordinates.value).length;

  function select(key: string | null) {
    setSelectedKey(key);
    const id = key?.startsWith("station:") ? key.slice("station:".length) : null;
    if (route && route.stationId !== id) setRoute(null);
    setRouteError("");
    setMobileView("map");
  }

  function useOrigin(value: unknown) {
    if (!isGeoPoint(value)) {
      setMessage("We couldn’t read a valid map point. Choose a point on the map or try again.");
      return;
    }
    const point: GeoPoint = [value[0], value[1]];
    setPosition([point[0], point[1]]);
    setChoosingOrigin(false);
    setRoutedStations([]);
    setRoute(null);
    setRouteError("");
    setMessage("Starting point set. It stays in this browser until you request a route.");
    setMobileView("map");
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Location sharing isn’t available here. Choose a starting point on the map instead.");
    setMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      useOrigin([coords.latitude, coords.longitude]);
    }, () => setMessage("Location was denied or unavailable. Choose a starting point on the map instead."), { timeout: 10000 });
  }

  async function requestRoute(body: { mode: "nearest"; origin: [number, number]; station_ids: string[] } | { mode: "route"; origin: [number, number]; station_id: string }) {
    const delay = Math.max(0, 1100 - (Date.now() - lastRequest.current));
    if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
    lastRequest.current = Date.now();
    const response = await fetch("/api/station-routes", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    const result = await response.json() as { error?: string; ranked?: RoutedStation[]; route?: DrivingRoute };
    if (!response.ok) throw new Error(result.error ?? "The route could not be calculated.");
    return result;
  }

  async function findNearest() {
    if (!position) return;
    const candidates = filteredStations.filter(station => station.kind === "station" && station.coordinates.value);
    if (!candidates.length) return setMessage("No police station references with sourced map pins match this view.");
    setRouting(true);
    setRoute(null);
    setRouteError("");
    try {
      const result = await requestRoute({ mode: "nearest", origin: position, station_ids: candidates.map(station => station.id) });
      const ranked = result.ranked ?? [];
      setRoutedStations(ranked);
      const nearest = ranked[0];
      if (!nearest) {
        setMessage("The route service could not find a reachable station with the current map data.");
        return;
      }
      setSelectedKey(stationSelectionKey("station", nearest.station_id));
      setMobileView("map");
      const nearestStation = stations.find(station => station.id === nearest.station_id);
      setMessage(nearestStation ? `Nearest reachable by estimated driving time: ${nearestStation.name.value}.` : "Nearest reachable station found.");
    } catch (error) {
      setRoutedStations([]);
      setRouteError(error instanceof Error ? error.message : "The route could not be calculated.");
    } finally { setRouting(false); }
  }

  async function showRoute(station: Station) {
    if (!position || !station.coordinates.value) return;
    setRouting(true);
    setRouteError("");
    try {
      const result = await requestRoute({ mode: "route", origin: position, station_id: station.id });
      if (!result.route) throw new Error("The route service returned no driving directions.");
      setRoute({ ...result.route, stationId: station.id });
    } catch (error) {
      setRoute(null);
      setRouteError(error instanceof Error ? error.message : "A driving route is unavailable right now.");
    } finally { setRouting(false); }
  }

  return <>
    <section className="station-search panel" aria-label="Search station directory">
      <div className="station-search-row">
        <label>Search stations<input type="search" value={query} onChange={event => { setQuery(event.target.value); setRoutedStations([]); setRoute(null); }} placeholder="Station name, area, or phone"/></label>
        <label>Show<select value={filter} onChange={event => { setFilter(event.target.value as DirectoryFilter); setRoutedStations([]); setRoute(null); }}><option value="all">All public listings</option><option value="mapped">With sourced map pin</option><option value="review">Needs location verification</option></select></label>
        <div className="station-origin-actions"><button className="button secondary" type="button" onClick={locate}><Icon name="pin" size={18}/> Use my location</button><button className="button secondary" type="button" aria-pressed={choosingOrigin} onClick={() => { setChoosingOrigin(value => !value); setMobileView("map"); setMessage(choosingOrigin ? "Map selection cancelled." : "Tap the map to choose a starting point, then adjust the orange marker."); }}>{choosingOrigin ? "Cancel map pick" : "Choose on map"}</button>{position && <button className="text-link" type="button" onClick={() => { setPosition(null); setRoutedStations([]); setRoute(null); setChoosingOrigin(false); setRouteError(""); setMessage("Starting point cleared."); }}>Clear point</button>}</div>
      </div>
      <p className="muted mt-3 text-sm" role="status">{message || `${results.length} public listings · ${pointCount} sourced station pins · ${visibleLocations.length} staff-published map pins`}</p>
      {position && <div className="station-routing-consent">
        <div><p className="eyebrow">ROUTE PRIVACY</p><p>When you request directions, your starting point is sent to the community OSRM route service to calculate a driving route. FindIT does not save it. This low-volume service is best-effort, limited to one request per second, and does not use live traffic.</p><a href="https://project-osrm.org/docs/v26.6.1/http" target="_blank" rel="noreferrer">About OSRM routing and data</a></div>
        <button className="button" type="button" disabled={routing} onClick={findNearest}>{routing ? "Finding routes…" : "Find nearest by driving time"}</button>
      </div>}
      {position && nearestRoute && <div className="nearby-result"><div><p className="eyebrow">NEAREST REACHABLE STATION · BY ESTIMATED DRIVE TIME</p><strong>{nearestRoute.station.name.value}</strong><span>{formatTravelTime(nearestRoute.result!.duration_seconds)} · {routeDistance(nearestRoute.result!.distance_meters)} road route · estimates can change</span></div><button className="button secondary" type="button" onClick={() => { select(stationSelectionKey("station", nearestRoute.station.id)); void showRoute(nearestRoute.station); }} disabled={routing}>Show route</button></div>}
      {position && !nearestRoute && routedStations.length === 0 && <p className="station-empty mt-3">Choose a starting point, then find a reachable station using routed driving time. Straight-line distance is shown separately.</p>}
      {routeError && <p className="error mt-3" role="alert">{routeError}</p>}
      {choosingOrigin && <p className="station-map-pick-hint" role="note">Tap the map to place the starting point. Drag the orange marker to fine-tune it. It will not be sent anywhere until you request a route.</p>}
    </section>

    <div className="station-view-toggle" role="group" aria-label="Station directory view">
      <button type="button" aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>Station list</button>
      <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>Map and details</button>
    </div>

    <div className="station-explorer">
      <section className={`station-list-pane${mobileView === "list" ? " is-mobile-active" : ""}`} aria-label="Station listings">
        <div className="station-list-heading"><div><p className="eyebrow">PUBLIC REFERENCES · ILIGAN CITY</p><h2>{results.length} listings</h2></div><span className="station-live"><i/>{pointCount} station pins</span></div>
        {results.length ? <ul className="station-list">{results.map((station, index) => {
          const key = stationSelectionKey("station", station.id), active = key === activeKey;
          const address = station.address.value ?? missingLabel(station.address, "Address");
          const state = station.address.status === "conflict" ? "Sources conflict" : station.coordinates.value ? "Map pin sourced" : "No exact pin";
          const routed = routedStations.find(entry => entry.station_id === station.id);
          const straight = stationDistances.get(station.id);
          return <li key={station.id}>
            <button className={`station-option${active ? " is-selected" : ""}`} type="button" aria-pressed={active} aria-label={`Select ${station.name.value} on map`} onClick={() => select(key)}>
              <span className="station-option-top"><span className="station-number">{String(index + 1).padStart(2, "0")}</span><span className="station-type">{station.kind === "headquarters" ? "City headquarters" : "Police station"}</span><span className={`station-status${station.address.status === "conflict" ? " has-conflict" : ""}`}>{state}</span></span>
              <strong>{station.name.value}</strong><span className="station-address">{address}</span>
              <span className="station-address">{station.phone.value?.[0] ?? missingLabel(station.phone, "Phone")}</span>
              {routed && <span className="station-distance">{formatTravelTime(routed.duration_seconds)} drive · {routeDistance(routed.distance_meters)} by road</span>}
              {position && straight !== undefined && <span className="station-address">{straight.toFixed(1)} km straight-line distance</span>}
              {position && routedStations.length > 0 && !routed && station.kind === "station" && station.coordinates.value && <span className="station-address">No reachable driving route returned</span>}
              <span className="station-open">{active ? "Selected details" : "View station"}<Icon name="arrow" size={16}/></span>
            </button>
          </li>;
        })}</ul> : <p className="station-empty">No station listings match. Try a shorter search or another filter.</p>}
        {orderedLocations.length > 0 && <ul className="station-pin-list"><li><h3>Staff-published map references</h3><p className="muted text-xs">These pins are not reviewed or station-approved handover locations.</p></li>{orderedLocations.map(pin => {
          const key = stationSelectionKey("location", pin.id), active = activeKey === key;
          return <li key={pin.id}><button type="button" className={`station-pin-option${active ? " is-selected" : ""}`} aria-pressed={active} onClick={() => select(key)}><strong>{pin.name}</strong><span>{pin.station_name} · Staff-published reference</span><small>{pin.description}</small></button></li>;
        })}</ul>}
      </section>

      <section className={`station-map-pane${mobileView === "map" ? " is-mobile-active" : ""}`} aria-label="Selected station and map">
        <div className="station-map-heading"><div><p className="eyebrow">INTERACTIVE STATION MAP</p><h2>{selectedLocation?.name ?? activeStation?.name.value ?? "Station map"}</h2><p>{selectedLocation ? selectedLocation.station_name : activeStation?.address.value ?? (activeStation ? missingLabel(activeStation.address, "Address") : "Search the list to find public station information.")}</p></div><span className={`map-pin-status${selectedLocation || activeStation?.coordinates.value ? " is-pinned" : ""}`}><i/>{selectedLocation ? "Staff-published reference" : activeStation?.coordinates.value ? "Sourced map pin" : activeStation ? missingLabel(activeStation.coordinates, "Map pin") : "No selected location"}</span></div>
        <div className={`station-map-frame${choosingOrigin ? " is-picking" : ""}`}><StationMap stations={results} locations={locations} selectedKey={activeKey} selectedCoordinates={position} selectedCoordinatesLabel="Your starting point" routeCoordinates={displayedRoute?.coordinates ?? null} pickMode={choosingOrigin} active={mobileView === "map"} onSelect={select} onPickCoordinate={useOrigin}/></div>
        {selectedLocation && <div className="station-selected-details">
          <div className="station-details-title"><div><p className="eyebrow">STAFF-PUBLISHED REFERENCE</p><h3>{selectedLocation.name}</h3></div><span>Not station-approved</span></div>
          <dl className="station-details-grid"><div className="station-detail-row"><dt>Station reference</dt><dd>{selectedLocation.station_name}</dd></div><div className="station-detail-row"><dt>Public description</dt><dd>{selectedLocation.description}</dd></div><div className="station-detail-row"><dt>Visit instructions</dt><dd>{selectedLocation.visit_instructions}</dd></div></dl>
          <p className="station-pin-disclaimer">Staff publication makes this reference visible on FindIT. It does not confirm station permission, police partnership, item acceptance, or custody. Confirm details with the station before visiting.</p>
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
          {activeStation.kind === "station" && <div className="station-actions">
            <button className="button secondary" type="button" disabled={!position || !activeStation.coordinates.value || routing} onClick={() => void showRoute(activeStation)}>{routing ? "Loading directions…" : displayedRoute ? "Refresh driving route" : "Show driving route"}</button>
            <Link className="button" href={`/report/lost?station=${encodeURIComponent(activeStation.id)}`}>Report a lost item</Link>
            <p className="station-reference-note">The station choice is saved as your preferred public reference only. It does not send your report to the station or confirm an agreement to receive items.</p>
            {!position && <p className="report-hint">Set a starting point above to get driving directions.</p>}
          </div>}
          {displayedRoute && <section className="station-route-summary" aria-label="Driving directions">
            <div className="station-route-metrics"><div><span>Estimated drive</span><strong>{formatTravelTime(displayedRoute.duration_seconds)}</strong></div><div><span>Road distance</span><strong>{routeDistance(displayedRoute.distance_meters)}</strong></div><span>By estimated driving time · no live traffic</span></div>
            <h4>Driving directions</h4>
            {displayedRoute.steps.length ? <ol className="station-directions">{displayedRoute.steps.map((step, index) => <li key={`${index}-${step.instruction}`}><span className="station-direction-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{step.instruction}</strong><small>{routeDistance(step.distance_meters)} · about {formatStepTime(step.duration_seconds)}</small></div></li>)}</ol> : <p className="report-hint">Step details were not returned for this route.</p>}
          </section>}
        </div>}
        <p className="station-directory-note">Public references only; FindIT has no confirmed police partners or authorized handover points. Confirm details with the station before visiting. Never share a precise lost-item location on this map. Map and route data © OpenStreetMap contributors · routes by OSRM.</p>
      </section>
    </div>
    {/* TODO: add a staffed process for station-directory corrections. */}
  </>;
}
