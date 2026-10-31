/* Kalender Pak Wangsa: susunan acara untuk Pabrik Mimpi. Kalimat cerita tetap dari works.json.
   Setiap acara dimulai pada paragraf yang ditunjuk penanda teksnya (ID/EN); tanggal dan judul acara adalah antarmuka. */
(() => {
  'use strict';
  const CALENDARS = {
    shift: { name: ['Shift malam', 'Night shift'], color: '#7f93b8' },
    pesanan: { name: ['Pesanan khusus', 'Special orders'], color: '#a48af2' },
    pribadi: { name: ['Pribadi', 'Personal'], color: '#e7a948' },
    lila: { name: ['Lila · dibagikan', 'Lila · shared'], color: '#3fb79b' }
  };
  const EVENTS = [
    { id: 'shift', start: ['mimpi dibuat pada shift malam', 'dreams were manufactured on the night shift'], date: '1985-02-04', time: ['22.00 – 05.00', '10 PM – 5 AM'], title: ['Shift malam', 'Night shift'], cal: 'shift', repeat: ['Setiap malam', 'Every night'], place: ['Pabrik di pinggir kota', 'The factory on the edge of town'] },
    { id: 'station', start: ['di stasiun paling ujung', 'at the very last station'], date: '1985-02-04', time: ['22.00 – 05.00', '10 PM – 5 AM'], title: ['Stasiun paling ujung · pesanan khusus', 'The end station · special orders'], cal: 'pesanan', repeat: ['Setiap malam', 'Every night'], place: ['Lantai produksi, stasiun terakhir', 'Production floor, last station'] },
    { id: 'sleep', start: ['Pak Wangsa sendiri tidak pernah bermimpi', 'Mr. Wangsa himself had never dreamed'], date: '1985-02-05', time: ['05.30 – 12.00', '5:30 AM – noon'], title: ['Tidur', 'Sleep'], cal: 'pribadi', repeat: ['Setiap hari', 'Every day'], tag: ['Tanpa mimpi', 'Dreamless'] },
    { id: 'annual', start: ['Tapi ada satu hal kecil', 'But there was one small thing'], date: '1985-12-30', time: ['22.00 – 05.00', '10 PM – 5 AM'], title: ['Malam terakhir sebelum libur', 'The last night before the holiday'], cal: 'pribadi', repeat: ['Setiap tahun', 'Every year'], task: ['Bawa pulang mimpi', 'Take the dream home'], reschedule: ['Dan mimpi itu akan larut', 'And the dream would dissolve on the table'] },
    { id: 'lila', start: ['Pada tahun keempat puluh', 'On his fortieth year'], date: '2024-01-08', time: ['22.00', '10 PM'], title: ['Magang baru: Lila · stasiun sebelah', 'New apprentice: Lila · next station'], cal: 'shift' },
    { id: 'last', start: ['Dan menjelang malam terakhir tahun itu', 'And toward the final night of that year'], date: '2024-12-30', time: ['22.00 – 05.00', '10 PM – 5 AM'], title: ['Malam terakhir sebelum libur · tahun ke-40', 'The last night before the holiday · year 40'], cal: 'pribadi', task: ['Bawa pulang mimpi', 'Take the dream home'] },
    { id: 'gate', start: ['Pak Wangsa tidak membawa pulang mimpinya.', 'Mr. Wangsa did not take his dream home.'], date: '2024-12-31', time: ['05.00', '5 AM'], title: ['Gerbang', 'The gate'], cal: 'shift', taskState: ['Tidak dibawa pulang', 'Not taken home'], moved: ['untuk terakhir kalinya', 'for the very last time'] },
    { id: 'retire', start: ['Dan Pak Wangsa pensiun', 'And Mr. Wangsa retired'], date: '2024-12-31', time: ['Sepanjang hari', 'All day'], title: ['Pensiun', 'Retirement'], cal: 'pribadi' },
    { id: 'empty', start: ['Setahun berlalu.', 'A year passed.'], date: '2025-01-01', empty: true },
    { id: 'archive', start: ['kini bukan magang lagi', 'now no longer an apprentice'], date: '2025-01-06', time: ['05.00', '5 AM'], title: ['Melacak penerima · arsip pesanan lama', 'Tracing the recipients · old order archive'], cal: 'lila', repeat: ['Setiap minggu', 'Every week'], shared: true },
    { id: 'bring', start: ['Lila membawa mereka semua ke pabrik', 'Lila brought them all to the factory'], date: '2025-12-30', time: ['22.00', '10 PM'], title: ['Bawa mereka semua ke pabrik', 'Bring them all to the factory'], cal: 'lila' },
    { id: 'invite', start: ['Mereka menemukan Pak Wangsa', 'They found Mr. Wangsa'], date: '2025-12-30', time: ['22.00', '10 PM'], cal: 'lila', invite: true, place: ['Pabrik, lantai produksi', 'The factory, production floor'], guests: ['Lila dan ratusan tamu · semua hadir', 'Lila and hundreds of guests · all attending'] },
    { id: 'live', start: ['yang bingung, yang mengira ini semacam kesalahan', 'confused, thinking this was some sort of mistake'], date: '2025-12-30', time: ['22.00 –', '10 PM –'], cal: 'lila', live: true, place: ['Pabrik, lantai produksi', 'The factory, production floor'] }
  ];
  // Foto temuan: dilampirkan setelah paragraf penandanya.
  const PHOTOS = [
    { file: 'cerobong.webp', after: ['Itu adalah kebocoran', 'That was a leak'], stamp: '1985-02-04 23:41', alt: ['Pabrik tua di malam basah; dari cerobongnya naik semburat cahaya biru keunguan.', 'An old factory on a wet night; a bluish-violet glow rises from its chimney.'] },
    { file: 'stasiun.webp', after: ['Tentu itu bukan nama aslinya', "Of course, that wasn't her real name"], stamp: '2024-01-08 23:17', alt: ['Lelaki tua bekerja di meja panjang; di belakangnya seorang perempuan muda di stasiun sebelah.', 'An old man works at a long bench; behind him a young woman at the next station.'] },
    { file: 'malam-terakhir.webp', after: ['Lila mendekat, diam-diam', 'Lila approached, quietly'], stamp: '2024-12-30 04:52', alt: ['Di bawah lampu kecil, lelaki tua itu merangkai sesuatu di tangannya; perempuan muda membungkuk melihat.', 'Under a small lamp the old man assembles something in his hands; the young woman leans in to look.'] },
    { file: 'gerbang.webp', after: ['Dan Pak Wangsa pensiun', 'And Mr. Wangsa retired'], stamp: '2024-12-31 05:08', alt: ['Lelaki tua berjalan keluar melewati gerbang pabrik di lantai basah; di dalam seorang perempuan masih bekerja.', 'The old man walks out past the factory gate on a wet floor; inside, a young woman is still working.'] },
    { file: 'tepuk-tangan.webp', after: ['Dan ia mulai bertepuk tangan.', 'And she began to clap.'], stamp: '2025-12-30 22:31', alt: ['Lantai pabrik penuh orang yang bertepuk tangan; lelaki tua itu berdiri di bawah lampu terang, tangan di dada.', 'The factory floor full of people applauding; the old man stands under a bright lamp, hand on his chest.'] }
  ];
  // Kutipan untuk antarmuka, diambil dari paragraf aslinya.
  const QUOTES = {
    postpone: ['"Tahun depan, mungkin."', '"Next year, perhaps."'],
    reply: ['Bapak tidak punya tahun depan lagi', "You don't have a next year anymore"],
    invite: ['Lila mengetuk pintu', 'Lila knocked on the door'],
    // Alasan gerbang: potongan kalimat dari awal penanda sampai sebelum ujungnya.
    gate: [['Sebab gerbang akan mendeteksinya', ', dan pekerjaan ini'], ['Because the gate would detect it', ', and this job']]
  };
  // Ruangan yang berdiri: penanda paragraf untuk daftar tamu acara terakhir.
  const STAND = {
    chairs: ['Ratusan kursi. Dan di kursi-kursi itu', 'Hundreds of chairs. And in those chairs'],
    first: ['Lalu seorang perempuan di barisan depan', 'Then a woman in the front row'],
    clap: ['Dan ia mulai bertepuk tangan.', 'And she began to clap.'],
    all: ['Lalu yang di sebelahnya berdiri', 'Then the person next to her stood']
  };
  window.MimpiKalender = { CALENDARS, EVENTS, PHOTOS, QUOTES, STAND, FIRST_YEAR: 1985, LAST_YEAR: 2024 };
})();
