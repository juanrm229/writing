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
   _dunia.json juga boleh memuat "spine" (rantai yang disarankan) dan "memory" (ingatan bawaan untuk catatan tanpa memory).
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
  const world = { title: config.title || 'Salasimpul', start: config.start || entries[0].id, people, entries, props, keys: config.keys || {}, spine: config.spine || [], memory: config.memory || { stability0: 5000, retrievalBonus: 0.25, retrievals: 0 } };
  const meta = {
    title: world.title, people: people.length, entries: entries.length, words: entries.reduce((n, e) => n + e.words, 0), from: Math.min(...years), to: Math.max(...years),
    // satu baris per penulis: tahun-tahun catatannya, untuk garis-garis kecil di banner
    lanes: people.map(p => entries.filter(e => e.owner === p.id).map(e => +(e.at.y + e.at.d / 366).toFixed(2))),
    knots: entries.flatMap(e => e.p.flatMap(p => (p.l || []).map(l => { const to = byId.get(l.id); return [owners.indexOf(e.owner), +(e.at.y + e.at.d / 366).toFixed(2), owners.indexOf(to.owner), +(to.at.y + to.at.d / 366).toFixed(2)]; })))
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
