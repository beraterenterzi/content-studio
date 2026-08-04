const initialState = {
  settings: {
    niche: "technology and artificial intelligence",
    audience: "Curious viewers",
    format: "YouTube Shorts",
    targetSeconds: 45,
    contentLanguage: "English",
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
    cloudflareConfigured: false,
    cloudflareAccountId: ""
  }
};

const SECURITY_HEADERS = {
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
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images-assets.nasa.gov https://*.wikimedia.org https://*.wikipedia.org",
    "media-src 'self' blob: data:",
    "connect-src 'self'"
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

function base64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function signWorkspace(id, key) {
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return `${id}.${base64Url(new Uint8Array(signature))}`;
}

async function verifyWorkspace(value, key) {
  const match = String(value || "").match(/^([a-f0-9-]{36})\.([A-Za-z0-9_-]{43})$/i);
  if (!match) return null;
  const expected = await signWorkspace(match[1], key);
  return expected === value ? match[1] : null;
}

async function workspaceCookie(id, key) {
  const value = await signWorkspace(id, key);
  return `orbit_workspace=${value}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`;
}

async function workspaceFor(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)orbit_workspace=([^;]+)(?:;|$)/i);
  const key = await sessionKey(request, env);
  const verifiedId = await verifyWorkspace(match?.[1], key);
  const id = verifiedId || crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO workspaces (id, created_at, last_seen_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`
  ).bind(id, now, now).run();
  return { id, key, isNew: !verifiedId };
}

async function cookieHeaders(workspace) {
  return workspace.isNew
    ? { "set-cookie": await workspaceCookie(workspace.id, workspace.key) }
    : {};
}

function assertSameOrigin(request) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    const error = new Error("Cross-origin request rejected");
    error.status = 403;
    throw error;
  }
}

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

async function consumeDailyQuota(env, workspaceId, action, limit) {
  const day = new Date().toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `INSERT INTO usage_daily (workspace_id, usage_day, action, usage_count, updated_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(workspace_id, usage_day, action) DO UPDATE SET
       usage_count = usage_count + 1, updated_at = excluded.updated_at
     WHERE usage_count < ?
     RETURNING usage_count`
  ).bind(workspaceId, day, action, new Date().toISOString(), limit).first();
  if (!result) {
    const error = new Error(`Daily free limit reached for ${action}`);
    error.status = 429;
    throw error;
  }
  return { used: result.usage_count, limit };
}

async function stateFor(workspace, env) {
  const row = await env.DB.prepare(
    `SELECT settings_json, ideas_json, productions_json, trash_json
     FROM workspace_state WHERE workspace_id = ?`
  ).bind(workspace.id).first();
  if (!row) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO workspace_state
       (workspace_id, settings_json, ideas_json, productions_json, trash_json, updated_at)
       VALUES (?, ?, '[]', '[]', '[]', ?)`
    ).bind(workspace.id, JSON.stringify(initialState.settings), now).run();
    return structuredClone(initialState);
  }
  return {
    settings: JSON.parse(row.settings_json),
    ideas: JSON.parse(row.ideas_json),
    productions: JSON.parse(row.productions_json),
    trash: JSON.parse(row.trash_json),
    runtime: structuredClone(initialState.runtime)
  };
}

