import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("anonymous table reads cannot expose demo station fixtures", async () => {
  const { data, error } = await client.from("stations").select("name,is_demo,is_approved").eq("is_demo", true);
  assert.equal(error, null);
  assert.deepEqual(data, []);
});

test("public station directory contains only sourced, non-demo Iligan references", async () => {
  const { data, error } = await client.rpc("station_directory");
  assert.equal(error, null);
  assert.equal(data.length, 7);
  assert.ok(data.every(station => station.directory_key?.startsWith("iligan-") && station.source_notes?.fields?.phone?.sources?.length));
  assert.ok(data.every(station => station.source_notes.checkedAt && Object.values(station.source_notes.fields).every(field => field.note && field.sources.length)));
  const stationOne = data.find(station => station.directory_key === "iligan-ps1");
  assert.equal(stationOne.address, "");
  assert.equal(stationOne.latitude, null);
  assert.equal(stationOne.longitude, null);
  assert.equal(stationOne.source_notes.fields.coordinates.status, "conflict");
});

test("public report projection is accessible", async () => {
  const { error } = await client.from("public_items").select("*").limit(1);
  assert.equal(error, null);
});

test("demo examples are public but excluded from real listings and keep their statuses", async () => {
  const { data: demos, error } = await client.from("public_items").select("id,kind,status,is_demo,location_text").eq("is_demo", true);
  assert.equal(error, null);
  assert.equal(demos.length, 80);
  assert.equal(demos.filter(item => item.kind === "lost").length, 40);
  assert.equal(demos.filter(item => item.kind === "found").length, 40);
  assert.ok(demos.filter(item => item.kind === "lost").every(item => item.status === "open"));
  assert.ok(demos.filter(item => item.kind === "found").every(item => item.status === "pending_surrender"));
  assert.ok(demos.every(item => item.location_text.startsWith("SyntheticZone")));
  assert.ok(demos.every(item => item.is_demo && !("photo_path" in item)));
  const { data: realItems, error: realError } = await client.from("public_items").select("id,is_demo").eq("is_demo", false);
  assert.equal(realError, null);
  assert.ok(realItems.every(item => item.is_demo === false));
});

test("anonymous clients cannot read private details or profiles", async () => {
  for (const [table, columns] of [["items", "private_details"], ["items","description"], ["items","contact_method"], ["profiles", "*"]]) {
    const { data, error } = await client.from(table).select(columns).limit(1);
    assert.equal(data, null);
    assert.ok(error, `${table} must deny anonymous private access`);
  }
});

test("anonymous clients cannot call authorized report details", async () => {
  const { error } = await client.rpc("item_detail", { target_id: "00000000-0000-4000-8000-000000000001" });
  assert.ok(error);
});
