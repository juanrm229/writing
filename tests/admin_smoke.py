"""Browser checks for signing in to the admin panel: python3 tests/admin_smoke.py.

GitHub is mocked: api.github.com is routed to local files. Like the real Contents API, a file larger
than 1 MB comes back with an empty "content" and encoding "none"; the admin must then fetch it raw
instead of failing with "Unexpected end of JSON input".

Uses the cloud environment's Python Playwright and system Chromium.
No authentication, remote writes, or external assets are needed.
"""
import base64
import functools
import hashlib
import http.server
import json
from pathlib import Path
import re
import threading
import unittest
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
LIMIT = 1024 * 1024


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class AdminSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()
        cls.root = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        chromium = next((p for p in ['/usr/bin/chromium', '/opt/pw-browsers/chromium'] if Path(p).exists()), None)
        cls.browser = cls.playwright.chromium.launch(executable_path=chromium, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
        self.context.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda route: route.abort())
        self.raw = []
        self.context.route('https://api.github.com/**', self.github)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def github(self, route):
        req = route.request
        path = urlparse(req.url).path
        ok = lambda body: route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
        if req.method != 'GET':
            return route.fulfill(status=403, content_type='application/json', body='{"message":"read-only mock"}')
        if path == '/user':
            return ok({'login': 'tester'})
        if path == '/repos/tester/writing':
            return ok({'default_branch': 'main', 'permissions': {'push': True}, 'full_name': 'tester/writing'})
        m = re.match(r'^/repos/tester/writing/contents/(.+)$', path)
        if m:
            f = ROOT / m.group(1)
            if not f.is_file():
                return route.fulfill(status=404, content_type='application/json', body='{"message":"Not Found"}')
            data = f.read_bytes()
            if 'raw' in (req.headers.get('accept') or ''):
                self.raw.append(m.group(1))
                return route.fulfill(status=200, content_type='application/vnd.github.raw', body=data)
            big = len(data) > LIMIT
            return ok({'path': m.group(1), 'sha': hashlib.sha1(data).hexdigest(), 'size': len(data), 'type': 'file',
                       'encoding': 'none' if big else 'base64', 'content': '' if big else base64.b64encode(data).decode()})
        if '/commits' in path:
            return ok([])
        return route.fulfill(status=404, content_type='application/json', body='{"message":"Not Found"}')

    def test_sign_in_loads_works_larger_than_one_megabyte(self):
        self.assertGreater((ROOT / 'content/works.json').stat().st_size, LIMIT, 'uji ini meniru berkas di atas 1 MB')
        page = self.page
        page.goto(self.root + 'admin/')
        page.wait_for_selector('#loginForm')
        page.fill('#lgOwner', 'tester')
        page.fill('#lgRepo', 'writing')
        page.fill('#lgToken', 'github_pat_dummy')
        page.click('#lgSubmit')
        # panel admin terisi penuh (loadAll selesai), atau layar masuk kembali dengan pesan galat
        page.wait_for_function("document.querySelector('#meRepo')?.textContent.includes('tester/writing') || !document.querySelector('#lgErr').hidden", timeout=10000)
        self.assertTrue(page.locator('#lgErr').is_hidden(), page.locator('#lgErr').text_content())
        self.assertTrue(page.locator('#login').is_hidden())
        self.assertIn('content/works.json', self.raw)
        # berkas kecil tetap lewat jawaban JSON biasa
        self.assertNotIn('content/site.json', self.raw)
        works = json.loads((ROOT / 'content/works.json').read_text())
        title = next(w['title'] for w in works if not w.get('draft'))
        page.wait_for_function('t => document.body.innerText.includes(t)', arg=title, timeout=5000)


if __name__ == '__main__':
    unittest.main(verbosity=2)
