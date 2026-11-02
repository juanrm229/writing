# juan/menulis

Meja tulis Juan dalam bentuk pemutar piringan hitam: setiap esai, puisi, cerpen, dan fiksi mini adalah satu piringan dua sisi yang bisa dibaca dan didengarkan. Dilengkapi **panel admin** di `/admin` untuk menulis, menerbitkan, dan mengatur seluruh tampilan, dengan GitHub sebagai tempat penyimpanan. Tidak perlu server.

## Cara kerja

```
Kamu menulis di /admin  ──Simpan──▶  commit ke content/*.json di repo ini  ──▶  GitHub Pages memperbarui situs (±1 menit)
```

- `content/works.json`: semua tulisan.
- `content/site.json`: nama, warna, huruf, jenis tulisan, fitur, dan pengaturan lain.
- `content/albums.json`: album, yaitu urutan sisi yang diputar berurutan.
- `content/media/`: foto profil yang diunggah dari admin.

Setiap simpanan adalah commit, jadi semua versi tulisanmu tercatat dan bisa dikembalikan.

## Menyiapkan (sekali saja)

1. **Aktifkan GitHub Pages.** Repo → Settings → Pages → *Deploy from a branch* → pilih branch utama repo dan folder `/ (root)`. Situs akan ada di `https://<pemilik>.github.io/<repo>/`.
2. **Pastikan branch utama berisi kode ini.** Admin menyimpan ke *default branch* repo (bisa diganti di layar masuk, bagian *Lanjutan*). Branch yang di-deploy Pages harus sama dengan branch tempat admin menyimpan.
3. **Buat token GitHub.** Buka <https://github.com/settings/personal-access-tokens/new>, pilih *Only select repositories* → repo ini, lalu beri izin **Contents: Read and write**.
4. **Masuk ke `/admin`.** Isi pemilik repo, nama repo, dan token. Token hanya disimpan di peramban itu dan hanya dikirim ke `api.github.com`.

## Panel admin

- **Tulisan.** Daftar tulisan di kiri (cari, saring, draf), kertas untuk menulis di tengah, detail di kanan: terbit/draf, jenis, prosa/puisi, tanggal, jam, alamat, ringkasan, baris favorit, dan hapus. Ada **tebal/miring** (`⌘B`/`⌘I`, ditulis sebagai `**tebal**` dan `*miring*`), tombol **Baris favorit** dari teks terpilih, **Fokus** untuk menulis tanpa gangguan, dan **Pratinjau** langsung di samping. Setiap perubahan dicadangkan di peramban sampai disimpan. `⌘S` untuk menyimpan.
- **Catatan sampul.** Di panel detail tulisan: tempat menulis, lagu yang diputar saat menulis (dan tautannya), serta cerita di balik tulisan.
- **Sisi A, B, C, dan seterusnya.** Di atas kertas ada deretan tab **Sisi A / Sisi B / …** dan tombol **+** untuk menambah sisi. Sisi A adalah tulisan utamanya; sisi lain adalah cerita yang sama dari sudut pandang lain. Tiap sisi punya judul sendiri (kosong = judul karya) dan kolom **dari sisi** untuk siapa yang bercerita. Kalau karyanya bersisi banyak, Sisi A juga bisa diberi **nama sisi** sendiri (misalnya karya *Terlambat Satu Menit* dengan Sisi A *Bidak*). Hapus sisi lewat tombol di catatan bawah judul; album dan sorotan profil ikut menyesuaikan. Tulisan bersisi banyak ditandai **A/B/C** di daftar.
- **Novel dan novella, per bab.** Pilih jenis *Novel* atau *Novella* dan isinya disimpan per bab: tab di atas kertas berubah menjadi nomor bab, **+** menambah bab, dan catatan di bawah judul punya tombol **← Geser / Geser →** untuk mengurutkan dan **Hapus bab ini**. Judul novel diisi di panel kanan, judul bab di atas kertas. Tulisan bersisi yang diubah menjadi novel menjadikan sisi-sisinya bab.
- **Pemisah adegan.** Tulis `***` di satu baris tersendiri untuk pindah adegan; di situs tampil sebagai ornamen ⁂ dan dilewati saat dibacakan.
- **Bahasa Inggris.** Sakelar **ID / EN** di sebelah tab sisi menyunting terjemahan Inggris dari sisi atau bab yang sedang dibuka, termasuk judul, *dari sisi*, ringkasan, baris favorit, dan cerita di balik tulisan. Titik hijau di tab menandai sisi yang sudah diterjemahkan. Yang belum diterjemahkan tetap tampil dalam bahasa Indonesia dengan catatan kecil untuk pembaca. Tulisan yang aslinya berbahasa Inggris diberi **Bahasa asli: Inggris** di panel kanan; sakelar ID/EN lalu menyunting terjemahan Indonesianya, dan pembaca berbahasa Indonesia melihat catatan bahwa tulisan itu belum diterjemahkan. Mengganti bahasa asli menukar isi dan terjemahannya tanpa ada yang hilang. Terjemahan profil ada di tab Profil (*Dalam bahasa Inggris*), judul dan deskripsi situs di tab Tampilan, beserta pilihan bahasa awal pembaca.
- **Profil.** Tagline, kota, bio, daftar *Sedang*, sorotan (sampai 8 sisi, A atau B), momen *Perjalanan* per tahun, kutipan favorit, dan tautan, dengan pratinjau `#tentang` desktop atau ponsel. Nama, foto, dan email diatur di tab Tampilan.
- **Album.** Susun sisi-sisi menjadi playlist: beri judul dan catatan sampul, tambahkan Sisi A atau Sisi B dari daftar di kanan, lalu urutkan dengan menyeret atau tombol panah. Sampulnya mosaik otomatis dari empat sisi pertama. Judul dan catatan sampul bisa diterjemahkan di bagian *Dalam bahasa Inggris*; pembaca berbahasa Inggris melihat terjemahannya, dan kalau kosong yang tampil versi aslinya. Kalau alamat tulisan diganti atau tulisannya dihapus, album ikut menyesuaikan. **Pratinjau** membuka album di situs sebelum disimpan.
- **Tampilan.** Judul situs, nama, sapaan untuk pembaca, email, foto profil, warna kartu sapa, latar dan tema bawaan, halaman pembuka (Piringan atau Sapa), huruf dan kertas bawaan, jenis tulisan (nama, label ikon, warna benang), serta fitur yang bisa dinyalakan atau dimatikan. Semua langsung terlihat di pratinjau desktop atau ponsel.
- **Riwayat.** 30 perubahan terakhir, masing-masing bisa dibuka di GitHub.

## Situs

