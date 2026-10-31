"""Browser checks for Terlambat Satu Menit (Lacak Surat): python3 tests/minute_smoke.py.

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
LINE = 'innerHeight * .5'
NOW = "(() => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })()"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Closing a browser context can cancel a service worker prefetch.


class MinuteSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.root + 'antologi/terlambat-satu-menit/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == 'terlambat-satu-menit')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(6000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    # Bantuan

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        if re.search(r'#[abc]', fragment):
            self.page.wait_for_selector('.passage')
        else:
            self.page.wait_for_function("document.documentElement.dataset.view === 'summary' ? !!document.querySelector('#summaryTitle') : document.documentElement.dataset.view === 'home' && document.querySelector('#resi').value.length > 0")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def seed_done(self, sides='abc'):
        keys = ['terlambat-satu-menit' + ('' if s == 'a' else ':' + s) for s in sides]
        self.seed("localStorage.setItem('jm:stats', JSON.stringify({done: " + json.dumps(keys) + "}));localStorage.setItem('jm:minute:tracked', 'true')")

    def go(self, side, paragraph):
        self.page.evaluate('(hash) => location.hash = hash', f'{side}-{paragraph}')
        self.page.wait_for_function('(side) => document.documentElement.dataset.side === side', arg=side)
        self.page.wait_for_function('''(p) => {
          const r = document.querySelector('#p-' + p).getBoundingClientRect(), line = ''' + LINE + ''';
          return Math.abs(r.top - line) < 1 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
        }''', arg=paragraph)

    def read_range(self, side, start, end):
        self.go(side, start)
        for p in range(start, end + 1):
            node = self.page.locator('#p-' + str(p))
            if node.count():
                node.evaluate('(e) => scrollTo({top: scrollY + e.getBoundingClientRect().bottom - (' + LINE + ') + 2, behavior: "instant"})')
                self.page.wait_for_timeout(35)

    def saved(self, side='a', lang='id'):
        return self.page.evaluate('([lang, side]) => JSON.parse(localStorage.getItem("jm:minute:places") || "{}")[lang]?.[side]', [lang, side])

    def view(self):
        return self.page.locator('html').get_attribute('data-view')

    def stamp(self, p):
        return self.page.locator(f'[data-entry="{p}"] .when time').inner_text()

    def chip(self):
        return self.page.locator('#statusChip').inner_text()

    def beat_p(self, lang, side, marker):
        source = self.work['en'] if lang == 'en' else self.work
        body = ([source] + source['sides'])[side]['body']
        return next(i for i, p in enumerate(body) if marker in p)

    # Naskah dan bacaan

    def test_all_original_paragraphs_are_present_in_both_languages(self):
        for lang in ['id', 'en']:
            source = self.work['en'] if lang == 'en' else self.work
            for side, doc in zip('abc', [source] + source['sides']):
                with self.subTest(lang=lang, side=side):
                    self.open(f'?lang={lang}#{side}')
                    expected = [p.replace('*', '') for p in doc['body'] if p.strip() != '***']
                    self.assertEqual(self.page.locator('.passage').all_text_contents(), expected)
                    self.assertEqual(self.page.locator('html').get_attribute('lang'), lang)
                    self.assertEqual(self.page.locator('#sideTitle').inner_text(), doc.get('sideTitle') or doc['title'])

    def test_bookmark_survives_font_and_screen_changes(self):
        self.seed("localStorage.setItem('jm:minute:places', JSON.stringify({id:{a:{paragraph:20,offset:.35,progress:.3}}}))")
        self.open('#a')
        self.page.locator('#resume').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:minute:places')).id.a.paragraph === 20")
        self.page.locator('#openSettings').click()
        self.page.locator('#bigger').click()
        self.page.keyboard.press('Escape')
        self.page.set_viewport_size({'width': 1440, 'height': 1000})
        self.page.wait_for_function("Math.abs((" + LINE + " - document.querySelector('#p-20').getBoundingClientRect().top) / document.querySelector('#p-20').getBoundingClientRect().height - .35) < .04")
        self.open('#a')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.saved()['paragraph'], 20)
        self.assertAlmostEqual(self.saved()['offset'], .35, delta=.04)

    def test_main_site_links_keep_the_requested_side_and_language(self):
        self.page.goto(self.root + '?lang=en#baca-terlambat-satu-menit:c', wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/terlambat-satu-menit/index.html?lang=en#c')
        self.page.wait_for_selector('.passage')
        self.assertEqual(self.page.locator('#sideTitle').inner_text(), self.work['en']['sides'][1]['title'])
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')

    def test_language_switch_uses_scene_boundaries_and_the_reader_works_offline(self):
        self.open('#c-33')
        self.page.locator('#openSettings').click()
        self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#c-32')
        self.page.wait_for_selector('#p-32')
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')
        self.page.evaluate('navigator.serviceWorker.ready.then(() => true)')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.page.wait_for_function('!!navigator.serviceWorker.controller')
        self.context.set_offline(True)
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.assertEqual(self.page.locator('.passage').count(), len([p for p in self.work['en']['sides'][1]['body'] if p != '***']))
        self.assertTrue(self.page.evaluate("typeof MinuteSound === 'function' && !!window.MinuteTrack"))
        self.assertIn('11', self.chip())

    def test_preview_is_readable_without_overwriting_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#b-35')
        self.assertEqual(self.page.locator('#sideTitle').inner_text(), self.work['sides'][0]['title'])
        self.page.wait_for_timeout(450)
        self.assertEqual(self.stamp(34), self.page.evaluate(NOW))
        for key in ['prog', 'read', 'minute:places', 'minute:scans', 'minute:tracked', 'minute:visits']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)
        self.page.evaluate("location.hash = 'ringkasan'")
        self.page.wait_for_function("document.documentElement.dataset.view === 'summary'")

    def test_layout_fits_every_screen_and_respects_reduced_motion(self):
        self.seed_done()
        for width in [320, 390, 1440]:
            for fragment in ['', '#b-57', '#ringkasan']:
                with self.subTest(width=width, fragment=fragment):
                    self.page.set_viewport_size({'width': width, 'height': 844})
                    self.open(fragment)
                    self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                    self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-calm")'))
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#motion').is_disabled())
                    self.assertFalse(self.page.locator('#settingsDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                    self.page.keyboard.press('Escape')
                    self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openSettings')

    def test_sound_requires_consent_and_stops_when_the_tab_is_hidden(self):
        self.context.add_init_script("""
          window.contexts=[]; const Audio=window.AudioContext;
          window.AudioContext=class extends Audio { constructor(...a) { super(...a); contexts.push(this); } };
        """)
        self.open('#a-2')
        self.assertEqual(self.page.evaluate('contexts.length'), 0)
        self.page.locator('#openSettings').click(); self.page.locator('#sound').click()
        self.page.wait_for_function("contexts[0]?.state==='running'")
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='suspended'")
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='running'")
        self.page.locator('#sound').click(); self.page.wait_for_function("contexts[0].state==='suspended'")
        self.assertEqual(self.page.locator('#sound').get_attribute('aria-pressed'), 'false')

    def test_missing_modules_do_not_block_the_story(self):
        for module in ['sound', 'track']:
            with self.subTest(module=module):
                self.context.close()
                self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce', service_workers='block')
                self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
                self.context.route(f'**/terlambat-satu-menit/{module}.js*', lambda route: route.abort())
                self.page = self.context.new_page(); self.page.on('pageerror', lambda e: self.errors.append(str(e)))
                self.open('#a-18')
                self.assertIn('kancing', self.page.locator('#p-18').inner_text())
                self.assertEqual(self.page.locator('.passage').count(), len([p for p in self.work['body'] if p != '***']))
                if module == 'sound':
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#sound').is_disabled())
                    self.page.keyboard.press('Escape')
                else:
                    self.assertEqual(self.page.locator('.entry-head').count(), 0)

    def test_each_side_still_records_completion_in_the_main_site(self):
        self.open('#a')
        for side, length in [('a', 72), ('b', 76), ('c', 78)]:
            self.go(side, length - 1)
            key = 'terlambat-satu-menit' + (':' + side if side != 'a' else '')
            self.page.wait_for_function('(key) => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes(key)', arg=key)

    # Halaman lacak

    def test_tracking_page_finds_three_shipments_and_remembers_the_search(self):
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_function("document.querySelector('#resi').value === 'SMN 0052 ID'")
        self.assertTrue(self.page.locator('#results').is_hidden())
        self.page.locator('#trackButton').click()
        self.page.wait_for_selector('.ship-card')
        self.assertEqual(self.page.locator('#resultsHead').inner_text(), '3 kiriman ditemukan')
        self.assertEqual(self.page.locator('.ship-card .resi').all_text_contents(), ['SMN 0052 ID', 'SMN 0052 ID', 'MRY 0012 ID'])
        self.assertEqual(self.page.locator('.ship-card .status-chip').all_text_contents(), ['Belum dilacak'] * 3)
        self.assertEqual(self.page.evaluate('document.activeElement.dataset.side'), '0')
        self.page.locator('.ship-card[data-side="2"]').click()
        self.assertEqual(self.view(), 'detail')
        self.assertEqual(self.page.evaluate('location.hash'), '#c')
        self.assertEqual(self.page.locator('#resiBig').inner_text(), 'MRY 0012 ID')
        self.page.locator('#begin').click()
        self.assertTrue(self.page.locator('#p-0').evaluate('(e) => e === document.activeElement'))
        self.read_range('c', 0, 0)
        self.page.locator('#allShipments').click()
        self.assertEqual(self.view(), 'home')
        self.assertTrue(self.page.locator('#results').is_visible())
        self.assertIn('Dihitung: 12 sendok', self.page.locator('.ship-card[data-side="2"] .status-chip').inner_text())

    def test_every_status_marker_points_to_one_original_paragraph(self):
        self.open('#a')
        sides = self.page.evaluate('MinuteTrack.SIDES')
        for lang, li in [('id', 0), ('en', 1)]:
            source = self.work['en'] if lang == 'en' else self.work
            docs = [source] + source['sides']
            for side, data in enumerate(sides):
                positions = []
                for beat in data['beats']:
                    hits = [i for i, p in enumerate(docs[side]['body']) if beat['find'][li] in p]
                    self.assertEqual(len(hits), 1, f"{lang} {side} {beat['find'][li]}: {hits}")
                    positions.append(hits[0])
                self.assertEqual(positions, sorted(positions), f'{lang} {side}')

    def test_reading_scans_each_entry_with_the_readers_own_time(self):
        self.open('#a')
        self.assertEqual(self.stamp(2), '··:··')
        self.read_range('a', 0, 2)
        now = self.page.evaluate(NOW)
        self.assertEqual(self.stamp(2), now)
        self.assertIsNotNone(self.page.locator('[data-entry="2"]').get_attribute('data-scanned'))
        self.assertEqual(self.stamp(30), '··:··')
        scans = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:scans')).id.a")
        self.assertTrue({'0', '1', '2'} <= set(scans))
        self.assertNotIn('30', scans)
        self.assertEqual(self.chip(), 'Tertahan di pengirim')
        self.assertEqual(self.page.locator('.manifest li').count(), 52)
        self.assertEqual(self.page.locator('.stages li[data-current]').inner_text(), 'Disimpan')

    def test_the_status_follows_the_sentence_being_read(self):
        for lang, checks in [('id', [('a', '"Surat itu jatuh', 'Diserahkan ke kotak pos', 'Dikirim'), ('b', 'membalik amplop itu', 'Dibuka', 'Dibuka'), ('c', 'Catatan itu tidak pernah sampai', 'Tertahan · tidak pernah sampai', 'Tertahan')]),
                             ('en', [('a', 'The letter fell into the metal', 'Dropped in the mailbox', 'Posted'), ('c', 'That note never reached Banyu', 'Withheld · never delivered', 'Withheld')])]:
            self.open(f'?lang={lang}#a')
            for side, marker, status, stage in checks:
                with self.subTest(lang=lang, marker=marker):
                    p = self.beat_p(lang, 'abc'.index(side), marker.strip('"'))
                    self.go(side, p)
                    self.assertEqual(self.chip(), status)
                    self.assertEqual(self.page.locator('.stages li[data-current]').inner_text(), stage)

    def test_samans_times_become_unreadable_after_the_days_blur(self):
        self.open('#a')
        self.read_range('a', 58, 62)
        self.assertEqual(self.stamp(58), self.page.evaluate(NOW))
        self.assertEqual(self.stamp(60), '--:--')
        self.assertEqual(self.page.locator('[data-entry="60"] .when small').inner_text(), 'tanggal tidak terbaca')
        self.assertIsNotNone(self.page.locator('[data-entry="60"]').get_attribute('data-fog'))
        self.assertEqual(self.page.locator('#lastScan').inner_text(), 'Pemindaian terakhir --:--')

    def test_maryams_whole_history_freezes_on_one_minute(self):
        self.seed("localStorage.setItem('jm:minute:scans', JSON.stringify({id:{c:{'0': new Date(2020, 0, 1, 8, 5).getTime(), '1': new Date(2020, 0, 1, 8, 9).getTime()}}}))")
        self.open('#c')
        self.assertEqual(self.stamp(1), '08:09')
        self.read_range('c', 76, 77)
        now = self.page.evaluate(NOW)
        self.assertEqual(self.chip(), 'Jam berhenti')
        self.assertEqual([self.stamp(p) for p in [0, 1, 77]], [now] * 3)
        self.assertIsNotNone(self.page.locator('[data-entry="0"]').get_attribute('data-frozen'))

    def test_proof_of_delivery_names_mas_and_one_minute_of_real_time(self):
        self.open('#b')
        self.assertTrue(self.page.locator('#proof').is_hidden())
        self.read_range('b', 53, 57)
        proof = self.page.locator('#proof')
        self.assertTrue(proof.is_visible())
        self.assertIn('Ditujukan kepada\nBanyu', proof.inner_text())
        self.assertEqual(proof.locator('.received dd').inner_text(), 'Mas')
        stopped, arrived = proof.locator('dd.mono').all_text_contents()
        self.assertEqual(arrived, self.page.evaluate(NOW))
        h1, m1 = map(int, stopped.split(':')); h2, m2 = map(int, arrived.split(':'))
        self.assertEqual((h2 * 60 + m2 - h1 * 60 - m1) % 1440, 1)
        self.assertEqual(proof.locator('.late dd').inner_text(), '1 menit')
        self.assertEqual(self.chip(), 'Terlambat 1 menit')

    def test_tomorrow_is_always_the_estimate_and_return_days_are_logged(self):
        self.seed("localStorage.setItem('jm:stats', JSON.stringify({done: ['terlambat-satu-menit:b']}));localStorage.setItem('jm:minute:visits', JSON.stringify(['2020-01-01', '2020-01-02']))")
        self.open('#b')
        self.read_range('b', 73, 75)
        tomorrow = self.page.evaluate("new Date(Date.now() + 864e5).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })")
        self.assertIn(tomorrow, self.page.locator('.revisits .estimate').inner_text())
        self.assertIn('Estimasi tiba: besok', self.page.locator('.revisits .estimate').inner_text())
        rows = self.page.locator('.revisits li:not(.estimate)')
        self.assertIn('2 Jan 2020', rows.first.inner_text())
        self.assertIn('Datang lagi', rows.first.inner_text())
        visits = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:visits'))")
        self.assertEqual(visits[-1], self.page.evaluate("(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()"))
        self.assertEqual(rows.count(), len(visits) - 1)

    # Isi kiriman

    def italic(self, text):
        return ' '.join(m.strip() for m in re.findall(r'\*([^*]+)\*', text))

    def contents(self):
        self.page.locator('#openContentsMini').click()
        lines = self.page.locator('.letter-line').all_text_contents()
        sealed = self.page.locator('.sealed').count() == 1
        envelope = self.page.locator('.letter-meta div:nth-child(3) dd').inner_text()
        self.page.keyboard.press('Escape')
        return lines, sealed, envelope

    def test_samans_letter_grows_when_he_adds_the_sentence(self):
        body = self.work['body']
        self.open('#a')
        lines, sealed, envelope = self.contents()
        self.assertEqual(lines, [self.italic(body[2])])
        self.assertFalse(sealed)
        self.assertEqual(envelope, 'Di laci')
        self.read_range('a', 55, 56)
        self.assertIsNotNone(self.page.locator('#openContentsMini').get_attribute('class').find('fresh'))
        lines, _, envelope = self.contents()
        self.assertEqual(lines, [self.italic(body[2]), self.italic(body[56])])
        self.page.locator('#openContentsMini').click()
        self.assertEqual(self.page.locator('.letter-line:not(.faded)').all_text_contents(), [self.italic(body[2])])
        self.assertEqual(self.page.locator('.letter-line.faded').all_text_contents(), [self.italic(body[56])])
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openContentsMini')
        self.read_range('a', 58, 58)
        self.assertEqual(self.contents()[2], 'Dikirim')

    def test_banyus_envelope_stays_sealed_until_he_opens_it(self):
        side = self.work['sides'][0]['body']
        self.open('#b-20')
        lines, sealed, envelope = self.contents()
        self.assertEqual((lines, sealed, envelope), ([], True, 'Tertutup'))
        self.read_range('b', 34, 35)
        lines, sealed, envelope = self.contents()
        self.assertEqual((lines, sealed, envelope), ([self.italic(side[35])], False, 'Dibuka'))
        self.read_range('b', 37, 42)
        self.page.locator('#openContentsMini').click()
        self.assertEqual(self.page.locator('#contentsTabs button').all_text_contents(), ['Surat Saman', 'Balasan Banyu'])
        self.assertEqual(self.page.locator('#contentsTabs [aria-pressed="true"]').inner_text(), 'Balasan Banyu')
        self.assertEqual(self.page.locator('.letter-line').all_text_contents(), [self.italic(side[p]) for p in [40, 41, 42]])
        self.page.locator('#contentsTabs [data-tab="saman"]').click()
        self.assertEqual(self.page.locator('.letter-line').all_text_contents(), [self.italic(side[35]), self.italic(side[37])])
        self.page.keyboard.press('Escape')

    def test_maryams_letter_appears_only_as_she_writes_it_in_both_languages(self):
        for lang, start, first, second in [('id', 68, 70, 73), ('en', 67, 69, 72)]:
            with self.subTest(lang=lang):
                body = (self.work['en'] if lang == 'en' else self.work)['sides'][1]['body']
                self.open(f'?lang={lang}#c-{start}')
                self.page.locator('#openContentsMini').click()
                self.assertEqual(self.page.locator('.letter-line').count(), 0)
                self.assertTrue(self.page.locator('.contents-empty').is_visible())
                self.page.keyboard.press('Escape')
                self.read_range('c', first, second)
                lines, _, envelope = self.contents()
                self.assertEqual(lines, [self.italic(body[first]), self.italic(body[second])])
                self.assertEqual(envelope, 'Ditulis' if lang == 'id' else 'Written')

    def test_every_contents_marker_points_to_one_italic_paragraph(self):
        self.open('#a')
        contents = self.page.evaluate('MinuteTrack.CONTENTS')
        for lang, li in [('id', 0), ('en', 1)]:
            source = self.work['en'] if lang == 'en' else self.work
            docs = [source] + source['sides']
            for side, items in enumerate(contents):
                for item in items:
                    for marker in [part['find'] for part in item['parts']] + [m for m in [item.get('sealed'), item.get('sent')] if m]:
                        hits = [p for p in docs[side]['body'] if marker[li] in p]
                        self.assertEqual(len(hits), 1, f'{lang} {side} {marker[li]}')
                    for part in item['parts']:
                        self.assertTrue(self.italic(next(p for p in docs[side]['body'] if part['find'][li] in p)))

    # Ringkasan

    def test_summary_waits_for_all_three_histories(self):
        self.seed_done('ab')
        self.open('#ringkasan')
        self.assertEqual(self.view(), 'home')
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertEqual(self.page.locator('#openSummary').count(), 0)
        self.go('c', 77)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats")).done.includes("terlambat-satu-menit:c")')
        self.assertTrue(self.page.locator('#endSummary').is_visible())
        self.page.locator('#endSummary').click()
        self.assertEqual(self.view(), 'summary')
        self.assertEqual(self.page.evaluate('location.hash'), '#ringkasan')

    def test_summary_lists_every_delivery_and_ends_with_the_original_words(self):
        self.seed_done()
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#ringkasan')
                self.assertEqual(self.view(), 'summary')
                self.assertEqual(self.page.locator('.summary-rows li').count(), 5)
                chips = self.page.locator('.summary-rows .status-chip').all_text_contents()
                self.assertEqual(chips[1], 'Tertahan · tidak pernah sampai' if lang == 'id' else 'Withheld · never delivered')
                self.assertEqual(chips[4], 'Diterima oleh: Mas' if lang == 'id' else 'Received by: Sir')
                source = self.work['en'] if lang == 'en' else self.work
                body = source['sides'][0]['body']
                markers = ['Besok datang lagi ya', 'Besok aku datang lagi'] if lang == 'id' else ['Come again tomorrow', "Tomorrow I'll come again"]
                self.assertEqual(self.page.locator('.coda blockquote').all_text_contents(), [next(p for p in body if m in p).replace('*', '') for m in markers])
        self.page.locator('#trackAgain').click()
        self.assertEqual(self.view(), 'home')

    # Tema

    def paper(self):
        return self.page.evaluate("getComputedStyle(document.body).backgroundColor")

    def test_theme_follows_the_site_choice_then_the_device(self):
        self.open('#a')
        light = self.paper()
        self.page.emulate_media(color_scheme='dark')
        self.page.wait_for_timeout(200)
        dark = self.paper()
        self.assertNotEqual(light, dark)
        self.assertEqual(self.page.locator('#theme').get_attribute('aria-pressed'), 'true')
        self.page.evaluate("""() => { localStorage.setItem('jm:theme', JSON.stringify('light'));
          dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }""")
        self.page.wait_for_timeout(200)
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')
        self.assertEqual(self.paper(), light)
        self.page.locator('#openSettings').click()
        self.page.locator('#theme').click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:theme'))"), 'dark')
        self.page.keyboard.press('Escape')
        self.page.emulate_media(color_scheme='light')
        self.page.wait_for_timeout(200)
        self.assertEqual(self.paper(), dark)

    def test_admin_theme_applies_when_the_reader_has_not_chosen(self):
        self.context.route('**/content/site.json', lambda route: route.fulfill(json={'theme': 'gelap'}))
        self.open('#b')
        self.page.wait_for_function("document.documentElement.getAttribute('data-theme') === 'dark'")
        self.page.evaluate("localStorage.setItem('jm:theme', JSON.stringify('light'))")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.page.wait_for_timeout(400)
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')


if __name__ == '__main__':
    unittest.main(verbosity=2)
