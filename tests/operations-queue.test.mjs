import assert from "node:assert/strict";
import test from "node:test";
import { isOperationalReport } from "../src/lib/operations-queue.ts";

const report = overrides => ({ kind: "found", status: "pending_surrender", publication_status: "approved", held_at_station_id: null, is_demo: false, ...overrides });

test("approved found reports remain in receiving until physical receipt", () => {
  assert.equal(isOperationalReport(report(), "receiving"), true);
  const received = report({ status: "received_by_police", held_at_station_id: "synthetic-station" });
  assert.equal(isOperationalReport(received, "receiving"), false);
  assert.equal(isOperationalReport(received, "inventory"), true);
});

test("inventory excludes released reports and synthetic examples", () => {
  assert.equal(isOperationalReport(report({ status: "in_custody", held_at_station_id: "synthetic-station" }), "inventory"), true);
  assert.equal(isOperationalReport(report({ status: "released", held_at_station_id: "synthetic-station" }), "inventory"), false);
  assert.equal(isOperationalReport(report({ is_demo: true }), "receiving"), false);
  assert.equal(isOperationalReport(report({ is_demo: true, held_at_station_id: "synthetic-station", status: "in_custody" }), "inventory"), false);
});

test("publication review is separate from physical receiving", () => {
  const awaitingPublication = report({ kind: "lost", status: "open", publication_status: "pending" });
  assert.equal(isOperationalReport(awaitingPublication, "review"), true);
  assert.equal(isOperationalReport(awaitingPublication, "receiving"), false);
  assert.equal(isOperationalReport(report({ kind: "lost", status: "open", publication_status: "approved" }), "review"), false);
  assert.equal(isOperationalReport(report({ publication_status: "pending" }), "review"), true);
  assert.equal(isOperationalReport(report({ publication_status: "pending" }), "receiving"), true);
  assert.equal(isOperationalReport(report({ publication_status: "pending", held_at_station_id: "synthetic-station" }), "review"), true);
});
