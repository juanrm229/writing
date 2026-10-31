/* The Moon Behind My Eyes: puisi dibaca di layar kunci.
   Kacanya kaca layar itu sendiri: buram sampai diusap. Bulan yang ditunggu adalah aktivitas langsung yang terus
   tertunda, bintangnya widget yang bertambah tepat setiap detik, penantiannya notifikasi yang terus ditunda,
   tirainya penggeser kecerahan di pusat kontrol. Memejam berarti menahan tombol kunci: di layar yang mati,
   dua bait terakhir menyala pelan. Tanpa ilustrasi; larik dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'kunci:state'];
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
  const plain = s => String(s).replace(/\*/g, '');
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en', LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const LOCALE = EN ? 'en-GB' : 'id-ID';
  const SLUG = 'the-moon-behind-my-eyes', root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], kicker: ['Puisi · Juan', 'Poem · Juan'], wMoonLabel: ['Bulan', 'Moon'], wStarsLabel: ['Bintang', 'Stars'], wRiseLabel: ['Terbit', 'Rise'],
    brightLabel: ['Kecerahan · tirai', 'Brightness · curtains'], focusLabel: ['Fokus', 'Focus'], focusChipLabel: ['Tidur', 'Sleep'], ccClose: ['Tutup', 'Close'], ccTitle: ['Pusat Kontrol', 'Control Centre'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['openCC', t('Buka pusat kontrol', 'Open Control Centre')], ['lockBtn', t('Tahan untuk mengunci dan memejam', 'Hold to lock and close your eyes')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $$('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs: pilihan pembaca → tema bawaan di admin → tema perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = dark ? '#050506' : '#e9e9ee';
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
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#feed').innerHTML = `<li class="note small"><p>${t('Puisinya belum bisa dimuat.', 'The poem could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p></li>`; $('#lockBtn').disabled = true; return; }
  const ORIG = work.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
  const translated = LANG !== ORIG && Array.isArray(work[TR]?.body) && work[TR].body.length;
  const body = translated ? work[TR].body : work.body;
  const title = (LANG !== ORIG && work[TR]?.title) || work.title;
  workTitle = title; setTitle(); $('#title').textContent = title;
  const lostNote = LANG !== ORIG && !translated ? (ORIG === 'en' ? 'Puisi ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.' : 'This poem isn’t available in English yet, so it’s shown in the original Indonesian.') : '';
  const stanzas = body.map(p => String(p).split('\n').map(l => l.trim()).filter(Boolean)).filter(s => s.length);
  const stanzaOf = m => stanzas.findIndex(ls => ls.some(l => m.some(x => x && plain(l).includes(x))));
  const INNER_AT = stanzaOf(['There it was.', 'Itu dia']);
  // bait sebelum "There it was." terbaca di layar kunci; sisanya hanya di layar yang dimatikan
  const REAR = INNER_AT > 0 ? INNER_AT : Math.max(1, stanzas.length - 2);
  const INNER = stanzas.slice(REAR).flatMap((ls, k) => [...(k ? [null] : []), ...ls]);
  const RISE_MS = 8000, NOTIFY_MS = 3200, SNOOZES = 3;

  // Keadaan layar
  const blank = () => ({ shown: 1, clarity: 0, riseAt: null, starsFrom: null, snoozes: 0, pings: 0, bright: 1, focus: false, revealed: 0, done: false, at: Date.now() });
  let S = PREVIEW ? blank() : { ...blank(), ...object(store.get('kunci:state', {})) };
  S.shown = clamp(+S.shown || 1, 1, REAR); S.clarity = clamp(+S.clarity || 0, 0, 1); S.bright = clamp(S.bright == null ? 1 : +S.bright, 0, 1); S.revealed = clamp(+S.revealed || 0, 0, INNER.length);
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const save = () => {
    store.set('kunci:state', S);
    store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +(S.done ? 1 : (S.shown - 1 + (S.clarity >= 1 ? .5 : 0)) / (REAR + 1)).toFixed(4) });
    store.set('last', { key: SLUG, at: Date.now() });
  };
  const moonPct = (() => { const p = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1 + 1) % 1; return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100); })();
  const starCount = () => S.starsFrom ? 6 + Math.floor((Date.now() - S.starsFrom) / 1000) : 0;
  const hm = d => d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
  const ago = at => { const s = Math.max(0, Math.round((Date.now() - at) / 1000)); return s < 45 ? t('sekarang', 'now') : s < 3600 ? t(`${Math.round(s / 60)} mnt lalu`, `${Math.round(s / 60)}m ago`) : hm(new Date(at)); };
  const lines = (ls, fresh) => ls.map(l => l == null ? '<span class="gap"></span>' : `<span class="line${fresh ? ' new' : ''}">${inline(l)}</span>`).join('');

  // Langkah-langkah puisi
  const reveal = n => { if (n <= S.shown || n > REAR) return; S.shown = n; S.at = Date.now(); save(); render(true); $('#announcement').textContent = t('Catatan baru.', 'New note.'); };
  const clean = amount => {
    if (S.clarity >= 1) return; S.clarity = clamp(S.clarity + amount, 0, 1);
    if (S.clarity >= 1 && !S.riseAt) { S.riseAt = Date.now(); save(); render(); } else { applyGlass(); saveSoon(); }
  };
  const tick = () => {
    // bulan terbit… dan tetap tidak terlihat; bintang datang tepat waktu
    if (S.riseAt && S.shown < 2 && Date.now() - S.riseAt >= (calm() ? 0 : RISE_MS)) { S.starsFrom = S.starsFrom || Date.now(); reveal(2); }
    // penantian: notifikasi yang terus datang sampai ditunda tiga kali
    if (S.shown === 2 && !S.focus && S.pings < 9 && Date.now() - (S.lastPing || S.at) >= (S.pings ? NOTIFY_MS : 900)) { S.pings++; S.lastPing = Date.now(); save(); renderFeed(false, true); }
    renderWidgets(); renderLive(); $('#clock').textContent = hm(new Date()); $('#aodClock').textContent = hm(new Date());
  };
  const snooze = () => { S.snoozes++; save(); if (S.snoozes >= SNOOZES) reveal(3); else renderFeed(); };
  const setBright = v => {
    S.bright = clamp(v, 0, 1); $('#bright').value = Math.round(S.bright * 100); $('#brightValue').textContent = Math.round(S.bright * 100) + '%';
    root.style.setProperty('--dim', (.45 + S.bright * .55).toFixed(3));
    // tirai ditarik: layar diredupkan, dan langit berhenti ditanya
    if (S.bright <= .05 && S.shown === 3) { S.focus = true; reveal(4); }
    saveSoon();
  };
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };

  // Kaca: diusap dengan jari atau tetikus
  const glass = $('#glass'); let last = null;
  const applyGlass = () => { root.style.setProperty('--blur', ((1 - S.clarity) * 9).toFixed(2) + 'px'); };
  glass.addEventListener('pointermove', e => {
    if (S.clarity >= 1) { last = null; return; }
    if (e.pointerType !== 'mouse' && !e.buttons && !e.pressure) return;
    if (last) clean(Math.hypot(e.clientX - last[0], e.clientY - last[1]) / (glass.clientWidth * 5));
    last = [e.clientX, e.clientY];
  });
  glass.addEventListener('pointerleave', () => { last = null; });
  glass.addEventListener('pointerup', () => { last = null; });

  // Pusat kontrol
  const openCC = () => { $('#cc').hidden = false; $('#bright').focus(); };
  const closeCC = () => { $('#cc').hidden = true; $('#openCC').focus(); render(); };
  $('#openCC').onclick = openCC; $('#ccClose').onclick = closeCC;
  $('#cc').addEventListener('click', e => { if (e.target === $('#cc')) closeCC(); });
  $('#bright').addEventListener('input', e => setBright(+e.target.value / 100));
  $('#focusBtn').onclick = () => { S.focus = !S.focus; save(); render(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#cc').hidden) closeCC(); });

  // Tombol kunci: tahan untuk memejam
  let hold = 0, holding = false, raf = 0, revealT = 0;
  const closed = () => hold >= .98;
  const finish = () => {
    if (S.done) return; clearTimeout(revealT); S.revealed = INNER.length; S.done = true; S.doneAt = Date.now();
    if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); }
    save(); renderAod(); render(true);
    $('#announcement').textContent = t('Bulan terlihat.', 'The moon is visible.');
  };
  const revealNext = () => {
    clearTimeout(revealT); if (!closed() || S.done) return;
    S.revealed++; if (INNER[S.revealed - 1] == null && S.revealed < INNER.length) S.revealed++;
    save(); renderAod(true);
    revealT = setTimeout(S.revealed >= INNER.length ? finish : revealNext, S.revealed >= INNER.length ? 1400 : 1850);
  };
  const animate = () => {
    raf = 0; const target = holding ? 1 : 0, was = closed();
    hold = calm() ? target : clamp(hold + (target ? 1 / 48 : -1 / 16), 0, 1);
    root.style.setProperty('--hold', hold.toFixed(3)); root.toggleAttribute('data-off', hold > 0);
    if (closed() !== was) {
      root.toggleAttribute('data-eyes-closed', closed()); renderAod();
      if (closed() && !S.done) { if (calm()) finish(); else revealT = setTimeout(revealNext, S.revealed ? 900 : 1500); }
      else clearTimeout(revealT);
    }
    if (hold !== target) raf = requestAnimationFrame(animate);
  };
  const ready = () => S.shown >= REAR && S.bright <= .05 || S.done;
  const press = on => { if (on && !ready()) return; if (holding === on) return; holding = on; if (!raf) raf = requestAnimationFrame(animate); };
  const lockBtn = $('#lockBtn');
  lockBtn.addEventListener('pointerdown', e => { if (!ready()) return; e.preventDefault(); lockBtn.setPointerCapture?.(e.pointerId); press(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => lockBtn.addEventListener(ev, () => press(false)));
  lockBtn.addEventListener('contextmenu', e => e.preventDefault());
  lockBtn.addEventListener('click', e => { e.preventDefault(); if (!ready()) hint(S.shown < 3 ? t('Belum. Kamu masih menunggu langit.', 'Not yet. You are still waiting on the sky.') : t('Tarik tirainya dulu: turunkan kecerahan di pusat kontrol.', 'Draw the curtains first: lower the brightness in Control Centre.')); });
  addEventListener('keydown', e => { if (e.key === ' ' && ready() && $('#cc').hidden && !$$('dialog').some(d => d.open) && !/INPUT/.test(document.activeElement?.tagName)) { e.preventDefault(); if (!e.repeat) press(true); } });
  addEventListener('keyup', e => { if (e.key === ' ') press(false); });
  addEventListener('blur', () => press(false));

  // Tampilan
  let hintT = 0, hintNow = '';
  const hint = (text, ms = 3600) => { hintNow = text; $('#hint').textContent = text; clearTimeout(hintT); hintT = setTimeout(() => { hintNow = ''; renderHint(); }, ms); };
  const renderHint = () => {
    if (hintNow) return; const h = $('#hint');
    if (S.done) { h.innerHTML = `${t('Selesai.', 'The end.')}<button type="button" id="again">${t('Mulai lagi', 'Start again')}</button>`; $('#again').onclick = () => { press(false); S = blank(); save(); render(true); }; return; }
    if (S.clarity < 1) { h.innerHTML = `${t('Usap layarnya sampai jelas.', 'Wipe the screen until it is clear.')}<button type="button" id="wipe">${t('Usap', 'Wipe')}</button>`; $('#wipe').onclick = () => clean(.34); return; }
    if (S.shown < 2) h.textContent = t('Bulan akan terbit sebentar lagi.', 'The moon will rise any moment.');
    else if (S.shown === 2) h.textContent = S.pings ? t('Tunda pengingatnya, atau tunggu saja.', 'Snooze the reminder, or just wait.') : '';
    else if (S.shown === 3) h.textContent = t('Buka ☾ pusat kontrol, turunkan kecerahan: tarik tirainya.', 'Open ☾ Control Centre and lower the brightness: draw the curtains.');
    else if (ready()) { h.innerHTML = `${t('Tahan tombol kunci untuk memejam.', 'Hold the lock button to close your eyes.')}<button type="button" id="openEyes">${t('Baca dengan mata terbuka', 'Read with open eyes')}</button>`; $('#openEyes').onclick = () => { S.revealed = INNER.length; finish(); }; }
    else h.textContent = '';
  };
  const renderWidgets = () => {
    $('#wMoonValue').textContent = moonPct + '%'; $('#wMoonSub').textContent = S.done ? t('terlihat · di balik mata', 'visible · behind the eyes') : t('tidak terlihat', 'not visible'); $('#wMoon').classList.toggle('lit', S.done);
    $('#wStarsValue').textContent = S.starsFrom ? String(starCount()) : '—'; $('#wStarsSub').textContent = S.starsFrom ? t('+1 tiap detik', '+1 every second') : t('belum', 'not yet');
    root.dataset.stars = starCount();
    const left = S.riseAt ? Math.max(0, Math.ceil(((calm() ? 0 : RISE_MS) - (Date.now() - S.riseAt)) / 1000)) : null;
    $('#wRiseValue').textContent = left == null ? '—' : S.shown < 2 ? `0:${String(left).padStart(2, '0')}` : t('Tertunda', 'Delayed');
    $('#wRiseSub').textContent = left == null ? t('menunggu langit', 'waiting on the sky') : S.shown < 2 ? t('menuju terbit', 'until moonrise') : t('tidak terlihat', 'not visible');
  };
  const renderLive = () => {
    const live = $('#live'); const show = S.riseAt && !S.focus && !S.done; live.hidden = !show; if (!show) return;
    const k = clamp((Date.now() - S.riseAt) / RISE_MS, 0, 1), rising = S.shown < 2;
    live.innerHTML = `<small>${t('Langit · aktivitas langsung', 'Sky · live activity')}</small><b>${rising ? t('Bulan terbit', 'Moonrise') : t('Bulan sudah terbit · tidak terlihat', 'The moon has risen · not visible')}</b><span class="count">${rising ? '0:' + String(Math.max(0, Math.ceil((RISE_MS - (Date.now() - S.riseAt)) / 1000))).padStart(2, '0') : '—'}</span>${rising ? `<span class="bar" style="--k:${k.toFixed(3)}"><i></i></span>` : ''}`;
  };
  const noteCard = (s, current, fresh) => `<li class="note${current ? '' : ' old'}${fresh && current ? ' fresh' : ''}" data-s="${s}"><p class="note-head"><span class="app-ico notes" aria-hidden="true">✎</span><b>${t('Catatan', 'Notes')}</b><span class="ago">${current ? ago(S.at) : ''}</span></p>${lines(stanzas[s], fresh && current)}</li>`;
  const renderFeed = (fresh, ping) => {
    let html = '';
    if (S.done) html += `<li class="note${fresh ? ' fresh' : ''}"><p class="note-head"><span class="app-ico sky" aria-hidden="true">☾</span><b>${t('Langit', 'Sky')}</b><span class="ago">${ago(S.doneAt || Date.now())}</span></p><p class="line"><b>${t('Bulan terlihat', 'Moon visible')}</b> · ${t('lokasi: di balik matamu', 'location: behind your eyes')}</p></li>`
      + `<li class="note"><p class="note-head"><span class="app-ico notes" aria-hidden="true">✎</span><b>${t('Catatan', 'Notes')}</b><span class="ago">${t('dari layar yang mati', 'from the dark screen')}</span></p>${lines(INNER)}</li>`;
    if (S.shown === 2 && S.pings && !S.focus) {
      html += `<li class="note sky${ping ? ' fresh' : ''}"><p class="note-head"><span class="app-ico sky" aria-hidden="true">☾</span><b>${t('Langit', 'Sky')}</b><span class="ago">${t('sekarang', 'now')}</span></p><p class="line"><b>${t('Bulan belum terlihat', 'The moon is not visible yet')}</b> · ${t('langit cerah, bintang lengkap', 'clear sky, every star in place')}</p><div class="acts"><button type="button" class="snooze">${t('Ingatkan lagi', 'Remind me again')}</button></div></li>`;
      if (S.pings > 1) html += `<p class="stack-more">${t(`+${S.pings - 1} notifikasi lagi dari Langit`, `+${S.pings - 1} more from Sky`)}</p>`;
    }
    for (let s = S.shown - 1; s >= 0; s--) html += noteCard(s, s === S.shown - 1 && !S.done, fresh);
    if (lostNote) html += `<li class="note lost" id="lost"><p>${esc(lostNote)}</p></li>`;
    $('#feed').innerHTML = html;
    $$('.snooze').forEach(b => { b.onclick = snooze; });
  };
  $('#feed').addEventListener('click', e => { const n = e.target.closest('.note.old'); if (n) n.toggleAttribute('data-open'); });
  const renderAod = fresh => {
    $('#aodMoon').innerHTML = closed() || S.done ? t('Bulan: <b>terlihat</b>', 'Moon: <b>visible</b>') : t('Bulan: tidak terlihat', 'Moon: not visible');
    const shown = INNER.slice(0, S.revealed);
    $('#aodLines').innerHTML = shown.length ? lines(shown.slice(0, -1)) + lines(shown.slice(-1), fresh) : '';
  };
  function render(fresh) {
    root.toggleAttribute('data-focus', S.focus);
    $('#focusChip').hidden = !S.focus; $('#focusBtn').setAttribute('aria-pressed', String(S.focus)); $('#focusState').textContent = S.focus ? t('Tidur · notifikasi dibisukan', 'Sleep · notifications silenced') : t('Mati', 'Off');
    $('#openCC').classList.toggle('cue', S.shown === 3 && $('#cc').hidden);
    lockBtn.classList.toggle('cue', ready() && !S.done); lockBtn.setAttribute('aria-disabled', String(!ready()));
    applyGlass(); setBright(S.bright); renderWidgets(); renderLive(); renderFeed(fresh); renderAod(); renderHint();
    if (fresh) glass.scrollTo({ top: 0, behavior: calm() ? 'instant' : 'smooth' });
  }
  setInterval(tick, 250);

  // Tautan #baca-N dari situs utama: langkah sebelumnya dianggap sudah dilalui
  const follow = () => {
    const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (!m || S.done) return;
    const s = clamp(m[1] != null ? +m[1] : 0, 0, stanzas.length - 1), want = Math.min(s + 1, REAR);
    if (want > S.shown) {
      S.clarity = 1; S.riseAt = S.riseAt || Date.now() - RISE_MS;
      if (want >= 2) S.starsFrom = S.starsFrom || Date.now();
      if (want >= 3) S.snoozes = Math.max(S.snoozes, SNOOZES);
      if (want >= 4) { S.bright = 0; S.focus = true; }
      S.shown = want; S.at = Date.now();
    }
    if (s >= REAR) { S.bright = 0; S.focus = true; }
    save(); render(true);
  };
  addEventListener('hashchange', follow);

  let fontSize = clamp(+object(store.get('rd', {})).size || 18, 15, 26);
  const setSize = d => { fontSize = clamp(fontSize + d, 15, 26); root.style.setProperty('--size', fontSize + 'px'); store.set('rd', { ...object(store.get('rd', {})), size: fontSize }); $('#smaller').disabled = fontSize === 15; $('#bigger').disabled = fontSize === 26; };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { save(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { press(false); $('#settingsDialog').showModal(); };
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  addEventListener('pagehide', () => { press(false); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { press(false); save(); } });
  $('#date').textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  render(); follow(); tick(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
