/* The Moon Behind My Eyes: puisi dibaca di aplikasi Kamera mode malam.
   Pembaca memotret langit dari balik jendela; setiap foto menyimpan satu bait sebagai keterangannya.
   Bintang terdeteksi tepat setiap detik, bulan tidak pernah. Setelah tirai ditarik dan pembaca
   membelakangi kaca, kameranya dibalik: menahan tombol rana memejamkan mata, dan bulan ada di baliknya.
   "I was just looking through the wrong window." Larik dimuat utuh dari content/works.json.
   Kamera sungguhan tidak dipakai; semua gambar dilukis di kanvas. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'kamera:state'];
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
    backLabel: ['Meja tulis', 'Writing desk'], nightLabel: ['3 dtk', '3 s'], focusLabel: ['Fokus', 'Focus'], kicker: ['Puisi · Juan', 'Poem · Juan'], galleryTitle: ['Galeri', 'Photos'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  $('#modes').innerHTML = `<span data-mode="malam">${t('MALAM', 'NIGHT')}</span><span data-mode="foto">${t('FOTO', 'PHOTO')}</span><span data-mode="potret">${t('POTRET', 'PORTRAIT')}</span>`;
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['thumb', t('Buka galeri', 'Open photos')], ['flip', t('Balik kamera', 'Flip camera')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $('.camera').setAttribute('aria-label', t('Kamera', 'Camera'));
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
  if (!work || !Array.isArray(work.body) || !work.body.length) { $('#capPhoto').innerHTML = `<p class="cap-hint">${t('Puisinya belum bisa dimuat.', 'The poem could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; $('#shutter').disabled = true; return; }
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
  const stanzaOf = m => stanzas.findIndex(ls => ls.some(l => m.some(x => x && plain(l).includes(x))));
  const AT = { stars: stanzaOf(['The stars arrived', 'Bintang']), curtains: stanzaOf(['I drew the curtains', 'tirai']), turn: stanzaOf(['I turned my back to the glass', 'membelakangi']), inner: stanzaOf(['There it was.', 'Itu dia']) };
  // bait sebelum "There it was." dipotret dari jendela; sisanya hanya terbaca di balik mata
  const REAR = AT.inner > 0 ? AT.inner : Math.max(1, stanzas.length - 2);
  const INNER = stanzas.slice(REAR).flatMap((ls, k) => [...(k ? [null] : []), ...ls]);

  // Keadaan kamera
  const blank = () => ({ photos: [], front: false, close: 0, focus: .18, starsFrom: null, revealed: 0, done: false });
  let S = PREVIEW ? blank() : { ...blank(), ...object(store.get('kamera:state', {})) };
  S.photos = array(S.photos).filter(p => p && Number.isInteger(p.s)).slice(0, REAR + 1); S.focus = clamp(+S.focus || 0, 0, 1); S.close = clamp(+S.close || 0, 0, 1); S.revealed = clamp(+S.revealed || 0, 0, INNER.length);
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const rearShots = () => S.photos.filter(p => p.kind !== 'front').length;
  const save = () => {
    store.set('kamera:state', S);
    const progress = S.done ? 1 : rearShots() / (REAR + 1);
    store.set('prog', { ...object(store.get('prog', {})), [SLUG]: +progress.toFixed(4) }); store.set('last', { key: SLUG, at: Date.now() });
  };
  const starCount = () => S.starsFrom ? clamp(6 + Math.floor((Date.now() - S.starsFrom) / 1000), 6, 240) : 4;
  const moonPct = (() => { const p = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1 + 1) % 1; return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100); })();

  // Lukisan jendela bidik
  const rand = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const STARS = (() => { const r = rand(19); return Array.from({ length: 240 }, () => [r(), r() * .62, r() < .14 ? 1.6 : r() * .7 + .5, r() * 6]); })();
  const drawRear = (c, w, h, p, time = 0) => {
    c.fillStyle = '#07080c'; c.fillRect(0, 0, w, h);
    const x0 = w * .1, y0 = h * .07, ww = w * .8, wh = h * .82;
    const sky = c.createLinearGradient(0, y0, 0, y0 + wh); sky.addColorStop(0, '#04060e'); sky.addColorStop(.55, '#0b1124'); sky.addColorStop(1, '#1a2240');
    c.fillStyle = sky; c.fillRect(x0, y0, ww, wh);
    // kabar tentang bulan: hanya semburat yang hampir tidak ada di sudut kaca
    const rg = c.createRadialGradient(x0 + ww * 1.02, y0 - wh * .02, 0, x0 + ww * 1.02, y0 - wh * .02, ww * .45); rg.addColorStop(0, 'rgba(200,210,235,.10)'); rg.addColorStop(1, 'rgba(200,210,235,0)');
    c.fillStyle = rg; c.fillRect(x0, y0, ww, wh);
    for (let i = 0; i < Math.min(p.stars, STARS.length); i++) {
      const [sx, sy, sz, ph] = STARS[i], a = .55 + .45 * Math.sin(time * 1.3 + ph);
      c.fillStyle = `rgba(255,255,255,${(.5 + a * .5).toFixed(3)})`; c.beginPath(); c.arc(x0 + sx * ww, y0 + sy * wh, sz * (w / 360), 0, 7); c.fill();
    }
    // cakrawala yang dihafal, halaman yang kosong
    c.fillStyle = '#0a0d18'; c.beginPath(); c.moveTo(x0, y0 + wh * .7);
    for (let i = 0; i <= 20; i++) c.lineTo(x0 + ww * i / 20, y0 + wh * (.69 + .018 * Math.sin(i * 1.7) + .01 * Math.sin(i * 4.1)));
    c.lineTo(x0 + ww, y0 + wh); c.lineTo(x0, y0 + wh); c.fill();
    c.fillStyle = '#05070d'; c.fillRect(x0, y0 + wh * .8, ww, wh * .2);
    c.strokeStyle = '#0f1426'; c.lineWidth = Math.max(1, w / 260);
    c.beginPath(); c.moveTo(x0, y0 + wh * .785); c.lineTo(x0 + ww, y0 + wh * .785);
    for (let i = 1; i < 12; i++) { c.moveTo(x0 + ww * i / 12, y0 + wh * .76); c.lineTo(x0 + ww * i / 12, y0 + wh * .83); }
    c.stroke();
    // kusen
    c.fillStyle = '#121318'; const m = w * .022;
    c.fillRect(x0 + ww / 2 - m / 2, y0, m, wh); c.fillRect(x0, y0 + wh * .46 - m / 2, ww, m);
    c.strokeStyle = '#121318'; c.lineWidth = w * .03; c.strokeRect(x0, y0, ww, wh);
    c.fillStyle = '#16171c'; c.fillRect(x0 - w * .05, y0 + wh + w * .012, ww + w * .1, h * .035);
    // tirai
    const cw = ww * (.07 + p.close * .44), fold = (x, width, flip) => {
      const g = c.createLinearGradient(x, 0, x + width, 0), n = 7;
      for (let i = 0; i <= n; i++) g.addColorStop(i / n, i % 2 ? '#211d27' : '#2d2834');
      c.fillStyle = g; c.fillRect(x, y0 - h * .03, width, wh + h * .06);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(flip ? x : x + width - 3, y0 - h * .03, 3, wh + h * .06);
    };
    fold(x0 - w * .02, cw + w * .02, false); fold(x0 + ww - cw, cw + w * .02, true);
  };
  const HEAD = (w, h) => ({ cx: w * .5, cy: h * .43, rx: w * .19, ry: h * .175 });
  const drawFront = (c, w, h, p, time = 0) => {
    const bg = c.createRadialGradient(w * .5, h * .4, 0, w * .5, h * .4, h * .8); bg.addColorStop(0, '#0d0e13'); bg.addColorStop(1, '#030305');
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    // di belakang: jendela bertirai yang sudah dibelakangi
    c.fillStyle = 'rgba(42,37,50,.45)'; c.fillRect(w * .62, h * .06, w * .3, h * .3);
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 6; i++) c.fillRect(w * .62 + i * w * .05, h * .06, w * .012, h * .3);
    const H = HEAD(w, h);
    c.fillStyle = '#101116'; c.strokeStyle = 'rgba(150,160,190,.22)'; c.lineWidth = Math.max(1.5, w / 200);
    c.beginPath(); c.moveTo(w * .04, h); c.bezierCurveTo(w * .1, h * .74, w * .3, h * .7, w * .42, h * .66); c.lineTo(w * .42, h * .58); c.lineTo(w * .58, h * .58); c.lineTo(w * .58, h * .66);
    c.bezierCurveTo(w * .7, h * .7, w * .9, h * .74, w * .96, h); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(H.cx, H.cy, H.rx, H.ry, 0, 0, 7); c.fill(); c.stroke();
    // bulan di balik mata: muncul saat mata terpejam, makin terang setiap larik yang terbaca
    const glow = clamp(p.moon, 0, 1) * clamp(p.shut, 0, 1);
    if (glow > .01) {
      c.save(); c.beginPath(); c.ellipse(H.cx, H.cy, H.rx, H.ry, 0, 0, 7); c.clip();
      const r = H.rx * (.34 + .16 * glow), my = H.cy - H.ry * .22 + Math.sin(time * .6) * 1.5;
      // pendar di sekeliling, lalu cakram bulan yang pucat dan tenang
      const halo = c.createRadialGradient(H.cx, my, r * .9, H.cx, my, r * 2.6); halo.addColorStop(0, `rgba(214,222,240,${(.3 * glow).toFixed(3)})`); halo.addColorStop(1, 'rgba(214,222,240,0)');
      c.fillStyle = halo; c.fillRect(H.cx - H.rx, H.cy - H.ry, H.rx * 2, H.ry * 2);
      const disc = c.createRadialGradient(H.cx - r * .3, my - r * .3, r * .1, H.cx, my, r); disc.addColorStop(0, `rgba(247,248,252,${(.97 * glow).toFixed(3)})`); disc.addColorStop(.7, `rgba(222,227,238,${(.92 * glow).toFixed(3)})`); disc.addColorStop(1, `rgba(186,194,212,${(.85 * glow).toFixed(3)})`);
      c.fillStyle = disc; c.beginPath(); c.arc(H.cx, my, r, 0, 7); c.fill();
      c.fillStyle = `rgba(150,160,182,${(.28 * glow).toFixed(3)})`;
      [[-.3, -.15, .2], [.25, .2, .14], [.05, -.42, .1], [-.12, .35, .09]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(H.cx + dx * r, my + dy * r, rr * r, 0, 7); c.fill(); });
      // retakan pikiran tempat cahayanya tumpah
      c.strokeStyle = `rgba(232,236,248,${(.16 * glow).toFixed(3)})`; c.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .3; c.beginPath(); c.moveTo(H.cx + Math.cos(a) * r * 1.15, my + Math.sin(a) * r * 1.15); c.lineTo(H.cx + Math.cos(a) * H.rx * 1.1, my + Math.sin(a) * H.ry * 1.1); c.stroke(); }
      c.restore();
      const out = c.createRadialGradient(H.cx, H.cy, H.rx, H.cx, H.cy, H.rx * 2.2); out.addColorStop(0, `rgba(214,222,240,${(.12 * glow).toFixed(3)})`); out.addColorStop(1, 'rgba(214,222,240,0)');
      c.fillStyle = out; c.fillRect(0, 0, w, h);
    }
    // mata
    const ey = H.cy - H.ry * .02, ew = w * .072, open = 1 - clamp(p.shut, 0, 1);
    [-1, 1].forEach(sd => {
      const ex = H.cx + sd * w * .078;
      if (open > .04) {
        c.fillStyle = `rgba(214,220,232,${(.38 * open).toFixed(3)})`; c.beginPath(); c.ellipse(ex, ey, ew / 2, h * .016 * open, 0, 0, 7); c.fill();
        c.save(); c.beginPath(); c.ellipse(ex, ey, ew / 2, h * .016 * open, 0, 0, 7); c.clip(); c.fillStyle = '#05060a'; c.beginPath(); c.arc(ex, ey, h * .012, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(ex + h * .004, ey - h * .004, h * .0028, 0, 7); c.fill(); c.restore();
      }
      c.strokeStyle = `rgba(170,178,200,${(.35 + .25 * (1 - open)).toFixed(3)})`; c.lineWidth = Math.max(1.2, w / 260);
      c.beginPath(); c.moveTo(ex - ew / 2, ey); c.quadraticCurveTo(ex, ey + h * .016 * (1 - open) + h * .004, ex + ew / 2, ey); c.stroke();
    });
  };
  const scene = $('#scene'), sx = scene.getContext('2d');
  let W = 0, Hh = 0;
  const size = () => { const r = scene.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = r.width; Hh = r.height; scene.width = Math.round(W * dpr); scene.height = Math.round(Hh * dpr); sx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  let shut = 0, holding = false, T = 0;
  const live = () => ({ focus: S.focus, close: S.close, stars: starCount(), shut, moon: S.done ? 1 : .35 + .65 * (S.revealed / Math.max(1, INNER.length)) });
  const paint = () => { if (!W) size(); if (S.front) drawFront(sx, W, Hh, live(), T); else drawRear(sx, W, Hh, live(), T); };
  const snapshot = p => {
    const c = document.createElement('canvas'); c.width = 360; c.height = 480; const x = c.getContext('2d');
    if (p.kind === 'front') drawFront(x, 360, 480, { shut: 1, moon: 1 }, 0);
    else { if ('filter' in x) x.filter = `blur(${((1 - p.focus) * 6).toFixed(2)}px)`; drawRear(x, 360, 480, p, 0); }
    try { return c.toDataURL('image/jpeg', .82); } catch (_) { return ''; }
  };
  const urls = new Map(); const urlOf = (p, i) => { if (!urls.has(i)) urls.set(i, snapshot(p)); return urls.get(i); };

  // Fokus: kaca yang dijaga bening, cakrawala yang lurus
  let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };
  const setFocus = v => {
    S.focus = clamp(v, 0, 1); $('#focus').value = Math.round(S.focus * 100); $('#focusVal').textContent = Math.round(S.focus * 100) + '%';
    scene.style.filter = S.front ? '' : `blur(${((1 - S.focus) * 9).toFixed(2)}px) brightness(${(.85 + S.focus * .15).toFixed(2)})`;
    $('#level').style.setProperty('--tilt', ((1 - S.focus) * 5).toFixed(2) + 'deg'); root.toggleAttribute('data-level', S.focus >= .85 && !S.front);
  };
  $('#focus').addEventListener('input', e => { setFocus(+e.target.value / 100); renderHint(); saveSoon(); });

  // Ketuk untuk fokus, seret untuk menarik tirai
  const vf = $('#viewfinder'); let drag = null;
  const curtainsOpenable = () => AT.curtains >= 0 && rearShots() > AT.curtains;
  vf.addEventListener('pointerdown', e => { if (S.front) return; drag = { x: e.clientX, close: S.close, moved: false }; });
  vf.addEventListener('pointermove', e => {
    if (!drag || S.front) return; const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 8) drag.moved = true;
    if (drag.moved && curtainsOpenable()) { S.close = clamp(drag.close + Math.abs(dx) / (vf.clientWidth * .45), 0, 1); }
  });
  const endDrag = e => {
    if (!drag) return; const was = drag; drag = null;
    if (!was.moved && e.type === 'pointerup') {
      const r = vf.getBoundingClientRect(), fb = $('#focusBox'); fb.style.setProperty('--fx', (e.clientX - r.left) + 'px'); fb.style.setProperty('--fy', (e.clientY - r.top) + 'px');
      fb.classList.remove('on'); void fb.offsetWidth; fb.classList.add('on'); setFocus(Math.min(1, S.focus + .3)); renderHint(); saveSoon();
    } else { if (S.close > .6) S.close = 1; render(); save(); }
  };
  vf.addEventListener('pointerup', endDrag); vf.addEventListener('pointercancel', endDrag);

  // Memotret: mode malam menahan rana tiga detik
  let exposing = false;
  const exposure = () => new Promise(res => {
    exposing = true; $('#shutter').disabled = true;
    const total = calm() ? 0 : 3000, t0 = performance.now();
    const step = () => {
      const k = total ? clamp((performance.now() - t0) / total, 0, 1) : 1;
      $('#shutter').style.setProperty('--exp', k); $('#exposure').textContent = k < 1 ? String(Math.ceil(3 - k * 3)) : '';
      if (k < 1) { requestAnimationFrame(step); return; }
      $('#shutter').style.setProperty('--exp', 0);
      const fl = $('#flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
      exposing = false; $('#shutter').disabled = false; res();
    };
    step();
  });
  let hintT = 0; const hint = text => { $('#vfHint').textContent = text; clearTimeout(hintT); hintT = setTimeout(renderHint, 3800); };
  const takeRear = async () => {
    if (exposing) return;
    const n = rearShots();
    if (n >= REAR) { hint(t('Kamu sudah membelakangi kaca. Balik kamera.', 'You turned your back to the glass. Flip the camera.')); $('#flip').classList.add('cue'); return; }
    // bait tentang membelakangi kaca: tirai menutup sendiri kalau belum ditarik
    if (AT.turn >= 0 && n === AT.turn && S.close < 1) S.close = 1;
    await exposure();
    S.photos.push({ s: n, kind: 'rear', focus: +S.focus.toFixed(2), close: +S.close.toFixed(2), stars: starCount(), at: Date.now() });
    if (AT.stars >= 0 && n === AT.stars && !S.starsFrom) S.starsFrom = Date.now();
    save(); render(true);
    $('#announcement').textContent = t(`Foto ${S.photos.length} tersimpan.`, `Photo ${S.photos.length} saved.`);
  };

  // Kamera depan: tahan rana untuk memejam
  let revealT = 0, raf = 0;
  const eyesClosed = () => shut >= .98;
  const finishPhoto = () => {
    if (S.done) return; S.revealed = INNER.length; S.done = true; clearTimeout(revealT);
    S.photos.push({ s: REAR, kind: 'front', at: Date.now() });
    if (!done.has(SLUG)) { done.add(SLUG); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] }); }
    save(); render(true);
    const fl = $('#flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on');
    $('#announcement').textContent = t('Bulan terdeteksi. Foto tersimpan.', 'Moon detected. Photo saved.');
  };
  const revealNext = () => {
    clearTimeout(revealT); if (!eyesClosed() || S.done) return;
    S.revealed++; if (INNER[S.revealed - 1] == null && S.revealed < INNER.length) S.revealed++;
    save(); renderCaption(true);
    revealT = S.revealed >= INNER.length ? setTimeout(finishPhoto, 1300) : setTimeout(revealNext, 1850);
  };
  const animate = () => {
    raf = 0; const target = holding ? 1 : 0, was = eyesClosed();
    shut = calm() ? target : clamp(shut + (target ? 1 / 50 : -1 / 18), 0, 1);
    const now = eyesClosed();
    if (now !== was) {
      root.toggleAttribute('data-eyes-closed', now); renderDetect();
      if (now && !S.done) { if (calm()) { S.revealed = INNER.length; finishPhoto(); } else revealT = setTimeout(revealNext, S.revealed ? 900 : 1500); }
      else clearTimeout(revealT);
    }
    if (shut !== target) raf = requestAnimationFrame(animate);
  };
  const press = on => { if (!S.front || holding === on) return; holding = on; root.toggleAttribute('data-hold', on); if (!raf) raf = requestAnimationFrame(animate); };
  const shutter = $('#shutter');
  shutter.addEventListener('pointerdown', e => { if (!S.front) return; e.preventDefault(); shutter.setPointerCapture?.(e.pointerId); press(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => shutter.addEventListener(ev, () => press(false)));
  shutter.addEventListener('contextmenu', e => e.preventDefault());
  shutter.addEventListener('click', e => { if (S.front) { e.preventDefault(); return; } takeRear(); });
  addEventListener('keydown', e => { if (e.key === ' ' && S.front && !$$('dialog').some(d => d.open) && !/INPUT/.test(document.activeElement?.tagName)) { e.preventDefault(); if (!e.repeat) press(true); } });
  addEventListener('keyup', e => { if (e.key === ' ') press(false); });
  addEventListener('blur', () => press(false));

  $('#flip').onclick = () => {
    if (!S.front && rearShots() < REAR) { hint(t('Belum. Langitnya masih kamu tunggu.', 'Not yet. You are still waiting on the sky.')); return; }
    press(false); S.front = !S.front; shut = 0; root.removeAttribute('data-eyes-closed');
    $('#flip').classList.toggle('turn', S.front);
    scene.style.transition = 'none'; scene.style.filter = 'blur(14px)'; requestAnimationFrame(() => requestAnimationFrame(() => { scene.style.transition = ''; setFocus(S.focus); }));
    save(); render();
  };
  $('#thumb').onclick = () => { renderGallery(); $('#gallery').showModal(); };

  // Tampilan
  const DETECT = () => {
    if (S.front) return S.done || eyesClosed() ? t('Bulan: <b>terdeteksi</b>', 'Moon: <b>detected</b>') + (S.done && !eyesClosed() ? t(' · di balik mata', ' · behind the eyes') : '') : t('Wajah terdeteksi', 'Face detected');
    const stars = S.starsFrom ? t(`Bintang ${starCount()} · `, `Stars ${starCount()} · `) : '';
    return stars + t(`Bulan: <b>tidak terdeteksi</b> · ${moonPct}% malam ini`, `Moon: <b>not detected</b> · ${moonPct}% tonight`);
  };
  const renderDetect = () => { $('#detect').innerHTML = DETECT(); root.dataset.stars = S.starsFrom ? starCount() : 0; };
  function renderHint() {
    const n = rearShots(); let h = '';
    if (S.front) h = S.done ? '' : t('Tahan rana untuk memejam', 'Hold the shutter to close your eyes');
    else if (!n && S.focus < .85) h = t('Ketuk atau geser fokus sampai jelas', 'Tap or slide the focus until it is sharp');
    else if (curtainsOpenable() && S.close < 1 && n <= AT.turn) h = t('Geser ke samping untuk menarik tirai', 'Drag sideways to draw the curtains');
    else if (n >= REAR) h = t('Balik kamera', 'Flip the camera');
    $('#vfHint').textContent = h;
  }
  const photoMeta = (p, i) => {
    const time = new Date(p.at || Date.now()).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${t('Foto', 'Photo')} ${i + 1} · ${time} · ${p.kind === 'front' ? t('Kamera depan · Potret', 'Front camera · Portrait') : t('Malam 3 dtk', 'Night 3 s') + ` · ${t('fokus', 'focus')} ${Math.round((p.focus || 0) * 100)}%`}`;
  };
  const lines = (ls, fresh) => ls.map(l => l == null ? '<span class="gap"></span>' : `<span class="line${fresh ? ' new' : ''}">${inline(l)}</span>`).join('');
  const renderCaption = fresh => {
    const n = rearShots(), last = S.photos.at(-1);
    let html;
    if (S.front && !S.done) {
      const shown = INNER.slice(0, S.revealed);
      html = `<p class="cap-meta">${t('Kamera depan · Potret', 'Front camera · Portrait')}</p>` + (shown.length ? lines(shown.slice(0, -1)) + lines(shown.slice(-1), fresh) : `<p class="cap-hint">${t('Tahan tombol rana (atau spasi). Lepaskan untuk membuka mata.', 'Hold the shutter (or the space bar). Let go to open your eyes.')}</p>`);
    } else if (last) {
      html = `<p class="cap-meta">${photoMeta(last, S.photos.length - 1)}</p>${lines(last.kind === 'front' ? INNER : stanzas[last.s], fresh)}`;
    } else html = `<p class="cap-hint">${t('Langit malam dari balik jendela. Putar fokus sampai jelas, lalu potret.', 'The night sky through the window. Bring it into focus, then take a photo.')}</p>`;
    $('#capPhoto').innerHTML = html;
    let actions = '';
    if (!S.front && curtainsOpenable() && S.close < 1 && n <= AT.turn) actions += `<button type="button" id="drawCurtains">${t('Tarik tirai', 'Draw the curtains')}</button>`;
    if (!S.front && n >= REAR) actions += `<button type="button" class="main" id="flipNow">${t('Balik kamera', 'Flip the camera')}</button>`;
    if (S.front && !S.done) actions += `<button type="button" class="quiet" id="openEyes">${t('Baca dengan mata terbuka', 'Read with open eyes')}</button>`;
    if (S.done) actions += `<button type="button" id="openGallery">${t('Lihat galeri', 'See the photos')} (${S.photos.length})</button><a href="../../#putar">${t('Kembali ke meja tulis', 'Back to the writing desk')}</a><button type="button" class="quiet" id="again">${t('Mulai lagi', 'Start again')}</button>`;
    $('#capActions').innerHTML = actions;
    $('#drawCurtains')?.addEventListener('click', () => { S.close = 1; render(); save(); });
    $('#flipNow')?.addEventListener('click', () => $('#flip').click());
    $('#openEyes')?.addEventListener('click', () => { S.revealed = INNER.length; finishPhoto(); });
    $('#openGallery')?.addEventListener('click', () => $('#thumb').click());
    $('#again')?.addEventListener('click', () => { S = blank(); urls.clear(); shut = 0; root.removeAttribute('data-eyes-closed'); $('#flip').classList.remove('turn', 'cue'); save(); render(); });
  };
  const renderGallery = () => {
    $('#photos').innerHTML = S.photos.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => `<li><img src="${urlOf(p, i)}" alt="${p.kind === 'front' ? t('Potret dalam gelap; bulan pucat bersinar di balik mata yang terpejam.', 'A portrait in the dark; a pale moon glows behind closed eyes.') : t('Langit malam dari balik jendela, tanpa bulan.', 'The night sky through a window, with no moon.')}"><p class="meta">${photoMeta(p, i)}</p><div>${lines(p.kind === 'front' ? INNER : stanzas[p.s])}</div></li>`).join('') || `<li class="empty">${t('Belum ada foto.', 'No photos yet.')}</li>`;
  };
  function render(fresh) {
    root.toggleAttribute('data-front', S.front); root.toggleAttribute('data-shot', S.photos.length > 0);
    $$('#modes [data-mode]').forEach(m => m.classList.toggle('on', m.dataset.mode === (S.front ? 'potret' : 'malam')));
    $('#shutter').setAttribute('aria-label', S.front ? t('Tahan untuk memejam', 'Hold to close your eyes') : t('Potret', 'Take photo'));
    $('#flip').classList.toggle('cue', !S.front && rearShots() >= REAR);
    const last = S.photos.length - 1;
    if (last >= 0) { $('#thumbImg').src = urlOf(S.photos[last], last); $('#thumbCount').textContent = S.photos.length; if (fresh) { const th = $('#thumb'); th.classList.remove('pop'); void th.offsetWidth; th.classList.add('pop'); } }
    else { $('#thumbImg').removeAttribute('src'); $('#thumbCount').textContent = ''; }
    setFocus(S.focus); renderDetect(); renderHint(); renderCaption(fresh);
  }
  const loop = now => { T = now / 1000; paint(); requestAnimationFrame(loop); };
  setInterval(renderDetect, 1000);

  // Tautan #baca-N dari situs utama: foto sebelumnya diambil seadanya
  const follow = () => {
    const m = /^#baca(?:-(\d+))?$/.exec(location.hash); if (!m || S.done) return;
    const s = clamp(m[1] != null ? +m[1] : 0, 0, stanzas.length - 1), want = Math.min(s + 1, REAR);
    if (rearShots() < want) {
      setFocus(Math.max(S.focus, .9));
      while (rearShots() < want) { const n = rearShots(); if (AT.turn >= 0 && n === AT.turn) S.close = 1; S.photos.push({ s: n, kind: 'rear', focus: S.focus, close: S.close, stars: starCount(), at: Date.now() }); if (AT.stars >= 0 && n === AT.stars && !S.starsFrom) S.starsFrom = Date.now(); }
    }
    if (s >= REAR && !S.front) S.front = true;
    $('#flip').classList.toggle('turn', S.front);
    save(); render();
  };
  addEventListener('hashchange', follow);

  let fontSize = clamp(+object(store.get('rd', {})).size || (innerWidth <= 420 ? 19 : 20), 16, 28);
  const setSize = d => { fontSize = clamp(fontSize + d, 16, 28); root.style.setProperty('--size', fontSize + 'px'); store.set('rd', { ...object(store.get('rd', {})), size: fontSize }); $('#smaller').disabled = fontSize === 16; $('#bigger').disabled = fontSize === 28; };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { save(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); u.hash = ''; store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => { press(false); $('#settingsDialog').showModal(); };
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  addEventListener('resize', size);
  addEventListener('pagehide', () => { press(false); save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { press(false); save(); } });

  if (!PREVIEW) {
    const read = array(store.get('read', [])); if (!read.includes(SLUG)) store.set('read', [...read, SLUG]);
    const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[SLUG] = (+stats.plays[SLUG] || 0) + 1; store.set('stats', stats);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  $('#flip').classList.toggle('turn', S.front);
  size(); render(); follow(); requestAnimationFrame(loop); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
