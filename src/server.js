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
const youtubeOauthStates = new Map();
let telegramUpdateOffset = 0;
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
const LANGUAGE_NAMES = Object.fromEntries(Object.entries(CONTENT_LANGUAGES).map(([name, code]) => [code, name]));
const MELO_LANGUAGES = new Set(["en", "es", "fr", "zh", "ja", "ko"]);
const EDGE_VOICES = {
  Turkish: "tr-TR-AhmetNeural", English: "en-US-GuyNeural", Spanish: "es-ES-ElviraNeural",
  German: "de-DE-KatjaNeural", French: "fr-FR-DeniseNeural", Portuguese: "pt-BR-FranciscaNeural",
  Italian: "it-IT-ElsaNeural", Arabic: "ar-SA-ZariyahNeural", Hindi: "hi-IN-SwaraNeural",
  Chinese: "zh-CN-XiaoxiaoNeural", Japanese: "ja-JP-NanamiNeural", Korean: "ko-KR-SunHiNeural",
  Russian: "ru-RU-SvetlanaNeural", Dutch: "nl-NL-ColetteNeural", Polish: "pl-PL-ZofiaNeural",
  Indonesian: "id-ID-GadisNeural", Vietnamese: "vi-VN-HoaiMyNeural", Ukrainian: "uk-UA-PolinaNeural",
  Thai: "th-TH-PremwadeeNeural"
};
const defaults = {
  settings: {
    niche: process.env.CHANNEL_NICHE || "teknoloji ve yapay zeka",
    audience: process.env.TARGET_AUDIENCE ||
      "18-34 yaş, Türkçe konuşan meraklı izleyiciler",
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
function youtubeOauthReady() {
  return Boolean(process.env.YOUTUBE_OAUTH_CLIENT_ID &&
    process.env.YOUTUBE_OAUTH_CLIENT_SECRET && process.env.YOUTUBE_OAUTH_REFRESH_TOKEN);
}
function youtubeRedirectUri(req) {
  return process.env.YOUTUBE_OAUTH_REDIRECT_URI ||
    `http://${req.headers.host}/api/youtube/oauth/callback`;
}
async function youtubeToken(params) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error_description || result.error || "YouTube OAuth işlemi başarısız");
    error.status = response.status;
    throw error;
  }
  return result;
}
async function youtubeAccessToken() {
  if (!youtubeOauthReady()) {
    const error = new Error("YouTube kanal bağlantısı gerekli");
    error.status = 409;
    throw error;
  }
  const result = await youtubeToken({
    client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID,
    client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_OAUTH_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });
  return result.access_token;
}
async function uploadYoutubeVideo(filePath, metadata) {
  const info = await stat(filePath);
  const accessToken = await youtubeAccessToken();
  const startUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  startUrl.searchParams.set("uploadType", "resumable");
  startUrl.searchParams.set("part", "snippet,status");
  const start = await fetch(startUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(info.size),
      "x-upload-content-type": "video/mp4"
    },
    body: JSON.stringify({
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId
      },
      status: { privacyStatus: "private", selfDeclaredMadeForKids: metadata.madeForKids }
    })
  });
  if (!start.ok) {
    const detail = await start.json().catch(() => ({}));
    throw new Error(detail.error?.message || `YouTube yükleme oturumu açılamadı: ${start.status}`);
  }
  const uploadUrl = start.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube yükleme adresi döndürmedi");
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "video/mp4",
      "content-length": String(info.size)
    },
    body: createReadStream(filePath),
    duplex: "half"
  });
  const result = await uploaded.json().catch(() => ({}));
  if (!uploaded.ok) throw new Error(result.error?.message || `YouTube yüklemesi başarısız: ${uploaded.status}`);
  return result;
}
async function telegramCall(method, payload = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    const error = new Error("Telegram bot bağlantısı gerekli");
    error.status = 409;
    throw error;
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const error = new Error(result.description || `Telegram işlemi başarısız: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return result.result;
}
async function syncTelegramReviews() {
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "");
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return { processed: 0 };
  const updates = await telegramCall("getUpdates", {
    offset: telegramUpdateOffset || undefined,
    timeout: 0,
    allowed_updates: ["callback_query"]
  });
  let processed = 0;
  const state = await loadState();
  for (const update of updates) {
    telegramUpdateOffset = Math.max(telegramUpdateOffset, Number(update.update_id) + 1);
    const callback = update.callback_query;
    if (!callback) continue;
    const match = String(callback.data || "").match(/^orbit:(approve|reject):([a-f0-9]{24})$/);
    const authorized = String(callback.message?.chat?.id || "") === chatId;
    const item = match && authorized
      ? state.productions.find((entry) => entry.telegram?.reviewToken === match[2]) : null;
    if (!item || item.telegram?.status !== "pending") {
      await telegramCall("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: authorized ? "Bu onay isteği artık geçerli değil." : "Bu işlem için yetkiniz yok.",
        show_alert: true
      });
      continue;
    }
    const approved = match[1] === "approve";
    item.status = approved ? "approved" : "rejected";
    item.reviewedAt = new Date().toISOString();
    item.telegram.status = approved ? "approved" : "rejected";
    item.telegram.reviewedAt = item.reviewedAt;
    item.telegram.reviewedBy = callback.from?.username || callback.from?.first_name || "Telegram editor";
    await telegramCall("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: approved ? "Proje onaylandı." : "Proje reddedildi."
    });
    await telegramCall("editMessageReplyMarkup", {
      chat_id: chatId, message_id: callback.message.message_id,
      reply_markup: { inline_keyboard: [] }
    });
    processed += 1;
  }
  if (processed) await saveState(state);
  return { processed };
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
function cleanSpeechText(value, max = 4000) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}
function inferNarrationLanguage(text, fallback = "English") {
  const sample = String(text || "").toLocaleLowerCase("tr-TR");
  const turkishWords = sample.match(/\b(ve|bir|bu|için|ile|ama|gibi|daha|olan|olarak|çok|değil|şimdi|sonra|neden|nasıl)\b/g) || [];
  return /[çğıöşü]/i.test(sample) || turkishWords.length >= 2 ? "Turkish" : fallback;
}

function youtubeDurationSeconds(value) {
  const match = String(value || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

async function fetchYoutubeTrends(regionCode = "TR", categoryId = "0") {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const error = new Error("YouTube Data API anahtarı gerekli. Ayarlar > Entegrasyonlar bölümünden ekleyin.");
    error.status = 503;
    throw error;
  }
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "24");
  url.searchParams.set("key", key);
  if (categoryId !== "0") url.searchParams.set("videoCategoryId", categoryId);
  const response = await fetch(url, { headers: { "user-agent": "TERZI-Studio/0.1" } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || `YouTube trendleri alınamadı: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return (result.items || []).map((item, index) => ({
    id: clean(item.id, 32),
    rank: index + 1,
    title: clean(item.snippet?.title, 300),
    description: clean(item.snippet?.description, 1800),
    channelTitle: clean(item.snippet?.channelTitle, 200),
    publishedAt: item.snippet?.publishedAt || "",
    categoryId: clean(item.snippet?.categoryId, 12),
    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
    durationSeconds: youtubeDurationSeconds(item.contentDetails?.duration),
    views: Number(item.statistics?.viewCount || 0),
    likes: Number(item.statistics?.likeCount || 0),
    comments: Number(item.statistics?.commentCount || 0),
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`
  }));
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
const EDITORIAL_ANGLES = {
  "hidden-detail": { id:"hidden-detail", label:"Gizli ayrıntı", score:94, promise:"İlk bakışta fark edilmeyen ayrıntıyı açığa çıkar", lens:"Reveal one specific detail most viewers would miss and show why it changes the story." },
  "myth-reality": { id:"myth-reality", label:"Yanlış bilinen", score:92, promise:"Yaygın beklentiyle doğrulanabilir gerçeği karşılaştır", lens:"Challenge one common assumption, then replace it with a source-supported explanation." },
  "why-now": { id:"why-now", label:"Neden şimdi?", score:89, promise:"Konuyu güncel bir değişim veya sonuçla ilişkilendir", lens:"Explain why this matters now, without inventing urgency or unsupported trend claims." },
  scale: { id:"scale", label:"Ölçek şaşkınlığı", score:87, promise:"Soyut büyüklüğü gündelik bir karşılaştırmayla hissettir", lens:"Turn scale, distance, time, cost, or impact into one concrete everyday comparison." },
  consequence: { id:"consequence", label:"Sonra ne oldu?", score:85, promise:"Tek bir kararın veya olayın beklenmedik sonucunu izle", lens:"Build a cause-and-effect chain with a clear consequence and satisfying payoff." },
  "human-stakes": { id:"human-stakes", label:"İnsan etkisi", score:82, promise:"Konuyu gerçek bir insan ihtiyacı veya gerilim üzerinden anlat", lens:"Frame the topic through a relatable human need, constraint, or decision without fabricating a person." }
};
function editorialAngle(id) {
  return structuredClone(EDITORIAL_ANGLES[id] || EDITORIAL_ANGLES["hidden-detail"]);
}
function retentionBrief(settings) {
  const angle = settings.creativeAngle || editorialAngle("hidden-detail");
  const shortForm = settings.contentType !== "youtube";
  return `Selected editorial angle: ${angle.label}. ${angle.lens}
Retention contract:
- Write three distinct hookOptions and choose the strongest as hook.
- State a clear viewerPromise and open one curiosityGap that the payoff closes.
- ${shortForm ? "Deliver value in the first sentence; no greeting, logo intro, countdown, or generic setup." : "Open on the strongest moment and keep any branded intro under 3 seconds."}
- ${shortForm ? "Create a meaningful information, framing, or visual change every 2-3 seconds." : "Use a new story beat or visual purpose every 5-8 seconds."}
- Add a midpointHook, a concrete payoff, and a natural commentPrompt.
- Produce exactly six titleOptions: two searchable, two curiosity-led, and two broad-audience titles. Titles must be accurate.
- Every scene must include seconds, type, text, visualQuery, visualRole, and changeReason.
- visualQuery must be one or two simple English words suitable for NASA or Wikimedia search.
Return JSON only with: title, titleOptions, hook, hookOptions, viewerPromise, curiosityGap, midpointHook, payoff, commentPrompt, narration, scenes, sourceChecklist, disclosure.`;
}
function sanitizeVisionInputs(value) {
  if (!Array.isArray(value)) return [];
  let totalLength = 0;
  return value.slice(0, 12).map((item) => {
    const dataUrl = String(item?.dataUrl || "");
    const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match || dataUrl.length > 330_000) {
      throw new Error("Analiz görseli geçersiz veya çok büyük");
    }
    totalLength += dataUrl.length;
    if (totalLength > 4_200_000) throw new Error("Analiz görsellerinin toplam boyutu çok büyük");
    return {
      name: clean(item?.name || "Kullanıcı fotoğrafı", 180),
      mediaType: "image/" + match[1],
      data: match[2],
      dataUrl
    };
  });
}
function visionBrief(imageInputs) {
  if (!imageInputs.length) return "";
  return "Uploaded photos are the primary source. Analyze them in the supplied order. " +
    "Ground the story in visible details only; do not guess identities, location, date, relationships, or events. " +
    "Treat the written topic as optional creative direction, not as evidence. Make every uploaded photo useful in the scene plan.";
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
    headers: { "user-agent": "TERZI-Studio/0.1 (local creative tool)" }
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
  return clean(value, 120).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}
function buildArchiveQueryPlan(value) {
  const original = clean(value, 120);
  const normalized = archiveAscii(original);
  const concepts = [];
  for (const [pattern, phrase] of ARCHIVE_VISUAL_CONCEPTS) {
    if (pattern.test(normalized) && !concepts.includes(phrase)) concepts.push(phrase);
  }
  const simpleEnglishQuery = /^[a-z0-9\s-]+$/i.test(original) && original.trim().split(/\s+/).length <= 4;
  let interpretedAs = concepts[0] || "";
  if (!interpretedAs && simpleEnglishQuery) interpretedAs = original.trim();
  if (!interpretedAs) interpretedAs = normalized.split(" ").filter((word) => word.length > 2 && !ARCHIVE_STOP_WORDS.has(word)).slice(0, 5).join(" ") || "creative storytelling";
  const queries = [interpretedAs];
  if (concepts.length > 1) queries.push(concepts[1]);
  const spaceRelated = /planet|mars|saturn|earth|moon|space|telescope|astronom|gezegen|uzay|dunya|\bay\b/.test(`${normalized} ${interpretedAs.toLowerCase()}`);
  return { original, interpretedAs, queries: [...new Set(queries)].slice(0, 2), spaceRelated, interpretationMode: concepts.length ? "visual-intent" : "keywords" };
}
async function runArchiveQueries(source, queries) {
  const attempts = await Promise.allSettled(queries.map((query) => source === "nasa" ? searchNasa(query) : searchWikimedia(query)));
  const items = [];
  const failures = [];
  const seen = new Set();
  attempts.forEach((attempt, index) => {
    if (attempt.status === "rejected") { failures.push(`${source}:${queries[index]}: ${clean(attempt.reason?.message, 180)}`); return; }
    for (const item of attempt.value) {
      const normalizedItem = item.source ? item : { ...item, assetId:item.nasaId, source:"nasa", sourceLabel:"NASA", license:"NASA media guidelines" };
      const key = `${normalizedItem.source}:${normalizedItem.assetId}`;
      if (!seen.has(key)) { seen.add(key); items.push(normalizedItem); }
    }
  });
  items.sort((left, right) => Number(Boolean(left.riskFlags?.length)) - Number(Boolean(right.riskFlags?.length)));
  return { items, failures };
}
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

async function resolveMediaAsset(source, id) {
  if (source === "wikimedia") return (await searchWikimedia(id, true))[0];
  const matches = await searchNasa(id, true);
  const nasa = matches.find((item) => item.nasaId === id) || matches[0];
  return nasa ? {
    ...nasa, assetId: nasa.nasaId, source: "nasa", sourceLabel: "NASA"
  } : null;
}

function demoPackage(topic, settings, sources = "") {
  const description = String(sources).match(/(?:Açıklama|Description):\s*([^\n]+)/i)?.[1]?.trim();
  return {
    mode: "demo",
    fallback: true,
    title: `${topic}: Çoğu kişinin kaçırdığı ayrıntı`,
    hook: `${topic} hakkında bildiğin şey eksik olabilir.`,
    narration: `Bu kaynak temelli taslağın odağında ${topic} var. ` +
      `${description || "Arşiv kaydı konuyu tanımlıyor ancak ek olgusal iddialar için yeterli açıklama sunmuyor."} ` +
      `Bu ilk metin yalnızca verilen kaynak notlarıyla sınırlı tutuldu. ` +
      `Yayınlamadan önce kaynak sayfasını ve lisansı kontrol et; ardından doğrulanmış bağlamı ekle.`,
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

function validateGeneratedContent(content) {
  const title = String(content?.title || "").trim();
  const hook = String(content?.hook || "").trim();
  const narration = String(content?.narration || "").trim();
  const scenes = Array.isArray(content?.scenes)
    ? content.scenes.filter((scene) => String(scene?.text || "").trim()).slice(0, 8)
    : [];
  if (title.length < 3 || hook.length < 3 || narration.length < 20 || scenes.length < 1) {
    throw Object.assign(new Error("AI boş veya eksik bir içerik paketi döndürdü. Lütfen tekrar dene."), { status: 502 });
  }
  return { ...content, title, hook, narration, scenes };
}

const CONTENT_PACKAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "hook", "narration", "scenes", "sourceChecklist", "disclosure"],
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
    narration: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seconds", "type", "text"],
        properties: {
          seconds: { type: "string" },
          type: { type: "string" },
          text: { type: "string" }
        }
      }
    },
    sourceChecklist: { type: "array", items: { type: "string" } },
    disclosure: {
      type: "object",
      additionalProperties: false,
      required: ["aiAssisted", "youtubeAlteredContent"],
      properties: {
        aiAssisted: { type: "boolean" },
        youtubeAlteredContent: { type: "string" }
      }
    }
  }
};

async function openAiPackage(topic, sources, settings, imageInputs = []) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY bulunamadı; kanal ayarından Gemini seçebilir veya anahtarı ekleyebilirsiniz.");
  }
  const targetLanguage = settings.contentLanguage || "English";
  const prompt = `You are a YouTube Shorts editor writing in ${targetLanguage}.
LANGUAGE CONTRACT: Write every user-facing field entirely in natural ${targetLanguage}. This includes title, hook, narration, every scene text, sourceChecklist, and disclosure text. Do not switch to English unless the target language is English.
Channel niche: ${settings.niche}
Target audience: ${settings.audience}
Content direction: ${profileBrief(settings)}
Visual direction: ${settings.visualStyle === "animated" ? "Use colorful original cartoon-like educational scenes, friendly shapes and visual metaphors. Never imitate copyrighted characters or franchises." : "Documentary visual storytelling."}
Topic: ${topic}
Verified source notes: ${sources || "No sources; do not make factual claims."}

${contentBrief(settings)}
${retentionBrief(settings)}
${visionBrief(imageInputs)}
Create a completely original content package in natural ${settings.contentLanguage || "English"}.
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
  if (!response.ok) throw new Error(`OpenAI isteği başarısız (${response.status}): ${result.error?.message || response.statusText}`);
  const output = result.output_text || result.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "output_text")?.text;
  if (!output) throw new Error("Model boş yanıt verdi");
  return validateGeneratedContent({ mode: "openai", ...JSON.parse(output) });
}

async function claudePackage(topic, sources, settings, imageInputs = []) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Claude API anahtarı bulunamadı. Entegrasyonlar sekmesinden anahtarı ekleyin.");
  }
  const targetLanguage = settings.contentLanguage || "English";
  const prompt = `You are an expert video editor writing in ${targetLanguage}.
LANGUAGE CONTRACT: Write every user-facing field entirely in natural ${targetLanguage}. This includes title, hook, narration, every scene text, sourceChecklist, and disclosure text. Do not switch to English unless the target language is English.
Channel niche: ${settings.niche}
Target audience: ${settings.audience}
Content direction: ${profileBrief(settings)}
Topic: ${topic}
Verified source notes: ${sources || "No sources; do not make factual claims."}

${contentBrief(settings)}
${retentionBrief(settings)}
${visionBrief(imageInputs)}
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
  return validateGeneratedContent({ mode: "claude", model: result.model, ...JSON.parse(output) });
}

async function geminiPackage(topic, sources, settings, creativeContext = {}, imageInputs = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY bulunamadı. .env dosyasına anahtarı ekleyip sunucuyu yeniden başlatın."
    );
  }
  const models = [
    settings.textModel || process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash",
    "gemini-3.6-flash"
  ].filter((model, index, all) => all.indexOf(model) === index);
  const targetLanguage = settings.contentLanguage || "English";
  const prompt = `You are a YouTube Shorts editor writing in ${targetLanguage}.
LANGUAGE CONTRACT: Write every user-facing field entirely in natural ${targetLanguage}. This includes title, hook, narration, every scene text, sourceChecklist, and disclosure text. Do not switch to English unless the target language is English.
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
${retentionBrief(settings)}
${visionBrief(imageInputs)}
Create a completely original package in natural ${settings.contentLanguage || "English"}. Do not
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
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY,
            "content-type": "application/json"
          },
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
  const output = result.output_text || result.steps
    ?.flatMap((step) => step.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text || "").join("");
  if (!output) throw new Error("Gemini boş yanıt verdi");
  return validateGeneratedContent({
    mode: "gemini",
    model: selectedModel,
    ...JSON.parse(output)
  });
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

function pcmWaveBuffer(pcm, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
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

async function generateGeminiSpeech(text, apiKey, lang = "tr", style = "natural") {
  if (!apiKey) throw new Error("Türkçe seslendirme için Gemini API anahtarı gerekli");
  const model = "gemini-3.1-flash-tts-preview";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method:"POST",
    headers:{ "x-goog-api-key":apiKey, "content-type":"application/json" },
    body:JSON.stringify({
      model,
      input:naturalSpeechPrompt(text, lang, style),
      response_format:{ type:"audio" },
      generation_config:{
        speech_config:[{ voice:"Sulafat" }]
      }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `Gemini seslendirme isteği başarısız (${response.status})`);
  const audioOutput = payload.output_audio || payload.steps
    ?.flatMap((step) => step.content || []).find((block) => block.type === "audio");
  if (!audioOutput?.data) throw new Error("Gemini ses dosyası döndürmedi");
  const audio = Buffer.from(audioOutput.data, "base64");
  return String(audioOutput.mime_type || audioOutput.mimeType || "").includes("wav") ? audio : pcmWaveBuffer(audio);
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
          youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
          youtubeUploadConfigured: youtubeOauthReady(),
          youtubeOauthClientConfigured: Boolean(
            process.env.YOUTUBE_OAUTH_CLIENT_ID && process.env.YOUTUBE_OAUTH_CLIENT_SECRET
          ),
          telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
          cloudflareConfigured: Boolean(
            process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
          ),
          cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
          managedImageGeneration: false,
          demoAvailable: true,
          demo: { used: 0, limit: 1 }
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
      const text = cleanSpeechText(input.text, 4000);
      if (!text) return json(res, 400, { error: "Seslendirilecek metin gerekli" });
      const requestedLang = clean(input.lang, 8).toLowerCase();
      const lang = Object.values(CONTENT_LANGUAGES).includes(requestedLang) ? requestedLang : "en";
      const style = ["natural", "energetic", "documentary", "inspiring"].includes(input.style) ? input.style : "natural";
      const geminiKey = clean(req.headers["x-orbit-ai-key"], 300) || process.env.GEMINI_API_KEY || "";
      if (lang === "tr" && !geminiKey) {
        return json(res, 409, { error:"Türkçe seslendirme için Entegrasyonlar bölümünden Gemini API anahtarını bağla." });
      }
      if (!geminiKey && !MELO_LANGUAGES.has(lang)) {
        return json(res, 409, { error:`${LANGUAGE_NAMES[lang] || lang} seslendirmesi için Gemini API anahtarı gerekli.` });
      }
      const audio = geminiKey
        ? await generateGeminiSpeech(text, geminiKey, lang, style)
        : await generateCloudflareSpeech(text, lang);
      res.writeHead(200, { "content-type":geminiKey ? "audio/wav" : "audio/mpeg", "cache-control":"no-store" });
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
    if (req.method === "PUT" && url.pathname === "/api/config/youtube-key") {
      const input = await body(req);
      const key = String(input.key || "").trim();
      if (key.length < 20 || /\s/.test(key)) {
        return json(res, 400, { error: "Geçerli bir YouTube Data API anahtarı girin" });
      }
      await saveEnvValue("YOUTUBE_API_KEY", key);
      return json(res, 200, { configured: true });
    }
    if (req.method === "PUT" && url.pathname === "/api/config/youtube-oauth") {
      const input = await body(req);
      const clientId = String(input.clientId || "").trim();
      const clientSecret = String(input.clientSecret || "").trim();
      if (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
        return json(res, 400, { error: "Geçerli bir Google OAuth Client ID girin" });
      }
      if (clientSecret.length < 12 || /\s/.test(clientSecret)) {
        return json(res, 400, { error: "Geçerli bir Google OAuth Client Secret girin" });
      }
      await saveEnvValue("YOUTUBE_OAUTH_CLIENT_ID", clientId);
      await saveEnvValue("YOUTUBE_OAUTH_CLIENT_SECRET", clientSecret);
      if (!process.env.YOUTUBE_OAUTH_REDIRECT_URI) {
        await saveEnvValue("YOUTUBE_OAUTH_REDIRECT_URI",
          `http://${req.headers.host}/api/youtube/oauth/callback`);
      }
      return json(res, 200, {
        configured: true,
        redirectUri: process.env.YOUTUBE_OAUTH_REDIRECT_URI
      });
    }
    if (req.method === "PUT" && url.pathname === "/api/config/telegram") {
      const input = await body(req);
      const token = String(input.token || "").trim();
      const chatId = String(input.chatId || "").trim();
      if (!/^\d{6,12}:[A-Za-z0-9_-]{25,}$/.test(token)) {
        return json(res, 400, { error: "Geçerli bir Telegram bot tokenı girin" });
      }
      if (!/^-?\d{5,20}$/.test(chatId)) {
        return json(res, 400, { error: "Geçerli bir Telegram Chat ID girin" });
      }
      await saveEnvValue("TELEGRAM_BOT_TOKEN", token);
      await saveEnvValue("TELEGRAM_CHAT_ID", chatId);
      return json(res, 200, { configured: true });
    }
    if (req.method === "POST" && url.pathname === "/api/telegram/sync") {
      return json(res, 200, await syncTelegramReviews());
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
    if (req.method === "GET" && url.pathname === "/api/youtube/trends") {
      const region = clean(url.searchParams.get("region") || "TR", 2).toUpperCase();
      const category = clean(url.searchParams.get("category") || "0", 3);
      if (!/^[A-Z]{2}$/.test(region)) return json(res, 400, { error: "Geçerli bir ülke kodu gerekli" });
      if (!/^\d{1,3}$/.test(category)) return json(res, 400, { error: "Geçerli bir kategori gerekli" });
      return json(res, 200, { region, category, items: await fetchYoutubeTrends(region, category) });
    }
    if (req.method === "GET" && url.pathname === "/api/youtube/oauth/start") {
      if (!process.env.YOUTUBE_OAUTH_CLIENT_ID || !process.env.YOUTUBE_OAUTH_CLIENT_SECRET) {
        return json(res, 409, { error: "YOUTUBE_OAUTH_CLIENT_ID ve YOUTUBE_OAUTH_CLIENT_SECRET ayarlanmalı" });
      }
      const state = crypto.randomUUID();
      youtubeOauthStates.set(state, Date.now() + 10 * 60 * 1000);
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", process.env.YOUTUBE_OAUTH_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", youtubeRedirectUri(req));
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);
      return json(res, 200, { authUrl: authUrl.toString() });
    }
    if (req.method === "GET" && url.pathname === "/api/youtube/oauth/callback") {
      const oauthState = url.searchParams.get("state");
      const expiresAt = youtubeOauthStates.get(oauthState);
      youtubeOauthStates.delete(oauthState);
      if (!expiresAt || expiresAt < Date.now() || !url.searchParams.get("code")) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        return res.end("YouTube bağlantısı doğrulanamadı. Bu pencereyi kapatıp tekrar deneyin.");
      }
      const tokens = await youtubeToken({
        code: url.searchParams.get("code"),
        client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID,
        client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET,
        redirect_uri: youtubeRedirectUri(req),
        grant_type: "authorization_code"
      });
      if (!tokens.refresh_token) throw new Error("Google yenileme tokenı döndürmedi; erişimi kaldırıp yeniden bağlayın");
      await saveEnvValue("YOUTUBE_OAUTH_REFRESH_TOKEN", tokens.refresh_token);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end("<!doctype html><meta charset=utf-8><title>YouTube bağlandı</title><style>body{font:16px system-ui;padding:48px;text-align:center}</style><h1>YouTube kanalı bağlandı</h1><p>TERZİ'ye dönüp yüklemeyi başlatabilirsiniz.</p><script>setTimeout(()=>window.close(),1200)</script>");
    }
    const youtubeUpload = url.pathname.match(/^\/api\/productions\/([^/]+)\/youtube-upload$/);
    if (req.method === "POST" && youtubeUpload) {
      const input = await body(req);
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === youtubeUpload[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      if (item.render?.status !== "ready") return json(res, 409, { error: "Önce videoyu render edin" });
      const title = clean(input.title || item.content?.title, 100);
      const description = clean(input.description || item.content?.hook, 5000);
      const tags = Array.isArray(input.tags) ? input.tags.map((tag) => clean(tag, 30)).filter(Boolean).slice(0, 15) : [];
      const categoryId = /^\d{1,3}$/.test(String(input.categoryId)) ? String(input.categoryId) : "22";
      if (!title) return json(res, 400, { error: "YouTube başlığı gerekli" });
      const result = await uploadYoutubeVideo(join(GENERATED_DIR, item.id, "video.mp4"), {
        title, description, tags, categoryId,
        madeForKids: Boolean(state.settings.rules?.childSafe || state.settings.contentProfile === "kids")
      });
      item.youtube = {
        videoId: result.id,
        url: `https://studio.youtube.com/video/${encodeURIComponent(result.id)}/edit`,
        privacyStatus: "private",
        uploadedAt: new Date().toISOString()
      };
      await saveState(state);
      return json(res, 201, item.youtube);
    }
    if (req.method === "POST" && url.pathname === "/api/youtube/trends/import") {
      const input = await body(req);
      const videoId = clean(input.videoId, 32);
      const title = clean(input.title, 300);
      if (!videoId || !title) return json(res, 400, { error: "Trend videosu bilgisi eksik" });
      const state = await loadState();
      const sourceUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      const idea = {
        id: crypto.randomUUID(),
        topic: title,
        sources: [
          "Araştırma sinyali: YouTube mostPopular listesi",
          `Referans video: ${title}`,
          `Kanal: ${clean(input.channelTitle, 200)}`,
          `Görüntülenme: ${Number(input.views || 0)}`,
          `Bağlantı: ${sourceUrl}`,
          "Kural: Referans videoyu veya küçük resmini kopyalama; konuyu özgün bir açı ve doğrulanabilir kaynaklarla yeniden araştır."
        ].join("\n"),
        status: "new",
        sourceType: "youtube-trend",
        trendSource: { videoId, title, channelTitle: clean(input.channelTitle, 200), url: sourceUrl },
        contentType: ["youtube", "reels"].includes(input.contentType) ? input.contentType : "shorts",
        imageFit: "cover",
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveState(state);
      return json(res, 201, idea);
    }
    if (req.method === "GET" && url.pathname === "/api/media/search") {
      const query = clean(url.searchParams.get("q"), 120);
      const source = url.searchParams.get("source") === "wikimedia"
        ? "wikimedia" : "nasa";
      if (query.length < 2) {
        return json(res, 400, { error: "En az iki karakterlik arama gerekli" });
      }
      const result = await searchMediaSmart(source, query);
      return json(res, 200, { ...result, source: result.sourceUsed });
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
        contentLanguage: normalizeContentLanguage(input.contentLanguage, state.settings.contentLanguage || "English"),
        contentType: ["reels", "youtube"].includes(input.contentType)
          ? input.contentType : "shorts",
        imageFit: input.imageFit === "contain" ? "contain" : "cover",
        createdAt: new Date().toISOString()
      };
      state.ideas.unshift(idea);
      await saveState(state);
      return json(res, 201, idea);
    }
    const ideaAssets = url.pathname.match(/^\/api\/ideas\/([^/]+)\/assets$/);
    if (req.method === "PUT" && ideaAssets) {
      const input = await body(req);
      const state = await loadState();
      const idea = state.ideas.find((entry) => entry.id === ideaAssets[1]);
      if (!idea) return json(res, 404, { error: "Konu bulunamadı" });
        const requested = Array.isArray(input.assets) ? input.assets.slice(0, 11) : [];
        const extra = [];
        const seenAssets = new Set([idea.sourceAsset].filter(Boolean).map((asset) => `${asset.source}:${asset.assetId || asset.nasaId}`));
        for (const requestedAsset of requested) {
        const asset = await resolveMediaAsset(requestedAsset.source, clean(requestedAsset.assetId, 120)).catch(() => null);
        const key = asset ? `${asset.source}:${asset.assetId || asset.nasaId}` : "";
        if (asset && !asset.riskFlags?.length && !seenAssets.has(key)) {
          seenAssets.add(key);
          extra.push(asset);
        }
        }
      idea.topic = clean(input.topic, 180) || idea.topic;
      idea.sourceAssets = [idea.sourceAsset, ...extra].filter(Boolean);
      const creativeBrief = clean(input.creativeBrief, 700);
      idea.sources += (creativeBrief ? `\nCreative brief: ${creativeBrief}` : "") + "\nEk görseller:\n" + extra.map((asset) => `${asset.sourceLabel}: ${asset.title} (${asset.sourcePage})`).join("\n");
      await saveState(state);
      return json(res, 200, idea);
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
        contentLanguage: normalizeContentLanguage(input.contentLanguage, state.settings.contentLanguage || "English"),
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
    const telegramReview = url.pathname.match(/^\/api\/productions\/([^/]+)\/telegram-review$/);
    if (req.method === "POST" && telegramReview) {
      const state = await loadState();
      const item = state.productions.find((entry) => entry.id === telegramReview[1]);
      if (!item) return json(res, 404, { error: "Üretim bulunamadı" });
      const token = crypto.randomBytes(12).toString("hex");
      const message = await telegramCall("sendMessage", {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: [`TERZİ editör onayı`, ``, `Proje: ${item.content?.title || "Adsız proje"}`,
          `Format: ${item.contentType || "shorts"}`, `Dil: ${item.contentLanguage || "English"}`,
          ``, `${clean(item.content?.hook, 500)}`, ``, `Bu içeriği üretime alalım mı?`].join("\n"),
        reply_markup: { inline_keyboard: [[
          { text: "✅ Onayla", callback_data: `orbit:approve:${token}` },
          { text: "❌ Reddet", callback_data: `orbit:reject:${token}` }
        ]] }
      });
      item.telegram = { status: "pending", reviewToken: token,
        messageId: message.message_id, sentAt: new Date().toISOString() };
      await saveState(state);
      return json(res, 201, item.telegram);
    }
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
        contentLanguage: normalizeContentLanguage(input.contentLanguage, state.settings.contentLanguage || "English"),
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
        contentLanguage: normalizeContentLanguage(input.contentLanguage, inferNarrationLanguage(narration, state.settings.contentLanguage || "English")),
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
    const ideaAngle = url.pathname.match(/^\/api\/ideas\/([^/]+)\/angle$/);
    if (req.method === "PUT" && ideaAngle) {
      const input = await body(req);
      if (!EDITORIAL_ANGLES[input.angle?.id]) {
        return json(res, 400, { error: "Geçerli bir içerik açısı seçin" });
      }
      const state = await loadState();
      const idea = state.ideas.find((item) => item.id === ideaAngle[1]);
      if (!idea) return json(res, 404, { error: "Konu bulunamadı" });
      idea.angle = editorialAngle(input.angle.id);
      idea.updatedAt = new Date().toISOString();
      await saveState(state);
      return json(res, 200, idea);
    }
    const generation = url.pathname.match(/^\/api\/ideas\/([^/]+)\/generate$/);
    if (req.method === "POST" && generation) {
      const input = await body(req);
      const imageInputs = sanitizeVisionInputs(input.imageInputs);
      const state = await loadState();
      const idea = state.ideas.find((item) => item.id === generation[1]);
      if (!idea) return json(res, 404, { error: "Konu bulunamadı" });
      const selectedAngle = idea.angle || editorialAngle("hidden-detail");
      idea.angle = selectedAngle;
      const creativeContext = {
        angle: selectedAngle.lens,
        previousTitles: state.productions
          .slice(0, 8)
          .map((production) => production.content?.title)
          .filter(Boolean)
      };
      const generationSettings = { ...state.settings, contentLanguage: idea.contentLanguage || state.settings.contentLanguage || "English" };
      const requestedProvider = req.headers["x-orbit-ai-provider"] || generationSettings.provider;
      const selectedProvider = ["gemini", "openai", "claude"].includes(requestedProvider)
        ? requestedProvider : "gemini";
      const providerSettings = {
        ...generationSettings,
        textModel: TEXT_MODELS[selectedProvider].includes(generationSettings.textModel)
          ? generationSettings.textModel : DEFAULT_TEXT_MODELS[selectedProvider]
      };
      const selectedProviderReady = selectedProvider === "openai" ? Boolean(process.env.OPENAI_API_KEY)
        : selectedProvider === "claude" ? Boolean(process.env.ANTHROPIC_API_KEY)
        : Boolean(process.env.GEMINI_API_KEY);
      if (!selectedProviderReady && !["Turkish", "English"].includes(generationSettings.contentLanguage)) {
        throw new Error(`${generationSettings.contentLanguage} dilinde otomatik taslak için seçtiğin AI sağlayıcısına ait API anahtarını bağla.`);
      }
      const generatedContent = !selectedProviderReady
        ? { ...demoPackage(idea.topic, generationSettings, idea.sources), demo: true }
        : selectedProvider === "openai"
          ? await openAiPackage(idea.topic, idea.sources, {
              ...providerSettings, contentType: idea.contentType || "shorts", creativeAngle: selectedAngle
            }, imageInputs)
          : selectedProvider === "claude"
            ? await claudePackage(idea.topic, idea.sources, {
              ...providerSettings, contentType: idea.contentType || "shorts", creativeAngle: selectedAngle
              }, imageInputs)
            : await geminiPackage(
              idea.topic,
              idea.sources,
              { ...providerSettings, contentType: idea.contentType || "shorts", creativeAngle: selectedAngle },
              creativeContext,
              imageInputs
            );      const production = {
        id: crypto.randomUUID(),
        ideaId: idea.id,
        status: state.settings.rules?.humanApproval === false
          ? "approved" : "review",
        content: generatedContent,
        angle: selectedAngle,
        sourceAsset: idea.sourceAsset || idea.nasaAsset || null,
        visualAssets: idea.sourceAssets || [],
        contentLanguage: generationSettings.contentLanguage,
        contentProfile: state.settings.contentProfile || "general",
        targetAgeGroups: state.settings.targetAgeGroups || [],
        rules: state.settings.rules || {},
        visualStyle: state.settings.visualStyle || "documentary",
        contentType: idea.contentType || "shorts",
        imageFit: idea.imageFit || "cover",
        images: (idea.sourceAssets || (idea.nasaAsset ? [idea.nasaAsset] : [])).map((asset) => asset.previewUrl),
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
            source: "local", sourceLabel: "TERZİ",
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
        voice: EDGE_VOICES[item.contentLanguage] || "en-US-GuyNeural",
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
  console.log(`TERZİ: http://127.0.0.1:${PORT}`);
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
