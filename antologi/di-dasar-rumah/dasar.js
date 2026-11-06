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
  const MEM_AT = at(EN ? /how many things she still remembered/ : /mulai menghitung hal-hal yang masih diingat/);
  const MEM = EN
    ? [['Her mother’s face', null], ['The smell of rain on soil', 'rain'], ['The taste of salt', 'salt'], ['The name of the river near her house', 'river']]
    : [['Wajah Ibu', 'wajah'], ['Bau hujan di tanah', 'hujan'], ['Rasa garam', 'garam'], ['Nama sungai di dekat rumah', 'sungai'], ['Bunyi gunting ketika memotong wol', 'gunting']];

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, reach: -1, retold: 0 });
  let S = store.get('dasar2', null); S = S && S.v === 1 ? { ...blank(), ...S } : blank();
  const save = () => store.set('dasar2', S);
  const gone = f => S.reach >= f.at;

  /* ---------- menyusun ---------- */
  // setiap kata yang kelak bisa hilang dibungkus sejak awal, supaya hilangnya serentak di seluruh halaman
  function wrap(text) {
    let h = esc(text);
    FORGET.forEach(f => { h = h.replace(f.re, m => `\u0001${f.id}\u0002${m}\u0003`); });
    h = h.replace(/\u0001(\w+)\u0002([^\u0003]*)\u0003/g, (m, id, w) => `<span class="w${id === 'angka' ? ' num' : ''}" data-f="${id}">${w}</span>`);
    return h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  }
  const pHTML = p => `<p data-i="${p.i}"${/^\*[^*]+\*$/.test(p.text.trim()) ? ' class="voice"' : ''}>${wrap(p.text)}</p>`;
  story.innerHTML = FLOORS.map((f, fi) => `<section class="floor" id="lantai-${fi + 1}" data-f="${fi}">
      <header class="floor-h"><small>${t('Lantai', 'Floor')}</small><b>${String(fi + 1).padStart(2, '0')}</b></header>${f.map(pHTML).join('')}</section>`).join('');
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
    memPaint();
  }
  // tahan kata yang hilang: ia muncul samar, lalu pergi lagi
  let peekEl = null;
  const unpeek = () => { if (peekEl) { peekEl.classList.remove('peek'); peekEl = null; } };
  document.addEventListener('pointerdown', e => { const w = e.target.closest('.lupa'); if (!w) return; e.preventDefault(); unpeek(); peekEl = w; w.classList.add('peek'); });
  ['pointerup', 'pointercancel', 'scroll'].forEach(ev => addEventListener(ev, unpeek, { passive: true }));
  document.addEventListener('contextmenu', e => { if (e.target.closest('.lupa')) e.preventDefault(); });

  /* ---------- yang masih kuingat ---------- */
  const memBtn = $('#openMem'), memDlg = $('#mem');
  function memPaint() {
    const on = MEM_AT >= 0 && S.reach >= MEM_AT; memBtn.hidden = !on;
    const left = MEM.filter(([, id]) => !id || !FORGET.find(f => f.id === id && gone(f))).length;
    if (on) memBtn.dataset.n = left; else delete memBtn.dataset.n;
    $('#memTitle').textContent = t(`${left} bintang`, `${left} stars`);
    $('#memList').innerHTML = MEM.map(([l, id]) => { const g = id && FORGET.find(f => f.id === id && gone(f)); return `<li class="${g ? 'gone' : ''}"><span>${esc(l)}</span></li>`; }).join('');
    $('#memNote').textContent = left === MEM.length ? t('Disimpan seperti orang menyimpan bintang.', 'Kept the way one keeps stars.') : t('Yang padam masih bisa kau hitung. Kau tidak bisa membacanya lagi.', 'You can still count the ones that went out. You can no longer read them.');
  }
  memBtn.onclick = () => memDlg.showModal();
  memDlg.addEventListener('click', e => { if (e.target === memDlg || e.target.closest('[data-close]')) memDlg.close(); });

  /* ---------- bergulir ---------- */
  let curF = -1, ticking = false;
  function frame() {
    ticking = false;
    const line = innerHeight * .5; let r = -1;
    for (const p of paras) { if (p.getBoundingClientRect().top < line) r = +p.dataset.i; else break; }
    if (r > S.reach) {
      const before = S.reach; S.reach = r; save();
      const fresh = FORGET.filter(f => before < f.at && r >= f.at).map(f => f.id);
      if (fresh.length) {
        paintForget(fresh);
        toast(fresh.includes('angka') ? t('Angka-angkanya hilang dari seluruh halaman, juga dari yang sudah kau baca.', 'The numbers are gone from every page, even the ones you have read.') : fresh.length > 1 ? t(`${fresh.length} kata hilang dari seluruh halaman, juga dari yang sudah kau baca.`, `${fresh.length} words are gone from every page, even the ones you have read.`) : t('Satu kata hilang dari seluruh halaman, juga dari yang sudah kau baca.', 'One word is gone from every page, even the ones you have read.'));
      } else if (MEM_AT >= 0 && before < MEM_AT && r >= MEM_AT) memPaint();
    }
    let f = -1; $$('.floor').forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) f = i; });
    if (f !== curF) { curF = f; $('#stepChip').hidden = f < 0; if (f >= 0 && G) G.step(f + 1, FLOORS.length, t('Lantai', 'Floor')); }
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
        <p class="again-n">${esc(lost ? t('Dongengnya mulai lagi. Beberapa katanya sudah tidak ada, dan yang mendengarnya tidak akan tahu.', 'The tale begins again. Some of its words are gone, and whoever hears it will not know.') : t('Dongengnya mulai lagi.', 'The tale begins again.'))}</p>
      </section>
      <div class="end-act"><button type="button" class="go" id="retell">${esc(t('Ceritakan lagi', 'Tell it again'))}</button></div>
      ${G ? G.next(SLUG) : ''}`;
    paintForget();
    $('#retell').onclick = () => { S.retold++; save(); coverPaint(); scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' }); };
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
  }

  /* ---------- sampul ---------- */
  function coverPaint() {
    $('#kick').textContent = 'Koda · ' + t('Cerpen', 'Short story') + (S.retold ? ' · ' + t(`diceritakan ${S.retold + 1} kali`, `told ${S.retold + 1} times`) : '');
    $('#lede').textContent = t('Seorang gadis dengan tangan yang selalu dingin menerima pekerjaan yang hangat.', 'A girl whose hands are always cold accepts a warm job.');
    if (EN) $('#how').innerHTML = 'Every memory she gives to the flame will vanish from this page, even from the parts you have already read. Hold a <span class="lupa demo" aria-hidden="true">word</span> that is gone to try to remember it.';
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
  paintForget(); frame();
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
