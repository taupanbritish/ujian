import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool, infoKoneksi } from './pool.js'

const dir = dirname(fileURLToPath(import.meta.url))

try {
  const sql = readFileSync(join(dir, 'schema.sql'), 'utf8')
  await pool.query(sql)
  const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log(`[migrate] selesai di ${infoKoneksi.host}:${infoKoneksi.port} (SSL ${infoKoneksi.ssl ? 'aktif' : 'nonaktif'})`)
  console.log('[migrate] tabel:', rows.map((r) => r.table_name).join(', '))
} catch (e) {
  console.error('[migrate] gagal:', e.message)
  process.exitCode = 1
} finally {
  await pool.end()
}