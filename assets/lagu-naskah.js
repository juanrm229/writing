/* ======================================================================
   LAGU DARI NASKAH
   Setiap tulisan menggubah musiknya sendiri, langsung di peramban, tanpa berkas suara.

   Cara naskah dibaca sebagai not:
   - Vokal di suku kata yang ditekan menentukan nadanya, dari gelap ke terang: u, o, a, e, i
     menjadi lima nada tangga pentatonik.
   - Jumlah suku kata menentukan panjang notnya. Kata bersuku tiga atau lebih menyanyikan dua nada.
   - Kata pendek (tiga huruf atau kurang: di, ke, dan, the, of) lewat sebagai jeda, bukan nada.
   - Koma menahan napas, titik pulang ke nada dasar, tanda tanya naik dan tidak pulang,
     tanda seru menekan, elipsis menggantung lama.
   - Kalimat di dalam tanda kutip dinyanyikan suara kedua, satu oktaf lebih tinggi.
   - Nada dasar dipilih dari judul, tangga nada dari jenis tulisan, tempo dari panjang kalimatnya.

   Modul ini berdiri sendiri: dipakai situs utama (assets/app.js) dan pengalaman interaktif
   (antologi/panduan.js). window.QMLagu = { compose, describe, create, render }.
   ====================================================================== */
