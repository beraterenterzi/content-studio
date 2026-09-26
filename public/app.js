const $ = (selector) => document.querySelector(selector);
const UI_LANGUAGE_KEY = "orbit-ui-language-v1";
let preferredUiLanguage = "";
try { preferredUiLanguage = localStorage.getItem(UI_LANGUAGE_KEY) || ""; } catch {}
const CUSTOM_NICHES_KEY = "orbit-custom-niches-v1";
const NICHE_OPTIONS = [
  ["education", "Eğitim", "Education", "Educación"],
  ["kids", "Çocuk içerikleri", "Kids content", "Contenido infantil"],
  ["science", "Bilim ve uzay", "Science & space", "Ciencia y espacio"],
  ["history", "Tarih ve kültür", "History & culture", "Historia y cultura"],
  ["travel", "Gezi ve keşif", "Travel & discovery", "Viajes y descubrimiento"],
  ["motivation", "Motivasyon", "Motivation", "Motivación"],
  ["technology", "Teknoloji", "Technology", "Tecnología"],
  ["entertainment", "Eğlence", "Entertainment", "Entretenimiento"],
  ["finance", "Finans", "Finance", "Finanzas"],
  ["lifestyle", "Yaşam tarzı", "Lifestyle", "Estilo de vida"]
];
function customNiches() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_NICHES_KEY) || "[]").filter(Boolean); }
  catch { return []; }
}
function renderNicheOptions(selected = "") {
  const languageIndex = { tr:1, en:2, es:3 }[lang()] || 1;
  const custom = customNiches();
  const knownValues = NICHE_OPTIONS.map(([value]) => value);
  if (selected && !knownValues.includes(selected) && !custom.includes(selected)) custom.push(selected);
  $("#niche").innerHTML = [
    ...NICHE_OPTIONS.map((item) => `<option value="${item[0]}">${item[languageIndex]}</option>`),
    ...custom.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
  ].join("");
  $("#niche").value = selected || "education";
}
let state = { settings: {}, ideas: [], productions: [] };
let accountMode = "register";
let mediaFiles = [];
let youtubeTrendItems = new Map();
let selectedMediaAssets = new Map();
let activeStep = "dashboard";
let openAngleIdeaId = null;
let pendingAiAction = null;
const editorialAngles = [
  { id:"hidden-detail", icon:"◉", label:"Gizli ayrıntı", score:94, promise:"İlk bakışta fark edilmeyen ayrıntıyı açığa çıkar", lens:"Reveal one specific detail most viewers would miss and show why it changes the story." },
  { id:"myth-reality", icon:"↯", label:"Yanlış bilinen", score:92, promise:"Yaygın beklentiyle doğrulanabilir gerçeği karşılaştır", lens:"Challenge one common assumption, then replace it with a source-supported explanation." },
  { id:"why-now", icon:"⌁", label:"Neden şimdi?", score:89, promise:"Konuyu güncel bir değişim veya sonuçla ilişkilendir", lens:"Explain why this matters now, without inventing urgency or unsupported trend claims." },
  { id:"scale", icon:"↗", label:"Ölçek şaşkınlığı", score:87, promise:"Soyut büyüklüğü gündelik bir karşılaştırmayla hissettir", lens:"Turn scale, distance, time, cost, or impact into one concrete everyday comparison." },
  { id:"consequence", icon:"◆", label:"Sonra ne oldu?", score:85, promise:"Tek bir kararın veya olayın beklenmedik sonucunu izle", lens:"Build a cause-and-effect chain with a clear consequence and satisfying payoff." },
  { id:"human-stakes", icon:"◎", label:"İnsan etkisi", score:82, promise:"Konuyu gerçek bir insan ihtiyacı veya gerilim üzerinden anlat", lens:"Frame the topic through a relatable human need, constraint, or decision without fabricating a person." }
];
function angleLabMarkup(idea) {
  if (openAngleIdeaId !== idea.id && !idea.angle) return `<button class="primary" data-angle-lab="${idea.id}">Önce içerik açısını seç <span>→</span></button>`;
  if (idea.angle && openAngleIdeaId !== idea.id) return `<div class="selected-angle"><span>SEÇİLEN AÇI</span><b>${esc(idea.angle.label)}</b><small>${esc(idea.angle.promise)}</small></div><div class="button-row"><button class="ghost" data-angle-lab="${idea.id}">Açıyı değiştir</button><button class="primary" data-generate="${idea.id}">${t("generate")} <span>→</span></button></div>`;
  return `<div class="angle-lab"><div class="angle-lab-head"><div><span>ANLATIM AÇISI</span><b>Bu konu neden izlenmeye değer?</b></div><button class="text-button" data-angle-close="${idea.id}">Kapat</button></div><div class="angle-grid">${editorialAngles.map((angle) => `<button type="button" class="angle-card ${idea.angle?.id === angle.id ? "active" : ""}" data-idea-angle="${idea.id}" data-angle-id="${angle.id}"><i>${angle.icon}</i><span><b>${angle.label}</b><small>${angle.promise}</small></span></button>`).join("")}</div><small class="angle-note">TERZİ, konuya uygun anlatım yaklaşımını seçmene yardım eder.</small></div>`;
}
function retentionMapMarkup(item) {
  const content = item.content || {};
  const beats = [
    ["İZLEYİCİ VAADİ", content.viewerPromise],
    ["MERAK BOŞLUĞU", content.curiosityGap],
    ["ORTA NOKTA KANCASI", content.midpointHook],
    ["ÖDÜL / SONUÇ", content.payoff]
  ].filter((entry) => entry[1]);
  const hookOptions = Array.isArray(content.hookOptions) ? content.hookOptions.filter(Boolean) : [];
  const titleOptions = Array.isArray(content.titleOptions) ? content.titleOptions.filter(Boolean) : [];
  if (!beats.length && !hookOptions.length && !titleOptions.length) return "";
  return `<section class="retention-map"><div class="retention-map-head"><span>RETENTION İSKELETİ</span><b>İzleyiciyi videoda tutan anlatı zinciri</b></div>${beats.length ? `<div class="retention-beats">${beats.map(([label, value]) => `<div><span>${label}</span><p>${esc(value)}</p></div>`).join("")}</div>` : ""}${hookOptions.length || titleOptions.length ? `<details><summary>Alternatif kanca ve başlıkları gör</summary><div class="option-lists">${hookOptions.length ? `<div><b>Kanca seçenekleri</b><ol>${hookOptions.map((value) => `<li>${esc(value)}</li>`).join("")}</ol></div>` : ""}${titleOptions.length ? `<div><b>Başlık seçenekleri</b><ol>${titleOptions.map((value) => `<li>${esc(value)}</li>`).join("")}</ol></div>` : ""}</div></details>` : ""}</section>`;
}
const LOCAL_ANALYTICS_KEY = "orbit-local-analytics-v1";
let flowAnalyticsStages = new Set();

function readLocalAnalytics() {
  const empty = { started: 0, media: 0, rendered: 0, shared: 0, renderErrors: 0, templates: {} };
  try { return { ...empty, ...JSON.parse(localStorage.getItem(LOCAL_ANALYTICS_KEY) || "{}") }; }
  catch { return empty; }
}
function writeLocalAnalytics(data) {
  try { localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(data)); } catch {}
}
function trackFlowStage(stage, detail = "") {
  if (flowAnalyticsStages.has(stage)) return;
  flowAnalyticsStages.add(stage);
  const data = readLocalAnalytics();
  data[stage] = (data[stage] || 0) + 1;
  if (stage === "started" && detail) data.templates[detail] = (data.templates[detail] || 0) + 1;
  writeLocalAnalytics(data);
  renderLocalAnalytics();
}
function beginFlowAnalytics(detail = flowTemplate) {
  if (flowAnalyticsStages.has("shared")) flowAnalyticsStages = new Set();
  trackFlowStage("started", detail);
}
function trackRenderError() {
  const data = readLocalAnalytics(); data.renderErrors += 1; writeLocalAnalytics(data); renderLocalAnalytics();
}
function renderLocalAnalytics() {
  const funnel = $("#analytics-funnel");
  if (!funnel) return;
  const data = readLocalAnalytics();
  const stages = [["started", ft("started")], ["media", ft("media")], ["rendered", ft("rendered")], ["shared", ft("shared")]];
  const base = Math.max(1, data.started);
  funnel.innerHTML = stages.map(([key, label], index) => {
    const count = data[key] || 0; const percent = Math.min(100, Math.round(count / base * 100));
    return `<article><div><span>${index + 1}</span><b>${label}</b><strong>${count}</strong></div><i><em style="width:${percent}%"></em></i><small>%${percent}</small></article>`;
  }).join("");
  const topTemplate = Object.entries(data.templates || {}).sort((a, b) => b[1] - a[1])[0];
  const success = data.started ? Math.round((data.shared || 0) / data.started * 100) : 0;
  $("#analytics-summary").innerHTML = `<span><b>%${success}</b> ${ft("completion")}</span><span><b>${topTemplate ? flowTemplateName(topTemplate[0]) : "—"}</b> ${ft("topTemplate")}</span><span><b>${data.renderErrors || 0}</b> ${ft("renderError")}</span>`;
}
let projectFilter = "all";
let creationMode = "";
let flowPlatform = "youtube";
let customImagePreviewUrl = "";
const messages = {
  tr: {
    dashboard:["TERZİ / GENEL BAKIŞ","İçerik üretim merkezine hoş geldin"],source:["ADIM 1 / KAYNAK","Hikâyenin görselini bul"],story:["ADIM 2 / HİKÂYE","Kaynağı özgün bir hikâyeye dönüştür"],review:["ADIM 3 / İNCELEME","Yayın öncesi son kontrol"],render:["ADIM 4 / VİDEO","Seslendir, birleştir ve izle"],editor:["PROJE DÜZENLEYİCİ","İçeriğini düzenle"],files:["DOSYA KÜTÜPHANESİ","Üretilen dosyaların"],trash:["ÇÖP KUTUSU","Silinen projeler"],
    home:"Ana sayfa",homeSub:"Projeler ve geçmiş",sourceNav:"Kaynak",sourceSub:"Görsel bul veya üret",storyNav:"Hikâye",storySub:"AI senaryo",reviewNav:"İnceleme",reviewSub:"Son kontrol",videoNav:"Video",videoSub:"Ses ve video",
    newProject:"Yeni proje oluştur",projects:"Son projeler",activity:"Aktivite",search:"Arşivde ara",results:"Arşiv sonuçları",edit:"Projeyi düzenle",back:"← Projelere dön",title:"Başlık",hook:"Açılış cümlesi",narration:"Seslendirme metni",save:"Değişiklikleri kaydet",
    total:"Toplam proje",ready:"Hazır video",inReview:"Kontrol edilecek",queue:"Video sırası",allTime:"Tüm zamanlar",downloadable:"İndirilebilir",waiting:"Kontrol bekliyor",productionReady:"Video oluşturmaya hazır",noProjects:"Henüz proje yok.",noActivity:"Henüz aktivite yok.",saved:"Proje değişiklikleri kaydedildi",edited:"Son düzenleme",settings:"Kanal ayarları kaydedildi",generate:"Hikâyeyi oluştur",approve:"Videoya hazırla",reject:"Düzenlemeye geri gönder",renderVideo:"Videoyu oluştur",addScene:"＋ Görsel ekle",newStory:"Hikâyeyi oluştur",addProject:"Projeye ekle",noIdeas:"Henüz kaynak seçilmedi.",noReview:"Kontrol edilecek taslak yok.",noRender:"Video oluşturmaya hazır proje yok.",niche:"Kanal nişi",audience:"Hedef kitle",storyModel:"Hikâye modeli",contentLang:"İçerik dili",uiLang:"Arayüz dili",contentProfile:"İçerik profili",visualStyle:"Görsel stil",apiKey:"Gemini anahtarı",saveSettings:"Kaydet",hero:"Fikrini kanalına göre bir hikâyeye dönüştür.",heroSub:"Kaynak, senaryo, ses ve video üretimin tek yerde.",sourceHelp:"NASA ve Wikimedia Commons görsellerini kullanım ve kaynak bilgileriyle getir.",storyQueue:"Hazırlanan fikirler",reviewDesk:"Son kontrol",videoLab:"Videoyu oluştur",nextStep:"Sıradaki adım",reviewHelp:"Metni ve görselleri kontrol et; hazır olduğunda videoya geç.",renderHelp:"Proje hazır. Seslendirme, altyazı ve videoyu oluştur.",readyHelp:"Video hazır. Buradan izleyebilir veya dosyaları indirebilirsin.",staleHelp:"Metin değişti. Güncel videoyu oluşturmak için videoyu yeniden hazırla.",download:"Videoyu indir"
  },
  en: {
    dashboard:["TERZİ / OVERVIEW","Welcome to your content production center"],source:["STEP 1 / SOURCE","Find visuals for your story"],story:["STEP 2 / STORY","Turn a source into an original story"],review:["STEP 3 / REVIEW","Final check before publishing"],render:["STEP 4 / VIDEO","Narrate, combine and preview"],editor:["PROJECT EDITOR","Edit your content"],files:["FILE LIBRARY","Your generated files"],trash:["TRASH","Deleted projects"],
    home:"Home",homeSub:"Projects and history",sourceNav:"Sources",sourceSub:"Find or create visuals",storyNav:"Story",storySub:"AI script",reviewNav:"Review",reviewSub:"Final review",videoNav:"Video",videoSub:"Voice and video",
    newProject:"Create new project",projects:"Recent projects",activity:"Activity",search:"Search archive",results:"Archive results",edit:"Edit project",back:"← Back to projects",title:"Title",hook:"Opening hook",narration:"Narration script",save:"Save changes",
    total:"Total projects",ready:"Ready videos",inReview:"In review",queue:"Render queue",allTime:"All time",downloadable:"Downloadable",waiting:"Awaiting approval",productionReady:"Ready to produce",noProjects:"No projects yet.",noActivity:"No activity yet.",saved:"Project changes saved",edited:"Last edited",settings:"Channel settings saved",generate:"Generate story",approve:"Prepare video",reject:"Reject",renderVideo:"Create video",addScene:"＋ Add visual",newStory:"Create story",addProject:"Add to project",noIdeas:"No source selected yet.",noReview:"No scripts to review.",noRender:"No approved productions.",niche:"Channel niche",audience:"Target audience",storyModel:"Story model",contentLang:"Content language",uiLang:"Interface language",contentProfile:"Content profile",visualStyle:"Visual style",apiKey:"Gemini key",saveSettings:"Save",hero:"Turn your idea into content that fits your channel.",heroSub:"Sources, scripts, voice and video production in one place.",sourceHelp:"Browse NASA and Wikimedia Commons with metadata, licensing and attribution.",storyQueue:"Story queue",reviewDesk:"Editorial desk",videoLab:"Video lab",nextStep:"Next step",reviewHelp:"Review and save your copy, then approve the project.",renderHelp:"Project is ready. Create narration, captions and the video.",readyHelp:"Your video is ready. Preview or download the files here.",staleHelp:"The copy changed. Render again to create an up-to-date video.",download:"Download MP4"
  },
  es: {
    dashboard:["TERZİ / RESUMEN","Bienvenido a tu centro de producción"],source:["PASO 1 / FUENTE","Encuentra imágenes para tu historia"],story:["PASO 2 / HISTORIA","Convierte una fuente en una historia original"],review:["PASO 3 / REVISIÓN","Control final antes de publicar"],render:["PASO 4 / VÍDEO","Narra, combina y previsualiza"],editor:["EDITOR DE PROYECTO","Edita tu contenido"],files:["ARCHIVOS","Tus archivos generados"],trash:["PAPELERA","Proyectos eliminados"],
    home:"Inicio",homeSub:"Proyectos e historial",sourceNav:"Fuentes",sourceSub:"Busca o crea imágenes",storyNav:"Historia",storySub:"Guion con IA",reviewNav:"Revisión",reviewSub:"Revisión final",videoNav:"Vídeo",videoSub:"Voz y vídeo",
    newProject:"Crear proyecto",projects:"Proyectos recientes",activity:"Actividad",search:"Buscar en archivo",results:"Resultados del archivo",edit:"Editar proyecto",back:"← Volver a proyectos",title:"Título",hook:"Frase inicial",narration:"Texto de narración",save:"Guardar cambios",
    total:"Proyectos totales",ready:"Vídeos listos",inReview:"En revisión",queue:"Cola de renderizado",allTime:"Todo el tiempo",downloadable:"Descargables",waiting:"Esperando aprobación",productionReady:"Listos para producir",noProjects:"Aún no hay proyectos.",noActivity:"Aún no hay actividad.",saved:"Cambios guardados",edited:"Última edición",settings:"Configuración guardada",generate:"Generar historia",approve:"Preparar vídeo",reject:"Rechazar",renderVideo:"Crear vídeo",addScene:"＋ Añadir imagen",newStory:"Crear historia",addProject:"Añadir al proyecto",noIdeas:"Aún no hay fuente seleccionada.",noReview:"No hay guiones para revisar.",noRender:"No hay producciones aprobadas.",niche:"Nicho del canal",audience:"Público objetivo",storyModel:"Modelo de historia",contentLang:"Idioma del contenido",uiLang:"Idioma de interfaz",contentProfile:"Perfil de contenido",visualStyle:"Estilo visual",apiKey:"Clave de Gemini",saveSettings:"Guardar",hero:"Convierte tu idea en contenido hecho para tu canal.",heroSub:"Fuentes, guiones, voz y vídeo en un solo lugar.",sourceHelp:"Explora NASA y Wikimedia Commons con metadatos, licencia y atribución.",storyQueue:"Cola de historias",reviewDesk:"Mesa editorial",videoLab:"Laboratorio de vídeo",nextStep:"Siguiente paso",reviewHelp:"Revisa y guarda el texto; después aprueba el proyecto.",renderHelp:"El proyecto está listo. Crea la narración, los subtítulos y el vídeo.",readyHelp:"El vídeo está listo. Puedes verlo o descargarlo aquí.",staleHelp:"El texto cambió. Vuelve a renderizar para actualizar el vídeo.",download:"Descargar MP4"
  }
};
const flowMessages = {
  tr: { nav:"Hızlı video",navSub:"Fotoğraflardan video",hero:"Fotoğraflarını akan bir videoya dönüştür.",heroSub:"Fotoğraflar ve video cihazında kalır. AI seslendirmeyi açarsan yalnızca sahne metinleri ses üretimi için TERZİ sunucusuna gönderilir.",demo:"▶ Örnek projeyi dene",photos:"＋ Fotoğraf seç",choose:"Ne oluşturmak istiyorsun?",chooseSub:"Bir şablon seç; görünüm, süre ve video ölçüsü otomatik ayarlansın.",drafts:"TASLAKLARIM",draftsSub:"Çalışmalar yalnızca bu cihazda saklanır.",open:"Taslağı aç",delete:"Sil",save:"Taslağı kaydet",export:"↓ Projeyi dışa aktar",import:"↑ Proje içe aktar",projectTitle:"Proje başlığı",format:"Video formatı",duration:"Varsayılan sahne süresi",motion:"Kamera hareketi",transition:"Sahne geçişi",scenes:"Sahneler",scenesSub:"Sürükle-bırak veya oklarla sırala; her sahnenin yazısını ve süresini değiştirebilirsin.",bulkText:"✎ Metinleri toplu düzenle",applyAll:"Tümüne uygula",render:"Videoyu cihazımda oluştur",publish:"✦ Yayın paketini hazırla",sceneText:"Sahne yazısı",seconds:"Süre",movement:"Hareket",sceneTransition:"Geçiş",emptyScenes:"Başlamak için en az bir fotoğraf seç.",copy:"Kopyala",cover:"▣ Kapak karesini indir",started:"Başladı",media:"Fotoğraf ekledi",rendered:"Video oluşturdu",shared:"İndirdi / paylaştı",completion:"tamamlama oranı",topTemplate:"en çok seçilen şablon",renderError:"render hatası",noDraft:"Kayıtlı taslak yok",selectDraft:"Bir taslak seç"},
  en: { nav:"Quick video",navSub:"Video from photos",hero:"Turn your photos into a flowing video.",heroSub:"Photos and video stay on your device. If you enable AI narration, only scene text is sent to the TERZİ server for speech generation.",demo:"▶ Try a sample project",photos:"＋ Choose photos",choose:"What do you want to create?",chooseSub:"Choose a template and let style, timing and format be configured automatically.",drafts:"MY DRAFTS",draftsSub:"Projects are stored only on this device.",open:"Open draft",delete:"Delete",save:"Save draft",export:"↓ Export project",import:"↑ Import project",projectTitle:"Project title",format:"Video format",duration:"Default scene duration",motion:"Camera motion",transition:"Scene transition",scenes:"Scenes",scenesSub:"Drag and drop or use arrows to reorder; edit each scene's text and duration.",bulkText:"✎ Edit all text",applyAll:"Apply to all",render:"Create video on my device",publish:"✦ Prepare publishing kit",sceneText:"Scene text",seconds:"Duration",movement:"Motion",sceneTransition:"Transition",emptyScenes:"Choose at least one photo to begin.",copy:"Copy",cover:"▣ Download cover frame",started:"Started",media:"Added photos",rendered:"Created video",shared:"Downloaded / shared",completion:"completion rate",topTemplate:"most-used template",renderError:"render errors",noDraft:"No saved drafts",selectDraft:"Choose a draft"},
  es: { nav:"Vídeo rápido",navSub:"Vídeo desde fotos",hero:"Convierte tus fotos en un vídeo dinámico.",heroSub:"Las fotos y el vídeo permanecen en tu dispositivo. Si activas la narración con IA, solo el texto de las escenas se envía al servidor TERZİ.",demo:"▶ Probar proyecto de ejemplo",photos:"＋ Elegir fotos",choose:"¿Qué quieres crear?",chooseSub:"Elige una plantilla y configura automáticamente el estilo, la duración y el formato.",drafts:"MIS BORRADORES",draftsSub:"Los proyectos se guardan solo en este dispositivo.",open:"Abrir borrador",delete:"Eliminar",save:"Guardar borrador",export:"↓ Exportar proyecto",import:"↑ Importar proyecto",projectTitle:"Título del proyecto",format:"Formato de vídeo",duration:"Duración predeterminada",motion:"Movimiento de cámara",transition:"Transición de escena",scenes:"Escenas",scenesSub:"Arrastra o usa las flechas para ordenar; edita el texto y la duración de cada escena.",bulkText:"✎ Editar todos los textos",applyAll:"Aplicar a todos",render:"Crear vídeo en mi dispositivo",publish:"✦ Preparar paquete de publicación",sceneText:"Texto de escena",seconds:"Duración",movement:"Movimiento",sceneTransition:"Transición",emptyScenes:"Elige al menos una foto para comenzar.",copy:"Copiar",cover:"▣ Descargar portada",started:"Iniciado",media:"Fotos añadidas",rendered:"Vídeo creado",shared:"Descargado / compartido",completion:"tasa de finalización",topTemplate:"plantilla más usada",renderError:"errores de renderizado",noDraft:"No hay borradores",selectDraft:"Elige un borrador"}
};
const staticTranslationRows = [
  ["İçeriğe geç","Skip to content","Saltar al contenido"],
  ["ÜRETİM AKIŞI","PRODUCTION FLOW","FLUJO DE PRODUCCIÓN"],
  ["Projeler","Projects","Proyectos"],["Tüm çalışmalar","All projects","Todos los trabajos"],
  ["Dosyalar","Files","Archivos"],["Üretilen çıktılar","Generated outputs","Resultados generados"],
  ["Çöp kutusu","Trash","Papelera"],["Silinen projeler","Deleted projects","Proyectos eliminados"],
  ["Yeni üretim","New creation","Nueva creación"],["Yerel stüdyo","Local studio","Estudio local"],
  ["Yerel videolar bu cihazda","Local videos stay on this device","Los vídeos locales permanecen en este dispositivo"],
  ["Çevrimiçi","Online","En línea"],["↓ Uygulamayı yükle","↓ Install app","↓ Instalar aplicación"],
  ["Genel","General","General"],["İçerik & Kitle","Content & Audience","Contenido y audiencia"],
  ["Üretim Kuralları","Production Rules","Reglas de producción"],["Entegrasyonlar","Integrations","Integraciones"],
  ["AI sağlayıcısı","AI provider","Proveedor de IA"],["Entegrasyon seç","Choose integration","Elegir integración"],
  ["Kanal nişi","Channel niche","Nicho del canal"],["Hikâye modeli","Story model","Modelo de historia"],
  ["İçerik dili","Content language","Idioma del contenido"],["Arayüz dili","Interface language","Idioma de la interfaz"],
  ["İçerik profili","Content profile","Perfil de contenido"],["Görsel stil","Visual style","Estilo visual"],
  ["Genel içerik","General content","Contenido general"],["Çocuklara yönelik eğitici","Educational content for children","Contenido educativo infantil"],
  ["Eğitici anlatım","Educational narration","Narración educativa"],["Hikâye anlatımı","Storytelling","Narración de historias"],
  ["Mini belgesel","Mini documentary","Mini documental"],["Eğlence","Entertainment","Entretenimiento"],
  ["Açıklayıcı / How-to","Explainer / How-to","Explicativo / Tutorial"],["Belgesel","Documentary","Documental"],
  ["Renkli animasyon","Colorful animation","Animación colorida"],["Genel izleyici","General audience","Público general"],
  ["Hedef yaş aralıkları","Target age ranges","Rangos de edad objetivo"],
  ["Ek hedef kitle notu","Additional audience notes","Notas adicionales del público"],
  ["Editör onayı","Editorial approval","Aprobación editorial"],["Render öncesinde insan onayı iste","Require human approval before rendering","Requerir aprobación humana antes de renderizar"],
  ["Çocuk güvenliği","Child safety","Seguridad infantil"],["Korkutucu ve taklit edilebilir davranışlardan kaçın","Avoid frightening or imitable behavior","Evitar conductas aterradoras o imitables"],
  ["Yalnızca doğrulanabilir bilgi","Verified information only","Solo información verificable"],["Kaynak dışı tarih, sayı ve iddia üretme","Do not invent dates, numbers or claims beyond sources","No inventar fechas, cifras ni afirmaciones fuera de las fuentes"],
  ["CTA ekle","Add CTA","Añadir CTA"],["Metnin sonuna uygun bir harekete geçirici çağrı ekle","Add a suitable call to action at the end","Añadir una llamada a la acción adecuada al final"],
  ["Videoya altyazı yak","Burn captions into video","Incrustar subtítulos en el vídeo"],["SRT yanında altyazıyı videonun içine de ekle","Add captions inside the video as well as SRT","Añadir subtítulos dentro del vídeo además del SRT"],
  ["API anahtarını gir","Enter API key","Introduce la clave API"],["Ayarlar yeni üretimlerde uygulanır.","Settings apply to new creations.","Los ajustes se aplican a nuevas creaciones."],
  ["Gemini API anahtarı","Gemini API key","Clave API de Gemini"],["32 karakterli Account ID","32-character Account ID","Account ID de 32 caracteres"],
  ["Hikâye ve metin üretimi için kullanılır.","Used for story and text generation.","Se utiliza para generar historias y textos."],
  ["Değişiklikleri kaydet","Save changes","Guardar cambios"],["Son projeler","Recent projects","Proyectos recientes"],
  ["Üretim hattındaki en güncel çalışmalar.","Latest work in your production pipeline.","Trabajos más recientes de tu flujo de producción."],
  ["Yeni proje →","New project →","Nuevo proyecto →"],["Aktivite","Activity","Actividad"],["Son işlemler.","Recent actions.","Acciones recientes."],
  ["YALNIZCA BU CİHAZ","THIS DEVICE ONLY","SOLO ESTE DISPOSITIVO"],["Görsel Akış dönüşümü","Visual Flow conversion","Conversión de Flujo visual"],
  ["Hangi adımda kaldığını gör. Bu veriler TERZİ’ye veya başka bir sunucuya gönderilmez.","See where you stopped. This data is never sent to TERZİ or another server.","Consulta dónde te quedaste. Estos datos no se envían a TERZİ ni a ningún servidor."],
  ["Verileri sıfırla","Reset data","Restablecer datos"],["1. ADIM","STEP 1","PASO 1"],
  ["Mekân ve keşif","Places and discovery","Lugares y exploración"],["Güçlü tek mesaj","One strong message","Un mensaje potente"],
  ["Arşiv anlatısı","Archive storytelling","Narrativa de archivo"],["Enerjik akış","Energetic flow","Flujo enérgico"],
  ["Temiz tanıtım","Clean showcase","Presentación clara"],["Renkli ve anlaşılır","Colorful and clear","Colorido y claro"],
  ["Şablon","Template","Plantilla"],["Fotoğraflar","Photos","Fotos"],["Düzenle","Edit","Editar"],["Oluştur ve paylaş","Create and share","Crear y compartir"],
  ["Gönderi · 1:1","Post · 1:1","Publicación · 1:1"],["2 saniye","2 seconds","2 segundos"],["3 saniye","3 seconds","3 segundos"],["4 saniye","4 seconds","4 segundos"],["5 saniye","5 seconds","5 segundos"],["6 saniye","6 seconds","6 segundos"],
  ["YAZI TASARIMI","TEXT DESIGN","DISEÑO DE TEXTO"],["Konum","Position","Posición"],["Boyut","Size","Tamaño"],["Renk","Color","Color"],["Arka plan","Background","Fondo"],
  ["Güvenli alan","Safe area","Zona segura"],["Platform düğmelerinden ve kenarlardan uzak tutar.","Keeps text away from platform controls and edges.","Mantiene el texto alejado de controles y bordes."],
  ["İSTEĞE BAĞLI","OPTIONAL","OPCIONAL"],["MP3, WAV veya M4A dosyan cihazında işlenir.","Your MP3, WAV or M4A is processed on this device.","Tu archivo MP3, WAV o M4A se procesa en este dispositivo."],
  ["Ses","Volume","Volumen"],["ÜCRETSİZ METİN YARDIMCISI","FREE COPY HELPER","ASISTENTE DE TEXTO GRATUITO"],
  ["Seçtiğin şablona uygun başlık ve sahne metinleri.","Titles and scene captions for your selected template.","Títulos y textos de escena para la plantilla elegida."],
  ["Yeni eklenen görsellere sahne metinleri otomatik uygulanacak.","Scene captions will be applied automatically to new images.","Los textos se aplicarán automáticamente a las nuevas imágenes."],
  ["Kaldır","Remove","Quitar"],["Tüm sahnelerin süresi","Duration of all scenes","Duración de todas las escenas"],
  ["Kaydedilmemiş çalışma bulundu","Unsaved work found","Se encontró trabajo sin guardar"],["Son yerel otomatik kayıt geri yüklenebilir.","The latest local autosave can be restored.","Se puede restaurar el último guardado local."],
  ["Geri yükle","Restore","Restaurar"],["Önizleme burada görünecek","Preview will appear here","La vista previa aparecerá aquí"],
  ["Video hazırlanıyor…","Preparing video…","Preparando vídeo…"],["Videoyu indir","Download video","Descargar vídeo"],["Paylaş","Share","Compartir"],
  ["Mobil cihazda platform düğmesi sistem paylaşım ekranını açar. Bilgisayarda video indirilir ve platformun yükleme sayfası açılır.","On mobile, platform buttons open the system share sheet. On desktop, the video downloads and the platform upload page opens.","En móvil, los botones abren el menú de compartir. En ordenador, se descarga el vídeo y se abre la página de carga."],
  ["YAYIN PAKETİ","PUBLISHING KIT","PAQUETE DE PUBLICACIÓN"],["Açıklama","Description","Descripción"],["Yayın kontrolü","Publishing checklist","Lista de publicación"],
  ["Başlık ilk saniyedeki mesajla uyumlu","The title matches the first-second message","El título coincide con el mensaje inicial"],["Metinler güvenli alanda ve okunabilir","Text is readable and inside the safe area","El texto es legible y está en la zona segura"],
  ["Müzik seviyesi konuşmayı bastırmıyor","Music does not overpower speech","La música no tapa la voz"],["Görselleri kullanma hakkım var","I have the right to use these visuals","Tengo derecho a usar estas imágenes"],
  ["Görselden hikâye","Visual to story","Imagen a historia"],["Bir görsel seç, AI senaryoyu yazsın","Choose an image and let AI write the script","Elige una imagen y deja que la IA escriba el guion"],
  ["Hikâyeden görsel","Story to visual","Historia a imagen"],["Metnini sahnelere ve görsellere dönüştür","Turn your text into scenes and visuals","Convierte tu texto en escenas e imágenes"],
  ["İçerik türü","Content type","Tipo de contenido"],["Görsel kadrajı","Image framing","Encuadre de imagen"],["Ekranı doldur","Fill screen","Llenar pantalla"],["Görselin tamamını göster","Show entire image","Mostrar imagen completa"],
  ["Dikey, kısa içerik. Süre metne göre otomatik hesaplanır.","Short vertical content. Duration is calculated from the script.","Contenido vertical corto. La duración se calcula según el texto."],
  ["Kendi görselim · Yükle","My image · Upload","Mi imagen · Subir"],["Arşivde ara","Search archive","Buscar en el archivo"],
  ["Görseli projeye ekle","Add image to project","Añadir imagen al proyecto"],["AI görsel üret","Generate AI image","Generar imagen con IA"],
  ["Görseli videoya ekle","Add image to video","Añadir imagen al vídeo"],
  ["Görsel seç","Choose image","Elegir imagen"],["JPG, PNG veya WebP · en fazla 10 MB","JPG, PNG or WebP · max 10 MB","JPG, PNG o WebP · máx. 10 MB"],
  ["Dosya seçilmedi","No file selected","Ningún archivo seleccionado"],["Görseli kaldır","Remove image","Eliminar imagen"],
  ["Görsel cihazından ayrılmadan Visual Flow videona eklenir.","The image is added to your Visual Flow video without leaving your device.","La imagen se añade a tu vídeo de Flujo visual sin salir del dispositivo."],
  ["Sana ait veya kullanım iznin bulunan JPG, PNG ya da WebP görselini seçili projeye yükle.","Upload a JPG, PNG or WebP image you own or have permission to use.","Sube una imagen JPG, PNG o WebP propia o que tengas permiso para usar."],
  ["Promptunu FLUX.1 Schnell ile özgün bir 9:16 sahneye dönüştür ve seçili projeye ekle.","Turn your prompt into an original 9:16 scene with FLUX.1 Schnell and add it to the selected project.","Convierte tu prompt en una escena 9:16 original con FLUX.1 Schnell y añádela al proyecto."],
  ["Örn: friendly cartoon robot explaining the solar system","E.g. friendly cartoon robot explaining the solar system","Ej.: robot amigable explicando el sistema solar"],
  ["Arşiv sonuçları","Archive results","Resultados del archivo"],["Bir görsel seçtiğinde hikâye kuyruğu otomatik hazırlanır.","Choosing an image automatically prepares the story queue.","Al elegir una imagen se prepara automáticamente la cola de historias."],
  ["Mevcut videoya görsel ekle","Add image to current video","Añadir imagen al vídeo actual"],["Aramaya başlamak için yukarıdaki alanı kullan.","Use the field above to start searching.","Usa el campo superior para buscar."],
  ["Hikâyeni sahnelere dönüştür.","Turn your story into scenes.","Convierte tu historia en escenas."],["Hikâye / seslendirme metni","Story / narration text","Historia / texto de narración"],
  ["Projeyi ve sahneleri oluştur","Create project and scenes","Crear proyecto y escenas"],["Projeyi sil","Delete project","Eliminar proyecto"],
  ["Kaynağa bağlı, özgün bir Shorts senaryosu üret.","Create an original Shorts script grounded in the source.","Crea un guion original de Shorts basado en la fuente."],
  ["Senaryoyu ve görseli kontrol et, ardından onayla.","Review the script and visuals, then approve.","Revisa el guion y las imágenes y después aprueba."],
  ["Edge sesi, açık lisanslı görseller ve hikâyeyi tek videoda birleştir.","Combine Edge narration, openly licensed visuals and the story in one video.","Combina narración Edge, imágenes con licencia abierta y la historia en un vídeo."],
  ["✦ Cloudflare FLUX ile animasyon sahnesi üret","✦ Generate animated scene with Cloudflare FLUX","✦ Generar escena animada con Cloudflare FLUX"],
  ["Üretilmiş video, seslendirme ve altyazı çıktıları.","Generated video, narration and caption files.","Archivos generados de vídeo, narración y subtítulos."],
  ["Henüz üretilmiş dosya yok.","No generated files yet.","Aún no hay archivos generados."],["Çöp kutusu boş.","Trash is empty.","La papelera está vacía."],
  ["Tüm projeler","All projects","Todos los proyectos"],["Projelerini tek ekrandan düzenle, üretime devam et veya kaldır.","Edit, continue or remove projects from one screen.","Edita, continúa o elimina proyectos desde una sola pantalla."],
  ["Tümü","All","Todos"],["Render bekliyor","Awaiting render","Esperando renderizado"],["Hazır","Ready","Listo"],
  ["Projeler ve render dosyaları korunur; istediğinde geri yükleyebilirsin.","Projects and render files are retained and can be restored.","Los proyectos y archivos se conservan y pueden restaurarse."],
  ["Geri","Back","Atrás"],["Sahnelere geç →","Continue to scenes →","Ir a escenas →"],["Ana Sayfa","Home","Inicio"],["Oluştur","Create","Crear"],["Ayarlar","Settings","Ajustes"],
  ["Başlangıç","Setup","Inicio"],["Sahneler","Scenes","Escenas"],["Tasarım","Style","Diseño"],
  ["Ana ekranına ekle","Add to home screen","Añadir a la pantalla de inicio"],["Anladım","Got it","Entendido"],
  ["Safari araç çubuğundaki Paylaş simgesine dokun, ardından “Ana Ekrana Ekle” seçeneğini seç.","Tap Share in Safari, then choose “Add to Home Screen”.","Toca Compartir en Safari y elige “Añadir a pantalla de inicio”."],
  ["TERZİ'YE HOŞ GELDİN","WELCOME TO TERZİ","BIENVENIDO A TERZİ"],["Şablon seç","Choose a template","Elige una plantilla"],["Görselleri ekle","Add visuals","Añade imágenes"],
  ["Oluştur ve paylaş","Create and share","Crear y compartir"],["Bu tanıtım yalnızca ilk ziyaretinde gösterilir.","This introduction is shown only on your first visit.","Esta introducción solo aparece en tu primera visita."],
  ["Fotoğraflarını seç, sahne yazılarını düzenle ve videoyu hiçbir dosyayı sunucuya göndermeden cihazında oluştur.","Choose photos, edit scene captions and create the video on your device without uploading files.","Elige fotos, edita los textos y crea el vídeo en tu dispositivo sin subir archivos."],
  ["TERZİ HESABI","TERZİ ACCOUNT","CUENTA TERZİ"],["Projelerini güvenle hesabına bağla.","Securely link your projects to your account.","Vincula tus proyectos de forma segura a tu cuenta."],["Ücretsiz hesap açtığında bu tarayıcıdaki bulut projelerin hesabına taşınır. Cihaz içi video üretimi ücretsiz kalır.","When you create a free account, cloud projects in this browser are linked to it. On-device video creation stays free.","Al crear una cuenta gratuita, los proyectos en la nube de este navegador se vinculan a ella. La creación de vídeo en el dispositivo sigue siendo gratis."],["Hesap oluştur","Create account","Crear cuenta"],["Giriş yap","Sign in","Iniciar sesión"],["E-posta","Email","Correo electrónico"],["Parola","Password","Contraseña"],["En az 12 karakter kullan. Parolan hiçbir zaman düz metin olarak saklanmaz.","Use at least 12 characters. Your password is never stored as plain text.","Usa al menos 12 caracteres. Tu contraseña nunca se guarda como texto sin formato."],["Ücretsiz hesap oluştur","Create free account","Crear cuenta gratis"],["Hesabın hazır.","Your account is ready.","Tu cuenta está lista."],["Atölye Pro'ya geç","Upgrade to Atölye Pro","Pasar a Atölye Pro"],["Üyeliği yönet","Manage membership","Gestionar membresía"],["Çıkış yap","Sign out","Cerrar sesión"],
  ["Ücretsiz başla, işin büyüdüğünde yükselt.","Start free and upgrade when your work grows.","Empieza gratis y mejora cuando crezca tu trabajo."],["Cihaz içi video ücretsizdir. Yönetilen AI ve bulut kaydı yalnız kullananlar için Pro üyeliğe dahildir.","On-device video is free. Managed AI and cloud storage are included in Pro for those who need them.","El vídeo en el dispositivo es gratis. La IA gestionada y el almacenamiento en la nube se incluyen en Pro."],["1 otomatik proje, demo AI görselleri ve sınırlı seslendirme.","1 automatic project, demo AI visuals and limited narration.","1 proyecto automático, imágenes de IA de demostración y narración limitada."],["Cihaz içi video ücretsiz; AI kullanımı doğrudan kendi sağlayıcından düşer.","On-device video is free; AI usage is billed directly by your provider.","El vídeo en el dispositivo es gratis; el uso de IA se cobra directamente por tu proveedor."],["API anahtarı yok; yönetilen AI, daha yüksek ses kotası ve güvenli bulut kayıt.","No API key; managed AI, higher narration limits and secure cloud storage.","Sin clave API; IA gestionada, más narración y almacenamiento seguro en la nube."],["Pro'ya geç","Upgrade to Pro","Pasar a Pro"],
  ["PLANIN","YOUR PLAN","TU PLAN"],["Teknik kurulum yapmadan üret.","Create without technical setup.","Crea sin configuración técnica."],["Normal kullanımda API anahtarı gerekmez. Ücretsiz denemeden sonra Atölye Pro ile TERZİ'nin yönetilen AI servislerini kullanırsın.","No API key is needed for normal use. After the free trial, Atölye Pro gives you TERZİ's managed AI services.","No necesitas una clave API para el uso normal. Tras la prueba gratuita, Atölye Pro te ofrece los servicios de IA gestionados por TERZİ."],
  ["ÜCRETSİZ","FREE","GRATIS"],["ANAHTARSIZ","NO API KEY","SIN CLAVE API"],["Cihazda manuel video ve ücretsiz hesapla bir tam otomatik deneme.","Manual on-device video and one fully automatic trial with a free account.","Vídeo manual en el dispositivo y una prueba totalmente automática con una cuenta gratuita."],["Ayda 30 yönetilen hikâye; AI görsellerinde günlük adil kullanım.","30 managed stories per month; daily fair-use limits for AI visuals.","30 historias gestionadas al mes; uso razonable diario para imágenes de IA."],
  ["Gelişmiş: Kendi AI hesabımı bağla","Advanced: Connect my own AI account","Avanzado: Conectar mi propia cuenta de IA"],["İsteğe bağlı · teknik kullanıcılar için","Optional · for technical users","Opcional · para usuarios técnicos"],["KENDİ AI HESABIN","YOUR OWN AI ACCOUNT","TU PROPIA CUENTA DE IA"],["Sağlayıcı maliyetini doğrudan kendin yönet.","Manage provider costs directly.","Gestiona directamente los costes del proveedor."],["Bu bölüm normal kullanım için gerekli değildir. Yalnızca kendi Gemini, OpenAI veya Claude hesabını kullanmak istiyorsan bağlantı kur.","This section is not required for normal use. Connect only if you want to use your own Gemini, OpenAI or Claude account.","Esta sección no es necesaria para el uso normal. Conecta solo si quieres usar tu propia cuenta de Gemini, OpenAI o Claude."],
  ["Bir konu yaz veya fotoğraflarını ekle. TERZİ hikâyeyi ve sahneleri hazırlasın; son karar her zaman sende kalsın.","Enter a topic or add your photos. TERZİ prepares the story and scenes; you always keep the final say.","Escribe un tema o añade tus fotos. TERZİ prepara la historia y las escenas; la decisión final siempre es tuya."],["Fikrini ekle","Add your idea","Añade tu idea"],["Konu veya kendi fotoğrafların.","A topic or your own photos.","Un tema o tus propias fotos."],["TERZİ hazırlasın","Let TERZİ prepare it","Deja que TERZİ lo prepare"],["Hikâye, sahneler ve görseller.","Story, scenes and visuals.","Historia, escenas e imágenes."],["Kontrol et","Review","Revisa"],["Düzenle, seslendir ve indir.","Edit, narrate and download.","Edita, narra y descarga."],["Demo için API anahtarı gerekmez.","No API key is needed for the demo.","No necesitas una clave API para la demo."],
  ["CİHAZDA VİDEO","VIDEO ON DEVICE","VÍDEO EN EL DISPOSITIVO"],
  ["Açarsan sahne metinleri ses üretimi için TERZİ sunucusuna veya seçtiğin AI sağlayıcısına gönderilir. Fotoğrafların gönderilmez.","If enabled, scene text is sent to the TERZİ server or your selected AI provider for speech generation. Your photos are not sent.","Si la activas, el texto de las escenas se envía al servidor de TERZİ o al proveedor de IA elegido para generar la voz. Tus fotos no se envían."],
  ["Bu kayıt başka bir yerde değişti","This record changed elsewhere","Este registro cambió en otro lugar"],["Bu formdaki değerler korunuyor. Sunucudaki son sürümü istediğinde açabilirsin.","The values in this form are preserved. Open the latest server version when you choose.","Los valores de este formulario se conservan. Puedes abrir la última versión del servidor cuando quieras."],["Bu formda kal","Stay on this form","Seguir en este formulario"],["Son sürümü aç","Open latest version","Abrir la última versión"],
  ["Stil ve format hazır gelsin.","Start with style and format ready.","Empieza con estilo y formato listos."],["Kendi fotoğrafların veya demo.","Use your photos or the demo.","Usa tus fotos o la demo."],["MP4 ya da WebM olarak indir.","Download as MP4 or WebM.","Descarga como MP4 o WebM."],
  ["TOPLU DÜZENLEME","BULK EDIT","EDICIÓN MASIVA"],["Satır sırası sahne sırasıyla eşleşir. Boş bıraktığın satırdaki sahne yazısız kalır.","Line order matches scene order. An empty line leaves that scene without text.","El orden de líneas coincide con las escenas. Una línea vacía deja la escena sin texto."],
  ["SAHNE KADRAJI","SCENE CROP","ENCUADRE DE ESCENA"],["Yakınlaştır ve odak noktasını taşı. Kesikli çerçeve platformların güvenli alanını gösterir.","Zoom and move the focal point. The dashed frame shows platform safe areas.","Amplía y mueve el punto focal. El marco discontinuo muestra las zonas seguras."],
  ["Yakınlaştır","Zoom","Zoom"],["Yatay odak","Horizontal focus","Enfoque horizontal"],["Dikey odak","Vertical focus","Enfoque vertical"],
  ["Geri al","Undo","Deshacer"],["İleri al","Redo","Rehacer"],["Müziği kaldır","Remove music","Quitar música"],["Kapat","Close","Cerrar"],
  ["İnceleme bekliyor","Awaiting review","Esperando revisión"],["Render alınıyor","Rendering","Renderizando"],["Render hatası","Render failed","Error de renderizado"],["Yeni","New","Nuevo"],["Adsız proje","Untitled project","Proyecto sin título"],
  ["KONTROL MERKEZİ","CONTROL CENTER","CENTRO DE CONTROL"],["Ne yapmak istiyorsun?","What do you want to do?","¿Qué quieres hacer?"],
  ["Tüm üretim yolları tek yerde. Birini seç; seni doğrudan doğru adıma götürelim.","Every creation path in one place. Choose one and go straight to the right step.","Todas las formas de creación en un solo lugar. Elige una y ve directamente al paso correcto."],
  ["Otomatik üret","Automatic creation","Creación automática"],["Konuyu yaz; hikâye, sahne ve görseller hazırlansın.","Enter a topic and generate the story, scenes and visuals.","Escribe un tema y genera la historia, las escenas y las imágenes."],
  ["Fikirden videoya →","From idea to video →","De la idea al vídeo →"],["Manuel stüdyo","Manual studio","Estudio manual"],["Metni, görselleri ve bütün ayrıntıları kendin belirle.","Choose the text, visuals and every detail yourself.","Elige tú mismo el texto, las imágenes y cada detalle."],
  ["Kontrol sende →","You're in control →","Tú tienes el control →"],["YouTube trendleri","YouTube trends","Tendencias de YouTube"],["Ülke ve kategoriye göre popüler içerikleri keşfet.","Discover popular content by country and category.","Descubre contenido popular por país y categoría."],
  ["Trendleri aç →","Open trends →","Abrir tendencias →"],["Cihazda video oluştur","Create video on device","Crear vídeo en el dispositivo"],["Galerindeki fotoğrafları ücretsiz videoya dönüştür.","Turn your gallery photos into a video for free.","Convierte gratis las fotos de tu galería en un vídeo."],
  ["Görsel Akış'ı aç →","Open Visual Flow →","Abrir Flujo visual →"],["URL'den görsel kullan","Use an image URL","Usar imagen desde URL"],["İzinli bir görsel adresini doğrula ve projeye ekle.","Validate an authorized image URL and add it to the project.","Valida una URL de imagen autorizada y añádela al proyecto."],
  ["Kaynak ekle →","Add source →","Añadir fuente →"],["Hikâyeden görsel üret","Create visuals from a story","Crear imágenes desde una historia"],["Hazır metnini sahnelere ayır ve görsellerle eşleştir.","Split your text into scenes and match it with visuals.","Divide tu texto en escenas y relaciónalo con imágenes."],
  ["Hikâyeyi getir →","Bring your story →","Añadir historia →"],["Daha fazlası:","More:","Más:"],["NASA ve görsel arşivi","NASA and image archive","NASA y archivo de imágenes"],["Projelerim","My projects","Mis proyectos"],["AI ve YouTube entegrasyonları","AI and YouTube integrations","Integraciones de IA y YouTube"],
  ["← Kontrol Merkezi","← Control Center","← Centro de control"],["Yöntemi değiştir","Change method","Cambiar método"],["1 Başlangıç","1 Start","1 Inicio"],["2 İçerik","2 Content","2 Contenido"],["3 Kontrol","3 Review","3 Revisión"],["4 Video","4 Video","4 Vídeo"],
  ["YouTube trendlerini keşfet","Explore YouTube trends","Explora las tendencias de YouTube"],["Popüler videoları ülke ve kategoriye göre incele; özgün bir içerik fikri olarak kuyruğa ekle.","Browse popular videos by country and category, then add one to your queue as an original content idea.","Explora vídeos populares por país y categoría y añade uno a tu cola como idea original."],
  ["API anahtarın yok mu?","Don't have an API key?","¿No tienes una clave API?"],["Google Cloud'da YouTube Data API v3'ü etkinleştir, ardından bir API anahtarı oluştur. Anahtar yalnızca bu cihazda saklanır.","Enable YouTube Data API v3 in Google Cloud, then create an API key. The key is stored only on this device.","Activa YouTube Data API v3 en Google Cloud y crea una clave API. La clave se guarda solo en este dispositivo."],
  ["Google Cloud'da anahtar al ↗","Get a key in Google Cloud ↗","Obtener clave en Google Cloud ↗"],["Anahtarı uygulamaya gir","Enter key in the app","Introducir clave en la aplicación"],
  ["Trend verilerinin kaynağı YouTube Data API'dir.","Trend data is provided by the YouTube Data API.","Los datos de tendencias proceden de YouTube Data API."],["YouTube Kullanım Şartları","YouTube Terms of Service","Términos de Servicio de YouTube"],["Google Gizlilik Politikası","Google Privacy Policy","Política de Privacidad de Google"],
  ["Başlamadan önce","Before you begin","Antes de empezar"],["Stüdyoya gir →","Enter studio →","Entrar al estudio →"],["Kullanım Koşulları","Terms of Use","Términos de uso"],["Veri Hakların","Your data rights","Tus derechos de datos"],["Bağımsız içerik üretim aracı","Independent content creation tool","Herramienta independiente de creación de contenido"],
  ["TERZİ yetişkin içerik üreticileri için hazırlanmıştır. Çocuklara yönelik içerik üretebilirsin; uygulama çocukların doğrudan kullanımına yönelik değildir.","TERZİ is designed for adult content creators. You may create content for children, but the app is not intended for direct use by children.","TERZİ está diseñado para creadores de contenido adultos. Puedes crear contenido infantil, pero la aplicación no está destinada al uso directo por menores."],
  ["18 yaşında veya daha büyük olduğumu ve","I confirm that I am 18 or older and accept the","Confirmo que tengo 18 años o más y acepto los"],
  ["kabul ettiğimi beyan ederim.",".","."],["Kişisel verilerinin nasıl işlendiği hakkında","To learn how your personal data is processed, read the","Para saber cómo se tratan tus datos personales, consulta el"],
  ["KVKK Aydınlatma Metni’ni","Privacy Notice","Aviso de privacidad"],["okuyabilirsin. Bu metni okumak bir açık rıza değildir.",". Reading this notice does not constitute explicit consent.",". Leer este aviso no constituye consentimiento explícito."],
  ["KVKK Aydınlatma Metni","Privacy Notice","Aviso de privacidad"],["YASAL BİLGİLENDİRME","LEGAL INFORMATION","INFORMACIÓN LEGAL"],
  ["Projeye fotoğraf ekle","Add photos to the project","Añadir fotos al proyecto"],["İsteğe bağlı","Optional","Opcional"],["＋ Bir veya birden fazla fotoğraf seç","＋ Choose one or more photos","＋ Elegir una o más fotos"],["Fotoğraf seçilmezse seçtiğin arşiv kaynağı kullanılır.","If you choose no photos, the selected archive source will be used.","Si no eliges fotos, se usará la fuente de archivo seleccionada."],["Fotoğraflar hikâyeye nasıl bağlansın?","How should photos connect to the story?","¿Cómo deben conectarse las fotos con la historia?"],["Tek ortak hikâye · fotoğraflar ardışık sahneler","One shared story · photos become sequential scenes","Una historia compartida · fotos como escenas consecutivas"],["Her fotoğraf için ayrı bölüm · tek video","A separate section for each photo · one video","Una sección por foto · un solo vídeo"],
  ["Görsel çeşitliliği","Visual variety","Variedad visual"],["Dengeli · 4 farklı görsel","Balanced · 4 different visuals","Equilibrado · 4 imágenes diferentes"],["Zengin · 6 farklı görsel","Rich · 6 different visuals","Rico · 6 imágenes diferentes"],["Maksimum · 8 farklı görsel","Maximum · 8 different visuals","Máximo · 8 imágenes diferentes"],["TERZİ güvenli ve lisans bilgili sonuçları sahnelere sırayla dağıtır.","TERZİ distributes safe, licensed results across scenes in order.","TERZİ distribuye resultados seguros y con licencia entre las escenas."],
  ["Bir fikirle başla:","Start with an idea:","Empieza con una idea:"],["Pratik öneri","Practical tip","Consejo práctico"],["Merak uyandıran bilgi","Curious fact","Dato curioso"],["İlham veren hikâye","Inspiring story","Historia inspiradora"],
  ["Bu videonun amacı","Goal of this video","Objetivo de este vídeo"],["İzlenme ve etkileşim","Views and engagement","Visualizaciones e interacción"],["Yeni takipçi kazanmak","Gain new followers","Conseguir nuevos seguidores"],["Bir şeyi anlaşılır öğretmek","Teach something clearly","Enseñar algo con claridad"],["Ürün veya hizmet tanıtmak","Showcase a product or service","Presentar un producto o servicio"],
  ["Kime hitap edecek?","Who is it for?","¿Para quién es?"],["Anlatım nasıl hissettirsin?","How should it feel?","¿Qué tono debe tener?"],["Merak uyandıran","Curiosity-driven","Que despierte curiosidad"],["Sade ve bilgilendirici","Clear and informative","Claro e informativo"],["Enerjik ve eğlenceli","Energetic and fun","Enérgico y divertido"],["Samimi ve ilham veren","Warm and inspiring","Cercano e inspirador"],
  ["Taslağımı hazırla","Create my draft","Crear mi borrador"],["Yaklaşık 1–2 dakika sürer. Sonraki ekranda metni, görselleri ve video süresini görebilirsin.","Takes about 1–2 minutes. On the next screen you can review the text, visuals, and duration.","Tarda aproximadamente 1–2 minutos. En la siguiente pantalla podrás revisar el texto, las imágenes y la duración."],
  ["Hazırlanan fikirler","Prepared ideas","Ideas preparadas"],["Seçtiğin kaynaklardan özgün bir video taslağı oluştur.","Create an original video draft from your selected sources.","Crea un borrador de vídeo original con las fuentes seleccionadas."],["Son kontrol","Final check","Control final"],["Metni ve görselleri gözden geçir, ardından videonu oluştur.","Review the text and visuals, then create your video.","Revisa el texto y las imágenes y crea tu vídeo."],["Videoyu oluştur","Create the video","Crear el vídeo"],["Seslendirmeyi, görselleri ve altyazıyı tek videoda birleştir.","Combine narration, visuals, and captions in one video.","Combina narración, imágenes y subtítulos en un solo vídeo."],
  ["Videonun ilk saniyelerinde izleyiciyi durduracak cümle.","A line that stops the viewer in the first seconds.","Una frase que atrape al espectador en los primeros segundos."],["Video oluşturulacak","Ready to create video","Listo para crear vídeo"],["Konu önerileri","Topic suggestions","Sugerencias de temas"],
  ["AÇIK GÖRSEL ARŞİVİ","OPEN VISUAL ARCHIVE","ARCHIVO VISUAL ABIERTO"],["YOUTUBE TRENDLERİ","YOUTUBE TRENDS","TENDENCIAS DE YOUTUBE"],["HİKÂYEDEN GÖRSELE","STORY TO VISUAL","HISTORIA A IMAGEN"],["PROJELERİM","MY PROJECTS","MIS PROYECTOS"],
  ["AI ile görsel oluştur","Create image with AI","Crear imagen con IA"],["Wikimedia veya NASA arşivinden kullanım bilgili görseller seçilir.","Choose visuals with usage details from Wikimedia or NASA.","Elige imágenes con datos de uso de Wikimedia o NASA."],["Daha hızlı · ücretsiz kaynak","Faster · free source","Más rápido · fuente gratuita"],["✦ AI ile yeni görseller oluştur","✦ Create new visuals with AI","✦ Crear imágenes nuevas con IA"],["Her sahne için konuya özel, dikey bir görsel hazırlanır.","Create a topic-specific vertical visual for each scene.","Crea una imagen vertical específica para cada escena."],["Daha özgün · biraz daha uzun sürer","More original · takes a little longer","Más original · tarda un poco más"],
  ["Son kontrolde duraklat","Pause for final review","Pausar para revisión final"],["Arşivden veya hazır metinden başlayan projelerde videoya geçmeden önce bekle","Pause before video creation for projects started from an archive or existing text","Pausa antes de crear el vídeo en proyectos iniciados desde un archivo o texto existente"],["Altyazıyı videoda göster","Show captions in the video","Mostrar subtítulos en el vídeo"],["Ayrı altyazı dosyasına ek olarak yazıları videonun içine de ekle","Add captions inside the video as well as in a separate caption file","Añade subtítulos dentro del vídeo además del archivo separado"],
  ["GÖRSELSİZ İÇERİK","IMAGE-FREE CONTENT","CONTENIDO SIN IMÁGENES"],["Motivasyon cümlelerinden video oluştur","Create a video from motivational sentences","Crea un vídeo con frases motivadoras"],["Her satır ayrı bir sahne olur. Fotoğraf eklemeden, yazı ve tasarım odaklı bir paylaşım hazırla.","Each line becomes a scene. Create a text-and-design-led post without adding photos.","Cada línea se convierte en una escena. Crea una publicación centrada en texto y diseño sin añadir fotos."],["Paylaşım başlığı","Post title","Título de la publicación"],["Cümleler","Sentences","Frases"],["Boş bırakırsan örnek motivasyon cümleleriyle başlarız.","Leave it blank to start with sample motivational sentences.","Déjalo vacío para empezar con frases motivadoras de ejemplo."],["Metin paylaşımını hazırla","Create text post","Crear publicación de texto"],["Her satıra bir motivasyon cümlesi yaz…","Write one motivational sentence per line…","Escribe una frase motivadora por línea…"]
];
const staticTranslations = Object.fromEntries(staticTranslationRows.map(([tr, en, es]) => [tr, { tr, en, es }]));
const originalTextNodes = new WeakMap();
const translatedAttributes = ["placeholder", "title", "aria-label"];

