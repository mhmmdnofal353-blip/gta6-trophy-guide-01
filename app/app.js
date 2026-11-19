// Leonida Legend — an offline GTA VI trophy guide and platinum tracker.
// State lives in localStorage: the earned set, the spoiler toggle and the
// individually revealed hidden trophies. Hash routes: "#/" is the tracker,
// "#/roadmap" is the roadmap; the tracker also accepts an initial filter
// state in the hash, e.g. "#/?grade=silver&kind=story&open=28&spoiler=off".

const LS_EARNED = 'leonida-legend.earned.v1';
const LS_SPOILER = 'leonida-legend.spoiler.v1';
const LS_REVEALED = 'leonida-legend.revealed.v1';

const SOURCE_LABELS = new Map([
  ['powerpyx.com', 'PowerPyx — Trophy Guide & Roadmap'],
  ['outputlag.com', 'OutputLag — GTA 6 Trophy List'],
  ['gta-zone.com', 'GTA Zone — GTA 6 Trophies & Achievements'],
]);

const els = {
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  resultCount: document.getElementById('result-count'),
  search: document.getElementById('search'),
  grade: document.getElementById('f-grade'),
  kind: document.getElementById('f-kind'),
  status: document.getElementById('f-status'),
  missable: document.getElementById('f-missable'),
  spoiler: document.getElementById('spoiler'),
  ioMsg: document.getElementById('io-msg'),
  viewTracker: document.getElementById('view-tracker'),
  viewRoadmap: document.getElementById('view-roadmap'),
  tabTracker: document.getElementById('tab-tracker'),
  tabRoadmap: document.getElementById('tab-roadmap'),
};

function loadSet(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

let earned = loadSet(LS_EARNED);
let revealed = loadSet(LS_REVEALED);
let spoilerOn = localStorage.getItem(LS_SPOILER) !== 'off';
const openGuides = new Set();

function persist() {
  localStorage.setItem(LS_EARNED, JSON.stringify([...earned]));
  localStorage.setItem(LS_REVEALED, JSON.stringify([...revealed]));
  localStorage.setItem(LS_SPOILER, spoilerOn ? 'on' : 'off');
}

function parseHash() {
  const hash = location.hash || '#/';
  const qIndex = hash.indexOf('?');
  const route = qIndex === -1 ? hash : hash.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? '' : hash.slice(qIndex + 1));
  return { route, params };
}

function applyHashParams(params) {
  const grade = params.get('grade');
  const kind = params.get('kind');
  const status = params.get('status');
  if (grade && [...els.grade.options].some((o) => o.value === grade)) els.grade.value = grade;
  if (kind && [...els.kind.options].some((o) => o.value === kind)) els.kind.value = kind;
  if (status && [...els.status.options].some((o) => o.value === status)) els.status.value = status;
  if (params.get('missable') === '1') els.missable.checked = true;
  if (params.get('q')) els.search.value = params.get('q');
  if (params.get('spoiler') === 'off') { spoilerOn = false; els.spoiler.checked = false; }
  if (params.get('spoiler') === 'on') { spoilerOn = true; els.spoiler.checked = true; }
  const open = Number(params.get('open'));
  if (Number.isInteger(open) && open >= 1) openGuides.add(open);
}

function sourceLabel(url) {
  for (const [host, label] of SOURCE_LABELS) {
    if (url.includes(host)) return label;
  }
  return url;
}

function isStoryMasked(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.id);
}

function isBlurred(t) {
  return spoilerOn && t.hidden && t.kind !== 'story' && !earned.has(t.id) && !revealed.has(t.id);
}

function buildCard(doc, t) {
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.id) ? ' is-earned' : '');
  card.dataset.id = String(t.id);

  const top = document.createElement('div');
  top.className = 'card-top';

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + t.grade;
  badge.textContent = t.grade;

  const kind = document.createElement('span');
  kind.className = 'tag tag-kind';
  kind.textContent = t.kind;

  top.append(badge, kind);
  if (t.hidden) {
    const h = document.createElement('span');
    h.className = 'tag tag-hidden';
    h.textContent = 'Hidden';
    top.append(h);
  }
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag tag-missable';
    m.textContent = '⚠ Potentially missable';
    top.append(m);
  }
  if (!t.methodConfirmed) {
    const u = document.createElement('span');
    u.className = 'tag tag-unconfirmed';
    u.textContent = 'Method unconfirmed';
    top.append(u);
  }
  card.append(top);

  const title = document.createElement('h3');
  const desc = document.createElement('p');
  desc.className = 'desc';

  if (isStoryMasked(t)) {
    title.textContent = 'Story trophy — spoiler protected';
    desc.textContent = 'Its name and description stay hidden until you mark it earned. Turn spoiler protection off above if you would rather see everything.';
  } else if (isBlurred(t)) {
    title.textContent = t.name;
    desc.textContent = t.description;
    title.classList.add('blurred');
    desc.classList.add('blurred');
    const revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'reveal-btn';
    revealBtn.textContent = 'Reveal hidden trophy';
    revealBtn.addEventListener('click', () => {
      revealed.add(t.id);
      persist();
      render(doc);
    });
    card.append(title, desc, revealBtn);
  } else {
    title.textContent = t.name;
    desc.textContent = t.description;
    card.append(title, desc);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const earnLabel = document.createElement('label');
  earnLabel.className = 'earn';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    persist();
    render(doc);
  });
  earnLabel.append(box, document.createTextNode(' Earned'));
  actions.append(earnLabel);

  const guideBtn = document.createElement('button');
  guideBtn.type = 'button';
  guideBtn.className = 'guide-btn';
  const isOpen = openGuides.has(t.id);
  guideBtn.textContent = isOpen ? 'Hide guide' : 'Guide & sources';
  guideBtn.setAttribute('aria-expanded', String(isOpen));
  guideBtn.addEventListener('click', () => {
    if (openGuides.has(t.id)) openGuides.delete(t.id);
    else openGuides.add(t.id);
    render(doc);
  });
  actions.append(guideBtn);
  card.append(actions);

  if (isOpen) {
    const guideBox = document.createElement('div');
    guideBox.className = 'guide';
    const g = document.createElement('p');
    g.textContent = t.guide;
    guideBox.append(g);
    if (t.missable) {
      const warn = document.createElement('p');
      warn.className = 'guide-warn';
      warn.textContent = 'Missable window: Chapter 1 only — see the Roadmap tab for the full warning and the chapter-save habit that protects you.';
      guideBox.append(warn);
    }
    const srcTitle = document.createElement('p');
    srcTitle.className = 'src-title';
    srcTitle.textContent = 'Sources';
    guideBox.append(srcTitle);
    const list = document.createElement('ul');
    list.className = 'sources';
    for (const url of t.sources ?? []) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.textContent = sourceLabel(url);
      li.append(a);
      list.append(li);
    }
    guideBox.append(list);
    card.append(guideBox);
  }
  return card;
}

