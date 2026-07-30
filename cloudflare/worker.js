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
    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "Bu özellik bulut sürümüne taşınıyor. Şimdilik yerel stüdyoda kullanılabilir."
      }, 503);
    }
    return env.ASSETS.fetch(request);
  }
};
