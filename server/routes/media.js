import { Router } from 'express'
import multer from 'multer'
import { bungkus, Galat, angka } from '../lib/http.js'
import { satu } from '../db/pool.js'
import { wajibMasuk, staf } from '../middleware/auth.js'
import {
  BATAS_UKURAN, LABEL_UKURAN, deteksiBerkas, simpanBerkas, hapusBerkas,
  jalurBerkas, tandaSah, urlMedia, pemakaianMedia, ukuranBerkas,
} from '../lib/media.js'

const r = Router()

const unggah = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BATAS_UKURAN.video, files: 1, fields: 4 },
})

const terimaBerkas = (req, res, next) => unggah.single('berkas')(req, res, (e) => {
  if (!e) return next()
  if (e.code === 'LIMIT_FILE_SIZE') return next(new Galat(413, `Berkas melebihi batas ${LABEL_UKURAN.video}.`))
  next(new Galat(400, 'Berkas gagal dibaca. Coba unggah ulang.'))
})

r.post('/', wajibMasuk, staf, terimaBerkas, bungkus(async (req, res) => {
  if (!req.file?.buffer?.length) throw new Galat(400, 'Pilih berkas yang akan diunggah.')
  const info = deteksiBerkas(req.file.buffer)
  if (!info) {
    throw new Galat(415, 'Format berkas tidak dikenali. Gunakan gambar JPG/PNG/WebP/GIF, audio MP3/OGG/M4A/WAV, atau video MP4/WebM.')
  }
  if (req.file.size > BATAS_UKURAN[info.jenis]) {
    throw new Galat(413, `Ukuran ${info.jenis} maksimal ${LABEL_UKURAN[info.jenis]}.`)
  }
  const namaAsli = String(req.file.originalname || `berkas.${info.ekstensi}`).slice(0, 200)
  const row = await simpanBerkas({ buffer: req.file.buffer, namaAsli, info, penggunaId: req.pengguna.id })
  res.status(201).json({
    media: {
      id: row.id, nama_asli: row.nama_asli, mime: row.mime, jenis: row.jenis, ukuran: row.ukuran,
      url: urlMedia(row.id),
    },
    pesan: 'Berkas berhasil diunggah.',
  })
}))

// Berkas soal bersifat rahasia: sajian hanya lewat URL bertanda tangan yang
// dibuat saat payload ujian/hasil dikirim, bukan static publik.
r.get('/:id/berkas', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  if (!tandaSah(id, req.query.e, req.query.t)) throw new Galat(403, 'Tautan berkas kedaluwarsa. Muat ulang halaman ujian.')
  const row = await satu('SELECT * FROM media WHERE id=$1', [id])
  if (!row) throw new Galat(404, 'Berkas tidak ditemukan.')
  res.setHeader('Content-Type', row.mime)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nama_asli).replace(/["\\]/g, '')}"`)
  res.sendFile(jalurBerkas(row.nama_simpan), (e) => {
    if (e && !res.headersSent) res.status(404).json({ pesan: 'Berkas tidak ditemukan di penyimpanan server.' })
  })
}))

r.get('/:id', wajibMasuk, staf, bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const row = await satu('SELECT id, nama_asli, mime, jenis, ukuran, dibuat_pada FROM media WHERE id=$1', [id])
  if (!row) throw new Galat(404, 'Berkas tidak ditemukan.')
  res.json({ media: { ...row, url: urlMedia(row.id), dipakai: await pemakaianMedia(id), ukuran_disk: await ukuranBerkas(row) } })
}))

r.delete('/:id', wajibMasuk, staf, bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const row = await satu('SELECT * FROM media WHERE id=$1', [id])
  if (!row) throw new Galat(404, 'Berkas tidak ditemukan.')
  const dipakai = await pemakaianMedia(id)
  if (dipakai) throw new Galat(409, `Berkas masih dipakai pada ${dipakai} butir soal. Lepaskan lampirannya terlebih dahulu.`)
  await satu('DELETE FROM media WHERE id=$1 RETURNING id', [id])
  await hapusBerkas(row)
  res.json({ pesan: 'Berkas dihapus.', id })
}))

export default r
