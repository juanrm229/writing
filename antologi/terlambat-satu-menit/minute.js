/* Terakhir Dikenali: nama mengikuti orang yang memandang, naskah tetap utuh. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(key, fallback) { try { const value = JSON.parse(localStorage.getItem('jm:' + key)); return value == null ? fallback : value; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem('jm:' + key, JSON.stringify(value)); } catch (_) {} }
  };
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const array = value => Array.isArray(value) ? value : [];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '');
  const count = s => (plain(s).match(/\S+/g) || []).length;
  const qs = new URLSearchParams(location.search), EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const SLUG = 'terlambat-satu-menit', LETTERS = ['a', 'b', 'c'], NAMES = ['Saman', 'Banyu', 'Maryam'];
  const PREVIEW = qs.has('preview'), motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width: 800px)');
  document.documentElement.lang = LANG;
  const labels = {
    contactsLabel: ['Kontak', 'Contacts'], recognitionLabel: ['Terakhir dikenali', 'Last recognized'], partsKicker: ['Terakhir dikenali', 'Last recognized'],
    partsTitle: ['Kontak', 'Contacts'], partsNote: ['Saman, Banyu, lalu Maryam. Buka satu nama untuk membaca dari sisinya.', 'Saman, Banyu, then Maryam. Open a name to read their side.'],
    settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi cerita', 'Story sounds'],
    volumeLabel: ['Volume', 'Volume'], motionLabel: ['Transisi nama', 'Name transitions'], languageLabel: ['Bahasa', 'Language'],
    historyLabel: ['Nama dalam pembacaanmu', 'Names encountered in your reading'], allContacts: ['Lihat semua kontak', 'All contacts'],
    backEnd: ['Kembali ke meja tulis', 'Back to the writing desk'], crossNote: ['Dari sisi lain', 'From the other side']
  };
  Object.entries(labels).forEach(([id, value]) => { $('#' + id).textContent = t(...value); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openParts', t('Buka kontak dan pilih sisi cerita', 'Open contacts and choose a side')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['stage', t('Terakhir dikenali', 'Last recognized')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')], ['partsList', t('Tiga sisi cerita', 'Three sides of the story')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });
  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const response = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('content'); works = await response.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  const failed = message => { $('#story').innerHTML = `<p class="loading">${esc(message)} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`; ['begin', 'openParts', 'openSettings', 'openContact'].forEach(id => { $('#' + id).disabled = true; }); };
  if (!work || !Array.isArray(work.body) || !Array.isArray(work.sides) || work.sides.length < 2) { failed(t('Naskah belum bisa dimuat.', 'The story could not be loaded.')); return; }
  const base = [work, ...work.sides.slice(0, 2)], translations = [work.en || {}, ...(work.en?.sides || [])];
  const docs = base.map((side, i) => {
    const translation = translations[i] || {}, translated = EN && Array.isArray(translation.body) && translation.body.length > 0;
    const source = translated ? translation : side;
    return { title: source.sideTitle || source.title || side.sideTitle || side.title, pov: source.pov || side.pov || '', body: translated ? translation.body : side.body, translated };
  });
  if (docs.some(d => !Array.isArray(d.body) || !d.body.length || d.body.some(p => typeof p !== 'string'))) { failed(t('Naskah belum lengkap.', 'The story is incomplete.')); return; }
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · ' + t('Terakhir Dikenali', 'Last Recognized'); $('#workTitle').textContent = title;
  const keyOf = index => SLUG + (index ? ':' + LETTERS[index] : '');
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let places = PREVIEW ? {} : object(store.get('minute:places', {}));
  const known = new Set(PREVIEW ? [] : array(store.get('minute:recognition', [])));
  const witnessed = new Set(PREVIEW ? [] : array(store.get('minute:crossings', [])));
  let sideIndex = 0, paragraphs = [], weights = new Map(), totalWords = 0, currentParagraph = -1, latestPlace = null;
  let saveTimer = 0, raf = 0, activeContact = null, contactSignature = '', lastCue = '', crossing = null, traces = null, traceOrigin = null;
  const stage = $('#stage'), dialogs = [$('#partsDialog'), $('#settingsDialog'), $('#contactDialog'), $('#tracesDialog')];
  const line = () => mobile.matches ? stage.getBoundingClientRect().bottom + 18 : $('#topbar').getBoundingClientRect().bottom + 28;

  // Indeks ID/EN berbeda. Identitas dan ketukan tetap menunjuk kalimat asli.
  const state = (id, at, observer, person, name, relation) => ({ id, at, observer, person, name, relation });
  const states = [
    [state('a-son', 0, 'Saman', 'banyu', 'Banyu', t('Anak', 'Son')), state('a-wife', 7, 'Saman', 'maryam', 'Maryam', t('Istri', 'Wife')), state('a-son-again', 12, 'Saman', 'banyu', 'Banyu', t('Anak', 'Son'))],
    [state('b-father', 0, 'Banyu', 'saman', 'Saman', t('Ayah', 'Father')),
      state('b-owner', 12, 'Banyu', 'watch-owner', t('Perempuan pemilik toko jam', 'The woman at the watch shop'), t('Pernah memberi tempat berteduh', 'Once gave him shelter')),
      state('b-mapmaker', 18, 'Banyu', 'galih', 'Pak Galih', t('Pembuat peta', 'Mapmaker')),
      state('b-wife', 25, 'Banyu', 'sari', 'Sari', t('Istri', 'Wife')),
      state('b-father-again', 34, 'Banyu', 'saman', 'Saman', t('Ayah', 'Father')),
      state('b-owner-again', 45, 'Banyu', 'watch-owner', t('Perempuan pemilik toko jam', 'The woman at the watch shop'), t('Pernah memberi tempat berteduh', 'Once gave him shelter')),
      state('b-owner-gone', 47, 'Banyu', 'watch-owner', t('Perempuan pemilik toko jam', 'The woman at the watch shop'), t('Sudah meninggal', 'Passed away')),
      state('b-son', 51, 'Saman', 'banyu', 'Banyu', t('Anak', 'Son')),
      state('b-stranger', docs[1].translated ? 56 : 55, 'Saman', 'banyu', t('Mas', 'Sir'), t('Pelanggan', 'Customer')),
      state('b-presence', docs[1].translated ? 67 : 66, 'Saman', 'banyu', t('Mas', 'Sir'), t('Datang setiap sore', 'Comes every afternoon'))],
    [state('c-husband', 0, 'Maryam', 'saman', 'Saman', t('Suami', 'Husband')),
      state('c-son', docs[2].translated ? 14 : 15, 'Maryam', 'banyu', 'Banyu', t('Anak', 'Son')),
      state('c-traveler', docs[2].translated ? 44 : 45, 'Maryam', 'traveler', t('Anak perantau', 'The wandering boy'), t('Datang ke toko', 'Came to the shop')),
      state('c-shelter', docs[2].translated ? 47 : 48, 'Maryam', 'traveler', t('Anak perantau', 'The wandering boy'), t('Tinggal di gudang belakang', 'Stays in the back room')),
      state('c-departure', docs[2].translated ? 58 : 59, 'Maryam', 'traveler', t('Anak perantau', 'The wandering boy'), t('Pergi tanpa berpamitan', 'Left without saying goodbye')),
      state('c-son-again', docs[2].translated ? 67 : 68, 'Maryam', 'banyu', 'Banyu', t('Anak', 'Son'))]
  ];
  const allStates = states.flatMap((list, side) => list.map(s => ({ ...s, side })));
  const observerLabel = name => t('Dalam ingatan ', 'In the memory of ') + name;
  const contactAt = p => states[sideIndex].filter(s => p >= s.at).at(-1) || states[sideIndex][0];
  const pairs = [
    { id: 'meeting', title: t('Di toko jam', 'At the watch shop'), b: [12, 13], c: [45, 55], bAnchor: 13, cAnchor: 53 },
    { id: 'departure', title: t('Sebelum subuh', 'Before dawn'), b: [14, 15], c: [58, 65], bAnchor: 14, cAnchor: 60 }
  ].map(pair => {
    const shift = docs[2].translated ? -1 : 0;
    return { ...pair, c: pair.c.map(p => p + shift), cAnchor: pair.cAnchor + shift };
  });
  const requirements = (pair, side) => {
    const [from, to] = pair[side], body = docs[LETTERS.indexOf(side)].body;
    return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(p => body[p]?.trim() !== '***');
  };
  const ready = pair => ['b', 'c'].every(side => requirements(pair, side).every((_, step) => witnessed.has(`${pair.id}:${side}:${step}`)));
  const witness = () => {
    if (crossing) return;
    const side = LETTERS[sideIndex]; if (side === 'a') return;
    let changed = false;
    pairs.forEach(pair => requirements(pair, side).forEach((p, step) => {
      const key = `${pair.id}:${side}:${step}`; if (witnessed.has(key)) return;
      const rect = $('#p-' + p)?.getBoundingClientRect();
      // Melewati sebuah bab tidak sama dengan melihat ujung setiap paragrafnya.
      if (rect && rect.bottom >= line() && rect.bottom <= innerHeight - 28) { witnessed.add(key); changed = true; }
    }));
    if (changed && !PREVIEW) store.set('minute:crossings', [...witnessed]);
  };
  const pairAt = p => {
    const side = LETTERS[sideIndex];
    return side === 'a' ? null : pairs.find(pair => p >= pair[side][0] && p <= pair[side][1] && ready(pair));
  };
  const oppositeTarget = pair => {
    const side = LETTERS[sideIndex], targetSide = side === 'b' ? 'c' : 'b';
    const shift = docs[2].translated ? -1 : 0;
    let target = pair[targetSide + 'Anchor'];
    if (side === 'b' && pair.id === 'meeting' && currentParagraph === 12) target = 45 + shift;
    if (side === 'b' && pair.id === 'departure' && currentParagraph === 15) target = 63 + shift;
    if (side === 'c' && pair.id === 'meeting' && currentParagraph < 52 + shift) target = 12;
    if (side === 'c' && pair.id === 'departure' && currentParagraph >= 63 + shift) target = 15;
    return { side: LETTERS.indexOf(targetSide), paragraph: target };
  };
  const updateCrossings = () => {
    const pair = !crossing && pairAt(currentParagraph);
    $('#opposite').hidden = !pair;
    if (pair) { const target = oppositeTarget(pair); $('#opposite').href = '#' + LETTERS[target.side] + '-' + target.paragraph; $('#opposite').dataset.pair = pair.id; }
    $('#story').querySelectorAll('[data-crossing]').forEach(el => { el.hidden = !!crossing || !ready(pairs.find(pair => pair.id === el.dataset.crossing)); });
  };
  const openContact = () => {
    persist(); const current = activeContact;
    $('#detailName').textContent = current.name; $('#detailObserver').textContent = observerLabel(current.observer); $('#detailRelation').textContent = current.relation;
    const unique = new Set();
    const history = allStates.filter(s => {
      if (s.observer !== current.observer || s.person !== current.person || !(known.has(s.id) || s.id === current.id)) return false;
      const signature = s.name + '|' + s.relation; if (unique.has(signature)) return false; unique.add(signature); return true;
    });
    $('#contactHistory').innerHTML = history.map(s => `<li><a href="#${LETTERS[s.side]}-${s.at}" data-history="${s.id}"><span><b>${esc(s.name)}</b><small>${esc(s.relation)}</small></span><span aria-hidden="true">↗</span></a></li>`).join('');
    $('#contactHistory').querySelectorAll('[data-history]').forEach(a => { a.onclick = e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); const entry = allStates.find(s => s.id === a.dataset.history); navigate(entry.side, entry.at);
    }; });
    $('#contactDialog').showModal();
  };
  const updateContact = p => {
    const current = contactAt(p); activeContact = current;
    if (p >= 0 && !crossing && !known.has(current.id)) { known.add(current.id); if (!PREVIEW) store.set('minute:recognition', [...known]); }
    const signature = current.observer + '|' + current.name + '|' + current.relation;
    if (signature === contactSignature) return;
    contactSignature = signature; stage.dataset.contact = current.id;
    $('#contactName').textContent = current.name; $('#contactRelation').textContent = current.relation;
    $('#contactInitial').textContent = current.name[0]; $('#contactObserver').textContent = observerLabel(current.observer);
    $('#openContact').setAttribute('aria-label', current.name + ' · ' + current.relation + ' · ' + observerLabel(current.observer));
    const identity = $('#contactIdentity'); identity.classList.remove('changed'); void identity.offsetWidth; identity.classList.add('changed');
    if (p >= 0) $('#announcement').textContent = `${observerLabel(current.observer)}: ${current.name}. ${current.relation}.`;
  };

  const audioStatus = sound => {
    $('#sound').disabled = !sound.supported; $('#sound').setAttribute('aria-pressed', sound.enabled);
    $('#sound').textContent = sound.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = !sound.supported ? t('Bunyi belum tersedia di peramban ini. Cerita tetap bisa dibaca.', 'Sound is unavailable in this browser. You can keep reading.') : sound.error ? t('Bunyi belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.') : t('Lonceng dan detak hanya berbunyi jika kamu memilihnya.', 'The bell and ticking only sound when you choose them.');
  };
  const sound = typeof window.MinuteSound === 'function' ? new window.MinuteSound(audioStatus) : { supported: false, enabled: false, setVolume() {}, setRoom() {}, setPaused() {}, play() {}, dispose() {} };
  audioStatus(sound); $('#sound').onclick = () => { void sound.setEnabled(!sound.enabled); };
  const rawVolume = store.get('minute:volume', 25); $('#volume').value = Number.isFinite(rawVolume) ? clamp(rawVolume, 0, 100) : 25;
  const setVolume = () => { const value = +$('#volume').value; $('#volumeValue').value = value + '%'; $('#volume').setAttribute('aria-valuetext', value + '%'); store.set('minute:volume', value); sound.setVolume(value / 100); };
  $('#volume').oninput = setVolume; setVolume();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('minute:motion', true) !== false;
    document.documentElement.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', enabled); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('minute:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();
  const updateSound = p => {
    const side = LETTERS[sideIndex], en = docs[sideIndex].translated;
    const room = p < 0 ? '' : side === 'b' && (p >= 12 && p < 18 || p >= 45 && p < 51) || side === 'c' && p >= (en ? 40 : 41) ? 'clock' : 'room';
    sound.setRoom(room);
    const cue = side === 'b' && p >= 53 && p < (en ? 60 : 59) ? 'bell' : side === 'c' && p >= (en ? 74 : 75) ? 'spoon' : '';
    if (cue && cue !== lastCue) sound.play(cue); lastCue = cue;
  };
  const capture = () => {
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], rect = p.getBoundingClientRect(), offset = clamp((l - rect.top) / Math.max(1, rect.height), 0, 1), weight = weights.get(p);
    const last = paragraphs[paragraphs.length - 1].getBoundingClientRect(), finished = last.top < innerHeight - 80 && last.bottom <= innerHeight - 60;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((weight.before + offset * weight.words) / Math.max(1, totalWords), 0, 1), finished };
  };
  const persist = () => {
    if (!latestPlace || crossing) return;
    const moved = JSON.stringify(places[LANG]?.[LETTERS[sideIndex]]) !== JSON.stringify(latestPlace);
    places[LANG] = { ...object(places[LANG]), [LETTERS[sideIndex]]: latestPlace };
    if (!PREVIEW && moved) {
      store.set('minute:places', places); store.set('prog', { ...object(store.get('prog', {})), [keyOf(sideIndex)]: +latestPlace.progress.toFixed(4) });
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    if (latestPlace.finished && !done.has(keyOf(sideIndex))) {
      done.add(keyOf(sideIndex)); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] });
      $('#announcement').textContent = t('Sisi ini telah sampai ke akhir.', 'This side has reached its end.');
    }
  };
  const frame = () => {
    if (dialogs.some(d => d.open)) return;
    const place = capture(); currentParagraph = place ? place.paragraph : -1;
    updateContact(currentParagraph); witness(); updateCrossings(); updateSound(currentParagraph);
    traces?.witness(sideIndex, line(), !!crossing); traces?.refresh(!!crossing);
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place && !crossing) { latestPlace = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    const target = paragraphs.find(p => +p.dataset.p >= paragraph) || paragraphs.at(-1); if (!target) return;
    dialogs.forEach(d => { if (d.open) d.close(); });
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); frame();
  };
  const setCrossing = value => {
    crossing = value; $('#crossStrip').hidden = !value;
    document.documentElement.style.setProperty('--bar-height', value ? '97px' : '56px');
    document.documentElement.toggleAttribute('data-at-crossing', !!value);
    if (value) $('#returnCross').textContent = '← ' + t('Kembali ke ', 'Return to ') + NAMES[value.side];
  };
  const renderSide = (index, record = true) => {
    clearTimeout(saveTimer); persist(); dialogs.forEach(d => { if (d.open) d.close(); });
    sideIndex = clamp(index, 0, docs.length - 1); latestPlace = null; currentParagraph = -1; contactSignature = ''; lastCue = '';
    const doc = docs[sideIndex], side = LETTERS[sideIndex]; document.documentElement.dataset.side = side;
    $('#sideTitle').textContent = doc.title; $('#voice').textContent = doc.pov; $('#partLabel').textContent = NAMES[sideIndex];
    $('#entryNote').textContent = PREVIEW ? t('Pratinjau · tiga nama, satu keluarga.', 'Preview · three names, one family.') : t('Tiga nama. Satu keluarga.', 'Three names. One family.');
    $('#begin').innerHTML = `${t('Mulai membaca', 'Start reading')} <span aria-hidden="true">→</span>`;
    $('#story').innerHTML = doc.body.map((p, i) => {
      const text = p.trim() === '***' ? '<div class="break" role="separator"></div>' : `<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>`;
      const link = side === 'a' ? null : pairs.find(pair => pair[side][1] === i);
      return text + (traces?.hint(sideIndex, i) || '') + (link ? `<div class="crossing" data-crossing="${link.id}" hidden><a href="#${side === 'b' ? 'c' : 'b'}-${link[(side === 'b' ? 'c' : 'b') + 'Anchor']}" data-pair="${link.id}">${t('Lihat dari seberang', 'See the other side')}<span aria-hidden="true">↔</span></a></div>` : '');
    }).join('');
    paragraphs = [...document.querySelectorAll('.passage')]; totalWords = 0; weights = new Map();
    paragraphs.forEach(p => { const words = count(doc.body[+p.dataset.p]); weights.set(p, { before: totalWords, words }); totalWords += words; });
    $('#partsList').innerHTML = docs.map((d, i) => `<button class="part-link" type="button" data-side="${i}"${i === sideIndex ? ' aria-current="page"' : ''}><span class="initial" aria-hidden="true">${NAMES[i][0]}</span><span class="part-text"><b>${NAMES[i]}</b><small>${esc(d.title)}</small></span>${done.has(keyOf(i)) ? `<span class="read-mark">${t('terbaca', 'read')}</span>` : ''}</button>`).join('');
    $('#partsList').querySelectorAll('[data-side]').forEach(b => { b.onclick = () => navigate(+b.dataset.side); });
    $('#story').querySelectorAll('[data-pair]').forEach(a => { a.onclick = openOpposite; });
    const place = places[LANG]?.[side]; $('#resume').hidden = !(place && Number.isInteger(place.paragraph) && place.progress > 0 && place.progress < .99);
    $('#resume').textContent = t('Lanjutkan dari tempat terakhir', 'Continue where you left off'); $('#resume').onclick = () => { if (crossing) returnFromCrossing(); else goTo(place.paragraph, place.offset); };
    $('#partEnd').hidden = false;
    $('#endNote').textContent = [t('Ada seseorang di seberang pintu.', 'There is someone beyond the door.'), t('Satu sore, lalu satu sore lagi.', 'One afternoon, then another.'), t('Ada yang hanya diketahui pembaca.', 'Some things are known only to the reader.')][sideIndex];
    $('#nextSide').textContent = t('Dari ingatan ', 'From the memory of ') + NAMES[(sideIndex + 1) % 3] + ' →';
    if (record && !PREVIEW) {
      const read = array(store.get('read', [])); if (!read.includes(keyOf(sideIndex))) store.set('read', [...read, keyOf(sideIndex)]);
      const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[keyOf(sideIndex)] = (+stats.plays[keyOf(sideIndex)] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    scrollTo({ top: 0, behavior: 'instant' }); frame();
  };
  const navigate = (index, paragraph) => {
    clearTimeout(saveTimer); persist(); setCrossing(null);
    history.replaceState(null, '', '#' + LETTERS[index] + (paragraph == null ? '' : '-' + paragraph));
    renderSide(index); if (paragraph != null) goTo(paragraph);
  };
  function openOpposite(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); const pair = pairs.find(pair => pair.id === e.currentTarget.dataset.pair);
    if (!pair || !ready(pair) || crossing) return;
    const place = capture(); if (!place) return;
    const target = oppositeTarget(pair);
    visitScene(target.side, target.paragraph, null, place.offset);
  }
  function visitScene(side, paragraph, source = null, offset = 0, note = t('Dari sisi lain', 'From the other side')) {
    const place = capture();
    clearTimeout(saveTimer); if (!crossing && !source && place) { latestPlace = place; persist(); }
    const origin = crossing || source || { side: sideIndex, place, hash: location.hash };
    setCrossing(origin); $('#crossNote').textContent = note;
    history.replaceState(null, '', '#' + LETTERS[side] + '-' + paragraph);
    renderSide(side, false); goTo(paragraph, offset);
  }
  function returnFromCrossing() {
    if (!crossing) return;
    const origin = crossing; clearTimeout(saveTimer); setCrossing(null);
    history.replaceState(null, '', origin.hash); renderSide(origin.side, false);
    if (origin.place) goTo(origin.place.paragraph, origin.place.offset); else $('#begin').focus({ preventScroll: true });
  }
  $('#opposite').textContent = t('Lihat dari seberang ↔', 'See the other side ↔'); $('#opposite').onclick = openOpposite;
  $('#returnCross').onclick = returnFromCrossing; $('#openContact').onclick = openContact;
  $('#nextSide').onclick = () => navigate((sideIndex + 1) % 3); $('#begin').onclick = () => goTo(0);
  const openParts = () => { persist(); $('#partsDialog').showModal(); };
  $('#openParts').onclick = openParts; $('#allContacts').onclick = openParts;
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  dialogs.forEach(d => {
    d.addEventListener('close', schedule);
    d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });
  });
  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = delta => {
    const place = delta ? capture() : null; size = clamp(size + delta, 16, 26); document.documentElement.style.setProperty('--size', size + 'px');
    store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26;
    if (place) {
      const target = paragraphs.find(p => +p.dataset.p === place.paragraph);
      scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + place.offset * target.getBoundingClientRect().height, behavior: 'instant' });
      if (!crossing) latestPlace = { ...place };
    }
  };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => {
    persist(); const url = new URL(location.href); url.searchParams.set('lang', EN ? 'id' : 'en');
    let target = currentParagraph;
    if (target >= 0) {
      const old = docs[sideIndex].body, other = EN ? base[sideIndex].body : translations[sideIndex]?.body;
      if (Array.isArray(other)) {
        const groups = body => { const out = []; let start = 0; body.forEach((p, i) => { if (p.trim() === '***') { out.push([start, i]); start = i + 1; } }); out.push([start, body.length]); return out; };
        const from = groups(old), to = groups(other), index = from.findIndex(([a, b]) => target >= a && target < b);
        if (index >= 0 && to[index]) { const [a, b] = from[index], [c, d] = to[index]; target = Math.min(d - 1, c + Math.floor((target - a) / Math.max(1, b - a) * (d - c))); }
      }
    }
    url.hash = LETTERS[sideIndex] + (target >= 0 ? '-' + target : ''); store.set('lang', EN ? 'id' : 'en'); location.replace(url.href);
  };
  const followHash = () => {
    const match = /^#([abc])(?:-(\d+))?$/.exec(location.hash), next = match ? LETTERS.indexOf(match[1]) : 0;
    clearTimeout(saveTimer); persist(); setCrossing(null);
    if (!paragraphs.length || next !== sideIndex || match?.[2] == null) renderSide(next);
    if (match?.[2] != null) goTo(+match[2]);
  };
  addEventListener('hashchange', followHash); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => {
    if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight];
    const place = crossing ? capture() : latestPlace;
    if (place && currentParagraph >= 0 && !dialogs.some(d => d.open)) goTo(place.paragraph, place.offset); else schedule();
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); sound.dispose(); });
  document.addEventListener('visibilitychange', () => { sound.setPaused(document.hidden); if (document.hidden) persist(); else schedule(); });
  if (typeof window.MinuteTraces === 'function') traces = new window.MinuteTraces({
    docs, t, inline, read: () => PREVIEW ? [] : array(store.get('minute:traces', [])),
    write: value => { if (!PREVIEW) store.set('minute:traces', value); },
    onOpen: () => { clearTimeout(saveTimer); const place = capture(); if (place && !crossing) latestPlace = place; persist(); traceOrigin = { side: sideIndex, place, hash: location.hash }; },
    onJump: (side, paragraph) => visitScene(side, paragraph, traceOrigin, 0, t('Jejak cerita', 'Story trace'))
  });
  else { $('#openTraces').textContent = t('Jejak', 'Traces'); $('#openTraces').title = t('Jejak belum tersedia. Cerita tetap bisa dibaca.', 'Traces are unavailable. You can keep reading.'); }
  followHash();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
