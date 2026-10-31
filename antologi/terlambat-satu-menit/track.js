/* Lacak Surat: data pelacakan. Label status adalah antarmuka; kalimat cerita tetap dari works.json.
   Setiap penanda menunjuk satu paragraf asli dalam bahasa Indonesia dan Inggris. */
(() => {
  'use strict';
  // tone: pending, held, transit, done, lost
  const SIDES = [
    {
      resi: 'SMN 0052 ID',
      item: ['Surat', 'Letter'], from: 'Saman', fromPlace: ['Toko jahit, ujung gang', 'Tailor shop, end of the alley'],
      to: 'Banyu', toPlace: ['Alamat lama, kota seberang', 'Old address, the neighboring city'],
      stages: [['Ditulis', 'Written'], ['Disimpan', 'Kept'], ['Dikirim', 'Posted'], ['Dalam perjalanan', 'In transit']],
      beats: [
        { find: ['Lelaki tua itu menulis surat yang sama', 'The old man wrote the same letter'], status: ['Ditulis', 'Written'], tone: 'pending', stage: 0, loc: ['Toko jahit, ujung gang', 'Tailor shop, end of the alley'] },
        { find: ['menaruhnya di laci, tidak dikirim', 'placed it in a drawer, unsent'], status: ['Disimpan di laci · tidak dikirim', 'Kept in the drawer · not sent'], tone: 'held', stage: 1 },
        { find: ['Lima puluh dua amplop', 'Fifty-two envelopes'], status: ['Tertahan di pengirim', 'Held by sender'], tone: 'held', stage: 1, special: 'fiftytwo' },
        { find: ['Ia meninggalkan catatan di meja dapur', 'She left a note on the kitchen table'], status: ['Catatan ditemukan · disembunyikan', 'Note found · hidden'], tone: 'lost', loc: ['Meja dapur', 'Kitchen table'] },
        { find: ['pada usia tujuh belas ia berdiri di pintu toko', 'at seventeen, he stood at the shop door'], status: ['Penerima pindah · alamat baru tidak diketahui', 'Recipient moved · new address unknown'], tone: 'lost', loc: ['Pintu toko', 'Shop door'] },
        { find: ['Yang menjaga toko itu', 'What kept watch over the shop'], loc: ['Meja dekat jendela', 'Table by the window'] },
        { find: ['menarik laci yang penuh surat', 'pulled open the drawer full of letters'], status: ['Diambil dari laci', 'Taken from the drawer'], tone: 'pending', stage: 1, loc: ['Meja jahit', 'Sewing table'] },
        { find: ['ia menambahkan kalimat', 'he added the sentence'], status: ['Isi diperbarui · 1 kalimat ditambahkan', 'Contents updated · 1 sentence added'], tone: 'pending' },
        { find: ['Surat itu jatuh ke dalam logam', 'The letter fell into the metal'], status: ['Diserahkan ke kotak pos', 'Dropped in the mailbox'], tone: 'transit', stage: 2, loc: ['Kotak pos, ujung gang', 'Mailbox, end of the alley'], sound: 'stamp' },
        { find: ['Hari-hari berlalu sejak malam itu', 'Days passed since that night'], status: ['Dalam perjalanan', 'In transit'], tone: 'transit', stage: 3, fog: true, loc: ['Toko jahit, ujung gang', 'Tailor shop, end of the alley'] },
        { find: ['bersiap untuk berbunyi', 'prepared to ring'], status: ['Seseorang di depan pintu', 'Someone at the door'], tone: 'transit' }
      ]
    },
    {
      resi: 'SMN 0052 ID',
      item: ['Surat yang sama', 'The same letter'], from: 'Saman', fromPlace: ['Toko jahit, ujung gang', 'Tailor shop, end of the alley'],
      to: 'Banyu', toPlace: ['Diteruskan dari alamat ke alamat', 'Forwarded from address to address'],
      stages: [['Dialihkan', 'Forwarded'], ['Diterima', 'Received'], ['Dibuka', 'Opened'], ['Dibalas', 'Answered'], ['Tiba', 'Arrived']],
      beats: [
        { find: ['Surat itu sampai pada hari yang salah', 'The letter arrived on the wrong day'], status: ['Diterima · hari yang salah, kota yang salah', 'Received · wrong day, wrong city'], tone: 'done', stage: 1, special: 'forwarded', loc: ['Apartemen kontrakan', 'Rented apartment'] },
        { find: ['Ia tidak membukanya. Ia menaruhnya di meja', "He didn't open it. He placed it on the table"], status: ['Belum dibuka', 'Not opened'], tone: 'held', stage: 1 },
        { find: ['Ada kota pelabuhan', 'There was the port city'], status: ['Riwayat alamat penerima', 'Recipient address history'], tone: 'pending', loc: ['Alamat lama · kota pelabuhan', 'Old address · port city'] },
        { find: ['Ada desa di pegunungan', 'There was the village in the mountains'], status: ['Riwayat alamat penerima', 'Recipient address history'], tone: 'pending', loc: ['Alamat lama · desa pegunungan', 'Old address · mountain village'] },
        { find: ['Dan ada kota besar', 'And there was the big city'], status: ['Riwayat alamat penerima', 'Recipient address history'], tone: 'pending', loc: ['Alamat lama · kota besar', 'Old address · big city'] },
        { find: ['kunjungan rahasia ke kantor pos', 'secret visit to the post office'], status: ['Alamat pengalihan diperbarui', 'Forwarding address renewed'], tone: 'transit', loc: ['Kantor pos', 'Post office'] },
        { find: ['membalik amplop itu, dan membukanya', 'turned the envelope over, and opened it'], status: ['Dibuka', 'Opened'], tone: 'done', stage: 2, loc: ['Apartemen kontrakan', 'Rented apartment'] },
        { find: ['ada satu kalimat tambahan', 'there was one additional sentence'], status: ['Dibaca sampai bawah', 'Read to the bottom'], tone: 'done', stage: 2 },
        { find: ['mengambil secarik kertas dan pena', 'took a piece of paper and a pen'], status: ['Balasan ditulis', 'Reply written'], tone: 'pending', stage: 3 },
        { find: ['pagi itu juga, ia mengirimkannya', 'that very morning, he sent it'], status: ['Balasan dikirim · penerimaan tidak tercatat', 'Reply sent · receipt not recorded'], tone: 'transit', stage: 3, sound: 'stamp' },
        { find: ['Perjalanan pulang memakan waktu empat hari', 'The journey home took four days'], status: ['Penerima menuju alamat pengirim', 'Recipient heading to sender'], tone: 'transit', loc: ['Kereta · empat hari', 'Train · four days'] },
        { find: ['Ia membeli satu, jam saku tua', 'He bought one, an old pocket watch'], status: ['Bawaan: 1 jam saku · berhenti', 'Carrying: 1 pocket watch · stopped'], tone: 'pending', loc: ['Toko jam · kota pelabuhan', 'Watch shop · port city'] },
        { find: ['Pada hari keempat, Banyu sampai', 'On the fourth day, Banyu arrived'], status: ['Tiba di alamat', 'Arrived at address'], tone: 'transit', stage: 4, loc: ['Toko jahit, ujung gang', 'Tailor shop, end of the alley'] },
        { find: ['Lonceng berbunyi', 'The bell rang'], status: ['Pintu dibuka', 'Door opened'], tone: 'transit', sound: 'bell' },
        { find: ['"Mari, Mas,"', '"Come in, Sir,"'], status: ['Diterima oleh: Mas', 'Received by: Sir'], tone: 'lost' },
        { find: ['satu menit setelah jam berhenti', 'one minute after the watch stopped'], status: ['Terlambat 1 menit', '1 minute late'], tone: 'lost', special: 'proof' },
        { find: ['Maka Banyu tinggal.', 'So Banyu stayed.'], status: ['Kunjungan berulang · setiap sore', 'Repeat visits · every afternoon'], tone: 'done' },
        { find: ['Besok aku datang lagi', "Tomorrow I'll come again"], status: ['Dijadwalkan: besok', 'Scheduled: tomorrow'], tone: 'transit', special: 'tomorrow' }
      ]
    },
    {
      resi: 'MRY 0012 ID',
      item: ['Catatan dan surat', 'A note and a letter'], from: 'Maryam', fromPlace: ['Dapur, rumah lama', 'Kitchen, the old house'],
      to: 'Banyu', toPlace: ['Alamat usang', 'An outdated address'],
      stages: [['Dihitung', 'Counted'], ['Ditinggalkan', 'Left behind'], ['Tertahan', 'Withheld'], ['Dikirim', 'Posted']],
      beats: [
        { find: ['Hal pertama yang Maryam hitung adalah sendok', 'The first thing Maryam counted was the spoons'], status: ['Dihitung: 12 sendok', 'Counted: 12 spoons'], tone: 'pending', stage: 0, loc: ['Laci dapur', 'Kitchen drawer'] },
        { find: ['Ia menghitung kalimat', 'She counted sentences'], status: ['Dihitung: kalimat', 'Counted: sentences'], tone: 'pending', stage: 0 },
        { find: ['Maryam meninggalkan anak berumur sembilan tahun', 'Maryam left a nine-year-old child'], status: ['Pengirim pergi', 'Sender gone'], tone: 'lost', stage: 1 },
        { find: ['Maka ia menulis. Tangan', 'So she wrote. Hands'], status: ['Catatan ditinggalkan di bawah cangkir · 12 sendok tinggal 11', 'Note left under a cup · 12 spoons now 11'], tone: 'pending', stage: 1, loc: ['Meja dapur', 'Kitchen table'] },
        { find: ['Catatan itu tidak pernah sampai ke Banyu', 'That note never reached Banyu'], status: ['Tertahan · tidak pernah sampai', 'Withheld · never delivered'], tone: 'lost', stage: 2 },
        { find: ['ke sebuah kota pelabuhan yang jauh', 'to a distant port city'], status: ['Pengirim pindah', 'Sender relocated'], tone: 'pending', loc: ['Kota pelabuhan', 'Port city'] },
        { find: ['lonceng pintu toko jamnya berbunyi', 'door chime rang'], status: ['Lonceng pintu', 'Door chime'], tone: 'transit', loc: ['Toko jam', 'Watch shop'], sound: 'chime' },
        { find: ['Tikar itu kosong', 'The mat was empty'], status: ['Gudang belakang kosong', 'Back room empty'], tone: 'lost', loc: ['Gudang belakang', 'Back room'] },
        { find: ['memasukkan sebuah gir logam yang patah', 'dropped a broken metal gear'], status: ['Disimpan: 1 menit · dalam botol', 'Stored: 1 minute · in a bottle'], tone: 'held', loc: ['Meja kerja', 'Workbench'] },
        { find: ['Ia menulis dengan lambat', 'She wrote slowly'], status: ['Surat ditulis', 'Letter written'], tone: 'pending', stage: 3, loc: ['Dekat jendela, toko jam', 'By the window, watch shop'] },
        { find: ['Ia melipat surat itu. Ia menulis alamat', 'She folded the letter. She wrote the address'], status: ['Dikirim ke alamat usang · status tidak diketahui', 'Sent to an outdated address · status unknown'], tone: 'transit', stage: 3, loc: ['Kantor pos', 'Post office'], sound: 'stamp' },
        { find: ['meninggal dunia dengan tenang', 'passed away peacefully'], status: ['Jam berhenti', 'The clock stopped'], tone: 'lost', freeze: true, loc: ['Toko jam', 'Watch shop'] }
      ]
    }
  ];
  // Ringkasan setelah ketiga riwayat terbaca: setiap baris menunjuk ketukan yang benar-benar dibaca.
  const SUMMARY = [
    { label: ['Surat Saman → Banyu', "Saman's letter → Banyu"], resi: 'SMN 0052 ID', side: 1, beat: 'ada satu kalimat tambahan' },
    { label: ['Catatan Maryam → Banyu', "Maryam's note → Banyu"], resi: 'MRY 0012 ID', side: 2, beat: 'Catatan itu tidak pernah sampai' },
    { label: ['Balasan Banyu → Saman', "Banyu's reply → Saman"], resi: '—', side: 1, beat: 'pagi itu juga, ia mengirimkannya' },
    { label: ['Surat Maryam → Banyu', "Maryam's letter → Banyu"], resi: 'MRY 0012 ID', side: 2, beat: 'Ia melipat surat itu' },
    { label: ['Banyu → toko jahit', 'Banyu → the tailor shop'], resi: '—', side: 1, beat: '"Mari, Mas,"' }
  ];
  const CODA = [
    { speaker: 0, find: ['Besok datang lagi ya', 'Come again tomorrow'] },
    { speaker: 1, find: ['Besok aku datang lagi', "Tomorrow I'll come again"] }
  ];
  window.MinuteTrack = { SIDES, SUMMARY, CODA };
})();
