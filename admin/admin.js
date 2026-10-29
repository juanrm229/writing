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
    accent: '#1662FF', sticky: '#E3F46B', theme: 'auto', backdrop: 'auto', defaultView: 'kanvas', readerFont: 'newsreader', readerPaper: 'putih',
    features: { dock: true, visitorUploads: true, visitorStickies: true, rotatingQuotes: true },
    categories: [
      { id: 'esai', label: 'Esai', tag: 'ESAI', ink: '#2F5BFF', red: false },
      { id: 'puisi', label: 'Puisi', tag: 'PUISI', ink: '#D2338A', red: true },
      { id: 'cerpen', label: 'Cerpen', tag: 'CERPEN', ink: '#0E8A5C', red: false },
      { id: 'mini', label: 'Fiksi Mini', tag: 'MINI', ink: '#E0571C', red: false },
      { id: 'catatan', label: 'Catatan', tag: 'CATATAN', ink: '#6A4DF0', red: false }
    ],
    folders: {}, years: {}
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
  const S = { site: null, works: [], layout: null, base: { site: '', works: '' }, sel: null, filter: 'semua', q: '', tab: 'tulis', avatarData: null };
  const clean = works => works.map(w => Object.fromEntries(Object.entries(w).filter(([k]) => !k.startsWith('_'))));
  const snapWorks = () => JSON.stringify(clean(S.works));
  const snapSite = () => JSON.stringify(S.site);
  const isDirty = () => snapWorks() !== S.base.works || snapSite() !== S.base.site;
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
    try { if (d) localStorage.setItem(backupKey(), JSON.stringify({ at: Date.now(), site: S.site, works: clean(S.works) })); else localStorage.removeItem(backupKey()); } catch (e) { /* */ }
    $('#edLocal').textContent = d ? 'cadangan lokal tersimpan' : '';
    renderListDots();
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
    const [site, works, layout] = await Promise.all([GH.getJSON('content/site.json'), GH.getJSON('content/works.json'), GH.getJSON('content/layout.json').catch(() => null)]);
    S.site = { ...DEFAULT_SITE, ...(site || {}), features: { ...DEFAULT_SITE.features, ...((site || {}).features || {}) } };
    S.works = Array.isArray(works) ? works : [];
    S.layout = layout;
    S.base = { site: snapSite(), works: snapWorks() };
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
    if (!b || (JSON.stringify(b.works) === S.base.works && JSON.stringify(b.site) === S.base.site)) return;
    $('#bannerText').textContent = `Ada perubahan yang belum disimpan dari ${new Date(b.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`;
    $('#banner').hidden = false;
    $('#bannerYes').onclick = () => { S.works = b.works; S.site = b.site; S.sel = sortedWorks()[0]?.slug || null; $('#banner').hidden = true; renderAll(); changed(); toast('Perubahan dipulihkan. Tekan Simpan untuk menerbitkan.'); };
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
    return null;
  }
  async function save() {
    if (!isDirty()) return;
    const bad = validate();
    if (bad) { selectWork(bad[0].slug); toast(bad[1], true); return; }
    const btn = $('#saveBtn');
    btn.classList.add('busy'); btn.disabled = true;
    setStatus('saving', 'Menyimpan ke GitHub…');
    const worksChanged = snapWorks() !== S.base.works, siteChanged = snapSite() !== S.base.site;
    const titles = worksChanged ? changedTitles() : [];
    try {
      if (worksChanged) {
        const msg = titles.length === 1 ? `Perbarui tulisan: ${titles[0]}` : titles.length ? `Perbarui ${titles.length} tulisan` : 'Perbarui tulisan';
        await GH.putJSON('content/works.json', clean(S.works), msg);
      }
      if (siteChanged) await GH.putJSON('content/site.json', S.site, 'Perbarui tampilan situs');
      S.base = { site: snapSite(), works: snapWorks() };
      S.works.forEach(w => { delete w._new; });
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
    if (t === 'riwayat') renderHistory();
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
      (!q || fold(w.title + ' ' + w.body.join(' ')).includes(q)));
    const bm = baseMap();
    $('#workList').innerHTML = list.map((w, i) => {
      const c = catOf(w.cat), n = words(w.body.join(' '));
      const dirty = bm[w.slug] !== JSON.stringify(clean([w])[0]);
      return `<li style="--k:${Math.min(i, 14)}"><button class="wl-item" type="button" data-slug="${esc(w.slug)}" aria-current="${w.slug === S.sel}">
        <div class="doc" aria-hidden="true"><div class="pg"></div><span class="tag${c.red ? ' red' : ''}">${esc(c.tag)}</span></div>
        <span class="wl-t"><b>${esc(w.title || 'Tanpa judul')}</b><span>${w.draft ? '<span class="pill-draft">draf</span>' : ''}${esc(c.label)} · ${n} kata</span></span>
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
      t.innerHTML = `<b>${esc(w.title || 'Tanpa judul')}</b><span>${w.draft ? '<span class="pill-draft">draf</span>' : ''}${esc(catOf(w.cat).label)} · ${words(w.body.join(' '))} kata</span>`;
    });
  }
  $('#workList').addEventListener('click', e => { const b = e.target.closest('[data-slug]'); if (b) selectWork(b.dataset.slug); });

  function newWork() {
    let base = 'tulisan-baru', slug = base, i = 2;
    while (S.works.some(w => w.slug === slug)) slug = base + '-' + i++;
    const w = { slug, title: '', cat: catList()[0]?.id || 'esai', form: 'prosa', date: today(), time: nowTime(), draft: true, excerpt: '', line: '', body: [''], _autoSlug: true, _new: true };
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
  const toText = w => w.body.join('\n\n');
  const fromText = (t, form) => {
    const out = t.replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      .map(b => (form === 'puisi' ? b.replace(/[ \t]+\n/g, '\n') : b.replace(/\s*\n\s*/g, ' ')));
    return out.length ? out : [''];
  };
  function grow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

  function selectWork(slug) {
    S.sel = slug;
    const w = cur();
    renderList();
    if (!w) return;
    $('#edTitle').value = w.title;
    $('#edBody').value = toText(w);
    $('#edBody').dataset.form = w.form;
    grow($('#edTitle')); grow($('#edBody'));
    const pc = $('#paperCard'); pc.classList.remove('swap'); void pc.offsetWidth; pc.classList.add('swap');
    $('#edScroll').scrollTop = 0;
    renderDetails(); renderCount();
    pushPreview(true);
  }
  function renderCount() {
    const w = cur(); if (!w) return;
    const n = words(w.body.join(' '));
    const paras = w.body.filter(p => p.trim()).length;
    $('#edCount').textContent = `${n.toLocaleString('id-ID')} kata · ${Math.max(1, Math.round(n / 170))} menit baca · ${paras} ${w.form === 'puisi' ? 'bait' : 'paragraf'}`;
    $('#edMeta').textContent = `${catOf(w.cat).label} · ${new Date(w.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}${w.draft ? ' · draf' : ''}`;
  }
  $('#edTitle').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    w.title = e.target.value.replace(/\n/g, ' ');
    if (w._autoSlug) {
      let base = slugify(w.title) || 'tulisan-baru', slug = base, i = 2;
      while (S.works.some(x => x !== w && x.slug === slug)) slug = base + '-' + i++;
      if (w.slug !== slug) { w.slug = slug; S.sel = slug; $('#dSlug').value = slug; renderList(); }
    }
    grow(e.target); changed();
  });
  $('#edTitle').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#edBody').focus(); } });
  $('#edBody').addEventListener('input', e => {
    const w = cur(); if (!w) return;
    w.body = fromText(e.target.value, w.form);
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
    cur().line = t.slice(0, 160); $('#dLine').value = cur().line; changed();
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
    $('#dCanvas').setAttribute('aria-checked', String(w.canvas !== false));
    $('#dCat').innerHTML = catList().map(c => `<button class="chip" type="button" role="radio" data-v="${esc(c.id)}" aria-checked="${c.id === w.cat}" style="--c:${esc(c.ink)}"><i></i>${esc(c.label)}</button>`).join('');
    $$('#dForm [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === w.form)));
    $('#dDate').value = w.date; $('#dTime').value = w.time || '';
    $('#dSlug').value = w.slug; $('#slugErr').hidden = true;
    $('#dExcerpt').value = w.excerpt || ''; $('#dLine').value = w.line || '';
    $('#delConfirm').hidden = true; $('#delBtn').hidden = false;
  }
  const flip = (btn, key, invert) => { const w = cur(); const on = btn.getAttribute('aria-checked') !== 'true'; btn.setAttribute('aria-checked', String(on)); w[key] = invert ? !on : on; };
  $('#dPub').addEventListener('click', e => { flip(e.currentTarget, 'draft', true); renderDetails(); renderCount(); changed(); });
  $('#dCanvas').addEventListener('click', e => { const w = cur(); const on = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', String(on)); if (on) delete w.canvas; else w.canvas = false; changed(); });
  $('#dCat').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; cur().cat = b.dataset.v; renderDetails(); renderCount(); changed(); });
  $('#dForm').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const w = cur(); w.form = b.dataset.v; w.body = fromText($('#edBody').value, w.form);
    renderDetails(); renderCount(); changed();
  });
  $('#dDate').addEventListener('change', e => { if (e.target.value) { cur().date = e.target.value; renderCount(); changed(); } });
  $('#dTime').addEventListener('change', e => { cur().time = e.target.value; changed(); });
  $('#dSlug').addEventListener('input', e => {
    const w = cur(), v = e.target.value.trim();
    const err = !/^[a-z0-9-]+$/.test(v) ? 'Hanya huruf kecil, angka, dan tanda hubung.' : S.works.some(x => x !== w && x.slug === v) ? 'Alamat ini sudah dipakai tulisan lain.' : '';
    $('#slugErr').hidden = !err; $('#slugErr').textContent = err;
    if (!err) { w.slug = v; S.sel = v; delete w._autoSlug; renderList(); changed(); }
  });
  $('#dExcerpt').addEventListener('input', e => { cur().excerpt = e.target.value; changed(); });
  $('#dLine').addEventListener('input', e => { cur().line = e.target.value; changed(); });
  $('#autoExcerpt').addEventListener('click', () => {
    const w = cur(), t = plain(w.body.find(p => p.trim()) || '').replace(/\s+/g, ' ');
    const cut = t.length > 150 ? t.slice(0, t.lastIndexOf(' ', 150)) + '…' : t;
    w.excerpt = cut; $('#dExcerpt').value = cut; changed();
  });
  $('#delBtn').addEventListener('click', () => { $('#delBtn').hidden = true; $('#delConfirm').hidden = false; $('#delNo').focus(); });
  $('#delNo').addEventListener('click', () => { $('#delConfirm').hidden = true; $('#delBtn').hidden = false; });
  $('#delYes').addEventListener('click', () => {
    const w = cur(); if (!w) return;
    S.works = S.works.filter(x => x !== w);
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
    return { site, works: clean(S.works), layout: S.layout };
  }
  const pushPreview = debounce(force => {
    if (!S.site) return;
    try { localStorage.setItem('jm:preview', JSON.stringify(previewPayload())); } catch (e) { return; }
    const w = cur();
    if (!$('#previewPane').hidden) {
      const src = '../?preview=1#baca-' + (w ? w.slug : '');
      const f = $('#previewFrame');
      if (force || !f.src.endsWith(src.slice(2))) f.src = src; else f.contentWindow?.location.reload();
    }
    if (S.tab === 'tampilan') {
      const f = $('#pvFrame');
      if (!f.src || force) f.src = '../?preview=1'; else f.contentWindow?.location.reload();
    }
  }, 700);

  function fitPreview() {
    const box = $('#pvFrameBox'), stage = $('#pvStage');
    if (!box || !stage.clientWidth) return;
    const [w, h] = pvDevice === 'phone' ? [390, 844] : [1440, 900];
    const s = Math.min((stage.clientWidth - 40) / w, (stage.clientHeight - 40) / h, 1);
    box.style.width = w + 'px'; box.style.height = h + 'px';
    box.style.transform = `translate(-50%, -50%) scale(${s})`;
    box.classList.toggle('phone', pvDevice === 'phone');
  }
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
      if (el.matches('input, textarea')) { el.value = s[k] ?? ''; return; }
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
    renderAvatar(); renderCats(); renderFolders(); renderYears();
    requestAnimationFrame(fitPreview);
  }
  const setCol = $('#setCol');
  setCol.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-k]')) { S.site[el.dataset.k] = el.value; changed(); return; }
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
    S.site.categories.splice(+b.closest('.cat-row').dataset.i, 1); renderCats(); renderFolders(); changed();
  });
  $('#addCat').addEventListener('click', () => {
    let id = 'jenis-baru', i = 2;
    while (catList().some(c => c.id === id)) id = 'jenis-baru-' + i++;
    S.site.categories = [...catList(), { id, label: 'Jenis baru', tag: 'BARU', ink: '#111214', red: false }];
    renderCats(); changed();
    $('#catEditor .cat-row:last-child input[data-ck="label"]').select();
  });
  function renderFolders() {
    $('#folderEditor').innerHTML = catList().map(c => `<label class="row-f"><span>Map ${esc(c.label)}<small>judul map di kanvas</small></span><input data-folder="${esc(c.id)}" value="${esc((S.site.folders || {})[c.id] || '')}" placeholder="${esc(c.label)}"></label>`).join('');
  }
  $('#folderEditor').addEventListener('input', e => {
    const id = e.target.dataset.folder; if (!id) return;
    S.site.folders = { ...(S.site.folders || {}) };
    if (e.target.value.trim()) S.site.folders[id] = e.target.value; else delete S.site.folders[id];
    changed();
  });
  function renderYears() {
    const years = [...new Set(S.works.map(w => w.date.slice(0, 4)))].sort().reverse();
    $('#yearEditor').innerHTML = years.map(y => `<label class="row-f"><span>${y}</span><input data-year="${y}" value="${esc((S.site.years || {})[y] || '')}" placeholder="Satu kalimat tentang tahun ini"></label>`).join('') || '<p class="hint" style="padding:12px 0">Belum ada tulisan.</p>';
  }
  $('#yearEditor').addEventListener('input', e => {
    const y = e.target.dataset.year; if (!y) return;
    S.site.years = { ...(S.site.years || {}) };
    if (e.target.value.trim()) S.site.years[y] = e.target.value; else delete S.site.years[y];
    changed();
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
    setTab(S.tab);
  }

  tryStart();
})();
