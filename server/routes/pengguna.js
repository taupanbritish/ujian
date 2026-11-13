import { Router } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { q, satu } from '../db/pool.js'
import { bungkus, Galat, angka, bersih } from '../lib/http.js'
import { hashSandi } from '../lib/sandi.js'
import { enkripsiSandi } from '../lib/sandi-kartu.js'
import { catatAktivitas } from '../lib/ujian.js'
import { urlMedia } from '../lib/media.js'

const r = Router()

// Kata sandi acak untuk akun hasil impor Excel: 10 karakter, dijamin memuat
// huruf besar, huruf kecil, dan angka (tanpa karakter ambigu 0/O/1/l/I).
const ATAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const BAWAH = 'abcdefghijkmnopqrstuvwxyz'
const DIGIT = '23456789'
function sandiAcak(panjang = 10) {
  const semua = ATAS + BAWAH + DIGIT
  const ambil = (s) => s[crypto.randomInt(s.length)]
  const arr = [ambil(ATAS), ambil(BAWAH), ambil(DIGIT)]
  while (arr.length < panjang) arr.push(ambil(semua))
  for (let i = arr.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1);[arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr.join('')
}

const KOLOM = `p.id, p.nama, p.email, p.nis, p.peran, p.kelas, p.gender, p.aktif, p.terakhir_masuk, p.dibuat_pada,
  CASE WHEN fm.id IS NULL THEN NULL ELSE p.foto_media_id END AS foto_media_id,
  (SELECT count(*)::int FROM percobaan pr WHERE pr.pengguna_id=p.id) AS jumlah_percobaan,
  (SELECT round(avg(pr.nilai)::numeric,1)::float FROM percobaan pr WHERE pr.pengguna_id=p.id AND pr.status='selesai') AS rata_nilai,
  (SELECT count(*)::int FROM percobaan pr WHERE pr.pengguna_id=p.id AND pr.status='berlangsung') AS sedang_mengerjakan`

const hiasFoto = (rows) => rows.map((x) => ({
  ...x,
  foto_url: x.foto_media_id ? urlMedia(x.foto_media_id, 24 * 3600) : null,
}))

r.get('/', bungkus(async (req, res) => {
  const where = ['p.dihapus_pada IS NULL']
  const params = []
  const tambah = (sql, nilai) => {
    params.push(nilai)
    where.push(sql.replace(/\?/g, `$${params.length}`))
  }
  if (['admin', 'guru', 'siswa'].includes(req.query.peran)) tambah('p.peran = ?', req.query.peran)
  if (req.query.kelas && req.query.kelas !== 'semua') tambah('p.kelas = ?', req.query.kelas)
  if (req.query.cari) tambah('(p.nama ILIKE ? OR p.email ILIKE ? OR p.nis ILIKE ?)', `%${bersih(req.query.cari)}%`)
  const urut = { nama: 'p.nama', kelas: 'p.kelas, p.nama', nilai: 'rata_nilai DESC NULLS LAST', baru: 'p.dibuat_pada DESC' }[req.query.urutan] || 'p.kelas, p.nama'
  const rows = await q(`SELECT ${KOLOM} FROM pengguna p
    LEFT JOIN media fm ON fm.id = p.foto_media_id AND fm.jenis='gambar'
    WHERE ${where.join(' AND ')} ORDER BY ${urut}`, params)
  const ringkas = await satu(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE p.peran='siswa')::int AS siswa,
       count(*) FILTER (WHERE p.peran='guru')::int AS guru,
       count(*) FILTER (WHERE p.peran='admin')::int AS admin,
       count(*) FILTER (WHERE NOT p.aktif)::int AS nonaktif
     FROM pengguna p WHERE ${where.join(' AND ')}`, params,
  )
  res.json({ data: hiasFoto(rows.rows), ringkas })
}))

const skemaPengguna = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter.').max(120),
  email: z.string().email('Format email tidak valid.'),
  nis: z.string().max(30).nullable().optional(),
  peran: z.enum(['admin', 'guru', 'siswa']),
  kelas: z.string().max(20).nullable().optional(),
  gender: z.enum(['L', 'P']).nullable().optional(),
  aktif: z.boolean().default(true),
  kata_sandi: z.string().min(8, 'Kata sandi minimal 8 karakter.').optional(),
  foto_media_id: z.union([z.null(), z.coerce.number().int().positive()]).optional(),
})

async function cekFoto(id) {
  if (!id) return null
  const media = await satu("SELECT id FROM media WHERE id=$1 AND jenis='gambar'", [id])
  if (!media) throw new Galat(400, 'Foto peserta tidak ditemukan atau bukan gambar.')
  return media.id
}

function batasi(req, peran) {
  if (req.pengguna.peran !== 'admin' && peran !== 'siswa') {
    throw new Galat(403, 'Hanya administrator yang dapat mengelola akun guru atau admin.')
  }
}

r.post('/', bungkus(async (req, res) => {
  const v = skemaPengguna.parse(req.body)
  batasi(req, v.peran)
  if (!v.kata_sandi) throw new Galat(400, 'Kata sandi awal wajib diisi.')
  const kembar = await satu('SELECT id FROM pengguna WHERE lower(email)=lower($1) OR ($2::text IS NOT NULL AND lower(nis)=lower($2))', [bersih(v.email), v.nis || null])
  if (kembar) throw new Galat(409, 'Email atau NIS sudah terdaftar.')
  const fotoId = v.peran === 'siswa' ? await cekFoto(v.foto_media_id) : null
  const baru = await satu(
    `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,kelas,gender,aktif,foto_media_id,sandi_kartu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [bersih(v.nama), bersih(v.email).toLowerCase(), v.nis || null, await hashSandi(v.kata_sandi), v.peran,
      v.peran === 'siswa' ? v.kelas || null : null, v.gender || null, v.aktif, fotoId,
      v.peran === 'siswa' ? enkripsiSandi(v.kata_sandi) : null],
  )
  await catatAktivitas(req.pengguna.id, 'pengguna_baru', `${req.pengguna.nama} menambahkan ${v.peran} “${bersih(v.nama)}”`, '#38BDF8')
  res.status(201).json({ id: baru.id, pesan: 'Akun berhasil dibuat.' })
}))

