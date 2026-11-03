/* Salasimpul: peta dunia. Satu peta untuk kota, Jalan Raya Sela sepanjang 85 km, dan Kampung Sela.
   Datanya content/salasimpul/_peta.json (disusun dan diperiksa oleh tools/salasimpul.js):
   world (tanah, air, taman, bangunan, jalan dengan namanya, label), regions, kinds, places, homes, journeys.
   - Geser, cubit, gulir, atau + dan − untuk memperbesar. Label muncul sesuai jarak pandang, seperti peta di ponsel.
   - Lapisan: tempat, benang (simpul di atas peta), kesalahpahaman (ironi yang tersimpan di tiap tempat), linimasamu, nama jalan.
   - Mesin waktu: geser tahun 1983–2026, atau putar 43 tahun dalam satu menit.
   - Perjalanan dari teks diputar ulang di jalan-jalannya. Kartu tempat berisi ulasan, jam ramai, dan arah.
   - ?sunting=1: seret penanda, ketuk peta untuk koordinat, unduh _peta.json yang baru.
   Tempat baru muncul setelah kamu membaca catatan yang menyebutnya, atau yang ditulis di sana. */
(() => {
  'use strict';
  document.addEventListener('simpul:ready', () => {
    const A = window.Simpul, { $, $$, t, esc, W, E, BY, NAME, store } = A;
    const P = W.peta; if (!P || !P.world) return;
    const WD = P.world, S = () => A.S, EDIT = new URLSearchParams(location.search).get('sunting') === '1';
    const NS = 'http://www.w3.org/2000/svg';
    const wordRe = m => new RegExp(`(^|[^\\p{L}])(${m})(?![\\p{L}])`, 'iu');
    const SENT = /[^.!?…]+(?:[.!?…]+["”’)]*)?/g;
    const sentences = txt => { const out = []; let m; SENT.lastIndex = 0; while ((m = SENT.exec(txt))) { if (m[0].trim()) out.push(m[0].trim()); if (!m[0].length) SENT.lastIndex++; } return out; };
    const snippet = (e, res) => { for (const p of e.p) for (const s of sentences(A.plainOf(p.t))) if (res.some(r => r.test(s))) return s; return ''; };
    const seeded = k => { let h = 2166136261; for (const c of String(k)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
    const reduced = () => A.reduced();
    const byId = new Map(P.places.map(p => [p.id, p]));
    const placeRes = new Map(P.places.map(pl => [pl.id, pl.match.map(wordRe)]));

    /* ---------- di mana setiap catatan ditulis ---------- */
    const dval = at => at.y + (at.d || 1) / 367;
    const edge = (v, end) => (v == null ? (end ? 1e9 : -1e9) : typeof v === 'number' ? v + (end ? .9999 : 0) : dval(v));
    const homeOf = (o, at) => { for (const h of P.homes[o] || []) { if (typeof h === 'string') return h; const v = dval(at); if (v >= edge(h.from) && v <= edge(h.until, true)) return h.place; } return null; };
    const hitsOf = new Map(); P.places.forEach(pl => pl.notes.forEach(id => (hitsOf.get(id) || hitsOf.set(id, []).get(id)).push(pl.id)));
    const POS = new Map(E.map(e => { const hs = hitsOf.get(e.id) || [], home = homeOf(e.owner, e.at); return [e.id, home && hs.includes(home) ? home : hs[0] || home || null]; }));
    const atPlace = new Map(); POS.forEach((pl, id) => { if (pl) (atPlace.get(pl) || atPlace.set(pl, []).get(pl)).push(id); });
    const exists = (pl, y) => y == null || ((pl.since == null || y >= pl.since) && (pl.until == null || y <= pl.until));
    const noteYearOk = (id, y) => y == null || BY.get(id).at.y <= y;
    const known = pl => S().open || EDIT || pl.notes.some(id => A.isRead(id)) || (atPlace.get(pl.id) || []).some(id => A.isRead(id));

    /* ---------- keadaan peta ---------- */
    let cam = store.get('simpul:cam', null), year = null, pick = null, who = null, arah = null, playing = null;
    let layers = Object.assign({ tempat: true, benang: true, salah: false, linimasa: true, nama: true }, store.get('simpul:layers', {}));
    const saveCam = () => store.set('simpul:cam', cam);

    /* ---------- gambar dasar: tanah, air, taman, bangunan, jalan ---------- */
    const polyOf = d => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number).reduce((a, v, i, arr) => (i % 2 ? a : a.concat([[v, arr[i + 1]]])), []);
    function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
    const bbox = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    function trees(pk, k) {
      const pts = polyOf(pk.d), [x0, y0, x1, y1] = bbox(pts); let out = '', n = 0, tries = 0;
      while (n < pk.trees && tries++ < pk.trees * 40) {
        const x = x0 + 12 + seeded(`${k}x${tries}`) * (x1 - x0 - 24), y = y0 + 12 + seeded(`${k}y${tries}`) * (y1 - y0 - 24);
        if (!inPoly(x, y, pts)) continue;
        const r = (pk.kind === 'hutan' || pk.kind === 'bukit' ? 9 : 7) + seeded(`${k}r${tries}`) * 7;
        out += `<circle class="tree${pk.kind === 'hutan' || pk.kind === 'bukit' ? ' dark' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`; n++;
      }
      return out;
    }
    function graves(pk) {
      const pts = polyOf(pk.d), [x0, y0, x1, y1] = bbox(pts); let out = '';
      for (let y = y0 + 22; y < y1 - 10; y += 22) for (let x = x0 + 18; x < x1 - 12; x += 18) if (inPoly(x, y, pts) && seeded(`${x}:${y}`) > .35) out += `<rect class="grave" x="${x - 3}" y="${y - 4}" width="6" height="8" rx="1.5"/>`;
      return out;
    }
    function base() {
      let s = `<defs><pattern id="field" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><path d="M0 8H16" class="furrow"/></pattern>
        <radialGradient id="heatG"><stop offset="0" class="h0"/><stop offset="1" class="h1"/></radialGradient>
        <radialGradient id="glowG"><stop offset="0" class="g0"/><stop offset="1" class="g1"/></radialGradient></defs>
        <rect class="land" x="-2000" y="-2000" width="${WD.w + 4000}" height="${WD.h + 4000}"/>`;
      WD.parks.forEach((pk, k) => {
        s += `<path class="park ${pk.kind}" d="${pk.d}"/>`;
        if (pk.kind === 'pematang' || pk.kind === 'sawah') s += `<path class="field" d="${pk.d}"/>`;
        if (pk.kind === 'bukit') { const [x0, y0, x1, y1] = bbox(polyOf(pk.d)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; [.72, .45, .2].forEach(f => { s += `<path class="contour" d="${pk.d}" transform="translate(${cx} ${cy}) scale(${f}) translate(${-cx} ${-cy})"/>`; }); }
        if (pk.kind === 'makam') s += graves(pk);
        if (pk.trees) s += trees(pk, k);
      });
      WD.water.forEach(w => { s += w.river ? `<path class="river${w.ditch ? ' ditch' : ''}" d="${w.d}" style="stroke-width:${w.w || 20}px"/>` : `<path class="sea" d="${w.d}"/>`; });
      WD.blocks.forEach(b => {
        s += `<rect class="bld${b[4] ? ' blok' : ''}" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" rx="${b[4] ? 14 : 5}"/>`;
        // rumah-rumah kecil: di blok komplek berjajar, di kota bergerombol
        const step = b[4] ? 30 : 26;
        for (let yy = b[1] + 10; yy < b[1] + b[3] - 16; yy += step) for (let xx = b[0] + 10; xx < b[0] + b[2] - 18; xx += step) if (b[4] || seeded(`${xx}h${yy}`) > .3) s += `<rect class="house" x="${xx}" y="${yy}" width="${step - 9}" height="${step - 11}" rx="2"/>`;
        if (b[4]) s += `<text class="blok-l" x="${b[0] + b[2] / 2}" y="${b[1] + b[3] / 2}" dy=".35em">${esc(b[4])}</text>`;
      });
      WD.roads.forEach((r, k) => { s += `<path class="road-c${r.major ? ' major' : ''}${r.lane ? ' lane' : ''}" d="${r.d}"/>`; });
      WD.roads.forEach((r, k) => { s += `<path id="rd-${k}" class="road${r.major ? ' major' : ''}${r.lane ? ' lane' : ''}" d="${r.d}"/>`; });
      (WD.bridges || []).forEach(([x, y]) => { s += `<rect class="bridge" x="${x - 34}" y="${y - 12}" width="68" height="24" rx="4"/>`; });
      // jalan bisa diketuk: garis tak terlihat yang lebih lebar
      WD.roads.forEach((r, k) => { if (r.name) s += `<path class="road-hit" data-road="${k}" d="${r.d}"/>`; });
      return s;
    }
    function labelsSVG() {
      let s = '';
      WD.roads.forEach((r, k) => { if (r.name) s += `<text class="road-n${r.major ? ' major' : ''}${r.lane ? ' lane' : ''}"><textPath href="#rd-${k}" startOffset="${r.lane ? '50%' : r.major ? '40%' : '55%'}" text-anchor="middle">${esc(r.name)}</textPath></text>`; });
      WD.labels.forEach(l => { s += `<text class="lab ${l.size}" x="${l.x}" y="${l.y}">${esc(l.text)}</text>`; });
      (WD.marks || []).forEach(m => { s += m.break ? `<text class="km brk" x="${m.x}" y="${m.y}" dy=".35em">${esc(m.text)}</text>` : `<g class="km" transform="translate(${m.x} ${m.y})"><g class="pin-s"><rect x="-22" y="-28" width="44" height="18" rx="4"/><text y="-15">${esc(m.text)}</text></g></g>`; });
      WD.water.forEach(w => { if (w.name && w.river && !w.ditch) { const pts = polyOf(w.d), [x, y] = pts[Math.floor(pts.length / 2)]; s += `<text class="lab water" x="${x + 26}" y="${y}">${esc(w.name)}</text>`; } });
      return s;
    }

    /* ---------- lapisan ---------- */
    const xy = id => { const pl = byId.get(id); return pl ? [pl.x, pl.y] : null; };
    function pinsSVG() {
      if (!layers.tempat && !EDIT) return '';
      const whoSet = who ? new Set(P.places.filter(pl => pl.notes.some(id => BY.get(id).owner === who) || (atPlace.get(pl.id) || []).some(id => BY.get(id).owner === who)).map(pl => pl.id)) : null;
      let s = '';
      if (who) {
        const firstAt = pl => Math.min(...[...pl.notes, ...(atPlace.get(pl.id) || [])].filter(id => BY.get(id).owner === who).map(id => E.indexOf(BY.get(id))));
        const route = P.places.filter(pl => whoSet.has(pl.id) && known(pl)).sort((a, b) => firstAt(a) - firstAt(b));
        if (route.length > 1) s += `<path class="trail" style="stroke:${A.inkOf(who)}" d="${route.map((pl, i) => `${i ? 'L' : 'M'}${pl.x} ${pl.y}`).join('')}"/>`;
      }
      P.places.forEach(pl => {
        if (!exists(pl, year)) return;
        const k = P.kinds[pl.kind], dim = whoSet && !whoSet.has(pl.id);
        if (!known(pl)) { s += `<g class="pin unk${dim ? ' dim' : ''}" transform="translate(${pl.x} ${pl.y})" aria-hidden="true"><g class="pin-s"><circle r="6"/></g></g>`; return; }
        const n = [...new Set([...pl.notes, ...(atPlace.get(pl.id) || [])])].filter(id => noteYearOk(id, year)).length;
        s += `<g class="pin${dim ? ' dim' : ''}${pick === pl.id ? ' on' : ''}" data-place="${pl.id}" transform="translate(${pl.x} ${pl.y})" role="button" tabindex="0" aria-label="${esc(pl.name)}" style="--k:${k.color}"><g class="pin-s"><path class="drop" d="M0 0C-5 -9 -13 -14 -13 -23A13 13 0 1 1 13 -23C13 -14 5 -9 0 0Z"/><circle class="eye" cy="-23" r="5"/>${n > 1 ? `<g class="cnt"><circle cx="11" cy="-34" r="7.5"/><text x="11" y="-31">${n > 99 ? '99' : n}</text></g>` : ''}<text class="pin-l" y="17">${esc(pl.name)}</text></g></g>`;
      });
      // kamu di sini
      const here = S().last && POS.get(S().last);
      if (here && xy(here)) { const [x, y] = xy(here); s += `<g class="here" transform="translate(${x} ${y})"><g class="pin-s"><circle class="ring" r="15"/><circle class="dot" r="7"/></g></g>`; }
      return s;
    }
    function threadsSVG() {
      if (!layers.benang) return '';
      const agg = new Map();
      E.forEach(e => A.linksTo.get(e.id).forEach(l => {
        const a = POS.get(e.id), b = POS.get(l.id); if (!a || !b || a === b) return;
        if (!(S().open || (A.isRead(e.id) && A.isRead(l.id)))) return;
        if (!noteYearOk(e.id, year) || !noteYearOk(l.id, year)) return;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`; const g = agg.get(k) || { a, b, n: 0, o: e.owner }; g.n++; agg.set(k, g);
      }));
      return [...agg.values()].map(g => { const [x1, y1] = xy(g.a), [x2, y2] = xy(g.b), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), cx = (x1 + x2) / 2 - dy * .22, cy = (y1 + y2) / 2 + dx * .22 - len * .08; return `<path class="arc" d="M${x1} ${y1}Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x2} ${y2}" style="stroke:${A.inkOf(g.o)};stroke-width:${(1.6 + Math.min(5, g.n) * .9).toFixed(1)}px"/>`; }).join('');
    }
    // kesalahpahaman: kalimat yang berubah makna, di tempat ia ditulis
    function heatSVG() {
      if (!layers.salah) return '';
      const w = new Map();
      E.forEach(e => { if (!A.isRead(e.id) && !S().open) return; if (!noteYearOk(e.id, year)) return; const pl = POS.get(e.id); if (!pl) return; e.p.forEach(p => p.a.forEach(a => { if (a.irony) w.set(pl, (w.get(pl) || 0) + (a.irony.some(g => g.every(A.knows)) ? 2 : .6)); })); });
      return [...w.entries()].map(([pl, n]) => { const [x, y] = xy(pl); return `<circle class="heat" cx="${x}" cy="${y}" r="${(70 + Math.sqrt(n) * 38).toFixed(0)}" style="opacity:${Math.min(.95, .35 + n / 30).toFixed(2)}"/>`; }).join('');
    }
    function trailSVG() {
      if (!layers.linimasa) return '';
      const ids = Object.entries(S().read).sort((a, b) => a[1] - b[1]).map(([id]) => id).slice(-24);
      let pts = []; ids.forEach(id => { const p = POS.get(id); if (p && pts[pts.length - 1] !== p) pts.push(p); }); pts = pts.slice(-12);
      if (pts.length < 2) return '';
      return `<path class="mytrail" d="${pts.map((p, i) => { const [x, y] = xy(p); return `${i ? 'L' : 'M'}${x} ${y}`; }).join('')}"/>`;
    }
    function paintLayers() {
      const svg = $('#mapSvg'); if (!svg) return;
      $('#wmHeat').innerHTML = heatSVG(); $('#wmThreads').innerHTML = threadsSVG(); $('#wmTrail').innerHTML = trailSVG(); $('#mapPins').innerHTML = pinsSVG();
      svg.classList.toggle('no-names', !layers.nama);
      const all = P.places.filter(pl => exists(pl, year)), kn = all.filter(known).length;
      $('#wmCount').innerHTML = `<b>${kn}</b>/${all.length} ${esc(t('tempat kamu kenal', 'places you know'))}`;
    }

    /* ---------- kamera ---------- */
    const svgSize = () => { const svg = $('#mapSvg'); return [svg.clientWidth || 360, svg.clientHeight || 400]; };
    function fit(box, pad = .06) { const [w, h] = svgSize(), [bx, by, bw, bh] = box, k = Math.min(w / (bw * (1 + pad)), h / (bh * (1 + pad))); return { x: bx + bw / 2 - w / (2 * k), y: by + bh / 2 - h / (2 * k), k }; }
    const minK = () => fit(P.regions.semua.box, .02).k * .8, maxK = 6;
    function apply() {
      const svg = $('#mapSvg'); if (!svg || !cam) return;
      const [w, h] = svgSize();
      svg.setAttribute('viewBox', `${cam.x.toFixed(1)} ${cam.y.toFixed(1)} ${(w / cam.k).toFixed(1)} ${(h / cam.k).toFixed(1)}`);
      svg.style.setProperty('--u', (1 / cam.k).toFixed(4));
      const z = cam.k < .17 ? 0 : cam.k < .7 ? 1 : 2;
      svg.classList.toggle('z0', z === 0); svg.classList.toggle('z1', z === 1); svg.classList.toggle('z2', z === 2);
      // skala: berapa meter seratus piksel
      const m = 100 / cam.k * 3.3, nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(v => v >= m * .6) || 5000, px = nice / 3.3 * cam.k;
      const sc = $('#wmScale'); if (sc) { sc.innerHTML = `<i style="width:${px.toFixed(0)}px"></i><span>${nice >= 1000 ? nice / 1000 + ' km' : nice + ' m'}</span>`; sc.hidden = z === 0; }
    }
    let flyRaf = 0;
    function fly(to, ms = 650) {
      cancelAnimationFrame(flyRaf);
      if (!cam || reduced() || ms === 0) { cam = to; apply(); saveCam(); return; }
      const from = { ...cam }, t0 = performance.now(), ease = x => 1 - Math.pow(1 - x, 3);
      const step = now => { const f = Math.min(1, (now - t0) / ms), e = ease(f), lk = Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * e; cam = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: Math.exp(lk) }; apply(); if (f < 1) flyRaf = requestAnimationFrame(step); else saveCam(); };
      flyRaf = requestAnimationFrame(step);
    }
    function zoomAt(px, py, f) {
      const k = Math.max(minK(), Math.min(maxK, cam.k * f)), wx = cam.x + px / cam.k, wy = cam.y + py / cam.k;
      cam = { x: wx - px / k, y: wy - py / k, k }; apply();
    }
    const flyTo = (x, y, k) => { const [w, h] = svgSize(); k = Math.max(minK(), Math.min(maxK, k)); fly({ x: x - w / (2 * k), y: y - h / (2 * k), k }); };
    const toWorld = (cx, cy) => { const r = $('#mapSvg').getBoundingClientRect(); return [cam.x + (cx - r.left) / cam.k, cam.y + (cy - r.top) / cam.k]; };

    // geser, cubit, gulir
    const ptr = new Map(); let gest = null, dragged = false, dragPin = null;
    document.addEventListener('pointerdown', e => {
      const svg = e.target.closest && e.target.closest('#mapSvg'); if (!svg) return;
      if (EDIT && e.target.closest('.pin[data-place]')) { dragPin = { id: e.target.closest('.pin').dataset.place, x: e.clientX, y: e.clientY }; dragged = false; e.preventDefault(); return; }
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragged = false;
      gest = { cam: { ...cam }, pts: new Map([...ptr].map(([k, v]) => [k, { ...v }])) };
      cancelAnimationFrame(flyRaf);
    });
    document.addEventListener('pointermove', e => {
      if (dragPin) { if (Math.abs(e.clientX - dragPin.x) + Math.abs(e.clientY - dragPin.y) > 3) dragged = true; const [x, y] = toWorld(e.clientX, e.clientY), pl = byId.get(dragPin.id); pl.x = Math.round(x); pl.y = Math.round(y); paintLayers(); editInfo(pl.x, pl.y, pl.name); return; }
      if (!ptr.has(e.pointerId) || !gest) return;
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = $('#mapSvg').getBoundingClientRect(), now = [...ptr.values()], was = [...gest.pts.values()];
      if (now.length === 1 && was.length >= 1) {
        const dx = now[0].x - was[0].x, dy = now[0].y - was[0].y;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
        cam = { x: gest.cam.x - dx / gest.cam.k, y: gest.cam.y - dy / gest.cam.k, k: gest.cam.k }; apply();
      } else if (now.length >= 2 && was.length >= 2) {
        dragged = true;
        const d0 = Math.hypot(was[0].x - was[1].x, was[0].y - was[1].y), d1 = Math.hypot(now[0].x - now[1].x, now[0].y - now[1].y);
        const m0 = [(was[0].x + was[1].x) / 2 - r.left, (was[0].y + was[1].y) / 2 - r.top], m1 = [(now[0].x + now[1].x) / 2 - r.left, (now[0].y + now[1].y) / 2 - r.top];
        const k = Math.max(minK(), Math.min(maxK, gest.cam.k * d1 / Math.max(1, d0))), wx = gest.cam.x + m0[0] / gest.cam.k, wy = gest.cam.y + m0[1] / gest.cam.k;
        cam = { x: wx - m1[0] / k, y: wy - m1[1] / k, k }; apply();
      }
    }, { passive: true });
    const end = e => {
      if (dragPin) { const id = dragPin.id; dragPin = null; if (!dragged) pickPlace(id); return; }
      if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
      gest = ptr.size ? { cam: { ...cam }, pts: new Map([...ptr].map(([k, v]) => [k, { ...v }])) } : null;
      if (!ptr.size) saveCam();
    };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    document.addEventListener('wheel', e => { const svg = e.target.closest && e.target.closest('#mapSvg'); if (!svg) return; e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0016)); clearTimeout(wheelT); wheelT = setTimeout(saveCam, 300); }, { passive: false });
    let wheelT = 0;
    addEventListener('resize', () => requestAnimationFrame(apply));

    /* ---------- kartu tempat: ulasan, jam ramai, buka dan tutup, arah ---------- */
    const notesOf = pl => [...new Set([...pl.notes, ...(atPlace.get(pl.id) || [])])].map(id => BY.get(id)).sort((a, b) => E.indexOf(a) - E.indexOf(b));
    function busyHTML(list) {
      const c = new Array(24).fill(0); list.forEach(e => { if (e.at.h != null) c[e.at.h]++; });
      const max = Math.max(1, ...c), top = c.indexOf(Math.max(...c));
      if (!list.some(e => e.at.h != null)) return '';
      return `<p class="f-k">${esc(t('Jam ramai', 'Popular times'))}</p><div class="busy" aria-label="${esc(t(`Paling sering ditulis pukul ${A.hh(top)}`, `Most often written at ${A.hh(top)}`))}">${c.map((n, h) => `<i class="${h === top ? 'top' : ''}" style="height:${(8 + n / max * 92).toFixed(0)}%" title="${A.hh(h)}: ${n}"></i>`).join('')}</div><p class="busy-x"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></p><p class="busy-t">${esc(t(`Paling ramai pukul ${A.hh(top)}`, `Busiest at ${A.hh(top)}`))}${top >= 19 || top < 4 ? esc(t(' · biasanya ditulis malam hari', ' · usually written at night')) : ''}</p>`;
    }
    function cardHTML(id) {
      const pl = byId.get(id); if (!pl) return '';
      const k = P.kinds[pl.kind], res = placeRes.get(pl.id), list = notesOf(pl).filter(e => noteYearOk(e.id, year)), owners = [...new Set(list.map(e => e.owner))];
      const metO = owners.filter(o => A.met(o));
      const reviews = list.map(e => {
        const st = A.state(e), read = A.isRead(e.id), q = read ? (snippet(e, res) || A.firstLine(e)) : '', nm = st.open ? NAME[e.owner] : t('Seseorang', 'Someone');
        return `<a class="rv ${read ? 'read' : st.open ? 'open' : 'shut'}" href="#c-${e.id}" style="--fk:${A.inkOf(e.owner)}"><span class="rv-av" aria-hidden="true">${esc(nm[0])}</span><span class="rv-b"><small><b>${esc(nm)}</b> · ${esc(A.fmtDate(e.at, true))}${e.at.h != null ? ' · ' + A.hh(e.at.h) : ''}</small>${q ? `<q>${esc(q)}</q>` : `<span>${esc(st.open ? t('Belum kamu baca', 'Not read yet') : t('Belum kamu kenal', 'Not known yet'))}</span>`}</span></a>`;
      }).join('');
      const hours = [pl.open || (pl.since ? t(`Ada sejak ${pl.since}`, `Since ${pl.since}`) : ''), pl.close || (pl.until ? t(`Sampai ${pl.until}`, `Until ${pl.until}`) : '')].filter(Boolean);
      const dests = P.places.filter(x => x.id !== id && known(x) && exists(x, year));
      return `<div class="mc" style="--k:${k.color}"><button type="button" class="close" data-mc-close aria-label="${esc(t('Tutup', 'Close'))}">×</button><p class="mc-k"><i></i>${esc(k.name)}</p><h3>${esc(pl.name)}</h3>${pl.sub ? `<p class="mc-sub">${esc(pl.sub)}</p>` : ''}
        ${hours.length ? `<p class="mc-open">${hours.map(esc).join(' · ')}</p>` : ''}
        <p class="mc-n"><b>${list.length}</b> ${esc(t('ulasan', 'reviews'))} · <b>${owners.length}</b> ${esc(t('orang', 'people'))}${metO.length ? ' · ' + esc(metO.map(o => NAME[o]).join(', ')) : ''}</p>
        <div class="mc-act"><label class="mc-arah"><span>${esc(t('Arah ke', 'Directions to'))}</span><select data-arah="${id}"><option value="">…</option>${dests.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label></div><p class="mc-route" id="mcRoute" hidden></p>
        ${busyHTML(list)}<p class="f-k">${esc(t('Ulasan', 'Reviews'))}</p><div class="mc-rows">${reviews || `<p class="k-empty">${esc(t('Belum ada catatan di tahun ini.', 'No notes by this year.'))}</p>`}</div></div>`;
    }
    function pickPlace(id, center = true) {
      pick = id; arah = null; $('#wmArah').innerHTML = '';
      $$('#mapPins .pin').forEach(g => g.classList.toggle('on', g.dataset.place === id));
      const card = $('#mapCard'); card.innerHTML = cardHTML(id); card.hidden = false; card.scrollTop = 0;
      const pl = byId.get(id); if (center && pl) flyTo(pl.x + (innerWidth >= 900 ? 120 / cam.k : 0), pl.y + (innerWidth < 900 ? 110 / cam.k : 0), Math.max(cam.k, 1.1));
    }
    // arah: garis lurus di dalam wilayah, lewat Jalan Raya Sela kalau berbeda wilayah
    const EXIT = { kota: [1800, 409], sela: [2550, 580] };
    function directions(a, b) {
      const A1 = byId.get(a), B1 = byId.get(b), mpu = 3.3;
      let pts, m;
      if (A1.area === B1.area || A1.area === 'jalan' || B1.area === 'jalan') { pts = [[A1.x, A1.y], [B1.x, B1.y]]; m = Math.hypot(A1.x - B1.x, A1.y - B1.y) * mpu * 1.3; }
      else { const ea = EXIT[A1.area], eb = EXIT[B1.area]; pts = [[A1.x, A1.y], ea, [2180, 500], eb, [B1.x, B1.y]]; m = (Math.hypot(A1.x - ea[0], A1.y - ea[1]) + Math.hypot(B1.x - eb[0], B1.y - eb[1])) * mpu * 1.3 + 85000; }
      const km = m / 1000, walk = km / 4.5 * 60, motor = km / 30 * 60;
      const dur = min => (min < 60 ? `${Math.max(1, Math.round(min))} ${t('menit', 'min')}` : `${Math.floor(min / 60)} ${t('jam', 'h')}${Math.round(min % 60) ? ' ' + Math.round(min % 60) + ' ' + t('menit', 'min') : ''}`);
      const cross = pts.length > 2, bus = cross && A.isRead('r1988');
      return { pts, text: `${km < 1 ? Math.round(m) + ' m' : km.toFixed(km < 10 ? 1 : 0).replace('.', ',') + ' km'} · ${cross ? dur(motor * 1.2) + ' ' + t('naik mobil', 'by car') : dur(walk) + ' ' + t('jalan kaki', 'on foot') + ' · ' + dur(motor) + ' ' + t('naik motor', 'by motorbike')}${bus ? ' · ' + t('Bu Rasmi menempuhnya delapan jam naik bus.', 'Bu Rasmi took eight hours by bus.') : ''}` };
    }
    // kartu jalan: tempat-tempat di sepanjangnya dan siapa yang lewat
    function roadCard(k) {
      const r = WD.roads[k], el = $(`#rd-${k}`); if (!r || !el) return;
      const len = el.getTotalLength(), pts = []; for (let d = 0; d <= len; d += 24) { const p = el.getPointAtLength(d); pts.push([p.x, p.y]); }
      const near = P.places.filter(pl => known(pl) && exists(pl, year) && pts.some(([x, y]) => Math.hypot(x - pl.x, y - pl.y) < 80));
      const list = [...new Set(near.flatMap(pl => notesOf(pl).map(e => e.id)))].map(id => BY.get(id)).filter(e => noteYearOk(e.id, year)).sort((a, b) => E.indexOf(a) - E.indexOf(b));
      const card = $('#mapCard');
      card.innerHTML = `<div class="mc" style="--k:#5B5F66"><button type="button" class="close" data-mc-close aria-label="${esc(t('Tutup', 'Close'))}">×</button><p class="mc-k"><i></i>${esc(r.major ? t('Jalan besar', 'Main road') : r.lane ? t('Gang', 'Lane') : t('Jalan', 'Street'))}${r.rekaan ? ' · ' + esc(t('nama rekaan', 'invented name')) : ''}</p><h3>${esc(r.name)}</h3>${r.km ? `<p class="mc-sub">${esc(t(`${r.km} kilometer di antara kota dan Kampung Sela`, `${r.km} kilometres between the town and Kampung Sela`))}</p>` : ''}
        <p class="mc-n">${esc(near.length ? t(`Di sepanjangnya: ${near.map(pl => pl.name).join(', ')}.`, `Along it: ${near.map(pl => pl.name).join(', ')}.`) : t('Belum ada tempat yang kamu kenal di sepanjang jalan ini.', 'No place you know along this road yet.'))}</p>
        ${list.length ? `<p class="f-k">${esc(t('Yang pernah lewat', 'Who passed here'))}</p><ol class="rd-time">${list.map(e => { const st = A.state(e); return `<li style="--fk:${A.inkOf(e.owner)}"><a href="#c-${e.id}"><b>${e.at.y}</b><span>${esc(st.open ? NAME[e.owner] : t('seseorang', 'someone'))}${st.open ? ' · ' + esc(e.title) : ''}</span></a></li>`; }).join('')}</ol>` : ''}</div>`;
      card.hidden = false; card.scrollTop = 0; pick = null; $$('#mapPins .pin.on').forEach(g => g.classList.remove('on'));
      $$('#mapSvg .road-hit.on').forEach(x => x.classList.remove('on')); $(`#mapSvg .road-hit[data-road="${k}"]`)?.classList.add('on');
    }

    /* ---------- perjalanan dari teks ---------- */
    const jKnown = j => S().open || A.isRead(j.note);
    function smooth(pts) {
      if (pts.length < 3) return `M${pts.map(p => p.join(' ')).join('L')}`;
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(0)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(0)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(0)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(0)} ${p2[0]} ${p2[1]}`; }
      return d;
    }
    let jRaf = 0;
    function journey(id) {
      const j = P.journeys.find(x => x.id === id); if (!j) return;
      stopPlay(); cancelAnimationFrame(jRaf);
      const pts = j.path.map(w => (typeof w === 'string' ? xy(w) : w)).filter(Boolean), d = smooth(pts), e = BY.get(j.note);
      const host = $('#wmJourney'); host.innerHTML = `<path class="j-path" id="jPath" d="${d}" style="stroke:${A.inkOf(j.who)}"/><g class="j-dot" id="jDot"><g class="pin-s"><circle r="10" style="fill:${A.inkOf(j.who)}"/><circle r="4" class="eye"/></g></g>`;
      $('#mapSvg').classList.toggle('night', !!j.night);
      const [x0, y0, x1, y1] = bbox(pts); fly(fit([x0, y0, x1 - x0 || 1, y1 - y0 || 1], .35));
      const quote = j.quote ? snippet(e, [wordRe(j.quote)]) : '';
      const cap = $('#wmCap');
      cap.innerHTML = `<button type="button" class="close" data-cap-close aria-label="${esc(t('Tutup', 'Close'))}">×</button><p class="mc-k" style="--k:${A.inkOf(j.who)}"><i></i>${esc(NAME[j.who])} · ${esc(A.fmtDate(e.at))}</p><h3>${esc(j.name)}</h3><p class="j-meta">${[j.mode, j.km ? j.km + ' km' : '', j.duration || ''].filter(Boolean).map(esc).join(' · ')}</p>${quote ? `<q>${esc(quote)}</q>` : ''}<a class="go sm" href="#c-${e.id}">${esc(t('Baca catatannya', 'Read the note'))}</a>`;
      cap.hidden = false;
      const path = $('#jPath'), len = path.getTotalLength(), dot = $('#jDot'), ms = reduced() ? 0 : Math.min(7000, 2200 + len * 1.2), t0 = performance.now() + (reduced() ? 0 : 500);
      path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len}`;
      const step = now => { const f = ms ? Math.max(0, Math.min(1, (now - t0) / ms)) : 1, p = path.getPointAtLength(len * f); path.style.strokeDashoffset = `${len * (1 - f)}`; dot.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); if (f < 1) jRaf = requestAnimationFrame(step); };
      jRaf = requestAnimationFrame(step);
      $$('#wmJourneys [data-journey]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.journey === id)));
    }
    function clearJourney() { cancelAnimationFrame(jRaf); $('#wmJourney').innerHTML = ''; $('#wmCap').hidden = true; $('#mapSvg').classList.remove('night'); $$('#wmJourneys [data-journey]').forEach(b => b.setAttribute('aria-pressed', 'false')); }

    /* ---------- mesin waktu: 43 tahun dalam satu menit ---------- */
    const Y0 = E[0].at.y, Y1 = E[E.length - 1].at.y;
    function setYear(y) {
      year = y; const r = $('#wmYear'); if (r) r.value = y == null ? Y0 - 1 : y;
      $('#wmYearL').textContent = y == null ? t('Semua', 'All') : y;
      $('#wmBig').textContent = y == null ? '' : y; $('#wmBig').hidden = y == null;
      paintLayers(); if (pick) { const c = $('#mapCard'); c.innerHTML = cardHTML(pick); }
    }
    function shade(h) { const o = h == null ? 0 : h >= 19 || h < 4 ? .38 : h < 7 ? .2 : h >= 17 ? .14 : 0; $('#wmShade').style.opacity = o; }
    function stopPlay(keep) {
      if (!playing) return; clearTimeout(playing.timer); playing = null;
      $('#wmPlay').textContent = t('▶ Putar 43 tahun', '▶ Play 43 years'); $('#wmPlay').setAttribute('aria-pressed', 'false');
      $('#wmFx').innerHTML = ''; shade(null); $('#wmCap').hidden = true; if (!keep) setYear(null);
    }
    function play() {
      if (playing) { stopPlay(); return; }
      clearJourney(); pick = null; $('#mapCard').hidden = true;
      fly(fit(P.regions.semua.box, .02));
      playing = { i: 0, timer: 0 }; $('#wmPlay').textContent = t('■ Berhenti', '■ Stop'); $('#wmPlay').setAttribute('aria-pressed', 'true');
      const fx = $('#wmFx'); fx.innerHTML = '<g id="fxArcs"></g><g id="fxGlow"></g>';
      const cap = $('#wmCap'); cap.hidden = false;
      const gap = reduced() ? 60 : 300;
      const tick = () => {
        if (!playing) return;
        const e = E[playing.i++]; if (!e) { stopPlay(true); setYear(null); return; }
        if (year !== e.at.y) setYear(e.at.y);
        shade(e.at.h);
        const pl = POS.get(e.id), st = A.state(e), mine = A.isRead(e.id);
        if (pl) {
          const [x, y] = xy(pl);
          const g = document.createElementNS(NS, 'circle'); g.setAttribute('class', `glow${mine ? ' mine' : st.open ? '' : ' shut'}`); g.setAttribute('cx', x); g.setAttribute('cy', y); g.setAttribute('r', 40); $('#fxGlow').append(g);
          setTimeout(() => g.classList.add('out'), 30); setTimeout(() => g.remove(), 2600);
          A.linksTo.get(e.id).forEach(l => { const b = POS.get(l.id); if (!b || b === pl) return; const [x2, y2] = xy(b), dx = x2 - x, dy = y2 - y, len = Math.hypot(dx, dy); const a = document.createElementNS(NS, 'path'); a.setAttribute('class', 'fx-arc'); a.setAttribute('d', `M${x} ${y}Q${((x + x2) / 2 - dy * .22).toFixed(0)} ${((y + y2) / 2 + dx * .22 - len * .08).toFixed(0)} ${x2} ${y2}`); a.style.stroke = A.inkOf(e.owner); $('#fxArcs').append(a); });
        }
        cap.innerHTML = `<p class="cap-y"><b>${e.at.y}</b>${e.at.h != null ? `<span>${A.hh(e.at.h)}</span>` : ''}</p><p class="cap-w" style="--fk:${A.inkOf(e.owner)}">${esc(st.open ? NAME[e.owner] : t('Seseorang', 'Someone'))}${st.open ? ` · <span>${esc(e.title)}</span>` : ''}</p><p class="cap-n">${playing.i}/${E.length}</p>`;
        playing.timer = setTimeout(tick, gap);
      };
      tick();
    }

    /* ---------- mode sunting ---------- */
    let editAt = null, added = [];
    function editInfo(x, y, name) { const b = $('#wmEdit'); if (!b) return; editAt = [x, y]; $('#edXY').textContent = `${name ? name + ': ' : ''}x ${x} · y ${y}`; }
    async function exportJSON() {
      let raw = null; try { raw = await (await fetch('../../content/salasimpul/_peta.json', { cache: 'no-cache' })).json(); } catch (e) { /* luring */ }
      if (!raw) { alert(t('Berkas _peta.json tidak bisa dimuat.', 'Could not load _peta.json.')); return; }
      raw.places.forEach(pl => { const cur = byId.get(pl.id); if (cur) { pl.x = cur.x; pl.y = cur.y; } });
      raw.places.push(...added);
      const blob = new Blob([JSON.stringify(raw, null, 1) + '\n'], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = '_peta.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    /* ---------- panel ---------- */
    function pane() {
      const host = $('#paneMap'); if (!host) return;
      const ppl = A.laneOrder.filter(p => A.met(p.id)), js = P.journeys.filter(jKnown);
      host.innerHTML = `<div class="map-bar"><div class="seg" role="group" aria-label="${esc(t('Wilayah', 'Area'))}">${Object.entries(P.regions).map(([k, v]) => `<button type="button" data-region="${k}">${esc(v.name)}</button>`).join('')}</div>
          <span class="map-n" id="wmCount"></span>
          <label class="map-who"><span>${esc(t('Jejak', 'Trail'))}</span><select id="mapWho"><option value="">${esc(t('semua orang', 'everyone'))}</option>${ppl.map(p => `<option value="${p.id}"${who === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div>
        ${EDIT ? `<div class="wm-edit" id="wmEdit"><b>${esc(t('Mode sunting peta', 'Map editing mode'))}</b><span>${esc(t('Seret penanda untuk memindahkannya. Ketuk peta untuk melihat koordinatnya.', 'Drag a pin to move it. Tap the map to see coordinates.'))}</span><code id="edXY">x · y</code><button type="button" class="ghost sm" id="edAdd">${esc(t('＋ Tempat di sini', '＋ Place here'))}</button><button type="button" class="go sm" id="edSave">${esc(t('Unduh _peta.json', 'Download _peta.json'))}</button></div>` : ''}
        <div class="wm-wrap" id="wmWrap">
          <svg class="wm map" id="mapSvg" role="group" aria-label="${esc(t('Peta Salasimpul: kota, Jalan Raya Sela, dan Kampung Sela', 'Map of Salasimpul: the town, the Sela road and Kampung Sela'))}">
            <g id="wmBase">${base()}</g><g id="wmHeat"></g><g id="wmThreads"></g><g id="wmTrail"></g><g id="wmJourney"></g><g id="wmLabels">${labelsSVG()}</g><g id="mapPins"></g><g id="wmFx"></g>
          </svg>
          <div class="wm-shade" id="wmShade" aria-hidden="true"></div>
          <p class="wm-big" id="wmBig" hidden aria-hidden="true"></p>
          <div class="wm-ctrl"><button type="button" data-mz="1" aria-label="${esc(t('Perbesar', 'Zoom in'))}">+</button><button type="button" data-mz="-1" aria-label="${esc(t('Perkecil', 'Zoom out'))}">−</button><button type="button" id="wmHere" aria-label="${esc(t('Kamu di sini', 'You are here'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button><button type="button" id="wmLayersB" aria-expanded="false" aria-controls="wmLayers" aria-label="${esc(t('Lapisan', 'Layers'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg></button></div>
          <div class="wm-layers" id="wmLayers" hidden>${[['tempat', t('Tempat', 'Places')], ['benang', t('Benang di atas kota', 'Threads over the town')], ['salah', t('Kesalahpahaman', 'Misunderstandings')], ['linimasa', t('Linimasamu', 'Your timeline')], ['nama', t('Nama jalan', 'Street names')]].map(([k, v]) => `<label><input type="checkbox" data-layer="${k}"${layers[k] ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>
          <div class="wm-scale" id="wmScale"></div>
          <div class="wm-arah" id="wmArah" aria-hidden="true"></div>
          <div class="map-card" id="mapCard" hidden></div>
          <div class="wm-cap" id="wmCap" hidden aria-live="polite"></div>
        </div>
        <div class="wm-time"><button type="button" class="go sm" id="wmPlay" aria-pressed="false">${esc(t('▶ Putar 43 tahun', '▶ Play 43 years'))}</button><input type="range" id="wmYear" min="${Y0 - 1}" max="${Y1}" step="1" value="${year == null ? Y0 - 1 : year}" aria-label="${esc(t('Tahun', 'Year'))}"><b id="wmYearL">${year == null ? esc(t('Semua', 'All')) : year}</b></div>
        <div class="wm-js" id="wmJourneys"><p class="f-k">${esc(t('Perjalanan', 'Journeys'))}</p>${js.length ? js.map(j => `<button type="button" data-journey="${j.id}" aria-pressed="false" style="--fk:${A.inkOf(j.who)}"><b>${esc(NAME[j.who])}</b><span>${esc(j.name)}</span></button>`).join('') : `<span class="k-empty">${esc(t('Perjalanan-perjalanan muncul di sini setelah kamu membaca catatannya.', 'Journeys appear here once you have read their notes.'))}</span>`}${P.journeys.length > js.length ? `<small class="wm-more">${esc(t(`${P.journeys.length - js.length} perjalanan lagi menunggu di catatan yang belum kamu baca`, `${P.journeys.length - js.length} more journeys wait in notes you have not read`))}</small>` : ''}</div>
        <div class="map-legend">${Object.entries(P.kinds).map(([k, v]) => `<span><i style="--k:${v.color}"></i>${esc(v.name)}</span>`).join('')}<span><i class="lg-park"></i>${esc(t('Pohon, taman, hutan', 'Trees, parks, woods'))}</span><span><i class="lg-field"></i>${esc(t('Sawah & pematang', 'Fields'))}</span><span><i class="lg-water"></i>${esc(t('Kali, sungai, laut', 'River & sea'))}</span><span><i class="lg-major"></i>${esc(t('Jalan besar', 'Main road'))}</span><span><i class="lg-here"></i>${esc(t('Kamu di sini', 'You are here'))}</span><span><i class="lg-trail"></i>${esc(t('Linimasamu', 'Your timeline'))}</span><span><i class="lg-heat"></i>${esc(t('Kesalahpahaman', 'Misunderstandings'))}</span><span><i class="lg-unk"></i>${esc(t('Belum kamu kenal', 'Not known yet'))}</span></div>
        <p class="wm-note">${esc(t('Nama-nama jalan yang tidak disebut di catatan adalah rekaan. Jarak ke Kampung Sela diringkas; menurut catatan, 85 km.', 'Street names not mentioned in the notes are invented. The road to Kampung Sela is shortened; the notes say 85 km.'))}</p>`;
      if (!cam) cam = fit(P.regions[S().last && BY.get(S().last) && byId.get(POS.get(S().last))?.area === 'sela' ? 'sela' : 'kota'].box);
      apply(); paintLayers();
      if (pick && byId.has(pick)) pickPlace(pick, false);
      if (EDIT) { $('#edAdd').onclick = () => { if (!editAt) return; const name = prompt(t('Nama tempat', 'Place name')); if (!name) return; const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); const pl = { id, area: editAt[0] > 2540 ? 'sela' : editAt[0] > 1800 ? 'jalan' : 'kota', x: editAt[0], y: editAt[1], name, kind: Object.keys(P.kinds)[0], match: [name.toLowerCase()], notes: [] }; added.push({ ...pl, notes: undefined }); P.places.push(pl); byId.set(id, pl); placeRes.set(id, [wordRe(name)]); paintLayers(); }; $('#edSave').onclick = exportJSON; }
    }

    /* ---------- tombol dan ketukan ---------- */
    document.addEventListener('click', e => {
      if (!e.target.closest || !e.target.closest('#paneMap')) return;
      const reg = e.target.closest('[data-region]'); if (reg) { clearJourney(); fly(fit(P.regions[reg.dataset.region].box)); return; }
      const z = e.target.closest('[data-mz]'); if (z) { const [w, h] = svgSize(); zoomAt(w / 2, h / 2, +z.dataset.mz > 0 ? 1.6 : 1 / 1.6); saveCam(); return; }
      if (e.target.closest('#wmHere')) { const here = S().last && POS.get(S().last); if (here) pickPlace(here); return; }
      if (e.target.closest('#wmLayersB')) { const L = $('#wmLayers'); L.hidden = !L.hidden; $('#wmLayersB').setAttribute('aria-expanded', String(!L.hidden)); return; }
      if (e.target.closest('#wmPlay')) { play(); return; }
      const jb = e.target.closest('[data-journey]'); if (jb) { pick = null; $('#mapCard').hidden = true; journey(jb.dataset.journey); return; }
      if (e.target.closest('[data-cap-close]')) { clearJourney(); stopPlay(); return; }
      if (e.target.closest('[data-mc-close]')) { pick = null; $('#mapCard').hidden = true; $('#wmArah').innerHTML = ''; $$('#mapPins .pin.on, #mapSvg .road-hit.on').forEach(g => g.classList.remove('on')); return; }
      if (e.target.closest('#mapCard a[href^="#c-"]')) return;
      if (dragged) return;
      const pin = e.target.closest('#mapSvg .pin[data-place]'); if (pin && !EDIT) { pickPlace(pin.dataset.place); return; }
      const rd = e.target.closest('#mapSvg .road-hit'); if (rd) { roadCard(+rd.dataset.road); return; }
      if (EDIT && e.target.closest('#mapSvg')) { const [x, y] = toWorld(e.clientX, e.clientY); editInfo(Math.round(x), Math.round(y)); try { navigator.clipboard.writeText(`[${Math.round(x)}, ${Math.round(y)}]`); } catch (err) { /* tanpa papan klip */ } }
    });
    document.addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('#mapSvg .pin[data-place]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickPlace(g.dataset.place); } });
    document.addEventListener('change', e => {
      if (!e.target.closest || !e.target.closest('#paneMap')) return;
      if (e.target.id === 'mapWho') { who = e.target.value || null; paintLayers(); }
      if (e.target.dataset.layer) { layers[e.target.dataset.layer] = e.target.checked; store.set('simpul:layers', layers); paintLayers(); }
      if (e.target.dataset.arah != null) {
        const to = e.target.value, out = $('#mcRoute'), svgA = $('#wmArah');
        if (!to) { out.hidden = true; svgA.innerHTML = ''; $('#wmRoute')?.remove(); return; }
        const r = directions(e.target.dataset.arah, to); out.hidden = false; out.textContent = r.text;
        $('#wmRoute')?.remove(); const g = document.createElementNS(NS, 'path'); g.id = 'wmRoute'; g.setAttribute('class', 'route'); g.setAttribute('d', smooth(r.pts)); $('#wmTrail').after(g);
        const [x0, y0, x1, y1] = bbox(r.pts); fly(fit([x0, y0, x1 - x0 || 1, y1 - y0 || 1], .5));
      }
    });
    document.addEventListener('input', e => { if (e.target.id === 'wmYear') { stopPlay(true); const v = +e.target.value; setYear(v < Y0 ? null : v); } });

    document.addEventListener('simpul:city', pane);
    document.addEventListener('simpul:tab', e => { if (e.detail === 'peta') requestAnimationFrame(() => { apply(); }); else stopPlay(); });
    // dari catatan: lihat di peta
    document.addEventListener('simpul:mapfocus', e => { const pl = POS.get(e.detail); requestAnimationFrame(() => { if (pl) pickPlace(pl); }); });
    A.placeOfNote = id => { const pl = POS.get(id); return pl ? byId.get(pl) : null; };
  }, { once: true });
})();
