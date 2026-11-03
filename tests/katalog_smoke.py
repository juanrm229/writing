"""Browser checks for the catalogue of all works (#katalog): python3 tests/katalog_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import functools
import http.server
import json
from pathlib import Path
import re
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def published():
    works = json.loads((ROOT / 'content/works.json').read_text())
    return [w for w in works if w.get('slug') and w.get('title') and not w.get('draft')]


class KatalogSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.works = published()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, init=''):
        if init: self.context.add_init_script(init)
        self.page.goto(self.root + '#katalog', wait_until='domcontentloaded')
        self.page.wait_for_selector('#ktScroll .kt-row')

    def rows(self):
        return self.page.locator('#ktScroll .kt-row')

    def test_every_work_is_on_the_shelf(self):
        self.open()
        self.assertEqual(self.page.locator('.pill [data-go="katalog"][aria-current="true"]').count(), 1)
        self.assertEqual(self.rows().count(), len(self.works))
        self.assertIn(f"{len(self.works)}", self.page.locator('.kt-stats').text_content())
        # newest first, grouped by month
        first = max(self.works, key=lambda w: (w['date'], w.get('time', '')))
        self.assertEqual(self.rows().first.get_attribute('data-slug'), first['slug'])
        months = {w['date'][:7] for w in self.works}
        self.assertEqual(self.page.locator('.kt-month').count(), len(months))
        # the world has its own card
        self.page.wait_for_function("/187 catatan/.test(document.querySelector('.kt-ws')?.textContent || '')")
        self.assertEqual(self.page.locator('.kt-world').get_attribute('href'), 'dunia/salasimpul/')

    def test_liner_notes_open_and_play(self):
        self.open()
        row = self.rows().first
        row.locator('.kt-main').click()
        self.assertEqual(row.locator('.kt-main').get_attribute('aria-expanded'), 'true')
        self.assertTrue(row.locator('.kt-liner').is_visible())
        slug = row.get_attribute('data-slug')
        w = next(x for x in self.works if x['slug'] == slug)
        if w.get('line'):
            self.assertIn(w['line'][:20], row.locator('.kt-line').text_content())
        if w.get('experience'):
            self.assertEqual(row.locator('a.kt-ghost').get_attribute('href'), w['experience'])
        row.locator('[data-kt-play]').click()
        self.page.wait_for_function(f"location.hash.startsWith('#pilih-{slug}')")

    def test_filters_sort_and_search(self):
        self.open()
        cats = {}
        for w in self.works: cats[w['cat']] = cats.get(w['cat'], 0) + 1
        cat, n = max(cats.items(), key=lambda x: x[1])
        self.page.locator(f'.kt-bar [data-kt-cat="{cat}"]').click()
        self.assertEqual(self.rows().count(), n)
        self.page.locator('.kt-bar [data-kt-cat="%s"]' % cat).click()
        self.assertEqual(self.rows().count(), len(self.works))
        # interactive only
        self.page.locator('[data-kt-flag="ix"]').click()
        self.assertEqual(self.rows().count(), sum(1 for w in self.works if w.get('experience')))
        self.page.locator('[data-kt-reset]').click()
        # the time you have: five minutes or less, shortest first
        self.page.locator('[data-kt-time="5"]').click()
        self.page.locator('[data-kt-sort="pendek"]').click()
        lens = [int(x) for x in self.page.locator('.kt-len').evaluate_all("els => els.map(e => e.firstChild.textContent)")]
        self.assertTrue(lens and all(x <= 5 for x in lens))
        self.assertEqual(lens, sorted(lens))
        self.page.locator('[data-kt-reset]').click()
        # search
        target = self.works[0]
        self.page.locator('#ktQ').fill(target['title'])
        self.page.wait_for_function(f"document.querySelectorAll('#ktScroll .kt-row').length < {len(self.works)}")
        self.assertIn(target['slug'], [r.get_attribute('data-slug') for r in self.rows().all()])
        # the sort is kept
        self.page.locator('#ktQ').fill('')
        self.page.locator('[data-kt-sort="lama"]').click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:katalog')).sort"), 'lama')

    def test_first_lines_and_the_map_of_works(self):
        self.open()
        self.page.locator('[data-kt-lens="kalimat"]').click()
        cards = self.page.locator('.kt-card')
        self.assertEqual(cards.count(), len(self.works))
        card = cards.first
        card.click()
        self.assertEqual(card.get_attribute('aria-expanded'), 'true')
        card.click()
        self.page.wait_for_function("location.hash.startsWith('#pilih-')")
        self.page.goto(self.root + '#katalog', wait_until='domcontentloaded')
        self.page.wait_for_selector('#ktScroll .kt-body')
        self.page.locator('[data-kt-lens="peta"]').click()
        self.assertEqual(self.page.locator('.kt-plot .kt-pt').count(), len(self.works))
        self.assertEqual(self.page.locator('.kt-plot .ixr').count(), sum(1 for w in self.works if w.get('experience')))

    def test_progress_and_the_profile_link(self):
        done = [w['slug'] for w in self.works if not w.get('chapters')][:2]
        self.open("localStorage.setItem('jm:stats', JSON.stringify({ secs: 0, per: {}, plays: {}, days: [], done: %s }))" % json.dumps(done))
        self.assertIn('2 dari', self.page.locator('.kt-you').text_content())
        self.page.locator('[data-kt-flag="unread"]').click()
        shown = [r.get_attribute('data-slug') for r in self.rows().all()]
        self.assertTrue(all(s not in shown for s in done))
        self.page.evaluate("location.hash = 'tentang'")
        self.page.wait_for_selector('.pf-all')
        self.page.locator('.pf-all').click()
        self.page.wait_for_selector('#ktScroll .kt-row')


if __name__ == '__main__':
    unittest.main(verbosity=2)