function translateStaticTree() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue.trim()) continue;
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    const original = originalTextNodes.get(node);
    const source = original.trim();
    const translated = staticTranslations[source]?.[lang()];
    if (translated) node.nodeValue = original.replace(source, translated);
  }
  document.querySelectorAll("[placeholder],[title],[aria-label]").forEach((element) => {
    translatedAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const dataName = `i18n${attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, (letter) => letter.toUpperCase())}`;
      const current = element.getAttribute(attribute);
      let source = element.dataset[dataName];
      const knownValues = source && staticTranslations[source]
        ? Object.values(staticTranslations[source]) : [];
      if (!source || !knownValues.includes(current)) {
        source = current;
        element.dataset[dataName] = source;
      }
      const translated = staticTranslations[source]?.[lang()];
      if (translated) element.setAttribute(attribute, translated);
    });
  });
}
const lang = () => preferredUiLanguage || state.settings?.uiLanguage || "tr";
const t = (key) => messages[lang()]?.[key] ?? messages.tr[key] ?? key;
const ft = (key) => flowMessages[lang()]?.[key] ?? flowMessages.tr[key] ?? key;
const flowTemplateName = (key) => ({
  tr: { travel:"Gezi",quote:"Söz",culture:"Tarih & kültür",motivation:"Motivasyon",product:"Ürün",education:"Eğitim" },
  en: { travel:"Travel",quote:"Quote",culture:"History & culture",motivation:"Motivation",product:"Product",education:"Education" },
  es: { travel:"Viajes",quote:"Frase",culture:"Historia y cultura",motivation:"Motivación",product:"Producto",education:"Educación" }
}[lang()]?.[key] || key);
const flowRuntime = (key) => ({
  tr:{checking:"Kontrol ediliyor",device:"Cihaz uyumluluğu",checkingDetail:"Tarayıcının video özellikleri inceleniyor.",unsupported:"Bu tarayıcıda video oluşturulamıyor",mp4:"YouTube, Instagram ve TikTok için en uyumlu çıktı.",webm:"Video oluşturulur; bazı platformlar yüklerken MP4 dönüşümü isteyebilir.",renderAs:"Videoyu {format} olarak oluştur",noRender:"Bu tarayıcı video oluşturmayı desteklemiyor",details:"Detay",hide:"Gizle"},
  en:{checking:"Checking",device:"Device compatibility",checkingDetail:"Checking your browser's video capabilities.",unsupported:"Rendering is unavailable in this browser",mp4:"The most compatible output for YouTube, Instagram and TikTok.",webm:"Your video will be created; some platforms may request MP4 conversion.",renderAs:"Create video as {format}",noRender:"This browser cannot render video",details:"Details",hide:"Hide"},
  es:{checking:"Comprobando",device:"Compatibilidad del dispositivo",checkingDetail:"Comprobando las funciones de vídeo del navegador.",unsupported:"El renderizado no está disponible en este navegador",mp4:"El formato más compatible con YouTube, Instagram y TikTok.",webm:"El vídeo se creará; algunas plataformas pueden solicitar conversión a MP4.",renderAs:"Crear vídeo como {format}",noRender:"Este navegador no puede renderizar vídeo",details:"Detalles",hide:"Ocultar"}
}[lang()]?.[key] || key);
const flowPanel = (key) => ({
  tr:{textDesign:"Videodaki metin görünümü",music:"Arka plan müziği",musicPick:"♫ Müzik seç",copyHelper:"Bir anlatı yapısıyla başla",showIdeas:"Önerileri göster",bulkTitle:"Her satır bir sahne metni",bulkApply:"Metinleri uygula",cancel:"Vazgeç",cropTitle:"Önemli bölgeyi kadrajda tut",cropApply:"Kadrajı uygula",reset:"Ortala",welcome:"İlk videonu birlikte hazırlayalım.",welcomeDemo:"İlk videomu oluştur →",welcomeSkip:"Ana sayfayı incele",publishTitle:"Paylaşmadan önce son dokunuşlar",title:"Başlık",description:"Açıklama",hashtags:"Hashtag'ler",checklist:"Yayın kontrolü"},
  en:{textDesign:"Text appearance in the video",music:"Background music",musicPick:"♫ Choose music",copyHelper:"Start with a story structure",showIdeas:"Show suggestions",bulkTitle:"One scene caption per line",bulkApply:"Apply captions",cancel:"Cancel",cropTitle:"Keep the important area in frame",cropApply:"Apply crop",reset:"Center",welcome:"Let us create your first video together.",welcomeDemo:"Create my first video →",welcomeSkip:"Explore the home page",publishTitle:"Final touches before publishing",title:"Title",description:"Description",hashtags:"Hashtags",checklist:"Publishing checklist"},
  es:{textDesign:"Apariencia del texto en el vídeo",music:"Música de fondo",musicPick:"♫ Elegir música",copyHelper:"Empieza con una estructura narrativa",showIdeas:"Mostrar sugerencias",bulkTitle:"Un texto de escena por línea",bulkApply:"Aplicar textos",cancel:"Cancelar",cropTitle:"Mantén la zona importante en el encuadre",cropApply:"Aplicar encuadre",reset:"Centrar",welcome:"Creemos juntos tu primer vídeo.",welcomeDemo:"Crear mi primer vídeo →",welcomeSkip:"Explorar la página principal",publishTitle:"Últimos detalles antes de publicar",title:"Título",description:"Descripción",hashtags:"Hashtags",checklist:"Lista de publicación"}
}[lang()]?.[key] || key);
const stepMeta = new Proxy({}, { get: (_, key) => {
  if (key === "dashboard") {
    return {
      tr: ["TERZİ / GENEL BAKIŞ", "Fikirlerin harekete geçsin."],
      en: ["TERZİ / OVERVIEW", "Put your ideas in motion."],
      es: ["TERZİ / RESUMEN", "Pon tus ideas en movimiento."]
    }[lang()];
  }
  if (key === "flow") {
    return {
      tr: ["GÖRSEL AKIŞ", "Fotoğraflarından paylaşılabilir video oluştur"],
      en: ["VISUAL FLOW", "Turn your photos into a shareable video"],
      es: ["FLUJO VISUAL", "Convierte tus fotos en un vídeo para compartir"]
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
  applyFlowLanguage();
  translateStaticTree();
  renderAccountAccess();
}
function setLeadingText(element, value) {
  if (!element) return;
  const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.nodeValue = value; else element.prepend(document.createTextNode(value));
}
function localizeOptions(selector, labels) {
  document.querySelectorAll(`${selector} option`).forEach((option) => { if (labels[option.value]) option.textContent = labels[option.value]; });
}
function applyFlowLanguage() {
  const nav = document.querySelector("[data-step=flow] span");
  if (nav) { nav.childNodes[0].nodeValue = ft("nav"); nav.querySelector("small").textContent = ft("navSub"); }
  $(".flow-hero h2").textContent = ft("hero"); $(".flow-hero p").textContent = ft("heroSub");
  $("#flow-demo").textContent = ft("demo"); setLeadingText($(".flow-upload"), ft("photos"));
  $("#flow-template-heading").textContent = ft("choose"); $("#flow-template-heading").nextElementSibling.textContent = ft("chooseSub");
  document.querySelectorAll("[data-flow-template]").forEach((button) => { button.querySelector("b").textContent = flowTemplateName(button.dataset.flowTemplate); });
  $("#flow-template-name").textContent = flowTemplateName(flowTemplate);
  const draftIntro = $(".flow-drafts>div"); draftIntro.querySelector("span").textContent = ft("drafts"); draftIntro.querySelector("small").textContent = ft("draftsSub");
  $("#flow-draft-open").textContent = ft("open"); $("#flow-draft-delete").textContent = ft("delete"); $("#flow-draft-save").textContent = ft("save");
  $("#flow-project-export").textContent = ft("export"); setLeadingText($(".flow-project-import"), ft("import"));
  const settingsLabels = document.querySelectorAll(".flow-settings>label");
  setLeadingText(settingsLabels[0], { tr:"Hedef platform", en:"Target platform", es:"Plataforma objetivo" }[lang()]);
  ["projectTitle","format","duration","motion","transition"].forEach((key, index) => setLeadingText(settingsLabels[index + 1], ft(key)));
  const optionText = {
    tr:{motion:{"zoom-in":"Yavaşça yakınlaş","zoom-out":"Yavaşça uzaklaş","pan-left":"Sola kaydır","pan-right":"Sağa kaydır",still:"Sabit"},transition:{fade:"Yumuşak geçiş",slide:"Yatay kaydırma",none:"Geçiş yok"},position:{template:"Şablona göre",top:"Üst",center:"Orta",bottom:"Alt"},size:{small:"Küçük",medium:"Orta",large:"Büyük"},font:{modern:"Modern",rounded:"Yuvarlak",serif:"Klasik"},background:{none:"Yok",soft:"Yumuşak kutu",solid:"Belirgin kutu"}},
    en:{motion:{"zoom-in":"Slow zoom in","zoom-out":"Slow zoom out","pan-left":"Pan left","pan-right":"Pan right",still:"Still"},transition:{fade:"Soft fade",slide:"Horizontal slide",none:"No transition"},position:{template:"Use template",top:"Top",center:"Center",bottom:"Bottom"},size:{small:"Small",medium:"Medium",large:"Large"},font:{modern:"Modern",rounded:"Rounded",serif:"Classic"},background:{none:"None",soft:"Soft box",solid:"Solid box"}},
    es:{motion:{"zoom-in":"Acercamiento lento","zoom-out":"Alejamiento lento","pan-left":"Mover a la izquierda","pan-right":"Mover a la derecha",still:"Fijo"},transition:{fade:"Fundido suave",slide:"Deslizamiento horizontal",none:"Sin transición"},position:{template:"Según plantilla",top:"Arriba",center:"Centro",bottom:"Abajo"},size:{small:"Pequeño",medium:"Mediano",large:"Grande"},font:{modern:"Moderna",rounded:"Redondeada",serif:"Clásica"},background:{none:"Ninguno",soft:"Caja suave",solid:"Caja sólida"}}
  }[lang()];
  localizeOptions("#flow-motion,[data-flow-motion]", optionText.motion); localizeOptions("#flow-transition,[data-flow-transition]", optionText.transition);
  localizeOptions("#flow-text-position", optionText.position); localizeOptions("#flow-text-size", optionText.size);
  localizeOptions("#flow-text-font", optionText.font); localizeOptions("#flow-text-background", optionText.background);
  $(".flow-controls>.flow-section-head h3").textContent = ft("scenes"); $(".flow-controls>.flow-section-head p").textContent = ft("scenesSub");
  $("#flow-bulk-duration-apply").textContent = ft("applyAll"); $("#flow-bulk-text-open").textContent = ft("bulkText");
  $("#publish-kit-create").textContent = ft("publish"); $("#publish-cover-download").textContent = ft("cover");
  document.querySelectorAll("[data-copy-publish]").forEach((button) => { button.textContent = ft("copy"); });
  $(".flow-text-style>div b").textContent = flowPanel("textDesign"); $(".flow-music>div:first-child>b").textContent = flowPanel("music");
  setLeadingText($(".flow-music-pick"), flowPanel("musicPick")); $(".flow-copy-head h3").textContent = flowPanel("copyHelper");
  $("#flow-copy-toggle").textContent = flowPanel("showIdeas"); $("#bulk-text-title").textContent = flowPanel("bulkTitle");
  $("#flow-bulk-text-apply").textContent = flowPanel("bulkApply"); $("#flow-bulk-text-cancel").textContent = flowPanel("cancel");
  $("#crop-modal-title").textContent = flowPanel("cropTitle"); $("#flow-crop-apply").textContent = flowPanel("cropApply");
  $("#flow-crop-reset").textContent = flowPanel("reset"); $("#flow-crop-cancel").textContent = flowPanel("cancel");
  $("#welcome-guide-title").textContent = flowPanel("welcome"); $("#welcome-guide-demo").textContent = flowPanel("welcomeDemo");
  $("#welcome-guide-skip").textContent = flowPanel("welcomeSkip"); $(".publish-kit-head b").textContent = flowPanel("publishTitle");
  const publishLabels = $("#publish-kit-panel").querySelectorAll(":scope>label");
  ["title","description","hashtags"].forEach((key,index) => setLeadingText(publishLabels[index], flowPanel(key)));
  $(".publish-checklist>b").textContent = flowPanel("checklist");
  renderFlowScenes();
  localizeOptions("[data-flow-motion]", optionText.motion); localizeOptions("[data-flow-transition]", optionText.transition);
  renderLocalAnalytics();
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
  try {
    const youtubeKey = localStorage.getItem("orbit-device-key-youtube") || "";
    const configuredProvider = state?.settings?.provider || "gemini";
    const generationRequest = /^\/api\/ideas\/[^/]+\/generate$/.test(path);
    const imageGenerationRequest = options.method === "POST" && /^\/api\/productions\/[^/]+\/(images|cloudflare-image)$/.test(path);
    const aiProvider = imageGenerationRequest
      ? (readyImageProvider() || configuredProvider)
      : generationRequest ? (readyTextProvider() || configuredProvider) : configuredProvider;
    const aiKey = localStorage.getItem(`orbit-device-key-${aiProvider}`) || "";
    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(youtubeKey && path.startsWith("/api/youtube/trends")
          ? { "x-orbit-youtube-key": youtubeKey } : {}),
        ...((generationRequest || imageGenerationRequest) && hasReadyAiCredential(aiProvider)
          ? { "x-orbit-ai-provider": aiProvider, ...(aiKey ? { "x-orbit-ai-key": aiKey } : {}) } : {}),
        ...options.headers
      }
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "İşlem başarısız");
      error.status = response.status;
      error.payload = result;
      error.code = result.code || "";
      if (response.status === 409 && result.code === "STATE_CONFLICT") {
        const preservedCopy = {
          tr:"Bu formdaki değerler, son sürümü açmayı seçene kadar korunur.",
          en:"The values in this form are preserved until you choose to open the latest version.",
          es:"Los valores de este formulario se conservan hasta que decidas abrir la última versión."
        }[lang()] || "Bu formdaki değerler, son sürümü açmayı seçene kadar korunur.";
        $("#conflict-message").textContent = `${error.message} ${preservedCopy}`;
        $("#conflict-banner").classList.remove("hidden");
      }
      if (["ACCOUNT_REQUIRED", "PRO_REQUIRED"].includes(result.code)) {
        setTimeout(() => openAccountModal(result.code === "ACCOUNT_REQUIRED" ? "register" : "account"), 0);
      }
      throw error;
    }
    setServerConnection(true);
    return result;
  } catch (error) {
    if (error instanceof TypeError || /failed to fetch|networkerror/i.test(error.message)) {
      setServerConnection(false);
      throw new Error("TERZİ sunucusuna ulaşılamıyor. Bağlantıyı kontrol edip tekrar deneyin.");
    }
    throw error;
  }
}

function productSurface() {
  if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true) return "pwa";
  if (/android/i.test(navigator.userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "web";
}
function trackProductEvent(event, metadata = {}) {
  const payload = {
    event,
    metadata: {
      language: selectedContentLanguage(),
      surface: productSurface(),
      ...(metadata.result ? { result: String(metadata.result).slice(0, 40) } : {})
    }
  };
  fetch("/api/analytics/events", {
    method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(payload), keepalive:true
  }).catch(() => {});
}

const turnstileWidgets = new Map();
let turnstileLoader;
function loadTurnstile() {
  if (!state.runtime?.turnstileSiteKey) return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (turnstileLoader) return turnstileLoader;
  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Güvenlik doğrulaması yüklenemedi. Bağlantını kontrol et."));
    document.head.appendChild(script);
  });
  return turnstileLoader;
}
async function ensureTurnstile(containerId) {
  const container = $(`#${containerId}`);
  if (!container || !state.runtime?.turnstileSiteKey) return;
  await loadTurnstile();
  if (turnstileWidgets.has(containerId)) return;
  const widgetId = window.turnstile.render(container, {
    sitekey: state.runtime.turnstileSiteKey,
    theme:"auto",
    callback:(token) => { container.dataset.token = token; },
    "expired-callback":() => { container.dataset.token = ""; }
  });
  turnstileWidgets.set(containerId, widgetId);
}
function turnstileToken(containerId) { return $(`#${containerId}`)?.dataset.token || ""; }
function resetTurnstile(containerId) {
  const container = $(`#${containerId}`);
  if (container) container.dataset.token = "";
  const id = turnstileWidgets.get(containerId);
  if (id !== undefined && window.turnstile) window.turnstile.reset(id);
}
function setServerConnection(connected) {
  const status = $("#connection-status");
  const banner = $("#connection-banner");
  if (status) {
    status.classList.toggle("offline", !connected);
    status.querySelector("span").textContent = connected ? "Sunucu bağlı" : "Bağlantı yok";
  }
  banner?.classList.toggle("hidden", connected);
}
function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}
let toastTimer;
function toast(message, type = "ok") {
  const node = $("#toast");
  clearTimeout(toastTimer);
  node.textContent = message;
  node.dataset.type = type;
  node.setAttribute("role", type === "error" ? "alert" : "status");
  node.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  node.title = type === "error" ? "Kapatmak için dokun" : "";
  node.classList.add("show");
  node.onclick = () => node.classList.remove("show");
  toastTimer = setTimeout(() => node.classList.remove("show"), type === "error" ? 12000 : 4200);
}