- **Piringan (halaman awal).** Setiap tulisan adalah satu piringan hitam: esai berlabel warna, puisi berupa vinyl berwarna bercipratan, cerita berupa *picture disc* bergambar benang. Di atas ada jam dot-matrix dan nama situs dalam huruf titik-titik, lalu tumpukan piringan yang bisa digeser ke atas atau bawah, diacak, dan diketuk untuk dibaca. Di sebelahnya (di ponsel: di bawahnya) ada roda **Menit luang**: pilih punya berapa menit, dan tumpukan langsung tersusun ulang dengan tulisan yang paling pas di atas. Empat kontrol mengatur Bentuk (puisi/semua/prosa), Suasana, Ukuran huruf, dan Kertas, lalu **Putar** membuka tulisan dengan pengaturan itu. Halaman pembuka bisa diganti di admin.
- **Pilih piringan.** Ketuk piringan teratas (atau tombol kedua di pil navigasi) untuk membuka layar pemilih: bilah waktu di atas untuk menentukan mulai membaca dari menit ke berapa (tulisan yang pernah dibaca langsung menawarkan lanjut dari posisi terakhir, dan tiap sisi mengingat posisinya sendiri), piringan besar dua sisi, dan carousel piringan lain di lembar bawah. Piringan yang punya Sisi B diberi tanda **B**. Tombol headphone membuat tulisan **dibacakan** untukmu. **Yang ini!** membuka tulisan tepat di titik itu.
- **Mode baca: interaktif atau biasa.** Tulisan yang punya pengalaman interaktif (Anda di Sini, Interlude, Terlambat Satu Menit, Pabrik Mimpi, ketiga puisi, dan Thought Log) diberi badge **✦ Interaktif** di semua daftar, di baris *Cocok untuk … menit*, dan di keterangan pembaca. Di layar Pilih piringan, di samping *Catatan sampul*, ada saklar **Interaktif / Baca biasa**: pilihannya diingat untuk semua tulisan (`jm:mode`). Dalam mode biasa tulisan dibuka di pembaca situs seperti dulu (dengan ukuran huruf, kertas, suara, kutipan), dan di bawah judulnya ada kartu **Versi interaktif** untuk pindah ke pengalamannya. Dari dalam setiap pengalaman, dialog **Aa** punya tombol **Baca biasa** yang membuka tulisan yang sama (bab Interlude, sisi Terlambat, dan berkas arsip ikut terbawa) sebagai teks biasa; pilihan ini hanya berlaku untuk tulisan itu selama sesi berjalan.
- **Format naskah di pembaca.** Naskah boleh memakai Markdown sederhana dan pembaca biasa menampilkannya rapi: `## Judul bagian`, `### Judul catatan`, baris *miring* tepat di bawah judul sebagai keterangan waktu/tempat, daftar (`- ` atau `1. `), kutipan (`> `), tabel (`| a | b |`; di ponsel setiap baris jadi kartu kecil), dan `---` sebagai jeda adegan. Tanda kutip lurus ditampilkan sebagai kutip tipografis (“…”, ’), tanpa mengubah naskahnya.
- **Catatan margin.** Di admin, bagian *Catatan margin* (di bawah Catatan sampul) menempelkan catatan kecil pada paragraf tertentu dari sisi atau bab yang sedang disunting. Di pembaca, catatan itu tampil sebagai titik biru di margin; diketuk, catatannya terbuka di bawah paragraf itu (*Di margin · Juan*). Catatan disimpan di `works.json` sebagai `margins: [{ at, note }]`, dengan `at` berisi awal paragrafnya, jadi tetap menempel walau paragraf lain ditambah atau dihapus. Catatan untuk terjemahan ditulis saat menyunting terjemahannya.
- **Titipan.** Pilih satu kalimat di pembaca, lalu **Titipkan** (di samping *Kartu kutipan*). Tulis pesan pendek dan namamu (keduanya boleh kosong), lalu kirim tautannya. Penerima membuka tulisan itu di pembaca biasa, tepat di paragrafnya: kalimatnya disorot dan pesanmu ada di margin. Tidak ada server; isinya ikut di dalam tautan (`baca/<alamat>/#!…`), jadi tidak disimpan di mana pun.
- **Catatan sampul.** Tautan *Catatan sampul* di pemilih piringan, kartu *Di balik tulisan ini* di akhir tulisan, atau `⌘K` membuka sampul belakang piringan seperti gatefold yang membentang dari tengah: sampul depan dengan seni benang tulisannya, dan sampul belakang berisi daftar sisi (A dan B dengan durasi) serta kredit: kapan ditulis (hari, jam, dan waktunya), tempat, lagu yang diputar saat menulis beserta tautannya, cerita di balik tulisan, kata paling khas (kata yang hanya ada di tulisan itu), ritme kalimat, dan benang merahnya. Tempat, lagu, dan cerita diisi di panel detail tulisan di admin; sisanya disusun otomatis.
- **Profil penulis.** Tombol bergambar fotomu di pil navigasi (atau ketuk judul besar di halaman awal) membuka `#tentang`, disusun seperti halaman artis di aplikasi musik: fotomu menjadi label piringan hitam yang berputar pelan, nama dalam huruf titik-titik, kota, tagline, angka koleksi, tombol **Putar semua**, **Radio**, dan **Bagikan**, serta kalimat untuk pembaca tentang berapa lama ia sudah memutar tulisanmu. Di bawahnya: **Sorotan** (daftar bernomor), **Sedang** (menulis, membaca, mendengarkan), **Tentang** dengan potret benang yang dirajut dari huruf-huruf biomu, **Perjalanan** (momen penting ditenun dengan tulisan yang terbit tiap tahun), **Diskografi**, kutipan favorit, tautan dengan ikon yang menyesuaikan alamatnya, dan tanda tangan dari seni benang namamu. Semuanya diatur di tab **Profil** di admin; bagian yang kosong disusun otomatis dari tulisanmu.
- **Radio.** *Mulai radio dari tulisan ini* (kartu di akhir tulisan, `⌘K`, atau tombol Radio di profil) memutar tanpa henti tulisan yang paling dekat kata dan suasananya, dihitung dari kemiripan TF-IDF terhadap tulisan awal dan tulisan yang sedang diputar. Sisi B menyusul sisi A-nya, setiap perpindahan menyebut kata penghubungnya, dan setelah semua diputar radio mengulang. Membuka tulisan lain secara manual menghentikan radio.
- **Album.** Tombol ketiga di pil navigasi membuka rak album: sampul mosaik dari seni benang, dengan piringan yang mengintip dari sampulnya. Di halaman album ada catatan sampul, daftar sisi dengan durasi dan cincin progres, serta tombol **Putar**, **Acak**, dan **Bagikan** (`#album-<alamat>`). Saat album diputar, pembaca menampilkan posisi di album (misalnya 2/4), tombol berikutnya dan `→` mengikuti urutan album, dan kartu di akhir tulisan menunjuk sisi berikutnya. Sapa juga menampilkan album yang sedang diputar.
- **Antologi Titik Biru.** Album di `albums.json` dengan `"kind": "antologi"` tampil di rak Album sebagai antologi: sampulnya ikon aplikasi tanpa nama (persegi putih dengan satu titik biru), hitungannya per cerita, dan nama antologinya muncul di atas judul cerita di halaman pengalaman. Tambah cerita berikutnya lewat panel admin seperti menyusun album biasa.
- **Anda di Sini: mode peta.** Karya yang punya `experience` di `works.json` dibuka di halamannya sendiri. *Anda di Sini*, pembuka antologi, tinggal di `antologi/anda-di-sini/`: catatan-catatan si analis peta dibaca utuh dan berurutan, sementara peta Saujana di belakangnya mengikuti posisi baca. Setiap kalimat penting punya "ketukan" di `peta.js` (daftar `BEATS`) yang mengubah peta: lingkaran 1,4 km yang petaknya menjadi abu-abu satu per satu, rute tanpa nama ke jalan buntu, gang yang 62 meter lebih panjang dari petanya, garis kapur yang dilewati, peta yang diperkecil sampai Bumi menjadi titik dan lingkaran akurasi lenyap, layar yang menghitam, dan stiker merah di terminal. Sesudah prolog, aplikasinya bertanya *Dari mana?*; jawaban pembaca hanya disimpan di perangkatnya dan muncul lagi di kalimat terakhir. Bilah status menunjukkan jam catatan dan baterai yang pelan-pelan habis. Bisa dibacakan, ukuran huruf mengikuti pengaturan baca, dan semua gerak berhenti kalau pembaca memilih mengurangi animasi. Catatan-catatannya tampil seperti aplikasi Catatan di ponselnya: bilah status (jam, sinyal, baterai), bilah aplikasi dengan judul catatan yang sedang dibuka, daftar folder di awal setiap bagian (ketuk untuk melompat), jumlah kata di kaki setiap catatan, dan kursor yang masih berkedip di dua catatan yang ditulis di dermaga. Notifikasi muncul saat kalimatnya terbaca: izin WhatsApp, lokasi yang dipakai aplikasi tanpa nama, panggilan dan pesan Wulan saat ia terlambat bangun, pengingat 9 Agustus, sinyal GPS lemah, baterai menipis, alarm yang terlewat, aplikasi yang dihapus, dan di akhir satu notifikasi untuk pembaca sendiri: *Dari mana?* (daftar `NOTIFS` di `peta.js`). Setiap jeda bagian punya satu alat kecil (`IL` di `peta.js`, dipilih dari judul bagiannya): *Hipotesis*, lingkaran 68% yang petaknya bisa diperiksa satu per satu; *Variabel*, pertanyaan "semalam kamu tidur berapa lama?" yang jawabannya masuk sebagai satu baris di tabel Catatan 6; *Tiba*, titik biru yang tidak mau ditarik keluar dari garis kapur sampai Catatan 7 menuntunnya; *Kabar*, layar utama ponselnya dengan ikon tanpa nama di halaman ketiga yang hilang sesudah Catatan 11. Semuanya boleh dilewati dengan terus menggulir. Naskahnya tetap disunting dari admin seperti tulisan lain (`##` bagian, `###` catatan, `---` jeda, tabel, daftar, `~~coret~~`); kalau kalimat yang dijadikan ketukan diubah, perbarui juga ketukannya.
- **Saringan.** Tombol corong di sebelah *Acak* (juga di Sapa → Koleksi dan perintah *Saring koleksi* di `⌘K`) membuka satu saringan untuk seluruh meja: **jenis** karya, panjang **sekali duduk** (rata-rata satu sisi atau satu bab), **bagimu** (belum diputar, di tengah jalan, selesai), **bentuk** (bersisi banyak, berbab, satu sisi, dua bahasa), dan **benang**: kata-kata khas yang menghubungkan tulisan. Dalam satu kelompok pilihannya *atau*, antarkelompok *dan*. Setiap pilihan menunjukkan berapa piringan yang tersisa kalau ia ikut dipilih, pilihan yang tak dimiliki satu karya pun disembunyikan, dan kalau hasilnya kosong saringan menawarkan satu pilihan yang paling layak dilepas. Hasilnya langsung berlaku di tumpukan piringan, carousel pemilih, dan koleksi, diingat di perangkat, dan bisa diputar berurutan lewat *Putar hasilnya*.
- **Dua bahasa.** Tombol **ID/EN** di pojok kanan atas mengganti seluruh antarmuka dan isi tulisan ke bahasa Inggris (atau kembali). Pilihan itu diingat; tautan dengan `?lang=en` selalu membuka versi Inggris. Teks antarmuka berbahasa Inggris ada di `assets/i18n.js`.
- **Novel dan novella.** Karya berbab tampil sebagai satu piringan dengan nomor bab di bawahnya. Saat membaca, deretan bab ada di bawah judul, kartu di akhir bab membuka bab berikutnya, dan putar terus melanjutkan bab demi bab. Tautan langsung ke bab: `#baca-<alamat>~2`.
- **Sisi B, C, dan seterusnya.** Setiap tulisan bisa punya sisi sebanyak yang diperlukan: cerita yang sama, dari sisi yang lain. Usap piringan, ketuk tab sisinya, atau tekan `B` untuk membalik ke sisi berikutnya (A → B → C → A). Lengan pemutar terangkat saat piringan dibalik dan turun ke alur luar saat kamu menekan *Yang ini!*. Saat membaca, tombol **Sisi A/Sisi B** di atas dan kartu **Balik piringannya** di akhir tulisan membalik kartu baca seperti piringan. Sisi yang belum ditulis tampil sebagai piringan polos tanpa alur. Tautan langsung ke sebuah sisi: `#baca-<alamat>:b`, `#baca-<alamat>:c`, atau `#pilih-<alamat>:b`.
- **Satu tema.** Terang dan gelap memakai token warna yang sama di seluruh halaman: piringan, pemilih, pembaca, dan sapa. Tombol bulan/matahari di pojok kanan atas mengganti tema. Kertas baca ikut gelap di mode gelap sampai pembaca memilih kertasnya sendiri. Di ponsel, bilah atas hanya satu baris tipis.
- **Benang merah.** Di akhir setiap tulisan ada daftar tulisan yang berbagi kata khas (dihitung dengan TF-IDF langsung di peramban), lengkap dengan kata penghubungnya.
- **Membaca = merajut.** Di pojok kartu baca, seni benang tulisan itu terajut sedikit demi sedikit sesuai seberapa jauh kamu membaca.
- **Saksikan ditulis.** Tulisan diketik ulang di depan pembaca dengan ritme alami (jeda di tanda baca, sesekali salah ketik yang dihapus lalu diperbaiki). Bisa dijeda, dipercepat 2× atau 4×, atau dilewati.
- **Kartu kutipan.** Pilih kalimat mana pun untuk membuat gambar kutipan (empat warna) lalu bagikan langsung ke aplikasi lain di ponsel, unduh, atau salin. Tombol bagikan di atas pembaca mengirim tautan tulisan.
- **Suasana.** Pengaturan Lanjutan → Suasana: hujan, ombak, atau perapian, disintesis dengan Web Audio tanpa berkas suara.
- **Hidup mengikuti jam.** Sapaan berganti (pagi, siang, sore, malam) dan wallpaper *Ikut jam* berubah dari fajar ke malam.
- **Palet perintah.** `⌘K` lalu ketik `>` untuk menjalankan perintah: balik sisi, mode gelap, tulisan acak, pilih piringan, ganti latar, pasang aplikasi. Pencarian juga menemukan kalimat dari Sisi B.
- **Pembaca.** Tema kertas, Suara, Cari, Fokus, ukuran, kecerahan, Tandai, Layar menyala, serta Pengaturan Lanjutan (huruf, ketebalan, ligatur, perataan).
- **Sapa.** Panel yang mengingat perjalanan bacamu, semuanya hanya di perangkat ini:
  - **Diputar**: piringan yang terakhir kamu putar, sampai mana, berapa lama lagi, tombol *Lanjutkan* dan *Balik ke Sisi B*. Di bawahnya ada **Berikutnya untukmu**, dipilih dengan alasan yang tertulis: sisi lain dari yang baru kamu baca, Sisi B yang belum kamu balik, tulisan yang terhubung lewat benang merah, atau yang pas dengan menit luangmu. Ada juga angka menit diputar, sisi selesai, piringan dibalik, dan hari beruntun.
  - **Koleksi**: semua piringan dengan dua cincin progres, A dan B. Saring: belum diputar, dua sisi, selesai.
  - **Kutipan**: kalimat bergilir dari kedua sisi. **Baca dari kalimat ini** membuka tulisan tepat di paragraf itu dan menyorotnya.
  - **Cari kalimat**: setiap hasil (juga di palet `⌘K`) membuka tulisan di paragraf yang cocok dengan katanya disorot.
  - Kartu biru menyapa dengan keadaanmu (berapa sisi belum diputar, tulisan yang masih di tengah), tombol grafik menampilkan jejak dengarmu, dan tombol acak memutar sisi yang belum kamu dengar. Kartunya menciut sendiri saat isi panel digulir.
