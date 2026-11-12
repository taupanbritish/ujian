import { pool } from '../db/pool.js'
import { JENJANG, jenjangValid, kelasUntuk, labelJenjang } from './jenjang.js'

// Identitas sekolah satu sumber: nilai bawaan dari environment (untuk distribusi),
// ditimpa oleh tabel pengaturan bila administrator mengubahnya lewat antarmuka.
const bawaan = () => {
  const jenjang = jenjangValid(process.env.SEKOLAH_JENJANG) ? process.env.SEKOLAH_JENJANG : 'SMP'
  return {
    nama_sekolah: process.env.SEKOLAH_NAMA || `${JENJANG[jenjang].singkat} Cendekia Nusantara`,
    jenjang,
    tahun_ajaran: process.env.TAHUN_AJARAN || '2026/2027',
    nama_aplikasi: process.env.NAMA_APLIKASI || 'ShanaTech CBT',
  }
}

let cache = null

export async function getPengaturan() {
  if (cache) return cache
  const dasar = bawaan()
  let tersimpan = {}
  try {
    const { rows } = await pool.query('SELECT kunci, nilai FROM pengaturan')
    for (const r of rows) tersimpan[r.kunci] = r.nilai
  } catch {
    // Tabel belum dibuat (sebelum migrasi): pakai bawaan environment.
  }
  const jenjang = jenjangValid(tersimpan.jenjang) ? tersimpan.jenjang : dasar.jenjang
  cache = {
    nama_sekolah: tersimpan.nama_sekolah || dasar.nama_sekolah,
    jenjang,
    tahun_ajaran: tersimpan.tahun_ajaran || dasar.tahun_ajaran,
    nama_aplikasi: tersimpan.nama_aplikasi || dasar.nama_aplikasi,
  }
  return cache
}

export async function pengaturanPublik() {
  const p = await getPengaturan()
  return { ...p, label_jenjang: labelJenjang(p.jenjang), kelas: await kelasEfektif(p.jenjang) }
}

// ── Rombongan belajar (kelas) ────────────────────────────────────────────────
// Kelas bawaan jenjang dihitung dari jenjang.js; kelas manual disimpan di tabel
// `rombel`. Keduanya DIGABUNGKAN (union) sehingga daftar kelas = bawaan + manual.
export async function kelasManualUntuk(jenjang) {
  try {
    const { rows } = await pool.query(
      'SELECT id, nama FROM rombel WHERE jenjang = $1 ORDER BY urutan, nama',
      [jenjang],
    )
    return rows
  } catch {
    return [] // Tabel belum dibuat (sebelum migrasi).
  }
}

export async function kelasEfektif(jenjang) {
  const bawaanKelas = kelasUntuk(jenjang)
  const manual = (await kelasManualUntuk(jenjang)).map((r) => r.nama)
  const gabungan = [...bawaanKelas]
  for (const m of manual) if (!gabungan.includes(m)) gabungan.push(m)
  return gabungan
}

export async function tambahRombel(jenjang, nama) {
  const bersih = String(nama || '').trim().replace(/\s+/g, ' ').toUpperCase()
  if (!jenjangValid(jenjang)) throw new Error('Jenjang tidak valid.')
  if (bersih.length < 1 || bersih.length > 20) throw new Error('Nama kelas minimal 1 dan maksimal 20 karakter.')
  if (kelasUntuk(jenjang).includes(bersih)) throw new Error(`Kelas ${bersih} sudah tersedia sebagai kelas bawaan ${jenjang}.`)
  const { rows } = await pool.query(
    `INSERT INTO rombel (jenjang, nama, urutan)
     VALUES ($1, $2, COALESCE((SELECT max(urutan) FROM rombel WHERE jenjang=$1), 0) + 1)
     ON CONFLICT (jenjang, nama) DO NOTHING
     RETURNING id, jenjang, nama`,
    [jenjang, bersih],
  )
  return rows[0] || null // null bila sudah ada (duplikat)
}

export async function hapusRombel(id) {
  const { rowCount } = await pool.query('DELETE FROM rombel WHERE id = $1', [id])
  return rowCount > 0
}

const BOLEH = ['nama_sekolah', 'tahun_ajaran', 'nama_aplikasi']

export async function setPengaturan(nilai) {
  for (const k of BOLEH) {
    if (nilai[k] === undefined) continue
    const v = String(nilai[k]).trim()
    if (!v) continue
    await pool.query(
      `INSERT INTO pengaturan (kunci, nilai) VALUES ($1, $2)
       ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_pada = now()`,
      [k, v],
    )
  }
  // Jenjang kini dapat diubah dari antarmuka (dinamis); struktur kelas & katalog
  // mapel menyesuaikan. Data yang sudah ada tetap menyimpan kelas/mapel lamanya.
  if (nilai.jenjang !== undefined && jenjangValid(nilai.jenjang)) {
    await pool.query(
      `INSERT INTO pengaturan (kunci, nilai) VALUES ('jenjang', $1)
       ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_pada = now()`,
      [nilai.jenjang],
    )
  }
  cache = null
  return getPengaturan()
}

// Dipanggil seeder/migrasi agar jenjang hasil environment ikut tersimpan.
export async function simpanJenjang(jenjang) {
  if (!jenjangValid(jenjang)) return
  await pool.query(
    `INSERT INTO pengaturan (kunci, nilai) VALUES ('jenjang', $1)
     ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_pada = now()`,
    [jenjang],
  )
  cache = null
}

export function invalidatePengaturan() {
  cache = null
}