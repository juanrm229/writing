/* Suara ruang sintetis, tanpa unduhan atau pemutaran otomatis. */
(() => {
  'use strict';
  const profiles = {
    room:     { low: 240, air: 720,  bed: .42, hiss: .035, hum: .012, hz: 50 },
    cafe:     { low: 460, air: 1150, bed: .48, hiss: .075, hum: .008, hz: 50 },
    outdoors: { low: 680, air: 1900, bed: .36, hiss: .055, hum: 0,    hz: 50 },
    night:    { low: 150, air: 520,  bed: .28, hiss: .018, hum: .008, hz: 50 },
    terminal: { low: 310, air: 900,  bed: .52, hiss: .065, hum: .022, hz: 60 },
    water:    { low: 950, air: 1500, bed: .40, hiss: .095, hum: 0,    hz: 50 },
    transit:  { low: 115, air: 580,  bed: .54, hiss: .035, hum: .028, hz: 42 }
  };

  class InterludeAmbience {
    constructor(onChange = () => {}) {
      this.onChange = onChange;
      this.supported = !!(window.AudioContext || window.webkitAudioContext);
      this.enabled = false;
      this.paused = false;
      this.scene = '';
      this.volume = .28;
      this.error = '';
      this.context = null;
      this.nodes = null;
      this.epoch = 0;
    }

    get playing() {
      return this.enabled && !this.paused && !!this.scene && this.context?.state === 'running';
    }

    emit() { this.onChange(this); }

    createGraph() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      const context = new Audio();
      this.context = context;
      const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      this.nodes = { master, sources: [] };
      // Dua kanal yang berbeda memberi ruang tanpa menambahkan suara percakapan.
      const noise = brown => {
        const buffer = context.createBuffer(2, context.sampleRate * 4, context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const data = buffer.getChannelData(channel); let last = 0;
          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + .02 * white) / 1.02;
            data[i] = brown ? last * 3.5 : white;
          }
          if (brown) {
            // Samakan kedua ujung putaran dan hilangkan DC agar tidak berbunyi klik.
            const difference = data[data.length - 1] - data[0]; let mean = 0;
            for (let i = 0; i < data.length; i++) { data[i] -= difference * i / (data.length - 1); mean += data[i]; }
            mean /= data.length;
            for (let i = 0; i < data.length; i++) data[i] -= mean;
          }
        }
        const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
        this.nodes.sources.push(source); return source;
      };
      const low = context.createBiquadFilter(); low.type = 'lowpass'; low.Q.value = .4;
      const air = context.createBiquadFilter(); air.type = 'bandpass'; air.Q.value = .45;
      const bed = context.createGain(), hiss = context.createGain(), hum = context.createGain();
      bed.gain.value = hiss.gain.value = hum.gain.value = 0;
      noise(true).connect(low); low.connect(bed); bed.connect(master);
      noise(false).connect(air); air.connect(hiss); hiss.connect(master);
      const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.connect(hum); hum.connect(master);
      this.nodes.sources.push(oscillator);
      Object.assign(this.nodes, { low, air, bed, hiss, hum, oscillator });
      this.nodes.sources.forEach(source => source.start());
      context.onstatechange = () => this.emit();
    }

    setVolume(value) {
      this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .28;
      if (this.playing) this.target(this.nodes.master.gain, this.volume * .32, .12);
      this.emit();
    }

    setScene(scene) {
      const next = profiles[scene] ? scene : '';
      if (this.scene === next) return;
      this.scene = next; void this.sync();
    }

    setPaused(value) {
      if (this.paused === !!value) return;
      this.paused = !!value; void this.sync();
    }

    setEnabled(value) { this.enabled = !!value; this.error = ''; return this.sync(); }

    target(parameter, value, time = .65) {
      const now = this.context.currentTime;
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, time);
    }

    mute() {
      if (!this.nodes || !this.context || this.context.state === 'closed') return;
      this.nodes.master.gain.cancelScheduledValues(this.context.currentTime);
      this.nodes.master.gain.setValueAtTime(0, this.context.currentTime);
    }

    async sync() {
      const epoch = ++this.epoch;
      try {
        if (!this.enabled || this.paused || !this.scene) {
          this.mute();
          if (this.context && this.context.state !== 'closed') await this.context.suspend();
        } else {
          if (!this.supported) throw new Error('unsupported');
          if (!this.context) this.createGraph();
          await this.context.resume();
          if (epoch !== this.epoch) return;
          const p = profiles[this.scene], n = this.nodes;
          this.target(n.low.frequency, p.low); this.target(n.air.frequency, p.air);
          this.target(n.bed.gain, p.bed); this.target(n.hiss.gain, p.hiss);
          this.target(n.hum.gain, p.hum); this.target(n.oscillator.frequency, p.hz);
          this.target(n.master.gain, this.volume * .32, .25);
        }
        if (epoch === this.epoch) this.emit();
      } catch (error) {
        if (epoch !== this.epoch) return;
        this.enabled = false; this.error = this.supported ? 'unavailable' : 'unsupported';
        this.dispose();
      }
    }

    dispose() {
      this.epoch++; this.enabled = false; this.mute();
      const context = this.context, nodes = this.nodes;
      this.context = null; this.nodes = null;
      if (context) {
        context.onstatechange = null;
        nodes?.sources.forEach(source => { try { source.stop(); source.disconnect(); } catch (_) { /* sudah berhenti */ } });
        if (context.state !== 'closed') void context.close().catch(() => {});
      }
      this.emit();
    }
  }
  window.InterludeAmbience = InterludeAmbience;
})();
