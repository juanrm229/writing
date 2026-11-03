"""Browser checks for Yang Tidak Pernah Dibacakan: python3 tests/dibacakan_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
Checks that the novel is shown whole and unchanged, and that the letters, the dark, the envelope,
the scale and the chain behave.
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
SLUG = 'yang-tidak-pernah-dibacakan'
SEEN = f"try {{ localStorage.setItem('jm:guide:{SLUG}', '1') }} catch (e) {{}}"


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def norm(s):
    return re.sub(r'\s+', ' ', s.replace('*', '')).strip()


class DibacakanSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
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

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.add_init_script(SEEN)
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def go(self, hash_=''):
        self.page.goto(self.url + hash_, wait_until='domcontentloaded')
        self.page.wait_for_selector('.step')

    def to(self, selector, offset=-200):
        self.page.evaluate(f"(() => {{ const el = document.querySelector({json.dumps(selector)}); scrollTo(0, el.getBoundingClientRect().top + scrollY + ({offset})); }})()")
        self.page.wait_for_timeout(120)

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:ytpd') || 'null')")

    # ---------- the text ----------
    def test_the_novel_is_whole_and_unchanged(self):
        self.go()
        chapters = self.work['chapters']
        self.assertEqual(self.page.locator('.step').count(), len(chapters))
        self.assertEqual([norm(x) for x in self.page.locator('.st-h h2').all_text_contents()], [norm(c['title']) for c in chapters])
        text = norm(self.page.locator('#story').text_content())
        angry = next(p for c in chapters for p in c['body'] if p.startswith('*Kadang aku benci'))
        for c in chapters:
            for p in c['body']:
                if not re.search(r'\w', p) or p == angry:
                    continue
                self.assertIn(norm(p).strip('"'), text)
        # the angry letter, before any thorn is pulled, reads exactly as Damar wrote it
        orig = self.page.evaluate("[...document.querySelector('[data-letter=\"angry\"] blockquote').childNodes].map(n => n.nodeType === 3 ? n.textContent : n.querySelector('s').textContent).join('')")
        self.assertEqual(norm(orig), norm(angry))
        self.assertEqual(self.page.locator('#stairs a').count(), len(chapters))

    # ---------- the pen ----------
    def test_the_reader_holds_sarahs_pen(self):
        self.go()
        card = self.page.locator('[data-letter="angry"]')
        thorns = card.locator('.thorn')
        n = thorns.count()
        self.assertGreater(n, 2)
        thorns.first.click()
        self.assertIn(f'{n - 1} duri lagi', card.locator('[data-count]').text_content())
        self.assertEqual(self.state()['mine'], 1)
        card.locator('[data-sarah]').click()
        self.page.wait_for_selector('[data-letter="angry"].clean')
        soft = next(p for c in self.work['chapters'] for p in c['body'] if p.startswith('*Kadang aku sedih'))
        shown = self.page.evaluate("[...document.querySelector('[data-letter=\"angry\"] blockquote').childNodes].map(n => n.nodeType === 3 ? n.textContent : n.querySelector('ins').textContent).join('')")
        self.assertEqual(norm(shown), norm(soft))
        # comparing the two
        card.locator('[data-v="tulis"]').click()
        self.assertIn('show-orig', card.get_attribute('class'))
        self.assertEqual(self.state()['mine'], 1)

    def test_heard_in_the_dark(self):
        self.go()
        self.page.locator('[data-letter="soft"] [data-listen]').click()
        dark = self.page.locator('#dark')
        self.assertTrue(dark.is_visible())
        self.assertIn('Suara Sarah', self.page.locator('#darkWho').text_content())
        self.page.wait_for_function("document.getElementById('darkCap').textContent.length > 5")
        self.page.locator('#darkOpen').click()
        self.assertFalse(dark.is_visible())

    # ---------- what happens as the narration arrives ----------
    def test_a_sentence_vanishes_a_change_is_struck_and_the_last_letter_is_sealed(self):
        self.go()
        self.to('[data-trig="orange"]', -300)
        self.page.wait_for_selector('[data-letter="orange"].gone')
        self.assertIn('kau tidak bisa melihat oranye', self.page.locator('[data-letter="orange"] [data-cut]').text_content())
        self.to('[data-trig="change"]', -300)
        self.page.wait_for_selector('[data-erase].struck')
        self.to('[data-trig="last"]', -300)
        self.page.wait_for_selector('[data-letter="last"].stamped')
        self.assertIn('full', self.page.locator('#tray').get_attribute('class'))
        self.page.locator('#tray').click()
        self.assertIn('Belum boleh dibuka', self.page.locator('#trayTip').text_content())

    def test_the_envelope_opens_on_the_last_step(self):
        self.go()
        self.to('[data-opener]', -100)
        self.page.locator('[data-opener] [data-seal]').click()
        self.page.wait_for_selector('[data-opener].unfold')
        last = next(p for c in self.work['chapters'] for p in c['body'] if p.startswith('*Ren. Aku sudah menjadi'))
        self.assertEqual(norm(self.page.locator('[data-opener] .env-text').text_content()), norm(last))
        self.assertTrue(self.state()['opened'])
        self.page.locator('[data-opener] [data-listen="last"]').click()
        self.assertIn('tanpa mengubah satu kata pun', self.page.locator('#darkWho').text_content())
        self.page.locator('#darkOpen').click()

    def test_a_shared_envelope(self):
        self.go('#surat')
        self.assertEqual(self.page.locator('#cover [data-opener].gift').count(), 1)
        self.page.locator('#cover [data-seal]').click()
        self.page.wait_for_selector('#cover [data-opener].unfold')
        # opening someone else's envelope does not open yours
        self.assertFalse((self.state() or {}).get('opened'))

    # ---------- the scale and the chain ----------
    def test_the_scale_and_the_end(self):
        self.go()
        self.to('[data-scale="1"]', -300)
        self.page.locator('[data-scale="1"] [data-v="2"]').click()
        self.page.locator('[data-scale="3"] [data-v="1"]').click()
        self.assertEqual(self.state()['verdict'], {'1': 2, '3': 1})
        self.assertEqual(self.page.locator('.chain').count(), 1)
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
        self.page.wait_for_selector('#end .verdict')
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
        end = self.page.locator('#end').text_content()
        self.assertIn('Kau memaafkannya di anak tangga 2', end)
        self.assertIn('anak tangga keempat kau setuju', end)
        self.assertEqual(self.page.locator('.chain.final').count(), 1)
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))

    # ---------- the site ----------
    def test_in_temusai_and_plain_reading(self):
        albums = json.loads((ROOT / 'content/albums.json').read_text())
        self.assertIn(SLUG, next(a for a in albums if a['id'] == 'temusai')['tracks'])
        self.assertEqual(self.work['experience'], f'antologi/{SLUG}/index.html')
        self.go()
        self.page.locator('#openSettings').click()
        self.assertTrue(self.page.locator('#plainLink').get_attribute('href').endswith(f'#baca-{SLUG}'))

    # ---------- the reading, deeper ----------
    def test_voices_beats_and_the_lamp(self):
        self.go()
        self.assertGreater(self.page.locator('.v-sarah').count(), 10)
        self.assertGreater(self.page.locator('.v-kirana').count(), 2)
        self.assertIn('Sarah bukan orang jahat.', self.page.locator('p.beat').all_text_contents())
        self.to('#bab-2', 200)
        self.page.wait_for_timeout(150)
        self.assertIn('lamp-on', self.page.locator('body').get_attribute('class'))
        self.assertEqual(self.page.locator('.step > .lit').count(), 1)
        self.page.locator('#openSettings').click()
        self.page.locator('#lamp').click()
        self.assertNotIn('lamp-on', self.page.locator('body').get_attribute('class') or '')

    def test_what_you_do_in_the_kitchen(self):
        self.go()
        self.to('[data-ask="4"]', -300)
        self.page.locator('[data-ask="4"] [data-pick="saring"]').click()
        self.assertIn('Sarah memilih hal yang sama', self.page.locator('[data-ask="4"]').text_content())
        self.to('[data-ask="5"]', -300)
        self.page.locator('[data-ask="5"] [data-pick="henti"]').click()
        self.assertIn('Sarah tidak', self.page.locator('[data-ask="5"]').text_content())
        st = self.state()
        self.assertEqual((st['c4'], st['c5']), ('saring', 'henti'))

    def test_the_eighth_year(self):
        self.go()
        box = self.page.locator('[data-chance]')
        self.assertEqual(box.locator('.ch-o').count(), 2)
        self.assertIn('Kau tidak gila', box.locator('[data-ans="jujur"]').text_content())
        self.assertIn('Kau gila sedikit', box.locator('[data-ans="sarah"]').text_content())
        self.assertGreater(self.page.locator('[data-veil]').count(), 0)
        self.to('[data-chance]', -150)
        box.locator('[data-ans="jujur"]').click()
        self.page.wait_for_function("!document.querySelector('[data-veil]')")
        self.assertIn('answered', box.get_attribute('class'))
        self.assertEqual(self.state()['chance'], 'jujur')

    def test_the_echo_of_the_mother(self):
        self.go()
        self.to('[data-echo]', -200)
        self.page.locator('[data-echo]').click()
        echoes = self.page.locator('.ec').count()
        self.assertGreater(echoes, 3)
        self.assertEqual(self.page.locator('.ec-list button').count(), echoes)
        self.assertIn('echoing', self.page.locator('body').get_attribute('class'))
        self.assertGreater(self.page.locator('em.whisper mark').count(), 2)

    def test_weeks_without_a_letter_and_the_order_of_time(self):
        self.go()
        self.to('[data-mailbox]', -300)
        self.page.wait_for_timeout(150)
        self.page.evaluate("scrollBy(0, 1400)")
        self.page.wait_for_function("+document.querySelector('[data-weeks]').textContent > 10")
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
        self.page.wait_for_selector('#chrono')
        self.assertGreaterEqual(self.page.locator('#chrono .el').count(), 12)
        self.page.locator('#chrono [data-goto]').first.click()
        self.page.wait_for_timeout(200)
        target = self.page.locator('#chrono [data-goto]').first.get_attribute('data-goto')
        self.assertLess(abs(self.page.evaluate(f"document.getElementById('{target}').getBoundingClientRect().top")), 900)

    # ---------- Sarah's drawer ----------
    def test_sarahs_drawer_opens_by_the_step(self):
        self.go()
        self.page.locator('#openLaci').click()
        self.page.wait_for_selector('#laci[open] .lc')
        first = self.page.locator('#laci .lc').count()
        self.assertGreater(first, 0)
        self.assertLess(first, 12)
        self.assertGreater(self.page.locator('#laci .laci-more').count(), 0)
        self.page.locator('#laci [data-close]').click()
        self.to('#bab-6', 0)
        self.page.wait_for_function("document.querySelector('#openLaci').dataset.n")
        self.assertGreater(self.page.locator('.laci-hint').count(), 1)
        self.page.locator('#bab-5 .laci-hint [data-laci-open]').click()
        self.page.wait_for_selector('#laci[open]')
        self.assertGreater(self.page.locator('#laci .lc').count(), first)
        self.assertIsNone(self.page.get_attribute('#openLaci', 'data-n'))
        self.assertIn('kursi-yang-sama', self.state()['seen'])

    def test_her_pen_moves_through_a_letter(self):
        self.go()
        self.page.evaluate("localStorage.setItem('jm:ytpd', JSON.stringify({v: 1, reached: 7}))")
        self.go()
        self.page.locator('#openLaci').click()
        self.page.locator('[data-letter-open="angin-barat"]').click()
        body = self.page.locator('#lpBody')
        self.assertIn('Pekerjaan sepi', body.locator('.lw-pen').first.text_content())
        self.assertIn('aku sedang berubah', body.locator('.lw-gone').all_text_contents()[1] if body.locator('.lw-gone').count() > 1 else body.text_content())
        self.page.locator('#penRange').fill('0')
        self.page.locator('#penRange').dispatch_event('input')
        self.assertEqual(body.locator('.lw-pen, .lw-gone').count(), 0)
        self.assertIn('Aku diam. Aku pulang.', body.locator('.lw-thorn').all_text_contents()[-1])
        # the last letter stays sealed until it is opened on the last step
        self.page.locator('[data-laci-back]').click()
        self.page.locator('[data-letter-open="terakhir"]').click()
        self.assertEqual(self.page.locator('#laci .lp-sealed').count(), 1)
        self.assertEqual(self.page.locator('#lpBody').count(), 0)
        # what Sarah wrote herself: one true, one a lie
        self.page.locator('[data-laci-back]').click()
        self.page.locator('[data-letter-open="balasan-sarah"]').click()
        self.assertIn('Renjani bahagia', self.page.locator('.tanda.benar').text_content())
        self.assertIn('melupakanmu', self.page.locator('.tanda.bohong').text_content())

    def test_the_drawer_reads_the_letters_from_the_novel(self):
        self.go()
        self.page.evaluate("localStorage.setItem('jm:ytpd', JSON.stringify({v: 1, reached: 7, opened: true}))")
        self.go()
        self.page.locator('#openLaci').click()
        self.assertEqual(self.page.locator('#laci .lc').count(), 12)
        self.assertEqual(self.page.locator('#laci .lc-src').count(), 3)
        self.page.locator('[data-letter-open="terakhir"]').click()
        text = norm(self.page.locator('#lpBody').text_content())
        self.assertGreater(len(text), 200)
        self.page.locator('[data-laci-back]').click()
        self.page.locator('[data-letter-open="marah"]').click()
        self.assertGreater(self.page.locator('#lpBody .lw-pen').count(), 0)
        self.page.locator('[data-laci-listen]').click()
        self.page.wait_for_selector('#dark:not([hidden])')


if __name__ == '__main__':
    unittest.main(verbosity=2)
