/* Usia Pulang: suasana pelabuhan Teluk Rantau. Semua bunyi dibuat dengan Web Audio, tanpa berkas suara.
   - ombak: derau cokelat yang disaring, naik turun pelan; malam lebih sunyi, siang lebih terang
   - kapal di kejauhan: klakson rendah sesekali
   - sela: bunyinya teredam, seperti dari ruangan lain (Laras tidak di sana)
   - bunyi kecil untuk cap pilihan, malam yang lewat, lonceng 18.40, gema, dan masuk ke sela
   Mati sampai pembaca menyalakannya di Aa. Berhenti sendiri saat tab disembunyikan. */
window.UsiaSound = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sea = null, on = false, hornTimer = 0, offTimer = 0;
  const now = () => ctx.currentTime;

  function brown(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
    return b;
  }
  function white(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // ombak
    const src = ctx.createBufferSource(); src.buffer = brown(8); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .2;
    const g = ctx.createGain(); g.gain.value = .32;
    const swell = ctx.createOscillator(); swell.frequency.value = 1 / 8.5;
    const sg = ctx.createGain(); sg.gain.value = .2; swell.connect(sg); sg.connect(g.gain);
    const drift = ctx.createOscillator(); drift.frequency.value = 1 / 13;
    const dg = ctx.createGain(); dg.gain.value = 160; drift.connect(dg); dg.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(master);
    // angin tipis
    const wsrc = ctx.createBufferSource(); wsrc.buffer = white(4); wsrc.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = .6;
    const wg = ctx.createGain(); wg.gain.value = .012;
    wsrc.connect(bp); bp.connect(wg); wg.connect(master);
    [src, swell, drift, wsrc].forEach(n => n.start());
    sea = { g, lp, wg };
  }
  function env(gainNode, t0, peak, a, hold, r) {
    const p = gainNode.gain; p.cancelScheduledValues(t0); p.setValueAtTime(0, t0);
    p.linearRampToValueAtTime(peak, t0 + a); p.setValueAtTime(peak, t0 + a + hold); p.exponentialRampToValueAtTime(.0001, t0 + a + hold + r);
  }
  function tone(freq, type, t0, peak, a, hold, r, filter) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    let last = o;
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); last = f; }
    last.connect(g); g.connect(master); env(g, t0, peak, a, hold, r);
    o.start(t0); o.stop(t0 + a + hold + r + .05);
    return o;
  }
  function click(t0, peak, freq = 2600, dur = .03) {
    const s = ctx.createBufferSource(); s.buffer = white(.06);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master); env(g, t0, peak, .002, 0, dur);
    s.start(t0); s.stop(t0 + .08);
  }
  function horn() {
    if (!on) return;
    const t0 = now() + .1;
    tone(98, 'sawtooth', t0, .05, 1.2, 1.6, 2.4, 420);
    tone(147, 'sawtooth', t0 + .05, .035, 1.2, 1.5, 2.4, 420);
    hornTimer = setTimeout(horn, 70000 + Math.random() * 80000);
  }
  function setOn(v) {
    if (!AC) return;
    on = !!v; clearTimeout(offTimer); clearTimeout(hornTimer);
    if (on) {
      if (!ctx) build();
      ctx.resume();
      master.gain.cancelScheduledValues(now()); master.gain.setTargetAtTime(.6, now(), .8);
      hornTimer = setTimeout(horn, 18000 + Math.random() * 20000);
    } else if (ctx) {
      master.gain.cancelScheduledValues(now()); master.gain.setTargetAtTime(0, now(), .25);
      offTimer = setTimeout(() => { if (!on) ctx.suspend(); }, 1200);
    }
  }
  // bagian hari: malam lebih sunyi; di sela bunyinya teredam
  function part(p, away) {
    if (!on || !sea) return;
    const lvl = { malam: .22, senja: .3, sore: .3, pagi: .34, siang: .3 }[p] ?? .3;
    sea.g.gain.setTargetAtTime(away ? lvl * .6 : lvl, now(), 1.2);
    sea.lp.frequency.setTargetAtTime(away ? 260 : p === 'malam' ? 420 : 560, now(), 1.2);
    sea.wg.gain.setTargetAtTime(p === 'siang' || p === 'pagi' ? .016 : .008, now(), 2);
  }
  const stamp = () => { if (!on) return; const t0 = now(); const o = tone(130, 'sine', t0, .5, .004, 0, .18); o.frequency.exponentialRampToValueAtTime(52, t0 + .16); click(t0, .25, 1400, .025); };
  const roll = () => { if (!on) return; const t0 = now() + .1; for (let i = 0; i < 16; i++) click(t0 + i * .125 + (i % 2) * .01, .09 - i * .004, i % 2 ? 2100 : 2600); };
  const last = () => {
    if (!on) return; const t0 = now() + .1;
    for (let i = 0; i < 22; i++) click(t0 + i * .11, .1, i % 2 ? 2100 : 2600);
    [784, 1176, 1568].forEach((f, i) => tone(f, 'sine', t0 + 2.55, [.16, .07, .04][i], .01, 0, 4.2));
  };
  const echo = () => { if (!on) return; const t0 = now(); [392, 588, 784].forEach((f, i) => tone(f, 'sine', t0 + i * .18, .045, .5, .2, 1.6)); };
  const cross = () => {
    if (!on) return; const t0 = now();
    const s = ctx.createBufferSource(); s.buffer = white(1);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + .6);
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master); env(g, t0, .08, .25, .1, .4); s.start(t0); s.stop(t0 + 1);
  };
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });
  return { supported: !!AC, isOn: () => on, setOn, part, stamp, roll, last, echo, cross };
})();
