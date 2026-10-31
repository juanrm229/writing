/* Lacak Surat: setiap paragraf adalah satu catatan pemindaian. Waktunya adalah waktu kamu membacanya.
   Naskah dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(key, fallback) { try { const value = JSON.parse(localStorage.getItem('jm:' + key)); return value == null ? fallback : value; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem('jm:' + key, JSON.stringify(value)); } catch (_) {} }
  };
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '');
  const count = s => (plain(s).match(/\S+/g) || []).length;
  const qs = new URLSearchParams(location.search), EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const LANG = EN ? 'en' : 'id', L = EN ? 1 : 0, t = (id, en) => EN ? en : id, pick = pair => Array.isArray(pair) ? pair[L] : pair;
  const SLUG = 'terlambat-satu-menit', LETTERS = ['a', 'b', 'c', 'd'];
  const PREVIEW = qs.has('preview'), motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), root = document.documentElement;
  const TRACK = window.MinuteTrack || null;
  root.lang = LANG;
  const labels = {
    brandName: ['Lacak Kiriman', 'Track a Shipment'], homeTitle: ['Lacak Kiriman', 'Track a Shipment'], searchNote: ['Masukkan nomor resi untuk melihat riwayat pengiriman.', 'Enter a tracking number to see the shipment history.'],
    resiLabel: ['Nomor resi', 'Tracking number'], trackButton: ['Lacak', 'Track'], detailKicker: ['Riwayat pengiriman', 'Shipment history'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi pemindai', 'Scanner sounds'], volumeLabel: ['Volume', 'Volume'],
    motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language'], allShipments: ['Semua kiriman', 'All shipments'], endSummary: ['Ringkasan pengiriman', 'Delivery summary'], openContents: ['Lihat isi', 'View contents'], openContentsMini: ['Isi', 'Contents']
  };
  Object.entries(labels).forEach(([id, value]) => { $('#' + id).textContent = t(...value); });
  [['openContentsMini', t('Lihat isi kiriman', 'View the contents')], ['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });
  const setView = view => { root.dataset.view = view; $('#home').hidden = view !== 'home'; $('#detail').hidden = view !== 'detail'; $('#summary').hidden = view !== 'summary'; };

  // Tema mengikuti situs: pilihan pembaca (jm:theme), lalu pengaturan admin, lalu perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const value = root.getAttribute('data-theme'); return value ? value === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--bg').trim() || (dark ? '#121212' : '#f4f3ef');
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(site => { if (site?.theme) { siteTheme = site.theme; applyTheme(); } }).catch(() => {});

  const failed = message => { setView('detail'); $('#story').innerHTML = `<li class="loading">${esc(message)} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></li>`; $('#begin').disabled = true; };
  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const response = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('content'); works = await response.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !Array.isArray(work.sides) || work.sides.length < 2) { failed(t('Naskah belum bisa dimuat.', 'The story could not be loaded.')); return; }
  const base = [work, ...work.sides.slice(0, 3)], translations = [work.en || {}, ...(work.en?.sides || [])];
  const docs = base.map((side, i) => {
    const translation = translations[i] || {}, translated = EN && Array.isArray(translation.body) && translation.body.length > 0;
    const source = translated ? translation : side;
    return { title: source.sideTitle || source.title || side.sideTitle || side.title, pov: source.pov || side.pov || '', body: translated ? translation.body : side.body, translated };
  });
  if (docs.some(d => !Array.isArray(d.body) || !d.body.length || d.body.some(p => typeof p !== 'string'))) { failed(t('Naskah belum lengkap.', 'The story is incomplete.')); return; }
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · ' + t('Lacak Surat', 'Track the Letter'); $('#workTitle').textContent = title;

  const N = base.length, ORDER = (TRACK?.ORDER || [0, 1, 2, 3]).filter(i => i < N);
  // Data pelacakan: setiap ketukan dicari lewat penanda teks, jadi pembagian paragraf ID/EN tidak menggeser statusnya.
  const SIDES = (TRACK?.SIDES || []).map((side, i) => ({
    ...side,
    beats: side.beats.map(beat => ({ ...beat, p: docs[i].body.findIndex(p => p.includes(beat.find[L])) })).filter(beat => beat.p >= 0)
  }));
  const fallbackSide = () => ({ resi: '—', item: ['Kiriman', 'Shipment'], from: '', to: '', fromPlace: '', toPlace: '', stages: [], beats: [] });
  const sideData = i => SIDES[i] || fallbackSide(i);
  const beatAt = (i, p) => sideData(i).beats.find(beat => beat.p === p);
  const markerP = (i, key) => (sideData(i).beats.find(beat => beat[key]) || {}).p ?? Infinity;

  // Isi kiriman: kutipan miring dari paragraf aslinya; setiap bagian terbuka setelah paragrafnya terbaca.
  const italics = text => [...String(text).matchAll(/\*([^*]+)\*/g)].map(m => m[1].trim()).join(' ');
  const findP = (i, marker) => docs[i].body.findIndex(p => p.includes(marker[L]));
  const CONTENTS = Array.from({ length: N }, (_, i) => (TRACK?.CONTENTS?.[i] || []).map(item => ({
    ...item,
    stages: (item.stages || []).map(stage => ({ ...stage, p: findP(i, stage.find) })).filter(stage => stage.p >= 0),
    sealedP: item.sealed ? docs[i].body.findIndex(p => p.includes(item.sealed[L])) : -1,
    sentP: item.sent ? docs[i].body.findIndex(p => p.includes(item.sent[L])) : -1,
    parts: (item.parts || []).map(part => { const p = docs[i].body.findIndex(text => text.includes(part.find[L])); return { ...part, p, text: p >= 0 ? italics(docs[i].body[p]) : '' }; }).filter(part => part.text)
  })));
  const contentParts = new Set(CONTENTS.flatMap((items, i) => items.flatMap(item => [...item.parts, ...item.stages].map(part => i + ':' + part.p))));
  // Riwayat alamat: pengetahuan pembaca dari sisi mana pun.
  const ADDRESSES = (TRACK?.ADDRESSES || []).map(a => ({ ...a, at: Object.entries(a.show).filter(([side]) => +side < N).map(([side, marker]) => [+side, findP(+side, marker)]).filter(([, p]) => p >= 0) }));
  const addressParts = new Set(ADDRESSES.flatMap(a => a.at.map(([side, p]) => side + ':' + p)));
  const reversed = new Set();
  let contentsTab = '', contentsSeen = '';

  const keyOf = index => SLUG + (index ? ':' + LETTERS[index] : '');
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let places = PREVIEW ? {} : object(store.get('minute:places', {}));
  const scansAll = PREVIEW ? {} : object(store.get('minute:scans', {}));
  const scans = LETTERS.slice(0, N).map(letter => object(object(scansAll[LANG])[letter]));
  const saveScans = () => { if (PREVIEW) return; scansAll[LANG] = Object.fromEntries(scans.map((value, i) => [LETTERS[i], value])); store.set('minute:scans', scansAll); };
  const allDone = () => PREVIEW || ORDER.every(i => done.has(keyOf(i)));
  let sideIndex = 0, paragraphs = [], weights = new Map(), totalWords = 0, currentParagraph = -1, latestPlace = null, view = '';
  let saveTimer = 0, raf = 0, shownStatus = '';
  const dialogs = [$('#settingsDialog'), $('#contentsDialog')];
  const calm = () => root.hasAttribute('data-calm');
  const line = () => innerHeight * .5;

  const pad = n => String(n).padStart(2, '0');
  const clock = ms => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const day = ms => new Date(ms).toLocaleDateString(EN ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const dayKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Ingatan Saman mengabur: setelah "hari-hari berlalu", waktu pemindaian tidak lagi terbaca.
  // Jam Maryam berhenti: setelah ia pergi, seluruh riwayatnya membeku pada menit yang sama.
  const stampOf = (i, p) => {
    const at = scans[i][p]; if (!at) return null;
    if (i === 0 && p >= markerP(0, 'fog')) return { time: '--:--', date: t('tanggal tidak terbaca', 'date unreadable'), fog: true };
    const freeze = markerP(2, 'freeze');
    if (i === 2 && scans[2][freeze]) return { time: clock(scans[2][freeze]), date: day(scans[2][freeze]), frozen: true };
    return { time: clock(at), date: day(at) };
  };
  const statusOf = (i, upTo, scannedOnly = false) => {
    const list = sideData(i).beats.filter(beat => beat.status && beat.p <= upTo && (!scannedOnly || scans[i][beat.p]));
    return list.at(-1) || null;
  };
  const stageOf = (i, upTo) => { const list = sideData(i).beats.filter(beat => beat.stage != null && beat.p <= upTo); return list.length ? list.at(-1).stage : -1; };

  // Bunyi
  const audioStatus = s => {
    $('#sound').disabled = !s.supported; $('#sound').setAttribute('aria-pressed', s.enabled);
    $('#sound').textContent = s.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = !s.supported ? t('Bunyi belum tersedia di peramban ini. Cerita tetap bisa dibaca.', 'Sound is unavailable in this browser. You can keep reading.') : s.error ? t('Bunyi belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.') : t('Bip pemindai, cap pos, dan lonceng hanya terdengar jika kamu memilihnya.', 'Scanner beeps, postmarks, and the bell only play if you choose them.');
  };
  const sound = typeof window.MinuteSound === 'function' ? new window.MinuteSound(audioStatus) : { supported: false, enabled: false, setVolume() {}, setScene() {}, setPaused() {}, play() {}, dispose() {} };
  audioStatus(sound); $('#sound').onclick = () => { void sound.setEnabled(!sound.enabled); };
  const rawVolume = store.get('minute:volume', 25); $('#volume').value = Number.isFinite(rawVolume) ? clamp(rawVolume, 0, 100) : 25;
  const setVolume = () => { const value = +$('#volume').value; $('#volumeValue').value = value + '%'; $('#volume').setAttribute('aria-valuetext', value + '%'); store.set('minute:volume', value); sound.setVolume(value / 100); };
  $('#volume').oninput = setVolume; setVolume();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('minute:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', enabled); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('minute:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();

  // Halaman lacak
  let typing = 0;
  const chip = (beat, fallback) => `<span class="status-chip" data-tone="${beat ? beat.tone : 'pending'}">${esc(beat ? pick(beat.status) : fallback)}</span>`;
  const progressOf = i => done.has(keyOf(i)) ? 1 : clamp(+(places[LANG]?.[LETTERS[i]]?.progress) || 0, 0, 1);
  const lastScanOf = i => { const ps = Object.keys(scans[i]).map(Number); if (!ps.length) return null; const p = Math.max(...ps); return stampOf(i, p); };
  const norm = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const DEFAULT = () => sideData(0).resi;
  const SEARCH = TRACK?.SEARCH || null;
  let query = '';
  const letterLines = (i, parts) => parts.map(part => `<p class="letter-line${part.faded ? ' faded' : ''}">${esc(part.text)}</p>`).join('');
  const redactedBlock = () => `<div class="redacted" role="img" aria-label="${t('Isi tidak dapat ditampilkan', 'Contents cannot be displayed')}">${[94, 78, 88, 64, 82, 40].map(w => `<span style="--w:${w}%"></span>`).join('')}<b>${t('Tidak dapat ditampilkan', 'Cannot be displayed')}</b></div>`;
  const shipCard = i => {
    const s = sideData(i), d = docs[i], beat = statusOf(i, Infinity, true), last = lastScanOf(i);
    return `<li><button class="ship-card" type="button" data-side="${i}"><span class="ship-top"><span class="resi">${esc(s.resi)}</span>${chip(beat, t('Belum dilacak', 'Not tracked yet'))}</span>
      <span class="ship-route"><b>${esc(pick(s.from))}</b><span aria-hidden="true">→</span><b>${esc(pick(s.to))}</b><small>${esc(pick(s.item))}</small></span>
      <span class="ship-meta"><span>${esc(d.title)} · ${esc(d.pov)}</span><span>${last ? t('Dipindai ', 'Scanned ') + last.time : t('Belum dipindai', 'Not scanned')}</span></span>
      <span class="ship-progress" style="--p:${progressOf(i)}"></span></button></li>`;
  };
  // Hasil pencarian: nomor utama, 52 surat Saman, resi Maryam, dan kiriman yang baru ada setelah ditulis dalam cerita.
  const findShipments = q => {
    const n = norm(q);
    if (!n || n === norm(DEFAULT())) return { kind: 'all' };
    const letters = SEARCH?.letters, m = letters && new RegExp('^' + letters.prefix + '(\\d{4})ID$').exec(n);
    if (m && +m[1] >= 1 && +m[1] <= letters.total) return { kind: 'letter', n: +m[1] };
    const side = ORDER.find(i => norm(sideData(i).resi) === n);
    if (side != null) return { kind: 'side', side };
    const extra = (SEARCH?.extra || []).find(e => norm(e.resi) === n && e.side < N);
    if (extra) { const p = findP(extra.side, extra.after); if (p >= 0 && scans[extra.side][p]) return { kind: 'extra', extra }; }
    return { kind: 'none' };
  };
  const renderResults = () => {
    const found = findShipments(query), letters = SEARCH?.letters;
    $('#results').hidden = false;
    const reset = found.kind === 'all' ? '' : `<button class="reset-search" id="resetSearch" type="button">← ${t('Semua kiriman', 'All shipments')} ${esc(DEFAULT())}</button>`;
    let html = '', head = '';
    if (found.kind === 'all') { head = t(`${ORDER.length} kiriman ditemukan`, `${ORDER.length} shipments found`); html = ORDER.map(shipCard).join(''); }
    else if (found.kind === 'side') { head = t('1 kiriman ditemukan', '1 shipment found'); html = shipCard(found.side); }
    else if (found.kind === 'letter') {
      const p = findP(letters.side, letters.find), resi = `${letters.prefix} ${String(found.n).padStart(4, '0')} ID`;
      head = t('1 kiriman ditemukan', '1 shipment found');
      html = `<li><article class="ship-card static" data-letter="${found.n}"><span class="ship-top"><span class="resi">${esc(resi)}</span><span class="status-chip" data-tone="held">${t('Tertahan di pengirim', 'Held by sender')}</span></span>
        <span class="ship-route"><b>Saman</b><span aria-hidden="true">→</span><b>Banyu</b><small>${t(`Surat ${found.n} dari ${letters.total} · disimpan di laci, tidak dikirim`, `Letter ${found.n} of ${letters.total} · kept in the drawer, not sent`)}</small></span>
        <article class="letter mini" data-hand="saman">${letterLines(0, [{ text: italics(docs[letters.side].body[p]) }])}</article>
        <span class="ship-meta"><span>${t('Ditulis ulang setiap minggu. Kalimatnya sama.', 'Rewritten every week. The same words.')}</span></span></article></li>`;
    } else if (found.kind === 'extra') {
      const e = found.extra, item = CONTENTS[e.side].find(x => x.id === e.item);
      head = t('1 kiriman ditemukan', '1 shipment found');
      let body = '', status = '';
      if (item?.redacted) { const stage = item.stages.filter(st => scans[e.side][st.p]).at(-1); status = stage ? `<span class="status-chip" data-tone="${stage.tone}">${esc(pick(stage.status))}</span>` : ''; body = redactedBlock(); }
      else if (item) { const sent = item.sentP >= 0 && scans[e.side][item.sentP]; status = `<span class="status-chip" data-tone="${sent ? 'transit' : 'pending'}">${sent ? t('Dikirim · penerimaan tidak tercatat', 'Sent · receipt not recorded') : t('Ditulis', 'Written')}</span>`; body = `<article class="letter mini" data-hand="${item.hand}">${letterLines(e.side, item.parts.filter(part => unlocked(e.side, part)))}</article>`; }
      html = `<li><article class="ship-card static" data-extra="${e.item}"><span class="ship-top"><span class="resi">${esc(e.resi)}</span>${status}</span><span class="ship-route"><b>${esc(e.from)}</b><span aria-hidden="true">→</span><b>${esc(e.to)}</b><small>${esc(pick(e.label))}</small></span>${body}<button class="text-button open-side" type="button" data-side="${e.side}">${t('Buka riwayat', 'Open history')} · ${esc(docs[e.side].title)}</button></article></li>`;
    } else { head = t('Nomor resi tidak ditemukan', 'Tracking number not found'); html = `<li class="not-found"><p>${t('Periksa kembali nomornya. Beberapa kiriman baru tercatat setelah ditulis dalam cerita.', 'Check the number again. Some shipments only appear once the story writes them.')}</p></li>`; }
    $('#resultsHead').textContent = head;
    $('#shipments').innerHTML = html;
    $('#shipments').querySelectorAll('[data-side]').forEach(b => { b.onclick = () => navigate(+b.dataset.side); });
    $('#summaryCard').innerHTML = reset + (found.kind === 'all' && allDone() ? `<button class="summary-card" id="openSummary" type="button"><span>${t('Ringkasan pengiriman', 'Delivery summary')}</span><small>${t('Semua kiriman dengan nomor ini', 'Every shipment under this number')}</small></button>` : '');
    $('#openSummary')?.addEventListener('click', toSummary);
    $('#resetSearch')?.addEventListener('click', () => search(DEFAULT()));
  };
  const focusResults = () => $('#shipments [data-side], #shipments .ship-card')?.focus({ preventScroll: true });
  const search = (value, instant = false) => {
    query = value; $('#resi').value = value || DEFAULT();
    if (instant) { renderResults(); return; }
    if (calm()) { renderResults(); focusResults(); return; }
    $('#resultsHead').textContent = t('Mencari kiriman…', 'Searching…'); $('#results').hidden = false;
    $('#shipments').innerHTML = '<li class="skeleton"></li><li class="skeleton"></li>'; $('#summaryCard').innerHTML = '';
    sound.play('scan');
    setTimeout(() => { renderResults(); focusResults(); }, 700);
  };
  const showHome = () => {
    clearTimeout(saveTimer); persist(); view = 'home'; setView('home'); root.dataset.side = ''; $('#topResi').textContent = '';
    scrollTo({ top: 0, behavior: 'instant' });
    const tracked = PREVIEW || store.get('minute:tracked', false) === true, resi = DEFAULT();
    clearInterval(typing);
    $('#resi').readOnly = !tracked; $('#resi').placeholder = resi;
    if (tracked) { $('#resi').value = query || resi; renderResults(); return; }
    $('#results').hidden = true; $('#resi').value = '';
    if (calm()) { $('#resi').value = resi; root.dataset.ready = 'track'; return; }
    let n = 0; typing = setInterval(() => { n++; $('#resi').value = resi.slice(0, n); if (n >= resi.length) { clearInterval(typing); root.dataset.ready = 'track'; } }, 110);
  };
  $('#trackForm').onsubmit = e => {
    e.preventDefault(); clearInterval(typing);
    const first = !PREVIEW && store.get('minute:tracked', false) !== true;
    if (first || PREVIEW && $('#resi').readOnly) { if (!PREVIEW) store.set('minute:tracked', true); $('#resi').readOnly = false; root.dataset.ready = ''; search(DEFAULT()); return; }
    root.dataset.ready = ''; search($('#resi').value.trim());
  };
  const searchFor = resi => { history.replaceState(null, '', location.pathname + location.search); showHome(); search(resi, true); $('#homeTitle').scrollIntoView?.({ block: 'start' }); };

  // Riwayat (bacaan)
  const route = i => {
    const s = sideData(i);
    return `<div><dt>${t('Dari', 'From')}</dt><dd><b>${esc(pick(s.from))}</b><small>${esc(pick(s.fromPlace))}</small></dd></div><div><dt>${t('Untuk', 'To')}</dt><dd><b>${esc(pick(s.to))}</b><small>${esc(pick(s.toPlace))}</small></dd></div><div><dt>${t('Isi', 'Contents')}</dt><dd><b>${esc(pick(s.item))}</b></dd></div>`;
  };
  const special = (i, beat) => {
    if (!beat?.special) return '';
    if (beat.special === 'fiftytwo') return `<details class="manifest"><summary>${t('52 kiriman · tertahan di pengirim', '52 shipments · held by sender')}</summary><ol>${Array.from({ length: 52 }, (_, n) => `<li><button type="button" data-resi="SMN ${String(n + 1).padStart(4, '0')} ID"><span class="mono">SMN ${String(n + 1).padStart(4, '0')} ID</span><span>${t('Surat', 'Letter')} ${n + 1}</span><span>${t('Tertahan di pengirim', 'Held by sender')}</span></button></li>`).join('')}</ol></details>`;
    if (beat.special === 'forwarded') return `<ol class="forwarded" aria-label="${t('Riwayat pengalihan', 'Forwarding history')}">${Array.from({ length: 9 }, (_, n) => `<li style="--n:${n}">${t('Dialihkan ke alamat baru', 'Forwarded to a new address')}</li>`).join('')}</ol>`;
    if (beat.special === 'proof') return `<section class="proof" id="proof" hidden aria-label="${t('Bukti penerimaan', 'Proof of delivery')}"></section>`;
    if (beat.special === 'tomorrow') return `<div id="tomorrow"></div>`;
    return '';
  };
  const renderProof = () => {
    const node = $('#proof'); if (!node) return;
    const beat = sideData(1).beats.find(b => b.special === 'proof'), at = scans[1][beat.p];
    node.hidden = !at; if (!at) return;
    node.innerHTML = `<p class="proof-title">${t('Bukti penerimaan', 'Proof of delivery')}</p><dl>
      <div><dt>${t('Ditujukan kepada', 'Addressed to')}</dt><dd>Banyu</dd></div>
      <div class="received"><dt>${t('Diterima oleh', 'Received by')}</dt><dd>${t('Mas', 'Sir')}</dd></div>
      <div><dt>${t('Hubungan', 'Relation')}</dt><dd>${t('Pelanggan', 'Customer')}</dd></div>
      <div><dt>${t('Tanda tangan', 'Signature')}</dt><dd class="signature" aria-label="${t('kosong', 'empty')}"></dd></div>
      <div><dt>${t('Jam berhenti', 'Clock stopped')}</dt><dd class="mono">${clock(at - 60000)}</dd></div>
      <div><dt>${t('Tiba', 'Arrived')}</dt><dd class="mono">${clock(at)}</dd></div>
      <div class="late"><dt>${t('Keterlambatan', 'Delay')}</dt><dd>${t('1 menit', '1 minute')}</dd></div></dl>
      <p class="print-head">${esc(title)} · ${esc(sideData(1).resi)} · ${esc(day(at))}</p>
      <button class="print-proof" id="printProof" type="button">${t('Cetak bukti', 'Print receipt')}</button>`;
    $('#printProof').onclick = () => { root.dataset.print = 'proof'; const finish = () => { delete root.dataset.print; removeEventListener('afterprint', finish); }; addEventListener('afterprint', finish); window.print(); setTimeout(finish, 1500); };
  };
  const renderTomorrow = () => {
    const node = $('#tomorrow'); if (!node) return;
    const visits = array(store.get('minute:visits', [])), now = Date.now(), tomorrow = new Date(now + 864e5);
    const last = sideData(1).beats.find(b => b.special === 'tomorrow');
    if (!scans[1][last.p]) { node.innerHTML = ''; return; }
    node.innerHTML = `<ol class="revisits">${visits.slice(1).map(k => { const [y, m, d] = k.split('-').map(Number); const ms = new Date(y, m - 1, d).getTime(); return `<li><span class="mono">${day(ms)}</span><span class="status-chip" data-tone="done">${t('Datang lagi', 'Came again')}</span><small>${t('Toko jahit, ujung gang', 'Tailor shop, end of the alley')}</small></li>`; }).join('')}
      <li class="estimate"><span class="mono">${day(tomorrow.getTime())}</span><span class="status-chip" data-tone="transit">${t('Estimasi tiba: besok', 'Estimated arrival: tomorrow')}</span></li></ol>`;
  };
  const renderStamp = (li, i, p) => {
    const stamp = stampOf(i, p), when = li.querySelector('.when');
    li.toggleAttribute('data-scanned', !!stamp);
    when.innerHTML = stamp ? `<time class="mono">${stamp.time}</time><small>${esc(stamp.date)}</small>` : `<time class="mono pending">··:··</time>`;
    li.toggleAttribute('data-fog', !!stamp?.fog); li.toggleAttribute('data-frozen', !!stamp?.frozen);
  };
  const renderStatus = () => {
    const i = sideIndex, beat = statusOf(i, currentParagraph), stage = stageOf(i, currentParagraph), s = sideData(i);
    const label = beat ? pick(beat.status) : t('Belum dilacak', 'Not tracked yet');
    const chipNode = $('#statusChip');
    if (label !== shownStatus) {
      shownStatus = label; chipNode.textContent = label; chipNode.dataset.tone = beat ? beat.tone : 'pending';
      chipNode.classList.remove('updated'); void chipNode.offsetWidth; if (beat) chipNode.classList.add('updated');
    }
    $('#stages').querySelectorAll('li').forEach((li, n) => { li.toggleAttribute('data-done', n <= stage); li.toggleAttribute('data-current', n === stage); });
    const ps = Object.keys(scans[i]).map(Number), last = ps.length ? stampOf(i, Math.max(...ps)) : null;
    $('#lastScan').textContent = last ? t('Pemindaian terakhir ', 'Last scan ') + last.time : '';
    $('#topResi').textContent = s.resi;
  };
  // Pemindaian: paragraf dicatat ketika ujungnya melewati garis baca.
  const witness = () => {
    let changed = false;
    paragraphs.forEach(node => {
      const p = +node.dataset.p; if (scans[sideIndex][p]) return;
      const r = node.getBoundingClientRect();
      if (!(r.bottom <= line() + 20 && r.bottom >= 56)) return;
      scans[sideIndex][p] = Date.now(); changed = true;
      const li = node.closest('.entry'); renderStamp(li, sideIndex, p);
      if (addressParts.has(sideIndex + ':' + p)) renderAddresses();
      if (contentParts.has(sideIndex + ':' + p) || CONTENTS[sideIndex].some(item => item.sealedP === p)) { ['#openContents', '#openContentsMini'].forEach(id => { $(id).classList.remove('fresh'); void $(id).offsetWidth; $(id).classList.add('fresh'); }); }
      const beat = beatAt(sideIndex, p);
      if (beat?.status) {
        li.classList.add('just'); sound.play(beat.sound || 'status');
        $('#announcement').textContent = pick(beat.status);
        if (beat.special === 'proof') { renderProof(); $('#proof')?.classList.add('arrive'); }
        if (beat.special === 'tomorrow') { recordVisit(); renderTomorrow(); }
        if (beat.freeze) paragraphs.forEach(n => renderStamp(n.closest('.entry'), sideIndex, +n.dataset.p));
      }
    });
    if (changed) saveScans();
  };
  const recordVisit = () => {
    if (PREVIEW) return;
    const visits = array(store.get('minute:visits', [])), today = dayKey(Date.now());
    if (!visits.includes(today)) store.set('minute:visits', [...visits, today]);
  };

  const capture = () => {
    if (!paragraphs.length) return null;
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], rect = p.getBoundingClientRect(), offset = clamp((l - rect.top) / Math.max(1, rect.height), 0, 1), weight = weights.get(p);
    const last = paragraphs[paragraphs.length - 1].getBoundingClientRect(), finished = found === paragraphs.length - 1 && last.bottom <= innerHeight - 30;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((weight.before + offset * weight.words) / Math.max(1, totalWords), 0, 1), finished };
  };
  const persist = () => {
    if (!latestPlace || view !== 'detail' || reversed.has(sideIndex)) return;
    const moved = JSON.stringify(places[LANG]?.[LETTERS[sideIndex]]) !== JSON.stringify(latestPlace);
    places[LANG] = { ...object(places[LANG]), [LETTERS[sideIndex]]: latestPlace };
    if (!PREVIEW && moved) {
      store.set('minute:places', places); store.set('prog', { ...object(store.get('prog', {})), [keyOf(sideIndex)]: +latestPlace.progress.toFixed(4) });
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    if (latestPlace.finished && !done.has(keyOf(sideIndex))) {
      done.add(keyOf(sideIndex)); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] });
      $('#announcement').textContent = t('Riwayat ini sudah dibaca sampai akhir.', 'This history has been read to the end.'); updateEnd();
    }
  };
  const frame = () => {
    if (view !== 'detail' || dialogs.some(d => d.open)) return;
    const place = capture(); currentParagraph = place ? place.paragraph : -1;
    witness(); renderStatus();
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latestPlace = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    let target = null;
    for (let j = paragraph; j < docs[sideIndex].body.length && !target; j++) target = document.getElementById('p-' + j);
    target = target || paragraphs.at(-1); if (!target) return;
    dialogs.forEach(d => { if (d.open) d.close(); });
    const align = () => scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    // Pemindaian bisa mengubah tinggi catatan di atasnya; luruskan sekali lagi setelah dicatat.
    align(); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); frame(); align(); frame();
  };
  const updateEnd = () => { const ready = allDone(); $('#endSummary').hidden = !ready; $('#nextSide').hidden = ready && sideIndex === ORDER.at(-1); };
  const nextOf = i => ORDER[(ORDER.indexOf(i) + 1) % ORDER.length];
  const renderSide = (index, record = true) => {
    clearTimeout(saveTimer); persist(); dialogs.forEach(d => { if (d.open) d.close(); });
    clearInterval(typing); root.dataset.ready = '';
    view = 'detail'; setView('detail'); sideIndex = clamp(index, 0, N - 1); latestPlace = null; currentParagraph = -1; shownStatus = '';
    const doc = docs[sideIndex], side = LETTERS[sideIndex], s = sideData(sideIndex); root.dataset.side = side;
    if (sideIndex === 1 && done.has(keyOf(1))) recordVisit();
    $('#resiBig').textContent = s.resi; $('#route').innerHTML = route(sideIndex);
    $('#sideTitle').textContent = doc.title; $('#voice').textContent = doc.pov;
    const back = reversed.has(sideIndex);
    $('#detailKicker').textContent = (PREVIEW ? t('Pratinjau · ', 'Preview · ') : '') + (back ? (sideIndex === 2 ? t('Dihitung mundur', 'Counted backwards') : t('Terbaru dulu', 'Newest first')) : t('Riwayat pengiriman', 'Shipment history'));
    $('#orderToggle').setAttribute('aria-pressed', String(back)); $('#orderToggle').textContent = back ? t('↑ Terbaru dulu', '↑ Newest first') : t('↓ Terlama dulu', '↓ Oldest first');
    $('#orderToggle').setAttribute('aria-label', back ? t('Urutan: terbaru dulu. Ganti ke terlama dulu', 'Order: newest first. Switch to oldest first') : t('Urutan: terlama dulu. Ganti ke terbaru dulu', 'Order: oldest first. Switch to newest first'));
    $('#begin').textContent = t('Lihat riwayat', 'View history');
    $('#stages').innerHTML = s.stages.map(stage => `<li>${esc(pick(stage))}</li>`).join('');
    const entries = doc.body.map((p, i) => {
      if (p.trim() === '***') return '<li class="gap" role="separator"><span></span></li>';
      const beat = beatAt(sideIndex, i);
      const head = beat?.status || beat?.loc ? `<p class="entry-head">${beat.status ? `<span class="status-chip" data-tone="${beat.tone}">${esc(pick(beat.status))}</span>` : ''}${beat.loc ? `<span class="loc">${esc(pick(beat.loc))}</span>` : ''}</p>` : '';
      const before = beat?.special === 'forwarded' ? special(sideIndex, beat) : '', after = beat?.special && beat.special !== 'forwarded' ? special(sideIndex, beat) : '';
      return `<li class="entry${beat?.status ? ' beat' : ''}" data-entry="${i}"><div class="when"></div><span class="dot" aria-hidden="true"></span><div class="what">${before}${head}<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>${after}</div></li>`;
    });
    // Urutan terbaru dulu: riwayat dibaca dari ujungnya, seperti halaman lacak sungguhan.
    $('#story').innerHTML = (back ? entries.reverse() : entries).join('');
    $('#story').toggleAttribute('data-reversed', back);
    $('#story').querySelectorAll('[data-resi]').forEach(b => { b.onclick = () => searchFor(b.dataset.resi); });
    paragraphs = [...document.querySelectorAll('.passage')]; totalWords = 0; weights = new Map();
    paragraphs.forEach(p => { const words = count(doc.body[+p.dataset.p]); weights.set(p, { before: totalWords, words }); totalWords += words; });
    paragraphs.forEach(node => renderStamp(node.closest('.entry'), sideIndex, +node.dataset.p));
    renderProof(); renderTomorrow(); renderAddresses();
    const place = places[LANG]?.[side]; $('#resume').hidden = back || !(place && Number.isInteger(place.paragraph) && place.progress > 0 && place.progress < .99);
    $('#resume').textContent = t('Lanjutkan dari pemindaian terakhir', 'Continue from the last scan'); $('#resume').onclick = () => goTo(place.paragraph, place.offset);
    $('#partEnd').hidden = false;
    $('#nextSide').textContent = t('Kiriman berikutnya: ', 'Next shipment: ') + sideData(nextOf(sideIndex)).resi + ' · ' + docs[nextOf(sideIndex)].title;
    updateEnd();
    if (record && !PREVIEW && !back) {
      const read = array(store.get('read', [])); if (!read.includes(keyOf(sideIndex))) store.set('read', [...read, keyOf(sideIndex)]);
      const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[keyOf(sideIndex)] = (+stats.plays[keyOf(sideIndex)] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    scrollTo({ top: 0, behavior: 'instant' }); frame();
  };

  // Riwayat alamat penerima: alamat lama dicoret dengan satu garis lurus, seperti di kartu Bu Asih.
  const renderAddresses = () => {
    const node = $('#addresses'), show = sideIndex === 1 || sideIndex === 3;
    const list = ADDRESSES.filter(a => a.at.some(([side, p]) => scans[side]?.[p]));
    node.hidden = !show || !list.length; if (node.hidden) return;
    node.innerHTML = `<p class="eyebrow">${t('Riwayat alamat penerima', 'Recipient address history')}</p><ol>${list.map((a, n) => `<li${n === list.length - 1 ? ' aria-current="true"' : ''}${a.back ? ' data-back' : ''}>${a.back ? '<span aria-hidden="true">↩</span> ' : ''}${esc(pick(a.label))}</li>`).join('')}</ol>`;
  };
  $('#orderToggle').onclick = () => {
    const cur = currentParagraph; reversed.has(sideIndex) ? reversed.delete(sideIndex) : reversed.add(sideIndex);
    renderSide(sideIndex, false); if (cur >= 0) goTo(cur); $('#orderToggle').focus({ preventScroll: true });
  };

  // Isi kiriman
  const unlocked = (i, part) => part.always || !!scans[i][part.p];
  const renderContents = () => {
    const i = sideIndex, items = CONTENTS[i].filter(item => item.sealed || item.parts.some(part => unlocked(i, part)) || item.stages.some(stage => scans[i][stage.p]));
    $('#contentsResi').textContent = sideData(i).resi; $('#contentsTitle').textContent = t('Isi kiriman', 'Contents');
    if (!items.length) { $('#contentsTabs').innerHTML = ''; $('#contentsBody').innerHTML = `<p class="contents-empty">${t('Belum ada isi yang terbaca. Isinya muncul setelah kalimatnya ditulis dalam cerita.', 'Nothing readable yet. The contents appear once the story writes them.')}</p>`; return; }
    // Kiriman yang baru terbuka langsung ditampilkan; pilihan pembaca tetap dihormati sesudahnya.
    const key = i + ':' + items.length;
    if (!items.some(item => item.id === contentsTab) || contentsSeen !== key) contentsTab = contentsSeen && contentsSeen.split(':')[0] === String(i) && contentsSeen === key ? contentsTab : items.at(-1).id;
    contentsSeen = key;
    $('#contentsTabs').innerHTML = items.length > 1 ? items.map(item => `<button type="button" data-tab="${item.id}" aria-pressed="${item.id === contentsTab}">${esc(pick(item.label))}</button>`).join('') : '';
    $('#contentsTabs').querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { contentsTab = b.dataset.tab; renderContents(); $(`#contentsTabs [data-tab="${contentsTab}"]`).focus(); }; });
    const item = items.find(x => x.id === contentsTab), sealed = item.sealed && !scans[i][item.sealedP];
    const meta = `<dl class="letter-meta"><div><dt>${t('Dari', 'From')}</dt><dd>${esc(pick(item.from))}</dd></div><div><dt>${t('Untuk', 'To')}</dt><dd>${esc(pick(item.to))}</dd></div><div><dt>${t('Amplop', 'Envelope')}</dt><dd>${sealed ? t('Tertutup', 'Sealed') : item.sealed ? t('Dibuka', 'Opened') : item.sentP >= 0 && scans[i][item.sentP] ? t('Dikirim', 'Posted') : esc(pick(item.idle || ['—', '—']))}</dd></div></dl>`;
    const stage = item.redacted ? item.stages.filter(st => scans[i][st.p]).at(-1) : null;
    const body = item.redacted ? `<p class="redacted-status"><span class="status-chip" data-tone="${stage.tone}">${esc(pick(stage.status))}</span></p>${redactedBlock()}<p class="contents-empty">${t('Isi tidak dapat ditampilkan.', 'The contents cannot be displayed.')}</p>`
      : sealed ? `<div class="sealed" role="img" aria-label="${t('Amplop tertutup', 'Sealed envelope')}"><span></span></div><p class="contents-empty">${t('Amplop belum dibuka.', 'The envelope has not been opened.')}</p>`
      : `<article class="letter" data-hand="${item.hand}">${letterLines(i, item.parts.filter(part => unlocked(i, part)))}</article>`;
    $('#contentsBody').innerHTML = `<p class="contents-label">${esc(pick(item.label))}</p>` + meta + body;
  };
  const openContents = () => {
    persist(); ['#openContents', '#openContentsMini'].forEach(id => $(id).classList.remove('fresh'));
    renderContents(); $('#contentsDialog').showModal();
  };
  $('#openContents').onclick = openContents; $('#openContentsMini').onclick = openContents;

  // Ringkasan
  const showSummary = () => {
    if (!allDone() || !TRACK) { history.replaceState(null, '', location.pathname + location.search); showHome(); return; }
    clearTimeout(saveTimer); persist(); view = 'summary'; setView('summary'); root.dataset.side = '';
    const rows = TRACK.SUMMARY.map(row => {
      const beat = sideData(row.side).beats.find(b => b.find[0].includes(row.beat)), stamp = beat && stampOf(row.side, beat.p);
      return `<li><span class="resi">${esc(row.resi)}</span><b>${esc(pick(row.label))}</b>${beat ? chip(beat, '') : ''}<span class="mono">${stamp ? stamp.time : '--:--'}</span></li>`;
    }).join('');
    const all = Object.values(object(scansAll[LANG])).flatMap(side => Object.values(object(side))).concat(PREVIEW ? scans.flatMap(s => Object.values(s)) : []).filter(Number.isFinite).sort((a, b) => a - b);
    const coda = TRACK.CODA.map(c => { const text = docs[1].body.find(p => p.includes(c.find[L])); return text ? `<p class="speaker">${c.speaker ? 'Banyu' : 'Saman'}</p><blockquote>${esc(plain(text))}</blockquote>` : ''; }).join('');
    const tomorrow = new Date(Date.now() + 864e5);
    $('#summary').innerHTML = `<header><p class="eyebrow">${esc(sideData(0).resi)}</p><h1 id="summaryTitle">${t('Ringkasan pengiriman', 'Delivery summary')}</h1></header>
      <ol class="summary-rows">${rows}</ol>
      <section class="reader-log"><p class="eyebrow">${t('Pelacak', 'Tracker')}</p><p>${t('Kamu memindai ', 'You scanned ')}<b>${all.length}</b> ${t('catatan', 'entries')}${all.length ? `, ${t('dari', 'from')} <span class="mono">${clock(all[0])}</span> ${esc(day(all[0]))} ${t('sampai', 'to')} <span class="mono">${clock(all.at(-1))}</span> ${esc(day(all.at(-1)))}` : ''}.</p></section>
      <section class="coda">${coda}<p class="estimate-line"><span class="status-chip" data-tone="transit">${t('Estimasi tiba: besok', 'Estimated arrival: tomorrow')}</span><span class="mono">${esc(day(tomorrow.getTime()))}</span></p></section>
      <button class="begin" type="button" id="trackAgain">${t('Lacak lagi', 'Track again')}</button>`;
    $('#trackAgain').onclick = toHome;
    scrollTo({ top: 0, behavior: 'instant' }); $('#summaryTitle').setAttribute('tabindex', '-1'); $('#summaryTitle').focus({ preventScroll: true });
  };

  const navigate = (index, paragraph) => {
    clearTimeout(saveTimer); persist();
    history.replaceState(null, '', '#' + LETTERS[index] + (paragraph == null ? '' : '-' + paragraph));
    renderSide(index); if (paragraph != null) goTo(paragraph);
  };
  const toHome = () => { history.replaceState(null, '', location.pathname + location.search); showHome(); $('#shipments [data-side]')?.focus({ preventScroll: true }); };
  const toSummary = () => { history.replaceState(null, '', '#ringkasan'); showSummary(); };
  $('#toHome').onclick = toHome; $('#allShipments').onclick = toHome; $('#endSummary').onclick = toSummary;
  $('#nextSide').onclick = () => navigate(nextOf(sideIndex)); $('#begin').onclick = () => { const first = paragraphs[0]; if (first) goTo(+first.dataset.p); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  dialogs.forEach(d => {
    d.addEventListener('close', schedule);
    d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });
  });
  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = delta => {
    const place = delta && view === 'detail' ? capture() : null; size = clamp(size + delta, 16, 26); root.style.setProperty('--size', size + 'px');
    store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26;
    if (place) { const target = paragraphs.find(p => +p.dataset.p === place.paragraph); scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + place.offset * target.getBoundingClientRect().height, behavior: 'instant' }); latestPlace = { ...place }; }
  };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => {
    persist(); const url = new URL(location.href); url.searchParams.set('lang', EN ? 'id' : 'en');
    if (view !== 'detail') { url.hash = view === 'summary' ? 'ringkasan' : ''; store.set('lang', EN ? 'id' : 'en'); location.replace(url.href); return; }
    let target = currentParagraph;
    if (target >= 0) {
      const old = docs[sideIndex].body, other = EN ? base[sideIndex].body : translations[sideIndex]?.body;
      if (Array.isArray(other)) {
        const groups = body => { const out = []; let start = 0; body.forEach((p, i) => { if (p.trim() === '***') { out.push([start, i]); start = i + 1; } }); out.push([start, body.length]); return out; };
        const from = groups(old), to = groups(other), index = from.findIndex(([a, b]) => target >= a && target < b);
        if (index >= 0 && to[index]) { const [a, b] = from[index], [c, d] = to[index]; target = Math.min(d - 1, c + Math.floor((target - a) / Math.max(1, b - a) * (d - c))); }
      }
    }
    url.hash = LETTERS[sideIndex] + (target >= 0 ? '-' + target : ''); store.set('lang', EN ? 'id' : 'en'); location.replace(url.href);
  };
  const followHash = () => {
    clearTimeout(saveTimer); persist();
    if (location.hash === '#ringkasan') { showSummary(); return; }
    const match = /^#([abcd])(?:-(\d+))?$/.exec(location.hash);
    if (!match || LETTERS.indexOf(match[1]) >= N) { showHome(); return; }
    const next = LETTERS.indexOf(match[1]);
    if (view !== 'detail' || !paragraphs.length || next !== sideIndex || match[2] == null) renderSide(next);
    if (match[2] != null) goTo(+match[2]);
  };
  addEventListener('hashchange', followHash); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => {
    if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight];
    if (view !== 'detail') return;
    if (latestPlace && currentParagraph >= 0 && !dialogs.some(d => d.open)) goTo(latestPlace.paragraph, latestPlace.offset); else schedule();
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); sound.dispose(); });
  document.addEventListener('visibilitychange', () => { sound.setPaused(document.hidden); if (document.hidden) persist(); else schedule(); });
  followHash();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
