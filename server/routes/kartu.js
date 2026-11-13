import { Router } from 'express'
import { q } from '../db/pool.js'
import { bungkus, Galat, bersih } from '../lib/http.js'
import { urlMedia } from '../lib/media.js'
import { dekripsiSandi } from '../lib/sandi-kartu.js'

const r = Router()

/**
 * Kartu peserta per kelas. Administrator memilih satu kelas; kartu memuat
 * identitas sekolah, foto, nama, kelas, username (NIS), dan password akun.
 * Tidak terikat pada satu ujian sehingga dapat dicetak sebelum jadwal dibuat.
 */
r.get('/', bungkus(async (req, res) => {
  const kelas = bersih(req.query.kelas)
  if (!kelas) throw new Galat(400, 'Pilih kelas yang kartunya akan dicetak.')

  const { rows } = await q(
    `SELECT p.id, p.nama, p.nis, p.kelas, p.gender, p.sandi_kartu,
            CASE WHEN fm.id IS NULL THEN NULL ELSE p.foto_media_id END AS foto_media_id
     FROM pengguna p
     LEFT JOIN media fm ON fm.id = p.foto_media_id AND fm.jenis='gambar'
     WHERE p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif AND p.kelas=$1
     ORDER BY p.nama`,
    [kelas],
  )

  res.json({
    kelas,
    peserta: rows.map((p) => ({
      id: p.id,
      nama: p.nama,
      nis: p.nis,
      kelas: p.kelas,
      gender: p.gender,
      foto_url: p.foto_media_id ? urlMedia(p.foto_media_id, 24 * 3600) : null,
      // Hanya endpoint admin ini yang mengembalikan password terbaca; UI
      // menampilkannya pada kartu yang akan dibagikan kepada peserta.
      sandi: dekripsiSandi(p.sandi_kartu),
    })),
  })
}))

export default r
