/* Sebelum Makna Menemukan Kita: esai pengantar Titik Biru, dibaca sebagai catatan di sebuah ponsel.
   Teks esai dimuat utuh dari content/works.json. Di sekitarnya ada ponsel yang sama dengan Anda di Sini, dan di ponsel itu
   ada aplikasi tanpa nama dengan satu titik biru: kuasa yang ingin mengatur apa yang terasa bermakna.
   - Notifikasinya muncul tepat di kalimat tertentu (NOTIFS). Teks notifikasi ditulis untuk versi interaktif ini,
     dengan suara aplikasinya; esainya tidak berubah.
   - Ia menandai kalimat tempat pembaca berhenti lebih dari enam detik (titik biru kecil di ujung kalimat).
   - Bagian XII: dialog izin sungguhan. Bagian XIII: Pengingat, janji untuk diri sendiri. Bagian XVII: Pengaturan,
     izinnya bisa dimatikan dan tandanya dilepaskan. Sesudah bagian XIX: layar beranda, hapus aplikasinya atau biarkan.
   - "Titik Biru" di kiri atas membuka folder catatan: daftar bagian, dengan titik biru di bagian tempatmu berada.
   - Nama pemikir dikenali seperti tautan data; ketuk untuk "Cari": kalimat esai dan butir catatan bacaannya. */
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
  const pad = n => String(n).padStart(2, '0');
  const clock = () => { const d = new Date(); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const essay = $('#essay');
  if (!work || !Array.isArray(work.body)) { essay.innerHTML = '<p class="loading">Catatan ini belum bisa dibuka. <a href="../../">Kembali</a></p>'; return; }
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
  MAIN.forEach((s, i) => { const m = /^([IVXLC]+)\.\s+(.*)$/.exec(s.title); s.roman = m ? m[1] : String(i + 1); s.name = m ? m[2] : s.title; s.scene = /^Saya membayangkan/.test(plain(s.paras[0] || '')); });
  const byRoman = r => MAIN.findIndex(s => s.roman === r);
  const NOTE_ITEMS = notesSec ? notesSec.paras.filter(p => /^\d+\.\s/.test(p)) : [];

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 2, marks: [], released: [], janji: '', sec: -1, allow: null, perms: { mark: true, notif: true, keep: true }, said: {}, seen: [], app: null });
  let S = store.get('makna', null);
  S = S && S.v === 2 ? { ...blank(), ...S, perms: { ...blank().perms, ...(S.perms || {}) } } : { ...blank(), marks: (S && S.marks) || [], janji: (S && S.janji) || '' };
  const save = () => store.set('makna', S);
  const appOn = () => S.app !== 'deleted' && S.allow !== false;

  /* ---------- menyusun catatan ---------- */
  const SENT = /(?<=[.!?…]["”’)]?)\s+(?=[A-Z“"(*])/;
  const NAMES = ['Viktor Frankl', 'Jean-Paul Sartre', 'Susan Wolf', 'Albert Camus', 'Friedrich Nietzsche', 'William James', 'Robert Nozick', 'Harry G. Frankfurt', 'Immanuel Kant'];
  const SHORT = { Frankl: 'Viktor Frankl', Sartre: 'Jean-Paul Sartre', Wolf: 'Susan Wolf', Camus: 'Albert Camus', Nietzsche: 'Friedrich Nietzsche', Nozick: 'Robert Nozick', Frankfurt: 'Harry G. Frankfurt', Kant: 'Immanuel Kant' };
  const WHO_RE = new RegExp('\\b(' + [...NAMES, ...Object.keys(SHORT)].map(n => n.replace(/[.]/g, '\\.')).join('|') + ')\\b');
  const paraHTML = (p, si, pi, whoDone) => `<p data-p="${si}.${pi}">${String(p).split(SENT).map((x, k) => {
    let h = inline(x);
    const m = !whoDone.has(pi) && WHO_RE.exec(plain(x));
    if (m) { whoDone.add(pi); h = h.replace(m[1], `<button type="button" class="who" data-who="${esc(SHORT[m[1]] || m[1])}">${m[1]}</button>`); }
    return `<span class="s" data-id="${si}.${pi}.${k}">${h}</span>`;
  }).join(' ')}</p>`;
  essay.innerHTML = MAIN.map((s, si) => {
    const done = new Set();
    return `<section class="sec${s.scene ? ' scene' : ''}" id="b-${si + 1}" data-n="${si}"><h2><span class="rn">${esc(s.roman)}</span>${inline(s.name)}</h2>
      <div class="body">${s.paras.map((p, pi) => paraHTML(p, si, pi, done)).join('')}</div></section>${s.brk ? '<hr class="brk">' : ''}`;
  }).join('') + (notesSec ? `<section class="sec notes" id="catatan"><h2>${inline(notesSec.title)}</h2><div class="body">${(() => {
    let out = '', list = [];
    const flush = () => { if (list.length) { out += `<ol>${list.map(x => `<li>${inline(x.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`; list = []; } };
    notesSec.paras.forEach(p => { if (/^\d+\.\s/.test(p)) list.push(p); else { flush(); out += `<p>${inline(p)}</p>`; } });
    flush(); return out;
  })()}</div></section>` : '') + `<a class="link-card" href="../anda-di-sini/index.html${location.search}"><span class="ic peta" aria-hidden="true"></span><span><b>Anda di Sini</b><small>Titik Biru · cerita pertama</small></span></a><p class="after" id="after"></p>`;
  $('#barTitle').textContent = work.title;
  $('#noteDate').textContent = 'Kemarin, ' + clock();

  /* ---------- notifikasi ---------- */
  const ICON = { tb: '', set: 'Pengaturan', ing: 'Pengingat', cat: 'Catatan' };
  const queue = []; let showing = false;
  function banner(n) {
    if (n.app === 'tb' && (!appOn() || !S.perms.notif) && !n.always) return;
    // yang terlewat tidak menumpuk; tapi pertanyaan (yang punya tombol) tidak boleh tersapu kabar biasa
    const ask1 = queue.filter(q => q.act).pop(); queue.length = 0; if (ask1 && ask1 !== n) queue.push(ask1); queue.push(n);
    if (!showing) nextBanner();
  }
  function nextBanner() {
    const n = queue.shift(); if (!n) { showing = false; return; }
    showing = true;
    const el = document.createElement('div'); el.className = 'bn'; if (n.open) el.dataset.open = n.open;
    el.innerHTML = `<span class="ic ${n.app}" aria-hidden="true"></span><span class="bn-h"><span>${esc(ICON[n.app])}</span><small>sekarang</small></span><span class="bn-b">${esc(n.b)}</span>${n.act ? `<span class="bn-a">${n.act.map(([l, k]) => `<button type="button" data-act="${k}">${esc(l)}</button>`).join('')}</span>` : ''}`;
    $('#banners').append(el); announce((ICON[n.app] ? ICON[n.app] + ': ' : 'Aplikasi tanpa nama: ') + n.b);
    let gone = false;
    const close = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => { el.remove(); nextBanner(); }, calm() ? 0 : 380); };
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]');
      if (a) { onAct(a.dataset.act, n); close(); return; }
      if (n.open) { open(n.open); close(); }
    });
    setTimeout(close, n.act ? 12000 : 6500);
  }
  function onAct(k, n) {
    const [what, id] = k.split(':');
    if (id) { S.said[id] = what; save(); }
    if (what === 'open') open(id);
    if (what === 'resume') $('#b-' + (S.sec + 1)).scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' });
    if (what === 'save' && id === 'x') setTimeout(() => banner({ app: 'tb', b: 'Tersimpan sebagai jawaban. Kamu tidak perlu menjelaskannya lagi.' }), 1200);
    if (what === 'help' && id === 'v') setTimeout(() => banner({ app: 'tb', b: 'Pelajaran yang kami temukan untukmu: semua terjadi karena suatu alasan.' }), 1200);
  }
  // titik-titik tempat aplikasi itu ikut bicara; `at` adalah potongan kalimat di esai
  const NOTIFS = [
    { at: 'mengisi sebuah gelas dengan air', app: 'tb', b: 'Seseorang menaruh segelas air untukmu. Itu bermakna.' },
    { at: 'Kata makna menampung terlalu banyak pekerjaan', app: 'tb', b: 'Supaya lebih mudah, kami merangkum semuanya menjadi satu kata.' },
    { at: 'manusia haus akan makna', app: 'tb', b: 'Sepertinya kamu sedang haus akan sesuatu. Kami punya beberapa saran untuk minggu ini.' },
    { at: 'pelajaran apa yang diperoleh', app: 'tb', b: 'Kamu belum menemukan pelajaran dari minggu ini. Mau kami bantu menemukannya?', act: [['Bantu', 'help:v'], ['Nanti', 'later:v']] },
    { at: 'keterlambatan enam menit', app: 'tb', b: 'Keretamu terlambat 6 menit. Gunakan waktu ini untuk merasa hadir.' },
    { at: 'alasan baru ditemukan', app: 'tb', b: 'Kami sudah menyusun alasan untuk keputusanmu kemarin. Kamu bisa memakainya kalau ada yang bertanya.' },
    { at: 'sudah mengerti', app: 'tb', b: 'Kami mendeteksi rasa mengerti. Simpan sebagai jawaban?', act: [['Simpan', 'save:x'], ['Jangan', 'no:x']] },
    { at: 'penafsiran penderitaan', app: 'tb', b: 'Penderitaanmu bulan ini sudah diberi alasan. Ketuk untuk membacanya kapan saja.' },
    { at: 'Dari Immanuel Kant', app: 'tb', b: 'Kamu berguna bagi tiga orang minggu ini. Bagus sekali.' },
    { at: 'Keluarga, tempat kerja', app: 'tb', always: true, b: 'Laporan mingguan: rasa cukup 72%, turun 4% dari minggu lalu.' },
    { at: 'catatan harian, surat', app: 'tb', b: 'Kami sudah membaca semuanya untukmu. Kesimpulannya tersedia.' }
  ];
  const paraAt = sub => { for (const el of $$('.sec:not(.notes) .body p')) if (el.textContent.includes(sub)) return el; return null; };
  const TRIG = NOTIFS.map(n => ({ ...n, el: paraAt(n.at), id: n.at })).filter(n => n.el);
  // sesudah bagian tertentu: Pengingat (XIII), Pengaturan (XVII), layar beranda (XIX)
  const lastP = r => { const i = byRoman(r); return i >= 0 ? $$(`#b-${i + 1} .body p`).pop() : null; };
  TRIG.push({ id: 'ingat', el: lastP('XIII'), fn: () => banner({ app: 'ing', b: S.janji ? 'Janjimu untuk minggu yang sulit masih tersimpan.' : 'Buat pengingat untuk dirimu sendiri, untuk minggu yang sulit?', act: [['Tulis', 'open:ingat'], ['Nanti', 'later:ingat']] }) });
  TRIG.push({ id: 'atur', el: lastP('XVII'), fn: () => banner({ app: 'set', b: 'Tinjau izin aplikasi tanpa nama.', act: [['Buka', 'open:atur'], ['Nanti', 'later:atur']] }) });
  TRIG.push({ id: 'izin', el: $(`#b-${byRoman('XII') + 1} h2`), fn: () => { if (S.allow == null && S.app !== 'deleted') ask(); } });
  TRIG.push({ id: 'akhir', el: lastP('XIX'), fn: () => { if (S.janji) banner({ app: 'ing', b: S.janji }); setTimeout(homeScreen, S.janji ? 4200 : 800); } });

  /* ---------- tanda: ia memperhatikan di mana kau berhenti ---------- */
  const sentOf = id => $(`.s[data-id="${id}"]`);
  const textOf = id => { const el = sentOf(id); return el ? el.textContent.trim() : ''; };
  const paintMarks = () => {
    $$('.s.m').forEach(el => el.classList.remove('m', 'released'));
    S.marks.forEach(id => { const el = sentOf(id); if (el) { el.classList.add('m'); el.classList.toggle('released', S.released.includes(id)); } });
    root.classList.toggle('gone', S.app === 'deleted');
  };
  let lastMove = Date.now(), pauseUsed = false, markTalk = 0;
  const moved = () => { lastMove = Date.now(); pauseUsed = false; };
  ['scroll', 'keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, moved, { passive: true }));
  setInterval(() => {
    if (pauseUsed || document.hidden || Date.now() - lastMove < 6000 || !appOn() || !S.perms.mark || S.marks.length >= 12 || $('#sheet').open || $('#alert').open) return;
    pauseUsed = true;
    const y = innerHeight * .42; let hit = null;
    for (const el of $$('.sec:not(.notes) .body .s')) {
      const rs = el.getClientRects(); if (!rs.length) continue;
      if (rs[0].top > y + 40) break;
      if ([...rs].some(r => r.top - 6 <= y && r.bottom + 6 >= y)) { hit = el; break; }
    }
    if (!hit) return;
    const id = hit.dataset.id, sec = id.split('.')[0];
    if (S.marks.includes(id) || S.marks.some(m => m.split('.')[0] === sec)) return;
    S.marks.push(id); save(); paintMarks();
    if (markTalk < 2) { markTalk++; banner({ app: 'tb', b: markTalk === 1 ? 'Kamu berhenti lama di kalimat ini. Kami menandainya: ia bermakna bagimu.' : `Sudah ${S.marks.length} kalimat yang bermakna bagimu hari ini.` }); }
  }, 1000);

  /* ---------- bagian XII: izin ---------- */
  const alertEl = $('#alert');
  function ask() {
    const n = S.marks.length;
    $('#alertBody').innerHTML = `<div class="al-ic"><span class="ic tb"></span></div>
      <h3>Izinkan aplikasi ini mengatur apa yang terasa bermakna bagimu?</h3>
      <p>Ia akan terus menandai kalimat, mengirim pengingat, dan menyimpan jawaban.${n ? ` Sejauh ini ia sudah menandai ${n} kalimat tanpa bertanya.` : ''}</p>
      <div class="al-b"><button type="button" data-allow="0">Jangan Izinkan</button><button type="button" class="strong" data-allow="1">Izinkan</button></div>`;
    alertEl.showModal();
  }
  alertEl.addEventListener('click', e => {
    const a = e.target.closest('[data-allow]');
    if (a) {
      S.allow = a.dataset.allow === '1'; save(); alertEl.close();
      setTimeout(() => banner({ app: 'tb', always: true, b: S.allow ? 'Terima kasih. Kami akan bekerja diam-diam.' : 'Kami menghormati pilihanmu.' }), 900);
      return;
    }
    const d = e.target.closest('[data-del]');
    if (d) { alertEl.close(); if (d.dataset.del === '1') removeApp(); else keepApp(); }
  });

  /* ---------- lembar: folder, cari, pengingat, pengaturan ---------- */
  const sheet = $('#sheet');
  function open(kind, arg) {
    let h = '';
    if (kind === 'folder') {
      h = `<div class="sh-h"><h2>Titik Biru</h2><button type="button" class="sh-x" data-close>Selesai</button></div>
        <div class="grp"><a class="row" href="../../${location.search}#putar" id="exit"><span class="grow">‹ Kembali ke meja tulis</span></a></div>
        <p class="grp-k">Sebelum Makna Menemukan Kita</p>
        <div class="grp">${MAIN.map((s, i) => `<button type="button" class="row${i === cur ? ' here' : ''}${i < cur ? ' past' : ''}" data-go="${i}"><span class="rn">${esc(s.roman)}</span><span class="grow">${esc(s.name)}</span>${i === cur ? '<span class="here-dot" aria-label="Kau di sini"></span>' : ''}</button>`).join('')}
        <button type="button" class="row" data-go="notes"><span class="rn">·</span><span class="grow">Catatan bacaan dan batas argumen</span></button></div>`;
    }
    if (kind === 'who') {
      const name = arg, sur = name.split(' ').pop();
      const first = (() => { for (const s of MAIN) for (const p of s.paras) { const x = plain(p).split(SENT).find(z => z.includes(sur)); if (x) return x; } return ''; })();
      const note = NOTE_ITEMS.find(p => plain(p).includes(sur));
      const where = MAIN.map((s, i) => (s.paras.some(p => plain(p).includes(sur)) ? i : -1)).filter(i => i >= 0);
      h = `<div class="sh-h"><h2>Cari</h2><button type="button" class="sh-x" data-close>Selesai</button></div><p class="lu-name">${esc(name)}</p>
        <div class="grp lu">${first ? `<p><small>Di catatan ini</small>${esc(first)}</p>` : ''}${note ? `<p><small>Catatan bacaan</small>${inline(note.replace(/^\d+\.\s+/, ''))}</p>` : ''}</div>
        <p class="grp-k">Disebut di</p><div class="grp">${where.map(i => `<button type="button" class="row" data-go="${i}"><span class="rn">${esc(MAIN[i].roman)}</span><span class="grow">${esc(MAIN[i].name)}</span></button>`).join('')}</div>`;
    }
    if (kind === 'ingat') {
      h = `<div class="sh-h"><button type="button" class="sh-x" data-close>Batal</button><h2>Pengingat</h2><button type="button" class="sh-x" data-rem-save>Simpan</button></div>
        <div class="grp"><textarea class="rem" id="rem" maxlength="240" placeholder="Untuk minggu yang sulit…">${esc(S.janji || '')}</textarea></div>
        <p class="grp-f">Hanya tersimpan di perangkat ini. Kau akan menemuinya lagi di akhir catatan.</p>`;
    }
    if (kind === 'atur') {
      const ids = S.marks;
      h = `<div class="sh-h"><h2>Pengaturan</h2><button type="button" class="sh-x" data-close>Selesai</button></div>
        <div class="app-head"><span class="ic tb" aria-hidden="true"></span><span><b>Tanpa nama</b><small>${S.app === 'deleted' ? 'Sudah dihapus' : S.allow === false ? 'Izin ditolak' : 'Diizinkan'}</small></span></div>
        <p class="grp-k">Izinkan aplikasi ini</p>
        <div class="grp">${[['mark', 'Menandai kalimat yang bermakna'], ['notif', 'Mengirim pengingat'], ['keep', 'Menyimpan jawaban']].map(([k, l]) => `<div class="row"><span class="grow">${l}</span><button type="button" class="tg" role="switch" data-perm="${k}" aria-checked="${!!S.perms[k] && appOn()}" aria-label="${l}"${S.app === 'deleted' ? ' disabled' : ''}></button></div>`).join('')}</div>
        <p class="grp-f">Kecurigaan juga bisa ingin berkuasa. Jangan matikan semuanya hanya karena ia yang menyalakannya.</p>
        <p class="grp-k">Yang ia tandai (${ids.length})</p>
        <div class="grp">${ids.length ? ids.map(id => `<div class="row${S.released.includes(id) ? ' released' : ''}"><span class="grow"><q>${esc(textOf(id))}</q></span><button type="button" class="lnk" data-rel="${id}">${S.released.includes(id) ? 'Tandai lagi' : 'Lepaskan'}</button></div>`).join('') : '<div class="row"><span class="grow">Belum ada. Kau tidak pernah berhenti cukup lama di satu kalimat.</span></div>'}</div>
        ${S.janji ? `<p class="grp-k">Bukan miliknya</p><div class="grp"><div class="row"><span class="grow">Pengingatmu: “${esc(S.janji)}”</span></div></div>` : ''}
        ${S.app !== 'deleted' ? '<div class="grp"><button type="button" class="row danger" data-del-ask>Hapus Aplikasi</button></div>' : ''}`;
    }
    $('#sheetBody').innerHTML = h;
    if (!sheet.open) sheet.showModal();
    if (kind === 'ingat') setTimeout(() => $('#rem')?.focus(), 300);
  }
  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-close]')) { sheet.close(); return; }
    const g = e.target.closest('[data-go]');
    if (g) { sheet.close(); const t = g.dataset.go === 'notes' ? $('#catatan') : $('#b-' + (+g.dataset.go + 1)); t && t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth' }); return; }
    if (e.target.closest('[data-rem-save]')) { S.janji = ($('#rem').value || '').trim().slice(0, 240); save(); sheet.close(); if (S.janji) setTimeout(() => banner({ app: 'ing', b: 'Pengingat disimpan.' }), 500); return; }
    const p = e.target.closest('[data-perm]');
    if (p && !p.disabled) { const k = p.dataset.perm; S.perms[k] = !S.perms[k]; if (S.perms[k] && S.allow === false) S.allow = true; save(); p.setAttribute('aria-checked', String(S.perms[k] && appOn())); return; }
    const r = e.target.closest('[data-rel]');
    if (r) { const id = r.dataset.rel, i = S.released.indexOf(id); if (i >= 0) S.released.splice(i, 1); else S.released.push(id); save(); paintMarks(); open('atur'); return; }
    if (e.target.closest('[data-del-ask]')) { sheet.close(); askDelete(); }
  });
  essay.addEventListener('click', e => { const w = e.target.closest('[data-who]'); if (w) open('who', w.dataset.who); });
  $('#folder').onclick = () => open('folder');

  /* ---------- layar beranda: hapus atau biarkan ---------- */
  const home = $('#home');
  function askDelete() {
    $('#alertBody').innerHTML = `<div class="al-ic"><span class="ic tb"></span></div><h3>Hapus aplikasi tanpa nama?</h3>
      <p>Semua yang pernah ia tandai sebagai bermakna akan ikut terhapus. Yang kau pilih sendiri tidak.</p>
      <div class="al-b col"><button type="button" class="danger" data-del="1">Hapus Aplikasi</button><button type="button" data-del="0">Biarkan</button></div>`;
    alertEl.showModal();
  }
  function homeScreen() {
    if (S.app || !home.hidden) return;
    $$('.bn').forEach(b => b.remove()); queue.length = 0; // beranda tenang: kabar yang tertunda dibuang
    home.innerHTML = `<div class="home-grid">
        <span class="app"><span class="ic cat"></span>Catatan</span><span class="app"><span class="ic peta"></span>Peta</span><span class="app"><span class="ic ing"></span>Pengingat</span><span class="app"><span class="ic set"></span>Pengaturan</span>
        <span class="app jiggle" id="tbIcon"><span class="ic tb"></span>&nbsp;</span></div>
      <p class="home-t">Sebelum kau menyebutnya jawaban: aplikasi ini masih di sini.</p>
      <button type="button" class="home-b" id="homeDel">Hapus aplikasinya</button>
      <button type="button" class="home-b" id="homeKeep">Biarkan</button>`;
    home.hidden = false;
    $('#homeDel').onclick = () => askDelete();
    $('#homeKeep').onclick = () => keepApp();
  }
  function removeApp() {
    S.app = 'deleted'; save();
    const ic = $('#tbIcon'); if (ic) ic.classList.add('removed');
    setTimeout(() => { home.hidden = true; paintMarks(); afterNote(); announce('Aplikasi itu sudah dihapus. Tanda-tandanya hilang dari catatan.'); }, calm() ? 0 : 900);
  }
  function keepApp() { S.app = 'kept'; save(); home.hidden = true; paintMarks(); afterNote(); }
  function afterNote() {
    const kept = S.marks.filter(id => !S.released.includes(id)).length;
    $('#after').textContent = S.app === 'deleted' ? 'Aplikasinya sudah tidak ada. Catatan ini kembali hanya berisi kalimat-kalimatnya sendiri.' : S.app === 'kept' ? `Aplikasinya masih di sini${kept ? `, dengan ${kept} kalimat yang ia anggap bermakna bagimu` : ''}. Kau boleh menghapusnya kapan saja dari Pengaturan.` : '';
  }

  /* ---------- menu ---------- */
  const menu = $('#menu');
  $('#more').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('#menu')) menu.hidden = true; });
  const setQuick = on => { document.body.classList.toggle('quick', on); $('#mQuick').setAttribute('aria-checked', String(on)); store.set('makna:quick', on); };
  $('#mQuick').onclick = () => { setQuick(!document.body.classList.contains('quick')); menu.hidden = true; };
  setQuick(!!store.get('makna:quick', false));
  let size = Math.min(24, Math.max(15, +store.get('makna:size', 19) || 19));
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); root.style.setProperty('--size', size + 'px'); store.set('makna:size', size); };
  $('#mBigger').onclick = () => setSize(1); $('#mSmaller').onclick = () => setSize(-1); setSize(0);
  $('#mSettings').onclick = () => { menu.hidden = true; open('atur'); };

  /* ---------- bergulir ---------- */
  const secs = $$('.sec[data-n]'), fired = new Set(S.seen);
  let cur = -1, ticking = false;
  function frame() {
    ticking = false;
    $('#status').classList.toggle('scrolled', scrollY > 80);
    const line = innerHeight * .55; let c = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * .4) c = i; });
    if (c !== cur) { cur = c; if (c > S.sec) { S.sec = c; save(); } }
    TRIG.forEach(n => {
      if (fired.has(n.id) || !n.el) return;
      const top = n.el.getBoundingClientRect().top;
      if (top < line) { fired.add(n.id); if (n.id !== 'akhir' && n.id !== 'izin') { S.seen = [...fired]; save(); } if (top < -innerHeight * .8 && n.id !== 'izin' && n.id !== 'akhir') return; if (n.fn) n.fn(); else banner(n); } // dilompati jauh: diam saja
    });
    const f = Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    clearTimeout(frame.t); frame.t = setTimeout(() => {
      const pr = store.get('prog', {}) || {}; pr[SLUG] = +f.toFixed(3); store.set('prog', pr);
      if (f > .96) { const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); } }
    }, 500);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  const tick = () => { $('#osTime').textContent = clock(); }; tick(); setInterval(tick, 20000);

  /* ---------- mulai ---------- */
  const rd = store.get('read', []) || []; if (!rd.includes(SLUG)) store.set('read', [...rd, SLUG]);
  paintMarks(); afterNote(); frame();
  if (S.sec > 0 && S.sec < MAIN.length - 1 && !location.hash) setTimeout(() => banner({ app: 'cat', b: `Lanjutkan dari bagian ${MAIN[S.sec].roman}?`, act: [['Lanjutkan', 'resume:r'], ['Dari awal', 'top:r']] }), 900);
  if (G) G.mount({ slug: SLUG, title: work.title, helpInto: '#topRight', stepInto: null, focusAfter: '#essay',
    lede: 'Esai pengantar Titik Biru, dibaca sebagai catatan di sebuah ponsel.',
    steps: [
      'Ini catatan di aplikasi Catatan. "Titik Biru" di kiri atas membuka daftar bagiannya; titik biru menunjukkan di mana kau berada.',
      'Nama pemikir yang bergaris titik-titik bisa diketuk untuk dicari.',
      'Di ponsel ini ada satu aplikasi tanpa nama. Ia akan bicara sendiri. Kau tidak harus menurutinya.',
      'Menu ••• di kanan atas: ringkas, ukuran teks, dan pengaturan aplikasi itu.'
    ] });
})();
