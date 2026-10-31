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
            executable_path=next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None), args=['--no-sandbox'])
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
        self.assertTrue(self.page.locator('#headerTyping').is_visible())
        self.assertEqual(self.page.locator('#headerTyping i').count(), 3)
        self.assertGreaterEqual(self.page.locator('.typing-indicator i').count(), 3)
        self.assertEqual(self.page.locator('.typing-indicator i').first.evaluate('(e) => getComputedStyle(e).animationName'), 'typing-dot')
        height = self.page.evaluate('document.documentElement.scrollHeight')
        self.page.wait_for_function("document.querySelectorAll('.typing').length === 0")
        self.assertTrue(self.page.locator('#headerTyping').is_hidden())
        self.assertEqual(self.page.locator('.typing-indicator').count(), 0)
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
        self.assertTrue(self.page.locator('#headerTyping').is_hidden())
        self.assertEqual(self.page.locator('.typing-indicator').count(), 0)
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

    def test_real_photo_assets_load_and_have_descriptions(self):
        self.open('#p-3-40')
        images = self.page.locator('#story .photo img')
        self.assertEqual(images.count(), 8)
        for image in images.all():
            self.assertTrue(image.get_attribute('alt'))
            response = self.context.request.get(image.evaluate('(e) => e.src'))
            self.assertEqual(response.status, 200)
            self.assertIn('image/webp', response.headers['content-type'])
        images.evaluate_all("images => images.forEach(img => img.loading = 'eager')")
        self.page.wait_for_function("[...document.querySelectorAll('#story .photo img')].every(img => img.complete && img.naturalWidth > 0)")

    def test_photo_viewer_keeps_photos_in_their_message_and_returns_to_archive(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.open('#p-3-40')
        thumbnail = self.page.locator('#p-3-40 [data-photo]')
        thumbnail.click()
        self.page.wait_for_function("document.querySelector('#photoImage').naturalWidth > 0")
        self.assertTrue(self.page.locator('#photoViewer').evaluate('(e) => e.open'))
        self.assertTrue(self.page.locator('#photoNavigation').is_hidden())
        self.page.keyboard.press('ArrowRight')
        self.assertTrue(self.page.locator('#photoImage').get_attribute('src').endswith('receipt.webp'))
        for width in [320, 390, 1440]:
            self.page.set_viewport_size({'width': width, 'height': 844})
            self.assertFalse(self.page.locator('#photoViewer').evaluate('(e) => e.scrollWidth > e.clientWidth'))
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.evaluate('document.activeElement.dataset.photo'), '3,40')
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.page.evaluate("location.hash = 'p-9-15'")
        self.page.locator('#p-9-15 [data-photo-index="0"]').click()
        self.assertEqual(self.page.locator('#photoCounter').inner_text(), '1 / 3')
        self.page.keyboard.press('ArrowRight')
        self.assertTrue(self.page.locator('#photoImage').get_attribute('src').endswith('street.webp'))
        self.page.keyboard.press('ArrowRight')
        self.assertTrue(self.page.locator('#photoImage').get_attribute('src').endswith('market.webp'))
        self.assertTrue(self.page.locator('#nextPhoto').is_disabled())
        self.page.keyboard.press('Escape')
        self.page.locator('#openArchive').click()
        self.page.locator('[data-entry="photo-3-40"] summary').click()
        self.page.locator('[data-entry="photo-3-40"] [data-photo]').click()
        self.assertTrue(self.page.locator('#archiveDialog').evaluate('(e) => e.open'))
        self.page.keyboard.press('Escape')
        self.assertFalse(self.page.locator('#photoViewer').evaluate('(e) => e.open'))
        self.assertTrue(self.page.locator('#archiveDialog').evaluate('(e) => e.open'))

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
                self.page.locator('#openAtmosphere').click()
                self.assertFalse(self.page.locator('#atmosphereDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
                self.page.keyboard.press('Escape')
                self.page.locator('#begin').click()
                self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 1/12'")
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))

    def test_room_tones_require_consent_and_produce_quiet_audio(self):
        self.context.add_init_script("""
          window.testAudioContexts = [];
          const Audio = window.AudioContext;
          window.AudioContext = class extends Audio {
            constructor(...args) { super(...args); window.testAudioContexts.push(this); }
          };
          const connect = AudioNode.prototype.connect;
          AudioNode.prototype.connect = function(target, ...args) {
            const result = connect.call(this, target, ...args);
            if (target instanceof AudioDestinationNode) {
              window.testOutput = target.context.createAnalyser();
              window.testOutput.fftSize = 2048;
              connect.call(this, window.testOutput);
            }
            return result;
          };
          window.testAudioPeak = () => {
            if (!window.testOutput) return 0;
            const samples = new Float32Array(window.testOutput.fftSize);
            window.testOutput.getFloatTimeDomainData(samples);
            return Math.max(...samples.map(Math.abs));
          };
        """)
        self.open('#p-0-0')
        self.assertEqual(self.page.evaluate('testAudioContexts.length'), 0)
        self.page.locator('#openAtmosphere').click()
        self.page.locator('#soundToggle').click()
        self.page.wait_for_function("testAudioContexts[0]?.state === 'running' && testAudioPeak() > .0001")
        self.assertLess(self.page.evaluate('testAudioPeak()'), .5)
        self.page.locator('#soundVolume').focus()
        self.page.keyboard.press('End')
        self.assertEqual(self.page.locator('#soundVolumeValue').inner_text(), '100%')
        self.page.wait_for_function('testAudioPeak() > .001')
        self.assertLess(self.page.evaluate('testAudioPeak()'), .5)
        self.page.keyboard.press('Escape')
        self.page.evaluate("location.hash = 'p-9-0'")
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Bab 10/12'")
        self.page.locator('#openAtmosphere').click()
        self.assertIn('Bandara', self.page.locator('#soundPlace').inner_text())
        self.assertEqual(self.page.evaluate('testAudioContexts.length'), 1)
        self.page.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("testAudioContexts[0].state === 'suspended'")
        self.page.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("testAudioContexts[0].state === 'running'")
        self.page.locator('#soundToggle').click()
        self.page.wait_for_function("testAudioContexts[0].state === 'suspended'")
        self.assertEqual(self.page.locator('#soundToggle').get_attribute('aria-pressed'), 'false')
        self.page.locator('#soundToggle').click()
        self.page.wait_for_function("testAudioContexts[0].state === 'running'")
        self.page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}))")
        self.page.wait_for_function("testAudioContexts[0].state === 'closed'")
        self.open()
        self.assertEqual(self.page.evaluate('testAudioContexts.length'), 0)
        self.page.locator('#openAtmosphere').click()
        self.assertEqual(self.page.locator('#soundVolumeValue').inner_text(), '100%')
        self.assertEqual(self.page.locator('#soundToggle').get_attribute('aria-pressed'), 'false')

    def test_focus_mode_preserves_the_place_and_chapter_end_navigation(self):
        self.open('?lang=en#p-3-20')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:place') || '{}').paragraph === 20")
        y = self.page.evaluate('scrollY')
        self.page.locator('#openAtmosphere').click()
        self.assertEqual(self.page.locator('#atmosphereTitle').inner_text(), 'Reading atmosphere')
        self.page.locator('#focusToggle').click()
        self.page.keyboard.press('Escape')
        self.assertTrue(self.page.locator('#readerTools').is_hidden())
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)
        self.page.locator('#openChapters').click()
        self.page.locator('#chapterList [data-go="0"]').click()
        self.page.locator('#bab-1 .chapter-next').click()
        self.page.wait_for_function("document.querySelector('#chapterToggle').textContent === 'Ch. 2/12'")
        self.open('?lang=en')
        self.assertTrue(self.page.locator('#readerTools').is_hidden())
        self.page.locator('#openAtmosphere').click()
        self.page.locator('#focusToggle').click()
        self.page.keyboard.press('Escape')
        self.assertTrue(self.page.locator('#readerTools').is_visible())

    def test_reading_survives_a_missing_audio_module(self):
        self.context.route('**/ambience.js', lambda route: route.abort())
        self.open('#p-0-0')
        self.assertGreater(len(self.page.locator('#p-0-0').inner_text()), 100)
        self.page.locator('#openAtmosphere').click()
        self.assertTrue(self.page.locator('#soundToggle').is_disabled())
        self.assertIn('belum tersedia', self.page.locator('#soundStatus').inner_text())
        self.page.locator('#focusToggle').click()
        self.assertEqual(self.page.locator('#focusToggle').get_attribute('aria-pressed'), 'true')

    def test_reader_and_audio_module_are_available_offline_after_install(self):
        root = self.url.removesuffix('antologi/interlude/')
        self.page.goto(root, wait_until='domcontentloaded')
        self.page.evaluate('navigator.serviceWorker.ready.then(() => true)')
        self.open('#p-0-0')
        self.context.set_offline(True)
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_selector('.passage')
        self.assertTrue(self.page.evaluate("typeof window.InterludeAmbience === 'function'"))
        self.page.locator('#openAtmosphere').click()
        self.assertFalse(self.page.locator('#soundToggle').is_disabled())

    def test_two_memories_unlock_at_the_ending_and_use_original_passages(self):
        self.open()
        self.assertEqual(self.page.locator('[data-open-memories]:visible').count(), 0)
        self.assertEqual(self.page.locator('#memorySelect option').count(), 0)
        self.page.evaluate("document.querySelector('[data-open-memories]').click()")
        self.assertFalse(self.page.locator('#memoriesDialog').evaluate('(e) => e.open'))
        self.page.evaluate('scrollTo(0, document.documentElement.scrollHeight)')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:stats') || '{}').done?.includes('interlude')")
        self.page.locator('#memoriesInvitation [data-open-memories]').click()
        self.assertTrue(self.page.locator('#memoriesDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.page.locator('#memorySelect option').count(), 4)
        self.page.locator('#memorySelect').select_option('1')
        self.assertEqual(self.page.locator('[data-memory-voice="arka"] .memory-text p').all_text_contents(), self.work['chapters'][6]['body'][55:63])
        self.assertEqual(self.page.locator('[data-memory-voice="nara"] .memory-text p').all_text_contents(), self.work['chapters'][7]['body'][92:98])
        self.page.locator('#memorySelect').select_option('3')
        self.assertTrue(self.page.locator('#nextMemory').is_disabled())
        self.page.locator('[data-memory-voice="arka"] .memory-source').click()
        self.assertFalse(self.page.locator('#memoriesDialog').evaluate('(e) => e.open'))
        self.assertAlmostEqual(self.page.locator('#p-11-24').evaluate('(e) => e.getBoundingClientRect().top'), 94, delta=1)
        self.open('?lang=en')
        self.page.locator('.reading-start [data-open-memories]').click()
        self.assertEqual(self.page.locator('#memoriesTitle').inner_text(), 'Two Memories')
        self.assertEqual(self.page.locator('[data-memory-voice="arka"] .memory-text p').first.inner_text(), self.work['en']['chapters'][6]['body'][26])

    def test_two_memories_keep_the_bookmark_and_fit_mobile_and_desktop(self):
        self.context.add_init_script("localStorage.setItem('jm:stats', JSON.stringify({done: ['interlude']}))")
        self.open('#p-3-20')
        self.page.wait_for_function("JSON.parse(localStorage.getItem('jm:il:place') || '{}').paragraph === 20")
        before = self.place(); y = self.page.evaluate('scrollY')
        self.page.locator('#openArchive').click()
        self.page.locator('#memoriesArchive [data-open-memories]').click()
        self.page.locator('#memorySelect').select_option('2')
        self.assertEqual(self.page.locator('#memoryPosition').inner_text(), 'Ingatan 3 dari 4')
        self.page.keyboard.press('Escape')
        self.assertTrue(self.page.locator('#archiveDialog').evaluate('(e) => e.open'))
        self.assertEqual(self.place(), before)
        self.page.keyboard.press('Escape')
        self.assertAlmostEqual(self.page.evaluate('scrollY'), y, delta=1)
        self.page.locator('#openArchive').click()
        self.page.locator('#memoriesArchive [data-open-memories]').click()
        for width in [320, 390, 1440]:
            self.page.set_viewport_size({'width': width, 'height': 844})
            self.assertFalse(self.page.locator('#memoriesDialog').evaluate('(e) => e.scrollWidth > e.clientWidth'))
            positions = self.page.locator('.memory-voice').evaluate_all('(elements) => elements.map(e => ({left: e.getBoundingClientRect().left, top: e.getBoundingClientRect().top}))')
            if width > 680:
                self.assertGreater(positions[1]['left'], positions[0]['left'])
            else:
                self.assertGreater(positions[1]['top'], positions[0]['top'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
