import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X, Check, Copy, AlertTriangle, Inbox } from 'lucide-react'
import { inisial } from '../lib/format'
import { useSuara } from '../context/SoundContext'
import { useSekolah } from '../context/SekolahContext'

export function Tombol({ varian = 'kedua', ukuran = 'md', ikon: Ikon, memuat, className = '', children, onClick, type = 'button', disabled, ...sisa }) {
  const { bunyi } = useSuara()
  const dasar = 'relative inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] whitespace-nowrap'
  const gaya = {
    utama: 'text-white bg-[linear-gradient(105deg,#7C5CFF,#5B7CFF_45%,#22D3EE)] shadow-[0_12px_30px_-12px_rgba(124,92,255,0.9)] hover:shadow-[0_18px_40px_-12px_rgba(34,211,238,0.75)] hover:brightness-110',
    kedua: 'text-chalk border border-line bg-ink-800/70 hover:border-violet/70 hover:bg-ink-700',
    halus: 'text-mute hover:text-chalk hover:bg-ink-700/70',
    bahaya: 'text-white bg-[linear-gradient(105deg,#FF4D6D,#FF7A45)] shadow-[0_12px_30px_-14px_rgba(255,77,109,0.9)] hover:brightness-110',
    sukses: 'text-ink-950 bg-[linear-gradient(105deg,#A3E635,#34D399)] shadow-[0_12px_30px_-14px_rgba(163,230,53,0.85)] hover:brightness-110',
    kertas: 'text-paper-ink border border-paper-line bg-white/70 hover:bg-white hover:border-violet',
  }[varian]
  const size = { sm: 'px-3 py-1.5 text-[0.78rem]', md: 'px-4 py-2.5 text-[0.85rem]', lg: 'px-5 py-3 text-[0.95rem]' }[ukuran]
  return (
    <button
      type={type}
      className={`${dasar} ${gaya} ${size} ${className}`}
      onClick={(e) => { bunyi('klik'); onClick?.(e) }}
      disabled={memuat || disabled}
      {...sisa}
    >
      {memuat ? <Loader2 size={15} className="anim-putar" /> : Ikon ? <Ikon size={ukuran === 'sm' ? 14 : 16} strokeWidth={2.3} /> : null}
      {children}
    </button>
  )
}

export function TombolIkon({ ikon: Ikon, label, aktif, className = '', ukuran = 16, onClick, ...sisa }) {
  const { bunyi } = useSuara()
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={aktif === undefined ? undefined : aktif}
      className={`grid size-9 place-items-center rounded-xl border transition-all duration-200 active:scale-90 ${
        aktif ? 'border-cyan/60 bg-cyan/15 text-cyan' : 'border-line-soft bg-ink-800/60 text-mute hover:border-violet/60 hover:text-chalk'
      } ${className}`}
      onClick={(e) => { bunyi('klik'); onClick?.(e) }}
      {...sisa}
    >
      <Ikon size={ukuran} strokeWidth={2.2} />
    </button>
  )
}

