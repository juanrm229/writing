"""Browser checks for Giliran / Your Turn: python3 tests/giliran_smoke.py.

Spoken lines become speech balloons, typed lines live in their app (Sela, messages, calls, email), sentences
left unsaid are empty dashed balloons, and once the reader must press Send or Pause. All prose comes from
works.json; these tests check that every sentence is still on the page.
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
SLUG = 'giliran'
SEEN = "try { localStorage.setItem('jm:guide:giliran', '1') } catch (e) {}"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def norm(s):
    s = re.sub(r'\*\*?|^>\s?', '', s, flags=re.M)
    s = s.replace('“', '').replace('”', '')
    return re.sub(r'\s+', ' ', s).strip()


class GiliranSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/antologi/{SLUG}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.works = json.loads((ROOT / 'content/works.json').read_text())
        cls.work = next(w for w in cls.works if w['slug'] == SLUG)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self, motion='reduce'):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion=motion, service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.context.add_init_script(SEEN)
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, query=''):
        self.page.goto(self.url + query, wait_until='domcontentloaded')
        self.page.wait_for_selector('.scene')

    def choose(self, button='.g-send'):
        self.page.locator('.gate').scroll_into_view_if_needed()
        if 'done' not in (self.page.locator('.gate').get_attribute('class') or ''):
            self.page.locator(button).click()

    def story_text(self):
        return norm(self.page.evaluate("document.getElementById('story').textContent"))

    # --- isi ---

    def test_work_is_in_the_temusai_anthology_with_both_languages(self):
        albums = json.loads((ROOT / 'content/albums.json').read_text())
        self.assertIn(SLUG, next(a for a in albums if a['id'] == 'temusai')['tracks'])
        self.assertEqual(self.work['experience'], 'antologi/giliran/index.html')
        self.assertEqual(self.work['en']['title'], 'Your Turn')
        self.assertEqual(len(self.work['body']), len(self.work['en']['body']))
        self.assertTrue((ROOT / 'baca/giliran/index.html').exists())
        self.assertTrue((ROOT / 'assets/og/giliran.png').exists())

    def test_every_sentence_is_on_the_page_in_both_languages(self):
        for lang, body in [('', self.work['body']), ('?lang=en', self.work['en']['body'])]:
            with self.subTest(lang=lang or 'id'):
                self.open(lang)
                self.choose()
                text = self.story_text()
                for p in body:
                    if p.strip() == '---':
                        continue
                    # transkrip: setiap pesan tanpa nama pengirimnya
                    parts = [re.sub(r'^>\s?\*\*[^*]+:\*\*\s*', '', l) for l in p.split('\n')] if p.startswith('>') else [p]
                    for seg in [x for part in parts for x in re.split(r'[“”]', part)]:
                        seg = norm(seg).rstrip(',').strip()
                        if seg:
                            self.assertIn(seg, text, seg[:60])
                self.assertEqual(self.page.locator('.scene').count(), 15)
                self.assertNotIn('**', self.page.evaluate("document.getElementById('story').textContent"))

    # --- bentuk ---

    def test_spoken_lines_are_balloons_and_typed_lines_live_in_apps(self):
        self.open()
        first = self.page.locator('.scene[data-s="2"] .balloon').first
        self.assertIn('who-B', first.get_attribute('class'))
        self.assertIn('right', first.get_attribute('class'))
        self.assertEqual(first.locator('p').inner_text(), 'Makan di luar?')
        self.assertIn('who-M', self.page.locator('.scene[data-s="2"] .balloon').nth(1).get_attribute('class'))
        self.assertGreater(self.page.locator('.balloon').count(), 80)
        # Sela: rehearsal and coaching windows; the coaching tab is active for the first message
        self.assertEqual(self.page.locator('.win.sela[data-ch="coach"] .w-tabs [data-tab="coach"]').count() > 0, True)
        self.assertEqual(self.page.locator('.win.booking .trait').inner_text(), 'Dia akan berusaha membuat saya merasa lebih baik.')
        # calls with live captions, messages, an email, a childhood memory, dashed unsaid balloons
        self.assertGreaterEqual(self.page.locator('.win.call').count(), 3)
        self.assertGreaterEqual(self.page.locator('.win.chat').count(), 3)
        self.assertEqual(self.page.locator('.win.mail').count(), 1)
        self.assertEqual(self.page.locator('.scene.memory .talk.kid .balloon').count(), 2)
        self.assertEqual(self.page.locator('.unsaid').count(), 11)

    def test_kaca_turns_into_mira_and_the_role_label_is_struck_out(self):
        self.open()
        self.choose()
        before = self.page.locator('.scene[data-s="1"] .m.who-K').first
        self.assertNotIn('mira', before.get_attribute('class'))
        self.assertGreater(self.page.locator('.scene[data-s="9"] .m.who-K.mira').count(), 0)
        self.assertGreater(self.page.locator('.scene[data-s="9"] .m-label s').count(), 0)
        self.assertEqual(self.page.locator('.scene[data-s="3"] .m-label s').count(), 0)

    # --- giliran ---

    def test_the_story_waits_for_send_or_pause(self):
        self.open()
        self.assertGreater(self.page.locator('[data-held]').count(), 5)
        self.assertTrue(self.page.locator('#end').is_hidden())
        self.assertEqual(self.page.locator('.gate .g-text').inner_text(), 'Membantu. Saya sedang membaca catatan kita.')
        self.choose('.g-pause')
        self.assertTrue(self.page.locator('#transferDialog').is_visible())
        self.page.locator('#trReason').fill('Saya mengenali klien.')
        self.page.locator('#trSend').click()
        self.page.wait_for_function("document.querySelectorAll('[data-held]').length === 0")
        self.assertEqual(self.page.evaluate("localStorage.getItem('jm:giliran:choice')"), '"jeda"')
        # Ratih's call remembers the reader's choice
        self.page.locator('[data-p="216"]').scroll_into_view_if_needed()
        self.page.wait_for_selector('.you')
        self.assertIn('jeda', self.page.locator('.you').inner_text())
        # a reload keeps the choice and does not hold the story again
        self.page.reload(); self.page.wait_for_selector('.scene')
        self.assertEqual(self.page.locator('[data-held]').count(), 0)
        self.assertIn('done', self.page.locator('.gate').get_attribute('class'))

    def test_access_revoked_seals_only_the_kaca_case(self):
        self.open()
        self.choose()
        self.page.locator('[data-p="229"]').scroll_into_view_if_needed()
        self.page.wait_for_function("document.querySelectorAll('.win.sealed').length > 5")
        self.assertEqual(self.page.locator('.win.sealed[data-pair="C"]').count(), 0)
        self.assertEqual(self.page.locator('.win.review.sealed').count(), 0)
        seal = self.page.locator('.win.sealed .seal').first
        seal.scroll_into_view_if_needed(); seal.click()
        self.assertIn('peek', self.page.locator('.win.sealed').first.get_attribute('class'))

    def test_the_end_is_your_turn(self):
        self.open()
        self.choose()
        self.page.evaluate("scrollTo(0, document.documentElement.scrollHeight)")
        self.page.wait_for_function("document.getElementById('turnText').textContent === 'Giliranmu'")
        self.assertEqual(self.page.locator('#end button').count(), 0)
        self.assertEqual(self.page.locator('.stumble').count(), 1)
        self.page.locator('#ytText').fill('Aku mau bilang sesuatu.')
        self.page.wait_for_function("document.querySelector('.jm-next[data-filled]')")
        self.assertIn('Usia Pulang', self.page.locator('.jm-next').inner_text())
        self.page.wait_for_function("(JSON.parse(localStorage.getItem('jm:stats') || '{}').done || []).includes('giliran')")
        self.assertEqual(self.page.evaluate("Object.keys(localStorage).filter(k => k.includes('ytText')).length"), 0)

    def test_english_labels(self):
        self.open('?lang=en')
        self.assertEqual(self.page.locator('#title').inner_text(), 'Your Turn')
        self.assertIn('Rehearsal', self.page.locator('.w-tabs').first.inner_text())
        self.assertEqual(self.page.locator('.gate .g-send').inner_text(), 'Send')
        self.assertEqual(self.page.locator('.qm-back').inner_text().strip(), 'Writing desk')

    def test_preview_writes_no_history_and_plain_link(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.open('?preview=1')
        self.choose()
        self.page.wait_for_timeout(600)
        for key in ['read', 'stats', 'last', 'prog', 'giliran:choice']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)
        self.page.locator('#openSettings').click()
        self.assertTrue(self.page.locator('#plainLink').get_attribute('href').endswith('#baca-giliran'))

    # --- pengembangan: tulisan yang dilengkapi, dua ruang, diam, langit, peta giliran ---

    def test_unquoted_messages_and_unsaid_sentences_are_written_out(self):
        self.open()
        written = self.page.locator('.m-x')
        self.assertGreaterEqual(written.count(), 8)
        self.assertIn('pulang telat', self.page.locator('.win.chat').first.inner_text())
        self.assertIn('Pemeriksaan kasus', self.page.locator('.win.mail').inner_text())
        texts = self.page.locator('.unsaid span').all_inner_texts()
        self.assertEqual(len(texts), 11)
        self.assertTrue(all(x.strip() for x in texts))
        self.assertIn('Sejak kapan?', texts)
        # the reader's turn at the end is still empty
        self.assertEqual(self.page.locator('.stumble .st i').count(), 3)

    def test_turn_ribbon_counts_every_turn(self):
        self.open()
        self.choose()
        said = self.page.locator('.story .balloon:not(.stumble)').count()
        typed = self.page.locator('.story .m').count()
        legend = self.page.locator('.rb-legend').inner_text()
        self.assertIn(f'{said} diucapkan', legend)
        self.assertIn(f'{typed} diketik', legend)
        self.assertIn('11 tidak jadi diucapkan', legend)
        self.assertEqual(self.page.locator('.rb-row i').count(), said + typed + 11 + 1)

    def test_silence_is_counted_when_the_reader_stays_quiet(self):
        self.open()
        self.choose()
        win = self.page.locator('[data-p="198"]').locator('xpath=ancestor::section[contains(@class,"win")]')
        win.scroll_into_view_if_needed()
        self.page.evaluate("scrollBy(0, 120)")
        self.page.wait_for_function("document.documentElement.classList.contains('hush')")
        self.page.wait_for_timeout(2300)
        self.page.mouse.wheel(0, 200)
        self.page.wait_for_selector('.silence')
        self.assertRegex(self.page.locator('.silence').inner_text(), r'kalian diam 0\.0[2-9]')
        self.assertFalse(self.page.evaluate("document.documentElement.classList.contains('hush')"))

    def test_the_sky_follows_the_story_clock(self):
        self.context.add_init_script("localStorage.setItem('jm:theme', JSON.stringify('light'))")
        self.open()
        self.choose()
        self.page.locator('.scene[data-s="9"]').scroll_into_view_if_needed()
        self.page.evaluate("scrollBy(0, 200)")
        self.page.wait_for_function("document.documentElement.dataset.backdrop === 'fajar'")
        self.page.locator('.scene[data-s="10"]').scroll_into_view_if_needed()
        self.page.evaluate("scrollBy(0, 200)")
        self.page.wait_for_function("document.documentElement.dataset.backdrop === 'siang'")

    def test_two_rooms_on_a_wide_screen(self):
        self.page.set_viewport_size({'width': 1280, 'height': 860})
        self.open()
        self.choose()
        self.assertTrue(self.page.evaluate("document.documentElement.classList.contains('two-rooms')"))
        self.page.locator('[data-p="23"]').locator('xpath=ancestor::section[contains(@class,"win")]').scroll_into_view_if_needed()
        self.page.wait_for_function("document.getElementById('screen').textContent.includes('Apa yang ingin kamu sampaikan kepadanya?')")
        screen = self.page.locator('#screen')
        self.assertTrue(screen.is_visible())
        self.assertIn('Sela', screen.locator('.w-bar').inner_text())
        self.assertIn('Apa yang ingin kamu sampaikan kepadanya?', screen.inner_text())
        self.assertEqual(screen.get_attribute('aria-hidden'), 'true')
        # the flower-shop client is a different window from Kaca's case
        self.assertNotIn('Semoga lancar', screen.inner_text())
        # a phone call moves to the phone
        self.page.locator('[data-p="213"]').locator('xpath=ancestor::section[contains(@class,"win")]').scroll_into_view_if_needed()
        self.page.wait_for_function("document.getElementById('screen').dataset.dev === 'phone'")
        # when there is no coaching window any more, the screen closes and one room is left
        self.page.locator('[data-p="326"]').scroll_into_view_if_needed()
        self.page.evaluate("scrollBy(0, 300)")
        self.page.wait_for_function("document.documentElement.classList.contains('one-room')")
        self.assertFalse(self.page.evaluate("document.documentElement.scrollWidth > innerWidth"))

    def test_phones_keep_everything_in_the_flow(self):
        self.open()
        self.assertFalse(self.page.evaluate("document.documentElement.classList.contains('two-rooms')"))
        self.assertTrue(self.page.locator('#screen').is_hidden())

    def test_an_edited_manuscript_still_shows_everything(self):
        work = json.loads(json.dumps(self.work))
        work['body'] = work['body'][:40] + ['“Kalimat baru,” kata Mira.', 'Paragraf baru.'] + work['body'][40:]
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [work]})) + ")")
        self.open('?preview=1')
        text = self.story_text()
        self.assertIn('Kalimat baru', text)
        self.assertIn('Paragraf baru.', text)
        self.assertIn('Di seberangnya, Mira tetap duduk.', text)
        self.assertEqual(self.page.locator('.gate').count(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
