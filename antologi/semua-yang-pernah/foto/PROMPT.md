# Prompt gambar: Semua yang Pernah

Semua gambar yang dibutuhkan layar ponsel di *Semua yang Pernah*, dengan prompt siap pakai.

- Prompt ditulis dalam bahasa Inggris karena kebanyakan model gambar paling patuh pada bahasa Inggris.
- Penjelasannya dalam bahasa Indonesia.
- Tiap gambar dimulai dengan **nama berkas**. Simpan dengan nama itu (JPG atau PNG), lalu kirim ke saya; saya yang memasangnya ke halaman.

---

## A. Cara memakai prompt ini supaya konsisten

1. **Buat dulu lembar referensi tokoh (bagian C).** Simpan hasil terbaik tiap tokoh.
2. **Pakai lembar referensi itu sebagai acuan wajah** setiap kali tokoh tersebut muncul:
   - Midjourney: `--cref <url> --cw 80`
   - ChatGPT/DALL·E dan Gemini: lampirkan gambarnya, lalu tulis "same person as the attached reference".
   - Stable Diffusion: IP-Adapter atau LoRA.
3. **Selalu tempelkan dua blok bersama prompt:**
   - **Blok gaya** (bagian B) yang sesuai jenis fotonya.
   - **Blok tokoh** (bagian C) untuk setiap tokoh yang muncul.
4. **Jangan ada teks di gambar.** Judul, nama, dan tulisan layar saya tambahkan lewat HTML. Kalau model tetap menulis sesuatu, ulangi atau hapus.
5. **Ukuran:** sisi terpanjang cukup 1200–1600 px. Saya akan mengecilkannya sendiri.

**Negatif umum** (tempel di kolom *negative prompt*, atau tambahkan "Avoid: …" di akhir prompt):

```
text, letters, captions, watermark, logo, signature, UI elements, frames, borders, extra fingers, deformed hands, plastic skin, airbrushed, oversaturated, HDR, cinematic color grading, studio glamour lighting, fantasy, sci-fi glow, illustration style (unless asked)
```

---

## B. Blok gaya

Tempel salah satu blok ini di akhir setiap prompt.

**[GAYA-PONSEL]** untuk foto masa kini yang diambil dengan ponsel:
```
Shot on a recent smartphone, natural available light, slightly imperfect framing, mild noise in the shadows, realistic white balance, true-to-life skin texture, unretouched, candid, documentary, not a stock photo.
```

**[GAYA-MALAM]** untuk foto ponsel malam hari:
```
Smartphone night mode photo, handheld, sodium and LED street lights, soft motion blur in moving lights, deep shadows, visible noise, honest and unglamorous.
```

**[GAYA-1903]** untuk foto lama awal abad ke-20:
```
Authentic early 1900s gelatin silver print, orthochromatic film look, slight vignetting, soft focus at the edges, silver mirroring and foxing on the paper, scratches and dust, warm sepia toning, people standing stiffly for a long exposure.
```

**[GAYA-1936]** untuk foto keluarga 1930-an:
```
Authentic 1930s black-and-white family photograph, medium format, gentle studio light or bright overcast daylight, fine grain, matte paper, slightly faded, real people with ordinary clothes of the period.
```

**[GAYA-1978]** untuk foto berwarna akhir 1970-an:
```
Late 1970s colour print, faded magenta-orange cast, soft lens, slight film grain, rounded corners of a 3R print.
```

**[GAYA-MUSEUM]** untuk benda koleksi museum:
```
Museum collection photograph, neutral grey or black backdrop, soft even studio light, sharp focus, true colours, a small scale bar is NOT included, no labels.
```

**[GAYA-PINDAI]** untuk kertas yang dipindai atau difoto dari atas:
```
Flat top-down scan of a real paper object on a neutral surface, even light, visible paper fibres and creases, true colours.
```

---

## C. Tokoh (lembar referensi dan blok tokoh)

