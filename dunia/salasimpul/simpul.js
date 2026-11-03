/* Salasimpul: catatan-catatan sebuah kota yang saling menyimpul.
   Data dari content/salasimpul.json (disusun oleh tools/salasimpul.js dari content/salasimpul/<penulis>/*.md).

   - Partitur: satu garis per penulis, satu titik per catatan, urut waktu; benang di antara catatan yang menyimpul.
   - Kenalan: pembaca orang baru. Dua catatan pertama tiap orang terbuka; catatan berikutnya terbuka sejauh pembaca
     mengenal orang itu lewat catatan orang lain (yang menyebut namanya atau menyimpul ke bukunya). Catatan yang
     disimpul langsung dari catatan yang sudah dibaca selalu terbuka. Beberapa catatan kunci menunggu fakta tertentu.
     Selalu ada "Buka saja", dan "Kota terbuka" di Aa membuka semuanya.
   - Yang kamu tahu: kalimat @claims yang sudah terbaca menjadi fakta yang diketahui pembaca.
   - Kalimat @irony menyala setelah semua faktanya diketahui, juga di catatan yang dibaca sebelumnya.
   Teks catatan tidak diubah; tanda-tandanya hanya dipakai sebagai data. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1';
  const mem = {};
  const store = {
    get(k, d) { if (PREVIEW && k === 'simpul') return k in mem ? mem[k] : d; try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && k === 'simpul') { mem[k] = v; return; } try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'salasimpul', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.lang = t('id', 'en');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- teks antarmuka ---------- */
  if (EN) {
    $('#kick').textContent = 'A world · Notes';
    $('#lede').textContent = 'Eighteen people keep notes, not knowing their writing ties itself into knots.';
    $('#rule1').textContent = 'You are new here. Everyone opens their notebook as far as you know them, and you get to know them through other people.';
    $('#rule2').textContent = 'Every note ends at a crossroads. Pull the thread to someone else, go on in their notebook, or see what happened in the town meanwhile. Your way becomes one thread.';
    $('#rule3').textContent = 'Sentences you understand later will light up, even on pages you have already read.';
    $('#lost').hidden = false; $('#lost').textContent = 'These notes are not translated yet, so they are shown in the original Indonesian.';
    $('#tabAngle').textContent = 'Angle'; $('#tabBook').textContent = 'Your edit'; $('label[for=cityRange]').firstChild.textContent = 'The city in ';
    $('#tabScore').textContent = 'Score'; $('#scoreHint').textContent = 'Tap a name to highlight someone. Tap a dot to peek.'; $('#tabPeople').textContent = 'People'; $('#tabTime').textContent = 'Time';
    $('#knowKick').textContent = 'What you know';
    $('#openLabel').textContent = 'Open city'; $('#soundLabel').textContent = 'Sound of the rooms'; $('#resetLabel').textContent = 'Your memory of this city'; $('#reset').textContent = 'Start from zero';
  }
  $('#openKnow').setAttribute('aria-label', t('Yang kamu tahu', 'What you know'));

  /* ---------- dunia ---------- */
  let W = null;
  try { W = await (await fetch('../../content/salasimpul.json', { cache: 'no-cache' })).json(); } catch (e) { /* luring */ }
  if (!W || !Array.isArray(W.entries) || !W.entries.length) { $('#coverAct').innerHTML = `<p class="loading">${t('Catatan belum bisa dimuat.', 'The notes could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; return; }
  const E = W.entries, BY = new Map(E.map(e => [e.id, e])), PEOPLE = W.people, NAME = Object.fromEntries(PEOPLE.map(p => [p.id, p.name]));
  const KEYS = W.keys || {}, PROPS = W.props || {};
  const MONTHS = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const MON = MONTHS.map(m => m.slice(0, 3));
  const dateOf = at => { const d = new Date(Date.UTC(at.y, 0, 1)); d.setUTCDate(at.d); return d; };
  const fmtDate = (at, short) => { const d = dateOf(at); return `${d.getUTCDate()} ${(short ? MON : MONTHS)[d.getUTCMonth()]} ${at.y}`; };
  const fmtHour = h => (h == null ? '' : t(`pukul ${String(h).padStart(2, '0')}.00`, `${String(h).padStart(2, '0')}:00`));
  const plainOf = s => String(s).replace(/\*/g, '');
  // urutan per penulis, dan siapa yang disebut atau disimpul tiap catatan
  const ofOwner = Object.fromEntries(PEOPLE.map(p => [p.id, E.filter(e => e.owner === p.id)]));
  const rank = new Map(); Object.values(ofOwner).forEach(list => list.forEach((e, i) => rank.set(e.id, i)));
  const nameRe = n => new RegExp(`(^|[^\\p{L}])${n}(?![\\p{L}])`, 'u');
  const touches = new Map();   // id → penulis lain yang disebut atau disimpul
  const linksTo = new Map();   // id → catatan yang disimpul (keluar)
  const linkedBy = new Map();  // id → catatan yang menyimpul ke sini (masuk)
  E.forEach(e => {
    const text = e.p.map(p => plainOf(p.t)).join(' '), who = new Set();
    PEOPLE.forEach(p => { if (p.id !== e.owner && [p.name, ...(p.aliases || [])].some(n => nameRe(n).test(text))) who.add(p.id); });
    const out = [];
    e.p.forEach((p, pi) => (p.l || []).forEach(l => { who.add(l.owner); if (l.owner === e.owner) who.delete(l.owner); out.push({ ...l, pi }); (linkedBy.get(l.id) || linkedBy.set(l.id, []).get(l.id)).push({ from: e.id, kind: l.kind }); }));
    touches.set(e.id, who); linksTo.set(e.id, out);
  });
  const ALL_PROPS = Object.keys(PROPS).length;
  // ciri tiap penulis (persona di _dunia.json): umur, hitungan yang ia bawa, ruangan tempat ia menulis
  const PER = W.persona || {};
  const ageAt = (o, at) => (PER[o] && PER[o].born ? at.y - PER[o].born : null);
  function sinceAt(o, at) {
    const sc = PER[o] && PER[o].since; if (!sc) return null;
    const days = Math.round((dateOf(at) - dateOf(sc)) / 864e5);
    if (days < 0 || (sc.unit === 'hari' && days === 0)) return null;
    if (sc.unit === 'hari') return { n: days, u: t('hari', days > 1 ? 'days' : 'day'), label: sc.label };
    if (days < 365) { const m = Math.max(1, Math.round(days / 30.44)); return { n: m, u: t('bulan', m > 1 ? 'months' : 'month'), label: sc.label }; }
    const y = Math.floor(days / 365.25); return { n: y, u: t('tahun', y > 1 ? 'years' : 'year'), label: sc.label };
  }
  // catatan yang ditulis pada hari yang sama, diurutkan menurut jam
  const NIGHT = new Map();
  E.forEach(e => { const k = `${e.at.y}-${e.at.d}`; (NIGHT.get(k) || NIGHT.set(k, []).get(k)).push(e); });
  NIGHT.forEach(l => l.sort((a, b) => (a.at.h ?? 99) - (b.at.h ?? 99)));
  const nightOf = e => NIGHT.get(`${e.at.y}-${e.at.d}`) || [e];
  const hh = h => (h == null ? '' : String(h).padStart(2, '0') + '.00');
  const isNight = list => list.every(x => x.at.h == null || x.at.h >= 17 || x.at.h < 6);

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, read: {}, early: {}, known: {}, last: null, open: false, recall: {}, book: [], strand: [] });
  let S = store.get('simpul', null);
  if (!S || S.v !== 1) S = blank();
  S.recall = S.recall || {}; S.book = Array.isArray(S.book) ? S.book.filter(id => BY.has(id)) : [];
  const save = () => store.set('simpul', S);
  const isRead = id => !!S.read[id];
  const knows = p => !!S.known[p];
  function fam(owner) {
    let n = 0;
    for (const id in S.read) { const e = BY.get(id); if (e && e.owner !== owner && touches.get(id).has(owner)) n++; }
    return n;
  }
  const linkedFromRead = id => (linkedBy.get(id) || []).some(l => isRead(l.from));
  // keadaan sebuah catatan: dibaca, terbuka, atau terkunci (dengan alasannya)
  function state(e) {
    if (isRead(e.id)) return { open: true, read: true };
    if (S.open || S.early[e.id]) return { open: true };
    const need = KEYS[e.id];
    if (need) { const miss = need.filter(p => !knows(p)); return miss.length ? { open: false, key: miss } : { open: true }; }
    if (rank.get(e.id) < 2 + 2 * fam(e.owner) || linkedFromRead(e.id)) return { open: true };
    return { open: false };
  }

  /* ---------- ingatan yang memudar ----------
     R = e^(-t/S): t hari sejak diingat (memory.encodedAt atau tanggal catatan), S = stability0 × (1 + retrievalBonus × retrievals).
     Setiap kali pembaca kembali ke catatan yang sudah dibaca, retrievals-nya bertambah satu: membaca berarti mengingat untuk mereka.
     Kalimat @protected tidak ikut terlupa. Catatan tanpa memory memakai ingatan bawaan dari _dunia.json. */
  const MEMDEF = W.memory || { stability0: 5000, retrievalBonus: .25, retrievals: 0 };
  function retention(e, year) {
    const m = { ...MEMDEF, ...(e.memory || {}) }, enc = m.encodedAt || e.at;
    const days = (year + .99 - (enc.y + (enc.d || 1) / 366)) * 365.25;
    if (days <= 0) return 1;
    const strength = m.stability0 * (1 + m.retrievalBonus * ((m.retrievals || 0) + (S.recall[e.id] || 0)));
    return Math.exp(-days / Math.max(1, strength));
  }
  // angka acak yang tetap untuk satu kalimat: kalimat yang sama selalu hilang pada ingatan yang sama
  const seed = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
  function fog(e, year) {
    const R = year == null ? 1 : retention(e, year);
    $$('#nBody > p', note).forEach((p, pi) => $$('.sn', p).forEach(sn => {
      const gone = R < 1 && !sn.classList.contains('prot') && seed(`${e.id}:${pi}:${sn.dataset.si}`) > R;
      sn.classList.toggle('fog', gone);
      if (gone) sn.setAttribute('aria-hidden', 'true'); else sn.removeAttribute('aria-hidden');
    }));
    return R;
  }

  /* ---------- sampul ---------- */
  const years = E.map(e => e.at.y), Y0 = Math.min(...years), Y1 = Math.max(...years);
  $('#cvYears').textContent = `${Y0}–${Y1}`;
  const paintBadge = () => { const n = dangling().length, b = $('#openKnow'); if (!b) return; if (n) b.dataset.n = n > 9 ? '9+' : n; else delete b.dataset.n; };
  const paintCount = () => {
    paintBadge();
    const n = Object.keys(S.read).length;
    $('#cvRead').textContent = t(`${n}/${E.length} dibaca`, `${n}/${E.length} read`);
    const chip = $('#stepChip'); chip.hidden = !n; chip.className = 'jm-step'; chip.textContent = `${n}/${E.length}`; chip.setAttribute('aria-label', t(`${n} dari ${E.length} catatan dibaca`, `${n} of ${E.length} notes read`));
  };
  // garis-garis kecil di sampul: satu garis per orang, titik per catatan, benang di antaranya
  function lanes(svg, w, h) {
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const x = e => 8 + (E.indexOf(e) / (E.length - 1)) * (w - 16), y = i => 8 + i * ((h - 16) / (PEOPLE.length - 1));
    let s = PEOPLE.map((p, i) => `<line x1="8" x2="${w - 8}" y1="${y(i)}" y2="${y(i)}"/>`).join('');
    E.forEach(e => linksTo.get(e.id).forEach(l => { const to = BY.get(l.id); const a = [x(e), y(PEOPLE.findIndex(p => p.id === e.owner))], b = [x(to), y(PEOPLE.findIndex(p => p.id === to.owner))]; s += `<path class="kn" d="M${a[0]} ${a[1]}C${a[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}"/>`; }));
    s += E.map(e => `<circle class="${isRead(e.id) ? 'rd' : ''}" cx="${x(e).toFixed(1)}" cy="${y(PEOPLE.findIndex(p => p.id === e.owner))}" r="1.6"/>`).join('');
    svg.innerHTML = s;
  }

  /* ---------- tampilan: sampul, kota, catatan ---------- */
  const cover = $('#cover'), city = $('#city'), note = $('#note');
  function show(view, push = true) {
    cover.hidden = view !== 'cover'; city.hidden = view !== 'city'; note.hidden = view !== 'note';
    if (push) scrollTo({ top: 0, behavior: 'auto' });
  }
  // jendela-jendela: kalimat pertama orang-orang yang belum kamu kenal, tanpa nama. Kamu memilih orang asing dari suaranya.
  const firstLine = e => { const txt = plainOf(e.p[0]?.t || ''); const m = txt.match(/^.+?[.!?…](?=\s|$)/); return (m ? m[0] : txt).slice(0, 160); };
  function windows(n = 4) {
    const met = new Set(Object.keys(S.read).map(id => BY.get(id)?.owner));
    const strangers = PEOPLE.filter(p => !met.has(p.id)).map(p => ofOwner[p.id][0]);
    const start = BY.get(W.start);
    const pool = strangers.filter(e => e !== start).sort(() => Math.random() - .5);
    if (strangers.includes(start) && !Object.keys(S.read).length) pool.unshift(start);
    return pool.slice(0, n).sort(() => Math.random() - .5);
  }
  // benang yang menggantung: simpul dari catatan yang sudah dibaca ke catatan yang belum
  function dangling() {
    const out = [], seen = new Set();
    Object.entries(S.read).sort((a, b) => b[1] - a[1]).forEach(([id]) => (linksTo.get(id) || []).forEach(l => { if (BY.has(l.id) && !isRead(l.id) && !seen.has(l.id)) { seen.add(l.id); out.push({ from: BY.get(id), to: BY.get(l.id), kind: l.kind }); } }));
    return out;
  }
  // kalimat yang sudah dibaca dan masih menunggu sesuatu (ironi yang belum menyala)
  function waiting() {
    let n = 0;
    for (const id in S.read) { const e = BY.get(id); if (e) e.p.forEach(p => p.a.forEach(a => { if (a.irony && !a.irony.some(g => g.every(knows))) n++; })); }
    return n;
  }
  function recapHTML() {
    const strand = (S.strand || []).filter(x => x && BY.has(x.id)).slice(-3).map(x => BY.get(x.id));
    const lastP = Object.entries(S.knownAt || {}).sort((a, b) => b[1] - a[1])[0], lastE = lastP && BY.get(S.known[lastP[0]]);
    const dg = dangling().length, wt = waiting();
    return `<section class="recap" id="recap"><p class="sh-k">${esc(t('Sebelumnya di Salasimpul', 'Previously in Salasimpul'))}</p>
      ${strand.length ? `<ol class="rc-thread">${strand.map(e => `<li style="--fk:${inkOf(e.owner)}"><b>${esc(NAME[e.owner])}</b><span>${esc(e.title)}</span><small>${e.at.y}</small></li>`).join('')}</ol>` : ''}
      ${lastE ? `<p class="rc-k">${esc(t('Yang terakhir kamu ketahui', 'The last thing you learned'))}</p><q class="rc-q">${esc(claimText(lastE, lastP[0]))}</q>` : ''}
      <p class="rc-row">${dg ? `<button type="button" class="ghost sm" id="rcDangle">${esc(t(`${dg} benang menggantung`, `${dg} loose threads`))}</button>` : ''}<span>${esc(t(`${Object.keys(S.known).length} hal kamu tahu`, `${Object.keys(S.known).length} things you know`))}${wt ? esc(t(` · ${wt} kalimat yang kamu baca masih menunggu sesuatu`, ` · ${wt} sentences you read are still waiting for something`)) : ''}</span></p></section>`;
  }
  function coverActs() {
    const last = S.last && BY.get(S.last), ws = windows();
    $('#coverAct').innerHTML = `${last ? recapHTML() : ''}${last ? `<button type="button" class="go" id="goLast">${esc(t('Lanjutkan', 'Continue'))} · ${esc(NAME[last.owner])}</button>` : ''}
      ${ws.length ? `<p class="w-q">${esc(last ? t('Atau temui orang lain', 'Or meet someone else') : t('Siapa yang kamu temui duluan?', 'Who do you meet first?'))}</p>
      <div class="windows" id="windows">${ws.map((e, i) => `<button type="button" class="win" data-id="${e.id}" style="--i:${i}"><span class="w-light" aria-hidden="true"></span><q>${esc(firstLine(e))}</q><small>${esc(t(`seseorang · ${e.at.y}`, `someone · ${e.at.y}`))}</small></button>`).join('')}</div>
      <div class="w-act"><button type="button" class="ghost" id="reroll">${esc(t('Jendela lain', 'Other windows'))}</button><button type="button" class="ghost" id="goCity">${esc(t('Lihat kotanya', 'See the city'))}</button></div>` : `<button type="button" class="ghost" id="goCity">${esc(t('Lihat kotanya', 'See the city'))}</button>`}`;
    $('#goLast')?.addEventListener('click', () => go(last.id));
    $('#rcDangle')?.addEventListener('click', () => { $('#openKnow').click(); $('#dangle')?.scrollIntoView({ block: 'start' }); });
    $$('#windows .win').forEach(b => b.addEventListener('click', () => { b.classList.add('chosen'); setTimeout(() => go(b.dataset.id), reduced() ? 0 : 420); }));
    $('#reroll')?.addEventListener('click', coverActs);
    $('#goCity').addEventListener('click', () => { location.hash = 'kota'; });
  }

  /* ---------- partitur ---------- */
  let STEP = +store.get('simpul:step', 18) || 18; const LANE = 30, PAD = 18;
  let focus = null, cityYear = null;
  const laneOrder = [...PEOPLE].sort((a, b) => E.findIndex(e => e.owner === a.id) - E.findIndex(e => e.owner === b.id));
  const laneOf = id => laneOrder.findIndex(p => p.id === id);
  function score() {
    const svg = $('#scoreSvg'), w = PAD * 2 + (E.length - 1) * STEP, h = 34 + laneOrder.length * LANE;
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const X = i => PAD + i * STEP, Y = l => 34 + l * LANE + LANE / 2;
    let s = laneOrder.map((p, l) => `<line class="ln" data-o="${p.id}" x1="0" x2="${w}" y1="${Y(l)}" y2="${Y(l)}"/>`).join('');
    // tahun
    let lastY = null, lastX = -99;
    E.forEach((e, i) => { if (e.at.y !== lastY) { const lab = X(i) - lastX >= 34; s += `${lab ? `<text class="yr" x="${X(i)}" y="14">${e.at.y}</text>` : ''}<line class="yt${lab ? '' : ' minor'}" x1="${X(i)}" x2="${X(i)}" y1="${lab ? 20 : 26}" y2="${h}"/>`; if (lab) lastX = X(i); lastY = e.at.y; } });
    // benang: hanya yang sudah kamu lihat ujungnya
    E.forEach((e, i) => linksTo.get(e.id).forEach(l => {
      if (!isRead(e.id) && !isRead(l.id)) return;
      const j = E.indexOf(BY.get(l.id)), a = [X(i), Y(laneOf(e.owner))], b = [X(j), Y(laneOf(BY.get(l.id).owner))];
      const both = isRead(e.id) && isRead(l.id);
      s += `<path class="th${both ? ' tied' : ''}${l.kind === 'echo' ? ' echo' : ''}" data-o="${e.owner} ${BY.get(l.id).owner}" d="M${a[0]} ${a[1]}C${a[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}"/>`;
    }));
    // titik
    s += E.map((e, i) => {
      const st = state(e), cls = st.read ? 'read' : st.open ? 'open' : st.key ? 'key' : 'shut', cx = X(i), cy = Y(laneOf(e.owner));
      const later = cityYear != null && e.at.y > cityYear, fade = cityYear != null && !later ? Math.max(.12, retention(e, cityYear)).toFixed(2) : '';
      const label = `${NAME[e.owner]}, ${fmtDate(e.at, true)}: ${st.open ? e.title : t('terkunci', 'locked')}`;
      return `<g class="nt ${cls}${S.last === e.id ? ' here' : ''}${later ? ' later' : ''}" ${fade ? `style="opacity:${fade}"` : ''} data-id="${e.id}" data-o="${e.owner}" tabindex="0" role="button" aria-label="${esc(label)}"><circle cx="${cx}" cy="${cy}" r="11" class="hit"/>${cls === 'shut' ? `<line x1="${cx - 3}" x2="${cx + 3}" y1="${cy}" y2="${cy}"/>` : `<circle cx="${cx}" cy="${cy}" r="${cls === 'key' ? 4 : 4.6}"/>`}<title>${esc(label)}</title></g>`;
    }).join('');
    // jejakmu: urutan bacamu sebagai satu benang biru
    const trail = Object.entries(S.read).sort((a, b) => a[1] - b[1]).map(([id]) => BY.get(id)).filter(Boolean);
    if (trail.length > 1) s += `<path class="trail" d="${trail.map((e, k) => `${k ? 'L' : 'M'}${X(E.indexOf(e))} ${Y(laneOf(e.owner))}`).join('')}"/>`;
    svg.innerHTML = s;
    $('#scoreNames').innerHTML = `<span class="yrs"></span>` + laneOrder.map(p => { const n = ofOwner[p.id].length, r = ofOwner[p.id].filter(e => isRead(e.id)).length; return `<button type="button" data-o="${p.id}" aria-pressed="${focus === p.id}"><b>${esc(p.name)}</b><small>${r}/${n}</small></button>`; }).join('');
    paintFocus();
    const cr = $('#cityRange'); cr.min = Y0; cr.max = Y1; if (cityYear == null) cr.value = Y1;
    const shown = cityYear == null ? E : E.filter(e => e.at.y <= cityYear);
    $('#cityNote').textContent = cityYear == null ? t('seperti ditulis', 'as written') : t(`${shown.length} catatan sudah ditulis · rata-rata masih diingat ${Math.round(shown.reduce((n, e) => n + retention(e, cityYear), 0) / Math.max(1, shown.length) * 100)}%`, `${shown.length} notes written · on average ${Math.round(shown.reduce((n, e) => n + retention(e, cityYear), 0) / Math.max(1, shown.length) * 100)}% still remembered`);
    $('#cityYearB').textContent = cityYear == null ? '' : cityYear;
    $('#legend').innerHTML = `<span><i class="lg trail"></i>${esc(t('jejakmu', 'your trail'))}</span><span><i class="lg read"></i>${esc(t('dibaca', 'read'))}</span><span><i class="lg open"></i>${esc(t('terbuka', 'open'))}</span><span><i class="lg shut"></i>${esc(t('belum kenal', 'not known yet'))}</span><span><i class="lg key"></i>${esc(t('menunggu sesuatu', 'waiting for something'))}</span><span><i class="lg th"></i>${esc(t('simpul', 'knot'))}</span>`;
    // gulir ke catatan terakhir
    const here = S.last ? E.findIndex(e => e.id === S.last) : 0;
    const sc = $('#scoreScroll'); sc.scrollLeft = Math.max(0, X(Math.max(0, here)) - sc.clientWidth / 2);
  }
  // menyorot satu orang: garisnya, titiknya, dan benang yang menyentuhnya
  function paintFocus() {
    const svg = $('#scoreSvg'); svg.classList.toggle('focused', !!focus);
    $$('[data-o]', svg).forEach(el => el.classList.toggle('fx', !!focus && el.dataset.o.split(' ').includes(focus)));
    $$('#scoreNames [data-o]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.o === focus)));
  }
  $('#scoreNames').addEventListener('click', e => { const b = e.target.closest('[data-o]'); if (!b) return; focus = focus === b.dataset.o ? null : b.dataset.o; paintFocus(); });
  // titik: pratinjau dulu, baru membaca
  function peek(id) {
    const e = BY.get(id), st = state(e);
    $('#popBody').innerHTML = `<p class="sh-k" id="popTitle">${esc(st.open ? NAME[e.owner] : t('Seseorang', 'Someone'))} · ${esc(fmtDate(e.at))}</p>
      <h3 class="pk-t">${esc(st.open ? e.title : t('Belum kamu kenal', 'Not known yet'))}</h3>${st.open ? `<p class="pk-q">${esc(firstLine(e))}</p>` : ''}
      <div class="pk-act"><a class="go" href="#c-${e.id}">${esc(st.read ? t('Baca lagi', 'Read again') : t('Baca', 'Read'))}</a>${st.open ? `<button type="button" class="ghost" data-focus="${e.owner}">${esc(t(`Sorot ${NAME[e.owner]}`, `Highlight ${NAME[e.owner]}`))}</button>` : ''}</div>`;
    pop.hidden = false; popFrom = $(`#scoreSvg .nt[data-id="${id}"]`);
    $$('#scoreSvg .nt.peek').forEach(n => n.classList.remove('peek')); popFrom?.classList.add('peek');
  }
  $('#scoreSvg').addEventListener('click', e => { const g = e.target.closest('.nt'); if (g) { e.stopPropagation(); peek(g.dataset.id); } });
  $('#scoreSvg').addEventListener('keydown', e => { const g = e.target.closest('.nt'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); peek(g.dataset.id); } });
  $('#popBody').addEventListener('click', e => { const f = e.target.closest('[data-focus]'); if (f) { focus = f.dataset.focus; paintFocus(); closePop(); } if (e.target.closest('a[href^="#c-"]')) closePop(); });
  $('#cityRange').addEventListener('input', e => { const y = +e.target.value; cityYear = y >= Y1 ? null : y; score(); });
  $$('#zoom [data-z]').forEach(b => b.addEventListener('click', () => { STEP = Math.max(8, Math.min(34, STEP + +b.dataset.z)); store.set('simpul:step', STEP); score(); }));

  /* ---------- orang dan waktu ---------- */
  const row = e => { const st = state(e); return `<a class="row ${st.read ? 'read' : st.open ? 'open' : st.key ? 'key' : 'shut'}" href="#c-${e.id}"><span class="r-d">${esc(fmtDate(e.at, true))}</span><span class="r-t">${st.open ? esc(e.title) : esc(t('belum kamu kenal', 'not known yet'))}</span><span class="r-o">${esc(NAME[e.owner])}</span></a>`; };
  function people() {
    $('#panePeople').innerHTML = `<div class="people">${laneOrder.map(p => {
      const list = ofOwner[p.id], r = list.filter(e => isRead(e.id)).length, o = list.filter(e => state(e).open).length;
      return `<details class="person" data-o="${p.id}"><summary><b>${esc(p.name)}</b><button type="button" class="p-card" data-who="${p.id}" aria-label="${esc(t(`Kartu ${p.name}`, `${p.name}’s card`))}">${esc(t('kartu', 'card'))}</button><span class="p-y">${list[0].at.y}–${list[list.length - 1].at.y}</span><span class="p-m"><i style="--r:${r / list.length};--o:${o / list.length}"></i></span><small>${esc(t(`${r} dibaca · ${o} terbuka · ${list.length} catatan`, `${r} read · ${o} open · ${list.length} notes`))}</small></summary><div class="rows">${list.map(row).join('')}</div></details>`;
    }).join('')}</div>`;
  }
  function timeline() {
    let html = '', y = null;
    E.forEach(e => { if (e.at.y !== y) { if (y !== null) html += '</div>'; y = e.at.y; html += `<h3 class="t-y">${y}</h3><div class="rows">`; } html += row(e); });
    $('#paneTime').innerHTML = html + '</div>';
  }
  $$('#tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('#tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('#tabs [data-tab]').forEach(x => { const pane = document.getElementById(x.getAttribute('aria-controls')); if (pane) pane.hidden = x !== b; });
    store.set('simpul:tab', b.dataset.tab);
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    document.dispatchEvent(new CustomEvent('simpul:tab', { detail: b.dataset.tab }));
  }));
  // sudut: bagaimana kota melihat satu orang. Catatannya sendiri, diselingi kalimat orang lain yang menyebutnya.
  let angleOf = store.get('simpul:angle', 'sukrim');
  function mentionLine(e, who) {
    const p = PEOPLE.find(x => x.id === who), names = [p.name, ...(p.aliases || [])];
    for (const pp of e.p) { const txt = plainOf(pp.t); let m; SENT.lastIndex = 0; while ((m = SENT.exec(txt))) { if (names.some(n => nameRe(n).test(m[0]))) return m[0].trim(); if (!m[0].length) SENT.lastIndex++; } }
    return '';
  }
  function angle() {
    if (!BY.size || !PEOPLE.some(p => p.id === angleOf)) angleOf = PEOPLE[0].id;
    const who = angleOf, own = ofOwner[who], seen = E.filter(e => e.owner !== who && touches.get(e.id).has(who));
    const items = E.filter(e => e.owner === who || touches.get(e.id).has(who)).map(e => {
      const st = state(e);
      if (e.owner === who) return `<a class="ang own ${st.read ? 'read' : ''}" href="#c-${e.id}"><small>${esc(fmtDate(e.at, true))} · ${esc(t(`ditulis ${NAME[who]}`, `written by ${NAME[who]}`))}</small><b>${esc(st.open ? e.title : t('belum kamu kenal', 'not known yet'))}</b></a>`;
      const line = st.open ? mentionLine(e, who) : '';
      return `<a class="ang ${st.read ? 'read' : ''}" href="#c-${e.id}"><small>${esc(fmtDate(e.at, true))} · ${esc(st.open ? NAME[e.owner] : t('seseorang', 'someone'))}</small>${line ? `<q>${esc(line)}</q>` : `<span>${esc(t(`menyebut ${NAME[who]}`, `mentions ${NAME[who]}`))}</span>`}</a>`;
    }).join('');
    $('#paneAngle').innerHTML = `<div class="ang-head"><label for="angleSel">${esc(t('Dari sudut', 'From the angle of'))}</label><select id="angleSel">${laneOrder.map(p => `<option value="${p.id}"${p.id === who ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <p class="ang-lede">${esc(t(`${NAME[who]} menulis ${own.length} catatan dan disebut di ${seen.length} catatan orang lain.`, `${NAME[who]} wrote ${own.length} notes and is mentioned in ${seen.length} notes by others.`))}${who === 'sukrim' ? ' ' + esc(t('Dari gerobaknya ia melihat hampir semua orang, dan hampir tidak pernah dianggap ada.', 'From his cart he sees almost everyone, and is almost never counted.')) : ''}</p><div class="angs">${items}</div>`;
    $('#angleSel').onchange = e => { angleOf = e.target.value; store.set('simpul:angle', angleOf); angle(); };
  }
  // suntinganmu: buku yang kamu susun sendiri dari catatan-catatan kota ini
  function bookPane() {
    const list = S.book.map(id => BY.get(id)).filter(Boolean);
    $('#paneBook').innerHTML = `<p class="ang-lede">${esc(t('Susun bukumu sendiri dari catatan kota ini. Urutannya milikmu.', 'Bind your own book from this town’s notes. The order is yours.'))}</p>
      <div class="bk-act"><button type="button" class="ghost" id="bkTrail">${esc(t('＋ Jejakmu', '＋ Your trail'))}</button>${(W.spine || []).length ? `<button type="button" class="ghost" id="bkSpine">${esc(t('＋ Rantai yang disarankan', '＋ The suggested chain'))}</button>` : ''}${list.length ? `<button type="button" class="ghost" id="bkClear">${esc(t('Kosongkan', 'Clear'))}</button>` : ''}</div>
      ${list.length ? `<ol class="bk">${list.map((e, i) => `<li data-id="${e.id}"><span class="bk-n">${i + 1}</span><a href="#c-${e.id}"><small>${esc(NAME[e.owner])} · ${esc(fmtDate(e.at, true))}</small><b>${esc(e.title)}</b></a><span class="bk-mv"><button type="button" data-mv="-1" aria-label="${esc(t('Naikkan', 'Move up'))}"${i ? '' : ' disabled'}>↑</button><button type="button" data-mv="1" aria-label="${esc(t('Turunkan', 'Move down'))}"${i < list.length - 1 ? '' : ' disabled'}>↓</button><button type="button" data-rm aria-label="${esc(t('Keluarkan', 'Remove'))}">×</button></span></li>`).join('')}</ol>
      <div class="bk-act"><a class="go" href="#suntingan">${esc(t('Baca suntinganmu', 'Read your edit'))}</a><button type="button" class="ghost" id="bkMd">${esc(t('Unduh .md', 'Download .md'))}</button><button type="button" class="ghost" id="bkShare">${esc(t('Salin tautan', 'Copy link'))}</button></div>`
      : `<p class="k-empty">${esc(t('Belum ada catatan. Tambahkan dari kaki setiap catatan, atau mulai dari jejakmu.', 'No notes yet. Add them from the foot of any note, or start from your trail.'))}</p>`}`;
    const add = ids => { ids.forEach(id => { if (BY.has(id) && !S.book.includes(id)) S.book.push(id); }); save(); bookPane(); };
    $('#bkTrail').onclick = () => add(Object.entries(S.read).sort((a, b) => a[1] - b[1]).map(([id]) => id));
    $('#bkSpine') && ($('#bkSpine').onclick = () => add(W.spine));
    $('#bkClear') && ($('#bkClear').onclick = () => { if (confirm(t('Kosongkan suntinganmu?', 'Clear your edit?'))) { S.book = []; save(); bookPane(); } });
    $$('#paneBook .bk li').forEach(li => li.addEventListener('click', ev => {
      const id = li.dataset.id, i = S.book.indexOf(id), mv = ev.target.closest('[data-mv]');
      if (mv) { const j = i + +mv.dataset.mv; [S.book[i], S.book[j]] = [S.book[j], S.book[i]]; save(); bookPane(); }
      if (ev.target.closest('[data-rm]')) { S.book.splice(i, 1); save(); bookPane(); }
    }));
    $('#bkMd') && ($('#bkMd').onclick = () => { const blob = new Blob([bookMd(list)], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'salasimpul-suntinganku.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    $('#bkShare') && ($('#bkShare').onclick = async () => { const u = location.href.split('#')[0] + '#suntingan=' + S.book.join(','); try { await navigator.clipboard.writeText(u); $('#bkShare').textContent = t('Tautan tersalin', 'Link copied'); } catch (e) { prompt(t('Salin tautan ini', 'Copy this link'), u); } });
  }
  const bookMd = list => `# ${t('Salasimpul: suntinganku', 'Salasimpul: my edit')}\n\n` + list.map(e => `## ${NAME[e.owner]} · ${fmtDate(e.at)}${e.at.h != null ? ', ' + fmtHour(e.at.h) : ''}\n\n### ${e.title}\n\n${e.p.map(p => p.t).join('\n\n')}`).join('\n\n---\n\n') + '\n';
  // membaca suntingan (milikmu, atau yang dibagikan lewat tautan) sebagai satu buku
  function readBook(ids, shared, title) {
    const list = ids.map(id => BY.get(id)).filter(Boolean);
    note.dataset.owner = ''; delete note.dataset.young; note.style.removeProperty('--nb'); sky(null); sound(list[0] || null);
    note.innerHTML = `<header class="n-head"><p class="n-who"><a href="#kota">${esc(title || (shared ? t('Suntingan seseorang', 'Someone’s edit') : t('Suntinganmu', 'Your edit')))}</a><span>${esc(t(`${list.length} catatan`, `${list.length} notes`))}</span></p><h2>${esc(t('Salasimpul, disunting', 'Salasimpul, edited'))}</h2></header><div class="bk-read" id="bkRead"></div><footer class="n-foot"><div class="f-act">${shared ? `<button type="button" class="go" id="bkKeep">${esc(t('Simpan sebagai suntinganku', 'Keep as my edit'))}</button>` : ''}<a class="ghost" href="#kota">${esc(t('Kembali ke kota', 'Back to the city'))}</a></div></footer>`;
    const host = $('#bkRead');
    list.forEach(e => {
      const sec = document.createElement('section'); sec.className = 'bk-note'; sec.style.setProperty('--nb', inkOf(e.owner));
      sec.innerHTML = `<p class="n-who"><a href="#c-${e.id}">${esc(NAME[e.owner])}</a><span>${esc(fmtDate(e.at))}</span></p><h3>${esc(e.title)}</h3>`;
      const body = document.createElement('div'); body.className = 'n-body';
      e.p.forEach((p, pi) => body.append(para(p, e, pi)));
      sec.append(body); host.append(sec);
    });
    $('#bkKeep') && ($('#bkKeep').onclick = () => { S.book = list.map(e => e.id); save(); location.hash = 'kota'; });
    show('note');
  }
  function paintCity() { score(); people(); timeline(); angle(); bookPane(); document.dispatchEvent(new CustomEvent('simpul:city')); }

  /* ---------- langit mengikuti jam catatan ditulis; warna penanda buku tiap orang ---------- */
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  function sky(h) {
    if (h == null) { root.removeAttribute('data-backdrop'); return; }
    root.dataset.backdrop = isDark() ? 'malam' : h >= 4 && h < 10 ? 'fajar' : h >= 10 && h < 15 ? 'siang' : h >= 15 && h < 19 ? 'senja' : 'malam';
  }
  const INKS = ['#1F4E8C', '#9A3B2E', '#2F6B4F', '#6A3DFF', '#8A6A1F', '#0E7490', '#B4235A', '#4D5B2A', '#7C3A9E', '#A2541A', '#2B6CB0', '#5B5F66', '#8B2F2F', '#2E7D6B', '#6B4E9B', '#9C6B00', '#3B5BA9', '#7A4A3A'];
  const inkOf = owner => INKS[PEOPLE.findIndex(p => p.id === owner) % INKS.length];
  const wide = () => matchMedia('(min-width: 1100px)').matches;
  // dua buku terbuka: catatan asal di kiri, benang dari simpulnya ke catatan tujuan di kanan
  function duo(src, dst) {
    $('#duo')?.remove(); $('#duoTh')?.remove();
    const box = document.createElement('aside');
    box.id = 'duo'; box.className = 'duo'; box.style.setProperty('--nb', inkOf(src.owner));
    box.setAttribute('aria-label', t(`Catatan asal: ${NAME[src.owner]}`, `Where the thread came from: ${NAME[src.owner]}`));
    box.innerHTML = `<p class="n-who"><a href="#c-${src.id}">${esc(NAME[src.owner])}</a><span>${esc(fmtDate(src.at, true))}</span></p><h3>${esc(src.title)}</h3><div class="duo-body"></div>`;
    const body = $('.duo-body', box);
    src.p.forEach((p, pi) => { body.append(para(p, src, pi)); if ((p.l || []).some(l => l.id === dst.id)) body.insertAdjacentHTML('beforeend', `<div class="knots inline"><span class="knot here-knot" data-to="${dst.id}"><small>${esc(t('Simpul ini', 'This knot'))}</small><b>${esc(NAME[dst.owner])}</b></span></div>`); });
    document.body.append(box); document.body.classList.add('duo-on');
    $('#duoTh')?.remove(); const th = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); th.id = 'duoTh'; th.setAttribute('class', 'duo-th'); th.setAttribute('aria-hidden', 'true'); document.body.append(th);
    const k = $('.here-knot', box);
    if (k) k.scrollIntoView({ block: 'center' });
    drawDuo();
  }
  function drawDuo() {
    const box = $('#duo'); if (!box) return;
    const th = $('#duoTh'), k = $('.here-knot', box), head = $('#note .n-head h2');
    if (!k || !head) { th.innerHTML = ''; return; }
    const a = k.getBoundingClientRect(), b = head.getBoundingClientRect();
    const x1 = a.right, y1 = a.top + a.height / 2, x2 = b.left - 10, y2 = b.top + b.height / 2;
    th.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    th.innerHTML = `<path d="M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}"/><circle cx="${x1}" cy="${y1}" r="4"/><circle cx="${x2}" cy="${y2}" r="4"/>`;
  }
  addEventListener('scroll', () => requestAnimationFrame(drawDuo), { passive: true });
  addEventListener('resize', () => { if (!wide()) { $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on'); } requestAnimationFrame(drawDuo); });
  document.addEventListener('scroll', e => { if (e.target && e.target.closest && e.target.closest('#duo')) requestAnimationFrame(drawDuo); }, true);

  /* ---------- catatan ---------- */
  const irLit = list => list.every(knows);
  // satu paragraf menjadi elemen; kalimat bertanda dibungkus span di posisinya (miring Markdown tetap)
  const SENT = /[^.!?…]+(?:[.!?…]+["”’)]*)?/g;
  function para(p, e, pi) {
    const el = document.createElement('p');
    el.innerHTML = esc(p.t).replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
    // setiap kalimat dibungkus; kalimat bertanda membawa datanya (ingatan memudarkan per kalimat)
    const plain = el.textContent, sents = [];
    let m; SENT.lastIndex = 0;
    while ((m = SENT.exec(plain))) { const a = m.index + (m[0].length - m[0].trimStart().length), b = m.index + m[0].trimEnd().length; if (b > a) sents.push([a, b]); if (!m[0].length) SENT.lastIndex++; }
    const byFrom = new Map(p.a.map((a, ai) => [a.from, [a, ai]]));
    for (let si = sents.length - 1; si >= 0; si--) {
      const [from, to] = sents[si], range = rangeOf(el, from, to); if (!range) continue;
      const span = document.createElement('span');
      span.className = 'sn'; span.dataset.si = si;
      const hit = byFrom.get(from);
      if (hit) {
        const [a, ai] = hit;
        span.classList.add('s');
        if (a.claims) { span.classList.add('cl'); span.dataset.claims = a.claims.join(' '); }
        if (a.irony) { span.classList.add('ir'); span.dataset.irony = a.irony.map(x => x.join('+')).join(' '); }
        if (a.prot) span.classList.add('prot');
        span.dataset.k = `${e.id}:${pi}:${ai}`;
      }
      span.append(range.extractContents()); range.insertNode(span);
    }
    el.querySelectorAll('span.sn:empty').forEach(x => x.remove());
    return el;
  }
  function rangeOf(el, from, to) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let pos = 0, sn = null, so = 0, en = null, eo = 0, n;
    while ((n = walker.nextNode())) {
      const len = n.nodeValue.length;
      if (!sn && from <= pos + len) { sn = n; so = from - pos; }
      if (to <= pos + len) { en = n; eo = to - pos; break; }
      pos += len;
    }
    if (!sn || !en) return null;
    const r = document.createRange(); r.setStart(sn, Math.max(0, so)); r.setEnd(en, Math.max(0, eo)); return r;
  }
  const knotCard = (id, kind, dir) => {
    const to = BY.get(id), st = state(to);
    const kick = dir === 'in' ? (kind === 'echo' ? t('Bergema ke sini dari', 'Echoes here from') : t('Menyimpul ke sini dari', 'Knotted here from')) : (kind === 'echo' ? t('Gema dari', 'An echo of') : t('Simpul ke', 'Knot to'));
    return `<a class="knot ${st.read ? 'read' : st.open ? 'open' : 'shut'}${kind === 'echo' ? ' echo' : ''}" href="#c-${id}"><small>${esc(kick)}</small><b>${esc(NAME[to.owner])}</b><span>${esc(fmtDate(to.at, true))}${st.open ? ' · ' + esc(to.title) : ' · ' + esc(t('belum kamu kenal', 'not known yet'))}</span></a>`;
  };
  function lockedHTML(e, st) {
    const owner = NAME[e.owner];
    // jalan untuk mengenalnya: catatan terbuka yang belum dibaca, yang menyebut atau menyimpul ke orang ini
    const paths = E.filter(x => x.owner !== e.owner && !isRead(x.id) && touches.get(x.id).has(e.owner) && state(x).open).slice(0, 3);
    const via = st.key ? [...new Set(st.key.flatMap(p => PROPS[p] || []))].map(id => BY.get(id)).filter(x => x && !isRead(x.id)).slice(0, 3) : paths;
    return `<div class="locked"><div class="lk-lines" aria-hidden="true">${[92, 78, 88, 64, 84, 40].map(w => `<i style="--w:${w}%"></i>`).join('')}</div>
      <p class="lk-t">${esc(st.key ? t(`Catatan ini menunggu sesuatu yang belum kamu ketahui.`, `This note is waiting for something you do not know yet.`) : t(`Kamu belum cukup kenal ${owner}.`, `You do not know ${owner} well enough yet.`))}</p>
      ${via.length ? `<p class="lk-k">${esc(st.key ? t('Mungkin dimulai dari', 'Perhaps start with') : t(`Kenali ${owner} lewat`, `Get to know ${owner} through`))}</p><div class="knots">${via.map(x => knotCard(x.id, 'node', 'out').replace(/<small>[^<]*<\/small>/, '')).join('')}</div>` : ''}
      <div class="lk-act"><button type="button" class="ghost" id="early">${esc(t('Buka saja', 'Open anyway'))}</button></div></div>`;
  }
  /* ---------- benang baca ----------
     Jalan bacamu adalah satu benang: catatan yang sudah lewat terlipat di atas, disambung simpul yang menyebut
     bagaimana kamu sampai (menarik benang, lanjut di buku, sementara itu) dan berapa jauh waktunya melompat.
     Di akhir setiap catatan ada persimpangan: paling banyak empat jalan, masing-masing dengan suaranya sendiri. */
  let via = null;   // { from, how }: dari catatan mana, dan lewat jalan apa, pembaca datang
  const HOW = {
    knot: t('Kamu menarik benang dari', 'You pulled a thread from'), echo: t('Kamu mengikuti gema dari', 'You followed an echo from'),
    book: t('Lanjut di buku yang sama, dari', 'On in the same notebook, from'), back: t('Mundur di buku yang sama, dari', 'Back in the same notebook, from'),
    time: t('Sementara itu di kota, setelah', 'Meanwhile in the town, after'), in: t('Mundur ke yang menyimpul ke', 'Back to what knotted into'),
    night: t('Di malam yang sama, setelah', 'The same night, after'),
    go: t('Lalu, setelah', 'Then, after')
  };
  // lompatan waktu di antara dua catatan: angka besar dan satuannya
  function gapOf(a, b) {
    const days = Math.round((dateOf(b.at) - dateOf(a.at)) / 864e5), ad = Math.abs(days), fwd = days >= 0;
    if (ad === 0) { const dh = a.at.h != null && b.at.h != null ? b.at.h - a.at.h : 0; return dh ? { n: (dh > 0 ? '+' : '−') + Math.abs(dh), u: EN ? `hour${Math.abs(dh) > 1 ? 's' : ''} ${dh > 0 ? 'later' : 'earlier'}` : `jam ${dh > 0 ? 'kemudian' : 'sebelumnya'}` } : { n: '0', u: t('hari yang sama', 'the same day') }; }
    const [n, u, uEn] = ad < 31 ? [ad, 'hari', 'day'] : ad < 365 ? [Math.max(1, Math.round(ad / 30.44)), 'bulan', 'month'] : [Math.round(ad / 365.25), 'tahun', 'year'];
    return { n: (fwd ? '+' : '−') + n, u: EN ? `${uEn}${n > 1 ? 's' : ''} ${fwd ? 'later' : 'earlier'}` : `${u} ${fwd ? 'kemudian' : 'sebelumnya'}` };
  }
  let tieN = 0;
  function tieHTML(a, b, how, current) {
    const g = gapOf(a, b), k = ++tieN;
    return `<div class="tie tie-${how || 'go'}"${current ? ' id="fromStrip"' : ''} style="--a:${inkOf(a.owner)};--b:${inkOf(b.owner)}">
      <svg class="tie-th" viewBox="0 0 40 84" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="tg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs><path d="M20 0C20 18 6 24 6 42S20 66 20 84" stroke="url(#tg${k})"/><circle cx="6" cy="42" r="5"/></svg>
      <p class="tie-t"><small>${esc(HOW[how] || HOW.go)}</small><b>${esc(NAME[a.owner])}</b><span>${esc(a.title)}</span></p>
      <p class="tie-gap">${g.n === '0' ? '' : `<b>${esc(g.n)}</b>`}<span>${esc(g.u)}</span></p></div>`;
  }
  const foldHTML = e => `<details class="fold" data-id="${e.id}" style="--nb:${inkOf(e.owner)}"><summary><span class="fd-who">${esc(NAME[e.owner])}</span><span class="fd-d">${esc(fmtDate(e.at, true))}${e.at.h != null ? ' · ' + String(e.at.h).padStart(2, '0') + '.00' : ''}</span><b class="fd-t">${esc(e.title)}</b><span class="fd-q">${esc(firstLine(e))}</span></summary><div class="n-body fd-body"></div></details>`;
  // persimpangan di akhir catatan
  function choices(e, skip) {
    const out = [], seen = new Set([e.id, skip]), add = (x, how) => { if (x && !seen.has(x.id)) { seen.add(x.id); out.push({ e: x, how }); } };
    const r = rank.get(e.id), list = ofOwner[e.owner], i = E.indexOf(e);
    [...linksTo.get(e.id)].sort((a, b) => isRead(a.id) - isRead(b.id)).slice(0, 2).forEach(l => add(BY.get(l.id), l.kind === 'echo' ? 'echo' : 'knot'));
    nightOf(e).filter(x => x !== e && !isRead(x.id)).slice(0, 1).forEach(x => add(x, 'night'));
    add(list[r + 1], 'book');
    add(E.slice(i + 1).find(x => x.owner !== e.owner && !isRead(x.id) && state(x).open) || E.slice(i + 1).find(x => x.owner !== e.owner && !isRead(x.id)), 'time');
    (linkedBy.get(e.id) || []).filter(l => !isRead(l.from)).forEach(l => out.length < 3 && add(BY.get(l.from), 'in'));
    return out.slice(0, 4);
  }
  const FORK = { night: t('Malam itu juga', 'That same night'), knot: t('Tarik benangnya', 'Pull the thread'), echo: t('Ikuti gemanya', 'Follow the echo'), time: t('Sementara itu', 'Meanwhile'), in: t('Yang menyimpul ke sini', 'What knotted here') };
  function forkHTML(e, skip) {
    const cs = choices(e, skip);
    if (!cs.length) return `<nav class="fork" id="fork" aria-label="${esc(t('Ke mana sekarang', 'Where now'))}"><p class="fork-k">${esc(t('Benang ini berhenti di sini', 'This thread stops here'))}</p><div class="f-row"><a class="go" href="#">${esc(t('Buka jendela lain', 'Open another window'))}</a><a class="ghost" href="#kota">${esc(t('Lihat kotanya', 'See the city'))}</a></div></nav>`;
    return `<nav class="fork" id="fork" aria-label="${esc(t('Ke mana sekarang', 'Where now'))}"><p class="fork-k">${esc(t('Ke mana sekarang?', 'Where now?'))}</p><div class="fks">${cs.map(({ e: x, how }, i) => {
      const st = state(x), g = gapOf(e, x);
      const kick = how === 'book' ? t(`Lanjut di buku ${NAME[x.owner]}`, `On in ${NAME[x.owner]}’s notebook`) : FORK[how];
      return `<a class="fk fk-${how} ${st.read ? 'read' : st.open ? 'open' : 'shut'}" href="#c-${x.id}" data-how="${how}" style="--fk:${inkOf(x.owner)};--i:${i}"><small>${esc(kick)}</small><b class="fk-who">${esc(st.open ? NAME[x.owner] : t('Seseorang', 'Someone'))}</b>${st.open ? `<q>${esc(firstLine(x))}</q>` : `<span class="fk-shut">${esc(st.key ? t('Catatan ini menunggu sesuatu yang belum kamu ketahui.', 'This note waits for something you do not know yet.') : t(`Kamu belum cukup kenal ${NAME[x.owner]}.`, `You do not know ${NAME[x.owner]} well enough yet.`))}</span>`}<span class="fk-meta"><span>${esc(fmtDate(x.at, true))}</span><span>${esc(g.n === '0' ? g.u : `${g.n} ${g.u.split(' ')[0]}`)}</span>${st.read ? `<span>${esc(t('sudah dibaca', 'read'))}</span>` : ''}</span></a>`;
    }).join('')}</div></nav>`;
  }
  const knotPill = l => { const to = BY.get(l.id), st = state(to); return `<a class="knot ${st.read ? 'read' : st.open ? 'open' : 'shut'}${l.kind === 'echo' ? ' echo' : ''}" href="#c-${l.id}" style="--fk:${inkOf(to.owner)}"><svg viewBox="0 0 28 12" aria-hidden="true"><path d="M0 6C7 0 9 12 16 6"/><circle cx="22" cy="6" r="3.4"/></svg><b>${esc(NAME[to.owner])}</b><span>${esc(String(to.at.y))}${st.read ? ' · ' + esc(t('dibaca', 'read')) : ''}</span></a>`; };

  // tanda tangan di kepala catatan: umur penulis dan hitungan yang ia bawa
  function sigHTML(e) {
    const age = ageAt(e.owner, e.at), sc = sinceAt(e.owner, e.at);
    if (age == null && !sc) return '';
    return `<p class="n-sig">${age != null ? `<span class="n-age"><b>${age}</b>${esc(t(' tahun', ' years old'))}</span>` : ''}${sc ? `<span class="n-since"><b>${sc.n}</b> ${esc(sc.u)} ${esc(sc.label)}</span>` : ''}</p>`;
  }
  // malam yang sama: siapa lagi yang menulis hari itu, pada jam berapa
  function railHTML(list, here) {
    const hs = list.map(x => x.at.h).filter(h => h != null);
    if (!hs.length) return '';
    let a = Math.min(...hs) - 1, b = Math.max(...hs) + 1; if (b - a < 4) { a -= 1; b += 1; }
    const X = h => ((h - a) / (b - a) * 100).toFixed(2);
    const ticks = []; for (let h = Math.ceil(a); h <= b; h++) ticks.push(`<i style="left:${X(h)}%"${h % 3 ? '' : ' class="lab"'}>${h % 3 ? '' : `<span>${hh((h + 24) % 24)}</span>`}</i>`);
    return `<div class="rail" aria-hidden="true"><span class="rl-line"></span>${ticks.join('')}${list.filter(x => x.at.h != null).map(x => `<b class="rl-dot${x === here ? ' here' : ''}${isRead(x.id) ? ' read' : ''}" style="left:${X(x.at.h)}%;--fk:${inkOf(x.owner)}"></b>`).join('')}</div>`;
  }
  function nightHTML(e) {
    const list = nightOf(e); if (list.length < 2) return '';
    const others = list.filter(x => x !== e);
    return `<section class="night" id="night" style="--nb:${inkOf(e.owner)}"><p class="night-k">${esc(isNight(list) ? t('Malam itu juga', 'That same night') : t('Hari itu juga', 'That same day'))}</p>
      <p class="night-l">${esc(t(`${list.length} orang menulis pada ${fmtDate(e.at)}.`, `${list.length} people wrote on ${fmtDate(e.at)}.`))}</p>${railHTML(list, e)}
      <div class="nt-rows">${others.map(x => { const st = state(x); return `<a class="nt-row ${st.read ? 'read' : st.open ? 'open' : 'shut'}" href="#c-${x.id}" data-how="night" style="--fk:${inkOf(x.owner)}"><b class="nr-h">${esc(hh(x.at.h))}</b><span class="nr-who">${esc(st.open ? NAME[x.owner] : t('Seseorang', 'Someone'))}</span><span class="nr-q">${esc(st.open ? firstLine(x) : t('belum kamu kenal', 'not known yet'))}</span></a>`; }).join('')}</div>
      <a class="go sm" href="#malam-${e.at.y}-${e.at.d}" id="nightGo">${esc(isNight(list) ? t('Baca malam ini menurut jam', 'Read this night by the clock') : t('Baca hari ini menurut jam', 'Read this day by the clock'))}</a></section>`;
  }
  // malam ini, menurut jam: semua catatan hari itu dalam satu gulungan, satu jam demi satu jam
  function readNight(y, d) {
    const list = NIGHT.get(`${y}-${d}`); if (!list) return go(null);
    const first = list[0];
    note.dataset.owner = ''; delete note.dataset.young; note.style.setProperty('--nb', inkOf(first.owner)); sky(first.at.h); sound(first);
    note.innerHTML = `<header class="n-head nh-night"><p class="n-who"><span class="nw-k">${esc(isNight(list) ? t('Satu malam', 'One night') : t('Satu hari', 'One day'))}</span><span>${esc(t(`${list.length} orang`, `${list.length} people`))}</span></p><h2>${esc(fmtDate(first.at))}</h2>${railHTML(list, null)}</header><div class="nights" id="nights"></div>
      <footer class="n-foot"><div class="f-row"><a class="ghost sm" href="#c-${(S.last && BY.has(S.last)) ? S.last : first.id}">${esc(t('Kembali ke benangmu', 'Back to your thread'))}</a><a class="ghost sm" href="#peta">${esc(t('Peta kota', 'Town map'))}</a></div></footer>`;
    const host = $('#nights');
    list.forEach((x, i) => {
      const st = state(x), sec = document.createElement('section');
      sec.className = 'nt-note' + (st.open ? '' : ' shut'); sec.style.setProperty('--nb', inkOf(x.owner)); sec.dataset.id = x.id;
      const gap = i ? gapOf(list[i - 1], x) : null;
      sec.innerHTML = `<p class="nn-clock"><b>${esc(hh(x.at.h) || '—')}</b>${gap && gap.n !== '0' ? `<span>${esc(gap.n + ' ' + gap.u)}</span>` : ''}</p><p class="n-who"><a href="#c-${x.id}">${esc(st.open ? NAME[x.owner] : t('Seseorang', 'Someone'))}</a>${st.open ? `<span>${esc(x.title)}</span>` : ''}</p>`;
      if (st.open) { const body = document.createElement('div'); body.className = 'n-body'; x.p.forEach((p, pi) => body.append(para(p, x, pi))); sec.append(body); if (!isRead(x.id)) { S.read[x.id] = Date.now(); delete S.early[x.id]; } }
      else sec.insertAdjacentHTML('beforeend', `<p class="nn-shut">${esc(st.key ? t('Catatan ini menunggu sesuatu yang belum kamu ketahui.', 'This note waits for something you do not know yet.') : t('Kamu belum cukup kenal orang ini.', 'You do not know this person well enough yet.'))} <a href="#c-${x.id}">${esc(t('Lihat', 'Look'))}</a></p>`);
      host.append(sec);
    });
    save(); pending = $$('#nights .s.cl'); show('note'); light(); paintCount(); requestAnimationFrame(learnSeen);
    $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on');
    // suara mengikuti catatan yang sedang di tengah layar
    nightSecs = $$('#nights .nt-note');
  }
  let nightSecs = [];
  addEventListener('scroll', () => {
    if (note.hidden || !nightSecs.length || !nightSecs[0].isConnected) return;
    const mid = innerHeight * .45, cur = nightSecs.filter(x => x.getBoundingClientRect().top < mid).pop() || nightSecs[0], e = BY.get(cur.dataset.id);
    if (e && note.dataset.nightAt !== e.id) { note.dataset.nightAt = e.id; note.style.setProperty('--nb', inkOf(e.owner)); sky(e.at.h); sound(e); $$('#note .nh-night .rl-dot').forEach((d, i) => d.classList.toggle('here', nightSecs[i] === cur)); }
  }, { passive: true });

  function open(id, pulled) {
    const e = BY.get(id); if (!e) return go(null);
    const st = state(e), list = ofOwner[e.owner], r = rank.get(e.id), prevO = list[r - 1];
    // benangmu: disambung kalau kamu datang dari catatan terakhirnya; kalau kamu mundur ke catatan di benang, benangnya dipotong di sana
    let strand = (Array.isArray(S.strand) ? S.strand : []).filter(x => x && BY.has(x.id));
    const tail = strand[strand.length - 1];
    let appended = false;
    if (tail && tail.id === id) { /* catatan yang sama: dimuat ulang */ }
    else if (pulled && tail && tail.id === pulled.from) { strand.push({ id, how: pulled.how }); appended = true; }
    else if (pulled && BY.has(pulled.from)) { strand = [{ id: pulled.from, how: null }, { id, how: pulled.how }]; appended = true; }
    else { const k = strand.findIndex(x => x.id === id); if (k >= 0) strand = strand.slice(0, k + 1); else { strand.push({ id, how: strand.length ? 'go' : null }); appended = strand.length > 1; } }
    strand = strand.slice(-24); S.strand = strand;
    const shown = strand.slice(-7), before = strand.length - shown.length, prev = shown.length > 1 ? BY.get(shown[shown.length - 2].id) : null;
    const how = shown[shown.length - 1].how;
    note.dataset.owner = e.owner;
    note.style.setProperty('--nb', inkOf(e.owner));
    const age = ageAt(e.owner, e.at); if (age != null && age < 13) note.dataset.young = ''; else delete note.dataset.young;
    sky(e.at.h); sound(e);
    tieN = 0;
    let threadHTML = before ? `<p class="st-more">${esc(t(`${before} catatan sebelumnya di benangmu`, `${before} earlier notes on your thread`))}</p>` : '';
    for (let k = 0; k < shown.length - 1; k++) { const a = BY.get(shown[k].id); threadHTML += foldHTML(a); if (k < shown.length - 2) threadHTML += tieHTML(a, BY.get(shown[k + 1].id), shown[k + 1].how, false); }
    note.innerHTML = `${shown.length > 1 ? `<div class="strand" id="strand">${threadHTML}</div>${tieHTML(prev, e, how, true)}` : ''}<header class="n-head"><p class="n-who"><a href="#orang-${e.owner}" data-who="${e.owner}" aria-haspopup="dialog">${esc(NAME[e.owner])}</a><span>${esc(t(`catatan ${r + 1} dari ${list.length}`, `note ${r + 1} of ${list.length}`))}</span></p><p class="n-date"><span>${esc(fmtDate(e.at))}</span>${e.at.h != null ? `<b class="n-hour">${String(e.at.h).padStart(2, '0')}.00</b>` : ''}</p>${sigHTML(e)}<h2>${esc(e.title)}</h2></header>
      <div class="n-body" id="nBody"></div>
      <div id="forkHost"></div>
      <footer class="n-foot" id="nFoot"></footer>
      ${st.open && e.at.y < Y1 ? `<div class="n-mem" id="nMem" hidden><label for="memRange">${esc(t('Diingat pada', 'Remembered in'))} <b id="memYear">${e.at.y}</b></label><input type="range" id="memRange" min="${e.at.y}" max="${Y1}" step="1" value="${e.at.y}"><button type="button" class="close" id="memClose" aria-label="${esc(t('Kembali ke saat ditulis', 'Back to when it was written'))}">×</button><span id="memNote">${esc(t('Geser untuk melihat apa yang masih diingat, bertahun-tahun kemudian.', 'Slide to see what is still remembered, years later.'))}</span></div>` : ''}`;
    const body = $('#nBody');
    note.classList.toggle('pulled', !!pulled);
    if (st.read && S.last !== e.id) { S.recall[e.id] = (S.recall[e.id] || 0) + 1; save(); }
    if (!st.open) { body.innerHTML = lockedHTML(e, st); $('#early').onclick = () => { S.early[e.id] = 1; save(); open(id); }; }
    else {
      if (S.early[e.id] && !isRead(e.id)) body.insertAdjacentHTML('beforeend', `<p class="n-early">${esc(t('Kamu membacanya sebelum kenal.', 'You read this before you knew them.'))}</p>`);
      e.p.forEach((p, pi) => {
        body.append(para(p, e, pi));
        const ls = (p.l || []);
        if (ls.length) body.insertAdjacentHTML('beforeend', `<div class="knots inline" aria-label="${esc(t('Simpul dari paragraf ini', 'Knots from this paragraph'))}">${ls.map(knotPill).join('')}</div>`);
      });
      markRead(e);
      $('#forkHost').insertAdjacentHTML('beforebegin', nightHTML(e));
      $('#forkHost').outerHTML = forkHTML(e, prev?.id);
    }
    $('#forkHost')?.remove();
    $('#nFoot').innerHTML = `<div class="f-row">${prevO ? `<a class="ghost sm" href="#c-${prevO.id}" data-how="back">← ${esc(t(`Sebelumnya di buku ${NAME[e.owner]}`, `Earlier in ${NAME[e.owner]}’s notebook`))}</a>` : ''}${$('#nMem') ? `<button type="button" class="ghost sm" id="memToggle" aria-pressed="false" aria-controls="nMem">${esc(t('Ingat dari tahun lain', 'Remember from another year'))}</button>` : ''}${st.open ? `<button type="button" class="ghost sm" id="toBook" aria-pressed="${S.book.includes(e.id)}">${esc(S.book.includes(e.id) ? t('Ada di suntinganmu', 'In your edit') : t('＋ Suntinganmu', '＋ Your edit'))}</button>` : ''}${st.open ? `<button type="button" class="ghost sm" id="eyes" aria-pressed="false">${esc(t(`Baca dengan mata ${NAME[e.owner]}`, `Read with ${NAME[e.owner]}’s eyes`))}</button>` : ''}<a class="ghost sm" href="#peta-${e.id}">${esc(t('Di peta', 'On the map'))}</a></div><p class="eyes-note" id="eyesNote" hidden></p>`;
    $('#eyes')?.addEventListener('click', () => {
      const on = !note.classList.contains('eyes'); note.classList.toggle('eyes', on); $('#eyes').setAttribute('aria-pressed', String(on));
      const at = E.indexOf(e), knewIt = p => (PROPS[p] || []).some(id => { const x = BY.get(id); return x.owner === e.owner && E.indexOf(x) <= at; });
      let behind = 0;
      $$('#nBody .s.ir.lit').forEach(sp => { const lit = sp.dataset.irony.split(' ').map(g => g.split('+')).filter(irLit); const knew = lit.some(g => g.every(knewIt)); sp.dataset.eye = knew ? 'tahu' : 'belum'; sp.dataset.eyeL = knew ? t('ia sudah tahu', 'they knew') : t('ia belum tahu', 'they did not know yet'); if (!knew) behind++; });
      const n = $('#eyesNote'); n.hidden = !on;
      n.textContent = behind ? t(`Kamu membaca dengan mata ${NAME[e.owner]}. ${behind} kalimat di sini kamu pahami lebih dari ${NAME[e.owner]} saat menulisnya.`, `You are reading with ${NAME[e.owner]}’s eyes. You understand ${behind} sentences here better than ${NAME[e.owner]} did when writing them.`) : t(`Belum ada kalimat di catatan ini yang kamu pahami lebih dari ${NAME[e.owner]}.`, `Nothing in this note is clearer to you than it was to ${NAME[e.owner]}.`);
      if (on && behind) $('#nBody .s.ir.lit[data-eye="belum"]')?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    });
    // ingatan: sebuah bilah di bawah layar, supaya teksnya tetap terlihat saat digeser
    const mr = $('#memRange'), mem = $('#nMem');
    const setMem = y => {
      const R = fog(e, y === e.at.y ? null : y);
      $('#memYear').textContent = y;
      $('#memNote').textContent = y === e.at.y ? t('Seperti saat ditulis.', 'As it was written.') : t(`${NAME[e.owner]} masih mengingat ${Math.round(R * 100)}%`, `${NAME[e.owner]} still remembers ${Math.round(R * 100)}%`) + ((S.recall[e.id] || 0) ? t(` · kamu sudah kembali ${S.recall[e.id]} kali`, ` · you came back ${S.recall[e.id]} times`) : '');
      note.classList.toggle('remembering', y !== e.at.y);
    };
    if (mr) {
      mr.addEventListener('input', () => setMem(+mr.value));
      const toggle = on => { mem.hidden = !on; $('#memToggle').setAttribute('aria-pressed', String(on)); if (!on) { mr.value = e.at.y; setMem(e.at.y); } else mr.focus({ preventScroll: true }); };
      $('#memToggle').onclick = () => toggle(mem.hidden);
      $('#memClose').onclick = () => toggle(false);
    }
    $('#toBook')?.addEventListener('click', () => { const i = S.book.indexOf(e.id); if (i >= 0) S.book.splice(i, 1); else S.book.push(e.id); save(); const b = $('#toBook'); const on = S.book.includes(e.id); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? t('Ada di suntinganmu', 'In your edit') : t('＋ Suntinganmu', '＋ Your edit'); });
    // lipatan dibuka: teksnya baru diisi saat dibuka
    $$('#strand .fold').forEach(d => d.addEventListener('toggle', () => { const b = $('.fd-body', d); if (d.open && !b.childElementCount) { const x = BY.get(d.dataset.id); x.p.forEach((p, pi) => b.append(para(p, x, pi))); light(); } }));
    S.last = e.id; save(); note.dataset.id = e.id;
    show('note', false); light(); paintCount();
    // gulir: catatan baru muncul di bawah lipatan yang baru saja kamu tinggalkan
    const tie = $('#fromStrip'), top = $('.qm-top')?.offsetHeight || 60;
    if (tie) {
      const y = tie.getBoundingClientRect().top + scrollY - top - 8;
      if (appended && !reduced()) { const last = $$('#strand .fold').pop(); scrollTo({ top: Math.max(0, last.getBoundingClientRect().top + scrollY - top - 8), behavior: 'auto' }); requestAnimationFrame(() => scrollTo({ top: y, behavior: 'smooth' })); }
      else scrollTo({ top: y, behavior: 'auto' });
    } else scrollTo({ top: 0, behavior: 'auto' });
    requestAnimationFrame(learnSeen);
    const src = prev && ['knot', 'echo', 'in'].includes(how) ? prev : null;
    if (src && wide()) duo(src, e);
    else { $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on'); }
    if (!reduced()) note.classList.remove('enter'), void note.offsetWidth, note.classList.add('enter');
    note.focus?.({ preventScroll: true });
  }
  // membaca: catatan dihitung dibaca saat dibuka; faktanya diketahui saat kalimatnya terlihat
  let pending = [], learnFrom = null;
  function markRead(e) {
    if (!isRead(e.id)) { S.read[e.id] = Date.now(); delete S.early[e.id]; save(); }
    pending = $$('#nBody .s.cl'); learnFrom = e.id;
  }
  // kalimat yang sudah masuk layar (atau sudah terlewati) menjadi yang kamu tahu
  function learnSeen() {
    if (note.hidden || !pending.length) return;
    const line = innerHeight - 48;
    pending = pending.filter(span => {
      if (span.getBoundingClientRect().top > line) return true;
      const fresh = span.dataset.claims.split(' ').filter(p => !knows(p)), src = (span.dataset.k || '').split(':')[0] || learnFrom;
      if (fresh.length) { S.knownAt = S.knownAt || {}; fresh.forEach(p => { S.known[p] = src; S.knownAt[p] = Date.now(); }); save(); paintBadge(); span.classList.add('learned'); light(); flashback(fresh, src); $('#announcement').textContent = t('Kamu tahu sesuatu yang baru.', 'You know something new.'); }
      return false;
    });
  }
  let learnRaf = 0;
  addEventListener('scroll', () => { if (!learnRaf) learnRaf = requestAnimationFrame(() => { learnRaf = 0; learnSeen(); }); }, { passive: true });
  // ironi: menyala kalau semua faktanya diketahui
  function light() {
    $$('.s.ir', note).forEach(s => { const lit = s.dataset.irony.split(' ').some(g => irLit(g.split('+'))); if (lit && !s.classList.contains('lit')) { s.classList.add('lit'); if (!reduced()) s.classList.add('glow'); } });
  }

  /* ---------- kilat balik: kalimat yang sudah kamu baca berubah makna karena fakta yang baru kamu ketahui ---------- */
  let flashTimer = 0;
  function flashback(fresh, here) {
    const hits = [];
    for (const id in S.read) {
      if (id === here) continue;
      const e = BY.get(id); if (!e) continue;
      e.p.forEach(p => p.a.forEach(a => { if ((a.irony || []).some(g => g.some(x => fresh.includes(x)) && g.every(knows))) hits.push({ e, txt: plainOf(p.t).slice(a.from, a.to) }); }));
    }
    if (!hits.length) return;
    const box = $('#flash');
    box.innerHTML = `<button class="close" type="button" aria-label="${esc(t('Tutup', 'Close'))}">×</button><p class="sh-k">${esc(t(`${hits.length} kalimat yang pernah kamu baca berubah`, `${hits.length} sentence${hits.length > 1 ? 's' : ''} you read before just changed`))}</p>
      <ul class="fl">${hits.slice(0, 3).map(h => `<li><a href="#c-${h.e.id}"><q>${esc(h.txt)}</q><small>${esc(NAME[h.e.owner])}, ${esc(fmtDate(h.e.at, true))}</small></a></li>`).join('')}</ul>`;
    box.hidden = false; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
    $('.close', box).onclick = () => { box.hidden = true; };
    clearTimeout(flashTimer); flashTimer = setTimeout(() => { box.hidden = true; }, 12000);
  }
  $('#flash').addEventListener('click', e => { if (e.target.closest('a')) $('#flash').hidden = true; });

  /* ---------- sembulan: yang kamu tahu di balik kalimat yang menyala ---------- */
  const pop = $('#pop');
  const claimText = (e, p) => { let txt = ''; e.p.some(pp => pp.a.some(a => (a.claims || []).includes(p) && (txt = plainOf(pp.t).slice(a.from, a.to)))); return txt; };
  // satu fakta, banyak kesaksian: semua yang menuliskannya, dan kalimat yang berubah karenanya
  function witness(p) {
    const ids = PROPS[p] || [];
    const lines = ids.map(id => { const e = BY.get(id), st = state(e); return st.read || st.open ? `<li><q>${esc(claimText(e, p))}</q><a href="#c-${e.id}">${esc(NAME[e.owner])}, ${esc(fmtDate(e.at, true))}${st.read ? '' : ' · ' + esc(t('belum kamu baca', 'not read yet'))}</a></li>` : `<li class="wt-shut"><span>${esc(t('Seseorang yang belum kamu kenal juga menuliskannya.', 'Someone you do not know yet wrote about it too.'))}</span><small>${esc(fmtDate(e.at, true))}</small></li>`; }).join('');
    const ironies = [];
    for (const id in S.read) { const e = BY.get(id); if (!e) continue; e.p.forEach(pp => pp.a.forEach(a => { if ((a.irony || []).some(g => g.includes(p) && g.every(knows))) ironies.push(`<li><q>${esc(plainOf(pp.t).slice(a.from, a.to))}</q><a href="#c-${e.id}">${esc(NAME[e.owner])}, ${esc(fmtDate(e.at, true))}</a></li>`); })); }
    const owners = new Set(ids.map(id => BY.get(id).owner));
    $('#knowBody').innerHTML = `<button type="button" class="ghost wt-back" id="wtBack">← ${esc(t('Semua yang kamu tahu', 'Everything you know'))}</button>
      <p class="f-k">${esc(t(`${ids.length} kesaksian · ${owners.size} orang`, `${ids.length} testimonies · ${owners.size} people`))}</p><ul class="kl wt">${lines}</ul>
      ${ironies.length ? `<p class="f-k">${esc(t('Kalimat yang berubah karenanya', 'Sentences it changed'))}</p><ul class="kl">${ironies.join('')}</ul>` : ''}
      <p class="sh-not">${esc(t('Tidak ada yang diputuskan benar di sini. Setiap orang menyimpulkan dari tempatnya berdiri.', 'Nothing here is decided true. Everyone concludes from where they stand.'))}</p>`;
    $('#wtBack').onclick = () => $('#openKnow').click();
  }
  const claimLine = p => { const id = S.known[p] || (PROPS[p] || [])[0], e = BY.get(id); if (!e) return ''; let txt = ''; e.p.some(pp => pp.a.some(a => (a.claims || []).includes(p) && (txt = plainOf(pp.t).slice(a.from, a.to)))); const n = (PROPS[p] || []).length; return `<li><q>${esc(txt)}</q><a href="#c-${e.id}">${esc(NAME[e.owner])}, ${esc(fmtDate(e.at, true))}</a>${n > 1 ? `<button type="button" class="k-wit" data-p="${p}">${esc(t(`${n} kesaksian`, `${n} testimonies`))} →</button>` : ''}</li>`; };
  note.addEventListener('click', ev => {
    const s = ev.target.closest('.s.ir.lit'); if (!s) return;
    const groups = s.dataset.irony.split(' ').map(g => g.split('+')).filter(irLit);
    const ps = [...new Set(groups.flat())];
    $('#popBody').innerHTML = `<p class="sh-k" id="popTitle">${esc(t('Kalimat ini berubah karena kamu tahu', 'This sentence changed because you know'))}</p><ul class="kl">${ps.map(claimLine).join('')}</ul><p class="sh-not">${esc(t(`${NAME[BY.get(s.dataset.k.split(':')[0]).owner]} belum tentu tahu.`, `${NAME[BY.get(s.dataset.k.split(':')[0]).owner]} may not know.`))}</p>`;
    pop.hidden = false; $('#popClose').focus({ preventScroll: true }); popFrom = s;
  });
  let popFrom = null;
  const closePop = () => { if (pop.hidden) return; pop.hidden = true; popFrom?.focus?.({ preventScroll: true }); };
  $('#popClose').addEventListener('click', closePop);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.s.ir')) closePop(); });

  /* ---------- kartu orang: siapa dia, kapan ia menulis, siapa di sekitarnya ---------- */
  const whoDlg = $('#whoDialog');
  const met = o => ofOwner[o].some(e => isRead(e.id));
  // ikatan dua orang: catatan yang satu menyebut atau menyimpul ke yang lain, dua arah
  function ties(o) {
    const w = {};
    E.forEach(e => { if (e.owner === o) touches.get(e.id).forEach(x => { w[x] = (w[x] || 0) + 1; }); else if (touches.get(e.id).has(o)) w[e.owner] = (w[e.owner] || 0) + 1; });
    return Object.entries(w).sort((a, b) => b[1] - a[1]);
  }
  function clockHTML(o) {
    const list = ofOwner[o], R = 52, C = 64;
    const pos = h => { const a = (h / 24) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(a) * R, C + Math.sin(a) * R]; };
    const count = {}; list.forEach(e => { if (e.at.h != null) count[e.at.h] = (count[e.at.h] || 0) + 1; });
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    const marks = [0, 6, 12, 18].map(h => { const [x, y] = pos(h), [lx, ly] = [C + (x - C) * 1.32, C + (y - C) * 1.32]; return `<line x1="${C + (x - C) * .9}" y1="${C + (y - C) * .9}" x2="${x}" y2="${y}"/><text x="${lx}" y="${ly + 3}">${String(h).padStart(2, '0')}</text>`; }).join('');
    const dots = Object.entries(count).map(([h, n]) => { const [x, y] = pos(+h), rd = list.some(e => e.at.h === +h && isRead(e.id)); return `<circle class="${rd ? 'rd' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + Math.sqrt(n) * 2.2).toFixed(1)}"/>`; }).join('');
    return `<figure class="wc-clock"><svg viewBox="-14 -14 156 156" role="img" aria-label="${esc(t(`Jam ${NAME[o]} menulis`, `When ${NAME[o]} writes`))}"><circle class="ring" cx="${C}" cy="${C}" r="${R}"/>${marks}${dots}</svg><figcaption>${top ? esc(t(`Paling sering pukul ${hh(+top[0])}`, `Most often at ${hh(+top[0])}`)) : ''}</figcaption></figure>`;
  }
  function webHTML(o) {
    const tt = ties(o).slice(0, 8), C = 110, max = Math.max(1, ...tt.map(x => x[1]));
    const pts = tt.map(([x, n], i) => { const a = (i / tt.length) * Math.PI * 2 - Math.PI / 2, r = 78 - (n / max) * 22; return { x, n, px: C + Math.cos(a) * r * 1.25, py: C + Math.sin(a) * r }; });
    return `<svg class="wc-web" viewBox="0 0 220 220" role="group" aria-label="${esc(t(`Orang di sekitar ${NAME[o]}`, `People around ${NAME[o]}`))}">${pts.map(q => `<line x1="${C}" y1="${C}" x2="${q.px.toFixed(1)}" y2="${q.py.toFixed(1)}" style="stroke:${inkOf(q.x)};stroke-width:${(1 + q.n / max * 3.5).toFixed(1)}"/>`).join('')}
      <circle class="me" cx="${C}" cy="${C}" r="9" style="fill:${inkOf(o)}"/>${pts.map(q => met(q.x) ? `<g class="wc-p" data-who="${q.x}" tabindex="0" role="button" aria-label="${esc(NAME[q.x])}"><circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="5" style="fill:${inkOf(q.x)}"/><text x="${q.px.toFixed(1)}" y="${(q.py + (q.py > C ? 17 : -10)).toFixed(1)}">${esc(NAME[q.x])}</text></g>` : `<g class="wc-p unk"><circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="4"/><text x="${q.px.toFixed(1)}" y="${(q.py + (q.py > C ? 16 : -9)).toFixed(1)}">?</text></g>`).join('')}</svg>`;
  }
  // apa yang ia tuliskan sendiri, dan apa yang kamu tahu yang tidak pernah ia tuliskan
  const wrote = o => Object.keys(PROPS).filter(p => PROPS[p].some(id => BY.get(id).owner === o));
  function eyesHTML(o) {
    const mine = new Set(wrote(o)), ks = Object.keys(S.known), notHis = ks.filter(p => !mine.has(p)), his = ks.filter(p => mine.has(p));
    if (!ks.length) return '';
    return `<div class="wc-eyes"><p class="f-k">${esc(t('Apa yang ia tahu', 'What they know'))}</p><div class="we-bar" aria-hidden="true"><i style="--a:${his.length / Math.max(1, ks.length)}"></i></div>
      <p class="we-t">${esc(t(`Dari ${ks.length} hal yang kamu tahu, ${his.length} pernah ia tuliskan sendiri. ${notHis.length} lainnya tidak pernah muncul di bukunya.`, `Of the ${ks.length} things you know, they wrote ${his.length} themselves. The other ${notHis.length} never appear in their notebook.`))}</p>
      ${notHis.length ? `<ul class="kl we-l">${notHis.slice(-2).map(p => { const e = BY.get(S.known[p]); return e ? `<li><q>${esc(claimText(e, p))}</q><a href="#c-${e.id}">${esc(NAME[e.owner])}, ${esc(fmtDate(e.at, true))}</a></li>` : ''; }).join('')}</ul>` : ''}</div>`;
  }
  function who(o) {
    const list = ofOwner[o], r = list.filter(e => isRead(e.id)).length, m = met(o), per = PER[o] || {};
    const ages = per.born ? [list[0].at.y - per.born, list[list.length - 1].at.y - per.born] : null;
    const lastRead = [...list].reverse().find(e => isRead(e.id)), sc = lastRead && sinceAt(o, lastRead.at);
    const next = list.find(e => !isRead(e.id) && state(e).open);
    $('#whoBody').innerHTML = `<div class="wc-head" style="--nb:${inkOf(o)}"><p class="cd-k">${esc(t('Orang di kota ini', 'Someone in this town'))}</p><h2 id="whoTitle">${esc(m ? NAME[o] : t('Seseorang', 'Someone'))}</h2>${m && per.lede ? `<p class="wc-lede">${esc(per.lede)}</p>` : ''}</div>
      <dl class="wc-stats"><div><dt>${esc(t('Menulis', 'Writes'))}</dt><dd>${list[0].at.y}–${list[list.length - 1].at.y}</dd></div><div><dt>${esc(t('Catatan', 'Notes'))}</dt><dd>${r}<small>/${list.length}</small></dd></div>${m && ages ? `<div><dt>${esc(t('Umur di bukunya', 'Age in the notebook'))}</dt><dd>${ages[0]}–${ages[1]}</dd></div>` : ''}${m && sc ? `<div><dt>${esc(sc.label)}</dt><dd>${sc.n}<small> ${esc(sc.u)}</small></dd></div>` : ''}</dl>
      <span class="wc-bar"><i style="--r:${r / list.length}"></i></span>
      ${m ? `<div class="wc-two">${clockHTML(o)}<div class="wc-webw"><p class="f-k">${esc(t('Orang di sekitarnya', 'People around them'))}</p>${webHTML(o)}</div></div>
      ${eyesHTML(o)}
      <p class="f-k">${esc(t('Kalimat pertamanya', 'Their first sentence'))}</p><q class="wc-q">${esc(firstLine(list[0]))}</q>${S.voice && S.voice[o] ? `<p class="wc-voice">${esc(t(`Suaranya kamu kenali ${S.voice[o][0]} dari ${S.voice[o][1]} kali.`, `You knew their voice ${S.voice[o][0]} of ${S.voice[o][1]} times.`))}</p>` : ''}` : `<p class="wc-lede">${esc(t(`Kamu belum membaca satu pun catatannya. Ia menulis ${list.length} catatan.`, `You have not read any of their notes yet. They wrote ${list.length}.`))}</p>`}
      <div class="f-row wc-act">${next ? `<a class="go sm" href="#c-${next.id}">${esc(t('Catatan berikutnya', 'Next note'))}</a>` : ''}<a class="ghost sm" href="#orang-${o}">${esc(t('Semua catatannya', 'All their notes'))}</a>${m ? `<button type="button" class="ghost sm" data-angle="${o}">${esc(t('Kota dari sudutnya', 'The town from their angle'))}</button>` : ''}</div>`;
    whoDlg.dataset.o = o; $('#whoBody').style.setProperty('--nb', inkOf(o));
    if (!whoDlg.open) whoDlg.showModal();
  }
  whoDlg.addEventListener('click', e => {
    if (e.target === whoDlg || e.target.closest('[data-close]')) return whoDlg.close();
    const p = e.target.closest('.wc-p[data-who]'); if (p) return who(p.dataset.who);
    const a = e.target.closest('[data-angle]'); if (a) { angleOf = a.dataset.angle; store.set('simpul:angle', angleOf); whoDlg.close(); location.hash = 'sudut'; return; }
    if (e.target.closest('a[href^="#"]')) whoDlg.close();
  });
  whoDlg.addEventListener('keydown', e => { const p = e.target.closest('.wc-p[data-who]'); if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); who(p.dataset.who); } });
  document.addEventListener('click', e => { const a = e.target.closest('#note [data-who], #panePeople [data-who]'); if (a) { e.preventDefault(); who(a.dataset.who); } });

  /* ---------- suara ruangan ---------- */
  const SND = window.SimpulSound;
  const sound = e => { if (SND && SND.isOn()) SND.room(e ? (PER[e.owner] && PER[e.owner].room) || 'malam' : null, e ? e.at.h : null); };
  const paintSound = () => { const b = $('#sound'); if (!b) return; const on = !!(SND && SND.isOn()); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? t('Hidup', 'On') : t('Mati', 'Off'); };
  if (SND && SND.supported) {
    $('#sound').onclick = () => { SND.setOn(!SND.isOn()); store.set('simpul:sound', SND.isOn()); paintSound(); const e = !note.hidden && BY.get(note.dataset.nightAt || note.dataset.id); sound(e || null); };
    paintSound();
  } else $('#soundRow')?.remove();
  // suara yang dinyalakan di kunjungan lalu menyala lagi pada sentuhan pertama (peramban tidak mengizinkan bunyi sebelum itu)
  if (SND && SND.supported && store.get('simpul:sound', false)) addEventListener('pointerdown', () => { if (!SND.isOn()) { SND.setOn(true); paintSound(); const e = !note.hidden && BY.get(note.dataset.nightAt || note.dataset.id); sound(e || null); } }, { once: true });
  // membalik halaman: persimpangan, lipatan, dan malam yang sama
  document.addEventListener('click', e => { if (e.target.closest('#fork .fk, .knots.inline .knot, .nt-row, #nightGo')) SND?.page(); }, true);

  /* ---------- yang kamu tahu ---------- */
  const knowDlg = $('#knowDialog');
  $('#openKnow').addEventListener('click', () => {
    const ks = Object.keys(S.known);
    $('#knowTitle').textContent = t(`${ks.length} dari ${ALL_PROPS}`, `${ks.length} of ${ALL_PROPS}`);
    // dikelompokkan per orang yang menuliskannya
    const groups = {};
    ks.forEach(p => { const e = BY.get(S.known[p]); if (e) (groups[e.owner] = groups[e.owner] || []).push(p); });
    const dg = dangling(), wt = waiting();
    const dgHTML = dg.length ? `<section id="dangle"><p class="f-k">${esc(t(`Benang yang menggantung · ${dg.length}`, `Loose threads · ${dg.length}`))}</p><div class="dg">${dg.slice(0, 8).map(d => { const st = state(d.to); return `<a class="dg-row" href="#c-${d.to.id}" data-from="${d.from.id}" data-kind="${d.kind}" style="--fk:${inkOf(d.to.owner)}"><small>${esc(t(`dari ${NAME[d.from.owner]}`, `from ${NAME[d.from.owner]}`))} · ${esc(d.from.title)}</small><b>${esc(st.open ? NAME[d.to.owner] : t('Seseorang', 'Someone'))}</b><span>${d.to.at.y}${st.open ? ' · ' + esc(d.to.title) : ''}</span></a>`; }).join('')}</div></section>` : '';
    const wtHTML = wt ? `<p class="sh-not dg-wait">${esc(t(`${wt} kalimat yang sudah kamu baca masih menunggu sesuatu yang belum kamu ketahui.`, `${wt} sentences you have read are still waiting for something you do not know yet.`))}</p>` : '';
    $('#knowBody').innerHTML = dgHTML + wtHTML + (ks.length ? Object.entries(groups).map(([o, ps]) => `<p class="f-k">${esc(t(`Dari ${NAME[o]}`, `From ${NAME[o]}`))}</p><ul class="kl">${ps.map(claimLine).join('')}</ul>`).join('')
      : `<p class="k-empty">${esc(t('Belum ada. Setiap kalimat yang memberitahumu sesuatu akan tersimpan di sini.', 'Nothing yet. Every sentence that tells you something is kept here.'))}</p>`);
    knowDlg.showModal();
  });
  knowDlg.addEventListener('click', e => { const dr = e.target.closest('.dg-row'); if (dr) via = { from: dr.dataset.from, how: dr.dataset.kind === 'echo' ? 'echo' : 'knot' }; if (e.target === knowDlg || e.target.closest('[data-close]')) knowDlg.close(); if (e.target.closest('a[href^="#c-"]')) knowDlg.close(); const w = e.target.closest('.k-wit'); if (w) witness(w.dataset.p); });
  $('#pop').addEventListener('click', e => { const w = e.target.closest('.k-wit'); if (w) { closePop(); $('#openKnow').click(); witness(w.dataset.p); } });

  /* ---------- alamat: #kota, #orang-<id>, #c-<id> ---------- */
  function go(id) { if (id) location.hash = 'c-' + id; else location.hash = ''; }
  function route() {
    const h = location.hash.slice(1);
    closePop();
    if (h.startsWith('c-')) { const from = via; via = null; open(h.slice(2), from); return; }
    if (h === 'suntingan') { readBook(S.book, false); return; }
    if (h.startsWith('malam-')) { const [y, d] = h.slice(6).split('-').map(Number); readNight(y, d); return; }
    if (h.startsWith('suntingan=')) { readBook(h.slice(10).split(',').filter(id => BY.has(id)), true); return; }
    $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on');
    const TABS = $$('#tabs [data-tab]').map(b => b.dataset.tab);
    if (h === 'kota' || h.startsWith('orang-') || h.startsWith('peta-') || TABS.includes(h)) {
      paintCity(); show('city'); sound(null);
      const kept = store.get('simpul:tab', 'partitur'), tab = h.startsWith('orang-') ? 'orang' : h.startsWith('peta-') ? 'peta' : TABS.includes(h) ? h : TABS.includes(kept) ? kept : 'partitur';
      $(`#tabs [data-tab="${tab}"]`).click();
      if (h.startsWith('peta-')) document.dispatchEvent(new CustomEvent('simpul:mapfocus', { detail: h.slice(5) }));
      if (h.startsWith('orang-')) { const d = $(`.person[data-o="${h.slice(6)}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }
      return;
    }
    coverActs(); lanes($('#cvLanes'), 320, 120); show('cover'); sky(null); sound(null);
  }
  addEventListener('hashchange', route);
  // menarik simpul: catatan asal diingat supaya benangnya bisa digambar
  document.addEventListener('click', e => {
    if (note.hidden) return;
    const k = e.target.closest('#nBody .knots.inline .knot'), f = e.target.closest('#fork .fk, #nFoot [data-how]');
    if (k) via = { from: note.dataset.id, how: k.classList.contains('echo') ? 'echo' : 'knot' };
    else if (f) via = { from: note.dataset.id, how: f.dataset.how };
  }, true);

  /* ---------- pengaturan ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  const paintOpen = () => { $('#openAll').setAttribute('aria-pressed', String(!!S.open)); $('#openAll').textContent = S.open ? t('Hidup', 'On') : t('Mati', 'Off'); };
  $('#openAll').onclick = () => { S.open = !S.open; save(); paintOpen(); route(); };
  $('#reset').onclick = () => { if (!confirm(t('Lupakan semua yang sudah kamu baca dan ketahui di kota ini?', 'Forget everything you have read and learned in this city?'))) return; S = blank(); save(); $('#settingsDialog').close(); paintOpen(); paintCount(); location.hash = ''; route(); };
  paintOpen();

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, work: null, title: 'Salasimpul', helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#coverAct .go',
      lede: t('Catatan-catatan sebuah kota yang saling menyimpul.', 'The notes of a town, knotted into each other.'),
      steps: [
        t('Kamu orang baru di kota ini. Dua catatan pertama setiap orang terbuka; catatan berikutnya terbuka sejauh kamu mengenalnya lewat catatan orang lain.', 'You are new in this town. Everyone’s first two notes are open; the rest open as you get to know them through other people’s notes.'),
        t('Di akhir setiap catatan ada persimpangan: tarik benangnya, lanjut di buku yang sama, atau lihat kota sementara itu. Catatan yang sudah lewat terlipat di atas, jadi benangmu bisa digulir kembali.', 'Every note ends at a crossroads: pull the thread, go on in the same notebook, or see the town meanwhile. Notes you have passed fold up above, so you can scroll back along your thread.'),
        t('Kalimat yang kamu pahami belakangan akan menyala. Ketuk untuk melihat apa yang kamu ketahui. Semuanya tersimpan di ikon mata.', 'Sentences you understand later light up. Tap to see what you know. Everything is kept under the eye icon.'),
        t('"Ingat dari tahun lain" di bawah catatan memperlihatkan apa yang masih diingat penulisnya. "Peta kota" menunjukkan semua orang dan benangnya. Tidak sabar? Ada "Buka saja" di setiap halaman yang terkunci, dan "Kota terbuka" di Aa.', '"Remember from another year" under a note shows what its writer still remembers. "Town map" shows everyone and their threads. Impatient? Every locked page has "Open anyway", and Aa has "Open city".')
      ] });
    G.settings();
  }
  /* ---------- untuk alat-alat kota (alat.js): peta, papan, rantai, benda, kalender, suara ---------- */
  window.Simpul = {
    W, E, BY, PEOPLE, NAME, PROPS, PER, KEYS, EN, t, esc, $, $$, store, save,
    get S() { return S; }, state, isRead, knows, inkOf, fmtDate, firstLine, plainOf, para, hh, ageAt, sinceAt, nightOf, NIGHT,
    linksTo, linkedBy, touches, ofOwner, rank, who, go, light, nameRe, SENT, claimText, reduced, readBook, laneOrder, isNight, gapOf,
    met: o => ofOwner[o].some(e => isRead(e.id)), paintCount, paintCity
  };
  document.dispatchEvent(new CustomEvent('simpul:ready'));
  paintCount();
  route();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
