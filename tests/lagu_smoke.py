"""Browser checks for the text's own song, the honest grooves and the needle drop: python3 tests/lagu_smoke.py.

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
Audio is never listened to: an init script counts the oscillators the page starts.
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
COUNT_OSC = """
window.__osc = 0;
(() => { const st = OscillatorNode.prototype.start; OscillatorNode.prototype.start = function (...a) { window.__osc++; return st.apply(this, a); }; })();
"""
# pengalaman yang punya rancangan bunyinya sendiri tidak diberi tombol lagu naskah
OWN_SOUND = ['interlude', 'terlambat-satu-menit', 'usia-pulang', 'semua-yang-pernah', 'yang-tidak-pernah-dibacakan']
WITH_SONG = ['anda-di-sini', 'giliran', 'di-dasar-rumah', 'pabrik-mimpi', 'sebelum-makna', 'the-moon-behind-my-eyes', 'the-room', 'trillions-of-seconds', 'arsip']
EN_STOP = {'behind', 'would', 'there', 'their', 'about', 'which', 'could', 'should', 'these', 'those', 'through', 'where'}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class LaguSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        cls.works = [w for w in json.loads((ROOT / 'content/works.json').read_text()) if w.get('slug') and not w.get('draft')]

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def open(self, path='', width=1280, height=800, storage=None):
        self.context = self.browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', service_workers='block')
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.context.add_init_script(COUNT_OSC)
        if storage:
            self.context.add_init_script('try {' + ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});' for k, v in storage.items()) + '} catch (e) {}')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.goto(self.root + path)
        return self.page

    def tearDown(self):
        ctx = getattr(self, 'context', None)
        if ctx:
            ctx.close()
        self.assertEqual(getattr(self, 'errors', []), [])

    def test_score_is_the_same_every_time_and_stays_in_its_scale(self):
        page = self.open('404.html')
        page.add_script_tag(url=self.root + 'assets/lagu-naskah.js')
        out = page.evaluate("""async () => {
          const works = await (await fetch('content/works.json')).json();
          return works.filter(w => !w.draft).map(w => {
            const body = (w.chapters && w.chapters.length ? w.chapters[0].body : w.body) || [];
            const o = { seed: w.slug, cat: w.cat, poem: w.form === 'puisi' };
            const a = QMLagu.compose(body, o), b = QMLagu.compose(body, o);
            const notes = a.paras.flatMap(p => p.notes);
            return { slug: w.slug, same: JSON.stringify(a) === JSON.stringify(b), notes: notes.length, total: a.total,
              degrees: notes.every(n => Number.isInteger(n.deg) && n.deg >= 0 && n.deg <= 4), timed: notes.every(n => n.t >= 0 && n.d > 0 && n.vel > 0 && n.vel <= 1),
              ends: notes.filter(n => n.end).length, key: QMLagu.describe(a).key, scale: QMLagu.describe(a).scale, paras: a.paras.length, body: body.length };
          });
        }""")
        self.assertEqual(len(out), len(self.works))
        for s in out:
            with self.subTest(s['slug']):
                self.assertTrue(s['same'], 'naskah yang sama harus menghasilkan lagu yang sama')
                self.assertTrue(s['degrees'] and s['timed'])
                self.assertGreater(s['notes'], 10)
                self.assertGreater(s['ends'], 0, 'setiap kalimat berakhir di sebuah not')
                # nomor paragraf lagu sama dengan nomor paragraf naskah, supaya lagu bisa mengikuti pembaca
                self.assertEqual(s['paras'], s['body'])
                self.assertTrue(s['key'] and s['scale'])
        # jenis tulisan memilih tangga nadanya
        scale = {s['slug']: s['scale'] for s in out}
        self.assertEqual(scale['the-room'], 'pelog')
        self.assertEqual(scale['sebelum-makna-menemukan-kita'], 'mayor')

    def test_reader_song_starts_follows_the_work_and_stops(self):
        page = self.open('#baca-di-waktu-yang-tepat')
        page.wait_for_selector('#rdBody p')
        naskah = page.locator('#ambience [data-amb="naskah"]')
        self.assertEqual(naskah.count(), 1)
        page.evaluate("document.querySelector('#ambience [data-amb=\"naskah\"]').click()")
        page.wait_for_selector('#rd-amb')
        self.assertRegex(page.locator('#rd-amb').inner_text(), r'^Naskah · [A-G][♯♭]? (minor|senja)$')
        self.assertEqual(naskah.get_attribute('aria-checked'), 'true')
        page.wait_for_function('window.__osc > 6', timeout=8000)
        # tulisan lain dibuka: chip mengikuti tulisan itu, lagu tetap menyala
        page.evaluate("location.hash = 'baca-paid-in-full'")
        page.wait_for_function("document.querySelector('#rdTitle').textContent === 'Paid in Full'")
        page.wait_for_selector('#rd-amb')
        self.assertEqual(naskah.get_attribute('aria-checked'), 'true')
        # dimatikan dari chipnya: tidak ada not baru
        page.click('#rd-amb')
        page.wait_for_timeout(900)
        before = page.evaluate('window.__osc')
        page.wait_for_timeout(1800)
        self.assertEqual(page.evaluate('window.__osc'), before)
        self.assertEqual(page.locator('#rd-amb').count(), 0)
        self.assertEqual(page.locator('#ambience [data-amb="hening"]').get_attribute('aria-checked'), 'true')

    def test_grooves_are_drawn_from_the_text(self):
        page = self.open('#pilih-yang-tidak-pernah-dibacakan', 1440, 1000)
        page.wait_for_selector('#pkDisc .pk-face.on .disc.has-groove')
        ink = """() => { const c = document.querySelector('#pkDisc .pk-face.on canvas.groove'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, sum = 0; for (let i = 3; i < d.length; i += 4) { if (d[i]) n++; sum += d[i]; } return [c.width, n, sum]; }"""
        a = page.evaluate(ink)
        self.assertGreater(a[0], 200)
        self.assertGreater(a[1], 2000, 'alur harus tergambar')
        # bilah waktu memakai bentuk yang sama: tingginya tidak seragam untuk prosa
        heights = page.evaluate("[...document.querySelectorAll('#scTicks i')].map(i => i.style.getPropertyValue('--h'))")
        self.assertEqual(len(heights), 28)
        self.assertGreater(len(set(heights)), 5)
        # tulisan lain, alur lain
        page.evaluate("location.hash = 'pilih-sebelum-makna-menemukan-kita'")
        page.wait_for_function("document.querySelector('#pkTitle').textContent.includes('Sebelum Makna')")
        page.wait_for_selector('#pkDisc .pk-face.on .disc.has-groove')
        self.assertNotEqual(page.evaluate(ink)[2], a[2])
        # piringan kecil di carousel tetap polos
        self.assertEqual(page.locator('#pkCar .disc.has-groove').count(), 0)

    def test_tapping_a_groove_drops_the_needle_there(self):
        page = self.open('#pilih-yang-tidak-pernah-dibacakan', 1440, 1000)
        page.wait_for_selector('#pkDisc .pk-face.on .disc.has-groove')
        disc = page.locator('#pkDisc')
        self.assertNotIn('aimed', disc.get_attribute('class'))
        box = disc.bounding_box()
        cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        # ketuk di jari-jari 0,35 diameter: kira-kira di tengah alur
        page.mouse.click(cx - box['width'] * .35, cy)
        page.wait_for_function("document.querySelector('#pkDisc').classList.contains('aimed')")
        frac = int(page.locator('#scrub').get_attribute('aria-valuenow'))
        self.assertTrue(40 <= frac <= 56, frac)
        self.assertRegex(page.locator('#scTag').inner_text(), rf'mulai {frac}%')
        arm = float(page.evaluate("getComputedStyle(document.querySelector('#pkDisc')).getPropertyValue('--arm')").replace('deg', ''))
        self.assertTrue(8 < arm < 30, arm)
        # cuplikan lagunya ikut berbunyi
        page.wait_for_function('window.__osc >= 2', timeout=4000)
        # mengetuk label tidak memindahkan jarum
        page.mouse.click(cx, cy + box['height'] * .1)
        page.wait_for_timeout(200)
        self.assertEqual(int(page.locator('#scrub').get_attribute('aria-valuenow')), frac)
        # lebih ke dalam berarti lebih jauh di dalam tulisan
        page.mouse.click(cx - box['width'] * .25, cy)
        page.wait_for_timeout(200)
        self.assertGreater(int(page.locator('#scrub').get_attribute('aria-valuenow')), frac)

    def test_song_button_only_where_the_experience_has_no_sound_of_its_own(self):
        for name in OWN_SOUND:
            with self.subTest(name):
                page = self.open(f'antologi/{name}/index.html', 390, 844, {f'jm:guide:{name}': '1'})
                page.wait_for_selector('.jm-help, .qm-icon')
                page.wait_for_timeout(400)
                self.assertEqual(page.locator('.jm-song').count(), 0)
                self.context.close(); self.context = None
        for name in WITH_SONG:
            with self.subTest(name):
                page = self.open(f'antologi/{name}/index.html' + ('#thought-log-002-the-dissonant-shell' if name == 'arsip' else ''), 390, 844)
                page.wait_for_selector('.jm-song', state='attached')
                if page.locator('.jm-go').count():
                    page.click('.jm-go')
                btn = page.locator('.jm-song')
                self.assertEqual(btn.get_attribute('aria-pressed'), 'false')
                page.wait_for_function('!!window.QMLagu')
                btn.click()
                self.assertEqual(btn.get_attribute('aria-pressed'), 'true')
                self.assertEqual(page.evaluate("localStorage.getItem('jm:lagu')"), 'true')
                page.wait_for_function('window.__osc >= 3', timeout=8000)
                btn.click()
                self.assertEqual(btn.get_attribute('aria-pressed'), 'false')
                self.assertEqual(page.evaluate("localStorage.getItem('jm:lagu')"), 'false')
                self.assertEqual(self.errors, [])
                self.context.close(); self.context = None

    def test_home_fits_a_short_laptop_screen(self):
        page = self.open('', 1280, 800)
        page.wait_for_selector('.disc.top')
        page.wait_for_timeout(600)
        r = page.evaluate("""() => { const b = s => document.querySelector(s).getBoundingClientRect(); const t = b('.th-title'), c = b('.crate'), n = b('.ts-next'), p = b('.turn-setup'); return { title: t.bottom, crate: c.top, next: n.bottom, panel: p.bottom }; }""")
        self.assertLessEqual(r['title'], r['crate'] + 1, 'piringan tidak boleh menutupi judul')
        self.assertLessEqual(r['next'], r['panel'], 'tombol Putar harus terlihat utuh')

    def test_english_function_words_are_not_threads(self):
        page = self.open('#baca-the-room', 1280, 800, {'jm:mode': 'biasa'})
        page.wait_for_selector('#rdBody p')
        words = page.evaluate("[...document.querySelectorAll('#rdRelated .rel small i')].map(i => i.textContent)")
        self.assertTrue(words, 'puisi ini harus punya benang merah')
        self.assertFalse(EN_STOP & set(words), words)


if __name__ == '__main__':
    unittest.main(verbosity=2)
