// Struktur akademik per jenjang. Satu sumber kebenaran untuk penamaan kelas,
// daftar mata pelajaran, dan kelas demo yang dipakai seeder.
export const JENJANG = {
  SD: { label: 'Sekolah Dasar', singkat: 'SD', tingkat: ['I', 'II', 'III', 'IV', 'V', 'VI'], paralel: ['A', 'B'] },
  SMP: { label: 'Sekolah Menengah Pertama', singkat: 'SMP', tingkat: ['VII', 'VIII', 'IX'], paralel: ['A', 'B', 'C'] },
  SMA: { label: 'Sekolah Menengah Atas', singkat: 'SMA', tingkat: ['X', 'XI', 'XII'], paralel: ['A', 'B', 'C'] },
  SMK: { label: 'Sekolah Menengah Kejuruan', singkat: 'SMK', tingkat: ['X', 'XI', 'XII'], jurusan: ['TJKT', 'AKL', 'DKV'] },
}

export const DAFTAR_JENJANG = Object.keys(JENJANG)

export const jenjangValid = (j) => Object.prototype.hasOwnProperty.call(JENJANG, j)

export const labelJenjang = (j) => JENJANG[j]?.label || JENJANG.SMP.label

export function kelasUntuk(j) {
  const cfg = JENJANG[j] || JENJANG.SMP
  if (cfg.jurusan) return cfg.tingkat.flatMap((t) => cfg.jurusan.map((s) => `${t} ${s}`))
  return cfg.tingkat.flatMap((t) => cfg.paralel.map((s) => `${t}-${s}`))
}

// Kelas tingkat akhir yang dipakai data demo, supaya contoh ujian langsung sasaran.
export function kelasDemo(j) {
  const cfg = JENJANG[j] || JENJANG.SMP
  const akhir = cfg.tingkat[cfg.tingkat.length - 1]
  if (cfg.jurusan) return cfg.jurusan.map((s) => `${akhir} ${s}`)
  return cfg.paralel.map((s) => `${akhir}-${s}`)
}

const GURU = {
  MTK: 'Bambang Setiawan, S.Pd.',
  BIN: 'Siti Nurhaliza, S.S.',
  IPA: 'Dewi Lestari, S.Pd.',
  IPS: 'Hendra Wijaya, S.E.',
  BIG: 'Maria Ulfa, S.Pd.',
  PKN: 'Yusuf Maulana, S.H.',
  INF: 'Agus Prasetyo, S.Kom.',
  TKJ: 'Rudi Hartono, S.T.',
}
const WARNA = {
  MTK: '#7C5CFF', BIN: '#22D3EE', IPA: '#A3E635', IPS: '#FFB020',
  BIG: '#FF4D6D', PKN: '#38BDF8', INF: '#F472B6', TKJ: '#34D399',
}

const NAMA_MAPEL = {
  SD: { MTK: 'Matematika', BIN: 'Bahasa Indonesia', IPA: 'IPAS (IPA & IPS)', PKN: 'Pendidikan Pancasila', BIG: 'Bahasa Inggris' },
  SMP: { MTK: 'Matematika', BIN: 'Bahasa Indonesia', IPA: 'IPA Terpadu', IPS: 'IPS Terpadu', BIG: 'Bahasa Inggris', PKN: 'PPKn', INF: 'Informatika' },
  SMA: { MTK: 'Matematika', BIN: 'Bahasa Indonesia', BIG: 'Bahasa Inggris', PKN: 'PPKn', INF: 'Informatika', IPA: 'IPA (Fisika–Kimia)', IPS: 'IPS (Sejarah–Geografi)' },
  SMK: { MTK: 'Matematika', BIN: 'Bahasa Indonesia', BIG: 'Bahasa Inggris', PKN: 'Pendidikan Pancasila', INF: 'Informatika', TKJ: 'Produktif TJKT', IPA: 'Projek IPAS' },
}

export function mapelUntuk(j) {
  const nama = NAMA_MAPEL[j] || NAMA_MAPEL.SMP
  return Object.entries(nama).map(([kode, n]) => ({ kode, nama: n, warna: WARNA[kode], guru: GURU[kode] }))
}