/* Arsip catatan: thought log dibaca di aplikasi arsip.
   Laci berisi berkas-berkas catatan (urut menurut nomor), lembar dokumen dengan nomor paragraf,
   indeks pertanyaan yang berubah menjadi terjawab saat jawabannya sudah dibaca, rujukan silang ke kata
   yang sama di berkas lain, riwayat akses, dan garis waktu malam yang sama. Di akhir berkas terakhir,
   "Just knock on the door.": mengetuk membuka berkas kosong untuk pembaca sendiri.
   Tanpa ilustrasi; teks dimuat utuh dari content/works.json. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search), PREVIEW = qs.get('preview') === '1';
  const HISTORY = ['read', 'stats', 'last', 'prog', 'arsip:state', 'arsip:ruang'];
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('jm:' + k)); return v == null ? d : v; } catch (_) { return d; } },
    // pratinjau dari admin tidak menulis riwayat pembaca; pengaturan baca tetap diingat
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (_) {} }
  };
  const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const array = v => Array.isArray(v) ? v : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '');
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en', LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const LOCALE = EN ? 'en-GB' : 'id-ID', num = n => Math.round(n).toLocaleString(LOCALE);
  const root = document.documentElement, motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const G = window.JMGuide || { mount() {}, step() {}, want() {}, next: () => '', NIGHT: [] };
  root.lang = LANG;

  const labels = {
    backLabel: ['Meja tulis', 'Writing desk'], drawerLabel: ['Laci', 'Drawer'], appTitle: ['Arsip', 'Archive'], appSub: ['Catatan', 'Notes'], kicker: ['Arsip · Juan', 'Archive · Juan'],
    drawerTitle: ['Catatan malam 19 Juli 2026', 'Notes from the night of 19 July 2026'], filesLabel: ['Berkas', 'Files'], nightLabel: ['Malam yang sama', 'The same night'],
    qLabel: ['Pertanyaan dalam berkas', 'Questions in this file'], xLabel: ['Rujukan silang', 'Cross-references'], logLabel: ['Riwayat akses', 'Access log'], indexTitle: ['Indeks berkas', 'File index'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], motionLabel: ['Gerak', 'Motion'], themeLabel: ['Tampilan', 'Appearance'], languageLabel: ['Bahasa', 'Language']
  };
  Object.entries(labels).forEach(([id, v]) => { $('#' + id).textContent = t(...v); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')]].forEach(([id, l]) => $('#' + id).setAttribute('aria-label', l));
  $$('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Tema mengikuti situs: pilihan pembaca → tema bawaan di admin → tema perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const v = root.getAttribute('data-theme'); return v ? v === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = dark ? '#121214' : '#f3f1ec';
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('arsip:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', String(enabled)); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('arsip:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const calm = () => root.hasAttribute('data-calm');
  let siteName = 'Quiet Margins';
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(s => { if (s?.theme) { siteTheme = s.theme; applyTheme(); } if (s?.title) { siteName = s.title; setDocTitle(); } }).catch(() => {});

  // Naskah: semua tulisan berjenis catatan, urut menurut nomor berkasnya
  let works = PREVIEW ? store.get('preview', null)?.works : null;
  try { if (!works) { const r = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('content'); works = await r.json(); } } catch (_) {}
  const numOf = w => +(String(w.title).match(/(\d{3})/)?.[1] || 0);
  const DOCS = (Array.isArray(works) ? works : []).filter(w => w && w.cat === 'catatan' && !w.draft && Array.isArray(w.body) && w.body.length)
    .sort((a, b) => numOf(a) - numOf(b) || String(a.time).localeCompare(String(b.time)))
    .map((w, i) => {
      const ORIG = w.lang === 'en' ? 'en' : 'id', TR = ORIG === 'en' ? 'id' : 'en';
      const translated = LANG !== ORIG && Array.isArray(w[TR]?.body) && w[TR].body.length;
      const body = (translated ? w[TR].body : w.body).map(p => String(p).trim()).filter(Boolean);
      const title = (LANG !== ORIG && w[TR]?.title) || w.title;
      return { w, slug: w.slug, i, no: String(numOf(w) || i + 1).padStart(3, '0'), title, short: title.replace(/^.*?\d{3}\s*[:·-]\s*/, ''), body, lost: LANG !== ORIG && !translated ? ORIG : '', words: body.reduce((n, p) => n + (plain(p).match(/\S+/g) || []).length, 0) };
    });
  if (!DOCS.length) { $('#doc').innerHTML = `<p class="placeholder">${t('Arsipnya belum bisa dimuat.', 'The archive could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; return; }
  const bySlug = s => DOCS.find(d => d.slug === s);
  const LAST = DOCS.at(-1);

  // Pertanyaan: kalimat yang berakhir dengan tanda tanya. Terjawab setelah paragraf sesudahnya dibaca.
  // potongan kalimat tanya, dibatasi titik, titik dua, atau tanda kutip (kutipannya tetap di luar penanda)
  const QRE = /[^.!?…:;\n"“”]*?[^.!?…:;\s"“”][^.!?…:;\n"“”]*\?/g;
  DOCS.forEach(d => {
    d.questions = []; let k = 0;
    d.html = d.body.map((p, i) => {
      let out = '', last = 0;
      for (const m of p.matchAll(QRE)) {
        const s = m[0].replace(/^\s+/, ''), at = m.index + (m[0].length - s.length);
        if (s.length < 8) continue;
        k++; d.questions.push({ k, p: i, text: plain(s) });
        out += inline(p.slice(last, at)) + `<span class="q" data-q="${k}"><span class="q-tag">P${k}</span>${inline(s)}</span>`; last = at + s.length;
      }
      return out + inline(p.slice(last));
    });
  });
  // Rujukan silang: kata khas (6 huruf atau lebih) yang juga muncul di berkas lain
  const STOP = new Set('because something everything nothing without through themselves myself yourself ourselves another anything whether really should always little things however simply actually inherently truly before become becomes others itself rather whatever within'.split(' '));
  const tokens = d => { const c = {}; plain(d.body.join(' ')).toLowerCase().match(/[a-zÀ-ɏ]{6,}/g)?.forEach(x => { if (!STOP.has(x)) c[x] = (c[x] || 0) + 1; }); return c; };
  DOCS.forEach(d => { d.tok = tokens(d); });
  DOCS.forEach(d => {
    const refs = [];
    DOCS.filter(o => o !== d).forEach(o => Object.keys(d.tok).forEach(x => { if (o.tok[x]) refs.push({ word: x, to: o.slug, no: o.no, score: Math.min(d.tok[x], o.tok[x]) + (x.length > 8 ? .5 : 0) }); }));
    refs.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    const seen = new Set(); d.xrefs = refs.filter(r => !seen.has(r.word) && seen.add(r.word)).slice(0, 7);
  });

  // Keadaan pembaca
  const blank = () => ({ opens: {}, read: {}, done: [], knocks: 0, ruang: false });
  let A = PREVIEW ? blank() : { ...blank(), ...object(store.get('arsip:state', {})) };
  A.opens = object(A.opens); A.read = object(A.read); A.done = array(A.done);
  const stats = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  const save = () => store.set('arsip:state', A);
  const isDone = s => A.done.includes(s);
  const progressOf = d => isDone(d.slug) ? 1 : clamp(((A.read[d.slug] ?? -1) + 1) / d.body.length, 0, 1);
  const answered = (d, q) => isDone(d.slug) || (A.read[d.slug] ?? -1) >= q.p + 1;
  const dateOf = d => d.w.date ? new Date(d.w.date + 'T00:00:00').toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const timeOf = d => String(d.w.time || '').replace(':', EN ? ':' : '.');
  const stamp = ts => new Date(ts).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

  // Laci
  let current = null;
  const renderDrawer = () => {
    const times = DOCS.map(d => d.w.time).filter(Boolean).sort(), mins = times.length > 1 ? (() => { const m = s => +s.slice(0, 2) * 60 + +s.slice(3, 5); return m(times.at(-1)) - m(times[0]); })() : 0;
    $('#drawerNote').textContent = t(`${DOCS.length} berkas · ditulis antara ${times[0]?.replace(':', '.')} dan ${times.at(-1)?.replace(':', '.')} · ${mins} menit`, `${DOCS.length} files · written between ${times[0]} and ${times.at(-1)} · ${mins} minutes`);
    const files = DOCS.map(d => {
      const p = progressOf(d), st = isDone(d.slug) ? `<span class="state done">${t('Selesai dibaca', 'Read')}</span>` : p > 0 ? `<span class="state">${t('Dibaca', 'Read')} ${Math.round(p * 100)}%</span>` : `<span class="state">${t('Belum dibuka', 'Unopened')}</span>`;
      return `<li><a class="file" href="#${d.slug}" data-file="${d.slug}" aria-current="${current === d.slug}"><span class="no">${d.no}</span><span><b>${esc(d.short)}</b><small>${esc(timeOf(d))} · ${t(`${d.body.length} paragraf`, `${d.body.length} paragraphs`)} · ${t(`${d.questions.length} pertanyaan`, `${d.questions.length} questions`)}</small>${st}</span></a></li>`;
    });
    const no4 = String(+LAST.no + 1).padStart(3, '0');
    files.push(A.ruang
      ? `<li><a class="file empty" href="#ruang" data-file="ruang" aria-current="${current === 'ruang'}"><span class="no">${no4}</span><span><b>${t('Ruangmu', 'Your space')}</b><small>${t('hanya di perangkat ini', 'only on this device')}</small></span></a></li>`
      : `<li><span class="file empty locked"><span class="no">${no4}</span><span><b>${t('Terkunci', 'Locked')}</b><small>${t(`Ada pintu di akhir berkas ${LAST.no}.`, `There is a door at the end of file ${LAST.no}.`)}</small></span></span></li>`);
    $('#files').innerHTML = files.join('');
    $('#night').innerHTML = G.NIGHT.map(n => {
      const inHere = bySlug(n.slug), href = inHere ? '#' + n.slug : `../${n.href}${qs.get('lang') ? '?lang=' + qs.get('lang') : ''}`;
      return `<li class="${current === n.slug ? 'here' : ''}"><a href="${href}"><span class="mono">${EN ? n.time.replace('.', ':') : n.time}</span>${esc(n.title)}</a></li>`;
    }).join('');
  };

  // Indeks: pertanyaan, rujukan silang, riwayat akses
  const indexHTML = d => {
    const qs_ = d.questions.length ? d.questions.map(q => { const ok = answered(d, q); return `<li><button type="button" data-jump="${q.p}"><span class="st${ok ? ' ok' : ''}">P${q.k} · ¶${q.p + 1} · ${ok ? t(`terjawab · ¶${Math.min(q.p + 2, d.body.length)}`, `answered · ¶${Math.min(q.p + 2, d.body.length)}`) : t('terbuka', 'open')}</span><span class="qt">${esc(q.text)}</span></button></li>`; }).join('') : `<li class="empty-note">${t('Tidak ada pertanyaan.', 'No questions.')}</li>`;
    const xr = d.xrefs.length ? d.xrefs.map(x => `<button type="button" data-xref="${x.to}" data-word="${esc(x.word)}">${esc(x.word)}<span>→ ${x.no}</span></button>`).join('') : `<p class="empty-note">${t('Belum ada berkas lain.', 'No other files yet.')}</p>`;
    const opens = array(A.opens[d.slug]).slice(-5).reverse().map(ts => `<li>${t('Dibuka', 'Opened')} · <b>${esc(stamp(ts))}</b></li>`).join('');
    const log = opens + `<li>${t('Diarsipkan', 'Filed')} · <b>${esc(dateOf(d))} ${esc(timeOf(d))}</b> · Juan</li>`;
    return { qs: qs_, xr, log };
  };
  const renderIndex = d => {
    const h = indexHTML(d);
    $('#questions').innerHTML = h.qs; $('#xrefs').innerHTML = h.xr; $('#access').innerHTML = h.log;
    const inl = $('#indexInline');
    if (inl) inl.querySelector('div').innerHTML = `<h3 class="label">${t('Pertanyaan dalam berkas', 'Questions in this file')}</h3><ol class="questions">${h.qs}</ol><h3 class="label">${t('Rujukan silang', 'Cross-references')}</h3><div class="xrefs">${h.xr}</div><h3 class="label">${t('Riwayat akses', 'Access log')}</h3><ol class="access">${h.log}</ol>`;
  };

  // Dokumen
  const setDocTitle = () => { const d = bySlug(current); document.title = (d ? d.title : current === 'ruang' ? t('Ruangmu', 'Your space') : t('Arsip', 'Archive')) + ' · ' + siteName; };
  const open = (slug, opts = {}) => {
    const d = bySlug(slug);
    if (slug === 'ruang' && A.ruang) return openRuang();
    if (!d) { current = null; root.dataset.view = 'list'; $('#toDrawer').hidden = true; renderDrawer(); $('#doc').innerHTML = `<p class="placeholder">${t('Pilih berkas dari laci.', 'Choose a file from the drawer.')}</p>`; setDocTitle(); guide(); return; }
    current = slug; root.dataset.view = 'doc'; $('#toDrawer').hidden = false;
    if (!opts.silent) {
      A.opens[slug] = [...array(A.opens[slug]), Date.now()].slice(-20); save();
      if (!PREVIEW) {
        const read = array(store.get('read', [])); if (!read.includes(slug)) store.set('read', [...read, slug]);
        const st = object(store.get('stats', {})); st.plays = object(st.plays); st.plays[slug] = (+st.plays[slug] || 0) + 1; store.set('stats', st);
        store.set('last', { key: slug, at: Date.now() });
      }
    }
    const answeredN = d.questions.filter(q => answered(d, q)).length;
    const next = DOCS[d.i + 1];
    const end = d === LAST
      ? `<div class="door"><p>${t('Di akhir berkas ini ada pintu.', 'At the end of this file there is a door.')}</p><button type="button" class="knock" id="knock">${t('KETUK', 'KNOCK')}</button><p class="knocks" id="knocks" aria-live="polite">${A.ruang ? t('Pintunya sudah terbuka.', 'The door is already open.') : ''}</p></div>${A.ruang ? `<div class="row"><a class="btn main" href="#ruang">${t('Buka ruangmu', 'Open your space')}</a></div>` : ''}${G.next(slug)}`
      : `<div class="row">${next ? `<a class="btn main" href="#${next.slug}">${t('Berkas berikutnya', 'Next file')} · ${next.no}</a>` : ''}<button type="button" class="btn" data-drawer>${t('Kembali ke laci', 'Back to the drawer')}</button></div>`;
    $('#doc').innerHTML = `<header class="doc-head"><p class="doc-top"><span>${t('Arsip · catatan pribadi', 'Archive · personal notes')}</span><span>No. ${d.no}/${LAST.no}</span></p><h1>${esc(d.title)}</h1>
      <dl class="meta"><dt>${t('Ditulis', 'Written')}</dt><dd>${esc(dateOf(d))} · ${esc(timeOf(d))}</dd><dt>${t('Panjang', 'Length')}</dt><dd>±${num(d.words)} ${t('kata', 'words')} · ${d.body.length} ${t('paragraf', 'paragraphs')}</dd><dt>${t('Bahasa', 'Language')}</dt><dd>${d.w.lang === 'en' ? t('Inggris', 'English') : t('Indonesia', 'Indonesian')}</dd><dt>${t('Pertanyaan', 'Questions')}</dt><dd id="qCount">${d.questions.length} · ${t('terjawab', 'answered')} ${answeredN}</dd></dl></header>
      ${isDone(slug) ? `<p class="stamp" aria-label="${t('Selesai dibaca', 'Read')}">${t('Selesai dibaca', 'Read')}</p>` : ''}
      ${d.lost ? `<p class="lost">${d.lost === 'en' ? 'Catatan ini ditulis dalam bahasa Inggris dan belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.' : 'This note isn’t available in English yet, so it’s shown in the original Indonesian.'}</p>` : ''}
      <details class="index-inline" id="indexInline"><summary>${t('Indeks berkas', 'File index')} · ${d.questions.length} ${t('pertanyaan', 'questions')}</summary><div></div></details>
      ${d.html.map((h, i) => `<div class="para" id="p-${i}" data-p="${i}"><span class="pn" aria-hidden="true">¶${i + 1}</span><p class="tx">${h}</p></div>`).join('')}
      <footer class="doc-end">${end}</footer>`;
    renderDrawer(); renderIndex(d); setDocTitle();
    if (opts.para != null) requestAnimationFrame(() => jump(opts.para, opts.word));
    else if (!opts.keepScroll) scrollTo({ top: 0, behavior: 'instant' });
    measure(); frame(); guide();
  };
  const jump = (p, word) => {
    const el = document.getElementById('p-' + p); if (!el) return;
    if (word) { const tx = el.querySelector('.tx'); tx.innerHTML = tx.innerHTML.replace(new RegExp(`(?![^<]*>)\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi'), '<mark class="hit">$1</mark>'); }
    el.scrollIntoView({ block: 'center', behavior: calm() ? 'instant' : 'smooth' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  };
  const openRuang = () => {
    current = 'ruang'; root.dataset.view = 'doc'; $('#toDrawer').hidden = false;
    const text = PREVIEW ? '' : String(store.get('arsip:ruang', '') || '');
    $('#doc').innerHTML = `<header class="doc-head"><p class="doc-top"><span>${t('Arsip · ruangmu', 'Archive · your space')}</span><span>No. ${String(+LAST.no + 1).padStart(3, '0')}/${String(+LAST.no + 1).padStart(3, '0')}</span></p><h1>${t('Tanpa judul', 'Untitled')}</h1>
      <dl class="meta"><dt>${t('Ditulis', 'Written')}</dt><dd>${t('oleh kamu', 'by you')}</dd><dt>${t('Disimpan', 'Saved')}</dt><dd>${t('hanya di perangkat ini, tidak dikirim ke mana pun', 'only on this device, sent nowhere')}</dd></dl></header>
      <div class="ruang"><label class="sr-only" for="ruangText">${t('Tulisanmu', 'Your writing')}</label><textarea id="ruangText" placeholder="${t('Ruang ini sudah ada. Tulis apa saja, atau tidak sama sekali.', 'This space already exists. Write anything, or nothing at all.')}">${esc(text)}</textarea><p class="saved" id="saved" aria-live="polite"></p></div>
      <footer class="doc-end"><div class="row"><button type="button" class="btn" id="clearRuang">${t('Kosongkan', 'Clear')}</button><button type="button" class="btn" data-drawer>${t('Kembali ke laci', 'Back to the drawer')}</button></div>${G.next(LAST.slug)}</footer>`;
    let tm = 0; $('#ruangText').addEventListener('input', e => { clearTimeout(tm); tm = setTimeout(() => { store.set('arsip:ruang', e.target.value); $('#saved').textContent = t('Tersimpan di perangkat ini · ', 'Saved on this device · ') + stamp(Date.now()); }, 400); });
    $('#clearRuang').onclick = () => { $('#ruangText').value = ''; store.set('arsip:ruang', ''); $('#saved').textContent = t('Dikosongkan.', 'Cleared.'); };
    $('#questions').innerHTML = `<li class="empty-note">${t('Belum ada pertanyaan. Mungkin memang tidak perlu.', 'No questions yet. Maybe none are needed.')}</li>`; $('#xrefs').innerHTML = ''; $('#access').innerHTML = `<li>${t('Hanya kamu', 'Only you')}</li>`;
    renderDrawer(); setDocTitle(); scrollTo({ top: 0, behavior: 'instant' }); measure(); frame(); guide();
  };

  // Mengetuk pintu: tiga kali, lalu ruangnya terbuka
  let toastT = 0; const toast = text => { const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600); };
  document.addEventListener('click', e => {
    if (e.target.closest('#knock')) {
      const b = $('#knock'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
      if (A.ruang) { location.hash = 'ruang'; return; }
      A.knocks = (A.knocks || 0) + 1; save();
      $('#knocks').textContent = Array.from({ length: Math.min(A.knocks, 3) }, () => t('tok', 'knock')).join(' · ');
      if (A.knocks >= 3) { A.ruang = true; save(); toast(t('Pintunya terbuka. Ruangnya sudah ada.', 'The door opens. The space already exists.')); setTimeout(() => { location.hash = 'ruang'; }, calm() ? 0 : 700); }
      return;
    }
    const j = e.target.closest('[data-jump]'); if (j) { jump(+j.dataset.jump); return; }
    const x = e.target.closest('[data-xref]');
    if (x) { const o = bySlug(x.dataset.xref), w = x.dataset.word, p = o.body.findIndex(b => new RegExp(`\\b${w}\\b`, 'i').test(plain(b))); history.pushState(null, '', '#' + o.slug); open(o.slug, { para: Math.max(0, p), word: w }); return; }
    if (e.target.closest('[data-drawer]')) { history.pushState(null, '', location.pathname + location.search); open(null); scrollTo({ top: 0, behavior: 'instant' }); }
  });
  $('#toDrawer').onclick = () => { history.pushState(null, '', location.pathname + location.search); open(null); };

  // Membaca: paragraf di garis baca menandai seberapa jauh berkas sudah dibaca
  let paras = [], saveT = 0;
  const measure = () => { paras = $$('#doc .para'); };
  const finish = d => {
    if (isDone(d.slug)) return; A.done = [...A.done, d.slug]; save();
    if (!stats.has(d.slug)) { stats.add(d.slug); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...stats] }); }
    const head = $('#doc .doc-head'); if (head && !$('#doc .stamp')) head.insertAdjacentHTML('afterend', `<p class="stamp" aria-label="${t('Selesai dibaca', 'Read')}">${t('Selesai dibaca', 'Read')}</p>`);
    renderDrawer(); renderIndex(d);
    $('#announcement').textContent = t('Berkas selesai dibaca.', 'File read.');
  };
  const frame = () => {
    const d = bySlug(current);
    if (!d || !paras.length) { $('#readingLine').style.setProperty('--progress', 0); return; }
    const line = innerHeight * .4; let at = -1;
    for (const el of paras) { if (el.getBoundingClientRect().top <= line) at = +el.dataset.p; else break; }
    const lastEl = paras.at(-1), atEnd = lastEl.getBoundingClientRect().bottom <= innerHeight - 40;
    const before = A.read[d.slug] ?? -1, now = atEnd ? d.body.length - 1 : at;
    if (now > before) {
      A.read[d.slug] = now; clearTimeout(saveT); saveT = setTimeout(save, 300);
      const answeredN = d.questions.filter(q => answered(d, q)).length; const qc = $('#qCount'); if (qc) qc.textContent = `${d.questions.length} · ${t('terjawab', 'answered')} ${answeredN}`;
      renderIndex(d); renderDrawer();
    }
    if (atEnd) finish(d);
    const p = progressOf(d); $('#readingLine').style.setProperty('--progress', p); $('#readingLine').setAttribute('aria-valuenow', Math.round(p * 100));
    if (now > before || atEnd) store.set('prog', { ...object(store.get('prog', {})), [d.slug]: +p.toFixed(4) });
  };
  let raf = 0; addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, { passive: true });
  addEventListener('resize', () => { measure(); frame(); });

  // Panduan
  const guide = () => {
    if (!current) { const first = DOCS.find(d => !isDone(d.slug)) || DOCS[0]; G.want(`[data-file="${first.slug}"]`, first.no + ' · ' + first.short); return; }
    if (current === LAST.slug && !A.ruang) G.want('#knock', t('Ada pintu di akhir berkas', 'There is a door at the end')); else G.want(null);
  };
  G.mount({ slug: 'arsip', title: t('Arsip catatan', 'The notes archive'), helpInto: '#topRight',
    lede: t('Catatan-catatan Juan dibaca sebagai berkas arsip.', 'Juan’s notes are read as archive files.'),
    steps: [t('Pilih berkas dari laci. Nomornya mengikuti urutan malam itu.', 'Choose a file from the drawer. The numbers follow the order of that night.'), t('Pertanyaan ditandai P1, P2, dan seterusnya. Di indeks, statusnya berubah menjadi terjawab setelah kamu membaca jawabannya.', 'Questions are marked P1, P2 and so on. In the index they turn answered once you have read the answer.'), t('Rujukan silang membawamu ke kata yang sama di berkas lain.', 'Cross-references take you to the same word in another file.'), t('Di akhir berkas terakhir ada pintu.', 'At the end of the last file there is a door.')] });

  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = d => { size = clamp(size + d, 16, 26); root.style.setProperty('--size', size + 'px'); store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26; };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => { save(); const u = new URL(location.href); u.searchParams.set('lang', EN ? 'id' : 'en'); store.set('lang', EN ? 'id' : 'en'); location.replace(u.href); };
  $('#openSettings').onclick = () => $('#settingsDialog').showModal();
  $$('dialog').forEach(d => d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); }));
  addEventListener('pagehide', save);

  const route = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === 'ruang') { A.ruang ? openRuang() : open(LAST.slug); return; }
    if (bySlug(h)) { if (current !== h) open(h); return; }
    // layar lebar tanpa alamat: buka berkas pertama yang belum selesai
    if (!h && innerWidth > 820) { const first = DOCS.find(d => !isDone(d.slug)) || DOCS[0]; history.replaceState(null, '', '#' + first.slug); open(first.slug); return; }
    open(null);
  };
  addEventListener('hashchange', route);
  addEventListener('popstate', route);
  route(); root.dataset.loaded = '';
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