export function Pil({ warna = '#8A93B8', children, className = '', padat = false, ikon: Ikon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide whitespace-nowrap ${className}`}
      style={{
        color: padat ? '#05070f' : warna,
        borderColor: `color-mix(in oklab, ${warna} ${padat ? 100 : 40}%, transparent)`,
        background: padat ? warna : `color-mix(in oklab, ${warna} 14%, transparent)`,
      }}
    >
      {Ikon && <Ikon size={11} strokeWidth={2.8} />}
      {children}
    </span>
  )
}

export function TitikNyala({ warna = '#A3E635', label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold" style={{ color: warna }}>
      <span className="relative grid place-items-center">
        <span className="absolute size-2.5 animate-ping rounded-full opacity-60" style={{ background: warna }} />
        <span className="size-2 rounded-full" style={{ background: warna }} />
      </span>
      {label}
    </span>
  )
}

export function Avatar({ nama, gender, ukuran = 38, warna, foto }) {
  // Foto peserta (bila ada) menggantikan inisial; ukuran tetap sama agar tata
  // letak tabel dan kartu tidak bergeser ketika sebagian peserta belum berfoto.
  if (foto) {
    return (
      <img
        src={foto}
        alt={nama || 'Foto peserta'}
        className="flex-none rounded-xl border border-line-soft object-cover"
        style={{ width: ukuran, height: ukuran }}
      />
    )
  }
  const palet = ['#7C5CFF', '#22D3EE', '#A3E635', '#FFB020', '#FF4D6D', '#38BDF8', '#F472B6', '#34D399']
  const idx = (nama || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palet.length
  const dasar = warna || palet[idx]
  return (
    <span
      className="grid flex-none place-items-center rounded-xl font-extrabold"
      style={{
        width: ukuran, height: ukuran, fontSize: ukuran * 0.36,
        color: dasar,
        background: `linear-gradient(150deg, color-mix(in oklab, ${dasar} 26%, transparent), color-mix(in oklab, ${dasar} 8%, transparent))`,
        border: `1px solid color-mix(in oklab, ${dasar} 42%, transparent)`,
      }}
      title={gender === 'L' ? 'Laki-laki' : gender === 'P' ? 'Perempuan' : undefined}
    >
      {inisial(nama)}
    </span>
  )
}

export function Cincin({ nilai = 0, ukuran = 64, tebal = 6, warna = '#22D3EE', children, trek = 'rgba(38,49,94,0.9)' }) {
  const r = (ukuran - tebal) / 2
  const keliling = 2 * Math.PI * r
  const isi = Math.max(0, Math.min(100, nilai))
  return (
    <span className="relative inline-grid place-items-center" style={{ width: ukuran, height: ukuran }}>
      <svg width={ukuran} height={ukuran} className="-rotate-90">
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke={trek} strokeWidth={tebal} />
        <circle
          cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke={warna} strokeWidth={tebal} strokeLinecap="round"
          strokeDasharray={keliling} strokeDashoffset={keliling - (keliling * isi) / 100}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.4s' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  )
}

export function BilahProgres({ nilai = 0, warna = '#7C5CFF', tinggi = 6, className = '' }) {
  return (
    <span className={`block w-full overflow-hidden rounded-full bg-ink-950/80 ${className}`} style={{ height: tinggi }}>
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.max(0, Math.min(100, nilai))}%`,
          background: `linear-gradient(90deg, ${warna}, color-mix(in oklab, ${warna} 45%, #22D3EE))`,
          transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </span>
  )
}

export function Field({ label, pesan, wajib, children, className = '', petunjuk }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="label-field">
          {label} {wajib && <span className="text-rose">*</span>}
        </span>
      )}
      {children}
      {petunjuk && !pesan && <span className="mt-1 block text-[0.72rem] text-mute/80">{petunjuk}</span>}
      {pesan && <span className="mt-1 block text-[0.72rem] font-semibold text-rose">{pesan}</span>}
    </label>
  )
}

export function Sakelar({ aktif, onChange, label, keterangan, warna = '#A3E635' }) {
  const { bunyi } = useSuara()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aktif}
      onClick={() => { bunyi('klik'); onChange(!aktif) }}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-soft bg-ink-950/40 p-3 text-left transition hover:border-ink-500"
    >
      <span className="min-w-0">
        <span className="block text-[0.84rem] font-semibold text-chalk">{label}</span>
        {keterangan && <span className="mt-0.5 block text-[0.74rem] leading-snug text-mute">{keterangan}</span>}
      </span>
      <span
        className="relative h-6 w-11 flex-none rounded-full transition-colors duration-300"
        style={{ background: aktif ? warna : '#1f2a58' }}
      >
        <span
          className="absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-300"
          style={{ left: aktif ? '1.4rem' : '0.15rem' }}
        />
      </span>
    </button>
  )
}

function KunciLatar(terbuka) {
  useEffect(() => {
    if (!terbuka) return
    const asal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = asal }
  }, [terbuka])
}

