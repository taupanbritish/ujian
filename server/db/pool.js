import 'dotenv/config'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[db] DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL Anda.')
  process.exit(1)
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

export const pool = new pg.Pool({
  connectionString: url,
  ssl,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
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

export const infoKoneksi = { host, port: (() => { try { return new URL(url).port || '5432' } catch { return '?' } })(), ssl: !!ssl }