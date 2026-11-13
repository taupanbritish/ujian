import jwt from 'jsonwebtoken'
import { satu } from '../db/pool.js'
import { Galat } from '../lib/http.js'

const rahasia = process.env.JWT_SECRET || 'shanatech-dev-secret'

export const buatToken = (p) => jwt.sign({ id: p.id, peran: p.peran }, rahasia, { expiresIn: process.env.JWT_EXPIRES || '12h' })

export const kolomPublik = 'id, nama, email, nis, peran, kelas, gender, aktif, terakhir_masuk, dibuat_pada'

export async function wajibMasuk(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new Galat(401, 'Sesi tidak ditemukan. Silakan masuk kembali.')
    let payload
    try {
      payload = jwt.verify(token, rahasia)
    } catch {
      throw new Galat(401, 'Sesi berakhir. Silakan masuk kembali.')
    }
    const pengguna = await satu(`SELECT ${kolomPublik} FROM pengguna WHERE id=$1 AND dihapus_pada IS NULL`, [payload.id])
    if (!pengguna) throw new Galat(401, 'Akun tidak lagi tersedia.')
    if (!pengguna.aktif) throw new Galat(403, 'Akun dinonaktifkan. Hubungi administrator sekolah.')
    req.pengguna = pengguna
    next()
  } catch (e) {
    next(e)
  }
}

export const boleh = (...peran) => (req, _res, next) => {
  if (!peran.includes(req.pengguna?.peran)) return next(new Galat(403, 'Anda tidak memiliki akses ke bagian ini.'))
  next()
}

export const staf = boleh('admin', 'guru')