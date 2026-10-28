// Run against a production build started with Codespaces environment variables.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { codespacesHost } from "../src/lib/codespaces.mjs";

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const host = codespacesHost(process.env);
assert.ok(host, "Set CODESPACE_NAME to test Codespaces forwarding");
const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
const action = Object.entries(manifest.node).find(([, value]) => value.exportedName === "authenticate")[0];

for (const [origin, forwarded] of [
  ["http://localhost:3000", host],
  [`https://${host}`, host],
  [`https://${host}`, "localhost:3000"],
  ["https://untrusted.example.invalid", host],
]) {
  const form = new FormData();
  form.set("_1_email", "invalid");
  form.set("_1_password", "");
  form.set("0", '["$K1"]');
  const response = await fetch(base + "/auth", { method: "POST", redirect: "manual", headers: {
    "Next-Action": action, Origin: origin, "X-Forwarded-Host": forwarded, Accept: "text/x-component",
  }, body: form });
  const text = await response.text();
  if (origin.includes("untrusted")) {
    assert.ok(response.status >= 400, "Untrusted origins must remain blocked");
  } else {
    assert.equal(response.status, 200);
    assert.match(text, /Enter a valid email address and password/);
  }
}
const callback = await fetch(base + "/auth/callback", { redirect: "manual" });
assert.equal(callback.headers.get("location"), `https://${host}/auth?error=confirmation`);
console.log("PASS localhost/public Codespaces origins, unrelated-origin rejection and public callback redirect");
