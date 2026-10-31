/* Bunyi cerita menunggu pilihan pembaca. Tidak ada berkas audio eksternal. */
(() => {
  'use strict';
  class MinuteSound {
    constructor(change = () => {}) {
      this.change = change; this.supported = !!(window.AudioContext || window.webkitAudioContext);
      this.enabled = false; this.volume = .25; this.paused = document.hidden;
      this.context = null; this.master = null; this.sources = new Set(); this.timer = 0; this.room = ''; this.epoch = 0; this.error = false;
    }
    get playing() { return this.enabled && !this.paused && this.context?.state === 'running'; }
    setVolume(value) { this.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : .25)); if (this.master) this.master.gain.setTargetAtTime(this.volume * .16, this.context.currentTime, .1); }
    setRoom(room) { if (this.room !== room) { this.room = room; this.clock(); } }
    clear() { clearInterval(this.timer); this.timer = 0; this.sources.forEach(o => { try { o.stop(); o.disconnect(); } catch (_) {} }); this.sources.clear(); }
    clock() { clearInterval(this.timer); this.timer = 0; if (this.playing && this.room === 'clock') this.timer = setInterval(() => this.play('tick'), 1000); }
    async setEnabled(value) {
      this.enabled = !!value; this.error = false; const epoch = ++this.epoch;
      try {
        if (!this.enabled || this.paused) {
          this.clear(); if (this.master) this.master.gain.setValueAtTime(0, this.context.currentTime);
          if (this.context && this.context.state !== 'closed') await this.context.suspend();
        } else {
          if (!this.supported) throw new Error('unsupported');
          if (!this.context) {
            const Audio = window.AudioContext || window.webkitAudioContext; this.context = new Audio();
            this.master = this.context.createGain(); this.master.gain.value = 0; this.master.connect(this.context.destination);
            this.context.onstatechange = () => this.change(this);
          }
          await this.context.resume(); if (epoch !== this.epoch) return;
          this.master.gain.setTargetAtTime(this.volume * .16, this.context.currentTime, .1); this.clock();
        }
        if (epoch === this.epoch) this.change(this);
      } catch (_) { if (epoch === this.epoch) { this.error = true; this.dispose(); } }
    }
    setPaused(value) { if (this.paused === !!value) return; this.paused = !!value; void this.setEnabled(this.enabled); }
    play(kind) {
      if (!this.playing) return;
      const c = this.context, now = c.currentTime;
      const notes = kind === 'bell' ? [[1046, .42, .9], [1568, .14, .6]] : kind === 'chime' ? [[1397, .3, .7], [2093, .1, .5]] : kind === 'spoon' ? [[2349, .18, .25]] : kind === 'button' ? [[540, .12, .09]] : kind === 'gear' ? [[2637, .1, .22], [3951, .04, .14]] : [[1500, .08, .045], [900, .04, .03]];
      notes.forEach(([hz, amplitude, duration]) => {
        const o = c.createOscillator(), gain = c.createGain(); o.type = 'sine'; o.frequency.value = hz;
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(amplitude, now + .003); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
        o.connect(gain); gain.connect(this.master); this.sources.add(o);
        o.onended = () => { this.sources.delete(o); o.disconnect(); gain.disconnect(); };
        o.start(now); o.stop(now + duration + .02);
      });
    }
    dispose() {
      ++this.epoch; this.enabled = false; this.clear();
      const c = this.context; this.context = null; this.master = null;
      if (c) { c.onstatechange = null; if (c.state !== 'closed') void c.close().catch(() => {}); }
      this.change(this);
    }
  }
  window.MinuteSound = MinuteSound;
})();
