export class Galat extends Error {
  constructor(status, pesan) {
    super(pesan)
    this.status = status
  }
}

export const bungkus = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function angka(v, fallback = null) {
  if (v === undefined || v === null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export const bersih = (v) => (typeof v === 'string' ? v.trim() : v)

export function tokenAcak(kode) {
  const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  let out = (kode || 'UJN').replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  for (let i = 0; i < 3; i++) out += Math.floor(Math.random() * 10)
  return out
}

export function acakArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const statusUjian = (u) => {
  if (u.status === 'draf') return 'draf'
  if (u.status === 'ditutup') return 'ditutup'
  const now = Date.now()
  if (now < new Date(u.mulai_pada).getTime()) return 'akan_datang'
  if (now > new Date(u.selesai_pada).getTime()) return 'selesai'
  return 'berlangsung'
}