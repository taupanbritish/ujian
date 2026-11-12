import { Router } from 'express'
import { z } from 'zod'
import { q, satu, transaksi } from '../db/pool.js'
import { bungkus, Galat, angka, bersih, acakArray, statusUjian } from '../lib/http.js'
import { selesaikan, catatAktivitas } from '../lib/ujian.js'

const r = Router()

const milikSiswa = (req) => req.pengguna.peran === 'siswa'

async function ambilPercobaan(id, penggunaId) {
  const p = await satu('SELECT * FROM percobaan WHERE id=$1 AND pengguna_id=$2', [id, penggunaId])
  if (!p) throw new Galat(404, 'Sesi ujian tidak ditemukan.')
  return p
}

r.get('/beranda', bungkus(async (req, res) => {
  const uid = req.pengguna.id
  const kelas = req.pengguna.kelas
  const rows = await q(
    `SELECT u.id, u.judul, u.deskripsi, u.durasi_menit, u.mulai_pada, u.selesai_pada, u.status, u.kkm, u.batas_percobaan, u.acak_soal, u.tampil_pembahasan,
            m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna,
            (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS jumlah_soal,
            (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=$1) AS percobaan,
            (SELECT pr.id FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=$1 AND pr.status='berlangsung' ORDER BY pr.dibuat_pada DESC LIMIT 1) AS sesi_aktif,
            (SELECT max(pr.nilai)::float FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.pengguna_id=$1 AND pr.status='selesai') AS nilai_terbaik
     FROM ujian u JOIN mapel m ON m.id=u.mapel_id
     WHERE u.dihapus_pada IS NULL AND u.status='terbit' AND u.selesai_pada > now()
       AND (cardinality(u.kelas_target)=0 OR $2 = ANY(u.kelas_target))
       -- Hanya ujian yang berlangsung pada HARI INI (zona Asia/Jakarta):
       -- mulai sebelum akhir hari ini DAN selesai pada/ setelah awal hari ini.
       AND u.mulai_pada < (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') + interval '1 day') AT TIME ZONE 'Asia/Jakarta'
       AND u.selesai_pada >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'
     ORDER BY u.mulai_pada`,
    [uid, kelas],
  )
  const tersedia = rows.rows.map((u) => ({
    ...u,
    nilai_terbaik: u.nilai_terbaik === null ? null : Number(u.nilai_terbaik),
    kkm: Number(u.kkm),
    status_efektif: statusUjian(u),
    sisa_percobaan: Math.max(0, u.batas_percobaan - u.percobaan),
    bisa_mulai: u.percobaan < u.batas_percobaan && new Date(u.mulai_pada).getTime() <= Date.now(),
  }))

  const riwayat = await q(
    `SELECT pr.id, pr.nilai, pr.benar, pr.salah, pr.kosong, pr.perlu_penilaian, pr.mulai_pada, pr.selesai_pada, pr.status,
            u.judul, u.kkm, u.durasi_menit, u.tampil_pembahasan, m.nama AS mapel_nama, m.warna AS mapel_warna,
            (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS total_soal
     FROM percobaan pr JOIN ujian u ON u.id=pr.ujian_id JOIN mapel m ON m.id=u.mapel_id
     WHERE pr.pengguna_id=$1 ORDER BY pr.dibuat_pada DESC LIMIT 30`,
    [uid],
  )
  const statistik = await satu(
    `SELECT count(*) FILTER (WHERE pr.status='selesai')::int AS selesai,
            round(avg(pr.nilai) FILTER (WHERE pr.status='selesai')::numeric,1)::float AS rata,
            max(pr.nilai)::float AS terbaik,
            count(*) FILTER (WHERE pr.status='selesai' AND pr.nilai >= u.kkm)::int AS tuntas,
            coalesce(sum(pr.benar),0)::int AS total_benar
     FROM percobaan pr JOIN ujian u ON u.id=pr.ujian_id WHERE pr.pengguna_id=$1`,
    [uid],
  )
  res.json({
    tersedia,
    riwayat: riwayat.rows.map((x) => ({ ...x, nilai: x.nilai === null ? null : Number(x.nilai), kkm: Number(x.kkm) })),
    statistik: { ...statistik, rata: statistik.rata === null ? null : Number(statistik.rata), terbaik: statistik.terbaik === null ? null : Number(statistik.terbaik) },
  })
}))

