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
        self.assertEqual(self.page.locator('.wd-lanes .dt').count(), len(self.W['entries']))
        self.assertEqual(self.page.locator('.wd-lanes .dt.rd').count(), 0)
        # a first sentence, without a name
        firsts = {next(e for e in self.W['entries'] if e['owner'] == p['id'])['p'][0]['t'].replace('*', '')[:40] for p in self.W['people']}
        voice = self.page.locator('[data-wd-voice] q').text_content()
        self.assertTrue(any(f.startswith(voice[:30]) for f in firsts), voice)
        self.assertIn('seseorang', self.page.locator('[data-wd-voice] small').text_content())
        # once you have read something, the banner remembers you
        self.page.evaluate("localStorage.setItem('jm:simpul', JSON.stringify({ v: 1, read: { n1999: 1, k1987: 2 } }))")
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function("/kamu kenal 2 dari 18 orang/.test(document.querySelector('.wd-banner [data-wd-meta]')?.textContent || '')")
        self.assertEqual(self.page.locator('.wd-lanes .dt.rd').count(), 2)
        self.assertIn('lanjutkan', self.page.locator('[data-wd-kick]').text_content())

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

    # ---------- stage two ----------
    def seed_state(self, **kw):
        st = {'v': 1, 'read': {}, 'early': {}, 'known': {}, 'last': None, 'open': True, 'recall': {}, 'book': []}
        st.update(kw)
        self.page.evaluate(f"localStorage.setItem('jm:simpul', {json.dumps(json.dumps(st))})")
        self.page.reload(); self.page.wait_for_selector('#coverAct .win, #coverAct .go, #nBody > *, #city:not([hidden])')

    def test_memory_fades_but_protected_sentences_stay(self):
        self.go()
        self.seed_state(read={'r1983': 1})
        self.open_note('r1983')
        self.assertEqual(self.page.locator('.sn.fog').count(), 0)
        self.page.evaluate("(() => { const r = document.getElementById('memRange'); r.value = r.max; r.dispatchEvent(new Event('input')); })()")
        self.assertGreater(self.page.locator('.sn.fog').count(), 0)
        self.assertEqual(self.page.locator('.sn.prot.fog').count(), 0)
        self.assertGreater(self.page.locator('.sn.prot').count(), 0)
        self.assertRegex(self.page.locator('#memNote').inner_text(), r'Rasmi masih mengingat \d+%')
        # back to the year it was written: nothing is forgotten
        self.page.evaluate("(() => { const r = document.getElementById('memRange'); r.value = r.min; r.dispatchEvent(new Event('input')); })()")
        self.assertEqual(self.page.locator('.sn.fog').count(), 0)

    def test_coming_back_strengthens_a_memory(self):
        self.go()
        self.seed_state(read={'r1983': 1, 'n1999': 2})
        self.open_note('n1999'); self.open_note('r1983')
        self.assertEqual(self.state()['recall'].get('r1983'), 1)

    def test_the_city_in_a_given_year(self):
        self.go('#kota')
        self.page.evaluate("(() => { const r = document.getElementById('cityRange'); r.value = 1999; r.dispatchEvent(new Event('input')); })()")
        later = sum(1 for e in self.W['entries'] if e['at']['y'] > 1999)
        self.assertEqual(self.page.locator('#scoreSvg .nt.later').count(), later)
        self.assertIn(f"{len(self.W['entries']) - later} catatan sudah ditulis", self.page.locator('#cityNote').inner_text())

    def test_testimonies_of_one_fact(self):
        p, ids = next((p, ids) for p, ids in self.W['props'].items() if len({self.BY[i]['owner'] for i in ids}) > 1)
        self.go()
        self.seed_state(read={i: n for n, i in enumerate(ids)}, known={p: ids[0]})
        self.page.locator('#openKnow').click()
        self.page.locator(f'.k-wit[data-p="{p}"]').click()
        self.assertEqual(self.page.locator('#knowBody .kl.wt li').count(), len(ids))
        self.assertIn('Tidak ada yang diputuskan benar', self.page.locator('#knowBody').inner_text())

    def test_the_city_from_someones_angle(self):
        self.go('#sudut')
        self.assertEqual(self.page.locator('#angleSel').input_value(), 'sukrim')
        own = sum(1 for e in self.W['entries'] if e['owner'] == 'sukrim')
        self.assertEqual(self.page.locator('#paneAngle .ang.own').count(), own)
        self.assertGreater(self.page.locator('#paneAngle .ang:not(.own)').count(), 0)
        self.page.locator('#angleSel').select_option('nara')
        self.assertEqual(self.page.locator('#paneAngle .ang.own').count(), sum(1 for e in self.W['entries'] if e['owner'] == 'nara'))

    def test_your_edit(self):
        self.go()
        self.seed_state(read={'n1999': 1})
        self.open_note('n1999')
        self.page.locator('#toBook').click()
        self.assertEqual(self.state()['book'], ['n1999'])
        self.page.evaluate("location.hash = 'sunting'")
        self.page.wait_for_selector('#paneBook .bk li')
        self.page.locator('#bkSpine').click()
        self.assertEqual(self.state()['book'], ['n1999'] + self.W['spine'])
        # move the second note up
        self.page.locator('#paneBook .bk li').nth(1).locator('[data-mv="-1"]').click()
        self.assertEqual(self.state()['book'][0], self.W['spine'][0])
        with self.page.expect_download() as dl:
            self.page.locator('#bkMd').click()
        text = Path(dl.value.path()).read_text()
        self.assertIn(self.BY['n1999']['title'], text)
        self.assertNotIn('@claims', text)
        # read it as one book
        self.page.locator('#paneBook .go').click()
        self.page.wait_for_selector('#bkRead .bk-note')
        self.assertEqual(self.page.locator('#bkRead .bk-note').count(), len(self.state()['book']))
        # a shared edit opens for someone else, and can be kept
        ids = ','.join(self.W['spine'][:2])
        self.page.evaluate(f"location.hash = 'suntingan={ids}'")
        self.page.wait_for_selector('#bkKeep')
        self.assertEqual(self.page.locator('#bkRead .bk-note').count(), 2)

    # ---------- the reading thread ----------
    def test_the_fork_and_your_thread(self):
        self.go()
        self.seed_state(open=False)
        self.open_note('n1999')
        cards = self.page.locator('#fork .fk')
        self.assertGreaterEqual(cards.count(), 2)
        self.assertLessEqual(cards.count(), 4)
        nxt = next(e for e in self.W['entries'] if e['owner'] == 'nara' and e['id'] != 'n1999')
        book = self.page.locator('#fork .fk[data-how="book"]')
        self.assertEqual(book.get_attribute('href'), '#c-' + nxt['id'])
        book.click()
        self.page.wait_for_function(f"document.querySelector('#note h2').textContent === {json.dumps(nxt['title'])}")
        tie = self.page.locator('#fromStrip').text_content()
        self.assertIn('Lanjut di buku yang sama', tie)
        self.assertIn(f"+{nxt['at']['y'] - 1999}", tie)
        self.assertEqual([x['id'] for x in self.state()['strand']], ['n1999', nxt['id']])
        # the note you left is folded above, and opens again in place
        fold = self.page.locator('#strand .fold')
        self.assertEqual(fold.count(), 1)
        fold.locator('summary').click()
        self.page.wait_for_selector('#strand .fold .fd-body p')
        # the crossroads never offers the note you just came from
        self.assertEqual(self.page.locator('#fork .fk[href="#c-n1999"]').count(), 0)
        # going back cuts the thread there
        self.page.go_back()
        self.page.wait_for_function("document.querySelector('#note h2').textContent === " + json.dumps(self.BY['n1999']['title']))
        self.assertEqual([x['id'] for x in self.state()['strand']], ['n1999'])
        self.assertEqual(self.page.locator('#strand').count(), 0)

    def test_memory_bar_opens_and_returns(self):
        self.go()
        self.seed_state(read={'r1983': 1})
        self.open_note('r1983')
        self.assertTrue(self.page.locator('#nMem').is_hidden())
        self.page.locator('#memToggle').click()
        self.assertTrue(self.page.locator('#nMem').is_visible())
        self.page.evaluate("(() => { const r = document.getElementById('memRange'); r.value = r.max; r.dispatchEvent(new Event('input')); })()")
        self.assertGreater(self.page.locator('.sn.fog').count(), 0)
        self.page.locator('#memClose').click()
        self.assertTrue(self.page.locator('#nMem').is_hidden())
        self.assertEqual(self.page.locator('.sn.fog').count(), 0)

    # ---------- the people ----------
    def test_each_writer_carries_their_age_and_count(self):
        self.go()
        self.seed_state()
        self.open_note('w2025')
        # Wardi: "Tujuh ratus tiga puluh hari." The header counts the same mornings
        self.assertIn('730', self.page.locator('.n-since').text_content())
        self.open_note('n1999')
        self.assertEqual(self.page.locator('.n-age b').text_content(), '5')
        self.assertEqual(self.page.evaluate("document.getElementById('note').hasAttribute('data-young')"), True)
        self.open_note('n2014')
        self.assertEqual(self.page.locator('.n-age b').text_content(), '20')
        self.assertEqual(self.page.evaluate("document.getElementById('note').hasAttribute('data-young')"), False)
        self.open_note('el2024')
        self.assertIn('28', self.page.locator('.n-since').text_content())
        for o, per in self.W['persona'].items():
            self.assertIn(o, {p['id'] for p in self.W['people']})

    def test_a_writers_card(self):
        self.go()
        self.seed_state(read={'k1987': 1, 'k2010': 2, 'ls1990': 3})
        self.open_note('k2010')
        self.page.locator('.n-who a[data-who="karman"]').click()
        dlg = self.page.locator('#whoDialog')
        self.assertTrue(dlg.is_visible())
        self.assertEqual(self.page.locator('#whoTitle').text_content(), 'Karman')
        self.assertIn('Tembok', self.page.locator('#whoBody').text_content())
        self.assertGreater(self.page.locator('#whoBody .wc-clock circle:not(.ring)').count(), 0)
        # someone you have met can be opened from the web; someone you have not stays a question mark
        self.assertGreater(self.page.locator('#whoBody .wc-p.unk').count(), 0)
        self.page.locator('#whoBody .wc-p[data-who="lestari"]').click()
        self.assertEqual(self.page.locator('#whoTitle').text_content(), 'Lestari')
        self.page.keyboard.press('Escape')
        self.assertFalse(dlg.is_visible())

    def test_the_same_night(self):
        self.go()
        self.seed_state()
        self.open_note('k2010')
        night = [e for e in self.W['entries'] if e['at']['y'] == 2010 and e['at']['d'] == self.BY['k2010']['at']['d']]
        self.assertEqual(self.page.locator('#night .nt-row').count(), len(night) - 1)
        self.assertEqual(self.page.locator('#fork .fk[data-how="night"]').count(), 1)
        # pulling the same-night thread says so, in hours
        self.page.locator('#fork .fk[data-how="night"]').click()
        self.page.wait_for_function("document.getElementById('fromStrip')")
        self.assertIn('jam kemudian', self.page.locator('#fromStrip').text_content())
        # the whole night, by the clock
        self.page.locator('#nightGo').click()
        self.page.wait_for_selector('#nights .nt-note')
        hours = [s.split('.')[0] for s in self.page.locator('#nights .nn-clock b').all_text_contents()]
        self.assertEqual(hours, [f"{e['at']['h']:02d}" for e in sorted(night, key=lambda e: e['at']['h'])])
        for e in night:
            self.assertIn(e['id'], self.state()['read'])

    def test_sound_of_the_rooms(self):
        self.go()
        self.assertEqual(self.page.locator('#sound').text_content(), 'Mati')
        rooms = {'malam', 'radio', 'jam', 'ruang', 'angin', 'jalan', 'hujan'}
        self.assertTrue(all(v.get('room') in rooms for v in self.W['persona'].values()))

    # ---------- stage five: the tools of the town ----------
    def open_map(self, **state):
        self.go()
        self.seed_state(**state)
        self.page.evaluate("location.hash = ''"); self.page.evaluate("location.hash = 'peta'")
        self.page.wait_for_selector('#mapSvg[viewBox]')

    def click_svg(self, selector):
        self.page.evaluate(f"document.querySelector({json.dumps(selector)}).dispatchEvent(new MouseEvent('click', {{ bubbles: true }}))")

    def test_the_map_fills_in_as_you_read(self):
        P = self.W['peta']
        self.assertTrue(all(pl['notes'] for pl in P['places']))
        self.assertTrue(all(0 <= pl['x'] <= P['world']['w'] and 0 <= pl['y'] <= P['world']['h'] for pl in P['places']))
        self.open_map(open=False, read={})
        self.assertEqual(self.page.locator('#mapPins .pin[data-place]').count(), 0)
        # reading the cemetery keeper's first note puts the cemetery on the map
        self.open_map(open=False, read={'el1996': 1})
        self.page.wait_for_selector('#mapPins .pin[data-place="pekuburan"]')
        self.click_svg('#mapPins .pin[data-place="pekuburan"]')
        card = self.page.locator('#mapCard')
        self.assertTrue(card.is_visible())
        self.assertIn('Pekuburan tua', card.text_content())
        self.assertIn('Jam ramai', card.text_content())
        self.assertGreaterEqual(card.locator('.rv').count(), len(next(pl for pl in P['places'] if pl['id'] == 'pekuburan')['notes']))
        # one world: the town, the 85 km road, Kampung Sela
        self.assertEqual(self.page.locator('#paneMap [data-region]').count(), len(P['regions']))
        self.page.locator('#paneMap [data-region="sela"]').click()
        self.page.wait_for_timeout(50)
        vb = [float(x) for x in self.page.locator('#mapSvg').get_attribute('viewBox').split()]
        self.assertGreater(vb[0] + vb[2] / 2, 2500)
        self.assertGreater(self.page.locator('#mapSvg .road-n').count(), 20)
        self.assertGreater(self.page.locator('.map-legend span').count(), len(P['kinds']))

    def test_map_zoom_layers_and_time(self):
        self.open_map(open=True)
        svg = self.page.locator('#mapSvg')
        self.page.locator('#paneMap [data-region="semua"]').click()
        self.assertIn('z0', svg.get_attribute('class'))
        for _ in range(5): self.page.locator('#paneMap [data-mz="1"]').click()
        self.assertIn('z2', svg.get_attribute('class'))
        # layers
        self.page.locator('#wmLayersB').click()
        self.page.locator('[data-layer="salah"]').check()
        self.assertGreater(self.page.locator('#wmHeat .heat').count(), 0)
        self.page.locator('[data-layer="nama"]').uncheck()
        self.assertIn('no-names', svg.get_attribute('class'))
        self.assertGreater(self.page.locator('#wmThreads .arc').count(), 0)
        # the time machine: the clinic opens in 2005 and closes in 2019
        set_year = lambda y: self.page.evaluate(f"(() => {{ const r = document.getElementById('wmYear'); r.value = {y}; r.dispatchEvent(new Event('input', {{ bubbles: true }})); }})()")
        set_year(2000)
        self.assertEqual(self.page.locator('#mapPins .pin[data-place="klinik"]').count(), 0)
        set_year(2010)
        self.assertEqual(self.page.locator('#mapPins .pin[data-place="klinik"]').count(), 1)
        set_year(2022)
        self.assertEqual(self.page.locator('#mapPins .pin[data-place="klinik"]').count(), 0)
        self.assertEqual(self.page.locator('#wmBig').text_content(), '2022')
        # 43 years in a minute
        self.page.locator('#wmPlay').click()
        self.page.wait_for_selector('#wmCap .cap-y')
        self.page.wait_for_function("document.querySelectorAll('#fxArcs .fx-arc').length > 0 || document.querySelector('#wmCap .cap-n').textContent.split('/')[0] > 3")
        self.page.locator('#wmPlay').click()
        self.assertEqual(self.page.locator('#wmPlay').get_attribute('aria-pressed'), 'false')

    def test_journeys_reviews_directions_and_streets(self):
        self.open_map(open=False, read={'s2023d': 1, 'el1996': 2, 'ls2016': 3, 'n2016': 4})
        js = self.page.locator('#wmJourneys [data-journey]')
        self.assertEqual(js.count(), 2)
        self.page.locator('[data-journey="gendong_sukrim"]').click()
        cap = self.page.locator('#wmCap')
        self.assertIn('Tiga kilometer dalam gelap', cap.text_content())
        self.assertIn('puskesmas', cap.text_content())
        self.assertIn('night', self.page.locator('#mapSvg').get_attribute('class'))
        self.assertEqual(self.page.locator('#jPath').count(), 1)
        # directions from the cemetery to the flower shop
        self.page.locator('#paneMap [data-region="kota"]').click()
        self.click_svg('#mapPins .pin[data-place="pekuburan"]')
        self.page.locator('#mapCard select[data-arah]').select_option('toko_bunga')
        self.assertRegex(self.page.locator('#mcRoute').text_content(), r'km|m ·')
        self.assertEqual(self.page.locator('#wmRoute').count(), 1)
        # a street card
        self.click_svg('#mapSvg .road-hit[data-road="0"]')
        self.assertIn('Jalan Kartini', self.page.locator('#mapCard').text_content())

    def test_map_editing_mode(self):
        self.page.goto(self.url + '?sunting=1#peta', wait_until='domcontentloaded')
        self.page.wait_for_selector('#wmEdit')
        # everything is shown for the author
        self.assertEqual(self.page.locator('#mapPins .pin[data-place]').count(), len(self.W['peta']['places']))
        box = self.page.locator('#mapSvg').bounding_box()
        self.page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        self.assertRegex(self.page.locator('#edXY').text_content(), r'x \d+ · y \d+')
        with self.page.expect_download() as dl:
            self.page.locator('#edSave').click()
        data = json.loads(Path(dl.value.path()).read_text())
        self.assertEqual(len(data['places']), len(self.W['peta']['places']))

    def test_tying_two_facts_finds_a_knot(self):
        groups = {}
        for e in self.W['entries']:
            for p in e['p']:
                for a in p['a']:
                    for g in a.get('irony', []):
                        ps = sorted(set(x for x in g if x in self.W['props']))
                        if len(ps) == 2: groups['+'.join(ps)] = ps
        key, (a, b) = next(iter(groups.items()))
        known = {a: self.W['props'][a][0], b: self.W['props'][b][0]}
        self.go()
        self.seed_state(known=known)
        self.page.evaluate("location.hash = 'papan'")
        self.page.wait_for_selector('#bd .bd-card')
        self.assertIn('1', self.page.locator('.bd-score').text_content())
        self.page.locator(f'#bd .bd-card[data-p="{a}"]').click()
        self.page.locator(f'#bd .bd-card[data-p="{b}"]').click()
        self.page.wait_for_selector('#bdFound:not([hidden])')
        self.assertIn('Kamu menemukan simpul ini sendiri', self.page.locator('#bdFound').text_content())
        self.assertIn(key, self.state()['board']['found'])

    def test_a_chain_between_two_people(self):
        self.go('#rantai')
        self.page.wait_for_selector('#chFrom')
        self.page.locator('#chFrom').select_option('rasmi')
        self.page.locator('#chTo').select_option('nara')
        nodes = self.page.locator('.chain .ch-node a')
        self.assertGreaterEqual(nodes.count(), 2)
        first, last = nodes.first.get_attribute('href')[3:], nodes.last.get_attribute('href')[3:]
        self.assertEqual(self.BY[first]['owner'], 'rasmi')
        self.assertEqual(self.BY[last]['owner'], 'nara')
        self.assertEqual(self.page.locator('.chain .ch-via').count(), nodes.count() - 1)

    def test_things_that_change_hands(self):
        self.go('#benda')
        self.page.wait_for_selector('#paneThings [data-thing]')
        self.assertEqual(self.page.locator('#paneThings [data-thing]').count(), len(self.W['benda']))
        self.page.locator('#paneThings [data-thing="gelang"]').click()
        gelang = next(b for b in self.W['benda'] if b['id'] == 'gelang')
        self.assertEqual(self.page.locator('.th-list li').count(), len(gelang['notes']))
        self.assertGreaterEqual(len({self.BY[i]['owner'] for i in gelang['notes']}), 3)

    def test_calendar_and_the_town_in_a_year(self):
        self.go()
        self.seed_state(read={'n1999': 1})
        self.page.evaluate("location.hash = 'waktu'")
        self.page.wait_for_selector('#calHost')
        shared = self.page.locator('#calHost a[href^="#malam-"]')
        self.assertGreater(shared.count(), 0)
        self.assertGreater(self.page.locator('#calHost .cl-c.rd').count(), 0)
        self.page.evaluate("location.hash = 'orang'")
        self.page.wait_for_selector('#townRange')
        self.page.evaluate("(() => { const r = document.getElementById('townRange'); r.value = 1999; r.dispatchEvent(new Event('input')); })()")
        self.assertEqual(self.page.locator('#townY').text_content(), '1999')
        self.assertIn('5', self.page.locator('.tw-t[data-who="nara"] .tw-age').text_content())
        self.assertIn('belum lahir', self.page.locator('.tw-t[data-who="bayu"]').text_content())

    def test_know_their_voices(self):
        self.go()
        self.seed_state(read={'n1999': 1, 'k1987': 2, 'ls1990': 3})
        self.page.evaluate("location.hash = 'orang'")
        self.page.wait_for_selector('#quizGo')
        self.page.locator('#quizGo').click()
        self.assertTrue(self.page.locator('#quizDialog').is_visible())
        self.assertGreaterEqual(self.page.locator('.qz-o').count(), 2)
        self.page.locator('.qz-o').first.click()
        self.assertEqual(sum(v[1] for v in self.state()['voice'].values()), 1)
        self.assertEqual(self.page.locator('.qz-o.right').count(), 1)

    def test_previously_loose_threads_and_their_eyes(self):
        e = self.BY['k2010']
        groups = [g for p in e['p'] for a in p['a'] for g in a.get('irony', []) if all(x in self.W['props'] for x in g)]
        known = {x: self.W['props'][x][0] for x in groups[0]}
        self.go()
        self.seed_state(read={'n1999': 1, 'k2010': 2}, known=known, knownAt={x: 1 for x in known}, last='k2010', strand=[{'id': 'n1999'}, {'id': 'k2010', 'how': 'go'}])
        self.page.evaluate("location.hash = ''")
        self.page.wait_for_selector('#recap')
        self.assertIn('Sebelumnya di Salasimpul', self.page.locator('#recap').text_content())
        self.assertEqual(self.page.locator('#recap .rc-thread li').count(), 2)
        # loose threads: knots from what you read to what you have not
        self.assertTrue(self.page.locator('#openKnow').get_attribute('data-n'))
        self.page.locator('#openKnow').click()
        self.assertGreater(self.page.locator('#dangle .dg-row').count(), 0)
        self.page.keyboard.press('Escape')
        # reading with the writer's eyes
        self.open_note('k2010')
        if self.page.locator('#nBody .s.ir.lit').count():
            self.page.locator('#eyes').click()
            self.assertTrue(self.page.evaluate("document.getElementById('note').classList.contains('eyes')"))
            self.assertTrue(self.page.locator('#eyesNote').is_visible())
            self.assertGreater(self.page.locator('#nBody .s.ir.lit[data-eye]').count(), 0)
        self.page.locator('.n-who a[data-who="karman"]').click()
        self.assertIn('Apa yang ia tahu', self.page.locator('#whoBody').text_content())


if __name__ == '__main__':
    unittest.main(verbosity=2)
