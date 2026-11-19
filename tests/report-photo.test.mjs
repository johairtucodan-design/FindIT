import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { removeReportPhoto, signReportPhoto, uploadReportPhoto } from "../src/lib/report-photos.ts";

test("photo upload converts a synthetic image and returns only its persisted object path", async () => {
  const stored = new Map();
  const bucket = {
    async upload(path, body, options) { stored.set(path, { body, options }); return { error: null }; },
    async createSignedUrl() { return { data: { signedUrl: "https://example.invalid/signed" }, error: null }; },
    async remove(paths) { paths.forEach(path => stored.delete(path)); return { error: null }; },
  };
  const source = await sharp({ create: { width: 80, height: 40, channels: 3, background: "orange" } }).png().toBuffer();
  const path = await uploadReportPhoto(bucket, "synthetic-test-account", new File([source], "synthetic.png", { type: "image/png" }));
  const storedPhoto = stored.get(path);
  assert.match(path, /^synthetic-test-account\/[\da-f-]+\.webp$/i);
  assert.equal(storedPhoto.options.contentType, "image/webp");
  assert.equal(storedPhoto.options.upsert, false);
  assert.equal((await sharp(storedPhoto.body).metadata()).format, "webp");
  assert.ok(!path.includes("signed"));
});

test("signed photo URLs are freshly generated and failures stay private", async () => {
  const calls = [];
  const bucket = { async createSignedUrl(path, ttl) { calls.push([path, ttl]); return { data: { signedUrl: `signed-${calls.length}` }, error: null }; } };
  assert.equal(await signReportPhoto(bucket, "synthetic-test-account/photo.webp"), "signed-1");
  assert.equal(await signReportPhoto(bucket, "synthetic-test-account/photo.webp"), "signed-2");
  assert.deepEqual(calls, [["synthetic-test-account/photo.webp", 300], ["synthetic-test-account/photo.webp", 300]]);
  assert.equal(await signReportPhoto({ createSignedUrl: async () => ({ data: null, error: new Error("denied") }) }, "private/photo.webp"), null);
});

test("cleanup removes only the specified orphan object", async () => {
  const removed = [];
  const ok = await removeReportPhoto({ remove: async paths => { removed.push(...paths); return { error: null }; } }, "synthetic-test-account/orphan.webp");
  assert.equal(ok, true);
  assert.deepEqual(removed, ["synthetic-test-account/orphan.webp"]);
});
