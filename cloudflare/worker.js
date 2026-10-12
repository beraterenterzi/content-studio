var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// cloudflare/worker.js
var initialState = {
  settings: {
    niche: "technology",
    audience: "18-34 yaş, Türkçe konuşan meraklı izleyiciler",
    format: "YouTube Shorts",
    targetSeconds: 45,
    contentLanguage: "Turkish",
    uiLanguage: "tr",
    contentProfile: "general",
    visualStyle: "documentary",
    targetAgeGroups: ["18-24", "25-34"],
    rules: {
      humanApproval: true,
      childSafe: false,
      factualOnly: true,
      includeCta: false,
      burnCaptions: true
    },
    provider: "gemini",
    textModel: "gemini-3.6-flash"
  },
  ideas: [],
  productions: [],
  trash: [],
  runtime: {
    deployment: "cloudflare",
    geminiConfigured: false,
    openAiConfigured: false,
    anthropicConfigured: false,
    youtubeConfigured: false,
    r2Configured: false,
    cloudflareConfigured: false,
    cloudflareAccountId: "",
    managedImageGeneration: false,
    demoAvailable: false,
    demo: { used: 0, limit: 1 },
    account: null,
    entitlement: { plan: "guest", status: "active" }
  }
};
var workspaceSnapshots = /* @__PURE__ */ new WeakMap();
var stateCollections = ["ideas", "productions", "trash"];
const TEXT_MODELS = {
  gemini: ["gemini-3.6-flash"],
  openai: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"],
  claude: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8", "claude-fable-5"]
};
const DEFAULT_TEXT_MODELS = {
  gemini: "gemini-3.6-flash",
  openai: "gpt-5.6-terra",
  claude: "claude-sonnet-5"
};
const CONTENT_LANGUAGES = {
  Turkish: "tr", English: "en", Spanish: "es", German: "de", French: "fr",
  Portuguese: "pt", Italian: "it", Arabic: "ar", Hindi: "hi", Chinese: "zh",
  Japanese: "ja", Korean: "ko", Russian: "ru", Dutch: "nl", Polish: "pl",
  Indonesian: "id", Vietnamese: "vi", Ukrainian: "uk", Thai: "th"
};
function normalizeContentLanguage(value, fallback = "English") {
  return Object.prototype.hasOwnProperty.call(CONTENT_LANGUAGES, value) ? value : fallback;
}
__name(normalizeContentLanguage, "normalizeContentLanguage");
const LANGUAGE_NAMES = Object.fromEntries(Object.entries(CONTENT_LANGUAGES).map(([name, code]) => [code, name]));
const MELO_LANGUAGES = new Set(["en", "es", "fr", "zh", "ja", "ko"]);
const ANALYTICS_EVENTS = new Set([
  "creation_started", "account_started", "account_created", "story_generated", "story_failed",
  "voice_generated", "voice_failed", "render_started", "render_completed", "render_failed",
  "video_downloaded", "paywall_viewed", "checkout_started", "checkout_returned"
]);
var CLOUD_MEDIA_PART_SIZE = 8 * 1024 * 1024;
var CLOUD_MEDIA_FILE_LIMIT = 512 * 1024 * 1024;
var CLOUD_MEDIA_WORKSPACE_LIMIT = 2 * 1024 * 1024 * 1024;
function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
__name(jsonEqual, "jsonEqual");
function stateConflict() {
  const error = new Error("Bu kayıt başka bir işlemde değişti. Son durumu yükleyip tekrar dene; mevcut kayıtlar korundu.");
  error.status = 409;
  error.code = "STATE_CONFLICT";
  return error;
}
__name(stateConflict, "stateConflict");
function mergeStateRecords(base, desired, latest) {
  const before = new Map(base.map((item) => [item.id, item]));
  const after = new Map(desired.map((item) => [item.id, item]));
  const current = new Map(latest.map((item) => [item.id, item]));
  const changed = new Set([...before.keys(), ...after.keys()].filter((id) => !jsonEqual(before.get(id), after.get(id))));
  for (const id of changed) {
    if (!jsonEqual(current.get(id), before.get(id)) && !jsonEqual(current.get(id), after.get(id))) throw stateConflict();
  }
  const result = latest.filter((item) => !changed.has(item.id));
  for (const item of desired) if (changed.has(item.id) || !before.has(item.id)) {
    const index = result.findIndex((currentItem) => currentItem.id === item.id);
    if (index >= 0) result[index] = item; else result.unshift(item);
  }
  return result;
}
__name(mergeStateRecords, "mergeStateRecords");
var SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "cross-origin-opener-policy": "same-origin",
  "content-security-policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images-assets.nasa.gov https://*.wikimedia.org https://*.wikipedia.org https://i.ytimg.com",
    "media-src 'self' blob: data:",
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com"
  ].join("; ")
};
function json(value, status = 200, headers = {}) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
      ...headers
    }
  });
}
__name(json, "json");
function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64Url, "base64Url");
function bytesBase64(bytes) {
  let binary = "";
  const chunk = 32768;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(binary);
}
__name(bytesBase64, "bytesBase64");
function bytesHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(bytesHex, "bytesHex");
function randomToken(byteLength = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}
__name(randomToken, "randomToken");
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return bytesHex(new Uint8Array(digest));
}
__name(sha256Hex, "sha256Hex");
async function derivePasswordHash(password, saltHex, iterations = 310000) {
  const salt = Uint8Array.from(String(saltHex).match(/.{2}/g) || [], (pair) => Number.parseInt(pair, 16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return bytesHex(new Uint8Array(bits));
}
__name(derivePasswordHash, "derivePasswordHash");
function normalizeEmail(value) {
  const email = cleanText(value, 254).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw Object.assign(new Error("Geçerli bir e-posta adresi gir"), { status: 400 });
  }
  return email;
}
__name(normalizeEmail, "normalizeEmail");
function assertPassword(value) {
  const password = String(value || "");
  if (password.length < 12 || password.length > 128) {
    throw Object.assign(new Error("Parola 12-128 karakter arasında olmalı"), { status: 400 });
  }
  return password;
}
__name(assertPassword, "assertPassword");
function authCookie(token, maxAge = 30 * 24 * 60 * 60) {
  return `terzi_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
__name(authCookie, "authCookie");
async function authForRequest(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie.match(/(?:^|;\s*)terzi_session=([^;]+)(?:;|$)/i)?.[1];
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  const tokenHash = await sha256Hex(raw);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = await env.DB.prepare(
    `SELECT u.id, u.email_display, u.email_verified_at, s.id AS session_id,
            COALESCE(e.plan, 'free') AS plan, COALESCE(e.status, 'active') AS entitlement_status,
            e.current_period_end, e.provider_customer_id, e.provider_subscription_id
     FROM auth_sessions s JOIN users u ON u.id = s.user_id
     LEFT JOIN entitlements e ON e.user_id = u.id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`
  ).bind(tokenHash, now).first();
  if (!user) return null;
  await env.DB.prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE id = ? AND last_seen_at < ?")
    .bind(now, user.session_id, new Date(Date.now() - 15 * 60 * 1000).toISOString()).run();
  return user;
}
__name(authForRequest, "authForRequest");
async function createAuthSession(env, userId) {
  const rawToken = randomToken(32);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO auth_sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256Hex(rawToken), now, now, expiresAt).run();
  return { rawToken, expiresAt };
}
__name(createAuthSession, "createAuthSession");
function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index % Math.max(1, a.length)) || 0) ^ (b.charCodeAt(index % Math.max(1, b.length)) || 0);
  }
  return difference === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
async function authenticateUser(env, email, password) {
  const user = await env.DB.prepare(
    "SELECT id, email_display, email_verified_at, password_hash, password_salt, password_iterations FROM users WHERE email_normalized = ?"
  ).bind(email).first();
  const fallbackSalt = "00000000000000000000000000000000";
  const candidate = await derivePasswordHash(password, user?.password_salt || fallbackSalt, Number(user?.password_iterations || 310000));
  return user && constantTimeEqual(candidate, user.password_hash) ? user : null;
}
__name(authenticateUser, "authenticateUser");
async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return { configured: false, success: true };
  if (!token || String(token).length > 2048) {
    throw Object.assign(new Error("Güvenlik doğrulamasını tamamla"), { status: 400, code: "TURNSTILE_REQUIRED" });
  }
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: String(token),
      remoteip: request.headers.get("cf-connecting-ip") || undefined,
      idempotency_key: crypto.randomUUID()
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw Object.assign(new Error("Güvenlik doğrulaması başarısız oldu; tekrar dene"), { status: 400, code: "TURNSTILE_FAILED" });
  }
  const expectedHostname = (() => { try { return new URL(publicOrigin(request, env)).hostname; } catch { return ""; } })();
  if (expectedHostname && result.hostname && result.hostname !== expectedHostname) {
    throw Object.assign(new Error("Güvenlik doğrulaması bu alan adı için geçerli değil"), { status: 400, code: "TURNSTILE_HOST_MISMATCH" });
  }
  return { configured: true, success: true };
}
__name(verifyTurnstile, "verifyTurnstile");
async function sendTransactionalEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return { configured: false, sent: false };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html })
  });
  if (!response.ok) throw Object.assign(new Error("E-posta şu anda gönderilemedi; daha sonra tekrar dene"), { status: 503, code: "EMAIL_DELIVERY_FAILED" });
  return { configured: true, sent: true };
}
__name(sendTransactionalEmail, "sendTransactionalEmail");
async function createAuthActionToken(env, userId, purpose, ttlMinutes) {
  const rawToken = randomToken(32);
  const now = new Date();
  await env.DB.prepare("DELETE FROM auth_action_tokens WHERE expires_at < ? OR used_at < ?")
    .bind(now.toISOString(), new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()).run();
  await env.DB.prepare(
    `INSERT INTO auth_action_tokens (id, user_id, purpose, token_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), userId, purpose, await sha256Hex(rawToken), now.toISOString(), new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()).run();
  return rawToken;
}
__name(createAuthActionToken, "createAuthActionToken");
async function consumeAuthActionToken(env, rawToken, purpose) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(rawToken || ""))) return null;
  const now = new Date().toISOString();
  return env.DB.prepare(
    `UPDATE auth_action_tokens SET used_at = ?
     WHERE token_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
     RETURNING user_id`
  ).bind(now, await sha256Hex(rawToken), purpose, now).first();
}
__name(consumeAuthActionToken, "consumeAuthActionToken");
function publicOrigin(request, env) {
  const configured = String(env.APP_ORIGIN || "").replace(/\/$/, "");
  return /^https:\/\//.test(configured) ? configured : new URL(request.url).origin;
}
__name(publicOrigin, "publicOrigin");
function launchReadiness(env) {
  const checks = {
    managedAi: Boolean(env.AI),
    managedSpeech: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY),
    billing: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PRO && env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
    abuseProtection: Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY),
    legalIdentity: Boolean(env.BUSINESS_NAME && env.SUPPORT_EMAIL)
  };
  return { ready: Object.values(checks).every(Boolean), checks };
}
__name(launchReadiness, "launchReadiness");
function hasProAccess(workspace) {
  return Boolean(workspace.user && workspace.user.plan === "pro" && ["active", "trialing"].includes(workspace.user.entitlement_status));
}
__name(hasProAccess, "hasProAccess");
function requireAccount(workspace) {
  if (!workspace.user) throw Object.assign(new Error("Devam etmek için ücretsiz bir Content Studio hesabı oluştur"), { status: 401, code: "ACCOUNT_REQUIRED" });
  return workspace.user;
}
__name(requireAccount, "requireAccount");
function requirePro(workspace) {
  requireAccount(workspace);
  if (!hasProAccess(workspace)) throw Object.assign(new Error("Bu yönetilen özellik Atölye Pro üyeliği gerektirir"), { status: 402, code: "PRO_REQUIRED" });
}
__name(requirePro, "requirePro");
async function consumeLifetimeQuota(env, workspaceId, action, limit) {
  const result = await env.DB.prepare(
    `INSERT INTO usage_daily (workspace_id, usage_day, action, usage_count, updated_at)
     VALUES (?, 'lifetime', ?, 1, ?)
     ON CONFLICT(workspace_id, usage_day, action) DO UPDATE SET
       usage_count = usage_count + 1, updated_at = excluded.updated_at
     WHERE usage_count < ? RETURNING usage_count`
  ).bind(workspaceId, action, (/* @__PURE__ */ new Date()).toISOString(), limit).first();
  if (!result) throw Object.assign(new Error("Ücretsiz kullanım sınırına ulaştın; Atölye Pro ile devam edebilirsin"), { status: 402, code: "PRO_REQUIRED" });
  return { used: result.usage_count, limit };
}
__name(consumeLifetimeQuota, "consumeLifetimeQuota");
async function refundLifetimeQuota(env, workspaceId, action) {
  await env.DB.prepare(
    `UPDATE usage_daily SET usage_count = MAX(usage_count - 1, 0), updated_at = ?
     WHERE workspace_id = ? AND usage_day = 'lifetime' AND action = ? AND usage_count > 0`
  ).bind((/* @__PURE__ */ new Date()).toISOString(), workspaceId, action).run();
}
__name(refundLifetimeQuota, "refundLifetimeQuota");
async function stripeCall(env, path, form) {
  if (!env.STRIPE_SECRET_KEY) throw Object.assign(new Error("Ödeme sistemi henüz yapılandırılmadı"), { status: 503 });
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "stripe-version": "2025-06-30.basil"
    },
    body: new URLSearchParams(form)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error?.message || "Ödeme sağlayıcısı işlemi tamamlayamadı"), { status: 502 });
  return result;
}
__name(stripeCall, "stripeCall");
async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const parts = String(signatureHeader).split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!/^\d+$/.test(timestamp || "") || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !signatures.length) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = bytesHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`))));
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}
__name(verifyStripeWebhook, "verifyStripeWebhook");
async function sessionKey(request, env) {
  let secret = env.SESSION_SECRET;
  const hostname = new URL(request.url).hostname;
  if (!secret && ["localhost", "127.0.0.1"].includes(hostname)) {
    secret = "orbit-local-development-only-secret";
  }
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(sessionKey, "sessionKey");
async function signWorkspace(id, key) {
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return `${id}.${base64Url(new Uint8Array(signature))}`;
}
__name(signWorkspace, "signWorkspace");
async function verifyWorkspace(value, key) {
  const match = String(value || "").match(/^([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/i);
  if (!match) return null;
  const expected = await signWorkspace(match[1], key);
  return expected === value ? match[1] : null;
}
__name(verifyWorkspace, "verifyWorkspace");
async function workspaceCookie(id, key) {
  const value = await signWorkspace(id, key);
  return `orbit_workspace=${value}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`;
}
__name(workspaceCookie, "workspaceCookie");
async function workspaceFor(request, env) {
  const user = await authForRequest(request, env);
  if (user) {
    let membership = await env.DB.prepare(
      "SELECT workspace_id FROM workspace_members WHERE user_id = ? ORDER BY created_at LIMIT 1"
    ).bind(user.id).first();
    if (!membership) {
      const workspaceId = crypto.randomUUID();
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO workspaces (id, created_at, last_seen_at) VALUES (?, ?, ?)").bind(workspaceId, createdAt, createdAt),
        env.DB.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)").bind(workspaceId, user.id, createdAt)
      ]);
      membership = { workspace_id: workspaceId };
    }
    await env.DB.prepare("UPDATE workspaces SET last_seen_at = ? WHERE id = ?")
      .bind((/* @__PURE__ */ new Date()).toISOString(), membership.workspace_id).run();
    return { id: membership.workspace_id, isNew: false, user };
  }
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)orbit_workspace=([^;]+)(?:;|$)/i);
  const key = await sessionKey(request, env);
  let verifiedId = await verifyWorkspace(match?.[1], key);
  if (verifiedId) {
    const owned = await env.DB.prepare("SELECT 1 AS owned FROM workspace_members WHERE workspace_id = ? LIMIT 1")
      .bind(verifiedId).first();
    if (owned) verifiedId = null;
  }
  const id = verifiedId || crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare(
    `INSERT INTO workspaces (id, created_at, last_seen_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`
  ).bind(id, now, now).run();
  return { id, key, isNew: !verifiedId };
}
__name(workspaceFor, "workspaceFor");
async function cookieHeaders(workspace) {
  if (workspace.user) return {};
  // Refresh the signed session on every authenticated response so active users
  // do not lose their workspace after the original 30-day max age.
  return { "set-cookie": await workspaceCookie(workspace.id, workspace.key) };
}
__name(cookieHeaders, "cookieHeaders");
function assertSameOrigin(request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    const error = new Error("Cross-origin request rejected");
    error.status = 403;
    throw error;
  }
}
__name(assertSameOrigin, "assertSameOrigin");
async function safeJsonBody(request, maxBytes = 32 * 1024) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    const error = new Error("Request body is too large");
    error.status = 413;
    throw error;
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}
__name(safeJsonBody, "safeJsonBody");
async function enforceRateLimit(request, env, workspaceId, route) {
  if (!env.API_RATE_LIMITER) return;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const [workspaceResult, networkResult] = await Promise.all([
    env.API_RATE_LIMITER.limit({ key: `workspace:${workspaceId}:${route}` }),
    env.API_RATE_LIMITER.limit({ key: `network:${ip}:${route}` })
  ]);
  if (!workspaceResult.success || !networkResult.success) {
    const error = new Error("Too many requests; please try again shortly");
    error.status = 429;
    throw error;
  }
}
__name(enforceRateLimit, "enforceRateLimit");
async function consumeDailyQuota(env, workspaceId, action, limit) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `INSERT INTO usage_daily (workspace_id, usage_day, action, usage_count, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(workspace_id, usage_day, action) DO UPDATE SET
       usage_count = usage_count + 1, updated_at = excluded.updated_at
     WHERE usage_count < ?
     RETURNING usage_count`
  ).bind(workspaceId, day, action, (/* @__PURE__ */ new Date()).toISOString(), limit).first();
  if (!result) {
    const error = new Error(`Daily free limit reached for ${action}`);
    error.status = 429;
    throw error;
  }
  return { used: result.usage_count, limit };
}
__name(consumeDailyQuota, "consumeDailyQuota");
async function refundDailyQuota(env, workspaceId, action) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  await env.DB.prepare(
    `UPDATE usage_daily SET usage_count = MAX(usage_count - 1, 0), updated_at = ?
     WHERE workspace_id = ? AND usage_day = ? AND action = ? AND usage_count > 0`
  ).bind((/* @__PURE__ */ new Date()).toISOString(), workspaceId, day, action).run();
}
__name(refundDailyQuota, "refundDailyQuota");
async function consumeMonthlyQuota(env, workspaceId, action, limit) {
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const result = await env.DB.prepare(
    `INSERT INTO usage_daily (workspace_id, usage_day, action, usage_count, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(workspace_id, usage_day, action) DO UPDATE SET
       usage_count = usage_count + 1, updated_at = excluded.updated_at
     WHERE usage_count < ? RETURNING usage_count`
  ).bind(workspaceId, month, action, (/* @__PURE__ */ new Date()).toISOString(), limit).first();
  if (!result) throw Object.assign(new Error("Bu ayki yönetilen AI proje hakkın doldu"), { status: 429, code: "MONTHLY_LIMIT_REACHED" });
  return { used: Number(result.usage_count), limit, scope: "month" };
}
__name(consumeMonthlyQuota, "consumeMonthlyQuota");
async function refundMonthlyQuota(env, workspaceId, action) {
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  await env.DB.prepare(
    `UPDATE usage_daily SET usage_count = MAX(usage_count - 1, 0), updated_at = ?
     WHERE workspace_id = ? AND usage_day = ? AND action = ? AND usage_count > 0`
  ).bind((/* @__PURE__ */ new Date()).toISOString(), workspaceId, month, action).run();
}
__name(refundMonthlyQuota, "refundMonthlyQuota");
async function monthlyQuotaStatus(env, workspaceId, action, limit) {
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const row = await env.DB.prepare(
    "SELECT usage_count FROM usage_daily WHERE workspace_id = ? AND usage_day = ? AND action = ?"
  ).bind(workspaceId, month, action).first();
  const used = Number(row?.usage_count || 0);
  return { used, limit, remaining: Math.max(0, limit - used), scope: "month" };
}
__name(monthlyQuotaStatus, "monthlyQuotaStatus");
async function consumeGlobalDailyQuota(env, action, fallbackLimit) {
  const configured = Number(env.MANAGED_DAILY_PROJECT_CAP);
  const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : fallbackLimit;
  const day = new Date().toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `INSERT INTO managed_global_usage (usage_day, action, usage_count, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(usage_day, action) DO UPDATE SET
       usage_count = usage_count + 1, updated_at = excluded.updated_at
     WHERE usage_count < ? RETURNING usage_count`
  ).bind(day, action, new Date().toISOString(), limit).first();
  if (!result) throw Object.assign(new Error("Günlük AI kapasitesi doldu; hakkın korunarak daha sonra tekrar deneyebilirsin"), { status: 503, code: "MANAGED_CAPACITY_REACHED" });
  return { used: Number(result.usage_count), limit };
}
__name(consumeGlobalDailyQuota, "consumeGlobalDailyQuota");
async function refundGlobalDailyQuota(env, action) {
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare(
    `UPDATE managed_global_usage SET usage_count = MAX(usage_count - 1, 0), updated_at = ?
     WHERE usage_day = ? AND action = ? AND usage_count > 0`
  ).bind(new Date().toISOString(), day, action).run();
}
__name(refundGlobalDailyQuota, "refundGlobalDailyQuota");
async function demoTrialStatus(env, workspaceId) {
  const result = await env.DB.prepare(
    "SELECT COALESCE(SUM(usage_count), 0) AS used FROM usage_daily WHERE workspace_id = ? AND action = 'demo_ai_generate'"
  ).bind(workspaceId).first();
  return { used: Number(result?.used || 0), limit: 1 };
}
__name(demoTrialStatus, "demoTrialStatus");
async function consumeDemoTrial(env, workspaceId) {
  const result = await env.DB.prepare(
    `INSERT INTO usage_daily (workspace_id, usage_day, action, usage_count, updated_at)
     SELECT ?, 'lifetime', 'demo_ai_generate', 1, ?
     WHERE NOT EXISTS (SELECT 1 FROM usage_daily WHERE workspace_id = ?
       AND action = 'demo_ai_generate' AND usage_count > 0)
     ON CONFLICT(workspace_id, usage_day, action) DO NOTHING RETURNING usage_count`
  ).bind(workspaceId, (/* @__PURE__ */ new Date()).toISOString(), workspaceId).first();
  if (!result) {
    const error = new Error("Ücretsiz deneme hakkın kullanıldı. Yeni otomatik projeler için Atölye Pro'ya geçebilirsin.");
    error.status = 402;
    error.code = "PRO_REQUIRED";
    throw error;
  }
  return { used: 1, limit: 1, scope: "trial" };
}
__name(consumeDemoTrial, "consumeDemoTrial");
async function refundDemoTrial(env, workspaceId) {
  await env.DB.prepare(`DELETE FROM usage_daily WHERE workspace_id = ? AND usage_day = 'lifetime' AND action = 'demo_ai_generate'`).bind(workspaceId).run();
}
__name(refundDemoTrial, "refundDemoTrial");
async function stateFor(workspace, env) {
  let row = await env.DB.prepare(
    `SELECT settings_json, ideas_json, productions_json, trash_json
     FROM workspace_state WHERE workspace_id = ?`
  ).bind(workspace.id).first();
  if (!row) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env.DB.prepare(
      `INSERT INTO workspace_state
       (workspace_id, settings_json, ideas_json, productions_json, trash_json, updated_at)
       VALUES (?, ?, '[]', '[]', '[]', ?) ON CONFLICT(workspace_id) DO NOTHING`
    ).bind(workspace.id, JSON.stringify(initialState.settings), now).run();
    row = await env.DB.prepare(
      `SELECT settings_json, ideas_json, productions_json, trash_json FROM workspace_state WHERE workspace_id = ?`
    ).bind(workspace.id).first();
  }
  if (!row) throw new Error("Workspace could not be initialized");
  const state = {
    settings: JSON.parse(row.settings_json),
    ideas: JSON.parse(row.ideas_json),
    productions: JSON.parse(row.productions_json),
    trash: JSON.parse(row.trash_json),
    runtime: structuredClone(initialState.runtime)
  };
  workspaceSnapshots.set(state, { workspaceId: workspace.id, state: structuredClone(state), settingsJson: row.settings_json });
  return state;
}
__name(stateFor, "stateFor");
function cleanText(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
__name(cleanText, "cleanText");
function cleanSpeechText(value, max = 4e3) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}
__name(cleanSpeechText, "cleanSpeechText");
function inferNarrationLanguage(text, fallback = "English") {
  const sample = String(text || "").toLocaleLowerCase("tr-TR");
  const turkishWords = sample.match(/\b(ve|bir|bu|için|ile|ama|gibi|daha|olan|olarak|çok|değil|şimdi|sonra|neden|nasıl)\b/g) || [];
  return /[çğıöşü]/i.test(sample) || turkishWords.length >= 2 ? "Turkish" : fallback;
}
__name(inferNarrationLanguage, "inferNarrationLanguage");
function pcmWaveBytes(pcm, sampleRate = 24000) {
  const output = new Uint8Array(44 + pcm.length);
  const view = new DataView(output.buffer);
  const write = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) output[offset + index] = value.charCodeAt(index);
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);
  output.set(pcm, 44);
  return output;
}
__name(pcmWaveBytes, "pcmWaveBytes");
function naturalSpeechPrompt(text, lang = "tr", style = "natural") {
  const profiles = {
    energetic: "Warm, energetic and engaging, with a light vocal smile. Keep the pace lively but never rushed.",
    documentary: "Warm, confident and curious, like an excellent documentary narrator speaking to one person.",
    inspiring: "Warm, sincere and hopeful. Build emotion gently without sounding theatrical.",
    natural: "Warm, relaxed and conversational, like a thoughtful creator speaking directly to one listener."
  };
  const language = `natural contemporary ${LANGUAGE_NAMES[lang] || lang} speech`;
  return `# AUDIO PROFILE\nA human, expressive short-form video narrator.\n\n# DIRECTOR'S NOTES\nSpeak in ${language}. ${profiles[style] || profiles.natural} Vary cadence and emphasis naturally. Use brief pauses at punctuation and paragraph breaks, soften transitions, and emphasize the opening and final takeaway. Avoid a flat rhythm, synthetic cadence, exaggerated announcer delivery, and reading every sentence at the same speed. Do not read these instructions aloud.\n\n# TRANSCRIPT\n${cleanSpeechText(text, 4000)}`;
}
__name(naturalSpeechPrompt, "naturalSpeechPrompt");
async function generateGeminiSpeech(text, apiKey, lang = "tr", style = "natural") {
  if (!apiKey) throw Object.assign(new Error("Türkçe seslendirme için Gemini API anahtarı gerekli"), { status: 409 });
  const model = "gemini-3.1-flash-tts-preview";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: naturalSpeechPrompt(text, lang, style),
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [{ voice: "Sulafat" }]
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || `Gemini seslendirme isteği başarısız (${response.status})`), { status: response.status });
  const audioOutput = payload.output_audio || payload.steps
    ?.flatMap((step) => step.content || []).find((block) => block.type === "audio");
  if (!audioOutput?.data) throw new Error("Gemini ses dosyası döndürmedi");
  const pcm = Uint8Array.from(atob(audioOutput.data), (character) => character.charCodeAt(0));
  return String(audioOutput.mime_type || audioOutput.mimeType || "").includes("wav") ? pcm : pcmWaveBytes(pcm);
}
__name(generateGeminiSpeech, "generateGeminiSpeech");
async function generateOpenAiSpeech(text, apiKey, lang = "tr", style = "natural") {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: cleanSpeechText(text, 4e3),
      instructions: naturalSpeechPrompt("", lang, style).split("# TRANSCRIPT")[0].trim(),
      response_format: "mp3"
    })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error?.message || `OpenAI seslendirme isteği başarısız (${response.status})`), { status: 502 });
  }
  return new Uint8Array(await response.arrayBuffer());
}
__name(generateOpenAiSpeech, "generateOpenAiSpeech");
function assertPublicImageUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("Ge\xE7erli bir g\xF6rsel URL\u2019si girin"), { status: 400 });
  }
  if (url.protocol !== "https:") throw Object.assign(new Error("Yaln\u0131zca HTTPS g\xF6rsel adresleri kabul edilir"), { status: 400 });
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blocked = host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  if (blocked) throw Object.assign(new Error("Yerel veya \xF6zel a\u011F adresleri kullan\u0131lamaz"), { status: 400 });
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}
__name(assertPublicImageUrl, "assertPublicImageUrl");
async function downloadPublicImage(inputUrl) {
  let url = assertPublicImageUrl(inputUrl);
  let response;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(1e4),
        headers: { accept: "image/jpeg,image/png,image/webp", "user-agent": "TERZI-Content-Studio/1.0" }
      });
    } catch {
      throw Object.assign(new Error("G\xF6rsel kayna\u011F\u0131 10 saniye i\xE7inde yan\u0131t vermedi"), { status: 408 });
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) break;
    url = assertPublicImageUrl(new URL(location, url).href);
  }
  if (!response?.ok) throw Object.assign(new Error(`G\xF6rsel adresine eri\u015Filemedi (${response?.status || "a\u011F hatas\u0131"})`), { status: 400 });
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > 900 * 1024) throw Object.assign(new Error("URL g\xF6rseli en fazla 900 KB olabilir"), { status: 413 });
  const reader = response.body?.getReader();
  const chunks = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 900 * 1024) {
      await reader.cancel();
      throw Object.assign(new Error("URL g\xF6rseli en fazla 900 KB olabilir"), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const contentType = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : "";
  if (!contentType) throw Object.assign(new Error("Adres JPG, PNG veya WebP g\xF6rsel d\xF6nd\xFCrm\xFCyor"), { status: 415 });
  let binary = "";
  for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  return { finalUrl: url.href, bytes, contentType, dataUrl: `data:${contentType};base64,${btoa(binary)}` };
}
__name(downloadPublicImage, "downloadPublicImage");
function youtubeDurationSeconds(value) {
  const match = String(value || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}
__name(youtubeDurationSeconds, "youtubeDurationSeconds");
async function fetchYoutubeTrends(env, regionCode = "TR", categoryId = "0", deviceKey = "") {
  const apiKey = cleanText(deviceKey || env.YOUTUBE_API_KEY, 200);
  if (!apiKey) {
    const error = new Error("YouTube Data API anahtar\u0131 Cloudflare secret olarak tan\u0131mlanmal\u0131.");
    error.status = 503;
    throw error;
  }
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "24");
  url.searchParams.set("key", apiKey);
  if (categoryId !== "0") url.searchParams.set("videoCategoryId", categoryId);
  const response = await fetch(url);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || `YouTube trendleri al\u0131namad\u0131: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return (result.items || []).map((item, index) => ({
    id: cleanText(item.id, 32),
    rank: index + 1,
    title: cleanText(item.snippet?.title, 300),
    description: cleanText(item.snippet?.description, 1800),
    channelTitle: cleanText(item.snippet?.channelTitle, 200),
    publishedAt: item.snippet?.publishedAt || "",
    categoryId: cleanText(item.snippet?.categoryId, 12),
    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
    durationSeconds: youtubeDurationSeconds(item.contentDetails?.duration),
    views: Number(item.statistics?.viewCount || 0),
    likes: Number(item.statistics?.likeCount || 0),
    comments: Number(item.statistics?.commentCount || 0),
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`
  }));
}
__name(fetchYoutubeTrends, "fetchYoutubeTrends");
function stripHtml(value, max = 4e3) {
  return cleanText(String(value || "").replace(/<[^>]*>/g, " "), max);
}
__name(stripHtml, "stripHtml");
function nasaRiskFlags(item) {
  const data = item.data?.[0] || {};
  const searchable = `${data.title || ""} ${data.description || ""} ${data.photographer || ""}`.toLowerCase();
  const flags = [];
  if (/copyright|all rights reserved|courtesy of|©/.test(searchable)) {
    flags.push("Muhtemel \xFC\xE7\xFCnc\xFC taraf telif ibaresi");
  }
  if (/astronaut|crew|portrait|person|people|employee|commander|pilot/.test(searchable)) {
    flags.push("Tan\u0131nabilir ki\u015Fi veya astronot i\xE7erebilir");
  }
  if (/logo|insignia|logotype|emblem/.test(searchable)) {
    flags.push("Korunan NASA logosu veya i\u015Fareti i\xE7erebilir");
  }
  return flags;
}
__name(nasaRiskFlags, "nasaRiskFlags");
function normalizeNasa(item) {
  const data = item.data?.[0] || {};
  const preview = (item.links || []).find((link) => link.render === "image");
  const id = cleanText(data.nasa_id, 120);
  return {
    assetId: id,
    nasaId: id,
    source: "nasa",
    sourceLabel: "NASA",
    title: cleanText(data.title, 300),
    description: cleanText(data.description_508 || data.description, 4e3),
    dateCreated: data.date_created || "",
    center: cleanText(data.center, 120),
    photographer: cleanText(data.photographer, 200),
    previewUrl: preview?.href || "",
    originalUrl: preview?.href || "",
    license: "NASA media guidelines",
    riskFlags: nasaRiskFlags(item),
    sourcePage: `https://images.nasa.gov/details/${encodeURIComponent(id)}`
  };
}
__name(normalizeNasa, "normalizeNasa");
async function searchNasa(query, exact = false) {
  const url = new URL("https://images-api.nasa.gov/search");
  url.searchParams.set(exact ? "nasa_id" : "q", query);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", "24");
  const response = await fetch(url, {
    headers: { "user-agent": "TERZI-Content-Studio/1.0" }
  });
  if (!response.ok) throw new Error(`NASA aramas\u0131 ba\u015Far\u0131s\u0131z: ${response.status}`);
  const result = await response.json();
  return (result.collection?.items || []).map(normalizeNasa).filter((item) => item.assetId && item.previewUrl);
}
__name(searchNasa, "searchNasa");
async function searchWikimedia(query, exact = false) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", "1200");
  if (exact) {
    url.searchParams.set("pageids", query);
  } else {
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "24");
  }
  const response = await fetch(url, {
    headers: { "user-agent": "TERZI-Content-Studio/1.0" }
  });
  if (!response.ok) throw new Error(`Wikimedia aramas\u0131 ba\u015Far\u0131s\u0131z: ${response.status}`);
  const result = await response.json();
  return Object.values(result.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const license = cleanText(meta.LicenseShortName?.value || "Unknown", 120);
    return {
      assetId: String(page.pageid),
      source: "wikimedia",
      sourceLabel: "Wikimedia Commons",
      title: cleanText(page.title?.replace(/^File:/, ""), 300),
      description: stripHtml(meta.ImageDescription?.value),
      dateCreated: cleanText(meta.DateTimeOriginal?.value || meta.DateTime?.value, 80),
      photographer: stripHtml(meta.Artist?.value, 200),
      previewUrl: info.thumburl || info.url || "",
      originalUrl: info.url || "",
      license,
      attribution: stripHtml(meta.Credit?.value || meta.Attribution?.value),
      riskFlags: /unknown|copyrighted|fair use/i.test(license) ? ["Lisans bilgisi otomatik do\u011Frulanamad\u0131"] : [],
      sourcePage: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`
    };
  }).filter((item) => item.previewUrl);
}
__name(searchWikimedia, "searchWikimedia");
const ARCHIVE_STOP_WORDS = new Set([
  "acik", "anlat", "anlatan", "anlatir", "icin", "ile", "bir", "bu", "ve", "veya", "olan", "olarak",
  "hakkinda", "hikaye", "hikayesi", "video", "videosu", "icerik", "olustur", "hazirla", "goster", "yaz",
  "kucuk", "baslayan", "bugun", "uygulanabilecek", "cogu", "kisinin", "bilmedigi", "sasirtici"
]);
const ARCHIVE_VISUAL_CONCEPTS = [
  [/\bmars\b/, "planet Mars surface"],
  [/\bsaturn\b/, "planet Saturn rings"],
  [/\bdunya\b|\bearth\b/, "planet Earth from space"],
  [/\bay\b|moon/, "Moon lunar surface"],
  [/uzay teleskop|space telescope|teleskop/, "space telescope observatory"],
  [/gezegen|gunes sistemi|solar system|\bplanet(s)?\b/, "solar system planets"],
  [/\buzay\b|\bspace\b|astronomi/, "outer space stars"],
  [/istanbul/, "Istanbul city"],
  [/yagmur|rain/, "rainy city night"],
  [/kedi|\bcat(s)?\b/, "cat animal"],
  [/kopek|\bdog(s)?\b/, "dog animal"],
  [/kahve|coffee/, "coffee brewing"],
  [/uretkenlik|productivity/, "productive workspace planning"],
  [/yapay zeka|artificial intelligence|\bai\b/, "artificial intelligence technology"],
  [/\btarih\b|histor/, "historical archive"],
  [/donusum|ilham|inspir|gelisim|adim/, "personal growth journey sunrise"],
  [/cocuk|children|kids/, "children learning"],
  [/doga|nature/, "nature landscape"],
  [/seyahat|gezi|travel/, "travel landscape"],
  [/saglik|health/, "healthy lifestyle"],
  [/\bpara\b|finans|money|finance/, "personal finance planning"],
  [/yemek|tarif|food|recipe/, "cooking food"],
  [/spor|exercise|fitness/, "exercise fitness"],
  [/muzik|music/, "music performance"],
  [/kitap|reading|book/, "books reading"],
  [/egitim|school|education/, "education classroom"],
  [/yalniz|solitude|walking|yuruyen/, "person walking alone"]
];
function archiveAscii(value) {
  return cleanText(value, 120).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}
__name(archiveAscii, "archiveAscii");
function buildArchiveQueryPlan(value) {
  const original = cleanText(value, 120);
  const normalized = archiveAscii(original);
  const concepts = [];
  for (const [pattern, phrase] of ARCHIVE_VISUAL_CONCEPTS) {
    if (pattern.test(normalized) && !concepts.includes(phrase)) concepts.push(phrase);
  }
  const simpleEnglishQuery = /^[a-z0-9\s-]+$/i.test(original) && original.trim().split(/\s+/).length <= 4;
  let interpretedAs = concepts[0] || "";
  if (!interpretedAs && simpleEnglishQuery) interpretedAs = original.trim();
  if (!interpretedAs) {
    interpretedAs = normalized.split(" ").filter((word) => word.length > 2 && !ARCHIVE_STOP_WORDS.has(word)).slice(0, 5).join(" ") || "creative storytelling";
  }
  const queries = [interpretedAs];
  if (concepts.length > 1) queries.push(concepts[1]);
  const spaceRelated = /planet|mars|saturn|earth|moon|space|telescope|astronom|gezegen|uzay|dunya|\bay\b/.test(`${normalized} ${interpretedAs.toLowerCase()}`);
  return { original, interpretedAs, queries: [...new Set(queries)].slice(0, 2), spaceRelated, interpretationMode: concepts.length ? "visual-intent" : "keywords" };
}
__name(buildArchiveQueryPlan, "buildArchiveQueryPlan");
async function runArchiveQueries(source, queries) {
  const attempts = await Promise.allSettled(queries.map((query) => source === "nasa" ? searchNasa(query) : searchWikimedia(query)));
  const items = [];
  const failures = [];
  const seen = new Set();
  attempts.forEach((attempt, index) => {
    if (attempt.status === "rejected") {
      failures.push(`${source}:${queries[index]}: ${cleanText(attempt.reason?.message, 180)}`);
      return;
    }
    for (const item of attempt.value) {
      const key = `${item.source}:${item.assetId}`;
      if (!seen.has(key)) { seen.add(key); items.push(item); }
    }
  });
  items.sort((left, right) => Number(Boolean(left.riskFlags?.length)) - Number(Boolean(right.riskFlags?.length)));
  return { items, failures };
}
__name(runArchiveQueries, "runArchiveQueries");
async function searchMediaSmart(requestedSource, rawQuery) {
  const queryPlan = buildArchiveQueryPlan(rawQuery);
  let sourceUsed = requestedSource;
  let fallbackReason = "";
  let result;
  if (requestedSource === "nasa" && !queryPlan.spaceRelated) {
    sourceUsed = "wikimedia";
    fallbackReason = "NASA uzay odaklı olduğu için konu Wikimedia Commons'ta arandı.";
    result = await runArchiveQueries("wikimedia", queryPlan.queries);
  } else {
    result = await runArchiveQueries(requestedSource, queryPlan.queries);
    const safeCount = result.items.filter((item) => !item.riskFlags?.length).length;
    if (requestedSource === "nasa" && safeCount < 4) {
      const fallback = await runArchiveQueries("wikimedia", queryPlan.queries);
      const seen = new Set(result.items.map((item) => `${item.source}:${item.assetId}`));
      result.items.push(...fallback.items.filter((item) => !seen.has(`${item.source}:${item.assetId}`)));
      result.failures.push(...fallback.failures);
      sourceUsed = "nasa+wikimedia";
      fallbackReason = "NASA sonuçları yeterince güvenli veya çeşitli olmadığı için Wikimedia sonuçları da eklendi.";
    }
  }
  if (!result.items.length && result.failures.length) {
    throw Object.assign(new Error("Açık arşiv servislerine şu anda ulaşılamıyor. Biraz sonra tekrar dene."), { status: 502 });
  }
  return { requestedSource, sourceUsed, queryPlan: queryPlan.queries, interpretedAs: queryPlan.interpretedAs, interpretationMode: queryPlan.interpretationMode, fallbackReason, partialFailures: result.failures, items: result.items.slice(0, 48) };
}
__name(searchMediaSmart, "searchMediaSmart");
async function resolveAsset(source, id) {
  const items = source === "wikimedia" ? await searchWikimedia(id, true) : await searchNasa(id, true);
  return items.find((item) => item.assetId === id) || items[0];
}
__name(resolveAsset, "resolveAsset");
async function saveWorkspaceState(workspaceId, state, env) {
  const snapshot = workspaceSnapshots.get(state);
  if (!snapshot || snapshot.workspaceId !== workspaceId) throw new Error("Missing workspace snapshot");
  const latest = await env.DB.prepare(`SELECT ideas_json, productions_json, trash_json FROM workspace_state WHERE workspace_id = ?`).bind(workspaceId).first();
  if (!latest) throw stateConflict();
  const merged = {};
  for (const key of stateCollections) {
    merged[key] = mergeStateRecords(snapshot.state[key], state[key] || [], JSON.parse(latest[key + "_json"]));
  }
  const result = await env.DB.prepare(
    `UPDATE workspace_state SET ideas_json = ?, productions_json = ?, trash_json = ?, updated_at = ?
     WHERE workspace_id = ? AND ideas_json = ? AND productions_json = ? AND trash_json = ?`
  ).bind(
    ...stateCollections.map((key) => JSON.stringify(merged[key])),
    (/* @__PURE__ */ new Date()).toISOString(), workspaceId,
    ...stateCollections.map((key) => latest[key + "_json"])
  ).run();
  if (Number(result.meta?.changes) !== 1) throw stateConflict();
  Object.assign(state, merged);
  workspaceSnapshots.set(state, { ...snapshot, state: structuredClone(state) });
}
__name(saveWorkspaceState, "saveWorkspaceState");
async function telegramCall(env, method, payload = {}) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    const error = new Error("Telegram bot secret tan\u0131mlanmam\u0131\u015F");
    error.status = 409;
    throw error;
  }
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const error = new Error(result.description || `Telegram i\u015Flemi ba\u015Far\u0131s\u0131z: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return result.result;
}
__name(telegramCall, "telegramCall");
async function persistTelegramReviewState(workspace, state, item, review, env) {
  const telegram = {
    status: "pending",
    reviewToken: review.token,
    messageId: review.message_id,
    sentAt: review.created_at
  };
  item.telegram = telegram;
  try {
    await saveWorkspaceState(workspace.id, state, env);
  } catch (error) {
    if (error?.code !== "STATE_CONFLICT") throw error;
    const latestState = await stateFor(workspace, env);
    const latestItem = latestState.productions.find((entry) => entry.id === item.id);
    if (!latestItem) throw error;
    latestItem.telegram = telegram;
    await saveWorkspaceState(workspace.id, latestState, env);
  }
  return telegram;
}
__name(persistTelegramReviewState, "persistTelegramReviewState");
function safeSettings(input, current) {
  const provider = ["gemini", "openai", "claude"].includes(input.provider) ? input.provider : current.provider;
  return {
    ...current,
    niche: cleanText(input.niche, 120),
    audience: cleanText(input.audience, 200),
    provider,
    textModel: TEXT_MODELS[provider].includes(input.textModel) ? input.textModel : DEFAULT_TEXT_MODELS[provider],
    contentLanguage: normalizeContentLanguage(input.contentLanguage, current.contentLanguage),
    uiLanguage: ["tr", "en", "es"].includes(input.uiLanguage) ? input.uiLanguage : current.uiLanguage,
    contentProfile: cleanText(input.contentProfile, 40),
    visualStyle: input.visualStyle === "animated" ? "animated" : "documentary",
    targetAgeGroups: Array.isArray(input.targetAgeGroups) ? input.targetAgeGroups.map((age) => cleanText(age, 12)).slice(0, 8) : current.targetAgeGroups,
    rules: {
      humanApproval: input.rules?.humanApproval !== false,
      childSafe: Boolean(input.rules?.childSafe),
      factualOnly: input.rules?.factualOnly !== false,
      includeCta: Boolean(input.rules?.includeCta),
      burnCaptions: input.rules?.burnCaptions !== false
    },
    targetSeconds: Math.max(20, Math.min(90, Number(input.targetSeconds) || 45))
  };
}
__name(safeSettings, "safeSettings");
function parseAiJson(value) {
  const text = String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!text) throw new Error("AI sa\u011Flay\u0131c\u0131s\u0131 bo\u015F yan\u0131t verdi");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI sa\u011Flay\u0131c\u0131s\u0131 ge\xE7erli i\xE7erik paketi d\xF6nd\xFCrmedi");
  }
}
__name(parseAiJson, "parseAiJson");
function validateContentPackage(content) {
  const title = cleanText(content?.title, 180);
  const hook = cleanText(content?.hook, 600);
  const narration = cleanText(content?.narration, 12e3);
  const scenes = Array.isArray(content?.scenes)
    ? content.scenes.filter((scene) => cleanText(scene?.text, 600)).slice(0, 8)
    : [];
  if (title.length < 3 || hook.length < 3 || narration.length < 20 || scenes.length !== 6) {
    throw Object.assign(new Error("AI boş veya eksik bir içerik paketi döndürdü. Lütfen tekrar dene."), { status: 502 });
  }
  return { ...content, title, hook, narration, scenes };
}
__name(validateContentPackage, "validateContentPackage");
const CONTENT_PACKAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title", "titleOptions", "hook", "hookOptions", "viewerPromise", "curiosityGap",
    "midpointHook", "payoff", "commentPrompt", "narration", "scenes", "sourceChecklist", "disclosure"
  ],
  properties: {
    title: { type: "string" },
    titleOptions: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 6 },
    hook: { type: "string" },
    hookOptions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    viewerPromise: { type: "string" },
    curiosityGap: { type: "string" },
    midpointHook: { type: "string" },
    payoff: { type: "string" },
    commentPrompt: { type: "string" },
    narration: { type: "string" },
    scenes: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seconds", "type", "text", "visualQuery", "visualRole", "changeReason"],
        properties: {
          seconds: { type: "string" },
          type: { type: "string" },
          text: { type: "string" },
          visualQuery: { type: "string" },
          visualRole: { type: "string" },
          changeReason: { type: "string" }
        }
      }
    },
    sourceChecklist: { type: "array", items: { type: "string" } },
    disclosure: {
      type: "object",
      additionalProperties: false,
      required: ["aiAssisted", "youtubeAlteredContent"],
      properties: {
        aiAssisted: { type: "boolean" }, youtubeAlteredContent: { type: "string" }
      }
    }
  }
};
const EDITORIAL_ANGLES = {
  "hidden-detail": { id: "hidden-detail", label: "Gizli ayrıntı", score: 94, promise: "İlk bakışta fark edilmeyen ayrıntıyı açığa çıkar", lens: "Reveal one specific detail most viewers would miss and show why it changes the story." },
  "myth-reality": { id: "myth-reality", label: "Yanlış bilinen", score: 92, promise: "Yaygın beklentiyle doğrulanabilir gerçeği karşılaştır", lens: "Challenge one common assumption, then replace it with a source-supported explanation." },
  "why-now": { id: "why-now", label: "Neden şimdi?", score: 89, promise: "Konuyu güncel bir değişim veya sonuçla ilişkilendir", lens: "Explain why this matters now, without inventing urgency or unsupported trend claims." },
  scale: { id: "scale", label: "Ölçek şaşkınlığı", score: 87, promise: "Soyut büyüklüğü gündelik bir karşılaştırmayla hissettir", lens: "Turn scale, distance, time, cost, or impact into one concrete everyday comparison." },
  consequence: { id: "consequence", label: "Sonra ne oldu?", score: 85, promise: "Tek bir kararın veya olayın beklenmedik sonucunu izle", lens: "Build a cause-and-effect chain with a clear consequence and satisfying payoff." },
  "human-stakes": { id: "human-stakes", label: "İnsan etkisi", score: 82, promise: "Konuyu gerçek bir insan ihtiyacı veya gerilim üzerinden anlat", lens: "Frame the topic through a relatable human need, constraint, or decision without fabricating a person." }
};
function editorialAngle(id) {
  return structuredClone(EDITORIAL_ANGLES[id] || EDITORIAL_ANGLES["hidden-detail"]);
}
__name(editorialAngle, "editorialAngle");
function retentionBrief(idea, settings) {
  const angle = idea.angle || editorialAngle("hidden-detail");
  const shortForm = (idea.contentType || "shorts") !== "youtube";
  return `Selected editorial angle: ${angle.label}. ${angle.lens}
Retention contract:
- Write three distinct hookOptions and choose the strongest as hook.
- State a clear viewerPromise and open one curiosityGap that the payoff closes.
- ${shortForm ? "Deliver value in the first sentence; no greeting, logo intro, countdown, or generic setup." : "Open on the strongest moment and keep any branded intro under 3 seconds."}
- ${shortForm ? "Create a meaningful information, framing, or visual change every 2-3 seconds." : "Use a new story beat or visual purpose every 5-8 seconds."}
- Add a midpointHook, a concrete payoff, and a natural commentPrompt.
- Produce exactly six accurate titleOptions: two searchable, two curiosity-led, and two broad-audience titles.
- Every scene must include seconds, type, text, visualQuery, visualRole, and changeReason.
- visualQuery must be one or two simple English words suitable for NASA or Wikimedia search.
Return JSON only with: title, titleOptions, hook, hookOptions, viewerPromise, curiosityGap, midpointHook, payoff, commentPrompt, narration, scenes, sourceChecklist, disclosure.`;
}
__name(retentionBrief, "retentionBrief");
function sanitizeVisionInputs(value) {
  if (!Array.isArray(value)) return [];
  let totalLength = 0;
  return value.slice(0, 12).map((item) => {
    const dataUrl = String(item?.dataUrl || "");
    const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match || dataUrl.length > 330_000) {
      const error = new Error("Analiz görseli geçersiz veya çok büyük");
      error.status = 400;
      throw error;
    }
    totalLength += dataUrl.length;
    if (totalLength > 4_200_000) {
      const error = new Error("Analiz görsellerinin toplam boyutu çok büyük");
      error.status = 413;
      throw error;
    }
    return {
      name: cleanText(item?.name || "Kullanıcı fotoğrafı", 180),
      mediaType: "image/" + match[1],
      data: match[2],
      dataUrl
    };
  });
}
__name(sanitizeVisionInputs, "sanitizeVisionInputs");
function visionBrief(imageInputs) {
  if (!imageInputs.length) return "";
  return "Uploaded photos are the primary source. Analyze them in the supplied order. " +
    "Ground the story in visible details only; do not guess identities, location, date, relationships, or events. " +
    "Treat the written topic as optional creative direction, not as evidence. Make every uploaded photo useful in the scene plan.";
}
__name(visionBrief, "visionBrief");
async function generateAiPackage(provider, key, idea, settings, imageInputs = []) {
  if (!key || key.length < 12) {
    const error = new Error("AI API anahtar\u0131 eksik veya ge\xE7ersiz");
    error.status = 400;
    throw error;
  }
  const textModel = TEXT_MODELS[provider]?.includes(settings.textModel)
    ? settings.textModel : DEFAULT_TEXT_MODELS[provider];
  const targetLanguage = settings.contentLanguage || "English";
  const prompt = `You are a professional short-video editor writing in ${targetLanguage}.
LANGUAGE CONTRACT: Write every user-facing field entirely in natural ${targetLanguage}. This includes title, hook, narration, every scene text, sourceChecklist, and disclosure text. Do not switch to English unless the target language is English.
Topic: ${idea.topic}
Source notes: ${idea.sources || "No verified sources; avoid unsupported factual claims."}
Channel niche: ${settings.niche || "general"}
Audience: ${settings.audience || "general audience"}
${retentionBrief(idea, settings)}
${visionBrief(imageInputs)}
Create an original, source-grounded video package. Do not invent facts or imitate
another creator's wording, scene order, title, or hook. Do not use markdown fences.`;
  let response;
  let output;
  if (provider === "openai") {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: textModel,
        input: imageInputs.length ? [{
          role: "system",
          content: [{ type: "input_text", text: `Return only a valid content package written entirely in ${targetLanguage}.` }]
        }, {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...imageInputs.map((image) => ({
              type: "input_image", image_url: image.dataUrl, detail: "low"
            }))
          ]
        }] : [{ role: "system", content: `Return only a valid content package written entirely in ${targetLanguage}.` }, { role: "user", content: prompt }],
        text: { format: { type: "json_schema", name: "video_content_package", strict: true, schema: CONTENT_PACKAGE_SCHEMA } }
      })
    });
    const result = await response.json().catch(() => ({}));
    output = result.output_text || result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!response.ok) throw Object.assign(new Error(result.error?.message || `OpenAI hatas\u0131: ${response.status}`), { status: 502 });
  } else if (provider === "claude") {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: textModel,
        max_tokens: 5e3,
        messages: [{
          role: "user",
          content: imageInputs.length ? [
            { type: "text", text: prompt },
            ...imageInputs.map((image) => ({
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.data }
            }))
          ] : prompt
        }]
      })
    });
    const result = await response.json().catch(() => ({}));
    output = result.content?.find((block) => block.type === "text")?.text;
    if (!response.ok) throw Object.assign(new Error(result.error?.message || `Claude hatas\u0131: ${response.status}`), { status: 502 });
  } else {
    const model = textModel;
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        system_instruction: `Return only a valid content package written entirely in ${targetLanguage}.`,
        input: [
          { type: "text", text: prompt },
          ...imageInputs.map((image) => ({
            type: "image", data: image.data, mime_type: image.mediaType
          }))
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: CONTENT_PACKAGE_SCHEMA
        }
      })
    });
    const result = await response.json().catch(() => ({}));
    output = result.output_text || result.steps
      ?.flatMap((step) => step.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text || "").join("");
    if (!response.ok) throw Object.assign(new Error(result.error?.message || `Gemini hatas\u0131: ${response.status}`), { status: 502 });
  }
  return validateContentPackage({ mode: provider, ...parseAiJson(output) });
}
__name(generateAiPackage, "generateAiPackage");
async function generateManagedDemoPackage(env, idea, settings) {
  const content = await generateManagedProPackage(env, idea, settings);
  return { ...content, mode: "orbit-demo", model: "Content Studio Deneme", demo: true, fallback: false };
}
__name(generateManagedDemoPackage, "generateManagedDemoPackage");
async function generateManagedProPackage(env, idea, settings) {
  if (!env.AI) throw Object.assign(new Error("Content Studio yönetilen AI servisi şu anda kullanılamıyor"), { status: 503 });
  const targetLanguage = settings.contentLanguage || "Turkish";
  const prompt = `Create an original, publish-ready short-form video story entirely in natural ${targetLanguage}.
Topic: ${idea.topic}
Verified source notes: ${idea.sources || "No verified sources; avoid unsupported factual claims."}
Audience: ${settings.audience || "general audience"}
Content profile: ${settings.contentProfile || "general"}
${retentionBrief(idea, settings)}
Use a strong narrative arc rather than summarizing the source metadata. Write a concrete opening, development, reveal and payoff. Do not invent unsupported facts, people, dates, statistics or trends. Use exactly six concise scenes. Return JSON only.`;
  let result;
  try {
    result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: `You are Content Studio's professional short-video story editor. Every user-facing field must be in ${targetLanguage}. Return one valid JSON object and no markdown.` },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_schema", json_schema: CONTENT_PACKAGE_SCHEMA },
      max_tokens: 4200,
      temperature: 0.7
    });
  } catch (error) {
    throw Object.assign(new Error("Content Studio hikâye servisi geçici olarak yanıt vermedi. Hakkın korunarak daha sonra tekrar deneyebilirsin."), { status: 503, cause: error });
  }
  const raw = result?.response ?? result?.choices?.[0]?.message?.content;
  const parsed = raw && typeof raw === "object" ? raw : parseAiJson(raw);
  return validateContentPackage({
    ...parsed,
    mode: "terzi-managed",
    model: "Content Studio Yönetilen AI"
  });
}
__name(generateManagedProPackage, "generateManagedProPackage");
async function createManagedImageAsset(env, workspaceId, item, subject, provider = "", key = "") {
  const safeSubject = cleanText(subject, 700) || cleanText(item.content?.title, 180) || "Original visual story scene";
  const imagePrompt = `Professional original vertical 9:16 video scene. ${safeSubject}. Topic: ${cleanText(item.content?.title, 180)}. Strong focal point and mobile composition. No text, logos, watermark, copyrighted characters or identifiable people.`;
  let bytes;
  let source = "cloudflare";
  let sourceLabel = "Content Studio Görsel AI · FLUX";
  let license = "Cloudflare Workers AI output";
  let sourcePage = "https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/";
  if (key && provider === "gemini") {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image",
        input: imagePrompt,
        response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "9:16", image_size: "1K" }
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.error?.message || `Gemini görsel hatası: ${response.status}`), { status: 502 });
    const image = result.output_image || result.steps?.flatMap((step) => step.content || []).find((block) => block.type === "image");
    if (!image?.data) throw Object.assign(new Error("Gemini görsel döndürmedi"), { status: 502 });
    const binary = atob(image.data);
    bytes = Uint8Array.from(binary, (character) => character.codePointAt(0));
    source = "gemini";
    sourceLabel = "Gemini · Nano Banana 2";
    license = "Gemini API generated output";
    sourcePage = "https://ai.google.dev/gemini-api/docs/image-generation";
  } else if (key && provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-2.5-flare", prompt: imagePrompt, size: "1024x1536", quality: "low", output_format: "jpeg" })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.error?.message || `OpenAI görsel hatası: ${response.status}`), { status: 502 });
    const encoded = result.data?.[0]?.b64_json;
    if (!encoded) throw Object.assign(new Error("OpenAI görsel döndürmedi"), { status: 502 });
    const binary = atob(encoded);
    bytes = Uint8Array.from(binary, (character) => character.codePointAt(0));
    source = "openai";
    sourceLabel = "OpenAI · GPT Image 2.5 Flare";
    license = "OpenAI API generated output";
    sourcePage = "https://developers.openai.com/api/docs/models/gpt-image-2.5-flare";
  } else {
    if (!env.AI) throw Object.assign(new Error("Content Studio Görsel AI şu anda kullanılamıyor"), { status: 503 });
    const output = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: imagePrompt });
    if (output instanceof Uint8Array) bytes = output;
    else if (typeof output?.image === "string") {
      const binary = atob(output.image.replace(/^data:image\/[^;]+;base64,/, ""));
      bytes = Uint8Array.from(binary, (character) => character.codePointAt(0));
    } else if (output instanceof ArrayBuffer) bytes = new Uint8Array(output);
    else if (typeof output?.arrayBuffer === "function") bytes = new Uint8Array(await output.arrayBuffer());
    else throw Object.assign(new Error("Görsel modeli beklenmeyen bir yanıt döndürdü"), { status: 502 });
  }
  if (!bytes?.length || bytes.length > 4 * 1024 * 1024) throw Object.assign(new Error("AI görseli kaydedilemedi"), { status: 502 });
  const filename = `${item.id}-ai-${crypto.randomUUID()}.jpeg`;
  await env.DB.prepare("INSERT INTO uploaded_media (id, workspace_id, content_type, data_url, created_at) VALUES (?, ?, ?, ?, ?)").bind(filename, workspaceId, "image/jpeg", `data:image/jpeg;base64,${bytesBase64(bytes)}`, (/* @__PURE__ */ new Date()).toISOString()).run();
  return { assetId: `${source}-${crypto.randomUUID()}`, source, sourceLabel, title: safeSubject, previewUrl: `/api/uploads/${filename}`, license, sourcePage };
}
__name(createManagedImageAsset, "createManagedImageAsset");
async function expireStaleMediaUploads(env, workspaceId) {
  if (!env.MEDIA) return;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const result = await env.DB.prepare(
    "SELECT id, object_key, upload_id, status FROM cloud_media WHERE workspace_id = ? AND (status = 'uploading' OR cleanup_pending = 1) AND created_at < ? LIMIT 25"
  ).bind(workspaceId, cutoff).all();
  for (const row of result.results || []) {
    if (await cleanupMediaUpload(env, row)) {
      await env.DB.prepare("UPDATE cloud_media SET status = 'failed', cleanup_pending = 0 WHERE id = ? AND workspace_id = ?")
        .bind(row.id, workspaceId).run();
    }
  }
}
__name(expireStaleMediaUploads, "expireStaleMediaUploads");
async function cleanupMediaUpload(env, row, allowObjectDelete = false) {
  try {
    await env.MEDIA.resumeMultipartUpload(row.object_key, row.upload_id).abort();
    return true;
  } catch {
    if (!allowObjectDelete) return false;
    try {
      await env.MEDIA.delete(row.object_key);
      return true;
    } catch {
      return false;
    }
  }
}
__name(cleanupMediaUpload, "cleanupMediaUpload");
async function abortMultipartWithRetry(upload) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await upload.abort();
      return true;
    } catch {}
  }
  return false;
}
__name(abortMultipartWithRetry, "abortMultipartWithRetry");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const telegramWebhook = url.pathname === "/api/telegram/webhook";
      const stripeWebhook = url.pathname === "/api/billing/webhook";
      if (url.pathname.startsWith("/api/") && !telegramWebhook && !stripeWebhook) assertSameOrigin(request);
      if (request.method === "POST" && stripeWebhook) {
        const declared = Number(request.headers.get("content-length") || 0);
        if (declared > 256 * 1024) return json({ error: "Webhook body is too large" }, 413);
        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > 256 * 1024
          || !await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET)) {
          return json({ error: "Invalid webhook signature" }, 400);
        }
        const event = JSON.parse(rawBody);
        const eventId = cleanText(event.id, 120);
        const eventType = cleanText(event.type, 120);
        const eventCreated = Number.isSafeInteger(Number(event.created)) ? Number(event.created) : 0;
        if (!eventId || !eventType) return json({ error: "Invalid webhook event" }, 400);
        const processed = await env.DB.prepare("SELECT 1 AS done FROM billing_events WHERE event_id = ?").bind(eventId).first();
        if (processed) return json({ received: true });
        const object = event.data?.object || {};
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const requireBillingTarget = async (result, lookupStatement) => {
          if (Number(result?.meta?.changes || 0) > 0) return;
          if (await lookupStatement.first()) return; // A newer event already won the ordering guard.
          const error = new Error("Billing target is not ready; retry this webhook");
          error.status = 409;
          error.code = "BILLING_TARGET_PENDING";
          throw error;
        };
        if (eventType === "checkout.session.completed" && object.mode === "subscription" && object.payment_status !== "unpaid") {
          const userId = cleanText(object.client_reference_id || object.metadata?.user_id, 80);
          if (userId) {
            const result = await env.DB.prepare(
              `UPDATE entitlements SET plan = 'pro', status = 'active', source = 'stripe',
               provider_customer_id = ?, provider_subscription_id = ?, billing_event_created = ?, updated_at = ?
               WHERE user_id = ? AND billing_event_created <= ?`
            ).bind(cleanText(object.customer, 120) || null, cleanText(object.subscription, 120) || null, eventCreated, now, userId, eventCreated).run();
            await requireBillingTarget(result, env.DB.prepare("SELECT 1 FROM entitlements WHERE user_id = ?").bind(userId));
          }
        } else if (["invoice.paid", "invoice.payment_failed"].includes(eventType)) {
          const subscriptionId = cleanText(object.subscription || object.parent?.subscription_details?.subscription, 120);
          const status = eventType === "invoice.paid" ? "active" : "past_due";
          if (subscriptionId) {
            const result = await env.DB.prepare(
              `UPDATE entitlements SET status = ?, billing_event_created = ?, updated_at = ?
               WHERE provider_subscription_id = ? AND status <> 'canceled' AND billing_event_created <= ?`
            ).bind(status, eventCreated, now, subscriptionId, eventCreated).run();
            await requireBillingTarget(result, env.DB.prepare("SELECT 1 FROM entitlements WHERE provider_subscription_id = ?").bind(subscriptionId));
          }
        } else if (["customer.subscription.updated", "customer.subscription.deleted"].includes(eventType)) {
          const subscriptionId = cleanText(object.id, 120);
          const userId = cleanText(object.metadata?.user_id, 80);
          const stripeStatus = cleanText(object.status, 40);
          const mappedStatus = eventType === "customer.subscription.deleted" || ["canceled", "incomplete_expired"].includes(stripeStatus)
            ? "canceled" : stripeStatus === "active" ? "active" : stripeStatus === "trialing" ? "trialing" : "past_due";
          const periodEnd = Number.isFinite(Number(object.current_period_end))
            ? new Date(Number(object.current_period_end) * 1000).toISOString() : null;
          if (subscriptionId) {
            const result = await env.DB.prepare(
              `UPDATE entitlements SET plan = 'pro', status = ?, current_period_end = ?,
               provider_subscription_id = ?, provider_customer_id = COALESCE(?, provider_customer_id),
               billing_event_created = ?, updated_at = ?
               WHERE (provider_subscription_id = ? OR (provider_subscription_id IS NULL AND user_id = ?))
                 AND billing_event_created <= ?`
            ).bind(mappedStatus, periodEnd, subscriptionId, cleanText(object.customer, 120) || null,
              eventCreated, now, subscriptionId, userId, eventCreated).run();
            await requireBillingTarget(result, env.DB.prepare(
              "SELECT 1 FROM entitlements WHERE provider_subscription_id = ? OR (? <> '' AND user_id = ?)"
            ).bind(subscriptionId, userId, userId));
          }
        }
        await env.DB.prepare("INSERT INTO billing_events (event_id, event_type, processed_at) VALUES (?, ?, ?)")
          .bind(eventId, eventType, now).run();
        return json({ received: true });
      }
      if (request.method === "POST" && telegramWebhook) {
        if (!env.TELEGRAM_WEBHOOK_SECRET || request.headers.get("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) {
          return json({ error: "Unauthorized webhook" }, 401);
        }
        const update = await safeJsonBody(request);
        const callback = update.callback_query;
        const match = String(callback?.data || "").match(/^orbit:(approve|reject):([a-f0-9]{24})$/);
        const callbackChatId = String(callback?.message?.chat?.id || "");
        const editorIds = String(env.TELEGRAM_EDITOR_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
        const groupEditorAllowed = !callbackChatId.startsWith("-") || editorIds.includes(String(callback?.from?.id || ""));
        if (!callback || !match || callbackChatId !== String(env.TELEGRAM_CHAT_ID || "") || !groupEditorAllowed) {
          if (callback) await telegramCall(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "Bu i\u015Flem i\xE7in yetkiniz yok.", show_alert: true });
          return json({ ok: true });
        }
        const decision = match[1] === "approve" ? "approved" : "rejected";
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const reviewRow = await env.DB.prepare(
          `UPDATE telegram_reviews SET status = ?, reviewed_at = ?
           WHERE token = ? AND status = 'pending'
           RETURNING token, workspace_id, production_id, status`
        ).bind(decision, now, match[2]).first();
        if (!reviewRow) {
          await telegramCall(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "Bu onay iste\u011Fi art\u0131k ge\xE7erli de\u011Fil.", show_alert: true });
          return json({ ok: true });
        }
        const state = await stateFor({ id: reviewRow.workspace_id }, env);
        const item = state.productions.find((entry) => entry.id === reviewRow.production_id);
        if (!item) {
          return json({ ok: true });
        }
        const approved = match[1] === "approve";
        item.status = approved ? "approved" : "rejected";
        item.reviewedAt = now;
        item.telegram = {
          ...item.telegram || {},
          status: approved ? "approved" : "rejected",
          reviewedAt: now,
          reviewedBy: callback.from?.username || callback.from?.first_name || "Telegram editor"
        };
        try {
          await saveWorkspaceState(reviewRow.workspace_id, state, env);
        } catch (error) {
          await env.DB.prepare("UPDATE telegram_reviews SET status = 'pending', reviewed_at = NULL WHERE token = ? AND status = ?")
            .bind(match[2], decision).run();
          throw error;
        }
        await telegramCall(env, "answerCallbackQuery", {
          callback_query_id: callback.id,
          text: approved ? "Proje onayland\u0131." : "Proje reddedildi."
        });
        await telegramCall(env, "editMessageReplyMarkup", {
          chat_id: env.TELEGRAM_CHAT_ID,
          message_id: callback.message.message_id,
          reply_markup: { inline_keyboard: [] }
        });
        return json({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/api/analytics/events") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "analytics-event");
        const input = await safeJsonBody(request, 2048);
        const eventName = cleanText(input.event, 60);
        if (!ANALYTICS_EVENTS.has(eventName)) return json({ error: "Geçersiz analitik olayı" }, 400, await cookieHeaders(workspace));
        const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
        const language = Object.values(CONTENT_LANGUAGES).includes(metadata.language) ? metadata.language : "unknown";
        const surface = ["web", "pwa", "android", "ios", "unknown"].includes(metadata.surface) ? metadata.surface : "unknown";
        const result = ["success", "failure", "cancelled", "unknown"].includes(metadata.result) ? metadata.result : "unknown";
        const dimensionKey = `${language}:${surface}:${result}`;
        const day = new Date().toISOString().slice(0, 10);
        await env.DB.prepare(
          `INSERT INTO analytics_daily (event_day, event_name, dimension_key, event_count, updated_at)
           VALUES (?, ?, ?, 1, ?)
           ON CONFLICT(event_day, event_name, dimension_key) DO UPDATE SET
             event_count = event_count + 1, updated_at = excluded.updated_at`
        ).bind(day, eventName, dimensionKey, new Date().toISOString()).run();
        return json({ ok: true }, 202, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && url.pathname === "/api/auth/register") {
        const workspace = await workspaceFor(request, env);
        if (workspace.user) return json({ error: "Zaten bir hesapla giriş yaptın" }, 409);
        await enforceRateLimit(request, env, workspace.id, "auth-register");
        const input = await safeJsonBody(request);
        await verifyTurnstile(request, env, input.turnstileToken);
        const email = normalizeEmail(input.email);
        const password = assertPassword(input.password);
        const userId = crypto.randomUUID();
        const salt = bytesHex(crypto.getRandomValues(new Uint8Array(16)));
        const iterations = 310000;
        const passwordHash = await derivePasswordHash(password, salt, iterations);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await env.DB.batch([
            env.DB.prepare("INSERT INTO users (id, email_normalized, email_display, password_hash, password_salt, password_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
              .bind(userId, email, cleanText(input.email, 254), passwordHash, salt, iterations, now, now),
            env.DB.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)")
              .bind(workspace.id, userId, now),
            env.DB.prepare("INSERT INTO entitlements (user_id, plan, status, source, updated_at) VALUES (?, 'free', 'active', 'system', ?)")
              .bind(userId, now)
          ]);
        } catch (error) {
          if (/unique|constraint/i.test(String(error?.message || ""))) {
            return json({ error: "Hesap oluşturulamadı. Giriş yapmayı veya parola sıfırlamayı dene" }, 409, await cookieHeaders(workspace));
          }
          throw error;
        }
        const session = await createAuthSession(env, userId);
        const verificationToken = await createAuthActionToken(env, userId, "verify_email", 60);
        let verificationSent = false;
        try {
          verificationSent = (await sendTransactionalEmail(env, {
            to: cleanText(input.email, 254),
            subject: "Content Studio e-posta adresini doğrula",
            html: `<p>Content Studio hesabını doğrulamak için aşağıdaki bağlantıyı 60 dakika içinde aç.</p><p><a href="${publicOrigin(request, env)}/?verify=${verificationToken}">E-posta adresimi doğrula</a></p><p>Bu hesabı sen oluşturmadıysan bu mesajı yok sayabilirsin.</p>`
          })).sent;
        } catch {}
        return json({ account: { email: cleanText(input.email, 254), plan: "free", status: "active", emailVerified: false }, verificationRequired: true, verificationSent }, 201, {
          "set-cookie": authCookie(session.rawToken)
        });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/verify/request") {
        const input = await safeJsonBody(request);
        await verifyTurnstile(request, env, input.turnstileToken);
        const email = normalizeEmail(input.email);
        await enforceRateLimit(request, env, `verify:${await sha256Hex(email)}`, "auth-verify-request");
        const user = await env.DB.prepare("SELECT id, email_display, email_verified_at FROM users WHERE email_normalized = ?").bind(email).first();
        if (user && !user.email_verified_at) {
          await env.DB.prepare("UPDATE auth_action_tokens SET used_at = ? WHERE user_id = ? AND purpose = 'verify_email' AND used_at IS NULL")
            .bind(new Date().toISOString(), user.id).run();
          const token = await createAuthActionToken(env, user.id, "verify_email", 60);
          await sendTransactionalEmail(env, {
            to: user.email_display,
            subject: "Content Studio e-posta adresini doğrula",
            html: `<p>Content Studio hesabını doğrulamak için aşağıdaki bağlantıyı 60 dakika içinde aç.</p><p><a href="${publicOrigin(request, env)}/?verify=${token}">E-posta adresimi doğrula</a></p>`
          }).catch(() => {});
        }
        return json({ ok: true, message: "Hesap varsa doğrulama bağlantısı gönderildi" });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/verify/confirm") {
        const input = await safeJsonBody(request);
        const token = await consumeAuthActionToken(env, input.token, "verify_email");
        if (!token) return json({ error: "Doğrulama bağlantısı geçersiz veya süresi dolmuş" }, 400);
        await env.DB.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), new Date().toISOString(), token.user_id).run();
        return json({ ok: true, emailVerified: true });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/password/request") {
        const input = await safeJsonBody(request);
        await verifyTurnstile(request, env, input.turnstileToken);
        const email = normalizeEmail(input.email);
        await enforceRateLimit(request, env, `reset:${await sha256Hex(email)}`, "auth-password-request");
        const user = await env.DB.prepare("SELECT id, email_display FROM users WHERE email_normalized = ?").bind(email).first();
        if (user) {
          await env.DB.prepare("UPDATE auth_action_tokens SET used_at = ? WHERE user_id = ? AND purpose = 'reset_password' AND used_at IS NULL")
            .bind(new Date().toISOString(), user.id).run();
          const token = await createAuthActionToken(env, user.id, "reset_password", 30);
          await sendTransactionalEmail(env, {
            to: user.email_display,
            subject: "Content Studio parola sıfırlama",
            html: `<p>Parolanı yenilemek için aşağıdaki bağlantıyı 30 dakika içinde aç.</p><p><a href="${publicOrigin(request, env)}/?reset=${token}">Parolamı yenile</a></p><p>Bu isteği sen yapmadıysan mesajı yok sayabilirsin.</p>`
          }).catch(() => {});
        }
        return json({ ok: true, message: "Hesap varsa parola yenileme bağlantısı gönderildi" });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/password/reset") {
        const input = await safeJsonBody(request);
        await verifyTurnstile(request, env, input.turnstileToken);
        const password = assertPassword(input.password);
        const token = await consumeAuthActionToken(env, input.token, "reset_password");
        if (!token) return json({ error: "Parola yenileme bağlantısı geçersiz veya süresi dolmuş" }, 400);
        const salt = bytesHex(crypto.getRandomValues(new Uint8Array(16)));
        const iterations = 310000;
        const passwordHash = await derivePasswordHash(password, salt, iterations);
        const now = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, updated_at = ? WHERE id = ?")
            .bind(passwordHash, salt, iterations, now, token.user_id),
          env.DB.prepare("UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
            .bind(now, token.user_id)
        ]);
        return json({ ok: true }, 200, { "set-cookie": authCookie("", 0) });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const input = await safeJsonBody(request);
        const email = normalizeEmail(input.email);
        const password = assertPassword(input.password);
        await enforceRateLimit(request, env, `login:${await sha256Hex(email)}`, "auth-login");
        const user = await authenticateUser(env, email, password);
        if (!user) return json({ error: "E-posta veya parola hatalı" }, 401);
        const entitlement = await env.DB.prepare("SELECT plan, status, current_period_end FROM entitlements WHERE user_id = ?")
          .bind(user.id).first();
        const session = await createAuthSession(env, user.id);
        return json({ account: {
          email: user.email_display,
          plan: entitlement?.plan || "free",
          status: entitlement?.status || "active",
          currentPeriodEnd: entitlement?.current_period_end || null,
          emailVerified: Boolean(user.email_verified_at)
        } }, 200, { "set-cookie": authCookie(session.rawToken) });
      }
      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const cookie = request.headers.get("cookie") || "";
        const raw = cookie.match(/(?:^|;\s*)terzi_session=([^;]+)(?:;|$)/i)?.[1];
        if (raw && /^[A-Za-z0-9_-]{43}$/.test(raw)) {
          await env.DB.prepare("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
            .bind((/* @__PURE__ */ new Date()).toISOString(), await sha256Hex(raw)).run();
        }
        return json({ ok: true }, 200, { "set-cookie": authCookie("", 0) });
      }
      if (request.method === "DELETE" && url.pathname === "/api/auth/account") {
        const workspace = await workspaceFor(request, env);
        const user = requireAccount(workspace);
        const input = await safeJsonBody(request);
        if (input.confirmation !== "DELETE") return json({ error: "Hesap silme onayı eksik" }, 400, await cookieHeaders(workspace));
        const authenticated = await authenticateUser(env, normalizeEmail(user.email_display), assertPassword(input.password));
        if (!authenticated) return json({ error: "Parola hatalı" }, 401, await cookieHeaders(workspace));
        if (user.provider_subscription_id && !["canceled", "incomplete_expired"].includes(user.entitlement_status)) {
          return json({ error: "Önce bağlı Pro üyeliğini Üyeliği yönet ekranından iptal et" }, 409, await cookieHeaders(workspace));
        }
        const memberships = await env.DB.prepare("SELECT workspace_id FROM workspace_members WHERE user_id = ?").bind(user.id).all();
        if (env.MEDIA) {
          for (const membership of memberships.results || []) {
            const media = await env.DB.prepare("SELECT object_key FROM cloud_media WHERE workspace_id = ? AND object_key IS NOT NULL").bind(membership.workspace_id).all();
            const keys = (media.results || []).map((row) => row.object_key).filter(Boolean);
            if (keys.length) await env.MEDIA.delete(keys);
          }
        }
        const statements = (memberships.results || []).map((membership) => env.DB.prepare("DELETE FROM workspaces WHERE id = ?").bind(membership.workspace_id));
        statements.push(env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id));
        await env.DB.batch(statements);
        return json({ ok: true }, 200, { "set-cookie": authCookie("", 0) });
      }
      if (request.method === "POST" && url.pathname === "/api/billing/checkout") {
        const workspace = await workspaceFor(request, env);
        const user = requireAccount(workspace);
        await enforceRateLimit(request, env, user.id, "billing-checkout");
        if (!user.email_verified_at) return json({ error: "Ödeme öncesinde e-posta adresini doğrula" }, 403, await cookieHeaders(workspace));
        if (!launchReadiness(env).ready) {
          return json({ error: "Atölye Pro ödemeleri henüz kullanıma açılmadı" }, 503, await cookieHeaders(workspace));
        }
        if (hasProAccess(workspace)) return json({ error: "Atölye Pro üyeliğin zaten aktif" }, 409, await cookieHeaders(workspace));
        const form = {
          mode: "subscription",
          "line_items[0][price]": env.STRIPE_PRICE_PRO,
          "line_items[0][quantity]": "1",
          client_reference_id: user.id,
          customer_email: user.email_display,
          "metadata[user_id]": user.id,
          "subscription_data[metadata][user_id]": user.id,
          success_url: `${url.origin}/?billing=success`,
          cancel_url: `${url.origin}/?billing=cancelled`,
          allow_promotion_codes: "true",
          "custom_text[submit][message]": "Atölye Pro yinelenen bir aboneliktir. Üyeliğini müşteri portalından istediğin zaman yönetebilir veya iptal edebilirsin."
        };
        if (user.provider_customer_id) {
          delete form.customer_email;
          form.customer = user.provider_customer_id;
        }
        const checkout = await stripeCall(env, "checkout/sessions", form);
        return json({ url: checkout.url }, 201, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && url.pathname === "/api/billing/portal") {
        const workspace = await workspaceFor(request, env);
        const user = requireAccount(workspace);
        await enforceRateLimit(request, env, user.id, "billing-portal");
        if (!user.provider_customer_id) {
          return json({ error: "Yönetilecek bir ödeme hesabı bulunamadı" }, 404, await cookieHeaders(workspace));
        }
        const portal = await stripeCall(env, "billing_portal/sessions", {
          customer: user.provider_customer_id,
          return_url: `${url.origin}/?billing=portal-return`
        });
        return json({ url: portal.url }, 201, await cookieHeaders(workspace));
      }
      if (request.method === "GET" && url.pathname === "/api/state") {
        const workspace = await workspaceFor(request, env);
        const state = await stateFor(workspace, env);
        state.runtime.youtubeConfigured = Boolean(env.YOUTUBE_API_KEY);
        state.runtime.r2Configured = Boolean(env.MEDIA);
        state.runtime.managedImageGeneration = Boolean(env.AI);
        state.runtime.cloudflareConfigured = Boolean(env.AI);
        state.runtime.demo = await demoTrialStatus(env, workspace.id);
        // Only advertise the demo when the managed story service can deliver it.
        state.runtime.demoAvailable = Boolean(env.AI && workspace.user?.email_verified_at) && state.runtime.demo.used < state.runtime.demo.limit;
        state.runtime.telegramConfigured = Boolean(
          env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && env.TELEGRAM_WEBHOOK_SECRET
        );
        state.runtime.launchReadiness = launchReadiness(env);
        state.runtime.billingConfigured = state.runtime.launchReadiness.ready;
        state.runtime.turnstileSiteKey = cleanText(env.TURNSTILE_SITE_KEY || "", 120);
        state.runtime.legal = {
          businessName: cleanText(env.BUSINESS_NAME || "", 160),
          businessAddress: cleanText(env.BUSINESS_ADDRESS || "", 300),
          supportEmail: cleanText(env.SUPPORT_EMAIL || "", 254)
        };
        const selectedLanguage = CONTENT_LANGUAGES[state.settings.contentLanguage] || "en";
        state.runtime.capabilities = {
          managedText: Boolean(env.AI),
          managedImage: Boolean(env.AI),
          managedSpeech: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY || (env.AI && MELO_LANGUAGES.has(selectedLanguage))),
          ownAiAccount: true
        };
        state.runtime.managedUsage = hasProAccess(workspace)
          ? { projects: await monthlyQuotaStatus(env, workspace.id, "managed_ai_generate", 30) }
          : null;
        state.runtime.account = workspace.user ? {
          email: workspace.user.email_display,
          plan: workspace.user.plan || "free",
          status: workspace.user.entitlement_status || "active",
          emailVerified: Boolean(workspace.user.email_verified_at)
        } : null;
        state.runtime.entitlement = workspace.user ? {
          plan: workspace.user.plan || "free",
          status: workspace.user.entitlement_status || "active",
          currentPeriodEnd: workspace.user.current_period_end || null
        } : { plan: "guest", status: "active", currentPeriodEnd: null };
        return json(state, 200, await cookieHeaders(workspace));
      }
      if (request.method === "GET" && url.pathname === "/api/image-proxy") {
        const source = url.searchParams.get("url") || "";
        const downloaded = await downloadPublicImage(source);
        return new Response(downloaded.bytes, {
          status: 200,
          headers: {
            "content-type": downloaded.contentType,
            "cache-control": "private, max-age=300",
            "access-control-allow-origin": url.origin
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/api/files") {
        const workspace = await workspaceFor(request, env);
        return json(
          { files: [] },
          200,
          await cookieHeaders(workspace)
        );
      }
      if (request.method === "POST" && url.pathname === "/api/cloud-media/uploads") {
        const workspace = await workspaceFor(request, env);
        requirePro(workspace);
        await enforceRateLimit(request, env, workspace.id, "media-upload-create");
        await expireStaleMediaUploads(env, workspace.id);
        if (!env.MEDIA) return json({ error: "R2 medya deposu yap\u0131land\u0131r\u0131lmam\u0131\u015F" }, 503, await cookieHeaders(workspace));
        const input = await safeJsonBody(request);
        const fileName = cleanText(input.fileName, 180);
        const contentType = ["video/mp4", "video/webm"].includes(input.contentType) ? input.contentType : "";
        const byteSize = Number(input.byteSize || 0);
        if (!fileName || !contentType || !Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > CLOUD_MEDIA_FILE_LIMIT) {
          return json({ error: "Ge\xE7erli bir MP4/WebM dosyas\u0131 gerekli" }, 400, await cookieHeaders(workspace));
        }
        const storage = await env.DB.prepare(
          "SELECT COALESCE(SUM(byte_size), 0) AS used FROM cloud_media WHERE workspace_id = ? AND status IN ('uploading', 'ready')"
        ).bind(workspace.id).first();
        if (Number(storage?.used || 0) + byteSize > CLOUD_MEDIA_WORKSPACE_LIMIT) {
          return json({ error: "Bu çalışma alanının bulut depolama sınırına ulaşıldı" }, 413, await cookieHeaders(workspace));
        }
        const id = crypto.randomUUID();
        const extension = contentType === "video/mp4" ? "mp4" : "webm";
        const objectKey = `${workspace.id}/${id}.${extension}`;
        const upload = await env.MEDIA.createMultipartUpload(objectKey, {
          httpMetadata: { contentType, contentDisposition: `attachment; filename="${fileName.replace(/["\\]/g, "-")}"` },
          customMetadata: { workspaceId: workspace.id, projectId: cleanText(input.projectId, 80) }
        });
        try {
          await env.DB.prepare("INSERT INTO cloud_media (id, workspace_id, project_id, object_key, upload_id, file_name, content_type, byte_size, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploading', ?)").bind(
            id,
            workspace.id,
            cleanText(input.projectId, 80) || null,
            objectKey,
            upload.uploadId,
            fileName,
            contentType,
            byteSize,
            (/* @__PURE__ */ new Date()).toISOString()
          ).run();
        } catch (error) {
          const aborted = await abortMultipartWithRetry(upload);
          if (!aborted) {
            await env.DB.prepare("INSERT OR IGNORE INTO cloud_media (id, workspace_id, project_id, object_key, upload_id, file_name, content_type, byte_size, status, created_at, cleanup_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?, 1)").bind(
              id, workspace.id, cleanText(input.projectId, 80) || null, objectKey,
              upload.uploadId, fileName, contentType, byteSize,
              (/* @__PURE__ */ new Date()).toISOString()
            ).run().catch(() => {});
          }
          if (/cloud media workspace quota/i.test(String(error?.message || ""))) {
            return json({ error: "Bu çalışma alanının bulut depolama sınırına ulaşıldı" }, 413, await cookieHeaders(workspace));
          }
          throw error;
        }
        return json({ id, uploadId: upload.uploadId, partSize: CLOUD_MEDIA_PART_SIZE }, 201, await cookieHeaders(workspace));
      }
      const mediaPart = url.pathname.match(/^\/api\/cloud-media\/uploads\/([a-f0-9-]+)\/parts\/(\d+)$/);
      if (request.method === "PUT" && mediaPart) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "media-upload-part");
        const row = await env.DB.prepare("SELECT object_key, upload_id, status, byte_size FROM cloud_media WHERE id = ? AND workspace_id = ?").bind(mediaPart[1], workspace.id).first();
        if (!row || row.status !== "uploading" || row.upload_id !== url.searchParams.get("uploadId")) {
          return json({ error: "Y\xFCkleme oturumu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        }
        const partNumber = Number(mediaPart[2]);
        const contentLength = Number(request.headers.get("content-length") || 0);
        const maxParts = Math.ceil(Number(row.byte_size) / CLOUD_MEDIA_PART_SIZE);
        if (!request.body || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > maxParts
          || !Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > CLOUD_MEDIA_PART_SIZE) {
          return json({ error: "Ge\xE7ersiz y\xFCkleme par\xE7as\u0131" }, 400, await cookieHeaders(workspace));
        }
        const upload = env.MEDIA.resumeMultipartUpload(row.object_key, row.upload_id);
        const part = await upload.uploadPart(partNumber, request.body);
        return json(part, 200, await cookieHeaders(workspace));
      }
      const mediaComplete = url.pathname.match(/^\/api\/cloud-media\/uploads\/([a-f0-9-]+)\/complete$/);
      if (request.method === "POST" && mediaComplete) {
        const workspace = await workspaceFor(request, env);
        const row = await env.DB.prepare("SELECT object_key, upload_id, status, file_name, content_type, byte_size FROM cloud_media WHERE id = ? AND workspace_id = ?").bind(mediaComplete[1], workspace.id).first();
        if (!row || row.status !== "uploading") return json({ error: "Y\xFCkleme oturumu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const input = await safeJsonBody(request, 256 * 1024);
        const parts = Array.isArray(input.parts) ? input.parts.map((part) => ({
          partNumber: Number(part.partNumber),
          etag: cleanText(part.etag, 160)
        })) : [];
        if (!parts.length || parts.some((part) => !Number.isInteger(part.partNumber) || !part.etag)) {
          return json({ error: "Y\xFCkleme par\xE7alar\u0131 eksik" }, 400, await cookieHeaders(workspace));
        }
        const upload = env.MEDIA.resumeMultipartUpload(row.object_key, row.upload_id);
        const object = await upload.complete(parts);
        if (Number(object.size) !== Number(row.byte_size)) {
          if (await cleanupMediaUpload(env, row, true)) {
            await env.DB.prepare("UPDATE cloud_media SET status = 'failed' WHERE id = ? AND workspace_id = ?")
              .bind(mediaComplete[1], workspace.id).run();
          }
          return json({ error: "Yüklenen dosyanın boyutu beklenen değerle eşleşmiyor" }, 409, await cookieHeaders(workspace));
        }
        const completedAt = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await env.DB.prepare("UPDATE cloud_media SET status = 'ready', completed_at = ? WHERE id = ? AND workspace_id = ?").bind(completedAt, mediaComplete[1], workspace.id).run();
        } catch (error) {
          if (await cleanupMediaUpload(env, row, true)) {
            await env.DB.prepare("UPDATE cloud_media SET status = 'failed' WHERE id = ? AND workspace_id = ?")
              .bind(mediaComplete[1], workspace.id).run().catch(() => {});
          }
          throw error;
        }
        return json({
          id: mediaComplete[1],
          fileName: row.file_name,
          contentType: row.content_type,
          byteSize: row.byte_size,
          etag: object.httpEtag,
          url: `/api/cloud-media/${mediaComplete[1]}`,
          completedAt
        }, 201, await cookieHeaders(workspace));
      }
      const mediaAbort = url.pathname.match(/^\/api\/cloud-media\/uploads\/([a-f0-9-]+)$/);
      if (request.method === "DELETE" && mediaAbort) {
        const workspace = await workspaceFor(request, env);
        const row = await env.DB.prepare("SELECT object_key, upload_id, status FROM cloud_media WHERE id = ? AND workspace_id = ?")
          .bind(mediaAbort[1], workspace.id).first();
        if (!row || row.status !== "uploading") return json({ error: "Yükleme oturumu bulunamadı" }, 404, await cookieHeaders(workspace));
        if (!await cleanupMediaUpload(env, row)) {
          return json({ error: "Yükleme henüz temizlenemedi; tekrar dene" }, 503, await cookieHeaders(workspace));
        }
        await env.DB.prepare("UPDATE cloud_media SET status = 'failed' WHERE id = ? AND workspace_id = ? AND status = 'uploading'")
          .bind(mediaAbort[1], workspace.id).run();
        return json({ ok: true }, 200, await cookieHeaders(workspace));
      }
      const cloudMedia = url.pathname.match(/^\/api\/cloud-media\/([a-f0-9-]+)$/);
      if (request.method === "GET" && cloudMedia) {
        const workspace = await workspaceFor(request, env);
        const row = await env.DB.prepare("SELECT object_key, file_name, content_type, byte_size FROM cloud_media WHERE id = ? AND workspace_id = ? AND status = 'ready'").bind(cloudMedia[1], workspace.id).first();
        if (!row) return json({ error: "Bulut videosu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const totalSize = Number(row.byte_size);
        const rangeHeader = request.headers.get("range");
        let range;
        if (rangeHeader) {
          const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
          if (!match || (!match[1] && !match[2])) {
            return new Response(null, { status: 416, headers: { ...SECURITY_HEADERS, ...await cookieHeaders(workspace), "content-range": `bytes */${totalSize}` } });
          }
          const suffixLength = match[1] ? null : Number(match[2]);
          if (suffixLength !== null && (!Number.isSafeInteger(suffixLength) || suffixLength < 1)) {
            return new Response(null, { status: 416, headers: { ...SECURITY_HEADERS, ...await cookieHeaders(workspace), "content-range": `bytes */${totalSize}` } });
          }
          let start = match[1] ? Number(match[1]) : Math.max(0, totalSize - suffixLength);
          let end = match[2] && match[1] ? Number(match[2]) : totalSize - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= totalSize || end < start) {
            return new Response(null, { status: 416, headers: { ...SECURITY_HEADERS, ...await cookieHeaders(workspace), "content-range": `bytes */${totalSize}` } });
          }
          end = Math.min(end, totalSize - 1);
          range = { offset: start, length: end - start + 1 };
        }
        const object = await env.MEDIA.get(row.object_key, range ? { range } : undefined);
        if (!object) return json({ error: "Bulut videosu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        return new Response(object.body, { status: range ? 206 : 200, headers: {
          ...SECURITY_HEADERS,
          ...await cookieHeaders(workspace),
          "content-type": row.content_type,
          "content-length": String(range?.length || totalSize),
          "accept-ranges": "bytes",
          ...(range ? { "content-range": `bytes ${range.offset}-${range.offset + range.length - 1}/${totalSize}` } : {}),
          "etag": object.httpEtag,
          "content-disposition": `inline; filename="${row.file_name.replace(/["\\]/g, "-")}"`,
          "cache-control": "private, max-age=3600"
        } });
      }
      if (request.method === "POST" && url.pathname === "/api/telegram/sync") {
        const workspace = await workspaceFor(request, env);
        return json({ processed: 0, webhook: true }, 200, await cookieHeaders(workspace));
      }
      const uploadedMedia = url.pathname.match(/^\/api\/uploads\/([a-zA-Z0-9-]+\.(?:jpg|jpeg|png|webp))$/);
      if (request.method === "GET" && uploadedMedia) {
        const workspace = await workspaceFor(request, env);
        const media = await env.DB.prepare("SELECT content_type, data_url FROM uploaded_media WHERE id = ? AND workspace_id = ?").bind(uploadedMedia[1], workspace.id).first();
        if (!media) return json({ error: "G\xF6rsel bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const encoded = String(media.data_url).split(",")[1] || "";
        const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
        return new Response(bytes, { headers: { ...SECURITY_HEADERS, ...await cookieHeaders(workspace), "content-type": media.content_type || "image/jpeg", "cache-control": "private, max-age=3600" } });
      }
      if (request.method === "POST" && url.pathname === "/api/tts") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "tts");
        const input = await safeJsonBody(request);
        const prompt = cleanSpeechText(input.text, 4e3);
        if (!prompt) return json({ error: "Seslendirilecek metin gerekli" }, 400, await cookieHeaders(workspace));
        const lang = Object.values(CONTENT_LANGUAGES).includes(input.lang) ? input.lang : "en";
        const style = ["natural", "energetic", "documentary", "inspiring"].includes(input.style) ? input.style : "natural";
        const deviceGeminiKey = cleanText(request.headers.get("x-orbit-ai-key") || "", 300);
        const proTts = hasProAccess(workspace);
        const ttsReservation = deviceGeminiKey ? "none" : proTts ? "daily" : "trial";
        let globalTtsReserved = false;
        let workspaceTtsReserved = false;
        try {
          if (ttsReservation !== "none") {
            await consumeGlobalDailyQuota(env, "managed_tts", Number(env.MANAGED_DAILY_TTS_CAP || 200));
            globalTtsReserved = true;
          }
          if (ttsReservation === "daily") {
            await consumeDailyQuota(env, workspace.id, "tts", 60);
            workspaceTtsReserved = true;
          } else if (ttsReservation === "trial") {
            await consumeLifetimeQuota(env, workspace.id, "tts_trial", 3);
            workspaceTtsReserved = true;
          }
          let audio;
          let contentType = "audio/mpeg";
          const geminiKey = deviceGeminiKey || cleanText(env.GEMINI_API_KEY || "", 300);
          if (geminiKey) {
              audio = await generateGeminiSpeech(prompt, geminiKey, lang, style);
              contentType = "audio/wav";
          } else if (env.OPENAI_API_KEY) {
              audio = await generateOpenAiSpeech(prompt, cleanText(env.OPENAI_API_KEY, 300), lang, style);
              contentType = "audio/mpeg";
          } else if (!MELO_LANGUAGES.has(lang)) {
              throw Object.assign(new Error(`${LANGUAGE_NAMES[lang] || lang} seslendirmesi için yönetilen ses servisi gerekli.`), { status: 409 });
          } else {
            const result = await env.AI.run("@cf/myshell-ai/melotts", { prompt, lang });
            audio = result;
            if (result && typeof result === "object" && "audio" in result) audio = result.audio;
            if (typeof audio === "string") {
              audio = Uint8Array.from(atob(audio.replace(/^data:audio\/[^;]+;base64,/, "")), (char) => char.charCodeAt(0));
            }
          }
          if (!audio) throw Object.assign(new Error("Ses motoru boş yanıt döndürdü"), { status: 502 });
          return new Response(audio, { status: 200, headers: { ...SECURITY_HEADERS, ...await cookieHeaders(workspace), "content-type": contentType, "cache-control": "no-store" } });
        } catch (error) {
          if (globalTtsReserved) await refundGlobalDailyQuota(env, "managed_tts").catch(() => {});
          if (workspaceTtsReserved && ttsReservation === "daily") await refundDailyQuota(env, workspace.id, "tts").catch(() => {});
          else if (workspaceTtsReserved && ttsReservation === "trial") await refundLifetimeQuota(env, workspace.id, "tts_trial").catch(() => {});
          throw error;
        }
      }
      if (request.method === "PUT" && url.pathname === "/api/settings") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "settings");
        const currentState = await stateFor(workspace, env);
        const input = await safeJsonBody(request);
        const settings = safeSettings(input, currentState.settings);
        const settingsSnapshot = workspaceSnapshots.get(currentState);
        const settingsResult = await env.DB.prepare(
          `UPDATE workspace_state SET settings_json = ?, updated_at = ?
         WHERE workspace_id = ? AND settings_json = ?`
        ).bind(JSON.stringify(settings), (/* @__PURE__ */ new Date()).toISOString(), workspace.id,
          settingsSnapshot?.settingsJson || JSON.stringify(currentState.settings)).run();
        if (Number(settingsResult.meta?.changes) !== 1) throw stateConflict();
        currentState.settings = settings;
        if (settingsSnapshot) workspaceSnapshots.set(currentState, { ...settingsSnapshot, settingsJson: JSON.stringify(settings), state: structuredClone(currentState) });
        return json(
          settings,
          200,
          await cookieHeaders(workspace)
        );
      }
      if (request.method === "POST" && url.pathname === "/api/media/url-import") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "url-image-import");
        const input = await safeJsonBody(request, 8 * 1024);
        if (input.rightsConfirmed !== true) return json({ error: "G\xF6rsel kullan\u0131m hakk\u0131 onaylanmal\u0131" }, 400, await cookieHeaders(workspace));
        const state = await stateFor(workspace, env);
        const project = state.productions.find((item) => item.id === cleanText(input.projectId, 80));
        if (!project) return json({ error: "Proje bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const downloaded = await downloadPublicImage(cleanText(input.url, 2e3));
        const extension = downloaded.contentType === "image/png" ? "png" : downloaded.contentType === "image/webp" ? "webp" : "jpg";
        const filename = `${project.id}-${crypto.randomUUID()}.${extension}`;
        await env.DB.prepare("INSERT INTO uploaded_media (id, workspace_id, content_type, data_url, created_at) VALUES (?, ?, ?, ?, ?)").bind(filename, workspace.id, downloaded.contentType, downloaded.dataUrl, (/* @__PURE__ */ new Date()).toISOString()).run();
        const sourceUrl = assertPublicImageUrl(input.url).href;
        const asset = {
          assetId: `url-${crypto.randomUUID()}`,
          source: "url",
          sourceLabel: "Kullan\u0131c\u0131 URL\u2019si",
          title: new URL(downloaded.finalUrl).hostname,
          previewUrl: `/api/uploads/${filename}`,
          originalUrl: downloaded.finalUrl,
          sourcePage: sourceUrl,
          license: "Kullan\u0131c\u0131 taraf\u0131ndan onayland\u0131",
          contentType: downloaded.contentType,
          byteSize: downloaded.bytes.byteLength,
          riskFlags: []
        };
        project.visualAssets ||= project.sourceAsset ? [project.sourceAsset] : [];
        project.visualAssets.push(asset);
        project.images = project.visualAssets.map((item) => item.previewUrl);
        project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json({ asset, production: project }, 201, await cookieHeaders(workspace));
      }
      if (request.method === "GET" && url.pathname === "/api/media/search") {
        const workspace = await workspaceFor(request, env);
        const query = cleanText(url.searchParams.get("q"), 120);
        const source = url.searchParams.get("source") === "wikimedia" ? "wikimedia" : "nasa";
        if (query.length < 2) {
          return json(
            { error: "En az iki karakter girin" },
            400,
            await cookieHeaders(workspace)
          );
        }
        await enforceRateLimit(request, env, workspace.id, "media-search");
        const quota = await consumeDailyQuota(env, workspace.id, "media_search", 60);
        try {
          const result = await searchMediaSmart(source, query);
          return json({ ...result, source: result.sourceUsed, quota }, 200, await cookieHeaders(workspace));
        } catch (error) {
          await refundDailyQuota(env, workspace.id, "media_search").catch(() => {});
          throw error;
        }
      }
      if (request.method === "GET" && url.pathname === "/api/youtube/trends") {
        const workspace = await workspaceFor(request, env);
        const region = cleanText(url.searchParams.get("region") || "TR", 2).toUpperCase();
        const category = cleanText(url.searchParams.get("category") || "0", 3);
        if (!/^[A-Z]{2}$/.test(region) || !/^\d{1,3}$/.test(category)) {
          return json({ error: "Ge\xE7erli \xFClke ve kategori gerekli" }, 400, await cookieHeaders(workspace));
        }
        await enforceRateLimit(request, env, workspace.id, "youtube-trends");
        const quota = await consumeDailyQuota(env, workspace.id, "youtube_trends", 30);
        const items = await fetchYoutubeTrends(
          env,
          region,
          category,
          request.headers.get("x-orbit-youtube-key") || ""
        );
        return json({ region, category, items, quota }, 200, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && url.pathname === "/api/youtube/trends/import") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "youtube-trend-import");
        const state = await stateFor(workspace, env);
        const input = await safeJsonBody(request);
        const videoId = cleanText(input.videoId, 32);
        const title = cleanText(input.title, 300);
        if (!videoId || !title) return json({ error: "Trend videosu bilgisi eksik" }, 400, await cookieHeaders(workspace));
        const sourceUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        const idea = {
          id: crypto.randomUUID(),
          topic: title,
          sources: [
            "Ara\u015Ft\u0131rma sinyali: YouTube mostPopular listesi",
            `Referans video: ${title}`,
            `Kanal: ${cleanText(input.channelTitle, 200)}`,
            `G\xF6r\xFCnt\xFClenme: ${Number(input.views || 0)}`,
            `Ba\u011Flant\u0131: ${sourceUrl}`,
            "Kural: Referans videoyu veya k\xFC\xE7\xFCk resmini kopyalama; konuyu \xF6zg\xFCn bir a\xE7\u0131 ve do\u011Frulanabilir kaynaklarla yeniden ara\u015Ft\u0131r."
          ].join("\n"),
          status: "new",
          sourceType: "youtube-trend",
          trendSource: { videoId, title, channelTitle: cleanText(input.channelTitle, 200), url: sourceUrl },
          contentType: ["youtube", "reels"].includes(input.contentType) ? input.contentType : "shorts",
          imageFit: "cover",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        state.ideas.unshift(idea);
        await saveWorkspaceState(workspace.id, state, env);
        return json(idea, 201, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && url.pathname === "/api/media/import") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "media-import");
        const quota = await consumeDailyQuota(env, workspace.id, "media_import", 30);
        try {
        const state = await stateFor(workspace, env);
        const input = await safeJsonBody(request);
        const source = input.source === "wikimedia" ? "wikimedia" : "nasa";
        const asset = await resolveAsset(source, cleanText(input.assetId, 120));
        if (!asset) throw Object.assign(new Error("G\xF6rsel bulunamad\u0131"), { status: 404 });
        if (asset.riskFlags?.length) {
          throw Object.assign(new Error(asset.riskFlags[0]), { status: 409, asset });
        }
        const idea = {
          id: crypto.randomUUID(),
          topic: asset.title,
          sources: [
            `Kaynak: ${asset.sourceLabel}`,
            `Kimlik: ${asset.assetId}`,
            `Ba\u015Fl\u0131k: ${asset.title}`,
            `A\xE7\u0131klama: ${asset.description}`,
            `Tarih: ${asset.dateCreated || "belirtilmemi\u015F"}`,
            `\xDCretici: ${asset.photographer || "belirtilmemi\u015F"}`,
            `Lisans: ${asset.license}`,
            `Ba\u011Flant\u0131: ${asset.sourcePage}`,
            "Kural: Yaln\u0131zca bu metadata i\xE7indeki do\u011Frulanabilir bilgileri kullan."
          ].join("\n"),
          status: "new",
          sourceType: source,
          sourceAsset: asset,
          contentLanguage: normalizeContentLanguage(input.contentLanguage, state.settings.contentLanguage || "English"),
          nasaAsset: source === "nasa" ? asset : null,
          contentType: ["reels", "youtube"].includes(input.contentType) ? input.contentType : "shorts",
          imageFit: input.imageFit === "contain" ? "contain" : "cover",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        state.ideas.unshift(idea);
        await saveWorkspaceState(workspace.id, state, env);
        return json({ ...idea, quota }, 201, await cookieHeaders(workspace));
        } catch (error) {
          await refundDailyQuota(env, workspace.id, "media_import").catch(() => {});
          throw error;
        }
      }
      if (request.method === "POST" && url.pathname === "/api/projects/from-story") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "project-create");
        const input = await safeJsonBody(request);
        const title = cleanText(input.title, 180);
        const narration = cleanText(input.narration, 12e3);
        if (!title || narration.length < 40) return json({ error: "Ba\u015Fl\u0131k ve en az 40 karakterlik hik\xE2ye gerekli" }, 400, await cookieHeaders(workspace));
        const sentences = narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [narration];
        const sceneCount = Math.max(3, Math.min(8, Math.ceil(sentences.length / 2)));
        const perScene = Math.ceil(sentences.length / sceneCount);
        const scenes = Array.from({ length: sceneCount }, (_, index) => {
          const text = sentences.slice(index * perScene, (index + 1) * perScene).join(" ").trim();
          return text ? { seconds: `${index * 6}-${(index + 1) * 6}`, type: "visual", text } : null;
        }).filter(Boolean);
        const state = await stateFor(workspace, env);
        const production = {
          id: crypto.randomUUID(),
          status: "approved",
          content: { mode: input.manual ? "manual" : "story-to-visual", title, hook: sentences[0]?.trim() || title, narration, scenes, disclosure: "User-provided story" },
          sourceAsset: null,
          contentLanguage: normalizeContentLanguage(input.contentLanguage, inferNarrationLanguage(narration, state.settings.contentLanguage || "English")),
          contentProfile: input.contentProfile === "kids" ? "kids" : "general",
          targetAgeGroups: state.settings.targetAgeGroups || [],
          rules: state.settings.rules || {},
          visualStyle: input.visualStyle === "documentary" ? "documentary" : "animated",
          contentType: ["reels", "youtube"].includes(input.contentType) ? input.contentType : "shorts",
          imageFit: input.imageFit === "contain" ? "contain" : "cover",
          visualAssets: [],
          images: [],
          reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        state.productions.unshift(production);
        await saveWorkspaceState(workspace.id, state, env);
        return json(production, 201, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && url.pathname === "/api/ideas") {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "idea-create");
        const input = await safeJsonBody(request);
        const topic = cleanText(input.topic, 180);
        if (!topic) return json({ error: "Konu gerekli" }, 400, await cookieHeaders(workspace));
        const state = await stateFor(workspace, env);
        const idea = {
          id: crypto.randomUUID(),
          topic,
          sources: cleanText(input.sources, 2e3),
          contentLanguage: normalizeContentLanguage(input.contentLanguage, state.settings.contentLanguage || "English"),
          contentType: ["reels", "youtube"].includes(input.contentType) ? input.contentType : "shorts",
          imageFit: input.imageFit === "contain" ? "contain" : "cover",
          status: "new",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        state.ideas.unshift(idea);
        await saveWorkspaceState(workspace.id, state, env);
        return json(idea, 201, await cookieHeaders(workspace));
      }
      const ideaAssets = url.pathname.match(/^\/api\/ideas\/([^/]+)\/assets$/);
      if (request.method === "PUT" && ideaAssets) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "idea-assets");
        const state = await stateFor(workspace, env);
        const input = await safeJsonBody(request);
        const idea = state.ideas.find((entry) => entry.id === ideaAssets[1]);
        if (!idea) return json({ error: "Konu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const requested = Array.isArray(input.assets) ? input.assets.slice(0, 11) : [];
        const extra = [];
        const seenAssets = new Set([idea.sourceAsset].filter(Boolean).map((asset) => `${asset.source}:${asset.assetId || asset.nasaId}`));
        for (const requestedAsset of requested) {
          const asset = await resolveAsset(requestedAsset.source, cleanText(requestedAsset.assetId, 120)).catch(() => null);
          const key = asset ? `${asset.source}:${asset.assetId || asset.nasaId}` : "";
          if (asset && !asset.riskFlags?.length && !seenAssets.has(key)) {
            seenAssets.add(key);
            extra.push(asset);
          }
        }
        idea.topic = cleanText(input.topic, 180) || idea.topic;
        idea.sourceAssets = [idea.sourceAsset, ...extra].filter(Boolean);
        const creativeBrief = cleanText(input.creativeBrief, 700);
        idea.sources = `${idea.sources || ""}${creativeBrief ? `
Creative brief: ${creativeBrief}` : ""}
Ek g\xF6rseller:
${extra.map((asset) => `${asset.sourceLabel}: ${asset.title} (${asset.sourcePage})`).join("\n")}`;
        await saveWorkspaceState(workspace.id, state, env);
        return json(idea, 200, await cookieHeaders(workspace));
      }
      const ideaAngle = url.pathname.match(/^\/api\/ideas\/([^/]+)\/angle$/);
      if (request.method === "PUT" && ideaAngle) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "idea-angle");
        const input = await safeJsonBody(request);
        if (!EDITORIAL_ANGLES[input.angle?.id]) {
          return json({ error: "Geçerli bir içerik açısı seçin" }, 400, await cookieHeaders(workspace));
        }
        const state = await stateFor(workspace, env);
        const idea = state.ideas.find((entry) => entry.id === ideaAngle[1]);
        if (!idea) return json({ error: "Konu bulunamadı" }, 404, await cookieHeaders(workspace));
        idea.angle = editorialAngle(input.angle.id);
        idea.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json(idea, 200, await cookieHeaders(workspace));
      }
      const ideaGeneration = url.pathname.match(/^\/api\/ideas\/([^/]+)\/generate$/);
      if (request.method === "POST" && ideaGeneration) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "ai-generate");
        const input = await safeJsonBody(request, 5 * 1024 * 1024);
        const imageInputs = sanitizeVisionInputs(input.imageInputs);
        const state = await stateFor(workspace, env);
        const idea = state.ideas.find((item) => item.id === ideaGeneration[1]);
        if (!idea) return json({ error: "Konu bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        idea.angle ||= editorialAngle("hidden-detail");
        const generationSettings = { ...state.settings, contentLanguage: idea.contentLanguage || state.settings.contentLanguage || "English" };
        const requestedProvider = request.headers.get("x-orbit-ai-provider") || generationSettings.provider;
        const provider = ["gemini", "openai", "claude"].includes(requestedProvider) ? requestedProvider : "gemini";
        const aiKey = request.headers.get("x-orbit-ai-key") || "";
        const managedPro = !aiKey && hasProAccess(workspace);
        if (!aiKey) {
          const account = requireAccount(workspace);
          if (!account.email_verified_at) throw Object.assign(new Error("Otomatik AI denemesinden önce e-posta adresini doğrula"), { status: 403, code: "EMAIL_VERIFICATION_REQUIRED" });
        }
        const reservation = aiKey ? "none" : managedPro ? "managed" : "demo";
        let quota = { mode: "own-ai-account", managed: false };
        let globalReserved = false;
        let productReserved = false;
        let persisted = false;
        try {
        if (!aiKey) {
          await consumeGlobalDailyQuota(env, "managed_ai_generate", 100);
          globalReserved = true;
          quota = managedPro
            ? await consumeMonthlyQuota(env, workspace.id, "managed_ai_generate", 30)
            : await consumeDemoTrial(env, workspace.id);
          productReserved = true;
        }
        const content = aiKey
          ? await generateAiPackage(provider, aiKey, idea, generationSettings, imageInputs)
          : managedPro
            ? await generateManagedProPackage(env, idea, generationSettings)
            : await generateManagedDemoPackage(env, idea, generationSettings);
        const production = {
          id: crypto.randomUUID(),
          ideaId: idea.id,
          status: generationSettings.rules?.humanApproval === false ? "approved" : "review",
          content,
          angle: idea.angle,
          sourceAsset: idea.sourceAsset || idea.nasaAsset || null,
          visualAssets: idea.sourceAssets || [],
          contentLanguage: generationSettings.contentLanguage,
          contentProfile: generationSettings.contentProfile || "general",
          targetAgeGroups: generationSettings.targetAgeGroups || [],
          rules: generationSettings.rules || {},
          visualStyle: generationSettings.visualStyle || "documentary",
          contentType: idea.contentType || "shorts",
          imageFit: idea.imageFit || "cover",
          images: (idea.sourceAssets || (idea.nasaAsset ? [idea.nasaAsset] : [])).map((asset) => asset.previewUrl),
          reviewedAt: generationSettings.rules?.humanApproval === false ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          quota
        };
        idea.status = "generated";
        state.productions.unshift(production);
        await saveWorkspaceState(workspace.id, state, env);
        persisted = true;
        return json(production, 201, await cookieHeaders(workspace));
        } catch (error) {
          if (!persisted && productReserved && reservation === "demo") await refundDemoTrial(env, workspace.id).catch(() => {});
          if (!persisted && productReserved && reservation === "managed") await refundMonthlyQuota(env, workspace.id, "managed_ai_generate").catch(() => {});
          if (!persisted && globalReserved) await refundGlobalDailyQuota(env, "managed_ai_generate").catch(() => {});
          throw error;
        }
      }
      const productionEdit = url.pathname.match(/^\/api\/productions\/([^/]+)$/);
      if (["PATCH", "DELETE"].includes(request.method) && productionEdit) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "production-edit");
        const state = await stateFor(workspace, env);
        const index = state.productions.findIndex((entry) => entry.id === productionEdit[1]);
        if (index < 0) return json({ error: "\xDCretim bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const item = state.productions[index];
        if (request.method === "DELETE") {
          state.productions.splice(index, 1);
          item.deletedAt = (/* @__PURE__ */ new Date()).toISOString();
          state.trash ||= [];
          state.trash.unshift(item);
        } else {
          const input = await safeJsonBody(request);
          item.content ||= {};
          item.content.title = cleanText(input.title ?? item.content.title, 180);
          item.content.hook = cleanText(input.hook ?? item.content.hook, 500);
          item.content.narration = cleanText(input.narration ?? item.content.narration, 12e3);
          if (!item.content.title || !item.content.narration) {
            return json({ error: "Ba\u015Fl\u0131k ve seslendirme metni bo\u015F olamaz" }, 400, await cookieHeaders(workspace));
          }
          item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          if (item.render?.status === "ready") item.render = { status: "stale", invalidatedAt: item.updatedAt };
        }
        await saveWorkspaceState(workspace.id, state, env);
        return json(item, 200, await cookieHeaders(workspace));
      }
      const restoreProduction = url.pathname.match(/^\/api\/trash\/([^/]+)\/restore$/);
      if (request.method === "POST" && restoreProduction) {
        const workspace = await workspaceFor(request, env);
        const state = await stateFor(workspace, env);
        state.trash ||= [];
        const index = state.trash.findIndex((entry) => entry.id === restoreProduction[1]);
        if (index < 0) return json({ error: "\xC7\xF6p kutusunda bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const [item] = state.trash.splice(index, 1);
        delete item.deletedAt;
        state.productions.unshift(item);
        await saveWorkspaceState(workspace.id, state, env);
        return json(item, 200, await cookieHeaders(workspace));
      }
      const review = url.pathname.match(/^\/api\/productions\/([^/]+)\/(approve|reject)$/);
      if (request.method === "POST" && review) {
        const workspace = await workspaceFor(request, env);
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === review[1]);
        if (!item) return json({ error: "\xDCretim bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        item.status = review[2] === "approve" ? "approved" : "rejected";
        item.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json(item, 200, await cookieHeaders(workspace));
      }
      const productionImages = url.pathname.match(/^\/api\/productions\/([^/]+)\/images$/);
      const promptImage = url.pathname.match(/^\/api\/productions\/([^/]+)\/cloudflare-image$/);
      if (request.method === "PUT" && productionImages) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "production-image-add");
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === productionImages[1]);
        if (!item) return json({ error: "Üretim bulunamadı" }, 404, await cookieHeaders(workspace));
        const input = await safeJsonBody(request);
        const asset = await resolveAsset(input.source === "wikimedia" ? "wikimedia" : "nasa", cleanText(input.assetId || input.nasaId, 120));
        if (!asset || asset.riskFlags?.length) return json({ error: "Uygun görsel bulunamadı" }, 404, await cookieHeaders(workspace));
        item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
        const assetId = asset.assetId || asset.nasaId;
        if (!item.visualAssets.some((entry) => (entry.assetId || entry.nasaId) === assetId)) item.visualAssets.push(asset);
        item.images = item.visualAssets.map((entry) => entry.previewUrl);
        item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json(item, 200, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && promptImage) {
        const workspace = await workspaceFor(request, env);
        const imageProvider = request.headers.get("x-orbit-ai-provider") || "";
        const imageKey = request.headers.get("x-orbit-ai-key") || "";
        const byokImage = Boolean(imageKey && ["gemini", "openai"].includes(imageProvider));
        if (!byokImage) requirePro(workspace);
        await enforceRateLimit(request, env, workspace.id, "prompt-image-generate");
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === promptImage[1]);
        if (!item) return json({ error: "Üretim bulunamadı" }, 404, await cookieHeaders(workspace));
        if (item.status !== "approved") return json({ error: "Önce projeyi onayla" }, 409, await cookieHeaders(workspace));
        const input = await safeJsonBody(request);
        const subject = cleanText(input.prompt, 700);
        if (subject.length < 3) return json({ error: "Görsel için kısa bir prompt yaz" }, 400, await cookieHeaders(workspace));
        let quota = { mode: "own-ai-account", managed: false };
        let managedImageReserved = false;
        let asset;
        try {
          if (!byokImage) {
            quota = await consumeDailyQuota(env, workspace.id, "image_generate", 20);
            await consumeGlobalDailyQuota(env, "managed_image_generate", Number(env.MANAGED_DAILY_IMAGE_CAP || 300));
            managedImageReserved = true;
          }
          asset = await createManagedImageAsset(env, workspace.id, item, subject, imageProvider, imageKey);
          asset.generationKind = "prompt";
          item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
          item.visualAssets.push(asset);
          item.images = item.visualAssets.map((entry) => entry.previewUrl);
          item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          await saveWorkspaceState(workspace.id, state, env);
          return json({ asset, production: item, quota }, 201, await cookieHeaders(workspace));
        } catch (error) {
          const uploadedId = String(asset?.previewUrl || "").match(/^\/api\/uploads\/([^/]+)$/)?.[1];
          if (uploadedId) await env.DB.prepare("DELETE FROM uploaded_media WHERE id = ? AND workspace_id = ?").bind(uploadedId, workspace.id).run().catch(() => {});
          if (!byokImage) await refundDailyQuota(env, workspace.id, "image_generate").catch(() => {});
          if (managedImageReserved) await refundGlobalDailyQuota(env, "managed_image_generate").catch(() => {});
          throw error;
        }
      }
      if (request.method === "POST" && productionImages) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "image-generate");
        const imageProvider = request.headers.get("x-orbit-ai-provider") || "";
        const imageKey = request.headers.get("x-orbit-ai-key") || "";
        const byokImage = Boolean(imageKey && ["gemini", "openai"].includes(imageProvider));
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === productionImages[1]);
        if (!item) return json({ error: "Üretim bulunamadı" }, 404, await cookieHeaders(workspace));
        if (!byokImage && !item.content?.demo && !hasProAccess(workspace)) requirePro(workspace);
        item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
        const generatedScenes = item.visualAssets.filter((asset) => asset.generationKind === "scene").length;
        const scene = (item.content?.scenes || [])[generatedScenes];
        if (!scene) return json(item, 200, await cookieHeaders(workspace));
        let managedImageReserved = false;
        let asset;
        try {
          if (!byokImage) {
            await consumeDailyQuota(env, workspace.id, "image_generate", 20);
            await consumeGlobalDailyQuota(env, "managed_image_generate", Number(env.MANAGED_DAILY_IMAGE_CAP || 300));
            managedImageReserved = true;
          }
          asset = await createManagedImageAsset(env, workspace.id, item, scene.text || item.content?.title, imageProvider, imageKey);
          asset.generationKind = "scene";
          asset.sceneIndex = generatedScenes;
          item.visualAssets.push(asset);
          item.images = item.visualAssets.map((entry) => entry.previewUrl);
          item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          await saveWorkspaceState(workspace.id, state, env);
          return json(item, 201, await cookieHeaders(workspace));
        } catch (error) {
          const uploadedId = String(asset?.previewUrl || "").match(/^\/api\/uploads\/([^/]+)$/)?.[1];
          if (uploadedId) await env.DB.prepare("DELETE FROM uploaded_media WHERE id = ? AND workspace_id = ?").bind(uploadedId, workspace.id).run().catch(() => {});
          if (!byokImage) await refundDailyQuota(env, workspace.id, "image_generate").catch(() => {});
          if (managedImageReserved) await refundGlobalDailyQuota(env, "managed_image_generate").catch(() => {});
          throw error;
        }
      }      if (["PATCH", "DELETE"].includes(request.method) && productionImages) {
        const workspace = await workspaceFor(request, env);
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === productionImages[1]);
        if (!item) return json({ error: "\xDCretim bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const input = await safeJsonBody(request);
        item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
        if (request.method === "DELETE") {
          if (item.visualAssets.length <= 1) return json({ error: "Videoda en az bir g\xF6rsel kalmal\u0131" }, 409, await cookieHeaders(workspace));
          const assetId = cleanText(input.assetId || input.nasaId, 160);
          item.visualAssets = item.visualAssets.filter((asset) => (asset.assetId || asset.nasaId) !== assetId);
        } else {
          const order = Array.isArray(input.order) ? input.order.map((id) => cleanText(id, 160)) : [];
          const byId = new Map(item.visualAssets.map((asset) => [asset.assetId || asset.nasaId, asset]));
          if (order.length !== item.visualAssets.length || new Set(order).size !== order.length || order.some((id) => !byId.has(id))) {
            return json({ error: "G\xF6rsel s\u0131ras\u0131 ge\xE7ersiz" }, 400, await cookieHeaders(workspace));
          }
          item.visualAssets = order.map((id) => byId.get(id));
        }
        item.images = item.visualAssets.map((asset) => asset.previewUrl);
        item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json(item, 200, await cookieHeaders(workspace));
      }
      const customImage = url.pathname.match(/^\/api\/productions\/([^/]+)\/custom-image$/);
      const telegramReview = url.pathname.match(/^\/api\/productions\/([^/]+)\/telegram-review$/);
      if (request.method === "POST" && telegramReview) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "telegram-review");
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.TELEGRAM_WEBHOOK_SECRET) {
          return json({ error: "Telegram bot, Chat ID ve webhook secret yap\u0131land\u0131r\u0131lmal\u0131" }, 409, await cookieHeaders(workspace));
        }
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === telegramReview[1]);
        if (!item) return json({ error: "\xDCretim bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const existingReview = await env.DB.prepare(
          "SELECT token, message_id, created_at FROM telegram_reviews WHERE workspace_id = ? AND production_id = ? AND status = 'pending'"
        ).bind(workspace.id, item.id).first();
        if (existingReview) {
          if (!existingReview.message_id) {
            return json({ status: "sending" }, 202, await cookieHeaders(workspace));
          }
          const telegram = await persistTelegramReviewState(workspace, state, item, existingReview, env);
          return json(telegram, 200, await cookieHeaders(workspace));
        }
        const token = Array.from(
          crypto.getRandomValues(new Uint8Array(12)),
          (byte) => byte.toString(16).padStart(2, "0")
        ).join("");
        const now = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await env.DB.prepare("INSERT INTO telegram_reviews (token, workspace_id, production_id, status, message_id, created_at) VALUES (?, ?, ?, 'pending', NULL, ?)")
            .bind(token, workspace.id, item.id, now).run();
        } catch (error) {
          const concurrentReview = await env.DB.prepare(
            "SELECT token, message_id, created_at FROM telegram_reviews WHERE workspace_id = ? AND production_id = ? AND status = 'pending'"
          ).bind(workspace.id, item.id).first();
          if (concurrentReview) {
            if (!concurrentReview.message_id) {
              return json({ status: "sending" }, 202, await cookieHeaders(workspace));
            }
            const telegram = await persistTelegramReviewState(workspace, state, item, concurrentReview, env);
            return json(telegram, 200, await cookieHeaders(workspace));
          }
          throw error;
        }
        let message;
        try {
          message = await telegramCall(env, "sendMessage", {
            chat_id: env.TELEGRAM_CHAT_ID,
            text: [
              "Content Studio edit\xF6r onay\u0131",
              "",
              `Proje: ${item.content?.title || "Ads\u0131z proje"}`,
              `Format: ${item.contentType || "shorts"}`,
              `Dil: ${item.contentLanguage || "English"}`,
              "",
              cleanText(item.content?.hook, 500),
              "",
              "Bu i\xE7eri\u011Fi \xFCretime alal\u0131m m\u0131?"
            ].join("\n"),
            reply_markup: { inline_keyboard: [[
              { text: "\u2705 Onayla", callback_data: `orbit:approve:${token}` },
              { text: "\u274C Reddet", callback_data: `orbit:reject:${token}` }
            ]] }
          });
        } catch (error) {
          await env.DB.prepare("UPDATE telegram_reviews SET status = 'rejected', reviewed_at = ? WHERE token = ? AND status = 'pending'")
            .bind((/* @__PURE__ */ new Date()).toISOString(), token).run();
          throw error;
        }
        await env.DB.prepare("UPDATE telegram_reviews SET message_id = ? WHERE token = ? AND status = 'pending'")
          .bind(message.message_id, token).run();
        const telegram = await persistTelegramReviewState(workspace, state, item, {
          token, message_id: message.message_id, created_at: now
        }, env);
        return json(telegram, 201, await cookieHeaders(workspace));
      }
      if (request.method === "POST" && customImage) {
        const workspace = await workspaceFor(request, env);
        await enforceRateLimit(request, env, workspace.id, "image-upload");
        const input = await safeJsonBody(request, 2 * 1024 * 1024);
        const match = String(input.dataUrl || "").match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
        if (!match) return json({ error: "Yaln\u0131zca JPG, PNG veya WebP y\xFCklenebilir" }, 400, await cookieHeaders(workspace));
        const binary = atob(match[2]);
        if (!binary.length || binary.length > 900 * 1024) return json({ error: "G\xF6rsel optimize edilemedi; l\xFCtfen daha k\xFC\xE7\xFCk bir dosya dene" }, 400, await cookieHeaders(workspace));
        const state = await stateFor(workspace, env);
        const item = state.productions.find((entry) => entry.id === customImage[1]);
        if (!item) return json({ error: "Proje bulunamad\u0131" }, 404, await cookieHeaders(workspace));
        const extension = match[1] === "jpeg" ? "jpg" : match[1];
        const filename = `${item.id}-${crypto.randomUUID()}.${extension}`;
        await env.DB.prepare("INSERT INTO uploaded_media (id, workspace_id, content_type, data_url, created_at) VALUES (?, ?, ?, ?, ?)").bind(filename, workspace.id, `image/${match[1]}`, input.dataUrl, (/* @__PURE__ */ new Date()).toISOString()).run();
        const asset = { assetId: `upload-${crypto.randomUUID()}`, source: "upload", sourceLabel: "Kullan\u0131c\u0131 y\xFCklemesi", title: cleanText(input.name, 300) || "Y\xFCklenen g\xF6rsel", previewUrl: `/api/uploads/${filename}`, license: "Kullan\u0131c\u0131 taraf\u0131ndan sa\u011Fland\u0131", sourcePage: "" };
        item.visualAssets ||= [];
        item.visualAssets.push(asset);
        item.images = item.visualAssets.map((entry) => entry.previewUrl);
        item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveWorkspaceState(workspace.id, state, env);
        return json({ asset, production: item }, 201, await cookieHeaders(workspace));
      }
      if (url.pathname.startsWith("/api/")) {
        return json({
          error: "Bu \xF6zellik bulut s\xFCr\xFCm\xFCne ta\u015F\u0131n\u0131yor. \u015Eimdilik yerel st\xFCdyoda kullan\u0131labilir."
        }, 503);
      }
      const assetResponse = await env.ASSETS.fetch(request);
      const response = new Response(assetResponse.body, assetResponse);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(name, value);
      }
      return response;
    } catch (error) {
      console.error("Worker request failed", error);
      return json({
        error: cleanText(error?.message || "Bulut servisi hatas\u0131", 300),
        ...(error?.code ? { code: cleanText(error.code, 80) } : {})
      }, Number(error?.status) || 500);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
