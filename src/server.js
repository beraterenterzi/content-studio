import http from "node:http";
import { readFile, writeFile, mkdir, stat, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadEnvFile } from "node:process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  loadEnvFile(join(ROOT, ".env"));
} catch (error) {
  if (error.code !== "ENOENT") {
    console.warn(`.env yüklenemedi: ${error.message}`);
  }
}
const DATA_FILE = join(ROOT, "data", "state.json");
const GENERATED_DIR = join(ROOT, "outputs");
const PORT = Number(process.env.PORT || 4310);
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || (process.platform === "win32"
  ? join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "python.exe")
  : "python3");
const execFileAsync = promisify(execFile);
const TEXT_MODELS = {
  gemini: ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"],
  openai: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"],
  claude: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8", "claude-fable-5"]
};
const DEFAULT_TEXT_MODELS = {
  gemini: "gemini-3.6-flash",
  openai: "gpt-5.6-terra",
  claude: "claude-sonnet-5"
};
const defaults = {
  settings: {
    niche: process.env.CHANNEL_NICHE || "teknoloji ve yapay zeka",
    audience: process.env.TARGET_AUDIENCE ||
      "18-34 yaş, Türkçe konuşan meraklı izleyiciler",
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
    textModel: "gemini-3.6-flash",
    humanApprovalRequired: true
  },
  ideas: [],
  productions: []
  ,trash: []
};