- **Antrean.** Tombol daftar-plus di pemilih piringan menambahkan sisi yang sedang menghadap ke atas ke antreanmu (tekan lagi untuk mengeluarkannya). Di halaman album ada tombol untuk menambahkan semua sisinya, dan `⌘K` punya perintah *Tambah ke antrean*. Antrean diputar lebih dulu, lalu album yang sedang diputar dilanjutkan dari posisinya. Di Sapa → Diputar ada bagian **Antreanmu**: putar dari sisi mana pun, naikkan urutan, keluarkan, atau kosongkan (bisa diurungkan). Angka di tombol Sapa menunjukkan jumlah sisi yang menunggu. Antrean hanya tersimpan di perangkat pembaca.
- **Racikan harian.** Setiap hari ada satu racikan otomatis di bagian atas rak Album dan di Sapa → Diputar (juga perintah *Putar racikan hari ini* di `⌘K`). Racikan dimulai dari satu tulisan yang dipilih berdasarkan tanggal, lalu berjalan mengikuti benang merah ke tulisan yang berbagi kata khas; kalau tulisan itu punya Sisi B, sisinya menyusul tepat setelah Sisi A. Namanya diambil dari kata-kata penghubungnya (misalnya *Racikan Jumat · tentang hujan dan jendela*), dan setiap sisi menulis lewat kata apa ia tersambung. Tanggalnya mengikuti WIB, jadi semua pembaca mendapat racikan yang sama hari itu dan tautan `#album-harian-<tanggal>` bisa dibagikan. Racikan berganti tengah malam WIB.
- **Racikan.** Antreanmu bisa dibagikan sebagai racikan: di Sapa → Antreanmu tekan **Bagikan sebagai racikan** (atau lewat `⌘K`), beri nama dan namamu, lalu bagikan atau salin tautannya. Isi racikan ada di tautan itu sendiri (`#racikan?s=kopi-kedua,kopi-kedua:b,jendela&t=Untuk%20Malam&n=Rani`), jadi tidak butuh server atau akun. Yang membuka tautan melihat halaman seperti album: sampul mosaik, "Racikan dari Rani", tombol Putar, Acak, Tambah ke antrean, dan Bagikan lagi. Racikan yang kamu buat maupun yang kamu terima tersimpan di rak Album bagian **Racikan** dan bisa dihapus dari rak.
- **Mode lirik.** Tombol **Lirik** di bilah dengar (atau `L`, atau `⌘K`) membuka layar penuh berwarna jenis tulisan dengan seni benangnya berputar pelan di latar. Tulisan dibacakan kalimat demi kalimat (baris demi baris untuk puisi): kalimat yang sedang dibaca menyala besar, yang sudah lewat meredup, dan layar menggulir sendiri. Kalau peramban mengirim posisi kata, kalimat aktif terisi bertahap seperti karaoke. Ketuk kalimat mana pun untuk mulai dari situ; menggulir sendiri menahan guliran otomatis dan memunculkan *Kembali ke baris*. Di akhir sisi lirik menampilkan sisi berikutnya, dan sisi itu terbuka tanpa menutup lirik. `Spasi` menjeda, `Esc` atau geser turun menutup.
- **Pengatur waktu tidur.** Tombol bulan di bilah dengar dan di mode lirik (juga `⌘K`): berhenti setelah 15, 30, 45, atau 60 menit, di akhir sisi ini, atau di akhir album/racikan yang sedang diputar. Tombolnya menampilkan sisa waktu. Di menit terakhir suara pembaca memelan dan sedikit melambat, dan suasana bacaan ikut meredup. Saat waktunya habis, kalimat yang sedang dibaca diselesaikan dulu, lalu pembacaan dijeda: muncul layar **Selamat tidur** dengan tombol *Lanjutkan dari sini*, kartu "Berikutnya" tidak menyambung, dan layar boleh redup lagi.
- **Layar kunci.** Saat tulisan dibacakan, HP menampilkan kartu "sedang diputar" di layar kunci dan pusat notifikasi: judul, nama penulis dan sisinya, album atau racikan yang sedang diputar, serta sampul berupa piringan dengan seni benang tulisan itu. Tombolnya: putar/jeda (melanjutkan dari kalimat yang sama), berikutnya (sisi berikutnya: antrean, album, atau sisi lain), sebelumnya (ulang dari awal, atau sisi sebelumnya), dan maju/mundur per paragraf. Di dalam pembaca muncul **bilah dengar** dengan tombol yang sama. Karena layar kunci hanya menampilkan kontrol untuk media sungguhan, situs memutar audio yang nyaris senyap selama dibacakan. Apakah suara tetap berjalan saat layar terkunci bergantung pada peramban dan sistem HP.
- **Putar terus.** Saat satu sisi selesai (dibaca sampai akhir, atau selesai dibacakan), kartu **Berikutnya** muncul dengan cincin hitung mundur: 10 detik saat membaca, 5 detik saat dibacakan. Urutannya: antreanmu dulu, lalu sisi berikutnya di album yang sedang diputar; kalau tidak sedang memutar album, sisi lain dari piringan yang sama (kartu baca ikut berbalik); kalau tidak ada, tulisan yang terhubung lewat benang merah atau yang pas dengan menit luangmu. Mode dibacakan bersambung seperti radio. Hitung mundur berhenti saat kartu disentuh kursor, **Batal** atau `Esc` menutupnya, dan sakelar *Putar terus* (juga di palet `⌘K`) mematikannya. Di akhir album muncul **Putar lagi** dan **Ke album**.

Pintasan: `⌘K` atau `/` cari, `←` `→` pindah tulisan, `B` balik sisi, `F` fokus, `Esc` kembali.

## Domain, bagikan, dan mesin pencari

- **Domain**: situs ini tayang di `https://quietmargins.site` (file `CNAME`, DNS di Hostinger ke GitHub Pages). Alamat lama `juanrm229.github.io/writing` diteruskan otomatis. *Alamat situs* di admin (Tampilan) dipakai untuk semua tautan resmi.
- **Halaman bagikan**: setiap tulisan punya halaman kecil di `/baca/<alamat>/` (misalnya `quietmargins.site/baca/pabrik-mimpi/`) berisi judul, kutipan, dan gambar kartu untuk pratinjau tautan di WhatsApp, Telegram, X, Facebook, dan mesin pencari; halaman itu langsung meneruskan pembaca ke tulisannya (`#:b` untuk Sisi B, `#~2` untuk bab 2). Tombol bagikan di pembaca dan kartu kutipan memakai tautan ini. Kalau halamannya belum ada, `404.html` tetap meneruskan `/baca/<alamat>/` ke tulisannya.
- **Gambar kartu** (`assets/og/`): 1200×630, murni tipografi dengan huruf situs: `cover.png` untuk situs, dan satu per tulisan dengan jenis, judul, kutipan, dan garis warna jenisnya.
- **Diperbarui otomatis**: setiap kali tulisan atau tampilan disimpan di admin, halaman bagikan dan `sitemap.xml` ikut diperbarui dalam satu commit (tulisan yang dihapus atau dijadikan draf halamannya ikut dihapus). Gambar kartu untuk tulisan baru dibuat dengan `node tools/bagikan.js` (perlu Playwright); sampai saat itu tulisan baru memakai `cover.png`. `node tools/bagikan.js --tanpa-gambar` hanya membuat ulang halaman dan sitemap. Templatnya ada di `assets/bagikan.js`, dipakai bersama oleh admin dan skrip.
- **Metadata**: setiap halaman punya `canonical`, Open Graph, kartu X (`summary_large_image`), dan data terstruktur (WebSite, Person, CreativeWork). `robots.txt` menunjuk ke sitemap dan menutup `/admin/`.

## Musik latar

Di admin (Tampilan → *Musik latar*) unggah satu lagu (MP3 atau M4A, maksimal 15 MB) dan beri judulnya, lalu Simpan. Lagunya disimpan di `content/media/` dan diputar berulang dengan volume pelan di situs utama. Karena peramban tidak mengizinkan suara sebelum pembaca menyentuh halaman, musik mulai pada sentuhan pertama. Tombol ♪ di bilah atas mematikan atau menyalakannya, dan pilihan pembaca diingat. Saat tulisan dibacakan atau *Suasana* dinyalakan, musiknya mengecil sendiri. *Hapus* mematikan musik untuk semua pembaca. Pastikan kamu punya hak memakai lagunya.

## Kalau situs tidak berubah setelah merge

Setiap merge ke `main` memicu GitHub Pages memasang ulang situs (tab **Actions** → *pages build and deployment*), biasanya satu sampai dua menit.

- **Pemasangan gagal dengan pesan "in progress deployment".** Pemasangan sebelumnya masih tercatat berjalan, jadi yang baru ditolak; isinya tidak bermasalah. Buka run yang gagal lalu pilih **Re-run all jobs**. Kalau run ulang itu macet di antrean, satu perubahan kecil berikutnya di `main` akan memicu pemasangan baru yang membawa semua perubahan sebelumnya.
- **Pemasangan berhasil tapi ponsel masih menampilkan yang lama.** Service worker (`sw.js`) menyimpan salinan situs untuk dibaca tanpa sinyal. Versi baru diambil saat situs dibuka lagi; tutup tab atau aplikasinya lalu buka kembali. Setiap perubahan kode menaikkan `VERSION` di `sw.js` supaya salinan lama diganti.

## Aplikasi (PWA)

Situs ini bisa dipasang di layar utama ponsel atau komputer dan dibaca tanpa sinyal.

- **Android dan Chrome/Edge di komputer:** chip **Pasang aplikasi** muncul di panel sapa, juga sebagai perintah di palet.
- **iPhone dan iPad:** buka di Safari, ketuk **Bagikan**, lalu **Tambahkan ke Layar Utama**. Chip *Pasang aplikasi* menampilkan petunjuk ini.
- **Offline:** `sw.js` menyimpan salinan halaman, kode, dan konten. Saat ada sinyal, tulisan terbaru selalu diambil dari jaringan. Saat tidak ada, salinan terakhir yang dipakai.
- **Nama aplikasi** mengikuti *Judul situs* di admin (sekarang **Quiet Margins**), baik nama lengkap maupun nama di bawah ikon. `manifest.webmanifest` diperbarui otomatis saat kamu menyimpan.
- **Ikon**: selembar halaman gelap sendirian di langit malam situs. Ada garis margin biru tipis, tiga baris tulisan yang memudar lalu berhenti, dan satu cahaya kecil yang tertinggal di margin. Semua ukuran di `assets/icons/` (512, 192, 180 untuk iPhone, maskable untuk Android, favicon 64) dibuat ulang dengan `node tools/ikon.js`; ubah warna atau bentuknya di skrip itu.

## Menjalankan di komputer

```bash
python3 -m http.server 8000
```

Lalu buka <http://localhost:8000>. Konten dimuat dengan `fetch`, jadi membuka `index.html` langsung dari berkas tidak akan bekerja.

### Interlude (antologi/interlude/)

Pembuka antologi Temusai (album `temusai`, sampul layar gelap dengan dua titik, Arka dan Nara), dibaca seperti percakapan di aplikasi chat yang gelap dan minimal. Teksnya tetap dari `content/works.json` (bab ID, terjemahan di `en`) dan tidak diubah:

