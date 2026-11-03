"""Browser checks for author margin notes and "Titipan" (a line left for someone): python3 tests/margin_smoke.py.

Margin notes come from works.json (margins: [{ at, note }]) and show as a blue dot beside their paragraph.
A Titipan packs one selected line and a short message into the share link; the receiver opens the plain reader
at that paragraph with the message in the margin. Uses Python Playwright and system Chromium; no network needed.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SLUG = 'di-waktu-yang-tepat'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class MarginSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])
        cls.works = json.loads((ROOT / 'content/works.json').read_text())
        cls.work = next(w for w in cls.works if w['slug'] == SLUG)
        cls.second = next(p for p in cls.work['body'][1:] if len(p) > 80)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page(); self.page.set_default_timeout(8000)
        self.errors = []; self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def preview(self, works):
        site = json.loads((ROOT / 'content/site.json').read_text())
        self.context.add_init_script('localStorage.setItem("jm:preview", ' + json.dumps(json.dumps({'works': works, 'site': site})) + ')')

    def wait_body(self):
        self.page.wait_for_function("document.getElementById('rdBody') && document.getElementById('rdBody').innerText.length > 200")

    def test_margin_note_shows_as_a_dot_and_opens_in_its_paragraph(self):
        works = [dict(w) for w in self.works]
        for w in works:
            if w['slug'] == SLUG:
                w['margins'] = [{'at': self.second[:40], 'note': 'Ditulis di *kereta* pulang.'}, {'at': 'kalimat yang tidak ada', 'note': 'tidak tampil'}]
        self.preview(works)
        self.page.goto(self.root + '?preview=1#baca-' + SLUG, wait_until='domcontentloaded')
        self.wait_body()
        dots = self.page.locator('#rdBody .mg-dot')
        self.assertEqual(dots.count(), 1)
        n = self.page.evaluate("[...document.getElementById('rdBody').children].length")
        dots.click()
        note = self.page.locator('#rdBody .mg-note')
        self.assertTrue(note.is_visible())
        self.assertIn('kereta', note.inner_text())
        self.assertEqual(note.locator('em').count(), 1)
        # the note opens inside its paragraph: the paragraph order (voice, search, position) does not shift
        self.assertEqual(self.page.evaluate("[...document.getElementById('rdBody').children].length"), n)
        self.assertEqual(dots.get_attribute('aria-expanded'), 'true')
        dots.click()
        self.assertEqual(self.page.locator('#rdBody .mg-note').count(), 0)

    def test_titipan_round_trip(self):
        self.context.grant_permissions(['clipboard-read', 'clipboard-write'])
        self.context.add_init_script('try { Object.defineProperty(navigator, "share", { value: undefined }); } catch (e) {}')
        self.page.goto(self.root + '#baca-' + SLUG, wait_until='domcontentloaded')
        self.wait_body()
        # select a sentence in the third paragraph
        quote = self.page.evaluate("""() => {
          const p = document.getElementById('rdBody').children[2], node = [...p.childNodes].find(n => n.nodeType === 3 && n.nodeValue.length > 40);
          const r = document.createRange(); r.setStart(node, 0); r.setEnd(node, 36);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          document.getElementById('rdBody').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          return r.toString();
        }""")
        self.page.wait_for_selector('#quotePop:not([hidden])')
        self.page.locator('#qpGift').click()
        self.assertTrue(self.page.locator('#giftModal').is_visible())
        self.assertEqual(self.page.locator('#giftQuote').inner_text().strip(), quote.strip())
        self.page.locator('#giftMsg').fill('Aku teringat kamu waktu membaca ini.')
        self.page.locator('#giftFrom').fill('Rani')
        self.page.locator('#giftSend').click()
        self.page.wait_for_function("document.getElementById('giftModal').hidden")
        link = self.page.evaluate('navigator.clipboard.readText()')
        u = urlparse(link)
        self.assertEqual(u.path, f'/baca/{SLUG}/')
        self.assertTrue(u.fragment.startswith('!'))
        self.assertEqual(self.page.evaluate("localStorage.getItem('jm:titip:from')"), '"Rani"')

        # the receiver: the share page forwards to #baca-<slug>!<payload>
        other = self.browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', service_workers='block')
        other.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page = other.new_page(); page.set_default_timeout(8000)
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(self.root + '#baca-' + SLUG + u.fragment, wait_until='domcontentloaded')
        page.wait_for_selector('#rdBody .gift-m')
        p = page.locator('#rdBody .gift-p')
        self.assertEqual(p.count(), 1)
        self.assertEqual(page.evaluate("[...document.getElementById('rdBody').children].indexOf(document.querySelector('.gift-p'))"), 2)
        self.assertIn('Rani', p.locator('.gift-m').text_content())
        self.assertIn('Aku teringat kamu', p.locator('.gift-m').inner_text())
        self.assertTrue(page.evaluate("!window.Highlight || CSS.highlights.has('titipan')"))
        other.close()
        self.assertEqual(errors, [])

    def test_titipan_for_an_interactive_piece_opens_the_plain_reader(self):
        log = next(w for w in self.works if w['slug'] == 'the-room')
        import base64
        payload = base64.urlsafe_b64encode(json.dumps({'p': 0, 'q': log['body'][0][:30], 'm': 'untukmu'}).encode()).decode().rstrip('=')
        self.page.goto(self.root + '#baca-the-room!' + payload, wait_until='domcontentloaded')
        self.page.wait_for_selector('#rdBody .gift-m')
        self.assertEqual(self.page.evaluate('location.pathname'), '/')
        self.assertIn('untukmu', self.page.locator('.gift-m').inner_text())

    def test_broken_titipan_is_ignored(self):
        self.page.goto(self.root + '#baca-' + SLUG + '!bukan-isi-yang-sah', wait_until='domcontentloaded')
        self.wait_body()
        self.assertEqual(self.page.locator('.gift-m').count(), 0)

    def test_admin_has_a_margin_notes_editor(self):
        html = (ROOT / 'admin/index.html').read_text()
        self.assertIn('id="mgList"', html)
        self.assertIn('id="mgAdd"', html)


if __name__ == '__main__':
    unittest.main(verbosity=2)
