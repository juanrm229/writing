/* Trillions of Seconds: puisi dibaca di aplikasi Jam.
   Mulai menjalankan stopwatch dan membuka bait pertama; setiap Putaran mencatat berapa lama pembaca
   berpikir di satu bait lalu membuka bait berikutnya. Jarum detiknya satu titik kecil. Di tengah puisi
   sebuah stopwatch lain muncul di dekat pembaca, dan putarannya persis sama: "I am you."
   Di bait terakhir pembaca sendiri yang menekan Berhenti. Larik dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'seconds:watch', 'seconds:born'];
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
  const LOCALE = EN ? 'en-GB' : 'id-ID', num = n => Math.round(n).toLocaleString(LOCALE);
  const SLUG = 'trillions-of-seconds', root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], kicker: ['Puisi · Juan', 'Poem · Juan'], worldTitle: ['Jam Dunia', 'World Clock'], alarmTitle: ['Alarm', 'Alarms'], alarmEmpty: ['Tidak ada alarm', 'No alarms'],
    timerTitle: ['Timer', 'Timers'], timerLabel: ['1 triliun detik', '1 trillion seconds'], bornLabel: ['Tahun lahirmu', 'Your birth year'], 
    tWorld: ['Jam Dunia', 'World Clock'], tAlarm: ['Alarm', 'Alarms'], tStopwatch: ['Stopwatch', 'Stopwatch'], tTimer: ['Timer', 'Timers'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $('.tabbar').setAttribute('aria-label', t('Jam', 'Clock'));
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
    $('meta[name="theme-color"]').content = dark ? '#000000' : '#ffffff';
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

  // Judul tab mengikuti pola situs utama: judul tulisan · nama situs
  let siteName = 'Quiet Margins', workTitle = '';
  const setTitle = name => { if (name) siteName = name; if (workTitle) document.title = workTitle + ' · ' + siteName; };
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.theme) { siteTheme = s.theme; applyTheme(); } if (s?.title) setTitle(s.title); }).catch(() => {});

  // Naskah
  let works = PREVIEW ? store.get('preview', null)?.works : null;
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#laps').innerHTML = `<li class="lap"><p class="hint">${t('Puisinya belum bisa dimuat.', 'The poem could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p></li>`; $('#startBtn').disabled = true; return; }
  const ORIG = work.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
  const translated = LANG !== ORIG && Array.isArray(work[TR]?.body) && work[TR].body.length;
  const body = translated ? work[TR].body : work.body;
  const title = (LANG !== ORIG && work[TR]?.title) || work.title;
  workTitle = title; setTitle(); $('#title').textContent = title;
  if (LANG !== ORIG && !translated) {
    $('#lost').hidden = false;
    $('#lost').textContent = ORIG === 'en' ? 'Puisi ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.' : 'This poem isn’t available in English yet, so it’s shown in the original Indonesian.';
  }
  const stanzas = body.map(p => String(p).split('\n').map(l => l.trim()).filter(Boolean)).filter(s => s.length);
  const TOTAL = stanzas.length;
  const stanzaOf = m => stanzas.findIndex(ls => ls.some(l => m.some(x => x && plain(l).includes(x))));
  const AT = {
    coast: stanzaOf(['coast of answers', 'pantai']), trillions: stanzaOf(['Trillions of seconds', 'Triliunan detik']),
    meet: stanzaOf(['I encountered an entity', 'entitas']), past: stanzaOf(['he drifted past', 'hanyut'])
  };

  // Keadaan stopwatch. Waktu disimpan sebagai milidetik; putaran yang dilewati lewat tautan bernilai null.
  const blank = () => ({ laps: [], acc: 0, lapStart: 0, shown: 0, finished: false, timerAt: null, seen: {} });
  let S = PREVIEW ? blank() : { ...blank(), ...object(store.get('seconds:watch', {})) };
  S.laps = array(S.laps).slice(0, Math.max(0, TOTAL - 1)); S.shown = clamp(+S.shown || 0, 0, TOTAL); S.seen = object(S.seen); S.acc = +S.acc || 0; S.lapStart = +S.lapStart || 0;
  let running = false, runStart = 0, raf = 0;
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const elapsed = () => S.acc + (running ? Date.now() - runStart : 0);
  const SEP = EN ? '.' : ',';
  const fmt = ms => {
    if (ms == null) return '—';
    const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
    return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + SEP + String(cs).padStart(2, '0');
  };
  const save = () => { store.set('seconds:watch', S); const progress = S.finished ? 1 : S.shown / TOTAL; store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() }); };

  // Dial: garis setiap detik, angka setiap lima detik, dan satu titik kecil sebagai jarum.
  {
    let ticks = '', nums = '';
    for (let i = 0; i < 240; i++) { const a = i / 240 * Math.PI * 2, major = i % 20 === 0, r1 = major ? 130 : 136, r2 = 143; if (i % 4 && !major) continue; ticks += `<line class="tick${major ? ' major' : ''}" x1="${(150 + Math.sin(a) * r1).toFixed(2)}" y1="${(150 - Math.cos(a) * r1).toFixed(2)}" x2="${(150 + Math.sin(a) * r2).toFixed(2)}" y2="${(150 - Math.cos(a) * r2).toFixed(2)}"/>`; }
    for (let n = 5; n <= 60; n += 5) { const a = n / 60 * Math.PI * 2; nums += `<text x="${(150 + Math.sin(a) * 114).toFixed(1)}" y="${(150 - Math.cos(a) * 114).toFixed(1)}">${n}</text>`; }
    $('#ticks').innerHTML = ticks; $('#nums').innerHTML = nums;
  }
  const R = 136, at = a => [150 + Math.sin(a) * R, 150 - Math.cos(a) * R];
  const drawDial = ms => {
    const a = (ms / 1000 % 60) / 60 * Math.PI * 2, [x, y] = at(a);
    $('#speck').setAttribute('cx', x.toFixed(2)); $('#speck').setAttribute('cy', y.toFixed(2));
    const [x0, y0] = at(Math.max(0, a - .5));
    $('#trail').setAttribute('d', running && a > .02 ? `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}` : '');
  };

  // Putaran: yang terbaru di atas, seperti aplikasi Jam. Bait yang sedang berjalan selalu terbuka.
  const stanzaHTML = s => stanzas[s].map((l, i) => `<span class="line" id="l-${s}-${i}">${inline(l)}</span>`).join('');
  const renderLaps = () => {
    const timed = S.laps.map((ms, i) => ({ ms, i })).filter(x => x.ms != null);
    const fast = timed.length >= 2 ? timed.reduce((a, b) => b.ms < a.ms ? b : a).i : -1, slow = timed.length >= 2 ? timed.reduce((a, b) => b.ms > a.ms ? b : a).i : -1;
    let html = '';
    for (let s = S.shown - 1; s >= 0; s--) {
      const top = s === S.shown - 1, current = top && !S.finished;
      const ms = top ? elapsed() - S.lapStart : S.laps[s];
      const cls = ['lap', current ? 'current' : '', !top && s === fast ? 'fast' : '', !top && s === slow ? 'slow' : ''].filter(Boolean).join(' ');
      if (s === S.shown - 2 && entityHere()) html += entityHTML();
      html += `<li class="${cls}" data-s="${s}"${top ? ' data-open' : ''}><button class="lap-row" type="button" aria-expanded="${top}"><span>${t('Putaran', 'Lap')} ${s + 1}${current ? '' : '<span class="chev" aria-hidden="true">›</span>'}</span><span class="time${!top && S.laps[s] === null ? ' skipped' : ''}">${fmt(ms)}</span></button><div class="lap-text">${stanzaHTML(s)}</div></li>`;
    }
    if (S.shown === 1 && entityHere()) html += entityHTML();
    $('#laps').innerHTML = html;
  };
  $('#laps').addEventListener('click', e => {
    const row = e.target.closest('.lap-row'); if (!row) return; const li = row.parentElement; if (li.classList.contains('current')) return;
    li.toggleAttribute('data-open'); row.setAttribute('aria-expanded', String(li.hasAttribute('data-open')));
  });

  // Entitas: stopwatch lain di dekat pembaca. Waktunya dan putarannya adalah milik pembaca sendiri.
  // kotaknya duduk tepat di bawah bait yang sedang dibaca
  const entityHere = () => { const s = S.shown - 1; return AT.meet >= 0 && s >= AT.meet && (AT.past < 0 || s <= AT.past) && !S.finished; };
  const entityHTML = () => `<li class="entity" id="entity" aria-live="polite"><header><span class="entity-dot" aria-hidden="true"></span><b>${t('Entitas', 'Entity')}</b><span class="entity-state" id="entityState"></span><span class="mono" id="entityTime"></span></header><ol class="entity-laps" id="entityLaps"></ol><p class="entity-note" id="entityNote" hidden></p></li>`;
  const renderEntity = () => {
    const box = $('#entity'), s = S.shown - 1;
    if (!box) return;
    const drifting = AT.past >= 0 && s >= AT.past;
    // menjauh pelan-pelan: kelasnya dipasang sebingkai kemudian supaya transisinya berjalan
    if (drifting) requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('drifting')));
    $('#entityState').textContent = drifting ? t('hanyut menjauh', 'drifting away') : t('di dekatmu', 'nearby');
    $('#entityLaps').innerHTML = S.laps.map((ms, i) => `<li><span>${t('Putaran', 'Lap')} ${i + 1}</span><span>${fmt(ms)}</span></li>`).reverse().join('');
    $('#entityTime').textContent = fmt(elapsed());
    const note = $('#entityNote'); note.hidden = !drifting;
    if (drifting) note.textContent = t(`Putaran 1–${S.laps.length}: sama persis dengan milikmu.`, `Laps 1–${S.laps.length}: identical to yours.`);
  };

  // Jam dunia, alarm, dan timer satu triliun detik
  const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { return ''; } })();
  const city = (zone.split('/').pop() || t('Di sini', 'Here')).replace(/_/g, ' ');
  const renderWorld = () => {
    const hm = new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
    let html = `<li><span><small>${t('Hari ini, +0 jam', 'Today, +0 hrs')}</small><b>${esc(city)}</b></span><span class="big">${hm}</span></li>`;
    if (AT.coast >= 0 && S.shown > AT.coast) html += `<li class="new" id="coast"><span><small>${t('Zona waktu tidak diketahui', 'Time zone unknown')}</small><b>${t('Pantai Jawaban dan Kerinduan', 'Coast of Answers and Longing')}</b></span><span class="big unknown">—:—</span></li>`;
    $('#worldList').innerHTML = html;
  };
  const TRILLION = 1e12, YEARS = TRILLION / (365.2425 * 864e2);
  let born = PREVIEW ? null : +store.get('seconds:born', 0) || null;
  const renderTimer = () => {
    const started = S.timerAt != null, gone = started ? Math.max(0, (elapsed() - S.timerAt) / 1000) : 0;
    $('#timerLeft').textContent = num(TRILLION - Math.floor(gone));
    $('#timerSub').textContent = started ? t(`±${num(YEARS)} tahun lagi · berjalan bersama stopwatch`, `About ${num(YEARS)} years to go · running with the stopwatch`) : t(`±${num(YEARS)} tahun · belum dimulai`, `About ${num(YEARS)} years · not started`);
    if (!born) { $('#lived').textContent = ''; return; }
    const secs = Math.max(0, (Date.now() - new Date(born, 6, 1).getTime()) / 1000), pct = (secs / TRILLION * 100).toLocaleString(LOCALE, { maximumFractionDigits: 3 });
    $('#lived').innerHTML = t(`Detikmu sejauh ini: <b>±${num(secs)}</b>. Baru ${pct}% dari satu triliun.`, `Your seconds so far: <b>about ${num(secs)}</b>. Only ${pct}% of a trillion.`);
  };
  if (born) $('#born').value = born;
  $('#born').addEventListener('input', e => { const y = +e.target.value.replace(/\D/g, ''), now = new Date().getFullYear(); born = y >= 1900 && y <= now ? y : null; store.set('seconds:born', born); renderTimer(); });

  // Tab dan notifikasi
  const TITLES = { world: t('Jam Dunia', 'World Clock'), alarm: t('Alarm', 'Alarms'), stopwatch: 'Stopwatch', timer: t('Timer', 'Timers') };
  let tab = 'stopwatch';
  const setBadge = (name, on) => { const b = $(`[data-tab="${name}"] .badge`); if (b) b.hidden = !on; };
  const showTab = name => {
    tab = name;
    $$('.tabbar [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $$('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + name; });
    $('#topTitle').textContent = name === 'stopwatch' && S.shown ? title : TITLES[name]; $('#topTitle').classList.toggle('poem', name === 'stopwatch' && S.shown > 0);
    if (S.seen[name] === false) { S.seen[name] = true; setBadge(name, false); save(); }
    if (name === 'world') renderWorld(); if (name === 'timer') renderTimer();
    scrollTo({ top: 0, behavior: 'instant' });
  };
  $$('.tabbar [data-tab]').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
  let bannerT = 0;
  const banner = (title, text, onTap) => {
    const el = $('#banner');
    el.innerHTML = `<span class="app-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 3h4"/></svg></span><span><small>${t('Jam', 'Clock')}</small><b>${esc(title)}</b><br>${esc(text)}</span>`;
    el.hidden = false; el.onclick = () => { el.hidden = true; onTap?.(); };
    clearTimeout(bannerT); bannerT = setTimeout(() => { el.hidden = true; }, 5200);
  };
  const notifyTab = (key, title, text) => { if (S.seen[key] !== undefined) return; S.seen[key] = false; setBadge(key, true); banner(title, text, () => showTab(key)); };

  // Tombol
  const render = () => {
    const last = S.shown >= TOTAL, lap = $('#lapBtn'), start = $('#startBtn');
    if (running) {
      lap.textContent = t('Putaran', 'Lap'); lap.disabled = last; start.textContent = t('Berhenti', 'Stop'); start.className = 'round red'; start.disabled = false;
    } else {
      const fresh = S.acc === 0 && !S.shown;
      lap.textContent = fresh ? t('Putaran', 'Lap') : t('Atur Ulang', 'Reset'); lap.disabled = fresh;
      start.textContent = fresh ? t('Mulai', 'Start') : t('Lanjut', 'Resume'); start.className = 'round green'; start.disabled = S.finished;
    }
    start.classList.toggle('cue', running && last);
    $('#hint').textContent = S.finished ? t(`Berhenti di ${fmt(S.acc)}.`, `Stopped at ${fmt(S.acc)}.`)
      : !S.shown ? t('Tekan Mulai.', 'Press Start.')
      : !running ? t('Dijeda.', 'Paused.')
      : last ? '' : t('Putaran membuka bait berikutnya.', 'Lap opens the next stanza.');
    root.toggleAttribute('data-still', S.finished); root.toggleAttribute('data-started', S.shown > 0);
    $('#topTitle').textContent = tab === 'stopwatch' && S.shown ? title : TITLES[tab]; $('#topTitle').classList.toggle('poem', tab === 'stopwatch' && S.shown > 0);
    renderLaps(); renderEntity(); drawDial(elapsed()); $('#digital').textContent = fmt(elapsed());
    const end = $('#end'); end.hidden = !S.finished;
    end.innerHTML = S.finished ? `<p>${t('Selesai.', 'The end.')}</p><a href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button type="button" id="again">${t('Atur ulang dan baca lagi', 'Reset and read again')}</button>` : '';
    $('#again')?.addEventListener('click', reset);
  };
  const frame = () => {
    raf = 0; const ms = elapsed();
    $('#digital').textContent = fmt(ms); drawDial(ms);
    const cur = $('#laps .lap[data-open] .time'); if (cur && S.shown && !S.finished) cur.textContent = fmt(ms - S.lapStart);
    if ($('#entity')) $('#entityTime').textContent = fmt(ms);
    if (tab === 'timer') renderTimer();
    if (running) raf = requestAnimationFrame(frame);
  };
  const stage = () => {
    const s = S.shown - 1;
    if (AT.coast >= 0 && s === AT.coast) notifyTab('world', t('Jam Dunia', 'World Clock'), t('Satu kota ditambahkan: Pantai Jawaban dan Kerinduan.', 'A city was added: Coast of Answers and Longing.'));
    if (AT.trillions >= 0 && s === AT.trillions) { if (S.timerAt == null) S.timerAt = elapsed(); notifyTab('timer', 'Timer', t('1 triliun detik dimulai.', '1 trillion seconds started.')); }
    if (AT.meet >= 0 && s === AT.meet && S.seen.entity === undefined) { S.seen.entity = true; banner(t('Stopwatch lain di dekatmu', 'Another stopwatch nearby'), t('Entitas · sedang berjalan', 'Entity · running')); }
    save();
  };
  const begin = () => { running = true; runStart = Date.now(); if (!raf) raf = requestAnimationFrame(frame); };
  const pause = () => { S.acc = elapsed(); running = false; };
  const finish = () => { if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); } };
  $('#startBtn').onclick = () => {
    if (running) {
      pause();
      // "And so, once again, I stopped thinking." Berhenti di bait terakhir menutup puisinya.
      if (S.shown >= TOTAL && !S.finished) { S.finished = true; finish(); $('#announcement').textContent = t('Berhenti berpikir.', 'Stopped thinking.'); }
    } else {
      if (S.finished) return;
      if (!S.shown) { S.shown = 1; S.lapStart = 0; }
      begin();
    }
    save(); render(); stage(); frame();
  };
  $('#lapBtn').onclick = () => {
    if (!running) { reset(); return; }
    if (S.shown >= TOTAL) return;
    const ms = elapsed(); S.laps.push(ms - S.lapStart); S.lapStart = ms; S.shown++;
    save(); render(); stage(); frame();
    $('#announcement').textContent = t(`Putaran ${S.shown}.`, `Lap ${S.shown}.`);
  };
  function reset() {
    running = false; const seen = { ...S.seen }; delete seen.entity; S = blank(); S.seen = seen; save(); render(); frame();
  }

  // Tautan #baca-N dari situs utama: bait sebelumnya dianggap dilewati.
  const follow = () => {
    const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (!m) return;
    const s = clamp(m[1] != null ? +m[1] : 0, 0, TOTAL - 1);
    if (S.shown < s + 1 && !S.finished) { const ms = elapsed(); while (S.laps.length < s) S.laps.push(null); S.shown = s + 1; S.lapStart = ms; render(); stage(); }
    showTab('stopwatch');
    requestAnimationFrame(() => document.querySelector(`.lap[data-s="${s}"]`)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  };
  addEventListener('hashchange', follow);

  let size = clamp(+object(store.get('rd', {})).size || (innerWidth <= 420 ? 19 : 20), 16, 28);
  const setSize = d => { size = clamp(size + d, 16, 28); root.style.setProperty('--size', size + 'px'); store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 28; };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { if (running) pause(); save(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => $('#settingsDialog').showModal();
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  addEventListener('scroll', () => root.toggleAttribute('data-scrolled', scrollY > 40), { passive: true });
  setInterval(() => { if (running) save(); if (tab === 'world') renderWorld(); }, 3000);
  // pergi dari halaman menjeda stopwatch; pembaca melanjutkannya sendiri
  addEventListener('pagehide', () => { if (running) pause(); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  Object.entries(S.seen).forEach(([k, v]) => { if (v === false) setBadge(k, true); });
  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  render(); frame(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