const providerRuntimeKeys = {
  gemini: "geminiConfigured", openai: "openAiConfigured",
  claude: "anthropicConfigured", cloudflare: "cloudflareConfigured"
};
const providerDisplayNames = {
  gemini: "Google Gemini", openai: "OpenAI", claude: "Anthropic Claude",
  cloudflare: "Cloudflare Workers AI"
};
const providerKeyUrls = {
  gemini: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  claude: "https://console.anthropic.com/settings/keys",
  cloudflare: "https://dash.cloudflare.com/profile/api-tokens"
};

function aiModalCopy() {
  return {
    tr:{eyebrow:"AI ENTEGRASYONU",title:"AI bağlantısı gerekli",copy:"Bu özelliği kullanmak için seçili AI sağlayıcısının API anahtarını eklemelisin.",provider:"Seçili sağlayıcı",cancel:"Şimdi değil",settings:"Entegrasyonlara git →",privacy:"Anahtarın tarayıcıya geri gönderilmez ve arayüzde gösterilmez."},
    en:{eyebrow:"AI INTEGRATION",title:"AI connection required",copy:"Add an API key for the selected AI provider to use this feature.",provider:"Selected provider",cancel:"Not now",settings:"Open integrations →",privacy:"Your key is never returned to the browser or displayed in the interface."},
    es:{eyebrow:"INTEGRACIÓN DE IA",title:"Se necesita conexión de IA",copy:"Añade una clave API del proveedor de IA seleccionado para usar esta función.",provider:"Proveedor seleccionado",cancel:"Ahora no",settings:"Abrir integraciones →",privacy:"Tu clave nunca vuelve al navegador ni se muestra en la interfaz."}
  }[lang()];
}

function openAiKeyModal(provider) {
  const copy = aiModalCopy();
  const modal = $("#ai-key-modal");
  modal.dataset.provider = provider;
  modal.querySelector(":scope>div>span").textContent = copy.eyebrow;
  $("#ai-key-modal-title").textContent = copy.title;
  $("#ai-key-modal-copy").textContent = copy.copy;
  $(".ai-key-provider small").textContent = copy.provider;
  $("#ai-key-modal-provider").value = providerKeyUrls[provider] ? provider : "gemini";
  $("#ai-key-modal-cancel").textContent = copy.cancel;
  $("#ai-key-modal-settings").textContent = copy.settings;
  $("#ai-key-guide-link").href = providerKeyUrls[provider] || providerKeyUrls.gemini;
  $("#ai-transfer-consent").checked = localStorage.getItem(`orbit-ai-consent-${provider}`) === "yes";
  $("#ai-key-modal-settings").disabled = !$("#ai-transfer-consent").checked;
  $(".ai-key-privacy").textContent = copy.privacy;
  modal.classList.remove("hidden");
  $("#ai-key-modal-settings").focus();
}

function updateAiKeyModalProvider(provider) {
  const selected = providerKeyUrls[provider] ? provider : "gemini";
  $("#ai-key-modal").dataset.provider = selected;
  $("#ai-key-modal-provider").value = selected;
  $("#ai-key-guide-link").href = providerKeyUrls[selected];
  $("#ai-transfer-consent").checked = localStorage.getItem(`orbit-ai-consent-${selected}`) === "yes";
  $("#ai-key-modal-settings").disabled = !$("#ai-transfer-consent").checked;
}

function hasProviderCredential(provider) {
  return Boolean(state.runtime?.[providerRuntimeKeys[provider]] ||
    localStorage.getItem("orbit-device-key-" + provider));
}
function hasReadyAiCredential(provider) {
  return hasProviderCredential(provider) && localStorage.getItem(`orbit-ai-consent-${provider}`) === "yes";
}
function readyTextProvider() {
  const selected = state.settings?.provider || "gemini";
  return [selected, "openai", "gemini", "claude"]
    .filter((provider, index, all) => all.indexOf(provider) === index)
    .find((provider) => hasReadyAiCredential(provider)) || "";
}
function configuredTextProvider() {
  const selected = state.settings?.provider || "gemini";
  return [selected, "openai", "gemini", "claude"]
    .filter((provider, index, all) => all.indexOf(provider) === index)
    .find((provider) => hasProviderCredential(provider)) || "";
}
function readyImageProvider() {
  const selected = state.settings?.provider || "gemini";
  return [selected, "openai", "gemini"]
    .filter((provider, index, all) => all.indexOf(provider) === index)
    .find((provider) => hasReadyAiCredential(provider)) || "";
}
function imageCredentialProvider() {
  const selected = state.settings?.provider || "gemini";
  return [selected, "openai", "gemini"]
    .filter((provider, index, all) => all.indexOf(provider) === index)
    .find((provider) => hasProviderCredential(provider)) || "";
}
function managedImageGenerationAvailable() {
  const entitlement = state.runtime?.entitlement || state.runtime?.account || {};
  const pro = entitlement.plan === "pro" && ["active", "trialing"].includes(entitlement.status);
  const textUsesManagedDemo = Boolean(state.runtime?.demoAvailable) && !hasReadyAiCredential(state.settings.provider || "gemini");
  const localImageProvider = state.runtime?.deployment !== "cloudflare" && Boolean(state.runtime?.cloudflareConfigured || state.runtime?.geminiConfigured);
  return Boolean(readyImageProvider()) || localImageProvider || Boolean(state.runtime?.managedImageGeneration && (pro || textUsesManagedDemo));
}
function promptImageGenerationAvailable() {
  const entitlement = state.runtime?.entitlement || state.runtime?.account || {};
  const pro = entitlement.plan === "pro" && ["active", "trialing"].includes(entitlement.status);
  const localImageProvider = state.runtime?.deployment !== "cloudflare" && Boolean(state.runtime?.cloudflareConfigured || state.runtime?.geminiConfigured);
  return Boolean(readyImageProvider()) || localImageProvider || Boolean(state.runtime?.managedImageGeneration && pro);
}
function ensureAiConfigured(kind = "text", resumeAction = "") {
  const provider = kind === "image"
    ? (readyImageProvider() || (["gemini", "openai"].includes(state.settings.provider) ? state.settings.provider : "gemini"))
    : (state.settings.provider || "gemini");
  if (kind === "image" && (resumeAction === "prompt-image" ? promptImageGenerationAvailable() : managedImageGenerationAvailable())) return true;
  if (kind === "image" && state.runtime?.managedImageGeneration) {
    toast("Bu projede AI görsel erişimi yok. Açık arşiv görsellerini kullanabilirsin.", "warn");
    return false;
  }
  if (hasReadyAiCredential(provider)) return true;
  if (kind === "text" && readyTextProvider()) return true;
  pendingAiAction = resumeAction || pendingAiAction;
  const configuredProvider = kind === "text" ? configuredTextProvider() : provider;
  const configured = Boolean(configuredProvider);
  // A saved key without transfer consent must never silently fall through to
  // the managed demo. Ask once, then resume the exact action with that key.
  if (kind === "text" && !configured && state.runtime?.demoAvailable) {
    pendingAiAction = null;
    return true;
  }
  // Cloud users never need an API key for the normal product journey. The
  // backend applies the free demo or Pro entitlement and returns the upgrade UI.
  if (kind === "text" && !configured && state.runtime?.deployment === "cloudflare") {
    if (!state.runtime?.account) {
      pendingAiAction = resumeAction || pendingAiAction;
      openAccountModal("register");
      toast({ tr:"Otomatik denemeyi hesabına bağlamak için ücretsiz hesap oluştur.", en:"Create a free account to attach the automatic trial to you.", es:"Crea una cuenta gratuita para vincular la prueba automática." }[lang()], "warn");
      return false;
    }
    pendingAiAction = null;
    return true;
  }
  openAiKeyModal(configuredProvider || provider);
  if (configured) {
    $("#ai-key-modal-copy").textContent = {
      tr:"API anahtarın kayıtlı. Otomatik üretime devam etmek için AI veri aktarımını onayla.",
      en:"Your API key is saved. Approve AI data transfer to continue automatic creation.",
      es:"Tu clave API está guardada. Autoriza la transferencia de datos de IA para continuar."
    }[lang()];
    $("#ai-key-modal-settings").textContent = {
      tr:"Onayla ve devam et →", en:"Approve and continue →", es:"Autorizar y continuar →"
    }[lang()];
  }
  return false;
}

function resumePendingAiAction() {
  const action = pendingAiAction;
  pendingAiAction = null;
  if (!action) return;
  if (action === "automatic") {
    const form = $("#automatic-creation-form");
    if (creationMode === "automatic" && form?.checkValidity()) setTimeout(() => form.requestSubmit(), 0);
    return;
  }
  if (action.startsWith("idea:")) {
    const ideaId = action.slice(5);
    const button = [...document.querySelectorAll("[data-generate]")].find((node) => node.dataset.generate === ideaId);
    if (button) setTimeout(() => button.click(), 0);
    return;
  }
  if (action.startsWith("archive-story:")) {
    const [, source, encodedAssetId] = action.split(":");
    const assetId = decodeURIComponent(encodedAssetId || "");
    const button = [...document.querySelectorAll("[data-media-import]")]
      .find((node) => node.dataset.source === source && node.dataset.mediaImport === assetId);
    if (button) setTimeout(() => button.click(), 0);
    return;
  }
  if (action === "archive-story-batch") {
    const button = document.querySelector("[data-media-batch]");
    if (button) setTimeout(() => button.click(), 0);
  }
}

function startStoryProgress(button) {
  const copy = {
    tr:["Kaynak analiz ediliyor","Hikâye yapısı hazırlanıyor","AI taslağı yazıyor","Son kontroller yapılıyor"],
    en:["Analyzing source","Building story structure","AI is writing the draft","Running final checks"],
    es:["Analizando la fuente","Preparando la estructura","La IA escribe el borrador","Realizando controles finales"]
  }[lang()];
  const host = button.closest(".card-body") || button.parentElement;
  const node = document.createElement("div");
  node.className = "ai-generation-progress";
  node.innerHTML = `<div><span>${copy[0]}</span><b>%4</b></div><i><em></em></i>`;
  host.append(node);
  let value = 4;
  const timer = setInterval(() => {
    value = Math.min(92, value + Math.max(1, Math.round((94 - value) / 12)));
    const stage = value < 28 ? 0 : value < 55 ? 1 : value < 82 ? 2 : 3;
    node.querySelector("span").textContent = copy[stage];
    node.querySelector("b").textContent = `%${value}`;
    node.querySelector("em").style.width = `${value}%`;
  }, 650);
  return {
    complete() { clearInterval(timer); node.querySelector("b").textContent = "%100"; node.querySelector("em").style.width = "100%"; },
    fail() { clearInterval(timer); node.remove(); }
  };
}

