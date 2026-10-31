/* Shift Malam: Pabrik Mimpi dibaca dari stasiun paling ujung. Naskah dimuat utuh dari content/works.json.
   Kapsul yang dibawa pulang larut menjelang pagi; kapsul yang diberikan tidak pernah larut. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(key, fallback) { try { const value = JSON.parse(localStorage.getItem('jm:' + key)); return value == null ? fallback : value; } catch (_) { return fallback; } },
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
  const LANG = EN ? 'en' : 'id', L = EN ? 1 : 0, t = (id, en) => EN ? en : id, pick = pair => Array.isArray(pair) ? pair[L] : pair;
  const SLUG = 'pabrik-mimpi', PREVIEW = qs.has('preview'), root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const SHIFT = window.MimpiShift || { BEATS: [], ARCHIVE: null, RULE: ['', ''] };
  root.lang = LANG;
  const labels = {
    brandName: ['Shift Malam', 'Night Shift'], homeTitle: ['Shift Malam', 'Night Shift'], cardTitle: ['Kartu absen', 'Time card'], cardNameLabel: ['Nama', 'Name'],
    cardStationLabel: ['Stasiun', 'Station'], cardStation: ['Paling ujung', 'The end station'], cardInLabel: ['Masuk', 'In'], cardOutLabel: ['Keluar', 'Out'],
    clockIn: ['Absen masuk', 'Clock in'], resume: ['Lanjutkan shift', 'Resume shift'], capsuleHint: ['Pilih sebuah kalimat untuk mengemasnya menjadi kapsul.', 'Select a sentence to package it into a capsule.'],
    pack: ['Kemas jadi kapsul', 'Package as a capsule'], pocketKicker: ['Saku', 'Pocket'], pocketTitle: ['Kapsul', 'Capsules'], settingsTitle: ['Pengaturan baca', 'Reading settings'],
    sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi pabrik', 'Factory sounds'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });
  const setView = view => { root.dataset.view = view; ['home', 'floor', 'gift'].forEach(v => { $('#' + v).hidden = v !== view; }); if (view !== 'floor') $('#pack').hidden = true; };

  // Tema mengikuti situs: pilihan pembaca (jm:theme), lalu pengaturan admin, lalu perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null, readerName = '';
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--bg').trim() || (dark ? '#0f0f14' : '#f2f1ec');
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();

  // Naskah
  let works, site = null;
  if (PREVIEW) { const p = store.get('preview', null); works = p?.works; site = p?.site; }
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  if (!PREVIEW) try { const r = await fetch('../../content/site.json', { cache: 'no-cache' }); site = r.ok ? await r.json() : null; } catch (_) {}
  if (site?.theme) { siteTheme = site.theme; applyTheme(); }
  readerName = String(site?.readerName || '').trim();
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !work.body.length) { setView('floor'); $('#story').innerHTML = `<li class="loading">${t('Naskah belum bisa dimuat.', 'The story could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></li>`; return; }
  const translated = EN && Array.isArray(work.en?.body) && work.en.body.length > 0;
  const body = translated ? work.en.body : work.body;
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · ' + t('Shift Malam', 'Night Shift');
  $('#workTitle').textContent = title; $('#sideTitle').textContent = title; $('#floorKicker').textContent = t('Shift malam · stasiun paling ujung', 'Night shift · the end station');
  const findP = marker => body.findIndex(p => p.includes(marker[L]));
  const BEATS = SHIFT.BEATS.map(b => ({ ...b, p: findP(b.find) })).filter(b => b.p >= 0);
  const beatsAt = p => BEATS.filter(b => b.p === p);
  const sentences = text => plain(text).split(/(?<=[.!?]["”]?)\s+/);
  const lastWith = (key, p) => BEATS.filter(b => b[key] != null && b.p <= p).at(-1);

  // Penyimpanan
  const capsules = PREVIEW ? [] : array(store.get('mimpi:capsules', []));
  const received = PREVIEW ? [] : array(store.get('mimpi:received', []));
  const saveCapsules = () => { if (!PREVIEW) { store.set('mimpi:capsules', capsules); store.set('mimpi:received', received); } updatePocket(); };
  let places = PREVIEW ? {} : object(store.get('mimpi:places', {}));
  let claps = PREVIEW ? 0 : +store.get('mimpi:claps', 0) || 0;
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let card = PREVIEW ? {} : object(store.get('mimpi:card', {}));
  const pad = n => String(n).padStart(2, '0');
  const clock = ms => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dawnAfter = ms => { const d = new Date(ms); const dawn = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 5, 30); if (d >= dawn) dawn.setDate(dawn.getDate() + 1); return dawn.getTime(); };
  const isNight = () => { const h = new Date().getHours(); return h >= 19 || h < 5; };
  // Kapsul yang dibawa pulang larut menjelang pagi.
  const settle = () => { let changed = false; capsules.forEach(c => { if (c.state === 'pulang' && Date.now() >= c.expires) { c.state = 'larut'; changed = true; } }); if (changed) saveCapsules(); };
  const textOf = c => { const src = c.lang === LANG ? body : (c.lang === 'en' ? work.en?.body : work.body); const p = plain(src?.[c.p] || ''); return p.slice(c.start, c.end) || c.text || ''; };

  // Bunyi: ketukan kartu absen, tepuk tangan, dan bunyi kapsul. Hanya jika dipilih.
  const sound = { enabled: false, ctx: null, supported: !!(window.AudioContext || window.webkitAudioContext) };
  const tone = (hz, a, d, type = 'sine', at = 0) => { const c = sound.ctx, now = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = hz; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(a, now + .004); g.gain.exponentialRampToValueAtTime(.0001, now + d); o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + d + .05); };
  const noise = (freq, a, d) => { const c = sound.ctx, n = c.sampleRate * d, buf = c.createBuffer(1, n, c.sampleRate), data = buf.getChannelData(0); for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = a; s.connect(f); f.connect(g); g.connect(c.destination); s.start(); };
  const play = kind => {
    if (!sound.enabled || document.hidden || !sound.ctx) return;
    if (kind === 'punch') { tone(90, .3, .18, 'triangle'); noise(900, .4, .08); }
    else if (kind === 'clap') noise(1400 + Math.random() * 600, .5, .12);
    else if (kind === 'pack') { tone(1320, .08, .12); tone(1760, .05, .16, 'sine', .06); }
    else if (kind === 'chime') [523, 659, 784, 1047].forEach((hz, i) => tone(hz, .08, 1.2, 'sine', i * .09));
  };
  const soundStatus = () => {
    $('#sound').disabled = !sound.supported; $('#sound').setAttribute('aria-pressed', String(sound.enabled)); $('#sound').textContent = sound.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = sound.supported ? t('Kartu absen, kapsul, dan tepuk tangan hanya berbunyi jika kamu memilihnya.', 'The time clock, capsules, and applause only sound if you choose them.') : t('Bunyi belum tersedia di peramban ini.', 'Sound is unavailable in this browser.');
  };
  $('#sound').onclick = async () => {
    sound.enabled = !sound.enabled;
    if (sound.enabled && !sound.ctx) { const A = window.AudioContext || window.webkitAudioContext; sound.ctx = new A(); }
    if (sound.ctx) await (sound.enabled ? sound.ctx.resume() : sound.ctx.suspend()).catch(() => {});
    soundStatus();
  };
  soundStatus();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('mimpi:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('mimpi:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const calm = () => root.hasAttribute('data-calm');

  // Kartu absen
  let view = '';
  const renderCard = () => {
    const name = readerName || t('pembaca', 'reader'); $('#cardName').textContent = name.charAt(0).toUpperCase() + name.slice(1);
    $('#cardIn').textContent = card.in ? clock(card.in) : '--:--'; $('#cardOut').textContent = card.out ? clock(card.out) : '--:--';
    $('#cardIn').toggleAttribute('data-stamped', !!card.in); $('#cardOut').toggleAttribute('data-stamped', !!card.out);
    $('#homeNote').textContent = isNight() ? t('Shift malam sedang berjalan. Dunia cukup sunyi.', 'The night shift is running. The world is quiet enough.') : t('Shift malam dimulai pukul 19.00. Kamu boleh masuk lebih awal.', 'The night shift starts at 7 p.m. You may clock in early.');
    root.toggleAttribute('data-night', isNight());
    const place = places[LANG]; const working = card.in && !card.out;
    $('#resume').hidden = !(working && place && place.progress > 0 && place.progress < .99);
    $('#clockIn').textContent = working ? t('Masuk ke lantai produksi', 'Go to the production floor') : t('Absen masuk', 'Clock in');
    $('#receivedNote').hidden = !received.length;
    $('#receivedNote').innerHTML = received.length ? `${t('Kamu menerima', 'You have received')} <b>${received.length}</b> ${t('mimpi dari orang lain. Mimpi itu tidak akan larut.', received.length === 1 ? 'dream from someone else. It will not dissolve.' : 'dreams from others. They will not dissolve.')} <button type="button" class="link" id="openReceived">${t('Buka saku', 'Open pocket')}</button>` : '';
    $('#openReceived')?.addEventListener('click', openPocket);
  };
  const showHome = () => { persist(); stopMic(); view = 'home'; setView('home'); renderCard(); scrollTo({ top: 0, behavior: 'instant' }); };
  $('#clockIn').onclick = () => {
    if (!card.in || card.out) { card = { in: Date.now() }; if (!PREVIEW) store.set('mimpi:card', card); play('punch'); renderCard(); $('#cardIn').classList.add('punched'); }
    setTimeout(() => toFloor(), calm() ? 0 : 650);
  };
  $('#resume').onclick = () => { const place = places[LANG]; toFloor(place?.paragraph, place?.offset); };

  // Lantai produksi
  let paragraphs = [], weights = new Map(), total = 0, current = -1, latest = null, saveTimer = 0, raf = 0;
  const line = () => innerHeight * .5;
  const chip = (label, tone = 'info') => `<span class="chip" data-tone="${tone}">${esc(pick(label))}</span>`;
  const special = (b, i) => {
    let html = '';
    if (b.ingredients) html += `<ul class="ingredients">${b.ingredients.map(x => `<li>${esc(pick(x))}</li>`).join('')}</ul>`;
    if (b.rule) html += `<figure class="rule"><figcaption>${t('Buku pedoman · hari pertama', 'Handbook · first day')}</figcaption><blockquote>${esc(pick(SHIFT.RULE))}</blockquote></figure>`;
    if (b.years) html += `<div class="years" aria-label="${t('Empat puluh mimpi yang larut di atas meja', 'Forty dreams dissolved on the desk')}">${Array.from({ length: b.years }, (_, n) => `<span style="--n:${n}"></span>`).join('')}<small>${t('40 tahun · larut di atas meja menjelang pagi', '40 years · dissolved on the desk toward morning')}</small></div>`;
    if (b.order) { const s = sentences(body[i]); html += `<section class="order"><p class="order-head">${t('Pesanan khusus · di luar buku', 'Special order · off the books')}</p><dl><div><dt>${t('Untuk', 'For')}</dt><dd>${t('Pak Wangsa', 'Mr. Wangsa')}</dd></div><div><dt>${t('Isi', 'Contents')}</dt><dd>${esc(s[0])} ${esc(s[1] || '')} ${esc(s.at(-1))}</dd></div><div><dt>${t('Status', 'Status')}</dt><dd>${t('Belum selesai', 'Unfinished')}</dd></div></dl></section>`; }
    if (b.archive && SHIFT.ARCHIVE) {
      const src = sentences(body[findP(SHIFT.ARCHIVE.source)] || '');
      const rows = SHIFT.ARCHIVE.starts.map(s => src.find(x => x.startsWith(s[L]))).filter(Boolean);
      const own = SHIFT.ARCHIVE.own;
      html += `<section class="archive"><p class="order-head">${t('Arsip pesanan lama', 'Old order archive')}</p><ol>${rows.map((r, n) => `<li><span class="mono">#${String(n + 1).padStart(4, '0')}</span><span>${esc(r)}</span>${chip(['Terkirim', 'Delivered'], 'ok')}</li>`).join('')}<li class="own" id="ownOrder"><span class="mono">#0040</span><span>${esc(pick(own.label))}</span><span class="chip" data-tone="warn" id="ownStatus">${esc(pick(own.held))}</span></li></ol></section>`;
    }
    if (b.seats) html += b.seats === 'filled' ? `<div class="hall" id="hall" aria-label="${t('Ratusan kursi', 'Hundreds of chairs')}">${Array.from({ length: 240 }, (_, n) => `<i style="--n:${n}"></i>`).join('')}</div>` : '';
    if (b.applause) html += `<section class="applause" id="applause" aria-labelledby="applauseTitle"><p class="eyebrow" id="applauseTitle">${t('Kamu juga di ruangan ini', 'You are in this room too')}</p><button class="primary" id="stand" type="button">${t('Berdiri', 'Stand up')}</button><div class="clap-panel" id="clapPanel" hidden><button class="clap" id="clap" type="button">${t('Tepuk tangan', 'Applaud')}</button><button class="secondary" id="mic" type="button" aria-pressed="false">${t('Pakai mikrofon (opsional)', 'Use the microphone (optional)')}</button><p class="clap-count" id="clapCount" role="status"></p></div></section>`;
    return html;
  };
  const render = () => {
    const items = body.map((p, i) => {
      if (p.trim() === '***') return '<li class="shift-break" role="separator"><span></span></li>';
      const bs = beatsAt(i);
      const head = bs.filter(b => b.chip || b.station).map(b => b.chip ? chip(b.chip, b.tone) : `<span class="chip" data-tone="station">${esc(pick(b.station))}</span>`).join('');
      return `<li class="item" data-entry="${i}">${head ? `<p class="tags">${head}</p>` : ''}<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>${bs.map(b => special(b, i)).join('')}<button class="pack-paragraph" type="button" data-pack="${i}" aria-label="${t('Kemas paragraf ini jadi kapsul', 'Package this paragraph as a capsule')}">${t('Kemas', 'Package')}</button></li>`;
    });
    $('#story').innerHTML = items.join('');
    paragraphs = [...document.querySelectorAll('.passage')]; total = 0; weights = new Map();
    paragraphs.forEach(p => { const w = count(body[+p.dataset.p]); weights.set(p, { before: total, words: w }); total += w; });
    $('#story').querySelectorAll('[data-pack]').forEach(b => { b.onclick = () => { const p = +b.dataset.pack, text = plain(body[p]); pack(p, 0, text.length, b); }; });
    $('#stand')?.addEventListener('click', stand);
    renderGate(); renderApplause();
  };
  const capture = () => {
    if (!paragraphs.length) return null;
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], r = p.getBoundingClientRect(), offset = clamp((l - r.top) / Math.max(1, r.height), 0, 1), w = weights.get(p);
    const last = paragraphs.at(-1).getBoundingClientRect(), finished = found === paragraphs.length - 1 && last.bottom <= innerHeight - 30;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((w.before + offset * w.words) / Math.max(1, total), 0, 1), finished };
  };
  const persist = () => {
    if (!latest || view !== 'floor') return;
    places[LANG] = latest;
    if (!PREVIEW) { store.set('mimpi:places', places); store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +latest.progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() }); }
    if (latest.finished && !done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); }
  };
  // Keadaan lantai mengikuti kalimat yang sedang dibaca: stasiun, kebocoran cerobong, kursi, ban berjalan.
  const frame = () => {
    if (view !== 'floor' || [...document.querySelectorAll('dialog')].some(d => d.open)) return;
    const place = capture(); current = place ? place.paragraph : -1;
    const station = lastWith('station', current), leak = lastWith('leak', current), seats = lastWith('seats', current), belt = lastWith('belt', current);
    $('#station').textContent = station ? pick(station.station) : '';
    root.dataset.leak = String(leak ? leak.leak : 0); root.dataset.seats = seats ? seats.seats : ''; root.dataset.belt = belt ? belt.belt : 'on';
    if (root.dataset.belt !== 'off') root.style.setProperty('--belt', (scrollY * .6).toFixed(1) + 'px');
    const own = SHIFT.ARCHIVE && findP(SHIFT.ARCHIVE.own.after);
    if ($('#ownStatus')) { const happened = own >= 0 && current >= own; $('#ownStatus').textContent = pick(happened ? SHIFT.ARCHIVE.own.done : SHIFT.ARCHIVE.own.held); $('#ownStatus').dataset.tone = happened ? 'ok' : 'warn'; }
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latest = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    let target = null; for (let j = paragraph; j < body.length && !target; j++) target = document.getElementById('p-' + j);
    target = target || paragraphs.at(-1); if (!target) return;
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); frame();
  };
  const toFloor = (paragraph, offset) => {
    history.replaceState(null, '', location.pathname + location.search.replace(/[?&]kapsul=[^&]*/, '').replace(/^&/, '?') + '#baca');
    showFloor(); if (paragraph != null) goTo(paragraph, offset); else $('#sideTitle').focus?.();
  };
  const showFloor = (record = true) => {
    view = 'floor'; setView('floor'); if (!paragraphs.length) render(); scrollTo({ top: 0, behavior: 'instant' }); updatePocket();
    if (record && !PREVIEW) {
      const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
      const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: SLUG, at: Date.now() });
    }
    frame();
  };

  // Kapsul: kalimat yang dipilih dikemas tanpa diubah. Offset menunjuk teks asli.
  let selection = null;
  const updatePocket = () => {
    settle();
    const n = capsules.filter(c => c.state === 'saku' || c.state === 'pulang').length + received.length;
    $('#pocketCount').textContent = String(n);
    $('#openPocket').setAttribute('aria-label', t('Saku · ', 'Pocket · ') + n + t(' kapsul', n === 1 ? ' capsule' : ' capsules'));
  };
  const fly = from => {
    if (calm() || !from) return;
    const to = $('#openPocket').getBoundingClientRect(), el = document.createElement('span'); el.className = 'capsule-fly'; el.setAttribute('aria-hidden', 'true'); document.body.append(el);
    el.animate([{ transform: `translate(${from.left + from.width / 2}px, ${from.top}px) scale(1)`, opacity: 1 }, { transform: `translate(${(from.left + to.left) / 2}px, ${Math.min(from.top, to.top) - 60}px) scale(1.2)`, opacity: 1, offset: .5 }, { transform: `translate(${to.left + to.width / 2}px, ${to.top + 10}px) scale(.3)`, opacity: .2 }], { duration: 900, easing: 'cubic-bezier(.4,.1,.3,1)' }).onfinish = () => el.remove();
  };
  const pack = (p, start, end, from) => {
    const text = plain(body[p]).slice(start, end).trim(); if (!text) return;
    const lead = plain(body[p]).slice(start, end).length - plain(body[p]).slice(start, end).trimStart().length;
    start += lead; end = start + text.length;
    if (capsules.some(c => c.lang === LANG && c.p === p && c.start === start && c.end === end && c.state !== 'larut')) { $('#announcement').textContent = t('Kalimat ini sudah ada di saku.', 'This is already in your pocket.'); return; }
    capsules.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lang: LANG, p, start, end, text, at: Date.now(), state: 'saku' });
    saveCapsules(); play('pack'); fly(from?.getBoundingClientRect?.() || from);
    $('#announcement').textContent = t('Dikemas jadi kapsul. Ada di saku.', 'Packaged as a capsule. It is in your pocket.');
    $('#openPocket').classList.remove('bump'); void $('#openPocket').offsetWidth; $('#openPocket').classList.add('bump');
    renderGate();
  };
  document.addEventListener('selectionchange', () => {
    const s = getSelection(); selection = null;
    if (view !== 'floor' || !s || s.isCollapsed || !s.rangeCount) { $('#pack').hidden = true; return; }
    const range = s.getRangeAt(0), a = range.startContainer.parentElement?.closest('.passage'), b = range.endContainer.parentElement?.closest('.passage');
    if (!a || a !== b) { $('#pack').hidden = true; return; }
    const pre = document.createRange(); pre.selectNodeContents(a); pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length, end = start + range.toString().length;
    if (end - start < 2) { $('#pack').hidden = true; return; }
    selection = { p: +a.dataset.p, start, end, rect: range.getBoundingClientRect() };
    const r = selection.rect, btn = $('#pack'); btn.hidden = false;
    btn.style.left = clamp(r.left + r.width / 2, 90, innerWidth - 90) + 'px'; btn.style.top = Math.max(64, r.top - 52) + 'px';
  });
  $('#pack').addEventListener('pointerdown', e => e.preventDefault());
  $('#pack').onclick = () => { if (!selection) return; const { p, start, end, rect } = selection; pack(p, start, end, rect); getSelection().removeAllRanges(); $('#pack').hidden = true; };

  // Memberikan kapsul: tautan menunjuk teks asli lewat offset, jadi isinya tidak bisa dipalsukan.
  const linkOf = c => { const u = new URL(location.href); u.hash = ''; u.search = ''; u.searchParams.set('kapsul', [c.lang, c.p, c.start, c.end].join('.')); if (c.lang === 'en') u.searchParams.set('lang', 'en'); return u.href; };
  const give = async c => {
    const url = linkOf(c), text = textOf(c);
    try {
      if (navigator.share) await navigator.share({ title: t('Sebuah mimpi untukmu', 'A dream for you'), text: `“${text}”`, url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); $('#announcement').textContent = t('Tautan mimpi disalin.', 'Dream link copied.'); }
      else throw new Error('no-share');
    } catch (e) {
      if (e?.name === 'AbortError') return false;
      if (e?.message !== 'no-share' && navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(url); } catch (_) { showLink(c, url); } } else showLink(c, url);
    }
    c.state = 'diberikan'; c.given = Date.now(); saveCapsules(); play('chime'); renderPocket(); renderGate(); return true;
  };
  const showLink = (c, url) => { const box = document.querySelector(`[data-capsule="${c.id}"] .share-link`); if (box) { box.hidden = false; box.value = url; box.select(); } };
  const takeHome = c => { c.state = 'pulang'; c.expires = dawnAfter(Date.now()); saveCapsules(); renderPocket(); renderGate(); };
  const capsuleRow = (c, actions = true) => {
    const state = c.state, text = textOf(c);
    const status = state === 'saku' ? t('Di saku', 'In your pocket') : state === 'pulang' ? t('Dibawa pulang · larut pukul ', 'Taken home · dissolves at ') + clock(c.expires) : state === 'larut' ? t('Larut menjelang pagi', 'Dissolved toward morning') : t('Diberikan · tidak akan larut', 'Given · will not dissolve');
    return `<li class="capsule" data-capsule="${c.id}" data-state="${state}"><p class="capsule-text">${state === 'larut' ? '' : esc(text)}</p><p class="capsule-meta"><span>${status}</span></p>
      ${actions && (state === 'saku' || state === 'pulang') ? `<div class="capsule-actions"><button type="button" class="primary small" data-give="${c.id}">${t('Berikan ke seseorang', 'Give it to someone')}</button>${state === 'saku' ? `<button type="button" class="secondary small" data-home="${c.id}">${t('Bawa pulang', 'Take it home')}</button>` : ''}</div><input class="share-link" readonly hidden aria-label="${t('Tautan mimpi', 'Dream link')}">` : ''}</li>`;
  };
  const bindCapsules = scope => {
    scope.querySelectorAll('[data-give]').forEach(b => { b.onclick = () => give(capsules.find(c => c.id === b.dataset.give)); });
    scope.querySelectorAll('[data-home]').forEach(b => { b.onclick = () => takeHome(capsules.find(c => c.id === b.dataset.home)); });
  };
  const renderPocket = () => {
    settle();
    const groups = [['saku', t('Di saku', 'In your pocket')], ['pulang', t('Dibawa pulang', 'Taken home')], ['diberikan', t('Diberikan', 'Given')], ['larut', t('Sudah larut', 'Dissolved')]];
    let html = '';
    groups.forEach(([state, label]) => { const list = capsules.filter(c => c.state === state); if (list.length) html += `<section><h3>${label}</h3><ol>${list.map(c => capsuleRow(c)).join('')}</ol></section>`; });
    if (received.length) html += `<section><h3>${t('Diterima dari orang lain', 'Received from others')}</h3><ol>${received.map(r => `<li class="capsule" data-state="diterima"><p class="capsule-text">${esc(textOf(r))}</p><p class="capsule-meta"><span>${t('Diberikan kepadamu · tidak akan larut', 'Given to you · will not dissolve')}</span></p></li>`).join('')}</ol></section>`;
    $('#pocketBody').innerHTML = html || `<p class="empty">${t('Saku masih kosong. Pilih sebuah kalimat di lantai produksi untuk mengemasnya.', 'Your pocket is empty. Select a sentence on the production floor to package it.')}</p>`;
    bindCapsules($('#pocketBody'));
  };
  const openPocket = () => { persist(); renderPocket(); $('#pocketDialog').showModal(); };
  $('#openPocket').onclick = openPocket;

  // Gerbang dan absen keluar
  const renderGate = () => {
    const node = $('#endShift'); if (!node) return;
    node.hidden = false;
    const list = capsules.filter(c => c.state === 'saku');
    node.innerHTML = `<p class="eyebrow">${t('Akhir shift', 'End of shift')}</p><h2 id="gateTitle">${t('Gerbang', 'The gate')}</h2>
      <blockquote class="gate-rule">${esc(pick(SHIFT.RULE))}</blockquote>
      ${list.length ? `<p class="gate-note">${t('Ada kapsul di sakumu. Yang dibawa pulang akan larut menjelang pagi. Yang diberikan kepada seseorang tidak akan larut.', 'There are capsules in your pocket. What you take home will dissolve toward morning. What you give to someone will not.')}</p><ol class="gate-list">${list.map(c => capsuleRow(c)).join('')}</ol>` : `<p class="gate-note">${capsules.length ? t('Sakumu kosong. Gerbang membiarkanmu lewat.', 'Your pocket is empty. The gate lets you through.') : t('Kamu tidak membawa apa pun. Gerbang membiarkanmu lewat.', 'You carry nothing. The gate lets you through.')}</p>`}
      <button class="primary" id="clockOut" type="button">${t('Absen keluar', 'Clock out')}</button>`;
    bindCapsules(node);
    $('#clockOut').onclick = () => { card.out = Date.now(); if (!card.in) card.in = card.out; if (!PREVIEW) store.set('mimpi:card', card); play('punch'); history.replaceState(null, '', location.pathname + location.search); showHome(); $('#cardOut').classList.add('punched'); };
  };

  // Tepuk tangan: ketukan, atau tepukan sungguhan lewat mikrofon jika pembaca mengizinkan.
  let mic = null;
  const renderApplause = () => {
    const hall = $('#hall'); if (hall) { const lit = Math.min(claps, 240); hall.querySelectorAll('i').forEach((s, n) => s.classList.toggle('lit', n < lit)); }
    root.style.setProperty('--glow', String(Math.min(1, claps / 40)));
    const c = $('#clapCount'); if (c) c.textContent = claps ? `${claps} ${t('tepukan', claps === 1 ? 'clap' : 'claps')} · ${t('kursi yang menyala: ', 'chairs lit: ')}${Math.min(claps, 240)}` : '';
    if (claps && $('#clapPanel')) { $('#clapPanel').hidden = false; $('#stand').hidden = true; }
  };
  const clap = () => {
    claps++; if (!PREVIEW) store.set('mimpi:claps', claps); if (!mic) play('clap'); renderApplause();
    const c = $('#chimney'); c.classList.remove('puff'); void c.offsetWidth; c.classList.add('puff');
  };
  function stand() { $('#stand').hidden = true; $('#clapPanel').hidden = false; $('#clap').focus(); root.dataset.standing = ''; }
  const stopMic = () => { if (!mic) return; cancelAnimationFrame(mic.raf); mic.stream.getTracks().forEach(tr => tr.stop()); mic.ctx.close().catch(() => {}); mic = null; const b = $('#mic'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = t('Pakai mikrofon (opsional)', 'Use the microphone (optional)'); } };
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const A = window.AudioContext || window.webkitAudioContext, ctx = new A(), src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const data = new Float32Array(an.fftSize); let avg = .02, last = 0;
      mic = { stream, ctx, raf: 0 };
      const loop = now => {
        if (!mic) return; an.getFloatTimeDomainData(data); let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v));
        if (peak > Math.max(.22, avg * 4) && now - last > 180) { last = now; clap(); }
        avg = avg * .95 + peak * .05; mic.raf = requestAnimationFrame(loop);
      };
      mic.raf = requestAnimationFrame(loop);
      $('#mic').setAttribute('aria-pressed', 'true'); $('#mic').textContent = t('Matikan mikrofon', 'Turn off the microphone');
      $('#clapCount').textContent = t('Mikrofon menyala. Tepuk tanganmu sungguhan.', 'The microphone is on. Clap your real hands.');
    } catch (_) { $('#clapCount').textContent = t('Mikrofon tidak tersedia. Ketukan tetap bisa dipakai.', 'The microphone is unavailable. Tapping still works.'); }
  };
  document.addEventListener('click', e => {
    if (e.target.closest('#clap')) clap();
    if (e.target.closest('#mic')) { if (mic) stopMic(); else startMic(); }
  });

  // Hadiah: kapsul dari orang lain
  const parseGift = () => {
    const raw = qs.get('kapsul'); if (!raw) return null;
    const [lang, p, start, end] = raw.split('.'); const src = lang === 'en' ? work.en?.body : work.body;
    const text = plain(src?.[+p] || '').slice(+start, +end);
    if (!['id', 'en'].includes(lang) || !text.trim() || +end <= +start || +end - +start > 2000) return null;
    return { lang, p: +p, start: +start, end: +end, text };
  };
  const showGift = gift => {
    view = 'gift'; setView('gift');
    if (!PREVIEW && !received.some(r => r.lang === gift.lang && r.p === gift.p && r.start === gift.start && r.end === gift.end)) { received.push({ ...gift, at: Date.now() }); saveCapsules(); }
    $('#gift').innerHTML = `<p class="eyebrow">${esc(title)}</p><h1 id="giftTitle">${t('Sebuah mimpi untukmu', 'A dream for you')}</h1>
      <figure class="gift-capsule"><blockquote>${esc(gift.text)}</blockquote><figcaption>${t('Seseorang di shift malam memberikan kapsul ini kepadamu. Mimpi yang diberikan tidak larut menjelang pagi.', 'Someone on the night shift gave you this capsule. A dream that is given does not dissolve toward morning.')}</figcaption></figure>
      <button class="primary" id="enterShift" type="button">${t('Masuk shift malam', 'Join the night shift')}</button>`;
    $('#enterShift').onclick = () => { history.replaceState(null, '', location.pathname + (EN ? '?lang=en' : '')); showHome(); };
  };

  // Pengaturan
  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = delta => {
    const place = delta && view === 'floor' ? capture() : null; size = clamp(size + delta, 16, 26); root.style.setProperty('--size', size + 'px');
    store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26;
    if (place) goTo(place.paragraph, place.offset);
  };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { persist(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.searchParams.delete('kapsul'); if (view === 'floor' && current >= 0) u.hash = 'baca-' + current; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  $('#toHome').onclick = () => { history.replaceState(null, '', location.pathname + location.search); showHome(); };
  document.querySelectorAll('dialog').forEach(d => { d.addEventListener('close', schedule); d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }); });

  const follow = () => {
    const gift = parseGift(); if (gift && view !== 'floor') { showGift(gift); return; }
    const m = /^#baca(?:-(\d+))?$/.exec(location.hash);
    if (m) { if (view !== 'floor') showFloor(); if (m[1] != null) goTo(+m[1]); return; }
    showHome();
  };
  addEventListener('hashchange', follow); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => { if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight]; if (view === 'floor' && latest) goTo(latest.paragraph, latest.offset); });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); stopMic(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { persist(); stopMic(); sound.ctx?.suspend().catch(() => {}); } else { if (sound.enabled) sound.ctx?.resume().catch(() => {}); updatePocket(); schedule(); } });
  updatePocket(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
