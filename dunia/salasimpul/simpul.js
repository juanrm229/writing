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
    $('#tabScore').textContent = 'Score'; $('#tabPeople').textContent = 'People'; $('#tabTime').textContent = 'Time';
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
  function coverActs() {
    const last = S.last && BY.get(S.last), start = BY.get(W.start) || E[0];
    $('#coverAct').innerHTML = (last
      ? `<button type="button" class="go" id="goLast">${esc(t('Lanjutkan', 'Continue'))} · ${esc(NAME[last.owner])}</button>`
      : `<button type="button" class="go" id="goStart">${esc(t(`Mulai dari ${NAME[start.owner]}, ${start.at.y}`, `Begin with ${NAME[start.owner]}, ${start.at.y}`))}</button>`) +
      `<button type="button" class="ghost" id="goCity">${esc(t('Lihat kotanya', 'See the city'))}</button>`;
    $('#goLast')?.addEventListener('click', () => go(last.id));
    $('#goStart')?.addEventListener('click', () => go(start.id));
    $('#goCity').addEventListener('click', () => { location.hash = 'kota'; });
  }

  /* ---------- partitur ---------- */
  const STEP = 18, LANE = 30, PAD = 18;
  const laneOrder = [...PEOPLE].sort((a, b) => E.findIndex(e => e.owner === a.id) - E.findIndex(e => e.owner === b.id));
  const laneOf = id => laneOrder.findIndex(p => p.id === id);
  function score() {
    const svg = $('#scoreSvg'), w = PAD * 2 + (E.length - 1) * STEP, h = 34 + laneOrder.length * LANE;
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const X = i => PAD + i * STEP, Y = l => 34 + l * LANE + LANE / 2;
    let s = laneOrder.map((p, l) => `<line class="ln" x1="0" x2="${w}" y1="${Y(l)}" y2="${Y(l)}"/>`).join('');
    // tahun
    let lastY = null, lastX = -99;
    E.forEach((e, i) => { if (e.at.y !== lastY) { const lab = X(i) - lastX >= 34; s += `${lab ? `<text class="yr" x="${X(i)}" y="14">${e.at.y}</text>` : ''}<line class="yt${lab ? '' : ' minor'}" x1="${X(i)}" x2="${X(i)}" y1="${lab ? 20 : 26}" y2="${h}"/>`; if (lab) lastX = X(i); lastY = e.at.y; } });
    // benang: hanya yang sudah kamu lihat ujungnya
    E.forEach((e, i) => linksTo.get(e.id).forEach(l => {
      if (!isRead(e.id) && !isRead(l.id)) return;
      const j = E.indexOf(BY.get(l.id)), a = [X(i), Y(laneOf(e.owner))], b = [X(j), Y(laneOf(BY.get(l.id).owner))];
      const both = isRead(e.id) && isRead(l.id);
      s += `<path class="th${both ? ' tied' : ''}${l.kind === 'echo' ? ' echo' : ''}" d="M${a[0]} ${a[1]}C${a[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${(a[1] + b[1]) / 2} ${b[0]} ${b[1]}"/>`;
    }));
    // titik
    s += E.map((e, i) => {
      const st = state(e), cls = st.read ? 'read' : st.open ? 'open' : st.key ? 'key' : 'shut', cx = X(i), cy = Y(laneOf(e.owner));
      const label = `${NAME[e.owner]}, ${fmtDate(e.at, true)}: ${st.open ? e.title : t('terkunci', 'locked')}`;
      return `<g class="nt ${cls}${S.last === e.id ? ' here' : ''}" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(label)}"><circle cx="${cx}" cy="${cy}" r="11" class="hit"/>${cls === 'shut' ? `<line x1="${cx - 3}" x2="${cx + 3}" y1="${cy}" y2="${cy}"/>` : `<circle cx="${cx}" cy="${cy}" r="${cls === 'key' ? 4 : 4.6}"/>`}<title>${esc(label)}</title></g>`;
    }).join('');
    svg.innerHTML = s;
    $('#scoreNames').innerHTML = `<span class="yrs"></span>` + laneOrder.map(p => { const n = ofOwner[p.id].length, r = ofOwner[p.id].filter(e => isRead(e.id)).length; return `<span><b>${esc(p.name)}</b><small>${r}/${n}</small></span>`; }).join('');
    $('#legend').innerHTML = `<span><i class="lg read"></i>${esc(t('dibaca', 'read'))}</span><span><i class="lg open"></i>${esc(t('terbuka', 'open'))}</span><span><i class="lg shut"></i>${esc(t('belum kenal', 'not known yet'))}</span><span><i class="lg key"></i>${esc(t('menunggu sesuatu', 'waiting for something'))}</span><span><i class="lg th"></i>${esc(t('simpul', 'knot'))}</span>`;
    // gulir ke catatan terakhir
    const here = S.last ? E.findIndex(e => e.id === S.last) : 0;
    const sc = $('#scoreScroll'); sc.scrollLeft = Math.max(0, X(Math.max(0, here)) - sc.clientWidth / 2);
  }
  $('#scoreSvg').addEventListener('click', e => { const g = e.target.closest('.nt'); if (g) go(g.dataset.id); });
  $('#scoreSvg').addEventListener('keydown', e => { const g = e.target.closest('.nt'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(g.dataset.id); } });

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
  function open(id) {
    const e = BY.get(id); if (!e) return go(null);
    const st = state(e), i = E.indexOf(e), list = ofOwner[e.owner], r = rank.get(e.id);
    const prevO = list[r - 1], nextO = list[r + 1], prevT = E[i - 1], nextT = E[i + 1];
    note.dataset.owner = e.owner;
    note.innerHTML = `<header class="n-head"><p class="n-who"><a href="#orang-${e.owner}">${esc(NAME[e.owner])}</a><span>${esc(t(`catatan ${r + 1} dari ${list.length}`, `note ${r + 1} of ${list.length}`))}</span></p><p class="n-date">${esc(fmtDate(e.at))}${e.at.h != null ? ' · ' + esc(fmtHour(e.at.h)) : ''}</p><h2>${esc(e.title)}</h2>${S.early[e.id] && !st.read ? '' : ''}</header>
      <div class="n-body" id="nBody"></div>
      <footer class="n-foot" id="nFoot"></footer>`;
    const body = $('#nBody');
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
    S.last = e.id; save();
    show('note'); light(); paintCount();
    if (!reduced()) note.classList.remove('enter'), void note.offsetWidth, note.classList.add('enter');
    note.focus?.({ preventScroll: true });
  }
  // membaca: catatan dihitung dibaca saat dibuka; faktanya diketahui saat kalimatnya terlihat
  let seenObs = null;
  function markRead(e) {
    if (!isRead(e.id)) { S.read[e.id] = Date.now(); delete S.early[e.id]; save(); }
    if (seenObs) seenObs.disconnect();
    const learn = span => { const fresh = span.dataset.claims.split(' ').filter(p => !knows(p)); if (!fresh.length) return; fresh.forEach(p => { S.known[p] = e.id; }); save(); span.classList.add('learned'); light(); $('#announcement').textContent = t('Kamu tahu sesuatu yang baru.', 'You know something new.'); };
    const claims = $$('.s.cl', note);
    if ('IntersectionObserver' in window) { seenObs = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { seenObs.unobserve(x.target); learn(x.target); } }), { rootMargin: '0px 0px -15% 0px' }); claims.forEach(c => seenObs.observe(c)); }
    else claims.forEach(learn);
  }
  // ironi: menyala kalau semua faktanya diketahui
  function light() {
    $$('.s.ir', note).forEach(s => { const lit = s.dataset.irony.split(' ').some(g => irLit(g.split('+'))); if (lit && !s.classList.contains('lit')) { s.classList.add('lit'); if (!reduced()) s.classList.add('glow'); } });
  }

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
    if (h.startsWith('c-')) { open(h.slice(2)); return; }
    if (h === 'kota' || h.startsWith('orang-')) {
      paintCity(); show('city');
      const tab = h.startsWith('orang-') ? 'orang' : store.get('simpul:tab', 'partitur');
      $(`#tabs [data-tab="${tab}"]`).click();
      if (h.startsWith('orang-')) { const d = $(`.person[data-o="${h.slice(6)}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }
      return;
    }
    coverActs(); lanes($('#cvLanes'), 320, 120); show('cover');
  }
  addEventListener('hashchange', route);

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
