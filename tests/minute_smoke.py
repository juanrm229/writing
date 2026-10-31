"""Browser checks for Terlambat Satu Menit: python3 tests/minute_smoke.py.

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
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text()) if w['slug'] == 'terlambat-satu-menit')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(6000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')

    def go(self, side, paragraph):
        self.page.evaluate('(hash) => location.hash = hash', f'{side}-{paragraph}')
        self.page.wait_for_function('(side) => document.documentElement.dataset.side === side', arg=side)
        self.page.wait_for_function('''(p) => {
          const r = document.querySelector('#p-' + p).getBoundingClientRect();
          const line = innerWidth <= 800 ? document.querySelector('#stage').getBoundingClientRect().bottom + 18 : document.querySelector('#topbar').getBoundingClientRect().bottom + 28;
          const aligned = Math.abs(r.top - line) < 1;
          const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
          return aligned || atEnd && r.top >= 58 && r.bottom < innerHeight;
        }''', arg=paragraph)

    def saved(self, side='a', lang='id'):
        return self.page.evaluate('([lang, side]) => JSON.parse(localStorage.getItem("jm:minute:places") || "{}")[lang]?.[side]', [lang, side])

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

    def test_bookmark_survives_font_screen_and_cover_changes(self):
        self.context.add_init_script("""
          if (!localStorage.getItem('seeded')) {
            localStorage.setItem('jm:minute:places', JSON.stringify({id:{a:{paragraph:20,offset:.35,progress:.3}}}));
            localStorage.setItem('seeded','true');
          }
        """)
        self.open('#a')
        self.page.locator('#resume').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:minute:places')).id.a.paragraph === 20")
        self.page.locator('#openSettings').click()
        self.page.locator('#bigger').click()
        self.page.keyboard.press('Escape')
        self.page.set_viewport_size({'width': 1440, 'height': 1000})
        self.page.wait_for_function("Math.abs((document.querySelector('#topbar').getBoundingClientRect().bottom + 28 - document.querySelector('#p-20').getBoundingClientRect().top) / document.querySelector('#p-20').getBoundingClientRect().height - .35) < .04")
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
        self.assertTrue(self.page.evaluate("typeof MinuteSound === 'function'"))
        self.assertTrue(self.page.evaluate("typeof MinuteTraces === 'function'"))
        self.page.locator('#openTraces').click()
        self.assertTrue(self.page.locator('#tracesDialog').evaluate('(e) => e.open'))

    def test_preview_is_readable_without_overwriting_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#b-35')
        self.assertEqual(self.page.locator('#sideTitle').inner_text(), self.work['sides'][0]['title'])
        self.page.wait_for_timeout(450)
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:prog')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:read')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:places')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:recognition')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:crossings')"))
        self.read_range('b', 28, 31)
        self.page.locator('#openTraces').click()
        self.assertTrue(self.page.locator('[data-open-trace="banyu-silence"]').is_visible())
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:traces')"))

    def test_layout_is_minimal_responsive_and_respects_reduced_motion(self):
        for width in [320, 390, 1440]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': 844})
                self.open('#b-53')
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-calm")'))
                self.page.locator('#openParts').click()
                self.page.keyboard.press('Escape')
                self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openParts')

                self.page.locator('#openTraces').click()
                self.assertFalse(self.page.locator('#tracesDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                self.page.keyboard.press('Escape')
                self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openTraces')
                self.page.locator('#openSettings').click()
                self.assertTrue(self.page.locator('#motion').is_disabled())
                self.assertFalse(self.page.locator('#settingsDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                self.page.keyboard.press('Escape')

    def test_sound_requires_consent_and_stops_when_the_tab_is_hidden(self):
        self.context.add_init_script("""
          window.contexts=[]; const Audio=window.AudioContext;
          window.AudioContext=class extends Audio { constructor(...a) { super(...a); contexts.push(this); } };
          const connect=AudioNode.prototype.connect;
          AudioNode.prototype.connect=function(target,...a) {
            const result=connect.call(this,target,...a);
            if(target instanceof AudioDestinationNode) { window.out=target.context.createAnalyser(); out.fftSize=2048; connect.call(this,out); }
            return result;
          };
          window.peak=()=>{if(!window.out)return 0; const data=new Float32Array(out.fftSize); out.getFloatTimeDomainData(data); return Math.max(...data.map(Math.abs));};
        """)
        self.open('#b-12')
        self.assertEqual(self.page.evaluate('contexts.length'), 0)
        self.page.locator('#openSettings').click(); self.page.locator('#sound').click()
        self.page.wait_for_function("contexts[0]?.state==='running' && peak()>.00001")
        self.assertLess(self.page.evaluate('peak()'), .2)
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='suspended'")
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='running'")
        self.page.locator('#sound').click(); self.page.wait_for_function("contexts[0].state==='suspended'")
        self.assertEqual(self.page.locator('#sound').get_attribute('aria-pressed'), 'false')

    def test_missing_sound_module_does_not_block_the_story(self):
        self.context.route('**/terlambat-satu-menit/sound.js', lambda route: route.abort())
        self.open('#a-18')
        self.assertIn('kancing', self.page.locator('#p-18').inner_text())
        self.page.locator('#openSettings').click()
        self.assertTrue(self.page.locator('#sound').is_disabled())


    def read_range(self, side, start, end):
        self.go(side, start)
        for p in range(start, end + 1):
            node = self.page.locator('#p-' + str(p))
            if node.count():
                node.evaluate('(e) => scrollTo({top: scrollY + e.getBoundingClientRect().bottom - innerHeight + 44, behavior: "instant"})')
                self.page.wait_for_timeout(35)

    def unlock_meeting(self):
        self.open('#b-12')
        self.read_range('b', 12, 13)
        self.read_range('c', 45, 55)
        self.page.wait_for_function("!document.querySelector('[data-crossing=meeting]').hidden")

    def test_contacts_open_all_three_original_sides_without_illustrations(self):
        self.open()
        self.assertEqual(self.page.locator('main img, main canvas, main svg').count(), 0)
        self.page.locator('#openParts').click()
        self.assertEqual(self.page.locator('.part-link b').all_text_contents(), ['Saman', 'Banyu', 'Maryam'])
        self.page.locator('[data-side="2"]').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'), 'c')
        self.assertEqual(self.page.locator('#contactObserver').inner_text(), 'Dalam ingatan Maryam')
        self.assertEqual(self.page.locator('#contactName').inner_text(), 'Saman')
        self.page.locator('#begin').click()
        self.assertTrue(self.page.locator('#p-0').evaluate('(e) => e === document.activeElement'))

    def test_saman_loses_the_name_but_presence_grows_in_both_languages(self):
        for lang, greeting, presence in [('id', 55, 66), ('en', 56, 67)]:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#b-51')
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Banyu')
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Anak' if lang == 'id' else 'Son')
                self.go('b', greeting - 1)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Banyu')
                self.go('b', greeting)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Mas' if lang == 'id' else 'Sir')
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Pelanggan' if lang == 'id' else 'Customer')
                self.assertIn('Saman', self.page.locator('#contactObserver').inner_text())
                self.go('b', presence - 1)
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Pelanggan' if lang == 'id' else 'Customer')
                self.go('b', presence)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Mas' if lang == 'id' else 'Sir')
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Datang setiap sore' if lang == 'id' else 'Comes every afternoon')
                self.go('b', 51)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Banyu')

    def test_the_unrecognized_contacts_keep_their_own_perspectives(self):
        for lang, arrival, shelter, departure in [('id',45,48,59),('en',44,47,58)]:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#b-12')
                self.assertNotIn('Maryam', self.page.locator('#contactName').inner_text())
                self.assertIn('Banyu', self.page.locator('#contactObserver').inner_text())
                self.go('c', 15 if lang == 'id' else 14)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Banyu')
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Anak' if lang == 'id' else 'Son')
                self.go('c', arrival)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Anak perantau' if lang == 'id' else 'The wandering boy')
                self.assertIn('Maryam', self.page.locator('#contactObserver').inner_text())
                self.go('c', shelter)
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Tinggal di gudang belakang' if lang == 'id' else 'Stays in the back room')
                self.go('c', departure)
                self.assertEqual(self.page.locator('#contactName').inner_text(), 'Anak perantau' if lang == 'id' else 'The wandering boy')
                self.assertEqual(self.page.locator('#contactRelation').inner_text(), 'Pergi tanpa berpamitan' if lang == 'id' else 'Left without saying goodbye')

    def test_contact_history_contains_only_names_encountered_and_preserves_focus(self):
        self.open('#b-51')
        self.go('b', 55)
        self.page.locator('#openContact').click()
        self.assertEqual(self.page.locator('#contactHistory b').all_text_contents(), ['Banyu', 'Mas'])
        self.assertNotIn('Datang setiap sore', self.page.locator('#contactHistory').inner_text())
        y = self.page.evaluate('scrollY')
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openContact')
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)
        self.go('b', 66)
        self.page.locator('#openContact').click()
        self.assertIn('Datang setiap sore', self.page.locator('#contactHistory').inner_text())
        self.page.locator('[data-history="b-son"]').click()
        self.assertEqual(self.page.locator('#contactName').inner_text(), 'Banyu')
        self.assertFalse(self.page.locator('#contactDialog').evaluate('(e) => e.open'))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.go('b', 66)
        self.page.locator('#openContact').click()
        self.assertIn('Banyu', self.page.locator('#contactHistory').inner_text())

    def test_crossing_requires_both_scenes_and_does_not_unlock_skipped_paragraphs(self):
        self.open('#b-12')
        self.assertTrue(self.page.locator('#opposite').is_hidden())
        self.read_range('b', 12, 13)
        self.go('c', 55)
        self.assertTrue(self.page.locator('[data-crossing="meeting"]').is_hidden())
        self.read_range('c', 45, 55)
        self.assertFalse(self.page.locator('[data-crossing="meeting"]').is_hidden())
        self.assertTrue(self.page.locator('[data-crossing="departure"]').is_hidden())
        self.read_range('c', 58, 65)
        self.assertTrue(self.page.locator('[data-crossing="departure"]').is_hidden())
        self.read_range('b', 14, 15)
        self.assertFalse(self.page.locator('[data-crossing="departure"]').is_hidden())

    def test_crossing_and_return_preserve_both_bookmarks_and_main_history(self):
        self.unlock_meeting()
        self.go('c', 53)
        self.page.wait_for_timeout(420)
        before = self.page.evaluate("({places:localStorage.getItem('jm:minute:places'),stats:localStorage.getItem('jm:stats'),last:localStorage.getItem('jm:last'),prog:localStorage.getItem('jm:prog')})")
        y = self.page.evaluate('scrollY')
        self.page.locator('#opposite').click()
        self.page.wait_for_function("document.documentElement.dataset.side === 'b'")
        self.assertIn('Banyu', self.page.locator('#contactObserver').inner_text())
        self.assertNotIn('Maryam', self.page.locator('#contactName').inner_text())
        self.assertTrue(self.page.locator('#returnCross').is_visible())
        self.page.wait_for_timeout(420)
        during = self.page.evaluate("({places:localStorage.getItem('jm:minute:places'),stats:localStorage.getItem('jm:stats'),last:localStorage.getItem('jm:last'),prog:localStorage.getItem('jm:prog')})")
        self.assertEqual(before, during)
        self.page.locator('#returnCross').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'), 'c')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'p-53')
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)
        self.assertTrue(self.page.locator('#crossStrip').is_hidden())

    def test_crossings_persist_across_visits_and_languages(self):
        self.unlock_meeting()
        self.open('?lang=en#b-13')
        self.assertFalse(self.page.locator('#opposite').is_hidden())
        self.assertEqual(self.page.locator('#opposite').inner_text(), 'See the other side ↔')
        self.page.locator('#opposite').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'), 'c')
        self.assertIn('Maryam', self.page.locator('#contactObserver').inner_text())
        self.assertNotIn('Banyu', self.page.locator('#contactName').inner_text())
        self.page.locator('#returnCross').click()
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'p-13')

    def test_each_side_still_records_completion_in_the_main_site(self):
        self.open()
        for side, length in [('a',72),('b',76),('c',78)]:
            self.go(side, length - 1)
            key = 'terlambat-satu-menit' + (':' + side if side != 'a' else '')
            self.page.wait_for_function('(key) => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes(key)', arg=key)

    def test_the_bell_waits_for_banyus_door_and_does_not_repeat_on_resize(self):
        self.open('#a-69')
        self.page.evaluate("() => { window.calls=[]; MinuteSound.prototype.play=function(kind){calls.push(kind)}; }")
        self.assertEqual(self.page.evaluate('calls'), [])
        self.go('b', 52)
        self.assertEqual(self.page.evaluate('calls'), [])
        self.go('b', 53)
        self.assertEqual(self.page.evaluate('calls'), ['bell'])
        self.page.evaluate("dispatchEvent(new Event('scroll'));dispatchEvent(new Event('resize'))")
        self.assertEqual(self.page.evaluate('calls'), ['bell'])


    def open_trace(self, name):
        self.page.locator('#openTraces').click()
        self.page.locator('[data-open-trace="' + name + '"]').click()

    def read_nodes(self, side, indices):
        for p in indices:
            self.read_range(side, p, p)

    def quote(self, text):
        return '\n'.join(re.findall(r'\*([^*]+)\*', text)) or text

    def test_silence_opens_only_after_its_scene_and_keeps_the_reading_place(self):
        self.open('#a-14')
        self.page.locator('#openTraces').click()
        self.assertEqual(self.page.locator('[data-open-trace]').count(), 0)
        self.page.keyboard.press('Escape')
        self.read_range('a', 12, 14)
        self.assertIsNotNone(self.page.locator('#openTraces').get_attribute('data-new'))
        self.page.wait_for_timeout(420)
        saved = self.saved(); y = self.page.evaluate('scrollY')
        self.open_trace('saman-silence')
        self.assertEqual(self.page.locator('.trace-excerpt').inner_text(), self.quote(self.work['body'][13]))
        self.page.locator('[data-mode="outside"]').click()
        self.assertEqual(self.page.locator('.trace-excerpt').inner_text(), self.work['body'][14])
        self.assertEqual(self.page.locator('[data-mode="outside"]').get_attribute('aria-pressed'), 'true')
        self.assertIsNone(self.page.locator('#openTraces').get_attribute('data-new'))
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openTraces')
        self.assertEqual(saved, self.saved())
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)

    def test_three_silences_use_exact_original_words_in_both_languages(self):
        for lang in ['id', 'en']:
            source = self.work['en'] if lang == 'en' else self.work
            shift = -1 if lang == 'en' else 0
            self.open(f'?lang={lang}#a')
            for name, side, start, end, inside, outside, quoted in [
                ('saman-silence','a',12,14,13,14,True),
                ('banyu-silence','b',28,31,31,30,True),
                ('maryam-silence','c',30+shift,34+shift,31+shift,34+shift,False),
            ]:
                with self.subTest(lang=lang, trace=name):
                    self.read_range(side, start, end)
                    doc = source if side == 'a' else source['sides'][ord(side)-ord('b')]
                    self.open_trace(name)
                    expected = self.quote(doc['body'][inside]) if quoted else doc['body'][inside]
                    self.assertEqual(self.page.locator('.trace-excerpt').inner_text(), expected.replace('*',''))
                    self.page.locator('[data-mode="outside"]').click()
                    self.assertEqual(self.page.locator('.trace-excerpt').inner_text(), doc['body'][outside].replace('*',''))
                    self.page.keyboard.press('Escape')

    def test_one_letter_grows_and_reaches_banyu_without_opening_future_steps(self):
        self.open('#a')
        self.read_range('a',2,2)
        self.open_trace('father-letter')
        self.assertEqual(self.page.locator('[data-step]').count(),1)
        self.assertEqual(self.page.locator('.letter-excerpt').inner_text(),self.quote(self.work['body'][2]))
        self.assertNotIn('Bapak bangga',self.page.locator('#traceDetail').inner_text())
        self.page.keyboard.press('Escape')
        self.read_nodes('a',[56,58])
        self.open_trace('father-letter')
        self.assertEqual(self.page.locator('[data-step]').count(),2)
        self.assertIn('Bapak bangga',self.page.locator('.letter-excerpt').inner_text())
        self.page.locator('[data-step="drawer"]').click()
        self.assertNotIn('Bapak bangga',self.page.locator('.letter-excerpt').inner_text())
        self.page.keyboard.press('Escape')
        self.read_nodes('b',[35,37])
        self.open_trace('father-letter')
        self.assertEqual(self.page.locator('[data-step]').count(),4)
        self.assertEqual(self.page.locator('.letter-excerpt p').all_text_contents(),[self.quote(self.work['sides'][0]['body'][p]) for p in [35,37]])
        self.assertEqual(self.page.locator('.trace-status').inner_text(),'Dibaca Banyu')
        self.page.keyboard.press('Escape')
        self.open('?lang=en#a')
        self.open_trace('father-letter')
        self.assertEqual(self.page.locator('[data-step]').count(),4)
        self.assertEqual(self.page.locator('.letter-excerpt p').all_text_contents(),[self.quote(self.work['en']['sides'][0]['body'][p]) for p in [35,37]])

    def test_reply_and_maryams_letter_do_not_invent_delivery_outcomes(self):
        for lang in ['id','en']:
            source = self.work['en'] if lang == 'en' else self.work
            c = -1 if lang == 'en' else 0
            self.open(f'?lang={lang}#b')
            self.read_range('b',40,43)
            self.open_trace('reply-letter')
            self.assertEqual(self.page.locator('.letter-excerpt p').all_text_contents(),[source['sides'][0]['body'][p].replace('*','') for p in [40,41,42]])
            self.assertEqual(self.page.locator('.trace-status').inner_text(),'Dikirim · penerimaan tidak diceritakan' if lang == 'id' else 'Sent · receipt is not described')
            self.page.keyboard.press('Escape')
            self.read_nodes('c',[70+c,73+c,74+c])
            self.open_trace('mother-letter')
            self.assertEqual(self.page.locator('.letter-excerpt p').all_text_contents(),[source['sides'][1]['body'][p].replace('*','') for p in [70+c,73+c]])
            self.assertEqual(self.page.locator('.trace-status').inner_text(),'Dikirim · penerimaan tidak diketahui' if lang == 'id' else 'Sent · receipt is unknown')
            self.page.keyboard.press('Escape')

    def test_trace_scene_links_return_to_the_same_paragraph_without_overwriting_either_side(self):
        self.open('#a')
        self.read_nodes('b',[35,37])
        self.go('a',20)
        self.page.wait_for_timeout(420)
        y = self.page.evaluate('scrollY')
        before = self.page.evaluate("[localStorage.getItem('jm:minute:places'),localStorage.getItem('jm:stats'),localStorage.getItem('jm:prog'),localStorage.getItem('jm:last')]")
        self.open_trace('father-letter')
        self.page.locator('#traceScene').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'),'b')
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'p-37')
        self.assertTrue(self.page.locator('#returnCross').is_visible())
        self.page.wait_for_timeout(420)
        self.assertEqual(before,self.page.evaluate("[localStorage.getItem('jm:minute:places'),localStorage.getItem('jm:stats'),localStorage.getItem('jm:prog'),localStorage.getItem('jm:last')]"))
        self.page.locator('#returnCross').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'),'a')
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'p-20')
        self.assertAlmostEqual(self.page.evaluate('scrollY'),y,delta=1)
        self.open('#a')
        self.page.wait_for_timeout(420)
        bookmark = self.saved()
        self.open_trace('father-letter')
        self.page.locator('#traceScene').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'),'b')
        self.page.locator('#returnCross').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-side'),'a')
        self.assertEqual(self.page.evaluate('scrollY'),0)
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'begin')
        self.assertEqual(bookmark,self.saved())

    def test_one_more_afternoon_repeats_the_greeting_and_protects_the_bookmark(self):
        self.open('#b-75')
        self.assertTrue(self.page.locator('#returnVisit').is_hidden())
        self.read_nodes('b',[55,66,73,75])
        self.go('a',18)
        self.page.wait_for_timeout(420)
        before = self.saved(); y = self.page.evaluate('scrollY')
        self.open_trace('presence')
        self.assertEqual(self.page.locator('.presence-greeting').inner_text(),self.work['sides'][0]['body'][73])
        self.assertTrue(self.page.locator('#presenceReply').is_hidden())
        self.page.locator('#presenceAnswer').click()
        self.assertEqual(self.page.locator('#presenceReply .trace-excerpt').inner_text(),self.work['sides'][0]['body'][75])
        self.page.locator('#presenceAgain').click()
        self.assertTrue(self.page.locator('#presenceReply').is_hidden())
        self.assertEqual(self.page.locator('.presence-greeting').inner_text(),self.work['sides'][0]['body'][73])
        self.page.keyboard.press('Escape')
        self.assertEqual(before,self.saved())
        self.assertAlmostEqual(self.page.evaluate('scrollY'),y,delta=1)
        self.open('?lang=en#a')
        self.page.locator('#returnVisit').click()
        self.assertEqual(self.page.locator('.presence-greeting').inner_text(),self.work['en']['sides'][0]['body'][74])
        self.page.locator('#presenceAnswer').click()
        self.assertEqual(self.page.locator('#presenceReply .trace-excerpt').inner_text(),self.work['en']['sides'][0]['body'][76])

    def test_missing_traces_module_keeps_the_complete_reader_working(self):
        self.context.route('**/terlambat-satu-menit/traces.js',lambda route:route.abort())
        self.open('#b-55')
        self.assertEqual(self.page.locator('#contactName').inner_text(),'Mas')
        self.assertTrue(self.page.locator('#openTraces').is_disabled())
        self.assertEqual(self.page.locator('.passage').count(),len([p for p in self.work['sides'][0]['body'] if p != '***']))


if __name__ == '__main__':
    unittest.main(verbosity=2)
