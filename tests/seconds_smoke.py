"""Browser checks for Trillions of Seconds (Clock app): python3 tests/seconds_smoke.py.

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

    def stanzas(self):
        return [[l.replace('*', '') for l in p.split('\n') if l.strip()] for p in self.work['body']]

    def attr(self, name):
        return self.page.evaluate('(n) => document.documentElement.getAttribute(n)', name)

    def laps_to(self, n):
        """Mulai lalu tekan Putaran sampai bait ke-n (0-based) terbuka."""
        if self.page.locator('#startBtn').inner_text() in ('Mulai', 'Start', 'Lanjut', 'Resume'):
            self.page.locator('#startBtn').click()
        while self.page.locator('#laps .lap').count() < n + 1:
            self.page.wait_for_timeout(60)
            self.page.locator('#lapBtn').click()

    def lap_times(self):
        return [t for t in self.page.locator('#laps .lap:not([data-open]) .time').all_text_contents()]

    # Naskah

    def test_start_and_laps_open_every_stanza_in_order(self):
        self.open()
        self.assertEqual(self.page.locator('#laps .lap').count(), 0)
        self.assertEqual(self.page.locator('#lost').is_visible(), True)
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('#laps .lap.current .line').all_text_contents(), self.stanzas()[0])
        self.laps_to(len(self.stanzas()) - 1)
        got = self.page.evaluate("[...document.querySelectorAll('#laps .lap')].reverse().map(li => [...li.querySelectorAll('.line')].map(l => l.textContent))")
        self.assertEqual(got, self.stanzas())
        self.assertTrue(self.page.locator('#lapBtn').is_disabled())
        self.assertEqual(self.page.title(), 'Trillions of Seconds · Quiet Margins')

    def test_main_site_opens_the_clock(self):
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.page.wait_for_url(f'**/antologi/{SLUG}/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), SLUG)

    # Stopwatch

    def test_laps_record_time_spent_on_each_stanza(self):
        self.open()
        self.page.locator('#startBtn').click()
        for wait in [700, 150, 400]:
            self.page.wait_for_timeout(wait); self.page.locator('#lapBtn').click()
        laps = self.page.evaluate("JSON.parse(localStorage.getItem('jm:seconds:watch')).laps")
        self.assertEqual(len(laps), 3)
        self.assertGreater(laps[0], laps[1])
        self.assertEqual(self.page.locator('#laps .lap.fast').count(), 1)
        self.assertEqual(self.page.locator('#laps .lap.slow').count(), 1)
        self.assertIn('Putaran 1', self.page.locator('#laps .lap.slow').inner_text())

    def test_pausing_mid_poem_does_not_finish_and_survives_a_reload(self):
        self.open()
        self.laps_to(2)
        self.page.locator('#startBtn').click()
        self.assertEqual(self.page.locator('#startBtn').inner_text(), 'Lanjut')
        self.assertEqual(self.page.locator('#lapBtn').inner_text(), 'Atur Ulang')
        self.assertIsNone(self.attr('data-still'))
        frozen = self.page.locator('#digital').inner_text()
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#digital').inner_text(), frozen)
        self.assertEqual(self.page.locator('#laps .lap').count(), 3)
        self.page.locator('#startBtn').click(); self.page.wait_for_timeout(300)
        self.assertNotEqual(self.page.locator('#digital').inner_text(), frozen)

    def test_the_entity_has_the_readers_own_laps(self):
        self.open()
        meet = next(i for i, s in enumerate(self.stanzas()) if any('I encountered an entity' in l for l in s))
        past = next(i for i, s in enumerate(self.stanzas()) if any('he drifted past' in l for l in s))
        self.laps_to(meet - 1)
        self.assertEqual(self.page.locator('#entity').count(), 0)
        self.laps_to(meet)
        self.assertIn('Stopwatch lain', self.page.locator('#banner').inner_text())
        entity = [x.split('\n')[-1] for x in self.page.locator('#entityLaps li').all_inner_texts()]
        self.assertEqual(entity, self.lap_times())
        self.assertEqual(self.page.locator('#entityTime').inner_text()[:5], self.page.locator('#digital').inner_text()[:5])
        self.laps_to(past)
        self.assertIn('hanyut', self.page.locator('#entityState').inner_text())
        self.assertIn('sama persis', self.page.locator('#entityNote').inner_text())
        self.laps_to(past + 1)
        self.assertEqual(self.page.locator('#entity').count(), 0)

    def test_stopping_on_the_last_stanza_ends_the_poem(self):
        self.open()
        self.laps_to(len(self.stanzas()) - 1)
        self.assertIn('cue', self.page.locator('#startBtn').get_attribute('class'))
        self.page.locator('#startBtn').click()
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-still')"))
        self.assertTrue(self.page.locator('#startBtn').is_disabled())
        self.assertIn('Berhenti di', self.page.locator('#hint').inner_text())
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)
        self.page.locator('#again').click()
        self.assertEqual(self.page.locator('#laps .lap').count(), 0)
        self.assertEqual(self.page.locator('#startBtn').inner_text(), 'Mulai')

    def test_world_clock_and_timer_join_the_poem(self):
        self.open()
        coast = next(i for i, s in enumerate(self.stanzas()) if any('coast of answers' in l for l in s))
        trillions = next(i for i, s in enumerate(self.stanzas()) if any('Trillions of seconds' in l for l in s))
        self.laps_to(coast)
        self.assertTrue(self.page.locator('[data-tab="world"] .badge').is_visible())
        self.page.locator('[data-tab="world"]').click()
        self.assertIn('Pantai Jawaban', self.page.locator('#worldList').inner_text())
        self.assertTrue(self.page.locator('[data-tab="world"] .badge').is_hidden())
        self.page.locator('[data-tab="timer"]').click()
        self.assertIn('belum dimulai', self.page.locator('#timerSub').inner_text())
        self.page.locator('[data-tab="stopwatch"]').click()
        self.laps_to(trillions)
        self.page.locator('[data-tab="timer"]').click()
        self.page.wait_for_timeout(1200)
        self.assertLess(int(self.page.locator('#timerLeft').inner_text().replace('.', '')), 10 ** 12)
        self.page.locator('#born').fill('2000')
        self.assertIn('dari satu triliun', self.page.locator('#lived').inner_text())

    def test_reading_link_opens_a_stanza_with_skipped_laps(self):
        self.open('#baca-3')
        self.assertEqual(self.page.locator('#laps .lap').count(), 4)
        self.assertEqual(self.page.locator('#laps .lap[data-open] .line').all_text_contents(), self.stanzas()[3])
        self.assertEqual(self.page.locator('#laps .skipped').count(), 3)

    # Umum

    def test_language_switch_keeps_the_laps(self):
        self.open()
        self.laps_to(1)
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#laps .lap').count(), 2)
        self.assertEqual(self.page.locator('#startBtn').inner_text(), 'Resume')
        self.assertEqual(self.page.locator('#lost').is_visible(), False)

    def test_layout_fits_every_screen(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-4', '#baca-6']:
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
        self.laps_to(len(self.stanzas()) - 1)
        self.page.locator('#startBtn').click()
        self.page.locator('[data-tab="timer"]').click(); self.page.locator('#born').fill('1990')
        self.page.wait_for_timeout(300)
        for key in ['prog', 'read', 'last', 'stats', 'seconds:watch', 'seconds:born']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
