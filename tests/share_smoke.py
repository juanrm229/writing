"""Checks for share pages, SEO metadata, the 404 page, and background music: python3 tests/share_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import functools
import http.server
import json
from pathlib import Path
import re
import subprocess
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://quietmargins.site'


class Handler(http.server.SimpleHTTPRequestHandler):
    """Seperti GitHub Pages: alamat yang tidak ada dijawab dengan 404.html."""
    def log_message(self, *_):
        pass

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            body = (ROOT / '404.html').read_bytes()
            self.send_response(404); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(body))); self.end_headers()
            self.wfile.write(body); return
        super().send_error(code, message, explain)

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def published():
    works = json.loads((ROOT / 'content/works.json').read_text())
    return [w for w in works if w.get('slug') and not w.get('draft')]


class ShareSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def meta(self, html, prop):
        m = re.search(r'<meta (?:property|name)="' + re.escape(prop) + r'" content="([^"]*)"', html)
        return m and m.group(1)

    # Berkas statis

    def test_every_published_work_has_a_share_page_with_a_card(self):
        for w in published():
            with self.subTest(slug=w['slug']):
                html = (ROOT / 'baca' / w['slug'] / 'index.html').read_text()
                self.assertEqual(self.meta(html, 'og:title'), w['title'].replace('&', '&amp;').replace('"', '&quot;').replace("'", '&#39;'))
                self.assertEqual(self.meta(html, 'og:url'), f"{BASE}/baca/{w['slug']}/")
                self.assertEqual(self.meta(html, 'twitter:card'), 'summary_large_image')
                image = self.meta(html, 'og:image')
                self.assertTrue(image.startswith(BASE + '/assets/og/'))
                self.assertTrue((ROOT / image[len(BASE) + 1:]).exists(), image)
                self.assertGreater(len(self.meta(html, 'og:description')), 40)
                json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html).group(1))

    def test_share_pages_match_the_shared_generator(self):
        out = subprocess.run(['node', '-e', '''
          const S = require('./assets/bagikan.js'), fs = require('fs');
          const site = JSON.parse(fs.readFileSync('content/site.json')), works = JSON.parse(fs.readFileSync('content/works.json'));
          const images = new Set(fs.readdirSync('assets/og'));
          const { write } = S.files(site, works, images, []);
          const bad = write.filter(f => f.path !== 'sitemap.xml' && fs.readFileSync(f.path, 'utf8') !== f.content).map(f => f.path);
          console.log(JSON.stringify(bad));'''], cwd=ROOT, capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(out.stdout), [], 'jalankan: node tools/bagikan.js --tanpa-gambar')

    def test_sitemap_robots_and_home_metadata(self):
        sitemap = (ROOT / 'sitemap.xml').read_text()
        for w in published():
            self.assertIn(f"<loc>{BASE}/baca/{w['slug']}/</loc>", sitemap)
        self.assertIn(f'<loc>{BASE}/</loc>', sitemap)
        self.assertIn(f'Sitemap: {BASE}/sitemap.xml', (ROOT / 'robots.txt').read_text())
        self.assertIn('Disallow: /admin/', (ROOT / 'robots.txt').read_text())
        home = (ROOT / 'index.html').read_text()
        self.assertEqual(self.meta(home, 'og:image'), f'{BASE}/assets/og/cover.png')
        self.assertIn(f'<link rel="canonical" href="{BASE}/">', home)
        json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', home).group(1))
        for page in ROOT.glob('antologi/*/index.html'):
            with self.subTest(page=page.parent.name):
                html = page.read_text()
                self.assertTrue(self.meta(html, 'og:image').startswith(BASE + '/assets/og/'))
                self.assertEqual(self.meta(html, 'twitter:card'), 'summary_large_image')

    # Di peramban

    def test_share_page_forwards_to_the_work_and_its_side(self):
        self.page.goto(self.root + 'baca/the-room/')
        self.page.wait_for_url('**/antologi/the-room/index.html')
        self.page.goto(self.root + 'baca/di-waktu-yang-tepat/#:b')
        self.page.wait_for_function("location.hash.startsWith('#baca-di-waktu-yang-tepat:b')")

    def test_missing_share_page_still_forwards_and_other_paths_get_404(self):
        self.page.goto(self.root + 'baca/the-moon-behind-my-eyes-belum-ada/')
        self.page.wait_for_function("location.hash === '#baca-the-moon-behind-my-eyes-belum-ada'")
        response = self.page.goto(self.root + 'tidak/ada/')
        self.assertEqual(response.status, 404)
        self.assertIn('404', self.page.locator('.code').inner_text())

    def test_reader_share_button_uses_the_share_page(self):
        self.context.add_init_script("navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }")
        self.page.goto(self.root + '#baca-di-waktu-yang-tepat:b')
        self.page.wait_for_function("document.querySelector('#rdShare')")
        self.page.wait_for_timeout(800)
        self.page.locator('#rdShare').click()
        self.page.wait_for_function('window.__shared')
        self.assertTrue(self.page.evaluate('window.__shared.url').endswith('/baca/di-waktu-yang-tepat/#:b'))

    def test_music_starts_after_a_touch_and_remembers_being_off(self):
        site = json.loads((ROOT / 'content/site.json').read_text())
        self.page.goto(self.root)
        self.page.wait_for_timeout(800)
        if not site.get('music'):
            self.assertTrue(self.page.locator('#musicToggle').is_hidden())
        # dengan musik (berkas suara kecil buatan tes)
        site['music'] = {'src': 'tests-music.wav', 'title': 'Uji'}
        self.context.route('**/content/site.json', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(site)))
        import io, struct, math, wave
        buf = io.BytesIO(); w = wave.open(buf, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000)
        w.writeframes(b''.join(struct.pack('<h', int(2000 * math.sin(i / 8000 * 2 * math.pi * 440))) for i in range(16000))); w.close()
        self.context.route('**/tests-music.wav', lambda r: r.fulfill(status=200, content_type='audio/wav', body=buf.getvalue()))
        self.page.goto(self.root)
        self.page.wait_for_timeout(800)
        button = self.page.locator('#musicToggle')
        self.assertTrue(button.is_visible())
        self.assertEqual(button.get_attribute('aria-pressed'), 'false')
        self.page.mouse.click(200, 420)
        self.page.wait_for_function("document.querySelector('#musicToggle').getAttribute('aria-pressed') === 'true'")
        button.click()
        self.page.wait_for_function("document.querySelector('#musicToggle').getAttribute('aria-pressed') === 'false'")
        self.assertEqual(self.page.evaluate("localStorage.getItem('jm:music')"), 'false')
        self.page.reload(); self.page.wait_for_timeout(800); self.page.mouse.click(200, 420); self.page.wait_for_timeout(500)
        self.assertEqual(button.get_attribute('aria-pressed'), 'false')


if __name__ == '__main__':
    unittest.main(verbosity=2)
