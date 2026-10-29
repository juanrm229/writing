# juan/menulis

Situs pameran tulisan: esai, puisi, cerpen, fiksi mini, dan catatan. Statis murni (HTML, CSS, JS), tanpa build step dan tanpa dependensi selain Google Fonts.

## Yang ada di dalamnya

- **Sampul benang.** Setiap sampul digambar dari teks tulisannya sendiri: 26 huruf disusun melingkar, lalu benang ditarik dari huruf ke huruf mengikuti urutan teks. Tidak ada dua tulisan yang sampulnya sama.
- **Judul yang direvisi.** Judul beranda mengetik, mencoret, dan menulis ulang dirinya sendiri, dengan riwayat revisinya terlihat di bawahnya.
- **Tumpukan kartu.** Lima tulisan terbaru bisa diseret dan disingkirkan seperti kartu.
- **Pembaca imersif.** Bilah kemajuan, ukuran huruf, kertas (putih, sepia, malam), mode fokus yang meredupkan paragraf lain, dan **Dengarkan** (Web Speech, bahasa Indonesia). Pilih kalimat mana pun untuk membuat **kartu kutipan** PNG.
- **Anatomi.** Indeks napas (ragam kata, ritme, kejernihan, kepadatan), ritme kalimat sebagai gelombang, kata yang sering kembali, dan peta benang berlabel. Pengunjung bisa menempel tulisannya sendiri; semua dihitung di peramban.
- **Ruang main.** *Puisi hitam* (blackout poetry dari paragraf di situs) dan *Benangmu* (seni benang dari teks apa pun, bisa diunduh).
- **Pencarian** `⌘K` atau `/` di seluruh isi tulisan, **garis waktu** perjalanan menulis, pulau "sedang menulis", tema terang/gelap, dan formulir surat.

Pintasan di pembaca: `←` `→` pindah tulisan, `F` mode fokus, `Esc` tutup.

## Mengganti isi

Semua isi ada di `assets/works.js`:

- `SITE`: nama, email (masih `juan@example.com`, ganti dengan alamat asli), proyek yang sedang ditulis, dan garis waktu.
- `WORKS`: daftar tulisan. Untuk puisi, pakai `form: "puisi"` dan pisahkan baris dengan `\n`.

Tulisan dan garis waktu yang ada sekarang adalah contoh. Ganti dengan karyamu sendiri.

## Menjalankan dan menerbitkan

Buka `index.html` langsung, atau jalankan server lokal:

```bash
python3 -m http.server 8000
```

Untuk GitHub Pages: Settings → Pages → Deploy from a branch → pilih branch dan folder `/ (root)`.
