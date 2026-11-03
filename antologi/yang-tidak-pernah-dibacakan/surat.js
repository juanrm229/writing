/* Laci Sarah: surat-surat selama sepuluh tahun, dan sesudahnya.
   Surat yang bertanda "teks" diambil dari novelnya (dibaca dari works.json); yang lain ditulis untuk pengalaman ini,
   mengikuti apa yang diceritakan novelnya: sebelum pasar malam Sarah belum menyunting, sesudahnya ia mencabut duri,
   sejak Damar berubah ia menghapus perubahannya, ia menyunting kedua arah, dan sesudah tahun kesepuluh Damar menulis
   kepada Sarah setiap tahun, dan Sarah membalas bahwa Renjani bahagia (benar) dan sudah melupakannya (bohong).
   Setiap surat: id, kapan, dari, untuk, bab (indeks anak tangga, dari 0, tempat ia mulai bisa dibaca di laci), tulis (yang ditulis),
   sampai (yang sampai: yang dibacakan Sarah atau yang dikirimkannya; null kalau tidak pernah sampai), dan catatan.
   Paragraf dipisah baris kosong. */
window.YTPD_SURAT = [
  {
    id: 'pertama', kapan: 'Tahun pertama', dari: 'Damar', untuk: 'Renjani', bab: 0,
    tulis: `Ren,

Busnya berangkat jam tujuh dan aku baru bisa tidur waktu lampu kotamu hilang di belakang. Dua belas jam. Aku menghitung jembatan supaya tidak menghitung yang lain. Ada sembilan belas.

Kamar kosku bau garam dan solar, dan malam ini aku sadar aku belum pernah memperhatikan baunya sebelum kau bertanya kota ini bau apa. Sekarang aku tidak bisa berhenti menciumnya. Kau mengubah hidungku dari jarak dua belas jam.

Ibumu akan membacakan ini untukmu. Sampaikan terima kasihku kepadanya. Bilang padanya aku akan menulis setiap minggu, dan kalau tulisanku jelek, itu bukan salah matanya.

Aku tidak pandai menulis surat cinta. Aku cuma tahu menulis yang benar. Jadi ini yang benar: aku sudah rindu sebelum busnya berangkat.

Damar`,
    sampai: 'sama',
    catatan: 'Sebelum pasar malam, Sarah membacakan semuanya apa adanya.'
  },
  {
    id: 'balasan-pertama', kapan: 'Tahun pertama', dari: 'Renjani', untuk: 'Damar', bab: 0, dikte: true,
    tulis: `Damar.

Ibu yang menulis, aku yang bicara. Jadi kalau ada kata yang terlalu bagus, itu Ibu. Yang biasa saja, itu aku.

Kota ini bau hujan yang belum turun. Kau tidak perlu menciumnya; aku sudah.

Aku mendengar suratmu tiga kali. Yang ketiga aku minta Ibu membacanya lebih pelan, supaya kau tinggal lebih lama di ruang tamu.

Sembilan belas jembatan. Aku akan menghitungnya juga, nanti, waktu aku yang naik bus itu.

Renjani`,
    sampai: 'sama',
    catatan: 'Didiktekan Renjani di kursi rotan, ditulis tangan Sarah, dikirim utuh.'
  },
  {
    id: 'pasar-malam', kapan: 'Tahun kedua, sesudah pasar malam', dari: 'Damar', untuk: 'Renjani', bab: 3,
    tulis: `Ren,

Aku belum bisa tidur sejak bus itu. Tanganku masih bengkak dan aku tidak mau ia sembuh cepat-cepat, sebab selama ia sakit aku ingat.

Aku tidak tahu apa yang terjadi padaku di pasar itu. Itu yang paling menakutkan. Aku tidak memutuskan untuk memukul. Aku jatuh ke dalam sesuatu, dan waktu aku keluar, empat orang memegangiku dan kau memanggil namaku dan aku tidak menjawab.

Kau memanggil namaku dan aku tidak menjawab. Aku menulisnya dua kali karena aku ingin itu tertulis dua kali.

Kau bilang kau memaafkanku. Jangan dulu. Aku belum pantas dimaafkan oleh orang yang tidak bisa lari dariku.

Aku akan memperbaikinya. Aku belum tahu caranya, tapi aku akan mencari tahu, dan aku tidak akan datang lagi sampai aku tahu.

Damar`,
    sampai: `Ren,

Aku belum bisa tidur sejak bus itu. Tanganku masih bengkak, tapi tidak apa-apa.

Aku menyesal kau harus mendengar keributan di pasar itu. Lelaki itu kurang ajar, dan aku hanya ingin kau aman.

Kau bilang kau memaafkanku. Terima kasih. Itu lebih dari yang pantas kudapat.

Aku harus bekerja dulu. Mungkin lama sebelum aku bisa datang lagi. Jaga dirimu, dan dengarkan ibumu.

Damar`,
    catatan: 'Suntingan pertama. Sarah mencabut ketakutan Damar pada dirinya sendiri, dan menambahkan satu kalimat yang bukan milik Damar.'
  },
  {
    id: 'angin-barat', kapan: 'Tahun kelima', dari: 'Damar', untuk: 'Renjani', bab: 4,
    tulis: `Ren,

Musim angin barat. Kapal-kapal tidak keluar, jadi aku berjalan. Dari dermaga ke mercu suar dan kembali, tiga jam kalau pelan. Aku melakukannya setiap kali dadaku mulai panas. Dulu aku kira berjalan itu lari. Sekarang aku tahu berjalan itu cara menunggu tanpa meledak.

Ren, aku sedang berubah. Aku ingin kau tahu aku sedang berubah. Aku tidak akan datang kepadamu sampai aku yakin sumur itu kering. Tunggu aku sedikit lebih lama. Aku sedang menjadi lelaki yang pantas untuk kepercayaanmu.

Minggu lalu ada orang menumpahkan solar ke sepatuku lalu tertawa. Aku diam. Aku pulang. Aku menuliskannya di sini karena itu yang pertama kali, dan aku ingin seseorang tahu.

Damar`,
    sampai: `Ren,

Musim angin barat. Kapal-kapal tidak keluar, jadi aku berjalan. Dari dermaga ke mercu suar dan kembali, tiga jam kalau pelan.

Pekerjaan sepi. Aku belum tahu kapan bisa datang.

Damar`,
    catatan: 'Paragraf kedua ada di novel. Sarah menghapus setiap kalimat tentang perubahan Damar, juga hari pertama ia berhasil diam.'
  },
  {
    id: 'kursi-yang-sama', kapan: 'Tahun keenam', dari: 'Renjani', untuk: 'Damar', bab: 5, dikte: true,
    tulis: `Damar.

Suaramu di surat-surat terakhir jauh sekali, seperti orang yang bicara dari ruangan sebelah. Aku tidak marah. Aku cuma ingin bilang: aku masih di kursi yang sama. Aku memilihmu setiap sore, waktu Ibu membuka amplopnya.

Kalau kau lelah, bilang. Aku lebih kuat mendengar kau lelah daripada mendengar kau jauh.

Datanglah. Tidak perlu punya rumah dulu. Aku tidak bisa melihat rumah.

Renjani`,
    sampai: `Damar.

Surat-suratmu sampai. Aku baik-baik saja. Ibu menjagaku, dan hari-hariku penuh.

Tidak perlu terburu-buru. Bekerjalah dulu.

Renjani`,
    catatan: 'Arah yang lain. Yang didiktekan Renjani dan yang dikirim ke kota pelabuhan.'
  },
  { id: 'oranye', kapan: 'Suatu kali', dari: 'Damar', untuk: 'Renjani', bab: 2, teks: 'orange', catatan: 'Dari novel. Tidak ada duri di surat ini. Hanya satu kalimat yang menyentuh lukanya.' },
  {
    id: 'bahu', kapan: 'Tahun kedelapan', dari: 'Damar', untuk: 'Renjani', bab: 4,
    tulis: `Ren,

Hari ini aku menggendong anak tetangga yang jatuh dari tangga kos, dan ia berhenti menangis di bahuku. Ibunya bilang aku punya bahu yang tenang. Sepuluh tahun lalu tidak ada yang akan mengatakan itu tentangku. Aku menulisnya karena kau satu-satunya yang tahu betapa anehnya kalimat itu.

Aku tidak meninju dinding lagi sejak tahun ketiga. Aku sudah lupa rasanya bangun dengan buku jari yang berdarah. Aku menghitungnya bukan karena bangga. Aku menghitung supaya suatu hari aku bisa menyerahkan hitungannya kepadamu, seperti orang menyerahkan surat tanah.

Aku sudah tenang, Ren. Tidak semua orang percaya. Aku cuma butuh satu orang.

Damar`,
    sampai: `Ren,

Hari ini aku menggendong anak tetangga yang jatuh dari tangga kos, dan ia berhenti menangis di bahuku. Ibunya bilang aku punya bahu yang tenang.

Aku baik. Aku cuma butuh satu orang.

Damar`,
    catatan: 'Surat yang begitu berbeda sampai sesuatu darinya bocor lewat. Sesudah mendengarnya, Renjani bertanya apakah ia gila.'
  },
  { id: 'marah', kapan: 'Tahun kesembilan', dari: 'Damar', untuk: 'Renjani', bab: 1, teks: 'angry', catatan: 'Dari novel. Surat yang marah, dan yang dibacakan sore harinya.' },
  { id: 'terakhir', kapan: 'Tahun kesepuluh', dari: 'Damar', untuk: 'Renjani', bab: 5, teks: 'last', catatan: 'Dari novel. Dibaca sendirian di dapur, lalu disimpan enam puluh tahun.' },
  {
    id: 'untuk-sarah', kapan: 'Empat tahun kemudian', dari: 'Damar', untuk: 'Sarah', bab: 7,
    tulis: `Bu Sarah,

Saya tidak menulis kepada Renjani lagi. Saya sudah mengerti jawabannya. Saya menulis kepada Ibu karena Ibu satu-satunya pintu yang saya kenal ke rumah itu.

Saya sudah menikah. Istri saya orang baik. Saya tidak akan menulis apa pun yang tidak adil tentang dia.

Saya hanya ingin bertanya satu hal, dan Ibu boleh tidak menjawab: apakah Renjani bahagia? Apakah ia pernah, barangkali, menyebut nama saya?

Damar`,
    sampai: 'sama',
    catatan: 'Setiap tahun, sampai ia tua, satu surat. Bukan kepada Renjani.'
  },
  {
    id: 'balasan-sarah', kapan: 'Empat tahun kemudian', dari: 'Sarah', untuk: 'Damar', bab: 7,
    tulis: `Damar,

Renjani bahagia. Ia menikah dengan lelaki yang baik, seorang tukang kayu. Ia mengajar anak-anak membaca dengan jari.

Ia sudah melupakanmu. Jangan menulis kepadanya lagi.

Sarah`,
    sampai: 'sama',
    tanda: [['Renjani bahagia', 'benar'], ['Ia sudah melupakanmu', 'bohong']],
    catatan: 'Yang ditulis Sarah sendiri. Satu kalimat benar, satu kalimat bohong.'
  },
  {
    id: 'nama', kapan: 'Bertahun-tahun kemudian', dari: 'Damar', untuk: 'Sarah', bab: 7,
    tulis: `Bu Sarah,

Mata saya mulai kabur. Lucu, ya. Sekarang saya tahu sedikit tentang dunia Renjani.

Ini mungkin surat terakhir. Saya tidak minta balasan. Saya hanya ingin satu kali lagi menulis namanya di atas kertas yang akan sampai ke rumahnya, meskipun tidak ke tangannya.

Renjani.

Itu saja.

Damar`,
    sampai: 'sama',
    catatan: 'Tidak dibalas. Sesudah ini, surat-surat itu berhenti.'
  }
];
