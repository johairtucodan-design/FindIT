import assert from "node:assert/strict";
import test from "node:test";
import { rankItemMatches } from "../src/lib/item-matches.ts";

const lost = {
  category: "Wallets", title: "Black leather wallet", description: "Small zip wallet with brass clasp",
  color: "Black", location_text: "Iligan Central Plaza", occurred_at: "2026-11-08",
  coordinates: [8.228, 124.245],
};

test("ranks shared title and description details with explainable reasons", () => {
  const close = {
    ...lost, id: "close", title: "Found wallet", description: "Black leather zip wallet with brass clasp",
    location_text: "Central Plaza", occurred_at: "2026-11-10", coordinates: [8.229, 124.246],
  };
  const weaker = {
    ...lost, id: "weaker", title: "Coin purse", description: "Small fabric pouch",
    color: "Blue", location_text: "Other area", occurred_at: "2026-11-11", coordinates: [8.26, 124.27],
  };
  const [first, second] = rankItemMatches(lost, [weaker, close]);
  assert.equal(first.candidate.id, "close");
  assert.ok(first.score > second.score);
  assert.ok(first.score <= 100);
  assert.ok(first.reasons.includes("Same category"));
  assert.ok(first.reasons.includes("Same color"));
  assert.ok(first.reasons.includes("Locations are within about 2 km"));
  assert.ok(first.reasons.some(reason => reason.startsWith("Shared terms:")));
});

test("uses exact categories and excludes reports over 30 days apart", () => {
  const wrongCategory = { ...lost, id: "wrong", category: "Phones" };
  const old = { ...lost, id: "old", occurred_at: "2026-10-08" };
  assert.deepEqual(rankItemMatches(lost, [wrongCategory, old]), []);
});

test("uses shared area terms when coordinates are unavailable", () => {
  const candidate = { ...lost, id: "area", coordinates: null, location_text: "Iligan Central Market", occurred_at: "2026-11-08" };
  const [match] = rankItemMatches({ ...lost, coordinates: null }, [candidate]);
  assert.ok(match.reasons.includes("Area terms overlap"));
});

test("returns a 100 similarity score for a full exact match and orders ties deterministically", () => {
  const same = { ...lost, id: "z" };
  const duplicate = { ...lost, id: "a" };
  const results = rankItemMatches(lost, [same, duplicate]);
  assert.equal(results[0].score, 100);
  assert.deepEqual(results.map(result => result.candidate.id), ["a", "z"]);
});

test("missing details lower the score instead of inflating it", () => {
  const sparse = { ...lost, id: "sparse", title: "", description: "", color: "Unknown", location_text: "", coordinates: null };
  const [match] = rankItemMatches({ ...lost, title: "", description: "", color: "Unknown", location_text: "", coordinates: null }, [sparse]);
  assert.equal(match.score, 40);
});
