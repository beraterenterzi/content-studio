import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("adımlı Türkçe stüdyo ekranı mevcut", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /Content Studio/);
  assert.match(html, /id="brand-home"/);
  assert.match(html, /id="close-settings"/);
  assert.match(html, /id="resume-project"/);
  assert.match(html, /aria-controls="workflow-nav"/);
  assert.match(html, /Wikimedia Commons/);
  assert.match(html, /id="youtube-trends-form"/);
  assert.match(html, /YouTube trendlerini keşfet/);
  assert.match(html, /value="youtubeUpload"/);
  assert.match(html, /Videoyu oluştur/);
  assert.match(html, /<section class="trend-discovery">/);
  assert.doesNotMatch(html, /<section class="trend-discovery product-deferred">/);
  assert.match(app, /const cloudDeployment = state\.runtime\?\.deployment === "cloudflare";/);
  assert.match(app, /selected === "cloudflare" && \(cloudDeployment \|\| promptImageGenerationAvailable\(\)\)/);
  assert.match(app, /Cloudflare AI bağlantısı bu sürümde Worker secret'larıyla yönetilir/);
});

test("çalışan proje alanları ve şablon seçimi keşfedilebilir kalır", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /<button class="nav-step" data-step="files">/);
  assert.match(html, /<button class="nav-step" data-step="trash">/);
  assert.match(html, /<button class="nav-step flow-nav" data-step="flow">/);
  assert.doesNotMatch(html, /data-step="(?:files|trash|flow)"[^>]*product-deferred/);
  assert.match(html, /data-flow-template="travel" aria-pressed="true"/);
  assert.match(html, /data-flow-template="education" aria-pressed="false"/);
  assert.match(html, /id="flow-template-name" aria-live="polite"/);
  assert.match(app, /button\.setAttribute\("aria-pressed", String\(selected\)\)/);
  assert.match(css, /\.ai-key-pro:disabled/);
});

test("hazır olmayan Pro teklifi satın alma akışı açmaz", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="ai-key-modal-pro"[^>]*disabled[^>]*aria-describedby="ai-key-pro-status"/);
  assert.match(html, /id="ai-key-pro-status"/);
  assert.match(app, /function updateAiKeyModalPro\(\)/);
  assert.match(app, /button\.disabled = !available/);
  assert.match(app, /if \(!state\.runtime\?\.billingConfigured\) return;/);
  assert.match(app, /"legal-modal"/);
});

