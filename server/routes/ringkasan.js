import { Router } from 'express'
import { q, satu } from '../db/pool.js'
import { bungkus, statusUjian } from '../lib/http.js'

const r = Router()

r.get('/', bungkus(async (_req, res) => {
  const kpi = await satu(`SELECT
    (SELECT count(*)::int FROM pengguna WHERE peran='siswa' AND dihapus_pada IS NULL AND aktif) AS siswa,
    (SELECT count(*)::int FROM pengguna WHERE peran='guru' AND dihapus_pada IS NULL) AS guru,
    (SELECT count(*)::int FROM soal WHERE dihapus_pada IS NULL) AS soal,
    (SELECT count(*)::int FROM ujian WHERE dihapus_pada IS NULL) AS ujian,
    (SELECT count(*)::int FROM percobaan WHERE status='berlangsung') AS sedang_mengerjakan,
    (SELECT count(*)::int FROM percobaan WHERE status='selesai') AS percobaan_selesai,
    (SELECT count(*)::int FROM percobaan WHERE perlu_penilaian) AS perlu_penilaian,
    (SELECT count(*)::int FROM percobaan WHERE status='selesai' AND selesai_pada::date = current_date) AS selesai_hari_ini,
    (SELECT round(avg(pr.nilai)::numeric,1)::float FROM percobaan pr WHERE pr.status='selesai') AS rata_nilai,
    (SELECT round(100.0 * count(*) FILTER (WHERE pr.nilai >= u.kkm) / NULLIF(count(*),0), 1)::float
       FROM percobaan pr JOIN ujian u ON u.id=pr.ujian_id WHERE pr.status='selesai') AS kelulusan`)

  const bin = await q(`SELECT
    count(*) FILTER (WHERE nilai < 40)::int AS b0,
    count(*) FILTER (WHERE nilai >= 40 AND nilai < 50)::int AS b1,
    count(*) FILTER (WHERE nilai >= 50 AND nilai < 60)::int AS b2,
    count(*) FILTER (WHERE nilai >= 60 AND nilai < 70)::int AS b3,
    count(*) FILTER (WHERE nilai >= 70 AND nilai < 80)::int AS b4,
    count(*) FILTER (WHERE nilai >= 80 AND nilai < 90)::int AS b5,
    count(*) FILTER (WHERE nilai >= 90 AND nilai < 96)::int AS b6,
    count(*) FILTER (WHERE nilai >= 96)::int AS b7
    FROM percobaan WHERE status='selesai'`)
  const label = ['0–39', '40–49', '50–59', '60–69', '70–79', '80–89', '90–95', '96–100']
  const warna = ['#FF4D6D', '#FF7A45', '#FFB020', '#FDE047', '#A3E635', '#34D399', '#22D3EE', '#7C5CFF']
  const distribusi = label.map((l, i) => ({ label: l, jumlah: bin.rows[0][`b${i}`], warna: warna[i] }))

  const trenRaw = await q(`SELECT to_char(d::date,'YYYY-MM-DD') AS tanggal,
      (SELECT count(*)::int FROM percobaan pr WHERE pr.selesai_pada::date = d::date AND pr.status='selesai') AS jumlah,
      (SELECT round(avg(pr.nilai)::numeric,1)::float FROM percobaan pr WHERE pr.selesai_pada::date = d::date AND pr.status='selesai') AS rata
    FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') d ORDER BY d`)

  const ujianRaw = await q(`SELECT u.id, u.judul, u.status, u.mulai_pada, u.selesai_pada, u.kelas_target, u.kkm, u.durasi_menit,
      m.nama AS mapel_nama, m.warna AS mapel_warna,
      (SELECT count(*)::int FROM ujian_soal us WHERE us.ujian_id=u.id) AS jumlah_soal,
      (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='selesai') AS jumlah_selesai,
      (SELECT count(*)::int FROM percobaan pr WHERE pr.ujian_id=u.id AND pr.status='berlangsung') AS jumlah_berlangsung,
      (SELECT count(*)::int FROM pengguna p WHERE p.peran='siswa' AND p.dihapus_pada IS NULL AND p.aktif
        AND (cardinality(u.kelas_target)=0 OR p.kelas = ANY(u.kelas_target))) AS sasaran
    FROM ujian u JOIN mapel m ON m.id=u.mapel_id WHERE u.dihapus_pada IS NULL ORDER BY u.mulai_pada DESC`)
  const semuaUjian = ujianRaw.rows.map((u) => ({ ...u, status_efektif: statusUjian(u) }))
  const prioritas = { berlangsung: 0, akan_datang: 1, selesai: 2, ditutup: 3, draf: 4 }
  const ujianSorotan = [...semuaUjian].sort((a, b) => prioritas[a.status_efektif] - prioritas[b.status_efektif] || new Date(b.mulai_pada) - new Date(a.mulai_pada)).slice(0, 4)
  const statusRingkas = ['berlangsung', 'akan_datang', 'selesai', 'draf', 'ditutup'].map((s, i) => ({
    label: { berlangsung: 'Berlangsung', akan_datang: 'Akan datang', selesai: 'Selesai', draf: 'Draf', ditutup: 'Ditutup' }[s],
    jumlah: semuaUjian.filter((u) => u.status_efektif === s).length,
    warna: ['#A3E635', '#22D3EE', '#7C5CFF', '#8A93B8', '#FF4D6D'][i],
    kunci: s,
  }))

  const aktivitas = await q(`SELECT a.id, a.aksi, a.keterangan, a.warna, a.dibuat_pada, p.nama, p.peran
    FROM aktivitas a LEFT JOIN pengguna p ON p.id=a.pengguna_id ORDER BY a.dibuat_pada DESC LIMIT 8`)

  const peringkat = await q(`SELECT p.id, p.nama, p.kelas, p.gender, count(pr.id)::int AS jumlah,
      round(avg(pr.nilai)::numeric,1)::float AS rata
    FROM pengguna p JOIN percobaan pr ON pr.pengguna_id=p.id
    WHERE p.peran='siswa' AND pr.status='selesai' AND NOT pr.perlu_penilaian
    GROUP BY p.id ORDER BY rata DESC, jumlah DESC LIMIT 6`)

  const perMapel = await q(`SELECT m.nama, m.kode, m.warna,
      (SELECT count(*)::int FROM soal s WHERE s.mapel_id=m.id AND s.dihapus_pada IS NULL) AS soal,
      (SELECT round(avg(pr.nilai)::numeric,1)::float FROM percobaan pr JOIN ujian u ON u.id=pr.ujian_id
        WHERE u.mapel_id=m.id AND pr.status='selesai') AS rata
    FROM mapel m ORDER BY m.nama`)

  res.json({
    kpi,
    distribusi,
    tren: trenRaw.rows,
    status_ujian: statusRingkas,
    ujian_sorotan: ujianSorotan,
    aktivitas: aktivitas.rows,
    peringkat: peringkat.rows.map((p) => ({ ...p, rata: Number(p.rata) })),
    per_mapel: perMapel.rows.map((m) => ({ ...m, rata: m.rata === null ? null : Number(m.rata) })),
  })
}))

export default r