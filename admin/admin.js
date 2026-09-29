/* =====================================================================
   Administrace A-Studia
   Data jsou v repozitáři webu (_data/*.json). Uložení = jeden commit přes
   backend webhunter-admin (Cloudflare Worker, přihlášení heslem).
   GitHub Action pak web přegeneruje (~1 min).
   ===================================================================== */
'use strict';
(() => {
const CFG = {
  id: 'astudio', site: '../',
  api: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.search.includes('local') ? 'http://localhost:8787' : 'https://webhunter-admin.webhunter.workers.dev',
};
const FILES = {
  site: '_data/site.json', lessons: '_data/lessons.json', schedule: '_data/schedule.json',
  pricing: '_data/pricing.json', team: '_data/team.json', faq: '_data/faq.json',
};
const LABEL = { site: 'Kontakty a rezervace', lessons: 'Lekce', schedule: 'Rozvrh', pricing: 'Ceník', team: 'O mně a lektorky', faq: 'Časté dotazy' };
const SK = 'astudio_admin';

const S = { sess: null, def: false, D: {}, snap: {}, pending: {}, preview: {}, saving: false, lib: null, day: (new Date().getDay() + 6) % 7 };

/* ---------------------------------------------------------------- ikony */
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  phone: I('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  lesson: I('<circle cx="12" cy="5" r="2"/><path d="M12 7v6l-4 7M12 13l4 7M6 10h12"/>'),
  cal: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  tag: I('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  q: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h0"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.8 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.8-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3.3 14a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.8 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 10 3.3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.8 1.2 2 2 0 1 1 2.8 2.8A1.7 1.7 0 0 0 20.7 10a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.3 1z"/>'),
  ext: I('<path d="M14 4h6v6M20 4L10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'),
  up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  chev: I('<path d="M6 9l6 6 6-6"/>'),
  eye: I('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  upload: I('<path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  image: I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
};

/* ---------------------------------------------------------------- utils */
const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 8);
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const imgSrc = (p) => !p ? '' : S.preview[p] || (/^(https?:|blob:|data:)/.test(p) ? p : CFG.site + (p.startsWith('img/') || p.startsWith('assets/') ? p : 'assets/img/' + p.split('/').pop()));

/** h('div.class', {attr}, ...children) — malý DOM helper */
function h(sel, props = {}, ...kids) {
  const [tag, ...cls] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}

function toast(title, sub = '', type = '') {
  const el = h('div.toast' + (type ? '.' + type : ''), {}, h('b', {}, title), sub ? h('small', {}, sub) : null);
  $('#toasts').append(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, type === 'err' ? 7000 : 4000);
}
function modal({ title, body, actions = [] }) {
  return new Promise((resolve) => {
    const close = (v) => { bg.remove(); resolve(v); };
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, h('h2', {}, title));
    if (typeof body === 'string') box.append(h('div', { html: body })); else if (body) box.append(body);
    box.append(h('div.modal-actions', {}, actions.map((a) => h('button.btn' + (a.cls ? '.' + a.cls : ''), { type: 'button', onclick: () => close(typeof a.value === 'function' ? a.value(box) : a.value) }, a.label))));
    const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg) close(null); } }, box);
    $('#modal-root').append(bg);
    const f = box.querySelector('input,textarea,select,button.btn-primary'); if (f) setTimeout(() => f.focus(), 50);
  });
}
const confirmDlg = (title, text, ok = 'Smazat', cls = 'btn-dark') => modal({ title, body: `<p>${esc(text)}</p>`, actions: [{ label: 'Zrušit', value: false }, { label: ok, cls, value: true }] }).then((v) => v === true);