r.patch('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const target = await satu('SELECT id, peran, nama FROM pengguna WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!target) throw new Galat(404, 'Akun tidak ditemukan.')
  batasi(req, target.peran)
  const v = skemaPengguna.parse(req.body)
  batasi(req, v.peran)
  if (id === req.pengguna.id && (v.peran !== req.pengguna.peran || !v.aktif)) {
    throw new Galat(400, 'Anda tidak dapat menurunkan peran atau menonaktifkan akun sendiri.')
  }
  const kembar = await satu('SELECT id FROM pengguna WHERE id<>$1 AND (lower(email)=lower($2) OR ($3::text IS NOT NULL AND lower(nis)=lower($3)))', [id, bersih(v.email), v.nis || null])
  if (kembar) throw new Galat(409, 'Email atau NIS sudah dipakai akun lain.')
  const fotoId = v.peran === 'siswa' ? await cekFoto(v.foto_media_id) : null
  await q(
    'UPDATE pengguna SET nama=$1,email=$2,nis=$3,peran=$4,kelas=$5,gender=$6,aktif=$7,foto_media_id=$8 WHERE id=$9',
    [bersih(v.nama), bersih(v.email).toLowerCase(), v.nis || null, v.peran, v.peran === 'siswa' ? v.kelas || null : null, v.gender || null, v.aktif, fotoId, id],
  )
  if (v.kata_sandi) {
    await q(
      'UPDATE pengguna SET kata_sandi_hash=$1, sandi_kartu=$2 WHERE id=$3',
      [await hashSandi(v.kata_sandi), v.peran === 'siswa' ? enkripsiSandi(v.kata_sandi) : null, id],
    )
  }
  res.json({ pesan: 'Data akun tersimpan.' })
}))

