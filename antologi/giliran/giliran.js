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
  // sesi dan harinya, dari keterangan waktu di naskah (Selasa, Rabu malam, pagi berikutnya, dua hari sebelum Minggu)
  const SESSION = ALIGNED ? { 2: t('Sesi 1', 'Session 1'), 4: t('Sesi 2', 'Session 2'), 5: t('Sesi 3 · Selasa', 'Session 3 · Tuesday'), 6: t('Sesi 4 · Rabu malam', 'Session 4 · Wednesday night'), 8: t('Sesi 5 · Kamis pagi', 'Session 5 · Thursday morning'), 10: t('Sesi 6 · Jumat', 'Session 6 · Friday') } : {};
  // langit mengikuti waktu di cerita, dengan palet langit situs
  const SKY = ['senja', 'senja', 'siang', 'kabut', 'malam', 'malam', 'malam', 'malam', 'fajar', 'siang', 'senja', 'senja', 'malam', 'kabut', 'senja'];
  // panggilan berakhir di paragraf ini
  const CALL_END = ALIGNED ? { 232: 'R', 241: 'M', 302: 'I' } : {};
  // diam yang sungguhan, setelah "Kita bisa diam dulu."
  const QUIET = ALIGNED ? 198 : -1;

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
      <header class="w-bar"><span class="w-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Sela</b><span class="w-who">${esc(label || 'Kaca')}${!client && SESSION[sceneNo] ? ' · ' + esc(SESSION[sceneNo]) : ''}</span></header>
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
      <div class="w-list"></div>${call ? '<footer class="p-ctl" aria-hidden="true"><i class="c-mute"></i><i class="c-spk"></i><i class="c-end"></i></footer>' : ''}</section>`));
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
    const el = html(`<div class="m ${mine ? 'out' : 'inc'} who-${who}${o.cls ? ' ' + o.cls : ''}"${o.wait ? ` data-wait="${o.wait}"` : ''}${o.para != null ? ` data-p="${o.para}"` : ''}>${label}<div class="m-b">${textHtml}</div>${o.tag ? `<span class="m-tag">${o.tag}</span>` : ''}</div>`);
    const prev = [...box.list.children].reverse().find(x => x.classList.contains('m'));
    if (prev && prev === box.list.lastElementChild && prev.className.match(/who-\w/)?.[0] === `who-${who}` && (prev.querySelector('.m-label')?.innerHTML || '') === (el.querySelector('.m-label')?.innerHTML || '')) el.classList.add('grp');
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
      const lastOut = out[out.length - 1];
      const wrap = lastOut && lastOut.classList?.contains('talk') && lastOut.classList.contains('kid') === (where === 'k') && !lead.length ? lastOut : push(html(`<div class="talk ${where === 'k' ? 'kid' : ''}"></div>`));
      quotes.forEach((q, k) => {
        const prev = wrap.lastElementChild, same = prev && prev.classList.contains(`who-${who}`);
        wrap.append(html(`<div class="balloon ${who === 'B' || who === 'b' ? 'right' : 'left'} who-${who}${same ? ' grp' : ''}"${k ? '' : ` data-p="${i}"`}><span class="b-name">${esc(where === 'k' ? t('Bima, 9 tahun', 'Bima, nine') : NAMES[who])}</span><p>${spoken(q.s)}</p>${q.tag.trim() ? `<small class="b-tag">${inline(q.tag.trim())}</small>` : ''}</div>`));
      });
      return;
    }
    let box;
    // di awal cerita, sebelum pesanan Kaca masuk, jendela Pendamping masih milik klien toko bunga
    if (where === 'c') { box = selaBox('coach', who === 'C' || (ALIGNED && i < AT.booking) ? t('Klien · toko bunga', 'Client · flower shop') : 'Kaca'); lastCh = 'coach'; }
    else if (where === 'r') box = reviewBox();
    else if (where === 'w') box = phoneBox('chat', who === 'B' ? 'M' : who);
    else box = phoneBox('call', where === 'u' ? 'M' : scenes.findIndex(s => s.includes(i)) === 13 ? 'I' : 'R');
    const label = where === 'c' ? (who === 'B' ? t('PENDAMPING', 'COACH') : who === 'C' || (ALIGNED && i < AT.booking) ? t('KLIEN', 'CLIENT') : 'KACA') : where === 't' || where === 'u' ? NAMES[who] : where === 'r' ? NAMES[who] : '';
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
      <div class="mail-b"><p class="mail-s"><b>${t('Pemeriksaan kasus', 'Case review')}</b><small>${t('dari', 'from')} Sela</small></p><div class="mail-t m-x">${t('<p>Halo Bima,</p><p>pemeriksaan atas laporanmu belum selesai. Mohon lengkapi laporan tersebut, dan jangan menghubungi klien melalui kanal layanan.</p><p>Untuk sementara, tidak ada sesi untukmu pada jadwal minggu depan.</p><p>Ratih<br>Sela</p>', '<p>Hi Bima,</p><p>the review of your report is still in progress. Please complete your report, and do not contact the client through the service.</p><p>For now, you have no sessions on next week’s schedule.</p><p>Ratih<br>Sela</p>')}</div></div></section>`));
  W[AT.noCoach] = () => push(html(`<div class="no-coach"><button type="button" aria-disabled="true">${t('Buka jendela pendamping', 'Open the coaching window')}</button></div>`));
  W[AT.stumble] = () => push(html(`<div class="talk"><div class="balloon right who-B stumble" aria-label="${t('Bima mencoba bicara', 'Bima tries to speak')}"><span class="b-name">Bima</span><p class="st" aria-hidden="true"><i></i><i></i><i></i></p></div></div>`));
  /* Pesan yang di naskah hanya diceritakan (tidak dikutip) ditulis di sini dengan suara tokohnya, mengikuti isi
     yang diceritakan. Penanda kecil "ditulis untuk tampilan ini" ada di kelas .m-x. */
  const say = (b, who, id, en, o = {}) => message(b, who, esc(t(id, en)), { ...o, cls: ((o.cls || '') + ' m-x').trim() });
  const MSG = {
    late: () => { const b = phoneBox('chat', 'M'); say(b, 'M', 'Aku pulang telat ya. Jangan nunggu aku buat makan.', 'I’ll be home late. Don’t wait for me to eat.'); message(b, 'B', '<span class="emoji" role="img" aria-label="' + t('ibu jari', 'thumbs up') + '">👍</span>'); },
    soap: () => { const b = phoneBox('chat', 'M'); message(b, 'M', photo(t('Foto · dua sabun cuci', 'Photo · two detergents')), { cls: 'm-photo' }); say(b, 'M', 'Biasanya kita beli yang mana?', 'Which one do we usually get?'); },
    reply: () => { const b = phoneBox('chat', 'M'); say(b, 'B', 'Yang biru.', 'The blue one.'); say(b, 'B', 'Tapi di rumah masih ada kok, masih setengah botol.', 'We’ve still got some at home though, about half a bottle.'); },
    medicine: () => { const b = phoneBox('chat', 'I'); message(b, 'I', photo(t('Foto · bungkus obat', 'Photo · medicine packet')), { cls: 'm-photo' }); say(b, 'I', 'Ini, Bim. Ibu telepon ya.', 'This one, Bim. I’ll call you.'); },
    sunday: () => { const b = phoneBox('chat', 'M'); say(b, 'M', 'Hari ini aku mau ambil barang-barangku. Sekalian ngobrol, kalau kamu bisa.', 'I’d like to pick up my things today. And talk, if you can.'); say(b, 'B', 'Bisa. Kamu mau ada yang nemenin?', 'I can. Do you want someone with you?'); say(b, 'M', 'Temanku nanti bantu angkat kotak, setelah kita selesai.', 'My friend will help carry the boxes once we’re done.'); }
  };
  // kalimat yang hampir diucapkan Bima, lalu ditahan
  const UNSAID_TEXT = {
    46: ['Itu amplop apa?', 'What’s that envelope?'], 93: ['Mejanya nggak akan rusak cuma karena sedikit air.', 'A little water won’t ruin the table.'],
    147: ['Sejak kapan?', 'Since when?'], 148: ['Kamu sudah nemu tempat tinggal?', 'Have you found somewhere to live?'],
    161: ['Kamu nggak kenal aku sebaik itu.', 'You don’t know me that well.'], 173: ['Kenapa masih beli sabun?', 'Why are you still buying detergent?'],
    184: ['Aku nggak lagi minta Ibu menahanmu.', 'I’m not asking my mom to make you stay.'], 203: ['Aku nggak akan langsung ikut.', 'I wouldn’t just come along.'],
    258: ['Aku ngerti.', 'I understand.'], 271: ['Sebagian yang kita omongin itu sungguhan.', 'Some of what we said was real.'],
    321: ['Masih ada kesempatan?', 'Is there still a chance?']
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
      if (UNSAID.has(i)) { const u = UNSAID_TEXT[i]; push(html(`<div class="unsaid" aria-hidden="true"><span>${u ? esc(t(u[0], u[1])) : ''}</span></div>`)); }
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
      // jari telunjuknya tetap menempel pada tombol itu beberapa detik
      if (!quiet && c === 'kirim' && !calm()) { const b = $('.g-send', gate); b.classList.add('held'); setTimeout(() => b.classList.remove('held'), 2600); }
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
    busy = busy.then(() => show(el, box, typed)).catch(e => { el.classList.add('in'); console.error(e); });
  };
  // satu kegagalan tidak boleh menghentikan antrean: pesan tetap tampil
  const show = async (el, box, typed) => {
    {
      if (el.classList.contains('in')) return;
      const above = el.getBoundingClientRect().top < 0;
      const inSela = box && box.classList.contains('sela') && !box.classList.contains('gate');
      if (typed && !above && !calm()) {
        const total = +el.dataset.wait || Math.min(1300, 320 + el.textContent.length * 9);
        const ty = html(typingRow); el.before(ty);
        // Kaca mengetik, berhenti, lalu mengetik lagi
        if (inSela && el.classList.contains('who-K') && (total > 1500 || el.textContent.length > 70)) {
          await wait(total * .45); ty.hidden = true; await wait(650); ty.hidden = false; await wait(total * .45);
        } else await wait(total);
        ty.remove();
      } else if (inSela && el.classList.contains('out') && !above && !calm() && !el.querySelector('.redact, .ph, .emoji')) {
        await compose(box, el);
      } else if (!above && box) await wait(160);
      el.classList.add('in');
      if (el.matches('.m, .balloon')) { turnFrom(el); reflect(el); }
    }
  };
  // pesan Bima di Sela diketik dulu di kotak tulis: sebagian dihapus, diketik lagi, baru dikirim
  async function compose(box, el) {
    const text = $('.m-b', el).textContent, c = html(`<div class="compose" aria-hidden="true"><span class="c-text"></span><span class="caret"></span><i class="c-send"></i></div>`);
    box.append(c);
    const tx = $('.c-text', c), step = text.length > 90 ? 12 : text.length > 50 ? 18 : 26;
    const typeTo = async (from, to) => { for (let k = from; k <= to; k++) { tx.textContent = text.slice(0, k); if (k % 2 === 0) await wait(step); } };
    const stop = text.length > 24 ? Math.max(8, text.lastIndexOf(' ', Math.floor(text.length * .62))) : -1;
    if (stop > 0) {
      await typeTo(0, stop + 6); await wait(380);
      for (let k = stop + 6; k >= stop; k--) { tx.textContent = text.slice(0, k); await wait(40); }
      await wait(300); await typeTo(stop, text.length);
    } else await typeTo(0, text.length);
    await wait(280); c.classList.add('sent'); await wait(220); c.remove();
  }
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
    const typedEl = document.createElement('span'); typedEl.className = 'typed'; r.prepend(typedEl);
    if (calm()) return;
    const line = t('Saya mengenali klien ini.', 'I know this client.');
    for (let k = 1; k <= line.length; k++) { typedEl.textContent = line.slice(0, k); await wait(65); }
    await wait(1100);
    for (let k = line.length; k >= 0; k--) { typedEl.textContent = line.slice(0, k); await wait(30); }
  }, { rootMargin: '0px 0px -25% 0px' }).observe(r));
  // tab pencarian kota: dibuka, lalu ditutup
  if (ALIGNED) when(AT.searchClosed, function closeSearch() { $('.tabstrip.search')?.classList.add('closed'); });
  // "Kita bisa diam dulu": layar meredup dan menghitung berapa lama pembaca ikut diam
  let hushed = false;
  // dipicu saat jendela itu terbaca dan pesannya sudah tampil (juga dalam mode Gerak: Tenang)
  {
    const qEl = QUIET >= 0 && at(QUIET), qWin = qEl && qEl.closest('.win');
    if (qWin) new IntersectionObserver((es, ob) => {
      if (!es[0].isIntersecting) return; ob.disconnect();
      const go = () => { if (qEl.classList.contains('in')) hush(qEl); else setTimeout(go, 200); };
      go();
    }, { rootMargin: '0px 0px -35% 0px' }).observe(qWin);
  }
  function hush(el) {
    if (hushed) return; hushed = true;
    const win = el.closest('.win'); win?.classList.add('quiet');
    root.classList.add('hush');
    const chip = html(`<div class="hush-count" aria-hidden="true"><i></i><span>0${t('.', ':')}00</span></div>`); document.body.append(chip);
    const t0 = Date.now(); let armed = false;
    const fmt = ms => { const sec = Math.floor(ms / 1000); return `${Math.floor(sec / 60)}${t('.', ':')}${String(sec % 60).padStart(2, '0')}`; };
    const tick = setInterval(() => { $('span', chip).textContent = fmt(Date.now() - t0); }, 250);
    setTimeout(() => { armed = true; }, 900);
    const end = () => {
      if (!armed) return;
      clearInterval(tick); chip.remove(); root.classList.remove('hush'); win?.classList.remove('quiet');
      ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(ev => removeEventListener(ev, end, true));
      const ms = Date.now() - t0;
      if (ms >= 2000 && win) win.after(html(`<p class="silence">${t(`kalian diam ${fmt(ms)}`, `you were both quiet for ${fmt(ms)}`)}</p>`));
    };
    ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(ev => addEventListener(ev, end, { capture: true, passive: true }));
  }
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
  // panggilan berakhir
  Object.entries(CALL_END).forEach(([i, who]) => when(+i, function hangUp(el) {
    $$(`.win.call[data-who="${who}"]`).filter(w => w.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).forEach(w => { w.classList.add('ended'); $('.p-status', w).textContent = t('Panggilan berakhir', 'Call ended'); });
  }));
  // tidak ada jendela pendamping
  $$('.no-coach button').forEach(b => b.addEventListener('click', () => { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); announce(t('Tidak ada jendela pendamping.', 'There is no coaching window.')); }));
  // pengatur waktu telepon
  setInterval(() => $$('.win.call').forEach(c => {
    const r = c.getBoundingClientRect(); if (c.classList.contains('ended') || r.bottom < 0 || r.top > innerHeight) return;
    const s = (+c.dataset.sec || 0) + 1; c.dataset.sec = s;
    $('.p-timer', c).textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}${t('.', ':')}${String(s % 60).padStart(2, '0')}`;
    if (!c.classList.contains('cont')) $('.p-status', c).textContent = t('Tersambung', 'Connected');
  }), 1000);

  /* ---------- dua ruang: rumah di kiri, layar Bima di kanan (layar lebar) ----------
     Jendela aplikasi di alur cerita menjadi selip kecil; isinya tampil di layar yang diam di kanan, seperti laptop
     atau ponsel yang terus menyala di sudut meja. Sejak Bima mengenali Kaca, balon Mira terpantul di layar itu.
     Saat tidak ada lagi jendela pendamping, layarnya tertutup dan tinggal satu ruang. */
  const wideQ = matchMedia('(min-width: 1100px)');
  const screenEl = html(`<aside class="screen" id="screen" aria-hidden="true"><div class="sc-dev"><div class="sc-body"></div></div><p class="sc-cap"></p></aside>`);
  document.body.append(screenEl);
  const scBody = $('.sc-body', screenEl);
  let scSrc = null, scT = 0;
  const twoRooms = () => root.classList.contains('two-rooms');
  const setRooms = () => { root.classList.toggle('two-rooms', wideQ.matches && ALIGNED); scSrc = null; schedule(); };
  wideQ.addEventListener('change', setRooms);
  // kunci aplikasi sebuah jendela: Sela (kasus Kaca atau klien), atau ponsel dengan orang tertentu
  const appKey = w => w.classList.contains('booking') ? 'book' : w.classList.contains('tform') ? 'form' : w.classList.contains('phone') ? 'p' + (w.classList.contains('call') ? 'c' : 'm') + w.dataset.who : w.classList.contains('review') ? 'r' : w.classList.contains('mail') ? 'e' : 's' + (w.dataset.pair || 'K');
  const syncScreen = () => {
    if (!scSrc) return;
    const keep = scBody.scrollHeight - scBody.scrollTop - scBody.clientHeight < 40;
    // seluruh percakapan aplikasi itu di bagian ini, sampai jendela yang sedang terbaca
    const key = appKey(scSrc), scene = scSrc.closest('.scene');
    // kartu (pesanan, formulir, surel) tampil utuh apa adanya
    if (!$(':scope > .w-list', scSrc)) { const c = scSrc.cloneNode(true); c.classList.remove('cont', 'mini', 'quiet'); c.classList.add('whole', 'card'); scBody.replaceChildren(c); return; }
    const list = $$('.win:not(.gate)', scene).filter(w => appKey(w) === key && !(scSrc.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING));
    // satu jendela utuh: kepala dari jendela pertama, isi semua jendela berurutan, tombol dari yang terakhir
    const shell = list[0].cloneNode(false); shell.className = list[0].className.replace(/\b(cont|sealed|peek|mini|quiet)\b/g, '').trim() + ' whole';
    if (scSrc.dataset.ch) shell.dataset.ch = scSrc.dataset.ch;
    if (scSrc.classList.contains('sealed')) shell.classList.add('sealed');
    if (scSrc.classList.contains('peek')) shell.classList.add('peek');
    if (scSrc.classList.contains('ended')) shell.classList.add('ended');
    const head = $(':scope > .w-bar, :scope > .p-bar', list[0]); if (head) shell.append(head.cloneNode(true));
    const tabs = $(':scope > .w-tabs, :scope > .p-cap', list[0]); if (tabs) shell.append(tabs.cloneNode(true));
    if (scSrc.classList.contains('ended')) { const st = $('.p-status', shell); if (st) st.textContent = t('Panggilan berakhir', 'Call ended'); }
    const body = document.createElement('div'); body.className = 'w-list';
    list.forEach(w => { const l = $(':scope > .w-list, :scope > .form, :scope > .mail-b', w); if (l) [...l.children].forEach(c => body.append(c.cloneNode(true))); else if (l === null && w.classList.contains('booking')) {} });
    if (!list.some(w => $(':scope > .w-list', w))) list.forEach(w => [...w.children].filter(c => !c.matches('.w-bar, .p-bar, .w-tabs, .p-cap, .seal')).forEach(c => body.append(c.cloneNode(true))));
    shell.append(body);
    [...scSrc.children].filter(c => c.matches('.compose, .p-ctl, .seal')).forEach(c => shell.append(c.cloneNode(true)));
    scBody.replaceChildren(shell);
    if (keep) scBody.scrollTop = scBody.scrollHeight;
  };
  const scheduleScreen = () => { clearTimeout(scT); scT = setTimeout(syncScreen, 30); };
  new MutationObserver(ms => { if (scSrc && ms.some(m => scSrc.closest('.scene')?.contains(m.target))) scheduleScreen(); }).observe(story, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'], characterData: true });
  screenEl.addEventListener('click', e => { if (e.target.closest('.seal') && scSrc) scSrc.classList.toggle('peek'); });
  function screenFrame(sceneEl) {
    if (!twoRooms()) return;
    const line = innerHeight * .62;
    const wins = $$('.story .win:not(.gate)', sceneEl || story).filter(w => w.offsetParent !== null && w.getBoundingClientRect().top < line);
    const act = wins.pop() || null;
    screenEl.classList.toggle('idle', !act);
    if (act && act !== scSrc) {
      scSrc = act;
      screenEl.dataset.dev = act.classList.contains('phone') ? 'phone' : 'laptop';
      $('.sc-cap', screenEl).textContent = act.classList.contains('phone') ? t('Ponsel Bima', 'Bima’s phone') : t('Laptop Bima', 'Bima’s laptop');
      syncScreen(); scBody.scrollTop = scBody.scrollHeight;
      // pesan di jendela yang baru tampil di layar muncul satu per satu
      $$('.win:not(.gate)', act.closest('.scene')).filter(w => appKey(w) === appKey(act) && !(act.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING)).forEach(w => $$('.m:not(.in)', w).forEach(reveal));
    }
    // saat tidak ada lagi jendela pendamping, layar ditutup
    const nc = AT.noCoach != null && at(AT.noCoach);
    root.classList.toggle('one-room', !!nc && nc.offsetParent !== null && nc.getBoundingClientRect().top < innerHeight * .5);
  }
  // pantulan: setelah Bima mengenali Kaca, ucapan Mira di rumah terpantul di layar
  function reflect(el) {
    if (!twoRooms() || !el.classList.contains('balloon') || !el.classList.contains('who-M')) return;
    const p = +($$('[data-p]').filter(x => x.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop()?.dataset.p || 0);
    if (!(AT.recognized != null && p >= AT.recognized)) return;
    $$('.reflect', screenEl).forEach(x => x.remove());
    const r = html(`<p class="reflect">${$('p', el).innerHTML}</p>`); screenEl.append(r);
    setTimeout(() => r.remove(), calm() ? 1500 : 4200);
  }

  /* ---------- langit mengikuti jam cerita ---------- */
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  let skyScene = 0;
  const applySky = () => { if (skyScene && ALIGNED) root.dataset.backdrop = isDark() ? 'malam' : SKY[skyScene - 1]; };
  addEventListener('qm-frame', applySky);
  new MutationObserver(applySky).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  document.body.prepend(html('<div class="sky-tint" aria-hidden="true"></div>'));

  /* ---------- peta giliran: seluruh cerita dalam satu pita ---------- */
  {
    const marks = $$('.story .balloon:not(.stumble), .story .m, .story .unsaid');
    let said = 0, typed = 0, unsaid = 0;
    const bars = marks.map((el, k) => {
      if (el.classList.contains('unsaid')) { unsaid++; return '<i class="rb-gap"></i>'; }
      const who = (el.className.match(/who-(\w)/) || [])[1] || 'K', len = el.textContent.length;
      const h = Math.round(8 + Math.min(26, Math.sqrt(len) * 2.4));
      if (el.classList.contains('balloon')) { said++; return `<i class="rb-say w-${who}" style="--h:${h}px;--k:${k}"></i>`; }
      typed++; return `<i class="rb-type w-${who}${el.classList.contains('mira') ? ' w-mira' : ''}" style="--h:${h}px;--k:${k}"></i>`;
    }).join('');
    $('#yourTurn').before(html(`<section class="ribbon" aria-label="${t('Semua giliran dalam cerita ini', 'Every turn in this story')}">
      <p class="rb-k">${t('Semua giliran dalam cerita ini', 'Every turn in this story')}</p>
      <div class="rb-row" aria-hidden="true">${bars}<i class="rb-you"></i></div>
      <p class="rb-legend"><span class="l-say">${said} ${t('diucapkan', 'spoken')}</span><span class="l-type">${typed} ${t('diketik', 'typed')}</span><span class="l-gap">${unsaid} ${t('tidak jadi diucapkan', 'left unsaid')}</span><span class="l-you">1 ${t('giliranmu', 'yours')}</span></p></section>`));
    const rb = $('.ribbon');
    new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { rb.classList.add('in'); ob.disconnect(); } }, { rootMargin: '0px 0px -15% 0px' }).observe(rb);
  }

  /* ---------- bagian, kemajuan, dan riwayat baca ---------- */
  const scenesEl = $$('.scene');
  let saveT = 0, shownScene = 0;
  function frame() {
    flushAbove();
    const line = innerHeight * .45;
    let cur = 0; scenesEl.forEach((s, k) => { if (s.offsetParent !== null && s.getBoundingClientRect().top < line) cur = k + 1; });
    if (cur !== shownScene) { shownScene = cur; $('#stepChip').hidden = !cur; if (cur && G) G.step(cur, scenesEl.length, t('Bagian', 'Part')); skyScene = cur; applySky(); }
    screenFrame(scenesEl[cur - 1]);
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
  setRooms();
  frame();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
