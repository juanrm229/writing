"""Browser checks for Pabrik Mimpi (Shift Malam): python3 tests/mimpi_smoke.py.

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
        self.new_context()

    def new_context(self, **kw):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 860}, reduced_motion='reduce', **kw)
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(6000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        if '#baca' in fragment:
            self.page.wait_for_selector('.passage')
        else:
            self.page.wait_for_function("document.documentElement.hasAttribute('data-loaded')")

    def seed(self, script):
        self.context.add_init_script("if (!sessionStorage.getItem('seeded')) { " + script + "; sessionStorage.setItem('seeded', '1'); }")

    def go(self, paragraph):
        self.page.evaluate('(p) => location.hash = "baca-" + p', paragraph)
        self.page.wait_for_function('''(p) => { const r = document.querySelector('#p-' + p)?.getBoundingClientRect(); return r && (Math.abs(r.top - ''' + LINE + ''') < 1 || scrollY + innerHeight >= document.documentElement.scrollHeight - 1); }''', arg=paragraph)
        self.page.evaluate("dispatchEvent(new Event('scroll'))"); self.page.wait_for_timeout(60)

    def body(self, lang='id'):
        return self.work['en']['body'] if lang == 'en' else self.work['body']

    def plain(self, p, lang='id'):
        return self.body(lang)[p].replace('*', '')

    def capsules(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:capsules') || '[]')")

    def select(self, p, start, end):
        self.page.evaluate('''([p, start, end]) => {
          const el = document.querySelector('#p-' + p), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let pos = 0, node, range = document.createRange(), a = null;
          while ((node = walker.nextNode())) { const len = node.textContent.length;
            if (!a && start <= pos + len) { range.setStart(node, start - pos); a = true; }
            if (end <= pos + len) { range.setEnd(node, end - pos); break; } pos += len; }
          const s = getSelection(); s.removeAllRanges(); s.addRange(range); }''', [p, start, end])
        self.page.wait_for_selector('#pack:not([hidden])')

    # Naskah dan bacaan

    def test_all_original_paragraphs_are_present_in_both_languages(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#baca')
                self.assertEqual(self.page.locator('.passage').all_text_contents(), [p.replace('*', '') for p in self.body(lang) if p.strip() != '***'])
                self.assertEqual(self.page.locator('html').get_attribute('lang'), lang)

    def test_every_marker_points_to_one_original_paragraph(self):
        self.open()
        data = self.page.evaluate('MimpiShift')
        for lang, li in [('id', 0), ('en', 1)]:
            body = self.body(lang)
            positions = []
            for beat in data['BEATS']:
                hits = [i for i, p in enumerate(body) if beat['find'][li] in p]
                self.assertEqual(len(hits), 1, f"{lang}: {beat['find'][li]}")
                positions.append(hits[0])
            self.assertEqual(positions, sorted(positions))
            self.assertTrue(any(data['RULE'][li] in p for p in body))

    def test_main_site_opens_the_shift_and_completion_is_recorded(self):
        self.page.goto(self.root + '#baca-pabrik-mimpi', wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/pabrik-mimpi/index.html')
        self.page.wait_for_function("document.documentElement.dataset.view === 'home'")
        self.go(65)
        self.page.wait_for_function('() => JSON.parse(localStorage.getItem("jm:stats") || "{}").done?.includes("pabrik-mimpi")')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:prog'))['pabrik-mimpi']"), 1)

    def test_bookmark_and_language_switch_keep_the_paragraph(self):
        self.open('#baca-20')
        self.page.wait_for_timeout(450)
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:places')).id.paragraph"), 20)
        self.page.locator('#openSettings').click(); self.page.locator('#language').click()
        self.page.wait_for_url('**?lang=en#baca-20')
        self.page.wait_for_selector('#p-20')
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')

    # Kartu absen

    def test_clocking_in_stamps_the_readers_time_and_opens_the_floor(self):
        self.open()
        self.assertEqual(self.page.locator('#cardIn').inner_text(), '--:--')
        self.assertEqual(self.page.locator('#cardName').inner_text(), 'Pembaca')
        self.page.locator('#clockIn').click()
        self.page.wait_for_function("document.documentElement.dataset.view === 'floor'")
        self.assertEqual(self.page.evaluate('location.hash'), '#baca')
        card = self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:card'))")
        self.assertIn('in', card)
        self.page.locator('#toHome').click()
        self.assertEqual(self.page.locator('#cardIn').inner_text(), self.page.evaluate(NOW))
        self.assertEqual(self.page.locator('#clockIn').inner_text(), 'Masuk ke lantai produksi')

    # Lantai produksi

    def test_the_floor_follows_the_sentence_being_read(self):
        self.open('#baca')
        self.go(1)
        self.assertEqual(self.page.locator('html').get_attribute('data-leak'), '1')
        self.go(3)
        self.assertEqual(self.page.locator('#station').inner_text(), 'Stasiun paling ujung · Pak Wangsa')
        self.go(53)
        self.assertEqual(self.page.locator('html').get_attribute('data-belt'), 'off')
        self.assertEqual(self.page.locator('html').get_attribute('data-seats'), 'filled')
        self.go(57)
        self.assertEqual(self.page.locator('html').get_attribute('data-seats'), 'one')
        self.go(60)
        self.assertEqual(self.page.locator('html').get_attribute('data-seats'), 'all')
        self.assertEqual(self.page.locator('html').get_attribute('data-leak'), '2')
        self.go(10)
        self.assertEqual(self.page.locator('html').get_attribute('data-belt'), 'on')

    def test_rule_order_and_archive_quote_the_story(self):
        for lang in ['id', 'en']:
            with self.subTest(lang=lang):
                self.open(f'?lang={lang}#baca')
                rule = self.page.locator('.rule blockquote').inner_text()
                self.assertTrue(any(rule in p for p in self.body(lang)))
                rows = self.page.locator('.archive li:not(.own) > span:nth-child(2)').all_text_contents()
                source = self.plain(5, lang)
                self.assertEqual(len(rows), 3)
                for row in rows:
                    self.assertIn(row, source)
                self.assertEqual(self.page.locator('.years span').count(), 40)
                self.go(55)
                self.assertEqual(self.page.locator('#ownStatus').inner_text(), 'Tahun depan, mungkin' if lang == 'id' else 'Next year, perhaps')
                self.go(61)
                self.assertEqual(self.page.locator('#ownStatus').inner_text(), 'Terjadi · dengan mata terbuka' if lang == 'id' else 'Happened · with eyes open')

    # Kapsul

    def test_selected_words_become_an_exact_capsule(self):
        self.open('#baca')
        text = self.plain(0)
        self.select(0, 14, 46)
        self.page.locator('#pack').click()
        caps = self.capsules()
        self.assertEqual(len(caps), 1)
        self.assertEqual(caps[0]['text'], text[14:46].strip())
        self.assertEqual((caps[0]['p'], caps[0]['state']), (0, 'saku'))
        self.assertEqual(self.page.locator('#pocketCount').inner_text(), '1')
        self.page.locator('[data-pack="3"]').click()
        self.page.locator('[data-pack="3"]').click()
        self.assertEqual(len(self.capsules()), 2)
        self.assertEqual(self.capsules()[1]['text'], self.plain(3))

    def test_taken_home_dissolves_at_dawn_but_given_never_does(self):
        self.seed("localStorage.setItem('jm:mimpi:capsules', JSON.stringify([{id:'old',lang:'id',p:0,start:0,end:20,text:'',at:1,state:'pulang',expires:Date.now()-1000},{id:'gift',lang:'id',p:1,start:0,end:20,text:'',at:1,state:'diberikan'}]))")
        self.open('#baca')
        states = {c['id']: c['state'] for c in self.capsules()}
        self.assertEqual(states, {'old': 'larut', 'gift': 'diberikan'})
        self.page.locator('[data-pack="2"]').click()
        self.page.locator('#openPocket').click()
        self.page.locator('#pocketBody [data-home]').click()
        cap = next(c for c in self.capsules() if c['p'] == 2)
        self.assertEqual(cap['state'], 'pulang')
        dawn = self.page.evaluate("(at) => { const d = new Date(at); return [d.getHours(), d.getMinutes()]; }", cap['expires'])
        self.assertEqual(dawn, [5, 30])
        self.assertLess(cap['expires'] - self.page.evaluate('Date.now()'), 24 * 3600 * 1000 + 1000)
        self.assertEqual(self.page.locator('.capsule[data-state="larut"] .capsule-text').inner_text(), '')

    def test_giving_a_capsule_shares_a_link_to_the_original_words(self):
        self.context.add_init_script("window.shared = []; navigator.share = (data) => { shared.push(data); return window.cancel ? Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })) : Promise.resolve(); };")
        self.open('#baca')
        self.page.locator('[data-pack="0"]').click()
        self.page.evaluate('window.cancel = true')
        self.page.locator('#openPocket').click()
        self.page.locator('#pocketBody [data-give]').click()
        self.page.wait_for_timeout(100)
        self.assertEqual(self.capsules()[0]['state'], 'saku')
        self.page.evaluate('window.cancel = false')
        self.page.locator('#pocketBody [data-give]').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:mimpi:capsules'))[0].state === 'diberikan'")
        shared = self.page.evaluate('shared.at(-1)')
        self.assertIn('kapsul=id.0.0.' + str(len(self.plain(0))), shared['url'])
        self.assertEqual(shared['text'], '“' + self.plain(0) + '”')

    def test_a_given_dream_opens_as_a_gift_and_stays(self):
        self.open(f'?kapsul=id.0.0.46')
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'gift')
        self.assertEqual(self.page.locator('.gift-capsule blockquote').inner_text(), self.plain(0)[:46].strip())
        received = self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:received'))")
        self.assertEqual(len(received), 1)
        self.page.locator('#enterShift').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'home')
        self.assertIn('1', self.page.locator('#receivedNote').inner_text())
        self.open('?kapsul=id.999.0.10')
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'home')

    # Tepuk tangan

    def test_applause_lights_chairs_and_the_microphone_is_only_optional(self):
        self.context.add_init_script("window.asked = 0; navigator.mediaDevices.getUserMedia = () => { asked++; return Promise.reject(new Error('denied')); };")
        self.open('#baca')
        self.go(58)
        self.assertTrue(self.page.locator('#clapPanel').is_hidden())
        self.page.locator('#stand').click()
        for _ in range(5):
            self.page.locator('#clap').click()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:mimpi:claps'))"), 5)
        self.assertEqual(self.page.locator('#hall i.lit').count(), 5)
        self.assertEqual(self.page.evaluate('asked'), 0)
        self.page.locator('#mic').click()
        self.page.wait_for_function("document.querySelector('#clapCount').textContent.includes('Mikrofon tidak tersedia')")
        self.assertEqual(self.page.evaluate('asked'), 1)

    # Gerbang

    def test_the_gate_reads_the_rule_and_clocking_out_stamps_the_card(self):
        self.open('#baca')
        self.page.locator('[data-pack="64"]').click()
        self.go(65)
        gate = self.page.locator('#endShift')
        self.assertIn('Perajin tidak diperkenankan mengonsumsi produk.', gate.inner_text())
        self.assertEqual(gate.locator('.capsule').count(), 1)
        gate.locator('[data-home]').click()
        self.assertEqual(self.page.locator('#endShift .capsule').count(), 0)
        self.page.locator('#clockOut').click()
        self.assertEqual(self.page.locator('html').get_attribute('data-view'), 'home')
        self.assertEqual(self.page.locator('#cardOut').inner_text(), self.page.evaluate(NOW))

    # Umum

    def test_layout_fits_every_screen_and_respects_reduced_motion(self):
        for width in [320, 390, 1440]:
            for fragment in ['', '#baca-55', '?kapsul=id.0.0.40']:
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
        self.open('?preview=1#baca-30')
        self.page.locator('[data-pack="30"]').click()
        self.page.wait_for_timeout(450)
        for key in ['prog', 'read', 'mimpi:places', 'mimpi:capsules', 'mimpi:card']:
            self.assertIsNone(self.page.evaluate(f"localStorage.getItem('jm:{key}')"), key)

    def test_missing_shift_module_keeps_the_story(self):
        self.context.route('**/pabrik-mimpi/shift.js*', lambda route: route.abort())
        self.open('#baca-10')
        self.assertEqual(self.page.locator('.passage').count(), len([p for p in self.work['body'] if p.strip() != '***']))
        self.assertEqual(self.page.locator('.chip').count(), 0)

    def test_theme_follows_the_site_choice(self):
        self.open('#baca')
        light = self.page.evaluate("getComputedStyle(document.body).backgroundColor")
        self.page.evaluate("() => { localStorage.setItem('jm:theme', JSON.stringify('dark')); dispatchEvent(new StorageEvent('storage', { key: 'jm:theme' })); }")
        self.page.wait_for_timeout(100)
        self.assertNotEqual(light, self.page.evaluate("getComputedStyle(document.body).backgroundColor"))
        self.assertEqual(self.page.locator('html').get_attribute('data-theme'), 'dark')


if __name__ == '__main__':
    unittest.main(verbosity=2)