- **Gelembung**: kalimat dalam tanda petik menjadi pesan. Pesan dari tokoh yang bercerita di kanan, lawan bicaranya di kiri. Penuturnya ditebak dari keterangan di luar petik (nama, "kataku", "katanya"), lalu dari narasi tepat sebelumnya, kalau tidak jelas bergantian.
- **Keterangan**: narasi tampil sebagai teks miring di antara pesan.
- **Lokasi**: setiap perpindahan tempat muncul sebagai pesan sistem, dan kepala layar menunjukkan siapa yang bercerita serta di mana. Daftar lokasi dan lawan bicara ada di `B` (bab, indeks paragraf) dalam `interlude.js`; struktur paragraf ID dan EN sama.
- **Buku tulis Arka**: bab 7 dan 10 tampil sebagai halaman catatan.
- **Sembilan puluh dan sepuluh**: bilah 90/10 di bab 6 bisa dibalik.
- **Daftar percakapan**: di sampul, setiap bab tampil sebagai utas chat (pencerita, judul, cuplikan, lokasi) dengan titik belum dibaca (`jm:il:seen`). Ketuk kepala layar untuk kembali ke daftar.
- **Pesan ponsel**: pesan yang memang ada di cerita (paragraf huruf kecil, atau "mengetik/membalas/menjawab: …") tampil sebagai pesan ponsel, lengkap dengan "Terkirim".
- **Sedang mengetik**: gelembung tiga titik berdenyut muncul saat pesan lawan bicara sedang datang, disertai indikator tiga titik di kepala percakapan. Ruang pesan tetap dicadangkan selama jeda, sehingga kemunculan teks tidak menggeser halaman. Indikator dibersihkan setelah pesan muncul, saat berpindah bab, atau ketika membuka panel lain. Mode tenang dan pengaturan kurangi animasi menampilkan teks langsung.
- **Yang tidak terkirim**: di bab 4, 8, dan 10 kotak ketik muncul sendiri: tiga baris samar lalu dua dihapus, "tidak apa-apa, besok saja" diketik lalu dihapus, dan percakapan yang dibuka lalu ditutup tanpa mengetik (`DEL` di `interlude.js`).
- **Status**: lawan bicara "terakhir dilihat di kota lain" sejak bandara, "di kota yang sama" saat Nara pulang, dan **online** saat mereka bertemu lagi (`ST`).
- **Kamu sebagai Nara**: bab 7 dan 10 (buku tulis Arka) masuk sebagai pesan dari Arka untukmu; ucapan Nara di kanan.
- **Getar**: pesan ponsel yang masuk menggetarkan HP (bisa dimatikan, `jm:il:buzz`).
- **Catatan Sinta**: bab Sinta dibuka dengan gembok yang tidak menutup rapat.
- **Foto**: delapan foto realistis buatan AI di `antologi/interlude/photos/` menggambarkan nota, meja, kabar diterima, buku, roti di bandara, serta kamar, jalan, dan pasar. Foto tampil sebagai lampiran yang mula-mula kabur lalu jelas, seperti dipulihkan (`PHOTO`). Ketuk untuk memperbesar; kiriman kamar/jalan/pasar berisi tiga foto yang bisa dipindah dengan tombol atau panah keyboard. Deskripsi foto tersedia dalam ID/EN. Berkas WebP dimuat sesuai kebutuhan, dan ruangnya dicadangkan agar teks tidak bergeser.
- **Panggilan & hari**: panggilan masuk/keluar/berakhir dan pemisah hari ("September", "Bulan kesembilan", "Kamis") (`CALL`, `DAY`).
- **Berdua**: di kalimat terakhir, kepala layar menjadi "Arka & Nara · online · membaca menu yang sama".
- **Mulai dan lanjutkan**: sampul menampilkan durasi baca, tombol mulai, dan tombol lanjut yang tetap tersedia. Posisi disimpan per paragraf, termasuk letak di dalam paragraf, sehingga mengganti ukuran huruf atau melanjutkan di layar berbeda tetap menuju bagian yang sama. Membuka sampul tidak menimpa posisi sebelumnya. Penanda persentase lama tetap bisa digunakan untuk melanjutkan.
- **Navigasi bab**: ketuk kepala percakapan atau tombol **Bab** di bilah bawah untuk membuka daftar bab; daftar bisa ditutup dengan `Esc`. Bab aktif ditandai, bab yang sudah dibuka diingat satu per satu, dan tombol **← / →** berpindah bab. Tautan `#bab-7` membuka bab ketujuh; `#p-6-44` membuka paragraf ke-45 di bab ketujuh (indeks paragraf dimulai dari nol). Tautan situs utama seperti `#baca-interlude~7` ikut meneruskan nomor bab ke mode Interlude.
- **Baca tenang**: tombol ini mematikan animasi, jeda mengetik, dan getaran. Pilihannya diingat; pengaturan *kurangi animasi* perangkat juga dihormati. Efek yang masih berjalan dihentikan saat berpindah bab atau meninggalkan tab. Indikator mengetik tidak mengubah tinggi pesan.
- **Suasana membaca**: ikon headphone membuka suara ruang dan **Ruang baca**. Suara selalu dimulai dari pilihan pembaca; yang diingat hanya volumenya. Lapisan dengung dan derau stereo sintetis dalam `ambience.js` berubah perlahan mengikuti lokasi adegan (ruang, kedai, luar ruangan, kamar malam, terminal, kolam, atau kendaraan), tanpa musik, percakapan tambahan, atau unduhan audio. Suara dijeda saat tab tidak aktif dan sumber audio dilepas ketika halaman ditinggalkan. Jika suara tidak tersedia, seluruh naskah tetap bisa dibaca.
- **Ruang baca dan jeda**: mode ini menyembunyikan bilah alat bawah serta angka progres; daftar bab, arsip, dan pengaturan tetap dapat diakses dari kepala layar. Cahaya latar yang sangat tipis mengikuti suara Arka, Nara, atau Sinta. Setiap akhir bab menyediakan jeda dan tautan ke percakapan berikutnya, sehingga navigasi tetap tersedia saat mode fokus aktif. Pilihan fokus disimpan di perangkat; pengaturan kurangi animasi meniadakan transisi cahaya.
- **Arsip — Yang tertinggal**: ikon arsip di kepala layar mengumpulkan draf yang dihapus, foto yang disebut dalam cerita, dan petikan buku Arka serta catatan Sinta. Fragmen baru terbuka ketika ujung paragraf terkait terlihat saat membaca bab itu; melompati bab tidak membuka fragmen yang terlewati. Arsip menyimpan identitas fragmen di perangkat, mengambil isi dari naskah dalam bahasa yang dipilih, dan menyediakan **Kembali ke adegan**. Membuka atau menutup arsip tetap menjaga posisi baca. Kata-kata yang tidak diketahui dari draf terhapus tetap digambarkan sebagai baris samar. Foto dalam arsip memakai aset yang sama dengan kiriman di cerita dan bisa diperbesar.
- **Dua Ingatan**: setelah mencapai akhir cerita, tombol ini tersedia di sampul, penutup, dan arsip. Empat pasangan petikan Arka–Nara dipilih secara editorial: memberi ruang, rasa takut menjelang keberangkatan, hidup sesudah berpisah, dan pertemuan kembali di meja dekat rak. Petikan asli dalam bahasa yang sedang dipilih tampil berdampingan di desktop atau berurutan di ponsel. Tiap sisi memiliki tautan kembali ke adegannya. Membaca dan menutup panel tidak mengubah penanda posisi; ketersediaannya mengikuti status tamat yang tersimpan di perangkat. Pemetaan `MEMORIES` dalam `interlude.js` memakai indeks bab dan rentang paragraf (batas akhir tidak termasuk), dan perlu ikut disesuaikan bila paragraf naskah dipindah.

Pemeriksaan browser untuk Interlude memakai Python Playwright dan Chromium di `/usr/bin/chromium` (tersedia di lingkungan cloud):

```bash
python3 tests/interlude_smoke.py
```

Pemeriksaan menjalankan server sementara sendiri, memakai profil browser terpisah, dan mencakup bahasa Inggris, tautan bab, navigasi keyboard dialog, pemulihan posisi baca, ukuran huruf, pembatalan efek, mode tenang, serta tata letak ponsel dan desktop. Arsip diperiksa untuk pembukaan fragmen sesuai adegan, pencegahan bocoran dari bab yang dilompati, penyimpanan lintas kunjungan dan bahasa, serta tautan kembali ke adegan. Foto diperiksa untuk pemuatan aset dan navigasi kiriman. Pemeriksaan suasana mengukur keluaran Web Audio, memastikan tidak ada pemutaran otomatis, menguji jeda tab dan pelepasan sumber, serta memeriksa mode fokus, kegagalan modul suara, dan pemuatan offline melalui service worker. Dua Ingatan diperiksa untuk penguncian sebelum tamat, petikan asli, bahasa, posisi baca, dan tata letak kedua sisi; indikator mengetik diperiksa untuk animasi, pembersihan, dan kestabilan tinggi halaman. Penerbitan dan autentikasi GitHub tidak dijalankan.

### Giliran (antologi/giliran/)

Cerpen kedua di antologi **Temusai** (*Your Turn* dalam bahasa Inggris). Bima bekerja di Sela, layanan tempat orang berlatih mengatakan sesuatu yang sulit, dan memerankan lawan bicara mereka. Lalu kliennya berlatih meninggalkan dia. Seluruh teks dimuat utuh dari `content/works.json`; yang ditambahkan hanya antarmukanya.

- **Diucapkan atau diketik.** Ucapan di rumah menjadi balon kata (Mira di kiri, Bima di kanan), dengan keterangan seperti *tanya Bima* kecil di bawahnya. Yang diketik tinggal di aplikasinya:
  - **Sela** punya dua tab: *Latihan* (Bima memerankan seseorang) dan *Pendamping* (latihannya dibicarakan). Ada juga kartu pesanan dengan kolom yang tidak pernah selesai dimuat, catatan pelatihan Ratih, pemberitahuan klien menunggu, pedoman kerja, formulir pengalihan, tab pencarian yang dibuka lalu ditutup, dan penilaian lima bintang.
  - **Pesan** di ponsel (Mira, Ibu): pesan yang tidak dikutip di naskah tampil sebagai baris samar.
  - **Telepon** dengan teks langsung (Ratih, Mira, Ibu), dan satu **surel** dari kantor.
- **Kenangan** masa kecil Bima tampil di kertas yang lebih hangat, dengan balon *Bima, 9 tahun*.
- **Yang tidak jadi diucapkan.** Setiap kali Bima hampir mengatakan sesuatu lalu menahannya, muncul balon kosong bergaris putus-putus yang memudar.
- **Kaca menjadi Mira.** Setelah cerita tentang tanaman, pesan Kaca di Sela berganti warna menjadi warna balon Mira. Sejak sesi kelima, label *PEMERAN* pada pesan Bima dicoret.
- **Giliranmu.** Di sesi keempat cerita berhenti di layar Sela: pembaca harus menekan **Kirim** atau **Jeda sesi** (yang membuka formulir pengalihan). Pilihan itu diingat (`jm:giliran:choice`), dan muncul lagi di telepon Ratih: *Kamu juga menekan kirim* atau *Kamu menekan jeda. Bima tidak.*
- **Akses ditutup.** Saat Ratih menutup akses Bima, semua jendela kasus Kaca sebelumnya tersegel dan kabur; ketuk untuk tetap membaca.
- **Akhir.** Balon Bima tersandung dan tidak pernah selesai. Tombol *Buka jendela pendamping* tidak bisa ditekan. Penanda giliran di bawah layar berubah menjadi **Giliranmu**, dengan kotak untuk menulis kalimat pertama: tanpa tombol kirim, dan tidak disimpan.
- **Dua ruang (layar lebar).** Rumah di kiri: narasi dan balon kata. Layar Bima di kanan: laptop untuk Sela dan surel, ponsel untuk pesan dan telepon. Layar itu diam di tempat dan menampilkan seluruh percakapan sesi yang sedang terbaca. Di alur cerita, jendela aplikasi menjadi selip kecil ber-panah. Sejak Bima mengenali Kaca, ucapan Mira di rumah sekilas terpantul di layar. Saat "Tidak ada jendela pendamping yang bisa dibuka", layarnya tertutup dan tinggal satu ruang. Di ponsel semuanya tetap di dalam alur.
- **Langit mengikuti jam cerita**, dengan palet langit situs (`data-backdrop`): senja saat pesanan masuk pukul 16.12, malam di rumah, fajar di pagi formulir pengalihan, siang saat foto sabun, kabut di kenangan dan hari Sabtu, senja di Minggu sore. Dalam tema gelap langitnya tetap malam.
- **Mengetik yang ragu.** Pesan Bima di Sela muncul dulu di kotak tulis: diketik, sebagian dihapus, diketik lagi, baru terkirim (teks akhirnya tetap persis naskah). Kaca kadang berhenti mengetik lalu mulai lagi. Setelah pembaca menekan Kirim di sesi keempat, tombolnya tertahan beberapa detik.
- **Diam yang sungguhan.** Di "Kita bisa diam dulu.", layar meredup dan sebuah penghitung berjalan selama pembaca ikut diam. Saat pembaca bergerak lagi, tertinggal satu baris: *kalian diam 0.42*.
- **Yang dilengkapi.** Pesan yang di naskah hanya diceritakan ditulis dengan suara tokohnya (kabar pulang telat, sabun cuci, foto obat Ibu, pesan Minggu sore, surel kantor, kalimat yang diketik lalu dihapus di formulir), dan balon putus-putus berisi kalimat yang hampir diucapkan Bima. Semua tambahan ini hanya di pengalaman interaktif; naskah di `works.json` dan mode baca biasa tidak berubah. Kolom pesanan yang tidak pernah dimuat dan nama kota di tab pencarian sengaja tetap kosong.
- **Peta giliran.** Sebelum "Giliranmu", seluruh cerita dirangkum dalam satu pita: setiap ucapan, setiap pesan yang diketik, dan setiap kalimat yang tidak jadi diucapkan, dihitung dari halaman itu sendiri. Di ujungnya satu slot yang berkedip: giliran pembaca.
- Penanda di bawah layar mengikuti percakapan yang sedang terlihat (*Giliran Mira*, *Giliran Bima*, …). Bingkai, panduan, penanda bagian (*Bagian n dari 15*), mode baca biasa, tema, bahasa, pratinjau, dan riwayat baca sama dengan pengalaman lain.
- Pembagian ucapan per orang dan per aplikasi ada di `VOICES` di `giliran.js`, berurutan per bagian. Kalau naskah diubah sampai susunannya berbeda, ceritanya tetap tampil utuh sebagai narasi dan balon biasa.

Kartu *berikutnya* di akhir tulisan yang tergabung dalam antologi menunjuk tulisan berikutnya di antologi itu (Interlude → Giliran → Usia Pulang → Interlude).

```bash
python3 tests/giliran_smoke.py
```

### Usia Pulang (antologi/usia-pulang/)

Novel interaktif di antologi **Temusai**: 64 simpul, sekitar 51 ribu kata, delapan akhir. Tampilannya memakai bahasa visual situs utama: abu-abu dingin, kartu putih, Doto untuk judul dan angka besar, pil hitam, aksen biru, lencana navy, dan lembar hitam yang menjadi terang di tema gelap (sampul, akhir, Kartu yang naik sebentar). Yang khas cerita, yaitu kertas tiap tokoh di sela dan benda-benda, tetap punya teksturnya sendiri tapi memakai token yang sama. Laras kembali dua puluh sembilan tahun sesudah kematiannya dan punya 168 jam (Senin 9 November 18.40 sampai Senin 16 November 18.40) untuk memutuskan apakah akan menetap.

