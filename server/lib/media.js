import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { q, satu } from '../db/pool.js'

const dirLib = dirname(fileURLToPath(import.meta.url))
export const DIR_MEDIA = process.env.MEDIA_DIR
  ? resolve(process.env.MEDIA_DIR)
  : resolve(dirLib, '..', 'uploads')

const rahasia = process.env.MEDIA_SECRET || process.env.JWT_SECRET || 'cendekia-dev-secret'

// Batas ukuran per jenis. Angka ini juga dipakai antarmuka sebagai petunjuk.
export const BATAS_UKURAN = { gambar: 5 * 1024 * 1024, audio: 20 * 1024 * 1024, video: 50 * 1024 * 1024 }
export const LABEL_UKURAN = { gambar: '5 MB', audio: '20 MB', video: '50 MB' }

const MULAI = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38],
  ogg: [0x4f, 0x67, 0x67, 0x53],
  webm: [0x1a, 0x45, 0xdf, 0xa3],
}

const cocok = (buf, tanda, offset = 0) => tanda.every((b, i) => buf[offset + i] === b)
const teks = (buf, mulai, akhir) => buf.subarray(mulai, akhir).toString('latin1')

/**
 * Kenali berkas dari isinya, bukan dari header klien. Ekstensi dan MIME yang
 * dipakai selalu hasil deteksi ini supaya berkas .exe berkedok .jpg ditolak.
 */
