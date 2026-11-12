import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X, RotateCcw } from 'lucide-react'

const Konteks = createContext(null)

const GAYA = {
  sukses: { ikon: CheckCircle2, warna: '#A3E635' },
  gagal: { ikon: XCircle, warna: '#FF4D6D' },
  info: { ikon: Info, warna: '#22D3EE' },
  ingat: { ikon: AlertTriangle, warna: '#FFB020' },
}

export function ToastProvider({ children }) {
  const [daftar, setDaftar] = useState([])
  const timer = useRef(new Map())

  const tutup = useCallback((id) => {
    setDaftar((d) => d.filter((x) => x.id !== id))
    const t = timer.current.get(id)
    if (t) clearTimeout(t)
    timer.current.delete(id)
  }, [])

  const kirim = useCallback((jenis, judul, { pesan, aksi, durasi } = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const life = durasi ?? (aksi ? 9000 : 5000)
    setDaftar((d) => [...d.slice(-3), { id, jenis, judul, pesan, aksi }])
    timer.current.set(id, setTimeout(() => tutup(id), life))
    return id
  }, [tutup])

  useEffect(() => () => timer.current.forEach((t) => clearTimeout(t)), [])

  const nilai = useMemo(() => ({
    sukses: (j, o) => kirim('sukses', j, o),
    gagal: (j, o) => kirim('gagal', j, o),
    info: (j, o) => kirim('info', j, o),
    ingat: (j, o) => kirim('ingat', j, o),
    tutup,
  }), [kirim, tutup])

  return (
    <Konteks.Provider value={nilai}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end">
        {daftar.map((t) => {
          const g = GAYA[t.jenis] || GAYA.info
          const Ikon = g.ikon
          return (
            <div
              key={t.id}
              role="status"
              className="anim-kanan pointer-events-auto flex w-full max-w-[420px] items-start gap-3 overflow-hidden rounded-2xl border p-3.5 shadow-lift backdrop-blur-xl"
              style={{
                borderColor: `color-mix(in oklab, ${g.warna} 42%, #26315e)`,
                background: 'linear-gradient(140deg, rgba(16,23,54,0.97), rgba(8,11,26,0.97))',
              }}
            >
              <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${g.warna} 20%, transparent)`, color: g.warna }}>
                <Ikon size={17} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] leading-snug font-semibold text-chalk">{t.judul}</p>
                {t.pesan && <p className="mt-0.5 text-[0.8rem] leading-snug text-mute">{t.pesan}</p>}
                {t.aksi && (
                  <button
                    onClick={() => { t.aksi.fn(); tutup(t.id) }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1 text-[0.78rem] font-bold text-chalk transition hover:border-cyan hover:text-cyan"
                  >
                    <RotateCcw size={13} /> {t.aksi.label}
                  </button>
                )}
              </div>
              <button onClick={() => tutup(t.id)} aria-label="Tutup notifikasi" className="rounded-lg p-1 text-mute transition hover:bg-ink-700 hover:text-chalk">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </Konteks.Provider>
  )
}

export const useToast = () => {
  const v = useContext(Konteks)
  if (!v) throw new Error('useToast harus berada di dalam ToastProvider')
  return v
}