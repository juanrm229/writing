/* Di Dasar Rumah: seorang gadis dengan tangan yang selalu dingin, dan pekerjaan yang hangat di dasar sebuah rumah.
   Teks dimuat utuh dari content/works.json; yang ditambahkan hanya antarmukanya. Semua yang muncul di luar teks
   mengikuti kalimat yang sedang dibaca:
   - Kedalaman: delapan bagian adalah delapan lantai yang turun. Dingin menempel di tepi layar pada musim dingin,
     kehangatan yang terlalu dekat bernapas di tepi layar setiap kali perempuan bertopi mendekat.
   - Tagihan: angka-angkanya hilang dari kertas saat narasinya sampai ke sana; yang tersisa bekas tekanan pena.
   - Tangga: undakan dihitung di tepi layar, goresan bulan sabit lewat lagi dan lagi, dan koinmu sudah di sana.
   - Nyala kecil: turun dari halaman ke sudut layar dan menemanimu. Kalau kau diam terlalu lama di kamar itu, ia meredup;
     ketuk untuk menemaninya. Sesudah "Nyala itu berdetak", ia berdetak.
   - Bintang: daftar yang masih diingat. Satu demi satu hilang, persis saat ceritanya memberikannya.
   - Nama: namamu (kalau kau menuliskannya) ikut ditulis di halaman kosong itu, lalu kehilangan bunyinya, lalu menjadi Ibu.
   - Buku yang belum pernah dibuka: sesudah ia menemukan tulisannya sendiri, catatan tangannya muncul di tepi halaman-halaman
     sebelumnya, dan setiap "Ibu" di atas menyimpan kata lain. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'dasar'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'di-dasar-rumah', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = s => String(s).replace(/\*/g, '').trim();
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  const isBreak = p => !/[\p{L}\p{N}]/u.test(String(p));
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => motionQ.matches || root.hasAttribute('data-calm');
  root.lang = t('id', 'en');
  root.toggleAttribute('data-calm', !!store.get('dasar:calm', false));
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work || !hasText(work.body)) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; return; }
  const tr = (EN ? work.en : null) || {};
  const BODY = hasText(tr.body) ? tr.body : work.body;
  const title = tr.title || work.title;
  document.title = `${title} · Quiet Margins`;
  $('#title').textContent = title;
  if (EN) {
    $('#lost').hidden = false;
    $('#lost').textContent = hasText(tr.body) ? 'The English text follows an earlier draft of this story; some moments in the room only appear in the Indonesian original.' : 'This story is not translated yet, so it is shown in the original language.';
  }

  /* ---------- bagian dan paragraf ---------- */
  const NAMES = [t('Angka-angka', 'The numbers'), t('Tangga', 'The stairs'), t('Musim dingin pertama', 'The first winter'), t('Musim dingin ketiga', 'The third winter'), t('Pintu', 'The door'), t('Musim dingin berikutnya', 'The next winter'), t('Boleh pulang', 'You may go home'), t('Dongeng', 'The tale')];
  const SECS = [[]];
  BODY.forEach(p => { if (isBreak(p)) { if (SECS[SECS.length - 1].length) SECS.push([]); } else SECS[SECS.length - 1].push(String(p)); });
  const P = []; SECS.forEach((s, si) => s.forEach(text => P.push({ i: P.length, text, sec: si })));
  const nameOf = si => NAMES[si] || `${t('Lantai', 'Floor')} ${si + 1}`;
  const at = re => P.findIndex(p => re.test(plain(p.text)));
  const I = {
    bill: at(/^Tagihan tabib dari dalam/), billGone: at(/lembar-lembar tagihan di bawah siku telah kosong/),
    touch: at(/^Maka ketika, pada suatu sore/), warmMorning: at(/^Pagi terasa hangat/), mari: at(/^Mari\.$/),
    bag: at(/^Gadis itu mengangkat tas karena/), house: at(/rumah panggung dari kayu hitam/),
    stairs: at(/^Tangga batu menempel/), crescent: at(/goresan menyerupai bulan sabit/), coin: at(/menyelipkannya ke goresan itu/), stairsEnd: at(/^Tangga telah berakhir/),
    nyala: at(/nyala keemasan bergerak pelan/), thread: at(/membawa sisanya mengelilingi kamar/), shelf: at(/^Kadang buku-buku itu memuat/),
    mem: at(/mulai menghitung hal-hal yang masih diingat dari atas/), note: at(/^Pada halaman kosong sebuah buku/), nameLost: at(/^Ketika bangun berikutnya, tulisannya masih ada/),
    river: at(/Akhirnya ia memberinya nama sungai/), riverLost: at(/^Cahaya mengembang\. Gadis itu duduk kembali/), lid: at(/^Dari balik dinding terdengar bunyi kaca/), jar: at(/^Gadis itu memanggil perempuan bertopi sampai/),
    stall: at(/^Selama beberapa waktu sesudah itu, ia mencoba tidak memberi/), late: at(/^Denyut berikutnya terlambat/), thin: at(/Nyala tinggal setipis benang/),
    out: at(/^Ia menyelipkan kaki di celah pintu/), inhale: at(/tarikan napas yang begitu panjang/), back: at(/^Gadis itu merangkak kembali/), beat: at(/^Nyala itu berdetak\.$/),
    given3: at(/^Gadis itu telah memberikan bau hujan/), notes: at(/^Kadang-kadang ia menemukan tulisannya sendiri/), book: at(/kisah yang dimulai dengan musim-musim lembut/),
    faceLast: at(/^Ketika nyala akhirnya menyusut sampai hampir/), faceGone: at(/^Tak ada wajah yang datang\.$/), palm: at(/bekas lima jari yang menekan dari dalam/),
    penjaga: at(/seperti sebutan penjaga pada halaman sebelumnya/), blank: at(/^Setelah itu ia tak lagi ingat siapa dirinya/), warn: at(/^Jangan percaya ketika ia mengatakan kau boleh pulang\.$/),
    turn: at(/^Perempuan itu membalik halaman/), told: at(/^Ia mulai dengan desa yang indah/), palms: at(/^Di tengah cerita ia mendengar suara lain/), palm2: at(/tangan-tangan kecil itu menekan dari sisi dalam/),
    mother: at(/^Anak itu membuka mata dan memanggilnya Ibu/), tale: at(/^Maka begini, anakku/), breath2: at(/^Di bawah ranjang, jauh melewati/)
  };
  const has = k => I[k] >= 0;

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, name: '', river: '', kept: 0, coin: false, retold: 0, reach: -1 });
  let S = store.get('dasar', null); S = S && S.v === 1 ? { ...blank(), ...S } : blank();
  const save = () => store.set('dasar', S);
  const reached = k => has(k) && S.reach >= I[k];
  const MEM = [['wajah', t('Wajah Ibu', 'Mother’s face'), 'faceGone'], ['hujan', t('Bau hujan di tanah', 'The smell of rain on earth'), 'given3'], ['garam', t('Rasa garam', 'The taste of salt'), 'given3'], ['sungai', t('Nama sungai di dekat rumah', 'The name of the river near home'), 'riverLost'], ['gunting', t('Bunyi gunting ketika memotong wol', 'The sound of scissors cutting wool'), 'given3']];
  const BAG = [t('Pakaian', 'Clothes'), t('Jarum', 'Needles'), t('Sisa benang', 'Leftover thread'), t('Sisir ibunya yang patah satu gigi', 'Her mother’s comb with one broken tooth')];
  const TOLD = [t('Jalan pulang', 'The way home'), t('Letak dapur', 'Where the kitchen is'), t('Kamar mana yang harus dimasuki sebelum pagi', 'Which room to enter before morning')];
  const memLeft = () => (reached('mem') ? MEM.filter(m => !reached(m[2])).length : 0);

  /* ---------- menyusun teks ---------- */
  const TOPI = /^(Aku dengar|Itulah kepandaian|Kau sudah siap|Sudah selesai mengucapkan|Tentu|Aku belum mengambil|Lelaki yang mendatangi|Aku mengenali yang|Ada yang mendobrak|Sebentar lagi hangat|Kau ingat aku menjanjikan|Sampai kau siap|Masuklah|Supaya nyala itu|Nanti kau akan tahu|Kau menjaganya|Kau memberikannya|Sampai ada yang menggantikanmu|Kau ceritakan kepadanya|Kau belum diminta|Akhirnya kau tak punya|Sekarang kau boleh|Kuberikan satu tugas)/;
  const TUA = /^(Ambil ini|Kalau mendengar seseorang)/, ANAK = /^Ceritakan lagi/;
  const HAND = /^(Aku berada di dasar rumah|Kalau ia padam|Jangan percaya ketika|Aku masih ingat wajah Ibu|pintunya terbuka ke dalam)/;
  const voiceOf = txt => { const qsx = [...txt.matchAll(/“([^”]*)”/g)].map(m => m[1]); if (qsx.some(q => TOPI.test(q))) return 'topi'; if (qsx.some(q => TUA.test(q))) return 'tua'; if (qsx.some(q => ANAK.test(q))) return 'anak'; return qsx.length ? 'gadis' : ''; };
  function textHTML(txt) {
    let h = esc(txt);
    // setiap "Ibu" menyimpan kata lain, tetapi ibu jari tetap ibu jari
    h = h.replace(/\b([Ii]bu)(nya|mu)?\b(?! jari)/g, (m, a, b) => `<span class="ibu" data-g="${b ? 'penjaga' + b : 'penjaga'}">${m}</span>`);
    h = h.replace(/\*(\S(?:[^*]*?\S)?)\*/g, (m, inner) => { const raw = inner.replace(/<[^>]+>/g, ''); return `<em${HAND.test(raw) ? ' class="hand"' : /^Nama sungai yang diberikan/.test(raw) ? ' class="label"' : ''}>${inner}</em>`; });
    const v = voiceOf(txt);
    if (v) h = h.replace(/“([^”]*)”/g, (m, q) => `<span class="q v-${v}">“${q}”</span>`);
    return h;
  }
  const whole = txt => /^\*[^*]+\*$/.test(txt.trim());
  function paraHTML(p) {
    const cls = [];
    if (whole(p.text)) cls.push(p.i === I.mari ? 'mari' : HAND.test(plain(p.text)) ? 'hand-p' : 'lull');
    if (has('tale') && p.i >= I.tale) cls.push('tale');
    if (p.i === I.beat) cls.push('beat');
    if (p.i === I.late || p.i === I.faceGone) cls.push('short');
    return `<p data-i="${p.i}"${cls.length ? ` class="${cls.join(' ')}"` : ''}>${textHTML(p.text)}</p>`;
  }

  /* ---------- benda-benda di luar teks ---------- */
  const BILL = [[t('Tabib dari dalam desa', 'Healer from the village'), '1.840.000'], [t('Tabib dari luar desa', 'Healer from beyond the village'), '6.500.000'], [t('Sisa utang kebutuhan rumah', 'What is left of the household debt'), '2.275.000'], [t('Hari-hari Ibu', 'Mother’s days'), '']];
  const billHTML = gone => `<figure class="bill${gone ? ' gone' : ''}" data-bill="${gone ? 2 : 1}" aria-label="${esc(t('Lembar tagihan', 'The bills'))}">
      <ul>${BILL.map(([k, v]) => `<li><span>${esc(k)}</span><b data-n="${esc(v)}">${v ? esc(v) : '<i class="unwritten"></i>'}</b></li>`).join('')}</ul>
      <p class="bill-mom"><span>${esc(t('ditulis tangan Ibu', 'in Mother’s hand'))}</span><b data-n="38.000">38.000</b></p>
      ${gone ? `<figcaption><button type="button" class="lt-btn ghost" data-tilt>${esc(t('Miringkan ke arah jendela', 'Tilt it toward the window'))}</button></figcaption>` : ''}
    </figure>`;
  const houseHTML = () => `<figure class="house" data-house aria-label="${esc(t('Rumah panggung yang terbalik', 'The upside-down stilt house'))}">
      <svg viewBox="0 0 320 200" aria-hidden="true">
        <path class="rim" d="M0 34 C 70 22, 250 22, 320 34"/>
        <g class="trees"><path d="M28 34 V 62 M18 62 L28 40 L38 62 Z M292 34 V 62 M282 62 L292 40 L302 62 Z M62 34 V 54 M54 54 L62 38 L70 54 Z M258 34 V 54 M250 54 L258 38 L266 54 Z"/></g>
        <g class="home"><path d="M118 60 V 100 M202 60 V 100 M140 60 V 100 M180 60 V 100"/><rect x="112" y="100" width="96" height="44"/><path d="M104 144 L160 184 L216 144 Z"/></g>
        <g class="door"><rect x="150" y="112" width="20" height="30" rx="1.5"/><circle cx="165" cy="128" r="1.6"/></g>
        <path class="mist" d="M0 190 C 60 176, 120 198, 180 186 S 290 178, 320 190"/>
      </svg>
      <figcaption><span data-house-cap>${esc(t('Rumahnya terbalik. Pintunya tidak.', 'The house is upside down. Its door is not.'))}</span><button type="button" class="lt-btn ghost" data-flip>${esc(t('Betulkan letaknya', 'Set it right'))}</button></figcaption>
    </figure>`;
  const coinHTML = () => `<div class="coin-ask"><span class="cr" aria-hidden="true">☾</span><button type="button" class="lt-btn ghost" data-coin>${esc(t('Selipkan satu koin ke goresan itu', 'Slip a coin into the mark'))}</button></div>`;
  const landHTML = () => `<div class="fl-land" id="flLand" aria-hidden="true"><span class="fl-body"><i class="fl-core"></i></span></div>`;
  const threadHTML = () => `<figure class="thread" data-thread aria-label="${esc(t('Benang yang mengukur kamar', 'The thread that measures the room'))}">
      <svg viewBox="0 0 220 220" aria-hidden="true"><g class="walls"><rect x="30" y="30" width="160" height="160" rx="2"/><rect class="door" x="34" y="150" width="4" height="26"/></g>
        <circle class="seat" cx="110" cy="110" r="5"/><path class="yarn" pathLength="100" d="M36 163 V 34 H 186 V 186 H 34 V 172 M36 163 V 120"/></svg>
      <figcaption><button type="button" class="lt-btn ghost" data-measure>${esc(t('Ukur dindingnya', 'Measure the walls'))}</button></figcaption>
    </figure>`;
  const SPINES = [
    [t('anak yang terus mengayun di taman mati', 'a child swinging on in a dead park')], [t('toko bunga tempat seseorang merangkai duka', 'a flower shop where someone arranges grief')],
    [t('lelaki yang menggali makam-makam kosong di dekat bunga biru', 'a man digging empty graves by the blue flowers')], [t('makhluk dengan lipatan daging di bawah dagu', 'a creature with folds of flesh under its chin'), 'torn'],
    [t('makhluk tanpa mata yang mengenali manusia dari gema suara', 'an eyeless creature that knows people by their echo')], [t('kota yang dibangun di atas sesuatu yang disangka tanah', 'a city built on something taken for ground')],
    [t('bayangan yang tetap menunggu di dinding', 'a shadow still waiting on the wall')], [t('sebuah laut yang disembunyikan di bawah kota', 'a sea hidden beneath a city'), 'sea']
  ];
  const shelfHTML = () => `<figure class="shelf" data-shelf aria-label="${esc(t('Buku-buku tanpa nama penulis', 'Books with no author’s name'))}">
      <div class="spines">${SPINES.map(([s, k], i) => `<button type="button" class="spine${k ? ' ' + k : ''}" data-spine="${i}" style="--h:${78 + (i * 37) % 26}%" aria-label="${esc(t('Balik bukunya', 'Turn the book around'))}"><span>${esc(s)}</span></button>`).join('')}</div>
      <figcaption>${esc(t('Punggungnya menghadap dinding. Ketuk untuk membaliknya.', 'Their spines face the wall. Tap to turn one around.'))}</figcaption>
    </figure>`;
  const memCardHTML = () => `<figure class="stars" data-stars aria-label="${esc(t('Yang masih diingat', 'What she still remembers'))}"><ol>${MEM.map(([k, l]) => `<li data-m="${k}"><i aria-hidden="true">✦</i><span>${esc(l)}</span></li>`).join('')}</ol><figcaption>${esc(t('Disimpan seperti orang menyimpan bintang. Ada di tombol bintang di atas.', 'Kept the way one keeps stars. Also behind the star button above.'))}</figcaption></figure>`;
  const signName = () => esc(S.name || '');
  const noteHTML = () => `<figure class="note" data-note aria-label="${esc(t('Halaman kosong yang ditulisinya', 'The blank page she wrote on'))}"><p class="hand">${esc(t('Aku berada di dasar rumah.', 'I am at the bottom of the house.'))}<br>${esc(t('Aku datang untuk bekerja.', 'I came here to work.'))}<br>${esc(t('Aku harus pulang.', 'I must go home.'))}</p><p class="hand sig" data-sig>${signName() || '<span class="nm-blank"></span>'}</p></figure>`;
  const riverHTML = () => `<figure class="river" data-river><p>${esc(t('Nyala itu hampir separuh padam. Ia memberinya nama sungai di dekat rumah. Kau juga punya sungai?', 'The flame is almost half gone. She gives it the name of the river near home. Do you have a river too?'))}</p>
      <form data-river-form><input name="r" maxlength="28" spellcheck="false" placeholder="${esc(t('nama sungai di dekat rumahmu', 'the river near your home'))}" aria-label="${esc(t('Nama sungai di dekat rumahmu', 'The river near your home'))}"><button type="submit" class="lt-btn">${esc(t('Berikan', 'Give it'))}</button></form>
      <p class="river-given" data-river-word></p></figure>`;
  const jarHTML = () => `<figure class="jar" data-jar aria-label="${esc(t('Toples', 'A jar'))}"><span class="jar-glass" aria-hidden="true"><i class="lid"></i></span><figcaption><em class="label">${esc(t('Nama sungai yang diberikan seorang anak agar nyalanya tidak padam.', 'The name of a river, given by a child so her flame would not go out.'))}</em><b data-jar-word></b></figcaption></figure>`;
  const doorsHTML = () => `<figure class="doors" data-doors aria-hidden="true"><svg viewBox="0 0 360 140">${Array.from({ length: 9 }, (_, r) => Array.from({ length: 26 }, (_, c) => { const x = 6 + c * 13.6, y = 10 + r * 14 + Math.sin(c / 3 + r) * 4 - Math.abs(c - 12.5) * .5; return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(7 - r * .4).toFixed(1)}" height="${(10 - r * .5).toFixed(1)}" rx="1" style="--d:${((c * 7 + r * 3) % 17) / 10}s"/>`; }).join('')).join('')}</svg></figure>`;
  const bookHTML = () => `<figure class="book" data-book><span class="book-cov" aria-hidden="true"><i></i></span><figcaption><p>${esc(t('Tak ada nama di sana. Hanya gadis, Ibu, dan perempuan bertopi.', 'No name in it. Only a girl, a mother, and a woman in a hat.'))}</p><button type="button" class="lt-btn ghost" data-open-book>${esc(t('Buka halaman pertamanya', 'Open it to the first page'))}</button></figcaption></figure>`;
  const ghostHTML = () => `<div class="ghost-ask"><button type="button" class="lt-btn ghost" data-look-up>${esc(t('Lihat setiap Ibu di atas', 'Look at every Mother above'))}</button></div>`;
  const INSERTS = [['bill', billHTML(false)], ['billGone', billHTML(true)], ['house', houseHTML()], ['crescent', coinHTML()], ['nyala', landHTML()], ['thread', threadHTML()], ['shelf', shelfHTML()], ['mem', memCardHTML()], ['note', noteHTML()], ['river', riverHTML()], ['jar', jarHTML()], ['out', doorsHTML()], ['book', bookHTML()], ['penjaga', ghostHTML()]];
  // catatan tangannya, di tepi halaman-halaman yang ia baca sebelum kau
  const NOTES = [
    [0, t('Aku berada di dasar rumah. Aku datang untuk bekerja. Aku harus pulang.', 'I am at the bottom of the house. I came here to work. I must go home.'), 'sign'],
    [at(/^Meski semua itu membebani pikirannya/), t('Aku masih ingat wajah Ibu.', 'I still remember Mother’s face.')],
    [at(/^Namun perempuan di hadapannya menawarkan pekerjaan/), t('Jangan percaya ketika ia mengatakan kau boleh pulang.', 'Do not believe her when she says you may go home.')],
    [at(/^“Kau sudah siap, sayang\?”/), t('aku tidak mau', 'I do not want to'), 'circle'],
    [at(/^Gadis itu mengangkat tas karena/), t('pakaian · jarum · benang · sisir, patah satu gigi', 'clothes · needles · thread · comb, one tooth broken')],
    [at(/^Pintu terbuka tanpa suara/), t('pintunya terbuka ke dalam', 'the door opens inward'), 'many'],
    [at(/^Rasa kantuk, ketika datang/), '|||| |||| |||| ||', 'tally'],
    [at(/^Gadis itu berdiri lama dengan tas di tangan/), t('Kalau ia padam, aku ikut berhenti.', 'If it goes out, I stop too.')]
  ].filter(n => n[0] >= 0);
  const noteFor = i => { const n = NOTES.find(x => x[0] === i); if (!n) return ''; const [, txt, k] = n; return `<aside class="margin${k ? ' ' + k : ''}" aria-label="${esc(t('Catatan di tepi halaman', 'A note in the margin'))}"><span class="hand">${k === 'many' ? Array(9).fill(esc(txt)).join(' ') : esc(txt)}</span>${k === 'sign' ? `<span class="hand sig" data-sig>${signName() || '<span class="nm-blank"></span>'}</span>` : ''}</aside>`; };

  story.innerHTML = SECS.map((s, si) => `<section class="step" id="lantai-${si + 1}" data-s="${si}" style="--si:${si}">
      <header class="st-h"><p class="st-k"><span>${esc(t('Lantai', 'Floor'))} ${si === 0 ? esc(t('atas', 'above')) : '−' + si}</span><span class="st-of">${si + 1}/${SECS.length}</span></p><h2 data-name="${esc(nameOf(si))}">${esc(nameOf(si))}</h2></header>
      ${P.filter(p => p.sec === si).map(p => noteFor(p.i) + paraHTML(p) + INSERTS.filter(([k]) => I[k] === p.i).map(x => x[1]).join('')).join('')}
    </section>`).join('');
  const pEl = i => story.querySelector(`p[data-i="${i}"]`);

  /* ---------- kedalaman (rel di tepi) ---------- */
  $('#depth').innerHTML = SECS.map((s, si) => `<a href="#lantai-${si + 1}" style="--i:${si}"><i></i><span data-name="${esc(nameOf(si))}">${esc(nameOf(si))}</span></a>`).join('');
  $('#lgTopi').textContent = t('Suara perempuan bertopi', 'The woman in the hat');
  $('#lgHead').textContent = t('Suara di dalam kepala', 'A voice inside the head');
  $('#lgHand').textContent = t('Tulisan tangannya', 'Her handwriting');
  $('#lgFlame').textContent = t('Nyala kecil', 'The little flame');
  $('#kick').textContent = 'Koda · ' + t('Cerpen', 'Short story');

  /* ---------- nama di halaman kosong ---------- */
  const sigs = () => $$('[data-sig]');
  function paintName() {
    const mother = reached('mother'), lostSound = reached('nameLost');
    const nm = S.name || '';
    sigs().forEach(el => {
      el.classList.toggle('mute', lostSound && !mother); el.classList.toggle('mother', mother);
      el.innerHTML = mother ? esc(t('Ibu', 'Mother')) : nm ? (lostSound ? [...nm].map(c => `<i>${esc(c)}</i>`).join('') : esc(nm)) : '<span class="nm-blank"></span>';
    });
    const inp = $('#signName');
    if (inp && document.activeElement !== inp) { inp.value = mother ? t('Ibu', 'Mother') : nm; inp.readOnly = mother; inp.classList.toggle('mute', lostSound && !mother); }
    $('#signLabel').textContent = mother ? t('Namamu', 'Your name') : t('Tulis namamu di halaman kosong', 'Write your name on the blank page');
    $('#signNote').textContent = mother ? t('Sebutan itu masuk dengan mudah.', 'The word goes in easily.') : t('Hanya tersimpan di perangkatmu.', 'Only kept on your device.');
  }
  $('#sign').addEventListener('submit', e => { e.preventDefault(); $('#signName').blur(); });
  $('#signName').addEventListener('input', e => { if (reached('mother')) return; S.name = e.target.value.trim().slice(0, 24); save(); sigs().forEach(el => { el.innerHTML = S.name ? esc(S.name) : '<span class="nm-blank"></span>'; }); });
  $('#signName').addEventListener('blur', paintName);

  /* ---------- bintang: yang masih diingat ---------- */
  function memPaint() {
    $$('[data-stars] li').forEach(li => { const m = MEM.find(x => x[0] === li.dataset.m); li.classList.toggle('lost', !!m && reached(m[2])); });
    const n = memLeft(), b = $('#openMem');
    if (reached('mem') && !reached('mother')) b.dataset.n = n; else delete b.dataset.n;
  }
  function memSheet() {
    const lostTip = t('Kau bisa membacanya. Ia tidak lagi berarti apa-apa.', 'You can read it. It no longer means anything.');
    const parts = [];
    if (reached('told')) parts.push(`<section class="mem-sec told"><h3>${esc(t('Yang diceritakan kepadanya', 'What she was told'))}</h3><ol>${TOLD.map(x => `<li><i aria-hidden="true">✦</i><span>${esc(x)}</span></li>`).join('')}</ol><p class="mem-n">${esc(t('Ia tidak mengingat pernah berada di sana.', 'She does not remember ever being there.'))}</p></section>`);
    if (reached('mem')) parts.push(`<section class="mem-sec"><h3>${esc(t('Yang masih kuingat dari atas', 'What I still remember from above'))}</h3><ol>${MEM.map(([k, l, when]) => `<li class="${reached(when) ? 'lost' : ''}"${reached(when) ? ` title="${esc(lostTip)}"` : ''}><i aria-hidden="true">✦</i><span>${esc(l)}</span>${k === 'sungai' && S.river ? `<small>${reached(when) ? [...S.river].map(c => `<i>${esc(c)}</i>`).join('') : esc(S.river)}</small>` : ''}</li>`).join('')}</ol>${memLeft() === 0 ? `<p class="mem-n">${esc(lostTip)}</p>` : ''}</section>`);
    if (reached('bag')) parts.push(`<section class="mem-sec"><h3>${esc(t('Di dalam tas', 'In the bag'))}</h3><ol>${BAG.map(x => `<li><i aria-hidden="true">·</i><span>${esc(x)}</span></li>`).join('')}</ol></section>`);
    $('#memTitle').textContent = reached('mother') ? t('Ibu', 'Mother') : reached('mem') ? t(`${memLeft()} bintang`, `${memLeft()} stars`) : t('Bintang', 'Stars');
    $('#memBody').innerHTML = parts.join('') || `<p class="mem-empty">${esc(t('Belum ada yang perlu dihitung. Turunlah.', 'Nothing to count yet. Go down.'))}</p>`;
  }
  const memDlg = $('#mem');
  $('#openMem').onclick = () => { memSheet(); memDlg.showModal(); };
  memDlg.addEventListener('click', e => { if (e.target === memDlg || e.target.closest('[data-close]')) memDlg.close(); });

  /* ---------- suara (tidak menyala sendiri) ---------- */
  const Snd = (() => {
    let ac = null, wind = null, wg = null, on = false;
    const start = () => {
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
      if (ac.state === 'suspended') ac.resume();
      if (!wind) {
        const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0;
        for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
        wind = ac.createBufferSource(); wind.buffer = buf; wind.loop = true;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        wg = ac.createGain(); wg.gain.value = 0; wind.connect(lp).connect(wg).connect(ac.destination); wind.start();
      }
      return true;
    };
    const tone = (f, dur, g0, type = 'sine', f2) => { if (!on || !ac) return; const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f, n); if (f2) o.frequency.exponentialRampToValueAtTime(f2, n + dur); g.gain.setValueAtTime(g0, n); g.gain.exponentialRampToValueAtTime(.0001, n + dur); o.connect(g).connect(ac.destination); o.start(n); o.stop(n + dur + .05); };
    return {
      get on() { return on; },
      set(v) { on = v && start(); if (wg) wg.gain.setTargetAtTime(on ? .05 : 0, ac.currentTime, .6); return on; },
      wind(level) { if (on && wg) wg.gain.setTargetAtTime(.025 + level * .07, ac.currentTime, 1.4); },
      beat() { tone(62, .22, .5, 'sine', 40); setTimeout(() => tone(55, .2, .35, 'sine', 38), 260); },
      coin(g = .12) { tone(2350, .5, g, 'triangle'); },
      lid() { tone(1250, .08, .1, 'square', 900); }
    };
  })();
  const paintSound = () => { const b = $('#sound'); b.setAttribute('aria-pressed', String(Snd.on)); b.textContent = Snd.on ? t('Hidup', 'On') : t('Mati', 'Off'); };
  $('#sound').onclick = () => { Snd.set(!Snd.on); store.set('dasar:sound', Snd.on); paintSound(); };
  paintSound();

  /* ---------- nyala kecil ---------- */
  const flame = $('#flame'), tip = $('#flameTip');
  let dim = 0, idleAt = Date.now(), tipT = 0, flareT = 0;
  const say = (m, ms = 3600) => { tip.textContent = m; tip.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => { tip.hidden = true; }, ms); };
  // di desa, sesudah ia terbangun, nyalanya tidak terlihat; di kalimat terakhir dongengnya ia ada lagi
  const wakeAt = P.findIndex(p => p.sec === SECS.length - 1), againAt = at(/^Lihat tanganmu, sayang/);
  const roomOn = () => reached('nyala') && !(wakeAt >= 0 && cur >= wakeAt && (againAt < 0 || cur < againAt));
  flame.addEventListener('click', () => {
    S.kept++; save(); const wasDim = dim > .45; dim = 0; idleAt = Date.now(); paintFlame();
    flame.classList.remove('flare'); void flame.offsetWidth; flame.classList.add('flare'); clearTimeout(flareT); flareT = setTimeout(() => flame.classList.remove('flare'), 900);
    if (reached('beat')) Snd.beat();
    say(wasDim ? t('Ia kembali terang.', 'It burns bright again.') : reached('beat') ? t('Ia berdetak sedikit lebih kuat.', 'It beats a little stronger.') : t('Kau menemaninya.', 'You keep it company.'), 2400);
    announce(t('Nyala itu kembali terang.', 'The flame burns bright again.'));
  });
  function paintFlame() {
    flame.hidden = !(roomOn() || flame.classList.contains('docking'));
    flame.classList.toggle('heart', reached('beat'));
    flame.classList.toggle('palms', reached('palms'));
    root.style.setProperty('--dim', dim.toFixed(3));
    $('#flameLabel').textContent = reached('beat') ? t('Ketuk: temani yang berdetak itu', 'Tap: keep the beating thing company') : t('Ketuk: temani nyala itu', 'Tap: keep the flame company');
  }
  // diam terlalu lama di kamar itu: nyalanya meredup
  const markActive = () => { idleAt = Date.now(); };
  ['scroll', 'keydown', 'pointerdown', 'touchstart'].forEach(e => addEventListener(e, markActive, { passive: true }));
  setInterval(() => {
    if (!roomOn() || calm() || document.hidden || curSec < 2 || curSec > 5) return;
    const quiet = (Date.now() - idleAt) / 1000;
    if (quiet > 14 && dim < 1) { dim = Math.min(1, dim + .04); paintFlame(); if (dim > .5 && tip.hidden) say(t('Jangan biarkan dia tertidur.', 'Do not let it fall asleep.'), 5000); }
  }, 1000);
  // turun dari halaman ke sudut layar
  function dock() {
    const land = $('#flLand'); if (!land || flame.dataset.docked) return;
    flame.dataset.docked = '1';
    if (calm()) { paintFlame(); return; }
    const a = land.getBoundingClientRect(); flame.hidden = false; flame.classList.add('docking');
    const b = flame.getBoundingClientRect();
    flame.animate([{ transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(1.6)`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 1400, easing: 'cubic-bezier(.2,.9,.25,1)' }).onfinish = () => { flame.classList.remove('docking'); paintFlame(); };
    land.classList.add('left');
  }
  let beatT = 0;
  const beatLoop = () => { clearInterval(beatT); if (!reached('beat')) return; beatT = setInterval(() => { if (!flame.hidden && !document.hidden && Snd.on) Snd.beat(); }, 1100); };

  /* ---------- benda-benda yang bisa disentuh ---------- */
  story.addEventListener('click', e => {
    const tilt = e.target.closest('[data-tilt]');
    if (tilt) { const f = tilt.closest('.bill'); f.classList.toggle('tilted'); tilt.textContent = f.classList.contains('tilted') ? t('Kembalikan', 'Put it back') : t('Miringkan ke arah jendela', 'Tilt it toward the window'); return; }
    const flip = e.target.closest('[data-flip]');
    if (flip) { const f = flip.closest('.house'); f.classList.toggle('righted'); $('[data-house-cap]', f).textContent = f.classList.contains('righted') ? t('Sekarang pohon-pohonlah yang tumbuh ke arah yang salah.', 'Now it is the trees that grow the wrong way.') : t('Rumahnya terbalik. Pintunya tidak.', 'The house is upside down. Its door is not.'); flip.textContent = f.classList.contains('righted') ? t('Kembalikan', 'Put it back') : t('Betulkan letaknya', 'Set it right'); return; }
    if (e.target.closest('[data-coin]')) { S.coin = true; save(); Snd.coin(); const box = e.target.closest('.coin-ask'); box.classList.add('done'); box.querySelector('button').outerHTML = `<span class="coin-done">${esc(t('Koinnya masuk ke goresan.', 'The coin goes into the mark.'))}</span>`; return; }
    const ms = e.target.closest('[data-measure]');
    if (ms) { const f = ms.closest('.thread'); f.classList.remove('run'); void f.offsetWidth; f.classList.add('run'); ms.textContent = t('Ukur lagi', 'Measure again'); return; }
    const sp = e.target.closest('[data-spine]');
    if (sp) {
      if (sp.classList.contains('out')) return;
      sp.classList.add('out');
      const k = SPINES[+sp.dataset.spine][1];
      if (k === 'sea') sp.insertAdjacentHTML('beforeend', `<a class="spine-link" href="../../${location.search}#baca-kepala-yang-dingin-kota-yang-hangat">${esc(t('Kepala yang Dingin, Kota yang Hangat', 'A Cold Head, A Warm City'))} →</a>`);
      setTimeout(() => { sp.classList.remove('out'); sp.querySelector('.spine-link')?.remove(); }, k === 'torn' ? 1300 : 5200);
      return;
    }
    if (e.target.closest('[data-open-book]')) { goAndBack(0); return; }
    if (e.target.closest('[data-look-up]')) { const first = story.querySelector('.ibu'); if (first) goAndBack(+first.closest('p').dataset.i); return; }
  });
  story.addEventListener('submit', e => {
    const f = e.target.closest('[data-river-form]'); if (!f) return; e.preventDefault();
    const v = f.r.value.trim().slice(0, 28); if (!v) return;
    S.river = v; save(); dim = 0; paintFlame(); flame.classList.add('flare'); setTimeout(() => flame.classList.remove('flare'), 900);
    riverPaint(); announce(t('Cahaya mengembang.', 'The light swells.'));
  });
  const muteWord = w => [...w].map(c => `<i>${esc(c)}</i>`).join('');
  function riverPaint() {
    const lost = reached('riverLost'), fig = $('[data-river]');
    if (fig) {
      fig.classList.toggle('given', !!S.river); fig.classList.toggle('lost', lost);
      $('[data-river-word]', fig).innerHTML = S.river ? (lost ? muteWord(S.river) : esc(S.river)) : '';
      const form = $('[data-river-form]', fig); if (form) form.hidden = !!S.river;
    }
    const jw = $('[data-jar-word]'); if (jw) jw.innerHTML = S.river ? muteWord(S.river) : '<span class="nm-blank"></span>';
  }
  // kembali ke tempatmu sesudah melihat ke atas
  let backTo = null;
  function goAndBack(i) {
    backTo = scrollY; const el = i === 0 ? story.querySelector('p[data-i="0"]') : pEl(i);
    let pill = $('#backPill'); if (!pill) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'backPill'; pill.className = 'back-pill'; document.body.append(pill); pill.onclick = () => { if (backTo != null) scrollTo({ top: backTo, behavior: calm() ? 'instant' : 'smooth' }); pill.hidden = true; backTo = null; }; }
    pill.textContent = t('Kembali ke halamanmu', 'Back to your page'); pill.hidden = false;
    el?.scrollIntoView({ block: 'center', behavior: calm() ? 'instant' : 'smooth' });
  }

  /* ---------- membaca: di mana, dan apa yang terjadi ---------- */
  let cur = -1, curSec = -1, ticking = false;
  const fired = new Set();
  const once = (k, fn) => { if (fired.has(k)) return; fired.add(k); fn(); };
  const pulse = (cls, ms) => { if (calm()) return; document.body.classList.remove(cls); void document.body.offsetWidth; document.body.classList.add(cls); setTimeout(() => document.body.classList.remove(cls), ms); };
  const between = (a, b) => has(a) && cur >= I[a] && (b == null || !has(b) || cur < I[b]);
  function air() {
    // dingin di tepi layar, kehangatan yang terlalu dekat, gelap yang mendekat
    let frost = [.35, .1, .55, .7, .35, .85, .25, .1][Math.max(0, curSec)] ?? .2, warm = [0, .35, 0, 0, .1, 0, .3, .35][Math.max(0, curSec)] ?? 0;
    let dark = Math.max(0, curSec) / Math.max(1, SECS.length - 1) * .55;
    if (has('touch') && cur >= I.touch && cur < I.touch + 5) warm = Math.max(warm, .32);
    if (between('warmMorning', 'stairs')) { frost = 0; warm = .6; }
    if (between('out', 'back')) { frost = 0; warm = .95; dark = .5; }
    if (between('stall', 'thin')) dark = 1;
    if (between('faceLast', 'palm')) dark = Math.max(dark, .85);
    if (between('blank', 'told')) dark = Math.max(dark, .8);
    if (between('told')) { frost = 0; warm = .5; }
    if (between('tale')) { warm = .7; dark = .55; }
    root.style.setProperty('--frost', frost.toFixed(2)); root.style.setProperty('--warm', warm.toFixed(2)); root.style.setProperty('--dark', dark.toFixed(2));
    document.body.classList.toggle('breathing', !calm() && (between('warmMorning', 'stairs') || between('out', 'back') || between('tale')));
    document.body.classList.toggle('stalled', between('late', 'thin'));
    document.body.classList.toggle('blanked', between('blank', 'told'));
    Snd.wind(Math.min(1, frost + dark * .4));
  }
  function where() {
    const ps = story.querySelectorAll('p[data-i]'), line = innerHeight * .45; let c = -1;
    for (const p of ps) { if (p.getBoundingClientRect().top < line) c = +p.dataset.i; else break; }
    const reachLine = innerHeight * .5; let r = -1;
    for (const p of ps) { if (p.getBoundingClientRect().top < reachLine) r = +p.dataset.i; else break; }
    const before = S.reach;
    if (r > S.reach) { S.reach = r; save(); }
    if (c !== cur) {
      cur = c; const s = c < 0 ? -1 : P[c].sec;
      if (s !== curSec) {
        curSec = s;
        $$('#depth a').forEach((a, i) => { a.classList.toggle('on', i === s); a.classList.toggle('past', i < s); });
        root.style.setProperty('--depth', (Math.max(0, s) / Math.max(1, SECS.length - 1)).toFixed(3));
        $('#stepChip').hidden = s < 0; if (s >= 0 && G) G.step(s + 1, SECS.length, t('Lantai', 'Floor'));
      }
      air(); paintFlame();
    }
    if (S.reach !== before || !where.painted) { where.painted = true; persist(before); }
    live();
  }
  // keadaan yang tetap, dari seberapa jauh kau sudah turun; kejutan hanya saat kau melewatinya sekarang
  function persist(before) {
    const crossed = k => has(k) && before < I[k] && S.reach >= I[k] && where.started;
    $$('[data-bill]').forEach(b => b.classList.toggle('vanished', reached('billGone')));
    if (crossed('billGone')) announce(t('Angka-angkanya hilang dari kertas.', 'The numbers are gone from the paper.'));
    if (crossed('mari')) pulse('mari-now', 2600);
    if (reached('nyala')) { if (crossed('nyala')) dock(); else if (!flame.dataset.docked) { flame.dataset.docked = '1'; $('#flLand')?.classList.add('left'); } }
    if (crossed('river') && !S.river) $('[data-river] input')?.focus({ preventScroll: true });
    if (crossed('lid')) { Snd.lid(); $('[data-jar]')?.classList.add('shut'); }
    if (reached('lid')) $('[data-jar]')?.classList.add('shut');
    if (crossed('inhale') || crossed('breath2')) pulse('inhale', 4200);
    if (crossed('late')) { pulse('skip', 1600); if (Snd.on) setTimeout(() => Snd.beat(), 900); }
    if (crossed('beat')) { pulse('beat-now', 2400); beatLoop(); announce(t('Nyala itu berdetak.', 'The flame beats.')); }
    if (crossed('palm') || crossed('palm2')) pressPalm();
    document.body.classList.toggle('notes-on', reached('notes'));
    document.body.classList.toggle('penjaga', reached('penjaga'));
    document.body.classList.toggle('retold', S.retold > 0);
    if (crossed('penjaga')) announce(t('Setiap Ibu di atas menyimpan kata lain.', 'Every Mother above holds another word.'));
    if (reached('turn')) pEl(I.warn)?.classList.add('turned');
    memPaint(); riverPaint(); paintName(); paintFlame();
  }
  function pressPalm() {
    if (calm()) return; const p = $('#palm'); p.hidden = false; p.classList.remove('on'); void p.offsetWidth; p.classList.add('on');
    setTimeout(() => { p.hidden = true; p.classList.remove('on'); }, 3200);
  }
  // hal-hal yang mengikuti posisi gulir: hitungan undakan, koin yang jatuh, benang
  function live() {
    const cnt = $('#counter');
    if (has('stairs') && has('stairsEnd')) {
      const a = pEl(I.stairs).getBoundingClientRect().top, b = pEl(I.stairsEnd - 1).getBoundingClientRect().bottom, mid = innerHeight * .5;
      const on = a < mid && b > mid; cnt.hidden = !on;
      if (on) {
        const f = (mid - a) / Math.max(1, b - a), n = 101 + Math.floor(f * 340), mark = n >= 196 && n % 100 >= 96 || n >= 200 && n % 100 <= 6;
        $('#counterN').textContent = n; $('#counterMark').textContent = mark ? (S.coin ? '☾ ●' : '☾') : '';
        cnt.classList.toggle('mark', mark);
      }
    }
    const fall = $('#coinfall');
    if (has('stairsEnd')) { const r = pEl(I.stairsEnd).getBoundingClientRect(), on = r.top < innerHeight * .8 && r.bottom > innerHeight * .1; if (on !== !fall.hidden) { fall.hidden = !on; if (on && Snd.on) { let k = 0; const tk = setInterval(() => { if (fall.hidden || k > 6) return clearInterval(tk); Snd.coin(.09 / (k + 1)); k++; }, 1500); } } }
    const th = $('[data-thread]'); if (th && !th.dataset.seen) { const r = th.getBoundingClientRect(); if (r.top < innerHeight * .7 && r.bottom > 0) { th.dataset.seen = '1'; th.classList.add('run'); } }
  }
  const frame = () => {
    ticking = false; where();
    const max = document.documentElement.scrollHeight - innerHeight, f = max > 0 ? scrollY / max : 0;
    if (scrollY > 200) { store.set('dasar:place', +f.toFixed(4)); const pr = store.get('prog', {}) || {}; pr[SLUG] = Math.max(pr[SLUG] || 0, +f.toFixed(3)); store.set('prog', pr); }
    if (f > .97 && !$('#end').dataset.done) finish();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(frame));

  /* ---------- akhir: ceritakan lagi ---------- */
  function endHTML() {
    const nm = S.name;
    return `<div class="end-card">
      <p class="end-k">${esc(t('Sesudah dongengnya', 'After the tale'))}</p>
      <ul class="end-list">
        <li><span>${esc(t('Namamu', 'Your name'))}</span><b>${nm ? `<s>${esc(nm)}</s> ` : ''}${esc(t('Ibu', 'Mother'))}</b></li>
        <li><span>${esc(t('Yang masih kau ingat', 'What you still remember'))}</span><b>${memLeft()} ${esc(t('dari', 'of'))} ${MEM.length}</b></li>
        <li><span>${esc(t('Kau menemani nyala itu', 'You kept the flame company'))}</span><b>${S.kept} ${esc(t('kali', S.kept === 1 ? 'time' : 'times'))}</b></li>
        ${S.river ? `<li><span>${esc(t('Sungaimu', 'Your river'))}</span><b class="mute">${muteWord(S.river)}</b></li>` : ''}
      </ul>
      <p class="end-q">“${esc(t('Ceritakan lagi,', 'Tell it again,'))}” <span>${esc(t('kata anak itu dengan suara mengantuk.', 'said the child, sleepily.'))}</span></p>
      <div class="end-act"><button type="button" class="go" id="retell">${esc(t('Ceritakan lagi', 'Tell it again'))}</button><a class="ghost" href="../../${location.search}#baca-kepala-yang-dingin-kota-yang-hangat">${esc(t('Toples itu, di rak Nyonya Barang Hilang', 'That jar, on the Lady of Lost Things’ shelf'))}</a></div>
      <div class="end-next" id="endNext"></div>
    </div>`;
  }
  function finish() {
    const end = $('#end'); end.dataset.done = '1'; end.hidden = false; end.innerHTML = endHTML();
    if (G) $('#endNext').innerHTML = G.next(SLUG);
    $('#retell').onclick = () => { S.retold++; save(); document.body.classList.add('retold'); coverPaint(); scrollTo({ top: 0, behavior: calm() ? 'instant' : 'smooth' }); };
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
  }
  if (store.get('dasar:place', 0) > .97) finish();
  { const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]); const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st); store.set('last', { key: SLUG, at: Date.now() }); }

  /* ---------- sampul ---------- */
  function coverPaint() {
    const place = store.get('dasar:place', 0);
    $('#lede').textContent = S.retold ? t('Maka begini, anakku. Dengarkan baik-baik.', 'So it goes, my child. Listen closely.') : t('Tugasmu hanya menjaganya. Duduk di sampingnya, menyayanginya, dan tidak membiarkannya tidur.', 'Your only task is to keep it. Sit beside it, love it, and do not let it sleep.');
    $('#kick').textContent = 'Koda · ' + t('Cerpen', 'Short story') + (S.retold ? ' · ' + t(`diceritakan ${S.retold + 1} kali`, `told ${S.retold + 1} times`) : '');
    $('#coverAct').innerHTML = `<a class="go" href="#lantai-1">${esc(S.retold ? t('Ceritakan lagi', 'Tell it again') : t('Mulai turun', 'Begin the descent'))}</a>${place > .03 && place < .97 ? `<button type="button" class="ghost" id="resume">${esc(t('Lanjutkan', 'Continue'))} · ${Math.round(place * 100)}%</button>` : ''}`;
    $('#resume')?.addEventListener('click', () => scrollTo({ top: place * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }));
  }
  coverPaint();

  /* ---------- pengaturan ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  const paintMotion = () => { const b = $('#motion'); b.setAttribute('aria-pressed', String(!root.hasAttribute('data-calm'))); b.textContent = root.hasAttribute('data-calm') ? t('Tenang', 'Still') : t('Aktif', 'On'); };
  $('#motion').onclick = () => { root.toggleAttribute('data-calm'); store.set('dasar:calm', root.hasAttribute('data-calm')); paintMotion(); air(); };
  paintMotion();
  $('#reset').onclick = () => { if (!confirm(t('Lupakan namamu, sungaimu, dan seberapa jauh kau sudah turun?', 'Forget your name, your river, and how far down you have been?'))) return; S = blank(); save(); store.set('dasar:place', 0); location.hash = ''; location.reload(); };
  if (EN) {
    $('#sizeLabel').textContent = 'Text size'; $('#soundLabel').textContent = 'Sound (wind, heartbeat)'; $('#motionLabel').textContent = 'Motion and surprises'; $('#themeLabel').textContent = 'Appearance'; $('#resetLabel').textContent = 'Your trail in this story'; $('#reset').textContent = 'Forget';
    $('#memKick').textContent = 'What I still remember'; $('#openMem').setAttribute('aria-label', 'What I still remember');
  }

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, title, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#story',
      lede: t('Seorang gadis dengan tangan yang selalu dingin menerima pekerjaan yang hangat.', 'A girl whose hands are always cold accepts a warm job.'),
      steps: [
        t('Ceritanya turun, lantai demi lantai. Rel di tepi layar membawamu ke lantai mana pun, dan warna suara memberi tahu siapa yang bicara: kuning madu untuk perempuan bertopi.', 'The story goes down, floor by floor. The rail at the edge takes you to any floor, and the colour of a voice tells you who speaks: honey for the woman in the hat.'),
        t('Di kamar itu, nyala kecil turun ke sudut layarmu. Kalau kau diam terlalu lama, ia meredup. Ketuk untuk menemaninya.', 'In that room, the little flame comes down to the corner of your screen. Stay still too long and it dims. Tap to keep it company.'),
        t('Bintang di atas menyimpan yang masih ia ingat. Lihat lagi sesekali.', 'The star above keeps what she still remembers. Look again now and then.'),
        t('Tulis namamu di sampul kalau mau. Kau boleh pulang kapan saja.', 'Write your name on the cover if you like. You may go home whenever you want.')
      ] });
    G.settings();
  }
  if (store.get('dasar:sound', false)) { addEventListener('pointerdown', function once() { removeEventListener('pointerdown', once); if (!Snd.on) { Snd.set(true); paintSound(); } }, { once: true }); }
  frame(); where.started = true; beatLoop();
  if (location.hash.startsWith('#lantai-')) setTimeout(() => $(location.hash)?.scrollIntoView(), 60);
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
