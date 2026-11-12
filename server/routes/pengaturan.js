import { Router } from 'express'
import { z } from 'zod'
import { bungkus, Galat } from '../lib/http.js'
import { wajibMasuk, boleh } from '../middleware/auth.js'
import {
  pengaturanPublik, setPengaturan, kelasManualUntuk, tambahRombel, hapusRombel,
} from '../lib/pengaturan.js'
import { DAFTAR_JENJANG, kelasUntuk, jenjangValid } from '../lib/jenjang.js'
import { catatAktivitas } from '../lib/ujian.js'

const r = Router()

// Publik: identitas sekolah dipakai halaman masuk & seluruh antarmuka.
r.get('/', bungkus(async (_req, res) => {
  res.json(await pengaturanPublik())
}))

const skema = z.object({
  nama_sekolah: z.string().trim().min(3, 'Nama sekolah minimal 3 karakter.').max(120).optional(),
  tahun_ajaran: z.string().trim().min(4, 'Tahun ajaran tidak valid.').max(20).optional(),
  nama_aplikasi: z.string().trim().min(3, 'Nama aplikasi minimal 3 karakter.').max(60).optional(),
  jenjang: z.enum(DAFTAR_JENJANG, { errorMap: () => ({ message: 'Jenjang tidak dikenal.' }) }).optional(),
})

r.put('/', wajibMasuk, boleh('admin'), bungkus(async (req, res) => {
  const data = skema.parse(req.body)
  await setPengaturan(data)
  await catatAktivitas(req.pengguna.id, 'pengaturan', `${req.pengguna.nama} memperbarui identitas sekolah`, '#FFB020')
  res.json(await pengaturanPublik())
}))

// ── Rombongan belajar (kelas) manual per jenjang ─────────────────────────────
// Kelas bawaan jenjang tetap ada; kelas manual di sini DIGABUNGKAN dengannya.
const skemaRombel = z.object({
  jenjang: z.enum(DAFTAR_JENJANG, { errorMap: () => ({ message: 'Jenjang tidak dikenal.' }) }),
  nama: z.string().trim().min(1, 'Nama kelas wajib diisi.').max(20, 'Nama kelas maksimal 20 karakter.'),
})

async function rombelPayload(jenjang) {
  return { jenjang, bawaan: kelasUntuk(jenjang), manual: await kelasManualUntuk(jenjang) }
}

r.get('/rombel', wajibMasuk, boleh('admin'), bungkus(async (req, res) => {
  const jenjang = jenjangValid(req.query.jenjang) ? req.query.jenjang : (await pengaturanPublik()).jenjang
  res.json(await rombelPayload(jenjang))
}))

r.post('/rombel', wajibMasuk, boleh('admin'), bungkus(async (req, res) => {
  const { jenjang, nama } = skemaRombel.parse(req.body)
  let dibuat
  try {
    dibuat = await tambahRombel(jenjang, nama)
  } catch (e) {
    throw new Galat(400, e.message)
  }
  if (!dibuat) throw new Galat(409, `Kelas ${nama.trim().toUpperCase()} sudah ada untuk jenjang ${jenjang}.`)
  await catatAktivitas(req.pengguna.id, 'pengaturan', `${req.pengguna.nama} menambah kelas ${dibuat.nama} (${jenjang})`, '#22D3EE')
  res.status(201).json({ ...(await rombelPayload(jenjang)), pesan: `Kelas ${dibuat.nama} ditambahkan.`, dibuat })
}))

r.delete('/rombel/:id', wajibMasuk, boleh('admin'), bungkus(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) throw new Galat(400, 'ID kelas tidak valid.')
  const ada = await hapusRombel(id)
  if (!ada) throw new Galat(404, 'Kelas tidak ditemukan atau sudah dihapus.')
  await catatAktivitas(req.pengguna.id, 'pengaturan', `${req.pengguna.nama} menghapus sebuah kelas manual`, '#FF4D6D')
  res.json({ pesan: 'Kelas dihapus.', id })
}))

export default r