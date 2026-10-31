/* Muka jam dan botol kaca. Hanya gambar: tidak ada teks cerita di sini. */
(() => {
  'use strict';
  const R = 90;
  // Saman jarum jam, Banyu jarum menit, Maryam jarum detik.
  const HANDS = [
    { key: 'a', length: .5, tail: .1, width: 5.2 },
    { key: 'b', length: .76, tail: .12, width: 3 },
    { key: 'c', length: .86, tail: .22, width: 1.3 }
  ];
  const ticks = () => Array.from({ length: 60 }, (_, i) => {
    const a = i * Math.PI / 30, major = i % 5 === 0, inner = major ? R - 9 : R - 4;
    const p = r => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
    return `<path class="${major ? 'tick major' : 'tick'}" d="M${p(inner)}L${p(R)}"/>`;
  }).join('');
  const hand = h => `<g class="hand hand-${h.key}" data-hand="${h.key}"><g class="${h.key === 'c' ? 'twitch' : 'still'}"><line x1="0" y1="${(h.tail * R).toFixed(1)}" x2="0" y2="${(-h.length * R).toFixed(1)}" stroke-width="${h.width}"/>${h.key === 'c' ? `<circle cx="0" cy="${(h.tail * R - 2).toFixed(1)}" r="3.2"/>` : ''}<line class="hit" x1="0" y1="0" x2="0" y2="${(-h.length * R).toFixed(1)}"/></g></g>`;

  class MinuteClock {
    constructor(host, { minimal = false } = {}) {
      this.host = host;
      host.innerHTML = `<svg class="clock${minimal ? ' minimal' : ''}" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false"><circle class="rim" r="${R + 6}"/>${minimal ? '' : ticks()}<g class="hands">${HANDS.map(hand).join('')}</g><circle class="pin" r="${minimal ? 6 : 3.6}"/></svg>`;
      this.svg = host.querySelector('svg');
      this.hands = HANDS.map(h => host.querySelector('.hand-' + h.key));
      this.angles = [0, 0, 0]; this.anim = 0;
    }
    set(angles) {
      this.angles = angles.slice();
      angles.forEach((deg, i) => this.hands[i].setAttribute('transform', `rotate(${deg.toFixed(3)})`));
    }
    // Jarum berputar dari posisi sekarang ke posisi tujuan; tidak bergerak jika pembaca memilih tenang.
    sweep(targets, duration = 1200, calm = false) {
      cancelAnimationFrame(this.anim);
      if (calm) { this.set(targets); return; }
      const from = this.angles.slice(), start = performance.now();
      const ease = x => 1 - Math.pow(1 - x, 3);
      const step = now => {
        const k = Math.min(1, (now - start) / duration);
        this.set(from.map((a, i) => a + (targets[i] - a) * ease(k)));
        if (k < 1) this.anim = requestAnimationFrame(step);
      };
      this.anim = requestAnimationFrame(step);
    }
    stop() { cancelAnimationFrame(this.anim); }
    focus(key) { this.svg.dataset.focus = key || ''; }
  }

  // Gir: roda bergigi dengan lubang tengah, digambar sebagai satu path.
  const gear = (cx, cy, r, rot, teeth = 8) => {
    const pts = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2 + rot, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2 + rot, rr = i % 2 ? r * .74 : r;
      pts.push([cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr], [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr]);
    }
    const h = r * .32;
    return `M${pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L')}Z M${(cx + h).toFixed(2)} ${cy.toFixed(2)}a${h.toFixed(2)} ${h.toFixed(2)} 0 1 0 ${(-2 * h).toFixed(2)} 0a${h.toFixed(2)} ${h.toFixed(2)} 0 1 0 ${(2 * h).toFixed(2)} 0Z`;
  };
  const noise = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  class MinuteBottle {
    constructor(host) {
      this.host = host;
      host.innerHTML = `<svg class="bottle" viewBox="0 0 60 100" aria-hidden="true" focusable="false"><rect class="cork" x="23" y="2" width="14" height="10" rx="2"/><path class="glass" d="M24 12h12v12c0 4 14 8 14 20v46c0 4-3 7-7 7H17c-4 0-7-3-7-7V44c0-12 14-16 14-20z"/><g class="gears"></g><path class="shine" d="M15 46v38"/></svg>`;
      this.layer = host.querySelector('.gears'); this.count = -1;
    }
    // Posisi tiap gir tetap sama di setiap kunjungan, menumpuk dari dasar botol.
    set(count) {
      if (count === this.count) return; this.count = count;
      const perRow = 4, rows = Math.ceil(count / perRow), gap = rows > 7 ? Math.max(3.4, 50 / rows) : 7;
      this.layer.innerHTML = Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / perRow), col = i % perRow;
        const x = 17.5 + col * 8.3 + (noise(i) - .5) * 3 + (row % 2 ? 2 : 0), y = 89 - row * gap - noise(i + 9) * 1.5;
        return `<path class="gear" d="${gear(x, y, 3.7, noise(i + 3) * 6)}"/>`;
      }).join('');
    }
    target() { return this.host.querySelector('.glass').getBoundingClientRect(); }
  }
  MinuteBottle.gear = gear;
  window.MinuteClock = MinuteClock; window.MinuteBottle = MinuteBottle;
})();