- **Naskahnya** ada di `content/usia-pulang.json`: salinan apa adanya dari `build/Simpul-Cerita.json` di paket naskah pengarang (diperkecil, isinya tidak diubah). Kalau naskah diperbarui, bangun ulang paketnya, lalu salin berkas itu ke sini. Berkas ini tidak bisa diubah dari panel admin. Entri di `works.json` hanya memuat judul, ringkasan, dan pembuka (C01). Itulah yang tampil di mode baca biasa sampai pembaca memulai perjalanan; sesudahnya mode baca biasa menampilkan *Bukumu* (lihat di bawah).
- **Mesin cerita** (`usia.js`) mengikuti kontrak naskah. Saat masuk simpul, simpul dicatat dan tanda `on_enter_flags` dipasang. Memilih memasang `set_flags`, mencabut `unset_flags`, lalu pindah ke `target`. Pilihan dengan `requires_flags` hanya muncul bila tandanya ada; begitulah pintu akhir E01 dan E04 terbuka atau tertutup lagi. Nama tanda tidak pernah ditampilkan, dan tidak ada skor.
- **Waktu yang terasa.**
  - Jam menempel di bawah bilah atas: tanggal cerita, bagian hari, sisa jam, dan garis tujuh hari di tepi bawahnya. Jam pastinya hanya tampil di 18.40 (sisa 168 jam), 17.40 (sisa 1 jam), dan 18.40 di akhir.
  - Angka 18.40 berkedip sejak sampul dan di dalam teks pembuka. Di akhir, kedipannya berhenti.
  - Setiap pindah hari, layar menjadi malam: jam yang tersisa bergulir turun (misalnya 165 → 156), satu segmen hari habis, dan langit berganti ke fajar.
  - Sebelum akhir, jam berjalan dari 17.40 ke 18.40 lalu diam.
  - Pembuka muncul dari bawah air: paragraf pertama kabur dan bergoyang, lalu menajam.
  - Langit situs mengikuti bagian hari, dan penanda bagian menjadi *Hari n dari 7*.
- **Pilihan yang berat.** Pilihan tampil sebagai kartu: tujuan pagi (dengan inisial orang yang ditemui), tindakan siang, dan pintu terakhir (*menetap* / *tidak menetap*).
  - Kartu harus ditekan dan ditahan sekitar satu detik sampai tercap *Tercatat · <hari>*. Ketukan singkat tidak memilih. Dengan papan ketik atau pembaca layar, Enter langsung memilih.
  - Pilihan lain tenggelam dan hilang.
  - Kartu Kepulangan naik sebentar dari bawah dan mencatat pilihan itu. Pilihan tidak bisa ditarik kembali.
- **Benang jahitan.** Di tepi kiri buku ada benang yang menjahit turun mengikuti bacaan, dengan satu tusukan silang untuk setiap pilihan. Di bagian sela, benangnya tinggal titik samar karena Laras tidak ada di sana.
- **Gema** (R01 sampai R13) adalah akibat yang datang belakangan.
  - Saat gema datang, layar beriak dari benang. Benang melengkung balik ke pilihan yang memicunya, dan pilihan lama itu menyala.
  - Gema mengutip pilihan pembaca sendiri (*Selasa siang, kamu memilih "…"*), dengan tautan *Lihat pilihan itu ↑*.
  - Gema diantrekan sesuai urutan pengarang.
- **Sela** (P01 sampai P07) membawa pembaca ke pikiran Dian, Ratna, Tama, Sulastri, atau Hadi.
  - Saat masuk, kertas tokoh itu naik menutup layar dengan namanya: kertas kotak, tenunan berjahit, lembar kontak, kertas lama, atau abu kebiruan.
  - Selama sela terbaca, jam menjadi gelap dan berkata *Laras tidak di sini*, dan ikon kartu meredup.
  - Sela menampilkan tepat satu varian, yaitu yang cocok dengan perjalanan siang yang ditempuh.
- **Yang kamu tahu, Laras tidak.** Setelah sela seseorang dibaca, nama orang itu di adegan berikutnya diberi titik. Saat diketuk, muncul kalimat dari selanya dengan catatan *Laras tidak mengetahui ini*. Kalimat itu tidak pernah dipakai di dialog.
- **Siapa di adegan.** Inisial di kanan jam menunjukkan siapa yang disebut di adegan yang sedang dibaca, dengan Laras paling depan. Saat diketuk, muncul hubungan orang itu dengan Laras dan dua usianya: 1997 dan 2026 (misalnya Dian 8 → 37, Laras 31 = 31). Usia diambil dari kanon pengarang dan ada di `PEOPLE` di `usia.js`.
- **Benda di dalam cerita** (`benda.js`). Pesan, pesan suara, surat, foto, kartu, nota, amplop, dan satu halaman kosong muncul tepat sesudah paragraf yang menyebutnya. Setiap benda menunjuk paragrafnya lewat potongan kalimat `at`, dan tes memastikan setiap potongan cocok dengan tepat satu paragraf.
  - Pesan yang diketik ulang tampil sebagai ketikan yang dihapus lalu dikirim.
  - Foto hanya berupa bingkai, label orang, dan keterangan; tidak ada gambar.
  - Isi pesan yang tidak dikutip naskah ditulis dengan suara tokohnya. Surat palsu sengaja tidak bisa dibaca, kecuali tanda tangannya.
  - Semua ini hanya ada di versi interaktif. Naskah di `content/usia-pulang.json` tidak berubah.
- **Kartu Kepulangan** (ikon kartu di kanan atas) mencatat tujuan tiap hari sebagai cap, tindakan siangnya dengan tulisan tangan, jumlah gema, dan keputusan terakhir.
- **Sesudah akhir**:
  - Perjalanan dijahit menjadi pola di atas kain: pagi, siang, dan sela tiap hari, lengkungan untuk gema, lalu pintu terakhir. Menetap diakhiri simpul; tidak menetap membuat benangnya keluar dari kain. Setiap rute menghasilkan pola yang berbeda.
  - Ada juga jumlah kata yang dibaca, akhir yang sudah ditemukan (`jm:usia:endings`), tombol **Pulang lagi**, dan *mulai lagi dari* hari tertentu.
- Di layar dengan gerak dikurangi, layar malam, layar masuk sela, riak, air, dan ketikan dilewati. Semua informasinya tetap ada di halaman.
- **Bukumu.** Setiap kali perjalanan tersimpan, jalan yang ditempuh dirakit menjadi buku di `jm:usia:book`. Isinya satu bab per hari, dari *Senin, 9 November* sampai *Senin, 16 November*.
  - Setiap adegan diberi judul dan keterangan waktu. Sela diberi catatan *Laras tidak mengetahui…*, dan gema menyebut pilihan yang memicunya. Pilihan pembaca tampil sebagai kutipan *Pilihanmu: …*.
  - Mode baca biasa di situs (`assets/app.js`, fungsi `withBook`) memakai buku itu sebagai bab-bab karya ini. Kalimat yang tampil tetap persis naskah.
  - Kalau perjalanannya belum selesai, bab terakhir ditutup dengan catatan untuk melanjutkan di versi interaktif. Perjalanan lain menghasilkan buku yang lain.
- **Ingatan pembaca, bukan ingatan Laras.** Saat pembaca memulai perjalanan baru (*Pulang lagi*, *Mulai dari awal*, atau *mulai lagi dari* hari tertentu), perjalanan sebelumnya dicatat di `jm:usia:memory`. Di perjalanan berikutnya:
  - adegan yang pernah dibaca diberi tanda *Pernah kamu baca di perjalanan lain. Laras tidak mengingatnya.*, dengan tombol *Ke pilihan ↓*;
  - pilihan yang pernah diambil diberi tanda *pernah kamu pilih*;
  - sampul menunjukkan *Perjalanan ke-n*.
- **Kartu akhir.** Di akhir, *Bagikan kartu akhir* membuat gambar PNG 1080×1350. Isinya judul USIA PULANG, akhir yang ditemukan (*Akhir n dari 8*), apakah Laras menetap, pola jahitan perjalanannya, jumlah pilihan, gema, dan kata yang dibaca, serta alamat situs. Gambarnya bisa diunduh, atau dibagikan langsung di perangkat yang mendukung.
- **Suasana pelabuhan** (`suara.js`, sakelar di Aa, mati sampai dinyalakan, pilihannya diingat di `jm:usia:sound`).
  - Semuanya dibuat dengan Web Audio, tanpa berkas suara: ombak Teluk Rantau yang naik turun, angin tipis, dan sesekali klakson kapal di kejauhan.
  - Malam lebih sunyi. Saat sela, bunyinya teredam seperti dari ruangan lain.
  - Ada bunyi kecil untuk cap pilihan, detak malam yang lewat, detak menit terakhir dengan lonceng 18.40, gema, dan masuk ke sela.
  - Suara berhenti saat tab disembunyikan.
- Perjalanan tersimpan otomatis di `jm:usia:run`. Saat dibuka lagi, sampul menawarkan *Lanjutkan · <hari>* atau *Mulai dari awal*. Pratinjau (`?preview=1`) tidak menyimpan apa pun. Naskahnya baru ada dalam bahasa Indonesia; dalam bahasa Inggris antarmukanya diterjemahkan, dan ada catatan bahwa ceritanya tampil dalam bahasa aslinya.

```bash
python3 tests/usia_smoke.py
```

Pemeriksaan ini mengikuti `verify_story.py` milik pengarang: setiap simpul, ke-125 pilihan, dan kedelapan akhir dicapai lewat halaman; jalan yang ditempuh halaman dicocokkan dengan model kontraknya; pintu akhir yang terbuka dan tertutup lagi; varian sela; urutan dan kutipan gema; tidak ada nama tanda di halaman; pilihan tidak bisa dibatalkan; lanjut setelah dimuat ulang; kartu, pola jahitan, mulai dari hari tertentu, jam, pratinjau, dan bahasa Inggris. Lapisan imersifnya juga diperiksa: tekan-tahan, letak setiap benda, titik pengetahuan dan lembar orang, jam saat sela, simpul dan lengkung benang, serta layar malam dengan jam yang bergulir.

### Terlambat Satu Menit (antologi/terlambat-satu-menit/)

**Lacak Surat** membaca empat sisi *Terlambat Satu Menit / One Minute Too Late* sebagai halaman lacak kiriman pos. Tanpa gambar: hanya antarmuka yang dikenal semua orang. Seluruh prosa dan terjemahan dimuat utuh dari `content/works.json`; label status, lokasi, dan cap waktu adalah antarmuka, bukan kalimat cerita.

