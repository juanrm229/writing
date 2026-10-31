/* Satu Menit: menggulir adalah waktu yang berjalan. Naskah dimuat utuh dari content/works.json. */
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
  const PREVIEW = qs.has('preview'), motionQuery = matchMedia('(prefers-reduced-motion: reduce)'), root = document.documentElement;
  const SHORT = 354; // satu menit sebelum dua belas
  root.lang = LANG;
  const labels = {
    coverKicker: ['Satu Menit', 'One Minute'], settingsTitle: ['Pengaturan baca', 'Reading settings'], sizeLabel: ['Ukuran huruf', 'Text size'], soundLabel: ['Bunyi cerita', 'Story sounds'],
    volumeLabel: ['Volume', 'Volume'], motionLabel: ['Gerak', 'Motion'], languageLabel: ['Bahasa', 'Language'], themeLabel: ['Tampilan', 'Appearance'],
    toCover: ['Kembali ke muka jam', 'Back to the clock face'], scrollHint: ['Gulir pelan. Jarumnya ikut berjalan.', 'Scroll slowly. The hand moves with you.']
  };
  Object.entries(labels).forEach(([id, value]) => { $('#' + id).textContent = t(...value); });
  [['back', t('Kembali ke meja tulis', 'Back to the writing desk')], ['openSettings', t('Pengaturan baca', 'Reading settings')], ['readingLine', t('Kemajuan membaca', 'Reading progress')], ['smaller', t('Perkecil huruf', 'Decrease text size')], ['bigger', t('Perbesar huruf', 'Increase text size')], ['hands', t('Tiga sisi cerita', 'Three sides of the story')]].forEach(([id, label]) => $('#' + id).setAttribute('aria-label', label));
  document.querySelectorAll('[data-close]').forEach(b => { b.setAttribute('aria-label', t('Tutup', 'Close')); b.onclick = () => b.closest('dialog').close(); });
  const setView = view => { root.dataset.view = view; $('#cover').hidden = view !== 'cover'; $('#reader').hidden = view !== 'read'; $('#final').hidden = view !== 'final'; };

  // Tema mengikuti situs: pilihan pembaca (jm:theme), lalu pengaturan admin, lalu perangkat.
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let siteTheme = PREVIEW ? store.get('preview', null)?.site?.theme : null;
  const isDark = () => { const value = root.getAttribute('data-theme'); return value ? value === 'dark' : darkQuery.matches; };
  const applyTheme = () => {
    const chosen = store.get('theme', null);
    if (chosen === 'dark' || chosen === 'light') root.setAttribute('data-theme', chosen);
    else if (siteTheme === 'gelap' || siteTheme === 'terang') root.setAttribute('data-theme', siteTheme === 'gelap' ? 'dark' : 'light');
    else root.removeAttribute('data-theme');
    const dark = isDark();
    $('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--bg').trim() || (dark ? '#15110d' : '#f3ede3');
    $('#theme').setAttribute('aria-pressed', String(dark)); $('#theme').textContent = dark ? t('Gelap', 'Dark') : t('Terang', 'Light');
    $('#theme').setAttribute('aria-label', t('Tampilan: ', 'Appearance: ') + (dark ? t('gelap. Ganti ke terang', 'dark. Switch to light') : t('terang. Ganti ke gelap', 'light. Switch to dark')));
  };
  $('#theme').onclick = () => { store.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); };
  darkQuery.addEventListener('change', applyTheme);
  addEventListener('storage', e => { if (e.key === 'jm:theme') applyTheme(); });
  applyTheme();
  if (!PREVIEW) fetch('../../content/site.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(site => { if (site?.theme) { siteTheme = site.theme; applyTheme(); } }).catch(() => {});

  const failed = message => {
    setView('read'); $('#story').innerHTML = `<p class="loading">${esc(message)} <a href="${esc(location.href)}">${t('Coba lagi', 'Try again')}</a></p>`;
    ['begin', 'openParts'].forEach(id => { $('#' + id).disabled = true; });
  };
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
  document.title = title + ' · ' + t('Satu Menit', 'One Minute'); $('#coverTitle').textContent = title;
  const keyOf = index => SLUG + (index ? ':' + LETTERS[index] : '');
  const done = new Set(PREVIEW ? [] : array(store.get('stats', {}).done));
  let places = PREVIEW ? {} : object(store.get('minute:places', {}));
  const memoryProgress = {};
  const progressOf = i => done.has(keyOf(i)) ? 1 : clamp(+(PREVIEW ? memoryProgress[i] : object(store.get('prog', {}))[keyOf(i)]) || 0, 0, 1);
  const allDone = () => PREVIEW || LETTERS.every((_, i) => done.has(keyOf(i)));
  let finaleSeen = !PREVIEW && store.get('minute:finale', false) === true;
  let sideIndex = 0, paragraphs = [], weights = new Map(), totalWords = 0, currentParagraph = -1, lastParagraph = -1, latestPlace = null, view = '';
  let saveTimer = 0, raf = 0, freeTimer = 0, sceneSig = '', finale = null;
  const dialogs = [$('#settingsDialog')];
  const calm = () => root.hasAttribute('data-calm');
  const line = () => innerHeight * (matchMedia('(max-width: 900px)').matches ? .56 : .45);

  // Jam raksasa di balik semuanya, dan jam kecil di bilah atas.
  const hasClock = typeof window.MinuteClock === 'function';
  const giant = hasClock ? new window.MinuteClock($('#giant'), { giant: true }) : null;
  const mini = hasClock ? new window.MinuteClock($('#miniDial'), { minimal: true }) : null;
  const world = typeof window.MinuteWorld === 'function' ? new window.MinuteWorld($('#scene'), docs, EN) : null;
  const readingAngles = () => LETTERS.map((_, i) => (i === sideIndex && view === 'read' && latestPlace ? latestPlace.progress : progressOf(i)) * SHORT);
  const timeAngles = () => {
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    return [h * 30, m * 6, Math.floor(s) * 6];
  };
  const markHands = () => [giant, mini].forEach(c => c?.hands.forEach((h, i) => h.classList.toggle('current', view === 'read' && i === sideIndex)));

  // Botol kaca: kalimat bercetak miring yang tidak keluar sebagai suara menjadi gir.
  const SPOKEN_ITALIC = /^(bapak, aku pergi ya|father, i'm leaving now)/i;
  const segments = docs.map(doc => doc.body.map(p => {
    const held = []; let em = 0;
    for (const match of p.matchAll(/\*(\S(?:[^*]*?\S)?)\*/g)) { const text = match[1].trim(); if (count(text) >= 3 && !SPOKEN_ITALIC.test(text)) held.push({ em, text }); em++; }
    return { held, spoken: [...p.matchAll(/["“]([^"”]+)["”]/g)].length };
  }));
  const bottleRaw = PREVIEW ? {} : object(store.get('minute:bottle', {}));
  const heldSeen = new Set(array(bottleRaw.held)), spokenSeen = new Set(array(bottleRaw.spoken));
  const ownKeys = set => [...set].filter(key => key.startsWith(LANG + ':'));
  const bottleData = () => {
    const gears = ownKeys(heldSeen).map(key => { const [, side, p, k] = key.split(':'); return { side: +side, p: +p, k: +k }; })
      .sort((x, y) => x.side - y.side || x.p - y.p || x.k - y.k).map(g => ({ ...g, text: segments[g.side][g.p]?.held[g.k]?.text })).filter(g => g.text);
    const spoken = ownKeys(spokenSeen).reduce((sum, key) => { const [, side, p] = key.split(':'); return sum + (segments[+side][+p]?.spoken || 0); }, 0);
    return { held: gears.length, spoken, gears };
  };
  const bottle = typeof window.MinuteBottle === 'function' ? new window.MinuteBottle($('#miniBottle')) : null;
  const updateBottle = () => {
    const n = bottleData().held; bottle?.set(n);
    $('#miniBottle').setAttribute('aria-label', t('Botol kaca berisi ', 'A glass bottle holding ') + n + ' ' + t('gir', n === 1 ? 'gear' : 'gears'));
  };
  const dropGear = from => {
    if (calm() || !bottle) return;
    const target = bottle.target(); if (!target.width) return;
    const el = document.createElement('div'); el.className = 'gear-fall'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 14 14"><path d="${window.MinuteBottle.gear(7, 7, 6.5, 0)}"/></svg>`; document.body.append(el);
    const x0 = from.left + Math.min(from.width, 80) / 2 - 7, y0 = from.top + Math.min(from.height, 30) / 2 - 7, x1 = target.left + target.width / 2 - 7, y1 = target.top + target.height * .45;
    el.animate([
      { transform: `translate(${x0}px, ${y0}px) rotate(0) scale(1.4)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0 - 14}px) rotate(60deg) scale(1.5)`, opacity: 1, offset: .18 },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 30}px) rotate(260deg) scale(1)`, opacity: 1, offset: .6 },
      { transform: `translate(${x1}px, ${y1}px) rotate(420deg) scale(.4)`, opacity: .3 }
    ], { duration: 1300, easing: 'cubic-bezier(.4,.1,.3,1)' }).onfinish = () => el.remove();
  };
  const witnessBottle = () => {
    let changed = false; const fresh = [];
    paragraphs.forEach(node => {
      const p = +node.dataset.p, seg = segments[sideIndex][p];
      if (!seg.held.length && !seg.spoken) return;
      const key = `${LANG}:${sideIndex}:${p}`;
      if (!seg.held.some((_, k) => !heldSeen.has(key + ':' + k)) && !(seg.spoken && !spokenSeen.has(key))) return;
      const rect = node.getBoundingClientRect();
      if (!(rect.bottom >= 60 && rect.bottom <= innerHeight - 20 && rect.bottom <= line() + 40)) return;
      seg.held.forEach((h, k) => { if (!heldSeen.has(key + ':' + k)) { heldSeen.add(key + ':' + k); fresh.push(node.querySelectorAll('em')[h.em] || node); } });
      if (seg.spoken) spokenSeen.add(key);
      changed = true;
    });
    if (!changed) return;
    if (!PREVIEW) store.set('minute:bottle', { held: [...heldSeen], spoken: [...spokenSeen] });
    fresh.forEach((el, i) => { el.classList.add('held'); setTimeout(() => dropGear(el.getBoundingClientRect()), i * 200); });
    if (fresh.length) { sound.play('gear'); setTimeout(updateBottle, calm() ? 0 : 1100); }
  };

  // Bunyi
  const audioStatus = s => {
    $('#sound').disabled = !s.supported; $('#sound').setAttribute('aria-pressed', s.enabled);
    $('#sound').textContent = s.enabled ? t('Matikan', 'Turn off') : t('Nyalakan', 'Turn on');
    $('#soundNote').textContent = !s.supported ? t('Bunyi belum tersedia di peramban ini. Cerita tetap bisa dibaca.', 'Sound is unavailable in this browser. You can keep reading.') : s.error ? t('Bunyi belum bisa dimulai. Coba nyalakan lagi.', 'Sound could not start. Try turning it on again.') : t('Detak, hujan, kereta, dan lonceng hanya terdengar jika kamu memilihnya. Paling terasa dengan headphone.', 'Ticking, rain, the train, and the bell only play if you choose them. Best with headphones.');
  };
  const sound = typeof window.MinuteSound === 'function' ? new window.MinuteSound(audioStatus) : { supported: false, enabled: false, setVolume() {}, setScene() {}, setPaused() {}, play() {}, dispose() {} };
  audioStatus(sound); $('#sound').onclick = () => { void sound.setEnabled(!sound.enabled); };
  const rawVolume = store.get('minute:volume', 25); $('#volume').value = Number.isFinite(rawVolume) ? clamp(rawVolume, 0, 100) : 25;
  const setVolume = () => { const value = +$('#volume').value; $('#volumeValue').value = value + '%'; $('#volume').setAttribute('aria-valuetext', value + '%'); store.set('minute:volume', value); sound.setVolume(value / 100); };
  $('#volume').oninput = setVolume; setVolume();
  const setMotion = () => {
    const enabled = !motionQuery.matches && store.get('minute:motion', true) !== false;
    root.toggleAttribute('data-calm', !enabled); $('#motion').disabled = motionQuery.matches;
    $('#motion').setAttribute('aria-pressed', enabled); $('#motion').textContent = enabled ? t('Aktif', 'On') : t('Tenang', 'Still');
  };
  $('#motion').onclick = () => { store.set('minute:motion', $('#motion').getAttribute('aria-pressed') !== 'true'); setMotion(); };
  motionQuery.addEventListener('change', setMotion); setMotion();

  // Ketukan besar: lonceng menghentikan layar sejenak.
  const FX_SOUND = { bell: 'bell', chime: 'chime', gear: 'gear', spoon: 'spoon', snap: 'snap', drop: 'drop', move: 'move', stamps: 'stamp', scatter: 'scatter', fly: 'fly' };
  const flash = kind => { const el = $('#flash'); el.dataset.kind = kind; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  const fire = fx => {
    world?.fx(fx);
    if (FX_SOUND[fx]) sound.play(FX_SOUND[fx]);
    if (fx === 'bell' || fx === 'chime') { flash(fx); root.dataset.jolt = ''; void root.offsetWidth; root.dataset.jolt = fx; }
  };
  const updateScene = p => {
    if (!world) return null;
    const state = world.render(sideIndex, Math.max(p, 0));
    const sig = sideIndex + JSON.stringify(state);
    if (sig !== sceneSig) {
      sceneSig = sig; sound.setScene({ side: sideIndex + 1, ...state });
      root.dataset.night = state.night || 'off'; root.dataset.fog = state.fog || 'off'; root.dataset.rain = state.rain || 'off';
      root.dataset.stopped = state.stopped === 'on' || state.clocks === 'frozen' ? 'on' : 'off';
    }
    return state;
  };
  // Ingatan Saman: setelah kabut turun, kalimat yang sudah lewat perlahan mengabur.
  const fogText = () => {
    const on = sideIndex === 0 && root.dataset.fog === 'on' && !calm(), l = line();
    paragraphs.forEach(node => {
      if (!on) { if (node.style.filter) { node.style.filter = ''; node.style.opacity = ''; } return; }
      const r = node.getBoundingClientRect();
      if (r.bottom < -300 || r.top > innerHeight) return;
      const k = clamp((l - r.bottom) / 260, 0, 1);
      node.style.filter = k ? `blur(${(k * 5).toFixed(2)}px)` : ''; node.style.opacity = k ? String(1 - k * .55) : '';
    });
  };

  const capture = () => {
    if (!paragraphs.length) return null;
    const l = line(); let lo = 0, hi = paragraphs.length - 1, found = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (paragraphs[mid].getBoundingClientRect().top <= l + .5) { found = mid; lo = mid + 1; } else hi = mid - 1; }
    if (found < 0) return null;
    const p = paragraphs[found], rect = p.getBoundingClientRect(), offset = clamp((l - rect.top) / Math.max(1, rect.height), 0, 1), weight = weights.get(p);
    const last = paragraphs[paragraphs.length - 1].getBoundingClientRect(), finished = found === paragraphs.length - 1 && last.bottom <= innerHeight - 40;
    return { paragraph: +p.dataset.p, offset, progress: finished ? 1 : clamp((weight.before + offset * weight.words) / Math.max(1, totalWords), 0, 1), finished };
  };
  const persist = () => {
    if (!latestPlace || view !== 'read') return;
    const moved = JSON.stringify(places[LANG]?.[LETTERS[sideIndex]]) !== JSON.stringify(latestPlace);
    places[LANG] = { ...object(places[LANG]), [LETTERS[sideIndex]]: latestPlace }; memoryProgress[sideIndex] = latestPlace.progress;
    if (!PREVIEW && moved) {
      store.set('minute:places', places); store.set('prog', { ...object(store.get('prog', {})), [keyOf(sideIndex)]: +latestPlace.progress.toFixed(4) });
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    if (latestPlace.finished && !done.has(keyOf(sideIndex))) {
      done.add(keyOf(sideIndex)); if (!PREVIEW) store.set('stats', { ...object(store.get('stats', {})), done: [...done] });
      $('#announcement').textContent = t('Jarum ini berhenti satu menit sebelum dua belas.', 'This hand stopped one minute before twelve.'); updateEnd();
    }
  };
  const frame = () => {
    if (view !== 'read' || dialogs.some(d => d.open)) return;
    const place = capture(); currentParagraph = place ? place.paragraph : -1;
    if (currentParagraph !== lastParagraph) { (world?.crossed(sideIndex, lastParagraph, currentParagraph) || []).forEach(fire); lastParagraph = currentParagraph; }
    updateScene(currentParagraph); witnessBottle(); fogText();
    const progress = place?.progress || 0; $('#readingLine').style.setProperty('--progress', progress); $('#readingLine').setAttribute('aria-valuenow', Math.round(progress * 100));
    if (place) { latestPlace = place; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); }
    const angles = readingAngles(); giant?.set(angles); mini?.set(angles);
    root.toggleAttribute('data-reading', scrollY > innerHeight * .4);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); };
  const goTo = (paragraph, offset = 0) => {
    const target = paragraphs.find(p => +p.dataset.p >= paragraph) || paragraphs.at(-1); if (!target) return;
    dialogs.forEach(d => { if (d.open) d.close(); });
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + clamp(offset, 0, 1) * target.getBoundingClientRect().height, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); lastParagraph = 1e6; frame(); lastParagraph = currentParagraph;
  };
  const updateEnd = () => { const ready = allDone() && !!finale; $('#endFinal').hidden = !ready; $('#nextSide').hidden = ready && sideIndex === 2; };
  const stopFree = () => { clearInterval(freeTimer); freeTimer = 0; };

  // Muka jam
  const renderCover = () => {
    const ready = allDone() && !!finale, free = finaleSeen;
    root.toggleAttribute('data-free', free);
    $('#hands').innerHTML = docs.map((d, i) => {
      const progress = progressOf(i), state = done.has(keyOf(i)) ? t('berhenti', 'stopped') : progress > 0 ? Math.round(progress * 100) + '%' : '';
      return `<button class="hand-link" type="button" data-side="${i}" data-hand="${LETTERS[i]}"><span class="hand-mark" aria-hidden="true"></span><span class="hand-name">${NAMES[i]}</span><span class="hand-meta">${esc(HANDS[i])} · ${esc(d.title)}</span>${state ? `<span class="hand-state">${state}</span>` : ''}</button>`;
    }).join('');
    $('#hands').querySelectorAll('[data-side]').forEach(b => {
      b.onclick = () => navigate(+b.dataset.side);
      const focus = () => giant?.focus(b.dataset.hand), blur = () => giant?.focus('');
      b.onmouseenter = focus; b.onfocus = focus; b.onmouseleave = blur; b.onblur = blur;
    });
    $('#toFinal').hidden = !ready; $('#toFinal').textContent = free ? t('Ulangi satu menit itu', 'That minute, again') : t('Satu menit terakhir', 'The last minute');
    $('#coverNote').textContent = free ? t('Jamnya berjalan lagi.', 'The clock is running again.')
      : ready ? t('Ketiga jarum berhenti satu menit sebelum dua belas.', 'All three hands stopped one minute before twelve.')
      : t('Tiga jarum. Tiga ingatan. Satu lonceng.', 'Three hands. Three memories. One bell.');
    if (!giant) return;
    giant.set([0, 0, 0]); giant.svg.classList.toggle('free', free);
    if (free) { giant.sweep(timeAngles(), 1600, calm()); freeTimer = setInterval(() => { if (!document.hidden) giant.set(timeAngles()); }, 1000); }
    else giant.sweep(LETTERS.map((_, i) => progressOf(i) * SHORT), 1800, calm());
  };
  giant?.hands.forEach((h, i) => h.addEventListener('click', () => { if (view === 'cover') navigate(i); }));
  const showCover = () => {
    clearTimeout(saveTimer); persist(); finale?.close(); stopFree(); view = 'cover'; setView('cover'); markHands();
    root.dataset.side = ''; root.dataset.fog = 'off'; root.dataset.stopped = 'off'; sound.setScene({}); sceneSig = ''; scrollTo({ top: 0, behavior: 'instant' }); renderCover();
  };
  const showFinal = () => {
    if (!finale || !allDone()) { history.replaceState(null, '', location.pathname + location.search); showCover(); $('#coverNote').textContent = t('Satu menit terakhir terbuka setelah ketiga jarum berhenti.', 'The last minute opens once all three hands have stopped.'); return; }
    clearTimeout(saveTimer); persist(); stopFree(); view = 'final'; setView('final'); markHands();
    root.dataset.side = ''; root.dataset.fog = 'off'; root.dataset.stopped = 'off'; sound.setScene({ side: 4 }); sceneSig = ''; scrollTo({ top: 0, behavior: 'instant' }); finale.open(); $('#play').focus({ preventScroll: true });
  };
  const renderSide = (index, record = true) => {
    clearTimeout(saveTimer); persist(); dialogs.forEach(d => { if (d.open) d.close(); });
    stopFree(); finale?.close(); view = 'read'; setView('read');
    sideIndex = clamp(index, 0, 2); latestPlace = null; currentParagraph = -1; lastParagraph = -1; sceneSig = '';
    const doc = docs[sideIndex], side = LETTERS[sideIndex]; root.dataset.side = side; markHands(); giant?.svg.classList.remove('free'); root.removeAttribute('data-free');
    $('#sideTitle').textContent = doc.title; $('#voice').textContent = doc.pov; $('#sideKicker').textContent = (PREVIEW ? t('Pratinjau · ', 'Preview · ') : '') + HANDS[sideIndex] + ' · ' + NAMES[sideIndex];
    $('#partLabel').textContent = NAMES[sideIndex]; $('#openParts').setAttribute('aria-label', t('Muka jam · sedang membaca ', 'Clock face · reading ') + NAMES[sideIndex]);
    $('#begin').textContent = t('Mulai membaca', 'Start reading');
    $('#story').innerHTML = doc.body.map((p, i) => p.trim() === '***' ? '<div class="break" role="separator"><span></span></div>' : `<p class="passage" id="p-${i}" data-p="${i}">${inline(p)}</p>`).join('');
    paragraphs = [...document.querySelectorAll('.passage')]; totalWords = 0; weights = new Map();
    paragraphs.forEach(p => { const words = count(doc.body[+p.dataset.p]); weights.set(p, { before: totalWords, words }); totalWords += words; });
    paragraphs.forEach(p => { segments[sideIndex][+p.dataset.p].held.forEach((h, k) => { if (heldSeen.has(`${LANG}:${sideIndex}:${p.dataset.p}:${k}`)) p.querySelectorAll('em')[h.em]?.classList.add('held'); }); });
    const place = places[LANG]?.[side]; $('#resume').hidden = !(place && Number.isInteger(place.paragraph) && place.progress > 0 && place.progress < .99);
    $('#resume').textContent = t('Lanjutkan dari tempat terakhir', 'Continue where you left off'); $('#resume').onclick = () => goTo(place.paragraph, place.offset);
    $('#partEnd').hidden = false;
    $('#endNote').textContent = [t('Lonceng di atas pintu bersiap berbunyi.', 'The bell above the door is about to ring.'), t('Satu sore, lalu satu sore lagi.', 'One afternoon, then another.'), t('Sebuah botol menunggu di rak belakang.', 'A bottle waits on the back shelf.')][sideIndex];
    $('#nextSide').textContent = HANDS[(sideIndex + 1) % 3] + ': ' + NAMES[(sideIndex + 1) % 3];
    $('#endFinal').textContent = t('Satu menit terakhir', 'The last minute');
    updateEnd(); updateBottle();
    if (record && !PREVIEW) {
      const read = array(store.get('read', [])); if (!read.includes(keyOf(sideIndex))) store.set('read', [...read, keyOf(sideIndex)]);
      const stats = object(store.get('stats', {})); stats.plays = object(stats.plays); stats.plays[keyOf(sideIndex)] = (+stats.plays[keyOf(sideIndex)] || 0) + 1; store.set('stats', stats);
      store.set('last', { key: keyOf(sideIndex), at: Date.now() });
    }
    scrollTo({ top: 0, behavior: 'instant' }); updateScene(-1); frame();
  };
  const navigate = (index, paragraph) => {
    clearTimeout(saveTimer); persist();
    history.replaceState(null, '', '#' + LETTERS[index] + (paragraph == null ? '' : '-' + paragraph));
    renderSide(index); if (paragraph != null) goTo(paragraph);
  };
  const toCover = () => { history.replaceState(null, '', location.pathname + location.search); showCover(); $('#hands [data-side]')?.focus({ preventScroll: true }); };
  const toFinal = () => { history.replaceState(null, '', '#menit'); showFinal(); };
  $('#nextSide').onclick = () => navigate((sideIndex + 1) % 3); $('#begin').onclick = () => goTo(0);
  $('#openParts').onclick = toCover; $('#toCover').onclick = toCover; $('#toFinal').onclick = toFinal; $('#endFinal').onclick = toFinal;
  $('#openSettings').onclick = () => { persist(); $('#settingsDialog').showModal(); };
  dialogs.forEach(d => {
    d.addEventListener('close', schedule);
    d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close(); });
  });
  let size = clamp(+object(store.get('rd', {})).size || 20, 16, 26);
  const setSize = delta => {
    const place = delta && view === 'read' ? capture() : null; size = clamp(size + delta, 16, 26); root.style.setProperty('--size', size + 'px');
    store.set('rd', { ...object(store.get('rd', {})), size }); $('#smaller').disabled = size === 16; $('#bigger').disabled = size === 26;
    if (place) { const target = paragraphs.find(p => +p.dataset.p === place.paragraph); scrollTo({ top: scrollY + target.getBoundingClientRect().top - line() + place.offset * target.getBoundingClientRect().height, behavior: 'instant' }); latestPlace = { ...place }; }
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
    clearTimeout(saveTimer); persist();
    if (location.hash === '#menit') { showFinal(); return; }
    const match = /^#([abc])(?:-(\d+))?$/.exec(location.hash);
    if (!match) { showCover(); return; }
    const next = LETTERS.indexOf(match[1]);
    if (view !== 'read' || !paragraphs.length || next !== sideIndex || match[2] == null) renderSide(next);
    if (match[2] != null) goTo(+match[2]);
  };
  addEventListener('hashchange', followHash); addEventListener('scroll', schedule, { passive: true });
  let lastSize = [innerWidth, innerHeight];
  addEventListener('resize', () => {
    if (lastSize[0] === innerWidth && lastSize[1] === innerHeight) return; lastSize = [innerWidth, innerHeight];
    if (view !== 'read') return;
    if (latestPlace && currentParagraph >= 0 && !dialogs.some(d => d.open)) goTo(latestPlace.paragraph, latestPlace.offset); else schedule();
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); persist(); finale?.close(); sound.dispose(); });
  document.addEventListener('visibilitychange', () => { sound.setPaused(document.hidden); if (document.hidden) { persist(); finale?.pause(); } else schedule(); });
  if (typeof window.MinuteFinal === 'function' && giant) finale = new window.MinuteFinal({
    docs, t, inline, esc, en: EN, names: NAMES, hands: HANDS, sound, calm, clock: giant, bottle: bottleData, flash,
    onFinish: () => { if (!finaleSeen && !PREVIEW) { finaleSeen = true; store.set('minute:finale', true); } },
    onCover: toCover
  });
  updateBottle();
  followHash();
  requestAnimationFrame(() => root.classList.add('ready'));
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