function startServerRenderProgress(button) {
  const copy = {
    tr:["Seslendirme hazırlanıyor","Görseller işleniyor","Video birleştiriliyor","Son kontroller yapılıyor"],
    en:["Preparing narration","Processing visuals","Combining video","Running final checks"],
    es:["Preparando la narración","Procesando imágenes","Combinando el vídeo","Realizando controles finales"]
  }[lang()];
  const estimate = { tr:"Tahmini ilerleme", en:"Estimated progress", es:"Progreso estimado" }[lang()];
  const host = button.closest(".render-copy") || button.closest("#editor-next>div") || button.parentElement;
  host.querySelector(".render-generation-progress")?.remove();
  const node = document.createElement("div");
  node.className = "ai-generation-progress render-generation-progress";
  node.innerHTML = `<div><span>${copy[0]}</span><b title="${estimate}">%3</b></div><i><em></em></i><small>${estimate}</small>`;
  host.append(node);
  let value = 3;
  const timer = setInterval(() => {
    value = Math.min(94, value + Math.max(1, Math.round((96 - value) / 18)));
    const stage = value < 24 ? 0 : value < 52 ? 1 : value < 82 ? 2 : 3;
    node.querySelector("span").textContent = copy[stage];
    node.querySelector("b").textContent = `%${value}`;
    node.querySelector("em").style.width = `${value}%`;
  }, 900);
  return {
    complete() { clearInterval(timer); node.querySelector("span").textContent = copy[3]; node.querySelector("b").textContent = "%100"; node.querySelector("em").style.width = "100%"; },
    fail() { clearInterval(timer); node.remove(); }
  };
}
function showStep(step) {
  $("#settings-panel")?.classList.add("hidden");
  activeStep = step;
  if (step === "source" && !creationMode) setCreationMode("automatic");
  const isWorkflow = ["source", "story", "review", "render"].includes(step);
  $("#workflow-nav")?.classList.toggle("open", isWorkflow);
  $("#workflow-toggle")?.classList.toggle("open", isWorkflow);
  $("#workflow-toggle")?.setAttribute("aria-expanded", String(isWorkflow));
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
  $("#mobile-flow-action").classList.toggle("hidden", step !== "flow" || !window.matchMedia("(max-width:650px)").matches);
  document.querySelectorAll("[data-mobile-step]").forEach((button) => {
    const active = button.dataset.mobileStep === step; button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  const mobileCreate = document.querySelector("[data-mobile-create]");
  mobileCreate?.classList.toggle("active", step === "source");
  if (step === "source") mobileCreate?.setAttribute("aria-current", "page"); else mobileCreate?.removeAttribute("aria-current");
  const routeStages = ["source", "story", "review", "render"];
  const routeStep = step === "editor" ? "review" : step;
  const routeIndex = routeStages.indexOf(routeStep);
  $("#workflow-context")?.classList.toggle("hidden", routeIndex < 0);
  document.querySelectorAll("[data-context-stage]").forEach((node) => {
    const index = routeStages.indexOf(node.dataset.contextStage);
    node.classList.toggle("active", index === routeIndex);
    node.classList.toggle("done", routeIndex >= 0 && index < routeIndex);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
const mobileFlowOrder = ["setup", "scenes", "style", "export"];
let mobileFlowPanel = "setup";
let flowRendering = false;
function syncMobileFlowAction() {
  const next = $('#mobile-flow-next');
  const primary = $('#flow-render');
  const index = mobileFlowOrder.indexOf(mobileFlowPanel);
  const exporting = index === mobileFlowOrder.length - 1;
  const labels = {
    tr: ['Sahnelere geç →', 'Tasarıma geç →', 'Oluşturmaya geç →'],
    en: ['Go to scenes →', 'Go to design →', 'Go to export →'],
    es: ['Ir a escenas →', 'Ir al diseño →', 'Ir a exportar →']
  };
  next.disabled = exporting && primary.disabled;
  next.textContent = exporting ? primary.textContent : (labels[lang()] || labels.tr)[index];
  next.setAttribute('aria-busy', String(exporting && flowRendering));
  if (exporting) next.setAttribute('aria-describedby', 'flow-compatibility-detail');
  else next.removeAttribute('aria-describedby');
}
function configureMobileFlowPanels() {
  const groups = {
    setup: [document.querySelector(".flow-onboarding"), document.querySelector(".flow-settings"), $("#flow-platform-note")],
    scenes: [document.querySelector(".flow-controls>.flow-section-head"), document.querySelector(".flow-bulk-tools"), $("#flow-recovery"), $("#flow-scenes")],
    style: [document.querySelector(".flow-narration"), document.querySelector(".flow-music"), document.querySelector(".flow-text-style"), document.querySelector(".flow-copy-helper")],
    export: [document.querySelector(".flow-preview-panel")]
  };
  Object.entries(groups).forEach(([panel, nodes]) => nodes.filter(Boolean).forEach((node) => { node.dataset.mobilePanel = panel; }));
}
function showMobileFlowPanel(panel) {
  if (!mobileFlowOrder.includes(panel)) return;
  mobileFlowPanel = panel;
  document.querySelectorAll("[data-mobile-panel]").forEach((node) => node.classList.toggle("mobile-panel-active", node.dataset.mobilePanel === panel));
  document.querySelectorAll("[data-mobile-flow]").forEach((button) => {
    const active = button.dataset.mobileFlow === panel; button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
  });
  const index = mobileFlowOrder.indexOf(panel);
  $("#mobile-flow-prev").disabled = index === 0;
  syncMobileFlowAction();
  document.querySelector(".flow-controls")?.classList.toggle("mobile-empty", panel === "export");
  document.querySelector(".flow-layout")?.scrollIntoView?.({ behavior:"smooth", block:"start" });
}

function syncMobileOverlayState() {
  document.body.classList.toggle("settings-open", !$("#settings-panel")?.classList.contains("hidden"));
}

const settingsPanelObserver = new MutationObserver(syncMobileOverlayState);
if ($("#settings-panel")) settingsPanelObserver.observe($("#settings-panel"), { attributes:true, attributeFilter:["class"] });
syncMobileOverlayState();

const mobileKeyboardField = 'textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"])';
document.addEventListener("focusin", (event) => {
  if (!window.matchMedia("(max-width:650px)").matches || !event.target.matches?.(mobileKeyboardField)) return;
  document.body.classList.add("keyboard-open");
  window.setTimeout(() => event.target.scrollIntoView?.({ block:"center", behavior:"smooth" }), 180);
});
document.addEventListener("focusout", (event) => {
  if (!event.target.matches?.(mobileKeyboardField)) return;
  window.setTimeout(() => {
    if (!document.activeElement?.matches?.(mobileKeyboardField)) document.body.classList.remove("keyboard-open");
  }, 120);
});
window.visualViewport?.addEventListener("resize", () => {
  if (!document.body.classList.contains("keyboard-open")) return;
  window.setTimeout(() => document.activeElement?.scrollIntoView?.({ block:"center", behavior:"smooth" }), 80);
});
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
function contentModeLabel(content = {}) {
  if (content.fallback || content.mode === "orbit-demo") return "Kaynak taslağı";
  return content.model || content.mode || "Manuel";
}
function projectStatus(item) {
  if (item.render?.status === "ready") return ["Video hazır", "ready"];
  if (item.render?.status === "processing") return ["Video hazırlanıyor", "processing"];
  if (item.render?.status === "failed") return ["Video oluşturulamadı", "failed"];
  if (item.status === "approved") return ["Video oluşturulacak", "approved"];
  if (item.status === "review") return ["Taslak kontrol edilecek", "review"];
  return [item.status || "Yeni", "new"];
}
function projectNextAction(item) {
  if (item.render?.status === "ready") return ["Video hazır", "Videoyu aç"];
  if (item.render?.status === "failed") return ["Video oluşturulamadı", "Sorunu gör ve tekrar dene"];
  if (item.status === "approved") return ["Video oluşturulmaya hazır", "Videoyu oluştur"];
  if (item.status === "review") return ["Taslak kontrol edilmeyi bekliyor", "Kontrol et"];
  return ["Proje düzenlenmeye hazır", "Düzenlemeye devam et"];
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
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 6);
  const latest = recent[0];
  const resume = $("#resume-project");
  resume.classList.toggle("hidden", !latest);
  if (latest) {
    const [nextLabel, actionLabel] = projectNextAction(latest);
    const preview = latest.visualAssets?.[0]?.previewUrl || latest.sourceAsset?.previewUrl || "";
    resume.innerHTML = `<div class="resume-project-preview">${preview ? `<img src="${preview}" alt="">` : `<span>▶</span>`}</div><div><small>KALDIĞIN YERDEN DEVAM ET</small><h2>${esc(latest.content?.title || "Adsız proje")}</h2><p>${nextLabel} · Son işlem ${formatDate(latest.updatedAt || latest.createdAt, true)}</p></div><button class="primary" data-resume-project="${latest.id}">${actionLabel} →</button>`;
  }
  $("#recent-projects").classList.toggle("empty-state", !recent.length);
  $("#recent-projects").innerHTML = recent.length ? recent.map((item) => {
    const [label, className] = projectStatus(item);
    return `<article class="project-row" data-open-project="${item.id}">
      <img src="${item.sourceAsset?.previewUrl || ""}" alt="${esc(item.content?.title)}">
      <div class="project-main"><h3>${esc(item.content?.title || "Adsız proje")}</h3><p>${esc(item.sourceAsset?.sourceLabel || "Proje")} • ${esc(contentModeLabel(item.content))}</p></div>
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
  renderLocalAnalytics();
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
function updateCreatorChecklist(itemOverride) {
  const item = itemOverride || state.productions.find((entry) => entry.id === $("#editor-id").value);
  const host = $("#creator-checklist");
  if (!item || !host) return;
  const title = $("#editor-title").value.trim();
  const hook = $("#editor-hook").value.trim();
  const narration = $("#editor-narration").value.trim();
  const wordCount = narration.split(/\s+/).filter(Boolean).length;
  const duration = Math.max(1, Math.round(wordCount / 2.65));
  const assets = (item.visualAssets?.length ? item.visualAssets : item.images?.length ? item.images : [item.sourceAsset]).filter(Boolean);
  const checks = [
    { ok:hook.split(/\s+/).filter(Boolean).length >= 6, tr:"Açılış cümlesi ilk saniyelere hazır", en:"The opening line is ready for the first seconds", es:"La frase inicial está lista para los primeros segundos" },
    { ok:wordCount >= 20, tr:"Seslendirme metni yeterli uzunlukta", en:"The narration has enough detail", es:"La narración tiene suficiente detalle" },
    { ok:assets.length >= 3, tr:"Akış için en az 3 farklı görsel var", en:"There are at least 3 visuals for the flow", es:"Hay al menos 3 imágenes para el flujo" }
  ];
  const copy = {
    tr:{ kicker:"İÇERİK ÜRETİCİSİ KONTROLÜ", title:"Video özeti", ready:"Videoya hazır", improve:"Küçük düzenleme öneriliyor", chars:"başlık karakteri", seconds:"tahmini saniye", visuals:"görsel" },
    en:{ kicker:"CREATOR CHECK", title:"Video summary", ready:"Ready for video", improve:"A small edit is recommended", chars:"title characters", seconds:"estimated seconds", visuals:"visuals" },
    es:{ kicker:"CONTROL DEL CREADOR", title:"Resumen del vídeo", ready:"Listo para vídeo", improve:"Se recomienda un pequeño ajuste", chars:"caracteres del título", seconds:"segundos estimados", visuals:"imágenes" }
  }[lang()];
  const allReady = Boolean(title) && checks.every((check) => check.ok);
  host.innerHTML = `<div class="creator-checklist-head"><div><span>${copy.kicker}</span><h3>${copy.title}</h3></div><b>${allReady ? `✓ ${copy.ready}` : copy.improve}</b></div>
    <div class="creator-metrics"><div><strong>${title.length}</strong><small>${copy.chars}</small></div><div><strong>≈ ${duration}</strong><small>${copy.seconds}</small></div><div><strong>${assets.length}</strong><small>${copy.visuals}</small></div></div>
    <div class="creator-checks">${checks.map((check) => `<span class="${check.ok ? "" : "warn"}"><i>${check.ok ? "✓" : "!"}</i>${check[lang()]}</span>`).join("")}</div>`;
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
    `<figure><img src="${asset.previewUrl}" alt="${esc(asset.title)}">
      <div class="editor-asset-order"><button type="button" title="Sola taşı" data-move-image="left" data-image-index="${index}" data-id="${item.id}" ${index === 0 ? "disabled" : ""}>←</button><b>${index + 1}</b><button type="button" title="Sağa taşı" data-move-image="right" data-image-index="${index}" data-id="${item.id}" ${index === assets.length - 1 ? "disabled" : ""}>→</button></div>
      ${assets.length > 1 ? `<button type="button" class="editor-asset-remove" title="Görseli kaldır" aria-label="Görseli kaldır" data-remove-image="${asset.assetId || asset.nasaId}" data-id="${item.id}">×</button>` : ""}
      <figcaption>${index + 1}. ${esc(asset.sourceLabel || "Görsel")}${asset.license ? ` · ${esc(asset.license)}` : ""}</figcaption></figure>`
  ).join("");
  updateCreatorChecklist(item);
  renderEditorNext(item);
  showStep("editor");
}
function renderEditorNext(item) {
  const isReady = item.render?.status === "ready";
  const needsRender = item.status === "approved" && !isReady;
  const help = isReady ? t("readyHelp")
    : item.render?.status === "stale" ? t("staleHelp")
    : needsRender ? t("renderHelp") : t("reviewHelp");
  const telegramButton = state.runtime?.telegramConfigured
    ? `<button class="telegram-review" data-telegram-review="${item.id}">Telegram'a gönder ✈</button>` : "";
  let action = item.telegram?.status === "pending"
    ? `<div class="telegram-review-state"><b>Telegram editör yanıtı bekleniyor</b><button class="ghost" data-telegram-sync="${item.id}">Yanıtı kontrol et ↻</button></div>`
    : `<div class="review-actions"><button class="primary large" data-editor-approve="${item.id}">${t("approve")} →</button>${telegramButton}</div>`;
  if (needsRender) {
    action = `<button class="primary large" data-editor-render="${item.id}">${t("renderVideo")} ▶</button>`;
  }
  if (isReady) {
    const youtubeAction = item.youtube?.videoId
      ? `<a class="youtube-uploaded" href="${item.youtube.url}" target="_blank" rel="noopener noreferrer">✓ YouTube Studio'da aç ↗</a>`
      : state.runtime?.deployment !== "cloudflare" && state.runtime?.youtubeOauthClientConfigured
        ? `<button class="youtube-upload" data-youtube-upload="${item.id}">YouTube'a gizli yükle ↑</button>` : "";
    action = `<div class="editor-ready-actions"><a class="primary-link" href="${item.render.videoUrl}?download=1">${t("download")}</a><a href="${item.render.audioUrl}?download=1">Ses dosyası (MP3)</a><a href="${item.render.captionsUrl}?download=1">Altyazı dosyası (SRT)</a>${item.render.creditsUrl ? `<a href="${item.render.creditsUrl}?download=1">Görsel kaynakları</a>` : ""}${youtubeAction}</div>`;
  }
  $("#editor-next").innerHTML = `<div><span>${t("nextStep")}</span><h3>${help}</h3>${action}</div>
    ${isReady ? `<video controls playsinline src="${item.render.videoUrl}"></video>` : ""}`;
}
function renderState() {
  renderNicheOptions(state.settings.niche || "education");
  $("#audience").value = state.settings.audience || "";
  $("#provider").value = state.settings.provider || "gemini";
  updateModelChoices(state.settings.textModel);
  $("#integration-provider").value = state.settings.provider === "claude" ? "anthropic" : (state.settings.provider || "gemini");
  $("#content-language").value = state.settings.contentLanguage || "English";
  if ($("#project-content-language")) $("#project-content-language").value = state.settings.contentLanguage || "English";
  $("#ui-language").value = lang();
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
  renderAccessOverview();
  renderDashboard();
  renderProjects();
  renderFileLibrary();
  localizeStatic();
  const selectedImageProject = $("#image-project")?.value;
  const imageProjects = state.productions.filter((item) => item.status === "approved");
  $("#multi-image-toolbar").classList.toggle("hidden", !imageProjects.length);
  $("#image-project").innerHTML = imageProjects.map((item) =>
    `<option value="${item.id}">${esc(item.content?.title || "Adsız proje")}</option>`
  ).join("");
  if (imageProjects.some((item) => item.id === selectedImageProject)) {
    $("#image-project").value = selectedImageProject;
  }
  renderSelectedProjectImages();

  $("#ideas").classList.toggle("empty-state", !state.ideas.length);
  $("#ideas").innerHTML = state.ideas.length ? state.ideas.map((idea) => `
    <article class="studio-card split-card">
      <img class="queue-image" src="${idea.sourceAsset?.previewUrl || idea.nasaAsset?.previewUrl || ""}" alt="${esc(idea.topic)}">
      <div class="card-body">
        <div class="meta-row"><span class="pill">${esc(idea.sourceAsset?.sourceLabel || "NASA")} ${esc(idea.sourceAsset?.assetId || idea.nasaAsset?.nasaId)}</span><span>${(idea.sourceAsset?.dateCreated || idea.nasaAsset?.dateCreated || "").slice(0,10)}</span></div>
        <h3>${esc(idea.topic)}</h3>
        <p>${esc(idea.sourceAsset?.description || idea.nasaAsset?.description).slice(0,260)}…</p>
        ${angleLabMarkup(idea)}
      </div>
    </article>`).join("") : t("noIdeas");

  const review = state.productions.filter((item) => item.status === "review");
  $("#productions-review").classList.toggle("empty-state", !review.length);
  $("#productions-review").innerHTML = review.length ? review.map((item) => `
    <article class="studio-card review-card">
      ${sourceFigure(item)}
      <div class="script-pane">
        <div class="meta-row"><div class="review-pills"><span class="pill accent">${esc(contentModeLabel(item.content))}</span>${item.angle?.label ? `<span class="pill angle-pill">${esc(item.angle.label)}</span>` : ""}</div><span>≈ ${Math.max(20, Math.round((item.content.narration || "").length / 14))} sn</span></div>
        <h3>${esc(item.content.title)}</h3>
        <blockquote>${esc(item.content.hook)}</blockquote>
        ${retentionMapMarkup(item)}
        <div class="script-text">${esc(item.content.narration)}</div>
        <div class="button-row"><button class="primary" data-review="approve" data-id="${item.id}">${t("approve")}</button><button class="ghost danger" data-review="reject" data-id="${item.id}">${t("reject")}</button></div>
      </div>
    </article>`).join("") : t("noReview");

  const ready = state.productions.filter((item) => item.status === "approved");
  $("#productions-render").classList.toggle("empty-state", !ready.length);
  $("#productions-render").innerHTML = ready.length ? ready.map((item) => `
    <article class="studio-card render-card">
      <div class="render-copy">
        <div class="meta-row"><span class="pill success">VİDEOYA HAZIR</span><span>Seslendirme + altyazı</span></div>
        <h3>${esc(item.content.title)}</h3>
        <p>${item.visualAssets?.length || item.images?.length || 1} görsel · ${esc(item.contentLanguage || "Türkçe")} seslendirme · altyazı · ${item.contentType === "youtube" ? "16:9" : "9:16"} video</p>
        <div class="scene-strip">${(item.visualAssets?.length ? item.visualAssets : [item.sourceAsset]).filter(Boolean).map((asset, index, assets) => `
          <div class="scene-thumb"><img src="${asset.previewUrl}" alt="${esc(asset.title)}"><b>${index + 1}</b>
          ${assets.length > 1 ? `<button title="Görseli kaldır" data-remove-image="${asset.assetId || asset.nasaId}" data-id="${item.id}">×</button>` : ""}</div>
        `).join("")}</div>
        <button class="ghost add-scene" data-add-scene="${item.id}">${t("addScene")}</button>
        ${item.render?.status === "ready" ? `<div class="downloads"><a href="${item.render.videoUrl}?download=1">Video (MP4)</a><a href="${item.render.audioUrl}?download=1">Ses (MP3)</a><a href="${item.render.captionsUrl}?download=1">Altyazı (SRT)</a>${item.render.creditsUrl ? `<a href="${item.render.creditsUrl}?download=1">Görsel kaynakları</a>` : ""}</div>` : `<button class="primary large" data-render="${item.id}">${t("renderVideo")} <span>▶</span></button>`}
        ${item.render?.status === "failed" ? `<p class="error-box">${esc(item.render.error)}</p>` : ""}
      </div>
      <div class="phone-frame ${item.contentType === "youtube" ? "landscape-frame" : ""}">
        ${item.render?.status === "ready" ? `<video controls playsinline src="${item.render.videoUrl}"></video>` : `<img src="${item.sourceAsset?.previewUrl || ""}" alt="${esc(item.content.title)}"><div class="play-hint">Video burada görünecek</div>`}
      </div>
    </article>`).join("") : t("noRender");
  updateSourceMode();
  translateStaticTree();
}
async function refresh() {
  const [nextState, filesResult] = await Promise.all([api("/api/state"), api("/api/files")]);
  state = nextState;
  mediaFiles = filesResult.files || [];
  renderState();
  $("#flow-cloud-save")?.classList.toggle("hidden", !state.runtime?.r2Configured);
}
function renderSelectedProjectImages() {
  const projectId = $("#image-project")?.value;
  const project = state.productions.find((item) => item.id === projectId);
  const tray = $("#project-image-tray");
  if (!tray) return;
  tray.classList.toggle("hidden", !project || sourceStartsNewProject);
  if (!project || sourceStartsNewProject) return;
  const assets = (project.visualAssets?.length ? project.visualAssets : [project.sourceAsset]).filter(Boolean);
  $("#project-image-summary").textContent = `${project.content?.title || "Adsız proje"} · ${assets.length} görsel`;
  $("#project-image-list").innerHTML = assets.length ? assets.map((asset, index) => `
    <figure class="project-image-item">
      <img src="${asset.previewUrl}" alt="${esc(asset.title || `Görsel ${index + 1}`)}">
      ${assets.length > 1 ? `<button type="button" aria-label="Görseli kaldır" title="Görseli kaldır" data-remove-image="${asset.assetId || asset.nasaId}" data-id="${project.id}">×</button>` : ""}
      <figcaption>${index + 1}. ${esc(asset.title || asset.sourceLabel || "Görsel")}</figcaption>
    </figure>`).join("") : `<div class="project-image-empty">Bu projeye henüz görsel eklenmedi.</div>`;
}
function updateSourceMode() {
  const source = $("#media-source").value;
  const cloudflare = source === "cloudflare";
  const custom = source === "custom";
  const urlSource = source === "url";
  const deviceOnlyUpload = custom && state.runtime?.deployment === "cloudflare";
  $("#nasa-query").classList.toggle("hidden", custom || urlSource);
  $("#nasa-query").disabled = custom || urlSource;
  $("#custom-image-upload").classList.toggle("hidden", !custom);
  $("#custom-image-file").required = custom;
  $("#url-image-import").classList.toggle("hidden", !urlSource);
  $("#url-image-address").required = urlSource;
  $("#nasa-query").placeholder = cloudflare
    ? "Örn: friendly cartoon robot explaining the solar system"
    : "Mars, Webb, Ay, Dünya…";
  $("#nasa-query").value = cloudflare && $("#nasa-query").value === "Mars"
    ? "" : $("#nasa-query").value;
  $("#nasa-form button").textContent = urlSource ? "URL’yi doğrula ve ekle" : custom
    ? deviceOnlyUpload ? "Görseli videoya ekle" : "Görseli projeye ekle"
    : cloudflare ? "AI görsel üret" : t("search");
  $(".hero-search>p").textContent = urlSource
    ? "HTTPS adresi erişilebilirlik, dosya türü ve boyut açısından doğrulanır; kullanım hakkı kullanıcı tarafından onaylanır."
    : custom
    ? deviceOnlyUpload
      ? "Görsel cihazından ayrılmadan Visual Flow videona eklenir."
      : "Sana ait veya kullanım iznin bulunan JPG, PNG ya da WebP görselini seçili projeye yükle."
    : cloudflare
      ? "Ne görmek istediğini yaz; TERZİ özgün bir dikey sahne oluşturup seçili projeye eklesin."
      : t("sourceHelp");
  $("#kids-search-hints").classList.toggle(
    "hidden", cloudflare || custom || urlSource || state.settings.contentProfile !== "kids"
  );
  translateStaticTree();
}
function clearCustomImageFile() {
  if (customImagePreviewUrl) URL.revokeObjectURL(customImagePreviewUrl);
  customImagePreviewUrl = "";
  $("#custom-image-file").value = "";
  $("#custom-image-name").textContent = { tr:"Dosya seçilmedi", en:"No file selected", es:"Ningún archivo seleccionado" }[lang()];
  $("#custom-image-upload").classList.remove("selected");
  $("#custom-image-preview").removeAttribute("src");
  $("#custom-image-preview").classList.add("hidden");
  $("#custom-image-icon").classList.remove("hidden");
}
async function readAsDataUrl(file, options = {}) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Görsel okunamadı");
  const maxDimension = options.maxDimension || 1600;
  const targetLength = options.targetLength || 1_150_000;
  const maxLength = options.maxLength || 1_200_000;
  const minQuality = options.minQuality || .48;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = options.initialQuality || .84;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > targetLength && quality > minQuality) {
    quality -= .08;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  if (result.length > maxLength) throw new Error("Görsel yükleme için fazla büyük; daha küçük bir dosya seç");
  return result;
}
function setCreationMode(mode) {
  creationMode = ["visual-story", "story-visual", "manual", "automatic"].includes(mode) ? mode : "";
  if (["visual-story", "story-visual"].includes(creationMode)) $(".creation-more").open = true;
  document.querySelectorAll("[data-creation-mode]").forEach((button) =>
    (button.classList.toggle("active", button.dataset.creationMode === creationMode), button.setAttribute("aria-pressed", String(button.dataset.creationMode === creationMode)))
  );
  $("#creation-workspace").classList.toggle("hidden", !creationMode);
  $("#visual-story-mode").classList.toggle("hidden", creationMode !== "visual-story");
  $("#story-visual-mode").classList.toggle("hidden", creationMode !== "story-visual");
  $("#manual-creation-mode").classList.toggle("hidden", creationMode !== "manual");
  $("#automatic-creation-mode").classList.toggle("hidden", creationMode !== "automatic");
  if (creationMode === "automatic" && !$("#automatic-audience").value.trim()) {
    $("#automatic-audience").value = state.settings.audience || "";
  }
  document.querySelectorAll(".creation-progress b").forEach((step, index) => step.classList.toggle("active", Boolean(creationMode) && index <= 1));
  if (creationMode) setTimeout(() => $("#creation-workspace").scrollIntoView({ behavior:"smooth", block:"start" }), 50);
}
function resetCreationWizard() {
  setCreationMode("");
  $("#story-visual-form").reset();
  $("#manual-creation-form").reset();
  $("#automatic-creation-form")?.reset();
  if ($("#project-content-language")) $("#project-content-language").value = state.settings.contentLanguage || "English";
  $("#automatic-progress")?.classList.add("hidden");
  updateAutomaticPhotoMode();
  $("#manual-files-summary").textContent = { tr:"Henüz görsel seçilmedi", en:"No images selected yet", es:"Aún no se seleccionaron imágenes" }[lang()];
}
function openControlAction(action) {
  if (action === "flow" || action === "projects") return showStep(action);
  if (action === "integrations") {
    showStep("dashboard");
    $("#settings-panel")?.classList.remove("hidden");
    document.querySelector('[data-settings-tab="integrations"]')?.click();
    return;
  }
  sourceStartsNewProject = true;
  resetCreationWizard();
  showStep("source");
  if (["automatic", "manual", "story-visual", "visual-story"].includes(action)) setCreationMode(action);
  if (action === "trends" || action === "url") {
    setCreationMode("visual-story");
    if (action === "url") {
      $("#media-source").value = "url";
      updateSourceMode();
    }
    setTimeout(() => $(action === "trends" ? ".trend-discovery" : "#url-image-import")?.scrollIntoView({ behavior:"smooth", block:"start" }), 120);
  }
}
function updateFormatNote() {
  const format = $("#production-format").value;
  $("#format-note").textContent = format === "youtube"
    ? "Yatay 16:9 video. Uzun senaryo ve süre metne göre otomatik oluşturulur."
    : format === "reels"
      ? "Dikey 9:16 Reels. Süre seslendirme metnine göre otomatik belirlenir."
      : "Dikey 9:16 Shorts. Süre seslendirme metnine göre otomatik belirlenir.";
}

let flowScenes = [];
let flowNarrationContext = { text: "", contentLanguage: "", style: "natural" };
const flowNarrationAudioCache = new Map();
const CONTENT_LANGUAGE_CODES = { Turkish:"tr", English:"en", Spanish:"es", German:"de", French:"fr", Portuguese:"pt", Italian:"it", Arabic:"ar", Hindi:"hi", Chinese:"zh", Japanese:"ja", Korean:"ko", Russian:"ru", Dutch:"nl", Polish:"pl", Indonesian:"id", Vietnamese:"vi", Ukrainian:"uk", Thai:"th" };
function selectedContentLanguage() { return $("#project-content-language")?.value || state.settings.contentLanguage || "English"; }
let sourceStartsNewProject = false;
let flowOutput = null;
let flowMusic = null;
let activeFlowCopy = null;
let draggedFlowSceneId = null;
let flowTextStyle = { position: "template", size: "medium", font: "modern", color: "#ffffff", background: "none", safe: true };
let editingFlowCropId = null;
let flowHistory = [];
let flowHistoryIndex = -1;
let flowHistoryTimer = null;
let flowAutosaveTimer = null;
let restoringFlowHistory = false;
const FLOW_AUTOSAVE_ID = "__autosave__";
const FLOW_PACKAGE_VERSION = 1;
let currentFlowDraftId = null;
const FLOW_DB_NAME = "orbit-studio-local";
const FLOW_STORE_NAME = "flow-drafts";
const FLOW_VIDEO_STORE_NAME = "flow-videos";
const FLOW_LATEST_VIDEO_ID = "__latest_video__";
const WELCOME_SEEN_KEY = "orbit-welcome-seen-v1";
let flowTemplate = "travel";
const flowTemplates = {
  travel: { name: "Gezi", format: "vertical", seconds: 3, accent: "#8b5cf6", overlay: "bottom", motion: .055 },
  quote: { name: "Söz", format: "square", seconds: 4, accent: "#f59e0b", overlay: "center", motion: .025 },
  culture: { name: "Tarih & kültür", format: "vertical", seconds: 4, accent: "#dc7354", overlay: "bottom", motion: .04 },
  motivation: { name: "Motivasyon", format: "vertical", seconds: 2, accent: "#ec4899", overlay: "center", motion: .075 },
  product: { name: "Ürün", format: "square", seconds: 3, accent: "#2563eb", overlay: "bottom", motion: .035 },
  education: { name: "Eğitim", format: "landscape", seconds: 4, accent: "#16a34a", overlay: "top", motion: .03 }
};
const flowCopyPresets = {
  travel: [
    ["Places that feel unreal", "Dreamlike discovery", ["Some places feel like another world.", "Every turn reveals a new color.", "The best view waits beyond the familiar.", "Slow down and take it all in.", "Where would you go first?"]],
    ["A weekend worth remembering", "Quick travel diary", ["We left before the city woke up.", "The road became part of the story.", "Then we found this hidden view.", "No filter could improve this moment.", "Save this place for later."]],
    ["See the world differently", "Perspective journey", ["Look beyond the obvious.", "Notice the details others miss.", "Change your angle.", "Let the place surprise you.", "A new perspective changes everything."]]
  ],
  quote: [
    ["A reminder for today", "Minimal quote", ["You do not need to have it all figured out.", "You only need the courage to begin.", "Small steps still move you forward.", "Keep going."]],
    ["Read this twice", "Bold statement", ["Your attention shapes your life.", "Protect it.", "Choose what deserves your energy.", "Let the rest go."]],
    ["Growth is often quiet", "Reflective thought", ["Not every change makes noise.", "Some progress happens within.", "Trust what you are building.", "You are closer than you think."]]
  ],
  culture: [
    ["The story behind this place", "Historical reveal", ["Every landmark begins with a story.", "Its walls witnessed generations.", "Details reveal the lives once lived here.", "History survives when we keep telling it.", "What should we explore next?"]],
    ["A detail history forgot", "Archive discovery", ["At first, it looks ordinary.", "But one detail changes the whole story.", "It connects the past to the present.", "This is why archives matter."]],
    ["Symbols that shaped a nation", "Cultural symbols", ["A symbol can carry centuries of meaning.", "It remembers struggle and hope.", "It brings generations together.", "Culture lives through shared memory."]]
  ],
  motivation: [
    ["Start before you feel ready", "Momentum", ["Waiting will not build momentum.", "One small action will.", "Begin with what you have.", "Improve while moving.", "Start today."]],
    ["Your future needs consistency", "Daily discipline", ["Motivation comes and goes.", "Consistency stays.", "Show up on ordinary days.", "That is where results are built."]],
    ["Make the next move", "Fast encouragement", ["Stop replaying the doubt.", "Choose one clear step.", "Take it now.", "Momentum will follow."]]
  ],
  product: [
    ["Meet your new everyday essential", "Product reveal", ["Designed for the way you live.", "Simple where it matters.", "Thoughtful in every detail.", "Ready when you are.", "Discover it today."]],
    ["Three reasons you will love it", "Benefit list", ["First: it saves you time.", "Second: it is effortless to use.", "Third: it fits your routine.", "One product, less friction."]],
    ["The detail makes the difference", "Feature focus", ["Look a little closer.", "Every element has a purpose.", "Built to feel intuitive.", "Made to last beyond the trend."]]
  ],
  education: [
    ["Learn this in 30 seconds", "Quick lesson", ["Let us start with the big idea.", "Here is the simplest explanation.", "Now look at this example.", "This is the part to remember.", "Can you explain it back?"]],
    ["Did you know?", "Curious fact", ["Here is a surprising fact.", "It happens because of one simple principle.", "You can see it in everyday life.", "Now you will notice it everywhere."]],
    ["Let us count together", "Kids learning", ["Can you find number one?", "Now let us count two objects.", "Three comes right after two.", "Four means one more.", "Great job — let us try again!"]]
  ]
};
const DEFAULT_MOTIVATION_LINES = {
  tr: ["Bugün attığın küçük adım, yarının büyük değişimini başlatır.", "Hazır hissetmeyi bekleme; ilerledikçe güçlenirsin.", "Kendine verdiğin sözleri tutmak da bir başarıdır.", "Yavaş ilerlemek, yerinde saymak değildir.", "Devam et. Emeğin zamanla görünür olur."],
  en: ["The small step you take today starts tomorrow's bigger change.", "Do not wait to feel ready; you grow as you move.", "Keeping a promise to yourself is an achievement too.", "Moving slowly is not the same as standing still.", "Keep going. Your effort will become visible with time."],
  es: ["El pequeño paso de hoy inicia el gran cambio de mañana.", "No esperes a sentirte lista; creces mientras avanzas.", "Cumplir una promesa contigo también es un logro.", "Avanzar lento no es lo mismo que quedarse quieta.", "Sigue. Tu esfuerzo se hará visible con el tiempo."]
};
let textPostCreating = false;
const publishHashtags = {
  travel: ["travel", "explore", "beautifuldestinations", "wanderlust", "reels"],
  quote: ["quotes", "mindset", "dailyreminder", "inspiration", "motivation"],
  culture: ["history", "culture", "heritage", "learn", "documentary"],
  motivation: ["motivation", "mindset", "selfgrowth", "discipline", "success"],
  product: ["product", "newlaunch", "design", "musthave", "discover"],
  education: ["education", "learn", "didyouknow", "kidslearning", "explained"]
};
const platformProfiles = {
  youtube: { name:"YouTube", format:"vertical", recommendation:{tr:"Shorts için 9:16; uzun anlatılar için 16:9 seçebilirsin.",en:"Use 9:16 for Shorts or switch to 16:9 for longer stories.",es:"Usa 9:16 para Shorts o 16:9 para historias largas."}, titleLimit:100, tags:["youtube","shorts"] },
  instagram: { name:"Instagram", format:"vertical", recommendation:{tr:"Reels için 9:16 ve hızlı açılış önerilir.",en:"9:16 and a fast opening work best for Reels.",es:"Para Reels se recomienda 9:16 y un inicio rápido."}, titleLimit:120, tags:["instagram","reels"] },
  tiktok: { name:"TikTok", format:"vertical", recommendation:{tr:"9:16, güçlü ilk saniye ve kısa sahneler önerilir.",en:"Use 9:16, a strong first second and short scenes.",es:"Usa 9:16, un primer segundo fuerte y escenas cortas."}, titleLimit:120, tags:["tiktok","fyp"] },
  facebook: { name:"Facebook", format:"vertical", recommendation:{tr:"Reels için 9:16; akış için kare formatı da uygundur.",en:"Use 9:16 for Reels; square also works well in the feed.",es:"Usa 9:16 para Reels; el formato cuadrado funciona en el feed."}, titleLimit:120, tags:["facebook","facebookreels"] },
  pinterest: { name:"Pinterest", format:"vertical", recommendation:{tr:"Dikey, bilgi veren ve kaydedilebilir içerikler önerilir.",en:"Vertical, useful and save-worthy content is recommended.",es:"Se recomienda contenido vertical, útil y fácil de guardar."}, titleLimit:100, tags:["pinterest","ideas"] },
  linkedin: { name:"LinkedIn", format:"landscape", recommendation:{tr:"16:9, açıklayıcı başlık ve profesyonel bağlam önerilir.",en:"Use 16:9 with a clear title and professional context.",es:"Usa 16:9 con un título claro y contexto profesional."}, titleLimit:120, tags:["linkedin","professional"] },
  x: { name:"X", format:"landscape", recommendation:{tr:"Kısa metin, 16:9 video ve tek güçlü fikir önerilir.",en:"Use concise copy, 16:9 video and one strong idea.",es:"Usa texto breve, vídeo 16:9 y una idea fuerte."}, titleLimit:100, tags:["video","x"] }
};
function updateFlowPlatformNote() {
  const profile = platformProfiles[flowPlatform];
  $("#flow-platform-note").innerHTML = `<b>${profile.name}</b><span>${profile.recommendation[lang()] || profile.recommendation.tr}</span><small>${$("#flow-format option:checked").textContent}</small>`;
}
function selectFlowPlatform(platform, applyFormat = true) {
  flowPlatform = platformProfiles[platform] ? platform : "youtube";
  $("#flow-platform").value = flowPlatform; $("#publish-platform").value = flowPlatform;
  if (applyFormat) $("#flow-format").value = platformProfiles[flowPlatform].format;
  updateFlowPlatformNote(); updateFlowPreview();
}

function openFlowDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FLOW_DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FLOW_STORE_NAME)) {
        request.result.createObjectStore(FLOW_STORE_NAME, { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains(FLOW_VIDEO_STORE_NAME)) {
        request.result.createObjectStore(FLOW_VIDEO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function useFlowStore(mode, operation, storeName = FLOW_STORE_NAME) {
  const database = await openFlowDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
}
async function saveLocalFlowOutput() {
  if (!flowOutput?.blob) throw new Error("Önce videoyu oluştur");
  const persistent = await requestPersistentStorage().catch(() => false);
  await useFlowStore("readwrite", (store) => store.put({
    id:FLOW_LATEST_VIDEO_ID, blob:flowOutput.blob, fileName:flowOutput.fileName,
    type:flowOutput.type, title:$("#flow-title").value || "TERZİ video",
    draftId:currentFlowDraftId || null, savedAt:new Date().toISOString()
  }), FLOW_VIDEO_STORE_NAME);
  const estimate = await navigator.storage?.estimate?.().catch(() => null);
  const usedMb = estimate ? Math.round(estimate.usage / 1024 / 1024) : null;
  const status = $("#flow-local-status");
  status.classList.remove("hidden");
  status.textContent = `✓ Video bu cihazda saklandı${persistent ? " · kalıcı depolama açık" : ""}${usedMb !== null ? ` · ${usedMb} MB kullanım` : ""}`;
  return true;
}
async function restoreLocalFlowOutput() {
  const saved = await useFlowStore("readonly", (store) => store.get(FLOW_LATEST_VIDEO_ID), FLOW_VIDEO_STORE_NAME);
  if (!saved?.blob || !(saved.blob instanceof Blob) || flowOutput || flowRendering) return false;
  if (flowOutput?.url) URL.revokeObjectURL(flowOutput.url);
  flowOutput = { blob:saved.blob, url:URL.createObjectURL(saved.blob),
    fileName:saved.fileName || "terzi-video.webm", type:saved.type || saved.blob.type,
    localSavedAt:saved.savedAt };
  $("#flow-video").src = flowOutput.url;
  $("#flow-download").href = flowOutput.url;
  $("#flow-download").download = flowOutput.fileName;
  $("#flow-result").classList.remove("hidden");
  $("#flow-local-status").classList.remove("hidden");
  $("#flow-local-status").textContent = `Son cihaz videosu geri yüklendi · ${new Date(saved.savedAt).toLocaleString()}`;
  return true;
}

function flowSnapshot() {
  return {
    title: $("#flow-title").value, template: flowTemplate, platform: flowPlatform, format: $("#flow-format").value,
    duration: $("#flow-duration").value, motion: $("#flow-motion").value,
    transition: $("#flow-transition").value, textStyle: { ...flowTextStyle }, music: flowMusic,
    scenes: flowScenes.map((scene) => ({ ...scene }))
  };
}
function flowSnapshotSignature(snapshot) {
  return JSON.stringify({ ...snapshot, music: snapshot.music?.file?.name || null,
    scenes: snapshot.scenes.map(({ id, text, seconds, motion, transition, cropX, cropY, cropZoom }) => ({ id, text, seconds, motion, transition, cropX, cropY, cropZoom })) });
}
function updateFlowHistoryButtons() {
  $("#flow-undo").disabled = flowHistoryIndex <= 0;
  $("#flow-redo").disabled = flowHistoryIndex < 0 || flowHistoryIndex >= flowHistory.length - 1;
}
function captureFlowHistory() {
  if (restoringFlowHistory) return;
  const snapshot = flowSnapshot(); const signature = flowSnapshotSignature(snapshot);
  if (flowHistory[flowHistoryIndex]?.signature === signature) return;
  flowHistory = flowHistory.slice(0, flowHistoryIndex + 1);
  flowHistory.push({ snapshot, signature });
  if (flowHistory.length > 30) flowHistory.shift();
  flowHistoryIndex = flowHistory.length - 1; updateFlowHistoryButtons();
}
function scheduleFlowPersistence() {
  if (restoringFlowHistory) return;
  clearTimeout(flowHistoryTimer); flowHistoryTimer = setTimeout(captureFlowHistory, 350);
  clearTimeout(flowAutosaveTimer); flowAutosaveTimer = setTimeout(() => saveFlowAutosave().catch(() => {}), 900);
}
function restoreFlowSnapshot(snapshot) {
  restoringFlowHistory = true;
  flowTemplate = snapshot.template; flowPlatform = snapshot.platform || "youtube"; flowScenes = snapshot.scenes.map((scene) => ({ ...scene })); flowMusic = snapshot.music;
  flowTextStyle = { ...snapshot.textStyle };
  $("#flow-title").value = snapshot.title; $("#flow-platform").value = flowPlatform; $("#flow-format").value = snapshot.format;
  $("#flow-duration").value = snapshot.duration; $("#flow-motion").value = snapshot.motion; $("#flow-transition").value = snapshot.transition;
  $("#flow-text-position").value = flowTextStyle.position; $("#flow-text-size").value = flowTextStyle.size;
  $("#flow-text-font").value = flowTextStyle.font; $("#flow-text-color").value = flowTextStyle.color;
  $("#flow-text-background").value = flowTextStyle.background; $("#flow-text-safe").checked = flowTextStyle.safe;
  document.querySelectorAll("[data-flow-template]").forEach((button) => button.classList.toggle("active", button.dataset.flowTemplate === flowTemplate));
  $("#flow-template-name").textContent = flowTemplateName(flowTemplate);
  renderFlowScenes(); restoringFlowHistory = false; updateFlowHistoryButtons(); scheduleFlowPersistence();
}
async function saveFlowAutosave() {
  if (restoringFlowHistory || !flowScenes.length) return;
  const snapshot = flowSnapshot();
  await useFlowStore("readwrite", (store) => store.put({
    id: FLOW_AUTOSAVE_ID, kind: "autosave", title: snapshot.title || "Kurtarma taslağı", updatedAt: new Date().toISOString(),
    template: snapshot.template, platform: snapshot.platform, format: snapshot.format, duration: Number(snapshot.duration), textStyle: snapshot.textStyle,
    music: snapshot.music ? { file: snapshot.music.file } : null, volume: Number($("#flow-music-volume").value),
    scenes: snapshot.scenes.map(({ file, text, seconds, direction, motion, transition, cropX, cropY, cropZoom }) => ({ file, text, seconds, direction, motion, transition, cropX, cropY, cropZoom }))
  }));
}
async function checkFlowRecovery() {
  const recovery = await useFlowStore("readonly", (store) => store.get(FLOW_AUTOSAVE_ID));
  $("#flow-recovery").classList.toggle("hidden", !recovery?.scenes?.length);
}

async function listFlowDrafts() {
  const drafts = await useFlowStore("readonly", (store) => store.getAll());
  return drafts.filter((draft) => draft.id !== FLOW_AUTOSAVE_ID).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function refreshFlowDrafts(selectedId = currentFlowDraftId) {
  const select = $("#flow-draft-select");
  const drafts = await listFlowDrafts();
  select.innerHTML = drafts.length ? `<option value="">${ft("selectDraft")}</option>${drafts.map((draft) =>
    `<option value="${draft.id}">${esc(draft.title || "İsimsiz video")} · ${new Date(draft.updatedAt).toLocaleDateString()}</option>`
  ).join("")}` : `<option value="">${ft("noDraft")}</option>`;
  if (selectedId && drafts.some((draft) => draft.id === selectedId)) select.value = selectedId;
  const selected = Boolean(select.value);
  $("#flow-draft-open").disabled = !selected;
  $("#flow-draft-delete").disabled = !selected;
}

async function saveFlowDraft() {
  if (!flowScenes.length) throw new Error("Taslağı kaydetmek için en az bir fotoğraf ekle");
  const id = currentFlowDraftId || crypto.randomUUID();
  const draft = {
    id, title: $("#flow-title").value.trim() || "İsimsiz video", template: flowTemplate, platform: flowPlatform,
    format: $("#flow-format").value, duration: Number($("#flow-duration").value),
    updatedAt: new Date().toISOString(), music: flowMusic ? { file: flowMusic.file } : null, textStyle: { ...flowTextStyle },
    volume: Number($("#flow-music-volume").value),
    scenes: flowScenes.map(({ file, text, seconds, direction, motion, transition, cropX, cropY, cropZoom }) => ({ file, text, seconds, direction, motion, transition, cropX, cropY, cropZoom }))
  };
  await useFlowStore("readwrite", (store) => store.put(draft));
  currentFlowDraftId = id;
  await refreshFlowDrafts(id);
  toast("Taslak bu cihaza kaydedildi");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
}
function dataUrlToFile(dataUrl, name, expectedFamily) {
  const match = /^data:([^;,]+);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match || !match[1].startsWith(`${expectedFamily}/`)) throw new Error(`Geçersiz ${expectedFamily} dosyası`);
  const binary = atob(match[2]); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: match[1] });
}

async function decodeFlowImage(file) {
  try {
    return await createImageBitmap(file);
  } catch (bitmapError) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height || width * height > 40_000_000) {
        throw new Error("invalid image dimensions");
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return await createImageBitmap(canvas);
    } catch {
      throw new Error(`${file.name || "Görsel"} açılamadı. JPG, PNG veya WebP biçiminde geçerli bir görsel seç.`);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
async function exportFlowProject() {
  if (!flowScenes.length) throw new Error("Dışa aktarmak için en az bir fotoğraf ekle");
  const packageData = {
    schema: "orbit-studio-project", version: FLOW_PACKAGE_VERSION, exportedAt: new Date().toISOString(),
    project: {
      title: $("#flow-title").value, template: flowTemplate, platform: flowPlatform, format: $("#flow-format").value,
      duration: Number($("#flow-duration").value), motion: $("#flow-motion").value,
      transition: $("#flow-transition").value, textStyle: { ...flowTextStyle },
      volume: Number($("#flow-music-volume").value),
      music: flowMusic ? { name: flowMusic.file.name || "music", data: await blobToDataUrl(flowMusic.file) } : null,
      scenes: await Promise.all(flowScenes.map(async (scene, index) => ({
        name: scene.file.name || `scene-${index + 1}`, data: await blobToDataUrl(scene.file), text: scene.text,
        seconds: scene.seconds, direction: scene.direction, motion: scene.motion, transition: scene.transition,
        cropX: scene.cropX ?? 50, cropY: scene.cropY ?? 50, cropZoom: scene.cropZoom || 1
      })))
    }
  };
  const blob = new Blob([JSON.stringify(packageData)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `${($("#flow-title").value || "terzi-project").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "terzi-project"}.terzi`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("TERZİ proje paketi indirildi");
}
async function importFlowProject(file) {
  if (!file || file.size > 120 * 1024 * 1024) throw new Error("Proje paketi en fazla 120 MB olabilir");
  let packageData;
  try { packageData = JSON.parse(await file.text()); } catch { throw new Error("Proje paketi okunamadı"); }
  if (packageData?.schema !== "orbit-studio-project" || packageData.version !== FLOW_PACKAGE_VERSION) throw new Error("Desteklenmeyen TERZİ proje paketi");
  const project = packageData.project;
  if (!project || !Array.isArray(project.scenes) || !project.scenes.length || project.scenes.length > 100) throw new Error("Proje sahneleri geçersiz");
  for (const saved of project.scenes) {
    const validationFile = dataUrlToFile(saved.data, saved.name || "scene", "image");
    if (validationFile.size > 20 * 1024 * 1024) throw new Error("Paketteki bir görsel 20 MB sınırını aşıyor");
    const validationBitmap = await decodeFlowImage(validationFile); validationBitmap.close?.();
  }
  if (project.music?.data) {
    const validationMusic = dataUrlToFile(project.music.data, project.music.name || "music", "audio");
    if (validationMusic.size > 30 * 1024 * 1024) throw new Error("Paketteki müzik 30 MB sınırını aşıyor");
  }
  restoringFlowHistory = true; clearFlowMedia(); currentFlowDraftId = null;
  flowTemplate = flowTemplates[project.template] ? project.template : "travel";
  flowPlatform = platformProfiles[project.platform] ? project.platform : "youtube"; $("#flow-platform").value = flowPlatform;
  $("#flow-title").value = String(project.title || "").slice(0, 120); $("#flow-format").value = ["vertical", "square", "landscape"].includes(project.format) ? project.format : "vertical";
  $("#flow-duration").value = String(Math.max(2, Math.min(5, Number(project.duration) || 3)));
  $("#flow-motion").value = project.motion || "zoom-in"; $("#flow-transition").value = project.transition || "fade";
  flowTextStyle = { ...flowTextStyle, ...(project.textStyle || {}) };
  $("#flow-text-position").value = flowTextStyle.position; $("#flow-text-size").value = flowTextStyle.size; $("#flow-text-font").value = flowTextStyle.font;
  $("#flow-text-color").value = /^#[0-9a-f]{6}$/i.test(flowTextStyle.color) ? flowTextStyle.color : "#ffffff";
  $("#flow-text-background").value = flowTextStyle.background; $("#flow-text-safe").checked = flowTextStyle.safe !== false;
  for (const saved of project.scenes) {
    const sceneFile = dataUrlToFile(saved.data, saved.name || "scene", "image");
    if (sceneFile.size > 20 * 1024 * 1024) throw new Error("Paketteki bir görsel 20 MB sınırını aşıyor");
    flowScenes.push({ ...saved, id: crypto.randomUUID(), file: sceneFile, bitmap: await decodeFlowImage(sceneFile), url: URL.createObjectURL(sceneFile),
      text: String(saved.text || "").slice(0, 500), seconds: Math.max(1, Math.min(10, Number(saved.seconds) || 3)) });
  }
  const allowedMotions = ["zoom-in", "zoom-out", "pan-left", "pan-right", "still"];
  const allowedTransitions = ["fade", "slide", "none"];
  flowScenes.forEach((scene) => {
    scene.motion = allowedMotions.includes(scene.motion) ? scene.motion : "zoom-in";
    scene.transition = allowedTransitions.includes(scene.transition) ? scene.transition : "fade";
    scene.cropX = Math.max(0, Math.min(100, Number(scene.cropX) || 50));
    scene.cropY = Math.max(0, Math.min(100, Number(scene.cropY) || 50));
    scene.cropZoom = Math.max(1, Math.min(1.8, Number(scene.cropZoom) || 1));
  });
  if (project.music?.data) {
    const musicFile = dataUrlToFile(project.music.data, project.music.name || "music", "audio");
    if (musicFile.size > 30 * 1024 * 1024) throw new Error("Paketteki müzik 30 MB sınırını aşıyor");
    flowMusic = { file: musicFile, buffer: null }; $("#flow-music-name").textContent = musicFile.name;
    $("#flow-music-meta").textContent = `${(musicFile.size / 1024 / 1024).toFixed(1)} MB · proje paketinden`;
    $("#flow-music-selected").classList.remove("hidden"); $("#flow-volume-wrap").classList.remove("hidden");
  }
  $("#flow-music-volume").value = String(Math.max(0, Math.min(100, Number(project.volume) || 22)));
  $("#flow-volume-value").textContent = `%${$("#flow-music-volume").value}`;
  document.querySelectorAll("[data-flow-template]").forEach((button) => button.classList.toggle("active", button.dataset.flowTemplate === flowTemplate));
  $("#flow-template-name").textContent = flowTemplateName(flowTemplate);
  restoringFlowHistory = false; renderFlowScenes(); flowHistory = []; flowHistoryIndex = -1; captureFlowHistory(); showStep("flow");
  toast("TERZİ proje paketi açıldı");
}

function clearFlowMedia() {
  flowScenes.forEach((scene) => { URL.revokeObjectURL(scene.url); scene.bitmap?.close?.(); });
  flowScenes = [];
  flowNarrationContext = { text: "", contentLanguage: "", style: "natural" };
  flowMusic = null;
  if (flowOutput?.url) URL.revokeObjectURL(flowOutput.url);
  flowOutput = null;
  $("#flow-result").classList.add("hidden");
  $("#flow-music-selected").classList.add("hidden");
  $("#flow-volume-wrap").classList.add("hidden");
  $("#flow-music-file").value = "";
}

async function loadFlowDraft(id) {
  const draft = await useFlowStore("readonly", (store) => store.get(id));
  if (!draft) throw new Error("Taslak bulunamadı");
  clearFlowMedia();
  currentFlowDraftId = draft.id === FLOW_AUTOSAVE_ID ? null : draft.id;
  flowPlatform = platformProfiles[draft.platform] ? draft.platform : "youtube"; $("#flow-platform").value = flowPlatform;
  $("#flow-title").value = draft.title || "";
  selectFlowTemplate(draft.template || "travel");
  $("#flow-format").value = draft.format || "vertical";
  $("#flow-duration").value = String(draft.duration || 3);
  $("#flow-music-volume").value = String(draft.volume ?? 22);
  $("#flow-volume-value").textContent = `%${draft.volume ?? 22}`;
  flowTextStyle = { ...flowTextStyle, ...(draft.textStyle || {}) };
  $("#flow-text-position").value = flowTextStyle.position;
  $("#flow-text-size").value = flowTextStyle.size;
  $("#flow-text-font").value = flowTextStyle.font;
  $("#flow-text-color").value = flowTextStyle.color;
  $("#flow-text-background").value = flowTextStyle.background;
  $("#flow-text-safe").checked = flowTextStyle.safe;
  for (const saved of draft.scenes || []) {
    const bitmap = await decodeFlowImage(saved.file);
    flowScenes.push({ ...saved, bitmap, url: URL.createObjectURL(saved.file) });
  }
  if (flowScenes[0]) {
    $("#flow-motion").value = flowScenes[0].motion || "zoom-in";
    $("#flow-transition").value = flowScenes[0].transition || "fade";
  }
  if (draft.music?.file) {
    flowMusic = { file: draft.music.file, buffer: null };
    $("#flow-music-name").textContent = draft.music.file.name || "Arka plan müziği";
    $("#flow-music-meta").textContent = `${(draft.music.file.size / 1024 / 1024).toFixed(1)} MB · videoya göre döngüye alınır`;
    $("#flow-music-selected").classList.remove("hidden");
    $("#flow-volume-wrap").classList.remove("hidden");
  }
  renderFlowScenes();
  toast("Taslak açıldı");
}

function flowSize() {
  const format = $("#flow-format").value;
  if (format === "landscape") return { width: 1280, height: 720 };
  if (format === "square") return { width: 900, height: 900 };
  return { width: 720, height: 1280 };
}

function wrapCanvasText(context, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line); line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawFlowImage(context, scene, progress, width, height, offsetX = 0, opacity = 1) {
  if (!scene?.bitmap) return;
  const image = scene.bitmap;
  const templateMotion = flowTemplates[flowTemplate].motion;
  const motion = scene.motion || "zoom-in";
  const amount = motion === "still" ? 0 : templateMotion;
  const zoomProgress = motion === "zoom-out" ? 1 - progress : progress;
  const zoom = ["zoom-in", "zoom-out"].includes(motion) ? amount * zoomProgress : amount * .7;
  const baseScale = Math.max(width / image.width, height / image.height);
  const scale = baseScale * (scene.cropZoom || 1) * (1 + zoom);
  const drawWidth = image.width * scale; const drawHeight = image.height * scale;
  let drift = 0;
  if (motion === "pan-left") drift = (0.5 - progress) * width * .07;
  else if (motion === "pan-right") drift = (progress - .5) * width * .07;
  else if (motion !== "still") drift = (progress - .5) * width * .018 * (scene.direction || 1);
  const focusX = (scene.cropX ?? 50) / 100; const focusY = (scene.cropY ?? 50) / 100;
  const imageX = Math.min(0, Math.max(width - drawWidth, width / 2 - focusX * drawWidth + drift));
  const imageY = Math.min(0, Math.max(height - drawHeight, height / 2 - focusY * drawHeight));
  context.save(); context.globalAlpha = opacity;
  context.drawImage(image, imageX + offsetX, imageY, drawWidth, drawHeight);
  context.restore();
}

function roundedCanvasRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath(); context.moveTo(x + r, y); context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r); context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height); context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r); context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y); context.closePath();
}

function drawFlowFrame(scene, progress = 0, nextScene = null, transitionProgress = 0) {
  const canvas = $("#flow-canvas");
  const context = canvas.getContext("2d");
  const { width, height } = flowSize();
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
  }
  context.fillStyle = "#11131d";
  context.fillRect(0, 0, width, height);
  if (!scene?.bitmap) return;
  const template = flowTemplates[flowTemplate];
  const transition = scene.transition || "fade";
  if (nextScene && transitionProgress > 0 && transition === "slide") {
    drawFlowImage(context, scene, progress, width, height, -transitionProgress * width);
    drawFlowImage(context, nextScene, transitionProgress * .12, width, height, width * (1 - transitionProgress));
  } else {
    drawFlowImage(context, scene, progress, width, height);
    if (nextScene && transitionProgress > 0 && transition === "fade") {
      drawFlowImage(context, nextScene, transitionProgress * .12, width, height, 0, transitionProgress);
    }
  }
  const effectivePosition = flowTextStyle.position === "template" ? template.overlay : flowTextStyle.position;
  const centered = effectivePosition === "center";
  const top = effectivePosition === "top";
  const gradient = context.createLinearGradient(0, top ? 0 : height * .35, 0, top ? height * .55 : height);
  gradient.addColorStop(0, top ? "rgba(8,10,17,.78)" : "rgba(8,10,17,0)");
  gradient.addColorStop(centered ? .5 : 1, centered ? "rgba(8,10,17,.66)" : "rgba(8,10,17,.82)");
  if (centered) gradient.addColorStop(1, "rgba(8,10,17,0)");
  context.fillStyle = gradient;
  context.fillRect(0, top ? 0 : height * .3, width, top ? height * .58 : height * .7);
  const textScene = scene;
  const text = textScene.text || $("#flow-title").value.trim();
  if (text) {
    const sizeScale = { small: .78, medium: 1, large: 1.25 }[flowTextStyle.size] || 1;
    const fontSize = Math.round(width * (width > height ? .048 : .068) * sizeScale);
    const fontFamily = flowTextStyle.font === "serif" ? "Georgia, serif"
      : flowTextStyle.font === "rounded" ? '"Trebuchet MS", Arial, sans-serif' : "Manrope, Arial, sans-serif";
    context.font = `800 ${fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = flowTextStyle.color;
    context.shadowColor = "rgba(0,0,0,.55)";
    context.shadowBlur = 16;
    const wrappedLines = wrapCanvasText(context, text, width * (flowTextStyle.safe ? .78 : .9));
    const captionPages = Array.from({ length:Math.ceil(wrappedLines.length / 4) }, (_, index) => wrappedLines.slice(index * 4, index * 4 + 4));
    const lines = captionPages[Math.min(captionPages.length - 1, Math.floor(progress * captionPages.length))] || [];
    const lineHeight = fontSize * 1.18;
    const totalHeight = lines.length * lineHeight;
    const safeMargin = flowTextStyle.safe ? height * .11 : height * .045;
    const textTop = top ? safeMargin : centered ? (height - totalHeight) / 2 : height - safeMargin - totalHeight;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width));
    if (flowTextStyle.background !== "none") {
      const paddingX = fontSize * .48; const paddingY = fontSize * .3;
      context.shadowBlur = 0;
      context.fillStyle = flowTextStyle.background === "solid" ? "rgba(9,10,18,.88)" : "rgba(9,10,18,.56)";
      roundedCanvasRect(context, (width - widest) / 2 - paddingX, textTop - paddingY,
        widest + paddingX * 2, totalHeight + paddingY * 2, fontSize * .28);
      context.fill(); context.shadowBlur = 16;
    }
    context.fillStyle = template.accent;
    context.fillRect(width * .44, textTop - fontSize * .38, width * .12, Math.max(5, width * .008));
    context.fillStyle = flowTextStyle.color;
    lines.forEach((line, index) => context.fillText(line, width / 2, textTop + index * lineHeight));
    context.shadowBlur = 0;
  }
}

function updateFlowPreview() {
  $("#flow-total").textContent = `${flowScenes.reduce((sum, item) => sum + item.seconds, 0)} sn`;
  $("#flow-device").className = `flow-device ${$("#flow-format").value}`;
  $("#flow-placeholder").classList.toggle("hidden", Boolean(flowScenes.length));
  drawFlowFrame(flowScenes[0]);
  const steps = document.querySelectorAll(".flow-quick-steps span");
  const isTextOnly = flowScenes.some((scene) => scene.isTextOnly);
  const secondStep = steps[1];
  if (secondStep) secondStep.lastChild.nodeValue = ` ${isTextOnly ? ({ tr:"Cümleler", en:"Sentences", es:"Frases" }[lang()] || "Sentences") : ({ tr:"Fotoğraflar", en:"Photos", es:"Fotos" }[lang()] || "Photos")}`;
  steps[1]?.classList.toggle("done", flowScenes.length > 0);
  steps[2]?.classList.toggle("done", flowScenes.length > 0);
  steps[3]?.classList.toggle("done", Boolean(flowOutput));
  updateFlowCompatibility();
  updateFlowPlatformNote();
  $("#publish-kit-create").disabled = !flowScenes.length;
  scheduleFlowPersistence();
}

function selectFlowTemplate(key) {
  if (!flowTemplates[key]) return;
  flowTemplate = key;
  flowOutput = null;
  $("#flow-result").classList.add("hidden");
  const template = flowTemplates[key];
  $("#flow-template-name").textContent = flowTemplateName(key);
  $("#flow-format").value = template.format;
  $("#flow-duration").value = String(template.seconds);
  document.querySelectorAll("[data-flow-template]").forEach((button) =>
    button.classList.toggle("active", button.dataset.flowTemplate === key));
  activeFlowCopy = null;
  $("#flow-copy-active").classList.add("hidden");
  renderFlowCopyPresets();
  flowScenes.forEach((scene) => { scene.seconds = template.seconds; });
  renderFlowScenes();
}

function renderFlowCopyPresets() {
  const presets = flowCopyPresets[flowTemplate] || [];
  $("#flow-copy-help").textContent = {
    tr: `${flowTemplateName(flowTemplate)} şablonuna uygun başlık ve sahne metinleri.`,
    en: `Titles and scene copy for the ${flowTemplateName(flowTemplate)} template.`,
    es: `Títulos y textos para la plantilla ${flowTemplateName(flowTemplate)}.`
  }[lang()];
  $("#flow-copy-presets").innerHTML = presets.map((preset, index) => `
    <article><span>0${index + 1}</span><div><b>${esc(preset[0])}</b><small>${esc(preset[1])} · ${preset[2].length} sahne</small><p>${esc(preset[2][0])}</p></div><button type="button" data-flow-copy="${index}">Uygula</button></article>`).join("");
}

function applyFlowCopy(index) {
  const preset = flowCopyPresets[flowTemplate]?.[index];
  if (!preset) return;
  activeFlowCopy = { title: preset[0], captions: [...preset[2]] };
  flowNarrationContext.text = "";
  $("#flow-title").value = preset[0];
  flowScenes.forEach((scene, sceneIndex) => { scene.text = activeFlowCopy.captions[sceneIndex % activeFlowCopy.captions.length]; });
  $("#flow-copy-active-title").textContent = preset[0];
  $("#flow-copy-active").classList.remove("hidden");
  renderFlowScenes();
  toast("Metin yapısı projeye uygulandı");
}

function renderFlowScenes() {
  const container = $("#flow-scenes");
  container.classList.toggle("empty-state", !flowScenes.length);
  container.innerHTML = flowScenes.length ? flowScenes.map((scene, index) => `
    <article class="flow-scene ${scene.isTextOnly ? "text-only" : ""}" data-flow-id="${scene.id}" draggable="true">
      ${scene.isTextOnly ? '<div class="flow-text-thumb" aria-hidden="true">“</div>' : `<img src="${scene.url}" alt="">`}
      ${scene.isTextOnly ? "" : '<button class="scene-crop-button" data-flow-crop title="Kadrajı düzenle" aria-label="Kadrajı düzenle">⌗</button>'}
      <b data-flow-drag title="Sürükleyerek sırala">⠿ <small>${index + 1}</small></b>
      <label>Sahne yazısı<input data-flow-text value="${esc(scene.text)}" placeholder="Bu sahnede görünecek yazı"></label>
      <label>Süre<input data-flow-seconds type="number" min="1" max="10" value="${scene.seconds}"></label>
      <label>Hareket<select data-flow-motion><option value="zoom-in" ${scene.motion === "zoom-in" ? "selected" : ""}>Yakınlaş</option><option value="zoom-out" ${scene.motion === "zoom-out" ? "selected" : ""}>Uzaklaş</option><option value="pan-left" ${scene.motion === "pan-left" ? "selected" : ""}>Sola kay</option><option value="pan-right" ${scene.motion === "pan-right" ? "selected" : ""}>Sağa kay</option><option value="still" ${scene.motion === "still" ? "selected" : ""}>Sabit</option></select></label>
      <label>Geçiş<select data-flow-transition><option value="fade" ${scene.transition === "fade" ? "selected" : ""}>Yumuşak</option><option value="slide" ${scene.transition === "slide" ? "selected" : ""}>Kaydır</option><option value="none" ${scene.transition === "none" ? "selected" : ""}>Yok</option></select></label>
      <div><button data-flow-move="up" title="Yukarı">↑</button><button data-flow-move="down" title="Aşağı">↓</button><button data-flow-remove title="Kaldır">×</button></div>
    </article>`).join("") : "Başlamak için en az bir fotoğraf seç veya metin paylaşımı oluştur.";
  if (!flowScenes.length) container.textContent = ft("emptyScenes");
  container.querySelectorAll(".flow-scene").forEach((card) => {
    const labels = card.querySelectorAll("label");
    ["sceneText", "seconds", "movement", "sceneTransition"].forEach((key, index) => setLeadingText(labels[index], ft(key)));
  });
  const sceneOptions = {
    tr:{motion:{"zoom-in":"Yakınlaş","zoom-out":"Uzaklaş","pan-left":"Sola kay","pan-right":"Sağa kay",still:"Sabit"},transition:{fade:"Yumuşak",slide:"Kaydır",none:"Yok"}},
    en:{motion:{"zoom-in":"Zoom in","zoom-out":"Zoom out","pan-left":"Pan left","pan-right":"Pan right",still:"Still"},transition:{fade:"Fade",slide:"Slide",none:"None"}},
    es:{motion:{"zoom-in":"Acercar","zoom-out":"Alejar","pan-left":"Mover izq.","pan-right":"Mover der.",still:"Fijo"},transition:{fade:"Fundido",slide:"Deslizar",none:"Ninguna"}}
  }[lang()];
  localizeOptions("[data-flow-motion]", sceneOptions.motion); localizeOptions("[data-flow-transition]", sceneOptions.transition);
  updateFlowPreview();
}

async function addFlowFiles(files) {
  const rejected = [];
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      rejected.push(file.name);
      continue;
    }
    let bitmap;
    try { bitmap = await decodeFlowImage(file); }
    catch { rejected.push(file.name); continue; }
    flowScenes.push({
      id: crypto.randomUUID(), file, bitmap, url: URL.createObjectURL(file),
      text: activeFlowCopy?.captions[flowScenes.length % activeFlowCopy.captions.length] || "", seconds: Number($("#flow-duration").value),
      direction: flowScenes.length % 2 ? -1 : 1,
      motion: $("#flow-motion").value, transition: $("#flow-transition").value, cropX: 50, cropY: 50, cropZoom: 1
    });
  }
  redistributeFlowNarration();
  renderFlowScenes();
  if (flowScenes.length) { beginFlowAnalytics(); trackFlowStage("media"); }
  if (rejected.length) toast(`${rejected.length} görsel açılamadı. JPG, PNG veya WebP kullan.`, "error");
}

function demoSceneSvg(index) {
  const scenes = [
    ["#191654", "#c248c8", "#ffbd72", "M0 760 Q230 520 470 700 T900 610 V900 H0Z"],
    ["#132c55", "#258ac7", "#89e0dc", "M0 670 Q180 470 390 650 T900 540 V900 H0Z"],
    ["#47204f", "#db7652", "#ffd080", "M0 720 Q260 430 500 680 T900 520 V900 H0Z"],
    ["#173c3b", "#35a47d", "#c5e883", "M0 680 Q160 500 350 630 T900 490 V900 H0Z"],
    ["#25194d", "#7957d5", "#e69de7", "M0 700 Q220 470 450 650 T900 500 V900 H0Z"]
  ];
  const [start, end, sun, land] = scenes[index];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient><linearGradient id="ground"><stop stop-color="#110e34"/><stop offset="1" stop-color="#2e1b58"/></linearGradient></defs><rect width="900" height="1200" fill="url(#sky)"/><circle cx="${650-index*72}" cy="${245+index*28}" r="115" fill="${sun}" opacity=".92"/><circle cx="180" cy="210" r="3" fill="white"/><circle cx="275" cy="145" r="5" fill="white" opacity=".7"/><circle cx="760" cy="430" r="4" fill="white" opacity=".6"/><path d="${land}" transform="translate(0 270)" fill="url(#ground)"/><path d="M0 1020 Q240 880 470 1010 T900 900 V1200 H0Z" fill="#100d29" opacity=".85"/></svg>`;
}

function textPostBackgroundSvg(index) {
  const palettes = [["#22134d", "#a72d81", "#ffb0d6"], ["#0e3650", "#146f8f", "#9ce7df"], ["#44205b", "#d95a73", "#ffd08b"], ["#152d3a", "#4f9177", "#d4f0a0"], ["#332046", "#7654b9", "#d7bbff"]];
  const [start, end, glow] = palettes[index % palettes.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="34"/></filter></defs><rect width="900" height="1200" fill="url(#bg)"/><circle cx="700" cy="245" r="175" fill="${glow}" opacity=".72" filter="url(#blur)"/><circle cx="180" cy="960" r="230" fill="${glow}" opacity=".22" filter="url(#blur)"/><path d="M0 940 C190 830 320 1050 510 940 S760 790 900 890 V1200 H0Z" fill="#090915" opacity=".24"/></svg>`;
}

async function createTextOnlyMotivationPost() {
  if (textPostCreating) return;
  textPostCreating = true;
  const button = $("#text-post-create");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
  const enteredLines = $("#text-post-lines").value.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  const lines = (enteredLines.length ? enteredLines : (DEFAULT_MOTIVATION_LINES[lang()] || DEFAULT_MOTIVATION_LINES.en)).slice(0, 12);
  clearFlowMedia(); currentFlowDraftId = null;
  selectFlowTemplate("motivation");
  $("#flow-title").value = $("#text-post-title").value.trim() || ({ tr:"Bugün kendine hatırlat", en:"A reminder for today", es:"Un recordatorio para hoy" }[lang()] || "A reminder for today");
  $("#flow-narration-enabled").checked = false;
  flowNarrationContext = { text: "", contentLanguage: "", style: "inspiring" };
  for (let index = 0; index < lines.length; index += 1) {
    const file = new File([textPostBackgroundSvg(index)], `motivation-text-${index + 1}.svg`, { type: "image/svg+xml" });
    flowScenes.push({ id: crypto.randomUUID(), file, bitmap: await decodeFlowImage(file), url: URL.createObjectURL(file), isTextOnly: true,
      text: lines[index].slice(0, 500), seconds: Number($("#flow-duration").value), direction: index % 2 ? -1 : 1,
      motion: "still", transition: "fade", cropX: 50, cropY: 50, cropZoom: 1 });
  }
  renderFlowScenes(); beginFlowAnalytics("motivation"); trackFlowStage("media");
  showMobileFlowPanel("scenes");
  toast("Metin odaklı motivasyon paylaşımı hazır");
  } finally {
    textPostCreating = false;
    button.disabled = false;
    button.setAttribute("aria-busy", "false");
  }
}

async function loadFlowDemo() {
  clearFlowMedia(); currentFlowDraftId = null;
  selectFlowTemplate("travel");
  $("#flow-title").value = "Five places that feel unreal";
  const captions = ["Some places feel like another planet.", "Follow the light beyond the horizon.", "Every road hides a new perspective.", "Slow down and notice the colors.", "Where would you go first?"];
  for (let index = 0; index < captions.length; index += 1) {
    const file = new File([demoSceneSvg(index)], `terzi-demo-${index + 1}.svg`, { type: "image/svg+xml" });
    const bitmap = await decodeFlowImage(file);
    flowScenes.push({ id: crypto.randomUUID(), file, bitmap, url: URL.createObjectURL(file), text: captions[index], seconds: 3, direction: index % 2 ? -1 : 1, motion: "zoom-in", transition: "fade", cropX: 50, cropY: 50, cropZoom: 1 });
  }
  renderFlowScenes(); beginFlowAnalytics("travel"); trackFlowStage("media");
  showStep("flow");
  document.querySelector(".flow-onboarding")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  toast("Örnek proje hazır — metinleri değiştirebilir veya doğrudan videoyu oluşturabilirsin");
}

function splitNarrationAcrossScenes(text, sceneCount) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const count = Math.max(1, Math.min(Number(sceneCount) || 1, normalized.split(" ").length));
  let segments = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  segments = segments.map((segment) => segment.trim()).filter(Boolean);
  while (segments.length < count) {
    const index = segments.reduce((longest, segment, candidate) =>
      segment.split(/\s+/).length > segments[longest].split(/\s+/).length ? candidate : longest, 0);
    const words = segments[index].split(/\s+/);
    if (words.length < 2) break;
    const middle = Math.ceil(words.length / 2);
    segments.splice(index, 1, words.slice(0, middle).join(" "), words.slice(middle).join(" "));
  }
  if (segments.length <= count) return segments;
  const words = normalized.split(" ");
  return Array.from({ length:count }, (_, index) => words.slice(
    Math.floor(index * words.length / count), Math.floor((index + 1) * words.length / count)
  ).join(" "));
}

function sceneSecondsValue(value, fallback = 3) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.max(1, Math.min(20, numeric));
  const range = String(value || "").match(/^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$/);
  if (range) return Math.max(1, Math.min(20, Number(range[2]) - Number(range[1])));
  return fallback;
}

function speechWeight(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  return Math.max(1, normalized.split(/\s+/).filter(Boolean).length + (normalized.match(/[.!?;:]/g) || []).length * .45);
}

function redistributeFlowNarration() {
  if (!flowNarrationContext.text || !flowScenes.length) return;
  const segments = splitNarrationAcrossScenes(flowNarrationContext.text, flowScenes.length);
  flowScenes.forEach((scene, index) => { scene.text = segments[index] || ""; });
}

async function prepareProductionForDeviceRender(projectId) {
  const project = state.productions.find((item) => item.id === projectId);
  if (!project) throw new Error("Proje bulunamadı");
  clearFlowMedia(); currentFlowDraftId = project.id;
  flowNarrationContext = {
    text: String(project.content?.narration || "").trim(),
    contentLanguage: project.contentLanguage || "",
    style: project.contentProfile === "documentary" || project.contentProfile === "educational"
      ? "documentary" : project.contentProfile === "kids" ? "inspiring"
        : ["shorts", "reels"].includes(project.contentType) ? "energetic" : "natural"
  };
  $("#flow-narration-enabled").checked = Boolean(flowNarrationContext.text);
  selectFlowTemplate(project.contentType === "youtube" ? "education" : "culture");
  $("#flow-title").value = project.content?.title || "TERZİ video";
  const baseScenes = Array.isArray(project.content?.scenes) && project.content.scenes.length
    ? project.content.scenes.slice(0, 10)
    : [{ text:project.content?.hook || project.content?.narration || project.content?.title }];
  const narrationWords = flowNarrationContext.text.split(/\s+/).filter(Boolean).length;
  const sentenceCount = (flowNarrationContext.text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.length || 1;
  const sceneCount = Math.min(10, Math.max(baseScenes.length, sentenceCount, Math.ceil(narrationWords / 14) || 1));
  const contentScenes = Array.from({ length:sceneCount }, (_, index) => baseScenes[index % baseScenes.length]);
  const narrationSegments = splitNarrationAcrossScenes(flowNarrationContext.text, sceneCount);
  const assets = (project.visualAssets?.length
    ? project.visualAssets : (project.sourceAsset ? [project.sourceAsset] : []))
    .filter((asset) => asset?.previewUrl);
  const knownPreviewUrls = new Set(assets.map((asset) => asset.previewUrl));
  (project.images || []).filter(Boolean).forEach((previewUrl) => {
    if (!knownPreviewUrls.has(previewUrl)) assets.push({ previewUrl, sourceLabel:"Proje görseli", title:"Proje görseli" });
  });
  let missingVisuals = 0;
  for (let index = 0; index < contentScenes.length; index += 1) {
    let file;
    const asset = assets[index % Math.max(assets.length, 1)];
    if (asset) {
      try {
        const previewUrl = /^https:\/\//i.test(asset.previewUrl)
          ? `/api/image-proxy?url=${encodeURIComponent(asset.previewUrl)}`
          : asset.previewUrl;
        const response = await fetch(previewUrl, { credentials:"include" });
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        file = new File([blob], `terzi-project-${index + 1}.${blob.type.includes("png") ? "png" : "jpg"}`,
          { type:blob.type || "image/jpeg" });
      } catch { missingVisuals += 1; }
    }
    if (!file) {
      file = new File([demoSceneSvg(index % 5)], `terzi-scene-${index + 1}.svg`,
        { type:"image/svg+xml" });
    }
    const bitmap = await decodeFlowImage(file);
    flowScenes.push({
      id:crypto.randomUUID(), file, bitmap, url:URL.createObjectURL(file),
      text:String(narrationSegments[index] || contentScenes[index]?.text || "").trim(),
      seconds:sceneSecondsValue(contentScenes[index]?.seconds, Number($("#flow-duration").value || 3)),
      direction:index % 2 ? -1 : 1, motion:"zoom-in", transition:"fade",
      cropX:50, cropY:50, cropZoom:1
    });
  }
  renderFlowScenes(); beginFlowAnalytics("ai-project"); trackFlowStage("media");
  if (missingVisuals && assets.length) toast(`${missingVisuals} proje görseli okunamadı; bağlantı veya görsel erişimini kontrol et.`, "error");
  showStep("flow");
  if (window.matchMedia("(max-width:650px)").matches) showMobileFlowPanel("export");
  updateFlowCompatibility(); updateFlowPreview();
}

function animationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function narrationLanguageCode(text, configuredLanguage = "") {
  const configuredKey = Object.keys(CONTENT_LANGUAGE_CODES).find((name) => name.toLowerCase() === String(configuredLanguage || "").toLowerCase());
  if (configuredKey) return CONTENT_LANGUAGE_CODES[configuredKey];
  const sample = String(text || "").toLocaleLowerCase("tr-TR");
  const turkishWords = sample.match(/\b(ve|bir|bu|için|ile|ama|gibi|daha|olan|olarak|çok|değil|şimdi|sonra|neden|nasıl)\b/g) || [];
  if (/[çğıöşü]/i.test(sample) || turkishWords.length >= 2) return "tr";
  const configured = String(configuredLanguage || "").toLowerCase();
  if (configured.includes("turkish") || configured.includes("türkçe")) return "tr";
  if (configured.includes("spanish") || configured.includes("español")) return "es";
  if (configured.includes("french") || configured.includes("français")) return "fr";
  if (configured.includes("chinese")) return "zh";
  if (configured.includes("japanese")) return "ja";
  if (configured.includes("korean")) return "ko";
  return "en";
}

function splitNarrationForSpeech(text, maxLength = 4000) {
  const remaining = String(text || "").trim();
  if (!remaining) return [];
  const chunks = [];
  let cursor = remaining;
  while (cursor.length > maxLength) {
    const windowText = cursor.slice(0, maxLength + 1);
    const sentenceBreak = Math.max(windowText.lastIndexOf(". "), windowText.lastIndexOf("! "), windowText.lastIndexOf("? "), windowText.lastIndexOf("\n"));
    const wordBreak = windowText.lastIndexOf(" ");
    const cut = sentenceBreak >= Math.floor(maxLength * .55) ? sentenceBreak + 1
      : wordBreak >= Math.floor(maxLength * .55) ? wordBreak : maxLength;
    chunks.push(cursor.slice(0, cut).trim());
    cursor = cursor.slice(cut).trim();
  }
  if (cursor) chunks.push(cursor);
  return chunks;
}

function joinAudioBuffers(audioContext, buffers) {
  if (buffers.length === 1) return buffers[0];
  const channelCount = Math.max(...buffers.map((buffer) => buffer.numberOfChannels));
  const pauseLength = Math.round(audioContext.sampleRate * .1);
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0) + pauseLength * (buffers.length - 1);
  const combined = audioContext.createBuffer(channelCount, totalLength, audioContext.sampleRate);
  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const source = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
      combined.copyToChannel(source, channel, offset);
    }
    offset += buffer.length + pauseLength;
  }
  return combined;
}

function getFlowRecordingProfile() {
  const canvas = $("#flow-canvas");
  if (!canvas?.captureStream || !window.MediaRecorder) {
    return { supported: false, format: "—", mimeType: "", extension: "", reason: "Tarayıcı video kaydını desteklemiyor." };
  }
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", format: "MP4 / H.264", extension: "mp4" },
    { mimeType: "video/mp4;codecs=h264", format: "MP4 / H.264", extension: "mp4" },
    { mimeType: "video/mp4", format: "MP4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", format: "WebM / VP9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", format: "WebM / VP8", extension: "webm" },
    { mimeType: "video/webm", format: "WebM", extension: "webm" }
  ];
  const profile = candidates.find((item) => MediaRecorder.isTypeSupported(item.mimeType));
  return profile ? { supported: true, ...profile } : {
    supported: false, format: "—", mimeType: "", extension: "", reason: "Desteklenen video kodlayıcı bulunamadı."
  };
}

function updateFlowCompatibility() {
  const profile = getFlowRecordingProfile();
  const badge = $("#flow-compatibility-badge");
  const directShare = Boolean(navigator.share);
  const audio = Boolean(window.AudioContext || window.webkitAudioContext);
  badge.className = profile.supported ? (profile.extension === "mp4" ? "ok" : "fallback") : "error";
  badge.textContent = profile.supported ? profile.extension.toUpperCase() : "UYUMSUZ";
  $("#flow-compatibility-title").textContent = profile.supported
    ? profile.format : flowRuntime("unsupported");
  $("#flow-compatibility-detail").textContent = profile.supported
    ? profile.extension === "mp4"
      ? flowRuntime("mp4")
      : flowRuntime("webm")
    : profile.reason;
  $("#flow-compatibility-details").innerHTML = `
    <span><b>${profile.supported ? "✓" : "×"}</b> Cihaz içi video render</span>
    <span><b>${audio ? "✓" : "×"}</b> Arka plan müziği</span>
    <span><b>${directShare ? "✓" : "—"}</b> Sistem paylaşım ekranı</span>
    <small>Çıktı: ${profile.format}${directShare ? " · Doğrudan paylaşım destekleniyor" : " · Dosya indirerek paylaşabilirsin"}</small>`;
  $("#flow-render").disabled = flowRendering || !flowScenes.length || !profile.supported;
  $('#flow-render').setAttribute('aria-busy', String(flowRendering));
  $("#flow-render").textContent = flowRendering
    ? ({ tr: 'Video hazırlanıyor…', en: 'Creating video…', es: 'Creando vídeo…' }[lang()] || 'Creating video…')
    : profile.supported
    ? flowRuntime("renderAs").replace("{format}", profile.extension.toUpperCase()) : flowRuntime("noRender");
  syncMobileFlowAction();
}

async function renderFlowVideo() {
  if (!flowScenes.length) throw new Error("Önce fotoğraf ekle");
  const canvas = $("#flow-canvas");
  const profile = getFlowRecordingProfile();
  if (!profile.supported) throw new Error(profile.reason);
  const mimeType = profile.mimeType;
  const canvasStream = canvas.captureStream(30);
  const stream = new MediaStream(canvasStream.getVideoTracks());
  let audioContext = null;
  let musicSource = null;
  let narrationSource = null;
  let narrationDuration = 0;
  const narrationText = String(flowNarrationContext.text || flowScenes
    .map((scene) => String(scene.text || "").trim()).filter(Boolean).join(". "))
    .trim();
  if ($("#flow-narration-enabled").checked && !narrationText) throw new Error("Seslendirme için sahnelere metin ekle veya AI seslendirmeyi kapat.");
  const narrationEnabled = $("#flow-narration-enabled").checked && narrationText;
  if (flowMusic || narrationEnabled) {
    const BrowserAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!BrowserAudioContext) throw new Error("Bu tarayıcı ses mikslemeyi desteklemiyor.");
    audioContext = new BrowserAudioContext();
    await audioContext.resume();
    const destination = audioContext.createMediaStreamDestination();
    if (narrationEnabled) {
      $("#flow-progress span").textContent = "AI seslendirme hazırlanıyor…";
      const lang = narrationLanguageCode(narrationText,
        flowNarrationContext.contentLanguage || state.settings.contentLanguage);
      const geminiKey = localStorage.getItem("orbit-device-key-gemini") || "";
      const narrationStyle = flowNarrationContext.style || ({ motivation:"inspiring", education:"documentary" }[flowTemplate] || "natural");
      try {
        const narrationBuffers = [];
        const chunks = splitNarrationForSpeech(narrationText);
        for (let index = 0; index < chunks.length; index += 1) {
          $("#flow-progress span").textContent = chunks.length > 1
            ? `AI seslendirme hazırlanıyor… ${index + 1}/${chunks.length}`
            : "AI seslendirme hazırlanıyor…";
          const cacheKey = JSON.stringify([lang, narrationStyle, chunks[index]]);
          let audioBytes = flowNarrationAudioCache.get(cacheKey);
          if (!audioBytes) {
            const response = await fetch("/api/tts", {
              method:"POST",
              headers:{
                "content-type":"application/json",
                ...(geminiKey ? { "x-orbit-ai-key":geminiKey } : {})
              },
              body:JSON.stringify({ text:chunks[index], lang, style:narrationStyle })
            });
            if (!response.ok) {
              const detail = await response.json().catch(() => ({}));
              throw new Error(detail.error || `Seslendirme servisi ${response.status} hatası verdi`);
            }
            audioBytes = await response.arrayBuffer();
            flowNarrationAudioCache.set(cacheKey, audioBytes);
            if (flowNarrationAudioCache.size > 12) {
              flowNarrationAudioCache.delete(flowNarrationAudioCache.keys().next().value);
            }
          }
          narrationBuffers.push(await audioContext.decodeAudioData(audioBytes.slice(0)));
        }
        const narrationBuffer = joinAudioBuffers(audioContext, narrationBuffers);
        narrationDuration = narrationBuffer.duration;
        narrationSource = audioContext.createBufferSource();
        narrationSource.buffer = narrationBuffer;
        const narrationGain = audioContext.createGain();
        narrationGain.gain.value = 1;
        narrationSource.connect(narrationGain).connect(destination);
        trackProductEvent("voice_generated", { result:"success" });
      } catch (error) {
        trackProductEvent("voice_failed", { result:"failure" });
        stream.getTracks().forEach((track) => track.stop());
        canvasStream.getTracks().forEach((track) => track.stop());
        await audioContext.close();
        throw new Error(`AI seslendirme oluşturulamadı: ${error.message}`);
      }
    }
    if (flowMusic) {
    if (!flowMusic.buffer) {
      flowMusic.buffer = await audioContext.decodeAudioData(await flowMusic.file.arrayBuffer());
    }
    const gain = audioContext.createGain();
    gain.gain.value = (Number($("#flow-music-volume").value) / 100) * (narrationSource ? .7 : 1);
    musicSource = audioContext.createBufferSource();
    musicSource.buffer = flowMusic.buffer;
    musicSource.loop = true;
    musicSource.connect(gain).connect(destination);
    }
    if (flowMusic || narrationSource) {
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }
  }
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = resolve; recorder.onerror = () => reject(recorder.error);
  });
  recorder.start(500);
  narrationSource?.start(0);
  musicSource?.start(0);
  const visualTotal = flowScenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const targetDuration = narrationDuration > 0 ? Math.max(1, narrationDuration + .2) : visualTotal;
  const weights = narrationDuration > 0 ? flowScenes.map((scene) => speechWeight(scene.text)) : [];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const useSpeechTimeline = narrationDuration > 0 && totalWeight > 0;
  const durationScale = visualTotal > 0 ? targetDuration / visualTotal : 1;
  const renderDurations = flowScenes.map((scene, index) => useSpeechTimeline
    ? targetDuration * weights[index] / totalWeight
    : scene.seconds * durationScale);
  const total = renderDurations.reduce((sum, seconds) => sum + seconds, 0);
  let elapsed = 0;
  for (let sceneIndex = 0; sceneIndex < flowScenes.length; sceneIndex += 1) {
    const scene = flowScenes[sceneIndex];
    const nextScene = flowScenes[sceneIndex + 1] || null;
    const started = performance.now();
    const sceneSeconds = renderDurations[sceneIndex];
    const duration = sceneSeconds * 1000;
    while (performance.now() - started < duration) {
      const sceneElapsed = performance.now() - started;
      const progress = Math.min(1, sceneElapsed / duration);
      const transitionDuration = Math.min(650, duration * .22);
      const transitionProgress = nextScene && scene.transition !== "none"
        ? Math.max(0, Math.min(1, (sceneElapsed - (duration - transitionDuration)) / transitionDuration)) : 0;
      drawFlowFrame(scene, progress, nextScene, transitionProgress);
      const percent = Math.round(((elapsed + progress * sceneSeconds) / total) * 100);
      $("#flow-progress i").style.width = `${percent}%`;
      $("#flow-progress span").textContent = `Video hazırlanıyor… %${percent}`;
      await animationFrame();
    }
    elapsed += sceneSeconds;
  }
  recorder.stop();
  try { narrationSource?.stop(); } catch {}
  musicSource?.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());
  canvasStream.getTracks().forEach((track) => track.stop());
  await audioContext?.close();
  const type = profile.extension === "mp4" ? "video/mp4" : "video/webm";
  const extension = profile.extension;
  if (flowOutput?.url) URL.revokeObjectURL(flowOutput.url);
  const blob = new Blob(chunks, { type });
  const fileName = `${($("#flow-title").value || "terzi-video").trim().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-").replace(/^-|-$/g, "") || "terzi-video"}.${extension}`;
  flowOutput = { blob, url: URL.createObjectURL(blob), fileName, type };
  $("#flow-video").src = flowOutput.url;
  $("#flow-download").href = flowOutput.url;
  $("#flow-download").download = fileName;
  $("#flow-result").classList.remove("hidden");
  await saveLocalFlowOutput();
  updateFlowPreview();
}

async function shareFlowVideo(platform = "") {
  if (!flowOutput) throw new Error("Önce videoyu oluştur");
  const file = new File([flowOutput.blob], flowOutput.fileName, { type: flowOutput.type });
  const shareData = { files: [file], title: $("#flow-title").value || "TERZİ video", text: platform ? `${platform} için hazırlandı` : "" };
  if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
    await navigator.share(shareData); trackFlowStage("shared"); return;
  }
  $("#flow-download").click();
  const urls = { YouTube: "https://www.youtube.com/upload", Instagram: "https://www.instagram.com/", TikTok: "https://www.tiktok.com/upload", Facebook: "https://www.facebook.com/reels/create", Pinterest: "https://www.pinterest.com/pin-creation-tool/", LinkedIn: "https://www.linkedin.com/feed/", X: "https://x.com/compose/post" };
  if (platform && urls[platform]) window.open(urls[platform], "_blank", "noopener");
  trackFlowStage("shared");
  toast("Video indirildi. Platformda yeni gönderi oluşturup dosyayı seçebilirsin.");
}

async function saveFlowVideoToCloud() {
  if (!flowOutput) throw new Error("Önce videoyu oluştur");
  if (state.runtime?.deployment !== "cloudflare") throw new Error("Bulut kayıt yalnızca Cloudflare sürümünde kullanılabilir");
  const button = $("#flow-cloud-save");
  const status = $("#flow-cloud-status");
  button.disabled = true;
  status.classList.remove("hidden");
  status.textContent = "Bulut yüklemesi hazırlanıyor…";
  let session = null;
  try {
    session = await api("/api/cloud-media/uploads", {
      method:"POST", body:JSON.stringify({ fileName:flowOutput.fileName,
        contentType:flowOutput.type, byteSize:flowOutput.blob.size,
        projectId:currentFlowDraftId || "" })
    });
    const parts = [];
    const totalParts = Math.ceil(flowOutput.blob.size / session.partSize);
    for (let index = 0; index < totalParts; index += 1) {
      const chunk = flowOutput.blob.slice(index * session.partSize,
        Math.min(flowOutput.blob.size, (index + 1) * session.partSize));
      let response;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(`/api/cloud-media/uploads/${session.id}/parts/${index + 1}?uploadId=${encodeURIComponent(session.uploadId)}`, {
          method:"PUT", headers:{ "content-type":"application/octet-stream" }, body:chunk
        });
        if (response.ok) break;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
      const part = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(part.error || `Video parçası yüklenemedi (${index + 1}/${totalParts})`);
      parts.push(part);
      status.textContent = `Buluta yükleniyor… %${Math.round(((index + 1) / totalParts) * 100)}`;
    }
    const result = await api(`/api/cloud-media/uploads/${session.id}/complete`, {
      method:"POST", body:JSON.stringify({ parts })
    });
    flowOutput.cloud = result;
    status.innerHTML = `✓ Video bulutta güvende · <a href="${result.url}" target="_blank" rel="noopener">Aç</a>`;
    button.textContent = "✓ Buluta kaydedildi";
    toast("Video TERZİ bulutuna kaydedildi");
  } catch (error) {
    if (session?.id) {
      await api(`/api/cloud-media/uploads/${session.id}`, { method:"DELETE" }).catch(() => {});
    }
    throw error;
  } finally {
    button.disabled = false;
  }
}

function buildPublishKit() {
  if (!flowScenes.length) throw new Error("Önce fotoğraf ekle");
  const platform = $("#publish-platform").value;
  const title = $("#flow-title").value.trim() || flowScenes.find((scene) => scene.text)?.text || "A story worth sharing";
  const lines = flowScenes.map((scene) => String(scene.text || "").trim()).filter(Boolean);
  const summary = lines.slice(0, platform === "youtube" ? 4 : 2).join(" ");
  const endings = {
    youtube: "Watch until the end and tell us what you think in the comments.",
    instagram: "Save this for later and share it with someone who would love it.",
    tiktok: "Which part caught your attention? Tell us below.",
    facebook: "Share this with someone who would enjoy it.",
    pinterest: "Save this idea to revisit it later.",
    linkedin: "What is your perspective? Join the conversation below.",
    x: "What do you think? Add your take."
  };
  const platformTags = platformProfiles[platform]?.tags || [];
  const tags = [...new Set([...(publishHashtags[flowTemplate] || []), ...platformTags])];
  $("#publish-title").value = title.slice(0, platformProfiles[platform]?.titleLimit || 120);
  $("#publish-description").value = `${summary || title}\n\n${endings[platform]}`;
  $("#publish-hashtags").value = tags.map((tag) => `#${tag}`).join(" ");
  $("#publish-kit-panel").classList.remove("hidden");
}
async function copyPublishField(id) {
  const field = $(`#${id}`); const value = field.value;
  try { await navigator.clipboard.writeText(value); }
  catch { field.select(); document.execCommand("copy"); }
  toast("Metin panoya kopyalandı");
}
async function downloadFlowCover() {
  if (!flowScenes.length) throw new Error("Önce fotoğraf ekle");
  drawFlowFrame(flowScenes[0], .32);
  const blob = await new Promise((resolve) => $("#flow-canvas").toBlob(resolve, "image/jpeg", .92));
  if (!blob) throw new Error("Kapak karesi hazırlanamadı");
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `${($("#flow-title").value || "terzi-cover").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "terzi-cover"}-cover.jpg`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast("Kapak karesi indirildi");
}

$("#flow-files").addEventListener("change", async (event) => {
  await addFlowFiles([...event.target.files]); event.target.value = "";
});
$("#flow-camera").addEventListener("change", async (event) => {
  const files = [...event.target.files];
  if (files.length) {
    await addFlowFiles(files);
    showMobileFlowPanel("scenes");
    toast("Kamera fotoğrafı yeni sahne olarak eklendi");
  }
  event.target.value = "";
});
$("#flow-demo").addEventListener("click", () => loadFlowDemo().catch((error) => toast(error.message, "error")));
$("#text-post-create").addEventListener("click", () => createTextOnlyMotivationPost().catch((error) => toast(error.message, "error")));
$("#flow-templates").addEventListener("click", (event) => {
  const button = event.target.closest("[data-flow-template]");
  if (button) { selectFlowTemplate(button.dataset.flowTemplate); beginFlowAnalytics(button.dataset.flowTemplate); }
});
$("#flow-copy-toggle").addEventListener("click", (event) => {
  const presets = $("#flow-copy-presets");
  const open = presets.classList.toggle("hidden") === false;
  event.currentTarget.setAttribute("aria-expanded", String(open));
  event.currentTarget.textContent = open ? "Önerileri gizle" : "Önerileri göster";
});
$("#flow-copy-presets").addEventListener("click", (event) => {
  const button = event.target.closest("[data-flow-copy]");
  if (button) applyFlowCopy(Number(button.dataset.flowCopy));
});
$("#flow-copy-clear").addEventListener("click", () => {
  activeFlowCopy = null; $("#flow-copy-active").classList.add("hidden");
  toast("Otomatik metin dağıtımı kapatıldı");
});
$("#flow-format").addEventListener("change", updateFlowPreview);
$("#flow-platform").addEventListener("change", (event) => selectFlowPlatform(event.target.value));
$("#flow-format").addEventListener("change", updateFlowPlatformNote);
$("#flow-duration").addEventListener("change", () => {
  const seconds = Number($("#flow-duration").value);
  flowScenes.forEach((scene) => { scene.seconds = seconds; });
  renderFlowScenes();
});
$("#flow-motion").addEventListener("change", (event) => {
  flowScenes.forEach((scene) => { scene.motion = event.target.value; }); renderFlowScenes();
});
$("#flow-transition").addEventListener("change", (event) => {
  flowScenes.forEach((scene) => { scene.transition = event.target.value; }); renderFlowScenes();
});
function updateFlowTextStyle() {
  flowTextStyle = {
    position: $("#flow-text-position").value, size: $("#flow-text-size").value,
    font: $("#flow-text-font").value, color: $("#flow-text-color").value,
    background: $("#flow-text-background").value, safe: $("#flow-text-safe").checked
  };
  updateFlowPreview();
}
document.querySelectorAll("#flow-text-position,#flow-text-size,#flow-text-font,#flow-text-color,#flow-text-background,#flow-text-safe")
  .forEach((control) => { control.addEventListener("input", updateFlowTextStyle); control.addEventListener("change", updateFlowTextStyle); });
$("#flow-music-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("audio/") || file.size > 30 * 1024 * 1024) {
    toast("En fazla 30 MB boyutunda bir ses dosyası seç", "error");
    event.target.value = ""; return;
  }
  flowMusic = { file, buffer: null };
  $("#flow-music-name").textContent = file.name;
  $("#flow-music-meta").textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · videoya göre döngüye alınır`;
  $("#flow-music-selected").classList.remove("hidden");
  $("#flow-volume-wrap").classList.remove("hidden");
  scheduleFlowPersistence();
  toast("Müzik eklendi");
});
$("#flow-music-volume").addEventListener("input", (event) => {
  $("#flow-volume-value").textContent = `%${event.target.value}`;
});
$("#flow-music-remove").addEventListener("click", () => {
  flowMusic = null;
  $("#flow-music-file").value = "";
  $("#flow-music-selected").classList.add("hidden");
  $("#flow-volume-wrap").classList.add("hidden");
  scheduleFlowPersistence();
});
$("#flow-draft-select").addEventListener("change", (event) => {
  const selected = Boolean(event.target.value);
  $("#flow-draft-open").disabled = !selected;
  $("#flow-draft-delete").disabled = !selected;
});
$("#flow-draft-save").addEventListener("click", () => saveFlowDraft().catch((error) =>
  toast(error.name === "QuotaExceededError" ? "Cihaz depolama alanı dolu; bazı taslakları sil" : error.message, "error")));
$("#flow-draft-open").addEventListener("click", () => {
  const id = $("#flow-draft-select").value;
  if (id) loadFlowDraft(id).catch((error) => toast(error.message, "error"));
});
$("#flow-draft-delete").addEventListener("click", async () => {
  const id = $("#flow-draft-select").value;
  if (!id || !confirm("Bu taslak bu cihazdan silinsin mi?")) return;
  await useFlowStore("readwrite", (store) => store.delete(id));
  if (currentFlowDraftId === id) currentFlowDraftId = null;
  await refreshFlowDrafts();
  toast("Taslak silindi");
});
$("#flow-project-export").addEventListener("click", () => exportFlowProject().catch((error) => toast(error.message, "error")));
$("#flow-project-import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0]; event.target.value = "";
  if (!file) return;
  try { await importFlowProject(file); } catch (error) { restoringFlowHistory = false; toast(error.message, "error"); }
});
$("#flow-undo").addEventListener("click", () => {
  if (flowHistoryIndex <= 0) return;
  flowHistoryIndex -= 1; restoreFlowSnapshot(flowHistory[flowHistoryIndex].snapshot); toast("Son değişiklik geri alındı");
});
$("#flow-redo").addEventListener("click", () => {
  if (flowHistoryIndex >= flowHistory.length - 1) return;
  flowHistoryIndex += 1; restoreFlowSnapshot(flowHistory[flowHistoryIndex].snapshot); toast("Değişiklik yeniden uygulandı");
});
$("#flow-recovery-restore").addEventListener("click", () => loadFlowDraft(FLOW_AUTOSAVE_ID).then(() => {
  $("#flow-recovery").classList.add("hidden"); captureFlowHistory(); toast("Otomatik kayıt geri yüklendi");
}).catch((error) => toast(error.message, "error")));
$("#flow-recovery-discard").addEventListener("click", async () => {
  clearTimeout(flowAutosaveTimer);
  await useFlowStore("readwrite", (store) => store.delete(FLOW_AUTOSAVE_ID));
  $("#flow-recovery").classList.add("hidden"); toast("Kurtarma taslağı silindi");
});
function closeAiKeyModal() { $("#ai-key-modal").classList.add("hidden"); }
$("#ai-key-modal-close").addEventListener("click", closeAiKeyModal);
$("#ai-key-modal-cancel").addEventListener("click", closeAiKeyModal);
$("#ai-key-modal-provider").addEventListener("change", (event) => updateAiKeyModalProvider(event.target.value));
$("#ai-transfer-consent").addEventListener("change", (event) => {
  $("#ai-key-modal-settings").disabled = !event.target.checked;
});
$("#ai-key-modal").addEventListener("click", (event) => { if (event.target.id === "ai-key-modal") closeAiKeyModal(); });
$("#ai-key-modal-settings").addEventListener("click", () => {
  const provider = $("#ai-key-modal").dataset.provider || "gemini";
  if (!$("#ai-transfer-consent").checked) return;
  localStorage.setItem(`orbit-ai-consent-${provider}`, "yes");
  closeAiKeyModal();
  if (hasProviderCredential(provider)) {
    toast({
      tr:"AI bağlantısı hazır. Otomatik üretime devam edebilirsin.",
      en:"AI connection is ready. You can continue automatic creation.",
      es:"La conexión de IA está lista. Puedes continuar con la creación automática."
    }[lang()]);
    resumePendingAiAction();
    return;
  }
  $("#settings-panel").classList.remove("hidden");
  document.querySelector("[data-settings-tab=integrations]")?.click();
  $("#integration-provider").value = provider === "claude" ? "anthropic" : provider;
  if (provider !== "cloudflare") {
    $("#provider").value = provider;
    updateModelChoices();
  }
  updateIntegrationForm();
  $("#integration-key").focus();
  $("#settings-panel").scrollIntoView?.({ behavior: "smooth", block: "start" });
});
$("#ai-key-modal-pro").addEventListener("click", () => {
  closeAiKeyModal();
  openAccountModal(state.runtime?.account ? "account" : "register");
});
$("#account-toggle").addEventListener("click", () => openAccountModal(state.runtime?.account ? "account" : "register"));
$("#account-close").addEventListener("click", closeAccountModal);
$("#account-modal").addEventListener("click", (event) => { if (event.target.id === "account-modal") closeAccountModal(); });
document.querySelectorAll("[data-account-mode]").forEach((button) => button.addEventListener("click", () => setAccountMode(button.dataset.accountMode)));
$("#account-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = $("#account-submit");
  submit.disabled = true;
  submit.textContent = accountMode === "login" ? "Giriş yapılıyor…" : "Hesap oluşturuluyor…";
  try {
    if (accountMode === "register") trackProductEvent("account_started");
    const result = await api(`/api/auth/${accountMode}`, { method:"POST", body:JSON.stringify({
      email:$("#account-email").value, password:$("#account-password").value,
      turnstileToken:turnstileToken("account-turnstile")
    }) });
    $("#account-password").value = "";
    await refresh();
    renderAccountAccess();
    if (accountMode === "register") trackProductEvent("account_created", { result:"success" });
    toast(accountMode === "login" ? "Hesabına giriş yapıldı"
      : result.verificationSent ? "Hesabın oluşturuldu. E-postandaki doğrulama bağlantısını aç."
        : "Hesabın oluşturuldu. Doğrulama e-postası şu an gönderilemedi; biraz sonra yeniden dene.",
    result.verificationSent === false ? "warn" : "ok");
    if (pendingAiAction) {
      if (state.runtime?.account?.emailVerified) { closeAccountModal(); resumePendingAiAction(); }
    }
  } catch (error) { toast(error.message, "error"); }
  finally { submit.disabled = false; resetTurnstile("account-turnstile"); setAccountMode(accountMode); }
});
$("#account-forgot").addEventListener("click", async () => {
  const email = $("#account-email").value.trim();
  if (!email) { $("#account-email").focus(); return toast("Önce e-posta adresini yaz", "warn"); }
  const button = $("#account-forgot"); button.disabled = true;
  try {
    const result = await api("/api/auth/password/request", { method:"POST", body:JSON.stringify({ email, turnstileToken:turnstileToken("account-turnstile") }) });
    const message = $("#account-auth-message"); message.textContent = result.message; message.classList.remove("hidden");
    toast(result.message);
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; resetTurnstile("account-turnstile"); }
});
$("#account-resend-verification").addEventListener("click", async (event) => {
  const button = event.currentTarget; button.disabled = true;
  try {
    const result = await api("/api/auth/verify/request", { method:"POST", body:JSON.stringify({ email:state.runtime?.account?.email, turnstileToken:turnstileToken("verify-turnstile") }) });
    toast(result.message);
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; resetTurnstile("verify-turnstile"); }
});
$("#account-delete").addEventListener("click", async (event) => {
  const password = $("#account-delete-password").value;
  if (!password) return toast("Hesabını silmek için parolanı yaz", "warn");
  if (!window.confirm("Hesabın, bulut projelerin ve dosyaların kalıcı olarak silinecek. Devam edilsin mi?")) return;
  const button = event.currentTarget; button.disabled = true;
  try {
    await api("/api/auth/account", { method:"DELETE", body:JSON.stringify({ confirmation:"DELETE", password }) });
    closeAccountModal(); await refresh(); toast("Hesabın ve bulut verilerin silindi");
  } catch (error) { toast(error.message, "error"); }
  finally { button.disabled = false; }
});
function closeAuthActionModal() { $("#auth-action-modal").classList.add("hidden"); }
$("#auth-action-close").addEventListener("click", closeAuthActionModal);
$("#auth-action-modal").addEventListener("click", (event) => { if (event.target.id === "auth-action-modal") closeAuthActionModal(); });
$("#password-reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = new URLSearchParams(window.location.search).get("reset");
  const button = event.submitter; button.disabled = true;
  try {
    await api("/api/auth/password/reset", { method:"POST", body:JSON.stringify({ token, password:$("#password-reset-value").value, turnstileToken:turnstileToken("reset-turnstile") }) });
    history.replaceState({}, "", window.location.pathname + window.location.hash);
    closeAuthActionModal(); openAccountModal("login"); toast("Parolan yenilendi. Yeni parolanla giriş yapabilirsin.");
  } catch (error) { toast(error.message, "error"); resetTurnstile("reset-turnstile"); }
  finally { button.disabled = false; }
});
$("#account-logout").addEventListener("click", async () => {
  await api("/api/auth/logout", { method:"POST" });
  closeAccountModal(); await refresh(); toast("Hesaptan çıkış yapıldı");
});
$("#account-upgrade").addEventListener("click", () => startProCheckout().catch((error) => toast(error.message, "error")));
$("#account-manage").addEventListener("click", () => startProCheckout().catch((error) => toast(error.message, "error")));
$("#pro-upgrade").addEventListener("click", () => startProCheckout().catch((error) => toast(error.message, "error")));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const visibleModal = ["auth-action-modal","account-modal","ai-key-modal","flow-crop-modal","flow-bulk-text-modal","welcome-guide","ios-install-guide"].map((id) => $(`#${id}`)).find((node) => node && !node.classList.contains("hidden"));
    if (visibleModal) { visibleModal.classList.add("hidden"); return; }
  }
  if (!(event.ctrlKey || event.metaKey) || !["z", "y"].includes(event.key.toLowerCase())) return;
  const editing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (editing) return;
  event.preventDefault();
  if (event.key.toLowerCase() === "y" || event.shiftKey) $("#flow-redo").click(); else $("#flow-undo").click();
});
$("#flow-title").addEventListener("input", updateFlowPreview);
$("#flow-scenes").addEventListener("input", (event) => {
  const card = event.target.closest("[data-flow-id]");
  const scene = flowScenes.find((item) => item.id === card?.dataset.flowId);
  if (!scene) return;
  if (event.target.hasAttribute("data-flow-text")) {
    scene.text = event.target.value;
    flowNarrationContext.text = "";
  }
  if (event.target.hasAttribute("data-flow-seconds")) scene.seconds = Math.max(1, Math.min(10, Number(event.target.value) || 1));
  if (event.target.hasAttribute("data-flow-motion")) scene.motion = event.target.value;
  if (event.target.hasAttribute("data-flow-transition")) scene.transition = event.target.value;
  updateFlowPreview();
});
$("#flow-scenes").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const card = button?.closest("[data-flow-id]");
  const index = flowScenes.findIndex((item) => item.id === card?.dataset.flowId);
  if (index < 0) return;
  let timelineChanged = false;
  if (button.hasAttribute("data-flow-crop")) {
    openFlowCrop(flowScenes[index]); return;
  } else if (button.hasAttribute("data-flow-remove")) {
    URL.revokeObjectURL(flowScenes[index].url); flowScenes.splice(index, 1); timelineChanged = true;
  } else if (button.dataset.flowMove === "up" && index > 0) {
    [flowScenes[index - 1], flowScenes[index]] = [flowScenes[index], flowScenes[index - 1]]; timelineChanged = true;
  } else if (button.dataset.flowMove === "down" && index < flowScenes.length - 1) {
    [flowScenes[index + 1], flowScenes[index]] = [flowScenes[index], flowScenes[index + 1]]; timelineChanged = true;
  }
  if (timelineChanged) flowNarrationContext.text = "";
  renderFlowScenes();
});
function updateFlowCropPreview() {
  const zoom = Number($("#flow-crop-zoom").value); const x = Number($("#flow-crop-x").value); const y = Number($("#flow-crop-y").value);
  $("#flow-crop-zoom-value").textContent = `%${zoom}`; $("#flow-crop-x-value").textContent = `%${x}`; $("#flow-crop-y-value").textContent = `%${y}`;
  const image = $("#flow-crop-image"); image.style.objectPosition = `${x}% ${y}%`;
  image.style.transform = `scale(${zoom / 100})`; image.style.transformOrigin = `${x}% ${y}%`;
}
function openFlowCrop(scene) {
  editingFlowCropId = scene.id; $("#flow-crop-image").src = scene.url;
  $("#flow-crop-zoom").value = String(Math.round((scene.cropZoom || 1) * 100));
  $("#flow-crop-x").value = String(scene.cropX ?? 50); $("#flow-crop-y").value = String(scene.cropY ?? 50);
  $("#flow-crop-preview").className = `crop-preview ${$("#flow-format").value}`;
  updateFlowCropPreview(); $("#flow-crop-modal").classList.remove("hidden");
}
function closeFlowCrop() { editingFlowCropId = null; $("#flow-crop-modal").classList.add("hidden"); }
[$("#flow-crop-zoom"), $("#flow-crop-x"), $("#flow-crop-y")].forEach((input) => input.addEventListener("input", updateFlowCropPreview));
$("#flow-crop-reset").addEventListener("click", () => { $("#flow-crop-zoom").value = "100"; $("#flow-crop-x").value = "50"; $("#flow-crop-y").value = "50"; updateFlowCropPreview(); });
$("#flow-crop-close").addEventListener("click", closeFlowCrop); $("#flow-crop-cancel").addEventListener("click", closeFlowCrop);
$("#flow-crop-modal").addEventListener("click", (event) => { if (event.target.id === "flow-crop-modal") closeFlowCrop(); });
$("#flow-crop-apply").addEventListener("click", () => {
  const scene = flowScenes.find((item) => item.id === editingFlowCropId); if (!scene) return closeFlowCrop();
  scene.cropZoom = Number($("#flow-crop-zoom").value) / 100; scene.cropX = Number($("#flow-crop-x").value); scene.cropY = Number($("#flow-crop-y").value);
  renderFlowScenes(); closeFlowCrop(); toast("Sahne kadrajı güncellendi");
});
$("#flow-scenes").addEventListener("dragstart", (event) => {
  if (!event.target.closest("[data-flow-drag]")) { event.preventDefault(); return; }
  const card = event.target.closest("[data-flow-id]");
  if (!card) return;
  draggedFlowSceneId = card.dataset.flowId; card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", draggedFlowSceneId);
});
$("#flow-scenes").addEventListener("dragover", (event) => {
  const target = event.target.closest("[data-flow-id]");
  if (!target || target.dataset.flowId === draggedFlowSceneId) return;
  event.preventDefault(); target.classList.add("drag-over");
});
$("#flow-scenes").addEventListener("dragleave", (event) => event.target.closest("[data-flow-id]")?.classList.remove("drag-over"));
$("#flow-scenes").addEventListener("drop", (event) => {
  event.preventDefault();
  const target = event.target.closest("[data-flow-id]");
  const from = flowScenes.findIndex((scene) => scene.id === draggedFlowSceneId);
  const to = flowScenes.findIndex((scene) => scene.id === target?.dataset.flowId);
  if (from >= 0 && to >= 0 && from !== to) { const [moved] = flowScenes.splice(from, 1); flowScenes.splice(to, 0, moved); flowNarrationContext.text = ""; }
  draggedFlowSceneId = null; renderFlowScenes();
});
$("#flow-scenes").addEventListener("dragend", () => {
  draggedFlowSceneId = null;
  document.querySelectorAll(".flow-scene.dragging,.flow-scene.drag-over").forEach((card) => card.classList.remove("dragging", "drag-over"));
});

