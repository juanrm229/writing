"""Browser checks for The Room (Home app): python3 tests/room_smoke.py.

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
SLUG = 'the-room'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class RoomSmoke(unittest.TestCase):
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

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:kamar:state'))")

    def now(self):
        return self.page.locator('#now .text').inner_text()

    def act(self, name):
        self.page.locator(f'[data-act="{name}"]').click()

    def walk_to(self, stanza):
        """Lakukan tindakan sampai bait ke-`stanza` (0-based) tampil."""
        steps = ['add', 'paint', 'corner', 'scene', 'soft', 'push', 'warm', 'look', 'allow', 'seal', 'paintWall']
        for step in steps[:stanza]:
            if step == 'paint':
                while self.page.locator('[data-tile="small"]').count() == 0:
                    self.act('paint')
            elif step == 'push':
                self.act('letgo'); self.page.locator('#push').fill('100')
            elif step == 'allow':
                self.page.locator('[data-inv="allow"]').click()
            else:
                self.act(step)

    # Kamar

    def test_each_action_opens_the_next_stanza(self):
        self.open()
        self.assertEqual(self.now(), self.work['body'][0])
        self.assertTrue(self.page.locator('#lost').is_visible())
        for i in range(1, len(self.work['body'])):
            with self.subTest(stanza=i):
                self.walk_to(i) if i == 1 else None
                if i > 1:
                    steps = ['add', 'paint', 'corner', 'scene', 'soft', 'push', 'warm', 'look', 'allow', 'seal', 'paintWall']
                    step = steps[i - 1]
                    if step == 'paint':
                        while self.page.locator('[data-tile="small"]').count() == 0:
                            self.act('paint')
                    elif step == 'push':
                        self.act('letgo'); self.page.locator('#push').fill('100')
                    elif step == 'allow':
                        self.page.locator('[data-inv="allow"]').click()
                    else:
                        self.act(step)
                self.assertEqual(self.now(), self.work['body'][i])
                self.assertEqual(self.page.locator('#history li[data-i]').count(), i)
        self.assertTrue(self.state()['done'])
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)
        self.assertEqual(self.page.title(), 'The Room · Quiet Margins')

    def test_the_door_cannot_open_and_there_are_no_hands(self):
        self.open()
        self.act('door')
        self.assertIn('tidak punya pintu', self.page.locator('#toast').inner_text())
        self.act('tidy')
        self.assertIn('Tidak ada tangan', self.page.locator('#toast').inner_text())
        self.assertEqual(self.now(), self.work['body'][0])

    def test_painting_day_by_day_and_the_small_brush(self):
        self.open()
        self.walk_to(1)
        self.assertIn('hari ke-1', self.page.locator('[data-tile="brush"]').inner_text())
        self.act('paint')
        self.assertIn('hari ke-2', self.page.locator('[data-tile="brush"]').inner_text())
        self.assertEqual(self.page.locator('[data-tile="small"]').count(), 0)
        while self.page.locator('[data-tile="small"]').count() == 0:
            self.act('paint')
        self.act('draw')
        self.assertIn('Takut', self.page.locator('#toast').inner_text())
        self.act('corner')
        self.assertIn('Pojok terjauh', self.page.locator('[data-tile="small"]').inner_text())
        self.assertEqual(self.page.locator('[data-tile="small"] button').count(), 0)

    def test_no_response_and_the_wall_that_breaks(self):
        self.open()
        self.walk_to(5)
        self.assertIn('Tidak Ada Respons', self.page.locator('[data-tile="brush"]').inner_text())
        self.act('soft2')
        self.assertIn('Tidak Ada Respons', self.page.locator('#toast').inner_text())
        self.assertEqual(self.page.locator('#push').count(), 0)
        self.act('letgo')
        self.assertEqual(self.page.locator('[data-tile="brush"]').count(), 0)
        self.page.locator('#push').fill('60')
        self.assertIn('60%', self.page.locator('[data-tile="wall"]').inner_text())
        self.assertEqual(self.state()['shown'], 6)
        self.page.locator('#push').fill('100')
        self.assertEqual(self.now(), self.work['body'][6])
        self.assertIn('buku kecil, meja', self.page.locator('[data-tile="items"]').inner_text())

    def test_the_room_gets_cold_then_the_nail(self):
        self.open()
        self.walk_to(6)
        first = float(self.page.locator('#tempNow').inner_text().rstrip('°').replace(',', '.'))
        self.page.wait_for_timeout(2300)
        self.assertLess(float(self.page.locator('#tempNow').inner_text().rstrip('°').replace(',', '.')), first)
        self.walk_to_from(6, 8)
        self.assertTrue(self.page.locator('#invite').is_visible())
        self.page.locator('[data-inv="later"]').click()
        self.assertTrue(self.page.locator('#invite').is_visible())
        self.page.locator('[data-inv="allow"]').click()
        self.act('seal')
        self.assertIn('1 paku', self.page.locator('[data-tile="wall"]').inner_text())
        self.act('pull')
        self.assertIn('Terikat pada Palu', self.page.locator('#toast').inner_text())
        self.act('build')
        self.assertIn('1 perabot', self.page.locator('[data-tile="hammer"]').inner_text())

    def walk_to_from(self, start, stanza):
        steps = ['add', 'paint', 'corner', 'scene', 'soft', 'push', 'warm', 'look', 'allow', 'seal', 'paintWall']
        for step in steps[start:stanza]:
            self.act(step)

    # Umum

    def test_main_site_opens_the_room(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    def test_reading_link_reload_language_and_restart(self):
        self.open('#baca-7')
        self.assertEqual(self.now(), self.work['body'][7])
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.now(), self.work['body'][7])
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#accLabel').inner_text(), 'Accessories')
        self.assertFalse(self.page.locator('#lost').is_visible())
        self.page.goto('about:blank'); self.open('#baca-11')
        self.page.locator('#again').click()
        self.assertEqual(self.state()['shown'], 1)

    def test_layout_fits_every_screen(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-5', '#baca-10']:
                with self.subTest(width=width, fragment=fragment):
                    self.page.set_viewport_size({'width': width, 'height': 800})
                    self.page.goto('about:blank')
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
        self.walk_to(3)
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'kamar:state']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.documentElement).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.documentElement).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
