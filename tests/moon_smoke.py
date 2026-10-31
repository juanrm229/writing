"""Browser checks for The Moon Behind My Eyes (lock screen): python3 tests/moon_smoke.py.

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

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:kunci:state'))")

    def current(self):
        return self.page.locator('#feed .note[data-s]:not(.old) .line').all_text_contents()

    def wipe(self):
        for _ in range(3):
            self.page.locator('#wipe').click()

    def to_curtains(self):
        """Usap, tunggu bulan (gerak tenang: langsung), lalu tunda pengingat tiga kali."""
        self.wipe()
        self.page.wait_for_function("document.querySelectorAll('#feed .note[data-s]').length === 2")
        for _ in range(3):
            self.page.locator('.snooze').click()
        self.page.wait_for_function("document.querySelectorAll('#feed .note[data-s]').length === 3")

    # Layar kunci

    def test_the_glass_is_blurred_until_wiped(self):
        self.open()
        self.assertEqual(self.current(), self.stanzas()[0])
        self.assertNotEqual(self.page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--blur').trim()"), '0.00px')
        box = self.page.locator('#glass').bounding_box()
        for i in range(8):
            self.page.mouse.move(box['x'] + 10, box['y'] + 200 + i * 20); self.page.mouse.move(box['x'] + box['width'] - 10, box['y'] + 210 + i * 20, steps=5)
        self.page.wait_for_function("getComputedStyle(document.documentElement).getPropertyValue('--blur').trim() === '0.00px'")
        self.assertEqual(self.state()['clarity'], 1)
        self.assertTrue(self.page.locator('#lost').is_visible())
        self.assertEqual(self.page.title(), 'The Moon Behind My Eyes · Quiet Margins')

    def test_the_moon_rises_unseen_and_stars_arrive_every_second(self):
        self.moving()
        self.open()
        self.wipe()
        self.assertTrue(self.page.locator('#live').is_visible())
        self.assertIn('Bulan terbit', self.page.locator('#live').inner_text())
        self.assertEqual(len(self.page.locator('#feed .note[data-s]').all()), 1)
        self.page.wait_for_function("document.querySelectorAll('#feed .note[data-s]').length === 2", timeout=12000)
        self.assertEqual(self.current(), self.stanzas()[1])
        self.assertIn('tidak terlihat', self.page.locator('#live').inner_text())
        first = int(self.attr('data-stars'))
        self.page.wait_for_timeout(2100)
        self.assertIn(int(self.attr('data-stars')) - first, [1, 2, 3])
        self.assertIn('Tertunda', self.page.locator('#wRise').inner_text())

    def test_waiting_becomes_reminders_that_must_be_snoozed(self):
        self.open()
        self.wipe()
        self.page.wait_for_selector('.snooze')
        self.page.locator('.snooze').click(); self.page.locator('.snooze').click()
        self.assertEqual(len(self.page.locator('#feed .note[data-s]').all()), 2)
        self.page.locator('.snooze').click()
        self.page.wait_for_function("document.querySelectorAll('#feed .note[data-s]').length === 3")
        self.assertEqual(self.current(), self.stanzas()[2])

    def test_the_curtains_are_the_brightness(self):
        self.open()
        self.to_curtains()
        self.assertIn('cue', self.page.locator('#openCC').get_attribute('class'))
        self.page.locator('#lockBtn').click(force=True)
        self.assertIn('kecerahan', self.page.locator('#hint').inner_text())
        self.page.locator('#openCC').click()
        self.page.locator('#bright').fill('0')
        self.page.wait_for_function("document.querySelectorAll('#feed .note[data-s]').length === 4")
        self.assertEqual(self.page.locator('#focusBtn').get_attribute('aria-pressed'), 'true')
        self.page.locator('#ccClose').click()
        self.assertEqual(self.current(), self.stanzas()[3])
        self.assertTrue(self.page.locator('#focusChip').is_visible() or self.page.viewport_size['width'] < 700)
        self.assertEqual(self.page.locator('.note.sky').count(), 0)

    def test_holding_the_lock_button_shows_the_moon_on_the_dark_screen(self):
        self.open('#baca-3')
        self.assertNotIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats') || '{}').done || []"))
        self.page.locator('#lockBtn').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.documentElement.hasAttribute('data-eyes-closed')")
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:kunci:state')).done")
        self.assertIn('terlihat', self.page.locator('#aodMoon').inner_text())
        sealed = [l for s in self.stanzas()[4:] for l in s]
        self.assertEqual(self.page.locator('#aodLines .line').all_text_contents(), sealed)
        self.page.mouse.up()
        self.page.wait_for_function("!document.documentElement.hasAttribute('data-eyes-closed')")
        self.assertIn('di balik mata', self.page.locator('#wMoon').inner_text())
        self.assertIn('di balik matamu', self.page.locator('#feed').inner_text())
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)

    def test_lines_arrive_while_holding_and_pause_when_released(self):
        self.moving()
        self.open('#baca-3')
        self.page.locator('#lockBtn').hover(); self.page.mouse.down()
        self.page.wait_for_function("document.querySelectorAll('#aodLines .line').length >= 1", timeout=5000)
        self.page.mouse.up()
        self.page.wait_for_function("!document.documentElement.hasAttribute('data-eyes-closed')")
        seen = self.page.locator('#aodLines .line').count()
        self.page.wait_for_timeout(2200)
        self.assertEqual(self.page.locator('#aodLines .line').count(), seen)
        self.assertLess(seen, 6)
        self.assertFalse(self.state()['done'])

    def test_space_bar_and_open_eyes(self):
        self.open('#baca-3')
        self.page.keyboard.down(' ')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:kunci:state')).done")
        self.page.keyboard.up(' ')
        self.page.locator('#again').click()
        self.assertEqual(self.state()['shown'], 1)
        self.page.goto('about:blank')
        self.open('#baca-3')
        self.page.locator('#openEyes').click()
        self.assertTrue(self.state()['done'])

    # Umum

    def test_main_site_opens_the_lock_screen(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    def test_reading_link_reload_and_language(self):
        self.open('#baca-2')
        self.assertEqual(self.current(), self.stanzas()[2])
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.current(), self.stanzas()[2])
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#wMoonLabel').text_content(), 'Moon')
        self.assertEqual(self.page.locator('#lost').count(), 0)

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
        self.open('?preview=1')
        self.wipe()
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'kunci:state']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
