import assert from "node:assert/strict";
import test from "node:test";
import { formatStepTime, formatTravelTime, isRoutingOrigin, parseDrivingRoute, rankRoutedStations } from "../src/lib/station-routing.ts";

test("ranks reachable public stations by routed time, then road distance", () => {
  const stations = [{ id: "slow", point: [8, 124] }, { id: "near", point: [8, 124] }, { id: "unreachable", point: [8, 124] }, { id: "tie-long", point: [8, 124] }];
  const ranked = rankRoutedStations(stations, [600, 300, null, 300], [5000, 4000, null, 6000]);
  assert.deepEqual(ranked.map(({ station_id }) => station_id), ["near", "tie-long", "slow"]);
  assert.equal(ranked[0].duration_seconds, 300);
  assert.equal(ranked[0].distance_meters, 4000);
});

test("rejects missing or invalid route origins and missing table results", () => {
  assert.equal(isRoutingOrigin([8.228, 124.245]), true);
  assert.equal(isRoutingOrigin(null), false);
  assert.equal(isRoutingOrigin([91, 124]), false);
  assert.equal(isRoutingOrigin([8, Number.NaN]), false);
  assert.deepEqual(rankRoutedStations([{ id: "a", point: null }], null, null), []);
});

test("parses actual OSRM route geometry, estimated ETA, and readable turn instructions", () => {
  const route = parseDrivingRoute({ code: "Ok", routes: [{ distance: 1530, duration: 426, geometry: { coordinates: [[124.24, 8.22], [124.25, 8.23]] }, legs: [{ steps: [
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
});

test("treats provider failures and malformed routes as unavailable, not guessed estimates", () => {
  assert.equal(parseDrivingRoute({ code: "NoRoute", routes: [] }), null);
  assert.equal(parseDrivingRoute({ code: "Ok", routes: [{ distance: 120, duration: 10, geometry: { coordinates: [[124, 8]] } }] }), null);
  assert.equal(formatTravelTime(426), "7 min");
  assert.equal(formatTravelTime(3600), "1 hr");
  assert.equal(formatStepTime(0), "0 sec");
});
