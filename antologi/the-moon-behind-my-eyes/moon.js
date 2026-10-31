/* The Moon Behind My Eyes: puisi dibaca di depan jendela malam.
   Kaca berembun yang diusap, bintang yang datang tepat setiap detik, tirai yang ditarik pembaca,
   dan bulan yang hanya terlihat selama pembaca menahan matanya terpejam.
   Puisi dimuat utuh dari content/works.json; kamar, jam, dan bulan adalah bingkainya. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'moon:places', 'moon:kept'];
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('jm:' + k)); return v == null ? d : v; } catch (_) { return d; } },
    // pratinjau dari admin tidak menulis riwayat pembaca; pengaturan baca tetap diingat
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (_) {} }
  };
  const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const array = v => Array.isArray(v) ? v : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en', LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const SLUG = 'the-moon-behind-my-eyes', root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], kicker: ['Puisi', 'Poem'], coverHint: ['Gulir pelan-pelan. Jendelanya ada di depanmu.', 'Scroll slowly. The window is in front of you.'],
    resume: ['Lanjutkan', 'Continue'], closeCurtains: ['Tutup tirai', 'Draw the curtains'], holdLabel: ['Tahan untuk memejam', 'Hold to close your eyes'],
    holdHint: ['Tahan tombol ini atau spasi. Lepaskan untuk membuka mata.', 'Hold this button or the space bar. Let go to open your eyes.'], openEyes: ['Baca dengan mata terbuka', 'Read with open eyes'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $$('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs: pilihan pembaca → tema bawaan di admin → tema perangkat. Langit selalu malam.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = dark ? '#121318' : '#e9e3d8';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('moon:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('moon:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
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
  // bahasa asli puisi ini Inggris; terjemahannya (kalau ada) disimpan di kunci bahasa lain
  const ORIG = work.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
  const translated = LANG !== ORIG && Array.isArray(work[TR]?.body) && work[TR].body.length;
  const body = translated ? work[TR].body : work.body;
  const title = (LANG !== ORIG && work[TR]?.title) || work.title;
  workTitle = title; setTitle();
  $('#title').textContent = title; $('#barTitle').textContent = title;
  const written = work.date ? new Date(work.date + 'T' + (work.time || '00:00') + ':00') : null;
  $('#byline').textContent = 'Juan' + (written ? ' · ' + written.toLocaleDateString(EN ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + (work.time ? ' · ' + work.time.replace(':', EN ? ':' : '.') : '') : '');
  if (LANG !== ORIG && !translated) {
    $('#lost').hidden = false;
    $('#lost').textContent = ORIG === 'en' ? t('Puisi ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.', '') : t('', 'This poem isn’t available in English yet, so it’s shown in the original Indonesian.');
    $('#lost').lang = 'id';
  }

  // Bait dan ketukan. Ketukan menunjuk baris lewat potongan kalimat aslinya (Inggris dulu, lalu terjemahannya).
  const stanzas = body.map(p => String(p).split('\n').map(l => l.trim()).filter(Boolean));
  const MARK = {
    stars: ['The stars arrived', 'Bintang-bintang'], curtains: ['I drew the curtains', 'tirai'], turn: ['I turned my back to the glass', 'membelakangi'],
    close: ['I finally closed my eyes', 'memejamkan'], inner: ['There it was.', 'Itu dia']
  };
  const plain = s => s.replace(/\*/g, '');
  const findLine = m => { for (let s = 0; s < stanzas.length; s++) for (let l = 0; l < stanzas[s].length; l++) if (m.some(x => x && plain(stanzas[s][l]).includes(x))) return { s, l }; return null; };
  const at = Object.fromEntries(Object.entries(MARK).map(([k, m]) => [k, findLine(m)]));
  const sealedFrom = at.inner ? at.inner.s : stanzas.length;
  $('#stanzas').innerHTML = stanzas.map((lines, s) => `<section class="stanza${s >= sealedFrom ? ' sealed' : ''}" data-s="${s}"><div class="card">${lines.map((l, i) => `<span class="line" id="l-${s}-${i}" data-s="${s}" data-l="${i}">${inline(l)}</span>`).join('')}</div>${s === 0 ? `<p class="cue" id="wipeCue" aria-live="polite"></p>` : ''}${s === sealedFrom ? `<p class="sealed-note">${t('Bait ini ada di balik mata. Tahan untuk memejam.', 'This stanza is behind the eyes. Hold to close them.')}</p>` : ''}</section>`).join('')
    + `<footer class="end" id="end"><p>${t('Selesai.', 'The end.')}</p><a class="secondary" href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button class="secondary" id="again" type="button">${t('Baca dari awal', 'Read from the start')}</button></footer>`;

  // Penyimpanan
  let places = PREVIEW ? {} : object(store.get('moon:places', {}));
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let kept = PREVIEW ? false : store.get('moon:kept', false) === true;
  root.toggleAttribute('data-kept', kept);

  // Kaca berembun: diusap dengan jari atau tetikus, pelan-pelan berembun lagi.
  const fog = $('#fog'), fx = fog.getContext('2d');
  let fogSized = false, clearPct = 0;
  const fogFill = alpha => {
    const w = fog.width, h = fog.height; fx.save(); fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = alpha;
    const g = fx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(118,130,156,.6)'); g.addColorStop(1, 'rgba(98,110,136,.72)');
    fx.fillStyle = g; fx.fillRect(0, 0, w, h); fx.restore();
  };
  const sizeFog = () => {
    const r = fog.getBoundingClientRect(); if (!r.width) return;
    fog.width = Math.round(r.width); fog.height = Math.round(r.height); fogSized = true; fogFill(1);
    // butiran embun
    fx.save(); for (let i = 0; i < 160; i++) { fx.fillStyle = `rgba(220,228,244,${(Math.random() * .16).toFixed(3)})`; fx.beginPath(); fx.arc(Math.random() * fog.width, Math.random() * fog.height, Math.random() * 2.4 + .4, 0, 7); fx.fill(); } fx.restore();
  };
  const measureClear = () => {
    if (!fogSized) return;
    const d = fx.getImageData(0, 0, fog.width, fog.height).data; let clear = 0, n = 0;
    for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 60) clear++; }
    clearPct = Math.round(clear / Math.max(1, n) * 100); root.dataset.clear = clearPct;
    const cue = $('#wipeCue'); if (cue) cue.textContent = clearPct > 85 ? t('Kacanya bening. Cahaya akan lebih mudah menemukanmu.', 'The glass is clear. The light should find you more easily.') : t(`Usap kacanya. ${clearPct}% bening.`, `Wipe the glass. ${clearPct}% clear.`);
  };
  let lastWipe = null, measureT = 0;
  const wipe = e => {
    if (!fogSized) return; const r = fog.getBoundingClientRect(), x = (e.clientX - r.left) * fog.width / r.width, y = (e.clientY - r.top) * fog.height / r.height;
    fx.save(); fx.globalCompositeOperation = 'destination-out'; fx.lineCap = 'round'; fx.lineWidth = 46;
    fx.beginPath(); if (lastWipe) fx.moveTo(lastWipe[0], lastWipe[1]); else fx.moveTo(x - .1, y); fx.lineTo(x, y); fx.stroke(); fx.restore();
    lastWipe = [x, y]; clearTimeout(measureT); measureT = setTimeout(measureClear, 120);
  };
  fog.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) wipe(e); });
  fog.addEventListener('pointerdown', e => { lastWipe = null; wipe(e); });
  fog.addEventListener('pointerleave', () => { lastWipe = null; });
  fog.addEventListener('pointerup', () => { lastWipe = null; });

  // Tirai: diseret ke tengah, atau lewat tombol.
  let curtainManual = 0, curtainAuto = 0, curtainState = -1;
  const setCurtains = () => {
    const v = Math.max(curtainManual, curtainAuto); if (v === curtainState) return; curtainState = v;
    root.style.setProperty('--close', v.toFixed(3)); root.toggleAttribute('data-curtains', v >= .98);
  };
  const dragCurtain = (el, dir) => {
    let sx = null, start = 0;
    el.addEventListener('pointerdown', e => { sx = e.clientX; start = curtainState; root.setAttribute('data-drag', ''); el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', e => { if (sx == null) return; const w = $('#window').getBoundingClientRect().width * .42; curtainManual = clamp(start + dir * (e.clientX - sx) / w, 0, 1); setCurtains(); });
    const end = () => { if (sx == null) return; sx = null; root.removeAttribute('data-drag'); if (curtainManual > .55) curtainManual = 1; setCurtains(); frame(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  };
  dragCurtain($('#curtainL'), 1); dragCurtain($('#curtainR'), -1);
  $('#closeCurtains').onclick = () => { curtainManual = 1; setCurtains(); frame(); };

  // Jam dan bintang: setiap detik tepat, satu bintang datang. Bulannya tetap kabar.
  const stars = $('#stars'); let starsOn = false;
  const moonIllum = date => { const p = (((date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1 + 1) % 1; return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100); };
  const tick = () => {
    const now = new Date();
    $('#clockTime').textContent = now.toLocaleTimeString(EN ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (starsOn && stars.childElementCount < 180) {
      const i = document.createElement('i'); i.style.left = (Math.random() * 96 + 2).toFixed(2) + '%'; i.style.top = (Math.random() * 92 + 2).toFixed(2) + '%';
      if (Math.random() < .18) i.className = 'big'; stars.append(i); root.dataset.stars = stars.childElementCount;
    }
  };
  const align = () => { tick(); setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - Date.now() % 1000); };
  align();
  $('#moonNote').textContent = '';

  // Mata: tahan untuk memejam. Bulan dan bait terakhir hanya ada di balik kelopak.
  const innerLines = stanzas.slice(sealedFrom).flatMap((ls, k) => [...(k ? [null] : []), ...ls]);
  let shut = 0, holding = false, raf = 0, revealed = kept ? innerLines.length : 0, revealT = 0;
  const renderInner = () => {
    $('#innerText').innerHTML = innerLines.slice(0, revealed).map(l => l == null ? '<span class="gap on"></span>' : `<span class="on">${inline(l)}</span>`).join('');
  };
  const keep = () => {
    if (kept) return; kept = true; store.set('moon:kept', true); root.toggleAttribute('data-kept', true); finish();
    $('#announcement').textContent = t('Bulannya tetap di sini, walau matamu terbuka.', 'The moon stays here, even with your eyes open.');
  };
  const revealNext = () => {
    clearTimeout(revealT); if (root.getAttribute('data-eyes') !== 'closed') return;
    if (revealed >= innerLines.length) { keep(); return; }
    revealed++; if (innerLines[revealed - 1] == null && revealed < innerLines.length) revealed++;
    renderInner(); if (revealed >= innerLines.length) { revealT = setTimeout(keep, 1200); return; }
    revealT = setTimeout(revealNext, 1900);
  };
  const setEyes = closed => {
    const was = root.getAttribute('data-eyes') === 'closed'; if (was === closed) return;
    root.setAttribute('data-eyes', closed ? 'closed' : 'open');
    if (closed) {
      renderInner();
      if (calm()) { revealed = innerLines.length; renderInner(); keep(); }
      else revealT = setTimeout(revealNext, revealed ? 900 : 2000);
      $('#announcement').textContent = t('Matamu terpejam.', 'Your eyes are closed.');
    } else { clearTimeout(revealT); }
  };
  const animate = () => {
    raf = 0; const target = holding ? 1 : 0;
    if (calm()) shut = target; else shut = clamp(shut + (target ? 1 / 52 : -1 / 20), 0, 1);
    root.style.setProperty('--shut', shut.toFixed(3));
    setEyes(shut >= .98);
    if (shut !== target) raf = requestAnimationFrame(animate);
  };
  const press = on => { if (holding === on) return; holding = on; if (!raf) raf = requestAnimationFrame(animate); };
  const hold = $('#hold');
  hold.addEventListener('pointerdown', e => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); press(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => hold.addEventListener(ev, () => press(false)));
  hold.addEventListener('contextmenu', e => e.preventDefault());
  hold.addEventListener('click', e => e.preventDefault());
  const holdReady = () => !$('#holdWrap').hidden && !$$('dialog').some(d => d.open);
  addEventListener('keydown', e => { if ((e.key === ' ' || (e.key === 'Enter' && document.activeElement === hold)) && holdReady()) { e.preventDefault(); if (!e.repeat) press(true); } });
  addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') press(false); });
  addEventListener('blur', () => press(false));
  $('#openEyes').onclick = () => { root.setAttribute('data-open-eyes', ''); $(`#l-${sealedFrom}-0`)?.scrollIntoView({ block: 'center', behavior: calm() ? 'instant' : 'smooth' }); };
  renderInner();

  // Membaca: garis baca di 45% tinggi layar.
  const lines = $$('.line'), line = () => innerHeight * .45;
  const index = el => lines.indexOf(el);
  const capture = () => {
    let lo = 0, hi = lines.length - 1, found = -1; const l = line();
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (lines[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const el = lines[found], r = el.getBoundingClientRect();
    return { s: +el.dataset.s, l: +el.dataset.l, i: found, offset: clamp((l - r.top) / Math.max(1, r.height), 0, 1) };
  };
  const lineAt = p => p ? lines.findIndex(el => +el.dataset.s === p.s && +el.dataset.l === p.l) : -1;
  const idxOf = p => p ? lines.findIndex(el => +el.dataset.s === p.s && +el.dataset.l === p.l) : Infinity;
  let latest = null, saveT = 0, current = -1;
  const finish = () => { if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); } persist(); };
  const persist = () => {
    if (!latest) return; places[LANG] = latest;
    const progress = kept || done.has(SLUG) ? Math.max(latest.progress, kept ? 1 : 0) : latest.progress;
    store.set('moon:places', places); store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() });
  };
  const frame = () => {
    if ($$('dialog').some(d => d.open)) return;
    const place = capture(); current = place ? place.i : -1;
    root.toggleAttribute('data-reading', current >= 0);
    const s = place ? place.s : -1;
    // bintang mulai datang di bait kedua dan tidak pernah pergi
    if (at.stars && current >= lineAt(at.stars)) { if (!starsOn) { starsOn = true; $('#moonNote').textContent = t(`Bulan malam ini ${moonIllum(new Date())}% · tidak terlihat dari jendela ini`, `Tonight’s moon ${moonIllum(new Date())}% · not visible from this window`); } }
    // tirai: tombolnya muncul saat kalimatnya terbaca; lewat dari baitnya, tirai menutup sendiri
    const cIdx = idxOf(at.curtains), turnIdx = idxOf(at.turn);
    const cue = current >= cIdx && current < turnIdx && curtainState < .98;
    $('#closeCurtains').hidden = !cue; root.toggleAttribute('data-cue', cue); if (cue) root.setAttribute('data-cue', 'curtains');
    if (at.curtains && s >= 0 && s < at.curtains.s) curtainManual = 0;
    curtainAuto = current >= turnIdx ? 1 : 0; setCurtains();
    root.toggleAttribute('data-turned', current >= turnIdx);
    // tahan untuk memejam: setelah "I finally closed my eyes"
    const ready = current >= idxOf(at.close) || (at.inner && current >= idxOf(at.inner));
    $('#holdWrap').hidden = !ready; if (!ready) press(false);
    const all = lines.length - 1, sealedIdx = lines.findIndex(el => +el.dataset.s >= sealedFrom);
    const open = kept || root.hasAttribute('data-open-eyes');
    let progress = place ? clamp((place.i + place.offset) / lines.length, 0, 1) : 0;
    if (!open && sealedIdx >= 0) progress = Math.min(progress, sealedIdx / lines.length);
    const atEnd = current === all && lines[all].getBoundingClientRect().bottom <= innerHeight - 30;
    if (open && atEnd) { progress = 1; finish(); }
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
  $('#openSettings').onclick = () => { persist(); press(false); $('#settingsDialog').showModal(); };
  $$('dialog').forEach(d => { d.addEventListener('close', schedule); d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }); });

  const follow = () => { const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (m) goTo(m[1] != null ? clamp(+m[1], 0, stanzas.length - 1) : 0); else frame(); };
  addEventListener('hashchange', follow); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => { sizeFog(); measureClear(); if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight]; if (latest && current >= 0) goTo(latest.s, latest.l, latest.offset); });
  addEventListener('pagehide', () => { clearTimeout(saveT); persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { press(false); persist(); } else schedule(); });
  // embun kembali pelan-pelan selama jendela masih ditatap
  setInterval(() => { if (fogSized && !root.hasAttribute('data-turned') && !(at.stars && current >= lineAt(at.stars))) { fogFill(.05); measureClear(); } }, 2200);
  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  sizeFog(); measureClear(); renderCover(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
