"""Browser checks for Di Dasar Rumah (antologi/di-dasar-rumah/): python3 tests/dasar_smoke.py.
The whole story is read from content/works.json, floor by floor; everything else follows the sentence being read.
Uses the cloud environment's Python Playwright and system Chromium. No external assets are needed.
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
SLUG = 'di-dasar-rumah'
SEEN = f"try {{ localStorage.setItem('jm:guide:{SLUG}', '1'); }} catch (e) {{}}"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def norm(s):
    return re.sub(r'\s+', ' ', s.replace('*', '')).strip()


class DasarSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + 'antologi/di-dasar-rumah/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == SLUG)
        cls.paras = [p for p in cls.work['body'] if re.search(r'\w', p)]

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.add_init_script(SEEN)
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def go(self, state=None):
        if state is not None:
            self.page.goto(self.url, wait_until='domcontentloaded')
            self.page.evaluate(f"localStorage.setItem('jm:dasar', JSON.stringify({json.dumps(state)}))")
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_selector('.step')

    def index(self, pattern):
        return next(i for i, p in enumerate(self.paras) if re.search(pattern, norm(p)))

    def read_to(self, pattern):
        """Scroll so that the paragraph sits on the reading line (just above the middle)."""
        i = self.index(pattern)
        self.page.evaluate(f"(() => {{ const el = document.querySelector('p[data-i=\"{i}\"]'); scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * .4); }})()")
        self.page.wait_for_timeout(160)
        return i

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:dasar') || 'null')")

    # ---------- the text ----------
    def test_the_story_is_whole_and_unchanged(self):
        self.go()
        got = self.page.evaluate("[...document.querySelectorAll('#story p[data-i]')].map(p => p.textContent)")
        self.assertEqual([norm(x) for x in got], [norm(p) for p in self.paras])
        self.assertEqual(self.page.locator('#story .step').count(), 8)
        self.assertEqual(self.page.locator('#depth a').count(), 8)

    def test_voices_are_told_apart(self):
        self.go()
        offer = self.page.locator('p[data-i]', has_text='Aku dengar,')
        self.assertGreater(offer.locator('.q.v-topi').count(), 1)
        self.assertEqual(self.page.locator('p.mari').count(), 1)
        self.assertEqual(self.page.locator('p.mari').text_content().strip(), 'Mari.')
        self.assertGreater(self.page.locator('p[data-i] .q.v-gadis').count(), 3)
        # "ibu jari" is a thumb, not a mother
        self.assertNotIn('jari', ' '.join(self.page.locator('.ibu').all_text_contents()))

    # ---------- above ----------
    def test_the_numbers_leave_the_bills(self):
        self.go()
        self.assertEqual(self.page.locator('.bill.vanished').count(), 0)
        self.read_to(r'lembar-lembar tagihan di bawah siku telah kosong')
        self.page.wait_for_function("document.querySelectorAll('.bill.vanished').length === 2")
        self.page.locator('[data-tilt]').click()
        self.assertIn('tilted', self.page.locator('[data-bill="2"]').get_attribute('class'))

    def test_the_stairs_count_and_the_coin_is_already_there(self):
        self.go()
        self.read_to(r'^Waktu luruh di atas undakan')
        self.page.wait_for_selector('#counter:not([hidden])')
        self.page.locator('[data-coin]').click()
        self.assertTrue(self.state()['coin'])
        self.page.locator('[data-house] [data-flip]').click()
        self.assertIn('righted', self.page.locator('[data-house]').get_attribute('class'))

    # ---------- the room ----------
    def test_the_flame_comes_down_and_can_be_kept(self):
        self.go()
        self.assertTrue(self.page.locator('#flame').is_hidden())
        self.read_to(r'nyala keemasan bergerak pelan')
        self.read_to(r'^Gadis itu melangkah ke kamar tanpa jendela')
        self.page.wait_for_selector('#flame:not([hidden])')
        self.page.locator('#flame').click()
        self.assertEqual(self.state()['kept'], 1)
        self.assertNotIn('heart', self.page.locator('#flame').get_attribute('class') or '')
        self.read_to(r'^Nyala itu berdetak\.$')
        self.page.wait_for_function("document.getElementById('flame').classList.contains('heart')")

    def test_the_stars_are_given_away_one_by_one(self):
        self.go()
        self.read_to(r'mulai menghitung hal-hal yang masih diingat dari atas')
        self.page.wait_for_function("document.getElementById('openMem').dataset.n === '5'")
        self.page.locator('[data-river] input').fill('Cikapundung')
        self.page.locator('[data-river] button').click()
        self.assertEqual(self.state()['river'], 'Cikapundung')
        self.read_to(r'^Cahaya mengembang\. Gadis itu duduk kembali')
        self.page.wait_for_function("document.querySelector('[data-stars] li[data-m=\"sungai\"]').classList.contains('lost')")
        self.assertEqual(self.page.get_attribute('#openMem', 'data-n'), '4')
        self.assertEqual(self.page.locator('[data-jar-word] i').count(), len('Cikapundung'))
        self.read_to(r'^Tak ada wajah yang datang\.$')
        self.page.wait_for_function("document.getElementById('openMem').dataset.n === '0'")
        self.page.locator('#openMem').click()
        self.assertEqual(self.page.locator('#mem .mem-sec li.lost').count(), 5)

    def test_your_name_loses_its_sound_and_becomes_mother(self):
        self.go()
        self.page.locator('#signName').fill('Laras')
        self.page.locator('#signName').blur()
        self.assertEqual(self.state()['name'], 'Laras')
        self.read_to(r'^Pada halaman kosong sebuah buku')
        self.assertIn('Laras', self.page.locator('[data-note] [data-sig]').text_content())
        self.read_to(r'^Ketika bangun berikutnya, tulisannya masih ada')
        self.page.wait_for_function("document.querySelector('[data-note] [data-sig]').classList.contains('mute')")
        self.assertEqual(self.page.locator('[data-note] [data-sig] i').count(), 5)
        self.read_to(r'^Anak itu membuka mata dan memanggilnya Ibu')
        self.page.wait_for_function("document.querySelector('[data-note] [data-sig]').textContent === 'Ibu'")
        self.assertEqual(self.page.input_value('#signName'), 'Ibu')

    # ---------- the book that was never opened ----------
    def test_her_notes_in_the_margins_and_every_mother_above(self):
        self.go()
        self.assertNotIn('notes-on', self.page.locator('body').get_attribute('class') or '')
        self.assertTrue(self.page.locator('.margin').first.is_hidden())
        self.read_to(r'^Kadang-kadang ia menemukan tulisannya sendiri')
        self.page.wait_for_function("document.body.classList.contains('notes-on')")
        self.assertGreaterEqual(self.page.locator('.margin').count(), 6)
        self.read_to(r'seperti sebutan \*?penjaga')
        self.page.wait_for_function("document.body.classList.contains('penjaga')")
        self.page.locator('[data-look-up]').click()
        self.page.wait_for_selector('#backPill:not([hidden])')
        first = self.page.evaluate("document.querySelector('.ibu').getBoundingClientRect().top")
        self.assertLess(abs(first - 422), 500)

    def test_the_shelf_turns_a_book_toward_the_other_story(self):
        self.go({'v': 1, 'reach': 95})
        self.page.locator('[data-shelf]').scroll_into_view_if_needed()
        self.page.locator('[data-spine="7"]').click()
        link = self.page.locator('[data-spine="7"] .spine-link')
        self.assertIn('#baca-kepala-yang-dingin-kota-yang-hangat', link.get_attribute('href'))

    # ---------- the end ----------
    def test_tell_it_again(self):
        self.go({'v': 1, 'reach': 170, 'name': 'Laras', 'river': 'Cikapundung', 'kept': 3})
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
        self.page.wait_for_selector('#end:not([hidden]) #retell')
        end = self.page.locator('#end').text_content()
        self.assertIn('Ibu', end)
        self.assertIn('0 dari 5', end)
        self.assertIn('3 kali', end)
        self.page.locator('#retell').click()
        self.assertEqual(self.state()['retold'], 1)
        self.assertIn('Maka begini', self.page.locator('#lede').text_content())
        self.assertIn('retold', self.page.locator('body').get_attribute('class'))

    def test_in_the_site_and_plain_reading(self):
        self.assertEqual(self.work['experience'], 'antologi/di-dasar-rumah/index.html')
        albums = json.loads((ROOT / 'content/albums.json').read_text())
        self.assertIn(SLUG, next(a for a in albums if a['id'] == 'koda')['tracks'])
        self.assertIn("'di-dasar-rumah':", (ROOT / 'assets/app.js').read_text())
        self.assertIn('antologi/di-dasar-rumah/dasar.js', (ROOT / 'sw.js').read_text())
        self.go()
        self.page.locator('#openSettings').click()
        self.assertIn(f'#baca-{SLUG}', self.page.get_attribute('#plainLink', 'href'))
        self.page.locator('#motion').click()
        self.assertTrue(self.page.evaluate("document.documentElement.hasAttribute('data-calm')"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