(() => {
  'use strict';

  /* ---------- naskah → partitur ---------- */
  const SCALES = {
    mayor: { steps: [0, 2, 4, 7, 9], id: 'mayor', en: 'major' },
    minor: { steps: [0, 3, 5, 7, 10], id: 'minor', en: 'minor' },
    senja: { steps: [0, 2, 3, 7, 9], id: 'senja', en: 'dusk' },
    pelog: { steps: [0, 1, 3, 7, 8], id: 'pelog', en: 'pelog' },
    gantung: { steps: [0, 2, 5, 7, 10], id: 'gantung', en: 'suspended' }
  };
  const BY_CAT = { esai: ['mayor'], catatan: ['gantung'], puisi: ['pelog'], cerpen: ['minor', 'senja'], mini: ['senja', 'minor'], novel: ['minor', 'senja'], novella: ['senja', 'minor'] };
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  // nada dasar yang enak untuk suara pelan: antara C3 dan A3
  const ROOTS = [48, 50, 51, 53, 55, 57];
  const VOWEL = { u: 0, o: 1, a: 2, e: 3, i: 4 };
  const SILENT = new Set('di ke se ku mu si ya pun dan yang itu ini the of to a an in on at is it and or as be by he we i so no if'.split(' '));

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const strip = s => String(s).replace(/^[ \t]*(?:#{1,6}|>|[-*]|\d+\.)[ \t]+/gm, '').replace(/\*\*?|\|/g, ' ');

  // satu kata → { deg, deg2, syl } atau null kalau tak punya vokal
  function sing(word) {
    let w = fold(word).replace(/[^a-z]/g, '');
    if (!w) return null;
    if (!/[aiueo]/.test(w)) w = w.replace(/y/g, 'i');
    const groups = w.match(/[aiueo]+/g);
    if (!groups) return null;
    // tekanan kata Indonesia jatuh di suku kedua dari belakang; kata bersuku satu memakai vokalnya sendiri
    const stressed = groups[Math.max(0, groups.length - 2)], last = groups[groups.length - 1];
    return { deg: VOWEL[stressed[0]], deg2: VOWEL[last[last.length - 1]], syl: groups.length, len: w.length };
  }

  /* paras: daftar paragraf (teks polos atau Markdown ringan). o: { seed, cat, poem }
     Hasil: { root, scale, unit, paras: [{ notes, dur, bass, words }], total }
     Setiap not: { t, d, deg, oct, v (0 narasi, 1 dialog), vel, end (akhir kalimat) }, t dan d dalam detik. */
  function compose(paras, o = {}) {
    const seed = String(o.seed || paras[0] || 'naskah'), h = hash(seed);
    const pool = BY_CAT[o.cat] || ['minor', 'senja'];
    const scale = SCALES[pool[h % pool.length]];
    const root = ROOTS[(h >>> 4) % ROOTS.length];
    const poem = !!o.poem;
    const texts = paras.map(strip);
    // tempo: kalimat pendek berjalan lebih cepat, kalimat panjang lebih lapang
    const all = texts.join(' '), sent = Math.max(1, (all.match(/[.!?…]+/g) || []).length), wordsAll = (all.match(/[\p{L}]+/gu) || []).length;
    const perSent = wordsAll / sent;
    const unit = poem ? .36 : Math.max(.24, Math.min(.33, .225 + perSent / 220));
    let quote = false, total = 0;
    const out = texts.map(text => {
      const notes = [], tally = [0, 0, 0, 0, 0];
      let t = 0, prev = -1, lift = 0, startOfSentence = true, words = 0;
      const tokens = text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}]+)*|[“”"]|\n+|[.!?…]+|[,;:—–]/gu) || [];
      const closeSentence = (mark) => {
        const last = notes[notes.length - 1];
        if (last && !last.end) {
          last.end = true;
          if (mark.includes('?')) { last.deg = Math.min(4, last.deg + 1); last.rise = true; }
          else if (mark.includes('!')) { last.vel = Math.min(1, last.vel + .25); last.deg = 3; }
          else if (mark.includes('…')) { last.d *= 1.8; }
          else { last.deg = 0; last.d *= 1.35; }
        }
        t += unit * (mark.includes('…') ? 4.5 : poem ? 3.4 : 2.6);
        startOfSentence = true; lift = 0;
      };
      for (const tk of tokens) {
        if (tk === '“') { quote = true; continue; }
        if (tk === '”') { quote = false; continue; }
        if (tk === '"') { quote = !quote; continue; }
        if (/^\n/.test(tk)) { if (poem) closeSentence('.'); else t += unit; continue; }
        if (/^[.!?…]/.test(tk)) { closeSentence(tk); continue; }
        if (/^[,;:—–]$/.test(tk)) { t += unit * (tk === ',' ? 1.1 : 1.7); continue; }
        words++;
        const s = sing(tk);
        if (!s) { t += unit * .5; continue; }
        // kata tugas pendek lewat sebagai jeda, kecuali ia membuka kalimat
        if (!startOfSentence && (s.len <= 3 || SILENT.has(fold(tk)))) { t += unit * .6; continue; }
        const d = unit * Math.max(1.5, Math.min(4, s.syl));
        tally[s.deg]++;
        // nada yang sama dua kali berturut-turut: yang kedua naik satu oktaf lalu turun lagi
        if (s.deg === prev) lift = lift ? 0 : 1; else lift = 0;
        const base = { oct: (quote ? 1 : 0) + lift, v: quote ? 1 : 0, vel: startOfSentence ? .9 : .62 + (s.syl >= 3 ? .1 : 0) };
        if (s.syl >= 3 && s.deg2 !== s.deg) {
          notes.push({ t, d: d * .58, deg: s.deg, ...base });
          notes.push({ t: t + d * .58, d: d * .42, deg: s.deg2, ...base, vel: base.vel * .8 });
          prev = s.deg2;
        } else { notes.push({ t, d, deg: s.deg, ...base }); prev = s.deg; }
        t += d; startOfSentence = false;
      }
      if (notes.length && !notes[notes.length - 1].end) closeSentence('.');
      // kutipan yang belum ditutup tidak terbawa selamanya: dialog berikutnya membuka lagi sendiri
      if (!/[“"]/.test(text)) quote = false;
      // nada bas paragraf: vokal yang paling sering ditekan di paragraf itu
      const bass = tally.indexOf(Math.max(...tally));
      total += t;
      return { notes, dur: t, bass: bass < 0 ? 0 : bass, words };
    });
    return { root, scale, unit, poem, paras: out, total, seed };
  }
  const midi = (score, deg, oct) => score.root + 12 + 12 * oct + score.scale.steps[((deg % 5) + 5) % 5];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // "D minor · 86 ketuk": untuk ditampilkan di antarmuka
  function describe(score, en) {
    return { key: NAMES[score.root % 12], scale: en ? score.scale.en : score.scale.id, bpm: Math.round(60 / (score.unit * 2)) };
  }
  // paragraf yang memuat pecahan f (0–1) dari seluruh kata
  function paraAt(score, f) {
    const all = score.paras.reduce((n, p) => n + p.words, 0) || 1;
    let acc = 0;
    for (let i = 0; i < score.paras.length; i++) { acc += score.paras[i].words; if (acc / all > f) return i; }
    return Math.max(0, score.paras.length - 1);
  }

  /* ---------- bunyi ---------- */
  function rig(ac, opts = {}) {
    const out = ac.createGain(); out.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .3;
    const dry = ac.createGain(); dry.gain.value = .9;
    const wet = ac.createGain(); wet.gain.value = .55;
    // gema ruang: derau yang meluruh, dibuat sekali
    const conv = ac.createConvolver(), len = Math.floor(ac.sampleRate * 3.2), imp = ac.createBuffer(2, len, ac.sampleRate);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * Math.pow(1 - i / len, 3.2); }
    conv.buffer = imp;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200; tone.Q.value = .3;
    dry.connect(tone); conv.connect(wet).connect(tone); tone.connect(comp).connect(out).connect(opts.dest || ac.destination);
    const bus = ac.createGain(); bus.connect(dry); bus.connect(conv);
    return { ac, out, bus };
  }
  const pan = (ac, v) => { if (!ac.createStereoPanner) return null; const p = ac.createStereoPanner(); p.pan.value = v; return p; };
  // satu not: narasi seperti piano berbalut kain, dialog seperti gelas yang disentuh
  function pluck(R, score, n, when, gainMul = 1) {
    const ac = R.ac, f = hz(midi(score, n.deg, n.oct));
    const g = ac.createGain(), vel = Math.min(1, n.vel) * gainMul * (n.v ? .1 : .16);
    const tau = n.v ? .5 + n.d * .5 : .32 + n.d * .45, att = n.v ? .035 : .008, life = att + tau * 6;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + att);
    g.gain.setTargetAtTime(0, when + att, tau);
    const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    if (n.v) { o2.type = 'sine'; o2.frequency.value = f * 3.01; g2.gain.value = .07; }
    else { o2.type = 'triangle'; o2.frequency.value = f * 2; g2.gain.value = .2; }
    // tanda tanya: nadanya sedikit naik di ujung
    if (n.rise) { o1.frequency.setValueAtTime(f, when); o1.frequency.linearRampToValueAtTime(f * 1.012, when + Math.min(.5, n.d)); }
    o1.connect(g); o2.connect(g2).connect(g);
    const p = pan(ac, n.v ? .32 : -.18);
    if (p) g.connect(p).connect(R.bus); else g.connect(R.bus);
    o1.start(when); o2.start(when); o1.stop(when + life); o2.stop(when + life);
  }
  // dengung dasar: nada dasar dan satu nada paragraf, bernapas pelan
  function drone(R, score) {
    const ac = R.ac, g = ac.createGain(); g.gain.value = 0; g.connect(R.bus);
    const a = ac.createOscillator(), b = ac.createOscillator(), gb = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    a.type = 'sine'; b.type = 'sine'; a.frequency.value = hz(score.root - 12); b.frequency.value = hz(score.root - 12 + 7); gb.gain.value = .5;
    lfo.frequency.value = .07; lg.gain.value = .012;
    a.connect(g); b.connect(gb).connect(g); lfo.connect(lg).connect(g.gain);
    const t = ac.currentTime; a.start(t); b.start(t); lfo.start(t);
    g.gain.setTargetAtTime(.05, t, 1.6);
    return {
      // nada kedua mengikuti paragraf: kuint, kuart, atau terts di atas nada dasar
      move(deg) { b.frequency.setTargetAtTime(hz(score.root - 12 + (score.scale.steps[deg % 5] || 7)), ac.currentTime, .9); },
      stop() { const n = ac.currentTime; g.gain.setTargetAtTime(0, n, .5); [a, b, lfo].forEach(x => { try { x.stop(n + 3); } catch (e) { /* */ } }); }
    };
  }
  // derak piringan: sangat pelan, hanya terasa
  function crackle(R) {
    const ac = R.ac, len = ac.sampleRate, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return when => {
      const s = ac.createBufferSource(); s.buffer = buf;
      const g = ac.createGain(), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500 + Math.random() * 3000;
      const dur = .004 + Math.random() * .01;
      g.gain.setValueAtTime(.02 + Math.random() * .03, when); g.gain.exponentialRampToValueAtTime(.0001, when + dur);
      s.connect(hp).connect(g).connect(R.bus); s.start(when, Math.random() * .9); s.stop(when + dur + .02);
    };
  }

  /* ---------- pemutar: mengikuti paragraf yang sedang dibaca ---------- */
  function create(opts = {}) {
    let ac = opts.context || null, R = null, score = null, dr = null, pop = null, timer = 0;
    let pi = 0, ni = 0, next = 0, want = 0, wantEnd = 1, held = false, again = false, echoAt = 0, vol = opts.volume == null ? .5 : opts.volume, on = false;
    const ensure = () => {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      if (!R) R = rig(ac);
      return R;
    };
    const cur = () => score.paras[pi];
    const jump = (to, breath) => {
      pi = Math.max(0, Math.min(score.paras.length - 1, to)); ni = 0; held = false; again = false;
      next = Math.max(next, ac.currentTime + .06) + breath;
      if (dr) dr.move(cur().bass);
    };
    function tick() {
      if (!on || !score || !ac) return;
      const now = ac.currentTime, horizon = now + .28;
      if (pop && Math.random() < .08) pop(now + Math.random() * .1);
      if (next < now) next = now + .05;
      // pembaca sudah pindah paragraf selagi menahan: langsung menyusul
      if (held && (want !== pi || again)) { again = false; jump(want, .5); }
      if (held) {
        // paragraf sudah habis dinyanyikan: buntutnya terulang pelan, makin jarang
        if (now >= echoAt) {
          const tail = cur().notes.slice(-3);
          if (tail.length) { const t0 = tail[0].t; tail.forEach(n => pluck(R, score, { ...n, oct: n.oct - 1, vel: n.vel * .55 }, now + .1 + (n.t - t0) * 1.3)); }
          echoAt = now + 6 + Math.random() * 5;
        }
        return;
      }
      let guard = 0;
      while (next < horizon && guard++ < 24) {
        const p = cur(), n = p.notes[ni];
        if (!n) {
          // habis: lanjut ke paragraf berikutnya selama masih dalam rentang yang diminta, selain itu menahan
          if (want !== pi) { jump(want, .7); continue; }
          if (pi + 1 < wantEnd && pi + 1 < score.paras.length) { want = pi + 1; jump(want, score.unit * 3); continue; }
          held = true; echoAt = ac.currentTime + 5 + Math.random() * 3; break;
        }
        const base = next - n.t;
        pluck(R, score, n, next);
        ni++;
        const nx = p.notes[ni];
        next = nx ? base + nx.t : base + n.t + n.d + score.unit * 2;
        // pindah paragraf di akhir kalimat, supaya kalimatnya tidak terpotong
        if (n.end && want !== pi) { jump(want, .6); }
      }
    }
    const api = {
      get on() { return on; },
      get score() { return score; },
      // buka kunci suara di dalam sentuhan pembaca; lagunya boleh mulai belakangan
      unlock() { ensure(); },
      // mulai (atau ganti tulisan). Harus dipanggil dari sentuhan pembaca saat pertama kali.
      // o.rest: hanya dengung dasar dulu; not pertama menunggu seek() (mis. bait puisi yang belum dibuka)
      start(sc, at = 0, o = {}) {
        ensure();
        if (dr) dr.stop();
        score = sc; on = true; held = !!o.rest; again = false; echoAt = Infinity;
        want = Math.max(0, Math.min(sc.paras.length - 1, at)); wantEnd = want + 1; pi = want; ni = 0;
        next = ac.currentTime + .5;
        dr = drone(R, sc); dr.move(cur().bass);
        if (opts.crackle !== false && !pop) pop = crackle(R);
        R.out.gain.cancelScheduledValues(ac.currentTime);
        R.out.gain.setTargetAtTime(vol, ac.currentTime, .7);
        clearInterval(timer); timer = setInterval(tick, 70);
      },
      // paragraf yang sedang dibaca; end (eksklusif) untuk rentang beberapa paragraf;
      // replay: nyanyikan lagi dari awal walau paragrafnya sama (langkah baru di pengalaman interaktif)
      seek(i, end, replay) { if (!score) return; want = Math.max(0, Math.min(score.paras.length - 1, i)); wantEnd = Math.max(want + 1, end || 0); if (replay) again = true; },
      // rentang menurut pecahan kata (0–1): dari paragraf yang memuat f0 sampai sebelum paragraf yang memuat f1
      seekFrac(f0, f1, replay) {
        if (!score) return;
        const a = paraAt(score, f0), b = f1 == null ? a + 1 : f1 >= 1 ? score.paras.length : paraAt(score, f1);
        api.seek(a, Math.max(a + 1, b), replay);
      },
      volume(v) { vol = Math.max(0, Math.min(1, v)); if (R && on) R.out.gain.setTargetAtTime(vol, ac.currentTime, .5); },
      stop() {
        if (!on) return; on = false; clearInterval(timer);
        if (R) R.out.gain.setTargetAtTime(0, ac.currentTime, .35);
        if (dr) { dr.stop(); dr = null; }
      },
      // layar ditinggal: diam dulu, lalu lanjut saat kembali
      suspend(hidden) { if (!on || !R) return; R.out.gain.setTargetAtTime(hidden ? 0 : vol, ac.currentTime, .3); if (!hidden) next = ac.currentTime + .3; },
      // cuplikan: beberapa not dari titik f (0–1) tulisan, tanpa mengganggu yang sedang diputar
      audition(sc, f = 0, count = 7, gain = 1) {
        ensure();
        const A = rig(ac); A.out.gain.value = Math.min(1, vol + .15) * gain;
        const p = sc.paras[paraAt(sc, f)] || sc.paras[0]; if (!p || !p.notes.length) return 0;
        const ns = p.notes.slice(0, count), t0 = ac.currentTime + .05;
        ns.forEach(n => pluck(A, sc, n, t0 + n.t));
        const endT = ns[ns.length - 1].t + 4;
        A.out.gain.setTargetAtTime(0, t0 + endT - 1.2, .4);
        setTimeout(() => { try { A.out.disconnect(); } catch (e) { /* */ } }, (endT + 2) * 1000);
        return ns.length;
      }
    };
    return api;
  }

  // seluruh not dijadwalkan sekaligus di konteks luring: untuk uji dan pratinjau
  function render(ac, score, seconds, from = 0) {
    const R = rig(ac); R.out.gain.value = .5;
    const d = drone(R, score); d.move(score.paras[from]?.bass || 0);
    let t = .3, count = 0;
    for (let i = from; i < score.paras.length && t < seconds; i++) {
      for (const n of score.paras[i].notes) { if (t + n.t > seconds) break; pluck(R, score, n, t + n.t); count++; }
      t += score.paras[i].dur + score.unit * 3;
    }
    return count;
  }

  window.QMLagu = { compose, describe, create, render, paraAt, midi, SCALES };
})();
