(async () => {
  'use strict';

  /* ======================================================================
     DASAR
     ====================================================================== */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMQ = matchMedia('(max-width: 860px)');
  const isMobile = () => mobileMQ.matches;
  const qs = new URLSearchParams(location.search);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = s => String(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S(?:.*?\S)?)\*/g, '$1');
  const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fmt = (d, o) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', o);
  const fmtShort = d => fmt(d, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtLong = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const num = n => n.toLocaleString('id-ID');

  let toastT;
  function toast(msg, action, ms = 2800) {
    const t = $('#toast');
    t.textContent = msg;
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { t.classList.remove('on'); action.run(); });
      t.append(b);
    }
    t.classList.toggle('has-action', !!action);
    t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), action ? 8000 : ms);
  }

  /* ======================================================================
     KONTEN: content/*.json, atau draf pratinjau dari panel admin
     ====================================================================== */
  const PREVIEW = qs.has('preview');
  async function loadContent() {
    if (PREVIEW) {
      try { const p = JSON.parse(localStorage.getItem('jm:preview')); if (p) return p; } catch (e) { /* jatuh ke berkas */ }
    }
    const get = f => fetch('content/' + f, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    const [site, works, layout] = await Promise.all([get('site.json'), get('works.json'), get('layout.json')]);
    return { site, works, layout };
  }
  const content = await loadContent();

  const DEFAULT_CATS = [
    { id: 'esai', label: 'Esai', tag: 'ESAI', ink: '#2F5BFF' },
    { id: 'puisi', label: 'Puisi', tag: 'PUISI', ink: '#D2338A', red: true },
    { id: 'cerpen', label: 'Cerpen', tag: 'CERPEN', ink: '#0E8A5C' },
    { id: 'mini', label: 'Fiksi Mini', tag: 'MINI', ink: '#E0571C' },
    { id: 'catatan', label: 'Catatan', tag: 'CATATAN', ink: '#6A4DF0' }
  ];
  const site = content.site || {};
  const SITE = {
    title: 'Juan Menulis', author: 'Juan', handle: 'juan/menulis', email: '', avatar: '', readerName: 'pembaca',
    accent: '', sticky: '', theme: 'auto', backdrop: 'auto', defaultView: 'kanvas', readerFont: 'newsreader', readerPaper: 'putih',
    folders: {}, years: {}, categories: DEFAULT_CATS,
    ...site,
    features: { dock: true, visitorStickies: true, rotatingQuotes: true, connections: true, replay: true, ambience: true, ...(site.features || {}) }
  };
  const CATS = {};
  (SITE.categories && SITE.categories.length ? SITE.categories : DEFAULT_CATS).forEach(c => { CATS[c.id] = c; });
  const catOf = id => CATS[id] || (CATS[id] = { id, label: id, tag: String(id).toUpperCase().slice(0, 7), ink: '#111214' });

  const WORKS = (Array.isArray(content.works) ? content.works : [])
    .filter(w => w && w.slug && w.title && Array.isArray(w.body) && (PREVIEW || !w.draft))
    .map(w => ({ form: 'prosa', time: '', excerpt: '', line: '', ...w }))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  [...WORKS].reverse().forEach((w, i) => { w.no = String(i + 1).padStart(2, '0'); });

  /* ---------- waktu setempat ---------- */
  const hourNow = new Date().getHours() + new Date().getMinutes() / 60;
  const dayPart = hourNow < 4 ? 'malam' : hourNow < 10.5 ? 'pagi' : hourNow < 15 ? 'siang' : hourNow < 18.5 ? 'sore' : 'malam';

  /* ---------- pengaturan dari admin ---------- */
  const root = document.documentElement;
  document.title = SITE.title;
  if (SITE.description) $('meta[name="description"]')?.setAttribute('content', SITE.description);
  if (SITE.accent) root.style.setProperty('--tk-blue', SITE.accent);
  if (SITE.sticky) root.style.setProperty('--lime', SITE.sticky);
  if (!store.get('theme', null) && SITE.theme !== 'auto') root.setAttribute('data-theme', SITE.theme === 'gelap' ? 'dark' : 'light');
  $('.tk-title').textContent = SITE.handle;
  { const [h1, ...rest] = SITE.handle.split('/'); $('#tbBrand').innerHTML = esc(h1) + (rest.length ? `<em>/${esc(rest.join('/'))}</em>` : ''); }
  const win = $('#win');
  if (!SITE.features.dock) win.classList.add('no-dock');
  if (!SITE.features.visitorStickies) $('#addNote').hidden = true;
  if (SITE.email) { $('#chipMail').hidden = false; $('#mailName').textContent = 'ke ' + SITE.author; }

  if (!WORKS.length) {
    $('.views').innerHTML = `<div class="empty"><p class="empty-t">Belum ada tulisan yang terbit.</p><p>${location.protocol === 'file:' ? 'Buka situs ini lewat server (misalnya <code>python3 -m http.server</code>), bukan langsung dari berkas.' : 'Tulis yang pertama di <a href="admin/">panel admin</a>.'}</p></div>`;
    win.classList.add('dock-off', 'ready'); win.dataset.view = 'daftar';
    return;
  }

  /* ---------- analisis ringan ---------- */
  const wordsOf = s => (s.toLowerCase().match(/[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*/g) || []);
  function units(text, poem) {
    if (poem) return text.split(/\n+/).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
    const flat = text.replace(/\s*\n+\s*/g, ' ');
    return (flat.match(/[^.!?…]+(?:[.!?…]+[”"’)]*|$)/g) || []).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
  }
  const fullText = w => plain(w.body.join('\n\n'));
  function prep(w) {
    const t = fullText(w);
    w.words = wordsOf(t).length;
    w.minutes = Math.max(1, Math.round(w.words / 170));
    w.lens = units(t, w.form === 'puisi').map(u => wordsOf(u).length).filter(Boolean);
    w.bytes = new Blob([t]).size;
    w.file = fold(w.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md';
    if (!w.excerpt) w.excerpt = plain(w.body[0] || '').replace(/\n/g, ' ').slice(0, 160);
    if (!w.line) w.line = (units(t, w.form === 'puisi')[0] || w.title).slice(0, 90);
    return w;
  }
  WORKS.forEach(prep);

  const all = () => WORKS;
  const bySlug = slug => all().find(w => w.slug === slug);
  const readSet = new Set(store.get('read', []));
  const notes = store.get('notes', {});

  /* ======================================================================
     SENI BENANG
     ====================================================================== */
  const ABC = 'abcdefghijklmnopqrstuvwxyz';
  function seeded(str) {
    let h = 2166136261;
    for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  }
  function drawThread(canvas, text, o = {}) {
    const w = o.w || canvas.clientWidth, h = o.h || canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const pad = o.pad ?? 6;
    const r = Math.min(w, h) / 2 - pad, cx = w / 2, cy = h / 2;
    const rot = o.seed ? seeded(o.seed + '/r')() * Math.PI * 2 : 0;
    const P = [...ABC].map((_, i) => {
      const a = -Math.PI / 2 + rot + (i / 26) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    const seq = fold(text).replace(/[^a-z]/g, '').slice(0, o.max || 1600);
    const rnd = seeded(o.seed || 'x');
    const j = r * 0.02;
    const segs = [];
    for (let i = 1; i < seq.length; i++) {
      const a = P[seq.charCodeAt(i - 1) - 97], b = P[seq.charCodeAt(i) - 97];
      if (a !== b) segs.push([a[0] + (rnd() - .5) * j, a[1] + (rnd() - .5) * j, b[0] + (rnd() - .5) * j, b[1] + (rnd() - .5) * j]);
    }
    const color = o.color || '#111';
    const alpha = clamp(6 / Math.sqrt(segs.length + 4), 0.05, 0.6) * (o.weight || 1);
    const lw = o.lw || Math.max(0.45, r / 170);
    const strokes = (from, to) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
      for (let i = from; i < to; i++) { const s = segs[i]; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
    };
    const pins = () => {
      if (o.pins === false) return;
      ctx.globalAlpha = 1; ctx.fillStyle = color;
      P.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(.7, r / 120), 0, Math.PI * 2); ctx.fill(); });
    };
    cancelAnimationFrame(canvas._raf);
    if (o.frac != null) { pins(); strokes(0, Math.round(segs.length * clamp(o.frac, 0, 1))); return segs.length; }
    if (!o.animate || reduced) { strokes(0, segs.length); pins(); return; }
    pins();
    const per = Math.max(1, Math.ceil(segs.length / (o.frames || 60)));
    let i = 0;
    const step = () => { strokes(i, Math.min(i + per, segs.length)); i += per; if (i < segs.length) canvas._raf = requestAnimationFrame(step); };
    step();
  }
  const coverOf = (canvas, w, o = {}) => drawThread(canvas, fullText(w), { color: catOf(w.cat).ink, seed: w.slug, ...o });
  function mini(w, size = 36) {
    const c = document.createElement('canvas');
    c.style.width = c.style.height = size + 'px';
    c.setAttribute('aria-hidden', 'true');
    requestAnimationFrame(() => coverOf(c, w, { w: size, h: size, pad: 3, pins: false, weight: 1.2 }));
    return c;
  }
  function avatarInto(host, size) {
    host.innerHTML = '';
    if (SITE.avatar) {
      const img = new Image();
      img.alt = SITE.author; img.src = SITE.avatar; img.decoding = 'async';
      host.append(img);
    } else {
      const c = document.createElement('canvas');
      host.append(c);
      requestAnimationFrame(() => drawThread(c, SITE.author + ' menulis setiap hari', { w: size, h: size, pad: size > 40 ? 8 : 2, color: '#7A2448', seed: 'me', weight: 1.3, pins: size > 40 }));
    }
  }

  /* ======================================================================
     TRANSISI ANTAR TAMPILAN (View Transitions bila didukung)
     ====================================================================== */
  let morphFrom = null, booted = false;
  function vt(update) {
    const from = morphFrom; morphFrom = null;
    if (!document.startViewTransition || reduced || !booted) { update(); return; }
    if (from) from.style.viewTransitionName = 'doc';
    const t = document.startViewTransition(() => {
      if (from) from.style.viewTransitionName = '';
      update();
      if (from && win.dataset.view === 'baca') $('#rdCard').style.viewTransitionName = 'doc';
    });
    t.finished.finally(() => { $('#rdCard').style.viewTransitionName = ''; });
  }

  /* ======================================================================
     JENDELA, TAMPILAN, TEMA
     ====================================================================== */
  const VIEWS = ['putar', 'kanvas', 'daftar', 'sapa'];
  let view = 'kanvas', prevView = 'kanvas';

  function setView(v) {
    if (v === 'sapa' && !isMobile()) v = 'kanvas';
    if (view !== 'baca') prevView = view;
    view = v;
    win.dataset.view = v;
    syncPill();
    if (v === 'kanvas') canvasFit(false);
    if (v !== 'baca') { stopSpeech(); releaseLock(); setSheet(false); stopReplay(false); Amb.set('hening'); hideQuotePop(); document.title = SITE.title; }
  }
  function syncPill() {
    const btns = $$('.pill [data-go]');
    let idx = -1;
    btns.forEach((b, i) => {
      const isView = b.dataset.go === view;
      const on = b.dataset.go === 'sapa' && !isMobile() ? !win.classList.contains('dock-off') && !win.classList.contains('no-dock') : isView;
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (isView) idx = i;
    });
    const th = $('.pill-thumb');
    th.style.opacity = idx < 0 ? '0' : '1';
    if (idx >= 0) th.style.setProperty('--x', btns[idx].offsetLeft + 'px');
  }
  function go(v) {
    if (v === 'sapa' && !isMobile()) { toggleDock(); return; }
    if (location.hash === '#' + v) vt(() => setView(v)); else location.hash = v;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  function toggleDock(force) {
    if (win.classList.contains('no-dock')) return;
    const off = force != null ? !force : !win.classList.contains('dock-off');
    win.classList.toggle('dock-off', off);
    $('#dockToggle').setAttribute('aria-pressed', String(!off));
    store.set('dockOff', off);
    syncPill();
    setTimeout(canvasClamp, 520);
  }
  $('#dockToggle').addEventListener('click', () => toggleDock());
  if (store.get('dockOff', false)) toggleDock(false);
  if (win.classList.contains('no-dock')) $('#dockToggle').hidden = true;

  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => { const t = root.getAttribute('data-theme'); return t ? t === 'dark' : darkMQ.matches; };
  function setTheme(dark) {
    const apply = () => {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      store.set('theme', dark ? 'dark' : 'light');
      $('#chipDark').setAttribute('aria-checked', String(dark));
      if (typeof applyBackdrop === 'function') applyBackdrop();
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
  }
  $('#chipDark').setAttribute('aria-checked', String(isDark()));
  $('#chipDark').addEventListener('click', () => setTheme(!isDark()));
  darkMQ.addEventListener?.('change', () => { $('#chipDark').setAttribute('aria-checked', String(isDark())); applyBackdrop(); });

  const BACKDROPS = ['auto', 'fajar', 'siang', 'senja', 'kabut', 'malam'];
  const BD_NAMES = { auto: 'ikut jam', fajar: 'Fajar', siang: 'Siang', senja: 'Senja', kabut: 'Kabut', malam: 'Malam' };
  const clockBackdrop = () => (isDark() ? 'malam' : { pagi: 'fajar', siang: 'siang', sore: 'senja', malam: 'malam' }[dayPart]);
  let backdrop = store.get('backdrop', SITE.backdrop || 'auto');
  function applyBackdrop() {
    root.setAttribute('data-backdrop', backdrop === 'auto' ? clockBackdrop() : backdrop);
    $('#bdNext').textContent = BD_NAMES[BACKDROPS[(BACKDROPS.indexOf(backdrop) + 1) % BACKDROPS.length]];
  }
  $('#chipBackdrop').addEventListener('click', () => {
    backdrop = BACKDROPS[(BACKDROPS.indexOf(backdrop) + 1) % BACKDROPS.length];
    store.set('backdrop', backdrop);
    applyBackdrop();
    toast('Latar: ' + BD_NAMES[backdrop]);
  });
  applyBackdrop();

  /* ======================================================================
     KANVAS
     ====================================================================== */
  const viewport = $('#viewport'), world = $('#world');
  const WORLD = { w: 2600, h: 1100 };
  const cam = { x: 0, y: 0, s: 1 };
  const TATA = qs.has('tata');
  let stickies = store.get('stickies', []);
  let zTop = 10;

  const DEFAULT_LAYOUT = [
    { id: 's:peta', type: 'sticky', slug: 'peta-tersesat', x: 60, y: 560 },
    { id: 'p:draf-ketujuh', type: 'paper', slug: 'draf-ketujuh', x: 250, y: 420, peek: 'bahasa-ibu' },
    { id: 'f:puisi', type: 'folder', cat: 'puisi', x: 520, y: 400 },
    { id: 'p:jendela', type: 'paper', slug: 'jendela', x: 772, y: 396 },
    { id: 'img', type: 'img', slug: 'penjual-senin', x: 1012, y: 432 },
    { id: 'note', type: 'note', slug: 'penjual-senin', x: 1222, y: 398 },
    { id: 'p:peta-tersesat', type: 'paper', slug: 'peta-tersesat', x: 1420, y: 386 },
    { id: 's:kopi', type: 'sticky', slug: 'kopi-kedua', x: 1636, y: 548 },
    { id: 'p:kopi-kedua', type: 'paper', slug: 'kopi-kedua', x: 1700, y: 404 },
    { id: 'p:penjual-senin', type: 'paper', slug: 'penjual-senin', x: 1960, y: 392 },
    { id: 'f:esai', type: 'folder', cat: 'esai', x: 2220, y: 404 }
  ];
  const onCanvas = w => w && w.canvas !== false;
  function buildLayout() {
    const src = content.layout && Array.isArray(content.layout.objects) ? content.layout.objects : DEFAULT_LAYOUT;
    const objs = src.filter(o => {
      if (o.slug && !onCanvas(WORKS.find(w => w.slug === o.slug))) return false;
      if (o.type === 'folder') return WORKS.filter(w => w.cat === o.cat && onCanvas(w)).length > 1;
      return true;
    }).map(o => ({ ...o, peek: o.peek && onCanvas(WORKS.find(w => w.slug === o.peek)) ? o.peek : undefined }));
    // tulisan baru yang belum punya tempat: taruh berderet di kanan
    const folderCats = new Set(objs.filter(o => o.type === 'folder').map(o => o.cat));
    const shown = new Set(objs.flatMap(o => [o.slug, o.peek]).filter(Boolean));
    const missing = WORKS.filter(w => onCanvas(w) && !shown.has(w.slug) && !folderCats.has(w.cat));
    const maxX = Math.max(400, ...objs.map(o => o.x + 200));
    missing.forEach((w, i) => objs.push({ id: 'p:' + w.slug, type: 'paper', slug: w.slug, x: maxX + 60 + i * 240, y: 392 + (i % 2 ? 24 : -10) }));
    WORLD.w = Math.max(2600, ...objs.map(o => o.x + 520));
    return objs;
  }
  const LAYOUT = buildLayout();
  const layoutSig = JSON.stringify(LAYOUT.map(o => [o.id, o.x, o.y]));
  let pos = store.get('posSig', '') === layoutSig ? store.get('pos', {}) : {};
  if (TATA) pos = {};

  function tinyOf(w) {
    if (w.form === 'puisi') return `<div class="tiny"><p class="poem">${esc(plain(w.body.slice(0, 3).join('\n\n')))}</p></div>`;
    const sents = units(plain(w.body.slice(1).join(' ')), false).slice(0, 3);
    return `<div class="tiny"><p>${esc(plain(w.body[0]))}</p><b>${esc(plain(w.line))}</b>${sents.map(s => `<p class="li">${esc(s)}</p>`).join('')}</div>`;
  }
  const hoverPill = w => `<span class="read-pill" aria-hidden="true">Baca · ${w.minutes} mnt</span>`;
  function objHTML(o) {
    const w = o.slug && bySlug(o.slug);
    if (o.type === 'paper') return `
      <article class="obj paper" tabindex="0" data-open="${w.slug}" aria-label="${esc(w.title)}, ${esc(catOf(w.cat).label)}">
        ${o.peek ? (() => { const pw = bySlug(o.peek); return `<div class="peek" data-open="${pw.slug}">${esc(plain(pw.body[0]).replace(/\n/g, ' '))}…</div>`; })() : ''}
        <div class="sheet"><p class="k">${esc(catOf(w.cat).label)}</p><h3>${esc(w.title)}</h3>${tinyOf(w)}</div>${hoverPill(w)}
      </article>`;
    if (o.type === 'folder') {
      const items = WORKS.filter(x => x.cat === o.cat && onCanvas(x));
      return `
      <article class="obj folder" tabindex="0" data-shelf="${o.cat}" aria-label="Kumpulan ${esc(catOf(o.cat).label)}, ${items.length} tulisan">
        <div class="in-paper"><p class="t">${esc(plain(items[0].body[0]))}</p></div><div class="in-paper"></div><div class="in-lime"></div>
        <svg class="shape" viewBox="0 0 176 250" preserveAspectRatio="none" aria-hidden="true"><path d="M10 0H166Q176 0 176 10V58C176 80 144 76 144 102V150C144 176 176 172 176 194V240Q176 250 166 250H10Q0 250 0 240V10Q0 0 10 0Z"/></svg>
        <div class="f-label"><p>Kumpulan · ${items.length}</p><h3>${esc((SITE.folders || {})[o.cat] || catOf(o.cat).label)}</h3></div>
      </article>`;
    }
    if (o.type === 'img') return `
      <article class="obj imgcard" tabindex="0" data-open="${w.slug}" aria-label="Peta benang dari ${esc(w.title)}">
        <canvas data-thread="${w.slug}"></canvas><span class="cap">benang dari “${esc(w.title)}”</span>
      </article>`;
    if (o.type === 'note') return `
      <button class="obj note" type="button" data-open="${w.slug}">${esc(o.text || 'Gambar ini dirajut dari huruf-huruf cerpennya. Ketuk untuk membaca.')}</button>`;
    if (o.type === 'sticky') return `
      <article class="obj sticky" tabindex="0" data-open="${w.slug}" aria-label="Baris dari ${esc(w.title)}">${esc(plain(w.line))}<span class="from">— ${esc(w.title)}</span></article>`;
    if (o.type === 'user') return `
      <article class="obj sticky" data-sticky="${o.id}">
        <button class="x" type="button" aria-label="Hapus catatan">×</button>
        <div class="edit" contenteditable="true" spellcheck="false" aria-label="Catatan tempel">${esc(o.text || '')}</div>
      </article>`;
    return '';
  }
  function canvasObjects() {
    const list = LAYOUT.slice();
    if (!TATA) {
      if (SITE.features.visitorStickies) stickies.forEach(s => list.push({ ...s, type: 'user' }));
    }
    return list;
  }
  function renderCanvas(enter) {
    const objs = canvasObjects();
    world.innerHTML = objs.map(objHTML).join('');
    world.style.width = WORLD.w + 'px';
    [...world.children].forEach((el, i) => {
      const o = objs[i], p = pos[o.id] || o;
      el.dataset.id = o.id;
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      el.style.zIndex = p.z || (i + 1);
      zTop = Math.max(zTop, p.z || 0, i + 1);
      if (enter && !reduced) {
        el.classList.add('enter');
        el.style.setProperty('--k', i);
        el.style.setProperty('--r0', ((seeded(o.id)() - .5) * 16).toFixed(1) + 'deg');
        el.addEventListener('animationend', () => el.classList.remove('enter'), { once: true });
      }
    });
    $$('canvas[data-thread]', world).forEach(c => drawThread(c, fullText(bySlug(c.dataset.thread)), { color: '#2A2620', seed: c.dataset.thread, weight: 1.3, pad: 12, animate: enter, frames: 110 }));
    if (threadsOn) buildThreads(enter);
  }
  function applyCam() { world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.s})`; }
  function canvasClamp() {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    cam.x = clamp(cam.x, vw - WORLD.w * cam.s - 120, 120);
    cam.y = clamp(cam.y, vh - WORLD.h * cam.s - 120, 120);
    applyCam();
  }
  let fitted = false;
  function canvasFit(force) {
    if (fitted && !force) return;
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    if (!vw) return;
    fitted = true;
    const saved = TATA ? null : store.get('cam', null);
    if (saved && !force) { Object.assign(cam, saved); canvasClamp(); return; }
    cam.s = clamp(Math.min(vh / 620, vw / 900), 0.6, 1);
    cam.x = vw / 2 - 1150 * cam.s;
    cam.y = vh / 2 - 520 * cam.s;
    canvasClamp();
  }
  const saveCam = () => { if (!TATA) store.set('cam', { x: Math.round(cam.x), y: Math.round(cam.y), s: +cam.s.toFixed(3) }); };
  function animateCam(to, ms = 520) {
    const from = { ...cam }, t0 = performance.now();
    cancelAnimationFrame(animateCam.raf);
    const ease = t => 1 - Math.pow(1 - t, 4);
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e; cam.s = from.s + (to.s - from.s) * e;
      canvasClamp();
      if (t < 1) animateCam.raf = requestAnimationFrame(step); else saveCam();
    };
    animateCam.raf = requestAnimationFrame(step);
  }

  // geser latar (berinersia), pindahkan objek (miring mengikuti kecepatan), cubit untuk zoom
  const pointers = new Map();
  let act = null, pinch = null, inertia = 0;
  const hideHint = () => $('#canvasHint').classList.add('gone');
  viewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.edit, .x')) return;
    cancelAnimationFrame(inertia); cancelAnimationFrame(animateCam.raf);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s, x: cam.x, y: cam.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      if (act?.obj) { act.obj.classList.remove('dragging'); act.obj.style.rotate = ''; }
      act = null; return;
    }
    const obj = e.target.closest('.obj');
    const t = performance.now();
    if (obj) act = { obj, sx: e.clientX, sy: e.clientY, ox: parseFloat(obj.style.left), oy: parseFloat(obj.style.top), moved: false, target: e.target, lx: e.clientX, lt: t, vx: 0 };
    else { act = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, samples: [[e.clientX, e.clientY, t]] }; viewport.classList.add('panning'); }
  });
  viewport.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoomAt(pinch.mx, pinch.my, clamp(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 0.45, 1.6), pinch);
      return;
    }
    if (!act) return;
    const dx = e.clientX - act.sx, dy = e.clientY - act.sy, t = performance.now();
    if (act.pan) {
      cam.x = act.cx + dx; cam.y = act.cy + dy; canvasClamp(); hideHint();
      act.samples.push([e.clientX, e.clientY, t]); if (act.samples.length > 5) act.samples.shift();
      return;
    }
    if (!act.moved && Math.hypot(dx, dy) > 5) {
      act.moved = true; act.obj.classList.add('dragging');
      act.obj.style.zIndex = ++zTop; hideHint();
    }
    if (act.moved) {
      act.obj.style.left = Math.round(act.ox + dx / cam.s) + 'px';
      act.obj.style.top = Math.round(act.oy + dy / cam.s) + 'px';
      const v = (e.clientX - act.lx) / Math.max(8, t - act.lt);
      act.vx = act.vx * .7 + v * .3; act.lx = e.clientX; act.lt = t;
      act.obj.style.rotate = clamp(act.vx * 9, -9, 9).toFixed(2) + 'deg';
      if (threadsOn) updateThreads();
    }
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    viewport.classList.remove('panning');
    if (!act) { saveCam(); return; }
    const a = act; act = null;
    if (a.pan) {
      const s = a.samples, f = s[0], l = s[s.length - 1], dt = Math.max(1, l[2] - f[2]);
      let vx = (l[0] - f[0]) / dt * 16, vy = (l[1] - f[1]) / dt * 16;
      if (reduced || performance.now() - l[2] > 80) { saveCam(); return; }
      const glide = () => {
        vx *= .93; vy *= .93; cam.x += vx; cam.y += vy; canvasClamp();
        if (Math.hypot(vx, vy) > .3) inertia = requestAnimationFrame(glide); else saveCam();
      };
      inertia = requestAnimationFrame(glide);
      return;
    }
    a.obj.classList.remove('dragging');
    a.obj.style.rotate = '';
    if (threadsOn) requestAnimationFrame(updateThreads);
    if (a.moved) {
      a.obj.classList.add('settle');
      setTimeout(() => a.obj.classList.remove('settle'), 600);
      pos[a.obj.dataset.id] = { x: parseFloat(a.obj.style.left), y: parseFloat(a.obj.style.top), z: +a.obj.style.zIndex };
      if (TATA) { tataDirty(true); return; }
      store.set('pos', pos); store.set('posSig', layoutSig);
      const st = stickies.find(s => s.id === a.obj.dataset.id);
      if (st) { st.x = pos[st.id].x; st.y = pos[st.id].y; store.set('stickies', stickies); }
    } else if (e.type === 'pointerup' && !TATA) activate(a.obj, a.target);
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  function zoomAt(px, py, s, base = cam) {
    const r = viewport.getBoundingClientRect();
    const wx = (px - r.left - base.x) / base.s, wy = (py - r.top - base.y) / base.s;
    cam.s = s; cam.x = px - r.left - wx * s; cam.y = py - r.top - wy * s;
    canvasClamp();
  }
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    cancelAnimationFrame(inertia);
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, clamp(cam.s * Math.exp(-e.deltaY * 0.01), 0.45, 1.6));
    else { cam.x -= e.shiftKey ? e.deltaY : e.deltaX; cam.y -= e.shiftKey ? 0 : e.deltaY; canvasClamp(); }
    hideHint();
    clearTimeout(viewport._t); viewport._t = setTimeout(saveCam, 300);
  }, { passive: false });
  viewport.addEventListener('dblclick', e => {
    if (e.target.closest('.obj')) return;
    const r = viewport.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const s = cam.s < 1.15 ? clamp(cam.s * 1.35, .45, 1.6) : clamp(Math.min(viewport.clientHeight / 620, viewport.clientWidth / 900), .6, 1);
    const wx = (px - cam.x) / cam.s, wy = (py - cam.y) / cam.s;
    animateCam({ s, x: px - wx * s, y: py - wy * s });
  });
  viewport.addEventListener('keydown', e => {
    if (e.target.closest('.edit')) return;
    const step = { ArrowLeft: [140, 0], ArrowRight: [-140, 0], ArrowUp: [0, 120], ArrowDown: [0, -120] }[e.key];
    if (step && e.target === viewport) { e.preventDefault(); animateCam({ s: cam.s, x: cam.x + step[0], y: cam.y + step[1] }, 320); }
    if (e.key === 'Enter' && e.target.classList.contains('obj') && !TATA) activate(e.target, e.target);
  });
  function activate(obj, target) {
    const open = (target && target.closest('[data-open]')) || obj;
    if (obj.dataset.shelf) { shelf = obj.dataset.shelf; renderList(true); go('daftar'); return; }
    if (open.dataset.open) openWork(open.dataset.open, open.classList.contains('peek') ? open : ($('.sheet', obj) || obj));
  }

  // catatan tempel pengunjung
  function addSticky() {
    if (TATA) return;
    if (view !== 'kanvas') go('kanvas');
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const s = { id: 'u:' + Date.now().toString(36), text: '', x: Math.round((vw / 2 - cam.x) / cam.s - 59), y: Math.round((vh / 2 - cam.y) / cam.s - 59) };
    stickies.push(s); store.set('stickies', stickies);
    renderCanvas(false);
    const el = $(`[data-sticky="${s.id}"]`);
    el.classList.add('enter'); el.style.setProperty('--k', 0); el.style.setProperty('--r0', '-8deg');
    $('.edit', el).focus();
  }
  $('#addNote').addEventListener('click', addSticky);
  world.addEventListener('input', e => {
    const el = e.target.closest('[data-sticky]');
    if (!el) return;
    const s = stickies.find(s => s.id === el.dataset.sticky);
    if (s) { s.text = e.target.textContent; store.set('stickies', stickies); }
  });
  world.addEventListener('focusout', e => {
    const el = e.target.closest('[data-sticky]');
    if (el && e.target.classList.contains('edit') && !e.target.textContent.trim()) removeSticky(el.dataset.sticky);
  });
  world.addEventListener('click', e => {
    const x = e.target.closest('.x');
    if (x) removeSticky(x.closest('[data-sticky]').dataset.sticky);
  });
  async function removeSticky(id) {
    const el = $(`[data-sticky="${id}"]`);
    if (el && !reduced) { el.classList.add('leave'); await wait(260); }
    stickies = stickies.filter(s => s.id !== id); store.set('stickies', stickies);
    delete pos[id]; store.set('pos', pos);
    renderCanvas(false);
  }

  /* ---------- mode tata letak (penulis) ---------- */
  let tataChanged = false;
  function tataDirty(v) { tataChanged = v; $('#tataSave').disabled = !v; $('#tataMsg').textContent = v ? 'Ada perubahan yang belum disimpan.' : 'Mode tata letak. Seret kertas, map, dan catatan, lalu simpan.'; }
  if (TATA) {
    win.classList.add('tata');
    $('#tataBar').hidden = false;
    tataDirty(false);
    if (!window.GH || !GH.cfg()) {
      $('#tataMsg').textContent = 'Masuk dulu di panel admin supaya tata letak bisa disimpan.';
      $('#tataSave').hidden = true;
      $('#tataExit').href = 'admin/';
      $('#tataExit').textContent = 'Ke panel admin';
    }
    $('#tataReset').addEventListener('click', () => {
      let x = 120;
      LAYOUT.forEach(o => {
        if (o.type === 'note') { o.x = x - 330 + 210; o.y = 370; return; }
        o.x = x; o.y = o.type === 'sticky' ? 560 : 400;
        x += o.type === 'img' ? 330 : 240;
      });
      pos = {}; renderCanvas(true); tataDirty(true);
    });
    $('#tataSave').addEventListener('click', async () => {
      const objects = LAYOUT.map(o => {
        const p = pos[o.id] || o;
        const { id, type, slug, cat, peek, text } = o;
        return Object.fromEntries(Object.entries({ id, type, slug, cat, peek, text, x: Math.round(p.x), y: Math.round(p.y) }).filter(([, v]) => v !== undefined));
      });
      $('#tataSave').disabled = true; $('#tataMsg').textContent = 'Menyimpan ke GitHub…';
      try {
        await GH.get('content/layout.json');
        await GH.putJSON('content/layout.json', { objects }, 'Atur tata letak kanvas');
        tataChanged = false;
        $('#tataMsg').textContent = 'Tersimpan. Situs diperbarui dalam ±1 menit.';
        toast('Tata letak tersimpan.');
      } catch (err) { $('#tataSave').disabled = false; $('#tataMsg').textContent = err.message; }
    });
    addEventListener('beforeunload', e => { if (tataChanged) { e.preventDefault(); e.returnValue = ''; } });
  }

  /* ======================================================================
     DAFTAR
     ====================================================================== */
  let shelf = 'semua';
  const firstOlderYear = WORKS.find(w => w.date.slice(0, 4) !== WORKS[0].date.slice(0, 4))?.date.slice(0, 4);
  const openYears = new Set(store.get('openYears', firstOlderYear ? [firstOlderYear] : []));
  const selected = new Set();
  let queue = [];

  const shelfItems = k => (k === 'semua' ? all() : all().filter(w => w.cat === k));
  function renderShelves() {
    const keys = ['semua', ...Object.keys(CATS).filter(k => all().some(w => w.cat === k))];
    const host = $('#shelves');
    host.innerHTML = keys.map((k, i) => {
      const items = shelfItems(k);
      return `<button class="shelf" type="button" data-shelf="${k}" aria-pressed="${k === shelf}" style="--k:${i}">
        <span class="n">${items.length}</span><span class="dots3" aria-hidden="true"></span>
        <h3>${k === 'semua' ? 'Semua tulisan' : esc(catOf(k).label)}</h3>
        <span class="d">${fmtLong(items[0].date)}</span>
        <span class="avas"></span></button>`;
    }).join('');
    $$('.shelf', host).forEach(b => {
      const items = shelfItems(b.dataset.shelf), av = $('.avas', b);
      items.slice(0, items.length > 4 ? 3 : 4).forEach(w => av.append(mini(w, 36)));
      if (items.length > 4) { const s = document.createElement('span'); s.textContent = '+' + (items.length - 3); av.append(s); }
    });
  }
  $('#shelves').addEventListener('click', e => {
    const b = e.target.closest('[data-shelf]');
    if (!b) return;
    shelf = b.dataset.shelf;
    $$('#shelves .shelf').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderRows(true);
  });

  const shortName = f => (f.length > 24 ? f.slice(0, 12) + '…' + f.slice(-10) : f);
  const kb = b => (b / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' KB';
  const docIcon = w => `<div class="doc" aria-hidden="true"><div class="pg"></div><span class="tag${catOf(w.cat).red ? ' red' : ''}">${esc(catOf(w.cat).tag)}</span></div>`;
  function rowHTML(w, child, k, extra = '') {
    return `<div class="row${child ? ' child' : ''}${selected.has(w.slug) ? ' sel' : ''}${extra}" data-slug="${w.slug}" style="--k:${k}">
      ${docIcon(w)}
      <div class="r-text">
        <p class="r-title">${esc(w.title)}${readSet.has(w.slug) ? '' : '<span class="r-unread" title="belum dibaca"></span>'}</p>
        <p class="r-sub">${esc(shortName(w.file))} ${kb(w.bytes)}</p>
        <p class="r-note" contenteditable="true" spellcheck="false" data-note="${w.slug}" aria-label="Catatan untuk ${esc(w.title)}">${esc(notes[w.slug] || '')}</p>
      </div>
      <p class="r-date">${fmtShort(w.date)} ${w.time || ''}</p>
    </div>`;
  }
  const cbHTML = (state, label, data, k, extra = '') => `<button class="cb${extra}" type="button" role="checkbox" aria-checked="${state}" aria-label="${esc(label)}" ${data} style="--k:${k}"></button>`;
  const cbState = items => { const n = items.filter(w => selected.has(w.slug)).length; return n === 0 ? 'false' : n === items.length ? 'true' : 'mixed'; };

  function renderRows(animate, justOpened) {
    const items = shelfItems(shelf);
    const topYear = WORKS[0].date.slice(0, 4);
    const top = items.filter(w => w.date.startsWith(topYear));
    const years = [...new Set(items.filter(w => !top.includes(w)).map(w => w.date.slice(0, 4)))].sort().reverse();
    let html = '', k = 0;
    if (top.length) {
      const ks = top.map(() => k++);
      html += `<div class="grp flat"><div class="grp-cbs">${top.map((w, i) => cbHTML(selected.has(w.slug), 'Pilih ' + w.title, `data-sel="${w.slug}"`, ks[i])).join('')}</div>
        <div class="grp-panel">${top.map((w, i) => rowHTML(w, false, ks[i])).join('')}</div></div>`;
    }
    years.forEach(y => {
      const ws = items.filter(w => !top.includes(w) && w.date.startsWith(y));
      const open = openYears.has(y);
      const k0 = k++;
      const ks = open ? ws.map(() => k++) : [];
      const fresh = justOpened === y ? ' row-in' : '';
      html += `<div class="grp${open ? ' open' : ''}${fresh ? ' opening' : ''}">
        <div class="grp-cbs">${cbHTML(cbState(ws), 'Pilih semua dari ' + y, `data-year-sel="${y}"`, k0)}${open ? ws.map((w, i) => cbHTML(selected.has(w.slug), 'Pilih ' + w.title, `data-sel="${w.slug}"`, i, fresh)).join('') : ''}</div>
        <div class="grp-panel">
          <div class="row folder-row" data-year="${y}" role="button" tabindex="0" aria-expanded="${open}" style="--k:${k0}">
            <div class="fold-ic" aria-hidden="true"><svg viewBox="0 0 62 52"><path class="bg" d="M14 4h12l4 4h22a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5z"/><path class="bg front" d="M7 12h12l4 4h29a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5z"/></svg></div>
            <div class="r-text"><p class="r-title">${y}</p><p class="r-sub">${ws.length} tulisan</p><p class="r-note" style="cursor:inherit">${esc((SITE.years || {})[y] || '')}</p></div>
            <p class="r-date">${fmtShort(ws[0].date)} ${ws[0].time || ''}</p>
          </div>
          ${open ? ws.map((w, i) => rowHTML(w, true, fresh ? i : ks[i], fresh)).join('') : ''}
        </div></div>`;
    });
    const host = $('#libRows');
    host.innerHTML = html || '<p class="lib-empty">Belum ada tulisan di rak ini.</p>';
    host.classList.remove('reveal'); void host.offsetWidth;
    if (animate && !reduced) host.classList.add('reveal');
    $('#cbAll').setAttribute('aria-checked', cbState(items));
    syncSelbar();
  }
  function renderList(animate) { renderShelves(); renderRows(animate); updateBadge(); }

  $('#libRows').addEventListener('click', e => {
    if (e.target.closest('.r-note[data-note]')) return;
    const cb = e.target.closest('.cb');
    if (cb) {
      if (cb.dataset.sel) { selected.has(cb.dataset.sel) ? selected.delete(cb.dataset.sel) : selected.add(cb.dataset.sel); }
      if (cb.dataset.yearSel) {
        const ws = shelfItems(shelf).filter(w => w.date.startsWith(cb.dataset.yearSel));
        const allOn = ws.every(w => selected.has(w.slug));
        ws.forEach(w => (allOn ? selected.delete(w.slug) : selected.add(w.slug)));
        openYears.add(cb.dataset.yearSel);
      }
      renderRows(false); return;
    }
    const fr = e.target.closest('.folder-row');
    if (fr) { toggleYear(fr.dataset.year); return; }
    const row = e.target.closest('.row[data-slug]');
    if (row) openWork(row.dataset.slug, $('.doc', row));
  });
  $('#libRows').addEventListener('keydown', e => {
    const fr = e.target.closest('.folder-row');
    if (fr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleYear(fr.dataset.year); }
    if (e.target.matches('.r-note') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  function toggleYear(y) {
    const opening = !openYears.has(y);
    opening ? openYears.add(y) : openYears.delete(y);
    store.set('openYears', [...openYears]);
    renderRows(false, opening ? y : null);
    $(`.folder-row[data-year="${y}"]`)?.focus({ preventScroll: true });
  }
  $('#libRows').addEventListener('input', e => {
    const n = e.target.closest('[data-note]');
    if (!n) return;
    const t = n.textContent.trim();
    if (t) notes[n.dataset.note] = t; else delete notes[n.dataset.note];
    store.set('notes', notes);
  });
  $('#cbAll').addEventListener('click', () => {
    const items = shelfItems(shelf);
    const allOn = items.every(w => selected.has(w.slug));
    items.forEach(w => (allOn ? selected.delete(w.slug) : selected.add(w.slug)));
    renderRows(false);
  });
  function syncSelbar() {
    $('#selbar').hidden = selected.size === 0;
    $('#selCount').textContent = selected.size + ' dipilih';
  }
  $('#selClear').addEventListener('click', () => { selected.clear(); renderRows(false); });
  $('#selRead').addEventListener('click', () => {
    queue = all().filter(w => selected.has(w.slug)).map(w => w.slug);
    if (queue.length) { toast(`Membaca ${queue.length} tulisan berurutan.`); openWork(queue[0]); }
  });
  function updateBadge() {
    const n = WORKS.filter(w => !readSet.has(w.slug)).length;
    const b = $('#unreadBadge');
    b.textContent = n; b.classList.toggle('zero', n === 0);
    renderGreet(false);
  }

  /* ======================================================================
     PANEL SAPA
     ====================================================================== */
  const dock = $('#dock');
  let statsMode = false;
  function renderGreet(animate) {
    const unread = WORKS.filter(w => !readSet.has(w.slug));
    const latest = WORKS[0];
    const month = fmt(latest.date, { month: 'long', year: 'numeric' });
    const sameMonth = WORKS.filter(w => w.date.slice(0, 7) === latest.date.slice(0, 7)).length;
    const total = WORKS.reduce((a, w) => a + w.words, 0);
    const kinds = [...new Set(WORKS.map(w => catOf(w.cat).label.toLowerCase()))];
    const g = $('#tkGreet');
    if (statsMode) {
      const long = WORKS.reduce((a, w) => (w.words > a.words ? w : a)), short = WORKS.reduce((a, w) => (w.words < a.words ? w : a));
      g.innerHTML = `<span class="dim">Totalnya</span> <span>${num(total)} kata</span> <span class="dim">dalam</span> <span>${WORKS.length} tulisan.</span> <span class="dim">Paling panjang</span>
        <button type="button" data-act="open" data-slug="${long.slug}">“${esc(long.title)}”</button> <span class="dim">(${long.words}), paling singkat</span>
        <button type="button" data-act="open" data-slug="${short.slug}">“${esc(short.title)}”</button><span class="dim"> (${short.words}).</span>`;
    } else {
      g.innerHTML = `<span class="dim">Selamat ${dayPart},</span> <span class="nw"><span class="ava-in" id="tkAva"></span> <span>${esc(SITE.readerName)}.</span></span>
        <span class="dim">Meja ini</span> <span class="nw"><i class="dot-o" aria-hidden="true"></i><button type="button" data-act="list">${WORKS.length} tulisan</button></span>
        <span class="dim">— dari</span> <span class="nw"><span class="ava-stack" id="tkStack"></span><span class="dim">${esc(kinds[0] || '')}</span></span> <span class="dim">${kinds.length > 1 ? 'sampai ' + esc(kinds[kinds.length - 1]) + '.' : '.'} Kamu punya</span>
        <span class="nw"><span class="ico-bubble" aria-hidden="true"></span><button type="button" data-act="unread">${unread.length ? unread.length + ' belum' : 'semua sudah'}</button></span> <button type="button" data-act="unread">dibaca</button>
        <span class="dim">dan</span> <span class="nw"><span class="ico-cal" aria-hidden="true"><b>${new Date(latest.date + 'T00:00:00').getDate()}</b></span><button type="button" data-act="open" data-slug="${latest.slug}">${sameMonth} terbit</button></span> <button type="button" data-act="open" data-slug="${latest.slug}">${esc(month)}.</button>`;
      avatarInto($('#tkAva'), 24);
      const st = $('#tkStack');
      [...new Set(WORKS.map(w => w.cat))].slice(0, 3).map(c => WORKS.find(w => w.cat === c)).forEach(w => st.append(mini(w, 22)));
    }
    [...g.children].forEach((el, i) => el.style.setProperty('--k', i));
    g.classList.remove('reveal'); void g.offsetWidth;
    if (animate && !reduced) g.classList.add('reveal');
    $('#tkMeta').innerHTML = `
      <span>diperbarui ${fmt(latest.date, { day: 'numeric', month: 'short' })}</span><i class="sep"></i>
      <span title="tulisan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18.5 11.5-6.4 6.4a4.2 4.2 0 0 1-6-6l7.1-7.1a2.8 2.8 0 0 1 4 4l-7 7a1.4 1.4 0 0 1-2-2l6.4-6.4"/></svg>${WORKS.length}</span><i class="sep"></i>
      <span title="jenis tulisan"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M3.5 9.5h17"/></svg>${kinds.length}</span><i class="sep"></i>
      <span title="kata"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>${num(total)} kata</span>`;
  }
  $('#tkGreet').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'list') { shelf = 'semua'; renderList(true); go('daftar'); }
    if (b.dataset.act === 'unread') { const u = WORKS.find(w => !readSet.has(w.slug)); if (u) openWork(u.slug); else go('daftar'); }
    if (b.dataset.act === 'open') openWork(b.dataset.slug);
  });
  $('#tkStats').addEventListener('click', e => { statsMode = !statsMode; e.currentTarget.setAttribute('aria-pressed', String(statsMode)); renderGreet(true); });
  $('#tkGear').addEventListener('click', () => { $('#chipDark').scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); $('#chipDark').focus({ preventScroll: true }); });
  $('#tkBack').addEventListener('click', () => go(isMobile() ? 'kanvas' : (view === 'kanvas' ? 'daftar' : 'kanvas')));

  const grip = $('#tkGrip');
  function setCollapsed(c) { dock.classList.toggle('collapsed', c); grip.setAttribute('aria-expanded', String(!c)); grip.setAttribute('aria-label', c ? 'Bentangkan kartu sapaan' : 'Ciutkan kartu sapaan'); }
  let gy = null;
  grip.addEventListener('pointerdown', e => { gy = e.clientY; grip.setPointerCapture(e.pointerId); });
  grip.addEventListener('pointerup', e => {
    if (gy == null) return;
    const dy = e.clientY - gy; gy = null;
    if (dy < -18) setCollapsed(true); else if (dy > 18) setCollapsed(false); else setCollapsed(!dock.classList.contains('collapsed'));
  });
  grip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!dock.classList.contains('collapsed')); } });

  const feed = $('#tkFeed');
  let feedMode = 'feed', feedIdx = Math.floor(Math.random() * WORKS.length), feedT;
  const noteOf = w => `Dari ${esc(catOf(w.cat).label.toLowerCase())} <button type="button" data-open="${w.slug}">“${esc(w.title)}”</button> <span class="spark"><canvas data-spark="${w.slug}"></canvas></span> ditulis ${fmtLong(w.date)}, ${w.words} kata, kira-kira ${w.minutes} menit membaca.`;
  async function renderFeed(rotate) {
    clearTimeout(feedT);
    feed.classList.toggle('plain', feedMode !== 'feed');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === feedMode)));
    $('.tk-seg').style.setProperty('--x', feedMode === 'list' ? '0' : '1');
    if (feedMode === 'list') {
      feed.innerHTML = `<ul class="tk-list">${all().map((w, i) => `<li style="--k:${i}"><a href="#baca-${w.slug}"><b>${esc(w.title)}</b><span class="${readSet.has(w.slug) ? 'ok' : ''}">${readSet.has(w.slug) ? '✓ dibaca' : w.minutes + ' mnt'}</span><span>${esc(catOf(w.cat).label)} · ${fmtShort(w.date)}</span></a></li>`).join('')}</ul>`;
      return;
    }
    if (feedMode !== 'feed') return;
    const old = $('.fd', feed);
    if (rotate && old && !reduced) { old.classList.add('out'); await wait(420); }
    if (feedMode !== 'feed') return;
    const w = WORKS[feedIdx % WORKS.length], prev = WORKS[(feedIdx + WORKS.length - 1) % WORKS.length];
    const para = plain(w.body[Math.min(1, w.body.length - 1)]);
    feed.innerHTML = `<div class="fd">
      <p class="fd-pre">${noteOf(prev).replace(/<[^>]+>/g, '')}</p>
      <p class="fd-quote">${esc(para.length > 260 ? para.slice(0, 260) + '…' : para).replace(/\n/g, '<br>')}</p>
      <p class="fd-note">${noteOf(w)}</p></div>`;
    $$('canvas[data-spark]', feed).forEach(c => requestAnimationFrame(() => drawThread(c, fullText(bySlug(c.dataset.spark)), { w: 26, h: 20, pad: 1, color: '#fff', seed: c.dataset.spark, pins: false, weight: 1.3 })));
    if (!reduced && SITE.features.rotatingQuotes) feedT = setTimeout(() => { if (!feed.matches(':hover') && !document.hidden) feedIdx++; renderFeed(true); }, 9000);
  }
  $('.tk-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) { feedMode = b.dataset.mode; renderFeed(false); }
  });
  feed.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) openWork(b.dataset.open);
    if (e.target.closest('[data-clear]')) { $('#tkInput').value = ''; feedMode = 'feed'; renderFeed(false); }
  });
  $('#chipRandom').addEventListener('click', () => openWork(WORKS[Math.floor(Math.random() * WORKS.length)].slug));
  $('#chipMail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SITE.email); toast(`Alamat ${SITE.email} disalin.`); }
    catch (e) { toast('Alamat surat: ' + SITE.email); }
  });
  $('#tkAsk').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#tkInput').value.trim();
    if (!q) { $('#tkInput').focus(); return; }
    const res = search(q);
    feedMode = 'search'; clearTimeout(feedT);
    feed.classList.add('plain');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    feed.innerHTML = `<p class="tk-res-h"><span>${res.length} hasil untuk “${esc(q)}”</span><button type="button" data-clear>hapus</button></p>
      <ul class="tk-list">${res.map((r, i) => `<li style="--k:${i}"><a href="#baca-${r.w.slug}"><b>${esc(r.w.title)}</b><span>${esc(catOf(r.w.cat).label)}</span><span style="grid-column:1/-1">${r.snip}</span></a></li>`).join('') || '<li style="color:var(--dock-muted);padding:10px 12px">Tidak ada kalimat yang cocok.</li>'}</ul>`;
  });

  /* ======================================================================
     PEMBACA
     ====================================================================== */
  const FONTS = [
    { id: 'newsreader', name: 'Newsreader', css: '"Newsreader", "Iowan Old Style", Georgia, serif' },
    { id: 'literata', name: 'Literata', css: '"Literata", Georgia, serif' },
    { id: 'georgia', name: 'Georgia', css: 'Georgia, "Times New Roman", serif' },
    { id: 'sistem', name: 'Sistem', css: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", system-ui, sans-serif' },
    { id: 'instrument', name: 'Instrument', css: '"Instrument Serif", Georgia, serif' },
    { id: 'geist', name: 'Geist', css: '"Geist", system-ui, sans-serif' }
  ];
  const WEIGHTS = [300, 400, 500, 600];
  const RT = ['putih', 'sepia', 'gelap', 'custom'];
  const rd = Object.assign({ rt: SITE.readerPaper, custom: '#F3E9DC', font: SITE.readerFont, size: 19, weight: 400, liga: true, align: 'start', bright: 100 }, store.get('rd', {}));
  let focusMode = false, current = null;
  const card = $('#rdCard'), body = $('#rdBody'), scroller = $('#rdScroll');
  const saveRd = () => store.set('rd', rd);

  $('#fonts').innerHTML = FONTS.map(f => `<button type="button" role="radio" data-font="${f.id}" aria-checked="false"><b style="font-family:${f.css}">Aa</b><small style="font-family:${f.css}">${f.name}</small></button>`).join('');
  $('#fontDots').innerHTML = Array.from({ length: Math.ceil(FONTS.length / 4) }, () => '<i></i>').join('');

  function lum(hex) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function applyRd() {
    card.dataset.rt = rd.rt;
    if (rd.rt === 'custom') {
      const dark = lum(rd.custom) < .3;
      card.style.setProperty('--rbg', rd.custom);
      card.style.setProperty('--rfg', dark ? '#F2F2F4' : '#1D1D1F');
      card.style.setProperty('--rmut', dark ? 'rgb(242 242 244 / .6)' : 'rgb(29 29 31 / .55)');
    } else ['--rbg', '--rfg', '--rmut'].forEach(p => card.style.removeProperty(p));
    const f = FONTS.find(x => x.id === rd.font) || FONTS[0];
    card.style.setProperty('--r-font', f.css);
    card.style.setProperty('--r-size', rd.size + 'px');
    card.style.setProperty('--r-weight', rd.weight);
    card.style.setProperty('--r-align', rd.align);
    card.style.setProperty('--r-liga', rd.liga ? 'normal' : 'none');
    $('#rdDim').style.opacity = ((100 - rd.bright) / 100 * 0.9).toFixed(2);
    $$('.theme-pill [data-rt]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.rt === rd.rt)));
    $('.theme-pill').style.setProperty('--i', Math.max(0, RT.indexOf(rd.rt)));
    $$('#fonts [data-font]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.font === rd.font)));
    $$('.aligns [data-align]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.align === rd.align)));
    $('#swLiga').setAttribute('aria-checked', String(rd.liga));
    $('#outSize').textContent = rd.size;
    $('#outWeight').textContent = rd.weight;
    const prev = $('#advPreview');
    prev.style.fontFamily = f.css; prev.style.fontWeight = rd.weight; prev.style.textAlign = rd.align;
    prev.style.fontVariantLigatures = rd.liga ? 'normal' : 'none';
    setSlider($('#vsSize'), rd.size, 15, 28);
    setSlider($('#vsBright'), rd.bright, 40, 100);
  }
  function setSlider(el, v, min, max) {
    $('.vs-fill', el).style.height = (8 + (v - min) / (max - min) * 92) + '%';
    el.setAttribute('aria-valuenow', v);
  }
  function makeSlider(el, min, max, key) {
    let on = false;
    const setFrom = y => {
      const r = el.getBoundingClientRect();
      rd[key] = Math.round(min + clamp((r.bottom - y) / r.height, 0, 1) * (max - min));
      applyRd(); saveRd();
    };
    el.addEventListener('pointerdown', e => { on = true; el.classList.add('active'); el.setPointerCapture(e.pointerId); setFrom(e.clientY); });
    el.addEventListener('pointermove', e => { if (on) setFrom(e.clientY); });
    el.addEventListener('pointerup', () => { on = false; el.classList.remove('active'); });
    el.addEventListener('keydown', e => {
      const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); rd[key] = clamp(rd[key] + d * (key === 'bright' ? 5 : 1), min, max); applyRd(); saveRd();
    });
  }
  makeSlider($('#vsSize'), 15, 28, 'size');
  makeSlider($('#vsBright'), 40, 100, 'bright');

  $('.theme-pill').addEventListener('click', e => {
    const b = e.target.closest('[data-rt]');
    if (!b) return;
    if (b.dataset.rt === 'custom') { $('#colorIn').value = rd.custom; $('#colorIn').click(); }
    rd.rt = b.dataset.rt; applyRd(); saveRd();
  });
  $('#colorIn').addEventListener('input', e => { rd.custom = e.target.value; rd.rt = 'custom'; applyRd(); saveRd(); });
  $('#advColors').addEventListener('click', () => { $('#colorIn').value = rd.custom; $('#colorIn').click(); });
  $('#fonts').addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (b) { rd.font = b.dataset.font; applyRd(); saveRd(); } });
  $('#fonts').addEventListener('scroll', () => {
    const f = $('#fonts');
    const page = Math.round(f.scrollLeft / Math.max(1, f.scrollWidth - f.clientWidth) * ($$('#fontDots i').length - 1));
    $$('#fontDots i').forEach((d, i) => d.classList.toggle('on', i === page));
  }, { passive: true });
  $$('#fontDots i')[0].classList.add('on');
  $('.adv-group').addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const d = +b.dataset.d;
    if (b.dataset.step === 'size') rd.size = clamp(rd.size + d, 15, 28);
    else rd.weight = WEIGHTS[clamp(WEIGHTS.indexOf(rd.weight) + d, 0, WEIGHTS.length - 1)];
    applyRd(); saveRd();
    const out = b.parentElement.querySelector('output');
    out.classList.remove('bump'); void out.offsetWidth; out.classList.add('bump');
  });
  $('#swLiga').addEventListener('click', () => { rd.liga = !rd.liga; applyRd(); saveRd(); });
  $('.aligns').addEventListener('click', e => { const b = e.target.closest('[data-align]'); if (b) { rd.align = b.dataset.align; applyRd(); saveRd(); } });
  function rsPage(adv) {
    const show = adv ? $('#rsAdv') : $('#rsMain'), hide = adv ? $('#rsMain') : $('#rsAdv');
    hide.hidden = true; show.hidden = false;
    show.classList.remove('push-in', 'pop-in'); void show.offsetWidth;
    if (!reduced) show.classList.add(adv ? 'push-in' : 'pop-in');
    $('#rs').scrollTop = 0;
    (adv ? $('#advBack') : $('#rsText')).focus({ preventScroll: true });
  }
  $('#rsText').addEventListener('click', () => rsPage(true));
  $('#advBack').addEventListener('click', () => rsPage(false));
  $('#rsFocus').addEventListener('click', () => { focusMode = !focusMode; $('#rsFocus').setAttribute('aria-pressed', String(focusMode)); body.classList.toggle('focus', focusMode); onScroll(); });

  const rs = $('#rs');
  function setSheet(open) { rs.classList.toggle('open', open); $('#aaFab').setAttribute('aria-expanded', String(open)); }
  $('#aaFab').addEventListener('click', () => setSheet(!rs.classList.contains('open')));
  $('#rsHandle').addEventListener('click', () => { if (isMobile()) setSheet(false); else rs.scrollTo({ top: 0, behavior: 'smooth' }); });

  function renderBody(q, reveal) {
    const w = current;
    const mark = t => {
      if (!q) return rich(t);
      const p = plain(t), lt = p.toLowerCase(), lq = q.toLowerCase();
      let out = '', i = 0, k;
      while ((k = lt.indexOf(lq, i)) >= 0) { out += esc(p.slice(i, k)) + '<mark>' + esc(p.slice(k, k + q.length)) + '</mark>'; i = k + q.length; }
      return out + esc(p.slice(i));
    };
    body.className = 'rd-body' + (focusMode ? ' focus' : '') + (reveal && !reduced ? ' reveal' : '');
    body.innerHTML = w.body.map((p, i) => `<p${w.form === 'puisi' ? ' class="stanza"' : ''} style="--k:${Math.min(i, 10)}">${mark(p)}</p>`).join('');
  }
  function rhythm(host, lens) {
    const n = lens.length, W = 600, H = 64;
    if (!n) { host.innerHTML = ''; return; }
    const max = Math.max(...lens), bw = W / n, bar = Math.max(2, Math.min(bw * .6, 18));
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${n} kalimat, terpanjang ${max} kata">${lens.map((l, i) => {
      const h = Math.max(3, l / max * (H - 4));
      return `<rect style="--k:${i}" x="${(i * bw + (bw - bar) / 2).toFixed(1)}" y="${((H - h) / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(bar / 2, 4)}" fill="currentColor" opacity="${(.35 + .65 * l / max).toFixed(2)}"><title>${l} kata</title></rect>`;
    }).join('')}</svg>`;
  }
  const navList = () => (queue.includes(current?.slug) ? queue.map(bySlug).filter(Boolean) : all());
  function neighbors() {
    const list = navList(), i = list.findIndex(w => w.slug === current.slug);
    return { prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] };
  }

  function showReader(slug) {
    const w = bySlug(slug);
    if (!w) return;
    stopSpeech(); closeFind(); stopReplay(false); hideQuotePop();
    current = w;
    setView('baca');
    $('#rdBackLabel').textContent = prevView === 'daftar' ? 'Daftar' : prevView === 'sapa' ? 'Sapa' : 'Kanvas';
    $('#rdCrumb').textContent = `${catOf(w.cat).label} · ${w.title}`;
    $('#rdMeta').innerHTML = `<span>${esc(catOf(w.cat).label)}</span><span>No. ${w.no}</span><span>${fmtLong(w.date)}</span><span>${num(w.words)} kata · ${w.minutes} menit</span>${w.draft ? '<span class="draft-tag">draf</span>' : ''}`;
    $('#rdTitle').textContent = w.title;
    renderBody('', true);
    rhythm($('#rdRhythm'), w.lens);
    const { prev, next } = neighbors();
    renderRelated(w);
    $('#rdNextLink').href = '#baca-' + next.slug;
    $('b', $('#rdNextLink')).textContent = next.title;
    $('#rdPrev').dataset.slug = prev.slug; $('#rdNext').dataset.slug = next.slug;
    $('#advPreview').textContent = plain(w.body[0]).replace(/\n/g, ' ');
    applyRd();
    scroller.scrollTop = 0;
    const marks = store.get('marks', {});
    $('#rsMark').setAttribute('aria-pressed', String(marks[slug] != null));
    requestAnimationFrame(() => {
      if (marks[slug] != null) {
        scroller.scrollTop = marks[slug] * (scroller.scrollHeight - scroller.clientHeight);
        toast('Melanjutkan dari posisi yang kamu tandai.');
      }
      onScroll();
    });
    if (!readSet.has(slug)) { readSet.add(slug); store.set('read', [...readSet]); }
    updateBadge(); renderRows(false); if (feedMode === 'list') renderFeed(false);
    renderSheet(); rerank();
    document.title = `${w.title} · ${SITE.title}`;
    if (!PREVIEW) scroller.focus({ preventScroll: true });
  }
  scroller.tabIndex = -1;
  function openWork(slug, fromEl) {
    if (TATA) return;
    if (fromEl) morphFrom = fromEl;
    if (location.hash === '#baca-' + slug) vt(() => showReader(slug)); else location.hash = 'baca-' + slug;
  }
  $('#rdBack').addEventListener('click', () => go(prevView === 'baca' ? 'kanvas' : prevView));
  $('#rdPrev').addEventListener('click', e => openWork(e.currentTarget.dataset.slug));
  $('#rdNext').addEventListener('click', e => openWork(e.currentTarget.dataset.slug));

  function onScroll() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const frac = max > 0 ? scroller.scrollTop / max : 1;
    $('#rdProg').style.transform = `scaleX(${frac})`;
    weave(frac);
    if (!focusMode) return;
    const r0 = scroller.getBoundingClientRect(), mid = r0.top + r0.height * .45;
    let best = null, bd = Infinity;
    [...body.children].forEach(p => { const r = p.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = p; } });
    [...body.children].forEach(p => p.classList.toggle('cur', p === best));
  }
  scroller.addEventListener('scroll', onScroll, { passive: true });

  $('#rsMark').addEventListener('click', () => {
    const marks = store.get('marks', {});
    if (marks[current.slug] != null) { delete marks[current.slug]; toast('Tanda dihapus.'); }
    else {
      const max = scroller.scrollHeight - scroller.clientHeight;
      marks[current.slug] = max > 0 ? +(scroller.scrollTop / max).toFixed(3) : 0;
      toast('Posisi baca ditandai. Lain kali kamu mulai dari sini.');
    }
    store.set('marks', marks);
    $('#rsMark').setAttribute('aria-pressed', String(marks[current.slug] != null));
  });

  let lock = null;
  async function releaseLock() { if (lock) { try { await lock.release(); } catch (e) { /* sudah lepas */ } lock = null; } $('#rsLock').setAttribute('aria-pressed', 'false'); }
  $('#rsLock').addEventListener('click', async () => {
    if (lock) { releaseLock(); toast('Layar boleh redup lagi.'); return; }
    try {
      lock = await navigator.wakeLock.request('screen');
      $('#rsLock').setAttribute('aria-pressed', 'true');
      toast('Layar tetap menyala selama kamu membaca.');
      lock.addEventListener('release', () => { lock = null; $('#rsLock').setAttribute('aria-pressed', 'false'); });
    } catch (e) { toast('Peramban ini tidak mengizinkan layar tetap menyala.'); }
  });

  let speaking = false;
  function stopSpeech() {
    speaking = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
    $('#rsVoice').setAttribute('aria-pressed', 'false');
  }
  $('#rsVoice').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { toast('Peramban ini belum bisa membacakan teks.'); return; }
    if (speaking) { stopSpeech(); return; }
    speaking = true;
    $('#rsVoice').setAttribute('aria-pressed', 'true');
    const paras = [...body.children];
    const voice = speechSynthesis.getVoices().find(v => /^id|indones/i.test(v.lang + v.name));
    const next = j => {
      $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
      if (!speaking || j >= paras.length) { stopSpeech(); return; }
      paras[j].classList.add('speaking');
      paras[j].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      const u = new SpeechSynthesisUtterance(paras[j].textContent);
      u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .95;
      u.onend = () => next(j + 1); u.onerror = () => stopSpeech();
      speechSynthesis.speak(u);
    };
    if (isMobile()) setSheet(false);
    next(0);
  });

  let hits = [], hit = 0;
  function openFind() { $('#rdFind').hidden = false; $('#findIn').focus(); if (isMobile()) setSheet(false); }
  function closeFind() { $('#rdFind').hidden = true; $('#findIn').value = ''; $('#findCount').textContent = ''; if (current) renderBody('', false); }
  function runFind() {
    const q = $('#findIn').value.trim();
    renderBody(q.length > 1 ? q : '', false);
    hits = $$('mark', body); hit = 0;
    $('#findCount').textContent = q.length > 1 ? (hits.length ? `1/${hits.length}` : 'tidak ada') : '';
    showHit();
  }
  function showHit() {
    hits.forEach((m, i) => m.classList.toggle('on', i === hit));
    if (hits[hit]) { hits[hit].scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); $('#findCount').textContent = `${hit + 1}/${hits.length}`; }
  }
  $('#rsSearch').addEventListener('click', openFind);
  $('#findIn').addEventListener('input', runFind);
  $('#findIn').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); hit = (hit + (e.shiftKey ? -1 : 1) + hits.length) % Math.max(1, hits.length); showHit(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeFind(); }
  });
  $('#findNext').addEventListener('click', () => { if (hits.length) { hit = (hit + 1) % hits.length; showHit(); } });
  $('#findPrev').addEventListener('click', () => { if (hits.length) { hit = (hit - 1 + hits.length) % hits.length; showHit(); } });
  $('#findClose').addEventListener('click', closeFind);

  /* ======================================================================
     PALET PENCARIAN
     ====================================================================== */
  function search(q) {
    const nq = fold(q.trim());
    if (!nq) return all().map(w => ({ w, snip: esc(w.excerpt) }));
    const out = [];
    all().forEach(w => {
      let score = 0, snip = '';
      if (fold(w.title).includes(nq)) score += 5;
      if (fold(catOf(w.cat).label).includes(nq)) score += 2;
      const text = fullText(w).replace(/\s+/g, ' '), ft = fold(text), idx = ft.indexOf(nq);
      if (idx >= 0) {
        score += 2 + Math.min(3, ft.split(nq).length - 2);
        const a = Math.max(0, idx - 32), b = Math.min(text.length, idx + nq.length + 56);
        snip = (a ? '…' : '') + esc(text.slice(a, idx)) + '<mark>' + esc(text.slice(idx, idx + nq.length)) + '</mark>' + esc(text.slice(idx + nq.length, b)) + (b < text.length ? '…' : '');
      }
      if (score) out.push({ w, score, snip: snip || esc(w.excerpt) });
    });
    return out.sort((a, b) => b.score - a.score);
  }
  const palette = $('#palette'), pInput = $('#pInput'), pResults = $('#pResults');
  let pSel = 0, pItems = [];
  const commands = () => [
    { label: threadsOn ? 'Sembunyikan benang merah' : 'Tampilkan benang merah', hint: 'hubungan antar-tulisan', run: () => { if (view !== 'kanvas') go('kanvas'); setThreads(!threadsOn); }, show: !!SITE.features.connections },
    { label: 'Saksikan tulisan ini ditulis', hint: current?.title, run: startReplay, show: view === 'baca' && !!SITE.features.replay },
    { label: isDark() ? 'Pakai mode terang' : 'Pakai mode gelap', hint: 'tema', run: () => setTheme(!isDark()) },
    { label: 'Buka tulisan acak', hint: 'kejutan', run: () => openWork(WORKS[Math.floor(Math.random() * WORKS.length)].slug) },
    { label: 'Ke kanvas', hint: 'tampilan', run: () => go('kanvas') },
    { label: 'Ke daftar', hint: 'tampilan', run: () => go('daftar') },
    { label: 'Ganti latar', hint: 'wallpaper', run: () => $('#chipBackdrop').click() },
    { label: 'Pasang aplikasi', hint: 'layar utama', run: install, show: !$('#installBtn').hidden }
  ].filter(c => c.show !== false);
  function renderPalette() {
    const raw = pInput.value.trim();
    const cmdMode = raw.startsWith('>');
    const q = fold(cmdMode ? raw.slice(1).trim() : raw);
    const cmds = commands().filter(c => !q || fold(c.label).includes(q)).map(c => ({ cmd: c }));
    pItems = cmdMode ? cmds : [...(q ? cmds.slice(0, 2) : []), ...search(raw)];
    pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
    pResults.innerHTML = pItems.length
      ? pItems.map((r, i) => r.cmd
        ? `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-cmd="${i}" class="p-cmd" style="--k:${Math.min(i, 8)}"><span class="p-kbd" aria-hidden="true">›</span><span class="p-title">${esc(r.cmd.label)}</span><span class="p-snip">${esc(r.cmd.hint || 'perintah')}</span></li>`
        : `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-slug="${r.w.slug}" style="--k:${Math.min(i, 8)}">${docIcon(r.w)}<span class="p-title">${esc(r.w.title)}</span><span class="p-snip">${r.snip}</span></li>`).join('')
      : '<li class="p-empty">Tidak ada yang cocok. Coba kata lain, atau ketik > untuk melihat perintah.</li>';
    pInput.setAttribute('aria-activedescendant', pItems.length ? 'po-' + pSel : '');
  }
  function openPalette() { palette.hidden = false; pInput.value = ''; pSel = 0; renderPalette(); pInput.focus(); }
  const closePalette = () => { palette.hidden = true; };
  $('#openPalette').addEventListener('click', openPalette);
  pInput.addEventListener('input', () => { pSel = 0; renderPalette(); });
  pInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      pSel = clamp(pSel + (e.key === 'ArrowDown' ? 1 : -1), 0, pItems.length - 1);
      $$('#pResults [role="option"]').forEach((li, i) => li.setAttribute('aria-selected', String(i === pSel)));
      pInput.setAttribute('aria-activedescendant', 'po-' + pSel);
      $('#po-' + pSel)?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && pItems[pSel]) { const it = pItems[pSel]; closePalette(); it.cmd ? it.cmd.run() : openWork(it.w.slug); }
  });
  pResults.addEventListener('click', e => {
    const li = e.target.closest('[data-slug], [data-cmd]'); if (!li) return;
    closePalette();
    if (li.dataset.cmd) pItems[+li.dataset.cmd].cmd.run(); else openWork(li.dataset.slug);
  });
  palette.addEventListener('click', e => { if (e.target === palette) closePalette(); });

  /* ======================================================================
     KEYBOARD & RUTE
     ====================================================================== */
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') {
      if (!palette.hidden) return closePalette();
      if (!$('#quoteModal').hidden) return closeQuote();
      if (RP.token) return stopReplay(true);
      if (!$('#rdFind').hidden) return closeFind();
      if (rs.classList.contains('open')) return setSheet(false);
      if (!$('#rsAdv').hidden && view === 'baca') return rsPage(false);
      if (view === 'baca') return $('#rdBack').click();
    }
    if (typing) return;
    if (e.key === '/' && palette.hidden) { e.preventDefault(); openPalette(); return; }
    if (view === 'baca' && palette.hidden) {
      if (e.key === 'ArrowRight') openWork($('#rdNext').dataset.slug);
      if (e.key === 'ArrowLeft') openWork($('#rdPrev').dataset.slug);
      if (e.key.toLowerCase() === 'f') $('#rsFocus').click();
    }
  });

  const startView = () => (VIEWS.includes(SITE.defaultView) && !(SITE.defaultView === 'sapa' && !isMobile()) ? SITE.defaultView : 'putar');
  function route() {
    vt(() => {
      const h = decodeURIComponent(location.hash.slice(1));
      const m = h.match(/^baca-([\w-]+)$/);
      if (m && bySlug(m[1]) && !TATA) { showReader(m[1]); return; }
      if (VIEWS.includes(h)) { setView(TATA ? 'kanvas' : h); return; }
      setView(TATA ? 'kanvas' : startView());
    });
  }
  addEventListener('hashchange', route);
  mobileMQ.addEventListener?.('change', () => { if (view === 'sapa' && !isMobile()) setView('kanvas'); syncPill(); });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { canvasClamp(); syncPill(); if (current && view === 'baca') rhythm($('#rdRhythm'), current.lens); }, 150); });

  /* ======================================================================
     BENANG MERAH: tulisan yang berbagi kata khas dihubungkan benang
     ====================================================================== */
  const LINK_STOP = new Set(('yang dan di ke dari itu ini aku kamu ia dia kita kami mereka dengan untuk pada ada tidak tapi tetapi juga akan sudah saja karena seperti adalah sebagai atau dalam bahwa lalu kalau jika apa satu setiap lebih sangat hanya masih bisa harus pun oleh kepada para si sang begitu sampai belum telah sedang agar supaya maka namun mau ingin lagi sebuah seorang pak bu yah iya ya tak kan hal demi tanpa sejak antara setelah sebelum selalu pernah mungkin kupikir sebenarnya terlalu semua dua tiga entah kenapa sesuatu bukan tetap paling membuat menjadi punya tahu hari kali orang biasa banyak balik jadi benar awal awalnya mana daripada pertama kedua sama tentang masuk datang tahun ketika sering memang akhirnya sedikit besar kecil baru lama dulu sekarang nanti cukup sambil hingga bahkan justru kembali dapat sana sini situ apakah bagaimana berapa siapa juga suatu terasa terus kemudian rasa sendiri saat waktu lain').split(' '));
  const LINKS = (() => {
    const docs = WORKS.map(w => {
      const tf = {};
      (fold(fullText(w) + ' ' + w.title).match(/[a-z]+/g) || []).filter(t => t.length > 3 && !LINK_STOP.has(t)).forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      return { w, tf };
    });
    const df = {};
    docs.forEach(d => Object.keys(d.tf).forEach(t => { df[t] = (df[t] || 0) + 1; }));
    const N = docs.length;
    docs.forEach(d => {
      d.v = {}; let n = 0;
      for (const [t, c] of Object.entries(d.tf)) { if (df[t] < 2 || df[t] > N * .6) continue; d.v[t] = (1 + Math.log(c)) * Math.log((N + 1) / (df[t] + .5)); n += d.v[t] ** 2; }
      d.n = Math.sqrt(n) || 1;
    });
    const pairs = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = docs[i], b = docs[j], shared = [];
      let dot = 0;
      for (const t in a.v) if (b.v[t]) { dot += a.v[t] * b.v[t]; shared.push([t, a.v[t] * b.v[t]]); }
      const sim = dot / (a.n * b.n);
      if (sim > .1) pairs.push({ a: a.w.slug, b: b.w.slug, sim, words: shared.sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]) });
    }
    // tiap tulisan menyimpan dua tetangga terdekatnya
    const keep = new Set();
    WORKS.forEach(w => pairs.filter(p => p.a === w.slug || p.b === w.slug).sort((x, y) => y.sim - x.sim).slice(0, 2).forEach(p => keep.add(p)));
    return [...keep];
  })();
  const linksOf = slug => LINKS.filter(l => l.a === slug || l.b === slug).sort((x, y) => y.sim - x.sim);

  let threadsOn = !!SITE.features.connections && store.get('threads', false);
  let threadEdges = [];
  function anchorOf(slug) {
    const w = bySlug(slug);
    return $(`.obj.paper[data-open="${slug}"]`, world) || $(`.obj.imgcard[data-open="${slug}"]`, world) ||
      $(`.obj.sticky[data-open="${slug}"]`, world) || $(`.obj.folder[data-shelf="${w?.cat}"]`, world) ||
      $(`.peek[data-open="${slug}"]`, world)?.closest('.obj');
  }
  const pinOf = el => [parseFloat(el.style.left) + el.offsetWidth / 2, parseFloat(el.style.top) + 14];
  function curve(p, q) {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, sag = Math.min(170, Math.hypot(q[0] - p[0], q[1] - p[1]) * .2);
    const c = [mx, my + sag];
    return { d: `M${p[0].toFixed(1)} ${p[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`, mid: [.25 * p[0] + .5 * c[0] + .25 * q[0], .25 * p[1] + .5 * c[1] + .25 * q[1]] };
  }
  function buildThreads(animate) {
    $$('.threads, .thread-tag, .thread-pin', world).forEach(n => n.remove());
    threadEdges = [];
    if (!threadsOn) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'threads');
    svg.setAttribute('width', WORLD.w); svg.setAttribute('height', WORLD.h);
    svg.setAttribute('aria-hidden', 'true');
    const pinned = new Set();
    LINKS.forEach((l, i) => {
      const A = anchorOf(l.a), B = anchorOf(l.b);
      if (!A || !B || A === B) return;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--k', i);
      if (animate && !reduced) path.classList.add('draw');
      svg.append(path);
      const tag = document.createElement('span');
      tag.className = 'thread-tag'; tag.textContent = l.words.join(' · ');
      tag.style.setProperty('--k', i);
      world.append(tag);
      threadEdges.push({ l, A, B, path, tag });
      pinned.add(A); pinned.add(B);
    });
    world.append(svg);
    pinned.forEach(el => { const p = document.createElement('i'); p.className = 'thread-pin'; p._for = el; world.append(p); });
    updateThreads();
  }
  function updateThreads() {
    threadEdges.forEach(e => {
      const { d, mid } = curve(pinOf(e.A), pinOf(e.B));
      e.path.setAttribute('d', d);
      e.tag.style.left = mid[0] + 'px'; e.tag.style.top = mid[1] + 'px';
    });
    $$('.thread-pin', world).forEach(p => { const [x, y] = pinOf(p._for); p.style.left = x + 'px'; p.style.top = y + 'px'; });
  }
  function setThreads(on) {
    threadsOn = on && !!SITE.features.connections;
    store.set('threads', threadsOn);
    $('#threadToggle').setAttribute('aria-pressed', String(threadsOn));
    win.classList.toggle('threads-on', threadsOn);
    buildThreads(true);
    if (threadsOn) toast(`${threadEdges.length} benang merah: tulisan yang berbagi kata khas saling terhubung.`);
  }
  $('#threadToggle').addEventListener('click', () => { if (view !== 'kanvas') go('kanvas'); setThreads(!threadsOn); });
  if (!SITE.features.connections) $('#threadToggle').hidden = true;
  $('#threadToggle').setAttribute('aria-pressed', String(threadsOn));
  win.classList.toggle('threads-on', threadsOn);
  // sorot benang milik objek yang disentuh kursor
  world.addEventListener('pointerover', e => {
    if (!threadsOn) return;
    const obj = e.target.closest('.obj');
    threadEdges.forEach(t => { const hot = obj && (t.A === obj || t.B === obj); t.path.classList.toggle('hot', hot); t.tag.classList.toggle('hot', hot); });
    world.classList.toggle('thread-focus', !!obj && threadEdges.some(t => t.A === obj || t.B === obj));
  });
  world.addEventListener('pointerleave', () => world.classList.remove('thread-focus'));

  function renderRelated(w) {
    const host = $('#rdRelated');
    const links = SITE.features.connections ? linksOf(w.slug).slice(0, 3) : [];
    host.hidden = !links.length;
    host.innerHTML = links.length ? `<p class="rd-end-label">benang merah</p>` + links.map(l => {
      const o = bySlug(l.a === w.slug ? l.b : l.a);
      return `<a class="rel" href="#baca-${o.slug}"><svg class="rel-thread" viewBox="0 0 34 18" aria-hidden="true"><path d="M4 13Q15 19 30 4"/><circle cx="4" cy="13" r="3"/><circle cx="30" cy="4" r="3"/></svg><span class="rel-t"><b>${esc(o.title)}</b><small>terhubung lewat ${l.words.map(x => `<i>${esc(x)}</i>`).join(' dan ')}</small></span></a>`;
    }).join('') : '';
  }

  /* ---------- lampu meja & kertas yang miring 3D ---------- */
  if (matchMedia('(pointer: fine)').matches && !reduced) {
    viewport.addEventListener('pointermove', e => {
      const r = viewport.getBoundingClientRect();
      viewport.style.setProperty('--lx', (e.clientX - r.left) + 'px');
      viewport.style.setProperty('--ly', (e.clientY - r.top) + 'px');
      if (act) return;
      const obj = e.target.closest('.obj');
      if (obj !== viewport._tilt) { if (viewport._tilt) viewport._tilt.style.removeProperty('--rx'), viewport._tilt.style.removeProperty('--ry'); viewport._tilt = obj; }
      if (!obj) return;
      const b = obj.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      obj.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
      obj.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    viewport.addEventListener('pointerleave', () => { if (viewport._tilt) { viewport._tilt.style.removeProperty('--rx'); viewport._tilt.style.removeProperty('--ry'); viewport._tilt = null; } });
  }

  /* ======================================================================
     MEMBACA = MERAJUT: benang tulisan terajut seiring kamu membaca
     ====================================================================== */
  let weaveRaf = 0, weaveDone = false;
  function weave(frac) {
    if (!current) return;
    cancelAnimationFrame(weaveRaf);
    weaveRaf = requestAnimationFrame(() => {
      const c = $('#weaveCanvas');
      drawThread(c, fullText(current), { color: catOf(current.cat).ink, seed: current.slug, pad: 4, frac, weight: 1.15 });
      const pct = Math.round(frac * 100);
      $('#weavePct').textContent = pct >= 100 ? 'terajut' : pct + '%';
      const done = pct >= 99;
      if (done && !weaveDone && scroller.scrollHeight > scroller.clientHeight + 40) { $('#weave').classList.remove('done'); void $('#weave').offsetWidth; $('#weave').classList.add('done'); }
      weaveDone = done;
    });
  }

  /* ======================================================================
     SAKSIKAN DITULIS: tulisan diketik ulang, lengkap dengan ragu dan revisi
     ====================================================================== */
  const RP = { token: null, paused: false, speed: 1 };
  const SPEEDS = [1, 2, 4];
  const sleep = async (ms, tok) => {
    let left = ms;
    while (left > 0) {
      if (RP.token !== tok) throw new Error('berhenti');
      const step = Math.min(left, 40);
      await wait(step);
      if (!RP.paused) left -= step * RP.speed;
    }
  };
  function stopReplay(finish) {
    if (!RP.token) return;
    RP.token = null; RP.paused = false;
    $('#replayBar').hidden = true;
    $('#rdReplay').setAttribute('aria-pressed', 'false');
    body.classList.remove('replaying');
    if (finish !== false && current) renderBody('', false);
  }
  async function startReplay() {
    if (!current) return;
    if (RP.token) { stopReplay(); return; }
    stopSpeech(); closeFind(); hideQuotePop();
    const w = current, tok = {};
    RP.token = tok; RP.paused = false;
    $('#rpPause').textContent = 'Jeda'; $('#rpSpeed').textContent = RP.speed + '×';
    $('#replayBar').hidden = false;
    $('#rdReplay').setAttribute('aria-pressed', 'true');
    body.className = 'rd-body replaying';
    body.innerHTML = w.body.map(() => `<p${w.form === 'puisi' ? ' class="stanza"' : ''}></p>`).join('');
    scroller.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const rnd = seeded(w.slug + '/ketik');
    const follow = el => {
      const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      if (r.bottom > s.bottom - 140) scroller.scrollTop += r.bottom - (s.bottom - 140);
    };
    try {
      for (let i = 0; i < w.body.length; i++) {
        const el = body.children[i], text = plain(w.body[i]);
        el.classList.add('typing');
        let out = '', typos = 1;
        const put = async (ch, ms) => { out += ch; el.textContent = out; follow(el); await sleep(ms, tok); };
        for (const tk of text.split(/(\s+)/)) {
          // sesekali salah ketik, lalu dihapus dan diperbaiki
          if (typos && tk.length > 5 && /^[a-z]/i.test(tk) && rnd() < .06) {
            typos--;
            const k = 1 + Math.floor(rnd() * (tk.length - 3));
            const wrong = tk.slice(0, k) + tk[k + 1] + tk[k] + tk.slice(k + 2, k + 3);
            for (const ch of wrong) await put(ch, 45 + rnd() * 40);
            await sleep(380, tok);
            for (let d = 0; d < wrong.length; d++) { out = out.slice(0, -1); el.textContent = out; await sleep(55, tok); }
            await sleep(160, tok);
          }
          for (const ch of tk) {
            const pause = /[.!?…]/.test(ch) ? 360 : /[,;:—]/.test(ch) ? 170 : ch === '\n' ? 260 : 0;
            await put(ch, 22 + rnd() * 34 + pause);
          }
        }
        el.classList.remove('typing');
        el.innerHTML = rich(w.body[i]);
        await sleep(520, tok);
      }
      RP.token = null;
      $('#replayBar').hidden = true;
      $('#rdReplay').setAttribute('aria-pressed', 'false');
      body.classList.remove('replaying');
      toast('Selesai ditulis.');
    } catch (e) { /* dihentikan */ }
  }
  $('#rdReplay').addEventListener('click', startReplay);
  $('#rpPause').addEventListener('click', () => { RP.paused = !RP.paused; $('#rpPause').textContent = RP.paused ? 'Lanjut' : 'Jeda'; $('#replayBar').classList.toggle('paused', RP.paused); });
  $('#rpSpeed').addEventListener('click', () => { RP.speed = SPEEDS[(SPEEDS.indexOf(RP.speed) + 1) % SPEEDS.length]; $('#rpSpeed').textContent = RP.speed + '×'; });
  $('#rpSkip').addEventListener('click', () => stopReplay(true));
  if (!SITE.features.replay) $('#rdReplay').hidden = true;

  /* ======================================================================
     KARTU KUTIPAN & BERBAGI
     ====================================================================== */
  const qpop = $('#quotePop');
  let qText = '';
  function hideQuotePop() { qpop.hidden = true; }
  function checkSelection() {
    const sel = getSelection();
    const t = sel && sel.toString().trim().replace(/\s+/g, ' ');
    if (!t || t.length < 8 || t.length > 360 || !body.contains(sel.anchorNode) || RP.token) { hideQuotePop(); return; }
    qText = t;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    qpop.style.left = clamp(r.left + r.width / 2, 110, innerWidth - 110) + 'px';
    qpop.style.top = clamp(r.top, 70, innerHeight - 20) + 'px';
    qpop.hidden = false;
  }
  body.addEventListener('mouseup', () => setTimeout(checkSelection, 10));
  body.addEventListener('keyup', checkSelection);
  document.addEventListener('selectionchange', () => { if (view === 'baca' && matchMedia('(pointer: coarse)').matches) checkSelection(); });
  scroller.addEventListener('scroll', hideQuotePop, { passive: true });
  qpop.addEventListener('mousedown', e => e.preventDefault());
  qpop.addEventListener('click', () => { hideQuotePop(); openQuote(qText); });

  const QSW = [
    { id: 'kertas', bg: '#FAF8F4', fg: '#1D1D1F', sub: '#7A7670' },
    { id: 'aksen', bg: () => SITE.accent || '#1662FF', fg: '#FFFFFF', sub: 'rgba(255,255,255,.7)' },
    { id: 'malam', bg: '#111214', fg: '#F2F2F4', sub: '#8E8E93' },
    { id: 'pastel', bg: '#F3E1EA', fg: '#2A1E24', sub: '#8A6E7B' }
  ];
  let qsw = 'kertas';
  const val = v => (typeof v === 'function' ? v() : v);
  function wrapLines(ctx, text, maxW) {
    const out = []; let line = '';
    text.split(' ').forEach(word => { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; });
    if (line) out.push(line);
    return out;
  }
  function paintQuote() {
    const c = $('#quoteCanvas'), ctx = c.getContext('2d'), W = c.width, H = c.height, w = current, sw = QSW.find(x => x.id === qsw);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = val(sw.bg); ctx.fillRect(0, 0, W, H);
    // benang tulisannya sebagai tanda air
    const tmp = document.createElement('canvas');
    drawThread(tmp, fullText(w), { w: 620, h: 620, pad: 10, color: qsw === 'kertas' || qsw === 'pastel' ? catOf(w.cat).ink : '#FFFFFF', seed: w.slug, weight: .9 });
    ctx.globalAlpha = .55; ctx.drawImage(tmp, W - 520, -120, 620, 620); ctx.globalAlpha = 1;
    ctx.fillStyle = sw.fg;
    ctx.font = 'italic 200px "Instrument Serif", Georgia, serif';
    ctx.fillText('“', 84, 470);
    let size = 76, lines;
    do { ctx.font = `400 ${size}px Newsreader, Georgia, serif`; lines = wrapLines(ctx, qText, W - 180); size -= 4; } while (lines.length * size * 1.3 > 600 && size > 38);
    size += 4;
    let y = 560;
    lines.forEach(l => { ctx.fillText(l, 90, y); y += size * 1.3; });
    ctx.fillStyle = sw.sub;
    ctx.font = '500 30px Geist, system-ui, sans-serif';
    ctx.fillText(`— ${SITE.author}, “${w.title}”`, 90, Math.min(H - 170, y + 36));
    ctx.font = '600 26px Geist, system-ui, sans-serif';
    ctx.fillText(SITE.handle, 90, H - 84);
    ctx.textAlign = 'right'; ctx.fillText(location.host || '', W - 90, H - 84); ctx.textAlign = 'left';
  }
  function openQuote(text) {
    qText = text;
    $('#quoteSw').innerHTML = QSW.map(s => `<button type="button" role="radio" data-sw="${s.id}" aria-label="${s.id}" aria-checked="${s.id === qsw}" style="--sw:${val(s.bg)}"></button>`).join('');
    $('#quoteModal').hidden = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(paintQuote);
    $('#quoteShare').focus();
  }
  const closeQuote = () => { $('#quoteModal').hidden = true; };
  $('#quoteSw').addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (!b) return; qsw = b.dataset.sw; $$('#quoteSw button').forEach(x => x.setAttribute('aria-checked', String(x === b))); paintQuote(); });
  $('#quoteClose').addEventListener('click', closeQuote);
  $('#quoteModal').addEventListener('click', e => { if (e.target.id === 'quoteModal') closeQuote(); });
  const quoteBlob = () => new Promise(r => $('#quoteCanvas').toBlob(r, 'image/png'));
  async function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $('#quoteSave').addEventListener('click', async () => { const b = await quoteBlob(); if (b) { saveBlob(b, `kutipan-${current.slug}.png`); toast('Kartu kutipan diunduh.'); } });
  $('#quoteShare').addEventListener('click', async () => {
    const b = await quoteBlob(); if (!b) return;
    const file = new File([b], `kutipan-${current.slug}.png`, { type: 'image/png' });
    const link = location.href.split('#')[0] + '#baca-' + current.slug;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: current.title, text: `“${qText}” — ${SITE.author}\n${link}` });
      else { saveBlob(b, file.name); toast('Perangkat ini belum bisa berbagi gambar langsung, jadi kartunya diunduh.'); }
    } catch (e) { /* dibatalkan */ }
  });
  $('#quoteCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`“${qText}”\n— ${SITE.author}, ${current.title}`); toast('Kutipan disalin.'); } catch (e) { toast('Tidak bisa menyalin otomatis.'); }
  });
  $('#rdShare').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#baca-' + current.slug;
    try {
      if (navigator.share) await navigator.share({ title: current.title, text: `${current.title} — ${SITE.author}`, url });
      else { await navigator.clipboard.writeText(url); toast('Tautan tulisan disalin.'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Tautan: ' + url); }
  });

  /* ======================================================================
     SUASANA: hujan, ombak, perapian, disintesis langsung di peramban
     ====================================================================== */
  const Amb = (() => {
    let ac = null, master = null, parts = [], timers = [], kind = 'hening';
    const bufs = {};
    function noise(type) {
      if (bufs[type]) return bufs[type];
      const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      let last = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
        else if (type === 'pink') { b0 = .997 * b0 + w * .029591; b1 = .985 * b1 + w * .032534; b2 = .95 * b2 + w * .048056; d[i] = (b0 + b1 + b2 + w * .1848) * .5; }
        else d[i] = w;
      }
      return (bufs[type] = b);
    }
    const src = type => { const s = ac.createBufferSource(); s.buffer = noise(type); s.loop = true; s.start(); parts.push(s); return s; };
    const filt = (type, f, q = .7) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
    const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
    const lfo = (hz, depth, target) => { const o = ac.createOscillator(); o.frequency.value = hz; const g = gain(depth); o.connect(g).connect(target); o.start(); parts.push(o); };
    const burst = (dur, f, q, vol, type = 'bandpass') => {
      const s = ac.createBufferSource(); s.buffer = noise('white');
      const g = gain(0), bp = filt(type, f, q), t = ac.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(bp).connect(g).connect(master); s.start(t, Math.random() * 3); s.stop(t + dur + .05);
    };
    function build(k) {
      if (k === 'hujan') {
        src('pink').connect(filt('highpass', 500)).connect(filt('lowpass', 7000)).connect(gain(.32)).connect(master);
        src('brown').connect(filt('lowpass', 400)).connect(gain(.35)).connect(master);
        timers.push(setInterval(() => { if (Math.random() < .55) burst(.03 + Math.random() * .05, 2200 + Math.random() * 3500, 6, .05 + Math.random() * .08); }, 70));
      }
      if (k === 'ombak') {
        const lp = filt('lowpass', 700), g = gain(.35);
        src('brown').connect(lp).connect(g).connect(master);
        lfo(.085, 520, lp.frequency); lfo(.085, .28, g.gain);
        src('pink').connect(filt('highpass', 2500)).connect(gain(.04)).connect(master);
      }
      if (k === 'perapian') {
        src('brown').connect(filt('lowpass', 900)).connect(gain(.28)).connect(master);
        timers.push(setInterval(() => {
          if (Math.random() < .35) burst(.008 + Math.random() * .02, 1800 + Math.random() * 3000, 1.2, .1 + Math.random() * .25, 'highpass');
          if (Math.random() < .02) for (let i = 0; i < 4; i++) setTimeout(() => burst(.01, 3000, 1, .2, 'highpass'), i * (20 + Math.random() * 40));
        }, 45));
      }
    }
    function teardown(old) {
      const { m, p, t } = old;
      t.forEach(clearInterval);
      if (!m) return;
      m.gain.setTargetAtTime(0, ac.currentTime, .4);
      setTimeout(() => { p.forEach(n => { try { n.stop(); } catch (e) { /* */ } }); m.disconnect(); }, 1600);
    }
    function set(k) {
      if (k === kind) return;
      teardown({ m: master, p: parts, t: timers });
      parts = []; timers = []; master = null; kind = k;
      $$('#ambience [data-amb]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.amb === k)));
      $('#rd-amb')?.remove();
      if (k === 'hening') return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        ac.resume();
        master = gain(0); master.connect(ac.destination);
        build(k);
        master.gain.setTargetAtTime(.55, ac.currentTime, .8);
        const chip = document.createElement('button');
        chip.id = 'rd-amb'; chip.type = 'button'; chip.className = 'amb-chip';
        chip.innerHTML = `<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>${({ hujan: 'Hujan', ombak: 'Ombak', perapian: 'Perapian' })[k]}`;
        chip.title = 'Matikan suasana';
        chip.addEventListener('click', () => set('hening'));
        $('.rd-top').append(chip);
      } catch (e) { kind = 'hening'; toast('Peramban ini belum bisa memutar suasana.'); }
    }
    return { set };
  })();
  $('#ambience').addEventListener('click', e => { const b = e.target.closest('[data-amb]'); if (b) Amb.set(b.dataset.amb); });
  if (!SITE.features.ambience) $('#ambWrap').hidden = true;

  /* ======================================================================
     PIRINGAN: halaman awal. Setiap tulisan adalah satu piringan hitam.
     ====================================================================== */
  const crate = $('#crate');
  const PV = Object.assign({ min: 5, form: 'semua', amb: 'hening', spin: true }, store.get('putar', {}));
  const savePv = () => store.set('putar', PV);
  const discKind = w => (w.form === 'puisi' ? 'splat' : ['cerpen', 'mini'].includes(w.cat) ? 'pic' : 'black');
  function splatSVG(w) {
    const r = seeded(w.slug + '/splat');
    let blobs = '';
    for (let i = 0; i < 9; i++) {
      const ang = r() * 360, dist = 24 + r() * 22, rx = 4 + r() * 9, ry = 1.6 + r() * 3.2;
      blobs += `<ellipse cx="${(50 + Math.cos(ang * Math.PI / 180) * dist).toFixed(1)}" cy="${(50 + Math.sin(ang * Math.PI / 180) * dist).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${(ang + 70 + r() * 40).toFixed(0)} ${(50 + Math.cos(ang * Math.PI / 180) * dist).toFixed(1)} ${(50 + Math.sin(ang * Math.PI / 180) * dist).toFixed(1)})" fill="#FFF" opacity="${(.7 + r() * .3).toFixed(2)}"/>`;
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${blobs}</svg>`;
  }
  const discs = new Map();
  WORKS.forEach(w => {
    const c = catOf(w.cat), k = discKind(w);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'disc disc-' + k;
    el.dataset.slug = w.slug;
    el.style.setProperty('--lc', c.ink);
    el.style.setProperty('--vc', c.ink);
    el.setAttribute('aria-label', `Putar “${w.title}”, ${c.label}, ${w.minutes} menit`);
    el.innerHTML = `<span class="disc-spin">${k === 'splat' ? splatSVG(w) : ''}${k === 'pic' ? '<canvas class="pic"></canvas>' : ''}
      <span class="disc-label"><canvas></canvas><b>${esc(w.title)}</b><small>${esc(c.label)} · No. ${w.no}</small></span><i class="disc-hole"></i></span>`;
    crate.append(el);
    discs.set(w.slug, el);
  });
  function paintDiscs() {
    discs.forEach((el, slug) => {
      const w = bySlug(slug), size = el.offsetWidth || 300;
      const lab = $('.disc-label canvas', el);
      drawThread(lab, fullText(w), { w: size * .38, h: size * .38, pad: 4, color: '#000', seed: slug, pins: false, weight: .9 });
      const pic = $('canvas.pic', el);
      if (pic) drawThread(pic, fullText(w), { w: size * .92, h: size * .92, pad: 10, color: catOf(w.cat).ink, seed: slug, weight: 1.6 });
    });
  }
  let crateOrder = [];
  function rankWorks() {
    const pool = WORKS.filter(w => PV.form === 'semua' || w.form === PV.form);
    const score = w => Math.abs(w.minutes - PV.min) + (w.minutes > PV.min ? 3 : 0) + (readSet.has(w.slug) ? .6 : 0);
    return [...pool.sort((a, b) => score(a) - score(b)), ...WORKS.filter(w => !pool.includes(w))];
  }
  function layoutCrate() {
    crateOrder.forEach((w, i) => {
      const el = discs.get(w.slug);
      el.style.setProperty('--i', i);
      el.style.zIndex = 60 - i;
      el.classList.toggle('top', i === 0);
      el.dataset.hide = String(i > 3);
      el.tabIndex = i === 0 ? 0 : -1;
    });
    renderMatch();
  }
  function rerank() { crateOrder = rankWorks(); layoutCrate(); }
  function renderMatch() {
    const w = crateOrder[0]; if (!w) return;
    const fits = w.minutes <= PV.min;
    $('#tsMatchH').textContent = fits ? `Cocok untuk ${PV.min} menit` : `Paling dekat dengan ${PV.min} menit`;
    const row = $('#tsMatch');
    row.innerHTML = `<span class="mini" aria-hidden="true"><i style="--lc:${catOf(w.cat).ink}"></i></span>
      <span><b>${esc(w.title)}</b><small>${w.minutes} mnt · ${esc(catOf(w.cat).label)} · ${readSet.has(w.slug) ? 'sudah dibaca' : 'belum dibaca'}</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;
    row.setAttribute('aria-label', `Baca ${w.title}`);
    row.classList.remove('swap'); void row.offsetWidth; row.classList.add('swap');
  }
  function nextDisc(dir = 1) {
    if (crateOrder.length < 2) return;
    if (dir > 0) {
      const top = discs.get(crateOrder[0].slug);
      if (!reduced) {
        top.classList.add('fly');
        setTimeout(() => { top.classList.remove('fly'); crateOrder.push(crateOrder.shift()); layoutCrate(); }, 380);
        return;
      }
      crateOrder.push(crateOrder.shift());
    } else crateOrder.unshift(crateOrder.pop());
    layoutCrate();
  }
  function playTop() {
    const w = crateOrder[0]; if (!w) return;
    if (SITE.features.ambience && PV.amb !== 'hening') Amb.set(PV.amb);
    crate.classList.add('playing');
    openWork(w.slug, $('.disc-spin', discs.get(w.slug)));
    setTimeout(() => crate.classList.remove('playing'), 900);
  }
  crate.addEventListener('click', e => {
    const d = e.target.closest('.disc');
    if (!d || crate._swiped) return;
    if (d.classList.contains('top')) { playTop(); return; }
    const w = bySlug(d.dataset.slug);
    crateOrder = [w, ...crateOrder.filter(x => x !== w)];
    layoutCrate();
  });
  // geser ke atas / bawah untuk berpindah piringan
  let sy = null;
  crate.addEventListener('pointerdown', e => { sy = e.clientY; crate._swiped = false; });
  crate.addEventListener('pointerup', e => {
    if (sy == null) return;
    const dy = e.clientY - sy; sy = null;
    if (Math.abs(dy) > 40) { crate._swiped = true; nextDisc(dy < 0 ? 1 : -1); setTimeout(() => { crate._swiped = false; }, 50); }
  });
  let wheelLock = 0;
  crate.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 12 || performance.now() < wheelLock) return;
    e.preventDefault(); wheelLock = performance.now() + 480;
    nextDisc(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  crate.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); nextDisc(e.key === 'ArrowDown' ? 1 : -1); requestAnimationFrame(() => discs.get(crateOrder[0].slug).focus()); }
  });
  $('#crateShuffle').addEventListener('click', () => {
    crateOrder = [...WORKS].sort(() => Math.random() - .5);
    layoutCrate();
  });
  function setSpin(on) {
    PV.spin = on; savePv();
    crate.classList.toggle('paused', !on);
    $('#spinToggle').setAttribute('aria-pressed', String(on));
    $('#spinToggle').setAttribute('aria-label', on ? 'Hentikan putaran piringan' : 'Putar piringan');
  }
  $('#spinToggle').addEventListener('click', () => setSpin(!PV.spin));

  /* ---------- jam, tanggal, persentase dibaca ---------- */
  function tick() {
    const d = new Date();
    $('#thHH').textContent = String(d.getHours()).padStart(2, '0');
    $('#thMM').textContent = String(d.getMinutes()).padStart(2, '0');
    $('#thClock').setAttribute('aria-label', `Pukul ${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`);
  }
  function renderSheet() {
    $('#thDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    const pct = WORKS.length ? Math.round(WORKS.filter(w => readSet.has(w.slug)).length / WORKS.length * 100) : 0;
    $('#thPct').textContent = pct + '%';
    requestAnimationFrame(() => { $('#thArc').style.strokeDashoffset = String(1 - pct / 100); });
  }
  const [hName, ...hRest] = (SITE.handle || SITE.author).split('/');
  $('#thTitle').innerHTML = `<span>${esc(hName)}</span>${hRest.length ? `<span>${esc(hRest.join('/'))}</span>` : ''}`;
  $('#thTitle').setAttribute('aria-label', SITE.title);

  /* ---------- roda menit luang ---------- */
  const MINS = Array.from({ length: 20 }, (_, i) => i + 1);
  const track = $('#wheelTrack'), wheelEl = $('#minWheel');
  track.innerHTML = MINS.map(m => `<span>${String(m).padStart(2, '0')}</span>`).join('');
  const itemH = () => track.firstElementChild.offsetHeight || 96;
  function setMin(m, animate = true) {
    PV.min = clamp(Math.round(m), 1, MINS.length);
    track.style.transition = animate && !reduced ? 'transform .55s cubic-bezier(.34, 1.36, .5, 1)' : 'none';
    track.style.transform = `translateY(${-(PV.min - 1) * itemH()}px)`;
    [...track.children].forEach((s, i) => s.classList.toggle('on', i === PV.min - 1));
    wheelEl.setAttribute('aria-valuenow', PV.min);
    wheelEl.setAttribute('aria-valuetext', PV.min + ' menit');
    savePv(); rerank();
  }
  let wy = null, wBase = 0;
  wheelEl.addEventListener('pointerdown', e => { wy = e.clientY; wBase = -(PV.min - 1) * itemH(); wheelEl.setPointerCapture(e.pointerId); track.style.transition = 'none'; });
  wheelEl.addEventListener('pointermove', e => {
    if (wy == null) return;
    const off = clamp(wBase + (e.clientY - wy), -(MINS.length - 1) * itemH() - 40, 40);
    track.style.transform = `translateY(${off}px)`;
    const m = Math.round(-off / itemH()) + 1;
    [...track.children].forEach((s, i) => s.classList.toggle('on', i === m - 1));
  });
  wheelEl.addEventListener('pointerup', e => {
    if (wy == null) return;
    const dy = e.clientY - wy; wy = null;
    if (Math.abs(dy) < 6) {
      const r = wheelEl.getBoundingClientRect(), y = e.clientY - r.top;
      setMin(PV.min + (y < r.height / 3 ? -1 : y > r.height * 2 / 3 ? 1 : 0));
    } else setMin(1 - (wBase + dy) / itemH());
  });
  let wAcc = 0;
  wheelEl.addEventListener('wheel', e => {
    e.preventDefault(); wAcc += e.deltaY;
    if (Math.abs(wAcc) > 40) { setMin(PV.min + Math.sign(wAcc)); wAcc = 0; }
  }, { passive: false });
  wheelEl.addEventListener('keydown', e => {
    const d = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[e.key];
    if (d) { e.preventDefault(); setMin(PV.min + d); }
    if (e.key === 'Home') setMin(1);
    if (e.key === 'End') setMin(MINS.length);
  });

  /* ---------- empat kontrol ---------- */
  const FORMS = ['puisi', 'semua', 'prosa'];
  const AMBS = ['hening', 'hujan', 'ombak', 'perapian'];
  const SIZES = [17, 19, 21, 23];
  const PAPERS = { putih: ['#F4F4F5', 'Putih'], sepia: ['#F2E4C9', 'Sepia'], gelap: ['#2A2A2E', 'Gelap'], custom: [rd.custom, 'Milikmu'] };
  function renderControls() {
    const f = $('#tcForm');
    f.dataset.v = PV.form;
    f.style.setProperty('--p', { puisi: '0%', semua: '50%', prosa: '100%' }[PV.form]);
    f.setAttribute('aria-label', `Bentuk: ${PV.form}. Ketuk untuk mengganti.`);
    const a = $('#tcAmb'), ai = AMBS.indexOf(PV.amb);
    a.style.setProperty('--a', (-60 + ai * 40) + 'deg');
    $('#tcAmbV').textContent = { hening: 'Hening', hujan: 'Hujan', ombak: 'Ombak', perapian: 'Api' }[PV.amb];
    a.setAttribute('aria-label', `Suasana saat membaca: ${PV.amb}. Ketuk untuk mengganti.`);
    $('#tcSizeV').textContent = rd.size;
    const spread = (rd.size - 13) * 3.2;
    $('#tcField').innerHTML = Array.from({ length: 9 }, (_, i) => {
      const k = (i - 4) / 4, x = 80 + k * spread * 2.4;
      return `<path d="M80 76 Q${(80 + k * spread * 4).toFixed(1)} ${(14 + Math.abs(k) * 22).toFixed(1)} ${x.toFixed(1)} 4"/>`;
    }).join('');
    $('#tcSize').setAttribute('aria-label', `Ukuran huruf ${rd.size}. Ketuk untuk mengganti.`);
    const p = $('#tcPaper'), pp = PAPERS[rd.rt] || PAPERS.putih;
    p.dataset.v = rd.rt; p.style.setProperty('--pp', rd.rt === 'custom' ? rd.custom : pp[0]);
    $('#tcPaperV').textContent = pp[1];
    p.setAttribute('aria-label', `Kertas ${pp[1]}. Ketuk untuk mengganti.`);
  }
  $('#tcForm').addEventListener('click', () => { PV.form = FORMS[(FORMS.indexOf(PV.form) + 1) % FORMS.length]; savePv(); renderControls(); rerank(); });
  $('#tcAmb').addEventListener('click', () => { PV.amb = AMBS[(AMBS.indexOf(PV.amb) + 1) % AMBS.length]; savePv(); renderControls(); });
  $('#tcSize').addEventListener('click', () => { rd.size = SIZES[(SIZES.indexOf(rd.size) + 1) % SIZES.length] || 19; saveRd(); applyRd(); renderControls(); });
  $('#tcPaper').addEventListener('click', () => { const order = ['putih', 'sepia', 'gelap']; rd.rt = order[(order.indexOf(rd.rt) + 1) % order.length]; saveRd(); applyRd(); renderControls(); });
  $('#tsMatch').addEventListener('click', playTop);
  $('#tsPlay').addEventListener('click', playTop);
  if (!SITE.features.ambience) $('#tcAmbCell').hidden = true;

  function initPutar() {
    tick(); setInterval(tick, 10000);
    renderSheet(); renderControls(); setSpin(PV.spin);
    setMin(PV.min, false);
    requestAnimationFrame(() => {
      paintDiscs(); setMin(PV.min, false);
      if (!reduced) { crate.classList.add('enter'); setTimeout(() => crate.classList.remove('enter'), 2200); }
    });
  }
  addEventListener('resize', () => { clearTimeout(initPutar._t); initPutar._t = setTimeout(() => { paintDiscs(); setMin(PV.min, false); }, 200); });

  /* ======================================================================
     PROFIL PENULIS
     ====================================================================== */
  $('#pfName').textContent = SITE.author;
  $('#pfBio').textContent = SITE.description || '';
  $('#pfWorks').textContent = num(WORKS.length);
  $('#pfWords').textContent = num(WORKS.reduce((a, w) => a + w.words, 0));
  $('#pfSince').textContent = WORKS[WORKS.length - 1].date.slice(0, 4);
  $('.profile').setAttribute('aria-label', 'Tentang ' + SITE.author);

  /* ======================================================================
     PWA: pasang di layar utama, baca tanpa sinyal
     ====================================================================== */
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installEvt = null;
  root.classList.toggle('standalone', standalone);
  function showInstall(on) {
    $('#installBtn').hidden = !on;
    $('#chipInstall').hidden = !on;
  }
  async function install() {
    if (installEvt) {
      installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      installEvt = null;
      if (outcome === 'accepted') showInstall(false);
      return;
    }
    if (isIOS) {
      $('#iosHint').hidden = false;
      toast('Di iPhone: ketuk Bagikan, lalu “Tambahkan ke Layar Utama”.', null, 6000);
    }
  }
  if (!standalone && !PREVIEW) {
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstall(true); });
    if (isIOS) showInstall(true);
  }
  addEventListener('appinstalled', () => { showInstall(false); toast(`${SITE.title} terpasang di perangkatmu.`); });
  $('#installBtn').addEventListener('click', install);
  $('#chipInstall').addEventListener('click', install);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !PREVIEW && !TATA) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* tanpa service worker situs tetap jalan */ });
  }
  addEventListener('offline', () => toast('Kamu sedang offline. Tulisan yang sudah pernah dimuat tetap bisa dibaca.', null, 4500));
  addEventListener('online', () => toast('Tersambung lagi.'));

  /* ======================================================================
     MULAI
     ====================================================================== */
  avatarInto($('#meAvatar'), 84);
  renderCanvas(true);
  renderList(false);
  renderGreet(true);
  renderFeed(false);
  applyRd();
  initPutar();
  route();
  requestAnimationFrame(() => { canvasFit(false); syncPill(); win.classList.add('ready'); booted = true; });
  if (PREVIEW) root.classList.add('is-preview');
})();
