/* Usia Pulang: novel interaktif. Tujuh hari, 168 jam, delapan akhir.
   Mesin mengikuti kontrak data di content/usia-pulang.json (Simpul-Cerita.json milik pengarang):
   - masuk simpul: catat di visited, jalankan on_enter_flags
   - memilih: pasang set_flags, cabut unset_flags, pindah ke target; pilihan dengan requires_flags hanya muncul bila tandanya ada
   - sela (perspective): body_before, tepat satu varian yang cocok dengan visited_all, body_after; lalu antrekan semua
     callbacks yang cocok berurutan; gema kembali ke antrean, lalu next
   Nama tanda tidak pernah ditampilkan. Pikiran di sela hanya untuk pembaca. Tidak ada skor.

   Di atasnya: malam yang lewat, angka 18.40 yang berkedip sampai batas, pembuka dari dalam air, pilihan yang ditahan
   lalu dicap, pilihan lain yang tenggelam, benang jahitan di tepi buku, gema sebagai riak, pola jahitan di akhir,
   masuk ke sela, yang kamu tahu tetapi Laras tidak, siapa di adegan, dan benda-benda dari benda.js. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'usia:run', 'usia:endings', 'usia:book', 'usia:memory'];
  const mem = {};
  const store = {
    get(k, d) { if (PREVIEW && HISTORY.includes(k)) return k in mem ? mem[k] : d; try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) { mem[k] = v; return; } try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'usia-pulang', G = window.JMGuide, root = document.documentElement, BENDA = window.USIA_BENDA || {};
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = s => { const d = document.createElement('div'); d.innerHTML = s.trim(); return d.firstElementChild; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  root.lang = t('id', 'en');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- teks antarmuka ---------- */
  $('#kick').textContent = t('Temusai · Novel interaktif', 'Temusai · Interactive novel');
  $('#cvRight').textContent = t('168 jam', '168 hours'); $('#cvDate').textContent = t('Sen, 9 Nov 2026', 'Mon, 9 Nov 2026');
  if (EN) {
    $('#lede').textContent = 'Laras comes back twenty-nine years after her death. Her body is still 31; her daughter is 37. She has 168 hours to decide whether to stay.';
    $('#rule1').textContent = 'Seven days. Each day you choose where Laras goes, then what she does.';
    $('#rule2').textContent = 'Press and hold to choose. Choices cannot be taken back, and nothing is scored.';
    $('#rule3').textContent = 'Eight endings. One journey reads only part of the story.';
    $('#lost').hidden = false; $('#lost').textContent = 'This novel is not translated yet, so it is shown in the original Indonesian.';
    $('#cardKick').textContent = 'Teluk Rantau · Return support'; $('#cardTitle').textContent = 'Return Card';
  }

  /* ---------- naskah ---------- */
  let data = null;
  try { data = await (await fetch('../../content/usia-pulang.json', { cache: 'no-cache' })).json(); } catch (e) { /* luring */ }
  if (!data || !data.nodes || !data.nodes[data.entry]) { $('#coverAct').innerHTML = `<p class="loading">${t('Novel belum bisa dimuat.', 'The novel could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; return; }
  const N = data.nodes, ENTRY = data.entry;
  const TOTAL_WORDS = Object.values(N).reduce((n, x) => n + (+x.prose_words || 0), 0);
  const ENDINGS = Object.values(N).filter(n => n.kind === 'ending').map(n => n.id).sort();
  const STAYS = id => !/^Tidak menetap/i.test((N.Z00.choices || []).find(c => c.target === id)?.label || '');
  const shortTitle = n => String(n.title || n.id).replace(/^[A-Z]\d{2}[A-D]?\s*[—-]\s*/, '').replace(/^[A-Z]\d[A-D]\s*[—-]\s*/, '');
  const has = (flags, list) => (list || []).every(f => flags.has(f));
  { const f = (store.get('usia:endings', []) || []).length; $('#cvEnds').textContent = t(`${f}/8 akhir`, `${f}/8 endings`); }
  const labelOf = (nodeId, choiceId) => ((N[nodeId] && N[nodeId].choices) || []).find(x => x.id === choiceId)?.label || '';

  /* ---------- orang: usia dari kanon pengarang (1997 saat Laras meninggal, 2026 saat ia kembali) ---------- */
  const PEOPLE = {
    Laras: { rel: t('Kembali sesudah dua puluh sembilan tahun.', 'Back after twenty-nine years.'), then: 31, now: 31 },
    Dian: { rel: t('Putri Laras. Ibu Banyu.', 'Laras’s daughter. Banyu’s mother.'), then: 8, now: 37 },
    Hadi: { rel: t('Suami Laras dahulu. Suami Ratna sekarang.', 'Laras’s husband then. Ratna’s husband now.'), then: 33, now: 62 },
    Ratna: { rel: t('Istri Hadi sekarang.', 'Hadi’s wife now.'), then: 29, now: 58 },
    Sulastri: { rel: t('Ibu Laras.', 'Laras’s mother.'), then: 53, now: 82 },
    Tama: { rel: t('Anak Hadi dan Ratna.', 'Hadi and Ratna’s son.'), born: 2003, now: 23 },
    Banyu: { rel: t('Anak Dian.', 'Dian’s son.'), born: 2017, now: 9 },
    Anin: { rel: t('Sahabat dan rekan jahit lama.', 'Old friend, fellow seamstress.'), then: 31, now: 60 },
    Suri: { rel: t('Petugas pendampingan kepulangan.', 'Return support officer.'), now: 44 },
    Rafi: { rel: t('Wartawan.', 'Journalist.'), now: 38 }
  };
  const NAMES = Object.keys(PEOPLE);
  const nameRe = name => new RegExp(`(^|[^\\p{L}])(${name})(?![\\p{L}])`, 'u');

  /* ---------- jam cerita: Senin 9 November 2026 18.40 sampai Senin 16 November 2026 18.40 ---------- */
  const DAYS = EN ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'] : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin'];
  const PART = { pagi: t('pagi', 'morning'), siang: t('siang', 'afternoon'), sore: t('sore', 'evening'), malam: t('malam', 'night'), senja: t('petang', 'dusk') };
  const HOUR = { pagi: 8, siang: 13, sore: 17.67, senja: 18.67, malam: 21.5 };
  const SKY = { pagi: 'fajar', siang: 'siang', sore: 'senja', senja: 'senja', malam: 'malam' };
  let lastDay = 0;
  function timeOf(id) {
    const n = N[id], m = id.match(/^([CHPRZE])/);
    if (id === ENTRY) return { day: 0, part: 'senja', exact: '18.40' };
    if (id === 'Z00') return { day: 7, part: 'sore', exact: '17.40' };
    if (n.kind === 'ending') return { day: 7, part: 'senja', exact: '18.40' };
    if (m[1] === 'C') { const k = +id.slice(1) - 1; return { day: k, part: k ? 'pagi' : 'senja' }; }
    if (m[1] === 'H') { const k = +id[1] - 1; return { day: k, part: k ? 'siang' : 'malam' }; }
    if (m[1] === 'P') { const k = +id.slice(1) - 1; return { day: k, part: 'malam' }; }
    return { day: lastDay, part: 'malam' };
  }
  const elapsed = tm => Math.max(0, Math.min(168, tm.day * 24 + HOUR[tm.part] - 18.67));
  const left = tm => Math.max(0, Math.round(168 - elapsed(tm)));
  const dateOf = tm => `${DAYS[tm.day]}, ${9 + tm.day} November`;

  /* ---------- perjalanan (run) ---------- */
  const fresh = () => ({ v: 1, path: [], flags: [], visited: [], queue: [], pNext: null, snaps: {}, started: Date.now() });
  let run = store.get('usia:run', null);
  if (!run || run.v !== 1 || !Array.isArray(run.path)) run = null;
  let flags = new Set(), visited = [];
  let known = {};          // yang dibaca di sela: { Dian: [{ pid, day, text }] }
  const save = () => { run.flags = [...flags]; run.visited = visited; store.set('usia:run', run); store.set('usia:book', { at: Date.now(), chapters: bookOf(run.path) }); };
  // ingatan pembaca, bukan ingatan Laras: perjalanan yang ditinggalkan dicatat, lalu ditandai di perjalanan berikutnya
  let MEM = store.get('usia:memory', null);
  if (!MEM || typeof MEM !== 'object' || !MEM.nodes) MEM = { nodes: {}, choices: {}, runs: 0 };
  function remember(r) {
    if (!r || !Array.isArray(r.path) || r.path.length < 2) return;
    r.path.forEach(e => { MEM.nodes[e.id] = (MEM.nodes[e.id] || 0) + 1; if (e.choice) MEM.choices[e.choice] = (MEM.choices[e.choice] || 0) + 1; });
    MEM.runs = (MEM.runs || 0) + 1; store.set('usia:memory', MEM);
  }
  const SND = window.UsiaSound || null;

  /* ---------- Bukumu: jalan yang ditempuh, dirakit menjadi bab per hari untuk mode baca biasa di situs ---------- */
  function bookOf(path) {
    const chs = [], vi = [];
    let cur = null, d = 0;
    path.forEach((e, i) => {
      const n = N[e.id]; if (!n) return;
      if (!vi.includes(e.id)) vi.push(e.id);
      if (/^[CP]\d/.test(e.id)) d = +e.id.slice(1) - 1; else if (/^H/.test(e.id)) d = +e.id[1] - 1; else if (/^[ZE]/.test(e.id)) d = 7;
      if (!cur || cur.day !== d) { cur = { day: d, title: `${DAYS[d]}, ${9 + d} November`, body: [] }; chs.push(cur); }
      const who = whoOf(n), tm = n.kind === 'callback' ? { day: d, part: 'malam' } : timeOf(e.id);
      const title = who ? shortTitle(n).replace(new RegExp(`^${who}:\\s*`), '') : shortTitle(n);
      if (n.kind === 'perspective') cur.body.push(`### ${t('Sela', 'Interlude')} · ${who}: ${title}`, `*${t(`Laras tidak mengetahui apa yang ${who} pikirkan di sini.`, `Laras does not know what ${who} thinks here.`)}*`);
      else if (n.kind === 'callback') { const c = causeOf(e.because || [], i, path); cur.body.push(`### ${title}`, `*${c ? t(`Gema dari ${DAYS[c.tm.day]} ${PART[c.tm.part]}, ketika kamu memilih: ${c.c.label}`, `An echo of ${DAYS[c.tm.day]} ${PART[c.tm.part]}, when you chose: ${c.c.label}`) : t('Gema', 'Echo')}*`); }
      else cur.body.push(`## ${title}`, `*${DAYS[tm.day]} ${PART[tm.part]}*`);
      let raw;
      if (n.kind === 'perspective') { const v = (n.variants || []).find(x => (x.visited_all || []).every(id => vi.includes(id))); raw = [...paras(n.body_before), ...(v ? paras(v.body) : []), ...paras(n.body_after)]; }
      else raw = paras(n.body);
      cur.body.push(...raw);
      if (e.choice) cur.body.push(`> ${t('Pilihanmu', 'Your choice')}: ${labelOf(e.id, e.choice)}`);
    });
    if (chs.length) {
      chs[0].body.unshift(`*${t('Bukumu: jalan yang kamu tempuh di versi interaktif, dirakit menjadi satu novel. Perjalanan lain akan menghasilkan buku yang lain.', 'Your book: the path you took in the interactive version, bound as one novel. Another journey makes another book.')}*`);
      const last = path[path.length - 1];
      if (last && N[last.id] && N[last.id].kind !== 'ending') chs[chs.length - 1].body.push('***', `*${t('Perjalanan ini belum selesai. Lanjutkan di versi interaktif.', 'This journey is not finished. Continue in the interactive version.')}*`);
    }
    return chs.map(c => ({ title: c.title, body: c.body }));
  }

  /* ---------- tampilan buku ---------- */
  const book = $('#book');
  const KIND = { choice: t('Bersama', 'Together'), journey: t('Perjalanan', 'Journey'), perspective: t('Sela', 'Interlude'), callback: t('Gema', 'Echo'), ending: t('Akhir', 'Ending'), last: t('Batas', 'Deadline') };
  const kindOf = n => n.kind === 'choice' ? (/^H/.test(n.id) ? 'journey' : n.id === 'Z00' ? 'last' : 'choice') : n.kind;
  const whoOf = n => (String(n.title).match(/—\s*([A-Z][a-z]+):/) || [])[1] || '';
  const people = label => NAMES.filter(x => x !== 'Laras' && nameRe(x).test(label));
  const prompt = n => n.id === 'Z00' ? t('Sebelum pukul 18.40, Laras memutuskan…', 'Before 18:40, Laras decides…')
    : /^H/.test(n.id) ? t('Apa yang Laras lakukan?', 'What does Laras do?')
    : n.id === ENTRY ? t('Ke mana Laras pergi malam ini?', 'Where does Laras go tonight?')
    : t(`Ke mana Laras pergi hari ${DAYS[timeOf(n.id).day]}?`, `Where does Laras go on ${DAYS[timeOf(n.id).day]}?`);

  // gema: kutip tindakan pembaca sendiri (sebelum gema itu) yang memasang tanda pemicunya
  function causeOf(because, before, path = run.path) {
    for (let k = Math.min(before, path.length) - 1; k >= 0; k--) {
      const e = path[k]; if (!e.choice) continue;
      const c = (N[e.id].choices || []).find(x => x.id === e.choice);
      if (c && (c.set_flags || []).some(f => because.includes(f))) return { c, tm: timeOf(e.id), id: e.id };
    }
    return null;
  }

  /* ---------- benda ---------- */
  function bendaHTML(o, when) {
    const head = (title, sub) => `<header class="bd-bar"><span class="bd-app">${esc(t('Pesan', 'Messages'))}</span><b>${esc(title)}</b><small>${esc(sub)}</small></header>`;
    const owner = o.owner ? t(`ponsel ${o.owner}`, `${o.owner}’s phone`) + ' · ' : '';
    const bubble = it => {
      const [k, a, b] = it;
      if (k === 'voice') return `<div class="bd-m in voice"><span class="bd-b"><i class="bd-play" aria-hidden="true"></i><span class="bd-wave" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--h:${(4 + ((i * 7) % 11) + (i % 3) * 2)}px"></i>`).join('')}</span><small>${esc(a)}</small></span><span class="bd-tr">${esc(t('Transkrip', 'Transcript'))}: ${esc(b)}</span></div>`;
      if (/photo$/.test(k)) return `<div class="bd-m ${k.split('-')[0]}"><span class="bd-b bd-pic"><span class="bd-ph" aria-hidden="true"></span><small>${esc(a)}</small></span></div>`;
      return `<div class="bd-m ${k}"><span class="bd-b">${esc(a)}</span></div>`;
    };
    const ph = (cap, mods = [], tags = []) => `<figure class="bd bd-photo ${mods.map(m => 'pm-' + m).join(' ')}"><span class="bd-frame">${tags.map((x, i) => `<span class="bd-tag" style="--i:${i}">${esc(x)}</span>`).join('')}</span><figcaption>${esc(cap)}</figcaption></figure>`;
    switch (o.k) {
      case 'msg': return `<div class="bd bd-phone" data-k="msg">${head(o.from, owner + when)}<div class="bd-list">${o.items.map(bubble).join('')}</div>${o.note ? `<p class="bd-note">${esc(o.note)}</p>` : ''}</div>`;
      case 'draft': return `<div class="bd bd-phone bd-draft" data-k="draft" data-tries="${esc(JSON.stringify(o.tries || []))}" data-final="${esc(o.final)}">${head(o.from, owner + (o.note ? o.note + ' · ' : '') + when)}<div class="bd-list">${o.items.map(bubble).join('')}${bubble(['out', o.final])}</div><div class="bd-compose" aria-hidden="true"><span class="bd-field"></span><i class="bd-send"></i></div></div>`;
      case 'photo': return ph(o.cap, o.mods, o.tags);
      case 'strip': return `<div class="bd bd-strip">${o.items.map(c => ph(c, ['old'])).join('')}</div>`;
      case 'card': return `<div class="bd bd-card"><p class="bd-k">${esc(o.head)}</p><h4>${esc(o.title)}</h4><dl>${o.rows.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${b ? esc(b) : `<span class="bd-empty" aria-label="${esc(t('kosong', 'empty'))}"></span>`}</dd></div>`).join('')}</dl></div>`;
      case 'letter': return `<div class="bd bd-letter"><header><b>${esc(o.head)}</b><small>${esc(o.sub)}</small></header><h4>${esc(o.title)}</h4><p class="bd-to">${esc(o.to)}</p>${o.body.map(p => `<p>${esc(p)}</p>`).join('')}<dl>${o.meta.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></div>`;
      case 'forged': return `<figure class="bd bd-forged"><span class="bd-lines" aria-hidden="true">${[86, 64, 92, 48, 78, 36].map(w => `<i style="--w:${w}%"></i>`).join('')}</span><span class="bd-sign">Laras</span><figcaption>${esc(o.cap)}</figcaption></figure>`;
      case 'slip': return `<div class="bd bd-slip"><p class="bd-k">${esc(o.title)}</p>${o.lines.map(([a, b]) => `<p class="bd-row"><span>${esc(a)}</span><b>${esc(b)}</b></p>`).join('')}<p class="bd-foot">${esc(o.foot)}</p></div>`;
      case 'blank': return `<div class="bd bd-blank" role="img" aria-label="${esc(t('Satu halaman kosong', 'One blank page'))}"></div>`;
      case 'envs': return `<div class="bd bd-envs">${o.items.map((x, i) => `<span class="bd-env" style="--i:${i}">${esc(x)}</span>`).join('')}${o.extra ? `<span class="bd-env voice" style="--i:${o.items.length}">${esc(o.extra)}</span>` : ''}</div>`;
    }
    return '';
  }

  /* ---------- simpul ---------- */
  function nodeEl(entry, idx) {
    const n = N[entry.id], k = kindOf(n), tm = timeOf(entry.id), who = whoOf(n);
    if (n.kind === 'perspective' || n.kind === 'choice' && /^C/.test(n.id)) lastDay = tm.day;
    const when = `${DAYS[tm.day]} ${PART[tm.part]}`;
    const sec = html(`<section class="node k-${k}${who ? ' who-' + who : ''}" data-id="${n.id}" data-i="${idx}" data-day="${tm.day}" data-part="${tm.part}"></section>`);
    const title = who ? shortTitle(n).replace(new RegExp(`^${who}:\\s*`), '') : shortTitle(n);
    let head = `<header class="n-head"><p class="n-kind"><span>${esc(KIND[k])}${who ? ' · ' + esc(who) : ''}</span><span>${esc(when)}</span></p><h2>${esc(title)}</h2></header>`;
    if (MEM.nodes[n.id]) head += `<p class="n-seen"><span>${esc(t('Pernah kamu baca di perjalanan lain. Laras tidak mengingatnya.', 'You read this on another journey. Laras does not remember it.'))}</span>${n.kind !== 'ending' ? `<button type="button" class="n-skip">${esc(n.kind === 'choice' ? t('Ke pilihan', 'To the choice') : t('Ke ujungnya', 'To the end'))} <span aria-hidden="true">↓</span></button>` : ''}</p>`;
    if (n.kind === 'perspective') head += `<p class="n-note">${esc(t(`Laras tidak mengetahui apa yang ${who} pikirkan di sini.`, `Laras does not know what ${who} thinks here.`))}</p>`;
    if (n.kind === 'callback' && entry.because) {
      const cause = causeOf(entry.because, idx);
      if (cause) { sec.dataset.cause = cause.id; head += `<p class="n-cause"><small>${esc(t(`${DAYS[cause.tm.day]} ${PART[cause.tm.part]}, kamu memilih`, `${DAYS[cause.tm.day]} ${PART[cause.tm.part]}, you chose`))}</small><span class="n-quote">${esc(cause.c.label)}</span><button type="button" class="n-back">${esc(t('Lihat pilihan itu', 'See that choice'))} <span aria-hidden="true">↑</span></button></p>`; }
    }
    let raw = [];
    if (n.kind === 'perspective') {
      const v = (n.variants || []).find(x => (x.visited_all || []).every(id => visited.includes(id)));
      raw = [...paras(n.body_before), ...(v ? paras(v.body) : []), ...paras(n.body_after)];
      const vp = v ? paras(v.body) : raw, mark = vp[vp.length - 1];   // kalimat pertama dari paragraf terakhir varian: biasanya yang paling dalam
      const sent = (String(mark || '').match(/^.+?[.!?](?=\s|$)/) || [mark || ''])[0];
      (known[who] = known[who] || []).push({ pid: n.id, day: tm.day, text: sent.replace(/\*/g, '') });
    } else raw = paras(n.body);
    let ps = raw.map(p => inline(p));
    // jam di dalam teks: berkedip di awal dan di batas, diam di akhir
    if (n.id === ENTRY || n.id === 'Z00') ps = ps.map(p => p.replace(/\b(1[78])\.(40)\b/g, '<span class="loket">$1.<span class="blink">$2</span></span>'));
    if (n.kind === 'ending') ps = ps.map(p => p.replace(/\b(18)\.(40)\b/g, '<span class="loket still">$1.$2</span>'));
    // yang kamu tahu dari sela, sementara Laras tidak: nama pertama orang itu di simpul ini diberi titik
    if (n.kind !== 'perspective') {
      Object.keys(known).forEach(name => {
        for (let i = 0; i < ps.length; i++) { const re = nameRe(name); if (re.test(ps[i])) { ps[i] = ps[i].replace(re, `$1<button type="button" class="kn" data-who="${name}" aria-label="${esc(t(`${name}: yang kamu tahu dari selanya`, `${name}: what you know from the interlude`))}">$2</button>`); break; } }
      });
    }
    const body = ps.map(p => `<p>${p}</p>`);
    // benda di dalam cerita
    (BENDA[n.id] || []).forEach(o => {
      const i = raw.findIndex(p => p.includes(o.at)); if (i < 0) return;
      body[i] += bendaHTML(o, when);
    });
    sec.innerHTML = head + `<div class="n-body">${body.join('')}</div>`;
    // siapa di adegan ini
    const text = raw.join(' ');
    const cast = NAMES.filter(x => x !== 'Laras' && nameRe(x).test(text)).sort((a, b) => text.search(nameRe(a)) - text.search(nameRe(b)));
    sec.dataset.cast = (n.kind === 'perspective' ? [who, ...cast.filter(x => x !== who)] : ['Laras', ...cast]).join(' ');
    return sec;
  }

  /* ---------- pilihan: ditahan, dicap, yang lain tenggelam ---------- */
  const HOLD = 1100;
  function choiceEl(entry) {
    const n = N[entry.id];
    const opts = (n.choices || []).filter(c => has(flags, c.requires_flags));
    const kind = n.id === 'Z00' ? 'doors' : /^H/.test(n.id) ? 'acts' : 'places';
    const box = html(`<div class="choose c-${kind}" role="group" aria-label="${esc(prompt(n))}"><p class="ch-q">${esc(prompt(n))}</p><div class="ch-list"></div><p class="ch-hint">${esc(t('Tekan dan tahan pilihanmu', 'Press and hold your choice'))}</p></div>`);
    opts.forEach(c => {
      const ppl = people(c.label);
      const b = html(`<button type="button" class="opt" data-c="${c.id}"><span class="o-fill" aria-hidden="true"></span><span class="o-t">${esc(c.label)}${MEM.choices[c.id] ? `<small class="o-was">${esc(t('pernah kamu pilih', 'chosen before'))}</small>` : ''}</span>${kind === 'places' && ppl.length ? `<span class="o-p">${ppl.map(p => `<i title="${p}">${p[0]}</i>`).join('')}</span>` : ''}${kind === 'doors' ? `<span class="o-d">${/^Tidak menetap/i.test(c.label) ? t('tidak menetap', 'does not stay') : t('menetap', 'stays')}</span>` : ''}</button>`);
      let timer = 0;
      const stop = () => { if (!timer) return; clearTimeout(timer); timer = 0; b.classList.remove('holding'); box.classList.remove('pressing'); };
      b.addEventListener('pointerdown', e => {
        if (e.button || b.disabled || entry.choice) return;
        b.classList.add('holding'); box.classList.add('pressing');
        timer = setTimeout(() => { timer = 0; b.classList.remove('holding'); box.classList.remove('pressing'); choose(entry, c, box); }, HOLD);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, stop));
      b.addEventListener('click', e => { if (e.detail === 0) choose(entry, c, box); });   // papan ketik dan pembaca layar
      b.addEventListener('contextmenu', e => e.preventDefault());
      $('.ch-list', box).append(b);
    });
    if (entry.choice) settle(box, entry, false);
    return box;
  }
  function settle(box, entry, animate) {
    box.classList.add('done');
    const tm = timeOf(entry.id);
    $$('.opt', box).forEach(b => {
      const me = b.dataset.c === entry.choice;
      b.classList.toggle('picked', me); b.disabled = true; b.setAttribute('aria-pressed', String(me));
      if (me) b.insertAdjacentHTML('beforeend', `<span class="o-stamp" aria-hidden="true">${esc(t('Tercatat', 'Noted'))} · ${esc(DAYS[tm.day])}</span>`);
      else if (animate) { b.classList.add('sink'); setTimeout(() => { b.hidden = true; }, 900); }
      else b.hidden = true;
    });
    $('.ch-hint', box)?.remove();
    if (!box.querySelector('.ch-note')) box.append(html(`<p class="ch-note">${esc(t('Tercatat di Kartu Kepulangan', 'Noted on the Return Card'))}</p>`));
  }
  function continueEl(entry) {
    const n = N[entry.id];
    const label = n.kind === 'perspective' ? (run.queue.length ? t('Lanjut', 'Continue') : t('Kembali ke Laras', 'Back to Laras')) : t('Lanjut', 'Continue');
    const b = html(`<div class="cont"><button type="button" class="go">${esc(label)} <span aria-hidden="true">→</span></button></div>`);
    if (entry.done) { b.classList.add('done'); $('.go', b).disabled = true; }
    $('.go', b).onclick = () => { entry.done = true; b.classList.add('done'); $('.go', b).disabled = true; advance(); };
    return b;
  }

  function render(entry, idx, isNew) {
    const n = N[entry.id];
    const sec = nodeEl(entry, idx);
    if (n.kind === 'choice') sec.append(choiceEl(entry));
    else if (n.kind === 'perspective' || n.kind === 'callback') sec.append(continueEl(entry));
    else if (n.kind === 'ending') sec.append(endingEl(n));
    book.append(sec);
    if (isNew) {
      if (!reduced()) { sec.classList.add('enter'); $$('.bd', sec).forEach(b => b.classList.add('anim')); }
      if (n.id === ENTRY && !reduced()) { sec.classList.add('surface'); try { $('#waterGo').beginElement(); } catch (e) { /* tanpa SMIL */ } setTimeout(() => sec.classList.remove('surface'), 6500); }
      requestAnimationFrame(() => sec.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }));
    }
    threadSoon();
    return sec;
  }

  /* ---------- gerak cerita ---------- */
  function enter(id) {
    const n = N[id], prev = run.path[run.path.length - 1];
    const from = prev ? timeOf(prev.id) : null;
    if (/^C\d/.test(id)) run.snaps[id] = { flags: [...flags], visited: [...visited], path: JSON.parse(JSON.stringify(run.path)), queue: [], pNext: null };
    if (!visited.includes(id)) visited.push(id);
    (n.on_enter_flags || []).forEach(f => flags.add(f));
    const entry = { id };
    if (n.kind === 'perspective') {
      const q = (n.callbacks || []).filter(c => has(flags, c.requires_flags) && (c.visited_all || []).every(v => visited.includes(v)));
      run.queue = q.map(c => ({ id: c.target, because: c.requires_flags || [] }));
      run.pNext = n.next;
    }
    run.path.push(entry); save();
    const to = timeOf(id);
    if (from && (to.day > from.day || n.kind === 'ending')) night(from, to, n.kind === 'ending');
    if (n.kind === 'perspective') cross(whoOf(n));
    render(entry, run.path.length - 1, true);
    if (n.kind === 'ending') finish(n, true);
    frame(true);
  }
  function choose(entry, c, box) {
    if (entry.choice) return;
    entry.choice = c.id;
    (c.set_flags || []).forEach(f => flags.add(f));
    (c.unset_flags || []).forEach(f => flags.delete(f));
    settle(box, entry, !reduced());
    stamp(entry, c);
    SND?.stamp();
    save(); threadSoon();
    setTimeout(() => enter(c.target), reduced() ? 0 : 1000);
  }
  function advance() {
    const next = run.queue.shift();
    if (next) { save(); enterCallback(next); return; }
    const to = run.pNext; run.pNext = null; save(); enter(to);
  }
  function enterCallback(q) {
    const n = N[q.id];
    if (!visited.includes(q.id)) visited.push(q.id);
    (n.on_enter_flags || []).forEach(f => flags.add(f));
    const entry = { id: q.id, because: q.because };
    run.path.push(entry); save();
    const sec = render(entry, run.path.length - 1, true);
    ripple(sec);
    frame(true);
  }

  /* ---------- malam yang lewat, jam terakhir, masuk ke sela, riak gema ---------- */
  function overlay(cls, inner, ms) {
    if (reduced()) return null;
    const ov = html(`<div class="${cls}" aria-hidden="true">${inner}</div>`);
    document.body.append(ov);
    const end = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 650); };
    const timer = setTimeout(end, ms);
    ov.addEventListener('click', () => { clearTimeout(timer); end(); });
    return ov;
  }
  function night(from, to, last) {
    if (last) SND?.last(); else SND?.roll();
    if (last) {
      const ov = overlay('night last', `<p class="nt-k">${esc(dateOf(to))}</p><p class="nt-n"><b>17.40</b></p><p class="nt-u">${esc(t('batas', 'deadline'))}</p>`, 3800);
      if (!ov) return;
      const b = $('.nt-n b', ov), t0 = performance.now();
      const step = now => { const m = Math.min(60, Math.round(Math.pow(Math.min(1, (now - t0) / 2400), .7) * 60)); b.textContent = m < 60 ? `17.${String(m).padStart(2, '0')}` : '18.40'; if (m < 60) requestAnimationFrame(step); else ov.classList.add('stopped'); };
      requestAnimationFrame(step);
      return;
    }
    const a = left(from), z = left(to);
    const bar = `<span class="nt-bar">${Array.from({ length: 7 }, (_, k) => `<i class="${k < Math.min(7, to.day) ? 'gone' : ''}${k === to.day - 1 ? ' now' : ''}"></i>`).join('')}</span>`;
    const ov = overlay('night', `<p class="nt-k">${esc(`${DAYS[from.day]} ${PART[from.part]}`)} <span aria-hidden="true">→</span> ${esc(`${DAYS[to.day]} ${PART[to.part]}`)}</p><p class="nt-n"><b>${a}</b></p><p class="nt-u">${esc(t('jam tersisa', 'hours left'))}</p>${bar}<p class="nt-d">${esc(dateOf(to))}</p>`, 3000);
    if (!ov) return;
    const b = $('.nt-n b', ov), t0 = performance.now();
    const step = now => { const p = Math.min(1, (now - t0) / 2000), e = 1 - Math.pow(1 - p, 3); b.textContent = Math.round(a - (a - z) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('dawn')));
  }
  function cross(who) {
    SND?.cross();
    overlay(`cross who-${who}`, `<p class="cr-k">${esc(t('Sela', 'Interlude'))}</p><p class="cr-n">${esc(who)}</p><p class="cr-u">${esc(t('Laras tidak ikut ke sini', 'Laras does not come here'))}</p>`, 1600);
  }
  function ripple(sec) {
    SND?.echo();
    const ov = overlay('ripple', '<i></i><i></i><i></i>', 2400);
    if (ov) { const r = thread.getBoundingClientRect(); ov.style.setProperty('--x', (r.width ? r.left + r.width - 7 : 20) + 'px'); }
    const cause = sec.dataset.cause && $(`.node[data-id="${sec.dataset.cause}"] .opt.picked`, book);
    if (cause) { cause.classList.remove('called'); void cause.offsetWidth; cause.classList.add('called'); }
    sec.classList.add('arrive');
  }
  book.addEventListener('click', e => {
    const back = e.target.closest('.n-back');
    if (back) {
      const sec = back.closest('.node'), opt = $(`.node[data-id="${sec.dataset.cause}"] .opt.picked`, book);
      if (opt) { opt.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); opt.classList.remove('called'); void opt.offsetWidth; opt.classList.add('called'); }
      return;
    }
    const skip = e.target.closest('.n-skip');
    if (skip) { const to = $('.choose, .cont, .after', skip.closest('.node')); if (to) to.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); return; }
    const kn = e.target.closest('.kn');
    if (kn) { e.stopPropagation(); openPerson(kn.dataset.who, kn); }
  });

  /* ---------- benang jahitan di tepi buku ---------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const thread = document.createElementNS(SVGNS, 'svg');
  thread.id = 'thread'; thread.setAttribute('class', 'thread'); thread.setAttribute('aria-hidden', 'true');
  thread.innerHTML = '<defs><clipPath id="threadClip"><rect x="-40" y="0" width="120" height="0"/></clipPath></defs><g clip-path="url(#threadClip)"><path class="th-faint"/><path class="th-line"/><g class="th-loops"></g><g class="th-knots"></g></g>';
  book.append(thread);
  let drawRaf = 0;
  const threadSoon = () => { if (!drawRaf) drawRaf = requestAnimationFrame(() => { drawRaf = 0; drawThread(); }); };
  let loopsDrawn = new Set();
  function drawThread() {
    const secs = $$('.node', book); if (!secs.length) { thread.style.height = '0px'; return; }
    const br = book.getBoundingClientRect(), H = book.scrollHeight, w = thread.clientWidth || 18, X = w - 7;
    thread.style.height = H + 'px'; thread.setAttribute('viewBox', `0 0 ${w} ${H}`);
    const y0 = secs[0].offsetTop + 70, y1 = Math.max(y0, H - 40);
    const holes = secs.filter(s => s.classList.contains('k-perspective')).map(s => [s.offsetTop, s.offsetTop + s.offsetHeight]);
    let main = '', faint = '', y = y0;
    holes.forEach(([a, b]) => { if (a > y) main += `M${X} ${y}V${a}`; faint += `M${X} ${Math.max(a, y)}V${b}`; y = Math.max(y, b); });
    if (y < y1) main += `M${X} ${y}V${y1}`;
    $('.th-line', thread).setAttribute('d', main || 'M0 0'); $('.th-faint', thread).setAttribute('d', faint || 'M0 0');
    const yOf = el => { const r = el.getBoundingClientRect(); return r.top - br.top + r.height / 2; };
    $('.th-knots', thread).innerHTML = $$('.opt.picked', book).map(o => { const k = yOf(o); return `<path d="M${X - 4} ${k - 4}L${X + 4} ${k + 4}M${X + 4} ${k - 4}L${X - 4} ${k + 4}"/>`; }).join('');
    $('.th-loops', thread).innerHTML = $$('.node[data-cause]', book).map((s, i) => {
      const o = $(`.node[data-id="${s.dataset.cause}"] .opt.picked`, book); if (!o) return '';
      const a = yOf($('.n-head', s)), b = yOf(o), bx = Math.max(1, X - 9 - (i % 3) * 3), isNew = !loopsDrawn.has(s.dataset.i);
      loopsDrawn.add(s.dataset.i);
      return `<path class="${isNew && s.classList.contains('arrive') ? 'fresh' : ''}" pathLength="1" d="M${X} ${a}C${bx} ${a} ${bx} ${b} ${X} ${b}"/>`;
    }).join('');
    reveal();
  }
  function reveal() {
    const r = book.getBoundingClientRect();
    $('#threadClip rect', thread).setAttribute('height', Math.max(0, innerHeight * .72 - r.top));
  }
  if ('ResizeObserver' in window) new ResizeObserver(threadSoon).observe(book);
  document.fonts?.ready.then(threadSoon);

  /* ---------- benda yang bergerak saat terlihat ---------- */
  const seen = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; seen.unobserve(e.target); play(e.target); }), { rootMargin: '0px 0px -20% 0px' }) : null;
  new MutationObserver(() => $$('.bd.anim:not([data-watch])', book).forEach(b => { b.dataset.watch = ''; if (seen) seen.observe(b); else b.classList.remove('anim'); })).observe(book, { childList: true, subtree: true });
  async function play(b) {
    if (b.dataset.k === 'draft') {
      const list = $('.bd-list', b), last = list.lastElementChild, field = $('.bd-field', b);
      last.remove(); b.classList.remove('anim'); b.classList.add('typing');
      const items = $$('.bd-m', list); items.forEach(m => m.classList.add('wait'));
      for (const m of items) { await sleep(500); m.classList.remove('wait'); }
      const states = [...JSON.parse(b.dataset.tries || '[]'), b.dataset.final];
      let cur = '';
      for (const s of states) {
        let k = 0; while (k < cur.length && k < s.length && cur[k] === s[k]) k++;
        while (cur.length > k) { cur = cur.slice(0, -1); field.textContent = cur; await sleep(22); }
        await sleep(cur ? 180 : 320);
        while (cur.length < s.length) { cur = s.slice(0, cur.length + 1); field.textContent = cur; await sleep(46 + Math.random() * 40); }
        await sleep(s === b.dataset.final ? 420 : 900);
      }
      field.textContent = ''; list.append(last); last.classList.add('sent'); b.classList.remove('typing');
      return;
    }
    const items = $$('.bd-m, .bd-tag, .bd-env', b);
    items.forEach(m => m.classList.add('wait'));
    b.classList.remove('anim'); b.classList.add('arrived');
    for (const m of items) { await sleep(m.classList.contains('bd-m') ? 520 : 160); m.classList.remove('wait'); }
  }

  /* ---------- orang, dan yang kamu tahu ---------- */
  const sheet = $('#sheet');
  let sheetFrom = null;
  function openPerson(name, from) {
    const p = PEOPLE[name]; if (!p) return;
    const age = (y, v) => `<span><small>${y}</small><b>${v}</b></span>`;
    let ages = '';
    if (p.born) ages = age(1997, '—') + '<i aria-hidden="true">→</i>' + age(2026, p.now) + `<em>${esc(t(`lahir ${p.born}`, `born ${p.born}`))}</em>`;
    else if (p.then != null) ages = age(1997, p.then) + `<i aria-hidden="true">${name === 'Laras' ? '=' : '→'}</i>` + age(2026, p.now) + `<em>${esc(name === 'Laras' ? t('Tubuhnya tidak ikut menua.', 'Her body did not age.') : t(`${p.now - p.then} tahun tanpa Laras`, `${p.now - p.then} years without Laras`))}</em>`;
    else ages = age(2026, p.now);
    const k = (known[name] || []).map(x => `<li><small>${esc(t(`Sela, ${DAYS[x.day]} malam`, `Interlude, ${DAYS[x.day]} night`))}</small><q>${esc(x.text)}</q></li>`).join('');
    $('#sheetBody').innerHTML = `<p class="sh-k">${esc(from && from.classList.contains('kn') ? t('Yang kamu tahu', 'What you know') : t('Di adegan ini', 'In this scene'))}</p><h3 id="sheetTitle">${esc(name)}</h3><p class="sh-rel">${esc(p.rel)}</p><div class="sh-ages">${ages}</div>${k ? `<div class="sh-know"><p class="sh-k">${esc(t('Dari selanya', 'From the interlude'))}</p><ul>${k}</ul><p class="sh-not">${esc(t('Laras tidak mengetahui ini.', 'Laras does not know this.'))}</p></div>` : ''}`;
    sheet.hidden = false; sheet.dataset.who = name; sheetFrom = from || null;
    $('#sheetClose').focus({ preventScroll: true });
  }
  const closeSheet = () => { if (sheet.hidden) return; sheet.hidden = true; sheetFrom?.focus({ preventScroll: true }); sheetFrom = null; };
  $('#sheetClose').addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  document.addEventListener('click', e => { if (!sheet.hidden && !sheet.contains(e.target) && !e.target.closest('.kn, .ck-p')) closeSheet(); });
  $('#cast').addEventListener('click', e => { const b = e.target.closest('.ck-p'); if (b) { e.stopPropagation(); openPerson(b.dataset.who, b); } });

  /* ---------- Kartu Kepulangan ---------- */
  function cardHTML() {
    const rows = [];
    for (let d = 0; d < 7; d++) {
      const c = run.path.find(e => e.id === `C0${d + 1}`), h = run.path.find(e => new RegExp(`^H${d + 1}[A-D]$`).test(e.id));
      const cl = c && c.choice ? labelOf(c.id, c.choice) : '', hl = h && h.choice ? labelOf(h.id, h.choice) : '';
      const echoes = run.path.filter(e => N[e.id].kind === 'callback' && run.path.indexOf(e) > run.path.indexOf(h || c || {}) && (d === 6 || run.path.indexOf(e) < run.path.findIndex(x => x.id === `C0${d + 2}`)));
      rows.push(`<li class="${cl ? 'on' : ''}"><span class="cd-day"><b>${esc(DAYS[d])}</b><small>${9 + d} Nov</small></span><span class="cd-what">${cl ? `<span class="stamp">${esc(cl)}</span>` : `<span class="cd-empty">—</span>`}${hl ? `<span class="hand">${esc(hl)}</span>` : ''}${echoes.length ? `<span class="cd-echo">${esc(t(`${echoes.length} gema`, `${echoes.length} echo${echoes.length > 1 ? 'es' : ''}`))}</span>` : ''}</span></li>`);
    }
    const z = run.path.find(e => e.id === 'Z00'), zl = z && z.choice ? labelOf('Z00', z.choice) : '';
    rows.push(`<li class="last ${zl ? 'on' : ''}"><span class="cd-day"><b>${esc(DAYS[7])}</b><small>16 Nov · 18.40</small></span><span class="cd-what">${zl ? `<span class="stamp final">${esc(zl)}</span>` : `<span class="cd-empty">${esc(t('belum diputuskan', 'not decided yet'))}</span>`}</span></li>`);
    return `<p class="cd-who"><span><small>${esc(t('Nama', 'Name'))}</small><b>Laras</b></span><span><small>${esc(t('Usia saat kembali', 'Age on return'))}</small><b>31</b></span><span><small>${esc(t('Masa sementara', 'Interim'))}</small><b>${esc(t('168 jam', '168 h'))}</b></span></p><ol class="cd-days">${rows.join('')}</ol><p class="cd-foot">${esc(t('Yang dicatat hanya yang dipilih. Pilihan yang tidak diambil tidak tercatat.', 'Only what was chosen is recorded. Choices not taken are not kept.'))}</p>`;
  }
  const cardDlg = $('#cardDialog');
  $('#openCard').addEventListener('click', () => { $('#cardBody').innerHTML = run ? cardHTML() : `<p class="cd-foot">${esc(t('Perjalanan belum dimulai.', 'The journey has not started.'))}</p>`; cardDlg.showModal(); });
  cardDlg.addEventListener('click', e => { if (e.target === cardDlg || e.target.closest('[data-close]')) cardDlg.close(); });
  function stamp(entry, c) {
    const b = $('#openCard'); b.classList.remove('stamped'); void b.offsetWidth; b.classList.add('stamped');
    $('#announcement').textContent = t('Tercatat di Kartu Kepulangan.', 'Noted on the Return Card.');
    const tm = timeOf(entry.id), journey = /^H/.test(entry.id);
    overlay('slip', `<span class="sl-k">${esc(t('Kartu Kepulangan', 'Return Card'))}</span><span class="sl-row"><span class="sl-day"><b>${esc(DAYS[tm.day])}</b><small>${9 + tm.day} Nov</small></span>${journey ? `<span class="hand">${esc(c.label)}</span>` : `<span class="stamp${entry.id === 'Z00' ? ' final' : ''}">${esc(c.label)}</span>`}</span>`, 1900);
  }

  /* ---------- akhir: pola jahitan ---------- */
  function endingEl() {
    return html(`<div class="after" id="after"><p class="af-k">${esc(t('Salah satu dari delapan akhir', 'One of eight endings'))}</p><div class="map" id="map"></div><div class="af-act"><button type="button" class="go" id="again">${esc(t('Pulang lagi', 'Come back again'))}</button><button type="button" class="ghost" id="shareEnd">${esc(t('Bagikan kartu akhir', 'Share the ending card'))}</button><label class="af-from"><span>${esc(t('atau mulai lagi dari', 'or start again from'))}</span><select id="fromDay"></select></label></div><div class="af-next" id="afNext"></div></div>`);
  }
  function finish(n, isNew) {
    const found = new Set(store.get('usia:endings', []) || []); found.add(n.id); store.set('usia:endings', [...found]);
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
    const pr = store.get('prog', {}) || {}; pr[SLUG] = 1; store.set('prog', pr);
    paintMap(n, found, isNew);
    $('#again').onclick = () => { if (!confirm(t('Mulai perjalanan baru? Kartu ini akan diganti.', 'Start a new journey? This card will be replaced.'))) return; startFresh(); };
    const sel = $('#fromDay');
    sel.innerHTML = `<option value="">${esc(t('pilih hari…', 'choose a day…'))}</option>` + Object.keys(run.snaps).sort().map(id => `<option value="${id}">${esc(DAYS[timeOf(id).day])} · ${esc(shortTitle(N[id]))}</option>`).join('');
    sel.onchange = () => { if (sel.value) startFrom(sel.value); };
    $('#shareEnd').onclick = () => shareCard(n, found);
    if (G) $('#afNext').innerHTML = G.next(SLUG);
  }
  // pola jahitan: satu model, digambar sebagai SVG di halaman dan di kanvas untuk kartu bagikan
  function patternModel(endNode) {
    const v = new Set(visited), idxOf = (id, cid) => Math.max(0, (N[id].choices || []).findIndex(c => c.id === cid));
    const rowY = d => 46 + d * 42, cx = i => 52 + i * 20, hx = i => 152 + i * 20, PX = 262, zy = 352;
    const m = { W: 320, H: 400, cx, hx, PX, zy, days: [], grid: [], pts: [], cs: [], hs: [], ps: [], echoes: [], knot: null, tail: null };
    for (let d = 0; d < 7; d++) {
      const y = rowY(d), C = 'C0' + (d + 1), P = 'P0' + (d + 1);
      m.days.push({ y, label: DAYS[d].slice(0, 3) });
      for (let i = 0; i < 4; i++) m.grid.push([cx(i), y], [hx(i), y]);
      const ce = run.path.find(e => e.id === C);
      if (ce && ce.choice) { const x = cx(idxOf(C, ce.choice)); m.pts.push([x, y]); m.cs.push({ x, y, id: C, label: labelOf(C, ce.choice) }); }
      const he = run.path.find(e => new RegExp(`^H${d + 1}[A-D]$`).test(e.id));
      if (he) { const x = hx(he.choice ? idxOf(he.id, he.choice) : 0); m.pts.push([x, y]); m.hs.push({ x, y, id: he.id, label: he.choice ? labelOf(he.id, he.choice) : shortTitle(N[he.id]) }); }
      if (v.has(P)) {
        m.pts.push([PX, y]); m.ps.push({ x: PX, y, id: P, letter: whoOf(N[P])[0] });
        const pi = run.path.findIndex(e => e.id === P);
        for (let j = pi + 1, k = 0; j < run.path.length && N[run.path[j].id].kind === 'callback'; j++, k++) m.echoes.push({ x: PX + 13 + k * 12, y, id: run.path[j].id, label: shortTitle(N[run.path[j].id]) });
      }
    }
    for (let i = 0; i < 8; i++) m.grid.push([46 + i * 32, zy]);
    const ze = run.path.find(e => e.id === 'Z00');
    if (ze && ze.choice) {
      const zx = 46 + idxOf('Z00', ze.choice) * 32; m.pts.push([zx, zy]);
      if (endNode && STAYS(endNode.id)) m.knot = [zx, zy]; else m.tail = [zx, zy];
    }
    return m;
  }
  function pattern(endNode) {
    const m = patternModel(endNode);
    const grid = m.grid.map(([x, y]) => `<circle class="pt-dot" cx="${x}" cy="${y}" r="1.6"/>`).join('');
    const labels = m.days.map(d => `<text class="pt-day" x="10" y="${d.y + 4}">${esc(d.label)}</text>`).join('');
    let marks = m.cs.map(c => `<circle class="st lit" data-id="${c.id}" cx="${c.x}" cy="${c.y}" r="4.5"><title>${esc(c.label)}</title></circle>`).join('');
    marks += m.hs.map(h => `<rect class="st lit" data-id="${h.id}" x="${h.x - 4}" y="${h.y - 4}" width="8" height="8" transform="rotate(45 ${h.x} ${h.y})"><title>${esc(h.label)}</title></rect>`).join('');
    marks += m.ps.map(p => `<g class="st lit" data-id="${p.id}"><circle cx="${p.x}" cy="${p.y}" r="9"/><text x="${p.x}" y="${p.y + 3.5}">${esc(p.letter)}</text></g>`).join('');
    marks += m.echoes.map(e => `<path class="pt-echo" data-id="${e.id}" d="M${e.x} ${e.y}a5 5 0 1 1 0.1 0"><title>${esc(e.label)}</title></path>`).join('');
    if (m.knot) marks += `<circle class="pt-knot" cx="${m.knot[0]}" cy="${m.knot[1]}" r="5.5"/>`;
    const tail = m.tail ? `<path class="pt-tail" d="M${m.tail[0]} ${m.tail[1]}L${m.tail[0]} 404"/>` : '';
    const d = m.pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
    return `<svg class="pattern" viewBox="0 0 ${m.W} ${m.H}" role="img" aria-label="${esc(t('Pola jahitan perjalananmu', 'The stitch pattern of your journey'))}"><defs><pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6M3 0V6" class="pt-weave"/></pattern></defs><rect class="pt-cloth" x="0" y="0" width="${m.W}" height="${m.H}" rx="14"/><rect x="0" y="0" width="${m.W}" height="${m.H}" rx="14" fill="url(#weave)"/>${labels}<text class="pt-col" x="${m.cx(0) - 6}" y="22">${esc(t('pagi', 'morning'))}</text><text class="pt-col" x="${m.hx(0) - 6}" y="22">${esc(t('siang', 'afternoon'))}</text><text class="pt-col" x="${m.PX - 12}" y="22">${esc(t('sela', 'interlude'))}</text>${grid}<g class="pt-run"><path class="pt-thread" d="${d}"/>${tail}</g>${marks}<text class="pt-day" x="10" y="${m.zy + 4}">${esc(DAYS[7].slice(0, 3))}</text></svg>`;
  }

  /* ---------- kartu bagikan akhir: gambar PNG dari pola jahitan dan akhirnya ---------- */
  const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  function wrap(x, text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let line = '';
    words.forEach(w => { const tryL = line ? line + ' ' + w : w; if (x.measureText(tryL).width > maxW && line) { lines.push(line); line = w; } else line = tryL; });
    if (line) lines.push(line); return lines;
  }
  async function cardBlob(endNode, found) {
    try { await Promise.all(['900 120px Doto', '500 60px Newsreader', '400 34px Newsreader', '600 26px Geist'].map(f => document.fonts.load(f))); } catch (e) { /* huruf cadangan */ }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), INK = '#F4F4F5', MUT = 'rgba(244,244,245,.6)', BLUE = '#6E9BFF', ECHO = '#B39BFF';
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#090B1A'); g.addColorStop(.55, '#1E1238'); g.addColorStop(1, '#4A1E4E');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    rr(x, 56, 56, W - 112, H - 112, 60); x.fillStyle = '#111113'; x.fill();
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const sp = v => { try { x.letterSpacing = v; } catch (e) { /* lama */ } };
    sp('5px'); x.font = '600 24px Geist, system-ui, sans-serif'; x.fillStyle = MUT; x.fillText('QUIET MARGINS · TEMUSAI', W / 2, 146);
    sp('-3px'); x.font = '900 112px Doto, ui-monospace, monospace'; x.fillStyle = INK; x.fillText('USIA PULANG', W / 2, 262);
    sp('4px'); x.font = '600 24px Geist, system-ui, sans-serif'; x.fillStyle = MUT; x.fillText(t(`AKHIR ${ENDINGS.indexOf(endNode.id) + 1} DARI 8 · ${found.size}/8 DITEMUKAN`, `ENDING ${ENDINGS.indexOf(endNode.id) + 1} OF 8 · ${found.size}/8 FOUND`), W / 2, 330);
    sp('0px'); x.font = '500 60px Newsreader, Georgia, serif'; x.fillStyle = INK;
    const tl = wrap(x, shortTitle(endNode), 820); tl.slice(0, 2).forEach((l, i) => x.fillText(l, W / 2, 402 + i * 64));
    const by = 402 + Math.min(2, tl.length) * 64 - 8;
    x.font = '400 32px Newsreader, Georgia, serif'; x.fillStyle = MUT; x.fillText(STAYS(endNode.id) ? t('Laras menetap.', 'Laras stays.') : t('Laras tidak menetap.', 'Laras does not stay.'), W / 2, by);
    // pola
    const m = patternModel(endNode), s = 1.55, ox = (W - m.W * s) / 2, oy = by + 34;
    rr(x, ox, oy, m.W * s, m.H * s, 28); x.fillStyle = '#1C1C1F'; x.fill();
    const P = ([px, py]) => [ox + px * s, oy + py * s];
    x.fillStyle = 'rgba(244,244,245,.22)'; m.grid.forEach(q => { const [a, b] = P(q); x.beginPath(); x.arc(a, b, 2.4, 0, 7); x.fill(); });
    x.font = '700 15px Doto, ui-monospace, monospace'; x.textAlign = 'left'; x.fillStyle = MUT;
    m.days.forEach(d => { const [a, b] = P([10, d.y + 4]); x.fillText(d.label.toUpperCase(), a, b); });
    { const [a, b] = P([10, m.zy + 4]); x.fillText(DAYS[7].slice(0, 3).toUpperCase(), a, b); }
    x.setLineDash([9, 6]); x.lineWidth = 2.6; x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); m.pts.forEach((q, i) => { const [a, b] = P(q); i ? x.lineTo(a, b) : x.moveTo(a, b); });
    if (m.tail) { const [a, b] = P([m.tail[0], 404]); x.lineTo(a, Math.min(b, oy + m.H * s)); }
    x.stroke(); x.setLineDash([]);
    m.cs.forEach(q => { const [a, b] = P([q.x, q.y]); x.beginPath(); x.arc(a, b, 7, 0, 7); x.fillStyle = '#1C1C1F'; x.fill(); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke(); });
    m.hs.forEach(q => { const [a, b] = P([q.x, q.y]); x.save(); x.translate(a, b); x.rotate(Math.PI / 4); x.fillStyle = BLUE; x.fillRect(-6, -6, 12, 12); x.restore(); });
    x.textAlign = 'center'; x.font = '900 16px Doto, ui-monospace, monospace';
    m.ps.forEach(q => { const [a, b] = P([q.x, q.y]); x.beginPath(); x.arc(a, b, 14, 0, 7); x.fillStyle = INK; x.fill(); x.fillStyle = '#1C1C1F'; x.fillText(q.letter, a, b + 6); });
    m.echoes.forEach(q => { const [a, b] = P([q.x, q.y]); x.beginPath(); x.arc(a + 8, b, 8, 0, 7); x.lineWidth = 2.2; x.strokeStyle = ECHO; x.stroke(); });
    if (m.knot) { const [a, b] = P(m.knot); x.beginPath(); x.arc(a, b, 9, 0, 7); x.fillStyle = BLUE; x.fill(); }
    // angka
    const choices = run.path.filter(e => e.choice).length, echoes = run.path.filter(e => N[e.id].kind === 'callback').length;
    const words = $$('.n-body > p', book).reduce((n, el) => n + el.textContent.trim().split(/\s+/).length, 0);
    x.textAlign = 'center'; sp('0px'); x.font = '500 26px Geist, system-ui, sans-serif'; x.fillStyle = INK;
    x.fillText(t(`${choices} pilihan · ${echoes} gema · ${words.toLocaleString('id-ID')} dari ${TOTAL_WORDS.toLocaleString('id-ID')} kata`, `${choices} choices · ${echoes} echoes · ${words.toLocaleString('en-GB')} of ${TOTAL_WORDS.toLocaleString('en-GB')} words`), W / 2, H - 132);
    x.font = '500 22px Geist, system-ui, sans-serif'; x.fillStyle = MUT; x.fillText('quietmargins.site/antologi/usia-pulang', W / 2, H - 92);
    return new Promise(res => c.toBlob(res, 'image/png'));
  }
  let shareUrl = '';
  async function shareCard(endNode, found) {
    const dlg = $('#shareDialog'), img = $('#shareImg'), save = $('#shareSave'), go = $('#shareGo');
    img.removeAttribute('src'); dlg.showModal(); dlg.dataset.ready = '';
    delete dlg.dataset.ready;
    const blob = await cardBlob(endNode, found); if (!blob) return;
    if (shareUrl) URL.revokeObjectURL(shareUrl);
    shareUrl = URL.createObjectURL(blob);
    const name = `usia-pulang-${fold(shortTitle(endNode))}.png`, file = new File([blob], name, { type: 'image/png' });
    img.src = shareUrl; img.alt = t(`Kartu akhir: ${shortTitle(endNode)}`, `Ending card: ${shortTitle(endNode)}`);
    save.href = shareUrl; save.download = name;
    const can = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    go.hidden = !can;
    go.onclick = () => navigator.share({ files: [file], title: 'Usia Pulang', text: `${shortTitle(endNode)} · quietmargins.site` }).catch(() => {});
    dlg.dataset.ready = '';
  }
  const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function paintMap(endNode, found, isNew) {
    const ends = ENDINGS.map(id => `<span class="mp-end ${found.has(id) ? 'found' : ''}${endNode && id === endNode.id ? ' here' : ''}"><i class="${STAYS(id) ? 'e-stay' : 'e-go'}" aria-hidden="true"></i><b>${found.has(id) ? esc(shortTitle(N[id])) : '—'}</b></span>`).join('');
    const words = $$('.n-body > p', book).reduce((s, el) => s + (el.textContent.trim().split(/\s+/).length), 0);
    const map = $('#map');
    map.innerHTML = `<p class="mp-k">${esc(t('Pola jahitan perjalananmu', 'The stitch pattern of your journey'))}</p>${pattern(endNode)}
      <p class="mp-legend"><span><i class="lg-c"></i>${esc(t('tujuan pagi', 'morning'))}</span><span><i class="lg-h"></i>${esc(t('tindakan siang', 'afternoon'))}</span><span><i class="lg-p"></i>${esc(t('sela', 'interlude'))}</span><span><i class="lg-e"></i>${esc(t('gema', 'echo'))}</span><span><i class="lg-k"></i>${esc(t('menetap', 'stays'))}</span></p>
      <p class="mp-words">${esc(t(`Kamu membaca ${words.toLocaleString('id-ID')} dari ${TOTAL_WORDS.toLocaleString('id-ID')} kata.`, `You read ${words.toLocaleString('en-GB')} of ${TOTAL_WORDS.toLocaleString('en-GB')} words.`))}</p>
      <p class="mp-k">${esc(t(`Akhir yang sudah kamu temukan: ${found.size} dari ${ENDINGS.length}`, `Endings you have found: ${found.size} of ${ENDINGS.length}`))}</p><div class="mp-ends">${ends}</div>`;
    if (isNew && !reduced()) map.classList.add('sew');
  }

  /* ---------- mulai, lanjutkan, ulang ---------- */
  function rebuild() {
    $$('.node', book).forEach(n => n.remove());
    flags = new Set(run.flags || []); visited = [...(run.visited || [])]; known = {}; loopsDrawn = new Set();
    const fl = new Set(), vi = [];
    lastDay = 0;
    run.path.forEach((e, i) => {
      const n = N[e.id]; if (!n) return;
      if (!vi.includes(e.id)) vi.push(e.id);
      (n.on_enter_flags || []).forEach(f => fl.add(f));
      const keep = [flags, visited]; flags = fl; visited = vi;
      render(e, i, false);
      flags = keep[0]; visited = keep[1];
      if (e.choice) { const c = (n.choices || []).find(x => x.id === e.choice); (c?.set_flags || []).forEach(f => fl.add(f)); (c?.unset_flags || []).forEach(f => fl.delete(f)); }
    });
    const last = run.path[run.path.length - 1];
    if (last && N[last.id].kind === 'ending') finish(N[last.id], false);
    frame(true);
  }
  function begin() {
    $('#cover').classList.add('started');
    if (!run) { run = fresh(); flags = new Set(); visited = []; known = {}; enter(ENTRY); }
    else rebuild();
    const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  function startFresh() { remember(run); run = fresh(); flags = new Set(); visited = []; known = {}; loopsDrawn = new Set(); $$('.node', book).forEach(n => n.remove()); save(); enter(ENTRY); }
  function startFrom(id) {
    const s = run.snaps[id]; if (!s) return;
    remember(run);
    const snaps = Object.fromEntries(Object.entries(run.snaps).filter(([k]) => k < id));
    run = { ...fresh(), path: s.path, flags: s.flags, visited: s.visited, snaps };
    flags = new Set(s.flags); visited = [...s.visited];
    rebuild(); enter(id);
  }
  {
    const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st);
    const act = $('#coverAct');
    const lastE = run && run.path[run.path.length - 1];
    act.innerHTML = run && lastE ? `<button type="button" class="go" id="begin">${esc(t('Lanjutkan', 'Continue'))} · ${esc(DAYS[timeOf(lastE.id).day])}</button><button type="button" class="ghost" id="newRun">${esc(t('Mulai dari awal', 'Start over'))}</button>`
      : `<button type="button" class="go" id="begin">${esc(t('Mulai · Senin, 18.40', 'Begin · Monday, 18:40'))}</button>`;
    $('#begin').onclick = begin;
    $('#newRun')?.addEventListener('click', () => { if (confirm(t('Mulai perjalanan baru? Kartu yang lama akan diganti.', 'Start a new journey? The old card will be replaced.'))) { run = null; $('#cover').classList.add('started'); startFresh(); } });
  }
  $('#restart').onclick = () => { $('#settingsDialog').close(); if (confirm(t('Mulai perjalanan baru? Kartu yang lama akan diganti.', 'Start a new journey? The old card will be replaced.'))) { $('#cover').classList.add('started'); startFresh(); } };
  $('#restartLabel').textContent = t('Perjalanan', 'Journey'); $('#restart').textContent = t('Mulai baru', 'Start over');

  /* ---------- jam, langit, siapa di adegan ---------- */
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  let shownKey = '';
  function frame(force) {
    reveal();
    const secs = $$('.node', book); if (!secs.length) { $('#clock').hidden = true; return; }
    const line = innerHeight * .4;
    let cur = secs[0]; secs.forEach(s => { if (s.getBoundingClientRect().top < line) cur = s; });
    const id = cur.dataset.id, n = N[id], tm = timeOf(id), away = n.kind === 'perspective', key = cur.dataset.i + id;
    $('#clock').hidden = false;
    if (key === shownKey && !force) return;
    shownKey = key;
    $('#clock').classList.toggle('away', away); $('#openCard').classList.toggle('away', away);
    $('#ckWhen').innerHTML = away ? `<b>${esc(t('Sela', 'Interlude'))} · ${esc(whoOf(n))}</b><span>${esc(t('Laras tidak di sini', 'Laras is not here'))}</span>` : `<b>${esc(dateOf(tm))}</b><span>${esc(PART[tm.part])} · ${esc(t(`sisa ${left(tm)} jam`, `${left(tm)} hours left`))}</span>`;
    const tt = $('#ckTime'), still = n.kind === 'ending';
    tt.hidden = !tm.exact || away;
    if (tm.exact) tt.innerHTML = `<span>${still ? tm.exact : tm.exact.replace(/\.(\d\d)$/, '.<span class="blink">$1</span>')}</span><small>${esc(id === 'Z00' ? t('sisa 1 jam', '1 hour left') : id === ENTRY ? t('sisa 168 jam', '168 hours left') : t('batas', 'deadline'))}</small>`;
    tt.classList.toggle('still', still);
    const f = elapsed(tm) / 168;
    $('#ckBar').innerHTML = Array.from({ length: 7 }, (_, k) => `<i style="--f:${Math.max(0, Math.min(1, f * 7 - k)).toFixed(3)}"></i>`).join('');
    const cast = (cur.dataset.cast || '').split(' ').filter(Boolean).slice(0, 5);
    $('#cast').innerHTML = cast.map(x => `<button type="button" class="ck-p${x === 'Laras' ? ' me' : ''}" data-who="${x}" aria-label="${esc(x)}, ${PEOPLE[x].now} ${esc(t('tahun', 'years'))}"><span aria-hidden="true">${esc(x[0])}</span><small aria-hidden="true">${PEOPLE[x].now}</small></button>`).join('');
    if (G) { $('#stepChip').hidden = false; G.step(Math.min(7, tm.day + 1), 7, t('Hari', 'Day')); }
    root.dataset.backdrop = isDark() || away ? 'malam' : SKY[tm.part];
    SND?.part(tm.part, away);
    const pr = store.get('prog', {}) || {}; if ((pr[SLUG] || 0) < 1) { pr[SLUG] = +(elapsed(tm) / 168).toFixed(3); store.set('prog', pr); }
  }
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, { passive: true });
  addEventListener('resize', threadSoon);
  addEventListener('qm-frame', () => { shownKey = ''; frame(); });

  /* ---------- pengaturan baca ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; threadSoon(); };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  $('#openCard').setAttribute('aria-label', t('Kartu Kepulangan', 'Return Card'));
  if (MEM.runs) $('#cvLeft').textContent = t(`Perjalanan ke-${MEM.runs + 1}`, `Journey ${MEM.runs + 1}`);
  { const d = $('#shareDialog'); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); }
  $('#shareKick').textContent = t('Kartu akhir', 'Ending card'); $('#shareTitle').textContent = t('Bagikan', 'Share');
  $('#shareGo').textContent = t('Bagikan', 'Share'); $('#shareSave').textContent = t('Unduh gambar', 'Download image');

  /* ---------- suasana pelabuhan (suara.js), mati sampai pembaca menyalakannya ---------- */
  {
    const btn = $('#sound'), row = btn.closest('.setting-row');
    if (!SND || !SND.supported) row.hidden = true;
    $('#soundLabel').textContent = t('Suasana pelabuhan', 'Harbour sound');
    const paint = () => { const on = !!SND?.isOn(); btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on'); };
    btn.addEventListener('click', () => { const on = !SND.isOn(); SND.setOn(on); store.set('usia:sound', on); paint(); shownKey = ''; frame(true); });
    // suara yang pernah dinyalakan menunggu sentuhan pertama (peramban tidak mengizinkan suara sebelumnya)
    if (SND && store.get('usia:sound', false)) { const wake = () => { removeEventListener('pointerdown', wake, true); removeEventListener('keydown', wake, true); SND.setOn(true); paint(); shownKey = ''; frame(true); }; addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true); }
    paint();
  }
  $('#cast').setAttribute('aria-label', t('Di adegan ini', 'In this scene'));
  $('#sheetClose').setAttribute('aria-label', t('Tutup', 'Close'));

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, title: t('Usia Pulang', 'Usia Pulang'), helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#begin',
      lede: t('Novel interaktif. Laras punya 168 jam untuk memutuskan apakah akan menetap.', 'An interactive novel. Laras has 168 hours to decide whether to stay.'),
      steps: [
        t('Tujuh hari. Setiap hari dimulai bersama keluarga, lalu kamu memilih ke mana Laras pergi dan apa yang ia lakukan.', 'Seven days. Each day begins with the family, then you choose where Laras goes and what she does.'),
        t('Tekan dan tahan pilihanmu sampai tercap (dengan papan ketik: Enter). Pilihan tidak bisa ditarik kembali, dan tidak ada nilai baik atau buruk.', 'Press and hold your choice until it is stamped (keyboard: Enter). Choices cannot be taken back, and nothing is scored.'),
        t('Sela membawamu ke pikiran orang lain. Laras tidak mengetahui apa yang kamu baca di sana; nama yang bertitik menyimpan yang kamu tahu. Gema adalah akibat pilihanmu yang datang belakangan, dijahit kembali ke pilihan itu.', 'Interludes take you into someone else’s mind. Laras does not know what you read there; dotted names keep what you know. Echoes are consequences that arrive later, stitched back to the choice.'),
        t('Ketuk inisial di bawah jam untuk melihat siapa di adegan dan usia mereka. Kartu Kepulangan (ikon kartu) mencatat jalanmu. Ada delapan akhir.', 'Tap the initials under the clock to see who is in the scene and their ages. The Return Card (card icon) records your path. There are eight endings.')
      ] });
    G.settings();
  }
  frame(true);
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