/* ---------------------------------------------------------------- API */
const b64e = (bytes) => { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const utf8b64 = (str) => b64e(new TextEncoder().encode(str));
function saveSess() { localStorage.setItem(SK, JSON.stringify({ t: S.sess, def: S.def, exp: Date.now() + 11.5 * 3600e3 })); }
async function api(path, opt = {}, retried = false) {
  const headers = { ...(typeof opt.body === 'string' ? { 'Content-Type': 'application/json' } : {}) };
  if (S.sess) headers.Authorization = 'Bearer ' + S.sess;
  let r;
  try { r = await fetch(`${CFG.api}/api/${CFG.id}${path}`, { ...opt, headers, cache: 'no-store' }); }
  catch { throw new Error('Nelze se spojit se serverem. Zkontrolujte připojení k internetu.'); }
  if (r.status === 401 && path !== '/login' && !retried && S.D.site) { if (await reauth()) return api(path, opt, true); }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error || m; } catch {} const e = new Error(m); e.status = r.status; throw e; }
  return opt.raw ? r.text() : r.json();
}
const readFile = (p) => api('/file?path=' + encodeURIComponent(p) + '&t=' + Date.now(), { raw: true });
async function commit(files, message) {
  const out = []; const queue = [...files];
  const worker = async () => { while (queue.length) { const f = queue.shift(); const { sha } = await api('/blob', { method: 'POST', body: JSON.stringify({ content: f.b64 ?? utf8b64(f.content), encoding: 'base64' }) }); out.push({ path: f.path, sha }); } };
  await Promise.all([worker(), worker(), worker()]);
  return (await api('/commit', { method: 'POST', body: JSON.stringify({ files: out, message }) })).sha;
}
async function reauth() {
  const inp = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Heslo' });
  const pw = await modal({ title: 'Přihlášení vypršelo', body: h('div', {}, h('p', {}, 'Zadejte prosím heslo znovu — rozdělaná práce zůstane zachovaná.'), inp), actions: [{ label: 'Zrušit', value: null }, { label: 'Přihlásit', cls: 'btn-primary', value: () => inp.value }] });
  if (!pw) return false;
  try { const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: pw }) }); S.sess = r.token; S.def = r.def; saveSess(); return true; }
  catch (e) { toast('Přihlášení se nepovedlo', e.message, 'err'); return false; }
}

/* ---------------------------------------------------------------- data */
async function loadAll() {
  const keys = Object.keys(FILES);
  const res = await Promise.all(keys.map((k) => readFile(FILES[k]).then(JSON.parse)));
  keys.forEach((k, i) => { S.D[k] = res[i]; });
  snapshot();
}
function snapshot(keys = Object.keys(FILES)) { keys.forEach((k) => { S.snap[k] = JSON.stringify(S.D[k]); }); }
const dirtyKeys = () => Object.keys(FILES).filter((k) => S.D[k] && JSON.stringify(S.D[k]) !== S.snap[k]);
const changed = debounce(() => updateSavebar(), 100);
window.addEventListener('beforeunload', (e) => { if (dirtyKeys().length) { e.preventDefault(); e.returnValue = ''; } });

function validate() {
  const ids = new Set();
  for (const l of S.D.lessons.lessons) {
    if (!l.name?.trim()) return 'Jedna lekce nemá název.';
    if (!l.id) l.id = slugify(l.name) || 'lekce-' + uid();
    if (ids.has(l.id)) l.id = l.id + '-' + uid();
    ids.add(l.id);
  }
  return null;
}
async function saveAll() {
  const keys = dirtyKeys();
  if (!keys.length || S.saving) return;
  const err = validate(); if (err) return toast('Nelze uložit', err, 'err');
  S.saving = true; updateSavebar();
  const bar = h('div.progress-line'); document.body.append(bar);
  try {
    const files = keys.map((k) => ({ path: FILES[k], content: JSON.stringify(S.D[k], null, 2) + '\n' }));
    const used = JSON.stringify(S.D);
    const imgs = Object.keys(S.pending).filter((p) => used.includes(p));
    imgs.forEach((p) => files.push({ path: p, b64: S.pending[p] }));
    const sha = await commit(files, keys.map((k) => LABEL[k]).join(', ') + (imgs.length ? ` (+${imgs.length} foto)` : ''));
    imgs.forEach((p) => delete S.pending[p]);
    snapshot(keys);
    toast('Uloženo', 'Změny se na webu objeví přibližně za minutu.', 'ok');
    watchPublish(sha);
  } catch (e) { toast('Uložení se nepovedlo', e.message, 'err'); }
  finally { S.saving = false; bar.remove(); updateSavebar(); }
}
function discard() { dirtyKeys().forEach((k) => { S.D[k] = JSON.parse(S.snap[k]); }); updateSavebar(); route(); toast('Změny zahozeny'); }

