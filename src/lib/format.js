const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function tanggal(v, { jam = false, tahun = true } = {}) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  const tgl = `${d.getDate()} ${BULAN[d.getMonth()]}${tahun ? ` ${d.getFullYear()}` : ''}`
  if (!jam) return tgl
  return `${tgl} · ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

export function jamSaja(v) {
  if (!v) return '—'
  const d = new Date(v)
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

export function relatif(v) {
  if (!v) return '—'
  const detik = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  if (detik < 45) return 'baru saja'
  if (detik < 3600) return `${Math.round(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.round(detik / 3600)} jam lalu`
  if (detik < 604800) return `${Math.round(detik / 86400)} hari lalu`
  return tanggal(v, { tahun: false })
}

export function hitungMundur(target) {
  const selisih = new Date(target).getTime() - Date.now()
  const lewat = selisih <= 0
  const total = Math.abs(Math.round(selisih / 1000))
  const hari = Math.floor(total / 86400)
  const jam = Math.floor((total % 86400) / 3600)
  const menit = Math.floor((total % 3600) / 60)
  if (hari > 0) return `${lewat ? 'lewat ' : ''}${hari} hari ${jam} jam`
  if (jam > 0) return `${lewat ? 'lewat ' : ''}${jam} jam ${menit} menit`
  return `${lewat ? 'lewat ' : ''}${menit} menit`
}

export function jamMenitDetik(detik) {
  const s = Math.max(0, Math.floor(detik))
  const jam = Math.floor(s / 3600)
  const menit = Math.floor((s % 3600) / 60)
  const detikSisa = s % 60
  const dua = (n) => String(n).padStart(2, '0')
  return jam > 0 ? `${dua(jam)}:${dua(menit)}:${dua(detikSisa)}` : `${dua(menit)}:${dua(detikSisa)}`
}

export function durasiPendek(detik) {
  const s = Math.max(0, Math.round(detik || 0))
  if (s < 60) return `${s} detik`
  const menit = Math.floor(s / 60)
  if (menit < 60) return `${menit} menit${s % 60 ? ` ${s % 60} detik` : ''}`
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`
}

const GELAR_DEPAN = new Set(['dr', 'drs', 'dra', 'prof', 'ir', 'h', 'hj'])

// Nama Indonesia sering membawa gelar di depan ("Dr.") dan di belakang ("M.Pd.");
// tanpa dibersihkan, sapaan dan inisial jatuh ke gelar, bukan ke orangnya.
const tokenNama = (nama = '') => {
  const tok = String(nama).trim().split(/\s+/).filter(Boolean)
  while (tok.length && GELAR_DEPAN.has(tok[0].toLowerCase().replace(/\.$/, ''))) tok.shift()
  while (tok.length > 1 && tok[tok.length - 1].includes('.')) tok.pop()
  return tok.map((t) => t.replace(/[,.;]+$/, '')).filter(Boolean)
}

export const namaPanggilan = (nama = '') => tokenNama(nama)[0] || String(nama).trim().split(/\s+/)[0] || ''

export const namaDepan = (nama = '', jumlah = 2) => tokenNama(nama).slice(0, jumlah).join(' ')

export const inisial = (nama = '') =>
  tokenNama(nama).slice(0, 2).map((n) => n[0].toUpperCase()).join('')

export const nilaiTeks = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1).replace('.0', ''))

export const TIPE = {
  pilihan_ganda: { label: 'Pilihan ganda', singkat: 'PG', warna: '#7C5CFF' },
  benar_salah: { label: 'Benar / salah', singkat: 'BS', warna: '#22D3EE' },
  isian: { label: 'Isian singkat', singkat: 'IS', warna: '#FFB020' },
  esai: { label: 'Uraian', singkat: 'UR', warna: '#F472B6' },
}

export const TINGKAT = {
  mudah: { label: 'Mudah', warna: '#A3E635' },
  sedang: { label: 'Sedang', warna: '#FFB020' },
  sulit: { label: 'Sulit', warna: '#FF4D6D' },
}

export const STATUS_UJIAN = {
  draf: { label: 'Draf', warna: '#8A93B8' },
  akan_datang: { label: 'Akan datang', warna: '#22D3EE' },
  berlangsung: { label: 'Berlangsung', warna: '#A3E635' },
  selesai: { label: 'Selesai', warna: '#7C5CFF' },
  ditutup: { label: 'Ditutup', warna: '#FF4D6D' },
}

export function warnaNilai(nilai, kkm = 70) {
  if (nilai === null || nilai === undefined) return '#8A93B8'
  if (nilai >= kkm + 15) return '#A3E635'
  if (nilai >= kkm) return '#34D399'
  if (nilai >= kkm - 15) return '#FFB020'
  return '#FF4D6D'
}

export const jawabanTeks = (soal, isi) => {
  if (isi === null || isi === undefined || String(isi).trim() === '') return null
  if (soal.tipe === 'pilihan_ganda' || soal.tipe === 'benar_salah') {
    const o = (soal.opsi || []).find((x) => x.id === isi)
    return o ? o.teks : String(isi)
  }
  return String(isi)
}

export function keInputLokal(v) {
  if (!v) return ''
  const d = new Date(v)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const perangkatRingkas = () => {
  const ua = navigator.userAgent
  const peramban = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Peramban'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Perangkat'
  return `${peramban} · ${os}`
}