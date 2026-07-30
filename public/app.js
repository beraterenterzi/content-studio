const $ = (selector) => document.querySelector(selector);
let state = { settings: {}, ideas: [], productions: [] };
let mediaFiles = [];
let activeStep = "dashboard";
let projectFilter = "all";
let creationMode = "visual-story";
const messages = {
  tr: {
    dashboard:["ORBIT STUDIO / GENEL BAKIŞ","İçerik üretim merkezine hoş geldin"],source:["ADIM 1 / KAYNAK","Hikâyenin görselini bul"],story:["ADIM 2 / HİKÂYE","Kaynağı özgün bir hikâyeye dönüştür"],review:["ADIM 3 / İNCELEME","Yayın öncesi son kontrol"],render:["ADIM 4 / VİDEO","Seslendir, birleştir ve izle"],editor:["PROJE DÜZENLEYİCİ","İçeriğini düzenle"],files:["DOSYA KÜTÜPHANESİ","Üretilen dosyaların"],trash:["ÇÖP KUTUSU","Silinen projeler"],
    home:"Ana sayfa",homeSub:"Projeler ve geçmiş",sourceNav:"Kaynak",sourceSub:"NASA + Wikimedia",storyNav:"Hikâye",storySub:"AI senaryo",reviewNav:"İnceleme",reviewSub:"Editör onayı",videoNav:"Video",videoSub:"Ses ve render",
    newProject:"Yeni proje oluştur",projects:"Son projeler",activity:"Aktivite",search:"Arşivde ara",results:"Arşiv sonuçları",edit:"Projeyi düzenle",back:"← Projelere dön",title:"Başlık",hook:"Açılış cümlesi",narration:"Seslendirme metni",save:"Değişiklikleri kaydet",
    total:"Toplam proje",ready:"Hazır video",inReview:"İncelemede",queue:"Render kuyruğu",allTime:"Tüm zamanlar",downloadable:"İndirilebilir",waiting:"Onay bekliyor",productionReady:"Üretime hazır",noProjects:"Henüz proje yok.",noActivity:"Henüz aktivite yok.",saved:"Proje değişiklikleri kaydedildi",edited:"Son düzenleme",settings:"Kanal ayarları kaydedildi",generate:"Hikâyeyi oluştur",approve:"Onayla ve rendera hazırla",reject:"Reddet",renderVideo:"Videoyu şimdi render et",addScene:"＋ Arşivden sahne ekle",newStory:"Yeni hikâye",addProject:"Projeye ekle",noIdeas:"Henüz kaynak seçilmedi.",noReview:"İncelenecek senaryo yok.",noRender:"Onaylanmış üretim yok.",niche:"Kanal nişi",audience:"Hedef kitle",storyModel:"Hikâye modeli",contentLang:"İçerik dili",uiLang:"Arayüz dili",contentProfile:"İçerik profili",visualStyle:"Görsel stil",apiKey:"Gemini anahtarı",saveSettings:"Kaydet",hero:"Bir sonraki hikâyeni uzaydan bul.",heroSub:"Kaynak, senaryo, ses ve video üretimin tek yerde.",sourceHelp:"NASA ve Wikimedia Commons görsellerini metadata, lisans ve kaynak bilgisiyle getir.",storyQueue:"Hikâye kuyruğu",reviewDesk:"Editör masası",videoLab:"Video laboratuvarı",nextStep:"Sonraki adım",reviewHelp:"Metinlerini kontrol edip kaydet, ardından projeyi onayla.",renderHelp:"Proje hazır. Edge seslendirme, altyazı ve 9:16 MP4 oluştur.",readyHelp:"Video hazır. Buradan izleyebilir veya dosyaları indirebilirsin.",staleHelp:"Metin değişti. Güncel videoyu oluşturmak için yeniden render et.",download:"MP4 indir"
  },
  en: {
    dashboard:["ORBIT STUDIO / OVERVIEW","Welcome to your content production center"],source:["STEP 1 / SOURCE","Find visuals for your story"],story:["STEP 2 / STORY","Turn a source into an original story"],review:["STEP 3 / REVIEW","Final check before publishing"],render:["STEP 4 / VIDEO","Narrate, combine and preview"],editor:["PROJECT EDITOR","Edit your content"],files:["FILE LIBRARY","Your generated files"],trash:["TRASH","Deleted projects"],
    home:"Home",homeSub:"Projects and history",sourceNav:"Sources",sourceSub:"NASA + Wikimedia",storyNav:"Story",storySub:"AI script",reviewNav:"Review",reviewSub:"Editorial approval",videoNav:"Video",videoSub:"Voice and render",
    newProject:"Create new project",projects:"Recent projects",activity:"Activity",search:"Search archive",results:"Archive results",edit:"Edit project",back:"← Back to projects",title:"Title",hook:"Opening hook",narration:"Narration script",save:"Save changes",
    total:"Total projects",ready:"Ready videos",inReview:"In review",queue:"Render queue",allTime:"All time",downloadable:"Downloadable",waiting:"Awaiting approval",productionReady:"Ready to produce",noProjects:"No projects yet.",noActivity:"No activity yet.",saved:"Project changes saved",edited:"Last edited",settings:"Channel settings saved",generate:"Generate story",approve:"Approve for rendering",reject:"Reject",renderVideo:"Render video now",addScene:"＋ Add scene from archive",newStory:"New story",addProject:"Add to project",noIdeas:"No source selected yet.",noReview:"No scripts to review.",noRender:"No approved productions.",niche:"Channel niche",audience:"Target audience",storyModel:"Story model",contentLang:"Content language",uiLang:"Interface language",contentProfile:"Content profile",visualStyle:"Visual style",apiKey:"Gemini key",saveSettings:"Save",hero:"Find your next story in space.",heroSub:"Sources, scripts, voice and video production in one place.",sourceHelp:"Browse NASA and Wikimedia Commons with metadata, licensing and attribution.",storyQueue:"Story queue",reviewDesk:"Editorial desk",videoLab:"Video lab",nextStep:"Next step",reviewHelp:"Review and save your copy, then approve the project.",renderHelp:"Project is ready. Create Edge narration, captions and a 9:16 MP4.",readyHelp:"Your video is ready. Preview or download the files here.",staleHelp:"The copy changed. Render again to create an up-to-date video.",download:"Download MP4"
  },
  es: {
    dashboard:["ORBIT STUDIO / RESUMEN","Bienvenido a tu centro de producción"],source:["PASO 1 / FUENTE","Encuentra imágenes para tu historia"],story:["PASO 2 / HISTORIA","Convierte una fuente en una historia original"],review:["PASO 3 / REVISIÓN","Control final antes de publicar"],render:["PASO 4 / VÍDEO","Narra, combina y previsualiza"],editor:["EDITOR DE PROYECTO","Edita tu contenido"],files:["ARCHIVOS","Tus archivos generados"],trash:["PAPELERA","Proyectos eliminados"],
    home:"Inicio",homeSub:"Proyectos e historial",sourceNav:"Fuentes",sourceSub:"NASA + Wikimedia",storyNav:"Historia",storySub:"Guion con IA",reviewNav:"Revisión",reviewSub:"Aprobación editorial",videoNav:"Vídeo",videoSub:"Voz y renderizado",
    newProject:"Crear proyecto",projects:"Proyectos recientes",activity:"Actividad",search:"Buscar en archivo",results:"Resultados del archivo",edit:"Editar proyecto",back:"← Volver a proyectos",title:"Título",hook:"Frase inicial",narration:"Texto de narración",save:"Guardar cambios",
    total:"Proyectos totales",ready:"Vídeos listos",inReview:"En revisión",queue:"Cola de renderizado",allTime:"Todo el tiempo",downloadable:"Descargables",waiting:"Esperando aprobación",productionReady:"Listos para producir",noProjects:"Aún no hay proyectos.",noActivity:"Aún no hay actividad.",saved:"Cambios guardados",edited:"Última edición",settings:"Configuración guardada",generate:"Generar historia",approve:"Aprobar para renderizar",reject:"Rechazar",renderVideo:"Renderizar vídeo ahora",addScene:"＋ Añadir escena del archivo",newStory:"Nueva historia",addProject:"Añadir al proyecto",noIdeas:"Aún no hay fuente seleccionada.",noReview:"No hay guiones para revisar.",noRender:"No hay producciones aprobadas.",niche:"Nicho del canal",audience:"Público objetivo",storyModel:"Modelo de historia",contentLang:"Idioma del contenido",uiLang:"Idioma de interfaz",contentProfile:"Perfil de contenido",visualStyle:"Estilo visual",apiKey:"Clave de Gemini",saveSettings:"Guardar",hero:"Encuentra tu próxima historia en el espacio.",heroSub:"Fuentes, guiones, voz y vídeo en un solo lugar.",sourceHelp:"Explora NASA y Wikimedia Commons con metadatos, licencia y atribución.",storyQueue:"Cola de historias",reviewDesk:"Mesa editorial",videoLab:"Laboratorio de vídeo",nextStep:"Siguiente paso",reviewHelp:"Revisa y guarda el texto; después aprueba el proyecto.",renderHelp:"El proyecto está listo. Crea narración, subtítulos y MP4 vertical.",readyHelp:"El vídeo está listo. Puedes verlo o descargarlo aquí.",staleHelp:"El texto cambió. Vuelve a renderizar para actualizar el vídeo.",download:"Descargar MP4"
  }
};
const lang = () => state.settings?.uiLanguage || "tr";
const t = (key) => messages[lang()]?.[key] ?? messages.tr[key] ?? key;
const stepMeta = new Proxy({}, { get: (_, key) => {
  if (key === "dashboard") {
    return {
      tr: ["ORBIT STUDIO / GENEL BAKIŞ", "Fikirlerin harekete geçsin."],
      en: ["ORBIT STUDIO / OVERVIEW", "Put your ideas in motion."],
      es: ["ORBIT STUDIO / RESUMEN", "Pon tus ideas en movimiento."]
    }[lang()];
  }
  return t(key);
} });

