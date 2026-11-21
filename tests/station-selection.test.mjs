import assert from "node:assert/strict";
import test from "node:test";
import { afterAuthReportPath, resolveStationSelection, stationSelectionKey } from "../src/lib/station-selection.ts";

const station = { id: "station-id", name: { value: "Station 2" } };
const location = { id: "pin-id", name: "Reference pin" };

test("the same selection key resolves for a station list card and its map marker", () => {
  const keyFromCard = stationSelectionKey("station", station.id);
  const keyFromMarker = stationSelectionKey("station", station.id);
  assert.equal(keyFromCard, keyFromMarker);
  assert.equal(resolveStationSelection(keyFromCard, [station], [location]).station, station);
  assert.equal(resolveStationSelection(keyFromMarker, [station], [location]).station, station);
});

test("map pin and station selection stay distinct", () => {
  assert.equal(resolveStationSelection(stationSelectionKey("location", location.id), [station], [location]).location, location);
  assert.equal(resolveStationSelection(null, [station], [location]).station, null);
});

test("safe sign-in return path preserves the preselected station and blocks external redirects", () => {
  const id = "6d093119-f1c9-43e0-9a16-5d4ae3ee1100";
  assert.equal(afterAuthReportPath(`/report/lost?station=${id}`), `/report/lost?station=${id}`);
  assert.equal(afterAuthReportPath("/report/lost"), "/report/lost");
  assert.equal(afterAuthReportPath("/report/lost?station=invalid"), null);
  assert.equal(afterAuthReportPath("//evil.example"), null);
  assert.equal(afterAuthReportPath("https://evil.example/report/lost"), null);
  assert.equal(afterAuthReportPath("/admin"), null);
});
