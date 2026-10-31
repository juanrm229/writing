"""Browser checks for Trillions of Seconds: python3 tests/seconds_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SLUG = 'trillions-of-seconds'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class SecondsSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + f'antologi/{SLUG}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == SLUG)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self, motion='reduce'):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion=motion, service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def moving(self):
        """Konteks baru dengan gerak aktif (tanpa reduced motion)."""
        self.context.close(); self.setUp(motion='no-preference')

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def read(self, s, l):
        """Gulir sampai baris s/l melewati garis baca."""
        self.page.evaluate('''([s, l]) => { const el = document.getElementById(`l-${s}-${l}`); scrollBy(0, el.getBoundingClientRect().bottom - innerHeight * .5 + 2); dispatchEvent(new Event('scroll')); }''', [s, l])
        self.page.wait_for_timeout(120)

    def lines(self):
        return [line.replace('*', '') for p in self.work['body'] for line in p.split('\n') if line.strip()]

    def attr(self, name):
        return self.page.evaluate('(n) => document.documentElement.getAttribute(n)', name)

    def find(self, marker):
        for s, p in enumerate(self.work['body']):
            for l, line in enumerate(p.split('\n')):
                if marker in line:
                    return s, l
        raise AssertionError(marker)

    # Naskah

    def test_every_line_is_present_and_untranslated_note_shows(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}')
                self.assertEqual(self.page.locator('.line').all_text_contents(), self.lines())
                self.assertEqual(self.page.locator('#lost').is_visible(), lang == 'id')
                self.assertEqual(self.page.title(), 'Trillions of Seconds · Quiet Margins')

    def test_main_site_opens_the_sea(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    # Laut

    def test_the_speck_can_be_steered(self):
        self.open('#baca-0')
        start = self.page.evaluate('__seconds.speck()')
        for _ in range(4):
            self.page.keyboard.press('ArrowRight')
        self.page.wait_for_timeout(100)
        self.assertGreater(self.page.evaluate('__seconds.speck()'), start + .2)
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-steered')"))

    def test_seconds_tick_and_stop_with_the_last_line(self):
        self.open('#baca-3')
        self.page.wait_for_function("+document.documentElement.dataset.elapsed >= 2", timeout=4000)
        self.read(*self.find('I stopped thinking'))
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-still')"))
        frozen = self.page.locator('#elapsed').inner_text()
        self.page.wait_for_timeout(1600)
        self.assertEqual(self.page.locator('#elapsed').inner_text(), frozen)
        self.page.wait_for_function(f"(JSON.parse(localStorage.getItem('jm:stats') || '{{}}').done || []).includes('{SLUG}')")
        self.read(3, 0)
        self.assertFalse(self.page.evaluate("document.documentElement.hasAttribute('data-still')"))

    def test_birth_year_counts_the_readers_own_seconds(self):
        self.open('#baca-3')
        self.page.locator('#born').fill('2000')
        self.assertIn('31.', self.page.locator('#lived').inner_text())
        self.assertEqual(self.page.evaluate("localStorage.getItem('jm:seconds:born')"), '2000')
        self.page.locator('#born').fill('20')
        self.assertEqual(self.page.locator('#lived').inner_text(), '')

    def test_the_entity_replays_the_readers_own_path(self):
        self.open('#baca-0')
        for key in ['ArrowRight'] * 5 + ['ArrowLeft'] * 9:
            self.page.keyboard.press(key); self.page.wait_for_timeout(110)
        self.read(*self.find('I encountered an entity'))
        ghost = self.page.evaluate('(() => { const g = __seconds.ghostAt(); return g && { x: g.x, trail: g.trail.map(p => p[0]) }; })()')
        self.assertIsNotNone(ghost)
        path = self.page.evaluate('__seconds.path.map(x => __seconds.toPx(x))')
        self.assertTrue(set(round(x, 3) for x in ghost['trail']) <= set(round(x, 3) for x in path))
        self.assertGreater(len(set(round(x) for x in ghost['trail'])), 2)
        s, l = self.find('he drifted past')
        self.read(s, l)
        self.assertIn('100%', self.page.locator('#readout').inner_text())
        # kembali sebelum pertemuan: entitas itu belum datang
        self.read(2, 0)
        self.assertIsNone(self.page.evaluate('__seconds.ghostAt()'))
        self.assertTrue(self.page.locator('#readout').is_hidden())

    # Umum

    def test_bookmark_and_language_switch(self):
        self.open('#baca-2')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:seconds:places')).id.s"), 2)
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#baca-2')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#counterLabel').inner_text(), 'thinking')
        self.open()
        self.assertTrue(self.page.locator('#resume').is_visible())

    def test_layout_fits_every_screen(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-3', '#baca-6']:
                with self.subTest(width=width, fragment=fragment):
                    self.page.set_viewport_size({'width': width, 'height': 800})
                    self.open(fragment)
                    self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#motion').is_disabled())
                    self.page.keyboard.press('Escape')
                    self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openSettings')

    def test_preview_does_not_write_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#baca-3')
        self.page.locator('#born').fill('1990')
        self.read(*self.find('I stopped thinking'))
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'seconds:places', 'seconds:born']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.documentElement).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.documentElement).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
