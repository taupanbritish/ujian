import { Router } from 'express'
import { z } from 'zod'
import { q, satu, transaksi } from '../db/pool.js'
import { bungkus, Galat, angka, statusUjian } from '../lib/http.js'
import { selesaikan, catatAktivitas } from '../lib/ujian.js'
import { batasiMapel } from '../lib/guru.js'

const r = Router()

r.get('/', bungkus(async (req, res) => {
  const gm = await batasiMapel(req)
  const params = []
  let batasMapel = ''
  if (gm) { params.push(gm); batasMapel = ` AND u.mapel_id = ANY($${params.length}::int[])` }
  const daftar = await q(
    `SELECT u.id, u.judul, u.token, u.durasi_menit, u.mulai_pada, u.selesai_pada, u.status, u.kelas_target, u.kkm,
            m.nama AS mapel_nama, m.warna AS mapel_warna,
            (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS jumlah_soal,
            (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='berlangsung') AS jumlah_berlangsung,
            (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='selesai') AS jumlah_selesai,
            (SELECT count(*)::int FROM pengguna p WHERE p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif
               AND (cardinality(u.kelas_target)=0 OR p.kelas = ANY(u.kelas_target))) AS sasaran
     FROM ujian u JOIN mapel m ON m.id=u.mapel_id
     WHERE u.dihapus_pada IS NULL AND u.status <> 'draf'${batasMapel} ORDER BY u.mulai_pada DESC`,
    params,
  )
  const ujian = daftar.rows.map((u) => ({ ...u, status_efektif: statusUjian(u) }))
  const terpilih = angka(req.query.ujian_id) || ujian.find((u) => u.jumlah_berlangsung > 0)?.id || ujian.find((u) => u.status_efektif === 'berlangsung')?.id || ujian[0]?.id
  if (!terpilih) return res.json({ ujian: [], terpilih: null, peserta: [], belum: [], ringkas: null })

  const now = Date.now()
  const peserta = await q(
    `SELECT pr.id, pr.pengguna_id, pr.mulai_pada, pr.batas_pada, pr.status, pr.fokus_hilang, pr.perangkat, pr.nilai, pr.perlu_penilaian,
            p.nama, p.nis, p.kelas, p.gender,
            (SELECT count(*)::int FROM jawaban j WHERE j.percobaan_id=pr.id AND coalesce(trim(j.isi),'') <> '') AS terjawab,
            (SELECT count(*)::int FROM jawaban j WHERE j.percobaan_id=pr.id AND j.ragu) AS ragu,
            (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=pr.ujian_id) AS total_soal
     FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id
     WHERE pr.ujian_id=$1 ORDER BY pr.status DESC, pr.mulai_pada DESC`,
    [terpilih],
  )
  const belum = await q(
    `SELECT p.id, p.nama, p.nis, p.kelas, p.gender FROM pengguna p, ujian u
     WHERE u.id=$1 AND p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif
       AND (cardinality(u.kelas_target)=0 OR p.kelas = ANY(u.kelas_target))
       AND NOT EXISTS (SELECT 1 FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=p.id)
     ORDER BY p.kelas, p.nama`,
    [terpilih],
  )
  const rows = peserta.rows.map((p) => ({
    ...p,
    nilai: p.nilai === null ? null : Number(p.nilai),
    sisa_detik: p.status === 'berlangsung' ? Math.max(0, Math.round((new Date(p.batas_pada).getTime() - now) / 1000)) : 0,
    terpakai_detik: Math.round(((p.status === 'berlangsung' ? now : new Date(p.batas_pada).getTime()) - new Date(p.mulai_pada).getTime()) / 1000),
    progres: p.total_soal ? Math.round((p.terjawab / p.total_soal) * 100) : 0,
  }))
  const live = rows.filter((p) => p.status === 'berlangsung')
  const u = ujian.find((x) => x.id === terpilih)
  res.json({
    ujian,
    terpilih,
    peserta: rows,
    belum: belum.rows,
    ringkas: {
      sasaran: u?.sasaran || 0,
      mengerjakan: live.length,
      selesai: rows.filter((p) => p.status === 'selesai').length,
      belum: belum.rows.length,
      rata_progres: live.length ? Math.round(live.reduce((a, b) => a + b.progres, 0) / live.length) : 0,
      peringatan_fokus: live.filter((p) => p.fokus_hilang > 0).length,
    },
  })
}))

r.post('/:id/paksa-selesai', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const p = await satu('SELECT pr.*, p.nama, u.judul FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id WHERE pr.id=$1', [id])
  if (!p) throw new Galat(404, 'Percobaan tidak ditemukan.')
  if (p.status === 'selesai') throw new Galat(409, 'Peserta ini sudah selesai mengerjakan.')
  const hasil = await transaksi((c) => selesaikan(c, id))
  await catatAktivitas(req.pengguna.id, 'paksa_selesai', `${req.pengguna.nama} mengakhiri sesi ${p.nama} pada “${p.judul}”`, '#FF4D6D')
  res.json({ pesan: `Sesi ${p.nama} diakhiri. Nilai ${hasil.nilai}.`, nilai: hasil.nilai })
}))

r.post('/:id/tambah-waktu', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const { menit } = z.object({ menit: z.coerce.number().int().min(1).max(120) }).parse(req.body)
  const p = await satu(`SELECT pr.id, pr.status, p.nama FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id WHERE pr.id=$1`, [id])
  if (!p) throw new Galat(404, 'Percobaan tidak ditemukan.')
  if (p.status !== 'berlangsung') throw new Galat(409, 'Hanya sesi yang sedang berlangsung yang dapat ditambah waktu.')
  await q(`UPDATE percobaan SET batas_pada = GREATEST(batas_pada, now()) + ($1 || ' minutes')::interval WHERE id=$2`, [menit, id])
  res.json({ pesan: `Waktu ${p.nama} ditambah ${menit} menit.` })
}))

r.post('/:id/reset', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const p = await satu('SELECT pr.id, pr.status, p.nama, u.judul FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id WHERE pr.id=$1', [id])
  if (!p) throw new Galat(404, 'Percobaan tidak ditemukan.')
  await transaksi(async (c) => {
    await c.query('DELETE FROM percobaan WHERE id=$1', [id])
  })
  await catatAktivitas(req.pengguna.id, 'reset_percobaan', `${req.pengguna.nama} mereset sesi ${p.nama} agar dapat mengulang “${p.judul}”`, '#FFB020')
  res.json({ pesan: `Sesi ${p.nama} direset. Peserta dapat masuk kembali dengan token.` })
}))

export default r