"""Browser checks for Terlambat Satu Menit: python3 tests/minute_smoke.py.

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
          const aligned = Math.abs(r.top - (document.querySelector('#stage').getBoundingClientRect().bottom + 18)) < 1;
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

    def test_the_button_can_be_placed_and_then_lost_and_recovered(self):
        self.open('#a')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-king'), 'waiting')
        self.page.locator('#begin').click()
        self.page.wait_for_function("document.querySelector('#stage').dataset.king === 'home'")
        self.assertTrue(self.page.locator('#inspectObject').is_hidden())
        self.go('a', 18)
        self.page.locator('#inspectObject').click()
        self.assertEqual(self.page.locator('#objectText').inner_text(), self.work['body'][18].replace('*', ''))
        self.page.locator('#objectDialog [data-close]').click()
        self.go('a', 24)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-king'), 'missing')
        self.go('a', 39)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-king'), 'home')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-trap'), 'closed')
        self.go('a', 46)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-trap'), 'open')

    def test_one_threshold_has_two_views_and_the_bell_waits_for_banyu(self):
        self.open('#a-69')
        self.page.evaluate("window.calls = []; const play = MinuteSound.prototype.play; MinuteSound.prototype.play = function(kind) { calls.push(kind); return play.call(this, kind); }")
        self.assertEqual(self.page.locator('#stage').get_attribute('data-bell'), 'held')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-door'), 'inside')
        self.assertTrue(self.page.locator('#turnDoor').is_hidden())
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 0)
        self.go('b', 53)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-door'), 'outside')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-bell'), 'released')
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)
        self.page.locator('#turnDoor').click()
        self.assertEqual(self.page.locator('#stage').get_attribute('data-door'), 'inside')
        self.assertIn('Mau jahit apa?', self.page.locator('#p-55').inner_text())
        self.page.evaluate("dispatchEvent(new Event('scroll')); dispatchEvent(new Event('resize'))")
        self.assertEqual(self.page.evaluate("calls.filter(c => c === 'bell').length"), 1)

    def test_the_same_watch_shop_returns_without_revealing_maryam_early(self):
        self.open('#b-12')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'clock')
        self.assertEqual(self.page.locator('#sceneCaption').inner_text(), 'Toko jam')
        self.page.evaluate("window.shop = document.querySelector('#clockRoom')")
        self.go('c', 0)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'house')
        self.go('c', 41)
        self.assertTrue(self.page.evaluate("shop === document.querySelector('#clockRoom')"))
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'clock')
        self.assertEqual(self.page.locator('#sceneCaption').inner_text(), 'Toko jam')
        self.go('c', 45)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-bag'), 'true')
        self.go('c', 58)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-bag'), 'false')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-parcel'), 'true')

    def test_english_beats_follow_the_actual_english_paragraphs(self):
        self.open('?lang=en#a-58')
        self.assertEqual(self.page.locator('#stage').get_attribute('data-open-letter'), 'true')
        self.go('a', 71)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'door')
        self.go('b', 60)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'tailor')
        self.go('c', 32)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-missing-spoon'), 'true')
        self.go('c', 40)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-room'), 'clock')
        self.go('c', 74)
        self.assertEqual(self.page.locator('#stage').get_attribute('data-tea'), 'true')

    def test_letters_use_only_the_words_already_reached(self):
        self.open('#a-2')
        self.page.locator('#inspectObject').click()
        self.assertEqual(self.page.locator('#objectText p').count(), 1)
        self.assertNotIn('Bapak bangga', self.page.locator('#objectText').inner_text())
        self.page.keyboard.press('Escape')
        self.go('a', 56)
        self.page.locator('#inspectObject').click()
        self.assertIn('Bapak bangga', self.page.locator('#objectText').inner_text())
        self.page.keyboard.press('Escape')
        self.go('c', 70)
        self.page.locator('#inspectObject').click()
        self.assertEqual(self.page.locator('#objectText p').count(), 1)
        self.assertEqual(self.page.locator('#objectText p').inner_text(), self.work['sides'][1]['body'][70].replace('*', ''))
        self.assertNotIn('tolong terima', self.page.locator('#objectText').inner_text())

    def test_objects_can_be_touched_without_moving_the_reading_position(self):
        self.open('#a-56')
        y = self.page.evaluate('scrollY')
        self.page.locator('#envelope').click()
        self.assertTrue(self.page.locator('#objectDialog').evaluate('(e) => e.open'))
        self.assertIn('Bapak bangga', self.page.locator('#objectText').inner_text())
        self.page.keyboard.press('Escape')
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'inspectObject')

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
        self.page.wait_for_function("Math.abs((86 - document.querySelector('#p-20').getBoundingClientRect().top) / document.querySelector('#p-20').getBoundingClientRect().height - .35) < .04")
        self.open('#a')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.saved()['paragraph'], 20)
        self.assertAlmostEqual(self.saved()['offset'], .35, delta=.04)

    def test_each_side_marks_completion_and_unlocks_the_afterword(self):
        self.open()
        self.assertTrue(self.page.locator('#afterword').is_hidden())
        for side, length in [('a', 72), ('b', 76), ('c', 78)]:
            self.go(side, length - 1)
            key = 'terlambat-satu-menit' + (':' + side if side != 'a' else '')
            self.page.wait_for_function('(key) => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes(key)', arg=key)
        self.assertTrue(self.page.locator('#afterword').is_visible())
        self.assertEqual(self.page.locator('#greeting').inner_text(), self.work['sides'][0]['body'][73])

    def test_returning_leaves_stitches_and_keeps_the_reading_place(self):
        self.context.add_init_script("localStorage.setItem('jm:stats', JSON.stringify({done:['terlambat-satu-menit','terlambat-satu-menit:b','terlambat-satu-menit:c']}))")
        self.open('#a-18')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:minute:places') || '{}').id?.a?.paragraph === 18")
        self.page.locator('#visitAgain').click()
        self.page.wait_for_function("document.querySelector('#stage').dataset.stay === 'true'")
        self.assertTrue(self.page.locator('#greeting').evaluate('(e) => e.getBoundingClientRect().top >= document.querySelector("#stage").getBoundingClientRect().bottom'))
        self.assertTrue(self.page.locator('#answer').evaluate('(e) => e.getBoundingClientRect().bottom <= innerHeight'))
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:visits'))"), 1)
        self.assertEqual(self.saved()['paragraph'], 18)
        self.assertEqual(self.page.locator('#stitches path').count(), 4)
        greeting = self.page.locator('#greeting').inner_text()
        self.open('#a')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.page.locator('#visitAgain').click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:minute:visits'))"), 2)
        self.assertEqual(self.page.locator('#stitches path').count(), 5)
        self.assertEqual(self.page.locator('#greeting').inner_text(), greeting)
        self.assertEqual(self.saved()['paragraph'], 18)

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
        self.page.wait_for_function("document.querySelector('#stage').dataset.missingSpoon === 'true'")
        self.page.evaluate('navigator.serviceWorker.ready.then(() => true)')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.page.wait_for_function('!!navigator.serviceWorker.controller')
        self.context.set_offline(True)
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.assertEqual(self.page.locator('.passage').count(), len([p for p in self.work['en']['sides'][1]['body'] if p != '***']))
        self.assertTrue(self.page.evaluate("typeof MinuteSound === 'function'"))

    def test_preview_is_readable_without_overwriting_reader_history(self):
        self.context.add_init_script("localStorage.setItem('jm:preview', " + json.dumps(json.dumps({'works': [self.work]})) + ")")
        self.context.route('**/content/works.json', lambda route: route.abort())
        self.open('?preview=1#b-35')
        self.assertEqual(self.page.locator('#sideTitle').inner_text(), self.work['sides'][0]['title'])
        self.page.wait_for_timeout(450)
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:prog')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:read')"))
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:minute:places')"))

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


if __name__ == '__main__':
    unittest.main(verbosity=2)