Ciri yang tertulis di novella sudah saya ikuti. Selebihnya (warna rambut, asal-usul, pakaian) adalah usulan saya yang tidak bertentangan dengan teks; silakan ubah. Kalau mengubahnya, ubah juga di blok tokoh supaya semua gambar tetap sama.

Untuk lembar referensi, buat satu gambar per tokoh dengan prompt di bawah. Pilih hasil terbaik, lalu pakai sebagai acuan wajah.

### Elias Venn
Dari teks: tampak awal tiga puluhan (dokumen: 38). Gitaris ritme dan penulis lagu Hollow Atlas. Pertumbuhannya berhenti di usia itu; wajahnya sama di foto 1903, 1936, dan sekarang. Ia berdiri di belakang orang lain di foto. Tingginya biasa (bukan yang tertinggi, Jonah yang tertinggi).

**[ELIAS]**
```
Elias: a man who looks 33, ethnically ambiguous (could be from almost anywhere), warm olive-brown skin, straight dark brown hair worn slightly long and pushed back behind the ears, a few strands falling forward, grey-brown eyes that look older than the face, straight dark eyebrows, faint stubble, lean build, 180 cm, long guitarist's fingers, a calm, watchful stillness, slight crease between the eyebrows. Usually wears a plain charcoal overshirt over a dark t-shirt.
```
Lembar referensi:
```
Character reference sheet, one person, three views side by side: front, three-quarter, profile. Neutral grey background, soft daylight. [ELIAS] Neutral expression, relaxed shoulders. Photorealistic.
```

### Mara
Dari teks: vokalis dan penulis lagu, kadang memegang gitar. Rambutnya sebagian menutupi wajah di panggilan video. Punya buku catatan bersampul merah. Saat kaget ia menekan lidah ke pipi kanan bagian dalam. Ibunya mengajari perempuan-perempuan bernyanyi. Bisa bahasa Indonesia dan Inggris. Usulan: berdarah Indonesia, besar di Skotlandia.

**[MARA]**
```
Mara: a woman of 37, Indonesian heritage raised in Scotland, medium brown skin, thick dark wavy hair to the shoulders that keeps falling over one side of her face, strong expressive eyebrows, dark brown eyes, small silver hoop in one ear, a mouth that looks like it is about to argue or laugh. Wears an oversized faded black sweater with pushed-up sleeves, a thin silver ring on her right index finger. Often has a worn red cloth notebook nearby.
```
Lembar referensi:
```
Character reference sheet, one person, three views: front, three-quarter, profile. Neutral grey background, soft daylight. [MARA] Neutral expression with a trace of amusement. Photorealistic.
```

### Jonah
Dari teks: drummer, **yang paling tinggi** di band. Memotong rambutnya sendiri. Sering meninggalkan jaket; di sakunya ada foto ibunya. Ritual: menepuk tiang panggung dua kali dan memaki teman khayalan bernama Dennis. Memilih nama Hollow Atlas di sebuah bar di Glasgow.

**[JONAH]**
```
Jonah: a Scottish man of 39, very tall (195 cm), broad shoulders, pale freckled skin, ginger-brown hair visibly cut by himself (uneven fringe, one side shorter), short ginger beard, light blue eyes, big drummer's hands with taped knuckles, a goofy warm grin. Always in an old olive-green canvas work jacket with a sagging left pocket.
```
Lembar referensi:
```
Character reference sheet, one person, three views: front, three-quarter, profile. Neutral grey background, soft daylight. [JONAH] Neutral face, then a half-grin in the three-quarter view. Photorealistic.
```

### Yuna
Dari teks: pemain bass. Menyetel bass yang sudah disetel untuk menenangkan tangan. Sepatu panggungnya menyakitkan. Punya anak kecil (pernah demam). Tenang dan jujur soal kebutuhannya sendiri. Usulan: berdarah Korea, besar di Glasgow.

