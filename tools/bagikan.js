/* Membuat ulang halaman bagikan (baca/<alamat>/index.html), sitemap.xml, dan gambar kartu bagikan (assets/og/*.png).
   Pakai:  node tools/bagikan.js            (halaman + sitemap + gambar)
           node tools/bagikan.js --tanpa-gambar
   Gambar dibuat dengan Playwright dari templat tipografi; tanpa ilustrasi. Admin membuat ulang halaman dan sitemap
   setiap kali tulisan disimpan; gambar per tulisan dibuat dengan skrip ini. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const JMShare = require(path.join(ROOT, 'assets/bagikan.js'));
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const site = read('content/site.json'), works = read('content/works.json');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FONTS = 'https://fonts.googleapis.com/css2?family=Doto:wght@900&family=Geist:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap';
const card = inner => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
  *{box-sizing:border-box}p,h1{margin:0}html,body{margin:0;width:1200px;height:630px;background:#0e0f11;color:#f4f3ef;overflow:hidden}
  .c{position:relative;width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column}
  .brand{font:900 30px/1 Doto,monospace;letter-spacing:.02em}
  .kind{margin-top:auto;font:500 22px/1.2 Geist,sans-serif;color:#9a9a9f;letter-spacing:.08em;text-transform:uppercase}
  .title{margin:14px 0 0;font:400 84px/1.02 'Instrument Serif',Georgia,serif;letter-spacing:-.01em;max-width:1000px}
  .desc{margin:22px 0 0;font:400 26px/1.4 Geist,sans-serif;color:#b9b8b2;max-width:960px;flex:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .foot{margin-top:38px;display:flex;justify-content:space-between;font:500 20px Geist,sans-serif;color:#8d8c87}
  .bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:var(--ink,#2f5bff)}
  .big{margin-top:auto;font:900 118px/.95 Doto,monospace;letter-spacing:.01em}
  .lede{margin:24px 0 0;font:italic 400 36px/1.25 'Instrument Serif',Georgia,serif;color:#cfcdc6;max-width:980px;flex:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
</style></head><body><div class="c">${inner}</div></body></html>`;
const date = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const host = JMShare.baseOf(site).replace(/^https?:\/\//, '');
const cats = Object.fromEntries((site.categories || []).map(c => [c.id, c]));

(async () => {
  const noImages = process.argv.includes('--tanpa-gambar');
  const list = JMShare.published(works);
  if (!noImages) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    const shot = async (html, file) => { await page.setContent(html, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(ROOT, 'assets/og', file) }); };
    await shot(card(`<p class="brand" style="color:#9a9a9f">${esc(site.author || 'Juan')}</p><p class="big">${esc(String(site.title || 'Quiet Margins').toUpperCase()).replace(' ', '<br>')}</p><p class="lede">${esc(site.description || '')}</p><div class="foot"><span>${esc(host)}</span><span>ID · EN</span></div>`), 'cover.png');
    for (const w of list) {
      const c = cats[w.cat] || {}, ink = /^#[0-9a-f]{6}$/i.test(c.ink || '') && c.ink.toLowerCase() !== '#0f060b' && c.ink.toLowerCase() !== '#111214' ? c.ink : '#f4f3ef';
      await shot(card(`<span class="bar" style="--ink:${ink}"></span><p class="brand">${esc(String(site.title || 'Quiet Margins').toUpperCase())}</p><p class="kind">${esc(c.label || w.cat || '')}</p><h1 class="title">${esc(w.title)}</h1><p class="desc">${esc(JMShare.describe(w))}</p><div class="foot"><span>${esc(site.author || 'Juan')}${w.date ? ' · ' + esc(date(w.date)) : ''}</span><span>${esc(host)}</span></div>`), `${w.slug}.png`);
    }
    await browser.close();
  }
  const images = new Set(fs.existsSync(path.join(ROOT, 'assets/og')) ? fs.readdirSync(path.join(ROOT, 'assets/og')) : []);
  const existing = fs.existsSync(path.join(ROOT, 'baca')) ? fs.readdirSync(path.join(ROOT, 'baca')).filter(d => fs.statSync(path.join(ROOT, 'baca', d)).isDirectory()) : [];
  const { write, remove } = JMShare.files(site, works, images, existing);
  for (const f of write) { fs.mkdirSync(path.dirname(path.join(ROOT, f.path)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f.path), f.content); }
  for (const f of remove) fs.rmSync(path.join(ROOT, path.dirname(f)), { recursive: true, force: true });
  console.log(`${write.length - 1} halaman bagikan, sitemap.xml${noImages ? '' : `, ${list.length + 1} gambar kartu`}${remove.length ? `, ${remove.length} dihapus` : ''}.`);
})();
