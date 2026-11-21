import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, isGeoPoint, rankNearby } from "../src/lib/geospatial.ts";

test("validates complete latitude/longitude pairs", () => {
  assert.equal(isGeoPoint([8.228, 124.245]), true);
  assert.equal(isGeoPoint(null), false);
  assert.equal(isGeoPoint([8.228]), false);
  assert.equal(isGeoPoint([91, 124]), false);
  assert.equal(isGeoPoint([8, Number.NaN]), false);
});

test("calculates straight-line distance in kilometers", () => {
  assert.ok(Math.abs(distanceKm([0, 0], [0, 1]) - 111.195) < 0.01);
  assert.equal(distanceKm([8, 124], null), null);
});

test("ranks eligible public map results nearest first and skips missing pins", () => {
  const candidates = [
    { name: "Far", point: [8.3, 124.3] },
    { name: "No verified pin", point: null },
    { name: "Near", point: [8.229, 124.246] },
  ];
  assert.deepEqual(rankNearby([8.228, 124.245], candidates, place => place.point).map(({ entry }) => entry.name), ["Near", "Far"]);
});

test("does not report a nearest result for an invalid or missing origin", () => {
  const candidates = [{ point: [8.229, 124.246] }];
  assert.deepEqual(rankNearby(null, candidates, place => place.point), []);
  assert.deepEqual(rankNearby([91, 124], candidates, place => place.point), []);
});
