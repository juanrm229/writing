#!/usr/bin/env node
/* Ikon aplikasi Quiet Margins: selembar halaman dengan margin yang lapang, beberapa baris teks yang tenang,
   dan satu titik biru di margin, di atas langit senja situs. Hanya bentuk, tanpa huruf, jadi tetap jelas
   dari 512 piksel sampai favicon kecil.

   node tools/ikon.js   → menulis ulang assets/icons/*.png (memakai Playwright yang sudah terpasang) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SKY = ['#C6D1EE', '#ECE8F0', '#F8DFCD'];
const ACCENT = '#1662FF';

// scale < 1 mengecilkan halaman ke tengah (untuk ikon maskable yang dipotong lingkaran oleh Android)
const svg = (scale = 1) => {
  const lines = [1, 1, 1, .62].map((w, i) => `<rect x="196" y="${178 + i * 46}" width="${Math.round(140 * w)}" height="18" rx="9" fill="#CDD2DC"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY[0]}"/><stop offset=".55" stop-color="${SKY[1]}"/><stop offset="1" stop-color="${SKY[2]}"/></linearGradient>
    <radialGradient id="glowA" cx="0" cy="1" r=".7"><stop offset="0" stop-color="${SKY[2]}"/><stop offset="1" stop-color="${SKY[2]}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="1" cy="0" r=".75"><stop offset="0" stop-color="${SKY[0]}"/><stop offset="1" stop-color="${SKY[0]}" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="16" stdDeviation="26" flood-color="#1E2432" flood-opacity=".2"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/><rect width="512" height="512" fill="url(#glowA)"/><rect width="512" height="512" fill="url(#glowB)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="112" y="84" width="288" height="344" rx="30" fill="#FFFFFF" filter="url(#shadow)"/>
    ${lines}
    <circle cx="156" cy="187" r="15" fill="${ACCENT}"/>
  </g>
</svg>`;
};

const OUT = [
  ['icon-512.png', 512, 1], ['icon-192.png', 192, 1], ['apple-touch-icon.png', 180, 1],
  ['maskable-512.png', 512, .8], ['favicon.png', 64, 1.12]
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
