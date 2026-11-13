import 'dotenv/config'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { pool, infoKoneksi, infoPool, statPool, pakaiPgBouncer } from './db/pool.js'
import { wajibMasuk, staf, boleh } from './middleware/auth.js'
import auth from './routes/auth.js'
import soal from './routes/soal.js'
import ujian from './routes/ujian.js'
import pengguna from './routes/pengguna.js'
import monitoring from './routes/monitoring.js'
import hasil from './routes/hasil.js'
import ringkasan from './routes/ringkasan.js'
import siswa from './routes/siswa.js'
import pengaturan from './routes/pengaturan.js'
import mapel from './routes/mapel.js'
import media from './routes/media.js'

const dir = dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 4310)

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/api/kesehatan', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'sehat', database: infoKoneksi, pool: statPool(), waktu: new Date().toISOString() })
  } catch (e) {
    res.status(503).json({ status: 'bermasalah', pesan: e.message })
  }
})

app.use('/api/auth', auth)
app.use('/api/pengaturan', pengaturan)
app.use('/api/siswa', wajibMasuk, boleh('siswa'), siswa)
// Guru hanya: bank soal, ujian, pengawasan, dan hasil; sisanya administrator.
app.use('/api/ringkasan', wajibMasuk, boleh('admin'), ringkasan)
app.use('/api/soal', wajibMasuk, staf, soal)
app.use('/api/ujian', wajibMasuk, staf, ujian)
app.use('/api/pengguna', wajibMasuk, boleh('admin'), pengguna)
app.use('/api/monitoring', wajibMasuk, staf, monitoring)
app.use('/api/hasil', wajibMasuk, staf, hasil)
app.use('/api/mapel', mapel)
// Unggah butuh sesi staf; penyajian berkas memakai URL bertanda tangan sehingga
// tanpa header Authorization (tag <img>/<audio>/<video> tidak bisa mengirimnya).
app.use('/api/media', media)

app.use('/api', (_req, res) => res.status(404).json({ pesan: 'Endpoint tidak ditemukan.' }))

const dist = join(dir, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({ pesan: err.issues[0]?.message || 'Data yang dikirim tidak valid.', rincian: err.issues.map((i) => ({ kolom: i.path.join('.'), pesan: i.message })) })
  }
  const status = err.status || (err.code === '23505' ? 409 : 500)
  if (status >= 500) console.error('[api]', err)
  const pesan = err.code === '23505' ? 'Data serupa sudah ada di database.' : err.message || 'Terjadi kesalahan pada server.'
  res.status(status).json({ pesan })
})

async function periksaKapasitasPool() {
  if (pakaiPgBouncer) {
    console.log('[db] mode PgBouncer aktif: pemeriksaan max_connections dilewati (lihat deploy/pgbouncer).')
    return
  }
  try {
    const { rows } = await pool.query('SHOW max_connections')
    const batas = Number(rows[0]?.max_connections)
    if (!Number.isFinite(batas) || batas <= 0) return
    if (infoPool.total > Math.floor(batas * 0.8)) {
      console.warn(`[db] peringatan: pool dapat memakai ${infoPool.total} koneksi (${infoPool.max} × ${infoPool.instans} proses) dari max_connections ${batas}. Turunkan DATABASE_POOL_MAX atau arahkan DATABASE_URL ke PgBouncer.`)
    }
  } catch (e) {
    console.warn('[db] tidak dapat memeriksa max_connections:', e.message)
  }
}

app.listen(port, '127.0.0.1', () => {
  console.log(`[api] ${process.env.NAMA_APLIKASI || 'ShanaTech CBT'} berjalan di http://127.0.0.1:${port}`)
  console.log(`[api] PostgreSQL ${infoKoneksi.host}:${infoKoneksi.port} · SSL ${infoKoneksi.ssl ? 'aktif' : 'nonaktif'}`)
  console.log(`[db] pool ${infoPool.max} koneksi/proses × ${infoPool.instans} proses = maksimum ${infoPool.total}`)
  if (!existsSync(dist)) console.log('[api] mode pengembangan — frontend dilayani Vite di http://127.0.0.1:5180')
  periksaKapasitasPool()
})