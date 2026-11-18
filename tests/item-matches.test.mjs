import assert from "node:assert/strict";
import test from "node:test";
import { rankItemMatches } from "../src/lib/item-matches.ts";

const lost = {
  id: "synthetic-lost-1", kind: "lost", status: "open", category: "Wallets",
  title: "Synthetic black leather wallet", description: "Synthetic zip wallet with brass clasp",
  color: "Black", location_text: "Synthetic Test Zone Alpha", occurred_at: "2026-11-08",
};

function found(overrides = {}) {
  return {
    id: "synthetic-found-1", kind: "found", status: "pending_surrender", category: "wallets",
    title: "Synthetic found wallet", description: "Synthetic black leather zip wallet with brass clasp",
    color: "Black", location_text: "Synthetic Test Zone Alpha", occurred_at: "2026-11-08", ...overrides,
  };
}

test("compares lost reports with found reports only and honors found status eligibility", () => {
  const eligible = ["pending_surrender", "received_by_police", "in_custody"].map(status => found({ id: status, status }));
  const excluded = ["open", "approved_for_pickup", "released", "closed"].map(status => found({ id: status, status }));
  const lostCandidate = found({ id: "other-lost", kind: "lost" });
  const matches = rankItemMatches(lost, [...eligible, ...excluded, lostCandidate]);
  assert.deepEqual(matches.map(match => match.candidate.id).sort(), eligible.map(item => item.id).sort());
  assert.deepEqual(rankItemMatches({ ...lost, status: "closed" }, [found()]), []);
  assert.deepEqual(rankItemMatches({ ...lost, kind: "found" }, [found()]), []);
});

test("uses weighted, explainable signals and normalizes text", () => {
  const [match] = rankItemMatches(lost, [found({ title: lost.title, description: lost.description, location_text: lost.location_text })]);
  assert.equal(match.score, 100);
  assert.ok(match.reasons.includes("Same category"));
  assert.ok(match.reasons.includes("Similar description"));
  assert.ok(match.reasons.includes("Same color"));
  assert.ok(match.reasons.includes("Reported nearby"));
  assert.ok(match.reasons.includes("Reported on the same day"));
  assert.deepEqual(match.breakdown.map(signal => signal.weight), [25, 30, 15, 15, 15]);
  assert.equal(match.breakdown.reduce((sum, signal) => sum + signal.contribution, 0), 100);
});

test("suggestions do not wait for the lost report's publication approval", () => {
  const [match] = rankItemMatches({ ...lost, publication_status: "pending" }, [found({ publication_status: "approved" })]);
  assert.ok(match);
});

test("renormalizes weights when some signals are missing", () => {
  const [match] = rankItemMatches(lost, [found({ title: lost.title, description: lost.description, color: "Unknown", location_text: "" })]);
  assert.equal(match.score, 100);
  assert.equal(match.notEnoughDetails, false);
  assert.ok(match.breakdown.find(signal => signal.key === "category").contribution > 25);
  assert.equal(match.breakdown.find(signal => signal.key === "color").contribution, null);
  assert.equal(Math.round(match.breakdown.reduce((sum, signal) => sum + (signal.contribution ?? 0), 0)), match.score);
});

test("renormalizes when dates are missing and excludes the date reason", () => {
  const [match] = rankItemMatches({ ...lost, occurred_at: null }, [found({ occurred_at: null, title: lost.title, description: lost.description, location_text: lost.location_text })]);
  assert.equal(match.score, 100);
  assert.ok(!match.reasons.some(reason => reason.includes("Reported on")));
});

test("compares approximate area without returning it in match results", () => {
  const [nearby] = rankItemMatches(lost, [found({ title: lost.title, description: lost.description, location_text: lost.location_text })]);
  const [elsewhere] = rankItemMatches(lost, [found({ title: lost.title, description: lost.description, location_text: "Counterfactual Outer District" })]);
  assert.ok(nearby.score > elsewhere.score);
  assert.ok(nearby.reasons.includes("Reported nearby"));
  assert.ok(elsewhere.reasons.includes("Reported areas differ"));
  assert.ok(!JSON.stringify(nearby).includes("Synthetic Test Zone Alpha"));
  assert.ok(!JSON.stringify(nearby).includes("location_text"));
});

test("reports insufficient details instead of manufacturing a score", () => {
  const sparse = { ...lost, category: "", title: "", description: "", color: "Not sure", location_text: "" };
  const [match] = rankItemMatches(sparse, [found({ category: "", title: "", description: "", color: "Unknown", location_text: "" })]);
  assert.equal(match.score, null);
  assert.equal(match.notEnoughDetails, true);
  assert.deepEqual(match.reasons, ["Not enough details to compare"]);
});

test("keeps private clues and precise coordinates out of results and scores", () => {
  const base = found({ coordinates: [8.228, 124.245], private_details: "synthetic hidden clue", precise_address: "synthetic exact address" });
  const changedSecrets = { ...base, coordinates: [8.3, 124.3], private_details: "different secret", precise_address: "different address" };
  const [first] = rankItemMatches({ ...lost, coordinates: [8.228, 124.245], private_details: "lost secret" }, [base]);
  const [second] = rankItemMatches({ ...lost, coordinates: [8.3, 124.3], private_details: "other lost secret" }, [changedSecrets]);
  assert.equal(first.score, second.score);
  const serialized = JSON.stringify(first);
  assert.ok(!serialized.includes("coordinates"));
  assert.ok(!serialized.includes("124.245"));
  assert.ok(!serialized.includes("location_text"));
  assert.ok(!serialized.includes("synthetic hidden clue"));
  assert.ok(!serialized.includes("synthetic exact address"));
  assert.ok(!serialized.includes("lost secret"));
});

test("excludes reports more than 30 days apart", () => {
  assert.deepEqual(rankItemMatches(lost, [found({ occurred_at: "2026-12-09" })]), []);
});
