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
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let calm = motionQuery.matches || store.get('il:calm', false);
  document.documentElement.toggleAttribute('data-calm', calm);
  document.documentElement.lang = t('id', 'en');
  document.documentElement.classList.add('js');

  let work;
  try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work || !Array.isArray(work.chapters) || !work.chapters.length) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; document.documentElement.classList.remove('js'); $('#readerTools').hidden = true; $('#openArchive').hidden = true; $('#openAtmosphere').hidden = true; $('.reading-start').hidden = true; return; }
  const chapters = (EN && work.en?.chapters) || work.chapters;
  const wordCount = text => (text.match(/\S+/g) || []).length;
  const minutes = c => Math.max(1, Math.ceil(wordCount(c.body.join(' ')) / 180));
  $('#readingMeta').textContent = t(`${chapters.length} percakapan · ±${chapters.reduce((n, c) => n + minutes(c), 0)} menit`, `${chapters.length} conversations · about ${chapters.reduce((n, c) => n + minutes(c), 0)} min`);
  $('#begin').textContent = t('Mulai membaca', 'Start reading');
  $('#readingNote').textContent = t('Posisi bacamu diingat di perangkat ini.', 'Your place is remembered on this device.');
  $('#pct').setAttribute('aria-label', t('Kemajuan membaca', 'Reading progress'));
  $('#chaptersTitle').textContent = t('Daftar percakapan', 'Conversations');
  $('#chapterList').setAttribute('aria-label', t('Bab', 'Chapters'));
  $('#closeChapters').setAttribute('aria-label', t('Tutup', 'Close'));
  $('#readerTools').setAttribute('aria-label', t('Pengaturan bacaan', 'Reading settings'));
  $('#previousChapter').setAttribute('aria-label', t('Bab sebelumnya', 'Previous chapter'));
  $('#nextChapter').setAttribute('aria-label', t('Bab berikutnya', 'Next chapter'));
  $('#smaller').setAttribute('aria-label', t('Perkecil huruf', 'Decrease text size'));
  $('#bigger').setAttribute('aria-label', t('Perbesar huruf', 'Increase text size'));
  $('#archiveKick').textContent = t('Interlude · Arsip', 'Interlude · Archive');
  $('#archiveTitle').textContent = t('Yang tertinggal', 'What remains');
  $('#archiveNote').textContent = t('Draf, foto, dan catatan yang sudah kamu temui tinggal di sini. Tersimpan di perangkat ini.', 'Drafts, photos, and notes you have encountered stay here. Saved on this device.');
  $('#closeArchive').setAttribute('aria-label', t('Tutup arsip', 'Close archive'));

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
  const SPACES = {
    baru: 'room', lama: 'room', tunggu: 'room', kedai: 'cafe', rsinta: 'room', studio: 'room',
    darka: 'room', warung: 'cafe', jalan: 'outdoors', knara: 'night', fotokopi: 'room', karka: 'night',
    ibu: 'room', teras: 'outdoors', rnara: 'room', dsinta: 'room', bandara: 'terminal', jauh: 'room',
    halte: 'outdoors', kolam: 'water', mobil: 'transit'
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
    '3,40': ['Arka', t('nota', 'the receipt'), ['receipt']], '4,19': ['Nara', t('meja lain, sudutnya penuh kertas', 'another table, one corner covered in paper'), ['desk']],
    '6,44': ['Nara', t('tangkapan layar · satu baris ditandai', 'screenshot · one line highlighted'), ['acceptance']], '7,27': ['Arka', t('halaman buku', 'a page of the book'), ['book']],
    '9,12': ['Nara', t('roti, bungkusnya sudah terbuka', 'the bread, wrapping open'), ['bread']], '9,15': ['Nara', t('kamar · jalan · pasar', 'room · street · market'), ['room', 'street', 'market']]
  };
  const PHOTO_ALT = {
    receipt: t('Bagian belakang nota dengan tulisan tangan di atas meja kedai.', 'The back of a receipt with a handwritten note on a café table.'),
    desk: t('Meja kamar Nara dengan tumpukan kertas dan cetakan foto.', 'Nara’s bedroom desk piled with papers and photographic prints.'),
    acceptance: t('Foto layar laptop, dengan baris kabar diterima ditandai kuning.', 'A photograph of a laptop screen with the acceptance line highlighted in yellow.'),
    book: t('Halaman buku terbuka di bawah cahaya lampu malam.', 'An open book under the warm light of a bedside lamp.'),
    bread: t('Roti di dalam bungkus plastik yang terbuka, di kursi ruang tunggu bandara.', 'Bread in an open plastic wrapper on an airport waiting-area seat.'),
    room: t('Kamar baru Nara, dengan koper yang belum selesai dibongkar.', 'Nara’s new room, with a suitcase still being unpacked.'),
    street: t('Trotoar menuju tempat belajar, masih basah sesudah hujan.', 'The pavement on the way to class, still wet after rain.'),
    market: t('Peti buah di pasar dekat tempat tinggal Nara.', 'Crates of fruit at the market near Nara’s room.')
  };
  const photoMarkup = scene => `<div class="photo-grid${PHOTO[scene][2].length > 1 ? ' photo-grid-many' : ''}">${PHOTO[scene][2].map((file, index) => `<button class="ph" type="button" data-photo="${scene}" data-photo-index="${index}" aria-label="${esc(t('Perbesar foto: ', 'Enlarge photo: ') + PHOTO_ALT[file])}"><img src="photos/${file}.webp" alt="${esc(PHOTO_ALT[file])}" width="1448" height="1086" loading="lazy" decoding="async"><span aria-hidden="true">${esc(PHOTO[scene][2].length > 1 ? t(['kamar', 'jalan', 'pasar'][index], ['room', 'street', 'market'][index]) : PHOTO[scene][1])}</span></button>`).join('')}</div>`;
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
  // Arsip merujuk naskah yang sama; tidak merekonstruksi kata-kata yang dihapus.
  const archiveKind = { unsent: t('Tak terkirim', 'Unsent'), photo: t('Foto', 'Photo'), notebook: t('Buku tulis', 'Notebook'), note: t('Catatan pribadi', 'Private note') };
  const entryAt = (kind, key, owner, title) => {
    const [chapter, paragraph] = key.split(',').map(Number);
    return { id: kind + '-' + key.replace(',', '-'), kind, chapter, paragraph, owner, title };
  };
  const chapterTitle = i => chapters[i]?.title.replace(/^.*?\s+[—–-]\s+/, '') || '';
  const archiveEntries = [
    ...Object.entries(DEL).map(([key, d]) => ({ ...entryAt('unsent', key, d.who, d.text || (d.ghost ? t('Tiga baris, satu tersisa', 'Three lines, one left') : t('Percakapan yang ditutup', 'The conversation left closed'))), draft: d })),
    ...Object.entries(PHOTO).map(([key, [owner, title]]) => entryAt('photo', key, owner, title)),
    ...DRAFT.map(i => entryAt('notebook', `${i},0`, 'Arka', chapterTitle(i))),
    ...[2, 8].map(i => entryAt('note', `${i},0`, 'Sinta', chapterTitle(i)))
  ].filter(e => typeof chapters[e.chapter]?.body?.[e.paragraph] === 'string')
    .sort((a, b) => a.chapter - b.chapter || a.paragraph - b.paragraph);
  const storedArchive = store.get('il:archive', []);
  const collected = new Set(Array.isArray(storedArchive) ? storedArchive.filter(id => archiveEntries.some(e => e.id === id)) : []);
  const archivePoints = new Map();
  archiveEntries.forEach(e => {
    const key = `${e.chapter},${e.paragraph}`;
    archivePoints.set(key, [...(archivePoints.get(key) || []), e]);
  });
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
      html += `<div class="passage" id="p-${i}-${k}" data-ch="${i}" data-p="${k}">`;
      while (bi < B.length && B[bi][0] * 1000 + B[bi][1] <= i * 1000 + k) { const d = B[bi][2]; if (d.pl != null) pl = d.pl; if (d.who != null) who = d.who; bi++; }
      ST.forEach(([a, b, s]) => { if (a === i && b === k) html += `<i class="stm" data-st="${s}"></i>`; });
      if (p.startsWith('### ')) { pov = voiceOf(p.slice(4)); last = null; html += `<h3 data-v="${pov}">${esc(p.slice(4))}</h3>`; shown = ''; if (pov === 'sinta') html += `<div class="lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="shackle" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span><b>${t('Catatan pribadi Sinta', 'Sinta\u2019s private notes')}</b><small>${t('Pintunya tidak bisa ditutup rapat.', 'The door never quite closes.')}</small></span></div>`; html += '</div>'; return; }
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
      if (ph) { html += `<div class="msg you photo" data-who="${ph[0]}"><span class="nm" style="--nc:var(--${ph[0].toLowerCase()})">${ph[0]} · ${t('foto', 'photo')}</span>${photoMarkup(i + ',' + k)}</div>`; last = 'you'; lastName = ph[0]; }
      if (cl) html += `<p class="loc call ${cl[0]}"><span>${TEL}${cl[0] === 'in' ? t('Panggilan masuk · ', 'Incoming call · ') + cl[1] : cl[0] === 'out' ? t('Memanggil ', 'Calling ') + cl[1] + '…' : t('Panggilan berakhir', 'Call ended')}</span></p>`;
      if (/sembilan puluh, kamu sepuluh|ninety to give/i.test(p)) html += `<div class="split"><button class="split-bar" type="button" aria-label="${t('Balik', 'Flip')}"><span class="split-a" style="flex-grow:90">90</span><span class="split-n" style="flex-grow:10">10</span></button><small>${t('Ketuk untuk membalik', 'Tap to flip')}</small></div>`;
      (archivePoints.get(`${i},${k}`) || []).forEach(e => { html += `<span class="archive-point" data-archive="${e.id}" aria-hidden="true"></span>`; });
      html += '</div>';
    });
    html += `${draft ? `<p class="draft-f">${t('Dari buku tulis Arka · tidak pernah dikirim', 'From Arka\u2019s notebook · never sent')}</p>` : ''}${i < chapters.length - 1 ? `<footer class="chapter-pause"><span aria-hidden="true">· · ·</span><a class="chapter-next" data-next="${i + 1}" href="#bab-${i + 2}">${t('Percakapan berikutnya', 'The next conversation')} <span aria-hidden="true">→</span></a><small>${t('Boleh berhenti sejenak di sini.', 'You can pause here for a while.')}</small></footer>` : ''}</section>`;
  });
  // daftar percakapan: setiap bab satu utas, seperti layar depan aplikasi chat
  const oldSeen = store.get('il:seen', -1), visited = store.get('il:visited', null);
  const seen = new Set(Array.isArray(visited) ? visited : chapters.map((_, i) => i).filter(i => i <= oldSeen));
  const firstPl = i => { const b = B.find(x => x[0] === i && x[2].pl); return b ? PL[b[2].pl][EN ? 1 : 0] : ''; };
  const chapterLinks = `<ol class="inbox">${chapters.map((c, i) => {
    const v = voiceOf(c.title), [, nm, ti] = /^(.*?)\s+[—–-]\s+(.*)$/.exec(c.title) || [, t('Bertiga', 'All three'), c.title];
    const prev = c.body.find(p => !p.startsWith('###')) || '';
    return `<li><a href="#bab-${i + 1}" data-go="${i}" style="--c:var(--${v || 'muted'})"><i class="av" aria-hidden="true">${v ? v[0].toUpperCase() : '3'}</i><span class="ib-t"><b>${esc(nm || '')}</b><small>${esc(ti)}</small><em>${esc(prev.replace(/[“”*]/g, '').slice(0, 90))}</em></span><span class="ib-m"><span>${i + 1} · <span class="chapter-time">${minutes(c)} ${t('mnt', 'min')}</span></span>${!seen.has(i) ? `<span class="unread" aria-label="${t('Belum dibuka', 'Not opened')}"></span>` : ''}<small>${esc(firstPl(i).split(' · ')[0])}</small></span></a></li>`;
  }).join('')}</ol>`;
  $('.reading-start').insertAdjacentHTML('afterend', `<details class="chapter-preview"><summary>${t('Lihat 12 percakapan', 'Explore 12 conversations').replace('12', chapters.length)}</summary>${chapterLinks}</details>`);
  $('#chapterList').innerHTML = chapterLinks;
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

  // Simpan paragraf dan posisi di dalamnya, bukan tinggi seluruh halaman.
  const sections = [...document.querySelectorAll('.ch')];
  const passages = [...document.querySelectorAll('.passage')];
  const marks = [...document.querySelectorAll('.ch, .ch h3, .loc[data-pl], .stm')];
  const hAv = $('#hAv'), hName = $('#hName'), hLoc = $('#hLoc'), pct = $('#pct');
  const dialog = $('#chapterDialog'), archiveDialog = $('#archiveDialog'), photoViewer = $('#photoViewer'), atmosphereDialog = $('#atmosphereDialog'), resume = $('#resume');
  const dialogs = [dialog, archiveDialog, photoViewer, atmosphereDialog];
  const soundToggle = $('#soundToggle'), soundVolume = $('#soundVolume'), soundStatus = $('#soundStatus');
  $('#atmosphereTitle').textContent = t('Suasana membaca', 'Reading atmosphere');
  $('#openAtmosphere').setAttribute('aria-label', t('Suasana membaca', 'Reading atmosphere'));
  $('#closeAtmosphere').setAttribute('aria-label', t('Tutup', 'Close'));
  $('#soundNote').textContent = t('Suara ruang mengikuti tempat dalam cerita. Nyalakan jika ingin ditemani.', 'Room tones follow the places in the story. Turn them on if you would like some company.');
  $('#volumeLabel').textContent = t('Volume', 'Volume');
  $('#focusToggle').textContent = t('Ruang baca', 'Reading room');
  $('#focusNote').textContent = t('Sembunyikan bilah alat bawah agar layar lebih lapang. Daftar bab tetap bisa dibuka dari kepala percakapan.', 'Hide the bottom toolbar for a little more room. You can still open chapters from the conversation header.');
  const renderSound = state => {
    soundToggle.disabled = !state.supported;
    soundToggle.setAttribute('aria-pressed', state.enabled);
    $('#openAtmosphere').toggleAttribute('data-playing', state.playing);
    const retry = state.enabled && !state.playing && !state.paused && state.scene;
    soundToggle.textContent = state.enabled ? (retry ? t('Lanjutkan suara', 'Resume sound') : t('Matikan suara ruang', 'Turn room tones off')) : t('Nyalakan suara ruang', 'Turn room tones on');
    const message = !state.supported ? t('Suara belum tersedia di peramban ini. Kamu tetap bisa membaca.', 'Sound is unavailable in this browser. You can keep reading.')
      : state.error ? t('Suara belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.')
      : !state.enabled ? t('Hening. Suara hanya menyala saat kamu memilihnya.', 'Silence. Sound only starts when you choose it.')
      : state.paused ? t('Suara dijeda selama tab tidak aktif.', 'Sound is paused while this tab is inactive.')
      : !state.scene ? t('Suara akan hadir saat kamu mulai membaca.', 'Sound will join you when you start reading.')
      : state.playing ? t('Suara ruang menyala pelan, mengikuti adegan.', 'Room tones are on, softly following the scene.')
      : t('Ketuk lanjutkan untuk mendengar kembali.', 'Tap resume to listen again.');
    if (soundStatus.textContent !== message) soundStatus.textContent = message;
  };
  const ambience = typeof window.InterludeAmbience === 'function' ? new window.InterludeAmbience(renderSound) : {
    supported: false, enabled: false, playing: false, setScene() {}, setVolume() {}, setPaused() {}, dispose() {}
  };
  const storedVolume = store.get('il:volume', 28);
  soundVolume.value = Number.isFinite(storedVolume) ? clamp(storedVolume, 0, 100) : 28;
  const setVolume = () => {
    const value = +soundVolume.value; $('#soundVolumeValue').value = value + '%';
    soundVolume.setAttribute('aria-valuetext', value + '%'); store.set('il:volume', value); ambience.setVolume(value / 100);
  };
  soundVolume.oninput = setVolume; setVolume(); renderSound(ambience);
  soundToggle.onclick = () => ambience.setEnabled(!ambience.enabled || !ambience.playing && !ambience.paused && !!ambience.scene);
  const setFocus = value => {
    const focused = !!value; document.documentElement.toggleAttribute('data-focus', focused);
    $('#focusToggle').setAttribute('aria-pressed', focused); store.set('il:focus', focused);
  };
  setFocus(store.get('il:focus', false));
  $('#focusToggle').onclick = () => setFocus(!document.documentElement.hasAttribute('data-focus'));
  const renderArchive = () => {
    const entries = archiveEntries.filter(e => collected.has(e.id));
    const count = $('#archiveCount'); count.textContent = entries.length; count.hidden = !entries.length;
    $('#openArchive').setAttribute('aria-label', t(`Buka arsip Interlude, ${entries.length} fragmen`, `Open Interlude archive, ${entries.length} fragments`));
    $('#openArchive').title = t('Arsip Interlude', 'Interlude archive');
    $('#archiveList').innerHTML = entries.length ? entries.map(e => {
      const color = NAMES.includes(e.owner) ? e.owner.toLowerCase() : 'muted';
      let object = '';
      if (e.kind === 'photo') object = photoMarkup(`${e.chapter},${e.paragraph}`);
      if (e.draft?.ghost) object = `<div class="archive-ghost" aria-hidden="true"><i></i><i></i><i></i></div><p class="archive-caption">${t('Tiga baris ditulis. Dua dihapus.', 'Three lines written. Two erased.')}</p>`;
      else if (e.draft?.text) object = `<blockquote>${esc(e.draft.text)}</blockquote><p class="archive-caption">${t('Dihapus sebelum dikirim.', 'Erased before it was sent.')}</p>`;
      else if (e.draft) object = `<p class="archive-caption">${t('Percakapan dibuka, lalu ditutup tanpa mengetik.', 'A conversation opened, then closed without typing.')}</p>`;
      return `<details class="archive-entry" data-entry="${e.id}" style="--c:var(--${color})"><summary><small>${archiveKind[e.kind]} · ${esc(e.owner)} · ${t('Bab', 'Chapter')} ${e.chapter + 1}</small><strong>${esc(e.title)}</strong></summary><div class="archive-body">${object}<p class="archive-excerpt">${inline(chapters[e.chapter].body[e.paragraph])}</p><a class="archive-return" data-source="p-${e.chapter}-${e.paragraph}" href="#p-${e.chapter}-${e.paragraph}">${t('Kembali ke adegan', 'Return to the scene')} →</a></div></details>`;
    }).join('') : `<div class="archive-empty"><p>${t('Belum ada yang tertinggal.', 'Nothing has stayed here yet.')}</p><small>${t('Teruskan membaca. Yang kamu temui akan tersimpan di sini.', 'Keep reading. What you encounter will be saved here.')}</small></div>`;
  };
  const points = [...document.querySelectorAll('.archive-point')];
  const collectVisible = ci => {
    if (ci < 0 || document.hidden) return;
    let changed = false;
    points.forEach(el => {
      if (collected.has(el.dataset.archive) || +el.closest('.passage').dataset.ch !== ci) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < 60 || rect.top > innerHeight * .88) return;
      collected.add(el.dataset.archive); changed = true;
    });
    if (changed) {
      store.set('il:archive', [...collected]); renderArchive();
      $('#archiveAnnouncement').textContent = t(`Arsip Interlude: ${collected.size} fragmen tersimpan.`, `Interlude archive: ${collected.size} fragments saved.`);
    }
  };
  renderArchive();
  const saved = store.get('il:place', null), legacyProgress = store.get('prog', {})[SLUG];
  const savedPassage = saved && Number.isInteger(saved.chapter) && Number.isInteger(saved.paragraph)
    ? document.getElementById(`p-${saved.chapter}-${saved.paragraph}`) : null;
  const weights = new Map();
  let totalWords = 0;
  passages.forEach(el => {
    const words = wordCount(chapters[+el.dataset.ch].body[+el.dataset.p]);
    weights.set(el, { before: totalWords, words }); totalWords += words;
  });
  let headKey = '', saveT = 0, currentChapter = -1, latestPlace = null;
  let typing = 0, effectEpoch = 0, compBusy = false;
  const effectTimers = new Set();
  const comp = $('#comp'), compT = $('#compT'), compW = $('#compW');
  const later = (fn, ms) => {
    const id = setTimeout(() => { effectTimers.delete(id); fn(); }, ms);
    effectTimers.add(id);
  };
  const cancelEffects = () => {
    effectEpoch++; effectTimers.forEach(clearTimeout); effectTimers.clear(); typing = 0; compBusy = false;
    comp.hidden = true; compT.textContent = ''; headKey = '';
    document.querySelectorAll('.typing').forEach(el => el.classList.remove('typing'));
    document.querySelectorAll('.photo.in').forEach(el => el.classList.add('sharp'));
    document.querySelectorAll('.lock.in').forEach(el => el.classList.add('open'));
  };
  // Paragraf berurutan: cari posisi baca tanpa mengukur seluruh novel setiap guliran.
  const atLine = (elements, line) => {
    let lo = 0, hi = elements.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (elements[mid].getBoundingClientRect().top <= line) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
  };
  const capturePlace = () => {
    const ci = atLine(sections, 110);
    if (ci < 0) return null; // Sampul tidak menghapus posisi baca sebelumnya.
    let el = passages[Math.max(0, atLine(passages, 94))];
    if (+el.dataset.ch !== ci) el = sections[ci].querySelector('.passage');
    const rect = el.getBoundingClientRect(), offset = clamp((94 - rect.top) / Math.max(1, rect.height), 0, 1);
    const w = weights.get(el);
    const finished = ci === chapters.length - 1 && scrollY + innerHeight >= document.documentElement.scrollHeight - 12;
    return { chapter: ci, paragraph: +el.dataset.p, offset, progress: finished ? 1 : (w.before + offset * w.words) / Math.max(1, totalWords) };
  };
  const persistPlace = () => {
    if (!latestPlace) return;
    store.set('il:place', latestPlace);
    store.set('prog', { ...store.get('prog', {}), [SLUG]: +latestPlace.progress.toFixed(4) });
    if (latestPlace.progress === 1) {
      const st = store.get('stats', {}); st.done = st.done || [];
      if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
    }
  };
  const frame = () => {
    if (dialogs.some(d => d.open)) return;
    const ci = atLine(sections, 110);
    collectVisible(ci);
    if (ci !== currentChapter) {
      cancelEffects(); currentChapter = ci;
      $('#chapterToggle').textContent = ci < 0 ? t('Bab', 'Chapters') : t(`Bab ${ci + 1}/${chapters.length}`, `Ch. ${ci + 1}/${chapters.length}`);
      $('#previousChapter').disabled = ci <= 0;
      $('#nextChapter').disabled = ci === chapters.length - 1;
      document.querySelectorAll('.inbox [data-go]').forEach(a => {
        if (+a.dataset.go === ci) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      if (ci >= 0 && !seen.has(ci)) {
        seen.add(ci); store.set('il:visited', [...seen]);
        document.querySelectorAll(`.inbox [data-go="${ci}"] .unread`).forEach(el => el.remove());
      }
    }
    let v = '', loc = '', stt = '';
    for (const m of marks) {
      const top = m.getBoundingClientRect().top;
      if (m.dataset.st) { if (top < innerHeight * .6) stt = m.dataset.st; continue; }
      if (top > 110) continue;
      if (m.classList.contains('ch')) { v = m.dataset.v; loc = ''; } else if (m.tagName === 'H3') v = m.dataset.v; else loc = m.dataset.pl;
    }
    const other = v === 'arka' ? 'Nara' : v === 'nara' ? 'Arka' : '', draft = DRAFT.includes(ci);
    const status = draft ? t('menulis untukmu', 'writing to you') : stt === 'both' ? t('online · membaca menu yang sama', 'online · reading the same menu') : stt && other ? `${other} · ${stt === 'on' ? 'online' : stt === 'back' ? t('di kota yang sama', 'in the same city') : t('terakhir dilihat di kota lain', 'last seen in another city')}` : '';
    const key = v + '|' + loc + '|' + status;
    const scenePlace = ci < 0 ? '' : loc || B.find(b => b[0] === ci && b[2].pl)?.[2].pl || '';
    $('#soundPlace').textContent = scenePlace ? PL[scenePlace][EN ? 1 : 0] : t('Di ambang cerita', 'At the beginning of the story');
    ambience.setScene(SPACES[scenePlace] || '');
    if (document.documentElement.dataset.voice !== v) {
      document.documentElement.dataset.voice = v;
      document.documentElement.style.setProperty('--scene-tint', `var(--${v || 'bg'})`);
    }
    if (key !== headKey && !typing) {
      headKey = key;
      const duo = stt === 'both';
      hName.textContent = duo ? 'Arka & Nara' : v ? v[0].toUpperCase() + v.slice(1) : 'Interlude';
      hAv.textContent = duo ? 'A' : v ? v[0].toUpperCase() : 'I'; hAv.style.setProperty('--c', duo ? 'var(--arka)' : v ? `var(--${v})` : ''); hAv.classList.toggle('duo', duo);
      hLoc.textContent = draft ? status : [loc ? PL[loc][EN ? 1 : 0] : (v ? '' : t('Arka, Nara, Sinta', 'Arka, Nara, Sinta')), status].filter(Boolean).join(' · ');
      hLoc.classList.toggle('on', !draft && (stt === 'on' || stt === 'both') && !!other);
    }
    const place = capturePlace(), f = place ? place.progress : 0;
    pct.textContent = Math.round(f * 100) + '%'; pct.setAttribute('aria-valuenow', Math.round(f * 100)); $('#chatH').style.setProperty('--p', f);
    if (place) {
      latestPlace = place; clearTimeout(saveT); saveT = setTimeout(persistPlace, 400);
    }
  };
  let raf = 0;
  const scheduleFrame = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  addEventListener('scroll', scheduleFrame, { passive: true });
  addEventListener('resize', () => {
    if (latestPlace && currentChapter >= 0 && !dialogs.some(d => d.open)) {
      goTo(document.getElementById(`p-${latestPlace.chapter}-${latestPlace.paragraph}`), latestPlace.offset, false, false);
    } else scheduleFrame();
  });
  addEventListener('pagehide', persistPlace);
  addEventListener('pagehide', () => ambience.dispose());
  document.addEventListener('visibilitychange', () => {
    ambience.setPaused(document.hidden);
    if (document.hidden) { persistPlace(); cancelEffects(); } else frame();
  });

  const goTo = (el, offset = 0, changeHash = true, focus = true) => {
    if (!el) return;
    dialogs.forEach(d => { if (d.open) d.close(); });
    cancelEffects();
    scrollTo({ top: scrollY + el.getBoundingClientRect().top - 94 + offset * el.getBoundingClientRect().height, behavior: 'instant' });
    if (changeHash) history.replaceState(null, '', '#' + el.id);
    if (focus) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    frame();
  };
  $('#begin').onclick = () => goTo(sections[0]);
  $('#previousChapter').onclick = () => goTo(sections[Math.max(0, currentChapter - 1)]);
  $('#nextChapter').onclick = () => goTo(sections[Math.min(chapters.length - 1, currentChapter + 1)]);
  document.querySelectorAll('.chapter-next').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); goTo(sections[+a.dataset.next]);
  }));
  document.querySelectorAll('.inbox [data-go]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); goTo(sections[+a.dataset.go]);
  }));
  const openChapters = () => {
    dialog.showModal();
    const current = dialog.querySelector('[aria-current]');
    if (current) { current.focus({ preventScroll: true }); current.scrollIntoView({ block: 'nearest' }); }
  };
  [$('#openChapters'), $('#chapterToggle')].forEach(b => {
    b.setAttribute('aria-label', t('Daftar percakapan', 'Conversations')); b.onclick = openChapters;
  });
  $('#closeChapters').onclick = () => dialog.close();
  $('#openArchive').onclick = () => {
    persistPlace(); cancelEffects(); renderArchive(); archiveDialog.showModal();
  };
  $('#closeArchive').onclick = () => archiveDialog.close();
  $('#openAtmosphere').onclick = () => { persistPlace(); cancelEffects(); atmosphereDialog.showModal(); };
  $('#closeAtmosphere').onclick = () => atmosphereDialog.close();
  $('#archiveList').addEventListener('click', e => {
    const a = e.target.closest('[data-source]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); goTo(document.getElementById(a.dataset.source));
  });
  let photoScene = '', photoIndex = 0;
  const showPhoto = () => {
    const files = PHOTO[photoScene][2], file = files[photoIndex];
    $('#photoImage').src = `photos/${file}.webp`; $('#photoImage').alt = PHOTO_ALT[file];
    $('#photoTitle').textContent = PHOTO_ALT[file];
    $('#photoCounter').textContent = `${photoIndex + 1} / ${files.length}`;
    $('#photoNavigation').hidden = files.length < 2;
    $('#previousPhoto').disabled = photoIndex === 0; $('#nextPhoto').disabled = photoIndex === files.length - 1;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-photo]');
    if (!b || !PHOTO[b.dataset.photo]) return;
    photoScene = b.dataset.photo; photoIndex = +b.dataset.photoIndex;
    persistPlace(); cancelEffects(); showPhoto(); photoViewer.showModal();
  });
  const stepPhoto = delta => { photoIndex = clamp(photoIndex + delta, 0, PHOTO[photoScene][2].length - 1); showPhoto(); };
  $('#previousPhoto').onclick = () => stepPhoto(-1); $('#nextPhoto').onclick = () => stepPhoto(1);
  $('#closePhoto').onclick = () => photoViewer.close();
  $('#closePhoto').setAttribute('aria-label', t('Tutup foto', 'Close photo'));
  $('#previousPhoto').setAttribute('aria-label', t('Foto sebelumnya', 'Previous photo'));
  $('#nextPhoto').setAttribute('aria-label', t('Foto berikutnya', 'Next photo'));
  $('#photoNavigation').setAttribute('aria-label', t('Foto dalam kiriman ini', 'Photos in this message'));
  photoViewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepPhoto(e.key === 'ArrowLeft' ? -1 : 1); }
  });
  dialogs.forEach(d => {
    d.addEventListener('close', scheduleFrame);
    d.addEventListener('click', e => {
      const r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
    });
  });
  const followHash = () => {
    if (!/^#(?:bab-\d+|p-\d+-\d+)$/.test(location.hash)) return;
    goTo(document.getElementById(location.hash.slice(1)), 0, false);
  };
  addEventListener('hashchange', followHash);

  const rd = store.get('rd', {});
  let size = clamp(+rd.size || 17, 14, 24);
  const setSize = d => {
    const place = d ? capturePlace() : null;
    size = clamp(size + d, 14, 24); document.documentElement.style.setProperty('--size', size + 'px');
    store.set('rd', { ...store.get('rd', {}), size });
    $('#smaller').disabled = size === 14; $('#bigger').disabled = size === 24;
    if (place) goTo(document.getElementById(`p-${place.chapter}-${place.paragraph}`), place.offset, false, false);
  };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);

  const r = store.get('read', []); if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
  const st = store.get('stats', {}); st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st);
  if (savedPassage || legacyProgress > .02 && legacyProgress < .97) {
    resume.hidden = false; $('.reading-start').classList.add('has-resume');
    resume.textContent = savedPassage ? t(`Lanjutkan · Bab ${saved.chapter + 1}`, `Continue · Chapter ${saved.chapter + 1}`) : t(`Lanjutkan dari ${Math.round(legacyProgress * 100)}%`, `Continue from ${Math.round(legacyProgress * 100)}%`);
    resume.onclick = () => {
      if (savedPassage) goTo(savedPassage, clamp(+saved.offset || 0, 0, 1));
      else { cancelEffects(); scrollTo(0, legacyProgress * (document.documentElement.scrollHeight - innerHeight)); frame(); }
    };
  }
  [$('#back'), $('#back2')].forEach(a => a.addEventListener('click', e => {
    persistPlace();
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
  }));

  const calmButton = $('#calm');
  const syncCalm = () => {
    calm = motionQuery.matches || store.get('il:calm', false);
    document.documentElement.toggleAttribute('data-calm', calm);
    calmButton.textContent = t('Baca tenang', 'Quiet reading');
    calmButton.setAttribute('aria-pressed', calm); calmButton.disabled = motionQuery.matches;
    calmButton.title = motionQuery.matches ? t('Mengikuti pengaturan kurangi animasi perangkatmu', 'Following your device’s reduced motion setting') : t('Baca tanpa animasi, jeda mengetik, atau getaran', 'Read without animations, typing pauses, or vibration');
    cancelEffects(); frame();
  };
  calmButton.onclick = () => { store.set('il:calm', !calm); syncCalm(); };
  motionQuery.addEventListener('change', syncCalm);
  let buzz = store.get('il:buzz', true);
  const bz = $('#buzz');
  if ('vibrate' in navigator) {
    bz.hidden = false; bz.setAttribute('aria-label', t('Getar', 'Vibration')); bz.setAttribute('aria-pressed', buzz);
    bz.onclick = () => { buzz = !buzz; store.set('il:buzz', buzz); bz.setAttribute('aria-pressed', buzz); };
  }
  // Hentikan efek saat berpindah bab atau meninggalkan halaman.
  const pause = async (ms, epoch) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    return epoch === effectEpoch && !calm && !document.hidden;
  };
  const erase = async d => {
    if (compBusy || calm || document.hidden) return;
    compBusy = true; const epoch = effectEpoch;
    try {
      compW.textContent = d.who; comp.hidden = false; compT.textContent = '';
      if (!await pause(400, epoch)) return;
      if (+d.ghost) {
        for (let n = 0; n < +d.ghost; n++) {
          compT.insertAdjacentHTML('beforeend', `<i class="gl" style="width:${[78, 92, 64][n]}%"></i>`);
          if (!await pause(500, epoch)) return;
        }
        if (!await pause(800, epoch)) return;
        const ls = compT.querySelectorAll('.gl');
        for (let n = ls.length - 1; n >= +d.keep; n--) { ls[n].remove(); if (!await pause(450, epoch)) return; }
      } else if (d.text) {
        for (const ch of d.text) { compT.textContent += ch; if (!await pause(55, epoch)) return; }
        if (!await pause(900, epoch)) return;
        while (compT.textContent) { compT.textContent = compT.textContent.slice(0, -1); if (!await pause(28, epoch)) return; }
      } else if (!await pause(1800, epoch)) return;
      await pause(500, epoch);
    } finally {
      if (epoch === effectEpoch) { comp.hidden = true; compBusy = false; }
    }
  };
  const show = el => {
    el.classList.add('in');
    const rect = el.getBoundingClientRect();
    const active = !dialogs.some(d => d.open) && +el.closest('.ch').dataset.i === currentChapter && rect.bottom > 60 && rect.top < innerHeight * .88;
    if (el.classList.contains('del')) return active ? erase(el.dataset) : undefined;
    if (el.classList.contains('photo')) { if (calm) el.classList.add('sharp'); else later(() => el.classList.add('sharp'), 700); }
    if (el.classList.contains('lock')) { if (calm) el.classList.add('open'); else later(() => el.classList.add('open'), 900); return; }
    if (calm || document.hidden || !active) return;
    if (buzz && el.classList.contains('sms') && el.classList.contains('you')) try { navigator.vibrate?.([18, 60, 18]); } catch (e) { /* tidak didukung */ }
    if (!el.classList.contains('you') || el.classList.contains('note') || scrollY < 200) return;
    el.classList.add('typing'); typing++; hLoc.textContent = (el.dataset.who ? el.dataset.who + ' ' : '') + t('sedang mengetik…', 'is typing…');
    later(() => { el.classList.remove('typing'); if (!--typing) { headKey = ''; frame(); } }, 520 + Math.min(900, el.textContent.length * 9));
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' }) : null;
  document.querySelectorAll('.msg, .nar, .del, .lock').forEach(el => {
    if (io) io.observe(el); else { el.classList.add('in'); if (el.classList.contains('photo')) el.classList.add('sharp'); if (el.classList.contains('lock')) el.classList.add('open'); }
  });
  syncCalm(); followHash(); frame();
})();
