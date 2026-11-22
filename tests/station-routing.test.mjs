import assert from "node:assert/strict";
import test from "node:test";
import { formatRouteDistance, formatStepTime, formatTravelTime, isEligibleRouteStation, isRoutingOrigin, isTrustedRouteOrigin, parseTravelRoute, publicPinSourceLabel, rankRoutedStations, travelEndpoint, travelModeLabel } from "../src/lib/station-routing.ts";

test("ranks each travel mode by its routed time, then route distance", () => {
  const stations = [{ id: "slow", point: [8, 124] }, { id: "near", point: [8, 124] }, { id: "unreachable", point: [8, 124] }, { id: "tie-long", point: [8, 124] }];
  const walking = rankRoutedStations(stations, [600, 300, null, 300], [5000, 4000, null, 6000]);
  const driving = rankRoutedStations(stations, [180, 240, null, 120], [6000, 5000, null, 2500]);
  assert.deepEqual(walking.map(({ station_id }) => station_id), ["near", "tie-long", "slow"]);
  assert.deepEqual(driving.map(({ station_id }) => station_id), ["tie-long", "slow", "near"]);
  assert.equal(walking[0].duration_seconds, 300);
  assert.equal(walking[0].distance_meters, 4000);
  assert.deepEqual(rankRoutedStations(stations, null, null), []);
});

test("rejects missing or invalid route origins and missing table results", () => {
  assert.equal(isRoutingOrigin([8.228, 124.245]), true);
  assert.equal(isRoutingOrigin(null), false);
  assert.equal(isRoutingOrigin([91, 124]), false);
  assert.equal(isRoutingOrigin([8, Number.NaN]), false);
  assert.deepEqual(rankRoutedStations([{ id: "a", point: null }], null, null), []);
});

test("uses distinct FOSSGIS foot and car profiles for route and nearest-time requests", () => {
  const coordinates = "124.2,8.2;124.3,8.3";
  const routeUrl = travelEndpoint("foot", "route", coordinates);
  const tableUrl = travelEndpoint("foot", "table", coordinates);
  const driveUrl = travelEndpoint("car", "route", coordinates);
  const driveTableUrl = travelEndpoint("car", "table", coordinates);
  assert.equal(routeUrl.hostname, "routing.openstreetmap.de");
  assert.equal(routeUrl.pathname, "/routed-foot/route/v1/foot/124.2,8.2;124.3,8.3");
  assert.equal(tableUrl.pathname, "/routed-foot/table/v1/foot/124.2,8.2;124.3,8.3");
  assert.equal(driveUrl.pathname, "/routed-car/route/v1/driving/124.2,8.2;124.3,8.3");
  assert.equal(driveTableUrl.pathname, "/routed-car/table/v1/driving/124.2,8.2;124.3,8.3");
  assert.equal(travelModeLabel("foot"), "walking");
  assert.equal(travelModeLabel("car"), "driving");
});

test("accepts same-origin route requests and only the configured Codespaces localhost preview exception", () => {
  const host = "fearful-hobgoblin-3000.app.github.dev";
  assert.equal(isTrustedRouteOrigin("https://find-it.example/stations", ["find-it.example"], undefined, host), true);
  assert.equal(isTrustedRouteOrigin("http://localhost:3000", [host], host, host), true);
  assert.equal(isTrustedRouteOrigin("http://localhost:3000", [host], "other-3000.app.github.dev", host), false);
  assert.equal(isTrustedRouteOrigin("http://localhost:3000", [host], host, undefined), false);
  assert.equal(isTrustedRouteOrigin("https://evil.example", [host], host, host), false);
  assert.equal(isTrustedRouteOrigin(null, [host], host, host), false);
});

test("routes only police station references with sourced coordinates", () => {
  const sourced = { type: "public_reference_police_station", latitude: 8.2, longitude: 124.2, source_notes: { fields: { coordinates: { status: "sourced" } } } };
  assert.equal(isEligibleRouteStation(sourced), true);
  assert.equal(isEligibleRouteStation({ ...sourced, type: "public_reference_headquarters" }), false);
  assert.equal(isEligibleRouteStation({ ...sourced, latitude: null }), false);
  assert.equal(isEligibleRouteStation({ ...sourced, source_notes: { fields: { coordinates: { status: "conflict" } } } }), false);
  assert.equal(isEligibleRouteStation({ ...sourced, source_notes: null }), false);
});

test("parses FOSSGIS route geometry, travel ETA, and readable turn instructions", () => {
  const route = parseTravelRoute({ code: "Ok", routes: [{ distance: 1530, duration: 426, geometry: { coordinates: [[124.24, 8.22], [124.25, 8.23]] }, legs: [{ steps: [
    { distance: 800, duration: 220, name: "Rizal Street", maneuver: { type: "depart" } },
    { distance: 730, duration: 206, name: "Quezon Avenue", maneuver: { type: "turn", modifier: "left" } },
    { distance: 0, duration: 0, name: "", maneuver: { type: "arrive" } },
  ] }] }] });
  assert.deepEqual(route.coordinates, [[8.22, 124.24], [8.23, 124.25]]);
  assert.equal(route.distance_meters, 1530);
  assert.equal(route.duration_seconds, 426);
  assert.equal(route.steps[0].instruction, "Start on Rizal Street");
  assert.equal(route.steps[1].instruction, "Turn left onto Quezon Avenue");
  assert.equal(route.steps[2].instruction, "Arrive at the destination");
  assert.equal(Object.hasOwn(route, "origin"), false);
  assert.equal(formatTravelTime(route.duration_seconds), "7 min");
  assert.equal(formatRouteDistance(route.distance_meters), "1.5 km");
});

test("treats provider failures and malformed routes as unavailable, not guessed estimates", () => {
  assert.equal(parseTravelRoute({ code: "NoRoute", routes: [] }), null);
  assert.equal(parseTravelRoute({ code: "Ok", routes: [{ distance: 120, duration: 10, geometry: { coordinates: [[124, 8]] } }] }), null);
  assert.equal(formatTravelTime(426), "7 min");
  assert.equal(formatTravelTime(3600), "1 hr");
  assert.equal(formatRouteDistance(540), "540 m");
  assert.equal(formatStepTime(0), "0 sec");
});

test("keeps location pins neutral unless police provenance is verified", () => {
  assert.equal(publicPinSourceLabel, "Unverified location reference");
});
