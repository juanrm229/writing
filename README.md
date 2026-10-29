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
- **Sisi A dan Sisi B.** Di atas kertas ada sakelar **Sisi A / Sisi B**. Sisi A adalah tulisan utamanya. Sisi B adalah cerita yang sama dari sisi yang lain: tulis isinya, beri judul sendiri kalau mau (kosong = judul Sisi A), dan isi **dari sisi** siapa cerita itu dituturkan. Kolom *dari sisi* juga ada untuk Sisi A. Kosongkan semua isi Sisi B untuk menghapusnya. Tulisan yang punya dua sisi ditandai **A/B** di daftar.
- **Album.** Susun sisi-sisi menjadi playlist: beri judul dan catatan sampul, tambahkan Sisi A atau Sisi B dari daftar di kanan, lalu urutkan dengan menyeret atau tombol panah. Sampulnya mosaik otomatis dari empat sisi pertama. Kalau alamat tulisan diganti atau tulisannya dihapus, album ikut menyesuaikan. **Pratinjau** membuka album di situs sebelum disimpan.
- **Tampilan.** Judul situs, nama, sapaan untuk pembaca, email, foto profil, warna kartu sapa, latar dan tema bawaan, halaman pembuka (Piringan atau Sapa), huruf dan kertas bawaan, jenis tulisan (nama, label ikon, warna benang), serta fitur yang bisa dinyalakan atau dimatikan. Semua langsung terlihat di pratinjau desktop atau ponsel.
- **Riwayat.** 30 perubahan terakhir, masing-masing bisa dibuka di GitHub.

## Situs

- **Piringan (halaman awal).** Setiap tulisan adalah satu piringan hitam: esai berlabel warna, puisi berupa vinyl berwarna bercipratan, cerita berupa *picture disc* bergambar benang. Di atas ada jam dot-matrix dan nama situs dalam huruf titik-titik, lalu tumpukan piringan yang bisa digeser ke atas atau bawah, diacak, dan diketuk untuk dibaca. Di sebelahnya (di ponsel: di bawahnya) ada roda **Menit luang**: pilih punya berapa menit, dan tumpukan langsung tersusun ulang dengan tulisan yang paling pas di atas. Empat kontrol mengatur Bentuk (puisi/semua/prosa), Suasana, Ukuran huruf, dan Kertas, lalu **Putar** membuka tulisan dengan pengaturan itu. Halaman pembuka bisa diganti di admin.
- **Pilih piringan.** Ketuk piringan teratas (atau tombol kedua di pil navigasi) untuk membuka layar pemilih: bilah waktu di atas untuk menentukan mulai membaca dari menit ke berapa (tulisan yang pernah dibaca langsung menawarkan lanjut dari posisi terakhir, dan tiap sisi mengingat posisinya sendiri), piringan besar dua sisi, dan carousel piringan lain di lembar bawah. Piringan yang punya Sisi B diberi tanda **B**. Tombol headphone membuat tulisan **dibacakan** untukmu. **Yang ini!** membuka tulisan tepat di titik itu.
- **Album.** Tombol ketiga di pil navigasi membuka rak album: sampul mosaik dari seni benang, dengan piringan yang mengintip dari sampulnya. Di halaman album ada catatan sampul, daftar sisi dengan durasi dan cincin progres, serta tombol **Putar**, **Acak**, dan **Bagikan** (`#album-<alamat>`). Saat album diputar, pembaca menampilkan posisi di album (misalnya 2/4), tombol berikutnya dan `→` mengikuti urutan album, dan kartu di akhir tulisan menunjuk sisi berikutnya. Sapa juga menampilkan album yang sedang diputar.
- **Sisi B.** Setiap tulisan bisa punya Sisi B: cerita yang sama, dari sisi yang lain. Usap piringan, ketuk *Sisi B*, atau tekan `B` untuk membaliknya. Lengan pemutar terangkat saat piringan dibalik dan turun ke alur luar saat kamu menekan *Yang ini!*. Saat membaca, tombol **Sisi A/Sisi B** di atas dan kartu **Balik piringannya** di akhir tulisan membalik kartu baca seperti piringan. Sisi yang belum ditulis tampil sebagai piringan polos tanpa alur. Tautan langsung ke Sisi B: `#baca-<alamat>:b` atau `#pilih-<alamat>:b`.
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
- **Selesai satu sisi.** Saat kamu sampai di akhir Sisi A, muncul tawaran **Balik piringan** ke Sisi B, dan sebaliknya.

Pintasan: `⌘K` atau `/` cari, `←` `→` pindah tulisan, `B` balik sisi, `F` fokus, `Esc` kembali.

## Aplikasi (PWA)

Situs ini bisa dipasang di layar utama ponsel atau komputer dan dibaca tanpa sinyal.

- **Android dan Chrome/Edge di komputer:** chip **Pasang aplikasi** muncul di panel sapa, juga sebagai perintah di palet.
- **iPhone dan iPad:** buka di Safari, ketuk **Bagikan**, lalu **Tambahkan ke Layar Utama**. Chip *Pasang aplikasi* menampilkan petunjuk ini.
- **Offline:** `sw.js` menyimpan salinan halaman, kode, dan konten. Saat ada sinyal, tulisan terbaru selalu diambil dari jaringan. Saat tidak ada, salinan terakhir yang dipakai.
- **Nama aplikasi** mengikuti *Judul situs* dan *Nama penulis* di admin. `manifest.webmanifest` diperbarui otomatis saat kamu menyimpan.
- **Ikon** ada di `assets/icons/`. Ganti berkas PNG-nya dengan ukuran yang sama kalau ingin ikon lain.

## Menjalankan di komputer

```bash
python3 -m http.server 8000
```

Lalu buka <http://localhost:8000>. Konten dimuat dengan `fetch`, jadi membuka `index.html` langsung dari berkas tidak akan bekerja.
