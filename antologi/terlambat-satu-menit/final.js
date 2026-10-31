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
  const $ = s => document.querySelector(s);

  class MinuteFinal {
    constructor(options) {
      Object.assign(this, options);
      this.slider = $('#seconds'); this.playButton = $('#play');
      this.time = 0; this.second = -1; this.playing = false; this.raf = 0; this.last = 0; this.finished = false; this.shown = null;
      const locate = entry => { const body = this.docs[entry.side].body, out = []; entry.find.forEach(pair => { const i = body.findIndex(p => p.includes(pair[this.en ? 1 : 0])); if (i >= 0 && !out.includes(i)) out.push(i); }); return out; };
      this.script = SCRIPT.map(entry => ({ ...entry, paragraphs: locate(entry) })).filter(entry => entry.paragraphs.length);
      this.after = locate(AFTER);
      this.coda = CODA.map(entry => ({ ...entry, paragraphs: locate(entry) })).filter(entry => entry.paragraphs.length);
      const t = this.t;
      $('#finalKicker').textContent = t('Satu menit terakhir', 'The last minute');
      $('#finalTitle').textContent = t('Satu menit terakhir', 'The last minute');
      $('#secondsLabel').textContent = t('Detik dalam menit terakhir', 'Second within the last minute');
      this.playButton.onclick = () => this.toggle();
      this.slider.oninput = () => { this.time = +this.slider.value; this.render(true); if (!this.playing) this.pause(); };
    }
    paragraphs(entry, list = entry.paragraphs) { return list.map(i => `<p>${this.inline(this.docs[entry.side].body[i])}</p>`).join(''); }
    open() {
      this.pause(); this.time = 0; this.second = -1; this.finished = false; this.shown = null;
      document.documentElement.removeAttribute('data-struck');
      $('#timeline').innerHTML = this.script.map((entry, i) => `<li><button type="button" data-at="${entry.at}" data-side="${entry.side}" data-pending><time>${stamp(entry.at)}</time><span>${this.names[entry.side]}</span></button></li>`).join('');
      $('#timeline').querySelectorAll('button').forEach(b => { b.onclick = () => { this.time = +b.dataset.at; this.render(true); if (!this.playing) this.pause(); }; });
      $('#momentView').innerHTML = ''; $('#after').hidden = true; $('#after').innerHTML = '';
      this.clock.svg.classList.remove('free'); this.clock.set(this.angles(0)); this.render();
    }
    close() { this.pause(); document.documentElement.removeAttribute('data-struck'); }
    angles(s) { const k = Math.min(s, END); return [354 + k / 10, 354 + k / 10, k * 6]; }
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
    show(entry) {
      if (this.shown === entry) return; this.shown = entry;
      const view = $('#momentView');
      if (!entry) { view.innerHTML = `<p class="moment-wait">${this.t('Satu menit, dalam waktu yang sebenarnya.', 'One minute, in real time.')}</p>`; return; }
      view.innerHTML = `<article class="moment" data-side="${entry.side}"${entry.bell ? ' data-bell' : ''}><p class="moment-who"><span>${this.names[entry.side]}</span> · ${this.hands[entry.side]}</p>${this.paragraphs(entry)}</article>`;
    }
    reveal() {
      const t = this.t, { held, spoken, gears } = this.bottle();
      const list = gears.map(g => `<li><q>${this.inline(g.text)}</q><small>${this.esc(this.names[g.side])} · ${this.esc(this.docs[g.side].title)}</small></li>`).join('');
      const say = entry => `<p class="speaker">${this.names[entry.speaker === 0 ? 0 : 1]}</p><blockquote>${entry.paragraphs.map(i => this.esc(this.docs[entry.side].body[i].replace(/\*/g, ''))).join(' ')}</blockquote>`;
      const gearWord = held === 1 ? t('gir', 'gear') : t('gir', 'gears');
      $('#after').innerHTML = `<div class="after-text"><time>${stamp(END)} · ${this.names[1]}</time>${this.paragraphs(AFTER, this.after)}</div>
        <div class="bottle-reveal"><div class="reveal-bottle" id="revealBottle" role="img" aria-label="${t('Botol kaca berisi ', 'A glass bottle holding ')}${held} ${gearWord}"></div><div><h2 id="revealCount">${held} ${gearWord}</h2><p>${t('Setiap gir di botolmu adalah satu kalimat bercetak miring yang kamu lewati: surat yang ditulis, kata yang dibatin, kalimat yang ditahan.', 'Each gear in your bottle is one italicized sentence you passed: a letter written, a thought kept inside, words held back.')}</p><p id="revealSpoken">${t('Kalimat yang diucapkan keras-keras: ', 'Sentences spoken aloud: ')}${spoken}.</p></div>${held ? `<details><summary>${t('Buka botol', 'Open the bottle')}</summary><ol class="gear-list">${list}</ol></details>` : ''}</div>
        <div class="coda">${this.coda.map(say).join('')}<p class="running">${t('Jamnya berjalan lagi.', 'The clock is running again.')}</p><button type="button" id="toDial">${t('Kembali ke muka jam', 'Back to the clock face')}</button></div>`;
      new window.MinuteBottle($('#revealBottle')).set(held);
      $('#toDial').onclick = () => this.onCover();
    }
    render(scrubbed = false) {
      const whole = Math.floor(this.time + 1e-6);
      this.clock.set(this.angles(this.calm() && this.playing ? whole : this.time));
      $('#finalTime').textContent = stamp(whole);
      if (+this.slider.value !== whole) this.slider.value = whole;
      const current = [...this.script].reverse().find(e => e.at <= whole) || null;
      this.slider.setAttribute('aria-valuetext', stamp(whole) + (current ? ' · ' + this.names[current.side] : ''));
      if (whole === this.second) return;
      const previous = this.second; this.second = whole;
      if (this.playing && previous >= 0 && whole !== BELL) this.sound.play('tick');
      if (whole === BELL && previous < BELL) { this.sound.play('bell'); this.flash('bell'); }
      $('#timeline').querySelectorAll('button').forEach(b => { b.toggleAttribute('data-pending', +b.dataset.at > whole); b.toggleAttribute('aria-current', current && +b.dataset.at === current.at); });
      this.show(current);
      if (current && current !== this.announced) { this.announced = current; $('#announcement').textContent = stamp(current.at) + ' · ' + this.names[current.side]; }
      document.documentElement.toggleAttribute('data-struck', whole >= BELL);
      const after = $('#after');
      if (whole >= END) {
        if (after.hidden) { this.reveal(); after.hidden = false; setTimeout(() => after.scrollIntoView({ behavior: this.calm() ? 'instant' : 'smooth', block: 'start' }), scrubbed ? 0 : 900); }
        if (!this.finished) { this.finished = true; this.onFinish(); }
      } else if (!after.hidden) { after.hidden = true; }
    }
  }
  MinuteFinal.script = { SCRIPT, AFTER, CODA, END, BELL };
  window.MinuteFinal = MinuteFinal;
})();
