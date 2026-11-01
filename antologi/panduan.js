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

  window.JMGuide = {
    // cfg: { slug, title, lede, steps, helpInto (selektor tempat tombol ?), stepInto (selektor penanda langkah), focusAfter }
    mount(c) {
      cfg = c;
      const into = c.helpInto && document.querySelector(c.helpInto); if (into) into.append(help());
      let seen = false; try { seen = localStorage.getItem(seenKey()) === '1'; } catch (_) {}
      if (!seen && !c.quiet) sheet();
    },
    // Penanda "Bait 3 dari 7" dengan titik-titik kecil.
    step(n, total, word) {
      const el = cfg.stepInto && document.querySelector(cfg.stepInto); if (!el) return;
      const dots = total <= 14 ? `<i aria-hidden="true">${Array.from({ length: total }, (_, i) => `<b class="${i < n ? 'on' : ''}"></b>`).join('')}</i>` : '';
      el.className = 'jm-step'; el.innerHTML = `${esc(word || t('Bait', 'Stanza'))} ${n} ${esc(t('dari', 'of'))} ${total}${dots}`;
      el.setAttribute('aria-label', `${word || t('Bait', 'Stanza')} ${n} ${t('dari', 'of')} ${total}`);
    },
    // Tombol berikutnya yang ditunggu; null kalau tidak ada.
    want(sel, text) { target = sel; label = text || ''; arm(); },
    // Kartu tulisan berikutnya dari malam yang sama.
    next(slug) {
      const i = NIGHT.findIndex(n => n.slug === slug); if (i < 0) return '';
      const n = NIGHT[i + 1];
      if (!n) return `<a class="jm-next" href="${withLang(NIGHT[0].href)}"><small>${esc(t('Malam 19 Juli selesai di sini · ', 'The night of 19 July ends here · ') + time(NIGHT[i].time))}</small><b>${esc(t('Kembali ke awal malam itu', 'Back to the start of that night'))}</b><span>${esc(time(NIGHT[0].time))} · ${esc(NIGHT[0].title)}</span></a>`;
      return `<a class="jm-next" href="${withLang(n.href)}"><small>${esc(t('Masih malam yang sama · ditulis ', 'Same night · written at ') + time(n.time))}</small><b>${esc(n.title)} →</b><span>${esc(t(n.kind[0], n.kind[1]))}</span></a>`;
    },
    NIGHT
  };
})();