**[YUNA]**
```
Yuna: a woman of 36, Korean heritage raised in Glasgow, light skin with warm undertone, straight black hair in a blunt chin-length bob with a short fringe, calm dark eyes, unbothered expression, small mole under the left eye. Wears a dark denim jacket over a white t-shirt, black stage boots with a slight heel, plain watch on a leather strap.
```
Lembar referensi:
```
Character reference sheet, one person, three views: front, three-quarter, profile. Neutral grey background, soft daylight. [YUNA] Calm, direct look. Photorealistic.
```

### Soren
Dari teks: manajer band. Datang dengan laptop dan wajah orang yang baru berdebat di telepon. Suka bercanda soal "nada rapat".

**[SOREN]**
```
Soren: a Danish man of 52, tall and thin, short grey hair, neatly trimmed grey beard, rectangular tortoiseshell glasses, tired but kind blue eyes, slightly rumpled navy blazer over a grey knit polo, always a laptop under one arm or a phone at his ear.
```
Lembar referensi:
```
Character reference sheet, one person, three views: front, three-quarter, profile. Neutral grey background, soft daylight. [SOREN] Patient expression. Photorealistic.
```

### Tokoh Saujana

Tidak perlu lembar referensi; cukup tempel bloknya.

**[TIO]**
```
Tio: an Indonesian man of 46, former motorcycle mechanic, wiry, sun-darkened brown skin, short black hair greying at the temples, thin moustache, laugh lines, faded batik-pattern short-sleeve shirt over a t-shirt, an old acoustic guitar with a worn pickguard and a cloth tied to the headstock.
```
**[SURI]**
```
Suri: an Indonesian woman around 40, photo restorer, practical and dry-humoured, hair tied in a low bun with a pencil stuck in it, reading glasses pushed up on her head, cotton apron with ink and dust marks, cotton gloves.
```
**[LELA]**
```
Ibu Lela: an Indonesian woman of 72, small, upright, soft wrinkles around eyes from laughing, grey hair under a loosely tied light-blue headscarf, floral blouse, holding an old ladies' wristwatch with a broken strap.
```
**[HAMDAN]**
```
Hamdan: an Indonesian fisherman in his sixties, very dark sun-weathered skin, white stubble, faded cap, rolled-up trousers, sitting on the edge of an old wooden pier with a simple bamboo fishing rod and a plastic bucket.
```
**[ALMA]**
```
Dr. Alma Riedel: a German physicist in her early sixties (in 2012), cropped silver hair, sharp light-grey eyes, no make-up, oversized wool cardigan, pen behind the ear, a habit of drawing circles on napkins.
```

### Tokoh masa lampau

Hanya dipakai pada benda atau foto lama.

**[ADA]**
```
Ada: a European woman around 30 in the 1900s, runs a small cloth and thread shop, dark hair pinned up, sharp intelligent face, high-collared working blouse, tape measure around her neck, scissors in hand.
```

---

## D. Daftar gambar

Kolom **Dipakai** menyebut bab dan tempat gambar itu muncul. Gambar bertanda ★ menggantikan foto Wikimedia yang sekarang dipakai. Gambar bertanda ✚ adalah tempat baru yang akan saya tambahkan begitu gambarnya ada.

### D1. Foto profil kontak (1:1)

Dipakai di Pesan, Telepon, panggilan video, dan daftar kontak; sekarang masih inisial huruf. Semuanya foto ponsel biasa, potong bahu ke atas, bukan potret studio.

