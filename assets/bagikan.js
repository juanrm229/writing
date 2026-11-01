/* Halaman bagikan: satu halaman HTML kecil untuk setiap tulisan di /baca/<alamat>/, berisi judul, kutipan,
   dan gambar kartu untuk pratinjau tautan (WhatsApp, X, Facebook, Telegram, mesin pencari), lalu langsung
   meneruskan pembaca ke tulisannya. Ditambah sitemap.xml.
   Dipakai bersama oleh admin (saat menyimpan) dan tools/bagikan.js (dari baris perintah), jadi hasilnya selalu sama. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JMShare = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = s => String(s || '').replace(/\*\*?|~~|^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
  const clip = (s, n) => { s = plain(s); if (s.length <= n) return s; const cut = s.slice(0, n); return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20)).replace(/[,;:—–-]$/, '') + '…'; };
  const DEFAULT_URL = 'https://quietmargins.site';
  const baseOf = site => String((site && site.url) || DEFAULT_URL).replace(/\/+$/, '');
  const bodyOf = w => Array.isArray(w.body) && w.body.length ? w.body : Array.isArray(w.chapters) ? w.chapters.flatMap(c => c.body || []) : [];
  const describe = w => clip(w.excerpt || w.summary || bodyOf(w).join(' '), 180);
  const published = works => (Array.isArray(works) ? works : []).filter(w => w && w.slug && !w.draft && (bodyOf(w).length || w.experience));
  const CAT = { esai: 'Esai', puisi: 'Puisi', cerpen: 'Cerpen', mini: 'Fiksi mini', novel: 'Novel', novella: 'Novella', catatan: 'Catatan' };

  // Gambar kartu: per tulisan kalau ada (assets/og/<alamat>.png), selain itu kartu situs.
  const imageOf = (w, images) => (images && images.has && images.has(w.slug + '.png')) ? `assets/og/${w.slug}.png` : 'assets/og/cover.png';

  function page(site, w, images) {
    const base = baseOf(site), url = `${base}/baca/${w.slug}/`, siteTitle = (site && site.title) || 'Quiet Margins', author = (site && site.author) || 'Juan';
    const title = w.title || w.slug, desc = describe(w), img = `${base}/${imageOf(w, images)}`;
    const lang = w.lang === 'en' ? 'en' : 'id', kind = CAT[w.cat] || '';
    const ld = { '@context': 'https://schema.org', '@type': 'CreativeWork', headline: title, name: title, description: desc, url, image: img, inLanguage: lang, author: { '@type': 'Person', name: author }, publisher: { '@type': 'Organization', name: siteTitle, url: base + '/' }, ...(w.date ? { datePublished: w.date } : {}), ...(kind ? { genre: kind } : {}) };
    const target = `../../#baca-${w.slug}`;
    return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(siteTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(siteTitle)}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'id_ID'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)} · ${esc(siteTitle)}">
<meta property="article:author" content="${esc(author)}">
${w.date ? `<meta property="article:published_time" content="${esc(w.date)}">\n` : ''}${kind ? `<meta property="article:section" content="${esc(kind)}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="theme-color" content="#0e0f11">
<link rel="icon" type="image/png" href="../../assets/icons/favicon.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>location.replace(${JSON.stringify('../../')} + location.search + ${JSON.stringify('#baca-' + w.slug)} + location.hash.slice(1));</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0f11;color:#f2f2f2;font:16px/1.5 system-ui,sans-serif}a{color:inherit}</style>
</head>
<body>
<p><a href="${esc(target)}">${esc(title)}</a> · ${esc(siteTitle)}</p>
</body>
</html>
`;
  }

  function sitemap(site, works) {
    const base = baseOf(site), today = new Date().toISOString().slice(0, 10);
    const urls = [{ loc: base + '/', lastmod: today, priority: '1.0' }];
    published(works).forEach(w => urls.push({ loc: `${base}/baca/${w.slug}/`, lastmod: w.date || today, priority: '0.8' }));
    const exp = new Set(published(works).map(w => String(w.experience || '').split('#')[0]).filter(Boolean));
    exp.forEach(p => urls.push({ loc: `${base}/${p.replace(/index\.html$/, '')}`, lastmod: today, priority: '0.6' }));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${esc(u.lastmod)}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  }

  // Semua berkas yang perlu ditulis, plus halaman lama yang perlu dihapus (tulisan yang sudah tidak ada atau jadi draf).
  function files(site, works, images, existingSlugs) {
    const list = published(works), out = list.map(w => ({ path: `baca/${w.slug}/index.html`, content: page(site, w, images) }));
    out.push({ path: 'sitemap.xml', content: sitemap(site, works) });
    const keep = new Set(list.map(w => w.slug));
    const remove = (existingSlugs || []).filter(s => !keep.has(s)).map(s => `baca/${s}/index.html`);
    return { write: out, remove };
  }

  return { page, sitemap, files, describe, baseOf, published };
});
