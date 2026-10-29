(() => {
  'use strict';

  /* ======================================================================
     DASAR
     ====================================================================== */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SITE = window.SITE;
  const WORKS = [...window.WORKS].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  [...WORKS].reverse().forEach((w, i) => { w.no = String(i + 1).padStart(2, '0'); });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMQ = matchMedia('(max-width: 860px)');
  const isMobile = () => mobileMQ.matches;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (d, o) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', o);
  const fmtShort = d => fmt(d, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtLong = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const num = n => n.toLocaleString('id-ID');

  const CATS = {
    esai:    { label: 'Esai',       tag: 'ESAI',  ink: '#2F5BFF' },
    puisi:   { label: 'Puisi',      tag: 'PUISI', ink: '#D2338A', red: true },
    cerpen:  { label: 'Cerpen',     tag: 'CERPEN', ink: '#0E8A5C' },
    mini:    { label: 'Fiksi Mini', tag: 'MINI',  ink: '#E0571C' },
    catatan: { label: 'Catatan',    tag: 'CATATAN', ink: '#6A4DF0' },
    milikmu: { label: 'Milikmu',    tag: 'TXT',   ink: '#111214' }
  };
  const FOLDER_TITLES = { esai: 'Esai tentang hal-hal kecil', puisi: 'Puisi yang dicoret berkali-kali' };

  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
  }

  /* ---------- analisis ringan ---------- */
  const wordsOf = s => (s.toLowerCase().match(/[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*/g) || []);
  function units(text, poem) {
    if (poem) return text.split(/\n+/).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
    const flat = text.replace(/\s*\n+\s*/g, ' ');
    return (flat.match(/[^.!?…]+(?:[.!?…]+[”"’)]*|$)/g) || []).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
  }
  const fullText = w => w.body.join('\n\n');
  function prep(w) {
    const t = fullText(w);
    const words = wordsOf(t).length;
    w.words = words;
    w.minutes = Math.max(1, Math.round(words / 170));
    w.lens = units(t, w.form === 'puisi').map(u => wordsOf(u).length).filter(Boolean);
    w.bytes = new Blob([t]).size;
    w.file = (w.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) + '.md';
    return w;
  }
  WORKS.forEach(prep);

  // tulisan yang dijatuhkan pengunjung (hanya di peramban mereka)
  let MINE = store.get('mine', []).map(prep);
  const all = () => [...MINE, ...WORKS];
  const bySlug = slug => all().find(w => w.slug === slug);
  const readSet = new Set(store.get('read', []));
  const notes = store.get('notes', {});

  /* ======================================================================
     SENI BENANG: 26 huruf di lingkaran, benang mengikuti urutan huruf teks
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
    let n = 0;
    ctx.strokeStyle = o.color || '#111';
    ctx.lineWidth = o.lw || Math.max(0.45, r / 170);
    const segs = Math.max(1, seq.length - 1);
    ctx.globalAlpha = clamp(6 / Math.sqrt(segs + 4), 0.05, 0.6) * (o.weight || 1);
    for (let i = 1; i < seq.length; i++) {
      const a = P[seq.charCodeAt(i - 1) - 97], b = P[seq.charCodeAt(i) - 97];
      if (a === b) continue;
      ctx.beginPath();
      ctx.moveTo(a[0] + (rnd() - .5) * j, a[1] + (rnd() - .5) * j);
      ctx.lineTo(b[0] + (rnd() - .5) * j, b[1] + (rnd() - .5) * j);
      ctx.stroke(); n++;
    }
    if (o.pins !== false) {
      ctx.globalAlpha = 1; ctx.fillStyle = o.color || '#111';
      P.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(.7, r / 120), 0, Math.PI * 2); ctx.fill(); });
    }
    return n;
  }
  const coverOf = (canvas, w, o = {}) => drawThread(canvas, fullText(w), { color: CATS[w.cat].ink, seed: w.slug, ...o });
  function mini(w, size = 36) {
    const c = document.createElement('canvas');
    c.style.width = c.style.height = size + 'px';
    c.setAttribute('aria-hidden', 'true');
    requestAnimationFrame(() => coverOf(c, w, { w: size, h: size, pad: 3, pins: false, weight: 1.2 }));
    return c;
  }

  /* ======================================================================
     JENDELA, TAMPILAN, TEMA
     ====================================================================== */
  const win = $('#win');
  const VIEWS = ['kanvas', 'daftar', 'sapa'];
  let view = 'kanvas', prevView = 'kanvas';

  function setView(v) {
    if (v === 'sapa' && !isMobile()) v = 'kanvas';
    if (view !== 'baca') prevView = view;
    view = v;
    win.dataset.view = v;
    syncPill();
    if (v === 'kanvas') canvasFit(false);
    if (v !== 'baca') { stopSpeech(); releaseLock(); }
  }
  function syncPill() {
    $$('.pill [data-go]').forEach(b => {
      const on = b.dataset.go === 'sapa' ? (isMobile() ? view === 'sapa' : !win.classList.contains('dock-off')) : b.dataset.go === view;
      b.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }
  function go(v) {
    if (v === 'sapa' && !isMobile()) { toggleDock(); return; }
    if (location.hash === '#' + v) setView(v); else location.hash = v;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) go(b.dataset.go);
  });

  function toggleDock(force) {
    const off = force != null ? !force : !win.classList.contains('dock-off');
    win.classList.toggle('dock-off', off);
    $('#dockToggle').setAttribute('aria-pressed', String(!off));
    store.set('dockOff', off);
    syncPill();
    setTimeout(() => canvasClamp(), 480);
  }
  $('#dockToggle').addEventListener('click', () => toggleDock());
  if (store.get('dockOff', false)) toggleDock(false);

  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : darkMQ.matches;
  };
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    store.set('theme', dark ? 'dark' : 'light');
    $('#chipDark').setAttribute('aria-checked', String(dark));
  }
  $('#chipDark').setAttribute('aria-checked', String(isDark()));
  $('#chipDark').addEventListener('click', () => setTheme(!isDark()));
  darkMQ.addEventListener?.('change', () => $('#chipDark').setAttribute('aria-checked', String(isDark())));

  const BACKDROPS = ['auto', 'senja', 'kabut', 'malam'];
  const BD_NAMES = { auto: 'Otomatis', senja: 'Senja', kabut: 'Kabut', malam: 'Malam' };
  let backdrop = store.get('backdrop', 'auto');
  function applyBackdrop() {
    if (backdrop === 'auto') document.documentElement.removeAttribute('data-backdrop');
    else document.documentElement.setAttribute('data-backdrop', backdrop);
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
  const pos = store.get('pos', {});
  let stickies = store.get('stickies', []);
  let zTop = 10;

  const LAYOUT = [
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

  function tinyOf(w) {
    if (w.form === 'puisi') return `<div class="tiny"><p class="poem">${esc(w.body.slice(0, 3).join('\n\n'))}</p></div>`;
    const sents = units(w.body.slice(1).join(' '), false).slice(0, 3);
    return `<div class="tiny"><p>${esc(w.body[0])}</p><b>${esc(w.line)}</b>${sents.map(s => `<p class="li">${esc(s)}</p>`).join('')}</div>`;
  }
  function objHTML(o) {
    const w = o.slug && bySlug(o.slug);
    if (o.type === 'paper') return `
      <article class="obj paper" tabindex="0" data-open="${w.slug}" aria-label="${esc(w.title)}, ${CATS[w.cat].label}">
        ${o.peek ? (() => { const pw = bySlug(o.peek); return `<div class="peek" data-open="${pw.slug}">${esc(pw.body[0].replace(/\n/g, ' '))}…</div>`; })() : ''}
        <div class="sheet"><p class="k">${CATS[w.cat].label}</p><h3>${esc(w.title)}</h3>${tinyOf(w)}</div>
      </article>`;
    if (o.type === 'folder') {
      const items = WORKS.filter(x => x.cat === o.cat);
      return `
      <article class="obj folder" tabindex="0" data-shelf="${o.cat}" aria-label="Kumpulan ${CATS[o.cat].label}, ${items.length} tulisan">
        <div class="in-paper"><p class="t">${esc(items[0].body[0])}</p></div><div class="in-paper"></div><div class="in-lime"></div>
        <svg class="shape" viewBox="0 0 176 250" preserveAspectRatio="none" aria-hidden="true"><path d="M10 0H166Q176 0 176 10V58C176 80 144 76 144 102V150C144 176 176 172 176 194V240Q176 250 166 250H10Q0 250 0 240V10Q0 0 10 0Z"/></svg>
        <div class="f-label"><p>Kumpulan · ${items.length}</p><h3>${esc(FOLDER_TITLES[o.cat] || CATS[o.cat].label)}</h3></div>
      </article>`;
    }
    if (o.type === 'img') return `
      <article class="obj imgcard" tabindex="0" data-open="${w.slug}" aria-label="Peta benang dari ${esc(w.title)}">
        <canvas data-thread="${w.slug}"></canvas><span class="cap">benang dari “${esc(w.title)}”</span>
      </article>`;
    if (o.type === 'note') return `
      <button class="obj note" type="button" data-open="${w.slug}">Gambar ini dirajut dari huruf-huruf cerpennya. Ketuk untuk membaca.</button>`;
    if (o.type === 'sticky') return `
      <article class="obj sticky" tabindex="0" data-open="${w.slug}" aria-label="Baris dari ${esc(w.title)}">${esc(w.line)}<span class="from">— ${esc(w.title)}</span></article>`;
    if (o.type === 'mine') return `
      <article class="obj paper" tabindex="0" data-open="${w.slug}" aria-label="${esc(w.title)}, tulisanmu">
        <div class="sheet"><p class="k">Milikmu</p><h3>${esc(w.title)}</h3>${tinyOf(w)}</div>
      </article>`;
    if (o.type === 'user') return `
      <article class="obj sticky" data-sticky="${o.id}">
        <button class="x" type="button" aria-label="Hapus catatan">×</button>
        <div class="edit" contenteditable="true" spellcheck="false" aria-label="Catatan tempel">${esc(o.text || '')}</div>
      </article>`;
    return '';
  }
  function canvasObjects() {
    const list = LAYOUT.filter(o => !o.slug || bySlug(o.slug)).slice();
    MINE.forEach((w, i) => list.push({ id: 'm:' + w.slug, type: 'mine', slug: w.slug, x: 1140 + i * 40, y: 700 + i * 30 }));
    stickies.forEach(s => list.push({ ...s, type: 'user' }));
    return list;
  }
  function renderCanvas() {
    const objs = canvasObjects();
    world.innerHTML = objs.map(objHTML).join('');
    [...world.children].forEach((el, i) => {
      const o = objs[i], p = pos[o.id] || o;
      el.dataset.id = o.id;
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      el.style.zIndex = p.z || (i + 1);
      zTop = Math.max(zTop, p.z || 0, i + 1);
    });
    $$('canvas[data-thread]', world).forEach(c => drawThread(c, fullText(bySlug(c.dataset.thread)), { color: '#2A2620', seed: c.dataset.thread, weight: 1.3, pad: 12 }));
  }
  function applyCam() { world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`; }
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
    const saved = store.get('cam', null);
    if (saved && !force) { Object.assign(cam, saved); canvasClamp(); return; }
    cam.s = clamp(Math.min(vh / 620, vw / 900), 0.6, 1);
    cam.x = vw / 2 - 1150 * cam.s;
    cam.y = vh / 2 - 520 * cam.s;
    canvasClamp();
  }
  const saveCam = () => store.set('cam', { x: Math.round(cam.x), y: Math.round(cam.y), s: +cam.s.toFixed(3) });

  // interaksi: geser latar, pindahkan objek, cubit untuk zoom
  const pointers = new Map();
  let act = null, pinch = null;
  const hideHint = () => $('#canvasHint').classList.add('gone');
  viewport.addEventListener('pointerdown', e => {
    if (e.target.closest('.edit, .x')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s, x: cam.x, y: cam.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      if (act?.obj) act.obj.classList.remove('dragging');
      act = null; return;
    }
    const obj = e.target.closest('.obj');
    if (obj) act = { obj, sx: e.clientX, sy: e.clientY, ox: parseFloat(obj.style.left), oy: parseFloat(obj.style.top), moved: false, target: e.target };
    else { act = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }; viewport.classList.add('panning'); }
  });
  viewport.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.mx, pinch.my, clamp(pinch.s * d / pinch.d, 0.45, 1.6), pinch);
      return;
    }
    if (!act) return;
    const dx = e.clientX - act.sx, dy = e.clientY - act.sy;
    if (act.pan) { cam.x = act.cx + dx; cam.y = act.cy + dy; canvasClamp(); hideHint(); return; }
    if (!act.moved && Math.hypot(dx, dy) > 5) {
      act.moved = true; act.obj.classList.add('dragging');
      act.obj.style.zIndex = ++zTop; hideHint();
    }
    if (act.moved) {
      act.obj.style.left = Math.round(act.ox + dx / cam.s) + 'px';
      act.obj.style.top = Math.round(act.oy + dy / cam.s) + 'px';
    }
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    viewport.classList.remove('panning');
    if (!act) { saveCam(); return; }
    const a = act; act = null;
    if (a.pan) { saveCam(); return; }
    a.obj.classList.remove('dragging');
    if (a.moved) {
      pos[a.obj.dataset.id] = { x: parseFloat(a.obj.style.left), y: parseFloat(a.obj.style.top), z: +a.obj.style.zIndex };
      store.set('pos', pos);
      const s = stickies.find(s => s.id === a.obj.dataset.id);
      if (s) { s.x = pos[s.id].x; s.y = pos[s.id].y; store.set('stickies', stickies); }
    } else if (e.type === 'pointerup') activate(a.obj, a.target);
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  function zoomAt(px, py, s, base = cam) {
    const r = viewport.getBoundingClientRect();
    const wx = (px - r.left - base.x) / base.s, wy = (py - r.top - base.y) / base.s;
    cam.s = s;
    cam.x = px - r.left - wx * s; cam.y = py - r.top - wy * s;
    canvasClamp();
  }
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, clamp(cam.s * Math.exp(-e.deltaY * 0.01), 0.45, 1.6));
    else { cam.x -= e.shiftKey ? e.deltaY : e.deltaX; cam.y -= e.shiftKey ? 0 : e.deltaY; canvasClamp(); }
    hideHint();
    clearTimeout(viewport._t); viewport._t = setTimeout(saveCam, 300);
  }, { passive: false });
  viewport.addEventListener('keydown', e => {
    if (e.target.closest('.edit')) return;
    const step = { ArrowLeft: [90, 0], ArrowRight: [-90, 0], ArrowUp: [0, 90], ArrowDown: [0, -90] }[e.key];
    if (step && e.target === viewport) { e.preventDefault(); cam.x += step[0]; cam.y += step[1]; canvasClamp(); saveCam(); }
    if (e.key === 'Enter' && e.target.classList.contains('obj')) activate(e.target, e.target);
  });
  function activate(obj, target) {
    const open = (target && target.closest('[data-open]')) || obj;
    if (obj.dataset.shelf) { shelf = obj.dataset.shelf; renderList(); go('daftar'); return; }
    if (open.dataset.open) openWork(open.dataset.open);
  }

  // catatan tempel milik pengunjung
  function addSticky() {
    if (view !== 'kanvas') go('kanvas');
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const s = { id: 'u:' + Date.now().toString(36), text: '', x: Math.round((vw / 2 - cam.x) / cam.s - 59), y: Math.round((vh / 2 - cam.y) / cam.s - 59) };
    stickies.push(s); store.set('stickies', stickies);
    renderCanvas();
    $(`[data-sticky="${s.id}"] .edit`)?.focus();
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
    if (!el || !e.target.classList.contains('edit')) return;
    if (!e.target.textContent.trim()) removeSticky(el.dataset.sticky);
  });
  world.addEventListener('click', e => {
    const x = e.target.closest('.x');
    if (x) removeSticky(x.closest('[data-sticky]').dataset.sticky);
  });
  function removeSticky(id) {
    stickies = stickies.filter(s => s.id !== id); store.set('stickies', stickies);
    delete pos[id]; store.set('pos', pos);
    renderCanvas();
  }

  /* ======================================================================
     DAFTAR
     ====================================================================== */
  let shelf = 'semua';
  const openYears = new Set(store.get('openYears', ['2025']));
  const selected = new Set();
  let queue = [];

  function shelfItems(k) { return k === 'semua' ? all() : all().filter(w => w.cat === k); }
  function renderShelves() {
    const keys = ['semua', ...Object.keys(CATS).filter(k => all().some(w => w.cat === k))];
    const host = $('#shelves');
    host.innerHTML = keys.map(k => {
      const items = shelfItems(k);
      return `<button class="shelf" type="button" data-shelf="${k}" aria-pressed="${k === shelf}">
        <span class="n">${items.length}</span><span class="dots3" aria-hidden="true"></span>
        <h3>${k === 'semua' ? 'Semua tulisan' : CATS[k].label}</h3>
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
    renderRows();
  });

  const shortName = f => f.length > 24 ? f.slice(0, 12) + '…' + f.slice(-10) : f;
  const kb = b => (b / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' KB';
  function docIcon(w) {
    return `<div class="doc" aria-hidden="true"><div class="pg"></div><span class="tag${CATS[w.cat].red ? ' red' : ''}">${CATS[w.cat].tag}</span></div>`;
  }
  function rowHTML(w, child) {
    return `<div class="row${child ? ' child' : ''}${selected.has(w.slug) ? ' sel' : ''}" data-slug="${w.slug}">
      ${docIcon(w)}
      <div class="r-text">
        <p class="r-title">${esc(w.title)}${readSet.has(w.slug) ? '' : '<span class="r-unread" title="belum dibaca"></span>'}</p>
        <p class="r-sub">${esc(shortName(w.file))} ${kb(w.bytes)}</p>
        <p class="r-note" contenteditable="true" spellcheck="false" data-note="${w.slug}" aria-label="Catatan untuk ${esc(w.title)}">${esc(notes[w.slug] || '')}</p>
      </div>
      <p class="r-date">${fmtShort(w.date)} ${w.time || ''}</p>
    </div>`;
  }
  const cbHTML = (state, label, data) => `<button class="cb" type="button" role="checkbox" aria-checked="${state}" aria-label="${esc(label)}" ${data}></button>`;
  const cbState = items => { const n = items.filter(w => selected.has(w.slug)).length; return n === 0 ? 'false' : n === items.length ? 'true' : 'mixed'; };

  function renderRows() {
    const items = shelfItems(shelf);
    const topYear = WORKS[0].date.slice(0, 4);
    const top = items.filter(w => w.mine || w.date.startsWith(topYear));
    const years = [...new Set(items.filter(w => !top.includes(w)).map(w => w.date.slice(0, 4)))].sort().reverse();
    let html = '';
    if (top.length) {
      html += `<div class="grp flat"><div class="grp-cbs">${top.map(w => cbHTML(selected.has(w.slug), 'Pilih ' + w.title, `data-sel="${w.slug}"`)).join('')}</div>
        <div class="grp-panel" style="background:none;box-shadow:none">${top.map(w => rowHTML(w, false)).join('')}</div></div>`;
    }
    years.forEach(y => {
      const ws = items.filter(w => !top.includes(w) && w.date.startsWith(y));
      const open = openYears.has(y);
      html += `<div class="grp${open ? ' open' : ''}">
        <div class="grp-cbs">${cbHTML(cbState(ws), 'Pilih semua dari ' + y, `data-year-sel="${y}"`)}${open ? ws.map(w => cbHTML(selected.has(w.slug), 'Pilih ' + w.title, `data-sel="${w.slug}"`)).join('') : ''}</div>
        <div class="grp-panel">
          <div class="row folder-row" data-year="${y}" role="button" tabindex="0" aria-expanded="${open}">
            <div class="fold-ic" aria-hidden="true"><svg viewBox="0 0 62 52"><path class="bg" d="M14 4h12l4 4h22a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5z"/><path class="bg" d="M7 12h12l4 4h29a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5z"/></svg></div>
            <div class="r-text"><p class="r-title">${y}</p><p class="r-sub">${ws.length} tulisan</p><p class="r-note" style="cursor:inherit">${esc((SITE.years || {})[y] || '')}</p></div>
            <p class="r-date">${fmtShort(ws[0].date)} ${ws[0].time || ''}</p>
          </div>
          ${open ? ws.map(w => rowHTML(w, true)).join('') : ''}
        </div></div>`;
    });
    $('#libRows').innerHTML = html || '<p style="padding:24px;color:var(--muted)">Belum ada tulisan di rak ini.</p>';
    $('#cbAll').setAttribute('aria-checked', cbState(items));
    syncSelbar();
  }
  function renderList() { renderShelves(); renderRows(); updateBadge(); }

  $('#libRows').addEventListener('click', e => {
    if (e.target.closest('.r-note[data-note]')) return;
    const cb = e.target.closest('.cb');
    if (cb) {
      if (cb.dataset.sel) { selected.has(cb.dataset.sel) ? selected.delete(cb.dataset.sel) : selected.add(cb.dataset.sel); }
      if (cb.dataset.yearSel) {
        const ws = shelfItems(shelf).filter(w => w.date.startsWith(cb.dataset.yearSel) && !w.mine);
        const allOn = ws.every(w => selected.has(w.slug));
        ws.forEach(w => allOn ? selected.delete(w.slug) : selected.add(w.slug));
        openYears.add(cb.dataset.yearSel);
      }
      renderRows(); return;
    }
    const fr = e.target.closest('.folder-row');
    if (fr) { toggleYear(fr.dataset.year); return; }
    const row = e.target.closest('.row[data-slug]');
    if (row) openWork(row.dataset.slug);
  });
  $('#libRows').addEventListener('keydown', e => {
    const fr = e.target.closest('.folder-row');
    if (fr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleYear(fr.dataset.year); }
    if (e.target.matches('.r-note') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });
  function toggleYear(y) {
    openYears.has(y) ? openYears.delete(y) : openYears.add(y);
    store.set('openYears', [...openYears]);
    renderRows();
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
    items.forEach(w => allOn ? selected.delete(w.slug) : selected.add(w.slug));
    renderRows();
  });
  function syncSelbar() {
    $('#selbar').hidden = selected.size === 0;
    $('#selCount').textContent = selected.size + ' dipilih';
  }
  $('#selClear').addEventListener('click', () => { selected.clear(); renderRows(); });
  $('#selRead').addEventListener('click', () => {
    queue = all().filter(w => selected.has(w.slug)).map(w => w.slug);
    if (queue.length) { toast(`Membaca ${queue.length} tulisan berurutan.`); openWork(queue[0]); }
  });
  function updateBadge() {
    const n = WORKS.filter(w => !readSet.has(w.slug)).length;
    const b = $('#unreadBadge');
    b.textContent = n; b.classList.toggle('zero', n === 0);
    renderGreet();
  }

  /* ---------- tulisan yang dijatuhkan ---------- */
  async function addFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) { toast('Berkasnya lebih dari 1 MB. Coba yang lebih kecil.'); return; }
    if (!/\.(txt|md|markdown)$/i.test(file.name) && !/^text\//.test(file.type)) { toast('Hanya berkas teks (.txt atau .md) yang bisa dibaca.'); return; }
    const raw = (await file.text()).replace(/\r/g, '').trim();
    if (!raw) { toast('Berkasnya kosong.'); return; }
    let lines = raw.split('\n');
    let title = file.name.replace(/\.[^.]+$/, '');
    if (/^#\s+/.test(lines[0]) || (lines[0].length < 80 && lines[1] === '')) { title = lines.shift().replace(/^#+\s*/, ''); }
    const text = lines.join('\n').trim();
    const blocks = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const short = text.split('\n').filter(Boolean);
    const poem = short.length > 3 && short.reduce((a, l) => a + l.length, 0) / short.length < 48;
    const now = new Date();
    const w = prep({
      slug: 'u-' + now.getTime().toString(36), title: title.slice(0, 90), cat: 'milikmu', form: poem ? 'puisi' : 'prosa', mine: true,
      date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5),
      excerpt: blocks[0].slice(0, 140), line: (units(text, poem)[0] || title).slice(0, 90),
      body: poem ? blocks : blocks.map(b => b.replace(/\n/g, ' '))
    });
    w.no = '—';
    MINE.unshift(w);
    store.set('mine', MINE.map(({ slug, title, cat, form, mine, date, time, excerpt, line, body }) => ({ slug, title, cat, form, mine, date, time, excerpt, line, body })));
    renderCanvas(); renderList();
    toast(`“${w.title}” ditambahkan ke meja.`);
    openWork(w.slug);
  }
  $('#fileIn').addEventListener('change', e => { addFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(t => document.addEventListener(t, e => {
    if (t === 'dragleave' && e.relatedTarget) return;
    drop.classList.remove('over');
  }));
  document.addEventListener('drop', e => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    addFile(e.dataTransfer.files[0]);
  });

  /* ======================================================================
     PANEL SAPA
     ====================================================================== */
  const dock = $('#dock');
  let statsMode = false;
  function renderGreet() {
    const unread = WORKS.filter(w => !readSet.has(w.slug));
    const latest = WORKS[0];
    const month = fmt(latest.date, { month: 'long', year: 'numeric' });
    const sameMonth = WORKS.filter(w => w.date.slice(0, 7) === latest.date.slice(0, 7)).length;
    const total = WORKS.reduce((a, w) => a + w.words, 0);
    const g = $('#tkGreet');
    if (statsMode) {
      const long = WORKS.reduce((a, w) => w.words > a.words ? w : a), short = WORKS.reduce((a, w) => w.words < a.words ? w : a);
      g.innerHTML = `<span class="dim">Totalnya</span> ${num(total)} kata <span class="dim">dalam</span> ${WORKS.length} tulisan<span class="dim">. Paling panjang</span>
        <button type="button" data-act="open" data-slug="${long.slug}">“${esc(long.title)}”</button> <span class="dim">(${long.words}), paling singkat</span>
        <button type="button" data-act="open" data-slug="${short.slug}">“${esc(short.title)}”</button><span class="dim"> (${short.words}).</span>`;
    } else {
      g.innerHTML = `<span class="dim">Hai,</span> <span class="ava-in"><canvas id="tkAva"></canvas></span> pembaca.
        <span class="dim">Meja ini</span> <span class="nw"><i class="dot-o" aria-hidden="true"></i><button type="button" data-act="list">${WORKS.length} tulisan</button></span>
        <span class="dim">— dari</span> <span class="nw"><span class="ava-stack" id="tkStack"></span><span class="dim">esai</span></span> <span class="dim">sampai puisi. Kamu punya</span>
        <span class="nw"><span class="ico-bubble" aria-hidden="true"></span><button type="button" data-act="unread">${unread.length ? unread.length + ' belum' : 'semua sudah'}</button></span> <button type="button" data-act="unread">dibaca</button>
        <span class="dim">dan</span> <span class="nw"><span class="ico-cal" aria-hidden="true"><b>${new Date(latest.date + 'T00:00:00').getDate()}</b></span><button type="button" data-act="open" data-slug="${latest.slug}">${sameMonth} terbit</button></span> <button type="button" data-act="open" data-slug="${latest.slug}">${esc(month)}.</button>`;
      const ava = $('#tkAva');
      requestAnimationFrame(() => drawThread(ava, SITE.author + ' menulis', { w: 24, h: 24, pad: 2, color: '#7A2448', seed: 'me', pins: false, weight: 1.4 }));
      const st = $('#tkStack');
      ['esai', 'cerpen', 'puisi'].map(c => WORKS.find(w => w.cat === c)).filter(Boolean).forEach(w => st.append(mini(w, 22)));
    }
    $('#tkMeta').innerHTML = `
      <span>diperbarui ${fmt(latest.date, { day: 'numeric', month: 'short' })}</span><i class="sep"></i>
      <span title="tulisan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18.5 11.5-6.4 6.4a4.2 4.2 0 0 1-6-6l7.1-7.1a2.8 2.8 0 0 1 4 4l-7 7a1.4 1.4 0 0 1-2-2l6.4-6.4"/></svg>${WORKS.length}</span><i class="sep"></i>
      <span title="jenis tulisan"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M3.5 9.5h17"/></svg>${new Set(WORKS.map(w => w.cat)).size}</span><i class="sep"></i>
      <span title="kata"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>${num(total)} kata</span>`;
  }
  $('#tkGreet').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'list') { shelf = 'semua'; renderList(); go('daftar'); }
    if (b.dataset.act === 'unread') { const u = WORKS.find(w => !readSet.has(w.slug)); if (u) openWork(u.slug); else go('daftar'); }
    if (b.dataset.act === 'open') openWork(b.dataset.slug);
  });
  $('#tkStats').addEventListener('click', e => {
    statsMode = !statsMode; e.currentTarget.setAttribute('aria-pressed', String(statsMode));
    renderGreet();
  });
  $('#tkGear').addEventListener('click', () => { $('#chipDark').scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); $('#chipDark').focus({ preventScroll: true }); });
  $('#tkBack').addEventListener('click', () => go(isMobile() ? 'kanvas' : (view === 'kanvas' ? 'daftar' : 'kanvas')));

  // pegangan: ketuk atau tarik untuk menciutkan kartu biru
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

  // isi bawah: kutipan bergilir, daftar baca, atau hasil cari
  const feed = $('#tkFeed');
  let feedMode = 'feed', feedIdx = Math.floor(Math.random() * WORKS.length), feedT;
  const noteOf = w => `Dari ${CATS[w.cat].label.toLowerCase()} <button type="button" data-open="${w.slug}">“${esc(w.title)}”</button> <span class="spark"><canvas data-spark="${w.slug}"></canvas></span> ditulis ${fmtLong(w.date)}, ${w.words} kata, kira-kira ${w.minutes} menit membaca.`;
  function renderFeed() {
    clearTimeout(feedT);
    feed.classList.toggle('plain', feedMode !== 'feed');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === feedMode)));
    if (feedMode === 'list') {
      feed.innerHTML = `<ul class="tk-list">${all().map(w => `<li><a href="#baca-${w.slug}"><b>${esc(w.title)}</b><span class="${readSet.has(w.slug) ? 'ok' : ''}">${readSet.has(w.slug) ? '✓ dibaca' : w.minutes + ' mnt'}</span><span>${CATS[w.cat].label} · ${fmtShort(w.date)}</span></a></li>`).join('')}</ul>`;
      return;
    }
    if (feedMode !== 'feed') return;
    const w = WORKS[feedIdx % WORKS.length], prev = WORKS[(feedIdx + WORKS.length - 1) % WORKS.length];
    const para = w.body[Math.min(1, w.body.length - 1)];
    feed.innerHTML = `<div class="fd">
      <p class="fd-pre">${noteOf(prev).replace(/<[^>]+>/g, '')}</p>
      <p class="fd-quote">${esc(para.length > 260 ? para.slice(0, 260) + '…' : para).replace(/\n/g, '<br>')}</p>
      <p class="fd-note">${noteOf(w)}</p></div>`;
    $$('canvas[data-spark]', feed).forEach(c => requestAnimationFrame(() => drawThread(c, fullText(bySlug(c.dataset.spark)), { w: 26, h: 20, pad: 1, color: '#fff', seed: c.dataset.spark, pins: false, weight: 1.3 })));
    if (!reduced) feedT = setTimeout(() => { if (!feed.matches(':hover') && !document.hidden) feedIdx++; renderFeed(); }, 9000);
  }
  $('.tk-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (b) { feedMode = b.dataset.mode; renderFeed(); }
  });
  feed.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) openWork(b.dataset.open);
    if (e.target.closest('[data-clear]')) { $('#tkInput').value = ''; feedMode = 'feed'; renderFeed(); }
  });
  $('#chipRandom').addEventListener('click', () => openWork(WORKS[Math.floor(Math.random() * WORKS.length)].slug));
  $('#tkAsk').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#tkInput').value.trim();
    if (!q) { $('#tkInput').focus(); return; }
    const res = search(q);
    feedMode = 'search'; clearTimeout(feedT);
    feed.classList.add('plain');
    $$('.tk-seg button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    feed.innerHTML = `<p class="tk-res-h"><span>${res.length} hasil untuk “${esc(q)}”</span><button type="button" data-clear>hapus</button></p>
      <ul class="tk-list">${res.map(r => `<li><a href="#baca-${r.w.slug}"><b>${esc(r.w.title)}</b><span>${CATS[r.w.cat].label}</span><span style="grid-column:1/-1">${r.snip}</span></a></li>`).join('') || '<li style="color:var(--dock-muted);padding:10px 12px">Tidak ada kalimat yang cocok. Coba “hujan” atau “Senin”.</li>'}</ul>`;
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
  const rd = Object.assign({ rt: 'putih', custom: '#F3E9DC', font: 'newsreader', size: 19, weight: 400, liga: true, align: 'start', bright: 100 }, store.get('rd', {}));
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
    el.addEventListener('pointerdown', e => { on = true; el.setPointerCapture(e.pointerId); setFrom(e.clientY); });
    el.addEventListener('pointermove', e => { if (on) setFrom(e.clientY); });
    el.addEventListener('pointerup', () => { on = false; });
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
  });
  $('#swLiga').addEventListener('click', () => { rd.liga = !rd.liga; applyRd(); saveRd(); });
  $('.aligns').addEventListener('click', e => { const b = e.target.closest('[data-align]'); if (b) { rd.align = b.dataset.align; applyRd(); saveRd(); } });
  $('#rsText').addEventListener('click', () => { $('#rsMain').hidden = true; $('#rsAdv').hidden = false; $('#rs').scrollTop = 0; $('#advBack').focus({ preventScroll: true }); });
  $('#advBack').addEventListener('click', () => { $('#rsAdv').hidden = true; $('#rsMain').hidden = false; $('#rsText').focus({ preventScroll: true }); });
  $('#rsFocus').addEventListener('click', () => { focusMode = !focusMode; $('#rsFocus').setAttribute('aria-pressed', String(focusMode)); body.classList.toggle('focus', focusMode); onScroll(); });

  // lembar pengaturan di ponsel
  const rs = $('#rs');
  function setSheet(open) { rs.classList.toggle('open', open); $('#aaFab').setAttribute('aria-expanded', String(open)); }
  $('#aaFab').addEventListener('click', () => setSheet(!rs.classList.contains('open')));
  $('#rsHandle').addEventListener('click', () => { if (isMobile()) setSheet(false); else rs.scrollTo({ top: 0, behavior: 'smooth' }); });

  function renderBody(q) {
    const w = current;
    const mark = t => {
      if (!q) return esc(t);
      const lt = t.toLowerCase(), lq = q.toLowerCase();
      let out = '', i = 0, k;
      while ((k = lt.indexOf(lq, i)) >= 0) { out += esc(t.slice(i, k)) + '<mark>' + esc(t.slice(k, k + q.length)) + '</mark>'; i = k + q.length; }
      return out + esc(t.slice(i));
    };
    body.className = 'rd-body' + (focusMode ? ' focus' : '');
    body.innerHTML = w.body.map(p => w.form === 'puisi' ? `<p class="stanza">${mark(p)}</p>` : `<p>${mark(p)}</p>`).join('');
  }
  function rhythm(host, lens) {
    const n = lens.length, W = 600, H = 64;
    if (!n) { host.innerHTML = ''; return; }
    const max = Math.max(...lens), bw = W / n, bar = Math.max(2, Math.min(bw * .6, 18));
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${n} kalimat, terpanjang ${max} kata">${lens.map((l, i) => {
      const h = Math.max(3, l / max * (H - 4));
      return `<rect x="${(i * bw + (bw - bar) / 2).toFixed(1)}" y="${((H - h) / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(bar / 2, 4)}" fill="currentColor" opacity="${(.35 + .65 * l / max).toFixed(2)}"><title>${l} kata</title></rect>`;
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
    stopSpeech(); closeFind();
    current = w;
    setView('baca');
    $('#rdBackLabel').textContent = prevView === 'daftar' ? 'Daftar' : prevView === 'sapa' ? 'Sapa' : 'Kanvas';
    $('#rdCrumb').textContent = `${CATS[w.cat].label} · ${w.title}`;
    $('#rdMeta').innerHTML = `<span>${CATS[w.cat].label}</span><span>No. ${w.no}</span><span>${fmtLong(w.date)}</span><span>${num(w.words)} kata · ${w.minutes} menit</span>`;
    $('#rdTitle').textContent = w.title;
    renderBody('');
    rhythm($('#rdRhythm'), w.lens);
    const { prev, next } = neighbors();
    $('#rdNextLink').href = '#baca-' + next.slug;
    $('b', $('#rdNextLink')).textContent = next.title;
    $('#rdPrev').dataset.slug = prev.slug; $('#rdNext').dataset.slug = next.slug;
    $('#advPreview').textContent = w.body[0].replace(/\n/g, ' ');
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
    if (!w.mine && !readSet.has(slug)) { readSet.add(slug); store.set('read', [...readSet]); }
    updateBadge(); renderRows(); if (feedMode === 'list') renderFeed();
    document.title = `${w.title} · Juan Menulis`;
    scroller.focus({ preventScroll: true });
  }
  scroller.tabIndex = -1;
  function openWork(slug) {
    if (location.hash === '#baca-' + slug) showReader(slug); else location.hash = 'baca-' + slug;
  }
  $('#rdBack').addEventListener('click', () => go(prevView === 'baca' ? 'kanvas' : prevView));
  $('#rdPrev').addEventListener('click', e => openWork(e.currentTarget.dataset.slug));
  $('#rdNext').addEventListener('click', e => openWork(e.currentTarget.dataset.slug));

  function onScroll() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    $('#rdProg').style.width = (max > 0 ? scroller.scrollTop / max * 100 : 100) + '%';
    if (!focusMode) return;
    const r0 = scroller.getBoundingClientRect(), mid = r0.top + r0.height * .45;
    let best = null, bd = Infinity;
    [...body.children].forEach(p => { const r = p.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = p; } });
    [...body.children].forEach(p => p.classList.toggle('cur', p === best));
  }
  scroller.addEventListener('scroll', onScroll, { passive: true });

  // tandai posisi
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

  // layar tetap menyala
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

  // dengarkan
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

  // cari di dalam tulisan
  let hits = [], hit = 0;
  function openFind() { $('#rdFind').hidden = false; $('#findIn').focus(); if (isMobile()) setSheet(false); }
  function closeFind() { $('#rdFind').hidden = true; $('#findIn').value = ''; $('#findCount').textContent = ''; if (current) renderBody(''); }
  function runFind() {
    const q = $('#findIn').value.trim();
    renderBody(q.length > 1 ? q : '');
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
      if (fold(CATS[w.cat].label).includes(nq)) score += 2;
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
  function renderPalette() {
    pItems = search(pInput.value);
    pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
    pResults.innerHTML = pItems.length
      ? pItems.map((r, i) => `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-slug="${r.w.slug}">${docIcon(r.w)}<span class="p-title">${esc(r.w.title)}</span><span class="p-snip">${r.snip}</span></li>`).join('')
      : '<li class="p-empty">Tidak ada yang cocok. Coba kata lain, misalnya “hujan” atau “Senin”.</li>';
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
      renderPalette(); $('#po-' + pSel)?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && pItems[pSel]) { closePalette(); openWork(pItems[pSel].w.slug); }
  });
  pResults.addEventListener('click', e => { const li = e.target.closest('[data-slug]'); if (li) { closePalette(); openWork(li.dataset.slug); } });
  palette.addEventListener('click', e => { if (e.target === palette) closePalette(); });

  /* ======================================================================
     KEYBOARD & RUTE
     ====================================================================== */
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') {
      if (!palette.hidden) return closePalette();
      if (!$('#rdFind').hidden) return closeFind();
      if (rs.classList.contains('open')) return setSheet(false);
      if (!$('#rsAdv').hidden && view === 'baca') return $('#advBack').click();
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

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const m = h.match(/^baca-([\w-]+)$/);
    if (m && bySlug(m[1])) { showReader(m[1]); return; }
    if (VIEWS.includes(h)) { setView(h); return; }
    setView(isMobile() ? 'sapa' : 'kanvas');
  }
  addEventListener('hashchange', route);
  mobileMQ.addEventListener?.('change', () => { if (view === 'sapa' && !isMobile()) setView('kanvas'); syncPill(); });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { canvasClamp(); if (current && view === 'baca') rhythm($('#rdRhythm'), current.lens); }, 150); });

  /* ======================================================================
     MULAI
     ====================================================================== */
  drawThread($('#meAvatar'), SITE.author + ' menulis setiap hari', { w: 84, h: 84, pad: 8, color: '#7A2448', seed: 'me', weight: 1.2 });
  renderCanvas();
  renderList();
  renderFeed();
  applyRd();
  route();
  requestAnimationFrame(() => canvasFit(false));
})();
