// Disposable confirmed accounts must be provisioned separately in a test project.
// Credentials come only from ignored .env.e2e.local (E2E_FIXTURE JSON).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const fixture = JSON.parse(process.env.E2E_FIXTURE);
assert.ok(fixture.station_id, "Provide the approved demo station assigned to the officer.");
const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
const actions = Object.fromEntries(Object.entries(manifest.node).map(([id, value]) => [value.exportedName, id]));
const cookieJar = new Map();
const cookie = () => [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
let client;

async function action(name, args, values, path = "/auth") {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.set(`_1_${key}`, value);
  body.set("0", JSON.stringify([...args, "$K1"]));
  const response = await fetch(base + path, { method: "POST", headers: { "Next-Action": actions[name], Origin: base, Accept: "text/x-component", Cookie: cookie() }, body, redirect: "manual" });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0]; const index = pair.indexOf("=");
    cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const text = await response.text();
  assert.ok(response.status < 400, `Action ${name} returned HTTP ${response.status}`);
  return { response, text };
}

async function login(role, mode = role === "admin" ? "admin" : role === "officer" ? "station" : "login") {
  const user = fixture.users.find(user => user.role === role);
  cookieJar.clear();
  const [path, destination] = mode === "admin" ? ["/admin", "/manager"] : mode === "station" ? ["/staff", "/security"] : ["/auth", "/my"];
  const result = await action("authenticate", [], { mode, email: user.email, password: fixture.password }, path);
  assert.ok(result.response.headers.get("x-action-redirect")?.startsWith(destination), `Login failed for ${role}`);
  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: fixture.password });
  assert.equal(error, null);
  return user;
}

