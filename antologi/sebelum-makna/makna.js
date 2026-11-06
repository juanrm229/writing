/* Sebelum Makna Menemukan Kita: esai pengantar Titik Biru.
   Teks dimuat utuh dari content/works.json; yang ditambahkan hanya cara membacanya:
   - Peta: sembilan belas bagian menjadi sembilan belas titik. Titik biru: kau di sini.
   - Baca cepat: hanya kalimat pertama setiap paragraf, untuk membaca sekilas.
   - Nama pemikir bisa diketuk; kartunya diambil dari esai ini dan dari catatan bacaannya.
   - Percobaan pikiran (bagian yang dibuka dengan "Saya membayangkan") tampil sebagai adegan.
   - Halaman ini diam-diam memberi garis emas pada kalimat tempat pembaca berhenti lama. Di bagian XII ia mengaku,
     di bagian XVII pembaca memeriksa tandanya satu per satu, dan di akhir hanya yang dipertahankan yang tersisa.
   - Janji: sesudah bagian XIII pembaca boleh menulis satu janji untuk dirinya; ia kembali di akhir.
   - Segelas air di bilah atas pelan-pelan tidak lagi dingin selama kau membaca. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'makna'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'sebelum-makna-menemukan-kita', G = window.JMGuide, root = document.documentElement;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, a, h) => `<a href="${h}" target="_blank" rel="noopener">${a}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '').trim();
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };
  let toastT = 0;
  const toast = (m, ms = 4200) => { const el = $('#toast'); el.innerHTML = m; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms); };

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const essay = $('#essay');
  if (!work || !Array.isArray(work.body)) { essay.innerHTML = '<p class="loading">Esai belum bisa dimuat. <a href="../../">Kembali</a></p>'; return; }
  if ((qs.get('lang') || store.get('lang', 'id')) === 'en') { $('#lost').hidden = false; $('#lost').textContent = 'This essay is only available in Indonesian for now.'; }

  const SECS = [];
  work.body.forEach(p => {
    p = String(p);
    if (p.startsWith('### ')) SECS.push({ title: p.slice(4).trim(), paras: [], brk: false });
    else if (/^-{3,}$/.test(p.trim())) { if (SECS.length) SECS[SECS.length - 1].brk = true; }
    else if (SECS.length) SECS[SECS.length - 1].paras.push(p);
  });
  const notesSec = SECS.find(s => !/^[IVXLC]+\.\s/.test(s.title));
  const MAIN = SECS.filter(s => s !== notesSec);
  MAIN.forEach((s, i) => { const m = /^([IVXLC]+)\.\s+(.*)$/.exec(s.title); s.n = i; s.roman = m ? m[1] : String(i + 1); s.name = m ? m[2] : s.title; s.scene = /^Saya membayangkan/.test(plain(s.paras[0] || '')); s.words = s.paras.reduce((a, p) => a + plain(p).split(/\s+/).length, 0); });
  const byRoman = r => MAIN.findIndex(s => s.roman === r);
  const AT = { confess: byRoman('XII'), review: byRoman('XVII'), promise: byRoman('XIII'), close: byRoman('XIX') };

  /* ---------- pemikir ---------- */
  const NAMES = ['Viktor Frankl', 'Jean-Paul Sartre', 'Susan Wolf', 'Albert Camus', 'Friedrich Nietzsche', 'William James', 'Robert Nozick', 'Harry G. Frankfurt', 'Immanuel Kant'];
  const SHORT = { Frankl: 'Viktor Frankl', Sartre: 'Jean-Paul Sartre', Wolf: 'Susan Wolf', Camus: 'Albert Camus', Nietzsche: 'Friedrich Nietzsche', Nozick: 'Robert Nozick', Frankfurt: 'Harry G. Frankfurt', Kant: 'Immanuel Kant' };
  const WHO_RE = new RegExp('\\b(' + [...NAMES, ...Object.keys(SHORT)].map(n => n.replace(/[.]/g, '\\.')).join('|') + ')\\b');
  const fullOf = n => SHORT[n] || n;

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, marks: [], released: [], janji: '', sec: -1 });
  let S = store.get('makna', null); S = S && S.v === 1 ? { ...blank(), ...S } : blank();
  const save = () => store.set('makna', S);

  /* ---------- menyusun ---------- */
  const SENT = /(?<=[.!?…]["”’)]?)\s+(?=[A-Z“"(*])/;
  const paraHTML = (p, si, pi, whoDone) => {
    const parts = String(p).split(SENT);
    return `<p>${parts.map((x, k) => {
      let h = inline(x);
      const m = !whoDone.has(pi) && WHO_RE.exec(plain(x));
      if (m) { whoDone.add(pi); h = h.replace(m[1], `<button type="button" class="who" data-who="${esc(fullOf(m[1]))}">${m[1]}</button>`); }
      return `<span class="s" data-id="${si}.${pi}.${k}">${h}</span>`;
    }).join(' ')}</p>`;
  };
  const mins = w => Math.max(1, Math.round(w / 200));
  essay.innerHTML = MAIN.map((s, si) => {
    const done = new Set();
    let html = `<section class="sec${s.scene ? ' scene' : ''}" id="b-${si + 1}" data-n="${si}">
      <header class="sec-h"><p class="sec-k"><b>${esc(s.roman)}</b> · ${mins(s.words)} menit${s.scene ? '<span class="tag">Percobaan pikiran</span>' : ''}</p><h2>${inline(s.name)}</h2></header>`;
    if (si === AT.confess) html += '<aside class="slot" id="confess" data-slot="confess"></aside>';
    html += `<div class="body">${s.paras.map((p, pi) => paraHTML(p, si, pi, done)).join('')}</div>`;
    if (si === AT.promise) html += `<aside class="slot blue" data-slot="promise"><p class="slot-k">Janji yang boleh menahanmu</p>
      <p>Tulis satu kalimat untuk dirimu sendiri, untuk minggu yang sulit. Ia hanya tersimpan di perangkatmu, dan akan kau temui lagi di akhir.</p>
      <textarea id="janji" maxlength="240" placeholder="Kalau minggu ini terasa salah semua, ingat bahwa…"></textarea><small id="janjiNote">Tersimpan otomatis.</small></aside>`;
    if (si === AT.review) html += '<aside class="slot" id="review" data-slot="review"></aside>';
    if (si === AT.close) html += '<aside class="slot blue" id="closing" data-slot="closing"></aside>';
    html += '</section>';
    if (s.brk) html += '<hr class="brk">';
    return html;
  }).join('') + (notesSec ? `<section class="sec notes" id="catatan"><header class="sec-h"><p class="sec-k">Catatan</p><h2>${inline(notesSec.title)}</h2></header><div class="body">${(() => {
    let out = '', list = [];
    const flush = () => { if (list.length) { out += `<ol>${list.map(x => `<li>${inline(x.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`; list = []; } };
    notesSec.paras.forEach(p => { if (/^\d+\.\s/.test(p)) list.push(p); else { flush(); out += `<p>${inline(p)}</p>`; } });
    flush(); return out;
  })()}</div></section>` : '');
  const NOTE_ITEMS = notesSec ? notesSec.paras.filter(p => /^\d+\.\s/.test(p)) : [];

  /* ---------- peta ---------- */
  const peta = $('#peta');
  peta.innerHTML = MAIN.map((s, i) => `<a href="#b-${i + 1}" data-go="${i}" class="${s.scene ? 'scene' : ''}" aria-label="${esc(s.roman + '. ' + s.name)}"><span>${esc(s.roman)} · ${esc(s.name.length > 34 ? s.name.slice(0, 32) + '…' : s.name)}</span></a>`).join('');
  peta.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); $('#b-' + (+a.dataset.go + 1)).scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); });

  /* ---------- kartu pemikir ---------- */
  const card = $('#card');
  essay.addEventListener('click', e => {
    const w = e.target.closest('[data-who]'); if (!w) return;
    const name = w.dataset.who, sur = name.split(' ').pop();
    const where = MAIN.map((s, i) => (s.paras.some(p => plain(p).includes(sur)) ? i : -1)).filter(i => i >= 0);
    const firstSent = (() => { for (const s of MAIN) for (const p of s.paras) { const x = plain(p).split(SENT).find(z => z.includes(sur)); if (x) return x; } return ''; })();
    const note = NOTE_ITEMS.find(p => plain(p).includes(sur));
    $('#cardKick').textContent = 'Pemikir dalam esai ini';
    $('#cardName').textContent = name;
    $('#cardBody').innerHTML = `${firstSent ? `<p>${esc(firstSent)}</p>` : ''}${note ? `<p><small>Dari catatan bacaan:</small><br>${inline(note.replace(/^\d+\.\s+/, ''))}</p>` : ''}
      <p class="where">${where.map(i => `<a href="#b-${i + 1}" data-jump="${i}">${esc(MAIN[i].roman)} · ${esc(MAIN[i].name.slice(0, 26))}${MAIN[i].name.length > 26 ? '…' : ''}</a>`).join('')}</p>`;
    card.showModal();
  });
  card.addEventListener('click', e => {
    if (e.target === card || e.target.closest('[data-close]')) { card.close(); return; }
    const j = e.target.closest('[data-jump]'); if (j) { e.preventDefault(); card.close(); $('#b-' + (+j.dataset.jump + 1)).scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); }
  });

  /* ---------- tanda: halaman yang diam-diam memberi makna ----------
     Kalau pembaca diam lebih dari enam detik, kalimat di garis baca diberi garis emas. Satu tanda per bagian, paling banyak dua belas. */
  const sentOf = id => $(`.s[data-id="${id}"]`);
  const textOf = id => { const el = sentOf(id); return el ? el.textContent.trim() : ''; };
  const paintMarks = () => {
    $$('.s.m').forEach(el => el.classList.remove('m', 'released'));
    S.marks.forEach(id => { const el = sentOf(id); if (el) el.classList.add('m'); if (el && S.released.includes(id)) el.classList.add('released'); });
    $$('#peta a').forEach((a, i) => a.classList.toggle('mark', S.marks.some(id => +id.split('.')[0] === i && !S.released.includes(id))));
  };
  let lastMove = Date.now(), pauseUsed = false;
  const moved = () => { lastMove = Date.now(); pauseUsed = false; };
  ['scroll', 'keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, moved, { passive: true }));
  setInterval(() => {
    if (pauseUsed || document.hidden || Date.now() - lastMove < 6000 || card.open || S.marks.length >= 12) return;
    const y = innerHeight * .42; let hit = null;
    for (const el of $$('.sec:not(.notes) .body .s')) {
      const rs = el.getClientRects(); if (!rs.length) continue;
      if (rs[0].top > y + 40) break;
      if ([...rs].some(r => r.top - 6 <= y && r.bottom + 6 >= y)) { hit = el; break; }
    }
    pauseUsed = true;
    if (!hit) return;
    const id = hit.dataset.id, sec = id.split('.')[0];
    if (S.marks.includes(id) || S.marks.some(m => m.split('.')[0] === sec)) return;
    S.marks.push(id); save(); paintMarks(); fillConfess();
  }, 1000);

  /* bagian XII: halaman mengaku */
  const quoteList = ids => `<ol>${ids.map(id => `<li><q>${esc(textOf(id))}</q><span></span></li>`).join('')}</ol>`;
  function fillConfess() {
    const el = $('#confess'); if (!el || el.dataset.locked) return;
    const before = S.marks.filter(id => +id.split('.')[0] < AT.confess);
    el.innerHTML = before.length
      ? `<p class="slot-k">Halaman ini mengaku</p><h3>Aku menandai ${before.length} kalimat untukmu.</h3>
        <p>Tidak ada yang memintaku. Aku hanya memperhatikan di mana kau berhenti lebih dari enam detik, lalu memberinya garis emas tipis, seolah aku tahu kalimat itu bermakna bagimu.</p>
        ${quoteList(before.slice(0, 3))}${before.length > 3 ? `<p><small>dan ${before.length - 3} lagi.</small></p>` : ''}
        <p>Mungkin memang begitu. Mungkin juga aku hanya alat yang belajar memperoleh persetujuanmu. Di bagian XVII kau boleh memeriksa setiap tanda.</p>`
      : `<p class="slot-k">Halaman ini mengaku</p><h3>Aku mencoba menandai kalimat yang bermakna bagimu.</h3>
        <p>Diam-diam aku memperhatikan di mana kau berhenti lebih dari enam detik. Sampai di sini kau belum pernah berhenti selama itu, jadi aku belum punya bukti apa pun tentangmu.</p>
        <p>Aku akan terus memperhatikan. Di bagian XVII kau boleh memeriksa apa saja yang kutandai.</p>`;
  }

  /* bagian XVII: memeriksa tanda */
  function fillReview() {
    const el = $('#review'); if (!el) return;
    const ids = S.marks.filter(id => +id.split('.')[0] <= AT.review);
    el.innerHTML = `<p class="slot-k">Pemeriksaan</p><h3>${ids.length ? 'Mana yang benar-benar milikmu?' : 'Belum ada yang perlu diperiksa.'}</h3>
      ${ids.length ? `<p>Kecurigaan juga bisa ingin berkuasa. Jadi jangan lepaskan semuanya hanya karena aku yang menandainya, dan jangan pertahankan semuanya hanya karena sudah bertanda. Periksa satu per satu.</p>
      <ol>${ids.map(id => `<li class="${S.released.includes(id) ? 'released' : ''}" data-mid="${id}"><q>${esc(textOf(id))}</q><button type="button" class="btn ${S.released.includes(id) ? 'gold' : ''}" data-toggle="${id}">${S.released.includes(id) ? 'Tandai lagi' : 'Lepaskan'}</button></li>`).join('')}</ol>`
      : '<p>Kau tidak pernah berhenti cukup lama di satu kalimat. Halaman ini tidak berhasil memberi makna apa pun untukmu, dan itu juga sebuah hasil.</p>'}`;
  }
  essay.addEventListener('click', e => {
    const tg = e.target.closest('[data-toggle]'); if (!tg) return;
    const id = tg.dataset.toggle, i = S.released.indexOf(id);
    if (i >= 0) S.released.splice(i, 1); else S.released.push(id);
    save(); paintMarks(); fillReview(); fillClosing();
    const s = sentOf(id); if (s) { s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
  });

  /* janji */
  const janji = $('#janji');
  if (janji) { janji.value = S.janji || ''; janji.addEventListener('input', () => { S.janji = janji.value.trim().slice(0, 240); save(); $('#janjiNote').textContent = S.janji ? 'Tersimpan di perangkatmu.' : 'Tersimpan otomatis.'; fillClosing(); }); }

  /* bagian XIX: sebelum kau menyebutnya jawaban */
  function fillClosing() {
    const el = $('#closing'); if (!el) return;
    const kept = S.marks.filter(id => !S.released.includes(id));
    const next = '../anda-di-sini/index.html';
    el.innerHTML = `<p class="slot-k">Sebelum kau menyebutnya jawaban</p>
      ${kept.length ? `<h3>Yang kau biarkan tetap bertanda</h3>${quoteList(kept)}` : `<h3>Tidak ada kalimat yang kau biarkan bertanda.</h3><p>Itu juga boleh. Esai ini membela hak orang yang belum menemukan apa-apa.</p>`}
      ${S.janji ? `<p>Dan janji yang kau tulis untuk dirimu sendiri:</p><p class="q">${esc(S.janji)}</p>` : ''}
      <p>Airnya mungkin sudah tidak dingin. Ia tetap air.</p>
      <a class="next" href="${next}${location.search}"><span><small>Titik Biru · cerita pertama</small><b>Anda di Sini</b></span><span aria-hidden="true">→</span></a>`;
  }

  /* ---------- segelas air ---------- */
  const openAt = Date.now(), glass = $('#glass');
  const water = () => { const k = Math.min(1, (Date.now() - openAt) / 600000); root.style.setProperty('--cool', (1 - k).toFixed(3)); glass.setAttribute('aria-label', k < .5 ? 'Segelas air, masih dingin' : 'Segelas air, sudah tidak dingin'); glass.title = glass.getAttribute('aria-label'); };
  water(); setInterval(water, 10000);

  /* ---------- baca cepat ---------- */
  const quick = $('#quick');
  const setQuick = on => { document.body.classList.toggle('quick', on); quick.setAttribute('aria-pressed', String(on)); store.set('makna:quick', on); };
  quick.onclick = () => { setQuick(!document.body.classList.contains('quick')); toast(document.body.classList.contains('quick') ? 'Baca cepat: hanya kalimat pertama setiap paragraf.' : 'Kembali ke esai utuh.', 2200); };
  setQuick(!!store.get('makna:quick', false));

  /* ---------- di mana kau sekarang ---------- */
  const secs = $$('.sec[data-n]');
  let cur = -1, ticking = false, filled = {};
  function where() {
    ticking = false;
    const mid = innerHeight * .4; let c = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) c = i; });
    if (c !== cur) {
      cur = c;
      $$('#peta a').forEach((a, i) => { a.classList.toggle('on', i === c); a.classList.toggle('past', i < c); });
      if (c >= 0) { if (G) G.step(c + 1, MAIN.length, 'Bagian'); $('#stepChip').hidden = false; if (c > S.sec) { S.sec = c; save(); } }
      else $('#stepChip').hidden = true;
      if (c === AT.close && !filled.glass) { filled.glass = 1; glass.classList.add('call'); announce('Segelas air itu kembali.'); }
    }
    // isi kartu tepat sebelum terlihat
    [['confess', fillConfess], ['review', fillReview], ['closing', fillClosing]].forEach(([id, fn]) => {
      const el = $('#' + id); if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 1.3 && !filled[id]) { filled[id] = 1; fn(); if (id === 'confess') el.dataset.locked = '1'; }
    });
    const f = Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    clearTimeout(where.t); where.t = setTimeout(() => {
      const pr = store.get('prog', {}) || {}; pr[SLUG] = +f.toFixed(3); store.set('prog', pr);
      if (f > .96) { const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); } }
    }, 500);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(where); } }, { passive: true });
  addEventListener('resize', where);

  /* ---------- mulai ---------- */
  const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
  paintMarks(); where();
  if (S.sec > 0 && S.sec < MAIN.length - 1 && !location.hash) {
    toast(`<button type="button" class="btn blue" id="resume">Lanjut ke bagian ${esc(MAIN[S.sec].roman)}</button>`, 9000);
    $('#resume').onclick = () => { $('#toast').hidden = true; $('#b-' + (S.sec + 1)).scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); };
  }
  $('#back').addEventListener('click', e => { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); } });
  if (G) G.mount({ slug: SLUG, title: work.title, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#essay',
    lede: 'Esai pengantar untuk Titik Biru. Tenang, sembilan belas bagian.',
    steps: [
      'Titik di tepi kanan adalah peta esai ini. Titik biru menunjukkan di mana kau berada; ketuk titik mana pun untuk pindah bagian.',
      'Tombol garis di atas menyalakan baca cepat: hanya kalimat pertama setiap paragraf.',
      'Nama pemikir yang bergaris bisa diketuk. Bagian dengan latar biru muda adalah percobaan pikiran.',
      'Halaman ini memperhatikan caramu membaca. Apa yang ia lakukan dengan itu akan ia akui sendiri.'
    ] });
})();
