"""Browser checks for the shared frame around every interactive experience: python3 tests/bingkai_smoke.py.

Every experience keeps its own in-world app, but the parts that belong to the site are the same everywhere:
one "Meja tulis" exit pill, the ? and Aa buttons, the reading settings dialog, and a theme that follows the site.
Uses the cloud environment's Python Playwright and system Chromium. No external assets are needed.
"""
import functools
import http.server
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PAGES = ['anda-di-sini', 'interlude', 'terlambat-satu-menit', 'pabrik-mimpi', 'arsip', 'the-room', 'trillions-of-seconds', 'the-moon-behind-my-eyes', 'giliran']
SEEN = "try { %s } catch (e) {}" % ' '.join(f"localStorage.setItem('jm:guide:{p}', '1');" for p in PAGES)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class BingkaiSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/antologi/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def context(self, width=390, scheme='light', seen=True):
        ctx = self.browser.new_context(viewport={'width': width, 'height': 820}, color_scheme=scheme, reduced_motion='reduce', service_workers='block')
        ctx.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        if seen:
            ctx.add_init_script(SEEN)
        self.addCleanup(ctx.close)
        page = ctx.new_page(); page.set_default_timeout(8000)
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        return page, errors

    def open(self, page, slug, query=''):
        page.goto(self.root + slug + '/' + query, wait_until='domcontentloaded')
        page.wait_for_selector('.qm-cluster .jm-help')

    def test_every_experience_has_the_same_exit_and_buttons(self):
        for width in [320, 390, 1280]:
            page, errors = self.context(width)
            for slug in PAGES:
                with self.subTest(width=width, slug=slug):
                    self.open(page, slug)
                    back = page.locator('.qm-back')
                    self.assertEqual(back.count(), 1)
                    self.assertEqual(back.inner_text().strip(), 'Meja tulis')
                    self.assertEqual(back.get_attribute('href'), '../../#putar')
                    self.assertEqual(back.get_attribute('aria-label'), 'Kembali ke meja tulis')
                    box = back.bounding_box()
                    self.assertTrue(box and box['y'] >= 0 and box['y'] + box['height'] <= 70 and box['height'] == 38, box)
                    self.assertEqual(page.locator('.qm-cluster #openSettings').count(), 1)
                    self.assertEqual(page.locator('.qm-cluster .jm-help').count(), 1)
                    # nothing covers the three buttons, and the page never scrolls sideways
                    for sel in ['.qm-back', '#openSettings', '.qm-cluster .jm-help']:
                        hit = page.locator(sel).evaluate('(el) => { const r = el.getBoundingClientRect(); const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!h && (h === el || el.contains(h)); }')
                        self.assertTrue(hit, sel)
                    self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
            self.assertEqual(errors, [])

    def test_settings_dialog_opens_from_aa_everywhere(self):
        page, _ = self.context()
        for slug in PAGES:
            with self.subTest(slug=slug):
                self.open(page, slug)
                page.locator('#openSettings').click()
                self.assertTrue(page.locator('#settingsDialog').is_visible())
                self.assertEqual(page.locator('#settingsDialog #bigger').count(), 1)
                self.assertEqual(page.locator('#settingsDialog #theme').count(), 1)
                page.keyboard.press('Escape')
                self.assertFalse(page.locator('#settingsDialog').is_visible())

    def test_english_label(self):
        page, _ = self.context()
        for slug in PAGES:
            with self.subTest(slug=slug):
                self.open(page, slug, '?lang=en')
                self.assertEqual(page.locator('.qm-back').inner_text().strip(), 'Writing desk')

    def test_interlude_and_anda_di_sini_follow_the_site_theme(self):
        for slug in ['interlude', 'anda-di-sini', 'giliran']:
            with self.subTest(slug=slug):
                light, _ = self.context(scheme='light')
                self.open(light, slug)
                dark, _ = self.context(scheme='dark')
                self.open(dark, slug)
                bg = lambda p: p.evaluate('getComputedStyle(document.body).backgroundColor')
                self.assertNotEqual(bg(light), bg(dark))
                # theme-color follows the page, not a fixed colour
                self.assertEqual(dark.evaluate("document.querySelector('meta[name=theme-color]').content"), bg(dark))
                # the switch in Aa writes the same jm:theme as the main site
                light.locator('#openSettings').click(); light.locator('#theme').click()
                self.assertEqual(light.evaluate("localStorage.getItem('jm:theme')"), '"dark"')
                self.assertEqual(light.evaluate("document.documentElement.dataset.theme"), 'dark')
                self.assertEqual(light.evaluate("document.querySelector('meta[name=theme-color]').content"), bg(light))

    def test_reading_font_from_the_main_site_carries_over(self):
        page, _ = self.context()
        page.context.add_init_script("localStorage.setItem('jm:rd', JSON.stringify({ font: 'georgia' }))")
        for slug in ['interlude', 'the-room', 'pabrik-mimpi']:
            with self.subTest(slug=slug):
                self.open(page, slug)
                self.assertIn('Georgia', page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--qm-read')"))

    def test_first_visit_guide_on_the_older_experiences(self):
        for slug in ['anda-di-sini', 'interlude', 'terlambat-satu-menit', 'pabrik-mimpi', 'giliran']:
            with self.subTest(slug=slug):
                page, _ = self.context(seen=False)
                page.goto(self.root + slug + '/', wait_until='domcontentloaded')
                page.wait_for_selector('.jm-sheet')
                self.assertGreaterEqual(page.locator('.jm-sheet li').count(), 3)
                page.locator('.jm-go').click()
                self.assertEqual(page.locator('.jm-sheet').count(), 0)
                self.assertEqual(page.evaluate(f"localStorage.getItem('jm:guide:{slug}')"), '1')

    def test_next_card_is_filled_from_the_works_list(self):
        page, _ = self.context()
        self.open(page, 'anda-di-sini')
        page.evaluate("document.getElementById('read').scrollTop = document.getElementById('read').scrollHeight")
        page.wait_for_selector('.jm-next[data-filled]')
        self.assertNotEqual(page.locator('.jm-next').get_attribute('href'), '../../#putar')
        self.assertIn('→', page.locator('.jm-next').inner_text())

    def test_arsip_document_view_keeps_the_exit_on_phones(self):
        page, _ = self.context()
        page.goto(self.root + 'arsip/index.html#thought-log-001-the-cartesian-void', wait_until='domcontentloaded')
        page.wait_for_function("document.documentElement.dataset.view === 'doc'")
        self.assertTrue(page.locator('.qm-back').is_visible())


if __name__ == '__main__':
    unittest.main(verbosity=2)
