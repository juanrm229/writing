"""Browser checks for The Moon Behind My Eyes (Camera app): python3 tests/moon_smoke.py.

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

    def stanzas(self):
        return [[l.replace('*', '') for l in p.split('\n') if l.strip()] for p in self.work['body']]

    def attr(self, name):
        return self.page.evaluate('(n) => document.documentElement.getAttribute(n)', name)

    def caption(self):
        return self.page.locator('#capPhoto .line').all_text_contents()

    def shoot(self, n=1):
        for _ in range(n):
            before = self.page.evaluate("(JSON.parse(localStorage.getItem('jm:kamera:state') || '{}').photos || []).length")
            self.page.locator('#shutter').click()
            self.page.wait_for_function(f"(JSON.parse(localStorage.getItem('jm:kamera:state') || '{{}}').photos || []).length > {before}")

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:kamera:state'))")

    # Kamera belakang

    def test_each_photo_keeps_one_stanza_as_its_caption(self):
        self.open()
        self.assertEqual(self.caption(), [])
        self.assertTrue(self.page.locator('#lost').is_visible())
        before = int(self.page.locator('#focus').input_value())
        self.page.locator('#viewfinder').click()
        self.assertGreater(int(self.page.locator('#focus').input_value()), before)
        for i in range(4):
            self.shoot()
            self.assertEqual(self.caption(), self.stanzas()[i])
            self.assertEqual(self.page.locator('#thumbCount').inner_text(), str(i + 1))
        self.page.locator('#thumb').click()
        self.assertEqual(self.page.locator('#photos li').count(), 4)
        self.assertEqual(self.page.locator('#photos img').first.evaluate('(i) => i.src.startsWith("data:image/jpeg")'), True)
        self.assertEqual(self.page.title(), 'The Moon Behind My Eyes · Quiet Margins')

    def test_stars_are_detected_every_second_but_never_the_moon(self):
        self.open()
        self.shoot()
        self.assertNotIn('Bintang', self.page.locator('#detect').inner_text())
        self.shoot()
        self.page.wait_for_function("+document.documentElement.dataset.stars >= 6")
        first = int(self.attr('data-stars'))
        self.page.wait_for_timeout(2100)
        self.assertIn(int(self.attr('data-stars')) - first, [1, 2, 3])
        self.assertIn('tidak terdeteksi', self.page.locator('#detect').inner_text())

    def test_curtains_and_turning_away_from_the_glass(self):
        self.open()
        self.shoot(2)
        self.page.locator('#flip').click()
        self.assertFalse(self.page.evaluate("document.documentElement.hasAttribute('data-front')"))
        self.shoot()
        self.assertTrue(self.page.locator('#drawCurtains').is_visible())
        box = self.page.locator('#viewfinder').bounding_box(); y = box['y'] + box['height'] / 2
        self.page.mouse.move(box['x'] + 20, y); self.page.mouse.down(); self.page.mouse.move(box['x'] + box['width'] - 20, y, steps=8); self.page.mouse.up()
        self.assertEqual(self.state()['close'], 1)
        self.shoot()
        self.assertTrue(self.page.locator('#flipNow').is_visible())
        self.assertIn('cue', self.page.locator('#flip').get_attribute('class'))
        # memotret jendela lagi tidak membuka bait baru
        self.page.locator('#shutter').click(); self.page.wait_for_timeout(200)
        self.assertEqual(len(self.state()['photos']), 4)

    def test_curtains_close_by_themselves_when_reading_on(self):
        self.open()
        self.shoot(4)
        self.assertEqual(self.state()['photos'][3]['close'], 1)

    # Kamera depan

    def test_the_moon_is_behind_the_eyes(self):
        self.open()
        self.shoot(4)
        self.page.locator('#flip').click()
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-front')"))
        self.assertIn('Wajah', self.page.locator('#detect').inner_text())
        self.assertNotIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats') || '{}').done || []"))
        self.page.locator('#shutter').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.documentElement.hasAttribute('data-eyes-closed')")
        self.page.wait_for_function(f"JSON.parse(localStorage.getItem('jm:kamera:state')).done")
        self.assertIn('terdeteksi', self.page.locator('#detect').inner_text())
        self.page.mouse.up()
        sealed = [l for s in self.stanzas()[4:] for l in s]
        self.assertEqual(self.caption(), sealed)
        self.assertIn('Kamera depan', self.page.locator('#capPhoto .cap-meta').inner_text())
        self.page.wait_for_function("document.querySelector('#detect').textContent.includes('di balik mata')")
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)
        self.assertEqual(len(self.state()['photos']), 5)

    def test_lines_arrive_while_holding_and_pause_when_the_eyes_open(self):
        self.moving()
        self.open('#baca-4')
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-front')"))
        self.page.locator('#shutter').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.querySelectorAll('#capPhoto .line').length >= 1", timeout=5000)
        self.page.mouse.up()
        self.page.wait_for_function("!document.documentElement.hasAttribute('data-eyes-closed')")
        seen = len(self.caption())
        self.page.wait_for_timeout(2200)
        self.assertEqual(len(self.caption()), seen)
        self.assertLess(seen, 6)
        self.assertFalse(self.state()['done'])

    def test_space_bar_and_open_eyes(self):
        self.open('#baca-4')
        self.page.keyboard.down(' ')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:kamera:state')).done")
        self.page.keyboard.up(' ')
        self.page.locator('#again').click()
        self.assertEqual(self.state()['photos'], [])
        self.page.goto('about:blank')
        self.open('#baca-4')
        self.page.locator('#openEyes').click()
        self.assertTrue(self.state()['done'])

    # Umum

    def test_main_site_opens_the_camera(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    def test_reading_link_and_reload_keep_the_photos(self):
        self.open('#baca-2')
        self.assertEqual(self.caption(), self.stanzas()[2])
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#thumbCount').inner_text(), '3')
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertIn('Photo 3', self.page.locator('#capPhoto .cap-meta').inner_text())
        self.assertEqual(self.page.locator('#shutter').get_attribute('aria-label'), 'Take photo')

    def test_layout_fits_every_screen(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-2', '#baca-4']:
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
        self.open('?preview=1')
        self.page.locator('#shutter').click(); self.page.wait_for_timeout(200)
        self.assertEqual(self.caption(), self.stanzas()[0])
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'kamera:state']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
