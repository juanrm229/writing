/* Salasimpul: alat-alat kota. Dimuat sebelum simpul.js dan mulai bekerja saat simpul.js siap (simpul:ready).
   - Papan: sematkan fakta yang kamu tahu, sambungkan dengan benang. Dua fakta yang bersama-sama mengubah makna sebuah
     kalimat (@irony) menjadi simpul yang kamu temukan sendiri.
   - Rantai: jalur terpendek di antara dua orang, lewat simpul, malam yang sama, dan buku yang sama.
   - Benda: benda yang berpindah tangan dari catatan ke catatan (benda di _dunia.json).
   - Kalender malam (di Waktu), kota pada satu tahun dan kenali suaranya (di Orang). */
(() => {
  'use strict';
  document.addEventListener('simpul:ready', () => {
    const A = window.Simpul, { $, $$, t, esc, W, E, BY, NAME, PEOPLE, PROPS, store } = A;
    const S = () => A.S;
    const save = () => A.save();
    const wordRe = m => new RegExp(`(^|[^\\p{L}])(${m})(?![\\p{L}])`, 'iu');
    const SENT = /[^.!?…]+(?:[.!?…]+["”’)]*)?/g;
    const sentences = txt => { const out = []; let m; SENT.lastIndex = 0; while ((m = SENT.exec(txt))) { if (m[0].trim()) out.push(m[0].trim()); if (!m[0].length) SENT.lastIndex++; } return out; };
    const snippet = (e, res) => { for (const p of e.p) for (const s of sentences(A.plainOf(p.t))) if (res.some(r => r.test(s))) return s; return ''; };
    const seeded = k => { let h = 2166136261; for (const c of String(k)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
    const isOpen = id => A.state(BY.get(id)).open;
    const yearsAgo = (a, b) => Math.abs(b.at.y - a.at.y);
    const metPeople = () => A.laneOrder.filter(p => A.met(p.id));

    /* Peta ada di peta.js. */

    /* ================= PAPAN SIMPUL ================= */
    // kelompok ironi: fakta-fakta yang bersama-sama mengubah makna sebuah kalimat
    const GROUPS = new Map();
    E.forEach(e => e.p.forEach((p, pi) => p.a.forEach(a => (a.irony || []).forEach(g => {
      const ps = [...new Set(g)].filter(x => PROPS[x]).sort(); if (ps.length < 2) return;
      const key = ps.join('+'); if (!GROUPS.has(key)) GROUPS.set(key, { ps, spans: [] });
      GROUPS.get(key).spans.push({ e, txt: A.plainOf(p.t).slice(a.from, a.to) });
    }))));
    const board = () => { const s = S(); s.board = s.board || { pos: {}, ties: [], found: {} }; s.board.ties = s.board.ties || []; s.board.found = s.board.found || {}; s.board.pos = s.board.pos || {}; return s.board; };
    const candidates = () => [...GROUPS.entries()].filter(([, g]) => g.ps.every(A.knows));
    let pickA = null, bdTimer = 0;
    document.addEventListener('click', e => { if (e.target.closest('[data-bd-close]')) $('#bdFound').hidden = true; else if (e.target.closest('#bdFound a')) $('#bdFound').hidden = true; });
    function connected(ps, ties) {
      const adj = new Map(); ties.forEach(([a, b]) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); });
      const seen = new Set([ps[0]]), q = [ps[0]];
      while (q.length) { const x = q.shift(); (adj.get(x) || []).forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
      return ps.every(p => seen.has(p));
    }
    const factText = p => { const id = S().known[p] || (PROPS[p] || [])[0], e = BY.get(id); return { e, txt: e ? A.claimText(e, p) : p }; };
    function boardPane() {
      const pane = $('#paneBoard'); if (!pane) return;
      const B = board(), facts = Object.keys(S().known), cand = candidates(), found = cand.filter(([k]) => B.found[k]).length;
      if (facts.length < 2) { pane.innerHTML = `<p class="ang-lede">${esc(t('Papan ini menunggu. Setiap hal yang kamu ketahui dari catatan akan tersemat di sini, dan kamu bisa menyambungkannya sendiri.', 'This board is waiting. Everything you learn from the notes is pinned here, and you can tie them together yourself.'))}</p>`; return; }
      const cols = innerWidth < 600 ? 2 : 4, CW = innerWidth < 600 ? 160 : 200, CH = 118;
      facts.forEach((p, i) => { if (!B.pos[p]) B.pos[p] = [16 + (i % cols) * (CW + 14) + seeded(p) * 10, 16 + Math.floor(i / cols) * (CH + 18) + seeded(p + 'y') * 12]; });
      const H = Math.max(420, ...facts.map(p => B.pos[p][1] + CH + 30)), Wd = Math.max(cols * (CW + 14) + 30, ...facts.map(p => B.pos[p][0] + CW + 20));
      pane.innerHTML = `<p class="ang-lede">${esc(t('Ketuk satu hal yang kamu tahu, lalu ketuk hal lain untuk menyambungkannya dengan benang. Kalau keduanya bersama-sama mengubah makna sebuah kalimat, simpulnya menyala. Seret untuk memindahkan.', 'Tap one thing you know, then another to tie them. If together they change what a sentence means, the knot lights up. Drag to move.'))}</p>
        <p class="bd-score"><span><b>${found}</b> ${esc(t('simpul kamu temukan', 'knots found'))}</span><span><b>${cand.length - found}</b> ${esc(t('masih tersembunyi di antara yang kamu tahu', 'still hidden among what you know'))}</span>${B.ties.length ? `<button type="button" class="ghost sm" id="bdClear">${esc(t('Lepas semua benang', 'Untie all'))}</button>` : ''}</p>
        <div class="bd" id="bd"><div class="bd-in" style="width:${Wd}px;height:${H}px"><svg class="bd-th" id="bdTh" width="${Wd}" height="${H}"></svg>${facts.map(p => { const { e, txt } = factText(p), [x, y] = B.pos[p]; return `<div class="bd-card${pickA === p ? ' on' : ''}" data-p="${p}" role="button" tabindex="0" style="left:${x}px;top:${y}px;width:${CW}px;--r:${seeded(p).toFixed(2)};--fk:${e ? A.inkOf(e.owner) : 'var(--ink)'}"><q>${esc(txt.length > 110 ? txt.slice(0, 108) + '…' : txt)}</q><small>${esc(e ? NAME[e.owner] + ' · ' + e.at.y : '')}</small></div>`; }).join('')}</div></div>
        <div class="bd-found" id="bdFound" hidden></div>`;
      drawTies();
      $('#bdClear') && ($('#bdClear').onclick = () => { B.ties = []; save(); boardPane(); });
    }
    function drawTies() {
      const B = board(), svg = $('#bdTh'); if (!svg) return;
      const center = p => { const c = $(`.bd-card[data-p="${p}"]`); return c ? [c.offsetLeft + c.offsetWidth / 2, c.offsetTop + 10] : null; };
      const lit = new Set(); Object.keys(B.found).forEach(k => { const g = GROUPS.get(k); if (g) B.ties.forEach(([a, b]) => { if (g.ps.includes(a) && g.ps.includes(b)) lit.add(`${a}|${b}`); }); });
      svg.innerHTML = B.ties.map(([a, b]) => { const p1 = center(a), p2 = center(b); if (!p1 || !p2) return ''; const my = Math.max(p1[1], p2[1]) + 40; return `<path class="${lit.has(`${a}|${b}`) ? 'lit' : ''}" data-tie="${a}|${b}" d="M${p1[0]} ${p1[1]}Q${(p1[0] + p2[0]) / 2} ${my} ${p2[0]} ${p2[1]}"/>`; }).join('') + B.ties.map(([a, b]) => { const p1 = center(a), p2 = center(b); return p1 && p2 ? `<circle cx="${p1[0]}" cy="${p1[1]}" r="4"/><circle cx="${p2[0]}" cy="${p2[1]}" r="4"/>` : ''; }).join('');
    }
    function tie(a, b) {
      const B = board(); if (a === b) return;
      if (B.ties.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return;
      B.ties.push([a, b]);
      const fresh = candidates().filter(([k, g]) => !B.found[k] && (g.ps.includes(a) || g.ps.includes(b)) && connected(g.ps, B.ties));
      fresh.forEach(([k]) => { B.found[k] = Date.now(); });
      save(); boardPane();
      const box = $('#bdFound'), x = `<button type="button" class="close" data-bd-close aria-label="${esc(t('Tutup', 'Close'))}">×</button>`;
      clearTimeout(bdTimer);
      if (fresh.length) {
        const spans = fresh.flatMap(([, g]) => g.spans);
        box.innerHTML = x + `<p class="sh-k">${esc(t('Kamu menemukan simpul ini sendiri', 'You found this knot yourself'))}</p><ul class="kl">${spans.slice(0, 4).map(s => `<li><q>${esc(s.txt)}</q><a href="#c-${s.e.id}">${esc(A.isRead(s.e.id) || A.state(s.e).open ? NAME[s.e.owner] : t('Seseorang', 'Someone'))}, ${esc(A.fmtDate(s.e.at, true))}${A.isRead(s.e.id) ? '' : ' · ' + esc(t('belum kamu baca', 'not read yet'))}</a></li>`).join('')}</ul><p class="sh-not">${esc(t('Kalimat-kalimat ini berubah makna karena dua hal yang kamu sambungkan.', 'These sentences change because of what you tied together.'))}</p>`;
        box.hidden = false; box.classList.remove('in'); void box.offsetWidth; box.classList.add('in'); A.light();
      } else {
        box.innerHTML = x + `<p class="sh-not">${esc(t('Benangnya terpasang. Belum ada kalimat yang berubah karena dua hal ini, tapi papan ini milikmu.', 'Tied. No sentence changes because of these two yet, but the board is yours.'))}</p>`; box.hidden = false; bdTimer = setTimeout(() => { box.hidden = true; }, 5000);
      }
    }
    let bdDrag = null;
    document.addEventListener('pointerdown', e => { const c = e.target.closest('#bd .bd-card'); if (!c) return; bdDrag = { c, x: e.clientX, y: e.clientY, l: c.offsetLeft, t: c.offsetTop, moved: false }; c.setPointerCapture?.(e.pointerId); });
    document.addEventListener('pointermove', e => { if (!bdDrag) return; const dx = e.clientX - bdDrag.x, dy = e.clientY - bdDrag.y; if (!bdDrag.moved && Math.abs(dx) + Math.abs(dy) < 6) return; bdDrag.moved = true; e.preventDefault(); bdDrag.c.style.left = Math.max(0, bdDrag.l + dx) + 'px'; bdDrag.c.style.top = Math.max(0, bdDrag.t + dy) + 'px'; drawTies(); });
    document.addEventListener('pointerup', () => {
      if (!bdDrag) return; const { c, moved } = bdDrag; bdDrag = null; const p = c.dataset.p;
      if (moved) { board().pos[p] = [c.offsetLeft, c.offsetTop]; save(); return; }
      tapFact(p);
    });
    function tapFact(p) {
      if (!pickA) { pickA = p; $$('#bd .bd-card').forEach(x => x.classList.toggle('on', x.dataset.p === p)); return; }
      const a = pickA; pickA = null; $$('#bd .bd-card.on').forEach(x => x.classList.remove('on'));
      if (a !== p) tie(a, p);
    }
    document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('#bd .bd-card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapFact(c.dataset.p); } });
    document.addEventListener('click', e => { const th = e.target.closest('#bdTh path[data-tie]'); if (!th) return; const [a, b] = th.dataset.tie.split('|'), B = board(); B.ties = B.ties.filter(([x, y]) => !(x === a && y === b)); save(); boardPane(); });

    /* ================= RANTAI KETIDAKSENGAJAAN ================= */
    const EDGES = new Map(E.map(e => [e.id, []]));
    const addEdge = (a, b, kind, w) => { EDGES.get(a).push({ to: b, kind, w }); EDGES.get(b).push({ to: a, kind, w }); };
    E.forEach(e => A.linksTo.get(e.id).forEach(l => addEdge(e.id, l.id, l.kind === 'echo' ? 'echo' : 'knot', 1)));
    A.NIGHT.forEach(list => list.forEach((a, i) => list.slice(i + 1).forEach(b => addEdge(a.id, b.id, 'night', 1.2))));
    Object.values(A.ofOwner).forEach(list => list.forEach((e, i) => { if (list[i + 1]) addEdge(e.id, list[i + 1].id, 'book', 2.2); }));
    function path(from, to) {
      const dist = new Map(), prev = new Map(), done = new Set();
      from.forEach(id => dist.set(id, 0));
      while (true) {
        let u = null, best = Infinity; dist.forEach((d, id) => { if (!done.has(id) && d < best) { best = d; u = id; } });
        if (u == null) return null;
        if (to.includes(u)) { const out = [u]; while (prev.has(out[0])) out.unshift(prev.get(out[0]).from); return out.map((id, i) => ({ id, via: i ? prev.get(id).kind : null })); }
        done.add(u);
        EDGES.get(u).forEach(({ to: v, kind, w }) => { const d = best + w; if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, { from: u, kind }); } });
      }
    }
    let chainFrom = null, chainTo = null;
    const VIA = { knot: t('simpul', 'knot'), echo: t('gema', 'echo'), night: t('malam yang sama', 'the same night'), book: t('buku yang sama', 'the same notebook') };
    function chainPane() {
      const pane = $('#paneChain'); if (!pane) return;
      const ppl = A.laneOrder, opt = (v, sel) => ppl.map(p => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(A.met(p.id) ? p.name : t('Seseorang', 'Someone') + ' (' + (A.ofOwner[p.id][0].at.y) + ')')}</option>`).join('');
      if (!chainFrom) { const m = metPeople(); chainFrom = (m[0] || ppl[0]).id; }
      if (!chainTo) chainTo = ppl.find(p => p.id !== chainFrom && A.ofOwner[p.id].length > 3 && Math.abs(A.ofOwner[p.id][0].at.y - A.ofOwner[chainFrom][0].at.y) > 15)?.id || ppl[ppl.length - 1].id;
      const pth = path(A.ofOwner[chainFrom].map(e => e.id), A.ofOwner[chainTo].map(e => e.id).filter(id => !A.ofOwner[chainFrom].some(x => x.id === id)));
      let body = `<p class="k-empty">${esc(t('Tidak ada jalan di antara keduanya.', 'There is no way between them.'))}</p>`;
      if (pth) {
        const nodes = pth.map(x => ({ e: BY.get(x.id), via: x.via })), ppl2 = new Set(nodes.map(n => n.e.owner)), span = yearsAgo(nodes[0].e, nodes[nodes.length - 1].e);
        body = `<p class="ch-stat"><span><b>${nodes.length - 1}</b> ${esc(t('langkah', 'steps'))}</span><span><b>${ppl2.size}</b> ${esc(t('orang', 'people'))}</span><span><b>${span}</b> ${esc(t('tahun', 'years'))}</span></p>
          <ol class="chain">${nodes.map((n, i) => { const st = A.state(n.e), prev = nodes[i - 1]; return `${i ? `<li class="ch-via ch-${n.via}"><span>${esc(VIA[n.via])}</span>${prev ? `<small>${esc((() => { const g = A.gapOf(prev.e, n.e); return g.n === '0' ? g.u : g.n + ' ' + g.u; })())}</small>` : ''}</li>` : ''}<li class="ch-node ${A.isRead(n.e.id) ? 'read' : st.open ? 'open' : 'shut'}" style="--fk:${A.inkOf(n.e.owner)};--i:${i}"><a href="#c-${n.e.id}"><small>${esc(st.open ? NAME[n.e.owner] : t('Seseorang', 'Someone'))} · ${esc(A.fmtDate(n.e.at, true))}</small><b>${esc(st.open ? n.e.title : t('belum kamu kenal', 'not known yet'))}</b>${st.open ? `<q>${esc(A.firstLine(n.e))}</q>` : ''}</a></li>`; }).join('')}</ol>
          <div class="f-row"><button type="button" class="go sm" id="chRead">${esc(t('Baca rantai ini', 'Read this chain'))}</button><button type="button" class="ghost sm" id="chShuffle">${esc(t('Acak dua orang', 'Two people at random'))}</button></div>`;
      }
      pane.innerHTML = `<p class="ang-lede">${esc(t('Dua orang yang mungkin tidak pernah bertemu tetap tersambung. Pilih dua orang, dan kota mencari jalan terpendek di antara mereka: lewat simpul, malam yang sama, atau buku yang sama.', 'Two people who may never have met are still tied. Pick two, and the town finds the shortest way between them: through knots, the same night, or the same notebook.'))}</p>
        <div class="ch-pick"><label><span>${esc(t('Dari', 'From'))}</span><select id="chFrom">${opt(0, chainFrom)}</select></label><span class="ch-arrow" aria-hidden="true">→</span><label><span>${esc(t('Ke', 'To'))}</span><select id="chTo">${opt(0, chainTo)}</select></label></div>${body}`;
      $('#chFrom').onchange = e => { chainFrom = e.target.value; chainPane(); };
      $('#chTo').onchange = e => { chainTo = e.target.value; chainPane(); };
      $('#chShuffle') && ($('#chShuffle').onclick = () => { const p = A.laneOrder.map(x => x.id).sort(() => Math.random() - .5); chainFrom = p[0]; chainTo = p[1]; chainPane(); });
      $('#chRead') && ($('#chRead').onclick = () => A.readBook(pth.map(x => x.id).filter(id => A.state(BY.get(id)).open), false, t(`Rantai: ${NAME[chainFrom]} ke ${NAME[chainTo]}`, `Chain: ${NAME[chainFrom]} to ${NAME[chainTo]}`)));
    }

    /* ================= JEJAK BENDA ================= */
    const THINGS = (W.benda || []).map(b => ({ ...b, res: b.match.map(wordRe) }));
    let thing = null;
    function thingsPane() {
      const pane = $('#paneThings'); if (!pane) return;
      if (!THINGS.length) { pane.innerHTML = ''; $('#tabThings')?.remove(); return; }
      const seenIn = b => b.notes.filter(id => A.isRead(id)).length;
      if (!thing) thing = (THINGS.find(b => seenIn(b)) || THINGS[0]).id;
      const b = THINGS.find(x => x.id === thing), list = b.notes.map(id => BY.get(id)), owners = [...new Set(list.map(e => e.owner))];
      pane.innerHTML = `<p class="ang-lede">${esc(t('Benda-benda kecil berpindah dari satu buku ke buku lain. Pilih satu, dan ikuti ke tangan siapa saja ia sampai.', 'Small things move from one notebook to another. Pick one and follow whose hands it reaches.'))}</p>
        <div class="th-chips">${THINGS.map(x => `<button type="button" data-thing="${x.id}" aria-pressed="${x.id === thing}">${esc(x.name)}<small>${seenIn(x)}/${x.notes.length}</small></button>`).join('')}</div>
        <div class="th-head"><h3>${esc(b.name)}</h3><p>${esc(t(`${list.length} catatan · ${owners.length} orang · ${list[0].at.y}–${list[list.length - 1].at.y}`, `${list.length} notes · ${owners.length} people · ${list[0].at.y}–${list[list.length - 1].at.y}`))}</p></div>
        <div class="th-track" aria-hidden="true">${list.map((e, i) => `<i class="${A.isRead(e.id) ? 'read' : ''}" style="left:${(list.length > 1 ? i / (list.length - 1) : .5) * 100}%;--fk:${A.inkOf(e.owner)}"></i>`).join('')}</div>
        <ol class="th-list">${list.map(e => { const st = A.state(e), read = A.isRead(e.id), q = read ? snippet(e, b.res) : ''; return `<li style="--fk:${A.inkOf(e.owner)}"><a href="#c-${e.id}" class="${read ? 'read' : st.open ? 'open' : 'shut'}"><small>${esc(st.open ? NAME[e.owner] : t('Seseorang', 'Someone'))} · ${esc(A.fmtDate(e.at, true))}</small>${q ? `<q>${esc(q)}</q>` : `<span>${esc(st.open ? t('Belum kamu baca', 'Not read yet') : t('Belum kamu kenal', 'Not known yet'))}</span>`}</a></li>`; }).join('')}</ol>`;
    }
    document.addEventListener('click', e => { const c = e.target.closest('#paneThings [data-thing]'); if (c) { thing = c.dataset.thing; thingsPane(); } });

    /* ================= KALENDER MALAM (di Waktu) ================= */
    function calendar() {
      const pane = $('#paneTime'); if (!pane) return;
      $('#calHost')?.remove();
      const Y0 = E[0].at.y, Y1 = E[E.length - 1].at.y, C = 5, G = 1, L = 30, cols = 53;
      const cells = new Map();
      E.forEach(e => { const w = Math.min(52, Math.floor((e.at.d - 1) / 7)), k = `${e.at.y}:${w}`; (cells.get(k) || cells.set(k, []).get(k)).push(e); });
      let s = '';
      for (let y = Y0; y <= Y1; y++) {
        const row = y - Y0, yy = row * (C + G);
        if (y % 5 === 0 || y === Y0 || y === Y1) s += `<text x="${L - 4}" y="${yy + C}" class="cl-y">${y}</text>`;
        for (let w = 0; w < cols; w++) {
          const list = cells.get(`${y}:${w}`), x = L + w * (C + G);
          if (!list) { s += `<rect class="cl-c" x="${x}" y="${yy}" width="${C}" height="${C}"/>`; continue; }
          const shared = list.some(e => A.nightOf(e).length > 1), read = list.some(e => A.isRead(e.id)), first = list[0];
          const href = shared ? `#malam-${first.at.y}-${(list.find(e => A.nightOf(e).length > 1) || first).at.d}` : `#c-${first.id}`;
          s += `<a href="${href}" class="cl-a"><rect class="cl-c n${Math.min(3, list.length)}${shared ? ' sh' : ''}${read ? ' rd' : ''}" x="${x}" y="${yy}" width="${C}" height="${C}" rx="1"/><title>${esc(list.map(e => `${A.state(e).open ? NAME[e.owner] : t('seseorang', 'someone')}, ${A.fmtDate(e.at, true)}`).join(' · '))}</title></a>`;
        }
      }
      const Wd = L + cols * (C + G), H = (Y1 - Y0 + 1) * (C + G);
      const nights = [...A.NIGHT.values()].filter(l => l.length > 1).length;
      pane.insertAdjacentHTML('afterbegin', `<section class="cal" id="calHost"><p class="f-k">${esc(t('Kalender malam', 'The calendar of nights'))}</p><p class="ang-lede">${esc(t(`Satu baris per tahun, satu kotak per minggu. ${nights} hari ditulis oleh lebih dari satu orang; ketuk untuk membacanya menurut jam.`, `One row a year, one square a week. ${nights} days were written by more than one person; tap to read them by the clock.`))}</p>
        <div class="cal-scroll"><svg class="cal-svg" viewBox="0 0 ${Wd} ${H}" width="${Wd * 1.6}" height="${H * 1.6}" role="img" aria-label="${esc(t('Kalender catatan', 'Calendar of notes'))}">${s}</svg></div>
        <p class="cal-lg"><span><i class="n1"></i>${esc(t('satu catatan', 'one note'))}</span><span><i class="n3"></i>${esc(t('beberapa', 'several'))}</span><span><i class="sh"></i>${esc(t('malam yang sama', 'the same night'))}</span><span><i class="rd"></i>${esc(t('sudah kamu baca', 'read'))}</span></p></section>`);
    }

    /* ================= KOTA PADA SATU TAHUN, DAN KENALI SUARANYA (di Orang) ================= */
    let townYear = +store.get('simpul:year', 0) || 2010;
    function town() {
      const pane = $('#panePeople'); if (!pane) return;
      $('#townHost')?.remove();
      const Y0 = E[0].at.y, Y1 = E[E.length - 1].at.y; townYear = Math.max(Y0, Math.min(Y1, townYear));
      const tiles = A.laneOrder.map(p => {
        const list = A.ofOwner[p.id], m = A.met(p.id), born = A.PER[p.id] && A.PER[p.id].born, age = born ? townYear - born : null;
        const now = list.filter(e => e.at.y === townYear).length, first = list[0].at.y, last = list[list.length - 1].at.y;
        const status = age != null && age < 0 ? t('belum lahir', 'not born yet') : now ? t(`menulis ${now} catatan`, `writes ${now} note${now > 1 ? 's' : ''}`) : townYear < first ? t(`mulai menulis ${first}`, `starts writing in ${first}`) : townYear > last ? t(`terakhir menulis ${last}`, `last wrote in ${last}`) : t('tidak menulis tahun ini', 'not writing this year');
        return `<button type="button" class="tw-t${now ? ' now' : ''}${age != null && age < 0 ? ' unborn' : ''}" data-who="${p.id}" style="--fk:${A.inkOf(p.id)}"><b>${esc(m ? p.name : t('Seseorang', 'Someone'))}</b>${m && age != null && age >= 0 ? `<span class="tw-age">${age}<small>${esc(t(' th', ' y'))}</small></span>` : ''}<small>${esc(status)}</small></button>`;
      }).join('');
      pane.insertAdjacentHTML('afterbegin', `<section class="town" id="townHost"><div class="tw-head"><p class="f-k">${esc(t('Kota pada', 'The town in'))} <b id="townY">${townYear}</b></p><button type="button" class="ghost sm" id="quizGo"${metPeople().length < 2 ? ' disabled' : ''}>${esc(t('Kenali suaranya', 'Know their voices'))}</button></div>
        <input type="range" id="townRange" min="${Y0}" max="${Y1}" step="1" value="${townYear}" aria-label="${esc(t('Tahun', 'Year'))}"><div class="tw-grid">${tiles}</div></section>`);
      $('#townRange').oninput = e => { townYear = +e.target.value; store.set('simpul:year', townYear); town(); $('#townRange').focus(); };
      $('#quizGo').onclick = quiz;
    }
    // kenali suaranya: satu kalimat tanpa nama dari catatan yang sudah kamu baca; siapa yang menulisnya?
    function quiz() {
      const ppl = metPeople(); if (ppl.length < 2) return;
      const pool = E.filter(e => A.isRead(e.id) && ppl.some(p => p.id === e.owner));
      const e = pool[Math.floor(Math.random() * pool.length)];
      const cands = sentences(e.p.map(p => A.plainOf(p.t)).join(' ')).filter(s => s.length > 36 && s.length < 200 && !PEOPLE.some(p => [p.name, ...(p.aliases || [])].some(n => A.nameRe(n).test(s))));
      const q = cands[Math.floor(Math.random() * cands.length)] || A.firstLine(e);
      const opts = [e.owner, ...ppl.map(p => p.id).filter(o => o !== e.owner).sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
      let dlg = $('#quizDialog');
      if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'quizDialog'; dlg.className = 'sm-dialog quiz-dialog'; dlg.setAttribute('aria-labelledby', 'quizTitle'); document.body.append(dlg); dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('[data-close]')) dlg.close(); }); }
      const score = S().voice || {};
      const tot = Object.values(score).reduce((n, [r, a]) => [n[0] + r, n[1] + a], [0, 0]);
      dlg.innerHTML = `<header class="dialog-head"><div><p class="cd-k">${esc(t('Kenali suaranya', 'Know their voices'))}</p><h2 id="quizTitle">${esc(t('Siapa yang menulis ini?', 'Who wrote this?'))}</h2></div><button class="close" data-close type="button" aria-label="${esc(t('Tutup', 'Close'))}">×</button></header>
        <div class="quiz-body"><q class="qz-q">${esc(q)}</q><div class="qz-opts">${opts.map(o => `<button type="button" class="qz-o" data-o="${o}" style="--fk:${A.inkOf(o)}">${esc(NAME[o])}</button>`).join('')}</div><p class="qz-res" id="qzRes" aria-live="polite">${tot[1] ? esc(t(`Sejauh ini ${tot[0]} dari ${tot[1]}.`, `So far ${tot[0]} of ${tot[1]}.`)) : ''}</p></div>`;
      if (!dlg.open) dlg.showModal();
      $$('.qz-o', dlg).forEach(b => b.onclick = () => {
        const right = b.dataset.o === e.owner, s = S(); s.voice = s.voice || {}; const v = s.voice[e.owner] || [0, 0]; s.voice[e.owner] = [v[0] + (right ? 1 : 0), v[1] + 1]; save();
        $$('.qz-o', dlg).forEach(x => { x.disabled = true; x.classList.toggle('right', x.dataset.o === e.owner); x.classList.toggle('wrong', x === b && !right); });
        $('#qzRes').innerHTML = `${esc(right ? t('Benar.', 'Right.') : t(`Itu ${NAME[e.owner]}.`, `That was ${NAME[e.owner]}.`))} <a href="#c-${e.id}">${esc(e.title)}, ${esc(A.fmtDate(e.at, true))}</a> <button type="button" class="go sm" id="qzNext">${esc(t('Berikutnya', 'Next'))}</button>`;
        $('#qzNext').onclick = quiz;
        $('#qzRes a').onclick = () => dlg.close();
      });
    }

    function paintAll() { boardPane(); chainPane(); thingsPane(); calendar(); town(); }
    document.addEventListener('simpul:city', paintAll);
    document.addEventListener('simpul:tab', e => { if (e.detail === 'papan') requestAnimationFrame(drawTies); });
  }, { once: true });
})();