/* publikace — čeká, až version.json na webu obsahuje nový commit */
let pubTimer = null;
function setPub(state, text) { const el = $('.pub'); if (el) { el.className = 'pub ' + state; el.innerHTML = `<i></i><span>${esc(text)}</span>`; } }
function watchPublish(sha) {
  localStorage.setItem(SK + '_pub', JSON.stringify({ sha, t: Date.now() }));
  clearInterval(pubTimer); setPub('busy', 'Zveřejňuji změny…');
  const t0 = Date.now();
  pubTimer = setInterval(async () => {
    try {
      const v = await fetch(CFG.site + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json());
      if (v.sha === sha) { clearInterval(pubTimer); localStorage.removeItem(SK + '_pub'); setPub('', 'Web je aktuální'); toast('Změny jsou na webu', 'Web byl právě aktualizován.', 'ok'); return; }
    } catch {}
    if (Date.now() - t0 > 8 * 60000) { clearInterval(pubTimer); setPub('warn', 'Zveřejnění trvá déle'); }
  }, 6000);
}
function initPub() { const p = JSON.parse(localStorage.getItem(SK + '_pub') || 'null'); if (p && Date.now() - p.t < 10 * 60000) watchPublish(p.sha); else setPub('', 'Web je aktuální'); }

/* ---------------------------------------------------------------- obrázky */
async function compress(file, max = 1800) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error(`Soubor „${file.name}“ nejde načíst. Použijte JPG, PNG nebo WebP.`); }
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82)), ext = 'webp';
  if (!blob || blob.type !== 'image/webp') { blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86)); ext = 'jpg'; }
  return { blob, ext };
}
async function upload(file, hint) {
  const { blob, ext } = await compress(file);
  const d = new Date();
  const name = (slugify(hint) || slugify(file.name.replace(/\.[^.]+$/, '')) || 'foto').slice(0, 40);
  const path = `img/uploads/${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}/${name}-${uid()}.${ext}`;
  S.pending[path] = b64e(await blob.arrayBuffer());
  S.preview[path] = URL.createObjectURL(blob);
  return path;
}
async function library() {
  if (!S.lib) { try { S.lib = await fetch(CFG.site + 'admin/images.json?t=' + Date.now()).then((r) => r.json()); } catch { S.lib = []; } }
  return [...Object.keys(S.pending), ...S.lib];
}

