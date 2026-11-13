import 'dotenv/config'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[db] DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL Anda.')
  process.exit(1)
}

// Angka environment yang tidak valid (kosong, negatif, NaN) jatuh ke nilai bawaan
// agar salah ketik di .env tidak membuat pool berukuran 0 atau tak terbatas.
const angka = (nama, bawaan) => {
  const n = Number(process.env[nama])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : bawaan
}

let ssl = false
const host = (() => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
})()
const lokal = ['localhost', '127.0.0.1', '::1', ''].includes(host)
if (process.env.DATABASE_SSL === 'true' || (!lokal && process.env.DATABASE_SSL !== 'false') || /sslmode=require/.test(url)) {
  ssl = { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' }
}

// max = koneksi maksimum PER PROSES Node. Total koneksi ke PostgreSQL =
// DATABASE_POOL_MAX × DATABASE_APP_INSTANCES (lihat peringatan kapasitas di index.js).
// Bila memakai PgBouncer, max ini adalah koneksi klien ke PgBouncer, bukan ke PostgreSQL.
const maxPool = angka('DATABASE_POOL_MAX', 10)
const instans = angka('DATABASE_APP_INSTANCES', 1)

export const pool = new pg.Pool({
  connectionString: url,
  ssl,
  max: maxPool,
  idleTimeoutMillis: angka('DATABASE_IDLE_TIMEOUT_MS', 30000),
  connectionTimeoutMillis: angka('DATABASE_CONNECT_TIMEOUT_MS', 15000),
  // Terlihat di pg_stat_activity sebagai "shanatech-cbt" saat menelusuri koneksi.
  application_name: 'shanatech-cbt',
})

pool.on('error', (err) => console.error('[db] koneksi idle bermasalah:', err.message))

export const q = (text, params) => pool.query(text, params)
export const satu = async (text, params) => (await pool.query(text, params)).rows[0] || null
export const banyak = async (text, params) => (await pool.query(text, params)).rows

export async function transaksi(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hasil = await fn(client)
    await client.query('COMMIT')
    return hasil
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export const infoPool = { max: maxPool, instans, total: maxPool * instans }
export const statPool = () => ({ total: pool.totalCount, menganggur: pool.idleCount, menunggu: pool.waitingCount })

// Ditandai eksplisit agar pemeriksaan kapasitas tidak menanyakan max_connections
// langsung ke PostgreSQL melalui PgBouncer (mode transaction tidak menjamin sesi).
export const pakaiPgBouncer = process.env.DATABASE_PGBOUNCER === 'true'

export const infoKoneksi = {
  host,
  port: (() => { try { return new URL(url).port || '5432' } catch { return '?' } })(),
  ssl: !!ssl,
  pgbouncer: pakaiPgBouncer,
}
