import { Router } from 'express'
import { z } from 'zod'
import { q, satu, transaksi } from '../db/pool.js'
import { bungkus, Galat, angka, bersih } from '../lib/http.js'
import { nilaiPercobaan, catatAktivitas } from '../lib/ujian.js'
import { batasiMapel, milikGuru } from '../lib/guru.js'

const r = Router()

function penyaring(query, gm) {
  const where = [`pr.status = 'selesai'`, 'u.dihapus_pada IS NULL']
  const params = []
  if (gm) { params.push(gm); where.push(`u.mapel_id = ANY($${params.length}::int[])`) }
  const tambah = (sql, nilai) => {
    if (nilai === undefined) {
      where.push(sql)
      return
    }
    params.push(nilai)
    where.push(sql.replace(/\?/g, `$${params.length}`))
  }
  if (angka(query.ujian_id)) tambah('pr.ujian_id = ?', angka(query.ujian_id))
  if (query.kelas && query.kelas !== 'semua') tambah('p.kelas = ?', query.kelas)
  if (query.cari) tambah('(p.nama ILIKE ? OR p.nis ILIKE ? OR u.judul ILIKE ?)', `%${bersih(query.cari)}%`)
  if (query.penilaian === 'perlu') tambah('pr.perlu_penilaian = true')
  if (query.penilaian === 'tuntas') tambah('pr.perlu_penilaian = false')
  if (query.kelulusan === 'lulus') tambah('pr.nilai >= u.kkm')
  if (query.kelulusan === 'belum') tambah('pr.nilai < u.kkm')
  return { where: where.join(' AND '), params }
}

const KOLOM = `pr.id, pr.nilai, pr.benar, pr.salah, pr.kosong, pr.perlu_penilaian, pr.fokus_hilang, pr.mulai_pada, pr.selesai_pada, pr.batas_pada, pr.perangkat,
  p.nama, p.nis, p.kelas, p.gender, u.id AS ujian_id, u.judul AS ujian_judul, u.kkm, u.durasi_menit,
  m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna,
  (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS total_soal,
  GREATEST(0, ROUND(EXTRACT(EPOCH FROM (pr.selesai_pada - pr.mulai_pada)))::int) AS durasi_detik`

const URUTAN = {
  terbaru: 'pr.selesai_pada DESC',
  nilai_tinggi: 'pr.nilai DESC NULLS LAST',
  nilai_rendah: 'pr.nilai ASC NULLS LAST',
  nama: 'p.nama',
  kelas: 'p.kelas, p.nama',
}

r.get('/', bungkus(async (req, res) => {
  const { where, params } = penyaring(req.query, await batasiMapel(req))
  const urut = URUTAN[req.query.urutan] || URUTAN.terbaru
  const rows = await q(
    `SELECT ${KOLOM} FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id JOIN mapel m ON m.id=u.mapel_id
     WHERE ${where} ORDER BY ${urut}`, params,
  )
  const ringkas = await satu(
    `SELECT count(*)::int AS total,
      round(avg(pr.nilai)::numeric,1)::float AS rata,
      max(pr.nilai)::float AS tertinggi,
      min(pr.nilai)::float AS rendah,
      count(*) FILTER (WHERE pr.nilai >= u.kkm)::int AS lulus,
      count(*) FILTER (WHERE pr.perlu_penilaian)::int AS perlu_penilaian
     FROM percobaan pr JOIN ujian u ON u.id=pr.ujian_id JOIN pengguna p ON p.id=pr.pengguna_id
     WHERE ${where}`, params,
  )
  res.json({
    data: rows.rows.map((x) => ({ ...x, nilai: x.nilai === null ? null : Number(x.nilai), kkm: Number(x.kkm) })),
    ringkas,
  })
}))

r.get('/ekspor/csv', bungkus(async (req, res) => {
  const { where, params } = penyaring(req.query, await batasiMapel(req))
  const rows = await q(
    `SELECT ${KOLOM} FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id JOIN mapel m ON m.id=u.mapel_id
     WHERE ${where} ORDER BY p.kelas, p.nama`, params,
  )
  const kepala = ['NIS', 'Nama', 'Kelas', 'Ujian', 'Mata Pelajaran', 'Nilai', 'KKM', 'Status', 'Benar', 'Salah', 'Kosong', 'Durasi (menit)', 'Pindah Tab', 'Perangkat', 'Selesai']
  const kutip = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const baris = rows.rows.map((x) => [
    x.nis, x.nama, x.kelas, x.ujian_judul, x.mapel_nama, x.nilai, x.kkm,
    x.perlu_penilaian ? 'Menunggu penilaian' : Number(x.nilai) >= Number(x.kkm) ? 'Tuntas' : 'Belum tuntas',
    x.benar, x.salah, x.kosong, Math.round((x.durasi_detik || 0) / 60), x.fokus_hilang, x.perangkat,
    x.selesai_pada ? new Date(x.selesai_pada).toLocaleString('id-ID') : '',
  ].map(kutip).join(';'))
  const csv = '\uFEFF' + [kepala.map(kutip).join(';'), ...baris].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="rekap-nilai-cendekia-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
}))

