import { Router } from 'express'
import { q, satu } from '../db/pool.js'
import { bungkus, Galat, angka, bersih, statusUjian } from '../lib/http.js'
import { urlMedia } from '../lib/media.js'

const r = Router()

/**
 * Data kartu ujian: identitas ujian + peserta sasaran beserta foto.
 * Hanya administrator; kartu memuat foto dan jadwal seluruh peserta.
 */
r.get('/', bungkus(async (req, res) => {
  const id = angka(req.query.ujian_id)
  if (!id) throw new Galat(400, 'Pilih ujian yang kartunya akan dicetak.')

  const ujian = await satu(
    `SELECT u.id, u.judul, u.deskripsi, u.durasi_menit, u.token, u.mulai_pada, u.selesai_pada,
            u.status, u.kkm, u.kelas_target,
            m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna
     FROM ujian u JOIN mapel m ON m.id = u.mapel_id
     WHERE u.id=$1 AND u.dihapus_pada IS NULL`,
    [id],
  )
  if (!ujian) throw new Galat(404, 'Ujian tidak ditemukan.')

  const kelas = req.query.kelas && req.query.kelas !== 'semua' ? bersih(req.query.kelas) : null
  const { rows } = await q(
    `SELECT p.id, p.nama, p.nis, p.kelas, p.gender,
            CASE WHEN fm.id IS NULL THEN NULL ELSE p.foto_media_id END AS foto_media_id
     FROM pengguna p
     LEFT JOIN media fm ON fm.id = p.foto_media_id AND fm.jenis='gambar'
     WHERE p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif
       AND (cardinality($1::text[])=0 OR p.kelas = ANY($1::text[]))
       AND ($2::text IS NULL OR p.kelas=$2)
     ORDER BY p.kelas, p.nama`,
    [ujian.kelas_target, kelas],
  )

  res.json({
    ujian: { ...ujian, kkm: Number(ujian.kkm), status_efektif: statusUjian(ujian) },
    peserta: rows.map((p) => ({
      ...p,
      foto_url: p.foto_media_id ? urlMedia(p.foto_media_id, 24 * 3600) : null,
    })),
  })
}))

export default r
