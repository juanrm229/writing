/* The Room: puisi dibaca di aplikasi Rumah. Kamarnya satu, tanpa pintu.
   Setiap tindakan pembaca pada aksesori membuka bait berikutnya: menambahkan kuas, mengecat setiap hari,
   memindahkan kuas kecil ke pojok terjauh, menjalankan adegan Rapikan perabot, meminta kuas mengecat lagi
   sampai Tidak Ada Respons, mendorong semua barang ke satu dinding sampai jebol, lalu mengizinkan palu dan paku.
   Tanpa ilustrasi; larik dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'kamar:state'];
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
  const LOCALE = EN ? 'en-GB' : 'id-ID', dec = n => n.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const G = window.JMGuide || { mount() {}, step() {}, want() {}, next: () => '' };
  const SLUG = 'the-room', root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], kicker: ['Puisi · Juan', 'Poem · Juan'], homeName: ['Rumah', 'Home'], roomName: ['Kamar', 'Room'], accLabel: ['Aksesori', 'Accessories'], historyLabel: ['Riwayat', 'History'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['summary', t('Ringkasan kamar', 'Room summary')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
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
    $('meta[name="theme-color"]').content = dark ? '#141418' : '#e6e1d9';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('kamar:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('kamar:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
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
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#now').innerHTML = `<p class="text">${t('Puisinya belum bisa dimuat.', 'The poem could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; return; }
  const ORIG = work.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
  const translated = LANG !== ORIG && Array.isArray(work[TR]?.body) && work[TR].body.length;
  const body = (translated ? work[TR].body : work.body).map(p => String(p).trim()).filter(Boolean);
  const title = (LANG !== ORIG && work[TR]?.title) || work.title;
  workTitle = title; setTitle(); $('#title').textContent = title;
  if (LANG !== ORIG && !translated) {
    $('#lost').hidden = false;
    $('#lost').textContent = ORIG === 'en' ? 'Puisi ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.' : 'This poem isn’t available in English yet, so it’s shown in the original Indonesian.';
  }
  const TOTAL = body.length;

  // Ikon garis sederhana, seperti di aplikasi rumah pintar
  const I = {
    door: '<path d="M6 21V4h12v17M4 21h16M14.5 12.5h.01"/>', box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    brush: '<path d="M14 4l6 6-8 8-3-3z"/><path d="M9 15c-2 0-4 1.5-4 4.5 2.5 0 5-1 5-3.5"/>', pen: '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M14 7l3 3"/>',
    scene: '<path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.3l5-.7z"/>', wall: '<path d="M3 5h18v14H3zM3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>',
    temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>', paint: '<path d="M4 4h12v6H4zM16 7h3v6h-7v3"/><path d="M11 16h2v5h-2z"/>',
    hammer: '<path d="M13 4l5 5-3 1-2-2-8 8-2-2 8-8-2-2z"/>', nail: '<path d="M8 4h8M12 4v13l-1.2 3h2.4L12 17"/>', home: '<path d="M4 11l8-7 8 7v9H4z"/>'
  };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;

  // Keadaan kamar
  const blank = () => ({ shown: 1, at: [Date.now()], brush: 'none', paint: 0, days: 0, small: 'none', scene: 'idle', push: 0, wall: 'ok', items: 214, temp: 27, coldAt: null, warmAt: null, peel: 0, hammer: false, nails: 0, built: 0, done: false });
  let S = PREVIEW ? blank() : { ...blank(), ...object(store.get('kamar:state', {})) };
  S.shown = clamp(+S.shown || 1, 1, TOTAL); S.at = array(S.at);
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const save = () => {
    store.set('kamar:state', S);
    store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +(S.done ? 1 : (S.shown - 1) / TOTAL).toFixed(4) });
    store.set('last', { key: SLUG, at: Date.now() });
  };
  // Suhu: turun terus setelah dinding jebol; kembali setelah ditambal, tapi tidak lagi 27°
  const temp = () => {
    if (S.wall === 'broken' && S.coldAt) return Math.max(9, 27 - (Date.now() - S.coldAt) / 1000 * .45);
    if (S.wall === 'sealed') return S.warmAt ? Math.min(23.5, 12 + (Date.now() - S.warmAt) / 1000 * 2.5) : 23.5;
    return 27;
  };
  const peel = () => S.wall === 'ok' ? 0 : Math.min(63, 8 + Math.floor((Date.now() - (S.coldAt || Date.now())) / 1000 * 1.2));

  // Peristiwa untuk setiap bait: judul kecil di atas teksnya
  const EVENTS = [
    [t('Kamar', 'Room'), t('4 dinding · tanpa pintu', '4 walls · no door'), 'home'],
    [t('Aksesori ditambahkan', 'Accessory added'), t('Kuas', 'Brush'), 'brush'],
    [t('Cat', 'Paint'), t('warna makin pekat', 'colour growing richer'), 'paint'],
    [t('Kuas', 'Brush'), t('berhenti mengecat', 'stopped painting'), 'brush'],
    [t('Adegan', 'Scene'), t('Rapikan perabot · gagal', 'Tidy the furniture · failed'), 'scene'],
    [t('Kuas', 'Brush'), t('Tidak Ada Respons', 'No Response'), 'brush'],
    [t('Dinding Timur', 'East Wall'), t('jebol', 'broken open'), 'wall'],
    [t('Suhu', 'Temperature'), t('turun terus', 'still falling'), 'temp'],
    [t('Cat dinding', 'Wall paint'), t('kusam · mengelupas', 'dull · peeling'), 'paint'],
    [t('Palu & Paku', 'Hammer & Nail'), t('diizinkan masuk', 'allowed in'), 'hammer'],
    [t('Dinding Timur', 'East Wall'), t('ditutup · 1 paku', 'sealed · 1 nail'), 'nail'],
    [t('Palu', 'Hammer'), t('tidak mendukung pengecatan', 'does not support painting'), 'hammer']
  ];
  const ev = i => EVENTS[i] || [t('Kamar', 'Room'), '', 'home'];
  // Tindakan berikutnya untuk setiap bait: petunjuk di bawah teks dan kartu yang berdenyut
  const NEXT = [
    [t('Tambahkan aksesori.', 'Add an accessory.'), 'add'],
    [t('Cat dindingnya, hari demi hari.', 'Paint the walls, day after day.'), 'brush'],
    [t('Kuas kecil belum pernah menggambar.', 'The small brush has never drawn anything.'), 'small'],
    [t('Jalankan adegan Rapikan perabot.', 'Run the Tidy the furniture scene.'), 'scene'],
    [t('Minta kuasnya mengecat lagi, dengan warna yang lebih lembut.', 'Ask the brush to paint again, in a softer colour.'), 'brush'],
    [t('Lepaskan kuasnya, lalu dorong semua barang ke satu sisi.', 'Let the brush go, then push everything to one side.'), 'items'],
    [t('Kamarnya dingin.', 'The room is cold.'), 'temp'],
    [t('Lihat cat dindingnya.', 'Look at the wall paint.'), 'wallpaint'],
    [t('Ada yang ingin masuk.', 'Something wants to come in.'), 'invite'],
    [t('Tutup lubangnya.', 'Seal the hole.'), 'hammer'],
    [t('Minta palunya mengecat dinding.', 'Ask the hammer to paint the walls.'), 'hammer'],
    ['', '']
  ];

  let toastT = 0;
  const toast = (title, text) => {
    const el = $('#toast'); el.innerHTML = `<small>${esc(t('Rumah', 'Home'))}</small><b>${esc(title)}</b>${text ? '<br>' + esc(text) : ''}`; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3800);
  };
  const shake = id => { const el = document.querySelector(`[data-tile="${id}"]`); if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  const reveal = n => {
    if (n <= S.shown || n > TOTAL) return;
    S.shown = n; S.at[n - 1] = Date.now();
    if (n === TOTAL && !S.done) { S.done = true; if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); } }
    save(); render(true);
    $('#announcement').textContent = `${ev(n - 1)[0]} · ${ev(n - 1)[1]}`;
  };

  // Tindakan
  const ACT = {
    add: () => { S.brush = 'on'; S.paint = 12; S.days = 1; toast(t('Aksesori baru ditemukan', 'New accessory found'), t('Kuas · entah sejak kapan', 'Brush · since who knows when')); reveal(2); },
    paint: () => {
      if (S.brush !== 'on') return; S.days++; S.paint = Math.min(100, S.paint + 16);
      if (S.paint >= 70 && S.small === 'none') { S.small = 'room'; reveal(3); } else { save(); render(); }
    },
    draw: () => { toast(t('Kuas kecil', 'Small brush'), t('Takut: Kuas bisa terluka.', 'Afraid: it might hurt the brush.')); shake('small'); },
    corner: () => { S.small = 'corner'; S.brush = 'stopped'; S.paint = 100; reveal(4); },
    scene: () => {
      if (S.scene !== 'idle') return;
      const fail = () => { S.scene = 'failed'; S.items = 208; reveal(5); };
      if (calm()) { fail(); return; }
      S.scene = 'running'; render(); setTimeout(fail, 1600);
    },
    soft: () => { S.brush = 'noresp'; toast(t('Kuas', 'Brush'), t('Tidak Ada Respons', 'No Response')); reveal(6); },
    letgo: () => { S.brush = 'gone'; toast(t('Kuas dihapus', 'Brush removed'), t('Lewat celah dinding beton.', 'Through the cracks in the concrete.')); save(); render(); },
    push: v => {
      if (S.brush !== 'gone' || S.wall !== 'ok') return; S.push = clamp(v, 0, 100);
      if (S.push >= 100) { S.wall = 'broken'; S.items = 2; S.coldAt = Date.now(); toast(t('Dinding Timur', 'East Wall'), t('Jebol. Hampir semuanya dibuang.', 'Broken open. Almost everything thrown out.')); reveal(7); }
      else { const m = $('[data-tile="wall"] .meter i'); if (m) m.style.setProperty('--v', S.push); const st = $('[data-tile="wall"] .t-status'); if (st) st.textContent = t(`Utuh · beban ${Math.round(S.push)}%`, `Intact · load ${Math.round(S.push)}%`); saveSoon(); }
    },
    warm: () => { toast(t('Suhu', 'Temperature'), t('Tidak ada yang bisa menghangatkannya.', 'Nothing can warm it.')); shake('temp'); reveal(8); },
    look: () => { if (S.shown >= 8) reveal(9); },
    allow: () => { S.hammer = true; toast(t('Palu & Paku', 'Hammer & Nail'), t('Datang dengan ramah, dan senyum.', 'Arrived with kindness, and a smile.')); reveal(10); },
    later: () => { toast(t('Palu & Paku', 'Hammer & Nail'), t('Masih menunggu di luar lubang.', 'Still waiting outside the hole.')); },
    seal: () => { S.wall = 'sealed'; S.nails = 1; S.warmAt = Date.now(); reveal(11); },
    build: () => { S.built++; const names = [t('kursi', 'a chair'), t('rak', 'a shelf'), t('lemari kecil', 'a small cupboard'), t('bangku', 'a bench')]; toast(t('Palu', 'Hammer'), t('Perabot baru: ', 'New furniture: ') + names[(S.built - 1) % names.length] + '.'); save(); render(); },
    paintWall: () => { toast(t('Palu', 'Hammer'), t('Tidak mendukung pengecatan.', 'Does not support painting.')); shake('hammer'); reveal(12); },
    pull: () => { toast(t('Paku', 'Nail'), t('Terikat pada Palu. Tidak bisa dilepas.', 'Bound to the Hammer. Cannot be removed.')); shake('nail'); }
  };
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };

  // Tampilan
  const tile = (id, ico, name, status, { on = false, dim = false, wide = false, dashed = false, cls = '', acts = '', extra = '' } = {}) =>
    `<div class="tile${on ? ' on' : ''}${dim ? ' dim' : ''}${wide ? ' wide' : ''}${dashed ? ' dashed' : ''}" data-tile="${id}"><div class="t-head"><span class="t-ico">${icon(ico)}</span><span><span class="t-name">${esc(name)}</span><br><span class="t-status ${cls}">${status}</span></span></div>${extra}${acts ? `<div class="t-acts">${acts}</div>` : ''}</div>`;
  const btn = (act, label, main) => `<button type="button" data-act="${act}"${main ? ' class="main"' : ''}>${esc(label)}</button>`;
  const renderTiles = () => {
    const s = S.shown - 1, out = [];
    out.push(tile('door', 'door', t('Pintu', 'Door'), t('Tidak ditemukan', 'Not found'), { cls: 'warn', acts: btn('door', t('Buka', 'Open')) }));
    const full = Math.round(S.items / 220 * 100);
    out.push(tile('items', 'box', t('Barang', 'Belongings'), S.wall === 'ok' ? t(`${S.items} benda · ${full}% penuh`, `${S.items} items · ${full}% full`) + (S.scene === 'failed' ? t(' · perabot rusak', ' · furniture broken') : '') : t('2 benda · buku kecil, meja', '2 items · a small book, a desk'), {
      wide: S.brush === 'gone' && S.wall === 'ok', extra: S.brush === 'gone' && S.wall === 'ok' ? `<label class="sr-only" for="push">${t('Dorong semua barang ke Dinding Timur', 'Push everything against the East Wall')}</label><input type="range" id="push" min="0" max="100" value="${S.push}" aria-describedby="pushHelp"><span class="t-status" id="pushHelp">${t('Geser: dorong semua ke satu sisi, ke Dinding Timur', 'Slide: push everything to one side, against the East Wall')}</span>` : `<div class="meter"><i style="--v:${full}"></i></div>`, acts: S.brush === 'none' ? btn('tidy', t('Rapikan', 'Tidy')) : '' }));
    if (S.brush === 'none') out.push(tile('add', 'plus', t('Tambah aksesori', 'Add accessory'), t('Cari perangkat di dekatmu', 'Find a device nearby'), { dashed: true, acts: btn('add', t('Tambah', 'Add'), true) }));
    if (S.brush !== 'none' && S.brush !== 'gone') {
      const st = S.brush === 'on' ? t(`Mengecat · warna manis · ${S.paint}%`, `Painting · a sweet colour · ${S.paint}%`) : S.brush === 'stopped' ? t('Berhenti mengecat · warna pekat 100%', 'Stopped painting · heavy colour 100%') : t('Tidak Ada Respons', 'No Response');
      const acts = S.brush === 'on' ? btn('paint', t(`Cat · hari ke-${S.days}`, `Paint · day ${S.days}`), true) : S.brush === 'stopped' && S.scene === 'failed' ? btn('soft', t('Cat lagi · warna lembut', 'Paint again · softer colour'), true) : S.brush === 'noresp' ? btn('soft2', t('Cat lagi', 'Paint again')) + btn('letgo', t('Lepaskan', 'Let it go'), true) : '';
      out.push(tile('brush', 'brush', t('Kuas', 'Brush'), st, { on: S.brush === 'on', cls: S.brush === 'noresp' ? 'warn' : '', acts, extra: `<div class="meter" style="--c:${S.brush === 'noresp' ? 'var(--warn)' : 'var(--accent)'}"><i style="--v:${S.paint}"></i></div>` }));
    }
    if (S.small !== 'none') out.push(tile('small', 'pen', t('Kuas kecil', 'Small brush'), S.small === 'room' ? t('Belum pernah menggambar', 'Has never drawn anything') : t('Pojok terjauh · mati', 'The farthest corner · off'), { dim: S.small === 'corner', acts: S.small === 'room' ? btn('draw', t('Gambar', 'Draw')) + btn('corner', t('Pindahkan ke pojok terjauh', 'Move to the farthest corner'), true) : '' }));
    if (s >= 3) out.push(tile('scene', 'scene', t('Rapikan perabot', 'Tidy the furniture'), S.scene === 'idle' ? t('Adegan · pelan-pelan, asal jelas tujuannya', 'Scene · slowly, as long as the goal is clear') : S.scene === 'running' ? t('Berjalan…', 'Running…') : t('Gagal · 6 perabot rusak', 'Failed · 6 pieces broken'), { on: S.scene === 'running', cls: S.scene === 'failed' ? 'warn' : '', acts: S.scene === 'idle' ? btn('scene', t('Jalankan', 'Run'), true) : '' }));
    if (S.brush === 'gone' || S.wall !== 'ok') {
      const st = S.wall === 'ok' ? t(`Utuh · beban ${Math.round(S.push)}%`, `Intact · load ${Math.round(S.push)}%`) : S.wall === 'broken' ? t('Jebol · terbuka', 'Broken · open') : t('Papan kayu · 1 paku', 'A wooden plank · 1 nail');
      out.push(tile('wall', 'wall', t('Dinding Timur', 'East Wall'), st, { cls: S.wall === 'broken' ? 'warn' : '', extra: S.wall === 'ok' ? `<div class="meter" style="--c:var(--warn)"><i style="--v:${S.push}"></i></div>` : '' }));
    }
    if (S.wall !== 'ok') {
      const tp = temp();
      out.push(tile('temp', 'temp', t('Suhu', 'Temperature'), `<span id="tempNow">${dec(tp)}°</span> · ${S.wall === 'broken' ? t('turun', 'falling') : t('tidak lagi dingin', 'no longer cold')}`, { cls: S.wall === 'broken' ? 'cold' : '', acts: S.wall === 'broken' ? btn('warm', t('Naikkan', 'Raise'), s === 6) : '' }));
      out.push(tile('wallpaint', 'paint', t('Cat dinding', 'Wall paint'), t(`Kusam · mengelupas <span id="peelNow">${peel()}</span>%`, `Dull · peeling <span id="peelNow">${peel()}</span>%`), { cls: 'warn', acts: s >= 7 && s < 8 ? btn('look', t('Lihat', 'Look'), true) : '' }));
    }
    if (S.hammer) {
      out.push(tile('hammer', 'hammer', t('Palu', 'Hammer'), S.wall === 'broken' ? t('Siap · cekatan', 'Ready · deft') : t(`Membangun · ${S.built} perabot baru`, `Building · ${S.built} new pieces`), { on: true, acts: S.wall === 'broken' ? btn('seal', t('Tutup lubang', 'Seal the hole'), true) : btn('build', t('Buat perabot', 'Build furniture')) + btn('paintWall', t('Cat dinding', 'Paint the walls'), s === 10) }));
      if (S.nails) out.push(tile('nail', 'nail', t('Paku', 'Nail'), t('1 · tertanam di Dinding Timur', '1 · driven into the East Wall'), { acts: btn('pull', t('Lepas', 'Remove')) }));
    }
    $('#tiles').innerHTML = out.join('');
    const cue = NEXT[s]?.[1]; if (cue && cue !== 'invite') document.querySelector(`[data-tile="${cue}"]`)?.classList.add('cue');
    $('#push')?.addEventListener('input', e => ACT.push(+e.target.value));
  };
  $('#tiles').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
    if (a === 'door') { toast(t('Pintu', 'Door'), t('Kamar ini tidak punya pintu.', 'This room has no door.')); shake('door'); return; }
    if (a === 'tidy') { toast(t('Barang', 'Belongings'), t('Tidak ada tangan untuk merapikannya.', 'No hands to sort them out.')); shake('items'); return; }
    if (a === 'soft2') { toast(t('Kuas', 'Brush'), t('Tidak Ada Respons', 'No Response')); shake('brush'); return; }
    ACT[a]?.();
  });
  const renderSummary = () => {
    const tp = temp(), cold = S.wall === 'broken';
    $('#summary').innerHTML = [
      `<li class="${cold ? 'cold' : ''}">${icon('temp')}<span id="sumTemp">${dec(tp)}°</span></li>`,
      `<li class="warn">${icon('door')}${t('Tanpa pintu', 'No door')}</li>`,
      `<li>${icon('box')}${S.wall === 'ok' ? t(`${Math.round(S.items / 220 * 100)}% penuh`, `${Math.round(S.items / 220 * 100)}% full`) : t('hampir kosong', 'nearly empty')}</li>`,
      `<li>${icon('paint')}${S.wall !== 'ok' ? t('cat mengelupas', 'paint peeling') : S.paint >= 70 ? t('warna pekat', 'heavy colour') : S.paint ? t('warna manis', 'a sweet colour') : t('belum dicat', 'unpainted')}</li>`
    ].join('');
  };
  const when = i => { const at = S.at[i]; return at ? new Date(at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }) : ''; };
  const renderNow = fresh => {
    const i = S.shown - 1, [a, b, k] = ev(i), next = NEXT[i]?.[0];
    $('#now').innerHTML = `<p class="event"><span class="ev-ico">${icon(k)}</span><b>${esc(a)}</b> · ${esc(b)}<span class="when">${when(i)}</span></p><p class="text${fresh ? ' fresh' : ''}" id="p-${i}">${inline(body[i])}</p>${next && !S.done ? `<p class="next">${esc(next)}</p>` : ''}${S.done ? `<div class="end"><a href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button type="button" id="again">${t('Mulai lagi', 'Start again')}</button></div>${G.next(SLUG)}` : ''}`;
    $('#again')?.addEventListener('click', () => { S = blank(); save(); render(true); });
  };
  const renderInvite = () => {
    const show = S.shown === 9 && !S.hammer;
    $('#invite').hidden = !show; if (!show) return;
    $('#invite').innerHTML = `<small>${t('Aksesori di dekatmu', 'Accessory nearby')}</small><p><b>${t('Palu & Paku', 'Hammer & Nail')}</b> · ${t('ingin masuk untuk membantu menutup lubang.', 'would like to come in and help seal the hole.')}</p><div class="acts"><button type="button" data-inv="later">${t('Nanti', 'Later')}</button><button type="button" class="yes" data-inv="allow">${t('Izinkan', 'Allow')}</button></div>`;
  };
  $('#invite').addEventListener('click', e => { const b = e.target.closest('[data-inv]'); if (b) ACT[b.dataset.inv](); });
  const renderHistory = () => {
    const items = [];
    for (let i = S.shown - 2; i >= 0; i--) { const [a, b] = ev(i); items.push(`<li data-i="${i}"><button type="button" aria-expanded="false"><b>${esc(a)}</b>· ${esc(b)}<span>${when(i)}</span></button><p class="text" id="p-${i}">${inline(body[i])}</p></li>`); }
    $('#history').innerHTML = items.join('') || `<li class="empty">${t('Belum ada riwayat.', 'No history yet.')}</li>`;
  };
  $('#history').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const li = b.parentElement; li.toggleAttribute('data-open'); b.setAttribute('aria-expanded', String(li.hasAttribute('data-open'))); });
  function render(fresh) {
    renderSummary(); renderNow(fresh); renderInvite(); renderTiles(); renderHistory();
    if (fresh && S.shown > 1) $('#now').scrollIntoView({ block: 'start', behavior: calm() ? 'instant' : 'smooth' });
    guide();
  }
  // panduan: posisi bait dan tombol yang ditunggu (ditunjuk kalau di luar layar)
  function guide() {
    $('#stepChip').hidden = false; G.step(S.shown, TOTAL);
    const s = S.shown - 1;
    const sel = S.done ? null : ["[data-act='add']", "[data-act='paint']", "[data-act='corner']", "[data-act='scene']", "[data-act='soft']", S.brush === 'noresp' ? "[data-act='letgo']" : '#push', "[data-act='warm']", "[data-act='look']", "[data-inv='allow']", "[data-act='seal']", "[data-act='paintWall']"][s];
    G.want(sel || null, NEXT[s]?.[0] || '');
  }
  // suhu dan cat yang mengelupas berubah sendiri
  setInterval(() => {
    if (S.wall === 'ok') return; const tp = dec(temp()) + '°';
    if ($('#sumTemp')) $('#sumTemp').textContent = tp; if ($('#tempNow')) $('#tempNow').textContent = tp; if ($('#peelNow')) $('#peelNow').textContent = peel();
  }, 1000);

  // Tautan #baca-N dari situs utama: tindakan sebelumnya dianggap sudah dilakukan
  const STEPS = [null, 'add', 'paint', 'corner', 'scene', 'soft', 'push', 'warm', 'look', 'allow', 'seal', 'paintWall'];
  const follow = () => {
    const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (!m || S.done) return;
    const want = clamp((m[1] != null ? +m[1] : 0) + 1, 1, TOTAL);
    const keepCalm = root.hasAttribute('data-calm'); root.setAttribute('data-calm', '');
    let guard = 0;
    while (S.shown < want && guard++ < 40) {
      const step = STEPS[S.shown];
      if (step === 'paint') { while (S.small === 'none') ACT.paint(); }
      else if (step === 'push') { ACT.letgo(); ACT.push(100); }
      else ACT[step]?.();
    }
    if (!keepCalm) root.removeAttribute('data-calm');
    $('#toast').hidden = true; save(); render();
  };
  addEventListener('hashchange', follow);

  let fontSize = clamp(+object(store.get('rd', {})).size || 18, 15, 26);
  const setSize = d => { fontSize = clamp(fontSize + d, 15, 26); root.style.setProperty('--size', fontSize + 'px'); store.set('rd', { ...object(store.get('rd', {})), size: fontSize }); $('#smaller').disabled = fontSize === 15; $('#bigger').disabled = fontSize === 26; };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { save(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => $('#settingsDialog').showModal();
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  G.mount({ slug: SLUG, title, helpInto: '#topRight', stepInto: '#stepChip',
    lede: t('Puisi ini dibaca di aplikasi Rumah: satu kamar, tanpa pintu.', 'This poem is read in the Home app: one room, no door.'),
    steps: [t('Baca peristiwa terbaru di atas.', 'Read the latest event at the top.'), t('Kartu aksesori yang berdenyut sedang menunggu. Sentuh tombolnya untuk membuka bait berikutnya.', 'The pulsing accessory card is waiting. Tap its button to open the next stanza.'), t('Kalau kartunya di bawah layar, ikuti tombol ↓ yang muncul.', 'If the card is below the screen, follow the ↓ button that appears.'), t('Bait yang sudah lewat tersimpan di Riwayat.', 'Past stanzas are kept in History.')] });
  render(); follow(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
