/* Interlude: dibaca seperti percakapan. Dialog menjadi gelembung,
   narasi menjadi keterangan di antaranya, dan lokasi muncul seperti pesan sistem.
   Teks tidak diubah sedikit pun; hanya cara menampilkannya. */
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
  document.documentElement.classList.add('js');

  let work;
  try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')}</p>`; document.documentElement.classList.remove('js'); return; }
  const chapters = (EN && work.en?.chapters) || work.chapters;

  $('#kick').textContent = t('Titik Biru · Bagian II', 'Titik Biru · Part II');
  $('#sub').textContent = t('Tiga suara di antara dua kota. Dialog muncul sebagai pesan, keterangan di antaranya, dan lokasi di setiap perpindahan.', 'Three voices between two cities. Dialogue arrives as messages, with the telling in between and a location at every move.');
  $('.top').insertAdjacentHTML('beforeend', `<p class="cast">${['arka', 'nara', 'sinta'].map(v => `<span style="--c:var(--${v})"><i>${v[0].toUpperCase()}</i>${v[0].toUpperCase() + v.slice(1)}</span>`).join('')}</p>`);
  $('#back').setAttribute('aria-label', t('Kembali ke meja tulis', 'Back to the desk'));
  $('#back2').textContent = t('Kembali ke meja tulis', 'Back to the desk');

  const PL = {
    baru: ['Ruang praktik Sinta · tempat baru', 'Sinta’s office · the new one'], lama: ['Ruang praktik Sinta · di atas apotek', 'Sinta’s office · above the pharmacy'],
    tunggu: ['Ruang tunggu', 'The waiting room'], kedai: ['Kedai dekat rak', 'The café by the shelf'], rsinta: ['Rumah Sinta dan Tegar', 'Sinta and Tegar’s house'],
    studio: ['Studio Nara', 'Nara’s studio'], darka: ['Dapur Arka', 'Arka’s kitchen'], warung: ['Warung dekat perpustakaan', 'The stall near the library'],
    jalan: ['Di jalan', 'On the way'], knara: ['Kamar Nara', 'Nara’s room'], fotokopi: ['Tempat fotokopi', 'The copy shop'], karka: ['Kamar Arka', 'Arka’s room'],
    ibu: ['Makan bersama ibu Nara', 'Dinner with Nara’s mother'], teras: ['Teras rumah Nara', 'Nara’s porch'], rnara: ['Rumah Nara', 'Nara’s house'],
    dsinta: ['Dapur rumah baru', 'The new kitchen'], bandara: ['Bandara', 'The airport'], jauh: ['Kota lain', 'Another city'], halte: ['Halte', 'The bus stop'],
    kolam: ['Kolam renang', 'The swimming pool'], mobil: ['Mobil Tegar', 'Tegar’s car']
  };
  const WHO = { sinta: 'Sinta', arka: 'Arka', nara: 'Nara', tegar: 'Tegar', ibu: t('Ibu Nara', 'Nara’s mother') };
  const B = [
    [0, 0, { pl: 'baru', who: 'sinta' }], [0, 66, { pl: 'jalan', who: '' }],
    [1, 0, { pl: 'tunggu', who: '' }], [1, 5, { pl: 'lama', who: 'sinta' }],
    [1, 46, { pl: 'jalan', who: '' }], [1, 51, { pl: 'kedai' }], [1, 57, { who: 'arka' }],
    [2, 0, { pl: 'rsinta', who: 'tegar' }], [2, 43, { who: '' }],
    [3, 0, { pl: 'kedai', who: 'arka' }], [3, 42, { pl: 'jalan', who: '' }], [3, 53, { pl: 'lama', who: 'sinta' }], [3, 63, { pl: 'jalan', who: '' }],
    [4, 0, { pl: 'darka', who: '' }], [4, 16, { pl: 'warung', who: 'nara' }], [4, 34, { pl: 'baru', who: 'sinta' }],
    [4, 50, { pl: 'warung', who: '' }],
    [5, 0, { pl: 'studio', who: 'arka' }], [5, 22, { pl: 'kedai' }], [5, 48, { pl: 'jalan' }], [5, 63, { pl: 'knara', who: '' }],
    [6, 0, { pl: 'fotokopi', who: 'nara' }], [6, 11, { pl: 'jalan' }], [6, 44, { pl: 'karka', who: '' }],
    [6, 54, { pl: 'ibu', who: 'nara' }], [6, 67, { pl: 'karka', who: '' }],
    [7, 0, { pl: 'kedai', who: 'arka' }], [7, 29, { pl: 'teras' }], [7, 56, { pl: 'lama', who: 'sinta' }],
    [7, 63, { pl: 'rnara', who: '' }],
    [8, 0, { pl: 'dsinta', who: 'tegar' }], [8, 4, { pl: 'baru', who: '' }], [8, 7, { who: 'arka' }],
    [8, 49, { who: '' }], [8, 50, { pl: 'dsinta', who: 'tegar' }],
    [9, 0, { pl: 'bandara', who: 'nara' }], [9, 11, { who: '' }], [9, 25, { pl: 'jauh', who: 'nara' }],
    [9, 40, { pl: 'darka', who: '' }], [9, 65, { pl: 'baru', who: 'sinta' }], [9, 66, { pl: 'karka', who: '' }],
    [10, 0, { pl: 'jauh', who: '' }], [10, 27, { pl: 'rnara', who: 'ibu' }], [10, 60, { pl: 'halte', who: '' }],
    [11, 1, { pl: 'kolam', who: '' }], [11, 12, { pl: 'darka' }], [11, 13, { pl: 'baru', who: 'sinta' }],
    [11, 24, { pl: 'kedai', who: '' }], [11, 28, { who: 'nara' }],
    [11, 30, { pl: 'baru', who: '' }], [11, 35, { pl: 'mobil', who: 'tegar' }],
    [11, 46, { pl: 'kedai', who: 'arka' }],
  ];
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  const voiceOf = s => (/^(arka|nara|sinta)\b/i.exec(s.trim()) || [])[1]?.toLowerCase() || '';
  const DRAFT = [6, 9]; // bab 7 dan 10: halaman buku tulis Arka
  const NAMES = ['Arka', 'Nara', 'Sinta', 'Tegar'];
  const FIRST_ME = /\b(kataku|tanyaku|jawabku|ujarku|sahutku|aku (?:berkata|bertanya|menjawab|mengatakan|menyahut))\b|\bI (?:said|asked|answered|replied|told)\b|\bsaid I\b/i;
  const FIRST_YOU = /\b(katanya|tanyanya|jawabnya|ujarnya|sahutnya|ia (?:berkata|bertanya|menjawab|mengatakan))\b|\b(?:she|he) (?:said|asked|answered|replied)\b/i;

  // siapa yang berbicara: dari keterangan di luar tanda petik, kalau tidak jelas bergantian
  const speaker = (narr, pov, first, last, subj) => {
    if (first && FIRST_ME.test(narr)) return ['me', ''];
    if (!narr && subj) return subj; // kutipan polos setelah narasi: pelakunya yang barusan disebut
    let name = '', at = 1e9;
    NAMES.forEach(n => { const i = narr.search(new RegExp('\\b' + n + '\\b')); if (i >= 0 && i < at) { at = i; name = n; } });
    if (name) return [name.toLowerCase() === pov ? 'me' : 'you', name];
    if (first && FIRST_YOU.test(narr)) return ['you', ''];
    return [last === 'you' ? 'me' : last === 'me' ? 'you' : 'you', ''];
  };

  let bi = 0, pl = '', who = '', html = '';
  chapters.forEach((c, i) => {
    let pov = voiceOf(c.title), last = null, lastName = '', subj = null;
    const [, name, title] = /^(.*?)\s+[—–-]\s+(.*)$/.exec(c.title) || [, '', c.title];
    html += `<section class="ch${DRAFT.includes(i) ? ' draft' : ''}" id="bab-${i + 1}" data-i="${i}" data-v="${pov}"><header class="ch-h"><span class="ch-n">${i + 1}${name ? ' · ' + esc(name) : ''}</span><h2 class="ch-t">${esc(title)}</h2></header>`;
    let shown = '';
    c.body.forEach((p, k) => {
      while (bi < B.length && B[bi][0] * 1000 + B[bi][1] <= i * 1000 + k) { const d = B[bi][2]; if (d.pl != null) pl = d.pl; if (d.who != null) who = d.who; bi++; }
      if (p.startsWith('### ')) { pov = voiceOf(p.slice(4)); last = null; html += `<h3 data-v="${pov}">${esc(p.slice(4))}</h3>`; shown = ''; return; }
      if (pl && pl !== shown) { shown = pl; last = null; html += `<p class="loc" data-pl="${pl}"><span>${PIN}${esc(PL[pl][EN ? 1 : 0])}</span></p>`; }
      const first = pov === 'arka' || pov === 'sinta';
      const other = pov === 'arka' ? 'Nara' : pov === 'nara' ? 'Arka' : '';
      const typed = /^(.{0,70}?\b(mengetik|membalas|menjawab|typed|replied|answered):)\s*([a-z].*)$/.exec(p);
      if (/^[a-z]/.test(p) && other) {
        html += `<div class="msg you sms" data-who="${other}"><span class="nm" style="--nc:var(--${other.toLowerCase()})">${other} · ${t('pesan', 'message')}</span><p class="bub">${inline(p)}</p></div>`; last = 'you'; lastName = other;
      } else if (typed) {
        // pesan yang diketik di dalam cerita: "Ia mengetik: …", "Arka membalas: …", "Kamu menjawab: …"
        const nm = NAMES.find(x => typed[1].includes(x)) || (/^(Kamu|You)\b/.test(p) ? other : '');
        const me = /mengetik|typed/.test(typed[2]) ? !nm || nm.toLowerCase() === pov : nm.toLowerCase() === pov;
        html += `<p class="nar">${inline(typed[1])}</p>` + (me
          ? `<div class="msg me sms" style="--c:var(--${pov})"><p class="bub">${inline(typed[3])}</p><span class="rcpt">${t('Terkirim', 'Delivered')}</span></div>`
          : `<div class="msg you sms" data-who="${nm || other}"><span class="nm" style="--nc:var(--${(nm || other).toLowerCase()})">${nm || other} · ${t('pesan', 'message')}</span><p class="bub">${inline(typed[3])}</p></div>`);
        last = me ? 'me' : 'you';
      } else if (/“/.test(p)) {
        const parts = p.split(/(“[^”]*(?:”|$))/).map(s => s.trim()).filter(Boolean);
        const narr = parts.filter(s => !s.startsWith('“')).join(' ');
        const [side, nm0] = speaker(narr, pov, first, last, subj); subj = null;
        const nm = side === 'you' ? (nm0 || WHO[who] || '') : '';
        const label = side === 'you' && nm && (last !== 'you' || nm !== lastName);
        html += `<div class="msg ${side}"${side === 'you' && nm ? ` data-who="${esc(nm)}"` : ''} style="${side === 'me' ? `--c:var(--${pov || 'muted'})` : ''}">${label ? `<span class="nm" style="--nc:var(--${nm.toLowerCase()})">${esc(nm)}</span>` : ''}${parts.map(s => s.startsWith('“') ? `<p class="bub">${inline(s.replace(/^“|”$/g, ''))}</p>` : `<p class="aside">${inline(s)}</p>`).join('')}</div>`;
        last = side; lastName = nm;
      } else {
        html += `<p class="nar">${inline(p)}</p>`;
        const head = p.slice(0, 48), n = NAMES.find(x => new RegExp('^' + x + '\\b').test(head));
        subj = first && /^(Aku|I)\b/.test(p) ? ['me', ''] : n ? [n.toLowerCase() === pov ? 'me' : 'you', n] : null;
      }
      if (/sembilan puluh, kamu sepuluh|ninety to give/i.test(p)) html += `<div class="split"><button class="split-bar" type="button" aria-label="${t('Balik', 'Flip')}"><span class="split-a" style="flex-grow:90">90</span><span class="split-n" style="flex-grow:10">10</span></button><small>${t('Ketuk untuk membalik', 'Tap to flip')}</small></div>`;
    });
    html += `${DRAFT.includes(i) ? `<p class="draft-f">${t('Dari buku tulis Arka', 'From Arka’s notebook')}</p>` : ''}</section>`;
  });
  // daftar percakapan: setiap bab satu utas, seperti layar depan aplikasi chat
  const seen = store.get('il:seen', -1), firstPl = i => { const b = B.find(x => x[0] === i && x[2].pl); return b ? PL[b[2].pl][EN ? 1 : 0] : ''; };
  $('.top').insertAdjacentHTML('afterend', `<ol class="inbox">${chapters.map((c, i) => {
    const v = voiceOf(c.title), [, nm, ti] = /^(.*?)\s+[—–-]\s+(.*)$/.exec(c.title) || [, t('Bertiga', 'All three'), c.title];
    const prev = c.body.find(p => !p.startsWith('###')) || '';
    return `<li><a href="#bab-${i + 1}" data-go="${i}" style="--c:var(--${v || 'muted'})"><i class="av">${v ? v[0].toUpperCase() : '3'}</i><span class="ib-t"><b>${esc(nm || '')}</b><small>${esc(ti)}</small><em>${esc(prev.replace(/[“”*]/g, '').slice(0, 90))}</em></span><span class="ib-m">${i + 1}${i > seen ? '<u></u>' : ''}<small>${esc(firstPl(i).split(' · ')[0])}</small></span></a></li>`;
  }).join('')}</ol>`);
  story.innerHTML = html + `<p class="end-l">${t('Cukup dekat untuk dibaca berdua.', 'Close enough for two to read.')}</p>`;
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

  // kepala percakapan: siapa yang bercerita, dan di mana
  const marks = [...document.querySelectorAll('.ch, .ch h3, .loc')], hAv = $('#hAv'), hName = $('#hName'), hLoc = $('#hLoc'), pct = $('#pct');
  let headKey = '', saveT = 0, maxCh = store.get('il:seen', -1);
  $('.h-t').addEventListener('click', () => scrollTo({ top: $('.inbox').offsetTop - 70, behavior: calm ? 'auto' : 'smooth' }));
  const frame = () => {
    let v = '', loc = '';
    for (const m of marks) {
      if (m.getBoundingClientRect().top > 90) break;
      if (m.classList.contains('ch')) { v = m.dataset.v; loc = ''; } else if (m.tagName === 'H3') { v = m.dataset.v; } else loc = m.dataset.pl;
    }
    const cur = marks.filter(m => m.classList.contains('ch') && m.getBoundingClientRect().top < innerHeight * .5).length - 1;
    if (cur > maxCh) { maxCh = cur; store.set('il:seen', cur); const u = document.querySelector(`[data-go="${cur}"] u`); if (u) u.remove(); }
    const key = v + '|' + loc;
    if (key !== headKey && !typing) {
      headKey = key;
      hName.textContent = v ? v[0].toUpperCase() + v.slice(1) : 'Interlude';
      hAv.textContent = v ? v[0].toUpperCase() : 'I'; hAv.style.setProperty('--c', v ? `var(--${v})` : '');
      hLoc.textContent = loc ? PL[loc][EN ? 1 : 0] : (v ? '' : t('Arka, Nara, Sinta', 'Arka, Nara, Sinta'));
    }
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
  let size = clamp(+rd.size || 17, 14, 24);
  const setSize = d => { const y = scrollY / document.documentElement.scrollHeight; size = clamp(size + d, 14, 24); document.documentElement.style.setProperty('--size', size + 'px'); store.set('rd', { ...store.get('rd', {}), size }); if (d) scrollTo(0, y * document.documentElement.scrollHeight); };
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
  // pesan muncul saat digulir sampai
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let typing = 0;
  const show = el => {
    el.classList.add('in');
    if (calm || !el.classList.contains('you') || scrollY < 200) return;
    el.classList.add('typing'); typing++; hLoc.textContent = (el.dataset.who ? el.dataset.who + ' ' : '') + t('sedang mengetik…', 'is typing…');
    setTimeout(() => { el.classList.remove('typing'); if (!--typing) { headKey = ''; frame(); } }, 520 + Math.min(900, el.textContent.length * 9));
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' }) : null;
  document.querySelectorAll('.msg, .nar').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  frame();
})();