| Berkas | Dipakai | Prompt |
|---|---|---|
| `av-mara.jpg` ✚ | Pesan, Telepon (Elias) | `Square profile photo, head and shoulders. [MARA] laughing mid-sentence, hair falling over her right eye, in a cramped rehearsal room with egg-crate foam on the wall behind her. [GAYA-PONSEL]` |
| `av-jonah.jpg` ✚ | Pesan, grup | `Square profile photo, head and shoulders. [JONAH] pulling an exaggerated serious face for the camera, drumsticks crossed in front of his chest, backstage corridor. [GAYA-PONSEL]` |
| `av-yuna.jpg` ✚ | Pesan | `Square profile photo, head and shoulders. [YUNA] sitting on a dressing-room floor tuning a bass guitar, looking up at the camera unimpressed. [GAYA-PONSEL]` |
| `av-soren.jpg` ✚ | Pesan, Surel, Telepon | `Square profile photo, head and shoulders. [SOREN] on a train, phone at his ear, polite half-smile at whoever took the photo. [GAYA-PONSEL]` |
| `av-hollowatlas.jpg` ✚ | Grup "Hollow Atlas" | `Square photo, four people squeezed into one frame on a narrow tour-van bench: [JONAH] at the back (tallest, head touching the roof), [MARA] in the middle, [YUNA] asleep against the window, [ELIAS] at the edge, half turned away. Night, interior van light. [GAYA-MALAM]` |
| `av-eli.jpg` ✚ | Ponsel Mara (bab 11, 27): kontak "Eli" | `Square profile photo, head and shoulders. [ELIAS] caught off guard, squinting into low afternoon sun, guitar strap over his shoulder, outside a venue. Taken by a friend. [GAYA-PONSEL]` |
| `av-tio.jpg` ✚ | Pesan "Tio Jalan Layang" | `Square profile photo. [TIO] grinning with his guitar under a concrete flyover, motorbikes blurred behind. [GAYA-PONSEL]` |
| `av-suri.jpg` ✚ | Pesan "Suri" | `Square profile photo. [SURI] holding a loupe to her eye in her photo-restoration studio, wry look. [GAYA-PONSEL]` |
| `av-alma.jpg` ✚ | Pesan "Alma Riedel" | `Square profile photo. [ALMA] at her university office window, cardigan, unsmiling but kind. [GAYA-PONSEL]` |

### D2. Latar layar (9:19.5, tegak)

| Berkas | Dipakai | Prompt |
|---|---|---|
| `wall-kunci.jpg` ★ | Layar terkunci Elias, sepanjang novella | `Vertical phone wallpaper. View from an 11th-floor hotel window at night over a tropical port city: harbour lights like scattered dots that have not agreed on their places, ship lights, warehouse lamps, a ring road with moving headlights, dark sea at the top third. Faint reflection of the room lamp in the glass. [GAYA-MALAM]` |
| `wall-beranda.jpg` ✚ | Beranda ponsel Elias | `Vertical phone wallpaper, soft and dark enough for white icons: blurred close-up of the sea surface at dusk, deep blue with a single warm streak of light. Minimal, calm. [GAYA-PONSEL]` |
| `wall-mara.jpg` ✚ | Layar terkunci ponsel Mara (bab 11, 27) | `Vertical phone wallpaper. An old upright piano in a modest Indonesian living room, hymn and folk songbooks stacked on top, afternoon light through lace curtains. This is her late mother's piano. [GAYA-PONSEL]` |

### D3. Hollow Atlas (masa kini dan kenangan)

