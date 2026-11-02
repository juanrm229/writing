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
    $('#rule2').textContent = 'Pull the thread. A note that knots into another one takes you there.';
    $('#rule3').textContent = 'Sentences you understand later will light up, even on pages you have already read.';
    $('#lost').hidden = false; $('#lost').textContent = 'These notes are not translated yet, so they are shown in the original Indonesian.';
    $('#tabScore').textContent = 'Score'; $('#scoreHint').textContent = 'Tap a name to highlight someone. Tap a dot to peek.'; $('#tabPeople').textContent = 'People'; $('#tabTime').textContent = 'Time';
    $('#knowKick').textContent = 'What you know';
    $('#openLabel').textContent = 'Open city'; $('#resetLabel').textContent = 'Your memory of this city'; $('#reset').textContent = 'Start from zero';
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

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, read: {}, early: {}, known: {}, last: null, open: false });
  let S = store.get('simpul', null);
  if (!S || S.v !== 1) S = blank();
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

  /* ---------- sampul ---------- */
  const years = E.map(e => e.at.y), Y0 = Math.min(...years), Y1 = Math.max(...years);
  $('#cvYears').textContent = `${Y0}–${Y1}`;
  const paintCount = () => {
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
  function coverActs() {
    const last = S.last && BY.get(S.last), ws = windows();
    $('#coverAct').innerHTML = `${last ? `<button type="button" class="go" id="goLast">${esc(t('Lanjutkan', 'Continue'))} · ${esc(NAME[last.owner])}</button>` : ''}
      ${ws.length ? `<p class="w-q">${esc(last ? t('Atau temui orang lain', 'Or meet someone else') : t('Siapa yang kamu temui duluan?', 'Who do you meet first?'))}</p>
      <div class="windows" id="windows">${ws.map((e, i) => `<button type="button" class="win" data-id="${e.id}" style="--i:${i}"><span class="w-light" aria-hidden="true"></span><q>${esc(firstLine(e))}</q><small>${esc(t(`seseorang · ${e.at.y}`, `someone · ${e.at.y}`))}</small></button>`).join('')}</div>
      <div class="w-act"><button type="button" class="ghost" id="reroll">${esc(t('Jendela lain', 'Other windows'))}</button><button type="button" class="ghost" id="goCity">${esc(t('Lihat kotanya', 'See the city'))}</button></div>` : `<button type="button" class="ghost" id="goCity">${esc(t('Lihat kotanya', 'See the city'))}</button>`}`;
    $('#goLast')?.addEventListener('click', () => go(last.id));
    $$('#windows .win').forEach(b => b.addEventListener('click', () => { b.classList.add('chosen'); setTimeout(() => go(b.dataset.id), reduced() ? 0 : 420); }));
    $('#reroll')?.addEventListener('click', coverActs);
    $('#goCity').addEventListener('click', () => { location.hash = 'kota'; });
  }

  /* ---------- partitur ---------- */
  let STEP = +store.get('simpul:step', 18) || 18; const LANE = 30, PAD = 18;
  let focus = null;
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
      const label = `${NAME[e.owner]}, ${fmtDate(e.at, true)}: ${st.open ? e.title : t('terkunci', 'locked')}`;
      return `<g class="nt ${cls}${S.last === e.id ? ' here' : ''}" data-id="${e.id}" data-o="${e.owner}" tabindex="0" role="button" aria-label="${esc(label)}"><circle cx="${cx}" cy="${cy}" r="11" class="hit"/>${cls === 'shut' ? `<line x1="${cx - 3}" x2="${cx + 3}" y1="${cy}" y2="${cy}"/>` : `<circle cx="${cx}" cy="${cy}" r="${cls === 'key' ? 4 : 4.6}"/>`}<title>${esc(label)}</title></g>`;
    }).join('');
    // jejakmu: urutan bacamu sebagai satu benang biru
    const trail = Object.entries(S.read).sort((a, b) => a[1] - b[1]).map(([id]) => BY.get(id)).filter(Boolean);
    if (trail.length > 1) s += `<path class="trail" d="${trail.map((e, k) => `${k ? 'L' : 'M'}${X(E.indexOf(e))} ${Y(laneOf(e.owner))}`).join('')}"/>`;
    svg.innerHTML = s;
    $('#scoreNames').innerHTML = `<span class="yrs"></span>` + laneOrder.map(p => { const n = ofOwner[p.id].length, r = ofOwner[p.id].filter(e => isRead(e.id)).length; return `<button type="button" data-o="${p.id}" aria-pressed="${focus === p.id}"><b>${esc(p.name)}</b><small>${r}/${n}</small></button>`; }).join('');
    paintFocus();
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
  $$('#zoom [data-z]').forEach(b => b.addEventListener('click', () => { STEP = Math.max(8, Math.min(34, STEP + +b.dataset.z)); store.set('simpul:step', STEP); score(); }));

  /* ---------- orang dan waktu ---------- */
  const row = e => { const st = state(e); return `<a class="row ${st.read ? 'read' : st.open ? 'open' : st.key ? 'key' : 'shut'}" href="#c-${e.id}"><span class="r-d">${esc(fmtDate(e.at, true))}</span><span class="r-t">${st.open ? esc(e.title) : esc(t('belum kamu kenal', 'not known yet'))}</span><span class="r-o">${esc(NAME[e.owner])}</span></a>`; };
  function people() {
    $('#panePeople').innerHTML = `<div class="people">${laneOrder.map(p => {
      const list = ofOwner[p.id], r = list.filter(e => isRead(e.id)).length, o = list.filter(e => state(e).open).length;
      return `<details class="person" data-o="${p.id}"><summary><b>${esc(p.name)}</b><span class="p-y">${list[0].at.y}–${list[list.length - 1].at.y}</span><span class="p-m"><i style="--r:${r / list.length};--o:${o / list.length}"></i></span><small>${esc(t(`${r} dibaca · ${o} terbuka · ${list.length} catatan`, `${r} read · ${o} open · ${list.length} notes`))}</small></summary><div class="rows">${list.map(row).join('')}</div></details>`;
    }).join('')}</div>`;
  }
  function timeline() {
    let html = '', y = null;
    E.forEach(e => { if (e.at.y !== y) { if (y !== null) html += '</div>'; y = e.at.y; html += `<h3 class="t-y">${y}</h3><div class="rows">`; } html += row(e); });
    $('#paneTime').innerHTML = html + '</div>';
  }
  $$('#tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('#tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $('#paneScore').hidden = b.dataset.tab !== 'partitur'; $('#panePeople').hidden = b.dataset.tab !== 'orang'; $('#paneTime').hidden = b.dataset.tab !== 'waktu';
    store.set('simpul:tab', b.dataset.tab);
  }));
  function paintCity() { score(); people(); timeline(); }

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
  function para(p, e, pi) {
    const el = document.createElement('p');
    let html = esc(p.t).replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
    el.innerHTML = html;
    const spans = [];
    p.a.forEach((a, ai) => {
      const range = rangeOf(el, a.from, a.to); if (!range) return;
      const span = document.createElement('span');
      span.className = 's';
      if (a.claims) { span.classList.add('cl'); span.dataset.claims = a.claims.join(' '); }
      if (a.irony) { span.classList.add('ir'); span.dataset.irony = a.irony.map(x => x.join('+')).join(' '); }
      span.dataset.k = `${e.id}:${pi}:${ai}`;
      span.append(range.extractContents()); range.insertNode(span); spans.push(span);
    });
    el.querySelectorAll('span.s:empty').forEach(s => s.remove());
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
  let via = null;   // catatan asal saat pembaca menarik sebuah simpul
  function open(id, from) {
    const e = BY.get(id); if (!e) return go(null);
    const st = state(e), i = E.indexOf(e), list = ofOwner[e.owner], r = rank.get(e.id);
    const prevO = list[r - 1], nextO = list[r + 1], prevT = E[i - 1], nextT = E[i + 1];
    note.dataset.owner = e.owner;
    note.style.setProperty('--nb', inkOf(e.owner));
    sky(e.at.h);
    const src = from && BY.get(from);
    note.innerHTML = `${src ? `<a class="from" href="#c-${src.id}" id="fromStrip"><svg class="from-th" viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10C30 0 40 20 60 10S100 0 120 10"/></svg><small>${esc(t('Kamu menarik benang dari', 'You pulled a thread from'))}</small><b>${esc(NAME[src.owner])}</b><span>${esc(src.title)}</span></a>` : ''}<header class="n-head"><p class="n-who"><a href="#orang-${e.owner}">${esc(NAME[e.owner])}</a><span>${esc(t(`catatan ${r + 1} dari ${list.length}`, `note ${r + 1} of ${list.length}`))}</span></p><p class="n-date"><span>${esc(fmtDate(e.at))}</span>${e.at.h != null ? `<b class="n-hour">${String(e.at.h).padStart(2, '0')}.00</b>` : ''}</p><h2>${esc(e.title)}</h2>${S.early[e.id] && !st.read ? '' : ''}</header>
      <div class="n-body" id="nBody"></div>
      <footer class="n-foot" id="nFoot"></footer>`;
    const body = $('#nBody');
    note.classList.toggle('pulled', !!src);
    if (!st.open) { body.innerHTML = lockedHTML(e, st); $('#early').onclick = () => { S.early[e.id] = 1; save(); open(id); }; }
    else {
      if (S.early[e.id] && !isRead(e.id)) body.insertAdjacentHTML('beforeend', `<p class="n-early">${esc(t('Kamu membacanya sebelum kenal.', 'You read this before you knew them.'))}</p>`);
      e.p.forEach((p, pi) => {
        body.append(para(p, e, pi));
        const ls = (p.l || []);
        if (ls.length) body.insertAdjacentHTML('beforeend', `<div class="knots inline">${ls.map(l => knotCard(l.id, l.kind, 'out')).join('')}</div>`);
      });
      if (S.early[e.id] && !isRead(e.id)) body.querySelector('.n-early') && body.prepend(body.querySelector('.n-early'));
      markRead(e);
    }
    const inc = (linkedBy.get(e.id) || []);
    $('#nFoot').innerHTML = `${inc.length ? `<p class="f-k">${esc(t('Yang menyimpul ke catatan ini', 'Notes that knot into this one'))}</p><div class="knots">${inc.map(l => knotCard(l.from, l.kind, 'in')).join('')}</div>` : ''}
      <p class="f-k">${esc(t(`Di buku ${NAME[e.owner]}`, `In ${NAME[e.owner]}’s notebook`))}</p><div class="nav2">${prevO ? `<a href="#c-${prevO.id}" class="nv"><small>← ${esc(t('sebelumnya', 'before'))}</small><span>${esc(state(prevO).open ? prevO.title : t('belum kamu kenal', 'not known yet'))}</span></a>` : '<span></span>'}${nextO ? `<a href="#c-${nextO.id}" class="nv r"><small>${esc(t('berikutnya', 'after'))} →</small><span>${esc(state(nextO).open ? nextO.title : t('belum kamu kenal', 'not known yet'))}</span></a>` : '<span></span>'}</div>
      <p class="f-k">${esc(t('Di kota, pada waktu yang sama', 'In the city, at the same time'))}</p><div class="nav2">${prevT ? `<a href="#c-${prevT.id}" class="nv"><small>← ${esc(NAME[prevT.owner])}, ${esc(fmtDate(prevT.at, true))}</small><span>${esc(state(prevT).open ? prevT.title : t('belum kamu kenal', 'not known yet'))}</span></a>` : '<span></span>'}${nextT ? `<a href="#c-${nextT.id}" class="nv r"><small>${esc(NAME[nextT.owner])}, ${esc(fmtDate(nextT.at, true))} →</small><span>${esc(state(nextT).open ? nextT.title : t('belum kamu kenal', 'not known yet'))}</span></a>` : '<span></span>'}</div>
      <div class="f-act"><a class="ghost" href="#kota">${esc(t('Kembali ke kota', 'Back to the city'))}</a></div>`;
    S.last = e.id; save(); note.dataset.id = e.id;
    show('note'); light(); paintCount(); requestAnimationFrame(learnSeen);
    if (src && wide()) duo(src, e);
    else { $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on'); }
    if (!reduced()) note.classList.remove('enter'), void note.offsetWidth, note.classList.add('enter');
    note.focus?.({ preventScroll: true });
  }
  // membaca: catatan dihitung dibaca saat dibuka; faktanya diketahui saat kalimatnya terlihat
  let pending = [], learnFrom = null;
  function markRead(e) {
    if (!isRead(e.id)) { S.read[e.id] = Date.now(); delete S.early[e.id]; save(); }
    pending = $$('.s.cl', note); learnFrom = e.id;
  }
  // kalimat yang sudah masuk layar (atau sudah terlewati) menjadi yang kamu tahu
  function learnSeen() {
    if (note.hidden || !pending.length) return;
    const line = innerHeight - 48;
    pending = pending.filter(span => {
      if (span.getBoundingClientRect().top > line) return true;
      const fresh = span.dataset.claims.split(' ').filter(p => !knows(p));
      if (fresh.length) { fresh.forEach(p => { S.known[p] = learnFrom; }); save(); span.classList.add('learned'); light(); flashback(fresh, learnFrom); $('#announcement').textContent = t('Kamu tahu sesuatu yang baru.', 'You know something new.'); }
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
  const claimLine = p => { const id = S.known[p] || (PROPS[p] || [])[0], e = BY.get(id); if (!e) return ''; let txt = ''; e.p.some(pp => pp.a.some(a => (a.claims || []).includes(p) && (txt = plainOf(pp.t).slice(a.from, a.to)))); return `<li><q>${esc(txt)}</q><a href="#c-${e.id}">${esc(NAME[e.owner])}, ${esc(fmtDate(e.at, true))}</a></li>`; };
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

  /* ---------- yang kamu tahu ---------- */
  const knowDlg = $('#knowDialog');
  $('#openKnow').addEventListener('click', () => {
    const ks = Object.keys(S.known);
    $('#knowTitle').textContent = t(`${ks.length} dari ${ALL_PROPS}`, `${ks.length} of ${ALL_PROPS}`);
    // dikelompokkan per orang yang menuliskannya
    const groups = {};
    ks.forEach(p => { const e = BY.get(S.known[p]); if (e) (groups[e.owner] = groups[e.owner] || []).push(p); });
    $('#knowBody').innerHTML = ks.length ? Object.entries(groups).map(([o, ps]) => `<p class="f-k">${esc(t(`Dari ${NAME[o]}`, `From ${NAME[o]}`))}</p><ul class="kl">${ps.map(claimLine).join('')}</ul>`).join('')
      : `<p class="k-empty">${esc(t('Belum ada. Setiap kalimat yang memberitahumu sesuatu akan tersimpan di sini.', 'Nothing yet. Every sentence that tells you something is kept here.'))}</p>`;
    knowDlg.showModal();
  });
  knowDlg.addEventListener('click', e => { if (e.target === knowDlg || e.target.closest('[data-close]')) knowDlg.close(); if (e.target.closest('a[href^="#c-"]')) knowDlg.close(); });

  /* ---------- alamat: #kota, #orang-<id>, #c-<id> ---------- */
  function go(id) { if (id) location.hash = 'c-' + id; else location.hash = ''; }
  function route() {
    const h = location.hash.slice(1);
    closePop();
    if (h.startsWith('c-')) { const from = via; via = null; open(h.slice(2), from); return; }
    $('#duo')?.remove(); $('#duoTh')?.remove(); document.body.classList.remove('duo-on');
    if (h === 'kota' || h.startsWith('orang-')) {
      paintCity(); show('city');
      const tab = h.startsWith('orang-') ? 'orang' : store.get('simpul:tab', 'partitur');
      $(`#tabs [data-tab="${tab}"]`).click();
      if (h.startsWith('orang-')) { const d = $(`.person[data-o="${h.slice(6)}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }
      return;
    }
    coverActs(); lanes($('#cvLanes'), 320, 120); show('cover'); sky(null);
  }
  addEventListener('hashchange', route);
  // menarik simpul: catatan asal diingat supaya benangnya bisa digambar
  document.addEventListener('click', e => { const k = e.target.closest('#nBody .knots.inline .knot'); if (k && !note.hidden) via = note.dataset.id || null; }, true);

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
        t('Di bawah paragraf ada simpul ke catatan orang lain. Simpul yang kamu ikuti selalu terbuka.', 'Under some paragraphs there are knots to other people’s notes. A knot you follow is always open.'),
        t('Kalimat yang kamu pahami belakangan akan menyala. Ketuk untuk melihat apa yang kamu ketahui. Semuanya tersimpan di ikon mata.', 'Sentences you understand later light up. Tap to see what you know. Everything is kept under the eye icon.'),
        t('Partitur, Orang, dan Waktu adalah tiga cara melihat kota. Tidak sabar? Ada "Buka saja" di setiap halaman yang terkunci, dan "Kota terbuka" di Aa.', 'Score, People and Time are three ways to see the town. Impatient? Every locked page has "Open anyway", and Aa has "Open city".')
      ] });
    G.settings();
  }
  paintCount();
  route();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
