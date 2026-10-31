"""Browser checks for Terlambat Satu Menit (Satu Menit): python3 tests/minute_smoke.py.

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
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
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
        if re.search(r'#[abc]', fragment):
            self.page.wait_for_selector('.passage')
        else:
            self.page.wait_for_function("['dial', 'final'].includes(document.documentElement.dataset.view)")

    def go(self, side, paragraph):
        self.page.evaluate('(hash) => location.hash = hash', f'{side}-{paragraph}')
        self.page.wait_for_function('(side) => document.documentElement.dataset.side === side', arg=side)
        self.page.wait_for_function('''(p) => {
          const r = document.querySelector('#p-' + p).getBoundingClientRect();
          const line = document.querySelector('#topbar').getBoundingClientRect().bottom + 28;
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
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:bottle')"))
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
                self.assertFalse(self.page.locator('#openSettings').evaluate('(e) => e.getBoundingClientRect().right > innerWidth'))
                self.page.locator('#openParts').click()
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.page.locator('.hand-link[data-side="1"]').click()
                self.page.wait_for_selector('.passage')

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
        self.assertTrue(self.page.locator('#openTraces').is_disabled())
        self.assertEqual(self.page.locator('.passage').count(),len([p for p in self.work['sides'][0]['body'] if p != '***']))

    # Satu Menit: muka jam, botol kaca, dan satu menit terakhir.

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def seed_done(self, sides='abc'):
        keys = ['terlambat-satu-menit' + ('' if s == 'a' else ':' + s) for s in sides]
        self.seed("localStorage.setItem('jm:stats', JSON.stringify({done: " + json.dumps(keys) + "}))")

    def angles(self, selector='#face'):
        return self.page.evaluate(r'''(sel) => [...document.querySelectorAll(sel + ' .hand')].map(h => {
          const m = /rotate\(([-\d.]+)\)/.exec(h.getAttribute('transform') || ''); return m ? +m[1] : 0; })''', selector)

    def view(self):
        return self.page.locator('html').get_attribute('data-view')

    def scrub(self, second):
        self.page.evaluate("(v) => { const s = document.querySelector('#seconds'); s.value = v; s.dispatchEvent(new Event('input')); }", second)

    def located(self, lang, entry):
        source = self.work['en'] if lang == 'en' else self.work
        body = ([source] + source['sides'])[entry['side']]['body']
        out = []
        for pair in entry['find']:
            hits = [i for i, p in enumerate(body) if pair[1 if lang == 'en' else 0] in p]
            self.assertTrue(hits, f'{lang}: {pair}')
            if hits[0] not in out:
                out.append(hits[0])
        return [body[i].replace('*', '') for i in out]

    def test_the_clock_face_is_the_cover_and_each_hand_opens_its_side(self):
        self.open()
        self.assertEqual(self.view(), 'dial')
        self.assertEqual(self.page.locator('.hand-link b').all_text_contents(), ['Saman', 'Banyu', 'Maryam'])
        self.assertEqual(self.page.locator('.hand-link small').all_text_contents(), ['Jarum jam · Bidak', 'Jarum menit · Alamat yang Tertukar', 'Jarum detik · Perempuan yang Menghitung Mundur'])
        self.assertEqual(self.angles(), [0, 0, 0])
        self.assertTrue(self.page.locator('#toFinal').is_hidden())
        self.page.locator('.hand-link[data-side="2"]').click()
        self.assertEqual(self.view(), 'read')
        self.assertEqual(self.page.locator('html').get_attribute('data-side'), 'c')
        self.assertEqual(self.page.evaluate('location.hash'), '#c')
        self.page.locator('#begin').click()
        self.assertTrue(self.page.locator('#p-0').evaluate('(e) => e === document.activeElement'))
        self.page.locator('#openParts').click()
        self.assertEqual(self.view(), 'dial')
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertEqual(self.page.evaluate('document.activeElement.dataset.side'), '0')

    def test_hands_follow_reading_and_stop_one_minute_before_twelve(self):
        self.seed("localStorage.setItem('jm:prog', JSON.stringify({'terlambat-satu-menit:b': .5}));"
                  "localStorage.setItem('jm:stats', JSON.stringify({done: ['terlambat-satu-menit']}))")
        self.open()
        a, b, c = self.angles()
        self.assertAlmostEqual(a, 354, delta=.01)
        self.assertAlmostEqual(b, 177, delta=.01)
        self.assertEqual(c, 0)
        self.assertEqual(self.page.locator('.hand-state').all_text_contents(), ['terbaca', '50%', 'belum'])
        self.open('#a-30')
        mini = self.angles('#miniDial')
        self.assertAlmostEqual(mini[1], 177, delta=.01)
        self.assertEqual(self.page.locator('#miniDial .hand.current').get_attribute('data-hand'), 'a')
        self.assertTrue(0 < mini[0] < 354)

    def test_the_last_minute_waits_for_all_three_hands(self):
        self.seed_done('ab')
        self.page.goto(self.url + '#menit', wait_until='domcontentloaded')
        self.page.wait_for_function("document.documentElement.dataset.view === 'dial'")
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertTrue(self.page.locator('#toFinal').is_hidden())
        self.assertIn('ketiga jarum', self.page.locator('#dialNote').inner_text())
        self.go('c', 77)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats")).done.includes("terlambat-satu-menit:c")')
        self.assertTrue(self.page.locator('#endFinal').is_visible())
        self.page.locator('#endFinal').click()
        self.assertEqual(self.view(), 'final')
        self.assertEqual(self.page.evaluate('location.hash'), '#menit')

    def test_the_bottle_keeps_only_unspoken_italics_that_were_seen(self):
        self.open('#a')
        self.assertEqual(self.page.locator('#shelfBottle .gear').count(), 0)
        self.read_range('a', 12, 13)
        self.page.wait_for_function("document.querySelectorAll('#shelfBottle .gear').length === 1")
        bottle = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:bottle'))")
        # "Bapak, aku pergi ya" diucapkan Banyu; hanya kalimat yang ditelan Saman menjadi gir.
        self.assertEqual(bottle['held'], ['id:0:13:0'])
        self.read_range('a', 27, 27)
        bottle = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:bottle'))")
        self.assertEqual(bottle['held'], ['id:0:13:0'])
        self.assertIn('id:0:27', bottle['spoken'])
        self.assertIn('1 gir', self.page.locator('#shelfBottle').get_attribute('aria-label'))
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.assertTrue(self.page.locator('#miniBottle').is_visible())
        self.assertEqual(self.page.locator('#miniBottle .gear').count(), 1)
        self.open('?lang=en#a')
        self.assertEqual(self.page.locator('#shelfBottle .gear').count(), 0)

    def test_the_last_minute_uses_original_paragraphs_in_both_languages(self):
        self.seed_done()
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#menit')
                self.assertEqual(self.view(), 'final')
                script = self.page.evaluate('MinuteFinal.script')
                moments = self.page.locator('.moment')
                self.assertEqual(moments.count(), len(script['SCRIPT']))
                for i, entry in enumerate(script['SCRIPT']):
                    self.assertEqual(moments.nth(i).locator('p').all_text_contents(), self.located(lang, entry))
                self.assertEqual(self.page.locator('.moment[data-pending]').count(), len(script['SCRIPT']) - 1)
                self.scrub(59)
                self.assertTrue(self.page.locator('[data-bell]').evaluate('(e) => e.hasAttribute("data-pending")'))
                self.assertTrue(self.page.locator('#after').is_hidden())
                self.scrub(60)
                self.assertFalse(self.page.locator('[data-bell]').evaluate('(e) => e.hasAttribute("data-pending")'))
                self.assertEqual([round(a) % 360 for a in self.angles('#finalClock')], [0, 0, 0])
                self.assertTrue(self.page.locator('#after').is_hidden())
                self.scrub(61)
                self.assertEqual(self.page.locator('#after p').all_text_contents(), self.located(lang, script['AFTER']))
                coda = [self.located(lang, entry)[0] for entry in script['CODA']]
                self.assertEqual(self.page.locator('.coda blockquote').all_text_contents(), coda)
                self.assertTrue(self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:finale'))"))

    def test_the_bottle_opens_after_the_bell_and_the_clock_runs_again(self):
        self.seed("localStorage.setItem('jm:stats', JSON.stringify({done: ['terlambat-satu-menit','terlambat-satu-menit:b','terlambat-satu-menit:c']}));"
                  "localStorage.setItem('jm:minute:bottle', JSON.stringify({held: ['id:0:13:0','id:1:40:0','en:1:40:0'], spoken: ['id:1:73','id:1:75','id:2:18']}))")
        self.open('#menit')
        self.scrub(61)
        self.assertEqual(self.page.locator('#revealCount').inner_text(), '2 gir')
        self.assertEqual(self.page.locator('#revealSpoken').inner_text(), 'Kalimat yang diucapkan keras-keras: 4.')
        self.assertEqual(self.page.locator('#revealBottle .gear').count(), 2)
        self.page.locator('.bottle-reveal summary').click()
        expected = [re.findall(r'\*([^*]+)\*', self.work['body'][13])[0], re.findall(r'\*([^*]+)\*', self.work['sides'][0]['body'][40])[0]]
        self.assertEqual(self.page.locator('.gear-list q').all_text_contents(), expected)
        self.page.locator('#toDial').click()
        self.assertEqual(self.view(), 'dial')
        self.assertEqual(self.page.locator('html').get_attribute('data-time'), 'free')
        self.assertEqual(self.page.locator('#dialNote').inner_text(), 'Jamnya berjalan lagi.')
        now = self.page.evaluate('(() => { const d = new Date(); return [d.getHours() % 12 * 30 + d.getMinutes() / 2, d.getMinutes() * 6]; })()')
        a, b, _ = self.angles()
        self.assertAlmostEqual(a, now[0], delta=2)
        self.assertAlmostEqual(b % 360, now[1], delta=7)
        self.assertIn('Ulangi', self.page.locator('#toFinal').inner_text())

    def test_the_last_minute_runs_in_real_time_with_ticks_and_one_bell(self):
        self.seed_done()
        self.open('#menit')
        self.page.evaluate("() => { window.calls = []; MinuteSound.prototype.play = function (kind) { calls.push(kind) }; }")
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'play')
        self.page.locator('#play').click()
        self.assertEqual(self.page.locator('#play').get_attribute('aria-pressed'), 'true')
        self.page.wait_for_timeout(2300)
        second = int(self.page.locator('#seconds').input_value())
        self.assertIn(second, [2, 3])
        self.assertTrue(self.page.locator('.moment[data-at="0"]').evaluate('(e) => !e.hasAttribute("data-pending")'))
        self.assertTrue(self.page.locator('.moment[data-at="8"]').evaluate('(e) => e.hasAttribute("data-pending")'))
        self.assertIn('tick', self.page.evaluate('calls'))
        self.page.locator('#play').click()
        self.assertEqual(self.page.locator('#play').get_attribute('aria-pressed'), 'false')
        held = self.page.locator('#seconds').input_value()
        self.page.wait_for_timeout(1100)
        self.assertEqual(self.page.locator('#seconds').input_value(), held)
        self.scrub(57)
        self.page.locator('#play').click()
        self.page.wait_for_function("document.querySelector('#seconds').value === '61'", timeout=7000)
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)
        self.assertEqual(self.page.locator('#play').inner_text(), 'Ulangi')
        self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-struck")'))

    def test_missing_finale_module_keeps_the_clock_and_story(self):
        self.seed_done()
        self.context.route('**/terlambat-satu-menit/final.js', lambda route: route.abort())
        self.open()
        self.assertTrue(self.page.locator('#toFinal').is_hidden())
        self.assertEqual(self.page.locator('.hand-link').count(), 3)
        self.open('#c-77')
        self.assertTrue(self.page.locator('#endFinal').is_hidden())

    def paper(self):
        return self.page.evaluate("getComputedStyle(document.body).backgroundColor")

    def test_theme_follows_the_site_choice_then_the_device(self):
        light, dark = 'rgb(247, 247, 244)', 'rgb(18, 20, 18)'
        self.open('#a')
        self.page.wait_for_timeout(350)
        self.assertEqual(self.paper(), light)
        self.page.emulate_media(color_scheme='dark')
        self.page.wait_for_timeout(350)
        self.assertEqual(self.paper(), dark)
        self.assertEqual(self.page.locator('#theme').get_attribute('aria-pressed'), 'true')
        self.assertEqual(self.page.locator('meta[name="theme-color"]').first.get_attribute('content'), '#121412')
        # Pilihan di situs utama (jm:theme) menang atas perangkat, juga dari tab lain.
        self.page.evaluate("""() => { localStorage.setItem('jm:theme', JSON.stringify('light'));
          dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }""")
        self.page.wait_for_timeout(350)
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'light')
        self.assertEqual(self.paper(), light)
        self.page.locator('#openSettings').click()
        self.page.locator('#theme').click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:theme'))"), 'dark')
        self.page.keyboard.press('Escape')
        self.page.emulate_media(color_scheme='light')
        self.open('#menit')
        self.page.wait_for_timeout(350)
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')
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
