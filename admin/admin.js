(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const plain = s => String(s).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(\S(?:.*?\S)?)\*/g, '$1');
  const slugify = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const today = () => new Date().toISOString().slice(0, 10);
  const nowTime = () => new Date().toTimeString().slice(0, 5);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const words = s => (plain(s).toLowerCase().match(/[a-zà-ÿ]+(?:-[a-zà-ÿ]+)*/g) || []).length;

  const DEFAULT_SITE = {
    title: 'Juan Menulis', description: '', author: 'Juan', handle: 'juan/menulis', email: '', avatar: '', readerName: 'pembaca',
    accent: '#1662FF', theme: 'auto', backdrop: 'auto', defaultView: 'putar', readerFont: 'newsreader', readerPaper: 'putih',
    features: { dock: true, rotatingQuotes: true, connections: true, replay: true, ambience: true },
    categories: [
      { id: 'esai', label: 'Esai', tag: 'ESAI', ink: '#2F5BFF', red: false },
      { id: 'puisi', label: 'Puisi', tag: 'PUISI', ink: '#D2338A', red: true },
      { id: 'cerpen', label: 'Cerpen', tag: 'CERPEN', ink: '#0E8A5C', red: false },
      { id: 'mini', label: 'Fiksi Mini', tag: 'MINI', ink: '#E0571C', red: false },
      { id: 'catatan', label: 'Catatan', tag: 'CATATAN', ink: '#6A4DF0', red: false }
    ]
  };
  const FONTS = [
    { id: 'newsreader', name: 'Newsreader', css: '"Newsreader", Georgia, serif' },
    { id: 'literata', name: 'Literata', css: '"Literata", Georgia, serif' },
    { id: 'georgia', name: 'Georgia', css: 'Georgia, serif' },
    { id: 'sistem', name: 'Sistem', css: '-apple-system, "Geist", system-ui, sans-serif' },
    { id: 'instrument', name: 'Instrument', css: '"Instrument Serif", Georgia, serif' },
    { id: 'geist', name: 'Geist', css: '"Geist", system-ui, sans-serif' }
  ];

  let toastT;
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), bad ? 5000 : 2800);
  }

  /* ======================================================================
     STATE
     ====================================================================== */
  const S = { site: null, works: [], albums: [], base: { site: '', works: '', albums: '' }, sel: null, side: 'a', ch: 0, lang: 'id', selAlbum: null, filter: 'semua', q: '', tab: 'tulis', avatarData: null };
  const clean = works => works.map(w => Object.fromEntries(Object.entries(w).filter(([k]) => !k.startsWith('_'))));
  const snapWorks = () => JSON.stringify(clean(S.works));
  const snapSite = () => JSON.stringify(S.site);
  const snapAlbums = () => JSON.stringify(clean(S.albums));
  const isDirty = () => snapWorks() !== S.base.works || snapSite() !== S.base.site || snapAlbums() !== S.base.albums;
  const backupKey = () => { const c = GH.cfg(); return `jm-admin-backup:${c.owner}/${c.repo}`; };
  const cur = () => S.works.find(w => w.slug === S.sel);
  const catList = () => S.site.categories || [];
  const catOf = id => catList().find(c => c.id === id) || { id, label: id, tag: String(id).toUpperCase().slice(0, 7), ink: '#111' };

  function setStatus(state, text) {
    $('#status').dataset.state = state;
    $('#statusText').textContent = text;
  }
  const changed = debounce(() => {
    const d = isDirty();
    $('#saveBtn').disabled = !d;
    if ($('#status').dataset.state !== 'saving') setStatus(d ? 'dirty' : 'clean', d ? 'Belum disimpan' : 'Tersimpan');
    try { if (d) localStorage.setItem(backupKey(), JSON.stringify({ at: Date.now(), site: S.site, works: clean(S.works), albums: clean(S.albums) })); else localStorage.removeItem(backupKey()); } catch (e) { /* */ }
    $('#edLocal').textContent = d ? 'cadangan lokal tersimpan' : '';
    renderListDots();
    if (S.tab === 'album') renderAlbumList();
    pushPreview();
  }, 250);

  /* ======================================================================
     MASUK
     ====================================================================== */
  async function tryStart() {
    const c = GH.cfg();
    if (!c) return showLogin();
    try {
      setStatus('saving', 'Memuat…');
      $('#login').hidden = true; $('#app').hidden = false;
      await loadAll();
    } catch (e) {
      $('#app').hidden = true;
      showLogin(e.message);
    }
  }
  function showLogin(err) {
    const g = GH.guess(), c = GH.cfg() || {};
    $('#lgOwner').value = c.owner || g.owner || '';
    $('#lgRepo').value = c.repo || g.repo || '';
    $('#lgBranch').value = c.branchSet ? c.branch : '';
    $('#login').hidden = false; $('#app').hidden = true;
    $('#lgErr').hidden = !err; $('#lgErr').textContent = err || '';
    ($('#lgOwner').value ? $('#lgToken') : $('#lgOwner')).focus();
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const owner = $('#lgOwner').value.trim(), repo = $('#lgRepo').value.trim(), token = $('#lgToken').value.trim(), branch = $('#lgBranch').value.trim();
    const err = m => { $('#lgErr').hidden = false; $('#lgErr').textContent = m; $('#lgErr').style.animation = 'none'; void $('#lgErr').offsetWidth; $('#lgErr').style.animation = ''; };
    if (!owner || !repo || !token) { err('Isi pemilik repo, nama repo, dan token.'); return; }
    $('#lgSubmit').disabled = true; $('#lgSubmit').textContent = 'Memeriksa…';
    GH.save({ owner, repo, token, branch: branch || 'main', branchSet: !!branch }, $('#lgRemember').checked);
    try {
      const r = await GH.repo();
      if (!r.permissions || !r.permissions.push) throw new Error('Token bisa membaca repo ini tapi tidak bisa menulis. Beri izin "Contents: Read and write".');
      GH.save({ owner, repo, token, branch: branch || r.default_branch, branchSet: !!branch }, $('#lgRemember').checked);
      $('#lgToken').value = '';
      await tryStart();
    } catch (ex) {
      GH.logout();
      err(ex.message);
    } finally { $('#lgSubmit').disabled = false; $('#lgSubmit').textContent = 'Masuk'; }
  });

  async function loadAll() {
    const [site, works, albums] = await Promise.all([GH.getJSON('content/site.json'), GH.getJSON('content/works.json'), GH.getJSON('content/albums.json')]);
    S.site = { ...DEFAULT_SITE, ...(site || {}), features: { ...DEFAULT_SITE.features, ...((site || {}).features || {}) } };
    S.works = (Array.isArray(works) ? works : []).map(migrate);
    S.albums = Array.isArray(albums) ? albums : [];
    S.base = { site: snapSite(), works: snapWorks(), albums: snapAlbums() };
    S.selAlbum = S.albums[0]?.id || null;
    S.sel = sortedWorks()[0]?.slug || null;
    setStatus('clean', 'Tersimpan');
    $('#saveBtn').disabled = true;
    try {
      const u = await GH.user();
      $('#meImg').src = u.avatar_url; $('#meName').textContent = u.name || u.login;
    } catch (e) { $('#meName').textContent = 'Penulis'; }
    const c = GH.cfg();
    $('#meRepo').textContent = `${c.owner}/${c.repo} · ${c.branch}`;
    renderAll();
    checkBackup();
  }
  function checkBackup() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(backupKey()) || 'null'); } catch (e) { /* */ }
    if (!b || (JSON.stringify(b.works) === S.base.works && JSON.stringify(b.site) === S.base.site && JSON.stringify(b.albums || []) === S.base.albums)) return;
    $('#bannerText').textContent = `Ada perubahan yang belum disimpan dari ${new Date(b.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`;
    $('#banner').hidden = false;
    $('#bannerYes').onclick = () => { S.works = b.works.map(migrate); S.site = b.site; if (b.albums) S.albums = b.albums; S.sel = sortedWorks()[0]?.slug || null; $('#banner').hidden = true; renderAll(); changed(); toast('Perubahan dipulihkan. Tekan Simpan untuk menerbitkan.'); };
    $('#bannerNo').onclick = () => { try { localStorage.removeItem(backupKey()); } catch (e) { /* */ } $('#banner').hidden = true; };
  }

  /* ======================================================================
     SIMPAN
     ====================================================================== */
  function validate() {
    const seen = new Set();
    for (const w of S.works) {
      if (!w.title.trim()) return [w, 'Ada tulisan tanpa judul. Beri judul dulu sebelum menyimpan.'];
      if (!/^[a-z0-9-]+$/.test(w.slug)) return [w, `Alamat “${w.slug}” hanya boleh huruf kecil, angka, dan tanda hubung.`];
      if (seen.has(w.slug)) return [w, `Alamat “${w.slug}” dipakai dua kali.`];
      seen.add(w.slug);
    }
    const ids = new Set();
    for (const a of S.albums) {
      if (!a.title.trim()) return [null, 'Ada album tanpa judul.', a];
      if (!/^[a-z0-9-]+$/.test(a.id)) return [null, `Alamat album “${a.id}” hanya boleh huruf kecil, angka, dan tanda hubung.`, a];
      if (ids.has(a.id)) return [null, `Alamat album “${a.id}” dipakai dua kali.`, a];
      if (!a.tracks.length) return [null, `Album “${a.title}” belum punya sisi.`, a];
      ids.add(a.id);
    }
    return null;
  }
  async function save() {
    // baris profil yang setengah diisi tidak ikut tersimpan
    const pp = S.site?.profile;
    if (pp) {
      if (pp.now) pp.now = pp.now.filter(r => String(r.text || '').trim());
      if (pp.journey) pp.journey = pp.journey.filter(r => String(r.text || '').trim() && String(r.year || '').trim());
      if (pp.links) pp.links = pp.links.filter(r => String(r.url || '').trim());
      pruneProfile();
      if (S.tab === 'profil') renderProfileForm();
    }
    if (!isDirty()) return;
    const bad = validate();
    if (bad) { if (bad[0]) { setTab('tulis'); selectWork(bad[0].slug); } else { S.selAlbum = bad[2].id; setTab('album'); } toast(bad[1], true); return; }
    const btn = $('#saveBtn');
    btn.classList.add('busy'); btn.disabled = true;
    setStatus('saving', 'Menyimpan ke GitHub…');
    const worksChanged = snapWorks() !== S.base.works, siteChanged = snapSite() !== S.base.site, albumsChanged = snapAlbums() !== S.base.albums;
    const titles = worksChanged ? changedTitles() : [];
    try {
      if (worksChanged) {
        const msg = titles.length === 1 ? `Perbarui tulisan: ${titles[0]}` : titles.length ? `Perbarui ${titles.length} tulisan` : 'Perbarui tulisan';
        await GH.putJSON('content/works.json', clean(S.works), msg);
      }
      if (albumsChanged) await GH.putJSON('content/albums.json', clean(S.albums), 'Perbarui album');
      if (siteChanged) {
        await GH.putJSON('content/site.json', S.site, 'Perbarui tampilan situs');
        if (manifestOf(S.site) !== manifestOf(JSON.parse(S.base.site || '{}'))) await GH.putJSON('manifest.webmanifest', JSON.parse(manifestOf(S.site)), 'Perbarui manifest aplikasi');
      }
      S.base = { site: snapSite(), works: snapWorks(), albums: snapAlbums() };
      S.works.forEach(w => { delete w._new; });
      S.albums.forEach(a => { delete a._autoId; });
      try { localStorage.removeItem(backupKey()); } catch (e) { /* */ }
      setStatus('clean', 'Tersimpan · situs diperbarui ±1 menit');
      btn.classList.remove('busy'); btn.classList.add('done'); btn.querySelector('.sb-label').textContent = 'Tersimpan';
      setTimeout(() => { btn.classList.remove('done'); btn.querySelector('.sb-label').textContent = 'Simpan'; }, 1800);
      renderList();
      toast('Tersimpan ke GitHub. Situs akan diperbarui dalam sekitar satu menit.');
    } catch (e) {
      btn.classList.remove('busy'); btn.disabled = false;
      setStatus('error', 'Gagal menyimpan');
      toast(e.message, true);
      if (e.status === 401) setTimeout(() => { GH.logout(); showLogin(e.message); }, 1200);
    }
  }
  function changedTitles() {
    let base = [];
    try { base = JSON.parse(S.base.works); } catch (e) { /* */ }
    const map = Object.fromEntries(base.map(w => [w.slug, JSON.stringify(w)]));
    return clean(S.works).filter(w => map[w.slug] !== JSON.stringify(w)).map(w => w.title || w.slug);
  }
  // nama dan deskripsi aplikasi saat dipasang di layar utama ikut pengaturan situs
  function manifestOf(site) {
    return JSON.stringify({
      name: site.title || 'Meja Tulis', short_name: (site.author || site.title || 'Tulis').slice(0, 12),
      description: site.description || '', lang: 'id', start_url: './', scope: './', display: 'standalone', orientation: 'any',
      background_color: '#ECE8F0', theme_color: '#C6D1EE',
      icons: [
        { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'assets/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ],
      shortcuts: [
        { name: 'Pilih piringan', url: './#pilih', icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'Sapa', url: './#sapa', icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }] }
      ]
    });
  }
  $('#saveBtn').addEventListener('click', save);
  addEventListener('beforeunload', e => { if (S.site && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ======================================================================
     TAB
     ====================================================================== */
  function setTab(t) {
    S.tab = t;
    $$('.tabs [data-tab]').forEach(b => b.setAttribute('aria-current', String(b.dataset.tab === t)));
    $$('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + t; });
    moveThumb();
    if (t === 'tampilan') { renderSettings(); pushPreview(true); }
    if (t === 'profil') { renderProfileForm(); pushPreview(true); requestAnimationFrame(fitPreview); }
    if (t === 'riwayat') renderHistory();
    if (t === 'album') renderAlbums();
  }
  function moveThumb() {
    const b = $(`.tabs [data-tab="${S.tab}"]`), th = $('.tabs-thumb');
    if (!b) return;
    th.style.setProperty('--x', b.offsetLeft + 'px');
    th.style.setProperty('--w', b.offsetWidth + 'px');
  }
  $('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  addEventListener('resize', debounce(() => { moveThumb(); fitPreview(); }, 120));

  $('#meBtn').addEventListener('click', e => {
    const m = $('#meMenu'); m.hidden = !m.hidden; e.currentTarget.setAttribute('aria-expanded', String(!m.hidden));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.top-r')) { $('#meMenu').hidden = true; $('#meBtn').setAttribute('aria-expanded', 'false'); } });
  $('#logoutBtn').addEventListener('click', () => {
    if (isDirty() && $('#logoutBtn').dataset.sure !== '1') { $('#logoutBtn').dataset.sure = '1'; $('#logoutBtn').textContent = 'Ada yang belum disimpan. Tetap keluar?'; return; }
    GH.logout(); location.reload();
  });
  $('#reloadBtn').addEventListener('click', async () => {
    if (isDirty() && $('#reloadBtn').dataset.sure !== '1') { $('#reloadBtn').dataset.sure = '1'; $('#reloadBtn').textContent = 'Buang perubahan dan muat ulang?'; return; }
    $('#reloadBtn').dataset.sure = ''; $('#reloadBtn').textContent = 'Muat ulang dari GitHub';
    $('#meMenu').hidden = true;
    try { await loadAll(); toast('Dimuat ulang dari GitHub.'); } catch (e) { toast(e.message, true); }
  });

  /* ======================================================================
     TULISAN: daftar
     ====================================================================== */
  const sortedWorks = () => [...S.works].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  function baseMap() { try { return Object.fromEntries(JSON.parse(S.base.works).map(w => [w.slug, JSON.stringify(w)])); } catch (e) { return {}; } }
  function renderFilter() {
    const used = new Set(S.works.map(w => w.cat));
    const opts = [['semua', 'Semua'], ['draf', 'Draf'], ...catList().filter(c => used.has(c.id)).map(c => [c.id, c.label])];
    $('#sideFilter').innerHTML = opts.map(([k, l]) => `<button class="chip" type="button" data-f="${esc(k)}" aria-pressed="${k === S.filter}">${esc(l)}</button>`).join('');
  }
  $('#sideFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { S.filter = b.dataset.f; renderFilter(); renderList(); } });
  $('#q').addEventListener('input', e => { S.q = e.target.value; renderList(); });
  function renderList() {
    const q = fold(S.q.trim());
    const list = sortedWorks().filter(w =>
      (S.filter === 'semua' || (S.filter === 'draf' ? w.draft : w.cat === S.filter)) &&
      (!q || fold(w.title + ' ' + allText(w) + ' ' + (w.en?.title || '')).includes(q)));
    const bm = baseMap();
    $('#workList').innerHTML = list.map((w, i) => {
      const c = catOf(w.cat);
      const dirty = bm[w.slug] !== JSON.stringify(clean([w])[0]);
      return `<li style="--k:${Math.min(i, 14)}"><button class="wl-item" type="button" data-slug="${esc(w.slug)}" aria-current="${w.slug === S.sel}">
        <div class="doc" aria-hidden="true"><div class="pg"></div><span class="tag${c.red ? ' red' : ''}">${esc(c.tag)}</span></div>
        <span class="wl-t">${wlText(w)}</span>
        ${dirty ? '<i class="wl-dot" title="belum disimpan"></i>' : '<span></span>'}
      </button></li>`;
    }).join('') || '<li class="hint" style="padding:12px">Tidak ada yang cocok.</li>';
    $('#emptyEd').hidden = S.works.length > 0;
    $('#paperCard').hidden = S.works.length === 0;
    $('#details').style.visibility = S.works.length ? '' : 'hidden';
  }
  function renderListDots() {
    const bm = baseMap();
    $$('#workList .wl-item').forEach(b => {
      const w = S.works.find(x => x.slug === b.dataset.slug);
      if (!w) return;
      const dirty = bm[w.slug] !== JSON.stringify(clean([w])[0]);
      const last = b.lastElementChild;
      if (dirty && !last.classList.contains('wl-dot')) last.outerHTML = '<i class="wl-dot" title="belum disimpan"></i>';
      if (!dirty && last.classList.contains('wl-dot')) last.outerHTML = '<span></span>';
      const t = b.querySelector('.wl-t');
      t.innerHTML = wlText(w);
      const tag = b.querySelector('.doc .tag'), c = catOf(w.cat);
      tag.textContent = c.tag; tag.classList.toggle('red', !!c.red);
    });
  }
  const wlText = w => `<b>${esc(w.title || 'Tanpa judul')}</b><span>${w.draft ? '<span class="pill-draft">draf</span>' : ''}${isCh(w) ? `<span class="pill-ab">${w.chapters.length} bab</span>` : sidesOf(w).length ? `<span class="pill-ab">${docsOf(w).map(d => d.label).join('/')}</span>` : ''}${w.en ? '<span class="pill-ab en">EN</span>' : ''}${esc(catOf(w.cat).label)} · ${bodyWords(w)} kata</span>`;
  $('#workList').addEventListener('click', e => { const b = e.target.closest('[data-slug]'); if (b) selectWork(b.dataset.slug); });

  function newWork() {
    let base = 'tulisan-baru', slug = base, i = 2;
    while (S.works.some(w => w.slug === slug)) slug = base + '-' + i++;
    const w = { slug, title: '', cat: catList()[0]?.id || 'esai', form: 'prosa', date: today(), time: nowTime(), draft: true, excerpt: '', line: '', body: [''], _autoSlug: true, _new: true };
    fitShape(w);
    S.works.push(w);
    S.filter = 'semua'; S.q = ''; $('#q').value = '';
    renderFilter();
    selectWork(slug);
    $('#edTitle').focus();
    changed();
  }
  $('#newWork').addEventListener('click', newWork);
  $('#emptyNew').addEventListener('click', newWork);

  /* ======================================================================
     TULISAN: penyunting
     ====================================================================== */
  const fromText = (t, form) => {
    const out = t.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      .map(b => (form === 'puisi' ? b.replace(/[ \t]+\n/g, '\n') : b.replace(/\s*\n\s*/g, ' ')));
    return out.length ? out : [''];
  };
  function grow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

  /* ---------- sisi, bab, dan bahasa ----------
     Sisi A tinggal di karya itu sendiri (title, sideTitle, pov, body); sisi B, C, … di w.sides.
     Novel dan novella memakai w.chapters = [{ title, body }] sebagai ganti body.
     Terjemahan Inggris ada di w.en dengan bentuk yang sama; yang kosong tampil dalam bahasa Indonesia. */
  const LETTERS = 'abcdefghijklmnop';
  const BOOKS = ['novel', 'novella'];
  const isCh = w => Array.isArray(w.chapters);
  const sidesOf = w => (Array.isArray(w.sides) ? w.sides : []);
  const allText = w => [...(w.body || []), ...sidesOf(w).flatMap(x => [x.title || '', ...(x.body || [])]), ...(w.chapters || []).flatMap(c => [c.title || '', ...(c.body || [])])].join(' ');
  const bodyWords = w => words([...(w.body || []), ...sidesOf(w).flatMap(x => x.body || []), ...(w.chapters || []).flatMap(c => c.body || [])].join(' '));
  // daftar dokumen sebuah karya: [{ key, label, title }]
  function docsOf(w) {
    if (isCh(w)) return w.chapters.map((c, i) => ({ key: w.slug + (i ? '~' + (i + 1) : ''), label: String(i + 1), title: (c.title || '').trim() || `Bab ${i + 1}` }));
    return [{ key: w.slug, label: 'A', title: (w.sideTitle || '').trim() || w.title || 'Tanpa judul' },
      ...sidesOf(w).map((x, i) => ({ key: w.slug + ':' + LETTERS[i + 1], label: LETTERS[i + 1].toUpperCase(), title: (x.title || '').trim() || w.title || 'Tanpa judul' }))];
  }
  // migrasi bentuk lama: sideB menjadi sides[0]
  function migrate(w) {
    if (w.sideB) { w.sides = [w.sideB, ...sidesOf(w)]; delete w.sideB; }
    if (w.en?.sideB) { w.en.sides = [w.en.sideB, ...(w.en.sides || [])]; delete w.en.sideB; }
    return w;
  }
  const layer = (w, make) => (S.lang === 'en' ? w.en || (make ? (w.en = {}) : {}) : w);
  // tempat isian yang sedang disunting: { title, pov, body } untuk sisi/bab dan bahasa yang dipilih
  function slot(w, make) {
    if (isCh(w)) {
      if (S.lang === 'id') return w.chapters[S.ch] || null;
      const L = layer(w, make); if (!L.chapters && !make) return null;
      const arr = L.chapters = L.chapters || [];
      while (arr.length <= S.ch) arr.push({});
      return arr[S.ch];
    }
    if (S.side === 'a') return layer(w, make);
    const i = LETTERS.indexOf(S.side) - 1;
    if (S.lang === 'id') return sidesOf(w)[i] || null;
    const L = layer(w, make); if (!L.sides && !make) return null;
    const arr = L.sides = L.sides || [];
    while (arr.length <= i) arr.push({});
    return arr[i];
  }
  // buang isian terjemahan yang kosong supaya works.json tetap rapi
  const emptyVal = v => (Array.isArray(v) ? !v.some(p => (typeof p === 'string' ? p.trim() : p && Object.keys(p).length)) : typeof v === 'object' && v ? !Object.keys(v).length : !String(v ?? '').trim());
  function tidy(w) {
    const e = w.en; if (!e) return;
    const strip = o => { Object.keys(o).forEach(k => { if (k === 'body' ? !(o.body || []).some(p => String(p).trim()) : typeof o[k] === 'string' && !o[k].trim()) delete o[k]; }); return o; };
    strip(e);
    ['sides', 'chapters'].forEach(k => {
      if (!Array.isArray(e[k])) return;
      e[k] = e[k].map(x => strip({ ...(x || {}) }));
      while (e[k].length && !Object.keys(e[k][e[k].length - 1]).length) e[k].pop();
      if (!e[k].length) delete e[k];
    });
    if (e.liner) { strip(e.liner); if (!Object.keys(e.liner).length) delete e.liner; }
    if (!Object.keys(e).length) delete w.en;
  }
  // ganti kunci album dan sorotan profil saat sisi/bab dihapus atau dipindah: map(lamaSuffix) → suffixBaru | null
  function remapKeys(slug, map) {
    const fix = list => list.map(k => {
      const m = k.match(/^([\w-]+?)((?::[b-p])?(?:~\d+)?)$/);
      if (!m || m[1] !== slug) return k;
      const n = map(m[2]); return n == null ? null : slug + n;
    }).filter(Boolean);
    S.albums.forEach(a => { a.tracks = fix(a.tracks); });
    const p = S.site.profile; if (p?.highlights) { p.highlights = fix(p.highlights); pruneProfile(); }
  }
  const chSuffix = i => (i ? '~' + (i + 1) : '');
  const chIndex = suf => (suf.startsWith('~') ? +suf.slice(1) - 1 : suf === '' ? 0 : -1);
  const sideIndex = suf => (suf === '' ? 0 : suf.startsWith(':') ? LETTERS.indexOf(suf[1]) : -1);

  function selectWork(slug, keepSide) {
    S.sel = slug;
    if (!keepSide) { S.side = 'a'; S.ch = 0; }
    const w = cur();
    renderList();
    if (!w) return;
    fillEditor();
    const pc = $('#paperCard'); pc.classList.remove('swap'); void pc.offsetWidth; pc.classList.add('swap');
    $('#edScroll').scrollTop = 0;
    renderDetails();
    pushPreview(true);
  }
  function renderSideTabs() {
    const w = cur(); if (!w) return;
    const ds = docsOf(w), ch = isCh(w), at = ch ? S.ch : LETTERS.indexOf(S.side);
    const filledIn = (i) => {
      const L = S.lang === 'en' ? w.en || {} : null;
      if (!L) return true;
      const o = ch ? (L.chapters || [])[i] : i ? (L.sides || [])[i - 1] : L;
      return !!(o && (o.body || []).some(p => String(p).trim()));
    };
    $('#edSide').setAttribute('aria-label', ch ? 'Bab' : 'Sisi piringan');
    $('#edSide').innerHTML = ds.map((d, i) => `<button type="button" role="tab" data-i="${i}" aria-checked="${i === at}" title="${esc(d.title)}">${ch ? d.label : 'Sisi ' + d.label}${S.lang === 'en' ? `<i class="side-dot${filledIn(i) ? '' : ' off'}"></i>` : ''}</button>`).join('');
    $('#edAdd').title = ch ? 'Tambah bab' : `Tambah Sisi ${LETTERS[ds.length].toUpperCase()}`;
    $('#edAdd').setAttribute('aria-label', $('#edAdd').title);
    $('#edAdd').hidden = S.lang === 'en' || ds.length >= LETTERS.length;
  }
  function fillEditor() {
    const w = cur(); if (!w) return;
    const ch = isCh(w), side = !ch && S.side !== 'a', en = S.lang === 'en';
    if (ch) S.ch = Math.min(S.ch, w.chapters.length - 1);
    if (!ch && side && !sidesOf(w)[LETTERS.indexOf(S.side) - 1]) S.side = 'a';
    const d = slot(w) || {}, base = ch ? w.chapters[S.ch] : side ? sidesOf(w)[LETTERS.indexOf(S.side) - 1] : w;
    const no = ch ? S.ch + 1 : 0, L = LETTERS.indexOf(S.side);
    $('#edTitle').value = d.title || '';
    $('#edTitle').placeholder = en ? (base.title || (ch ? `Bab ${no}` : 'Judul')) + ' (dalam bahasa Inggris)'
      : ch ? `Judul bab ${no} (boleh kosong)` : side ? `Judul Sisi ${S.side.toUpperCase()} (kosong = “${w.title || 'sama dengan Sisi A'}”)` : 'Judul';
    $('#edBody').value = (d.body || []).join('\n\n');
    $('#edBody').placeholder = en ? 'Terjemahan bahasa Inggris… Kosongkan untuk menampilkan versi Indonesia.'
      : ch ? `Isi bab ${no}… Pisahkan paragraf dengan satu baris kosong. Tulis *** di satu baris untuk pindah adegan.`
      : side ? 'Cerita yang sama, dari sisi yang lain… Pisahkan paragraf dengan satu baris kosong.' : 'Mulai menulis… Pisahkan paragraf (atau bait) dengan satu baris kosong.';
    $('#edBody').dataset.form = w.form;
    $('#edPovRow').hidden = ch;
    $('#edPov').value = d.pov || '';
    $('#edPov').placeholder = en ? (base.pov || 'siapa yang bercerita?') + ' (dalam bahasa Inggris)' : side ? 'misalnya: anaknya, si penjual, kucing tetangga' : 'siapa yang bercerita? (boleh kosong)';
    $('#edNameRow').hidden = ch || side || !sidesOf(w).length;
    $('#edName').value = d.sideTitle || '';
    $('#edName').placeholder = en ? (w.sideTitle || 'nama sisi A') + ' (dalam bahasa Inggris)' : `misalnya: Bidak (kosong = “${w.title || 'judul karya'}”)`;
    // catatan di bawah judul: penjelasan dan aksi untuk sisi/bab ini
    const n = ch ? w.chapters.length : sidesOf(w).length + 1;
    let note = '', acts = '';
    if (en) note = ch ? `Terjemahan bab ${no}. Bagian yang kosong tampil dalam bahasa Indonesia, dengan catatan kecil untuk pembaca.` : `Terjemahan ${side || n > 1 ? 'Sisi ' + S.side.toUpperCase() : 'tulisan ini'}. Bagian yang kosong tampil dalam bahasa Indonesia, dengan catatan kecil untuk pembaca.`;
    else if (ch) {
      note = `Bab ${no} dari ${n}. Pembaca bisa membuka bab mana saja dan bab berikutnya menyusul otomatis.`;
      acts = `<button type="button" data-act="left" ${S.ch ? '' : 'disabled'}>← Geser</button><button type="button" data-act="right" ${S.ch < n - 1 ? '' : 'disabled'}>Geser →</button>${n > 1 ? '<button type="button" data-act="del-ch" class="red">Hapus bab ini</button>' : ''}`;
    } else if (side) {
      note = `Sisi ${S.side.toUpperCase()} adalah cerita yang sama, diceritakan dari sisi yang lain. Pembaca bisa membalik piringannya kapan saja.`;
      acts = `<button type="button" data-act="del-side" class="red">Hapus Sisi ${S.side.toUpperCase()}</button>`;
    }
    $('#edSideNote').hidden = !note;
    $('#edSideNote').innerHTML = `<span>${note}</span>${acts ? `<span class="sn-acts">${acts}</span>` : ''}`;
    $('#mkLine').hidden = side || ch;
    $$('#edLang [data-l]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.l === S.lang)));
    renderSideTabs();
    $('#paperCard').dataset.side = ch ? 'ch' : S.side;
    $('#paperCard').dataset.lang = S.lang;
    grow($('#edTitle')); grow($('#edBody'));
    renderCount();
  }
  function flipCard() { const pc = $('#paperCard'); pc.classList.remove('flip'); void pc.offsetWidth; pc.classList.add('flip'); $('#edScroll').scrollTop = 0; }
  function setSide(i) {
    const w = cur(); if (!w) return;
    if (isCh(w)) { if (i === S.ch) return; S.ch = i; } else { const l = LETTERS[i]; if (l === S.side) return; S.side = l; }
    flipCard(); fillEditor(); pushPreview(true);
  }
  $('#edSide').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) setSide(+b.dataset.i); });
  $('#edAdd').addEventListener('click', () => {
    const w = cur(); if (!w) return;
    if (isCh(w)) { w.chapters.push({ title: '', body: [''] }); S.ch = w.chapters.length - 1; }
    else { w.sides = [...sidesOf(w), { title: '', pov: '', body: [''] }]; S.side = LETTERS[w.sides.length]; }
    flipCard(); fillEditor(); renderList(); changed(); $('#edTitle').focus();
  });
  $('#edLang').addEventListener('click', e => {
    const b = e.target.closest('[data-l]'); if (!b || b.dataset.l === S.lang) return;
    S.lang = b.dataset.l; flipCard(); fillEditor(); renderDetails(); pushPreview(true);
  });
  $('#edSideNote').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'), w = cur(); if (!b || !w) return;
    const act = b.dataset.act;
    if (act === 'del-side') {
      const i = LETTERS.indexOf(S.side) - 1, gone = sidesOf(w)[i];
      if ((gone.body || []).some(p => p.trim()) && !confirm(`Hapus Sisi ${S.side.toUpperCase()}${gone.title ? ' “' + gone.title + '”' : ''}? Isinya hilang setelah disimpan.`)) return;
      w.sides.splice(i, 1); if (!w.sides.length) delete w.sides;
      if (w.en?.sides) w.en.sides.splice(i, 1);
      remapKeys(w.slug, suf => { const k = sideIndex(suf); return k < 0 || k < i + 1 ? suf : k === i + 1 ? null : ':' + LETTERS[k - 1]; });
      S.side = LETTERS[i] || 'a';
      toast('Sisi dihapus. Tekan Simpan untuk menerapkan.');
    } else if (act === 'del-ch') {
      const i = S.ch, gone = w.chapters[i];
      if ((gone.body || []).some(p => p.trim()) && !confirm(`Hapus bab ${i + 1}${gone.title ? ' “' + gone.title + '”' : ''}? Isinya hilang setelah disimpan.`)) return;
      w.chapters.splice(i, 1); if (w.en?.chapters) w.en.chapters.splice(i, 1);
      remapKeys(w.slug, suf => { const k = chIndex(suf); return k < 0 || k < i ? suf : k === i ? null : chSuffix(k - 1); });
      S.ch = Math.max(0, i - 1);
    } else if (act === 'left' || act === 'right') {
      const i = S.ch, j = i + (act === 'left' ? -1 : 1);
      [w.chapters[i], w.chapters[j]] = [w.chapters[j], w.chapters[i]];
      if (w.en?.chapters) { const c = w.en.chapters; while (c.length <= Math.max(i, j)) c.push({}); [c[i], c[j]] = [c[j], c[i]]; }
      remapKeys(w.slug, suf => { const k = chIndex(suf); return k === i ? chSuffix(j) : k === j ? chSuffix(i) : suf; });
      S.ch = j;
    }
    tidy(w); flipCard(); fillEditor(); renderList(); changed(); pushPreview(true);
  });
  // novel dan novella menyimpan isinya per bab; jenis lain kembali ke satu isi kalau babnya tinggal satu
  function fitShape(w) {
    if (BOOKS.includes(w.cat) && !isCh(w)) {
      const sides = sidesOf(w);
      w.chapters = [{ title: (w.sideTitle || '').trim(), body: w.body?.length ? w.body : [''] }, ...sides.map(x => ({ title: (x.title || '').trim(), body: x.body || [''] }))];
      if (w.en) {
        const e = w.en, ch = [{ title: e.sideTitle, body: e.body }, ...(e.sides || []).map(x => ({ title: x.title, body: x.body }))];
        if (ch.some(c => c && (c.title || (c.body || []).length))) e.chapters = ch.map(c => c || {});
        delete e.body; delete e.sides; delete e.sideTitle; delete e.pov;
      }
      remapKeys(w.slug, suf => { const k = sideIndex(suf); return k < 0 ? suf : chSuffix(k); });
      delete w.body; delete w.sides; delete w.sideTitle; delete w.pov;
      S.ch = 0; S.side = 'a';
      if (sides.length) toast(`Sisi-sisinya kini menjadi ${sides.length + 1} bab.`);
      tidy(w);
    } else if (!BOOKS.includes(w.cat) && isCh(w) && w.chapters.length <= 1) {
      w.body = w.chapters[0]?.body || [''];
      if (w.en?.chapters) { if (w.en.chapters[0]?.body) w.en.body = w.en.chapters[0].body; delete w.en.chapters; }
      delete w.chapters; S.ch = 0;
      tidy(w);
    }
  }
  function renderCount() {
    const w = cur(); if (!w) return;
    const d = slot(w) || { body: [] }, ch = isCh(w);
    const n = words((d.body || []).join(' '));
    const paras = (d.body || []).filter(p => p.trim() && /[\p{L}\p{N}]/u.test(p)).length;
    const where = ch ? `Bab ${S.ch + 1} · ` : sidesOf(w).length ? `Sisi ${S.side.toUpperCase()} · ` : '';
    $('#edCount').textContent = `${S.lang === 'en' ? 'EN · ' : ''}${where}${n.toLocaleString('id-ID')} kata · ${Math.max(1, Math.round(n / 170))} menit baca · ${paras} ${w.form === 'puisi' ? 'bait' : 'paragraf'}${ch ? ` · ${bodyWords(w).toLocaleString('id-ID')} kata semuanya` : ''}`;
    const pov = d.pov || '';
    $('#edMeta').textContent = `${ch ? (w.title || 'Tanpa judul') : where ? where.slice(0, -3) : catOf(w.cat).label}${pov ? ' · dari sisi ' + pov : ''} · ${new Date(w.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}${w.draft ? ' · draf' : ''}`;
  }
  // judul sisi A dan judul karya adalah hal yang sama; mengganti judul karya bisa mengganti alamatnya
  function setWorkTitle(w, v) {
    if (S.lang === 'en') { layer(w, true).title = v; tidy(w); return; }
    w.title = v;
    if (w._autoSlug) {
      let base = slugify(w.title) || 'tulisan-baru', slug = base, i = 2;
      while (S.works.some(x => x !== w && x.slug === slug)) slug = base + '-' + i++;
      if (w.slug !== slug) { renameInAlbums(w.slug, slug); w.slug = slug; S.sel = slug; $('#dSlug').value = slug; renderList(); }
    }
  }
  $('#edTitle').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    const v = e.target.value.replace(/\n/g, ' ');
    if (!isCh(w) && S.side === 'a') setWorkTitle(w, v);
    else { slot(w, true).title = v; tidy(w); renderSideTabs(); }
    grow(e.target); renderListDots(); changed();
  });
  $('#edTitle').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ($('#edNameRow').hidden ? $('#edPovRow').hidden ? $('#edBody') : $('#edPov') : $('#edName')).focus(); } });
  $('#edName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#edPov').focus(); } });
  $('#edPov').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#edBody').focus(); } });
  $('#edName').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    const o = layer(w, true), v = e.target.value;
    if (v.trim()) o.sideTitle = v; else delete o.sideTitle;
    tidy(w); renderSideTabs(); changed();
  });
  $('#edPov').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    const o = slot(w, true), v = e.target.value;
    if (v.trim() || S.side !== 'a' && S.lang === 'id') o.pov = v; else delete o.pov;
    tidy(w); renderCount(); changed();
  });
  $('#edBody').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    slot(w, true).body = fromText(e.target.value, w.form);
    tidy(w); if (S.lang === 'en') renderSideTabs();
    grow(e.target); renderCount(); changed();
  });

  function wrapSel(mark) {
    const ta = $('#edBody'), a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
    const sel = v.slice(a, b) || 'teks';
    const already = v.slice(a - mark.length, a) === mark && v.slice(b, b + mark.length) === mark;
    if (already) { ta.setRangeText(sel, a - mark.length, b + mark.length, 'select'); }
    else { ta.setRangeText(mark + sel + mark, a, b, 'end'); ta.setSelectionRange(a + mark.length, a + mark.length + sel.length); }
    ta.focus(); ta.dispatchEvent(new Event('input'));
  }
  $('.ed-toolbar').addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (b) wrapSel(b.dataset.fmt === 'b' ? '**' : '*'); });
  $('#mkLine').addEventListener('click', () => {
    const ta = $('#edBody'), t = plain(ta.value.slice(ta.selectionStart, ta.selectionEnd)).replace(/\s+/g, ' ').trim();
    if (!t) { toast('Pilih dulu satu kalimat di tulisanmu.'); return; }
    const w = cur(); layer(w, true).line = t.slice(0, 160); $('#dLine').value = t.slice(0, 160); tidy(w); changed();
    toast('Baris favorit diperbarui.');
  });
  $('#zenBtn').addEventListener('click', () => setZen(!$('#app').classList.contains('zen')));
  function setZen(on) { $('#app').classList.toggle('zen', on); $('#zenBtn').setAttribute('aria-pressed', String(on)); if (on) $('#edBody').focus(); }
  $('#previewBtn').addEventListener('click', () => {
    const on = $('#previewPane').hidden;
    $('#previewPane').hidden = !on;
    $('#editorWrap').classList.toggle('split', on);
    $('#previewBtn').setAttribute('aria-pressed', String(on));
    if (on) pushPreview(true);
  });

  /* ---------- detail ---------- */
  function renderDetails() {
    const w = cur(); if (!w) return;
    $('#dPub').setAttribute('aria-checked', String(!w.draft));
    $('#pubHint').textContent = w.draft ? 'Draf tidak tampil di situs.' : 'Tampil di situs setelah disimpan.';
    $('#dCat').innerHTML = catList().map(c => `<button class="chip" type="button" role="radio" data-v="${esc(c.id)}" aria-checked="${c.id === w.cat}" style="--c:${esc(c.ink)}"><i></i>${esc(c.label)}</button>`).join('');
    $$('#dForm [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === w.form)));
    $('#dDate').value = w.date; $('#dTime').value = w.time || '';
    $('#dSlug').value = w.slug; $('#slugErr').hidden = true;
    const L = layer(w), en = S.lang === 'en';
    $('#dWorkTitleRow').hidden = !isCh(w);
    $('#dWorkTitle').value = L.title || ''; $('#dWorkTitle').placeholder = en ? (w.title || '') + ' (dalam bahasa Inggris)' : 'Judul novel';
    $('#dExcerpt').value = L.excerpt || ''; $('#dLine').value = L.line || '';
    $('#dExcerpt').placeholder = en ? 'Ringkasan dalam bahasa Inggris (kosong = pakai versi Indonesia).' : 'Muncul di kartu dan hasil cari.';
    $('#dLine').placeholder = en ? 'Baris favorit dalam bahasa Inggris.' : 'Muncul di panel sapa dan kartu kutipan.';
    $$('[data-ln]').forEach(el => { const tr = el.dataset.ln === 'story'; el.value = ((tr ? L : w).liner || {})[el.dataset.ln] || ''; el.closest('label').hidden = en && !tr; });
    $$('.d-en').forEach(el => { el.hidden = !en; });
    $('#delConfirm').hidden = true; $('#delBtn').hidden = false;
  }
  const flip = (btn, key, invert) => { const w = cur(); const on = btn.getAttribute('aria-checked') !== 'true'; btn.setAttribute('aria-checked', String(on)); w[key] = invert ? !on : on; };
  $('#dPub').addEventListener('click', e => { flip(e.currentTarget, 'draft', true); renderDetails(); renderCount(); changed(); });
  $('#dCat').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const w = cur(); w.cat = b.dataset.v; fitShape(w); fillEditor(); renderDetails(); renderList(); changed(); });
  $('#dForm').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const w = cur(); w.form = b.dataset.v;
    const o = slot(w); if (o) o.body = fromText($('#edBody').value, w.form);
    renderDetails(); renderCount(); changed();
  });
  $('#dDate').addEventListener('change', e => { if (e.target.value) { cur().date = e.target.value; renderCount(); changed(); } });
  $('#dTime').addEventListener('change', e => { cur().time = e.target.value; changed(); });
  $('#dSlug').addEventListener('input', e => {
    const w = cur(), v = e.target.value.trim();
    const err = !/^[a-z0-9-]+$/.test(v) ? 'Hanya huruf kecil, angka, dan tanda hubung.' : S.works.some(x => x !== w && x.slug === v) ? 'Alamat ini sudah dipakai tulisan lain.' : '';
    $('#slugErr').hidden = !err; $('#slugErr').textContent = err;
    if (!err) { renameInAlbums(w.slug, v); w.slug = v; S.sel = v; delete w._autoSlug; renderList(); changed(); }
  });
  $('#dExcerpt').addEventListener('input', e => { const w = cur(); layer(w, true).excerpt = e.target.value; tidy(w); changed(); });
  $('#dLine').addEventListener('input', e => { const w = cur(); layer(w, true).line = e.target.value; tidy(w); changed(); });
  $('#dWorkTitle').addEventListener('input', e => { const w = cur(); setWorkTitle(w, e.target.value); renderListDots(); renderCount(); changed(); });
  // catatan sampul: isian kosong dibuang supaya works.json tetap rapi
  $$('[data-ln]').forEach(el => el.addEventListener('input', e => {
    const w = cur(); if (!w) return;
    const host = S.lang === 'en' && e.target.dataset.ln === 'story' ? layer(w, true) : w;
    const L = { ...(host.liner || {}), [e.target.dataset.ln]: e.target.value };
    Object.keys(L).forEach(k => { if (!String(L[k]).trim()) delete L[k]; });
    if (Object.keys(L).length) host.liner = L; else delete host.liner;
    tidy(w); changed();
  }));
  $('#autoExcerpt').addEventListener('click', () => {
    const w = cur(), L = layer(w);
    const first = isCh(w) ? (S.lang === 'en' ? (L.chapters || [])[0]?.body : w.chapters[0]?.body) : L.body;
    const t = plain((first || []).find(p => p.trim() && /[\p{L}]/u.test(p)) || '').replace(/\s+/g, ' ');
    if (!t) { toast(S.lang === 'en' ? 'Isi terjemahannya dulu.' : 'Tulis isinya dulu.'); return; }
    const cut = t.length > 150 ? t.slice(0, t.lastIndexOf(' ', 150)) + '…' : t;
    layer(w, true).excerpt = cut; $('#dExcerpt').value = cut; tidy(w); changed();
  });
  $('#delBtn').addEventListener('click', () => { $('#delBtn').hidden = true; $('#delConfirm').hidden = false; $('#delNo').focus(); });
  $('#delNo').addEventListener('click', () => { $('#delConfirm').hidden = true; $('#delBtn').hidden = false; });
  $('#delYes').addEventListener('click', () => {
    const w = cur(); if (!w) return;
    S.works = S.works.filter(x => x !== w);
    remapKeys(w.slug, () => null);
    toast(`“${w.title || 'Tanpa judul'}” dihapus. Tekan Simpan untuk menerapkan.`);
    S.sel = sortedWorks()[0]?.slug || null;
    renderFilter();
    if (S.sel) selectWork(S.sel); else renderList();
    changed();
  });

  /* ======================================================================
     PRATINJAU (iframe situs dengan ?preview=1 membaca jm:preview)
     ====================================================================== */
  let pvDevice = 'desktop';
  function previewPayload() {
    const site = { ...S.site };
    if (S.avatarData && site.avatar) site.avatar = S.avatarData;
    return { site, works: clean(S.works), albums: clean(S.albums) };
  }
  const pushPreview = debounce(force => {
    if (!S.site) return;
    try { localStorage.setItem('jm:preview', JSON.stringify(previewPayload())); } catch (e) { return; }
    const w = cur();
    if (!$('#previewPane').hidden) {
      const src = '../?preview=1' + (S.lang === 'en' ? '&lang=en' : '&lang=id') + '#baca-' + (w ? w.slug + (isCh(w) ? (S.ch ? '~' + (S.ch + 1) : '') : S.side !== 'a' ? ':' + S.side : '') : '');
      const f = $('#previewFrame');
      if (force || !f.src.endsWith(src.slice(2))) f.src = src; else f.contentWindow?.location.reload();
    }
    if (S.tab === 'tampilan') {
      const f = $('#pvFrame');
      if (!f.src || force) f.src = '../?preview=1'; else f.contentWindow?.location.reload();
    }
    if (S.tab === 'profil') {
      const f = $('#prFrame');
      if (!f.src || force) f.src = '../?preview=1#tentang'; else f.contentWindow?.location.reload();
    }
  }, 700);

  let prDevice = 'desktop';
  function fitPreview() {
    [['#pvFrameBox', '#pvStage', pvDevice], ['#prFrameBox', '#prStage', prDevice]].forEach(([b, st, dev]) => {
      const box = $(b), stage = $(st);
      if (!box || !stage.clientWidth) return;
      const [w, h] = dev === 'phone' ? [390, 844] : [1440, 900];
      const s = Math.min((stage.clientWidth - 40) / w, (stage.clientHeight - 40) / h, 1);
      box.style.width = w + 'px'; box.style.height = h + 'px';
      box.style.transform = `translate(-50%, -50%) scale(${s})`;
      box.classList.toggle('phone', dev === 'phone');
    });
  }
  $('#prDevice').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    prDevice = b.dataset.v;
    $$('#prDevice [data-v]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    fitPreview();
  });
  $('#pvDevice').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    pvDevice = b.dataset.v;
    $$('#pvDevice [data-v]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    fitPreview();
  });

  /* ======================================================================
     TAMPILAN
     ====================================================================== */
  function renderSettings() {
    const s = S.site;
    $$('[data-k]', $('#setCol')).forEach(el => {
      const k = el.dataset.k;
      if (el.matches('input, textarea, select')) { el.value = s[k] ?? ''; return; }
      if (el.classList.contains('seg')) {
        el.innerHTML = el.dataset.opts.split(',').map(o => { const [v, l] = o.split(':'); return `<button type="button" role="radio" data-v="${v}" aria-checked="${s[k] === v}">${l}</button>`; }).join('');
      }
      if (el.classList.contains('swatches')) {
        const presets = el.dataset.presets.split(',');
        const val = (s[k] || presets[0]).toUpperCase();
        el.innerHTML = presets.map(c => `<button type="button" role="radio" data-v="${c}" aria-label="${c}" aria-checked="${c.toUpperCase() === val}" style="--sw:${c}"></button>`).join('') +
          `<label title="Warna lain"><span class="sr-only">Warna lain</span><input type="color" value="${esc(val)}"></label>`;
      }
    });
    $('#sFonts').innerHTML = FONTS.map(f => `<button type="button" role="radio" data-v="${f.id}" aria-checked="${s.readerFont === f.id}"><b style="font-family:${f.css}">Aa</b><small>${f.name}</small></button>`).join('');
    $$('[data-f]', $('#setCol')).forEach(b => b.setAttribute('aria-checked', String(!!s.features[b.dataset.f])));
    renderAvatar(); renderCats(); fillEn($('#setCol'));
    requestAnimationFrame(fitPreview);
  }
  // terjemahan Inggris situs dan profil: site.en.title, site.en.profile.bio, …; isian kosong dibuang
  const enGet = path => path.split('.').reduce((o, k) => (o ? o[k] : undefined), S.site.en) ?? '';
  function enSet(path, v) {
    const keys = path.split('.'), en = S.site.en = S.site.en || {};
    let o = en; keys.slice(0, -1).forEach(k => { o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}; });
    o[keys[keys.length - 1]] = v;
    const prune = x => { Object.keys(x).forEach(k => { if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) { prune(x[k]); if (!Object.keys(x[k]).length) delete x[k]; } else if (typeof x[k] === 'string' && !x[k].trim()) delete x[k]; }); };
    prune(en); if (!Object.keys(en).length) delete S.site.en;
  }
  const fillEn = host => $$('[data-en]', host).forEach(el => { el.value = enGet(el.dataset.en); });
  ['#setCol', '#prCol'].forEach(id => $(id).addEventListener('input', e => { if (e.target.dataset.en) { enSet(e.target.dataset.en, e.target.value); changed(); } }));
  const setCol = $('#setCol');
  setCol.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-k]')) { if (el.value || el.tagName !== 'SELECT') S.site[el.dataset.k] = el.value; else delete S.site[el.dataset.k]; changed(); return; }
    if (el.type === 'color' && el.closest('.swatches')) {
      const sw = el.closest('.swatches'); S.site[sw.dataset.k] = el.value.toUpperCase();
      $$('button', sw).forEach(b => b.setAttribute('aria-checked', 'false')); changed();
    }
  });
  setCol.addEventListener('click', e => {
    const seg = e.target.closest('.seg[data-k] [data-v]');
    if (seg) { const k = seg.parentElement.dataset.k; S.site[k] = seg.dataset.v; $$('[data-v]', seg.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === seg))); changed(); return; }
    const sw = e.target.closest('.swatches [data-v]');
    if (sw) { const k = sw.parentElement.dataset.k; S.site[k] = sw.dataset.v; $$('button', sw.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === sw))); changed(); return; }
    const f = e.target.closest('#sFonts [data-v]');
    if (f) { S.site.readerFont = f.dataset.v; $$('#sFonts [data-v]').forEach(b => b.setAttribute('aria-checked', String(b === f))); changed(); return; }
    const ft = e.target.closest('.switch[data-f]');
    if (ft) { const on = ft.getAttribute('aria-checked') !== 'true'; ft.setAttribute('aria-checked', String(on)); S.site.features = { ...S.site.features, [ft.dataset.f]: on }; changed(); }
  });

  // foto profil: dipotong persegi, diperkecil, diunggah langsung sebagai berkas media
  function renderAvatar() {
    const src = S.avatarData || (S.site.avatar ? '../' + S.site.avatar : '');
    $('#avPrev').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '';
    $('#avDel').hidden = !S.site.avatar;
  }
  $('#avIn').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Pilih berkas gambar.', true); return; }
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
      const N = 320, c = document.createElement('canvas'); c.width = c.height = N;
      const m = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, N, N);
      const dataUrl = c.toDataURL('image/jpeg', .88);
      S.avatarData = dataUrl;
      renderAvatar();
      toast('Mengunggah foto…');
      await GH.putRaw('content/media/avatar.jpg', dataUrl.split(',')[1], 'Perbarui foto profil');
      S.site.avatar = 'content/media/avatar.jpg?v=' + Date.now().toString(36);
      renderAvatar(); changed();
      toast('Foto terunggah. Tekan Simpan supaya situs memakainya.');
    } catch (err) { toast(err.message || 'Foto gagal diunggah.', true); }
  });
  $('#avDel').addEventListener('click', () => { S.site.avatar = ''; S.avatarData = null; renderAvatar(); changed(); });

  function renderCats() {
    const used = new Set(S.works.map(w => w.cat));
    $('#catEditor').innerHTML = catList().map((c, i) => `
      <div class="cat-row" data-i="${i}">
        <span class="cat-color" style="--c:${esc(c.ink)}"><input type="color" value="${esc(c.ink)}" aria-label="Warna benang ${esc(c.label)}" data-ck="ink"></span>
        <input type="text" value="${esc(c.label)}" aria-label="Nama jenis" data-ck="label">
        <input type="text" class="tagin" value="${esc(c.tag)}" maxlength="8" aria-label="Label ikon" data-ck="tag">
        <label class="cat-red"><input type="checkbox" ${c.red ? 'checked' : ''} data-ck="red"> merah</label>
        <button type="button" class="cat-del" aria-label="Hapus jenis ${esc(c.label)}" ${used.has(c.id) ? 'disabled title="Masih dipakai tulisan"' : ''}>×</button>
      </div>`).join('');
  }
  $('#catEditor').addEventListener('input', e => {
    const row = e.target.closest('.cat-row'); if (!row) return;
    const c = S.site.categories[+row.dataset.i], k = e.target.dataset.ck;
    c[k] = k === 'red' ? e.target.checked : k === 'tag' ? e.target.value.toUpperCase() : e.target.value;
    if (k === 'ink') row.querySelector('.cat-color').style.setProperty('--c', e.target.value);
    changed();
  });
  $('#catEditor').addEventListener('click', e => {
    const b = e.target.closest('.cat-del'); if (!b || b.disabled) return;
    S.site.categories.splice(+b.closest('.cat-row').dataset.i, 1); renderCats(); changed();
  });
  $('#addCat').addEventListener('click', () => {
    let id = 'jenis-baru', i = 2;
    while (catList().some(c => c.id === id)) id = 'jenis-baru-' + i++;
    S.site.categories = [...catList(), { id, label: 'Jenis baru', tag: 'BARU', ink: '#111214', red: false }];
    renderCats(); changed();
    $('#catEditor .cat-row:last-child input[data-ck="label"]').select();
  });
  /* ======================================================================
     ALBUM: urutan sisi (A atau B) yang diputar berurutan di situs
     ====================================================================== */
  const curAlbum = () => S.albums.find(a => a.id === S.selAlbum);
  function renameInAlbums(from, to) {
    if (!from || from === to) return;
    const hl = S.site.profile?.highlights;
    const ren = k => { const m = k.match(/^([\w-]+?)((?::[b-p])?(?:~\d+)?)$/); return m && m[1] === from ? to + m[2] : k; };
    if (hl) S.site.profile.highlights = hl.map(ren);
    S.albums.forEach(a => { a.tracks = a.tracks.map(ren); });
  }
  // kunci: slug (sisi A / bab 1), slug:b, slug:c, …, slug~2 (bab 2)
  function trackDoc(k) {
    const m = String(k).match(/^([\w-]+?)(?::([b-p]))?(?:~(\d+))?$/), w = m && S.works.find(x => x.slug === m[1]);
    if (!w) return null;
    if (isCh(w)) {
      const i = (+m[3] || 1) - 1, c = w.chapters[i];
      return c && !m[2] ? { w, side: 'a', ch: i + 1, label: String(i + 1), title: (c.title || '').trim() || `Bab ${i + 1}`, pov: '', n: words((c.body || []).join(' ')) } : null;
    }
    if (m[3]) return null;
    if (m[2]) {
      const x = sidesOf(w)[LETTERS.indexOf(m[2]) - 1];
      return x ? { w, side: m[2], label: m[2].toUpperCase(), title: (x.title || '').trim() || w.title, pov: x.pov || '', n: words((x.body || []).join(' ')) } : null;
    }
    return { w, side: 'a', label: 'A', title: (w.sideTitle || '').trim() || w.title || 'Tanpa judul', pov: w.pov || '', n: words((w.body || []).join(' ')) };
  }
  const trackWhere = d => (d.ch ? `Bab ${d.ch}` : `Sisi ${d.label}`) + (d.title !== d.w.title ? ' · ' + d.w.title : '');
  // sama seperti di situs: tiap sisi dibulatkan ke menit, minimal satu
  const albumMins = a => a.tracks.map(trackDoc).filter(Boolean).reduce((n, d) => n + Math.max(1, Math.round(d.n / 170)), 0);
  const tile = d => (d ? `<i style="--c:${esc(catOf(d.w.cat).ink)}" class="${d.side !== 'a' || d.ch > 1 ? 'b' : ''}"></i>` : '<i></i>');
  function coverTiles(a) {
    const ds = a.tracks.map(trackDoc).filter(Boolean);
    const picks = ds.length >= 4 ? ds.slice(0, 4) : ds.length === 1 ? [ds[0]] : ds.length ? [ds[0], ds[1], ds[1], ds[0]] : [];
    return `<span class="mos${picks.length === 1 ? ' one' : ''}">${picks.map(tile).join('') || '<i></i>'}</span>`;
  }
  function renderAlbumList() {
    $('#albumList').innerHTML = S.albums.map((a, i) => {
      const mins = albumMins(a);
      return `<li style="--k:${i}"><button class="wl-item" type="button" data-album="${esc(a.id)}" aria-current="${a.id === S.selAlbum}">
        ${coverTiles(a)}<span class="wl-t"><b>${esc(a.title || 'Album tanpa judul')}</b><span>${a.tracks.length} sisi · ${mins} menit</span></span><span></span></button></li>`;
    }).join('');
  }
  function renderAlbums() {
    if (S.selAlbum && !curAlbum()) S.selAlbum = S.albums[0]?.id || null;
    renderAlbumList();
    const a = curAlbum();
    $('#aeEmpty').hidden = !!a; $('#aeCard').hidden = !a;
    $('.ae-pool').style.visibility = a ? '' : 'hidden';
    if (!a) return;
    $('#aeTitle').value = a.title; $('#aeId').value = a.id; $('#aeNote').value = a.note || '';
    $('#aeIdErr').hidden = true;
    $('#aeDelConfirm').hidden = true; $('#aeDel').hidden = false;
    renderTracks(); renderPool();
  }
  function renderTracks() {
    const a = curAlbum(); if (!a) return;
    $('#aeCover').innerHTML = coverTiles(a);
    const ds = a.tracks.map(trackDoc);
    $('#aeLen').textContent = `${a.tracks.length} sisi · ${albumMins(a)} menit`;
    $('#aePreview').href = '../?preview=1#album-' + a.id;
    $('#aeTracks').innerHTML = a.tracks.map((k, i) => {
      const d = ds[i];
      return `<li draggable="true" data-i="${i}" class="${d ? '' : 'gone'}">
        <span class="ae-grip" aria-hidden="true">⋮⋮</span><span class="ae-no">${i + 1}</span>${tile(d)}
        <span class="ae-t"><b>${d ? esc(d.title) : esc(k)}</b><small>${d ? esc(trackWhere(d)) + (d.pov ? ' · dari sisi ' + esc(d.pov) : '') + ' · ' + esc(catOf(d.w.cat).label) : 'Tidak ditemukan. Mungkin tulisannya, sisinya, atau babnya sudah dihapus.'}</small></span>
        <span class="ae-btns"><button type="button" data-mv="-1" aria-label="Naikkan" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-mv="1" aria-label="Turunkan" ${i === a.tracks.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-rm aria-label="Keluarkan dari album">×</button></span></li>`;
    }).join('') || '<li class="ae-none">Belum ada sisi. Tambahkan dari daftar di kanan.</li>';
  }
  function renderPool() {
    const a = curAlbum(); if (!a) return;
    const q = fold($('#aeQ').value.trim());
    const list = sortedWorks().filter(w => !q || fold(w.title + ' ' + docsOf(w).map(d => d.title).join(' ')).includes(q));
    $('#aePool').innerHTML = list.map(w => {
      const ch = isCh(w);
      return `<li><span class="ae-t"><b>${esc(w.title || 'Tanpa judul')}</b><small>${esc(catOf(w.cat).label)}${ch ? ` · ${w.chapters.length} bab` : ''}${w.draft ? ' · draf' : ''}</small></span>
        <span class="ae-adds">${docsOf(w).map((d, i) => { const on = a.tracks.includes(d.key), what = ch ? `bab ${d.label}` : `Sisi ${d.label}`;
          return `<button type="button" class="ae-add${i ? ' b' : ''}${on ? ' on' : ''}" data-key="${esc(d.key)}" aria-pressed="${on}" title="${on ? 'Keluarkan' : 'Tambahkan'} ${what}: ${esc(d.title)}">${on ? '✓' : '+'} ${d.label}</button>`; }).join('')}</span></li>`;
    }).join('') || '<li class="hint">Tidak ada yang cocok.</li>';
  }
  function newAlbum() {
    let id = 'album-baru', i = 2;
    while (S.albums.some(a => a.id === id)) id = 'album-baru-' + i++;
    S.albums.push({ id, title: '', note: '', tracks: [], _autoId: true });
    S.selAlbum = id;
    renderAlbums(); $('#aeTitle').focus(); changed();
  }
  $('#newAlbum').addEventListener('click', newAlbum);
  $('#aeEmptyNew').addEventListener('click', newAlbum);
  $('#albumList').addEventListener('click', e => { const b = e.target.closest('[data-album]'); if (b) { S.selAlbum = b.dataset.album; renderAlbums(); } });
  $('#aeTitle').addEventListener('input', e => {
    const a = curAlbum(); if (!a) return;
    a.title = e.target.value;
    if (a._autoId) {
      let base = slugify(a.title) || 'album-baru', id = base, i = 2;
      while (S.albums.some(x => x !== a && x.id === id)) id = base + '-' + i++;
      a.id = id; S.selAlbum = id; $('#aeId').value = id; $('#aePreview').href = '../?preview=1#album-' + id;
    }
    renderAlbumList(); changed();
  });
  $('#aeId').addEventListener('input', e => {
    const a = curAlbum(), v = e.target.value.trim();
    const err = !/^[a-z0-9-]+$/.test(v) ? 'Hanya huruf kecil, angka, dan tanda hubung.' : S.albums.some(x => x !== a && x.id === v) ? 'Alamat ini sudah dipakai album lain.' : '';
    $('#aeIdErr').hidden = !err; $('#aeIdErr').textContent = err;
    if (!err) { a.id = v; S.selAlbum = v; delete a._autoId; renderAlbumList(); $('#aePreview').href = '../?preview=1#album-' + v; changed(); }
  });
  $('#aeNote').addEventListener('input', e => { const a = curAlbum(); if (a) { a.note = e.target.value; changed(); } });
  $('#aeQ').addEventListener('input', renderPool);
  $('#aePool').addEventListener('click', e => {
    const b = e.target.closest('.ae-add'); if (!b || b.disabled) return;
    const a = curAlbum(), k = b.dataset.key;
    a.tracks = a.tracks.includes(k) ? a.tracks.filter(x => x !== k) : [...a.tracks, k];
    renderTracks(); renderPool(); changed();
    if (a.tracks.includes(k)) { const li = $('#aeTracks li:last-child'); li?.classList.add('in'); }
  });
  $('#aeTracks').addEventListener('click', e => {
    const li = e.target.closest('li[data-i]'); if (!li) return;
    const a = curAlbum(), i = +li.dataset.i;
    const mv = e.target.closest('[data-mv]');
    if (mv && !mv.disabled) { const j = i + +mv.dataset.mv; [a.tracks[i], a.tracks[j]] = [a.tracks[j], a.tracks[i]]; renderTracks(); changed(); $(`#aeTracks li[data-i="${j}"]`)?.classList.add('moved'); }
    if (e.target.closest('[data-rm]')) { a.tracks.splice(i, 1); renderTracks(); renderPool(); changed(); }
  });
  // seret untuk mengurutkan
  let dragI = null;
  $('#aeTracks').addEventListener('dragstart', e => { const li = e.target.closest('li[data-i]'); if (!li) return; dragI = +li.dataset.i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  $('#aeTracks').addEventListener('dragover', e => {
    const li = e.target.closest('li[data-i]'); if (dragI == null || !li) return;
    e.preventDefault();
    $$('#aeTracks li').forEach(x => x.classList.toggle('over', x === li && +li.dataset.i !== dragI));
  });
  $('#aeTracks').addEventListener('drop', e => {
    const li = e.target.closest('li[data-i]'); if (dragI == null || !li) return;
    e.preventDefault();
    const a = curAlbum(), to = +li.dataset.i, [k] = a.tracks.splice(dragI, 1);
    a.tracks.splice(to, 0, k); dragI = null;
    renderTracks(); changed();
  });
  $('#aeTracks').addEventListener('dragend', () => { dragI = null; $$('#aeTracks li').forEach(x => x.classList.remove('dragging', 'over')); });
  $('#aeDel').addEventListener('click', () => { $('#aeDel').hidden = true; $('#aeDelConfirm').hidden = false; $('#aeDelNo').focus(); });
  $('#aeDelNo').addEventListener('click', () => { $('#aeDelConfirm').hidden = true; $('#aeDel').hidden = false; });
  $('#aeDelYes').addEventListener('click', () => {
    const a = curAlbum(); if (!a) return;
    S.albums = S.albums.filter(x => x !== a);
    toast(`Album “${a.title || 'tanpa judul'}” dihapus. Tekan Simpan untuk menerapkan.`);
    S.selAlbum = S.albums[0]?.id || null;
    renderAlbums(); changed();
  });

  /* ======================================================================
     PROFIL: halaman #tentang di situs
     ====================================================================== */
  const prof = () => (S.site.profile = S.site.profile || {});
  // bersihkan isian kosong supaya site.json tetap rapi dan "belum disimpan" tidak muncul tanpa sebab
  function pruneProfile() {
    const p = S.site.profile; if (!p) return;
    ['tagline', 'city', 'bio'].forEach(k => { if (!String(p[k] || '').trim()) delete p[k]; });
    ['now', 'journey', 'links', 'highlights'].forEach(k => { if (Array.isArray(p[k]) && !p[k].length) delete p[k]; });
    if (p.quote && !String(p.quote.text || '').trim() && !String(p.quote.source || '').trim()) delete p.quote;
    if (!Object.keys(p).length) delete S.site.profile;
  }
  const ROWS = {
    now: { a: ['label', 'Menulis', 'list="prNowLabels"'], b: ['text', 'apa yang sedang kamu kerjakan'] },
    journey: { a: ['year', '2024', 'inputmode="numeric" maxlength="4"'], b: ['text', 'momen penting tahun itu'] },
    links: { a: ['label', 'Instagram'], b: ['url', 'instagram.com/namamu'] }
  };
  function renderRows(kind) {
    const list = (S.site.profile || {})[kind] || [], R = ROWS[kind];
    $('#pr' + { now: 'Now', journey: 'Journey', links: 'Links' }[kind]).innerHTML = list.map((r, i) => `
      <div class="pr-row pr-${kind}" data-kind="${kind}" data-i="${i}">
        <input data-f="${R.a[0]}" value="${esc(r[R.a[0]] || '')}" placeholder="${R.a[1]}" ${R.a[2] || ''} aria-label="${R.a[0]}">
        <input data-f="${R.b[0]}" value="${esc(r[R.b[0]] || '')}" placeholder="${R.b[1]}" aria-label="${R.b[0]}">
        <button type="button" class="cat-del" data-del aria-label="Hapus baris">×</button>
      </div>`).join('') || '<p class="hint" style="padding:12px 0">Belum ada. Bagian ini disusun otomatis.</p>';
  }
  function renderHl() {
    const hl = (S.site.profile || {}).highlights || [];
    $('#prHl').innerHTML = sortedWorks().filter(w => !w.draft).flatMap(w => docsOf(w).map((d, i) => [d.key, d.title, d.label, isCh(w) ? `Bab ${d.label}` : i ? `Sisi ${d.label}` : '']))
      .map(([k, t, lab, what]) => { const n = hl.indexOf(k); return `<button type="button" class="pr-chip${n >= 0 ? ' on' : ''}" data-hl="${esc(k)}" aria-pressed="${n >= 0}"><i>${n >= 0 ? n + 1 : lab}</i>${esc(t)}${what ? ` <small>${what}</small>` : ''}</button>`; }).join('');
  }
  function renderProfileForm() {
    const p = S.site.profile || {};
    $$('[data-p]', $('#prCol')).forEach(el => { el.value = p[el.dataset.p] || ''; });
    $$('[data-q]', $('#prCol')).forEach(el => { el.value = (p.quote || {})[el.dataset.q] || ''; });
    ['now', 'journey', 'links'].forEach(renderRows);
    renderHl(); fillEn($('#prCol'));
  }
  const prCol = $('#prCol');
  prCol.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.p) { prof()[el.dataset.p] = el.value; pruneProfile(); changed(); return; }
    if (el.dataset.q) { const p = prof(); p.quote = { ...(p.quote || {}), [el.dataset.q]: el.value }; pruneProfile(); changed(); return; }
    const row = el.closest('.pr-row');
    if (row) { const r = (prof()[row.dataset.kind] || [])[+row.dataset.i]; if (r) { r[el.dataset.f] = el.value; changed(); } }
  });
  // baris yang dikosongkan dibuang saat fokus berpindah
  prCol.addEventListener('focusout', e => {
    // baris yang sudah digambar ulang (misalnya sesudah simpan) tidak lagi ada di dokumen
    const row = e.target.closest('.pr-row'); if (!row || !row.isConnected || row.contains(e.relatedTarget)) return;
    const kind = row.dataset.kind, list = (S.site.profile || {})[kind], r = list?.[+row.dataset.i];
    if (r && !Object.values(r).some(v => String(v).trim())) { list.splice(+row.dataset.i, 1); pruneProfile(); renderRows(kind); changed(); }
  });
  prCol.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const kind = add.dataset.add, p = prof();
      p[kind] = [...(p[kind] || []), kind === 'journey' ? { year: String(new Date().getFullYear()), text: '' } : kind === 'now' ? { label: ['Menulis', 'Membaca', 'Mendengarkan'][(p.now || []).length] || '', text: '' } : { label: '', url: '' }];
      renderRows(kind);
      $(`#pr${{ now: 'Now', journey: 'Journey', links: 'Links' }[kind]} .pr-row:last-child input[data-f="${ROWS[kind].b[0]}"]`)?.focus();
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) { const row = del.closest('.pr-row'), kind = row.dataset.kind; (prof()[kind] || []).splice(+row.dataset.i, 1); pruneProfile(); renderRows(kind); changed(); return; }
    const hl = e.target.closest('[data-hl]');
    if (hl) {
      const p = prof(), k = hl.dataset.hl, cur = p.highlights || [];
      if (cur.includes(k)) p.highlights = cur.filter(x => x !== k);
      else if (cur.length >= 8) { toast('Sorotan paling banyak 8 sisi.'); return; }
      else p.highlights = [...cur, k];
      pruneProfile(); renderHl(); changed();
    }
  });

  /* ======================================================================
     RIWAYAT
     ====================================================================== */
  async function renderHistory() {
    const host = $('#histList');
    host.innerHTML = '<li class="hint">Memuat…</li>';
    try {
      const list = await GH.commits('content', 30);
      host.innerHTML = list.map((c, i) => `<li style="--k:${i}"><a href="${esc(c.html_url)}" target="_blank" rel="noopener">
        <img src="${esc(c.author?.avatar_url || '')}" alt="">
        <span><b>${esc(c.commit.message.split('\n')[0])}</b><span>${new Date(c.commit.author.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · ${esc(c.commit.author.name)}</span></span>
        <span aria-hidden="true">↗</span></a></li>`).join('') || '<li class="hint">Belum ada perubahan.</li>';
    } catch (e) { host.innerHTML = `<li class="hint">${esc(e.message)}</li>`; }
  }

  /* ======================================================================
     KEYBOARD & MULAI
     ====================================================================== */
  addEventListener('keydown', e => {
    if (!S.site) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (mod && e.key.toLowerCase() === 'b' && document.activeElement === $('#edBody')) { e.preventDefault(); wrapSel('**'); }
    if (mod && e.key.toLowerCase() === 'i' && document.activeElement === $('#edBody')) { e.preventDefault(); wrapSel('*'); }
    if (e.key === 'Escape' && $('#app').classList.contains('zen')) setZen(false);
  });

  function renderAll() {
    renderFilter();
    if (S.sel) selectWork(S.sel); else renderList();
    if (S.tab === 'tampilan') renderSettings();
    if (S.tab === 'album') renderAlbums();
    if (S.tab === 'profil') renderProfileForm();
    setTab(S.tab);
  }

  tryStart();
})();
