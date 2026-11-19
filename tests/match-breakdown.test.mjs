import assert from "node:assert/strict";
import test from "node:test";
import { formatMatchPoints, presentMatchBreakdown, shouldAnimateMatchBreakdown } from "../src/lib/match-breakdown.ts";

test("bars measure each contribution against its renormalized maximum", () => {
  const rows = presentMatchBreakdown([
    { key: "category", label: "Category", weight: 25, similarity: 72, contribution: 32.7272727273, reason: "Same category" },
    { key: "details", label: "Details", weight: 30, similarity: 50, contribution: 27.2727272727, reason: "Similar details" },
    { key: "color", label: "Color", weight: 15, similarity: null, contribution: null, reason: "Not supplied on both reports" },
  ]);
  assert.ok(Math.abs(rows[0].maxPoints - 45.4545454545) < .000001);
  assert.ok(Math.abs(rows[0].barPercent - 72) < .000001);
  assert.ok(Math.abs(rows[1].maxPoints - 54.5454545454) < .000001);
  assert.ok(Math.abs(rows[1].barPercent - 50) < .000001);
  assert.deepEqual([rows[2].maxPoints, rows[2].barPercent], [null, null]);
  assert.equal(formatMatchPoints(25), "25");
  assert.equal(formatMatchPoints(25.5), "25.5");
});

test("bars withhold weighted points when the full comparison lacks enough details", () => {
  const rows = presentMatchBreakdown([
    { key: "category", label: "Category", weight: 25, similarity: 100, contribution: null, reason: "Same category" },
    { key: "details", label: "Details", weight: 30, similarity: null, contribution: null, reason: "Not supplied on both reports" },
  ]);
  assert.equal(rows[0].barPercent, null);
  assert.equal(rows[0].maxPoints, 100);
  assert.equal(rows[1].maxPoints, null);
});

test("signal bars respect reduced motion", () => {
  assert.equal(shouldAnimateMatchBreakdown(true), false);
  assert.equal(shouldAnimateMatchBreakdown(false), true);
});
