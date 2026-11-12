import { satu, q } from '../db/pool.js'
import { skorOtomatis, rekapNilai } from './penilaian.js'

export async function nilaiPercobaan(client, percobaanId) {
  const { rows } = await client.query(
    `SELECT j.isi, j.skor, s.tipe, us.bobot
     FROM jawaban j
     JOIN soal s ON s.id = j.soal_id
     JOIN percobaan p ON p.id = j.percobaan_id
     JOIN ujian_soal us ON us.ujian_id = p.ujian_id AND us.soal_id = j.soal_id
     WHERE j.percobaan_id = $1`,
    [percobaanId],
  )
  return rekapNilai(rows)
}

export async function selesaikan(client, percobaanId, { otomatis = false } = {}) {
  const p = await satu('SELECT * FROM percobaan WHERE id=$1', [percobaanId])
  if (!p) return null
  if (p.status === 'selesai') return p

  const soal = await client.query(
    `SELECT s.id, s.tipe, s.kunci, us.bobot, j.isi, j.id AS jawaban_id, j.skor
     FROM ujian_soal us
     JOIN soal s ON s.id = us.soal_id
     LEFT JOIN jawaban j ON j.soal_id = s.id AND j.percobaan_id = $1
     WHERE us.ujian_id = $2 ORDER BY us.urutan`,
    [percobaanId, p.ujian_id],
  )

  for (const s of soal.rows) {
    const skor = s.tipe === 'esai' ? (s.skor === null ? null : Number(s.skor)) : skorOtomatis(s, s.isi)
    if (s.jawaban_id) {
      await client.query('UPDATE jawaban SET skor=$1, diubah_pada=now() WHERE id=$2', [skor, s.jawaban_id])
    } else {
      await client.query('INSERT INTO jawaban (percobaan_id,soal_id,isi,skor) VALUES ($1,$2,$3,$4)', [percobaanId, s.id, '', s.tipe === 'esai' ? null : 0])
    }
  }

  const rekap = await nilaiPercobaan(client, percobaanId)
  const { rows } = await client.query(
    `UPDATE percobaan SET status='selesai', selesai_pada=now(), nilai=$1, benar=$2, salah=$3, kosong=$4, perlu_penilaian=$5
     WHERE id=$6 RETURNING *`,
    [rekap.nilai, rekap.benar, rekap.salah, rekap.kosong, rekap.perlu_penilaian, percobaanId],
  )
  if (otomatis) {
    await client.query('INSERT INTO aktivitas (pengguna_id,aksi,keterangan,warna) VALUES ($1,$2,$3,$4)', [
      p.pengguna_id, 'waktu_habis', 'Waktu ujian habis, jawaban dikirim otomatis oleh sistem', '#FFB020',
    ])
  }
  return rows[0]
}

export async function catatAktivitas(penggunaId, aksi, keterangan, warna = '#22D3EE') {
  await q('INSERT INTO aktivitas (pengguna_id,aksi,keterangan,warna) VALUES ($1,$2,$3,$4)', [penggunaId, aksi, keterangan, warna])
}