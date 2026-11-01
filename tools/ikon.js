#!/usr/bin/env node
/* Ikon aplikasi Quiet Margins: selembar halaman gelap sendirian di langit malam situs. Garis margin biru tipis,
   tiga baris tulisan yang memudar lalu berhenti, dan satu cahaya kecil yang tertinggal di margin di bawahnya.
   Hanya bentuk, tanpa huruf, jadi tetap jelas dari 512 piksel sampai favicon kecil.

   node tools/ikon.js   → menulis ulang assets/icons/*.png (memakai Playwright yang sudah terpasang) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const NIGHT = ['#07080F', '#151026', '#2B1530', '#4A1E4E'];
const LIGHT = '#6E9BFF';

// scale < 1 mengecilkan halaman ke tengah (untuk ikon maskable yang dipotong lingkaran oleh Android)
const svg = (scale = 1) => {
  const lines = [[1, .55], [.84, .36], [.56, .2]].map(([w, o], i) => `<rect x="204" y="${166 + i * 42}" width="${Math.round(148 * w)}" height="13" rx="6.5" fill="#ECE6DC" opacity="${o}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT[0]}"/><stop offset=".6" stop-color="${NIGHT[1]}"/><stop offset="1" stop-color="${NIGHT[2]}"/></linearGradient>
    <radialGradient id="dusk" cx=".12" cy="1.05" r=".8"><stop offset="0" stop-color="${NIGHT[3]}" stop-opacity=".8"/><stop offset="1" stop-color="${NIGHT[3]}" stop-opacity="0"/></radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1D26"/><stop offset="1" stop-color="#16151D"/></linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LIGHT}" stop-opacity="0"/><stop offset=".18" stop-color="${LIGHT}" stop-opacity=".8"/><stop offset=".82" stop-color="${LIGHT}" stop-opacity=".8"/><stop offset="1" stop-color="${LIGHT}" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${LIGHT}" stop-opacity=".55"/><stop offset="1" stop-color="${LIGHT}" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#000" flood-opacity=".7"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/><rect width="512" height="512" fill="url(#dusk)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="116" y="88" width="280" height="336" rx="26" fill="url(#page)" stroke="#2E2D3A" stroke-width="2" filter="url(#shadow)"/>
    <rect x="171" y="116" width="3" height="280" rx="1.5" fill="url(#rule)"/>
    ${lines}
    <circle cx="172.5" cy="336" r="40" fill="url(#glow)"/>
    <circle cx="172.5" cy="336" r="9" fill="#A9C2FF"/>
  </g>
</svg>`;
};

const OUT = [
  ['icon-512.png', 512, 1], ['icon-192.png', 192, 1], ['apple-touch-icon.png', 180, 1],
  ['maskable-512.png', 512, .8], ['favicon.png', 64, 1.15]
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [file, size, scale] of OUT) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;overflow:hidden">${svg(scale)}</body>`);
    await page.screenshot({ path: path.join(ROOT, 'assets/icons', file), omitBackground: false });
    console.log('assets/icons/' + file);
  }
  await browser.close();
})();
