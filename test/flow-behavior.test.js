import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
function functionSource(name, nextMarker) {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start, 'Production function must be available');
  return source.slice(start, end);
}
function harness() {
  const elements = new Map();
  const context = vm.createContext({
    $: (selector) => {
      if (!elements.has(selector)) elements.set(selector, {
        disabled: false, textContent: '', attrs: {},
        setAttribute(name, value) { this.attrs[name] = value; },
        removeAttribute(name) { delete this.attrs[name]; }
      });
      return elements.get(selector);
    },
    mobileFlowOrder: ['setup', 'scenes', 'style', 'export'],
    mobileFlowPanel: 'export', flowRendering: false, flowScenes: [],
    language: 'tr', navigator: {}, window: {},
    profile: { supported: true, extension: 'webm', format: 'WebM' },
    lang() { return context.language; },
    getFlowRecordingProfile() { return context.profile; },
    flowRuntime(key) { return { renderAs: 'Create {format}', noRender: 'Unsupported' }[key] || key; }
  });
  vm.runInContext(functionSource('syncMobileFlowAction', 'function configureMobileFlowPanels'), context);
  vm.runInContext(functionSource('updateFlowCompatibility', 'async function renderFlowVideo'), context);
  return { context, elements, update: () => vm.runInContext('updateFlowCompatibility()', context) };
}

test('mobile export tracks empty, ready, unsupported and busy states', () => {
  const { context, elements, update } = harness();
  update();
  const mobile = elements.get('#mobile-flow-next');
  const primary = elements.get('#flow-render');
  assert.equal(mobile.disabled, true);
  context.flowScenes.push({});
  update();
  assert.equal(mobile.disabled, false);
  assert.equal(mobile.textContent, primary.textContent);
  context.profile.supported = false;
  update();
  assert.equal(mobile.disabled, true);
  assert.equal(mobile.textContent, 'Unsupported');
  context.profile.supported = true;
  context.flowRendering = true;
  for (const language of ['tr', 'en', 'es']) {
    context.language = language;
    update();
    assert.equal(primary.disabled, true);
    assert.equal(mobile.disabled, true);
    assert.equal(mobile.attrs['aria-busy'], 'true');
    assert.equal(mobile.textContent, primary.textContent);
  }
  context.flowRendering = false;
  update();
  assert.equal(mobile.disabled, false);
  assert.equal(mobile.attrs['aria-busy'], 'false');
  context.flowScenes = [];
  update();
  assert.equal(mobile.disabled, true);
});

test('leaving export restores localized navigation after unavailable render', () => {
  const { context, elements, update } = harness();
  update();
  context.mobileFlowPanel = 'scenes';
  context.language = 'en';
  update();
  const mobile = elements.get('#mobile-flow-next');
  assert.equal(mobile.disabled, false);
  assert.equal(mobile.textContent, 'Go to design →');
  assert.equal(mobile.attrs['aria-describedby'], undefined);
});

test('archive diversity keeps unique safe assets in source order and respects the limit', () => {
  const context = vm.createContext({});
  vm.runInContext(functionSource('selectDiverseArchiveAssets', 'function updateAutomaticPhotoMode'), context);
  const items = [
    { source:'wikimedia', assetId:'a', previewUrl:'https://img/a.jpg', riskFlags:[] },
    { source:'wikimedia', assetId:'a', previewUrl:'https://img/a-duplicate.jpg', riskFlags:[] },
    { source:'wikimedia', assetId:'b', previewUrl:'https://img/shared.jpg', riskFlags:[] },
    { source:'nasa', assetId:'c', previewUrl:'https://img/shared.jpg', riskFlags:[] },
    { source:'nasa', assetId:'blocked', previewUrl:'https://img/blocked.jpg', riskFlags:['copyright'] },
    { source:'nasa', assetId:'d', previewUrl:'https://img/d.jpg', riskFlags:[] }
  ];
  context.items = items;
  const selected = vm.runInContext('selectDiverseArchiveAssets(items, 3)', context);
  assert.deepEqual(Array.from(selected, (item) => item.assetId), ['a', 'b', 'd']);
  context.items = Array.from({ length:12 }, (_, index) => ({ source:'nasa', assetId:String(index), previewUrl:`https://img/${index}.jpg`, riskFlags:[] }));
  const spread = vm.runInContext('selectDiverseArchiveAssets(items, 4)', context);
  assert.deepEqual(Array.from(spread, (item) => item.assetId), ['0', '3', '6', '9']);
});

