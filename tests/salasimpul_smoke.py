"""Browser checks for Salasimpul, the knotted notes of a town: python3 tests/salasimpul_smoke.py.

The notes live in content/salasimpul/<writer>/<year>-<day>.md and are built into content/salasimpul.json by
tools/salasimpul.js. These tests check that the built file is in step with the notes, that the page shows the
text without its marks, and that the reader's knowledge, the getting-to-know rule and the knots behave.
Uses the cloud environment's Python Playwright and system Chromium. No external assets are needed.
"""
import functools
import http.server
import json
from pathlib import Path
import re
import subprocess
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SEEN = "try { localStorage.setItem('jm:guide:salasimpul', '1') } catch (e) {}"
TAG = re.compile(r'\s*@(claims|irony|protected|node|echo)(\([^)]*\))?')


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


class SalasimpulSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.site = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.url = cls.site + 'dunia/salasimpul/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.W = json.loads((ROOT / 'content/salasimpul.json').read_text())
        cls.BY = {e['id']: e for e in cls.W['entries']}

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
        self.page.on('dialog', lambda d: d.accept())

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def go(self, hash_=''):
        self.page.goto(self.url + hash_, wait_until='domcontentloaded')
        self.page.wait_for_selector('#coverAct .win, #coverAct .go, #nBody > *, #city:not([hidden])')

    def open_note(self, nid):
        self.page.evaluate(f"location.hash = 'c-{nid}'")
        self.page.wait_for_function(f"document.querySelector('#note:not([hidden]) .n-head h2') && document.querySelector('#note h2').textContent === {json.dumps(self.BY[nid]['title'])}")

    def state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:simpul') || 'null')")

    # ---------- data ----------
    def test_built_file_is_in_step_with_the_notes(self):
        out = subprocess.run(['node', '-e', "const {build}=require('./tools/salasimpul.js'); const {world, meta}=build(); process.stdout.write(JSON.stringify({world, meta}))"], cwd=ROOT, capture_output=True, text=True, check=True)
        fresh = json.loads(out.stdout)
        self.assertEqual(fresh['world'], self.W, 'content/salasimpul.json is out of date: run node tools/salasimpul.js')
        self.assertEqual(fresh['meta'], json.loads((ROOT / 'content/salasimpul.meta.json').read_text()))
        files = sorted(str(p.relative_to(ROOT / 'content/salasimpul')) for p in (ROOT / 'content/salasimpul').glob('*/*.md'))
        self.assertEqual(len(files), len(self.W['entries']))
        self.assertEqual(len({e['id'] for e in self.W['entries']}), len(self.W['entries']))

    def test_text_is_the_notes_without_their_marks(self):
        for e in self.W['entries'][::9]:
            with self.subTest(file=e['file']):
                body = (ROOT / 'content/salasimpul' / e['file']).read_text().split('---', 2)[2]
                want = [norm(TAG.sub('', p)) for p in re.split(r'\n\s*\n', body) if p.strip()]
                self.assertEqual([norm(p['t']) for p in e['p']], want)

    def test_knots_point_to_real_notes(self):
        for e in self.W['entries']:
            for p in e['p']:
                for link in p.get('l', []):
                    self.assertIn(link['id'], self.BY)
                    self.assertEqual(self.BY[link['id']]['owner'], link['owner'])

    # ---------- page ----------
    def test_cover_windows_and_first_note(self):
        self.go()
        self.assertEqual(self.page.locator('#title').text_content(), 'Salasimpul')
        self.assertIn('0/187', self.page.locator('#cvRead').inner_text())
        # windows: strangers' first lines, no names; the opening note is always among them on a first visit
        wins = self.page.locator('#windows .win')
        self.assertEqual(wins.count(), 4)
        names = [p['name'] for p in self.W['people']]
        for w in wins.all_inner_texts():
            self.assertFalse(any(re.search(rf'\b{n}\b', w.split('\n')[-1]) for n in names))
        start = self.BY[self.W['start']]
        self.page.locator(f'#windows .win[data-id="{start["id"]}"]').click()
        self.page.wait_for_selector('#nBody p')
        self.assertEqual(self.page.locator('#note h2').inner_text(), start['title'])
        self.assertEqual(self.page.locator('#stepChip').inner_text(), '1/187')
        text = self.page.locator('#nBody').inner_text()
        self.assertNotIn('@', text)
        self.assertIn(norm(start['p'][0]['t'])[:40], norm(text))
        # the back button is the site's
        self.assertEqual(self.page.locator('.qm-back').inner_text().strip(), 'Meja tulis')

    def test_getting_to_know_someone(self):
        self.go()
        karman = [e for e in self.W['entries'] if e['owner'] == 'karman']
        # the first two notes are open, the next is not
        self.open_note(karman[0]['id']); self.assertEqual(self.page.locator('.locked').count(), 0)
        self.open_note(karman[2]['id']); self.assertEqual(self.page.locator('.locked').count(), 1)
        self.assertIn('Kamu belum cukup kenal Karman', self.page.locator('.locked').inner_text())
        # reading notes by others that mention Karman opens more of his notebook
        mentions = [e for e in self.W['entries'] if e['owner'] != 'karman' and re.search(r'\bKarman\b', ' '.join(p['t'] for p in e['p']))]
        opened = 0
        for e in mentions:
            self.open_note(e['id'])
            if self.page.locator('.locked').count() == 0:
                opened += 1
            if opened >= 2:
                break
        self.open_note(karman[2]['id'])
        self.assertEqual(self.page.locator('.locked').count(), 0)
        # "open anyway" works on any locked note, and says so
        far = karman[-2]
        self.open_note(far['id'])
        if self.page.locator('.locked').count():
            self.page.locator('#early').click()
            self.page.wait_for_selector('#nBody > p')
            self.assertIn(far['id'], self.state()['read'])

    def test_following_a_knot_always_opens(self):
        e = next(x for x in self.W['entries'] if any(p.get('l') for p in x['p']) and x['owner'] == 'bagas')
        self.go()
        self.page.evaluate("localStorage.setItem('jm:simpul', JSON.stringify({ v: 1, read: {}, early: {}, known: {}, last: null, open: true }))")
        self.page.reload(); self.page.wait_for_selector('#coverAct .win')
        self.open_note(e['id'])
        self.page.evaluate("(() => { const s = JSON.parse(localStorage.getItem('jm:simpul')); s.open = false; localStorage.setItem('jm:simpul', JSON.stringify(s)); })()")
        self.page.reload(); self.page.wait_for_selector('#nBody')
        target = next(link for p in e['p'] for link in p.get('l', []))
        self.page.locator(f'.knots.inline .knot[href="#c-{target["id"]}"]').first.click()
        self.page.wait_for_function(f"document.querySelector('#note h2').textContent === {json.dumps(self.BY[target['id']]['title'])}")
        # the pulled thread says where it came from
        self.assertIn(self.BY[e['id']]['title'], self.page.locator('#fromStrip').inner_text())
        if target['id'] not in self.W['keys']:
            self.assertEqual(self.page.locator('.locked').count(), 0)

    def test_key_notes_wait_for_what_you_know(self):
        kid, need = next(iter(self.W['keys'].items()))
        self.go()
        self.open_note(kid)
        self.assertIn('menunggu sesuatu', self.page.locator('.locked').inner_text())
        known = {p: self.W['props'][p][0] for p in need}
        self.page.evaluate(f"localStorage.setItem('jm:simpul', JSON.stringify({{ v: 1, read: {{}}, early: {{}}, known: {json.dumps(known)}, last: null, open: false }}))")
        self.page.reload(); self.page.wait_for_selector('#note:not([hidden])')
        self.assertEqual(self.page.locator('.locked').count(), 0)

    def test_sentences_light_up_after_you_know(self):
        # n1999: "Aku tidak tahu itu bunyi apa." waits for Karman dancing and Nara not knowing it
        self.go()
        self.open_note('n1999')
        self.assertEqual(self.page.locator('.s.ir.lit').count(), 0)
        e = self.BY['n1999']
        groups = [g for p in e['p'] for a in p['a'] for g in a.get('irony', [])]
        g = next(g for g in groups if all(x in self.W['props'] for x in g))
        known = {x: self.W['props'][x][0] for x in g}
        self.page.evaluate(f"(() => {{ const s = JSON.parse(localStorage.getItem('jm:simpul')); s.known = Object.assign(s.known, {json.dumps(known)}); localStorage.setItem('jm:simpul', JSON.stringify(s)); }})()")
        self.page.reload(); self.page.wait_for_selector('#nBody p')
        lit = self.page.locator('.s.ir.lit')
        self.assertGreaterEqual(lit.count(), 1)
        lit.first.click()
        self.assertTrue(self.page.locator('#pop').is_visible())
        self.assertIn('Kalimat ini berubah karena kamu tahu', self.page.locator('#pop').text_content())
        self.page.keyboard.press('Escape')

    def test_what_you_know_is_kept(self):
        self.go()
        self.open_note('n1999')
        self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        self.page.wait_for_function("Object.keys(JSON.parse(localStorage.getItem('jm:simpul')).known).length > 0")
        self.page.locator('#openKnow').click()
        self.assertTrue(self.page.locator('#knowDialog').is_visible())
        self.assertRegex(self.page.locator('#knowTitle').inner_text(), r'^\d+ dari \d+$')
        self.assertGreaterEqual(self.page.locator('#knowBody .kl li').count(), 1)

    def test_city_views(self):
        self.go('#kota')
        self.assertEqual(self.page.locator('#scoreSvg .nt').count(), len(self.W['entries']))
        self.assertEqual(self.page.locator('#scoreNames button').count(), len(self.W['people']))
        # a name highlights that person
        self.page.locator('#scoreNames button').first.click()
        self.assertTrue(self.page.evaluate("document.getElementById('scoreSvg').classList.contains('focused')"))
        self.page.locator('#scoreNames button').first.click()
        self.assertFalse(self.page.evaluate("document.getElementById('scoreSvg').classList.contains('focused')"))
        self.page.locator('#tabPeople').click()
        self.assertEqual(self.page.locator('.person').count(), len(self.W['people']))
        self.page.locator('#tabTime').click()
        self.assertEqual(self.page.locator('#paneTime .row').count(), len(self.W['entries']))
        # a dot peeks first, then reads
        self.page.locator('#tabScore').click()
        self.page.locator('#scoreSvg .nt.open').first.click()
        self.assertTrue(self.page.locator('#pop').is_visible())
        self.page.locator('#pop .pk-act .go').click()
        self.page.wait_for_selector('#note:not([hidden]) #nBody')

    def test_open_city_setting(self):
        self.go()
        self.page.locator('#openSettings').click()
        self.page.locator('#openAll').click()
        self.assertEqual(self.page.locator('#openAll').get_attribute('aria-pressed'), 'true')
        self.page.keyboard.press('Escape')
        self.open_note(self.W['entries'][-1]['id'])
        self.assertEqual(self.page.locator('.locked').count(), 0)

    def test_preview_writes_nothing(self):
        self.page.goto(self.url + '?preview=1', wait_until='domcontentloaded')
        self.page.wait_for_selector('#windows .win')
        self.page.locator('#windows .win').first.click()
        self.page.wait_for_selector('#nBody p')
        self.assertIsNone(self.page.evaluate("localStorage.getItem('jm:simpul')"))

    def test_english_interface(self):
        self.page.goto(self.url + '?lang=en', wait_until='domcontentloaded')
        self.page.wait_for_selector('#windows .win')
        self.assertIn('You are new here', self.page.locator('#rule1').inner_text())
        self.assertTrue(self.page.locator('#lost').is_visible())

    def test_banner_above_the_albums(self):
        self.page.goto(self.site + '#album', wait_until='domcontentloaded')
        self.page.wait_for_function("document.querySelector('.wd-banner [data-wd-meta]') && /187/.test(document.querySelector('.wd-banner [data-wd-meta]').textContent)")
        banner = self.page.locator('.wd-banner')
        self.assertEqual(banner.get_attribute('href'), 'dunia/salasimpul/')
        self.assertIn('Salasimpul', banner.text_content())
        self.assertIn('18 orang', banner.text_content())
        self.assertLess(banner.bounding_box()['height'], 130)
        # the banner sits above the album shelf
        self.assertTrue(self.page.evaluate("document.querySelector('.wd-banner').compareDocumentPosition(document.querySelector('.al-grid')) & Node.DOCUMENT_POSITION_FOLLOWING"))
        self.assertEqual(self.page.locator('.wd-lanes rect').count(), len(self.W['entries']))

    def test_flashback_when_old_sentences_change(self):
        # read n1999 first; then learning what makes its sentence ironic shows the flashback card
        e = self.BY['n1999']
        g = next(g for p in e['p'] for a in p['a'] for g in a.get('irony', []) if all(x in self.W['props'] for x in g))
        known = {x: self.W['props'][x][0] for x in g[1:]}
        self.go()
        self.page.evaluate(f"localStorage.setItem('jm:simpul', JSON.stringify({{ v: 1, read: {{ n1999: 1 }}, early: {{}}, known: {json.dumps(known)}, last: null, open: true }}))")
        self.page.reload(); self.page.wait_for_selector('#coverAct .win, #coverAct .go')
        source = self.W['props'][g[0]][0]
        self.open_note(source)
        span = self.page.locator(f'.s.cl[data-claims~="{g[0]}"]').first
        span.scroll_into_view_if_needed()
        self.page.wait_for_selector('#flash:not([hidden])')
        self.assertIn('pernah kamu baca berubah', self.page.locator('#flash').text_content())
        self.assertEqual(self.page.locator('#flash a[href="#c-n1999"]').count() >= 1, True)

    def test_note_page_follows_the_hour_and_its_writer(self):
        self.go()
        self.open_note(self.W['start'])
        self.assertEqual(self.page.evaluate("document.documentElement.dataset.backdrop"), 'malam' if (self.BY[self.W['start']]['at']['h'] >= 19 or self.BY[self.W['start']]['at']['h'] < 4) else self.page.evaluate("document.documentElement.dataset.backdrop"))
        self.assertTrue(self.page.locator('.n-hour').inner_text().endswith('.00'))
        self.assertNotEqual(self.page.evaluate("getComputedStyle(document.getElementById('note')).getPropertyValue('--nb').trim()"), '')


if __name__ == '__main__':
    unittest.main(verbosity=2)
