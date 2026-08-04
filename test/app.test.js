import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("adımlı Türkçe stüdyo ekranı mevcut", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, /Orbit Studio/);
  assert.match(html, /id="brand-home"/);
  assert.match(html, /id="resume-project"/);
  assert.match(html, /aria-controls="workflow-nav"/);
  assert.match(html, /Wikimedia Commons/);
  assert.match(html, /Video laboratuvarı/);
});

test("paket harici bağımlılık gerektirmiyor", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.dependencies, undefined);
});

test("maliyetsiz Görsel Akış ve PWA kabuğu mevcut", async () => {
  const [html, app, manifest, worker, mobile, css] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/mobile.css", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /data-view="flow"/);
  assert.match(html, /data-share-platform="YouTube"/);
  assert.match(html, /data-flow-template="travel"/);
  assert.match(html, /data-flow-template="education"/);
  assert.match(html, /id="flow-music-file"/);
  assert.match(html, /id="flow-narration-enabled"/);
  assert.match(html, /id="flow-draft-save"/);
  assert.match(app, /canvas\.captureStream/);
  assert.match(app, /const flowTemplates/);
  assert.match(app, /createMediaStreamDestination/);
  assert.match(app, /musicSource\.loop = true/);
  assert.match(app, /indexedDB\.open/);
  assert.match(app, /FLOW_STORE_NAME = "flow-drafts"/);
  assert.match(app, /navigator\.share/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.equal(JSON.parse(manifest).icons.length, 3);
  assert.match(html, /id="pwa-install"/);
  assert.match(html, /id="analytics-funnel"/);
  assert.match(html, /id="flow-compatibility"/);
  assert.match(html, /id="welcome-guide"/);
  assert.match(html, /id="flow-demo"/);
  assert.match(html, /id="flow-copy-presets"/);
  assert.match(html, /id="flow-bulk-text-modal"/);
  assert.match(html, /id="flow-motion"/);
  assert.match(html, /id="flow-transition"/);
  assert.match(html, /id="flow-text-position"/);
  assert.match(html, /id="flow-text-safe"/);
  assert.match(html, /id="flow-crop-modal"/);
  assert.match(html, /id="ai-key-modal"/);
  assert.match(html, /id="custom-image-upload"/);
  assert.match(html, /id="custom-image-preview"/);
  assert.match(html, /id="project-image-tray"/);
  assert.match(html, /id="project-image-list"/);
  assert.match(html, /data-creation-mode="manual"/);
  assert.match(html, /data-creation-mode="automatic"/);
  assert.match(html, /Görsel seç/);
  assert.match(html, /id="automatic-creation-form"/);
  assert.match(html, /id="manual-creation-form"/);
  assert.match(html, /id="niche-add-toggle"/);
  assert.match(html, /id="niche-custom"/);
  assert.match(css, /\.custom-image-upload\.hidden\{display:none!important\}/);
  assert.match(html, /id="flow-undo"/);
  assert.match(html, /id="flow-recovery"/);
  assert.match(html, /id="flow-project-export"/);
  assert.match(html, /id="flow-project-import-file"/);
  assert.match(html, /id="publish-kit-create"/);
  assert.match(html, /id="publish-cover-download"/);
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /orbit-local-analytics-v1/);
  assert.match(app, /getFlowRecordingProfile/);
  assert.match(app, /video\/webm;codecs=vp9,opus/);
  assert.match(app, /function demoSceneSvg/);
  assert.match(app, /orbit-welcome-seen-v1/);
  assert.match(app, /const flowCopyPresets/);
  assert.match(app, /function applyFlowCopy/);
  assert.match(app, /data-move-image/);
  assert.match(app, /addEventListener\("dragstart"/);
  assert.match(app, /addEventListener\("pointermove"/);
  assert.match(app, /function drawFlowImage/);
  assert.match(app, /transitionProgress/);
  assert.match(app, /flowTextStyle/);
  assert.match(app, /roundedCanvasRect/);
  assert.match(app, /function openFlowCrop/);
  assert.match(app, /scene\.cropZoom/);
  assert.match(app, /FLOW_AUTOSAVE_ID/);
  assert.match(app, /function restoreFlowSnapshot/);
  assert.match(app, /flowHistory\.length > 30/);
  assert.match(app, /orbit-studio-project/);
  assert.match(app, /function exportFlowProject/);
  assert.match(app, /function importFlowProject/);
  assert.match(app, /function decodeFlowImage/);
  assert.match(app, /function ensureAiConfigured/);
  assert.match(app, /function startStoryProgress/);
  assert.match(app, /function startServerRenderProgress/);
  assert.doesNotMatch(app, /Gemini hikâyeyi yazıyor/);
  assert.match(app, /state\.runtime\?\.deployment === "cloudflare"/);
  assert.match(app, /class="editor-asset-remove"/);
  assert.match(app, /customImagePreviewUrl/);
  assert.match(app, /function buildPublishKit/);
  assert.match(app, /canvas\)\.toBlob|flow-canvas.*toBlob/);
  assert.match(app, /const flowMessages/);
  assert.match(app, /function applyFlowLanguage/);
  assert.match(app, /function translateStaticTree/);
  assert.match(app, /staticTranslationRows/);
  assert.match(app, /Convierte tus fotos/);
  assert.match(html, /class="mobile-app-nav"/);
  assert.match(html, /id="mobile-flow-steps"/);
  assert.match(html, /value="linkedin"/);
  assert.match(html, /data-share-platform="Pinterest"/);
  assert.match(app, /const platformProfiles/);
  assert.match(mobile, /max-width:650px/);
  assert.match(mobile, /prefers-reduced-motion/);
  assert.doesNotMatch(app, /fetch\([^\n]*orbit-local-analytics/);
  assert.doesNotMatch(worker, /cache\.put\([^)]*\/api\//);
});

test("Cloudflare API security baseline exists", async () => {
  const [worker, migration, config, headers] = await Promise.all([
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0002_usage_quotas.sql", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8")
  ]);
  assert.match(worker, /SameSite=Strict/);
  assert.match(worker, /crypto\.subtle\.sign\("HMAC"/);
  assert.match(worker, /assertSameOrigin\(request\)/);
  assert.match(worker, /safeJsonBody\(request\)/);
  assert.match(worker, /consumeDailyQuota/);
  assert.match(worker, /content-security-policy/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS usage_daily/);
  assert.match(config, /"API_RATE_LIMITER"/);
  assert.match(headers, /Content-Security-Policy/);
  assert.match(headers, /X-Frame-Options: DENY/);
});