/* ---------------------------------------------------------------- pole formulářů */
const bump = () => changed();
function fText(obj, key, label, o = {}) {
  const inp = o.multi
    ? h('textarea', { rows: o.rows || 4, placeholder: o.ph || '', oninput: (e) => { obj[key] = e.target.value; bump(); o.on?.(); } })
    : h('input', { type: o.type || 'text', placeholder: o.ph || '', inputmode: o.inputmode, autocomplete: 'off', oninput: (e) => { obj[key] = o.type === 'number' ? +e.target.value : e.target.value; bump(); o.on?.(); } });
  inp.value = obj[key] ?? '';
  return h('label.field', {}, h('span', {}, label), inp, o.hint ? h('small', {}, o.hint) : null);
}
function fSelect(obj, key, label, options, o = {}) {
  const sel = h('select', { onchange: (e) => { const v = e.target.value; obj[key] = o.num ? +v : v; bump(); o.on?.(); } },
    options.map(([v, t]) => h('option', { value: v }, t)));
  sel.value = String(obj[key] ?? options[0][0]);
  return h('label.field', {}, h('span', {}, label), sel);
}
function fCheck(obj, key, label) {
  return h('label.check', {}, h('input', { type: 'checkbox', checked: obj[key], onchange: (e) => { obj[key] = e.target.checked; bump(); } }), h('span', {}, label));
}
function fImage(obj, key, label, hint = '', on) {
  const prev = h('img.prev', { src: imgSrc(obj[key]), alt: '' });
  const set = (p) => { obj[key] = p; prev.src = imgSrc(p); bump(); on?.(); };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { set(await upload(f, hint)); toast('Fotka připravena', 'Na web se nahraje po uložení.'); } catch (er) { toast('Fotku se nepodařilo načíst', er.message, 'err'); }
    e.target.value = '';
  } });
  const pick = async () => {
    const list = await library();
    const grid = h('div.lib', {}, list.map((p) => h('button', { type: 'button', onclick: () => { set(p.startsWith('assets/img/') ? p.split('/').pop() : p); document.querySelector('.modal-bg')?.click(); } }, h('img', { src: imgSrc(p), loading: 'lazy', alt: '' }))));
    modal({ title: 'Vybrat fotku z webu', body: grid, actions: [{ label: 'Zavřít', value: null }] });
  };
  return h('div.field', {}, h('span', {}, label),
    h('div.img-field', {}, prev, h('div.acts', {},
      h('button.btn.btn-sm', { type: 'button', onclick: () => file.click(), html: IC.upload + 'Nahrát novou' }),
      h('button.btn.btn-sm.btn-ghost', { type: 'button', onclick: pick, html: IC.image + 'Vybrat z webu' }), file)));
}
/** seznam položek s rozbalováním, řazením a mazáním */
function fList(arr, o) {
  const wrap = h('div');
  const render = (openIdx = -1) => {
    wrap.replaceChildren();
    const items = h('div.items');
    if (!arr.length) items.append(h('p.empty', {}, o.empty || 'Zatím tu nic není.'));
    arr.forEach((it, i) => {
      const title = h('b'), sub = h('small'), thumb = o.thumb ? h('img.thumb', { alt: '' }) : null;
      const refresh = () => { title.textContent = o.title(it) || '(bez názvu)'; sub.textContent = o.sub ? o.sub(it) : ''; if (thumb) thumb.src = imgSrc(o.thumb(it)); };
      const body = h('div.item-body');
      let built = false;
      const el = h('div.item');
      const toggle = () => { if (!built) { o.body(it, body, refresh); built = true; } el.classList.toggle('open'); };
      const head = h('div.item-head', {},
        thumb, h('div.t', { onclick: toggle }, title, sub),
        h('div.item-tools', {},
          o.sortable === false ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout nahoru', 'aria-label': 'Posunout nahoru', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.up }),
          o.sortable === false ? null : h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Posunout dolů', 'aria-label': 'Posunout dolů', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); bump(); render(); }, html: IC.down }),
          h('button.btn.btn-icon.btn-ghost', { type: 'button', title: 'Smazat', 'aria-label': 'Smazat', onclick: async () => { if (await confirmDlg('Smazat položku?', `„${o.title(it) || 'bez názvu'}“ bude odstraněna.`)) { arr.splice(i, 1); bump(); render(); } }, html: IC.trash }),
          h('button.btn.btn-icon.btn-ghost.chev', { type: 'button', 'aria-label': 'Rozbalit', onclick: toggle, html: IC.chev })));
      el.append(head, body); items.append(el); refresh();
      if (i === openIdx) toggle();
    });
    wrap.append(items, h('button.btn.add', { type: 'button', onclick: () => { arr.push(o.make()); bump(); render(arr.length - 1); }, html: IC.plus + (o.addLabel || 'Přidat') }));
  };
  render();
  return wrap;
}
/** seznam textů (odstavce, kvalifikace) */
function fStrList(arr, label, o = {}) {
  const box = h('div.field', {}, h('span', {}, label));
  const list = h('div');
  const render = () => {
    list.replaceChildren(...arr.map((v, i) => {
      const inp = o.multi ? h('textarea', { rows: 3 }) : h('input', { type: 'text' });
      inp.value = v; inp.addEventListener('input', (e) => { arr[i] = e.target.value; bump(); });
      return h('div', { style: 'display:flex;gap:.4rem;align-items:flex-start;margin-bottom:.45rem' }, inp,
        h('button.btn.btn-icon.btn-ghost', { type: 'button', 'aria-label': 'Smazat', onclick: () => { arr.splice(i, 1); bump(); render(); }, html: IC.trash }));
    }), h('button.btn.btn-sm', { type: 'button', onclick: () => { arr.push(''); bump(); render(); list.querySelector((o.multi ? 'textarea' : 'input') + ':last-of-type'); }, html: IC.plus + (o.add || 'Přidat') }));
  };
  render(); box.append(list);
  return box;
}
const card = (title, hint, ...kids) => h('section.card', {}, title ? h('h2', {}, title) : null, hint ? h('p.hint', {}, hint) : null, ...kids);
const row2 = (...kids) => h('div.row2', {}, ...kids);

/* ---------------------------------------------------------------- pohledy */
const NAV = [
  ['', 'Přehled', 'home'], ['kontakty', 'Kontakty a rezervace', 'phone', 'site'], ['lekce', 'Lekce', 'lesson', 'lessons'],
  ['rozvrh', 'Rozvrh', 'cal', 'schedule'], ['cenik', 'Ceník', 'tag', 'pricing'], ['tym', 'O mně a lektorky', 'user', 'team'],
  ['faq', 'Časté dotazy', 'q', 'faq'], ['-'], ['nastaveni', 'Heslo a odhlášení', 'gear'],
];
const view = (title, lead, ...kids) => { const m = $('main.view'); m.replaceChildren(h('div.view-head', {}, h('h1', {}, title), lead ? h('p', {}, lead) : null), ...kids); window.scrollTo(0, 0); };