let touchDragCard = null;
$("#flow-scenes").addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" || !event.target.closest("[data-flow-drag]")) return;
  touchDragCard = event.target.closest("[data-flow-id]"); draggedFlowSceneId = touchDragCard?.dataset.flowId || null;
  touchDragCard?.classList.add("dragging"); event.target.setPointerCapture?.(event.pointerId);
});
$("#flow-scenes").addEventListener("pointermove", (event) => {
  if (!touchDragCard) return;
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-flow-id]");
  if (!target || target === touchDragCard) return;
  const from = flowScenes.findIndex((scene) => scene.id === draggedFlowSceneId);
  const to = flowScenes.findIndex((scene) => scene.id === target.dataset.flowId);
  if (from >= 0 && to >= 0) {
    const [moved] = flowScenes.splice(from, 1); flowScenes.splice(to, 0, moved); flowNarrationContext.text = ""; renderFlowScenes();
    touchDragCard = document.querySelector(`[data-flow-id="${draggedFlowSceneId}"]`); touchDragCard?.classList.add("dragging");
  }
});
function finishTouchFlowDrag() { touchDragCard?.classList.remove("dragging"); touchDragCard = null; draggedFlowSceneId = null; }
$("#flow-scenes").addEventListener("pointerup", finishTouchFlowDrag);
$("#flow-scenes").addEventListener("pointercancel", finishTouchFlowDrag);
document.addEventListener("pointerup", finishTouchFlowDrag);