r.get('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const percobaan = await satu(
    `SELECT ${KOLOM} FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id JOIN mapel m ON m.id=u.mapel_id WHERE pr.id=$1`,
    [id],
  )
  if (!percobaan) throw new Galat(404, 'Hasil ujian tidak ditemukan.')
  const gm = await batasiMapel(req)
  if (gm) {
    const mid = await satu('SELECT mapel_id FROM ujian WHERE id=$1', [percobaan.ujian_id])
    if (!milikGuru(gm, mid?.mapel_id)) throw new Galat(404, 'Hasil ujian tidak ditemukan.')
  }
  const detail = await q(
    `SELECT s.id AS soal_id, s.tipe, s.pertanyaan, s.opsi, s.kunci, s.pembahasan, s.tingkat, s.topik, us.bobot, us.urutan,
            j.id AS jawaban_id, j.isi, j.ragu, j.skor, j.catatan, j.dinilai_oleh, j.diubah_pada, g.nama AS penilai
     FROM ujian_soal us
     JOIN soal s ON s.id=us.soal_id
     JOIN percobaan pr ON pr.ujian_id=us.ujian_id
     LEFT JOIN jawaban j ON j.soal_id=s.id AND j.percobaan_id=pr.id
     LEFT JOIN pengguna g ON g.id=j.dinilai_oleh
     WHERE pr.id=$1 ORDER BY us.urutan`,
    [id],
  )
  const rekan = await satu(
    `SELECT round(avg(nilai)::numeric,1)::float AS rata, count(*)::int AS jumlah,
            (SELECT count(*)::int FROM percobaan x WHERE x.ujian_id=$2 AND x.status='selesai' AND x.nilai > (SELECT nilai FROM percobaan WHERE id=$1)) AS di_atas
     FROM percobaan WHERE ujian_id=$2 AND status='selesai'`,
    [id, percobaan.ujian_id],
  )
  res.json({
    percobaan: { ...percobaan, nilai: percobaan.nilai === null ? null : Number(percobaan.nilai), kkm: Number(percobaan.kkm) },
    detail: detail.rows.map((d) => ({ ...d, bobot: Number(d.bobot), skor: d.skor === null ? null : Number(d.skor) })),
    rekan,
  })
}))

r.patch('/:id/jawaban/:jawabanId', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const jid = angka(req.params.jawabanId)
  const v = z.object({
    skor: z.coerce.number().min(0).max(1),
    catatan: z.string().max(1000).nullable().optional(),
  }).parse(req.body)
  const j = await satu('SELECT j.id, s.tipe FROM jawaban j JOIN soal s ON s.id=j.soal_id WHERE j.id=$1 AND j.percobaan_id=$2', [jid, id])
  if (!j) throw new Galat(404, 'Jawaban tidak ditemukan pada percobaan ini.')
  if (j.tipe !== 'esai') throw new Galat(400, 'Hanya soal uraian yang dinilai manual.')
  await q('UPDATE jawaban SET skor=$1, catatan=$2, dinilai_oleh=$3, diubah_pada=now() WHERE id=$4', [v.skor, v.catatan || null, req.pengguna.id, jid])
  const rekap = await transaksi((c) => nilaiPercobaan(c, id))
  await q('UPDATE percobaan SET nilai=$1, benar=$2, salah=$3, kosong=$4, perlu_penilaian=$5 WHERE id=$6',
    [rekap.nilai, rekap.benar, rekap.salah, rekap.kosong, rekap.perlu_penilaian, id])
  res.json({ pesan: 'Nilai uraian tersimpan.', rekap })
}))

r.post('/:id/finalisasi', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const sisa = await satu(
    `SELECT count(*)::int AS n FROM jawaban j JOIN soal s ON s.id=j.soal_id
     WHERE j.percobaan_id=$1 AND s.tipe='esai' AND j.skor IS NULL AND coalesce(trim(j.isi),'') <> ''`,
    [id],
  )
  if (sisa.n) throw new Galat(400, `Masih ada ${sisa.n} jawaban uraian yang belum dinilai.`)
  const rekap = await transaksi((c) => nilaiPercobaan(c, id))
  await q('UPDATE percobaan SET nilai=$1, benar=$2, salah=$3, kosong=$4, perlu_penilaian=false WHERE id=$5',
    [rekap.nilai, rekap.benar, rekap.salah, rekap.kosong, id])
  const info = await satu('SELECT p.nama, u.judul FROM percobaan pr JOIN pengguna p ON p.id=pr.pengguna_id JOIN ujian u ON u.id=pr.ujian_id WHERE pr.id=$1', [id])
  await catatAktivitas(req.pengguna.id, 'penilaian', `Penilaian ${info.nama} pada “${info.judul}” dituntaskan (${rekap.nilai})`, '#A3E635')
  res.json({ pesan: `Penilaian tuntas. Nilai akhir ${rekap.nilai}.`, rekap })
}))

export default r