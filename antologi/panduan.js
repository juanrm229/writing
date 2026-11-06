/* Panduan bersama: kartu "Cara membaca" (sekali di awal, bisa dibuka lagi), penanda langkah,
   dorongan saat pembaca diam, petunjuk ke tombol yang di luar layar, dan tautan ke tulisan berikutnya
   dari malam yang sama. Dipakai oleh puisi-puisi dan arsip catatan. */
(() => {
  'use strict';
  const qs = new URLSearchParams(location.search);
  const EN = (qs.get('lang') || (() => { try { return JSON.parse(localStorage.getItem('jm:lang')); } catch (_) { return null; } })() || 'id') === 'en';
  const t = (id, en) => EN ? en : id;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Urutan malam 19 Juli 2026, dari jam yang tercatat di setiap tulisan.
  const NIGHT = [
    { slug: 'thought-log-001-the-cartesian-void', time: '01.57', href: 'arsip/index.html#thought-log-001-the-cartesian-void', title: 'Thought Log 001', kind: ['catatan', 'note'] },
    { slug: 'thought-log-002-the-dissonant-shell', time: '02.02', href: 'arsip/index.html#thought-log-002-the-dissonant-shell', title: 'Thought Log 002', kind: ['catatan', 'note'] },
    { slug: 'thought-log-003-the-resonance-of-silence', time: '02.06', href: 'arsip/index.html#thought-log-003-the-resonance-of-silence', title: 'Thought Log 003', kind: ['catatan', 'note'] },
    { slug: 'the-room', time: '02.13', href: 'the-room/index.html', title: 'The Room', kind: ['puisi', 'poem'] },
    { slug: 'trillions-of-seconds', time: '02.17', href: 'trillions-of-seconds/index.html', title: 'Trillions of Seconds', kind: ['puisi', 'poem'] },
    { slug: 'the-moon-behind-my-eyes', time: '02.43', href: 'the-moon-behind-my-eyes/index.html', title: 'The Moon Behind My Eyes', kind: ['puisi', 'poem'] }
  ];
  const withLang = href => { const [p, h] = href.split('#'); const keep = qs.get('lang') ? `?lang=${qs.get('lang')}` : ''; return `../${p}${keep}${h ? '#' + h : ''}`; };
  const time = s => EN ? s.replace('.', ':') : s;

  // Bingkai: langit, huruf baca, tema, dan label tombol keluar yang sama dengan situs utama.
  const root = document.documentElement;
  const read = k => { try { return JSON.parse(localStorage.getItem('jm:' + k)); } catch (_) { return null; } };
  const dark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const backdrop = () => {
    const chosen = read('backdrop') || 'auto', h = new Date().getHours() + new Date().getMinutes() / 60;
    const part = h < 4 ? 'malam' : h < 10.5 ? 'fajar' : h < 15 ? 'siang' : h < 18.5 ? 'senja' : 'malam';
    root.setAttribute('data-backdrop', chosen === 'auto' ? (dark() ? 'malam' : part) : chosen);
  };
  // huruf yang dipilih pembaca di situs utama ikut dipakai untuk teks cerita
  const FONTS = { literata: ['"Literata", Georgia, serif', 'Literata:ital,opsz,wght@0,7..72,400;1,7..72,400'], georgia: ['Georgia, "Times New Roman", serif'], sistem: ['-apple-system, BlinkMacSystemFont, "SF Pro Text", "Geist", system-ui, sans-serif'], instrument: ['"Instrument Serif", Georgia, serif', 'Instrument+Serif:ital@0;1'], geist: ['"Geist", system-ui, sans-serif', 'Geist:wght@400;500'] };
  const readFont = () => {
    const f = FONTS[(read('rd') || {}).font]; if (!f) return;
    ['--qm-read', '--serif', '--f-read', '--f-text'].forEach(v => root.style.setProperty(v, f[0]));
    if (f[1] && !document.querySelector(`link[data-qm-font="${f[1]}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f[1]}&display=swap`; l.dataset.qmFont = f[1]; document.head.append(l); }
  };
  // tema untuk halaman yang belum mengurusnya sendiri (html.qm-theme-auto)
  const theme = site => {
    if (!root.classList.contains('qm-theme-auto')) return;
    const chosen = read('theme');
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (site === 'gelap' || site === 'terang') root.setAttribute('data-theme', site === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const bg = getComputedStyle(document.body || root).backgroundColor;
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.removeAttribute('media'); m.content = bg; });
    backdrop();
  };
  let siteTheme = null;
  const labels = () => document.querySelectorAll('.qm-back').forEach(b => { const s = b.querySelector('[data-qm-label]'); if (s) s.textContent = t('Meja tulis', 'Writing desk'); b.setAttribute('aria-label', t('Kembali ke meja tulis', 'Back to the writing desk')); });
  const frame = () => { backdrop(); readFont(); theme(siteTheme); labels(); dispatchEvent(new Event('qm-frame')); };
  frame();
  document.addEventListener('DOMContentLoaded', frame);
  addEventListener('storage', e => { if (/^jm:(theme|backdrop|rd)$/.test(e.key || '')) frame(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', frame);
  // halaman yang mengurus temanya sendiri mengganti data-theme belakangan: langit malam ikut menyusul
  new MutationObserver(backdrop).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (root.classList.contains('qm-theme-auto') && !qs.has('preview')) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { siteTheme = s?.theme || null; frame(); }).catch(() => {});

  let target = null, label = '', idleT = 0, point = null, cfg = {};
  const seenKey = () => 'jm:guide:' + cfg.slug;
  const sheet = () => {
    if (document.querySelector('.jm-sheet')) return;
    const el = document.createElement('div'); el.className = 'jm-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'jmGuideTitle');
    el.innerHTML = `<div class="jm-card"><p class="jm-kicker">${esc(t('Cara membaca', 'How to read'))}</p><h2 id="jmGuideTitle">${esc(cfg.title)}</h2>${cfg.lede ? `<p class="jm-lede">${esc(cfg.lede)}</p>` : ''}<ol>${cfg.steps.map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol><button type="button" class="jm-go">${esc(t('Mulai membaca', 'Start reading'))}</button><p class="jm-note">${esc(t('Panduan ini bisa dibuka lagi lewat tombol ?', 'You can open this again with the ? button'))}</p></div>`;
    const close = () => { el.remove(); try { localStorage.setItem(seenKey(), '1'); } catch (_) {} document.removeEventListener('keydown', onKey, true); (cfg.focusAfter && document.querySelector(cfg.focusAfter) || document.querySelector('.jm-help'))?.focus(); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('.jm-go')) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(el); el.querySelector('.jm-go').focus();
  };
  const help = () => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'jm-help'; b.textContent = '?';
    b.setAttribute('aria-label', t('Cara membaca', 'How to read')); b.onclick = sheet; return b;
  };
  // Pembaca diam terlalu lama: tombol yang menunggu berdenyut, atau ditunjuk kalau di luar layar.
  const offscreen = el => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight - 40; };
  const clearNudge = () => { document.querySelectorAll('.jm-nudge').forEach(e => e.classList.remove('jm-nudge')); point?.remove(); point = null; };
  const arm = () => {
    clearTimeout(idleT); clearNudge();
    if (!target) return;
    idleT = setTimeout(() => {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el || document.querySelector('.jm-sheet') || [...document.querySelectorAll('dialog')].some(d => d.open)) return;
      el.classList.add('jm-nudge');
      if (offscreen(el) && label) {
        point = document.createElement('button'); point.type = 'button'; point.className = 'jm-point';
        point.textContent = (el.getBoundingClientRect().top > 0 ? '↓ ' : '↑ ') + label;
        point.onclick = () => { el.scrollIntoView({ block: 'center', behavior: document.documentElement.hasAttribute('data-calm') ? 'instant' : 'smooth' }); clearNudge(); };
        document.body.append(point);
      }
    }, cfg.idle || 7000);
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, e => { if (point && e.target === point) return; arm(); }, { passive: true }));
  addEventListener('scroll', () => { if (point) { const el = typeof target === 'string' ? document.querySelector(target) : target; if (el && !offscreen(el)) { point.remove(); point = null; } } }, { passive: true });

  // daftar pengalaman, urut menurut tanggal dan jam tulisannya
  let works = null;
  const loadWorks = () => works || (works = (qs.get('preview') === '1' ? Promise.resolve(read('preview')?.works || []) : fetch('../../content/works.json', { cache: 'no-cache' }).then(r => r.json())).catch(() => []));
  // antologi: tulisan yang tergabung dalam satu antologi menunjuk tulisan berikutnya di antologi itu
  let albums = null;
  const loadAlbums = () => albums || (albums = (qs.get('preview') === '1' && read('preview')?.albums ? Promise.resolve(read('preview').albums) : fetch('../../content/albums.json', { cache: 'no-cache' }).then(r => r.json())).catch(() => []));
  const nextHTML = (list, slug, albumList) => {
    const i = list.findIndex(w => w.slug === slug); if (i < 0) return '';
    const night = NIGHT.findIndex(n => n.slug === slug), nNext = night >= 0 ? NIGHT[night + 1] : null;
    if (nNext) return `<small>${esc(t('Masih malam yang sama · ditulis ', 'Same night · written at ') + time(nNext.time))}</small><b>${esc(nNext.title)} →</b><span>${esc(t(nNext.kind[0], nNext.kind[1]))}</span>|${withLang(nNext.href)}`;
    const anth = (Array.isArray(albumList) ? albumList : []).find(a => a && a.kind === 'antologi' && Array.isArray(a.tracks) && a.tracks.includes(slug) && a.tracks.filter(x => list.some(w => w.slug === x)).length > 1);
    const tracks = anth ? anth.tracks.filter(x => list.some(w => w.slug === x)) : [];
    const inAnth = anth ? list.find(w => w.slug === tracks[(tracks.indexOf(slug) + 1) % tracks.length]) : null;
    const after = inAnth || list.slice(i + 1).find(w => !NIGHT.some(n => n.slug === w.slug) || w.slug === NIGHT[0].slug) || list.find(w => w.slug !== slug);
    if (!after) return '';
    const exp = String(after.experience).replace(/^antologi\//, ''), date = after.date ? new Date(after.date + 'T00:00:00').toLocaleDateString(EN ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const anthTitle = inAnth ? ((EN && anth.en?.title) || anth.title) : '';
    const head = night >= 0 ? t(`Malam 19 Juli selesai di sini · ${time(NIGHT[night].time)}`, `The night of 19 July ends here · ${time(NIGHT[night].time)}`) : inAnth ? t(`Masih di antologi ${anthTitle}`, `Still in the ${anthTitle} anthology`) : t('Pengalaman berikutnya', 'Next experience');
    const ttl = (EN && after.en?.title) || after.title;
    return `<small>${esc(head)}</small><b>${esc(ttl)} →</b><span>${esc(date)}</span>|${withLang(exp)}`;
  };
  let fillT = 0;
  const fillSoon = () => { clearTimeout(fillT); fillT = setTimeout(fill, 0); };
  const fill = async () => {
    const els = [...document.querySelectorAll('[data-next-for]:not([data-filled])')]; if (!els.length) return;
    const [all, albumList] = await Promise.all([loadWorks(), loadAlbums()]);
    const list = (Array.isArray(all) ? all : []).filter(w => w && w.experience && !w.draft).sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
    els.forEach(el => { const h = nextHTML(list, el.dataset.nextFor, albumList); if (!h) { el.hidden = true; return; } const k = h.lastIndexOf('|'); el.innerHTML = h.slice(0, k); el.href = h.slice(k + 1); el.dataset.filled = ''; });
  };
  new MutationObserver(() => { if (document.querySelector('[data-next-for]:not([data-filled])')) fillSoon(); }).observe(document.documentElement, { childList: true, subtree: true });

  // Mode baca: dari dalam pengalaman, tulisan yang sama bisa dibaca sebagai teks biasa di situs utama.
  // Pilihan ini hanya berlaku untuk tulisan itu selama sesi ini; pengaturan umumnya ada di layar pilih piringan.
  const plainRow = work => {
    const body = document.querySelector('#settingsDialog .settings-body'); if (!body || !work || body.querySelector('#plainLink')) return;
    const at = () => (typeof work === 'function' ? work() : work) || '';
    const row = document.createElement('div'); row.className = 'setting-row';
    row.innerHTML = `<span>${esc(t('Mode baca', 'Reading mode'))}</span><a class="setting-button" id="plainLink" href="../../#putar">${esc(t('Baca biasa', 'Plain text'))}</a>`;
    const a = row.querySelector('a');
    const sync = () => { const w = at(); a.hidden = !w; a.href = `../../${location.search}#baca-${w}`; a.setAttribute('aria-label', t('Baca tulisan ini sebagai teks biasa', 'Read this piece as plain text')); };
    a.addEventListener('click', () => { sync(); const slug = at().split(/[:~]/)[0]; try { const l = JSON.parse(sessionStorage.getItem('jm:plain') || '[]').filter(x => x !== slug); l.push(slug); sessionStorage.setItem('jm:plain', JSON.stringify(l)); } catch (_) {} });
    document.getElementById('openSettings')?.addEventListener('click', sync);
    body.append(row); sync();
  };
  window.JMGuide = {
    // cfg: { slug, title, lede, steps, helpInto (selektor tempat tombol ?), stepInto (selektor penanda langkah), focusAfter }
    mount(c) {
      cfg = c;
      const into = c.helpInto && document.querySelector(c.helpInto); if (into) into.append(help());
      plainRow(c.work === undefined ? c.slug : c.work);
      let seen = false; try { seen = localStorage.getItem(seenKey()) === '1'; } catch (_) {}
      if (!seen && !c.quiet) sheet();
    },
    // Penanda "Bait 3 dari 7" dengan titik-titik kecil.
    // label: teks pengganti untuk bagian tanpa nomor, mis. "Prolog"
    step(n, total, word, label) {
      const el = cfg.stepInto && document.querySelector(cfg.stepInto); if (!el) return;
      const dots = total <= 14 ? `<i aria-hidden="true">${Array.from({ length: total }, (_, i) => `<b class="${i < n ? 'on' : ''}"></b>`).join('')}</i>` : '';
      const txt = label || `${word || t('Bait', 'Stanza')} ${n} ${t('dari', 'of')} ${total}`;
      el.className = 'jm-step'; el.innerHTML = `${esc(txt)}${dots}`;
      el.setAttribute('aria-label', txt);
    },
    // Tombol berikutnya yang ditunggu; null kalau tidak ada.
    want(sel, text) { target = sel; label = text || ''; arm(); },
    // Kartu tulisan berikutnya: di malam 19 Juli mengikuti jamnya, selain itu pengalaman berikutnya menurut tanggal.
    // Dikembalikan sebagai penanda, lalu diisi setelah daftar tulisan termuat.
    next(slug) { fillSoon(); return `<a class="jm-next" data-next-for="${esc(slug)}" href="../../#putar"><small>${esc(t('Berikutnya', 'Next'))}</small><b>…</b></a>`; },
    // Dialog pengaturan baca untuk halaman yang belum punya sendiri: buka/tutup dan tombol tampilan (terang/gelap).
    settings({ open = '#openSettings', dialog = '#settingsDialog', theme: themeSel = '#theme' } = {}) {
      const dlg = document.querySelector(dialog), btn = document.querySelector(open), tb = document.querySelector(themeSel);
      if (!dlg || !btn) return;
      btn.addEventListener('click', () => { dlg.showModal(); (dlg.querySelector('.setting-button') || dlg.querySelector('[data-close]'))?.focus(); });
      dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
      dlg.addEventListener('close', () => btn.focus());
      const paint = () => {
        if (!tb) return; const d = dark();
        tb.setAttribute('aria-pressed', String(d)); tb.textContent = d ? t('Gelap', 'Dark') : t('Terang', 'Light');
        tb.setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (d ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
      };
      tb?.addEventListener('click', () => { try { localStorage.setItem('jm:theme', JSON.stringify(dark() ? 'light' : 'dark')); } catch (_) {} frame(); });
      addEventListener('qm-frame', paint);
      const L = { settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], themeLabel: ['Tampilan', 'Appearance'] };
      Object.entries(L).forEach(([id, v]) => { const el = dlg.querySelector('#' + id); if (el) el.textContent = t(v[0], v[1]); });
      btn.setAttribute('aria-label', t('Pengaturan baca', 'Reading settings'));
      paint();
    },
    NIGHT
  };
})();