function vDash() {
  const tiles = NAV.filter((n) => n[0] && n[0] !== '-' && n[0] !== 'nastaveni').map(([id, label, ic]) =>
    h('a.tile', { href: '#/' + id }, h('span', { html: IC[ic] }), h('b', {}, label), h('small', {}, {
      kontakty: 'Adresa, telefon, Instagram a odkaz na rezervace', lekce: 'Druhy lekcí, popisy a fotky', rozvrh: 'Týdenní rozvrh na webu',
      cenik: 'Vstupy, permanentky, MultiSport', tym: 'Váš příběh, kvalifikace a lektorky', faq: 'Otázky a odpovědi',
    }[id])));
  view('Dobrý den 👋', 'Tady upravíte obsah webu A-Studia. Změny uložíte tlačítkem dole — na webu se objeví zhruba za minutu.',
    S.def ? h('div.banner', { html: `${IC.info}<p>Používáte výchozí heslo <b>admin</b>. <a href="#/nastaveni">Nastavte si prosím vlastní heslo</a>, ať do administrace nemůže nikdo jiný.</p>` }) : null,
    h('div.tiles', {}, tiles),
    card('Jak to funguje', null, h('p', { style: 'color:var(--muted);font-size:.93rem' }, 'Upravte, co potřebujete, v libovolné sekci. Dole se objeví lišta „Uložit změny“ — jedním kliknutím uložíte vše najednou. Nahoře (na počítači) uvidíte, kdy jsou změny na webu.')),
    h('a.btn.btn-dark', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.ext + 'Otevřít web' }));
}

function vSite() {
  const d = S.D.site;
  view('Kontakty a rezervace', 'Údaje z patičky, stránky Kontakt a tlačítek „Rezervovat lekci“.',
    card('Rezervace', 'Kam vedou všechna tlačítka „Rezervovat“.',
      fText(d, 'booking_url', 'Odkaz na rezervační systém', { type: 'url', ph: 'https://…', hint: 'Dokud je prázdné, tlačítka „Rezervovat“ vedou na stránku Kontakt.' }),
      fText(d, 'booking_embed', 'Odkaz pro vložení rozvrhu do webu (nepovinné)', { type: 'url', ph: 'https://…', hint: 'Pokud váš rezervační systém nabízí „widget“ nebo „embed“, vložte sem jeho adresu — rozvrh s volnými místy se zobrazí přímo na stránce Rozvrh.' })),
    card('Kontakt', null,
      row2(fText(d, 'phone', 'Telefon', { type: 'tel' }), fText(d, 'email', 'E-mail', { type: 'email' })),
      fText(d, 'instagram', 'Instagram (bez @)'),
      row2(fText(d, 'address', 'Ulice a číslo'), fText(d, 'zip', 'PSČ')), fText(d, 'city', 'Město'),
      fText(d, 'address_note', 'Poznámka k adrese', { multi: true, rows: 2 }),
      fText(d, 'parking', 'Parkování', { multi: true, rows: 3 })));
}

const LEVELS = [['0', 'Bez označení'], ['1', '● Lehká'], ['2', '●● Střední'], ['3', '●●● Vyšší']];
function vLessons() {
  const arr = S.D.lessons.lessons;
  view('Lekce', 'Druhy lekcí na stránce Lekce. Pořadí zde = pořadí na webu.',
    fList(arr, {
      title: (l) => l.name, sub: (l) => [l.group, l.length].filter(Boolean).join(' · '), thumb: (l) => l.image,
      addLabel: 'Přidat lekci',
      make: () => ({ id: '', group: 'Barre', name: '', length: '55 min', level: 1, for: '', text: '', image: 'barre-lekce.jpg' }),
      body: (l, b, r) => b.append(
        fText(l, 'name', 'Název lekce', { on: r }),
        row2(fSelect(l, 'group', 'Typ', [['Barre', 'Barre'], ['Pilates', 'Pilates'], ['Soukromě', 'Soukromá lekce']], { on: r }), fText(l, 'length', 'Délka', { on: r, ph: '55 min' })),
        row2(fSelect(l, 'level', 'Náročnost', LEVELS, { num: true }), fText(l, 'for', 'Pro koho', { ph: 'Pro začátečnice…' })),
        fText(l, 'text', 'Popis', { multi: true, rows: 7, hint: 'Nový řádek = nový odstavec.' }),
        fImage(l, 'image', 'Fotka', l.name, r)),
    }));
}

