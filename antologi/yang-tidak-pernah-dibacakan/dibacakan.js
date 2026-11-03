/* Yang Tidak Pernah Dibacakan: novel tentang jarak antara yang ditulis dan yang dibacakan.
   Teks dimuat utuh dari content/works.json (bab demi bab); yang ditambahkan hanya antarmukanya.
   - Tangga: delapan bab adalah delapan anak tangga yang turun. Makin ke bawah kamar makin gelap, lampu makin kuning,
     dan hujan mengikuti teks (menebal di bab pertama, reda di bab keempat, tinggal tetes di bab kelima).
   - Surat dua lapis: surat Damar yang ada di teks tampil sebagai kertas. Di bab kedua pembaca memegang pena Sarah dan
     mencabut sendiri duri-durinya (bedanya dihitung dari dua versi surat yang memang ada di teks). Di bab ketiga satu
     kalimat hilang saat narasinya sampai ke sana, di bab kelima "aku sedang berubah" dicoret.
   - Didengar dalam gelap: surat bisa didengar seperti Renjani mendengarnya, dengan layar gelap dan suara peramban.
     Tanpa suara, kalimatnya muncul satu per satu.
   - Amplop: tersegel sejak bab pertama, berisi surat terakhir sejak bab keenam, dan baru dibuka pembaca sendiri di bab
     kedelapan. Surat itu dibacakan tanpa satu kata pun diubah, dengan keheningan sungguhan sesudah "siap".
   - Timbangan: di setiap anak tangga pembaca menimbang Sarah (benci, mengerti, memaafkan); di akhir jejaknya terlihat.
   - Rantai: ibu Sarah, Sarah, Renjani, Kirana, dan di mana rantai itu putus.
   - Bacakan kepada seseorang: rekam suaramu sendiri membacakan surat itu (tidak dikirim ke mana pun), atau bagikan
     tautan yang membuka amplopnya untuk orang lain (#surat). */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const PREVIEW = qs.get('preview') === '1', HISTORY = ['read', 'stats', 'last', 'prog', 'ytpd'];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { if (PREVIEW && HISTORY.includes(k)) return; try { localStorage.setItem('jm:' + k, JSON.stringify(v)); } catch (e) { /* penyimpanan tidak tersedia */ } }
  };
  const SLUG = 'yang-tidak-pernah-dibacakan', G = window.JMGuide, root = document.documentElement;
  const EN = (qs.get('lang') || store.get('lang', 'id')) === 'en';
  const t = (id, en) => (EN ? en : id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:[^*]*?\S)?)\*/g, '<em>$1</em>');
  const plain = s => String(s).replace(/\*/g, '').trim();
  const hasText = b => Array.isArray(b) && b.some(p => String(p).trim());
  const isBreak = p => !/[\p{L}\p{N}]/u.test(String(p));
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => motionQ.matches || root.hasAttribute('data-calm');
  root.lang = t('id', 'en');
  root.toggleAttribute('data-calm', !!store.get('ytpd:calm', false));
  const announce = m => { const a = $('#announcement'); a.textContent = ''; setTimeout(() => { a.textContent = m; }, 30); };

  /* ---------- naskah ---------- */
  let work = null;
  if (PREVIEW) work = (store.get('preview', null)?.works || []).find(w => w.slug === SLUG) || null;
  if (!work) try { work = (await (await fetch('../../content/works.json', { cache: 'no-cache' })).json()).find(w => w.slug === SLUG); } catch (e) { /* luring */ }
  const story = $('#story');
  const chOf = w => (Array.isArray(w?.chapters) ? w.chapters.filter(c => hasText(c.body)) : []);
  if (!work || (!chOf(work).length && !hasText(work.body))) { story.innerHTML = `<p class="loading">${t('Cerita belum bisa dimuat.', 'The story could not be loaded.')} <a href="../../">${t('Kembali', 'Go back')}</a></p>`; return; }
  const tr = (EN && work.lang !== 'en' ? work.en : !EN && work.lang === 'en' ? work.id : null) || {};
  const lost = (EN ? work.lang !== 'en' : work.lang === 'en') && !chOf(tr).length && !hasText(tr.body);
  const CH = chOf(tr).length ? chOf(tr) : chOf(work).length ? chOf(work) : [{ title: '', body: work.body }];
  const title = tr.title || work.title;
  document.title = `${title} · Quiet Margins`;
  $('#title').textContent = title;
  $('#kick').textContent = t('Temusai · Novel', 'Temusai · Novel');
  $('#lede').textContent = t('Selama sepuluh tahun, setiap surat Damar untuk Renjani yang buta harus lewat satu pintu: suara ibunya.', 'For ten years, every letter Damar wrote to blind Renjani had to pass through one door: her mother’s voice.');
  $('#lgWritten').textContent = t('Yang ditulis Damar', 'What Damar wrote');
  $('#lgRead').textContent = t('Yang dibacakan Sarah', 'What Sarah read aloud');
  $('#lgDark').textContent = t('Didengar dalam gelap', 'Heard in the dark');
  if (lost) { $('#lost').hidden = false; $('#lost').textContent = t('Cerita ini belum diterjemahkan, jadi ditampilkan dalam bahasa aslinya.', 'This story is not translated yet, so it is shown in the original language.'); }

  /* ---------- ingatan pembaca ---------- */
  const blank = () => ({ v: 1, verdict: {}, mine: 0, opened: false, heard: {} });
  let S = store.get('ytpd', null); if (!S || S.v !== 1) S = blank();
  const save = () => store.set('ytpd', S);

  /* ---------- surat-surat di teks ----------
     Dikenali dari kalimat pembukanya (dua bahasa). Kalau naskah diubah dan kalimatnya tidak ditemukan,
     paragraf itu tampil biasa: ceritanya tetap utuh. */
  const L = {
    angry: /^(Kadang aku benci diriku|Sometimes I hate myself)/,
    soft: /^(Kadang aku sedih|Sometimes I feel sad)/,
    orange: /^(Hari ini langitnya oranye|Today the sky is orange)/,
    orangeCut: /[^.!?]*(kau tidak bisa melihat oranye|you can'?t see orange)[^.!?]*[.!?]/i,
    orangeTrig: /(menghilangkan satu kalimat|dropped one sentence)/,
    change: /(Ren, aku sedang berubah|Ren, I am changing)/,
    changeTrig: /(Ia menghapus "aku sedang berubah"|Ia menghapus|edited those sentences out)/,
    last: /^(Ren\. Aku sudah menjadi lelaki|Ren\. I have become the man)/,
    lastTrig: /(Sarah tidak membacakannya|Sarah did not read it)/,
    truth: /^"(Ren\. Aku sudah|Aku aman sekarang|Aku tidak bisa terus|Ren\. I have|I'm safe now|I cannot keep)/,
    opens: /^(Kirana membuka amplop itu|Kirana opened the envelope)/,
    pull: /(menarik keluar sebuah amplop|pulled out an envelope)/
  };
  const isItalicPara = p => /^\*[^*]/.test(p.trim()) && /\*$/.test(p.trim());
  let LAST = '';   // surat terakhir, utuh, dari bab keenam
  CH.forEach(c => c.body.forEach(p => { if (isItalicPara(p) && L.last.test(plain(p))) LAST = plain(p); }));
  const SENT = /[^.!?…]+(?:[.!?…]+["”’)]*)?/g;
  const sentences = s => (String(s).match(SENT) || []).map(x => x.trim()).filter(Boolean);

  /* ---------- beda dua versi surat: dihitung kata demi kata dari teks ---------- */
  function diff(a, b) {
    const A = a.split(/\s+/), B = b.split(/\s+/), n = A.length, m = B.length;
    const T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    const out = []; let i = 0, j = 0, hunk = null;
    const flush = () => { if (hunk) { out.push(hunk); hunk = null; } };
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) { flush(); out.push({ eq: A[i] }); i++; j++; }
      else if (j < m && (i >= n || T[i][j + 1] >= T[i + 1][j])) { (hunk = hunk || { del: [], add: [] }).add.push(B[j]); j++; }
      else { (hunk = hunk || { del: [], add: [] }).del.push(A[i]); i++; }
    }
    flush();
    // kata sambung pendek yang terjepit di antara dua suntingan ikut ke suntingan supaya potongannya utuh
    const merged = [];
    out.forEach(x => { const prev = merged[merged.length - 1], prev2 = merged[merged.length - 2]; if (!x.eq && prev && prev.eq && prev.eq.length <= 3 && prev2 && !prev2.eq) { prev2.del.push(prev.eq, ...x.del); prev2.add.push(prev.eq, ...x.add); merged.pop(); } else merged.push(x); });
    return merged;
  }

  /* ---------- menyusun cerita ---------- */
  const RAIN = [.85, .7, .7, .5, .25, .3, .2, .12], LAMP = [.55, .6, .65, .7, .78, .82, .9, 1];
  const softText = (() => { for (const c of CH) for (const p of c.body) if (isItalicPara(p) && L.soft.test(plain(p))) return plain(p); return ''; })();
  const letterHead = (k, label) => `<header class="lt-h"><span class="lt-k">${esc(k)}</span>${label ? `<span class="lt-l">${esc(label)}</span>` : ''}</header>`;
  let editCard = null;
  function render() {
    let html = '';
    CH.forEach((c, ci) => {
      html += `<section class="step" id="bab-${ci + 1}" data-ch="${ci}" style="--i:${ci}"><header class="st-h"><p class="st-k"><span>${esc(t(`Anak tangga ${ci + 1}`, `Step ${ci + 1}`))}</span><span class="st-of">${ci + 1}/${CH.length}</span></p><h2>${esc(c.title || '')}</h2></header>`;
      c.body.forEach((raw, pi) => {
        const p = String(raw), txt = plain(p);
        if (!txt || isBreak(p)) { html += '<p class="scene" aria-hidden="true"><span>⁂</span></p>'; return; }
        if (isItalicPara(p)) {
          if (L.angry.test(txt) && softText) { html += angryHTML(txt); return; }
          if (L.soft.test(txt)) { html += `<figure class="letter voiced" data-letter="soft">${letterHead(t('Yang dibacakan Sarah', 'What Sarah read aloud'), t('sore itu, di ruang tamu', 'that afternoon, in the front room'))}<blockquote>${esc(txt)}</blockquote><figcaption class="lt-act"><button type="button" class="lt-btn" data-listen="soft">${ear()}${esc(t('Dengarkan seperti Renjani', 'Hear it as Renjani did'))}</button></figcaption></figure>`; return; }
          if (L.orange.test(txt)) { const m = txt.match(L.orangeCut); const body = m ? esc(txt.slice(0, m.index)) + `<span class="cut" data-cut>${esc(m[0])}</span>` + esc(txt.slice(m.index + m[0].length)) : esc(txt); html += `<figure class="letter cutting" data-letter="orange">${letterHead(t('Surat Damar', 'Damar’s letter'), t('langit oranye', 'the orange sky'))}<blockquote>${body}</blockquote><figcaption class="lt-act"><button type="button" class="lt-btn" data-listen="orange">${ear()}${esc(t('Dengarkan seperti Renjani', 'Hear it as Renjani did'))}</button><span class="lt-note" data-cutnote hidden>${esc(t('Satu kalimat tidak pernah sampai.', 'One sentence never arrived.'))}</span></figcaption></figure>`; return; }
          if (L.last.test(txt)) { html += `<figure class="letter sealed" data-letter="last">${letterHead(t('Surat terakhir Damar', 'Damar’s last letter'), t('tahun kesepuluh · dibaca sendirian di dapur', 'the tenth year · read alone in the kitchen'))}<blockquote>${esc(txt)}</blockquote><figcaption class="lt-act"><span class="stamp" data-stamp>${esc(t('Tidak pernah dibacakan', 'Never read aloud'))}</span></figcaption></figure>`; return; }
          if (L.truth.test(txt)) { html += `<figure class="letter truth">${letterHead(t('Dibacakan dengan benar', 'Read correctly'), t('tak satu kata pun diubah', 'not one word changed'))}<blockquote>${esc(txt.replace(/^"|"$/g, ''))}</blockquote></figure>`; return; }
        }
        // surat di tengah paragraf: "aku sedang berubah"
        let ph = inline(p);
        if (L.change.test(txt)) ph = ph.replace(/<em>((?:Ren, aku sedang berubah|Ren, I am changing)[\s\S]*?)<\/em>/, '<em class="erase" data-erase>$1</em>');
        const trig = L.orangeTrig.test(txt) ? 'orange' : L.changeTrig.test(txt) && /aku sedang berubah|changing|those sentences/.test(txt) ? 'change' : L.lastTrig.test(txt) ? 'last' : '';
        html += `<p${trig ? ` data-trig="${trig}"` : ''}${L.pull.test(txt) ? ' data-pull' : ''}>${ph}</p>`;
        if (ci === CH.length - 1 && L.opens.test(txt) && LAST) html += envelopeHTML(false);
      });
      if (ci < CH.length - 1) html += scaleHTML(ci);
      if (ci === CH.length - 2) html += chainHTML(false);
      html += '</section>';
    });
    story.innerHTML = html;
    editCard = $('[data-letter="angry"]');
  }
  const ear = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9.5a5 5 0 0 1 10 0c0 3-3 3.6-3 6.5a2.5 2.5 0 0 1-4.6 1.3"/><path d="M10 9.5a2 2 0 0 1 4 0"/></svg>';
  // surat yang marah: pembaca memegang pena Sarah
  let hunks = [];
  function angryHTML(txt) {
    hunks = diff(txt, softText);
    let n = 0;
    const body = hunks.map(h => (h.eq != null ? esc(h.eq) : `<button type="button" class="thorn" data-h="${n++}" aria-label="${esc(t('Cabut duri ini', 'Pull this thorn'))}: ${esc(h.del.join(' '))}"><s>${esc(h.del.join(' '))}</s><ins>${esc(h.add.join(' '))}</ins></button>`)).join(' ');
    return `<figure class="letter edit" data-letter="angry" data-left="${n}">${letterHead(t('Surat Damar', 'Damar’s letter'), t('tahun kesembilan · dibuka di dapur, sendirian', 'the ninth year · opened in the kitchen, alone'))}
      <p class="pen">${esc(t('Pena Sarah ada di tanganmu. Renjani menunggu di kursi rotan. Ketuk setiap duri untuk menggesernya, seperti yang Sarah lakukan.', 'Sarah’s pen is in your hand. Renjani is waiting in the rattan chair. Tap each thorn to shift it, the way Sarah did.'))}</p>
      <blockquote>${body}</blockquote>
      <figcaption class="lt-act"><span class="lt-count" data-count>${esc(t(`${n} duri`, `${n} thorns`))}</span><button type="button" class="lt-btn ghost" data-sarah>${esc(t('Biar Sarah saja', 'Let Sarah do it'))}</button><button type="button" class="lt-btn" data-listen="angry" hidden>${ear()}${esc(t('Bacakan kepada Renjani', 'Read it to Renjani'))}</button><span class="seg" data-view hidden><button type="button" data-v="tulis" aria-pressed="false">${esc(t('Yang ditulis', 'As written'))}</button><button type="button" data-v="baca" aria-pressed="true">${esc(t('Yang dibacakan', 'As read'))}</button></span></figcaption></figure>`;
  }
  function envelopeHTML(gift) {
    return `<div class="opener${gift ? ' gift' : ''}" data-opener>
      <div class="env" data-env><div class="env-back"></div><div class="env-paper" data-paper><div class="fold f1"></div><div class="fold f2"></div><div class="fold f3"></div><blockquote class="env-text">${esc(LAST)}</blockquote></div><div class="env-front"><span class="env-to">${esc(t('Untuk Renjani', 'For Renjani'))}</span></div><div class="env-flap"></div><button type="button" class="seal" data-seal aria-label="${esc(t('Buka segelnya', 'Break the seal'))}"><span>${esc(t('Buka', 'Open'))}</span></button></div>
      <p class="op-hint" data-ophint>${esc(gift ? t('Seseorang ingin sebuah surat dibacakan kepadamu dengan benar. Buka segelnya.', 'Someone wants a letter read to you correctly. Break the seal.') : t('Enam puluh tahun tersegel. Sekarang tanganmu yang membukanya.', 'Sixty years sealed. Now your hand opens it.'))}</p>
      <div class="op-act" data-opact hidden><button type="button" class="lt-btn big" data-listen="last">${ear()}${esc(t('Pejamkan mata · dengarkan dengan telinga Renjani', 'Close your eyes · listen with Renjani’s ears'))}</button></div></div>`;
  }
  const VERD = [['benci', t('Kubenci', 'I hate her')], ['mengerti', t('Kumengerti', 'I understand her')], ['maaf', t('Kumaafkan', 'I forgive her')]];
  function scaleHTML(ci) {
    const v = S.verdict[ci];
    return `<aside class="scale" data-scale="${ci}" aria-label="${esc(t('Timbangan', 'Scale'))}"><p class="sc-k">${esc(t(`Sampai anak tangga ${ci + 1}, Sarah bagimu…`, `By step ${ci + 1}, Sarah to you is…`))}</p><div class="sc-row">${VERD.map(([k, l], i) => `<button type="button" data-v="${i}" aria-pressed="${v === i}"><i class="sc-${k}" aria-hidden="true"></i>${esc(l)}</button>`).join('')}</div></aside>`;
  }
  function chainHTML(final) {
    const N = [[t('Ibu Sarah', 'Sarah’s mother'), ''], ['Sarah', t('lelaki laut', 'the sea man')], ['Renjani', 'Damar'], ['Kirana', ''], [t('anak Kirana', 'Kirana’s child'), '']];
    const links = [[t('memisahkan', 'separated'), 'cut'], [t('menyunting', 'edited'), 'cut'], [t('Pram membacakan yang sebenarnya', 'Pram read what was real'), 'free'], [t('dibacakan dengan benar', 'read correctly'), final ? 'free' : 'wait']];
    return `<figure class="chain${final ? ' final' : ''}" aria-label="${esc(t('Rantai', 'The chain'))}"><p class="sc-k">${esc(t('Rantai', 'The chain'))}</p><ol>${N.map(([n, s], i) => `<li class="cn"><b>${esc(n)}</b>${s ? `<small>${esc(s)}</small>` : ''}</li>${i < links.length ? `<li class="cl ${links[i][1]}" aria-label="${esc(links[i][0])}"><i aria-hidden="true"></i><span>${esc(links[i][0])}</span></li>` : ''}`).join('')}</ol></figure>`;
  }
  render();

  /* ---------- tangga ---------- */
  $('#stairs').innerHTML = CH.map((c, i) => `<a href="#bab-${i + 1}" style="--i:${i}" data-go="${i}"><i aria-hidden="true"></i><span><b>${i + 1}</b>${esc(c.title || '')}</span></a>`).join('');
  let cur = -1;
  function where() {
    const steps = $$('.step'), mid = innerHeight * .4;
    let c = -1; steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) c = i; });
    if (c !== cur) {
      cur = c; $$('#stairs a').forEach((a, i) => { a.classList.toggle('on', i === c); a.classList.toggle('past', i < c); });
      const k = Math.max(0, c); root.style.setProperty('--depth', (k / Math.max(1, CH.length - 1)).toFixed(3)); root.style.setProperty('--rain', RAIN[Math.min(k, RAIN.length - 1)]); root.style.setProperty('--lamp', LAMP[Math.min(k, LAMP.length - 1)]);
      Rain.level(c < 0 ? .5 : RAIN[Math.min(k, RAIN.length - 1)]);
      $('#stepChip').hidden = c < 0; if (c >= 0 && G) G.step(c + 1, CH.length, t('Anak tangga', 'Step'));
      $('#tray').hidden = c < 0 || S.opened && c === CH.length - 1;
    }
  }

  /* ---------- pena di dapur (bab kedua) ---------- */
  function applyThorn(b, byReader) {
    if (!b || b.classList.contains('done')) return;
    b.classList.add('done'); b.disabled = true;
    if (byReader) { S.mine = (S.mine || 0) + 1; save(); }
    const card = b.closest('.letter'), left = $$('.thorn:not(.done)', card).length;
    $('[data-count]', card).textContent = left ? t(`${left} duri lagi`, `${left} thorns left`) : t('Tidak ada lagi yang melukai.', 'Nothing left to hurt.');
    if (!left) { card.classList.add('clean'); $('[data-sarah]', card).hidden = true; $('[data-listen="angry"]', card).hidden = false; $('[data-view]', card).hidden = false; }
  }
  $('#read').addEventListener('click', e => {
    const th = e.target.closest('.thorn'); if (th) { applyThorn(th, true); return; }
    const sa = e.target.closest('[data-sarah]'); if (sa) { const card = sa.closest('.letter'); $$('.thorn:not(.done)', card).forEach((b, i) => setTimeout(() => applyThorn(b, false), calm() ? 0 : i * 260)); return; }
    const vw = e.target.closest('[data-view] [data-v]'); if (vw) { const card = vw.closest('.letter'); card.classList.toggle('show-orig', vw.dataset.v === 'tulis'); $$('[data-view] [data-v]', card).forEach(x => x.setAttribute('aria-pressed', String(x === vw))); return; }
    const ls = e.target.closest('[data-listen]'); if (ls) { listenTo(ls.dataset.listen); return; }
    const sc = e.target.closest('.scale [data-v]'); if (sc) { const ci = +sc.closest('.scale').dataset.scale, v = +sc.dataset.v; S.verdict[ci] = S.verdict[ci] === v ? undefined : v; if (S.verdict[ci] === undefined) delete S.verdict[ci]; save(); $$('[data-v]', sc.closest('.scale')).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.v === S.verdict[ci]))); return; }
    const sl = e.target.closest('[data-seal]'); if (sl) { openEnvelope(sl.closest('[data-opener]')); return; }
    const rec = e.target.closest('[data-rec]'); if (rec) { recorder(rec.dataset.rec); return; }
    const sh = e.target.closest('[data-share]'); if (sh) { shareLetter(sh); return; }
  });

  /* ---------- yang terjadi saat narasinya sampai: kalimat hilang, coretan, segel ---------- */
  const seen = new Set();
  function triggers() {
    const line = innerHeight * .78;
    $$('[data-trig]').forEach(p => {
      const k = p.dataset.trig; if (seen.has(k) || p.getBoundingClientRect().top > line) return;
      seen.add(k);
      if (k === 'orange') { const c = $('[data-letter="orange"]'); c && c.classList.add('gone'); const n = c && $('[data-cutnote]', c); if (n) n.hidden = false; }
      if (k === 'change') $$('[data-erase]').forEach(x => x.classList.add('struck'));
      if (k === 'last') { const c = $('[data-letter="last"]'); c && c.classList.add('stamped'); trayFill(); }
    });
    const pull = $('[data-pull]'); if (pull && pull.getBoundingClientRect().top < line && !seen.has('pull')) { seen.add('pull'); $('#tray').classList.add('arrive'); }
  }
  function trayFill() { const tr = $('#tray'); tr.classList.add('full'); tr.classList.remove('pulse'); void tr.offsetWidth; tr.classList.add('pulse'); }
  $('#tray').addEventListener('click', () => {
    const tip = $('#trayTip'), full = $('#tray').classList.contains('full');
    tip.textContent = S.opened ? t('Amplopnya sudah terbuka. Suratnya ada di anak tangga terakhir.', 'The envelope is open. The letter is on the last step.') : full ? t('Tersegel. Di dalamnya surat terakhir Damar, yang tidak pernah dibacakan. Belum boleh dibuka.', 'Sealed. Inside is Damar’s last letter, never read aloud. Not yet.') : t('Tersegel, sudutnya lunak karena terlalu sering dipegang. Belum boleh dibuka.', 'Sealed, its corners soft from being held too often. Not yet.');
    tip.hidden = false; clearTimeout(tipT); tipT = setTimeout(() => { tip.hidden = true; }, 4200);
  });
  let tipT = 0;

  /* ---------- amplop ---------- */
  function openEnvelope(op) {
    if (!op || op.classList.contains('open')) return;
    op.classList.add('open'); $('[data-ophint]', op).textContent = t('Satu lembar, terlipat tiga.', 'One sheet, folded in three.');
    setTimeout(() => { op.classList.add('unfold'); $('[data-opact]', op).hidden = false; }, calm() ? 0 : 900);
    if (!op.classList.contains('gift')) { S.opened = true; save(); $('#tray').hidden = true; }
    announce(t('Amplopnya terbuka.', 'The envelope is open.'));
  }

  /* ---------- suara: dibacakan oleh peramban, atau muncul kalimat demi kalimat ---------- */
  const SS = 'speechSynthesis' in window ? speechSynthesis : null;
  let voices = [];
  const pickVoices = () => { voices = SS ? SS.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(EN ? 'en' : 'id')) : []; const sel = $('#voice'); const keep = store.get('ytpd:voice', ''); sel.innerHTML = voices.length ? voices.map(v => `<option value="${esc(v.name)}"${v.name === keep ? ' selected' : ''}>${esc(v.name)}</option>`).join('') : `<option value="">${esc(t('Tanpa suara: teks saja', 'No voice: text only'))}</option>`; };
  if (SS) { pickVoices(); SS.addEventListener?.('voiceschanged', pickVoices); } else pickVoices();
  $('#voice').onchange = e => store.set('ytpd:voice', e.target.value);
  const dark = $('#dark');
  let session = 0, capsOn = !!store.get('ytpd:caps', false);
  const paintCaps = () => { $('#darkCapToggle').setAttribute('aria-pressed', String(capsOn)); dark.classList.toggle('caps', capsOn || !voices.length); };
  $('#darkCapToggle').onclick = () => { capsOn = !capsOn; store.set('ytpd:caps', capsOn); paintCaps(); };
  function sayOne(text, my) {
    return new Promise(res => {
      $('#darkCap').textContent = text;
      const words = text.split(/\s+/).length, est = Math.max(1600, words * 340);
      if (!SS || !voices.length) { setTimeout(res, est); return; }
      const u = new SpeechSynthesisUtterance(text); u.lang = EN ? 'en-US' : 'id-ID'; u.rate = .9; u.pitch = 1.02;
      const v = voices.find(x => x.name === store.get('ytpd:voice', '')) || voices[0]; if (v) u.voice = v;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, est * 2.2);
      SS.speak(u);
    });
  }
  const pause = ms => new Promise(r => setTimeout(r, ms));
  async function listen(lines, { who = '', silenceAfter = null, onEnd = null } = {}) {
    const my = ++session;
    dark.hidden = false; document.body.classList.add('eyes-closed'); paintCaps();
    $('#darkWho').textContent = who; $('#darkCap').textContent = '';
    $('#darkOpen').focus({ preventScroll: true });
    await pause(calm() ? 200 : 1400);
    for (const s of lines) {
      if (my !== session) return;
      dark.classList.add('speaking');
      await sayOne(s, my);
      dark.classList.remove('speaking');
      if (my !== session) return;
      // keheningan yang harus ada: tidak diisi apa pun
      if (silenceAfter && silenceAfter.test(s)) { $('#darkCap').textContent = ''; dark.classList.add('silence'); await pause(6000); dark.classList.remove('silence'); }
      else await pause(calm() ? 150 : 520);
    }
    if (my !== session) return;
    $('#darkCap').textContent = ''; dark.classList.add('ended');
    if (onEnd) onEnd();
  }
  function closeDark() { session++; SS && SS.cancel(); dark.hidden = true; dark.classList.remove('speaking', 'silence', 'ended'); document.body.classList.remove('eyes-closed'); }
  $('#darkOpen').onclick = closeDark;
  dark.addEventListener('keydown', e => { if (e.key === 'Escape') closeDark(); });
  function listenTo(k) {
    if (k === 'soft' || k === 'angry') { listen(sentences(softText), { who: t('Suara Sarah, membacakan surat Damar', 'Sarah’s voice, reading Damar’s letter'), onEnd: () => { S.heard.soft = 1; save(); } }); return; }
    if (k === 'orange') { const c = $('[data-letter="orange"] blockquote'); const txt = c.textContent, cut = $('[data-cut]', c)?.textContent || ''; listen(sentences(txt.replace(cut, ' ').replace(/\s+/g, ' ')), { who: t('Suara Sarah, membacakan surat Damar', 'Sarah’s voice, reading Damar’s letter'), onEnd: () => { S.heard.orange = 1; save(); } }); return; }
    if (k === 'last') { listen(sentences(LAST), { who: t('Suara Sarah, tanpa mengubah satu kata pun', 'Sarah’s voice, not changing a single word'), silenceAfter: /(\bsiap\b|\bready\b)/i, onEnd: () => { S.heard.last = 1; save(); } }); }
  }

  /* ---------- akhir: jejak timbanganmu, rantai yang putus, bacakan kepada seseorang ---------- */
  function endHTML() {
    const n = CH.length - 1, pts = Array.from({ length: n }, (_, i) => S.verdict[i]);
    const marked = pts.filter(v => v != null).length;
    const W0 = 560, H0 = 150, X = i => 34 + i / Math.max(1, n - 1) * (W0 - 60), Y = v => 22 + (2 - v) * 48;
    const path = pts.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
    const first = pts.findIndex(v => v === 2), changes = pts.filter(v => v != null).reduce((a, v, i, arr) => a + (i && arr[i - 1] !== v ? 1 : 0), 0);
    const lines = [];
    if (!marked) lines.push(t('Kau tidak menimbangnya sama sekali. Itu juga sebuah jawaban.', 'You never weighed her at all. That is an answer too.'));
    else {
      if (first >= 0 && first < n - 1) lines.push(t(`Kau memaafkannya di anak tangga ${first + 1}, sebelum ia selesai bercerita. Ia meminta Kirana menunggu sampai akhir.`, `You forgave her on step ${first + 1}, before she finished. She asked Kirana to wait until the end.`));
      else if (first === n - 1) lines.push(t('Kau baru memaafkannya di anak tangga terakhir, ketika ia sudah selesai. Seperti janji Kirana.', 'You forgave her only on the last step, once she had finished. As Kirana promised.'));
      else lines.push(t('Kau tidak memaafkannya di anak tangga mana pun.', 'You did not forgive her on any step.'));
      if (pts[3] === 1 || pts[3] === 2) lines.push(t('Di anak tangga keempat kau setuju dengannya, persis seperti yang dikatakan narator.', 'On the fourth step you agreed with her, just as the narrator said you would.'));
      if (changes) lines.push(t(`Penilaianmu berubah ${changes} kali.`, `Your judgement changed ${changes} times.`));
    }
    if (S.mine) lines.push(t(`Di dapur, kau sendiri yang mencabut ${S.mine} dari ${hunks.filter(h => h.eq == null).length} duri dari surat Damar.`, `In the kitchen, you yourself pulled ${S.mine} of ${hunks.filter(h => h.eq == null).length} thorns from Damar’s letter.`));
    return `<section class="verdict"><p class="sc-k">${esc(t('Jejak timbanganmu', 'The trail of your scale'))}</p>
      <svg viewBox="0 0 ${W0} ${H0}" class="vd" role="img" aria-label="${esc(t('Penilaianmu di setiap anak tangga', 'Your judgement at each step'))}">
        ${VERD.map(([k, l], v) => `<line x1="30" x2="${W0 - 20}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${W0 - 18}" y="${Y(v) + 4}">${esc(l)}</text>`).join('')}
        ${path.length > 1 ? `<path d="${path.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1]}`).join('')}"/>` : ''}
        ${pts.map((v, i) => `<g><circle class="${v == null ? 'none' : 'v' + v}" cx="${X(i).toFixed(1)}" cy="${v == null ? H0 - 14 : Y(v)}" r="${v == null ? 3 : 6}"/><text class="n" x="${X(i).toFixed(1)}" y="${H0 - 2}">${i + 1}</text></g>`).join('')}
      </svg>${lines.map(l => `<p class="vd-t">${esc(l)}</p>`).join('')}</section>
      ${chainHTML(true)}
      <section class="pass"><p class="sc-k">${esc(t('Bacakan kepada seseorang', 'Read it to someone'))}</p>
        <p class="pass-t">${esc(t('Rekam suaramu sendiri membacakan surat Damar, dengan benar, sampai habis. Rekamannya hanya ada di perangkatmu. Atau kirim amplopnya kepada seseorang.', 'Record your own voice reading Damar’s letter, correctly, to the end. The recording stays on your device. Or send the envelope to someone.'))}</p>
        <div class="pass-act">${'MediaRecorder' in window && navigator.mediaDevices ? `<button type="button" class="lt-btn" data-rec="start">${esc(t('● Rekam suaramu', '● Record your voice'))}</button>` : ''}<button type="button" class="lt-btn ghost" data-share>${esc(t('Kirim amplopnya', 'Send the envelope'))}</button></div>
        <div class="rec" id="rec" hidden><blockquote class="prompt">${esc(LAST)}</blockquote><p class="rec-s" id="recS"></p><div class="pass-act"><button type="button" class="lt-btn" data-rec="stop">${esc(t('■ Selesai', '■ Done'))}</button></div><audio id="recA" controls hidden></audio><a class="lt-btn ghost" id="recD" download="${esc(t('surat-damar-dibacakan.webm', 'damar-letter-read.webm'))}" hidden>${esc(t('Simpan rekamannya', 'Save the recording'))}</a></div>
      </section><div class="end-next" id="endNext"></div>`;
  }
  let media = null, chunks = [];
  async function recorder(cmd) {
    const box = $('#rec');
    if (cmd === 'start') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = []; media = new MediaRecorder(stream);
        media.ondataavailable = e => chunks.push(e.data);
        media.onstop = () => { stream.getTracks().forEach(x => x.stop()); const url = URL.createObjectURL(new Blob(chunks, { type: media.mimeType || 'audio/webm' })); const a = $('#recA'); a.src = url; a.hidden = false; const d = $('#recD'); d.href = url; d.hidden = false; $('#recS').textContent = t('Didengarkan atau disimpan. Tidak ada yang dikirim.', 'Listen back or save it. Nothing was sent anywhere.'); };
        media.start(); box.hidden = false; $('#recS').textContent = t('Merekam. Bacakan dengan benar.', 'Recording. Read it correctly.');
      } catch (e) { box.hidden = false; $('#recS').textContent = t('Mikrofon tidak bisa dipakai. Bacakan saja keras-keras; itu juga dihitung.', 'The microphone is unavailable. Just read it aloud; that counts too.'); }
    }
    if (cmd === 'stop' && media && media.state !== 'inactive') media.stop();
  }
  async function shareLetter(btn) {
    const url = location.href.split('#')[0] + '#surat';
    try { if (navigator.share) await navigator.share({ title, text: t('Sebuah surat, untuk dibacakan dengan benar.', 'A letter, to be read correctly.'), url }); else { await navigator.clipboard.writeText(url); btn.textContent = t('Tautan amplop tersalin', 'Envelope link copied'); } }
    catch (e) { if (e.name !== 'AbortError') { prompt(t('Salin tautan ini', 'Copy this link'), url); } }
  }

  /* ---------- hujan di luar jendela (Web Audio, mati sampai dinyalakan) ---------- */
  const Rain = (() => {
    const AC = window.AudioContext || window.webkitAudioContext; let ctx = null, g = null, lv = .5, on = false;
    const build = () => { ctx = new AC(); const b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination); s.start(); };
    const apply = () => { if (!ctx) return; g.gain.cancelScheduledValues(ctx.currentTime); g.gain.linearRampToValueAtTime(on ? .05 + lv * .13 : 0, ctx.currentTime + 2); };
    return { supported: !!AC, isOn: () => on, set(v) { on = v && !!AC; if (on && !ctx) build(); ctx?.resume?.(); apply(); }, level(v) { lv = v; apply(); } };
  })();
  const paintRain = () => { const b = $('#rain'); b.setAttribute('aria-pressed', String(Rain.isOn())); b.textContent = Rain.isOn() ? t('Hidup', 'On') : t('Mati', 'Off'); };
  $('#rain').onclick = () => { Rain.set(!Rain.isOn()); store.set('ytpd:rain', Rain.isOn()); paintRain(); };
  if (!Rain.supported) $('#rain').closest('.setting-row').remove(); else paintRain();
  if (store.get('ytpd:rain', false)) addEventListener('pointerdown', () => { if (!Rain.isOn()) { Rain.set(true); paintRain(); } }, { once: true });

  /* ---------- membaca: posisi, progres situs ---------- */
  let ticking = false;
  const frame = () => {
    ticking = false; where(); triggers();
    const max = document.documentElement.scrollHeight - innerHeight, f = max > 0 ? scrollY / max : 0;
    if (scrollY > 200) { store.set('ytpd:place', +f.toFixed(4)); const pr = store.get('prog', {}) || {}; pr[SLUG] = Math.max(pr[SLUG] || 0, +f.toFixed(3)); store.set('prog', pr); }
    if (f > .97 && !$('#end').dataset.done) finish();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(frame));
  function finish() {
    const end = $('#end'); end.dataset.done = '1'; end.hidden = false; end.innerHTML = endHTML();
    if (G) $('#endNext').innerHTML = G.next(SLUG);
    const st = store.get('stats', {}) || {}; st.done = st.done || []; if (!st.done.includes(SLUG)) { st.done.push(SLUG); store.set('stats', st); }
  }
  // sudah sampai akhir sebelumnya: akhir disiapkan supaya halaman bisa digulir sampai ke sana
  if (store.get('ytpd:place', 0) > .97) finish();
  { const r = store.get('read', []) || []; if (!r.includes(SLUG)) store.set('read', [...r, SLUG]); const st = store.get('stats', {}) || {}; st.plays = st.plays || {}; st.plays[SLUG] = (st.plays[SLUG] || 0) + 1; store.set('stats', st); store.set('last', { key: SLUG, at: Date.now() }); }

  /* ---------- sampul: mulai, lanjut, atau amplop kiriman ---------- */
  const place = store.get('ytpd:place', 0);
  $('#coverAct').innerHTML = `<a class="go" href="#bab-1">${esc(t('Mulai turun', 'Begin the descent'))}</a>${place > .03 && place < .97 ? `<button type="button" class="ghost" id="resume">${esc(t('Lanjutkan', 'Continue'))} · ${Math.round(place * 100)}%</button>` : ''}`;
  $('#resume')?.addEventListener('click', () => scrollTo({ top: place * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }));
  if (location.hash === '#surat' && LAST) {
    const host = document.createElement('div'); host.innerHTML = envelopeHTML(true); $('#coverAct').before(host.firstElementChild);
    $('#cover').classList.add('gifted');
  }

  /* ---------- pengaturan ---------- */
  let size = Math.min(24, Math.max(15, +(store.get('rd', {}) || {}).size || 19));
  const applySize = () => { root.style.setProperty('--size', size + 'px'); $('#smaller').disabled = size <= 15; $('#bigger').disabled = size >= 24; };
  const setSize = d => { size = Math.min(24, Math.max(15, size + d)); applySize(); store.set('rd', { ...(store.get('rd', {}) || {}), size }); };
  $('#smaller').onclick = () => setSize(-1); $('#bigger').onclick = () => setSize(1); applySize();
  const paintMotion = () => { const b = $('#motion'); b.setAttribute('aria-pressed', String(!root.hasAttribute('data-calm'))); b.textContent = root.hasAttribute('data-calm') ? t('Tenang', 'Still') : t('Aktif', 'On'); };
  $('#motion').onclick = () => { root.toggleAttribute('data-calm'); store.set('ytpd:calm', root.hasAttribute('data-calm')); paintMotion(); };
  paintMotion();
  $('#reset').onclick = () => { if (!confirm(t('Lupakan timbangan, duri yang kau cabut, dan amplop yang sudah dibuka?', 'Forget your scale, the thorns you pulled, and the opened envelope?'))) return; S = blank(); save(); store.set('ytpd:place', 0); location.hash = ''; location.reload(); };
  if (EN) {
    $('#sizeLabel').textContent = 'Text size'; $('#rainLabel').textContent = 'Rain outside the window'; $('#voiceLabel').textContent = 'Reading voice'; $('#motionLabel').textContent = 'Motion'; $('#themeLabel').textContent = 'Appearance'; $('#resetLabel').textContent = 'Your trail in this story'; $('#reset').textContent = 'Start from the top';
    $('#darkCapToggle').textContent = 'Text'; $('#darkOpen').textContent = 'Open your eyes'; $('#trayT').textContent = 'For Renjani';
  }

  /* ---------- bingkai situs ---------- */
  if (G) {
    G.mount({ slug: SLUG, title, helpInto: '#topRight', stepInto: '#stepChip', focusAfter: '#story',
      lede: t('Sarah punya suara paling menenangkan yang pernah didengar siapa pun. Suara itulah pintunya.', 'Sarah has the most soothing voice anyone has ever heard. That voice is the door.'),
      steps: [
        t('Ceritanya turun, anak tangga demi anak tangga. Makin ke bawah, kamarnya makin gelap. Tangga di tepi layar membawamu ke bab mana pun.', 'The story descends, one step at a time. The lower you go, the darker the room. The stairs at the edge take you to any chapter.'),
        t('Surat-surat Damar tampil sebagai kertas. Di bab kedua, pena Sarah ada di tanganmu.', 'Damar’s letters appear as paper. In the second chapter, Sarah’s pen is in your hand.'),
        t('"Dengarkan seperti Renjani" menggelapkan layar dan membacakan suratnya, seperti Renjani mendengarnya. Tombol Teks menampilkan kalimatnya.', '"Hear it as Renjani did" darkens the screen and reads the letter aloud, the way Renjani heard it. The Text button shows the sentences.'),
        t('Amplop di pojok tersegel sampai anak tangga terakhir. Di setiap anak tangga, timbanglah Sarah; jangan memaafkannya terlalu cepat.', 'The envelope in the corner stays sealed until the last step. On every step, weigh Sarah; do not forgive her too soon.')
      ] });
    G.settings();
  }
  frame();
  if (location.hash.startsWith('#bab-')) setTimeout(() => $(location.hash)?.scrollIntoView(), 60);
  if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js').catch(() => {});
})();
