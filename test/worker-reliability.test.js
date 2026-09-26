import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("creator brief survives topic limits in local and Cloudflare idea assets", async () => {
  const [worker, server, app] = await Promise.all([
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.match(app, /topic:storyBaseTopic, creativeBrief/);
  assert.match(worker, /cleanText\(input\.creativeBrief, 700\)/);
  assert.match(server, /clean\(input\.creativeBrief, 700\)/);
  assert.match(worker, /Creative brief: \$\{creativeBrief\}/);
  assert.match(server, /Creative brief: \$\{creativeBrief\}/);
});

test("Cloudflare state writes use a compare-and-swap boundary", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /workspaceSnapshots/);
  assert.match(worker, /mergeStateRecords/);
  assert.match(worker, /WHERE workspace_id = \? AND ideas_json = \? AND productions_json = \? AND trash_json = \?/);
  assert.match(worker, /Number\(result\.meta\?\.changes\) !== 1/);
  assert.match(worker, /stateConflict\(\)/);
});

test("demo ve Pro yönetilen üretim kotaları atomik ve geri alınabilir", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /SELECT \?, 'lifetime', 'demo_ai_generate'/);
  assert.match(worker, /WHERE NOT EXISTS \(SELECT 1 FROM usage_daily/);
  assert.match(worker, /if \(!env\.AI\)/);
  assert.match(worker, /refundDemoTrial/);
  assert.match(worker, /code = "PRO_REQUIRED"/);
  assert.match(worker, /consumeMonthlyQuota/);
  assert.match(worker, /managed_ai_generate/);
  assert.match(worker, /generateManagedProPackage/);
  assert.match(worker, /@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast/);
  assert.match(worker, /reservation === "managed"/);
});

test("workspace initialization tolerates the first concurrent insert", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /ON CONFLICT\(workspace_id\) DO NOTHING/);
  assert.match(worker, /if \(!row\) throw new Error\("Workspace could not be initialized"\)/);
});

test("cloud uploads enforce part, file, workspace and completed object sizes", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../migrations/0005_cloud_media_quota_and_telegram_pending.sql", import.meta.url), "utf8");
  const cleanupMigration = await readFile(new URL("../migrations/0006_cloud_media_cleanup.sql", import.meta.url), "utf8");
  assert.match(worker, /CLOUD_MEDIA_PART_SIZE/);
  assert.match(worker, /CLOUD_MEDIA_FILE_LIMIT/);
  assert.match(worker, /CLOUD_MEDIA_WORKSPACE_LIMIT/);
  assert.match(worker, /media-upload-part/);
  assert.match(worker, /Number\(object\.size\) !== Number\(row\.byte_size\)/);
  assert.match(worker, /SET status = 'failed'/);
  assert.match(worker, /expireStaleMediaUploads/);
  assert.match(worker, /async function cleanupMediaUpload/);
  assert.match(worker, /if \(await cleanupMediaUpload\(env, row\)\)/);
  assert.match(worker, /if \(!await cleanupMediaUpload\(env, row\)\)/);
  assert.match(worker, /abortMultipartWithRetry/);
  assert.match(worker, /cleanup_pending/);
  assert.match(worker, /resumeMultipartUpload\(row\.object_key, row\.upload_id\)\.abort/);
  assert.match(worker, /"accept-ranges": "bytes"/);
  assert.match(worker, /status: range \? 206 : 200/);
  assert.match(migration, /CREATE TRIGGER IF NOT EXISTS cloud_media_workspace_quota_insert/);
  assert.match(cleanupMigration, /ADD COLUMN cleanup_pending/);
});

test("Telegram decisions atomically claim a pending token and protect group chats", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /WHERE token = \? AND status = 'pending'/);
  assert.match(worker, /RETURNING token, workspace_id, production_id, status/);
  assert.match(worker, /TELEGRAM_EDITOR_USER_IDS/);
  assert.match(worker, /SELECT token, message_id, created_at FROM telegram_reviews WHERE workspace_id = \? AND production_id = \? AND status = 'pending'/);
  assert.match(worker, /INSERT INTO telegram_reviews .*'pending', NULL/);
  assert.match(worker, /persistTelegramReviewState\(workspace, state, item, existingReview, env\)/);
  assert.match(worker, /if \(!existingReview\.message_id\)/);
  assert.match(worker, /status: "sending"/);
});

test("state conflicts are explicitly coded and failed image work refunds quota", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /error\.code = "STATE_CONFLICT"/);
  assert.match(worker, /error\?\.code \? \{ code:/);
  assert.match(worker, /refundDailyQuota\(env, workspace\.id, "image_generate"\)/);
  assert.match(worker, /refundDailyQuota\(env, workspace\.id, "tts"\)/);
  assert.match(worker, /reservation === "managed".*refundMonthlyQuota/);
  assert.match(worker, /refundDailyQuota\(env, workspace\.id, "media_import"\)/);
  assert.match(worker, /refundDailyQuota\(env, workspace\.id, "media_search"\)/);
});

test("Cloudflare metin modeli sağlayıcıyla uyumlu bir allowlist kullanır", async () => {
  const worker = await readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8");
  assert.match(worker, /const TEXT_MODELS =/);
  assert.match(worker, /TEXT_MODELS\[provider\]\.includes\(input\.textModel\)/);
  assert.match(worker, /gemini: \["gemini-3\.6-flash"\]/);
  assert.doesNotMatch(worker, /gemini-2\.5-flash/);
  assert.match(worker, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.doesNotMatch(worker, /:generateContent/);
  assert.match(worker, /max_tokens: 5e3/);
});