- **Lacak Kiriman**: kunjungan pertama mengetik nomor resi `SMN 0052 ID` sendiri, lalu menunggu pembaca menekan **Lacak**. Hasilnya empat kiriman: surat Saman (Bidak), kartu pengalihan di loket Bu Asih (Meja Pengalihan), surat yang sama setelah dialihkan (Alamat yang Tertukar), dan kiriman Maryam `MRY 0012 ID`. Kartu menampilkan status terakhir yang sudah dibaca dan waktu pemindaian.
- **Kolom resi**: setelah pencarian pertama kolomnya bisa diketik. `SMN 0001 ID` sampai `SMN 0052 ID` membuka masing-masing dari 52 surat Saman: semuanya *Tertahan di pengirim*, dengan empat kalimat yang sama. Baris manifest 52 surat di riwayat Saman membuka nomornya langsung. `BNY 0001 ID` (balasan Banyu) dan `MRY 0011 ID` (catatan Maryam) baru ditemukan setelah kiriman itu ditulis dalam cerita; nomor lain *tidak ditemukan*.
- **Urutan**: tombol *Terlama dulu / Terbaru dulu* di bilah status membalik riwayat seperti halaman lacak sungguhan. Di riwayat Maryam labelnya *Dihitung mundur*. Membaca terbalik tidak mengubah penanda baca, progres, atau status tamat.
- **Riwayat alamat penerima** (di riwayat Banyu dan Meja Pengalihan): alamat lama di kota seberang → kota pelabuhan → desa pegunungan → kota besar → apartemen kontrakan, masing-masing muncul setelah disebut di sisi mana pun dan dicoret satu garis lurus seperti di kartu Bu Asih; terakhir *↩ toko jahit, alamat pengirim*.
- **Setiap paragraf adalah satu catatan pemindaian.** Waktunya adalah jam pembaca sendiri saat ujung paragraf melewati garis baca. Catatan yang belum dibaca bertanda `··:··`. Bilah status di atas teks mengikuti kalimat yang sedang dibaca: status, tahapan (mis. Ditulis → Disimpan → Dikirim → Dalam perjalanan), dan pemindaian terakhir.
- **Status pada kalimatnya**: *Disimpan di laci · tidak dikirim*, manifest **52 kiriman tertahan di pengirim**, *Catatan ditemukan · disembunyikan*, *Penerima pindah*, *Diserahkan ke kotak pos*; tumpukan *Dialihkan ke alamat baru* sebelum *Diterima · hari yang salah, kota yang salah*; *Dibuka*, *Balasan dikirim · penerimaan tidak tercatat*; *12 sendok tinggal 11*, *Tertahan · tidak pernah sampai*, *Disimpan: 1 menit · dalam botol*, *Dikirim ke alamat usang · status tidak diketahui*.
- **Isi kiriman**: tombol *Lihat isi* (dan *Isi* di bilah status) membuka surat di atas kertas bergaris. Isinya kutipan bercetak miring dari naskah dan bertambah sesuai yang sudah dibaca: empat kalimat Saman sejak awal, kalimat tambahannya bertinta pudar setelah ia menuliskannya; di sisi Banyu amplop tetap tertutup sampai ia membukanya, lalu balasan Banyu muncul kalimat demi kalimat; surat Maryam muncul saat ia menulisnya. Status amplop mengikuti cerita (*Di laci*, *Tertutup*, *Dibuka*, *Ditulis*, *Dikirim*). Titik biru menandai isi baru.
- **Catatan Maryam tidak pernah ditampilkan**: di sisi Saman ia *Ditemukan · disembunyikan di laci*, di sisi Banyu *Diminta* lalu *Dicari · tidak ditemukan*, di sisi Maryam *Ditinggalkan di bawah cangkir* lalu *Tertahan · tidak pernah sampai*. Isinya selalu tersensor (*Tidak dapat ditampilkan*), mengikuti naskah yang tidak pernah mengungkapnya.
- **Ingatan Saman**: setelah *hari-hari berlalu*, cap waktunya menjadi `--:--` dan tanggalnya tidak terbaca.
- **Jam Maryam berhenti**: setelah paragraf terakhirnya terbaca, seluruh riwayatnya membeku pada menit yang sama.
- **Bukti penerimaan**: di sisi Banyu, setelah *satu menit setelah jam berhenti*, muncul kartu dengan *Ditujukan kepada: Banyu*, **Diterima oleh: Mas**, tanda tangan kosong, *Jam berhenti* dan *Tiba* yang dihitung dari jam pembaca, dan *Keterlambatan: 1 menit*. Tombol *Cetak bukti* mencetak (atau menyimpan sebagai PDF) kartu itu saja, dengan judul, resi, dan tanggal baca.
- **Besok**: setelah *Besok aku datang lagi*, estimasi tiba selalu besok (tanggal sungguhan). Setiap hari lain pembaca kembali ke riwayat Banyu, tercatat satu baris *Datang lagi*.
- **Meja Pengalihan** (sisi keempat, `#d`): Bu Asih, petugas loket nomor tiga di kantor pos kota seberang, menjaga kartu pengalihan atas nama Banyu selama dua belas tahun tanpa satu surat pun, lalu memilih meneruskan surat Saman lewat jejak yang sama yang ditinggalkan Banyu. Sisi ini ditulis bersama Claude atas permintaan penulis untuk bentuk lacak kiriman, tersimpan di `content/works.json` (ID/EN), dan bisa disunting atau dihapus lewat panel admin.
- **Ringkasan pengiriman** (`#ringkasan`): terbuka setelah keempat riwayat tamat; status akhir setiap kiriman, jumlah catatan yang dipindai pembaca, sapaan penutup dari naskah, dan estimasi besok.
- **Bacaan dan tema**: penanda per bahasa dan sisi, ukuran huruf, tautan `#a`, `#b`, `#c`, `#d`, `#b-55`, `#ringkasan` dan tautan situs utama tetap berlaku. Terang/gelap mengikuti situs (`jm:theme`), lalu tema admin, lalu perangkat. Bunyi pemindai, cap pos, dan lonceng opsional. Pratinjau `?preview=1` tidak menulis riwayat.

Modul: `track.js` (nomor resi, urutan, tahapan, status, isi kiriman, riwayat alamat, dan nomor yang bisa dicari, semuanya dengan penanda teks ID/EN), `sound.js`, dan `minute.js`. Jika `track.js` gagal dimuat, riwayat tetap terbaca tanpa status. Tes memastikan setiap penanda menunjuk tepat satu paragraf dalam urutan yang benar.

```bash
python3 tests/minute_smoke.py
```

Pemeriksaan mencakup keutuhan naskah dua bahasa, penanda baca, tautan situs utama, bahasa dan offline, pratinjau, tata letak 320–1440 px, gerak tenang, bunyi, kegagalan modul, pencarian resi, setiap penanda status dan isi kiriman, isi surat yang bertambah per adegan, 52 resi dan nomor yang tidak ditemukan, kiriman yang baru bisa dilacak setelah ditulis, urutan terbalik tanpa menggeser penanda, riwayat alamat, catatan yang tersensor di tiga sisi, cetak bukti, sisi Meja Pengalihan dalam dua bahasa, cap waktu dari jam pembaca, status per kalimat (ID/EN), kabut Saman, jam Maryam yang membeku, bukti penerimaan, estimasi besok dan kunjungan ulang, ringkasan, serta tema.

### Pabrik Mimpi (antologi/pabrik-mimpi/)

**Kalender Pak Wangsa** membaca *Pabrik Mimpi / The Dream Factory* di aplikasi kalender milik Pak Wangsa: bilah samping dengan kalender mini dan daftar kalender, tampilan *Jadwal*, blok acara berwarna, pengingat, dan lampiran foto. Seluruh prosa dan terjemahan dimuat utuh dari `content/works.json` sebagai isi acaranya; tanggal, judul acara, dan foto adalah bingkainya.

- **Jadwal empat puluh tahun**: *Shift malam* setiap malam sejak 4 Februari 1985, *Stasiun paling ujung · pesanan khusus*, *Tidur · tanpa mimpi*, dan acara tahunan *Malam terakhir sebelum libur* dengan tugas *Bawa pulang mimpi*. Judul bulan di bilah atas dan kalender mini di samping mengikuti acara yang sedang dibaca.
- **Riwayat jadwal ulang**: setelah mimpi itu larut di atas meja, kartu acara tahunan bisa digeser atau *diputar empat puluh tahun*; setiap tahun ia dipindahkan ke tahun berikutnya dengan *"Tahun depan, mungkin."* Pada malam terakhir tugasnya tercatat *Tidak dibawa pulang*, dan acara itu dipindahkan untuk ke-40 kalinya. Kartunya bisa diusap ke kanan untuk menunda setahun, dan kotak *Bawa pulang mimpi* tidak bisa dicentang: ia menolak dengan alasan dari naskah (*"Sebab gerbang akan mendeteksinya…"*) lalu menunda sendiri.
- **Tampilan tahun**: judul bulan (atau *Jadwal*) membuka 41 ubin tahun 1985–2025, masing-masing dengan dua belas bulan shift dan satu titik 30 Desember: dijadwalkan, dijadwalkan ulang, tidak dibawa pulang, atau terjadi. Titiknya baru berubah setelah pembaca sampai di bagian itu. Ubin bisa disentuh untuk melompat; 1986–2023 membuka riwayat jadwal ulang di tahun itu.
- **Tahun yang kosong**: setelah *Pensiun*, 2025 tampil sebagai dua belas bulan *Tidak ada acara*.
- **Kalender Lila**: Lila membagikan kalendernya; *Melacak penerima · arsip pesanan lama* dan *Bawa mereka semua ke pabrik* muncul berwarna hijau.
- **Undangan**: kalimat Lila di pintu menjadi judul undangan, dari Lila, dengan ratusan tamu yang hadir. Pembaca menjawabnya. *Mungkin* atau *Tidak* dibalas Lila dengan kalimatnya sendiri dari naskah (*"Bapak tidak punya tahun depan lagi…"*). Hanya *Hadir* yang membuka sisa cerita: acara berubah menjadi **Sedang berlangsung** dengan penghitung waktu sejak pembaca menjawab, dan di akhir muncul *Hari ini* dengan acara tahunan yang akhirnya *Terjadi · dengan mata terbuka* dan tidak dijadwalkan ulang lagi.
- **Ruangan yang berdiri**: di acara *Sedang berlangsung*, bilah kursi menempel di bawah layar. Kursi terisi saat ratusan kursi disebut, satu orang di barisan depan berdiri, lalu bertepuk tangan, lalu yang di sebelahnya, sampai seluruh ruangan berdiri dan bilahnya menyala warna-warni seperti cerobong pabrik.
- **Di ponsel**: bilah samping menjadi laci (tombol menu, usap ke kiri untuk menutup), pita tujuh hari di bawah judul bulan mengikuti tanggal yang dibaca, tanggal ditulis di atas acara sehingga teks memakai lebar penuh, pengingat tampil seperti spanduk notifikasi yang bisa diusap ke atas, dan getaran halus (jika perangkat mendukung dan gerak aktif).
- **Foto temuan**: lima foto dari penulis (`photos/`) menjadi lampiran acara dengan bingkai rekaman (REC, cap waktu, butiran) dan bisa dibuka besar.
- **Pengingat** muncul saat membaca maju ke acara tahunan, kalender Lila, dan undangan; melompat tidak memunculkannya.
- **Bacaan dan tema**: penanda baca per bahasa, jawaban undangan yang diingat, tautan `#baca` dan `#baca-12`, tautan dari situs utama, ukuran huruf, gerak tenang, dan tema terang/gelap yang mengikuti situs. Pratinjau `?preview=1` tidak menulis riwayat. Jika `kalender.js` gagal dimuat, cerita tetap terbaca utuh sebagai satu acara.

Data acara, foto, kutipan, dan penanda ruangan yang berdiri (dengan penanda ID/EN) ada di `kalender.js`.

```bash
python3 tests/mimpi_smoke.py
```

### The Moon Behind My Eyes (antologi/the-moon-behind-my-eyes/)

Puisi ini dibaca di **layar kunci ponsel**, tanpa ilustrasi: hanya jam, widget, notifikasi, pusat kontrol, dan layar yang dimatikan. Setiap bait datang sebagai catatan di layar kunci. Larik dimuat utuh dari `content/works.json` (bahasa asli Inggris; pembaca berbahasa Indonesia mendapat catatan bahwa puisinya belum diterjemahkan). Wallpaper mengikuti tema situs; layar yang dimatikan selalu hitam.

- **Kaca yang dijaga bening**: kacanya kaca layar itu sendiri. Layar kunci mula-mula buram; usap dengan jari atau tetikus (atau tombol *Usap*) sampai jelas.
- **Bulan yang tidak datang**: begitu layar jelas, aktivitas langsung *Bulan terbit* menghitung mundur, lalu berganti *Bulan sudah terbit · tidak terlihat*; widget *Terbit* menulis *Tertunda*. Widget *Bintang* bertambah tepat setiap detik, widget *Bulan* menulis persentase bulan malam itu, *tidak terlihat*.
- **Penantian yang menghantui**: notifikasi *Langit · Bulan belum terlihat* terus datang; pembaca menekan *Ingatkan lagi* tiga kali.
- **Tirai**: di pusat kontrol (tombol ☾), penggeser *Kecerahan · tirai* diturunkan sampai habis; Fokus *Tidur* menyala dan notifikasi bulan dibisukan.
- **Memejam**: tahan tombol kunci (atau spasi). Layar mati, dan di layar yang hitam itu *Bulan: terlihat* serta dua bait terakhir menyala pelan, larik demi larik; melepas tombol menyalakan layar lagi dan menjeda lariknya. Setelah selesai, notifikasi terakhir datang: *Bulan terlihat · lokasi: di balik matamu*. *Baca dengan mata terbuka* tersedia untuk yang tidak bisa menahan, dan *Mulai lagi* di akhir.
- Penanda `#baca-2` membuka bait ketiga, `#baca-3` langsung ke langkah memejam.

```bash
python3 tests/moon_smoke.py
```

### Trillions of Seconds (antologi/trillions-of-seconds/)

Puisi ini dibaca di **aplikasi Jam**, di tab *Stopwatch*. Larik dimuat utuh dari `content/works.json`; tampilannya mengikuti tema situs.

