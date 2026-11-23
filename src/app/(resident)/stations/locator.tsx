"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/app/glyph";
import type { SourcedField, Station } from "./directory";
import type { StationLocationPin } from "@/lib/station-locations";
import { isGeoPoint, rankNearby, type GeoPoint } from "@/lib/geospatial";
import { formatRouteDistance, formatStepTime, formatTravelTime, publicPinSourceLabel, travelModeLabel, type TravelMode, type TravelRoute, type RoutedStation } from "@/lib/station-routing";
import { resolveStationSelection, stationSelectionKey } from "@/lib/station-selection";
import StationMap from "./station-map";

type DirectoryFilter = "all" | "mapped" | "review";
type ModeRanking = { ranked: RoutedStation[]; error?: string; loading?: boolean; requested?: boolean };
type ModeRankings = Record<TravelMode, ModeRanking>;
type RouteState = TravelRoute & { stationId: string; mode: TravelMode };

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

export default function Locator({ stations, locations, initialLocationId = null }: { stations: readonly Station[]; locations: readonly StationLocationPin[]; initialLocationId?: string | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [choosingOrigin, setChoosingOrigin] = useState(false);
  const [shareConsent, setShareConsent] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("foot");
  const [selectedKey, setSelectedKey] = useState<string | null>(initialLocationId && locations.some(pin => pin.id === initialLocationId) ? stationSelectionKey("location", initialLocationId) : stations[0] ? stationSelectionKey("station", stations[0].id) : locations[0] ? stationSelectionKey("location", locations[0].id) : null);
  const [mobileView, setMobileView] = useState<"list" | "map">(initialLocationId ? "map" : "list");
  const [modeRankings, setModeRankings] = useState<ModeRankings>({ foot: { ranked: [] }, car: { ranked: [] } });
  const [route, setRoute] = useState<RouteState | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState("");
  const lastRequest = useRef(0);
  const rankingRequestId = useRef<Record<TravelMode, number>>({ foot: 0, car: 0 });
  const term = query.trim().toLowerCase();
  const filteredStations = stations.filter(station => {
    const searchText = [station.name.value, station.address.value, ...(station.phone.value ?? [])].filter(Boolean).join(" ").toLowerCase();
    return (!term || searchText.includes(term)) && (filter === "all" || (filter === "mapped" ? Boolean(station.coordinates.value) : needsLocationReview(station)));
  });
  const visibleLocations = locations.filter(pin => !term || `${pin.name} ${pin.station_name} ${pin.description}`.toLowerCase().includes(term));
  const rankedStations = modeRankings[travelMode].ranked;
  const rankedIds = new Map(rankedStations.map((entry, index) => [entry.station_id, index]));
  const stationDistances = new Map((position ? rankNearby(position, filteredStations, station => station.coordinates.value) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const results = position && rankedStations.length
    ? [...filteredStations].sort((a, b) => (rankedIds.get(a.id) ?? Infinity) - (rankedIds.get(b.id) ?? Infinity))
    : position ? [...filteredStations].sort((a, b) => (stationDistances.get(a.id) ?? Infinity) - (stationDistances.get(b.id) ?? Infinity)) : filteredStations;
  const locationDistances = new Map((position ? rankNearby(position, visibleLocations, pin => [pin.latitude, pin.longitude]) : []).map(({ entry, distanceKm }) => [entry.id, distanceKm] as const));
  const orderedLocations = position ? [...visibleLocations].sort((a, b) => (locationDistances.get(a.id) ?? Infinity) - (locationDistances.get(b.id) ?? Infinity)) : visibleLocations;
  const selection = resolveStationSelection(selectedKey, results, visibleLocations);
  const selectedLocation = selection.location;
  const selected = selection.station;
  const activeStation = selected ?? (selectedLocation || position ? null : results[0] ?? null);
  const activeKey = selectedLocation ? stationSelectionKey("location", selectedLocation.id) : activeStation ? stationSelectionKey("station", activeStation.id) : null;
  const nearestEntry = rankedStations[0];
  const nearestStation = nearestEntry && stations.find(station => station.id === nearestEntry.station_id);
  const nearestRoute = nearestEntry && nearestStation ? { station: nearestStation, result: nearestEntry } : null;
  const nearestWalking = nearestRoute && modeRankings.foot.ranked.find(entry => entry.station_id === nearestRoute.station.id);
  const nearestDriving = nearestRoute && modeRankings.car.ranked.find(entry => entry.station_id === nearestRoute.station.id);
  const displayedRoute = activeStation && route?.stationId === activeStation.id && route.mode === travelMode ? route : null;
  const pointCount = results.filter(station => station.kind === "station" && station.coordinates.value).length;

  function clearRankings() {
    rankingRequestId.current.foot++;
    rankingRequestId.current.car++;
    setModeRankings({ foot: { ranked: [] }, car: { ranked: [] } });
  }

  function select(key: string | null) {
    if (routing) return;
    setSelectedKey(key);
    const id = key?.startsWith("station:") ? key.slice("station:".length) : null;
    if (route && (route.stationId !== id || route.mode !== travelMode)) setRoute(null);
    setRouteError("");
    setMobileView("map");
    const station = id ? stations.find(item => item.id === id) : null;
    if (position && shareConsent && station?.kind === "station" && station.coordinates.value && station.coordinates.status === "sourced" && (route?.stationId !== id || route.mode !== travelMode)) void showRoute(station, travelMode);
  }

  function useOrigin(value: unknown) {
    if (!isGeoPoint(value)) {
      setMessage("We couldn’t read a valid map point. Choose a point on the map or try again.");
      return;
    }
    const point: GeoPoint = [value[0], value[1]];
    setPosition([point[0], point[1]]);
    setShareConsent(false);
    setChoosingOrigin(false);
    clearRankings();
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

  async function requestRoute(body: { mode: "nearest"; origin: [number, number]; station_ids: string[]; travel_mode: TravelMode } | { mode: "route"; origin: [number, number]; station_id: string; travel_mode: TravelMode }) {
    const delay = Math.max(0, 1100 - (Date.now() - lastRequest.current));
    if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
    lastRequest.current = Date.now();
    const response = await fetch("/api/station-routes", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
    });
    const result = await response.json() as { error?: string; ranking?: ModeRanking & { mode: TravelMode }; route?: TravelRoute };
    if (!response.ok) throw new Error(result.error ?? "The route could not be calculated.");
    return result;
  }

  function routeCandidates() {
    return filteredStations.filter(station => station.kind === "station" && station.coordinates.value && station.coordinates.status === "sourced");
  }

  async function loadRanking(mode: TravelMode, candidates: readonly Station[], origin: [number, number]): Promise<ModeRanking> {
    const requestId = ++rankingRequestId.current[mode];
    setModeRankings(current => ({ ...current, [mode]: { ...current[mode], loading: true, requested: true, error: undefined } }));
    try {
      const result = await requestRoute({ mode: "nearest", origin, station_ids: candidates.map(station => station.id), travel_mode: mode });
      const ranking = result.ranking?.mode === mode ? result.ranking : { ranked: [], error: `No ${travelModeLabel(mode)} results were returned.` };
      const ready = { ...ranking, loading: false, requested: true };
      if (rankingRequestId.current[mode] !== requestId) return { ranked: [], requested: false };
      setModeRankings(current => ({ ...current, [mode]: ready }));
      return ready;
    } catch (error) {
      const failed = { ranked: [], error: error instanceof Error ? error.message : `${travelModeLabel(mode)} routes are unavailable.`, loading: false, requested: true };
      if (rankingRequestId.current[mode] !== requestId) return { ranked: [], requested: false };
      setModeRankings(current => ({ ...current, [mode]: failed }));
      return failed;
    }
  }

  async function findNearest(mode: TravelMode = travelMode) {
    if (!position || !shareConsent) return;
    const candidates = routeCandidates();
    if (!candidates.length) return setMessage("No police station references with verified map pins match this view.");
    const origin: [number, number] = [position[0], position[1]];
    setRouting(true);
    setRoute(null);
    setRouteError("");
    clearRankings();
    let canLoadOtherMode = false;
    try {
      const ranking = await loadRanking(mode, candidates, origin);
      canLoadOtherMode = true;
      const nearest = ranking.ranked[0];
      if (!nearest) {
        setMessage(`No reachable ${travelModeLabel(mode)} station was returned. Try the other travel mode or change the starting point.`);
        setRouteError(ranking.error ?? "The route provider did not return a usable route.");
        return;
      }
      setTravelMode(mode);
      setSelectedKey(stationSelectionKey("station", nearest.station_id));
      setMobileView("map");
      const station = stations.find(candidate => candidate.id === nearest.station_id);
      setMessage(station ? `Nearest reachable station by estimated ${travelModeLabel(mode)} time: ${station.name.value}.` : "Nearest reachable station found.");
      if (station) {
        try {
          const details = await requestRoute({ mode: "route", origin, station_id: nearest.station_id, travel_mode: mode });
          if (!details.route) throw new Error(`The ${travelModeLabel(mode)} route service returned no path.`);
          setRoute({ ...details.route, stationId: nearest.station_id, mode });
        } catch (error) {
          setRouteError(`The travel time is available, but the map path and directions could not be loaded. ${error instanceof Error ? error.message : "Try again."}`);
        }
      }
    } finally {
      setRouting(false);
      const otherMode = mode === "foot" ? "car" : "foot";
      if (canLoadOtherMode) void loadRanking(otherMode, candidates, origin);
    }
  }

  async function showRoute(station: Station, mode: TravelMode) {
    if (!position || !shareConsent || !station.coordinates.value || station.coordinates.status !== "sourced") return;
    setRouting(true);
    setRouteError("");
    try {
      const candidates = routeCandidates();
      if (!modeRankings[mode].requested) await loadRanking(mode, candidates, position);
      const result = await requestRoute({ mode: "route", origin: position, station_id: station.id, travel_mode: mode });
      if (!result.route) throw new Error(`The route service returned no ${travelModeLabel(mode)} directions.`);
      setRoute({ ...result.route, stationId: station.id, mode });
      setMessage(`${travelModeLabel(mode)[0].toUpperCase()}${travelModeLabel(mode).slice(1)} route shown to ${station.name.value}.`);
    } catch (error) {
      setRoute(null);
      setRouteError(error instanceof Error ? error.message : `A ${travelModeLabel(mode)} route is unavailable right now.`);
    } finally {
      setRouting(false);
      const otherMode = mode === "foot" ? "car" : "foot";
      if (position && !modeRankings[otherMode].requested) void loadRanking(otherMode, routeCandidates(), position);
    }
  }

  function changeTravelMode(mode: TravelMode) {
    if (routing || mode === travelMode) return;
    setTravelMode(mode);
    setRoute(null);
    setRouteError("");
    if (modeRankings[mode].loading) {
      setMessage(`Calculating ${travelModeLabel(mode)} times…`);
      return;
    }
    if (!modeRankings[mode].requested) {
      void findNearest(mode);
      return;
    }
    const nearest = modeRankings[mode].ranked[0];
    const station = nearest && stations.find(item => item.id === nearest.station_id);
    if (!station) {
      setMessage(modeRankings[mode].error ?? `No reachable ${travelModeLabel(mode)} route is available for these references.`);
      return;
    }
    setSelectedKey(stationSelectionKey("station", station.id));
    setMobileView("map");
    if (position && shareConsent) void showRoute(station, mode);
  }

  return <>
    <section className="station-search panel" aria-label="Search station directory">
      <div className="station-search-row">
        <label>Search stations<input type="search" value={query} disabled={routing} onChange={event => { setQuery(event.target.value); clearRankings(); setRoute(null); }} placeholder="Station name or area"/></label>
        <details className="station-filter-menu"><summary>Filters{filter !== "all" && <span>1 on</span>}</summary><label>Listings<select value={filter} disabled={routing} onChange={event => { setFilter(event.target.value as DirectoryFilter); clearRankings(); setRoute(null); }}><option value="all">All public listings</option><option value="mapped">With sourced map pin</option><option value="review">Needs location verification</option></select></label></details>
        <div className="station-origin-actions"><button className="button secondary" type="button" onClick={locate} disabled={routing}><Icon name="pin" size={18}/> Use my location</button><button className="button secondary" type="button" aria-pressed={choosingOrigin} disabled={routing} onClick={() => { setChoosingOrigin(value => !value); setMobileView("map"); setMessage(choosingOrigin ? "Map pick cancelled." : "Tap the map to choose your starting point."); }}>{choosingOrigin ? "Cancel map pick" : "Choose on map"}</button>{position && <button className="text-link" type="button" disabled={routing} onClick={() => { setPosition(null); setShareConsent(false); clearRankings(); setRoute(null); setChoosingOrigin(false); setRouteError(""); setMessage("Starting point cleared."); }}>Clear point</button>}</div>
      </div>
      <p className="muted mt-3 text-sm" role="status">{message || `${results.length} public listings · ${pointCount} sourced station pins · ${visibleLocations.length} ${publicPinSourceLabel.toLowerCase()}s`}</p>
      {position && <div className="station-routing-consent">
        <div><p className="eyebrow">PLAN A ROUTE</p><p>Your starting point and public station pins will be sent to FOSSGIS to calculate walking and driving routes. FOSSGIS logs route requests. FindIT keeps your starting point in this browser and does not save it to Supabase.</p><details className="route-policy-details"><summary>About estimates and location sharing</summary><p>Routes use OpenStreetMap data, have no live traffic, and may be unavailable. FOSSGIS is a community service with usage limits. <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">Read its privacy and usage policy</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap attribution</a>.</p></details><label className="station-consent-check"><input type="checkbox" checked={shareConsent} disabled={routing} onChange={event => { setShareConsent(event.target.checked); if (!event.target.checked) { clearRankings(); setRoute(null); setRouteError(""); } }}/><span>I agree to share this starting point for route calculation.</span></label></div>
        <button className="button" type="button" disabled={!shareConsent || routing || modeRankings.foot.loading || modeRankings.car.loading} onClick={() => void findNearest()}>{routing || modeRankings.foot.loading || modeRankings.car.loading ? "Calculating estimates…" : modeRankings.foot.requested && modeRankings.car.requested ? "Refresh travel times" : "Find nearest station"}</button>
      </div>}
      {position && (modeRankings.foot.ranked.length > 0 || modeRankings.car.ranked.length > 0) && <div className="walking-results" aria-label={`Stations ranked by ${travelModeLabel(travelMode)} time`}>
        <div className="travel-mode-switch" role="group" aria-label="Choose route mode and station ranking">
          {(["foot", "car"] as const).map(mode => { const isSelected = mode === travelMode; const state = modeRankings[mode].loading ? "Calculating…" : isSelected ? "Nearest by time" : modeRankings[mode].requested ? "Switch ranking" : "Find nearest"; return <button type="button" key={mode} aria-pressed={isSelected} aria-label={`Rank stations by ${travelModeLabel(mode)} time`} onClick={() => changeTravelMode(mode)} disabled={routing || modeRankings[mode].loading}><span>{mode === "foot" ? "Walking" : "Driving"}</span><strong>{state}</strong></button>; })}
        </div>
        {nearestRoute && <><div className="nearby-result"><div><p className="eyebrow">NEAREST REACHABLE · SHORTEST {travelModeLabel(travelMode).toUpperCase()} TIME</p><strong>{nearestRoute.station.name.value}</strong><span className="station-time-pair"><span>Walk {nearestWalking ? formatTravelTime(nearestWalking.duration_seconds) : modeRankings.foot.loading ? "calculating…" : modeRankings.foot.requested ? "unavailable" : "not checked"}</span><i aria-hidden="true">·</i><span>Drive {nearestDriving ? formatTravelTime(nearestDriving.duration_seconds) : modeRankings.car.loading ? "calculating…" : modeRankings.car.requested ? "unavailable" : "not checked"}</span></span><small>Ranked by estimated {travelModeLabel(travelMode)} time. Estimates may not include live traffic.</small></div><span className="walking-rank-badge">01 · NEAREST</span></div>
        {rankedStations.length > 1 && <details className="walking-alternatives"><summary>Other reachable stations ({rankedStations.length - 1})</summary><ul>{rankedStations.slice(1, 4).map((item, index) => {
          const station = stations.find(candidate => candidate.id === item.station_id);
          if (!station) return null;
          const key = stationSelectionKey("station", station.id), active = activeKey === key;
          return <li key={station.id}><button type="button" className={`walking-alternative${active ? " is-selected" : ""}`} aria-pressed={active} onClick={() => select(key)} disabled={routing}><span className="walking-alternative-number">{String(index + 2).padStart(2, "0")}</span><span><strong>{station.name.value}</strong><small>{formatTravelTime(item.duration_seconds)} {travelModeLabel(travelMode)} · {formatRouteDistance(item.distance_meters)}</small></span><span className="walking-alternative-action">{active ? "Selected" : "Select"}</span></button></li>;
        })}</ul></details>}
        </>}
      </div>}
      {position && !nearestRoute && modeRankings.foot.ranked.length === 0 && modeRankings.car.ranked.length === 0 && <p className="station-empty mt-3">{shareConsent ? "Choose Find nearest station to compare walking and driving routes. Straight-line distance remains separate." : "Review the location-sharing note, then agree before requesting routes."}</p>}
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
          const routed = modeRankings[travelMode].ranked.find(entry => entry.station_id === station.id);
          const straight = stationDistances.get(station.id);
          return <li key={station.id}>
            <button className={`station-option${active ? " is-selected" : ""}`} type="button" aria-pressed={active} aria-label={`Select ${station.name.value} on map`} onClick={() => select(key)}>
              <span className="station-option-top"><span className="station-number">{String(index + 1).padStart(2, "0")}</span><span className="station-type">{station.kind === "headquarters" ? "City headquarters" : "Police station"}</span><span className={`station-status${station.address.status === "conflict" ? " has-conflict" : ""}`}>{state}</span></span>
              <strong>{station.name.value}</strong><span className="station-address">{address}</span>
              <span className="station-address">{station.phone.value?.[0] ?? missingLabel(station.phone, "Phone")}</span>
              {routed && <span className="station-distance">{formatTravelTime(routed.duration_seconds)} {travelModeLabel(travelMode)} · {formatRouteDistance(routed.distance_meters)} by route</span>}
              {position && straight !== undefined && <span className="station-address">{straight.toFixed(1)} km straight-line distance</span>}
              {position && rankedStations.length > 0 && !routed && station.kind === "station" && station.coordinates.value && station.coordinates.status === "sourced" && <span className="station-address">No {travelModeLabel(travelMode)} route returned</span>}
              <span className="station-open">{active ? "Selected details" : "View station"}<Icon name="arrow" size={16}/></span>
            </button>
          </li>;
        })}</ul> : <p className="station-empty">No station listings match. Try a shorter search or another filter.</p>}
        {orderedLocations.length > 0 && <ul className="station-pin-list"><li><h3>Public map references</h3></li>{orderedLocations.map(pin => {
          const key = stationSelectionKey("location", pin.id), active = activeKey === key;
          return <li key={pin.id}><button type="button" className={`station-pin-option${active ? " is-selected" : ""}`} aria-pressed={active} onClick={() => select(key)}><strong>{pin.name}</strong><span>{pin.station_name} · {publicPinSourceLabel}</span><small>{pin.description}</small></button></li>;
        })}</ul>}
      </section>

      <section id="station-map" className={`station-map-pane${mobileView === "map" ? " is-mobile-active" : ""}`} aria-label="Selected station and map" tabIndex={-1}>
        <div className="station-map-heading"><div><p className="eyebrow">INTERACTIVE STATION MAP</p><h2>{selectedLocation?.name ?? activeStation?.name.value ?? "Station map"}</h2><p>{selectedLocation ? selectedLocation.station_name : activeStation?.address.value ?? (activeStation ? missingLabel(activeStation.address, "Address") : "Search the list to find public station information.")}</p></div><span className={`map-pin-status${selectedLocation || activeStation?.coordinates.value ? " is-pinned" : ""}`}><i/>{selectedLocation ? publicPinSourceLabel : activeStation?.coordinates.value ? "Sourced map pin" : activeStation ? missingLabel(activeStation.coordinates, "Map pin") : "No selected location"}</span></div>
        <div className={`station-map-frame${choosingOrigin ? " is-picking" : ""}`}><StationMap stations={results} locations={locations} selectedKey={activeKey} selectedCoordinates={position} selectedCoordinatesLabel="Your starting point" routeCoordinates={displayedRoute?.coordinates ?? null} pickMode={choosingOrigin} active={mobileView === "map"} onSelect={select} onPickCoordinate={useOrigin}/></div>
        <ul className="map-legend" aria-label="Map key">
          <li><span className="legend-dot legend-station"/>Police station reference</li>
          <li><span className="legend-dot legend-public"/>Public map reference</li>
          <li><span className="legend-dot legend-start"/>Your starting point</li>
        </ul>
        {selectedLocation && <div className="station-selected-details">
          <div className="station-details-title"><div><p className="eyebrow">{publicPinSourceLabel.toUpperCase()}</p><h3>{selectedLocation.name}</h3></div><span>Not independently verified</span></div>
          <dl className="station-details-grid"><div className="station-detail-row"><dt>Station reference</dt><dd>{selectedLocation.station_name}</dd></div><div className="station-detail-row"><dt>Public description</dt><dd>{selectedLocation.description}</dd></div><div className="station-detail-row"><dt>Visit instructions</dt><dd>{selectedLocation.visit_instructions}</dd></div></dl>
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
            <button className="button secondary" type="button" disabled={!position || !shareConsent || !activeStation.coordinates.value || activeStation.coordinates.status !== "sourced" || routing} onClick={() => void showRoute(activeStation, travelMode)}>{routing ? "Loading route…" : displayedRoute ? `Refresh ${travelModeLabel(travelMode)} route` : `Show ${travelModeLabel(travelMode)} route`}</button>
            <Link className="button" href={`/report/lost?station=${encodeURIComponent(activeStation.id)}`}>Report lost item</Link>
            {!position && <p className="report-hint">Choose a starting point to compare walking and driving routes.</p>}
          </div>}
          {displayedRoute && <section className="station-route-summary" aria-label={`${travelModeLabel(travelMode)} directions`}>
            <div className="station-route-metrics"><div><span>{travelMode === "foot" ? "Walking" : "Driving"} route distance</span><strong>{formatRouteDistance(displayedRoute.distance_meters)}</strong></div><span>Map estimate · no live traffic</span></div>
            <h4>{travelMode === "foot" ? "Walking directions" : "Driving directions"}</h4>
            {displayedRoute.steps.length ? <ol className="station-directions">{displayedRoute.steps.map((step, index) => <li key={`${index}-${step.instruction}`}><span className="station-direction-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{step.instruction}</strong><small>{formatRouteDistance(step.distance_meters)} · about {formatStepTime(step.duration_seconds)}</small></div></li>)}</ol> : <p className="report-hint">Step details were not returned for this route.</p>}
          </section>}
        </div>}
        <p className="station-directory-note">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · routes by <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">FOSSGIS</a></p>
      </section>
    </div>
    {/* TODO: add a staffed process for station-directory corrections. */}
  </>;
}