| Berkas | Dipakai | Prompt |
|---|---|---|
| `penonton.jpg` ★ | Bab 1: "Malam terakhir. Dikirim seseorang dari kru." | `Photo taken from behind the drum riser on the last night of a tour: [JONAH] from behind at the drum kit, [MARA] at the front mic as a silhouette, [YUNA] at stage left with bass, [ELIAS] at stage right with guitar, all backlit. Beyond them a sea of tens of thousands of raised phone screens and arms. [GAYA-MALAM]` |
| `tangga-band.jpg` ✚ | Bab 1 (foto di tangga toko musik) dan Bab 2 (Kenangan: "10 tahun lalu") | `Ten years earlier. The four band members sitting on narrow, worn wooden stairs that lead up from a second-hand music shop in Glasgow: [JONAH] (younger, hair self-cut even worse) on the top step, [YUNA] (younger, longer hair) holding a bass case, [MARA] (younger, red notebook on her knees), [ELIAS] on the third step from the bottom, looking exactly the same age as now. Cheap flash, slightly overexposed faces. [GAYA-PONSEL]` |
| `sabun.jpg` ★ | Bab 1: Elias membalas Mara dengan foto sabun hotel | `A small wrapped hotel soap bar on the edge of a white bathroom sink, paper wrapper with no visible logo, hotel bathroom light. Shot as a deadpan joke reply. [GAYA-PONSEL]` |
| `jaket-jonah.jpg` ✚ | Bab 1: grup, "FOUND IT" | `An olive-green canvas jacket draped over the armrest of an airline seat in an empty cabin after landing, a creased small photograph folded in the corner of the left pocket. Cabin crew light. [GAYA-PONSEL]` |
| `studio-kabel.jpg` ★ | Bab 25: Jonah mengirim foto studio | `A small band rehearsal studio after a reshuffle: the drum kit pushed against the wall, a cardboard box full of tangled XLR cables in the corner waiting to be labelled, masking tape and a marker on top. [GAYA-PONSEL]` |
| `jonah-lega.jpg` ✚ | Bab 25: "Wajah Jonah, lega secara berlebihan" | `Close selfie of [JONAH] making an exaggerated face of relief: eyes closed, head thrown back, hand on his heart, in the same rehearsal studio. [GAYA-PONSEL]` |
| `mara-video.jpg` ✚ | Bab 10: panggilan video Mara (latar layar) | `Front camera video-call frame (vertical): [MARA] at her small home workspace in the evening, face partly covered by her hair, desk lamp, an acoustic guitar leaning against the wall behind her, a red notebook open on the desk. Slightly soft focus, webcam-like. [GAYA-PONSEL]` |
| `partitur.jpg` ★ | Bab 31: partitur dengan coretan Jonah | `Top-down photo of a handwritten music score on a rehearsal-room table, pencil markings, a coffee ring. At the bottom, next to a pianissimo marking, a small doodle of a face with a hugely wide-open mouth, drawn in blue ballpoint. [GAYA-PONSEL]` |
| `gambar-anak-yuna.jpg` ✚ | Bab 29: "Apparently you're the tall one" | `A child's crayon drawing (age 6) of a concert: a stage with four stick-figure musicians, a drum kit, a bass, a microphone, a guitar. The guitar player is drawn much taller than the others. Coloured lights as scribbles above. Photographed on a kitchen table. [GAYA-PONSEL]` |
| `mara-latihan.jpg` ✚ | Bab 27 (ponsel Mara): latihan tanpa Elias | `Rehearsal room, late afternoon: [JONAH] at the drums, [YUNA] with bass, [MARA] holding Elias's rhythm guitar and looking down at her own fingers on the chords. An empty guitar stand where Elias would stand. [GAYA-PONSEL]` |

### D4. Saujana

