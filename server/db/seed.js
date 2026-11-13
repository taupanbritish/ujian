import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, transaksi } from './pool.js'
import { siswaNama, bankUntuk, bentukSoal } from './data-seed.js'
import { jenjangValid, kelasDemo } from '../lib/jenjang.js'
import { simpanJenjang } from '../lib/pengaturan.js'
import { hashSandi } from '../lib/sandi.js'
import { enkripsiSandi } from '../lib/sandi-kartu.js'
import { DIR_MEDIA } from '../lib/media.js'

// Seeder dummy: 1 administrator, 2 guru, 4 peserta didik (dengan foto kartu),
// 1 mata pelajaran Informatika sesuai jenjang, 5 butir soal, dan 1 paket ujian
// agar menu cetak kartu langsung dapat dipakai. Idempoten: bila database sudah
// terisi, lewati kecuali dijalankan dengan --force.
const paksa = process.argv.includes('--force')
const jenjang = jenjangValid(process.env.SEKOLAH_JENJANG) ? process.env.SEKOLAH_JENJANG : 'SMP'

const ADMIN = { nama: 'Administrator Sekolah', email: process.env.SEED_ADMIN_EMAIL || 'admin@shanatech.sch.id', nis: 'ADM-001' }
const GURU = [
  { nama: 'Rudi Hartono, S.Kom.', email: process.env.SEED_GURU_EMAIL || 'guru@shanatech.sch.id', nis: 'GR-001' },
  { nama: 'Siti Rahmawati, S.Pd.', email: 'guru2@shanatech.sch.id', nis: 'GR-002' },
]
const JUMLAH_SISWA = 4
const JUMLAH_SOAL = 5
const TOKEN_UJIAN = 'INF2026'

// Foto potret 3 × 4 yang dibundel bersama seeder. Disalin ke MEDIA_DIR saat
// seed lalu dicatat di tabel media, sehingga kartu ujian langsung berfoto.
const FOTO_SISWA = ['ahmad.jpg', 'nadia.jpg', 'rizky.jpg', 'salsabila.jpg']
const DIR_FOTO = join(dirname(fileURLToPath(import.meta.url)), 'foto-siswa')

async function siapkanFoto() {
  await mkdir(DIR_MEDIA, { recursive: true })
  const hasil = []
  for (const nama of FOTO_SISWA) {
    const isi = await readFile(join(DIR_FOTO, nama))
    const namaSimpan = `seed-foto-${nama}`
    await writeFile(join(DIR_MEDIA, namaSimpan), isi)
    hasil.push({ namaAsli: nama, namaSimpan, ukuran: isi.length })
  }
  return hasil
}