export function Modal({ terbuka, onTutup, judul, keterangan, children, kaki, lebar = 'max-w-lg', ikon: Ikon, warna = '#7C5CFF' }) {
  KunciLatar(terbuka)
  const ref = useRef(null)
  const onTutupRef = useRef(onTutup)
  onTutupRef.current = onTutup
  useEffect(() => {
    if (!terbuka) return
    const onKey = (e) => { if (e.key === 'Escape') onTutupRef.current?.() }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const target = ref.current?.querySelector('[autofocus],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)')
      target?.focus()
    }, 60)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [terbuka])
  if (!terbuka) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-5">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onTutup} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={`anim-naik relative z-10 w-full ${lebar} overflow-hidden rounded-t-3xl border border-line bg-ink-850 shadow-lift sm:rounded-3xl`}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 opacity-45" style={{ background: `radial-gradient(60% 100% at 50% 100%, ${warna}, transparent 70%)` }} />
        <div className="relative flex items-start gap-3 border-b border-line-soft p-5">
          {Ikon && (
            <span className="grid size-10 flex-none place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${warna} 18%, transparent)`, color: warna }}>
              <Ikon size={19} strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.05rem] leading-tight">{judul}</h3>
            {keterangan && <p className="mt-1 text-[0.8rem] leading-snug text-mute">{keterangan}</p>}
          </div>
          <TombolIkon ikon={X} label="Tutup" onClick={onTutup} />
        </div>
        <div className="relative max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {kaki && <div className="relative flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-ink-900/60 p-4">{kaki}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Laci({ terbuka, onTutup, judul, keterangan, children, kaki, lebar = 'max-w-2xl', warna = '#22D3EE' }) {
  KunciLatar(terbuka)
  useEffect(() => {
    if (!terbuka) return
    const onKey = (e) => { if (e.key === 'Escape') onTutup?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [terbuka, onTutup])
  if (!terbuka) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-md" onClick={onTutup} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={`anim-kanan relative flex h-full w-full ${lebar} flex-col border-l border-line bg-ink-900 shadow-lift`}
      >
        <header className="flex items-start gap-3 border-b border-line-soft p-5" style={{ background: `linear-gradient(120deg, color-mix(in oklab, ${warna} 12%, transparent), transparent)` }}>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[1.05rem]">{judul}</h3>
            {keterangan && <p className="mt-1 text-[0.8rem] text-mute">{keterangan}</p>}
          </div>
          <TombolIkon ikon={X} label="Tutup panel" onClick={onTutup} />
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {kaki && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-ink-850/80 p-4">{kaki}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

export function Konfirmasi({ state, onTutup, onLanjut, memuat }) {
  const s = state || {}
  return (
    <Modal
      terbuka={!!state}
      onTutup={onTutup}
      judul={s.judul || 'Konfirmasi tindakan'}
      keterangan={s.keterangan}
      ikon={s.ikon || AlertTriangle}
      warna={s.warna || '#FFB020'}
      lebar="max-w-md"
      kaki={
        <>
          <Tombol varian="halus" onClick={onTutup}>Batal</Tombol>
          <Tombol varian={s.varian || 'bahaya'} memuat={memuat} onClick={onLanjut} ikon={s.ikonTombol || Check}>
            {s.label || 'Ya, lanjutkan'}
          </Tombol>
        </>
      }
    >
      <p className="text-[0.88rem] leading-relaxed text-body">{s.isi || 'Tindakan ini akan mengubah data yang tersimpan.'}</p>
      {s.rincian && <div className="mt-3 rounded-xl border border-line-soft bg-ink-950/50 p-3 text-[0.8rem] text-mute">{s.rincian}</div>}
    </Modal>
  )
}

export function Kosong({ ikon: Ikon = Inbox, judul, pesan, aksi, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center ${className}`}>
      <span className="grid size-14 place-items-center rounded-2xl border border-line-soft bg-ink-800 text-violet">
        <Ikon size={24} strokeWidth={1.9} />
      </span>
      <div>
        <p className="text-[0.95rem] font-bold text-chalk">{judul}</p>
        {pesan && <p className="mx-auto mt-1 max-w-sm text-[0.82rem] leading-relaxed text-mute">{pesan}</p>}
      </div>
      {aksi}
    </div>
  )
}

export function Rangka({ className = '', baris = 3 }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: baris }).map((_, i) => (
        <div key={i} className="rangka h-14 rounded-xl" style={{ opacity: 1 - i * 0.14 }} />
      ))}
    </div>
  )
}

export function Memuat({ pesan = 'Memuat data…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-mute">
      <Loader2 size={20} className="anim-putar text-cyan" />
      <span className="text-[0.85rem] font-semibold">{pesan}</span>
    </div>
  )
}

export function Galat({ pesan, onUlang }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose/35 bg-rose/8 px-6 py-10 text-center">
      <AlertTriangle size={26} className="text-rose" />
      <p className="max-w-md text-[0.88rem] font-semibold text-chalk">{pesan}</p>
      {onUlang && <Tombol varian="kedua" ukuran="sm" onClick={onUlang}>Coba lagi</Tombol>}
    </div>
  )
}

export function Segmen({ nilai, onChange, pilihan, className = '' }) {
  const { bunyi } = useSuara()
  return (
    <div className={`inline-flex max-w-full flex-wrap rounded-xl border border-line-soft bg-ink-950/60 p-1 ${className}`}>
      {pilihan.map((p) => (
        <button
          key={p.nilai}
          type="button"
          onClick={() => { bunyi('klik'); onChange(p.nilai) }}
          className={`relative rounded-lg px-3 py-1.5 text-[0.78rem] font-bold transition-all duration-200 ${
            nilai === p.nilai ? 'bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] text-white shadow-[0_8px_20px_-10px_rgba(124,92,255,0.9)]' : 'text-mute hover:text-chalk'
          }`}
        >
          {p.label}
          {p.jumlah !== undefined && <span className="ml-1.5 font-mono text-[0.7rem] opacity-80">{p.jumlah}</span>}
        </button>
      ))}
    </div>
  )
}

export function Salin({ teks, label = 'Salin', className = '' }) {
  const [tersalin, setTersalin] = useState(false)
  const { bunyi } = useSuara()
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = teks
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          ta.remove()
        }
        bunyi('simpan')
        setTersalin(true)
        setTimeout(() => setTersalin(false), 1600)
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-2.5 py-1 font-mono text-[0.78rem] font-bold text-chalk transition hover:border-cyan hover:text-cyan ${className}`}
    >
      {tersalin ? <Check size={13} className="text-lime" /> : <Copy size={13} />}
      {tersalin ? 'Tersalin' : label}
    </button>
  )
}

export function Paginasi({ halaman, batas, total, onChange, satuan = 'soal' }) {
  const akhir = Math.max(1, Math.ceil(total / batas))
  if (akhir <= 1) return null
  const nomor = []
  for (let i = Math.max(1, halaman - 2); i <= Math.min(akhir, halaman + 2); i++) nomor.push(i)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
      <p className="text-[0.78rem] text-mute">
        Menampilkan <span className="font-mono font-bold text-chalk">{(halaman - 1) * batas + 1}–{Math.min(total, halaman * batas)}</span> dari{' '}
        <span className="font-mono font-bold text-chalk">{total}</span> {satuan}
      </p>
      <div className="flex items-center gap-1">
        <Tombol ukuran="sm" varian="kedua" disabled={halaman <= 1} onClick={() => onChange(halaman - 1)}>Sebelumnya</Tombol>
        {nomor.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`size-8 rounded-lg font-mono text-[0.78rem] font-bold transition ${
              n === halaman ? 'bg-violet text-white' : 'border border-line-soft text-mute hover:border-violet hover:text-chalk'
            }`}
          >
            {n}
          </button>
        ))}
        <Tombol ukuran="sm" varian="kedua" disabled={halaman >= akhir} onClick={() => onChange(halaman + 1)}>Berikutnya</Tombol>
      </div>
    </div>
  )
}