| Berkas | Dipakai | Prompt |
|---|---|---|
| `amplop.jpg` ★ | Bab 7: amplop tanpa pengirim | `A thick padded envelope with one dented corner lying on a hotel desk by the window, handwritten address area left blank (no readable text), no stamps, hotel room key card beside it. [GAYA-PONSEL]` |
| `foto-1903-cetak.jpg` ✚ | Bab 7: isi amplop | `A modern glossy print of an old 1903 group photograph (see percetakan-1903) lying on a hotel desk, slightly curled, the back of a second print visible next to it with a handwritten line in blue ink (illegible). [GAYA-PONSEL]` |
| `makan.jpg` ★ | Bab 5: "Nasi, sup, telur." | `Room-service meal at 2 a.m. on a hotel desk: a bowl of white rice, a bowl of clear chicken soup with a little spilled down the side of the container, a fried egg on a small plate, plastic lid set aside, desk lamp light. [GAYA-MALAM]` |
| `gang.jpg` ★ | Bab 7: Kampung Bandeng | `A very narrow straight alley in a dense Indonesian fishing neighbourhood at dawn, barely wide enough for two people, laundry hanging across overhead, potted plants, a parked motorbike, wet concrete, the far end opening to a brighter street. [GAYA-PONSEL]` |
| `halte.jpg` ✚ | Bab 7: halte yang jadwalnya berakhir | `An old bus shelter with a leaking roof, a faded timetable on the wall (no readable text), a moving-company phone number sticker, empty bench, morning. [GAYA-PONSEL]` |
| `lela-jam.jpg` ✚ | Bab 8: Ibu Lela dan baterai | `Close-up of [LELA]'s hands holding an old ladies' gold-tone wristwatch with a broken leather strap, in front of a small watch-parts shop counter with empty battery racks. [GAYA-PONSEL]` |
| `studio-suri.jpg` ✚ | Bab 9: studio restorasi | `Small photo-restoration studio above a frame workshop: [SURI] at a light table with a damaged family photograph under a loupe, a slightly crooked shop sign visible through the window, frames stacked by the narrow stairs. [GAYA-PONSEL]` |
| `printer.jpg` ★ | Bab 9: printer macet | `An office inkjet photo printer with a sheet of photo paper jammed and folded in the middle, sticking out of the tray. [GAYA-PONSEL]` |
| `pena.jpg` ★ | Bab 9: pena yang tidak cocok | `A cheap fountain pen lying across a restoration care sheet on a desk, ink smudge on the paper. [GAYA-PONSEL]` |
| `tio.jpg` ✚ | Bab 14: bawah jalan layang | `[TIO] busking under an old concrete flyover in the late afternoon, open guitar case with small banknotes and coins, a few street vendors nearby, traffic noise implied by blur. [GAYA-PONSEL]` |
| `undangan.jpg` ✚ | Bab 14: undangan sekolah | `A school event invitation made by a child: folded paper with crayon flowers and a sun, photographed on a plastic tablecloth. No readable text. [GAYA-PONSEL]` |
| `terminal.jpg` ★ | Bab 12: terminal saat hujan | `A small regional bus terminal at night in heavy rain, wet tiled floor, a few people waiting on plastic chairs, a hot drinks stall, a young woman holding a missing-person leaflet face-down. [GAYA-MALAM]` |
| `peta-lama.jpg` ★ | Bab 21: papan peta di kantor | `An old printed city map pinned to an office wall near a door, yellowed, one street line marked with red marker and a small sticky note. Hard hats stacked below. [GAYA-PONSEL]` |
| `pegawai-pemetaan.jpg` ✚ | Bab 20: foto lama di meja Wulan | `A framed 1990s colour photo of five mapping-office employees in front of stacked map boards; one man stands slightly apart from the group with a serious face. Photographed in its frame on a desk next to a computer. [GAYA-1978]` |
| `dermaga.jpg` ★ | Bab 24: Dermaga 7 | `An old disused wooden pier at dusk, low tide, high-water marks on the pilings, [HAMDAN] sitting on the edge with a fishing rod, seen from behind at a distance, a single lamp coming on. [GAYA-MALAM]` |
| `toko-roti.jpg` ✚ | Bab 30: Toko Roti Sinar | `A narrow closed shopfront between an electronics shop and a motorbike repair shop, frosted glass, the faint outline of old removed letters still visible on the wall above (letters illegible), a worker cleaning the glass in circles. [GAYA-PONSEL]` |
| `roti.jpg` ✚ | Bab 30: roti sobek cokelat | `A half-eaten pull-apart chocolate bread in a paper wrapper on a bench next to a bus stop, afternoon. [GAYA-PONSEL]` |

### D5. Foto lama dengan Elias di dalamnya

Ini yang paling penting untuk konsistensi: wajah Elias di foto-foto ini harus sama persis dengan lembar referensinya.

