/*
 * Service worker: situs bisa dipasang dan dibaca tanpa sinyal.
 * - Halaman, kode, dan konten: ambil dari jaringan dulu (supaya tulisan baru langsung tampil),
 *   pakai salinan tersimpan kalau offline atau jaringan lambat.
 * - Ikon, gambar, dan huruf: pakai salinan tersimpan dulu.
 * - Panel admin dan GitHub API tidak pernah disimpan.
 */
const VERSION = 'v38';
const SHELL = 'jm-shell-' + VERSION;
const RUNTIME = 'jm-runtime-' + VERSION;
const SHELL_FILES = [
  './', 'index.html', 'assets/style.css', 'assets/i18n.js', 'assets/app.js', 'manifest.webmanifest',
  'content/site.json', 'content/works.json', 'content/albums.json',
  'antologi/anda-di-sini/', 'antologi/anda-di-sini/index.html', 'antologi/anda-di-sini/peta.css', 'antologi/anda-di-sini/peta.js', 'antologi/interlude/', 'antologi/interlude/index.html', 'antologi/interlude/interlude.css', 'antologi/interlude/ambience.js', 'antologi/interlude/interlude.js',
  'antologi/terlambat-satu-menit/', 'antologi/terlambat-satu-menit/index.html', 'antologi/terlambat-satu-menit/minute.css', 'antologi/terlambat-satu-menit/minute.js', 'antologi/terlambat-satu-menit/sound.js', 'antologi/terlambat-satu-menit/track.js',
  'antologi/pabrik-mimpi/', 'antologi/pabrik-mimpi/index.html', 'antologi/pabrik-mimpi/mimpi.css', 'antologi/pabrik-mimpi/mimpi.js', 'antologi/pabrik-mimpi/kalender.js',
  'antologi/the-moon-behind-my-eyes/', 'antologi/the-moon-behind-my-eyes/index.html', 'antologi/the-moon-behind-my-eyes/moon.css', 'antologi/the-moon-behind-my-eyes/moon.js',
  'antologi/trillions-of-seconds/', 'antologi/trillions-of-seconds/index.html', 'antologi/trillions-of-seconds/seconds.css', 'antologi/trillions-of-seconds/seconds.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, RUNTIME];
    for (const k of await caches.keys()) if (k.startsWith('jm-') && !keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const scope = new URL(self.registration.scope);
const timeout = (ms, p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('lambat')), ms))]);

async function networkFirst(req, cacheKey) {
  const cache = await caches.open(RUNTIME);
  try {
    // no-cache: selalu tanya server dulu (ETag), supaya cache HTTP GitHub Pages tidak menahan versi lama.
    const res = await timeout(4000, fetch(req, { cache: 'no-cache' }));
    if (res.ok) cache.put(cacheKey || req, res.clone());
    return res;
  } catch (err) {
    const hit = (await caches.match(cacheKey || req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
    throw err;
  }
}
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') (await caches.open(RUNTIME)).put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(req)); return; }
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  const path = url.pathname.slice(scope.pathname.length);
  if (path.startsWith('admin/')) return;
  if (url.searchParams.has('preview') || url.searchParams.has('tata')) return;

  if (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(path)) { e.respondWith(cacheFirst(req)); return; }
  // konten diminta dengan cache: 'no-cache'; simpan tanpa query supaya bisa dipakai offline
  if (path.startsWith('content/')) { e.respondWith(networkFirst(req, url.origin + url.pathname)); return; }
  e.respondWith(networkFirst(req));
});