const fields = { title: "E2E keys", category: "Keys", color: "Silver", description: "Disposable coursework fixture", occurred_at: "2026-01-01", location_text: "Fictional test park", private_details: "Private test engraving",contact_method:"test@example.invalid", intended_station_id:fixture.station_id??"" };
const reportIds = [];
const photos = [];
try {
  const invalid = await action("authenticate", [], { mode: "login", email: fixture.users[0].email, password: "wrong-password" });
  assert.match(invalid.text, /Check your email and password/);
  const registration = await action("authenticate", [], { mode: "register", email: "invalid", password: "short", full_name: "" });
  assert.match(registration.text, /valid email address/);
  console.log("PASS invalid login and registration validation");
  await login("citizen");
  for (const path of ["/security", "/manager"]) {
    const response = await fetch(base + path, { headers: { Cookie: cookie() }, redirect: "manual" });
    assert.equal(response.status, 307); assert.equal(response.headers.get("location"), "/access-denied");
  }
  console.log("PASS citizen blocked from officer/admin pages");
  const invalidReport = await action("saveReport", ["found", null], { ...fields, title: "" }, "/report/found");
  assert.match(invalidReport.text, /Title is required/);
  const invalidPhoto = await action("saveReport", ["found", null], { ...fields, photo: new File(["not image"], "fake.png", { type: "image/png" }) }, "/report/found");
  assert.match(invalidPhoto.text, /could not be read/);
  console.log("PASS server rejects invalid report and forged image");
  for (const kind of ["lost", "found"]) {
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "teal" } }).png().toBuffer();
    const result = await action("saveReport", [kind, null], { ...fields, title: `E2E ${kind}`, photo: new File([png], "sample.png", { type: "image/png" }) }, `/report/${kind}`);
    const location = result.response.headers.get("x-action-redirect");
    assert.ok(location?.startsWith("/items/"), "Report action must redirect to detail");
    const id = location.split(";")[0].split("/").pop(); reportIds.push(id);
    const { data, error } = await client.rpc("item_detail", { target_id: id }); assert.equal(error, null);
    assert.equal(data[0].status, kind === "lost" ? "open" : "pending_surrender");
    assert.equal(data[0].held_at_station_id, null);
    assert.ok(data[0].photo_path); photos.push(data[0].photo_path);
    const photo = await client.storage.from("item-photos").download(data[0].photo_path); assert.equal(photo.error, null);
    const detail = await fetch(`${base}/items/${id}`, { headers: { Cookie: cookie() } });
    assert.equal(detail.status, 200); assert.match(await detail.text(), /Private test engraving/);
    const edit = await action("saveReport", [kind, id], { ...fields, title: `E2E ${kind} edited` }, `/report/${kind}?edit=${id}`);
    assert.ok(edit.response.headers.get("x-action-redirect"));
  }
  const { data: mine } = await client.rpc("my_reports"); assert.equal(mine.length, 2);
  const myPage = await fetch(base + "/my", { headers: { Cookie: cookie() } }); assert.match(await myPage.text(), /E2E found edited/);
  console.log("PASS lost/found create, initial statuses, private photo upload, detail, edit and my reports");
  await login("other");
  const { data: theirs } = await client.rpc("my_reports"); assert.equal(theirs.length, 0);
  for (const id of reportIds) {
    const { data } = await client.rpc("item_detail", { target_id: id }); assert.equal(data.length, 0);
    const response = await fetch(`${base}/items/${id}`, { headers: { Cookie: cookie() } }); assert.equal(response.status, 404);
  }
  const attack = await action("saveReport", ["found", reportIds[1]], fields, "/report/found"); assert.match(attack.text, /cannot edit/);
  assert.ok((await client.storage.from("item-photos").download(photos[0])).error);
  console.log("PASS another citizen cannot view/edit reports or download photos");
  await login("officer");
  assert.equal((await fetch(base + "/security", { headers: { Cookie: cookie() } })).status, 200);
  assert.equal((await client.rpc("item_detail", { target_id: reportIds[0] })).data[0].private_details, fields.private_details);
  assert.equal((await client.storage.from("item-photos").download(photos[0])).error, null);
  const deniedAdmin = await fetch(base + "/manager", { headers: { Cookie: cookie() }, redirect: "manual" });
  assert.equal(deniedAdmin.status, 307); assert.equal(deniedAdmin.headers.get("location"), "/access-denied");
  const found = reportIds[1];
  const operation = (name, target, fields, path) => action("operate", [name, target], fields, path);
  const saved = async (...args) => assert.match((await operation(...args)).text, /Saved/);
  await saved("moderate_report", found, { decision:"approved",safe_title:"Demo keys",safe_description:"Keys found",safe_area:"Demo City" }, "/security");
  await saved("receive_item", found, { station:fixture.station_id,storage:"Demo shelf A",confirmed:"on" }, "/security");
  await saved("store_item", found, { storage:"Demo shelf B" }, "/security");
  await login("other");
  const claimPhoto = await sharp({ create:{width:40,height:40,channels:3,background:"teal"} }).png().toBuffer();
  await saved("submit_claim", found, { evidence:"Sample mint strap with the tag code DEMO.",attachment:new File([claimPhoto],"proof.png",{type:"image/png"}) }, `/items/${found}`);
  const claims=await client.from("claims").select("id,evidence_path,status").eq("item_id",found);
  assert.equal(claims.error,null);
  assert.equal(claims.data.length,1);
  const claim=claims.data[0];
  assert.equal(claim.status,"submitted");
  assert.ok(claim.evidence_path);
  const claimantPage=await fetch(base+"/claims",{headers:{Cookie:cookie()}});
  assert.match(await claimantPage.text(),new RegExp(claim.id));
  await login("citizen");
  assert.deepEqual((await client.from("claims").select("id").eq("id",claim.id)).data,[]);
  assert.ok((await client.storage.from("claim-evidence").download(claim.evidence_path)).error);
  await login("officer");
  const reviewPath=`/security/claims/${found}`;
  const reviewPage=await fetch(base+reviewPath,{headers:{Cookie:cookie()}});
  assert.match(await reviewPage.text(),/Sample mint strap/);
  assert.equal((await client.storage.from("claim-evidence").download(claim.evidence_path)).error,null);
  await saved("review_claim",claim.id,{decision:"approved"},reviewPath);
  await saved("release_item",found,{confirmed:"on"},reviewPath);
  assert.match((await operation("release_item",found,{confirmed:"on"},reviewPath)).text,/approved for pickup/);
  await login("other");
  const returned=await fetch(base+"/claims",{headers:{Cookie:cookie()}});
  assert.match(await returned.text(),/physically handed over|has been handed over/);
  console.log("PASS report moderation, physical intake, private claim and image, approval, release, and claimant tracking");
  await login("admin");
  assert.equal((await fetch(base + "/manager", { headers: { Cookie: cookie() } })).status, 200);
  await login("admin", "station");
  assert.equal((await fetch(base + "/security", { headers: { Cookie: cookie() } })).status, 200);
  await login("admin", "login");
  console.log("PASS officer/admin server permissions and authorized private reads");
  const logout = await action("signOut", [], {}, "/my"); assert.ok(logout.response.headers.get("x-action-redirect")?.startsWith("/auth"));
  assert.equal((await fetch(base + "/my", { headers: { Cookie: cookie() }, redirect: "manual" })).status, 307);
  console.log("PASS sign out blocks protected pages");
} finally {
  if (photos.length) {
    await login("citizen");
    assert.equal((await client.storage.from("item-photos").remove(photos)).error, null);
    await client.auth.signOut();
  }
  console.log("Report photos removed. Remove the disposable claims, evidence, reports, and users using the test administrator connection.");
}
