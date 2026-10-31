"""Browser regression checks: python3 tests/interlude_smoke.py.

Requires Python Playwright and Chromium (both available in the cloud environment).
Uses an isolated local server and browser profiles; never authenticates or publishes.
"""
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class InterludeSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/antologi/interlude/'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.work = next(w for w in json.loads((ROOT / 'content/works.json').read_text())
                        if w['slug'] == 'interlude')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844})
        # Font delivery is independent of the local reading/navigation workflow.
        self.context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        self.page = self.context.new_page()
        self.page.set_default_timeout(6000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self, fragment=''):
        self.page.goto(self.url + fragment, wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')

    def place(self):
        return self.page.evaluate("JSON.parse(localStorage.getItem('jm:il:place'))")

    def test_cover_english_and_complete_story(self):
        self.open('?lang=en')
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')
        self.assertEqual(self.page.locator('#begin').inner_text(), 'Start reading')
        self.assertEqual(self.page.locator('#chapterList [data-go]').count(), 12)
        expected = sum(len(c['body']) for c in self.work['en']['chapters'])
        self.assertEqual(self.page.locator('.passage').count(), expected)
        self.assertIn(self.work['en']['chapters'][0]['body'][0], self.page.locator('#p-0-0').inner_text())
        self.page.locator('#begin').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Ch. 1/12'")

    def test_direct_chapter_links_and_accessible_dialog(self):
        self.open('#bab-7')
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 7/12'")
        self.page.locator('#openChapters').click()
        self.assertTrue(self.page.locator('#chapterDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.page.locator('#chapterList [aria-current]').get_attribute('data-go'), '6')
        self.page.keyboard.press('Escape')
        self.assertFalse(self.page.locator('#chapterDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openChapters')
        self.page.locator('#chapterToggle').click()
        self.page.locator('#chapterList [data-go="8"]').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 9/12'")
        self.assertFalse(self.page.locator('#chapterDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('jm:il:visited'))"), [6, 8])
        self.page.locator('#previousChapter').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 8/12'")

    def test_main_reader_keeps_the_requested_chapter_and_language(self):
        root = self.url.removesuffix('antologi/interlude/')
        self.page.goto(root + '?lang=en#baca-interlude~7', wait_until='domcontentloaded')
        self.page.wait_for_url('**/antologi/interlude/index.html?lang=en#bab-7')
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Ch. 7/12'")
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'en')

    def test_bookmark_survives_cover_and_font_changes(self):
        self.context.add_init_script("""
          if (!localStorage.getItem('seeded')) {
            localStorage.setItem('jm:il:place', JSON.stringify({chapter: 3, paragraph: 20, offset: .35, progress: .25}));
            localStorage.setItem('seeded', 'true');
          }
        """)
        self.open()
        self.assertTrue(self.page.locator('#resume').is_visible())
        self.assertEqual(self.place()['paragraph'], 20)
        self.page.locator('#resume').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:place')).paragraph === 20 && document.querySelector('#chapterToggle').textContent === 'Bab 4/12'")
        self.page.locator('#bigger').click()
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:rd')).size === 18")
        self.page.wait_for_function("Math.abs(JSON.parse(localStorage.getItem('jm:il:place')).offset - .35) < .03")
        self.page.set_viewport_size({'width': 900, 'height': 900})
        self.page.wait_for_function("Math.abs((94 - document.querySelector('#p-3-20').getBoundingClientRect().top) / document.querySelector('#p-3-20').getBoundingClientRect().height - .35) < .03")
        # Return to the cover in a new document: do not overwrite the saved place with 0%.
        self.open()
        self.page.wait_for_timeout(550)
        self.assertEqual(self.place()['paragraph'], 20)
        self.assertAlmostEqual(self.place()['offset'], .35, delta=.03)
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.page.locator('#resume').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 4/12'")
        offset = self.page.locator('#p-3-20').evaluate('(e) => (94 - e.getBoundingClientRect().top) / e.getBoundingClientRect().height')
        self.assertAlmostEqual(offset, .35, delta=.03)

    def test_typing_does_not_reflow_and_stale_effects_are_cancelled(self):
        self.open('#p-0-21')
        self.page.wait_for_selector('.typing')
        height = self.page.evaluate('document.documentElement.scrollHeight')
        self.page.wait_for_function("document.querySelectorAll('.typing').length === 0")
        self.assertEqual(height, self.page.evaluate('document.documentElement.scrollHeight'))
        self.page.evaluate("location.hash = 'p-7-95'")
        self.page.locator('#comp').wait_for(state='visible')
        self.page.locator('#nextChapter').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 9/12'")
        self.page.wait_for_timeout(700)
        self.assertTrue(self.page.locator('#comp').is_hidden())
        self.assertEqual(self.page.locator('.ch:not(#bab-9) .typing').count(), 0)

    def test_quiet_mode_and_system_reduced_motion(self):
        self.open('#bab-4')
        self.page.locator('#calm').click()
        self.assertEqual(self.page.locator('#calm').get_attribute('aria-pressed'), 'true')
        self.page.evaluate("location.hash = 'p-7-95'")
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 8/12'")
        self.page.wait_for_timeout(500)
        self.assertTrue(self.page.locator('#comp').is_hidden())
        self.assertEqual(self.page.locator('.typing').count(), 0)
        self.open()
        self.assertEqual(self.page.locator('#calm').get_attribute('aria-pressed'), 'true')
        self.page.locator('#calm').click()
        self.page.emulate_media(reduced_motion='reduce')
        self.page.wait_for_function("document.querySelector('#calm').disabled")
        self.assertEqual(self.page.locator('#calm').get_attribute('aria-pressed'), 'true')

    def test_archive_hides_future_fragments_and_does_not_unlock_skipped_scenes(self):
        self.open()
        self.page.locator('#openArchive').click()
        self.assertTrue(self.page.locator('#archiveDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.page.locator('.archive-entry').count(), 0)
        self.assertNotIn('Nara', self.page.locator('#archiveList').inner_text())
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'openArchive')
        self.page.evaluate("location.hash = 'bab-12'")
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 12/12'")
        self.assertEqual(self.page.locator('.archive-entry').count(), 0)
        self.page.evaluate("location.hash = 'p-7-95'")
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:archive') || '[]').includes('unsent-7-95')")
        self.assertEqual(self.page.locator('.archive-entry').count(), 1)
        self.page.locator('#openArchive').click()
        self.assertNotIn('Percakapan yang ditutup', self.page.locator('#archiveList').inner_text())
        self.assertEqual(self.page.locator('.archive-entry').get_attribute('data-entry'), 'unsent-7-95')

    def test_archive_persists_and_return_link_finds_the_scene(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.open('#p-7-95')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:archive') || '[]').includes('unsent-7-95')")
        self.page.evaluate("location.hash = 'p-10-20'")
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 11/12'")
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:place') || '{}').chapter === 10")
        before = self.place()
        y = self.page.evaluate('scrollY')
        self.page.locator('#openArchive').click()
        self.page.locator('[data-entry="unsent-7-95"] summary').click()
        self.assertEqual(self.page.locator('.archive-excerpt').inner_text(), self.work['chapters'][7]['body'][95])
        self.page.keyboard.press('Escape')
        self.assertAlmostEqual(y, self.page.evaluate('scrollY'), delta=1)
        self.assertEqual(self.place(), before)
        self.open('?lang=en')
        self.page.locator('#openArchive').click()
        self.page.locator('[data-entry="unsent-7-95"] summary').click()
        self.assertIn('never mind', self.page.locator('.archive-entry blockquote').inner_text())
        self.assertEqual(self.page.locator('.archive-excerpt').inner_text(), self.work['en']['chapters'][7]['body'][95])
        self.page.locator('.archive-return').click()
        self.assertFalse(self.page.locator('#archiveDialog').evaluate('(e) => e.open'))
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Ch. 8/12'")
        self.assertAlmostEqual(self.page.locator('#p-7-95').evaluate('(e) => e.getBoundingClientRect().top'), 94, delta=1)

    def test_archive_photos_and_notebooks_are_encountered_individually(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.open('#p-3-40')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:archive') || '[]').includes('photo-3-40')")
        self.assertEqual(self.page.locator('.archive-entry').count(), 1)
        self.page.locator('#openArchive').click()
        self.page.locator('[data-entry="photo-3-40"] summary').click()
        self.assertTrue(self.page.locator('.archive-body .ph').is_visible())
        self.page.keyboard.press('Escape')
        for chapter, entry in [(6, 'notebook-6-0'), (2, 'note-2-0')]:
            self.page.evaluate(f"location.hash = 'p-{chapter}-0'")
            self.page.locator(f'[data-archive="{entry}"]').scroll_into_view_if_needed()
            self.page.wait_for_function('(id) => JSON.parse(localStorage.getItem("jm:il:archive") || "[]").includes(id)', arg=entry)
        self.assertEqual(self.page.locator('.archive-entry').count(), 3)
        self.page.locator('#openArchive').click()
        self.page.locator('[data-entry="notebook-6-0"] summary').click()
        self.assertEqual(self.page.locator('[data-entry="notebook-6-0"] .archive-excerpt').inner_text(), self.work['chapters'][6]['body'][0])

    def test_mobile_and_desktop_have_no_horizontal_overflow(self):
        for width in [320, 390, 1440]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width': width, 'height': 844})
                self.open()
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.page.locator('#openChapters').click()
                self.assertFalse(self.page.locator('#chapterDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                self.page.keyboard.press('Escape')
                self.page.locator('#openArchive').click()
                self.assertFalse(self.page.locator('#archiveDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                self.page.keyboard.press('Escape')
                self.page.locator('#begin').click()
                self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 1/12'")
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
