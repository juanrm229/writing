/* Satu menit terakhir: tiga akhir cerita disusun pada satu menit yang sama.
   Semua petikan dicari dari naskah; tidak ada kalimat cerita yang ditulis di sini. */
(() => {
  'use strict';
  // Penanda ID/EN menunjuk paragraf asli. Urutan detik dipilih; kata-katanya tidak.
  const SCRIPT = [
    { at: 0, side: 2, find: [['Satu menit yang penuh penyesalan', 'One minute full of regret']] },
    { at: 8, side: 0, find: [['tersenyum tipis pada papan', 'smiled faintly at his chessboard']] },
    { at: 15, side: 1, find: [['Pada hari keempat, Banyu sampai', 'On the fourth day, Banyu arrived']] },
    { at: 22, side: 1, find: [['Ia berdiri lama. Lalu', 'He stood for a long time. Then']] },
    { at: 29, side: 0, find: [['ada sebuah siluet', 'there was a silhouette']] },
    { at: 36, side: 2, find: [['meninggal dunia dengan tenang', 'passed away peacefully']] },
    { at: 44, side: 0, find: [['Siapa pemuda itu', 'Who is that young man']] },
    { at: 53, side: 0, find: [['bersiap untuk berbunyi', 'prepared to ring']] },
    { at: 60, side: 1, bell: true, find: [['Lonceng berbunyi', 'The bell rang'], ['salah alamat lagi', 'wrong address again']] }
  ];
  const AFTER = { at: 61, side: 1, find: [['Sebab ada jeda', 'Because there was a pause'], ['"Mari, Mas,"', '"Come in, Sir,"'], ['satu menit setelah jam berhenti', 'one minute after the watch stopped']] };
  const CODA = [
    { side: 1, speaker: 0, find: [['Besok datang lagi ya', 'Come again tomorrow']] },
    { side: 1, speaker: 1, find: [['Besok aku datang lagi', "Tomorrow I'll come again"]] }
  ];
  const END = 61, BELL = 60;
  const stamp = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  class MinuteFinal {
    constructor({ docs, t, inline, esc, en, names, hands, sound, calm, bottle, onFinish, onDial }) {
      Object.assign(this, { docs, t, inline, esc, en, names, hands, sound, calm, bottle, onFinish, onDial });
      this.root = document.querySelector('#final'); this.slider = document.querySelector('#seconds'); this.playButton = document.querySelector('#play');
      this.clock = new window.MinuteClock(document.querySelector('#finalClock'));
      this.time = 0; this.second = -1; this.playing = false; this.raf = 0; this.last = 0; this.finished = false;
      this.script = SCRIPT.map(entry => ({ ...entry, paragraphs: this.locate(entry) })).filter(entry => entry.paragraphs.length);
      this.after = this.locate(AFTER);
      this.coda = CODA.map(entry => ({ ...entry, paragraphs: this.locate(entry) })).filter(entry => entry.paragraphs.length);
      document.querySelector('#finalKicker').textContent = t('Tiga jarum', 'Three hands');
      document.querySelector('#finalTitle').textContent = t('Satu menit terakhir', 'The last minute');
      document.querySelector('#finalNote').textContent = t('Satu menit, dalam waktu yang sebenarnya. Geser untuk berjalan sendiri.', 'One minute, in real time. Slide to walk it yourself.');
      document.querySelector('#secondsLabel').textContent = t('Detik dalam menit terakhir', 'Second within the last minute');
      this.playButton.onclick = () => this.toggle();
      this.slider.oninput = () => { this.time = +this.slider.value; this.render(true); if (!this.playing) this.pause(); };
      this.render();
    }
    locate(entry) {
      const body = this.docs[entry.side].body, out = [];
      entry.find.forEach(pair => { const i = body.findIndex(p => p.includes(pair[this.en ? 1 : 0])); if (i >= 0 && !out.includes(i)) out.push(i); });
      return out;
    }
    paragraphs(entry) { return entry.paragraphs.map(i => `<p>${this.inline(this.docs[entry.side].body[i])}</p>`).join(''); }
    build() {
      const t = this.t;
      const heads = this.names.map((name, i) => `<div class="moment-head" data-side="${i}" style="grid-column:${i + 1};grid-row:1"><b>${name}</b>${this.hands[i]}</div>`).join('');
      document.querySelector('#moments').innerHTML = heads + this.script.map((entry, row) => `<article class="moment" data-side="${entry.side}" data-at="${entry.at}"${entry.bell ? ' data-bell' : ''} data-pending style="grid-column:${entry.side + 1};grid-row:${row + 2}"><time>${stamp(entry.at)}<span class="who">${this.names[entry.side]}</span></time>${this.paragraphs(entry)}</article>`).join('');
      document.querySelector('#after').innerHTML = `<time>${stamp(END)} · ${this.names[1]}</time>${this.paragraphs({ ...AFTER, paragraphs: this.after })}`;
      this.moments = [...document.querySelectorAll('.moment')];
    }
    reveal() {
      const t = this.t, { held, spoken, gears } = this.bottle();
      const list = gears.map(g => `<li><q>${this.inline(g.text)}</q><small>${this.esc(this.names[g.side])} · ${this.esc(this.docs[g.side].title)}</small></li>`).join('');
      const say = (speaker, entry) => `<p class="speaker">${this.names[speaker === 0 ? 0 : 1]}</p><blockquote>${entry.paragraphs.map(i => this.esc(this.docs[entry.side].body[i].replace(/\*/g, ''))).join(' ')}</blockquote>`;
      const box = document.querySelector('#reveal');
      box.innerHTML = `<div class="reveal-bottle" id="revealBottle" role="img" aria-label="${t('Botol kaca berisi ', 'A glass bottle holding ')}${held} ${t('gir', held === 1 ? 'gear' : 'gears')}"></div><div><h2 id="revealCount">${held} ${t('gir', held === 1 ? 'gear' : 'gears')}</h2><p>${t('Setiap gir di botolmu adalah satu kalimat bercetak miring yang kamu lewati: surat yang ditulis, kata yang dibatin, kalimat yang ditahan.', 'Each gear in your bottle is one italicized sentence you passed: a letter written, a thought kept inside, words held back.')}</p><p id="revealSpoken">${t('Kalimat yang diucapkan keras-keras: ', 'Sentences spoken aloud: ')}${spoken}.</p></div>${held ? `<details><summary>${t('Buka botol', 'Open the bottle')}</summary><ol class="gear-list">${list}</ol></details>` : ''}<div class="coda">${this.coda.map(entry => say(entry.speaker, entry)).join('')}<p class="running">${t('Jamnya berjalan lagi.', 'The clock is running again.')}</p><button type="button" id="toDial">${t('Kembali ke muka jam', 'Back to the clock face')} →</button></div>`;
      new window.MinuteBottle(document.querySelector('#revealBottle')).set(held);
      document.querySelector('#toDial').onclick = () => this.onDial();
    }
    open() {
      this.pause(); this.build(); this.time = 0; this.second = -1; this.finished = false;
      document.documentElement.removeAttribute('data-struck');
      document.querySelector('#after').hidden = true; document.querySelector('#reveal').hidden = true;
      this.clock.set(this.angles(0)); this.render();
    }
    close() { this.pause(); }
    angles(s) {
      const k = Math.min(s, END);
      // Jarum jam dan menit menempuh menit terakhirnya; jarum detik berputar satu lingkaran penuh.
      return [354 + k / 10, 354 + k / 10, k * 6];
    }
    toggle() { if (this.playing) this.pause(); else this.play(); }
    play() {
      if (this.time >= END) { this.time = 0; this.render(true); }
      this.playing = true; this.playButton.setAttribute('aria-pressed', 'true'); this.playButton.textContent = this.t('Tahan', 'Hold');
      this.last = performance.now(); cancelAnimationFrame(this.raf);
      const step = now => {
        if (!this.playing) return;
        this.time = Math.min(END, this.time + (now - this.last) / 1000); this.last = now; this.render();
        if (this.time >= END) { this.pause(); return; }
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
    pause() {
      this.playing = false; cancelAnimationFrame(this.raf);
      this.playButton.setAttribute('aria-pressed', 'false');
      this.playButton.textContent = this.time >= END ? this.t('Ulangi', 'Again') : this.time > 0 ? this.t('Lanjutkan', 'Continue') : this.t('Biarkan berjalan', 'Let it run');
    }
    render(scrubbed = false) {
      const whole = Math.floor(this.time + 1e-6);
      this.clock.set(this.angles(this.calm() && this.playing ? whole : this.time));
      document.querySelector('#finalTime').textContent = stamp(whole);
      if (+this.slider.value !== whole) this.slider.value = whole;
      const person = [...this.script].reverse().find(e => e.at <= whole);
      this.slider.setAttribute('aria-valuetext', stamp(whole) + (person ? ' · ' + this.names[person.side] : ''));
      if (whole === this.second) return;
      const previous = this.second; this.second = whole;
      if (this.playing && previous >= 0) this.sound.play(whole === BELL ? 'bell' : 'tick');
      else if (scrubbed && whole === BELL) this.sound.play('bell');
      let newest = null;
      (this.moments || []).forEach(m => {
        const due = +m.dataset.at <= whole, was = !m.hasAttribute('data-pending');
        m.toggleAttribute('data-pending', !due); if (due && !was) newest = m;
      });
      document.documentElement.toggleAttribute('data-struck', whole >= BELL);
      const after = document.querySelector('#after'), reveal = document.querySelector('#reveal');
      if (whole >= END) {
        if (after.hidden) { after.hidden = false; this.reveal(); reveal.hidden = false; newest = after; }
        if (!this.finished) { this.finished = true; this.onFinish(); }
      } else { after.hidden = true; reveal.hidden = true; }
      if (newest) {
        const label = newest === after ? stamp(END) + ' · ' + this.names[1] : stamp(+newest.dataset.at) + ' · ' + this.names[+newest.dataset.side];
        document.querySelector('#announcement').textContent = label;
        if (this.playing || newest === after) {
          const top = newest.getBoundingClientRect().top - document.querySelector('.final-head').getBoundingClientRect().bottom - 24;
          if (Math.abs(top) > 40 || newest === after) scrollTo({ top: scrollY + top, behavior: this.calm() ? 'instant' : 'smooth' });
        }
      }
    }
  }
  MinuteFinal.script = { SCRIPT, AFTER, CODA, END, BELL };
  window.MinuteFinal = MinuteFinal;
})();