$("#flow-bulk-duration-apply").addEventListener("click", () => {
  if (!flowScenes.length) return toast("Önce fotoğraf ekle", "error");
  const seconds = Number($("#flow-bulk-duration").value);
  flowScenes.forEach((scene) => { scene.seconds = seconds; });
  if (seconds <= 5) $("#flow-duration").value = String(seconds);
  renderFlowScenes(); toast(`Tüm sahneler ${seconds} saniye yapıldı`);
});
function closeBulkTextModal() { $("#flow-bulk-text-modal").classList.add("hidden"); }
$("#flow-bulk-text-open").addEventListener("click", () => {
  if (!flowScenes.length) return toast("Önce fotoğraf ekle", "error");
  $("#flow-bulk-textarea").value = flowScenes.map((scene) => scene.text || "").join("\n");
  $("#flow-bulk-text-modal").classList.remove("hidden"); $("#flow-bulk-textarea").focus();
});
$("#flow-bulk-text-close").addEventListener("click", closeBulkTextModal);
$("#flow-bulk-text-cancel").addEventListener("click", closeBulkTextModal);
$("#flow-bulk-text-modal").addEventListener("click", (event) => { if (event.target.id === "flow-bulk-text-modal") closeBulkTextModal(); });
$("#flow-bulk-text-apply").addEventListener("click", () => {
  const lines = $("#flow-bulk-textarea").value.replace(/\r/g, "").split("\n");
  flowScenes.forEach((scene, index) => { scene.text = (lines[index] || "").trim(); });
  flowNarrationContext.text = "";
  activeFlowCopy = null; $("#flow-copy-active").classList.add("hidden");
  renderFlowScenes(); closeBulkTextModal(); toast("Sahne metinleri güncellendi");
});
$("#flow-render").addEventListener("click", async () => {
  if (flowRendering) return;
  trackProductEvent("render_started");
  flowRendering = true;
  updateFlowCompatibility();
  $("#flow-progress").classList.remove("hidden"); $("#flow-result").classList.add("hidden");
  try {
    await renderFlowVideo(); trackFlowStage("rendered"); trackProductEvent("render_completed", { result:"success" });
    toast(flowOutput?.warning || "Video cihazında oluşturuldu", flowOutput?.warning ? "warn" : "ok");
  }
  catch (error) { trackRenderError(); trackProductEvent("render_failed", { result:"failure" }); toast(error.message, "error"); }
  finally { flowRendering = false; updateFlowCompatibility(); $("#flow-progress").classList.add("hidden"); }
});
$("#flow-share").addEventListener("click", () => shareFlowVideo().catch((error) => {
  if (error.name !== "AbortError") toast(error.message, "error");
}));
$("#flow-local-save").addEventListener("click", () => saveLocalFlowOutput()
  .then(() => toast("Video bu cihazda saklandı"))
  .catch((error) => toast(error.message, "error")));
$("#flow-cloud-save").addEventListener("click", () => saveFlowVideoToCloud().catch((error) => {
  $("#flow-cloud-status").classList.remove("hidden");
  $("#flow-cloud-status").textContent = error.message;
  toast(error.message, "error");
}));
$("#publish-kit-create").addEventListener("click", () => { try { buildPublishKit(); } catch (error) { toast(error.message, "error"); } });
$("#publish-platform").addEventListener("change", buildPublishKit);
document.querySelectorAll("[data-copy-publish]").forEach((button) => button.addEventListener("click", () =>
  copyPublishField(button.dataset.copyPublish).catch((error) => toast(error.message, "error"))));
$("#publish-cover-download").addEventListener("click", () => downloadFlowCover().catch((error) => toast(error.message, "error")));
document.querySelectorAll("[data-share-platform]").forEach((button) => button.addEventListener("click", () =>
  shareFlowVideo(button.dataset.sharePlatform).catch((error) => {
    if (error.name !== "AbortError") toast(error.message, "error");
  })));
$("#flow-download").addEventListener("click", () => { trackFlowStage("shared"); trackProductEvent("video_downloaded"); });
$("#flow-compatibility-more").addEventListener("click", (event) => {
  const details = $("#flow-compatibility-details");
  const open = details.classList.toggle("hidden") === false;
  event.currentTarget.setAttribute("aria-expanded", String(open));
  event.currentTarget.textContent = open ? flowRuntime("hide") : flowRuntime("details");
});
$("#analytics-reset").addEventListener("click", () => {
  if (!confirm("Bu cihazdaki kullanım istatistikleri sıfırlansın mı?")) return;
  localStorage.removeItem(LOCAL_ANALYTICS_KEY); flowAnalyticsStages = new Set(); renderLocalAnalytics();
  toast("Yerel kullanım verileri sıfırlandı");
});
function closeWelcomeGuide() {
  $("#welcome-guide").classList.add("hidden");
  try { localStorage.setItem(WELCOME_SEEN_KEY, "1"); } catch {}
}
function showWelcomeWhenReady() {
  try {
    const ready = Boolean(preferredUiLanguage)
      && Boolean(localStorage.getItem("orbit-legal-acceptance-v1"))
      && $("#language-gate").classList.contains("hidden")
      && $("#legal-gate").classList.contains("hidden")
      && !localStorage.getItem(WELCOME_SEEN_KEY);
    try { updateWelcomeGuideAccess(); } catch {}
    $("#welcome-guide").classList.toggle("hidden", !ready);
  } catch {}
}
function updateWelcomeGuideAccess() {
  const serviceReady = Boolean(state.runtime?.capabilities?.managedText || state.runtime?.cloudflareConfigured);
  const needsAccount = serviceReady && !state.runtime?.account;
  const demoReady = Boolean(state.runtime?.demoAvailable && serviceReady);
  const copy = {
    tr: needsAccount ? { button:"Ücretsiz hesap oluştur →", note:"Demo için API anahtarı gerekmez; yalnızca ücretsiz hesabına bağlanır." } : demoReady ? { button:"İlk videomu oluştur →", note:"Demo için API anahtarı gerekmez." } : { button:"Ücretsiz manuel video oluştur →", note:"Otomatik demo kullanılamıyor; kendi içeriğinle cihazında ücretsiz video oluşturabilirsin." },
    en: needsAccount ? { button:"Create a free account →", note:"No API key is needed; the demo is simply linked to your free account." } : demoReady ? { button:"Create my first video →", note:"No API key is needed for the demo." } : { button:"Create a free manual video →", note:"The automatic demo is unavailable; you can still create a free on-device video with your own content." },
    es: needsAccount ? { button:"Crear una cuenta gratis →", note:"No necesitas una clave API; la demo solo se vincula a tu cuenta gratuita." } : demoReady ? { button:"Crear mi primer vídeo →", note:"No necesitas una clave API para la demo." } : { button:"Crear un vídeo manual gratis →", note:"La demo automática no está disponible; aún puedes crear gratis un vídeo en tu dispositivo con tu contenido." }
  }[lang()];
  $("#welcome-guide-demo").textContent = copy.button;
  $("#welcome-guide-access").textContent = copy.note;
  $("#welcome-guide-demo").dataset.mode = needsAccount ? "register" : demoReady ? "automatic" : "manual";
}
$("#welcome-guide-close").addEventListener("click", closeWelcomeGuide);
$("#welcome-guide-skip").addEventListener("click", closeWelcomeGuide);
$("#welcome-guide-demo").addEventListener("click", () => {
  closeWelcomeGuide();
  const mode = $("#welcome-guide-demo").dataset.mode;
  if (mode === "register") {
    openAccountModal("register");
    return;
  }
  const automatic = mode !== "manual";
  openControlAction(automatic ? "automatic" : "manual");
  if (!automatic) return;
  const suggestions = {
    tr:"Çoğu insanın bilmediği şaşırtıcı bir günlük hayat gerçeği",
    en:"A surprising everyday fact most people do not know",
    es:"Un dato cotidiano sorprendente que la mayoría desconoce"
  };
  if (!$("#automatic-topic").value.trim()) $("#automatic-topic").value = suggestions[lang()] || suggestions.tr;
  $("#automatic-topic").focus();
  toast("Konu hazır — istersen değiştir, ardından taslağını oluştur");
});
$("#welcome-guide").addEventListener("click", (event) => {
  if (event.target.id === "welcome-guide") closeWelcomeGuide();
});

document.querySelectorAll(".nav-step").forEach((button) =>
  button.addEventListener("click", () => showStep(button.dataset.step)));
$("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  showStep("dashboard");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
document.querySelectorAll("[data-mobile-step]").forEach((button) => button.addEventListener("click", () => showStep(button.dataset.mobileStep)));
document.querySelector("[data-mobile-create]")?.addEventListener("click", () => openControlAction("automatic"));
document.querySelector("[data-mobile-settings]")?.addEventListener("click", () => {
  showStep("dashboard"); $("#settings-panel").classList.remove("hidden"); $("#settings-panel").scrollIntoView({ behavior:"smooth" });
});
document.querySelectorAll("[data-mobile-flow]").forEach((button) => button.addEventListener("click", () => showMobileFlowPanel(button.dataset.mobileFlow)));
$("#mobile-flow-prev").addEventListener("click", () => showMobileFlowPanel(mobileFlowOrder[Math.max(0, mobileFlowOrder.indexOf(mobileFlowPanel) - 1)]));
$("#mobile-flow-next").addEventListener("click", () => {
  const index = mobileFlowOrder.indexOf(mobileFlowPanel);
  if (!flowScenes.length) return toast("Fotoğraf ekle veya örnek projeyi dene", "error");
  if (index === mobileFlowOrder.length - 1) return $("#flow-render").click();
  showMobileFlowPanel(mobileFlowOrder[index + 1]);
});
$("#workflow-toggle").addEventListener("click", () => openControlAction("automatic"));
$("#settings-toggle").addEventListener("click", () =>
  $("#settings-panel").classList.toggle("hidden"));
$("#niche-add-toggle").addEventListener("click", () => {
  $("#niche-add-row").classList.toggle("hidden");
  if (!$("#niche-add-row").classList.contains("hidden")) $("#niche-custom").focus();
});
function addCustomNiche() {
  const value = $("#niche-custom").value.trim().replace(/\s+/g, " ").slice(0, 60);
  if (value.length < 2) return toast({ tr:"En az iki karakter girin", en:"Enter at least two characters", es:"Introduce al menos dos caracteres" }[lang()], "error");
  const values = customNiches();
  if (!values.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
    values.push(value);
    try { localStorage.setItem(CUSTOM_NICHES_KEY, JSON.stringify(values.slice(-30))); } catch {}
  }
  renderNicheOptions(value);
  $("#niche-custom").value = "";
  $("#niche-add-row").classList.add("hidden");
  toast({ tr:"Yeni kanal nişi eklendi", en:"New channel niche added", es:"Se añadió un nuevo nicho" }[lang()]);
}
$("#niche-add-confirm").addEventListener("click", addCustomNiche);
$("#niche-custom").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); addCustomNiche(); }
  if (event.key === "Escape") $("#niche-add-row").classList.add("hidden");
});
document.querySelectorAll("[data-settings-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-settings-tab]").forEach((node) =>
      node.classList.toggle("active", node === button));
    document.querySelectorAll("[data-settings-pane]").forEach((pane) =>
      pane.classList.toggle("active", pane.dataset.settingsPane === button.dataset.settingsTab));
  }));
