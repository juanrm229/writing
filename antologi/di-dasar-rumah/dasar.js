/* Di Dasar Rumah: dibuat ulang dari nol. Satu gagasan: kata yang terlupakan.
   Gadis itu menjaga sebuah nyala dengan ingatannya sendiri. Setiap kali ceritanya memberikan satu ingatan kepada nyala,
   kata itu hilang dari seluruh halaman, juga dari bagian yang sudah kau baca: tempatnya masih ada, bunyinya tidak.
   Angka-angka hilang sesudah tagihan kosong; sungai, hujan, garam, gunting, dan wajah Ibu hilang pada kalimat ketika ia
   memberikannya. Tahan kata yang hilang untuk mencoba mengingatnya. Di akhir, dongengnya mulai lagi, diceritakan dengan
   kata-kata yang tersisa. Teks dimuat utuh dari content/works.json; yang berubah hanya apa yang masih bisa terbaca. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'dasar2'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'di-dasar-rumah', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); // tanpa angka, supaya angka di teks bisa dicari aman
  const plain = s => String(s).replace(/\*/g, '').trim();
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  const isBreak = p => !/[\p{L}\p{N}]/u.test(String(p));
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };
  let toastT = 0;
  const toast = (m, ms = 4200) => { const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms); };
  root.lang = t('id', 'en');

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work || !hasText(work.body)) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')} <a href="../../">${t('Kembali', 'Back')}</a></p>`; return; }
  const tr = EN && work.en && hasText(work.en.body) ? work.en : null;
  if (EN && !tr) { $('#lost').hidden = false; $('#lost').textContent = 'This story is not translated yet, so it is shown in the original.'; }
  const BODY = tr ? tr.body : work.body;
  const TITLE = (tr && tr.title) || work.title;
  document.title = `${TITLE} · Quiet Margins`;
  $('#title').textContent = TITLE;

  const P = [], FLOORS = [[]];
  BODY.forEach(p => { if (isBreak(p)) { if (FLOORS[FLOORS.length - 1].length) FLOORS.push([]); return; } const it = { i: P.length, text: String(p), floor: FLOORS.length - 1 }; P.push(it); FLOORS[FLOORS.length - 1].push(it); });
  const at = re => P.findIndex(p => re.test(plain(p.text)));

  /* ---------- yang dilupakan, dan kapan ---------- */
  const NUM = /\b(\d[\d.,]*\d|\d|nol|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|sejuta|belas|puluh|ratus|ribu|juta)\b/gi;
  const FORGET = (EN ? [
    { id: 'river', at: at(/She gave the flame the name of the river/), re: /\brivers?\b/gi },
    { id: 'rain', at: at(/she had given the flame the smell of rain/), re: /\brain\b/gi },
    { id: 'salt', at: at(/she had given the flame the smell of rain/), re: /\bsalt\b/gi }
  ] : [
    { id: 'angka', at: at(/lembar-lembar tagihan di bawah siku telah kosong/), re: NUM, all: true },
    { id: 'sungai', at: at(/^Cahaya mengembang\. Gadis itu duduk kembali/), re: /\bsungai\b/gi },
    { id: 'hujan', at: at(/^Gadis itu telah memberikan bau hujan/), re: /\bhujan\b/gi },
    { id: 'garam', at: at(/^Gadis itu telah memberikan bau hujan/), re: /\bgaram\b/gi },
    { id: 'gunting', at: at(/^Gadis itu telah memberikan bau hujan/), re: /\bgunting\b/gi },
    { id: 'wajah', at: at(/^Tak ada wajah yang datang\.$/), re: /\bwajah\b(?=\s+(?:Ibu|ibunya|ibu)\b)/g }
  ]).filter(f => f.at >= 0);
  // saat-saat nyalanya meredup: pembaca juga boleh memberi satu kata, seperti gadis itu
  const GIVE = (EN ? [
    [at(/She gave the flame the name of the river/), 'The flame dims by almost half. She gives it the name of the river. You can give too: tap one word on this page.'],
    [at(/she had given the flame the smell of rain/), 'It is never enough. Give one more word so it does not go out.']
  ] : [
    [at(/Akhirnya ia memberinya nama sungai/), 'Nyalanya meredup hampir separuh. Ia memberinya nama sungai. Kau juga bisa memberi: ketuk satu kata di halaman ini.'],
    [at(/^Denyut berikutnya terlambat/), 'Denyutnya terlambat. Berikan satu kata lagi supaya ia tidak padam.'],
    [at(/^Ketika nyala akhirnya menyusut sampai hampir/), 'Nyalanya hampir tidak terlihat. Ini yang terakhir yang bisa kau berikan.']
  ]).filter(g => g[0] >= 0);
  // "Ibu" ternyata sebutan untuk siapa pun yang menjaga nyala
  const KEEPER_AT = at(EN ? /There is no Mother/ : /^Ia membuka buku-buku lain/);
  const FLAME_AT = at(EN ? /windowless/ : /nyala keemasan bergerak pelan/), BEAT_AT = at(EN ? /^It was beating\.$/ : /^Nyala itu berdetak\.$/);
  const NOTE_AT = EN ? -1 : at(/^Pada halaman kosong sebuah buku/), MUTE_AT = EN ? -1 : at(/^Ketika bangun berikutnya, tulisannya masih ada/);
  const WARN_AT = EN ? -1 : at(/^Di bawah kalimat tersebut ia menambahkan/), TURN_AT = EN ? -1 : at(/^Perempuan itu membalik halaman/);
  const MOTHER_AT = EN ? -1 : at(/^Anak itu membuka mata dan memanggilnya Ibu/);
  // suhu setiap lantai: hangat di atas, makin dingin ke bawah, hangat lagi di desa
  const TEMP = [['warm', .55], ['warm', .3], ['cold', .3], ['cold', .45], ['cold', .6], ['cold', .75], ['cold', .45], ['warm', .5]];
  const MEM_AT = at(EN ? /how many things she still remembered/ : /mulai menghitung hal-hal yang masih diingat/);
  const MEM = EN
    ? [['Her mother’s face', null], ['The smell of rain on soil', 'rain'], ['The taste of salt', 'salt'], ['The name of the river near her house', 'river']]
    : [['Wajah Ibu', 'wajah'], ['Bau hujan di tanah', 'hujan'], ['Rasa garam', 'garam'], ['Nama sungai di dekat rumah', 'sungai'], ['Bunyi gunting ketika memotong wol', 'gunting']];

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, reach: -1, retold: 0, given: [], refused: 0, asked: [], lost: [], name: '', warn: '' });
  let S = store.get('dasar2', null); S = S && S.v === 1 ? { ...blank(), ...S } : blank();
  const save = () => store.set('dasar2', S);
  const wordRe = w => new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu');
  const addGiven = g => FORGET.push({ id: 'g' + FORGET.length, at: g.at, re: wordRe(g.w), mine: g.w });
  S.given.forEach(addGiven);
  // ?dongeng=: seseorang menceritakan ini kepadamu; kata-kata yang ia berikan sudah hilang sejak awal (hanya di bacaan ini)
  const HEIR = (() => { try { const d = JSON.parse(decodeURIComponent(escape(atob(qs.get('dongeng') || '')))); return (Array.isArray(d.g) ? d.g : []).map(w => String(w).toLowerCase().replace(/[^\p{L}]/gu, '')).filter(w => w.length >= 3 && w.length <= 24).slice(0, 12); } catch (e) { return []; } })();
  HEIR.forEach(w => { if (!S.given.some(g => g.w === w)) FORGET.push({ id: 'h' + FORGET.length, at: -1, re: wordRe(w), heir: w }); });
  const gone = f => S.lost.includes(f.id) || S.reach >= f.at;

  const whenOf = f => (f.heir ? t('hilang sebelum kau datang', 'gone before you came') : f.mine ? t('kau berikan', 'you gave it') : P[f.at] ? t(`hilang di lantai ${P[f.at].floor + 1}`, `lost on floor ${P[f.at].floor + 1}`) : '');
  /* ---------- menyusun ---------- */
  // setiap kata yang kelak bisa hilang dibungkus sejak awal, supaya hilangnya serentak di seluruh halaman
  function wrap(text) {
    let h = esc(text);
    FORGET.forEach((f, k) => { h = h.replace(f.re, m => `\u0001${k}\u0002${m}\u0003`); });
    h = h.replace(/\u0001(\d+)\u0002([^\u0003]*)\u0003/g, (m, k, w) => `<span class="w${FORGET[k].id === 'angka' ? ' num' : ''}${FORGET[k].mine ? ' mine' : ''}${FORGET[k].heir ? ' heir' : ''}" data-f="${FORGET[k].id}" data-when="${esc(whenOf(FORGET[k]))}">${w}</span>`);
    h = h.replace(/(^|[^\p{L}>])(Ibu|Mother)(?![\p{L}])/gu, '$1<span class="ibu">$2</span>');
    return h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  }
  const pHTML = p => `<p data-i="${p.i}"${/^\*[^*]+\*$/.test(p.text.trim()) ? ' class="voice"' : ''}>${wrap(p.text)}</p>`;
  const slip = i => (i === NOTE_AT ? `<div class="slip" id="nameSlip"><label for="myName">${esc(t('Tulis namamu di halaman kosong itu', 'Write your name on that blank page'))}</label><input id="myName" maxlength="24" autocomplete="off" spellcheck="false" placeholder="${esc(t('nama', 'name'))}"><span class="hand-name" id="nameHand" hidden></span><small id="nameNote">${esc(t('Hanya tersimpan di perangkatmu.', 'Only kept on your device.'))}</small></div>`
    : i === WARN_AT ? `<div class="slip" id="warnSlip"><label for="myWarn">${esc(t('Tulis satu peringatan untuk dirimu sendiri', 'Write one warning to yourself'))}</label><textarea id="myWarn" maxlength="140" rows="2" placeholder="${esc(t('Jangan percaya ketika…', 'Do not believe it when…'))}"></textarea><small>${esc(t('Kau akan menemuinya lagi.', 'You will meet it again.'))}</small></div>`
    : i === TURN_AT ? `<div class="slip turned" id="turnSlip" hidden><p class="hand" id="turnText"></p><span class="page-edge" aria-hidden="true"></span></div>` : '');
  story.innerHTML = FLOORS.map((f, fi) => `<section class="floor" id="lantai-${fi + 1}" data-f="${fi}">
      <header class="floor-h"><small>${t('Lantai', 'Floor')}</small><b>${String(fi + 1).padStart(2, '0')}</b></header>${f.map(p => pHTML(p) + slip(p.i)).join('')}</section>`).join('');
  const paras = $$('#story p[data-i]');

  function paintForget(fresh = []) {
    FORGET.forEach(f => {
      const off = gone(f);
      $$(`[data-f="${f.id}"]`).forEach(el => {
        if (el.matches('.floor')) return;
        el.classList.toggle('lupa', off);
        if (off && fresh.includes(f.id) && !calm()) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) { el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh'); } }
        el.setAttribute('aria-label', off ? t('kata yang terlupakan', 'a forgotten word') : '');
        if (!off) el.removeAttribute('aria-label');
      });
    });
    memPaint(); flamePaint();
  }
  // tahan kata yang hilang: ia muncul samar, lalu pergi lagi
  let peekEl = null;
  const unpeek = () => { if (peekEl) { peekEl.classList.remove('peek', 'swap'); if (peekEl.dataset.t) { peekEl.textContent = peekEl.dataset.t; delete peekEl.dataset.t; } peekEl = null; } };
  const keeperOn = () => KEEPER_AT >= 0 && S.reach >= KEEPER_AT;
  document.addEventListener('pointerdown', e => {
    if (giving) return;
    const k = e.target.closest('.ibu'); if (k && keeperOn()) { e.preventDefault(); unpeek(); peekEl = k; k.dataset.t = k.textContent; k.textContent = t('penjaga', 'keeper'); k.classList.add('swap'); return; }
    const w = e.target.closest('.lupa'); if (!w) return; e.preventDefault(); unpeek(); peekEl = w; w.classList.add('peek');
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => addEventListener(ev, unpeek, { passive: true }));
  document.addEventListener('contextmenu', e => { if (e.target.closest('.lupa')) e.preventDefault(); });

  /* ---------- nyala kecil di bilah atas ---------- */
  const flameBtn = $('#flame');
  function flamePaint() {
    const on = FLAME_AT >= 0 && S.reach >= FLAME_AT; flameBtn.hidden = !on; if (!on) return;
    const eaten = FORGET.filter(f => gone(f) && !f.heir).length;
    root.style.setProperty('--fl', Math.max(.38, 1 - eaten * .09).toFixed(2));
    root.style.setProperty('--fl-o', Math.max(.35, 1 - S.refused * .2).toFixed(2));
    flameBtn.classList.toggle('beat', BEAT_AT >= 0 && S.reach >= BEAT_AT && !calm());
  }
  flameBtn.onclick = () => {
    const n = $$('#story .lupa').length;
    toast(n ? t(`Ia sudah memakan ${n} kata dari halaman ini.`, `It has eaten ${n} words from this page.`) : t('Ia belum memakan apa-apa. Belum.', 'It has eaten nothing yet. Not yet.'), 3600);
  };

  /* ---------- namamu, peringatanmu ---------- */
  function slipsPaint(fresh) {
    const ni = $('#myName'), nh = $('#nameHand');
    if (ni) {
      if (document.activeElement !== ni) ni.value = S.name || '';
      const muted = MUTE_AT >= 0 && S.reach >= MUTE_AT && S.name, mother = MOTHER_AT >= 0 && S.reach >= MOTHER_AT && S.name;
      ni.hidden = !!muted; nh.hidden = !muted;
      if (muted) nh.innerHTML = mother ? `<s>${esc(S.name)}</s> ${esc(t('Ibu', 'Mother'))}` : [...S.name].map((c, k) => `<i style="--k:${k}">${esc(c)}</i>`).join('');
      nh.classList.toggle('mute', !!muted && !mother); nh.classList.toggle('fresh', !!fresh && fresh.includes('name'));
      $('#nameNote').textContent = mother ? t('Sebutan itu masuk dengan mudah.', 'The word goes in easily.') : muted ? t('Hurufnya masih ada. Bunyinya tidak.', 'The letters are still there. The sound is not.') : t('Hanya tersimpan di perangkatmu.', 'Only kept on your device.');
    }
    const wi = $('#myWarn'); if (wi && document.activeElement !== wi) wi.value = S.warn || '';
    const ts = $('#turnSlip');
    if (ts) {
      const show = !!S.warn && S.reach >= TURN_AT; ts.hidden = !show;
      if (show) { const cut = Math.max(6, Math.ceil(S.warn.length * .55)); $('#turnText').textContent = S.warn.slice(0, cut) + (cut < S.warn.length ? '…' : ''); ts.classList.toggle('flip', !!fresh && fresh.includes('turn') && !calm()); }
    }
  }
  $('#myName')?.addEventListener('input', e => { S.name = e.target.value.trim().slice(0, 24); save(); });
  $('#myWarn')?.addEventListener('input', e => { S.warn = e.target.value.trim().slice(0, 140); save(); });

  /* ---------- yang masih kuingat ---------- */
  const memBtn = $('#openMem'), memDlg = $('#mem');
  function memPaint() {
    const on = MEM_AT >= 0 && S.reach >= MEM_AT; memBtn.hidden = !on;
    const left = MEM.filter(([, id]) => !id || !FORGET.find(f => f.id === id && gone(f))).length;
    if (on) memBtn.dataset.n = left; else delete memBtn.dataset.n;
    $('#memTitle').textContent = t(`${left} bintang`, `${left} stars`);
    const mine = FORGET.filter(f => f.mine);
    $('#memMine').hidden = !mine.length; $('#memMine').innerHTML = mine.length ? `<p class="mem-k">${esc(t('Yang kau berikan', 'What you gave'))}</p><ol class="mem-l">${mine.map(f => `<li class="gone mine"><span>${esc(f.mine)}</span></li>`).join('')}</ol>` : '';
    $('#memList').innerHTML = MEM.map(([l, id]) => { const g = id && FORGET.find(f => f.id === id && gone(f)); return `<li class="${g ? 'gone' : ''}"><span>${esc(l)}</span></li>`; }).join('');
    $('#memNote').textContent = left === MEM.length ? t('Disimpan seperti orang menyimpan bintang.', 'Kept the way one keeps stars.') : t('Yang padam masih bisa kau hitung. Kau tidak bisa membacanya lagi.', 'You can still count the ones that went out. You can no longer read them.');
  }
  memBtn.onclick = () => memDlg.showModal();
  memDlg.addEventListener('click', e => { if (e.target === memDlg || e.target.closest('[data-close]')) memDlg.close(); });

  /* ---------- memberi ---------- */
  let giving = null;
  const giveCard = $('#give');
  function askGive(g) {
    giving = g; document.body.classList.add('giving');
    $('#giveText').textContent = g[1];
    giveCard.hidden = false; announce(g[1]);
  }
  function endGive() { giving = null; document.body.classList.remove('giving'); giveCard.hidden = true; }
  const wordAt = (x, y) => {
    let node, off;
    if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (!c) return null; node = c.offsetNode; off = c.offset; }
    else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
    if (!node || node.nodeType !== 3) return null;
    const s = node.nodeValue; let a = off, b = off;
    while (a > 0 && /\p{L}/u.test(s[a - 1])) a--;
    while (b < s.length && /\p{L}/u.test(s[b])) b++;
    return s.slice(a, b);
  };
  story.addEventListener('click', e => {
    if (!giving) return;
    if (e.target.closest('.lupa')) { toast(t('Kata itu sudah tidak ada. Pilih yang lain.', 'That word is already gone. Choose another.'), 2600); return; }
    const w = (wordAt(e.clientX, e.clientY) || '').trim();
    if (w.length < 3 || /^(quot|apos|amp)$/i.test(w)) { toast(t('Ketuk satu kata, paling sedikit tiga huruf.', 'Tap a word of at least three letters.'), 2600); return; }
    const g = { w: w.toLowerCase(), at: giving[0] };
    S.given.push(g); S.asked.push(giving[0]); addGiven(g); S.lost.push(FORGET[FORGET.length - 1].id); save(); endGive();
    paras.forEach(p => { p.innerHTML = wrap(P[+p.dataset.i].text); });
    const ag = $$('.again-t'); ag.forEach((el, k) => { el.innerHTML = wrap(P[k].text); });
    paintForget([FORGET[FORGET.length - 1].id]);
    const n = $$(`[data-f="${FORGET[FORGET.length - 1].id}"]`).length;
    toast(t(`Kau memberikan satu kata. Ia hilang dari seluruh halaman (${n} kali). Nyalanya kembali sebesar tadi.`, `You gave one word. It is gone from every page (${n} times). The flame grows back.`), 5200);
  });
  $('#giveNo').onclick = () => { if (!giving) return; S.asked.push(giving[0]); S.refused++; save(); endGive(); paintDim(); toast(t('Kau tidak memberi apa-apa. Halaman ini meredup.', 'You gave nothing. This page dims.'), 3600); };
  const paintDim = () => { root.style.setProperty('--dimmed', String(Math.min(3, S.refused))); flamePaint(); };
  paintDim();

  /* ---------- bergulir ---------- */
  let curF = -1, ticking = false;
  function frame() {
    ticking = false;
    const line = innerHeight * .5; let r = -1;
    for (const p of paras) { if (p.getBoundingClientRect().top < line) r = +p.dataset.i; else break; }
    if (r > S.reach) {
      const before = S.reach; S.reach = r; save();
      const fresh = FORGET.filter(f => before < f.at && r >= f.at && !S.lost.includes(f.id)).map(f => f.id);
      fresh.forEach(id => S.lost.push(id)); if (fresh.length) save();
      if (fresh.length) {
        paintForget(fresh);
        toast(fresh.includes('angka') ? t('Angka-angkanya hilang dari seluruh halaman, juga dari yang sudah kau baca.', 'The numbers are gone from every page, even the ones you have read.') : fresh.length > 1 ? t(`${fresh.length} kata hilang dari seluruh halaman, juga dari yang sudah kau baca.`, `${fresh.length} words are gone from every page, even the ones you have read.`) : t('Satu kata hilang dari seluruh halaman, juga dari yang sudah kau baca.', 'One word is gone from every page, even the ones you have read.'));
      } else if (MEM_AT >= 0 && before < MEM_AT && r >= MEM_AT) memPaint();
      const g = GIVE.find(x => before < x[0] && r >= x[0] && !S.asked.includes(x[0])); if (g && !giving) setTimeout(() => askGive(g), calm() ? 0 : 700);
      const crossed = k => k >= 0 && before < k && r >= k;
      if (crossed(MUTE_AT) && S.name) { slipsPaint(['name']); toast(t('Namamu masih tertulis. Bunyinya sudah tidak ada.', 'Your name is still written. Its sound is gone.'), 4200); }
      else if (crossed(TURN_AT) && S.warn) slipsPaint(['turn']);
      else if (crossed(MOTHER_AT) || crossed(NOTE_AT)) slipsPaint();
      if (crossed(FLAME_AT) || crossed(BEAT_AT)) flamePaint();
      if (KEEPER_AT >= 0 && before < KEEPER_AT && r >= KEEPER_AT) { root.classList.add('keeper'); setTimeout(() => toast(t('Tahan kata “Ibu” di mana pun di halaman ini.', 'Hold the word “Mother” anywhere on this page.'), 5000), 1200); }
    }
    let f = -1; $$('.floor').forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) f = i; });
    if (f !== curF) {
      curF = f; $('#stepChip').hidden = f < 0; if (f >= 0 && G) G.step(f + 1, FLOORS.length, t('Lantai', 'Floor'));
      const [kind, amt] = TEMP[Math.max(0, f)] || ['warm', 0];
      root.dataset.temp = f < 0 ? '' : kind; root.style.setProperty('--tamt', (f < 0 ? 0 : amt).toFixed(2));
      root.classList.toggle('frost', f >= 2 && f <= 5);
    }
    const max = document.documentElement.scrollHeight - innerHeight, fr = max > 0 ? scrollY / max : 0;
    clearTimeout(frame.t); frame.t = setTimeout(() => {
      if (scrollY > 200) { store.set('dasar2:place', +fr.toFixed(4)); const pr = store.get('prog', {}) || {}; pr[SLUG] = Math.max(pr[SLUG] || 0, +fr.toFixed(3)); store.set('prog', pr); }
      if (fr > .97 && !$('#end').dataset.done) finish();
    }, 300);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(frame));

  /* ---------- akhir: dongengnya mulai lagi, dengan kata-kata yang tersisa ---------- */
  function finish() {
    const end = $('#end'); end.dataset.done = '1'; end.hidden = false;
    const lost = FORGET.filter(gone).length;
    end.innerHTML = `<section class="again" aria-label="${esc(t('Dongengnya mulai lagi', 'The tale begins again'))}">
        <p class="again-k">${esc(t('Ibu bercerita', 'Mother is telling it'))}</p>
        ${P.slice(0, 2).map(p => `<p class="again-t">${wrap(p.text)}</p>`).join("")}
        ${S.given.length ? `<p class="again-n">${esc(t(`${S.given.length} kata yang kau berikan juga tidak akan sampai kepada anak berikutnya.`, `The ${S.given.length} words you gave will not reach the next child either.`))}</p>` : ''}
        <p class="again-n">${esc(lost ? t('Dongengnya mulai lagi. Beberapa katanya sudah tidak ada, dan yang mendengarnya tidak akan tahu.', 'The tale begins again. Some of its words are gone, and whoever hears it will not know.') : t('Dongengnya mulai lagi.', 'The tale begins again.'))}</p>
      </section>
      <div class="end-act"><button type="button" class="ghost" id="listen" hidden>${esc(t('Dengarkan Ibu bercerita', 'Hear Mother tell it'))}</button></div>
      ${indexHTML()}
      <div class="end-act"><button type="button" class="go" id="retell">${esc(t('Ceritakan lagi', 'Tell it again'))}</button><button type="button" class="ghost" id="pass">${esc(t('Ceritakan kepada seseorang', 'Tell it to someone'))}</button></div>
      ${G ? G.next(SLUG) : ''}`;
    paintForget();
    $('#pass').onclick = passOn;
    if ('speechSynthesis' in window) { $('#listen').hidden = false; $('#listen').onclick = listen; }
    // diceritakan lagi: bacaan berikutnya mulai dari atas, dan kata-kata yang hilang tetap hilang
    $('#retell').onclick = () => { S.retold++; S.reach = -1; S.asked = []; save(); coverPaint(); scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); setTimeout(() => { paintForget(); root.classList.toggle('keeper', keeperOn()); }, 600); };
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
  }

  // indeks di halaman belakang: semua kata yang hilang, berapa kali, dan kapan
  function indexHTML() {
    const rows = FORGET.filter(gone).map(f => ({ f, n: $$(`#story [data-f="${f.id}"]`).length, w: ($(`#story [data-f="${f.id}"]`) || {}).textContent || f.mine || f.heir || '' })).filter(x => x.n);
    if (!rows.length) return '';
    const total = rows.reduce((a, x) => a + x.n, 0);
    return `<section class="index" aria-label="${esc(t('Indeks kata yang hilang', 'Index of lost words'))}"><p class="again-k">${esc(t('Indeks', 'Index'))}</p>
      <h3>${esc(t(`Dongeng ini kehilangan ${total} kata.`, `This tale has lost ${total} words.`))}</h3><p class="index-n">${esc(t('Tahan satu baris untuk mencoba mengingat katanya.', 'Hold a line to try to remember its word.'))}</p>
      <ol>${rows.map(x => `<li><span class="w lupa${x.f.mine ? ' mine' : ''}${x.f.heir ? ' heir' : ''}" data-when="${esc(whenOf(x.f))}">${esc(x.f.id === 'angka' ? t('angka', 'numbers') : x.w)}</span><small>${x.n}× · ${esc(whenOf(x.f))}</small></li>`).join('')}</ol></section>`;
  }
  // ceritakan kepada seseorang: tautan yang membuka dongeng ini tanpa kata-kata yang kau berikan
  async function passOn() {
    const words = [...new Set([...S.given.map(g => g.w), ...HEIR])].slice(0, 12);
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ g: words }))));
    const url = `${location.origin}${location.pathname}?dongeng=${encodeURIComponent(code)}`;
    const text = t('Biar kuceritakan betapa hangatnya nanti.', 'Let me tell you how warm it will be.');
    try { if (navigator.share) { await navigator.share({ title: TITLE, text, url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast(t(`Tautannya tersalin. ${words.length ? words.length + ' kata yang kau berikan sudah hilang di dongeng mereka.' : 'Dongengnya masih utuh, untuk sekarang.'}`, `Link copied. ${words.length ? words.length + ' words you gave are already gone from their tale.' : 'The tale is still whole, for now.'}`), 5200); } catch (e) { prompt(t('Salin tautan ini:', 'Copy this link:'), url); }
  }
  // Ibu bercerita dengan suara: setiap kata yang hilang menjadi jeda
  let speaking = false;
  function listen() {
    const syn = speechSynthesis, b = $('#listen');
    if (speaking) { syn.cancel(); speaking = false; b.textContent = t('Dengarkan Ibu bercerita', 'Hear Mother tell it'); return; }
    const parts = [];
    $$('.again-t').forEach(p => { p.childNodes.forEach(n => { if (n.nodeType === 3) parts.push(n.nodeValue); else if (n.classList && n.classList.contains('lupa')) parts.push(null); else parts.push(n.textContent); }); parts.push(''); });
    const chunks = []; let buf = '';
    parts.forEach(x => { if (x === null) { if (buf.trim()) chunks.push(buf); buf = ''; chunks.push(null); } else buf += x; });
    if (buf.trim()) chunks.push(buf);
    speaking = true; b.textContent = t('Berhenti', 'Stop');
    const next = k => {
      if (!speaking || k >= chunks.length) { speaking = false; b.textContent = t('Dengarkan Ibu bercerita', 'Hear Mother tell it'); return; }
      if (chunks[k] === null) { setTimeout(() => next(k + 1), 1100); return; }
      const u = new SpeechSynthesisUtterance(chunks[k]); u.lang = EN ? 'en-US' : 'id-ID'; u.rate = .88; u.pitch = .92;
      u.onend = () => next(k + 1); u.onerror = () => next(k + 1); syn.speak(u);
    };
    syn.cancel(); next(0);
  }

  /* ---------- sampul ---------- */
  function coverPaint() {
    $('#kick').textContent = 'Koda · ' + t('Cerpen', 'Short story') + (S.retold ? ' · ' + t(`diceritakan ${S.retold + 1} kali`, `told ${S.retold + 1} times`) : '');
    $('#lede').textContent = S.retold ? t('Maka begini, anakku. Setiap kali diceritakan, ada yang tidak ikut.', 'So it goes, my child. Every time it is told, something stays behind.') : t('Seorang gadis dengan tangan yang selalu dingin menerima pekerjaan yang hangat.', 'A girl whose hands are always cold accepts a warm job.');
    if (HEIR.length) { $('#how').innerHTML = esc(t(`Seseorang menceritakan ini kepadamu. ${HEIR.length} katanya sudah tidak ada, dan kau tidak akan tahu yang mana.`, `Someone is telling you this. ${HEIR.length} of its words are already gone, and you will not know which.`)); $('#kick').textContent += ' · ' + t('diceritakan kepadamu', 'told to you'); }
    else if (EN) $('#how').innerHTML = 'Every memory she gives to the flame will vanish from this page, even from the parts you have already read. Hold a <span class="lupa demo" aria-hidden="true">word</span> that is gone to try to remember it.';
    const place = store.get('dasar2:place', 0);
    $('#begin').textContent = S.retold ? t('Ceritakan lagi', 'Tell it again') : place > .03 && place < .97 ? t('Lanjutkan turun', 'Keep going down') : t('Mulai turun', 'Begin the descent');
    $('#begin').onclick = e => { if (place > .03 && place < .97 && !S.retold) { e.preventDefault(); scrollTo({ top: place * (document.documentElement.scrollHeight - innerHeight), behavior: 'auto' }); } };
  }
  coverPaint();

  /* ---------- pengaturan ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  $('#reset').onclick = () => { if (!confirm(t('Kembalikan semua kata yang hilang dan mulai dari atas?', 'Bring back every lost word and start from the top?'))) return; S = blank(); save(); store.set('dasar2:place', 0); paintForget(); coverPaint(); $('#end').hidden = true; delete $('#end').dataset.done; scrollTo({ top: 0 }); };
  if (EN) { $('#resetLabel').textContent = 'Memories in this story'; $('#reset').textContent = 'Bring every word back'; $('#memKick').textContent = 'What I still remember'; $('#back').querySelector('[data-qm-label]').textContent = 'Desk'; $('#begin').textContent = 'Begin the descent'; }

  /* ---------- mulai ---------- */
  { const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]); const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st); }
  root.classList.toggle('keeper', keeperOn());
  paintForget(); slipsPaint(); frame();
  $('#back').addEventListener('click', e => { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); } });
  if (G) {
    G.mount({ slug: SLUG, title: TITLE, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#story',
      lede: t('Seorang gadis dengan tangan yang selalu dingin menerima pekerjaan yang hangat.', 'A girl whose hands are always cold accepts a warm job.'),
      steps: [
        t('Ceritanya turun, lantai demi lantai.', 'The story goes down, floor by floor.'),
        t('Setiap kali gadis itu memberikan satu ingatan, kata itu hilang dari seluruh halaman, juga dari bagian yang sudah kau baca.', 'Each time the girl gives away a memory, that word disappears from every page, even the parts you have read.'),
        t('Tahan kata yang hilang untuk mencoba mengingatnya. Bintang di atas menyimpan yang masih ia ingat.', 'Hold a lost word to try to remember it. The star above keeps what she still remembers.'),
        t('Pengaturan baca mengembalikan semua kata kalau kau ingin mulai lagi.', 'Reading settings can bring every word back if you want to start again.')
      ] });
    G.settings();
  }
  if (location.hash.startsWith('#lantai-')) setTimeout(() => $(location.hash)?.scrollIntoView(), 60);
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
