/* Efek suara ponsel untuk Semua yang Pernah. Semuanya disintesis dengan Web Audio, tidak ada berkas suara.
   Suara hanya berbunyi setelah pembaca menyentuh atau mengetuk halaman (aturan peramban), dan bisa dimatikan. */
(() => {
  'use strict';
  let ctx = null, master = null, on = true, duck = 1;
  const active = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
  function ac() {
    if (!on || !active()) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = .32;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    master.gain.value = .32 * duck;
    return ctx;
  }
  let noiseBuf = null;
  const noise = c => { if (noiseBuf) return noiseBuf; noiseBuf = c.createBuffer(1, c.sampleRate * .5, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; };
  // nada lembut dengan selubung cepat
  function tone(c, f, t0, dur, { type = 'sine', vol = .5, glide = 0, attack = .006 } = {}) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .02);
  }
  function burst(c, t0, dur, { f = 3000, q = 1.2, vol = .35, sweep = 0, hp = 0 } = {}) {
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(c); s.playbackRate.value = .8 + Math.random() * .4;
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t0); bp.Q.value = q; if (sweep) bp.frequency.exponentialRampToValueAtTime(f * sweep, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    let node = s; node.connect(bp); node = bp;
    if (hp) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; node.connect(h); node = h; }
    node.connect(g); g.connect(master); s.start(t0, Math.random() * .3); s.stop(t0 + dur + .02);
  }
  const SOUNDS = {
    // ketukan papan ketik ponsel: klik pendek bernada sedikit acak
    key(c, t) { burst(c, t, .028, { f: 2600 + Math.random() * 900, q: 2.2, vol: .22 }); tone(c, 1700 + Math.random() * 300, t, .018, { type: 'triangle', vol: .05 }); },
    del(c, t) { burst(c, t, .03, { f: 1500 + Math.random() * 300, q: 2, vol: .2 }); },
    // pesan terkirim: desir naik
    send(c, t) { burst(c, t, .24, { f: 700, q: .9, vol: .28, sweep: 4.5 }); tone(c, 1320, t + .12, .09, { vol: .08 }); },
    // pesan masuk: dua nada naik, lembut
    recv(c, t) { tone(c, 1046.5, t, .16, { vol: .32 }); tone(c, 1568, t + .1, .32, { vol: .26 }); tone(c, 3136, t + .1, .12, { vol: .03 }); },
    // notifikasi di layar terkunci: kaca tiga nada
    notif(c, t) { [1318.5, 1760, 2093].forEach((f, i) => tone(c, f, t + i * .075, .55 - i * .1, { vol: .2, type: 'sine' })); },
    // banner saat menjelajah
    banner(c, t) { tone(c, 1174.7, t, .12, { vol: .22 }); tone(c, 1760, t + .07, .22, { vol: .18 }); },
    // telepon
    ring(c, t) { for (let k = 0; k < 2; k++) { tone(c, 440, t + k * .45, .38, { vol: .14 }); tone(c, 480, t + k * .45, .38, { vol: .14 }); } },
    connect(c, t) { tone(c, 880, t, .09, { vol: .2 }); tone(c, 1318.5, t + .11, .14, { vol: .18 }); },
    hangup(c, t) { tone(c, 659.3, t, .14, { vol: .2 }); tone(c, 440, t + .16, .22, { vol: .18 }); },
    // peta: rute muncul, tiba
    route(c, t) { tone(c, 987.8, t, .12, { vol: .16 }); },
    arrive(c, t) { [783.99, 987.77, 1318.5].forEach((f, i) => tone(c, f, t + i * .11, .5, { vol: .2 })); },
    // ketuk aplikasi, membuka layar
    tap(c, t) { burst(c, t, .02, { f: 4200, q: 3, vol: .12 }); },
    lock(c, t) { burst(c, t, .035, { f: 1100, q: 4, vol: .3 }); tone(c, 220, t, .05, { type: 'triangle', vol: .12 }); },
    // komentar baru di forum
    pop(c, t) { tone(c, 620, t, .08, { vol: .18, glide: 1.6 }); },
    // jepret kamera
    shutter(c, t) { burst(c, t, .03, { f: 3500, q: .8, vol: .45 }); burst(c, t + .07, .05, { f: 2200, q: .9, vol: .35 }); },
    // getar ponsel (dengung rendah)
    buzz(c, t) { for (let k = 0; k < 2; k++) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 150; g.gain.setValueAtTime(0, t + k * .32); g.gain.linearRampToValueAtTime(.06, t + k * .32 + .02); g.gain.setValueAtTime(.06, t + k * .32 + .2); g.gain.linearRampToValueAtTime(0, t + k * .32 + .24); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; o.connect(lp); lp.connect(g); g.connect(master); o.start(t + k * .32); o.stop(t + k * .32 + .26); } }
  };
  const VIBE = { recv: [18], notif: [22, 60, 22], banner: [16], buzz: [180, 120, 180], ring: [300, 150, 300], arrive: [30, 50, 30] };
  let lastKey = 0;
  window.SFX = {
    play(name, delay = 0) {
      const c = ac(); if (!c || !SOUNDS[name]) return;
      if ((name === 'key' || name === 'del')) { const now = performance.now(); if (now - lastKey < 28) return; lastKey = now; }
      SOUNDS[name](c, c.currentTime + Math.max(0, delay) / 1000 + .01);
      if (VIBE[name] && navigator.vibrate && on) { if (delay) setTimeout(() => { try { navigator.vibrate(VIBE[name]); } catch (e) {} }, delay); else try { navigator.vibrate(VIBE[name]); } catch (e) { /* tidak didukung */ } }
    },
    set on(v) { on = !!v; if (!on && ctx) ctx.suspend().catch(() => {}); },
    get on() { return on; },
    // saat lagu diputar, efek suara mengecil
    set duck(v) { duck = v ? .45 : 1; if (master) master.gain.value = .32 * duck; }
  };
})();