function vSchedule() {
  const d = S.D.schedule;
  const tabs = h('div.day-tabs', { role: 'tablist' });
  const panel = h('div');
  const lessonNames = [...new Set(S.D.lessons.lessons.map((l) => l.name))];
  const dl = h('datalist', { id: 'lesson-names' }, lessonNames.map((n) => h('option', { value: n })));
  const renderTabs = () => tabs.replaceChildren(...d.days.map((day, i) => h('button' + (i === S.day ? '.on' : ''), { type: 'button', onclick: () => { S.day = i; renderTabs(); renderDay(); } }, day.short, h('small', {}, String(day.classes.length)))));
  const renderDay = () => {
    const day = d.days[S.day];
    const rows = day.classes.map((c, i) => {
      const t = h('input', { type: 'time', value: c.time, 'aria-label': 'Čas', oninput: (e) => { c.time = e.target.value; bump(); } });
      const n = h('input', { type: 'text', value: c.lesson, list: 'lesson-names', placeholder: 'Lekce', 'aria-label': 'Lekce', oninput: (e) => { c.lesson = e.target.value; bump(); } });
      const len = h('input.len', { type: 'text', value: c.len, placeholder: '55 min', 'aria-label': 'Délka', oninput: (e) => { c.len = e.target.value; bump(); } });
      return h('div.cls', {}, t, n, len, h('button.btn.btn-icon.btn-ghost.del', { type: 'button', 'aria-label': 'Smazat lekci', onclick: () => { day.classes.splice(i, 1); bump(); renderTabs(); renderDay(); }, html: IC.trash }));
    });
    panel.replaceChildren(card(day.day, day.classes.length ? null : 'Tento den nejsou žádné lekce.', ...rows,
      h('button.btn.add', { type: 'button', onclick: () => { day.classes.push({ time: '18:00', lesson: lessonNames[0] || '', len: '55 min' }); day.classes.sort((a, b) => a.time.localeCompare(b.time)); bump(); renderTabs(); renderDay(); }, html: IC.plus + 'Přidat lekci do rozvrhu' })));
  };
  renderTabs(); renderDay();
  view('Rozvrh', 'Týdenní rozvrh zobrazený na webu. Rezervace a volná místa řeší váš rezervační systém.',
    dl, tabs, panel, card('Poznámka pod rozvrhem', null, fText(d, 'note', 'Text', { multi: true, rows: 2 })));
}

function vPricing() {
  const d = S.D.pricing;
  view('Ceník', 'Ceny na stránce Ceník. Cenu pište i s měnou, např. „290 Kč“.',
    card('Permanentky', null, fList(d.passes, {
      title: (p) => p.name, sub: (p) => [p.price, p.featured ? 'zvýrazněná' : ''].filter(Boolean).join(' · '), addLabel: 'Přidat permanentku',
      make: () => ({ name: '', price: '', per: '', valid: '', featured: false }),
      body: (p, b, r) => b.append(row2(fText(p, 'name', 'Název', { on: r }), fText(p, 'price', 'Cena', { on: r })), row2(fText(p, 'per', 'Cena za lekci / popis'), fText(p, 'valid', 'Platnost')), fCheck(p, 'featured', 'Zvýraznit (žluté pozadí)')),
    })),
    card('Jednotlivé vstupy', null, fList(d.single, {
      title: (p) => p.name, sub: (p) => p.price, addLabel: 'Přidat položku',
      make: () => ({ name: '', price: '', note: '' }),
      body: (p, b, r) => b.append(row2(fText(p, 'name', 'Název', { on: r }), fText(p, 'price', 'Cena', { on: r })), fText(p, 'note', 'Poznámka')),
    })),
    card('Další informace', null, fText(d, 'multisport', 'MultiSport', { multi: true, rows: 3 }), fText(d, 'gift', 'Dárkový poukaz', { multi: true, rows: 3 }), fText(d, 'note', 'Poznámka pod ceníkem', { multi: true, rows: 2 })));
}

