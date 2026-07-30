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
    deployment: "cloudflare-preview",
    geminiConfigured: false,
    openAiConfigured: false,
    anthropicConfigured: false,
    cloudflareConfigured: false,
    cloudflareAccountId: ""
  }
};

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/state") {
      return json(initialState);
    }
    if (request.method === "GET" && url.pathname === "/api/files") {
      return json({ files: [] });
    }
    if (url.pathname.startsWith("/api/")) {
      return json({
        error: "Bu özellik bulut sürümüne taşınıyor. Şimdilik yerel stüdyoda kullanılabilir."
      }, 503);
    }
    return env.ASSETS.fetch(request);
  }
};
