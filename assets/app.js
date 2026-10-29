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
    const [site, works, albums] = await Promise.all([get('site.json'), get('works.json'), get('albums.json')]);
    return { site, works, albums };
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
    accent: '', theme: 'auto', backdrop: 'auto', defaultView: 'putar', readerFont: 'newsreader', readerPaper: 'putih',
    categories: DEFAULT_CATS,
    ...site,
    features: { dock: true, rotatingQuotes: true, connections: true, replay: true, ambience: true, ...(site.features || {}) }
  };
  const CATS = {};
  (SITE.categories && SITE.categories.length ? SITE.categories : DEFAULT_CATS).forEach(c => { CATS[c.id] = c; });
  const catOf = id => CATS[id] || (CATS[id] = { id, label: id, tag: String(id).toUpperCase().slice(0, 7), ink: '#111214' });

  const WORKS = (Array.isArray(content.works) ? content.works : [])
    .filter(w => w && w.slug && w.title && Array.isArray(w.body) && (PREVIEW || !w.draft))
    .map(w => ({ form: 'prosa', time: '', excerpt: '', line: '', pov: '', ...w }))
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
  if (!store.get('theme', null) && SITE.theme !== 'auto') root.setAttribute('data-theme', SITE.theme === 'gelap' ? 'dark' : 'light');
  $('.tk-title').textContent = SITE.handle;
  { const [h1, ...rest] = SITE.handle.split('/'); $('#tbBrand').innerHTML = esc(h1) + (rest.length ? `<em>/${esc(rest.join('/'))}</em>` : ''); }
  const win = $('#win');
  if (!SITE.features.dock) $('.pill [data-go="sapa"]').hidden = true;
  if (SITE.email) { $('#chipMail').hidden = false; $('#mailName').textContent = 'ke ' + SITE.author; }

  if (!WORKS.length) {
    $('.views').innerHTML = `<div class="empty"><p class="empty-t">Belum ada tulisan yang terbit.</p><p>${location.protocol === 'file:' ? 'Buka situs ini lewat server (misalnya <code>python3 -m http.server</code>), bukan langsung dari berkas.' : 'Tulis yang pertama di <a href="admin/">panel admin</a>.'}</p></div>`;
    win.classList.add('ready'); win.dataset.view = 'kosong';
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
  WORKS.forEach(w => { prep(w); w.side = 'a'; w.key = w.slug; w.A = w; });

  /* ---------- sisi B: cerita yang sama dari sisi yang lain ---------- */
  WORKS.forEach(w => {
    const b = w.sideB;
    const body = b && Array.isArray(b.body) ? b.body.filter(p => String(p).trim()) : [];
    w.B = body.length ? prep({ ...w, side: 'b', key: w.slug + ':b', A: w, B: null, title: (b.title || '').trim() || w.title, pov: (b.pov || '').trim(), body, excerpt: '', line: '' }) : null;
  });
  const DOCS = WORKS.flatMap(w => (w.B ? [w, w.B] : [w]));
  const all = () => WORKS;
  const bySlug = slug => all().find(w => w.slug === slug);
  const docOf = (slug, side) => { const w = bySlug(slug); return w && side === 'b' ? w.B : w; };
  const hrefOf = d => '#baca-' + d.slug + (d.side === 'b' ? ':b' : '');
  const sideLine = d => (d.side === 'b' ? `Sisi B${d.pov ? ' · dari sisi ' + d.pov : ''}` : `Sisi A${d.pov ? ' · dari sisi ' + d.pov : ''}`);
  const readSet = new Set(store.get('read', []));

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
  const VIEWS = ['putar', 'pilih', 'album', 'sapa'];
  let view = 'putar', prevView = 'putar';

  function setView(v) {
    if (view !== 'baca') prevView = view;
    view = v;
    win.dataset.view = v;
    syncPill();
    if (v === 'sapa' && typeof renderGreet === 'function') { renderGreet(true); if (feedMode !== 'search') renderFeed(false); }
    if (v !== 'baca') { if (typeof hideUpNext === 'function') hideUpNext(); stopSpeech(); releaseLock(); setSheet(false); stopReplay(false); Amb.set('hening'); hideQuotePop(); document.title = SITE.title; }
  }
  function syncPill() {
    const btns = $$('.pill [data-go]');
    let idx = -1;
    btns.forEach((b, i) => {
      const on = b.dataset.go === view;
      b.setAttribute('aria-current', String(on));
      if (on) idx = i;
    });
    const th = $('.pill-thumb');
    th.style.opacity = idx < 0 ? '0' : '1';
    if (idx >= 0) th.style.setProperty('--x', btns[idx].offsetLeft + 'px');
  }
  function go(v) {
    if (v === 'pilih') { openPicker(PK.slug || crateOrder[0]?.slug || WORKS[0].slug, PK.side); return; }
    if (location.hash === '#' + v) vt(() => setView(v)); else location.hash = v;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => { const t = root.getAttribute('data-theme'); return t ? t === 'dark' : darkMQ.matches; };
  function setTheme(dark) {
    const apply = () => {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      store.set('theme', dark ? 'dark' : 'light');
      syncThemeUI();
      if (typeof applyBackdrop === 'function') applyBackdrop();
      document.dispatchEvent(new Event('jm:theme'));
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
  }
  function syncThemeUI() {
    const d = isDark();
    $('#chipDark').setAttribute('aria-checked', String(d));
    $('#themeToggle').setAttribute('aria-pressed', String(d));
    $('#themeToggle').setAttribute('aria-label', d ? 'Mode terang' : 'Mode gelap');
    $('#themeToggle').title = d ? 'Mode terang' : 'Mode gelap';
  }
  syncThemeUI();
  $('#chipDark').addEventListener('click', () => setTheme(!isDark()));
  $('#themeToggle').addEventListener('click', () => setTheme(!isDark()));
  darkMQ.addEventListener?.('change', () => { syncThemeUI(); applyBackdrop(); document.dispatchEvent(new Event('jm:theme')); });

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
     PANEL SAPA: apa yang sedang diputar, koleksi dua sisi, dan kutipan
     ====================================================================== */
  const dock = $('#dock');
  // jejak dengar pribadi, hanya di perangkat ini
  const ST = Object.assign({ secs: 0, per: {}, plays: {}, days: [], done: [] }, store.get('stats', {}));
  const saveST = () => store.set('stats', ST);
  const docByKey = k => DOCS.find(d => d.key === k);
  const lastDoc = () => { const l = store.get('last', null); return l && docByKey(l.key); };

  /* ---------- ANTREAN: urutan baca milik pembaca, diputar lebih dulu dari album ---------- */
  const QICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h11M4 11.5h11M4 16.5h7"/><path d="M17.5 14v6M14.5 17h6"/></svg>';
  let QUEUE = store.get('queue', []).filter(k => docByKey(k));
  let pendingQueue = false;
  function saveQ() {
    store.set('queue', QUEUE);
    const b = $('.pill [data-go="sapa"]');
    if (b) { b.dataset.count = QUEUE.length ? String(QUEUE.length) : ''; b.classList.remove('bump'); void b.offsetWidth; if (QUEUE.length) b.classList.add('bump'); }
    if (view === 'sapa' && feedMode === 'now') renderFeed(false);
    if (typeof syncQueueBtn === 'function') syncQueueBtn();
  }
  function enqueue(ds) {
    const fresh = ds.filter(d => d && !QUEUE.includes(d.key));
    if (!fresh.length) { toast(ds.length > 1 ? 'Semua sisinya sudah ada di antrean.' : 'Sudah ada di antrean.'); return; }
    QUEUE = [...QUEUE, ...fresh.map(d => d.key)]; saveQ();
    toast(`${fresh.length > 1 ? fresh.length + ' sisi' : '“' + fresh[0].title + '”'} masuk antrean · ${QUEUE.length} menunggu`, { label: 'Lihat', run: () => { feedMode = 'now'; go('sapa'); } });
  }
  // putar satu sisi dari antrean: sisi-sisi sebelum yang dipilih tetap menunggu
  function playFromQueue(i) {
    const d = docByKey(QUEUE[i]); if (!d) return;
    pendingQueue = true; pendingStart = 0;
    openWork(d.slug, null, d.side);
  }
  const progOf = d => (ST.done.includes(d.key) ? 1 : clamp(store.get('prog', {})[d.key] || 0, 0, 1));
  const minsPlayed = () => (ST.secs ? Math.max(1, Math.round(ST.secs / 60)) : 0);
  function streak() {
    const days = new Set(ST.days); let n = 0;
    const d = new Date(); if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 2 ? 'baru saja' : m < 60 ? m + ' menit lalu' : m < 1440 ? Math.round(m / 60) + ' jam lalu' : m < 2880 ? 'kemarin' : Math.round(m / 1440) + ' hari lalu';
  }
  const mdisc = (d, cls = '') => `<span class="mdisc${d && d.side === 'b' ? ' b' : ''} ${cls}" style="--lc:${catOf((d || WORKS[0]).cat).ink}" aria-hidden="true"><i></i></span>`;
  // cincin progres untuk sisi A dan B: penuh = selesai, sebagian = sedang dibaca, garis putus = belum ada
  const sideRing = (d, label) => d
    ? `<i class="ring${ST.done.includes(d.key) ? ' done' : ''}" style="--p:${Math.round(progOf(d) * 100)}" title="${label}: ${ST.done.includes(d.key) ? 'selesai' : readSet.has(d.key) ? Math.round(progOf(d) * 100) + '%' : 'belum'}">${label}</i>`
    : `<i class="ring none" title="${label}: belum direkam">${label}</i>`;

  let statsMode = false;
  function renderGreet(animate) {
    const unread = DOCS.filter(d => !readSet.has(d.key));
    const latest = WORKS[0];
    const total = WORKS.reduce((a, w) => a + w.words, 0);
    const twoSided = WORKS.filter(w => w.B).length;
    const last = lastDoc(), lp = last ? progOf(last) : 0;
    const g = $('#tkGreet');
    if (statsMode) {
      const played = Object.entries(ST.plays).sort((a, b) => b[1] - a[1])[0];
      const fav = played && docByKey(played[0]);
      const done = DOCS.filter(d => ST.done.includes(d.key)).length;
      g.innerHTML = ST.secs < 30 && !fav
        ? `<span class="dim">Belum ada yang kamu putar di meja ini. Mulai dengan</span> <button type="button" data-act="pick" data-key="${crateOrder[0]?.key}">“${esc(crateOrder[0]?.title || '')}”</button><span class="dim">, pas untuk ${PV.min} menit luangmu.</span>`
        : `<span class="dim">Kamu sudah memutar</span> <span class="nw"><i class="dot-o" aria-hidden="true"></i><span>${minsPlayed()} menit</span></span> <span class="dim">di meja ini.</span>
          <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="selesai">${done} dari ${DOCS.length} sisi</button></span> <span class="dim">selesai kamu dengar.</span>
          ${fav ? `<span class="dim">Paling sering diputar:</span> <button type="button" data-act="pick" data-key="${fav.key}">“${esc(fav.title)}”</button><span class="dim"> (${played[1]}×).</span>` : ''}
          ${streak() > 1 ? `<span class="nw"><span class="ico-cal" aria-hidden="true"><b>${streak()}</b></span><span>${streak()} hari</span></span> <span class="dim">beruntun.</span>` : ''}`;
    } else {
      g.innerHTML = `<span class="dim">Selamat ${dayPart},</span> <span class="nw"><span class="ava-in" id="tkAva"></span> <span>${esc(SITE.readerName)}.</span></span>
        <span class="dim">Meja ini</span> <span class="nw"><span class="ava-stack" id="tkStack"></span><button type="button" data-act="koleksi" data-f="semua">${WORKS.length} piringan</button></span>${twoSided ? `<span class="dim">,</span> <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="dua">${twoSided} di antaranya dua sisi</button></span>` : ''}<span class="dim">.</span>
        <span class="dim">Kamu punya</span> <span class="nw"><span class="ico-bubble" aria-hidden="true"></span><button type="button" data-act="koleksi" data-f="belum">${unread.length ? unread.length + ' sisi belum' : 'semua sisi sudah'}</button></span> <button type="button" data-act="koleksi" data-f="belum">diputar</button>${last && lp > .02 && lp < .97
          ? ` <span class="dim">dan masih di tengah</span> <button type="button" data-act="pick" data-key="${last.key}">“${esc(last.title)}”</button><span class="dim">.</span>`
          : ` <span class="dim">dan</span> <span class="nw"><span class="ico-cal" aria-hidden="true"><b>${new Date(latest.date + 'T00:00:00').getDate()}</b></span><button type="button" data-act="pick" data-key="${latest.key}">yang terbaru</button></span> <span class="dim">terbit ${esc(fmt(latest.date, { month: 'long', year: 'numeric' }))}.</span>`}`;
      avatarInto($('#tkAva'), 24);
      const st = $('#tkStack');
      [...new Set(WORKS.map(w => w.cat))].slice(0, 3).map(c => WORKS.find(w => w.cat === c)).forEach(w => st.append(mini(w, 22)));
    }
    [...g.children].forEach((el, i) => el.style.setProperty('--k', i));
    g.classList.remove('reveal'); void g.offsetWidth;
    if (animate && !reduced) g.classList.add('reveal');
    $('#tkMeta').innerHTML = `
      <span title="piringan"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>${WORKS.length} piringan</span><i class="sep"></i>
      <span title="sisi"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="4" ry="8"/></svg>${DOCS.length} sisi</span><i class="sep"></i>
      <span title="kata"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>${num(total)} kata</span><i class="sep"></i>
      <span title="waktu yang sudah kamu putar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>${minsPlayed()} mnt</span>`;
  }
  $('#tkGreet').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'koleksi') { kFilter = b.dataset.f || 'semua'; setFeedMode('koleksi'); }
    if (b.dataset.act === 'pick') { const d = docByKey(b.dataset.key); if (d) openPicker(d.slug, d.side); }
  });
  $('#tkStats').addEventListener('click', e => { statsMode = !statsMode; e.currentTarget.setAttribute('aria-pressed', String(statsMode)); renderGreet(true); });
  $('#tkGear').addEventListener('click', () => {
    const pool = DOCS.filter(d => !readSet.has(d.key));
    const d = (pool.length ? pool : DOCS)[Math.floor(Math.random() * (pool.length || DOCS.length))];
    openPicker(d.slug, d.side);
  });
  $('#tkBack').addEventListener('click', () => go('putar'));

  const grip = $('#tkGrip');
  function setCollapsed(c) { dock.classList.toggle('collapsed', c); grip.setAttribute('aria-expanded', String(!c)); grip.setAttribute('aria-label', c ? 'Bentangkan kartu sapaan' : 'Ciutkan kartu sapaan'); }
  let gy = null;
  grip.addEventListener('pointerdown', e => { gy = e.clientY; grip.setPointerCapture(e.pointerId); });
  grip.addEventListener('pointerup', e => {
    if (gy == null) return;
    const dy = e.clientY - gy; gy = null;
    autoCollapsed = false;
    if (dy < -18) setCollapsed(true); else if (dy > 18) setCollapsed(false); else setCollapsed(!dock.classList.contains('collapsed'));
  });
  grip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!dock.classList.contains('collapsed')); } });

  const feed = $('#tkFeed');
  const MODES = ['now', 'koleksi', 'feed'];
  let feedMode = 'now', kFilter = 'semua', feedIdx = Math.floor(Math.random() * DOCS.length), feedT;
  function setFeedMode(m) { feedMode = m; feed.scrollTop = 0; renderFeed(false); }
  // menggulir isi panel menciutkan kartu biru supaya ruang baca lebih lega; kembali ke atas membentangkannya lagi
  let autoCollapsed = false;
  feed.addEventListener('scroll', () => {
    const c = dock.classList.contains('collapsed');
    if (feed.scrollTop > 36 && !c) { autoCollapsed = true; setCollapsed(true); }
    else if (feed.scrollTop < 4 && c && autoCollapsed) { autoCollapsed = false; setCollapsed(false); }
  }, { passive: true });

  /* ---------- Diputar: yang terakhir, berikutnya, dan jejakmu ---------- */
  function suggestions(last) {
    const out = [], seen = new Set(last ? [last.key] : []);
    const add = (d, why) => { if (d && !seen.has(d.key) && out.length < 3) { seen.add(d.key); out.push({ d, why }); } };
    if (last?.A.B) {
      const o = last.side === 'b' ? last.A : last.A.B;
      if (!ST.done.includes(o.key)) add(o, last.side === 'a' ? `Sisi lain dari yang baru kamu dengar: dari sisi ${esc(o.pov || 'yang lain')}` : 'Kembali ke cerita aslinya, Sisi A');
    }
    WORKS.filter(w => w.B && readSet.has(w.key) && !readSet.has(w.B.key)).slice(0, 1).forEach(w => add(w.B, `Sisi A “${esc(w.title)}” sudah kamu baca. Balik piringannya.`));
    if (last) linksOf(last.slug).forEach(l => { const o = bySlug(l.a === last.slug ? l.b : l.a); if (!readSet.has(o.key)) add(o, `Benang merah dari “${esc(last.A.title)}”: <i>${l.words.map(esc).join('</i> dan <i>')}</i>`); });
    add(crateOrder.find(w => !readSet.has(w.key)), `Pas untuk ${PV.min} menit luangmu`);
    DOCS.filter(d => !readSet.has(d.key)).forEach(d => add(d, d.side === 'b' ? `Sisi B, dari sisi ${esc(d.pov || 'yang lain')}` : 'Belum pernah kamu putar'));
    if (!out.length) Object.entries(ST.plays).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => add(docByKey(k), `Favoritmu, sudah ${n}× diputar`));
    return out;
  }
  function nowHTML() {
    const last = lastDoc(), L = store.get('last', null);
    let html = '';
    if (last) {
      const p = progOf(last), left = Math.max(0, Math.round(secsOf(last) * (1 - p)));
      const other = last.A.B ? (last.side === 'b' ? last.A : last.A.B) : null;
      const al = playing();
      html += `<p class="np-h"><span>${p >= .97 ? 'Terakhir diputar' : 'Sedang diputar'}</span><span>${ago(L.at)}</span></p>${al ? `<a class="np-album" href="#album-${esc(al.id)}"><canvas data-cover="${esc(al.id)}"></canvas><span>Dari album <b>${esc(al.title)}</b> · ${PLAY.order.indexOf(PLAY.i) + 1} dari ${al.tracks.length}</span></a>` : ''}
        <div class="np-card">
          <button type="button" class="np-disc" data-pick="${last.key}" aria-label="Buka ${esc(last.title)}">${mdisc(last, 'big spin')}</button>
          <div class="np-t"><small>${last.A.B ? (last.side === 'b' ? 'Sisi B' : 'Sisi A') + ' · ' : ''}${esc(catOf(last.cat).label)}${last.pov ? ' · dari sisi ' + esc(last.pov) : ''}</small>
            <b>${esc(last.title)}</b>
            <span class="np-bar" role="img" aria-label="${Math.round(p * 100)} persen"><i style="width:${(p * 100).toFixed(1)}%"></i></span>
            <small>${p >= .97 ? 'selesai' : Math.round(p * 100) + '% · sisa ' + fmtMS(left)}</small></div>
        </div>
        <div class="np-actions">
          <button type="button" class="np-go" data-pick="${last.key}">${p >= .97 ? 'Putar lagi' : 'Lanjutkan'}</button>
          ${other ? `<button type="button" data-pick="${other.key}">${mdisc(other)}Balik ke ${other.side === 'b' ? 'Sisi B' : 'Sisi A'}</button>` : ''}
        </div>`;
    } else {
      html += `<p class="np-h"><span>Belum ada yang diputar</span></p><p class="np-empty">Pilih satu piringan. Meja ini mencatat sampai mana kamu membaca, sisi mana yang sudah kamu balik, dan tulisan apa yang terhubung dengannya.</p>`;
    }
    const qd = QUEUE.map(docByKey).filter(Boolean);
    html += `<p class="np-h"><span>Antreanmu${qd.length ? ' · ' + qd.length : ''}</span>${qd.length ? '<button type="button" class="np-link" data-qclear>Kosongkan</button>' : ''}</p>`;
    html += qd.length
      ? `<ul class="tk-list q">${qd.map((d, i) => `<li style="--k:${i}"><button type="button" data-qplay="${i}">${mdisc(d)}<span class="sg-t"><b>${esc(d.title)}${d.side === 'b' ? '<i class="ab">B</i>' : ''}</b><span>${i === 0 ? 'Berikutnya · ' : ''}${esc(catOf(d.cat).label)} · ${d.minutes} mnt</span></span></button><span class="q-btns"><button type="button" data-qup="${i}" aria-label="Naikkan" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-qrm="${i}" aria-label="Keluarkan dari antrean">×</button></span></li>`).join('')}</ul>
        <div class="np-actions"><button type="button" class="np-go" data-qplay="0">Putar antrean</button></div>`
      : `<p class="np-empty">Tekan <b>Tambah ke antrean</b> di pemilih piringan atau di halaman album untuk menyusun urutan bacamu sendiri. Antrean diputar lebih dulu, lalu album dilanjutkan.</p>`;
    const sug = suggestions(last);
    if (sug.length) html += `<p class="np-h"><span>Berikutnya untukmu</span></p><ul class="tk-list sug">${sug.map((s, i) => `<li style="--k:${i}"><button type="button" data-pick="${s.d.key}">${mdisc(s.d)}<span class="sg-t"><b>${esc(s.d.title)}${s.d.side === 'b' ? '<i class="ab">B</i>' : ''}</b><span>${s.why}</span></span><span class="sg-m">${s.d.minutes} mnt</span></button></li>`).join('')}</ul>`;
    const done = DOCS.filter(d => ST.done.includes(d.key)).length, flipped = WORKS.filter(w => w.B && readSet.has(w.key) && readSet.has(w.B.key)).length;
    html += `<div class="np-stats">
      <div><b>${minsPlayed()}</b><span>menit diputar</span></div>
      <div><b>${done}<small>/${DOCS.length}</small></b><span>sisi selesai</span></div>
      <div><b>${flipped}<small>/${WORKS.filter(w => w.B).length}</small></b><span>piringan dibalik</span></div>
      <div><b>${streak()}</b><span>hari beruntun</span></div></div>`;
    return html;
  }

  /* ---------- Koleksi: setiap piringan dengan cincin sisi A dan B ---------- */
  const K_FILTERS = [['semua', 'Semua'], ['belum', 'Belum diputar'], ['dua', 'Dua sisi'], ['selesai', 'Selesai']];
  function koleksiHTML() {
    const pass = w => kFilter === 'semua' || (kFilter === 'dua' && w.B) ||
      (kFilter === 'belum' && (!readSet.has(w.key) || (w.B && !readSet.has(w.B.key)))) ||
      (kFilter === 'selesai' && (ST.done.includes(w.key) || (w.B && ST.done.includes(w.B.key))));
    const list = all().filter(pass);
    return `<div class="kc-filters" role="radiogroup" aria-label="Saring koleksi">${K_FILTERS.map(([k, l]) => `<button type="button" role="radio" data-kf="${k}" aria-checked="${k === kFilter}">${l}</button>`).join('')}</div>
      <ul class="tk-list kc">${list.map((w, i) => `<li style="--k:${i}"><button type="button" data-pick="${w.key}">${mdisc(w)}
        <span class="sg-t"><b>${esc(w.title)}</b><span>${esc(catOf(w.cat).label)} · ${w.minutes} mnt${w.B ? ' · Sisi B ' + w.B.minutes + ' mnt' : ''}</span></span>
        <span class="kc-ab">${sideRing(w, 'A')}${sideRing(w.B, 'B')}</span></button></li>`).join('') || '<li class="tk-none">Tidak ada piringan di sini.</li>'}</ul>`;
  }

  /* ---------- Kutipan: kalimat dari kedua sisi, bisa langsung dibaca dari situ ---------- */
  function quoteOf(d, seed) {
    const ps = d.body.map((p, i) => [plain(p).replace(/\s*\n\s*/g, d.form === 'puisi' ? '\n' : ' '), i]).filter(([p]) => p.length > 40);
    const pick = ps.filter(([p]) => p.length < 280);
    return (pick.length ? pick : ps.length ? ps : [[plain(d.body[0]), 0]])[seed % (pick.length || ps.length || 1)];
  }
  const noteOf = d => `${d.side === 'b' ? `Dari <b>Sisi B</b> “${esc(d.A.title)}”, dari sisi ${esc(d.pov || 'yang lain')}:` : `Dari ${esc(catOf(d.cat).label.toLowerCase())}`} <button type="button" data-pick="${d.key}">“${esc(d.title)}”</button> <span class="spark"><canvas data-spark="${d.key}"></canvas></span> ${fmtLong(d.date)}, ${d.words} kata.${d.A.B && d.side === 'a' ? ` Piringan ini punya <button type="button" data-pick="${d.A.B.key}">Sisi B</button>, dari sisi ${esc(d.A.B.pov || 'yang lain')}.` : ''}`;
  async function renderFeed(rotate) {
    clearTimeout(feedT);
    feed.classList.toggle('plain', feedMode !== 'feed');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === feedMode)));
    const mi = MODES.indexOf(feedMode);
    $('.tk-seg').style.setProperty('--x', Math.max(0, mi));
    $('.tk-seg').classList.toggle('none', mi < 0);
    if (feedMode === 'now') { feed.innerHTML = `<div class="np">${nowHTML()}</div>`; $$('canvas[data-cover]', feed).forEach(c => paintCover(c, albumOf(c.dataset.cover), 40)); return; }
    if (feedMode === 'koleksi') { feed.innerHTML = koleksiHTML(); return; }
    if (feedMode !== 'feed') return;
    const old = $('.fd', feed);
    if (rotate && old && !reduced) { old.classList.add('out'); await wait(420); }
    if (feedMode !== 'feed') return;
    const d = DOCS[feedIdx % DOCS.length], prev = DOCS[(feedIdx + DOCS.length - 1) % DOCS.length];
    const [q, pi] = quoteOf(d, feedIdx);
    feed.innerHTML = `<div class="fd">
      <p class="fd-pre">${noteOf(prev).replace(/<[^>]+>/g, '')}</p>
      <p class="fd-quote${d.form === 'puisi' ? ' poem' : ''}">${esc(q.length > 280 ? q.slice(0, 280) + '…' : q).replace(/\n/g, '<br>')}</p>
      <p class="fd-note">${noteOf(d)}</p>
      <div class="fd-actions"><button type="button" class="fd-go" data-at="${d.key}" data-para="${pi}">Baca dari kalimat ini</button><button type="button" class="fd-next" aria-label="Kutipan berikutnya">Berikutnya</button></div></div>`;
    $$('canvas[data-spark]', feed).forEach(c => requestAnimationFrame(() => { const x = docByKey(c.dataset.spark); drawThread(c, fullText(x), { w: 26, h: 20, pad: 1, color: '#fff', seed: x.key, pins: false, weight: 1.3 }); }));
    if (!reduced && SITE.features.rotatingQuotes) feedT = setTimeout(() => { if (!feed.matches(':hover') && !document.hidden && view === 'sapa') feedIdx++; renderFeed(true); }, 9000);
  }
  $('.tk-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) setFeedMode(b.dataset.mode);
  });
  feed.addEventListener('click', e => {
    const qp = e.target.closest('[data-qplay]');
    if (qp) { playFromQueue(+qp.dataset.qplay); return; }
    const qu = e.target.closest('[data-qup]');
    if (qu && !qu.disabled) { const i = +qu.dataset.qup; [QUEUE[i - 1], QUEUE[i]] = [QUEUE[i], QUEUE[i - 1]]; saveQ(); return; }
    const qr = e.target.closest('[data-qrm]');
    if (qr) { QUEUE.splice(+qr.dataset.qrm, 1); saveQ(); return; }
    if (e.target.closest('[data-qclear]')) { const old = QUEUE; QUEUE = []; saveQ(); toast('Antrean dikosongkan.', { label: 'Urungkan', run: () => { QUEUE = old; saveQ(); } }); return; }
    const kf = e.target.closest('[data-kf]');
    if (kf) { kFilter = kf.dataset.kf; renderFeed(false); return; }
    const pk = e.target.closest('[data-pick]');
    if (pk) { const d = docByKey(pk.dataset.pick); if (d) openPicker(d.slug, d.side); return; }
    const at = e.target.closest('[data-at]');
    if (at) { const d = docByKey(at.dataset.at); if (d) openAt(d, +at.dataset.para || 0, at.dataset.q || ''); return; }
    if (e.target.closest('.fd-next')) { feedIdx++; renderFeed(true); return; }
    if (e.target.closest('[data-clear]')) { $('#tkInput').value = ''; setFeedMode('now'); }
  });
  $('#chipRandom').addEventListener('click', () => $('#tkGear').click());
  $('#chipMail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SITE.email); toast(`Alamat ${SITE.email} disalin.`); }
    catch (e) { toast('Alamat surat: ' + SITE.email); }
  });
  // cari kalimat: setiap hasil membuka tulisan tepat di paragraf itu, dengan kalimatnya disorot
  $('#tkAsk').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#tkInput').value.trim();
    if (!q) { $('#tkInput').focus(); return; }
    const res = search(q);
    feedMode = 'search'; clearTimeout(feedT);
    renderFeed(false);
    feed.innerHTML = `<p class="tk-res-h"><span>${res.length} hasil untuk “${esc(q)}”</span><button type="button" data-clear>hapus</button></p>
      <ul class="tk-list">${res.map((r, i) => `<li style="--k:${i}"><button type="button" data-at="${r.w.key}" data-para="${r.para}" data-q="${esc(q)}">${mdisc(r.w)}<span class="sg-t"><b>${esc(r.w.title)}${r.w.side === 'b' ? '<i class="ab">B</i>' : ''}</b><span>${r.snip}</span></span></button></li>`).join('') || '<li class="tk-none">Tidak ada kalimat yang cocok.</li>'}</ul>`;
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
  const rdSaved = store.get('rd', {});
  const rd = Object.assign({ rt: SITE.readerPaper, custom: '#F3E9DC', font: SITE.readerFont, size: 19, weight: 400, liga: true, align: 'start', bright: 100 }, rdSaved);
  // kertas ikut tema sampai pembaca memilih sendiri
  rd.rtAuto = rdSaved.rtAuto ?? (rdSaved.rt == null || rdSaved.rt === SITE.readerPaper);
  const autoPaper = () => { if (rd.rtAuto) rd.rt = isDark() ? 'gelap' : (SITE.readerPaper === 'gelap' ? 'putih' : SITE.readerPaper); };
  autoPaper();
  let focusMode = false, current = null, pendingStart = null, pendingListen = false, pendingFocus = null, openedAt = 0;
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
    rd.rt = b.dataset.rt; rd.rtAuto = false; applyRd(); saveRd();
  });
  $('#colorIn').addEventListener('input', e => { rd.custom = e.target.value; rd.rt = 'custom'; rd.rtAuto = false; applyRd(); saveRd(); });
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
    const mark = t => (q ? markText(t, q) : rich(t));
    body.className = 'rd-body' + (focusMode ? ' focus' : '') + (reveal && !reduced ? ' reveal' : '');
    body.innerHTML = w.body.map((p, i) => `<p${w.form === 'puisi' ? ' class="stanza"' : ''} style="--k:${Math.min(i, 10)}">${mark(p)}</p>`).join('');
  }
  function markText(t, q) {
    const p = plain(t), lt = fold(p), lq = fold(q);
    let out = '', i = 0, k;
    while ((k = lt.indexOf(lq, i)) >= 0) { out += esc(p.slice(i, k)) + '<mark>' + esc(p.slice(k, k + q.length)) + '</mark>'; i = k + q.length; }
    return out + esc(p.slice(i));
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
  function neighbors() {
    const al = playing();
    if (al) {
      const order = PLAY.order, at = order.indexOf(PLAY.i), t = al.tracks;
      return { prev: t[order[Math.max(0, at - 1)]], next: at + 1 < order.length ? t[order[at + 1]] : null, album: al, pos: at + 1, len: order.length };
    }
    const list = all(), i = list.findIndex(w => w.slug === current.slug);
    return { prev: list[(i - 1 + list.length) % list.length], next: list[(i + 1) % list.length] };
  }
  function renderFlip(d) {
    const w = d.A, other = d.side === 'b' ? w : w.B;
    const fb = $('#rdFlip'), fc = $('#rdFlipCard');
    fb.hidden = fc.hidden = !w.B;
    card.dataset.side = d.side;
    if (!w.B) return;
    $('span', fb).textContent = d.side === 'b' ? 'Sisi A' : 'Sisi B';
    fb.setAttribute('aria-label', `Balik ke ${d.side === 'b' ? 'Sisi A' : 'Sisi B'}: ${other.title}`);
    fc.href = hrefOf(other);
    fc.style.setProperty('--lc', catOf(w.cat).ink);
    fc.innerHTML = `<span class="fc-disc" aria-hidden="true"><i></i></span>
      <span class="fc-t"><small>${d.side === 'b' ? 'Kembali ke Sisi A' : 'Balik piringannya · Sisi B'}</small><b>${esc(other.title)}</b>
      <span>${d.side === 'b' ? (w.pov ? 'Cerita aslinya, dari sisi ' + esc(w.pov) : 'Cerita aslinya') : 'Cerita yang sama, dari sisi ' + esc(other.pov || 'yang lain')} · ${other.minutes} menit</span></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;
  }

  function showReader(slug, side = 'a') {
    const w = docOf(slug, side) || bySlug(slug);
    if (!w) return;
    stopSpeech(); closeFind(); stopReplay(false); hideQuotePop();
    current = w;
    const viaQ = pendingQueue; pendingQueue = false;
    const qi = QUEUE.indexOf(w.key);
    if (qi >= 0) { QUEUE.splice(qi, 1); saveQ(); }
    // sisi dari antrean tidak memutus album: album lanjut dari posisinya setelah antrean habis
    if (!viaQ) syncPlay(w);
    setView('baca');
    $('#rdBackLabel').textContent = playing() ? 'Album' : { sapa: 'Sapa', putar: 'Piringan', pilih: 'Piringan', album: 'Album' }[prevView] || 'Piringan';
    $('#rdCrumb').textContent = `${catOf(w.cat).label} · ${w.A.B ? (w.side === 'b' ? 'Sisi B · ' : 'Sisi A · ') : ''}${w.title}`;
    const al = playing(), inAlbum = al && al.tracks[PLAY.i]?.key === w.key;
    $('#rdMeta').innerHTML = `${viaQ ? `<span class="q-tag">${QICON}dari antrean</span>` : ''}${inAlbum ? `<a class="al-tag" href="#album-${esc(al.id)}">${mdisc(w)}${esc(al.title)} · ${PLAY.order.indexOf(PLAY.i) + 1}/${al.tracks.length}</a>` : ''}${w.A.B ? `<span class="side-tag">${esc(sideLine(w))}</span>` : ''}<span>${esc(catOf(w.cat).label)}</span><span>No. ${w.no}</span><span>${fmtLong(w.date)}</span><span>${num(w.words)} kata · ${w.minutes} menit</span>${w.draft ? '<span class="draft-tag">draf</span>' : ''}`;
    $('#rdTitle').textContent = w.title;
    renderBody('', true);
    rhythm($('#rdRhythm'), w.lens);
    renderFlip(w);
    const nb = neighbors(), { prev } = nb, qNext = QUEUE.length ? docByKey(QUEUE[0]) : null, next = qNext || nb.next;
    renderRelated(w.A);
    $('#rdNextLink').href = next ? hrefOf(next) : '#album-' + nb.album.id;
    $('#rdNextLink').dataset.queue = qNext ? '1' : '';
    $('span', $('#rdNextLink')).textContent = qNext ? `berikutnya di antreanmu · ${QUEUE.length} menunggu` : nb.album ? (next ? `berikutnya di album “${nb.album.title}” · ${nb.pos + 1}/${nb.len}` : `album “${nb.album.title}” selesai`) : 'berikutnya';
    $('b', $('#rdNextLink')).textContent = next ? next.title : 'Kembali ke album';
    $('#rdPrev').dataset.key = prev.key; $('#rdNext').dataset.key = (next || prev).key;
    $('#rdNext').disabled = !next;
    $('#advPreview').textContent = plain(w.body[0]).replace(/\n/g, ' ');
    applyRd();
    scroller.scrollTop = 0;
    const marks = store.get('marks', {});
    $('#rsMark').setAttribute('aria-pressed', String(marks[w.key] != null));
    const startAt = pendingStart, listen = pendingListen, focusAt = pendingFocus;
    pendingStart = null; pendingListen = false; pendingFocus = null;
    openedAt = Date.now();
    hideUpNext(); UN.shownFor = null;
    requestAnimationFrame(() => {
      const maxS = scroller.scrollHeight - scroller.clientHeight;
      if (focusAt) { focusPara(focusAt.para, focusAt.q); onScroll(); return; }
      if (startAt) scroller.scrollTop = startAt * maxS;
      if (listen) startSpeech(Math.floor((startAt || 0) * w.body.length));
      if (startAt != null || listen) { onScroll(); return; }
      if (marks[w.key] != null) {
        scroller.scrollTop = marks[w.key] * (scroller.scrollHeight - scroller.clientHeight);
        toast('Melanjutkan dari posisi yang kamu tandai.');
      }
      onScroll();
    });
    if (!readSet.has(w.key)) { readSet.add(w.key); store.set('read', [...readSet]); }
    ST.plays[w.key] = (ST.plays[w.key] || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    if (!ST.days.includes(today)) ST.days = [...ST.days, today].slice(-60);
    saveST(); store.set('last', { key: w.key, at: Date.now() });
    renderSheet(); rerank();
    document.title = `${w.title} · ${SITE.title}`;
    if (!PREVIEW) scroller.focus({ preventScroll: true });
  }
  // membalik piringan di tengah membaca: kartunya ikut berputar seperti piringan
  async function flipReader(slug, side) {
    if (reduced || !card.animate) { showReader(slug, side); return; }
    const dir = side === 'b' ? 1 : -1;
    await card.animate([{ transform: 'perspective(1800px) rotateY(0)' }, { transform: `perspective(1800px) rotateY(${dir * 90}deg)`, opacity: .4 }], { duration: 240, easing: 'cubic-bezier(.5, 0, .9, .4)' }).finished.catch(() => {});
    showReader(slug, side);
    card.animate([{ transform: `perspective(1800px) rotateY(${dir * -90}deg)`, opacity: .4 }, { transform: 'perspective(1800px) rotateY(0)', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2, 1.3, .4, 1)' });
  }
  // buka tepat di satu paragraf, dengan kata yang dicari disorot sebentar
  function focusPara(i, q) {
    const el = body.children[clamp(i, 0, body.children.length - 1)];
    if (!el) return;
    scroller.scrollTop = Math.max(0, el.offsetTop - scroller.clientHeight * .28);
    if (q && q.length > 1) el.innerHTML = markText(current.body[clamp(i, 0, current.body.length - 1)], q);
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    clearTimeout(focusPara.t);
    focusPara.t = setTimeout(() => { el.classList.remove('flash'); if (q && current && !RP.token && $('#rdFind').hidden) el.innerHTML = rich(current.body[i] ?? ''); }, 4200);
  }
  function openAt(d, para, q) {
    pendingFocus = { para: para || 0, q: q || '' };
    if (location.hash === hrefOf(d) && view === 'baca' && current?.key === d.key) { pendingFocus = null; focusPara(para || 0, q); return; }
    openWork(d.slug, null, d.side);
  }
  scroller.tabIndex = -1;
  function openWork(slug, fromEl, side = 'a') {
    if (fromEl) morphFrom = fromEl;
    const h = '#baca-' + slug + (side === 'b' ? ':b' : '');
    if (location.hash === h) vt(() => showReader(slug, side)); else location.hash = h.slice(1);
  }
  $('#rdBack').addEventListener('click', () => {
    const al = playing();
    if (al) location.hash = 'album-' + al.id;
    else if (prevView === 'pilih' && PK.slug) openPicker(PK.slug, PK.side);
    else go(['sapa', 'album'].includes(prevView) ? prevView : 'putar');
  });
  $('#rdFlip').addEventListener('click', () => { if (current?.A.B) location.hash = hrefOf(current.side === 'b' ? current.A : current.A.B).slice(1); });
  const openKey = k => { const d = docByKey(k); if (d) { if (QUEUE[0] === k) pendingQueue = true; if (playing() || pendingQueue) pendingStart = 0; openWork(d.slug, null, d.side); } };
  $('#rdNextLink').addEventListener('click', e => { if (e.currentTarget.dataset.queue) { pendingQueue = true; pendingStart = 0; } });
  $('#rdPrev').addEventListener('click', e => openKey(e.currentTarget.dataset.key));
  $('#rdNext').addEventListener('click', e => openKey(e.currentTarget.dataset.key));

  function onScroll() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const frac = max > 0 ? scroller.scrollTop / max : 1;
    clearTimeout(onScroll.t);
    onScroll.t = setTimeout(() => { if (current) { const pr = store.get('prog', {}); pr[current.key] = +frac.toFixed(3); store.set('prog', pr); prog[current.key] = pr[current.key]; } }, 500);
    $('#rdProg').style.transform = `scaleX(${frac})`;
    weave(frac);
    if (current && frac > .97 && Date.now() - openedAt > Math.max(4000, Math.min(secsOf(current) * 350, 25000)) && !speaking) finished(current);
    else if (frac < .85 && !unEl.hidden && !UN.listen) { hideUpNext(); UN.shownFor = null; }
    if (!focusMode) return;
    const r0 = scroller.getBoundingClientRect(), mid = r0.top + r0.height * .45;
    let best = null, bd = Infinity;
    [...body.children].forEach(p => { const r = p.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = p; } });
    [...body.children].forEach(p => p.classList.toggle('cur', p === best));
  }
  scroller.addEventListener('scroll', onScroll, { passive: true });

  // satu sisi selesai: catat, lalu tawarkan sisi lainnya kalau belum didengar
  function finished(d) {
    if (!ST.done.includes(d.key)) { ST.done = [...ST.done, d.key]; saveST(); }
    showUpNext(d, false);
  }

  /* ---------- PUTAR TERUS: sisi berikutnya menyusul dengan hitung mundur ---------- */
  const UN = { next: null, left: 0, total: 0, listen: false, raf: 0, last: 0, shownFor: null };
  const unEl = $('#upNext');
  function upNextOf(d) {
    const qd = QUEUE.map(docByKey).find(x => x && x.key !== d.key);
    if (qd) return { d: qd, why: `Dari antreanmu${QUEUE.length > 1 ? ' · ' + QUEUE.length + ' menunggu' : ''}`, queue: true };
    const al = playing();
    if (al) { const nb = neighbors(); return nb.next ? { d: nb.next, why: `Album “${al.title}” · ${nb.pos + 1} dari ${nb.len}` } : { end: al }; }
    const other = d.A.B ? (d.side === 'b' ? d.A : d.A.B) : null;
    if (other && !ST.done.includes(other.key)) return { d: other, why: other.side === 'b' ? `Balik piringannya · dari sisi ${esc(other.pov || 'yang lain')}` : 'Kembali ke Sisi A, cerita aslinya' };
    const s = suggestions(d).find(x => x.d.key !== d.key);
    return s ? { d: s.d, why: s.why } : null;
  }
  function showUpNext(d, listen) {
    if (!d || view !== 'baca' || UN.shownFor === d.key) return;
    const n = upNextOf(d);
    if (!n) return;
    UN.shownFor = d.key; UN.next = n.d || null; UN.listen = listen; UN.queue = !!n.queue;
    unEl.classList.toggle('end', !!n.end);
    if (n.end) {
      $('#unWhy').textContent = 'Album selesai';
      $('#unTitle').textContent = n.end.title;
      $('#unMeta').innerHTML = `<button type="button" data-again="${esc(n.end.id)}">Putar lagi</button> <a href="#album-${esc(n.end.id)}">Ke album</a>`;
      $('#unDisc').style.setProperty('--lc', catOf(n.end.tracks[0].cat).ink);
      $('#unDisc').classList.remove('b');
    } else {
      $('#unWhy').innerHTML = 'Berikutnya · ' + n.why;
      $('#unTitle').textContent = n.d.title;
      $('#unMeta').textContent = `${n.d.A.B ? (n.d.side === 'b' ? 'Sisi B · ' : 'Sisi A · ') : ''}${catOf(n.d.cat).label} · ${n.d.minutes} menit${listen ? ' · dibacakan' : ''}`;
      $('#unDisc').style.setProperty('--lc', catOf(n.d.cat).ink);
      $('#unDisc').classList.toggle('b', n.d.side === 'b');
    }
    unEl.hidden = false; win.classList.add('upnext-on');
    unEl.classList.remove('in'); void unEl.offsetWidth; unEl.classList.add('in');
    const auto = PV.autoplay !== false && !n.end;
    $('#unAuto').setAttribute('aria-checked', String(PV.autoplay !== false));
    unEl.classList.toggle('manual', !auto);
    cancelAnimationFrame(UN.raf);
    UN.total = UN.left = (listen ? 5 : 10) * 1000;
    setArc(1);
    if (auto && !reduced) { UN.last = performance.now(); UN.raf = requestAnimationFrame(tickUpNext); }
  }
  const setArc = f => { $('#unArc').style.strokeDashoffset = String(1 - f); };
  function tickUpNext(now) {
    const dt = now - UN.last; UN.last = now;
    // berhenti sejenak saat kartu disentuh kursor atau halaman tidak terlihat
    if (!document.hidden && !unEl.matches(':hover')) UN.left -= dt;
    setArc(Math.max(0, UN.left / UN.total));
    if (UN.left <= 0) { playUpNext(); return; }
    UN.raf = requestAnimationFrame(tickUpNext);
  }
  function hideUpNext() { cancelAnimationFrame(UN.raf); unEl.hidden = true; UN.next = null; win.classList.remove('upnext-on'); }
  function playUpNext() {
    const d = UN.next, listen = UN.listen, viaQ = UN.queue;
    hideUpNext();
    if (!d) return;
    pendingStart = 0; pendingListen = listen; pendingQueue = viaQ;
    if (current && current.slug === d.slug) {
      // sisi lain piringan yang sama: kartu baca ikut berbalik
      location.hash = hrefOf(d).slice(1);
    } else openWork(d.slug, null, d.side);
  }
  $('#unGo').addEventListener('click', () => { if (UN.next) playUpNext(); });
  $('#unCancel').addEventListener('click', hideUpNext);
  $('#unAuto').addEventListener('click', () => {
    PV.autoplay = PV.autoplay === false; savePv();
    $('#unAuto').setAttribute('aria-checked', String(PV.autoplay));
    unEl.classList.toggle('manual', !PV.autoplay);
    cancelAnimationFrame(UN.raf);
    if (PV.autoplay && UN.next && !reduced) { UN.left = UN.total; UN.last = performance.now(); UN.raf = requestAnimationFrame(tickUpNext); }
    else setArc(1);
    toast(PV.autoplay ? 'Putar terus: sisi berikutnya menyusul otomatis.' : 'Putar terus dimatikan.');
  });
  unEl.addEventListener('click', e => { const ag = e.target.closest('[data-again]'); if (ag) { hideUpNext(); playAlbum(ag.dataset.again, 0); } });
  // waktu dengar dihitung hanya selama halaman baca terbuka dan terlihat
  setInterval(() => {
    if (view !== 'baca' || !current || document.hidden || PREVIEW) return;
    ST.secs += 5; ST.per[current.key] = (ST.per[current.key] || 0) + 5; saveST();
  }, 5000);

  $('#rsMark').addEventListener('click', () => {
    const marks = store.get('marks', {});
    if (marks[current.key] != null) { delete marks[current.key]; toast('Tanda dihapus.'); }
    else {
      const max = scroller.scrollHeight - scroller.clientHeight;
      marks[current.key] = max > 0 ? +(scroller.scrollTop / max).toFixed(3) : 0;
      toast('Posisi baca ditandai. Lain kali kamu mulai dari sini.');
    }
    store.set('marks', marks);
    $('#rsMark').setAttribute('aria-pressed', String(marks[current.key] != null));
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

  // gulir hanya di dalam kertas baca; scrollIntoView ikut menggeser wadah luarnya di ponsel
  function scrollToPara(el) {
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight * .4), behavior: reduced ? 'auto' : 'smooth' });
  }
  let speaking = false;
  function stopSpeech() {
    speaking = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
    $('#rsVoice').setAttribute('aria-pressed', 'false');
  }
  function startSpeech(from = 0) {
    if (!('speechSynthesis' in window)) { toast('Peramban ini belum bisa membacakan teks.'); return; }
    speechSynthesis.cancel();
    speaking = true;
    $('#rsVoice').setAttribute('aria-pressed', 'true');
    const paras = [...body.children];
    const voice = speechSynthesis.getVoices().find(v => /^id|indones/i.test(v.lang + v.name));
    const next = j => {
      $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
      if (speaking && j >= paras.length) { stopSpeech(); if (current) { if (!ST.done.includes(current.key)) { ST.done = [...ST.done, current.key]; saveST(); } UN.shownFor = null; showUpNext(current, true); } return; }
      if (!speaking) { stopSpeech(); return; }
      paras[j].classList.add('speaking');
      scrollToPara(paras[j]);
      const u = new SpeechSynthesisUtterance(paras[j].textContent);
      u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .95;
      u.onend = () => next(j + 1); u.onerror = () => stopSpeech();
      speechSynthesis.speak(u);
    };
    if (isMobile()) setSheet(false);
    next(clamp(from, 0, paras.length - 1));
  }
  $('#rsVoice').addEventListener('click', () => { if (speaking) stopSpeech(); else startSpeech(0); });

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
    if (hits[hit]) { scrollToPara(hits[hit]); $('#findCount').textContent = `${hit + 1}/${hits.length}`; }
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
    if (!nq) return all().map(w => ({ w, para: 0, snip: esc(w.excerpt) }));
    const out = [];
    DOCS.forEach(w => {
      let score = 0, snip = '';
      if (fold(w.title).includes(nq)) score += 5;
      if (fold(catOf(w.cat).label).includes(nq)) score += 2;
      const text = fullText(w).replace(/\s+/g, ' '), ft = fold(text), idx = ft.indexOf(nq);
      if (idx >= 0) {
        score += 2 + Math.min(3, ft.split(nq).length - 2);
        const a = Math.max(0, idx - 32), b = Math.min(text.length, idx + nq.length + 56);
        snip = (a ? '…' : '') + esc(text.slice(a, idx)) + '<mark>' + esc(text.slice(idx, idx + nq.length)) + '</mark>' + esc(text.slice(idx + nq.length, b)) + (b < text.length ? '…' : '');
      }
      const para = idx >= 0 ? Math.max(0, w.body.findIndex(p => fold(plain(p).replace(/\s+/g, ' ')).includes(nq))) : 0;
      if (score) out.push({ w, para, score: score - (w.side === 'b' ? .5 : 0), snip: snip || esc(w.excerpt) });
    });
    return out.sort((a, b) => b.score - a.score);
  }
  const palette = $('#palette'), pInput = $('#pInput'), pResults = $('#pResults');
  let pSel = 0, pItems = [];
  const commands = () => [
    { label: current?.side === 'b' ? 'Balik ke Sisi A' : 'Balik ke Sisi B', hint: current?.A.B ? (current.side === 'b' ? current.A.title : current.A.B.title) : '', run: () => $('#rdFlip').click(), show: view === 'baca' && !!current?.A.B },
    { label: PV.autoplay === false ? 'Nyalakan putar terus' : 'Matikan putar terus', hint: 'sisi berikutnya menyusul otomatis', run: () => { PV.autoplay = PV.autoplay === false; savePv(); toast(PV.autoplay ? 'Putar terus menyala.' : 'Putar terus dimatikan.'); } },
    { label: 'Tambah ke antrean', hint: (view === 'pilih' ? pkDoc() : current)?.title, run: () => enqueue([view === 'pilih' ? pkDoc() : current]), show: (view === 'baca' && !!current) || (view === 'pilih' && !!pkDoc()) },
    { label: 'Lihat antrean', hint: QUEUE.length + ' menunggu', run: () => { feedMode = 'now'; go('sapa'); }, show: QUEUE.length > 0 },
    { label: 'Saksikan tulisan ini ditulis', hint: current?.title, run: startReplay, show: view === 'baca' && !!SITE.features.replay },
    { label: isDark() ? 'Pakai mode terang' : 'Pakai mode gelap', hint: 'tema', run: () => setTheme(!isDark()) },
    { label: 'Buka tulisan acak', hint: 'kejutan', run: () => openPicker(WORKS[Math.floor(Math.random() * WORKS.length)].slug) },
    { label: 'Ke piringan', hint: 'halaman awal', run: () => go('putar') },
    { label: 'Pilih piringan', hint: 'sisi A atau B', run: () => go('pilih') },
    { label: 'Ke sapa', hint: 'panel', run: () => go('sapa'), show: !!SITE.features.dock },
    ...ALBUMS.map(a => ({ label: 'Putar album “' + a.title + '”', hint: a.tracks.length + ' sisi', run: () => playAlbum(a.id, 0) })),
    { label: 'Ganti latar', hint: 'wallpaper', run: () => $('#chipBackdrop').click() },
    { label: 'Pasang aplikasi', hint: 'layar utama', run: install, show: !$('#chipInstall').hidden }
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
        : `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-i="${i}" style="--k:${Math.min(i, 8)}"><span class="p-disc${r.w.side === 'b' ? ' b' : ''}" style="--lc:${catOf(r.w.cat).ink}" aria-hidden="true"><i></i></span><span class="p-title">${esc(r.w.title)}${r.w.side === 'b' ? ' <small>Sisi B</small>' : ''}</span><span class="p-snip">${r.snip}</span></li>`).join('')
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
    if (e.key === 'Enter' && pItems[pSel]) { const it = pItems[pSel]; closePalette(); it.cmd ? it.cmd.run() : openAt(it.w, it.para, pInput.value.trim()); }
  });
  pResults.addEventListener('click', e => {
    const li = e.target.closest('[data-i], [data-cmd]'); if (!li) return;
    closePalette();
    if (li.dataset.cmd) pItems[+li.dataset.cmd].cmd.run(); else { const it = pItems[+li.dataset.i]; openAt(it.w, it.para, pInput.value.trim()); }
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
      if ($('#tsSheet').classList.contains('open')) return setSheetOpen(false);
      if (!$('#quoteModal').hidden) return closeQuote();
      if (RP.token) return stopReplay(true);
      if (!$('#upNext').hidden) return $('#unCancel').click();
      if (!$('#rdFind').hidden) return closeFind();
      if (rs.classList.contains('open')) return setSheet(false);
      if (!$('#rsAdv').hidden && view === 'baca') return rsPage(false);
      if (view === 'baca') return $('#rdBack').click();
      if (view === 'pilih') return go('putar');
    }
    if (typing) return;
    if (e.key === '/' && palette.hidden) { e.preventDefault(); openPalette(); return; }
    if (view === 'baca' && palette.hidden) {
      if (e.key === 'ArrowRight' && !$('#rdNext').disabled) $('#rdNext').click();
      if (e.key === 'ArrowLeft') $('#rdPrev').click();
      if (e.key.toLowerCase() === 'f') $('#rsFocus').click();
      if (e.key.toLowerCase() === 'b' && current?.A.B) $('#rdFlip').click();
    }
    if (view === 'pilih' && palette.hidden) {
      if (e.key.toLowerCase() === 'b') setSide(PK.side === 'a' ? 'b' : 'a');
      if (e.key === 'Enter' && !e.target.closest('button, [role="slider"]')) $('#pkGo').click();
    }
  });

  const startView = () => (VIEWS.includes(SITE.defaultView) && SITE.defaultView !== 'pilih' && !(SITE.defaultView === 'sapa' && !SITE.features.dock) ? SITE.defaultView : 'putar');
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const m = h.match(/^baca-([\w-]+?)(:b)?$/);
    if (m && bySlug(m[1]) && view === 'baca' && current?.slug === m[1] && current.side !== (m[2] ? 'b' : 'a') && docOf(m[1], m[2] ? 'b' : 'a')) { flipReader(m[1], m[2] ? 'b' : 'a'); return; }
    vt(() => {
      if (m && bySlug(m[1])) { showReader(m[1], m[2] && bySlug(m[1]).B ? 'b' : 'a'); return; }
      const am = h.match(/^album(?:-([\w-]+))?$/);
      if (am) { showAlbum(am[1] && albumOf(am[1]) ? am[1] : null); return; }
      const pk = h.match(/^pilih(?:-([\w-]+?)(:b)?)?$/);
      if (pk && (!pk[1] || bySlug(pk[1]))) { showPicker(pk[1] || PK.slug || crateOrder[0]?.slug || WORKS[0].slug, pk[2] ? 'b' : (pk[1] ? 'a' : PK.side)); return; }
      if (VIEWS.includes(h) && h !== 'pilih' && h !== 'album' && !(h === 'sapa' && !SITE.features.dock)) { setView(h); return; }
      setView(startView());
    });
  }
  addEventListener('hashchange', route);
  mobileMQ.addEventListener?.('change', syncPill);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { syncPill(); if (current && view === 'baca') rhythm($('#rdRhythm'), current.lens); }, 150); });

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

  function renderRelated(w) {
    const host = $('#rdRelated');
    const links = SITE.features.connections ? linksOf(w.slug).slice(0, 3) : [];
    host.hidden = !links.length;
    host.innerHTML = links.length ? `<p class="rd-end-label">benang merah</p>` + links.map(l => {
      const o = bySlug(l.a === w.slug ? l.b : l.a);
      return `<a class="rel" href="#baca-${o.slug}"><svg class="rel-thread" viewBox="0 0 34 18" aria-hidden="true"><path d="M4 13Q15 19 30 4"/><circle cx="4" cy="13" r="3"/><circle cx="30" cy="4" r="3"/></svg><span class="rel-t"><b>${esc(o.title)}</b><small>terhubung lewat ${l.words.map(x => `<i>${esc(x)}</i>`).join(' dan ')}</small></span></a>`;
    }).join('') : '';
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
  const PV = Object.assign({ min: 5, form: 'semua', amb: 'hening', spin: true, listen: false }, store.get('putar', {}));
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
  // d: tulisan (sisi A) atau sisi B-nya; null untuk sisi B yang belum direkam
  function makeDisc(d, tag = 'button', w = d) {
    const c = catOf(w.cat), k = d ? discKind(w) : 'blank';
    const el = document.createElement(tag);
    if (tag === 'button') el.type = 'button';
    el.className = 'disc disc-' + k + (d && d.side === 'b' ? ' disc-b' : '');
    el.dataset.slug = w.slug;
    el.style.setProperty('--lc', c.ink);
    el.style.setProperty('--vc', c.ink);
    const small = !d ? 'Sisi B · belum direkam' : d.side === 'b' ? `Sisi B${d.pov ? ' · ' + esc(d.pov) : ''}` : `${esc(c.label)} · No. ${w.no}${w.B ? ' · A/B' : ''}`;
    el.innerHTML = `<span class="disc-spin">${k === 'splat' ? splatSVG(d.side === 'b' ? { slug: w.slug + ':b' } : w) : ''}${k === 'pic' ? '<canvas class="pic"></canvas>' : ''}
      <span class="disc-label"><canvas></canvas><b>${d ? esc(d.title) : ''}</b><small>${small}</small></span><i class="disc-hole"></i></span>`;
    return el;
  }
  function paintDisc(el, d, size) {
    if (!d) return;
    size = size || el.offsetWidth || 300;
    drawThread($('.disc-label canvas', el), fullText(d), { w: size * .38, h: size * .38, pad: 4, color: '#000', seed: d.key, pins: false, weight: .9 });
    const pic = $('canvas.pic', el);
    if (pic) drawThread(pic, fullText(d), { w: size * .92, h: size * .92, pad: 10, color: catOf(d.cat).ink, seed: d.key, weight: 1.6 });
  }
  const discs = new Map();
  WORKS.forEach(w => {
    const el = makeDisc(w);
    el.setAttribute('aria-label', `Buka “${w.title}”, ${catOf(w.cat).label}, ${w.minutes} menit`);
    crate.append(el);
    discs.set(w.slug, el);
  });
  function paintDiscs() { discs.forEach((el, slug) => paintDisc(el, bySlug(slug))); }
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
      <span><b>${esc(w.title)}</b><small>${w.minutes} mnt · ${esc(catOf(w.cat).label)}${w.B ? ' · ada sisi B' : ''} · ${readSet.has(w.slug) ? 'sudah dibaca' : 'belum dibaca'}</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;
    row.setAttribute('aria-label', `Baca ${w.title}`);
    row.classList.remove('swap'); void row.offsetWidth; row.classList.add('swap');
    $('#tsSumMin').textContent = String(PV.min).padStart(2, '0');
    $('#tsSumH').textContent = $('#tsMatchH').textContent;
    $('#tsSumT').textContent = w.title;
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
    if (typeof setSheetOpen === 'function') setSheetOpen(false);
    if (SITE.features.ambience && PV.amb !== 'hening') Amb.set(PV.amb);
    crate.classList.add('playing');
    openWork(w.slug, $('.disc-spin', discs.get(w.slug)));
    setTimeout(() => crate.classList.remove('playing'), 900);
  }
  crate.addEventListener('click', e => {
    const d = e.target.closest('.disc');
    if (!d || crate._swiped) return;
    if (d.classList.contains('top')) { openPicker(d.dataset.slug); return; }
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
  $('#tcPaper').addEventListener('click', () => { const order = ['putih', 'sepia', 'gelap']; rd.rt = order[(order.indexOf(rd.rt) + 1) % order.length]; rd.rtAuto = false; saveRd(); applyRd(); renderControls(); });
  $('#tsMatch').addEventListener('click', () => openPicker(crateOrder[0].slug));
  $('#tsPlay').addEventListener('click', playTop);
  if (!SITE.features.ambience) $('#tcAmbCell').hidden = true;

  /* ---------- lembar bawah di ponsel: semuanya muat satu layar ---------- */
  const sheet = $('#tsSheet'), scrim = $('#tsScrim');
  function setSheetOpen(open) {
    sheet.classList.toggle('open', open);
    scrim.classList.toggle('on', open);
    sheet.style.transform = '';
    $('#tsHandle').setAttribute('aria-expanded', String(open));
    $('#tsHandle').setAttribute('aria-label', open ? 'Tutup pengaturan bacaan' : 'Buka pengaturan bacaan');
    if (!open) sheet.scrollTop = 0;
  }
  let sd = null;
  $('#tsPeek').addEventListener('pointerdown', e => {
    if (!isMobile() || e.target.closest('.ts-sum-play')) return;
    sd = { y: e.clientY, t: performance.now(), open: sheet.classList.contains('open'), h: sheet.offsetHeight, moved: false, last: e.clientY };
    $('#tsPeek').setPointerCapture(e.pointerId);
  });
  $('#tsPeek').addEventListener('pointermove', e => {
    if (!sd) return;
    const dy = e.clientY - sd.y;
    if (!sd.moved && Math.abs(dy) < 6) return;
    sd.moved = true; sd.last = e.clientY;
    const peek = parseFloat(getComputedStyle(sheet).getPropertyValue('--peek')) || 92;
    const base = sd.open ? 0 : sd.h - peek;
    const y = clamp(base + dy, -12, sd.h - peek + 30);
    sheet.classList.add('dragging');
    sheet.style.transform = `translateY(${y}px)`;
    scrim.style.opacity = String(1 - y / (sd.h - peek));
  });
  const endSheet = e => {
    if (!sd) return;
    const d = sd; sd = null;
    sheet.classList.remove('dragging'); scrim.style.opacity = '';
    if (!d.moved) { setSheetOpen(!d.open); return; }
    const dy = e.clientY - d.y, v = dy / Math.max(1, performance.now() - d.t);
    setSheetOpen(Math.abs(v) > .5 ? v < 0 : (d.open ? dy < d.h * .25 : dy < -d.h * .2));
  };
  $('#tsPeek').addEventListener('pointerup', endSheet);
  $('#tsPeek').addEventListener('pointercancel', endSheet);
  $('#tsPeek').addEventListener('keydown', e => { if (e.key === 'Escape') setSheetOpen(false); });
  scrim.addEventListener('click', () => setSheetOpen(false));
  $('#tsSumPlay').addEventListener('click', playTop);
  // lembar terbuka tapi digulir ke atas sampai mentok lalu ditarik turun: tutup
  let pullY = null;
  sheet.addEventListener('touchstart', e => { pullY = sheet.classList.contains('open') && sheet.scrollTop <= 0 && !e.target.closest('.wheel') ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchmove', e => { if (pullY != null && e.touches[0].clientY - pullY > 90) { pullY = null; setSheetOpen(false); } }, { passive: true });

  /* ======================================================================
     PILIH PIRINGAN: bilah waktu, piringan dua sisi, carousel
     ====================================================================== */
  const PK = { slug: null, side: 'a', frac: 0, fr: {} };
  const prog = store.get('prog', {});
  const secsOf = w => Math.max(30, Math.round(w.words / 170 * 60));
  const fmtMS = sec => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
  const TICKS = 28;
  const pkCar = $('#pkCar'), pkDisc = $('#pkDisc'), scrub = $('#scrub'), ticks = $('#scTicks');
  ticks.insertAdjacentHTML('afterbegin', Array.from({ length: TICKS }, () => '<i></i>').join(''));
  WORKS.forEach(w => {
    const it = document.createElement('button');
    it.type = 'button'; it.className = 'pk-item' + (w.B ? ' has-b' : ''); it.dataset.slug = w.slug;
    it.setAttribute('role', 'option'); it.setAttribute('aria-label', w.title + (w.B ? ', dua sisi' : ''));
    it.append(makeDisc(w, 'span'));
    pkCar.append(it);
  });
  let pkPainted = false;
  const pkDoc = () => docOf(PK.slug, PK.side);
  const pkHash = () => '#pilih-' + PK.slug + (PK.side === 'b' ? ':b' : '');
  function openPicker(slug, side = 'a') { location.hash = 'pilih-' + slug + (side === 'b' ? ':b' : ''); }
  function showPicker(slug, side = 'a') {
    setView('pilih');
    if (!pkPainted) { pkPainted = true; $$('.pk-item', pkCar).forEach(it => paintDisc($('.disc', it), bySlug(it.dataset.slug), 64)); }
    const same = PK.slug === slug;
    PK.side = side; PK.fr = {};
    if (!same) selectPk(slug, false); else { renderSide(); }
    requestAnimationFrame(() => { setSide(side, false); $(`.pk-item[data-slug="${slug}"]`, pkCar)?.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    document.title = `${bySlug(slug).title} · ${SITE.title}`;
  }
  function selectPk(slug, animate, dir = 1) {
    const w = bySlug(slug); if (!w) return;
    PK.slug = slug; PK.fr = {};
    pkDisc.innerHTML = '<div class="pk-flip"><div class="pk-face a"></div><div class="pk-face b"></div></div><svg class="pk-arm" viewBox="0 0 60 220" aria-hidden="true"><circle class="arm-base" cx="30" cy="22" r="17"/><circle class="arm-pivot" cx="30" cy="22" r="7"/><path class="arm-rod" d="M30 22 L30 168 Q30 182 22 190"/><rect class="arm-head" x="10" y="184" width="18" height="28" rx="4" transform="rotate(18 19 198)"/></svg>';
    const a = makeDisc(w, 'span'), b = makeDisc(w.B, 'span', w);
    $('.pk-face.a', pkDisc).append(a); $('.pk-face.b', pkDisc).append(b);
    requestAnimationFrame(() => { paintDisc(a, w, pkDisc.offsetWidth); paintDisc(b, w.B, pkDisc.offsetWidth); });
    pkDisc.classList.toggle('side-b', PK.side === 'b');
    if (animate && !reduced) {
      pkDisc.style.setProperty('--dir', (dir * 60) + 'px'); pkDisc.style.setProperty('--rot', (dir * 18) + 'deg');
      pkDisc.classList.remove('swap'); void pkDisc.offsetWidth; pkDisc.classList.add('swap');
    }
    $$('.pk-item', pkCar).forEach(it => it.setAttribute('aria-selected', String(it.dataset.slug === slug)));
    renderSide();
  }
  // judul, petunjuk, bilah waktu, dan tombol mengikuti sisi yang sedang menghadap ke atas
  function renderSide() {
    const w = bySlug(PK.slug); if (!w) return;
    const d = pkDoc();
    // tiap sisi mengingat titik mulainya sendiri selama piringan ini dipegang
    if (PK.fr[PK.side] == null) PK.fr[PK.side] = d && prog[d.key] > .02 && prog[d.key] < .97 ? prog[d.key] : 0;
    PK.frac = PK.fr[PK.side];
    const t = $('#pkTitle');
    t.classList.remove('swap'); void t.offsetWidth; if (!reduced) t.classList.add('swap');
    t.innerHTML = d
      ? `${esc(d.title)}<small>${esc(catOf(w.cat).label)} · ${d.minutes} menit${readSet.has(d.key) ? ' · sudah dibaca' : ''}</small>`
      : `<span class="dim">${esc(w.title)}</span><small>Sisi B belum direkam</small>`;
    $('#pkHint').textContent = PK.side === 'a'
      ? (w.pov ? `Sisi A · dari sisi ${w.pov}` : 'Sisi A · cerita aslinya') + (w.B ? ' · balik untuk sisi lainnya' : '')
      : (w.B ? `Sisi B · cerita yang sama, dari sisi ${w.B.pov || 'yang lain'}` : 'Sisi ini masih kosong. Mungkin suatu hari.');
    $('.pk-sides [data-side="b"]').classList.toggle('is-empty', !w.B);
    scrub.classList.toggle('off', !d);
    syncQueueBtn();
    const go = $('#pkGo');
    go.disabled = !d;
    go.textContent = d ? 'Yang ini!' : 'Belum ada';
    renderScrub();
  }
  function renderScrub() {
    const d = pkDoc() || bySlug(PK.slug); if (!d) return;
    PK.fr[PK.side] = PK.frac;
    const total = secsOf(d), pos = Math.round(PK.frac * (TICKS - 1));
    $$('i', ticks).forEach((t, i) => { t.className = i < pos ? 'past' : i === pos ? 'now' : ''; });
    const tick = $$('i', ticks)[pos];
    $('#scTag').style.setProperty('--x', (tick.offsetLeft + tick.offsetWidth / 2) + 'px');
    $('#scTag').textContent = PK.frac > 0 ? `mulai ${Math.round(PK.frac * 100)}%` : 'dari awal';
    $('#scFrom').innerHTML = `${fmtMS(total * PK.frac)}<small>M</small>`;
    $('#scTo').innerHTML = `${fmtMS(total)}<small>M</small>`;
    scrub.setAttribute('aria-valuenow', Math.round(PK.frac * 100));
    scrub.setAttribute('aria-valuetext', `Mulai dari ${fmtMS(total * PK.frac)} dari ${fmtMS(total)}`);
  }
  let scrubbing = false;
  const scrubTo = x => { if (!pkDoc()) return; const r = ticks.getBoundingClientRect(); PK.frac = clamp((x - r.left) / r.width, 0, 1); if (PK.frac < .03) PK.frac = 0; renderScrub(); };
  scrub.addEventListener('pointerdown', e => { if (e.target.closest('.sc-box')) return; scrubbing = true; scrub.setPointerCapture(e.pointerId); scrubTo(e.clientX); });
  scrub.addEventListener('pointermove', e => { if (scrubbing) scrubTo(e.clientX); });
  scrub.addEventListener('pointerup', () => { scrubbing = false; });
  scrub.addEventListener('keydown', e => {
    if (!pkDoc()) return;
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (d) { e.preventDefault(); PK.frac = clamp(PK.frac + d / (TICKS - 1), 0, 1); renderScrub(); }
    if (e.key === 'Home') { PK.frac = 0; renderScrub(); }
  });
  // membalik piringan dalam dua langkah: berputar sampai tegak lurus, sisi ditukar, lalu berputar kembali.
  // Hanya satu sisi yang pernah dirender, jadi tidak ada sisi belakang yang berkedip menembus.
  let flipTok = 0;
  async function flipDisc(toB) {
    const el = $('.pk-flip', pkDisc), tok = ++flipTok;
    if (!el || reduced || !el.animate || view !== 'pilih') { pkDisc.classList.toggle('side-b', toB); return; }
    const dir = toB ? 1 : -1;
    pkDisc.classList.add('flipping');
    el.getAnimations().forEach(a => a.cancel());
    await el.animate([{ transform: 'perspective(1400px) rotateY(0)' }, { transform: `perspective(1400px) rotateY(${dir * 90}deg) scale(.94)` }], { duration: 200, easing: 'cubic-bezier(.55, 0, .9, .45)' }).finished.catch(() => {});
    if (tok !== flipTok) return;
    pkDisc.classList.toggle('side-b', toB);
    await el.animate([{ transform: `perspective(1400px) rotateY(${dir * -90}deg) scale(.94)` }, { transform: 'perspective(1400px) rotateY(0)' }], { duration: 560, easing: 'cubic-bezier(.2, 1.35, .4, 1)' }).finished.catch(() => {});
    if (tok === flipTok) pkDisc.classList.remove('flipping');
  }
  function setSide(side, fromUser = true) {
    const changed = side !== PK.side;
    PK.side = side;
    if (fromUser && changed) flipDisc(side === 'b'); else pkDisc.classList.toggle('side-b', side === 'b');
    $$('.pk-sides [data-side]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.side === side)));
    const btn = $(`.pk-sides [data-side="${side}"]`);
    $('.pk-dot').style.setProperty('--x', (btn.offsetLeft + btn.offsetWidth / 2) + 'px');
    if (fromUser && changed) { renderSide(); if (view === 'pilih') history.replaceState(null, '', pkHash()); }
  }
  $('.pk-sides').addEventListener('click', e => { const b = e.target.closest('[data-side]'); if (b) setSide(b.dataset.side); });
  let fx = null;
  pkDisc.addEventListener('pointerdown', e => { fx = e.clientX; });
  pkDisc.addEventListener('pointerup', e => {
    if (fx == null) return;
    const dx = e.clientX - fx; fx = null;
    if (Math.abs(dx) > 40) setSide(PK.side === 'a' ? 'b' : 'a');
  });
  pkDisc.addEventListener('dblclick', () => setSide(PK.side === 'a' ? 'b' : 'a'));
  let carT;
  pkCar.addEventListener('scroll', () => {
    clearTimeout(carT);
    carT = setTimeout(() => {
      const mid = pkCar.getBoundingClientRect().left + pkCar.clientWidth / 2;
      let best = null, bd = Infinity;
      $$('.pk-item', pkCar).forEach(it => { const r = it.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = it; } });
      if (best && best.dataset.slug !== PK.slug) {
        const items = $$('.pk-item', pkCar), dir = items.indexOf(best) > items.findIndex(i => i.dataset.slug === PK.slug) ? 1 : -1;
        selectPk(best.dataset.slug, true, dir);
        history.replaceState(null, '', pkHash());
        document.title = `${bySlug(PK.slug).title} · ${SITE.title}`;
      }
    }, 110);
  }, { passive: true });
  pkCar.addEventListener('click', e => { const it = e.target.closest('.pk-item'); if (it) it.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); });
  pkCar.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
    e.preventDefault();
    const items = $$('.pk-item', pkCar), i = items.findIndex(it => it.dataset.slug === PK.slug);
    const nx = items[clamp(i + d, 0, items.length - 1)];
    nx.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); nx.focus({ preventScroll: true });
  });
  function setListen(on) {
    PV.listen = on; savePv();
    $('#pkListen').setAttribute('aria-pressed', String(on));
    $('#pkListen').setAttribute('aria-label', on ? 'Dibacakan untukmu: nyala' : 'Dibacakan untukmu');
  }
  $('#pkListen').addEventListener('click', () => { setListen(!PV.listen); toast(PV.listen ? 'Tulisannya akan dibacakan untukmu.' : 'Kamu yang membaca.'); });
  function syncQueueBtn() {
    const d = pkDoc(), on = !!d && QUEUE.includes(d.key), b = $('#pkQueue');
    b.classList.toggle('in', on);
    b.setAttribute('aria-label', on ? 'Keluarkan dari antrean' : 'Tambah ke antrean'); b.title = b.getAttribute('aria-label');
  }
  $('#pkQueue').addEventListener('click', () => {
    const d = pkDoc(); if (!d) { toast('Sisi ini belum direkam.'); return; }
    if (QUEUE.includes(d.key)) { QUEUE = QUEUE.filter(k => k !== d.key); saveQ(); toast('Dikeluarkan dari antrean.'); return; }
    enqueue([d]);
    const b = $('#pkQueue'); b.classList.remove('added'); void b.offsetWidth; b.classList.add('added');
  });
  $('#pkGo').addEventListener('click', () => {
    const d = pkDoc(); if (!d) return;
    pendingStart = PK.frac; pendingListen = PV.listen;
    if (SITE.features.ambience && PV.amb !== 'hening' && !pendingListen) Amb.set(PV.amb);
    // jarum turun ke piringan, piringan berputar kencang, baru tulisannya dibuka
    if (reduced) { openWork(PK.slug, $('.pk-face.' + PK.side + ' .disc-spin', pkDisc), PK.side); return; }
    pkDisc.classList.add('needle');
    $('#pkGo').disabled = true;
    setTimeout(() => {
      pkDisc.classList.remove('needle'); $('#pkGo').disabled = false;
      openWork(PK.slug, $('.pk-face.' + PK.side + ' .disc-spin', pkDisc), PK.side);
    }, 620);
  });

  /* ======================================================================
     ALBUM: sisi-sisi pilihan penulis, diputar berurutan seperti playlist
     ====================================================================== */
  const ALBUMS = (Array.isArray(content.albums) ? content.albums : [])
    .map(a => ({ id: String(a.id || ''), title: String(a.title || ''), note: String(a.note || ''), tracks: (a.tracks || []).map(docByKey).filter(Boolean) }))
    .filter(a => a.id && a.title && a.tracks.length);
  const albumOf = id => ALBUMS.find(a => a.id === id);
  if (!ALBUMS.length) $('.pill [data-go="album"]').hidden = true;
  // PLAY: album yang sedang diputar, posisi, dan urutannya (urutan acak juga diingat)
  let PLAY = store.get('play', null);
  if (PLAY && !(albumOf(PLAY.album) && Array.isArray(PLAY.order))) PLAY = null;
  const savePlay = () => store.set('play', PLAY);
  const playing = () => (PLAY && albumOf(PLAY.album)) || null;
  function syncPlay(d) {
    const al = playing(); if (!al) return;
    const idx = al.tracks.findIndex((t, i) => t.key === d.key && i === PLAY.i);
    const any = idx >= 0 ? idx : al.tracks.findIndex(t => t.key === d.key);
    if (any < 0) { PLAY = null; savePlay(); return; }
    PLAY.i = any; savePlay();
  }
  const albumMins = a => a.tracks.reduce((n, t) => n + t.minutes, 0);
  // sampul mosaik ala playlist: empat petak seni benang dari sisi-sisi di album
  function paintCover(c, a, size) {
    if (!c || !a) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), S = Math.round(size * dpr);
    c.width = c.height = S; c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    const picks = a.tracks.length >= 4 ? a.tracks.slice(0, 4) : a.tracks.length === 1 ? [a.tracks[0]] : [a.tracks[0], a.tracks[1], a.tracks[1], a.tracks[0]];
    const n = picks.length === 1 ? 1 : 2, T = S / n;
    picks.forEach((d, i) => {
      const x = (i % n) * T, y = Math.floor(i / n) * T, ink = catOf(d.cat).ink, b = d.side === 'b';
      ctx.fillStyle = b ? '#F4F4F5' : ink; ctx.fillRect(x, y, T, T);
      const tmp = document.createElement('canvas');
      drawThread(tmp, fullText(d), { w: T / dpr, h: T / dpr, pad: T / dpr * .08, color: b ? ink : '#0D0D0E', seed: d.key + (i > 1 ? '/2' : ''), pins: false, weight: 1.15 });
      ctx.drawImage(tmp, x, y, T, T);
    });
  }
  const sleeve = (a, size, spin) => `<span class="al-sleeve${spin ? ' on' : ''}"><span class="al-rec${spin ? ' spin' : ''}" style="--lc:${catOf(a.tracks[0].cat).ink}" aria-hidden="true"><i></i></span><canvas data-cover="${esc(a.id)}" data-size="${size}"></canvas></span>`;
  function showAlbum(id) {
    setView('album');
    const host = $('#alScroll'), now = playing();
    if (!id) {
      host.innerHTML = `<header class="al-head"><p class="al-kicker">Koleksi</p><h2>Album</h2><p class="al-sub">Sisi-sisi pilihan, disusun untuk didengar berurutan.</p></header>
        <div class="al-grid">${ALBUMS.map((a, i) => `<button type="button" class="al-card" data-album="${esc(a.id)}" style="--k:${i}">${sleeve(a, 200, now && now.id === a.id)}
          <b>${esc(a.title)}</b><small>${a.tracks.length} sisi · ${albumMins(a)} menit${now && now.id === a.id ? ' · sedang diputar' : ''}</small></button>`).join('') || '<p class="al-empty">Belum ada album. Buat yang pertama di panel admin.</p>'}</div>`;
      document.title = 'Album · ' + SITE.title;
    } else {
      const a = albumOf(id), on = now && now.id === a.id;
      host.innerHTML = `<button type="button" class="al-back" data-album=""><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>Semua album</button>
        <div class="al-detail">
          <div class="al-art">${sleeve(a, 300, on)}</div>
          <div class="al-info">
            <p class="al-kicker">Album · ${a.tracks.length} sisi · ${albumMins(a)} menit</p>
            <h2>${esc(a.title)}</h2>
            ${a.note ? `<p class="al-note">${esc(a.note)}</p>` : ''}
            <div class="al-actions">
              <button type="button" class="al-play" data-play="${esc(a.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M8 5.5v13l10.5-6.5z"/></svg>${on ? 'Lanjutkan' : 'Putar'}</button>
              <button type="button" class="al-btn" data-shuffle="${esc(a.id)}" aria-label="Putar acak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.2c2.2 0 3.4 1 4.6 3.2l1.4 2.6c1.2 2.2 2.4 3.2 4.6 3.2H20M4 17h3.2c1.4 0 2.4-.4 3.2-1.3M20 7h-2.2c-1.4 0-2.4.4-3.2 1.3M17.5 4.5 20 7l-2.5 2.5M17.5 13.5 20 16l-2.5 2.5"/></svg></button>
              <button type="button" class="al-btn" data-qalbum="${esc(a.id)}" aria-label="Tambahkan album ke antrean" title="Tambahkan ke antrean">${QICON}</button>
              <button type="button" class="al-btn" data-share="${esc(a.id)}" aria-label="Bagikan album"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M6 11.5H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/></svg></button>
            </div>
            <ol class="al-tracks">${a.tracks.map((t, i) => {
              const cur = on && PLAY.i === i;
              return `<li style="--k:${i}"><button type="button" data-track="${i}" data-album="${esc(a.id)}" class="${cur ? 'cur' : ''}" aria-label="Putar ${esc(t.title)}">
                <span class="al-no">${cur ? '<i class="eq" aria-hidden="true"><i></i><i></i><i></i></i>' : i + 1}</span>${mdisc(t)}
                <span class="sg-t"><b>${esc(t.title)}${t.side === 'b' ? '<i class="ab">B</i>' : ''}</b><span>${t.side === 'b' ? 'Sisi B' : 'Sisi A'}${t.pov ? ' · dari sisi ' + esc(t.pov) : ''} · ${esc(catOf(t.cat).label)}</span></span>
                <span class="al-len">${fmtMS(secsOf(t))}</span>${sideRing(t, t.side === 'b' ? 'B' : 'A')}</button></li>`;
            }).join('')}</ol>
          </div>
        </div>`;
      document.title = a.title + ' · ' + SITE.title;
    }
    $$('canvas[data-cover]', host).forEach(c => requestAnimationFrame(() => paintCover(c, albumOf(c.dataset.cover), Math.min(+c.dataset.size, c.parentElement.clientWidth || +c.dataset.size))));
    host.scrollTop = 0;
  }
  function playAlbum(id, i = 0, shuffle = false) {
    const a = albumOf(id); if (!a) return;
    const order = a.tracks.map((_, k) => k);
    if (shuffle) { for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; } i = order[0]; }
    PLAY = { album: id, i, order }; savePlay();
    const t = a.tracks[i];
    pendingStart = 0;
    if (SITE.features.ambience && PV.amb !== 'hening') Amb.set(PV.amb);
    openWork(t.slug, null, t.side);
  }
  $('#alScroll').addEventListener('click', async e => {
    const tr = e.target.closest('[data-track]');
    if (tr) { playAlbum(tr.dataset.album, +tr.dataset.track); return; }
    const pl = e.target.closest('[data-play]');
    if (pl) { const on = playing(); if (on && on.id === pl.dataset.play) playAlbum(on.id, PLAY.i); else playAlbum(pl.dataset.play, 0); return; }
    const qa = e.target.closest('[data-qalbum]');
    if (qa) { enqueue(albumOf(qa.dataset.qalbum).tracks); return; }
    const sh = e.target.closest('[data-shuffle]');
    if (sh) { playAlbum(sh.dataset.shuffle, 0, true); return; }
    const share = e.target.closest('[data-share]');
    if (share) {
      const a = albumOf(share.dataset.share), url = location.href.split('#')[0] + '#album-' + a.id;
      try { if (navigator.share) await navigator.share({ title: a.title, text: `Album “${a.title}” — ${SITE.author}`, url }); else { await navigator.clipboard.writeText(url); toast('Tautan album disalin.'); } }
      catch (err) { if (err.name !== 'AbortError') toast('Tautan: ' + url); }
      return;
    }
    const al = e.target.closest('[data-album]');
    if (al) location.hash = al.dataset.album ? 'album-' + al.dataset.album : 'album';
  });

  function initPutar() {
    setListen(PV.listen);
    requestAnimationFrame(() => setSide(PK.side, false));
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
     PWA: pasang di layar utama, baca tanpa sinyal
     ====================================================================== */
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installEvt = null;
  root.classList.toggle('standalone', standalone);
  function showInstall(on) {
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
      toast('Di iPhone: ketuk Bagikan, lalu “Tambahkan ke Layar Utama”.', null, 6000);
    }
  }
  if (!standalone && !PREVIEW) {
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstall(true); });
    if (isIOS) showInstall(true);
  }
  addEventListener('appinstalled', () => { showInstall(false); toast(`${SITE.title} terpasang di perangkatmu.`); });
  $('#chipInstall').addEventListener('click', install);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !PREVIEW) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* tanpa service worker situs tetap jalan */ });
  }
  addEventListener('offline', () => toast('Kamu sedang offline. Tulisan yang sudah pernah dimuat tetap bisa dibaca.', null, 4500));
  addEventListener('online', () => toast('Tersambung lagi.'));

  /* ======================================================================
     MULAI
     ====================================================================== */
  renderGreet(true);
  renderFeed(false);
  $('.pill [data-go="sapa"]').dataset.count = QUEUE.length ? String(QUEUE.length) : '';
  applyRd();
  document.addEventListener('jm:theme', () => { if (!rd.rtAuto) return; autoPaper(); applyRd(); if (typeof renderControls === 'function') renderControls(); });
  initPutar();
  route();
  requestAnimationFrame(() => { syncPill(); win.classList.add('ready'); booted = true; });
  if (PREVIEW) root.classList.add('is-preview');
})();
