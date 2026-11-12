// Metadata tampilan jenjang di sisi klien (label, warna, tingkat). Struktur kelas
// dan katalog mapel yang sebenarnya tetap bersumber dari server (server/lib/jenjang.js);
// berkas ini hanya untuk penyajian antarmuka agar tidak duplikasi label/warna.
export const JENJANG_INFO = {
  SD: { label: 'Sekolah Dasar', warna: '#A3E635', tingkat: 'Kelas I – VI', deskripsi: 'Pendidikan dasar enam tahun, kelas I sampai VI.' },
  SMP: { label: 'Sekolah Menengah Pertama', warna: '#22D3EE', tingkat: 'Kelas VII – IX', deskripsi: 'Menengah pertama tiga tahun, kelas VII sampai IX.' },
  SMA: { label: 'Sekolah Menengah Atas', warna: '#7C5CFF', tingkat: 'Kelas X – XII', deskripsi: 'Menengah atas tiga tahun, kelas X sampai XII.' },
  SMK: { label: 'Sekolah Menengah Kejuruan', warna: '#FFB020', tingkat: 'Kelas X – XII · jurusan', deskripsi: 'Kejuruan tiga tahun dengan jurusan, kelas X sampai XII.' },
}

export const DAFTAR_JENJANG = ['SD', 'SMP', 'SMA', 'SMK']

export const labelJenjang = (j) => JENJANG_INFO[j]?.label || JENJANG_INFO.SMP.label
export const warnaJenjang = (j) => JENJANG_INFO[j]?.warna || JENJANG_INFO.SMP.warna