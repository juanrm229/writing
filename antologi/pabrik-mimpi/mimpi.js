/* Kalender Pak Wangsa: Pabrik Mimpi dibaca sebagai jadwal empat puluh tahun.
   Naskah dimuat utuh dari content/works.json; acara, tanggal, dan foto temuan adalah bingkainya. */
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
  const plain = s => String(s).replace(/\*/g, '');
  const count = s => (plain(s).match(/\S+/g) || []).length;
  const qs = new URLSearchParams(location.search), EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const LANG = EN ? 'en' : 'id', L = EN ? 1 : 0, t = (id, en) => EN ? en : id, pick = v => Array.isArray(v) ? v[L] : v;
  const SLUG = 'pabrik-mimpi', PREVIEW = qs.has('preview'), root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const K = window.MimpiKalender || { CALENDARS: {}, EVENTS: [], PHOTOS: [], QUOTES: {}, FIRST_YEAR: 1985, LAST_YEAR: 2024 };
  root.lang = LANG;
  const LOCALE = EN ? 'en-GB' : 'id-ID';
  const labels = {
    sideBackLabel: ['Meja tulis', 'Writing desk'], appName: ['Kalender', 'Calendar'], calsLabel: ['Kalender saya', 'My calendars'], ownerName: ['Pak Wangsa', 'Mr. Wangsa'],
    ownerNote: ['Perajin mimpi · stasiun paling ujung', 'Dream crafter · the end station'], todayLabel: ['Hari ini', 'Today'], viewChip: ['Jadwal', 'Schedule'], coverBackLabel: ['Meja tulis', 'Writing desk'],
    sideYears: ['Tampilan tahun · 1985–2025', 'Year view · 1985–2025'], yearsKicker: ['Tampilan tahun', 'Year view'],
    coverKicker: ['Kalender Pak Wangsa', "Mr. Wangsa's calendar"], coverNote: ['Empat puluh tahun shift malam. Satu acara yang selalu dijadwalkan ulang.', 'Forty years of night shifts. One event that was always rescheduled.'],
    resume: ['Lanjutkan', 'Continue'], settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'],
    themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language'], lightboxTitle: ['Lampiran', 'Attachment']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['menu', t('Buka menu kalender', 'Open the calendar menu')], ['coverBack', t('Kembali ke meja tulis', 'Back to the writing desk')], ['today', t('Hari ini', 'Today')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = dark ? '#111317' : '#ffffff';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('mimpi:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('mimpi:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const calm = () => root.hasAttribute('data-calm');
  const buzz = pattern => { if (!calm()) try { navigator.vibrate?.(pattern); } catch (_) {} };

  // Naskah
  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  // judul tab mengikuti pola situs utama: judul tulisan · nama situs
  let siteName = 'Quiet Margins', workTitle = '';
  const setTitle = name => { if (name) siteName = name; if (workTitle) document.title = workTitle + ' · ' + siteName; };
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.theme) { siteTheme = s.theme; applyTheme(); } if (s?.title) setTitle(s.title); }).catch(() => {});
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#story').innerHTML = `<p class="loading">${t('Naskah belum bisa dimuat.', 'The story could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; return; }
  const body = EN && Array.isArray(work.en?.body) && work.en.body.length ? work.en.body : work.body;
  const title = EN ? work.en?.title || work.title : work.title;
  workTitle = title; setTitle(); $('#coverTitle').textContent = title;
  const findP = m => body.findIndex(p => p.includes(m[L]));
  const quoteIn = m => { const p = body[findP(m)] || ''; const q = [...plain(p).matchAll(/["“]([^"”]+)["”]/g)].map(x => x[1]); return q.at(-1) || ''; };
  const EVENTS = K.EVENTS.map(e => ({ ...e, p: findP(e.start) })).filter(e => e.p >= 0).sort((a, b) => a.p - b.p);
  // Tanpa data kalender, seluruh cerita tetap terbaca sebagai satu acara.
  if (!EVENTS.length || EVENTS[0].p > 0) EVENTS.unshift({ id: 'all', p: 0, date: '1985-02-04', time: ['22.00', '10 PM'], title: [title, title], cal: 'shift' });
  const PHOTOS = K.PHOTOS.map(ph => ({ ...ph, p: findP(ph.after) })).filter(ph => ph.p >= 0);
  const inviteTitle = quoteIn(K.QUOTES.invite || ['', '']);
  const lilaReply = quoteIn(K.QUOTES.reply || ['', '']);
  const postpone = plain(K.QUOTES.postpone ? K.QUOTES.postpone[L] : '');
  const gateReason = (() => { const g = K.QUOTES.gate?.[L]; if (!g) return ''; const p = plain(body[findP([K.QUOTES.gate[0][0], K.QUOTES.gate[1][0]])] || ''), a = p.indexOf(g[0]), b = p.indexOf(g[1], a); return a < 0 || b < 0 ? '' : p.slice(a, b) + '.'; })();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Tanggal
  const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = (date, o) => date.toLocaleDateString(LOCALE, o);
  const dayLong = date => fmt(date, { day: 'numeric', month: 'long', year: 'numeric' });
  const monthTitle = date => { const s = fmt(date, { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };

  // Penyimpanan
  let places = PREVIEW ? {} : object(store.get('mimpi:places', {}));
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let rsvp = PREVIEW ? null : store.get('mimpi:rsvp', null);
  const seenToasts = new Set();

  // Kalender di sisi kiri
  const calColor = c => K.CALENDARS[c]?.color || '#888';
  const renderCals = shared => {
    $('#calList').innerHTML = Object.entries(K.CALENDARS).filter(([k]) => k !== 'lila' || shared).map(([k, c]) => `<li data-cal="${k}"><span class="swatch" style="--c:${c.color}"></span>${esc(pick(c.name))}</li>`).join('');
  };
  let miniKey = '';
  const renderMini = date => {
    const key = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(); if (key === miniKey) return; miniKey = key;
    $('#miniTitle').textContent = monthTitle(date);
    const first = new Date(date.getFullYear(), date.getMonth(), 1), offset = (first.getDay() + 6) % 7, days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const names = Array.from({ length: 7 }, (_, i) => fmt(new Date(2024, 0, 1 + i), { weekday: 'narrow' }));
    $('#miniGrid').innerHTML = names.map(n => `<b>${n}</b>`).join('') + Array.from({ length: offset }, () => '<i></i>').join('') + Array.from({ length: days }, (_, i) => `<span${i + 1 === date.getDate() ? ' class="on"' : ''}>${i + 1}</span>`).join('');
    $('#appIconDay').textContent = String(date.getDate());
    renderWeek(date);
  };
  // Pita minggu di ponsel: tujuh hari di sekitar acara yang sedang dibaca.
  const dayColor = new Map(); K.EVENTS.forEach(e => { if (!e.empty && !dayColor.has(e.date)) dayColor.set(e.date, calColor(e.cal)); });
  const renderWeek = date => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7);
    $('#week').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), c = dayColor.get(iso(d)), on = d.getTime() === date.getTime();
      return `<span class="${on ? 'on' : ''}"${c ? ` style="--c:${c}"` : ''}><small>${esc(fmt(d, { weekday: 'narrow' }))}</small><b>${d.getDate()}</b>${c ? '<i></i>' : ''}</span>`;
    }).join('');
    if (!calm()) { const w = $('#week'); w.classList.remove('turn'); void w.offsetWidth; w.classList.add('turn'); }
  };

  // Jadwal
  const paragraph = i => body[i].trim() === '***' ? '<hr class="pause">' : `<p class="passage" id="p-${i}" data-p="${i}">${inline(body[i])}</p>`;
  const footage = (ph, n, big = false) => `<button class="footage-open" type="button" data-photo="${n}" aria-label="${t('Buka lampiran foto: ', 'Open photo attachment: ')}${esc(pick(ph.alt))}"><img src="photos/${ph.file}" alt="${esc(pick(ph.alt))}" width="1536" height="1024" loading="${big ? 'eager' : 'lazy'}" decoding="async"><span class="rec" aria-hidden="true">● REC</span><span class="stamp" aria-hidden="true">${ph.stamp}</span><span class="grain" aria-hidden="true"></span></button>`;
  const attachment = (ph, n) => `<figure class="footage">${footage(ph, n)}<figcaption><span aria-hidden="true">📎</span> ${t('foto_temuan', 'found_footage')}_${String(n + 1).padStart(2, '0')}.webp · ${t('ditambahkan', 'added')} ${ph.stamp.slice(0, 10)}</figcaption></figure>`;
  const years = () => K.LAST_YEAR - K.FIRST_YEAR;
  const reschedule = () => `<section class="resched" aria-labelledby="reschedTitle">
      <p class="resched-head" id="reschedTitle">${t('Riwayat jadwal ulang', 'Reschedule history')}</p>
      <div class="resched-card" id="reschedCard"><span class="rc-date" id="rcDate"></span><span class="rc-title">${t('Malam terakhir sebelum libur', 'The last night before the holiday')}</span><button class="rc-task" id="rcTask" type="button" aria-describedby="rcGate"><span class="box" aria-hidden="true"></span>${t('Bawa pulang mimpi', 'Take the dream home')}</button><span class="rc-stamp" aria-hidden="true">↻</span><span class="rc-hint" aria-hidden="true">${t('geser untuk menunda', 'swipe to put off')} →</span></div>
      <p class="rc-gate" id="rcGate" hidden></p>
      <label class="sr-only" for="years">${t('Tahun', 'Year')}</label><input type="range" id="years" min="${K.FIRST_YEAR}" max="${K.LAST_YEAR - 1}" value="${K.FIRST_YEAR}">
      <div class="resched-foot"><p class="rc-log" id="rcLog" aria-live="polite"></p><button class="secondary small" id="playYears" type="button">${t('Putar empat puluh tahun', 'Play forty years')}</button></div>
    </section>`;
  const eventHead = (e, i) => {
    const c = calColor(e.cal), meta = [e.repeat && `↻ ${esc(pick(e.repeat))}`, e.place && `⌖ ${esc(pick(e.place))}`, e.tag && `<span class="tag">${esc(pick(e.tag))}</span>`].filter(Boolean).join('<span class="dot">·</span>');
    if (e.invite) return `<header class="event-head invite-head"><span class="badge">${t('Undangan', 'Invitation')}</span><span class="time">${esc(pick(e.time))}</span><h3>${esc(inviteTitle)}</h3><p class="meta">${t('Dari', 'From')} <b>Lila</b><span class="dot">·</span>⌖ ${esc(pick(e.place))}</p><p class="guests"><span class="faces" aria-hidden="true">${'<i></i>'.repeat(7)}</span>${esc(pick(e.guests))}</p></header>`;
    if (e.live) return `<header class="event-head"><span class="badge live" id="liveBadge">● ${t('Sedang berlangsung', 'Happening now')}</span><span class="time">${esc(pick(e.time))} <span class="mono" id="liveTimer"></span></span><h3>${esc(inviteTitle)}</h3><p class="meta">⌖ ${esc(pick(e.place))}</p></header>`;
    return `<header class="event-head"><span class="time">${esc(pick(e.time))}</span><h3>${esc(pick(e.title))}</h3>${meta ? `<p class="meta">${meta}</p>` : ''}${e.task ? `<p class="task" data-task="${e.id}"><span class="box" aria-hidden="true"></span>${esc(pick(e.task))}</p>` : ''}${e.taskState ? `<p class="task undone"><span class="box" aria-hidden="true"></span>${t('Bawa pulang mimpi', 'Take the dream home')} · <b>${esc(pick(e.taskState))}</b></p>` : ''}</header>`;
  };
  const SEATS = 96;
  const build = () => {
    let html = '';
    EVENTS.forEach((e, n) => {
      const end = n + 1 < EVENTS.length ? EVENTS[n + 1].p : body.length, date = D(e.date);
      let inner = '';
      for (let i = e.p; i < end; i++) {
        inner += paragraph(i);
        PHOTOS.forEach((ph, k) => { if (ph.p === i) inner += attachment(ph, k); });
        if (e.reschedule && findP(e.reschedule) === i) inner += reschedule();
        if (e.moved && findP(e.moved) === i) inner += `<p class="moved"><span>↻</span>${t('Dipindahkan ke 30 Des ' + (K.LAST_YEAR + 1), 'Moved to 30 Dec ' + (K.LAST_YEAR + 1))} · <b>${esc(postpone)}</b> · ${t('untuk ke-40 kalinya', 'for the 40th time')}</p>`;
      }
      if (e.invite) inner += `<div class="rsvp" id="rsvp"><p class="rsvp-q">${t('Hadir?', 'Going?')}</p><div class="rsvp-buttons" role="group" aria-label="${t('Jawab undangan', 'Reply to the invitation')}"><button type="button" data-rsvp="hadir">${t('Hadir', 'Yes')}</button><button type="button" data-rsvp="mungkin">${t('Mungkin', 'Maybe')}</button><button type="button" data-rsvp="tidak">${t('Tidak', 'No')}</button></div><p class="lila-reply" id="lilaReply" hidden><span class="avatar small" aria-hidden="true">L</span><span><b>Lila</b>${esc(lilaReply)}</span></p></div>`;
      if (e.empty) {
        const months = Array.from({ length: 12 }, (_, m) => `<li><span>${esc(fmt(new Date(2025, m, 1), { month: 'short' }))}</span><i></i><small>${t('Tidak ada acara', 'No events')}</small></li>`).join('');
        html += `<section class="day empty-year" data-event="${e.id}" data-date="${e.date}"><p class="date-line"><b>2025</b> ${t('Satu tahun', 'One year')}</p><div class="date-col"><span class="dnum">2025</span></div><div class="empty-body"><ul class="months">${months}</ul>${inner}</div></section>`;
        return;
      }
      const lock = e.live && rsvp !== 'hadir' ? ' hidden' : '';
      const dateLine = EVENTS[n - 1]?.date === e.date ? '' : `<p class="date-line"><b>${esc(fmt(date, { weekday: 'long' }))}</b> ${esc(dayLong(date))}</p>`;
      const hall = e.live ? `<div class="hall" id="hall" data-state="dark"><div class="stage" aria-hidden="true"><i></i></div><div class="seats" aria-hidden="true">${'<i></i>'.repeat(SEATS)}</div><p class="hall-status" id="hallStatus" aria-live="polite"></p></div>` : '';
      html += `<section class="day" data-event="${e.id}" data-date="${e.date}"${lock}>${dateLine}<div class="date-col"><span class="dow">${esc(fmt(date, { weekday: 'short' }))}</span><span class="dnum">${date.getDate()}</span><span class="mon">${esc(fmt(date, { month: 'short', year: 'numeric' }))}</span></div><article class="event${e.invite ? ' invite' : ''}${e.live ? ' live' : ''}" style="--c:${calColor(e.cal)}">${eventHead(e)}<div class="desc">${inner}</div>${hall}</article></section>`;
    });
    const now = new Date();
    html += `<section class="day closing" id="closing"${rsvp !== 'hadir' ? ' hidden' : ''}><p class="date-line"><b>${t('Hari ini', 'Today')}</b> ${esc(dayLong(now))}</p><div class="date-col"><span class="dow">${esc(fmt(now, { weekday: 'short' }))}</span><span class="dnum">${now.getDate()}</span><span class="mon">${esc(fmt(now, { month: 'short', year: 'numeric' }))}</span></div><article class="event" style="--c:${calColor('pribadi')}"><header class="event-head"><span class="badge today-badge">${t('Hari ini', 'Today')}</span><h3>${t('Malam terakhir sebelum libur', 'The last night before the holiday')}</h3><p class="task done"><span class="box" aria-hidden="true"></span>${t('Terjadi · dengan mata terbuka', 'Happened · with open eyes')}</p><p class="meta">${t('Tidak dijadwalkan ulang lagi.', 'Never rescheduled again.')}</p></header><div class="end-links"><a class="secondary small" href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button class="secondary small" id="readAgain" type="button">${t('Kembali ke 1985', 'Back to 1985')}</button></div></article></section>`;
    $('#story').innerHTML = html;
  };
  build();
  renderCals(false);

  // Jadwal ulang empat puluh tahun
  const setYear = (y, animate) => {
    const card = $('#reschedCard'); if (!card) return;
    $('#years').value = y;
    $('#rcDate').textContent = dayLong(new Date(y, 11, 30));
    const n = y - K.FIRST_YEAR + 1;
    $('#rcLog').innerHTML = `${t('Dipindahkan ke', 'Moved to')} ${esc(dayLong(new Date(y + 1, 11, 30)))} · <b>${esc(postpone)}</b> · ${n}${t('×', '×')}`;
    $('#years').setAttribute('aria-valuetext', `${y} · ${n}${t(' kali dijadwalkan ulang', ' reschedules')}`);
    if (animate && !calm()) { card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip'); }
  };
  let playing = 0;
  const play = () => {
    clearInterval(playing); let y = K.FIRST_YEAR; setYear(y, true);
    if (calm()) { setYear(K.LAST_YEAR - 1, false); return; }
    playing = setInterval(() => { y++; if (y > K.LAST_YEAR - 1) { clearInterval(playing); return; } setYear(y, true); }, 110);
  };
  // Menunda satu tahun: geser kartunya, atau coba centang tugasnya.
  const postponeOne = () => {
    clearInterval(playing); const y = +$('#years').value;
    if (y >= K.LAST_YEAR - 1) { const c = $('#reschedCard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); return false; }
    setYear(y + 1, true); buzz(12); return true;
  };
  const card = $('#reschedCard');
  if (card) {
    setYear(K.FIRST_YEAR, false);
    $('#years').oninput = () => { clearInterval(playing); setYear(+$('#years').value, true); };
    $('#playYears').onclick = play;
    $('#rcTask').onclick = e => {
      e.stopPropagation(); const box = $('#rcTask'); box.classList.remove('refuse'); void box.offsetWidth; box.classList.add('refuse');
      if (gateReason) { $('#rcGate').textContent = gateReason; $('#rcGate').hidden = false; }
      buzz([20, 40, 20]); setTimeout(postponeOne, calm() ? 0 : 650);
    };
    let sx = null, dx = 0;
    const reset = () => { sx = null; card.classList.remove('drag'); ['--dx', '--rot', '--o'].forEach(v => card.style.removeProperty(v)); };
    card.addEventListener('pointerdown', e => { if (e.target.closest('button') || e.button > 0) return; sx = e.clientX; dx = 0; card.classList.add('drag'); card.setPointerCapture?.(e.pointerId); });
    card.addEventListener('pointermove', e => { if (sx == null) return; dx = clamp(e.clientX - sx, 0, 160); card.style.setProperty('--dx', dx + 'px'); card.style.setProperty('--rot', dx / 60 + 'deg'); card.style.setProperty('--o', 1 - dx / 320); });
    card.addEventListener('pointerup', () => { if (sx == null) return; const go = dx > 64; reset(); if (go) postponeOne(); });
    card.addEventListener('pointercancel', reset);
  }

  // Undangan
  const answer = value => {
    document.querySelectorAll('[data-rsvp]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rsvp === value)));
    if (value !== 'hadir') { $('#lilaReply').hidden = false; $('#lilaReply').classList.remove('arrive'); void $('#lilaReply').offsetWidth; $('#lilaReply').classList.add('arrive'); return; }
    buzz(18); rsvp = 'hadir'; if (!PREVIEW) store.set('mimpi:rsvp', 'hadir'); if (!PREVIEW) store.set('mimpi:rsvpAt', Date.now());
    $('#lilaReply').hidden = true;
    document.querySelectorAll('[data-event="live"], #closing').forEach(s => { s.hidden = false; });
    measure(); toast('live', t('Sedang berlangsung · lantai produksi', 'Happening now · production floor'));
    const live = $('[data-event="live"]'); live.scrollIntoView({ behavior: calm() ? 'instant' : 'smooth', block: 'start' });
    $('#announcement').textContent = t('Kamu hadir. Acara sedang berlangsung.', 'You are going. The event is happening now.');
  };
  document.querySelectorAll('[data-rsvp]').forEach(b => { b.setAttribute('aria-pressed', String(rsvp === b.dataset.rsvp)); b.onclick = () => answer(b.dataset.rsvp); });
  const tickLive = () => {
    const el = $('#liveTimer'); if (!el || rsvp !== 'hadir') return;
    const at = PREVIEW ? Date.now() : +store.get('mimpi:rsvpAt', Date.now()), s = Math.max(0, Math.floor((Date.now() - at) / 1000));
    el.textContent = `· ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  setInterval(tickLive, 1000); tickLive();

  // Foto temuan
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-photo]'); if (!b || b.closest('#lightbox')) return;
    const ph = PHOTOS[+b.dataset.photo];
    $('#lightboxFigure').innerHTML = footage(ph, +b.dataset.photo, true) + `<figcaption>${esc(pick(ph.alt))}</figcaption>`;
    $('#lightbox').showModal();
  });

  // Pengingat
  let toastTimer = 0;
  const hideToast = () => { clearTimeout(toastTimer); $('#toast').hidden = true; };
  const toast = (key, text) => {
    if (seenToasts.has(key)) return; seenToasts.add(key);
    const [head, ...rest] = text.split(' · '), el = $('#toast');
    el.innerHTML = `<span class="toast-icon" aria-hidden="true"><b>${new Date().getDate()}</b></span><span class="toast-body"><small>${t('Kalender', 'Calendar')} · ${t('sekarang', 'now')}</small><b>${esc(head)}</b>${rest.length ? `<span>${esc(rest.join(' · '))}</span>` : ''}</span>`;
    el.hidden = false; el.style.removeProperty('--dy'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); buzz(10);
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 5200);
  };
  { // Spanduk bisa disentuh atau diusap ke atas untuk ditutup.
    const el = $('#toast'); let sy = null, dy = 0;
    el.addEventListener('pointerdown', e => { sy = e.clientY; dy = 0; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', e => { if (sy == null) return; dy = Math.min(0, e.clientY - sy); el.style.setProperty('--dy', dy + 'px'); });
    el.addEventListener('pointerup', () => { if (sy == null) return; sy = null; el.style.removeProperty('--dy'); hideToast(); });
    el.addEventListener('pointercancel', () => { sy = null; el.style.removeProperty('--dy'); });
  }
  const TOASTS = {
    annual: [t('Pengingat · Malam terakhir sebelum libur', 'Reminder · The last night before the holiday'), t('Setiap tahun · 30 Des', 'Every year · 30 Dec')],
    archive: [t('Lila membagikan kalender denganmu', 'Lila shared a calendar with you'), t('“Arsip pesanan”', '“Order archive”')],
    invite: [t('Undangan baru dari Lila', 'New invitation from Lila'), t('30 Des · 22.00', '30 Dec · 10 PM')]
  };

  // Ruangan yang berdiri: kursi di acara terakhir ikut cerita.
  const STAND = Object.fromEntries(Object.entries(K.STAND || {}).map(([k, m]) => [k, findP(m)]));
  const seatOrder = (() => {
    const cols = 24, first = 11; // kursi barisan depan, sedikit di kiri tengah
    return Array.from({ length: SEATS }, (_, i) => i).sort((a, b) => Math.hypot(a % cols - first, (a / cols | 0) * 1.6) - Math.hypot(b % cols - first, (b / cols | 0) * 1.6));
  })();
  const HALL = {
    dark: t('Lantai produksi · ban berjalan dimatikan', 'Production floor · conveyor belts off'),
    seated: t('Ratusan kursi · semuanya terisi', 'Hundreds of chairs · all taken'),
    first: t('Satu orang berdiri · barisan depan', 'One person standing · front row'),
    clap: t('Satu orang bertepuk tangan', 'One person clapping'),
    wave: t('Yang di sebelahnya berdiri…', 'The next one stands…'),
    all: t('Seluruh ruangan berdiri', 'The whole room is standing')
  };
  let hallState = '', hallLit = -1;
  const hallFrame = place => {
    const hall = $('#hall'); if (!hall || hall.closest('[hidden]') || STAND.all == null || STAND.all < 0) return;
    const p = place ? place.paragraph : -1;
    let state = 'dark', lit = 0;
    if (p >= STAND.chairs) state = 'seated';
    if (p >= STAND.first) { state = 'first'; lit = 1; }
    if (p >= STAND.clap) state = 'clap';
    if (p === STAND.all) { state = 'wave'; lit = clamp(Math.round(place.offset * 1.4 * SEATS), 2, SEATS); }
    if (p > STAND.all || (p === STAND.all && lit >= SEATS)) { state = 'all'; lit = SEATS; }
    if (lit !== hallLit) { const seats = hall.querySelectorAll('.seats i'); seatOrder.forEach((s, k) => seats[s].classList.toggle('up', k < lit)); hallLit = lit; }
    if (state !== hallState) {
      if (hallState && (state === 'clap' || state === 'all')) buzz(state === 'all' ? [10, 50, 10, 50, 10, 50, 10] : [10, 70, 10]);
      hallState = state; hall.dataset.state = state; $('#hallStatus').textContent = HALL[state];
    }
  };

  // Tampilan tahun: empat puluh satu ubin, satu titik 30 Desember di setiap tahun.
  let reached = PREVIEW ? -1 : +(places[LANG]?.paragraph ?? -1);
  const evP = id => EVENTS.find(e => e.id === id)?.p ?? Infinity;
  const reschedP = (() => { const a = K.EVENTS.find(e => e.reschedule); return a ? findP(a.reschedule) : Infinity; })();
  const yearState = y => {
    if (y === K.LAST_YEAR + 1) return reached < evP('invite') ? '' : rsvp === 'hadir' ? 'done' : 'invite';
    if (y === K.LAST_YEAR) return reached >= evP('gate') ? 'cancel' : 'planned';
    return reached >= reschedP || (y === K.FIRST_YEAR && reached >= evP('annual')) ? 'moved' : 'planned';
  };
  const renderYears = () => {
    const nights = Math.round((D('2024-12-31') - D('1985-02-04')) / 864e5), num = n => n.toLocaleString(LOCALE);
    const stats = [[num(nights), t('malam sejak shift pertama', 'nights since the first shift')], [reached >= reschedP ? '40' : '…', t('kali “Tahun depan, mungkin.”', 'times “Next year, perhaps.”')], ['0', t('mimpi dibawa pulang', 'dreams taken home')]];
    if (rsvp === 'hadir') stats.push(['1', t('malam yang terjadi', 'night that happened')]);
    $('#yearsStats').innerHTML = stats.map(([n, l]) => `<div><dt>${n}</dt><dd>${esc(l)}</dd></div>`).join('');
    const here = (() => { const e = current >= 0 ? eventAt(current) : null; if (!e) return -1; if (e.reschedule && $('#years')) return +$('#years').value; return D(e.date).getFullYear(); })();
    const label = { planned: t('dijadwalkan', 'scheduled'), moved: t('dijadwalkan ulang', 'rescheduled'), cancel: t('tidak dibawa pulang', 'not taken home'), invite: t('undangan dari Lila', 'invitation from Lila'), done: t('terjadi', 'happened'), '': t('tidak ada acara', 'no events') };
    let html = '';
    for (let y = K.FIRST_YEAR; y <= K.LAST_YEAR + 1; y++) {
      const st = yearState(y), last = y === K.LAST_YEAR + 1, lila = last && reached >= evP('archive');
      const bars = Array.from({ length: 12 }, (_, m) => `<i class="${last ? (lila ? 'lila' : '') : (y === K.FIRST_YEAR && m === 0 ? '' : 'on')}"></i>`).join('');
      html += `<li><button type="button" class="yr${y === here ? ' here' : ''}${last ? ' after' : ''}" data-year="${y}" aria-label="${y} · ${esc(label[st])}"><b>${y}</b><span class="bars" aria-hidden="true">${bars}</span><span class="dec s-${st}" aria-hidden="true"></span></button></li>`;
    }
    $('#yearsGrid').innerHTML = html;
    $('#yearsLegend').innerHTML = [['planned', label.planned], ['moved', label.moved], ['cancel', label.cancel], ['done', label.done]].map(([k, l]) => `<span><span class="dec s-${k}" aria-hidden="true"></span>${esc(l)}</span>`).join('') + `<span class="legend-note">${t('Titik: 30 Desember', 'Dot: 30 December')}</span>`;
  };
  const openYears = () => { setDrawer(false); persist(); renderYears(); $('#yearsDialog').showModal(); $('#yearsGrid .here')?.focus(); };
  ['#monthButton', '#viewChip', '#sideYears'].forEach(id => { $(id).onclick = openYears; });
  $('#yearsGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-year]'); if (!b) return; const y = +b.dataset.year;
    $('#yearsDialog').close();
    if (y === K.FIRST_YEAR) goTo(evP('annual'));
    else if (y < K.LAST_YEAR) { goTo(reschedP); setYear(y, true); $('.resched')?.scrollIntoView({ block: 'center', behavior: 'instant' }); frame(); }
    else if (y === K.LAST_YEAR) goTo(evP('lila'));
    else goTo(evP('empty'));
  });

  // Laci kalender di ponsel
  const narrow = matchMedia('(max-width: 900px)'), sidebar = $('#sidebar');
  const setDrawer = open => {
    const on = !!open && narrow.matches;
    root.toggleAttribute('data-drawer', on); $('#menu').setAttribute('aria-expanded', String(on)); $('#scrim').hidden = !on;
    sidebar.inert = narrow.matches && !on;
    if (on) sidebar.focus({ preventScroll: true });
  };
  $('#menu').onclick = () => setDrawer(!root.hasAttribute('data-drawer'));
  $('#scrim').onclick = () => { setDrawer(false); $('#menu').focus(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.hasAttribute('data-drawer')) { setDrawer(false); $('#menu').focus(); } });
  narrow.addEventListener('change', () => setDrawer(false));
  { let sx = null; sidebar.addEventListener('pointerdown', e => { sx = e.clientX; }); sidebar.addEventListener('pointerup', e => { if (sx != null && e.clientX - sx < -60) { setDrawer(false); $('#menu').focus(); } sx = null; }); }
  setDrawer(false);
  $('#todayNum').textContent = String(new Date().getDate());

  // Membaca
  let paragraphs = [], weights = new Map(), total = 0, current = -1, latest = null, saveTimer = 0, raf = 0, lastEvent = null, sharedShown = false;
  const measure = () => {
    paragraphs = [...document.querySelectorAll('.passage')].filter(p => !p.closest('[hidden]')); total = 0; weights = new Map();
    paragraphs.forEach(p => { const w = count(body[+p.dataset.p]); weights.set(p, { before: total, words: w }); total += w; });
  };
  measure();
  const line = () => innerHeight * .45;
  const capture = () => {
    if (!paragraphs.length) return null;
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], r = p.getBoundingClientRect(), offset = clamp((l - r.top) / Math.max(1, r.height), 0, 1), w = weights.get(p);
    const all = +paragraphs.at(-1).dataset.p === body.length - 1, last = paragraphs.at(-1).getBoundingClientRect(), finished = all && found === paragraphs.length - 1 && last.bottom <= innerHeight - 30;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((w.before + offset * w.words) / Math.max(1, total), 0, 1) * (all ? 1 : .8), finished };
  };
  const persist = () => {
    if (!latest) return;
    places[LANG] = latest;
    if (!PREVIEW) { store.set('mimpi:places', places); store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +latest.progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() }); }
    if (latest.finished && !done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); }
  };
  const eventAt = p => EVENTS.filter(e => e.p <= p).at(-1) || null;
  const frame = () => {
    if ([...document.querySelectorAll('dialog')].some(d => d.open)) return;
    const place = capture(); current = place ? place.paragraph : -1; if (current > reached) reached = current;
    hallFrame(place);
    const e = current >= 0 ? eventAt(current) : null;
    root.toggleAttribute('data-reading', !!e);
    if (e) {
      const date = D(e.date); $('#monthTitle').textContent = e.empty ? '2025' : monthTitle(date); renderMini(date);
      if (e !== lastEvent) {
        if (lastEvent && e.p > lastEvent.p && EVENTS.indexOf(e) - EVENTS.indexOf(lastEvent) === 1 && TOASTS[e.id]) toast(e.id, TOASTS[e.id].join(' · '));
        lastEvent = e;
      }
      const shared = EVENTS.indexOf(e) >= EVENTS.findIndex(x => x.shared); if (shared !== sharedShown) { sharedShown = shared; renderCals(shared); }
    } else { $('#monthTitle').textContent = title; }
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latest = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    let target = null; for (let j = paragraph; j < body.length && !target; j++) { const el = document.getElementById('p-' + j); if (el && !el.closest('[hidden]')) target = el; }
    target = target || paragraphs.at(-1); if (!target) return;
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); lastEvent = eventAt(+target.dataset.p); frame();
  };
  $('#begin').textContent = t('Buka ', 'Open ') + dayLong(D(EVENTS[0]?.date || '1985-02-04'));
  $('#begin').onclick = () => goTo(0);
  $('#today').onclick = () => { const live = $('[data-event="live"]'); if (live && !live.hidden) $('#closing').scrollIntoView({ block: 'center' }); else $('[data-event="invite"]')?.scrollIntoView({ block: 'center' }); schedule(); };
  document.addEventListener('click', e => { if (e.target.closest('#readAgain')) { scrollTo({ top: 0, behavior: 'instant' }); $('#begin').focus(); } });
  const renderCover = () => { const place = places[LANG]; $('#resume').hidden = !(place && place.progress > 0 && place.progress < .99); };
  $('#resume').onclick = () => { const place = places[LANG]; goTo(place.paragraph, place.offset); };

  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = delta => { const place = delta ? capture() : null; size = clamp(size + delta, 16, 26); root.style.setProperty('--size', size + 'px'); store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26; if (place) goTo(place.paragraph, place.offset); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { persist(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = current >= 0 ? 'baca-' + current : ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  document.querySelectorAll('dialog').forEach(d => { d.addEventListener('close', schedule); d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }); });

  const follow = () => { const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (m) goTo(m[1] != null ? +m[1] : 0); else frame(); };
  addEventListener('hashchange', follow); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => { if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight]; if (latest && current >= 0) goTo(latest.paragraph, latest.offset); });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else schedule(); });
  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
  }
  renderMini(D(EVENTS[0]?.date || '1985-02-04')); renderCover(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