test('narration captions preserve every spoken word and normalize ranged scene timing', () => {
  const context = vm.createContext({});
  vm.runInContext(functionSource('splitNarrationAcrossScenes', 'function sceneSecondsValue'), context);
  vm.runInContext(functionSource('sceneSecondsValue', 'function speechWeight'), context);
  vm.runInContext(functionSource('speechWeight', 'function redistributeFlowNarration'), context);
  context.text = 'Birinci cümle burada. İkinci cümle biraz daha uzun. Son söz de burada.';
  const segments = vm.runInContext('splitNarrationAcrossScenes(text, 4)', context);
  assert.equal(Array.from(segments).join(' '), context.text);
  assert.equal(segments.length, 4);
  assert.equal(vm.runInContext('sceneSecondsValue("6-12", 3)', context), 6);
  assert.equal(vm.runInContext('sceneSecondsValue("invalid", 4)', context), 4);
  assert.equal(vm.runInContext('speechWeight("")', context), 0);
  assert.ok(vm.runInContext('speechWeight("Konuşulan bir cümle.")', context) > 0);
});

test('local startup runs all restoration tasks without any server access', async () => {
  const calls = [];
  const context = vm.createContext({
    updateFlowPreview: () => calls.push('preview'),
    refreshFlowDrafts: async () => { calls.push('drafts'); throw new Error('storage unavailable'); },
    checkFlowRecovery: async () => calls.push('recovery'),
    restoreLocalFlowOutput: async () => calls.push('video'),
    toast: () => calls.push('error')
  });
  vm.runInContext(functionSource('initializeLocalFlow', '\ninitializeLocalFlow();'), context);
  vm.runInContext('initializeLocalFlow()', context);
  await Promise.resolve();
  assert.deepEqual(calls, ['preview', 'drafts', 'recovery', 'video', 'error']);
});

test('welcome stays hidden until language and legal gates are complete', () => {
  const stored = new Map();
  const nodes = new Map();
  const node = (hidden = true) => ({
    hidden,
    classList: {
      contains(name) { return name === 'hidden' && this.owner.hidden; },
      toggle(name, force) { if (name === 'hidden') this.owner.hidden = force; },
      owner: null
    }
  });
  for (const id of ['#language-gate', '#legal-gate', '#welcome-guide']) {
    const element = node(true); element.classList.owner = element; nodes.set(id, element);
  }
  const context = vm.createContext({
    preferredUiLanguage: '',
    WELCOME_SEEN_KEY: 'welcome',
    localStorage: { getItem: (key) => stored.get(key) || null },
    $: (selector) => nodes.get(selector)
  });
  vm.runInContext(functionSource('showWelcomeWhenReady', '$("#welcome-guide-close")'), context);
  vm.runInContext('showWelcomeWhenReady()', context);
  assert.equal(nodes.get('#welcome-guide').hidden, true);
  context.preferredUiLanguage = 'tr';
  vm.runInContext('showWelcomeWhenReady()', context);
  assert.equal(nodes.get('#welcome-guide').hidden, true);
  stored.set('orbit-legal-acceptance-v1', 'accepted');
  vm.runInContext('showWelcomeWhenReady()', context);
  assert.equal(nodes.get('#welcome-guide').hidden, false);
  stored.set('welcome', '1');
  vm.runInContext('showWelcomeWhenReady()', context);
  assert.equal(nodes.get('#welcome-guide').hidden, true);
});

test('long narration is split without dropping any text', () => {
  const context = vm.createContext({});
  vm.runInContext(functionSource('splitNarrationForSpeech', 'function joinAudioBuffers'), context);
  const original = `${'İlk bölüm uzundur. '.repeat(260)}Son bölüm korunur.`.trim();
  const chunks = vm.runInContext(`splitNarrationForSpeech(${JSON.stringify(original)})`, context);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 4000));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), original.replace(/\s+/g, ' '));
});

