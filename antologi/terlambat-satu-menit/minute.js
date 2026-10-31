/* Tiga sisi dibaca utuh. Satu meja menyimpan benda-benda yang melintasinya. */
(async () => {
  'use strict';
  const $ = s => document.querySelector(s);
  const store = {
    get(key, fallback) { try { const value = JSON.parse(localStorage.getItem('jm:' + key)); return value == null ? fallback : value; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem('jm:' + key, JSON.stringify(value)); } catch (_) {} }
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '');
  const count = s => (plain(s).match(/\S+/g) || []).length;
  const qs = new URLSearchParams(location.search), EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const LANG = EN ? 'en' : 'id', t = (id, en) => EN ? en : id;
  const SLUG = 'terlambat-satu-menit', LETTERS = ['a', 'b', 'c'], ROMAN = ['I', 'II', 'III'];
  const PREVIEW = qs.has('preview');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.lang = LANG;
  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const response = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('content'); works = await response.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !Array.isArray(work.sides) || work.sides.length < 2) {
    $('#story').innerHTML = `<p class="loading">${t('Naskah belum bisa dimuat.', 'The story could not be loaded.')} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`;
    $('#begin').hidden = true; $('#openParts').disabled = true; $('#openSettings').disabled = true; return;
  }
  const base = [work, ...work.sides.slice(0, 2)], translations = [work.en || {}, ...(work.en?.sides || [])];
  const docs = base.map((side, i) => {
    const translation = translations[i] || {}, translated = EN && Array.isArray(translation.body) && translation.body.length > 0;
    const source = translated ? translation : side;
    return { title: source.sideTitle || source.title || side.sideTitle || side.title, pov: source.pov || side.pov || '', body: translated ? translation.body : side.body, translated };
  });
  if (docs.some(d => !Array.isArray(d.body) || !d.body.length || d.body.some(p => typeof p !== 'string'))) {
    $('#story').textContent = t('Naskah belum lengkap.', 'The story is incomplete.'); $('#begin').hidden = true; $('#openParts').disabled = true; $('#openSettings').disabled = true; return;
  }
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · Quiet Margins'; $('#workTitle').textContent = title;
  const ui = {
    back: ['Kembali ke meja tulis', 'Back to the writing desk'], backEnd: ['Kembali ke meja tulis', 'Back to the writing desk'],
    partsTitle: ['Tiga sisi', 'Three sides'], partsNote: ['Saman, Banyu, lalu Maryam. Kamu bisa kembali kapan saja.', 'Saman, Banyu, then Maryam. You can return at any time.'],
    settingsTitle: ['Di meja ini', 'At this table'], sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi benda', 'Sounds of things'],
    volumeLabel: ['Volume', 'Volume'], motionLabel: ['Gerak halus', 'Gentle motion'], languageLabel: ['Bahasa', 'Language'],
    afterwordTitle: ['Satu sore lagi', 'One more afternoon'], sit: ['Duduk sebentar', 'Stay a while'], visitAgain: ['Duduk sebentar', 'Stay a while']
  };
  Object.entries(ui).forEach(([id, value]) => { if (id === 'back') $('#' + id).setAttribute('aria-label', t(...value)); else $('#' + id).textContent = t(...value); });
  $('#openSettings').setAttribute('aria-label', t('Pengaturan baca', 'Reading settings'));
  $('#openParts').setAttribute('aria-label', t('Pilih sisi cerita', 'Choose a side of the story'));
  $('#partsList').setAttribute('aria-label', t('Sisi cerita', 'Sides of the story'));
  $('#stage').setAttribute('aria-label', t('Meja dalam cerita', 'The table in the story'));
  $('#readingLine').setAttribute('aria-label', t('Kemajuan membaca', 'Reading progress'));
  $('#smaller').setAttribute('aria-label', t('Perkecil huruf', 'Decrease text size'));
  $('#bigger').setAttribute('aria-label', t('Perbesar huruf', 'Increase text size'));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });

  // Kedua bahasa membagi beberapa paragraf secara berbeda: ketukan ditandai sendiri.
  const BEATS = {
    id: {
      a: [[2, { letter: true }], [18, { board: true, king: 'home', letter: false }], [24, { king: 'missing', trap: 'open', chase: true }], [38, { trap: 'closed' }], [39, { king: 'home' }], [46, { trap: 'open', chase: false }], [53, { trap: '', letter: true }], [56, { openLetter: true }], [61, { letter: false }], [69, { room: 'door', door: 'inside', bell: 'held' }]],
      b: [[12, { room: 'clock', letter: false, bag: true }], [14, { parcel: true }], [18, { room: 'travel', bag: false, parcel: false }], [34, { letter: true }], [35, { openLetter: true }], [45, { room: 'clock', letter: false }], [48, { watch: true }], [51, { room: 'door', door: 'outside', watch: false, bell: 'held' }], [53, { bell: 'released' }], [59, { room: 'tailor', board: true, king: 'home' }], [65, { stay: true }], [68, { board: true, king: 'home', watch: true }]],
      c: [[33, { missingSpoon: true, spoon: true }], [38, { room: 'travel' }], [41, { room: 'clock' }], [42, { gears: true }], [44, { cue: 'chime' }], [45, { bag: true }], [52, { parcel: true }], [58, { bag: false }], [65, { cue: 'gear' }], [68, { letter: true, parcel: false }], [70, { openLetter: true }], [75, { letter: false, tea: true, cue: 'spoon' }], [77, { dust: true }]]
    },
    en: {
      a: [[2, { letter: true }], [18, { board: true, king: 'home', letter: false }], [24, { king: 'missing', trap: 'open', chase: true }], [39, { trap: 'closed' }], [40, { king: 'home' }], [47, { trap: 'open', chase: false }], [55, { trap: '', letter: true }], [58, { openLetter: true }], [63, { letter: false }], [71, { room: 'door', door: 'inside', bell: 'held' }]],
      b: [[12, { room: 'clock', letter: false, bag: true }], [14, { parcel: true }], [18, { room: 'travel', bag: false, parcel: false }], [34, { letter: true }], [35, { openLetter: true }], [45, { room: 'clock', letter: false }], [48, { watch: true }], [51, { room: 'door', door: 'outside', watch: false, bell: 'held' }], [53, { bell: 'released' }], [60, { room: 'tailor', board: true, king: 'home' }], [66, { stay: true }], [69, { board: true, king: 'home', watch: true }]],
      c: [[32, { missingSpoon: true, spoon: true }], [37, { room: 'travel' }], [40, { room: 'clock' }], [41, { gears: true }], [43, { cue: 'chime' }], [44, { bag: true }], [51, { parcel: true }], [57, { bag: false }], [64, { cue: 'gear' }], [67, { letter: true, parcel: false }], [69, { openLetter: true }], [74, { letter: false, tea: true, cue: 'spoon' }], [76, { dust: true }]]
    }
  };
  const bounds = translated => translated ? { father: 58, board: 63, release: 60, stay: 66, watch: 69, spoon: 32, bottle: 41, gear: 64, food: 59, mother: 69, extra: 72, tea: 74, greeting: 74, answer: 76 } : { father: 56, board: 61, release: 59, stay: 65, watch: 68, spoon: 33, bottle: 42, gear: 65, food: 60, mother: 70, extra: 73, tea: 75, greeting: 73, answer: 75 };
  const keyOf = index => SLUG + (index ? ':' + LETTERS[index] : '');
  const savedDone = store.get('stats', {}).done;
  const done = new Set(PREVIEW ? [] : Array.isArray(savedDone) ? savedDone : []);
  let places = PREVIEW ? {} : store.get('minute:places', {}), sideIndex = 0, paragraphs = [], weights = new Map(), totalWords = 0;
  let currentParagraph = -1, latestPlace = null, saveTimer = 0, raf = 0, lastCue = '', doorOverride = null, currentArtifact = null, sitting = false, hasSat = false, placed = false;
  let doorKnown = PREVIEW ? false : store.get('minute:door', false);
  let visits = Math.floor(clamp(+store.get('minute:visits', 0) || 0, 0, 32));
  const stage = $('#stage'), dialogs = [$('#partsDialog'), $('#settingsDialog'), $('#objectDialog')];
  const mobile = matchMedia('(max-width: 800px)');
  const allDone = () => LETTERS.every((_, i) => done.has(keyOf(i)));
  const line = () => mobile.matches ? stage.getBoundingClientRect().bottom + 18 : $('#topbar').getBoundingClientRect().bottom + 28;
  const audioStatus = sound => {
    $('#sound').disabled = !sound.supported; $('#sound').setAttribute('aria-pressed', sound.enabled);
    $('#sound').textContent = sound.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = !sound.supported ? t('Bunyi belum tersedia di peramban ini. Cerita tetap bisa dibaca.', 'Sound is unavailable in this browser. You can keep reading.') : sound.error ? t('Bunyi belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.') : t('Lonceng dan detak hanya berbunyi jika kamu memilihnya.', 'The bell and ticking only sound when you choose them.');
  };
  const sound = typeof window.MinuteSound === 'function' ? new window.MinuteSound(audioStatus) : { supported: false, enabled: false, setVolume() {}, setRoom() {}, setPaused() {}, play() {}, dispose() {} };
  audioStatus(sound);
  $('#sound').onclick = () => { void sound.setEnabled(!sound.enabled); };
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

  // Geometri toko jam dibuat sekali dan dipakai kembali pada dua ingatan.
  $('#squares').innerHTML = Array.from({ length: 64 }, (_, i) => `<rect x="${64 + (i % 8) * 13}" y="${173 + Math.floor(i / 8) * 7}" width="13" height="7" fill="currentColor" stroke="none" opacity="${(i + Math.floor(i / 8)) % 2 ? '.11' : '0'}"/>`).join('');
  $('#spoons').innerHTML = Array.from({ length: 12 }, (_, i) => `<g transform="translate(${185 + i * 14},207)"><use href="#spoon"/></g>`).join('');
  const drawStitches = () => { $('#stitches').innerHTML = Array.from({ length: 3 + visits }, (_, i) => `<path d="m${181 + i % 10 * 6} ${231 + Math.floor(i / 10) * 5} 3 2"/>`).join(''); };
  drawStitches();
  const capture = () => {
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], rect = p.getBoundingClientRect(), offset = clamp((l - rect.top) / Math.max(1, rect.height), 0, 1), weight = weights.get(p);
    const last = paragraphs[paragraphs.length - 1].getBoundingClientRect();
    const finished = last.top < innerHeight - 80 && last.bottom <= innerHeight - 60;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((weight.before + offset * weight.words) / Math.max(1, totalWords), 0, 1), finished };
  };
  const showAfterword = () => {
    const available = allDone(); $('#afterword').hidden = !available; $('#visitAgain').hidden = !available;
    const b = docs[1], refs = bounds(b.translated);
    $('#greeting').innerHTML = inline(b.body[refs.greeting]); $('#answer').innerHTML = inline(b.body[refs.answer]);
  };
  const persist = () => {
    if (!latestPlace) return;
    places[LANG] = { ...(places[LANG] || {}), [LETTERS[sideIndex]]: latestPlace };
    if (!PREVIEW) {
      store.set('minute:places', places); store.set('prog', { ...store.get('prog', {}), [keyOf(sideIndex)]: +latestPlace.progress.toFixed(4) });
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    if (latestPlace.finished && !done.has(keyOf(sideIndex))) {
      done.add(keyOf(sideIndex));
      if (!PREVIEW) store.set('stats', { ...store.get('stats', {}), done: [...done] });
      showAfterword(); $('#announcement').textContent = allDone() ? t('Tiga sisi telah sampai ke akhir. Satu sore lagi tersedia di bawah cerita.', 'All three sides have reached their end. One more afternoon is available below the story.') : t('Sisi ini telah sampai ke akhir.', 'This side has reached its end.');
    }
  };
  const stateAt = p => {
    const side = LETTERS[sideIndex], state = { room: side === 'a' ? 'tailor' : side === 'b' ? 'travel' : 'house', board: side === 'a', king: side === 'a' && (p >= 0 || placed) ? 'home' : 'waiting', trap: '', chase: false, letter: side === 'b', openLetter: false, parcel: false, bag: false, watch: false, spoon: false, tea: false, stay: false, gears: false, missingSpoon: false, dust: false, door: side === 'b' ? 'outside' : 'inside', bell: '', cue: '' };
    (BEATS[docs[sideIndex].translated ? 'en' : 'id'][side] || []).forEach(([at, patch]) => { if (p >= at) Object.assign(state, patch); });
    if (sitting) Object.assign(state, { room: 'tailor', board: true, king: 'home', letter: false, parcel: false, bag: false, watch: true, spoon: false, tea: false, trap: '', chase: false, stay: true, bell: '' });
    return state;
  };
  const artifactAt = (p, state) => {
    if (p < 0 || sitting || state.room === 'door') return null;
    const ref = bounds(docs[sideIndex].translated), side = LETTERS[sideIndex];
    if (side === 'a') {
      if (state.letter && p >= 2) return { kind: 'letter', title: t('Surat di laci', 'The letter in the drawer'), indices: p >= ref.father ? [2, ref.father] : [2], letter: true };
      if (state.board && p >= 18) return { kind: 'button', title: t('Raja dari kancing', 'The button king'), indices: [p >= ref.board ? ref.board : 18] };
    }
    if (side === 'b') {
      if (state.watch) return { kind: 'watch', title: t('Satu menit yang dijaga', 'A minute kept'), indices: [p >= ref.watch ? ref.watch : 48] };
      if (state.letter && state.openLetter && p >= 35) return { kind: 'letter', title: t('Surat yang sampai', 'The letter that arrived'), indices: p >= 37 ? [35, 37] : [35], letter: true };
      if (state.parcel) return { kind: 'parcel', title: t('Bekal di atas meja', 'Food left on the table'), indices: [14] };
    }
    if (side === 'c') {
      if (state.tea) return { kind: 'spoon', title: t('Sendok kedua belas', 'The twelfth spoon'), indices: [ref.tea] };
      if (state.letter && p >= ref.mother) return { kind: 'letter', title: t('Surat Maryam', 'Maryam’s letter'), indices: p >= ref.extra ? [ref.mother, ref.extra] : [ref.mother], letter: true };
      if (state.parcel) return { kind: 'parcel', title: t('Bekal di atas meja', 'Food left on the table'), indices: [p >= ref.food ? ref.food : docs[sideIndex].translated ? 51 : 52] };
      if (state.gears) return { kind: 'bottle', title: t('Botol kaca', 'The glass bottle'), indices: p >= ref.gear ? [ref.bottle, ref.gear] : [ref.bottle] };
      if (state.room === 'house' && p >= ref.spoon) return { kind: 'spoon', title: t('Satu sendok', 'One spoon'), indices: [ref.spoon] };
    }
    return null;
  };
  const updateStage = p => {
    const state = stateAt(p), side = LETTERS[sideIndex];
    if (state.room !== 'door') doorOverride = null;
    if (state.room === 'door' && side === 'b' && state.bell === 'released' && !doorKnown) { doorKnown = true; if (!PREVIEW) store.set('minute:door', true); }
    if (state.room === 'door' && doorOverride) state.door = doorOverride;
    Object.entries(state).forEach(([key, value]) => { if (stage.dataset[key] !== String(value)) stage.dataset[key] = String(value); });
    const caption = state.room === 'door' ? state.door === 'inside' ? t('Dari dalam', 'From inside') : t('Dari luar', 'From outside') : state.room === 'clock' ? t('Toko jam', 'The watch shop') : state.room === 'house' ? t('Laci dapur', 'The kitchen drawer') : state.room === 'travel' ? state.letter ? t('Sepucuk surat', 'A letter') : t('Di perjalanan', 'On the way') : state.stay ? t('Di sisi meja', 'Beside the table') : t('Meja dekat jendela', 'The table by the window');
    $('#sceneCaption').textContent = caption;
    $('#turnDoor').hidden = !(doorKnown && state.room === 'door'); $('#turnDoor').textContent = state.door === 'inside' ? t('Lihat dari luar', 'Look from outside') : t('Lihat dari dalam', 'Look from inside');
    currentArtifact = artifactAt(p, state); $('#inspectObject').hidden = !currentArtifact;
    stage.dataset.inspect = currentArtifact?.kind || '';
    if (currentArtifact) $('#inspectObject').textContent = currentArtifact.title;
    sound.setRoom(p < 0 ? '' : state.room);
    const cue = state.room === 'door' && side === 'b' && state.bell === 'released' ? 'bell' : side === 'c' && state.cue ? state.cue : '';
    if (cue && cue !== lastCue) sound.play(cue === 'gear' ? 'button' : cue); lastCue = cue;
  };
  const frame = () => {
    if (dialogs.some(d => d.open)) return;
    const place = capture(); currentParagraph = place ? place.paragraph : -1;
    if (sitting && currentParagraph >= 0 && currentParagraph < docs[sideIndex].body.length - 2) sitting = false;
    updateStage(currentParagraph);
    if (sitting) return; // Duduk di penutup tidak menimpa posisi membaca sebelumnya.
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latestPlace = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0, changeHash = false) => {
    const target = paragraphs.find(p => +p.dataset.p >= paragraph) || paragraphs[paragraphs.length - 1];
    if (!target) return;
    dialogs.forEach(d => { if (d.open) d.close(); });
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    if (changeHash) history.replaceState(null, '', '#' + LETTERS[sideIndex] + '-' + target.dataset.p);
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); frame();
  };
  const renderSide = index => {
    clearTimeout(saveTimer); persist(); dialogs.forEach(d => { if (d.open) d.close(); });
    sideIndex = clamp(index, 0, docs.length - 1); latestPlace = null; currentParagraph = -1; sitting = false; doorOverride = null; lastCue = '';
    const doc = docs[sideIndex]; document.documentElement.dataset.side = LETTERS[sideIndex];
    $('#sideTitle').textContent = doc.title; $('#voice').textContent = doc.pov; $('#partNumber').textContent = ROMAN[sideIndex]; $('#partLabel').textContent = doc.title;
    $('#entryNote').textContent = PREVIEW ? t('Pratinjau · satu cerita, dari tiga sisi.', 'Preview · one story, from three sides.') : t('Satu cerita, dari tiga sisi.', 'One story, from three sides.');
    $('#beginLabel').textContent = [t('Letakkan kancingnya', 'Place the button'), t('Ikuti suratnya', 'Follow the letter'), t('Hitung dari awal', 'Count from the beginning')][sideIndex];
    $('#story').innerHTML = doc.body.map((p, i) => p.trim() === '***' ? `<div class="break" role="separator"></div>` : `<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>`).join('');
    paragraphs = [...document.querySelectorAll('.passage')]; totalWords = 0; weights = new Map();
    paragraphs.forEach(p => { const words = count(doc.body[+p.dataset.p]); weights.set(p, { before: totalWords, words }); totalWords += words; });
    $('#partsList').innerHTML = docs.map((d, i) => `<button class="part-link" type="button" data-side="${i}"${i === sideIndex ? ' aria-current="page"' : ''}><span>${ROMAN[i]}</span><span><b>${esc(d.title)}</b><small>${esc(d.pov)}${done.has(keyOf(i)) ? ' · ' + t('sudah dibaca', 'read') : ''}</small></span></button>`).join('');
    $('#partsList').querySelectorAll('[data-side]').forEach(b => { b.onclick = () => { history.replaceState(null, '', '#' + LETTERS[+b.dataset.side]); renderSide(+b.dataset.side); }; });
    const place = places[LANG]?.[LETTERS[sideIndex]]; $('#resume').hidden = !(place && Number.isInteger(place.paragraph) && place.progress > 0 && place.progress < .99);
    $('#resume').textContent = t('Lanjutkan dari tempat terakhir', 'Continue where you left off'); $('#resume').onclick = () => goTo(place.paragraph, place.offset);
    $('#partEnd').hidden = false; $('#endNote').textContent = [t('Ada perjalanan sebelum pintu itu terbuka.', 'There is a journey before that door opens.'), t('Ada sisi lain yang belum terdengar.', 'There is another side still to be heard.'), t('Tiga sisi. Beberapa hal tetap tidak diketahui.', 'Three sides. Some things remain unknown.')][sideIndex];
    $('#nextSide').textContent = [t('Dari seberang pintu →', 'From the other side of the door →'), t('Yang belum sempat sampai →', 'What never quite arrived →'), t('Kembali ke Saman →', 'Return to Saman →')][sideIndex];
    showAfterword();
    if (!PREVIEW) {
      const read = store.get('read', []); if (!read.includes(keyOf(sideIndex))) store.set('read', [...read, keyOf(sideIndex)]);
      const stats = store.get('stats', {}); stats.plays = stats.plays || {}; stats.plays[keyOf(sideIndex)] = (stats.plays[keyOf(sideIndex)] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    scrollTo({ top: 0, behavior: 'instant' }); frame();
  };
  $('#nextSide').onclick = () => { const next = (sideIndex + 1) % 3; history.replaceState(null, '', '#' + LETTERS[next]); renderSide(next); };
  $('#begin').onclick = () => { sitting = false; placed = true; sound.play('button'); goTo(0); };
  $('#turnDoor').onclick = () => { doorOverride = stage.dataset.door === 'inside' ? 'outside' : 'inside'; updateStage(currentParagraph); };
  $('#inspectObject').onclick = () => {
    if (!currentArtifact) return;
    persist(); $('#objectTitle').textContent = currentArtifact.title;
    $('#objectText').innerHTML = currentArtifact.indices.map(i => {
      const text = docs[sideIndex].body[i], quoted = currentArtifact.letter ? [...text.matchAll(/\*([^*]+)\*/g)].map(m => m[1]).join('\n') || text : text;
      return `<p>${inline(quoted)}</p>`;
    }).join('');
    $('#objectSource').textContent = docs[sideIndex].pov + ' · ' + docs[sideIndex].title; $('#objectDialog').showModal();
  };
  $('#room').addEventListener('click', e => {
    const objects = { envelope: 'letter', kingButton: 'button', pocketWatch: 'watch', keptSpoon: 'spoon', bottle: 'bottle', parcel: 'parcel' };
    const id = Object.keys(objects).find(id => e.target.closest('#' + id));
    if (id === 'kingButton' && sideIndex === 0 && currentParagraph < 0) { $('#begin').click(); return; }
    if (id && currentArtifact?.kind === objects[id]) { $('#inspectObject').focus({ preventScroll: true }); $('#inspectObject').click(); }
  });
  const visit = () => {
    if (!allDone()) return;
    if (!hasSat) { visits = Math.min(32, visits + 1); if (!PREVIEW) store.set('minute:visits', visits); hasSat = true; drawStitches(); }
    sitting = true; $('#answer').hidden = false; $('#sit').disabled = true;
    scrollTo({ top: scrollY + $('#afterword').getBoundingClientRect().top - line() - 12, behavior: 'instant' });
    updateStage(docs[sideIndex].body.length - 1);
    $('#announcement').textContent = plain($('#greeting').textContent); sound.play('button');
  };
  $('#sit').onclick = visit; $('#visitAgain').onclick = visit;
  $('#openParts').onclick = () => { persist(); $('#partsDialog').showModal(); };
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  dialogs.forEach(d => {
    d.addEventListener('close', schedule);
    d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });
  });
  let size = clamp(+store.get('rd', {}).size || 19, 16, 26);
  const setSize = delta => {
    const place = delta && !sitting ? capture() : null; size = clamp(size + delta, 16, 26); document.documentElement.style.setProperty('--size', size + 'px');
    store.set('rd', { ...store.get('rd', {}), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26;
    // Panel tetap terbuka saat ukuran huruf dan posisi paragraf disesuaikan.
    if (place) {
      const target = paragraphs.find(p => +p.dataset.p === place.paragraph);
      scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + place.offset * target.getBoundingClientRect().height, behavior: 'instant' }); latestPlace = { ...place };
    }
  };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); setSize(0);
  $('#language').textContent = EN ? 'Bahasa Indonesia' : 'English';
  $('#language').onclick = () => {
    persist(); const url = new URL(location.href); url.searchParams.set('lang', EN ? 'id' : 'en');
    // Pemisah adegan menyelaraskan edisi yang membagi paragraf secara berbeda.
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
    if (!paragraphs.length || next !== sideIndex) renderSide(next);
    if (match?.[2] != null) goTo(+match[2]);
  };
  addEventListener('hashchange', followHash);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => {
    if (latestPlace && currentParagraph >= 0 && !sitting && !dialogs.some(d => d.open)) goTo(latestPlace.paragraph, latestPlace.offset); else schedule();
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); sound.dispose(); });
  document.addEventListener('visibilitychange', () => { sound.setPaused(document.hidden); if (document.hidden) persist(); else schedule(); });
  followHash();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
