import { Router } from 'express'
import { z } from 'zod'
import { q, satu } from '../db/pool.js'
import { bungkus, Galat, angka, bersih } from '../lib/http.js'
import { catatAktivitas } from '../lib/ujian.js'
import { batasiMapel, milikGuru } from '../lib/guru.js'
import { getPengaturan } from '../lib/pengaturan.js'
import { skemaLampiran, tautkanSoal, lampiranDariTeks } from '../lib/media.js'

const r = Router()

const skemaSoal = z.object({
  mapel_id: z.coerce.number().int().positive(),
  tipe: z.enum(['pilihan_ganda', 'benar_salah', 'isian', 'esai']),
  pertanyaan: z.string().min(8, 'Pertanyaan minimal 8 karakter.').max(4000),
  opsi: z.array(z.object({
    id: z.string().min(1),
    teks: z.string().min(1, 'Teks opsi tidak boleh kosong.'),
    lampiran: skemaLampiran.default([]),
  })).max(5).default([]),
  lampiran: skemaLampiran.default([]),
  kunci: z.string().max(4000).nullable().optional(),
  pembahasan: z.string().max(4000).nullable().optional(),
  tingkat: z.enum(['mudah', 'sedang', 'sulit']).default('sedang'),
  bobot: z.coerce.number().min(0.5).max(20).default(1),
  topik: z.string().max(80).nullable().optional(),
}).superRefine((v, ctx) => {
  if (v.tipe === 'pilihan_ganda') {
    if (v.opsi.length < 2) ctx.addIssue({ code: 'custom', message: 'Pilihan ganda membutuhkan minimal dua opsi.' })
    if (!v.opsi.some((o) => o.id === v.kunci)) ctx.addIssue({ code: 'custom', message: 'Kunci jawaban harus salah satu opsi yang tersedia.' })
  }
  if (v.tipe === 'benar_salah' && !['benar', 'salah'].includes(v.kunci)) {
    ctx.addIssue({ code: 'custom', message: 'Kunci benar/salah harus “benar” atau “salah”.' })
  }
  if (v.tipe === 'isian' && !String(v.kunci || '').trim()) ctx.addIssue({ code: 'custom', message: 'Soal isian wajib memiliki kunci jawaban.' })
})

const KOLOM = `s.id, s.mapel_id, s.tipe, s.pertanyaan, s.opsi, s.lampiran, s.kunci, s.pembahasan, s.tingkat, s.bobot, s.topik,
  s.dibuat_pada, s.diubah_pada, m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna,
  (SELECT count(*)::int FROM ujian_soal us JOIN ujian u ON u.id=us.ujian_id WHERE us.soal_id=s.id AND u.dihapus_pada IS NULL) AS dipakai`

// Lampiran yang menunjuk media_id harus benar-benar ada di tabel media;
// tanpa ini soal bisa tersimpan dengan rujukan berkas yang sudah dihapus.
async function pastikanMedia(v) {
  const semua = [
    ...(v.lampiran || []),
    ...(v.opsi || []).flatMap((o) => o.lampiran || []),
  ]
  const ids = [...new Set(semua.filter((l) => l.media_id).map((l) => l.media_id))]
  if (!ids.length) return
  const { rows } = await q('SELECT id FROM media WHERE id = ANY($1::int[])', [ids])
  const ada = new Set(rows.map((r) => r.id))
  const hilang = ids.filter((x) => !ada.has(x))
  if (hilang.length) throw new Galat(422, `Berkas lampiran tidak ditemukan (id ${hilang.join(', ')}). Unggah ulang berkasnya.`)
}

function penyaring(query) {
  const where = ['s.dihapus_pada IS NULL']
  const params = []
  const tambah = (sql, nilai) => {
    params.push(nilai)
    where.push(sql.replace(/\?/g, `$${params.length}`))
  }
  if (query.cari) tambah('(s.pertanyaan ILIKE ? OR s.topik ILIKE ? OR s.pembahasan ILIKE ?)', `%${bersih(query.cari)}%`)
  if (angka(query.mapel)) tambah('s.mapel_id = ?', angka(query.mapel))
  if (['pilihan_ganda', 'benar_salah', 'isian', 'esai'].includes(query.tipe)) tambah('s.tipe = ?', query.tipe)
  if (['mudah', 'sedang', 'sulit'].includes(query.tingkat)) tambah('s.tingkat = ?', query.tingkat)
  return { where: where.join(' AND '), params }
}

