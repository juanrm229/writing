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

  $('#kick').textContent = t('Temusai · Bagian I', 'Temusai · Part I');
  $('#sub').textContent = t('Tiga suara di antara dua kota. Dialog muncul sebagai pesan, keterangan di antaranya, dan lokasi di setiap perpindahan.', 'Three voices between two cities. Dialogue arrives as messages, with the telling in between and a location at every move.');
  $('.top').insertAdjacentHTML('beforeend', `<p class="cast">${['arka', 'nara', 'sinta'].map(v => `<span style="--c:var(--${v})"><i>${v[0].toUpperCase()}</i>${v[0].toUpperCase() + v.slice(1)}</span>`).join('')}</p>`);
  $('#back').setAttribute('aria-label', t('Kembali ke meja tulis', 'Back to the desk'));
  $('#back2').textContent = t('Kembali ke meja tulis', 'Back to the desk');

  const PL = {
    baru: ['Ruang praktik Sinta · tempat baru', 'Sinta’s office · the new one'], lama: ['Ruang praktik Sinta · di atas apotek', 'Sinta’s office · above the pharmacy'],
    tunggu: ['Ruang tunggu', 'The waiting room'], kedai: ['Kedai Halaman Belakang', 'Halaman Belakang café'], rsinta: ['Rumah Sinta dan Tegar', 'Sinta and Tegar’s house'],
    studio: ['Studio Nara', 'Nara’s studio'], darka: ['Dapur Arka', 'Arka’s kitchen'], warung: ['Warung dekat perpustakaan', 'The stall near the library'],
    jalan: ['Di jalan', 'On the way'], knara: ['Kamar Nara', 'Nara’s room'], fotokopi: ['Tempat fotokopi', 'The copy shop'], karka: ['Kamar Arka', 'Arka’s room'],
    ibu: ['Makan bersama ibu Nara', 'Dinner with Nara’s mother'], teras: ['Teras rumah Nara', 'Nara’s porch'], rnara: ['Rumah Nara', 'Nara’s house'],
    dsinta: ['Dapur rumah baru', 'The new kitchen'], bandara: ['Bandara', 'The airport'], jauh: ['Kota lain', 'Another city'], halte: ['Halte', 'The bus stop'],
    kolam: ['Kolam renang', 'The swimming pool'], mobil: ['Mobil Tegar', 'Tegar’s car']
  };
  // koreksi penutur yang sudah diperiksa per baris: 'me' = tokoh yang bercerita (kanan), 'you:nama' = lawan bicara (kiri)
  const OV = {
    '0,21': 'me', '0,22': 'you:sinta', '0,32': 'you:sinta', '0,33': 'me', '0,46': 'me', '0,47': 'you:sinta', '0,63': 'you:orang',
    '1,25': 'me', '1,26': 'you:sinta', '1,31': 'me', '1,33': 'me', '1,34': 'you:sinta', '1,35': 'me', '1,39': 'me', '1,40': 'you:sinta', '1,41': 'me', '1,51': 'me', '1,52': 'you:pelayan', '1,67': 'you:arka', '1,68': 'me',
    '2,47': 'you:tegar', '2,49': 'you:tegar',
    '3,12': 'you:arka', '3,13': 'me', '3,14': 'you:arka', '3,15': 'me', '3,17': 'you:arka', '3,49': 'me', '3,50': 'you:sinta', '3,52': 'me', '3,54': 'me', '3,55': 'you:sinta',
    '4,5': 'you:nara', '4,6': 'me', '4,7': 'you:nara', '4,9': 'you:nara', '4,10': 'me', '4,11': 'you:nara', '4,14': 'you:nara', '4,39': 'me', '4,40': 'you:sinta', '4,48': 'me',
    '5,4': 'me', '5,5': 'you:arka', '5,6': 'me', '5,8': 'me', '5,33': 'me', '5,35': 'me', '5,55': 'me', '5,56': 'you:arka',
    '6,38': 'you:arka', '6,39': 'me', '6,64': 'you:sinta',
    '7,10': 'you:arka', '7,16': 'you:arka', '7,23': 'me', '7,49': 'me', '7,51': 'you:arka', '7,57': 'me', '7,58': 'you:sinta', '7,59': 'me', '7,60': 'you:sinta', '7,61': 'me', '7,90': 'you:arka',
    '8,11': 'you:arka', '8,12': 'me', '8,13': 'you:arka', '8,15': 'you:arka', '8,37': 'you:arka', '8,55': 'me',
    '10,8': 'you', '10,9': 'me', '10,10': 'you', '10,29': 'you:ibu', '10,30': 'me', '10,31': 'you:ibu', '10,34': 'you:ibu',
    '11,75': 'you:arka', '11,76': 'me', '11,78': 'me'
  };
  const WHO = { pelayan: t('Pelayan', 'Waiter'), orang: t('Seorang ibu', 'A mother'), sinta: 'Sinta', arka: 'Arka', nara: 'Nara', tegar: 'Tegar', ibu: t('Ibu Nara', 'Nara’s mother') };
  // status lawan bicara di kepala layar: jauh sejak bandara, online saat bertemu lagi
  const ST = [[9, 11, 'far'], [10, 27, 'back'], [11, 50, 'on'], [11, 99, 'both']];
  // foto yang dikirim di dalam cerita: [bab, paragraf, pengirim, keterangan]
  const PHOTO = {
    '3,40': ['Arka', t('nota', 'the receipt')], '4,19': ['Nara', t('meja lain, sudutnya penuh kertas', 'another table, one corner covered in paper')],
    '6,44': ['Nara', t('tangkapan layar · satu baris ditandai', 'screenshot · one line highlighted')], '7,27': ['Arka', t('halaman buku', 'a page of the book')],
    '9,12': ['Nara', t('roti, bungkusnya sudah terbuka', 'the bread, wrapping open')], '9,15': ['Nara', t('kamar · jalan · pasar', 'room · street · market')]
  };
  // panggilan: masuk, keluar, berakhir
  const CALL = { '5,53': ['out', 'Arka'], '7,96': ['in', 'Arka'], '7,102': ['end', ''], '9,36': ['in', 'Nara'], '11,31': ['in', 'Tegar'] };
  // pemisah hari, seperti di aplikasi chat
  const DAY = { '8,0': t('September', 'September'), '10,0': t('Bulan kesembilan', 'The ninth month'), '11,24': t('Kamis', 'Thursday') };
  const TEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';
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
    [7, 63, { pl: 'rnara', who: 'arka' }],
    [8, 0, { pl: 'dsinta', who: 'tegar' }], [8, 4, { pl: 'baru', who: '' }], [8, 7, { who: 'arka' }],
    [8, 49, { who: '' }], [8, 50, { pl: 'dsinta', who: 'tegar' }],
    [9, 0, { pl: 'bandara', who: 'nara' }], [9, 11, { who: '' }], [9, 25, { pl: 'jauh', who: 'nara' }],
    [9, 40, { pl: 'darka', who: '' }], [9, 65, { pl: 'baru', who: 'sinta' }], [9, 66, { pl: 'karka', who: '' }],
    [10, 0, { pl: 'jauh', who: '' }], [10, 27, { pl: 'rnara', who: 'ibu' }], [10, 42, { pl: 'baru', who: 'sinta' }], [10, 60, { pl: 'halte', who: '' }],
    [11, 1, { pl: 'kolam', who: '' }], [11, 12, { pl: 'darka' }], [11, 13, { pl: 'baru', who: 'sinta' }],
    [11, 24, { pl: 'kedai', who: '' }], [11, 28, { who: 'nara' }],
    [11, 30, { pl: 'baru', who: '' }], [11, 31, { who: 'tegar' }], [11, 35, { pl: 'mobil', who: 'tegar' }],
    [11, 46, { pl: 'kedai', who: 'arka' }],
  ];
  const DEL = {
    '3,0': { who: 'Arka', ghost: 3, keep: 1 },
    '7,95': { who: 'Nara', text: t('tidak apa-apa, besok saja', 'never mind, tomorrow\u2019s fine') },
    '9,60': { who: 'Arka', text: '' }
  };
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  const voiceOf = s => (/^(arka|nara|sinta)\b/i.exec(s.trim()) || [])[1]?.toLowerCase() || '';
  const DRAFT = [6, 9]; // bab 7 dan 10: halaman buku tulis Arka
  const NAMES = ['Arka', 'Nara', 'Sinta', 'Tegar'];
  const FIRST_ME = /\b(kataku|tanyaku|jawabku|ujarku|sahutku|tambahku|lanjutku|ulangku|aku (?:berkata|bertanya|menjawab|mengatakan|menyahut))\b|\bI (?:said|asked|answered|replied|told)\b|\bsaid I\b/i;
  const FIRST_YOU = /\b(katanya|tanyanya|jawabnya|ujarnya|sahutnya|tambahnya|lanjutnya|ia (?:berkata|bertanya|menjawab|mengatakan))\b|\b(?:she|he) (?:said|asked|answered|replied)\b/i;

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
    const draft = DRAFT.includes(i);
    if (draft) html += `<p class="loc"><span>${t('Kamu membaca sebagai Nara', 'You are reading as Nara')}</span></p>`;
    if (pov === 'sinta') html += `<div class="lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span><b>${t('Catatan pribadi Sinta', 'Sinta\u2019s private notes')}</b><small>${t('Pintunya tidak bisa ditutup rapat.', 'The door never quite closes.')}</small></span></div>`;
    c.body.forEach((p, k) => {
      while (bi < B.length && B[bi][0] * 1000 + B[bi][1] <= i * 1000 + k) { const d = B[bi][2]; if (d.pl != null) pl = d.pl; if (d.who != null) who = d.who; bi++; }
      ST.forEach(([a, b, s]) => { if (a === i && b === k) html += `<i class="stm" data-st="${s}"></i>`; });
      if (p.startsWith('### ')) { pov = voiceOf(p.slice(4)); last = null; html += `<h3 data-v="${pov}">${esc(p.slice(4))}</h3>`; shown = ''; if (pov === 'sinta') html += `<div class="lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span><b>${t('Catatan pribadi Sinta', 'Sinta\u2019s private notes')}</b><small>${t('Pintunya tidak bisa ditutup rapat.', 'The door never quite closes.')}</small></span></div>`; return; }
      if (DAY[i + ',' + k]) html += `<p class="day"><span>${esc(DAY[i + ',' + k])}</span></p>`;
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
        let [side, nm0] = /\b(katamu|tanyamu|jawabmu|you said|you asked)\b/i.test(narr) ? ['you', ''] : speaker(narr, pov, first, draft && last ? (last === 'me' ? 'you' : 'me') : last, subj); subj = null;
        if (draft) { side = side === 'me' ? 'you' : 'me'; nm0 = side === 'you' ? 'Arka' : ''; } // kamu = Nara di kanan, Arka di kiri
        const ov = OV[i + ',' + k]; if (ov) { const [s, n] = ov.split(':'); side = s; nm0 = n ? WHO[n] : ''; }
        const nm = side === 'you' ? (nm0 || (ov ? '' : WHO[who]) || '') : '';
        const label = side === 'you' && nm && (last !== 'you' || nm !== lastName);
        html += `<div class="msg ${side}" data-k="${i},${k}"${side === 'you' && nm ? ` data-who="${esc(nm)}"` : ''} style="${side === 'me' ? `--c:var(--${draft ? 'nara' : pov || 'muted'})` : ''}">${label ? `<span class="nm"${NAMES.includes(nm) ? ` style="--nc:var(--${nm.toLowerCase()})"` : ''}>${esc(nm)}</span>` : ''}${parts.map(s => s.startsWith('“') ? `<p class="bub">${inline(s.replace(/^“|”$/g, ''))}</p>` : `<p class="aside">${inline(s)}</p>`).join('')}</div>`;
        last = side; lastName = nm;
      } else {
        html += draft ? `<div class="msg you note" data-who="Arka">${last !== 'you' ? '<span class="nm" style="--nc:var(--arka)">Arka</span>' : ''}<p class="bub">${inline(p)}</p></div>` : `<p class="nar${pov === 'sinta' ? ' sn' : ''}">${inline(p)}</p>`;
        if (draft) { last = 'you'; lastName = 'Arka'; }
        const del = DEL[i + ',' + k]; if (del) html += `<i class="del" data-who="${del.who}" data-text="${esc(del.text ?? '')}" data-ghost="${del.ghost || 0}" data-keep="${del.keep || 0}"></i>`;
        const head = p.slice(0, 48), n = NAMES.find(x => new RegExp('^' + x + '\\b').test(head));
        subj = first && /^(Aku|I)\b/.test(p) ? ['me', ''] : n ? [n.toLowerCase() === pov ? 'me' : 'you', n] : null;
      }
      const ph = PHOTO[i + ',' + k], cl = CALL[i + ',' + k];
      if (ph) { html += `<div class="msg you photo" data-who="${ph[0]}"><span class="nm" style="--nc:var(--${ph[0].toLowerCase()})">${ph[0]} · ${t('foto', 'photo')}</span><div class="ph" style="--pc:var(--${ph[0].toLowerCase()})"><i></i><span>${esc(ph[1])}</span></div></div>`; last = 'you'; lastName = ph[0]; }
      if (cl) html += `<p class="loc call ${cl[0]}"><span>${TEL}${cl[0] === 'in' ? t('Panggilan masuk · ', 'Incoming call · ') + cl[1] : cl[0] === 'out' ? t('Memanggil ', 'Calling ') + cl[1] + '…' : t('Panggilan berakhir', 'Call ended')}</span></p>`;
      if (/sembilan puluh, kamu sepuluh|ninety to give/i.test(p)) html += `<div class="split"><button class="split-bar" type="button" aria-label="${t('Balik', 'Flip')}"><span class="split-a" style="flex-grow:90">90</span><span class="split-n" style="flex-grow:10">10</span></button><small>${t('Ketuk untuk membalik', 'Tap to flip')}</small></div>`;
    });
    html += `${draft ? `<p class="draft-f">${t('Dari buku tulis Arka · tidak pernah dikirim', 'From Arka\u2019s notebook · never sent')}</p>` : ''}</section>`;
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
  const marks = [...document.querySelectorAll('.ch, .ch h3, .loc[data-pl], .stm')], hAv = $('#hAv'), hName = $('#hName'), hLoc = $('#hLoc'), pct = $('#pct');
  let headKey = '', saveT = 0, maxCh = store.get('il:seen', -1);
  $('.h-t').addEventListener('click', () => scrollTo({ top: $('.inbox').offsetTop - 70, behavior: calm ? 'auto' : 'smooth' }));
  const frame = () => {
    let v = '', loc = '', stt = '', ci = -1;
    for (const m of marks) {
      const top = m.getBoundingClientRect().top;
      if (m.dataset.st) { if (top < innerHeight * .6) stt = m.dataset.st; continue; } // status berubah saat kalimatnya terbaca
      if (top > 90) continue;
      if (m.classList.contains('ch')) { v = m.dataset.v; loc = ''; ci = +m.dataset.i; } else if (m.tagName === 'H3') { v = m.dataset.v; } else loc = m.dataset.pl;
    }
    const cur = marks.filter(m => m.classList.contains('ch') && m.getBoundingClientRect().top < innerHeight * .5).length - 1;
    if (cur > maxCh) { maxCh = cur; store.set('il:seen', cur); const u = document.querySelector(`[data-go="${cur}"] u`); if (u) u.remove(); }
    const other = v === 'arka' ? 'Nara' : v === 'nara' ? 'Arka' : '', draft = DRAFT.includes(ci);
    const status = draft ? t('menulis untukmu', 'writing to you') : stt === 'both' ? t('online · membaca menu yang sama', 'online · reading the same menu') : stt && other ? `${other} · ${stt === 'on' ? 'online' : stt === 'back' ? t('di kota yang sama', 'in the same city') : t('terakhir dilihat di kota lain', 'last seen in another city')}` : '';
    const key = v + '|' + loc + '|' + status;
    if (key !== headKey && !typing) {
      headKey = key;
      const duo = stt === 'both';
      hName.textContent = duo ? 'Arka & Nara' : v ? v[0].toUpperCase() + v.slice(1) : 'Interlude';
      hAv.textContent = duo ? 'A' : v ? v[0].toUpperCase() : 'I'; hAv.style.setProperty('--c', duo ? 'var(--arka)' : v ? `var(--${v})` : ''); hAv.classList.toggle('duo', duo);
      hLoc.textContent = draft ? status : [loc ? PL[loc][EN ? 1 : 0] : (v ? '' : t('Arka, Nara, Sinta', 'Arka, Nara, Sinta')), status].filter(Boolean).join(' · ');
      hLoc.classList.toggle('on', !draft && (stt === 'on' || stt === 'both') && !!other);
    }
    const f = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);
    pct.textContent = Math.round(f * 100) + '%'; $('#chatH').style.setProperty('--p', f);
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
  let buzz = store.get('il:buzz', true);
  const bz = $('#buzz'); if ('vibrate' in navigator) { bz.hidden = false; bz.setAttribute('aria-pressed', buzz); bz.onclick = () => { buzz = !buzz; store.set('il:buzz', buzz); bz.setAttribute('aria-pressed', buzz); }; }
  // kotak ketik: kalimat yang diketik lalu dihapus
  const comp = $('#comp'), compT = $('#compT'), compW = $('#compW'), wait = ms => new Promise(r => setTimeout(r, ms));
  let compBusy = false;
  const erase = async d => {
    if (compBusy || calm) return; compBusy = true;
    compW.textContent = d.who; comp.hidden = false; compT.innerHTML = ''; await wait(400);
    if (+d.ghost) { // layar lelaki itu hanya terpantul: tiga baris, dua dihapus
      for (let n = 0; n < +d.ghost; n++) { compT.insertAdjacentHTML('beforeend', `<i class="gl" style="width:${[78, 92, 64][n]}%"></i>`); await wait(500); }
      await wait(800); const ls = compT.querySelectorAll('.gl'); for (let n = ls.length - 1; n >= +d.keep; n--) { ls[n].remove(); await wait(450); }
    } else if (d.text) {
      for (const ch of d.text) { compT.textContent += ch; await wait(55); } await wait(900);
      while (compT.textContent) { compT.textContent = compT.textContent.slice(0, -1); await wait(28); }
    } else await wait(1800); // percakapan dibuka, lalu ditutup tanpa mengetik
    await wait(500); comp.hidden = true; compBusy = false;
  };
  const show = el => {
    el.classList.add('in');
    if (el.classList.contains('del')) return erase(el.dataset);
    if (el.classList.contains('photo')) setTimeout(() => el.classList.add('sharp'), 700);
    if (el.classList.contains('lock')) return setTimeout(() => el.classList.add('open'), 900);
    if (buzz && el.classList.contains('sms') && el.classList.contains('you')) try { navigator.vibrate?.([18, 60, 18]); } catch (e) { /* tidak didukung */ }
    if (calm || !el.classList.contains('you') || el.classList.contains('note') || scrollY < 200) return;
    el.classList.add('typing'); typing++; hLoc.textContent = (el.dataset.who ? el.dataset.who + ' ' : '') + t('sedang mengetik…', 'is typing…');
    setTimeout(() => { el.classList.remove('typing'); if (!--typing) { headKey = ''; frame(); } }, 520 + Math.min(900, el.textContent.length * 9));
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' }) : null;
  document.querySelectorAll('.msg, .nar, .del, .lock').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  frame();
})();
