/* Shift Malam: data antarmuka untuk Pabrik Mimpi. Kalimat cerita tetap dari works.json;
   setiap penanda menunjuk satu paragraf asli dalam bahasa Indonesia dan Inggris. */
(() => {
  'use strict';
  const BEATS = [
    { find: ['mimpi dibuat pada shift malam', 'dreams were manufactured on the night shift'], station: ['Lantai produksi · shift malam', 'Production floor · night shift'] },
    { find: ['Itu adalah kebocoran', 'That was a leak'], chip: ['Kebocoran cerobong · dicatat sebagai kerugian', 'Chimney leak · recorded as a loss'], tone: 'warn', leak: 1 },
    { find: ['merangkai mimpi dari bahan-bahan', 'assembling dreams from materials'], ingredients: [
      ['Seuntai tawa anak-anak', "A strand of children's laughter"], ['Sekilo keheningan dasar danau', 'A kilo of lake-bottom silence'],
      ['Warna langit pukul 17.00', 'The sky at 5 p.m.'], ['Serpih wajah yang sudah tiada', 'Fragments of departed faces']] },
    { find: ['bekerja seorang lelaki tua bernama Pak Wangsa', 'worked an old man named Mr. Wangsa'], station: ['Stasiun paling ujung · Pak Wangsa', 'The end station · Mr. Wangsa'] },
    { find: ['Ia ditugaskan di bagian mimpi-mimpi khusus', 'He was assigned to the special dreams section'], chip: ['Pesanan khusus · satu orang, satu malam', 'Bespoke order · one person, one night'], tone: 'info' },
    { find: ['Itu bukan kebetulan. Itu aturan.', "It wasn't a coincidence. It was the rule."], chip: ['Aturan pabrik', 'Factory rule'], tone: 'warn' },
    { find: ['Perajin tidak diperkenankan mengonsumsi produk', 'Crafters are not permitted to consume the product'], rule: true },
    { find: ['Pak Wangsa membuat satu mimpi tambahan', 'Mr. Wangsa crafted one extra dream'], chip: ['Di luar pesanan · bahan sisa', 'Off the books · leftover scraps'], tone: 'info' },
    { find: ['ia membawanya ke gerbang', 'he brought it to the gate'], chip: ['Gerbang · diletakkan kembali di meja', 'Gate · put back on the desk'], tone: 'warn' },
    { find: ['Dan mimpi itu akan larut di atas meja', 'And the dream would dissolve on the table'], years: 40 },
    { find: ['Tentu itu bukan nama aslinya. Namanya Lila', "Of course, that wasn't her real name. Her name was Lila"], chip: ['Lila · magang · stasiun sebelah', 'Lila · apprentice · next station'], tone: 'info' },
    { find: ['Sebuah panggung. Kosong.', 'A stage. Empty.'], order: true },
    { find: ['Pak Wangsa tidak membawa pulang mimpinya.', 'Mr. Wangsa did not take his dream home.'], chip: ['Gerbang · diletakkan kembali', 'Gate · put back'], tone: 'warn' },
    { find: ['Dan Pak Wangsa pensiun, dan tidak pernah kembali', 'And Mr. Wangsa retired, and never returned'], chip: ['Absen keluar · tidak kembali', 'Clocked out · never returned'], tone: 'muted', punch: true },
    { find: ['kini bukan magang lagi melainkan perajin penuh', 'now no longer an apprentice but a full crafter'], chip: ['Lila · perajin penuh · stasiun ujung', 'Lila · full crafter · end station'], tone: 'info' },
    { find: ['Lila telah melacak mereka', 'Lila had tracked them down'], archive: true },
    { find: ['Ban berjalan telah dimatikan', 'The conveyor belts had been turned off'], seats: 'filled', belt: 'off' },
    { find: ['Lalu seorang perempuan di barisan depan', 'Then a woman in the front row'], seats: 'one' },
    { find: ['Dan ia mulai bertepuk tangan.', 'And she began to clap.'], applause: true },
    { find: ['Lalu yang di sebelahnya berdiri', 'Then the person next to her stood'], seats: 'all', leak: 2 }
  ];
  // Arsip pesanan lama: kalimat dari paragraf pesanan khusus, ditambah pesanan Pak Wangsa sendiri.
  const ARCHIVE = {
    source: ['Ia ditugaskan di bagian mimpi-mimpi khusus', 'He was assigned to the special dreams section'],
    starts: [['Seorang ibu', 'A mother'], ['Seorang lelaki tua', 'An old man'], ['Seorang anak', 'A child in a hospital']],
    own: { label: ['Pak Wangsa · untuk dirinya sendiri', 'Mr. Wangsa · for himself'], held: ['Tahun depan, mungkin', 'Next year, perhaps'], done: ['Terjadi · dengan mata terbuka', 'Happened · with eyes open'], after: ['dengan mata terbuka', 'with open eyes'] }
  };
  const RULE = ['Perajin tidak diperkenankan mengonsumsi produk.', 'Crafters are not permitted to consume the product.'];
  window.MimpiShift = { BEATS, ARCHIVE, RULE };
})();