| Berkas | Dipakai | Prompt |
|---|---|---|
| `percetakan-1903.jpg` ★ | Bab 7, 16, video penggemar, forum | `1903 group photograph inside a European print shop: eight workers in aprons arranged around a composing table. A young printer at the front grinning, about to celebrate the birth of his child. At the far edge a woman half out of the frame, refusing to step in because her dress is stained with ink. In the back row, slightly out of place after helping lift the table, stands [ELIAS] in 1903 work clothes, exactly the same face as today. [GAYA-1903]` |
| `keluarga-1936.jpg` ★ | Bab 9 (sebelum dipulihkan) | `1936 family photograph in front of a modest house: [ELIAS] in a 1930s suit, his wife beside him smiling faintly, her sister looking off to the left, a neighbour's child in front trying very hard to stay still. The print is water-damaged: brown tide marks along the edges and a sharp crack running across the man's face. [GAYA-1936]` |
| `keluarga-1936-pulih.jpg` ✚ | Bab 9 (sesudah dipulihkan) dan Bab 26 (pameran) | `The same 1936 family photograph after careful conservative restoration: edges cleaned, tones even, but the thin crack across the man's face deliberately left visible. Identical composition to keluarga-1936. [GAYA-1936]` |
| `pernikahan-1978.jpg` ✚ | Bab 9: pesanan keluarga | `1978 wedding portrait of a young Indonesian couple in traditional dress. Water damage: half of the bride's face is a white blotch with brownish edges, while the groom's face is still clear. [GAYA-1978]` |
| `toko-ada.jpg` ★ | Bab 16: kota industri | `Early 1900s street in a European industrial town, smoke from factory chimneys, muddy cobblestones. A small cloth and thread shop in the foreground with bolts of fabric in the window; [ADA] in the doorway, [ELIAS] beside her slightly turned away. [GAYA-1903]` |
| `surat-ada.jpg` ★ | Bab 16: surat Ada | `A handwritten letter from around 1910, one page, slanted cursive in brown ink (illegible), a small weather note in the margin, folded creases. [GAYA-PINDAI]` |
| `amplop-ada.jpg` ★ | Bab 17: amplop surat Ada | `An early 1900s envelope with a faded postage stamp and postmark, handwritten address in brown ink (illegible), soft worn corners. [GAYA-PINDAI]` |
| `kaset.jpg` ★ | Bab 22: kaset yang ditandatangani | `An old music cassette with its tape slightly stretched and a visible repaired spot, a hand-written signature in marker across the label (illegible), next to a battered acoustic guitar case. [GAYA-PONSEL]` |

### D6. Museum dan ensiklopedia (masa purba)

| Berkas | Dipakai | Prompt |
|---|---|---|
| `batu-mirip.jpg` ★ | Bab 2: hasil pencarian "batu abu-abu kehijauan tiga garis putih" (yang **bukan** batunya) | `A smooth grey-green river pebble with two thin white quartz lines (only two, not three), on wet sand at the edge of shallow water. [GAYA-PONSEL]` |
| `batu-mirip-2.jpg` ✚ | Bab 2: hasil pencarian kedua | `A polished green agate stone with three white bands, shiny and commercial, on a velvet display tray in a gemstone shop. [GAYA-PONSEL]` |
| `alat-batu.jpg` ★ | Bab 2: museum, alat genggam | `A Middle Palaeolithic flint hand tool, one edge carefully retouched and smoothed from long use. [GAYA-MUSEUM]` |
| `lempeng.jpg` ★ | Bab 3: catatan pembagian biji-bijian | `A small proto-cuneiform clay tablet with tally marks and simple pictographic signs for grain, fingerprint impressions at the edge. [GAYA-MUSEUM]` |
| `naskah-lasa.jpg` ★ | Bab 3: Naskah Lasa | `A fragment of an ancient handwritten manuscript in an invented script, written by a left-handed scribe: letters lean slightly to the left, with a short note squeezed into the right margin in the same hand. Brown ink on aged material. [GAYA-MUSEUM]` |
| `koin-sang-adil.jpg` ★ | Bab 4: koin Sang Adil | `An ancient worn bronze coin showing a man's profile portrait, recognisably the same face as [ELIAS] (straight nose, calm mouth), stylised in ancient die-engraving, the reverse with a simple river and bridge motif shown beside it. [GAYA-MUSEUM]` |
| `pintu-air-sira.jpg` ★ | Bab 4: Pintu Air Sira | `Ruins of an ancient stone-and-timber sluice gate on a river embankment, some wooden parts replaced in later centuries, water flowing through a newer channel, overcast daylight. [GAYA-PONSEL]` |
| `buku-rekening.jpg` ★ | Bab 4: buku rekening pedagang | `An old merchant's account book open on a table, columns of debts neatly crossed out by a patient hand, one corner of the pages charred by fire. [GAYA-MUSEUM]` |
| `guci-obat.jpg` ★ | Bab 5: pengobatan sebelum teori kuman | `Three old ceramic apothecary jars from a plague-era pharmacy, chipped glaze, on a dark shelf. [GAYA-MUSEUM]` |
| `lukisan-1761.jpg` ✚ | Bab 1: video penggemar ("lukisan pelabuhan 1761") | `An 18th-century oil painting of a harbour with sailing ships; among the dockworkers in the foreground a small, blurry figure whose face cannot be made out. Cracked varnish. Photographed in a museum. [GAYA-MUSEUM]` |

