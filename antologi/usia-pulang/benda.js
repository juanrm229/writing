/* Usia Pulang: benda di dalam cerita. Pesan, surat, foto, dan kartu yang di naskah hanya diceritakan,
   ditampilkan sebagai benda di halaman. Setiap benda ditaruh sesudah paragraf yang memuat `at` di simpulnya.
   Isi yang tidak dikutip naskah ditulis dengan suara tokohnya; naskah di content/usia-pulang.json tidak berubah,
   dan semua ini hanya ada di versi interaktif. Foto tidak digambar: hanya bingkai, label, dan keterangannya.

   Jenis:
   msg    percakapan di ponsel: items [['in'|'out', teks] | ['in-photo'|'out-photo', keterangan] | ['voice', durasi, teks]]
   draft  pesan yang diketik ulang sebelum dikirim: tries (yang dihapus), final (yang dikirim)
   photo  satu foto: tags (label orang di dalamnya), cap, mods (ribbon | plastic | old | cut | screen)
   strip  beberapa foto berurutan: items [keterangan]
   card   kartu resmi; letter surat; forged surat tanpa tanggal; slip nota atau daftar; blank halaman kosong; envs amplop */
window.USIA_BENDA = {
  C01: [
    { at: 'rak rendah dengan foto keluarga', k: 'photo', mods: ['frame'], tags: ['Hadi', 'perempuan berambut pendek', 'Dian', 'pemuda', 'anak laki-laki'], cap: 'Di rak rendah, tempat lemari mesin jahit dulu berdiri.' }
  ],
  C02: [
    { at: 'Ratna mengirim pesan bahwa ia berada di pasar kain', k: 'msg', from: 'Ratna', items: [['in', 'Saya di pasar kain sampai siang. Kalau Laras mau ikut melihat, kabari saja. Tidak harus hari ini.']] },
    { at: 'Laras membaca nama lengkapnya pada kartu sementara', k: 'card', head: 'Teluk Rantau · Pendampingan Kepulangan', title: 'Kartu Identitas Sementara', rows: [['Nama', 'Laras'], ['Tahun lahir', '1966'], ['Kembali', 'Senin, 9 November 2026 · 18.40'], ['Masa sementara', '168 jam'], ['Alamat', '']] }
  ],
  C03: [
    { at: 'Map itu dibuka dengan persetujuan Laras', k: 'slip', title: 'Nota', lines: [['Sepatu anak', 'no. 31'], ['Harga', 'Rp 17.500']], foot: 'belum dibayar' },
    { at: 'Dian membaca alamat pada surat', k: 'letter', head: 'Program Pelatihan Pembuatan Pola', sub: 'Kota Hilir', title: 'Undangan wawancara', to: 'Kepada Saudari Laras', body: ['Dengan hormat,', 'Berdasarkan pendaftaran Saudari, kami mengundang Saudari mengikuti wawancara Program Pelatihan Pembuatan Pola selama enam bulan. Peserta bekerja di bengkel produksi dan memperoleh tempat tinggal sederhana selama pelatihan.', 'Mohon membawa contoh pola atau jahitan sendiri.'], meta: [['Hari, tanggal', 'Minggu, 9 November 1997'], ['Tempat', 'Kota Hilir']] }
  ],
  C04: [
    { at: 'Suri memperlihatkan pesan dari seorang wartawan bernama Rafi', k: 'msg', from: 'Rafi · wartawan', owner: 'Suri', items: [['in', 'Selamat pagi, Bu Suri. Saya Rafi, wartawan. Saya ingin meminta wawancara dengan Ibu Laras bila beliau bersedia, kapan pun beliau siap, atau tidak sama sekali bila itu pilihannya.']] }
  ],
  C05: [
    { at: 'Pada Jumat pagi, Rafi mengirim pertanyaan', k: 'msg', from: 'Rafi · melalui nomor perantara', items: [['in', 'Bu Laras, satu pertanyaan, dan Ibu tidak wajib menjawab. Apakah benar ada pesan yang Ibu tinggalkan sebelum 9 November 1997? Saya mendengar ada catatan yang selama bertahun-tahun membantu keluarga menerima kehidupan baru.']] },
    { at: 'Laras membuka amplop', k: 'forged', cap: 'Tanpa tanggal. Beberapa kalimat pendek.' }
  ],
  C07: [
    { at: 'Laras melihat gambar pada layar setelahnya', k: 'photo', mods: ['screen', 'cut'], tags: ['Laras'], cap: 'Di satu sudut, lengan Ratna terpotong. Tidak disebarkan sebelum ada izin baru.' },
    { at: 'Rafi mengirim pesan melalui nomor perantara', k: 'msg', from: 'Rafi · melalui nomor perantara', items: [['in', 'Saya masih menunggu keputusan Ibu tentang kutipan dan bentuk tulisannya. Tidak ada tenggat dari saya. Ibu juga boleh tidak menjawab.']], note: 'Disimpan' }
  ],
  H1B: [
    { at: 'Di dinding tergantung foto Laras dengan pita hitam', k: 'photo', mods: ['ribbon', 'old'], tags: ['Laras'], cap: 'Hari pembagian rapor Dian. Satu ujung kerah terlipat ke dalam.' }
  ],
  H1D: [
    { at: 'Suri menuliskannya, membacakan sekali, lalu mengirim pesan', k: 'msg', from: 'Dian', owner: 'Suri', items: [['out', 'Bu Dian, ini Suri. Malam ini Ibu Laras menginap di penginapan yang sudah saya siapkan. Beliau meminta saya menyampaikan kalimatnya sendiri: “Bilang saya belum tahu harus jadi siapa di rumah itu.” Besok pagi saya kabari lagi.']], note: 'Terkirim · belum dibaca' }
  ],
  H2A: [
    { at: 'satu lembar foto dari dalam map', k: 'photo', mods: ['old'], tags: ['Dian', 'Ratna'], cap: 'Dian, belasan tahun, berseragam. Ratna di sebelahnya.' }
  ],
  H2C: [
    { at: 'Ratna memeriksa telepon, lalu menjawab pesan dari Tama', k: 'msg', from: 'Tama', owner: 'Ratna', items: [['in-photo', 'Tama, di bengkel kampus'], ['in', 'Bagian kipasnya ketemu. Pulang agak malam, Bu.'], ['out', 'Hati-hati. Makan dulu.']] }
  ],
  H3D: [
    { at: 'Ada foto kecil Laras di dalamnya, dilapisi plastik', k: 'photo', mods: ['plastic', 'old'], tags: ['Laras'], cap: 'Di dompet Dian. Warnanya sudah berubah.' },
    { at: 'Ayah Banyu menanyakan ukuran sepatu', k: 'msg', from: 'Ayah Banyu', owner: 'Dian', items: [['in', 'Sepatu Banyu sudah sempit. Ukurannya sekarang berapa? Sabtu kubelikan.']] }
  ],
  H4A: [
    { at: 'Saat itulah Dian mengirim pesan melalui nomor bengkel', k: 'draft', from: 'Dian', items: [['in', 'Bu, bagaimana di bengkel?']], tries: ['Sudah bisa bekerja.'], final: 'Sedang mencoba. Ada yang harus diulang.' }
  ],
  H4B: [
    { at: 'Foto pertama adalah upacara kelulusan', k: 'strip', items: ['Kelulusan. Hadi dan Ratna di kanan kiri Dian.', 'Rumah dengan pintu yang dicat terlalu terang.', 'Banyu masih bayi.'] }
  ],
  H6D: [
    { at: 'Ia mencoba menulis pesan kepada Dian menggunakan telepon pinjaman', k: 'draft', from: 'Dian', note: 'telepon pinjaman', items: [], tries: ['sedang melihta', 'sedang melihat tempat sendri'], final: 'sedang melihat tempat sendiri, belum memilih, nanti akan memberi kabar' }
  ],
  H7A: [
    { at: 'satu foto Laras yang tidak dipakai di makam', k: 'photo', mods: ['old'], tags: ['Laras'], cap: 'Tidak dipakai di makam. Wajahnya jengkel.' }
  ],
  H7D: [
    { at: 'Suri menyerahkan satu halaman kosong', k: 'blank' }
  ],
  P01: [
    { at: 'Nenek mengirim pesan suara', k: 'msg', from: 'Nenek', owner: 'Dian', items: [['voice', '0.38', 'Di, ibumu biar di sini saja. Dia lebih nyaman di sini.']] },
    { at: 'Sebelum tidur, ia membalas satu pesan kerabat', k: 'msg', from: 'Kerabat', owner: 'Dian', items: [['in', 'Di, benar ibumu pulang? Kapan kumpul? Kami mau datang.'], ['out', 'Tidak, belum ada rencana kumpul besar. Tidak, jangan datang tanpa memberi kabar. Iya, aku senang. Aku juga masih bingung.']] }
  ],
  P02: [
    { at: 'Ratna menerima pesan Anin yang singkat', k: 'msg', from: 'Anin', owner: 'Ratna', items: [['in', 'Laras sudah sampai. Nanti kukabari kalau dia pulang.']] }
  ],
  P03: [
    { at: 'Dian mengirim pesan meminta Tama mengambil satu kotak', k: 'draft', from: 'Kak Dian', owner: 'Tama', items: [['in', 'Tam, bisa ambilkan kotak yang ketinggalan di rumah?']], tries: ['Bisa besok. Tadi ngobrol apa sama'], final: 'Bisa besok.' }
  ],
  P04: [
    { at: 'Dian mengirim foto jalan yang diperiksa', k: 'msg', from: 'Dian', owner: 'Sulastri', items: [['in-photo', 'Saluran yang diperiksa hari ini'], ['out', 'Ibumu tidak kepanasan?'], ['in', 'Sudah duduk dan minum, Nek.']] },
    { at: 'Ia menahan pesan itu, lalu menulis sesuatu yang lebih pendek', k: 'draft', from: 'Dian', owner: 'Sulastri', items: [], tries: ['Perempuan tidak perlu terlalu memaksa diri.'], final: 'nanti kabari kalau sudah di tempat istirahat' }
  ],
  P07: [
    { at: 'Ia mengirim pesan langsung kepada Laras', k: 'msg', from: 'Laras', owner: 'Hadi', items: [['out', 'Laras, aku ingin kamu hidup. Di kota mana pun. Aku tetap ingin kita punya hubungan, kalau kamu mau.']] }
  ],
  R02: [
    { at: 'Mereka menulis pesan bersama', k: 'draft', from: 'Keluarga', note: 'ditulis berdua', items: [], tries: ['Laras sekarang tinggal di sini.'], final: 'Laras tinggal di sini untuk sementara. Keputusan hidup dan alamatnya belum ada. Bantuan yang selama ini berjalan jangan dibatalkan dulu.' }
  ],
  R05: [
    { at: 'Ia mengirim kabar bahwa ada surat yang ingin dibuka bersama besok', k: 'msg', from: 'Dian', items: [['out', 'Di, ada surat yang ingin Ibu buka bersama besok.'], ['in', 'Aku harus khawatir?'], ['out', 'Ini tentang tujuan perjalanan 1997. Bukan soal tubuh Ibu, bukan ancaman baru.']] }
  ],
  R07: [
    { at: 'Hadi menerima permintaan foto dari kerabat', k: 'msg', from: 'Kerabat', owner: 'Hadi', items: [['in', 'Mas, boleh kirim foto Laras yang sekarang? Kami cuma mau yakin.']] }
  ],
  R09: [
    { at: 'lalu mengirim foto daftar sebelum tidur', k: 'slip', title: 'Daftar pesanan', lines: [['Kemeja kerja', '± 12'], ['Rok seragam', '± 20'], ['Permak dan obras', 'tiap minggu']], foot: 'perkiraan, belum dihitung bersama Ratna' }
  ],
  E02: [
    { at: 'mengirim foto jahitan kepada Dian', k: 'msg', from: 'Dian', items: [['out-photo', 'Saku, jahitan baru'], ['out', 'Sakunya akhirnya rata. Dibuka dua kali.']] }
  ],
  E06: [
    { at: 'Banyu mengirim gambar mobil bernama Kapal', k: 'msg', from: 'Banyu', items: [['in-photo', 'Gambar Banyu: mobil bernama Kapal'], ['out-photo', 'Potongan kain yang salah warna'], ['in', 'hahaha warnanya aneh']] },
    { at: 'Ia mengirim pesan pendek kepada Dian', k: 'msg', from: 'Dian', items: [['out', 'Sudah di kamar baru. Aman. Jendelanya menghadap pohon yang belum kutahu namanya.']] }
  ],
  E08: [
    { at: 'Laras menyiapkan beberapa surat yang berbeda', k: 'envs', items: ['Untuk Ibu', 'Untuk Ratna', 'Untuk Dian', 'Untuk Banyu'], extra: 'Anin: pesan suara' }
  ]
};