r.post('/ujian/:id/mulai', bungkus(async (req, res) => {
  if (!milikSiswa(req)) throw new Galat(403, 'Hanya akun peserta yang dapat memulai ujian.')
  const id = angka(req.params.id)
  const { token, perangkat } = z.object({
    token: z.string().min(3, 'Token ujian wajib diisi.'),
    perangkat: z.string().max(120).optional(),
  }).parse(req.body)

  const u = await satu('SELECT * FROM ujian WHERE id=$1 AND dihapus_pada IS NULL', [id])
  if (!u) throw new Galat(404, 'Ujian tidak ditemukan.')
  if (u.status !== 'terbit') throw new Galat(403, 'Ujian ini belum diterbitkan oleh guru.')
  if (u.kelas_target.length && !u.kelas_target.includes(req.pengguna.kelas)) {
    throw new Galat(403, `Ujian ini hanya untuk kelas ${u.kelas_target.join(', ')}.`)
  }
  const now = Date.now()
  if (now < new Date(u.mulai_pada).getTime()) throw new Galat(403, 'Ujian belum dibuka. Perhatikan jadwal yang tertera.')
  if (now > new Date(u.selesai_pada).getTime()) throw new Galat(403, 'Batas waktu pengerjaan ujian ini sudah lewat.')

  const aktif = await satu(`SELECT * FROM percobaan WHERE ujian_id=$1 AND pengguna_id=$2 AND status='berlangsung' ORDER BY dibuat_pada DESC LIMIT 1`, [id, req.pengguna.id])
  if (aktif) {
    if (Date.now() > new Date(aktif.batas_pada).getTime()) {
      await transaksi((c) => selesaikan(c, aktif.id, { otomatis: true }))
      throw new Galat(409, 'Sesi sebelumnya telah habis waktu dan dikirim otomatis. Lihat hasilnya di riwayat.')
    }
    return res.json({ percobaan_id: aktif.id, lanjut: true, pesan: 'Melanjutkan sesi yang masih berjalan.' })
  }

  const jumlah = await satu('SELECT count(*)::int AS n FROM percobaan WHERE ujian_id=$1 AND pengguna_id=$2', [id, req.pengguna.id])
  if (jumlah.n >= u.batas_percobaan) throw new Galat(403, `Kesempatan mengerjakan sudah habis (${u.batas_percobaan} kali).`)
  if (bersih(token).toUpperCase() !== u.token.toUpperCase()) throw new Galat(401, 'Token ujian tidak sesuai. Mintakan token kepada pengawas.')

  const soal = await q(
    `SELECT s.id, s.opsi FROM ujian_soal us JOIN soal s ON s.id=us.soal_id
     WHERE us.ujian_id=$1 AND s.dihapus_pada IS NULL ORDER BY us.urutan`,
    [id],
  )
  if (!soal.rows.length) throw new Galat(409, 'Ujian ini belum memiliki soal.')
  let daftar = soal.rows
  if (u.acak_soal) daftar = acakArray(daftar)
  const urutan = daftar.map((s) => ({
    soal_id: s.id,
    opsi: u.acak_opsi ? acakArray(s.opsi.map((o) => o.id)) : s.opsi.map((o) => o.id),
  }))
  const batas = new Date(Math.min(now + u.durasi_menit * 60_000, new Date(u.selesai_pada).getTime()))

  const baru = await satu(
    `INSERT INTO percobaan (ujian_id,pengguna_id,mulai_pada,batas_pada,status,urutan,perangkat)
     VALUES ($1,$2,now(),$3,'berlangsung',$4::jsonb,$5) RETURNING id`,
    [id, req.pengguna.id, batas, JSON.stringify(urutan), perangkat || null],
  )
  await catatAktivitas(req.pengguna.id, 'mulai_ujian', `${req.pengguna.nama} mulai mengerjakan “${u.judul}”`, '#22D3EE')
  res.status(201).json({ percobaan_id: baru.id, lanjut: false, pesan: 'Ujian dimulai. Selamat mengerjakan.' })
}))

