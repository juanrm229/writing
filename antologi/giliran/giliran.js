/* Giliran: cerita tentang orang yang dibayar untuk memerankan lawan bicara.
   Yang diucapkan muncul sebagai balon kata di ruang tempat ia diucapkan; yang diketik muncul di aplikasinya
   (Sela dengan jendela Latihan dan Pendamping, pesan di ponsel, telepon dengan teks langsung, surel).
   Kalimat yang hampir diucapkan tapi ditahan menjadi balon bergaris putus-putus yang kosong.
   Teks cerita dimuat utuh dari content/works.json; yang ditambahkan hanya antarmukanya. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'giliran:place', 'giliran:choice'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    // pratinjau dari admin tidak menulis riwayat pembaca; pengaturan baca tetap diingat
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'giliran', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => motionQ.matches || root.hasAttribute('data-calm');
  const wait = ms => new Promise(r => setTimeout(r, calm() ? 0 : ms));
  root.lang = t('id', 'en');
  root.toggleAttribute('data-calm', !!store.get('giliran:calm', false));

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work || !hasText(work.body)) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; return; }
  const tr = (EN && work.lang !== 'en' ? work.en : !EN && work.lang === 'en' ? work.id : null) || {};
  const lost = (EN ? work.lang !== 'en' : work.lang === 'en') && !hasText(tr.body);
  const body = (hasText(tr.body) ? tr.body : work.body).map(p => String(p));
  const title = tr.title || work.title;
  document.title = `${title} · Quiet Margins`;
  $('#title').textContent = title;
  $('#kick').textContent = t('Temusai · Cerpen', 'Temusai · Short story');
  $('#lgSpoken').textContent = t('Diucapkan', 'Spoken');
  $('#lgTyped').textContent = t('Diketik', 'Typed');
  $('#lgUnsaid').textContent = t('Tidak jadi diucapkan', 'Left unsaid');
  $('#legend').setAttribute('aria-label', t('Cara membaca', 'How to read'));
  if (lost) { $('#lost').hidden = false; $('#lost').textContent = t('Cerita ini belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.', 'This story is not translated yet, so it is shown in the original language.'); }

  /* ---------- peta cerita ----------
     Lima belas bagian, dipisah ---. Untuk setiap paragraf yang berisi ucapan, VOICES menyebut di mana ucapan itu terjadi
     dan siapa yang bicara, berurutan: h rumah (balon kata), k kenangan masa kecil, c jendela Pendamping di Sela,
     r catatan pelatihan, w pesan di ponsel, t dan u telepon. B Bima, M Mira, K Kaca, C klien, R Ratih, I Ibu, b Bima kecil.
     Peta ini dipakai hanya kalau susunan naskahnya masih sama; kalau naskah diubah di admin, cerita tetap tampil utuh
     sebagai narasi dan balon biasa. */
  const EXPECT = [27, 24, 13, 11, 16, 22, 18, 14, 15, 19, 22, 28, 43, 19, 29];
  const VOICES = [
    'c:B c:C c:B r:R r:B r:R', 'h:B h:M h:B h:M h:M h:B h:M h:B h:M h:B h:B h:M h:B h:M h:B h:M', 'c:K c:K c:B c:K', 'k:b k:b',
    'c:K c:B h:B h:M h:B h:M', 'c:K c:B c:K c:B h:B h:M h:B h:M h:M h:B h:B h:M', '', 'h:M h:B h:M h:B h:B h:B h:M h:B', '',
    'w:M h:B h:M h:B h:B h:M h:B h:M h:M', 'c:K', 't:R t:B t:R t:B t:R t:B t:R t:B t:R t:R t:R u:B u:M u:B u:M u:B',
    'h:M h:B h:M h:B h:M h:B h:B h:M h:M h:B h:M h:M h:B h:M h:B h:M h:B h:B h:M h:B h:B h:M h:M',
    't:I t:B t:B t:I t:B t:I t:B t:I t:B t:I', 'h:M h:M h:B h:M h:B h:M h:B h:M h:M h:B h:M h:B'
  ].map(s => s.split(' ').filter(Boolean));
  const NAMES = { B: 'Bima', b: 'Bima', M: 'Mira', K: 'Kaca', C: t('Klien', 'Client'), R: 'Ratih', I: t('Ibu', 'Mom') };
  const scenes = [[]];
  body.forEach((p, i) => { if (/^\s*-{3,}\s*$/.test(p)) scenes.push([]); else scenes[scenes.length - 1].push(i); });
  const ALIGNED = scenes.length === EXPECT.length && scenes.every((s, k) => s.length === EXPECT[k]);
  // tanda-tanda yang hanya berlaku bila susunannya sama (nomor paragraf di naskah)
  const AT = ALIGNED ? {
    photo: 4, zoom: 6, rating: 8, review: 12, booking: 18, trait: 20, waitLong: 65, recognized: 125, notice: 127, handbook: 130,
    gate: 134, gateMsg: 135, form: 153, schedule: 154, tabs: 156, unrole: 157, silence: 192, dim: 199, search: 204, searchClosed: 205,
    sunday: 207, minimize: 208, sent: 215, complicit: 216, sealed: 229, paper: 272, email: 302, noCoach: 326, stumble: 332,
    msg: { 104: 'late', 169: 'soap', 170: 'reply', 285: 'medicine', 305: 'sunday' }
  } : { msg: {} };
  const UNSAID = ALIGNED ? new Set([46, 93, 147, 148, 161, 173, 184, 203, 258, 271, 321]) : new Set();
  const MEMORY_SCENE = ALIGNED ? 3 : -1;

  /* ---------- membangun cerita ---------- */
  const NAME_CH = { PENDAMPING: 'coach', COACH: 'coach', PEMERAN: 'role', ACTOR: 'role' };
  let lastCh = 'coach', unroled = false, recognized = false, sceneNo = 0, voiceAt = 0;
  let open = null; // wadah yang sedang terbuka: { kind, el, list }
  let seen = new Set(); // aplikasi dan orang yang sudah tampil di bagian ini: berikutnya jadi lanjutan, bukan jendela baru
  const out = [];
  const html = s => { const d = document.createElement('div'); d.innerHTML = s.trim(); return d.firstElementChild; };
  const push = el => { out.push(el); return el; };
  const closeBox = () => { open = null; };
  const typingRow = '<div class="typing" aria-hidden="true"><i></i><i></i><i></i></div>';

  // jendela Sela: dua tab, Latihan dan Pendamping; yang aktif mengikuti pesan terakhir
  function selaBox(ch, label) {
    if (open && open.kind === 'sela') { open.el.dataset.ch = ch; return open; }
    const client = !!label && label !== 'Kaca';
    const el = push(html(`<section class="win sela" data-ch="${ch}" data-pair="${client ? 'C' : 'K'}" aria-label="Sela">
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">${esc(label || 'Kaca')}</span></header>
      <nav class="w-tabs" aria-hidden="true"><span data-tab="role">${t('Latihan', 'Rehearsal')}</span><span data-tab="coach">${t('Pendamping', 'Coaching')}</span></nav>
      <div class="w-list"></div></section>`));
    open = { kind: 'sela', el, list: $('.w-list', el) };
    cont(el, 'sela' + (client ? 'C' : 'K'));
    return open;
  }
  function cont(el, key) { if (seen.has(key)) el.classList.add('cont'); seen.add(key); }
  function phoneBox(kind, who) {
    if (open && open.kind === kind && open.who === who) return open;
    const call = kind === 'call';
    const status = call ? (who === 'M' ? t('Memanggil…', 'Calling…') : t('Panggilan masuk', 'Incoming call')) : t('Pesan', 'Messages');
    const el = push(html(`<section class="win phone ${call ? 'call' : 'chat'}" data-who="${who}" aria-label="${esc(NAMES[who])}">
      <header class="p-bar"><span class="av av-${who}" aria-hidden="true">${esc(NAMES[who][0])}</span><span class="p-name"><b>${esc(NAMES[who])}</b><small class="p-status">${status}</small></span>${call ? '<span class="p-timer">00.00</span>' : ''}</header>
      ${call ? `<p class="p-cap" aria-hidden="true">${t('Teks langsung', 'Live captions')}</p>` : ''}
      <div class="w-list"></div></section>`));
    open = { kind, who, el, list: $('.w-list', el) };
    cont(el, kind + who);
    if (call && el.classList.contains('cont')) $('.p-status', el).textContent = t('Masih tersambung', 'Still on the call');
    return open;
  }
  function reviewBox() {
    if (open && open.kind === 'review') return open;
    const el = push(html(`<section class="win review" aria-label="${t('Catatan pelatihan', 'Training notes')}">
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">${t('Catatan pelatihan · 3 transkrip dikembalikan', 'Training notes · 3 transcripts returned')}</span></header>
      <div class="w-list"></div></section>`));
    open = { kind: 'review', el, list: $('.w-list', el) };
    return open;
  }
  // satu pesan atau satu baris teks: who menentukan sisi; label nama pengirim untuk Sela
  function message(box, who, textHtml, o = {}) {
    const mine = who === 'B' || who === 'b';
    const label = o.label ? `<span class="m-label">${o.label}</span>` : '';
    const el = html(`<div class="m ${mine ? 'out' : 'in'} who-${who}${o.cls ? ' ' + o.cls : ''}"${o.wait ? ` data-wait="${o.wait}"` : ''}${o.para != null ? ` data-p="${o.para}"` : ''}>${label}<div class="m-b">${textHtml}</div>${o.tag ? `<span class="m-tag">${o.tag}</span>` : ''}</div>`);
    box.list.append(el);
    return el;
  }
  const redacted = n => `<span class="redact" aria-label="${t('pesan tidak dikutip', 'message not quoted')}">${Array.from({ length: n }, (_, k) => `<i style="--w:${[78, 54, 66, 40][k % 4]}%"></i>`).join('')}</span>`;
  const photo = cap => `<span class="ph" role="img" aria-label="${esc(cap)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><circle cx="12" cy="12" r="3.2"/></svg><small>${esc(cap)}</small></span>`;

  // ucapan di paragraf narasi: bagian di dalam “…” menjadi balon/pesan, sisanya keterangan kecil di dekatnya
  function segments(p) {
    const out = []; let last = 0; const re = /“([^”]*)”/g; let m;
    while ((m = re.exec(p))) { if (m.index > last) out.push({ q: false, s: p.slice(last, m.index) }); out.push({ q: true, s: m[1] }); last = re.lastIndex; }
    if (last < p.length) out.push({ q: false, s: p.slice(last) });
    return out.filter(x => x.s.trim());
  }
  // koma penutup di dalam kutipan (“Begini,” katanya) tidak perlu di dalam balon
  const spoken = s => inline(s.replace(/,\s*$/, ''));

  function speech(i, p, token) {
    const [where, who] = token.split(':');
    const segs = segments(p), lead = [];
    while (segs.length && !segs[0].q) lead.push(segs.shift().s);
    if (lead.length) { closeBox(); push(html(`<p class="nar" data-p="${i}">${inline(lead.join(' ').trim())}</p>`)); }
    const quotes = [], tags = [];
    segs.forEach(sg => { if (sg.q) quotes.push({ s: sg.s, tag: '' }); else if (quotes.length) quotes[quotes.length - 1].tag += sg.s; else tags.push(sg.s); });
    if (where === 'h' || where === 'k') {
      closeBox();
      const wrap = push(html(`<div class="talk ${where === 'k' ? 'kid' : ''}" data-p="${i}"></div>`));
      quotes.forEach(q => {
        wrap.append(html(`<div class="balloon ${who === 'B' || who === 'b' ? 'right' : 'left'} who-${who}"><span class="b-name">${esc(where === 'k' ? t('Bima, 9 tahun', 'Bima, nine') : NAMES[who])}</span><p>${spoken(q.s)}</p>${q.tag.trim() ? `<small class="b-tag">${inline(q.tag.trim())}</small>` : ''}</div>`));
      });
      return;
    }
    let box;
    if (where === 'c') { box = selaBox('coach', who === 'C' ? t('Klien · toko bunga', 'Client · flower shop') : 'Kaca'); lastCh = 'coach'; }
    else if (where === 'r') box = reviewBox();
    else if (where === 'w') box = phoneBox('chat', who === 'B' ? 'M' : who);
    else box = phoneBox('call', where === 'u' ? 'M' : scenes.findIndex(s => s.includes(i)) === 13 ? 'I' : 'R');
    const label = where === 'c' ? (who === 'B' ? t('PENDAMPING', 'COACH') : who === 'C' ? t('KLIEN', 'CLIENT') : 'KACA') : where === 't' || where === 'u' ? NAMES[who] : where === 'r' ? NAMES[who] : '';
    quotes.forEach((q, k) => message(box, who, spoken(q.s), { label: esc(label), tag: q.tag.trim() ? inline(q.tag.trim()) : '', para: k ? null : i, cls: recognized && who === 'K' ? 'mira' : '', wait: i === AT.waitLong ? 2600 : 0 }));
  }

  function transcript(i, p) {
    const lines = p.split('\n').map(l => l.replace(/^>\s?/, '').trim()).filter(Boolean).map(l => { const m = l.match(/^\*\*([^*]+?):\*\*\s*(.*)$/); return m ? { name: m[1].trim(), text: m[2] } : { name: '', text: l }; });
    const named = lines.find(l => NAME_CH[l.name.toUpperCase()]);
    const ch = named ? NAME_CH[named.name.toUpperCase()] : lastCh;
    const box = selaBox(ch); lastCh = ch;
    lines.forEach((l, k) => {
      const up = l.name.toUpperCase(), lch = NAME_CH[up] || ch, who = NAME_CH[up] ? 'B' : 'K';
      // sejak latihan kelima Bima tidak lagi memerankan siapa pun: label perannya dicoret
      const label = who === 'B' && lch === 'role' && unroled ? `<s>${esc(l.name)}</s> BIMA` : esc(l.name || 'KACA');
      const el = message(box, who, inline(l.text), { label, para: k ? null : i, cls: `ch-${lch}${recognized && who === 'K' ? ' mira' : ''}`, wait: i === AT.silence + 1 && k === 0 ? 2800 : 0 });
      el.dataset.ch = lch;
    });
  }

  function narration(i, p) {
    closeBox();
    return push(html(`<p class="nar" data-p="${i}">${inline(p)}</p>`));
  }

  /* ---------- tempelan antarmuka di titik-titik tertentu ---------- */
  const W = {};
  W[AT.photo] = () => { const b = selaBox('coach', t('Klien · toko bunga', 'Client · flower shop')); message(b, 'C', photo(t('Foto · ruangan kosong', 'Photo · empty room')), { label: t('KLIEN', 'CLIENT'), cls: 'm-photo' }); };
  W[AT.rating] = () => push(html(`<div class="rating" aria-label="${t('Lima bintang', 'Five stars')}"><small>${t('Penilaian klien', 'Client rating')}</small><span class="stars" aria-hidden="true">${'<i>★</i>'.repeat(5)}</span></div>`));
  W[AT.booking] = () => push(html(`<section class="win sela booking" aria-label="${t('Pesanan baru', 'New booking')}">
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">${t('Pesanan baru · 16.12', 'New booking · 4:12')}</span></header>
      <dl class="form">
        <div class="wide"><dt>${t('Nama samaran klien', 'Client alias')}</dt><dd>Kaca</dd></div>
        <div><dt>${t('Penerima kabar', 'Recipient')}</dt><dd>${t('Pasangan', 'Partner')}</dd></div>
        <div><dt>${t('Lama hubungan', 'Length of relationship')}</dt><dd>${t('Empat tahun', 'Four years')}</dd></div>
        <div class="wide"><dt>${t('Sifat penerima', 'Recipient’s personality')}</dt><dd class="trait" data-p="${AT.trait}">${inline(body[AT.trait] || '')}</dd></div>
        <div class="sk" aria-hidden="true"><dt><i></i></dt><dd><i></i></dd></div><div class="sk" aria-hidden="true"><dt><i></i></dt><dd><i></i></dd></div><div class="sk wide" aria-hidden="true"><dt><i></i></dt><dd><i></i></dd></div>
      </dl></section>`));
  W[AT.review] = () => reviewBox();
  W[AT.notice] = () => push(html(`<div class="notice" role="status"><span class="n-app">Sela</span><b>${t('Klien menunggu tanggapan', 'The client is waiting for a response')}</b></div>`));
  W[AT.handbook] = 'doc';
  W[AT.form] = () => push(html(`<section class="win sela tform" aria-label="${t('Formulir pengalihan kasus', 'Case transfer form')}">
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">${t('Formulir pengalihan kasus', 'Case transfer form')}</span></header>
      <dl class="form"><div><dt>${t('Kasus', 'Case')}</dt><dd>Kaca</dd></div><div class="wide"><dt>${t('Alasan', 'Reason')}</dt><dd class="reason"><span class="caret"></span></dd></div></dl></section>`));
  W[AT.schedule] = () => push(html(`<div class="chip-row"><span class="chip clock">${t('Sesi kelima · 40 menit lagi', 'Fifth session · in 40 minutes')}</span></div>`));
  W[AT.tabs] = () => push(html(`<div class="tabstrip" aria-hidden="true"><span class="on">Sela · Kaca</span><span>${t('Formulir pengalihan kasus', 'Case transfer form')}</span></div>`));
  W[AT.search] = () => push(html(`<div class="tabstrip search" aria-hidden="true"><span>Sela · Kaca</span><span class="on q"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg><i></i></span></div>`));
  W[AT.sunday] = () => push(html(`<div class="chip-row"><span class="chip cal">${t('Minggu · dua hari lagi', 'Sunday · two days away')}</span></div>`));
  W[AT.sent] = () => push(html(`<div class="chip-row"><span class="chip ok">${t('Formulir pengalihan kasus · terkirim', 'Case transfer form · sent')}</span></div>`));
  W[AT.paper] = () => push(html(`<div class="paper" aria-label="${t('Urutan sesi', 'The sessions')}"><p>${t('Sesi keempat · Rabu malam', 'Fourth session · Wednesday night')}</p><p>${t('Sesi kelima', 'Fifth session')}</p><p>${t('Sesi keenam', 'Sixth session')}</p></div>`));
  W[AT.email] = () => push(html(`<section class="win mail" aria-label="${t('Surel', 'Email')}"><header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>${t('Surel', 'Mail')}</b><span class="w-who">Sela</span></header>
      <div class="mail-b"><p class="mail-s"><b>${t('Pemeriksaan kasus', 'Case review')}</b><small>${t('dari', 'from')} Sela</small></p>${redacted(4)}</div></section>`));
  W[AT.noCoach] = () => push(html(`<div class="no-coach"><button type="button" aria-disabled="true">${t('Buka jendela pendamping', 'Open the coaching window')}</button></div>`));
  W[AT.stumble] = () => push(html(`<div class="talk"><div class="balloon right who-B stumble" aria-label="${t('Bima mencoba bicara', 'Bima tries to speak')}"><span class="b-name">Bima</span><p class="st" aria-hidden="true"><i></i><i></i><i></i></p></div></div>`));
  const MSG = {
    late: () => { const b = phoneBox('chat', 'M'); message(b, 'M', redacted(1)); message(b, 'B', '<span class="emoji" role="img" aria-label="' + t('ibu jari', 'thumbs up') + '">👍</span>'); },
    soap: () => { const b = phoneBox('chat', 'M'); message(b, 'M', photo(t('Foto · dua sabun cuci', 'Photo · two detergents')), { cls: 'm-photo' }); message(b, 'M', redacted(1)); },
    reply: () => { const b = phoneBox('chat', 'M'); message(b, 'B', redacted(2)); },
    medicine: () => { const b = phoneBox('chat', 'I'); message(b, 'I', photo(t('Foto · bungkus obat', 'Photo · medicine packet')), { cls: 'm-photo' }); },
    sunday: () => { const b = phoneBox('chat', 'M'); message(b, 'M', redacted(2)); message(b, 'B', redacted(1)); message(b, 'M', redacted(1)); }
  };

  scenes.forEach((idxs, s) => {
    sceneNo = s; voiceAt = 0; seen = new Set();
    const voices = ALIGNED ? VOICES[s] : [];
    if (s > 0) { closeBox(); push(html(`<div class="break" aria-hidden="true"><span></span></div>`)); }
    const start = out.length;
    idxs.forEach(i => {
      const p = body[i];
      if (i === AT.recognized) recognized = true;
      if (i === AT.unrole) unroled = true;
      if (i === AT.trait) return; // ditampilkan di kartu pesanan
      if (i === AT.gate + 1) push(html('<div class="gate-mark"></div>'));
      if (p.trim().startsWith('>')) { transcript(i, p); return; }
      if (p.includes('“')) {
        const token = voices[voiceAt++] || (/\b(kata|tanya|said|asked)\s+Mira\b/.test(p) ? 'h:M' : 'h:B');
        speech(i, p, token); return;
      }
      const el = narration(i, p);
      if (W[i] === 'doc') el.classList.add('doc'), el.dataset.docTitle = t('Pedoman kerja · Benturan kepentingan', 'Staff handbook · Conflicts of interest');
      else if (W[i]) W[i]();
      if (AT.msg[i]) MSG[AT.msg[i]]();
      if (UNSAID.has(i)) push(html(`<div class="unsaid" aria-hidden="true"><span></span></div>`));
    });
    const sec = document.createElement('section'); sec.className = 'scene' + (s === MEMORY_SCENE ? ' memory' : ''); sec.dataset.s = s + 1;
    out.splice(start).forEach(el => sec.append(el));
    out.push(sec);
  });
  story.innerHTML = '';
  out.forEach(el => story.append(el));
  $('#end').hidden = false;

  /* ---------- giliran sesi keempat: tombol jeda atau kirim ---------- */
  let choice = store.get('giliran:choice', null);
  const gateMark = $('.gate-mark');
  if (gateMark) {
    const rest = [];
    for (let n = gateMark.nextSibling; n; n = n.nextSibling) rest.push(n);
    let later = gateMark.closest('.scene').nextElementSibling; while (later) { rest.push(later); later = later.nextElementSibling; }
    rest.push($('#end'));
    const msgText = (body[AT.gateMsg] || '').replace(/^>\s?\*\*[^*]+:\*\*\s*/, '');
    const gate = html(`<section class="win sela gate" aria-label="${t('Giliranmu', 'Your turn')}">
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">Kaca · ${t('sedang menunggu', 'waiting')}</span></header>
      <div class="g-compose"><span class="g-label">${t('PENDAMPING', 'COACH')}</span><p class="g-text">${inline(msgText)}</p></div>
      <div class="g-act"><button type="button" class="g-pause">${t('Jeda sesi', 'Pause session')}</button><button type="button" class="g-send">${t('Kirim', 'Send')}</button></div>
      <p class="g-hint">${t('Giliranmu. Cerita tidak berjalan sampai salah satu ditekan.', 'Your turn. The story waits until one of them is pressed.')}</p></section>`);
    gateMark.replaceWith(gate);
    const lock = on => rest.forEach(n => { if (n.nodeType === 1) n.toggleAttribute('data-held', on); });
    const resolve = (c, quiet) => {
      choice = c; store.set('giliran:choice', c);
      gate.classList.add('done'); gate.dataset.choice = c;
      $('.g-hint', gate).textContent = c === 'kirim' ? t('Kamu menekan kirim.', 'You pressed send.') : t('Kamu menekan jeda. Di cerita ini, yang ditekan adalah kirim.', 'You pressed pause. In this story, it is send that gets pressed.');
      $$('button', gate).forEach(b => { b.disabled = true; });
      lock(false); G?.want(null);
      if (!quiet) { announce($('.g-hint', gate).textContent); schedule(); }
    };
    if (choice) resolve(choice, true);
    else {
      lock(true);
      G?.want('.g-send', t('Kirim atau jeda', 'Send or pause'));
      $('.g-send', gate).onclick = () => resolve('kirim');
      $('.g-pause', gate).onclick = () => { const d = $('#transferDialog'); d.showModal(); $('#trReason').focus(); };
      const trDone = () => { const d = $('#transferDialog'); if (d.open) d.close(); };
      $('#trSend').onclick = trDone;
      $('#transferDialog').addEventListener('close', () => { if (!choice) resolve('jeda'); });
    }
  }
  $('#transferDialog').addEventListener('click', e => { if (e.target.id === 'transferDialog' || e.target.closest('[data-close]')) e.currentTarget.close(); });
  $('#trTitle').textContent = t('Formulir pengalihan kasus', 'Case transfer form');
  $('#trCaseL').textContent = t('Kasus', 'Case'); $('#trReasonL').textContent = t('Alasan', 'Reason');
  $('#trCancel').textContent = t('Batal', 'Cancel'); $('#trSend').textContent = t('Kirim formulir', 'Send form');

  /* ---------- muncul satu per satu saat terbaca ---------- */
  const announce = s => { $('#announcement').textContent = s; };
  let busy = Promise.resolve();
  const reveal = el => {
    if (el.classList.contains('in') || el.dataset.q) return;
    el.dataset.q = '1';
    const box = el.closest('.win');
    const typed = box && el.classList.contains('m') && !el.classList.contains('out');
    busy = busy.then(async () => {
      if (el.classList.contains('in')) return;
      const above = el.getBoundingClientRect().top < 0;
      if (typed && !above && !calm()) {
        const ty = html(typingRow); el.before(ty);
        await wait(+el.dataset.wait || Math.min(1300, 320 + el.textContent.length * 9));
        ty.remove();
      } else if (!above && box) await wait(160);
      el.classList.add('in');
      if (el.matches('.m, .balloon')) turnFrom(el);
    });
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('.m, .balloon, .unsaid, .rating, .notice, .chip-row, .tabstrip, .paper, .no-coach, .win.booking, .win.tform, .win.mail').forEach(el => { if (calm()) el.classList.add('in'); else io.observe(el); });
  // pesan di atas layar (melompat lewat tautan atau melanjutkan) langsung tampil
  const flushAbove = () => $$('.m:not(.in), .balloon:not(.in), .talk:not(.in)').forEach(el => { if (el.getBoundingClientRect().bottom < 0) el.classList.add('in'); });

  /* ---------- penanda giliran: setelah seseorang bicara, giliran lawan bicaranya ---------- */
  const turn = $('#turn'), turnText = $('#turnText');
  // akhir cerita terlihat (dan tidak sedang tertahan oleh giliran di sesi keempat)
  const endInView = () => { const e = $('#end'); return e.offsetParent !== null && e.getBoundingClientRect().top < innerHeight * .8; };
  let turnBox = null;
  function turnFrom(el) {
    // di akhir cerita gilirannya milik pembaca
    if (endInView()) return;
    if (el.classList.contains('stumble')) { turnBox = el.closest('.talk'); turn.hidden = false; turn.dataset.who = 'B'; turnText.textContent = t('Giliran Bima', 'Bima’s turn'); return; }
    const who = (el.className.match(/who-(\w)/) || [])[1]; if (!who) return;
    const box = el.closest('.win, .talk');
    const pair = box?.classList.contains('phone') ? box.dataset.who : box?.classList.contains('sela') ? box.dataset.pair || 'K' : box?.classList.contains('review') ? 'R' : 'M';
    const next = who === 'B' || who === 'b' ? (box?.classList.contains('kid') ? null : pair) : 'B';
    if (!next) return;
    turnBox = box; turn.hidden = false; turn.dataset.who = next;
    turnText.textContent = t(`Giliran ${NAMES[next]}`, `${NAMES[next]}’s turn`);
  }

  /* ---------- kejadian yang mengikuti posisi baca ---------- */
  const at = i => $(`[data-p="${i}"]`);
  const once = new Set();
  const when = (i, fn, frac = .7) => { const el = at(i); if (!el) return; const ob = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !once.has(i + ':' + fn.name)) { once.add(i + ':' + fn.name); fn(el); ob.disconnect(); } }, { rootMargin: `0px 0px -${Math.round((1 - frac) * 100)}% 0px` }); ob.observe(el); };
  // foto toko diperbesar
  if (ALIGNED) when(AT.zoom, function zoom() { $('.m-photo .ph')?.classList.add('zoom'); });
  // lima bintang mengisi satu per satu
  $$('.rating').forEach(r => new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { r.classList.add('fill'); ob.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' }).observe(r));
  // kolom alasan: satu kalimat diketik, lalu dihapus
  $$('.tform .reason').forEach(r => new IntersectionObserver(async (es, ob) => {
    if (!es[0].isIntersecting) return; ob.disconnect();
    const dots = document.createElement('span'); dots.className = 'typed'; r.prepend(dots);
    if (calm()) return;
    for (let k = 1; k <= 22; k++) { dots.textContent = '•'.repeat(k); await wait(70); }
    await wait(900);
    for (let k = 22; k >= 0; k--) { dots.textContent = '•'.repeat(k); await wait(28); }
  }, { rootMargin: '0px 0px -25% 0px' }).observe(r));
  // tab pencarian kota: dibuka, lalu ditutup
  if (ALIGNED) when(AT.searchClosed, function closeSearch() { $('.tabstrip.search')?.classList.add('closed'); });
  // "Kita bisa diam dulu": layar meredup kalau pembaca ikut diam
  if (ALIGNED) when(AT.dim, function dim(el) {
    const win = el.previousElementSibling?.closest?.('.win') || [...$$('.win.sela')].filter(w => w.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
    if (!win) return;
    const t0 = setTimeout(() => win.classList.add('dim'), calm() ? 0 : 2600);
    const wake = () => { clearTimeout(t0); win.classList.remove('dim'); removeEventListener('pointerdown', wake); };
    addEventListener('pointerdown', wake);
  });
  // jendela percakapan dikecilkan
  if (ALIGNED) when(AT.minimize, function minimize(el) { const w = [...$$('.win.sela')].filter(x => x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop(); w?.classList.add('mini'); });
  // akses ke kasus ditutup: semua jendela Sela sebelumnya tersegel (tetap bisa dibaca kalau pembaca memilih)
  if (ALIGNED) when(AT.sealed, function seal(el) {
    $$('.win.sela, .win.review').filter(w => w.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).forEach(w => {
      if (w.classList.contains('gate') || w.classList.contains('review') || w.dataset.pair === 'C' || w.querySelector('.seal')) return;
      w.classList.add('sealed');
      const b = html(`<button type="button" class="seal"><b>${t('Akses ke kasus ini ditutup', 'Access to this case has been revoked')}</b><small>${t('Ketuk untuk tetap membaca', 'Tap to keep reading')}</small></button>`);
      b.onclick = () => w.classList.toggle('peek');
      w.append(b);
    });
  }, .5);
  // pada telepon Ratih: pilihan pembaca di sesi keempat ikut dicatat
  if (ALIGNED) when(AT.complicit, function complicit(el) {
    if (!choice || el.parentElement.querySelector('.you')) return;
    el.after(html(`<p class="you">${choice === 'kirim' ? t('Kamu juga menekan kirim.', 'You pressed send too.') : t('Kamu menekan jeda. Bima tidak.', 'You pressed pause. Bima didn’t.')}</p>`));
  });
  // tidak ada jendela pendamping
  $$('.no-coach button').forEach(b => b.addEventListener('click', () => { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); announce(t('Tidak ada jendela pendamping.', 'There is no coaching window.')); }));
  // pengatur waktu telepon
  setInterval(() => $$('.win.call').forEach(c => {
    const r = c.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const s = (+c.dataset.sec || 0) + 1; c.dataset.sec = s;
    $('.p-timer', c).textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}${t('.', ':')}${String(s % 60).padStart(2, '0')}`;
    $('.p-status', c).textContent = t('Tersambung', 'Connected');
  }), 1000);

  /* ---------- bagian, kemajuan, dan riwayat baca ---------- */
  const scenesEl = $$('.scene');
  let saveT = 0, shownScene = 0;
  function frame() {
    flushAbove();
    const line = innerHeight * .45;
    let cur = 0; scenesEl.forEach((s, k) => { if (s.offsetParent !== null && s.getBoundingClientRect().top < line) cur = k + 1; });
    if (cur !== shownScene) { shownScene = cur; $('#stepChip').hidden = !cur; if (cur && G) G.step(cur, scenesEl.length, t('Bagian', 'Part')); }
    const max = document.documentElement.scrollHeight - innerHeight, f = max > 0 ? Math.min(1, scrollY / max) : 0;
    // penanda giliran hanya tampil selama percakapannya terlihat
    if (turnBox) { const r = turnBox.getBoundingClientRect(); if (r.bottom < 60 || r.top > innerHeight) { turn.hidden = true; turnBox = null; } }
    if (endInView()) { turn.hidden = false; turn.dataset.who = 'you'; turnText.textContent = t('Giliranmu', 'Your turn'); turnBox = $('#end'); }
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      store.set('giliran:place', +f.toFixed(4));
      const pr = store.get('prog', {}) || {}; pr[SLUG] = +f.toFixed(3); store.set('prog', pr);
      if (f > .97) { const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); } }
    }, 400);
  }
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  {
    const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
    const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st);
    store.set('last', { key: SLUG, at: Date.now() });
  }

  /* ---------- pengaturan baca ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  const paintMotion = () => { const on = !root.hasAttribute('data-calm'); $('#motion').setAttribute('aria-pressed', String(on)); $('#motion').textContent = on ? t('Aktif', 'On') : t('Tenang', 'Calm'); };
  $('#motion').onclick = () => { root.toggleAttribute('data-calm'); store.set('giliran:calm', root.hasAttribute('data-calm')); if (calm()) $$('.m, .balloon, .talk').forEach(e => e.classList.add('in')); paintMotion(); };
  paintMotion();
  $('#motionLabel').textContent = t('Gerak', 'Motion');
  $('#smaller').setAttribute('aria-label', t('Perkecil huruf', 'Smaller text')); $('#bigger').setAttribute('aria-label', t('Perbesar huruf', 'Larger text'));
  $('#ytKick').textContent = t('Giliranmu', 'Your turn');
  $('#ytLabel').textContent = t('Kalimat pertamamu', 'Your first sentence');
  $('#ytNote').textContent = t('Tidak ada tombol kirim. Tidak ada yang disimpan.', 'There is no send button. Nothing is kept.');

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, title, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#story',
      lede: t('Bima dibayar untuk memerankan orang yang akan ditinggalkan.', 'Bima is paid to play the person about to be left.'),
      steps: [
        t('Gulir untuk membaca. Yang diucapkan muncul sebagai balon kata; yang diketik muncul di aplikasinya: Sela, pesan, telepon, surel.', 'Scroll to read. What is spoken appears in speech balloons; what is typed appears in its app: Sela, messages, calls, email.'),
        t('Sela punya dua jendela: Latihan, tempat Bima memerankan seseorang, dan Pendamping, tempat latihannya dibicarakan.', 'Sela has two windows: Rehearsal, where Bima plays someone, and Coaching, where the rehearsal is discussed.'),
        t('Balon bergaris putus-putus adalah kalimat yang tidak jadi diucapkan.', 'A dashed balloon is a sentence left unsaid.'),
        t('Sekali, giliran menekan tombol ada padamu.', 'Once, it will be your turn to press a button.')
      ] });
    G.settings();
    $('#endNext').innerHTML = G.next(SLUG);
  }
  const saved = store.get('giliran:place', 0);
  if (saved > .03 && saved < .97 && !location.hash) {
    const b = html(`<button type="button" class="resume">${t('Lanjutkan membaca', 'Continue reading')} · ${Math.round(saved * 100)}%</button>`);
    b.onclick = () => { $$('.m, .balloon, .talk').forEach(e => e.classList.add('in')); scrollTo({ top: saved * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }); b.remove(); };
    $('#cover').append(b);
  }
  frame();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
