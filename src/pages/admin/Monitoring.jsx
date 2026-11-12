import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Radio, Pause, Play, RotateCw, Search, Users, CheckCircle2, Hourglass, Eye, AlertTriangle,
  Timer, TimerReset, Flag, MonitorSmartphone, KeyRound, ChevronLeft, ChevronRight, Activity, UserX, ListChecks,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, TombolIkon, Pil, TitikNyala, Avatar, Cincin, BilahProgres, Kosong, Galat, Rangka,
  Segmen, Modal, Konfirmasi, JudulBagian, Salin, Field,
} from '../../components/ui'
import { Donut } from '../../components/charts'
import { STATUS_UJIAN, jamMenitDetik, jamSaja, durasiPendek, nilaiTeks, tanggal, namaPanggilan } from '../../lib/format'

const WARNA_STATUS = { berlangsung: '#A3E635', selesai: '#7C5CFF' }

function KartuPeserta({ p, tick, onWaktu, onAkhiri, onReset }) {
  const live = p.status === 'berlangsung'
  const sisa = live ? Math.max(0, Math.round((new Date(p.batas_pada).getTime() - tick) / 1000)) : 0
  const totalDetik = Math.max(1, Math.round((new Date(p.batas_pada).getTime() - new Date(p.mulai_pada).getTime()) / 1000))
  const terpakai = Math.min(100, Math.round(((totalDetik - sisa) / totalDetik) * 100))
  const warnaWaktu = !live ? '#8A93B8' : sisa <= 300 ? '#FF4D6D' : sisa <= 900 ? '#FFB020' : '#22D3EE'
  const warna = WARNA_STATUS[p.status] || '#8A93B8'
  const peringatan = live && p.fokus_hilang >= 3

  return (
    <article
      className="kartu-hover relative overflow-hidden p-4"
      style={peringatan ? { borderColor: 'rgba(255,77,109,0.5)', boxShadow: '0 0 0 1px rgba(255,77,109,0.18), 0 18px 40px -28px rgba(255,77,109,0.7)' } : undefined}
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${warna}, transparent)` }} />
      {live && <span className="pointer-events-none absolute -top-14 -right-10 size-32 rounded-full opacity-[0.13] blur-2xl" style={{ background: warna }} />}

      <div className="relative flex items-start gap-3">
        <Avatar nama={p.nama} gender={p.gender} ukuran={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.92rem] leading-tight font-bold text-chalk">{p.nama}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[0.7rem] text-mute">
            <span>{p.nis}</span><span className="text-line">·</span><span>{p.kelas}</span>
          </p>
        </div>
        {live ? <TitikNyala warna="#A3E635" label="Live" /> : <Pil warna="#7C5CFF" ikon={CheckCircle2}>Selesai</Pil>}
      </div>

      <div className="relative mt-4 flex items-center gap-4">
        <Cincin nilai={p.progres} ukuran={68} tebal={7} warna={p.progres >= 100 ? '#A3E635' : '#7C5CFF'}>
          <span className="text-center">
            <span className="block font-mono text-[0.92rem] leading-none font-bold text-chalk">{p.progres}%</span>
            <span className="mt-0.5 block text-[0.58rem] font-bold tracking-wide text-mute uppercase">terisi</span>
          </span>
        </Cincin>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[
            { l: 'Terjawab', n: `${p.terjawab}/${p.total_soal}`, w: '#22D3EE' },
            { l: 'Ragu-ragu', n: p.ragu, w: '#FFB020' },
            { l: 'Pindah tab', n: p.fokus_hilang, w: p.fokus_hilang > 0 ? '#FF4D6D' : '#8A93B8' },
          ].map((x) => (
            <div key={x.l} className="rounded-lg border border-line-soft bg-ink-950/50 px-2 py-1.5 text-center">
              <p className="font-mono text-[0.95rem] leading-none font-bold" style={{ color: x.w }}>{x.n}</p>
              <p className="mt-1 text-[0.6rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-3 rounded-xl border border-line-soft bg-ink-950/50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[0.68rem] font-bold tracking-wide text-mute uppercase">
            <Timer size={11} style={{ color: warnaWaktu }} /> {live ? 'Sisa waktu' : 'Waktu terpakai'}
          </span>
          <span className={`font-mono text-[1.05rem] leading-none font-bold ${live && sisa <= 300 ? 'anim-bahaya' : ''}`} style={{ color: warnaWaktu }}>
            {live ? jamMenitDetik(sisa) : durasiPendek(p.terpakai_detik)}
          </span>
        </div>
        <BilahProgres nilai={live ? terpakai : 100} warna={warnaWaktu} tinggi={5} className="mt-2" />
        <p className="mt-1.5 flex items-center justify-between font-mono text-[0.64rem] text-mute">
          <span>mulai {jamSaja(p.mulai_pada)}</span>
          <span>{live ? `batas ${jamSaja(p.batas_pada)}` : `kirim ${jamSaja(p.batas_pada)}`}</span>
        </p>
      </div>

      {peringatan && (
        <p className="relative mt-2 flex items-start gap-2 rounded-lg border border-rose/40 bg-rose/10 px-2.5 py-2 text-[0.72rem] leading-snug font-semibold text-rose">
          <AlertTriangle size={13} className="mt-px flex-none" />
          Terdeteksi {p.fokus_hilang} kali meninggalkan halaman ujian. Periksa langsung ke peserta.
        </p>
      )}

      <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[0.68rem] text-mute" title={p.perangkat || 'Perangkat tidak tercatat'}>
          <MonitorSmartphone size={12} className="flex-none text-sky" /> <span className="truncate">{p.perangkat || 'Perangkat tidak tercatat'}</span>
        </span>
        {live ? (
          <span className="flex gap-1.5">
            <Tombol ukuran="sm" varian="kedua" ikon={Timer} onClick={() => onWaktu(p)}>Waktu</Tombol>
            <TombolIkon ikon={Flag} label={`Akhiri sesi ${p.nama}`} onClick={() => onAkhiri(p)} className="hover:border-rose hover:text-rose" />
            <TombolIkon ikon={TimerReset} label={`Reset sesi ${p.nama}`} onClick={() => onReset(p)} className="hover:border-amber hover:text-amber" />
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="font-mono text-[0.95rem] font-bold" style={{ color: p.nilai === null ? '#8A93B8' : p.nilai >= 70 ? '#A3E635' : '#FFB020' }}>{nilaiTeks(p.nilai)}</span>
            {p.perlu_penilaian && <Pil warna="#FFB020">Perlu dinilai</Pil>}
            <Link to={`/admin/hasil?cari=${encodeURIComponent(p.nama)}`} className="inline-flex items-center gap-0.5 text-[0.72rem] font-bold text-cyan transition hover:gap-1.5">
              Lembar <ChevronRight size={12} />
            </Link>
          </span>
        )}
      </div>
    </article>
  )
}

export default function Monitoring() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [otomatis, setOtomatis] = useState(true)
  const [tick, setTick] = useState(Date.now())
  const [saringan, setSaringan] = useState('semua')
  const [cari, setCari] = useState('')
  const [waktuUntuk, setWaktuUntuk] = useState(null)
  const [menit, setMenit] = useState(10)
  const [konfirmasi, setKonfirmasi] = useState(null)
  const stripRef = useRef(null)
  const [ujung, setUjung] = useState({ kiri: false, kanan: false })

  const ukurStrip = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    setUjung({ kiri: el.scrollLeft > 4, kanan: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])

  const ujianId = params.get('ujian_id') || ''
  const { data, isPending, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['monitoring', ujianId],
    queryFn: () => api(`/monitoring${ujianId ? `?ujian_id=${ujianId}` : ''}`),
    refetchInterval: otomatis ? 5000 : false,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    ukurStrip()
    window.addEventListener('resize', ukurStrip)
    return () => window.removeEventListener('resize', ukurStrip)
  }, [ukurStrip, data?.ujian?.length])

  useEffect(() => {
    const el = stripRef.current
    const aktif = el?.querySelector('[data-aktif="true"]')
    if (!el || !aktif) return
    el.scrollTo({ left: Math.max(0, aktif.offsetLeft - (el.clientWidth - aktif.offsetWidth) / 2), behavior: 'smooth' })
    const t = setTimeout(ukurStrip, 420)
    return () => clearTimeout(t)
  }, [data?.terpilih, ukurStrip])

  useEffect(() => {
    if (data?.terpilih && String(data.terpilih) !== ujianId) {
      const p = new URLSearchParams(params)
      p.set('ujian_id', String(data.terpilih))
      setParams(p, { replace: true })
    }
  }, [data?.terpilih])

  const selesai = (pesan) => {
    bunyi('simpan')
    setKonfirmasi(null)
    setWaktuUntuk(null)
    qc.invalidateQueries({ queryKey: ['monitoring'] })
    qc.invalidateQueries({ queryKey: ['ringkasan'] })
    qc.invalidateQueries({ queryKey: ['hasil'] })
    toast.sukses(pesan)
  }
  const gagal = (e, judul) => { bunyi('gagal'); setKonfirmasi(null); toast.gagal(judul, { pesan: pesanGalat(e) }) }

  const tambahWaktu = useMutation({
    mutationFn: () => api(`/monitoring/${waktuUntuk.id}/tambah-waktu`, { method: 'POST', body: { menit: Number(menit) } }),
    onSuccess: (d) => selesai(d.pesan),
    onError: (e) => gagal(e, 'Waktu belum bertambah'),
  })
  const akhiri = useMutation({
    mutationFn: (id) => api(`/monitoring/${id}/paksa-selesai`, { method: 'POST' }),
    onSuccess: (d) => { bunyi('selesai'); selesai(d.pesan) },
    onError: (e) => gagal(e, 'Sesi belum dapat diakhiri'),
  })
  const reset = useMutation({
    mutationFn: (id) => api(`/monitoring/${id}/reset`, { method: 'POST' }),
    onSuccess: (d) => {
      bunyi('peringatan')
      setKonfirmasi(null)
      qc.invalidateQueries({ queryKey: ['monitoring'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(d.pesan, { pesan: 'Jawaban pada sesi tersebut dihapus dan tidak dapat dikembalikan.' })
    },
    onError: (e) => gagal(e, 'Sesi belum dapat direset'),
  })

  const peserta = data?.peserta || []
  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return peserta.filter((p) => {
      if (saringan === 'live' && p.status !== 'berlangsung') return false
      if (saringan === 'selesai' && p.status !== 'selesai') return false
      if (saringan === 'peringatan' && !(p.status === 'berlangsung' && p.fokus_hilang > 0)) return false
      if (q && !`${p.nama} ${p.nis} ${p.kelas}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [peserta, saringan, cari])

  if (isPending) return <Rangka baris={7} />
  if (error) return <Galat pesan={error.message} onUlang={refetch} />
  if (!data.ujian.length) {
    return (
      <Kosong
        ikon={Radio}
        judul="Belum ada ujian yang dapat diawasi"
        pesan="Terbitkan sebuah ujian terlebih dahulu. Sesi peserta akan muncul di halaman ini begitu ujian dibuka."
        aksi={<Link to="/admin/ujian"><Tombol varian="utama" ikon={ChevronRight}>Buka daftar ujian</Tombol></Link>}
      />
    )
  }

  const u = data.ujian.find((x) => x.id === data.terpilih)
  const r = data.ringkas
  const s = STATUS_UJIAN[u.status_efektif]
  const live = peserta.filter((p) => p.status === 'berlangsung')
  const peringatan = live.filter((p) => p.fokus_hilang > 0)
  const hampirHabis = live.filter((p) => (new Date(p.batas_pada).getTime() - tick) / 1000 <= 300)

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Ruang pengawas"
        judul="Pengawasan langsung"
        pesan="Pantau progres, sisa waktu, dan aktivitas setiap peserta secara berkala. Data disegarkan otomatis setiap 5 detik."
        kanan={
          <>
            <span className="hidden items-center gap-2 rounded-xl border border-line-soft bg-ink-950/50 px-3 py-2 sm:flex">
              <Activity size={13} className={otomatis ? 'text-lime' : 'text-mute'} />
              <span className="font-mono text-[0.72rem] text-mute">
                {dataUpdatedAt ? `diperbarui ${new Date(dataUpdatedAt).toLocaleTimeString('id-ID', { hour12: false })}` : 'menunggu data'}
              </span>
            </span>
            <Tombol varian="kedua" ikon={otomatis ? Pause : Play} onClick={() => { setOtomatis((v) => !v); bunyi('klik') }}>
              {otomatis ? 'Jeda otomatis' : 'Segarkan otomatis'}
            </Tombol>
            <Tombol varian="utama" ikon={RotateCw} memuat={isFetching} onClick={() => refetch()}>Segarkan</Tombol>
          </>
        }
      />

      <div className="relative">
        <div ref={stripRef} onScroll={ukurStrip} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {data.ujian.map((x) => {
          const aktif = x.id === data.terpilih
          const st = STATUS_UJIAN[x.status_efektif]
          return (
            <button
              key={x.id}
              data-aktif={aktif}
              onClick={() => { bunyi('buka'); const p = new URLSearchParams(params); p.set('ujian_id', String(x.id)); setParams(p, { replace: true }) }}
              className="relative flex w-[228px] flex-none flex-col items-start gap-1.5 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200"
              style={{
                borderColor: aktif ? x.mapel_warna : '#1c2549',
                background: aktif ? `linear-gradient(140deg, color-mix(in oklab, ${x.mapel_warna} 18%, #101736), #0b1024)` : 'rgba(8,11,26,0.5)',
                boxShadow: aktif ? `0 16px 36px -24px ${x.mapel_warna}` : undefined,
              }}
            >
              <span className="flex w-full items-center gap-1.5">
                <span className="size-2 flex-none rounded-full" style={{ background: x.mapel_warna }} />
                <span className="truncate text-[0.7rem] font-bold" style={{ color: x.mapel_warna }}>{x.mapel_nama}</span>
                <span className="ml-auto"><Pil warna={st.warna}>{st.label}</Pil></span>
              </span>
              <span className="line-clamp-2 text-[0.84rem] leading-snug font-bold text-chalk">{x.judul}</span>
              <span className="flex items-center gap-2 font-mono text-[0.66rem] text-mute">
                <span className={x.jumlah_berlangsung > 0 ? 'font-bold text-lime' : ''}>{x.jumlah_berlangsung} live</span>
                <span className="text-line">·</span>
                <span>{x.jumlah_selesai} selesai</span>
                <span className="text-line">·</span>
                <span>{x.sasaran} sasaran</span>
              </span>
            </button>
          )
        })}
        </div>
        {ujung.kiri && (
          <>
            <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-900 via-ink-900/80 to-transparent" />
            <TombolIkon ikon={ChevronLeft} label="Geser ke ujian sebelumnya" onClick={() => stripRef.current?.scrollBy({ left: -472, behavior: 'smooth' })} className="absolute top-[38%] left-0 -translate-y-1/2 border-line bg-ink-800 shadow-lift" />
          </>
        )}
        {ujung.kanan && (
          <>
            <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-900 via-ink-900/80 to-transparent" />
            <TombolIkon ikon={ChevronRight} label="Geser ke ujian berikutnya" onClick={() => stripRef.current?.scrollBy({ left: 472, behavior: 'smooth' })} className="absolute top-[38%] right-0 -translate-y-1/2 border-line bg-ink-800 shadow-lift" />
          </>
        )}
      </div>

      <section className="kartu relative overflow-hidden p-5">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${s.warna}, #22D3EE)` }} />
        <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full opacity-[0.14] blur-3xl" style={{ background: u.mapel_warna }} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pil warna={u.mapel_warna}>{u.mapel_nama}</Pil>
              <Pil warna={s.warna}>{s.label}</Pil>
              {r.mengerjakan > 0 && <TitikNyala warna="#A3E635" label={`${r.mengerjakan} sesi berjalan`} />}
            </div>
            <h2 className="mt-2.5 text-[1.35rem] leading-tight sm:text-[1.6rem]">{u.judul}</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-mute">
              <span className="flex items-center gap-1.5"><Timer size={12} className="text-amber" /> {u.durasi_menit} menit per sesi</span>
              <span className="flex items-center gap-1.5"><ListChecks size={12} className="text-violet" /> {u.jumlah_soal} butir</span>
              <span className="flex items-center gap-1.5"><Users size={12} className="text-sky" /> {u.kelas_target.length ? u.kelas_target.join(', ') : 'Semua kelas'}</span>
              <span>{tanggal(u.mulai_pada, { jam: true })} → {tanggal(u.selesai_pada, { jam: true })}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink-950/50 px-3 py-2">
              <KeyRound size={13} className="text-amber" />
              <span className="font-mono text-[0.95rem] font-bold tracking-[0.2em] text-chalk">{u.token}</span>
              <Salin teks={u.token} label="Salin" />
            </span>
            <Link to={`/admin/ujian/${u.id}`}><Tombol varian="kedua">Penyusun</Tombol></Link>
            <Link to={`/admin/hasil?ujian_id=${u.id}`}><Tombol varian="kedua">Rekap nilai</Tombol></Link>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-line-soft pt-4 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { l: 'Peserta sasaran', n: r.sasaran, w: '#38BDF8', ikon: Users },
            { l: 'Sedang mengerjakan', n: r.mengerjakan, w: '#A3E635', ikon: Radio },
            { l: 'Sudah selesai', n: r.selesai, w: '#7C5CFF', ikon: CheckCircle2 },
            { l: 'Belum mulai', n: r.belum, w: '#8A93B8', ikon: Hourglass },
            { l: 'Rata-rata progres', n: `${r.rata_progres}%`, w: '#22D3EE', ikon: Activity },
            { l: 'Peringatan fokus', n: r.peringatan_fokus, w: '#FF4D6D', ikon: Eye },
          ].map((x) => {
            const Ikon = x.ikon
            return (
              <div key={x.l} className="rounded-xl border border-line-soft bg-ink-950/40 p-3">
                <Ikon size={14} style={{ color: x.w }} />
                <p className="mt-2 font-mono text-[1.35rem] leading-none font-bold text-chalk">{x.n}</p>
                <p className="mt-1.5 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
              </div>
            )
          })}
        </div>
      </section>

      {(hampirHabis.length > 0 || peringatan.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hampirHabis.length > 0 && (
            <div className="anim-naik flex min-w-0 items-start gap-3 rounded-2xl border border-rose/45 bg-[linear-gradient(120deg,rgba(255,77,109,0.14),rgba(11,16,36,0.6))] p-3.5">
              <span className="grid size-9 flex-none place-items-center rounded-xl bg-rose/20 text-rose"><Timer size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.86rem] font-bold text-chalk">{hampirHabis.length} peserta menuju batas waktu</p>
                <p className="mt-0.5 text-[0.76rem] leading-snug text-mute">{hampirHabis.map((p) => namaPanggilan(p.nama)).join(', ')} — kurang dari 5 menit. Jawaban akan terkirim otomatis.</p>
              </div>
            </div>
          )}
          {peringatan.length > 0 && (
            <div className="anim-naik flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-amber/45 bg-[linear-gradient(120deg,rgba(255,176,32,0.13),rgba(11,16,36,0.6))] p-3.5">
              <span className="grid size-9 flex-none place-items-center rounded-xl bg-amber/20 text-amber"><Eye size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.86rem] font-bold text-chalk">{peringatan.length} peserta meninggalkan halaman ujian</p>
                <p className="mt-0.5 text-[0.76rem] leading-snug text-mute">{peringatan.map((p) => `${namaPanggilan(p.nama)} (${p.fokus_hilang}×)`).join(', ')}</p>
              </div>
              <Tombol ukuran="sm" varian="kedua" className="ml-auto flex-none" onClick={() => { bunyi('klik'); setSaringan('peringatan') }}>Tinjau</Tombol>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmen
              nilai={saringan}
              onChange={setSaringan}
              pilihan={[
                { nilai: 'semua', label: 'Semua', jumlah: peserta.length },
                { nilai: 'live', label: 'Mengerjakan', jumlah: live.length },
                { nilai: 'selesai', label: 'Selesai', jumlah: peserta.length - live.length },
                { nilai: 'peringatan', label: 'Peringatan', jumlah: peringatan.length },
              ]}
            />
            <div className="relative min-w-[180px] flex-1">
              <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, NIS, atau kelas…" className="kolom-field py-2 pl-9 text-[0.82rem]" aria-label="Cari peserta yang diawasi" />
            </div>
          </div>

          {tampil.length === 0 ? (
            <Kosong
              ikon={saringan === 'live' ? Radio : Search}
              judul={peserta.length === 0 ? 'Belum ada peserta masuk' : 'Tidak ada peserta yang cocok'}
              pesan={peserta.length === 0 ? 'Bagikan token ujian kepada peserta. Sesi akan tampil di sini segera setelah mereka memulai.' : 'Ubah kata pencarian atau saringan status untuk melihat peserta lain.'}
              aksi={peserta.length > 0 ? <Tombol ukuran="sm" varian="kedua" onClick={() => { setCari(''); setSaringan('semua') }}>Bersihkan saringan</Tombol> : undefined}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tampil.map((p) => (
                <KartuPeserta
                  key={p.id}
                  p={p}
                  tick={tick}
                  onWaktu={(x) => { bunyi('buka'); setWaktuUntuk(x); setMenit(10) }}
                  onAkhiri={(x) => { bunyi('peringatan'); setKonfirmasi({ jenis: 'akhiri', p: x }) }}
                  onReset={(x) => { bunyi('peringatan'); setKonfirmasi({ jenis: 'reset', p: x }) }}
                />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="kartu p-4">
            <h3 className="text-[1rem]">Komposisi kehadiran</h3>
            <p className="mt-0.5 mb-4 text-[0.75rem] text-mute">Perbandingan peserta yang sudah masuk ruang ujian terhadap sasaran.</p>
            <Donut
              judul="Sasaran"
              data={[
                { label: 'Mengerjakan', jumlah: r.mengerjakan, warna: '#A3E635' },
                { label: 'Selesai', jumlah: r.selesai, warna: '#7C5CFF' },
                { label: 'Belum mulai', jumlah: r.belum, warna: '#3a4680' },
              ]}
            />
            <div className="mt-4 rounded-xl border border-line-soft bg-ink-950/50 p-3">
              <div className="flex items-center justify-between text-[0.74rem]">
                <span className="font-semibold text-body">Tingkat kehadiran</span>
                <span className="font-mono font-bold text-cyan">{r.sasaran ? Math.round(((r.sasaran - r.belum) / r.sasaran) * 100) : 0}%</span>
              </div>
              <BilahProgres nilai={r.sasaran ? ((r.sasaran - r.belum) / r.sasaran) * 100 : 0} warna="#22D3EE" className="mt-2" />
            </div>
          </section>

          <section className="kartu flex max-h-[520px] flex-col p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[1rem]">Belum mulai</h3>
                <p className="mt-0.5 text-[0.75rem] text-mute">{data.belum.length} peserta sasaran belum masuk.</p>
              </div>
              <Pil warna="#8A93B8" ikon={UserX}>{data.belum.length}</Pil>
            </div>
            {data.belum.length === 0 ? (
              <Kosong ikon={CheckCircle2} judul="Semua peserta sudah masuk" pesan="Tidak ada peserta sasaran yang tertinggal." className="py-8" />
            ) : (
              <ul className="-mr-1 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {data.belum.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-ink-950/40 p-2 transition hover:border-ink-500">
                    <Avatar nama={p.nama} gender={p.gender} ukuran={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8rem] font-semibold text-body">{p.nama}</span>
                      <span className="block font-mono text-[0.66rem] text-mute">{p.nis} · {p.kelas}</span>
                    </span>
                    <Hourglass size={13} className="flex-none text-mute" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kartu p-4">
            <h3 className="text-[1rem]">Panduan pengawas</h3>
            <ul className="mt-3 space-y-2.5">
              {[
                { ikon: Timer, w: '#22D3EE', t: 'Tambah waktu', d: 'Perpanjang sesi peserta yang terkendala perangkat atau jaringan tanpa menghapus jawabannya.' },
                { ikon: Flag, w: '#FF4D6D', t: 'Akhiri sesi', d: 'Kirim jawaban apa adanya lalu hitung nilai. Peserta tidak dapat melanjutkan.' },
                { ikon: TimerReset, w: '#FFB020', t: 'Reset sesi', d: 'Hapus seluruh jawaban sesi dan izinkan peserta masuk kembali dengan token. Tindakan ini permanen.' },
              ].map((x) => {
                const Ikon = x.ikon
                return (
                  <li key={x.t} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${x.w} 16%, transparent)`, color: x.w }}>
                      <Ikon size={13} />
                    </span>
                    <span>
                      <span className="block text-[0.8rem] font-bold text-chalk">{x.t}</span>
                      <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-mute">{x.d}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      <Modal
        terbuka={!!waktuUntuk}
        onTutup={() => setWaktuUntuk(null)}
        judul="Tambah waktu pengerjaan"
        keterangan={waktuUntuk ? `${waktuUntuk.nama} · ${waktuUntuk.kelas} · tersisa ${jamMenitDetik(Math.max(0, Math.round((new Date(waktuUntuk.batas_pada).getTime() - tick) / 1000)))}` : ''}
        ikon={Timer}
        warna="#22D3EE"
        lebar="max-w-md"
        kaki={
          <>
            <Tombol varian="halus" onClick={() => setWaktuUntuk(null)}>Batal</Tombol>
            <Tombol varian="utama" ikon={Timer} memuat={tambahWaktu.isPending} disabled={!Number(menit) || Number(menit) < 1} onClick={() => tambahWaktu.mutate()}>
              Tambah {Number(menit) || 0} menit
            </Tombol>
          </>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 15, 30].map((m) => (
            <button
              key={m}
              onClick={() => { bunyi('pilih'); setMenit(m) }}
              className={`rounded-xl border py-3 font-mono text-[0.95rem] font-bold transition ${
                Number(menit) === m ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line-soft bg-ink-950/50 text-mute hover:border-ink-500 hover:text-chalk'
              }`}
            >
              +{m}
              <span className="mt-0.5 block text-[0.6rem] font-semibold tracking-wide uppercase">menit</span>
            </button>
          ))}
        </div>
        <Field label="Jumlah lain (menit)" className="mt-4" petunjuk="Antara 1 sampai 120 menit. Waktu dihitung dari batas sesi saat ini.">
          <input
            type="number" min="1" max="120" value={menit}
            onChange={(e) => setMenit(e.target.value)}
            className="kolom-field font-mono"
            aria-label="Jumlah menit tambahan"
          />
        </Field>
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-line-soft bg-ink-950/50 p-3 text-[0.76rem] leading-relaxed text-mute">
          <AlertTriangle size={13} className="mt-0.5 flex-none text-amber" />
          Penambahan waktu tidak mengubah jadwal penutupan ujian. Bila waktu tambahan melewati batas ujian, sesi tetap dikirim saat batas ujian tercapai.
        </p>
      </Modal>

      <Konfirmasi
        state={konfirmasi && (konfirmasi.jenis === 'akhiri' ? {
          judul: 'Akhiri sesi peserta?',
          keterangan: `${konfirmasi.p.nama} · ${konfirmasi.p.kelas}`,
          ikon: Flag,
          warna: '#FF4D6D',
          isi: 'Jawaban yang sudah tersimpan akan langsung dikirim dan dinilai. Peserta tidak dapat melanjutkan pengerjaan setelah ini.',
          rincian: `Terjawab ${konfirmasi.p.terjawab} dari ${konfirmasi.p.total_soal} butir · ${konfirmasi.p.ragu} ditandai ragu-ragu · sisa ${jamMenitDetik(Math.max(0, Math.round((new Date(konfirmasi.p.batas_pada).getTime() - tick) / 1000)))}`,
          label: 'Ya, akhiri sesi',
          ikonTombol: Flag,
        } : {
          judul: 'Reset sesi peserta?',
          keterangan: `${konfirmasi.p.nama} · ${konfirmasi.p.kelas}`,
          ikon: TimerReset,
          warna: '#FFB020',
          varian: 'bahaya',
          isi: 'Seluruh jawaban pada sesi ini akan dihapus permanen. Peserta dapat masuk kembali menggunakan token dan mengerjakan dari awal.',
          rincian: `Sesi dimulai ${tanggal(konfirmasi.p.mulai_pada, { jam: true })} · ${konfirmasi.p.terjawab} jawaban akan hilang`,
          label: 'Ya, reset sesi',
          ikonTombol: TimerReset,
        })}
        onTutup={() => setKonfirmasi(null)}
        onLanjut={() => (konfirmasi.jenis === 'akhiri' ? akhiri.mutate(konfirmasi.p.id) : reset.mutate(konfirmasi.p.id))}
        memuat={akhiri.isPending || reset.isPending}
      />
    </div>
  )
}