const modelCatalog = {
  gemini: [
    ["gemini-3.6-flash", "Gemini 3.6 Flash"]
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
  const qualities = {
    "gpt-5.6-luna":"economical", "gpt-5.6-terra":"balanced", "gpt-5.6-sol":"strongest",
    "claude-haiku-4-5":"fast", "claude-sonnet-5":"balanced", "claude-opus-4-8":"powerful", "claude-fable-5":"strongest"
  };
  const qualityLabels = {
    tr:{economical:"ekonomik",balanced:"dengeli",strongest:"en güçlü",fast:"hızlı",powerful:"güçlü"},
    en:{economical:"economical",balanced:"balanced",strongest:"strongest",fast:"fast",powerful:"powerful"},
    es:{economical:"económico",balanced:"equilibrado",strongest:"más potente",fast:"rápido",powerful:"potente"}
  }[lang()];
  $("#text-model").innerHTML = models.map(([value, label]) => {
    const base = label.split(" · ")[0];
    const quality = qualities[value];
    return `<option value="${value}">${base}${quality ? ` · ${qualityLabels[quality]}` : ""}</option>`;
  }).join("");
  const defaultIndex = provider === "openai" || provider === "claude" ? 1 : 0;
  $("#text-model").value = models.some(([value]) => value === preferred)
    ? preferred : models[defaultIndex][0];
  const selectedLabel = $("#text-model").selectedOptions[0]?.textContent || "TERZİ önerisi";
  if ($("#selected-model-summary")) $("#selected-model-summary").textContent = `TERZİ önerisi · ${selectedLabel}`;
}
$("#provider").addEventListener("change", () => {
  updateModelChoices();
  renderAiProviderCards();
});
$("#text-model").addEventListener("change", () => {
  const label = $("#text-model").selectedOptions[0]?.textContent || $("#text-model").value;
  if ($("#selected-model-summary")) $("#selected-model-summary").textContent = `Manuel · ${label}`;
});
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
  },
  youtube: {
    name: "YouTube Trendleri", label: "YouTube Data API anahtarı",
    runtimeKey: "youtubeConfigured", help: "Ülke ve kategori bazlı popüler video sinyallerini getirir."
  },
  youtubeUpload: {
    name: "YouTube Yükleme", label: "Google OAuth Client Secret",
    runtimeKey: "youtubeOauthClientConfigured",
    help: "Google Cloud OAuth Client ID ve Secret ile kanal yükleme izni bağlantısını hazırlar. Callback: http://127.0.0.1:4310/api/youtube/oauth/callback"
  },
  telegram: {
    name: "Telegram Bot", label: "Telegram Bot tokenı",
    runtimeKey: "telegramConfigured", help: "Projeleri Telegram üzerinden editör onayına gönderir."
  }
};
function renderAccessOverview() {
  const demo = state.runtime?.demo || { used: 0, limit: 1 };
  const serviceReady = Boolean(state.runtime?.capabilities?.managedText || state.runtime?.cloudflareConfigured);
  const ready = Boolean(state.runtime?.demoAvailable && serviceReady);
  const status = $("#demo-access-status");
  const statusCopy = {
    tr:{ready:"Kullanıma hazır · 1/1",used:"Deneme kullanıldı · Pro ile devam et",account:"Ücretsiz hesapla kullanılabilir",verify:"E-postanı doğrulayarak aç",wait:"Demo hazırlanıyor · tekrar dene",off:"Demo şu anda kullanılamıyor"},
    en:{ready:"Ready · 1/1",used:"Trial used · continue with Pro",account:"Available with a free account",verify:"Verify your email to unlock",wait:"Preparing demo · try again",off:"Demo is currently unavailable"},
    es:{ready:"Lista · 1/1",used:"Prueba utilizada · continúa con Pro",account:"Disponible con una cuenta gratuita",verify:"Verifica tu correo para activarla",wait:"Preparando la demo · inténtalo de nuevo",off:"La demo no está disponible ahora"}
  }[lang()];
  if (status) status.textContent = ready ? statusCopy.ready
    : Number(demo.used || 0) >= Number(demo.limit || 1) ? statusCopy.used
      : !state.runtime?.account ? statusCopy.account
        : state.runtime.account.emailVerified === false ? statusCopy.verify
        : serviceReady ? statusCopy.wait : statusCopy.off;
  const card = document.querySelector(".access-plan.demo");
  const pro = state.runtime?.account?.plan === "pro" && ["active", "trialing"].includes(state.runtime?.account?.status);
  card?.classList.toggle("active", !pro);
  card?.classList.toggle("used", !ready && Number(demo.used || 0) >= Number(demo.limit || 1));
  const creatorReady = ["gemini","openai","claude"].some((provider) => hasReadyAiCredential(provider));
  document.querySelector(".access-plan.creator")?.classList.toggle("active", creatorReady);
  if ($("#creator-access-status")) $("#creator-access-status").textContent = creatorReady
    ? `${providerDisplayNames[readyTextProvider()] || "AI"} hazır` : "Anahtar bekleniyor";
  updateWelcomeGuideAccess();
  renderAccountAccess();
}

const aiProviderCapabilities = {
  gemini: ["Hikâye", "AI görsel", "Fotoğraf analizi", "Çok dilli ses"],
  openai: ["Hikâye", "AI görsel", "Fotoğraf analizi"],
  claude: ["Hikâye", "Fotoğraf analizi"]
};
function renderAiProviderCards() {
  const selected = $("#provider").value || state.settings?.provider || "gemini";
  document.querySelectorAll("[data-ai-provider]").forEach((button) => {
    const active = button.dataset.aiProvider === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  if ($("#integration-capabilities")) {
    $("#integration-capabilities").innerHTML = (aiProviderCapabilities[selected] || [])
      .map((item) => `<span>✓ ${item}</span>`).join("");
  }
}

function renderAccountAccess() {
  const copy = {
    tr:{create:"Hesap oluştur",account:"Hesabım",creator:"Ücretsiz",creatorCopy:"Cihaz içi üretim ücretsiz · yönetilen özellikler Pro'da",pro:"Atölye Pro",proCopy:"Yönetilen AI ve bulut kayıt aktif",active:"Aktif",ready:"Yükseltmeye hazır",soon:"Ödemeler yakında açılacak",required:"Ücretsiz hesap gerekli",upgrade:"Pro'ya geç",manage:"Üyeliği yönet"},
    en:{create:"Create account",account:"My account",creator:"Free",creatorCopy:"On-device creation is free · managed features are in Pro",pro:"Atölye Pro",proCopy:"Managed AI and cloud storage are active",active:"Active",ready:"Ready to upgrade",soon:"Payments opening soon",required:"Free account required",upgrade:"Upgrade to Pro",manage:"Manage membership"},
    es:{create:"Crear cuenta",account:"Mi cuenta",creator:"Gratis",creatorCopy:"La creación en el dispositivo es gratis · las funciones gestionadas están en Pro",pro:"Atölye Pro",proCopy:"IA gestionada y almacenamiento en la nube activos",active:"Activo",ready:"Listo para mejorar",soon:"Pagos disponibles próximamente",required:"Se requiere cuenta gratuita",upgrade:"Pasar a Pro",manage:"Gestionar membresía"}
  }[lang()] || {};
  const cloud = state.runtime?.deployment === "cloudflare";
  const account = state.runtime?.account;
  const pro = account?.plan === "pro" && ["active", "trialing"].includes(account?.status);
  $("#account-toggle")?.classList.toggle("hidden", !cloud);
  if ($("#account-toggle")) $("#account-toggle").textContent = account ? `${pro ? "Pro" : copy.creator} · ${copy.account}` : copy.create;
  $("#account-guest")?.classList.toggle("hidden", Boolean(account));
  $("#account-signed")?.classList.toggle("hidden", !account);
  if (account) {
    $("#account-email-view").textContent = account.email;
    $("#account-plan-name").textContent = pro ? copy.pro : copy.creator;
    $("#account-plan-copy").textContent = pro ? copy.proCopy : copy.creatorCopy;
    $("#account-upgrade").classList.toggle("hidden", pro);
    $("#account-upgrade").disabled = !state.runtime?.billingConfigured;
    $("#account-upgrade").textContent = state.runtime?.billingConfigured ? copy.upgrade : copy.soon;
    $("#account-manage").classList.toggle("hidden", !pro);
    $("#account-verification").classList.toggle("hidden", account.emailVerified !== false);
    if (account.emailVerified === false) ensureTurnstile("verify-turnstile").catch((error) => toast(error.message, "error"));
  }
  const proStatus = $("#pro-access-status");
  const remainingProjects = Number(state.runtime?.managedUsage?.projects?.remaining);
  if (proStatus) proStatus.textContent = pro
    ? Number.isFinite(remainingProjects) ? `${copy.active} · ${remainingProjects}/30` : copy.active
    : account
    ? state.runtime?.billingConfigured ? copy.ready : copy.soon
    : copy.required;
  document.querySelector(".access-plan.pro")?.classList.toggle("active", pro);
  if ($("#pro-upgrade")) {
    const billingReady = Boolean(state.runtime?.billingConfigured);
    $("#pro-upgrade").textContent = pro ? copy.manage : !billingReady ? copy.soon : account ? copy.upgrade : copy.create;
    $("#pro-upgrade").disabled = !pro && (!billingReady || account?.emailVerified === false);
  }
}

function setAccountMode(mode) {
  const copy = {
    tr:{login:"Giriş yap",register:"Ücretsiz hesap oluştur",loginHelp:"Hesabına bağlı projeler bu cihazda açılır.",registerHelp:"En az 12 karakter kullan. Parolan hiçbir zaman düz metin olarak saklanmaz."},
    en:{login:"Sign in",register:"Create free account",loginHelp:"Projects linked to your account open on this device.",registerHelp:"Use at least 12 characters. Your password is never stored as plain text."},
    es:{login:"Iniciar sesión",register:"Crear cuenta gratis",loginHelp:"Los proyectos vinculados a tu cuenta se abren en este dispositivo.",registerHelp:"Usa al menos 12 caracteres. Tu contraseña nunca se guarda como texto sin formato."}
  }[lang()];
  accountMode = mode === "login" ? "login" : "register";
  document.querySelectorAll("[data-account-mode]").forEach((button) => button.classList.toggle("active", button.dataset.accountMode === accountMode));
  $("#account-submit").textContent = accountMode === "login" ? copy.login : copy.register;
  $("#account-password").autocomplete = accountMode === "login" ? "current-password" : "new-password";
  $("#account-password-help").textContent = accountMode === "login" ? copy.loginHelp : copy.registerHelp;
}

function openAccountModal(mode = "register") {
  if (state.runtime?.deployment !== "cloudflare") {
    toast("Hesap ve üyelik bulut sürümünde kullanılabilir", "warn");
    return;
  }
  if (!state.runtime?.account) setAccountMode(mode);
  renderAccountAccess();
  $("#account-modal").classList.remove("hidden");
  if (!state.runtime?.account) ensureTurnstile("account-turnstile").catch((error) => toast(error.message, "error"));
  setTimeout(() => (state.runtime?.account ? $("#account-close") : $("#account-email"))?.focus(), 0);
}

function closeAccountModal() { $("#account-modal").classList.add("hidden"); }

async function startProCheckout() {
  if (!state.runtime?.account) return openAccountModal("register");
  if (state.runtime?.account?.plan === "pro") {
    const portal = await api("/api/billing/portal", { method:"POST" });
    window.location.assign(portal.url); return;
  }
  if (!state.runtime?.billingConfigured) throw new Error("Atölye Pro ödemeleri henüz kullanıma açılmadı");
  trackProductEvent("checkout_started");
  const checkout = await api("/api/billing/checkout", { method:"POST" });
  window.location.assign(checkout.url);
}

function updateIntegrationForm() {
  const selected = $("#integration-provider").value;
  const config = integrationCatalog[selected];
  const deviceProvider = selected === "anthropic" ? "claude" : selected;
  const deviceKey = localStorage.getItem(`orbit-device-key-${deviceProvider}`) || "";
  const managed = selected === "cloudflare" && promptImageGenerationAvailable();
  const configured = Boolean(managed || state.runtime?.[config.runtimeKey] || deviceKey);
  const aiService = ["gemini", "openai", "anthropic"].includes(selected);
  const ready = aiService ? hasReadyAiCredential(deviceProvider) : configured;
  const copy = {
    tr:{key:"API anahtarı",token:"API Token",ready:"• hazır",missing:"• eksik",saved:"••••••••••••  kayıtlı — değiştirmek için gir",helpText:"Seçtiğin modelle hikâye ve metin üretir.",helpImage:"AI görsellerini üretmek için kullanılır.",enter:"gir"},
    en:{key:"API key",token:"API Token",ready:"• ready",missing:"• missing",saved:"••••••••••••  saved — enter to replace",helpText:"Creates stories and copy with your selected model.",helpImage:"Used to generate AI visuals.",enter:"enter"},
    es:{key:"Clave API",token:"Token API",ready:"• listo",missing:"• falta",saved:"••••••••••••  guardada — escribe para cambiar",helpText:"Crea historias y textos con el modelo seleccionado.",helpImage:"Se utiliza para generar imágenes con IA.",enter:"introducir"}
  }[lang()];
  const providerName = selected === "anthropic" ? "Claude" : config.name.split(" ")[0];
  const label = selected === "cloudflare" ? `Cloudflare ${copy.token}`
    : selected === "youtubeUpload" ? "Google OAuth Client Secret"
    : selected === "telegram" ? "Telegram Bot Token" : `${providerName} ${copy.key}`;
  $("#integration-name").textContent = config.name;
  $("#integration-key-label").textContent = label;
  $("#integration-help").textContent = managed
    ? "AI görselleri TERZİ tarafından yönetiliyor. Account ID veya API Token girmen gerekmez."
    : config.help;
  $("#integration-status").textContent = ready ? copy.ready : configured ? "• etkinleştir" : copy.missing;
  $("#integration-status").className = ready ? "configured" : configured ? "pending" : "missing";
  $("#integration-key").value = "";
  $("#integration-key").placeholder = configured
    ? copy.saved
    : `${label} ${copy.enter}`;
  $("#integration-key-field").classList.toggle("hidden", managed);
  document.querySelector(".model-advanced")?.classList.toggle("hidden", !aiService);
  if (aiService) {
    const textProvider = selected === "anthropic" ? "claude" : selected;
    $("#provider").value = textProvider;
    renderAiProviderCards();
  }
  const accountField = $("#cloudflare-account-field");
  accountField.classList.toggle("hidden", managed || !["cloudflare", "telegram", "youtubeUpload"].includes(selected));
  accountField.querySelector("label").textContent = selected === "telegram" ? "Telegram Chat ID"
    : selected === "youtubeUpload" ? "Google OAuth Client ID" : "Cloudflare Account ID";
  $("#cloudflare-account").placeholder = selected === "telegram" ? "Örn. 123456789"
    : selected === "youtubeUpload" ? "….apps.googleusercontent.com" : "32 karakterli Account ID";
}
$("#integration-provider").addEventListener("change", updateIntegrationForm);
document.querySelectorAll("[data-ai-provider]").forEach((button) => button.addEventListener("click", () => {
  const provider = button.dataset.aiProvider;
  $("#provider").value = provider;
  updateModelChoices();
  $("#integration-provider").value = provider === "claude" ? "anthropic" : provider;
  updateIntegrationForm();
  $("#integration-key").focus();
}));
document.querySelectorAll("[data-integration-service]").forEach((button) => button.addEventListener("click", () => {
  const advanced = document.querySelector(".advanced-ai-connection");
  if (advanced) advanced.open = true;
  $("#integration-provider").value = button.dataset.integrationService;
  updateIntegrationForm();
  $("#integration-key").scrollIntoView({ behavior:"smooth", block:"center" });
  $("#integration-key").focus();
}));
$("#integration-key-help").addEventListener("click", () => {
  const selected = $("#integration-provider").value;
  const provider = selected === "anthropic" ? "claude" : selected;
  const urls = {
    ...providerKeyUrls,
    youtube:"https://console.cloud.google.com/apis/credentials",
    youtubeUpload:"https://console.cloud.google.com/apis/credentials",
    telegram:"https://t.me/BotFather"
  };
  if (urls[provider]) window.open(urls[provider], "_blank", "noopener,noreferrer");
});
$("#close-settings").addEventListener("click", () => $("#settings-panel").classList.add("hidden"));
$("#save-settings").addEventListener("click", async () => {
  const integrationProvider = $("#integration-provider").value;
  const integrationKey = $("#integration-key").value.trim();
  const cloudflareAccount = $("#cloudflare-account").value.trim();
  const cloudDeployment = state.runtime?.deployment === "cloudflare";
  const deviceProviders = ["gemini", "openai", "anthropic", "youtube"];
  if (integrationKey && ["gemini", "openai", "anthropic"].includes(integrationProvider)) {
    const selectedTextProvider = integrationProvider === "anthropic" ? "claude" : integrationProvider;
    $("#provider").value = selectedTextProvider;
    state.settings.provider = selectedTextProvider;
    updateModelChoices();
  }
  if (integrationKey && cloudDeployment && deviceProviders.includes(integrationProvider)) {
    const deviceProvider = integrationProvider === "anthropic" ? "claude" : integrationProvider;
    localStorage.setItem(`orbit-device-key-${deviceProvider}`, integrationKey);
    state.runtime[integrationCatalog[integrationProvider].runtimeKey] = true;
  }
  if (integrationKey && !cloudDeployment && integrationProvider === "gemini") {
    await api("/api/config/gemini-key", {
      method: "PUT",
      body: JSON.stringify({ key: integrationKey })
    });
  }
  if (integrationKey && !cloudDeployment && ["openai", "anthropic"].includes(integrationProvider)) {
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
  if (integrationKey && !cloudDeployment && integrationProvider === "youtube") {
    await api("/api/config/youtube-key", {
      method: "PUT", body: JSON.stringify({ key: integrationKey })
    });
  }
  if (integrationKey && integrationProvider === "telegram") {
    if (cloudDeployment) {
      throw new Error("Cloudflare sürümünde Telegram bilgileri arayüzden değil Worker secret'larıyla yapılandırılır");
    }
    if (!cloudflareAccount) throw new Error("Telegram Chat ID gerekli");
    await api("/api/config/telegram", {
      method:"PUT", body:JSON.stringify({ token:integrationKey, chatId:cloudflareAccount })
    });
  }
  if (integrationKey && integrationProvider === "youtubeUpload") {
    if (state.runtime?.deployment === "cloudflare") {
      throw new Error("YouTube yükleme bağlantısı yerel TERZİ sunucusunda yapılandırılabilir");
    }
    if (!cloudflareAccount) throw new Error("Google OAuth Client ID gerekli");
    const result = await api("/api/config/youtube-oauth", {
      method:"PUT", body:JSON.stringify({ clientId:cloudflareAccount, clientSecret:integrationKey })
    });
    toast(`YouTube OAuth kaydedildi. Google callback adresi: ${result.redirectUri}`);
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
  if (integrationKey && ["gemini", "openai", "anthropic"].includes(integrationProvider)) {
    const consentProvider = integrationProvider === "anthropic" ? "claude" : integrationProvider;
    if (!hasReadyAiCredential(consentProvider)) {
      openAiKeyModal(consentProvider);
      $("#ai-key-modal-copy").textContent = "API anahtarın güvenli biçimde kaydedildi. Hikâye, görsel veya dosyaları bu sağlayıcıya göndermeden önce veri aktarımını onayla.";
      $("#ai-key-modal-settings").textContent = "Onayla ve bağlantıyı etkinleştir →";
      return;
    }
  }
  resumePendingAiAction();
});
$("#ui-language").addEventListener("change", () => {
  preferredUiLanguage = $("#ui-language").value;
  state.settings.uiLanguage = preferredUiLanguage;
  try { localStorage.setItem(UI_LANGUAGE_KEY, preferredUiLanguage); } catch {}
  renderState(); showStep(activeStep);
});
$("#media-source").addEventListener("change", updateSourceMode);
$("#image-project").addEventListener("change", () => {
  sourceStartsNewProject = false;
  renderSelectedProjectImages();
});
$("#open-image-project").addEventListener("click", () => {
  const projectId = $("#image-project").value;
  if (projectId) openEditor(projectId);
});
$("#custom-image-file").addEventListener("change", () => {
  const file = $("#custom-image-file").files[0];
  if (customImagePreviewUrl) URL.revokeObjectURL(customImagePreviewUrl);
  customImagePreviewUrl = file ? URL.createObjectURL(file) : "";
  if (file) {
    $("#custom-image-preview").src = customImagePreviewUrl;
    $("#custom-image-preview").classList.remove("hidden");
    $("#custom-image-icon").classList.add("hidden");
  } else {
    $("#custom-image-preview").removeAttribute("src");
    $("#custom-image-preview").classList.add("hidden");
    $("#custom-image-icon").classList.remove("hidden");
  }
  $("#custom-image-name").textContent = file
    ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
    : ({ tr:"Dosya seçilmedi", en:"No file selected", es:"Ningún archivo seleccionado" }[lang()]);
  $("#custom-image-upload").classList.toggle("selected", Boolean(file));
});
$("#production-format").addEventListener("change", updateFormatNote);
document.querySelectorAll("[data-creation-mode]").forEach((button) =>
  button.addEventListener("click", (event) => { event.preventDefault(); setCreationMode(button.dataset.creationMode); }));
function automaticVisualMethod() {
  return document.querySelector('[name="automatic-visual-method"]:checked')?.value || "archive";
}
function selectDiverseArchiveAssets(items, limit = 6) {
  const candidates = [];
  const identities = new Set();
  const previews = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.riskFlags?.length) continue;
    const identity = `${item?.source || ""}:${item?.assetId || item?.nasaId || ""}`;
    const preview = String(item?.previewUrl || "");
    if (!item?.source || identity.endsWith(":") || identities.has(identity) || (preview && previews.has(preview))) continue;
    identities.add(identity);
    if (preview) previews.add(preview);
    candidates.push(item);
  }
  const target = Math.min(candidates.length, Math.max(1, Math.min(8, Number(limit) || 6)));
  if (target === candidates.length) return candidates;
  return Array.from({ length:target }, (_, index) => candidates[Math.floor(index * candidates.length / target)]);
}
function automaticBriefDirection() {
  const goals = {
    engagement:"maximize watch-through and meaningful engagement",
    followers:"earn follows by giving the viewer a clear reason to return",
    education:"teach one useful idea simply and accurately",
    sales:"introduce the product or service without sounding pushy"
  };
  const tones = {
    curious:"curiosity-driven",
    clear:"clear and informative",
    energetic:"energetic and entertaining",
    inspiring:"warm and inspiring"
  };
  const audience = $("#automatic-audience").value.trim() || state.settings.audience || "a general audience";
  return `Video goal: ${goals[$("#automatic-goal").value] || goals.engagement}. Target audience: ${audience}. Tone: ${tones[$("#automatic-tone").value] || tones.curious}.`;
}
function setAutomaticProgress(stage, detail, type = "working") {
  const host = $("#automatic-progress");
  host.classList.remove("hidden", "error");
  host.classList.toggle("error", type === "error");
  host.querySelector("b").textContent = stage;
  host.querySelector("span").textContent = detail;
}
function friendlyAutomaticError(error) {
  const message = String(error?.message || "");
  if (/network|fetch|bağlan|offline/i.test(message)) return "Bağlantı kesildi. Girdilerin duruyor; internetini kontrol edip tekrar dene.";
  if (/429|limit|quota|kota/i.test(message)) return "Kullanım sınırına ulaşıldı. Biraz sonra tekrar deneyebilirsin.";
  if (/boş veya eksik bir içerik paketi|geçerli bir hikâye döndüremedi/i.test(message)) return `Model geçerli bir taslak döndüremedi: ${message}`;
  if (/OpenAI|Gemini|Claude|Anthropic|model|billing|quota|kota|rate limit/i.test(message)) return message;
  if (/key|anahtar|configured|bağlı değil/i.test(message)) return "AI özelliği henüz bağlı değil. Ayarlar bölümünden bağlantıyı kurabilirsin.";
  if (/demo|deneme|pro|required|üyelik/i.test(message)) return `${message} Cihazda manuel video ve açık arşiv araçlarını ücretsiz kullanmaya devam edebilirsin.`;
  if (message && !/^işlem başarısız$/i.test(message)) return message;
  return "Taslak şu anda hazırlanamadı. Girdilerin korundu; tekrar deneyebilirsin.";
}
function updateAutomaticPhotoMode() {
  const files = [...$("#automatic-files").files];
  const ownPhotos = files.length > 0;
  const canAnalyzePhotos = Boolean(readyTextProvider());
  const aiVisualRadio = document.querySelector('[name="automatic-visual-method"][value="ai"]');
  const archiveVisualRadio = document.querySelector('[name="automatic-visual-method"][value="archive"]');
  const aiVisualReady = managedImageGenerationAvailable();
  const aiVisualCanActivate = aiVisualReady || Boolean(imageCredentialProvider());
  if (aiVisualRadio) {
    aiVisualRadio.disabled = !aiVisualCanActivate;
    aiVisualRadio.closest("label")?.classList.toggle("unavailable", !aiVisualCanActivate);
    if (!aiVisualCanActivate && aiVisualRadio.checked && archiveVisualRadio) archiveVisualRadio.checked = true;
  }
  const aiAccess = document.querySelector("[data-ai-visual-access]");
  if (aiAccess) aiAccess.textContent = aiVisualReady
    ? "Daha özgün · ücret seçtiğin AI sağlayıcına yansır"
    : aiVisualCanActivate ? "API anahtarı kayıtlı · veri aktarımını etkinleştir"
      : "Gemini veya OpenAI anahtarı bağlayarak açabilirsin";
  const topic = $("#automatic-topic");
  topic.required = !ownPhotos || !canAnalyzePhotos;
  topic.minLength = ownPhotos && !canAnalyzePhotos ? 12 : ownPhotos ? 0 : 3;
  $("#automatic-topic-label").textContent = ownPhotos
    ? canAnalyzePhotos ? "Hikâye yönlendirmesi · isteğe bağlı" : "Fotoğrafları nasıl anlatmalıyım?"
    : "Video konusu";
  topic.placeholder = ownPhotos
    ? canAnalyzePhotos ? "Örn: Samimi bir gezi hikâyesi anlat (boş bırakabilirsin)" : "Örn: Bu fotoğraflarla samimi bir gezi hikâyesi anlat"
    : "Örn: Çocuklar için gezegenleri anlat";
  $("#automatic-files-summary").textContent = ownPhotos
    ? `${files.length} fotoğraf ana kaynak olarak kullanılacak · ${files.map((file) => file.name).join(", ")}`
    : "Fotoğraf seçilmezse konuya göre arşiv veya AI görseli kullanılır.";
  $("#automatic-photo-ai-note").classList.toggle("hidden", !ownPhotos);
  if (ownPhotos) {
    $("#automatic-photo-ai-note").textContent = canAnalyzePhotos
      ? "Fotoğraflar hikâyeyi anlayabilmesi için seçtiğin AI sağlayıcısına aktarılır."
      : "Demo fotoğrafların içeriğini analiz etmez. Yanlış bir hikâye oluşmaması için yukarıya ne anlatılacağını yazmalısın.";
  }
  $("#automatic-story-mode-field").classList.toggle("hidden", !ownPhotos);
  $("#automatic-visual-method-field").classList.toggle("hidden", ownPhotos);
  $("#automatic-archive-source").classList.toggle(
    "hidden",
    ownPhotos || automaticVisualMethod() !== "archive"
  );
  $("#automatic-archive-count").classList.toggle(
    "hidden",
    ownPhotos || automaticVisualMethod() !== "archive"
  );
  const automaticNotes = {
    tr:{ photos:"Arşiv aranmaz. Hikâye, yüklediğin fotoğrafların görünür içeriği ve varsa yönlendirmen üzerinden oluşturulur.", archive:"TERZİ konuya uygun farklı ve lisans bilgili arşiv görsellerini sahnelere dağıtacak; sonuçları yayınlamadan önce değiştirebilirsin.", ai:"TERZİ bir taslak hazırlayacak; yayınlamadan önce metni ve görselleri değiştirebilirsin." },
    en:{ photos:"The archive is not searched. The story is based on your uploaded photos and optional direction.", archive:"TERZİ will distribute different, licensed archive visuals across the scenes; you can change them before publishing.", ai:"TERZİ will prepare a draft; you can edit the copy and visuals before publishing." },
    es:{ photos:"No se busca en el archivo. La historia se basa en tus fotos y en las indicaciones opcionales.", archive:"TERZİ distribuirá imágenes diferentes y con licencia entre las escenas; podrás cambiarlas antes de publicar.", ai:"TERZİ preparará un borrador; podrás editar el texto y las imágenes antes de publicar." }
  }[lang()];
  $("#automatic-note").textContent = ownPhotos ? automaticNotes.photos
    : automaticVisualMethod() === "archive" ? automaticNotes.archive : automaticNotes.ai;
}
$("#automatic-files").addEventListener("change", updateAutomaticPhotoMode);
document.querySelectorAll("[data-topic-suggestion]").forEach((button) => button.addEventListener("click", () => {
  $("#automatic-topic").value = button.dataset.topicSuggestion;
  $("#automatic-topic").focus();
}));
document.querySelectorAll("[data-control-action]").forEach((button) =>
  button.addEventListener("click", () => openControlAction(button.dataset.controlAction)));
$("#workflow-context-home")?.addEventListener("click", () => showStep("dashboard"));
$("#workflow-context-methods")?.addEventListener("click", () => { showStep("source"); setCreationMode("automatic"); document.querySelector(".primary-modes")?.scrollIntoView({ behavior:"smooth", block:"center" }); });
document.querySelectorAll('[name="automatic-visual-method"]').forEach((input) =>
  input.addEventListener("change", updateAutomaticPhotoMode));
$("#manual-project-files").addEventListener("change", (event) => {
  const files = [...event.target.files];
  $("#manual-files-summary").textContent = files.length
    ? `${files.length} görsel · ${files.map((file) => file.name).join(", ")}`
    : { tr:"Henüz görsel seçilmedi", en:"No images selected yet", es:"Aún no se seleccionaron imágenes" }[lang()];
});
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
  if (!ensureAiConfigured("image", "editor-image")) return;
  const id = $("#editor-id").value;
  const item = state.productions.find((entry) => entry.id === id);
  if (item?.status !== "approved") {
    toast("Önce projeyi onayla", "warn");
    return;
  }
  const button = $("#generate-ai-scenes");
  button.disabled = true;
  button.textContent = "AI görselleri hazırlanıyor…";
  try {
    await api(`/api/productions/${id}/images`, { method: "POST" });
    await refresh();
    openEditor(id);
    toast("Yeni AI sahneleri projeye eklendi");
  } finally {
    button.disabled = false;
    button.textContent = "✦ Eksik sahneler için özgün görsel üret";
  }
});
async function saveProjectEditor(projectId = $("#editor-id").value) {
  return api(`/api/productions/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: $("#editor-title").value,
      hook: $("#editor-hook").value,
      narration: $("#editor-narration").value
    })
  });
}
$("#project-editor").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveProjectEditor();
  await refresh();
  openEditor($("#editor-id").value);
  toast(t("saved"));
});
["#editor-title", "#editor-hook", "#editor-narration"].forEach((selector) =>
  $(selector).addEventListener("input", () => updateCreatorChecklist())
);
$("#story-visual-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Proje ve sahneler hazırlanıyor…";
  const progress = startStoryProgress(button);
  try {
    const production = await api("/api/projects/from-story", {
      method: "POST",
      body: JSON.stringify({
        title: $("#story-project-title").value,
        narration: $("#story-project-text").value,
        visualStyle: $("#story-visual-style").value,
        contentProfile: $("#story-content-profile").value,
        contentLanguage: selectedContentLanguage(),
        contentType: $("#production-format").value,
        imageFit: $("#image-fit").value
      })
    });
    await refresh();
    openEditor(production.id);
    progress.complete();
    toast("Hikâye sahnelere bölündü; şimdi AI görsellerini oluşturabilirsin");
  } catch (error) {
    progress.fail();
    toast(error.message || "Proje oluşturulamadı. Lütfen tekrar dene.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = "Projeyi ve sahneleri oluştur <span>→</span>";
  }
});
$("#manual-creation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  const files = [...$("#manual-project-files").files];
  if (!files.length) return toast("En az bir görsel seç", "error");
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return toast("Her görsel en fazla 10 MB olabilir", "error");
  button.disabled = true;
  const progress = startStoryProgress(button);
  try {
    button.textContent = "Proje oluşturuluyor…";
    const production = await api("/api/projects/from-story", { method:"POST", body:JSON.stringify({
      title: $("#manual-project-title").value,
      narration: $("#manual-project-text").value,
      visualStyle: state.settings.visualStyle || "documentary",
      contentProfile: state.settings.contentProfile || "general",
      contentLanguage: selectedContentLanguage(),
      contentType: $("#production-format").value,
      imageFit: $("#image-fit").value,
      manual: true
    }) });
    for (let index = 0; index < files.length; index += 1) {
      button.textContent = `Görseller ekleniyor · ${index + 1}/${files.length}`;
      await api(`/api/productions/${production.id}/custom-image`, { method:"POST", body:JSON.stringify({ name:files[index].name, dataUrl:await readAsDataUrl(files[index]) }) });
    }
    await refresh(); openEditor(production.id);
    progress.complete();
    toast("Manuel projen hazır; metni ve görsel sırasını düzenleyebilirsin");
  } catch (error) {
    progress.fail();
    toast(error.message || "Dosyalar yüklenemedi. Lütfen tekrar dene.", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = "Manuel projeyi oluştur <span>→</span>";
  }
});
$("#automatic-creation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  trackProductEvent("creation_started");
  const selectedFiles = [...$("#automatic-files").files].slice(0, 12);
  if (!ensureAiConfigured("text", "automatic")) return;
  let visualMethod = selectedFiles.length ? "upload" : automaticVisualMethod();
  if (visualMethod === "ai" && !managedImageGenerationAvailable()) {
    if (imageCredentialProvider()) {
      ensureAiConfigured("image", "automatic");
      return;
    }
    const archiveRadio = document.querySelector('[name="automatic-visual-method"][value="archive"]');
    if (archiveRadio) archiveRadio.checked = true;
    visualMethod = "archive";
    updateAutomaticPhotoMode();
    toast("AI görsel erişimi olmadığı için açık arşiv otomatik seçildi.", "warn");
  }
  const direction = $("#automatic-topic").value.trim();
  const topic = direction || "Create one coherent, engaging story grounded only in the uploaded photos.";
  const creativeBrief = automaticBriefDirection();
  const button = event.submitter;
  button.disabled = true;
  let production = null;
  setAutomaticProgress("1/4 · Fikir netleştiriliyor", "Konu, hedef kitle ve anlatım tarzı birleştiriliyor.");
  try {
    let idea;
    let archiveAssetCount = 0;
    const storyMode = $("#automatic-story-mode").value;
    const storyBaseTopic = storyMode === "separate" && selectedFiles.length > 1
      ? `${topic}. Create a clearly separated mini-story section for each of the ${selectedFiles.length} uploaded photos, in the same order. Keep every section concise and ready for one video.`
      : topic;
    if (visualMethod === "archive" && !selectedFiles.length) {
      setAutomaticProgress("2/4 · Görseller seçiliyor", "Konuya uygun, farklı ve kullanım bilgisi bulunan arşiv görselleri aranıyor.");
      button.textContent = "Farklı arşiv görselleri aranıyor · %20";
      const source = $("#automatic-source").value;
      const search = await api(`/api/media/search?source=${source}&q=${encodeURIComponent(topic)}`);
      const searchMethod = search.interpretationMode === "visual-intent" ? "görsel niyetiyle" : "anahtar kelimelerle";
      setAutomaticProgress("2/4 · Görseller seçiliyor", `Konu “${search.interpretedAs || topic}” ${searchMethod} arandı.${search.fallbackReason ? ` ${search.fallbackReason}` : ""}`);
      const assets = selectDiverseArchiveAssets(search.items, $("#automatic-image-count").value);
      if (!assets.length) throw new Error("Bu konu için uygun ve risksiz bir arşiv görseli bulunamadı");
      archiveAssetCount = assets.length;
      button.textContent = `Arşiv görselleri hazırlanıyor · 1/${assets.length}`;
      idea = await api("/api/media/import", { method:"POST", body:JSON.stringify({ assetId:assets[0].assetId, source:assets[0].source, contentLanguage:selectedContentLanguage(), contentType:$("#production-format").value, imageFit:$("#image-fit").value }) });
      button.textContent = `Arşiv görselleri hazırlanıyor · ${assets.length}/${assets.length}`;
      idea = await api(`/api/ideas/${idea.id}/assets`, { method:"PUT", body:JSON.stringify({ topic:storyBaseTopic, creativeBrief, assets:assets.slice(1).map((asset) => ({ assetId:asset.assetId, source:asset.source })) }) });
    } else {
      setAutomaticProgress("2/4 · Taslak kuruluyor", selectedFiles.length ? "Fotoğrafların hikâye sırasına hazırlanıyor." : "Video yapısı hazırlanıyor.");
      button.textContent = "Proje taslağı hazırlanıyor · %20";
       idea = await api("/api/ideas", { method:"POST", body:JSON.stringify({ topic:storyBaseTopic, sources:selectedFiles.length ? `User-provided photos are the primary source. Filenames: ${selectedFiles.map((file) => file.name).join(", ")}. User direction: ${direction}. Creative brief: ${creativeBrief}` : `User topic: ${topic}. Creative brief: ${creativeBrief}`, contentLanguage:selectedContentLanguage(), contentType:$("#production-format").value, imageFit:$("#image-fit").value }) });
    }
    const imageInputs = [];
    if (selectedFiles.length) {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        button.textContent = `Fotoğraflar analiz için hazırlanıyor · ${index + 1}/${selectedFiles.length}`;
        imageInputs.push({
          name: selectedFiles[index].name,
          dataUrl: await readAsDataUrl(selectedFiles[index], {
            maxDimension: 768,
            targetLength: 260_000,
            maxLength: 320_000,
            initialQuality: .72,
            minQuality: .32
          })
        });
      }
    }
    const analyzePhotos = selectedFiles.length && Boolean(readyTextProvider());
    setAutomaticProgress("3/4 · Hikâye yazılıyor", analyzePhotos ? "Fotoğraflar incelenip tek bir anlatıya dönüştürülüyor." : "Açılış, anlatım ve sahneler hazırlanıyor.");
    button.textContent = analyzePhotos ? "AI fotoğrafları inceliyor · %50"
      : readyTextProvider() ? "AI hikâyeyi yazıyor · %50" : "Kaynak temelli taslak hazırlanıyor · %50";
    production = await api(`/api/ideas/${idea.id}/generate`, {
      method:"POST",
      body: JSON.stringify({ imageInputs: analyzePhotos ? imageInputs : [] })
    });
    trackProductEvent("story_generated", { result:"success" });
    button.textContent = "Sahneler hazırlanıyor · %75";
    // “TERZİ hazırlasın” yolu bir onay kuyruğunda durmaz; düzenleme yine isteğe bağlıdır.
    const automaticApproval = true;
    if (automaticApproval && production.status !== "approved") {
      await api(`/api/productions/${production.id}/approve`, { method:"POST" });
    }
    if (visualMethod === "ai" && automaticApproval) {
      setAutomaticProgress("4/4 · Görseller hazırlanıyor", "Sahneler için birbirinden farklı görseller oluşturuluyor.");
      button.textContent = "AI görselleri hazırlanıyor · %85";
      let imageBatch = await api(`/api/productions/${production.id}/images`, { method:"POST" });
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const generatedCount = (imageBatch.visualAssets || []).filter((asset) => ["cloudflare", "gemini", "openai"].includes(asset.source)).length;
        const sceneCount = imageBatch.content?.scenes?.length || production.content?.scenes?.length || 1;
        if (generatedCount >= sceneCount || imageBatch.visualFallback) break;
        button.textContent = `AI görselleri hazırlanıyor · ${Math.min(99, 85 + generatedCount * 2)}%`;
        imageBatch = await api(`/api/productions/${production.id}/images`, { method:"POST" });
      }
    }
    if (selectedFiles.length) {
      setAutomaticProgress("4/4 · Fotoğraflar ekleniyor", "Seçtiğin fotoğraflar sahne sırasına yerleştiriliyor.");
      for (let index = 0; index < selectedFiles.length; index += 1) {
        button.textContent = `Fotoğraflar ekleniyor · ${index + 1}/${selectedFiles.length}`;
        await api(`/api/productions/${production.id}/custom-image`, { method:"POST", body:JSON.stringify({ name:selectedFiles[index].name, dataUrl:await readAsDataUrl(selectedFiles[index]) }) });
      }
    }
    setAutomaticProgress("✓ Taslağın hazır", "Metni ve görselleri kontrol edebilir veya doğrudan videoyu oluşturabilirsin.", "complete");
    await refresh(); openEditor(production.id);
    toast(archiveAssetCount > 1
      ? `Otomatik proje hazır · ${archiveAssetCount} farklı arşiv görseli sahnelere dağıtıldı`
      : archiveAssetCount === 1
        ? "Proje hazır; arşivde yalnız bir uygun görsel bulundu, editörden görsel ekleyebilirsin"
        : "Otomatik proje hazır; son kontrol ve düzenleme sende");
  } catch (error) {
    trackProductEvent("story_failed", { result:"failure" });
    if (production?.id) {
      await refresh().catch(() => {});
      if (state.productions.some((item) => item.id === production.id)) openEditor(production.id);
      toast("Taslak kaydedildi; eksik görselleri bu ekrandan tamamlayabilirsin", "warn");
      return;
    }
    const friendlyMessage = friendlyAutomaticError(error);
    setAutomaticProgress("Taslak hazırlanamadı", friendlyMessage, "error");
    toast(friendlyMessage, "error");
  } finally {
    button.disabled = false;
    button.innerHTML = "Taslağımı hazırla <span>→</span>";
  }
});

async function generateImportedArchiveStory(idea, button) {
  const progress = startStoryProgress(button);
  button.disabled = true;
  button.textContent = "Hikâye hazırlanıyor…";
  try {
    const preparedIdea = idea.angle ? idea : await api(`/api/ideas/${idea.id}/angle`, {
      method:"PUT",
      body:JSON.stringify({ angle:editorialAngles[0] })
    });
    const production = await api(`/api/ideas/${preparedIdea.id}/generate`, { method:"POST" });
    progress.complete();
    await refresh();
    openEditor(production.id);
    const provider = contentModeLabel(production.content);
    toast(`${provider} hikâyesi hazır; metni ve sahneleri düzenleyebilirsin`);
    return production;
  } catch (error) {
    progress.fail();
    await refresh().catch(() => {});
    showStep("story");
    throw new Error(`${error.message || "Hikâye oluşturulamadı."} Kaynak korundu; Hikâye ekranından tekrar deneyebilirsin.`);
  } finally {
    button.disabled = false;
  }
}

$("#nasa-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const container = $("#nasa-results");
  container.className = "media-grid loading";
  const source = $("#media-source").value;
  if (source === "url") {
    try {
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje seç");
      if (!$("#url-image-rights").checked) throw new Error("Görseli kullanma hakkını onaylamalısın");
      container.innerHTML = "<div class='loader'></div><p>URL ve görsel doğrulanıyor…</p>";
      const result = await api("/api/media/url-import", { method:"POST", body:JSON.stringify({
        projectId:productionId, url:$("#url-image-address").value, rightsConfirmed:true
      }) });
      await refresh();
      container.className = "media-grid empty-state";
      container.innerHTML = `<div><p class="safe">✓ ${esc(result.asset.title)} doğrulandı ve projeye eklendi.</p><small>${esc(result.asset.contentType)} · ${formatBytes(result.asset.byteSize)}</small></div>`;
      $("#url-image-address").value = ""; $("#url-image-rights").checked = false;
      toast("URL görseli doğrulandı ve projeye eklendi");
    } catch (error) {
      container.className = "media-grid empty-state"; container.textContent = error.message;
      toast(error.message, "error");
    }
    return;
  }
  if (source === "custom") {
    try {
      const file = $("#custom-image-file").files[0];
      if (!file) throw new Error("Yüklenecek görseli seç");
      if (file.size > 10 * 1024 * 1024) throw new Error("Görsel en fazla 10 MB olabilir");
        const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje seç");
      container.innerHTML = "<div class='loader'></div><p>Görsel projeye yükleniyor…</p>";
      const result = await api(`/api/productions/${productionId}/custom-image`, {
        method: "POST",
        body: JSON.stringify({ name: file.name, dataUrl: await readAsDataUrl(file) })
      });
      await refresh();
      container.className = "media-grid empty-state";
      container.innerHTML = `<div><p class="safe">✓ ${esc(result.asset.title)} projeye eklendi.</p><button class="ghost" data-upload-another>＋ Başka görsel yükle</button></div>`;
      clearCustomImageFile();
      toast("Görsel projeye eklendi");
    } catch (error) {
      container.className = "media-grid empty-state";
      container.textContent = error.message;
    }
    return;
  }
  if (source === "cloudflare") {
    try {
      if (!ensureAiConfigured("image", "prompt-image")) {
        container.className = "media-grid empty-state";
        container.textContent = "";
        return;
      }
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje oluştur");
      container.innerHTML = "<div class='loader'></div><p>AI görseli hazırlanıyor…</p>";
      const result = await api(`/api/productions/${productionId}/cloudflare-image`, {
        method: "POST", body: JSON.stringify({ prompt: $("#nasa-query").value })
      });
      await refresh();
      container.className = "media-grid empty-state";
      container.innerHTML = `<div><p class="safe">✓ ${esc(result.asset.title)} projeye eklendi.</p><button class="ghost" data-generate-another>＋ Bir görsel daha üret</button></div>`;
      $("#result-count").textContent = "1 görsel üretildi";
      toast("AI görseli projeye eklendi");
    } catch (error) {
      container.className = "media-grid empty-state";
      container.textContent = error.message;
    }
    return;
  }
  container.innerHTML = `<div class='loader'></div><p>${source === "wikimedia" ? "Wikimedia Commons" : "NASA"} arşivi taranıyor…</p>`;
  try {
    const result = await api(`/api/media/search?source=${source}&q=${encodeURIComponent($("#nasa-query").value)}`);
    selectedMediaAssets.clear(); $("#media-selection-toolbar").classList.add("hidden");
    const interpretationLabel = result.interpretationMode === "visual-intent" ? "görsel niyetiyle" : "anahtar kelimelerle";
    $("#result-count").textContent = `${result.items.length} sonuç · “${result.interpretedAs || $("#nasa-query").value}” ${interpretationLabel} arandı`;
    container.className = result.items.length ? "media-grid" : "media-grid empty-state";
    if (!result.items.length) {
      container.innerHTML = `<div><p>Bu aramada uygun açık kaynak görsel bulunamadı.</p><small>Daha kısa bir Türkçe anahtar kelime dene veya NASA / Wikimedia kaynağını değiştir.</small><br><button class="ghost" type="button" data-retry-media>Tekrar ara</button></div>`;
      return;
    }
    container.innerHTML = result.items.map((item) => `
      <article class="media-card">
        <div class="media-image"><img src="${item.previewUrl}" alt="${esc(item.title)}" loading="lazy"><span>${esc(item.sourceLabel)}</span></div>
        <div class="media-copy"><label class="media-select"><input type="checkbox" data-media-select="${item.assetId}" data-source="${item.source}" ${item.riskFlags.length ? "disabled" : ""}><span>${item.riskFlags.length ? "Seçilemez" : "Hikâyeye seç"}</span></label><small>${esc(item.license || item.assetId)}</small><h3>${esc(item.title)}</h3>
        ${item.riskFlags.length ? `<p class="risk">⚠ ${esc(item.riskFlags[0])}</p>` : `<p class="safe">✓ Belirgin kullanım riski yok</p>`}
        <div class="media-actions">
          <button data-media-import="${item.assetId}" data-source="${item.source}" ${item.riskFlags.length ? "disabled title='Bu görsel otomatik kullanım kontrolünden geçmedi'" : ""}>${item.riskFlags.length ? "Kullanım kontrolü gerekli" : t("newStory")} <span>→</span></button>
          ${state.productions.some((entry) => entry.status === "approved")
            ? `<button class="secondary-action" data-media-add="${item.assetId}" data-source="${item.source}" ${item.riskFlags.length ? "disabled title='Bu görsel otomatik kullanım kontrolünden geçmedi'" : ""}>${t("addProject")} <span>＋</span></button>`
            : ""}
        </div></div>
      </article>`).join("");
  } catch (error) {
    container.className = "media-grid empty-state";
    container.textContent = error.message;
  }
});
function compactNumber(value) {
  return new Intl.NumberFormat(lang() === "tr" ? "tr-TR" : lang(), {
    notation: "compact", maximumFractionDigits: 1
  }).format(Number(value || 0));
}
function videoDuration(seconds) {
  const total = Number(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,"0")}:${String(remainder).padStart(2,"0")}`
    : `${minutes}:${String(remainder).padStart(2,"0")}`;
}
$("#youtube-trends-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const container = $("#youtube-trend-results");
  container.className = "trend-grid loading";
  container.innerHTML = "<div class='loader'></div><p>YouTube popüler videoları getiriliyor…</p>";
  try {
    const region = $("#youtube-trend-region").value;
    const category = $("#youtube-trend-category").value;
    const result = await api(`/api/youtube/trends?region=${region}&category=${category}`);
    youtubeTrendItems = new Map(result.items.map((item) => [item.id, item]));
    container.className = "trend-grid";
    container.innerHTML = result.items.length ? result.items.map((item) => `
      <article class="trend-card">
        <a class="trend-thumbnail" href="${item.url}" target="_blank" rel="noopener noreferrer"><img src="${item.thumbnailUrl}" alt="${esc(item.title)}" loading="lazy"><b>#${item.rank}</b><span>${videoDuration(item.durationSeconds)}</span></a>
        <div><small>${esc(item.channelTitle)}</small><h3>${esc(item.title)}</h3>
        <p class="trend-metrics"><span>▶ ${compactNumber(item.views)}</span><span>♥ ${compactNumber(item.likes)}</span><span>◉ ${compactNumber(item.comments)}</span></p>
        <button class="primary" data-trend-import="${item.id}">Fikir kuyruğuna ekle →</button></div>
      </article>`).join("") : "Bu filtreler için popüler video bulunamadı.";
  } catch (error) {
    container.className = "trend-grid empty-state";
    container.textContent = error.message;
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button,input,[data-open-project]");
  if (!target) return;
  try {
    if (target.dataset.retryMedia) {
      $("#nasa-form").requestSubmit();
      return;
    }
    if (target.dataset.youtubeUpload) {
      const projectId = target.dataset.youtubeUpload;
      const project = state.productions.find((entry) => entry.id === projectId);
      if (!project) throw new Error("Proje bulunamadı");
      if (state.runtime?.deployment === "cloudflare") throw new Error("YouTube yükleme yalnızca yerel TERZİ sunucusunda kullanılabilir");
      if (!state.runtime?.youtubeUploadConfigured) {
        if (!state.runtime?.youtubeOauthClientConfigured) throw new Error("Önce .env dosyasına YouTube OAuth Client ID ve Client Secret ekleyin");
        const popup = window.open("about:blank", "orbit-youtube-oauth", "width=620,height=760");
        const oauth = await api("/api/youtube/oauth/start");
        if (popup) popup.location = oauth.authUrl;
        else window.open(oauth.authUrl, "_blank", "noopener");
        target.disabled = true; target.textContent = "YouTube bağlantısı bekleniyor…";
        for (let attempt = 0; attempt < 60; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await refresh();
          if (state.runtime?.youtubeUploadConfigured) {
            openEditor(projectId); toast("YouTube kanalı bağlandı; yüklemeyi başlatabilirsiniz"); return;
          }
        }
        throw new Error("YouTube bağlantısı zaman aşımına uğradı");
      }
      if (!window.confirm("Video YouTube kanalına GİZLİ olarak yüklensin mi?")) return;
      target.disabled = true; target.textContent = "YouTube'a yükleniyor…";
      const rawTags = project.content?.hashtags || project.content?.keywords || [];
      const result = await api(`/api/productions/${projectId}/youtube-upload`, {
        method:"POST", body:JSON.stringify({ title:project.content?.title,
          description:[project.content?.hook, project.content?.description].filter(Boolean).join("\n\n"),
          tags:Array.isArray(rawTags) ? rawTags : String(rawTags).split(/[#,]/), categoryId:"22" })
      });
      await refresh(); openEditor(projectId); toast("Video YouTube'a gizli olarak yüklendi");
      window.open(result.url, "_blank", "noopener"); return;
    }
    if (target.dataset.telegramReview) {
      if (!state.runtime?.telegramConfigured) throw new Error("Önce Ayarlar > Entegrasyonlar bölümünden Telegram botunu bağlayın");
      target.disabled = true; target.textContent = "Telegram'a gönderiliyor…";
      const review = await api(`/api/productions/${target.dataset.telegramReview}/telegram-review`, { method:"POST" });
      await refresh(); openEditor(target.dataset.telegramReview);
      toast(review.status === "sending" ? "Bu proje için Telegram gönderimi zaten devam ediyor" : "Proje Telegram editör onayına gönderildi"); return;
    }
    if (target.dataset.telegramSync) {
      target.disabled = true; target.textContent = "Yanıt kontrol ediliyor…";
      const result = await api("/api/telegram/sync", { method:"POST" });
      await refresh(); openEditor(target.dataset.telegramSync);
      toast(result.processed ? "Telegram yanıtı projeye işlendi" : "Henüz yeni bir yanıt yok"); return;
    }
    if (target.dataset.trendImport) {
      const item = youtubeTrendItems.get(target.dataset.trendImport);
      if (!item) throw new Error("Trend verisi yenilenmeli");
      target.disabled = true;
      target.textContent = "Kuyruğa ekleniyor…";
      await api("/api/youtube/trends/import", { method:"POST", body:JSON.stringify({
        videoId:item.id, title:item.title, channelTitle:item.channelTitle, views:item.views,
        contentType:$("#production-format").value
      }) });
      await refresh();
      target.textContent = "✓ Fikir kuyruğuna eklendi";
      toast("YouTube trendi özgün fikir briefi olarak eklendi");
      return;
    }
    if (target.dataset.goStep) {
      if (target.dataset.goStep === "source") {
        sourceStartsNewProject = true;
        resetCreationWizard();
        clearCustomImageFile();
        $("#nasa-results").className = "media-grid empty-state";
        $("#nasa-results").textContent = { tr:"Yeni proje için bir görsel ara veya üret.", en:"Search or generate a visual for the new project.", es:"Busca o genera una imagen para el nuevo proyecto." }[lang()];
        $("#result-count").textContent = "";
        $("#project-image-tray").classList.add("hidden");
      }
      showStep(target.dataset.goStep);
      return;
    }
    if (target.dataset.resumeProject) {
      openEditor(target.dataset.resumeProject);
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
      clearCustomImageFile();
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
      const projectId = target.dataset.editorRender;
      if (activeStep === "editor" && $("#editor-id").value === projectId) {
        target.disabled = true;
        target.textContent = "Değişiklikler kaydediliyor…";
        await saveProjectEditor(projectId);
        await refresh();
      }
      if (state.runtime?.deployment === "cloudflare") {
        await prepareProductionForDeviceRender(projectId);
        toast("Proje cihaz renderına hazır — Videoyu oluştur düğmesine dokun");
        return;
      }
      target.disabled = true;
      target.textContent = { tr:"Ses ve video hazırlanıyor…", en:"Preparing audio and video…", es:"Preparando audio y vídeo…" }[lang()];
      const progress = startServerRenderProgress(target);
      try {
        await api(`/api/productions/${projectId}/render`, { method: "POST" });
        progress.complete();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refresh(); openEditor(projectId);
        toast(t("ready"));
      } catch (error) {
        progress.fail();
        throw error;
      }
      return;
    }
    if (target.dataset.mediaImport) {
      const resumeAction = `archive-story:${target.dataset.source}:${encodeURIComponent(target.dataset.mediaImport)}`;
      if (!ensureAiConfigured("text", resumeAction)) return;
      const originalLabel = target.innerHTML;
      target.disabled = true; target.textContent = "Kaynak hazırlanıyor…";
      try {
        const idea = await api("/api/media/import", { method: "POST", body: JSON.stringify({
          assetId: target.dataset.mediaImport, source: target.dataset.source,
          contentLanguage: selectedContentLanguage(),
          contentType: $("#production-format").value,
          imageFit: $("#image-fit").value
        }) });
        await generateImportedArchiveStory(idea, target);
      } finally {
        target.disabled = false;
        target.innerHTML = originalLabel;
      }
      return;
    }
    if (target.dataset.mediaSelect) {
      const id = target.dataset.mediaSelect;
      if (target.checked) selectedMediaAssets.set(id, { assetId:id, source:target.dataset.source });
      else selectedMediaAssets.delete(id);
      $("#media-selection-count").textContent = selectedMediaAssets.size;
      $("#media-selection-toolbar").classList.toggle("hidden", selectedMediaAssets.size < 2);
      return;
    }
    if (target.dataset.mediaBatch !== undefined) {
      if (selectedMediaAssets.size < 2) throw new Error("En az iki görsel seçmelisin");
      if (!ensureAiConfigured("text", "archive-story-batch")) return;
      const originalLabel = target.innerHTML;
      target.disabled = true; target.textContent = "Kaynaklar hazırlanıyor…";
      const assets = [...selectedMediaAssets.values()];
      try {
        const first = await api("/api/media/import", { method:"POST", body:JSON.stringify({ ...assets[0], contentLanguage:selectedContentLanguage(), contentType:$("#production-format").value, imageFit:$("#image-fit").value }) });
        const idea = await api(`/api/ideas/${first.id}/assets`, { method:"PUT", body:JSON.stringify({ assets:assets.slice(1) }) });
        await generateImportedArchiveStory(idea, target);
        selectedMediaAssets.clear(); $("#media-selection-toolbar").classList.add("hidden");
      } finally {
        target.disabled = false;
        target.innerHTML = originalLabel;
      }
      return;
    }
    if (target.dataset.mediaAdd) {
      const productionId = $("#image-project").value;
      if (!productionId) throw new Error("Önce onaylanmış bir proje seç");
      await api(`/api/productions/${productionId}/images`, {
        method: "PUT", body: JSON.stringify({
          assetId: target.dataset.mediaAdd, source: target.dataset.source
        })
      });
      await refresh();
      target.textContent = { tr:"✓ Projeye eklendi", en:"✓ Added to project", es:"✓ Añadida al proyecto" }[lang()];
      target.disabled = true;
      $("#project-image-tray")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
      toast("Görsel projeye sahne olarak eklendi");
    }
    if (target.dataset.addScene) {
      sourceStartsNewProject = false;
      showStep("source");
      await new Promise((resolve) => setTimeout(resolve, 0));
      $("#image-project").value = target.dataset.addScene;
      $("#nasa-query").focus();
      toast("Görsel ara ve “Projeye ekle” düğmesine bas");
    }
    if (target.dataset.removeImage) {
      const projectId = target.dataset.id;
      await api(`/api/productions/${projectId}/images`, {
        method: "DELETE", body: JSON.stringify({ assetId: target.dataset.removeImage })
      });
      await refresh();
      if (activeStep === "editor") openEditor(projectId);
      toast({ tr:"Görsel projeden kaldırıldı", en:"Image removed from project", es:"Imagen eliminada del proyecto" }[lang()]);
    }
    if (target.dataset.moveImage) {
      const projectId = target.dataset.id;
      const project = state.productions.find((entry) => entry.id === projectId);
      const assets = (project?.visualAssets?.length ? [...project.visualAssets] : [project?.sourceAsset]).filter(Boolean);
      const from = Number(target.dataset.imageIndex);
      const to = target.dataset.moveImage === "left" ? from - 1 : from + 1;
      if (from < 0 || to < 0 || from >= assets.length || to >= assets.length) return;
      [assets[from], assets[to]] = [assets[to], assets[from]];
      await api(`/api/productions/${projectId}/images`, { method: "PATCH", body: JSON.stringify({ order: assets.map((asset) => asset.assetId || asset.nasaId) }) });
      await refresh(); openEditor(projectId);
      toast({ tr:"Görsel sırası güncellendi", en:"Image order updated", es:"Orden de imágenes actualizado" }[lang()]);
      return;
    }
    if (target.dataset.angleLab) {
      openAngleIdeaId = target.dataset.angleLab; await refresh(); return;
    }
    if (target.dataset.angleClose) {
      openAngleIdeaId = null; await refresh(); return;
    }
    if (target.dataset.ideaAngle) {
      const angle = editorialAngles.find((item) => item.id === target.dataset.angleId);
      if (!angle) throw new Error("İçerik açısı bulunamadı");
      await api(`/api/ideas/${target.dataset.ideaAngle}/angle`, { method:"PUT", body:JSON.stringify({ angle }) });
      openAngleIdeaId = null; await refresh();
      toast(`${angle.label} açısı seçildi`); return;
    }    if (target.dataset.generate) {
      if (!ensureAiConfigured("text", `idea:${target.dataset.generate}`)) return;
      target.disabled = true;
      target.textContent = { tr:"AI hikâyeyi yazıyor…", en:"AI is writing the story…", es:"La IA está escribiendo la historia…" }[lang()];
      const progress = startStoryProgress(target);
      try {
        await api(`/api/ideas/${target.dataset.generate}/generate`, { method: "POST" });
        progress.complete();
        await new Promise((resolve) => setTimeout(resolve, 280));
        await refresh(); showStep("review");
        toast({ tr:"Hikâye incelemeye hazır", en:"Story is ready for review", es:"La historia está lista para revisión" }[lang()]);
      } catch (error) {
        progress.fail();
        throw error;
      }
    }
    if (target.dataset.review) {
      await api(`/api/productions/${target.dataset.id}/${target.dataset.review}`, { method: "POST" });
      await refresh();
      if (target.dataset.review === "approve") { showStep("render"); toast("Hikâye onaylandı"); }
      else toast("Hikâye reddedildi", "warn");
    }
    if (target.dataset.render) {
      if (state.runtime?.deployment === "cloudflare") {
        await prepareProductionForDeviceRender(target.dataset.render);
        toast("Proje cihaz renderına hazır — Videoyu oluştur düğmesine dokun");
        return;
      }
      target.disabled = true; target.innerHTML = "Ses ve video hazırlanıyor…";
      const progress = startServerRenderProgress(target);
      toast({ tr:"Seslendirme ve video hazırlanmaya başladı", en:"Narration and video rendering started", es:"Comenzó el renderizado de voz y vídeo" }[lang()]);
      try {
        await api(`/api/productions/${target.dataset.render}/render`, { method: "POST" });
        progress.complete();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await refresh();
        toast({ tr:"Video hazır — oynatabilir veya indirebilirsin", en:"Video ready — preview or download it", es:"Vídeo listo: puedes verlo o descargarlo" }[lang()]);
      } catch (error) {
        progress.fail();
        throw error;
      }
    }
  } catch (error) {
    target.disabled = false;
    if (target.dataset.generate) target.textContent = t("generate");
    if (target.dataset.editorRender) target.textContent = t("renderVideo");
    if (target.dataset.render) target.innerHTML = `${t("renderVideo")} <span>▶</span>`;
    toast(error.message, "error");
  }
});
let deferredInstallPrompt = null;
const installButton = $("#pwa-install");
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIosSafari = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;

function updateConnectionStatus() {
  const online = navigator.onLine;
  if (!online) setServerConnection(false);
}

$("#connection-retry").addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  event.currentTarget.textContent = "Bağlanıyor…";
  try {
    await refresh();
    toast("TERZİ sunucusuna yeniden bağlandı");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    event.currentTarget.disabled = false;
    event.currentTarget.textContent = "Tekrar dene";
  }
});
$("#conflict-dismiss").addEventListener("click", () => $("#conflict-banner").classList.add("hidden"));
$("#conflict-reload").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await refresh();
    $("#conflict-banner").classList.add("hidden");
    toast("Sunucudaki son sürüm açıldı", "ok");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isStandalone()) installButton.classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.classList.add("hidden");
  toast("TERZİ cihazına yüklendi");
});
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add("hidden");
  } else if (isIosSafari) {
    $("#ios-install-guide").classList.remove("hidden");
  }
});
function closeIosInstallGuide() { $("#ios-install-guide").classList.add("hidden"); }
$("#ios-install-close").addEventListener("click", closeIosInstallGuide);
$("#ios-install-ok").addEventListener("click", closeIosInstallGuide);
$("#ios-install-guide").addEventListener("click", (event) => {
  if (event.target.id === "ios-install-guide") closeIosInstallGuide();
});