export function deteksiBerkas(buf) {
  if (!buf || buf.length < 12) return null
  if (cocok(buf, MULAI.jpeg)) return { jenis: 'gambar', mime: 'image/jpeg', ekstensi: 'jpg' }
  if (cocok(buf, MULAI.png)) return { jenis: 'gambar', mime: 'image/png', ekstensi: 'png' }
  if (cocok(buf, MULAI.gif)) return { jenis: 'gambar', mime: 'image/gif', ekstensi: 'gif' }
  if (teks(buf, 0, 4) === 'RIFF' && teks(buf, 8, 12) === 'WEBP') return { jenis: 'gambar', mime: 'image/webp', ekstensi: 'webp' }
  if (teks(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) {
    return { jenis: 'audio', mime: 'audio/mpeg', ekstensi: 'mp3' }
  }
  if (cocok(buf, MULAI.ogg)) return { jenis: 'audio', mime: 'audio/ogg', ekstensi: 'ogg' }
  if (teks(buf, 0, 4) === 'RIFF' && teks(buf, 8, 12) === 'WAVE') return { jenis: 'audio', mime: 'audio/wav', ekstensi: 'wav' }
  if (teks(buf, 4, 8) === 'ftyp') {
    const merek = teks(buf, 8, 12)
    if (merek.startsWith('M4A') || merek.startsWith('M4B')) return { jenis: 'audio', mime: 'audio/mp4', ekstensi: 'm4a' }
    return { jenis: 'video', mime: 'video/mp4', ekstensi: 'mp4' }
  }
  if (cocok(buf, MULAI.webm)) return { jenis: 'video', mime: 'video/webm', ekstensi: 'webm' }
  return null
}

// ── Lampiran pada butir soal ─────────────────────────────────────────────────
export const skemaLampiran = z.array(z.object({
  jenis: z.enum(['gambar', 'audio', 'video']),
  media_id: z.coerce.number().int().positive().nullable().optional(),
  url: z.string().trim().max(2000).nullable().optional(),
  alt: z.string().trim().max(300).nullable().optional(),
  nama: z.string().trim().max(200).nullable().optional(),
}).superRefine((v, ctx) => {
  if (!v.media_id && !v.url) {
    ctx.addIssue({ code: 'custom', message: 'Lampiran harus memiliki berkas unggahan atau tautan.' })
  }
  if (v.media_id && v.url) {
    ctx.addIssue({ code: 'custom', message: 'Pilih salah satu: berkas unggahan atau tautan eksternal.' })
  }
  if (v.url && !/^https?:\/\//i.test(v.url)) {
    ctx.addIssue({ code: 'custom', message: 'Tautan lampiran harus diawali http:// atau https://.' })
  }
})).max(10, 'Maksimal 10 lampiran per butir soal.')

const detikKedaluwarsa = (detik) => Math.floor(Date.now() / 1000) + detik

const tanda = (id, e) => createHmac('sha256', rahasia).update(`${id}.${e}`).digest('hex').slice(0, 32)

/**
 * URL bertanda tangan berumur pendek. Tag <img>/<audio>/<video> tidak dapat
 * mengirim header Authorization, jadi berkas soal tidak boleh disajikan publik.
 * Tanda tangan mengikat id + waktu kedaluwarsa; URL bocor menjadi mati sendiri.
 */
export function urlMedia(id, detik = 12 * 3600) {
  const e = detikKedaluwarsa(detik)
  return `/api/media/${id}/berkas?e=${e}&t=${tanda(id, e)}`
}

export function tandaSah(id, e, t) {
  const angka = Number(e)
  if (!Number.isFinite(angka) || angka < Math.floor(Date.now() / 1000)) return false
  const harap = Buffer.from(tanda(Number(id), angka))
  const kirim = Buffer.from(String(t || ''))
  return harap.length === kirim.length && timingSafeEqual(harap, kirim)
}

/**
 * Ubah lampiran tersimpan menjadi bentuk siap tampil: unggahan mendapat URL
 * bertanda tangan, tautan eksternal dibiarkan apa adanya.
 */
export function tautkanLampiran(lampiran, detik = 12 * 3600) {
  if (!Array.isArray(lampiran)) return []
  return lampiran.map((l) => {
    if (!l || typeof l !== 'object') return l
    if (l.media_id) return { ...l, url: urlMedia(l.media_id, detik) }
    return l
  })
}

export function tautkanSoal(s, detik = 12 * 3600) {
  if (!s) return s
  return {
    ...s,
    lampiran: tautkanLampiran(s.lampiran, detik),
    opsi: Array.isArray(s.opsi)
      ? s.opsi.map((o) => (o && o.lampiran ? { ...o, lampiran: tautkanLampiran(o.lampiran, detik) } : o))
      : s.opsi,
  }
}

export const jalurBerkas = (namaSimpan) => join(DIR_MEDIA, namaSimpan)

export async function simpanBerkas({ buffer, namaAsli, info, penggunaId }) {
  await mkdir(DIR_MEDIA, { recursive: true })
  const namaSimpan = `${randomUUID()}.${info.ekstensi}`
  await writeFile(jalurBerkas(namaSimpan), buffer, { flag: 'wx' })
  try {
    const row = await satu(
      `INSERT INTO media (nama_asli,nama_simpan,mime,jenis,ukuran,dibuat_oleh)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nama_asli, nama_simpan, mime, jenis, ukuran, dibuat_pada`,
      [namaAsli, namaSimpan, info.mime, info.jenis, buffer.length, penggunaId || null],
    )
    return row
  } catch (e) {
    await unlink(jalurBerkas(namaSimpan)).catch(() => {})
    throw e
  }
}

export async function hapusBerkas(row) {
  if (!row) return
  await unlink(jalurBerkas(row.nama_simpan)).catch(() => {})
}

export async function ukuranBerkas(row) {
  try {
    const s = await stat(jalurBerkas(row.nama_simpan))
    return s.size
  } catch {
    return row?.ukuran || 0
  }
}

/**
 * Hitung pemakaian media di bank soal, termasuk lampiran yang menempel pada
 * opsi jawaban. Dipakai sebelum menghapus agar berkas yang masih dirujuk tidak
 * lenyap dari lembar ujian.
 */
export async function pemakaianMedia(id) {
  const row = await satu(
    `SELECT count(*)::int AS n FROM soal s
     WHERE s.dihapus_pada IS NULL AND (
       EXISTS (SELECT 1 FROM jsonb_array_elements(s.lampiran) x WHERE (x->>'media_id')::int = $1)
       OR EXISTS (
         SELECT 1 FROM jsonb_array_elements(s.opsi) o,
                      jsonb_array_elements(COALESCE(o->'lampiran', '[]'::jsonb)) x
         WHERE (x->>'media_id')::int = $1
       )
     )`,
    [id],
  )
  return row?.n || 0
}

const namaDariUrl = (url) => {
  try {
    const u = new URL(url)
    const bagian = u.pathname.split('/').filter(Boolean).pop()
    return decodeURIComponent(bagian || u.hostname)
  } catch {
    return 'Tautan'
  }
}

/**
 * Lampiran dari impor Excel: tautan eksternal dipisahkan dengan ";" pada satu
 * sel. Jenis ditentukan dari kolomnya (gambar/audio/video), bukan ekstensi.
 */
export function lampiranDariTeks(jenis, nilai, alt) {
  const daftar = String(nilai ?? '')
    .split(/[;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  return daftar.map((url) => ({
    jenis,
    url,
    alt: alt ? String(alt).trim().slice(0, 300) : null,
    nama: namaDariUrl(url),
  }))
}

export const ekstensiDariNama = (nama) => extname(String(nama || '')).toLowerCase().replace('.', '')

export function jumlahMedia() {
  return q('SELECT count(*)::int AS jumlah, COALESCE(sum(ukuran),0)::bigint AS ukuran FROM media').then((r) => r.rows[0])
}
