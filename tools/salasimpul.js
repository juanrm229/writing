#!/usr/bin/env node
/* Salasimpul: menyusun catatan-catatan dunia ini menjadi satu berkas data untuk halaman dunia/salasimpul/.

   Sumber: content/salasimpul/<penulis>/<tahun>-<hari>.md, satu catatan per berkas:

     ---
     id: k2026
     owner: karman
     at: { y: 2026, d: 18, h: 23 }        tahun, hari ke- dalam tahun itu, jam
     title: dua cangkir, dan besok pagi
     memory: { ... }                       opsional, disimpan apa adanya
     ---
     Paragraf demi paragraf. Tanda di ujung kalimat:
       @claims(p_x)          kalimat ini memberi tahu pembaca fakta p_x
       @irony(p_a, p_b)      kalimat ini berubah makna kalau pembaca sudah tahu p_a dan p_b
       @protected            kalimat yang tidak ikut terlupa
       @node(penulis:id)     simpul ke catatan lain
       @echo(penulis:id)     gema dari catatan lain

   Tanda-tanda itu dibuang dari teks yang tampil dan disimpan sebagai data. Teks catatan tidak diubah.
   Menambah catatan di masa depan, masa lalu, atau titik mana pun: taruh berkasnya di folder penulisnya
   (folder baru = penulis baru), lalu jalankan:  node tools/salasimpul.js
   Skrip berhenti dengan pesan bila ada id ganda atau rujukan yang menggantung.
   _dunia.json juga boleh memuat "spine" (rantai yang disarankan), "memory" (ingatan bawaan untuk catatan tanpa memory),
   dan "persona": ciri tiap penulis untuk antarmuka (lede, born, since: { y, d, label }, room).
   Hasil: content/salasimpul.json (seluruh dunia) dan content/salasimpul.meta.json (ringkas, untuk banner). */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'salasimpul');
const OUT = path.join(ROOT, 'content', 'salasimpul.json');
const META = path.join(ROOT, 'content', 'salasimpul.meta.json');
const CONFIG = path.join(SRC, '_dunia.json');

