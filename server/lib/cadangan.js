import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { mkdtemp, mkdir, rm, cp, readFile, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { DIR_MEDIA, jumlahMedia } from './media.js'
import { infoKoneksi } from '../db/pool.js'
import { Galat } from './http.js'

const jalankan = promisify(execFile)
const dirServer = dirname(dirname(fileURLToPath(import.meta.url)))

const DIR_CADANGAN = process.env.BACKUP_DIR
  ? join(process.env.BACKUP_DIR)
  : join(dirServer, 'backups')

/**
 * pg_dump/pg_restore sering tidak ada di PATH saat PostgreSQL dipasang lewat
 * paket resmi macOS. Cari di lokasi umum sebelum menyerah.
 */
const KANDIDAT_BIN = [
  process.env.PG_BIN_DIR,
  '/opt/homebrew/opt/postgresql@18/bin',
  '/opt/homebrew/opt/postgresql@17/bin',
  '/opt/homebrew/opt/postgresql@16/bin',
  '/opt/homebrew/bin',
  '/usr/local/opt/postgresql@18/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/Library/PostgreSQL/18/bin',
  '/Library/PostgreSQL/17/bin',
  '/Library/PostgreSQL/16/bin',
  '/Library/PostgreSQL/15/bin',
].filter(Boolean)

export function cariBiner(nama) {
  const env = nama === 'pg_dump' ? process.env.PG_DUMP : nama === 'pg_restore' ? process.env.PG_RESTORE : null
  if (env && existsSync(env)) return env
  for (const dir of KANDIDAT_BIN) {
    const calon = join(dir, nama)
    if (existsSync(calon)) return calon
  }
  return null
}

const cariTar = () => ['/usr/bin/tar', '/bin/tar'].find(existsSync) || null

const stempel = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
export const namaArsip = () => `cadangan-shanatech-${stempel()}.tar.gz`

const urlBasis = () => process.env.DATABASE_URL

const infoPublik = () => {
  try {
    const u = new URL(process.env.DATABASE_URL || '')
    return { host: u.hostname, port: u.port || '5432', nama: u.pathname.replace(/^\//, '') }
  } catch {
    return { host: infoKoneksi?.host || '—', port: infoKoneksi?.port || '—', nama: infoKoneksi?.database || '—' }
  }
}

const sha256 = (path) => new Promise((selesai, gagal) => {
  const h = createHash('sha256')
  createReadStream(path)
    .on('data', (d) => h.update(d))
    .on('end', () => selesai(h.digest('hex')))
    .on('error', gagal)
})

export async function infoCadangan() {
  const media = await jumlahMedia()
  const pgDump = cariBiner('pg_dump')
  const pgRestore = cariBiner('pg_restore')
  const tar = cariTar()
  let cadanganPengaman = 0
  try {
    const { readdir } = await import('node:fs/promises')
    const daftar = await readdir(DIR_CADANGAN)
    cadanganPengaman = daftar.filter((n) => n.endsWith('.tar.gz')).length
  } catch { /* folder belum ada */ }
  return {
    basis_data: infoPublik(),
    folder_media: DIR_MEDIA,
    folder_cadangan: DIR_CADANGAN,
    media: { jumlah: Number(media.jumlah), ukuran: Number(media.ukuran) },
    perkakas: {
      pg_dump: pgDump || null,
      pg_restore: pgRestore || null,
      tar: tar || null,
      siap: Boolean(pgDump && pgRestore && tar),
    },
    cadangan_pengaman: cadanganPengaman,
  }
}

/**
 * Buat arsip .tar.gz berisi database.dump (format custom pg_dump), folder
 * media, dan manifest.json berisi checksum. Arsip ditulis ke folder sementara;
 * pemanggil bertanggung jawab membersihkannya.
 */
export async function buatCadangan() {
  const pgDump = cariBiner('pg_dump')
  const tar = cariTar()
  if (!pgDump || !tar) throw new Galat(503, 'pg_dump atau tar tidak ditemukan di server. Pasang PostgreSQL client tools lalu coba lagi.')
  const url = urlBasis()
  if (!url) throw new Galat(503, 'DATABASE_URL belum diatur.')

  await mkdir(DIR_CADANGAN, { recursive: true })
  const kerja = await mkdtemp(join(tmpdir(), 'shanatech-cadangan-'))
  const dump = join(kerja, 'database.dump')
  const folderMedia = join(kerja, 'media')
  const arsip = join(kerja, namaArsip())

  try {
    await jalankan(pgDump, ['-Fc', '--no-owner', '--no-privileges', '-f', dump, '-d', url], { maxBuffer: 1024 * 1024 })
    await mkdir(folderMedia, { recursive: true })
    if (existsSync(DIR_MEDIA)) await cp(DIR_MEDIA, folderMedia, { recursive: true })
    const media = await jumlahMedia()
    const manifest = {
      aplikasi: 'ShanaTech CBT',
      dibuat_pada: new Date().toISOString(),
      format: 1,
      basis_data: infoPublik(),
      media: { jumlah: Number(media.jumlah), ukuran: Number(media.ukuran) },
      sha256_database: await sha256(dump),
      ukuran_database: (await stat(dump)).size,
    }
    await writeFile(join(kerja, 'manifest.json'), JSON.stringify(manifest, null, 2))
    await jalankan(tar, ['-czf', arsip, '-C', kerja, 'database.dump', 'media', 'manifest.json'], { maxBuffer: 1024 * 1024 })
    return { arsip, kerja, manifest, nama: namaArsip() }
  } catch (e) {
    await rm(kerja, { recursive: true, force: true }).catch(() => {})
    throw new Galat(500, `Cadangan gagal dibuat: ${e?.stderr?.toString?.()?.slice(0, 300) || e.message}`)
  }
}

export async function bersihkanArsip(kerja) {
  if (kerja) await rm(kerja, { recursive: true, force: true }).catch(() => {})
}

/**
 * Pulihkan arsip. Urutan sengaja konservatif:
 *   cadangan pengaman -> pg_restore -> tukar folder media.
 * Jika pemulihan database gagal, data lama tidak disentuh. Folder media lama
 * baru dihapus setelah salinan baru terpasang.
 */
export async function pulihkanCadangan(arsipUnggahan) {
  const pgRestore = cariBiner('pg_restore')
  const tar = cariTar()
  const url = urlBasis()
  if (!pgRestore || !tar || !url) throw new Galat(503, 'pg_restore/tar tidak tersedia atau DATABASE_URL kosong.')

  const kerja = await mkdtemp(join(tmpdir(), 'shanatech-pulih-'))
  try {
    await jalankan(tar, ['-xzf', arsipUnggahan, '-C', kerja], { maxBuffer: 1024 * 1024 })
    const dump = join(kerja, 'database.dump')
    if (!existsSync(dump)) throw new Galat(422, 'Arsip tidak berisi database.dump. Pastikan berkas berasal dari aplikasi ini.')
    const manifest = JSON.parse(await readFile(join(kerja, 'manifest.json'), 'utf8'))
    if (manifest?.format !== 1) throw new Galat(422, 'Versi arsip tidak dikenal.')
    const sidik = await sha256(dump)
    if (manifest.sha256_database && sidik !== manifest.sha256_database) {
      throw new Galat(422, 'Checksum database tidak cocok. Arsip mungkin rusak atau berubah.')
    }

    // Cadangan pengaman disimpan permanen agar pemulihan bisa dibatalkan manual.
    const pengaman = await buatCadangan()
    await cp(pengaman.arsip, join(DIR_CADANGAN, pengaman.nama))
    await bersihkanArsip(pengaman.kerja)

    try {
      await jalankan(pgRestore, ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', url, dump], { maxBuffer: 4 * 1024 * 1024 })
    } catch (e) {
      throw new Galat(500, `Pemulihan database gagal. Data lama tidak diubah. ${e?.stderr?.toString?.()?.slice(0, 300) || e.message}`)
    }

    const mediaBaru = join(kerja, 'media')
    if (existsSync(mediaBaru)) {
      const mediaLama = `${DIR_MEDIA}.lama-${Date.now()}`
      const adaLama = existsSync(DIR_MEDIA)
      if (adaLama) await cp(DIR_MEDIA, mediaLama, { recursive: true })
      try {
        await rm(DIR_MEDIA, { recursive: true, force: true })
        await cp(mediaBaru, DIR_MEDIA, { recursive: true })
        if (adaLama) await rm(mediaLama, { recursive: true, force: true })
      } catch (e) {
        if (adaLama) {
          await rm(DIR_MEDIA, { recursive: true, force: true }).catch(() => {})
          await cp(mediaLama, DIR_MEDIA, { recursive: true }).catch(() => {})
        }
        throw new Galat(500, `Database sudah dipulihkan, tetapi folder media gagal ditukar: ${e.message}. Cadangan pengaman tersedia di ${DIR_CADANGAN}.`)
      }
    }

    return {
      pesan: 'Cadangan berhasil dipulihkan. Muat ulang aplikasi agar semua data segar.',
      dibuat_pada: manifest.dibuat_pada,
      media: manifest.media,
      cadangan_pengaman: pengaman.nama,
      basis_data: infoPublik(),
    }
  } finally {
    await rm(kerja, { recursive: true, force: true }).catch(() => {})
  }
}
