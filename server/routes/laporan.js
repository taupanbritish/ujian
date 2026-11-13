import { Router } from 'express'
import { q, satu } from '../db/pool.js'
import { bungkus, angka, bersih } from '../lib/http.js'
import { batasiMapel } from '../lib/guru.js'

const r = Router()

// Laporan rekap nilai untuk administrator dan guru. Guru hanya melihat ujian
// pada mata pelajaran yang ia ampu; administrator melihat seluruh mapel.
function saringan(query, gm) {
  const where = [
    `pr.status = 'selesai'`,
    'u.dihapus_pada IS NULL',
    'p.dihapus_pada IS NULL',
  ]
  const params = []
  const tambah = (sql, nilai) => {
    params.push(nilai)
    where.push(sql.replace('?', `$${params.length}`))
  }
  if (gm) tambah('u.mapel_id = ANY(?::int[])', gm)
  if (angka(query.mapel_id)) tambah('u.mapel_id = ?', angka(query.mapel_id))
  if (query.kelas && query.kelas !== 'semua') tambah('p.kelas = ?', bersih(query.kelas))
  if (angka(query.ujian_id)) tambah('u.id = ?', angka(query.ujian_id))
  return { where: where.join(' AND '), params }
}

const DARI = `FROM percobaan pr
  JOIN pengguna p ON p.id = pr.pengguna_id
  JOIN ujian u ON u.id = pr.ujian_id
  JOIN mapel m ON m.id = u.mapel_id`

r.get('/', bungkus(async (req, res) => {
  const { where, params } = saringan(req.query, await batasiMapel(req))

  const perUjian = await q(
    `SELECT u.id, u.judul, u.kkm, u.mulai_pada,
            m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna,
            count(*)::int AS peserta,
            round(avg(pr.nilai)::numeric, 1)::float AS rata,
            max(pr.nilai)::float AS tertinggi,
            min(pr.nilai)::float AS terendah,
            count(*) FILTER (WHERE pr.nilai >= u.kkm)::int AS lulus,
            count(*) FILTER (WHERE pr.perlu_penilaian)::int AS perlu_penilaian,
            string_agg(DISTINCT p.kelas, ', ' ORDER BY p.kelas) AS kelas
     ${DARI}
     WHERE ${where}
     GROUP BY u.id, u.judul, u.kkm, u.mulai_pada, m.nama, m.kode, m.warna
     ORDER BY m.nama, u.mulai_pada DESC, u.id DESC`,
    params,
  )

  const detail = await q(
    `SELECT pr.id, p.nama, p.nis, p.kelas, pr.nilai, pr.perlu_penilaian, pr.selesai_pada,
            u.id AS ujian_id, u.judul AS ujian_judul, u.kkm,
            m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna
     ${DARI}
     WHERE ${where}
     ORDER BY p.kelas, p.nama, u.judul`,
    params,
  )

  const ringkas = await satu(
    `SELECT count(*)::int AS lembar,
            count(DISTINCT u.id)::int AS ujian,
            round(avg(pr.nilai)::numeric, 1)::float AS rata,
            count(*) FILTER (WHERE pr.nilai >= u.kkm)::int AS lulus,
            count(*) FILTER (WHERE pr.perlu_penilaian)::int AS perlu_penilaian
     ${DARI}
     WHERE ${where}`,
    params,
  )

  res.json({
    perUjian: perUjian.rows.map((x) => ({
      ...x,
      kkm: Number(x.kkm),
      kelas: x.kelas || '—',
    })),
    detail: detail.rows.map((x) => ({ ...x, kkm: Number(x.kkm) })),
    ringkas,
  })
}))

// Unduhan CSV mengikuti saringan yang sama dengan halaman laporan, sehingga
// angka di layar dan di Excel tidak pernah berbeda.
r.get('/ekspor/csv', bungkus(async (req, res) => {
  const { where, params } = saringan(req.query, await batasiMapel(req))
  const rows = await q(
    `SELECT p.kelas, p.nis, p.nama, m.nama AS mapel_nama, u.judul AS ujian_judul,
            pr.nilai, u.kkm, pr.perlu_penilaian, pr.selesai_pada
     ${DARI}
     WHERE ${where}
     ORDER BY p.kelas, p.nama, u.judul`,
    params,
  )
  const kepala = ['Kelas', 'NIS', 'Nama', 'Mata Pelajaran', 'Ujian', 'Nilai', 'KKM', 'Status', 'Selesai']
  const kutip = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const baris = rows.rows.map((x) => [
    x.kelas, x.nis, x.nama, x.mapel_nama, x.ujian_judul, x.nilai, x.kkm,
    x.perlu_penilaian ? 'Menunggu penilaian' : Number(x.nilai) >= Number(x.kkm) ? 'Tuntas' : 'Belum tuntas',
    x.selesai_pada ? new Date(x.selesai_pada).toLocaleString('id-ID') : '',
  ].map(kutip).join(';'))
  const csv = '\uFEFF' + [kepala.map(kutip).join(';'), ...baris].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="laporan-nilai-shanatech-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
}))

export default r