const legalDocuments = {
  privacy: {
    title:"KVKK Aydınlatma Metni",
    html:`<div class="legal-copy"><p><b>Sürüm:</b> 9 Eylül 2026</p><p>TERZİ; proje oluşturma, dosya saklama, AI entegrasyonu ve video üretimi hizmetlerini sunarken aşağıdaki verileri işler.</p><h3>Veri sorumlusu</h3><p>TERZİ işletmecisi veri sorumlusudur. Ticari unvan, tebligat adresi ve KVKK başvuru e-postası ücretli hizmet yayına alınmadan önce burada tamamlanacaktır.</p><h3>İşlenen veriler ve amaçlar</h3><ul><li>Çalışma alanı kimliği ve zorunlu oturum çerezi: oturumu güvenli şekilde sürdürmek.</li><li>Proje metinleri, görseller ve çıktılar: talep edilen üretim ve saklama hizmetini sağlamak.</li><li>Entegrasyon tercihi ve API kimlik bilgileri: seçilen sağlayıcıya istek göndermek.</li><li>Güvenlik ve kota kayıtları: kötüye kullanımı önlemek ve hizmet güvenliğini sağlamak.</li></ul><h3>Hukuki sebepler</h3><p>Hizmetin kurulması ve ifası, veri sorumlusunun hukuki yükümlülükleri ve temel haklarına zarar vermemek kaydıyla meşru menfaati. Yurt dışındaki AI sağlayıcısına aktarımın açık rızaya dayandığı durumda bu rıza ayrıca alınır.</p><h3>Aktarım</h3><p>AI özelliğini açarsan promptların, hikâyelerin ve seçtiğin dosyalar Google, OpenAI, Anthropic veya Cloudflare altyapısında yurt dışında işlenebilir. Sağlayıcı seçimi ve açık rıza ayrı olarak alınır. AI kullanmadan çalışan cihaz içi özelliklerde bu aktarım yapılmaz.</p><h3>Saklama</h3><p>Proje verileri sen silene veya çalışma alanı kapatılana kadar; güvenlik ve işlem kayıtları amaç için gerekli sınırlı süre boyunca tutulur. Yasal zorunluluk doğarsa ilgili süre uygulanır.</p></div>`
  },
  terms: {
    title:"Kullanım Koşulları",
    html:`<div class="legal-copy"><p><b>Sürüm:</b> 25 Eylül 2026</p><ul><li>TERZİ yalnızca 18 yaş ve üzerindeki içerik üreticileri içindir; çocukların doğrudan kullanımına yönelik değildir.</li><li>Yüklediğin metin, görsel, müzik ve diğer materyalleri kullanma hakkına sahip olduğunu beyan edersin.</li><li>AI çıktıları hatalı, benzer veya üçüncü kişi haklarıyla çelişen içerik barındırabilir. Yayın öncesi kontrol kullanıcıya aittir.</li><li>TERZİ; Google, OpenAI, Anthropic veya Cloudflare tarafından desteklenen, onaylanan ya da ortak işletilen bir ürün değildir. İsimler yalnız entegrasyonları tanımlar.</li><li>Yasa dışı, yanıltıcı, taciz edici, hak ihlal eden veya sağlayıcı güvenlik önlemlerini aşan kullanım yasaktır.</li><li>API kullanım bedelleri, seçilen plana göre kullanıcıya veya Atölye Pro kotasına aittir.</li><li>Pro üyeliği hesap ekranındaki müşteri portalından iptal edilebilir. İptal mevcut fatura döneminin sonunda yürürlüğe girer; tüketicinin emredici mevzuattan doğan cayma ve iade hakları saklıdır.</li></ul></div>`
  },
  rights: {
    title:"Veri Hakların",
    html:`<div class="legal-copy"><p>KVKK’nın 11. maddesi kapsamında verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltme, silme veya yok etme talep etme, aktarılan üçüncü kişileri öğrenme ve kanuni şartlarda itiraz etme hakların bulunur.</p><h3>AI aktarım rızası</h3><p>Rızanı geri çektiğinde ilgili sağlayıcıyla yeni AI isteği gönderilmez. Daha önce hukuka uygun yapılan işlemler geriye dönük olarak etkilenmez.</p><button id="revoke-ai-consents" class="ghost" type="button">Tüm AI aktarım rızalarını geri çek</button><h3>Başvuru kanalı</h3><p>Veri sorumlusu ticari kimliği ve doğrulanmış başvuru adresi lansmandan önce eklenecektir. Bu bilgiler tamamlanmadan ücretli üyelik açılmamalıdır.</p></div>`
  }
};
function openLegalDocument(name) {
  const document = legalDocuments[name] || legalDocuments.privacy;
  $("#legal-modal-title").textContent = document.title;
  const legal = state.runtime?.legal || {};
  let html = document.html;
  if (legal.businessName && legal.supportEmail) {
    const identity = `${esc(legal.businessName)}${legal.businessAddress ? ` · ${esc(legal.businessAddress)}` : ""} · ${esc(legal.supportEmail)}`;
    html = html
      .replace("TERZİ işletmecisi veri sorumlusudur. Ticari unvan, tebligat adresi ve KVKK başvuru e-postası ücretli hizmet yayına alınmadan önce burada tamamlanacaktır.", identity)
      .replace("Veri sorumlusu ticari kimliği ve doğrulanmış başvuru adresi lansmandan önce eklenecektir. Bu bilgiler tamamlanmadan ücretli üyelik açılmamalıdır.", `Başvurularını ${esc(legal.supportEmail)} adresine iletebilirsin. Veri sorumlusu: ${identity}.`);
  }
  $("#legal-modal-content").innerHTML = html;
  $("#legal-modal").classList.remove("hidden");
}
function closeLegalDocument() { $("#legal-modal").classList.add("hidden"); }
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-legal-doc]");
  if (trigger) openLegalDocument(trigger.dataset.legalDoc);
  if (event.target.id === "revoke-ai-consents") {
    Object.keys(providerKeyUrls).forEach((provider) => localStorage.removeItem(`orbit-ai-consent-${provider}`));
    toast("AI veri aktarım rızaların geri çekildi");
    closeLegalDocument();
  }
});
$("#legal-modal-close").addEventListener("click", closeLegalDocument);
$("#legal-modal").addEventListener("click", (event) => { if (event.target.id === "legal-modal") closeLegalDocument(); });
$("#legal-age").addEventListener("change", (event) => { $("#legal-enter").disabled = !event.target.checked; });
$("#legal-enter").addEventListener("click", () => {
  localStorage.setItem("orbit-legal-acceptance-v1", new Date().toISOString());
  $("#legal-gate").classList.add("hidden");
  showWelcomeWhenReady();
});
document.querySelectorAll("[data-language-choice]").forEach((button) => button.addEventListener("click", () => {
  preferredUiLanguage = button.dataset.languageChoice;
  state.settings.uiLanguage = preferredUiLanguage;
  try { localStorage.setItem(UI_LANGUAGE_KEY, preferredUiLanguage); } catch {}
  $("#ui-language").value = preferredUiLanguage;
  localizeStatic();
  showStep(activeStep);
  $("#language-gate").classList.add("hidden");
  try {
    if (!localStorage.getItem("orbit-legal-acceptance-v1")) $("#legal-gate").classList.remove("hidden");
    else showWelcomeWhenReady();
  } catch {}
}));
try {
  if (!preferredUiLanguage) $("#language-gate").classList.remove("hidden");
  else if (!localStorage.getItem("orbit-legal-acceptance-v1")) $("#legal-gate").classList.remove("hidden");
} catch {}
updateConnectionStatus();
if (isIosSafari && !isStandalone()) installButton.classList.remove("hidden");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js")
    .catch(() => {}));
}
renderFlowCopyPresets();
configureMobileFlowPanels(); showMobileFlowPanel("setup");
captureFlowHistory();
// Device-only drafts and output must not wait for the server, even when offline.
function initializeLocalFlow() {
  updateFlowPreview();
  refreshFlowDrafts().catch(() => toast("Yerel taslaklar okunamadı", "error"));
  checkFlowRecovery().catch(() => {});
  restoreLocalFlowOutput().catch(() => toast("Son yerel video geri yüklenemedi", "error"));
}
initializeLocalFlow();
refresh().then(() => {
  updateSourceMode(); updateFormatNote(); updateFlowCompatibility();
  showWelcomeWhenReady();
  const actionParams = new URLSearchParams(window.location.search);
  const verificationToken = actionParams.get("verify");
  const resetToken = actionParams.get("reset");
  const billingResult = actionParams.get("billing");
  if (verificationToken) {
    api("/api/auth/verify/confirm", { method:"POST", body:JSON.stringify({ token:verificationToken }) })
      .then(async () => {
        history.replaceState({}, "", window.location.pathname + window.location.hash);
        await refresh(); toast("E-posta adresin doğrulandı. Otomatik deneme kullanıma hazır.");
      })
      .catch((error) => toast(error.message, "error"));
  } else if (resetToken) {
    $("#auth-action-modal").classList.remove("hidden");
    ensureTurnstile("reset-turnstile").catch((error) => toast(error.message, "error"));
    setTimeout(() => $("#password-reset-value").focus(), 0);
  }
  if (billingResult) {
    history.replaceState({}, "", window.location.pathname + window.location.hash);
    trackProductEvent("checkout_returned", { result:billingResult });
    toast(billingResult === "success"
      ? "Ödeme tamamlandı; üyelik webhook doğrulamasından sonra etkinleşir"
      : billingResult === "cancelled" ? "Ödeme yapılmadı; ücretsiz planın devam ediyor" : "Üyelik ekranından dönüldü",
    billingResult === "success" ? "success" : "warn");
    if (billingResult === "success") setTimeout(() => refresh().catch(() => {}), 1800);
  }
}).catch((error) => toast(error.message, "error"));
