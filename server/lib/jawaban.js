import { pool } from '../db/pool.js'

/**
 * Menyimpan sekumpulan jawaban dalam SATU perintah UPSERT (satu round-trip).
 *
 * - Payload dikirim sebagai tiga array paralel lalu di-unnest oleh PostgreSQL,
 *   bukan satu INSERT per soal. Auto-save 150 soal tetap satu perintah.
 * - Duplikat `soal_id` di dalam satu payload dimenangkan oleh kemunculan terakhir,
 *   sama seperti perilaku loop sebelumnya. Ini juga mencegah galat PostgreSQL
 *   "ON CONFLICT DO UPDATE command cannot affect row a second time".
 * - Satu perintah sudah atomik; tidak perlu transaksi pembungkus.
 *
 * @returns {Promise<Array<{soal_id:number, isi:string, ragu:boolean}>>} baris yang ditulis
 */
export async function simpanJawaban(percobaanId, daftar, client = pool) {
  const unik = new Map()
  for (const d of daftar) {
    unik.set(d.soal_id, { soal_id: d.soal_id, isi: d.isi ?? '', ragu: !!d.ragu })
  }
  const baris = [...unik.values()]
  if (!baris.length) return []

  await client.query(
    `INSERT INTO jawaban (percobaan_id, soal_id, isi, ragu, diubah_pada)
     SELECT $1, x.soal_id, x.isi, x.ragu, now()
     FROM unnest($2::int[], $3::text[], $4::boolean[]) AS x(soal_id, isi, ragu)
     ON CONFLICT (percobaan_id, soal_id) DO UPDATE
        SET isi = EXCLUDED.isi, ragu = EXCLUDED.ragu, diubah_pada = now()`,
    [percobaanId, baris.map((b) => b.soal_id), baris.map((b) => b.isi), baris.map((b) => b.ragu)],
  )
  return baris
}
