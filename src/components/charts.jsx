import { useId, useState } from 'react'

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export function BatangDistribusi({ data, tinggi = 190 }) {
  const [hover, setHover] = useState(null)
  const uid = useId().replace(/:/g, '')
  const maks = Math.max(4, ...data.map((d) => d.jumlah))
  const lebar = 640
  const padding = { atas: 26, bawah: 34, kiri: 34, kanan: 12 }
  const ruang = lebar - padding.kiri - padding.kanan
  const langkah = ruang / data.length
  const lebarBatang = Math.min(46, langkah * 0.6)
  const areaTinggi = tinggi - padding.atas - padding.bawah
  const garis = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="w-full" role="img" aria-label="Distribusi nilai peserta">
        <defs>
          {data.map((d, i) => (
            <linearGradient key={i} id={`${uid}-b${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={d.warna} stopOpacity="0.95" />
              <stop offset="100%" stopColor={d.warna} stopOpacity="0.28" />
            </linearGradient>
          ))}
          <pattern id={`${uid}-arsir`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.22" />
          </pattern>
        </defs>
        {garis.map((g, i) => {
          const y = padding.atas + areaTinggi * (1 - g)
          return (
            <g key={i}>
              <line x1={padding.kiri} y1={y} x2={lebar - padding.kanan} y2={y} stroke="#1c2549" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 5'} />
              <text x={padding.kiri - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#8A93B8" fontFamily="JetBrains Mono, monospace">
                {Math.round(maks * g)}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const h = (d.jumlah / maks) * areaTinggi
          const x = padding.kiri + langkah * i + (langkah - lebarBatang) / 2
          const y = padding.atas + areaTinggi - h
          const aktif = hover === i
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <rect x={padding.kiri + langkah * i} y={padding.atas} width={langkah} height={areaTinggi} fill="transparent" />
              <rect x={x} y={y} width={lebarBatang} height={Math.max(h, 2)} rx="7" fill={`url(#${uid}-b${i})`} stroke={d.warna} strokeWidth={aktif ? 2 : 1} strokeOpacity={aktif ? 1 : 0.55}
                style={{ transition: 'height 0.7s cubic-bezier(0.22,1,0.36,1), y 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
              {i % 2 === 1 && <rect x={x} y={y} width={lebarBatang} height={Math.max(h, 2)} rx="7" fill={`url(#${uid}-arsir)`} pointerEvents="none" />}
              <text x={x + lebarBatang / 2} y={y - 8} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={aktif ? '#EEF1FB' : d.warna} fontFamily="JetBrains Mono, monospace">
                {d.jumlah}
              </text>
              <text x={x + lebarBatang / 2} y={tinggi - 12} textAnchor="middle" fontSize="10.5" fill={aktif ? '#EEF1FB' : '#8A93B8'} fontFamily="JetBrains Mono, monospace">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg border border-line bg-ink-950/95 px-2.5 py-1.5 text-[0.72rem] shadow-lift">
          <span className="font-bold text-chalk">{data[hover].jumlah} percobaan</span>
          <span className="ml-1.5 text-mute">rentang {data[hover].label}</span>
        </div>
      )}
    </div>
  )
}

export function Donut({ data, judul = 'Total', satuan = '' }) {
  const [hover, setHover] = useState(null)
  const total = data.reduce((a, b) => a + b.jumlah, 0)
  const r = 54
  const keliling = 2 * Math.PI * r
  let akumulasi = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative">
        <svg viewBox="0 0 140 140" className="size-[140px] -rotate-90" role="img" aria-label={judul}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="#141c3c" strokeWidth="17" />
          {data.map((d, i) => {
            const bagian = total ? d.jumlah / total : 0
            const panjang = keliling * bagian
            const offset = -keliling * akumulasi
            akumulasi += bagian
            if (!d.jumlah) return null
            return (
              <circle
                key={d.label}
                cx="70" cy="70" r={r} fill="none" stroke={d.warna}
                strokeWidth={hover === i ? 21 : 17}
                strokeDasharray={`${Math.max(panjang - 2.5, 0)} ${keliling}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width 0.25s, opacity 0.25s', cursor: 'pointer' }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-mono text-[1.6rem] leading-none font-bold text-chalk">{hover === null ? total : data[hover].jumlah}</p>
            <p className="mt-1 text-[0.66rem] font-bold tracking-widest text-mute uppercase">{hover === null ? judul : data[hover].label}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-[190px] flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label}>
            <button
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition hover:bg-ink-700/60"
            >
              <span className="size-2.5 flex-none rounded-sm" style={{ background: d.warna, boxShadow: `0 0 10px ${d.warna}66` }} />
              <span className="flex-1 text-[0.8rem] text-body">{d.label}</span>
              <span className="font-mono text-[0.8rem] font-bold text-chalk">{d.jumlah}</span>
              <span className="w-10 text-right font-mono text-[0.7rem] text-mute">{total ? Math.round((d.jumlah / total) * 100) : 0}%{satuan}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function GarisTren({ data, tinggi = 150 }) {
  const [hover, setHover] = useState(null)
  const uid = useId().replace(/:/g, '')
  const lebar = 620
  const pad = { atas: 18, bawah: 28, kiri: 30, kanan: 14 }
  const maks = Math.max(4, ...data.map((d) => d.jumlah))
  const areaT = tinggi - pad.atas - pad.bawah
  const areaL = lebar - pad.kiri - pad.kanan
  const titik = data.map((d, i) => ({
    x: pad.kiri + (data.length === 1 ? areaL / 2 : (areaL * i) / (data.length - 1)),
    y: pad.atas + areaT - (d.jumlah / maks) * areaT,
    ...d,
  }))
  const jalur = titik.map((t, i) => `${i === 0 ? 'M' : 'L'}${t.x.toFixed(1)},${t.y.toFixed(1)}`).join(' ')
  const area = `${jalur} L${titik[titik.length - 1]?.x ?? pad.kiri},${pad.atas + areaT} L${titik[0]?.x ?? pad.kiri},${pad.atas + areaT} Z`

  return (
    <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="w-full" role="img" aria-label="Tren pengerjaan tujuh hari terakhir"
      onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`${uid}-garis`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="55%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#A3E635" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g, i) => (
        <g key={i}>
          <line x1={pad.kiri} y1={pad.atas + areaT * (1 - g)} x2={lebar - pad.kanan} y2={pad.atas + areaT * (1 - g)} stroke="#1c2549" strokeDasharray="3 5" />
          <text x={pad.kiri - 7} y={pad.atas + areaT * (1 - g) + 3.5} textAnchor="end" fontSize="9.5" fill="#8A93B8" fontFamily="JetBrains Mono, monospace">
            {Math.round(maks * g)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${uid}-area)`} />
      <path d={jalur} fill="none" stroke={`url(#${uid}-garis)`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {titik.map((t, i) => {
        const d = new Date(t.tanggal)
        return (
          <g key={t.tanggal} onMouseEnter={() => setHover(i)}>
            <rect x={t.x - areaL / (data.length * 2 || 1)} y={pad.atas} width={areaL / (data.length || 1)} height={areaT} fill="transparent" />
            <circle cx={t.x} cy={t.y} r={hover === i ? 6 : 4} fill="#080B1A" stroke={i % 2 ? '#22D3EE' : '#A3E635'} strokeWidth="2.4" style={{ transition: 'r 0.2s' }} />
            <text x={t.x} y={tinggi - 9} textAnchor="middle" fontSize="10" fill={hover === i ? '#EEF1FB' : '#8A93B8'} fontFamily="JetBrains Mono, monospace">
              {HARI[d.getDay()]}
            </text>
            {hover === i && (
              <g>
                <rect x={Math.min(Math.max(t.x - 46, 2), lebar - 94)} y={Math.max(t.y - 40, 2)} width="92" height="30" rx="8" fill="#05070f" stroke="#26315e" />
                <text x={Math.min(Math.max(t.x - 46, 2), lebar - 94) + 46} y={Math.max(t.y - 26, 16)} textAnchor="middle" fontSize="10.5" fill="#EEF1FB" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                  {t.jumlah} selesai
                </text>
                <text x={Math.min(Math.max(t.x - 46, 2), lebar - 94) + 46} y={Math.max(t.y - 15, 27)} textAnchor="middle" fontSize="9.5" fill="#8A93B8">
                  rata-rata {t.rata ?? '—'}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function BatangHorizontal({ data, maks = 100, satuan = '' }) {
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2 flex-none rounded-full" style={{ background: d.warna }} />
              <span className="truncate text-[0.8rem] font-semibold text-body">{d.label}</span>
            </span>
            <span className="font-mono text-[0.8rem] font-bold" style={{ color: d.warna }}>
              {d.nilai === null ? '—' : d.nilai}{satuan}
            </span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-ink-950">
            <span
              className="block h-full rounded-full transition-all duration-700"
              style={{
                width: `${d.nilai === null ? 0 : Math.max(2, (d.nilai / maks) * 100)}%`,
                background: `linear-gradient(90deg, ${d.warna}, color-mix(in oklab, ${d.warna} 40%, #22D3EE))`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function Sparkline({ data, warna = '#22D3EE', lebar = 90, tinggi = 28 }) {
  if (!data?.length) return null
  const maks = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const rentang = maks - min || 1
  const titik = data.map((v, i) => `${(i / (data.length - 1 || 1)) * lebar},${tinggi - ((v - min) / rentang) * (tinggi - 4) - 2}`)
  return (
    <svg viewBox={`0 0 ${lebar} ${tinggi}`} width={lebar} height={tinggi} className="overflow-visible">
      <polyline points={titik.join(' ')} fill="none" stroke={warna} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lebar} cy={titik[titik.length - 1].split(',')[1]} r="2.6" fill={warna} />
    </svg>
  )
}