- **Mulai** menjalankan stopwatch dan membuka bait pertama. Setiap **Putaran** mencatat berapa lama pembaca berpikir di satu bait lalu membuka bait berikutnya. Seperti aplikasi Jam, putaran terbaru di atas, yang tercepat hijau dan terlama merah; bait lama bisa dibuka lagi. Jarum detiknya satu titik kecil, *that tiny speck*.
- **Jam Dunia**: setelah *the coast of answers and longing*, sebuah kota bertambah: *Pantai Jawaban dan Kerinduan*, zona waktu tidak diketahui. **Alarm**: tidak ada alarm.
- **Timer**: saat *Trillions of seconds* terbuka, timer *1 triliun detik* mulai berjalan bersama stopwatch (±31.689 tahun). Pembaca boleh mengisi tahun lahirnya untuk melihat detiknya sendiri; disimpan hanya di perangkatnya.
- **"I am you."**: saat *I encountered an entity* terbuka, muncul **stopwatch lain di dekatmu**, *Entitas*, dengan waktu dan daftar putaran yang sama persis dengan milik pembaca. Di bait berikutnya ia hanyut menjauh (*Putaran 1–5: sama persis dengan milikmu*) lalu hilang.
- **I stopped thinking**: di bait terakhir, pembaca sendiri yang menekan **Berhenti**; waktunya membeku dan puisinya selesai. Menjeda di tengah puisi tidak menyelesaikannya; stopwatch yang ditinggalkan dijeda dan diingat.
- Penanda `#baca-3` membuka bait keempat dengan putaran sebelumnya ditandai dilewati.

```bash
python3 tests/seconds_smoke.py
```

### The Room (antologi/the-room/)

Puisi ini dibaca di **aplikasi Rumah** (rumah pintar), tanpa ilustrasi: ringkasan kamar, kartu aksesori, sensor, adegan, notifikasi, dan riwayat. Kamarnya satu, *Kamar*, dan pintunya *tidak ditemukan*. Setiap bait tampil sebagai peristiwa terbaru di atas; bait sebelumnya tersimpan di *Riwayat*. Setiap tindakan pembaca pada sebuah kartu membuka bait berikutnya, dan kartu yang menunggu disentuh berdenyut. Larik dimuat utuh dari `content/works.json`; tampilannya mengikuti tema situs.

- *Pintu* tidak bisa dibuka, *Barang* (214 benda, 97% penuh) tidak bisa dirapikan karena tidak ada tangan. **Tambah aksesori** menemukan *Kuas*.
- **Cat · hari ke-n**: warnanya makin pekat setiap hari; di 70% muncul *Kuas kecil* yang belum pernah menggambar. *Gambar* hanya menjawab *Takut*; ia dipindahkan ke **pojok terjauh** dan tinggal di sana sampai akhir.
- Kuas berhenti mengecat; adegan **Rapikan perabot** gagal, 6 perabot rusak. **Cat lagi · warna lembut** dijawab **Tidak Ada Respons**, lalu kuasnya dilepaskan.
- Penggeser **Dorong semua ke satu sisi** menaikkan beban *Dinding Timur* sampai jebol; yang tersisa hanya buku kecil dan meja. Suhu turun terus dan tidak bisa dinaikkan; cat dinding kusam dan mengelupas.
- Notifikasi *Palu & Paku ingin masuk*: **Izinkan**, lalu **Tutup lubang** dengan satu paku. Suhunya naik lagi tapi tidak lagi 27°. Palu bisa membuat perabot, tapi **tidak mendukung pengecatan**; *Paku* terikat pada Palu dan tidak bisa dilepas.
- Penanda `#baca-7` membuka bait kedelapan dengan tindakan sebelumnya dianggap sudah dilakukan; *Mulai lagi* di akhir.

```bash
python3 tests/room_smoke.py
```

### Salasimpul (dunia/salasimpul/)

Sebuah dunia, bukan album dan bukan antologi: catatan-catatan 18 orang di satu kota, 1983–2026, yang saling menyimpul tanpa disengaja. Dunia ini terus bertambah. Pintunya ada di halaman **Album**, berupa banner gelap di atas rak album (`showAlbum` dan `worldBanner` di `assets/app.js`). Angka dan garis kecil di banner dibaca dari `content/salasimpul.meta.json`.

**Menambah catatan** (di masa lalu, masa depan, atau titik mana pun):

1. Taruh berkasnya di `content/salasimpul/<penulis>/<tahun>-<hari>.md`. Folder baru berarti penulis baru dan garis baru di partitur.
2. Isi frontmatter-nya seperti catatan lain: `id` (unik), `owner` (sama dengan nama folder), `at: { y, d, h }` (tahun, hari ke- dalam tahun itu, jam), `title`, dan `memory` (opsional).
3. Tandai kalimat di ujungnya:
   - `@claims(p_x)`: kalimat yang memberi tahu pembaca fakta `p_x`;
   - `@irony(p_a, p_b)`: kalimat yang berubah makna setelah pembaca tahu fakta itu;
   - `@node(penulis:id)` atau `@echo(penulis:id)`: simpul ke catatan lain;
   - `@protected`: kalimat yang tidak ikut terlupa.
4. Jalankan `node tools/salasimpul.js`. Skrip menyusun `content/salasimpul.json` dan `content/salasimpul.meta.json`. Ia berhenti dengan pesan yang jelas kalau ada id ganda, owner yang tidak cocok dengan foldernya, atau simpul ke catatan yang tidak ada.
5. Commit catatan baru bersama dua berkas hasilnya. Tes `tests/salasimpul_smoke.py` gagal kalau berkas hasilnya tertinggal dari catatannya.

`content/salasimpul/_dunia.json` memuat judul, nama panggilan (Sukrim juga disebut Krim), catatan pembuka (`start`), dan **catatan kunci** (`keys`): catatan yang baru terbuka setelah pembaca tahu fakta tertentu. Sekarang ada tiga: enam kata Hesti, petak sebelas Elmar, dan kuitansi Nara di makam.

`_dunia.json` juga memuat **persona**: ciri tiap penulis yang dipakai antarmuka, bukan teks catatan. Persona diperiksa oleh `node tools/salasimpul.js`.

- `lede`: satu kalimat pengenal di kartu orang, diambil dari catatan-catatan pertamanya.
- `born`: tahun lahir, hanya kalau umurnya disebut di teks. Contohnya Nara (*Aku lima tahun*, 1999), Karman (*Dua puluh enam tahun* di hari pertama, *enam puluh lima* di 2026), Laras, Bayu, Joni, Sukrim, Elian, dan Lira.
- `since: { y, d, label, unit }`: hitungan yang dibawa penulisnya, dicocokkan dengan kalimatnya sendiri:
  - Elmar *28 tahun di pemakaman* pada 2024;
  - Bagas *7 tahun di kantor* pada 2026;
  - Wardi dan Hesti *730 hari, dihitung tiap pagi*.
- `room`: ruangan tempat ia menulis, untuk suara: `malam`, `radio`, `jam`, `ruang`, `angin`, `jalan`, atau `hujan`.

**Membaca:**

- **Kenalan.** Pembaca orang baru di kota ini.
  - Dua catatan pertama setiap orang terbuka.
  - Setiap catatan orang lain yang menyebut namanya atau menyimpul ke bukunya membuka dua catatan berikutnya.
  - Catatan yang disimpul langsung dari catatan yang sudah dibaca selalu terbuka.
  - Halaman yang terkunci menunjukkan lewat siapa orang itu bisa dikenali, dan selalu punya tombol *Buka saja*.
  - *Kota terbuka* di Aa membuka semuanya.
- **Yang kamu tahu** (ikon mata). Setiap kalimat `@claims` yang terlihat di layar menjadi fakta yang diketahui pembaca.
- **Kalimat yang menyala.** Kalimat `@irony` menyala setelah semua faktanya diketahui, juga di catatan yang dibaca lebih dulu. Saat diketuk, kalimat sumbernya muncul beserta penulis dan tanggalnya.
- **Kota.** Ada tiga cara melihatnya:
  - *Partitur*: satu garis per orang dan satu titik per catatan menurut urutan waktu, dengan benang di antara catatan yang menyimpul;
  - *Orang*: buku tiap orang, dengan seberapa jauh kamu mengenalnya;
  - *Waktu*: semua catatan, tahun demi tahun.
- **Benang baca.** Jalan bacamu adalah satu benang (`jm:simpul.strand`).
  - Catatan yang sudah lewat terlipat di atas catatan yang sedang dibaca: nama, tanggal, judul, dan kalimat pertamanya. Lipatan bisa dibuka lagi di tempat.
  - Di antara dua catatan ada simpul berwarna tinta kedua penulisnya. Simpul itu menyebut bagaimana kamu sampai (*Kamu menarik benang dari …*, *Lanjut di buku yang sama*, *Sementara itu di kota*) dan seberapa jauh waktu melompat, misalnya **+11** tahun kemudian.
  - Catatan baru muncul di bawah lipatan yang baru ditinggalkan, lalu halaman bergulir turun ke sana.
  - Tombol kembali di peramban memotong benang di catatan yang dituju. Tujuh catatan terakhir ditampilkan, dan yang lebih lama disebut jumlahnya.
- **Persimpangan.** Di akhir setiap catatan ada *Ke mana sekarang?* dengan paling banyak empat jalan. Setiap jalan menampilkan nama penulisnya dan kalimat pertamanya:
  - *Tarik benangnya* atau *Ikuti gemanya*: simpul keluar, yang belum dibaca lebih dulu;
  - *Lanjut di buku …*: catatan berikutnya dari orang yang sama;
  - *Sementara itu*: catatan berikutnya dari orang lain yang terbuka dan belum dibaca;
  - *Yang menyimpul ke sini*: simpul masuk yang belum dibaca.
  - Catatan yang baru saja kamu tinggalkan tidak ditawarkan lagi. Catatan yang belum terbuka tetap tampil sebagai *Seseorang*, dengan alasannya.
- Simpul di dalam teks tampil sebagai pil kecil berwarna tinta penulis tujuannya, supaya paragraf tidak terputus.
- Di bawah persimpangan ada baris kecil: *Sebelumnya di buku …*, *Ingat dari tahun lain*, *＋ Suntinganmu*, dan *Peta kota*.
- Di peramban yang mendukung animasi yang mengikuti gulir, tepi buku terisi tinta sejauh kamu membaca dan paragraf muncul saat kamu sampai. Tidak ada animasi kalau gerak dikurangi.
- **Jendela-jendela.** Di sampul ada empat jendela berisi kalimat pertama orang-orang yang belum kamu kenal, tanpa nama ("seseorang · 1999"). Kamu memilih orang asing dari suaranya, dan namanya baru terungkap saat kamu masuk. *Jendela lain* mengacak ulang. Di kunjungan pertama, catatan pembuka (`start`) selalu ada di antaranya.
- **Buku tiap orang.** Setiap penulis punya warna penanda sendiri di tepi halaman, dan setiap buku punya kertasnya sendiri:
  - bergaris tepi untuk Karman dan Bagas;
  - surat untuk Hesti, dengan *Nak,* di pembukanya;
  - buku tulis kotak-kotak untuk Laras;
  - bergaris untuk Joni, Bayu, dan Lira;
  - buku daftar dengan kolom nomor petak untuk Elmar;
  - kertas lama untuk Rasmi dan Inah;
  - kartu katalog berbingkai untuk Basri;
  - buku bekas yang halaman depannya disobek untuk Sukrim, dan buku pasar loak yang menguning untuk Endah;
  - kertas kardus untuk Ratih, garis ganda yang rapi untuk Elian, dan kertas dapur jam tiga pagi untuk Wardi.
- **Penulis yang masih anak-anak** (di bawah 13 tahun menurut `born`) menulis lebih besar di buku bergaris lebar. Buku Nara ikut tumbuh: besar di 1999, biasa di 2014.
- **Tanda tangan di kepala catatan:** umur penulis saat itu (*16 tahun*) dan hitungan yang ia bawa (*730 hari dihitung tiap pagi*, *28 tahun di pemakaman*).
- **Kartu orang.** Mengetuk nama penulis di kepala catatan, atau *kartu* di tab Orang, membuka kartunya. Isinya:
  - `lede`, tahun menulis, jumlah catatan yang sudah dibaca, umur di bukunya, dan hitungannya;
  - jam menulis: lingkaran 24 jam dengan titik di setiap jam ia menulis, terisi kalau catatannya sudah dibaca;
  - orang di sekitarnya: jaring orang yang ia sebut atau yang menyebutnya, dengan tebal garis menurut seberapa sering. Orang yang belum kamu kenal tampil sebagai *?*, dan orang yang sudah kamu kenal bisa diketuk untuk membuka kartunya;
  - kalimat pertamanya, dan jalan ke *Catatan berikutnya*, *Semua catatannya*, dan *Kota dari sudutnya*.
  - Orang yang belum kamu kenal tampil sebagai *Seseorang*.