function vTeam() {
  const f = S.D.team.founder;
  view('O mně a lektorky', 'Stránky O studiu a Lektorky.',
    card('O mně', null,
      row2(fText(f, 'name', 'Jméno'), fText(f, 'role', 'Role', { ph: 'Majitelka & lektorka' })),
      fImage(f, 'image', 'Portrét', 'portret'),
      fStrList(f.story, 'Můj příběh (odstavce, na stránce O studiu a Lektorky)', { multi: true, add: 'Přidat odstavec' }),
      fStrList(f.quals, 'Zkušenosti a kvalifikace', { add: 'Přidat položku' })),
    card('Lektorky', null, fList(S.D.team.team, {
      title: (m) => m.name, sub: (m) => m.role, thumb: (m) => m.image, addLabel: 'Přidat lektorku',
      make: () => ({ name: '', role: '', image: 'lektorka-sed.jpg', text: '' }),
      body: (m, b, r) => b.append(row2(fText(m, 'name', 'Jméno', { on: r }), fText(m, 'role', 'Co učí', { on: r, ph: 'Barre' })), fText(m, 'text', 'Představení', { multi: true, rows: 4 }), fImage(m, 'image', 'Fotka', m.name, r)),
    })));
}

function vFaq() {
  view('Časté dotazy', 'Otázky jsou rozdělené do skupin. Prvních pár otázek z první skupiny se ukazuje i na stránce První návštěva.',
    fList(S.D.faq.groups, {
      title: (g) => g.title, sub: (g) => `${g.items.length} otázek`, addLabel: 'Přidat skupinu',
      make: () => ({ title: 'Nová skupina', items: [] }),
      body: (g, b, r) => b.append(fText(g, 'title', 'Název skupiny', { on: r }), fList(g.items, {
        title: (x) => x.q, addLabel: 'Přidat otázku', make: () => ({ q: '', a: '' }),
        body: (x, bb, rr) => bb.append(fText(x, 'q', 'Otázka', { on: rr }), fText(x, 'a', 'Odpověď', { multi: true, rows: 4, hint: 'Nový řádek = nový odstavec.' })),
      })),
    }));
}

function vSettings() {
  const f = { old: '', pw: '', pw2: '' };
  const msg = h('p', { style: 'color:var(--err);font-size:.9rem;min-height:1.2rem' });
  const pwInput = (key, label, ac) => h('label.field', {}, h('span', {}, label), h('input', { type: 'password', autocomplete: ac, oninput: (e) => { f[key] = e.target.value; } }));
  view('Heslo a odhlášení', null,
    card('Změnit heslo', S.def ? 'Zatím používáte výchozí heslo „admin“. Nastavte si vlastní — alespoň 8 znaků.' : 'Po změně hesla se odhlásí všechna ostatní zařízení.',
      pwInput('old', 'Současné heslo', 'current-password'), pwInput('pw', 'Nové heslo', 'new-password'), pwInput('pw2', 'Nové heslo znovu', 'new-password'), msg,
      h('button.btn.btn-primary', { type: 'button', onclick: async (e) => {
        msg.textContent = '';
        if (f.pw.length < 8) return (msg.textContent = 'Nové heslo musí mít alespoň 8 znaků.');
        if (f.pw !== f.pw2) return (msg.textContent = 'Nová hesla se neshodují.');
        e.target.disabled = true;
        try { const r = await api('/password', { method: 'POST', body: JSON.stringify({ old: f.old, password: f.pw }) }); S.sess = r.token; S.def = false; saveSess(); toast('Heslo změněno', 'Příště se přihlaste novým heslem.', 'ok'); route(); }
        catch (er) { msg.textContent = er.message; } finally { e.target.disabled = false; }
      } }, 'Uložit nové heslo')),
    card('Odhlásit se', null, h('button.btn', { type: 'button', onclick: logout, html: IC.logout + 'Odhlásit' })));
}