test("paket yalnızca resmi Capacitor mobil bağımlılıklarını kullanıyor", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.type, "module");
  assert.deepEqual(Object.keys(pkg.dependencies || {}).sort(), [
    "@capacitor/android",
    "@capacitor/core"
  ]);
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
  assert.match(app, /FLOW_VIDEO_STORE_NAME = "flow-videos"/);
  assert.match(app, /navigator\.storage\.persist/);
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
  assert.match(html, /id="url-image-import"/);
  assert.match(html, /id="custom-image-preview"/);
  assert.match(html, /id="project-image-tray"/);
  assert.match(html, /id="project-image-list"/);
  assert.match(html, /data-creation-mode="manual"/);
  assert.match(html, /data-creation-mode="automatic"/);
  assert.match(html, /Görsel seç/);
  assert.match(html, /id="automatic-creation-form"/);
  assert.match(html, /id="automatic-image-count"/);
  assert.match(html, /name="automatic-visual-method" value="archive" checked/);
  assert.doesNotMatch(html, /name="automatic-visual-method" value="ai" checked/);
  assert.match(html, /id="automatic-goal"/);
  assert.match(html, /id="automatic-audience"/);
  assert.match(html, /id="automatic-tone"/);
  assert.match(html, /id="automatic-progress"[^>]+aria-live="polite"/);
  assert.match(html, /data-mobile-create/);
  assert.doesNotMatch(html, /class="create" data-mobile-step="flow"/);
  assert.match(html, /id="creator-checklist"/);
  assert.match(app, /const automaticApproval = true/);
  assert.match(app, /openControlAction\("automatic"\)/);
  assert.match(app, /style: \[document\.querySelector\("\.flow-narration"\)/);
  assert.match(app, /function selectDiverseArchiveAssets\(items, limit = 6\)/);
  assert.match(app, /function managedImageGenerationAvailable\(\)/);
  assert.match(app, /function promptImageGenerationAvailable\(\)/);
  assert.match(app, /state\.runtime\?\.deployment !== "cloudflare"/);
  assert.match(app, /textUsesManagedDemo/);
  assert.match(app, /AI görsel erişimi olmadığı için açık arşiv otomatik seçildi/);
  assert.match(app, /result\.interpretedAs/);
  assert.match(app, /function splitNarrationAcrossScenes\(text, sceneCount\)/);
  assert.match(app, /const textScene = scene;/);
  assert.match(app, /const captionPages = Array\.from/);
  assert.doesNotMatch(app, /return lines\.slice\(0, 4\)/);
  assert.match(app, /targetDuration \* weights\[index\] \/ totalWeight/);
  assert.match(app, /api\(`\/api\/ideas\/\$\{idea\.id\}\/assets`/);
  assert.match(app, /topic:storyBaseTopic, creativeBrief, assets:assets\.slice\(1\)/);
  assert.match(app, /await saveProjectEditor\(projectId\);/);
  assert.match(app, /topic\.required = !ownPhotos \|\| !canAnalyzePhotos/);
  assert.match(app, /archiveAssetCount > 1/);
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
  assert.match(app, /function prepareProductionForDeviceRender/);
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
  assert.match(app, /\/api\/youtube\/trends/);
  assert.match(app, /data-youtube-upload/);
  assert.match(app, /data-telegram-review/);
  assert.match(app, /canvas\)\.toBlob|flow-canvas.*toBlob/);
  assert.match(app, /const flowMessages/);
  assert.match(app, /function applyFlowLanguage/);
  assert.match(app, /function translateStaticTree/);
  assert.match(app, /staticTranslationRows/);
  assert.match(app, /Convierte tus fotos/);
  assert.match(html, /class="mobile-app-nav"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="connection-banner"/);
  assert.match(html, /id="mobile-flow-steps"/);
  assert.match(html, /id="flow-camera"[^>]*capture="environment"/);
  assert.match(html, /value="linkedin"/);
  assert.match(html, /data-share-platform="Pinterest"/);
  assert.match(app, /const platformProfiles/);
  assert.match(mobile, /max-width:650px/);
  assert.match(mobile, /prefers-reduced-motion/);
  assert.match(mobile, /safe-area-inset-top/);
  assert.match(mobile, /--mobile-nav-height:72px/);
  assert.match(mobile, /height:calc\(var\(--mobile-nav-height\) \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(mobile, /body\.keyboard-open \.mobile-app-nav/);
  assert.match(mobile, /body\.settings-open \.mobile-app-nav/);
  assert.match(mobile, /body\.keyboard-open \.settings-footer\{position:static\}/);
  assert.match(mobile, /\.flow-scene>div button,.flow-scene \[data-flow-drag\],.row-action\{width:44px/);
  assert.match(mobile, /\.project-image-list,.flow-templates,.flow-quick-steps/);
  assert.match(mobile, /max-height:calc\(100dvh - 24px/);
  assert.match(mobile, /\.ai-key-modal\{z-index:1300\}/);
  assert.match(app, /const settingsPanelObserver = new MutationObserver/);
  assert.match(app, /document\.body\.classList\.add\("keyboard-open"\)/);
  assert.match(app, /window\.visualViewport\?\.addEventListener\("resize"/);
  assert.doesNotMatch(app, /fetch\([^\n]*orbit-local-analytics/);
  assert.doesNotMatch(worker, /cache\.put\([^)]*\/api\//);
});

test("Cloudflare API security baseline exists", async () => {
  const [worker, migration, telegramMigration, mediaMigration, config, headers] = await Promise.all([
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0002_usage_quotas.sql", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0003_telegram_reviews.sql", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0004_cloud_media.sql", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8")
  ]);
  assert.match(worker, /request\.method === "PUT" && productionImages/);
  assert.match(worker, /seenAssets = new Set/);
  assert.match(worker, /idea\.topic = cleanText\(input\.topic, 180\) \|\| idea\.topic/);
  assert.match(worker, /SameSite=Strict/);
  assert.match(worker, /crypto\.subtle\.sign\("HMAC"/);
  assert.match(worker, /assertSameOrigin\(request\)/);
  assert.match(worker, /safeJsonBody\(request\)/);
  assert.match(worker, /consumeDailyQuota/);
  assert.match(worker, /content-security-policy/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS usage_daily/);
  assert.match(telegramMigration, /CREATE TABLE IF NOT EXISTS telegram_reviews/);
  assert.match(mediaMigration, /CREATE TABLE IF NOT EXISTS cloud_media/);
  assert.doesNotMatch(config, /"binding": "MEDIA"/);
  assert.match(worker, /x-telegram-bot-api-secret-token/);
  assert.match(worker, /assertPublicImageUrl/);
  assert.match(worker, /\/api\/media\/url-import/);
  assert.match(config, /"API_RATE_LIMITER"/);
  assert.match(headers, /Content-Security-Policy/);
  assert.match(headers, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(headers, /X-Frame-Options: DENY/);
});

test("açık arşiv araması görsel niyetini yorumlar ve güvenli kaynak fallback'i uygular", async () => {
  const [server, worker, app] = await Promise.all([
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8")
  ]);
  for (const backend of [server, worker]) {
    assert.match(backend, /function buildArchiveQueryPlan\(value\)/);
    assert.match(backend, /"solar system planets"/);
    assert.match(backend, /"personal growth journey sunrise"/);
    assert.match(backend, /requestedSource === "nasa" && !queryPlan\.spaceRelated/);
    assert.match(backend, /sourceUsed = "nasa\+wikimedia"/);
    assert.match(backend, /interpretedAs: queryPlan\.interpretedAs/);
  }
  assert.match(app, /search\.interpretationMode === "visual-intent" \? "görsel niyetiyle" : "anahtar kelimelerle"/);
  assert.match(app, /Kullanım kontrolü gerekli/);
  assert.match(app, /result\.interpretationMode === "visual-intent"/);
  assert.match(app, /data-media-select="\$\{item\.assetId\}"[^>]+\$\{item\.riskFlags\.length \? "disabled"/);
});

test("Açı Laboratuvarı retention sözleşmesini uçtan uca koruyor", async () => {
  const [app, css, server, worker] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8")
  ]);
  assert.match(app, /const editorialAngles/);
  assert.match(app, /data-angle-lab/);
  assert.match(app, /target\.dataset\.ideaAngle.*\/angle/);
  assert.match(app, /function retentionMapMarkup/);
  assert.match(css, /\.angle-grid/);
  assert.match(css, /\.retention-map/);
  assert.match(server, /const EDITORIAL_ANGLES/);
  assert.match(server, /function retentionBrief/);
  assert.match(server, /visualQuery must be one or two simple English words/);
  assert.match(server, /ideaAngle/);
  assert.match(worker, /const EDITORIAL_ANGLES/);
  assert.match(worker, /function retentionBrief/);
  assert.match(worker, /idea\.angle \|\|= editorialAngle/);
  assert.match(worker, /"idea-angle"/);
});
test("Kullanıcı fotoğrafları otomatik akışta birincil kaynak oluyor", async () => {
  const [html, app, server, worker] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="automatic-topic-label"/);
  assert.match(html, /id="automatic-photo-ai-note"/);
  assert.match(html, /id="automatic-story-mode-field" class="hidden"/);
  assert.match(app, /function updateAutomaticPhotoMode/);
  assert.match(app, /topic\.required = !ownPhotos/);
  assert.match(app, /selectedFiles\.length \? "upload"/);
  assert.match(app, /imageInputs: analyzePhotos \? imageInputs : \[\]/);
  assert.match(app, /maxDimension: 768/);
  assert.match(server, /function sanitizeVisionInputs/);
  assert.match(server, /type: "input_image", image_url: image\.dataUrl/);
  assert.match(server, /type: "image", data: image\.data, mime_type: image\.mediaType/);
  assert.match(server, /input: prompt,\s+response_format:/);
  assert.match(worker, /safeJsonBody\(request, 5 \* 1024 \* 1024\)/);
  assert.match(worker, /function sanitizeVisionInputs/);
  assert.match(worker, /type: "input_image", image_url: image\.dataUrl/);
  assert.match(worker, /type: "image", data: image\.data, mime_type: image\.mediaType/);
});
test("Manuel projeler anlatım metnini sesli rendera taşıyor", async () => {
  const [app, server, worker, render] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../src/render_video.py", import.meta.url), "utf8")
  ]);
  assert.match(app, /let flowNarrationContext/);
  assert.match(app, /function narrationLanguageCode/);
  assert.match(app, /flowNarrationContext\.contentLanguage \|\| state\.settings\.contentLanguage/);
  assert.match(app, /"x-orbit-ai-key":geminiKey/);
  assert.match(app, /checked = Boolean\(flowNarrationContext\.text\)/);
  assert.doesNotMatch(app, /Video sessiz oluşturuldu/);
  assert.match(server, /function inferNarrationLanguage/);
  assert.match(server, /gemini-3\.1-flash-tts-preview/);
  assert.match(server, /contentLanguage: normalizeContentLanguage\(input\.contentLanguage, inferNarrationLanguage\(narration/);
  assert.match(worker, /function generateGeminiSpeech/);
  assert.match(worker, /gemini-3\.1-flash-tts-preview/);
  assert.match(worker, /contentLanguage: normalizeContentLanguage\(input\.contentLanguage, inferNarrationLanguage\(narration/);
  assert.match(worker, /function cleanSpeechText/);
  assert.match(server, /function cleanSpeechText/);
  assert.match(worker, /cleanSpeechText\(text, 4000\)/);
  assert.match(server, /cleanSpeechText\(text, 4000\)/);
  assert.match(worker, /speech_config:\s*\[\{ voice: "Sulafat" \}\]/);
  assert.match(server, /speech_config:\s*\[\{ voice:"Sulafat" \}\]/);
  assert.match(worker, /seslendirmesi için yönetilen ses servisi gerekli/);
  assert.doesNotMatch(worker, /else if \(lang === "tr"\) \{\s+try \{\s+const result = await env\.AI\.run/);
  assert.match(render, /rate="0%"/);
  assert.match(app, /const flowNarrationAudioCache = new Map\(\)/);
  assert.match(app, /audioContext\.decodeAudioData\(audioBytes\.slice\(0\)\)/);
});

test("ana ürün yüzeyi üretim yollarını ve durumlarını anlaşılır tutar", async () => {
  const [html, app, css, mobile] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8"),
    readFile(new URL("../public/mobile.css", import.meta.url), "utf8")
  ]);
  assert.match(css, /\.product-deferred\{display:none!important\}/);
  assert.match(html, /nav-step" data-step="files"/);
  assert.match(html, /flow-nav" data-step="flow"/);
  assert.doesNotMatch(html, /(?:nav-step|flow-nav) product-deferred" data-step="(?:files|trash|flow)"/);
  assert.match(html, /creation-more product-deferred/);
  assert.match(html, /<section class="trend-discovery">/);
  assert.doesNotMatch(html, /trend-discovery product-deferred/);
  assert.match(html, /id="workflow-toggle"[^>]+aria-expanded="false"[^>]+aria-controls="workflow-nav"/);
  assert.match(html, /id="workflow-nav" class="workflow-nav" hidden aria-hidden="true"/);
  assert.match(app, /function setWorkflowNavigation\(open\)/);
  assert.match(app, /navigation\.hidden = !open;/);
  assert.match(app, /const open = !navigation\.classList\.contains\("open"\);/);
  assert.doesNotMatch(app, /\$\("#workflow-toggle"\)\.addEventListener\("click", \(\) => openControlAction\("automatic"\)\);/);
  assert.doesNotMatch(css, /#workflow-nav\{display:none!important\}/);
  assert.match(css, /#workflow-nav\[hidden\]\{display:none\}/);
  assert.doesNotMatch(css, /\.control-center,#dashboard-stats/);
  assert.match(css, /#legal-enter:disabled\{background:#e5e3ea/);
  assert.match(mobile, /grid-template-columns:minmax\(0,1fr\) 80px minmax\(0,1fr\)/);
  assert.match(html, /data-view="files"/);
  assert.match(html, /data-go-step="trash">Çöp kutusu/);
  assert.doesNotMatch(app, /<em>\$\{angle\.score\}<\/em>/);
});

test("proje dili metin, sahne ve ses sözleşmesine taşınıyor", async () => {
  const [html, app, server, worker] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="project-content-language"/);
  assert.match(html, /value="Spanish">Español/);
  assert.match(html, /value="German">Deutsch/);
  assert.match(app, /const CONTENT_LANGUAGE_CODES/);
  assert.match(app, /contentLanguage:selectedContentLanguage\(\)/);
  assert.match(app, /if \(configuredKey\) return CONTENT_LANGUAGE_CODES\[configuredKey\]/);
  for (const backend of [server, worker]) {
    assert.match(backend, /const CONTENT_LANGUAGES/);
    assert.match(backend, /normalizeContentLanguage\(input\.contentLanguage/);
    assert.match(backend, /LANGUAGE_NAMES\[lang\]/);
  }
  assert.match(server, /Create a completely original content package in natural \$\{settings\.contentLanguage/);
  assert.match(worker, /Create an original, publish-ready short-form video story entirely in natural \$\{targetLanguage\}/);
  assert.match(server, /const EDGE_VOICES/);
  assert.match(server, /EDGE_VOICES\[item\.contentLanguage\]/);
});
test("anahtarsız Demo yönetilen görseli kullanır, diğer ücretsiz yollar arşivle başlar", async () => {
  const [html, app, css, worker, server] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /name="automatic-visual-method" value="archive" checked/);
  assert.match(html, /name="automatic-visual-method" value="ai"/);
  assert.doesNotMatch(html, /<select id="automatic-visual-method"/);
  assert.match(html, /doğrulanmış ücretsiz hesabınla otomatik akışı bir kez dene/);
  assert.match(html, /Cihazda video üretimi ücretsizdir/);
  assert.match(html, /Gelişmiş: Kendi AI hesabımı bağla/);
  assert.match(html, /Atölye Pro/);
  assert.match(html, /id="pro-upgrade"/);
  assert.match(html, /id="demo-access-status"/);
  assert.match(css, /\.automatic-visual-choices/);
  assert.match(css, /\.access-plans/);
  assert.match(app, /function managedImageGenerationAvailable/);
  assert.match(app, /resumeAction === "prompt-image" \? promptImageGenerationAvailable\(\) : managedImageGenerationAvailable\(\)/);
  assert.match(app, /\(generationRequest \|\| imageGenerationRequest\) && hasReadyAiCredential\(aiProvider\)/);
  assert.match(app, /function resumePendingAiAction/);
  assert.match(worker, /async function consumeDemoTrial/);
  assert.match(worker, /@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast/);
  assert.match(worker, /demoAvailable = Boolean\(env\.AI && workspace\.user\?\.email_verified_at\) && state\.runtime\.demo\.used < state\.runtime\.demo\.limit/);
  assert.match(worker, /if \(!env\.AI\) throw Object\.assign/);
  assert.match(worker, /mode: "orbit-demo", model: "Content Studio Deneme"/);
  assert.match(worker, /function validateContentPackage/);
  assert.match(worker, /"viewerPromise", "curiosityGap"/);
  assert.match(worker, /required: \["seconds", "type", "text", "visualQuery", "visualRole", "changeReason"\]/);
  assert.match(worker, /minItems: 6/);
  assert.match(worker, /type: "json_schema", name: "video_content_package", strict: true/);
  assert.match(server, /const providerSettings =/);
  assert.match(server, /DEFAULT_TEXT_MODELS\[selectedProvider\]/);
  assert.match(app, /x-orbit-ai-provider/);
  assert.match(worker, /request\.headers\.get\("x-orbit-ai-provider"\)/);
  assert.match(server, /req\.headers\["x-orbit-ai-provider"\]/);
  assert.match(worker, /cloudflare-image\$\//);
  assert.match(worker, /async function createManagedImageAsset/);
  assert.match(worker, /typeof output\?\.image === "string"/);
  assert.match(worker, /"image_generate", 20/);
  assert.match(server, /demoAvailable: true/);
  assert.match(server, /generatedContent = !selectedProviderReady/);
});
test("mobil alt navigasyon üç gerçek hedefle Oluştur'u merkezde tutar", async () => {
  const [html, mobile] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/mobile.css", import.meta.url), "utf8")
  ]);
  const nav = html.match(/<nav class="mobile-app-nav"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.equal((nav.match(/<button/g) || []).length, 3);
  assert.match(nav, /data-mobile-step="dashboard"[\s\S]*data-mobile-create[\s\S]*data-mobile-step="projects"/);
  assert.doesNotMatch(nav, /data-mobile-settings|data-mobile-step="files"/);
  assert.match(mobile, /grid-template-columns:minmax\(0,1fr\) 80px minmax\(0,1fr\)/);
  assert.match(mobile, /#settings-toggle\{display:grid\}/);
});
test("Content Studio marka kimliği kullanıcı yüzeyinde tutarlı", async () => {
  const [html, app, manifestText, configText, worker, render, polish] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../capacitor.config.json", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../src/render_video.py", import.meta.url), "utf8"),
    readFile(new URL("../public/polish.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /<title>Content Studio<\/title>/);
  assert.doesNotMatch(html, /Orbit Content Factory|ORBIT CONTENT FACTORY/);
  assert.match(html, /CONTENT STUDIO/);
  assert.match(html, /href="\/polish\.css"/);
  assert.match(html, /accept="\.terzi,\.orbit,application\/json"/);
  assert.match(app, /Fikrinden düzenlenebilir Shorts taslağına/);
  assert.doesNotMatch(app, /Orbit Content Factory|Orbit Studio/);
  assert.equal(JSON.parse(manifestText).name, "Content Studio");
  assert.equal(JSON.parse(manifestText).short_name, "Content Studio");
  assert.equal(JSON.parse(configText).appName, "Content Studio");
  assert.match(worker, /Content Studio Görsel AI/);
  assert.match(render, /"Content Studio"/);
  assert.match(polish, /prefers-reduced-motion:reduce/);
  assert.match(polish, /Product UI pass: remove the synthetic/);
  assert.match(polish, /--primary:#18181b/);
  assert.match(polish, /--purple:#18181b/);
  assert.match(polish, /Neutral palette pass: the interface uses charcoal and gray only/);
  assert.match(polish, /Complete the neutral system across secondary journeys/);
  assert.match(polish, /\.switch-row input:checked\+i\{background:#18181b!important\}/);
  assert.match(polish, /\.dashboard-hero,.hero-search,.story-visual-panel,.editor-next/);
});
test("Content Studio URL ve sade başlangıç akışı", async () => {
  const [html, app, css, capacitorText, wranglerText] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8"),
    readFile(new URL("../capacitor.config.json", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);
  assert.equal(JSON.parse(wranglerText).name, "terzi");
  assert.equal(JSON.parse(capacitorText).server.url, "https://terzi.orbitvideolab.workers.dev");
  assert.match(html, /Content Studio hazırlasın/);
  assert.match(html, /İçeriğim hazır/);
  assert.match(html, /name="automatic-visual-method" value="archive" checked/);
  assert.match(html, /class="ai-provider-cards"/);
  assert.match(html, /data-ai-provider="gemini"[\s\S]*ÖNERİLEN/);
  assert.match(html, /class="model-advanced"/);
  assert.match(app, /step === "source" && !creationMode/);
  assert.match(app, /projectId:productionId/);
  assert.doesNotMatch(css, /#workflow-nav\{display:none!important\}/);
  assert.match(css, /#automatic-story-mode-field\{display:none!important\}/);
});
test("editör yalnızca kullanılabilir eylemleri gösteriyor", async () => {
  const [app, html, worker, server] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /SON KONTROL/);
  assert.match(app, /const telegramButton = state\.runtime\?\.telegramConfigured/);
  assert.match(app, /state\.runtime\?\.deployment !== "cloudflare"/);
  assert.doesNotMatch(app, /NASA image|tr-TR-AhmetNeural/);
  assert.match(worker, /contentLanguage: "Turkish"/);
  assert.match(server, /contentLanguage: "Turkish"/);
  assert.match(worker, /if \(geminiKey\)/);
  assert.match(html, /sahne metinleri ses üretimi için Content Studio sunucusuna/);
  assert.doesNotMatch(html, /id="flow-narration-enabled" type="checkbox" checked/);
});

test("BYOK anahtarları metin ve görsel üretiminde aynı sağlayıcıya yönlenir", async () => {
  const [app, worker] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8")
  ]);
  assert.match(app, /function readyImageProvider\(\)/);
  assert.match(app, /function configuredTextProvider\(\)/);
  assert.match(app, /\(generationRequest \|\| imageGenerationRequest\) && hasReadyAiCredential\(aiProvider\)/);
  assert.match(app, /kind === "text" && !configured && state\.runtime\?\.demoAvailable/);
  assert.match(app, /openAiKeyModal\(provider\)/);
  assert.match(app, /Boolean\(readyImageProvider\(\)\) \|\| localImageProvider/);
  assert.match(worker, /model: "gemini-3\.1-flash-image"/);
  assert.match(worker, /model: "gpt-image-2\.5-flare"/);
  assert.match(worker, /if \(!byokImage\) requirePro\(workspace\)/);
  assert.match(worker, /createManagedImageAsset\(env, workspace\.id, item, subject, imageProvider, imageKey\)/);
});

test("arşivden hikâye seçimi kuyruğa bırakılmadan AI üretimini açar", async () => {
  const [app, html] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8")
  ]);
  assert.match(app, /function generateImportedArchiveStory\(idea, button\)/);
  assert.match(app, /api\(`\/api\/ideas\/\$\{preparedIdea\.id\}\/generate`/);
  assert.match(app, /await refresh\(\);\s*openEditor\(production\.id\)/);
  assert.match(app, /ensureAiConfigured\("text", resumeAction\)/);
  assert.match(app, /ensureAiConfigured\("text", "archive-story-batch"\)/);
  assert.match(app, /Kaynak korundu; Hikâye ekranından tekrar deneyebilirsin/);
  assert.match(html, /Seçilenlerle hikâye oluştur/);
});

test("seçilen içerik dili sağlayıcı promptunda açık sözleşmeyle korunur", async () => {
  const [app, local, worker] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8")
  ]);
  assert.match(local, /LANGUAGE CONTRACT: Write every user-facing field entirely in natural/);
  assert.match(worker, /LANGUAGE CONTRACT: Write every user-facing field entirely in natural/);
  assert.doesNotMatch(app, /boş\|eksik\|geçerli içerik\|model\|502\|503\|500/);
});

test("plan deneyimi API anahtarını teknik olmayan kullanıcıdan gizler", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/style.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /Fikrinden veya fotoğraflarından düzenlenebilir Shorts taslağı/);
  assert.match(html, /doğrulanmış ücretsiz hesapla bir tam otomatik Shorts taslağını dene/);
  assert.match(html, /class="advanced-ai-connection"/);
  assert.doesNotMatch(html, /Kendi anahtarınla ücretsiz başla/);
  assert.equal((html.match(/data-ai-provider=/g) || []).length, 3);
  assert.match(html, /Google Gemini[\s\S]*Hikâye · Görsel · Fotoğraf analizi · Ses/);
  assert.match(html, /id="text-model"/);
  assert.match(html, /class="model-advanced"/);
  assert.match(app, /function renderAiProviderCards\(\)/);
  assert.match(app, /aiProviderCapabilities/);
  assert.match(app, /state\.runtime\?\.deployment === "cloudflare"/);
  assert.match(app, /openControlAction\("automatic"\)/);
  const welcomeHandler = app.match(/\$\("#welcome-guide-demo"\)\.addEventListener[\s\S]*?\n\}\);/)?.[0] || "";
  assert.match(welcomeHandler, /openControlAction\(automatic \? "automatic" : "manual"\)/);
  assert.match(welcomeHandler, /openAccountModal\("register"\)/);
  assert.doesNotMatch(welcomeHandler, /loadFlowDemo/);
  assert.match(css, /\.ai-provider-cards/);
  assert.match(css, /\.visually-hidden/);
  assert.match(css, /\.advanced-ai-connection/);
});

test("Gemini 3.6 Flash ve Interactions API uçtan uca kullanılır", async () => {
  const [app, local, worker, envExample] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/server.js", import.meta.url), "utf8"),
    readFile(new URL("../cloudflare/worker.js", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8")
  ]);
  for (const source of [app, local, worker, envExample]) {
    assert.match(source, /gemini-3\.6-flash/);
    assert.doesNotMatch(source, /gemini-2\.5-flash/);
  }
  assert.match(local, /response_format:\s*\{\s*type: "text"/);
  assert.match(worker, /response_format:\s*\{\s*type: "text"/);
  assert.doesNotMatch(local, /:generateContent/);
});
