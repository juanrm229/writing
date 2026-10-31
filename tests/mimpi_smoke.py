"""Browser checks for Pabrik Mimpi (Kalender Pak Wangsa): python3 tests/mimpi_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import functools
import http.server
import json
import re
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
LINE = 'innerHeight * .45'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class MimpiSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + 'antologi/pabrik-mimpi/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == 'pabrik-mimpi')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def go(self, paragraph):
        self.page.evaluate('(p) => location.hash = "baca-" + p', paragraph)
        self.page.wait_for_function('''(p) => { const r = document.querySelector('#p-' + p)?.getBoundingClientRect(); return r && (Math.abs(r.top - ''' + LINE + ''') < 1 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1); }''', arg=paragraph)
        self.page.evaluate("dispatchEvent(new Event('scroll'))"); self.page.wait_for_timeout(60)

    def read_until(self, paragraph):
        for _ in range(300):
            done = self.page.evaluate('''(p) => { const r = document.querySelector('#p-' + p).getBoundingClientRect();
              if (r.top <= ''' + LINE + ''') return true; scrollBy(0, 160); return false; }''', paragraph)
            self.page.wait_for_timeout(30)
            if done:
                break

    def body(self, lang='id'):
        return self.work['en']['body'] if lang == 'en' else self.work['body']

    def index(self, marker, lang='id'):
        return [i for i, p in enumerate(self.body(lang)) if marker in p]

    def last_quote(self, p, lang='id'):
        return re.findall(r'["“]([^"”]+)["”]', self.body(lang)[p].replace('*', ''))[-1]

    # Naskah

    def test_all_original_paragraphs_are_present_in_both_languages(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}')
                self.assertEqual(self.page.locator('.passage').all_text_contents(), [p.replace('*', '') for p in self.body(lang) if p.strip() != '***'])
                self.assertEqual(self.page.locator('html').get_attribute('lang'), lang)

    def test_every_event_photo_and_quote_points_to_the_story(self):
        self.open()
        k = self.page.evaluate('MimpiKalender')
        for lang, li in [('id', 0), ('en', 1)]:
            starts = []
            for e in k['EVENTS']:
                hits = self.index(e['start'][li], lang)
                self.assertEqual(len(hits), 1, f"{lang} {e['id']}")
                starts.append(hits[0])
                for key in ['reschedule', 'moved']:
                    if key in e:
                        self.assertEqual(len(self.index(e[key][li], lang)), 1)
            self.assertEqual(starts, sorted(starts))
            for ph in k['PHOTOS']:
                self.assertEqual(len(self.index(ph['after'][li], lang)), 1, ph['file'])
                self.assertTrue((ROOT / 'antologi/pabrik-mimpi/photos' / ph['file']).exists())
            for key in ['reply', 'invite']:
                self.assertEqual(len(self.index(k['QUOTES'][key][li], lang)), 1)
            self.assertTrue(self.index(k['QUOTES']['postpone'][li], lang))
            self.assertEqual(len(self.index(k['QUOTES']['gate'][li][0], lang)), 1)
            stand = [self.index(m[li], lang) for m in k['STAND'].values()]
            self.assertTrue(all(len(h) == 1 for h in stand), stand)
            self.assertEqual(stand, sorted(stand))

    def test_main_site_opens_the_calendar_and_completion_needs_the_reply(self):
        self.page.goto(self.root + '#baca-pabrik-mimpi', wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/pabrik-mimpi/index.html')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.go(51)
        self.page.locator('[data-rsvp="hadir"]').click()
        self.go(65)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes("pabrik-mimpi")')

    # Kalender

    def test_the_calendar_follows_the_date_being_read(self):
        self.open()
        for p, month in [(1, 'Februari 1985'), (13, 'Desember 1985'), (20, 'Januari 2024'), (30, 'Desember 2024'), (45, '2025'), (48, 'Januari 2025')]:
            with self.subTest(p=p):
                self.go(p)
                self.assertEqual(self.page.locator('#monthTitle').inner_text(), month)
        self.assertEqual(self.page.locator('#miniGrid .on').inner_text(), '6')
        self.assertIn('Lila', ' '.join(self.page.locator('#calList li').all_text_contents()))
        self.go(5)
        self.assertNotIn('Lila', ' '.join(self.page.locator('#calList li').all_text_contents()))

    def test_forty_years_of_rescheduling(self):
        self.open('#baca-17')
        self.page.evaluate("(v) => { const s = document.querySelector('#years'); s.value = v; s.dispatchEvent(new Event('input')); }", 2000)
        self.assertEqual(self.page.locator('#rcDate').inner_text(), '30 Desember 2000')
        log = self.page.locator('#rcLog').inner_text()
        self.assertIn('30 Desember 2001', log); self.assertIn('Tahun depan, mungkin.', log); self.assertIn('16×', log)
        self.page.locator('#playYears').click()
        self.assertIn('39×', self.page.locator('#rcLog').inner_text())
        self.go(42)
        self.assertIn('untuk ke-40 kalinya', self.page.locator('.moved').inner_text())
        self.assertIn('Tidak dibawa pulang', self.page.locator('[data-event="gate"] .task').inner_text())

    def test_the_empty_year_after_retirement(self):
        self.open('#baca-45')
        months = self.page.locator('.empty-year .months li')
        self.assertEqual(months.count(), 12)
        self.assertTrue(all('Tidak ada acara' in m for m in months.all_text_contents()))

    def test_found_footage_attachments_open_large(self):
        self.open('#baca-1')
        figure = self.page.locator('.footage').first
        figure.scroll_into_view_if_needed()
        self.page.wait_for_function("document.querySelector('.footage img').complete && document.querySelector('.footage img').naturalWidth > 0")
        self.assertIn('1985-02-04', figure.locator('.stamp').inner_text())
        self.assertEqual(self.page.locator('#story .footage').count(), 5)
        figure.locator('[data-photo]').click()
        self.assertTrue(self.page.locator('#lightbox').evaluate('(d) => d.open'))
        self.assertIn('cerobong', self.page.locator('#lightbox figcaption').inner_text())
        self.page.keyboard.press('Escape')

    # Undangan

    def test_maybe_gets_lilas_answer_and_only_yes_opens_the_night(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.context.clear_cookies(); self.page.evaluate('localStorage.clear()') if lang == 'en' else None
                self.open(f'?lang={lang}#baca-51')
                invite = self.index('Lila mengetuk pintu' if lang == 'id' else 'Lila knocked on the door', lang)[0]
                self.assertEqual(self.page.locator('.invite-head h3').inner_text(), self.last_quote(invite, lang))
                self.assertTrue(self.page.locator('[data-event="live"]').is_hidden())
                self.page.locator('[data-rsvp="mungkin"]').click()
                reply = self.index('Bapak tidak punya tahun depan lagi' if lang == 'id' else "You don't have a next year anymore", lang)[0]
                self.assertIn(self.last_quote(reply, lang), self.page.locator('#lilaReply').inner_text())
                self.assertTrue(self.page.locator('[data-event="live"]').is_hidden())
                self.page.locator('[data-rsvp="tidak"]').click()
                self.assertTrue(self.page.locator('[data-event="live"]').is_hidden())
                self.page.locator('[data-rsvp="hadir"]').click()
                self.assertTrue(self.page.locator('[data-event="live"]').is_visible())
                self.assertTrue(self.page.locator('#closing').is_visible())
                self.assertIn('Sedang berlangsung' if lang == 'id' else 'Happening now', self.page.locator('#toast').inner_text())
                self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:rsvp'))"), 'hadir')
                self.page.wait_for_function("/\\d\\d:\\d\\d:\\d\\d/.test(document.querySelector('#liveTimer').textContent)")

    def test_the_reply_is_remembered(self):
        self.seed("localStorage.setItem('jm:mimpi:rsvp', JSON.stringify('hadir')); localStorage.setItem('jm:mimpi:rsvpAt', JSON.stringify(Date.now() - 65000))")
        self.open('#baca-60')
        self.assertTrue(self.page.locator('[data-event="live"]').is_visible())
        self.assertEqual(self.page.locator('[data-rsvp="hadir"]').get_attribute('aria-pressed'), 'true')
        self.assertIn('00:01:', self.page.locator('#liveTimer').inner_text())
        self.assertIn('Terjadi', self.page.locator('#closing .task').inner_text())

    def test_reminders_arrive_while_reading_forward_but_not_when_jumping(self):
        self.open('#baca-30')
        self.assertTrue(self.page.locator('#toast').is_hidden())
        self.go(10)
        self.read_until(13)
        self.page.wait_for_timeout(100)
        self.assertIn('Malam terakhir sebelum libur', self.page.locator('#toast').inner_text())

    # Ponsel dan pengembangan

    def test_phone_has_a_drawer_and_a_week_strip(self):
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.open('#baca-17')
        self.assertTrue(self.page.locator('#sidebar').evaluate('(e) => e.inert'))
        self.assertEqual(self.page.locator('#week span').count(), 7)
        self.assertEqual(self.page.locator('#week .on b').inner_text(), '30')
        self.page.locator('#menu').click()
        self.assertEqual(self.page.locator('#menu').get_attribute('aria-expanded'), 'true')
        self.assertFalse(self.page.locator('#sidebar').evaluate('(e) => e.inert'))
        self.assertIn('Desember 1985', self.page.locator('#miniTitle').inner_text())
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.locator('#menu').get_attribute('aria-expanded'), 'false')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'menu')
        # Tanggal yang sama tidak diulang di atas acara berikutnya.
        self.assertEqual(self.page.locator('[data-event="station"] .date-line').count(), 0)
        self.assertEqual(self.page.locator('[data-event="shift"] .date-line').count(), 1)

    def test_year_view_shows_forty_years_and_jumps(self):
        self.open('#baca-8')
        self.page.locator('#monthButton').click()
        self.assertEqual(self.page.locator('#yearsGrid .yr').count(), 41)
        self.assertEqual(self.page.locator('#yearsGrid [data-year="2024"] .dec').get_attribute('class'), 'dec s-planned')
        self.page.locator('#yearsGrid [data-year="2000"]').click()
        self.assertFalse(self.page.locator('#yearsDialog').evaluate('(d) => d.open'))
        self.assertEqual(self.page.locator('#years').input_value(), '2000')
        self.assertIn('2000', self.page.locator('#rcDate').inner_text())
        self.go(43)
        self.page.locator('#viewChip').click()
        self.assertEqual(self.page.locator('#yearsGrid [data-year="2024"] .dec').get_attribute('class'), 'dec s-cancel')
        self.assertEqual(self.page.locator('#yearsGrid [data-year="1999"] .dec').get_attribute('class'), 'dec s-moved')
        self.assertIn('40', self.page.locator('#yearsStats').inner_text())

    def test_the_task_cannot_be_ticked_and_the_card_can_be_swiped(self):
        self.open('#baca-17')
        self.page.locator('#rcTask').click()
        self.assertTrue(self.page.locator('#rcGate').inner_text().startswith('Sebab gerbang akan mendeteksinya'))
        self.assertIn(self.page.locator('#rcGate').inner_text().rstrip('.'), self.body()[15])
        self.page.wait_for_function("document.querySelector('#years').value === '1986'")
        card = self.page.locator('#reschedCard').bounding_box()
        y = card['y'] + 20
        self.page.mouse.move(card['x'] + 30, y); self.page.mouse.down(); self.page.mouse.move(card['x'] + 140, y, steps=6); self.page.mouse.up()
        self.assertEqual(self.page.locator('#years').input_value(), '1987')
        self.assertIn('3×', self.page.locator('#rcLog').inner_text())

    def test_the_room_stands_with_the_story(self):
        self.seed("localStorage.setItem('jm:mimpi:rsvp', JSON.stringify('hadir'))")
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(('?lang=en' if lang == 'en' else '') + '#baca-52')
                hall = self.page.locator('#hall')
                self.assertEqual(hall.get_attribute('data-state'), 'dark')
                self.go(57)
                self.assertEqual(hall.get_attribute('data-state'), 'first')
                self.assertEqual(self.page.locator('#hall .seats i.up').count(), 1)
                self.go(58)
                self.assertEqual(hall.get_attribute('data-state'), 'clap')
                self.go(61)
                self.assertEqual(hall.get_attribute('data-state'), 'all')
                self.assertEqual(self.page.locator('#hall .seats i.up').count(), 96)
                self.assertEqual(self.page.locator('#hallStatus').inner_text(), 'Seluruh ruangan berdiri' if lang == 'id' else 'The whole room is standing')

    # Umum

    def test_bookmark_and_language_switch_keep_the_paragraph(self):
        self.open('#baca-20')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:places')).id.paragraph"), 20)
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#baca-20')
        self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")
        self.assertEqual(self.page.locator('#monthTitle').inner_text(), 'January 2024')

    def test_layout_fits_every_screen_and_respects_reduced_motion(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-17', '#baca-51']:
                with self.subTest(width=width, fragment=fragment):
                    self.page.set_viewport_size({'width': width, 'height': 844})
                    self.open(fragment)
                    self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                    self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-calm")'))
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#motion').is_disabled())
                    self.page.keyboard.press('Escape')
                    self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openSettings')

    def test_preview_does_not_write_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#baca-51')
        self.page.locator('[data-rsvp="hadir"]').click()
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'mimpi:places', 'mimpi:rsvp']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_missing_calendar_module_keeps_the_story(self):
        self.context.route('**/pabrik-mimpi/kalender.js*', lambda route: route.abort())
        self.open()
        self.assertEqual(self.page.locator('.passage').all_text_contents(), [p.replace('*', '') for p in self.body() if p.strip() != '***'])

    def test_theme_follows_the_site_choice(self):
        self.open()
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
