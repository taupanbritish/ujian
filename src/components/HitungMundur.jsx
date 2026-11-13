import { memo, useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { BilahProgres } from './ui'
import { jamMenitDetik } from '../lib/format'

// Warna status waktu dipakai bersama oleh badge, bilah, dan modal keluar.
export const warnaSisa = (sisa) => (
  sisa === null ? '#22D3EE' : sisa <= 60 ? '#FF4D6D' : sisa <= 300 ? '#FFB020' : '#A3E635'
)

// Sisa detik dihitung dari jangkar { sisa, at } yang diperbarui setiap kali
// server membalas simpan jawaban. Cara ini toleran terhadap selisih jam
// perangkat siswa dengan jam server.
export const sisaDariJangkar = (jangkar) => (
  jangkar ? Math.max(0, jangkar.sisa - Math.round((Date.now() - jangkar.at) / 1000)) : null
)

// Satu-satunya pemicu tick 1 detik. Komponen yang memakai hook ini hanya
// me-render ulang dirinya sendiri; lembar soal di root tidak ikut tersentuh.
export function useSisaWaktu(jangkarRef, aktif) {
  const [sisa, setSisa] = useState(() => sisaDariJangkar(jangkarRef.current))

  useEffect(() => {
    if (!aktif) return
    const hitung = () => setSisa(sisaDariJangkar(jangkarRef.current))
    hitung()
    const t = setInterval(hitung, 1000)
    return () => clearInterval(t)
  }, [aktif, jangkarRef])

  return sisa
}

// Badge countdown di header. Hanya komponen ini (dan turunannya) yang
// me-render ulang tiap detik. Peringatan 5 menit/1 menit dan pengiriman
// otomatis saat waktu habis ditangani di sini lewat callback stabil.
export const HitungMundur = memo(function HitungMundur({
  jangkarRef,
  aktif,
  onPeringatan,
  onHabis,
  className = '',
}) {
  const sisa = useSisaWaktu(jangkarRef, aktif)
  const ingat = useRef({ lima: false, satu: false })
  const habis = useRef(false)

  useEffect(() => {
    if (!aktif || sisa === null) return
    if (sisa <= 300 && !ingat.current.lima) {
      ingat.current.lima = true
      onPeringatan?.('lima')
    }
    if (sisa <= 60 && !ingat.current.satu) {
      ingat.current.satu = true
      onPeringatan?.('satu')
    }
    if (sisa <= 0 && !habis.current) {
      habis.current = true
      onHabis?.()
    }
  }, [sisa, aktif, onPeringatan, onHabis])

  const warna = warnaSisa(sisa)
  const bahaya = sisa !== null && sisa <= 60

  return (
    <span
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${className}`}
      style={{
        borderColor: `color-mix(in oklab, ${warna} 45%, transparent)`,
        background: `color-mix(in oklab, ${warna} 12%, transparent)`,
      }}
    >
      <Timer size={15} style={{ color: warna }} className={bahaya ? 'anim-bahaya rounded-full' : ''} />
      <span className="text-left">
        <span
          className={`block font-mono text-[1.15rem] leading-none font-bold ${bahaya ? 'anim-bahaya' : ''}`}
          style={{ color: warna }}
        >
          {sisa === null ? '--:--' : jamMenitDetik(sisa)}
        </span>
        <span className="mt-0.5 block text-[0.55rem] font-bold tracking-[0.16em] text-mute uppercase">sisa waktu</span>
      </span>
    </span>
  )
})

// Bilah sisa waktu di panel samping. Tick-nya terisolasi di sini sehingga
// kartu soal tidak ikut dirender ulang setiap detik.
export const BilahWaktu = memo(function BilahWaktu({
  jangkarRef,
  aktif,
  totalDetik,
  tinggi = 5,
  className = '',
}) {
  const sisa = useSisaWaktu(jangkarRef, aktif)
  return (
    <BilahProgres
      nilai={sisa === null ? 0 : (sisa / Math.max(1, totalDetik)) * 100}
      warna={warnaSisa(sisa)}
      tinggi={tinggi}
      className={className}
    />
  )
})

// Angka sisa waktu ringkas untuk modal (mis. "keluar sementara").
export const SisaWaktu = memo(function SisaWaktu({ jangkarRef, aktif, className = '' }) {
  const sisa = useSisaWaktu(jangkarRef, aktif)
  return <span className={className}>{sisa === null ? '--:--' : jamMenitDetik(sisa)}</span>
})
