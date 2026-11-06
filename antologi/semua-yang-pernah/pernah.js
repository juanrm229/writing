/* Semua yang Pernah: novella Titik Biru, dibaca di ponsel Elias Venn.
   Bagian bawah: aplikasi Catatan berisi naskah utuh (dimuat dari content/works.json).
   Bagian atas: layar ponsel yang sama. Ia hidup mengikuti kalimat yang sedang dibaca: pesan dari Mara, tautan dari Soren,
   video penggemar, forum Arsip Nol, aplikasi peta tanpa nama, telepon, rekaman, foto, surel, kalender.
   - Isi layar ditulis di layar.js (LAYAR). Setiap ketukan menempel pada satu paragraf; layar selalu bisa disusun ulang
     dari ketukan terakhir sebelum posisi baca, jadi menggulir mundur dan melompat bab tetap benar.
   - Garis bawah layar membuka beranda. Semua aplikasi bisa dibuka; isinya hanya yang sudah terjadi sampai halaman ini.
     Selama kau menjelajah, cerita tidak merebut layar; yang baru datang sebagai notifikasi. "Ikuti cerita" mengembalikannya.
   - Di bab yang diceritakan dari sisi orang lain, layar berganti menjadi milik mereka (ponsel Mara, komputer Damar, ...).
   - Di akhir: halaman kosong. Elias tidak menulis apa pun. Kau juga tidak harus. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'pernah', 'darimana'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'semua-yang-pernah', G = window.JMGuide, root = document.documentElement, L = window.LAYAR || { beats: [] }, NET = window.INTERNET || {};
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const seeded = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  if (!work || !Array.isArray(work.chapters)) { story.innerHTML = '<p class="loading">Catatan ini belum bisa dibuka. <a href="../../">Kembali</a></p>'; return; }
  if ((qs.get('lang') || store.get('lang', 'id')) === 'en') { $('#lost').hidden = false; $('#lost').textContent = 'This novella is only available in Indonesian for now.'; }

  const isBreak = p => !/[\p{L}\p{N}]/u.test(plain(p));
  const CH = work.chapters.map((c, i) => {
    const m = /^(.+?)\s+[—–-]\s+(.+)$/.exec(c.title || '');
    return { i, num: m ? m[1] : String(i), name: m ? m[2] : c.title, body: c.body || [] };
  });
  let gN = 0;
  const PARA = []; // { c, i, el }
  story.innerHTML = CH.map(c => `<section class="ch" id="bab-${c.i}" data-c="${c.i}"><h2><span class="n">${esc(/^\d+$/.test(c.num) ? c.num.padStart(2, '0') : c.num)}</span><span class="t">${inline(c.name)}</span></h2>${c.body.map((p, i) => {
    if (isBreak(p)) return '<p class="brk" aria-hidden="true">· · ·</p>';
    const g = gN++; PARA.push({ c: c.i, i, text: plain(p) });
    const chat = /^\*\*[^*]+:\*\*/.test(p) ? ' chatline' : '';
    const doc = /^\*\*\d+ [A-Z][a-z]+\*\*$/.test(p) ? ' dated' : '';
    return `<p data-g="${g}" class="${(chat + doc).trim()}">${inline(p)}</p>`;
  }).join('')}</section>`).join('');
  $$('#story p[data-g]').forEach((el, g) => { PARA[g].el = el; });
  const TOTAL = PARA.length;

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, max: -1, at: 0, follow: true, big: false, size: 19, blank: '' });
  let S = { ...blank(), ...(store.get('pernah', null) || {}) };
  if (S.v !== 1) S = blank();
  const save = () => store.set('pernah', S);

  /* ---------- ketukan layar ---------- */
  const findG = (c, at) => {
    const needle = plain(at);
    for (let g = 0; g < TOTAL; g++) if (PARA[g].c === c && PARA[g].text.includes(needle)) return g;
    return -1;
  };
  const MISSING = [];
  const BEATS = (L.beats || []).map((b, k) => {
    let g = b.c != null && b.at != null ? findG(b.c, b.at) : (b.c != null ? PARA.findIndex(p => p.c === b.c) : -1);
    if (g < 0) { MISSING.push(b.at || b.c); return null; }
    const end = b.span ? findG(b.c, b.span) : -1;
    return { ...b, g, end, k };
  }).filter(Boolean).sort((a, b) => a.g - b.g || a.k - b.k);
  if (MISSING.length) console.warn('Ketukan layar yang tidak menemukan paragrafnya:', MISSING);
  BEATS.forEach((b, i) => { b.idx = i; });

  // menyusun isi ponsel sampai ketukan ke-i: pesan, riwayat peramban, foto, surel, telepon, ...
  function fold(i) {
    const st = { t: L.start?.t || '21.12', date: L.start?.date || '', threads: new Map(), pages: new Map(), photos: [], mails: [], calls: [], tracks: [], recs: new Map(), docs: new Map(), cal: null, map: null, tb: false, lock: [] };
    for (let k = 0; k <= i && k < BEATS.length; k++) {
      const b = BEATS[k];
      if (b.t) st.t = b.t;
      if (b.dev) continue;
      if (b.date) st.date = b.date; // layar orang lain tidak masuk ke ponsel Elias
      if (b.tb) st.tb = true;
      if (b.v === 'chat') {
        const th = st.threads.get(b.with) || { with: b.with, sub: b.sub || '', msgs: [], t: st.t };
        (b.msgs || []).forEach(m => th.msgs.push({ m, t: st.t, k }));
        if (b.sub) th.sub = b.sub; th.t = st.t; th.k = k;
        st.threads.delete(b.with); st.threads.set(b.with, th);
      }
      if (b.v === 'web') {
        const old = st.pages.get(b.url), base = NET[b.url];
        const pg = old ? { ...old, ...(base ? {} : (b.page || {})), more: [...(old.more || []), ...(b.more || [])] } : { ...(b.page || {}), ...(base || {}), url: b.url, more: b.more || [] };
        st.pages.delete(b.url); st.pages.set(b.url, pg);
      }
      if (b.v === 'photo') st.photos.push({ ...b.photo, t: st.t });
      if (b.v === 'chat') (b.msgs || []).forEach(m => { if (m[1] === 'ph') st.photos.push({ cap: m[2], meta: `Dari ${m[0] === 'out' ? 'aku untuk ' + b.with : b.with}`, tone: m[3] || 'warm', src: m[4], t: st.t }); });
      if (b.v === 'mail') st.mails.push({ ...b.mail, t: st.t });
      if (b.v === 'call' && b.state === 'ended') st.calls.push({ with: b.with, dur: b.dur, t: st.t, video: b.video });
      if (b.v === 'music') st.tracks.push({ ...b.track });
      if (b.v === 'rec') st.recs.set(b.rec.title, { ...(st.recs.get(b.rec.title) || {}), ...b.rec });
      if (b.v === 'doc') st.docs.set(b.doc.title, { ...b.doc });
      if (b.v === 'cal') st.cal = b.cal;
      if (b.v === 'map') st.map = { ...b.map };
      if (b.v === 'lock' && b.n) st.lock = b.keep ? [...st.lock, ...b.n] : b.n;
    }
    return st;
  }

  /* ---------- ikon aplikasi ---------- */
  const GLYPH = {
    pesan: '<path d="M4 11.5C4 7.4 7.6 4.5 12 4.5s8 2.9 8 7-3.6 7-8 7c-1 0-2-.1-2.9-.4L5 19.5l1.2-3.2C4.8 15 4 13.3 4 11.5z"/>',
    telepon: '<path d="M7.2 3.8 9.6 4.4l1.1 4-2 1.5a12 12 0 0 0 5.4 5.4l1.5-2 4 1.1.6 2.4c-.3 1.6-1.7 2.6-3.3 2.4C10.4 18.4 5.6 13.6 4.8 7.1c-.2-1.6.8-3 2.4-3.3z"/>',
    web: '<circle cx="12" cy="12" r="8"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    musik: '<path d="M9 17.5V6.5l10-2v11"/><circle cx="6.8" cy="17.5" r="2.3"/><circle cx="16.8" cy="15.5" r="2.3"/>',
    foto: '<circle cx="12" cy="12" r="3.2"/><path d="M12 4.5v4M12 15.5v4M4.5 12h4M15.5 12h4M6.7 6.7l2.8 2.8M14.5 14.5l2.8 2.8M17.3 6.7l-2.8 2.8M9.5 14.5l-2.8 2.8"/>',
    surel: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m4 7 8 6 8-6"/>',
    rekaman: '<path d="M4 12h1.5M7 9v6M10 6v12M13 9.5v5M16 7.5v9M19 11v2"/>',
    kalender: '',
    catatan: '<path d="M6 8h12M6 12h12M6 16h8"/>',
    setel: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18"/>',
    arsip: '<path d="M4 7h16v3H4zM5.5 10v8.5h13V10M10 13.5h4"/>'
  };
  const APPS = [
    ['pesan', 'Pesan'], ['telepon', 'Telepon'], ['web', 'Peramban'], ['musik', 'Musik'],
    ['foto', 'Foto'], ['surel', 'Surel'], ['kalender', 'Kalender'], ['rekaman', 'Rekaman'],
    ['catatan', 'Catatan'], ['setel', 'Pengaturan']
  ];
  const icon = (id, extra = '') => id === 'tb' ? `<span class="ic tb${extra}" aria-hidden="true"></span>`
    : id === 'kalender' ? (() => { const m = /^(\w{3})\w*,\s*(\d+)/.exec(TODAY || ''); return `<span class="ic kalender${extra}" aria-hidden="true"><small>${esc(m ? m[1].toUpperCase() : 'SEL')}</small><b>${esc(m ? m[2] : '3')}</b></span>`; })()
    : `<span class="ic ${id}${extra}" aria-hidden="true"><svg viewBox="0 0 24 24">${GLYPH[id] || ''}</svg></span>`;
  let TODAY = L.start?.date || '';
  // foto profil kontak (foto/av-*.jpg); yang lain memakai inisial
  const AV = { 'Mara': 'mara', 'Jonah': 'jonah', 'Yuna': 'yuna', 'Soren': 'soren', 'Hollow Atlas': 'hollowatlas', 'Eli': 'eli', 'Tio Jalan Layang': 'tio', 'Suri': 'suri', 'Alma Riedel': 'alma' };
  const avatar = (name, cls = '') => AV[name] ? `<span class="av img ${cls}" style="background-image:url('foto/av-${AV[name]}.jpg')" aria-hidden="true"></span>` : `<span class="av ${cls}" style="--h:${Math.floor(seeded(name)() * 360)}" aria-hidden="true">${esc((name || '?').replace(/^[^A-Za-z0-9]+/, '')[0] || '?')}</span>`;

  /* ---------- potongan tampilan ---------- */
  const photoTile = (p, big) => `<figure class="ph tone-${esc(p.tone || 'warm')}${p.src ? ' real' : ''}${big ? ' big' : ''}${p.half ? ' half' : ''}"${p.src ? ` style="--img:url('${esc(p.src)}')"` : ''}><i class="grain" aria-hidden="true"></i>${p.half ? `<i class="rekon" aria-hidden="true"><span>${esc(p.half === true ? 'bagian yang direkonstruksi' : p.half)}</span></i>` : ''}<figcaption>${inline(p.cap || '')}</figcaption></figure>`;
  const wave = (seed, n = 48, pos = -1) => { const r = seeded(seed); return `<span class="wave" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i style="--v:${(.18 + r() * .82).toFixed(2)}"${pos >= 0 && k / n < pos ? ' class="on"' : ''}></i>`).join('')}</span>`; };
  const msgHTML = (m, who) => {
    const [d, kind, s, x, src] = m;
    if (d === 'sys') return `<p class="sys">${inline(kind)}</p>`;
    const cls = `m ${d === 'out' ? 'out' : 'in'}`;
    if (kind === 'ph') return `<div class="${cls} mph">${photoTile({ cap: s, tone: x, src })}</div>`;
    if (kind === 'vo') return `<div class="${cls} mvo"><button type="button" class="vo-p" aria-label="Putar rekaman suara" data-vo>▶</button>${wave(s + who, 26)}<small>${esc(x || '0:42')}</small></div>`;
    if (kind === 'link') return `<div class="${cls} mlink"><span class="ln-s">${esc(x || '')}</span><b>${inline(s)}</b></div>`;
    if (kind === 'like') return `<div class="${cls} mlike" aria-label="tanda suka">♥</div>`;
    return `<div class="${cls}">${inline(kind)}</div>`;
  };

  const H = {}; // penyusun layar per jenis
  const head = (title, { back = 'home', sub = '', right = '', cls = '' } = {}) => `<header class="ap-h ${cls}"><button type="button" class="ap-back" data-nav="${esc(back)}" aria-label="Kembali"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg></button><span class="ap-t"><b>${inline(title)}</b>${sub ? `<small>${inline(sub)}</small>` : ''}</span><span class="ap-r">${right}</span></header>`;

  const compose = (b, ph = '') => `<div class="cmp"><span class="cmp-f${b.draft ? ' has' : ''}"><span class="cmp-t" data-draft="${esc(b.draft || '')}" data-erase="${b.erase ? 1 : 0}" data-keep="${esc(b.keep || '')}" data-ph="${esc(ph)}">${esc(b.erase ? (b.keep || '') : (b.draft || ''))}</span><i class="caret"></i></span><span class="cmp-s" aria-hidden="true">↑</span></div>`;
  H.chat = (b, st) => {
    const th = st.threads.get(b.with) || { msgs: (b.msgs || []).map(m => ({ m, t: st.t })), sub: b.sub || '' };
    const msgs = b.dev ? (b.msgs || []).map(m => ({ m })) : th.msgs;
    const last = msgs.length;
    return `<div class="ap chat">${head(b.with, { back: 'pesan', sub: b.typing ? 'sedang mengetik…' : (th.sub || b.sub || ''), right: avatar(b.with) })}
      <div class="ap-b chat-b" data-scroll-end>${msgs.map((x, n) => `<div class="mw${n >= last - (b.msgs || []).length ? ' new' : ''}">${msgHTML(x.m, b.with)}</div>`).join('')}${b.typing ? '<div class="mw typing-w"><div class="m in typing" aria-label="sedang mengetik"><i></i><i></i><i></i></div></div>' : ''}${b.read ? `<p class="seen">${esc(b.read)}</p>` : ''}</div>
      ${compose(b)}</div>`;
  };

  // markah sederhana untuk halaman panjang: subjudul, kutipan, butir, catatan kaki
  const rich = (arr, pcls = '') => {
    let out = '', list = [];
    const flush = () => { if (list.length) { out += `<ul>${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`; list = []; } };
    (arr || []).forEach(p => {
      p = String(p);
      if (p.startsWith('• ')) { list.push(p.slice(2)); return; }
      flush();
      const im = /^!\[(.*)\]\((.+)\)$/.exec(p);
      if (im) out += `<figure class="inl"><img src="${esc(im[2])}" alt="" loading="lazy"><figcaption>${inline(im[1])}</figcaption></figure>`;
      else if (p.startsWith('## ')) out += `<h4>${inline(p.slice(3))}</h4>`;
      else if (p.startsWith('> ')) out += `<blockquote>${inline(p.slice(2))}</blockquote>`;
      else if (p.startsWith('^ ')) out += `<p class="fn">${inline(p.slice(2))}</p>`;
      else out += `<p${pcls ? ` class="${pcls}"` : ''}>${inline(p)}</p>`;
    });
    flush(); return out;
  };
  H.web = (b, st) => {
    const base = NET[b.url];
    const pg = (!b.dev && st.pages.get(b.url)) || { ...(b.page || {}), ...(base || {}), url: b.url, more: b.more || [] };
    const k = pg.kind || 'article';
    let body = pg.img ? `<figure class="hero"><img src="${esc(pg.img)}" alt="" loading="lazy">${pg.imgCap ? `<figcaption>${inline(pg.imgCap)}</figcaption>` : ''}</figure>` : '';
    if (k === 'images') body += `<p class="q">${inline(pg.title || '')}</p><div class="img-grid">${(pg.body || []).map(r => `<figure>${r[0] ? `<img src="${esc(r[0])}" alt="" loading="lazy">` : '<i></i>'}<figcaption>${inline(r[1] || '')}</figcaption></figure>`).join('')}</div>${pg.note ? `<p class="meta">${inline(pg.note)}</p>` : ''}`;
    else if (k === 'video') body = `<div class="vid${pg.thumb ? ' has-thumb' : ''}"${pg.thumb ? ` style="background-image:url('${esc(pg.thumb)}')"` : ''}><span class="vid-p" aria-hidden="true">▶</span><small>${esc(pg.dur || '14:32')}</small></div><h3 class="vid-t">${inline(pg.title || '')}</h3><p class="meta">${inline(pg.meta || '')}</p><div class="chan">${avatar(pg.by || 'kanal')}<b>${esc(pg.by || '')}</b><small>${esc(pg.subs || '')}</small></div><div class="desc">${rich(pg.body)}</div><p class="cm-h">Komentar <small>${esc(pg.count || '')}</small></p>`;
    else if (k === 'forum') body += `<p class="crumb">${inline(pg.crumb || 'Arsip Nol')}</p><h3 class="th-t">${inline(pg.title || '')}</h3>${pg.meta ? `<p class="meta">${inline(pg.meta)}</p>` : ''}${pg.body?.length ? `<div class="post-b">${rich(pg.body)}</div>` : ''}`;
    else if (k === 'wiki') body += `<h3 class="wk-t">${inline(pg.title || '')}</h3><p class="meta">${inline(pg.meta || '')}</p><table class="wk-box">${(pg.box || []).map(r => `<tr><th>${inline(r[0])}</th><td>${inline(r[1])}</td></tr>`).join('')}</table>${rich(pg.body)}`;
    else if (k === 'search') body += `<p class="q">${inline(pg.title || '')}</p>${(pg.body || []).map(r => `<div class="res"><small>${esc(r[0])}</small><b>${inline(r[1])}</b><span>${inline(r[2] || '')}</span></div>`).join('')}`;
    else if (k === 'paper') body += `<p class="jr">${inline(pg.journal || '')}</p><h3 class="pp-t">${inline(pg.title || '')}</h3><p class="pp-a">${inline(pg.authors || '')}</p><p class="meta">${inline(pg.affil || '')}</p><div class="abs"><b>Abstrak</b><p>${inline(pg.abstract || '')}</p><p class="kw"><b>Kata kunci:</b> ${inline(pg.keywords || '')}</p></div>${rich(pg.body)}`;
    else body += `${pg.kicker ? `<p class="kick">${inline(pg.kicker)}</p>` : ''}<h3 class="ar-t">${inline(pg.title || '')}</h3><p class="meta">${inline(pg.meta || '')}</p>${rich(pg.body)}`;
    const comments = [...(pg.comments || []), ...(pg.more || [])];
    const cm = comments.length ? `<div class="cms">${comments.map((c, n) => `<div class="cm${c[3] ? ' reply' : ''}${n >= comments.length - (b.more || []).length && b.more ? ' new' : ''}">${avatar(c[0], 'sm')}<div><p class="cm-u"><b>${esc(c[0])}</b>${c[2] ? `<small>${esc(c[2])}</small>` : ''}</p><p class="cm-b">${inline(c[1])}</p></div></div>`).join('')}</div>` : '';
    return `<div class="ap web k-${k}"><header class="url"><button type="button" class="ap-back" data-nav="web" aria-label="Riwayat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg></button><span class="url-f"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="10.5" width="12" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>${esc(String(pg.url || '').replace(/^https?:\/\//, '').split('/')[0])}</span></header><div class="ap-b web-b"${b.more || b.draft ? ' data-scroll-end' : ''}><article>${body}${cm}</article></div>${b.draft ? compose(b) : ''}</div>`;
  };

  // peta tanpa nama: jalan-jalan Saujana digambar dari benih, titik biru di tengah
  const MAPW = 400;
  function streets(seed) {
    const r = seeded(seed), out = [];
    const ang = (r() - .5) * .5;
    const rot = (x, y) => { const cx = x - 200, cy = y - 200; return [200 + cx * Math.cos(ang) - cy * Math.sin(ang), 200 + cx * Math.sin(ang) + cy * Math.cos(ang)]; };
    for (let k = -9; k <= 9; k++) {
      const pts = [], pts2 = [];
      for (let s = -4; s <= 12; s++) { pts.push(rot(-60 + s * 58 + (r() - .5) * 10, 200 + k * 46 + (r() - .5) * 16)); pts2.push(rot(200 + k * 52 + (r() - .5) * 18, -60 + s * 58 + (r() - .5) * 10)); }
      out.push({ d: 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L'), w: k % 3 === 0 ? 7 : 3.4 });
      out.push({ d: 'M' + pts2.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L'), w: k % 4 === 0 ? 6 : 3 });
    }
    return out;
  }
  function routePath(seed, len = 1) {
    const r = seeded('rute' + seed); let x = 200, y = 232, dir = r() * Math.PI * 2; const pts = [[x, y]];
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) { const l = (40 + r() * 70) * len; x += Math.cos(dir) * l; y += Math.sin(dir) * l; x = clamp(x, 40, 360); y = clamp(y, 60, 340); pts.push([x, y]); dir += (r() < .5 ? 1 : -1) * Math.PI / 2 * (.8 + r() * .3); }
    return pts;
  }
  H.map = (b, st) => {
    const m = b.map || st.map || {};
    const z = m.zoom == null ? 0 : m.zoom;
    const seed = m.place || 'Saujana';
    const st1 = streets(seed);
    const route = m.route || m.trail ? routePath(m.route || m.trail, m.len || 1) : null;
    const d = route ? 'M' + route.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L') : '';
    const end = route ? route[route.length - 1] : null;
    const sea = `M-200 ${300 + (seeded(seed)() * 40)} C 60 270, 200 360, 600 300 L600 700 L-200 700 Z`;
    const acc = m.acc == null ? 34 : m.acc;
    return `<div class="ap map${z > 0 ? ' zooming' : ''}${m.dark ? ' dusk' : ''}" data-zoom="${z}">
      <svg class="mp" viewBox="0 0 ${MAPW} ${MAPW}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect class="land" x="-400" y="-400" width="1200" height="1200"/>
        <g class="lay-street" style="transform-origin:200px 232px">
          <path class="sea" d="${sea}"/>
          ${st1.map(s => `<path class="rd-o" d="${s.d}" stroke-width="${s.w + 2}"/>`).join('')}${st1.map(s => `<path class="rd" d="${s.d}" stroke-width="${s.w}"/>`).join('')}
          ${m.tag ? `<g class="tag" transform="translate(${route ? end.join(' ') : '250 170'})"><circle r="5"/><text x="9" y="4">${esc(m.tag)}</text></g>` : ''}
          ${m.trail ? `<path class="trail" d="${d}"/>` : ''}${route && !m.trail ? `<path class="route" d="${d}" pathLength="1"/><path class="route-done" d="${d}" pathLength="1" stroke-dasharray="0 1"/><g class="pin" transform="translate(${end.join(' ')})"><path d="M0 0c-6-7-9-11-9-15a9 9 0 0 1 18 0c0 4-3 8-9 15z"/><circle cy="-15" r="3.4"/></g>` : ''}
        </g>
        <rect class="lay-sea" x="-400" y="-400" width="1200" height="1200"/>
        <g class="lay-land" style="transform-origin:200px 232px"><path d="M92 168 C 104 118, 150 96, 178 108 C 196 84, 238 80, 262 102 C 300 96, 334 128, 330 166 C 352 196, 338 236, 316 250 C 324 290, 290 322, 252 318 C 228 344, 180 340, 162 316 C 124 322, 92 296, 100 262 C 70 242, 72 200, 92 168 Z"/><path class="isle" d="M330 300 c 8 -6 20 -4 22 4 c 2 10 -12 14 -20 10 c -6 -3 -6 -10 -2 -14 Z"/></g>
        <g class="lay-globe"><circle cx="200" cy="232" r="120"/></g>
        <g class="lay-grid">${Array.from({ length: 13 }, (_, k) => `<path d="M${-100 + k * 50} -40 L${-40 + k * 50} 460"/><path d="M-40 ${-30 + k * 40} L440 ${-10 + k * 40}"/>`).join('')}</g>
        <g class="me"><circle class="acc" cx="200" cy="232" r="${acc}"/><path class="cone" d="M200 232 L186 196 A38 38 0 0 1 214 196 Z" style="transform-origin:200px 232px"/>
        <circle class="dot-h" cx="200" cy="232" r="11"/><circle class="dot" cx="200" cy="232" r="7.5"/></g>
        <text class="here" x="214" y="258">${m.here ? 'Anda di sini.' : ''}</text>
      </svg>
      <div class="mp-ask"><span class="ic tb sm" aria-hidden="true"></span><span class="mp-q">${esc(m.ask || 'Dari mana?')}</span><span class="mp-in" data-type="${esc(m.input || '')}">${esc(m.input || '')}</span>${m.free ? '<input class="mp-free" id="mpFree" maxlength="60" autocomplete="off" aria-label="Dari mana?">' : ''}</div>
      ${m.instr || m.arrive ? `<div class="mp-card">${m.arrive ? `<b>Anda telah tiba.</b><small>${esc(m.arrive === true ? '' : m.arrive)}</small>` : `<span class="turn" aria-hidden="true">↑</span><b>${esc(m.instr)}</b><small class="left"></small>`}</div>` : ''}
    </div>`;
  };

  H.lock = (b, st) => {
    const n = b.dev ? (b.n || []) : (b.n ? (b.keep ? st.lock : b.n) : st.lock);
    return `<div class="ap lock${b.dim ? ' dim' : ''}"><div class="lk-time"><small>${esc(b.date || L.start?.date || 'Jumat, 13 November')}</small><b>${esc(st.t)}</b></div>
      <div class="lk-n">${(() => {
        // seperti ponsel sungguhan: yang terbaru di atas; yang lama ditumpuk
        const fresh = (b.n || []).length, list = n.map((x, k) => ({ x, isNew: k >= n.length - fresh })).reverse();
        const shown = list.slice(0, 3), rest = list.length - shown.length;
        return shown.map(({ x, isNew }) => `<div class="lk-i${isNew ? ' new' : ''}">${icon(x[0])}<div><p><b>${inline(x[1])}</b><small>${esc(x[3] || 'sekarang')}</small></p><p>${inline(x[2])}</p></div></div>`).join('') + (rest > 0 ? `<p class="lk-more">${rest} notifikasi lainnya</p>` : '');
      })()}</div>
      ${b.cap ? `<p class="lk-cap">${inline(b.cap)}</p>` : ''}</div>`;
  };

  H.call = (b) => `<div class="ap call${b.video ? ' video' : ''}${b.bg ? ' has-bg' : ''} s-${b.state || 'live'}"${b.bg ? ` style="--bg:url('${esc(b.bg)}')"` : ''}><div class="cl-top">${avatar(b.with, 'xl')}<b>${esc(b.with)}</b><small class="cl-st" data-from="${b.from || 0}">${b.state === 'ended' ? `Panggilan berakhir · ${esc(b.dur || '')}` : b.state === 'ring' ? 'Memanggil…' : '00.00'}</small>${b.line ? `<p class="cl-line">${inline(b.line)}</p>` : ''}</div>
    ${b.video ? `<div class="cl-self" aria-hidden="true"><span>${esc(b.self || 'kamera mati')}</span></div>` : ''}
    <div class="cl-btn" aria-hidden="true"><span><i>🎙</i>bisukan</span><span><i>⌗</i>papan tombol</span><span><i>🔈</i>speaker</span></div><span class="cl-end" aria-hidden="true">✕</span></div>`;

  // lagu sungguhan (lagu.js): pemutar dengan lirik yang mengikuti lagu
  const SONG = window.LAGU || null;
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function songPlayer(tr) {
    const a = audio, t = a ? a.currentTime : 0, playing = a && !a.paused;
    return `<div class="ap music real" style="--h:205">
      <header class="mu-h"><button type="button" class="ap-back" data-nav="home" aria-label="Kembali"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg></button><span><small>Diputar dari album</small><b>${esc(SONG.album)}</b></span><span></span></header>
      <div class="mu-top"><div class="cover sm img" style="background-image:url('foto/album.jpg')"></div><div class="mu-meta"><b>${esc(SONG.title)}</b><small>${esc(SONG.artist)}${tr.note ? ` · ${inline(tr.note)}` : ''}</small></div><button type="button" class="mu-play${playing ? ' on' : ''}" data-song="toggle" aria-label="${playing ? 'Jeda' : 'Putar'}">${playing ? '❚❚' : '▶'}</button></div>
      <div class="mu-prog"><input type="range" class="mu-seek" min="0" max="${SONG.dur}" step="0.1" value="${t.toFixed(1)}" aria-label="Posisi lagu"><span class="mu-tt"><small class="mu-cur">${mmss(t)}</small><small>${mmss(SONG.dur)}</small></span></div>
      <div class="lyr" aria-label="Lirik">${SONG.lines.map((l, k) => `<p class="ly${l[3] ? ' ad' : ''}" data-k="${k}" data-t="${l[0]}">${esc(l[2])}</p>`).join('')}<p class="ly-end">♪</p></div>
    </div>`;
  }
  H.music = (b, st) => {
    const tr = b.track || st.tracks[st.tracks.length - 1] || {};
    if (SONG && tr.title === SONG.title) return songPlayer(tr);
    return `<div class="ap music">${head('Sedang diputar', { back: 'musik' })}<div class="ap-b mu-b"><div class="cover${tr.album === 'Low Tide Hymns' ? ' img' : ''}" style="${tr.album === 'Low Tide Hymns' ? "background-image:url('foto/album.jpg');" : ''}--h:${Math.floor(seeded(tr.album || tr.title || 'x')() * 360)}"><span>${esc(tr.artist || 'Hollow Atlas')}</span><b>${esc(tr.album || '')}</b></div><b class="mu-t">${inline(tr.title || '')}</b><small class="mu-a">${esc(tr.artist || '')}</small><span class="mu-bar"><i style="--p:${tr.p || .32}"></i></span><span class="mu-c" aria-hidden="true">⏮ ${tr.paused ? '▶' : '❚❚'} ⏭</span>${tr.note ? `<p class="mu-n">${inline(tr.note)}</p>` : ''}</div></div>`;
  };

  H.mail = (b, st) => {
    const ml = b.mail || st.mails[st.mails.length - 1] || {};
    return `<div class="ap mail">${head(ml.box || 'Kotak masuk', { back: 'surel' })}<div class="ap-b ml-b"><h3>${inline(ml.subj || '')}</h3><div class="ml-from">${avatar(ml.from || '?')}<p><b>${esc(ml.from || '')}</b><small>${esc(ml.to || 'kepada aku')} · ${esc(ml.when || st.t)}</small></p></div>${(ml.body || []).map(p => `<p>${inline(p)}</p>`).join('')}${(ml.att || []).length ? `<div class="ml-att">${ml.att.map(a => `<span><i>PDF</i>${esc(a)}</span>`).join('')}</div>` : ''}</div></div>`;
  };

  H.doc = (b, st) => {
    const dc = b.doc || {};
    return `<div class="ap doc">${head(dc.title || 'Dokumen', { back: dc.back || 'home', sub: dc.sub || '', right: (dc.who || []).map(w => avatar(w, 'sm')).join('') })}<div class="ap-b dc-b">${(dc.lines || []).map(l => typeof l === 'string' ? `<p>${inline(l)}</p>` : `<p class="${esc(l[1] || '')}">${l[1] === 'del' ? `<s>${inline(l[0])}</s>` : inline(l[0])}${l[2] ? `<small>${inline(l[2])}</small>` : ''}</p>`).join('')}${dc.foot ? `<p class="dc-f">${inline(dc.foot)}</p>` : ''}</div></div>`;
  };

  H.photo = (b) => `<div class="ap photo">${head(b.photo?.title || 'Foto', { back: 'foto', sub: b.photo?.meta || '', cls: 'dark' })}<div class="ap-b ph-b">${photoTile(b.photo || {}, true)}${b.photo?.note ? `<p class="ph-n">${inline(b.photo.note)}</p>` : ''}</div></div>`;

  H.rec = (b, st) => {
    const r = { ...(st.recs.get(b.rec?.title) || {}), ...(b.rec || {}) };
    const dur = r.dur || '46:12', pos = r.pos || '00:00';
    const sec = s => { const [a, c] = String(s).split(':').map(Number); return a * 60 + (c || 0); };
    return `<div class="ap rec">${head('Rekaman', { back: 'rekaman', sub: r.title || '' })}<div class="ap-b rc-b"><p class="rc-t">${inline(r.title || '')}</p><small class="rc-s">${esc(r.sub || '')}</small>${wave(r.title || 'rek', 64, sec(pos) / Math.max(1, sec(dur)))}<p class="rc-time"><b data-pos="${sec(pos)}" data-play="${r.state === 'play' ? 1 : 0}" data-dur="${sec(dur)}">${esc(pos)}</b><small>${esc(dur)}</small></p><span class="rc-c" aria-hidden="true">${r.state === 'play' ? '❚❚' : '▶'}</span>${(b.rec?.lines || []).length ? `<div class="rc-l">${b.rec.lines.map(l => `<p><b>${esc(l[0])}</b> ${inline(l[1])}</p>`).join('')}</div>` : ''}</div></div>`;
  };

  H.cal = (b, st) => {
    const c = b.cal || st.cal || { rows: [] };
    return `<div class="ap cal">${head(c.title || 'Kalender', { back: 'home', sub: c.sub || '' })}<div class="ap-b ca-b">${(c.rows || []).map(r => `<div class="ca-r${r[2] ? ' ' + esc(r[2]) : ''}"><b>${esc(r[0])}</b><span>${inline(r[1])}</span></div>`).join('')}${c.foot ? `<p class="dc-f">${inline(c.foot)}</p>` : ''}</div></div>`;
  };

  H.home = (b, st) => {
    const page = b.page || 1;
    const p1 = APPS.map(([id, nm]) => `<button type="button" class="app-i" data-nav="${id}">${icon(id)}<small>${esc(nm)}</small></button>`).join('');
    const p3 = (b.dev ? b.tb : (st.tb || b.tb)) ? `<button type="button" class="app-i${b.glow ? ' glow' : ''}" data-nav="peta">${icon('tb')}<small>&nbsp;</small></button>` : '';
    return `<div class="ap home"><div class="hm-pages" data-page="${page}"><div class="hm-g">${p1}</div><div class="hm-g"></div><div class="hm-g">${p3}</div></div><div class="hm-dots" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${n === page ? 'on' : ''}"></i>`).join('')}</div>${b.cap ? `<p class="hm-cap">${inline(b.cap)}</p>` : ''}</div>`;
  };

  // daftar per aplikasi (dibuka dari beranda)
  const LIST = {
    pesan: st => `<div class="ap list">${head('Pesan')}<div class="ap-b">${[...st.threads.values()].reverse().map(th => { const lm = th.msgs[th.msgs.length - 1]?.m || []; const txt = lm[1] === 'ph' ? 'Foto' : lm[1] === 'vo' ? 'Rekaman suara' : lm[1] === 'link' ? lm[2] : lm[1] === 'like' ? '♥' : lm[1] || ''; return `<button type="button" class="row" data-open="chat:${esc(th.with)}">${avatar(th.with)}<span><b>${esc(th.with)}</b><small>${inline(String(txt || ''))}</small></span><time>${esc(th.t)}</time></button>`; }).join('') || '<p class="empty">Belum ada pesan.</p>'}</div></div>`,
    web: st => `<div class="ap list">${head('Riwayat')}<div class="ap-b">${[...st.pages.values()].reverse().map(p => `<button type="button" class="row" data-open="web:${esc(p.url)}"><span class="fav" aria-hidden="true">${esc((p.url || '?').replace(/^https?:\/\//, '')[0].toUpperCase())}</span><span><b>${inline(p.title || p.url)}</b><small>${esc(p.url)}</small></span></button>`).join('') || '<p class="empty">Riwayat kosong.</p>'}</div></div>`,
    foto: st => `<div class="ap list">${head('Foto', { sub: st.photos.length ? `${st.photos.length} foto` : '' })}<div class="ap-b ph-grid">${st.photos.map((p, k) => `<button type="button" class="ph-cell" data-open="photo:${k}" aria-label="${esc(plain(p.cap || 'foto'))}">${photoTile(p)}</button>`).join('') || '<p class="empty">Belum ada foto yang disimpan di sini.</p>'}</div></div>`,
    surel: st => `<div class="ap list">${head('Kotak masuk')}<div class="ap-b">${st.mails.map((m, k) => [m, k]).reverse().map(([m, k]) => `<button type="button" class="row" data-open="mail:${k}">${avatar(m.from)}<span><b>${esc(m.from)}</b><small>${inline(m.subj || '')}</small></span><time>${esc(m.when || m.t)}</time></button>`).join('') || '<p class="empty">Tidak ada surel.</p>'}</div></div>`,
    telepon: st => `<div class="ap list">${head('Terbaru')}<div class="ap-b">${st.calls.slice().reverse().map(c => `<div class="row">${avatar(c.with)}<span><b>${esc(c.with)}</b><small>${c.video ? 'Video' : 'Suara'} · ${esc(c.dur || '')}</small></span><time>${esc(c.t)}</time></div>`).join('') || '<p class="empty">Belum ada panggilan.</p>'}</div></div>`,
    musik: st => SONG && (st.tracks.length || audio) ? H.music({ track: st.tracks[st.tracks.length - 1] || { title: SONG.title } }, st) : st.tracks.length ? H.music({ track: st.tracks[st.tracks.length - 1] }, st) : `<div class="ap list">${head('Musik')}<div class="ap-b"><p class="empty">Tidak ada yang diputar.</p></div></div>`,
    rekaman: st => `<div class="ap list">${head('Rekaman')}<div class="ap-b">${[...st.recs.values()].map(r => `<button type="button" class="row" data-open="rec:${esc(r.title)}"><span class="fav rc" aria-hidden="true">●</span><span><b>${inline(r.title)}</b><small>${esc(r.dur || '')}</small></span></button>`).join('') || '<p class="empty">Belum ada rekaman.</p>'}</div></div>`,
    kalender: st => st.cal ? H.cal({ cal: st.cal }, st) : `<div class="ap list">${head('Kalender')}<div class="ap-b"><p class="empty">Hari ini kosong.</p></div></div>`,
    peta: st => H.map({ map: st.map ? { ...st.map } : { ask: 'Dari mana?' } }, st),
    catatan: () => null,
    setel: st => `<div class="ap list">${head('Pengaturan')}<div class="ap-b"><div class="row"><span class="fav" aria-hidden="true">i</span><span><b>Tentang ponsel ini</b><small>Pemilik: Elias Venn</small></span></div>${st.tb ? `<div class="row">${icon('tb', ' sm')}<span><b>(tanpa nama)</b><small>Pengembang: kosong · Izin lokasi: selalu</small></span></div>` : ''}<div class="row"><span class="fav" aria-hidden="true">◐</span><span><b>Baterai</b><small>${battery()}%</small></span></div></div></div>`
  };

  /* ---------- layar ---------- */
  const screen = $('#screen'), app = $('#app');
  let cur = -2, follow = S.follow !== false, manual = null, live = [];
  const owner = $('#owner');
  function battery() { const f = (BEATS[cur]?.g || 0) / Math.max(1, TOTAL); return Math.round(96 - f * 71); }
  function paintStatus(st, b) {
    TODAY = (b && b.dev && b.date) || st.date;
    $('#osTime').textContent = st.t;
    const bt = battery(); $('#osBat').textContent = bt; screen.style.setProperty('--bat', bt + '%');
    const dev = follow && b && b.dev; owner.hidden = !dev; owner.textContent = dev ? b.dev : '';
    screen.classList.toggle('other', !!dev);
    screen.dataset.dev = dev ? b.devKind || 'phone' : '';
    screen.dataset.owner = dev && /Mara/.test(b.dev) ? 'mara' : '';
  }
  // baris menyala sedikit lebih awal, seperti pemutar lirik pada umumnya; mengikuti bingkai layar, bukan hanya timeupdate
  const LEAD = .1;
  let audio = null, lyOn = -2, seeking = false, raf = 0, userScroll = 0;
  const loop = () => { raf = 0; if (!audio || audio.paused) return; songTick(false); raf = requestAnimationFrame(loop); };
  function songEl() {
    if (audio || !SONG) return audio;
    audio = new Audio(SONG.src); audio.preload = 'metadata';
    ['timeupdate', 'play', 'pause', 'ended', 'seeked'].forEach(ev => audio.addEventListener(ev, () => { songTick(ev === 'seeked' || ev === 'ended'); if (ev === 'play' && !raf) raf = requestAnimationFrame(loop); }));
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: SONG.title, artist: SONG.artist, album: SONG.album }); } catch (e) { /* tidak didukung */ }
      navigator.mediaSession.setActionHandler?.('play', () => audio.play());
      navigator.mediaSession.setActionHandler?.('pause', () => audio.pause());
    }
    return audio;
  }
  function songToggle() { const a = songEl(); if (!a) return; if (a.paused) { if (a.ended) a.currentTime = 0; a.play().catch(() => announce('Lagu belum bisa diputar.')); } else a.pause(); }
  function lyricAt(t) {
    let k = -1; for (let i = 0; i < SONG.lines.length; i++) { if (SONG.lines[i][0] <= t + LEAD) k = i; else break; }
    // redup hanya di jeda instrumental yang panjang; jeda napas antarbaris tetap menyala
    if (k >= 0) { const nx = SONG.lines[k + 1], end = SONG.lines[k][1]; if (t > end + .6 && (!nx || nx[0] - end > 2.5)) return { k, gap: true }; }
    return { k, gap: false };
  }
  function songTick(force) {
    if (!audio) return;
    const t = audio.currentTime, playing = !audio.paused, { k, gap } = lyricAt(t);
    if (window.SFX) window.SFX.duck = playing;
    const pl = $('.music.real', app);
    if (pl) {
      const bt = $('.mu-play', pl); bt.textContent = playing ? '❚❚' : '▶'; bt.classList.toggle('on', playing); bt.setAttribute('aria-label', playing ? 'Jeda' : 'Putar');
      const sk = $('.mu-seek', pl); if (!seeking) sk.value = t.toFixed(1); sk.style.setProperty('--p', (t / SONG.dur * 100).toFixed(2) + '%');
      $('.mu-cur', pl).textContent = mmss(t);
      const on = gap ? -1 : k;
      if (on !== lyOn || force) {
        lyOn = on;
        $$('.ly', pl).forEach(el => { const i = +el.dataset.k; el.classList.toggle('on', i === on); el.classList.toggle('past', i < k || (gap && i === k)); });
        const box = $('.lyr', pl), el = on >= 0 ? $(`.ly[data-k="${on}"]`, pl) : (k >= 0 ? $(`.ly[data-k="${k}"]`, pl) : null);
        // sebelum baris pertama (atau sesudah diulang dari awal): kembali ke atas. Jangan melawan pembaca yang sedang menggulir sendiri.
        if (force || Date.now() - userScroll > 2500) {
          const top = k < 0 ? 0 : el ? Math.max(0, el.offsetTop - box.clientHeight * .32) : box.scrollTop;
          box.scrollTo({ top, behavior: force || calm() ? 'auto' : 'smooth' });
        }
      }
    }
    const mini = $('#mini'), show = !pl && (playing || (t > 0 && !audio.ended));
    mini.hidden = !show; screen.classList.toggle('has-mini', show);
    if (show) { $('#miniLine').textContent = gap || k < 0 ? '♪' : SONG.lines[k][2]; $('#miniBtn').textContent = playing ? '❚❚' : '▶'; $('#miniBtn').setAttribute('aria-label', playing ? 'Jeda' : 'Putar'); mini.style.setProperty('--p', (t / SONG.dur * 100).toFixed(2) + '%'); }
  }
  function stopLive() { live.forEach(f => f()); live = []; }
  function mount(html, anim, b) {
    stopLive();
    if (html == null) return;
    const swap = anim && !calm();
    app.innerHTML = html;
    app.classList.remove('in'); if (swap) { void app.offsetWidth; app.classList.add('in'); }
    $$('[data-scroll-end]', app).forEach(el => { el.scrollTop = el.scrollHeight; });
    if (b && b.jump) { const wb = $('.web-b', app), t = wb && $$('h4, p, blockquote, li', wb).find(x => x.textContent.includes(b.jump)); if (t) { wb.scrollTop = Math.max(0, t.offsetTop - 8); t.classList.add('mark-jump'); } }
    lyOn = -2; if (audio) songTick(true); else { const mini = $('#mini'); if (mini) mini.hidden = true; screen.classList.remove('has-mini'); }
    // jam panggilan berjalan
    const cl = $('.cl-st[data-from]', app);
    if (cl && $('.call.s-live', app)) { const t0 = Date.now() - (+cl.dataset.from || 0) * 1000; const id = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); cl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}.${String(s % 60).padStart(2, '0')}`; }, 500); live.push(() => clearInterval(id)); }
    if (b && b.v === 'call' && b.state === 'ring' && anim) { /* tetap berdering */ }
    // rekaman diputar
    const rp = $('.rc-time b[data-play="1"]', app);
    if (rp) { let s = +rp.dataset.pos; const d = +rp.dataset.dur, bars = $$('.wave i', app); const id = setInterval(() => { s = Math.min(d, s + 1); rp.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; bars.forEach((x, k) => x.classList.toggle('on', k / bars.length < s / d)); }, 1000); live.push(() => clearInterval(id)); }
    if (anim && b) sfxFor(b);
    if (!anim || calm()) return;
    // mengetik draf, lalu menghapusnya
    const dr = $('.cmp-t', app);
    if (dr && dr.dataset.draft) {
      const txt = dr.dataset.draft, erase = dr.dataset.erase === '1', keep = dr.dataset.keep || ''; let alive = true; live.push(() => { alive = false; });
      const typeTo = async s => { for (let k = 0; k <= s.length && alive; k += Math.max(1, Math.round(s.length / 60))) { dr.textContent = s.slice(0, k); if (k) window.SFX?.play('key'); await sleep(45); } if (alive) dr.textContent = s; };
      (async () => {
        if (erase) {
          // yang pendek diketik dulu; yang panjang sudah ada di kolom (ditulis di ketukan sebelumnya)
          if (txt.length < 24) { dr.textContent = ''; await typeTo(txt); await sleep(700); } else { dr.textContent = txt; await sleep(600); }
          for (let k = txt.length; k >= 0 && alive; k -= Math.max(1, Math.round(txt.length / 40))) { dr.textContent = txt.slice(0, k); window.SFX?.play('del'); await sleep(28); }
          if (!alive) return; dr.textContent = ''; if (keep) { await sleep(400); await typeTo(keep); } return;
        }
        dr.textContent = ''; await typeTo(txt);
      })();
    }
    // isian peta diketik
    const mi = $('.mp-in[data-type]', app);
    if (mi && mi.dataset.type && b && b.typeIn) { const txt = mi.dataset.type; let alive = true; live.push(() => { alive = false; }); mi.textContent = ''; mi.classList.add('typing'); (async () => { for (let k = 0; k <= txt.length && alive; k++) { mi.textContent = txt.slice(0, k); if (k) window.SFX?.play('key'); await sleep(70); } mi.classList.remove('typing'); })(); }
    // pesan baru: titik mengetik dulu
    const news = $$('.mw.new', app);
    if (news.length && b && (b.msgs || []).some(m => m[0] === 'in')) {
      news.forEach(n => n.classList.add('wait'));
      const tw = document.createElement('div'); tw.className = 'mw typing-w'; tw.innerHTML = '<div class="m in typing"><i></i><i></i><i></i></div>';
      const box = $('.chat-b', app); box.append(tw); box.scrollTop = box.scrollHeight;
      let alive = true; live.push(() => { alive = false; });
      (async () => { await sleep(900); if (!alive) return; tw.remove(); for (const n of news) { if (!alive) return; n.classList.remove('wait'); n.classList.add('pop'); box.scrollTop = box.scrollHeight; if (!n.querySelector('.sys')) window.SFX?.play(n.querySelector('.m.out') ? 'send' : 'recv'); await sleep(520); } })();
    }
  }

  // efek suara menurut jenis layar (hanya saat cerita maju satu ketukan)
  function sfxFor(b) {
    const F = window.SFX; if (!F || !F.on) return;
    if (b.buzz) F.play('buzz');
    if (b.v === 'chat') {
      const ms = b.msgs || [], hasIn = ms.some(m => m[0] === 'in');
      if (!hasIn) ms.filter(m => m[0] === 'out').forEach((m, i) => F.play('send', 250 + i * 520));
      return;
    }
    if (b.v === 'lock') { const n = $$('.lk-i.new', app).length; if (n && b.n?.length) { for (let i = 0; i < n; i++) F.play('notif', i * 500); } else if (!b.buzz) F.play('lock'); return; }
    if (b.v === 'call') { F.play(b.state === 'ended' ? 'hangup' : b.state === 'ring' ? 'ring' : 'connect'); return; }
    if (b.v === 'map') { if (b.map?.arrive) F.play('arrive', 500); else if (b.map?.route) F.play('route', 300); else F.play('tap'); return; }
    if (b.v === 'web') { if (b.more && !b.page) F.play('pop', 200); else F.play('tap'); return; }
    if (b.v === 'photo') { F.play(b.shot ? 'shutter' : 'tap'); return; }
    F.play('tap');
  }
  function viewOf(b, st) {
    if (!b) return H.lock({ n: [], date: L.start?.date, cap: L.start?.cap }, st);
    const f = H[b.v]; return f ? f(b, st) : '';
  }
  // ketukan aktif menurut posisi baca; kalau ketukan punya rentang (memperkecil peta), hitung kemajuannya
  function zoomed(b, st, gf) {
    if (b && b.span && b.end > b.g && b.v === 'map') {
      const p = clamp((gf - b.g) / (b.end - b.g), 0, 1);
      return { ...b, map: { ...b.map, zoom: +ease(p).toFixed(3), acc: Math.round(34 * (1 - clamp((p - .8) / .2, 0, 1))), here: p > .985 || b.map.here } };
    }
    return b;
  }
  // titik biru berjalan: dari ketukan rute pertama sampai "Anda telah tiba." (atau sampai jangkar `to`)
  const pathAt = (pts, p) => {
    const seg = []; let tot = 0;
    for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); tot += l; }
    let d = clamp(p, 0, 1) * tot;
    for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const f = seg[k] ? clamp(d / seg[k], 0, 1) : 0, a = pts[k], c = pts[k + 1]; return { x: a[0] + (c[0] - a[0]) * f, y: a[1] + (c[1] - a[1]) * f, ang: Math.atan2(c[1] - a[1], c[0] - a[0]) }; } d -= seg[k]; }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  };
  BEATS.forEach((b, i) => {
    if (b.v !== 'map' || !b.map) return;
    const key = b.map.route || b.map.trail; if (!key) return;
    if (b.map.p != null) { b.walkP = b.map.p; return; }
    if (b.map.trail && b.map.to) { const e = findG(b.c, b.map.to); if (e > b.g) b.walk = [b.g, e]; return; }
    if (b.map.arrive) { b.walkP = 1; return; }
    let s = i; while (s > 0 && BEATS[s - 1].v === 'map' && BEATS[s - 1].map?.route === key && !BEATS[s - 1].map?.arrive) s--;
    let e = BEATS.findIndex((x, j) => j > i && x.v === 'map' && x.map?.route === key && x.map?.arrive);
    if (e < 0) e = BEATS.findIndex((x, j) => j > i && !(x.v === 'map' && x.map?.route === key));
    if (e > 0 && BEATS[e].g > BEATS[s].g) b.walk = [BEATS[s].g, BEATS[e].g];
  });
  function walkP(b, gf) { return b.walk ? clamp((gf - b.walk[0]) / (b.walk[1] - b.walk[0]), 0, 1) : (b.walkP || 0); }
  function applyWalk(b, p) {
    const svg = $('.mp', app); if (!svg || !b.map) return;
    const m = b.map, pts = routePath(m.route || m.trail, m.len || 1), at = pathAt(pts, p);
    $('.lay-street', svg).style.transform = `translate(${(200 - at.x).toFixed(1)}px, ${(232 - at.y).toFixed(1)}px)`;
    const done = $('.route-done', svg); if (done) done.setAttribute('stroke-dasharray', `${p.toFixed(4)} 1`);
    const cone = $('.cone', svg); if (cone) cone.style.transform = `rotate(${(at.ang * 180 / Math.PI + 90).toFixed(1)}deg)`;
    const left = $('.mp-card .left', app);
    if (left && m.meters) left.textContent = p >= .995 ? '' : `sisa ${Math.max(10, Math.round(m.meters * (1 - p) / 10) * 10)} m`;
    svg.closest('.map')?.classList.toggle('moving', p > 0 && p < 1);
  }
  let lastZoom = -1, mounted = -9, mountedKey = null;
  function show(i, anim, gf) {
    const st = fold(i);
    let v = i; while (v >= 0 && BEATS[v].silent) v--;
    const b = BEATS[v] || null;
    if (v !== i) anim = false;
    paintStatus(st, b);
    if (!follow) { if (anim && b && b.bn !== false && !b.dev) notify(b); return; }
    const zb = zoomed(b, st, gf);
    if (b && b.span && mounted === v && b.v === 'map') { applyZoom(zb.map); return; }
    const walking = b && b.v === 'map' && b.map && (b.map.route || b.map.trail);
    if (walking && mounted === v) { applyWalk(b, walkP(b, gf)); return; }
    const key = walking ? (b.map.route || b.map.trail) + '|' + (b.map.place || '') : null;
    if (key && key === mountedKey && $('.mp', app)) {
      // rute yang sama: hanya isian dan kartu petunjuk yang berganti, perjalanannya tidak diulang
      const tmp = document.createElement('div'); tmp.innerHTML = viewOf(zb, st);
      $('.mp-ask', app)?.replaceWith($('.mp-ask', tmp));
      const oc = $('.mp-card', app), nc = $('.mp-card', tmp);
      if (oc && nc) oc.replaceWith(nc); else if (oc) oc.remove(); else if (nc) app.firstElementChild.append(nc);
      const ot = $('.here', app), nt = $('.here', tmp); if (ot && nt) ot.textContent = nt.textContent;
      mounted = v; applyWalk(b, walkP(b, gf)); if (anim && b.map.arrive) window.SFX?.play('arrive', 300); return;
    }
    mount(viewOf(zb, st), anim, b); mounted = v; mountedKey = key;
    if (walking) applyWalk(b, walkP(b, gf));
    if (b && b.v === 'map' && (b.span || zb.map.zoom > 0)) { lastZoom = -1; applyZoom(zb.map); }
    homebar.hidden = !!(b && b.dev);
  }
  function applyZoom(m) {
    const svg = $('.mp', app); if (!svg) return; const z = m.zoom || 0; if (Math.abs(z - lastZoom) < .002) return; lastZoom = z;
    const seg = (a, c) => clamp((z - a) / (c - a), 0, 1);
    const sStreet = 1 - .94 * seg(0, .35), oStreet = 1 - seg(.22, .36);
    const sLand = 3.2 - 3 * seg(.15, .58), oLand = seg(.18, .3) * (1 - seg(.5, .6));
    const rGlobe = 140 - 134 * seg(.45, .78), oGlobe = seg(.45, .52) * (1 - seg(.74, .8));
    const oGrid = seg(.72, .9), oSea = seg(.16, .3) * (1 - seg(.5, .62));
    $('.lay-sea', svg).style.opacity = oSea;
    $('.lay-street', svg).style.cssText = `transform-origin:200px 232px;transform:scale(${sStreet});opacity:${oStreet}`;
    $('.lay-land', svg).style.cssText = `transform-origin:200px 232px;transform:scale(${sLand});opacity:${oLand}`;
    const gl = $('.lay-globe circle', svg); gl.setAttribute('r', rGlobe.toFixed(1)); gl.parentNode.style.opacity = oGlobe;
    $('.lay-grid', svg).style.opacity = oGrid;
    $('.acc', svg).setAttribute('r', m.acc == null ? 34 : m.acc);
    $('.here', svg).textContent = m.here ? 'Anda di sini.' : '';
    app.firstElementChild?.classList.toggle('void', z > .56);
  }

  // menjelajah sendiri
  function setFollow(on) {
    follow = on; S.follow = on; save();
    $('#follow').hidden = on; manual = null;
    if (on) { $('#bns').innerHTML = ''; cur = -2; tick(true); }
  }
  function open(spec) {
    const st = fold(cur);
    if (follow) { follow = false; $('#follow').hidden = false; }
    manual = spec;
    let html = null;
    const [kind, arg] = spec.split(/:(.*)/s);
    if (kind === 'home') html = H.home({ page: 1 }, st);
    else if (kind === 'home3') html = H.home({ page: 3 }, st);
    else if (kind === 'chat') html = H.chat({ with: arg }, st);
    else if (kind === 'web' && arg) html = H.web({ url: arg }, st);
    else if (kind === 'photo') html = H.photo({ photo: { ...st.photos[+arg], meta: st.photos[+arg]?.meta || st.photos[+arg]?.t } }, st);
    else if (kind === 'mail') html = H.mail({ mail: st.mails[+arg] }, st);
    else if (kind === 'rec') html = H.rec({ rec: { ...st.recs.get(arg), state: 'pause' } }, st);
    else if (kind === 'catatan') { setBig(false); $('#read').focus({ preventScroll: true }); return; }
    else if (LIST[kind]) html = LIST[kind](st);
    if (html) { window.SFX?.play('tap'); mount(html, true, null); mounted = -9; mountedKey = null; homebar.hidden = false; }
    paintStatus(st, null);
  }
  app.addEventListener('click', e => {
    const n = e.target.closest('[data-nav]'), o = e.target.closest('[data-open]');
    if (o) { open(o.dataset.open); return; }
    if (n) { const v = n.dataset.nav; open(v === 'home' ? 'home' : v); return; }
    if (e.target.closest('[data-song]')) { songToggle(); return; }
    const ly = e.target.closest('.ly[data-t]'); if (ly && SONG) { const a = songEl(); a.currentTime = Math.max(0, +ly.dataset.t - .05); userScroll = 0; songTick(true); if (a.paused) a.play().catch(() => {}); return; }
    const vo = e.target.closest('[data-vo]'); if (vo) { vo.textContent = vo.textContent === '▶' ? '❚❚' : '▶'; vo.closest('.mvo')?.classList.toggle('playing'); }
  });
  ['wheel', 'touchmove'].forEach(ev => app.addEventListener(ev, e => { if (e.target.closest('.lyr')) userScroll = Date.now(); }, { passive: true }));
  app.addEventListener('input', e => { if (!e.target.classList.contains('mu-seek')) return; seeking = true; const a = songEl(); a.currentTime = +e.target.value; e.target.style.setProperty('--p', (e.target.value / SONG.dur * 100).toFixed(2) + '%'); });
  app.addEventListener('change', e => { if (e.target.classList.contains('mu-seek')) { seeking = false; songTick(true); } });
  $('#mini').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('musik'); } });
  $('#mini').addEventListener('click', e => { if (e.target.closest('#miniBtn')) { songToggle(); return; } open('musik'); });
  const homebar = $('#homebar');
  homebar.addEventListener('click', () => open(manual === 'home' && fold(cur).tb ? 'home3' : 'home'));
  $('#follow').addEventListener('click', () => setFollow(true));

  // notifikasi selama menjelajah
  const APP_OF = { chat: 'pesan', web: 'web', map: 'tb', lock: 'pesan', call: 'telepon', music: 'musik', mail: 'surel', doc: 'catatan', photo: 'foto', rec: 'rekaman', cal: 'kalender', home: 'tb' };
  function notify(b) {
    const box = $('#bns');
    const txt = b.bnText || (b.v === 'chat' ? (() => { const m = (b.msgs || []).filter(x => x[0] === 'in').pop(); return m ? (m[1] === 'ph' ? 'Foto' : m[1] === 'vo' ? 'Rekaman suara' : m[1] === 'link' ? m[2] : m[1]) : ''; })() : b.v === 'web' ? (b.page?.title || b.url) : b.v === 'mail' ? b.mail?.subj : b.v === 'call' ? 'Panggilan' : b.v === 'map' ? (b.map?.ask || 'Dari mana?') : '');
    if (!txt) return;
    const who = b.v === 'chat' ? b.with : b.v === 'mail' ? b.mail?.from : b.v === 'call' ? b.with : b.v === 'web' ? 'Peramban' : b.v === 'map' ? '' : '';
    const el = document.createElement('button'); el.type = 'button'; el.className = 'bn';
    el.innerHTML = `${icon(APP_OF[b.v] || 'pesan')}<span><b>${esc(who || '')}</b><span>${inline(String(txt))}</span></span>`;
    el.addEventListener('click', () => setFollow(true));
    window.SFX?.play('banner');
    box.prepend(el); while (box.children.length > 2) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5200);
  }

  /* ---------- ukuran layar dan teks ---------- */
  const read = $('#read');
  function setBig(on) { S.big = on; save(); document.body.classList.toggle('big', on); $('#grab').setAttribute('aria-expanded', String(on)); $('#grab').setAttribute('aria-label', on ? 'Perkecil layar ponsel' : 'Perbesar layar ponsel'); setTimeout(measure, 650); }
  $('#grab').addEventListener('click', () => setBig(!document.body.classList.contains('big')));
  let size = clamp(+S.size || 19, 15, 24);
  const setSize = d => { size = clamp(size + d, 15, 24); root.style.setProperty('--size', size + 'px'); S.size = size; save(); measure(); };
  root.style.setProperty('--size', size + 'px');

  /* ---------- posisi baca ---------- */
  let TOPS = [];
  function measure() { TOPS = PARA.map(p => p.el.offsetTop); tick(true); }
  function readingAt() {
    const line = read.scrollTop + read.clientHeight * .3;
    let lo = 0, hi = TOPS.length - 1, g = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (TOPS[mid] <= line) { g = mid; lo = mid + 1; } else hi = mid - 1; }
    if (g < 0) return { g: -1, f: -1 };
    const h = Math.max(1, (TOPS[g + 1] || TOPS[g] + PARA[g].el.offsetHeight) - TOPS[g]);
    return { g, f: g + clamp((line - TOPS[g]) / h, 0, 1) };
  }
  const beatAt = g => { let lo = 0, hi = BEATS.length - 1, k = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (BEATS[mid].g <= g) { k = mid; lo = mid + 1; } else hi = mid - 1; } return k; };
  let chNow = -1, saveT = 0;
  function tick(force) {
    const { g, f } = readingAt();
    const k = beatAt(g);
    if (k !== cur || force) {
      const anim = !force && k === cur + 1;
      // melompat jauh ke depan: tetap tampilkan yang terakhir, tanpa animasi
      cur = k; show(k, anim, f);
    } else if (BEATS[k] && (BEATS[k].span || BEATS[k].walk)) show(k, false, f);
    const c = g >= 0 ? PARA[g].c : 0;
    if (c !== chNow) { chNow = c; $('#barTitle').textContent = CH[c].num === 'Prolog' ? 'Prolog' : `Bab ${CH[c].num}`; G?.step?.(c + 1, CH.length, 'Bagian'); paintFolder(); }
    $('#nbar').classList.toggle('scrolled', read.scrollTop > 60);
    if (g > S.max) S.max = g;
    S.at = Math.max(0, g);
    clearTimeout(saveT); saveT = setTimeout(() => {
      save();
      const fr = clamp((g + 1) / TOTAL, 0, 1);
      const pr = store.get('prog', {}) || {}; pr[SLUG] = +fr.toFixed(3); store.set('prog', pr);
      if (fr > .985) { const s2 = store.get('stats', {}) || {}; s2.done = s2.done || []; if (!s2.done.includes(SLUG)) { s2.done.push(SLUG); store.set('stats', s2); } }
    }, 600);
    endWatch();
  }
  let ticking = false;
  read.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; tick(false); }); } }, { passive: true });
  addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 150); });
  // huruf web yang datang belakangan mengubah tinggi paragraf: ukur ulang
  document.fonts?.ready.then(() => measure());
  if ('ResizeObserver' in window) { let rw = 0; new ResizeObserver(() => { const w = story.offsetHeight; if (w !== rw) { rw = w; clearTimeout(measure.t); measure.t = setTimeout(measure, 120); } }).observe(story); }

  /* ---------- folder: daftar bab ---------- */
  const sheet = $('#sheet');
  function paintFolder() {
    if (!sheet.open) return;
    $$('#sheet .fd-r', sheet).forEach(r => r.classList.toggle('here', +r.dataset.go === chNow));
  }
  $('#folder').addEventListener('click', () => {
    const maxC = S.max >= 0 ? PARA[S.max].c : 0;
    $('#sheetBody').innerHTML = `<div class="fd-h"><h2 id="sheetTitle">Semua yang Pernah</h2><button type="button" class="fd-x" data-close aria-label="Tutup">Selesai</button></div><p class="fd-s">${CH.length} catatan · Titik Biru</p><div class="fd-l">${CH.map(c => `<button type="button" class="fd-r${c.i === chNow ? ' here' : ''}${c.i <= maxC ? ' seen' : ''}" data-go="${c.i}"><span class="fd-n">${esc(c.num === 'Prolog' ? '—' : c.num)}</span><span><b>${inline(c.name)}</b><small>${c.i === chNow ? 'Kau di sini' : c.i <= maxC ? 'Sudah dibuka' : ''}</small></span><i class="fd-dot" aria-hidden="true"></i></button>`).join('')}</div>`;
    sheet.showModal();
    $('#sheet .fd-r.here')?.scrollIntoView({ block: 'center' });
  });
  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-close]')) { sheet.close(); return; }
    const r = e.target.closest('[data-go]'); if (r) { sheet.close(); goChapter(+r.dataset.go); }
  });
  function goChapter(c) { const el = $('#bab-' + c); if (el) read.scrollTo({ top: el.offsetTop - 8, behavior: calm() ? 'auto' : 'smooth' }); }

  /* ---------- akhir: halaman kosong ---------- */
  const endEl = $('#blank'), endTxt = $('#blankText');
  let endShown = false;
  function endWatch() {
    if (endShown) return;
    const r = endEl.getBoundingClientRect();
    if (r.top < innerHeight * .7) { endShown = true; ending(); }
  }
  endTxt.value = S.blank || '';
  endTxt.addEventListener('input', () => { S.blank = endTxt.value.slice(0, 4000); save(); });
  function ending() {
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    $('#blankDate').textContent = `Hari ini, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
    setTimeout(() => { $('#blankNote').classList.add('on'); }, 5000);
    // layar terakhir: aplikasi itu, menanyakan hal yang sama kepada yang memegang ponsel sekarang
    setTimeout(() => {
      if (!follow) return;
      const prev = String(store.get('darimana', '') || '').trim();
      const st = fold(cur);
      mount(H.map({ map: { ask: 'Dari mana?', free: true, acc: 34, place: 'Saujana' } }, st), true, null); mounted = -9; mountedKey = null;
      const inp = $('#mpFree');
      if (inp) {
        if (prev) { const h = document.createElement('p'); h.className = 'mp-prev'; h.innerHTML = `Terakhir kau menulis: <b>${esc(prev)}</b>`; $('.mp-ask', app).after(h); }
        inp.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const v = inp.value.trim().slice(0, 60); if (!v) return; store.set('darimana', v); inp.blur(); $('.here', app).textContent = 'Anda di sini.'; announce('Tidak ada rute. Anda di sini.'); });
      }
    }, 9000);
  }

  /* ---------- pengaturan ---------- */
  G?.settings?.({ open: '#openSettings', dialog: '#settingsDialog', theme: '#theme' });
  $('#smaller').addEventListener('click', () => setSize(-1));
  $('#bigger').addEventListener('click', () => setSize(1));
  const sfxBtn = $('#sfxSet');
  const paintSfx = () => { const v = S.sfx !== false; if (window.SFX) window.SFX.on = v; sfxBtn.setAttribute('aria-pressed', String(v)); sfxBtn.textContent = v ? 'Nyala' : 'Mati'; };
  sfxBtn.addEventListener('click', () => { S.sfx = S.sfx === false; save(); paintSfx(); if (S.sfx) window.SFX?.play('recv'); });
  paintSfx();
  const followBtn = $('#followSet');
  const paintFollow = () => { followBtn.setAttribute('aria-pressed', String(S.follow !== false)); followBtn.textContent = S.follow !== false ? 'Ikuti cerita' : 'Diam'; };
  followBtn.addEventListener('click', () => { setFollow(!(S.follow !== false)); paintFollow(); });
  paintFollow();
  $('#reset').addEventListener('click', () => { S = { ...blank(), size }; save(); $('#settingsDialog').close(); read.scrollTo({ top: 0 }); setFollow(true); });

  /* ---------- mulai ---------- */
  const rd = store.get('read', []) || []; if (!rd.includes(SLUG)) store.set('read', [...rd, SLUG]);
  document.body.classList.toggle('big', !!S.big);
  $('#grab').setAttribute('aria-expanded', String(!!S.big));
  if (!follow) $('#follow').hidden = false;
  requestAnimationFrame(() => {
    measure();
    const want = location.hash.match(/^#bab-(\d+)$/);
    if (want) goChapter(+want[1]);
    else if (S.at > 3 && S.at < TOTAL - 3) {
      const r = $('#resume'), c = CH[PARA[S.at].c];
      r.hidden = false; r.innerHTML = `<span>Lanjutkan</span><b>${esc(c.num === 'Prolog' ? 'Prolog' : 'Bab ' + c.num)} · ${inline(c.name)}</b>`;
      r.addEventListener('click', () => { r.hidden = true; read.scrollTo({ top: Math.max(0, TOPS[S.at] - read.clientHeight * .3), behavior: 'auto' }); });
      setTimeout(() => { r.hidden = true; }, 12000);
    }
  });
  if (G) G.mount({ slug: SLUG, title: work.title, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#read',
    lede: 'Novella Titik Biru, dibaca di ponsel Elias Venn.',
    steps: [
      'Di bawah: aplikasi Catatan, tempat seluruh novella ini. Gulir seperti biasa.',
      'Di atas: layar ponsel yang sama. Pesan Mara, tautan Soren, forum, peta tanpa nama: semuanya muncul pada kalimat tempat ia terjadi.',
      'Garis kecil di bawah layar membuka beranda. Semua aplikasi bisa dibuka; isinya hanya yang sudah terjadi sejauh ini. "Ikuti cerita" mengembalikan layar ke cerita.',
      'Tarik pegangan di atas Catatan untuk memperbesar atau memperkecil layar. "‹ Catatan" membuka daftar bab.',
      'Novella ini membicarakan rencana memalsukan kematian dan pikiran tentang bunuh diri. Bacalah dengan pelan.'
    ] });
})();