/* ---------------------------------------------------------------- shell */
function renderShell() {
  const nav = h('nav.nav', { id: 'nav', 'aria-label': 'Sekce administrace' },
    h('button.btn.btn-icon.btn-ghost.nav-close', { type: 'button', 'aria-label': 'Zavřít menu', onclick: () => nav.classList.remove('open'), html: IC.x }),
    NAV.map(([id, label, ic, key]) => id === '-' ? h('hr') : h('a', { href: '#/' + id, 'data-id': id, 'data-key': key || '', onclick: () => nav.classList.remove('open'), html: IC[ic] + `<span>${esc(label)}</span>` })),
    h('hr'), h('a', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.ext + '<span>Zobrazit web</span>' }));
  const bar = h('div.savebar', { id: 'savebar' }, h('span', {}, ''),
    h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: async () => { if (await confirmDlg('Zahodit změny?', 'Neuložené úpravy se ztratí.', 'Zahodit')) discard(); } }, 'Zahodit'),
    h('button.btn.btn-primary', { type: 'button', onclick: saveAll }, 'Uložit změny'));
  $('#app').replaceChildren(h('div.shell', {},
    h('header.top', {},
      h('button.btn.btn-icon.btn-ghost.menu-btn', { type: 'button', 'aria-label': 'Menu', onclick: () => nav.classList.add('open'), html: IC.menu }),
      h('a.top-logo', { href: '#/' }, h('img', { src: CFG.site + 'assets/logo-a-studio.svg', alt: 'A-Studio' }), h('span', {}, 'Administrace')),
      h('div.pub'), h('a.btn.btn-sm', { href: CFG.site, target: '_blank', rel: 'noopener', html: IC.eye + '<span>Web</span>' })),
    h('div.layout', {}, nav, h('main.view'))), bar);
  initPub();
}
function updateSavebar() {
  const keys = dirtyKeys(); const bar = $('#savebar'); if (!bar) return;
  bar.classList.toggle('on', keys.length > 0 || S.saving);
  bar.querySelector('span').textContent = S.saving ? 'Ukládám…' : `Neuložené změny: ${keys.map((k) => LABEL[k]).join(', ')}`;
  bar.querySelectorAll('button').forEach((b) => { b.disabled = S.saving; });
  document.querySelectorAll('.nav a[data-key]').forEach((a) => { a.querySelector('.dot')?.remove(); if (keys.includes(a.dataset.key)) a.append(h('i.dot')); });
}
const VIEWS = { '': vDash, kontakty: vSite, lekce: vLessons, rozvrh: vSchedule, cenik: vPricing, tym: vTeam, faq: vFaq, nastaveni: vSettings };
function route() {
  const id = location.hash.replace(/^#\/?/, '');
  (VIEWS[id] || vDash)();
  document.querySelectorAll('.nav a[data-id]').forEach((a) => a.classList.toggle('on', a.dataset.id === (VIEWS[id] ? id : '')));
  updateSavebar();
}
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------- přihlášení */
function renderLogin(msg = '') {
  const inp = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', placeholder: 'Heslo', required: true });
  const err = h('p.login-err', {}, msg);
  const btn = h('button.btn.btn-dark', { type: 'submit' }, 'Přihlásit se');
  const form = h('form.login-card', { onsubmit: async (e) => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Přihlašuji…';
    try {
      const r = await api('/login', { method: 'POST', body: JSON.stringify({ password: inp.value }) });
      S.sess = r.token; S.def = r.def; saveSess(); await start();
    } catch (er) { err.textContent = er.message; btn.disabled = false; btn.textContent = 'Přihlásit se'; inp.select(); }
  } },
  h('img', { src: CFG.site + 'assets/logo-a-studio.svg', alt: 'A-Studio' }), h('h1', {}, 'Administrace webu'), h('p', {}, 'Přihlaste se heslem k administraci.'),
  h('label.field', {}, h('span', {}, 'Heslo'), h('div.pw-wrap', {}, inp, h('button.pw-eye', { type: 'button', 'aria-label': 'Zobrazit heslo', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; }, html: IC.eye }))),
  btn, err);
  $('#app').replaceChildren(h('div.login', {}, form));
  setTimeout(() => inp.focus(), 50);
}
function logout() {
  if (dirtyKeys().length && !confirm('Máte neuložené změny. Opravdu se odhlásit?')) return;
  localStorage.removeItem(SK); S.sess = null; S.D = {}; renderLogin();
}
async function start() {
  $('#app').innerHTML = `<div class="boot"><img src="${CFG.site}assets/logo-a-studio.svg" alt=""><span class="spin"></span></div>`;
  try { await loadAll(); } catch (e) {
    if (e.status === 401) { localStorage.removeItem(SK); S.sess = null; return renderLogin('Přihlášení vypršelo, přihlaste se prosím znovu.'); }
    return renderLogin('Obsah webu se nepodařilo načíst: ' + e.message);
  }
  renderShell(); route();
}
function boot() {
  const s = JSON.parse(localStorage.getItem(SK) || 'null');
  if (s && s.exp > Date.now()) { S.sess = s.t; S.def = s.def; start(); } else renderLogin();
}
boot();
})();
