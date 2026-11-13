import { pool, transaksi } from './pool.js'
import { siswaNama, bankUntuk, bentukSoal } from './data-seed.js'
import { jenjangValid, kelasDemo } from '../lib/jenjang.js'
import { simpanJenjang } from '../lib/pengaturan.js'
import { hashSandi } from '../lib/sandi.js'

// Seeder dummy MINIMAL: 1 administrator, 1 guru (Informatika), 5 peserta didik,
// 1 mata pelajaran (Informatika), dan 10 butir soal. Tidak membuat ujian/percobaan
// sehingga aplikasi mulai dari keadaan bersih dan siap dipakai menyusun ujian.
// Idempoten: bila database sudah terisi, lewati kecuali dijalankan dengan --force.
const paksa = process.argv.includes('--force')
const jenjang = jenjangValid(process.env.SEKOLAH_JENJANG) ? process.env.SEKOLAH_JENJANG : 'SMP'

const ADMIN = { nama: 'Administrator Sekolah', email: process.env.SEED_ADMIN_EMAIL || 'admin@shanatech.sch.id', nis: 'ADM-001' }
const GURU = { nama: 'Guru Informatika', email: process.env.SEED_GURU_EMAIL || 'guru@shanatech.sch.id', nis: 'GR-001' }
const JUMLAH_SISWA = 5
const JUMLAH_SOAL = 10

async function utama() {
  const ada = await pool.query('SELECT count(*)::int AS n FROM pengguna')
  if (ada.rows[0].n > 0 && !paksa) {
    console.log('[seed] database sudah terisi. Jalankan dengan --force untuk mengosongkan lalu mengisi ulang.')
    return
  }

  const sandiAdmin = await hashSandi(process.env.SEED_ADMIN_PASSWORD || 'ShanaTech#2026')
  const sandiGuru = await hashSandi(process.env.SEED_GURU_PASSWORD || 'ShanaTech#2026')
  const sandiSiswa = await hashSandi(process.env.SEED_SISWA_PASSWORD || 'ShanaTech#2026')
  const kelas = kelasDemo(jenjang)[0] || 'VII-A'

  await transaksi(async (c) => {
    await c.query('TRUNCATE aktivitas, jawaban, percobaan, ujian_soal, ujian, soal, mapel, pengguna RESTART IDENTITY CASCADE')

    const admin = await c.query(
      `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,terakhir_masuk) VALUES ($1,$2,$3,$4,'admin',now()) RETURNING id`,
      [ADMIN.nama, ADMIN.email, ADMIN.nis, sandiAdmin],
    )
    const adminId = admin.rows[0].id

    const guru = await c.query(
      `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,terakhir_masuk) VALUES ($1,$2,$3,$4,'guru',now()) RETURNING id`,
      [GURU.nama, GURU.email, GURU.nis, sandiGuru],
    )
    const guruId = guru.rows[0].id

    for (let i = 0; i < JUMLAH_SISWA; i++) {
      const [nama, gender] = siswaNama[i % siswaNama.length]
      const slug = nama.toLowerCase().replace(/[^a-z ]/g, '').split(' ').slice(0, 2).join('.')
      const nis = `26${String(i + 1).padStart(3, '0')}`
      await c.query(
        `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,kelas,gender,terakhir_masuk)
         VALUES ($1,$2,$3,$4,'siswa',$5,$6,now()-interval '1 day')`,
        [nama, `${slug}@siswa.shanatech.sch.id`, nis, sandiSiswa, kelas, gender],
      )
    }

    // Satu mata pelajaran: Informatika, diampu oleh guru di atas.
    const mapel = await c.query(
      `INSERT INTO mapel (nama,kode,warna,guru,guru_id,jenjang) VALUES ('Informatika','INF','#22D3EE',$1,$2,$3) RETURNING id`,
      [GURU.nama, guruId, jenjang],
    )
    const mapelId = mapel.rows[0].id

    const daftar = bankUntuk(jenjang, 'INF').slice(0, JUMLAH_SOAL)
    for (let i = 0; i < daftar.length; i++) {
      const item = daftar[i]
      const b = bentukSoal(item)
      await c.query(
        `INSERT INTO soal (mapel_id,tipe,pertanyaan,opsi,kunci,pembahasan,tingkat,bobot,topik,dibuat_oleh,dibuat_pada)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,now()-interval '3 days'+($11||' hours')::interval)`,
        [mapelId, b.tipe, item.q, JSON.stringify(b.opsi), b.kunci, item.p, item.lv, item.bobot, item.topik, guruId, i],
      )
    }

    await c.query(
      `INSERT INTO aktivitas (pengguna_id,aksi,keterangan,warna) VALUES ($1,'pengaturan','Data dummy minimal dibuat: 1 admin, 1 guru, 5 peserta, 1 mapel, 10 soal','#A3E635')`,
      [adminId],
    )
  })

  await simpanJenjang(jenjang)

  const ringkas = await pool.query(`SELECT
    (SELECT count(*) FROM pengguna WHERE peran='admin') AS admin,
    (SELECT count(*) FROM pengguna WHERE peran='guru') AS guru,
    (SELECT count(*) FROM pengguna WHERE peran='siswa') AS siswa,
    (SELECT count(*) FROM mapel) AS mapel,
    (SELECT count(*) FROM soal) AS soal,
    (SELECT count(*) FROM ujian) AS ujian`)
  console.log(`[seed] selesai (${jenjang}):`, ringkas.rows[0])
  console.log('[seed] akun admin:', ADMIN.email)
  console.log('[seed] akun guru :', GURU.email)
}

try {
  await utama()
} catch (e) {
  console.error('[seed] gagal:', e)
  process.exitCode = 1
} finally {
  await pool.end()
}
