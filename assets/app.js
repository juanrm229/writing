(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SITE = window.SITE;
  const WORKS = [...window.WORKS].sort((a, b) => b.date.localeCompare(a.date));
  const BY_SLUG = Object.fromEntries(WORKS.map(w => [w.slug, w]));
  // nomor katalog: urutan terbit, yang tertua = 01
  [...WORKS].reverse().forEach((w, i) => { w.no = String(i + 1).padStart(2, '0'); });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* tidak apa-apa */ } }
  };

  const CATS = {
    esai:    { label: 'Esai',       color: '--c-esai',    tint: '--lav' },
    puisi:   { label: 'Puisi',      color: '--c-puisi',   tint: '--pink' },
    cerpen:  { label: 'Cerpen',     color: '--c-cerpen',  tint: '--mint' },
    mini:    { label: 'Fiksi Mini', color: '--c-mini',    tint: '--butter' },
    catatan: { label: 'Catatan',    color: '--c-catatan', tint: '--lime' }
  };
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const catStyle = w => `--cat:var(${CATS[w.cat].color});--tint:var(${CATS[w.cat].tint})`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a = 0, b = 10) => Math.max(a, Math.min(b, v));
  const fullText = w => w.body.join('\n\n');
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fmtDate = (d, opts = { month: 'short', year: 'numeric' }) =>
    new Date(d + 'T00:00:00').toLocaleDateString('id-ID', opts);

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
  }
  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch (e) { toast('Tidak bisa menyalin otomatis. Pilih teksnya lalu salin manual.'); }
  }

  /* ======================================================================
     ANALISIS TEKS
     ====================================================================== */
  const STOP = new Set(('yang dan di ke dari itu ini aku kamu ia dia kita kami mereka dengan untuk pada ada tidak tapi tetapi juga akan sudah saja ' +
    'karena seperti adalah sebagai atau dalam bahwa lalu kalau jika apa satu setiap lebih sangat hanya masih bisa harus pun oleh kepada para si sang ' +
    'begitu sampai belum telah sedang agar supaya maka namun mau ingin lagi sebuah seorang pak bu yah iya ya tak kan kah lah hal demi tanpa sejak ' +
    'antara setelah sebelum selalu pernah mungkin kupikir sebenarnya terlalu semua nya yg aja gak bukan dua tiga biasanya entah kenapa sesuatu ' +
    'the a an of to and in is it that for on with as was').split(' '));

  function units(text, poem) {
    if (poem) return text.split(/\n+/).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
    const flat = text.replace(/\s*\n+\s*/g, ' ');
    return (flat.match(/[^.!?…]+(?:[.!?…]+[”"’)]*|$)/g) || []).map(s => s.trim()).filter(s => /[a-z]/i.test(s));
  }
  const wordsOf = s => (s.toLowerCase().match(/[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*/g) || []);
  function mattr(words, win = 40) {
    if (words.length <= win) return new Set(words).size / Math.max(1, words.length);
    let sum = 0, n = 0;
    for (let i = 0; i + win <= words.length; i++) { sum += new Set(words.slice(i, i + win)).size / win; n++; }
    return sum / n;
  }

  function analyze(text, poem) {
    const us = units(text, poem);
    const words = wordsOf(text);
    const lens = us.map(u => wordsOf(u).length).filter(n => n > 0);
    const n = Math.max(1, lens.length);
    const mean = lens.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const cv = mean ? sd / mean : 0;
    const mt = mattr(words);
    const content = words.filter(w => !STOP.has(w) && w.length > 2);
    const density = words.length ? content.length / words.length : 0;
    const freq = {};
    content.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const top = Object.entries(freq).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 10);
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
    const scores = {
      ragam: clamp((mt - 0.65) / 0.28 * 10),
      ritme: clamp(10 - Math.abs(cv - 0.62) * 16),
      // titik ideal: ±13 kata per kalimat untuk prosa, ±5 kata per baris untuk puisi
      jernih: clamp(poem ? 10 - Math.abs(mean - 5) * 0.9 : 10 - Math.abs(mean - 13) * 0.45),
      padat: clamp(10 - Math.abs(density - 0.6) * 28)
    };
    const total = (scores.ragam + scores.ritme + scores.jernih + scores.padat) / 4;
    return {
      units: us, lens, mean, cv, mattr: mt, density, top, longest,
      words: words.length, unique: new Set(words).size,
      minutes: Math.max(1, Math.round(words.length / 170)),
      scores, total, poem
    };
  }
  WORKS.forEach(w => { w.stats = analyze(fullText(w), w.form === 'puisi'); });

  /* ======================================================================
     SENI BENANG — 26 huruf di lingkaran, benang mengikuti urutan huruf teks
     ====================================================================== */
  const ABC = 'abcdefghijklmnopqrstuvwxyz';
  function seeded(str) {
    let h = 2166136261;
    for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  }

  function paintThread(ctx, w, h, text, o = {}) {
    const color = o.color || css('--ink');
    const pad = o.labels ? Math.max(22, w * 0.06) : (o.pad ?? 10);
    const r = Math.min(w, h) / 2 - pad, cx = w / 2, cy = h / 2;
    const P = [...ABC].map((ch, i) => {
      const a = -Math.PI / 2 + (o.rotate || 0) + (i / 26) * Math.PI * 2;
      return { ch, a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
    const seq = fold(text).replace(/[^a-z]/g, '').slice(0, o.max || 1800);
    const rnd = seeded(o.seed || seq.slice(0, 40));
    const j = r * 0.018;
    const segs = [];
    for (let i = 1; i < seq.length; i++) {
      const a = P[seq.charCodeAt(i - 1) - 97], b = P[seq.charCodeAt(i) - 97];
      if (a === b) continue;
      segs.push([a.x + (rnd() - .5) * j, a.y + (rnd() - .5) * j, b.x + (rnd() - .5) * j, b.y + (rnd() - .5) * j]);
    }
    const alpha = clamp(6.5 / Math.sqrt(segs.length + 4), 0.045, 0.55) * (o.weight || 1);
    const lw = Math.max(0.5, r / 190);

    const drawPins = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      P.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.2, r / 110), 0, Math.PI * 2); ctx.fill(); });
      if (o.labels) {
        ctx.fillStyle = o.labelColor || css('--muted');
        ctx.font = `500 ${Math.max(10, Math.round(r / 17))}px Geist, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        P.forEach(p => ctx.fillText(p.ch, cx + Math.cos(p.a) * (r + pad * 0.55), cy + Math.sin(p.a) * (r + pad * 0.55)));
      }
    };
    const drawRange = (from, to) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
      for (let i = from; i < to; i++) {
        const s = segs[i];
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      }
    };
    return { segs, drawPins, drawRange };
  }

  function drawThread(canvas, text, o = {}) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    cancelAnimationFrame(canvas._raf);
    const t = paintThread(ctx, w, h, text, o);
    if (!o.animate || reduced) { t.drawRange(0, t.segs.length); t.drawPins(); return; }
    t.drawPins();
    const per = Math.max(1, Math.ceil(t.segs.length / (o.frames || 70)));
    let i = 0;
    const step = () => {
      t.drawRange(i, Math.min(i + per, t.segs.length));
      i += per;
      if (i < t.segs.length) canvas._raf = requestAnimationFrame(step);
    };
    step();
  }

  // sampul diputar sesuai slug supaya tiap karya punya sudut sendiri; peta berlabel di Anatomi tidak diputar
  const threadFor = (canvas, w, extra = {}) =>
    drawThread(canvas, fullText(w), { color: css(CATS[w.cat].color), seed: w.slug, rotate: seeded(w.slug + '/r')() * Math.PI * 2, ...extra });

  /* ======================================================================
     TEMA
     ====================================================================== */
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : darkMQ.matches;
  };
  const repaintHooks = [];
  const repaintAll = () => repaintHooks.forEach(fn => fn());
  $('#themeToggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.set('theme', next);
    repaintAll();
  });
  darkMQ.addEventListener?.('change', repaintAll);
  let resizeT;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(repaintAll, 180); });

  /* ======================================================================
     NAV: pulau "sedang menulis" + tautan aktif
     ====================================================================== */
  (function island() {
    const nw = SITE.nowWriting;
    if (!nw) { $('#island').hidden = true; return; }
    $('#islandTitle').textContent = nw.title;
    $('#islandMeta').textContent = `${nw.kind} · draf ${nw.draft}`;
    $('#islandBar').style.width = Math.round(nw.progress * 100) + '%';
    $('#islandPct').textContent = Math.round(nw.progress * 100) + '%';
    $('#island').addEventListener('click', e => {
      const b = e.currentTarget;
      b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
  })();

  const navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['karya', 'anatomi', 'perjalanan', 'ruang-main', 'surat'].forEach(id => io.observe(document.getElementById(id)));
  }

  /* ======================================================================
     HERO: judul yang direvisi di depan mata
     ====================================================================== */
  const DRAFTS = ['berisik', 'ragu-ragu', 'menolak diam.'];
  let draftRun = 0;
  async function playDraft() {
    if (reduced) return;
    const run = ++draftRun;
    const host = $('#draft');
    const logItems = $$('#draftLog > :not(.dl-label)');
    logItems.forEach(el => el.classList.add('pending'));
    host.textContent = '';
    host.classList.add('typing');
    for (let d = 0; d < DRAFTS.length; d++) {
      const span = document.createElement('span');
      span.className = 'draft-word';
      host.append(span);
      for (const ch of DRAFTS[d]) {
        if (run !== draftRun) return;
        span.textContent += ch;
        await wait(60 + Math.random() * 70);
      }
      if (d < DRAFTS.length - 1) {
        await wait(520);
        span.classList.add('struck');
        await wait(560);
        logItems[d].classList.remove('pending');
        span.classList.add('gone');
        await wait(340);
        if (run !== draftRun) return;
        span.remove();
      }
    }
    await wait(350);
    logItems[DRAFTS.length - 1].classList.remove('pending');
    await wait(1600);
    if (run === draftRun) host.classList.remove('typing');
  }
  $('#replayDraft').addEventListener('click', playDraft);

  /* ---------- angka dot-matrix ---------- */
  const totals = {
    tWords: WORKS.reduce((a, w) => a + w.stats.words, 0),
    tWorks: WORKS.length,
    tMinutes: WORKS.reduce((a, w) => a + w.stats.minutes, 0),
    tSaved: SITE.savedSentences || 0
  };
  Object.entries(totals).forEach(([id, v]) => {
    const el = document.getElementById(id);
    const final = v.toLocaleString('id-ID');
    el.textContent = final;
    if (reduced) return;
    let k = 0;
    const iv = setInterval(() => {
      el.textContent = final.replace(/\d/g, () => Math.floor(Math.random() * 10));
      if (++k > 14) { clearInterval(iv); el.textContent = final; }
    }, 55);
  });

  /* ---------- tumpukan kartu ---------- */
  const stack = $('#stack');
  let order = WORKS.slice(0, 5).map(w => {
    const el = document.createElement('div');
    el.className = 's-card';
    el.setAttribute('style', catStyle(w));
    el.dataset.slug = w.slug;
    el.setAttribute('role', 'link');
    el.setAttribute('aria-label', `Baca ${w.title}`);
    el.innerHTML = `
      <div class="s-art"><canvas></canvas></div>
      <div class="s-body">
        <span class="chip-cat">${CATS[w.cat].label}</span>
        <h3>${esc(w.title)}</h3>
        <div class="s-meta"><span>${fmtDate(w.date)}</span><span>${w.stats.minutes} menit baca</span></div>
      </div>`;
    stack.append(el);
    return el;
  });
  function layoutStack() {
    order.forEach((el, i) => {
      el.style.setProperty('--i', i);
      el.dataset.i = i;
      el.style.zIndex = 50 - i;
      el.classList.toggle('is-top', i === 0);
      el.tabIndex = i === 0 ? 0 : -1;
    });
  }
  function paintStack(animate) {
    order.forEach(el => threadFor($('canvas', el), BY_SLUG[el.dataset.slug], { animate, frames: 80 }));
  }
  function sendBack(el, dx = -260, dy = 40) {
    el.classList.add('is-drag');
    el.style.transition = 'transform .38s cubic-bezier(.4,0,.6,1), opacity .38s';
    el.style.transform = `translate(-50%,-50%) translate(${dx}px, ${dy}px) rotate(${dx / 10}deg)`;
    el.style.opacity = '0';
    setTimeout(() => {
      el.classList.remove('is-drag');
      el.style.transition = 'none'; el.style.transform = ''; el.style.opacity = '';
      order.push(order.shift());
      layoutStack();
      requestAnimationFrame(() => { el.style.transition = ''; });
    }, 380);
  }
  layoutStack();
  repaintHooks.push(() => paintStack(false));

  let drag = null;
  stack.addEventListener('pointerdown', e => {
    const el = e.target.closest('.s-card.is-top');
    if (!el) return;
    drag = { el, x: e.clientX, y: e.clientY, dx: 0, dy: 0, id: e.pointerId };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-drag');
  });
  stack.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
    drag.el.style.transform = `translate(-50%,-50%) translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 14 - 4}deg)`;
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { el, dx, dy } = drag;
    drag = null;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) { el.classList.remove('is-drag'); el.style.transform = ''; openWork(el.dataset.slug); return; }
    if (dist > 90) { sendBack(el, dx * 2.4, dy * 2.4); return; }
    el.classList.remove('is-drag'); el.style.transform = '';
  };
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);
  stack.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('s-card')) openWork(e.target.dataset.slug);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { sendBack(order[0]); requestAnimationFrame(() => order[0].focus()); }
  });
  $('#stackNext').addEventListener('click', () => sendBack(order[0]));
  $('#randomRead').addEventListener('click', () => openWork(WORKS[Math.floor(Math.random() * WORKS.length)].slug));

  /* ---------- pita berjalan ---------- */
  (function marquee() {
    const items = WORKS.map(w => `<span class="marquee-item">${esc(w.line)}</span>`).join('');
    $('#marquee').innerHTML = items + items;
  })();

  /* ======================================================================
     KARYA
     ====================================================================== */
  let filter = 'semua';
  let view = store.get('view', 'grid');
  const worksEl = $('#works');

  function renderFilters() {
    const counts = WORKS.reduce((m, w) => (m[w.cat] = (m[w.cat] || 0) + 1, m), {});
    const chips = [['semua', 'Semua', WORKS.length], ...Object.keys(CATS).filter(k => counts[k]).map(k => [k, CATS[k].label, counts[k]])];
    $('#filters').innerHTML = chips.map(([k, label, n]) =>
      `<button class="chip" type="button" data-filter="${k}" aria-pressed="${k === filter}">${label}<sup>${n}</sup></button>`).join('');
  }
  function renderWorks() {
    const list = WORKS.filter(w => filter === 'semua' || w.cat === filter);
    worksEl.className = 'works ' + (view === 'grid' ? 'is-grid' : 'is-list');
    $('#workCount').textContent = list.length;
    if (view === 'grid') {
      worksEl.innerHTML = list.map(w => `
        <a class="work-card" href="#baca-${w.slug}" style="${catStyle(w)}" data-slug="${w.slug}">
          <div class="wc-art"><canvas></canvas><span class="wc-no">${w.no}</span></div>
          <div class="wc-body">
            <span class="chip-cat">${CATS[w.cat].label}</span>
            <h3>${esc(w.title)}</h3>
            <p>${esc(w.excerpt)}</p>
          </div>
          <div class="wc-foot"><span>${fmtDate(w.date)}</span><span>${w.stats.words.toLocaleString('id-ID')} kata · ${w.stats.minutes} mnt</span></div>
        </a>`).join('');
      $$('.work-card', worksEl).forEach(el => threadFor($('canvas', el), BY_SLUG[el.dataset.slug]));
    } else {
      worksEl.innerHTML = list.map(w => `
        <a class="work-row" href="#baca-${w.slug}" style="${catStyle(w)}" data-slug="${w.slug}">
          <span class="wr-no">${w.no}</span>
          <span class="wr-title">${esc(w.title)}</span>
          <span class="chip-cat">${CATS[w.cat].label}</span>
          <span class="wr-date">${fmtDate(w.date)}</span>
          <span class="wr-min">${w.stats.minutes} mnt</span>
          <span class="wr-arrow" aria-hidden="true">→</span>
        </a>`).join('');
    }
    $$('.seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
  }
  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter;
    $$('#filters .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    renderWorks();
  });
  $('.seg').addEventListener('click', e => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    view = b.dataset.view; store.set('view', view);
    renderWorks();
  });
  renderFilters();
  renderWorks();
  repaintHooks.push(() => $$('.work-card', worksEl).forEach(el => threadFor($('canvas', el), BY_SLUG[el.dataset.slug])));

  // pratinjau benang yang mengikuti kursor di tampilan indeks
  const hover = $('#hoverThread');
  if (finePointer) {
    let current = null;
    worksEl.addEventListener('pointermove', e => {
      const row = e.target.closest('.work-row');
      if (!row) { hover.classList.remove('on'); current = null; return; }
      hover.style.left = e.clientX + 130 + 'px';
      hover.style.top = e.clientY + 'px';
      if (current !== row.dataset.slug) {
        current = row.dataset.slug;
        hover.classList.add('on');
        threadFor(hover, BY_SLUG[current], { pad: 18, animate: true, frames: 30 });
      }
    });
    worksEl.addEventListener('pointerleave', () => { hover.classList.remove('on'); current = null; });
  }

  /* ======================================================================
     ANATOMI
     ====================================================================== */
  const METRICS = [
    ['ragam', 'Ragam kata', '--c-esai', a => `MATTR ${a.mattr.toFixed(2)} · seberapa jarang kata diulang`],
    ['ritme', 'Ritme', '--c-puisi', a => `variasi panjang ${a.poem ? 'baris' : 'kalimat'} ${(a.cv * 100).toFixed(0)}%`],
    ['jernih', 'Kejernihan', '--c-cerpen', a => `rata-rata ${a.mean.toFixed(1)} kata per ${a.poem ? 'baris' : 'kalimat'}`],
    ['padat', 'Kepadatan', '--c-mini', a => `${Math.round(a.density * 100)}% kata bermakna`]
  ];
  let anatSel = WORKS[0].slug;
  let anatCurrent = null;

  function polar(cx, cy, r, deg) { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r, a0, a1) {
    const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  function ringSVG(a) {
    const C = 110, R = 92, gap = 14, span = 90 - gap;
    const parts = METRICS.map(([k, , color], i) => {
      const start = i * 90 + gap / 2, end = start + span;
      const len = (Math.PI * 2 * R) * span / 360;
      const v = a.scores[k] / 10;
      return `<path d="${arc(C, C, R, start, end)}" fill="none" stroke="var(--sheet-2)" stroke-width="18" stroke-linecap="round"/>
        <path d="${arc(C, C, R, start, end)}" fill="none" stroke="var(${color})" stroke-width="18" stroke-linecap="round"
          stroke-dasharray="${(len * v).toFixed(1)} ${len.toFixed(1)}"/>`;
    }).join('');
    return `<svg viewBox="0 0 220 220" role="img" aria-label="Indeks napas ${a.total.toFixed(1)} dari 10">
      ${parts}
      <text class="r-num" x="110" y="118" text-anchor="middle">${a.total.toFixed(1)}</text>
      <text class="r-sub" x="110" y="142" text-anchor="middle">dari 10</text>
    </svg>`;
  }

  function rhythmSVG(host, a, color, compact) {
    const W = host.clientWidth || 600, H = host.clientHeight || 150;
    const n = a.lens.length;
    if (!n) { host.innerHTML = ''; return; }
    const max = Math.max(...a.lens);
    const bw = W / n, bar = Math.max(2, Math.min(bw * 0.62, 26));
    const mid = H / 2;
    const rects = a.lens.map((len, i) => {
      const h = Math.max(4, (len / max) * (H - 8));
      const x = i * bw + (bw - bar) / 2;
      return `<rect data-i="${i}" x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(bar / 2, 6)}" fill="${color}"><title>${len} kata</title></rect>`;
    }).join('');
    const unit = a.poem ? 'baris' : 'kalimat';
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${n} ${unit}, terpendek ${Math.min(...a.lens)} kata, terpanjang ${max} kata">
      <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)" stroke-width="1"/>${rects}</svg>`;
    if (compact) return;
    const cap = $('#rhythmCap');
    const show = i => {
      $$('rect', host).forEach(r => r.classList.toggle('on', +r.dataset.i === i));
      const s = a.units[i] || '';
      cap.innerHTML = `<b>${unit} ${i + 1} dari ${n} · ${a.lens[i]} kata</b>${esc(s.length > 220 ? s.slice(0, 220) + '…' : s)}`;
    };
    const longestIdx = a.lens.indexOf(max);
    show(longestIdx);
    const svg = $('svg', host);
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const i = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n)));
      show(i);
    });
    svg.addEventListener('pointerleave', () => show(longestIdx));
  }

  function renderAnatomy(text, poem, opts) {
    const a = analyze(text, poem);
    anatCurrent = { text, poem, ...opts };
    $('#ring').innerHTML = ringSVG(a);
    $('#legend').innerHTML = METRICS.map(([k, name, color, desc]) =>
      `<li style="--c:var(${color})"><span class="lg-name">${name}</span><span class="lg-val">${a.scores[k].toFixed(1)}</span><span class="lg-desc">${desc(a)}</span></li>`).join('');
    const unit = poem ? 'baris' : 'kalimat';
    $('#stats').innerHTML = [
      ['kata', a.words.toLocaleString('id-ID')],
      ['kata unik', a.unique.toLocaleString('id-ID')],
      [unit, a.lens.length],
      [`kata per ${unit}`, a.mean.toFixed(1)],
      ['waktu baca', `${a.minutes}<small>mnt</small>`],
      ['kata terpanjang', esc(a.longest || '—')]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('#words').innerHTML = a.top.length
      ? a.top.map(([w, c], i) => `<li style="font-size:${(26 - i * 1.4).toFixed(1)}px">${esc(w)}<sup>${c}×</sup></li>`).join('')
      : '<li>belum ada kata yang muncul dua kali</li>';
    rhythmSVG($('#rhythm'), a, opts.color, false);
    const letters = fold(text).replace(/[^a-z]/g, '').length;
    $('#threadNote').textContent = `${letters.toLocaleString('id-ID')} huruf, ${Math.max(0, letters - 1).toLocaleString('id-ID')} tarikan benang`;
    drawThread($('#anatThread'), text, { color: opts.color, seed: opts.seed, labels: true, animate: true, frames: 90 });
  }
  function renderAnatChips() {
    $('#anatChips').innerHTML = WORKS.map(w =>
      `<button class="chip" type="button" data-slug="${w.slug}" aria-pressed="${w.slug === anatSel}">${esc(w.title)}</button>`).join('');
  }
  function selectAnat(slug) {
    anatSel = slug;
    const w = BY_SLUG[slug];
    $$('#anatChips .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.slug === slug));
    $('#ownToggle').setAttribute('aria-pressed', 'false');
    $('#ownBox').hidden = true;
    renderAnatomy(fullText(w), w.form === 'puisi', { color: css(CATS[w.cat].color), seed: w.slug, slug });
  }
  $('#anatChips').addEventListener('click', e => { const b = e.target.closest('[data-slug]'); if (b) selectAnat(b.dataset.slug); });
  let ownT;
  const renderOwn = () => {
    const t = $('#ownText').value.trim();
    if (t) renderAnatomy(t, $('#ownPoem').checked, { color: css('--blue'), seed: 'own' });
  };
  $('#ownToggle').addEventListener('click', () => {
    $$('#anatChips .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
    $('#ownToggle').setAttribute('aria-pressed', 'true');
    $('#ownBox').hidden = false;
    const ta = $('#ownText');
    if (!ta.value) ta.value = store.get('own', '');
    ta.focus();
    renderOwn();
  });
  $('#ownText').addEventListener('input', () => {
    clearTimeout(ownT);
    ownT = setTimeout(() => { store.set('own', $('#ownText').value); renderOwn(); }, 260);
  });
  $('#ownPoem').addEventListener('change', renderOwn);
  renderAnatChips();
  selectAnat(anatSel);
  repaintHooks.push(() => {
    if (!anatCurrent) return;
    if (anatCurrent.slug) selectAnat(anatCurrent.slug); else renderOwn();
  });

  /* ======================================================================
     PERJALANAN
     ====================================================================== */
  (function timeline() {
    const items = SITE.timeline || [];
    $('#tlTrack').innerHTML = items.map((t, i) => `
      <li class="tl-item${i === items.length - 1 ? ' is-now' : ''}">
        <span class="tl-year">${esc(t.year)}</span>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.text)}</p>
        ${t.slug && BY_SLUG[t.slug] ? `<a class="tl-link" href="#baca-${t.slug}">baca “${esc(BY_SLUG[t.slug].title)}” →</a>` : ''}
        <span class="tl-tag">${esc(t.tag)}</span>
      </li>`).join('');
    const tl = $('#timeline'), bar = $('#tlBar');
    const update = () => {
      const max = tl.scrollWidth - tl.clientWidth;
      const vis = tl.clientWidth / tl.scrollWidth;
      bar.style.width = Math.min(100, (vis + (max > 0 ? tl.scrollLeft / max : 1) * (1 - vis)) * 100) + '%';
    };
    tl.addEventListener('scroll', update, { passive: true });
    repaintHooks.push(update);
    update();
    // geser dengan mouse
    let d = null;
    tl.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.target.closest('a')) return;
      d = { x: e.clientX, s: tl.scrollLeft, moved: false };
      tl.classList.add('dragging');
    });
    addEventListener('pointermove', e => {
      if (!d) return;
      tl.scrollLeft = d.s - (e.clientX - d.x);
    });
    addEventListener('pointerup', () => { d = null; tl.classList.remove('dragging'); });
    tl.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') tl.scrollBy({ left: 300, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') tl.scrollBy({ left: -300, behavior: 'smooth' });
    });
  })();

  /* ======================================================================
     RUANG MAIN: puisi hitam
     ====================================================================== */
  const SOURCES = WORKS.filter(w => w.form === 'prosa').flatMap(w => w.body.map((p, i) => ({ w, i, p })))
    .filter(s => s.p.split(/\s+/).length > 30);
  const bo = { src: null, keep: new Set(), black: true };
  const strip = t => t.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();

  function boRender() {
    const tokens = bo.src.p.split(/\s+/);
    $('#boSource').innerHTML = `dari <b>${esc(bo.src.w.title)}</b>, paragraf ${bo.src.i + 1}`;
    $('#boText').innerHTML = tokens.map((t, i) =>
      `<span class="bw${bo.keep.has(i) ? ' keep' : ''}" data-i="${i}" style="--d:${(i * 7) % 400}">${esc(t)}</span>`).join(' ');
    $('#boText').classList.toggle('is-black', bo.black);
    boOut();
  }
  function boOut() {
    const tokens = bo.src.p.split(/\s+/);
    const kept = [...bo.keep].sort((a, b) => a - b).map(i => strip(tokens[i])).filter(Boolean);
    $('#boOut').textContent = kept.length ? kept.join(' ') : '…';
    $('#boToggle').textContent = bo.black ? 'Tampilkan teks' : 'Hitamkan sisanya';
    $('#boToggle').setAttribute('aria-pressed', bo.black);
  }
  function boLoad(src, keepWords) {
    bo.src = src; bo.keep = new Set();
    if (keepWords) {
      const tokens = src.p.split(/\s+/).map(strip);
      let from = 0;
      keepWords.forEach(k => { const i = tokens.indexOf(k, from); if (i >= 0) { bo.keep.add(i); from = i + 1; } });
    }
    boRender();
  }
  $('#boText').addEventListener('click', e => {
    const s = e.target.closest('.bw');
    if (!s) return;
    const i = +s.dataset.i;
    bo.keep.has(i) ? bo.keep.delete(i) : bo.keep.add(i);
    s.classList.toggle('keep');
    boOut();
  });
  $('#boToggle').addEventListener('click', () => { bo.black = !bo.black; $('#boText').classList.toggle('is-black', bo.black); boOut(); });
  $('#boShuffle').addEventListener('click', () => {
    let s; do { s = SOURCES[Math.floor(Math.random() * SOURCES.length)]; } while (SOURCES.length > 1 && s === bo.src);
    bo.black = false; boLoad(s);
  });
  $('#boClear').addEventListener('click', () => { bo.keep.clear(); bo.black = false; boRender(); });
  $('#boCopy').addEventListener('click', () => {
    const t = $('#boOut').textContent;
    if (t === '…') { toast('Pilih dulu beberapa kata.'); return; }
    copyText(`${t}\n\n(puisi hitam dari “${bo.src.w.title}” — ${SITE.author})`, 'Puisi disalin.');
  });
  const defaultSrc = SOURCES.find(s => s.w.slug === 'jendela' && s.i === 1) || SOURCES[0];
  boLoad(defaultSrc, defaultSrc.w.slug === 'jendela'
    ? ['seni', 'membiarkan', 'celah', 'terbuka', 'kita', 'kedap', 'seperti', 'ruangan', 'tidak', 'pernah', 'kemasukan', 'angin']
    : null);

  /* ---------- benangmu ---------- */
  const tg = $('#tgInput');
  let tgT;
  function renderTG(animate) {
    const text = tg.value;
    const seq = fold(text).replace(/[^a-z]/g, '');
    $('#tgSeq').textContent = seq ? seq.slice(0, 60).split('').join(' → ') + (seq.length > 60 ? ' …' : '') : 'ketik sesuatu';
    drawThread($('#tgCanvas'), text, { color: css('--blue'), seed: 'tg', labels: true, animate, frames: 50 });
  }
  tg.addEventListener('input', () => { clearTimeout(tgT); tgT = setTimeout(() => renderTG(true), 120); });
  renderTG(false);
  repaintHooks.push(() => renderTG(false));

  function downloadCanvas(canvas, name) {
    canvas.toBlob(blob => {
      if (!blob) { toast('Gambar tidak bisa dibuat di peramban ini.'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Mengunduh ' + name);
    }, 'image/png');
  }
  $('#tgSave').addEventListener('click', () => {
    const S = 1600, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = css('--sheet'); ctx.fillRect(0, 0, S, S);
    const t = paintThread(ctx, S, S, tg.value, { color: css('--blue'), seed: 'tg', labels: true, labelColor: css('--muted') });
    t.drawRange(0, t.segs.length); t.drawPins();
    ctx.globalAlpha = 1; ctx.fillStyle = css('--muted');
    ctx.font = '500 26px Geist, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(SITE.handle, 40, S - 36);
    downloadCanvas(c, 'benang.png');
  });

  /* ---------- prangko ---------- */
  drawThread($('#stampCanvas'), SITE.author + ' menulis', { color: css('--ink'), seed: 'stamp', pad: 4 });
  repaintHooks.push(() => drawThread($('#stampCanvas'), SITE.author + ' menulis', { color: css('--ink'), seed: 'stamp', pad: 4 }));

  /* ======================================================================
     SURAT
     ====================================================================== */
  $('#emailText').textContent = SITE.email;
  $('#copyEmail').addEventListener('click', () => copyText(SITE.email, 'Alamat email disalin.'));
  $('#letter').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#lName').value.trim(), msg = $('#lMsg').value.trim();
    if (!msg) { toast('Tulis pesannya dulu, sependek apa pun.'); $('#lMsg').focus(); return; }
    const subject = `Surat dari ${name || 'seorang pembaca'}`;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg + (name ? '\n\n— ' + name : ''))}`;
    toast('Membuka aplikasi email. Kalau tidak terbuka, salin alamatnya.');
  });

  /* ======================================================================
     PEMBACA
     ====================================================================== */
  const reader = $('#reader'), rBody = $('#rBody'), rScroll = $('#rScroll');
  let readerSlug = null, pushedHash = false, lastFocus = null;
  const prefs = { size: store.get('size', 20), paper: store.get('paper', 'kertas'), focus: false };

  function applyPrefs() {
    reader.style.setProperty('--r-size', prefs.size + 'px');
    reader.dataset.paper = prefs.paper;
    $$('#rPaper .tool').forEach(b => b.setAttribute('aria-pressed', b.dataset.paper === prefs.paper));
    rBody.classList.toggle('focus', prefs.focus);
    $('#rFocus').setAttribute('aria-pressed', prefs.focus);
  }
  const paperInk = () => getComputedStyle(reader).getPropertyValue('--r-fg').trim();

  function openWork(slug) {
    if (!BY_SLUG[slug]) return;
    if (location.hash !== '#baca-' + slug) { pushedHash = true; location.hash = 'baca-' + slug; }
    else showReader(slug);
  }
  function showReader(slug) {
    const w = BY_SLUG[slug];
    if (!w) return;
    stopSpeech();
    if (reader.hidden) lastFocus = document.activeElement;
    readerSlug = slug;
    reader.setAttribute('style', catStyle(w));
    applyPrefs();
    $('#rCat').textContent = CATS[w.cat].label;
    $('#rCrumb').textContent = w.title;
    $('#rMeta').innerHTML = `<span class="chip-cat">${CATS[w.cat].label}</span><span>No. ${w.no}</span><span>${fmtDate(w.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${w.stats.words.toLocaleString('id-ID')} kata · ${w.stats.minutes} menit</span>`;
    $('#rTitle').textContent = w.title;
    rBody.className = 'r-body ' + (w.form === 'puisi' ? 'is-poem' : 'is-prose');
    rBody.innerHTML = w.body.map(p => w.form === 'puisi' ? `<p class="stanza">${esc(p)}</p>` : `<p>${esc(p)}</p>`).join('');
    applyPrefs();
    const i = WORKS.indexOf(w);
    const prev = WORKS[(i - 1 + WORKS.length) % WORKS.length], next = WORKS[(i + 1) % WORKS.length];
    $('#rPrev').href = '#baca-' + prev.slug; $('b', $('#rPrev')).textContent = prev.title;
    $('#rNext').href = '#baca-' + next.slug; $('b', $('#rNext')).textContent = next.title;
    reader.hidden = false;
    document.documentElement.classList.add('locked');
    rScroll.scrollTop = 0;
    requestAnimationFrame(() => {
      threadFor($('#rThread'), w, { animate: true, frames: 90, color: css(CATS[w.cat].color) });
      rhythmSVG($('#rRhythm'), w.stats, css(CATS[w.cat].color), true);
      onReaderScroll();
      reader.focus({ preventScroll: true });
    });
    document.title = `${w.title} · Juan Menulis`;
  }
  function closeReader() {
    if (reader.hidden) return;
    stopSpeech();
    reader.hidden = true;
    $('#quotePop').hidden = true;
    document.documentElement.classList.remove('locked');
    readerSlug = null;
    document.title = 'Juan Menulis';
    lastFocus?.focus?.({ preventScroll: true });
  }
  function requestClose() {
    if (location.hash.startsWith('#baca-')) {
      if (pushedHash) { pushedHash = false; history.back(); }
      else { history.replaceState(null, '', location.pathname + location.search); closeReader(); }
    } else closeReader();
  }
  function route() {
    const m = location.hash.match(/^#baca-([\w-]+)$/);
    if (m && BY_SLUG[m[1]]) showReader(m[1]);
    else closeReader();
  }
  addEventListener('hashchange', route);

  $('#rClose').addEventListener('click', requestClose);
  $('#rSmaller').addEventListener('click', () => { prefs.size = Math.max(16, prefs.size - 1); store.set('size', prefs.size); applyPrefs(); });
  $('#rBigger').addEventListener('click', () => { prefs.size = Math.min(28, prefs.size + 1); store.set('size', prefs.size); applyPrefs(); });
  $('#rPaper').addEventListener('click', e => {
    const b = e.target.closest('[data-paper]');
    if (!b) return;
    prefs.paper = b.dataset.paper; store.set('paper', prefs.paper); applyPrefs();
  });
  $('#rFocus').addEventListener('click', () => { prefs.focus = !prefs.focus; applyPrefs(); onReaderScroll(); });

  function onReaderScroll() {
    const max = rScroll.scrollHeight - rScroll.clientHeight;
    $('#rProgress').style.width = (max > 0 ? (rScroll.scrollTop / max) * 100 : 100) + '%';
    if (!prefs.focus) return;
    const mid = rScroll.getBoundingClientRect().top + rScroll.clientHeight * 0.45;
    let best = null, bestD = Infinity;
    [...rBody.children].forEach(p => {
      const r = p.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestD) { bestD = d; best = p; }
    });
    [...rBody.children].forEach(p => p.classList.toggle('is-current', p === best));
  }
  rScroll.addEventListener('scroll', () => { onReaderScroll(); $('#quotePop').hidden = true; }, { passive: true });

  /* ---------- dengarkan (Web Speech) ---------- */
  let speaking = false;
  function stopSpeech() {
    speaking = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $$('.is-speaking', rBody).forEach(p => p.classList.remove('is-speaking'));
    $('#rListen').textContent = '▶ Dengarkan';
    $('#rListen').setAttribute('aria-pressed', 'false');
  }
  function speak() {
    if (!('speechSynthesis' in window)) { toast('Peramban ini belum bisa membacakan teks.'); return; }
    if (speaking) { stopSpeech(); return; }
    speaking = true;
    $('#rListen').textContent = '■ Berhenti';
    $('#rListen').setAttribute('aria-pressed', 'true');
    const paras = [...rBody.children];
    const voice = speechSynthesis.getVoices().find(v => /^id|indones/i.test(v.lang + v.name));
    const go = j => {
      $$('.is-speaking', rBody).forEach(p => p.classList.remove('is-speaking'));
      if (!speaking || j >= paras.length) { stopSpeech(); return; }
      const p = paras[j];
      p.classList.add('is-speaking');
      p.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      const u = new SpeechSynthesisUtterance(p.textContent);
      u.lang = 'id-ID'; if (voice) u.voice = voice;
      u.rate = 0.95;
      u.onend = () => go(j + 1);
      u.onerror = () => stopSpeech();
      speechSynthesis.speak(u);
    };
    go(0);
  }
  $('#rListen').addEventListener('click', speak);

  /* ---------- pilih teks → kartu kutipan ---------- */
  const pop = $('#quotePop');
  let selText = '';
  function checkSelection() {
    const sel = getSelection();
    const t = sel && sel.toString().trim().replace(/\s+/g, ' ');
    if (!t || t.length < 6 || t.length > 420 || !rBody.contains(sel.anchorNode)) { pop.hidden = true; return; }
    selText = t;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    pop.style.left = Math.min(innerWidth - 120, Math.max(120, r.left + r.width / 2)) + 'px';
    pop.style.top = Math.min(innerHeight - 16, Math.max(70, r.top)) + 'px';
    pop.hidden = false;
  }
  rBody.addEventListener('mouseup', () => setTimeout(checkSelection, 10));
  rBody.addEventListener('keyup', checkSelection);
  document.addEventListener('selectionchange', () => { if (!reader.hidden && matchMedia('(pointer: coarse)').matches) checkSelection(); });
  pop.addEventListener('mousedown', e => e.preventDefault());
  pop.addEventListener('click', () => { pop.hidden = true; openQuote(selText, BY_SLUG[readerSlug]); });

  const SWATCHES = [
    { id: 'tint', label: 'Pastel' },
    { id: 'ink', label: 'Tinta' },
    { id: 'blue', label: 'Biru' },
    { id: 'paper', label: 'Kertas' }
  ];
  let quote = { text: '', work: null, sw: 'tint' };
  // Kartu kutipan adalah gambar yang dibagikan ke luar situs, jadi warnanya tetap
  // (tidak ikut tema terang/gelap pembaca).
  const CARD_PASTEL = { esai: '#DBD6FA', puisi: '#F6CDE2', cerpen: '#C9EFDC', mini: '#F7E8AA', catatan: '#DDF26E' };
  const CARD_INK = { esai: '#2244FF', puisi: '#C8287F', cerpen: '#0E7E54', mini: '#D44E14', catatan: '#5E3FE6' };
  function swatchColors(id, w) {
    if (id === 'tint') return { bg: CARD_PASTEL[w.cat], fg: '#0F1016', sub: '#4A4D58', thread: CARD_INK[w.cat] };
    if (id === 'ink') return { bg: '#0F1016', fg: '#F2F3F7', sub: '#9A9EAB', thread: '#F2F3F7' };
    if (id === 'blue') return { bg: '#2244FF', fg: '#FFFFFF', sub: '#C9D2FF', thread: '#FFFFFF' };
    return { bg: '#FAFAFC', fg: '#0F1016', sub: '#646875', thread: CARD_INK[w.cat] };
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }
  function paintQuote() {
    const c = $('#quoteCanvas'), ctx = c.getContext('2d');
    const W = c.width, H = c.height, w = quote.work;
    const col = swatchColors(quote.sw, w);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W - 470, -110);
    const t = paintThread(ctx, 560, 560, fullText(w), { color: col.thread, seed: w.slug, weight: 0.8, pad: 10, rotate: seeded(w.slug + '/r')() * Math.PI * 2 });
    t.drawRange(0, t.segs.length); t.drawPins();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.fg;
    ctx.font = 'italic 220px "Instrument Serif", Georgia, serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', 80, 520);
    const maxW = W - 180;
    let size = 84, lines;
    do {
      ctx.font = `${size}px "Instrument Serif", Georgia, serif`;
      lines = wrap(ctx, quote.text, maxW);
      size -= 4;
    } while (lines.length * size * 1.18 > 640 && size > 40);
    size += 4;
    const lh = size * 1.16;
    let y = 600;
    lines.forEach(l => { ctx.fillText(l, 90, y); y += lh; });
    ctx.fillStyle = col.sub;
    ctx.font = '500 30px Geist, system-ui, sans-serif';
    ctx.fillText(`— ${SITE.author}, “${w.title}”`, 90, Math.min(H - 150, y + 40));
    ctx.font = '600 26px Geist, system-ui, sans-serif';
    ctx.fillText(SITE.handle, 90, H - 80);
    ctx.textAlign = 'right';
    ctx.fillText(CATS[w.cat].label.toUpperCase() + ' · NO. ' + w.no, W - 90, H - 80);
    ctx.textAlign = 'left';
  }
  function openQuote(text, work) {
    quote = { text, work, sw: quote.sw || 'tint' };
    $('#swatches').innerHTML = SWATCHES.map(s => {
      const col = swatchColors(s.id, work);
      return `<button type="button" data-sw="${s.id}" style="--sw:${col.bg}" aria-label="${s.label}" aria-pressed="${s.id === quote.sw}"></button>`;
    }).join('');
    $('#quoteModal').hidden = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(paintQuote);
    $('#quoteSave').focus();
  }
  $('#swatches').addEventListener('click', e => {
    const b = e.target.closest('[data-sw]');
    if (!b) return;
    quote.sw = b.dataset.sw;
    $$('#swatches button').forEach(x => x.setAttribute('aria-pressed', x === b));
    paintQuote();
  });
  $('#quoteSave').addEventListener('click', () => downloadCanvas($('#quoteCanvas'), `kutipan-${quote.work.slug}.png`));
  $('#quoteCopy').addEventListener('click', () => copyText(`“${quote.text}”\n— ${SITE.author}, ${quote.work.title}`, 'Kutipan disalin.'));
  const closeQuote = () => { $('#quoteModal').hidden = true; };
  $('#quoteClose').addEventListener('click', closeQuote);
  $('#quoteModal').addEventListener('click', e => { if (e.target.id === 'quoteModal') closeQuote(); });

  /* ======================================================================
     PALET PENCARIAN (⌘K atau /)
     ====================================================================== */
  const palette = $('#palette'), pInput = $('#pInput'), pResults = $('#pResults');
  let pSel = 0, pItems = [];
  function search(q) {
    const nq = fold(q.trim());
    if (!nq) return WORKS.map(w => ({ w, snip: esc(w.excerpt) }));
    const out = [];
    WORKS.forEach(w => {
      let score = 0, snip = '';
      if (fold(w.title).includes(nq)) score += 5;
      if (CATS[w.cat].label.toLowerCase().includes(nq)) score += 2;
      const text = fullText(w).replace(/\s+/g, ' ');
      const ft = fold(text);
      const idx = ft.indexOf(nq);
      if (idx >= 0) {
        score += 2 + Math.min(3, ft.split(nq).length - 2);
        const a = Math.max(0, idx - 36), b = Math.min(text.length, idx + nq.length + 60);
        snip = (a ? '…' : '') + esc(text.slice(a, idx)) + '<mark>' + esc(text.slice(idx, idx + nq.length)) + '</mark>' + esc(text.slice(idx + nq.length, b)) + (b < text.length ? '…' : '');
      }
      if (score) out.push({ w, score, snip: snip || esc(w.excerpt) });
    });
    return out.sort((a, b) => b.score - a.score);
  }
  function renderPalette() {
    pItems = search(pInput.value);
    pSel = Math.min(pSel, Math.max(0, pItems.length - 1));
    pResults.innerHTML = pItems.length
      ? pItems.map((r, i) => `<li role="option" id="po-${i}" aria-selected="${i === pSel}" data-slug="${r.w.slug}">
          <span class="p-title"><span>${esc(r.w.title)}</span><span class="chip-cat" style="${catStyle(r.w)}">${CATS[r.w.cat].label}</span></span>
          <span class="p-snip">${r.snip}</span></li>`).join('')
      : '<li class="p-empty">Tidak ada yang cocok. Coba kata lain, misalnya “hujan” atau “Senin”.</li>';
    pInput.setAttribute('aria-activedescendant', pItems.length ? 'po-' + pSel : '');
  }
  function openPalette() { palette.hidden = false; pInput.value = ''; pSel = 0; renderPalette(); pInput.focus(); }
  function closePalette() { palette.hidden = true; }
  $('#openPalette').addEventListener('click', openPalette);
  pInput.addEventListener('input', () => { pSel = 0; renderPalette(); });
  pInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); pSel = Math.min(pItems.length - 1, pSel + 1); renderPalette(); $('#po-' + pSel)?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'ArrowUp') { e.preventDefault(); pSel = Math.max(0, pSel - 1); renderPalette(); $('#po-' + pSel)?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && pItems[pSel]) { closePalette(); openWork(pItems[pSel].w.slug); }
  });
  pResults.addEventListener('click', e => { const li = e.target.closest('[data-slug]'); if (li) { closePalette(); openWork(li.dataset.slug); } });
  palette.addEventListener('click', e => { if (e.target === palette) closePalette(); });

  /* ======================================================================
     KEYBOARD GLOBAL
     ====================================================================== */
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') {
      if (!palette.hidden) return closePalette();
      if (!$('#quoteModal').hidden) return closeQuote();
      if (!reader.hidden) return requestClose();
      $('#island').setAttribute('aria-expanded', 'false');
    }
    if (typing) return;
    if (e.key === '/' && palette.hidden) { e.preventDefault(); openPalette(); return; }
    if (!reader.hidden && palette.hidden && $('#quoteModal').hidden) {
      if (e.key === 'ArrowRight') location.hash = $('#rNext').hash.slice(1);
      if (e.key === 'ArrowLeft') location.hash = $('#rPrev').hash.slice(1);
      if (e.key.toLowerCase() === 'f') $('#rFocus').click();
    }
  });

  /* ======================================================================
     MULAI
     ====================================================================== */
  route();
  playDraft();
  // Gambar ulang setelah font siap, supaya label huruf di kanvas memakai Geist.
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    paintStack(true);
    renderTG(false);
    if (anatCurrent?.slug) selectAnat(anatCurrent.slug);
  });
})();
