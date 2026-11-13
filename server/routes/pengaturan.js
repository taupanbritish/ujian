import { Router } from 'express'
import { z } from 'zod'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import multer from 'multer'
import { bungkus, Galat } from '../lib/http.js'
import { wajibMasuk, boleh } from '../middleware/auth.js'
import {
  pengaturanPublik, setPengaturan, kelasManualUntuk, tambahRombel, hapusRombel,
} from '../lib/pengaturan.js'
import { DAFTAR_JENJANG, kelasUntuk, jenjangValid } from '../lib/jenjang.js'
import { catatAktivitas } from '../lib/ujian.js'
import { infoCadangan, buatCadangan, bersihkanArsip, pulihkanCadangan } from '../lib/cadangan.js'

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

// ── Cadangan & pemulihan (database + folder media) ───────────────────────────
const unggahArsip = multer({
  dest: join(tmpdir(), 'shanatech-cadangan-unggah'),
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 },
})

r.get('/cadangan', wajibMasuk, boleh('admin'), bungkus(async (_req, res) => {
  res.json(await infoCadangan())
}))

r.get('/cadangan/unduh', wajibMasuk, boleh('admin'), bungkus(async (req, res) => {
  const { arsip, kerja, nama } = await buatCadangan()
  await catatAktivitas(req.pengguna.id, 'pengaturan', `${req.pengguna.nama} mengunduh cadangan database dan media`, '#22D3EE')
  res.download(arsip, nama, async (e) => {
    await bersihkanArsip(kerja)
    if (e && !res.headersSent) res.status(500).json({ pesan: 'Cadangan gagal dikirim.' })
  })
}))

r.post('/cadangan/pulihkan', wajibMasuk, boleh('admin'), (req, res, next) => {
  unggahArsip.single('arsip')(req, res, (e) => {
    if (!e) return next()
    if (e.code === 'LIMIT_FILE_SIZE') return next(new Galat(413, 'Arsip melebihi batas 2 GB.'))
    next(new Galat(400, 'Arsip gagal dibaca. Coba unggah ulang.'))
  })
}, bungkus(async (req, res) => {
  if (!req.file?.path) throw new Galat(400, 'Pilih berkas arsip cadangan (.tar.gz).')
  try {
    const hasil = await pulihkanCadangan(req.file.path)
    await catatAktivitas(req.pengguna.id, 'pengaturan', `${req.pengguna.nama} memulihkan database dan media dari cadangan`, '#FFB020')
    res.json(hasil)
  } finally {
    await rm(req.file.path, { force: true }).catch(() => {})
  }
}))

export default r