test('joined narration adds a short pause between long speech chunks', () => {
  const copied = [];
  const context = vm.createContext({});
  vm.runInContext(functionSource('joinAudioBuffers', 'function getFlowRecordingProfile'), context);
  const audioContext = {
    sampleRate: 1000,
    createBuffer(channels, length, rate) {
      return {
        numberOfChannels: channels, length, sampleRate: rate,
        copyToChannel(sourceData, channel, offset) { copied.push({ sourceData, channel, offset }); }
      };
    }
  };
  const buffer = (length) => ({
    numberOfChannels: 1, length,
    getChannelData() { return new Float32Array(length); }
  });
  context.audioContext = audioContext;
  context.buffers = [buffer(200), buffer(300)];
  const result = vm.runInContext('joinAudioBuffers(audioContext, buffers)', context);
  assert.equal(result.length, 600);
  assert.deepEqual(copied.map((entry) => entry.offset), [0, 300]);
});

test('text-only motivation post creates one designed local scene per sentence', async () => {
  const values = new Map([
    ['#text-post-lines', { value: 'Bir adım at.\nDevam et.' }],
    ['#text-post-title', { value: 'Kendine not' }],
    ['#flow-title', { value: '' }],
    ['#flow-narration-enabled', { checked: true }],
    ['#flow-duration', { value: '2' }],
    ['#text-post-create', { disabled: false, setAttribute() {} }]
  ]);
  const calls = [];
  const context = vm.createContext({
    DEFAULT_MOTIVATION_LINES: { tr: ['Fallback sentence.'], en: ['Fallback sentence.'] }, textPostCreating: false,
    lang: () => 'tr',
    $: (selector) => values.get(selector),
    clearFlowMedia() { context.flowScenes = []; calls.push('clear'); },
    currentFlowDraftId: 'saved-draft',
    selectFlowTemplate(value) { context.flowTemplate = value; },
    flowNarrationContext: {}, flowScenes: [], crypto: { randomUUID: () => `scene-${context.flowScenes.length + 1}` },
    File: class { constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; } },
    URL: { createObjectURL: (file) => `local:${file.name}` },
    decodeFlowImage: async (file) => ({ name: file.name }),
    renderFlowScenes() { calls.push('render'); }, beginFlowAnalytics(value) { calls.push(`analytics:${value}`); },
    trackFlowStage(value) { calls.push(`stage:${value}`); }, showMobileFlowPanel(value) { calls.push(`panel:${value}`); }, toast(value) { calls.push(value); }
  });
  vm.runInContext(functionSource('textPostBackgroundSvg', 'async function createTextOnlyMotivationPost'), context);
  vm.runInContext(`async ${functionSource('createTextOnlyMotivationPost', 'async function loadFlowDemo')}`, context);
  await vm.runInContext('createTextOnlyMotivationPost()', context);
  assert.equal(context.flowTemplate, 'motivation');
  assert.equal(context.flowScenes.length, 2);
  assert.ok(context.flowScenes.every((scene) => scene.isTextOnly && scene.file.type === 'image/svg+xml'));
  assert.deepEqual(context.flowScenes.map((scene) => scene.text), ['Bir adım at.', 'Devam et.']);
  assert.equal(values.get('#flow-title').value, 'Kendine not');
  assert.equal(values.get('#flow-narration-enabled').checked, false);
  assert.ok(calls.includes('render'));
  assert.ok(calls.includes('analytics:motivation'));
  assert.ok(calls.includes('stage:media'));
  assert.ok(calls.includes('panel:scenes'));
  values.get('#text-post-lines').value = '';
  values.get('#text-post-title').value = '';
  await vm.runInContext('createTextOnlyMotivationPost()', context);
  assert.deepEqual(context.flowScenes.map((scene) => scene.text), ['Fallback sentence.']);
  assert.equal(values.get('#flow-title').value, 'Bugün kendine hatırlat');
});
