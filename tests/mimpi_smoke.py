"""Browser checks for Pabrik Mimpi (Larut): python3 tests/mimpi_smoke.py.

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
LINE = 'innerHeight * .5'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class MimpiSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + 'antologi/pabrik-mimpi/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == 'pabrik-mimpi')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def go(self, paragraph):
        self.page.evaluate('(p) => location.hash = "baca-" + p', paragraph)
        self.page.wait_for_function('''(p) => { const r = document.querySelector('#p-' + p)?.getBoundingClientRect(); return r && (Math.abs(r.top - ''' + LINE + ''') < 1 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1); }''', arg=paragraph)

    def read_until(self, paragraph):
        """Gulir pelan, seperti membaca, sampai paragraf itu naik melewati seperlima atas layar."""
        for _ in range(400):
            done = self.page.evaluate('''(p) => { const r = document.querySelector('#p-' + p).getBoundingClientRect();
              if (r.bottom < innerHeight * .2 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1) return true; scrollBy(0, 120); return false; }''', paragraph)
            self.page.wait_for_timeout(25)
            if done:
                break
        self.page.evaluate("dispatchEvent(new Event('scroll'))"); self.page.wait_for_timeout(80)

    def gone(self):
        return [int(v.get_attribute('data-entry')) for v in self.page.locator('.verse.gone').all()]

    def body(self, lang='id'):
        return self.work['en']['body'] if lang == 'en' else self.work['body']

    def index(self, marker, lang='id'):
        return [i for i, p in enumerate(self.body(lang)) if marker in p]

    # Naskah

    def test_all_original_paragraphs_are_present_in_both_languages(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}')
                self.assertEqual(self.page.locator('.passage').all_text_contents(), [p.replace('*', '') for p in self.body(lang) if p.strip() != '***'])
                self.assertEqual(self.page.locator('html').get_attribute('lang'), lang)

    def test_the_markers_point_to_one_paragraph_each_in_order(self):
        self.open()
        markers = self.page.evaluate('MimpiLarut.MARKERS')
        for lang, li in [('id', 0), ('en', 1)]:
            spots = [self.index(markers[k][li], lang) for k in ['real', 'first', 'burst']]
            self.assertTrue(all(len(s) == 1 for s in spots), spots)
            self.assertLess(spots[0][0], spots[1][0]); self.assertLess(spots[1][0], spots[2][0])

    def test_main_site_opens_the_dream_and_completion_is_recorded(self):
        self.page.goto(self.root + '#baca-pabrik-mimpi', wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/pabrik-mimpi/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.go(65)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes("pabrik-mimpi")')

    # Larut

    def test_reading_dissolves_what_was_read_into_stars(self):
        self.open()
        self.assertEqual(self.gone(), [])
        self.read_until(6)
        gone = self.gone()
        self.assertTrue({0, 1, 2} <= set(gone), gone)
        self.assertNotIn(20, gone)
        stored = self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:larut')).id")
        self.assertEqual(sorted(stored), sorted(gone))
        self.assertEqual(self.page.locator('.verse[data-entry="0"] .remnant').get_attribute('aria-label'), 'Munculkan kembali paragraf ini sebentar')

    def test_jumping_does_not_dissolve_anything(self):
        self.open('#baca-30')
        self.page.wait_for_timeout(200)
        self.assertEqual(self.gone(), [])

    def test_what_really_happened_never_dissolves_and_the_room_lights_up(self):
        self.open('#baca-44')
        self.read_until(65)
        real = self.index('Lila membawa mereka semua ke pabrik')[0]
        gone = self.gone()
        self.assertTrue(any(p < real for p in gone))
        self.assertFalse([p for p in gone if p >= real])
        self.assertEqual(self.page.locator('.verse.real').count(), len([p for p in self.body()[real:] if p.strip() != '***']))
        self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-burst")'))
        self.assertTrue(self.page.locator('#wake').is_visible())

    def test_a_star_can_bring_its_sentence_back_for_a_moment(self):
        self.open()
        self.read_until(6)
        self.page.evaluate("scrollTo(0, 0)"); self.page.wait_for_timeout(80)
        self.page.locator('.verse[data-entry="1"] .remnant').click()
        verse = self.page.locator('.verse[data-entry="1"]')
        self.assertIn('recalled', verse.get_attribute('class'))
        self.assertNotIn('gone', verse.get_attribute('class'))
        self.page.evaluate("scrollTo(0, document.body.scrollHeight)"); self.page.evaluate("dispatchEvent(new Event('scroll'))"); self.page.wait_for_timeout(150)
        self.assertIn('gone', verse.get_attribute('class'))

    def test_the_sky_is_kept_and_sleeping_again_brings_the_words_back(self):
        self.open()
        self.read_until(6)
        n = len(self.gone())
        self.page.wait_for_timeout(450)
        self.open()
        self.assertEqual(len(self.gone()), n)
        self.assertIn(f'{n} bintang', self.page.locator('#sleepNote').inner_text())
        self.page.locator('#again').click()
        self.assertEqual(self.gone(), [])
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:larut')).id"), [])
        self.assertEqual(self.page.locator('#sleepNote').inner_text(), 'Gulir pelan.')

    def test_dissolving_can_be_turned_off(self):
        self.open()
        self.page.locator('#openSettings').click()
        self.page.locator('#dissolve').click()
        self.assertEqual(self.page.locator('#dissolve').get_attribute('aria-pressed'), 'false')
        self.page.keyboard.press('Escape')
        self.read_until(6)
        self.assertEqual(self.gone(), [])

    # Umum

    def test_bookmark_and_language_switch_keep_the_paragraph(self):
        self.open('#baca-20')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:places')).id.paragraph"), 20)
        self.open()
        self.assertTrue(self.page.locator('#resume').is_visible())
        self.page.locator('#resume').click()
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#baca-20')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')

    def test_layout_fits_every_screen_and_respects_reduced_motion(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-60']:
                with self.subTest(width=width, fragment=fragment):
                    self.page.set_viewport_size({'width': width, 'height': 844})
                    self.open(fragment)
                    self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                    self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-calm")'))
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#motion').is_disabled())
                    self.page.keyboard.press('Escape')
                    self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openSettings')

    def test_preview_does_not_write_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1')
        self.read_until(4)
        self.page.wait_for_timeout(450)
        self.assertTrue(self.gone())
        for key in ['prog', 'read', 'mimpi:places', 'mimpi:larut']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundImage")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundImage"))
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')


if __name__ == '__main__':
    unittest.main(verbosity=2)