r.delete('/:id', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  if (id === req.pengguna.id) throw new Galat(400, 'Anda tidak dapat menghapus akun sendiri.')
  const target = await satu('SELECT id, peran, nama FROM pengguna WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!target) throw new Galat(404, 'Akun tidak ditemukan.')
  batasi(req, target.peran)
  const live = await satu(`SELECT count(*)::int AS n FROM percobaan WHERE pengguna_id=$1 AND status='berlangsung'`, [id])
  if (live.n) throw new Galat(409, 'Peserta masih mengerjakan ujian. Selesaikan atau reset percobaannya terlebih dahulu.')
  await q('UPDATE pengguna SET dihapus_pada=now(), aktif=false WHERE id=$1', [id])
  res.json({ id, pesan: `Akun “${target.nama}” diarsipkan. Riwayat nilainya tetap tersimpan.` })
}))

r.post('/:id/pulihkan', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const target = await satu('SELECT peran FROM pengguna WHERE id=$1', [id])
  if (!target) throw new Galat(404, 'Akun tidak ditemukan.')
  batasi(req, target.peran)
  await q('UPDATE pengguna SET dihapus_pada=NULL, aktif=true WHERE id=$1', [id])
  res.json({ id, pesan: 'Akun dipulihkan.' })
}))

r.post('/:id/reset-sandi', bungkus(async (req, res) => {
  const id = angka(req.params.id)
  const { kata_sandi } = z.object({ kata_sandi: z.string().min(8, 'Kata sandi minimal 8 karakter.') }).parse(req.body)
  const target = await satu('SELECT peran, nama FROM pengguna WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!target) throw new Galat(404, 'Akun tidak ditemukan.')
  batasi(req, target.peran)
  await q(
    'UPDATE pengguna SET kata_sandi_hash=$1, sandi_kartu=$2 WHERE id=$3',
    [await hashSandi(kata_sandi), target.peran === 'siswa' ? enkripsiSandi(kata_sandi) : null, id],
  )
  await catatAktivitas(req.pengguna.id, 'keamanan', `Kata sandi “${target.nama}” diatur ulang oleh ${req.pengguna.nama}`, '#FF4D6D')
  res.json({ pesan: 'Kata sandi berhasil diatur ulang.' })
}))

const skemaBarisImpor = z.object({
  nama: z.string().trim().min(3, 'Nama minimal 3 karakter.').max(120),
  email: z.string().trim().email('Format email tidak valid.'),
  nis: z.string().trim().max(30).nullable().optional(),
  peran: z.enum(['admin', 'guru', 'siswa']).default('siswa'),
  kelas: z.string().trim().max(20).nullable().optional(),
  gender: z.enum(['L', 'P']).nullable().optional(),
})

// Impor massal akun dari Excel (diurai di sisi klien, dikirim sebagai array baris).
// Kata sandi di-generate acak per akun dan dikembalikan agar dapat ditampilkan/diunduh.
r.post('/import', bungkus(async (req, res) => {
  const { baris } = z.object({
    baris: z.array(z.any()).min(1, 'Tidak ada baris data pada file.').max(1000, 'Maksimal 1000 baris per impor.'),
  }).parse(req.body)

  const dibuat = []
  const kredensial = []
  const dilewati = []
  const galat = []
  const lihatEmail = new Set()
  const lihatNis = new Set()

  for (let i = 0; i < baris.length; i++) {
    const nomor = i + 2 // baris 1 = header kolom di Excel
    const raw = baris[i] || {}
    const parsed = skemaBarisImpor.safeParse({
      nama: raw.nama, email: raw.email, nis: raw.nis ?? null,
      peran: raw.peran || 'siswa', kelas: raw.kelas ?? null, gender: raw.gender ?? null,
    })
    if (!parsed.success) {
      galat.push({ baris: nomor, pesan: parsed.error.issues.map((x) => x.message).join(' ') })
      continue
    }
    const v = parsed.data
    const email = bersih(v.email).toLowerCase()
    const nis = v.nis ? String(v.nis).trim() : null
    const peran = v.peran

    if (peran === 'siswa' && !nis) { galat.push({ baris: nomor, pesan: 'NIS wajib diisi untuk akun peserta.' }); continue }
    if (peran === 'siswa' && !v.kelas) { galat.push({ baris: nomor, pesan: 'Kelas wajib diisi untuk akun peserta.' }); continue }

    if (lihatEmail.has(email)) { dilewati.push({ baris: nomor, nama: v.nama, alasan: 'Email duplikat di dalam file.' }); continue }
    if (nis && lihatNis.has(nis.toLowerCase())) { dilewati.push({ baris: nomor, nama: v.nama, alasan: 'NIS duplikat di dalam file.' }); continue }

    const kembar = await satu(
      'SELECT id FROM pengguna WHERE (lower(email)=lower($1) OR ($2::text IS NOT NULL AND lower(nis)=lower($2))) AND dihapus_pada IS NULL',
      [email, nis],
    )
    if (kembar) {
      lihatEmail.add(email); if (nis) lihatNis.add(nis.toLowerCase())
      dilewati.push({ baris: nomor, nama: v.nama, alasan: 'Email/NIS sudah terdaftar.' })
      continue
    }

    const sandi = sandiAcak()
    const kelas = peran === 'siswa' ? v.kelas : null
    try {
      const baru = await satu(
        `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,kelas,gender,aktif,sandi_kartu)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8) RETURNING id`,
        [bersih(v.nama), email, nis, await hashSandi(sandi), peran, kelas, v.gender || null,
          peran === 'siswa' ? enkripsiSandi(sandi) : null],
      )
      lihatEmail.add(email); if (nis) lihatNis.add(nis.toLowerCase())
      dibuat.push({ id: baru.id, nama: bersih(v.nama), email, nis, peran, kelas })
      kredensial.push({ nama: bersih(v.nama), email, nis: nis || '', kelas: kelas || '', kata_sandi: sandi })
    } catch (e) {
      if (e.code === '23505') {
        lihatEmail.add(email); if (nis) lihatNis.add(nis.toLowerCase())
        dilewati.push({ baris: nomor, nama: v.nama, alasan: 'Email/NIS sudah terdaftar.' })
      } else {
        galat.push({ baris: nomor, pesan: e.message })
      }
    }
  }

  if (dibuat.length) {
    await catatAktivitas(req.pengguna.id, 'pengguna_baru', `${req.pengguna.nama} mengimpor ${dibuat.length} akun dari Excel`, '#38BDF8')
  }
  res.json({
    dibuat: dibuat.length, dilewati: dilewati.length, galat: galat.length,
    rincian_lewat: dilewati, rincian_galat: galat, kredensial,
    pesan: `${dibuat.length} akun dibuat · ${dilewati.length} dilewati · ${galat.length} baris gagal.`,
  })
}))

r.get('/kelas/daftar', bungkus(async (req, res) => {
  // ?aktif=1 dipakai halaman kartu ujian agar jumlah pada pilihan kelas sama
  // dengan peserta aktif yang benar-benar dicetak.
  const hanyaAktif = req.query.aktif === '1' ? ' AND aktif' : ''
  const rows = await q(`SELECT kelas, count(*)::int AS jumlah FROM pengguna WHERE peran='siswa' AND kelas IS NOT NULL AND dihapus_pada IS NULL${hanyaAktif} GROUP BY kelas ORDER BY kelas`)
  res.json({ data: rows.rows })
}))

export default r