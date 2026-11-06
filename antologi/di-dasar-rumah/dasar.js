/* Di Dasar Rumah: dongeng sebelum tidur, delapan malam.
   Di akhir cerita terungkap bahwa semuanya adalah dongeng yang diceritakan Ibu kepada seorang anak. Di sini pembaca adalah
   anak itu: Ibu bercerita, kalimat demi kalimat; anak meminta lanjutannya; delapan bagian menjadi delapan malam.
   Ibu adalah gadis yang sudah memberikan ingatannya kepada nyala, jadi sejak malam pertama ia lupa beberapa kata (hujan,
   garam, gunting, sungai, wajah, angka). Setiap kali ceritanya sampai ke kata itu, ia berhenti; anak boleh mengingatkannya.
   Kalimat cerita dimuat utuh dari content/works.json. Yang ditulis untuk versi ini: sela anak (ASK, MOMENTS), bisikan Ibu
   dan bingkai setiap malam (NIGHTS), dan akhir. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'dongeng'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'di-dasar-rumah', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const plain = s => String(s).replace(/\*/g, '').trim();
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  const isBreak = p => !/[\p{L}\p{N}]/u.test(String(p));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };
  const wait = ms => new Promise(r => setTimeout(r, calm() ? Math.min(ms, 120) : ms));
  root.lang = t('id', 'en');

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const tale = $('#tale'), asks = $('#asks');
  if (!work || !hasText(work.body)) { tale.innerHTML = `<p class="aside center">${t('Dongengnya belum bisa dimuat.', 'The tale could not be loaded.')} <a href="../../">${t('Kembali', 'Back')}</a></p>`; return; }
  const tr = EN && work.en && hasText(work.en.body) ? work.en : null;
  if (EN && !tr) { $('#lost').hidden = false; $('#lost').textContent = 'This story is not translated yet, so it is told in the original.'; }
  const BODY = tr ? tr.body : work.body, TITLE = (tr && tr.title) || work.title;
  document.title = `${TITLE} · Quiet Margins`; $('#title').textContent = TITLE;
  const P = [], NIGHT_OF = [], FIRST = [];
  let n = 0;
  BODY.forEach(p => { if (isBreak(p)) { if (P.length && NIGHT_OF[P.length - 1] === n) n++; return; } if (FIRST[n] == null) FIRST[n] = P.length; NIGHT_OF.push(n); P.push(String(p)); });
  const NIGHTS_N = FIRST.length, LAST = P.length - 1;
  const lastOf = k => (k + 1 < NIGHTS_N ? FIRST[k + 1] - 1 : LAST);
  const at = re => P.findIndex(p => re.test(plain(p)));

  /* ---------- kata-kata yang sudah Ibu berikan kepada nyala ---------- */
  const NUM = /\b(\d[\d.,]*\d|\d|nol|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|sejuta|belas|puluh|ratus|ribu|juta)\b/gi;
  const FORGET = EN ? [
    { id: 'rain', re: /\brain\b/gi }, { id: 'salt', re: /\bsalt\b/gi }, { id: 'river', re: /\brivers?\b/gi }
  ] : [
    { id: 'angka', re: NUM, ask: 'Itu angka, Bu. Biar aku yang bacakan.' },
    { id: 'hujan', re: /\bhujan\b/gi }, { id: 'garam', re: /\bgaram\b/gi }, { id: 'gunting', re: /\bgunting\b/gi },
    { id: 'sungai', re: /\bsungai\b/gi }, { id: 'wajah', re: /\bwajah\b(?=\s+(?:Ibu|ibunya|ibu)\b)/g }
  ];

  /* ---------- yang ditulis untuk versi ini ---------- */
  const NIGHTS = EN ? [
    'Mother sits on the edge of the bed. The lamp is small.', 'You have been waiting since supper.', 'Tonight the wind comes in under the door. Mother stops it with a cloth.',
    'Mother comes later than usual. Her hand is cold when she tucks you in.', 'You ask her not to turn the lamp off.', 'Mother tells it more slowly. Sometimes she stops for a long time.',
    'Something is falling from the sky outside. Mother does not say its name.', 'The last night. Mother sits closer than usual.'
  ] : [
    'Ibu duduk di sisi ranjang. Lampunya kecil.', 'Kau sudah menunggu sejak makan malam.', 'Malam ini angin masuk dari bawah pintu. Ibu menyumbatnya dengan kain.',
    'Ibu datang lebih lambat. Tangannya dingin ketika membetulkan selimutmu.', 'Kau minta lampunya jangan dimatikan.', 'Ibu bercerita lebih pelan. Kadang ia berhenti lama.',
    'Di luar ada yang jatuh dari langit. Ibu tidak menyebut namanya.', 'Malam terakhir. Ibu duduk lebih dekat dari biasanya.'
  ];
  const ASK = EN ? ['And then?', 'Go on.', 'What happened?', 'Mm-hm.', 'And then, Mother?'] : ['Lalu?', 'Terus, Bu?', 'Lalu bagaimana?', 'Hm-hm.', 'Lanjut, Bu.'];
  // sela anak menurut suasana kalimat yang baru diceritakan; Ibu membalas menurut nadanya
  const MOODS = EN ? {
    on: ['And then?', 'Go on.', 'What happened next?', 'Mm-hm.', 'I am still awake.', 'Then what?', 'Keep going, Mother.', 'Not sleepy yet.'],
    scared: ['Hold my hand, Mother.', 'Do not go so fast.', 'Leave the lamp on.', 'I am pulling the blanket up.', 'That is scary…', 'I am closing my eyes, but I am listening.'],
    curious: ['What did she say then?', 'Why, Mother?', 'Who is she really?', 'How do you know that?', 'Is it true?', 'How old was the girl?'],
    warm: ['Like you, Mother.', 'Your hands are cold too.', 'Poor girl.', 'Can I hug you?', 'I want a sweater like that.'],
    cold: ['Was it very cold?', 'I am cold too.', 'Can you warm my hands?'],
    sleepy: ['My eyes are heavy… but go on.', 'One more bit, Mother.', 'Do not stop yet.', 'I am not asleep, I promise.']
  } : {
    on: ['Lalu?', 'Terus, Bu?', 'Lalu bagaimana?', 'Hm-hm.', 'Lanjut, Bu.', 'Habis itu?', 'Terus terus?', 'Aku masih bangun, Bu.', 'Belum ngantuk.', 'Terus dia ngapain?'],
    scared: ['Bu, pegang tanganku.', 'Jangan cepat-cepat, Bu.', 'Lampunya jangan dimatikan.', 'Aku tarik selimut, ya.', 'Seram…', 'Aku tutup mata, tapi aku dengar.', 'Bu, ada suara di bawah ranjang?'],
    curious: ['Dia bilang apa lagi?', 'Kenapa begitu, Bu?', 'Perempuan itu siapa sebenarnya?', 'Ibu tahu dari mana?', 'Itu benar terjadi, Bu?', 'Gadis itu umur berapa?', 'Kenapa dia tidak lari?'],
    warm: ['Seperti Ibu.', 'Tangan Ibu juga dingin.', 'Kasihan dia.', 'Aku peluk Ibu, ya.', 'Aku mau dirajutkan juga.', 'Ibunya baik, ya?'],
    cold: ['Dingin sekali, ya, Bu?', 'Aku juga kedinginan.', 'Hangatkan tanganku, Bu.'],
    sleepy: ['Mataku berat, Bu… tapi lanjut.', 'Sedikit lagi, Bu.', 'Jangan berhenti dulu.', 'Aku belum tidur, sungguh.', 'Ibu jangan pergi dulu.', 'Satu bagian lagi, ya?'],
    early: ['Ceritakan dari awal, Bu.', 'Yang ada gadisnya, kan?', 'Aku sudah di bawah selimut.', 'Hari ini yang panjang, ya, Bu.']
  };
  const REPLY = EN ? {
    scared: ['“I am here.”', 'Mother holds your hand. Her hand is cold.', 'Mother lowers her voice, as if that could make it less frightening.', '“The lamp stays on.”'],
    curious: ['“Patience, love. We will get there.”', 'Mother smiles and does not answer.', '“From a book. Where else?”', '“You always ask that one.”'],
    warm: ['Mother kisses your forehead.', '“Yes. Like me.”', 'Mother tucks the blanket up to your chin.'],
    cold: ['Mother breathes into your hands. Her breath is not warm.', '“Colder than this.”'],
    quiet: ['Mother goes on, thinking you are asleep.', 'Mother waits a moment, then goes on more softly.']
  } : {
    scared: ['“Ibu di sini.”', 'Ibu menggenggam tanganmu. Tangannya dingin.', 'Ibu memelankan suaranya, seolah itu bisa membuatnya kurang menakutkan.', '“Lampunya tetap menyala.”', 'Ibu melirik ke bawah ranjang, lalu tersenyum kepadamu.'],
    curious: ['“Sabar, sayang. Nanti juga sampai.”', 'Ibu tersenyum, tidak menjawab.', '“Dari buku. Dari mana lagi?”', '“Kau selalu menanyakan yang itu.”', '“Nanti kau tahu sendiri.”'],
    warm: ['Ibu mencium keningmu.', '“Iya. Seperti Ibu.”', 'Ibu merapatkan selimut sampai ke dagumu.', 'Ibu tertawa kecil, lalu suaranya menjadi pelan lagi.'],
    cold: ['Ibu meniup kedua tanganmu. Napasnya tidak hangat.', '“Lebih dingin dari ini.”', 'Ibu menggosok tanganmu di antara tangannya sendiri.'],
    quiet: ['Ibu melanjutkan, mengira kau sudah tidur.', 'Ibu menunggu sebentar, lalu bercerita lebih pelan.']
  };
  const MOOD_RE = EN ? {
    scared: /\b(dark|silent|silence|door|breath|abyss|fog|crawl|scream|cried|fear|afraid|shadow|knock|locked)\w*/i,
    curious: /[“"]|\b(why|who|asked|question)\b/i,
    warm: /\b(mother|warm|hand|knit|sweater|smile|hug)\w*/i,
    cold: /\b(cold|frost|freez|winter|ice)\w*/i
  } : {
    scared: /\b(gelap|sunyi|pintu|napas|jurang|kabut|merangkak|menangis|takut|bayang|mendobrak|menggedor|palang|padam|terlambat)\w*/i,
    curious: /[“"]|\b(mengapa|kenapa|siapa|bertanya|tanya)\b/i,
    warm: /\b(ibunya|hangat|rajutan|wol|memeluk)\w*/i,
    cold: /\b(dingin|beku|embun|musim dingin)\w*/i
  };
  const recent = [];
  const pickFrom = list => { const fresh = list.filter(x => !recent.includes(x)); const x = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))]; recent.push(x); if (recent.length > 14) recent.shift(); return x; };
  // saat-saat anak menyela: [penanda kalimat, sela anak, bisikan Ibu sesudahnya]
  const MOMENTS = EN ? [] : [
    [/^Maka ketika, pada suatu sore/, 'Siapa dia, Bu?', 'Ssst. Orang yang tersenyum terlalu lama.'],
    [/Aku punya pekerjaan untukmu/, 'Jangan mau!', 'Ibu tertawa kecil. “Dengarkan dulu.”'],
    [/^Kau sudah siap, sayang/, 'Jangan ikut…', 'Ibu merapikan selimutmu sampai ke dagu.'],
    [/^Mari\.$/, 'Bu, aku takut.', '“Ibu di sini.”'],
    [/rumah panggung dari kayu hitam/, 'Rumahnya terbalik?', '“Terbalik. Tapi pintunya tidak.”'],
    [/^Masuklah\. Nyalamu menunggumu/, 'Nyalanya hidup, Bu?', '“Seperti kau. Seperti semua yang perlu dijaga.”'],
    [/^Pada waktu yang mula-mula disebutnya hari kedua/, 'Dia harus pulang!', 'Lampu di sisi ranjang bergetar sedikit.'],
    [/^Denyut berikutnya terlambat/, 'Jangan sampai padam…', 'Ibu menahan napasnya juga.'],
    [/Sampai ada yang menggantikanmu/, 'Siapa yang menggantikannya, Bu?', 'Ibu tidak menjawab. Ia membetulkan letak bantalmu.'],
    [/^Tak ada wajah yang datang/, 'Ibu masih ingat wajah ibu Ibu?', 'Ibu diam lama sekali. Lalu ia melanjutkan, seolah kau tidak bertanya.'],
    [/^Sekarang kau boleh kembali ke atas/, 'Jangan percaya, Bu!', '“Ibu tahu, sayang. Ibu tahu.”'],
    [/^Anak itu membuka mata dan memanggilnya Ibu/, 'Itu aku, ya?', 'Ibu tersenyum. Tangannya dingin sekali di keningmu.']
  ].map(([re, a, s]) => [at(re), a, s]).filter(m => m[0] >= 0);
  const FLAME_AT = at(EN ? /^Look at your hands/ : /^Lihat tanganmu, sayang/);

  /* ---------- ingatan ---------- */
  const blank = () => ({ v: 1, night: 0, k: 0, res: {}, said: [], retold: 0, voice: false, mood: { scared: 0, curious: 0, warm: 0, cold: 0, quiet: 0 } });
  let S = store.get('dongeng', null); S = S && S.v === 1 ? { ...blank(), ...S } : blank();
  const save = () => store.set('dongeng', S);

  /* ---------- kalimat Ibu ---------- */
  function wrap(text) {
    let h = esc(text);
    FORGET.forEach((f, k) => { h = h.replace(f.re, m => `\u0001${k}\u0002${m}\u0003`); });
    h = h.replace(/\u0001(\d+)\u0002([^\u0003]*)\u0003/g, (m, k, w) => {
      const f = FORGET[k], back = S.res[f.id] === 'given';
      return back ? `<span class="back" data-f="${f.id}">${w}</span>` : `<span class="lupa" data-f="${f.id}" aria-label="${esc(t('kata yang Ibu lupa', 'a word Mother forgot'))}">${w}</span>`;
    });
    return h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  }
  const forgottenIn = k => FORGET.filter(f => !S.res[f.id] && new RegExp(f.re.source, f.re.flags).test(P[k]));
  const firstWord = (f, k) => { const m = new RegExp(f.re.source, f.re.flags.replace('g', '')).exec(P[k]); return m ? m[0] : f.id; };
  const add = (cls, html, tag = 'p') => { const el = document.createElement(tag); el.className = cls; el.innerHTML = html; tale.append(el); return el; };
  const nightHead = k => add('night', `<small>${esc(t('Malam ke-' + (k + 1), 'Night ' + (k + 1)))}</small><b>${String(k + 1).padStart(2, '0')}</b><em>${esc(NIGHTS[k] || '')}</em>`, 'header');
  const sayEl = k => { $$('.say').forEach(e => e.classList.add('old')); return add('say' + (/^\*[^*]+\*$/.test(P[k].trim()) ? ' voice' : ''), wrap(P[k])); };
  const follow = el => { const r = el.getBoundingClientRect(); const y = scrollY + r.top - innerHeight * .28; scrollTo({ top: Math.max(0, y), behavior: calm() ? 'auto' : 'smooth' }); };

  // suara Ibu: kata yang ia lupa menjadi diam
  function speak(k) {
    if (!S.voice || !('speechSynthesis' in window)) return;
    const tmp = document.createElement('div'); tmp.innerHTML = wrap(P[k]); $$('.lupa', tmp).forEach(s => { s.textContent = '…'; });
    const u = new SpeechSynthesisUtterance(tmp.textContent.replace(/\*/g, '')); u.lang = EN ? 'en-US' : 'id-ID'; u.rate = .86; u.pitch = .9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  /* ---------- bercerita ---------- */
  let askI = 0, pending = null;
  function chips(list) {
    asks.innerHTML = list.map((c, i) => `<button type="button" class="ask ${c.cls || (i === 0 ? 'main' : '')}" data-i="${i}">${esc(c.label)}</button>`).join('');
    asks.hidden = false; asks._list = list;
    const b = $('.ask', asks); if (b && !matchMedia('(hover: none)').matches) b.focus({ preventScroll: true });
  }
  asks.addEventListener('click', e => { const b = e.target.closest('.ask'); if (!b) return; const c = asks._list[+b.dataset.i]; asks.hidden = true; c.go(); });
  addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !asks.hidden && !$('#settingsDialog').open && !e.target.closest('button, input, textarea')) { e.preventDefault(); $('.ask', asks)?.click(); } });

  async function tell() {
    if (S.k > LAST) return finale();
    if (S.k === FIRST[S.night] && !tale.querySelector(`.night[data-n="${S.night}"]`)) { const h = nightHead(S.night); h.dataset.n = S.night; follow(h); if (G) G.step(S.night + 1, NIGHTS_N, t('Malam', 'Night')); await wait(900); }
    // ceritakan sampai cukup panjang, atau sampai ada yang perlu disela
    let el = null, chars = 0;
    while (S.k <= LAST && NIGHT_OF[S.k] === S.night) {
      const k = S.k; el = sayEl(k); speak(k); S.k++; chars += P[k].length; save();
      if (k === FLAME_AT) root.classList.add('flame');
      pending = forgottenIn(k)[0] || null;
      const m = MOMENTS.find(x => x[0] === k && !S.said.includes(k));
      if (pending || m || chars > 260 || k === lastOf(S.night)) { follow(el); return next(k, m); }
      await wait(260);
    }
    next(S.k - 1, null);
  }
  function next(k, m) {
    if (pending) {
      const f = pending, w = firstWord(f, k);
      add('aside', esc(t('Ibu berhenti di tengah kalimat. Ia mencari kata itu.', 'Mother stops in the middle of the sentence. She is looking for the word.')));
      return chips([
        { label: f.ask || t(`${cap(w)}, Bu.`, `${cap(w)}, Mother.`), cls: 'main word', go: () => remind(f, true) },
        { label: t('Tidak apa-apa, Bu.', 'It is all right, Mother.'), cls: 'soft', go: () => remind(f, false) }
      ]);
    }
    if (m) return chips([{ label: m[1], go: () => { S.said.push(m[0]); save(); add('child', esc(m[1])); add('aside', esc(m[2])); setTimeout(after, calm() ? 0 : 900); } }]);
    after();
  }
  function after() {
    const k = S.k - 1;
    if (k >= LAST) return finale();
    if (k === lastOf(S.night)) return chips([{ label: t('Selamat malam, Bu.', 'Good night, Mother.'), go: goodNight }]);
    // dua atau tiga pilihan: satu yang melanjutkan, satu atau dua yang mengikuti suasana kalimat terakhir, kadang diam saja
    const last = P[k], moods = Object.keys(MOOD_RE).filter(m => MOOD_RE[m].test(last)).sort(() => Math.random() - .5);
    // di awal malam anak masih segar; menjelang akhir malam ia mulai mengantuk
    const span = lastOf(S.night) - FIRST[S.night] + 1, pos = (k - FIRST[S.night]) / Math.max(1, span);
    const pool = MOODS.on.concat(pos > .65 && MOODS.sleepy ? MOODS.sleepy : [], pos < .2 && MOODS.early ? MOODS.early : []);
    const opts = [{ label: pickFrom(pool), mood: null }];
    moods.slice(0, 2).forEach(m => opts.push({ label: pickFrom(MOODS[m]), mood: m }));
    if (opts.length === 1 && Math.random() < .5) { const m = ['curious', 'warm'][askI++ % 2]; opts.push({ label: pickFrom(MOODS[m]), mood: m }); }
    if (Math.random() < .1) opts.push({ label: t('(diam saja)', '(say nothing)'), mood: 'quiet', cls: 'soft' });
    chips(opts.map((o, i) => ({ label: o.label, cls: o.cls || (i === 0 ? 'main' : ''), go: () => {
      if (o.mood) S.mood[o.mood] = (S.mood[o.mood] || 0) + 1; save();
      if (o.mood !== 'quiet') add('child', esc(o.label));
      if (o.mood) { add('aside', esc(pickFrom(REPLY[o.mood]))); setTimeout(tell, calm() ? 0 : 750); } else tell();
    } })));
  }
  function remind(f, yes) {
    S.res[f.id] = yes ? 'given' : 'left'; save();
    if (yes) {
      add('child', esc(f.ask || t(`${cap(firstWord(f, S.k - 1))}, Bu.`, `${cap(firstWord(f, S.k - 1))}, Mother.`)));
      $$(`.lupa[data-f="${f.id}"]`).forEach(s => { s.className = 'back fresh'; s.removeAttribute('aria-label'); });
      add('aside', esc(t(['“Ah. Iya. Itu.”', '“Iya. Itu namanya.”', 'Ibu mengulang kata itu pelan, seperti mencicipinya.', '“Dari mana kau tahu?”'][Object.values(S.res).filter(v => v === 'given').length % 4], 'Mother repeats the word slowly, as if tasting it.')));
    } else {
      add('child', esc(t('Tidak apa-apa, Bu.', 'It is all right, Mother.')));
      add('aside', esc(t('Ibu melanjutkan. Tempat kata itu tetap kosong, di mana pun ia muncul.', 'Mother goes on. The place of that word stays empty, wherever it appears.')));
    }
    pending = forgottenIn(S.k - 1)[0] || null;
    setTimeout(() => (pending ? next(S.k - 1, null) : next(S.k - 1, MOMENTS.find(x => x[0] === S.k - 1 && !S.said.includes(x[0])))), calm() ? 0 : 700);
  }
  async function goodNight() {
    add('child', esc(t('Selamat malam, Bu.', 'Good night, Mother.')));
    root.classList.add('off'); await wait(1600);
    add('aside center', esc(t('Lampu padam. Pagi datang tanpa suara.', 'The lamp goes out. Morning comes without a sound.')));
    root.classList.add('dawn');
    S.night++; S.k = FIRST[S.night] ?? S.k; save();
    chips([{ label: t('Malam berikutnya', 'The next night'), go: () => { root.classList.remove('off', 'dawn'); tell(); } }]);
  }

  /* ---------- akhir ---------- */
  function finale() {
    root.classList.add('flame');
    const given = FORGET.filter(f => S.res[f.id] === 'given'), left = FORGET.filter(f => S.res[f.id] === 'left');
    const words = given.map(f => (f.id === 'angka' ? t('angka-angka', 'the numbers') : f.id));
    const top = Object.entries(S.mood || {}).filter(([m]) => m !== 'quiet').sort((a, b) => b[1] - a[1])[0];
    const who = !top || !top[1] ? '' : {
      scared: t('Kau penakut, tapi kau tidak pernah menutup telingamu.', 'You were frightened, but you never covered your ears.'),
      curious: t('Kau bertanya terlalu banyak. Anak seperti itu biasanya ingin turun sendiri.', 'You asked too many questions. Children like that usually want to go down themselves.'),
      warm: t('Kau menggenggam tangannya hampir setiap malam. Tangannya tidak pernah menghangat.', 'You held her hand almost every night. It never got warm.'),
      cold: t('Kau selalu bertanya tentang dingin. Kau sudah tahu rasanya.', 'You kept asking about the cold. You already know how it feels.')
    }[top[0]];
    add('end', `${who ? `<p class="small">${esc(who)}</p>` : ''}<p class="big">${esc(given.length ? t(`Kau mengingatkan Ibu ${given.length} kata.`, `You reminded Mother of ${given.length} words.`) : t('Kau tidak mengingatkan Ibu satu kata pun.', 'You did not remind Mother of a single word.'))}</p>
      ${given.length ? `<p class="words">${esc(words.join(', '))}</p><p>${esc(t('Sekarang kata-kata itu milikmu. Simpan baik-baik. Di bawah ranjang ada yang lapar.', 'Those words are yours now. Keep them well. Something under the bed is hungry.'))}</p>` : `<p>${esc(t('Lubang-lubangnya akan kau ceritakan juga, suatu hari, kepada seseorang yang tangannya dingin.', 'You will tell its holes too, one day, to someone whose hands are cold.'))}</p>`}
      ${left.length ? `<p class="small">${esc(t(`${left.length} kata tetap kosong.`, `${left.length} words stayed empty.`))}</p>` : ''}
      ${G ? G.next(SLUG) : ''}`, 'section');
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
    chips([
      { label: t('Ceritakan lagi', 'Tell it again'), go: () => { S.retold++; S.night = 0; S.k = 0; S.said = []; save(); root.classList.remove('flame'); tale.innerHTML = ''; tell(); } },
      { label: t('Aku mau tidur', 'I want to sleep'), cls: 'soft', go: async () => {
        add('child', esc(t('Aku mau tidur.', 'I want to sleep.'))); root.classList.add('off'); await wait(1400);
        add('say voice', esc(t('Tidurlah, nyala kecil, biar Ibu yang berjaga.', 'Sleep, little flame, let Mother keep watch.')));
        S.retold++; S.night = 0; S.k = 0; S.said = []; save();
        await wait(3200); root.classList.remove('off', 'flame'); tale.innerHTML = ''; showCover();
      } },
      { label: t('Ceritakan kepada seseorang', 'Tell it to someone'), cls: 'soft', go: passOn }
    ]);
  }
  async function passOn() {
    const url = `${location.origin}${location.pathname}`, text = t('Biar kuceritakan betapa hangatnya nanti.', 'Let me tell you how warm it will be.');
    try { if (navigator.share) await navigator.share({ title: TITLE, text, url }); else { await navigator.clipboard.writeText(url); add('aside center', esc(t('Tautannya tersalin. Ceritakan dengan suara yang paling lembut.', 'Link copied. Tell it in your softest voice.'))); } } catch (e) { /* dibatalkan */ }
    setTimeout(() => chips(asks._list || []), 300); // pilihan akhir tetap ada
  }

  /* ---------- sampul ---------- */
  function showCover() {
    $('#cover').hidden = false; asks.hidden = true; $('#stepChip').hidden = true;
    $('#kick').textContent = 'Koda · ' + t('Cerpen', 'Short story') + (S.retold ? ' · ' + t(`diceritakan ${S.retold + 1} kali`, `told ${S.retold + 1} times`) : '');
    $('#lede').textContent = S.retold ? t('Maka begini, anakku. Dengarkan baik-baik.', 'So it goes, my child. Listen closely.') : t('Dongeng sebelum tidur, delapan malam.', 'A bedtime story, eight nights.');
    if (EN) $('#how').textContent = 'You are the child in that bed. Mother tells the story; you ask her to go on. Sometimes she forgets a word, and only you can remind her.';
    $('#begin').textContent = S.k > LAST ? t('Minta Ibu bercerita lagi', 'Ask Mother to tell it again') : S.k > 0 ? t(`Lanjutkan malam ke-${S.night + 1}`, `Continue night ${S.night + 1}`) : t('Minta Ibu bercerita', 'Ask Mother to tell it');
  }
  function replay() {
    // yang sudah diceritakan tetap ada di kamar ketika kau kembali
    tale.innerHTML = '';
    for (let k = 0; k < S.k; k++) { if (k === FIRST[NIGHT_OF[k]]) { const h = nightHead(NIGHT_OF[k]); h.dataset.n = NIGHT_OF[k]; } const e = sayEl(k); e.style.animation = 'none'; }
    $$('.say').forEach(e => e.classList.add('old'));
  }
  $('#begin').onclick = () => {
    $('#cover').hidden = true; $('#stepChip').hidden = false;
    if (S.k > LAST) { S.retold++; S.night = 0; S.k = 0; S.said = []; save(); tale.innerHTML = ''; root.classList.remove('flame'); }
    if (S.k > 0) { replay(); if (G) G.step(S.night + 1, NIGHTS_N, t('Malam', 'Night')); const last = $$('.say').pop(); if (last) follow(last); const k = S.k - 1; pending = forgottenIn(k)[0] || null; if (NIGHT_OF[S.k] !== NIGHT_OF[k] && S.k <= LAST && !tale.querySelector(`.night[data-n="${S.night}"]`)) { chips([{ label: t('Malam berikutnya', 'The next night'), go: tell }]); } else next(k, MOMENTS.find(x => x[0] === k && !S.said.includes(k))); }
    else tell();
  };

  /* ---------- pengaturan ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 20));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  const paintVoice = () => { const b = $('#voice'); b.setAttribute('aria-pressed', String(S.voice)); b.textContent = S.voice ? t('Hidup', 'On') : t('Mati', 'Off'); };
  if (!('speechSynthesis' in window)) $('#voice').closest('.setting-row').hidden = true;
  $('#voice').onclick = () => { S.voice = !S.voice; save(); paintVoice(); if (!S.voice) speechSynthesis.cancel(); }; paintVoice();
  $('#reset').onclick = () => { if (!confirm(t('Mulai lagi dari malam pertama? Kata-kata yang kau ingatkan ikut dilupakan.', 'Start again from the first night? The words you reminded her of are forgotten too.'))) return; const v = S.voice; S = blank(); S.voice = v; save(); tale.innerHTML = ''; root.classList.remove('flame', 'off', 'dawn'); $('#settingsDialog').close(); showCover(); };
  if (EN) { $('#voiceLabel').textContent = 'Mother’s voice'; $('#resetLabel').textContent = 'This tale'; $('#reset').textContent = 'Start from the first night'; $('#back').querySelector('[data-qm-label]').textContent = 'Desk'; }

  /* ---------- mulai ---------- */
  { const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]); const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st); }
  addEventListener('pagehide', () => { const pr = store.get('prog', {}) || {}; pr[SLUG] = Math.max(pr[SLUG] || 0, +(S.k / P.length).toFixed(3)); store.set('prog', pr); });
  showCover();
  $('#back').addEventListener('click', e => { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); } });
  if (G) {
    G.mount({ slug: SLUG, title: TITLE, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#bed',
      lede: t('Dongeng sebelum tidur, delapan malam.', 'A bedtime story, eight nights.'),
      steps: [
        t('Kau anak di ranjang itu. Ibu bercerita kalimat demi kalimat; ketuk sela di bawah untuk meminta lanjutannya.', 'You are the child in that bed. Mother tells it sentence by sentence; tap a reply below to ask her to go on.'),
        t('Setiap bagian diceritakan dalam satu malam. Ucapkan selamat malam, dan dongengnya berlanjut besok.', 'Each part is told in one night. Say good night, and the tale goes on tomorrow.'),
        t('Ibu sudah memberikan beberapa kata kepada nyala. Kalau ia berhenti mencari kata, kau boleh mengingatkannya.', 'Mother has given some words to the flame. When she stops to look for one, you may remind her.'),
        t('Aa: ukuran huruf, suara Ibu, dan mulai lagi dari malam pertama.', 'Aa: text size, Mother’s voice, and starting again from the first night.')
      ] });
    G.settings();
  }
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
