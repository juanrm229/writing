/* Salasimpul: suara ruangan tempat setiap orang menulis. Semua bunyi dibuat dengan Web Audio, tanpa berkas suara.
   Setiap penulis punya ruangan (persona.room di _dunia.json):
   - malam: jangkrik dan kampung yang sudah sepi
   - radio: radio kecil di dapur, lagu lama yang sayup
   - jam:   jam dinding di rumah yang terlalu sunyi
   - ruang: dengung lampu kantor dan jam di dinding ruang periksa
   - angin: angin di antara pohon-pohon pemakaman
   - jalan: jalan yang belum tidur, motor lewat di kejauhan
   - hujan: hujan di atap toko
   Jam catatan ikut menentukan: subuh ada burung, malam ada jangkrik, siang lebih ramai.
   Mati sampai pembaca menyalakannya di Aa. Berhenti sendiri saat tab disembunyikan. */
window.SimpulSound = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, on = false, layer = null, timers = [], room = null, hour = null, offTimer = 0;
  const now = () => ctx.currentTime;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function noise(sec, brown) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w; }
    return b;
  }
  function env(g, t0, peak, a, hold, r) {
    const p = g.gain; p.setValueAtTime(0.0001, t0); p.linearRampToValueAtTime(peak, t0 + a); p.setValueAtTime(peak, t0 + a + hold); p.exponentialRampToValueAtTime(.0001, t0 + a + hold + r);
  }
  function blip(out, freq, t0, peak, dur, type = 'sine', glide) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    o.connect(g); g.connect(out); env(g, t0, peak, .004, dur * .3, dur * .7); o.start(t0); o.stop(t0 + dur + .05);
  }
  function burst(out, t0, peak, freq, q, dur, type = 'bandpass') {
    const s = ctx.createBufferSource(); s.buffer = noise(Math.max(.05, dur + .05));
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(out); env(g, t0, peak, .003, 0, dur); s.start(t0); s.stop(t0 + dur + .1);
  }
  function bed(out, { brown = true, type = 'lowpass', freq = 600, q = .3, gain = .1, sweep = 0, rate = 1 / 11 }) {
    const s = ctx.createBufferSource(); s.buffer = noise(6, brown); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(out); s.start();
    const nodes = [s];
    if (sweep) { const lfo = ctx.createOscillator(); lfo.frequency.value = rate; const lg = ctx.createGain(); lg.gain.value = sweep; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); nodes.push(lfo); }
    return nodes;
  }
  // bunyi yang berulang dengan jeda acak; berhenti saat ruangan berganti
  function every(min, max, fn) {
    const tick = () => { if (!on || !layer) return; fn(now() + .05); timers.push(setTimeout(tick, rnd(min, max) * 1000)); };
    timers.push(setTimeout(tick, rnd(min * .3, max * .5) * 1000));
  }
  const night = h => h == null || h >= 19 || h < 4;
  const dawn = h => h != null && h >= 4 && h < 8;

  function build(kind, h) {
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    const nodes = [];
    const tickTock = (gain, period = 1) => { let k = 0; every(period, period, t => { burst(out, t, gain * (k++ % 2 ? .7 : 1), k % 2 ? 2400 : 1900, 6, .025); }); };
    if (kind === 'radio') {
      nodes.push(...bed(out, { brown: false, type: 'bandpass', freq: 2200, q: .9, gain: .012 }));
      // lagu lama yang sayup: nada pentatonik pelan dari balik dinding
      const scale = [220, 247, 277, 330, 370, 440, 494];
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out);
      every(.55, 1.1, t => blip(lp, scale[Math.floor(Math.random() * scale.length)], t, .05, rnd(.5, 1.1), 'triangle'));
      every(2.2, 4.5, t => blip(lp, 110 * (Math.random() < .5 ? 1 : 1.5), t, .04, 1.6, 'sine'));
    } else if (kind === 'jam') {
      nodes.push(...bed(out, { freq: 260, gain: .05 }));
      tickTock(.05);
      every(9, 16, t => blip(out, 60, t, .03, 1.4));   // kulkas yang menyala lagi
    } else if (kind === 'ruang') {
      const hum = ctx.createOscillator(); hum.frequency.value = 100; const hg = ctx.createGain(); hg.gain.value = .012; hum.connect(hg); hg.connect(out); hum.start(); nodes.push(hum);
      const hum2 = ctx.createOscillator(); hum2.type = 'sawtooth'; hum2.frequency.value = 50; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; const h2 = ctx.createGain(); h2.gain.value = .006; hum2.connect(lp); lp.connect(h2); h2.connect(out); hum2.start(); nodes.push(hum2);
      nodes.push(...bed(out, { freq: 420, gain: .04 }));
      tickTock(.035);
      every(14, 30, t => { burst(out, t, .05, 700, 1.2, .18); burst(out, t + .25, .04, 640, 1.2, .14); });   // langkah di lorong
    } else if (kind === 'angin') {
      nodes.push(...bed(out, { brown: false, type: 'bandpass', freq: 520, q: 1.1, gain: .05, sweep: 260, rate: 1 / 9 }));
      nodes.push(...bed(out, { freq: 300, gain: .08, sweep: 90, rate: 1 / 14 }));
      every(3, 7, t => { for (let i = 0; i < 6; i++) burst(out, t + i * rnd(.03, .09), .03, rnd(3000, 5200), 2, .05, 'highpass'); });   // daun
    } else if (kind === 'jalan') {
      nodes.push(...bed(out, { freq: 380, gain: .1, sweep: 60, rate: 1 / 17 }));
      every(7, 16, t => {   // motor lewat
        const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; const g = ctx.createGain();
        const base = rnd(55, 85); o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 1.35, t + 1.6); o.frequency.linearRampToValueAtTime(base * .9, t + 3.4);
        f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(700, t + 1.6); f.frequency.linearRampToValueAtTime(240, t + 3.4);
        o.connect(f); f.connect(g); g.connect(out); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + 1.6); g.gain.exponentialRampToValueAtTime(.0001, t + 3.6); o.start(t); o.stop(t + 3.7);
      });
      every(18, 40, t => blip(out, 520, t, .015, .5, 'square', 500));   // klakson jauh
    } else if (kind === 'hujan') {
      nodes.push(...bed(out, { brown: false, type: 'highpass', freq: 1400, q: .2, gain: .045 }));
      nodes.push(...bed(out, { freq: 500, gain: .08 }));
      every(.06, .22, t => burst(out, t, rnd(.01, .035), rnd(2500, 6000), 4, .02));   // tetes di atap
    } else {
      nodes.push(...bed(out, { freq: 340, gain: .06 }));
    }
    // jam catatan: jangkrik di malam hari, burung di subuh
    if (night(h)) every(.9, 2.6, t => { const f = rnd(4300, 4900); for (let i = 0; i < 3; i++) blip(out, f, t + i * .055, .012, .04); });
    if (dawn(h)) every(2.5, 6, t => { const f = rnd(2400, 3600); blip(out, f, t, .02, .12, 'sine', f * 1.4); blip(out, f * 1.1, t + .16, .016, .1, 'sine', f * .9); });
    out.gain.linearRampToValueAtTime(1, now() + 1.6);
    return { out, nodes };
  }
  function drop() {
    timers.forEach(clearTimeout); timers = [];
    if (!layer) return;
    const old = layer; layer = null;
    old.out.gain.cancelScheduledValues(now()); old.out.gain.setValueAtTime(old.out.gain.value, now()); old.out.gain.linearRampToValueAtTime(0, now() + 1.2);
    setTimeout(() => { old.nodes.forEach(n => { try { n.stop(); } catch (e) { /* sudah berhenti */ } }); old.out.disconnect(); }, 1500);
  }
  function apply() {
    if (!on || !ctx) return;
    drop();
    if (room) layer = build(room, hour);
  }
  function setOn(v) {
    on = !!v && !!AC;
    if (on) {
      if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination); }
      ctx.resume?.(); clearTimeout(offTimer); apply();
    } else if (ctx) { drop(); offTimer = setTimeout(() => ctx && ctx.suspend?.(), 1600); }
    return on;
  }
  // sebuah halaman dibalik: kertas, pendek
  function page() { if (!on || !ctx) return; const t = now() + .02; burst(master, t, .05, 1800, .6, .16); burst(master, t + .1, .03, 3200, .8, .12); }
  document.addEventListener('visibilitychange', () => { if (!ctx || !on) return; if (document.hidden) ctx.suspend?.(); else ctx.resume?.(); });
  return {
    supported: !!AC,
    isOn: () => on,
    setOn,
    page,
    room(kind, h) { if (kind === room && h === hour) return; room = kind || null; hour = h == null ? null : h; apply(); },
    get current() { return room; }
  };
})();
