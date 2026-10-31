/* Trillions of Seconds: pembaca adalah titik kecil di laut malam.
   Ombak membisikkan kata-kata puisinya sendiri, detik terus berjalan, dan entitas yang melintas
   mengulang persis jalur yang ditempuh pembaca sejak bait pertama: "I am you."
   Puisi dimuat utuh dari content/works.json; laut, titik, dan penghitungnya adalah bingkainya. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'seconds:places', 'seconds:born'];
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('jm:' + k)); return v == null ? d : v; } catch (_) { return d; } },
    // pratinjau dari admin tidak menulis riwayat pembaca; pengaturan baca tetap diingat
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (_) {} }
  };
  const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const array = v => Array.isArray(v) ? v : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, k) => a + (b - a) * k;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '');
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en', LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const LOCALE = EN ? 'en-GB' : 'id-ID', num = n => Math.round(n).toLocaleString(LOCALE);
  const SLUG = 'trillions-of-seconds', root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], kicker: ['Puisi', 'Poem'], counterLabel: ['berpikir', 'thinking'],
    coverHint: ['Kamu adalah titik kecil itu. Geser ke kiri dan kanan untuk berenang, gulir untuk hanyut.', 'You are that tiny speck. Move left and right to swim, scroll to drift.'],
    resume: ['Lanjutkan', 'Continue'], steer: ['← geser untuk berenang →', '← move to swim →'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $('#counter').setAttribute('title', t('Detik yang sudah lewat untuk berpikir sejak puisi ini dibuka', 'Seconds spent thinking since this poem was opened'));
  $$('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs: pilihan pembaca → tema bawaan di admin → tema perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  let INK = '';
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark(); INK = dark ? '214,222,240' : '27,30,39';
    $('meta[name="theme-color"]').content = dark ? '#070a12' : '#f1eee7';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('seconds:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('seconds:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const calm = () => root.hasAttribute('data-calm');

  // Judul tab mengikuti pola situs utama: judul tulisan · nama situs
  let siteName = 'Quiet Margins', workTitle = '';
  const setTitle = name => { if (name) siteName = name; if (workTitle) document.title = workTitle + ' · ' + siteName; };
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.theme) { siteTheme = s.theme; applyTheme(); } if (s?.title) setTitle(s.title); }).catch(() => {});

  // Naskah
  let works = PREVIEW ? store.get('preview', null)?.works : null;
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#stanzas').innerHTML = `<p class="loading">${t('Puisinya belum bisa dimuat.', 'The poem could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; return; }
  const ORIG = work.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
  const translated = LANG !== ORIG && Array.isArray(work[TR]?.body) && work[TR].body.length;
  const body = translated ? work[TR].body : work.body;
  const title = (LANG !== ORIG && work[TR]?.title) || work.title;
  workTitle = title; setTitle(); $('#title').textContent = title;
  const written = work.date ? new Date(work.date + 'T' + (work.time || '00:00') + ':00') : null;
  $('#byline').textContent = 'Juan' + (written ? ' · ' + written.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }) + (work.time ? ' · ' + work.time.replace(':', EN ? ':' : '.') : '') : '');
  if (LANG !== ORIG && !translated) {
    $('#lost').hidden = false;
    $('#lost').textContent = ORIG === 'en' ? 'Puisi ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.' : 'This poem isn’t available in English yet, so it’s shown in the original Indonesian.';
  }

  // Bait dan ketukan: penanda dari potongan larik aslinya (Inggris dulu, lalu terjemahannya kalau ada).
  const stanzas = body.map(p => String(p).split('\n').map(l => l.trim()).filter(Boolean));
  const MARK = {
    ignore: ['I never pay them mind', 'tak pernah kupedulikan'], coast: ['coast of answers', 'pantai'], steer: ['steer my current toward you', 'arus'],
    trillions: ['Trillions of seconds', 'Triliunan detik'], meet: ['I encountered an entity', 'entitas'], past: ['he drifted past', 'hanyut'], stop: ['I stopped thinking', 'berhenti berpikir']
  };
  const findLine = m => { for (let s = 0; s < stanzas.length; s++) for (let l = 0; l < stanzas[s].length; l++) if (m.some(x => x && plain(stanzas[s][l]).includes(x))) return { s, l }; return null; };
  const at = Object.fromEntries(Object.entries(MARK).map(([k, m]) => [k, findLine(m)]));
  // bisikan ombak: kata-kata dari bait pertama, yang memohon agar ia menyerah
  const WHISPERS = (plain(stanzas[0]?.join(' ') || '').match(/\b(surrender|hope|curses)\b/gi) || ['surrender', 'hope']).map(w => w.toLowerCase());
  $('#stanzas').innerHTML = stanzas.map((lines, s) => `<section class="stanza" data-s="${s}">${lines.map((l, i) => `<span class="line" id="l-${s}-${i}" data-s="${s}" data-l="${i}">${inline(l)}</span>`).join('')}${
    at.trillions && s === at.trillions.s ? `<div class="note born" id="bornNote"><label for="born">${t('Sudah berapa detik kamu sendiri? Tahun lahirmu:', 'How many seconds have you had? Your birth year:')}</label><input id="born" inputmode="numeric" maxlength="4" placeholder="${t('mis. 1999', 'e.g. 1999')}" autocomplete="off"><p class="lived" id="lived" aria-live="polite"></p></div>` : ''}${
    at.past && s === at.past.s ? `<p class="note readout" id="readout" hidden></p>` : ''}</section>`).join('')
    + `<footer class="end" id="end"><p>${t('Selesai.', 'The end.')}</p><a class="secondary" href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button class="secondary" id="again" type="button">${t('Baca dari awal', 'Read from the start')}</button></footer>`;

  // Penyimpanan
  let places = PREVIEW ? {} : object(store.get('seconds:places', {}));
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));

  // Detik: yang lewat untuk berpikir sejak puisi dibuka, dan (kalau mau) seluruh detik hidup pembaca.
  const opened = Date.now(); let stoppedAt = 0;
  const TRILLION_YEARS = 1e12 / (365.2425 * 864e2);
  const clock = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  let born = PREVIEW ? null : +store.get('seconds:born', 0) || null;
  const lived = () => {
    if (!born) { $('#lived').textContent = ''; return; }
    const now = stoppedAt || Date.now(), secs = Math.max(0, (now - new Date(born, 6, 1).getTime()) / 1000);
    $('#lived').innerHTML = `<span class="mono">± ${num(secs)}</span> ${t('detik', 'seconds')}. ${t(`Satu triliun detik adalah ±${num(TRILLION_YEARS)} tahun; kamu baru ${(secs / 1e10).toLocaleString(LOCALE, { maximumFractionDigits: 3 })}% darinya.`, `One trillion seconds is about ${num(TRILLION_YEARS)} years; you are only ${(secs / 1e10).toLocaleString(LOCALE, { maximumFractionDigits: 3 })}% of the way.`)}`;
  };
  const tick = () => { const s = Math.floor(((stoppedAt || Date.now()) - opened) / 1000); $('#elapsed').textContent = clock(s); root.dataset.elapsed = s; if (born) lived(); };
  setInterval(tick, 1000); tick();
  if ($('#born')) {
    if (born) $('#born').value = born;
    $('#born').addEventListener('input', e => {
      const y = +e.target.value.replace(/\D/g, ''), now = new Date().getFullYear();
      born = y >= 1900 && y <= now ? y : null; store.set('seconds:born', born); lived();
    });
    lived();
  }

  // Laut
  const sea = $('#sea'), cx = sea.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const sizeSea = () => { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; sea.width = Math.round(W * DPR); sea.height = Math.round(H * DPR); cx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  sizeSea();
  const wide = () => W >= 1000;
  const toPx = x => (wide() ? lerp(.06, .52, x) : lerp(.07, .93, x)) * W;
  const SPECK_Y = () => H * (wide() ? .42 : .25);
  let target = .5, speck = .5, steered = false;
  const path = [], wake = [];
  let ghost = null; // { start, done }
  let stage = { whisper: true, coast: false, bend: 0, bendGoal: 0, still: false, stillK: 1 };
  let whispers = [], lastWhisper = 0, lastRipple = 0, ripples = [];

  const steerBy = dx => { target = clamp(target + dx, 0, 1); if (!steered) { steered = true; root.setAttribute('data-steered', ''); } };
  let touchX = null;
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') touchX = e.clientX; });
  addEventListener('pointermove', e => {
    if (stage.still || e.target.closest?.('dialog, input, .bar')) return;
    if (e.pointerType === 'mouse') { const x = wide() ? (e.clientX / W - .06) / .46 : (e.clientX / W - .07) / .86; target = clamp(x, 0, 1); if (!steered && Math.abs(e.movementX) > 2) { steered = true; root.setAttribute('data-steered', ''); } }
    else if (touchX != null) { steerBy((e.clientX - touchX) / W * 1.3); touchX = e.clientX; }
  });
  ['pointerup', 'pointercancel'].forEach(ev => addEventListener(ev, () => { touchX = null; }));
  addEventListener('keydown', e => {
    if (stage.still || /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || $$('dialog').some(d => d.open)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); steerBy(-.07); }
    if (e.key === 'ArrowRight') { e.preventDefault(); steerBy(.07); }
  });

  // rekam jalur titik setiap 100 ms sampai entitas itu muncul
  setInterval(() => { if (!ghost && !stage.still && path.length < 6000 && !document.hidden) path.push(+speck.toFixed(4)); }, 100);

  let tPrev = performance.now(), T = 0;
  const waveY = (i, n, x, tt) => {
    const base = H * lerp(.1, 1.02, i / (n - 1)), amp = (6 + i * .9) * stage.stillK;
    let y = base + amp * Math.sin(x * (.009 + i * .0004) + tt * (.5 + i * .03) + i) + amp * .5 * Math.sin(x * .021 - tt * .8 + i * 1.7);
    if (stage.bend) y += stage.bend * 46 * Math.exp(-((((x / W) - .5) / .26) ** 2)) * (i / n);
    return y;
  };
  const dot = (x, y, r, alpha, hollow) => {
    const g = cx.createRadialGradient(x, y, 0, x, y, r * 6); g.addColorStop(0, `rgba(${INK},${alpha * .55})`); g.addColorStop(1, `rgba(${INK},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 6, 0, 7); cx.fill();
    cx.beginPath(); cx.arc(x, y, r, 0, 7);
    if (hollow) { cx.strokeStyle = `rgba(${INK},${alpha})`; cx.lineWidth = 1.4; cx.stroke(); } else { cx.fillStyle = `rgba(${INK},${alpha})`; cx.fill(); }
  };
  const trail = (pts, alpha) => {
    if (pts.length < 2) return; cx.lineWidth = 1.2;
    for (let k = 1; k < pts.length; k++) { cx.strokeStyle = `rgba(${INK},${alpha * k / pts.length})`; cx.beginPath(); cx.moveTo(pts[k - 1][0], pts[k - 1][1]); cx.lineTo(pts[k][0], pts[k][1]); cx.stroke(); }
  };
  function paint() {
    if (!W) return;
    cx.clearRect(0, 0, W, H);
    // pantai jawaban dan kerinduan: selalu di kejauhan
    if (stage.coast) {
      const g = cx.createLinearGradient(0, 0, 0, H * .16); g.addColorStop(0, `rgba(${INK},.13)`); g.addColorStop(1, `rgba(${INK},0)`);
      cx.fillStyle = g; cx.fillRect(0, 0, W, H * .16);
      cx.strokeStyle = `rgba(${INK},.22)`; cx.lineWidth = 1; cx.beginPath();
      for (let x = 0; x <= W; x += 10) { const y = H * .075 + 5 * Math.sin(x * .013) + 3 * Math.sin(x * .041 + 1); x ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
    }
    const n = 16;
    for (let i = 0; i < n; i++) {
      cx.strokeStyle = `rgba(${INK},${(.06 + i * .006).toFixed(3)})`; cx.lineWidth = 1; cx.beginPath();
      for (let x = -10; x <= W + 10; x += 8) { const y = waveY(i, n, x, T); x > -10 ? cx.lineTo(x, y) : cx.moveTo(x, y); }
      cx.stroke();
    }
    // bisikan ombak
    cx.textAlign = 'center'; cx.font = `italic 15px Newsreader, Georgia, serif`;
    whispers.forEach(w => { cx.fillStyle = `rgba(${INK},${(w.a * .55).toFixed(3)})`; cx.fillText(w.word, w.x, w.y); });
    const sx = toPx(speck), sy = SPECK_Y();
    trail(wake.map(([x, at]) => [toPx(x), sy + (T - at) * WAKE_V()]).filter(p => p[1] < H + 20), .35);
    ripples.forEach(r => { cx.strokeStyle = `rgba(${INK},${(.32 * (1 - r.k)).toFixed(3)})`; cx.lineWidth = 1; cx.beginPath(); cx.arc(sx, sy, 6 + r.k * 34, 0, 7); cx.stroke(); });
    dot(sx, sy, 3.6, .95, false);
    if (ghost) {
      const g = ghostAt(); if (g) { trail(g.trail, .3); dot(g.x, g.y, 3.6, .7, true); }
    }
  }
  // jejak hanyut dengan kecepatan yang sama untuk titik pembaca dan entitas itu, supaya bentuknya bisa dikenali
  const WAKE_V = () => H / 16;
  const ghostAt = () => {
    if (!ghost || path.length < 2) return null;
    const e = calm() ? (SPECK_Y() + H * .14) / WAKE_V() : (performance.now() - ghost.start) / 1000;
    const yOf = k => -H * .08 + k * WAKE_V(), xOf = k => toPx(path[clamp(Math.floor(k * 10), 0, path.length - 1)]);
    if (yOf(e) > H * 1.08) { ghost.gone = true; return null; }
    // entitas itu memutar ulang jalur pembaca dari detik pertama, dengan kecepatan aslinya
    const pts = []; for (let b = Math.min(e, 8); b >= 0; b -= .1) pts.push([xOf(e - b), yOf(e) - b * WAKE_V()]);
    return { x: xOf(e), y: yOf(e), trail: pts };
  };
  const loop = now => {
    const dt = Math.min(.05, (now - tPrev) / 1000); tPrev = now;
    if (!calm() && !document.hidden) {
      if (!stage.still) T += dt;
      stage.bend = lerp(stage.bend, stage.bendGoal, .03);
      stage.stillK = lerp(stage.stillK, stage.still ? 0 : 1, stage.still ? .012 : .05);
      if (!stage.still) {
        const drift = .012 * Math.sin(T / 3.1) + (stage.bendGoal ? (.5 - speck) * .01 : 0);
        speck = clamp(speck + (target - speck) * .06 + drift * dt * 4, 0, 1);
        if (stage.bendGoal) target = lerp(target, .5, .004);
        if (!wake.length || T - wake.at(-1)[1] > .08) wake.push([speck, T]); while (wake.length && T - wake[0][1] > 8) wake.shift();
        if (T - lastRipple > 1.5) { lastRipple = T; ripples.push({ k: 0 }); }
      }
      ripples.forEach(r => { r.k += dt / 2.2; }); ripples = ripples.filter(r => r.k < 1);
      if (stage.whisper && !stage.still && T - lastWhisper > 1.7) {
        lastWhisper = T; const left = Math.random() < .5;
        whispers.push({ word: WHISPERS[Math.floor(Math.random() * WHISPERS.length)], x: left ? -40 : W + 40, y: SPECK_Y() + (Math.random() - .3) * H * .5, a: 0, life: 0 });
      }
      const sx = toPx(speck), sy = SPECK_Y();
      whispers.forEach(w => {
        w.life += dt; const dx = sx - w.x, dy = sy - w.y, d = Math.hypot(dx, dy) || 1;
        w.x += dx / d * 26 * dt; w.y += dy / d * 26 * dt;
        // diabaikan: bisikan memudar sebelum sampai, dan cepat hilang setelah "I never pay them mind"
        w.a = stage.whisper ? Math.min(1, w.life / 2) * clamp((d - 30) / 160, 0, 1) : Math.max(0, w.a - dt * .8);
      });
      whispers = whispers.filter(w => w.a > .01 || w.life < 2.5);
    } else if (calm()) { speck = target; stage.bend = stage.bendGoal; stage.stillK = stage.still ? 0 : 1; whispers = []; }
    paint();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Membaca
  const lines = $$('.line'), line = () => innerHeight * .5;
  const capture = () => {
    let lo = 0, hi = lines.length - 1, found = -1; const l = line();
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const el = lines[found], r = el.getBoundingClientRect();
    return { s: +el.dataset.s, l: +el.dataset.l, i: found, offset: clamp((l - r.top) / Math.max(1, r.height), 0, 1) };
  };
  const idxOf = p => p ? lines.findIndex(el => +el.dataset.s === p.s && +el.dataset.l === p.l) : Infinity;
  let latest = null, saveT = 0, current = -1;
  const finish = () => { if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); } };
  const persist = () => {
    if (!latest) return; places[LANG] = latest;
    store.set('seconds:places', places); store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +latest.progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() });
  };
  const frame = () => {
    if ($$('dialog').some(d => d.open)) return;
    const place = capture(); current = place ? place.i : -1;
    root.toggleAttribute('data-reading', current >= 0);
    stage.whisper = current < idxOf(at.ignore);
    stage.coast = current >= idxOf(at.coast);
    stage.bendGoal = at.steer && place && place.s === at.steer.s && current >= idxOf(at.steer) ? 1 : 0;
    // entitas itu muncul saat larik pertemuan terbaca, dan kembali menunggu kalau pembaca mundur
    if (current >= idxOf(at.meet)) { if (!ghost) { ghost = { start: performance.now(), gone: false }; $('#announcement').textContent = t('Sebuah titik lain mendekat.', 'Another speck approaches.'); } }
    else if (ghost) ghost = null;
    const readout = $('#readout');
    if (readout) {
      const show = current >= idxOf(at.past) && ghost; readout.hidden = !show;
      if (show && !readout.textContent) {
        const secs = Math.round(path.length / 10);
        readout.innerHTML = t(`Lintasan entitas itu: <b>100% sama</b> dengan lintasanmu · ${num(secs)} detik terekam sejak bait pertama.`, `That entity’s path: <b>100% identical</b> to yours · ${num(secs)} seconds recorded since the first stanza.`);
      }
      if (!show) readout.textContent = '';
    }
    const still = current >= idxOf(at.stop);
    if (still !== stage.still) {
      stage.still = still; root.toggleAttribute('data-still', still);
      stoppedAt = still ? Date.now() : 0; tick();
      if (still) $('#announcement').textContent = t('Semuanya berhenti.', 'Everything stops.');
    }
    const all = lines.length - 1;
    let progress = place ? clamp((place.i + place.offset) / lines.length, 0, 1) : 0;
    if (current === all && lines[all].getBoundingClientRect().bottom <= innerHeight - 30) { progress = 1; finish(); }
    $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latest = { s: place.s, l: place.l, offset: place.offset, progress }; clearTimeout(saveT); saveT = setTimeout(persist, 350); }
  };
  let rafScroll = 0;
  const schedule = () => { if (!rafScroll) rafScroll = requestAnimationFrame(() => { rafScroll = 0; frame(); }); };
  const goTo = (s, l = 0, offset = 0) => {
    const el = document.getElementById(`l-${s}-${l}`) || document.getElementById(`l-${s}-0`) || lines[0]; if (!el) return;
    scrollTo({ top: scrollY + el.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * el.getBoundingClientRect().height, behavior: 'instant' });
    el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); frame();
  };
  $('#again').onclick = () => { scrollTo({ top: 0, behavior: 'instant' }); frame(); };
  const renderCover = () => { const p = places[LANG]; $('#resume').hidden = !(p && p.progress > 0 && p.progress < .99); };
  $('#resume').onclick = () => { const p = places[LANG]; goTo(p.s, p.l, p.offset); };

  let size = clamp(+object(store.get('rd', {})).size || (innerWidth <= 420 ? 19 : 21), 16, 28);
  const setSize = delta => { const p = delta ? capture() : null; size = clamp(size + delta, 16, 28); root.style.setProperty('--size', size + 'px'); store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 28; if (p) goTo(p.s, p.l, p.offset); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { persist(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = latest ? 'baca-' + latest.s : ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  $$('dialog').forEach(d => { d.addEventListener('close', schedule); d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }); });

  const follow = () => { const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (m) goTo(m[1] != null ? clamp(+m[1], 0, stanzas.length - 1) : 0); else frame(); };
  addEventListener('hashchange', follow); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => { sizeSea(); if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight]; if (latest && current >= 0) goTo(latest.s, latest.l, latest.offset); });
  addEventListener('pagehide', () => { clearTimeout(saveT); persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else { tPrev = performance.now(); schedule(); } });
  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  // pengait kecil untuk pengujian: jalur yang terekam dan posisi entitas itu
  window.__seconds = { path, ghostAt, speck: () => speck, toPx };
  renderCover(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
