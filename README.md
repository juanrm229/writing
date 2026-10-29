# juan/menulis

Meja tulis Juan dalam bentuk satu jendela aplikasi: esai, puisi, cerpen, dan fiksi mini yang bisa digeser, dibaca, dan didengarkan. Dilengkapi **panel admin** di `/admin` untuk menulis, menerbitkan, dan mengatur seluruh tampilan, dengan GitHub sebagai tempat penyimpanan. Tidak perlu server.

## Cara kerja

```
Kamu menulis di /admin  ──Simpan──▶  commit ke content/*.json di repo ini  ──▶  GitHub Pages memperbarui situs (±1 menit)
```

- `content/works.json`: semua tulisan.
- `content/site.json`: nama, warna, huruf, jenis tulisan, fitur, dan pengaturan lain.
- `content/layout.json`: posisi kertas, map, dan catatan di kanvas.
- `content/media/`: foto profil yang diunggah dari admin.

Setiap simpanan adalah commit, jadi semua versi tulisanmu tercatat dan bisa dikembalikan.

## Menyiapkan (sekali saja)

1. **Aktifkan GitHub Pages.** Repo → Settings → Pages → *Deploy from a branch* → pilih branch utama repo dan folder `/ (root)`. Situs akan ada di `https://<pemilik>.github.io/<repo>/`.
2. **Pastikan branch utama berisi kode ini.** Admin menyimpan ke *default branch* repo (bisa diganti di layar masuk, bagian *Lanjutan*). Branch yang di-deploy Pages harus sama dengan branch tempat admin menyimpan.
3. **Buat token GitHub.** Buka <https://github.com/settings/personal-access-tokens/new>, pilih *Only select repositories* → repo ini, lalu beri izin **Contents: Read and write**.
4. **Masuk ke `/admin`.** Isi pemilik repo, nama repo, dan token. Token hanya disimpan di peramban itu dan hanya dikirim ke `api.github.com`.

## Panel admin

- **Tulisan.** Daftar tulisan di kiri (cari, saring, draf), kertas untuk menulis di tengah, detail di kanan: terbit/draf, tampil di kanvas, jenis, prosa/puisi, tanggal, jam, alamat, ringkasan, baris favorit, dan hapus. Ada **tebal/miring** (`⌘B`/`⌘I`, ditulis sebagai `**tebal**` dan `*miring*`), tombol **Baris favorit** dari teks terpilih, **Fokus** untuk menulis tanpa gangguan, dan **Pratinjau** langsung di samping. Setiap perubahan dicadangkan di peramban sampai disimpan. `⌘S` untuk menyimpan.
- **Tampilan.** Judul situs, nama, sapaan untuk pembaca, email, foto profil, warna kartu sapa dan catatan tempel, latar dan tema bawaan, halaman pembuka, huruf dan kertas bawaan, jenis tulisan (nama, label ikon, warna benang), judul map di kanvas, catatan map tahun, serta fitur yang bisa dinyalakan atau dimatikan. Semua langsung terlihat di pratinjau desktop atau ponsel.
- **Tata letak kanvas.** Dari tab Tampilan, buka *Atur tata letak kanvas*. Situs terbuka dalam mode tata letak: seret objek lalu tekan **Simpan ke situs**.
- **Riwayat.** 30 perubahan terakhir, masing-masing bisa dibuka di GitHub.

## Situs

