"""Browser checks for the reading mode (interactive or plain text): python3 tests/mode_smoke.py.

Pieces with an interactive experience carry an "Interaktif" badge. The reader chooses, in the record picker,
whether they open in their experience or as plain text; every experience can also jump to the plain text once.
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
GUIDES = ['arsip', 'the-room', 'the-moon-behind-my-eyes', 'trillions-of-seconds', 'anda-di-sini', 'interlude', 'terlambat-satu-menit', 'pabrik-mimpi']
SEEN = "try { %s } catch (e) {}" % ' '.join(f"localStorage.setItem('jm:guide:{g}', '1');" for g in GUIDES)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class ModeSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        works = json.loads((ROOT / 'content/works.json').read_text())
        cls.interactive = [w['slug'] for w in works if w.get('experience') and not w.get('draft')]

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.context.add_init_script(SEEN)
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def reader(self, slug):
        self.page.goto(self.root + '#baca-' + slug, wait_until='domcontentloaded')

    def test_interactive_pieces_open_their_experience_by_default(self):
        self.reader('the-room')
        self.page.wait_for_url('**/antologi/the-room/**')

    def test_plain_mode_shows_every_interactive_piece_as_text_with_a_way_back(self):
        self.context.add_init_script("localStorage.setItem('jm:mode', JSON.stringify('biasa'))")
        self.assertGreaterEqual(len(self.interactive), 8)
        for slug in self.interactive:
            with self.subTest(slug=slug):
                self.reader(slug)
                self.page.wait_for_function("document.getElementById('rdBody').innerText.length > 200")
                self.assertEqual(self.page.evaluate('location.pathname'), '/')
                card = self.page.locator('#rdIx')
                self.assertTrue(card.is_visible())
                self.assertIn('/antologi/', card.get_attribute('href'))
                self.assertEqual(self.page.locator('#rdMeta .ix').count(), 1)
        # non-interactive pieces have neither the card nor the badge
        self.reader('di-dasar-rumah')
        self.page.wait_for_function("document.getElementById('rdBody').innerText.length > 200")
        self.assertTrue(self.page.locator('#rdIx').is_hidden())
        self.assertEqual(self.page.locator('#rdMeta .ix').count(), 0)

    def test_picker_switch_is_remembered(self):
        self.page.goto(self.root + '#pilih-the-room', wait_until='domcontentloaded')
        self.page.goto(self.root + '#pilih', wait_until='domcontentloaded')
        mode = self.page.locator('#pkMode')
        self.page.wait_for_function("!document.getElementById('pkMode').hidden || document.getElementById('pkTitle').textContent.length > 0")
        if mode.is_hidden():
            self.skipTest('the first record in the picker is not interactive')
        self.assertEqual(mode.get_attribute('aria-pressed'), 'true')
        mode.click()
        self.assertEqual(mode.get_attribute('aria-pressed'), 'false')
        self.assertEqual(self.page.evaluate("localStorage.getItem('jm:mode')"), '"biasa"')
        self.page.locator('#pkGo').click()
        self.page.wait_for_function("location.hash.startsWith('#baca-') && document.getElementById('rdBody').innerText.length > 200")
        self.assertEqual(self.page.evaluate('location.pathname'), '/')

    def test_plain_text_from_inside_an_experience_then_back(self):
        self.page.goto(self.root + 'antologi/interlude/', wait_until='domcontentloaded')
        self.page.wait_for_selector('.qm-cluster .jm-help')
        self.page.locator('#openSettings').click()
        link = self.page.locator('#plainLink')
        self.assertTrue(link.is_visible())
        link.click()
        self.page.wait_for_function("location.pathname === '/' && document.getElementById('rdBody').innerText.length > 200")
        self.assertEqual(self.page.evaluate("JSON.parse(sessionStorage.getItem('jm:plain'))"), ['interlude'])
        # the global choice is untouched; the card goes back to the experience
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:mode')"))
        self.page.locator('#rdIx').click()
        self.page.wait_for_url('**/antologi/interlude/**')

    def test_every_experience_offers_plain_text(self):
        for path, work in [('anda-di-sini/', 'anda-di-sini'), ('the-room/', 'the-room'), ('pabrik-mimpi/', 'pabrik-mimpi'), ('terlambat-satu-menit/#c', 'terlambat-satu-menit:c'), ('arsip/index.html#thought-log-001-the-cartesian-void', 'thought-log-001-the-cartesian-void')]:
            with self.subTest(path=path):
                self.page.goto(self.root + 'antologi/' + path, wait_until='domcontentloaded')
                self.page.wait_for_selector('.qm-cluster .jm-help')
                self.page.wait_for_timeout(300)
                self.page.locator('#openSettings').click()
                self.assertTrue(self.page.locator('#plainLink').get_attribute('href').endswith('#baca-' + work))
                self.page.keyboard.press('Escape')

    def test_badges_in_lists(self):
        self.page.goto(self.root + '#putar', wait_until='domcontentloaded')
        self.page.wait_for_selector('#tsSumT')
        html = self.page.evaluate("document.body.innerHTML")
        self.assertIn('class="ix"', html)


if __name__ == '__main__':
    unittest.main(verbosity=2)
