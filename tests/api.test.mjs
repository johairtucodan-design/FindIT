import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test("anonymous access exposes only approved demo stations", async () => {
  const { data, error } = await client.from("stations").select("name,is_demo,is_approved");
  assert.equal(error, null);
  assert.equal(data.length, 3);
  assert.ok(data.every(s => s.is_demo && s.is_approved && s.name.startsWith("DEMO ONLY")));
});

test("public report projection is accessible", async () => {
  const { error } = await client.from("public_items").select("*").limit(1);
  assert.equal(error, null);
});

test("anonymous clients cannot read private details or profiles", async () => {
  for (const [table, columns] of [["items", "private_details"], ["profiles", "*"]]) {
    const { data, error } = await client.from(table).select(columns).limit(1);
    assert.equal(data, null);
    assert.ok(error, `${table} must deny anonymous private access`);
  }
});

test("anonymous clients cannot call authorized report details", async () => {
  const { error } = await client.rpc("item_detail", { target_id: "00000000-0000-4000-8000-000000000001" });
  assert.ok(error);
});
