/*
 * Klien kecil GitHub Contents API untuk panel admin.
 * Token disimpan di perangkat ini saja (localStorage, atau sessionStorage kalau
 * "ingat di perangkat ini" tidak dicentang) dan hanya dikirim ke api.github.com.
 */
(function () {
  'use strict';
  const KEY = 'jm-admin';
  const API = 'https://api.github.com';

  const read = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  };

  const enc = str => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const dec = b64 => {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };

  class GHError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  async function req(path, opts = {}) {
    const cfg = GH.cfg();
    if (!cfg) throw new GHError(401, 'Belum masuk.');
    const res = await fetch(API + path, {
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + cfg.token,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers || {})
      },
      cache: 'no-store'
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new GHError(res.status, explain(res.status, data.message));
    return data;
  }

  function explain(status, msg) {
    if (status === 401) return 'Token ditolak GitHub. Periksa lagi tokennya atau buat yang baru.';
    if (status === 403) return 'Token tidak punya izin menulis. Beri izin "Contents: Read and write" untuk repo ini.';
    if (status === 404) return 'Repo, branch, atau berkas tidak ditemukan. Periksa nama pemilik, repo, dan branch.';
    if (status === 409) return 'Berkas berubah di GitHub sejak terakhir dimuat. Muat ulang lalu simpan lagi.';
    if (status === 422) return 'GitHub menolak perubahan: ' + (msg || 'data tidak valid') + '.';
    return msg || ('Kesalahan GitHub ' + status + '.');
  }

  const repoPath = () => { const c = GH.cfg(); return `/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}`; };
  const shas = {};

  const GH = {
    Error: GHError,
    cfg: read,
    save(cfg, remember) {
      const s = JSON.stringify(cfg);
      try {
        sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
        (remember ? localStorage : sessionStorage).setItem(KEY, s);
      } catch (e) { /* penyimpanan tidak tersedia */ }
    },
    logout() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* */ } },
    guess() {
      const h = location.hostname;
      if (!h.endsWith('.github.io')) return {};
      const owner = h.split('.')[0];
      const seg = location.pathname.split('/').filter(Boolean)[0];
      return { owner, repo: seg && seg !== 'admin' ? seg : h };
    },
    async repo() { return req(repoPath()); },
    async user() { return req('/user'); },

    async get(path) {
      const c = GH.cfg();
      try {
        const d = await req(`${repoPath()}/contents/${path}?ref=${encodeURIComponent(c.branch)}`);
        shas[path] = d.sha;
        return { text: d.encoding === 'base64' ? dec(d.content) : d.content, sha: d.sha };
      } catch (e) {
        if (e.status === 404) { delete shas[path]; return null; }
        throw e;
      }
    },
    async getJSON(path) {
      const r = await GH.get(path);
      return r ? JSON.parse(r.text) : null;
    },

    async putRaw(path, b64, message) {
      const c = GH.cfg();
      const body = sha => JSON.stringify({ message, content: b64, branch: c.branch, ...(sha ? { sha } : {}) });
      try {
        const d = await req(`${repoPath()}/contents/${path}`, { method: 'PUT', body: body(shas[path]) });
        shas[path] = d.content.sha;
        return d;
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        // sha usang: ambil yang terbaru lalu coba sekali lagi
        await GH.get(path);
        const d = await req(`${repoPath()}/contents/${path}`, { method: 'PUT', body: body(shas[path]) });
        shas[path] = d.content.sha;
        return d;
      }
    },
    put(path, text, message) { return GH.putRaw(path, enc(text), message); },
    putJSON(path, obj, message) { return GH.put(path, JSON.stringify(obj, null, 2) + '\n', message); },

    async commits(path, n = 20) {
      const c = GH.cfg();
      return req(`${repoPath()}/commits?sha=${encodeURIComponent(c.branch)}&path=${encodeURIComponent(path)}&per_page=${n}`);
    }
  };

  window.GH = GH;
})();
