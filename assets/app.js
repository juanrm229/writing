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
  const fmt = (d, o) => new Date(d + 'T00:00:00').toLocaleDateString(LOCALE, o);
  const fmtShort = d => fmt(d, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtLong = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const num = n => n.toLocaleString(LOCALE);

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
  /* ---------- BAHASA: konten berbahasa dasar, terjemahannya di kunci bahasa lain (mis. "en") ---------- */
  const BASE = site.lang === 'en' ? 'en' : 'id';
  // ?lang=en di alamat (pratinjau admin, tautan yang dibagikan) mengalahkan pilihan yang tersimpan
  const URL_LANG = new URLSearchParams(location.search).get('lang');
  const LANG = (l => (l === 'id' || l === 'en' ? l : site.defaultLang === 'en' || site.defaultLang === 'id' ? site.defaultLang : BASE))(URL_LANG || store.get('lang', null));
  const OTHER = LANG !== BASE;
  // teks antarmuka dwibahasa ditulis langsung di tempatnya: t('Indonesia', 'English')
  const t = (id, en) => (LANG === 'en' && en != null ? en : id);
  const LOCALE = LANG === 'en' ? 'en-GB' : 'id-ID';
  document.documentElement.lang = LANG;
  // antarmuka berbahasa Inggris: teks yang persis sama dengan kunci kamus (assets/i18n.js) diganti,
  // termasuk yang ditambahkan belakangan. Isi tulisan dan lirik tidak pernah disentuh.
  const EN = LANG === 'en' ? window.JM_EN || {} : null;
  if (EN) {
    const SKIP = '.rd-body, .ly-list, script, style, textarea';
    // kunci yang terjemahannya sama persis (Radio, Album) dilewati: menulis ulang nilai yang sama memicu pengamat lagi
    const own = k => Object.prototype.hasOwnProperty.call(EN, k) && EN[k] !== k;
    const trText = n => {
      const v = n.nodeValue, k = v.trim();
      if (!k || !own(k) || n.parentElement?.closest(SKIP)) return;
      n.nodeValue = v.replace(k, EN[k]);
    };
    const trAttr = (el, a) => { const v = el.getAttribute(a); if (v && own(v.trim())) el.setAttribute(a, EN[v.trim()]); };
    const trTree = node => {
      if (node.nodeType === 3) { trText(node); return; }
      if (node.nodeType !== 1 || node.closest(SKIP)) return;
      [node, ...node.querySelectorAll('[aria-label], [title], [placeholder]')].forEach(el => ['aria-label', 'title', 'placeholder'].forEach(a => el.hasAttribute?.(a) && trAttr(el, a)));
      const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) trText(n);
    };
    trTree(document.body);
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'childList') m.addedNodes.forEach(trTree);
      else if (m.type === 'characterData') trText(m.target);
      else if (m.target.nodeType === 1) trAttr(m.target, m.attributeName);
    })).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
  }
  {
    const b = $('#langToggle'), other = LANG === 'en' ? 'id' : 'en';
    if (b) {
      $('.lg-now', b).textContent = LANG.toUpperCase(); $('.lg-other', b).textContent = other.toUpperCase();
      b.setAttribute('aria-label', t('Baca dalam bahasa Inggris', 'Baca dalam bahasa Indonesia (read in Indonesian)'));
      b.title = other === 'en' ? 'English' : 'Bahasa Indonesia';
      b.addEventListener('click', () => {
        store.set('lang', other);
        if (URL_LANG) { const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u); } else location.reload();
      });
    }
  }
  // ambil isian terjemahan yang benar-benar terisi saja, supaya yang kosong jatuh ke bahasa dasar
  const filled = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? true : String(v ?? '').trim())));
  const trOf = o => (OTHER && o && o[LANG]) || {};
  const siteTr = filled(trOf(site));
  const SITE = {
    title: 'Juan Menulis', author: 'Juan', handle: 'juan/menulis', email: '', avatar: '', readerName: LANG === 'en' ? 'reader' : 'pembaca',
    accent: '', theme: 'auto', backdrop: 'auto', defaultView: 'putar', readerFont: 'newsreader', readerPaper: 'putih',
    categories: DEFAULT_CATS,
    ...site,
    ...siteTr,
    profile: { ...(site.profile || {}), ...filled(siteTr.profile) },
    features: { dock: true, rotatingQuotes: true, connections: true, replay: true, ambience: true, ...(site.features || {}) }
  };
  const CAT_EN = { esai: 'Essay', puisi: 'Poetry', cerpen: 'Short story', mini: 'Flash fiction', catatan: 'Notes', novel: 'Novel', novella: 'Novella' };
  const CATS = {};
  (SITE.categories && SITE.categories.length ? SITE.categories : DEFAULT_CATS).forEach(c => { CATS[c.id] = LANG === 'en' ? { ...c, label: c.en || CAT_EN[c.id] || c.label } : c; });
  const catOf = id => CATS[id] || (CATS[id] = { id, label: id, tag: String(id).toUpperCase().slice(0, 7), ink: '#111214' });

  // satu karya dalam bahasa yang dipilih; bagian yang belum diterjemahkan tetap berbahasa dasar dan diberi tanda
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  // bahasa asli sebuah karya: lang di karya itu, kalau tidak ada bahasa dasar situs.
  // Terjemahannya disimpan di kunci bahasa yang lain (karya berbahasa Indonesia → en, berbahasa Inggris → id).
  const origOf = w => (w.lang === 'en' || w.lang === 'id' ? w.lang : BASE);
  function localize(w) {
    const wl = origOf(w), away = LANG !== wl, lostAs = away ? wl : false;
    const t = (away && w[LANG]) || {}, o = { ...w, ...filled({ title: t.title, excerpt: t.excerpt, line: t.line, pov: t.pov, sideTitle: t.sideTitle }) };
    o.lang = wl;
    o.lost = hasText(w.body) && !hasText(t.body) && lostAs;
    if (hasText(t.body)) o.body = t.body;
    const extra = Array.isArray(w.sides) ? w.sides : w.sideB ? [w.sideB] : [];
    o.sides = extra.map((x, i) => { const y = (t.sides || (t.sideB ? [t.sideB] : []))[i] || {}; return { ...x, ...filled({ title: y.title, pov: y.pov }), body: hasText(y.body) ? y.body : x.body, lost: !hasText(y.body) && lostAs }; });
    o.chapters = (Array.isArray(w.chapters) ? w.chapters : []).map((c, i) => { const y = (t.chapters || [])[i] || {}; return { ...c, ...filled({ title: y.title }), body: hasText(y.body) ? y.body : c.body, lost: hasText(c.body) && !hasText(y.body) && lostAs }; });
    o.liner = { ...(w.liner || {}), ...filled(t.liner) };
    const en = w[wl === 'en' ? 'id' : 'en'] || {};
    o.bilingual = hasText(en.body) || (en.sides || en.sideB ? [...(en.sides || []), en.sideB] : []).some(x => hasText(x?.body)) || (en.chapters || []).some(c => hasText(c?.body));
    return o;
  }
  const WORKS = (Array.isArray(content.works) ? content.works : [])
    .filter(w => w && w.slug && w.title && (hasText(w.body) || (Array.isArray(w.chapters) && w.chapters.some(c => hasText(c.body)))) && (PREVIEW || !w.draft))
    .map(w => ({ form: 'prosa', time: '', excerpt: '', line: '', pov: '', ...localize(w) }))
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
  if (SITE.email) { $('#chipMail').hidden = false; $('#mailName').textContent = t('ke ', 'to ') + SITE.author; }

  if (!WORKS.length) {
    $('.views').innerHTML = `<div class="empty"><p class="empty-t">${t('Belum ada tulisan yang terbit.', 'Nothing published yet.')}</p><p>${location.protocol === 'file:' ? t('Buka situs ini lewat server (misalnya <code>python3 -m http.server</code>), bukan langsung dari berkas.', 'Open this site through a server (for example <code>python3 -m http.server</code>), not straight from the file.') : t('Tulis yang pertama di <a href="admin/">panel admin</a>.', 'Write the first one in the <a href="admin/">admin panel</a>.')}</p></div>`;
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
  // pemisah adegan: paragraf tanpa huruf atau angka, seperti *** atau ~
  const isBreak = p => !/[\p{L}\p{N}]/u.test(plain(p));
  const SCENE = '<p class="scene" aria-hidden="true"><span>⁂</span></p>';
  const fullText = w => plain(w.body.filter(p => !isBreak(p)).join('\n\n'));
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
  /* ---------- SISI dan BAB ----------
     Setiap karya punya daftar sisi S = [A, B, C, …]: cerita yang sama dari sisi yang berbeda.
     Novel dan novella punya daftar bab CH; bab 1 memakai alamat karyanya, bab berikutnya "slug~2", "slug~3", … */
  const LETTERS = 'abcdefghijklmnop';
  const clean = b => (Array.isArray(b) ? b : []).filter(p => String(p).trim());
  WORKS.forEach(w => {
    const chs = w.chapters.filter(c => hasText(c.body));
    w.side = 'a'; w.key = w.slug; w.A = w;
    if (chs.length) {
      // karya berbab: angka karya (kata, menit) menghitung semua bab
      prep(Object.assign(w, { body: chs.flatMap(c => clean(c.body)) }));
      w.CH = chs.map((c, i) => prep({ ...w, side: 'a', ch: i + 1, key: w.slug + (i ? '~' + (i + 1) : ''), A: w, title: (c.title || '').trim() || `${LANG === 'en' ? 'Chapter' : 'Bab'} ${i + 1}`, chTitle: (c.title || '').trim(), body: clean(c.body), lost: !!c.lost, excerpt: '', line: '' }));
      w.S = [w.CH[0]];
    } else {
      prep(w);
      const A = prep({ ...w, side: 'a', key: w.slug, A: w, title: (w.sideTitle || '').trim() || w.title, sideName: (w.sideTitle || '').trim(), body: clean(w.body) });
      const rest = w.sides.filter(x => hasText(x.body)).map((x, i) => prep({ ...w, side: LETTERS[i + 1], key: w.slug + ':' + LETTERS[i + 1], A: w, title: (x.title || '').trim() || w.title, sideName: (x.title || '').trim(), pov: (x.pov || '').trim(), body: clean(x.body), lost: !!x.lost, excerpt: '', line: '' }));
      w.S = [A, ...rest];
      w.CH = null;
    }
    w.B = w.S[1] || null;
  });
  const DOCS = WORKS.flatMap(w => w.CH || w.S);
  const all = () => WORKS;
  const bySlug = slug => all().find(w => w.slug === slug);
  const docOf = (slug, side = 'a', ch = 1) => { const w = bySlug(slug); if (!w) return null; if (w.CH) return w.CH[clamp(+ch || 1, 1, w.CH.length) - 1]; return w.S.find(d => d.side === side) || null; };
  const hrefOf = d => '#baca-' + d.slug + (d.side !== 'a' ? ':' + d.side : '') + (d.ch > 1 ? '~' + d.ch : '');
  const SL = d => (d?.side || 'a').toUpperCase();
  const sideWord = d => (LANG === 'en' ? 'Side ' : 'Sisi ') + SL(d);
  const multi = w => !!(w && w.S && w.S.length > 1);
  // sisi berikutnya di piringan yang sama (A → B → C → A)
  const nextSide = d => { const S = d?.A?.S; if (!S || S.length < 2) return null; return S[(S.indexOf(d) + 1) % S.length]; };
  const nextChapter = d => (d?.A?.CH && d.ch < d.A.CH.length ? d.A.CH[d.ch] : null);
  const sideLine = d => `${sideWord(d)}${d.pov ? (LANG === 'en' ? ' · ' + d.pov + '’s side' : ' · dari sisi ' + d.pov) : ''}`;
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
    // ukuran tampil dikunci ke ukuran gambar; tanpa ini kanvas tampil sebesar pikselnya (2× di layar retina)
    if (o.w) { canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; }
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
    // transisi yang dilewati (misalnya pindah halaman beruntun) menolak janjinya; itu wajar, bukan galat
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { $('#rdCard').style.viewTransitionName = ''; });
  }

  /* ======================================================================
     JENDELA, TAMPILAN, TEMA
     ====================================================================== */
  const VIEWS = ['putar', 'pilih', 'album', 'tentang', 'sapa'];
  let view = 'putar', prevView = 'putar';

  function setView(v) {
    if (view !== 'baca') prevView = view;
    view = v;
    win.dataset.view = v;
    syncPill();
    if (v === 'sapa' && typeof renderGreet === 'function') { renderGreet(true); if (feedMode !== 'search') renderFeed(false); }
    if (v === 'tentang' && typeof renderProfile === 'function') renderProfile();
    if (v !== 'baca') { if (typeof Lyr !== 'undefined') Lyr.hide(); if (typeof hideUpNext === 'function') hideUpNext(); stopSpeech(); releaseLock(); setSheet(false); stopReplay(false); Amb.set('hening'); hideQuotePop(); document.title = SITE.title; }
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
    if (v === 'pilih') { openPicker(PK.slug || crateOrder[0]?.slug || WORKS[0].slug, PK.side, PK.ch); return; }
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
    if (document.startViewTransition && !reduced) document.startViewTransition(apply).ready.catch(() => {}); else apply();
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
    toast(t('Latar: ', 'Background: ') + (EN?.[BD_NAMES[backdrop]] || BD_NAMES[backdrop]));
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
  const SIEVE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6 7.2V19l-4-1.6v-4.2z"/></svg>';
  const QICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h11M4 11.5h11M4 16.5h7"/><path d="M17.5 14v6M14.5 17h6"/></svg>';
  let QUEUE = store.get('queue', []).filter(k => docByKey(k));
  let pendingQueue = false;

  /* ---------- RADIO: tulisan yang paling dekat kata dan suasananya, diputar tanpa henti ---------- */
  let RADIO = store.get('radio', null);
  if (RADIO && !(bySlug(RADIO.seed) && Array.isArray(RADIO.heard))) RADIO = null;
  let pendingRadio = false;
  const saveRadio = () => store.set('radio', RADIO);
  function radioNext(d) {
    if (!RADIO) return null;
    // sisi lain dari piringan yang sama lebih dulu
    const ns = d && nextSide(d);
    if (ns && ns.side !== 'a' && !RADIO.heard.includes(ns.key)) return { d: ns, why: t(`Radio · ${sideWord(ns)}, dari sisi ${esc(ns.pov || 'yang lain')}`, `Radio · ${sideWord(ns)}, ${esc(ns.pov || 'another')}’s side`), radio: true };
    const nc = d && nextChapter(d);
    if (nc) return { d: nc, why: t(`Radio · bab berikutnya`, `Radio · next chapter`), radio: true };
    const heard = new Set(RADIO.heard.map(k => k.split(':')[0]));
    let pool = WORKS.filter(w => !heard.has(w.slug) && w.slug !== d?.slug);
    // semua sudah diputar: radio memutar ulang, tanpa henti
    if (!pool.length) { RADIO.heard = d ? [d.key] : []; saveRadio(); pool = WORKS.filter(w => w.slug !== d?.slug); }
    if (!pool.length) return null;
    const rnd = seeded('radio/' + RADIO.seed + '/' + RADIO.heard.length);
    const score = w => .6 * kin(RADIO.seed, w.slug).sim + .4 * (d ? kin(d.slug, w.slug).sim : 0) + rnd() * .03;
    const best = pool.map(w => [w, score(w)]).sort((x, y) => y[1] - x[1])[0][0];
    const k = kin(d ? d.slug : RADIO.seed, best.slug);
    return { d: best, why: k.words.length ? `Radio · ${t('lewat', 'via')} <i>${k.words.map(esc).join(`</i> ${t('dan', 'and')} <i>`)}</i>` : `Radio · ${t('dari', 'from')} “${esc(bySlug(RADIO.seed).title)}”`, radio: true };
  }
  function startRadio(slug) {
    const w = bySlug(slug); if (!w) return;
    RADIO = { seed: slug, heard: [] }; saveRadio();
    if (typeof PLAY !== 'undefined' && PLAY) { PLAY = null; savePlay(); }
    pendingRadio = true; pendingListen = true; pendingStart = 0;
    toast(t(`Radio “${w.title}”: tulisan yang paling dekat kata dan suasananya, dibacakan tanpa henti.`, `“${w.title}” radio: the pieces closest in words and mood, read aloud without stopping.`), null, 4200);
    openWork(slug, null, 'a');
  }
  function stopRadio() { if (!RADIO) return; RADIO = null; saveRadio(); toast('Radio dihentikan.'); if (view === 'baca' && current) $$('.radio-tag', $('#rdMeta')).forEach(t => t.remove()); }
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
    toast(t(`${fresh.length > 1 ? fresh.length + ' sisi' : '“' + fresh[0].title + '”'} masuk antrean · ${QUEUE.length} menunggu`, `${fresh.length > 1 ? fresh.length + ' sides' : '“' + fresh[0].title + '”'} queued · ${QUEUE.length} waiting`), { label: t('Lihat', 'View'), run: () => { feedMode = 'now'; go('sapa'); } });
  }
  // putar satu sisi dari antrean: sisi-sisi sebelum yang dipilih tetap menunggu
  function playFromQueue(i) {
    const d = docByKey(QUEUE[i]); if (!d) return;
    pendingQueue = true; pendingStart = 0;
    openDoc(d);
  }
  const progOf = d => (ST.done.includes(d.key) ? 1 : clamp(store.get('prog', {})[d.key] || 0, 0, 1));
  const minsPlayed = () => (ST.secs ? Math.max(1, Math.round(ST.secs / 60)) : 0);
  function streak() {
    const days = new Set(ST.days); let n = 0;
    const d = new Date(); if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function ago(at) {
    const m = Math.round((Date.now() - at) / 60000);
    return m < 2 ? t('baru saja', 'just now') : m < 60 ? m + t(' menit lalu', ' min ago') : m < 1440 ? Math.round(m / 60) + t(' jam lalu', ' h ago') : m < 2880 ? t('kemarin', 'yesterday') : Math.round(m / 1440) + t(' hari lalu', ' days ago');
  }
  const mdisc = (d, cls = '') => `<span class="mdisc${d && d.side && d.side !== 'a' ? ' b' : ''} ${cls}" style="--lc:${catOf((d || WORKS[0]).cat).ink}" aria-hidden="true"><i></i></span>`;
  // cincin progres untuk sisi A dan B: penuh = selesai, sebagian = sedang dibaca, garis putus = belum ada
  const sideRing = (d, label) => d
    ? `<i class="ring${ST.done.includes(d.key) ? ' done' : ''}" style="--p:${Math.round(progOf(d) * 100)}" title="${label}: ${ST.done.includes(d.key) ? t('selesai', 'finished') : readSet.has(d.key) ? Math.round(progOf(d) * 100) + '%' : t('belum', 'not yet')}">${label}</i>`
    : `<i class="ring none" title="${label}: ${t('belum direkam', 'not recorded')}">${label}</i>`;

  const ringLabel = d => (d?.A?.CH ? String(d.ch) : SL(d));
  // baris kecil di bawah judul trek: karya induk (kalau judulnya beda), sisi atau bab, sudut pandang, jenis
  const trackSub = (d, skipPov) => [d.title !== d.A.title ? esc(d.A.title) : '', d.A.CH ? `${t('Bab', 'Chapter')} ${d.ch}` : sideWord(d),
    d.pov && !skipPov ? (LANG === 'en' ? esc(d.pov) + '’s side' : 'dari sisi ' + esc(d.pov)) : '', esc(catOf(d.cat).label)].filter(Boolean).join(' · ');
  let statsMode = false;
  function renderGreet(animate) {
    const unread = DOCS.filter(d => !readSet.has(d.key));
    const latest = WORKS[0];
    const total = WORKS.reduce((a, w) => a + w.words, 0);
    const twoSided = WORKS.filter(multi).length;
    const last = lastDoc(), lp = last ? progOf(last) : 0;
    const g = $('#tkGreet');
    if (statsMode) {
      const played = Object.entries(ST.plays).sort((a, b) => b[1] - a[1])[0];
      const fav = played && docByKey(played[0]);
      const done = DOCS.filter(d => ST.done.includes(d.key)).length;
      g.innerHTML = LANG === 'en' ? (ST.secs < 30 && !fav
        ? `<span class="dim">You haven’t played anything at this desk yet. Start with</span> <button type="button" data-act="pick" data-key="${crateOrder[0]?.key}">“${esc(crateOrder[0]?.title || '')}”</button><span class="dim">, right for your ${PV.min} spare minutes.</span>`
        : `<span class="dim">You’ve played</span> <span class="nw"><i class="dot-o" aria-hidden="true"></i><span>${minsPlayed()} minutes</span></span> <span class="dim">at this desk.</span>
          <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="selesai">${done} of ${DOCS.length} sides</button></span> <span class="dim">heard to the end.</span>
          ${fav ? `<span class="dim">Most played:</span> <button type="button" data-act="pick" data-key="${fav.key}">“${esc(fav.title)}”</button><span class="dim"> (${played[1]}×).</span>` : ''}
          ${streak() > 1 ? `<span class="nw"><span class="ico-cal" aria-hidden="true"><b>${streak()}</b></span><span>${streak()} days</span></span> <span class="dim">in a row.</span>` : ''}`)
      : ST.secs < 30 && !fav
        ? `<span class="dim">Belum ada yang kamu putar di meja ini. Mulai dengan</span> <button type="button" data-act="pick" data-key="${crateOrder[0]?.key}">“${esc(crateOrder[0]?.title || '')}”</button><span class="dim">, pas untuk ${PV.min} menit luangmu.</span>`
        : `<span class="dim">Kamu sudah memutar</span> <span class="nw"><i class="dot-o" aria-hidden="true"></i><span>${minsPlayed()} menit</span></span> <span class="dim">di meja ini.</span>
          <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="selesai">${done} dari ${DOCS.length} sisi</button></span> <span class="dim">selesai kamu dengar.</span>
          ${fav ? `<span class="dim">Paling sering diputar:</span> <button type="button" data-act="pick" data-key="${fav.key}">“${esc(fav.title)}”</button><span class="dim"> (${played[1]}×).</span>` : ''}
          ${streak() > 1 ? `<span class="nw"><span class="ico-cal" aria-hidden="true"><b>${streak()}</b></span><span>${streak()} hari</span></span> <span class="dim">beruntun.</span>` : ''}`;
    } else {
      g.innerHTML = LANG === 'en' ? `<span class="dim">Good ${{ pagi: 'morning', siang: 'afternoon', sore: 'afternoon' }[dayPart] || 'evening'},</span> <span class="nw"><span class="ava-in" id="tkAva"></span> <span>${esc(SITE.readerName)}.</span></span>
        <span class="dim">This desk holds</span> <span class="nw"><span class="ava-stack" id="tkStack"></span><button type="button" data-act="koleksi" data-f="semua">${WORKS.length} ${WORKS.length === 1 ? 'record' : 'records'}</button></span>${twoSided ? `<span class="dim">,</span> <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="dua">${twoSided} with more than one side</button></span>` : ''}<span class="dim">.</span>
        <span class="dim">You have</span> <span class="nw"><span class="ico-bubble" aria-hidden="true"></span><button type="button" data-act="koleksi" data-f="belum">${unread.length ? unread.length + (unread.length === 1 ? ' side' : ' sides') + ' not yet' : 'no sides left'}</button></span> <button type="button" data-act="koleksi" data-f="belum">${unread.length ? 'played' : 'to play'}</button>${last && lp > .02 && lp < .97
          ? ` <span class="dim">and you’re partway through</span> <button type="button" data-act="pick" data-key="${last.key}">“${esc(last.title)}”</button><span class="dim">.</span>`
          : ` <span class="dim">and</span> <span class="nw"><span class="ico-cal" aria-hidden="true"><b>${new Date(latest.date + 'T00:00:00').getDate()}</b></span><button type="button" data-act="pick" data-key="${latest.key}">the latest</button></span> <span class="dim">came out ${esc(fmt(latest.date, { month: 'long', year: 'numeric' }))}.</span>`}`
      : `<span class="dim">Selamat ${dayPart},</span> <span class="nw"><span class="ava-in" id="tkAva"></span> <span>${esc(SITE.readerName)}.</span></span>
        <span class="dim">Meja ini</span> <span class="nw"><span class="ava-stack" id="tkStack"></span><button type="button" data-act="koleksi" data-f="semua">${WORKS.length} piringan</button></span>${twoSided ? `<span class="dim">,</span> <span class="nw"><span class="ico-ab" aria-hidden="true">B</span><button type="button" data-act="koleksi" data-f="dua">${twoSided} di antaranya bersisi banyak</button></span>` : ''}<span class="dim">.</span>
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
      <span title="${t('piringan', 'records')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>${WORKS.length} ${t('piringan', WORKS.length === 1 ? 'record' : 'records')}</span><i class="sep"></i>
      <span title="${t('sisi', 'sides')}"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="4" ry="8"/></svg>${DOCS.length} ${t('sisi', 'sides')}</span><i class="sep"></i>
      <span title="${t('kata', 'words')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>${num(total)} ${t('kata', 'words')}</span><i class="sep"></i>
      <span title="${t('waktu yang sudah kamu putar', 'time you have played')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>${minsPlayed()} ${t('mnt', 'min')}</span>`;
  }
  $('#tkGreet').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'koleksi') { kFilter = b.dataset.f || 'semua'; setFeedMode('koleksi'); }
    if (b.dataset.act === 'pick') { const d = docByKey(b.dataset.key); if (d) openPicker(d.slug, d.side, d.ch); }
  });
  $('#tkStats').addEventListener('click', e => { statsMode = !statsMode; e.currentTarget.setAttribute('aria-pressed', String(statsMode)); renderGreet(true); });
  $('#tkGear').addEventListener('click', () => {
    const pool = DOCS.filter(d => !readSet.has(d.key));
    const d = (pool.length ? pool : DOCS)[Math.floor(Math.random() * (pool.length || DOCS.length))];
    openPicker(d.slug, d.side, d.ch);
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
    const nch = last && nextChapter(last);
    if (nch) add(nch, t(`Bab berikutnya dari “${esc(last.A.title)}”`, `Next chapter of “${esc(last.A.title)}”`));
    // sisi yang belum didengar dari piringan yang baru diputar
    if (last && multi(last.A)) last.A.S.filter(o => o !== last && !ST.done.includes(o.key)).slice(0, 1).forEach(o => add(o, o.side === 'a' ? t('Kembali ke Sisi A, cerita aslinya', 'Back to Side A, the original story') : t(`${sideWord(o)} dari yang baru kamu dengar: dari sisi ${esc(o.pov || 'yang lain')}`, `${sideWord(o)} of what you just heard: ${esc(o.pov || 'another')}’s side`)));
    WORKS.filter(w => multi(w) && readSet.has(w.key)).forEach(w => { const o = w.S.find(x => !readSet.has(x.key)); if (o) add(o, t(`Sisi A “${esc(w.title)}” sudah kamu baca. Balik piringannya.`, `You’ve read Side A of “${esc(w.title)}”. Flip the record.`)); });
    if (last) linksOf(last.slug).forEach(l => { const o = bySlug(l.a === last.slug ? l.b : l.a); if (!readSet.has(o.key)) add(o, `${t('Benang merah dari', 'A thread from')} “${esc(last.A.title)}”: <i>${l.words.map(esc).join(`</i> ${t('dan', 'and')} <i>`)}</i>`); });
    add(crateOrder.find(w => !readSet.has(w.key)), t(`Pas untuk ${PV.min} menit luangmu`, `Right for your ${PV.min} spare minutes`));
    DOCS.filter(d => !readSet.has(d.key) && !(d.ch > 1)).forEach(d => add(d, d.side !== 'a' ? t(`${sideWord(d)}, dari sisi ${esc(d.pov || 'yang lain')}`, `${sideWord(d)}, ${esc(d.pov || 'another')}’s side`) : t('Belum pernah kamu putar', 'Not played yet')));
    if (!out.length) Object.entries(ST.plays).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => add(docByKey(k), t(`Favoritmu, sudah ${n}× diputar`, `Your favourite, played ${n}×`)));
    return out;
  }
  // lencana kecil di daftar: huruf sisi (B, C, …) atau nomor bab
  const badge = d => (d?.ch > 1 || (d?.A?.CH && d.ch) ? `<i class="ab">${t('Bab', 'Ch.')} ${d.ch}</i>` : d && d.side && d.side !== 'a' ? `<i class="ab">${SL(d)}</i>` : '');
  const sidesTag = d => (d?.A?.CH ? `${t('Bab', 'Chapter')} ${d.ch} · ` : multi(d?.A) ? sideWord(d) + ' · ' : '');
  function nowHTML() {
    const last = lastDoc(), L = store.get('last', null);
    let html = '';
    if (last) {
      const p = progOf(last), left = Math.max(0, Math.round(secsOf(last) * (1 - p)));
      const other = nextChapter(last) || nextSide(last);
      const al = playing();
      html += `<p class="np-h"><span>${p >= .97 ? t('Terakhir diputar', 'Last played') : t('Sedang diputar', 'Now playing')}</span><span>${ago(L.at)}</span></p>${al ? `<a class="np-album" href="#album-${esc(al.id)}"><canvas data-cover="${esc(al.id)}"></canvas><span>${t('Dari album', 'From the album')} <b>${esc(al.title)}</b> · ${PLAY.order.indexOf(PLAY.i) + 1} ${t('dari', 'of')} ${al.tracks.length}</span></a>` : ''}
        <div class="np-card">
          <button type="button" class="np-disc" data-pick="${last.key}" aria-label="${t('Buka', 'Open')} ${esc(last.title)}">${mdisc(last, 'big spin')}</button>
          <div class="np-t"><small>${sidesTag(last)}${esc(catOf(last.cat).label)}${last.pov ? ' · ' + t('dari sisi ' + esc(last.pov), esc(last.pov) + '’s side') : ''}</small>
            <b>${esc(last.title)}</b>
            <span class="np-bar" role="img" aria-label="${Math.round(p * 100)} ${t('persen', 'percent')}"><i style="width:${(p * 100).toFixed(1)}%"></i></span>
            <small>${p >= .97 ? t('selesai', 'finished') : Math.round(p * 100) + '% · ' + t('sisa', 'left') + ' ' + fmtMS(left)}</small></div>
        </div>
        <div class="np-actions">
          <button type="button" class="np-go" data-pick="${last.key}">${p >= .97 ? t('Putar lagi', 'Play again') : t('Lanjutkan', 'Continue')}</button>
          ${other ? `<button type="button" data-pick="${other.key}">${mdisc(other)}${other.ch ? t('Bab berikutnya', 'Next chapter') : t('Balik ke ', 'Flip to ') + sideWord(other)}</button>` : ''}
        </div>`;
    } else {
      html += `<p class="np-h"><span>${t('Belum ada yang diputar', 'Nothing played yet')}</span></p><p class="np-empty">${t('Pilih satu piringan. Meja ini mencatat sampai mana kamu membaca, sisi mana yang sudah kamu balik, dan tulisan apa yang terhubung dengannya.', 'Pick a record. This desk remembers how far you read, which sides you have flipped, and what each piece connects to.')}</p>`;
    }
    const tm = todayMix();
    if (RADIO) html += `<p class="np-h"><span>${t('Radio menyala', 'Radio on')}</span><button type="button" class="np-link" data-radio-stop>${t('Hentikan', 'Stop')}</button></p>
      <div class="np-radio"><span class="nr-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="sg-t"><b>Radio “${esc(bySlug(RADIO.seed).title)}”</b><span>${RADIO.heard.length} ${t('sisi diputar · tulisan yang paling dekat kata dan suasananya', 'played · the pieces closest in words and mood')}</span></span></div>`;
    if (tm) html += `<p class="np-h"><span>${t('Racikan hari ini', 'Today’s mix')}</span><span>${t('berganti dalam', 'changes in')} ${inHours(untilMidnight())}</span></p>
      <div class="np-daily"><button type="button" class="nd-open" data-open-album="${esc(tm.id)}"><canvas data-cover="${esc(tm.id)}" data-size="56"></canvas><span class="sg-t"><b>${esc(tm.title)}</b><span>${esc(tm.sub)} · ${tm.tracks.length} ${t('sisi', 'tracks')} · ${albumMins(tm)} ${t('menit', 'min')}</span></span></button>
      <button type="button" class="nd-play" data-dplay="${esc(tm.id)}" aria-label="${t('Putar', 'Play')} ${esc(tm.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M8 5.5v13l10.5-6.5z"/></svg></button></div>`;
    const qd = QUEUE.map(docByKey).filter(Boolean);
    html += `<p class="np-h"><span>${t('Antreanmu', 'Your queue')}${qd.length ? ' · ' + qd.length : ''}</span>${qd.length ? `<button type="button" class="np-link" data-qclear>${t('Kosongkan', 'Clear')}</button>` : ''}</p>`;
    html += qd.length
      ? `<ul class="tk-list q">${qd.map((d, i) => `<li style="--k:${i}"><button type="button" data-qplay="${i}">${mdisc(d)}<span class="sg-t"><b>${esc(d.title)}${badge(d)}</b><span>${i === 0 ? t('Berikutnya · ', 'Up next · ') : ''}${esc(catOf(d.cat).label)} · ${d.minutes} ${t('mnt', 'min')}</span></span></button><span class="q-btns"><button type="button" data-qup="${i}" aria-label="${t('Naikkan', 'Move up')}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-qrm="${i}" aria-label="${t('Keluarkan dari antrean', 'Remove from queue')}">×</button></span></li>`).join('')}</ul>
        <div class="np-actions"><button type="button" class="np-go" data-qplay="0">${t('Putar antrean', 'Play queue')}</button><button type="button" data-qshare>${QICON.replace('M17.5 14v6M14.5 17h6', 'M15 17.5l3-3 3 3M18 14.5V21')}${t('Bagikan sebagai racikan', 'Share as a mix')}</button></div>`
      : `<p class="np-empty">${t('Tekan <b>Tambah ke antrean</b> di pemilih piringan atau di halaman album untuk menyusun urutan bacamu sendiri. Antrean diputar lebih dulu, lalu album dilanjutkan.', 'Tap <b>Add to queue</b> in the record picker or on an album page to line up your own reading order. The queue plays first, then the album carries on.')}</p>`;
    const sug = suggestions(last);
    if (sug.length) html += `<p class="np-h"><span>${t('Berikutnya untukmu', 'Up next for you')}</span></p><ul class="tk-list sug">${sug.map((s, i) => `<li style="--k:${i}"><button type="button" data-pick="${s.d.key}">${mdisc(s.d)}<span class="sg-t"><b>${esc(s.d.title)}${badge(s.d)}</b><span>${s.why}</span></span><span class="sg-m">${s.d.minutes} ${t('mnt', 'min')}</span></button></li>`).join('')}</ul>`;
    const done = DOCS.filter(d => ST.done.includes(d.key)).length, multis = WORKS.filter(multi), flipped = multis.filter(w => w.S.every(x => readSet.has(x.key))).length;
    html += `<div class="np-stats">
      <div><b>${minsPlayed()}</b><span>${t('menit diputar', 'minutes played')}</span></div>
      <div><b>${done}<small>/${DOCS.length}</small></b><span>${t('sisi selesai', 'tracks finished')}</span></div>
      <div><b>${flipped}<small>/${multis.length}</small></b><span>${t('piringan dibalik', 'records flipped')}</span></div>
      <div><b>${streak()}</b><span>${t('hari beruntun', 'day streak')}</span></div></div>`;
    return html;
  }


  /* ---------- Koleksi: setiap piringan dengan cincin sisi A dan B ---------- */
  const K_FILTERS = [['semua', t('Semua', 'All')], ['belum', t('Belum diputar', 'Not played')], ['dua', t('Banyak sisi', 'Many sides')], ['bab', t('Berbab', 'Chaptered')], ['selesai', t('Selesai', 'Finished')]];
  const tracksOf = w => w.CH || w.S;
  // cincin progres: satu per sisi; karya berbab cukup satu cincin untuk seluruh bab
  function workRings(w) {
    if (w.CH) {
      const n = w.CH.filter(c => ST.done.includes(c.key)).length;
      return `<i class="ring${n === w.CH.length ? ' done' : ''}" style="--p:${Math.round(n / w.CH.length * 100)}" title="${n}/${w.CH.length} ${t('bab', 'chapters')}">${n}</i>`;
    }
    return w.S.map(d => sideRing(d, SL(d))).join('') + (w.S.length === 1 ? sideRing(null, 'B') : '');
  }
  function koleksiHTML() {
    const pass = w => kFilter === 'semua' || (kFilter === 'dua' && multi(w)) || (kFilter === 'bab' && !!w.CH) ||
      (kFilter === 'belum' && tracksOf(w).some(d => !readSet.has(d.key))) ||
      (kFilter === 'selesai' && tracksOf(w).some(d => ST.done.includes(d.key)));
    const list = all().filter(w => pass(w) && (!svOn() || svMatch(w)));
    return `<div class="kc-filters" role="radiogroup" aria-label="${t('Saring koleksi', 'Filter collection')}">${K_FILTERS.filter(([k]) => k !== 'bab' || WORKS.some(w => w.CH)).map(([k, l]) => `<button type="button" role="radio" data-kf="${k}" aria-checked="${k === kFilter}">${l}</button>`).join('')}<button type="button" class="kc-sieve${svOn() ? ' on' : ''}" data-sieve>${SIEVE_ICON}<span>${svOn() ? esc(svSummary()) : t('Saring', 'Filter')}</span><b class="sv-n">${svOn() ? svWorks().length : ''}</b></button></div>
      <ul class="tk-list kc">${list.map((w, i) => `<li style="--k:${i}"><button type="button" data-pick="${w.key}">${mdisc(w)}
        <span class="sg-t"><b>${esc(w.title)}</b><span>${esc(catOf(w.cat).label)} · ${w.CH ? `${w.CH.length} ${t('bab', 'chapters')} · ${w.minutes} ${t('mnt', 'min')}` : multi(w) ? `${w.S.length} ${t('sisi', 'sides')} · ${w.S.reduce((n, d) => n + d.minutes, 0)} ${t('mnt', 'min')}` : `${w.minutes} ${t('mnt', 'min')}`}</span></span>
        <span class="kc-ab">${workRings(w)}</span></button></li>`).join('') || `<li class="tk-none">${t('Tidak ada piringan di sini.', 'No records here.')}</li>`}</ul>`;
  }

  /* ---------- Kutipan: kalimat dari kedua sisi, bisa langsung dibaca dari situ ---------- */
  function quoteOf(d, seed) {
    const ps = d.body.map((p, i) => [plain(p).replace(/\s*\n\s*/g, d.form === 'puisi' ? '\n' : ' '), i]).filter(([p]) => p.length > 40 && !/^(#|\||- |\d+\. )/.test(p));
    const pick = ps.filter(([p]) => p.length < 280);
    return (pick.length ? pick : ps.length ? ps : [[plain(d.body[0]), 0]])[seed % (pick.length || ps.length || 1)];
  }
  const noteOf = d => `${d.ch ? t(`Dari bab ${d.ch} “${esc(d.A.title)}”:`, `From chapter ${d.ch} of “${esc(d.A.title)}”:`) : d.side !== 'a' ? t(`Dari <b>${sideWord(d)}</b> “${esc(d.A.title)}”, dari sisi ${esc(d.pov || 'yang lain')}:`, `From <b>${sideWord(d)}</b> of “${esc(d.A.title)}”, ${esc(d.pov || 'another')}’s side:`) : t(`Dari ${esc(catOf(d.cat).label.toLowerCase())}`, `From the ${esc(catOf(d.cat).label.toLowerCase())}`)} <button type="button" data-pick="${d.key}">“${esc(d.title)}”</button> <span class="spark"><canvas data-spark="${d.key}"></canvas></span> ${fmtLong(d.date)}, ${d.words} ${t('kata', 'words')}.${multi(d.A) && d.side === 'a' ? t(` Piringan ini punya ${d.A.S.length} sisi: ${d.A.S.slice(1).map(x => `<button type="button" data-pick="${x.key}">${sideWord(x)}</button> dari sisi ${esc(x.pov || 'yang lain')}`).join(', ')}.`, ` This record has ${d.A.S.length} sides: ${d.A.S.slice(1).map(x => `<button type="button" data-pick="${x.key}">${sideWord(x)}</button>, ${esc(x.pov || 'another')}’s side`).join('; ')}.`) : ''}`;
  async function renderFeed(rotate) {
    clearTimeout(feedT);
    feed.classList.toggle('plain', feedMode !== 'feed');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === feedMode)));
    const mi = MODES.indexOf(feedMode);
    $('.tk-seg').style.setProperty('--x', Math.max(0, mi));
    $('.tk-seg').classList.toggle('none', mi < 0);
    if (feedMode === 'now') { feed.innerHTML = `<div class="np">${nowHTML()}</div>`; $$('canvas[data-cover]', feed).forEach(c => paintCover(c, albumOf(c.dataset.cover), +c.dataset.size || 40)); return; }
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
    if (e.target.closest('[data-radio-stop]')) { stopRadio(); renderFeed(false); return; }
    const oa = e.target.closest('[data-open-album]');
    if (oa) { location.hash = 'album-' + oa.dataset.openAlbum; return; }
    const dp = e.target.closest('[data-dplay]');
    if (dp) { playAlbum(dp.dataset.dplay, 0); return; }
    const qp = e.target.closest('[data-qplay]');
    if (qp) { playFromQueue(+qp.dataset.qplay); return; }
    const qu = e.target.closest('[data-qup]');
    if (qu && !qu.disabled) { const i = +qu.dataset.qup; [QUEUE[i - 1], QUEUE[i]] = [QUEUE[i], QUEUE[i - 1]]; saveQ(); return; }
    const qr = e.target.closest('[data-qrm]');
    if (qr) { QUEUE.splice(+qr.dataset.qrm, 1); saveQ(); return; }
    if (e.target.closest('[data-qshare]')) { openMix(QUEUE.slice()); return; }
    if (e.target.closest('[data-qclear]')) { const old = QUEUE; QUEUE = []; saveQ(); toast('Antrean dikosongkan.', { label: 'Urungkan', run: () => { QUEUE = old; saveQ(); } }); return; }
    const kf = e.target.closest('[data-kf]');
    if (kf) { kFilter = kf.dataset.kf; renderFeed(false); return; }
    const pk = e.target.closest('[data-pick]');
    if (pk) { const d = docByKey(pk.dataset.pick); if (d) openPicker(d.slug, d.side, d.ch); return; }
    const at = e.target.closest('[data-at]');
    if (at) { const d = docByKey(at.dataset.at); if (d) openAt(d, +at.dataset.para || 0, at.dataset.q || ''); return; }
    if (e.target.closest('.fd-next')) { feedIdx++; renderFeed(true); return; }
    if (e.target.closest('[data-clear]')) { $('#tkInput').value = ''; setFeedMode('now'); }
  });
  $('#chipRandom').addEventListener('click', () => $('#tkGear').click());
  $('#chipMail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SITE.email); toast(t(`Alamat ${SITE.email} disalin.`, `Copied ${SITE.email}.`)); }
    catch (e) { toast(t('Alamat surat: ', 'Email: ') + SITE.email); }
  });
  // cari kalimat: setiap hasil membuka tulisan tepat di paragraf itu, dengan kalimatnya disorot
  $('#tkAsk').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#tkInput').value.trim();
    if (!q) { $('#tkInput').focus(); return; }
    const res = search(q);
    feedMode = 'search'; clearTimeout(feedT);
    renderFeed(false);
    feed.innerHTML = `<p class="tk-res-h"><span>${t(`${res.length} hasil untuk “${esc(q)}”`, `${res.length} results for “${esc(q)}”`)}</span><button type="button" data-clear>${t('hapus', 'clear')}</button></p>
      <ul class="tk-list">${res.map((r, i) => `<li style="--k:${i}"><button type="button" data-at="${r.w.key}" data-para="${r.para}" data-q="${esc(q)}">${mdisc(r.w)}<span class="sg-t"><b>${esc(r.w.title)}${badge(r.w)}</b><span>${r.snip}</span></span></button></li>`).join('') || `<li class="tk-none">${t('Tidak ada kalimat yang cocok.', 'No sentence matches.')}</li>`}</ul>`;
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
    body.lang = w.lost || LANG;
    body.innerHTML = w.body.map((p, i) => isBreak(p) ? SCENE : `<p${w.form === 'puisi' ? ' class="stanza"' : ''} style="--k:${Math.min(i, 10)}">${mark(p)}</p>`).join('');
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
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${t(`${n} kalimat, terpanjang ${max} kata`, `${n} sentences, longest ${max} words`)}">${lens.map((l, i) => {
      const h = Math.max(3, l / max * (H - 4));
      return `<rect style="--k:${i}" x="${(i * bw + (bw - bar) / 2).toFixed(1)}" y="${((H - h) / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(bar / 2, 4)}" fill="currentColor" opacity="${(.35 + .65 * l / max).toFixed(2)}"><title>${l} ${t('kata', 'words')}</title></rect>`;
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
  // kartu di akhir tulisan: sisi berikutnya dari piringan yang sama, atau bab berikutnya
  function renderFlip(d) {
    const w = d.A, fb = $('#rdFlip'), fc = $('#rdFlipCard');
    const nc = nextChapter(d), ns = !w.CH && nextSide(d), other = nc || ns;
    card.dataset.side = d.side;
    fb.hidden = !ns;
    fc.hidden = !other;
    if (ns) {
      $('span', fb).textContent = sideWord(ns);
      fb.setAttribute('aria-label', t(`Balik ke ${sideWord(ns)}: ${ns.title}`, `Flip to ${sideWord(ns)}: ${ns.title}`));
    }
    if (!other) return;
    fc.href = hrefOf(other);
    fc.style.setProperty('--lc', catOf(w.cat).ink);
    const kick = nc ? t(`Bab berikutnya · ${nc.ch} dari ${w.CH.length}`, `Next chapter · ${nc.ch} of ${w.CH.length}`)
      : ns.side === 'a' ? t('Kembali ke Sisi A', 'Back to Side A') : t(`Balik piringannya · ${sideWord(ns)}`, `Flip the record · ${sideWord(ns)}`);
    const sub = nc ? `${nc.minutes} ${t('menit', 'min')}`
      : ns.side === 'a' ? `${ns.pov ? t('Cerita aslinya, dari sisi ' + esc(ns.pov), 'The original story, ' + esc(ns.pov) + '’s side') : t('Cerita aslinya', 'The original story')} · ${ns.minutes} ${t('menit', 'min')}`
      : `${t('Cerita yang sama, dari sisi ' + esc(ns.pov || 'yang lain'), 'The same story, ' + esc(ns.pov || 'another') + '’s side')} · ${ns.minutes} ${t('menit', 'min')}`;
    fc.innerHTML = `<span class="fc-disc" aria-hidden="true"><i></i></span>
      <span class="fc-t"><small>${kick}</small><b>${esc(other.title)}</b><span>${sub}</span>
      ${ns && w.S.length > 2 ? `<span class="fc-dots" aria-hidden="true">${w.S.map(x => `<i class="${x === d ? 'cur' : x === ns ? 'next' : ''}">${SL(x)}</i>`).join('')}</span>` : ''}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;
  }
  // judul karya di atas judul sisi/bab, deretan sisi atau bab, dan catatan terjemahan
  function renderHead(d) {
    const w = d.A, wk = $('#rdWork'), nav = $('#rdSides');
    const own = d.title !== w.title;
    wk.hidden = !(own || w.CH || multi(w));
    wk.innerHTML = w.CH ? `${esc(w.title)} · ${t('Bab', 'Chapter')} ${d.ch} ${t('dari', 'of')} ${w.CH.length}` : `${esc(w.title)}${multi(w) ? ' · ' + sideWord(d) : ''}`;
    const list = w.CH || (multi(w) ? w.S : null);
    nav.hidden = !list;
    if (list) nav.innerHTML = list.map(x => `<a href="${hrefOf(x)}" class="${x === d ? 'cur' : ''}${readSet.has(x.key) ? ' seen' : ''}" ${x === d ? 'aria-current="page"' : ''} title="${esc(x.title)}">${w.CH ? x.ch : SL(x)}<span>${esc(x.title)}</span></a>`).join('');
    $('#rdLost').hidden = !d.lost;
    $('#rdLost').textContent = d.lost === 'en' ? t('Tulisan ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.', 'This part isn’t available in Indonesian yet, so it’s shown in the original English.')
      : t('Bagian ini belum tersedia dalam bahasa Indonesia, jadi ditampilkan dalam bahasa aslinya.', 'This part isn’t available in English yet, so it’s shown in the original Indonesian.');
  }

  function showReader(slug, side = 'a', ch = 1) {
    // karya dengan pengalaman baca sendiri (mis. Anda di Sini) dibuka di halamannya; entri #baca diganti supaya tombol kembali tidak memantul
    const ex = bySlug(slug)?.experience;
    if (ex) {
      const fragment = slug === 'interlude' && ch > 1 ? '#bab-' + ch : slug === 'terlambat-satu-menit' ? '#' + side : '';
      location.replace(new URL(String(ex) + location.search + fragment, location.href.split('#')[0]).href); return;
    }
    const w = docOf(slug, side, ch) || docOf(slug);
    if (!w) return;
    stopSpeech(false); closeFind(); stopReplay(false); hideQuotePop();
    current = w; speakIdx = 0;
    const viaQ = pendingQueue, viaR = pendingRadio; pendingQueue = false; pendingRadio = false;
    // membuka tulisan di luar radio (bukan dari antrean) menghentikan radionya
    if (RADIO && !viaR && !viaQ) { RADIO = null; saveRadio(); }
    if (RADIO && !RADIO.heard.includes(w.key)) { RADIO.heard = [...RADIO.heard, w.key]; saveRadio(); }
    const qi = QUEUE.indexOf(w.key);
    if (qi >= 0) { QUEUE.splice(qi, 1); saveQ(); }
    // sisi dari antrean tidak memutus album: album lanjut dari posisinya setelah antrean habis
    if (!viaQ && !RADIO) syncPlay(w);
    setView('baca');
    $('#rdBackLabel').textContent = playing() ? (playing().shared || playing().daily ? t('Racikan', 'Mix') : 'Album') : { sapa: t('Sapa', 'Hello'), putar: t('Piringan', 'Records'), pilih: t('Piringan', 'Records'), album: 'Album', tentang: t('Profil', 'Profile') }[prevView] || t('Piringan', 'Records');
    $('#rdCrumb').textContent = `${catOf(w.cat).label} · ${w.A.title}${w.A.CH ? ' · ' + t('Bab', 'Ch.') + ' ' + w.ch : multi(w.A) ? ' · ' + sideWord(w) : ''}`;
    const al = playing(), inAlbum = al && al.tracks[PLAY.i]?.key === w.key;
    $('#rdMeta').innerHTML = `${RADIO ? `<button type="button" class="radio-tag" data-radio-stop title="${t('Hentikan radio', 'Stop radio')}"><i aria-hidden="true"></i>Radio “${esc(bySlug(RADIO.seed).title)}”</button>` : ''}${viaQ ? `<span class="q-tag">${QICON}${t('dari antrean', 'from your queue')}</span>` : ''}${inAlbum ? `<a class="al-tag" href="#album-${esc(al.id)}">${mdisc(w)}${esc(al.title)} · ${PLAY.order.indexOf(PLAY.i) + 1}/${al.tracks.length}</a>` : ''}${multi(w.A) ? `<span class="side-tag">${esc(sideLine(w))}</span>` : ''}<span>${esc(catOf(w.cat).label)}</span><span>No. ${w.no}</span><span>${fmtLong(w.date)}</span><span>${num(w.words)} ${t('kata', 'words')} · ${w.minutes} ${t('menit', 'min')}</span>${w.draft ? `<span class="draft-tag">${t('draf', 'draft')}</span>` : ''}`;
    $('#rdTitle').textContent = w.title;
    renderHead(w);
    renderBody('', true);
    rhythm($('#rdRhythm'), w.lens);
    renderFlip(w);
    renderLinerCard(w);
    const rOn = RADIO && RADIO.seed;
    $('#rrKick').textContent = rOn ? 'Radio menyala' : 'Radio';
    $('#rrTitle').textContent = rOn ? `Radio “${bySlug(RADIO.seed).title}”` : 'Mulai radio dari tulisan ini';
    $('#rrSub').textContent = rOn ? t(`${RADIO.heard.length} sisi diputar. Ketuk untuk menghentikan.`, `${RADIO.heard.length} sides played. Tap to stop.`) : 'Tulisan yang paling dekat kata dan suasananya, dibacakan tanpa henti.';
    $('#rdRadio').classList.toggle('on', !!rOn);
    const nb = neighbors(), { prev } = nb, qNext = QUEUE.length ? docByKey(QUEUE[0]) : null, next = qNext || nb.next;
    renderRelated(w.A);
    $('#rdNextLink').href = next ? hrefOf(next) : '#album-' + nb.album.id;
    $('#rdNextLink').dataset.queue = qNext ? '1' : '';
    $('span', $('#rdNextLink')).textContent = qNext ? t(`berikutnya di antreanmu · ${QUEUE.length} menunggu`, `next in your queue · ${QUEUE.length} waiting`) : nb.album ? (next ? t(`berikutnya di ${kindOf(nb.album)} “${nb.album.title}” · ${nb.pos + 1}/${nb.len}`, `next in the ${kindOf(nb.album).toLowerCase()} “${nb.album.title}” · ${nb.pos + 1}/${nb.len}`) : t(`${kindOf(nb.album)} “${nb.album.title}” selesai`, `${kindOf(nb.album)} “${nb.album.title}” finished`)) : 'berikutnya';
    $('b', $('#rdNextLink')).textContent = next ? next.title : t('Kembali ke ', 'Back to ') + kindOf(nb.album);
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
    const dir = side > (current?.side || 'a') ? 1 : -1;
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
    openDoc(d);
  }
  scroller.tabIndex = -1;
  function openWork(slug, fromEl, side = 'a', ch = 1) {
    if (fromEl) morphFrom = fromEl;
    const d = docOf(slug, side, ch) || docOf(slug); if (!d) return;
    const h = hrefOf(d);
    if (location.hash === h) vt(() => showReader(d.slug, d.side, d.ch)); else location.hash = h.slice(1);
  }
  const openDoc = (d, fromEl) => d && openWork(d.slug, fromEl, d.side, d.ch);
  $('#rdBack').addEventListener('click', () => {
    const al = playing();
    if (al) location.hash = 'album-' + al.id;
    else if (prevView === 'pilih' && PK.slug) openPicker(PK.slug, PK.side, PK.ch);
    else go(['sapa', 'album'].includes(prevView) ? prevView : 'putar');
  });
  $('#rdRadio').addEventListener('click', () => { if (RADIO) { stopRadio(); $('#rdRadio').classList.remove('on'); $('#rrTitle').textContent = 'Mulai radio dari tulisan ini'; $('#rrKick').textContent = 'Radio'; } else if (current) startRadio(current.A.slug); });
  $('#rdMeta').addEventListener('click', e => { if (e.target.closest('[data-radio-stop]')) { stopRadio(); $('#rdRadio').classList.remove('on'); } });
  $('#rdFlip').addEventListener('click', () => { const ns = current && nextSide(current); if (ns) location.hash = hrefOf(ns).slice(1); });
  const openKey = k => { const d = docByKey(k); if (d) { if (QUEUE[0] === k) pendingQueue = true; if (playing() || pendingQueue) pendingStart = 0; openDoc(d); } };
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
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  function upNextOf(d) {
    const qd = QUEUE.map(docByKey).find(x => x && x.key !== d.key);
    if (!qd && RADIO) { const r = radioNext(d); if (r) return r; }
    if (qd) return { d: qd, why: t('Dari antreanmu', 'From your queue') + (QUEUE.length > 1 ? ' · ' + QUEUE.length + t(' menunggu', ' waiting') : ''), queue: true };
    const al = playing();
    if (al) { const nb = neighbors(); return nb.next ? { d: nb.next, why: `${kindOf(al)[0].toUpperCase() + kindOf(al).slice(1)} “${esc(al.title)}” · ${nb.pos + 1} ${t('dari', 'of')} ${nb.len}` } : { end: al }; }
    const nc = nextChapter(d);
    if (nc) return { d: nc, why: t(`Bab ${nc.ch} dari ${d.A.CH.length}`, `Chapter ${nc.ch} of ${d.A.CH.length}`) };
    // sisi berikutnya yang belum selesai, berputar mulai dari sisi sesudahnya
    if (multi(d.A)) {
      const S = d.A.S, i = S.indexOf(d);
      for (let k = 1; k < S.length; k++) {
        const o = S[(i + k) % S.length];
        if (!ST.done.includes(o.key)) return { d: o, why: o.side === 'a' ? t('Kembali ke Sisi A, cerita aslinya', 'Back to Side A, the original story') : t(`Balik piringannya · ${sideWord(o)}, dari sisi ${esc(o.pov || 'yang lain')}`, `Flip the record · ${sideWord(o)}, ${esc(o.pov || 'another')}’s side`) };
      }
    }
    const s = suggestions(d).find(x => x.d.key !== d.key);
    return s ? { d: s.d, why: s.why } : null;
  }
  function showUpNext(d, listen) {
    if (!d || view !== 'baca' || UN.shownFor === d.key) return;
    const n = upNextOf(d);
    if (!n) return;
    UN.shownFor = d.key; UN.next = n.d || null; UN.listen = listen; UN.queue = !!n.queue; UN.radio = !!n.radio;
    unEl.classList.toggle('end', !!n.end);
    if (n.end) {
      $('#unWhy').textContent = t((n.end.shared || n.end.daily ? 'Racikan' : 'Album') + ' selesai', (n.end.shared || n.end.daily ? 'Mix' : 'Album') + ' finished');
      $('#unTitle').textContent = n.end.title;
      $('#unMeta').innerHTML = `<button type="button" data-again="${esc(n.end.id)}">${t('Putar lagi', 'Play again')}</button> <a href="#album-${esc(n.end.id)}">${t('Ke ' + kindOf(n.end), 'Go to ' + kindOf(n.end))}</a>`;
      $('#unDisc').style.setProperty('--lc', catOf(n.end.tracks[0].cat).ink);
      $('#unDisc').classList.remove('b');
    } else {
      $('#unWhy').innerHTML = 'Berikutnya · ' + n.why;
      $('#unTitle').textContent = n.d.title;
      $('#unMeta').textContent = `${sidesTag(n.d)}${catOf(n.d.cat).label} · ${n.d.minutes} ${t('menit', 'min')}${listen ? t(' · dibacakan', ' · read aloud') : ''}`;
      $('#unDisc').style.setProperty('--lc', catOf(n.d.cat).ink);
      $('#unDisc').classList.toggle('b', n.d.side !== 'a');
    }
    unEl.hidden = false; win.classList.add('upnext-on');
    if (typeof Lyr !== 'undefined') Lyr.ending(n);
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
    // di layar sentuh :hover bisa menempel di titik ketukan terakhir, jadi hanya perangkat berkursor yang menjeda
    if (!document.hidden && !(canHover.matches && unEl.matches(':hover'))) UN.left -= dt;
    setArc(Math.max(0, UN.left / UN.total));
    if (UN.left <= 0) { playUpNext(); return; }
    UN.raf = requestAnimationFrame(tickUpNext);
  }
  function hideUpNext() { cancelAnimationFrame(UN.raf); unEl.hidden = true; UN.next = null; win.classList.remove('upnext-on'); if (typeof Lyr !== 'undefined') Lyr.ending(null); }
  function playUpNext() {
    const d = UN.next, listen = UN.listen, viaQ = UN.queue, viaR = UN.radio;
    hideUpNext();
    if (!d) return;
    pendingStart = 0; pendingListen = listen; pendingQueue = viaQ; pendingRadio = viaR;
    if (current && current.slug === d.slug) {
      // sisi lain piringan yang sama: kartu baca ikut berbalik
      location.hash = hrefOf(d).slice(1);
    } else openDoc(d);
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
  /* ---------- SEDANG DIPUTAR di layar kunci: Media Session + audio senyap ---------- */
  // Layar kunci hanya menampilkan kontrol untuk elemen media sungguhan, bukan suara Web Speech.
  // Jadi selama dibacakan, audio yang nyaris senyap ikut berputar dan kartu "sedang diputar" diisi lewat Media Session.
  const Now = (() => {
    const MS = 'mediaSession' in navigator ? navigator.mediaSession : null;
    let audio = null, idleT = 0;
    const art = {};
    function silence() {
      const sr = 8000, n = sr * 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const w = (o, str) => [...str].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      // getaran ±1 dari 32768: tak terdengar, tapi tidak dianggap hening oleh peramban
      for (let k = 0; k < n; k++) v.setInt16(44 + k * 2, k % 2 ? 1 : -1, true);
      return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    }
    // sampul layar kunci: piringan dengan label warna jenis dan seni benang tulisannya
    function artOf(d, S = 512) {
      if (art[d.key]) return art[d.key];
      const c = document.createElement('canvas'); c.width = c.height = S;
      const x = c.getContext('2d'), ink = catOf(d.cat).ink, r = S / 2;
      x.fillStyle = '#0E0F11'; x.fillRect(0, 0, S, S);
      x.fillStyle = '#0B0B0C'; x.beginPath(); x.arc(r, r, r * .96, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
      for (let g = r * .42; g < r * .94; g += 5) { x.beginPath(); x.arc(r, r, g, 0, Math.PI * 2); x.stroke(); }
      const tc = document.createElement('canvas');
      drawThread(tc, fullText(d), { w: S, h: S, pad: S * .06, color: ink, seed: d.key, weight: 1.4, pins: false });
      x.globalAlpha = .55; x.drawImage(tc, 0, 0, S, S); x.globalAlpha = 1;
      x.fillStyle = d.side !== 'a' ? '#F4F4F5' : ink; x.beginPath(); x.arc(r, r, r * .46, 0, Math.PI * 2); x.fill();
      x.fillStyle = d.side !== 'a' ? '#0D0D0E' : 'rgba(0,0,0,.75)'; x.textAlign = 'center';
      x.font = `600 ${Math.round(S * .038)}px Geist, system-ui, sans-serif`;
      // judul di atas lubang tengah, keterangan sisi di bawahnya
      const lines = wrapLines(x, d.title, r * .66);
      if (lines.length > 2) lines.splice(1, lines.length, lines[1] + '…');
      lines.forEach((ln, k) => x.fillText(ln, r, r - S * (lines.length > 1 ? .092 : .045) + k * S * .046));
      x.font = `500 ${Math.round(S * .026)}px Geist, system-ui, sans-serif`;
      x.fillText((d.A.CH ? t('BAB ', 'CHAPTER ') + d.ch : sideWord(d).toUpperCase()) + ' · ' + SITE.author.toUpperCase(), r, r + S * .085);
      x.fillStyle = '#0E0F11'; x.beginPath(); x.arc(r, r, S * .018, 0, Math.PI * 2); x.fill();
      return (art[d.key] = c.toDataURL('image/png'));
    }
    function meta(d) {
      if (!MS || !d) return;
      const al = playing();
      try {
        MS.metadata = new MediaMetadata({ title: d.title, artist: SITE.author + (d.A.CH ? ' · ' + t('Bab ', 'Chapter ') + d.ch : multi(d.A) ? ' · ' + sideWord(d) : ''), album: al ? al.title : d.title !== d.A.title ? d.A.title : `${catOf(d.cat).label} · ${SITE.title}`, artwork: [{ src: artOf(d), sizes: '512x512', type: 'image/png' }] });
      } catch (e) { /* tidak didukung */ }
    }
    return {
      play(d) {
        clearTimeout(idleT);
        if (!audio) { audio = new Audio(silence()); audio.loop = true; audio.preload = 'auto'; audio.setAttribute('playsinline', ''); }
        if (audio.paused) audio.play().catch(() => {});
        meta(d);
        if (MS) MS.playbackState = 'playing';
      },
      pause() { if (audio) audio.pause(); if (MS) MS.playbackState = 'paused'; },
      // berhenti total; "lunak" memberi jeda supaya sisi berikutnya bisa menyambung tanpa izin ulang
      stop(hard) {
        clearTimeout(idleT);
        const end = () => { if (audio) audio.pause(); if (MS) { MS.playbackState = 'none'; MS.metadata = null; } };
        if (hard) end(); else idleT = setTimeout(end, 20000);
      },
      position(i, n, d) {
        if (!MS || !MS.setPositionState || !d) return;
        const dur = secsOf(d);
        try { MS.setPositionState({ duration: dur, position: Math.min(dur, dur * i / Math.max(1, n)), playbackRate: 1 }); } catch (e) { /* */ }
      },
      on(handlers) { if (MS) Object.entries(handlers).forEach(([k, fn]) => { try { MS.setActionHandler(k, fn); } catch (e) { /* aksi tidak didukung */ } }); },
      artOf
    };
  })();

  // Dibacakan per kalimat (per baris untuk puisi): jeda dan lanjut jadi tepat, dan lirik bisa ikut menyala kalimat demi kalimat.
  let speaking = false, speakIdx = 0, speakSent = 0, speakTok = 0, speakPaused = false, PLAN = [], planFor = null;
  function speechPlan() {
    if (planFor === current?.key && PLAN.length) return PLAN;
    PLAN = []; planFor = current?.key;
    if (!current) return PLAN;
    current.body.forEach((p, para) => {
      if (isBreak(p)) return;
      const us = units(plain(p), current.form === 'puisi');
      (us.length ? us : [plain(p)]).forEach((text, k) => PLAN.push({ para, text, first: k === 0 }));
    });
    return PLAN;
  }
  const firstOf = para => Math.max(0, speechPlan().findIndex(x => x.para >= para));
  function stopSpeech(hard = true) {
    speakTok++; speaking = false; speakPaused = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
    $('#rsVoice').setAttribute('aria-pressed', 'false');
    Now.stop(hard); renderLs(); Lyr.sync();
  }
  function pauseSpeech() {
    if (!speaking) return;
    speakTok++; speaking = false; speakPaused = true;
    speechSynthesis.cancel();
    $('#rsVoice').setAttribute('aria-pressed', 'false');
    Now.pause(); renderLs(); Lyr.sync();
  }
  // mulai dari paragraf (angka) atau dari kalimat tertentu ({ sent })
  function startSpeech(from = 0) {
    if (!('speechSynthesis' in window)) { toast('Peramban ini belum bisa membacakan teks.'); return; }
    speechSynthesis.cancel();
    const plan = speechPlan(); if (!plan.length) return;
    const tok = ++speakTok;
    speaking = true; speakPaused = false;
    $('#rsVoice').setAttribute('aria-pressed', 'true');
    const paras = [...body.children], d = current;
    Now.play(d);
    // suara mengikuti bahasa teksnya: bagian yang belum diterjemahkan tetap dibacakan dalam bahasa dasarnya
    const tongue = (current?.lost || LANG) === 'en' ? 'en-GB' : 'id-ID';
    const vs = speechSynthesis.getVoices();
    const voice = tongue === 'en-GB' ? vs.find(v => /^en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) : vs.find(v => /^id|indones/i.test(v.lang + v.name));
    const next = s => {
      if (tok !== speakTok) return;
      if (s >= plan.length) {
        $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
        // selesai dibacakan sampai kalimat terakhir: audio senyap dibiarkan sebentar supaya sisi berikutnya bisa menyambung
        stopSpeech(false);
        if (current) {
          if (!ST.done.includes(current.key)) { ST.done = [...ST.done, current.key]; saveST(); }
          // pengatur waktu tidur "akhir sisi" / "akhir album": berhenti di sini, tanpa menyambung
          const nx = upNextOf(current);
          if (Sleep.mode === 'side' || (Sleep.mode === 'album' && (!nx || nx.end || !playing() || nx.queue))) { sleepNow(); return; }
          UN.shownFor = null; showUpNext(current, true);
        }
        return;
      }
      // waktu tidur habis: kalimat yang sedang dibaca sudah selesai, jadi berhenti di sini
      if (Sleep.pending) { speakSent = s; sleepNow(); return; }
      const it = plan[s], changed = it.para !== speakIdx || s === start;
      speakSent = s; speakIdx = it.para;
      if (changed) {
        $$('.speaking', body).forEach(p => p.classList.remove('speaking'));
        paras[it.para]?.classList.add('speaking');
        if (paras[it.para] && !Lyr.open) scrollToPara(paras[it.para]);
      }
      renderLs(); Now.position(s, plan.length, d); Lyr.sync();
      const u = new SpeechSynthesisUtterance(it.text);
      const fade = sleepFade();
      u.lang = tongue; if (voice) u.voice = voice; u.rate = .95 * (.85 + .15 * fade); u.volume = fade;
      // bila peramban mengirim posisi kata, baris lirik terisi seperti karaoke
      u.onboundary = e => { if (tok === speakTok && e.charIndex != null) Lyr.fill(s, (e.charIndex + (e.charLength || 0)) / Math.max(1, it.text.length)); };
      u.onend = () => { Lyr.fill(s, 1); next(s + 1); }; u.onerror = () => { if (tok === speakTok) stopSpeech(); };
      speechSynthesis.speak(u);
    };
    if (isMobile()) setSheet(false);
    const start = typeof from === 'object' ? clamp(from.sent, 0, plan.length - 1) : firstOf(clamp(from, 0, paras.length - 1));
    speakIdx = -1;
    next(start);
  }
  // bilah dengar di dalam kartu baca, dengan tombol yang sama seperti di layar kunci
  function renderLs() {
    const on = (speaking || speakPaused) && view === 'baca' && !!current;
    const bar = $('#lsBar');
    bar.hidden = !on; win.classList.toggle('listening', on);
    if (!on) return;
    bar.classList.toggle('paused', speakPaused);
    $('#lsPlay').setAttribute('aria-label', speakPaused ? 'Lanjutkan' : 'Jeda');
    $('#lsLabel').textContent = speakPaused ? 'Dijeda' : RADIO ? 'Radio' : 'Dibacakan';
    $('#lsPos').textContent = t(`paragraf ${speakIdx + 1} dari ${body.children.length}`, `paragraph ${speakIdx + 1} of ${body.children.length}`);
  }
  const resumeSpeech = () => { if (current && !speaking) startSpeech(speakPaused ? { sent: speakSent } : speakIdx || 0); };
  function skipSide() {
    if (UN.next && !unEl.hidden) { playUpNext(); return; }
    const n = current && upNextOf(current);
    if (n && n.d) { UN.next = n.d; UN.listen = true; UN.queue = !!n.queue; UN.radio = !!n.radio; playUpNext(); } else toast('Tidak ada sisi berikutnya.');
  }
  $('#lsPlay').addEventListener('click', () => (speaking ? pauseSpeech() : resumeSpeech()));
  $('#lsPrev').addEventListener('click', () => startSpeech(Math.max(0, speakIdx - 1)));
  $('#lsNext').addEventListener('click', () => { if (speakIdx + 1 < body.children.length) startSpeech(speakIdx + 1); });
  $('#lsSkip').addEventListener('click', skipSide);
  $('#lsStop').addEventListener('click', () => stopSpeech(true));
  $('#lsLyr').addEventListener('click', () => Lyr.show());
  Now.on({
    play: resumeSpeech,
    pause: pauseSpeech,
    stop: () => stopSpeech(true),
    nexttrack: skipSide,
    previoustrack: () => { if (speakSent > 0) startSpeech(0); else { pendingListen = true; pendingStart = 0; $('#rdPrev').click(); } },
    seekforward: () => { if (speakIdx + 1 < body.children.length) startSpeech(speakIdx + 1); },
    seekbackward: () => startSpeech(Math.max(0, speakIdx - 1))
  });
  $('#rsVoice').addEventListener('click', () => { if (speaking) stopSpeech(); else startSpeech(speakPaused ? { sent: speakSent } : 0); });

  /* ---------- MODE LIRIK: kalimat yang sedang dibacakan menyala besar, seperti lirik lagu ---------- */
  const Lyr = (() => {
    const el = $('#lyrics'), list = $('#lyList');
    let open = false, forKey = null, userT = 0, follow = true, lastNow = -1;
    function build() {
      const d = current, plan = speechPlan();
      forKey = d.key; lastNow = -1;
      el.style.setProperty('--ly', catOf(d.cat).ink);
      el.classList.toggle('side-b', d.side !== 'a');
      el.classList.toggle('poem', d.form === 'puisi');
      $('#lyTitle').textContent = d.title;
      $('#lySub').textContent = `${sidesTag(d)}${d.title !== d.A.title ? d.A.title + ' · ' : ''}${SITE.author}${playing() ? ' · ' + playing().title : ''}`;
      $('#lyDisc').style.setProperty('--lc', catOf(d.cat).ink); $('#lyDisc').classList.toggle('b', d.side !== 'a');
      list.innerHTML = plan.map((x, i) => `<p data-s="${i}" class="${x.first && i ? 'pb' : ''}"><span>${esc(x.text)}</span></p>`).join('') + '<div class="ly-end" id="lyEnd"></div>';
      const bg = $('#lyArt');
      requestAnimationFrame(() => drawThread(bg, fullText(d), { w: Math.min(innerWidth, 900), h: Math.min(innerWidth, 900), pad: 20, color: '#fff', seed: d.key, weight: 1.1, pins: false }));
    }
    function sync() {
      if (!open) return;
      if (current && forKey !== current.key) build();
      const now = speaking || speakPaused ? speakSent : -1;
      el.classList.toggle('paused', !speaking);
      $('#lyPlay').setAttribute('aria-label', speaking ? 'Jeda' : 'Putar');
      const plan = speechPlan();
      $('#lyProg').style.transform = `scaleX(${plan.length ? Math.max(0, now + 1) / plan.length : 0})`;
      if (now === lastNow) return;
      lastNow = now;
      $$('p[data-s]', list).forEach(p => { const i = +p.dataset.s; p.classList.toggle('past', now >= 0 && i < now); p.classList.toggle('now', i === now); if (i !== now) p.style.removeProperty('--fill'); });
      const cur = $(`p[data-s="${now}"]`, list);
      if (cur && follow) list.scrollTo({ top: cur.offsetTop - list.clientHeight * .3, behavior: reduced ? 'auto' : 'smooth' });
    }
    function fill(i, f) { if (!open) return; const p = $(`p[data-s="${i}"]`, list); if (p) p.style.setProperty('--fill', (clamp(f, 0, 1) * 100).toFixed(1) + '%'); }
    function show() {
      if (!current) return;
      open = true; el.hidden = false; win.classList.add('lyrics-on');
      el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      build(); follow = true; $('#lyBack').hidden = true; sync();
      if (!speaking && !speakPaused) startSpeech(speakIdx || 0);
      $('#lyClose').focus({ preventScroll: true });
    }
    function hide() { if (!open) return; open = false; el.hidden = true; win.classList.remove('lyrics-on'); if (current && speakIdx >= 0 && body.children[speakIdx]) scrollToPara(body.children[speakIdx]); }
    function ending(n) {
      if (!open) return;
      const end = $('#lyEnd'); if (!end) return;
      end.innerHTML = n ? `<small>${n.end ? (n.end.shared || n.end.daily ? 'Racikan' : 'Album') + ' selesai' : 'Berikutnya'}</small><b>${esc(n.end ? n.end.title : n.d.title)}</b>${n.d ? '<button type="button" id="lyGoNext">Putar sekarang</button>' : ''}` : '';
      end.classList.toggle('on', !!n);
      if (n && follow) list.scrollTo({ top: end.offsetTop - list.clientHeight * .3, behavior: reduced ? 'auto' : 'smooth' });
    }
    // ketuk kalimat untuk mulai dari situ
    list.addEventListener('click', e => {
      if (e.target.closest('#lyGoNext')) { playUpNext(); return; }
      const p = e.target.closest('p[data-s]'); if (!p) return;
      follow = true; $('#lyBack').hidden = true; hideUpNext(); UN.shownFor = null;
      startSpeech({ sent: +p.dataset.s });
    });
    // menggulir sendiri menahan guliran otomatis sebentar
    const userScroll = () => { follow = false; $('#lyBack').hidden = false; clearTimeout(userT); userT = setTimeout(() => { follow = true; $('#lyBack').hidden = true; lastNow = -1; sync(); }, 5000); };
    list.addEventListener('wheel', userScroll, { passive: true });
    list.addEventListener('touchmove', userScroll, { passive: true });
    $('#lyBack').addEventListener('click', () => { clearTimeout(userT); follow = true; $('#lyBack').hidden = true; lastNow = -1; sync(); });
    $('#lyClose').addEventListener('click', hide);
    $('#lyPlay').addEventListener('click', () => (speaking ? pauseSpeech() : resumeSpeech()));
    $('#lyPrev').addEventListener('click', () => startSpeech({ sent: Math.max(0, speakSent - 1) }));
    $('#lyNext').addEventListener('click', () => { const n = speechPlan().length; if (speakSent + 1 < n) startSpeech({ sent: speakSent + 1 }); });
    $('#lySkip').addEventListener('click', skipSide);
    // geser turun untuk menutup, seperti lembar lirik di aplikasi musik
    let sy = null;
    $('.ly-head').addEventListener('pointerdown', e => { sy = e.clientY; });
    $('.ly-head').addEventListener('pointerup', e => { if (sy != null && e.clientY - sy > 60) hide(); sy = null; });
    return { show, hide, sync, fill, ending, get open() { return open; } };
  })();

  /* ---------- PENGATUR WAKTU TIDUR ---------- */
  const Sleep = { mode: null, until: 0, t: 0, pending: false, safety: 0 };
  const SLEEP_OPTS = [['off', 'Mati'], [15, '15 menit'], [30, '30 menit'], [45, '45 menit'], [60, '60 menit'], ['side', 'Akhir sisi ini'], ['album', 'Akhir album atau racikan']];
  // menit terakhir: suara memelan dan sedikit melambat
  function sleepFade() {
    if (typeof Sleep.mode !== 'number') return 1;
    return clamp((Sleep.until - Date.now()) / 60000, .15, 1);
  }
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  function sleepLabel() {
    if (!Sleep.mode) return '';
    if (Sleep.pending) return 'sebentar lagi';
    return typeof Sleep.mode === 'number' ? mmss(Sleep.until - Date.now()) : Sleep.mode === 'side' ? 'akhir sisi' : 'akhir album';
  }
  function renderSleep() {
    const lbl = sleepLabel();
    $$('.sleep-btn').forEach(b => { b.classList.toggle('on', !!Sleep.mode); $('span', b).textContent = lbl; b.setAttribute('aria-label', Sleep.mode ? 'Pengatur waktu tidur: ' + lbl : 'Pengatur waktu tidur'); });
    $$('#sleepMenu [data-sleep]').forEach(b => b.setAttribute('aria-checked', String(String(Sleep.mode || 'off') === b.dataset.sleep)));
  }
  function setSleep(mode) {
    clearInterval(Sleep.t); clearTimeout(Sleep.safety);
    Sleep.mode = mode === 'off' ? null : mode; Sleep.pending = false;
    Sleep.until = typeof mode === 'number' ? Date.now() + mode * 60000 : 0;
    if (typeof mode === 'number') Sleep.t = setInterval(tickSleep, 1000);
    if (Amb.kind !== 'hening') Amb.volume(1);
    renderSleep();
    toast(!Sleep.mode ? 'Pengatur waktu tidur dimatikan.' : typeof mode === 'number' ? t(`Pembacaan berhenti dalam ${mode} menit.`, `Reading stops in ${mode} minutes.`) : mode === 'side' ? 'Pembacaan berhenti di akhir sisi ini.' : 'Pembacaan berhenti di akhir album atau racikan.');
  }
  function tickSleep() {
    const left = Sleep.until - Date.now();
    if (Amb.kind !== 'hening' && left < 60000) Amb.volume(clamp(left / 60000, 0, 1));
    if (left <= 0 && !Sleep.pending) {
      clearInterval(Sleep.t);
      // biarkan kalimat yang sedang dibaca selesai dulu; kalau tidak sedang dibacakan, langsung tidur
      if (speaking) { Sleep.pending = true; Sleep.safety = setTimeout(sleepNow, 20000); } else sleepNow();
    }
    renderSleep();
  }
  function sleepNow() {
    clearInterval(Sleep.t); clearTimeout(Sleep.safety);
    const d = current, at = speakSent;
    if (speaking) pauseSpeech();
    hideUpNext(); UN.shownFor = d?.key || null;
    Amb.set('hening'); releaseLock();
    Sleep.mode = null; Sleep.pending = false; renderSleep();
    $('#sleepMenu').hidden = true;
    const v = $('#sleepVeil');
    $('#svWhere').textContent = d ? t(`Dijeda di “${d.title}”${speakPaused ? `, kalimat ${at + 1} dari ${speechPlan().length}` : ''}.`, `Paused in “${d.title}”${speakPaused ? `, sentence ${at + 1} of ${speechPlan().length}` : ''}.`) : '';
    $('#svResume').hidden = !(d && speakPaused);
    v.hidden = false; v.classList.remove('in'); void v.offsetWidth; v.classList.add('in');
  }
  function openSleepMenu(anchor) {
    const m = $('#sleepMenu');
    $$('[data-sleep="album"]', m).forEach(b => { b.hidden = !playing(); });
    m.hidden = !m.hidden;
    if (m.hidden) return;
    const r = anchor.getBoundingClientRect(), host = $('#vBaca').getBoundingClientRect();
    m.style.left = clamp(r.left + r.width / 2 - host.left - 120, 8, host.width - 248) + 'px';
    m.style.bottom = (host.bottom - r.top + 10) + 'px';
    renderSleep();
    $('[aria-checked="true"]', m)?.focus({ preventScroll: true });
  }
  $('#sleepMenu').innerHTML = `<p class="sm-h">Berhenti membacakan</p>` + SLEEP_OPTS.map(([v, l]) => `<button type="button" role="menuitemradio" data-sleep="${v}" aria-checked="false">${l}</button>`).join('');
  $('#sleepMenu').addEventListener('click', e => { const b = e.target.closest('[data-sleep]'); if (!b) return; const v = b.dataset.sleep; setSleep(/^\d+$/.test(v) ? +v : v); $('#sleepMenu').hidden = true; });
  $$('.sleep-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openSleepMenu(b); }));
  document.addEventListener('click', e => { if (!e.target.closest('#sleepMenu, .sleep-btn')) $('#sleepMenu').hidden = true; });
  $('#svResume').addEventListener('click', () => { $('#sleepVeil').hidden = true; resumeSpeech(); });
  $('#svClose').addEventListener('click', () => { $('#sleepVeil').hidden = true; });



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
      if (score) out.push({ w, para, score: score - (w.side !== 'a' || w.ch > 1 ? .5 : 0), snip: snip || esc(w.excerpt) });
    });
    return out.sort((a, b) => b.score - a.score);
  }
  const palette = $('#palette'), pInput = $('#pInput'), pResults = $('#pResults');
  let pSel = 0, pItems = [];
  const commands = () => [
    { label: t('Balik ke ', 'Flip to ') + sideWord(current && nextSide(current)), hint: (current && nextSide(current))?.title || '', run: () => $('#rdFlip').click(), show: view === 'baca' && !!current && !current.A.CH && !!nextSide(current) },
    { label: t('Bab berikutnya', 'Next chapter'), hint: (current && nextChapter(current))?.title || '', run: () => openDoc(nextChapter(current)), show: view === 'baca' && !!current && !!nextChapter(current) },
    { label: PV.autoplay === false ? 'Nyalakan putar terus' : 'Matikan putar terus', hint: 'sisi berikutnya menyusul otomatis', run: () => { PV.autoplay = PV.autoplay === false; savePv(); toast(PV.autoplay ? 'Putar terus menyala.' : 'Putar terus dimatikan.'); } },
    { label: 'Tambah ke antrean', hint: (view === 'pilih' ? pkDoc() : current)?.title, run: () => enqueue([view === 'pilih' ? pkDoc() : current]), show: (view === 'baca' && !!current) || (view === 'pilih' && !!pkDoc()) },
    { label: 'Bagikan antrean sebagai racikan', hint: QUEUE.length + t(' sisi', ' sides'), run: () => openMix(QUEUE.slice()), show: QUEUE.length > 0 },
    { label: 'Lihat antrean', hint: QUEUE.length + t(' menunggu', ' waiting'), run: () => { feedMode = 'now'; go('sapa'); }, show: QUEUE.length > 0 },
    { label: Sleep.mode ? 'Matikan pengatur waktu tidur' : 'Pengatur waktu tidur: 30 menit', hint: Sleep.mode ? sleepLabel() : 'pembacaan berhenti sendiri', run: () => setSleep(Sleep.mode ? 'off' : 30), show: view === 'baca' },
    { label: 'Berhenti di akhir sisi ini', hint: 'pengatur waktu tidur', run: () => setSleep('side'), show: view === 'baca' && Sleep.mode !== 'side' },
    { label: 'Mulai radio dari tulisan ini', hint: current?.A.title, run: () => startRadio(current.A.slug), show: view === 'baca' && !!current },
    { label: 'Hentikan radio', hint: RADIO ? bySlug(RADIO.seed)?.title : '', run: stopRadio, show: !!RADIO },
    { label: 'Catatan sampul', hint: (view === 'pilih' ? bySlug(PK.slug) : current)?.title, run: () => openLiner(view === 'pilih' ? (pkDoc() || bySlug(PK.slug)) : current), show: (view === 'baca' && !!current) || view === 'pilih' },
    { label: 'Mode lirik', hint: 'dibacakan, kalimat demi kalimat', run: () => Lyr.show(), show: view === 'baca' && !!current },
    { label: 'Saksikan tulisan ini ditulis', hint: current?.title, run: startReplay, show: view === 'baca' && !!SITE.features.replay },
    { label: isDark() ? 'Pakai mode terang' : 'Pakai mode gelap', hint: 'tema', run: () => setTheme(!isDark()) },
    { label: svOn() ? t('Ubah saringan', 'Change the filter') : t('Saring koleksi', 'Filter the collection'), hint: svOn() ? svSummary() : t('jenis, panjang, benang', 'kind, length, threads'), run: openSieve },
    ...(svOn() ? [{ label: t('Hapus saringan', 'Clear the filter'), hint: svSummary(), run: () => { SV = {}; applySieve(); } }] : []),
    { label: 'Buka tulisan acak', hint: 'kejutan', run: () => openPicker(WORKS[Math.floor(Math.random() * WORKS.length)].slug) },
    { label: 'Ke piringan', hint: 'halaman awal', run: () => go('putar') },
    { label: 'Profil ' + SITE.author, hint: 'tentang penulis', run: () => go('tentang') },
    { label: 'Pilih piringan', hint: t('sisi A, B, atau bab', 'side A, B, or a chapter'), run: () => go('pilih') },
    { label: 'Ke sapa', hint: 'panel', run: () => go('sapa'), show: !!SITE.features.dock },
    ...(todayMix() ? [{ label: 'Putar racikan hari ini', hint: todayMix().sub, run: () => playAlbum(todayMix().id, 0) }] : []),
    ...ALBUMS.map(a => ({ label: t('Putar album “', 'Play the album “') + a.title + '”', hint: a.tracks.length + t(' sisi', ' sides'), run: () => playAlbum(a.id, 0) })),
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
        : `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-i="${i}" style="--k:${Math.min(i, 8)}"><span class="p-disc${r.w.side !== 'a' ? ' b' : ''}" style="--lc:${catOf(r.w.cat).ink}" aria-hidden="true"><i></i></span><span class="p-title">${esc(r.w.title)}${r.w.ch ? ` <small>${t('Bab', 'Ch.')} ${r.w.ch}</small>` : multi(r.w.A) ? ` <small>${sideWord(r.w)}</small>` : ''}</span><span class="p-snip">${r.snip}</span></li>`).join('')
      : `<li class="p-empty">${t('Tidak ada yang cocok. Coba kata lain, atau ketik > untuk melihat perintah.', 'Nothing matches. Try another word, or type > to see commands.')}</li>`;
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
      if (!$('#mixModal').hidden) return closeMix();
      if (!$('#sieve').hidden) return closeSieve();
      if (!$('#liner').hidden) return closeLiner();
      if (RP.token) return stopReplay(true);
      if (!$('#sleepMenu').hidden) return void ($('#sleepMenu').hidden = true);
      if (!$('#sleepVeil').hidden) return void ($('#sleepVeil').hidden = true);
      if (Lyr.open) return Lyr.hide();
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
      if (e.key.toLowerCase() === 'b' && current && nextSide(current) && !current.A.CH && !Lyr.open) $('#rdFlip').click();
      if (e.key.toLowerCase() === 'l') (Lyr.open ? Lyr.hide() : Lyr.show());
      if (e.key === ' ' && Lyr.open) { e.preventDefault(); speaking ? pauseSpeech() : resumeSpeech(); }
    }
    if (view === 'pilih' && palette.hidden) {
      if (e.key.toLowerCase() === 'b') cycleSide(1);
      if (e.key === 'Enter' && !e.target.closest('button, [role="slider"]')) $('#pkGo').click();
    }
  });

  const startView = () => (VIEWS.includes(SITE.defaultView) && SITE.defaultView !== 'pilih' && !(SITE.defaultView === 'sapa' && !SITE.features.dock) ? SITE.defaultView : 'putar');
  function route() {
    const raw = location.hash.slice(1);
    if (raw.startsWith('racikan?')) { const id = receiveMix(raw.slice(8)); vt(() => { if (id) { $('.pill [data-go="album"]').hidden = false; showAlbum(id); } else setView(startView()); }); return; }
    const h = decodeURIComponent(raw);
    // #baca-slug, #baca-slug:c (sisi C), #baca-slug~3 (bab 3)
    const m = h.match(/^baca-([\w-]+?)(?::([b-p]))?(?:~(\d+))?$/);
    const mSide = m ? (m[2] || 'a') : 'a', mCh = m ? +(m[3] || 1) : 1;
    if (m && bySlug(m[1]) && view === 'baca' && current?.slug === m[1] && current.side !== mSide && docOf(m[1], mSide)) { flipReader(m[1], mSide); return; }
    vt(() => {
      if (m && bySlug(m[1])) { const d = docOf(m[1], mSide, mCh) || docOf(m[1]); showReader(d.slug, d.side, d.ch); return; }
      const am = h.match(/^album(?:-([\w-]+))?$/);
      if (am) { showAlbum(am[1] && albumOf(am[1]) ? am[1] : null); return; }
      const pk = h.match(/^pilih(?:-([\w-]+?)(?::([b-p]))?(?:~(\d+))?)?$/);
      if (pk && (!pk[1] || bySlug(pk[1]))) { showPicker(pk[1] || PK.slug || crateOrder[0]?.slug || WORKS[0].slug, pk[2] || (pk[1] ? 'a' : PK.side), +(pk[3] || (pk[1] ? 1 : PK.ch || 1))); return; }
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
  const VEC = {};
  let DF = {};
  const LINKS = (() => {
    const docs = WORKS.map(w => {
      const tf = {};
      (fold(fullText(w) + ' ' + w.title).match(/[a-z]+/g) || []).filter(t => t.length > 3 && !LINK_STOP.has(t)).forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      return { w, tf };
    });
    const df = {};
    docs.forEach(d => Object.keys(d.tf).forEach(t => { df[t] = (df[t] || 0) + 1; }));
    DF = df;
    const N = docs.length;
    docs.forEach(d => {
      d.v = {}; let n = 0;
      for (const [t, c] of Object.entries(d.tf)) { if (df[t] < 2 || df[t] > N * .6) continue; d.v[t] = (1 + Math.log(c)) * Math.log((N + 1) / (df[t] + .5)); n += d.v[t] ** 2; }
      d.n = Math.sqrt(n) || 1;
      VEC[d.w.slug] = d;
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
  // kemiripan dua tulisan mana pun, beserta dua kata khas yang mereka bagi
  const kinCache = {};
  function kin(a, b) {
    const id = a < b ? a + '|' + b : b + '|' + a;
    if (kinCache[id]) return kinCache[id];
    const x = VEC[a], y = VEC[b];
    if (!x || !y || a === b) return { sim: 0, words: [] };
    let dot = 0; const sh = [];
    for (const t in x.v) if (y.v[t]) { dot += x.v[t] * y.v[t]; sh.push([t, x.v[t] * y.v[t]]); }
    return (kinCache[id] = { sim: dot / (x.n * y.n), words: sh.sort((p, q) => q[1] - p[1]).slice(0, 2).map(p => p[0]) });
  }
  // tulisan yang paling "di tengah" koleksi: paling mirip dengan semua yang lain
  const centralSlug = () => WORKS.map(w => [w.slug, WORKS.reduce((n, o) => n + kin(w.slug, o.slug).sim, 0)]).sort((a, b) => b[1] - a[1])[0]?.[0] || WORKS[0].slug;

  function renderRelated(w) {
    const host = $('#rdRelated');
    const links = SITE.features.connections ? linksOf(w.slug).slice(0, 3) : [];
    host.hidden = !links.length;
    host.innerHTML = links.length ? `<p class="rd-end-label">benang merah</p>` + links.map(l => {
      const o = bySlug(l.a === w.slug ? l.b : l.a);
      return `<a class="rel" href="#baca-${o.slug}"><svg class="rel-thread" viewBox="0 0 34 18" aria-hidden="true"><path d="M4 13Q15 19 30 4"/><circle cx="4" cy="13" r="3"/><circle cx="30" cy="4" r="3"/></svg><span class="rel-t"><b>${esc(o.title)}</b><small>${t('terhubung lewat', 'linked by')} ${l.words.map(x => `<i>${esc(x)}</i>`).join(t(' dan ', ' and '))}</small></span></a>`;
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
    body.innerHTML = w.body.map(p => isBreak(p) ? SCENE : `<p${w.form === 'puisi' ? ' class="stanza"' : ''}></p>`).join('');
    scroller.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const rnd = seeded(w.slug + '/ketik');
    const follow = el => {
      const r = el.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      if (r.bottom > s.bottom - 140) scroller.scrollTop += r.bottom - (s.bottom - 140);
    };
    try {
      for (let i = 0; i < w.body.length; i++) {
        const el = body.children[i], text = plain(w.body[i]);
        if (isBreak(w.body[i])) { await sleep(700, tok); continue; }
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
    } catch (e) { if (e.name !== 'AbortError') toast(t('Tautan: ', 'Link: ') + url); }
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
    // pengatur waktu tidur meredupkan suasana di menit terakhir
    function volume(v) { if (master && ac) master.gain.setTargetAtTime(.55 * clamp(v, 0, 1), ac.currentTime, .6); }
    return { set, volume, get kind() { return kind; } };
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
  // d: satu sisi atau bab; null untuk sisi B yang belum direkam. w: karyanya.
  // Kalau d adalah karya itu sendiri, label memakai judul karya; selain itu judul sisi/bab.
  function makeDisc(d, tag = 'button', w = d?.A || d) {
    const c = catOf(w.cat), k = d ? discKind(w) : 'blank';
    const el = document.createElement(tag);
    if (tag === 'button') el.type = 'button';
    const off = d && d !== w && (d.side !== 'a' || d.ch > 1);
    el.className = 'disc disc-' + k + (d && d.side !== 'a' ? ' disc-b' : '');
    el.dataset.slug = w.slug;
    el.style.setProperty('--lc', c.ink);
    el.style.setProperty('--vc', c.ink);
    const small = !d ? t('Sisi B · belum direkam', 'Side B · not recorded')
      : d !== w && d.ch ? `${t('Bab', 'Chapter')} ${d.ch} / ${w.CH.length}`
      : d !== w && d.side !== 'a' ? `${sideWord(d)}${d.pov ? ' · ' + esc(d.pov) : ''}`
      : d !== w && multi(w) ? `${sideWord(d)}${d.pov ? ' · ' + esc(d.pov) : ''}`
      : `${esc(c.label)} · No. ${w.no}${w.CH ? ' · ' + w.CH.length + ' ' + t('bab', 'ch.') : multi(w) ? ' · ' + w.S.map(SL).join('/') : ''}`;
    el.innerHTML = `<span class="disc-spin">${k === 'splat' ? splatSVG(off ? { slug: d.key } : w) : ''}${k === 'pic' ? '<canvas class="pic"></canvas>' : ''}
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
    el.setAttribute('aria-label', t(`Buka “${w.title}”, ${catOf(w.cat).label}, ${w.minutes} menit`, `Open “${w.title}”, ${catOf(w.cat).label}, ${w.minutes} min`));
    crate.append(el);
    discs.set(w.slug, el);
  });
  function paintDiscs() { discs.forEach((el, slug) => paintDisc(el, bySlug(slug))); }
  let crateOrder = [];
  function rankWorks() {
    // saringan menyisihkan piringan; kalau tak ada yang lolos, tumpukannya tetap utuh
    const sieved = svOn() ? WORKS.filter(w => svMatch(w)) : WORKS, base = sieved.length ? sieved : WORKS;
    const pool = base.filter(w => PV.form === 'semua' || w.form === PV.form);
    const score = w => Math.abs(w.minutes - PV.min) + (w.minutes > PV.min ? 3 : 0) + (readSet.has(w.slug) ? .6 : 0);
    return [...pool.sort((a, b) => score(a) - score(b)), ...base.filter(w => !pool.includes(w))];
  }
  function layoutCrate() {
    // piringan yang tersaring keluar dari tumpukan
    discs.forEach((el, slug) => { if (!crateOrder.some(w => w.slug === slug)) { el.dataset.hide = 'true'; el.classList.remove('top'); el.style.setProperty('--i', 6); el.style.zIndex = 0; el.tabIndex = -1; } });
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
    $('#tsMatchH').textContent = fits ? t(`Cocok untuk ${PV.min} menit`, `Fits ${PV.min} minutes`) : t(`Paling dekat dengan ${PV.min} menit`, `Closest to ${PV.min} minutes`);
    const row = $('#tsMatch');
    row.innerHTML = `<span class="mini" aria-hidden="true"><i style="--lc:${catOf(w.cat).ink}"></i></span>
      <span><b>${esc(w.title)}</b><small>${w.minutes} ${t('mnt', 'min')} · ${esc(catOf(w.cat).label)}${w.CH ? ' · ' + w.CH.length + t(' bab', ' chapters') : multi(w) ? ' · ' + w.S.length + t(' sisi', ' sides') : ''} · ${readSet.has(w.slug) ? t('sudah dibaca', 'read') : t('belum dibaca', 'unread')}</small></span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;
    row.setAttribute('aria-label', t(`Baca ${w.title}`, `Read ${w.title}`));
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
    $('#thDate').textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
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
    wheelEl.setAttribute('aria-valuetext', PV.min + t(' menit', ' minutes'));
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
    f.setAttribute('aria-label', t(`Bentuk: ${PV.form}. Ketuk untuk mengganti.`, `Form: ${{ puisi: 'poetry', prosa: 'prose', semua: 'all' }[PV.form] || PV.form}. Tap to change.`));
    const a = $('#tcAmb'), ai = AMBS.indexOf(PV.amb);
    a.style.setProperty('--a', (-60 + ai * 40) + 'deg');
    $('#tcAmbV').textContent = { hening: 'Hening', hujan: 'Hujan', ombak: 'Ombak', perapian: 'Api' }[PV.amb];
    a.setAttribute('aria-label', t(`Suasana saat membaca: ${PV.amb}. Ketuk untuk mengganti.`, `Ambience while reading: ${PV.amb}. Tap to change.`));
    $('#tcSizeV').textContent = rd.size;
    const spread = (rd.size - 13) * 3.2;
    $('#tcField').innerHTML = Array.from({ length: 9 }, (_, i) => {
      const k = (i - 4) / 4, x = 80 + k * spread * 2.4;
      return `<path d="M80 76 Q${(80 + k * spread * 4).toFixed(1)} ${(14 + Math.abs(k) * 22).toFixed(1)} ${x.toFixed(1)} 4"/>`;
    }).join('');
    $('#tcSize').setAttribute('aria-label', t(`Ukuran huruf ${rd.size}. Ketuk untuk mengganti.`, `Text size ${rd.size}. Tap to change.`));
    const p = $('#tcPaper'), pp = PAPERS[rd.rt] || PAPERS.putih;
    p.dataset.v = rd.rt; p.style.setProperty('--pp', rd.rt === 'custom' ? rd.custom : pp[0]);
    $('#tcPaperV').textContent = pp[1];
    p.setAttribute('aria-label', t(`Kertas ${pp[1]}. Ketuk untuk mengganti.`, `Paper: ${pp[1]}. Tap to change.`));
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
  const PK = { slug: null, side: 'a', ch: 1, frac: 0, fr: {} };
  const prog = store.get('prog', {});
  const secsOf = w => Math.max(30, Math.round(w.words / 170 * 60));
  const fmtMS = sec => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
  const TICKS = 28;
  const pkCar = $('#pkCar'), pkDisc = $('#pkDisc'), scrub = $('#scrub'), ticks = $('#scTicks');
  ticks.insertAdjacentHTML('afterbegin', Array.from({ length: TICKS }, () => '<i></i>').join(''));
  WORKS.forEach(w => {
    const it = document.createElement('button');
    it.type = 'button'; it.className = 'pk-item' + (multi(w) || w.CH ? ' has-b' : ''); it.dataset.slug = w.slug; it.dataset.n = w.CH ? w.CH.length : multi(w) ? w.S.length : '';
    it.setAttribute('role', 'option');
    it.setAttribute('aria-label', w.title + (w.CH ? t(`, ${w.CH.length} bab`, `, ${w.CH.length} chapters`) : multi(w) ? t(`, ${w.S.length} sisi`, `, ${w.S.length} sides`) : ''));
    it.append(makeDisc(w, 'span'));
    pkCar.append(it);
  });
  let pkPainted = false;
  // isi piringan yang sedang dipegang: tiap sisi, atau tiap bab untuk novel.
  // Karya bersisi satu tetap punya sisi B kosong supaya piringannya bisa dibalik.
  const pkList = w => (w.CH ? w.CH : multi(w) ? w.S : [w.S[0], null]);
  const pkIndex = () => {
    const w = bySlug(PK.slug); if (!w) return 0;
    if (w.CH) return clamp(PK.ch - 1, 0, w.CH.length - 1);
    return Math.max(0, LETTERS.indexOf(PK.side));
  };
  const pkDoc = () => { const w = bySlug(PK.slug); return w ? pkList(w)[pkIndex()] || null : null; };
  const pkSuffix = (side, ch) => (side && side !== 'a' ? ':' + side : '') + (ch > 1 ? '~' + ch : '');
  const pkHash = () => '#pilih-' + PK.slug + pkSuffix(PK.side, PK.ch);
  function openPicker(slug, side = 'a', ch = 1) { location.hash = 'pilih-' + slug + pkSuffix(side, ch); }
  function showPicker(slug, side = 'a', ch = 1) {
    setView('pilih');
    if (!pkPainted) { pkPainted = true; $$('.pk-item', pkCar).forEach(it => paintDisc($('.disc', it), bySlug(it.dataset.slug), 64)); }
    const w = bySlug(slug);
    if (w && !w.CH && !multi(w)) side = side === 'a' ? 'a' : 'b';
    if (w && !w.CH && multi(w) && !w.S.some(d => d.side === side)) side = 'a';
    if (w?.CH) side = 'a';
    const same = PK.slug === slug;
    PK.side = side; PK.ch = w?.CH ? clamp(ch, 1, w.CH.length) : 1; PK.fr = {};
    if (!same) { PK.slug = slug; selectPk(slug, false); } else { renderTabs(); renderSide(); }
    sievePicker(); // saringan dihitung ulang untuk piringan yang sekarang dipilih
    requestAnimationFrame(() => { setFace(pkIndex(), false); $(`.pk-item[data-slug="${slug}"]`, pkCar)?.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    document.title = `${bySlug(slug).title} · ${SITE.title}`;
  }
  // tab di bawah piringan: A, B, C… atau nomor bab
  function renderTabs() {
    const w = bySlug(PK.slug); if (!w) return;
    const box = $('.pk-sides');
    box.classList.toggle('is-ch', !!w.CH);
    box.setAttribute('aria-label', w.CH ? t('Bab', 'Chapters') : t('Sisi piringan', 'Record sides'));
    box.innerHTML = pkList(w).map((d, i) => {
      const lab = w.CH ? String(i + 1) : (LANG === 'en' ? 'Side ' : 'Sisi ') + LETTERS[i].toUpperCase();
      const tip = d ? (w.CH ? `${t('Bab', 'Chapter')} ${i + 1}: ${d.title}` : d.pov ? sideLine(d) : lab) : t('Sisi B belum direkam', 'Side B not recorded yet');
      return `<button type="button" role="tab" data-i="${i}" data-side="${w.CH ? 'a' : LETTERS[i]}" aria-selected="${i === pkIndex()}" class="${d ? '' : 'is-empty'}" title="${esc(tip)}" aria-label="${esc(tip)}">${lab}</button>`;
    }).join('') + '<i class="pk-dot" aria-hidden="true"></i>';
  }
  function selectPk(slug, animate, dir = 1) {
    const w = bySlug(slug); if (!w) return;
    if (PK.slug !== slug) { PK.slug = slug; PK.side = 'a'; PK.ch = 1; }
    PK.fr = {};
    const list = pkList(w);
    pkDisc.innerHTML = `<div class="pk-flip">${list.map((d, i) => `<div class="pk-face ${w.CH ? 'c' + (i + 1) : LETTERS[i]}" data-i="${i}"></div>`).join('')}</div><svg class="pk-arm" viewBox="0 0 60 220" aria-hidden="true"><circle class="arm-base" cx="30" cy="22" r="17"/><circle class="arm-pivot" cx="30" cy="22" r="7"/><path class="arm-rod" d="M30 22 L30 168 Q30 182 22 190"/><rect class="arm-head" x="10" y="184" width="18" height="28" rx="4" transform="rotate(18 19 198)"/></svg>`;
    const faces = $$('.pk-face', pkDisc);
    const els = list.map((d, i) => { const el = makeDisc(d, 'span', w); faces[i].append(el); return el; });
    requestAnimationFrame(() => els.forEach((el, i) => paintDisc(el, list[i], pkDisc.offsetWidth)));
    showFace(pkIndex());
    if (animate && !reduced) {
      pkDisc.style.setProperty('--dir', (dir * 60) + 'px'); pkDisc.style.setProperty('--rot', (dir * 18) + 'deg');
      pkDisc.classList.remove('swap'); void pkDisc.offsetWidth; pkDisc.classList.add('swap');
    }
    $$('.pk-item', pkCar).forEach(it => it.setAttribute('aria-selected', String(it.dataset.slug === slug)));
    renderTabs();
    renderSide();
  }
  const pkFace = () => $(`.pk-face[data-i="${pkIndex()}"]`, pkDisc);
  function showFace(i) {
    $$('.pk-face', pkDisc).forEach(f => f.classList.toggle('on', +f.dataset.i === i));
    pkDisc.classList.toggle('side-b', i > 0);
  }
  // judul, petunjuk, bilah waktu, dan tombol mengikuti sisi yang sedang menghadap ke atas
  function renderSide() {
    const w = bySlug(PK.slug); if (!w) return;
    const d = pkDoc(), fk = PK.side + PK.ch;
    // tiap sisi mengingat titik mulainya sendiri selama piringan ini dipegang
    if (PK.fr[fk] == null) PK.fr[fk] = d && prog[d.key] > .02 && prog[d.key] < .97 ? prog[d.key] : 0;
    PK.frac = PK.fr[fk];
    const ti = $('#pkTitle');
    ti.classList.remove('swap'); void ti.offsetWidth; if (!reduced) ti.classList.add('swap');
    const head = d && d.title !== w.title ? `<span class="pk-work">${esc(w.title)}</span>` : '';
    ti.innerHTML = d
      ? `${head}${esc(d.title)}<small>${esc(catOf(w.cat).label)} · ${d.minutes} ${t('menit', 'min')}${readSet.has(d.key) ? t(' · sudah dibaca', ' · read') : ''}</small>`
      : `<span class="dim">${esc(w.title)}</span><small>${t('Sisi B belum direkam', 'Side B not recorded yet')}</small>`;
    const n = pkList(w).length;
    $('#pkHint').textContent = w.CH
      ? t(`Bab ${PK.ch} dari ${n}`, `Chapter ${PK.ch} of ${n}`) + (PK.ch < n ? t(' · geser untuk bab berikutnya', ' · swipe for the next chapter') : '')
      : !d ? t('Sisi ini masih kosong. Mungkin suatu hari.', 'This side is still blank. Maybe someday.')
      : multi(w)
        ? (d.pov ? sideLine(d) : sideWord(d)) + (d.side === 'a'
          ? t(` · balik untuk ${n - 1} sisi lainnya`, ` · flip for the other ${n - 1 > 1 ? n - 1 + ' sides' : 'side'}`)
          : t(' · cerita yang sama, dari sisi lain', ' · the same story, from another side'))
        : (d.pov ? sideLine(d) : t('Sisi A · cerita aslinya', 'Side A · the original'));
    scrub.classList.toggle('off', !d);
    syncQueueBtn();
    const go = $('#pkGo');
    go.disabled = !d;
    go.textContent = d ? t('Yang ini!', 'This one!') : t('Belum ada', 'Not yet');
    renderScrub();
  }
  function renderScrub() {
    const d = pkDoc() || bySlug(PK.slug); if (!d) return;
    PK.fr[PK.side] = PK.frac;
    const total = secsOf(d), pos = Math.round(PK.frac * (TICKS - 1));
    $$('i', ticks).forEach((t, i) => { t.className = i < pos ? 'past' : i === pos ? 'now' : ''; });
    const tick = $$('i', ticks)[pos];
    $('#scTag').style.setProperty('--x', (tick.offsetLeft + tick.offsetWidth / 2) + 'px');
    $('#scTag').textContent = PK.frac > 0 ? t(`mulai ${Math.round(PK.frac * 100)}%`, `from ${Math.round(PK.frac * 100)}%`) : 'dari awal';
    $('#scFrom').innerHTML = `${fmtMS(total * PK.frac)}<small>M</small>`;
    $('#scTo').innerHTML = `${fmtMS(total)}<small>M</small>`;
    scrub.setAttribute('aria-valuenow', Math.round(PK.frac * 100));
    scrub.setAttribute('aria-valuetext', t(`Mulai dari ${fmtMS(total * PK.frac)} dari ${fmtMS(total)}`, `Start at ${fmtMS(total * PK.frac)} of ${fmtMS(total)}`));
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
  async function flipDisc(i, dir) {
    const el = $('.pk-flip', pkDisc), tok = ++flipTok;
    if (!el || reduced || !el.animate || view !== 'pilih') { showFace(i); return; }
    pkDisc.classList.add('flipping');
    el.getAnimations().forEach(a => a.cancel());
    await el.animate([{ transform: 'perspective(1400px) rotateY(0)' }, { transform: `perspective(1400px) rotateY(${dir * 90}deg) scale(.94)` }], { duration: 200, easing: 'cubic-bezier(.55, 0, .9, .45)' }).finished.catch(() => {});
    if (tok !== flipTok) return;
    showFace(i);
    await el.animate([{ transform: `perspective(1400px) rotateY(${dir * -90}deg) scale(.94)` }, { transform: 'perspective(1400px) rotateY(0)' }], { duration: 560, easing: 'cubic-bezier(.2, 1.35, .4, 1)' }).finished.catch(() => {});
    if (tok === flipTok) pkDisc.classList.remove('flipping');
  }
  function setFace(i, fromUser = true) {
    const w = bySlug(PK.slug); if (!w) return;
    const list = pkList(w);
    i = clamp(i, 0, list.length - 1);
    const was = pkIndex(), changed = i !== was;
    if (w.CH) { PK.side = 'a'; PK.ch = i + 1; } else PK.side = LETTERS[i];
    if (fromUser && changed) flipDisc(i, i > was ? 1 : -1); else showFace(i);
    $$('.pk-sides [data-i]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    const btn = $(`.pk-sides [data-i="${i}"]`);
    if (btn) $('.pk-dot').style.setProperty('--x', (btn.offsetLeft + btn.offsetWidth / 2) + 'px');
    btn?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
    if (fromUser && changed) { renderSide(); if (view === 'pilih') history.replaceState(null, '', pkHash()); }
  }
  // balik ke sisi berikutnya, memutar: A → B → C → A (novel: bab berikutnya, berhenti di ujung)
  function cycleSide(dir = 1) {
    const w = bySlug(PK.slug); if (!w) return;
    const n = pkList(w).length, i = pkIndex();
    setFace(w.CH ? clamp(i + dir, 0, n - 1) : (i + dir + n) % n);
  }
  $('.pk-sides').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) setFace(+b.dataset.i); });
  let fx = null;
  pkDisc.addEventListener('pointerdown', e => { fx = e.clientX; });
  pkDisc.addEventListener('pointerup', e => {
    if (fx == null) return;
    const dx = e.clientX - fx; fx = null;
    if (Math.abs(dx) > 40) cycleSide(dx < 0 ? 1 : -1);
  });
  pkDisc.addEventListener('dblclick', () => cycleSide(1));
  let carT;
  pkCar.addEventListener('scroll', () => {
    clearTimeout(carT);
    carT = setTimeout(() => {
      const mid = pkCar.getBoundingClientRect().left + pkCar.clientWidth / 2;
      let best = null, bd = Infinity;
      $$('.pk-item:not([hidden])', pkCar).forEach(it => { const r = it.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = it; } });
      if (best && best.dataset.slug !== PK.slug) {
        const items = $$('.pk-item:not([hidden])', pkCar), dir = items.indexOf(best) > items.findIndex(i => i.dataset.slug === PK.slug) ? 1 : -1;
        selectPk(best.dataset.slug, true, dir);
        history.replaceState(null, '', pkHash());
        document.title = `${bySlug(PK.slug).title} · ${SITE.title}`;
      }
    }, 110);
  }, { passive: true });
  pkCar.addEventListener('click', e => {
    const it = e.target.closest('.pk-item'); if (!it) return;
    // piringan yang sudah di tengah tidak memicu gulir, jadi pilih langsung
    if (it.dataset.slug !== PK.slug) {
      const items = $$('.pk-item:not([hidden])', pkCar);
      selectPk(it.dataset.slug, true, items.indexOf(it) > items.findIndex(i => i.dataset.slug === PK.slug) ? 1 : -1);
      history.replaceState(null, '', pkHash()); document.title = `${bySlug(PK.slug).title} · ${SITE.title}`;
    }
    it.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  });
  pkCar.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
    e.preventDefault();
    const items = $$('.pk-item:not([hidden])', pkCar), i = items.findIndex(it => it.dataset.slug === PK.slug);
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
    if (reduced) { openDoc(d, $('.disc-spin', pkFace())); return; }
    pkDisc.classList.add('needle');
    $('#pkGo').disabled = true;
    setTimeout(() => {
      pkDisc.classList.remove('needle'); $('#pkGo').disabled = false;
      openDoc(d, $('.disc-spin', pkFace()));
    }, 620);
  });

  /* ======================================================================
     ALBUM: sisi-sisi pilihan penulis, diputar berurutan seperti playlist
     ====================================================================== */
  const ALBUMS = (Array.isArray(content.albums) ? content.albums : [])
    .map(a => ({ id: String(a.id || ''), title: String(a.title || ''), note: String(a.note || ''), kind: a.kind === 'antologi' ? 'antologi' : '', tracks: (a.tracks || []).map(docByKey).filter(Boolean) }))
    .filter(a => a.id && a.title && a.tracks.length);
  /* ---------- RACIKAN: playlist pembaca yang dibagikan lewat tautan, tanpa server ---------- */
  // isinya ada di tautan itu sendiri: #racikan?s=kopi-kedua,kopi-kedua:b&t=Judul&n=Pengirim
  let MIXES = store.get('mixes', []).filter(m => m && m.id && Array.isArray(m.keys));
  const saveMixes = () => store.set('mixes', MIXES.slice(0, 12));
  const hashId = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const mixAlbum = m => ({ id: m.id, title: m.title, from: m.from || '', mine: !!m.mine, at: m.at, shared: true, keys: m.keys,
    note: m.mine ? t(`Racikanmu${m.from ? ', dari ' + m.from : ''}. Siapa pun yang membuka tautannya mendapat urutan yang sama.`, `Your mix${m.from ? ', from ' + m.from : ''}. Anyone who opens the link gets the same order.`) : t(`Racikan${m.from ? ' dari ' + m.from : ''}, dibagikan lewat tautan.`, `A mix${m.from ? ' from ' + m.from : ''}, shared by link.`),
    tracks: m.keys.map(docByKey).filter(Boolean) });
  const mixUrl = a => location.href.split('#')[0] + '#racikan?s=' + a.keys.join(',') + '&t=' + encodeURIComponent(a.title) + (a.from ? '&n=' + encodeURIComponent(a.from) : '');
  function keepMix(keys, title, from, mine) {
    keys = keys.filter(k => docByKey(k)).slice(0, 40);
    if (!keys.length) return null;
    title = (title || '').trim().slice(0, 60) || t('Racikan tanpa nama', 'Untitled mix');
    from = (from || '').trim().slice(0, 40);
    const id = 'racikan-' + hashId(keys.join(',') + '|' + title + '|' + from);
    const old = MIXES.find(m => m.id === id);
    MIXES = [{ id, keys, title, from, mine: mine || !!old?.mine, at: old?.at || Date.now() }, ...MIXES.filter(m => m.id !== id)];
    saveMixes();
    return { id, fresh: !old };
  }
  function receiveMix(raw) {
    const q = new URLSearchParams(raw);
    const keys = (q.get('s') || '').split(',').map(k => k.trim()).filter(Boolean);
    const r = keepMix(keys, q.get('t'), q.get('n'), false);
    if (!r) { toast('Racikan ini kosong, atau tulisannya sudah tidak ada.'); return null; }
    if (r.fresh) { const a = albumOf(r.id); toast(t(`Racikan “${a.title}”${a.from ? ' dari ' + a.from : ''} · ${a.tracks.length} sisi. Tersimpan di rak Album.`, `The mix “${a.title}”${a.from ? ' from ' + a.from : ''} · ${a.tracks.length} sides. Saved to the Album shelf.`), null, 4500); }
    return r.id;
  }
  // kartu "bagikan racikan": nama, pengirim, sampul mosaik, lalu tautan
  let mixKeys = [];
  function openMix(keys) {
    mixKeys = keys.filter(k => docByKey(k));
    if (!mixKeys.length) { toast('Antreanmu masih kosong.'); return; }
    $('#mixTitle').value = t('Racikan ', 'Mix for ') + new Date().toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
    $('#mixFrom').value = store.get('mixFrom', '');
    const ds = mixKeys.map(docByKey);
    $('#mixList').innerHTML = ds.map(d => `<li>${mdisc(d)}<span>${esc(d.title)}${badge(d) ? ' ' + badge(d) : ''}</span><small>${d.minutes} ${t('mnt', 'min')}</small></li>`).join('');
    $('#mixCount').textContent = `${ds.length} ${t('sisi', 'sides')} · ${ds.reduce((n, d) => n + d.minutes, 0)} ${t('menit', 'min')}`;
    $('#mixModal').hidden = false;
    requestAnimationFrame(() => paintCover($('#mixCover'), { tracks: ds }, Math.min(300, $('.mix-art').clientWidth || 260)));
    $('#mixTitle').select();
  }
  const closeMix = () => { $('#mixModal').hidden = true; };
  function makeMix() {
    store.set('mixFrom', $('#mixFrom').value.trim());
    const r = keepMix(mixKeys, $('#mixTitle').value, $('#mixFrom').value, true);
    $('.pill [data-go="album"]').hidden = false;
    return r && albumOf(r.id);
  }
  $('#mixShare').addEventListener('click', async () => {
    const a = makeMix(); if (!a) return;
    const url = mixUrl(a);
    try {
      if (navigator.share) { await navigator.share({ title: a.title, text: t(`“${a.title}”: ${a.tracks.length} sisi dari ${SITE.title}`, `“${a.title}”: ${a.tracks.length} sides from ${SITE.title}`), url }); closeMix(); }
      else { await navigator.clipboard.writeText(url); toast('Tautan racikan disalin. Racikannya juga tersimpan di rak Album.'); closeMix(); }
    } catch (err) { if (err.name !== 'AbortError') toast(t('Tautan: ', 'Link: ') + url, null, 8000); }
  });
  $('#mixCopy').addEventListener('click', async () => {
    const a = makeMix(); if (!a) return;
    const url = mixUrl(a);
    try { await navigator.clipboard.writeText(url); toast('Tautan racikan disalin.', { label: 'Lihat di rak', run: () => { location.hash = 'album-' + a.id; } }); closeMix(); }
    catch (err) { toast(t('Tautan: ', 'Link: ') + url, null, 8000); }
  });
  $('#mixClose').addEventListener('click', closeMix);
  $('#mixModal').addEventListener('click', e => { if (e.target.id === 'mixModal') closeMix(); });

  /* ---------- RACIKAN HARIAN: dirangkai dari benang merah, sama untuk semua pembaca hari itu ---------- */
  // tanggal mengikuti WIB supaya racikannya sama di mana pun pembaca berada, dan berganti tengah malam WIB
  const wibDate = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
  const untilMidnight = () => 86400e3 - ((Date.now() + 7 * 3600e3) % 86400e3);
  const dailyCache = {};
  function dailyOf(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || DOCS.length < 2) return null;
    if (dailyCache[date]) return dailyCache[date];
    const rnd = seeded('harian/' + date + '/' + WORKS.map(w => w.slug).join(','));
    const want = Math.min(DOCS.length, 4 + Math.floor(rnd() * 3));
    const used = new Set(), tracks = [], why = [], words = {};
    let cur = WORKS[Math.floor(rnd() * WORKS.length)], via = '';
    while (cur && tracks.length < want) {
      used.add(cur.slug);
      // novel masuk lewat bab pertamanya; sisi-sisi lain langsung menyusul sisi A: cerita yang sama, dari sisi yang lain
      const [first, ...others] = cur.CH ? [cur.CH[0]] : cur.S;
      tracks.push(first); why.push(via);
      others.forEach(o => { if (tracks.length < want) { tracks.push(o); why.push(o.pov ? t(`sisi lain, dari sisi ${esc(o.pov)}`, `another side, ${esc(o.pov)}’s`) : t('sisi lain', 'another side')); } });
      const next = linksOf(cur.slug).map(l => ({ l, o: bySlug(l.a === cur.slug ? l.b : l.a) })).filter(x => x.o && !used.has(x.o.slug));
      if (next.length) {
        const pick = next[Math.floor(rnd() * Math.min(2, next.length))];
        pick.l.words.forEach(w => { words[w] = (words[w] || 0) + 1; });
        via = `${t('lewat', 'via')} <i>${pick.l.words.map(esc).join(`</i> ${t('dan', 'and')} <i>`)}</i>`;
        cur = pick.o;
      } else {
        const rest = WORKS.filter(w => !used.has(w.slug));
        cur = rest.length ? rest[Math.floor(rnd() * rest.length)] : null;
        via = t('lompatan acak', 'a random leap');
      }
    }
    const theme = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
    const day = new Date(date + 'T00:00:00').toLocaleDateString(LOCALE, { weekday: 'long' });
    const nice = new Date(date + 'T00:00:00').toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    return (dailyCache[date] = {
      id: 'harian-' + date, date, daily: true, theme, tracks, why,
      title: t('Racikan ' + day, day + ' mix'),
      sub: theme.length ? t('tentang ', 'about ') + theme.join(t(' dan ', ' and ')) : t('dari ', 'from ') + [...new Set(tracks.map(x => catOf(x.cat).label.toLowerCase()))].slice(0, 2).join(t(' dan ', ' and ')),
      note: t(`Racikan ${nice}, dirangkai otomatis: dimulai dari “${tracks[0].title}”, lalu mengikuti benang merah${theme.length ? ' lewat ' + theme.join(', ') : ''}. Semua pembaca mendapat racikan yang sama hari ini.`,
        `The mix for ${nice}, strung together automatically: it starts at “${tracks[0].title}” and follows the thread${theme.length ? ' through ' + theme.join(', ') : ''}. Every reader gets the same mix today.`)
    });
  }
  const todayMix = () => dailyOf(wibDate());
  const inHours = ms => { const m = Math.round(ms / 60000), mn = t(' menit', ' min'); return m < 60 ? m + mn : Math.floor(m / 60) + t(' jam', ' h') + (m % 60 ? ' ' + (m % 60) + mn : ''); };

  /* ======================================================================
     SARINGAN: satu saringan untuk tumpukan piringan, pemilih, dan koleksi.
     Di dalam satu kelompok pilihannya "atau", antarkelompok "dan". Setiap pilihan
     menunjukkan berapa piringan yang tersisa kalau ia ikut dipilih, dan kalau hasilnya
     kosong, saringan menyarankan satu pilihan yang paling layak dilepas.
     ====================================================================== */
  let SV = (o => (o && typeof o === 'object' ? o : {}))(store.get('saring', {}));
  const saveSv = () => store.set('saring', SV);
  const svOn = () => Object.values(SV).some(a => Array.isArray(a) && a.length);
  // panjang yang dihitung adalah satu kali duduk: rata-rata satu sisi atau satu bab
  const sitting = w => Math.round(tracksOf(w).reduce((n, d) => n + d.minutes, 0) / tracksOf(w).length);
  const wordSet = new Map();
  const wordsIn = w => wordSet.get(w.slug) || (wordSet.set(w.slug, new Set(fold(tracksOf(w).map(fullText).join(' ')).match(/[a-z]+/g) || [])), wordSet.get(w.slug));
  const stateOf = w => {
    const ds = tracksOf(w);
    if (ds.every(d => ST.done.includes(d.key))) return 'selesai';
    return ds.some(d => readSet.has(d.key) || progOf(d) > .02) ? 'tengah' : 'belum';
  };
  // benang: kata khas yang muncul di lebih dari satu karya didahulukan, lalu kata khas terkuat
  const EN_FILLER = new Set('about above after again against along already although always among another anyone anything around because become before behind being below between beyond cannot could during either enough every everything first found further getting going having itself might myself never nothing often other others perhaps quite rather really right seems should since something sometimes still their theirs there these thing things think those though thought through toward towards turned under until upon wanted where whether which while within without would yours yourself current least later little looked people seemed began began finally simply almost knows known'.split(' '));
  let svWordsCache = null;
  function svWords() {
    if (svWordsCache) return svWordsCache;
    const score = {};
    // kata dari tulisan yang berbahasa sama dengan pembaca, tanpa kata pengisi bahasa Inggris
    const same = DOCS.filter(d => (d.lost || LANG) === LANG), pool = same.length >= 3 ? same : DOCS;
    pool.forEach(d => khas(d, 6).filter(k => !EN_FILLER.has(k)).slice(0, 4).forEach((k, i) => { score[k] = (score[k] || 0) + (4 - i); }));
    const reach = k => WORKS.filter(w => wordsIn(w).has(k)).length;
    return (svWordsCache = Object.keys(score).map(k => [k, score[k], reach(k)])
      .sort((a, b) => (b[2] > 1) - (a[2] > 1) || b[1] - a[1]).slice(0, 12).map(x => x[0]));
  }
  const SV_GROUPS = () => [
    { id: 'cat', label: t('Jenis', 'Kind'), opts: [...new Set(WORKS.map(w => w.cat))].map(c => ({ v: c, label: catOf(c).label, ink: catOf(c).ink })), test: (w, v) => w.cat === v },
    { id: 'len', label: t('Sekali duduk', 'One sitting'), opts: [
      { v: 'singkat', label: t('Sebentar', 'Brief'), hint: '≤ 7 ' + t('mnt', 'min') },
      { v: 'sedang', label: t('Secangkir kopi', 'A cup of coffee'), hint: '8–20 ' + t('mnt', 'min') },
      { v: 'panjang', label: t('Tenggelam', 'Sink in'), hint: '> 20 ' + t('mnt', 'min') }],
      test: (w, v) => { const m = sitting(w); return v === 'singkat' ? m <= 7 : v === 'sedang' ? m > 7 && m <= 20 : m > 20; } },
    { id: 'state', label: t('Bagimu', 'For you'), opts: [
      { v: 'belum', label: t('Belum diputar', 'Not played') }, { v: 'tengah', label: t('Di tengah jalan', 'Halfway') }, { v: 'selesai', label: t('Sudah selesai', 'Finished') }],
      test: (w, v) => stateOf(w) === v },
    { id: 'shape', label: t('Bentuk', 'Shape'), opts: [
      { v: 'banyak', label: t('Bersisi banyak', 'Many sides') }, { v: 'bab', label: t('Berbab', 'In chapters') },
      { v: 'satu', label: t('Satu sisi', 'One side') }, { v: 'dwi', label: t('Dua bahasa', 'Two languages') }],
      test: (w, v) => (v === 'banyak' ? multi(w) : v === 'bab' ? !!w.CH : v === 'satu' ? !w.CH && !multi(w) : !!w.bilingual) },
    { id: 'word', label: t('Benang', 'Threads'), opts: svWords().map(k => ({ v: k, label: k })), test: (w, v) => wordsIn(w).has(v) }
  ];
  // pilihan yang tidak dimiliki satu karya pun tidak ditampilkan
  const svGroups = () => SV_GROUPS().map(g => ({ ...g, opts: g.opts.filter(o => (SV[g.id] || []).includes(o.v) || WORKS.some(w => g.test(w, o.v))) }));
  // lolos semua kelompok kecuali yang dilewati (untuk hitungan per pilihan)
  function svMatch(w, skip, sel = SV) {
    return SV_GROUPS().every(g => g.id === skip || !(sel[g.id] || []).length || sel[g.id].some(v => g.test(w, v)));
  }
  const svWorks = (sel = SV) => WORKS.filter(w => svMatch(w, null, sel));
  // judul ringkas saringan yang aktif, dipakai tombol dan album hasilnya
  function svSummary() {
    if (!svOn()) return '';
    const parts = SV_GROUPS().flatMap(g => (SV[g.id] || []).map(v => g.opts.find(o => o.v === v)?.label || v));
    return parts.length > 2 ? parts.slice(0, 2).join(' · ') + ` +${parts.length - 2}` : parts.join(' · ');
  }
  function sieveAlbum() {
    const ws = svWorks();
    if (!ws.length) return undefined;
    return { id: 'saringan', title: svOn() ? t('Saringan: ', 'Filtered: ') + svSummary() : t('Semua tulisan', 'All writing'), note: t('Hasil saringanmu, diputar berurutan.', 'Your filtered results, played in order.'), tracks: ws.flatMap(tracksOf) };
  }
  function renderSieve() {
    const res = svWorks(), groups = svGroups();
    $('#svCount').textContent = t(`${res.length} dari ${WORKS.length} piringan`, `${res.length} of ${WORKS.length} records`);
    $('#svMins').textContent = res.length ? `${res.flatMap(tracksOf).length} ${t('sisi', 'sides')} · ${res.flatMap(tracksOf).reduce((n, d) => n + d.minutes, 0)} ${t('menit', 'min')}` : '';
    $('#svDiscs').innerHTML = res.slice(0, 9).map((w, i) => `<span style="--k:${i}" title="${esc(w.title)}">${mdisc(w)}</span>`).join('') + (res.length > 9 ? `<i>+${res.length - 9}</i>` : '');
    $('#svBody').innerHTML = groups.filter(g => g.opts.length > 1 || (SV[g.id] || []).length || g.id === 'word' && g.opts.length).map(g => `<section class="sv-g"><h3>${g.label}</h3><div class="sv-opts">${g.opts.map(o => {
      const on = (SV[g.id] || []).includes(o.v);
      // berapa yang tersisa kalau pilihan ini ikut dipilih
      const n = WORKS.filter(w => svMatch(w, g.id) && (g.test(w, o.v) || (!on && (SV[g.id] || []).some(v => g.test(w, v))))).length;
      return `<button type="button" class="sv-o${on ? ' on' : ''}${!on && !n ? ' zero' : ''}" data-g="${g.id}" data-v="${esc(o.v)}" aria-pressed="${on}">${o.ink ? `<i class="sv-ink" style="--c:${o.ink}"></i>` : ''}${g.id === 'word' ? '<em>' + esc(o.label) + '</em>' : esc(o.label)}${o.hint ? `<small>${o.hint}</small>` : ''}<b>${n}</b></button>`;
    }).join('')}</div></section>`).join('');
    // hasil kosong: cari satu pilihan yang kalau dilepas memberi hasil terbanyak
    let hint = '';
    if (!res.length && svOn()) {
      let best = null;
      groups.forEach(g => (SV[g.id] || []).forEach(v => {
        const sel = { ...SV, [g.id]: SV[g.id].filter(x => x !== v) }, n = svWorks(sel).length;
        if (n && (!best || n > best.n)) best = { g: g.id, v, n, label: g.opts.find(o => o.v === v)?.label || v };
      }));
      hint = best ? `${t('Tak ada yang lolos.', 'Nothing gets through.')} <button type="button" data-relax="${best.g}" data-v="${esc(best.v)}">${t(`Lepas “${esc(best.label)}”`, `Drop “${esc(best.label)}”`)}</button> ${t(`untuk ${best.n} piringan.`, `for ${best.n} ${best.n === 1 ? 'record' : 'records'}.`)}` : t('Tak ada yang lolos. Coba hapus saringan.', 'Nothing gets through. Try clearing the filter.');
    }
    $('#svHint').innerHTML = hint; $('#svHint').hidden = !hint;
    $('#svReset').disabled = !svOn();
    $('#svPlay').disabled = !res.length;
    syncSieveBtns();
  }
  function syncSieveBtns() {
    const on = svOn(), n = svWorks().length;
    $$('[data-sieve]').forEach(b => {
      b.classList.toggle('on', on);
      $('.sv-n', b) && ($('.sv-n', b).textContent = on ? n : '');
      b.setAttribute('aria-label', on ? t(`Saringan aktif: ${svSummary()}, ${n} piringan`, `Filter on: ${svSummary()}, ${n} records`) : t('Saring koleksi', 'Filter the collection'));
    });
  }
  // terapkan ke tumpukan piringan, pemilih, dan koleksi
  function applySieve() {
    saveSv(); renderSieve();
    rerank();
    sievePicker();
    if (view === 'sapa' && feedMode === 'koleksi') renderFeed();
  }
  function sievePicker() {
    $$('.pk-item', pkCar).forEach(it => { it.hidden = svOn() && !svMatch(bySlug(it.dataset.slug)) && it.dataset.slug !== PK.slug; });
    // menyembunyikan piringan menggeser isi carousel; kembalikan yang terpilih ke tengah
    if (view === 'pilih') requestAnimationFrame(() => $(`.pk-item[data-slug="${PK.slug}"]`, pkCar)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  }
  function openSieve() { svWordsCache = null; renderSieve(); $('#sieve').hidden = false; $('.sv-o', $('#svBody'))?.focus({ preventScroll: true }); }
  const closeSieve = () => { $('#sieve').hidden = true; };
  $('#sieve').addEventListener('click', e => {
    if (e.target.id === 'sieve') { closeSieve(); return; }
    const o = e.target.closest('[data-g]');
    if (o) { const g = o.dataset.g, v = o.dataset.v, cur = SV[g] || []; SV = { ...SV, [g]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }; if (!SV[g].length) delete SV[g]; applySieve(); return; }
    const r = e.target.closest('[data-relax]');
    if (r) { const g = r.dataset.relax; SV = { ...SV, [g]: (SV[g] || []).filter(x => x !== r.dataset.v) }; if (!SV[g].length) delete SV[g]; applySieve(); }
  });
  $('#svReset').addEventListener('click', () => { SV = {}; applySieve(); });
  $('#svDone').addEventListener('click', closeSieve);
  $('#svPlay').addEventListener('click', () => { closeSieve(); playAlbum('saringan', 0); });
  document.addEventListener('click', e => { if (e.target.closest('[data-sieve]')) openSieve(); });

  const albumOf = id => (id === 'saringan' ? sieveAlbum() : undefined) || ALBUMS.find(a => a.id === id) || ((m => m && mixAlbum(m))(MIXES.find(m => m.id === id))) || (/^harian-/.test(id || '') ? dailyOf(id.slice(7)) : undefined) || (id === 'semua' ? allAlbum() : undefined);
  // semua sisi, dari yang terbaru; dipakai tombol "Putar semua" di halaman profil
  let allCache = null;
  function allAlbum() {
    return allCache || (allCache = { id: 'semua', title: t('Semua tulisan ', 'Everything by ') + SITE.author, note: t('Setiap sisi di meja ini, dari yang terbaru. Sisi-sisi lain menyusul sisi A-nya.', 'Every side at this desk, newest first. Other sides follow their side A.'), tracks: DOCS.slice() });
  }
  if (!ALBUMS.length && !MIXES.length && !todayMix()) $('.pill [data-go="album"]').hidden = true;
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
  const kindOf = a => (a && (a.shared || a.daily) ? t('racikan', 'mix') : 'album');
  const albumMins = a => a.tracks.reduce((n, t) => n + t.minutes, 0);
  // sampul mosaik ala playlist: empat petak seni benang dari sisi-sisi di album
  function paintCover(c, a, size) {
    if (!c || !a) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), S = Math.round(size * dpr);
    c.width = c.height = S; c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    // antologi Temusai: layar gelap dengan dua titik yang hampir bersentuhan, Arka dan Nara
    if (a.kind === 'antologi' && a.id === 'temusai') {
      ctx.fillStyle = '#0E0F11'; ctx.fillRect(0, 0, S, S);
      [['#7FB077', .44], ['#84AEDC', .56]].forEach(([c, x]) => {
        const g = ctx.createRadialGradient(S * x, S / 2, 0, S * x, S / 2, S * .16);
        g.addColorStop(0, c + '55'); g.addColorStop(1, c + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S * x, S / 2, S * .16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(S * x, S / 2, S * .042, 0, Math.PI * 2); ctx.fill();
      });
      return;
    }
    // antologi Titik Biru: sampulnya ikon aplikasi tanpa nama itu, persegi putih dengan satu titik biru
    if (a.kind === 'antologi') {
      ctx.fillStyle = '#F7F7F5'; ctx.fillRect(0, 0, S, S);
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * .3);
      g.addColorStop(0, 'rgba(26,115,232,.2)'); g.addColorStop(1, 'rgba(26,115,232,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .062, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1A73E8'; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * .044, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const picks = a.tracks.length >= 4 ? a.tracks.slice(0, 4) : a.tracks.length === 1 ? [a.tracks[0]] : [a.tracks[0], a.tracks[1], a.tracks[1], a.tracks[0]];
    const n = picks.length === 1 ? 1 : 2, T = S / n;
    picks.forEach((d, i) => {
      const x = (i % n) * T, y = Math.floor(i / n) * T, ink = catOf(d.cat).ink, b = d.side !== 'a' || d.ch > 1;
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
      const tm = todayMix(), tOn = tm && now && now.id === tm.id;
      host.innerHTML = `${tm ? `<button type="button" class="al-daily" data-album="${esc(tm.id)}">${sleeve(tm, 220, tOn)}
          <span class="ad-t"><span class="al-kicker">${t("Racikan harian · berganti dalam", "Daily mix · changes in")} ${inHours(untilMidnight())}</span><b>${esc(tm.title)}</b><span class="ad-sub">${esc(tm.sub)}</span>
          <span class="ad-meta">${tm.tracks.length} ${t('sisi', 'sides')} · ${albumMins(tm)} ${t('menit', 'min')}${tOn ? t(' · sedang diputar', ' · playing') : ''}</span></span></button>` : ''}
        <header class="al-head"><p class="al-kicker">${t('Koleksi', 'Collection')}</p><h2>${t('Album', 'Albums')}</h2><p class="al-sub">${t('Sisi-sisi pilihan, disusun untuk didengar berurutan.', 'Hand-picked sides, ordered to be heard one after another.')}</p></header>
        <div class="al-grid">${ALBUMS.map((a, i) => `<button type="button" class="al-card" data-album="${esc(a.id)}" style="--k:${i}">${sleeve(a, 200, now && now.id === a.id)}
          <b>${esc(a.title)}</b><small>${a.tracks.length} ${t('sisi', 'sides')} · ${albumMins(a)} ${t('menit', 'min')}${now && now.id === a.id ? t(' · sedang diputar', ' · playing') : ''}</small></button>`).join('') || `<p class="al-empty">${t('Belum ada album. Buat yang pertama di panel admin.', 'No albums yet. Make the first one in the admin panel.')}</p>`}</div>
        ${MIXES.length ? `<header class="al-head al-head-sm"><p class="al-kicker">${t('Racikan', 'Mixes')}</p><p class="al-sub">${t('Urutan baca yang kamu buat atau yang dibagikan padamu lewat tautan.', 'Reading orders you made, or that were shared with you by link.')}</p></header>
        <div class="al-grid">${MIXES.map(mixAlbum).filter(a => a.tracks.length).map((a, i) => `<button type="button" class="al-card mix" data-album="${esc(a.id)}" style="--k:${i}">${sleeve(a, 200, now && now.id === a.id)}
          <b>${esc(a.title)}</b><small>${a.mine ? t('Racikanmu', 'Your mix') : a.from ? t('dari ', 'from ') + esc(a.from) : t('dibagikan padamu', 'shared with you')} · ${a.tracks.length} ${t('sisi', 'sides')}</small></button>`).join('')}</div>` : ''}`;
      document.title = 'Album · ' + SITE.title;
    } else {
      const a = albumOf(id), on = now && now.id === a.id;
      host.innerHTML = `<button type="button" class="al-back" data-album=""><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>Semua album</button>
        <div class="al-detail">
          <div class="al-art">${sleeve(a, 300, on)}</div>
          <div class="al-info">
            <p class="al-kicker">${a.daily ? t('Racikan harian · ', 'Daily mix · ') + esc(a.sub) : a.shared ? t('Racikan', 'Mix') : a.kind === 'antologi' ? t('Antologi', 'Anthology') : 'Album'} · ${a.tracks.length} ${a.kind === 'antologi' ? t('cerita', a.tracks.length === 1 ? 'story' : 'stories') : t('sisi', 'sides')} · ${albumMins(a)} ${t('menit', 'min')}</p>
            <h2>${esc(a.title)}</h2>
            ${a.note ? `<p class="al-note">${esc(a.note)}${a.shared && !a.mine ? ` <span class="al-ago">${t('Diterima', 'Received')} ${ago(a.at)}.</span>` : ''}${a.daily && a.date === wibDate() ? ` <span class="al-ago">${t('Berganti dalam', 'Changes in')} ${inHours(untilMidnight())}.</span>` : a.daily ? ` <span class="al-ago">${t('Ini racikan hari yang sudah lewat.', 'This is a mix from a day gone by.')}</span>` : ''}</p>` : ''}
            <div class="al-actions">
              <button type="button" class="al-play" data-play="${esc(a.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M8 5.5v13l10.5-6.5z"/></svg>${on ? t('Lanjutkan', 'Resume') : t('Putar', 'Play')}</button>
              <button type="button" class="al-btn" data-shuffle="${esc(a.id)}" aria-label="Putar acak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3.2c2.2 0 3.4 1 4.6 3.2l1.4 2.6c1.2 2.2 2.4 3.2 4.6 3.2H20M4 17h3.2c1.4 0 2.4-.4 3.2-1.3M20 7h-2.2c-1.4 0-2.4.4-3.2 1.3M17.5 4.5 20 7l-2.5 2.5M17.5 13.5 20 16l-2.5 2.5"/></svg></button>
              <button type="button" class="al-btn" data-qalbum="${esc(a.id)}" aria-label="Tambahkan album ke antrean" title="Tambahkan ke antrean">${QICON}</button>
              ${a.shared ? `<button type="button" class="al-btn" data-unmix="${esc(a.id)}" aria-label="${t('Hapus racikan dari rak', 'Remove the mix from the shelf')}" title="${t('Hapus dari rak', 'Remove from shelf')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button>` : ''}
              <button type="button" class="al-btn" data-share="${esc(a.id)}" aria-label="${t('Bagikan ' + (a.shared ? 'racikan' : 'album'), 'Share the ' + (a.shared ? 'mix' : 'album'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M6 11.5H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/></svg></button>
            </div>
            <ol class="al-tracks">${a.tracks.map((x, i) => {
              const cur = on && PLAY.i === i, why = a.daily && a.why[i];
              return `<li style="--k:${i}"><button type="button" data-track="${i}" data-album="${esc(a.id)}" class="${cur ? 'cur' : ''}" aria-label="${t('Putar', 'Play')} ${esc(x.title)}">
                <span class="al-no">${cur ? '<i class="eq" aria-hidden="true"><i></i><i></i><i></i></i>' : i + 1}</span>${mdisc(x)}
                <span class="sg-t"><b>${esc(x.title)}${badge(x)}</b><span>${why ? why + ' · ' : ''}${trackSub(x, !!why && x.side !== 'a')}</span></span>
                <span class="al-len">${fmtMS(secsOf(x))}</span>${sideRing(x, ringLabel(x))}</button></li>`;
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
    if (RADIO) { RADIO = null; saveRadio(); }
    const t = a.tracks[i];
    pendingStart = 0;
    if (SITE.features.ambience && PV.amb !== 'hening') Amb.set(PV.amb);
    openDoc(t);
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
      const a = albumOf(share.dataset.share), url = a.shared ? mixUrl(a) : location.href.split('#')[0] + '#album-' + a.id;
      try { if (navigator.share) await navigator.share({ title: a.title, text: t(`Album “${a.title}” — ${SITE.author}`, `The album “${a.title}” — ${SITE.author}`), url }); else { await navigator.clipboard.writeText(url); toast('Tautan album disalin.'); } }
      catch (err) { if (err.name !== 'AbortError') toast(t('Tautan: ', 'Link: ') + url); }
      return;
    }
    const um = e.target.closest('[data-unmix]');
    if (um) {
      const gone = MIXES.find(m => m.id === um.dataset.unmix);
      MIXES = MIXES.filter(m => m !== gone); saveMixes();
      if (PLAY && PLAY.album === gone.id) { PLAY = null; savePlay(); }
      location.hash = 'album';
      toast('Racikan dihapus dari rak.', { label: 'Urungkan', run: () => { MIXES = [gone, ...MIXES]; saveMixes(); location.hash = 'album-' + gone.id; } });
      return;
    }
    const al = e.target.closest('[data-album]');
    if (al) location.hash = al.dataset.album ? 'album-' + al.dataset.album : 'album';
  });

  /* ======================================================================
     PROFIL: halaman penulis, disusun seperti halaman artis di aplikasi musik
     ====================================================================== */
  const LINK_ICONS = [
    [/instagram/i, '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".9" class="f"/>'],
    [/twitter|x\.com/i, '<path d="M5 5l14 14M19 5 5 19"/>'],
    [/threads/i, '<path d="M16.5 9.5C16 6.6 14 5 11.6 5 8.4 5 6 7.6 6 12s2.4 7 5.8 7c3 0 5.2-1.8 5.2-4.4 0-3.4-4.6-3.6-6.4-2.4-1.4 1-1 3.4 1.4 3.4 2.6 0 3.6-2.4 3.6-5"/>'],
    [/medium|substack|blog|wordpress/i, '<path d="M6 5h12v14l-6-4-6 4z"/>'],
    [/youtube/i, '<rect x="3.5" y="6" width="17" height="12" rx="4"/><path class="f" d="M10.5 9.5v5l4-2.5z"/>'],
    [/spotify|music/i, '<circle cx="12" cy="12" r="8.5"/><path d="M8 10c3-1 6-.6 8.5.8M8.5 13c2.4-.7 4.8-.4 6.8.8M9 15.8c1.8-.5 3.6-.3 5.1.5"/>'],
    [/mailto:|@/i, '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m4.5 7.5 7.5 6 7.5-6"/>']
  ];
  const linkIcon = url => `<svg viewBox="0 0 24 24" aria-hidden="true">${(LINK_ICONS.find(([re]) => re.test(url)) || [0, '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>'])[1]}</svg>`;
  const NOW_ICONS = { menulis: '<path d="M4.5 19.5l1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z"/>', membaca: '<path d="M4 5.5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5.5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>', mendengar: '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3.5" y="13" width="4" height="6.5" rx="2"/><rect x="16.5" y="13" width="4" height="6.5" rx="2"/>', terbit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2" class="f"/>' };
  const nowIcon = label => `<svg viewBox="0 0 24 24" aria-hidden="true">${NOW_ICONS[Object.keys(NOW_ICONS).find(k => fold(label).includes(k))] || '<path d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16.4 6.7 19.5l1.4-5.9-4.6-4 6.1-.5z"/>'}</svg>`;
  const safeUrl = u => (/^(https?:|mailto:)/i.test(u) ? u : /@/.test(u) && !/\//.test(u) ? 'mailto:' + u : 'https://' + u.replace(/^\/+/, ''));
  let pfObs = null;
  function renderProfile() {
    const P = SITE.profile || {}, host = $('#pfScroll'), name = SITE.author;
    const total = WORKS.reduce((a, w) => a + w.words, 0), since = WORKS[WORKS.length - 1].date.slice(0, 4);
    const hlKeys = (P.highlights || []).map(docByKey).filter(Boolean);
    const highlights = (hlKeys.length ? hlKeys : WORKS.slice(0, 5)).slice(0, 8);
    const nowItems = (P.now || []).filter(x => x && String(x.text || '').trim());
    const nowList = nowItems.length ? nowItems : [{ label: t('Terakhir terbit', 'Latest release'), text: WORKS[0].title, key: WORKS[0].key }];
    const bio = String(P.bio || '').trim() ? String(P.bio).split(/\n\s*\n/).map(x => x.trim()).filter(Boolean) : [SITE.description || ''].filter(Boolean);
    const quote = String(P.quote?.text || '').trim() ? { text: P.quote.text, source: P.quote.source || name } : highlights[0]?.line ? { text: highlights[0].line, source: `${name}, “${highlights[0].title}”` } : null;
    const links = (P.links || []).filter(l => l && String(l.url || '').trim()).map(l => ({ label: l.label || l.url, url: safeUrl(String(l.url).trim()) }));
    if (SITE.email && !links.some(l => /mailto:/i.test(l.url))) links.push({ label: SITE.email, url: 'mailto:' + SITE.email });
    // perjalanan: momen yang ditulis penulis, ditenun dengan tulisan yang terbit tiap tahun
    const years = {};
    WORKS.forEach(w => { const y = w.date.slice(0, 4); (years[y] = years[y] || { notes: [], works: [] }).works.push(w); });
    (P.journey || []).filter(j => j && String(j.year || '').trim() && String(j.text || '').trim()).forEach(j => { const y = String(j.year).trim(); (years[y] = years[y] || { notes: [], works: [] }).notes.push(j.text); });
    const yearList = Object.keys(years).sort().reverse();
    const done = DOCS.filter(d => ST.done.includes(d.key)).length, mine = minsPlayed();
    const you = mine || done ? t(`Kamu sudah memutar <b>${mine} menit</b> tulisan ${esc(name)} dan menyelesaikan <b>${done} dari ${DOCS.length}</b> sisi.`, `You’ve played <b>${mine} minutes</b> of ${esc(name)}’s writing and finished <b>${done} of ${DOCS.length}</b> sides.`) : t(`Kamu belum memutar tulisan ${esc(name)}. Mulai dari <button type="button" data-pick="${WORKS[0].key}">yang terbaru</button>.`, `You haven’t played anything by ${esc(name)} yet. Start with <button type="button" data-pick="${WORKS[0].key}">the latest</button>.`);
    const albums = [todayMix(), ...ALBUMS].filter(Boolean);
    host.innerHTML = `
      <header class="pf-hero">
        <div class="pf-disc" aria-hidden="true"><div class="pf-rec"><span class="pf-label" id="pfLabel"></span><i class="pf-hole"></i></div><span class="pf-shine"></span></div>
        <div class="pf-id">
          <p class="pf-kick">${t('Penulis', 'Writer')}${P.city ? ' · ' + esc(P.city) : ''}</p>
          <h1 class="pf-name">${esc(name)}</h1>
          ${(P.tagline || SITE.title) ? `<p class="pf-tag">${rich(P.tagline || SITE.title)}</p>` : ''}
          <dl class="pf-stats">
            <div><dt>${t('piringan', 'records')}</dt><dd>${WORKS.length}</dd></div><div><dt>${t('sisi', 'sides')}</dt><dd>${DOCS.length}</dd></div>
            <div><dt>${t('kata', 'words')}</dt><dd>${num(total)}</dd></div><div><dt>${t('sejak', 'since')}</dt><dd>${since}</dd></div>
          </dl>
          <div class="pf-actions">
            <button type="button" class="al-play" data-pf="all"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M8 5.5v13l10.5-6.5z"/></svg>${t('Putar semua', 'Play all')}</button>
            <button type="button" class="pf-radio" data-pf="radio"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9a10 10 0 0 1 14 0M7.5 11.5a6.5 6.5 0 0 1 9 0"/><circle cx="12" cy="15" r="1.6" class="f"/><path d="M12 16.6V21"/></svg>Radio ${esc(name)}</button>
            <button type="button" class="al-btn" data-pf="share" aria-label="Bagikan profil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M6 11.5H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20.5h14a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5h-1"/></svg></button>
          </div>
          <p class="pf-you">${you}</p>
        </div>
      </header>

      <section class="pf-sec"><h2 class="pf-h">Sorotan</h2>
        <ol class="al-tracks pf-hl">${highlights.map((x, i) => `<li style="--k:${i}"><button type="button" data-pick="${x.key}">
          <span class="al-no">${i + 1}</span>${mdisc(x)}<span class="sg-t"><b>${esc(x.title)}${badge(x)}</b><span>${x.title !== x.A.title ? esc(x.A.title) + ' · ' : ''}${esc(catOf(x.cat).label)} · ${fmtLong(x.date)}${x.A.CH && x.ch === 1 ? ' · ' + x.A.CH.length + t(' bab', ' chapters') : multi(x.A) && x.side === 'a' ? ' · ' + x.A.S.length + t(' sisi', ' sides') : ''}</span></span>
          <span class="al-len">${fmtMS(secsOf(x))}</span>${sideRing(x, ringLabel(x))}</button></li>`).join('')}</ol></section>

      <section class="pf-sec"><h2 class="pf-h">Sedang</h2>
        <div class="pf-now">${nowList.map((n, i) => `<${n.key ? `button type="button" data-pick="${n.key}"` : 'div'} class="pf-now-c" style="--k:${i}"><span class="pn-ic">${nowIcon(n.label || '')}</span><small>${esc(n.label || 'Sedang')}</small><b>${rich(n.text)}</b></${n.key ? 'button' : 'div'}>`).join('')}</div></section>

      ${bio.length ? `<section class="pf-sec pf-about"><h2 class="pf-h">Tentang</h2>
        <div class="pf-bio">${bio.map(b => `<p>${rich(b).replace(/\n/g, '<br>')}</p>`).join('')}</div>
        <figure class="pf-portrait"><canvas id="pfPortrait"></canvas><figcaption>${t(`Potret benang, dirajut dari huruf-huruf tentang ${esc(name)}`, `A thread portrait, woven from the letters about ${esc(name)}`)}</figcaption></figure></section>` : ''}

      <section class="pf-sec"><h2 class="pf-h">Perjalanan</h2>
        <ol class="pf-time">${yearList.map((y, i) => { const it = years[y]; return `<li style="--k:${i}"><span class="pt-y">${y}</span><div class="pt-body">
          ${it.notes.map(n => `<p class="pt-note">${rich(n)}</p>`).join('')}
          ${it.works.length ? `<p class="pt-works"><span>${it.works.length} ${t('tulisan terbit', it.works.length === 1 ? 'piece published' : 'pieces published')}</span>${it.works.map(w => `<button type="button" data-pick="${w.key}">${mdisc(w)}${esc(w.title)}</button>`).join('')}</p>` : ''}</div></li>`; }).join('')}</ol></section>

      ${albums.length ? `<section class="pf-sec"><h2 class="pf-h">Diskografi</h2>
        <div class="pf-disco">${albums.map((a, i) => `<button type="button" class="al-card" data-album="${esc(a.id)}" style="--k:${i}">${sleeve(a, 170, false)}<b>${esc(a.title)}</b><small>${a.daily ? t('Racikan harian', 'Daily mix') : 'Album'} · ${a.tracks.length} ${t('sisi', 'sides')}</small></button>`).join('')}</div></section>` : ''}

      ${quote ? `<blockquote class="pf-quote"><p>${rich(quote.text)}</p><cite>${esc(quote.source)}</cite></blockquote>` : ''}

      ${links.length ? `<section class="pf-sec"><h2 class="pf-h">Tautan</h2><div class="pf-links">${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${linkIcon(l.url)}<span>${esc(l.label)}</span></a>`).join('')}</div></section>` : ''}

      <footer class="pf-sign"><canvas id="pfSign"></canvas><p>${t(`Tanda tangan, dirajut dari huruf-huruf “${esc(name)} · ${esc(SITE.title)}”`, `A signature, woven from the letters “${esc(name)} · ${esc(SITE.title)}”`)}</p></footer>`;
    avatarInto($('#pfLabel'), 200);
    $$('canvas[data-cover]', host).forEach(c => requestAnimationFrame(() => paintCover(c, albumOf(c.dataset.cover), Math.min(170, c.parentElement.clientWidth || 170))));
    // potret dan tanda tangan dirajut saat terlihat
    pfObs?.disconnect();
    const knit = el => {
      if (el.id === 'pfPortrait') drawThread(el, bio.join(' ') || name, { w: 300, h: 300, pad: 12, color: SITE.accent || '#1662FF', seed: 'potret/' + name, weight: 1.2, animate: true, frames: 140 });
      // nama saja bisa terlalu sedikit hurufnya, jadi nama meja tulisnya ikut dirajut
      if (el.id === 'pfSign') drawThread(el, (name + ' ' + SITE.title + ' ').repeat(6), { w: 220, h: 220, pad: 8, color: getComputedStyle(el).color, seed: 'tanda/' + name, weight: 1.6, pins: false, animate: true, frames: 160 });
    };
    if ('IntersectionObserver' in window) {
      pfObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { knit(e.target); pfObs.unobserve(e.target); } }), { root: host, threshold: .35 });
      ['#pfPortrait', '#pfSign'].forEach(q => { const c = $(q, host); if (c) pfObs.observe(c); });
    } else ['#pfPortrait', '#pfSign'].forEach(q => { const c = $(q, host); if (c) knit(c); });
    host.scrollTop = 0;
    document.title = `${name} · ${SITE.title}`;
  }
  $('#pfScroll').addEventListener('click', async e => {
    const pk = e.target.closest('[data-pick]');
    if (pk) { const d = docByKey(pk.dataset.pick); if (d) openPicker(d.slug, d.side, d.ch); return; }
    const al = e.target.closest('[data-album]');
    if (al) { location.hash = 'album-' + al.dataset.album; return; }
    const a = e.target.closest('[data-pf]'); if (!a) return;
    if (a.dataset.pf === 'all') playAlbum('semua', 0);
    if (a.dataset.pf === 'radio') startRadio(centralSlug());
    if (a.dataset.pf === 'share') {
      const url = location.href.split('#')[0] + '#tentang';
      try { if (navigator.share) await navigator.share({ title: SITE.author, text: `${SITE.author} · ${SITE.title}`, url }); else { await navigator.clipboard.writeText(url); toast('Tautan profil disalin.'); } }
      catch (err) { if (err.name !== 'AbortError') toast(t('Tautan: ', 'Link: ') + url); }
    }
  });
  avatarInto($('#pillAva'), 22);
  $('#thTitle').addEventListener('click', () => go('tentang'));

  /* ======================================================================
     CATATAN SAMPUL: sampul belakang piringan, dibuka seperti gatefold
     ====================================================================== */
  // kata paling khas: kata yang hanya ada di tulisan ini, dibobot seberapa sering ia muncul
  function khas(d, n = 3) {
    const tf = {};
    (fold(fullText(d)).match(/[a-z]+/g) || []).filter(t => t.length > 4 && !LINK_STOP.has(t)).forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const N = WORKS.length;
    return Object.entries(tf).map(([t, c]) => [t, (1 + Math.log(c)) * Math.log((N + 1) / ((DF[t] || 0) + .5)) + (DF[t] ? 0 : .5)]).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
  }
  const partOfDay = hm => { const h = +String(hm || '').slice(0, 2); return isNaN(h) || !hm ? '' : h < 4 ? t('dini hari', 'small hours') : h < 11 ? t('pagi', 'morning') : h < 15 ? t('siang', 'midday') : h < 18.5 ? t('sore', 'afternoon') : t('malam', 'evening'); };
  function linerOf(d) {
    const w = d.A, L = w.liner || {};
    const day = new Date(w.date + 'T00:00:00').toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const lk = linksOf(w.slug)[0], other = lk && bySlug(lk.a === w.slug ? lk.b : lk.a);
    return {
      when: `${day}${w.time ? t(` · pukul ${w.time.replace(':', '.')}, ${partOfDay(w.time)}`, ` · at ${w.time}, ${partOfDay(w.time)}`) : ''}`,
      place: String(L.place || '').trim(), song: String(L.song || '').trim(), songUrl: String(L.songUrl || '').trim(), story: String(L.story || '').trim(),
      khas: khas(d), longest: Math.max(0, ...(d.lens || [0])), sentences: (d.lens || []).length,
      thread: other ? { w: other, words: lk.words } : null
    };
  }
  function renderLinerCard(d) {
    const L = linerOf(d);
    $('#rlTeaser').textContent = L.story ? (L.story.split(/(?<=[.!?…])\s/)[0].slice(0, 110) + (L.story.length > 110 ? '…' : '')) : t(`Ditulis ${partOfDay(d.A.time) || 'suatu hari'}${L.place ? ' di ' + L.place : ''}. Kata paling khas: ${L.khas.join(', ')}.`, `Written ${partOfDay(d.A.time) ? 'in the ' + partOfDay(d.A.time) : 'one day'}${L.place ? ' in ' + L.place : ''}. Most telling words: ${L.khas.join(', ')}.`);
    requestAnimationFrame(() => drawThread($('#rlArt'), fullText(d), { w: 52, h: 52, pad: 3, color: catOf(d.cat).ink, seed: d.key, pins: false, weight: 1.3 }));
  }
  function openLiner(d) {
    if (!d) return;
    const w = d.A, L = linerOf(d), ink = catOf(w.cat).ink;
    const sides = w.CH || w.S;
    $('#liner').style.setProperty('--ink', ink);
    $('#lnFTitle').textContent = w.title;
    $('#lnFBy').textContent = `${SITE.author} · ${catOf(w.cat).label} · No. ${w.no}`;
    const songHref = L.songUrl ? (/^https?:/i.test(L.songUrl) ? L.songUrl : 'https://' + L.songUrl) : '';
    $('#lnBack').innerHTML = `
      <p class="ln-kick" id="lnHead">Catatan sampul</p>
      <h2 class="ln-title">${esc(w.title)}</h2>
      <div class="ln-tracks${sides.length > 2 ? ' many' : ''}">${sides.map(x => `<div class="ln-side"><h3>${w.CH ? t('Bab', 'Chapter') + ' ' + x.ch : sideWord(x)}</h3>
        <button type="button" data-ln-open="${x.key}"><span>${esc(x.title)}</span><i>${fmtMS(secsOf(x))}</i></button>
        <small>${x.pov ? (LANG === 'en' ? esc(x.pov) + '’s side' : 'dari sisi ' + esc(x.pov)) : w.CH ? '' : x.side !== 'a' ? t('dari sisi yang lain', 'from the other side') : t('cerita aslinya', 'the original')}${x.pov || !w.CH ? ' · ' : ''}${num(x.words)} ${t('kata', 'words')}</small></div>`).join('')}${w.CH || multi(w) ? '' : `<div class="ln-side is-empty"><h3>${t('Sisi B', 'Side B')}</h3><small>${t('Belum direkam.', 'Not recorded yet.')}</small></div>`}</div>
      <dl class="ln-credits">
        <div><dt>Ditulis</dt><dd>${esc(L.when)}</dd></div>
        ${L.place ? `<div><dt>Tempat</dt><dd>${esc(L.place)}</dd></div>` : ''}
        ${L.song ? `<div><dt>Diputar saat menulis</dt><dd>${songHref ? `<a href="${esc(songHref)}" target="_blank" rel="noopener">${esc(L.song)} ↗</a>` : esc(L.song)}</dd></div>` : ''}
        <div><dt>Kata paling khas</dt><dd class="ln-words">${L.khas.map(k => `<i>${esc(k)}</i>`).join('')}</dd></div>
        <div><dt>${t('Ritme', 'Rhythm')}</dt><dd>${t(`${L.sentences} ${w.form === 'puisi' ? 'baris' : 'kalimat'}, terpanjang ${L.longest} kata`, `${L.sentences} ${w.form === 'puisi' ? 'lines' : 'sentences'}, longest ${L.longest} words`)}</dd></div>
        ${L.thread ? `<div><dt>${t('Benang merah', 'Common thread')}</dt><dd><button type="button" data-ln-open="${L.thread.w.key}">“${esc(L.thread.w.title)}”</button> ${t('lewat', 'via')} ${L.thread.words.map(x => `<i>${esc(x)}</i>`).join(t(' dan ', ' and '))}</dd></div>` : ''}
      </dl>
      ${L.story ? `<div class="ln-story">${L.story.split(/\n\s*\n/).map(p => `<p>${rich(p)}</p>`).join('')}</div>` : ''}
      <p class="ln-cat">${esc(SITE.title)} · No. ${w.no} · ${new Date(w.date + 'T00:00:00').getFullYear()}</p>`;
    const el = $('#liner');
    el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    requestAnimationFrame(() => { const c = $('#lnArt'), sz = Math.min(560, c.parentElement.clientWidth || 360); drawThread(c, fullText(d), { w: sz, h: sz, pad: sz * .08, color: ink, seed: d.key, weight: 1.5, animate: !reduced, frames: 90 }); });
    $('#lnClose').focus({ preventScroll: true });
  }
  const closeLiner = () => { $('#liner').hidden = true; };
  $('#lnClose').addEventListener('click', closeLiner);
  $('#liner').addEventListener('click', e => {
    if (e.target.id === 'liner') { closeLiner(); return; }
    const o = e.target.closest('[data-ln-open]');
    if (o) { const d = docByKey(o.dataset.lnOpen); closeLiner(); if (d) openPicker(d.slug, d.side, d.ch); }
  });
  $('#rdLiner').addEventListener('click', () => openLiner(current));
  $('#pkLiner').addEventListener('click', () => openLiner(pkDoc() || bySlug(PK.slug)));

  function initPutar() {
    sievePicker(); syncSieveBtns();
    setListen(PV.listen);
    requestAnimationFrame(() => setFace(pkIndex(), false));
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
  addEventListener('appinstalled', () => { showInstall(false); toast(t(`${SITE.title} terpasang di perangkatmu.`, `${SITE.title} is installed on your device.`)); });
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