async function loadState() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await saveState(defaults);
    return structuredClone(defaults);
  }
}
async function saveState(state) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}
async function saveEnvValue(name, value) {
  const envPath = join(ROOT, ".env");
  let contents = "";
  try {
    contents = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  contents = pattern.test(contents)
    ? contents.replace(pattern, line)
    : `${contents.trimEnd()}${contents.trim() ? "\n" : ""}${line}\n`;
  await writeFile(envPath, contents, "utf8");
  process.env[name] = value;
}
function json(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function clean(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function contentBrief(settings) {
  if (settings.contentType === "youtube") {
    return "Create a structured 4-8 minute YouTube narration of 550-1000 words with 8-16 scenes.";
  }
  if (settings.contentType === "reels") {
    return "Create a 30-75 second Instagram Reels narration of 90-170 words with 5-9 scenes.";
  }
  return "Create a 25-60 second YouTube Shorts narration of 75-140 words with 4-8 scenes.";
}
function profileBrief(settings) {
  const profiles = {
    kids: "Educational content for children. Use short sentences, explain unfamiliar words, and keep the tone warm and encouraging.",
    educational: "Teach one clear learning objective step by step with examples and a short recap.",
    storytelling: "Use a strong narrative arc: setup, curiosity, development, reveal, and satisfying close.",
    documentary: "Use a factual mini-documentary voice with context, evidence, and measured language.",
    entertainment: "Prioritize pace, surprise, humor, and replay value without sacrificing accuracy.",
    explainer: "Explain how or why something works using concrete steps and simple analogies.",
    general: "Use an accessible, engaging tone for a broad audience."
  };
  const ages = Array.isArray(settings.targetAgeGroups)
    ? settings.targetAgeGroups.join(", ") : "";
  const rules = settings.rules || {};
  return `${profiles[settings.contentProfile] || profiles.general}
Target age ranges: ${ages || "not specified"}.
${rules.childSafe ? "Apply child-safe language and avoid frightening, violent, or easily imitated dangerous behavior." : ""}
${rules.factualOnly ? "Use only verifiable source-supported facts; never invent dates, numbers, or claims." : ""}
${rules.includeCta ? "End with one natural, non-manipulative call to action." : "Do not add a generic engagement call to action."}`;
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
    flags.push("Korunan NASA logosu/işareti içerebilir");
  }
  return flags;
}

function normalizeNasaItem(item) {
  const data = item.data?.[0] || {};
  const preview = (item.links || []).find((link) => link.render === "image");
  return {
    nasaId: clean(data.nasa_id, 120),
    title: clean(data.title, 300),
    description: clean(data.description_508 || data.description, 4000),
    dateCreated: data.date_created || "",
    center: clean(data.center, 120),
    photographer: clean(data.photographer, 200),
    keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 15) : [],
    previewUrl: preview?.href || "",
    mediaType: data.media_type || "",
    riskFlags: nasaRiskFlags(item),
    sourcePage: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id || "")}`
  };
}

async function searchNasa(query, exactId = false) {
  const url = new URL("https://images-api.nasa.gov/search");
  url.searchParams.set(exactId ? "nasa_id" : "q", query);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", "24");
  const response = await fetch(url, {
    headers: { "user-agent": "YouTube-AI-Studio/0.1" }
  });
  if (!response.ok) throw new Error(`NASA araması başarısız: ${response.status}`);
  const result = await response.json();
  return (result.collection?.items || [])
    .map(normalizeNasaItem)
    .filter((item) => item.nasaId && item.previewUrl);
}

function stripHtml(value) {
  return clean(String(value || "").replace(/<[^>]*>/g, " "), 4000);
}

async function searchWikimedia(query, exactId = false) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("iiurlwidth", "1200");
  if (exactId) {
    url.searchParams.set("pageids", query);
  } else {
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "24");
  }
  const response = await fetch(url, {
    headers: { "user-agent": "Orbit-Studio/0.1 (local creative tool)" }
  });
  if (!response.ok) throw new Error(`Wikimedia araması başarısız: ${response.status}`);
  const result = await response.json();
  return Object.values(result.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const license = clean(meta.LicenseShortName?.value || "Unknown", 120);
    return {
      assetId: String(page.pageid),
      source: "wikimedia",
      sourceLabel: "Wikimedia Commons",
      title: clean(page.title?.replace(/^File:/, ""), 300),
      description: stripHtml(meta.ImageDescription?.value),
      dateCreated: clean(meta.DateTimeOriginal?.value || meta.DateTime?.value, 80),
      photographer: stripHtml(meta.Artist?.value),
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

async function resolveMediaAsset(source, id) {
  if (source === "wikimedia") return (await searchWikimedia(id, true))[0];
  const matches = await searchNasa(id, true);
  const nasa = matches.find((item) => item.nasaId === id) || matches[0];
  return nasa ? {
    ...nasa, assetId: nasa.nasaId, source: "nasa", sourceLabel: "NASA"
  } : null;
}

function demoPackage(topic, settings) {
  return {
    mode: "demo",
    title: `${topic}: Çoğu kişinin kaçırdığı ayrıntı`,
    hook: `${topic} hakkında bildiğin şey eksik olabilir.`,
    narration: `${topic} son günlerde çok konuşuluyor. Fakat asıl önemli nokta, ` +
      `bu gelişmenin günlük kullanıma nasıl yansıyacağı. Önce iddiaları ` +
      `kaynaklarından doğrulamak gerekiyor. Sonra kısa vadeli heyecanı gerçek ` +
      `etkiden ayırmalıyız. Avantajları kadar sınırlamaları da görmeliyiz. ` +
      `Sence bu değişim kalıcı mı, yoksa geçici bir trend mi?`,
    scenes: [
      { seconds: 3, type: "title", text: topic },
      { seconds: 10, type: "ai_visual", text: "Konuyu tanıtan özgün görsel" },
      { seconds: 12, type: "source_card", text: "Doğrulanmış bulgu 1" },
      { seconds: 12, type: "comparison", text: "Beklenti / gerçek" },
      { seconds: 8, type: "question", text: "Sence kalıcı mı?" }
    ],
    sourceChecklist: [
      "En az iki bağımsız ve güvenilir kaynak ekle",
      "Tarih, sayı ve kişi adlarını elle doğrula",
      "Her medya dosyasının lisansını kaydet"
    ],
    disclosure: {
      aiAssisted: true,
      youtubeAlteredContent: "Gerçekçi sentetik görüntü kullanılırsa evet"
    },
    settingsSnapshot: settings
  };
}

async function openAiPackage(topic, sources, settings) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY bulunamadı; kanal ayarından Gemini seçebilir veya anahtarı ekleyebilirsiniz.");
  }
  const prompt = `You are an English-language YouTube Shorts editor.
Channel niche: ${settings.niche}
Target audience: ${settings.audience}
Content direction: ${profileBrief(settings)}
Visual direction: ${settings.visualStyle === "animated" ? "Use colorful original cartoon-like educational scenes, friendly shapes and visual metaphors. Never imitate copyrighted characters or franchises." : "Documentary visual storytelling."}
Topic: ${topic}
Verified source notes: ${sources || "No sources; do not make factual claims."}

${contentBrief(settings)}
Create a completely original content package in natural English.
Do not imitate another video's wording or scene order. Do not invent facts,
dates, or numbers. Return JSON only with these fields: title, hook, narration,
scenes, sourceChecklist, disclosure. Every scene must include seconds, type,
and text.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: settings.textModel || process.env.OPENAI_MODEL || "gpt-5.6-terra",
      input: prompt,
      text: { format: { type: "json_object" } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI isteği başarısız: ${response.status}`);
  const result = await response.json();
  const output = result.output_text || result.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
  if (!output) throw new Error("Model boş yanıt verdi");
  return { mode: "openai", ...JSON.parse(output) };
}

async function claudePackage(topic, sources, settings) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Claude API anahtarı bulunamadı. Entegrasyonlar sekmesinden anahtarı ekleyin.");
  }
  const prompt = `You are an expert ${settings.contentLanguage || "English"}-language video editor.
Channel niche: ${settings.niche}
Target audience: ${settings.audience}
Content direction: ${profileBrief(settings)}
Topic: ${topic}
Verified source notes: ${sources || "No sources; do not make factual claims."}

${contentBrief(settings)}
Create a completely original content package. Do not imitate another video's
wording or scene order and do not invent facts. Return valid JSON only with:
title, hook, narration, scenes, sourceChecklist, disclosure. Every scene must
include seconds, type, and text. Do not wrap the JSON in markdown fences.`;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: settings.textModel || process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: settings.contentType === "youtube" ? 6000 : 2500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(`Claude isteği başarısız (${response.status}): ${
      payload.error?.message || response.statusText
    }`);
  }
  const result = await response.json();
  const output = result.content?.find((block) => block.type === "text")?.text
    ?.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!output) throw new Error("Claude boş yanıt verdi");
  return { mode: "claude", model: result.model, ...JSON.parse(output) };
}

async function geminiPackage(topic, sources, settings, creativeContext = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY bulunamadı. .env dosyasına anahtarı ekleyip sunucuyu yeniden başlatın."
    );
  }
  const models = [
    settings.textModel || process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash"
  ].filter((model, index, all) => all.indexOf(model) === index);
  const prompt = `You are an English-language YouTube Shorts editor.
Channel niche: ${settings.niche}
Target audience: ${settings.audience}
Content direction: ${profileBrief(settings)}
Visual direction: ${settings.visualStyle === "animated" ? "Use colorful original cartoon-like educational scenes, friendly shapes and visual metaphors. Never imitate copyrighted characters or franchises." : "Documentary visual storytelling."}
Topic: ${topic}
Verified source notes: ${sources || "No sources; do not make factual claims."}
Editorial angle: ${creativeContext.angle || "scientific curiosity"}
Recent titles that must not be repeated or closely imitated:
${(creativeContext.previousTitles || []).map((title) => `- ${title}`).join("\n") || "- Yok"}

${contentBrief(settings)}
Create a completely original package in natural English. Do not
imitate wording or scene order. Do not invent unsupported facts. Do not reuse
the structure of recent titles or the same hook pattern. Build a concrete story
specific to this source.
Return JSON only with: title, hook, narration, scenes, sourceChecklist,
disclosure. Every scene must contain seconds, type, and text.`;
  let response;
  let errorPayload;
  let selectedModel;
  const delays = [0, 1500, 3500];
  for (const model of models) {
    selectedModel = model;
    for (const delay of delays) {
      if (delay) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay + Math.floor(Math.random() * 500))
        );
      }
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      if (response.ok) break;
      errorPayload = await response.json().catch(() => ({}));
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
    }
    if (response?.ok) break;
    if (response?.status !== 503) break;
  }
  if (!response?.ok) {
    const apiError = errorPayload?.error || {};
    const reason = apiError.message || apiError.status || "Ayrıntı verilmedi";
    const hint = response?.status === 503
      ? "Gemini servisi yoğun; biraz sonra tekrar deneyin."
      : "";
    throw new Error(
      `Gemini isteği başarısız (${response?.status || "bilinmiyor"}): ` +
      `${reason} ${hint}`.trim()
    );
  }
  const result = await response.json();
  const output = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "").join("");
  if (!output) throw new Error("Gemini boş yanıt verdi");
  return {
    mode: "gemini",
    model: selectedModel,
    ...JSON.parse(output)
  };
}

async function generateGeminiImage(prompt, filename) {
  let response;
  let errorPayload;
  const delays = [0, 2000, 5000];
  for (const delay of delays) {
    if (delay) {
      await new Promise((resolve) =>
        setTimeout(resolve, delay + Math.floor(Math.random() * 500))
      );
    }
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        input: prompt,
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "9:16",
          image_size: "1K"
        }
      })
      }
    );
    if (response.ok) break;
    errorPayload = await response.json().catch(() => ({}));
    if (response.status !== 429 && response.status < 500) break;
  }
  if (!response?.ok) {
    const apiError = errorPayload?.error || {};
    const reason = apiError.message || apiError.status || "Ayrıntı verilmedi";
    const hint = response?.status === 429
      ? "Google AI Studio'da bu projenin görsel kotasını ve faturalandırmasını kontrol edin."
      : "";
    throw new Error(
      `Gemini görsel isteği başarısız (${response?.status || "bilinmiyor"}): ` +
      `${reason} ${hint}`.trim()
    );
  }
  const result = await response.json();
  const image = result.output_image || result.steps
    ?.flatMap((step) => step.content || [])
    .find((block) => block.type === "image");
  if (!image?.data) throw new Error("Gemini görsel döndürmedi");
  await mkdir(GENERATED_DIR, { recursive: true });
  await writeFile(join(GENERATED_DIR, filename), Buffer.from(image.data, "base64"));
  return `/generated/${filename}`;
}

async function generateCloudflareImage(prompt, filename) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("Cloudflare Account ID veya API Token eksik");
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${
    encodeURIComponent(accountId)
  }/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const request = async (inputPrompt) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ prompt: inputPrompt })
    });
    return {
      response,
      payload: await response.json().catch(() => ({}))
    };
  };
  let { response, payload } = await request(clean(prompt, 2048));
  if (response.status === 400) {
    const simplified = clean(prompt, 900)
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    ({ response, payload } = await request(simplified));
  }
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.map((error) =>
      `${error.code ? `[${error.code}] ` : ""}${error.message}`
    ).join("; ");
    throw new Error(`Cloudflare görsel isteği başarısız (${response.status}): ${message || "Bilinmeyen hata"}`);
  }
  const image = payload.result?.image || payload.image;
  if (!image) throw new Error("Cloudflare görsel döndürmedi");
  await mkdir(GENERATED_DIR, { recursive: true });
  await writeFile(join(GENERATED_DIR, filename), Buffer.from(image, "base64"));
  return `/generated/${filename}`;
}

async function generateCloudflareSpeech(text, lang = "en") {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("Cloudflare Account ID veya API Token eksik");
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/myshell-ai/melotts`;
  const response = await fetch(endpoint, { method:"POST", headers:{ authorization:`Bearer ${token}`, "content-type":"application/json" }, body:JSON.stringify({ prompt:clean(text, 4000), lang }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0]?.message || "Cloudflare seslendirme isteği başarısız");
  const audio = payload.result?.audio || payload.result;
  if (typeof audio !== "string") throw new Error("Cloudflare ses dosyası döndürmedi");
  return Buffer.from(audio.replace(/^data:audio\/[^;]+;base64,/, ""), "base64");
}

function escapeXml(value) {
  return String(value || "").replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;"
  })[character]);
}

