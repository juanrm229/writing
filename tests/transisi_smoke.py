"""Browser checks for switching between views on a phone: python3 tests/transisi_smoke.py.

Switching views must not use View Transitions (their snapshot showed a blank screen on iPhone Safari and
slid the new page in from the right). The new view fades up in place instead, and the home panels do not
replay their opening animation on every switch.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import functools
import http.server
from pathlib import Path
import re
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
COUNT_VT = """
window.__vt = 0;
if (document.startViewTransition) { const vt = document.startViewTransition.bind(document); document.startViewTransition = cb => { window.__vt++; return vt(cb); }; }
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class TransisiSmoke(unittest.TestCase):
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
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block')
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.context.add_init_script(COUNT_VT)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def entering(self, sel):
        return self.page.evaluate(f"(document.querySelector({sel!r}).getAnimations() || []).filter(a => a.id === 'enter').length")

    def test_views_fade_up_in_place_without_view_transitions(self):
        page = self.page
        page.goto(self.root + '#katalog')
        page.wait_for_function("document.querySelector('.win').classList.contains('settled')", timeout=5000)
        self.assertEqual(page.evaluate("getComputedStyle(document.querySelector('.views')).viewTransitionName"), 'none')
        for go, view in [('putar', '.view-putar'), ('album', '.view-album'), ('tentang', '.view-tentang'), ('katalog', '.view-katalog')]:
            with self.subTest(go):
                page.click(f'.pill [data-go="{go}"]')
                page.wait_for_function(f"document.querySelector('.win').dataset.view === {go!r}")
                self.assertEqual(self.entering(view), 1)
                # tampilan baru tidak bergeser ke samping: hanya naik sedikit lalu diam di tempat
                x = page.evaluate(f"document.querySelector({view!r}).getBoundingClientRect().left")
                self.assertEqual(round(x), 0)
                page.wait_for_timeout(450)
                self.assertEqual(self.entering(view), 0)
        self.assertEqual(page.evaluate('window.__vt'), 0)

    def test_home_panels_do_not_replay_their_opening(self):
        page = self.page
        page.goto(self.root)
        page.wait_for_function("document.querySelector('.win').classList.contains('settled')", timeout=5000)
        page.click('.pill [data-go="album"]')
        page.wait_for_function("document.querySelector('.win').dataset.view === 'album'")
        page.click('.pill [data-go="putar"]')
        page.wait_for_function("document.querySelector('.win').dataset.view === 'putar'")
        self.assertEqual(page.evaluate("getComputedStyle(document.querySelector('.turn-hero')).animationName"), 'none')

    def test_reader_and_back(self):
        page = self.page
        page.goto(self.root + '#pilih-paid-in-full')
        page.wait_for_function("document.querySelector('.win').classList.contains('settled')", timeout=5000)
        page.click('#pkGo')
        page.wait_for_function("document.querySelector('.win').dataset.view === 'baca'", timeout=4000)
        self.assertEqual(self.entering('.view-baca'), 1)
        page.wait_for_timeout(450)
        page.click('#rdBack')
        page.wait_for_function("document.querySelector('.win').dataset.view === 'pilih'")
        self.assertEqual(self.entering('.view-pilih'), 1)
        self.assertEqual(page.evaluate('window.__vt'), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
