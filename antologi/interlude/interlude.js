/* Interlude: dinding ruang praktik Sinta berganti warna mengikuti waktu cerita.
   Biru pucat = tempat praktik lama (masa lalu), hijau = tempat baru (sekarang). */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const SLUG = 'interlude';
  const EN = (new URLSearchParams(location.search).get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  document.documentElement.lang = t('id', 'en');

  let work;
  try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')}</p>`; return; }
  const chapters = (EN && work.en?.chapters) || work.chapters;

  $('#sub').textContent = t('Tiga orang, satu meja, dan warna dinding yang berubah.', 'Three people, one table, and a wall that changed colour.');
  $('#kick').textContent = t('Titik Biru · Bagian II', 'Titik Biru · Part II');
  $('.top').insertAdjacentHTML('beforeend', `<p class="legend"><span style="--c:var(--arka)">Arka</span><span style="--c:var(--nara)">Nara</span><span style="--c:var(--sinta)">Sinta</span></p>`);
  $('#back').setAttribute('aria-label', t('Kembali ke meja tulis', 'Back to the desk'));
  $('#back2').textContent = t('Kembali ke meja tulis', 'Back to the desk');

  const voiceOf = s => (/^(arka|nara|sinta)\b/i.exec(s.trim()) || [])[1]?.toLowerCase() || '';
  const N = chapters.length, MOVE = 8; // bab 9: Sinta pindah ke tempat baru
  const DRAFT = [6, 9];                // bab 7 dan 10: halaman buku tulis Arka
  const FAR = i => i >= 7 && i < N - 1; // berjauhan: keberangkatan sampai kabar dari jauh

  story.innerHTML = chapters.map((c, i) => {
    const v = voiceOf(c.title), [, name, title] = /^(.*?)\s+[—–-]\s+(.*)$/.exec(c.title) || [, '', c.title];
    const body = c.body.map(p => {
      if (p.startsWith('### ')) return `<h3 data-v="${voiceOf(p.slice(4))}">${esc(p.slice(4))}</h3>`;
      let h = `<p>${inline(p)}</p>`;
      if (/sembilan puluh, kamu sepuluh|ninety to give/i.test(p)) h += `<div class="split"><button class="split-bar" type="button" aria-label="${t('Balik', 'Flip')}"><span class="split-a" style="flex-grow:90">90</span><span class="split-n" style="flex-grow:10">10</span></button><small></small></div>`;
      return h;
    }).join('');
    return `<section class="ch${DRAFT.includes(i) ? ' draft' : ''}${FAR(i) ? ' far' : ''}${i === N - 1 ? ' end' : ''}" data-i="${i}" data-v="${v}">
      <header class="ch-h"><span class="ch-n">${i + 1} · ${esc(name || '')}</span><h2 class="ch-t">${esc(title)}</h2></header>
      <div class="ch-body">${body}</div>${DRAFT.includes(i) ? `<p class="draft-f">${t('Dari buku tulis Arka', 'From Arka’s notebook')}</p>` : ''}</section>`;
  }).join('') + `<svg class="table" id="table" viewBox="0 0 320 220" aria-hidden="true">
      <ellipse cx="160" cy="110" rx="150" ry="100" fill="var(--chip)" stroke="var(--line)"/>
      <circle cx="96" cy="58" r="13" fill="none" stroke="var(--muted)" stroke-width="1.5"/><circle cx="226" cy="62" r="13" fill="none" stroke="var(--muted)" stroke-width="1.5"/>
      <rect x="236" y="120" width="40" height="30" rx="3" fill="var(--muted)" opacity=".35"/><circle cx="268" cy="128" r="5" fill="var(--orange)"/>
      <g class="bk bk-a"><rect x="108" y="96" width="46" height="62" rx="3" fill="var(--arka)"/></g>
      <g class="bk bk-n"><rect x="164" y="94" width="46" height="62" rx="3" fill="var(--nara)"/></g>
      <g class="menu"><rect x="132" y="168" width="56" height="34" rx="3" fill="var(--ink)" opacity=".85"/><path d="M142 178h36M142 186h28M142 194h32" stroke="var(--green)" stroke-width="2"/></g>
    </svg><p class="end-l">${t('Cukup dekat untuk dibaca berdua.', 'Close enough for two to read.')}</p>`;
  $('#after').hidden = false;

  // sembilan puluh dan sepuluh: besok bisa kebalik
  document.querySelectorAll('.split').forEach(s => {
    let flip = false; const [a, n] = s.querySelectorAll('span'), cap = s.querySelector('small');
    s.querySelector('button').addEventListener('click', () => {
      flip = !flip; a.style.flexGrow = flip ? 10 : 90; n.style.flexGrow = flip ? 90 : 10;
      a.textContent = flip ? 10 : 90; n.textContent = flip ? 90 : 10;
      cap.textContent = flip ? t('Besok bisa kebalik.', 'Tomorrow it might be the other way round.') : t('Yang sembilan puluh masih boleh bilang capek.', 'The one giving ninety is still allowed to be tired.');
    });
  });

  // meja terakhir: dua buku bergeser berdampingan, menu di tengah
  const table = $('#table');
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting && table.classList.add('on')), { threshold: .6 }).observe(table);

  const secs = [...document.querySelectorAll('.ch')], wallG = $('#wallG'), who = $('#who'), pct = $('#pct');
  const heads = [...document.querySelectorAll('.ch h3')];
  let lastV = '', saveT = 0;
  const frame = () => {
    const mid = innerHeight * .45;
    let i = secs.findIndex(s => s.getBoundingClientRect().bottom > mid); if (i < 0) i = N - 1;
    const s = secs[i], r = s.getBoundingClientRect();
    let v = s.dataset.v, g;
    if (i < MOVE) g = v === 'arka' ? 1 : 0;
    else if (i === MOVE) g = clamp((mid - r.top) / (r.height * .35), 0, 1); // dinding dicat ulang sambil dibaca
    else g = 1;
    if (i === N - 1) heads.forEach(h => { if (h.getBoundingClientRect().top < mid) v = h.dataset.v || v; });
    if (r.top > mid) { v = ''; g = 0; } // masih di sampul
    wallG.classList.toggle('live', i === MOVE);
    wallG.style.opacity = g;
    if (v !== lastV) { lastV = v; who.textContent = v ? v[0].toUpperCase() + v.slice(1) : ''; who.style.setProperty('--c', v ? `var(--${v})` : ''); }
    const f = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
    pct.textContent = Math.round(f * 100) + '%';
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const pr = store.get('prog', {}); pr[SLUG] = +f.toFixed(3); store.set('prog', pr);
      if (f > .97) { const st = store.get('stats', {}); st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); } }
    }, 400);
  };
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, { passive: true });
  addEventListener('resize', frame);

  const rd = store.get('rd', {});
  let size = clamp(+rd.size || 19, 15, 26);
  const setSize = d => { const y = scrollY / document.documentElement.scrollHeight; size = clamp(size + d, 15, 26); document.documentElement.style.setProperty('--size', size + 'px'); store.set('rd', { ...store.get('rd', {}), size }); if (d) scrollTo(0, y * document.documentElement.scrollHeight); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);

  const r = store.get('read', []); if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
  const st = store.get('stats', {}); st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st);
  const saved = store.get('prog', {})[SLUG];
  if (saved > .02 && saved < .97) {
    const b = $('#resume'); b.hidden = false; b.textContent = t(`Lanjutkan dari ${Math.round(saved * 100)}%`, `Continue from ${Math.round(saved * 100)}%`);
    b.onclick = () => { scrollTo({ top: saved * (document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' }); b.hidden = true; };
    setTimeout(() => { b.hidden = true; }, 9000);
  }
  [$('#back'), $('#back2')].forEach(a => a.addEventListener('click', e => {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
  }));
  frame();
})();