r.get('/percobaan/:id', bungkus(async (req, res) => {
  const p = await ambilPercobaan(angka(req.params.id), req.pengguna.id)
  if (p.status === 'berlangsung' && Date.now() > new Date(p.batas_pada).getTime()) {
    await transaksi((c) => selesaikan(c, p.id, { otomatis: true }))
    return res.json({ status: 'selesai', otomatis: true, percobaan_id: p.id, pesan: 'Waktu habis, jawaban dikirim otomatis.' })
  }
  if (p.status === 'selesai') return res.json({ status: 'selesai', percobaan_id: p.id })

  const u = await satu(
    `SELECT u.id, u.judul, u.durasi_menit, u.acak_opsi, u.kkm, m.nama AS mapel_nama, m.kode AS mapel_kode, m.warna AS mapel_warna
     FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE u.id=$1`, [p.ujian_id],
  )
  const soalRows = await q(
    `SELECT s.id, s.tipe, s.pertanyaan, s.opsi, s.tingkat, s.topik, us.bobot
     FROM soal s JOIN ujian_soal us ON us.soal_id=s.id AND us.ujian_id=$2 WHERE s.id = ANY($1::int[])`,
    [p.urutan.map((x) => x.soal_id), p.ujian_id],
  )
  const peta = new Map(soalRows.rows.map((s) => [s.id, s]))
  const soal = p.urutan.map((item, i) => {
    const s = peta.get(item.soal_id)
    if (!s) return null
    const urutanOpsi = item.opsi?.length ? item.opsi : s.opsi.map((o) => o.id)
    const opsiMap = new Map(s.opsi.map((o) => [o.id, o]))
    return {
      nomor: i + 1,
      id: s.id,
      tipe: s.tipe,
      pertanyaan: s.pertanyaan,
      tingkat: s.tingkat,
      topik: s.topik,
      bobot: Number(s.bobot),
      opsi: urutanOpsi.map((oid) => opsiMap.get(oid)).filter(Boolean),
    }
  }).filter(Boolean)
  const jawaban = await q('SELECT soal_id, isi, ragu FROM jawaban WHERE percobaan_id=$1', [p.id])
  res.json({
    status: 'berlangsung',
    percobaan: {
      id: p.id, ujian_id: p.ujian_id, mulai_pada: p.mulai_pada, batas_pada: p.batas_pada,
      fokus_hilang: p.fokus_hilang, sisa_detik: Math.max(0, Math.round((new Date(p.batas_pada).getTime() - Date.now()) / 1000)),
    },
    ujian: u,
    soal,
    jawaban: jawaban.rows,
  })
}))

r.put('/percobaan/:id/jawaban', bungkus(async (req, res) => {
  const p = await ambilPercobaan(angka(req.params.id), req.pengguna.id)
  if (p.status === 'selesai') return res.json({ status: 'selesai', tersimpan: 0, pesan: 'Ujian sudah dikirim.' })
  if (Date.now() > new Date(p.batas_pada).getTime()) {
    await transaksi((c) => selesaikan(c, p.id, { otomatis: true }))
    return res.json({ status: 'selesai', otomatis: true, tersimpan: 0, pesan: 'Waktu habis, jawaban dikirim otomatis.' })
  }
  const { daftar } = z.object({
    daftar: z.array(z.object({
      soal_id: z.coerce.number().int().positive(),
      isi: z.string().max(8000).nullable().optional(),
      ragu: z.boolean().default(false),
    })).min(1).max(150),
  }).parse(req.body)
  const sah = new Set(p.urutan.map((x) => x.soal_id))
  const bersihDaftar = daftar.filter((d) => sah.has(d.soal_id))
  await transaksi(async (c) => {
    for (const d of bersihDaftar) {
      await c.query(
        `INSERT INTO jawaban (percobaan_id,soal_id,isi,ragu,diubah_pada) VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (percobaan_id,soal_id) DO UPDATE SET isi=EXCLUDED.isi, ragu=EXCLUDED.ragu, diubah_pada=now()`,
        [p.id, d.soal_id, d.isi ?? '', d.ragu],
      )
    }
  })
  res.json({ status: 'berlangsung', tersimpan: bersihDaftar.length, waktu: new Date().toISOString(), sisa_detik: Math.max(0, Math.round((new Date(p.batas_pada).getTime() - Date.now()) / 1000)) })
}))

r.post('/percobaan/:id/fokus', bungkus(async (req, res) => {
  const p = await ambilPercobaan(angka(req.params.id), req.pengguna.id)
  if (p.status !== 'berlangsung') return res.json({ fokus_hilang: p.fokus_hilang })
  const hasil = await satu('UPDATE percobaan SET fokus_hilang = fokus_hilang + 1 WHERE id=$1 RETURNING fokus_hilang', [p.id])
  res.json({ fokus_hilang: hasil.fokus_hilang })
}))

