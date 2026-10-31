/* Larut: Pabrik Mimpi dibaca seperti mimpi. Paragraf yang sudah dibaca larut menjadi bintang;
   sejak Lila membawa mereka semua ke pabrik, tidak ada lagi yang larut, sebab itu benar-benar terjadi.
   Naskah dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('jm:' + key)); return v == null ? fallback : v; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem('jm:' + key, JSON.stringify(value)); } catch (_) {} }
  };
  const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const array = v => Array.isArray(v) ? v : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const count = s => (String(s).replace(/\*/g, '').match(/\S+/g) || []).length;
  const qs = new URLSearchParams(location.search), EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const LANG = EN ? 'en' : 'id', L = EN ? 1 : 0, t = (id, en) => EN ? en : id;
  const SLUG = 'pabrik-mimpi', PREVIEW = qs.has('preview'), root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  // Dua penanda saja: sejak kapan sesuatu benar-benar terjadi, dan kapan seluruh ruangan berdiri.
  const MARKERS = {
    real: ['Lila membawa mereka semua ke pabrik', 'Lila brought them all to the factory'],
    first: ['Lalu seorang perempuan di barisan depan', 'Then a woman in the front row'],
    burst: ['Lalu yang di sebelahnya berdiri', 'Then the person next to her stood']
  };
  window.MimpiLarut = { MARKERS };
  root.lang = LANG;
  const labels = {
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], dissolveLabel: ['Biarkan kalimat larut', 'Let sentences dissolve'],
    dissolveNote: ['Kalimat yang sudah dibaca larut menjadi bintang. Ketuk bintang di tempatnya untuk memunculkannya sebentar.', 'Sentences you have read dissolve into stars. Tap a star where a sentence was to bring it back for a moment.'],
    motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language'], resume: ['Lanjutkan tidur', 'Keep sleeping'], again: ['Tidur lagi', 'Sleep again'],
    wakeBack: ['Kembali ke meja tulis', 'Back to the writing desk'], wakeAgain: ['Tidur lagi', 'Sleep again']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs. Gelap adalah langit malam; terang adalah langit pukul lima sore.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = dark ? '#07070d' : '#f1d9c4';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
    sky?.paint();
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });

  // Langit: bintang latar, satu bintang untuk setiap paragraf yang larut, dan cahaya yang naik ke sana.
  const PALETTE = ['#ff8fa3', '#ffd36b', '#8ef0c0', '#86bcff', '#c9a0ff', '#ffb38a'];
  const rand = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const sky = (() => {
    const canvas = $('#sky'), ctx = canvas.getContext('2d');
    if (!ctx) return null;
    let w = 0, h = 0, dpr = 1, raf = 0, stars = new Map(), motes = [], sparks = [], burst = 0, dawn = 0, start = performance.now();
    const back = Array.from({ length: 170 }, (_, i) => ({ x: rand(i), y: rand(i + 500), r: .35 + rand(i + 900) * .9, tw: rand(i + 77) * 6.28 }));
    const place = p => ({ x: .06 + rand(p + 31) * .88, y: .05 + rand(p + 73) * .62, c: PALETTE[Math.floor(rand(p + 11) * PALETTE.length)], tw: rand(p + 5) * 6.28 });
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); paint(); };
    const glow = (x, y, r, color, a) => { const spread = isDark() ? 6 : 3.5; const g = ctx.createRadialGradient(x, y, 0, x, y, r * spread); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); ctx.globalAlpha = a * .45; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * spread, 0, 7); ctx.fill(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const paint = (now = performance.now()) => {
      const dark = isDark(), still = calm(), tm = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = dark ? '#fff' : '#5a4560';
      const fade = 1 - dawn * .75;
      back.forEach(s => { const a = (dark ? .55 : .25) * fade * (still ? 1 : .65 + .35 * Math.sin(tm * 1.3 + s.tw)); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 7); ctx.fill(); });
      stars.forEach(s => {
        const tw = still ? 1 : .75 + .25 * Math.sin(tm * 1.7 + s.tw), r = (2.3 + burst * 1.4) * (s.born ? Math.min(1, (now - s.born) / 900) : 1);
        ctx.fillStyle = burst ? s.c : (dark ? '#fff7e6' : s.c);
        glow(s.x * w, s.y * h, r, ctx.fillStyle, (dark ? .95 : .8) * tw * (fade + burst * .4));
      });
      motes = motes.filter(m => { const k = clamp((now - m.t) / 1600, 0, 1), e = 1 - Math.pow(1 - k, 3); const x = m.x0 + (m.x1 - m.x0) * e + Math.sin(k * 9) * 12 * (1 - k), y = m.y0 + (m.y1 - m.y0) * e; ctx.fillStyle = m.c; glow(x, y, 2.2, m.c, 1 - k * .3); return k < 1; });
      sparks = sparks.filter(s => { const k = (now - s.t) / s.d; if (k >= 1) return false; ctx.fillStyle = s.c; glow(s.x * w + Math.sin(k * 6 + s.o) * 20, h - k * h * s.v, 1.6 + s.r, s.c, (1 - k) * .9); return true; });
      ctx.globalAlpha = 1;
      raf = !still && !document.hidden ? requestAnimationFrame(paint) : 0;
    };
    const api = {
      paint: () => { if (!raf) raf = requestAnimationFrame(paint); },
      add: (p, from) => {
        if (stars.has(p)) return; const s = place(p); stars.set(p, { ...s, born: calm() ? 0 : performance.now() });
        if (from && !calm()) motes.push({ x0: from.left + from.width / 2, y0: from.top + from.height / 2, x1: s.x * w, y1: s.y * h, c: s.c, t: performance.now() });
        api.paint();
      },
      clear: () => { stars = new Map(); motes = []; api.paint(); },
      burst: on => {
        burst = on ? 1 : 0;
        if (on && !calm()) for (let i = 0; i < 160; i++) sparks.push({ x: .5 + (rand(i + performance.now()) - .5) * .5, v: .5 + rand(i * 3) * .6, c: PALETTE[i % PALETTE.length], t: performance.now() + i * 25, d: 2600 + rand(i) * 2000, r: rand(i + 4), o: rand(i + 8) * 6 });
        api.paint();
      },
      dawn: k => { dawn = k; api.paint(); },
      count: () => stars.size
    };
    addEventListener('resize', resize); resize();
    return api;
  })();
  applyTheme();

  // Naskah
  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.theme) { siteTheme = s.theme; applyTheme(); } }).catch(() => {});
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#story').innerHTML = `<p class="loading">${t('Naskah belum bisa dimuat.', 'The story could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; return; }
  const body = EN && Array.isArray(work.en?.body) && work.en.body.length ? work.en.body : work.body;
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · ' + t('Larut', 'Dissolve'); $('#title').textContent = title;
  const findP = m => body.findIndex(p => p.includes(m[L]));
  const REAL = findP(MARKERS.real), FIRST = findP(MARKERS.first), BURST = findP(MARKERS.burst);
  const realFrom = REAL >= 0 ? REAL : body.length;

  // Penyimpanan
  const dissolvedAll = PREVIEW ? {} : object(store.get('mimpi:larut', {}));
  const dissolved = new Set(array(dissolvedAll[LANG]));
  const saveDissolved = () => { if (PREVIEW) return; dissolvedAll[LANG] = [...dissolved]; store.set('mimpi:larut', dissolvedAll); };
  let places = PREVIEW ? {} : object(store.get('mimpi:places', {}));
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const letGo = () => store.get('mimpi:dissolve', true) !== false;

  // Gerak dan pengaturan
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('mimpi:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still'); sky?.paint();
  };
  function calm() { return root.hasAttribute('data-calm'); }
  $('#motion').onclick = () => { store.set('mimpi:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const setDissolve = () => { const on = letGo(); root.toggleAttribute('data-keep', !on); $('#dissolve').setAttribute('aria-pressed', String(on)); $('#dissolve').textContent = on ? t('Ya', 'Yes') : t('Tidak', 'No'); };
  $('#dissolve').onclick = () => { store.set('mimpi:dissolve', !letGo()); setDissolve(); };
  setDissolve();

  // Paragraf
  let paragraphs = [], weights = new Map(), total = 0, current = -1, latest = null, saveTimer = 0, raf = 0, recalls = new Map();
  const witnessed = new Set();
  const line = () => innerHeight * .5;
  $('#story').innerHTML = body.map((p, i) => p.trim() === '***' ? '<div class="pause" role="separator"><span></span></div>'
    : `<div class="verse${i >= realFrom ? ' real' : ''}" data-entry="${i}"><p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>${i < realFrom ? `<button class="remnant" type="button" data-recall="${i}" aria-label="${t('Munculkan kembali paragraf ini sebentar', 'Bring this paragraph back for a moment')}"><span aria-hidden="true"></span></button>` : ''}</div>`).join('');
  paragraphs = [...document.querySelectorAll('.passage')];
  paragraphs.forEach(p => { const w = count(body[+p.dataset.p]); weights.set(p, { before: total, words: w }); total += w; });
  const verseOf = p => document.querySelector(`[data-entry="${p}"]`);
  // Larut: hurufnya memudar dan naik; di langit lahir satu bintang.
  const dissolve = (p, animate = true) => {
    if (p >= realFrom) return;
    const v = verseOf(p); if (!v) return;
    const fresh = !dissolved.has(p); dissolved.add(p); v.classList.add('gone'); v.classList.remove('recalled');
    if (fresh) { saveDissolved(); sky?.add(p, animate ? v.querySelector('.passage').getBoundingClientRect() : null); }
  };
  dissolved.forEach(p => { const v = verseOf(p); if (v) { v.classList.add('gone'); sky?.add(p, null); } });
  $('#story').addEventListener('click', e => {
    const b = e.target.closest('[data-recall]'); if (!b) return;
    const p = +b.dataset.recall, v = verseOf(p); v.classList.add('recalled'); v.classList.remove('gone');
    clearTimeout(recalls.get(p)); recalls.set(p, setTimeout(() => { if (letGo()) dissolve(p); }, 7000));
    v.querySelector('.passage').setAttribute('tabindex', '-1'); v.querySelector('.passage').focus({ preventScroll: true });
  });

  const capture = () => {
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], r = p.getBoundingClientRect(), offset = clamp((l - r.top) / Math.max(1, r.height), 0, 1), w = weights.get(p);
    const last = paragraphs.at(-1).getBoundingClientRect(), finished = found === paragraphs.length - 1 && last.bottom <= innerHeight - 30;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((w.before + offset * w.words) / Math.max(1, total), 0, 1), finished };
  };
  const persist = () => {
    if (!latest) return;
    places[LANG] = latest;
    if (!PREVIEW) { store.set('mimpi:places', places); store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +latest.progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() }); }
    if (latest.finished && !done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); }
  };
  let burstOn = false;
  const frame = () => {
    if ($('#settingsDialog').open) return;
    const place = capture(); current = place ? place.paragraph : -1;
    root.dataset.view = scrollY < innerHeight * .4 ? 'sleep' : 'dream';
    paragraphs.forEach(node => {
      const p = +node.dataset.p, r = node.getBoundingClientRect();
      // Hanya yang benar-benar dilewati pembaca yang boleh larut; melompat tidak melarutkan apa pun.
      if (r.bottom > innerHeight * .25 && r.bottom < innerHeight && r.top < innerHeight) witnessed.add(p);
      if (p >= realFrom) { if (r.top < innerHeight * .9) node.parentElement.classList.add('seen'); return; }
      if (letGo() && witnessed.has(p) && !dissolved.has(p) && !recalls.has(p) && r.bottom < innerHeight * .22) dissolve(p);
      if (recalls.has(p) && (r.bottom < -40 || r.top > innerHeight + 40)) { clearTimeout(recalls.get(p)); recalls.delete(p); if (letGo()) dissolve(p, false); }
    });
    root.toggleAttribute('data-first', FIRST >= 0 && current >= FIRST);
    const nowBurst = BURST >= 0 && current >= BURST;
    if (nowBurst !== burstOn) { burstOn = nowBurst; root.toggleAttribute('data-burst', nowBurst); sky?.burst(nowBurst); if (nowBurst) $('#announcement').textContent = ''; }
    const last = paragraphs.at(-1).getBoundingClientRect(), k = clamp((innerHeight - last.top) / innerHeight, 0, 1) * (current >= body.length - 3 ? 1 : 0);
    root.style.setProperty('--dawn', k.toFixed(3)); sky?.dawn(k);
    $('#wake').hidden = !(place?.finished || current >= body.length - 1);
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latest = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    let target = null; for (let j = paragraph; j < body.length && !target; j++) target = document.getElementById('p-' + j);
    target = target || paragraphs.at(-1);
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); frame();
  };
  // Tidur lagi: kalimat kembali, langit dikosongkan.
  const sleepAgain = () => {
    dissolved.clear(); witnessed.clear(); saveDissolved(); sky?.clear(); burstOn = false; root.removeAttribute('data-burst'); sky?.burst(false);
    document.querySelectorAll('.verse').forEach(v => v.classList.remove('gone', 'recalled', 'seen'));
    places[LANG] = null; if (!PREVIEW) store.set('mimpi:places', places); latest = null;
    scrollTo({ top: 0, behavior: 'instant' }); renderSleep(); $('#title').setAttribute('tabindex', '-1'); $('#title').focus({ preventScroll: true }); frame();
  };
  const renderSleep = () => {
    const place = places[LANG], n = dissolved.size;
    $('#sleepNote').textContent = n ? t(`Langitmu menyimpan ${n} bintang dari tidur sebelumnya.`, `Your sky keeps ${n} ${n === 1 ? 'star' : 'stars'} from your last sleep.`) : t('Gulir pelan.', 'Scroll slowly.');
    $('#resume').hidden = !(place && place.progress > 0 && place.progress < .99);
    $('#again').hidden = !n;
  };
  $('#resume').onclick = () => { const place = places[LANG]; goTo(place.paragraph, place.offset); };
  $('#again').onclick = sleepAgain; $('#wakeAgain').onclick = sleepAgain;

  let size = clamp(+object(store.get('rd', {})).size || 21, 16, 28);
  const setSize = delta => { const place = delta ? capture() : null; size = clamp(size + delta, 16, 28); root.style.setProperty('--size', size + 'px'); store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 28; if (place) goTo(place.paragraph, place.offset); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { persist(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = current >= 0 ? 'baca-' + current : ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  $('#settingsDialog').addEventListener('close', schedule);
  $('#settingsDialog').addEventListener('click', e => { const d = e.currentTarget, r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });

  const follow = () => { const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (m && m[1] != null) goTo(+m[1]); else if (m) goTo(0); else frame(); };
  addEventListener('hashchange', follow); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => { if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight]; if (latest && current >= 0) goTo(latest.paragraph, latest.offset); });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else schedule(); });
  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
  }
  renderSleep(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
