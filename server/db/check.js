import { pool, infoKoneksi } from './pool.js'

try {
  const v = await pool.query('SELECT version()')
  console.log('[db] terhubung:', v.rows[0].version.split(',')[0])
  console.log('[db] target:', infoKoneksi)
  const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")
  for (const { table_name } of t.rows) {
    const c = await pool.query(`SELECT count(*)::int AS n FROM "${table_name}"`)
    console.log(`  ${table_name.padEnd(14)} ${c.rows[0].n} baris`)
  }
} catch (e) {
  console.error('[db] gagal terhubung:', e.message)
  process.exitCode = 1
} finally {
  await pool.end()
}