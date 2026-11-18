import assert from "node:assert/strict";
import test from "node:test";
import { matchScorePresentation, shouldAnimateMatchScore } from "../src/lib/match-presentation.ts";

test("score display has accessible similarity language and never invents a missing score", () => {
  assert.deepEqual(matchScorePresentation(73), { hasScore: true, score: 73, label: "Similarity score" });
  assert.deepEqual(matchScorePresentation(null), { hasScore: false, label: "Not enough details to compare" });
  assert.equal(matchScorePresentation(124).score, 100);
});

test("match score animation respects reduced motion and missing browser support", () => {
  assert.equal(shouldAnimateMatchScore(true, true), false);
  assert.equal(shouldAnimateMatchScore(false, false), false);
  assert.equal(shouldAnimateMatchScore(false, true), true);
});