export function JudulBagian({ eyebrow, judul, pesan, kanan, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 font-mono text-[0.7rem] font-bold tracking-[0.22em] text-cyan uppercase">{eyebrow}</p>}
        <h2 className="text-[1.35rem] leading-tight sm:text-[1.6rem]">{judul}</h2>
        {pesan && <p className="mt-1.5 max-w-2xl text-[0.85rem] leading-relaxed text-mute">{pesan}</p>}
      </div>
      {kanan && <div className="flex flex-wrap items-center gap-2">{kanan}</div>}
    </div>
  )
}

// Opsi <select> mata pelajaran dikelompokkan per jenjang; jenjang aktif tampil
// paling depan sehingga picker soal/ujian selalu selaras dengan satuan pendidikan.
export function OpsiMapel({ mapel = [] }) {
  const { jenjang } = useSekolah()
  const grup = [...new Set(mapel.map((m) => m.jenjang || 'Lainnya'))]
  grup.sort((a, b) => (a === jenjang ? -1 : b === jenjang ? 1 : a.localeCompare(b)))
  return (
    <>
      {grup.map((g) => (
        <optgroup key={g} label={g === jenjang ? `${g} (aktif)` : g}>
          {mapel.filter((m) => (m.jenjang || 'Lainnya') === g).map((m) => (
            <option key={m.id} value={m.id}>{m.nama}</option>
          ))}
        </optgroup>
      ))}
    </>
  )
}