/* Bunyi: bip pemindai, cap pos, dan lonceng. Hanya menyala jika pembaca memilihnya; disintesis dengan Web Audio. */
(() => {
  'use strict';
  class MinuteSound {
    constructor(change = () => {}) {
      this.change = change; this.supported = !!(window.AudioContext || window.webkitAudioContext);
      this.enabled = false; this.volume = .25; this.paused = document.hidden; this.error = false; this.epoch = 0;
      this.context = null; this.master = null; this.pan = null; this.loops = {}; this.timer = 0; this.scene = {};
      this.sources = new Set();
    }
    get playing() { return this.enabled && !this.paused && this.context?.state === 'running'; }
    setVolume(value) { this.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : .25)); if (this.master) this.master.gain.setTargetAtTime(this.volume * .5, this.context.currentTime, .15); }
    noise() {
      if (this.buffer) return this.buffer;
      const c = this.context, length = c.sampleRate * 2, buffer = c.createBuffer(1, length, c.sampleRate), data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) { const white = Math.random() * 2 - 1; last = (last + .02 * white) / 1.02; data[i] = i % 2 ? white : last * 3.5; }
      return (this.buffer = buffer);
    }
    loop(name, build) {
      if (this.loops[name]) return;
      const c = this.context, src = c.createBufferSource(), gain = c.createGain();
      src.buffer = this.noise(); src.loop = true; gain.gain.value = 0;
      const tail = build(src, gain); tail.connect(gain); gain.connect(this.pan);
      src.start(); this.loops[name] = { src, gain };
    }
    level(name, value) { const l = this.loops[name]; if (l) l.gain.gain.setTargetAtTime(value, this.context.currentTime, .6); }
    // Suasana mengikuti keadaan panggung: hujan, kereta, ruangan, ratusan jam, telinga kiri yang tuli.
    setScene(scene = {}) {
      this.scene = scene;
      if (!this.playing) return;
      const c = this.context;
      this.loop('room', (src) => { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; src.connect(f); return f; });
      this.loop('rain', (src) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .5; src.connect(f); return f; });
      this.loop('train', (src) => {
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; src.connect(f);
        const am = c.createGain(), lfo = c.createOscillator(), depth = c.createGain(); am.gain.value = .6; lfo.frequency.value = 1.7; depth.gain.value = .4; lfo.connect(depth); depth.connect(am.gain); lfo.start(); f.connect(am); return am;
      });
      const on = !!scene.side;
      this.level('room', on ? .1 : 0);
      this.level('rain', scene.rain === 'on' ? .16 : 0);
      this.level('train', scene.scene === 'train' ? .5 : 0);
      this.pan.pan.setTargetAtTime(scene.deaf === 'on' ? .85 : 0, c.currentTime, .8);
      clearInterval(this.timer); this.timer = 0;
      const shop = scene.clocks === 'on', frozen = scene.clocks === 'frozen' || scene.stopped === 'on';
      if (on && !frozen) this.timer = setInterval(() => {
        if (!this.playing) return;
        if (shop) for (let i = 0; i < 4; i++) setTimeout(() => this.play('tick', .5 + Math.random() * .9), Math.random() * 900);
        else this.play('tick', .55);
      }, 1000);
    }
    async setEnabled(value) {
      this.enabled = !!value; this.error = false; const epoch = ++this.epoch;
      try {
        if (!this.enabled || this.paused) {
          clearInterval(this.timer); this.timer = 0;
          if (this.master) this.master.gain.setValueAtTime(0, this.context.currentTime);
          if (this.context && this.context.state !== 'closed') await this.context.suspend();
        } else {
          if (!this.supported) throw new Error('unsupported');
          if (!this.context) {
            const Audio = window.AudioContext || window.webkitAudioContext; this.context = new Audio();
            this.master = this.context.createGain(); this.master.gain.value = 0;
            this.pan = this.context.createStereoPanner ? this.context.createStereoPanner() : this.context.createGain();
            if (!this.pan.pan) this.pan.pan = { setTargetAtTime() {} };
            this.pan.connect(this.master); this.master.connect(this.context.destination);
            this.context.onstatechange = () => this.change(this);
          }
          await this.context.resume(); if (epoch !== this.epoch) return;
          this.master.gain.setTargetAtTime(this.volume * .5, this.context.currentTime, .15);
          this.setScene(this.scene);
        }
        if (epoch === this.epoch) this.change(this);
      } catch (_) { if (epoch === this.epoch) { this.error = true; this.dispose(); } }
    }
    setPaused(value) { if (this.paused === !!value) return; this.paused = !!value; void this.setEnabled(this.enabled); }
    tone(hz, amplitude, duration, at = 0, type = 'sine') {
      const c = this.context, now = c.currentTime + at, o = c.createOscillator(), gain = c.createGain();
      o.type = type; o.frequency.value = hz;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(amplitude, now + .004); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      o.connect(gain); gain.connect(this.pan); this.sources.add(o);
      o.onended = () => { this.sources.delete(o); o.disconnect(); gain.disconnect(); };
      o.start(now); o.stop(now + duration + .05);
    }
    burst(freq, amplitude, duration, type = 'highpass', at = 0) {
      const c = this.context, now = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = this.noise(); f.type = type; f.frequency.value = freq;
      gain.gain.setValueAtTime(amplitude, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      src.connect(f); f.connect(gain); gain.connect(this.pan); src.start(now); src.stop(now + duration + .05);
      src.onended = () => { src.disconnect(); f.disconnect(); gain.disconnect(); };
    }
    play(kind, scale = 1) {
      if (!this.playing) return;
      const s = scale;
      if (kind === 'tick') { this.tone(2400 + Math.random() * 300, .05 * s, .03); this.burst(5000, .03 * s, .02); }
      else if (kind === 'bell') [[880, .34, 3.4], [2420, .14, 2.2], [4750, .06, 1.2], [1320, .1, 2.8]].forEach(([hz, a, d]) => this.tone(hz, a, d));
      else if (kind === 'chime') [[1568, .2, 1.8], [3951, .06, .9], [2093, .08, 1.4]].forEach(([hz, a, d]) => this.tone(hz, a, d));
      else if (kind === 'gear') { this.tone(3136, .1, .25); this.tone(4699, .04, .16, .05); }
      else if (kind === 'spoon') [0, .32, .64].forEach(at => { this.tone(3520, .12, .3, at); this.tone(5274, .04, .18, at); });
      else if (kind === 'snap') { this.burst(1800, .4, .12); this.tone(160, .2, .12, 0, 'triangle'); }
      else if (kind === 'drop') { this.tone(110, .3, .35, 0, 'triangle'); this.burst(600, .12, .2, 'lowpass'); }
      else if (kind === 'move') { this.tone(620, .12, .08, 0, 'triangle'); this.burst(2000, .06, .05); }
      else if (kind === 'stamp') { this.tone(90, .25, .16, 0, 'triangle'); this.burst(900, .14, .08, 'lowpass'); }
      else if (kind === 'scatter') [0, .07, .13, .22, .3].forEach(at => this.tone(500 + Math.random() * 400, .1, .07, at, 'triangle'));
      else if (kind === 'fly') this.burst(3000, .08, .5, 'bandpass');
      else if (kind === 'scan') { this.tone(1760, .07, .07, 0, 'square'); this.tone(2637, .05, .09, .08, 'square'); }
      else if (kind === 'status') { this.tone(988, .09, .18); this.tone(1319, .07, .26, .1); }
    }
    dispose() {
      ++this.epoch; this.enabled = false; clearInterval(this.timer); this.timer = 0;
      this.sources.forEach(o => { try { o.stop(); } catch (_) {} }); this.sources.clear();
      const c = this.context; this.context = null; this.master = null; this.loops = {}; this.buffer = null;
      if (c) { c.onstatechange = null; if (c.state !== 'closed') void c.close().catch(() => {}); }
      this.change(this);
    }
  }
  window.MinuteSound = MinuteSound;
})();