- **Piringan (halaman awal).** Setiap tulisan adalah satu piringan hitam: esai berlabel warna, puisi berupa vinyl berwarna bercipratan, cerita berupa *picture disc* bergambar benang. Di atas ada jam dot-matrix dan nama situs dalam huruf titik-titik, lalu tumpukan piringan yang bisa digeser ke atas atau bawah, diacak, dan diketuk untuk dibaca. Di sebelahnya (di ponsel: di bawahnya) ada roda **Menit luang**: pilih punya berapa menit, dan tumpukan langsung tersusun ulang dengan tulisan yang paling pas di atas. Empat kontrol mengatur Bentuk (puisi/semua/prosa), Suasana, Ukuran huruf, dan Kertas, lalu **Putar** membuka tulisan dengan pengaturan itu. Halaman pembuka bisa diganti di admin.
- **Benang merah.** Tombol merah di bilah atas menarik benang sungguhan antar-kertas di kanvas, ala papan detektif. Benangnya menghubungkan tulisan-tulisan yang berbagi kata khas (dihitung dengan TF-IDF langsung di peramban), dengan kata penghubungnya tertulis di benang. Sorot satu kertas untuk menyorot benangnya. Di akhir setiap tulisan ada daftar tulisan yang terhubung.
- **Membaca = merajut.** Di pojok kartu baca, seni benang tulisan itu terajut sedikit demi sedikit sesuai seberapa jauh kamu membaca.
- **Saksikan ditulis.** Tulisan diketik ulang di depan pembaca dengan ritme alami (jeda di tanda baca, sesekali salah ketik yang dihapus lalu diperbaiki). Bisa dijeda, dipercepat 2× atau 4×, atau dilewati.
- **Kartu kutipan.** Pilih kalimat mana pun untuk membuat gambar kutipan (empat warna) lalu bagikan langsung ke aplikasi lain di ponsel, unduh, atau salin. Tombol bagikan di atas pembaca mengirim tautan tulisan.
- **Suasana.** Pengaturan Lanjutan → Suasana: hujan, ombak, atau perapian, disintesis dengan Web Audio tanpa berkas suara.
- **Hidup mengikuti jam.** Sapaan berganti (pagi, siang, sore, malam) dan wallpaper *Ikut jam* berubah dari fajar ke malam. Di kanvas ada lampu meja yang mengikuti kursor, dan kertas miring 3D saat disorot.
- **Palet perintah.** `⌘K` lalu ketik `>` untuk menjalankan perintah: benang merah, mode gelap, tulisan acak, ganti latar, pasang aplikasi.

- **Kanvas.** Kertas bertumpuk, map berlekuk, catatan tempel, dan kartu benang yang bisa digeser (dengan inersia), dicubit-zoom, dan diklik ganda untuk memperbesar.
- **Daftar.** Rak per jenis, centang, map per tahun, catatan pribadi per tulisan, dan *Baca berurutan*.
- **Pembaca.** Tema kertas, Suara, Cari, Fokus, ukuran, kecerahan, Tandai, Layar menyala, serta Pengaturan Lanjutan (huruf, ketebalan, ligatur, perataan).
- **Sapa.** Kartu biru yang bisa diciutkan, kutipan bergilir, daftar baca, ganti latar, mode gelap, dan *Cari kalimat…*.

Pintasan: `⌘K` atau `/` cari, `←` `→` pindah tulisan, `F` fokus, `Esc` kembali.

## Aplikasi (PWA)

Situs ini bisa dipasang di layar utama ponsel atau komputer dan dibaca tanpa sinyal.

- **Android dan Chrome/Edge di komputer:** tombol **Pasang di layar utama** muncul di kartu profil (tampilan Daftar) dan chip **Pasang aplikasi** di panel sapa.
- **iPhone dan iPad:** buka di Safari, ketuk **Bagikan**, lalu **Tambahkan ke Layar Utama**. Situs menampilkan petunjuk ini sendiri.
- **Offline:** `sw.js` menyimpan salinan halaman, kode, dan konten. Saat ada sinyal, tulisan terbaru selalu diambil dari jaringan. Saat tidak ada, salinan terakhir yang dipakai.
- **Nama aplikasi** mengikuti *Judul situs* dan *Nama penulis* di admin. `manifest.webmanifest` diperbarui otomatis saat kamu menyimpan.
- **Ikon** ada di `assets/icons/`. Ganti berkas PNG-nya dengan ukuran yang sama kalau ingin ikon lain.

## Menjalankan di komputer

```bash
python3 -m http.server 8000
```

Lalu buka <http://localhost:8000>. Konten dimuat dengan `fetch`, jadi membuka `index.html` langsung dari berkas tidak akan bekerja.