r.post('/percobaan/:id/kirim', bungkus(async (req, res) => {
  const p = await ambilPercobaan(angka(req.params.id), req.pengguna.id)
  if (p.status === 'selesai') return res.json({ percobaan_id: p.id, nilai: Number(p.nilai), perlu_penilaian: p.perlu_penilaian, sudah: true, pesan: 'Ujian ini sudah dikirim sebelumnya.' })
  const hasil = await transaksi((c) => selesaikan(c, p.id))
  const u = await satu('SELECT judul FROM ujian WHERE id=$1', [p.ujian_id])
  await catatAktivitas(req.pengguna.id, 'kirim_ujian', `${req.pengguna.nama} menyelesaikan “${u.judul}” dengan nilai ${hasil.nilai}`, '#A3E635')
  res.json({ percobaan_id: p.id, nilai: Number(hasil.nilai), benar: hasil.benar, salah: hasil.salah, kosong: hasil.kosong, perlu_penilaian: hasil.perlu_penilaian, pesan: 'Jawaban berhasil dikirim.' })
}))

r.get('/percobaan/:id/hasil', bungkus(async (req, res) => {
  const p = await ambilPercobaan(angka(req.params.id), req.pengguna.id)
  if (p.status !== 'selesai') throw new Galat(409, 'Ujian belum selesai dikerjakan.')
  const u = await satu(
    `SELECT u.id, u.judul, u.kkm, u.durasi_menit, u.tampil_pembahasan, m.nama AS mapel_nama, m.warna AS mapel_warna
     FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE u.id=$1`, [p.ujian_id],
  )
  const detail = await q(
    `SELECT s.id AS soal_id, s.tipe, s.pertanyaan, s.opsi, s.kunci, s.pembahasan, us.bobot, us.urutan, j.isi, j.ragu, j.skor, j.catatan
     FROM ujian_soal us JOIN soal s ON s.id=us.soal_id
     LEFT JOIN jawaban j ON j.soal_id=s.id AND j.percobaan_id=$1
     WHERE us.ujian_id=$2 ORDER BY us.urutan`,
    [p.id, p.ujian_id],
  )
  const petaUrutan = new Map(p.urutan.map((x, i) => [x.soal_id, i]))
  const terurut = detail.rows.sort((a, b) => (petaUrutan.get(a.soal_id) ?? a.urutan) - (petaUrutan.get(b.soal_id) ?? b.urutan))
  const rekan = await satu(
    `SELECT round(avg(nilai)::numeric,1)::float AS rata, count(*)::int AS jumlah, max(nilai)::float AS tertinggi,
       (SELECT count(*)::int FROM percobaan x WHERE x.ujian_id=$1 AND x.status='selesai' AND x.nilai > $2) AS di_atas
     FROM percobaan WHERE ujian_id=$1 AND status='selesai'`,
    [p.ujian_id, p.nilai],
  )
  const boleh = u.tampil_pembahasan && !p.perlu_penilaian
  res.json({
    percobaan: {
      id: p.id, nilai: Number(p.nilai), benar: p.benar, salah: p.salah, kosong: p.kosong,
      perlu_penilaian: p.perlu_penilaian, mulai_pada: p.mulai_pada, selesai_pada: p.selesai_pada, fokus_hilang: p.fokus_hilang,
      durasi_detik: Math.max(0, Math.round((new Date(p.selesai_pada) - new Date(p.mulai_pada)) / 1000)),
    },
    ujian: { ...u, kkm: Number(u.kkm) },
    detail: terurut.map((d, i) => ({
      nomor: i + 1,
      soal_id: d.soal_id, tipe: d.tipe, pertanyaan: d.pertanyaan, opsi: d.opsi, bobot: Number(d.bobot),
      isi: d.isi, ragu: d.ragu, skor: d.skor === null ? null : Number(d.skor), catatan: d.catatan,
      kunci: boleh ? d.kunci : null,
      pembahasan: boleh ? d.pembahasan : null,
    })),
    pembahasan_terbuka: boleh,
    rekan: { ...rekan, rata: rekan.rata === null ? null : Number(rekan.rata), tertinggi: rekan.tertinggi === null ? null : Number(rekan.tertinggi), peringkat: (rekan.di_atas || 0) + 1 },
  })
}))

export default r