const URUTAN = {
  terbaru: 's.dibuat_pada DESC, s.id DESC',
  terlama: 's.dibuat_pada ASC, s.id ASC',
  tingkat: `CASE s.tingkat WHEN 'mudah' THEN 0 WHEN 'sedang' THEN 1 ELSE 2 END, s.id`,
  mapel: 'm.nama, s.id',
  sering: 'dipakai DESC, s.id',
}

r.get('/', bungkus(async (req, res) => {
  const { where, params } = penyaring(req.query)
  const gm = await batasiMapel(req)
  let whereSql = where
  if (gm) { params.push(gm); whereSql += ` AND s.mapel_id = ANY($${params.length}::int[])` }
  const batas = Math.min(60, Math.max(4, angka(req.query.batas, 12)))
  const halaman = Math.max(1, angka(req.query.halaman, 1))
  const urut = URUTAN[req.query.urutan] || URUTAN.terbaru
  const total = await satu(`SELECT count(*)::int AS n FROM soal s JOIN mapel m ON m.id=s.mapel_id WHERE ${whereSql}`, params)
  const rows = await q(
    `SELECT ${KOLOM} FROM soal s JOIN mapel m ON m.id=s.mapel_id WHERE ${whereSql} ORDER BY ${urut} LIMIT ${batas} OFFSET ${(halaman - 1) * batas}`,
    params,
  )
  const ringkas = await satu(
    `SELECT count(*)::int AS total,
      count(*) FILTER (WHERE s.tipe='pilihan_ganda')::int AS pilihan_ganda,
      count(*) FILTER (WHERE s.tipe='benar_salah')::int AS benar_salah,
      count(*) FILTER (WHERE s.tipe='isian')::int AS isian,
      count(*) FILTER (WHERE s.tipe='esai')::int AS esai,
      count(*) FILTER (WHERE s.tingkat='sulit')::int AS sulit
     FROM soal s WHERE ${whereSql}`, params,
  )
  res.json({ data: rows.rows.map((s) => tautkanSoal(s)), total: total.n, halaman, batas, ringkas })
}))

r.get('/arsip/daftar', bungkus(async (req, res) => {
  const gm = await batasiMapel(req)
  const params = []
  let where = 's.dihapus_pada IS NOT NULL'
  if (gm) { params.push(gm); where += ' AND s.mapel_id = ANY($1::int[])' }
  const rows = await q(`SELECT ${KOLOM} FROM soal s JOIN mapel m ON m.id=s.mapel_id WHERE ${where} ORDER BY s.dihapus_pada DESC LIMIT 100`, params)
  res.json({ data: rows.rows.map((s) => tautkanSoal(s)) })
}))

r.get('/:id', bungkus(async (req, res) => {
  const soal = await satu(`SELECT ${KOLOM} FROM soal s JOIN mapel m ON m.id=s.mapel_id WHERE s.id=$1 AND s.dihapus_pada IS NULL`, [angka(req.params.id)])
  if (!soal) throw new Galat(404, 'Soal tidak ditemukan.')
  if (!milikGuru(await batasiMapel(req), soal.mapel_id)) throw new Galat(404, 'Soal tidak ditemukan.')
  const ujian = await q(
    `SELECT u.id, u.judul, u.status FROM ujian_soal us JOIN ujian u ON u.id=us.ujian_id WHERE us.soal_id=$1 AND u.dihapus_pada IS NULL ORDER BY u.mulai_pada DESC`,
    [soal.id],
  )
  res.json({ soal: tautkanSoal(soal), ujian: ujian.rows })
}))

