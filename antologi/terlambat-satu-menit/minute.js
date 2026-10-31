/* Satu Menit: tiga jarum, tiga ingatan. Naskah dimuat utuh dari content/works.json. */
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
  const HANDS = [t('Jarum jam', 'Hour hand'), t('Jarum menit', 'Minute hand'), t('Jarum detik', 'Second hand')];
  const PREVIEW = qs.has('preview'), motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  // Jarum berhenti satu menit sebelum dua belas: 354 dari 360 derajat.
  const SHORT = 354;
  document.documentElement.lang = LANG;
  const labels = {
    dialKicker: ['Satu Menit', 'One Minute'], settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi cerita', 'Story sounds'],
    volumeLabel: ['Volume', 'Volume'], motionLabel: ['Gerak jarum', 'Moving hands'], languageLabel: ['Bahasa', 'Language'],
    allContacts: ['Kembali ke muka jam', 'Back to the clock face'], backEnd: ['Kembali ke meja tulis', 'Back to the writing desk'], dialBack: ['Kembali ke meja tulis', 'Back to the writing desk'], crossNote: ['Dari laci', 'From the drawer']
  };
  Object.entries(labels).forEach(([id, value]) => { $('#' + id).textContent = t(...value); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')], ['handList', t('Tiga sisi cerita', 'Three sides of the story')], ['stage', t('Botol kaca', 'Glass bottle')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });
  const failed = message => {
    setView('read');
    $('#story').innerHTML = `<p class="loading">${esc(message)} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`;
    ['begin', 'openParts', 'openSettings'].forEach(id => { $('#' + id).disabled = true; });
  };
  function setView(view) {
    document.documentElement.dataset.view = view;
    $('#dial').hidden = view !== 'dial'; $('#reader').hidden = view !== 'read'; $('#final').hidden = view !== 'final';
  }

  let works;
  if (PREVIEW) works = store.get('preview', null)?.works;
  try { if (!works) { const response = await fetch('../../content/works.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('content'); works = await response.json(); } } catch (_) {}
  const work = Array.isArray(works) && works.find(w => w.slug === SLUG);
  if (!work || !Array.isArray(work.body) || !Array.isArray(work.sides) || work.sides.length < 2) { failed(t('Naskah belum bisa dimuat.', 'The story could not be loaded.')); return; }
  const base = [work, ...work.sides.slice(0, 2)], translations = [work.en || {}, ...(work.en?.sides || [])];
  const docs = base.map((side, i) => {
    const translation = translations[i] || {}, translated = EN && Array.isArray(translation.body) && translation.body.length > 0;
    const source = translated ? translation : side;
    return { title: source.sideTitle || source.title || side.sideTitle || side.title, pov: source.pov || side.pov || '', body: translated ? translation.body : side.body, translated };
  });
  if (docs.some(d => !Array.isArray(d.body) || !d.body.length || d.body.some(p => typeof p !== 'string'))) { failed(t('Naskah belum lengkap.', 'The story is incomplete.')); return; }
  const title = EN ? work.en?.title || work.title : work.title;
  document.title = title + ' · ' + t('Satu Menit', 'One Minute');
  ['workTitle', 'dialTitle', 'topTitle'].forEach(id => { $('#' + id).textContent = title; });
  const keyOf = index => SLUG + (index ? ':' + LETTERS[index] : '');
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let places = PREVIEW ? {} : object(store.get('minute:places', {}));
  const memoryProgress = {};
  const progressOf = i => done.has(keyOf(i)) ? 1 : clamp(+(PREVIEW ? memoryProgress[i] : object(store.get('prog', {}))[keyOf(i)]) || 0, 0, 1);
  const allDone = () => PREVIEW || LETTERS.every((_, i) => done.has(keyOf(i)));
  let finaleSeen = !PREVIEW && store.get('minute:finale', false) === true;
  let sideIndex = 0, paragraphs = [], weights = new Map(), totalWords = 0, currentParagraph = -1, latestPlace = null, view = '';
  let saveTimer = 0, raf = 0, lastCue = '', crossing = null, traces = null, traceOrigin = null, finale = null, freeTimer = 0;
  const dialogs = [$('#settingsDialog'), $('#tracesDialog')];
  const line = () => $('#topbar').getBoundingClientRect().bottom + 28;
  const calm = () => document.documentElement.hasAttribute('data-calm');

  // Botol: kalimat bercetak miring yang tidak keluar sebagai suara menjadi gir; kalimat dalam tanda petik dihitung diam-diam.
  const SPOKEN_ITALIC = /^(bapak, aku pergi ya|father, i'm leaving now)/i;
  const segments = docs.map(doc => doc.body.map(p => {
    const held = []; let em = 0;
    for (const match of p.matchAll(/\*(\S(?:[^*]*?\S)?)\*/g)) {
      const text = match[1].trim();
      if (count(text) >= 3 && !SPOKEN_ITALIC.test(text)) held.push({ em, text });
      em++;
    }
    return { held, spoken: [...p.matchAll(/["“]([^"”]+)["”]/g)].length };
  }));
  const bottleRaw = PREVIEW ? {} : object(store.get('minute:bottle', {}));
  const heldSeen = new Set(array(bottleRaw.held)), spokenSeen = new Set(array(bottleRaw.spoken));
  const ownKeys = set => [...set].filter(key => key.startsWith(LANG + ':'));
  const bottleData = () => {
    const gears = ownKeys(heldSeen).map(key => { const [, side, p, k] = key.split(':'); return { side: +side, p: +p, k: +k }; })
      .sort((x, y) => x.side - y.side || x.p - y.p || x.k - y.k)
      .map(g => ({ ...g, text: segments[g.side][g.p]?.held[g.k]?.text })).filter(g => g.text);
    const spoken = ownKeys(spokenSeen).reduce((sum, key) => { const [, side, p] = key.split(':'); return sum + (segments[+side][+p]?.spoken || 0); }, 0);
    return { held: gears.length, spoken, gears };
  };
  const shelf = typeof window.MinuteBottle === 'function' ? [new window.MinuteBottle($('#shelfBottle')), new window.MinuteBottle($('#miniBottle'))] : [];
  const updateBottle = () => {
    const n = bottleData().held, label = t('Botol kaca berisi ', 'A glass bottle holding ') + n + ' ' + t('gir', n === 1 ? 'gear' : 'gears');
    shelf.forEach(b => b.set(n)); $('#bottleCaption').textContent = n ? n + ' ' + t('gir', n === 1 ? 'gear' : 'gears') : '';
    $('#shelfBottle').setAttribute('aria-label', label); $('#miniBottle').setAttribute('aria-label', label);
  };
  const dropGear = from => {
    if (calm() || !shelf.length) return;
    const target = (getComputedStyle($('#stage')).display !== 'none' ? shelf[0] : shelf[1]).target();
    if (!target.width) return;
    const el = document.createElement('div'); el.className = 'gear-fall'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 14 14"><path d="${window.MinuteBottle.gear(7, 7, 6.5, 0)}"/></svg>`;
    document.body.append(el);
    const x0 = from.left + Math.min(from.width, 60) / 2 - 7, y0 = from.top + Math.min(from.height, 30) / 2 - 7;
    const x1 = target.left + target.width / 2 - 7, y1 = target.top + target.height * .3;
    const anim = el.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(0) scale(1)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0 - 10}px) rotate(40deg) scale(1.1)`, opacity: 1, offset: .15 },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 40}px) rotate(220deg) scale(.9)`, opacity: 1, offset: .55 },
      { transform: `translate(${x1}px, ${y1}px) rotate(400deg) scale(.5)`, opacity: .2 }
    ], { duration: 1100, easing: 'cubic-bezier(.4,.1,.3,1)' });
    anim.onfinish = () => el.remove();
  };
  const witnessBottle = () => {
    if (crossing) return;
    let changed = false, fresh = [];
    paragraphs.forEach(node => {
      const p = +node.dataset.p, seg = segments[sideIndex][p];
      if (!seg.held.length && !seg.spoken) return;
      const key = `${LANG}:${sideIndex}:${p}`;
      const pending = seg.held.some((_, k) => !heldSeen.has(key + ':' + k)) || seg.spoken && !spokenSeen.has(key);
      if (!pending) return;
      const rect = node.getBoundingClientRect();
      if (!(rect.bottom >= line() && rect.bottom <= innerHeight - 28)) return;
      seg.held.forEach((h, k) => { if (!heldSeen.has(key + ':' + k)) { heldSeen.add(key + ':' + k); fresh.push(node.querySelectorAll('em')[h.em] || node); } });
      if (seg.spoken) spokenSeen.add(key);
      changed = true;
    });
    if (!changed) return;
    if (!PREVIEW) store.set('minute:bottle', { held: [...heldSeen], spoken: [...spokenSeen] });
    fresh.forEach((el, i) => setTimeout(() => dropGear(el.getBoundingClientRect()), i * 180));
    if (fresh.length) { sound.play('gear'); setTimeout(updateBottle, calm() ? 0 : 900); }
  };

  // Jam
  const hasClock = typeof window.MinuteClock === 'function';
  const face = hasClock ? new window.MinuteClock($('#face')) : null, mini = hasClock ? new window.MinuteClock($('#miniDial'), { minimal: true }) : null;
  const readingAngles = () => LETTERS.map((_, i) => progressOf(i) * SHORT);
  const timeAngles = () => {
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    return [h * 30, m * 6, Math.floor(s) * 6];
  };
  const updateMini = () => {
    if (!mini) return;
    mini.hands.forEach((h, i) => h.classList.toggle('current', i === sideIndex));
    mini.set(LETTERS.map((_, i) => (i === sideIndex && latestPlace ? latestPlace.progress : progressOf(i)) * SHORT));
  };
  const stopFree = () => { clearInterval(freeTimer); freeTimer = 0; };
  const renderDial = () => {
    stopFree();
    const ready = allDone() && typeof window.MinuteFinal === 'function';
    const free = finaleSeen;
    document.documentElement.toggleAttribute('data-time', false);
    if (free) document.documentElement.dataset.time = 'free';
    $('#handList').innerHTML = docs.map((d, i) => {
      const progress = progressOf(i), state = done.has(keyOf(i)) ? t('terbaca', 'read') : progress > 0 ? Math.round(progress * 100) + '%' : t('belum', 'not yet');
      return `<button class="hand-link" type="button" data-hand="${LETTERS[i]}" data-side="${i}"><span class="hand-swatch" aria-hidden="true"></span><span><b>${NAMES[i]}</b><small>${esc(HANDS[i])} · ${esc(d.title)}</small></span><span class="hand-state">${state}</span></button>`;
    }).join('');
    $('#handList').querySelectorAll('[data-side]').forEach(b => {
      b.onclick = () => navigate(+b.dataset.side);
      const focus = () => face?.focus(b.dataset.hand), blur = () => face?.focus('');
      b.onmouseenter = focus; b.onfocus = focus; b.onmouseleave = blur; b.onblur = blur;
    });
    $('#toFinal').hidden = !ready;
    $('#toFinal').innerHTML = `${free ? t('Ulangi satu menit itu', 'That minute, again') : t('Satu menit terakhir', 'The last minute')} <span aria-hidden="true">→</span>`;
    $('#dialNote').textContent = free ? t('Jamnya berjalan lagi.', 'The clock is running again.')
      : ready ? t('Ketiga jarum berhenti satu menit sebelum dua belas.', 'All three hands stopped one minute before twelve.')
      : t('Tiga jarum, tiga ingatan. Setiap jarum bergerak selama kamu membaca sisinya.', 'Three hands, three memories. Each hand moves as you read its side.');
    if (!face) return;
    face.svg.classList.toggle('free', free);
    face.set([0, 0, 0]);
    if (free) {
      face.sweep(timeAngles(), 1400, calm());
      freeTimer = setInterval(() => { if (!document.hidden) face.set(timeAngles()); }, 1000);
    } else face.sweep(readingAngles(), 1500, calm());
  };
  face?.hands.forEach((h, i) => { h.addEventListener('click', () => navigate(i)); });

  const audioStatus = sound => {
    $('#sound').disabled = !sound.supported; $('#sound').setAttribute('aria-pressed', sound.enabled);
    $('#sound').textContent = sound.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = !sound.supported ? t('Bunyi belum tersedia di peramban ini. Cerita tetap bisa dibaca.', 'Sound is unavailable in this browser. You can keep reading.') : sound.error ? t('Bunyi belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.') : t('Lonceng, detak, dan gir hanya berbunyi jika kamu memilihnya.', 'The bell, the ticking, and the gears only sound when you choose them.');
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
    const room = view !== 'read' || p < 0 ? '' : side === 'b' && (p >= 12 && p < 18 || p >= 45 && p < 51) || side === 'c' && p >= (en ? 40 : 41) ? 'clock' : 'room';
    sound.setRoom(room);
    const cue = view === 'read' && side === 'b' && p >= 53 && p < (en ? 60 : 59) ? 'bell' : view === 'read' && side === 'c' && p >= (en ? 74 : 75) ? 'spoon' : '';
    if (cue && cue !== lastCue) sound.play(cue); lastCue = cue;
  };
  const capture = () => {
    if (!paragraphs.length) return null;
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], rect = p.getBoundingClientRect(), offset = clamp((l - rect.top) / Math.max(1, rect.height), 0, 1), weight = weights.get(p);
    const last = paragraphs[paragraphs.length - 1].getBoundingClientRect(), finished = last.top < innerHeight - 80 && last.bottom <= innerHeight - 60;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((weight.before + offset * weight.words) / Math.max(1, totalWords), 0, 1), finished };
  };
  const persist = () => {
    if (!latestPlace || crossing || view !== 'read') return;
    const moved = JSON.stringify(places[LANG]?.[LETTERS[sideIndex]]) !== JSON.stringify(latestPlace);
    places[LANG] = { ...object(places[LANG]), [LETTERS[sideIndex]]: latestPlace };
    memoryProgress[sideIndex] = latestPlace.progress;
    if (!PREVIEW && moved) {
      store.set('minute:places', places); store.set('prog', { ...object(store.get('prog', {})), [keyOf(sideIndex)]: +latestPlace.progress.toFixed(4) });
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    if (latestPlace.finished && !done.has(keyOf(sideIndex))) {
      done.add(keyOf(sideIndex)); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] });
      $('#announcement').textContent = t('Jarum ini berhenti satu menit sebelum dua belas.', 'This hand stopped one minute before twelve.');
      updateEnd();
    }
  };
  const frame = () => {
    if (view !== 'read' || dialogs.some(d => d.open)) return;
    const place = capture(); currentParagraph = place ? place.paragraph : -1;
    witnessBottle(); updateSound(currentParagraph);
    traces?.witness(sideIndex, line(), !!crossing); traces?.refresh(!!crossing);
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place && !crossing) { latestPlace = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
    updateMini();
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
    if (value) $('#returnCross').textContent = '← ' + t('Kembali ke ', 'Return to ') + (value.view === 'dial' ? t('muka jam', 'the clock face') : NAMES[value.side]);
  };
  const updateEnd = () => {
    const ready = allDone() && !!finale;
    $('#endFinal').hidden = !ready;
    $('#nextSide').hidden = ready && sideIndex === 2;
  };
  const leaveRead = () => { clearTimeout(saveTimer); persist(); };
  const showDial = () => {
    leaveRead(); finale?.close(); view = 'dial'; setView('dial'); setCrossing(null); sound.setRoom('');
    scrollTo({ top: 0, behavior: 'instant' }); renderDial();
  };
  const showFinal = () => {
    if (!finale || !allDone()) { history.replaceState(null, '', location.pathname + location.search); showDial(); $('#dialNote').textContent = t('Satu menit terakhir terbuka setelah ketiga jarum berhenti.', 'The last minute opens once all three hands have stopped.'); return; }
    leaveRead(); stopFree(); view = 'final'; setView('final'); setCrossing(null); sound.setRoom('');
    scrollTo({ top: 0, behavior: 'instant' }); finale.open(); $('#play').focus({ preventScroll: true });
  };
  const renderSide = (index, record = true) => {
    clearTimeout(saveTimer); persist(); dialogs.forEach(d => { if (d.open) d.close(); });
    stopFree(); finale?.close(); view = 'read'; setView('read');
    sideIndex = clamp(index, 0, docs.length - 1); latestPlace = null; currentParagraph = -1; lastCue = '';
    const doc = docs[sideIndex], side = LETTERS[sideIndex]; document.documentElement.dataset.side = side;
    $('#sideTitle').textContent = doc.title; $('#voice').textContent = doc.pov; $('#partLabel').textContent = NAMES[sideIndex];
    $('#openParts').setAttribute('aria-label', t('Muka jam · sedang membaca ', 'Clock face · reading ') + NAMES[sideIndex]);
    $('#entryNote').textContent = (PREVIEW ? t('Pratinjau · ', 'Preview · ') : '') + HANDS[sideIndex] + ' · ' + t('tiga ingatan, satu menit.', 'three memories, one minute.');
    $('#begin').innerHTML = `${t('Mulai membaca', 'Start reading')} <span aria-hidden="true">→</span>`;
    $('#story').innerHTML = doc.body.map((p, i) => (p.trim() === '***' ? '<div class="break" role="separator"></div>' : `<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>`) + (traces?.hint(sideIndex, i) || '')).join('');
    paragraphs = [...document.querySelectorAll('.passage')]; totalWords = 0; weights = new Map();
    paragraphs.forEach(p => { const words = count(doc.body[+p.dataset.p]); weights.set(p, { before: totalWords, words }); totalWords += words; });
    const place = places[LANG]?.[side]; $('#resume').hidden = !(place && Number.isInteger(place.paragraph) && place.progress > 0 && place.progress < .99);
    $('#resume').textContent = t('Lanjutkan dari tempat terakhir', 'Continue where you left off'); $('#resume').onclick = () => { if (crossing) returnFromCrossing(); else goTo(place.paragraph, place.offset); };
    $('#partEnd').hidden = false;
    $('#endNote').textContent = [t('Lonceng di atas pintu bersiap berbunyi.', 'The bell above the door is about to ring.'), t('Satu sore, lalu satu sore lagi.', 'One afternoon, then another.'), t('Sebuah botol menunggu di rak belakang.', 'A bottle waits on the back shelf.')][sideIndex];
    $('#nextSide').textContent = HANDS[(sideIndex + 1) % 3] + ': ' + NAMES[(sideIndex + 1) % 3] + ' →';
    $('#endFinal').textContent = t('Satu menit terakhir →', 'The last minute →');
    updateEnd(); updateBottle();
    if (record && !PREVIEW) {
      const read = array(store.get('read', [])); if (!read.includes(keyOf(sideIndex))) store.set('read', [...read, keyOf(sideIndex)]);
      const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[keyOf(sideIndex)] = (+stats.plays[keyOf(sideIndex)] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    scrollTo({ top: 0, behavior: 'instant' }); frame(); updateMini();
  };
  const navigate = (index, paragraph) => {
    clearTimeout(saveTimer); persist(); setCrossing(null);
    history.replaceState(null, '', '#' + LETTERS[index] + (paragraph == null ? '' : '-' + paragraph));
    renderSide(index); if (paragraph != null) goTo(paragraph);
  };
  const toDial = () => { setCrossing(null); history.replaceState(null, '', location.pathname + location.search); showDial(); $('#handList [data-side]')?.focus({ preventScroll: true }); };
  const toFinal = () => { history.replaceState(null, '', '#menit'); showFinal(); };
  function visitScene(side, paragraph, source = null, offset = 0, note = t('Dari laci', 'From the drawer')) {
    const place = view === 'read' ? capture() : null;
    clearTimeout(saveTimer); if (!crossing && !source && place) { latestPlace = place; persist(); }
    const origin = crossing || source || { side: sideIndex, place, hash: location.hash, view };
    setCrossing(origin); $('#crossNote').textContent = note;
    history.replaceState(null, '', '#' + LETTERS[side] + '-' + paragraph);
    renderSide(side, false); goTo(paragraph, offset);
  }
  function returnFromCrossing() {
    if (!crossing) return;
    const origin = crossing; clearTimeout(saveTimer); setCrossing(null);
    history.replaceState(null, '', origin.hash || location.pathname + location.search);
    if (origin.view === 'dial') { showDial(); return; }
    renderSide(origin.side, false);
    if (origin.place) goTo(origin.place.paragraph, origin.place.offset); else $('#begin').focus({ preventScroll: true });
  }
  $('#returnCross').onclick = returnFromCrossing;
  $('#nextSide').onclick = () => navigate((sideIndex + 1) % 3); $('#begin').onclick = () => goTo(0);
  $('#openParts').onclick = toDial; $('#allContacts').onclick = toDial;
  $('#toFinal').onclick = toFinal; $('#endFinal').onclick = toFinal;
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  dialogs.forEach(d => {
    d.addEventListener('close', schedule);
    d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });
  });
  let size = clamp(+object(store.get('rd', {})).size || 19, 16, 26);
  const setSize = delta => {
    const place = delta && view === 'read' ? capture() : null; size = clamp(size + delta, 16, 26); document.documentElement.style.setProperty('--size', size + 'px');
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
    if (view !== 'read') { url.hash = view === 'final' ? 'menit' : ''; store.set('lang', EN ? 'id' : 'en'); location.replace(url.href); return; }
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
    clearTimeout(saveTimer); persist(); setCrossing(null);
    if (location.hash === '#menit') { showFinal(); return; }
    const match = /^#([abc])(?:-(\d+))?$/.exec(location.hash);
    if (!match) { showDial(); return; }
    const next = LETTERS.indexOf(match[1]);
    if (view !== 'read' || !paragraphs.length || next !== sideIndex || match[2] == null) renderSide(next);
    if (match[2] != null) goTo(+match[2]);
  };
  addEventListener('hashchange', followHash); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => {
    if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight];
    if (view !== 'read') return;
    const place = crossing ? capture() : latestPlace;
    if (place && currentParagraph >= 0 && !dialogs.some(d => d.open)) goTo(place.paragraph, place.offset); else schedule();
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); finale?.close(); sound.dispose(); });
  document.addEventListener('visibilitychange', () => { sound.setPaused(document.hidden); if (document.hidden) { persist(); finale?.pause(); } else schedule(); });
  if (typeof window.MinuteTraces === 'function') traces = new window.MinuteTraces({
    docs, t, inline, read: () => PREVIEW ? [] : array(store.get('minute:traces', [])),
    write: value => { if (!PREVIEW) store.set('minute:traces', value); },
    onOpen: () => { clearTimeout(saveTimer); const place = view === 'read' ? capture() : null; if (place && !crossing) latestPlace = place; persist(); traceOrigin = { side: sideIndex, place, hash: location.hash, view: view === 'read' ? 'read' : 'dial' }; },
    onJump: (side, paragraph) => visitScene(side, paragraph, traceOrigin, 0, t('Dari laci', 'From the drawer'))
  });
  else { $('#openTraces').textContent = t('Laci', 'Drawer'); $('#openTraces').title = t('Laci belum tersedia. Cerita tetap bisa dibaca.', 'The drawer is unavailable. You can keep reading.'); }
  if (typeof window.MinuteFinal === 'function' && hasClock) finale = new window.MinuteFinal({
    docs, t, inline, esc, en: EN, names: NAMES, hands: HANDS, sound, calm, bottle: bottleData,
    onFinish: () => { if (!finaleSeen) { finaleSeen = !PREVIEW; if (!PREVIEW) store.set('minute:finale', true); } },
    onDial: toDial
  });
  updateBottle();
  followHash();
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
