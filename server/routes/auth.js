import { Router } from 'express'
import { z } from 'zod'
import { q, satu } from '../db/pool.js'
import { bungkus, Galat, bersih } from '../lib/http.js'
import { hashSandi, cocokSandi } from '../lib/sandi.js'
import { enkripsiSandi } from '../lib/sandi-kartu.js'
import { buatToken, wajibMasuk, kolomPublik } from '../middleware/auth.js'
import { catatAktivitas } from '../lib/ujian.js'
import { getPengaturan, kelasEfektif } from '../lib/pengaturan.js'
import { batasiMapel } from '../lib/guru.js'

const r = Router()

const demoAktif = () => process.env.DEMO_MASUK === 'true'

r.get('/info', bungkus(async (_req, res) => {
  const statistik = await satu(`SELECT
    (SELECT count(*)::int FROM soal WHERE dihapus_pada IS NULL) AS soal,
    (SELECT count(*)::int FROM ujian WHERE dihapus_pada IS NULL) AS ujian,
    (SELECT count(*)::int FROM pengguna WHERE peran='siswa' AND dihapus_pada IS NULL) AS peserta,
    (SELECT count(*)::int FROM mapel) AS mapel`)
  const p = await getPengaturan()
  res.json({ demo: demoAktif(), sekolah: p.nama_sekolah, tahun: p.tahun_ajaran, jenjang: p.jenjang, nama_aplikasi: p.nama_aplikasi, statistik })
}))

r.post('/masuk-demo', bungkus(async (req, res) => {
  if (!demoAktif()) throw new Galat(403, 'Mode demo dinonaktifkan pada server ini.')
  const { peran } = z.object({ peran: z.enum(['admin', 'guru', 'siswa']) }).parse(req.body)
  // Ambil akun aktif pertama pada peran tersebut agar tombol demo tetap berfungsi
  // berapa pun isi seeder (email/NIS demo tidak dipatok keras).
  const p = await satu(`SELECT * FROM pengguna WHERE peran=$1 AND dihapus_pada IS NULL AND aktif ORDER BY id LIMIT 1`, [peran])
  if (!p) throw new Galat(404, 'Akun demo belum tersedia. Jalankan npm run db:seed terlebih dahulu.')
  await q('UPDATE pengguna SET terakhir_masuk=now() WHERE id=$1', [p.id])
  const publik = await satu(`SELECT ${kolomPublik} FROM pengguna WHERE id=$1`, [p.id])
  res.json({ token: buatToken(p), pengguna: publik })
}))

const skemaMasuk = z.object({
  identitas: z.string().min(3, 'Email atau NIS wajib diisi.'),
  kata_sandi: z.string().min(4, 'Kata sandi minimal 4 karakter.'),
})

r.post('/masuk', bungkus(async (req, res) => {
  const { identitas, kata_sandi } = skemaMasuk.parse(req.body)
  const p = await satu(
    `SELECT * FROM pengguna WHERE (lower(email)=lower($1) OR lower(nis)=lower($1)) AND dihapus_pada IS NULL`,
    [bersih(identitas)],
  )
  if (!p) throw new Galat(401, 'Email/NIS atau kata sandi tidak sesuai.')
  const cocok = await cocokSandi(kata_sandi, p.kata_sandi_hash)
  if (!cocok) throw new Galat(401, 'Email/NIS atau kata sandi tidak sesuai.')
  if (!p.aktif) throw new Galat(403, 'Akun dinonaktifkan. Hubungi administrator sekolah.')
  await q('UPDATE pengguna SET terakhir_masuk=now() WHERE id=$1', [p.id])
  const publik = await satu(`SELECT ${kolomPublik} FROM pengguna WHERE id=$1`, [p.id])
  res.json({ token: buatToken(p), pengguna: publik })
}))

r.get('/saya', wajibMasuk, bungkus(async (req, res) => {
  res.json({ pengguna: req.pengguna })
}))

const skemaProfil = z.object({
  nama: z.string().min(3).max(120).optional(),
  kata_sandi_lama: z.string().optional(),
  kata_sandi_baru: z.string().min(8, 'Kata sandi baru minimal 8 karakter.').optional(),
})

r.patch('/profil', wajibMasuk, bungkus(async (req, res) => {
  const data = skemaProfil.parse(req.body)
  if (data.nama) await q('UPDATE pengguna SET nama=$1 WHERE id=$2', [bersih(data.nama), req.pengguna.id])
  if (data.kata_sandi_baru) {
    const p = await satu('SELECT kata_sandi_hash FROM pengguna WHERE id=$1', [req.pengguna.id])
    if (!(await cocokSandi(data.kata_sandi_lama || '', p.kata_sandi_hash))) throw new Galat(400, 'Kata sandi lama tidak sesuai.')
    const baru = data.kata_sandi_baru
    await q(
      'UPDATE pengguna SET kata_sandi_hash=$1, sandi_kartu=$2 WHERE id=$3',
      [await hashSandi(baru), req.pengguna.peran === 'siswa' ? enkripsiSandi(baru) : null, req.pengguna.id],
    )
    await catatAktivitas(req.pengguna.id, 'keamanan', `${req.pengguna.nama} memperbarui kata sandi akun`, '#38BDF8')
  }
  res.json({ pengguna: await satu(`SELECT ${kolomPublik} FROM pengguna WHERE id=$1`, [req.pengguna.id]) })
}))

r.get('/meta', wajibMasuk, bungkus(async (req, res) => {
  const mapel = await q('SELECT m.*, (SELECT count(*)::int FROM soal s WHERE s.mapel_id=m.id AND s.dihapus_pada IS NULL) AS jumlah_soal FROM mapel m WHERE m.dihapus_pada IS NULL ORDER BY m.jenjang, m.nama')
  const kelas = await q(`SELECT DISTINCT kelas FROM pengguna WHERE peran='siswa' AND kelas IS NOT NULL AND dihapus_pada IS NULL ORDER BY kelas`)
  const p = await getPengaturan()
  const gabungan = [...new Set([...(await kelasEfektif(p.jenjang)), ...kelas.rows.map((k) => k.kelas)])]
  const gm = await batasiMapel(req)
  const mapelRows = gm ? mapel.rows.filter((m) => gm.includes(m.id)) : mapel.rows
  res.json({ mapel: mapelRows, kelas: gabungan })
}))

export default r