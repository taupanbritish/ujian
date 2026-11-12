import { Router } from 'express'
import { z } from 'zod'
import { q, satu, transaksi } from '../db/pool.js'
import { bungkus, Galat, angka, bersih, tokenAcak, statusUjian } from '../lib/http.js'
import { catatAktivitas } from '../lib/ujian.js'
import { getPengaturan } from '../lib/pengaturan.js'
import { batasiMapel, milikGuru } from '../lib/guru.js'

const r = Router()

const AGREGAT = `
  (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS jumlah_soal,
  (SELECT COALESCE(sum(us.bobot),0)::float FROM ujian_soal us WHERE us.ujian_id=u.id) AS total_bobot,
  (SELECT count(*)::int FROM pengguna p WHERE p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif
     AND (cardinality(u.kelas_target)=0 OR p.kelas = ANY(u.kelas_target))) AS sasaran,
  (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='selesai') AS jumlah_selesai,
  (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='berlangsung') AS jumlah_berlangsung,
  (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.perlu_penilaian) AS perlu_penilaian,
  (SELECT round(avg(pr.nilai)::numeric,1)::float FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='selesai') AS rata_nilai`

const KOLOM = `u.*, m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna, ${AGREGAT}`

const hias = (rows) => rows.map((u) => ({ ...u, status_efektif: statusUjian(u) }))

r.get('/', bungkus(async (req, res) => {
  const where = ['u.dihapus_pada IS NULL']
  const params = []
  if (req.query.cari) {
    params.push(`%${bersih(req.query.cari)}%`)
    where.push(`(u.judul ILIKE $${params.length} OR u.deskripsi ILIKE $${params.length} OR u.token ILIKE $${params.length})`)
  }
  if (angka(req.query.mapel)) {
    params.push(angka(req.query.mapel))
    where.push(`u.mapel_id = $${params.length}`)
  }
  const gm = await batasiMapel(req)
  if (gm) { params.push(gm); where.push(`u.mapel_id = ANY($${params.length}::int[])`) }
  const rows = await q(`SELECT ${KOLOM} FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE ${where.join(' AND ')} ORDER BY u.mulai_pada DESC`, params)
  let data = hias(rows.rows)
  if (req.query.status && req.query.status !== 'semua') data = data.filter((u) => u.status_efektif === req.query.status)
  res.json({ data })
}))

r.get('/:id', bungkus(async (req, res) => {
  const u = await satu(`SELECT ${KOLOM} FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE u.id=$1 AND u.dihapus_pada IS NULL`, [angka(req.params.id)])
  if (!u) throw new Galat(404, 'Ujian tidak ditemukan.')
  if (!milikGuru(await batasiMapel(req), u.mapel_id)) throw new Galat(404, 'Ujian tidak ditemukan.')
  const soal = await q(
    `SELECT us.urutan, us.bobot, s.id, s.tipe, s.pertanyaan, s.opsi, s.kunci, s.pembahasan, s.tingkat, s.topik,
            m.nama AS mapel_nama, m.warna AS mapel_warna
     FROM ujian_soal us JOIN soal s ON s.id=us.soal_id JOIN mapel m ON m.id=s.mapel_id
     WHERE us.ujian_id=$1 AND s.dihapus_pada IS NULL ORDER BY us.urutan`,
    [u.id],
  )
  const peserta = await q(
    `SELECT p.id, p.nama, p.nis, p.kelas,
       (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=p.id) AS percobaan,
       (SELECT pr.status FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=p.id ORDER BY pr.dibuat_pada DESC LIMIT 1) AS status_terakhir,
       (SELECT max(pr.nilai)::float FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=p.id AND pr.status='selesai') AS nilai_terbaik
     FROM pengguna p, ujian u
     WHERE u.id=$1 AND p.peran='siswa' AND p.dihapus_pada IS NULL AND (cardinality(u.kelas_target)=0 OR p.kelas = ANY(u.kelas_target))
     ORDER BY p.kelas, p.nama`,
    [u.id],
  )
  res.json({ ujian: { ...u, status_efektif: statusUjian(u) }, soal: soal.rows, peserta: peserta.rows })
}))

