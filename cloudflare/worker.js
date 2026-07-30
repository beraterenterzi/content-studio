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

function json(value, status = 200, headers = {}) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

function workspaceCookie(id) {
  return `orbit_workspace=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
}

async function workspaceFor(request, env) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)orbit_workspace=([a-f0-9-]{36})(?:;|$)/i);
  const id = match?.[1] || crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO workspaces (id, created_at, last_seen_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`
  ).bind(id, now, now).run();
  return { id, isNew: !match };
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

    if (request.method === "GET" && url.pathname === "/api/state") {
      const workspace = await workspaceFor(request, env);
      return json(await stateFor(workspace, env), 200,
        workspace.isNew ? { "set-cookie": workspaceCookie(workspace.id) } : {});
    }
    if (request.method === "GET" && url.pathname === "/api/files") {
      const workspace = await workspaceFor(request, env);
      return json({ files: [] }, 200,
        workspace.isNew ? { "set-cookie": workspaceCookie(workspace.id) } : {});
    }
    if (request.method === "PUT" && url.pathname === "/api/settings") {
      const workspace = await workspaceFor(request, env);
      const currentState = await stateFor(workspace, env);
      const input = await request.json();
      const settings = safeSettings(input, currentState.settings);
      await env.DB.prepare(
        `UPDATE workspace_state SET settings_json = ?, updated_at = ?
         WHERE workspace_id = ?`
      ).bind(JSON.stringify(settings), new Date().toISOString(), workspace.id).run();
      return json(settings, 200,
        workspace.isNew ? { "set-cookie": workspaceCookie(workspace.id) } : {});
    }
    if (request.method === "GET" && url.pathname === "/api/media/search") {
      const query = cleanText(url.searchParams.get("q"), 120);
      const source = url.searchParams.get("source") === "wikimedia"
        ? "wikimedia" : "nasa";
      if (query.length < 2) return json({ error: "En az iki karakter girin" }, 400);
      const items = source === "wikimedia"
        ? await searchWikimedia(query) : await searchNasa(query);
      return json({ source, items });
    }
    if (request.method === "POST" && url.pathname === "/api/media/import") {
      const workspace = await workspaceFor(request, env);
      const state = await stateFor(workspace, env);
      const input = await request.json();
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
      return json(idea, 201,
        workspace.isNew ? { "set-cookie": workspaceCookie(workspace.id) } : {});
    }
    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "Bu özellik bulut sürümüne taşınıyor. Şimdilik yerel stüdyoda kullanılabilir."
      }, 503);
    }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Worker request failed", error);
      return json({
        error: cleanText(error?.message || "Bulut servisi hatası", 300)
      }, 500);
    }
  }
};
