/* Dunia di balik teks: satu panggung SVG yang berubah mengikuti kalimat yang sedang dibaca.
   Tidak ada kalimat cerita di sini. Penanda hanya menunjuk paragraf asli (ID/EN). */
(() => {
  'use strict';
  // Setiap ketukan: penanda paragraf, keadaan yang berlaku sejak paragraf itu, dan efek sekali jalan.
  const BEATS = [
    [ // Saman · Bidak
      { find: ['Lima puluh dua amplop', 'Fifty-two envelopes'], set: { scene: 'drawer', env: 'full' } },
      { find: ['Yang menjaga toko itu', 'What kept watch over the shop'], set: { scene: 'board', king: 'none' } },
      { find: ['Sebuah papan tua di meja', 'An old board on the table'], set: { king: 'button' } },
      { find: ['Lalu, pada suatu musim hujan', 'Then, one rainy season'], set: { rain: 'on' } },
      { find: ['Seekor tikus. Besar', 'A rat. Large'], set: { rat: 'near' } },
      { find: ['Tikus itu mengambilnya.', 'The rat had taken it.'], set: { king: 'gone', pieces: 'scattered' }, fx: 'scatter' },
      { find: ['Perang itu memakan sebelas malam', 'The war consumed eleven nights'], set: { night: 'on', trap: 'set', pieces: 'home' } },
      { find: ['Pada malam kesebelas, perangkapnya menutup', 'On the eleventh night, the trap closed'], set: { trap: 'closed', rat: 'caught' }, fx: 'snap' },
      { find: ['Raja hitamnya. Kembali.', 'His black king. Returned.'], set: { king: 'floor' } },
      { find: ['Hujan turun di gang sempit', 'Rain fell in the narrow alley'], set: { rain: 'on' } },
      { find: ['membuka perangkap yang ia jahit', 'opened the trap he had painstakingly sewn'], set: { trap: 'open' } },
      { find: ['sebelum lenyap ke dalam hujan', 'before vanishing into the rain'], set: { rat: 'gone' } },
      { find: ['menarik laci yang penuh surat', 'pulled open the drawer full of letters'], set: { scene: 'drawer', night: 'off', trap: 'none', letter: 'lifted' } },
      { find: ['Surat itu jatuh ke dalam logam', 'The letter fell into the metal'], set: { scene: 'post', letter: 'sent' }, fx: 'drop' },
      { find: ['meletakkan kancing itu di petak raja', 'placed the button on the king'], set: { scene: 'board', king: 'button', rain: 'off', letter: 'none' } },
      { find: ['Pion, satu petak ke depan', 'A pawn, one square forward'], set: { pawn: 'moved' }, fx: 'move' },
      { find: ['ada sebuah siluet', 'there was a silhouette'], set: { figure: 'on' } },
      { find: ['kabut tebal', 'thick fog'], set: { fog: 'on' } },
      { find: ['bersiap untuk berbunyi', 'prepared to ring'], set: { bell: 'ready' }, fx: 'hold' }
    ],
    [ // Banyu · Alamat yang Tertukar
      { find: ['Surat itu sampai pada hari yang salah', 'The letter arrived on the wrong day'], set: { scene: 'envelope', env: 'down' }, fx: 'stamps' },
      { find: ['keluar berjalan', 'went out walking'], set: { rain: 'on' } },
      { find: ['Ada kota pelabuhan', 'There was the port city'], set: { scene: 'port', rain: 'off' } },
      { find: ['sebungkus daun pisang', 'a banana leaf'], set: { parcel: 'on' } },
      { find: ['Ada desa di pegunungan', 'There was the village in the mountains'], set: { scene: 'lines', parcel: 'none', curve: 'none' } },
      { find: ['garis-garis yang melengkung', 'lines that curved'], set: { curve: 'on' } },
      { find: ['Dan ada kota besar', 'And there was the big city'], set: { scene: 'chair', chair: 'two' } },
      { find: ['Banyu mengangguk.', 'Banyu nodded.'], set: { chair: 'one' } },
      { find: ['membalik amplop itu, dan membukanya', 'turned the envelope over, and opened it'], set: { scene: 'envelope', env: 'open' } },
      { find: ['tertulis empat kalimat', 'four sentences were written'], set: { scene: 'letter', letter: 'four' } },
      { find: ['ada satu kalimat tambahan', 'there was one additional sentence'], set: { letter: 'extra' } },
      { find: ['mengambil secarik kertas dan pena', 'took a piece of paper and a pen'], set: { letter: 'reply' } },
      { find: ['pagi itu juga, ia mengirimkannya', 'that very morning, he sent it'], set: { letter: 'sent' }, fx: 'fly' },
      { find: ['Perjalanan pulang memakan waktu empat hari', 'The journey home took four days'], set: { scene: 'train' } },
      { find: ['Ia membeli satu, jam saku tua', 'He bought one, an old pocket watch'], set: { scene: 'port', watch: 'on' } },
      { find: ['Pada hari keempat, Banyu sampai', 'On the fourth day, Banyu arrived'], set: { scene: 'door' } },
      { find: ['Lonceng berbunyi', 'The bell rang'], set: { bell: 'rung' }, fx: 'bell' },
      { find: ['satu menit setelah jam berhenti', 'one minute after the watch stopped'], set: { stopped: 'on' }, fx: 'stop' },
      { find: ['Maka Banyu tinggal.', 'So Banyu stayed.'], set: { scene: 'board', king: 'button', stopped: 'off', bell: 'none' } },
      { find: ['meletakkannya di sisi papan', 'placed it on the side of the board'], set: { watch: 'board' } }
    ],
    [ // Maryam · Perempuan yang Menghitung Mundur
      { find: ['Hal pertama yang Maryam hitung adalah sendok', 'The first thing Maryam counted was the spoons'], set: { scene: 'spoons', spoons: '12' }, fx: 'count' },
      { find: ['Ia menghitung kalimat', 'She counted sentences'], set: { scene: 'days' } },
      { find: ['Lalu lahir Banyu', 'Then Banyu was born'], set: { scene: 'spoons' } },
      { find: ['tinggal sebelas', 'now lived as eleven'], set: { spoons: '11' } },
      { find: ['ke sebuah kota pelabuhan yang jauh', 'to a distant port city'], set: { scene: 'shop', clocks: 'off' } },
      { find: ['Ia resmi menjadi tuli sebelah', 'She was officially half deaf'], set: { deaf: 'on' } },
      { find: ['Maryam menyukai jam', 'Maryam liked watches'], set: { clocks: 'on', bottle: 'some' } },
      { find: ['lonceng pintu toko jamnya berbunyi', "door chime rang"], set: { bell: 'rung' }, fx: 'chime' },
      { find: ['ia melihat sebuah bungkusan daun pisang', 'she saw a banana leaf parcel'], set: { parcel: 'on', bell: 'none' } },
      { find: ['memasukkan sebuah gir logam yang patah', 'dropped a broken metal gear'], set: { bottle: 'more', parcel: 'none' }, fx: 'gear' },
      { find: ['Ia menulis dengan lambat', 'She wrote slowly'], set: { scene: 'letter', letter: 'mother' } },
      { find: ['sendok teh ke-12', 'the 12th teaspoon'], set: { scene: 'shop', spoon: 'stir' }, fx: 'spoon' },
      { find: ['meninggal dunia dengan tenang', 'passed away peacefully'], set: { clocks: 'frozen', spoon: 'none' }, fx: 'freeze' }
    ]
  ];
  const BASE = [
    { scene: 'drawer', env: 'thin', king: 'none', pieces: 'home', rain: 'off', rat: 'none', night: 'off', trap: 'none', letter: 'none', pawn: 'home', figure: 'off', fog: 'off', bell: 'none' },
    { scene: 'envelope', env: 'down', rain: 'off', parcel: 'none', curve: 'none', chair: 'two', letter: 'none', watch: 'none', bell: 'none', stopped: 'off', king: 'button', pieces: 'home', pawn: 'home' },
    { scene: 'spoons', spoons: '12', deaf: 'off', clocks: 'off', bottle: 'none', bell: 'none', parcel: 'none', letter: 'none', spoon: 'none' }
  ];
  // Raja dan kancing: pembaca ikut menjaga petak yang sama.
  const SCENES = {
    drawer: 'drawer', board: 'board', post: 'post window', envelope: 'envelope', port: 'shelf', lines: 'lines', chair: 'chair',
    letter: 'paper', train: 'train', door: 'door window', spoons: 'spoons', days: 'days', shop: 'clocks bottle'
  };

  const S = 30, CY = 236;
  const iso = (c, r) => { const lx = (c + .5) * S - 4 * S, ly = (r + .5) * S - 4 * S, k = Math.SQRT1_2; return [200 + (lx - ly) * k, CY + (lx + ly) * k * .52]; };
  const isoPoly = (c, r) => [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]].map(([x, y]) => isoPt(x, y).map(v => v.toFixed(1)).join(',')).join(' ');
  function isoPt(x, y) { const lx = x * S - 4 * S, ly = y * S - 4 * S, k = Math.SQRT1_2; return [200 + (lx - ly) * k, CY + (lx + ly) * k * .52]; }
  const isoQuad = (x0, y0, x1, y1, drop) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const [px, py] = isoPt(x, y); return `${px.toFixed(1)},${(py + (y === y1 || x === x1 ? drop : 0)).toFixed(1)}`; }).join(' ');
  const PIECE = {
    pawn: 'M-7 0h14l-2.5-4h-9z M-4-4l-1.2-8h10.4l-1.2 8z M0-12a4.6 4.6 0 1 0 .01 0z',
    rook: 'M-8 0h16l-2.5-4h-11z M-5.5-4l-.5-13h12l-.5 13z M-7-17v-5h3v2h2.5v-2h3v2h2.5v-2h3v5z',
    bishop: 'M-8 0h16l-2.5-4h-11z M-4.5-4l-1-9h11l-1 9z M0-24c5 4 6 8 0 11c-6-3-5-7 0-11z M0-27a2 2 0 1 0 .01 0z',
    king: 'M-8 0h16l-2.5-4h-11z M-5-4l-1.5-14h13l-1.5 14z M-7-18h14l-2-3h-10z M-1.2-21v-4h-2.5v-2.4h2.5v-2.6h2.4v2.6h2.5v2.4h-2.5v4z',
    queen: 'M-8 0h16l-2.5-4h-11z M-5-4l-2.5-15l4 4l3.5-8l3.5 8l4-4l-2.5 15z'
  };
  const pieces = [
    ['rook', 0, 0, 'w'], ['king', 4, 0, 'w'], ['bishop', 2, 1, 'w'], ['pawn', 3, 1, 'w'], ['pawn', 5, 2, 'w'], ['queen', 3, 3, 'w'],
    ['pawn', 2, 5, 'b'], ['pawn', 4, 6, 'b', 'mover'], ['bishop', 5, 6, 'b'], ['rook', 7, 7, 'b']
  ];
  const scatter = [[-38, 12, -70], [26, -10, 80], [-20, -16, -110], [44, 8, 95], [-12, 20, 60], [30, 16, -60], [-46, -4, 120], [18, 24, -90], [-30, 10, 70], [40, -6, -120]];
  const piece = ([type, c, r, side, extra], i) => {
    const [x, y] = iso(c, r), [mx, my] = iso(c, r - 1);
    return `<g class="piece ${side} ${extra || ''}" style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--mx:${mx.toFixed(1)}px;--my:${my.toFixed(1)}px;--sx:${scatter[i][0]}px;--sy:${scatter[i][1]}px;--sr:${scatter[i][2]}deg"><ellipse class="shadow" rx="9" ry="3.4"/><path d="${PIECE[type]}"/></g>`;
  };
  const board = () => {
    let squares = '';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) squares += `<polygon class="${(r + c) % 2 ? 'sq dark' : 'sq light'}" points="${isoPoly(c, r)}"/>`;
    const [kx, ky] = iso(4, 7), [fx, fy] = iso(6.2, 9.4);
    return `<g class="g g-board"><polygon class="board-side" points="${isoQuad(-.3, -.3, 8.3, 8.3, 9)}"/><polygon class="board-edge" points="${isoQuad(-.3, -.3, 8.3, 8.3, 0)}"/>${squares}
      <g class="pieces" transform="scale(1)">${pieces.map(piece).join('')}</g>
      <g class="king-button" style="--x:${kx.toFixed(1)}px;--y:${ky.toFixed(1)}px;--fx:${fx.toFixed(1)}px;--fy:${fy.toFixed(1)}px"><ellipse class="shadow" rx="10" ry="3.6" cy="1"/><ellipse class="button-rim" rx="9" ry="4.2" cy="-2"/><ellipse class="button-face" rx="9" ry="4.2" cy="-3.6"/><g class="holes"><circle cx="-2.4" cy="-4.6" r="1"/><circle cx="2.4" cy="-4.6" r="1"/><circle cx="-2.4" cy="-2.6" r="1"/><circle cx="2.4" cy="-2.6" r="1"/></g></g>
      <g class="rat"><path class="tail" d="M-16 2c-14 4-22-2-30 6"/><ellipse class="body" rx="17" ry="8.5"/><circle class="head" cx="17" cy="-2" r="7"/><path class="ear" d="M13-8l3-6l4 3l-2 1z"/><circle class="eye" cx="20" cy="-3.5" r="1.2"/></g>
      <g class="trap"><rect class="trap-body" x="-34" y="-18" width="68" height="34" rx="8"/><path class="stitch" d="M-28-12h56M-28 10h56"/><rect class="trap-door" x="30" y="-16" width="6" height="30" rx="2"/></g>
      <g class="watch-side"><circle r="16" class="watch-case"/><circle r="12.5" class="watch-face"/><path class="watch-hands" d="M0 0v-9M0 0l6 3"/><rect x="-2.5" y="-21" width="5" height="5" rx="1" class="watch-case"/></g>
    </g>`;
  };
  const envelope = () => `<g class="g g-envelope"><g class="env-card"><rect class="paper-fill" x="90" y="150" width="220" height="140" rx="4"/><path class="fold" d="M90 150l110 78l110-78M90 290l82-60M310 290l-82-60"/>
      ${Array.from({ length: 12 }, (_, i) => { const x = 120 + (i * 37) % 170, y = 175 + (i * 53) % 95, r = (i * 47) % 360; return `<g class="stamp" style="--i:${i}" transform="translate(${x} ${y}) rotate(${r})"><circle r="17"/><circle r="11"/><path d="M-26-3h52M-26 3h52"/></g>`; }).join('')}</g>
      <g class="env-open"><rect class="paper-fill" x="90" y="170" width="220" height="120" rx="4"/><path class="fold" d="M90 170l110-70l110 70"/><rect class="paper-sheet" x="115" y="120" width="170" height="120" rx="3"/></g></g>`;
  const handLine = (y, w, faded) => `<path class="ink${faded ? ' faded' : ''}" d="M130 ${y}${Array.from({ length: Math.round(w / 12) }, (_, i) => ` q 3 ${i % 2 ? -2 : 2} 6 0 t 6 0`).join('')}"/>`;
  const paper = () => `<g class="g g-paper"><rect class="paper-sheet big" x="110" y="80" width="180" height="250" rx="3"/><g class="lines-four">${[120, 145, 170, 195].map((y, i) => handLine(y, [120, 96, 108, 132][i])).join('')}</g><g class="line-extra">${handLine(240, 140, true)}${handLine(262, 90, true)}</g><g class="lines-reply">${[120, 140, 160, 180, 200, 220, 240].map((y, i) => handLine(y, [140, 130, 120, 140, 110, 136, 80][i])).join('')}</g><g class="lines-mother">${[120, 142, 164, 186, 208, 230, 252, 274].map((y, i) => handLine(y, [140, 120, 136, 112, 140, 128, 100, 70][i], i > 5)).join('')}</g><g class="fly-env"><rect class="paper-fill" x="140" y="180" width="120" height="74" rx="3"/><path class="fold" d="M140 180l60 42l60-42"/></g></g>`;
  const watch = (x, y, r, a1, a2, cls = '') => `<g class="mini-watch ${cls}" transform="translate(${x} ${y})"><circle r="${r}" class="watch-case"/><circle r="${r * .8}" class="watch-face"/><path class="watch-hands" d="M0 0L${(Math.sin(a1) * r * .6).toFixed(1)} ${(-Math.cos(a1) * r * .6).toFixed(1)}M0 0L${(Math.sin(a2) * r * .42).toFixed(1)} ${(-Math.cos(a2) * r * .42).toFixed(1)}"/></g>`;
  const shelf = () => `<g class="g g-shelf"><path class="shelf-line" d="M60 250h280"/>${[0, 1, 2, 3, 4, 5].map(i => watch(90 + i * 44, 226, 16 + (i % 3) * 3, i * 1.3, i * 2.1)).join('')}<path class="shelf-line" d="M60 160h280"/>${[0, 1, 2, 3, 4].map(i => watch(105 + i * 48, 138, 14 + (i % 2) * 4, i * 2.4, i * .7)).join('')}
      <g class="parcel" transform="translate(200 300)"><path class="leaf" d="M-48-16q48-14 96 0l-6 32q-42 10-84 0z"/><path class="leaf-vein" d="M-44-2q44-8 88 0M-30-12v24M0-14v28M30-12v24"/><path class="string" d="M-4-18v36M-48 0h96"/></g>
      <g class="pocket" transform="translate(200 312)"><path class="chain" d="M0-36c22-20 52-12 64 6"/><circle r="30" class="watch-case"/><circle r="25" class="watch-face"/><path class="watch-hands" d="M0 0v-17M0 0l11 6"/><rect x="-4" y="-40" width="8" height="8" rx="2" class="watch-case"/></g></g>`;
  const lines = () => `<g class="g g-lines"><circle class="pin-dot" cx="110" cy="290" r="5"/><path class="route straight" d="M110 290L330 90"/><path class="route curved" d="M110 290C40 180 140 60 250 90S360 260 250 300S150 330 110 290"/></g>`;
  const chair = (x, cls) => `<g class="chair ${cls}" transform="translate(${x} 0)"><path d="M-22 300v-80h44v80M-22 250h44M-18 220v-70h36v70"/></g>`;
  const chairs = () => `<g class="g g-chair"><path class="floor" d="M60 302h280"/>${chair(160, 'left')}${chair(240, 'right')}</g>`;
  const train = () => `<g class="g g-train"><rect class="frame" x="70" y="110" width="260" height="170" rx="18"/><g class="streaks" clip-path="url(#trainClip)">${Array.from({ length: 9 }, (_, i) => `<rect class="streak" style="--i:${i}" x="${70 + i * 40}" y="${130 + (i * 37) % 130}" width="${30 + (i * 13) % 40}" height="2" rx="1"/>`).join('')}</g><path class="frame-bar" d="M200 110v170"/></g>`;
  const windowG = () => `<g class="g g-window"><rect class="pane" x="110" y="60" width="180" height="150" rx="3"/><g clip-path="url(#paneClip)"><g class="figure"><circle cx="200" cy="130" r="18"/><path d="M160 210c0-36 18-52 40-52s40 16 40 52z"/><rect x="226" y="160" width="26" height="40" rx="6"/></g><g class="rain">${Array.from({ length: 22 }, (_, i) => `<path style="--i:${i}" d="M${110 + (i * 37) % 180} ${40 + (i * 23) % 60}l-6 22"/>`).join('')}</g></g><path class="mullion" d="M200 60v150M110 135h180"/></g>`;
  const post = () => `<g class="g g-post"><rect class="box" x="230" y="220" width="70" height="110" rx="10"/><rect class="slot" x="245" y="240" width="40" height="6" rx="3"/><g class="drop-env"><rect class="paper-fill" x="243" y="150" width="44" height="28" rx="2"/><path class="fold" d="M243 150l22 15l22-15"/></g></g>`;
  const door = () => `<g class="g g-door"><rect class="door-frame" x="140" y="70" width="120" height="250" rx="2"/><rect class="door-glass" x="158" y="92" width="84" height="110" rx="2"/><circle class="knob" cx="244" cy="220" r="5"/></g>`;
  const bell = () => `<g class="bell" transform="translate(200 52)"><g class="bell-swing"><path class="bell-strap" d="M0-14v8"/><path class="bell-body" d="M-14 14c0-18 4-22 14-22s14 4 14 22l4 4h-36z"/><circle class="clapper" cy="20" r="3"/></g></g>`;
  const drawer = () => `<g class="g g-drawer"><g class="stack">${Array.from({ length: 26 }, (_, i) => `<g class="env" style="--i:${i}" transform="translate(${(i * 7) % 11 - 5} ${-i * 3.4}) rotate(${((i * 13) % 7 - 3) * .6} 200 280)"><rect class="paper-fill" x="128" y="262" width="144" height="34" rx="2"/><path class="fold" d="M128 262l72 18l72-18"/></g>`).join('')}</g><g class="lift-env"><rect class="paper-fill" x="128" y="150" width="144" height="88" rx="2"/><path class="fold" d="M128 150l72 40l72-40"/></g><rect class="drawer-front" x="96" y="296" width="208" height="56" rx="4"/><rect class="handle" x="180" y="318" width="40" height="8" rx="4"/></g>`;
  const spoons = () => `<g class="g g-spoons">${Array.from({ length: 12 }, (_, i) => `<g transform="translate(${92 + i * 19.6} 200)"><g class="spoon${i === 11 ? ' twelfth' : ''}" style="--i:${i}"><ellipse rx="6.5" ry="10"/><rect x="-1.8" y="9" width="3.6" height="58" rx="1.8"/></g></g>`).join('')}</g>`;
  const days = () => { const filled = new Set([3, 17, 24, 38, 51]); return `<g class="g g-days">${Array.from({ length: 56 }, (_, i) => `<circle class="${filled.has(i) ? 'day one' : 'day'}" cx="${110 + (i % 7) * 30}" cy="${110 + Math.floor(i / 7) * 26}" r="${filled.has(i) ? 5 : 3.2}"/>`).join('')}</g>`; };
  const clocks = () => {
    const spots = [[78, 92, 26], [150, 70, 18], [214, 96, 30], [300, 76, 22], [342, 150, 18], [62, 170, 18], [120, 150, 22], [290, 160, 26], [74, 248, 22], [338, 238, 24], [150, 230, 16], [250, 236, 16], [110, 316, 20], [300, 316, 18]];
    return `<g class="g g-clocks">${spots.map(([x, y, r], i) => `<g class="wall-clock${x < 190 ? ' left' : ''}" transform="translate(${x} ${y})"><circle r="${r}" class="watch-case"/><circle r="${r * .84}" class="watch-face"/><g class="spin" style="--d:${(4 + (i * 7) % 9).toFixed(1)}s;--o:${(i * 37) % 360}deg"><path class="watch-hands" d="M0 0v-${(r * .66).toFixed(1)}"/></g><path class="watch-hands short" d="M0 0L${(Math.sin(i) * r * .4).toFixed(1)} ${(-Math.cos(i) * r * .4).toFixed(1)}"/></g>`).join('')}
      <g class="stir" transform="translate(200 300)"><path class="glass-cup" d="M-22-30h44l-5 52h-34z"/><path class="tea" d="M-19-14h38l-3 34h-32z"/><g class="stir-spoon"><ellipse cx="0" cy="8" rx="4.5" ry="7"/><rect x="-1.4" y="-46" width="2.8" height="54" rx="1.4"/></g></g></g>`;
  };
  const sceneBottle = () => {
    const gear = window.MinuteBottle?.gear;
    const gears = Array.from({ length: 10 }, (_, i) => { const x = 192 + (i % 3) * 9 - 9 + (i % 2) * 3, y = 312 - Math.floor(i / 3) * 8; return gear ? `<path class="gear${i === 9 ? ' last' : ''}" d="${gear(x, y, 4.4, i)}"/>` : ''; }).join('');
    return `<g class="g g-bottle"><rect class="cork" x="191" y="232" width="18" height="12" rx="2"/><path class="glass" d="M192 244h16v12c0 4 16 9 16 22v42c0 4-3 7-7 7h-34c-4 0-7-3-7-7v-42c0-13 16-18 16-22z"/>${gears}</g>`;
  };
  const markup = () => `<svg class="scene" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs><radialGradient id="lampGlow"><stop offset="0" stop-color="var(--glow)" stop-opacity=".55"/><stop offset="1" stop-color="var(--glow)" stop-opacity="0"/></radialGradient>
      <filter id="frost"><feGaussianBlur stdDeviation="3.5"/></filter><filter id="fogBlur"><feGaussianBlur stdDeviation="18"/></filter>
      <clipPath id="paneClip"><rect x="110" y="60" width="180" height="150" rx="3"/></clipPath><clipPath id="trainClip"><rect x="70" y="110" width="260" height="170" rx="18"/></clipPath></defs>
    <circle class="lamp" cx="200" cy="210" r="210" fill="url(#lampGlow)"/>
    ${windowG()}${drawer()}${post()}${board()}${envelope()}${paper()}${shelf()}${lines()}${chairs()}${train()}${door()}${spoons()}${days()}${clocks()}${sceneBottle()}${bell()}
    <g class="fog" filter="url(#fogBlur)"><ellipse cx="120" cy="330" rx="200" ry="70"/><ellipse cx="300" cy="250" rx="180" ry="80"/><ellipse cx="200" cy="140" rx="220" ry="70"/></g>
  </svg>`;

  class MinuteWorld {
    constructor(host, docs, en) {
      this.host = host; host.innerHTML = markup(); this.svg = host.querySelector('svg');
      this.groups = [...this.svg.querySelectorAll('.g')];
      this.beats = BEATS.map((list, side) => list.map(beat => ({ ...beat, p: docs[side].body.findIndex(p => p.includes(beat.find[en ? 1 : 0])) })).filter(beat => beat.p >= 0).sort((a, b) => a.p - b.p));
      this.side = -1; this.signature = '';
    }
    stateAt(side, p) {
      const state = { ...BASE[side] };
      this.beats[side].forEach(beat => { if (beat.p <= p) Object.assign(state, beat.set); });
      return state;
    }
    // Efek yang terlewati dalam satu langkah baca; lompatan jauh tidak memicu apa pun.
    crossed(side, from, to) {
      if (to <= from || to - from > 3) return [];
      return this.beats[side].filter(beat => beat.fx && beat.p > from && beat.p <= to).map(beat => beat.fx);
    }
    render(side, p) {
      const state = this.stateAt(side, p), signature = side + JSON.stringify(state);
      if (signature === this.signature) return state;
      this.signature = signature; this.svg.dataset.side = 'abc'[side];
      [...this.svg.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-side' && a.name !== 'data-fx').forEach(a => this.svg.removeAttribute(a.name));
      Object.entries(state).forEach(([key, value]) => { this.svg.dataset[key] = value; });
      const visible = new Set((SCENES[state.scene] || '').split(' '));
      if (state.bell !== 'none') visible.add('bell');
      if (state.parcel === 'on') visible.add('shelf');
      if (state.figure === 'on') visible.add('window');
      this.groups.forEach(g => { const name = [...g.classList].find(c => c.startsWith('g-')).slice(2); g.classList.toggle('on', visible.has(name)); });
      this.svg.querySelector('.bell').classList.toggle('on', state.bell !== 'none');
      return state;
    }
    fx(name) {
      this.svg.dataset.fx = ''; void this.svg.getBoundingClientRect(); this.svg.dataset.fx = name;
      clearTimeout(this.fxTimer); this.fxTimer = setTimeout(() => { this.svg.dataset.fx = ''; }, 2600);
    }
  }
  MinuteWorld.BEATS = BEATS;
  window.MinuteWorld = MinuteWorld;
})();
