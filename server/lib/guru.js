import { q } from '../db/pool.js'

// Id mata pelajaran yang diampu sebuah akun guru (lewat mapel.guru_id).
// Admin tidak memiliki batasan sehingga hasilnya tidak dipakai untuk admin.
export async function mapelGuruIds(guruId) {
  const { rows } = await q('SELECT id FROM mapel WHERE guru_id=$1 AND dihapus_pada IS NULL', [guruId])
  return rows.map((r) => r.id)
}

// Mengembalikan null untuk admin (tanpa batasan) atau larik id mapel milik guru.
// Route memakai nilai ini untuk menyaring soal / ujian / pengawasan / hasil
// agar seorang guru hanya melihat data mata pelajaran yang ia ampu.
export async function batasiMapel(req) {
  if (req.pengguna?.peran !== 'guru') return null
  return mapelGuruIds(req.pengguna.id)
}

// Penjaga akses butir/detail: lempar 404 bila guru mencoba membuka data mapel lain.
export function milikGuru(ids, mapelId) {
  return ids === null || ids.includes(mapelId)
}
