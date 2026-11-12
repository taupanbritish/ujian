import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChartNoAxesCombined, Search, Trophy, Target, CheckCircle2, XCircle, CircleSlash, Clock,
  ChevronRight, PenLine, ArrowUpDown, BookOpen, TrendingUp, Sparkles, CalendarDays,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, Cincin, BilahProgres, Kosong, Galat, Rangka, Segmen, JudulBagian,
} from '../../components/ui'
import { BatangHorizontal } from '../../components/charts'
import { nilaiTeks, warnaNilai, tanggal, jamSaja, durasiPendek, relatif } from '../../lib/format'

function GrafikNilai({ data }) {
  const [hover, setHover] = useState(null)
  const uid = useId().replace(/:/g, '')
  const lebar = 680
  const tinggi = 220
  const pad = { atas: 20, bawah: 36, kiri: 34, kanan: 18 }
  const areaT = tinggi - pad.atas - pad.bawah
  const areaL = lebar - pad.kiri - pad.kanan
  const y = (v) => pad.atas + areaT - (Math.max(0, Math.min(100, v)) / 100) * areaT
  const x = (i) => pad.kiri + (data.length === 1 ? areaL / 2 : (areaL * i) / (data.length - 1))
  const jalur = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.nilai).toFixed(1)}`).join(' ')
  const area = `${jalur} L${x(data.length - 1).toFixed(1)},${pad.atas + areaT} L${x(0).toFixed(1)},${pad.atas + areaT} Z`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${lebar} ${tinggi}`} className="w-full" role="img" aria-label="Grafik perkembangan nilai antar ujian" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`${uid}-garis`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="55%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#A3E635" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={pad.kiri} y1={y(g)} x2={lebar - pad.kanan} y2={y(g)} stroke="#1c2549" strokeDasharray={g === 0 ? '0' : '3 5'} />
            <text x={pad.kiri - 8} y={y(g) + 4} textAnchor="end" fontSize="10" fill="#8A93B8" fontFamily="JetBrains Mono, monospace">{g}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${uid}-area)`} />
        <path d={jalur} fill="none" stroke={`url(#${uid}-garis)`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={d.id} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - areaL / (data.length * 2 || 1)} y={pad.atas} width={areaL / (data.length || 1)} height={areaT} fill="transparent" />
            <line x1={x(i) - 9} y1={y(d.kkm)} x2={x(i) + 9} y2={y(d.kkm)} stroke="#FFB020" strokeWidth="2" strokeDasharray="3 2" opacity="0.85" />
            <circle cx={x(i)} cy={y(d.nilai)} r={hover === i ? 7 : 5} fill="#080B1A" stroke={warnaNilai(d.nilai, d.kkm)} strokeWidth="2.6" style={{ transition: 'r 0.2s' }} />
            <text x={x(i)} y={tinggi - 12} textAnchor="middle" fontSize="9.5" fill={hover === i ? '#EEF1FB' : d.mapel_warna} fontFamily="JetBrains Mono, monospace" fontWeight="700">
              {d.mapel_kode}
            </text>
            {hover === i && (
              <g>
                <rect x={Math.min(Math.max(x(i) - 92, 2), lebar - 186)} y={Math.max(y(d.nilai) - 52, 2)} width="184" height="44" rx="9" fill="#05070f" stroke="#26315e" />
                <text x={Math.min(Math.max(x(i) - 92, 2), lebar - 186) + 10} y={Math.max(y(d.nilai) - 52, 2) + 17} fontSize="10.5" fill="#EEF1FB" fontWeight="700">
                  {d.judul.length > 27 ? `${d.judul.slice(0, 26)}…` : d.judul}
                </text>
                <text x={Math.min(Math.max(x(i) - 92, 2), lebar - 186) + 10} y={Math.max(y(d.nilai) - 52, 2) + 33} fontSize="10" fill="#8A93B8" fontFamily="JetBrains Mono, monospace">
                  nilai {nilaiTeks(d.nilai)} · KKM {d.kkm} · {tanggal(d.selesai_pada, { tahun: false })}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-mute">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-[linear-gradient(90deg,#7C5CFF,#A3E635)]" /> Nilai akhir</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-amber" /> Batas KKM tiap ujian</span>
        <span className="ml-auto font-mono">{data.length} pengerjaan terakhir</span>
      </div>
    </div>
  )
}

export default function Riwayat() {
  const { pengguna } = useAuth()
  const { bunyi } = useSuara()
  const [saringan, setSaringan] = useState('semua')
  const [urutan, setUrutan] = useState('terbaru')
  const [cari, setCari] = useState('')

  const { data, isPending, error, refetch } = useQuery({ queryKey: ['beranda-siswa'], queryFn: () => api('/siswa/beranda') })

  const semua = data?.riwayat || []
  const selesai = semua.filter((r) => r.status === 'selesai')
  const st = data?.statistik

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    const rows = semua.filter((r) => {
      if (saringan === 'tuntas' && !(r.status === 'selesai' && !r.perlu_penilaian && r.nilai >= r.kkm)) return false
      if (saringan === 'belum' && !(r.status === 'selesai' && !r.perlu_penilaian && r.nilai < r.kkm)) return false
      if (saringan === 'poin' && !r.perlu_penilaian) return false
      if (saringan === 'berlangsung' && r.status !== 'berlangsung') return false
      if (q && !`${r.judul} ${r.mapel_nama}`.toLowerCase().includes(q)) return false
      return true
    })
    const urut = {
      terbaru: (a, b) => new Date(b.selesai_pada || b.mulai_pada) - new Date(a.selesai_pada || a.mulai_pada),
      terlama: (a, b) => new Date(a.selesai_pada || a.mulai_pada) - new Date(b.selesai_pada || b.mulai_pada),
      tinggi: (a, b) => (b.nilai ?? -1) - (a.nilai ?? -1),
      rendah: (a, b) => (a.nilai ?? 101) - (b.nilai ?? 101),
    }[urutan]
    return [...rows].sort(urut)
  }, [semua, saringan, urutan, cari])

  const grafik = useMemo(() => [...selesai].filter((r) => r.nilai !== null)
    .sort((a, b) => new Date(a.selesai_pada) - new Date(b.selesai_pada)).slice(-12)
    .map((r) => ({ ...r, mapel_kode: r.mapel_nama.split(' ').map((k) => k[0]).join('').slice(0, 3).toUpperCase() })), [selesai])

  const perMapel = useMemo(() => {
    const peta = new Map()
    selesai.forEach((r) => {
      if (r.nilai === null) return
      const ada = peta.get(r.mapel_nama) || { label: r.mapel_nama, warna: r.mapel_warna, total: 0, n: 0 }
      ada.total += r.nilai; ada.n++
      peta.set(r.mapel_nama, ada)
    })
    return [...peta.values()].map((x) => ({ label: x.label, warna: x.warna, nilai: Math.round((x.total / x.n) * 10) / 10 })).sort((a, b) => b.nilai - a.nilai)
  }, [selesai])

  if (isPending) return <Rangka baris={7} />
  if (error) return <Galat pesan={error.message} onUlang={refetch} />

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow={`Rekap ${pengguna.kelas}`}
        judul="Riwayat nilai saya"
        pesan="Seluruh sesi yang pernah kamu kerjakan, lengkap dengan capaian, ketuntasan, dan pembahasan dari guru."
        kanan={<Link to="/siswa"><Tombol varian="kedua" ikon={ChevronRight}>Kembali ke beranda</Tombol></Link>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'Total pengerjaan', n: semua.length, w: '#7C5CFF', ikon: ChartNoAxesCombined },
          { l: 'Rata-rata nilai', n: nilaiTeks(st?.rata), w: '#22D3EE', ikon: Sparkles },
          { l: 'Nilai terbaik', n: nilaiTeks(st?.terbaik), w: '#A3E635', ikon: Trophy },
          { l: 'Tuntas KKM', n: st?.selesai ? `${st.tuntas} dari ${st.selesai}` : '—', w: '#FFB020', ikon: Target },
        ].map((x, i) => {
          const Ikon = x.ikon
          return (
            <div key={x.l} className={`kartu anim-naik tunda-${i + 1} relative overflow-hidden p-4`}>
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: x.w }} />
              <Ikon size={16} style={{ color: x.w }} />
              <p className="mt-2.5 font-mono text-[1.55rem] leading-none font-bold text-chalk">{x.n}</p>
              <p className="mt-2 text-[0.68rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="kartu p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-[1rem]"><TrendingUp size={16} className="text-lime" /> Perkembangan nilai</h3>
              <p className="mt-0.5 text-[0.75rem] text-mute">Arahkan kursor ke titik untuk melihat judul ujian dan tanggal pengerjaan.</p>
            </div>
            {grafik.length > 1 && (
              <Pil warna={grafik[grafik.length - 1].nilai >= grafik[0].nilai ? '#A3E635' : '#FFB020'}>
                {grafik[grafik.length - 1].nilai >= grafik[0].nilai ? 'Naik' : 'Turun'} {Math.abs(grafik[grafik.length - 1].nilai - grafik[0].nilai).toFixed(1)} poin
              </Pil>
            )}
          </div>
          {grafik.length === 0 ? (
            <Kosong ikon={ChartNoAxesCombined} judul="Belum ada nilai tercatat" pesan="Grafik muncul setelah kamu menyelesaikan ujian pertama." className="py-10" />
          ) : <GrafikNilai data={grafik} />}
        </section>

        <section className="kartu p-4">
          <h3 className="text-[1rem]">Rata-rata per mata pelajaran</h3>
          <p className="mt-0.5 mb-3 text-[0.75rem] text-mute">Dihitung dari seluruh sesi selesai pada mapel tersebut.</p>
          {perMapel.length === 0 ? (
            <p className="text-[0.8rem] text-mute">Belum ada nilai untuk dirangkum.</p>
          ) : <BatangHorizontal data={perMapel} maks={100} />}
        </section>
      </div>

      <section className="kartu p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul ujian atau mata pelajaran…" className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Cari riwayat ujian" />
          </div>
          <label className="relative">
            <ArrowUpDown size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <select value={urutan} onChange={(e) => setUrutan(e.target.value)} className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Urutkan riwayat">
              <option value="terbaru">Paling baru</option>
              <option value="terlama">Paling lama</option>
              <option value="tinggi">Nilai tertinggi</option>
              <option value="rendah">Nilai terendah</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
          <Segmen
            nilai={saringan}
            onChange={setSaringan}
            pilihan={[
              { nilai: 'semua', label: 'Semua', jumlah: semua.length },
              { nilai: 'tuntas', label: 'Tuntas', jumlah: selesai.filter((r) => !r.perlu_penilaian && r.nilai >= r.kkm).length },
              { nilai: 'belum', label: 'Belum tuntas', jumlah: selesai.filter((r) => !r.perlu_penilaian && r.nilai < r.kkm).length },
              { nilai: 'poin', label: 'Menunggu poin', jumlah: semua.filter((r) => r.perlu_penilaian).length },
              { nilai: 'berlangsung', label: 'Berlangsung', jumlah: semua.filter((r) => r.status === 'berlangsung').length },
            ]}
          />
          <span className="ml-auto text-[0.74rem] text-mute">{tampil.length} sesi tampil</span>
        </div>
      </section>

      {tampil.length === 0 ? (
        <Kosong
          ikon={BookOpen}
          judul={semua.length === 0 ? 'Belum ada riwayat ujian' : 'Tidak ada sesi yang cocok'}
          pesan={semua.length === 0 ? 'Mulai sebuah ujian dari beranda. Hasil dan pembahasannya akan tersimpan di halaman ini.' : 'Ubah kata pencarian atau saringan status untuk melihat sesi lain.'}
          aksi={semua.length === 0
            ? <Link to="/siswa"><Tombol varian="utama" ikon={ChevronRight}>Lihat ujian tersedia</Tombol></Link>
            : <Tombol ukuran="sm" varian="kedua" onClick={() => { bunyi('klik'); setCari(''); setSaringan('semua') }}>Bersihkan saringan</Tombol>}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tampil.map((r, i) => {
            const berlangsung = r.status === 'berlangsung'
            const tuntas = !r.perlu_penilaian && r.nilai !== null && r.nilai >= r.kkm
            return (
              <article key={r.id} className={`kartu kartu-hover anim-naik relative overflow-hidden p-4 ${i < 6 ? `tunda-${i + 1}` : ''}`}>
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: r.mapel_warna }} />
                <div className="flex items-start gap-4">
                  <Cincin nilai={r.nilai ?? 0} ukuran={74} tebal={7} warna={berlangsung ? '#A3E635' : warnaNilai(r.nilai, r.kkm)}>
                    <span className="text-center">
                      <span className="block font-mono text-[1.15rem] leading-none font-bold text-chalk">{berlangsung ? '…' : nilaiTeks(r.nilai)}</span>
                      <span className="mt-1 block text-[0.55rem] font-bold tracking-widest text-mute uppercase">KKM {r.kkm}</span>
                    </span>
                  </Cincin>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: r.mapel_warna }} />
                      <span className="text-[0.72rem] font-bold" style={{ color: r.mapel_warna }}>{r.mapel_nama}</span>
                      {berlangsung ? <Pil warna="#A3E635">Berlangsung</Pil>
                        : r.perlu_penilaian ? <Pil warna="#FFB020" ikon={PenLine}>Menunggu poin uraian</Pil>
                        : tuntas ? <Pil warna="#A3E635" ikon={CheckCircle2}>Tuntas</Pil>
                        : <Pil warna="#FF4D6D" ikon={XCircle}>Belum tuntas</Pil>}
                    </div>
                    <h3 className="mt-1.5 text-[0.98rem] leading-snug">{r.judul}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.7rem] text-mute">
                      <span className="flex items-center gap-1"><CalendarDays size={10} /> {tanggal(r.selesai_pada || r.mulai_pada, { jam: true })}</span>
                      <span>{relatif(r.selesai_pada || r.mulai_pada)}</span>
                    </p>
                  </div>
                </div>

                {!berlangsung && (
                  <>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        { l: 'Benar', n: r.benar, w: '#A3E635', ikon: CheckCircle2 },
                        { l: 'Salah', n: r.salah, w: '#FF4D6D', ikon: XCircle },
                        { l: 'Kosong', n: r.kosong, w: '#8A93B8', ikon: CircleSlash },
                        { l: 'Butir', n: r.total_soal, w: '#22D3EE', ikon: BookOpen },
                      ].map((x) => {
                        const Ikon = x.ikon
                        return (
                          <div key={x.l} className="rounded-lg border border-line-soft bg-ink-950/40 p-2 text-center">
                            <Ikon size={12} style={{ color: x.w }} className="mx-auto" />
                            <p className="mt-1 font-mono text-[0.95rem] leading-none font-bold text-chalk">{x.n}</p>
                            <p className="mt-1 text-[0.58rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-2.5">
                      <BilahProgres nilai={r.nilai ?? 0} warna={warnaNilai(r.nilai, r.kkm)} tinggi={5} />
                      <p className="mt-1.5 flex items-center justify-between text-[0.68rem] text-mute">
                        <span className="flex items-center gap-1"><Clock size={10} /> {durasiPendek(Math.round((new Date(r.selesai_pada) - new Date(r.mulai_pada)) / 1000))} dari {r.durasi_menit} menit</span>
                        <span className="font-mono">selesai {jamSaja(r.selesai_pada)}</span>
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
                  {berlangsung ? (
                    <Link to={`/siswa/ujian/${r.id}`} className="flex-1">
                      <Tombol varian="sukses" className="w-full" ikon={ChevronRight}>Lanjutkan sesi</Tombol>
                    </Link>
                  ) : (
                    <Link to={`/siswa/hasil/${r.id}`} className="flex-1">
                      <Tombol varian={r.perlu_penilaian ? 'kedua' : 'utama'} className="w-full" ikon={r.tampil_pembahasan && !r.perlu_penilaian ? BookOpen : ChartNoAxesCombined}>
                        {r.tampil_pembahasan && !r.perlu_penilaian ? 'Lihat hasil & pembahasan' : 'Lihat rincian hasil'}
                      </Tombol>
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}