# juan/menulis

Meja tulis Juan dalam bentuk satu jendela aplikasi: esai, puisi, cerpen, dan fiksi mini yang bisa digeser, dibaca, dan didengarkan. Situs statis murni (HTML, CSS, JS), tanpa build step.

## Tampilan

- **Kanvas.** Permukaan abu yang bisa digeser dan dicubit-zoom. Tulisan tampil sebagai kertas bertumpuk, kumpulan sebagai map berlekuk, baris favorit sebagai catatan tempel lime, dan satu kartu gambar yang "dirajut" dari huruf-huruf cerpen. Semua objek bisa dipindah, dan posisinya diingat. Tombol **+** menambah catatan tempelmu sendiri.
- **Daftar.** Rak per jenis tulisan di atas, lalu daftar berkas dengan centang, ikon dokumen berlabel, dan map per tahun yang membuka secara bersarang. Setiap baris punya kolom "Tambah catatan…" pribadi. Pilih beberapa tulisan untuk **Baca berurutan**. Jatuhkan berkas `.txt` atau `.md` di mana saja untuk menambah tulisanmu sendiri (tersimpan hanya di peramban).
- **Pembaca.** Kartu baca dengan panel **Pengaturan Baca**: tema kertas (putih, sepia, gelap, warna sendiri), **Suara** (dibacakan), **Cari** di dalam tulisan, **Fokus**, penggeser ukuran dan kecerahan, **Tandai** posisi baca, dan **Layar** tetap menyala. **Teks · Atur** membuka **Pengaturan Lanjutan**: pratinjau, pilihan huruf, ukuran, ketebalan, ligatur, dan perataan.
- **Sapa.** Panel hitam berkartu biru: sapaan dengan ikon di dalam kalimat, kutipan yang bergilir, daftar baca, chip ganti latar dan mode gelap, serta kolom **Cari kalimat…** untuk mencari di semua tulisan.

Pintasan: `⌘K` atau `/` untuk cari, `←` `→` pindah tulisan di pembaca, `F` mode fokus, `Esc` kembali.

## Mengganti isi

Semua isi ada di `assets/works.js`:

- `SITE`: nama, email, dan catatan kecil untuk tiap map tahun.
- `WORKS`: daftar tulisan. Untuk puisi pakai `form: "puisi"` dan pisahkan baris dengan `\n`.

Tulisan yang ada sekarang adalah contoh. Ganti dengan karyamu sendiri.

## Menjalankan dan menerbitkan

```bash
python3 -m http.server 8000
```

Untuk GitHub Pages: Settings → Pages → Deploy from a branch → pilih branch dan folder `/ (root)`.