function matchesFilters(t) {
  if (els.grade.value !== 'all' && t.grade !== els.grade.value) return false;
  if (els.kind.value !== 'all' && t.kind !== els.kind.value) return false;
  if (els.status.value === 'earned' && !earned.has(t.id)) return false;
  if (els.status.value === 'unearned' && earned.has(t.id)) return false;
  if (els.missable.checked && !t.missable) return false;
  const q = els.search.value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderStats(doc) {
  const total = doc.trophies.length;
  const byGrade = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of doc.trophies) {
    byGrade[t.grade][1] += 1;
    if (earned.has(t.id)) byGrade[t.grade][0] += 1;
  }
  for (const g of Object.keys(byGrade)) {
    document.getElementById('gs-' + g).textContent = byGrade[g][0] + '/' + byGrade[g][1];
  }
  const nonPlat = doc.trophies.filter((t) => t.grade !== 'platinum');
  const platEarned = nonPlat.filter((t) => earned.has(t.id)).length;
  const pct = Math.round((earned.size / total) * 100);
  document.getElementById('stat-earned').textContent = String(earned.size);
  document.getElementById('ring-pct').textContent = pct + '%';
  document.getElementById('ring').style.setProperty('--pct', String(pct));
  const platEl = document.getElementById('stat-platinum');
  if (platEarned >= nonPlat.length) {
    platEl.textContent = 'Platinum unlocked — Vice Got a Price! is yours. Leonida Legend status achieved.';
    platEl.classList.add('plat-done');
  } else {
    platEl.textContent = 'Platinum progress: ' + platEarned + ' of ' + nonPlat.length + ' — earn every other trophy to unlock Vice Got a Price!';
    platEl.classList.remove('plat-done');
  }
}

function render(doc) {
  renderStats(doc);
  const shown = doc.trophies.filter(matchesFilters);
  els.cards.replaceChildren(...shown.map((t) => buildCard(doc, t)));
  els.empty.hidden = shown.length > 0;
  els.resultCount.textContent = 'Showing ' + shown.length + ' of ' + doc.trophies.length + ' trophies';
}

function applyRoute(doc) {
  const { route, params } = parseHash();
  const onRoadmap = route === '#/roadmap';
  els.viewTracker.hidden = onRoadmap;
  els.viewRoadmap.hidden = !onRoadmap;
  els.tabTracker.classList.toggle('active', !onRoadmap);
  els.tabRoadmap.classList.toggle('active', onRoadmap);
  if (!onRoadmap) {
    applyHashParams(params);
    els.spoiler.checked = spoilerOn;
    render(doc);
  }
}

function exportChecklist() {
  const payload = {
    app: 'leonida-legend',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-checklist.json';
  a.click();
  URL.revokeObjectURL(a.href);
  els.ioMsg.textContent = 'Checklist exported (' + earned.size + ' earned).';
}

async function importChecklist(doc, file) {
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(list)) throw new Error('no earned list');
    const validIds = new Set(doc.trophies.map((t) => t.id));
    const clean = list.filter((v) => Number.isInteger(v) && validIds.has(v));
    if (clean.length !== list.length) throw new Error('unknown trophy ids');
    earned = new Set(clean);
    persist();
    render(doc);
    els.ioMsg.textContent = 'Checklist imported: ' + earned.size + ' trophies marked earned.';
  } catch {
    els.ioMsg.textContent = 'Import failed: that file is not a valid checklist from this tracker. Nothing was changed.';
  }
}

async function main() {
  const res = await fetch('data/trophies.json');
  const doc = await res.json();
  els.spoiler.checked = spoilerOn;

  for (const input of [els.search, els.grade, els.kind, els.status, els.missable]) {
    input.addEventListener('input', () => render(doc));
    input.addEventListener('change', () => render(doc));
  }
  els.spoiler.addEventListener('change', () => {
    spoilerOn = els.spoiler.checked;
    persist();
    render(doc);
  });
  document.getElementById('export').addEventListener('click', exportChecklist);
  document.getElementById('import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importChecklist(doc, file);
    e.target.value = '';
  });
  window.addEventListener('hashchange', () => applyRoute(doc));
  applyRoute(doc);
}

main();