async function utama() {
  const ada = await pool.query('SELECT count(*)::int AS n FROM pengguna')
  if (ada.rows[0].n > 0 && !paksa) {
    console.log('[seed] database sudah terisi. Jalankan dengan --force untuk mengosongkan lalu mengisi ulang.')
    return
  }

  const sandiAdmin = await hashSandi(process.env.SEED_ADMIN_PASSWORD || 'ShanaTech#2026')
  const sandiGuru = await hashSandi(process.env.SEED_GURU_PASSWORD || 'ShanaTech#2026')
  const sandiSiswaAsli = process.env.SEED_SISWA_PASSWORD || 'ShanaTech#2026'
  const sandiSiswa = await hashSandi(sandiSiswaAsli)
  const sandiSiswaKartu = enkripsiSandi(sandiSiswaAsli)
  const kelas = kelasDemo(jenjang)[0] || 'XII TJKT'
  const foto = await siapkanFoto()

  await transaksi(async (c) => {
    await c.query(
      `TRUNCATE aktivitas, jawaban, percobaan, ujian_soal, ujian, soal, mapel,
                pengaturan, rombel, media, pengguna RESTART IDENTITY CASCADE`,
    )

    const admin = await c.query(
      `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,terakhir_masuk)
       VALUES ($1,$2,$3,$4,'admin',now()) RETURNING id`,
      [ADMIN.nama, ADMIN.email, ADMIN.nis, sandiAdmin],
    )
    const adminId = admin.rows[0].id

    const guruId = []
    for (const g of GURU) {
      const guru = await c.query(
        `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,terakhir_masuk)
         VALUES ($1,$2,$3,$4,'guru',now()) RETURNING id`,
        [g.nama, g.email, g.nis, sandiGuru],
      )
      guruId.push(guru.rows[0].id)
    }

    for (let i = 0; i < JUMLAH_SISWA; i++) {
      const [nama, gender] = siswaNama[i % siswaNama.length]
      const slug = nama.toLowerCase().replace(/[^a-z ]/g, '').split(' ').slice(0, 2).join('.')
      const nis = `26${String(i + 1).padStart(3, '0')}`
      const siswa = await c.query(
        `INSERT INTO pengguna (nama,email,nis,kata_sandi_hash,peran,kelas,gender,terakhir_masuk,sandi_kartu)
         VALUES ($1,$2,$3,$4,'siswa',$5,$6,now()-interval '1 day',$7) RETURNING id`,
        [nama, `${slug}@siswa.shanatech.sch.id`, nis, sandiSiswa, kelas, gender, sandiSiswaKartu],
      )
      const f = foto[i]
      const media = await c.query(
        `INSERT INTO media (nama_asli,nama_simpan,mime,jenis,ukuran,dibuat_oleh)
         VALUES ($1,$2,'image/jpeg','gambar',$3,$4) RETURNING id`,
        [f.namaAsli, f.namaSimpan, f.ukuran, adminId],
      )
      await c.query('UPDATE pengguna SET foto_media_id=$1 WHERE id=$2', [media.rows[0].id, siswa.rows[0].id])
    }

    // Satu mata pelajaran: Informatika, diampu oleh guru pertama.
    const mapel = await c.query(
      `INSERT INTO mapel (nama,kode,warna,guru,guru_id,jenjang)
       VALUES ('Informatika','INF','#22D3EE',$1,$2,$3) RETURNING id`,
      [GURU[0].nama, guruId[0], jenjang],
    )
    const mapelId = mapel.rows[0].id

    const daftar = bankUntuk(jenjang, 'INF').slice(0, JUMLAH_SOAL)
    const soalId = []
    for (let i = 0; i < daftar.length; i++) {
      const item = daftar[i]
      const b = bentukSoal(item)
      const soal = await c.query(
        `INSERT INTO soal (mapel_id,tipe,pertanyaan,opsi,kunci,pembahasan,tingkat,bobot,topik,dibuat_oleh,dibuat_pada)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,now()-interval '3 days'+($11||' hours')::interval)
         RETURNING id`,
        [mapelId, b.tipe, item.q, JSON.stringify(b.opsi), b.kunci, item.p, item.lv, item.bobot, item.topik, guruId[0], i],
      )
      soalId.push({ id: soal.rows[0].id, bobot: item.bobot })
    }

    // Paket ujian demo untuk mencoba alur ujian. Kartu peserta kini dicetak per
    // kelas dan memakai password akun (sandi_kartu), bukan token ini.
    const ujian = await c.query(
      `INSERT INTO ujian (judul,mapel_id,deskripsi,durasi_menit,token,mulai_pada,selesai_pada,status,
                          acak_soal,acak_opsi,tampil_pembahasan,kkm,batas_percobaan,kelas_target,dibuat_oleh)
       VALUES ($1,$2,$3,90,$4,now()-interval '2 hours',now()+interval '7 days','terbit',
               FALSE,FALSE,TRUE,75,1,$5,$6) RETURNING id`,
      ['Penilaian Harian Informatika', mapelId, 'Paket ujian demo untuk mencoba kartu peserta dan alur ujian.', TOKEN_UJIAN, [kelas], adminId],
    )
    const ujianId = ujian.rows[0].id
    for (let i = 0; i < soalId.length; i++) {
      await c.query('INSERT INTO ujian_soal (ujian_id,soal_id,urutan,bobot) VALUES ($1,$2,$3,$4)', [ujianId, soalId[i].id, i, soalId[i].bobot])
    }

    await c.query(
      `INSERT INTO aktivitas (pengguna_id,aksi,keterangan,warna)
       VALUES ($1,'pengaturan',$2,'#A3E635')`,
      [adminId, `Data dummy dibuat: 1 admin, 2 guru, ${JUMLAH_SISWA} peserta, 1 mapel Informatika ${jenjang}, ${soalId.length} soal, 1 ujian bertoken ${TOKEN_UJIAN}`],
    )
  })

  await simpanJenjang(jenjang)

  const ringkas = await pool.query(`SELECT
    (SELECT count(*) FROM pengguna WHERE peran='admin') AS admin,
    (SELECT count(*) FROM pengguna WHERE peran='guru') AS guru,
    (SELECT count(*) FROM pengguna WHERE peran='siswa') AS siswa,
    (SELECT count(*) FROM pengguna WHERE foto_media_id IS NOT NULL) AS berfoto,
    (SELECT count(*) FROM mapel) AS mapel,
    (SELECT count(*) FROM soal) AS soal,
    (SELECT count(*) FROM ujian) AS ujian`)
  console.log(`[seed] selesai (${jenjang}):`, ringkas.rows[0])
  console.log('[seed] akun admin:', ADMIN.email)
  console.log('[seed] akun guru :', GURU.map((g) => g.email).join(', '))
  console.log('[seed] token ujian:', TOKEN_UJIAN)
}

try {
  await utama()
} catch (e) {
  console.error('[seed] gagal:', e)
  process.exitCode = 1
} finally {
  await pool.end()
}
