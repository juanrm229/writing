"""Browser checks for the notes archive (thought logs): python3 tests/arsip_smoke.py.

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
SLUG = 'arsip'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class ArsipSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + 'antologi/arsip/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.works = json.loads((ROOT / 'content/works.json').read_text())
        cls.logs = sorted([w for w in cls.works if w.get('cat') == 'catatan'], key=lambda w: w['title'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self, motion='reduce'):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion=motion, service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        # kartu "Cara membaca" sudah pernah ditutup, kecuali di tes panduan
        self.context.add_init_script("try { localStorage.setItem('jm:guide:arsip', '1') } catch (e) {}")
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
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:arsip:state'))")

    def texts(self):
        return self.page.evaluate("[...document.querySelectorAll('#doc .para .tx')].map(p => { const c = p.cloneNode(true); c.querySelectorAll('.q-tag').forEach(x => x.remove()); return c.textContent; })")

    def read_to(self, i):
        self.page.evaluate("(i) => { const el = document.getElementById('p-' + i); scrollBy(0, el.getBoundingClientRect().top - innerHeight * .4 + 2); dispatchEvent(new Event('scroll')); }", i)
        self.page.wait_for_timeout(120)

    def read_all(self):
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight); dispatchEvent(new Event('scroll'))")
        self.page.wait_for_timeout(150)

    # Laci dan berkas

    def test_drawer_lists_the_files_in_order_and_a_locked_space(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.open()
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'list')
        self.assertEqual(self.page.locator('#files .no').all_text_contents(), ['001', '002', '003', '004'])
        self.assertIn('Terkunci', self.page.locator('#files').inner_text())
        self.assertIn('9 menit', self.page.locator('#drawerNote').inner_text())
        self.assertEqual(self.page.locator('#night li').count(), 6)
        self.page.locator('[data-file="thought-log-002-the-dissonant-shell"]').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'doc')
        self.assertIn('002/003', self.page.locator('.doc-top').inner_text())
        self.page.locator('#toDrawer').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'list')

    def test_every_paragraph_of_every_log_is_present(self):
        for w in self.logs:
            with self.subTest(slug=w['slug']):
                self.open('#' + w['slug'])
                self.assertEqual(self.texts(), [p.strip().replace('*', '') for p in w['body'] if p.strip()])
                self.assertIn(w['title'], self.page.locator('#doc h1').inner_text())
                self.assertTrue(self.page.locator('#doc .lost').is_visible())

    def test_wide_screen_opens_the_first_unread_file(self):
        self.open()
        self.page.wait_for_url('**#thought-log-001-the-cartesian-void')
        self.assertTrue(self.page.locator('#index').is_visible())

    def test_questions_turn_answered_after_reading_on(self):
        slug = 'thought-log-002-the-dissonant-shell'
        self.open('#' + slug)
        first = self.page.locator('#questions li').first
        self.assertIn('TERBUKA', first.inner_text().upper())
        q = self.page.locator('#doc .q').first
        p = int(q.evaluate("(e) => e.closest('.para').dataset.p"))
        self.read_to(p + 1)
        self.assertIn('TERJAWAB', first.inner_text().upper())
        self.assertIn('terjawab 1', self.page.locator('#qCount').inner_text())

    def test_cross_reference_opens_the_same_word_elsewhere(self):
        self.open('#thought-log-001-the-cartesian-void')
        ref = self.page.locator('#xrefs [data-xref]').first
        to, word = ref.get_attribute('data-xref'), ref.get_attribute('data-word')
        ref.click()
        self.page.wait_for_url('**#' + to)
        self.assertGreaterEqual(self.page.locator('#doc mark.hit').count(), 1)
        self.assertEqual(self.page.locator('#doc mark.hit').first.inner_text().lower(), word)

    def test_finishing_a_file_stamps_it_and_counts_on_the_main_site(self):
        slug = 'thought-log-001-the-cartesian-void'
        self.open('#' + slug)
        self.read_all()
        self.assertTrue(self.page.locator('#doc .stamp').count() == 1)
        self.assertIn('Selesai dibaca', self.page.locator(f'[data-file="{slug}"]').inner_text())
        self.assertIn(slug, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{slug}']"), 1)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:last')).key"), slug)

    def test_knocking_opens_your_own_space(self):
        self.open('#thought-log-003-the-resonance-of-silence')
        self.read_all()
        for _ in range(2):
            self.page.locator('#knock').click()
        self.assertFalse(self.state()['ruang'])
        self.page.locator('#knock').click()
        self.page.wait_for_url('**#ruang')
        self.page.locator('#ruangText').fill('Diam juga jawaban.')
        self.page.wait_for_timeout(600)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:arsip:ruang'))"), 'Diam juga jawaban.')
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#ruangText').input_value(), 'Diam juga jawaban.')
        self.assertIn('Ruangmu', self.page.locator('#files').inner_text())
        self.assertIn('The Room', self.page.locator('.jm-next').inner_text())

    # Umum

    def test_main_site_opens_the_archive_at_the_right_file(self):
        slug = 'thought-log-002-the-dissonant-shell'
        self.page.goto(self.root + '#baca-' + slug, wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/arsip/index.html#' + slug)
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertIn('002', self.page.locator('.doc-top').inner_text())

    def test_language_layout_preview_and_theme(self):
        self.open('?lang=en#thought-log-001-the-cartesian-void')
        self.assertEqual(self.page.locator('#filesLabel').text_content(), 'Files')
        self.assertFalse(self.page.locator('#doc .lost').is_visible())
        for width in [320, 390, 1100, 1440]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': 800})
                self.page.goto('about:blank'); self.open('#thought-log-003-the-resonance-of-silence')
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.page.locator('#openSettings').click()
                self.assertTrue(self.page.locator('#motion').is_disabled())
                self.page.keyboard.press('Escape')

    def test_preview_does_not_write_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': self.works})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#thought-log-003-the-resonance-of-silence')
        self.read_all()
        for _ in range(3):
            self.page.locator('#knock').click()
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'last', 'stats', 'arsip:state', 'arsip:ruang']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_first_visit_shows_how_to_read(self):
        # konteks baru tanpa penanda "sudah dilihat"
        self.context.close()
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce', service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.open()
        sheet = self.page.locator('.jm-sheet')
        self.assertTrue(sheet.is_visible())
        self.assertGreaterEqual(self.page.locator('.jm-sheet li').count(), 3)
        self.page.keyboard.press('Escape')
        self.assertEqual(sheet.count(), 0)
        self.page.reload(); self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('.jm-sheet').count(), 0)
        self.page.locator('.jm-help').click()
        self.assertTrue(self.page.locator('.jm-sheet').is_visible())
        self.page.locator('.jm-go').click()
        self.assertEqual(self.page.locator('.jm-sheet').count(), 0)

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).color")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).color"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
