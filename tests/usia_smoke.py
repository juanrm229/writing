"""Browser checks for Usia Pulang, the interactive novel: python3 tests/usia_smoke.py.

The engine follows the author's story contract in content/usia-pulang.json (built from Simpul-Cerita.json):
entering a node records it and sets its on_enter flags; a choice sets and removes flags and moves to its target;
options with requires_flags appear only when those flags are held; an interlude shows exactly one variant (the one
whose visited_all matches), queues every matching echo in order, then moves to next. Flag names never reach the
page. These tests drive the page like a reader, and compare it with a small model of that contract.
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
SLUG = 'usia-pulang'
SEEN = "try { localStorage.setItem('jm:guide:usia-pulang', '1') } catch (e) {}"
STATE = """() => {
  if (document.querySelector('#after')) return 'end';
  if (document.querySelector('.choose:not(.done) .opt')) return 'choose';
  if (document.querySelector('.cont:not(.done) .go')) return 'go';
  return false;
}"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def norm(s):
    s = re.sub(r'\*\*?', '', s)
    return re.sub(r'\s+', ' ', s).strip()


class Story:
    """A small model of the story contract, used to know what the page should show."""

    def __init__(self, data):
        self.data, self.nodes = data, data['nodes']

    def options(self, node_id, flags):
        return [c for c in self.nodes[node_id].get('choices', []) if set(c.get('requires_flags', [])) <= flags]

    def run(self, pick):
        flags, visited, used, queue, after = set(), [], [], [], None
        cur = self.data['entry']
        while True:
            n = self.nodes[cur]
            visited.append(cur)
            flags |= set(n.get('on_enter_flags', []))
            if n['kind'] == 'ending':
                return visited, used, cur
            if n['kind'] == 'choice':
                c = pick(cur, self.options(cur, flags))
                used.append(c['id'])
                flags |= set(c.get('set_flags', []))
                flags -= set(c.get('unset_flags', []))
                cur = c['target']
                continue
            if n['kind'] == 'perspective':
                queue = [cb['target'] for cb in n.get('callbacks', []) if set(cb.get('requires_flags', [])) <= flags and all(v in visited for v in cb.get('visited_all', []))]
                after = n['next']
            cur = queue.pop(0) if queue else after

    def setter(self, flag):
        return next(c for n in self.nodes.values() for c in n.get('choices', []) if flag in c.get('set_flags', []))


class UsiaSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/antologi/{SLUG}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.data = json.loads((ROOT / 'content/usia-pulang.json').read_text())
        cls.story = Story(cls.data)
        cls.N = cls.data['nodes']

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
        self.dialogs = []
        self.page.on('dialog', lambda d: (self.dialogs.append(d.message), d.accept()))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    # ---------- helpers ----------
    def open(self, query=''):
        self.page.goto(self.url + query, wait_until='domcontentloaded')
        self.page.wait_for_selector('#begin')

    def begin(self, query=''):
        self.open(query)
        self.page.locator('#begin').click()
        self.page.wait_for_function(STATE)

    def run_state(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:usia:run'))")

    def play(self, pick, until=None):
        """Read on, choosing with pick(node_id, option_ids) until the ending (or until a node id appears)."""
        while True:
            state = self.page.wait_for_function(STATE).json_value()
            if until and self.page.locator(f'.node[data-id="{until}"]').count():
                return
            if state == 'end':
                return
            if state == 'go':
                self.page.locator('.cont:not(.done) .go').click()
                continue
            box = self.page.locator('.choose:not(.done)')
            node = box.evaluate("e => e.closest('.node').dataset.id")
            ids = box.locator('.opt').evaluate_all('els => els.map(e => e.dataset.c)')
            choice = pick(node, ids)
            box.locator(f'.opt[data-c="{choice}"]').press('Enter')

    def route_to(self, wanted):
        """A picker that heads for the given choice ids: it picks the shared scene option leading to each one's journey."""
        lead = {}
        for cid in wanted:
            node = cid.rsplit('_', 1)[0]
            if node.startswith('H'):
                day = 'C0' + node[1]
                lead[day] = next(c['id'] for c in self.N[day]['choices'] if c['target'] == node)
        want = set(wanted) | set(lead.values())

        def pick(node, ids):
            for cid in ids:
                if cid in want:
                    return cid
            return ids[0]
        return pick

    # ---------- tests ----------
    def test_data_follows_the_contract(self):
        N = self.N
        self.assertEqual(self.data['entry'], 'C01')
        self.assertEqual(len(N), 64)
        self.assertEqual(sorted(k for k, n in N.items() if n['kind'] == 'ending'), [f'E0{i}' for i in range(1, 9)])
        self.assertEqual(sum(len(n.get('choices', [])) for n in N.values()), 125)
        for n in N.values():
            for c in n.get('choices', []):
                self.assertIn(c['target'], N, c['id'])
            for cb in n.get('callbacks', []):
                self.assertIn(cb['target'], N)
            if n['kind'] == 'perspective':
                self.assertIn(n['next'], N)

    def test_every_node_option_and_ending_can_be_reached_in_the_page(self):
        seen_nodes, seen_options, endings = set(), set(), set()
        self.begin()
        runs = [(j, m) for j in range(4) for m in range(4)] + [('gate', 'H7C_1'), ('gate', 'H7A_1')]
        for k, (j, m) in enumerate(runs):
            if j == 'gate':
                base = self.route_to([m])
                pick = (lambda b, target: lambda node, ids: target if node == 'Z00' and target in ids else b(node, ids))(base, {'H7C_1': 'Z00_4', 'H7A_1': 'Z00_1'}[m])
            else:
                pick = (lambda j, m: lambda node, ids: ids[(j if node.startswith('C') else m if node.startswith('H') else j * 4 + m) % len(ids)])(j, m)
            self.play(pick)
            run = self.run_state()
            seen_nodes |= set(run['visited'])
            seen_options |= {e['choice'] for e in run['path'] if e.get('choice')}
            endings.add(run['path'][-1]['id'])
            # the page agrees with the model of the contract
            visited, used, end = self.story.run(lambda node, opts: next(c for c in opts if c['id'] == next(e['choice'] for e in run['path'] if e['id'] == node)))
            self.assertEqual(run['visited'], visited)
            self.assertEqual(run['path'][-1]['id'], end)
            if k < len(runs) - 1:
                self.page.locator('#again').click()
                self.page.wait_for_function("!document.querySelector('#after') && document.querySelectorAll('.node').length === 1")
        all_options = {c['id'] for n in self.N.values() for c in n.get('choices', [])}
        self.assertEqual(seen_nodes, set(self.N))
        self.assertEqual(seen_options, all_options)
        self.assertEqual(endings, {f'E0{i}' for i in range(1, 9)})
        self.assertIn('8 dari 8', self.page.locator('#map').text_content())

    def test_final_doors_follow_the_invitations(self):
        self.begin()
        # no invitation: neither gated door is shown
        self.play(self.route_to(['H6B_1', 'H7B_1']), until='Z00')
        self.page.wait_for_selector('.node[data-id="Z00"] .opt')
        doors = self.page.locator('.node[data-id="Z00"] .opt').evaluate_all('els => els.map(e => e.dataset.c)')
        self.assertNotIn('Z00_1', doors); self.assertNotIn('Z00_4', doors)
        self.assertEqual(len(doors), 6)
        # the doors say whether Laras stays, never a score
        self.assertIn('tidak menetap', self.page.locator('.node[data-id="Z00"] .choose').text_content())

        # Dian invites on Saturday, then Laras turns the room down on Sunday: the invitation is withdrawn
        self.page.evaluate("localStorage.removeItem('jm:usia:run')")
        self.begin()
        self.play(self.route_to(['H6A_1', 'H7A_2']), until='Z00')
        self.page.wait_for_selector('.node[data-id="Z00"] .opt')
        doors = self.page.locator('.node[data-id="Z00"] .opt').evaluate_all('els => els.map(e => e.dataset.c)')
        self.assertNotIn('Z00_1', doors)

        # Ratna's offer accepted on Sunday opens her door, and it leads to its ending
        self.page.evaluate("localStorage.removeItem('jm:usia:run')")
        self.begin()
        self.play(self.route_to(['H7C_1', 'Z00_4']))
        self.assertEqual(self.run_state()['path'][-1]['id'], 'E04')

    def test_interlude_shows_the_variant_for_the_journey_taken(self):
        P = self.N['P01']
        self.begin()
        self.play(self.route_to(['H1C_1']), until='P01')
        text = norm(self.page.locator('.node[data-id="P01"] .n-body').inner_text())
        for v in P['variants']:
            first = norm(v['body'].split('\n\n')[0])
            if 'H1C' in v['visited_all']:
                self.assertIn(first, text)
            else:
                self.assertNotIn(first, text)
        self.assertIn(norm(P['body_before'].split('\n\n')[0]), text)
        # what the interlude shows belongs to the reader alone
        note = self.page.locator('.node[data-id="P01"] .n-note').inner_text()
        self.assertIn('Laras tidak mengetahui', note); self.assertIn('Dian', note)
        self.assertIn('Kembali ke Laras', self.page.locator('.node[data-id="P01"] .cont').inner_text())

    def test_echo_quotes_the_readers_own_choice(self):
        cb = self.N['P02']['callbacks'][0]
        cause = self.story.setter(cb['requires_flags'][0])
        self.begin()
        self.play(self.route_to([cause['id']]), until=cb['target'])
        echo = self.page.locator(f'.node[data-id="{cb["target"]}"]')
        self.assertIn('Gema', echo.locator('.n-kind').text_content())
        self.assertEqual(norm(echo.locator('.n-quote').inner_text()), norm(cause['label']))
        self.assertIn('kamu memilih', echo.locator('.n-cause small').text_content())
        # the echo comes right after the interlude, then the story goes on to the next day
        ids = self.page.locator('.node').evaluate_all('els => els.map(e => e.dataset.id)')
        self.assertEqual(ids[-2:], ['P02', cb['target']])
        self.page.locator('.cont:not(.done) .go').click()
        self.page.wait_for_selector('.node[data-id="C03"]')

    def test_echoes_queue_in_the_authors_order(self):
        # find an interlude where more than one echo can fire, and a route that fires them
        for pid in [f'P0{i}' for i in range(1, 8)]:
            cbs = self.N[pid].get('callbacks', [])
            flags = [cb['requires_flags'][0] for cb in cbs if cb.get('requires_flags')]
            setters = [self.story.setter(f) for f in flags]
            days = {c['id'].rsplit('_', 1)[0] for c in setters}
            pairs = [(a, b) for i, a in enumerate(setters) for b in setters[i + 1:] if a['id'].rsplit('_', 1)[0][:2] != b['id'].rsplit('_', 1)[0][:2]]
            if pairs:
                a, b = pairs[0]
                self.begin()
                self.play(self.route_to([a['id'], b['id']]), until=pid)
                self.page.wait_for_selector(f'.node[data-id="{pid}"] .cont .go')
                order = [cb['target'] for cb in cbs if cb['target'] in {cbs[flags.index(f)]['target'] for f in a['set_flags'] + b['set_flags'] if f in flags}]
                self.page.locator('.cont:not(.done) .go').click()
                for target in order:
                    self.page.wait_for_selector(f'.node[data-id="{target}"]')
                    if target != order[-1]:
                        self.page.locator('.cont:not(.done) .go').click()
                ids = self.page.locator('.node').evaluate_all('els => els.map(e => e.dataset.id)')
                self.assertEqual(ids[-len(order):], order)
                return
        self.skipTest('no interlude where two echoes can fire together')

    def test_choices_cannot_be_taken_back(self):
        self.begin()
        first = self.page.locator('.node[data-id="C01"] .opt').first
        cid = first.get_attribute('data-c')
        first.press('Enter')
        self.page.wait_for_selector('.node ~ .node')
        box = self.page.locator('.node[data-id="C01"] .choose')
        self.assertEqual(box.locator('.opt:visible').count(), 1)
        self.assertTrue(box.locator('.opt.picked').is_disabled())
        self.assertEqual(box.locator('.opt.picked').get_attribute('data-c'), cid)
        self.assertIn('Tercatat di Kartu Kepulangan', box.inner_text())
        before = len(self.run_state()['path'])
        box.locator('.opt.picked').click(force=True)
        self.page.wait_for_timeout(200)
        self.assertEqual(len(self.run_state()['path']), before)
        self.assertEqual(self.page.locator('.node[data-id="C01"]').count(), 1)

    def test_flag_names_never_reach_the_page(self):
        flags = {f for n in self.N.values() for f in n.get('on_enter_flags', [])}
        flags |= {f for n in self.N.values() for c in n.get('choices', []) for f in c.get('set_flags', []) + c.get('unset_flags', []) + c.get('requires_flags', [])}
        self.begin()
        self.play(lambda node, ids: ids[-1])
        self.page.locator('#openCard').click()
        page = self.page.evaluate('document.body.innerHTML')
        for f in flags:
            self.assertNotIn(f, page)
        self.assertNotRegex(self.page.evaluate('document.body.innerText'), r'\b[a-z]+_[a-z_]+\b')

    def test_resume_after_reload(self):
        self.begin()
        self.play(self.route_to(['H1B_2', 'H2C_1']), until='P02')
        before = self.page.locator('.node').evaluate_all('els => els.map(e => e.dataset.id)')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('#begin')
        self.assertIn('Lanjutkan', self.page.locator('#begin').inner_text())
        self.assertIn('Selasa', self.page.locator('#begin').inner_text())
        self.page.locator('#begin').click()
        self.page.wait_for_function(STATE)
        after = self.page.locator('.node').evaluate_all('els => els.map(e => e.dataset.id)')
        self.assertEqual(after, before)
        # earlier choices stay settled, and the reader can go on
        self.assertEqual(self.page.locator('.choose:not(.done)').count(), 0)
        self.assertEqual(self.page.locator('.node[data-id="C01"] .opt.picked').get_attribute('data-c'), 'C01_2')
        self.page.locator('.cont:not(.done) .go').click()
        self.page.wait_for_selector('.node[data-id="C03"]')

    def test_return_card_records_the_path(self):
        self.begin()
        self.play(self.route_to(['H1A_1', 'H2B_2']), until='C03')
        self.page.locator('#openCard').click()
        card = self.page.locator('#cardDialog')
        self.assertTrue(card.is_visible())
        rows = card.locator('.cd-days li')
        self.assertEqual(rows.count(), 8)
        label = lambda cid: next(c['label'] for c in self.N[cid.rsplit('_', 1)[0]]['choices'] if c['id'] == cid)
        c01 = self.run_state()['path'][0]['choice']
        self.assertEqual(norm(rows.nth(0).locator('.stamp').inner_text()), norm(label(c01)))
        self.assertEqual(norm(rows.nth(0).locator('.hand').inner_text()), norm(label('H1A_1')))
        self.assertEqual(norm(rows.nth(1).locator('.hand').inner_text()), norm(label('H2B_2')))
        self.assertIn('Senin', rows.nth(0).inner_text())
        self.assertEqual(rows.nth(3).locator('.stamp').count(), 0)
        self.assertIn('belum diputuskan', rows.nth(7).inner_text())
        card.locator('[data-close]').click()
        self.assertFalse(card.is_visible())

    def test_map_endings_found_and_start_from_a_day(self):
        self.begin()
        self.play(lambda node, ids: ids[0])
        run = self.run_state()
        # the stitch pattern: one stitch for every morning, afternoon and interlude on the path
        lit = self.page.locator('#map .st.lit').evaluate_all('els => els.map(e => e.dataset.id)')
        self.assertEqual(sorted(lit), sorted(v for v in run['visited'] if v[0] in 'CHP'))
        self.assertEqual(self.page.locator('#map .pt-echo').count(), sum(1 for v in run['visited'] if v[0] == 'R'))
        stays = not self.N['Z00']['choices'][[c['id'] for c in self.N['Z00']['choices']].index(run['path'][-2]['choice'])]['label'].startswith('Tidak menetap')
        self.assertEqual(self.page.locator('#map .pt-knot').count(), 1 if stays else 0)
        self.assertEqual(self.page.locator('#map .pt-tail').count(), 0 if stays else 1)
        self.assertIn('1 dari 8', self.page.locator('#map').text_content())
        self.assertRegex(self.page.locator('.mp-words').inner_text(), r'Kamu membaca [\d.]+ dari 51\.309 kata\.')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:usia:endings'))"), [run['path'][-1]['id']])
        self.assertIn(SLUG, self.page.evaluate("JSON.parse(localStorage.getItem('jm:stats')).done"))
        self.assertEqual(self.page.evaluate(f"JSON.parse(localStorage.getItem('jm:prog'))['{SLUG}']"), 1)
        self.page.wait_for_selector('.jm-next[data-filled]')
        # start again from Thursday: the days before stay as they were, the rest is open again
        self.page.locator('#fromDay').select_option('C04')
        self.page.wait_for_function("!document.querySelector('#after')")
        ids = self.page.locator('.node').evaluate_all('els => els.map(e => e.dataset.id)')
        self.assertEqual(ids[-1], 'C04')
        self.assertEqual(ids[:-1], [e['id'] for e in run['path'][:ids.index('C04')]])
        self.assertEqual(self.page.locator('.choose:not(.done)').count(), 1)
        self.play(lambda node, ids: ids[-1])
        self.assertNotEqual(self.run_state()['path'][-1]['id'], run['path'][-1]['id'])
        self.assertIn('2 dari 8', self.page.locator('#map').text_content())

    def test_clock_counts_the_168_hours(self):
        self.begin()
        self.assertTrue(self.page.locator('#clock').is_visible())
        self.assertIn('18.40', self.page.locator('#ckTime').inner_text())
        self.assertIn('sisa 168 jam', self.page.locator('#ckTime').text_content())
        self.assertIn('Senin, 9 November', self.page.locator('#ckWhen').inner_text())
        self.assertEqual(self.page.locator('#cast .ck-p').first.get_attribute('data-who'), 'Laras')
        self.assertIn('Dian', self.page.locator('#cast .ck-p').evaluate_all('els => els.map(e => e.dataset.who)'))
        self.assertIn('Hari 1 dari 7', self.page.locator('#stepChip').inner_text())
        self.play(lambda node, ids: ids[0], until='Z00')
        self.page.locator('.node[data-id="Z00"]').scroll_into_view_if_needed()
        self.page.locator('.node[data-id="Z00"] .n-head').evaluate('e => e.scrollIntoView()')
        self.page.wait_for_function("document.getElementById('ckTime').innerText.includes('17.40')")
        self.assertIn('sisa 1 jam', self.page.locator('#ckTime').text_content())
        self.assertIn('Senin, 16 November', self.page.locator('#ckWhen').inner_text())

    def test_preview_writes_no_history(self):
        self.begin('?preview=1')
        self.page.locator('.opt').first.press('Enter')
        self.page.wait_for_selector('.node ~ .node')
        stored = self.page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('jm:') && !k.startsWith('jm:guide'))")
        self.assertEqual(stored, [])

    def test_english_interface(self):
        self.open('?lang=en')
        self.assertEqual(self.page.evaluate('document.documentElement.lang'), 'en')
        self.assertIn('Seven days', self.page.locator('#rule1').inner_text())
        self.assertTrue(self.page.locator('#lost').is_visible())
        self.assertIn('original Indonesian', self.page.locator('#lost').inner_text())
        self.assertIn('Begin', self.page.locator('#begin').inner_text())
        self.page.locator('#begin').click()
        self.page.wait_for_function(STATE)
        self.assertIn('Monday, 9 November', self.page.locator('#ckWhen').inner_text())
        self.assertIn('Where does Laras go tonight?', self.page.locator('.ch-q').text_content())
        self.assertIn('Day 1 of 7', self.page.locator('#stepChip').inner_text())

    # ---------- the immersive layer ----------
    def motion_page(self):
        ctx = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='no-preference', service_workers='block')
        ctx.add_init_script(SEEN)
        ctx.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        page = ctx.new_page()
        page.on('pageerror', lambda e: self.errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())
        self.addCleanup(ctx.close)
        return page

    def test_a_choice_is_pressed_and_held(self):
        self.begin()
        opt = self.page.locator('.node[data-id="C01"] .opt').nth(1)
        opt.scroll_into_view_if_needed()
        box = opt.bounding_box()
        self.page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        # a quick tap does nothing
        self.page.mouse.down(); self.page.wait_for_timeout(250); self.page.mouse.up()
        self.page.wait_for_timeout(1200)
        self.assertEqual(self.page.locator('.choose.done').count(), 0)
        self.assertIn('Tekan dan tahan', self.page.locator('.ch-hint').inner_text())
        # holding long enough stamps it
        self.page.mouse.down(); self.page.wait_for_timeout(1300); self.page.mouse.up()
        self.page.wait_for_selector('.node[data-id="C01"] .choose.done')
        self.assertEqual(self.page.locator('.opt.picked').get_attribute('data-c'), opt.get_attribute('data-c'))
        self.assertIn('Senin', self.page.locator('.opt.picked .o-stamp').text_content())

    def test_story_objects_sit_beside_their_sentence(self):
        self.open()
        benda = self.page.evaluate('window.USIA_BENDA')
        self.assertGreaterEqual(sum(len(v) for v in benda.values()), 30)
        for node, items in benda.items():
            n = self.N[node]
            parts = [p for t in [n.get('body'), n.get('body_before'), n.get('body_after')] + [v['body'] for v in n.get('variants', [])] if t for p in re.split(r'\n\s*\n', t)]
            for o in items:
                with self.subTest(node=node, at=o['at']):
                    self.assertEqual(sum(o['at'] in p for p in parts), 1)
        # on the page: the temporary identity card has an empty address, the letter names Kota Hilir
        self.page.locator('#begin').click()
        self.play(self.route_to(['H2A_1']), until='C03')
        card = self.page.locator('.node[data-id="C02"] .bd-card')
        self.assertIn('Kartu Identitas Sementara', card.text_content())
        self.assertEqual(card.locator('.bd-empty').count(), 1)
        self.assertIn('Ratna', self.page.locator('.node[data-id="C02"] .bd-phone .bd-bar').inner_text())
        letter = self.page.locator('.node[data-id="C03"] .bd-letter')
        self.assertIn('Kota Hilir', letter.inner_text())
        self.assertIn('Minggu, 9 November 1997', letter.inner_text())
        # the object comes right after the paragraph it belongs to, and the prose is untouched
        prev = letter.evaluate('e => e.parentElement.textContent')
        self.assertIn('Dian membaca alamat pada surat', prev)
        self.assertEqual(self.page.locator('.node[data-id="H2A"] .bd-photo').count(), 1)

    def test_who_is_in_the_scene_and_what_you_know(self):
        self.begin()
        self.play(self.route_to(['H1B_1']), until='C02')
        # Dian's interlude was read: her name is dotted later, and the sheet says Laras does not know
        kn = self.page.locator('.node[data-id="C02"] .kn[data-who="Dian"]').first
        self.assertEqual(kn.inner_text(), 'Dian')
        kn.click()
        sheet = self.page.locator('#sheet')
        self.assertTrue(sheet.is_visible())
        self.assertIn('Laras tidak mengetahui ini', sheet.inner_text())
        self.assertIn('37', sheet.inner_text()); self.assertIn('8', sheet.locator('.sh-ages').inner_text())
        self.page.keyboard.press('Escape')
        self.assertFalse(sheet.is_visible())
        # the cast under the clock
        self.page.locator('.node[data-id="C02"] .n-head').evaluate('e => e.scrollIntoView()')
        self.page.wait_for_function("document.querySelector('#cast .ck-p')")
        laras = self.page.locator('#cast .ck-p').first
        self.assertEqual(laras.get_attribute('data-who'), 'Laras')
        laras.click()
        self.assertIn('Tubuhnya tidak ikut menua', sheet.inner_text())
        # interludes: the clock says Laras is not here
        self.page.locator('.node[data-id="P01"] .n-head').evaluate('e => e.scrollIntoView()')
        self.page.wait_for_function("document.getElementById('clock').classList.contains('away')")
        self.assertIn('Laras tidak di sini', self.page.locator('#ckWhen').inner_text())

    def test_thread_knots_and_echo_loops(self):
        cb = self.N['P02']['callbacks'][0]
        cause = self.story.setter(cb['requires_flags'][0])
        self.begin()
        self.play(self.route_to([cause['id']]), until=cb['target'])
        self.page.wait_for_timeout(100)
        knots = self.page.locator('#thread .th-knots path').count()
        self.assertEqual(knots, self.page.locator('.opt.picked').count())
        self.assertEqual(self.page.locator('#thread .th-loops path').count(), 1)
        self.assertIn(cb['target'], self.page.evaluate("[...document.querySelectorAll('.node[data-cause]')].map(e => e.dataset.id)"))
        # "see that choice" goes back to it
        self.page.locator(f'.node[data-id="{cb["target"]}"] .n-back').click()
        self.page.wait_for_selector('.opt.called')

    def test_time_passes_between_days_and_stops_at_the_end(self):
        page = self.motion_page()
        page.goto(self.url, wait_until='domcontentloaded')
        page.locator('#begin').click()
        page.wait_for_selector('.node[data-id="C01"].surface')
        # through the first night: the remaining hours roll down
        while not page.locator('.node[data-id="C02"]').count():
            state = page.wait_for_function(STATE).json_value()
            if state == 'go':
                page.locator('.cont:not(.done) .go').click()
            else:
                box = page.locator('.choose:not(.done)')
                if box.locator('.opt').count():
                    box.locator('.opt').first.press('Enter')
                    page.wait_for_function("document.querySelectorAll('.choose:not(.done) .opt').length === 0 || document.querySelector('.cross, .night')")
            if page.locator('.cross').count():
                self.assertIn('Laras tidak ikut ke sini', page.locator('.cross').inner_text())
                page.locator('.cross').dispatch_event('click')
        night = page.locator('.night')
        self.assertEqual(night.count(), 1)
        self.assertIn('Selasa', night.inner_text())
        self.assertIn('jam tersisa', night.text_content())
        page.wait_for_function("document.querySelector('.night .nt-n b').textContent === '156'")
        night.dispatch_event('click')
        page.wait_for_selector('.night', state='detached')


if __name__ == '__main__':
    unittest.main(verbosity=2)
