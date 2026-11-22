import assert from "node:assert/strict";
import test from "node:test";
import { pinPreviewHref, pinSaveFeedback } from "../src/lib/station-pin-feedback.ts";

const savedPin = { id: "c9c4d257-8a3d-4d8c-8c14-48c06d915ca4", name: "Public entrance", stationName: "Police Station 2" };

test("successful pin save returns a named preview path and station", () => {
  const feedback = pinSaveFeedback({ success: "Map reference added.", pin: savedPin });
  assert.deepEqual(feedback, { kind: "success", pin: savedPin });
  assert.equal(pinPreviewHref(feedback.pin), "/stations?location=c9c4d257-8a3d-4d8c-8c14-48c06d915ca4#station-map");
});

test("pin save errors remain errors and do not create a preview action", () => {
  assert.deepEqual(pinSaveFeedback({ error: "Choose a map point." }), { kind: "error", message: "Choose a map point." });
  assert.equal(pinSaveFeedback({ success: "Map reference added.", pin: { ...savedPin, id: "bad" } }), null);
});