### D7. Gambar mini video dan halaman web (16:9)

| Berkas | Dipakai | Prompt |
|---|---|---|
| `vid-timeline.jpg` ✚ | Bab 1: *THE ELIAS VENN TIMELINE CANNOT BE REAL* | `YouTube-style conspiracy video thumbnail composition without any text: three images side by side, a 1903 sepia group photo with one face circled in red, a blurry 18th-century harbour painting with a red arrow, and a modern stage photo of [ELIAS] playing guitar under blue light. Dramatic but cheap-looking. Red circles and arrows only.` |
| `vid-piano.jpg` ✚ | Bab 22: anak bermain piano | `Home video frame: a girl around 9 seen from behind at an upright piano in a living room, her father in the background on the sofa nodding proudly, warm lamp light. Faces not clearly visible. [GAYA-PONSEL]` |
| `wiki-elias.jpg` ✚ | Wiki penggemar (Prolog, Bab 1) | `Press photo from a festival: [ELIAS] on stage playing a rhythm guitar, eyes down, slightly motion-blurred, stage haze, shot from the photo pit. [GAYA-MALAM]` |
| `album.jpg` ✚ | Musik: *Low Tide Hymns* | `Square album cover: a low-tide harbour at dawn, wooden pilings and wet mud reflecting a pale sky, one small cup left on a post. Muted, quiet, photographic, generous empty space, no text.` |
| `alma-artikel.jpg` ✚ | Bab 6: artikel 2012 | `Editorial portrait for a 2012 science magazine: [ALMA] in a café, drawing circles on a paper napkin with a pen while explaining something, coffee cup, window light. [GAYA-PONSEL]` |
| `vid-bluedot.jpg` ✚ | Bab 24: *I followed the blue dot to Pier 7* | `First-person view of a hand holding a phone at dusk on an old wooden pier; the phone screen shows only a white map with a single blue dot (no text). Sea and pilings beyond. [GAYA-MALAM]` |

---

## E. Urutan yang saya sarankan

1. **Lembar referensi (C):** Elias, Mara, Jonah, Yuna, Soren.
2. **Foto yang memuat tokoh:** `tangga-band`, `penonton`, `percetakan-1903`, `keluarga-1936`, `keluarga-1936-pulih`, `koin-sang-adil`, `av-*`, `mara-video`, `mara-latihan`, `jonah-lega`, `wiki-elias`, `vid-timeline`.
3. **Sisanya:** benda dan tempat, karena urutannya bebas.

Kirim semuanya sekaligus atau bertahap. Gambar yang belum ada tetap memakai foto Wikimedia yang sekarang, jadi halaman tidak pernah kosong.