function cleanText(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function stripHtml(value, max = 4000) {
  return cleanText(String(value || "").replace(/<[^>]*>/g, " "), max);
}

function nasaRiskFlags(item) {
  const data = item.data?.[0] || {};
  const searchable = `${data.title || ""} ${data.description || ""} ${
    data.photographer || ""
  }`.toLowerCase();
  const flags = [];
  if (/copyright|all rights reserved|courtesy of|©/.test(searchable)) {
    flags.push("Muhtemel üçüncü taraf telif ibaresi");
  }
  if (/astronaut|crew|portrait|person|people|employee|commander|pilot/.test(searchable)) {
    flags.push("Tanınabilir kişi veya astronot içerebilir");
  }
  if (/logo|insignia|logotype|emblem/.test(searchable)) {
    flags.push("Korunan NASA logosu veya işareti içerebilir");
  }
  return flags;
}

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
    description: cleanText(data.description_508 || data.description, 4000),
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

async function searchNasa(query, exact = false) {
  const url = new URL("https://images-api.nasa.gov/search");
  url.searchParams.set(exact ? "nasa_id" : "q", query);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", "24");
  const response = await fetch(url, {
    headers: { "user-agent": "Orbit-AI-Studio/1.0" }
  });
  if (!response.ok) throw new Error(`NASA araması başarısız: ${response.status}`);
  const result = await response.json();
  return (result.collection?.items || []).map(normalizeNasa)
    .filter((item) => item.assetId && item.previewUrl);
}

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
    headers: { "user-agent": "Orbit-AI-Studio/1.0" }
  });
  if (!response.ok) throw new Error(`Wikimedia araması başarısız: ${response.status}`);
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
      riskFlags: /unknown|copyrighted|fair use/i.test(license)
        ? ["Lisans bilgisi otomatik doğrulanamadı"] : [],
      sourcePage: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`
    };
  }).filter((item) => item.previewUrl);
}

async function resolveAsset(source, id) {
  const items = source === "wikimedia"
    ? await searchWikimedia(id, true) : await searchNasa(id, true);
  return items.find((item) => item.assetId === id) || items[0];
}

async function saveWorkspaceState(workspaceId, state, env) {
  await env.DB.prepare(
    `UPDATE workspace_state SET ideas_json = ?, productions_json = ?,
     trash_json = ?, updated_at = ? WHERE workspace_id = ?`
  ).bind(
    JSON.stringify(state.ideas || []),
    JSON.stringify(state.productions || []),
    JSON.stringify(state.trash || []),
    new Date().toISOString(),
    workspaceId
  ).run();
}

function safeSettings(input, current) {
  const provider = ["gemini", "openai", "claude"].includes(input.provider)
    ? input.provider : current.provider;
  return {
    ...current,
    niche: cleanText(input.niche, 120),
    audience: cleanText(input.audience, 200),
    provider,
    textModel: cleanText(input.textModel, 100),
    contentLanguage: ["English", "Turkish"].includes(input.contentLanguage)
      ? input.contentLanguage : current.contentLanguage,
    uiLanguage: ["tr", "en", "es"].includes(input.uiLanguage)
      ? input.uiLanguage : current.uiLanguage,
    contentProfile: cleanText(input.contentProfile, 40),
    visualStyle: input.visualStyle === "animated" ? "animated" : "documentary",
    targetAgeGroups: Array.isArray(input.targetAgeGroups)
      ? input.targetAgeGroups.map((age) => cleanText(age, 12)).slice(0, 8)
      : current.targetAgeGroups,
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
    if (url.pathname.startsWith("/api/")) assertSameOrigin(request);

    if (request.method === "GET" && url.pathname === "/api/state") {
      const workspace = await workspaceFor(request, env);
      return json(await stateFor(workspace, env), 200,
        await cookieHeaders(workspace));
    }
    if (request.method === "GET" && url.pathname === "/api/files") {
      const workspace = await workspaceFor(request, env);
      return json({ files: [] }, 200,
        await cookieHeaders(workspace));
    }
    const uploadedMedia = url.pathname.match(/^\/api\/uploads\/([a-f0-9-]+\.(?:jpg|png|webp))$/);
    if (request.method === "GET" && uploadedMedia) {
      const workspace = await workspaceFor(request, env);
      const media = await env.DB.prepare("SELECT content_type, data_url FROM uploaded_media WHERE id = ? AND workspace_id = ?").bind(uploadedMedia[1], workspace.id).first();
      if (!media) return json({ error: "Görsel bulunamadı" }, 404, await cookieHeaders(workspace));
      const encoded = String(media.data_url).split(",")[1] || "";
      const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      return new Response(bytes, { headers:{ ...SECURITY_HEADERS, ...(await cookieHeaders(workspace)), "content-type":media.content_type || "image/jpeg", "cache-control":"private, max-age=3600" } });
    }
    if (request.method === "POST" && url.pathname === "/api/tts") {
      const workspace = await workspaceFor(request, env);
      await enforceRateLimit(request, env, workspace.id, "tts");
      await consumeDailyQuota(env, workspace.id, "tts", 20);
      const input = await safeJsonBody(request);
      const prompt = cleanText(input.text, 4000);
      if (!prompt) return json({ error: "Seslendirilecek metin gerekli" }, 400, await cookieHeaders(workspace));
      const supportedLanguages = new Set(["en", "es", "fr", "zh", "ja", "ko"]);
      const lang = supportedLanguages.has(input.lang) ? input.lang : "en";
      const result = await env.AI.run("@cf/myshell-ai/melotts", { prompt, lang });
      let audio = result;
      if (result && typeof result === "object" && "audio" in result) audio = result.audio;
      if (typeof audio === "string") {
        const bytes = Uint8Array.from(atob(audio.replace(/^data:audio\/[^;]+;base64,/, "")), (char) => char.charCodeAt(0));
        audio = bytes;
      }
      return new Response(audio, { status: 200, headers: { ...SECURITY_HEADERS, ...(await cookieHeaders(workspace)), "content-type":"audio/mpeg", "cache-control":"no-store" } });
    }
    if (request.method === "PUT" && url.pathname === "/api/settings") {
      const workspace = await workspaceFor(request, env);
      await enforceRateLimit(request, env, workspace.id, "settings");
      const currentState = await stateFor(workspace, env);
      const input = await safeJsonBody(request);
      const settings = safeSettings(input, currentState.settings);
      await env.DB.prepare(
        `UPDATE workspace_state SET settings_json = ?, updated_at = ?
         WHERE workspace_id = ?`
      ).bind(JSON.stringify(settings), new Date().toISOString(), workspace.id).run();
      return json(settings, 200,
        await cookieHeaders(workspace));
    }
    if (request.method === "GET" && url.pathname === "/api/media/search") {
      const workspace = await workspaceFor(request, env);
      const query = cleanText(url.searchParams.get("q"), 120);
      const source = url.searchParams.get("source") === "wikimedia"
        ? "wikimedia" : "nasa";
      if (query.length < 2) {
        return json({ error: "En az iki karakter girin" }, 400,
          await cookieHeaders(workspace));
      }
      await enforceRateLimit(request, env, workspace.id, "media-search");
      const quota = await consumeDailyQuota(env, workspace.id, "media_search", 60);
      const items = source === "wikimedia"
        ? await searchWikimedia(query) : await searchNasa(query);
      return json({ source, items, quota }, 200, await cookieHeaders(workspace));
    }
    if (request.method === "POST" && url.pathname === "/api/media/import") {
      const workspace = await workspaceFor(request, env);
      await enforceRateLimit(request, env, workspace.id, "media-import");
      const quota = await consumeDailyQuota(env, workspace.id, "media_import", 30);
      const state = await stateFor(workspace, env);
      const input = await safeJsonBody(request);
      const source = input.source === "wikimedia" ? "wikimedia" : "nasa";
      const asset = await resolveAsset(source, cleanText(input.assetId, 120));
      if (!asset) return json({ error: "Görsel bulunamadı" }, 404);
      if (asset.riskFlags?.length) {
        return json({ error: asset.riskFlags[0], asset }, 409);
      }
      const idea = {
        id: crypto.randomUUID(),
        topic: asset.title,
        sources: [
          `Kaynak: ${asset.sourceLabel}`,
          `Kimlik: ${asset.assetId}`,
          `Başlık: ${asset.title}`,
          `Açıklama: ${asset.description}`,
          `Tarih: ${asset.dateCreated || "belirtilmemiş"}`,
          `Üretici: ${asset.photographer || "belirtilmemiş"}`,
          `Lisans: ${asset.license}`,
          `Bağlantı: ${asset.sourcePage}`,
          "Kural: Yalnızca bu metadata içindeki doğrulanabilir bilgileri kullan."
        ].join("\n"),
        status: "new",
        sourceType: source,
        sourceAsset: asset,
        nasaAsset: source === "nasa" ? asset : null,
        contentType: ["reels", "youtube"].includes(input.contentType)
          ? input.contentType : "shorts",
        imageFit: input.imageFit === "contain" ? "contain" : "cover",
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveWorkspaceState(workspace.id, state, env);
      return json({ ...idea, quota }, 201, await cookieHeaders(workspace));
    }
    if (request.method === "POST" && url.pathname === "/api/projects/from-story") {
      const workspace = await workspaceFor(request, env);
      await enforceRateLimit(request, env, workspace.id, "project-create");
      const input = await safeJsonBody(request);
      const title = cleanText(input.title, 180);
      const narration = cleanText(input.narration, 12000);
      if (!title || narration.length < 40) return json({ error:"Başlık ve en az 40 karakterlik hikâye gerekli" }, 400, await cookieHeaders(workspace));
      const sentences = narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [narration];
      const sceneCount = Math.max(3, Math.min(8, Math.ceil(sentences.length / 2)));
      const perScene = Math.ceil(sentences.length / sceneCount);
      const scenes = Array.from({ length:sceneCount }, (_, index) => {
        const text = sentences.slice(index * perScene, (index + 1) * perScene).join(" ").trim();
        return text ? { seconds:`${index * 6}-${(index + 1) * 6}`, type:"visual", text } : null;
      }).filter(Boolean);
      const state = await stateFor(workspace, env);
      const production = {
        id:crypto.randomUUID(), status:"approved",
        content:{ mode:input.manual ? "manual" : "story-to-visual", title, hook:sentences[0]?.trim() || title, narration, scenes, disclosure:"User-provided story" },
        sourceAsset:null, contentLanguage:state.settings.contentLanguage || "English",
        contentProfile:input.contentProfile === "kids" ? "kids" : "general",
        targetAgeGroups:state.settings.targetAgeGroups || [], rules:state.settings.rules || {},
        visualStyle:input.visualStyle === "documentary" ? "documentary" : "animated",
        contentType:["reels","youtube"].includes(input.contentType) ? input.contentType : "shorts",
        imageFit:input.imageFit === "contain" ? "contain" : "cover",
        visualAssets:[], images:[], reviewedAt:new Date().toISOString(), createdAt:new Date().toISOString()
      };
      state.productions.unshift(production);
      await saveWorkspaceState(workspace.id, state, env);
      return json(production, 201, await cookieHeaders(workspace));
    }
    const customImage = url.pathname.match(/^\/api\/productions\/([^/]+)\/custom-image$/);
    if (request.method === "POST" && customImage) {
      const workspace = await workspaceFor(request, env);
      await enforceRateLimit(request, env, workspace.id, "image-upload");
      const input = await safeJsonBody(request, 2 * 1024 * 1024);
      const match = String(input.dataUrl || "").match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
      if (!match) return json({ error:"Yalnızca JPG, PNG veya WebP yüklenebilir" }, 400, await cookieHeaders(workspace));
      const binary = atob(match[2]);
      if (!binary.length || binary.length > 900 * 1024) return json({ error:"Görsel optimize edilemedi; lütfen daha küçük bir dosya dene" }, 400, await cookieHeaders(workspace));
      const state = await stateFor(workspace, env);
      const item = state.productions.find((entry) => entry.id === customImage[1]);
      if (!item) return json({ error:"Proje bulunamadı" }, 404, await cookieHeaders(workspace));
      const extension = match[1] === "jpeg" ? "jpg" : match[1];
      const filename = `${item.id}-${crypto.randomUUID()}.${extension}`;
      await env.DB.prepare("INSERT INTO uploaded_media (id, workspace_id, content_type, data_url, created_at) VALUES (?, ?, ?, ?, ?)").bind(filename, workspace.id, `image/${match[1]}`, input.dataUrl, new Date().toISOString()).run();
      const asset = { assetId:`upload-${crypto.randomUUID()}`, source:"upload", sourceLabel:"Kullanıcı yüklemesi", title:cleanText(input.name, 300) || "Yüklenen görsel", previewUrl:`/api/uploads/${filename}`, license:"Kullanıcı tarafından sağlandı", sourcePage:"" };
      item.visualAssets ||= [];
      item.visualAssets.push(asset);
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      item.updatedAt = new Date().toISOString();
      await saveWorkspaceState(workspace.id, state, env);
      return json({ asset, production:item }, 201, await cookieHeaders(workspace));
    }
    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "Bu özellik bulut sürümüne taşınıyor. Şimdilik yerel stüdyoda kullanılabilir."
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
        error: cleanText(error?.message || "Bulut servisi hatası", 300)
      }, Number(error?.status) || 500);
    }
  }
};
