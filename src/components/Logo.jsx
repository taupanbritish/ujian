import { useSekolah } from '../context/SekolahContext'

export function Logo({ ukuran = 38 }) {
  return (
    <svg width={ukuran} height={ukuran} viewBox="0 0 64 64" aria-hidden className="flex-none">
      <defs>
        <linearGradient id="logo-shanatech" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C5CFF" />
          <stop offset="0.55" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#A3E635" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="#0B1024" stroke="#26315e" strokeWidth="2" />
      <circle cx="22" cy="22" r="8" fill="url(#logo-shanatech)" />
      <circle cx="42" cy="22" r="7.5" fill="none" stroke="#3B4680" strokeWidth="3" />
      <circle cx="22" cy="42" r="7.5" fill="none" stroke="#3B4680" strokeWidth="3" />
      <path d="M34 42l5 5 11-11" fill="none" stroke="#A3E635" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NamaBrand({ className = '' }) {
  const { nama_aplikasi } = useSekolah()
  const bagian = (nama_aplikasi || 'ShanaTech CBT').trim().split(/\s+/)
  const utama = bagian[0]
  const lencana = bagian.slice(1).join(' ')
  return (
    <span className={`flex items-baseline gap-1.5 ${className}`}>
      <span className="text-[1.15rem] leading-none font-extrabold tracking-tight text-chalk">{utama}</span>
      {lencana && (
        <span className="rounded-md bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] px-1.5 py-0.5 font-mono text-[0.6rem] font-bold tracking-widest text-white">{lencana}</span>
      )}
    </span>
  )
}