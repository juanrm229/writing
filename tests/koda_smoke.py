"""Browser checks for the Koda anthology: python3 tests/koda_smoke.py.
Two short stories with the anthology's own cover; both can be read in the plain reader.
Uses the cloud environment's Python Playwright and system Chromium. No external assets are needed.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SLUGS = ['kepala-yang-dingin-kota-yang-hangat', 'di-dasar-rumah']


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class KodaSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.works = {w['slug']: w for w in json.loads((ROOT / 'content/works.json').read_text())}

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

    def test_the_anthology_holds_both_stories_in_order(self):
        albums = json.loads((ROOT / 'content/albums.json').read_text())
        koda = next(a for a in albums if a['id'] == 'koda')
        self.assertEqual(koda['kind'], 'antologi')
        self.assertEqual(koda['tracks'], SLUGS)
        for slug in SLUGS:
            w = self.works[slug]
            self.assertEqual(w['cat'], 'cerpen')
            self.assertFalse(w.get('draft'))
            self.assertTrue((ROOT / 'baca' / slug / 'index.html').exists())
            self.assertTrue((ROOT / 'assets/og' / f'{slug}.png').exists())
        self.assertEqual(self.works[SLUGS[0]]['en']['title'], 'A Cold Head, A Warm City')
        self.assertNotIn('experience', self.works[SLUGS[0]])
        self.assertEqual(self.works[SLUGS[1]]['experience'], 'antologi/di-dasar-rumah/index.html')
        # the two stories keep each other's things
        self.assertIn('nama sungai yang diberikan seorang anak agar nyalanya tidak padam', ' '.join(self.works[SLUGS[0]]['body']))
        self.assertIn('laut yang disembunyikan di bawah kota', ' '.join(self.works[SLUGS[1]]['body']))

    def test_both_read_as_plain_text(self):
        # Di Dasar Rumah has its own experience; in plain mode both are read as text
        self.context.add_init_script("localStorage.setItem('jm:mode', JSON.stringify('biasa'))")
        for slug, first, last in [(SLUGS[0], 'Orang memanggilnya Sang Mahkota.', 'Botak.'), (SLUGS[1], 'Rumah kembali besar.', 'Dengar bagaimana ia berdetak.')]:
            self.page.goto(self.root + '#baca-' + slug, wait_until='domcontentloaded')
            self.page.wait_for_function("document.getElementById('rdBody')?.innerText.length > 2000")
            text = self.page.locator('#rdBody').inner_text()
            self.assertIn(first, text)
            self.assertIn(last, text)
            if slug == SLUGS[0]:
                self.assertTrue(self.page.locator('#rdIx').is_hidden())
            else:
                self.assertIn('/antologi/di-dasar-rumah/', self.page.locator('#rdIx').get_attribute('href'))

    def test_the_cover_is_not_the_blue_dot(self):
        self.page.goto(self.root + '#album-koda', wait_until='domcontentloaded')
        self.page.wait_for_selector('canvas[data-cover="koda"]')
        self.page.wait_for_timeout(400)
        px = self.page.evaluate("""() => { const c = document.querySelector('canvas[data-cover="koda"]'), x = c.getContext('2d');
          const at = (fx, fy) => [...x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data];
          return { corner: at(.05, .05), flame: at(.5, .66) }; }""")
        self.assertLess(sum(px['corner'][:3]), 120)
        self.assertGreater(px['flame'][0], 200)
        self.assertGreater(px['flame'][0], px['flame'][2] + 60)


if __name__ == '__main__':
    unittest.main(verbosity=2)
