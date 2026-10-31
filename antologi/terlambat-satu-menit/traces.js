/* Petikan hanya terbuka jika ujung paragrafnya terlihat. Tidak ada teks cerita baru. */
(() => {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  class MinuteTraces {
    constructor({ docs, t, inline, read, write, onOpen, onJump }) {
      this.docs = docs; this.t = t; this.inline = inline; this.write = write; this.onOpen = onOpen; this.onJump = onJump;
      this.seen = new Set(read()); this.dialog = document.querySelector('#tracesDialog'); this.current = null; this.step = null; this.mode = 'inside';
      const a = docs[0].translated ? 2 : 0, b = docs[1].translated ? 1 : 0, c = docs[2].translated ? -1 : 0;
      const step = (id, side, required, excerpt, anchor, label, status) => ({ id, side, required, excerpt, anchor, label, status });
      this.items = [
        { id: 'saman-silence', kind: 'silence', title: t('Saat Banyu pergi', 'When Banyu left'), person: 'Saman', side: 0, at: 14, required: [12, 13, 14], inside: [13], outside: [14], quoted: true },
        { id: 'banyu-silence', kind: 'silence', title: t('Saat Sari pergi', 'When Sari left'), person: 'Banyu', side: 1, at: 31, required: [28, 30, 31], inside: [31], outside: [30], quoted: true },
        { id: 'maryam-silence', kind: 'silence', title: t('Di kamar Banyu', 'In Banyu’s room'), person: 'Maryam', side: 2, at: 34 + c, required: [30 + c, 31 + c, 32 + c, 34 + c], inside: [31 + c], outside: [34 + c], quoted: false },
        { id: 'father-letter', kind: 'letter', title: t('Surat Saman', 'Saman’s letter'), person: t('Saman → Banyu', 'Saman → Banyu'), steps: [
          step('drawer', 0, [2], [2], 2, t('Di laci Saman', 'In Saman’s drawer'), t('Belum dikirim', 'Not sent')),
          step('sent', 0, [2, 56 + a, 58 + a], [2, 56 + a], 58 + a, t('Dari Saman', 'From Saman'), t('Dikirim', 'Sent')),
          step('opened', 1, [35], [35], 35, t('Di tangan Banyu', 'In Banyu’s hands'), t('Dibuka', 'Opened')),
          step('read', 1, [35, 37], [35, 37], 37, t('Tambahan di bawah surat', 'The words at the bottom'), t('Dibaca Banyu', 'Read by Banyu'))
        ] },
        { id: 'reply-letter', kind: 'letter', title: t('Balasan Banyu', 'Banyu’s reply'), person: 'Banyu → Saman', steps: [
          step('written', 1, [40, 41, 42], [40, 41, 42], 42, t('Di meja Banyu', 'At Banyu’s table'), t('Ditulis', 'Written')),
          step('sent', 1, [40, 41, 42, 43], [40, 41, 42], 43, t('Dari Banyu', 'From Banyu'), t('Dikirim · penerimaan tidak diceritakan', 'Sent · receipt is not described'))
        ] },
        { id: 'mother-letter', kind: 'letter', title: t('Surat Maryam', 'Maryam’s letter'), person: 'Maryam → Banyu', steps: [
          step('written', 2, [70 + c, 73 + c], [70 + c, 73 + c], 73 + c, t('Di meja Maryam', 'At Maryam’s table'), t('Ditulis', 'Written')),
          step('sent', 2, [70 + c, 73 + c, 74 + c], [70 + c, 73 + c], 74 + c, t('Dari Maryam', 'From Maryam'), t('Dikirim · penerimaan tidak diketahui', 'Sent · receipt is unknown'))
        ] },
        { id: 'presence', kind: 'presence', title: t('Satu sore lagi', 'One more afternoon'), person: t('Saman · Mas', 'Saman · Sir'), side: 1, at: 75 + b, required: [55 + b, 66 + b, 73 + b, 75 + b], greeting: 73 + b, answer: 75 + b }
      ];
      this.groups = [['silence', t('Di balik diam', 'Behind the silence')], ['letter', t('Surat', 'Letters')], ['presence', t('Kehadiran', 'Presence')]];
      document.querySelector('#openTraces').textContent = t('Jejak', 'Traces');
      document.querySelector('#openTraces').setAttribute('aria-label', t('Buka jejak cerita', 'Open story traces'));
      document.querySelector('#openTraces').disabled = false;
      document.querySelector('#openTraces').onclick = () => this.open();
      document.querySelector('#returnVisit').textContent = t('Satu sore lagi', 'One more afternoon');
      document.querySelector('#returnVisit').onclick = () => this.open('presence');
      document.querySelector('#traceBack').textContent = t('← Semua jejak', '← All traces');
      document.querySelector('#traceBack').onclick = () => this.showIndex();
      document.querySelector('#tracesKicker').textContent = t('Terakhir dikenali', 'Last recognized');
      document.querySelector('#story').addEventListener('click', e => {
        const button = e.target.closest('[data-trace]'); if (button && !button.disabled) this.open(button.dataset.trace);
      });
      this.refresh(false);
    }
    stepsFor(item) { return item.steps || [{ id: 'scene', side: item.side, required: item.required }]; }
    ready(item, step) { return step.required.every((_, i) => this.seen.has(`${item.id}:${step.id}:${i}`)); }
    available(item) { return this.stepsFor(item).some(step => this.ready(item, step)); }
    witness(side, line, readonly) {
      if (readonly) return;
      let changed = false;
      this.items.forEach(item => this.stepsFor(item).filter(step => step.side === side).forEach(step => {
        step.required.forEach((p, i) => {
          const key = `${item.id}:${step.id}:${i}`; if (this.seen.has(key)) return;
          const rect = document.querySelector('#p-' + p)?.getBoundingClientRect();
          if (rect && rect.bottom >= line && rect.bottom <= innerHeight - 28) { this.seen.add(key); changed = true; }
        });
      }));
      if (changed) this.write([...this.seen]);
    }
    hint(side, paragraph) {
      const a = this.docs[0].translated ? 2 : 0, c = this.docs[2].translated ? -1 : 0;
      const slots = [
        [0, 2, 'father-letter'], [0, 58 + a, 'father-letter'], [1, 37, 'father-letter'], [1, 43, 'reply-letter'], [2, 74 + c, 'mother-letter'],
        ...this.items.filter(item => item.kind !== 'letter').map(item => [item.side, item.at, item.id])
      ];
      const match = slots.find(([s, p]) => s === side && p === paragraph); if (!match) return '';
      const item = this.items.find(item => item.id === match[2]);
      const label = item.kind === 'letter' ? this.t('Buka surat', 'Open the letter') : item.kind === 'silence' ? this.t('Di balik diam', 'Behind the silence') : item.title;
      return `<div class="trace-slot"><button class="trace-hint" type="button" data-trace="${item.id}" aria-haspopup="dialog" aria-controls="tracesDialog" disabled>${label}<span aria-hidden="true">→</span></button></div>`;
    }
    refresh(readonly) {
      this.readonly = readonly;
      document.querySelectorAll('#story [data-trace]').forEach(button => {
        const item = this.items.find(item => item.id === button.dataset.trace);
        button.disabled = !!readonly || !this.available(item);
      });
      document.querySelector('#returnVisit').hidden = !this.available(this.items.find(item => item.id === 'presence'));
      const unread = this.items.some(item => this.stepsFor(item).some(step => this.ready(item, step) && !this.seen.has(`viewed:${item.id}:${step.id}`)));
      document.querySelector('#openTraces').toggleAttribute('data-new', unread);
      document.querySelector('#openTraces').setAttribute('aria-label', unread ? this.t('Buka jejak cerita · ada fragmen baru', 'Open story traces · new passages available') : this.t('Buka jejak cerita', 'Open story traces'));
    }
    open(id) {
      const item = this.items.find(item => item.id === id);
      if (id && (!item || !this.available(item))) return;
      if (!this.dialog.open) this.onOpen();
      if (item) this.showItem(item); else this.showIndex();
      if (!this.dialog.open) this.dialog.showModal();
    }
    showIndex() {
      this.current = null; document.querySelector('#tracesTitle').textContent = this.t('Jejak', 'Traces');
      document.querySelector('#traceBack').hidden = true; document.querySelector('#traceDetail').hidden = true;
      const index = document.querySelector('#tracesIndex'); index.hidden = false;
      let content = `<p class="trace-note">${this.t('Yang tertahan, yang dikirim, dan yang memilih tinggal. Petikan muncul setelah adegannya terbaca.', 'What was held back, what was sent, and who chose to stay. Passages appear after their scenes have been read.')}</p>`;
      this.groups.forEach(([kind, title]) => {
        const items = this.items.filter(item => item.kind === kind && this.available(item));
        if (!items.length) return;
        content += `<section class="trace-group"><h3>${title}</h3>${items.map(item => `<button class="trace-row" type="button" data-open-trace="${item.id}"><span><b>${item.title}</b><small>${item.person}</small></span><span aria-hidden="true">→</span></button>`).join('')}</section>`;
      });
      if (!this.items.some(item => this.available(item))) content += `<p class="trace-empty">${this.t('Belum ada jejak yang terbuka. Lanjutkan membaca; tidak ada bagian yang perlu diburu.', 'No traces have opened yet. Keep reading; there is nothing to hunt for.')}</p>`;
      index.innerHTML = content;
      index.querySelectorAll('[data-open-trace]').forEach(button => { button.onclick = () => this.showItem(this.items.find(item => item.id === button.dataset.openTrace)); });
      this.dialog.scrollTop = 0;
    }
    excerpt(side, indices, quoted = false) {
      return indices.map(i => {
        const text = this.docs[side].body[i];
        const value = quoted ? [...text.matchAll(/\*([^*]+)\*/g)].map(match => match[1]).join('\n') || text : text;
        return `<p>${this.inline(value)}</p>`;
      }).join('');
    }
    showItem(item, chosenStep, mode = 'inside') {
      this.current = item; this.mode = mode;
      let marked = false;
      this.stepsFor(item).filter(step => this.ready(item, step)).forEach(step => { const key = `viewed:${item.id}:${step.id}`; if (!this.seen.has(key)) { this.seen.add(key); marked = true; } });
      if (marked) { this.write([...this.seen]); this.refresh(this.readonly); }
      document.querySelector('#tracesIndex').hidden = true; document.querySelector('#traceBack').hidden = false;
      document.querySelector('#tracesTitle').textContent = item.title;
      const detail = document.querySelector('#traceDetail'); detail.hidden = false;
      let body = '', sourceSide = item.side, anchor = item.at;
      if (item.kind === 'silence') {
        body = `<p class="trace-owner">${item.person}</p><div class="trace-choice" role="group" aria-label="${this.t('Dua sisi diam', 'Two sides of silence')}"><button type="button" data-mode="inside" aria-pressed="${mode === 'inside'}">${this.t('Di dalam', 'Inside')}</button><button type="button" data-mode="outside" aria-pressed="${mode === 'outside'}">${this.t('Yang terlihat', 'What was seen')}</button></div><div class="trace-excerpt" aria-live="polite" aria-atomic="true">${this.excerpt(item.side, mode === 'inside' ? item.inside : item.outside, mode === 'inside' && item.quoted)}</div><p class="trace-status">${this.t('Tidak diucapkan.', 'Unspoken.')}</p>`;
      } else if (item.kind === 'letter') {
        const steps = item.steps.filter(step => this.ready(item, step)); this.step = steps.find(step => step.id === chosenStep) || steps.at(-1);
        sourceSide = this.step.side; anchor = this.step.anchor;
        body = `<p class="trace-owner">${item.person}</p><div class="letter-steps" role="group" aria-label="${this.t('Perjalanan surat yang sudah terbaca', 'The letter’s journey encountered so far')}">${steps.map(step => `<button type="button" data-step="${step.id}" aria-pressed="${step.id === this.step.id}">${step.label}</button>`).join('')}</div><p class="trace-status">${this.step.status}</p><div class="trace-excerpt letter-excerpt">${this.excerpt(sourceSide, this.step.excerpt, true)}</div>`;
      } else {
        body = `<p class="trace-owner">${item.person} · ${this.t('Datang setiap sore', 'Comes every afternoon')}</p><p class="trace-speaker">Saman</p><div class="trace-excerpt presence-greeting">${this.excerpt(item.side, [item.greeting])}</div><button class="presence-answer" type="button" id="presenceAnswer">${esc(plain(this.docs[item.side].body[item.answer]))}</button><div id="presenceReply" hidden><p class="trace-speaker">${this.t('Mas', 'Sir')}</p><div class="trace-excerpt">${this.excerpt(item.side, [item.answer])}</div><button class="text-button" type="button" id="presenceAgain">${this.t('Satu sore lagi', 'One more afternoon')} →</button></div>`;
      }
      detail.innerHTML = body + `<p class="trace-source">${esc(this.docs[sourceSide].pov)} · ${esc(this.docs[sourceSide].title)}</p><button class="trace-source-link" id="traceScene" type="button">${this.t('Kembali ke adegan', 'Return to the scene')} →</button>`;
      detail.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => { this.showItem(item, null, button.dataset.mode); detail.querySelector(`[data-mode="${button.dataset.mode}"]`).focus({ preventScroll: true }); }; });
      detail.querySelectorAll('[data-step]').forEach(button => { button.onclick = () => { this.showItem(item, button.dataset.step); detail.querySelector(`[data-step="${button.dataset.step}"]`).focus({ preventScroll: true }); }; });
      const answer = detail.querySelector('#presenceAnswer');
      if (answer) {
        answer.onclick = () => { answer.hidden = true; detail.querySelector('#presenceReply').hidden = false; detail.querySelector('#presenceAgain').focus({ preventScroll: true }); };
        detail.querySelector('#presenceAgain').onclick = () => { this.showItem(item); detail.querySelector('#presenceAnswer').focus({ preventScroll: true }); };
      }
      detail.querySelector('#traceScene').onclick = () => this.onJump(sourceSide, anchor);
      this.dialog.scrollTop = 0;
    }
  }
  const plain = s => String(s).replace(/\*/g, '').replace(/^["“]|["”]$/g, '');
  window.MinuteTraces = MinuteTraces;
})();
