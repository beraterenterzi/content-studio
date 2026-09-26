import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const source = readFileSync(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
function extract(name, nextName) {
  let start = source.indexOf(`function ${name}(`);
  let end = source.indexOf(`function ${nextName}(`, start);
  if (source.slice(start - 6, start) === "async ") start -= 6;
  if (source.slice(end - 6, end) === "async ") end -= 6;
  assert.ok(start >= 0 && end > start, `${name} must be present`);
  return source.slice(start, end).replace(/__name\([^;]+;\s*/g, "");
}

test("password derivation is deterministic per salt and never stores the password", async () => {
  const context = vm.createContext({ crypto:webcrypto, TextEncoder });
  vm.runInContext(extract("bytesHex", "randomToken"), context);
  vm.runInContext(extract("derivePasswordHash", "normalizeEmail"), context);
  const first = await vm.runInContext(`derivePasswordHash("correct horse battery staple", "00112233445566778899aabbccddeeff", 200000)`, context);
  const same = await vm.runInContext(`derivePasswordHash("correct horse battery staple", "00112233445566778899aabbccddeeff", 200000)`, context);
  const otherSalt = await vm.runInContext(`derivePasswordHash("correct horse battery staple", "ffeeddccbbaa99887766554433221100", 200000)`, context);
  assert.equal(first, same);
  assert.notEqual(first, otherSalt);
  assert.equal(first.length, 64);
  assert.ok(!first.includes("correct"));
});

test("Stripe webhook verifier accepts the raw signed body and rejects tampering", async () => {
  const context = vm.createContext({ crypto:webcrypto, TextEncoder, Date });
  vm.runInContext(extract("bytesHex", "randomToken"), context);
  vm.runInContext(extract("constantTimeEqual", "authenticateUser"), context);
  vm.runInContext(extract("verifyStripeWebhook", "sessionKey"), context);
  const secret = "whsec_local_test_secret";
  const body = JSON.stringify({ id:"evt_test", type:"invoice.paid" });
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const signature = Buffer.from(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`))).toString("hex");
  const valid = await vm.runInContext(`verifyStripeWebhook(${JSON.stringify(body)}, ${JSON.stringify(`t=${timestamp},v1=${signature}`)}, ${JSON.stringify(secret)})`, context);
  const tampered = await vm.runInContext(`verifyStripeWebhook(${JSON.stringify(body + " ")}, ${JSON.stringify(`t=${timestamp},v1=${signature}`)}, ${JSON.stringify(secret)})`, context);
  assert.equal(valid, true);
  assert.equal(tampered, false);
});

test("account ownership and paid capabilities are enforced in the Worker", () => {
  const accountMigration = readFileSync(new URL("../migrations/0007_accounts_and_entitlements.sql", import.meta.url), "utf8");
  const orderMigration = readFileSync(new URL("../migrations/0009_billing_event_order.sql", import.meta.url), "utf8");
  assert.match(accountMigration, /CREATE TABLE IF NOT EXISTS auth_sessions/);
  assert.match(accountMigration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_single_owner/);
  assert.match(source, /SELECT 1 AS owned FROM workspace_members/);
  assert.match(source, /if \(owned\) verifiedId = null/);
  assert.match(source, /requirePro\(workspace\);\s*await enforceRateLimit\(request, env, workspace\.id, "media-upload-create"\)/);
  assert.match(source, /if \(!byokImage && !item\.content\?\.demo && !hasProAccess\(workspace\)\) requirePro\(workspace\)/);
  assert.match(source, /verifyStripeWebhook\(rawBody/);
  assert.match(source, /SELECT 1 AS done FROM billing_events WHERE event_id = \?/);
  assert.match(source, /client_reference_id: user\.id/);
  assert.match(source, /billing_event_created <= \?/);
  assert.match(source, /\["canceled", "incomplete_expired"\]\.includes\(stripeStatus\)/);
  assert.match(source, /stripeStatus === "active" \? "active" : stripeStatus === "trialing" \? "trialing" : "past_due"/);
  assert.match(source, /WHERE provider_subscription_id = \? AND status <> 'canceled' AND billing_event_created <= \?/);
  assert.doesNotMatch(source, /provider_customer_id = \? AND \? <> ''/);
  assert.match(source, /BILLING_TARGET_PENDING/);
  assert.match(orderMigration, /ADD COLUMN billing_event_created/);
});

test("launch auth, cost controls and privacy-safe analytics fail closed", () => {
  const launchMigration = readFileSync(new URL("../migrations/0010_launch_readiness.sql", import.meta.url), "utf8");
  assert.match(launchMigration, /email_verified_at/);
  assert.match(launchMigration, /CREATE TABLE IF NOT EXISTS auth_action_tokens/);
  assert.match(launchMigration, /CREATE TABLE IF NOT EXISTS analytics_daily/);
  assert.match(launchMigration, /CREATE TABLE IF NOT EXISTS managed_global_usage/);
  assert.match(source, /verifyTurnstile\(request, env/);
  assert.match(source, /TURNSTILE_HOST_MISMATCH/);
  assert.match(source, /\/api\/auth\/password\/reset/);
  assert.match(source, /\/api\/auth\/verify\/confirm/);
  assert.match(source, /user\.provider_subscription_id && !\["canceled", "incomplete_expired"\]/);
  assert.match(source, /consumeGlobalDailyQuota\(env, "managed_tts"/);
  assert.match(source, /consumeGlobalDailyQuota\(env, "managed_image_generate"/);
  assert.match(source, /const language = Object\.values\(CONTENT_LANGUAGES\)/);
  assert.match(source, /const surface = \["web", "pwa", "android", "ios", "unknown"\]/);
  assert.match(source, /const result = \["success", "failure", "cancelled", "unknown"\]/);
  assert.match(source, /state\.runtime\.billingConfigured = state\.runtime\.launchReadiness\.ready/);
});