// nilai frontmatter: angka, teks, atau peta bersarang { a: 1, b: { c: 2 } }
function value(s) {
  s = s.trim();
  if (s.startsWith('{')) {
    const json = s.replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":');
    return JSON.parse(json);
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
  return s.replace(/^["']|["']$/g, '');
}
function frontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: frontmatter tidak ditemukan`);
  const fm = {};
  m[1].split('\n').forEach(line => { const k = line.match(/^(\w+):\s*(.*)$/); if (k) fm[k[1]] = value(k[2]); });
  return { fm, body: m[2] };
}

const TAG = /@(claims|irony|protected|node|echo)(?:\(([^)]*)\))?/g;
const SENT = /[^.!?…]+(?:[.!?…]+["”’)]*)?/g;

// satu paragraf: teks tanpa tanda (Markdown miring tetap), plus anotasi per kalimat dengan posisi di teks polosnya
function paragraph(raw) {
  // tanda diganti penanda sementara, teks dirapikan, lalu posisi penanda dibaca dan penandanya dibuang
  const tags = [];
  let text = raw.replace(TAG, (all, kind, args) => { tags.push({ kind, args: (args || '').split(',').map(x => x.trim().split(/\s/)[0]).filter(Boolean) }); return `\u0001${tags.length - 1}\u0002`; });
  text = text.replace(/[ \t]+(?=\u0001)/g, '').replace(/[ \t]+$/gm, '').replace(/[ \t]{2,}/g, ' ').trim();
  let plain = '';
  const pos = [];
  const clean = text.replace(/\u0001(\d+)\u0002/g, '');
  // posisi tiap penanda di teks polos (tanpa bintang Markdown dan tanpa penanda)
  let plainLen = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\u0001') { const j = text.indexOf('\u0002', i); pos[+text.slice(i + 1, j)] = plainLen; i = j; continue; }
    if (text[i] !== '*') { plain += text[i]; plainLen++; }
  }
  const sents = [];
  let m; SENT.lastIndex = 0;
  while ((m = SENT.exec(plain))) { const a = m.index + (m[0].length - m[0].trimStart().length), b = m.index + m[0].trimEnd().length; if (b > a) sents.push([a, b]); if (!m[0].length) SENT.lastIndex++; }
  const ann = new Map();
  const links = [];
  tags.forEach((tg, ti) => {
    const p = pos[ti];
    let si = sents.findIndex(([a, b]) => p > a && p <= b);
    if (si < 0) si = sents.reduce((best, [a], i) => (a < p ? i : best), sents.length ? 0 : -1);
    if (tg.kind === 'node' || tg.kind === 'echo') { tg.args.forEach(r => { const [owner, id] = r.split(':'); links.push({ kind: tg.kind, owner, id, s: si }); }); return; }
    if (si < 0) return;
    const a = ann.get(si) || { from: sents[si][0], to: sents[si][1] };
    if (tg.kind === 'claims') (a.claims = a.claims || []).push(...tg.args);
    if (tg.kind === 'irony') (a.irony = a.irony || []).push(tg.args);
    if (tg.kind === 'protected') a.prot = 1;
    ann.set(si, a);
  });
  return { t: clean, a: [...ann.values()].sort((x, y) => x.from - y.from), ...(links.length ? { l: links } : {}) };
}

const INKS = ['#1F4E8C', '#9A3B2E', '#2F6B4F', '#6A3DFF', '#8A6A1F', '#0E7490', '#B4235A', '#4D5B2A', '#7C3A9E', '#A2541A', '#2B6CB0', '#5B5F66', '#8B2F2F', '#2E7D6B', '#6B4E9B', '#9C6B00', '#3B5BA9', '#7A4A3A'];
function build() {
  const config = fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, 'utf8')) : {};
  const owners = fs.readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.')).map(d => d.name).sort();
  const entries = [];
  owners.forEach(owner => {
    fs.readdirSync(path.join(SRC, owner)).filter(f => f.endsWith('.md')).sort().forEach(f => {
      const file = `${owner}/${f}`;
      const { fm, body } = frontmatter(fs.readFileSync(path.join(SRC, owner, f), 'utf8').replace(/\r\n/g, '\n'), file);
      for (const k of ['id', 'owner', 'at', 'title']) if (fm[k] == null) throw new Error(`${file}: frontmatter "${k}" belum diisi`);
      if (fm.owner !== owner) throw new Error(`${file}: owner "${fm.owner}" tidak sama dengan foldernya "${owner}"`);
      const paras = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(paragraph);
      const words = paras.reduce((n, p) => n + (p.t.replace(/\*/g, '').match(/\S+/g) || []).length, 0);
      entries.push({ id: String(fm.id), owner, file, at: { y: fm.at.y, d: fm.at.d, h: fm.at.h ?? null }, title: String(fm.title), ...(fm.memory ? { memory: fm.memory } : {}), words, p: paras });
    });
  });
  // id unik dan tidak ada rujukan yang menggantung
  const byId = new Map();
  entries.forEach(e => { if (byId.has(e.id)) throw new Error(`id ganda "${e.id}": ${byId.get(e.id).file} dan ${e.file}`); byId.set(e.id, e); });
  const problems = [];
  entries.forEach(e => e.p.forEach(p => (p.l || []).forEach(l => {
    const to = byId.get(l.id);
    if (!to) problems.push(`${e.file}: @${l.kind}(${l.owner}:${l.id}) menunjuk catatan yang tidak ada`);
    else if (to.owner !== l.owner) problems.push(`${e.file}: @${l.kind}(${l.owner}:${l.id}) milik ${to.owner}, bukan ${l.owner}`);
  })));
  if (problems.length) throw new Error('Rujukan menggantung:\n  ' + problems.join('\n  '));
  // urutan waktu dunia
  const key = e => e.at.y * 1e5 + e.at.d * 100 + (e.at.h ?? 12);
  entries.sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id));
  // fakta: di catatan mana saja ia dinyatakan
  const props = {};
  entries.forEach(e => e.p.forEach(p => p.a.forEach(a => (a.claims || []).forEach(c => { (props[c] = props[c] || []).includes(e.id) || props[c].push(e.id); }))));
  const people = owners.map(o => ({ id: o, name: (config.names || {})[o] || o[0].toUpperCase() + o.slice(1), aliases: (config.aliases || {})[o] || [] }));
  const years = entries.map(e => e.at.y);
  // catatan kunci menunggu fakta tertentu; pastikan catatan dan faktanya ada
  Object.entries(config.keys || {}).forEach(([id, need]) => { if (!byId.has(id)) throw new Error(`_dunia.json: kunci "${id}" bukan id catatan`); need.forEach(p => { if (!props[p]) throw new Error(`_dunia.json: fakta "${p}" untuk "${id}" tidak pernah dinyatakan`); }); });
  if (config.start && !byId.has(config.start)) throw new Error(`_dunia.json: start "${config.start}" bukan id catatan`);
  (config.spine || []).forEach(id => { if (!byId.has(id)) throw new Error(`_dunia.json: spine "${id}" bukan id catatan`); });
  const ROOMS = ['malam', 'radio', 'jam', 'ruang', 'angin', 'jalan', 'hujan'];
  Object.entries(config.persona || {}).forEach(([o, v]) => {
    if (!owners.includes(o)) throw new Error(`_dunia.json: persona "${o}" bukan penulis (folder)`);
    if (v.room && !ROOMS.includes(v.room)) throw new Error(`_dunia.json: persona "${o}": room harus salah satu dari ${ROOMS.join(', ')}`);
    if (v.since && !(Number.isInteger(v.since.y) && Number.isInteger(v.since.d))) throw new Error(`_dunia.json: persona "${o}": since butuh { y, d }`);
  });
  // kata kunci (tempat di peta, benda yang berpindah tangan) dicari di teks catatan, bukan di tandanya
  const wordRe = m => new RegExp(`(^|[^\\p{L}])(${m})(?![\\p{L}])`, 'iu');
  const plainOf = e => e.p.map(p => p.t.replace(/\*/g, '')).join('\n');
  function hits(item, where) {
    const res = (item.match || []).map(m => { try { return wordRe(m); } catch (err) { throw new Error(`${where} "${item.id}": pola "${m}" tidak sah`); } });
    if (!res.length) throw new Error(`${where} "${item.id}": butuh match`);
    const ids = entries.filter(e => (!item.by || item.by.includes(e.owner)) && (!item.from || e.at.y >= item.from) && res.some(r => r.test(plainOf(e)))).map(e => e.id);
    if (!ids.length) throw new Error(`${where} "${item.id}": tidak disebut di catatan mana pun`);
    return ids;
  }
  const seen = new Set();
  const benda = (config.benda || []).map(b => { if (seen.has('b:' + b.id)) throw new Error(`benda "${b.id}" ganda`); seen.add('b:' + b.id); return { ...b, notes: hits(b, 'benda') }; });
  let peta = null;
  const petaFile = path.join(SRC, '_peta.json');
  if (fs.existsSync(petaFile)) {
    const pc = JSON.parse(fs.readFileSync(petaFile, 'utf8'));
    const places = (pc.places || []).map(pl => {
      if (seen.has('p:' + pl.id)) throw new Error(`_peta.json: tempat "${pl.id}" ganda`); seen.add('p:' + pl.id);
      if (!pc.maps[pl.map]) throw new Error(`_peta.json: tempat "${pl.id}": peta "${pl.map}" tidak ada`);
      if (!pc.kinds[pl.kind]) throw new Error(`_peta.json: tempat "${pl.id}": jenis "${pl.kind}" tidak ada`);
      (pl.by || []).forEach(o => { if (!owners.includes(o)) throw new Error(`_peta.json: tempat "${pl.id}": penulis "${o}" tidak ada`); });
      return { ...pl, notes: hits(pl, '_peta.json: tempat') };
    });
    peta = { maps: pc.maps, kinds: pc.kinds, places };
  }
  const world = { title: config.title || 'Salasimpul', start: config.start || entries[0].id, people, entries, props, keys: config.keys || {}, spine: config.spine || [], persona: config.persona || {}, benda, peta, memory: config.memory || { stability0: 5000, retrievalBonus: 0.25, retrievals: 0 } };
  const meta = {
    title: world.title, people: people.length, entries: entries.length, words: entries.reduce((n, e) => n + e.words, 0), from: Math.min(...years), to: Math.max(...years),
    // satu baris per penulis: tahun-tahun catatannya, untuk garis-garis kecil di banner
    lanes: people.map(p => entries.filter(e => e.owner === p.id).map(e => +(e.at.y + e.at.d / 366).toFixed(2))),
    knots: entries.flatMap(e => e.p.flatMap(p => (p.l || []).map(l => { const to = byId.get(l.id); return [owners.indexOf(e.owner), +(e.at.y + e.at.d / 366).toFixed(2), owners.indexOf(to.owner), +(to.at.y + to.at.d / 366).toFixed(2)]; }))),
    // untuk banner: id dan urutan waktu tiap catatan (sejajar dengan lanes), simpul sebagai pasangan urutan,
    // tinta tiap penulis (sama dengan INKS di dunia/salasimpul/simpul.js), dan kalimat pertama tiap orang tanpa nama
    ids: people.map(p => entries.filter(e => e.owner === p.id).map(e => e.id)),
    at: people.map(p => entries.filter(e => e.owner === p.id).map(e => entries.indexOf(e))),
    links: entries.flatMap((e, i) => e.p.flatMap(p => (p.l || []).map(l => [i, entries.indexOf(byId.get(l.id))]))),
    inks: people.map((p, i) => INKS[i % INKS.length]),
    voices: people.map(p => { const e = entries.find(x => x.owner === p.id), txt = (e.p[0] ? e.p[0].t : '').replace(/\*/g, ''), m = txt.match(/^.+?[.!?…](?=\s|$)/); return { y: e.at.y, q: (m ? m[0] : txt).slice(0, 140) }; })
  };
  return { world, meta };
}

if (require.main === module) {
  try {
    const { world, meta } = build();
    fs.writeFileSync(OUT, JSON.stringify(world));
    fs.writeFileSync(META, JSON.stringify(meta));
    const links = world.entries.reduce((n, e) => n + e.p.reduce((m, p) => m + (p.l || []).length, 0), 0);
    console.log(`Salasimpul: ${world.entries.length} catatan, ${world.people.length} penulis, ${meta.words.toLocaleString('id-ID')} kata, ${links} simpul, ${Object.keys(world.props).length} fakta, ${meta.from}–${meta.to}.`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { build, paragraph };