function wrapVisualText(value, maxLength = 24) {
  const words = String(value || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

async function generateLocalVisual(scene, title, filename) {
  const lines = wrapVisualText(scene.text || title);
  const text = lines.map((line, index) =>
    `<text x="80" y="${690 + index * 92}" class="main">${escapeXml(line)}</text>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#120d22"/>
      <stop offset=".55" stop-color="#30104a"/>
      <stop offset="1" stop-color="#b71952"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="55"/></filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <circle cx="850" cy="350" r="270" fill="#ff5369" opacity=".3" filter="url(#blur)"/>
  <circle cx="120" cy="1550" r="320" fill="#725cff" opacity=".3" filter="url(#blur)"/>
  <text x="80" y="125" class="label">YOUTUBE SHORTS • AI STUDIO</text>
  <rect x="80" y="570" width="110" height="14" rx="7" fill="#ff5369"/>
  ${text}
  <text x="80" y="1720" class="topic">${escapeXml(title)}</text>
  <text x="80" y="1800" class="note">Yerel üretim • lisans gerektirmez</text>
  <style>
    .main{font:800 72px Arial,sans-serif;fill:#fff;letter-spacing:-2px}
    .label{font:700 25px Arial,sans-serif;fill:#ff9dab;letter-spacing:5px}
    .topic{font:600 28px Arial,sans-serif;fill:#ddd;opacity:.9}
    .note{font:400 22px Arial,sans-serif;fill:#bbb}
  </style>
</svg>`;
  await mkdir(GENERATED_DIR, { recursive: true });
  await writeFile(join(GENERATED_DIR, filename), svg, "utf8");
  return `/generated/${filename}`;
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  if (path.startsWith("/renders/")) {
    const match = path.match(
      /^\/renders\/([a-f0-9-]+)\/(video\.mp4|narration\.mp3|captions\.srt|credits\.txt)$/
    );
    if (!match) return false;
    const types = {
      "video.mp4": "video/mp4",
      "narration.mp3": "audio/mpeg",
      "captions.srt": "text/plain; charset=utf-8"
      ,"credits.txt": "text/plain; charset=utf-8"
    };
    const filePath = join(GENERATED_DIR, match[1], match[2]);
    const file = await stat(filePath);
    const range = req.headers.range;
    const headers = {
      "accept-ranges": "bytes",
      "content-type": types[match[2]],
      "content-disposition": requestUrl.searchParams.has("download")
        ? `attachment; filename="${match[2]}"`
        : `inline; filename="${match[2]}"`
    };
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number(parts[0]);
      const end = parts[1] ? Number(parts[1]) : file.size - 1;
      if (
        !Number.isInteger(start) || !Number.isInteger(end) ||
        start < 0 || end >= file.size || start > end
      ) {
        res.writeHead(416, { "content-range": `bytes */${file.size}` });
        res.end();
        return true;
      }
      res.writeHead(206, {
        ...headers,
        "content-range": `bytes ${start}-${end}/${file.size}`,
        "content-length": end - start + 1
      });
      if (req.method === "HEAD") res.end();
      else createReadStream(filePath, { start, end }).pipe(res);
      return true;
    }
    res.writeHead(200, { ...headers, "content-length": file.size });
    if (req.method === "HEAD") res.end();
    else createReadStream(filePath).pipe(res);
    return true;
  }
  if (path.startsWith("/generated/")) {
    const name = path.slice("/generated/".length);
    if (!/^[a-zA-Z0-9-]+\.(jpg|png|webp|svg)$/.test(name)) return false;
    const generatedTypes = {
      jpg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml"
    };
    res.writeHead(200, {
      "content-type": generatedTypes[name.split(".").at(-1)]
    });
    res.end(await readFile(join(GENERATED_DIR, name)));
    return true;
  }
  if (!["/index.html", "/app.js", "/style.css", "/onboarding.css", "/mobile.css", "/logo.svg", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/manifest.webmanifest", "/sw.js"].includes(path)) return false;
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json; charset=utf-8"
  };
  const extension = path.slice(path.lastIndexOf("."));
  res.writeHead(200, { "content-type": types[extension] });
  res.end(await readFile(join(ROOT, "public", path.slice(1))));
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (["GET", "HEAD"].includes(req.method) && await serveStatic(req, res)) return;
    if (req.method === "GET" && url.pathname === "/api/state") {
      return json(res, 200, {
        ...await loadState(),
        runtime: {
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
          openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
          anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
          cloudflareConfigured: Boolean(
            process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
          ),
          cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || ""
        }
      });
    }
    if (req.method === "GET" && url.pathname === "/api/files") {
      const state = await loadState();
      const projects = [...(state.productions || []), ...(state.trash || [])];
      const files = [];
      for (const project of projects) {
        const directory = join(GENERATED_DIR, project.id);
        try {
          for (const name of await readdir(directory)) {
            if (!["video.mp4", "narration.mp3", "captions.srt", "credits.txt"].includes(name)) continue;
            const info = await stat(join(directory, name));
            files.push({
              projectId: project.id,
              projectTitle: project.content?.title || "Adsız proje",
              trashed: Boolean(project.deletedAt),
              name,
              type: name.split(".").at(-1).toUpperCase(),
              size: info.size,
              modifiedAt: info.mtime.toISOString(),
              url: `/renders/${project.id}/${name}?download=1`
            });
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      return json(res, 200, { files });
    }
    if (req.method === "POST" && url.pathname === "/api/tts") {
      const input = await body(req);
      const text = clean(input.text, 4000);
      if (!text) return json(res, 400, { error: "Seslendirilecek metin gerekli" });
      const lang = ["en", "es", "fr", "zh", "ja", "ko"].includes(input.lang) ? input.lang : "en";
      const audio = await generateCloudflareSpeech(text, lang);
      res.writeHead(200, { "content-type":"audio/mpeg", "cache-control":"no-store" });
      res.end(audio);
      return;
    }
    if (req.method === "PUT" && url.pathname === "/api/config/gemini-key") {
      const input = await body(req);
      const key = String(input.key || "").trim();
      if (key.length < 20 || /\s/.test(key)) {
        return json(res, 400, { error: "Geçerli bir Gemini API anahtarı girin" });
      }
      await saveEnvValue("GEMINI_API_KEY", key);
      return json(res, 200, { configured: true });
    }
    if (req.method === "PUT" && url.pathname === "/api/config/openai-key") {
      const input = await body(req);
      const key = String(input.key || "").trim();
      if (key.length < 20 || /\s/.test(key)) {
        return json(res, 400, { error: "Geçerli bir OpenAI API anahtarı girin" });
      }
      await saveEnvValue("OPENAI_API_KEY", key);
      return json(res, 200, { configured: true });
    }
    if (req.method === "PUT" && url.pathname === "/api/config/anthropic-key") {
      const input = await body(req);
      const key = String(input.key || "").trim();
      if (key.length < 20 || /\s/.test(key)) {
        return json(res, 400, { error: "Geçerli bir Claude API anahtarı girin" });
      }
      await saveEnvValue("ANTHROPIC_API_KEY", key);
      return json(res, 200, { configured: true });
    }
    if (req.method === "PUT" && url.pathname === "/api/config/cloudflare") {
      const input = await body(req);
      const accountId = String(input.accountId || "").trim();
      const token = String(input.token || "").trim();
      if (!/^[a-f0-9]{32}$/i.test(accountId)) {
        return json(res, 400, { error: "Cloudflare Account ID 32 karakter olmalı" });
      }
      if (token.length < 20 || /\s/.test(token)) {
        return json(res, 400, { error: "Geçerli bir Cloudflare API Token girin" });
      }
      await saveEnvValue("CLOUDFLARE_ACCOUNT_ID", accountId);
      await saveEnvValue("CLOUDFLARE_API_TOKEN", token);
      return json(res, 200, { configured: true });
    }
    if (req.method === "GET" && url.pathname === "/api/nasa/search") {
      const query = clean(url.searchParams.get("q"), 120);
      if (query.length < 2) {
        return json(res, 400, { error: "En az iki karakterlik arama gerekli" });
      }
      return json(res, 200, { items: await searchNasa(query) });
    }
    if (req.method === "GET" && url.pathname === "/api/media/search") {
      const query = clean(url.searchParams.get("q"), 120);
      const source = url.searchParams.get("source") === "wikimedia"
        ? "wikimedia" : "nasa";
      if (query.length < 2) {
        return json(res, 400, { error: "En az iki karakterlik arama gerekli" });
      }
      const items = source === "wikimedia"
        ? await searchWikimedia(query)
        : (await searchNasa(query)).map((item) => ({
            ...item, assetId: item.nasaId, source: "nasa", sourceLabel: "NASA"
          }));
      return json(res, 200, { source, items });
    }
    if (req.method === "POST" && url.pathname === "/api/media/import") {
      const input = await body(req);
      const source = input.source === "wikimedia" ? "wikimedia" : "nasa";
      const asset = await resolveMediaAsset(source, clean(input.assetId, 120));
      if (!asset) return json(res, 404, { error: "Görsel bulunamadı" });
      if (asset.riskFlags?.length) {
        return json(res, 409, { error: asset.riskFlags[0], asset });
      }
      const state = await loadState();
      const sourceNotes = [
        `Kaynak: ${asset.sourceLabel}`,
        `Kimlik: ${asset.assetId}`,
        `Başlık: ${asset.title}`,
        `Açıklama: ${asset.description}`,
        `Tarih: ${asset.dateCreated || "belirtilmemiş"}`,
        `Üretici: ${asset.photographer || "belirtilmemiş"}`,
        `Lisans: ${asset.license || "NASA media guidelines"}`,
        `Bağlantı: ${asset.sourcePage}`,
        "Kural: Yalnızca bu metadata içindeki doğrulanabilir bilgileri kullan."
      ].join("\n");
      const idea = {
        id: crypto.randomUUID(), topic: asset.title, sources: sourceNotes,
        status: "new", sourceType: source, sourceAsset: asset,
        nasaAsset: source === "nasa" ? asset : null,
        contentType: ["reels", "youtube"].includes(input.contentType)
          ? input.contentType : "shorts",
        imageFit: input.imageFit === "contain" ? "contain" : "cover",
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveState(state);
      return json(res, 201, idea);
    }
    if (req.method === "POST" && url.pathname === "/api/nasa/import") {
      const input = await body(req);
      const nasaId = clean(input.nasaId, 120);
      if (!nasaId) return json(res, 400, { error: "NASA ID gerekli" });
      const matches = await searchNasa(nasaId, true);
      const asset = matches.find((item) => item.nasaId === nasaId) || matches[0];
      if (!asset) return json(res, 404, { error: "NASA içeriği bulunamadı" });
      if (asset.riskFlags.some((flag) => flag.includes("telif"))) {
        return json(res, 409, {
          error: "İçerikte üçüncü taraf telif işareti var; otomatik içe aktarma durduruldu",
          asset
        });
      }
      const state = await loadState();
      const sourceNotes = [
        `NASA ID: ${asset.nasaId}`,
        `Başlık: ${asset.title}`,
        `Açıklama: ${asset.description}`,
        `Tarih: ${asset.dateCreated || "belirtilmemiş"}`,
        `Merkez: ${asset.center || "NASA"}`,
        `Fotoğrafçı: ${asset.photographer || "belirtilmemiş"}`,
        `Kaynak: ${asset.sourcePage}`,
        "Kural: Yalnızca bu metadata içindeki doğrulanabilir bilgileri kullan."
      ].join("\n");
      const idea = {
        id: crypto.randomUUID(),
        topic: asset.title,
        sources: sourceNotes,
        status: "new",
        sourceType: "nasa",
        nasaAsset: asset,
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveState(state);
      return json(res, 201, idea);
    }
    if (req.method === "PUT" && url.pathname === "/api/settings") {
      const input = await body(req);
      const state = await loadState();
      const provider = ["gemini", "openai", "claude"].includes(input.provider)
        ? input.provider : "gemini";
      state.settings = {
        ...state.settings,
        niche: clean(input.niche, 120),
        audience: clean(input.audience, 200),
        contentLanguage: input.contentLanguage === "Turkish"
          ? "Turkish" : "English",
        uiLanguage: ["tr", "en", "es"].includes(input.uiLanguage)
          ? input.uiLanguage : (state.settings.uiLanguage || "tr"),
        contentProfile: ["kids", "educational", "storytelling", "documentary",
          "entertainment", "explainer"].includes(input.contentProfile)
          ? input.contentProfile : "general",
        targetAgeGroups: Array.isArray(input.targetAgeGroups)
          ? input.targetAgeGroups.filter((age) =>
              ["3-5","6-8","9-12","13-17","18-24","25-34","35-44","45+"].includes(age)
            ) : (state.settings.targetAgeGroups || []),
        rules: {
          humanApproval: input.rules?.humanApproval !== false,
          childSafe: Boolean(input.rules?.childSafe),
          factualOnly: input.rules?.factualOnly !== false,
          includeCta: Boolean(input.rules?.includeCta),
          burnCaptions: input.rules?.burnCaptions !== false
        },
        visualStyle: input.visualStyle === "animated" ? "animated" : "documentary",
        provider,
        textModel: TEXT_MODELS[provider].includes(input.textModel)
          ? input.textModel : DEFAULT_TEXT_MODELS[provider],
        targetSeconds: Math.max(20, Math.min(90, Number(input.targetSeconds) || 45))
      };
      await saveState(state);
      return json(res, 200, state.settings);
    }
    const productionEdit = url.pathname.match(/^\/api\/productions\/([^/]+)$/);
    if (req.method === "DELETE" && productionEdit) {
      const state = await loadState();
      const index = state.productions.findIndex(
        (entry) => entry.id === productionEdit[1]
      );
      if (index < 0) return json(res, 404, { error: "Üretim bulunamadı" });
      const [item] = state.productions.splice(index, 1);
      item.deletedAt = new Date().toISOString();
      state.trash ||= [];
      state.trash.unshift(item);
      await saveState(state);
      return json(res, 200, item);
    }
    const restoreProduction = url.pathname.match(
      /^\/api\/trash\/([^/]+)\/restore$/
    );
    if (req.method === "POST" && restoreProduction) {
      const state = await loadState();
      state.trash ||= [];
      const index = state.trash.findIndex(
        (entry) => entry.id === restoreProduction[1]
      );
      if (index < 0) return json(res, 404, { error: "Çöp kutusunda bulunamadı" });
      const [item] = state.trash.splice(index, 1);
      delete item.deletedAt;
      state.productions.unshift(item);
      await saveState(state);
      return json(res, 200, item);
    }
    if (req.method === "PATCH" && productionEdit) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === productionEdit[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const input = await body(req);
      item.content ||= {};
      item.content.title = clean(input.title ?? item.content.title, 180);
      item.content.hook = clean(input.hook ?? item.content.hook, 500);
      item.content.narration = clean(
        input.narration ?? item.content.narration, 12000
      );
      if (!item.content.title || !item.content.narration) {
        return json(res, 400, { error: "Başlık ve seslendirme metni boş olamaz" });
      }
      item.updatedAt = new Date().toISOString();
      if (item.render?.status === "ready") {
        item.render = { status: "stale", invalidatedAt: item.updatedAt };
      }
      await saveState(state);
      return json(res, 200, item);
    }
    if (req.method === "POST" && url.pathname === "/api/ideas") {
      const input = await body(req);
      const topic = clean(input.topic, 180);
      if (!topic) return json(res, 400, { error: "Konu gerekli" });
      const state = await loadState();
      const idea = {
        id: crypto.randomUUID(),
        topic,
        sources: clean(input.sources, 2000),
        contentType: ["reels", "youtube"].includes(input.contentType) ? input.contentType : "shorts",
        imageFit: input.imageFit === "contain" ? "contain" : "cover",
        status: "new",
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveState(state);
      return json(res, 201, idea);
    }
    if (req.method === "POST" && url.pathname === "/api/projects/from-story") {
      const input = await body(req);
      const title = clean(input.title, 180);
      const narration = clean(input.narration, 12000);
      if (!title || narration.length < 40) {
        return json(res, 400, { error: "Başlık ve en az 40 karakterlik hikâye gerekli" });
      }
      const sentences = narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [narration];
      const sceneCount = Math.max(3, Math.min(8, Math.ceil(sentences.length / 2)));
      const perScene = Math.ceil(sentences.length / sceneCount);
      const scenes = Array.from({ length: sceneCount }, (_, index) => {
        const text = sentences.slice(index * perScene, (index + 1) * perScene)
          .join(" ").trim();
        return text ? {
          seconds: `${index * 6}-${(index + 1) * 6}`,
          type: "visual",
          text
        } : null;
      }).filter(Boolean);
      const state = await loadState();
      const production = {
        id: crypto.randomUUID(),
        status: "approved",
        content: {
          mode: input.manual ? "manual" : "story-to-visual", title,
          hook: sentences[0]?.trim() || title,
          narration, scenes,
          disclosure: "User-provided story"
        },
        sourceAsset: null,
        contentLanguage: state.settings.contentLanguage || "English",
        contentProfile: input.contentProfile === "kids" ? "kids" : "general",
        targetAgeGroups: state.settings.targetAgeGroups || [],
        rules: state.settings.rules || {},
        visualStyle: input.visualStyle === "documentary"
          ? "documentary" : "animated",
        contentType: ["reels", "youtube"].includes(input.contentType)
          ? input.contentType : "shorts",
        imageFit: input.imageFit === "contain" ? "contain" : "cover",
        visualAssets: [],
        images: [],
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      state.productions.unshift(production);
      await saveState(state);
      return json(res, 201, production);
    }
    const generation = url.pathname.match(/^\/api\/ideas\/([^/]+)\/generate$/);
    if (req.method === "POST" && generation) {
      const state = await loadState();
      const idea = state.ideas.find((item) => item.id === generation[1]);
      if (!idea) return json(res, 404, { error: "Konu bulunamadı" });
      const angles = [
        "tek bir görselde saklı bilimsel ipucunu adım adım çöz",
        "görselin çekildiği ana gidip kısa bir keşif hikâyesi anlat",
        "ölçek ve mesafeyi gündelik bir karşılaştırmayla anlaşılır kıl",
        "beklenti ile bilimsel gerçeği karşılaştır",
        "görevin çözmeye çalıştığı temel soruya odaklan",
        "görselde ilk bakışta fark edilmeyen ayrıntıyı açıkla"
      ];
      const creativeContext = {
        angle: angles[state.productions.length % angles.length],
        previousTitles: state.productions
          .slice(0, 8)
          .map((production) => production.content?.title)
          .filter(Boolean)
      };
      const production = {
        id: crypto.randomUUID(),
        ideaId: idea.id,
        status: state.settings.rules?.humanApproval === false
          ? "approved" : "review",
        content: state.settings.provider === "openai"
          ? await openAiPackage(idea.topic, idea.sources, {
              ...state.settings, contentType: idea.contentType || "shorts"
            })
          : state.settings.provider === "claude"
            ? await claudePackage(idea.topic, idea.sources, {
                ...state.settings, contentType: idea.contentType || "shorts"
              })
            : await geminiPackage(
              idea.topic,
              idea.sources,
              { ...state.settings, contentType: idea.contentType || "shorts" },
              creativeContext
            ),
        sourceAsset: idea.sourceAsset || idea.nasaAsset || null,
        contentLanguage: state.settings.contentLanguage || "English",
        contentProfile: state.settings.contentProfile || "general",
        targetAgeGroups: state.settings.targetAgeGroups || [],
        rules: state.settings.rules || {},
        visualStyle: state.settings.visualStyle || "documentary",
        contentType: idea.contentType || "shorts",
        imageFit: idea.imageFit || "cover",
        images: idea.nasaAsset?.previewUrl ? [idea.nasaAsset.previewUrl] : [],
        reviewedAt: state.settings.rules?.humanApproval === false
          ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString()
      };
      idea.status = "generated";
      state.productions.unshift(production);
      await saveState(state);
      return json(res, 201, production);
    }
    const review = url.pathname.match(
      /^\/api\/productions\/([^/]+)\/(approve|reject)$/
    );
    if (req.method === "POST" && review) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === review[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      item.status = review[2] === "approve" ? "approved" : "rejected";
      item.reviewedAt = new Date().toISOString();
      await saveState(state);
      return json(res, 200, item);
    }
    const images = url.pathname.match(/^\/api\/productions\/([^/]+)\/images$/);
    const cloudflareImage = url.pathname.match(
      /^\/api\/productions\/([^/]+)\/cloudflare-image$/
    );
    if (req.method === "POST" && cloudflareImage) {
      const state = await loadState();
      const item = state.productions.find(
        (entry) => entry.id === cloudflareImage[1]
      );
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      if (item.status !== "approved") {
        return json(res, 409, { error: "Önce projeyi onayla" });
      }
      const input = await body(req);
      const subject = clean(input.prompt, 1200);
      if (subject.length < 3) {
        return json(res, 400, { error: "Görsel açıklaması gerekli" });
      }
      const style = item.visualStyle === "animated"
        ? "colorful original 2D educational animation, friendly rounded shapes, child-safe"
        : "polished cinematic documentary illustration";
      const prompt = `Vertical 9:16 scene for a short educational video.
Subject: ${subject}. Project: ${item.content?.title}. Style: ${style}.
No text, logo, watermark, copyrighted characters, franchise imitation, or
photorealistic identifiable people. Strong focal point, mobile composition.`;
      const filename = `${item.id}-flux-${Date.now()}.jpg`;
      const previewUrl = await generateCloudflareImage(prompt, filename);
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      const asset = {
        assetId: `cloudflare-${crypto.randomUUID()}`,
        source: "cloudflare", sourceLabel: "Cloudflare FLUX",
        title: subject, previewUrl, license: "FLUX.1 Schnell output",
        sourcePage: "https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/"
      };
      item.visualAssets.push(asset);
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      item.updatedAt = new Date().toISOString();
      await saveState(state);
      return json(res, 201, { asset, production: item });
    }
    const customImage = url.pathname.match(
      /^\/api\/productions\/([^/]+)\/custom-image$/
    );
    if (req.method === "POST" && customImage) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === customImage[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const input = await body(req);
      const match = String(input.dataUrl || "").match(
        /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/
      );
      if (!match) {
        return json(res, 400, { error: "Yalnızca JPG, PNG veya WebP yüklenebilir" });
      }
      const bytes = Buffer.from(match[2], "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
        return json(res, 400, { error: "Görsel en fazla 10 MB olabilir" });
      }
      const extension = match[1] === "jpeg" ? "jpg" : match[1];
      const filename = `${item.id}-upload-${Date.now()}.${extension}`;
      await mkdir(GENERATED_DIR, { recursive: true });
      await writeFile(join(GENERATED_DIR, filename), bytes);
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      const asset = {
        assetId: `upload-${crypto.randomUUID()}`,
        source: "upload", sourceLabel: "Kullanıcı yüklemesi",
        title: clean(input.name, 300) || "Yüklenen görsel",
        previewUrl: `/generated/${filename}`,
        license: "Kullanıcı tarafından sağlandı", sourcePage: ""
      };
      item.visualAssets.push(asset);
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      item.updatedAt = new Date().toISOString();
      await saveState(state);
      return json(res, 201, { asset, production: item });
    }
    if (req.method === "PUT" && images) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === images[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const payload = await body(req);
      const asset = await resolveMediaAsset(
        payload.source === "wikimedia" ? "wikimedia" : "nasa",
        clean(payload.assetId || payload.nasaId, 120)
      );
      if (!asset) return json(res, 404, { error: "Görsel bulunamadı" });
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      if (!item.visualAssets.some((entry) =>
        (entry.assetId || entry.nasaId) === (asset.assetId || asset.nasaId)
      )) {
        item.visualAssets.push(asset);
      }
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      await saveState(state);
      return json(res, 200, item);
    }
    if (req.method === "DELETE" && images) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === images[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const payload = await body(req);
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      if (item.visualAssets.length <= 1) {
        return json(res, 409, { error: "Videoda en az bir görsel kalmalı" });
      }
      item.visualAssets = item.visualAssets.filter((entry) =>
        (entry.assetId || entry.nasaId) !== (payload.assetId || payload.nasaId)
      );
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      await saveState(state);
      return json(res, 200, item);
    }
    if (req.method === "PATCH" && images) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === images[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const payload = await body(req);
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      const order = Array.isArray(payload.order) ? payload.order.map((id) => clean(id, 160)) : [];
      const byId = new Map(item.visualAssets.map((asset) => [asset.assetId || asset.nasaId, asset]));
      if (order.length !== item.visualAssets.length || new Set(order).size !== order.length || order.some((id) => !byId.has(id))) {
        return json(res, 400, { error: "Görsel sırası geçersiz" });
      }
      item.visualAssets = order.map((id) => byId.get(id));
      item.images = item.visualAssets.map((entry) => entry.previewUrl);
      item.updatedAt = new Date().toISOString();
      await saveState(state);
      return json(res, 200, item);
    }
    if (req.method === "POST" && images) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === images[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      if (item.status !== "approved") {
        return json(res, 409, { error: "Önce içerik paketini onayla" });
      }
      const cloudflareReady = process.env.CLOUDFLARE_ACCOUNT_ID &&
        process.env.CLOUDFLARE_API_TOKEN;
      if (!cloudflareReady && !process.env.GEMINI_API_KEY) {
        return json(res, 409, {
          error: "Cloudflare veya Gemini görsel sağlayıcısı ayarlanmamış"
        });
      }
      item.visualAssets ||= item.sourceAsset ? [item.sourceAsset] : [];
      const completed = item.visualAssets.filter(
        (asset) => asset.source === "cloudflare" || asset.source === "gemini"
      ).length;
      const perRun = Math.max(
        1,
        Math.min(3, Number(process.env.GEMINI_IMAGES_PER_RUN) || 1)
      );
      const scenes = (item.content.scenes || []).slice(completed, completed + perRun);
      if (!scenes.length) return json(res, 200, item);
      for (const [offset, scene] of scenes.entries()) {
        const index = completed + offset;
        const filename = `${item.id}-${index + 1}.jpg`;
        const prompt = `Dikey 9:16 YouTube Shorts sahnesi. ${scene.text}.
Konu: ${item.content.title}. Görselin içinde yazı, logo, filigran, gerçek
kişi taklidi veya telifli karakter olmasın. Özgün, yüksek kontrastlı,
mobil ekranda anlaşılır profesyonel kompozisyon.
${item.visualStyle === "animated" ? "Renkli, neşeli, özgün 2D eğitici animasyon karesi; yuvarlak dost canlısı şekiller, çocuklara uygun, telifli karakter yok." : "Belgesel estetiği."}`;
        try {
          const previewUrl = cloudflareReady
            ? await generateCloudflareImage(prompt, filename)
            : await generateGeminiImage(prompt, filename);
          item.visualAssets.push({
            assetId: `ai-${crypto.randomUUID()}`,
            source: cloudflareReady ? "cloudflare" : "gemini",
            sourceLabel: cloudflareReady ? "Cloudflare FLUX" : "Gemini",
            title: scene.text || item.content.title,
            previewUrl,
            license: cloudflareReady ? "FLUX.1 Schnell output" : "AI generated",
            sourcePage: cloudflareReady
              ? "https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/"
              : ""
          });
          item.images = item.visualAssets.map((asset) => asset.previewUrl);
          delete item.visualFallback;
        } catch (error) {
          const quotaUnavailable =
            error.message.includes("limit: 0") ||
            error.message.includes("current quota");
          if (!quotaUnavailable) throw error;
          const localFilename = `${item.id}-${index + 1}.svg`;
          const previewUrl = await generateLocalVisual(
            scene, item.content.title, localFilename
          );
          item.visualAssets.push({
            assetId: `local-${crypto.randomUUID()}`,
            source: "local", sourceLabel: "Orbit Studio",
            title: scene.text || item.content.title, previewUrl,
            license: "Local generated graphic", sourcePage: ""
          });
          item.images = item.visualAssets.map((asset) => asset.previewUrl);
          item.visualFallback = {
            active: true,
            reason: "Gemini görsel kotası yok; yerel grafik üretildi."
          };
        }
        await saveState(state);
      }
      return json(res, 200, item);
    }
    const render = url.pathname.match(/^\/api\/productions\/([^/]+)\/render$/);
    if (req.method === "POST" && render) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === render[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      if (item.status !== "approved") {
        return json(res, 409, { error: "Önce içerik paketini onayla" });
      }
      const visualAssets = item.visualAssets?.length
        ? item.visualAssets
        : (item.sourceAsset ? [item.sourceAsset] : []);
      const imageUrls = visualAssets.map((asset) => {
        if (asset.previewUrl?.startsWith("/generated/")) {
          return join(GENERATED_DIR, asset.previewUrl.slice("/generated/".length));
        }
        return asset.previewUrl;
      }).filter(Boolean);
      const imageUrl = imageUrls[0] || item.images?.[0];
      if (!imageUrl) {
        return json(res, 409, {
          error: "Video için önce NASA veya Wikimedia kaynaklı bir görsel seçilmeli"
        });
      }
      const renderDir = join(GENERATED_DIR, item.id);
      await mkdir(renderDir, { recursive: true });
      const jobPath = join(renderDir, "job.json");
      await writeFile(jobPath, JSON.stringify({
        outputDir: renderDir,
        imageUrl,
        imageUrls: imageUrls.length ? imageUrls : [imageUrl],
        title: item.content.title,
        narration: item.content.narration,
        contentType: item.contentType || "shorts",
        imageFit: item.imageFit || "cover",
        burnCaptions: item.rules?.burnCaptions !== false,
        voice: item.contentLanguage === "Turkish"
          ? "tr-TR-AhmetNeural" : "en-US-GuyNeural",
        credit: `NASA • ${item.sourceAsset?.nasaId || "Image Library"} • ${
          item.sourceAsset?.sourcePage || ""
        }`,
        credits: visualAssets.map((asset) =>
          `${asset.sourceLabel || "NASA"} • ${asset.photographer || asset.assetId || asset.nasaId || "Media"} • ${asset.license || ""} • ${asset.sourcePage || ""}`
        ),
        visualStyle: item.visualStyle || "documentary"
      }, null, 2), "utf8");
      item.render = { status: "processing", startedAt: new Date().toISOString() };
      await saveState(state);
      try {
        const { stdout } = await execFileAsync(
          PYTHON_EXECUTABLE,
          [join(ROOT, "src", "render_video.py"), jobPath],
          { cwd: ROOT, timeout: 240000, maxBuffer: 1024 * 1024 * 4 }
        );
        const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
        item.render = {
          status: "ready",
          videoUrl: `/renders/${item.id}/video.mp4`,
          audioUrl: `/renders/${item.id}/narration.mp3`,
          captionsUrl: `/renders/${item.id}/captions.srt`,
          creditsUrl: `/renders/${item.id}/credits.txt`,
          completedAt: new Date().toISOString(),
          files: result
        };
        await saveState(state);
        return json(res, 200, item);
      } catch (error) {
        const renderError = error.code === "ENOENT"
          ? `Python bulunamadı: ${PYTHON_EXECUTABLE}. PYTHON_EXECUTABLE ayarını kontrol et.`
          : clean(error.stderr || error.message, 3000);
        item.render = {
          status: "failed",
          error: renderError,
          failedAt: new Date().toISOString()
        };
        await saveState(state);
        return json(res, 500, { error: item.render.error });
      }
    }
    return json(res, 404, { error: "Bulunamadı" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || "Sunucu hatası" });
  }
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`YouTube AI Studio: http://127.0.0.1:${PORT}`);
  const providers = [
    process.env.GEMINI_API_KEY ? "Gemini" : null,
    process.env.OPENAI_API_KEY ? "OpenAI" : null,
    process.env.ANTHROPIC_API_KEY ? "Claude" : null
  ].filter(Boolean);
  console.log(
    providers.length
      ? `Aktif AI sağlayıcıları: ${providers.join(", ")}`
      : "AI anahtarı bulunamadı; hikâye üretimi kapalı"
  );
});
