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
LINE = "innerHeight * (matchMedia('(max-width: 900px)').matches ? .56 : .45)"


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
            self.page.wait_for_function("['cover', 'final'].includes(document.documentElement.dataset.view) && !!document.querySelector('#hands .hand-link, #timeline li')")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def seed_done(self, sides='abc'):
        keys = ['terlambat-satu-menit' + ('' if s == 'a' else ':' + s) for s in sides]
        self.seed("localStorage.setItem('jm:stats', JSON.stringify({done: " + json.dumps(keys) + "}))")

    def go(self, side, paragraph):
        self.page.evaluate('(hash) => location.hash = hash', f'{side}-{paragraph}')
        self.page.wait_for_function('(side) => document.documentElement.dataset.side === side', arg=side)
        self.page.wait_for_function('''(p) => {
          const r = document.querySelector('#p-' + p).getBoundingClientRect(), line = ''' + LINE + ''';
          return Math.abs(r.top - line) < 1 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
        }''', arg=paragraph)

    def step_to(self, paragraph):
        """Gulir pelan sampai paragraf menyentuh garis baca, seperti pembaca sungguhan."""
        for _ in range(80):
            done = self.page.evaluate('''(p) => { const r = document.querySelector('#p-' + p).getBoundingClientRect(), line = ''' + LINE + ''';
              if (r.top <= line) return true; scrollBy(0, Math.min(140, r.top - line + 1)); return false; }''', paragraph)
            self.page.wait_for_timeout(30)
            if done:
                break

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

    def angles(self, selector='#giant'):
        return self.page.evaluate(r'''(sel) => [...document.querySelectorAll(sel + ' .hand')].map(h => {
          const m = /rotate\(([-\d.]+)\)/.exec(h.getAttribute('transform') || ''); return m ? +m[1] : 0; })''', selector)

    def scene(self, key):
        return self.page.locator('#scene svg').get_attribute('data-' + key)

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

    def record_sounds(self):
        self.page.evaluate("() => { window.calls = []; MinuteSound.prototype.play = function (kind) { calls.push(kind) }; }")

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
        for name in ['MinuteSound', 'MinuteClock', 'MinuteWorld', 'MinuteFinal']:
            self.assertTrue(self.page.evaluate(f"typeof {name} === 'function'"), name)
        self.assertEqual(self.scene('spoons'), '11')

    def test_preview_is_readable_without_overwriting_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#b-35')
        self.assertEqual(self.page.locator('#sideTitle').inner_text(), self.work['sides'][0]['title'])
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'minute:places', 'minute:bottle', 'minute:finale']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)
        self.page.evaluate("location.hash = 'menit'")
        self.page.wait_for_function("document.documentElement.dataset.view === 'final'")

    def test_layout_fits_every_screen_and_respects_reduced_motion(self):
        self.seed_done()
        for width in [320, 390, 1440]:
            for fragment in ['', '#b-53', '#menit']:
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
            self.scrub(61)
            self.page.wait_for_timeout(100)
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))

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
        self.open('#c-50')
        self.assertEqual(self.page.evaluate('contexts.length'), 0)
        self.page.locator('#openSettings').click(); self.page.locator('#sound').click()
        self.page.wait_for_function("contexts[0]?.state==='running' && peak()>.00001")
        self.assertLess(self.page.evaluate('peak()'), .5)
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='suspended'")
        self.page.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("contexts[0].state==='running'")
        self.page.locator('#sound').click(); self.page.wait_for_function("contexts[0].state==='suspended'")
        self.assertEqual(self.page.locator('#sound').get_attribute('aria-pressed'), 'false')

    def test_missing_modules_do_not_block_the_story(self):
        for module in ['sound', 'world', 'final']:
            with self.subTest(module=module):
                self.context.unroute_all()
                self.context.route(f'**/terlambat-satu-menit/{module}.js*', lambda route: route.abort())
                self.open('#a-18')
                self.assertIn('kancing', self.page.locator('#p-18').inner_text())
                self.assertEqual(self.page.locator('.passage').count(), len([p for p in self.work['body'] if p != '***']))
                if module == 'sound':
                    self.page.locator('#openSettings').click()
                    self.assertTrue(self.page.locator('#sound').is_disabled())
                    self.page.keyboard.press('Escape')
                if module == 'final':
                    self.assertTrue(self.page.locator('#endFinal').is_hidden())

    def test_each_side_still_records_completion_in_the_main_site(self):
        self.open()
        for side, length in [('a', 72), ('b', 76), ('c', 78)]:
            self.go(side, length - 1)
            key = 'terlambat-satu-menit' + (':' + side if side != 'a' else '')
            self.page.wait_for_function('(key) => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes(key)', arg=key)

    # Muka jam

    def test_the_clock_face_is_the_cover_and_each_hand_opens_its_side(self):
        self.open()
        self.assertEqual(self.view(), 'cover')
        self.assertEqual(self.page.locator('.hand-name').all_text_contents(), ['Saman', 'Banyu', 'Maryam'])
        self.assertEqual(self.page.locator('.hand-meta').all_text_contents(), ['Jarum jam · Bidak', 'Jarum menit · Alamat yang Tertukar', 'Jarum detik · Perempuan yang Menghitung Mundur'])
        self.assertEqual(self.angles(), [0, 0, 0])
        self.assertTrue(self.page.locator('#toFinal').is_hidden())
        self.page.locator('.hand-link[data-side="2"]').click()
        self.assertEqual(self.view(), 'read')
        self.assertEqual(self.page.locator('html').get_attribute('data-side'), 'c')
        self.assertEqual(self.page.evaluate('location.hash'), '#c')
        self.page.locator('#begin').click()
        self.assertTrue(self.page.locator('#p-0').evaluate('(e) => e === document.activeElement'))
        self.page.locator('#openParts').click()
        self.assertEqual(self.view(), 'cover')
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertEqual(self.page.evaluate('document.activeElement.dataset.side'), '0')

    def test_scrolling_moves_the_readers_hand_and_finished_hands_stop_short(self):
        self.seed("localStorage.setItem('jm:prog', JSON.stringify({'terlambat-satu-menit:b': .5}));"
                  "localStorage.setItem('jm:stats', JSON.stringify({done: ['terlambat-satu-menit']}))")
        self.open()
        a, b, c = self.angles()
        self.assertAlmostEqual(a, 354, delta=.01)
        self.assertAlmostEqual(b, 177, delta=.01)
        self.assertEqual(c, 0)
        self.assertEqual(self.page.locator('.hand-state').all_text_contents(), ['berhenti', '50%'])
        self.open('#c-10')
        early = self.angles()[2]
        self.go('c', 60)
        late = self.angles()[2]
        self.assertTrue(0 < early < late < 354, (early, late))
        self.assertEqual(self.page.locator('#giant .hand.current').get_attribute('data-hand'), 'c')
        self.assertAlmostEqual(self.angles('#miniDial')[2], late, delta=.01)

    # Dunia di balik teks

    def test_every_scene_marker_points_to_one_original_paragraph(self):
        self.open()
        beats = self.page.evaluate('MinuteWorld.BEATS')
        for lang in ['id', 'en']:
            source = self.work['en'] if lang == 'en' else self.work
            docs = [source] + source['sides']
            for side, lst in enumerate(beats):
                positions = []
                for beat in lst:
                    marker = beat['find'][1 if lang == 'en' else 0]
                    hits = [i for i, p in enumerate(docs[side]['body']) if marker in p]
                    self.assertEqual(len(hits), 1, f'{lang} {side} {marker}: {hits}')
                    positions.append(hits[0])
                self.assertEqual(positions, sorted(positions), f'{lang} {side}')

    def test_the_world_follows_the_sentence_being_read(self):
        for lang, checks in [('id', [('a', 18, 'king', 'button'), ('a', 25, 'king', 'gone'), ('a', 40, 'king', 'floor'), ('a', 61, 'king', 'button'), ('a', 66, 'pawn', 'moved'),
                                     ('b', 2, 'env', 'down'), ('b', 34, 'env', 'open'), ('b', 37, 'letter', 'extra'), ('c', 33, 'spoons', '11'), ('c', 75, 'spoon', 'stir'), ('c', 77, 'clocks', 'frozen')]),
                             ('en', [('a', 25, 'king', 'gone'), ('a', 68, 'pawn', 'moved'), ('c', 32, 'spoons', '11'), ('c', 76, 'clocks', 'frozen')])]:
            self.open(f'?lang={lang}#a')
            for side, p, key, value in checks:
                with self.subTest(lang=lang, side=side, p=p):
                    self.go(side, p)
                    self.assertEqual(self.scene(key), value)
            self.go('a', 10)
            self.assertEqual(self.scene('king'), 'none')
            self.assertEqual(self.scene('scene'), 'drawer')

    def test_the_bell_rings_once_when_reached_by_reading_but_not_by_jumping(self):
        self.open('#b-10')
        self.record_sounds()
        self.go('b', 60)
        self.assertNotIn('bell', self.page.evaluate('calls'))
        self.go('b', 49)
        self.page.evaluate('calls.length = 0')
        self.step_to(53)
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)
        self.assertEqual(self.page.locator('html').get_attribute('data-jolt'), 'bell')
        self.page.evaluate("dispatchEvent(new Event('scroll')); dispatchEvent(new Event('resize'))")
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)

    def test_the_rat_steals_the_king_with_a_sound_as_you_read(self):
        self.open('#a-23')
        self.record_sounds()
        self.step_to(25)
        self.page.wait_for_timeout(100)
        self.assertIn('scatter', self.page.evaluate('calls'))
        self.assertEqual(self.scene('pieces'), 'scattered')

    def test_samans_fog_blurs_only_what_was_already_read(self):
        context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='no-preference')
        context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page = context.new_page()
        page.goto(self.url + '#a-30', wait_until='domcontentloaded'); page.wait_for_selector('.passage')
        page.wait_for_timeout(200)
        self.assertEqual(page.evaluate("[...document.querySelectorAll('.passage')].filter(p => p.style.filter).length"), 0)
        page.evaluate("location.hash = 'a-71'"); page.wait_for_timeout(300)
        self.assertEqual(page.locator('html').get_attribute('data-fog'), 'on')
        self.assertIn('blur', page.locator('#p-69').evaluate('(e) => e.style.filter'))
        self.assertEqual(page.locator('#p-71').evaluate('(e) => e.style.filter'), '')
        page.locator('#openSettings').click(); page.locator('#motion').click(); page.keyboard.press('Escape')
        page.evaluate("dispatchEvent(new Event('scroll'))"); page.wait_for_timeout(150)
        self.assertEqual(page.locator('#p-69').evaluate('(e) => e.style.filter'), '')
        context.close()

    # Botol kaca

    def test_the_bottle_keeps_only_unspoken_italics_that_were_seen(self):
        self.open('#a')
        self.assertEqual(self.page.locator('#miniBottle .gear').count(), 0)
        self.read_range('a', 12, 13)
        self.page.wait_for_function("document.querySelectorAll('#miniBottle .gear').length === 1")
        bottle = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:bottle'))")
        # "Bapak, aku pergi ya" diucapkan Banyu; hanya kalimat yang ditelan Saman menjadi gir.
        self.assertEqual(bottle['held'], ['id:0:13:0'])
        self.assertEqual(self.page.locator('#p-13 em.held').count(), 1)
        self.read_range('a', 27, 27)
        bottle = self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:bottle'))")
        self.assertEqual(bottle['held'], ['id:0:13:0'])
        self.assertIn('id:0:27', bottle['spoken'])
        self.assertIn('1 gir', self.page.locator('#miniBottle').get_attribute('aria-label'))
        self.open('?lang=en#a')
        self.assertEqual(self.page.locator('#miniBottle .gear').count(), 0)

    # Satu menit terakhir

    def test_the_last_minute_waits_for_all_three_hands(self):
        self.seed_done('ab')
        self.page.goto(self.url + '#menit', wait_until='domcontentloaded')
        self.page.wait_for_function("document.documentElement.dataset.view === 'cover'")
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertTrue(self.page.locator('#toFinal').is_hidden())
        self.assertIn('ketiga jarum', self.page.locator('#coverNote').inner_text())
        self.go('c', 77)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats")).done.includes("terlambat-satu-menit:c")')
        self.assertTrue(self.page.locator('#endFinal').is_visible())
        self.page.locator('#endFinal').click()
        self.assertEqual(self.view(), 'final')
        self.assertEqual(self.page.evaluate('location.hash'), '#menit')

    def test_the_last_minute_uses_original_paragraphs_in_both_languages(self):
        self.seed_done()
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#menit')
                self.assertEqual(self.view(), 'final')
                script = self.page.evaluate('MinuteFinal.script')
                self.assertEqual(self.page.locator('#timeline li').count(), len(script['SCRIPT']))
                for entry in script['SCRIPT']:
                    self.scrub(entry['at'])
                    self.assertEqual(self.page.locator('#momentView .moment p:not(.moment-who)').all_text_contents(), self.located(lang, entry))
                self.scrub(59)
                self.assertIsNone(self.page.locator('html').get_attribute('data-struck'))
                self.scrub(60)
                self.assertIsNotNone(self.page.locator('html').get_attribute('data-struck'))
                self.assertEqual([round(a) % 360 for a in self.angles()], [0, 0, 0])
                self.assertTrue(self.page.locator('#after').is_hidden())
                self.scrub(61)
                self.assertEqual(self.page.locator('.after-text p').all_text_contents(), self.located(lang, script['AFTER']))
                self.assertEqual(self.page.locator('.coda blockquote').all_text_contents(), [self.located(lang, e)[0] for e in script['CODA']])
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
        self.assertEqual(self.view(), 'cover')
        self.assertTrue(self.page.locator('html').evaluate('(e) => e.hasAttribute("data-free")'))
        self.assertEqual(self.page.locator('#coverNote').text_content(), 'Jamnya berjalan lagi.')
        now = self.page.evaluate('(() => { const d = new Date(); return [d.getHours() % 12 * 30 + d.getMinutes() / 2, d.getMinutes() * 6]; })()')
        a, b, _ = self.angles()
        self.assertAlmostEqual(a, now[0], delta=2)
        self.assertAlmostEqual(b % 360, now[1], delta=7)
        self.assertIn('Ulangi', self.page.locator('#toFinal').inner_text())

    def test_the_last_minute_runs_in_real_time_with_ticks_and_one_bell(self):
        self.seed_done()
        self.open('#menit')
        self.record_sounds()
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'play')
        self.page.locator('#play').click()
        self.assertEqual(self.page.locator('#play').get_attribute('aria-pressed'), 'true')
        self.page.wait_for_timeout(2300)
        self.assertIn(int(self.page.locator('#seconds').input_value()), [2, 3])
        self.assertIn('Maryam', self.page.locator('#momentView').inner_text())
        self.assertIsNotNone(self.page.locator('#timeline button[data-at="8"]').get_attribute('data-pending'))
        self.assertIn('tick', self.page.evaluate('calls'))
        self.page.locator('#play').click()
        held = self.page.locator('#seconds').input_value()
        self.page.wait_for_timeout(1100)
        self.assertEqual(self.page.locator('#seconds').input_value(), held)
        self.scrub(57)
        self.page.locator('#play').click()
        self.page.wait_for_function("document.querySelector('#seconds').value === '61'", timeout=7000)
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)
        self.assertEqual(self.page.locator('#play').inner_text(), 'Ulangi')
        self.page.locator('#timeline button[data-at="29"]').click()
        self.assertEqual(self.page.locator('#seconds').input_value(), '29')
        self.assertTrue(self.page.locator('#after').is_hidden())

    # Tema

    def paper(self):
        return self.page.evaluate("getComputedStyle(document.body).backgroundColor")

    def test_theme_follows_the_site_choice_then_the_device(self):
        self.open('#a')
        self.page.wait_for_timeout(350)
        light = self.paper()
        self.page.emulate_media(color_scheme='dark')
        self.page.wait_for_timeout(350)
        dark = self.paper()
        self.assertNotEqual(light, dark)
        self.assertEqual(self.page.locator('#theme').get_attribute('aria-pressed'), 'true')
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
        self.page.wait_for_timeout(350)
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