function localizeStatic() {
  document.documentElement.lang = lang();
  const workflow = [...document.querySelectorAll(".workflow-step")];
  [["sourceNav","sourceSub"],["storyNav","storySub"],["reviewNav","reviewSub"],["videoNav","videoSub"]].forEach((keys,index) => {
    const span = workflow[index]?.querySelector("span"); if (!span) return;
    span.childNodes[0].nodeValue = t(keys[0]); span.querySelector("small").textContent = t(keys[1]);
  });
  const home = document.querySelector("[data-step=dashboard] span");
  home.childNodes[0].nodeValue = t("home");
  home.querySelector("small").textContent = t("homeSub");
  document.querySelectorAll("[data-go-step=source]").forEach((node) => {
    if (node.closest(".dashboard-hero")) node.textContent = t("newProject");
  });
  $(".view[data-view=dashboard] .section-head h2").textContent = t("projects");
  $(".view[data-view=dashboard] aside .section-head h2").textContent = t("activity");
  $("#nasa-form button").textContent = t("search");
  $(".view[data-view=source] .section-head h2").textContent = t("results");
  $("#editor-back").textContent = t("back");
  $("#editor-heading").textContent = t("edit");
  const labels = $("#project-editor").querySelectorAll("label");
  [t("title"),t("hook"),t("narration")].forEach((value,index) => labels[index].childNodes[0].nodeValue = value);
  $("#project-editor button[type=submit]").textContent = t("save");
  $("#save-settings").textContent = t("saveSettings");
  $(".dashboard-hero h2").innerHTML = esc(t("hero"));
  $(".dashboard-hero p").textContent = t("heroSub");
  $(".hero-search>p").textContent = t("sourceHelp");
  $(".view[data-view=story] .section-head h2").textContent = t("storyQueue");
  $(".view[data-view=review] .section-head h2").textContent = t("reviewDesk");
  $(".view[data-view=render] .section-head h2").textContent = t("videoLab");
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function renderFileLibrary() {
  $("#file-count").textContent = `${mediaFiles.length} dosya`;
  $("#file-library").classList.toggle("empty-state", !mediaFiles.length);
  $("#file-library").innerHTML = mediaFiles.length ? mediaFiles.map((file) => `
    <article class="file-row">
      <span class="file-type ${file.type.toLowerCase()}">${file.type}</span>
      <div><h3>${esc(file.projectTitle)}</h3><p>${esc(file.name)} · ${formatBytes(file.size)}${file.trashed ? " · Çöp kutusunda" : ""}</p></div>
      <time>${formatDate(file.modifiedAt, true)}</time>
      <a href="${file.url}">İndir ↓</a>
    </article>`).join("") : "Henüz üretilmiş dosya yok.";
  const trash = state.trash || [];
  $("#trash-list").classList.toggle("empty-state", !trash.length);
  $("#trash-list").innerHTML = trash.length ? trash.map((item) => `
    <article class="project-row">
      <img src="${item.sourceAsset?.previewUrl || ""}" alt="">
      <div class="project-main"><h3>${esc(item.content?.title)}</h3><p>${formatDate(item.deletedAt, true)}</p></div>
      <span class="project-status failed">Silindi</span>
      <button class="restore-button" data-restore="${item.id}">Geri yükle</button>
    </article>`).join("") : "Çöp kutusu boş.";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "İşlem başarısız");
  return result;
}
function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}
function toast(message, type = "ok") {
  const node = $("#toast");
  node.textContent = message;
  node.dataset.type = type;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 3200);
}
function showStep(step) {
  activeStep = step;
  const isWorkflow = ["source", "story", "review", "render"].includes(step);
  $("#workflow-nav")?.classList.toggle("open", isWorkflow);
  $("#workflow-toggle")?.classList.toggle("open", isWorkflow);
  document.querySelectorAll(".nav-step").forEach((node) =>
    node.classList.toggle("active", node.dataset.step === step));
  document.querySelectorAll(".view").forEach((node) =>
    node.classList.toggle("active", node.dataset.view === step));
  const projectMeta = {
    tr: ["PROJE KÜTÜPHANESİ", "Tüm projelerin"],
    en: ["PROJECT LIBRARY", "All your projects"],
    es: ["BIBLIOTECA DE PROYECTOS", "Todos tus proyectos"]
  };
  const meta = step === "projects" ? projectMeta[lang()] : stepMeta[step];
  $("#step-kicker").textContent = meta[0];
  $("#step-title").textContent = meta[1];
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function sourceFigure(item) {
  if (!item.sourceAsset?.previewUrl) return "";
  return `<figure class="source-preview"><img src="${item.sourceAsset.previewUrl}" alt="${esc(item.sourceAsset.title)}"><figcaption><span>${esc(item.sourceAsset.sourceLabel || "NASA")} • ${esc(item.sourceAsset.assetId || item.sourceAsset.nasaId)}</span><a href="${item.sourceAsset.sourcePage}" target="_blank" rel="noreferrer">Kaynağı aç ↗</a></figcaption></figure>`;
}
function formatDate(value, withTime = false) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(value));
}
function projectStatus(item) {
  if (item.render?.status === "ready") return ["Video hazır", "ready"];
  if (item.render?.status === "processing") return ["Render alınıyor", "processing"];
  if (item.render?.status === "failed") return ["Render hatası", "failed"];
  if (item.status === "approved") return ["Render bekliyor", "approved"];
  if (item.status === "review") return ["İnceleme bekliyor", "review"];
  return [item.status || "Yeni", "new"];
}
function renderDashboard() {
  const completed = state.productions.filter((item) => item.render?.status === "ready").length;
  const review = state.productions.filter((item) => item.status === "review").length;
  const approved = state.productions.filter((item) => item.status === "approved" && item.render?.status !== "ready").length;
  $("#dashboard-stats").innerHTML = [
    [t("total"), state.productions.length, t("allTime"), "◫"],
    [t("ready"), completed, t("downloadable"), "▶"],
    [t("inReview"), review, t("waiting"), "✓"],
    [t("queue"), approved, t("productionReady"), "↗"]
  ].map(([label, value, detail, icon]) => `<article class="stat-card"><div class="stat-icon">${icon}</div><div><span>${label}</span><strong>${value}</strong><small>${detail}</small></div></article>`).join("");

  const recent = [...state.productions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  $("#recent-projects").classList.toggle("empty-state", !recent.length);
  $("#recent-projects").innerHTML = recent.length ? recent.map((item) => {
    const [label, className] = projectStatus(item);
    return `<article class="project-row" data-open-project="${item.id}">
      <img src="${item.sourceAsset?.previewUrl || ""}" alt="${esc(item.content?.title)}">
      <div class="project-main"><h3>${esc(item.content?.title || "Adsız proje")}</h3><p>NASA ${esc(item.sourceAsset?.nasaId || "—")} • ${esc(item.content?.model || item.content?.mode || "Manuel")}</p></div>
      <span class="project-status ${className}">${label}</span>
      <time>${formatDate(item.createdAt, true)}</time>
      <button class="row-action" data-open-project="${item.id}">→</button>
    </article>`;
  }).join("") : t("noProjects");

  const events = [
    ...state.productions.map((item) => ({
      date: item.createdAt, type: "story",
      text: `"${item.content?.title || "Proje"}" hikâyesi oluşturuldu`
    })),
    ...state.productions.filter((item) => item.reviewedAt).map((item) => ({
      date: item.reviewedAt, type: item.status === "approved" ? "approve" : "reject",
      text: `"${item.content?.title || "Proje"}" ${item.status === "approved" ? "onaylandı" : "reddedildi"}`
    })),
    ...state.productions.filter((item) => item.render?.completedAt).map((item) => ({
      date: item.render.completedAt, type: "video",
      text: `"${item.content?.title || "Proje"}" videosu hazırlandı`
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  $("#activity-timeline").classList.toggle("empty-state", !events.length);
  $("#activity-timeline").innerHTML = events.length ? events.map((event) =>
    `<div class="timeline-item"><span class="${event.type}"></span><div><p>${esc(event.text)}</p><time>${formatDate(event.date, true)}</time></div></div>`
  ).join("") : t("noActivity");
}
function renderProjects() {
  const projects = [...state.productions]
    .filter((item) => {
      if (projectFilter === "all") return true;
      if (projectFilter === "ready") return item.render?.status === "ready";
      if (projectFilter === "approved") {
        return item.status === "approved" && item.render?.status !== "ready";
      }
      return item.status === projectFilter;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  $("#all-projects").classList.toggle("empty-state", !projects.length);
  $("#all-projects").innerHTML = projects.length ? projects.map((item) => {
    const [status, className] = projectStatus(item);
    const imageCount = item.visualAssets?.length || item.images?.length || 1;
    return `<article class="project-card">
      <img src="${item.sourceAsset?.previewUrl || item.visualAssets?.[0]?.previewUrl || ""}" alt="${esc(item.content?.title)}">
      <div class="project-card-copy">
        <div class="meta-row"><span class="project-status ${className}">${status}</span><time>${formatDate(item.updatedAt || item.createdAt, true)}</time></div>
        <h3>${esc(item.content?.title || "Adsız proje")}</h3>
        <p>${imageCount} görsel · ${esc(item.contentLanguage || "English")} · ${esc(item.visualStyle || "documentary")}</p>
        <div class="project-card-actions">
          <button class="primary" data-open-project="${item.id}">Düzenle / devam et</button>
          <button class="ghost danger" data-delete-card="${item.id}">Sil</button>
        </div>
      </div>
    </article>`;
  }).join("") : "Bu filtrede proje bulunamadı.";
}
function openEditor(id) {
  const item = state.productions.find((entry) => entry.id === id);
  if (!item) return;
  $("#editor-id").value = item.id;
  $("#editor-title").value = item.content?.title || "";
  $("#editor-hook").value = item.content?.hook || "";
  $("#editor-narration").value = item.content?.narration || "";
  $("#editor-updated").textContent = item.updatedAt
    ? `${t("edited")}: ${formatDate(item.updatedAt, true)}` : "";
  const assets = item.visualAssets?.length ? item.visualAssets
    : (item.sourceAsset ? [item.sourceAsset] : []);
  $("#editor-assets").innerHTML = assets.map((asset, index) =>
    `<figure><img src="${asset.previewUrl}" alt="${esc(asset.title)}"><figcaption>${index + 1}. ${esc(asset.sourceLabel || "NASA")} · ${esc(asset.license || "")}</figcaption></figure>`
  ).join("");
  renderEditorNext(item);
  showStep("editor");
}
function renderEditorNext(item) {
  const isReady = item.render?.status === "ready";
  const needsRender = item.status === "approved" && !isReady;
  const help = isReady ? t("readyHelp")
    : item.render?.status === "stale" ? t("staleHelp")
    : needsRender ? t("renderHelp") : t("reviewHelp");
  let action = `<button class="primary large" data-editor-approve="${item.id}">${t("approve")} →</button>`;
  if (needsRender) {
    action = `<button class="primary large" data-editor-render="${item.id}">${t("renderVideo")} ▶</button>`;
  }
  if (isReady) {
    action = `<div class="editor-ready-actions"><a class="primary-link" href="${item.render.videoUrl}?download=1">${t("download")}</a><a href="${item.render.audioUrl}?download=1">MP3</a><a href="${item.render.captionsUrl}?download=1">SRT</a>${item.render.creditsUrl ? `<a href="${item.render.creditsUrl}?download=1">Credits</a>` : ""}</div>`;
  }
  $("#editor-next").innerHTML = `<div><span>${t("nextStep")}</span><h3>${help}</h3>${action}</div>
    ${isReady ? `<video controls playsinline src="${item.render.videoUrl}"></video>` : ""}`;
}
function renderState() {
  $("#niche").value = state.settings.niche || "";
  $("#audience").value = state.settings.audience || "";
  $("#provider").value = state.settings.provider || "gemini";
  updateModelChoices(state.settings.textModel);
  $("#content-language").value = state.settings.contentLanguage || "English";
  $("#ui-language").value = state.settings.uiLanguage || "tr";
  $("#content-profile").value = state.settings.contentProfile || "general";
  $("#visual-style").value = state.settings.visualStyle || "documentary";
  const selectedAges = state.settings.targetAgeGroups || [];
  document.querySelectorAll("#age-groups input").forEach((input) => {
    input.checked = selectedAges.includes(input.value);
  });
  const rules = state.settings.rules || {};
  $("#rule-approval").checked = rules.humanApproval !== false;
  $("#rule-child-safe").checked = Boolean(rules.childSafe);
  $("#rule-factual").checked = rules.factualOnly !== false;
  $("#rule-cta").checked = Boolean(rules.includeCta);
  $("#rule-captions").checked = rules.burnCaptions !== false;
  $("#kids-search-hints").classList.toggle("hidden", state.settings.contentProfile !== "kids");
  $("#cloudflare-account").value = state.runtime?.cloudflareAccountId || "";
  updateIntegrationForm();
  renderDashboard();
  renderProjects();
  renderFileLibrary();
  localizeStatic();
  const imageProjects = state.productions.filter((item) => item.status === "approved");
  $("#multi-image-toolbar").classList.toggle("hidden", !imageProjects.length);
  $("#image-project").innerHTML = imageProjects.map((item) =>
    `<option value="${item.id}">${esc(item.content?.title || "Adsız proje")}</option>`
  ).join("");

  $("#ideas").classList.toggle("empty-state", !state.ideas.length);
  $("#ideas").innerHTML = state.ideas.length ? state.ideas.map((idea) => `
    <article class="studio-card split-card">
      <img class="queue-image" src="${idea.sourceAsset?.previewUrl || idea.nasaAsset?.previewUrl || ""}" alt="${esc(idea.topic)}">
      <div class="card-body">
        <div class="meta-row"><span class="pill">${esc(idea.sourceAsset?.sourceLabel || "NASA")} ${esc(idea.sourceAsset?.assetId || idea.nasaAsset?.nasaId)}</span><span>${(idea.sourceAsset?.dateCreated || idea.nasaAsset?.dateCreated || "").slice(0,10)}</span></div>
        <h3>${esc(idea.topic)}</h3>
        <p>${esc(idea.sourceAsset?.description || idea.nasaAsset?.description).slice(0,260)}…</p>
        <button class="primary" data-generate="${idea.id}">${t("generate")} <span>→</span></button>
      </div>
    </article>`).join("") : t("noIdeas");

  const review = state.productions.filter((item) => item.status === "review");
  $("#productions-review").classList.toggle("empty-state", !review.length);
  $("#productions-review").innerHTML = review.length ? review.map((item) => `
    <article class="studio-card review-card">
      ${sourceFigure(item)}
      <div class="script-pane">
        <div class="meta-row"><span class="pill accent">${esc(item.content.model || item.content.mode)}</span><span>≈ ${Math.max(20, Math.round((item.content.narration || "").length / 14))} sn</span></div>
        <h3>${esc(item.content.title)}</h3>
        <blockquote>${esc(item.content.hook)}</blockquote>
        <div class="script-text">${esc(item.content.narration)}</div>
        <div class="button-row"><button class="primary" data-review="approve" data-id="${item.id}">${t("approve")}</button><button class="ghost danger" data-review="reject" data-id="${item.id}">${t("reject")}</button></div>
      </div>
    </article>`).join("") : t("noReview");

  const ready = state.productions.filter((item) => item.status === "approved");
  $("#productions-render").classList.toggle("empty-state", !ready.length);
  $("#productions-render").innerHTML = ready.length ? ready.map((item) => `
    <article class="studio-card render-card">
      <div class="render-copy">
        <div class="meta-row"><span class="pill success">ONAYLANDI</span><span>tr-TR-AhmetNeural</span></div>
        <h3>${esc(item.content.title)}</h3>
        <p>${(item.visualAssets?.length || item.images?.length || 1)} NASA image${(item.visualAssets?.length || item.images?.length || 1) > 1 ? "s" : ""} + English Edge narration + captions + 9:16 video</p>
        <div class="scene-strip">${(item.visualAssets?.length ? item.visualAssets : [item.sourceAsset]).filter(Boolean).map((asset, index, assets) => `
          <div class="scene-thumb"><img src="${asset.previewUrl}" alt="${esc(asset.title)}"><b>${index + 1}</b>
          ${assets.length > 1 ? `<button title="Görseli kaldır" data-remove-image="${asset.assetId || asset.nasaId}" data-id="${item.id}">×</button>` : ""}</div>
        `).join("")}</div>
        <button class="ghost add-scene" data-add-scene="${item.id}">${t("addScene")}</button>
        ${item.render?.status === "ready" ? `<div class="downloads"><a href="${item.render.videoUrl}?download=1">MP4</a><a href="${item.render.audioUrl}?download=1">MP3</a><a href="${item.render.captionsUrl}?download=1">SRT</a>${item.render.creditsUrl ? `<a href="${item.render.creditsUrl}?download=1">Credits</a>` : ""}</div>` : `<button class="primary large" data-render="${item.id}">${t("renderVideo")} <span>▶</span></button>`}
        ${item.render?.status === "failed" ? `<p class="error-box">${esc(item.render.error)}</p>` : ""}
      </div>
      <div class="phone-frame ${item.contentType === "youtube" ? "landscape-frame" : ""}">
        ${item.render?.status === "ready" ? `<video controls playsinline src="${item.render.videoUrl}"></video>` : `<img src="${item.sourceAsset?.previewUrl || ""}" alt="${esc(item.content.title)}"><div class="play-hint">Video burada görünecek</div>`}
      </div>
    </article>`).join("") : t("noRender");
  updateSourceMode();
}
async function refresh() {
  const [nextState, filesResult] = await Promise.all([api("/api/state"), api("/api/files")]);
  state = nextState;
  mediaFiles = filesResult.files || [];
  renderState();
}
function updateSourceMode() {
  const source = $("#media-source").value;
  const cloudflare = source === "cloudflare";
  const custom = source === "custom";
  $("#nasa-query").classList.toggle("hidden", custom);
  $("#nasa-query").disabled = custom;
  $("#custom-image-file").classList.toggle("hidden", !custom);
  $("#custom-image-file").required = custom;
  $("#nasa-query").placeholder = cloudflare
    ? "Örn: friendly cartoon robot explaining the solar system"
    : "Mars, Webb, Ay, Dünya…";
  $("#nasa-query").value = cloudflare && $("#nasa-query").value === "Mars"
    ? "" : $("#nasa-query").value;
  $("#nasa-form button").textContent = custom
    ? "Görseli projeye ekle" : cloudflare ? "AI görsel üret" : t("search");
  $(".hero-search>p").textContent = custom
    ? "Sana ait veya kullanım iznin bulunan JPG, PNG ya da WebP görselini seçili projeye yükle."
    : cloudflare
      ? "Promptunu FLUX.1 Schnell ile özgün bir 9:16 sahneye dönüştür ve seçili projeye ekle."
      : t("sourceHelp");
  $("#kids-search-hints").classList.toggle(
    "hidden", cloudflare || custom || state.settings.contentProfile !== "kids"
  );
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Görsel okunamadı"));
    reader.readAsDataURL(file);
  });
}
function setCreationMode(mode) {
  creationMode = mode === "story-visual" ? "story-visual" : "visual-story";
  document.querySelectorAll("[data-creation-mode]").forEach((button) =>
    button.classList.toggle("active", button.dataset.creationMode === creationMode)
  );
  $("#visual-story-mode").classList.toggle("hidden", creationMode !== "visual-story");
  $("#story-visual-mode").classList.toggle("hidden", creationMode !== "story-visual");
}
function updateFormatNote() {
  const format = $("#production-format").value;
  $("#format-note").textContent = format === "youtube"
    ? "Yatay 16:9 video. Uzun senaryo ve süre metne göre otomatik oluşturulur."
    : format === "reels"
      ? "Dikey 9:16 Reels. Süre seslendirme metnine göre otomatik belirlenir."
      : "Dikey 9:16 Shorts. Süre seslendirme metnine göre otomatik belirlenir.";
}

document.querySelectorAll(".nav-step").forEach((button) =>
  button.addEventListener("click", () => showStep(button.dataset.step)));
$("#workflow-toggle").addEventListener("click", () => {
  $("#workflow-nav").classList.toggle("open");
  $("#workflow-toggle").classList.toggle("open");
});
$("#settings-toggle").addEventListener("click", () =>
  $("#settings-panel").classList.toggle("hidden"));
document.querySelectorAll("[data-settings-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-settings-tab]").forEach((node) =>
      node.classList.toggle("active", node === button));
    document.querySelectorAll("[data-settings-pane]").forEach((pane) =>
      pane.classList.toggle("active", pane.dataset.settingsPane === button.dataset.settingsTab));
  }));
const modelCatalog = {
  gemini: [
    ["gemini-3.6-flash", "Gemini 3.6 Flash"],
    ["gemini-3.5-flash-lite", "Gemini 3.5 Flash Lite"],
    ["gemini-2.5-flash", "Gemini 2.5 Flash"]
  ],
  openai: [
    ["gpt-5.6-luna", "GPT-5.6 Luna · ekonomik"],
    ["gpt-5.6-terra", "GPT-5.6 Terra · dengeli"],
    ["gpt-5.6-sol", "GPT-5.6 Sol · en güçlü"]
  ],
  claude: [
    ["claude-haiku-4-5", "Claude Haiku 4.5 · hızlı"],
    ["claude-sonnet-5", "Claude Sonnet 5 · dengeli"],
    ["claude-opus-4-8", "Claude Opus 4.8 · güçlü"],
    ["claude-fable-5", "Claude Fable 5 · en güçlü"]
  ]
};
function updateModelChoices(preferred) {
  const provider = $("#provider").value;
  const models = modelCatalog[provider] || modelCatalog.gemini;
  $("#text-model").innerHTML = models.map(([value, label]) =>
    `<option value="${value}">${label}</option>`).join("");
  const defaultIndex = provider === "openai" || provider === "claude" ? 1 : 0;
  $("#text-model").value = models.some(([value]) => value === preferred)
    ? preferred : models[defaultIndex][0];
}
$("#provider").addEventListener("change", () => updateModelChoices());
const integrationCatalog = {
  gemini: {
    name: "Google Gemini", label: "Gemini API anahtarı",
    runtimeKey: "geminiConfigured", help: "Hikâye ve metin üretimi için kullanılır."
  },
  openai: {
    name: "OpenAI", label: "OpenAI API anahtarı",
    runtimeKey: "openAiConfigured", help: "Seçtiğin GPT modeliyle içerik üretir."
  },
  anthropic: {
    name: "Anthropic Claude", label: "Claude API anahtarı",
    runtimeKey: "anthropicConfigured", help: "Seçtiğin Claude modeliyle içerik üretir."
  },
  cloudflare: {
    name: "Cloudflare Workers AI", label: "Cloudflare API Token",
    runtimeKey: "cloudflareConfigured", help: "AI görsellerini üretmek için kullanılır."
  }
};
function updateIntegrationForm() {
  const selected = $("#integration-provider").value;
  const config = integrationCatalog[selected];
  const configured = Boolean(state.runtime?.[config.runtimeKey]);
  $("#integration-name").textContent = config.name;
  $("#integration-key-label").textContent = config.label;
  $("#integration-help").textContent = config.help;
  $("#integration-status").textContent = configured ? "• hazır" : "• eksik";
  $("#integration-status").className = configured ? "configured" : "missing";
  $("#integration-key").value = "";
  $("#integration-key").placeholder = configured
    ? "••••••••••••  kayıtlı — değiştirmek için gir"
    : `${config.label} gir`;
  $("#cloudflare-account-field").classList.toggle("hidden", selected !== "cloudflare");
}
$("#integration-provider").addEventListener("change", updateIntegrationForm);
$("#save-settings").addEventListener("click", async () => {
  const integrationProvider = $("#integration-provider").value;
  const integrationKey = $("#integration-key").value.trim();
  const cloudflareAccount = $("#cloudflare-account").value.trim();
  if (integrationKey && integrationProvider === "gemini") {
    await api("/api/config/gemini-key", {
      method: "PUT",
      body: JSON.stringify({ key: integrationKey })
    });
  }
  if (integrationKey && ["openai", "anthropic"].includes(integrationProvider)) {
    await api(`/api/config/${integrationProvider}-key`, {
      method: "PUT", body: JSON.stringify({ key: integrationKey })
    });
  }
  if (integrationKey && integrationProvider === "cloudflare") {
    if (!cloudflareAccount) {
      throw new Error("Cloudflare Account ID gerekli");
    }
    await api("/api/config/cloudflare", {
      method: "PUT",
      body: JSON.stringify({ accountId: cloudflareAccount, token: integrationKey })
    });
  }
  $("#integration-key").value = "";
  await api("/api/settings", { method: "PUT", body: JSON.stringify({
    niche: $("#niche").value, audience: $("#audience").value,
    provider: $("#provider").value,
    textModel: $("#text-model").value,
    contentLanguage: $("#content-language").value,
    uiLanguage: $("#ui-language").value,
    contentProfile: $("#content-profile").value,
    visualStyle: $("#visual-style").value,
    targetAgeGroups: [...document.querySelectorAll("#age-groups input:checked")]
      .map((input) => input.value),
    rules: {
      humanApproval: $("#rule-approval").checked,
      childSafe: $("#rule-child-safe").checked,
      factualOnly: $("#rule-factual").checked,
      includeCta: $("#rule-cta").checked,
      burnCaptions: $("#rule-captions").checked
    },
    targetSeconds: 45
  })});
  $("#settings-panel").classList.add("hidden");
  await refresh(); showStep(activeStep); toast(t("settings"));
});
$("#ui-language").addEventListener("change", () => {
  state.settings.uiLanguage = $("#ui-language").value;
  renderState(); showStep(activeStep);
});
$("#media-source").addEventListener("change", updateSourceMode);
$("#production-format").addEventListener("change", updateFormatNote);
document.querySelectorAll("[data-creation-mode]").forEach((button) =>
  button.addEventListener("click", () => setCreationMode(button.dataset.creationMode)));
$("#content-profile").addEventListener("change", () => {
  const kids = $("#content-profile").value === "kids";
  $("#kids-search-hints").classList.toggle("hidden", !kids);
  if (kids && !$("#audience").value.match(/6-11|çocuk|child/i)) {
    $("#audience").value = "Children ages 6-11 and their parents";
  }
  updateSourceMode();
});
$("#editor-back").addEventListener("click", () => showStep("dashboard"));
$("#delete-project").addEventListener("click", async () => {
  const id = $("#editor-id").value;
  const item = state.productions.find((entry) => entry.id === id);
  if (!item || !window.confirm(`"${item.content?.title}" projesi çöp kutusuna taşınsın mı?`)) return;
  await api(`/api/productions/${id}`, { method: "DELETE" });
  await refresh();
  showStep("dashboard");
  toast("Proje çöp kutusuna taşındı", "warn");
});
$("#generate-ai-scenes").addEventListener("click", async () => {
  const id = $("#editor-id").value;
  const item = state.productions.find((entry) => entry.id === id);
  if (item?.status !== "approved") {
    toast("Önce projeyi onayla", "warn");
    return;
  }
  const button = $("#generate-ai-scenes");
  button.disabled = true;
  button.textContent = "FLUX sahneleri üretiyor…";
  try {
    await api(`/api/productions/${id}/images`, { method: "POST" });
    await refresh();
    openEditor(id);
    toast("Yeni AI sahneleri projeye eklendi");
  } finally {
    button.disabled = false;
    button.textContent = "✦ Cloudflare FLUX ile animasyon sahnesi üret";
  }
});
$("#project-editor").addEventListener("submit", async (event) => {
  event.preventDefault();
  await api(`/api/productions/${$("#editor-id").value}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: $("#editor-title").value,
      hook: $("#editor-hook").value,
      narration: $("#editor-narration").value
    })
  });
  await refresh();
  openEditor($("#editor-id").value);
  toast(t("saved"));
});
$("#story-visual-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Proje ve sahneler hazırlanıyor…";
  try {
    const production = await api("/api/projects/from-story", {
      method: "POST",
      body: JSON.stringify({
        title: $("#story-project-title").value,
        narration: $("#story-project-text").value,
        visualStyle: $("#story-visual-style").value,
        contentProfile: $("#story-content-profile").value,
        contentType: $("#production-format").value,
        imageFit: $("#image-fit").value
      })
    });
    await refresh();
    openEditor(production.id);
    toast("Hikâye sahnelere bölündü; şimdi FLUX görsellerini üretebilirsin");
  } finally {
    button.disabled = false;
    button.innerHTML = "Projeyi ve sahneleri oluştur <span>→</span>";
  }
});
$("#nasa-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const container = $("#nasa-results");
  container.className = "media-grid loading";
  const source = $("#media-source").value;
  if (source === "custom") {
    try {
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje seç");
      const file = $("#custom-image-file").files[0];
      if (!file) throw new Error("Yüklenecek görseli seç");
      if (file.size > 10 * 1024 * 1024) throw new Error("Görsel en fazla 10 MB olabilir");
      container.innerHTML = "<div class='loader'></div><p>Görsel projeye yükleniyor…</p>";
      const result = await api(`/api/productions/${productionId}/custom-image`, {
        method: "POST",
        body: JSON.stringify({ name: file.name, dataUrl: await readAsDataUrl(file) })
      });
      await refresh();
      container.className = "media-grid";
      container.innerHTML = `<article class="media-card generated-result">
        <div class="media-image"><img src="${result.asset.previewUrl}" alt="${esc(result.asset.title)}"><span>Kendi görselim</span></div>
        <div class="media-copy"><small>USER UPLOAD</small><h3>${esc(result.asset.title)}</h3><p class="safe">✓ Seçili projeye sahne olarak eklendi</p>
          <div class="generated-actions"><button class="primary" data-open-project="${productionId}">Projeyi aç ve devam et →</button><button class="secondary-action" data-upload-another>＋ Başka görsel yükle</button></div>
        </div>
      </article>`;
      $("#custom-image-file").value = "";
      toast("Görsel projeye eklendi");
    } catch (error) {
      container.className = "media-grid empty-state";
      container.textContent = error.message;
    }
    return;
  }
  if (source === "cloudflare") {
    try {
      if (!state.runtime?.cloudflareConfigured) {
        throw new Error("Önce ayarlardan Cloudflare Account ID ve API Token kaydet");
      }
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje oluştur");
      container.innerHTML = "<div class='loader'></div><p>Cloudflare FLUX görseli üretiyor…</p>";
      const result = await api(`/api/productions/${productionId}/cloudflare-image`, {
        method: "POST", body: JSON.stringify({ prompt: $("#nasa-query").value })
      });
      await refresh();
      container.className = "media-grid";
      container.innerHTML = `<article class="media-card generated-result">
        <div class="media-image"><img src="${result.asset.previewUrl}" alt="${esc(result.asset.title)}"><span>Cloudflare FLUX</span></div>
        <div class="media-copy"><small>AI GENERATED</small><h3>${esc(result.asset.title)}</h3><p class="safe">✓ Seçili projeye sahne olarak eklendi</p>
          <div class="generated-actions">
            <button class="primary" data-open-project="${productionId}">Projeyi aç ve devam et <span>→</span></button>
            <button class="secondary-action" data-generate-another>＋ Bir görsel daha üret</button>
          </div>
        </div>
      </article>`;
      $("#result-count").textContent = "1 görsel üretildi";
      toast("FLUX görseli projeye eklendi");
    } catch (error) {
      container.className = "media-grid empty-state";
      container.textContent = error.message;
    }
    return;
  }
  container.innerHTML = `<div class='loader'></div><p>${source === "wikimedia" ? "Wikimedia Commons" : "NASA"} arşivi taranıyor…</p>`;
  try {
    const result = await api(`/api/media/search?source=${source}&q=${encodeURIComponent($("#nasa-query").value)}`);
    $("#result-count").textContent = `${result.items.length} sonuç`;
    container.className = "media-grid";
    container.innerHTML = result.items.map((item) => `
      <article class="media-card">
        <div class="media-image"><img src="${item.previewUrl}" alt="${esc(item.title)}" loading="lazy"><span>${esc(item.sourceLabel)}</span></div>
        <div class="media-copy"><small>${esc(item.license || item.assetId)}</small><h3>${esc(item.title)}</h3>
        ${item.riskFlags.length ? `<p class="risk">⚠ ${esc(item.riskFlags[0])}</p>` : `<p class="safe">✓ Belirgin kullanım riski yok</p>`}
        <div class="media-actions">
          <button data-media-import="${item.assetId}" data-source="${item.source}">${t("newStory")} <span>→</span></button>
          ${state.productions.some((entry) => entry.status === "approved")
            ? `<button class="secondary-action" data-media-add="${item.assetId}" data-source="${item.source}">${t("addProject")} <span>＋</span></button>`
            : ""}
        </div></div>
      </article>`).join("");
  } catch (error) {
    container.className = "media-grid empty-state";
    container.textContent = error.message;
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button,[data-open-project]");
  if (!target) return;
  try {
    if (target.dataset.goStep) {
      showStep(target.dataset.goStep);
      return;
    }
    if (target.dataset.searchHint) {
      $("#media-source").value = "wikimedia";
      $("#nasa-query").value = target.dataset.searchHint;
      $("#nasa-form").requestSubmit();
      return;
    }
    if (target.dataset.projectFilter) {
      projectFilter = target.dataset.projectFilter;
      document.querySelectorAll("[data-project-filter]").forEach((button) =>
        button.classList.toggle("active", button.dataset.projectFilter === projectFilter)
      );
      renderProjects();
      return;
    }
    if (target.dataset.deleteCard) {
      const item = state.productions.find((entry) => entry.id === target.dataset.deleteCard);
      if (!item || !window.confirm(`"${item.content?.title}" projesi çöp kutusuna taşınsın mı?`)) return;
      await api(`/api/productions/${item.id}`, { method: "DELETE" });
      await refresh();
      toast("Proje çöp kutusuna taşındı", "warn");
      return;
    }
    if (target.dataset.restore) {
      await api(`/api/trash/${target.dataset.restore}/restore`, { method: "POST" });
      await refresh();
      showStep("dashboard");
      toast("Proje geri yüklendi");
      return;
    }
    if (target.hasAttribute("data-generate-another")) {
      $("#nasa-query").value = "";
      $("#nasa-query").focus();
      $("#nasa-results").className = "media-grid empty-state";
      $("#nasa-results").textContent = "Yeni sahneyi tarif et ve AI görsel üret düğmesine bas.";
      return;
    }
    if (target.hasAttribute("data-upload-another")) {
      $("#custom-image-file").value = "";
      $("#custom-image-file").click();
      return;
    }
    if (target.dataset.openProject) {
      openEditor(target.dataset.openProject);
      return;
    }
    if (target.dataset.editorApprove) {
      await api(`/api/productions/${target.dataset.editorApprove}/approve`, { method: "POST" });
      await refresh(); openEditor(target.dataset.editorApprove);
      toast(t("productionReady"));
      return;
    }
    if (target.dataset.editorRender) {
      target.disabled = true;
      target.textContent = "Rendering…";
      await api(`/api/productions/${target.dataset.editorRender}/render`, { method: "POST" });
      await refresh(); openEditor(target.dataset.editorRender);
      toast(t("ready"));
      return;
    }
    if (target.dataset.mediaImport) {
      target.disabled = true; target.textContent = "Kuyruğa ekleniyor…";
      await api("/api/media/import", { method: "POST", body: JSON.stringify({
        assetId: target.dataset.mediaImport, source: target.dataset.source,
        contentType: $("#production-format").value,
        imageFit: $("#image-fit").value
      }) });
      await refresh(); showStep("story"); toast("Kaynak hikâye kuyruğuna eklendi");
    }
    if (target.dataset.mediaAdd) {
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje seç");
      await api(`/api/productions/${productionId}/images`, {
        method: "PUT", body: JSON.stringify({
          assetId: target.dataset.mediaAdd, source: target.dataset.source
        })
      });
      await refresh(); toast("Görsel projeye sahne olarak eklendi");
    }
    if (target.dataset.addScene) {
      showStep("source");
      await new Promise((resolve) => setTimeout(resolve, 0));
      $("#image-project").value = target.dataset.addScene;
      $("#nasa-query").focus();
      toast("Görsel ara ve “Projeye ekle” düğmesine bas");
    }
    if (target.dataset.removeImage) {
      await api(`/api/productions/${target.dataset.id}/images`, {
        method: "DELETE", body: JSON.stringify({ assetId: target.dataset.removeImage })
      });
      await refresh(); toast("Görsel sahnesi kaldırıldı");
    }
    if (target.dataset.generate) {
      target.disabled = true; target.textContent = "Gemini hikâyeyi yazıyor…";
      await api(`/api/ideas/${target.dataset.generate}/generate`, { method: "POST" });
      await refresh(); showStep("review"); toast("Hikâye incelemeye hazır");
    }
    if (target.dataset.review) {
      await api(`/api/productions/${target.dataset.id}/${target.dataset.review}`, { method: "POST" });
      await refresh();
      if (target.dataset.review === "approve") { showStep("render"); toast("Hikâye onaylandı"); }
      else toast("Hikâye reddedildi", "warn");
    }
    if (target.dataset.render) {
      target.disabled = true; target.innerHTML = "Ses ve video hazırlanıyor…";
      toast("Edge seslendirme ve video render başladı");
      await api(`/api/productions/${target.dataset.render}/render`, { method: "POST" });
      await refresh(); toast("Video hazır — oynatabilir veya indirebilirsin");
    }
  } catch (error) {
    target.disabled = false;
    toast(error.message, "error");
  }
});
refresh().then(() => { updateSourceMode(); updateFormatNote(); }).catch((error) => toast(error.message, "error"));
