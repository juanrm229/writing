/*
 * Anda di Sini: catatan-catatan yang dibaca di atas peta Saujana.
 *
 * Teksnya dibaca utuh dan berurutan; tidak ada yang dikunci. Peta di belakangnya
 * hanya mengikuti posisi baca: setiap kalimat penting di naskah punya "ketukan"
 * (BEATS) yang mengubah keadaan peta, dan di antara dua ketukan keadaannya
 * berpindah halus sejauh kamu menggulir.
 */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*\*|~~|\*/g, '');
  const SLUG = 'anda-di-sini';
  const read = $('#read'), story = $('#story');
  const toast = (msg, ms = 2600) => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); };

  /* ======================================================================
     NASKAH: dari works.json (atau pratinjau admin), diurai menjadi blok
     ====================================================================== */
  let works = null, albums = null;
  if (/[?&]preview=1/.test(location.search)) { try { ({ works, albums } = JSON.parse(localStorage.getItem('jm:preview') || 'null') || {}); } catch (e) { /* */ } }
  if (!works) [works, albums] = await Promise.all(['works', 'albums'].map(f => fetch(`../../content/${f}.json`, { cache: 'no-cache' }).then(r => r.json()).catch(() => null)));
  // antologi tempat tulisan ini berada, kalau ada: judulnya tampil di atas judul cerita
  const ANTH = (Array.isArray(albums) ? albums : []).find(a => a.kind === 'antologi' && (a.tracks || []).includes(SLUG));
  const W = (works || []).find(w => w.slug === SLUG);
  if (!W || !Array.isArray(W.body)) { story.innerHTML = '<p class="loading">Naskahnya belum ada. <a href="../../">Kembali ke meja tulis</a>.</p>'; return; }

  const TIME = /^(senin|selasa|rabu|kamis|jumat|sabtu|minggu|beberapa|tiga minggu|tanpa tanggal)/i;
  const blocks = [];
  let prevKind = null, inEpilog = false;
  W.body.forEach(raw => {
    const s = String(raw).trim(); if (!s) return;
    let m;
    if ((m = s.match(/^## (.+)$/))) {
      const t = m[1].trim();
      if (/^(prolog|epilog)$/i.test(t)) { inEpilog = /epilog/i.test(t); blocks.push({ k: 'frame', t }); }
      else { const [a, b] = t.split(/:\s*/); blocks.push({ k: 'part', a, b: b || '' }); }
    } else if ((m = s.match(/^### (.+)$/))) blocks.push({ k: 'note', t: m[1].trim() });
    else if (/^-{3,}$|^\*{3}$/.test(s)) blocks.push({ k: 'brk' });
    else if (s.startsWith('|')) blocks.push({ k: 'table', s });
    else if (s.split('\n').every(l => /^- /.test(l))) blocks.push({ k: 'list', items: s.split('\n').map(l => l.slice(2)) });
    else if (s.split('\n').every(l => /^\d+\. /.test(l))) blocks.push({ k: 'olist', items: s.split('\n').map(l => l.replace(/^\d+\. /, '')) });
    else if (/^\*\*[^*]+\*\*$/.test(s) && inEpilog) blocks.push({ k: 'end', t: plain(s) });
    else if (/^\*[^*].*\*$/.test(s)) {
      const t = s.slice(1, -1);
      if ((prevKind === 'note' || prevKind === 'brk') && TIME.test(t)) blocks.push({ k: 'stamp', t });
      else if (/^(Lurus|Belok|Anda telah tiba)/.test(t)) blocks.push({ k: 'instr', t });
      else if (/^(Dari mana\?|Anda di sini\.)$/.test(t)) blocks.push({ k: 'label', t });
      else if (/^Tempat di mana jalan berhenti/.test(t)) blocks.push({ k: 'hand', t });
      else blocks.push({ k: 'p', s });
    } else blocks.push({ k: 'p', s });
    prevKind = blocks[blocks.length - 1].k;
  });

  // ikon aplikasi muncul di dua tempat: di legenda, dan di layar ketiga ponselnya
  const withIcon = ['Ikonnya putih polos', 'Di pojok kanan bawah halaman itu ada ikon'];
  // sesudah prolog, aplikasinya bertanya padamu
  const firstPart = blocks.findIndex(b => b.k === 'part');
  if (firstPart > 0) blocks.splice(firstPart, 0, { k: 'ask' });

  const ICON_TURN = { kiri: '<path d="M15 19V11a3 3 0 0 0-3-3H6M9 4.5 5.5 8 9 11.5"/>', kanan: '<path d="M9 19V11a3 3 0 0 1 3-3h6M15 4.5 18.5 8 15 11.5"/>', lurus: '<path d="M12 20V5M7 9.5 12 4.5l5 5"/>', tiba: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>' };
  const turnOf = t => (/kiri/i.test(t) ? 'kiri' : /kanan/i.test(t) ? 'kanan' : /tiba/i.test(t) ? 'tiba' : 'lurus');
  const answer = () => String(store.get('darimana', '') || '').trim();

  function tableHTML(s) {
    const rows = s.split('\n').filter(l => !/^\|\s*-/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    const [head, ...body] = rows;
    const hours = c => { const h = c.match(/(\d+)\s*jam/), m = c.match(/(\d+)\s*menit/); return (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0); };
    const sleepCol = head.findIndex(h => /tidur/i.test(h));
    return `<div class="tbl"><table><thead><tr>${head.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r, k) => `<tr>${r.map((c, j) => `<td>${j === sleepCol ? `<span class="sleep">${esc(c)}<i style="--h:${hours(c).toFixed(2)};--k:${k}"></i></span>` : inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  // "Aku menggarisbawahi kalimat itu dua kali."
  const underline = s => s.replace('Penjelasan paling sederhana biasanya benar.', '<span class="u2">Penjelasan paling sederhana biasanya benar.</span>');

  const NOTES = blocks.filter(b => b.k === 'note').length;
  // aplikasi Catatan: setiap catatan punya judul, stempel, kalimat pertama, dan jumlah kata
  const NOTE_INFO = [];
  {
    let cur = null, part = -1;
    blocks.forEach(b => {
      if (b.k === 'part') { part++; cur = null; } else if (b.k === 'frame') { cur = null; }
      else if (b.k === 'note') { cur = { title: b.t, n: +(b.t.match(/\d+/) || [0])[0], part, stamp: '', first: '', words: 0 }; NOTE_INFO.push(cur); }
      else if (cur) {
        if (b.k === 'stamp' && !cur.stamp) cur.stamp = b.t;
        const txt = b.k === 'p' ? plain(b.s) : b.items ? plain(b.items.join(' ')) : b.k === 'hand' ? b.t : '';
        if (b.k === 'p' && !cur.first) cur.first = txt;
        cur.words += (txt.match(/[\p{L}\p{N}]+/gu) || []).length;
      }
    });
  }
  const shortStamp = s => s.replace(/\.\s*(Ditulis|Rangkuman|Masih|Tidak tahu).*$/, '').replace(/\.$/, '');
  const flow = [];   // setiap elemen yang ikut dihitung posisinya, berurutan
  const add = (html, text, cls) => { flow.push({ html, text, cls }); };
  if (ANTH) { const n = ANTH.tracks.indexOf(SLUG); add(`<p class="anth"><i aria-hidden="true"></i>${esc(ANTH.title)} · ${n ? 'cerita ke-' + (n + 1) : 'cerita pembuka'}</p>`, ''); }
  add(`<h1 class="title">${esc(W.title || 'Anda di Sini')}</h1>`, W.title || '');
  add(`<p class="byline">Juan · ${new Date((W.date || '2026-10-30') + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`, '');
  add('<p class="cover-hint"><i aria-hidden="true"></i>Gulir pelan-pelan. Petanya mengikuti.</p>', '');
  let openNote = null, partNo = -1, noteNo = -1;
  const closeNote = () => { if (!openNote) return; add(`<footer class="note-f"><span>${openNote.words.toLocaleString('id-ID')} kata</span><span>Tersimpan di Catatan</span></footer>`, ''); openNote = null; };
  blocks.forEach(b => {
    if (b.k === 'frame' || b.k === 'part' || b.k === 'note' || b.k === 'ask') closeNote();
    if (b.k === 'frame') add(`<h2 class="frame-h">${esc(b.t)}</h2>`, '## ' + b.t);
    else if (b.k === 'part') {
      partNo++;
      add(`<header class="part"><small>${esc(b.a)}</small><b>${esc(b.b)}</b></header>`, `## ${b.a}: ${b.b}`);
      const ns = NOTE_INFO.filter(n => n.part === partNo);
      if (ns.length) add(`<nav class="folder" aria-label="Catatan di ${esc(b.a)}"><p class="folder-h"><b>Catatan</b><span>${ns.length} catatan</span></p>${ns.map(n => `<button type="button" data-note="${n.n}"><b>${esc(n.title)}</b><time>${esc(shortStamp(n.stamp))}</time><span>${esc(n.first)}</span></button>`).join('')}</nav>`, '');
    }
    else if (b.k === 'note') { openNote = NOTE_INFO[++noteNo]; add(`<header class="note-h" id="catatan-${openNote.n}"><b>${esc(b.t)}</b><span>${openNote.n} / ${NOTES}</span></header>`, `### ${b.t}`); }
    else if (b.k === 'stamp') add(`<p class="stamp">${esc(b.t)}</p>`, b.t);
    else if (b.k === 'brk') add('<div class="brk" role="separator"></div>', '---');
    else if (b.k === 'table') add(tableHTML(b.s), plain(b.s));
    else if (b.k === 'list') { const info = b.items.every(i => /^[^:]{2,20}: /.test(i)); add(`<ul class="${info ? 'info' : ''}">${b.items.map(i => { const [k, ...v] = i.split(': '); return info ? `<li><span>${esc(k)}</span><b>${inline(v.join(': '))}</b></li>` : `<li>${inline(i)}</li>`; }).join('')}</ul>`, plain(b.items.join(' '))); }
    else if (b.k === 'olist') add(`<ol>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`, plain(b.items.join(' ')));
    else if (b.k === 'instr') add(`<p class="instr${/tiba/i.test(b.t) ? ' arrive' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON_TURN[turnOf(b.t)]}</svg>${esc(b.t)}</p>`, '*' + b.t + '*');
    else if (b.k === 'label') add(`<p class="label">${/Anda/.test(b.t) ? '<i aria-hidden="true"></i>' : ''}${esc(b.t)}</p>`, '*' + b.t + '*');
    else if (b.k === 'hand') add(`<p class="hand">${esc(b.t)}</p>`, b.t);
    else if (b.k === 'end') add(`<div class="end"><div class="end-sticker" role="img" aria-label="${esc(b.t)}">${esc(b.t.replace(/\.$/, ''))}</div><p class="from" id="from"></p></div>`, b.t);
    else if (b.k === 'ask') add(`<section class="ask" aria-label="Aplikasi tanpa nama">
        <span class="app-icon" aria-hidden="true"></span>
        <label class="ask-field"><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Dari mana?</span><input id="askIn" maxlength="60" autocomplete="off" placeholder="Dari mana?" enterkeyhint="go"></label>
        <p class="ask-said" id="askSaid"></p>
        <small>Tidak ada jawaban yang salah. Jawabanmu hanya disimpan di perangkat ini dan tidak dikirim ke mana pun.</small>
        <button class="ask-go" id="askGo" type="button">Lanjut</button>
      </section>`, '[tanya]');
    else {
      if (openNote) openNote.lastP = flow.length;
      add(`<p>${underline(inline(b.s))}</p>`, plain(b.s));
      if (withIcon.some(w => b.s.startsWith(w))) add('<div class="icon-fig" aria-hidden="true"><span class="app-icon"></span><span>Tanpa nama</span></div>', '');
    }
  });
  closeNote();
  // dua catatan yang ditulis di tempat, di ujung dermaga: kursornya masih berkedip
  NOTE_INFO.filter(n => /di tempat|di dermaga/i.test(n.stamp)).forEach(n => { if (n.lastP != null) flow[n.lastP].html = flow[n.lastP].html.replace(/^<p>/, '<p class="caret">'); });
  story.innerHTML = flow.map((f, i) => f.html.replace(/^<(\w+)/, `<$1 data-i="${i}"`)).join('');
  const els = $$('[data-i]', story);
  $('#after').hidden = false;

  /* ======================================================================
     SAUJANA: kota pelabuhan, dalam meter. x ke timur, y ke utara.
     ====================================================================== */
  const COAST = [[-9000, -2300], [-6000, -1900], [-4500, -1700], [-2500, -1500], [-1500, -1250], [-500, -1350], [400, -1050], [1300, -600], [2100, -150], [2700, 300], [3300, 1000], [4500, 1600], [6000, 2300], [9000, 3200]];
  const coastY = x => { for (let i = 1; i < COAST.length; i++) { const [x0, y0] = COAST[i - 1], [x1, y1] = COAST[i]; if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return COAST[COAST.length - 1][1]; };
  const isLand = (x, y, m = 25) => y > coastY(x) + m;
  let seed = 20260809;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  const HOME = [-1400, 900], AULA = [-1750, 560], TOKO = [-620, 240], GARUDA = [-1000, -150];
  const P = [300, Math.round(coastY(300) + 280)], TPI = [620, Math.round(coastY(620) + 30)];
  const DERM = [2900, Math.round(coastY(2900) + 6)], DERM_END = [DERM[0] + 48, DERM[1] - 64];
  const GANG_A = [-2350, -300], GANG_B = [-2350, -159];
  const ROUTES = {
    garuda: [HOME, [-1400, 300], [-1000, 300], GARUDA],
    gang: [GANG_A, GANG_B],
    sekar: [P, [300, P[1] + 1550], [1500, P[1] + 1550], [1500, P[1] + 1900], [2400, P[1] + 1900], [2400, 700], [2850, 700], DERM, DERM_END],
    pergi: [HOME, [-1400, 2000], [-900, 2600], [-900, 6500]]
  };
  const routeLen = {}, routeCum = {};
  Object.entries(ROUTES).forEach(([k, pts]) => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); routeCum[k] = c; routeLen[k] = c[c.length - 1]; });
  function routeAt(k, f) {
    const pts = ROUTES[k], c = routeCum[k], d = clamp(f, 0, 1) * routeLen[k];
    for (let i = 1; i < pts.length; i++) if (d <= c[i] || i === pts.length - 1) { const t = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; }
    return pts[0];
  }
  // titik ketika rute Sekar melewati tepi lingkaran 1,4 km
  const CROSS = 1400 / routeLen.sekar;

  // jalan-jalan: kisi yang sedikit miring-miring, dipotong garis pantai, dengan jeda di sana-sini
  const STREETS = [];
  for (let x = -5400; x <= 5400; x += 140 + rnd() * 70) {
    const xx = x + (rnd() - .5) * 30;
    let y = coastY(xx) + 40 + rnd() * 80;
    while (y < 5600) { const len = 350 + rnd() * 1300, y1 = Math.min(5600, y + len); STREETS.push([[xx, y], [xx + (rnd() - .5) * 18, y1]]); y = y1 + (rnd() < .45 ? 60 + rnd() * 220 : 0); }
  }
  for (let y = -1700; y <= 5600; y += 120 + rnd() * 70) {
    const yy = y + (rnd() - .5) * 26;
    let run = null;
    for (let x = -5400; x <= 5400; x += 50) {
      if (isLand(x, yy, 40) && rnd() > .012) { if (!run) run = [[x, yy]]; } else if (run) { if (x - run[0][0] > 120) STREETS.push([run[0], [x - 50, yy + (rnd() - .5) * 10]]); run = null; }
    }
    if (run) STREETS.push([run[0], [5400, yy]]);
  }
  const MAIN = [];
  { const pts = []; for (let x = -2600; x <= 3100; x += 150) pts.push([x, coastY(x) + 280]); MAIN.push(pts); }
  MAIN.push([[-620, coastY(-620) + 280], [-620, 2800]]);
  MAIN.push([[-2700, -300], [-2000, -300]], [[-2700, -159], [-2000, -159]]);
  Object.entries(ROUTES).forEach(([k, pts]) => { if (k !== 'gang') MAIN.push(pts.slice(0, k === 'sekar' ? -1 : undefined)); });

  // petak bangunan untuk peta kerja, dikelompokkan per 400 m supaya mudah disaring
  const PARCELS = new Map();
  const vx = STREETS.filter(s => Math.abs(s[0][0] - s[1][0]) < 40).map(s => s[0][0]).sort((a, b) => a - b);
  const near = (arr, v, d) => { let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return Math.abs(arr[lo] - v) < d || (lo > 0 && Math.abs(arr[lo - 1] - v) < d); };
  const hy = STREETS.filter(s => Math.abs(s[0][1] - s[1][1]) < 40).map(s => s[0][1]).sort((a, b) => a - b);
  for (let x = -3600; x < 3600; x += 34) for (let y = -1600; y < 3400; y += 34) {
    if (rnd() < .32 || !isLand(x, y, 30) || near(vx, x, 15) || near(hy, y, 15)) continue;
    const key = Math.floor(x / 400) + ',' + Math.floor(y / 400);
    if (!PARCELS.has(key)) PARCELS.set(key, []);
    PARCELS.get(key).push([x + 3, y + 3, 20 + rnd() * 9, 20 + rnd() * 9]);
  }
  // sel lingkaran 1,4 km: 2.463 petak berukuran 50 × 50 m, dicat abu-abu satu per satu
  const CELLS = [];
  for (let x = P[0] - 1400; x < P[0] + 1400; x += 50) for (let y = P[1] - 1400; y < P[1] + 1400; y += 50) if (Math.hypot(x + 25 - P[0], y + 25 - P[1]) <= 1400) CELLS.push([x, y, rnd()]);
  CELLS.sort((a, b) => a[2] - b[2]);

  // pulau, benua, dan bumi untuk saat peta diperkecil
  function blob(cx, cy, r, rough = .28, n = 90) {
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6, rnd() * 6], pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + rough * (.5 * Math.sin(a * 2 + ph[0]) + .3 * Math.sin(a * 5 + ph[1]) + .2 * Math.sin(a * 9 + ph[2]) + .1 * Math.sin(a * 17 + ph[3])); pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]); }
    return pts;
  }
  const ISLE = blob(200, 3900, 6400, .2);
  const ISLES = [[-22000, -9000, 4200], [15000, -18000, 2600], [30000, 9000, 5200], [-9000, -30000, 3300], [52000, -6000, 7000], [-48000, 14000, 6000], [8000, 40000, 3800], [-30000, -50000, 9000], [70000, 30000, 5000]].map(([x, y, r]) => blob(x, y, r, .38, 60));
  const CONT = blob(-1.9e6, 1.15e6, 1.5e6, .34, 120);
  const GLOBE_LAND = [CONT, blob(2.7e6, -1.9e6, 1.2e6, .4, 90), blob(-4e5, -4.3e6, 9e5, .4, 80), blob(4.3e6, 2.5e6, 1.4e6, .36, 90), blob(-4.6e6, -1.4e6, 7e5, .4, 70)];
  const CITIES = [['Lonjura', 'kejauhan', -.66, -.1], ['Uzakova', 'dataran yang jauh', -.3, -.55], ['Tanaw', 'pandangan dari tempat tinggi', .52, .56], ['Miharashi', 'pemandangan yang terbuka luas', .6, -.34], ['Saujana', 'sejauh mata memandang', 0, 0]];
  const LABELS = [
    ['Jl. Pelabuhan Lama', -1300, coastY(-1300) + 310, 'road'], ['Jl. Kenari', -600, 1500, 'roadv'], ['Rumah', HOME[0], HOME[1] + 46, 'poi'],
    ['Aula Kelurahan', AULA[0], AULA[1] + 40, 'poi'], ['eks Bioskop Garuda', GARUDA[0], GARUDA[1] - 50, 'poi'], ['Gudang galangan', P[0] + 230, P[1] + 90, 'poi'],
    ['Pasar Ikan', 380, P[1] + 330, 'poi'], ['TPI', TPI[0] + 120, TPI[1] - 10, 'poi'], ['Kampung Bandeng', -2350, -60, 'district'], ['Dermaga 7', DERM[0] - 40, DERM[1] + 60, 'poi'],
    ['Gudang garam', 2280, P[1] + 1980, 'poi'], ['Halte Jl. Kenari', -560, 1200, 'poi'], ['Teluk Saujana', 1300, -1500, 'water'], ['Kelurahan Pelabuhan', 900, 300, 'district']
  ];

  /* ======================================================================
     KETUKAN: kalimat → keadaan peta. Urutannya mengikuti naskah.
     span = lebar peta (meter) yang muat di sisi terpendek bidang peta.
     ====================================================================== */
  const S0 = { cx: -300, cy: 300, span: 9000, follow: 0, dx: HOME[0], dy: HOME[1], route: null, rp: 0, dot: 0, acc: 30, accPx: 0, accFix: 0, app: 0,
    circle: 0, grid: 0, petak: 0, chalk: 0, labels: 0, city: 1, here: 0, ghost: 0, sky: 0, paper: 0, cities: 0, rain: 0, bus: 0, sticker: 0, fog: 1, hud: 0, roti: 0, band: .26, phone: 0, bat: 72, night: .15 };
  const at = (p, more = {}) => ({ dx: p[0], dy: p[1], route: null, ...more });
  const BEATS = [
    ['Konon, di sebuah kota bernama Saujana', { fog: .85 }],
    ['Ikonnya putih polos', { fog: .55, span: 7000 }],
    ['Kalau kamu membukanya', { fog: .35 }],
    ['Itu akan membuatmu merasa lebih baik.', { fog: .15, span: 5000 }],
    ['[tanya]', { fog: 0, app: 1, city: 0, labels: 0, dot: 1, follow: 1, ...at([200, 400]), span: 1300, here: 1, band: .42 }],
    ['## Bagian Satu', { app: 0, here: 0, dot: 0, follow: 0, cx: -900, cy: 500, span: 3200, city: 1, labels: 1, phone: 1, band: .3 }],
    ['### Catatan 1', { night: .45, dot: 1, follow: 1, ...at(HOME), span: 800, acc: 28, bat: 71 }],
    ['Bu Ratna adalah salah satu anggota kelompok', { span: 1500 }],
    ['Aku sadar. Aku selalu sadar.', { span: 700 }],
    ['### Catatan 2', { span: 1200, bat: 66, night: .4 }],
    ['Aku bekerja sebagai analis', { span: 520 }],
    ['Salah satu hal kecil yang selalu kutunjukkan', { span: 5200 }],
    ['Itu bukan karena kamu penting.', { span: 800 }],
    ['Dan lingkaran pucat di sekelilingnya', { acc: 160 }],
    ['Aku mengenal lingkaran semacam itu', { acc: 30 }],
    ['Tujuh tahun lalu, pada malam 9 Agustus', { dot: 0, follow: 0, cx: P[0], cy: P[1], span: 4000 }],
    ['Ponsel itu terakhir mengirim sinyal', { circle: 1 }],
    ['Satu koma empat kilometer. Luas lingkaran', { grid: 1, span: 3400 }],
    ['Selama tiga tahun berikutnya', { petak: 0 }],
    ['Tidak ada apa-apa.', { petak: 1 }],
    ['Aku menyimpan tangkapan layar itu', { span: 3800 }],
    ['Ada satu ingatan yang muncul', { circle: 0, grid: 0, petak: 0, cx: -900, cy: 400, span: 2600, labels: .5 }],
    ['Malam ini aku tidur pukul satu.', { labels: 1, dot: 1, follow: 1, ...at(HOME), span: 800 }],
    ['### Catatan 3', { bat: 64, night: 0 }],
    ['Sore tadi ponsel Ibu mati', { bat: 53, night: .3 }],
    ['Tidur pukul dua belas lewat.', { fog: .45, night: .6 }],
    ['### Catatan 4', { night: .35, fog: 0, ...at(AULA), span: 650, bat: 62 }],
    ['Dalam perjalanan pulang, di boncengan motor', { ...at(HOME), span: 1300 }],
    ['### Catatan 5', { span: 900, bat: 41, night: .1 }],
    ['Pukul 03.12 aku terbangun.', { night: .7, dot: 0, follow: 0, cx: P[0], cy: P[1], span: 3800, circle: 1 }],
    ['Setelah beberapa menit aku menutupnya.', { circle: 0, dot: 1, follow: 1, ...at(HOME), span: 800 }],
    ['Layar putih, lalu peta.', { app: 1, labels: 0, city: 0, acc: 35 }],
    ['Aku memutuskan memperlakukannya sebagai eksperimen', { route: 'garuda', rp: 0, span: 1900 }],
    ['Pukul 03.41 aku keluar rumah', { rp: .02, span: 1100 }],
    ['Aplikasi itu tidak bersuara.', { rp: .3 }],
    ['Rutenya berakhir di belakang bekas Bioskop Garuda', { rp: .96 }],
    ['Di layar: Anda telah tiba.', { rp: 1, span: 520 }],
    ['Tidak ada apa-apa. Seekor kucing belang', { span: 420 }],
    ['Aku pulang pukul 04.40', { night: .45, ...at(HOME), span: 800 }],
    ['### Catatan 6', { bat: 55, span: 1500, night: .4 }],
    ['| Malam |', { span: 3000 }],
    ['*Anda di sini.*', { here: 1, span: 700 }],
    ['Pada malam kelima, setelah mengetik nama adikku', { here: 1 }],
    ['Ketiga, semua ujung rute adalah jalan buntu.', { here: 0, span: 2600 }],
    ['Pada malam keenam, rute ke Kampung Bandeng', { night: .6, route: 'gang', rp: 0, span: 480, hud: 1 }],
    ['Gang itu sepanjang kira-kira dua ratus meter.', { rp: .2 }],
    ['Gang itu tidak ada di peta mana pun', { rp: .3 }],
    ['Malam itu, sambil berjalan, aku merekam jejak GPS.', { rp: .55 }],
    ['Sore berikutnya aku kembali membawa roda ukur', { rp: .8 }],
    ['Aku mengulang semuanya tiga kali.', { rp: 1 }],
    ['Aku tidak menulis hipotesis apa pun', { hud: 0 }],
    ['Satu lagi, lebih kecil. Peta di aplikasi itu masih menampilkan Toko Roti Sinar', { night: .3, ...at([TOKO[0] + 60, TOKO[1] - 40]), span: 600, roti: 1 }],
    ['Di kantor, Wulan dari bagian survei', { roti: 0, ...at(HOME), span: 900 }],
    ['Aku belum memasukkan koordinat itu.', { dot: 0, follow: 0, cx: P[0], cy: P[1], span: 3900, circle: .6 }],
    ['## Bagian Tiga', { circle: 0, span: 5200 }],
    ['Pukul 02.20 aku membuka aplikasi itu.', { night: .75, circle: 1, chalk: .35, span: 4200, bat: 34 }],
    ['Aku menduga aplikasi itu akan memperlakukan', { route: 'sekar', rp: 0 }],
    ['Aku tiba di titik awal pukul 02.44.', { dot: 1, follow: 1, span: 1500, rp: 0 }],
    ['*Lurus 120 m.*', { rp: .012 }],
    ['Jalan Pelabuhan Lama pada jam itu', { rp: .03 }],
    ['*Belok kanan.*', { rp: .05 }],
    ['Aku melewati pasar ikan', { rp: .1 }],
    ['Aku membayangkan Sekar berjalan', { rp: .16 }],
    ['*Lurus 600 m.*', { rp: .2, span: 2200 }],
    ['Sekitar pukul 03.15 aku menyadari sesuatu', { rp: CROSS - .012, chalk: 1, bat: 27 }],
    ['Rute itu sudah keluar dari lingkaran.', { rp: CROSS + .004 }],
    ['Aku berjalan lagi.', { rp: CROSS + .05, span: 1800 }],
    ['Setelah itu aku tidak tahu di mana aku berada.', { rp: .4, circle: .35, chalk: .35 }],
    ['Aku membuka aplikasi peta biasa', { ghost: 1, rp: .44, span: 4200 }],
    ['Aku menutup aplikasi itu dan tidak membukanya lagi.', { ghost: 0, rp: .55, span: 1800 }],
    ['Rute itu membawaku melewati deretan gudang garam', { rp: .78, circle: 0, chalk: 0 }],
    ['Jalan semen itu berakhir di sebuah dermaga', { rp: .93, span: 600, bat: 18 }],
    ['Rute itu tidak berhenti di mulut dermaga.', { rp: .94 }],
    ['Aku berjalan di atas papan-papan itu', { rp: .975, span: 380 }],
    ['Layar ponselku menyala.', { rp: 1 }],
    ['Tidak ada apa-apa di sini. Air.', { span: 340 }],
    ['### Catatan 8', { bat: 14, ...at(DERM_END) }],
    ['Aku meletakkan dua jari di layar', { span: 320, band: .44 }],
    ['Dermaga menjadi garis tipis.', { span: 1800, labels: 1, city: 0, roti: 1 }],
    ['Nama-nama jalan muncul, lalu mengecil.', { span: 4500 }],
    ['Lalu nama-nama itu hilang.', { span: 8000, labels: 0, roti: 0 }],
    ['Nama kelurahan. Lalu tidak ada.', { span: 13000, city: 1 }],
    ['Saujana. Kata itu bertahan sebentar', { span: 26000, city: 1 }],
    ['Garis pantai. Pulau.', { night: .2, span: 160000, city: 0 }],
    ['Benua.', { span: 5e6 }],
    ['Bumi, bulat', { span: 2.4e7 }],
    ['Di sini peta seharusnya berhenti.', { span: 3e7 }],
    ['Bumi mengecil.', { span: 3e8 }],
    ['Aku menunggu hitam.', { span: 1.2e9 }],
    ['Tidak ada hitam.', { span: 4e9, paper: .35 }],
    ['Yang ada hanyalah warna polos', { span: 2e10, paper: 1 }],
    ['Kisi-kisi itu tidak berubah.', { span: 4e10 }],
    ['Titik biru itu masih di tengah layar.', { accFix: 1, accPx: 190 }],
    ['Dan lingkaran pucat di sekelilingnya, lingkaran yang selalu ada', { accPx: 180 }],
    ['Pelan sekali.', { accPx: 130 }],
    ['Aku melihatnya mengecil.', { accPx: 26 }],
    ['Lalu hilang.', { accPx: 0 }],
    ['Tidak ada lagi lingkaran.', { accPx: 0, here: 1 }],
    ['Ponselku hangat di tanganku.', { bat: 14 }],
    ['Aku mengunci layar.', { bat: 13 }],
    ['Layar menghitam, dan di permukaannya', { night: .55, span: 520, paper: 0, here: 0, accFix: 0, acc: 18, labels: 0, band: .32 }],
    ['Di timur, langit mulai berwarna', { sky: 1, night: .1, span: 900 }],
    ['Lalu aku pulang.', { span: 1500 }],
    ['## Bagian Empat', { night: 0, sky: 0, app: 0, labels: 1, city: 1, ...at(HOME), span: 900, bat: 100 }],
    ['Sorenya kami ke Dermaga 7.', { ...at(DERM_END), span: 700 }],
    ['Di kantor, Wulan menatapku', { ...at(HOME), span: 900 }],
    ['### Catatan 10', { bat: 88 }],
    ['Sebuah utas di forum berbahasa Portugis', { span: 2.4e7, labels: 0, city: 0, cities: 1, accFix: 1, accPx: 0, paper: .6 }],
    ['Sebuah video berbahasa Turki', { cities: 2 }],
    ['Sebuah unggahan berbahasa Tagalog', { cities: 3 }],
    ['Sebuah blog berbahasa Jepang', { cities: 4 }],
    ['Aku mencari arti nama-nama kota itu.', { cities: 4.6 }],
    ['Saujana: sejauh mata memandang.', { cities: 5 }],
    ['Aku masih bisa menulis penjelasannya.', { cities: 5 }],
    ['### Catatan 11', { cities: 0, paper: 0, accFix: 0, labels: 1, city: 1, ...at(HOME), span: 1600, bat: 76 }],
    ['Itu cukup untuk berangkat.', { route: 'pergi', rp: .7, span: 3800 }],
    ['## Epilog', { night: .35, phone: 0, bus: 1, rain: 1, dot: 0, band: .26 }],
    ['Di tengahnya, sebuah stiker merah bundar', { sticker: .6 }],
    ['ANDA DI SINI.', { sticker: 1, rain: .5 }]
  ];
  const NUM = ['night', 'dx', 'dy', 'rp', 'dot', 'acc', 'accPx', 'accFix', 'app', 'circle', 'grid', 'petak', 'chalk', 'labels', 'city', 'here', 'ghost', 'sky', 'paper', 'cities', 'rain', 'bus', 'sticker', 'fog', 'hud', 'roti', 'band', 'phone', 'bat'];
  const SNAP = [];
  {
    let cur = { ...S0 }, bi = 0;
    flow.forEach(f => {
      while (bi < BEATS.length && f.text.includes(BEATS[bi][0])) { Object.assign(cur, BEATS[bi][1]); bi++; }
      const s = { ...cur };
      if (s.route) [s.dx, s.dy] = routeAt(s.route, s.rp);
      SNAP.push(s);
    });
    if (bi < BEATS.length) console.warn('Ketukan peta yang tidak menemukan kalimatnya:', BEATS[bi][0]);
    window.__peta = { beatsMatched: bi, beats: BEATS.length };
  }
  // jam di bilah status: stempel catatan terakhir, atau "pukul 02.44" di dalam teks
  const CLOCK = [];
  // (waktu kenangan seperti "sinyal terakhir pukul 02.47" di Catatan 2 tidak dihitung)
  { let c = ''; flow.forEach(f => { const now = /^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/.test(f.text) || /^(Sekitar\s+)?Pukul\s+\d/i.test(f.text) || /^Aku tiba di titik awal pukul/.test(f.text); const m = now && f.text.match(/(\d{2})\.(\d{2})/); if (m) c = `${m[1]}.${m[2]}`; else if (/^(Beberapa|Tiga minggu|Tanpa tanggal)/.test(f.text)) c = ''; CLOCK.push(c); }); }
  const idxOf = s => flow.findIndex(f => f.text.includes(s));
  const LOCK_I = idxOf('Aku mengunci layar.'), STRIKE_I = idxOf('Aku mencoret kalimat di bawah tabel'), STRUCK_I = idxOf('Semua pengguna, di semua versi, sedang mencari sesuatu.'), TABLE_I = flow.findIndex(f => f.html.startsWith('<div class="tbl"'));
  const INSTR = flow.map((f, i) => (f.html.startsWith('<p class="instr') ? i : -1));
  // bilah aplikasi: judul catatan yang sedang dibuka, dan folder tempat ia disimpan
  const NOTE_AT = [], FOLDER_AT = [], NOTE_IDX = {};
  { let note = null, folder = -1; flow.forEach((f, i) => {
    if (f.text.startsWith('## ')) { note = null; }
    if (f.html.startsWith('<nav class="folder"')) folder = i;
    if (f.text.startsWith('### ')) { note = f.text.slice(4); NOTE_IDX[(note.match(/\d+/) || [0])[0]] = i; }
    NOTE_AT.push(note); FOLDER_AT.push(folder);
  }); }

  function mix(a, b, t) {
    const o = { ...a };
    NUM.forEach(k => { o[k] = a[k] + (b[k] - a[k]) * t; });
    o.span = Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * t);
    if (a.route && a.route === b.route) { o.rp = a.rp + (b.rp - a.rp) * t; [o.dx, o.dy] = routeAt(a.route, o.rp); } else if (t > .5) { o.route = b.route; o.rp = b.rp; }
    const ca = a.follow ? [o.dx, o.dy] : [a.cx, a.cy], cb = b.follow ? [o.dx, o.dy] : [b.cx, b.cy];
    o.cx = ca[0] + (cb[0] - ca[0]) * t; o.cy = ca[1] + (cb[1] - ca[1]) * t;
    return o;
  }

  /* ======================================================================
     MENGGAMBAR
     ====================================================================== */
  const cv = $('#map'), ctx = cv.getContext('2d');
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const dark = () => { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const PAL = {
    light: { kerja: { bg: '#E7E3D8', land: '#F2EFE6', water: '#D3E1EB', road: '#FFFFFF', edge: '#DCD3C1', main: '#F8E9BD', mainEdge: '#D9C48F', parcel: '#E2D9C7', label: '#6E6656' },
      app: { bg: '#E9ECEF', land: '#F3F4F6', water: '#D5E4F2', road: '#FFFFFF', edge: '#DEE2E7', main: '#FFFFFF', mainEdge: '#D2D7DE', parcel: '#F3F4F6', label: '#8A9099' }, space: '#EDEFF1', grid: '#D7DBE0' },
    dark: { kerja: { bg: '#141517', land: '#1C1D20', water: '#132130', road: '#2C2E34', edge: '#24262B', main: '#3B3729', mainEdge: '#2F2C22', parcel: '#26282D', label: '#8D8A82' },
      app: { bg: '#141518', land: '#18191C', water: '#11202E', road: '#2B2E34', edge: '#222429', main: '#34373E', mainEdge: '#2B2E34', parcel: '#18191C', label: '#7D838C' }, space: '#1A1B1E', grid: '#2A2C30' }
  };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lerpC = (a, b, t) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
  let W_ = 0, H_ = 0, DPR = 1, FX = 0, FY = 0, VMIN = 1, mobile = false;
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2); W_ = innerWidth; H_ = innerHeight;
    cv.width = Math.round(W_ * DPR); cv.height = Math.round(H_ * DPR);
    mobile = matchMedia('(max-width: 760px)').matches;
    measure(); frame(true);
  }
  function focal(s) {
    if (mobile) { const band = s.band * H_; FX = W_ / 2; FY = Math.max(60, band / 2 + 6); VMIN = Math.min(W_, band); }
    else { const r = read.getBoundingClientRect().right; FX = r + (W_ - r) / 2; FY = H_ / 2; VMIN = Math.min(W_ - r, H_); }
  }
  function draw(s) {
    focal(s);
    const P_ = dark() ? PAL.dark : PAL.light, K = {};
    Object.keys(P_.kerja).forEach(k => { K[k] = lerpC(P_.kerja[k], P_.app[k], s.app); });
    const mpp = s.span / Math.max(200, VMIN * .92);
    const X = x => FX + (x - s.cx) / mpp, Y = y => FY - (y - s.cy) / mpp;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    const space = lerpC(P_.space, P_.space, 0);
    ctx.fillStyle = space; ctx.fillRect(0, 0, W_, H_);
    const poly = (pts, close = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); if (close) ctx.closePath(); };
    const globeA = smooth(9000, 40000, mpp);
    // laut sejauh mata memandang, lalu bumi yang bulat
    ctx.globalAlpha = 1 - globeA; ctx.fillStyle = K.water; ctx.fillRect(0, 0, W_, H_);
    if (s.paper > 0) {
      ctx.globalAlpha = s.paper; ctx.fillStyle = space; ctx.fillRect(0, 0, W_, H_);
      ctx.strokeStyle = P_.grid; ctx.lineWidth = 1;
      const g = 22, ox = (FX % g), oy = (FY % g);
      ctx.beginPath(); for (let x = ox; x < W_; x += g) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H_); } for (let y = oy; y < H_; y += g) { ctx.moveTo(0, y + .5); ctx.lineTo(W_, y + .5); } ctx.stroke();
      ctx.globalAlpha = s.paper * .7; ctx.lineWidth = 1.4; ctx.beginPath(); for (let x = ox; x < W_; x += g * 5) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H_); } for (let y = oy; y < H_; y += g * 5) { ctx.moveTo(0, y + .5); ctx.lineTo(W_, y + .5); } ctx.stroke();
    }
    if (globeA > 0) {
      const R = 6.371e6 / mpp, vis = clamp((R - .4) / 1.6, 0, 1) * globeA;
      if (vis > 0) {
        ctx.globalAlpha = vis; ctx.fillStyle = K.water; ctx.beginPath(); ctx.arc(X(s.cx), Y(s.cy), Math.max(R, .8), 0, Math.PI * 2); ctx.fill();
        if (R > 3) { ctx.save(); ctx.clip(); ctx.fillStyle = K.land; GLOBE_LAND.forEach(b => { poly(b.map(([x, y]) => [x + s.cx, y + s.cy])); ctx.fill(); }); ctx.restore(); }
      }
    }
    // benua dan pulau-pulau
    const contA = smooth(900, 4000, mpp) * (1 - globeA);
    if (contA > 0) { ctx.globalAlpha = contA; ctx.fillStyle = K.land; poly(CONT); ctx.fill(); }
    const isleA = smooth(18, 70, mpp) * (1 - smooth(3e4, 1.2e5, mpp));
    if (isleA > 0) { ctx.globalAlpha = isleA; ctx.fillStyle = K.land; poly(ISLE); ctx.fill(); ISLES.forEach(b => { poly(b); ctx.fill(); }); }
    const cityA = 1 - smooth(22, 70, mpp);
    if (cityA > 0) {
      ctx.globalAlpha = cityA; ctx.fillStyle = K.land;
      poly([...COAST, [9000, 9000], [-9000, 9000]]); ctx.fill();
      // petak bangunan di peta kerja
      const parA = (1 - s.app) * (1 - smooth(2.2, 3.4, mpp)) * cityA;
      if (parA > .01) {
        ctx.globalAlpha = parA; ctx.strokeStyle = K.parcel; ctx.lineWidth = 1;
        const x0 = s.cx - (FX + 20) * mpp, x1 = s.cx + (W_ - FX + 20) * mpp, y0 = s.cy - (H_ - FY + 20) * mpp, y1 = s.cy + (FY + 20) * mpp;
        ctx.beginPath();
        for (let gx = Math.floor(x0 / 400); gx <= Math.floor(x1 / 400); gx++) for (let gy = Math.floor(y0 / 400); gy <= Math.floor(y1 / 400); gy++) (PARCELS.get(gx + ',' + gy) || []).forEach(([x, y, w, h]) => ctx.rect(X(x), Y(y + h), w / mpp, h / mpp));
        ctx.stroke();
      }
      const streetA = cityA * (1 - smooth(14, 40, mpp));
      if (streetA > 0) {
        const wid = m => Math.max(.6, m / mpp);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = streetA; ctx.strokeStyle = K.edge; ctx.lineWidth = wid(10) + 1.6; STREETS.forEach(s2 => { poly(s2, false); ctx.stroke(); });
        ctx.strokeStyle = K.road; ctx.lineWidth = wid(10); STREETS.forEach(s2 => { poly(s2, false); ctx.stroke(); });
        ctx.strokeStyle = K.mainEdge; ctx.lineWidth = wid(16) + 2; MAIN.forEach(m => { poly(m, false); ctx.stroke(); });
        ctx.strokeStyle = K.main; ctx.lineWidth = wid(16); MAIN.forEach(m => { poly(m, false); ctx.stroke(); });
        // gang di Kampung Bandeng: ada di citra satelit, tidak pernah didigitasi. Hanya aplikasi itu yang menggambarnya.
        const gangA = Math.max(s.app > .5 ? 1 : 0, s.route === 'gang' ? 1 : 0) * streetA;
        if (gangA > 0) { ctx.globalAlpha = gangA; ctx.strokeStyle = K.road; ctx.lineWidth = wid(4); poly([GANG_A, GANG_B], false); ctx.stroke(); }
        // dermaga kayu
        ctx.globalAlpha = streetA; ctx.strokeStyle = dark() ? '#5A4B3A' : '#B79A72'; ctx.lineWidth = wid(5); ctx.lineCap = 'butt'; poly([DERM, DERM_END], false); ctx.stroke(); ctx.lineCap = 'round';
      }
    }
    // lingkaran 1,4 km di sekitar titik terakhir Sekar
    if (s.circle > .01 && cityA > 0) {
      const r = 1400 / mpp;
      ctx.globalAlpha = s.circle * cityA;
      ctx.fillStyle = dark() ? 'rgba(160,170,185,.08)' : 'rgba(90,100,115,.07)'; ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), r, 0, Math.PI * 2); ctx.fill();
      if (s.grid > .01 && 50 / mpp > 3) {
        const n = Math.round(CELLS.length * s.petak);
        const STORY_N = 2463;
        ctx.globalAlpha = s.circle * s.grid * cityA;
        ctx.fillStyle = dark() ? 'rgba(140,140,140,.42)' : 'rgba(110,110,110,.34)';
        for (let i = 0; i < n; i++) { const c = CELLS[i]; ctx.fillRect(X(c[0]) + .5, Y(c[1] + 50) + .5, 50 / mpp - 1, 50 / mpp - 1); }
        ctx.strokeStyle = dark() ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; ctx.lineWidth = 1; ctx.beginPath();
        CELLS.forEach(c => ctx.rect(X(c[0]), Y(c[1] + 50), 50 / mpp, 50 / mpp)); ctx.stroke();
        if (s.grid > .5) { ctx.globalAlpha = s.circle * cityA; ctx.fillStyle = K.label; ctx.font = '600 12px Geist, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(STORY_N * s.petak).toLocaleString('id-ID')} / ${STORY_N.toLocaleString('id-ID')} petak`, X(P[0]), Y(P[1]) - r - 12); }
      }
      ctx.globalAlpha = s.circle * cityA;
      ctx.lineWidth = 1.5 + s.chalk * 2; ctx.setLineDash(s.chalk > .3 ? [10, 9] : []);
      ctx.strokeStyle = s.chalk > .3 ? (dark() ? 'rgba(235,235,230,.85)' : 'rgba(150,140,120,.9)') : (dark() ? 'rgba(160,170,185,.5)' : 'rgba(90,100,115,.45)');
      ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // titik abu-abu: sinyal terakhir, pukul 02.47
      ctx.fillStyle = '#8A9099'; ctx.beginPath(); ctx.arc(X(P[0]), Y(P[1]), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark() ? '#18191C' : '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }
    // rute: yang sudah dilalui abu-abu, yang belum biru
    if (s.route && cityA > 0) {
      const pts = ROUTES[s.route], done = [], ahead = [[s.dx, s.dy]], dTot = s.rp * routeLen[s.route], c = routeCum[s.route];
      pts.forEach((p, i) => { if (c[i] <= dTot) done.push(p); else ahead.push(p); });
      done.push([s.dx, s.dy]);
      ctx.globalAlpha = cityA * clamp(s.dot * 2, .35, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = dark() ? '#4D5560' : '#AEB4BC'; ctx.lineWidth = 6; poly(done, false); ctx.stroke();
      ctx.strokeStyle = '#0F5BD0'; ctx.lineWidth = 7; poly(ahead, false); ctx.stroke();
      ctx.strokeStyle = '#3D8BF2'; ctx.lineWidth = 4; poly(ahead, false); ctx.stroke();
      const end = pts[pts.length - 1];
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0F5BD0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(end[0]), Y(end[1]), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // nama-nama: hanya di peta kerja, dan hilang satu per satu saat diperkecil
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const labA = s.labels * cityA * (1 - smooth(9, 18, mpp));
    if (labA > .02) {
      LABELS.forEach(([t, x, y, kind]) => {
        ctx.globalAlpha = labA * (kind === 'district' ? .8 : 1);
        ctx.fillStyle = kind === 'water' ? (dark() ? '#4F6F8C' : '#7E9DB6') : K.label;
        ctx.font = kind === 'district' ? '600 11px Geist, system-ui, sans-serif' : kind === 'water' ? 'italic 500 13px Newsreader, Georgia, serif' : '500 11.5px Geist, system-ui, sans-serif';
        if (kind === 'roadv') { ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(-Math.PI / 2); ctx.fillText(t, 0, 0); ctx.restore(); }
        else ctx.fillText(kind === 'district' ? t.toUpperCase() : t, X(x), Y(y));
      });
      if (s.circle > .5) { ctx.globalAlpha = labA; ctx.fillStyle = K.label; ctx.font = '600 11px Geist, system-ui, sans-serif'; ctx.fillText('Petak 1.231', X(P[0]), Y(P[1]) + 18); }
    }
    // Toko Roti Sinar: tutup tujuh tahun lalu, tapi masih ada di ubin peta aplikasi itu
    if (s.roti > .02 && cityA > 0) {
      ctx.globalAlpha = s.roti * cityA * (1 - smooth(9, 18, mpp)); ctx.fillStyle = '#C0712F'; ctx.beginPath(); ctx.arc(X(TOKO[0]), Y(TOKO[1]), 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '600 12px Geist, system-ui, sans-serif'; ctx.fillText('Toko Roti Sinar', X(TOKO[0]), Y(TOKO[1]) - 16);
    }
    const cityLab = s.city * smooth(2.4, 5, mpp) * (1 - smooth(60, 160, mpp));
    if (cityLab > .02) { ctx.globalAlpha = cityLab; ctx.fillStyle = K.label; ctx.font = '600 13px Geist, system-ui, sans-serif'; ctx.letterSpacing = '4px'; ctx.fillText('SAUJANA', X(200), Y(1600)); ctx.letterSpacing = '0px'; }
    // kota-kota lain yang punya legenda yang sama
    if (s.cities > .01) {
      const R = 6.371e6 / mpp;
      CITIES.forEach(([n, mean, fx, fy], i) => {
        const a = clamp(s.cities - i, 0, 1); if (a <= 0) return;
        const x = FX + fx * R, y = FY + fy * R;
        ctx.globalAlpha = a; ctx.fillStyle = '#1A73E8'; ctx.beginPath(); ctx.arc(x, y, i === 4 ? 0 : 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dark() ? '#E8E7E2' : '#2A2C30'; ctx.font = '600 12.5px Geist, system-ui, sans-serif'; ctx.fillText(n, x, y + (i === 4 ? 26 : -16));
        if (s.cities > 4.3) { ctx.globalAlpha = a * smooth(4.3, 4.9, s.cities); ctx.fillStyle = dark() ? '#9A9993' : '#7C7B78'; ctx.font = 'italic 13px Newsreader, Georgia, serif'; ctx.fillText(mean, x, y + (i === 4 ? 42 : -32)); }
      });
    }
    // titik abu-abu di tengah teluk: peta biasa kebingungan oleh pantulan sinyal
    if (s.ghost > .01 && cityA > 0) {
      const g = [1500, -1150];
      ctx.globalAlpha = s.ghost * cityA;
      ctx.fillStyle = 'rgba(120,128,138,.16)'; ctx.beginPath(); ctx.arc(X(g[0]), Y(g[1]), 2000 / mpp, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8A9099'; ctx.beginPath(); ctx.arc(X(g[0]), Y(g[1]), 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // titik biru: ukurannya tidak pernah berubah
    if (s.dot > .01) {
      const x = X(s.dx), y = Y(s.dy), acc = (s.acc / mpp) * (1 - s.accFix) + s.accPx * s.accFix;
      ctx.globalAlpha = s.dot;
      if (acc > 1) { ctx.fillStyle = 'rgba(26,115,232,.14)'; ctx.beginPath(); ctx.arc(x, y, acc, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(26,115,232,.32)'; ctx.lineWidth = 1; ctx.stroke(); }
      const pulse = reduced ? 0 : (Math.sin(performance.now() / 700) + 1) / 2;
      ctx.fillStyle = `rgba(26,115,232,${.18 * (1 - pulse)})`; ctx.beginPath(); ctx.arc(x, y, 10 + pulse * 10, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#1A73E8'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      if (s.here > .02) {
        ctx.globalAlpha = s.here * s.dot; ctx.textAlign = 'left'; ctx.font = '600 13px Geist, system-ui, sans-serif';
        const tw = ctx.measureText('Anda di sini.').width;
        ctx.fillStyle = dark() ? 'rgba(30,31,35,.92)' : 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.roundRect(x + 18, y - 14, tw + 20, 28, 14); ctx.fill();
        ctx.fillStyle = dark() ? '#E8E7E2' : '#1B1B1D'; ctx.fillText('Anda di sini.', x + 28, y + 1); ctx.textAlign = 'center';
      }
    }
    // peta jaringan bus di dinding terminal, warnanya sudah pudar dimakan matahari
    if (s.bus > .01) drawBus(s.bus);
    // malam: tepi peta menggelap seperti layar ponsel di kamar yang lampunya mati; tengahnya, tempat titik biru, tetap terang
    if (s.night > .01) {
      const g = ctx.createRadialGradient(FX, FY, VMIN * .18, FX, FY, Math.max(W_, H_) * .75);
      g.addColorStop(0, `rgba(8,12,26,${(s.night * .12).toFixed(3)})`); g.addColorStop(1, `rgba(8,12,26,${(s.night * (dark() ? .55 : .62)).toFixed(3)})`);
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
    }
    if (s.fog > .01) {
      ctx.globalAlpha = s.fog; const g = ctx.createRadialGradient(FX, FY, 0, FX, FY, Math.max(W_, H_) * .7);
      g.addColorStop(0, dark() ? 'rgba(22,23,26,.35)' : 'rgba(244,245,246,.35)'); g.addColorStop(1, dark() ? 'rgba(22,23,26,.95)' : 'rgba(244,245,246,.95)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W_, H_);
    }
    ctx.globalAlpha = 1;
  }
  const BUS_TOWNS = ['Kuala Senja', 'Batu Pandang', 'Tanjung Ingat', 'Lembah Rindu', 'Pasir Pelan', 'Teluk Diam', 'Bukit Jauh', 'Simpang Pulang', 'Muara Lama', 'Padang Lapang', 'Sungai Sabar', 'Karang Tenang', 'Air Tenang', 'Labuh', 'Saujana', 'Ujung Sepi', 'Kampung Teduh', 'Bandar Lalu', 'Rantau', 'Tepian', 'Batas'];
  const BUS_LINES = (() => { const out = []; let k = 0; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + rnd() * .4, bend = (rnd() - .5) * .9, stops = []; for (let j = 1; j <= 3; j++) stops.push([a + bend * j / 3, j / 3, BUS_TOWNS[k++ % BUS_TOWNS.length]]); out.push({ a, stops, c: ['#D88A74', '#86A9C8', '#9DC09B', '#E2C47E', '#B9A0C6', '#92C4C0', '#C9A58E'][i] }); } return out; })();
  function drawBus(a) {
    const d = dark(), R = Math.min(W_ - (mobile ? 0 : read.getBoundingClientRect().right), mobile ? H_ * .3 : H_) * .44;
    ctx.globalAlpha = a; ctx.fillStyle = d ? '#24221F' : '#EDE3D1'; ctx.fillRect(0, 0, W_, H_);
    ctx.globalAlpha = a * (d ? .6 : .75); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    BUS_LINES.forEach(l => {
      ctx.strokeStyle = l.c; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(FX, FY);
      l.stops.forEach(([ang, r]) => ctx.lineTo(FX + Math.cos(ang) * R * r, FY + Math.sin(ang) * R * r)); ctx.stroke();
      l.stops.forEach(([ang, r, name]) => {
        const x = FX + Math.cos(ang) * R * r, y = FY + Math.sin(ang) * R * r;
        ctx.fillStyle = d ? '#24221F' : '#F6EFE2'; ctx.strokeStyle = l.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (!mobile || r > .9) { ctx.fillStyle = d ? '#A39A8C' : '#8C7F6C'; ctx.font = '600 10.5px Geist, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name.toUpperCase(), x, y - 14); }
      });
    });
    ctx.globalAlpha = a; ctx.fillStyle = d ? '#3A3631' : '#F6EFE2'; ctx.strokeStyle = d ? '#6E655A' : '#8C7F6C'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(FX, FY, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  /* ---------- hujan di terminal ---------- */
  const rcv = $('#rain'), rctx = rcv.getContext('2d');
  const DROPS = Array.from({ length: 140 }, () => [Math.random(), Math.random(), .6 + Math.random() * .8]);
  function rain(t) {
    if (+rcv.style.opacity <= .01) return;
    rcv.width = W_; rcv.height = H_;
    rctx.strokeStyle = dark() ? 'rgba(200,210,225,.25)' : 'rgba(90,100,120,.22)'; rctx.lineWidth = 1; rctx.beginPath();
    DROPS.forEach(d => { const y = ((d[1] + (reduced ? 0 : t / 900 * d[2])) % 1) * (H_ + 40) - 20, x = d[0] * W_; rctx.moveTo(x, y); rctx.lineTo(x - 3, y + 16 * d[2]); });
    rctx.stroke();
  }

  /* ======================================================================
     POSISI BACA → KEADAAN PETA
     ====================================================================== */
  let TOPS = [];
  function measure() { TOPS = els.map(el => el.offsetTop); }
  function position() {
    const y = read.scrollTop + read.clientHeight * .42;
    let lo = 0, hi = TOPS.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (TOPS[m] <= y) lo = m; else hi = m - 1; }
    const i = lo, next = i + 1 < TOPS.length ? TOPS[i + 1] : TOPS[i] + 400;
    return [i, clamp((y - TOPS[i]) / Math.max(1, next - TOPS[i]), 0, 1)];
  }
  let lastI = -1, lastNoteI = -1, lockT = 0, state = SNAP[0];
  function frame(force) {
    const [i, t] = position();
    state = i + 1 < SNAP.length ? mix(SNAP[i], SNAP[i + 1], t) : SNAP[i];
    draw(state);
    // sekali lewat ke bawah: layar dikunci
    if (lastI >= 0 && lastI < LOCK_I && i >= LOCK_I && !force) lockScreen();
    // "Aku mencoret kalimat di bawah tabel." Lalu, entah kenapa, tidak menghapusnya.
    if (STRUCK_I >= 0) els[STRUCK_I].classList.toggle('struck', i >= STRIKE_I);
    if (TABLE_I >= 0) els[TABLE_I].classList.toggle('seen', i >= TABLE_I - 1);
    lastI = i;
    // bilah status ponsel
    $('#status').classList.toggle('on', state.phone > .5);
    $('#stTime').textContent = CLOCK[i] || '';
    if (i !== lastNoteI) {
      lastNoteI = i;
      const tt = $('#stTitle'); tt.textContent = NOTE_AT[i] || ''; tt.classList.toggle('on', !!NOTE_AT[i]);
      $$('.folder button', story).forEach(b => b.classList.toggle('new', (NOTE_IDX[b.dataset.note] ?? 0) > i));
    }
    notifyAt(i);
    const bat = Math.round(state.bat); $('#stBat').textContent = bat + '%';
    $('#stBatBar').style.setProperty('--b', (bat / 100).toFixed(2)); $('#stBatBar').classList.toggle('low', bat <= 20);
    // di atas peta
    $('#sky').style.opacity = state.sky.toFixed(3);
    rcv.style.opacity = state.rain.toFixed(3);
    const hud = $('#hud'); hud.hidden = state.hud < .5;
    if (!hud.hidden) { const f = state.route === 'gang' ? state.rp : 1; $('#hudMap').textContent = Math.round(141 * f) + ' m'; $('#hudWheel').textContent = Math.round(203 * f) + ' m'; }
    pinchHint.hidden = pinched || !(i >= C8[0] && i < C8[1] - 2) || reduced;
    if (!pinchHint.hidden) { pinchHint.style.left = FX + 'px'; pinchHint.style.top = (mobile ? state.band * H_ - 56 : H_ - 96) + 'px'; }
    const st = $('#sticker'); st.hidden = state.sticker < .02;
    if (!st.hidden) { st.style.left = FX + 'px'; st.style.top = FY + 'px'; st.style.setProperty('--s', state.sticker.toFixed(3)); }
    if (mobile) document.documentElement.style.setProperty('--band', (state.band * 100).toFixed(2) + 'vh');
    // instruksi rute terakhir yang terlewati, seperti layar navigasi
    const chip = $('#navChip'); let ins = -1;
    if ((state.route === 'garuda' || state.route === 'sekar') && state.span < 6000) for (let k = i; k >= 0 && k > i - 40; k--) if (INSTR[k] >= 0) { ins = k; break; }
    chip.hidden = ins < 0 || state.dot < .5;
    if (!chip.hidden) { const txt = flow[ins].text.replace(/\*/g, ''); if (chip.dataset.t !== txt) { chip.dataset.t = txt; chip.className = 'nav-chip' + (/tiba/i.test(txt) ? ' arrive' : ''); chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_TURN[turnOf(txt)]}</svg>${esc(txt)}`; } chip.style.left = FX + 'px'; chip.style.top = (mobile ? 12 : 24) + 'px'; }
  }
  function lockScreen() {
    const l = $('#lock'); l.classList.add('on'); clearTimeout(lockT);
    lockT = setTimeout(() => l.classList.remove('on'), reduced ? 2000 : 3400);
  }

  // gambar ulang saat posisi baca berubah; selebihnya cukup sesekali untuk denyut titik biru dan hujan
  let raf = 0, dirty = true, lastDraw = 0;
  read.addEventListener('scroll', () => { dirty = true; }, { passive: true });
  const loop = now => {
    if (dirty || (!reduced && now - lastDraw > 50)) { frame(); rain(now); lastDraw = now; dirty = false; }
    raf = requestAnimationFrame(loop);
  };
  addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); raf = requestAnimationFrame(loop); });
  document.fonts?.ready.then(() => measure());
  new ResizeObserver(() => measure()).observe(story);

  /* ======================================================================
     "DARI MANA?"
     ====================================================================== */
  const askIn = $('#askIn');
  function syncAnswer() {
    const a = answer();
    if (askIn && document.activeElement !== askIn) askIn.value = a;
    $('#askSaid') && ($('#askSaid').textContent = a ? `Dari ${a}.` : '');
    const from = $('#from'); if (from) from.innerHTML = a ? `Dari <b>${esc(a)}</b>.<br>Tapi sekarang kamu di sini.` : 'Kamu di sini.';
  }
  if (askIn) {
    askIn.addEventListener('input', () => { store.set('darimana', askIn.value.trim().slice(0, 60)); syncAnswer(); });
    const go = () => { askIn.blur(); const part = els[flow.findIndex(f => f.text.startsWith('## Bagian Satu'))]; part && read.scrollTo({ top: part.offsetTop - read.clientHeight * .2, behavior: reduced ? 'auto' : 'smooth' }); };
    askIn.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('#askGo').addEventListener('click', go);
  }
  syncAnswer();

  /* ======================================================================
     PROGRES BACA: tercatat di meja tulis seperti tulisan lain
     ====================================================================== */
  {
    const r = store.get('read', []); if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
    const st = store.get('stats', {}); st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  let saveT = 0;
  function onScroll() {
    const max = read.scrollHeight - read.clientHeight, f = max > 0 ? read.scrollTop / max : 0;
    $('#pct').textContent = Math.round(f * 100) + '%';
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const pr = store.get('prog', {}); pr[SLUG] = +f.toFixed(3); store.set('prog', pr);
      if (f > .97) { const st = store.get('stats', {}); st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); } }
    }, 500);
  }
  read.addEventListener('scroll', onScroll, { passive: true });
  read.addEventListener('scroll', () => read.classList.toggle('moved', read.scrollTop > 60), { passive: true });
  {
    const f = store.get('prog', {})[SLUG];
    if (f > .03 && f < .97) {
      const b = $('#resume'); b.hidden = false; b.textContent = `Lanjutkan dari ${Math.round(f * 100)}%`;
      b.addEventListener('click', () => { read.scrollTo({ top: f * (read.scrollHeight - read.clientHeight), behavior: reduced ? 'auto' : 'smooth' }); b.hidden = true; });
      read.addEventListener('scroll', () => { if (read.scrollTop > 1200) b.hidden = true; }, { passive: true });
    }
  }

  /* ---------- ukuran huruf, sama dengan pengaturan di meja tulis ---------- */
  const rd = store.get('rd', {}) || {};
  let size = clamp(+rd.size || 19, 15, 26);
  const applySize = () => { document.documentElement.style.setProperty('--size', size + 'px'); requestAnimationFrame(measure); };
  applySize();
  const keep = fn => { const [i, t] = position(); fn(); applySize(); requestAnimationFrame(() => { measure(); const next = TOPS[i + 1] ?? TOPS[i] + 400; read.scrollTop = TOPS[i] + t * (next - TOPS[i]) - read.clientHeight * .42; }); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').addEventListener('click', () => keep(() => { size = clamp(size - 1, 15, 26); }));
  $('#bigger').addEventListener('click', () => keep(() => { size = clamp(size + 1, 15, 26); }));

  /* ---------- dibacakan: peta ikut berjalan bersama suaranya ---------- */
  let speaking = false, sTok = 0;
  // yang dibacakan: paragraf, stempel, judul, daftar; tabel dan kolom isian dilewati
  const SAY = els.map((el, i) => (/^<(p|ul|ol|header|h2)/.test(flow[i].html) && !/class="(byline|icon-fig)/.test(flow[i].html) ? el.textContent.replace(/\s+/g, ' ').trim() : ''));
  function speakFrom(i) {
    const tok = ++sTok;
    const voice = speechSynthesis.getVoices().find(v => /^id|indones/i.test(v.lang + v.name));
    const next = k => {
      if (tok !== sTok) return;
      while (k < SAY.length && !SAY[k]) k++;
      if (k >= SAY.length) { stopSpeak(); return; }
      $$('.speaking', story).forEach(e => e.classList.remove('speaking'));
      els[k].classList.add('speaking');
      read.scrollTo({ top: els[k].offsetTop - read.clientHeight * .42 + 4, behavior: reduced ? 'auto' : 'smooth' });
      const u = new SpeechSynthesisUtterance(SAY[k]); u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .95;
      u.onend = () => next(k + 1); u.onerror = () => { if (tok === sTok) next(k + 1); };
      speechSynthesis.speak(u);
    };
    next(i);
  }
  function stopSpeak() { sTok++; speaking = false; if ('speechSynthesis' in window) speechSynthesis.cancel(); $$('.speaking', story).forEach(e => e.classList.remove('speaking')); $('#listen').setAttribute('aria-pressed', 'false'); }
  $('#listen').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) { toast('Peramban ini belum bisa membacakan teks.'); return; }
    if (speaking) { stopSpeak(); return; }
    speaking = true; $('#listen').setAttribute('aria-pressed', 'true'); speakFrom(position()[0]);
  });

  /* ---------- cerita bisa dibagikan ---------- */
  $('#tell').addEventListener('click', async () => {
    const pro = flow.filter(f => f.html.startsWith('<p>')).map(f => f.text);
    const legend = [pro[0], 'Kalau kamu membukanya, ia tidak bertanya kamu mau ke mana.', 'Ia bertanya kamu dari mana.'].join('\n\n');
    const url = location.href.split('?')[0].split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: 'Anda di Sini', text: legend, url });
      else { await navigator.clipboard.writeText(legend + '\n\n' + url); toast('Legendanya disalin. Ceritakan pada seseorang.'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Tidak bisa menyalin otomatis.'); }
  });

  /* ---------- pukul 03.00 sampai 03.33 ---------- */
  {
    const n = new Date();
    if (n.getHours() === 3 && n.getMinutes() <= 33) {
      const g = $('#ghostIcon'); g.hidden = false;
      g.addEventListener('click', () => toast('Anda di sini.', 3600));
    }
  }

  /* ---------- aplikasi Catatan: folder dan tombol kembali ---------- */
  const scrollToEl = (el, off = 96) => el && read.scrollTo({ top: el.offsetTop - off, behavior: reduced ? 'auto' : 'smooth' });
  story.addEventListener('click', e => { const b = e.target.closest('.folder [data-note]'); if (b) scrollToEl($('#catatan-' + b.dataset.note)); });
  $('#stBack').addEventListener('click', () => { const f = FOLDER_AT[position()[0]]; if (f >= 0) scrollToEl(els[f], 140); });

  /* ---------- NOTIFIKASI: ponselnya hidup di sekitar catatan-catatan itu ----------
     Setiap notifikasi terikat pada satu kalimat dan muncul sekali saat kalimat itu terbaca sambil
     menggulir ke bawah. Kalau pembaca kembali jauh ke atas, ia boleh muncul lagi. */
  const NF_ICON = {
    tel: '<svg viewBox="0 0 24 24"><path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-3.8A8 8 0 1 1 8.1 19z"/></svg>',
    set: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M2.8 12h2.6M18.6 12h2.6M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/></svg>',
    loc: '<svg viewBox="0 0 24 24"><path d="M20 4 4 11l7 2 2 7z"/></svg>',
    bat: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11.5v2"/><path d="M6 11v3" stroke="#FF453A"/></svg>',
    jam: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M5 4.5 3 6.5M19 4.5l2 2"/></svg>',
    peta: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    cal: '<small>AGU</small>9', ghost: ''
  };
  const NOTIFS = [
    { at: 'Malam ini, waktu mencari berkas di menu pengaturan', items: [{ ic: 'set', app: 'Pengaturan', t: 'Instal aplikasi tak dikenal', b: 'WhatsApp diizinkan memasang aplikasi dari sumber tak dikenal.' }] },
    { at: 'Aku tidak ingat pernah memberi izin lokasi', items: [{ ic: 'loc', app: 'Lokasi', t: 'Lokasi dipakai di latar belakang', b: 'Sebuah aplikasi tanpa nama mengakses lokasimu. Izin: Selalu.' }] },
    { at: 'Aku terbangun pukul 09.05.', stay: 9000, items: [{ ic: 'wa', app: 'WhatsApp', when: '08.03', t: 'Wulan', b: 'Rapat mulai jam 8. Kamu di mana?' }, { ic: 'tel', app: 'Telepon', when: '08.12', t: 'Kantor', b: '2 panggilan tak terjawab' }] },
    { at: 'Tanggal 9 Agustus jatuh hari Jumat depan.', items: [{ ic: 'cal', app: 'Kalender', when: 'Jumat depan', t: '9 Agustus', b: 'Pengingat tahunan' }] },
    { at: 'Aku membuka aplikasi peta biasa', items: [{ ic: 'peta', app: 'Peta', t: 'Sinyal GPS lemah', b: 'Lokasimu mungkin tidak akurat. Akurasi ±2 km.' }] },
    { at: 'Jalan semen itu berakhir di sebuah dermaga', items: [{ ic: 'bat', app: 'Baterai', t: 'Baterai lemah', b: 'Tersisa 18%. Nyalakan Penghemat Baterai?' }] },
    { at: 'Ponselku hangat di tanganku.', items: [{ ic: 'bat', app: 'Baterai', t: 'Baterai 13%', b: 'Penghemat Baterai menyala.' }] },
    { at: 'Aku tidur sebelas jam.', items: [{ ic: 'jam', app: 'Jam', when: '06.00', t: 'Alarm', b: 'Terlewat' }] },
    { at: 'Pagi ini aku membuka halaman ketiga di ponselku.', items: [{ ic: 'ghost', app: 'Sistem', t: 'Aplikasi dihapus', b: 'Aplikasi tanpa nama tidak lagi terpasang di perangkat ini.' }] },
    // yang terakhir bukan untuk si "aku". Untuk pembaca, di layarnya sendiri.
    { at: 'ANDA DI SINI.', screen: true, delay: 2600, stay: 0, items: [{ ic: 'ghost', app: '', when: 'sekarang', b: 'Dari mana?', go: 'ask' }] }
  ];
  { let from = 0; NOTIFS.forEach(n => { const k = flow.findIndex((f, j) => j >= from && f.text.includes(n.at)); n.i = k; if (k >= 0) from = k; else console.warn('Notifikasi tanpa kalimat:', n.at); }); }
  const nfHost = $('#notifs'), fired = new Set();
  let nfPrev = -1;
  function placeNotifs(screen) {
    nfHost.classList.toggle('screen', !!screen);
    if (mobile) { nfHost.style.left = '10px'; nfHost.style.width = 'calc(100% - 20px)'; return; }
    const r = read.getBoundingClientRect(), w = Math.min(380, r.width - 32);
    nfHost.style.width = w + 'px';
    nfHost.style.left = (screen ? (W_ - w - 22) : (r.left + (r.width - w) / 2)) + 'px';
  }
  function dismiss(el) { if (!el.isConnected || el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 400); }
  function notify(n) {
    placeNotifs(n.screen);
    n.items.forEach((it, k) => {
      const el = document.createElement('div');
      el.className = 'notif'; el.dataset.src = n.i;
      el.innerHTML = `<span class="nf-ic ${it.ic}" aria-hidden="true">${NF_ICON[it.ic] || ''}</span><div><p class="nf-top"><b>${esc(it.app)}</b><time>${esc(it.when || 'sekarang')}</time></p>${it.t ? `<p class="nf-t">${esc(it.t)}</p>` : ''}<p class="nf-b">${esc(it.b)}</p></div>`;
      el.style.animationDelay = (k * 140) + 'ms';
      el.addEventListener('click', () => {
        if (it.go === 'ask') { const a = $('.ask'); scrollToEl(a, read.clientHeight * .25); setTimeout(() => $('#askIn')?.focus({ preventScroll: true }), reduced ? 0 : 900); }
        dismiss(el);
      });
      // usap ke atas untuk menyingkirkan
      let y0 = null;
      el.addEventListener('pointerdown', e => { y0 = e.clientY; });
      el.addEventListener('pointerup', e => { if (y0 != null && y0 - e.clientY > 24) dismiss(el); y0 = null; });
      nfHost.append(el);
      if (n.stay !== 0) setTimeout(() => dismiss(el), (n.stay || 6500) + k * 400);
    });
    [...nfHost.children].slice(0, -3).forEach(dismiss);
  }
  function notifyAt(i) {
    if (nfPrev >= 0 && i > nfPrev) NOTIFS.forEach(n => {
      if (n.i < 0 || fired.has(n) || !(nfPrev < n.i && i >= n.i) || i - n.i > 6) return;
      fired.add(n);
      setTimeout(() => notify(n), n.delay || 250);
    });
    // notifikasi yang kalimatnya sudah jauh tertinggal ikut pergi
    [...nfHost.children].forEach(el => { if (Math.abs(i - +el.dataset.src) > 14) dismiss(el); });
    // kembali jauh ke atas: notifikasi boleh muncul lagi saat kalimatnya terbaca ulang
    NOTIFS.forEach(n => { if (fired.has(n) && i < n.i - 4) fired.delete(n); });
    nfPrev = i;
  }

  /* ---------- peta ikut digulir, dan di Catatan 8 bisa dicubit ----------
     Menggulir atau menyeret di atas peta menggerakkan cerita, sama seperti menggulir teksnya.
     Selama Catatan 8, mencubit ke dalam (trackpad atau dua jari) memperkecil peta = membaca maju. */
  const C8 = [idxOf('Aku meletakkan dua jari di layar'), idxOf('Tidak ada lagi lingkaran.')];
  const inPinch = () => { const i = position()[0]; return i >= C8[0] - 1 && i <= C8[1]; };
  const pinchHint = $('#pinch');
  let pinched = false;
  cv.addEventListener('wheel', e => {
    if (e.ctrlKey) { if (!inPinch()) return; e.preventDefault(); pinched = true; read.scrollBy(0, e.deltaY * 6); return; }
    read.scrollBy(0, e.deltaY);
  }, { passive: false });
  let tch = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  cv.addEventListener('touchstart', e => { tch = e.touches.length === 2 ? { d: dist(e.touches) } : { y: e.touches[0].clientY }; }, { passive: true });
  cv.addEventListener('touchmove', e => {
    if (!tch) return;
    e.preventDefault();
    if (e.touches.length === 2) {
      const d = dist(e.touches);
      if (tch.d && inPinch()) { pinched = true; read.scrollBy(0, (tch.d - d) * 4); }
      tch = { d };
    } else if (tch.y != null) { const y = e.touches[0].clientY; read.scrollBy(0, tch.y - y); tch = { y }; }
  }, { passive: false });
  cv.addEventListener('touchend', () => { tch = null; });
  // keyboard: spasi, panah, PageDown langsung bekerja tanpa harus mengetuk teks dulu
  read.focus({ preventScroll: true });

  // kembali ke meja: kalau datang dari situs, cukup mundur satu langkah supaya pembaca kembali ke tempat asalnya
  $$('a[href="../../#putar"]').forEach(a => a.addEventListener('click', e => {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
  }));

  resize();
  raf = requestAnimationFrame(loop);
  if (location.hash === '#akhir') read.scrollTop = read.scrollHeight;
})();
