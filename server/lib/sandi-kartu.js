import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Kata sandi akun perlu tercetak pada kartu peserta, sedangkan login tetap
// memakai hash bcrypt. Nilai yang dapat dibaca kembali ini disimpan terenkripsi
// AES-256-GCM, bukan sebagai teks biasa. Kunci diturunkan dari SANDI_KARTU_SECRET
// (disarankan) atau JWT_SECRET agar tidak menambah konfigurasi wajib.
const kunci = () => createHash('sha256')
  .update(process.env.SANDI_KARTU_SECRET || process.env.JWT_SECRET || 'shanatech-dev-secret')
  .digest()

export function enkripsiSandi(teks) {
  if (teks === null || teks === undefined || teks === '') return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', kunci(), iv)
  const isi = Buffer.concat([cipher.update(String(teks), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), isi.toString('base64url')].join('.')
}

export function dekripsiSandi(nilai) {
  if (!nilai) return null
  try {
    const [versi, iv, tag, isi] = String(nilai).split('.')
    if (versi !== 'v1' || !iv || !tag || !isi) return null
    const decipher = createDecipheriv('aes-256-gcm', kunci(), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(isi, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    // Kunci berubah atau data rusak: kartu tetap tampil, password diminta
    // diatur ulang oleh administrator.
    return null
  }
}
