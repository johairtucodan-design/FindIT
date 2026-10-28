import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { validateReport } from "../src/lib/reports.ts";
import { preparePhoto } from "../src/lib/photo.ts";

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: "House keys", category: "Keys", color: "Silver", description: "Blue keyring", location_text: "Demo park", occurred_at: "2026-01-01" })) form.set(key, value);
  return form;
}

test("report validation rejects blank required fields, long values and invalid dates", () => {
  for (const field of ["title", "category", "color", "description", "location_text", "occurred_at"]) {
    const form = validForm(); form.set(field, " ");
    assert.ok(validateReport(form).errors[field]);
  }
  for (const date of ["2026-02-30", "9999-01-01", "not-a-date"]) {
    const form = validForm(); form.set("occurred_at", date);
    assert.ok(validateReport(form).errors.occurred_at);
  }
  const form = validForm(); form.set("title", "x".repeat(121));
  assert.ok(validateReport(form).errors.title);
  assert.deepEqual(validateReport(validForm()).errors, {});
});

test("photo validation rejects non-images, forged MIME types and oversized files", async () => {
  await assert.rejects(preparePhoto(new File(["text"], "notes.txt", { type: "text/plain" })), /JPEG, PNG or WebP/);
  await assert.rejects(preparePhoto(new File(["not an image"], "fake.png", { type: "image/png" })), /could not be read/);
  await assert.rejects(preparePhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })), /5 MiB/);
});

test("valid images are decoded, resized and re-encoded without original metadata", async () => {
  const original = await sharp({ create: { width: 1800, height: 900, channels: 3, background: "teal" } }).png().toBuffer();
  const bytes = await preparePhoto(new File([original], "test.png", { type: "image/png" }));
  const image = await sharp(bytes).metadata();
  assert.equal(image.format, "webp"); assert.equal(image.width, 1600); assert.equal(image.height, 800);
  assert.equal(image.exif, undefined);
});
