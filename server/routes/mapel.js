import { Router } from 'express'
import { z } from 'zod'
import { q, satu } from '../db/pool.js'
import { bungkus, Galat, bersih } from '../lib/http.js'
import { wajibMasuk, boleh } from '../middleware/auth.js'
import { getPengaturan } from '../lib/pengaturan.js'
import { mapelUntuk, jenjangValid } from '../lib/jenjang.js'
import { catatAktivitas } from '../lib/ujian.js'

const r = Router()
r.use(wajibMasuk, boleh('admin'))

const KOLOM = 'm.id, m.nama, m.kode, m.warna, m.guru, m.guru_id, m.jenjang, m.dihapus_pada'
const jumlahSoal = '(SELECT count(*)::int FROM soal s WHERE s.mapel_id=m.id AND s.dihapus_pada IS NULL) AS jumlah_soal'

// Daftar mapel jenjang aktif + katalog rekomendasi bawaan jenjang tersebut.
r.get('/', bungkus(async (req, res) => {
  const p = await getPengaturan()
  const jenjang = jenjangValid(req.query.jenjang) ? req.query.jenjang : p.jenjang
  const mapel = await q(
    `SELECT ${KOLOM}, ${jumlahSoal} FROM mapel m WHERE m.jenjang=$1 AND m.dihapus_pada IS NULL ORDER BY m.nama`,
    [jenjang],
  )
  const terpakai = new Set(mapel.rows.map((m) => m.kode))
  const katalog = mapelUntuk(jenjang).filter((m) => !terpakai.has(m.kode))
  res.json({ jenjang, mapel: mapel.rows, katalog })
}))

const skema = z.object({
  nama: z.string().trim().min(2, 'Nama mapel minimal 2 karakter.').max(80),
  kode: z.string().trim().min(2, 'Kode minimal 2 karakter.').max(12).regex(/^[A-Za-z0-9-]+$/, 'Kode hanya huruf, angka, dan tanda hubung.'),
  warna: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Warna tidak valid.').optional(),
  guru: z.string().trim().max(80).optional(),
  guru_id: z.coerce.number().int().positive().nullable().optional(),
  jenjang: z.string().trim().optional(),
})

r.post('/', bungkus(async (req, res) => {
  const d = skema.parse(req.body)
  const p = await getPengaturan()
  const jenjang = jenjangValid(d.jenjang) ? d.jenjang : p.jenjang
  const guruId = d.guru_id ?? null
  const guruNama = guruId != null ? await namaGuru(guruId) : (bersih(d.guru) || null)
  const r = await q(
    `INSERT INTO mapel (nama,kode,warna,guru,guru_id,jenjang) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [bersih(d.nama), bersih(d.kode).toUpperCase(), d.warna || '#7C5CFF', guruNama, guruId, jenjang],
  )
  await catatAktivitas(req.pengguna.id, 'mapel', `${req.pengguna.nama} menambah mapel ${d.nama} (${jenjang})`, '#22D3EE')
  res.status(201).json(await satu(`SELECT ${KOLOM}, ${jumlahSoal} FROM mapel m WHERE m.id=$1`, [r.rows[0].id]))
}))

// Nama tampilan guru pengampu selalu diambil dari akun terhubung (guru_id),
// sehingga mapel.guru tidak pernah lepas dari akun aslinya.
async function namaGuru(guruId) {
  if (guruId == null) return null
  const g = await satu('SELECT id, nama, peran FROM pengguna WHERE id=$1 AND dihapus_pada IS NULL', [guruId])
  if (!g) throw new Galat(400, 'Akun guru pengampu tidak ditemukan.')
  if (g.peran !== 'guru') throw new Galat(400, 'Guru pengampu harus akun berperan guru.')
  return g.nama
}

const skemaUbah = skema.partial()

r.patch('/:id', bungkus(async (req, res) => {
  const id = Number(req.params.id)
  const ada = await satu('SELECT id FROM mapel WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Mata pelajaran tidak ditemukan.')
  const d = skemaUbah.parse(req.body)
  const sets = []
  const params = []
  const tambah = (kolom, nilai) => { params.push(nilai); sets.push(`${kolom}=$${params.length}`) }
  if (d.nama !== undefined) tambah('nama', bersih(d.nama))
  if (d.kode !== undefined) tambah('kode', bersih(d.kode).toUpperCase())
  if (d.warna !== undefined) tambah('warna', d.warna)
  if (d.guru_id !== undefined) {
    // Bila guru_id dikirim, nama tampilan ikut disesuaikan dari akun tersebut.
    tambah('guru_id', d.guru_id)
    tambah('guru', await namaGuru(d.guru_id))
  } else if (d.guru !== undefined) {
    tambah('guru', bersih(d.guru) || null)
  }
  if (!sets.length) throw new Galat(400, 'Tidak ada perubahan yang dikirim.')
  params.push(id)
  await q(`UPDATE mapel SET ${sets.join(',')} WHERE id=$${params.length}`, params)
  res.json(await satu(`SELECT ${KOLOM}, ${jumlahSoal} FROM mapel m WHERE m.id=$1`, [id]))
}))

r.delete('/:id', bungkus(async (req, res) => {
  const id = Number(req.params.id)
  const ada = await satu('SELECT nama, jenjang FROM mapel WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Mata pelajaran tidak ditemukan.')
  await q('UPDATE mapel SET dihapus_pada=now() WHERE id=$1', [id])
  await catatAktivitas(req.pengguna.id, 'mapel', `${req.pengguna.nama} menghapus mapel ${ada.nama} (${ada.jenjang})`, '#FF4D6D')
  res.json({ pesan: 'Mata pelajaran dihapus.', id })
}))

r.post('/:id/pulihkan', bungkus(async (req, res) => {
  const id = Number(req.params.id)
  const ada = await satu('SELECT nama FROM mapel WHERE id=$1 AND dihapus_pada IS NOT NULL', [id])
  if (!ada) throw new Galat(404, 'Mata pelajaran tidak ditemukan atau belum dihapus.')
  await q('UPDATE mapel SET dihapus_pada=NULL WHERE id=$1', [id])
  res.json(await satu(`SELECT ${KOLOM}, ${jumlahSoal} FROM mapel m WHERE m.id=$1`, [id]))
}))

export default r