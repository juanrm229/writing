/* Usia Pulang: novel interaktif. Tujuh hari, 168 jam, delapan akhir.
   Mesin mengikuti kontrak data di content/usia-pulang.json (Simpul-Cerita.json milik pengarang):
   - masuk simpul: catat di visited, jalankan on_enter_flags
   - memilih: pasang set_flags, cabut unset_flags, pindah ke target; pilihan dengan requires_flags hanya muncul bila tandanya ada
   - sela (perspective): body_before, tepat satu varian yang cocok dengan visited_all, body_after; lalu antrekan semua
     callbacks yang cocok berurutan; gema kembali ke antrean, lalu next
   Nama tanda tidak pernah ditampilkan. Pikiran di sela hanya untuk pembaca. Tidak ada skor. */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'usia:run', 'usia:endings'];
  const mem = {};
  const store = {
    get(k, d) { if (PREVIEW && HISTORY.includes(k)) return k in mem ? mem[k] : d; try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) { mem[k] = v; return; } try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'usia-pulang', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = s => { const d = document.createElement('div'); d.innerHTML = s.trim(); return d.firstElementChild; };
  root.lang = t('id', 'en');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- teks antarmuka ---------- */
  $('#kick').textContent = t('Temusai · Novel interaktif', 'Temusai · Interactive novel');
  if (EN) {
    $('#lede').textContent = 'Laras comes back twenty-nine years after her death. Her body is still 31; her daughter is 37. She has 168 hours to decide whether to stay.';
    $('#rule1').textContent = 'Seven days. Each day you choose where Laras goes, then what she does.';
    $('#rule2').textContent = 'Choices cannot be taken back. There is no good or bad score.';
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
  const shortTitle = n => String(n.title || n.id).replace(/^[A-Z]\d{2}[A-D]?\s*[—-]\s*/, '').replace(/^[A-Z]\d[A-D]\s*[—-]\s*/, '');
  const has = (flags, list) => (list || []).every(f => flags.has(f));

  /* ---------- jam cerita: Senin 9 November 2026 18.40 sampai Senin 16 November 2026 18.40 ---------- */
  const DAYS = EN ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'] : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Senin'];
  const PART = { pagi: t('pagi', 'morning'), siang: t('siang', 'afternoon'), sore: t('sore', 'evening'), malam: t('malam', 'night'), senja: t('petang', 'dusk') };
  const HOUR = { pagi: 8, siang: 13, sore: 17.67, senja: 18.67, malam: 21.5 };
  const SKY = { pagi: 'fajar', siang: 'siang', sore: 'senja', senja: 'senja', malam: 'malam' };
  // hari dan bagian hari untuk tiap simpul; gema mengikuti hari selanya
  let lastDay = 0;
  function timeOf(id) {
    const n = N[id], m = id.match(/^([CHPRZE])(\d)?(\d)?/);
    if (id === ENTRY) return { day: 0, part: 'senja', exact: '18.40' };
    if (id === 'Z00') return { day: 7, part: 'sore', exact: '17.40' };
    if (n.kind === 'ending') return { day: 7, part: 'senja', exact: '18.40' };
    if (m[1] === 'C') { const k = +id.slice(1) - 1; return { day: k, part: k ? 'pagi' : 'senja' }; }
    if (m[1] === 'H') { const k = +id[1] - 1; return { day: k, part: k ? 'siang' : 'malam' }; }
    if (m[1] === 'P') { const k = +id.slice(1) - 1; return { day: k, part: 'malam' }; }
    return { day: lastDay, part: 'malam' };
  }
  const elapsed = tm => Math.max(0, Math.min(168, tm.day * 24 + HOUR[tm.part] - 18.67));
  const dateOf = tm => `${DAYS[tm.day]}, ${9 + tm.day} ${t('November', 'November')}`;

  /* ---------- perjalanan (run) ---------- */
  // path: [{ id, choice?, queue? }]; snaps: keadaan sebelum masuk tiap adegan bersama C, untuk "mulai dari hari ini"
  const fresh = () => ({ v: 1, path: [], flags: [], visited: [], queue: [], pNext: null, snaps: {}, started: Date.now() });
  let run = store.get('usia:run', null);
  if (!run || run.v !== 1 || !Array.isArray(run.path)) run = null;
  let flags = new Set(), visited = [];
  const save = () => { run.flags = [...flags]; run.visited = visited; store.set('usia:run', run); };

  /* ---------- tampilan buku ---------- */
  const book = $('#book');
  const KIND = { choice: t('Bersama', 'Together'), journey: t('Perjalanan', 'Journey'), perspective: t('Sela', 'Interlude'), callback: t('Gema', 'Echo'), ending: t('Akhir', 'Ending'), last: t('Batas', 'Deadline') };
  const kindOf = n => n.kind === 'choice' ? (/^H/.test(n.id) ? 'journey' : n.id === 'Z00' ? 'last' : 'choice') : n.kind;
  const whoOf = n => (String(n.title).match(/—\s*([A-Z][a-z]+):/) || [])[1] || '';
  const NAMES = ['Dian', 'Sulastri', 'Hadi', 'Ratna', 'Suri', 'Anin', 'Banyu', 'Tama', 'Kamal', 'Rafi'];
  const people = label => NAMES.filter(x => new RegExp(`\\b${x}\\b`).test(label));
  const prompt = n => n.id === 'Z00' ? t('Sebelum pukul 18.40, Laras memutuskan…', 'Before 18:40, Laras decides…')
    : /^H/.test(n.id) ? t('Apa yang Laras lakukan?', 'What does Laras do?')
    : n.id === ENTRY ? t('Ke mana Laras pergi malam ini?', 'Where does Laras go tonight?')
    : t(`Ke mana Laras pergi hari ${DAYS[timeOf(n.id).day]}?`, `Where does Laras go on ${DAYS[timeOf(n.id).day]}?`);

  // gema: kutip tindakan pembaca sendiri yang memasang tanda pemicunya
  function causeOf(because) {
    for (let k = run.path.length - 1; k >= 0; k--) {
      const e = run.path[k]; if (!e.choice) continue;
      const c = (N[e.id].choices || []).find(x => x.id === e.choice);
      if (c && (c.set_flags || []).some(f => because.includes(f))) return { c, tm: timeOf(e.id) };
    }
    return null;
  }

  function nodeEl(entry, idx) {
    const n = N[entry.id], k = kindOf(n), tm = timeOf(entry.id), who = whoOf(n);
    if (n.kind === 'perspective' || n.kind === 'choice' && /^C/.test(n.id)) lastDay = tm.day;
    const when = `${DAYS[tm.day]} ${PART[tm.part]}`;
    const sec = html(`<section class="node k-${k}${who ? ' who-' + who : ''}" data-id="${n.id}" data-i="${idx}" data-day="${tm.day}" data-part="${tm.part}"></section>`);
    let head = `<header class="n-head"><p class="n-kind"><span>${esc(KIND[k])}${who ? ' · ' + esc(who) : ''}</span><span>${esc(when)}</span></p><h2>${esc(who ? shortTitle(n).replace(new RegExp(`^${who}:\\s*`), '') : shortTitle(n))}</h2></header>`;
    if (n.kind === 'perspective') head += `<p class="n-note">${esc(t(`Laras tidak mengetahui apa yang ${who} pikirkan di sini.`, `Laras does not know what ${who} thinks here.`))}</p>`;
    if (n.kind === 'callback' && entry.because) {
      const cause = causeOf(entry.because);
      if (cause) head += `<p class="n-cause"><small>${esc(t(`${DAYS[cause.tm.day]} ${PART[cause.tm.part]}, kamu memilih`, `${DAYS[cause.tm.day]} ${PART[cause.tm.part]}, you chose`))}</small><span>${esc(cause.c.label)}</span></p>`;
    }
    let body = '';
    if (n.kind === 'perspective') {
      const v = (n.variants || []).find(x => (x.visited_all || []).every(id => visited.includes(id)));
      body = [...paras(n.body_before), ...(v ? paras(v.body) : []), ...paras(n.body_after)].map(p => `<p>${inline(p)}</p>`).join('');
    } else body = paras(n.body).map(p => `<p>${inline(p)}</p>`).join('');
    sec.innerHTML = head + `<div class="n-body">${body}</div>`;
    return sec;
  }

  function choiceEl(entry) {
    const n = N[entry.id];
    const opts = (n.choices || []).filter(c => has(flags, c.requires_flags));
    const kind = n.id === 'Z00' ? 'doors' : /^H/.test(n.id) ? 'acts' : 'places';
    const box = html(`<div class="choose c-${kind}" role="group" aria-label="${esc(prompt(n))}"><p class="ch-q">${esc(prompt(n))}</p><div class="ch-list"></div></div>`);
    opts.forEach(c => {
      const ppl = people(c.label);
      const b = html(`<button type="button" class="opt" data-c="${c.id}"><span class="o-t">${esc(c.label)}</span>${kind === 'places' && ppl.length ? `<span class="o-p">${ppl.map(p => `<i title="${p}">${p[0]}</i>`).join('')}</span>` : ''}${kind === 'doors' ? `<span class="o-d">${/^Tidak menetap/i.test(c.label) ? t('tidak menetap', 'does not stay') : t('menetap', 'stays')}</span>` : ''}</button>`);
      b.onclick = () => choose(entry, c, box, b);
      $('.ch-list', box).append(b);
    });
    if (entry.choice) settle(box, entry.choice);
    return box;
  }
  function settle(box, choiceId) {
    box.classList.add('done');
    $$('.opt', box).forEach(b => { const me = b.dataset.c === choiceId; b.classList.toggle('picked', me); b.disabled = true; if (!me) b.hidden = true; b.setAttribute('aria-pressed', String(me)); });
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

  function render(entry, idx, fresh) {
    const n = N[entry.id];
    const sec = nodeEl(entry, idx);
    if (n.kind === 'choice') sec.append(choiceEl(entry));
    else if (n.kind === 'perspective' || n.kind === 'callback') sec.append(continueEl(entry));
    else if (n.kind === 'ending') sec.append(endingEl(n));
    book.append(sec);
    if (fresh) {
      if (!reduced()) sec.classList.add('enter');
      requestAnimationFrame(() => sec.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }));
    }
    return sec;
  }

  /* ---------- gerak cerita ---------- */
  function enter(id) {
    const n = N[id];
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
    render(entry, run.path.length - 1, true);
    if (n.kind === 'ending') finish(n);
    frame();
  }
  function choose(entry, c, box, b) {
    if (entry.choice) return;
    entry.choice = c.id;
    (c.set_flags || []).forEach(f => flags.add(f));
    (c.unset_flags || []).forEach(f => flags.delete(f));
    settle(box, c.id);
    stamp();
    save();
    setTimeout(() => enter(c.target), reduced() ? 0 : 420);
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
    render(entry, run.path.length - 1, true);
    frame();
  }

  /* ---------- Kartu Kepulangan ---------- */
  function cardHTML() {
    const rows = [];
    for (let d = 0; d < 7; d++) {
      const c = run.path.find(e => e.id === `C0${d + 1}`), h = run.path.find(e => new RegExp(`^H${d + 1}[A-D]$`).test(e.id));
      const cl = c && c.choice ? (N[c.id].choices || []).find(x => x.id === c.choice)?.label : '';
      const hl = h && h.choice ? (N[h.id].choices || []).find(x => x.id === h.choice)?.label : '';
      const echoes = run.path.filter(e => N[e.id].kind === 'callback' && run.path.indexOf(e) > run.path.indexOf(h || c || {}) && (d === 6 || run.path.indexOf(e) < run.path.findIndex(x => x.id === `C0${d + 2}`)));
      rows.push(`<li class="${cl ? 'on' : ''}"><span class="cd-day"><b>${esc(DAYS[d])}</b><small>${9 + d} Nov</small></span><span class="cd-what">${cl ? `<span class="stamp">${esc(cl)}</span>` : `<span class="cd-empty">—</span>`}${hl ? `<span class="hand">${esc(hl)}</span>` : ''}${echoes.length ? `<span class="cd-echo">${esc(t(`${echoes.length} gema`, `${echoes.length} echo${echoes.length > 1 ? 'es' : ''}`))}</span>` : ''}</span></li>`);
    }
    const z = run.path.find(e => e.id === 'Z00'), zl = z && z.choice ? (N.Z00.choices || []).find(x => x.id === z.choice)?.label : '';
    rows.push(`<li class="last ${zl ? 'on' : ''}"><span class="cd-day"><b>${esc(DAYS[7])}</b><small>16 Nov · 18.40</small></span><span class="cd-what">${zl ? `<span class="stamp final">${esc(zl)}</span>` : `<span class="cd-empty">${esc(t('belum diputuskan', 'not decided yet'))}</span>`}</span></li>`);
    return `<p class="cd-who"><span>${esc(t('Nama', 'Name'))}</span><b>Laras</b><span>${esc(t('Usia saat kembali', 'Age on return'))}</span><b>31</b><span>${esc(t('Masa sementara', 'Interim period'))}</span><b>${esc(t('168 jam', '168 hours'))}</b></p><ol class="cd-days">${rows.join('')}</ol><p class="cd-foot">${esc(t('Yang dicatat hanya yang dipilih. Pilihan yang tidak diambil tidak tercatat.', 'Only what was chosen is recorded. Choices not taken are not kept.'))}</p>`;
  }
  const cardDlg = $('#cardDialog');
  $('#openCard').addEventListener('click', () => { $('#cardBody').innerHTML = run ? cardHTML() : `<p class="cd-foot">${esc(t('Perjalanan belum dimulai.', 'The journey has not started.'))}</p>`; cardDlg.showModal(); });
  cardDlg.addEventListener('click', e => { if (e.target === cardDlg || e.target.closest('[data-close]')) cardDlg.close(); });
  function stamp() { const b = $('#openCard'); b.classList.remove('stamped'); void b.offsetWidth; b.classList.add('stamped'); $('#announcement').textContent = t('Tercatat di Kartu Kepulangan.', 'Noted on the Return Card.'); }

  /* ---------- akhir dan peta ---------- */
  function endingEl(n) {
    return html(`<div class="after" id="after"><p class="af-k">${esc(t('Salah satu dari delapan akhir', 'One of eight endings'))}</p><div class="map" id="map"></div><div class="af-act"><button type="button" class="go" id="again">${esc(t('Pulang lagi', 'Come back again'))}</button><label class="af-from"><span>${esc(t('atau mulai lagi dari', 'or start again from'))}</span><select id="fromDay"></select></label></div><div class="af-next" id="afNext"></div></div>`);
  }
  function finish(n) {
    const found = new Set(store.get('usia:endings', []) || []); found.add(n.id); store.set('usia:endings', [...found]);
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
    const pr = store.get('prog', {}) || {}; pr[SLUG] = 1; store.set('prog', pr);
    paintMap(n, found);
    $('#again').onclick = () => { if (!confirm(t('Mulai perjalanan baru? Kartu ini akan diganti.', 'Start a new journey? This card will be replaced.'))) return; startFresh(); };
    const sel = $('#fromDay');
    sel.innerHTML = `<option value="">${esc(t('pilih hari…', 'choose a day…'))}</option>` + Object.keys(run.snaps).sort().map(id => `<option value="${id}">${esc(DAYS[timeOf(id).day])} · ${esc(shortTitle(N[id]))}</option>`).join('');
    sel.onchange = () => { if (sel.value) startFrom(sel.value); };
    if (G) $('#afNext').innerHTML = G.next(SLUG);
  }
  function paintMap(endNode, found) {
    const v = new Set(visited), cell = (id, lab) => `<span class="mp ${v.has(id) ? 'lit' : ''}${endNode && id === endNode.id ? ' here' : ''}" title="${esc(shortTitle(N[id]))}">${esc(lab || id)}</span>`;
    let rows = '';
    for (let d = 1; d <= 7; d++) rows += `<div class="mp-row"><span class="mp-day">${esc(DAYS[d - 1].slice(0, 3))}</span>${cell('C0' + d, '●')}<span class="mp-h">${['A', 'B', 'C', 'D'].map(x => cell(`H${d}${x}`, x)).join('')}</span>${cell('P0' + d, whoOf(N['P0' + d])[0])}</div>`;
    const echoes = Object.values(N).filter(n => n.kind === 'callback').map(n => n.id).sort().map(id => cell(id, '·')).join('');
    const ends = ENDINGS.map(id => `<span class="mp-end ${found.has(id) ? 'found' : ''}${endNode && id === endNode.id ? ' here' : ''}"><b>${found.has(id) ? esc(shortTitle(N[id])) : '—'}</b></span>`).join('');
    const words = $$('.n-body', book).reduce((s, el) => s + (el.textContent.trim().split(/\s+/).length), 0);
    $('#map').innerHTML = `<p class="mp-k">${esc(t('Peta perjalanan', 'Journey map'))}</p><div class="mp-grid">${rows}<div class="mp-row echoes"><span class="mp-day">${esc(t('Gema', 'Echo'))}</span><span class="mp-e">${echoes}</span></div></div>
      <p class="mp-words">${esc(t(`Kamu membaca ${words.toLocaleString('id-ID')} dari ${TOTAL_WORDS.toLocaleString('id-ID')} kata.`, `You read ${words.toLocaleString('en-GB')} of ${TOTAL_WORDS.toLocaleString('en-GB')} words.`))}</p>
      <p class="mp-k">${esc(t(`Akhir yang sudah kamu temukan: ${found.size} dari ${ENDINGS.length}`, `Endings you have found: ${found.size} of ${ENDINGS.length}`))}</p><div class="mp-ends">${ends}</div>`;
  }

  /* ---------- mulai, lanjutkan, ulang ---------- */
  function rebuild() {
    book.innerHTML = '';
    flags = new Set(run.flags || []); visited = [...(run.visited || [])];
    // susun ulang tampilan dari jalan yang sudah ditempuh, dengan keadaan saat itu
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
    if (last && N[last.id].kind === 'ending') finish(N[last.id]);
    frame();
  }
  function begin() {
    $('#cover').classList.add('started');
    if (!run) { run = fresh(); flags = new Set(); visited = []; enter(ENTRY); }
    else rebuild();
    const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]);
    store.set('last', { key: SLUG, at: Date.now() });
  }
  function startFresh() { run = fresh(); flags = new Set(); visited = []; book.innerHTML = ''; save(); enter(ENTRY); }
  function startFrom(id) {
    const s = run.snaps[id]; if (!s) return;
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

  /* ---------- jam, langit, bagian ---------- */
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  let shownKey = '';
  function frame() {
    const secs = $$('.node', book); if (!secs.length) { $('#clock').hidden = true; return; }
    const line = innerHeight * .4;
    let cur = secs[0]; secs.forEach(s => { if (s.getBoundingClientRect().top < line) cur = s; });
    const id = cur.dataset.id, tm = timeOf(id), key = id + tm.day + tm.part;
    $('#clock').hidden = false;
    if (key !== shownKey) {
      shownKey = key;
      $('#ckWhen').innerHTML = `<b>${esc(dateOf(tm))}</b><span>${esc(PART[tm.part])}</span>`;
      const tt = $('#ckTime'); tt.hidden = !tm.exact; if (tm.exact) tt.innerHTML = `${esc(tm.exact.replace('.', t('.', ':')))}<small>${esc(id === 'Z00' ? t('sisa 1 jam', '1 hour left') : id === ENTRY ? t('sisa 168 jam', '168 hours left') : t('batas', 'deadline'))}</small>`;
      const f = elapsed(tm) / 168;
      $('#ckBar').innerHTML = Array.from({ length: 7 }, (_, k) => `<i style="--f:${Math.max(0, Math.min(1, f * 7 - k)).toFixed(3)}"></i>`).join('');
      $('#ckAges').textContent = t('Laras 31 · Dian 37', 'Laras 31 · Dian 37');
      if (G) { $('#stepChip').hidden = false; G.step(Math.min(7, tm.day + 1), 7, t('Hari', 'Day')); }
      if (!isDark()) root.dataset.backdrop = SKY[tm.part]; else root.dataset.backdrop = 'malam';
      const pr = store.get('prog', {}) || {}; if ((pr[SLUG] || 0) < 1) { pr[SLUG] = +(elapsed(tm) / 168).toFixed(3); store.set('prog', pr); }
    }
  }
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, { passive: true });
  addEventListener('qm-frame', () => { shownKey = ''; frame(); });

  /* ---------- pengaturan baca ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  $('#openCard').setAttribute('aria-label', t('Kartu Kepulangan', 'Return Card'));

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, title: t('Usia Pulang', 'Usia Pulang'), helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#begin',
      lede: t('Novel interaktif. Laras punya 168 jam untuk memutuskan apakah akan menetap.', 'An interactive novel. Laras has 168 hours to decide whether to stay.'),
      steps: [
        t('Tujuh hari. Setiap hari dimulai bersama keluarga, lalu kamu memilih ke mana Laras pergi.', 'Seven days. Each day begins with the family, then you choose where Laras goes.'),
        t('Di akhir perjalanan, pilih apa yang Laras lakukan. Pilihan tidak bisa ditarik kembali, dan tidak ada nilai baik atau buruk.', 'At the end of a journey, choose what Laras does. Choices cannot be taken back, and nothing is scored as good or bad.'),
        t('Sela membawamu ke pikiran orang lain. Laras tidak mengetahui apa yang kamu baca di sana. Gema menunjukkan akibat pilihanmu yang datang belakangan.', 'Interludes take you into someone else’s mind. Laras does not know what you read there. Echoes show consequences that arrive later.'),
        t('Kartu Kepulangan (ikon kartu di kanan atas) mencatat jalanmu. Ada delapan akhir; satu perjalanan hanya membaca sebagian.', 'The Return Card (the card icon at the top right) records your path. There are eight endings; one journey reads only part of the story.')
      ] });
    G.settings();
  }
  frame();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