- **Malam yang sama.** Ada 42 hari ketika lebih dari satu orang menulis, misalnya 31 Maret 2010: Karman pukul 20.00, lalu Lestari dan Nara pukul 23.00.
  - Di catatan seperti itu ada panel gelap *Malam itu juga*, berisi garis jam, siapa lagi yang menulis, dan kalimat pertamanya.
  - Persimpangan menawarkan *Malam itu juga* lebih dulu, dan simpulnya menyebut selisih jam (*+3 jam kemudian*).
  - *Baca malam ini menurut jam* (`#malam-<tahun>-<hari>`) membuka semua catatan hari itu dalam satu gulungan dengan jam besar Doto. Garis jamnya menempel di atas, dan langit serta tintanya berganti saat kamu menggulir dari satu jam ke jam berikutnya.
- **Suara ruangan** (*Suara ruangan* di Aa, mati sampai dinyalakan). Bunyinya dibuat dengan Web Audio di `dunia/salasimpul/suara.js`, mengikuti `room` penulis dan jam catatan:
  - radio dapur yang sayup untuk Lestari dan Nara;
  - jam dinding untuk Wardi, Hesti, dan Laras;
  - dengung ruang periksa untuk Karman dan Bagas;
  - angin pemakaman untuk Elmar;
  - jalan yang belum tidur untuk Sukrim, Endah, dan Joni;
  - hujan di atap toko untuk Basri.
  - Malam hari ditambah jangkrik, dan subuh ditambah burung. Kertas berbunyi saat kamu memilih jalan.
- **Langit mengikuti jam catatan ditulis.** Jam itu tampil dengan Doto, misalnya *23.00*.
- **Menarik benang.** Mengikuti simpul membuka catatan tujuan dengan pita *Kamu menarik benang dari …*. Di layar lebar (≥1100px), catatan asal tetap terbuka di kiri dan benang biru digambar dari simpulnya ke judul catatan tujuan.
- **Kilat balik.** Saat fakta yang baru kamu ketahui membuat kalimat di catatan yang *sudah* kamu baca berubah makna, muncul kartu *n kalimat yang pernah kamu baca berubah*, berisi kalimat-kalimat itu dan tautannya.
- **Partitur yang hidup.**
  - Ketuk nama orang untuk menyorot garis, titik, dan benangnya.
  - Ketuk titik untuk mengintip judul dan kalimat pertamanya sebelum membaca.
  - *Jejakmu*: urutan bacamu digambar sebagai satu benang biru.
  - Tombol − dan + merapatkan atau merenggangkan waktu.
- **Banner di halaman Album** tetap tipis, berisi judul, garis kota, angka, dan panah.
  - Garis kota memakai tinta tiap penulis, dengan titik-titik yang disebar menurut urutan catatan, bukan menurut tahun, supaya tahun-tahun yang ramai tidak bertumpuk.
  - Beberapa benang berdenyut dan beberapa jendela berkedip. Animasi berhenti kalau gerak dikurangi.
  - Di bawah garis, kalimat pertama orang-orang bergantian tanpa nama (*seseorang · 1993*).
  - Setelah pembaca mulai membaca, catatan yang sudah dibaca menyala biru, dan angkanya berganti menjadi *kamu kenal 5 dari 18 orang · 6/187* dengan *Dunia · lanjutkan*.
  - Datanya (`ids`, `at`, `links`, `inks`, `voices`) disusun oleh `node tools/salasimpul.js` di `content/salasimpul.meta.json`.
- **Ingatan yang memudar.**
  - *Ingat dari tahun lain* di bawah setiap catatan membuka bilah di bawah layar dengan penggeser *Diingat pada*, dari tahun catatan ditulis sampai tahun terakhir dunia ini. Kalimat yang dilupakan penulisnya pada tahun itu memudar menjadi kabut, dan teksnya tetap terlihat di atas bilah. Menutup bilah mengembalikan teks utuh.
  - Kalimat `@protected` tetap tajam, dan tahun catatan ditulis menampilkan teks utuh.
  - Rumusnya R = e^(−t/S): t adalah hari sejak `memory.encodedAt` (atau tanggal catatan), S = `stability0` × (1 + `retrievalBonus` × `retrievals`). Catatan tanpa `memory` memakai ingatan bawaan `memory` di `_dunia.json`.
  - Kalimat yang memudar dipilih secara tetap, jadi kalimat yang sama selalu hilang pada ingatan yang sama.
  - Setiap kali pembaca kembali ke catatan yang sudah dibaca, `retrievals`-nya bertambah satu (`jm:simpul.recall`). Ingatan itu bertahan lebih lama karena dibaca ulang.
- **Kota pada tahun tertentu.** Penggeser di bawah partitur menyembunyikan catatan yang belum ditulis pada tahun itu dan meredupkan sisanya sesuai ingatan penulisnya, disertai jumlah catatan dan rata-rata yang masih diingat.
- **Kesaksian.** Di *Yang kamu tahu*, fakta yang ditulis lebih dari satu kali punya tombol *n kesaksian*. Isinya:
  - semua kalimat yang menyatakan fakta itu, dari siapa pun (yang belum kamu kenal tampil sebagai *seseorang*);
  - kalimat-kalimat yang berubah karenanya.
  - Halaman tidak pernah memutuskan siapa yang benar.
- **Sudut.** Tab *Sudut* menampilkan kota dari satu orang, dengan Sukrim sebagai bawaan: catatannya sendiri diselingi kalimat orang lain yang menyebutnya, lengkap dengan jumlahnya.
- **Suntinganmu.** Tab *Suntingan* adalah buku yang disusun pembaca sendiri.
  - Tambahkan catatan lewat *＋ Suntinganmu* di kaki setiap catatan, atau sekaligus dari *Jejakmu* dan *Rantai yang disarankan* (`spine` di `_dunia.json`).
  - Urutannya bisa digeser.
  - *Baca suntinganmu* menampilkannya sebagai satu buku. *Unduh .md* memberi berkas Markdown berisi teks catatan tanpa tanda.
  - *Salin tautan* membuat `#suntingan=id,id,…`. Penerima membaca suntingan itu sebagai satu buku dan bisa menyimpannya sebagai suntingannya sendiri.
- Semua tersimpan di `jm:simpul`. *Mulai dari nol* di Aa menghapusnya. Pratinjau (`?preview=1`) tidak menyimpan apa pun.

```bash
node tools/salasimpul.js
python3 tests/salasimpul_smoke.py
```

### Bingkai bersama (antologi/bingkai.css, antologi/panduan.js)

Isi setiap pengalaman boleh berbeda (peta, obrolan, halaman lacak, kalender, arsip, aplikasi Rumah, Jam, layar kunci), tapi bagian yang milik situs sama di kedelapannya:

- **Judul cerita**: judul di sampul (Interlude, Giliran, Anda di Sini, Pabrik Mimpi, Trillions of Seconds, The Room, Usia Pulang) memakai Doto kapital, sama seperti judul di halaman awal situs (`--qm-dot` di `bingkai.css`). Kicker di atasnya kapital kecil dengan jarak huruf yang sama. Tiruan aplikasi di dalam cerita (kalender, halaman lacak, aplikasi Jam dan Rumah, layar kunci, berkas arsip) tetap memakai gaya aplikasinya sendiri.
- **Satu tombol keluar**: pil **‹ Meja tulis** di kiri atas, sama persis dengan pil di pembaca situs utama (tinggi 38, kartu kaca, bayangan yang sama). Dalam bahasa Inggris: *Writing desk*.
- **Tombol kanan atas**: **Aa** (pengaturan baca) dan **?** (cara membaca), bundar, di tempat yang sama.
- **Dialog pengaturan baca** dengan tampilan yang sama: ukuran huruf, tampilan terang/gelap, dan pengaturan khusus pengalaman itu (gerak, bahasa, bunyi).
- **Token situs**: huruf antarmuka sistem (seperti situs utama), huruf baca Newsreader, warna aksen biru situs, dan langit yang sama (`data-backdrop`: fajar, siang, senja, kabut, malam; ikut jam atau pilihan pembaca). Di layar lebar, aplikasinya tampil sebagai jendela di atas langit itu.
- **Huruf baca** yang dipilih di situs utama (`jm:rd.font`: Literata, Georgia, sistem, Instrument, Geist) ikut dipakai untuk teks cerita. Pilihan **kertas** dari situs utama sengaja tidak diterapkan: setiap pengalaman punya permukaan dunianya sendiri (layar ponsel, kertas lacak, kalender), dan kertas krem di atasnya akan merusak ilusi itu.
- **Tema** mengikuti situs: pilihan pembaca (`jm:theme`), lalu pengaturan admin, lalu perangkat. Interlude kini punya tema terang, dan warna bilah browser (`theme-color`) di Anda di Sini dan Interlude mengikuti tema yang aktif.

### Panduan bersama (antologi/panduan.js, antologi/panduan.css)

Kedelapan pengalaman memakai panduan yang sama supaya alurnya tidak membingungkan:

- **Cara membaca**: saat pertama kali dibuka, satu kartu menjelaskan langkah-langkahnya dalam tiga atau empat kalimat; tombol **?** di bilah atas membukanya lagi.
- **Penanda langkah**: *Bait 3 dari 7* dengan titik-titik kecil (Anda di Sini: *Bagian*, Interlude: *Bab*, Terlambat Satu Menit: *Kiriman*, Pabrik Mimpi: *Acara*).
- **Dorongan saat diam**: kalau pembaca tidak melakukan apa-apa beberapa detik, tombol yang ditunggu berdenyut; kalau tombolnya di luar layar, muncul tombol **↓** yang membawanya ke sana.
- **Malam yang sama**: semua tulisan ini ditulis pada malam 19 Juli 2026 (Thought Log 01.57, 02.02, 02.06; The Room 02.13; Trillions of Seconds 02.17; The Moon Behind My Eyes 02.43). Di akhir setiap tulisan ada kartu ke tulisan berikutnya malam itu; di pengalaman lain, kartunya menunjuk pengalaman berikutnya menurut tanggal (dari `content/works.json`, jadi selalu ikut daftar terbaru).

Cek bingkai di kedelapan pengalaman (tombol keluar, tombol kanan atas, dialog, tema, huruf baca, kartu berikutnya):

```bash
python3 tests/bingkai_smoke.py
```

Cek mode baca (badge, saklar, pembaca biasa untuk setiap tulisan interaktif, tombol Baca biasa):

```bash
python3 tests/mode_smoke.py
```

Cek catatan margin dan Titipan:

```bash
python3 tests/margin_smoke.py
```

### Arsip catatan (antologi/arsip/)

Semua tulisan berjenis *catatan* (Thought Log) dibaca di **aplikasi arsip**, tanpa ilustrasi. Satu halaman dipakai bersama; `works.json` menunjuk berkasnya lewat `#` (misalnya `antologi/arsip/index.html#thought-log-002-the-dissonant-shell`), dan situs utama meneruskan alamat itu.

- **Laci**: berkas-berkas urut menurut nomornya (001, 002, 003) dengan jam, jumlah paragraf, jumlah pertanyaan, dan statusnya (belum dibuka, dibaca sekian persen, selesai dibaca), catatan bahwa ketiganya ditulis dalam sembilan menit, dan garis waktu *Malam yang sama* yang menautkan ketiga puisi.
- **Lembar dokumen**: kepala arsip (nomor, tanggal dan jam, panjang, bahasa, pertanyaan), paragraf bernomor ¶, dan cap *Selesai dibaca* setelah sampai di akhir.
- **Indeks**: setiap kalimat tanya ditandai P1, P2, …; di indeks statusnya *terbuka* sampai paragraf sesudahnya dibaca, lalu *terjawab*. **Rujukan silang** membuka kata khas yang sama di berkas lain dan menandainya. **Riwayat akses** mencatat kapan berkas dibuka, di bawah baris *Diarsipkan · 19 Juli 2026 · Juan*.
- **Pintu**: berkas terakhir berakhir dengan *Just knock on the door.* Mengetuk tiga kali membuka **Berkas 004 · Ruangmu**, lembar kosong untuk pembaca sendiri yang hanya tersimpan di perangkatnya.
- Di layar lebar: laci, dokumen, dan indeks berdampingan; di ponsel: laci lalu dokumen, dengan indeks di dalam dokumen.

```bash
python3 tests/arsip_smoke.py
```

Halaman bagikan, metadata, 404, dan musik:

```bash
python3 tests/share_smoke.py
```

Pemeriksaan mencakup keutuhan naskah dua bahasa, setiap penanda acara, foto, dan kutipan, tautan situs utama dan status tamat, bulan yang mengikuti bacaan, jadwal ulang empat puluh tahun, tahun yang kosong, foto temuan, undangan dan jawaban Lila, jawaban yang diingat, pengingat, penanda baca dan bahasa, tata letak 320–1440 px, gerak tenang, pratinjau, kegagalan modul, dan tema.