const skemaUjian = z.object({
  judul: z.string().min(5, 'Judul ujian minimal 5 karakter.').max(160),
  mapel_id: z.coerce.number().int().positive(),
  deskripsi: z.string().max(1200).nullable().optional(),
  durasi_menit: z.coerce.number().int().min(5).max(300),
  token: z.string().max(12).nullable().optional(),
  mulai_pada: z.string().min(4),
  selesai_pada: z.string().min(4),
  status: z.enum(['draf', 'terbit', 'ditutup']).default('draf'),
  acak_soal: z.boolean().default(true),
  acak_opsi: z.boolean().default(false),
  tampil_pembahasan: z.boolean().default(true),
  kkm: z.coerce.number().min(0).max(100).default(70),
  batas_percobaan: z.coerce.number().int().min(1).max(10).default(1),
  kelas_target: z.array(z.string()).default([]),
}).superRefine((v, ctx) => {
  if (new Date(v.selesai_pada).getTime() <= new Date(v.mulai_pada).getTime()) {
    ctx.addIssue({ code: 'custom', message: 'Waktu selesai harus setelah waktu mulai.' })
  }
})

async function simpan(req, id) {
  const v = skemaUjian.parse(req.body)
  const mapel = await satu('SELECT kode FROM mapel WHERE id=$1', [v.mapel_id])
  if (!mapel) throw new Galat(400, 'Mata pelajaran tidak dikenal.')
  const token = bersih(v.token || '') || tokenAcak(mapel.kode)
  const nilai = [v.mapel_id, bersih(v.judul), v.deskripsi || null, v.durasi_menit, token.toUpperCase(), v.mulai_pada, v.selesai_pada,
    v.status, v.acak_soal, v.acak_opsi, v.tampil_pembahasan, v.kkm, v.batas_percobaan, v.kelas_target]
  if (id) {
    await q(
      `UPDATE ujian SET mapel_id=$1,judul=$2,deskripsi=$3,durasi_menit=$4,token=$5,mulai_pada=$6,selesai_pada=$7,status=$8,
       acak_soal=$9,acak_opsi=$10,tampil_pembahasan=$11,kkm=$12,batas_percobaan=$13,kelas_target=$14,diubah_pada=now() WHERE id=$15`,
      [...nilai, id],
    )
    return id
  }
  const baru = await satu(
    `INSERT INTO ujian (mapel_id,judul,deskripsi,durasi_menit,token,mulai_pada,selesai_pada,status,acak_soal,acak_opsi,tampil_pembahasan,kkm,batas_percobaan,kelas_target,dibuat_oleh)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [...nilai, req.pengguna.id],
  )
  return baru.id
}

r.post('/', bungkus(async (req, res) => {
  const id = await simpan(req, null)
  await catatAktivitas(req.pengguna.id, 'ujian_baru', `${req.pengguna.nama} membuat ujian “${bersih(req.body.judul)}”`, '#A3E635')
  res.status(201).json({ id, pesan: 'Ujian dibuat. Lanjutkan dengan memilih soal.' })
}))

// ── Impor massal ujian dari Excel ────────────────────────────────────────────
// Mapel dikenali dari kode atau nama (diutamakan jenjang aktif). Ujian hasil
// impor selalu berstatus DRAF karena belum memiliki butir soal; terbitkan
// setelah soal dipilih. Tanggal dibaca sebagai teks "YYYY-MM-DD HH:mm".
function parseTanggal(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  const s = String(v ?? '').trim()
  if (!s) return null
  const normal = s.replace('/', '-').replace('.', '-')
  const d = new Date(normal.includes('T') ? normal : normal.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

const skemaBarisUjian = z.object({
  judul: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(160),
  mapel: z.string().trim().min(1, 'Mata pelajaran wajib diisi.'),
  deskripsi: z.string().trim().max(1200).optional().default(''),
  durasi_menit: z.coerce.number().int().min(5).max(300).default(60),
  mulai_pada: z.string().trim().min(4, 'Waktu mulai wajib diisi.'),
  selesai_pada: z.string().trim().min(4, 'Waktu selesai wajib diisi.'),
  kkm: z.coerce.number().min(0).max(100).default(70),
  batas_percobaan: z.coerce.number().int().min(1).max(10).default(1),
  kelas_target: z.string().trim().optional().default(''),
})

r.post('/import', bungkus(async (req, res) => {
  const { baris } = z.object({
    baris: z.array(z.any()).min(1, 'Tidak ada baris data pada file.').max(500, 'Maksimal 500 baris per impor.'),
  }).parse(req.body)

  const p = await getPengaturan()
  const { rows: mapelRows } = await q('SELECT id, kode, nama, jenjang FROM mapel WHERE dihapus_pada IS NULL')
  const cariMapel = (teks) => {
    const t = String(teks || '').trim()
    const upper = t.toUpperCase()
    const sama = (x) => x.kode.toUpperCase() === upper || x.nama.toLowerCase() === t.toLowerCase()
    return mapelRows.find((m) => m.jenjang === p.jenjang && sama(m))
      || mapelRows.find((m) => sama(m))
      || null
  }

  const dibuat = []
  const dilewati = []
  const galat = []

  for (let i = 0; i < baris.length; i++) {
    const nomor = i + 2
    const raw = baris[i] || {}
    const parsed = skemaBarisUjian.safeParse({
      judul: raw.judul, mapel: raw.mapel, deskripsi: raw.deskripsi ?? '',
      durasi_menit: raw.durasi_menit || 60, mulai_pada: raw.mulai_pada, selesai_pada: raw.selesai_pada,
      kkm: raw.kkm || 70, batas_percobaan: raw.batas_percobaan || 1, kelas_target: raw.kelas_target ?? '',
    })
    if (!parsed.success) {
      galat.push({ baris: nomor, pesan: parsed.error.issues.map((x) => x.message).join(' ') })
      continue
    }
    const v = parsed.data

    const mapel = cariMapel(v.mapel)
    if (!mapel) { galat.push({ baris: nomor, pesan: `Mata pelajaran "${v.mapel}" tidak ditemukan (kode/nama).` }); continue }

    const mulai = parseTanggal(v.mulai_pada)
    const selesai = parseTanggal(v.selesai_pada)
    if (!mulai) { galat.push({ baris: nomor, pesan: 'Format waktu mulai tidak dikenali (gunakan YYYY-MM-DD HH:mm).' }); continue }
    if (!selesai) { galat.push({ baris: nomor, pesan: 'Format waktu selesai tidak dikenali (gunakan YYYY-MM-DD HH:mm).' }); continue }
    if (selesai.getTime() <= mulai.getTime()) { galat.push({ baris: nomor, pesan: 'Waktu selesai harus setelah waktu mulai.' }); continue }

    const kelasTarget = v.kelas_target
      ? v.kelas_target.split(/[,;]/).map((k) => k.trim()).filter(Boolean)
      : []
    const token = tokenAcak(mapel.kode)

    try {
      const baru = await satu(
        `INSERT INTO ujian (mapel_id,judul,deskripsi,durasi_menit,token,mulai_pada,selesai_pada,status,acak_soal,acak_opsi,tampil_pembahasan,kkm,batas_percobaan,kelas_target,dibuat_oleh)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'draf',TRUE,FALSE,TRUE,$8,$9,$10,$11) RETURNING id`,
        [mapel.id, v.judul, v.deskripsi || null, v.durasi_menit, token, mulai.toISOString(), selesai.toISOString(),
          v.kkm, v.batas_percobaan, kelasTarget, req.pengguna.id],
      )
      dibuat.push({ id: baru.id, judul: v.judul, mapel: mapel.nama, token })
    } catch (e) {
      galat.push({ baris: nomor, pesan: e.message })
    }
  }

  if (dibuat.length) {
    await catatAktivitas(req.pengguna.id, 'ujian_baru', `${req.pengguna.nama} mengimpor ${dibuat.length} ujian dari Excel`, '#A3E635')
  }
  res.json({
    dibuat: dibuat.length, dilewati: dilewati.length, galat: galat.length,
    rincian_dibuat: dibuat, rincian_galat: galat,
    pesan: `${dibuat.length} ujian dibuat sebagai draf · ${galat.length} baris gagal.`,
  })
}))

r.patch('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const ada = await satu('SELECT id FROM ujian WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Ujian tidak ditemukan.')
  await simpan(req, id)
  res.json({ id, pesan: 'Pengaturan ujian tersimpan.' })
}))

r.put('/:id/soal', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const daftar = z.array(z.object({ soal_id: z.coerce.number().int().positive(), bobot: z.coerce.number().min(0.5).max(20).default(1) })).max(150).parse(req.body.daftar)
  const ada = await satu('SELECT id FROM ujian WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Ujian tidak ditemukan.')
  if (daftar.length) {
    const ids = [...new Set(daftar.map((d) => d.soal_id))]
    const valid = await satu('SELECT count(*)::int AS n FROM soal WHERE id = ANY($1::int[]) AND dihapus_pada IS NULL', [ids])
    if (valid.n !== ids.length) throw new Galat(400, 'Sebagian soal sudah diarsipkan dan tidak dapat dipakai.')
  }
  await transaksi(async (c) => {
    await c.query('DELETE FROM ujian_soal WHERE ujian_id=$1', [id])
    for (let i = 0; i < daftar.length; i++) {
      await c.query('INSERT INTO ujian_soal (ujian_id,soal_id,urutan,bobot) VALUES ($1,$2,$3,$4)', [id, daftar[i].soal_id, i, daftar[i].bobot])
    }
    await c.query('UPDATE ujian SET diubah_pada=now() WHERE id=$1', [id])
  })
  res.json({ pesan: `${daftar.length} soal tersusun pada ujian ini.`, jumlah: daftar.length })
}))

r.post('/:id/status', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const { status } = z.object({ status: z.enum(['draf', 'terbit', 'ditutup']) }).parse(req.body)
  const u = await satu('SELECT * FROM ujian WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!u) throw new Galat(404, 'Ujian tidak ditemukan.')
  if (status === 'terbit') {
    const j = await satu('SELECT count(*)::int AS n FROM ujian_soal WHERE ujian_id=$1', [id])
    if (j.n === 0) throw new Galat(400, 'Ujian belum memiliki soal. Tambahkan minimal satu soal sebelum menerbitkan.')
  }
  await q('UPDATE ujian SET status=$1, diubah_pada=now() WHERE id=$2', [status, id])
  const label = { draf: 'dikembalikan ke draf', terbit: 'diterbitkan', ditutup: 'ditutup' }[status]
  await catatAktivitas(req.pengguna.id, 'ujian_status', `Ujian “${u.judul}” ${label}`, status === 'terbit' ? '#A3E635' : '#FFB020')
  res.json({ pesan: `Ujian ${label}.` })
}))

r.post('/:id/token', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const u = await satu('SELECT u.judul, m.kode FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE u.id=$1 AND u.dihapus_pada IS NULL', [id])
  if (!u) throw new Galat(404, 'Ujian tidak ditemukan.')
  const token = tokenAcak(u.kode)
  await q('UPDATE ujian SET token=$1, diubah_pada=now() WHERE id=$2', [token, id])
  res.json({ token, pesan: 'Token ujian diperbarui. Bagikan token baru kepada peserta.' })
}))

r.delete('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const aktif = await satu(`SELECT count(*)::int AS n FROM percobaan WHERE ujian_id=$1 AND status='berlangsung'`, [id])
  if (aktif.n > 0) throw new Galat(409, `Masih ada ${aktif.n} peserta yang sedang mengerjakan. Tutup ujian terlebih dahulu.`)
  const hasil = await q('UPDATE ujian SET dihapus_pada=now() WHERE id=$1 AND dihapus_pada IS NULL RETURNING id', [id])
  if (!hasil.rows.length) throw new Galat(404, 'Ujian tidak ditemukan.')
  res.json({ id, pesan: 'Ujian diarsipkan beserta rekap nilainya.' })
}))

r.post('/:id/pulihkan', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const hasil = await q('UPDATE ujian SET dihapus_pada=NULL WHERE id=$1 RETURNING id', [id])
  if (!hasil.rows.length) throw new Galat(404, 'Ujian tidak ditemukan.')
  res.json({ id, pesan: 'Ujian dipulihkan.' })
}))

export default r