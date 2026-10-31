"""Browser checks for The Moon Behind My Eyes: python3 tests/moon_smoke.py.

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
SLUG = 'the-moon-behind-my-eyes'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class MoonSmoke(unittest.TestCase):
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
        self.page.evaluate('''([s, l]) => { const el = document.getElementById(`l-${s}-${l}`); scrollBy(0, el.getBoundingClientRect().bottom - innerHeight * .45 + 2); dispatchEvent(new Event('scroll')); }''', [s, l])
        self.page.wait_for_timeout(120)

    def lines(self):
        return [line.replace('*', '') for p in self.work['body'] for line in p.split('\n') if line.strip()]

    def attr(self, name):
        return self.page.evaluate('(n) => document.documentElement.getAttribute(n)', name)

    # Naskah

    def test_every_line_is_present_and_untranslated_note_shows(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}')
                self.assertEqual(self.page.locator('.line').all_text_contents(), self.lines())
                self.assertEqual(self.page.locator('#lost').is_visible(), lang == 'id')
                self.assertEqual(self.page.title(), 'The Moon Behind My Eyes · Quiet Margins')

    def test_main_site_opens_the_window(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    # Jendela

    def test_the_glass_can_be_wiped(self):
        self.open('#baca-0')
        self.assertEqual(self.attr('data-clear'), '0')
        box = self.page.locator('#fog').bounding_box()
        for y in range(10, int(box['height']) - 10, 20):
            self.page.mouse.move(box['x'] + 5, box['y'] + y); self.page.mouse.move(box['x'] + box['width'] - 5, box['y'] + y, steps=10)
        self.page.wait_for_timeout(300)
        self.assertGreater(int(self.attr('data-clear')), 80)
        self.assertIn('bening', self.page.locator('#wipeCue').inner_text())

    def test_stars_arrive_every_second_but_the_moon_stays_a_rumor(self):
        self.open('#baca-0')
        self.assertIsNone(self.attr('data-stars'))
        self.read(1, 0)
        self.page.wait_for_function("+document.documentElement.dataset.stars >= 2", timeout=4000)
        first = int(self.attr('data-stars'))
        self.page.wait_for_timeout(2100)
        self.assertGreaterEqual(int(self.attr('data-stars')) - first, 1)
        self.assertLessEqual(int(self.attr('data-stars')) - first, 3)
        self.assertIn('%', self.page.locator('#moonNote').inner_text())

    def test_curtains_close_by_hand_or_by_reading_on(self):
        self.open('#baca-2')
        self.read(2, 2)
        self.assertTrue(self.page.locator('#closeCurtains').is_visible())
        self.page.locator('#closeCurtains').click()
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-curtains')"))
        self.assertFalse(self.page.locator('#closeCurtains').is_visible())
        # dibuka lagi kalau pembaca kembali ke awal, lalu menutup sendiri saat bait berikutnya dibaca
        self.read(0, 0)
        self.assertFalse(self.page.evaluate("document.documentElement.hasAttribute('data-curtains')"))
        self.read(3, 0)
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-curtains')"))
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-turned')"))

    def test_the_curtain_can_be_dragged(self):
        self.open('#baca-2')
        box = self.page.locator('#curtainL').bounding_box()
        y = box['y'] + box['height'] / 2
        self.page.mouse.move(box['x'] + box['width'] / 2, y); self.page.mouse.down()
        self.page.mouse.move(box['x'] + 400, y, steps=8); self.page.mouse.up()
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-curtains')"))

    # Mata

    def test_the_last_stanzas_are_behind_the_eyes(self):
        self.open('#baca-3')
        self.read(3, 1)
        self.assertFalse(self.page.locator('#holdWrap').is_visible())
        self.read(3, 2)
        self.assertTrue(self.page.locator('#holdWrap').is_visible())
        self.assertIn('blur', self.page.locator('.sealed .card').first.evaluate('(e) => getComputedStyle(e).filter'))
        self.assertNotIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats') || '{}').done || []"))
        self.page.locator('#hold').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'closed'")
        sealed = [l for p in self.work['body'][4:] for l in p.split('\n') if l.strip()]
        self.assertEqual(self.page.locator('#innerText span:not(.gap)').all_text_contents(), sealed)
        self.assertTrue(self.page.locator('#innerMoon').is_visible())
        self.page.mouse.up()
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'open'")
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-kept')"))
        self.assertEqual(self.page.locator('.sealed .card').first.evaluate('(e) => getComputedStyle(e).filter'), 'none')
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)

    def test_lines_arrive_one_by_one_and_opening_the_eyes_pauses_them(self):
        self.moving()
        self.open('#baca-3')
        self.read(3, 2)
        self.page.locator('#hold').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'closed'")
        self.page.wait_for_function("document.querySelectorAll('#innerText span').length >= 1", timeout=4000)
        self.page.mouse.up()
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'open'")
        seen = self.page.locator('#innerText span').count()
        self.assertLess(seen, 7)
        self.page.wait_for_timeout(2200)
        self.assertEqual(self.page.locator('#innerText span').count(), seen)
        self.assertFalse(self.page.evaluate("document.documentElement.hasAttribute('data-kept')"))

    def test_space_bar_holds_and_open_eyes_reading_also_finishes(self):
        self.open('#baca-3')
        self.read(3, 2)
        self.page.keyboard.down(' ')
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'closed'")
        self.page.keyboard.up(' ')
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'open'")
        # pembaca lain memilih membaca dengan mata terbuka
        self.page.evaluate("localStorage.clear()")
        self.page.goto('about:blank')
        self.open('#baca-3')
        self.read(3, 2)
        self.page.locator('#openEyes').click()
        self.page.wait_for_function("document.documentElement.hasAttribute('data-open-eyes')")
        self.read(5, 1)
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight); dispatchEvent(new Event('scroll'))")
        self.page.wait_for_function(f"(JSON.parse(localStorage.getItem('jm:stats') || '{{}}').done || []).includes('{SLUG}')")

    # Umum

    def test_bookmark_and_language_switch(self):
        self.open('#baca-2')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:moon:places')).id.s"), 2)
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#baca-2')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#holdLabel').inner_text(), 'Hold to close your eyes')
        self.open()
        self.assertTrue(self.page.locator('#resume').is_visible())

    def test_layout_fits_every_screen(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-2', '#baca-3']:
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
        self.read(3, 2)
        self.page.locator('#hold').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.documentElement.dataset.eyes === 'closed'")
        self.page.mouse.up()
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'moon:places', 'moon:kept']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