r.post('/', bungkus(async (req, res) => {
  const v = skemaSoal.parse(req.body)
  if (!milikGuru(await batasiMapel(req), v.mapel_id)) {
    throw new Galat(403, 'Soal hanya dapat dibuat untuk mata pelajaran yang Anda ampu.')
  }
  await pastikanMedia(v)
  const baru = await satu(
    `INSERT INTO soal (mapel_id,tipe,pertanyaan,opsi,lampiran,kunci,pembahasan,tingkat,bobot,topik,dibuat_oleh)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [v.mapel_id, v.tipe, bersih(v.pertanyaan), JSON.stringify(v.opsi), JSON.stringify(v.lampiran), v.kunci || null, v.pembahasan || null, v.tingkat, v.bobot, v.topik || null, req.pengguna.id],
  )
  await catatAktivitas(req.pengguna.id, 'soal_baru', `${req.pengguna.nama} menambahkan soal ${v.tipe.replace('_', ' ')} baru`, '#7C5CFF')
  res.status(201).json({ id: baru.id, pesan: 'Soal berhasil ditambahkan ke bank soal.' })
}))

// ---- Impor massal dari Excel -------------------------------------------------
const PETA_TIPE = {
  pg: 'pilihan_ganda', pilihan_ganda: 'pilihan_ganda', pilihanganda: 'pilihan_ganda', 'pilihan ganda': 'pilihan_ganda', multiplechoice: 'pilihan_ganda',
  bs: 'benar_salah', benar_salah: 'benar_salah', benarsalah: 'benar_salah', 'benar salah': 'benar_salah', 'benar/salah': 'benar_salah',
  is: 'isian', isian: 'isian', isiansingkat: 'isian', 'isian singkat': 'isian',
  es: 'esai', esai: 'esai', uraian: 'esai', essay: 'esai',
}
const HURUF = ['a', 'b', 'c', 'd', 'e']
const TINGKAT_SET = new Set(['mudah', 'sedang', 'sulit'])

const normalTipe = (t) => PETA_TIPE[String(t ?? '').toLowerCase().trim()] || ''

// Cocokkan kode/nama mapel terhadap katalog; utamakan jenjang aktif.
async function cariMapelId(teks, jenjang) {
  const t = String(teks || '').trim()
  if (!t) return null
  const upper = t.toUpperCase()
  const { rows } = await q('SELECT id, kode, nama, jenjang FROM mapel WHERE dihapus_pada IS NULL')
  const sama = (m) => m.kode.toUpperCase() === upper || m.nama.toLowerCase() === t.toLowerCase()
  const cocok = rows.find((m) => m.jenjang === jenjang && sama(m)) || rows.find(sama)
  return cocok ? cocok.id : null
}

// Terima kunci berupa huruf (a-e), angka (1-5), atau teks opsi persis.
function kunciPg(mentah, opsi) {
  const t = String(mentah ?? '').trim().toLowerCase()
  if (HURUF.includes(t)) return t
  const n = Number(t)
  if (n >= 1 && n <= opsi.length) return HURUF[n - 1]
  const cocok = opsi.find((o) => o.teks.toLowerCase() === t)
  return cocok ? cocok.id : ''
}

function kunciBs(mentah) {
  const t = String(mentah ?? '').trim().toLowerCase()
  if (['benar', 'b', 'true', '1', 'ya'].includes(t)) return 'benar'
  if (['salah', 's', 'false', '0', 'tidak'].includes(t)) return 'salah'
  return ''
}

// Baris Excel -> objek soal siap validasi. Melempar Error berisi alasan bila tak bisa diproses.
function barisKeSoal(b, mapelId) {
  const tipe = normalTipe(b.tipe)
  if (!tipe) throw new Error(`Bentuk soal "${b.tipe || '(kosong)'}" tidak dikenali.`)
  const pertanyaan = bersih(b.pertanyaan)
  if (!pertanyaan) throw new Error('Kolom pertanyaan kosong.')
  const tingkat = TINGKAT_SET.has(String(b.tingkat || '').toLowerCase()) ? String(b.tingkat).toLowerCase() : 'sedang'
  const bobot = Math.min(10, Math.max(0.5, Number(b.bobot) || 1))
  const pembahasan = bersih(b.pembahasan) || null
  const topik = bersih(b.topik) || null
  // Lampiran dari Excel berupa tautan eksternal; beberapa tautan dalam satu sel
  // dipisahkan titik koma. Berkas unggahan dilakukan lewat antarmuka.
  const lampiran = [
    ...lampiranDariTeks('gambar', b.gambar, b.gambar_alt),
    ...lampiranDariTeks('audio', b.audio),
    ...lampiranDariTeks('video', b.video),
  ]

  if (tipe === 'pilihan_ganda') {
    const opsi = HURUF.map((h) => ({ id: h, teks: bersih(b[`opsi_${h}`]) })).filter((o) => o.teks)
    if (opsi.length < 2) throw new Error('Pilihan ganda butuh minimal dua opsi (opsi_a, opsi_b, …).')
    const kunci = kunciPg(b.kunci, opsi)
    if (!kunci) throw new Error(`Kunci "${b.kunci || '(kosong)'}" tidak cocok dengan opsi yang ada.`)
    return { mapel_id: mapelId, tipe, pertanyaan, opsi, lampiran, kunci, pembahasan, tingkat, bobot, topik }
  }
  if (tipe === 'benar_salah') {
    const kunci = kunciBs(b.kunci)
    if (!kunci) throw new Error('Kunci benar/salah harus berisi "benar" atau "salah".')
    return { mapel_id: mapelId, tipe, pertanyaan, opsi: [{ id: 'benar', teks: 'Benar' }, { id: 'salah', teks: 'Salah' }], lampiran, kunci, pembahasan, tingkat, bobot, topik }
  }
  if (tipe === 'isian') {
    const kunci = bersih(b.kunci)
    if (!kunci) throw new Error('Isian singkat membutuhkan kunci jawaban.')
    return { mapel_id: mapelId, tipe, pertanyaan, opsi: [], lampiran, kunci, pembahasan, tingkat, bobot, topik }
  }
  // esai: kunci dipakai sebagai pedoman penskoran (opsional)
  return { mapel_id: mapelId, tipe, pertanyaan, opsi: [], lampiran, kunci: bersih(b.kunci) || null, pembahasan, tingkat, bobot, topik }
}

r.post('/import', bungkus(async (req, res) => {
  const baris = Array.isArray(req.body?.baris) ? req.body.baris : []
  if (!baris.length) throw new Galat(400, 'Tidak ada baris untuk diimpor.')
  if (baris.length > 500) throw new Galat(400, 'Maksimal 500 baris per impor soal.')
  const p = await getPengaturan()
  const gm = await batasiMapel(req)

  let dibuat = 0
  const rincianGalat = []
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i] || {}
    const nomor = i + 2 // nomor baris di Excel (baris 1 = header)
    try {
      let mapelId = null
      if (String(b.mapel || '').trim()) {
        mapelId = await cariMapelId(b.mapel, p.jenjang)
        if (!mapelId) throw new Error(`Mapel "${b.mapel}" tidak ditemukan.`)
      } else {
        const kandidat = gm || (await q('SELECT id FROM mapel WHERE dihapus_pada IS NULL')).rows.map((x) => x.id)
        if (kandidat.length === 1) mapelId = kandidat[0]
        else throw new Error('Kolom mapel wajib diisi karena terdapat lebih dari satu mata pelajaran.')
      }
      if (!milikGuru(gm, mapelId)) throw new Error('Mapel tujuan bukan mata pelajaran yang Anda ampu.')
      const d = barisKeSoal(b, mapelId)
      const v = skemaSoal.parse(d)
      await pastikanMedia(v)
      await q(
        `INSERT INTO soal (mapel_id,tipe,pertanyaan,opsi,lampiran,kunci,pembahasan,tingkat,bobot,topik,dibuat_oleh)
         VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11)`,
        [v.mapel_id, v.tipe, bersih(v.pertanyaan), JSON.stringify(v.opsi), JSON.stringify(v.lampiran), v.kunci || null, v.pembahasan || null, v.tingkat, v.bobot, v.topik || null, req.pengguna.id],
      )
      dibuat++
    } catch (e) {
      rincianGalat.push({ baris: nomor, pesan: e?.pesan || e?.issues?.[0]?.message || e?.message || 'Baris tidak valid.' })
    }
  }
  if (dibuat) await catatAktivitas(req.pengguna.id, 'soal_baru', `${req.pengguna.nama} mengimpor ${dibuat} soal dari Excel`, '#22D3EE')
  res.json({
    dibuat,
    galat: rincianGalat.length,
    rincianGalat: rincianGalat.slice(0, 40),
    pesan: dibuat ? `${dibuat} soal berhasil ditambahkan ke bank soal.` : 'Tidak ada soal yang berhasil diimpor.',
  })
}))

r.patch('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const ada = await satu('SELECT id, mapel_id FROM soal WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Soal tidak ditemukan.')
  const v = skemaSoal.parse(req.body)
  const gm = await batasiMapel(req)
  if (!milikGuru(gm, ada.mapel_id) || !milikGuru(gm, v.mapel_id)) {
    throw new Galat(404, 'Soal tidak ditemukan.')
  }
  await pastikanMedia(v)
  await q(
    `UPDATE soal SET mapel_id=$1,tipe=$2,pertanyaan=$3,opsi=$4::jsonb,lampiran=$5::jsonb,kunci=$6,pembahasan=$7,tingkat=$8,bobot=$9,topik=$10,diubah_pada=now() WHERE id=$11`,
    [v.mapel_id, v.tipe, bersih(v.pertanyaan), JSON.stringify(v.opsi), JSON.stringify(v.lampiran), v.kunci || null, v.pembahasan || null, v.tingkat, v.bobot, v.topik || null, id],
  )
  const terpakai = await satu('SELECT count(*)::int AS n FROM ujian_soal WHERE soal_id=$1', [id])
  res.json({ pesan: 'Perubahan soal tersimpan.', dipakai: terpakai.n })
}))

r.delete('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const ada = await satu('SELECT id, mapel_id FROM soal WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!ada) throw new Galat(404, 'Soal tidak ditemukan.')
  if (!milikGuru(await batasiMapel(req), ada.mapel_id)) throw new Galat(404, 'Soal tidak ditemukan.')
  await q('UPDATE soal SET dihapus_pada=now() WHERE id=$1', [id])
  res.json({ pesan: 'Soal dipindahkan ke arsip.', id })
}))

r.post('/hapus-banyak', bungkus(async (req, res) => {
  const ids = z.array(z.coerce.number().int().positive()).min(1).max(200).parse(req.body.ids)
  const gm = await batasiMapel(req)
  const params = [ids]
  let where = 'id = ANY($1::int[]) AND dihapus_pada IS NULL'
  if (gm) { params.push(gm); where += ' AND mapel_id = ANY($2::int[])' }
  const hasil = await q(`UPDATE soal SET dihapus_pada=now() WHERE ${where} RETURNING id`, params)
  res.json({ pesan: `${hasil.rows.length} soal diarsipkan.`, ids: hasil.rows.map((x) => x.id) })
}))

r.post('/pulihkan', bungkus(async (req, res) => {
  const ids = z.array(z.coerce.number().int().positive()).min(1).max(200).parse(req.body.ids)
  const gm = await batasiMapel(req)
  const params = [ids]
  let where = 'id = ANY($1::int[])'
  if (gm) { params.push(gm); where += ' AND mapel_id = ANY($2::int[])' }
  const hasil = await q(`UPDATE soal SET dihapus_pada=NULL WHERE ${where} RETURNING id`, params)
  res.json({ pesan: `${hasil.rows.length} soal dipulihkan.`, ids: hasil.rows.map((x) => x.id) })
}))

r.post('/:id/duplikat', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const asal = await satu('SELECT mapel_id FROM soal WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!asal) throw new Galat(404, 'Soal tidak ditemukan.')
  if (!milikGuru(await batasiMapel(req), asal.mapel_id)) throw new Galat(404, 'Soal tidak ditemukan.')
  const hasil = await satu(
    `INSERT INTO soal (mapel_id,tipe,pertanyaan,opsi,lampiran,kunci,pembahasan,tingkat,bobot,topik,dibuat_oleh)
     SELECT mapel_id,tipe,pertanyaan,opsi,lampiran,kunci,pembahasan,tingkat,bobot,topik,$2 FROM soal WHERE id=$1 AND dihapus_pada IS NULL RETURNING id`,
    [id, req.pengguna.id],
  )
  if (!hasil) throw new Galat(404, 'Soal tidak ditemukan.')
  res.status(201).json({ id: hasil.id, pesan: 'Soal diduplikat.' })
}))

export default r