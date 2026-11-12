import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Send, Volume2, VolumeX, Cloud, CloudUpload, CloudAlert,
  LayoutGrid, HelpCircle, LogOut, AlertTriangle, CheckCircle2, Clock, Keyboard, X, Timer, Eye,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSekolah } from '../../context/SekolahContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import { Tombol, TombolIkon, Pil, Modal, Avatar, BilahProgres, Cincin, Galat, Memuat } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { TIPE, TINGKAT, jamMenitDetik, tanggal, jamSaja } from '../../lib/format'

const HURUF = ['A', 'B', 'C', 'D', 'E', 'F']

function GridNomor({ soal, jawaban, idx, onPilih, className = '' }) {
  return (
    <div className={`grid grid-cols-8 gap-1.5 sm:grid-cols-10 xl:grid-cols-6 ${className}`}>
      {soal.map((s, i) => {
        const j = jawaban[s.id]
        const terisi = !!(j?.isi && String(j.isi).trim())
        const state = j?.ragu ? 'ragu' : terisi ? 'terjawab' : 'kosong'
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPilih(i)}
            data-state={state}
            data-aktif={i === idx}
            aria-label={`Soal nomor ${i + 1}${terisi ? ', sudah dijawab' : ', belum dijawab'}${j?.ragu ? ', ragu-ragu' : ''}`}
            aria-current={i === idx ? 'true' : undefined}
            className="nomor-soal"
          >
            {i + 1}
            {j?.ragu && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber ring-2 ring-[#0b1024]" />}
          </button>
        )
      })}
    </div>
  )
}

export default function RuangUjian() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pengguna } = useAuth()
  const sekolah = useSekolah()
  const toast = useToast()
  const { aktif: suara, toggle: toggleSuara, bunyi } = useSuara()
  const qc = useQueryClient()

  const [idx, setIdx] = useState(0)
  const [jawaban, setJawaban] = useState({})
  const [statusSimpan, setStatusSimpan] = useState('tersimpan')
  const [sisa, setSisa] = useState(null)
  const [fokus, setFokus] = useState(0)
  const [gridTerbuka, setGridTerbuka] = useState(false)
  const [modalKirim, setModalKirim] = useState(false)
  const [modalKeluar, setModalKeluar] = useState(false)
  const [petunjuk, setPetunjuk] = useState(false)

  const jawabanRef = useRef({})
  const kotorRef = useRef(new Set())
  const siapRef = useRef(false)
  const anchorRef = useRef(null)
  const kirimRef = useRef(false)
  const hilangRef = useRef(false)
  const ingatRef = useRef({ lima: false, satu: false })
  const idxRef = useRef(0)
  const areaRef = useRef(null)

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['sesi-ujian', id],
    queryFn: () => api(`/siswa/percobaan/${id}`),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  const soal = data?.soal || []
  const aktif = data?.status === 'berlangsung'
  idxRef.current = idx

  useEffect(() => {
    if (!data || siapRef.current) return
    if (data.status !== 'berlangsung') return
    const peta = {}
    data.jawaban.forEach((j) => { peta[j.soal_id] = { isi: j.isi || '', ragu: !!j.ragu } })
    data.soal.forEach((s) => { if (!peta[s.id]) peta[s.id] = { isi: '', ragu: false } })
    jawabanRef.current = peta
    setJawaban(peta)
    setFokus(data.percobaan.fokus_hilang || 0)
    setSisa(data.percobaan.sisa_detik)
    anchorRef.current = { sisa: data.percobaan.sisa_detik, at: Date.now() }
    siapRef.current = true
    const pertamaKosong = data.soal.findIndex((s) => !(peta[s.id]?.isi || '').trim())
    setIdx(pertamaKosong >= 0 ? pertamaKosong : 0)
    bunyi('buka')
  }, [data])

  useEffect(() => {
    if (data?.status === 'berlangsung' && siapRef.current) {
      anchorRef.current = { sisa: data.percobaan.sisa_detik, at: Date.now() }
      setSisa(data.percobaan.sisa_detik)
    }
  }, [data?.percobaan?.sisa_detik])

  useEffect(() => {
    if (data?.status !== 'selesai' || kirimRef.current) return
    kirimRef.current = true
    if (data.otomatis) toast.ingat('Waktu habis', { pesan: 'Jawaban terakhir dikirim otomatis oleh sistem.' })
    qc.invalidateQueries({ queryKey: ['beranda-siswa'] })
    navigate(`/siswa/hasil/${id}`, { replace: true })
  }, [data?.status])

  const simpan = useMutation({
    mutationFn: async () => {
      const ids = [...kotorRef.current]
      if (!ids.length) return { kosong: true }
      kotorRef.current = new Set()
      const daftar = ids.map((sid) => ({
        soal_id: sid,
        isi: jawabanRef.current[sid]?.isi ?? '',
        ragu: !!jawabanRef.current[sid]?.ragu,
      }))
      try {
        const d = await api(`/siswa/percobaan/${id}/jawaban`, { method: 'PUT', body: { daftar } })
        return { ...d, ids }
      } catch (e) {
        ids.forEach((x) => kotorRef.current.add(x))
        throw e
      }
    },
    onMutate: () => setStatusSimpan('menyimpan'),
    onSuccess: (d) => {
      if (d.kosong) { setStatusSimpan(kotorRef.current.size ? 'belum' : 'tersimpan'); return }
      if (d.status === 'selesai') {
        setStatusSimpan('tersimpan')
        if (!kirimRef.current) {
          kirimRef.current = true
          toast.ingat('Waktu habis', { pesan: d.pesan || 'Jawaban dikirim otomatis oleh sistem.' })
          navigate(`/siswa/hasil/${id}`, { replace: true })
        }
        return
      }
      setStatusSimpan(kotorRef.current.size ? 'belum' : 'tersimpan')
      if (typeof d.sisa_detik === 'number') anchorRef.current = { sisa: d.sisa_detik, at: Date.now() }
    },
    onError: () => setStatusSimpan('gagal'),
  })

  const kirim = useMutation({
    mutationFn: async () => {
      if (kotorRef.current.size) await simpan.mutateAsync().catch(() => {})
      return api(`/siswa/percobaan/${id}/kirim`, { method: 'POST' })
    },
    onSuccess: (d) => {
      kirimRef.current = true
      bunyi('selesai')
      setModalKirim(false)
      qc.invalidateQueries({ queryKey: ['beranda-siswa'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      qc.invalidateQueries({ queryKey: ['hasil'] })
      toast.sukses('Jawaban berhasil dikirim', { pesan: d.perlu_penilaian ? 'Soal uraian menunggu penilaian guru. Nilai sementara sudah dapat dilihat.' : `Nilai akhir kamu ${d.nilai}.` })
      navigate(`/siswa/hasil/${id}`, { replace: true })
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Jawaban belum terkirim', { pesan: pesanGalat(e) }) },
  })

  const jawab = useCallback((soalId, perubahan) => {
    const sebelumnya = jawabanRef.current[soalId] || { isi: '', ragu: false }
    const baru = { ...sebelumnya, ...perubahan }
    jawabanRef.current = { ...jawabanRef.current, [soalId]: baru }
    setJawaban(jawabanRef.current)
    kotorRef.current.add(soalId)
    setStatusSimpan('belum')
  }, [])

  useEffect(() => {
    if (!aktif) return
    const t = setTimeout(() => { if (kotorRef.current.size && !simpan.isPending) simpan.mutate() }, 800)
    return () => clearTimeout(t)
  }, [jawaban, aktif])

  useEffect(() => {
    if (!aktif) return
    const t = setInterval(() => { if (kotorRef.current.size && !simpan.isPending) simpan.mutate() }, 10000)
    return () => clearInterval(t)
  }, [aktif, id])

  useEffect(() => {
    if (!aktif) return
    const t = setInterval(() => {
      const a = anchorRef.current
      if (!a) return
      const detik = Math.max(0, a.sisa - Math.round((Date.now() - a.at) / 1000))
      setSisa(detik)
      if (detik <= 300 && !ingatRef.current.lima) {
        ingatRef.current.lima = true
        bunyi('peringatan')
        toast.ingat('Sisa waktu 5 menit', { pesan: 'Periksa kembali jawaban yang ditandai ragu-ragu.' })
      }
      if (detik <= 60 && !ingatRef.current.satu) {
        ingatRef.current.satu = true
        bunyi('bahaya')
        toast.gagal('Sisa waktu kurang dari 1 menit', { pesan: 'Jawaban akan dikirim otomatis saat waktu habis.' })
      }
      if (detik <= 0 && !kirimRef.current) {
        kirimRef.current = true
        kirim.mutate()
      }
    }, 1000)
    return () => clearInterval(t)
  }, [aktif, id])

  useEffect(() => {
    if (!aktif) return
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (kirimRef.current) return
        hilangRef.current = true
        if (kotorRef.current.size) simpan.mutate()
        api(`/siswa/percobaan/${id}/fokus`, { method: 'POST' })
          .then((d) => setFokus(d.fokus_hilang))
          .catch(() => {})
      } else if (hilangRef.current) {
        hilangRef.current = false
        bunyi('peringatan')
        toast.ingat('Kamu meninggalkan halaman ujian', { pesan: 'Aktivitas ini tercatat dan dapat dilihat pengawas.' })
        refetch()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [aktif, id])

  useEffect(() => {
    const h = (e) => {
      if (!kirimRef.current && siapRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  const pindah = useCallback((ke) => {
    if (!soal.length) return
    const tujuan = Math.max(0, Math.min(soal.length - 1, ke))
    setIdx(tujuan)
    setGridTerbuka(false)
    bunyi('klik')
    areaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [soal.length])

  useEffect(() => {
    if (!aktif) return
    const onKey = (e) => {
      if (modalKirim || modalKeluar || petunjuk) return
      const tag = document.activeElement?.tagName
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && document.activeElement.type !== 'radio')) return
      const s = soal[idxRef.current]
      if (!s) return
      if (e.key === 'ArrowRight') { e.preventDefault(); pindah(idxRef.current + 1); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); pindah(idxRef.current - 1); return }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); bunyi('pilih'); jawab(s.id, { ragu: !jawabanRef.current[s.id]?.ragu }); return }
      if (e.key === 'Escape') { setGridTerbuka(false); return }
      if (s.opsi?.length) {
        const huruf = e.key.toUpperCase()
        let i = HURUF.indexOf(huruf)
        if (i < 0 && /^[1-9]$/.test(e.key)) i = Number(e.key) - 1
        if (i >= 0 && i < s.opsi.length) { e.preventDefault(); bunyi('pilih'); jawab(s.id, { isi: s.opsi[i].id }) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aktif, soal, modalKirim, modalKeluar, petunjuk, pindah, jawab])

  const terjawab = useMemo(() => soal.filter((s) => (jawaban[s.id]?.isi || '').trim()).length, [soal, jawaban])
  const ragu = useMemo(() => soal.filter((s) => jawaban[s.id]?.ragu).length, [soal, jawaban])
  const kosong = soal.length - terjawab
  const progres = soal.length ? Math.round((terjawab / soal.length) * 100) : 0
  const belumDijawab = soal.map((s, i) => ({ s, i })).filter((x) => !(jawaban[x.s.id]?.isi || '').trim())

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-6">
        <div className="text-center">
          <div className="anim-apung mx-auto w-fit"><Logo ukuran={54} /></div>
          <p className="mt-5 font-mono text-[0.74rem] tracking-[0.22em] text-mute uppercase">Menyiapkan lembar soal</p>
          <div className="mx-auto mt-3 h-1 w-44 overflow-hidden rounded-full bg-ink-800"><div className="rangka h-full w-full" /></div>
        </div>
      </div>
    )
  }

  if (error) {
    const direset = error.status === 404
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-6">
        <div className="w-full max-w-md">
          <Galat
            pesan={direset ? 'Sesi ujian ini sudah direset oleh pengawas. Jawaban pada sesi tersebut tidak lagi tersedia.' : pesanGalat(error)}
            onUlang={direset ? undefined : refetch}
          />
          <Link to="/siswa" className="mt-4 block">
            <Tombol varian="utama" className="w-full" ikon={ChevronLeft}>Kembali ke beranda peserta</Tombol>
          </Link>
        </div>
      </div>
    )
  }

  if (!aktif || !soal.length) return <div className="grid min-h-screen place-items-center bg-ink-950"><Memuat pesan="Mengalihkan ke halaman hasil…" /></div>

  const s = soal[idx]
  const j = jawaban[s.id] || { isi: '', ragu: false }
  const warnaWaktu = sisa === null ? '#22D3EE' : sisa <= 60 ? '#FF4D6D' : sisa <= 300 ? '#FFB020' : '#A3E635'
  const totalDetik = Math.max(1, data.ujian.durasi_menit * 60)
  const IkonSimpan = statusSimpan === 'menyimpan' ? CloudUpload : statusSimpan === 'gagal' ? CloudAlert : statusSimpan === 'belum' ? Cloud : CheckCircle2
  const teksSimpan = { tersimpan: 'Semua jawaban tersimpan', menyimpan: 'Menyimpan…', belum: 'Perubahan belum tersimpan', gagal: 'Gagal menyimpan — coba lagi' }[statusSimpan]
  const warnaSimpan = { tersimpan: '#A3E635', menyimpan: '#22D3EE', belum: '#FFB020', gagal: '#FF4D6D' }[statusSimpan]

  return (
    <div className="min-h-screen bg-ink-950 pb-24 xl:pb-0">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 size-[560px] rounded-full bg-violet/10 blur-[130px]" />
        <div className="absolute right-0 bottom-0 size-[480px] rounded-full bg-cyan/8 blur-[130px]" />
        <div className="teksturnoda absolute inset-0 opacity-[0.035] mix-blend-overlay" />
      </div>

      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-900/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-3 py-2.5 sm:px-5">
          <span className="hidden sm:block"><Logo ukuran={32} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9rem] leading-tight font-extrabold text-chalk sm:text-[1rem]">{data.ujian.judul}</p>
            <p className="mt-0.5 flex items-center gap-2 truncate text-[0.68rem] text-mute">
              <span className="font-bold" style={{ color: data.ujian.mapel_warna }}>{data.ujian.mapel_nama}</span>
              <span className="text-line">·</span>
              <span className="truncate">{pengguna.nama} · {pengguna.kelas}</span>
            </p>
          </div>

          <span className="flex items-center gap-2 rounded-xl border px-3 py-1.5" style={{ borderColor: `color-mix(in oklab, ${warnaWaktu} 45%, transparent)`, background: `color-mix(in oklab, ${warnaWaktu} 12%, transparent)` }}>
            <Timer size={15} style={{ color: warnaWaktu }} className={sisa !== null && sisa <= 60 ? 'anim-bahaya rounded-full' : ''} />
            <span className="text-left">
              <span className={`block font-mono text-[1.15rem] leading-none font-bold ${sisa !== null && sisa <= 60 ? 'anim-bahaya' : ''}`} style={{ color: warnaWaktu }}>
                {sisa === null ? '--:--' : jamMenitDetik(sisa)}
              </span>
              <span className="mt-0.5 block text-[0.55rem] font-bold tracking-[0.16em] text-mute uppercase">sisa waktu</span>
            </span>
          </span>

          <span className="hidden items-center gap-1.5 rounded-xl border border-line-soft bg-ink-950/50 px-2.5 py-2 md:flex" title={teksSimpan}>
            <IkonSimpan size={14} style={{ color: warnaSimpan }} className={statusSimpan === 'menyimpan' ? 'anim-putar' : ''} />
            <span className="text-[0.7rem] font-semibold" style={{ color: warnaSimpan }}>{teksSimpan}</span>
            {statusSimpan === 'gagal' && (
              <button onClick={() => simpan.mutate()} className="ml-1 rounded-md border border-rose/50 px-1.5 py-0.5 text-[0.66rem] font-bold text-rose">Ulangi</button>
            )}
          </span>

          <TombolIkon ikon={suara ? Volume2 : VolumeX} label={suara ? 'Suara aktif — klik untuk membisukan' : 'Suara dibisukan — klik untuk mengaktifkan'} aktif={suara} onClick={toggleSuara} />
          <span className="hidden sm:block"><TombolIkon ikon={Keyboard} label="Petunjuk pengerjaan" onClick={() => { bunyi('buka'); setPetunjuk(true) }} /></span>
          <span className="hidden sm:block"><TombolIkon ikon={LogOut} label="Keluar sementara" onClick={() => { bunyi('peringatan'); setModalKeluar(true) }} /></span>
          <span className="hidden sm:block"><Tombol varian="utama" ikon={Send} onClick={() => { bunyi('buka'); setModalKirim(true) }}>Kirim jawaban</Tombol></span>
          <TombolIkon ikon={Send} label="Kirim jawaban" onClick={() => { bunyi('buka'); setModalKirim(true) }} className="sm:hidden" />
        </div>
        <div className="h-[3px] w-full bg-ink-800">
          <div className="h-full transition-all duration-700" style={{ width: `${progres}%`, background: 'linear-gradient(90deg,#7C5CFF,#22D3EE,#A3E635)' }} />
        </div>
      </header>

      {fokus > 0 && (
        <div className="relative z-10 mx-auto mt-3 max-w-[1500px] px-3 sm:px-5">
          <p className="flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-[0.76rem] font-semibold text-amber">
            <Eye size={14} className="flex-none" />
            Tercatat {fokus} kali meninggalkan halaman ujian. Pengawas dapat melihat aktivitas ini.
          </p>
        </div>
      )}

      <main className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_326px]">
        <div ref={areaRef} className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-center gap-2 xl:hidden">
            <Pil warna="#A3E635" ikon={CheckCircle2}>{terjawab} terjawab</Pil>
            <Pil warna="#FFB020" ikon={HelpCircle}>{ragu} ragu</Pil>
            <Pil warna="#8A93B8">{kosong} kosong</Pil>
            <button onClick={() => { bunyi('buka'); setGridTerbuka(true) }} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-line bg-ink-800 px-3 py-1.5 text-[0.76rem] font-bold text-chalk">
              <LayoutGrid size={13} /> Nomor soal
            </button>
          </div>

          <article className="kertas relative overflow-hidden rounded-3xl border border-paper-line shadow-lift">
            <span className="pointer-events-none absolute inset-y-0 left-6 w-px bg-rose/30 sm:left-10" />
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#7C5CFF,#22D3EE,#A3E635,#FFB020)] opacity-80" />

            <div className="relative border-b border-paper-line px-5 pt-5 pb-4 pl-9 sm:px-8 sm:pl-14">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.22em] text-paper-ink/55 uppercase">{sekolah.nama_sekolah} · Tahun ajaran {sekolah.tahun_ajaran}</p>
                  <p className="mt-1 font-display text-[1.35rem] leading-tight text-paper-ink sm:text-[1.6rem]">{data.ujian.judul}</p>
                  <p className="mt-1 text-[0.74rem] text-paper-ink/65">
                    {pengguna.nama} · {pengguna.kelas} · NIS {pengguna.nis} · mulai {jamSaja(data.percobaan.mulai_pada)}
                  </p>
                </div>
                <div className="flex flex-none flex-col items-center rounded-xl border-2 border-paper-ink/25 px-3 py-2">
                  <span className="font-mono text-[0.58rem] font-bold tracking-[0.18em] text-paper-ink/55 uppercase">Nomor</span>
                  <span className="font-display text-[2rem] leading-none text-paper-ink">{idx + 1}</span>
                  <span className="font-mono text-[0.62rem] text-paper-ink/55">dari {soal.length}</span>
                </div>
              </div>
            </div>

            <div className="relative px-5 py-5 pl-9 sm:px-8 sm:py-7 sm:pl-14">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold" style={{ background: `color-mix(in oklab, ${TIPE[s.tipe].warna} 20%, transparent)`, color: `color-mix(in oklab, ${TIPE[s.tipe].warna} 72%, #171d33)`, border: `1px solid color-mix(in oklab, ${TIPE[s.tipe].warna} 45%, transparent)` }}>
                  {TIPE[s.tipe].label}
                </span>
                <span className="rounded-full border border-paper-ink/20 px-2.5 py-0.5 text-[0.68rem] font-bold text-paper-ink/70">{TINGKAT[s.tingkat].label}</span>
                {s.topik && <span className="text-[0.7rem] font-semibold text-paper-ink/55">{s.topik}</span>}
                <span className="ml-auto font-mono text-[0.68rem] font-bold text-paper-ink/55">bobot {Number(s.bobot)}</span>
              </div>

              <p className="mt-4 text-[1.05rem] leading-[1.75] font-medium whitespace-pre-wrap text-paper-ink sm:text-[1.15rem]">{s.pertanyaan}</p>

              {s.tipe === 'pilihan_ganda' || s.tipe === 'benar_salah' ? (
                <div className="mt-5 space-y-2.5" role="radiogroup" aria-label={`Pilihan jawaban soal nomor ${idx + 1}`}>
                  {s.opsi.map((o, i) => {
                    const dipilih = j.isi === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={dipilih}
                        data-aktif={dipilih}
                        onClick={() => { bunyi('pilih'); jawab(s.id, { isi: o.id }) }}
                        className="pil-opsi"
                      >
                        <span className="gelembung">{s.tipe === 'benar_salah' ? (o.id === 'benar' ? 'B' : 'S') : HURUF[i]}</span>
                        <span className="flex-1 pt-1 text-[0.94rem] leading-relaxed text-paper-ink">{o.teks}</span>
                        {dipilih && <CheckCircle2 size={18} className="mt-1.5 flex-none text-violet" />}
                      </button>
                    )
                  })}
                  {j.isi && (
                    <button
                      type="button"
                      onClick={() => { bunyi('klik'); jawab(s.id, { isi: '' }) }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line bg-white/50 px-2.5 py-1 text-[0.74rem] font-bold text-paper-ink/65 transition hover:border-rose hover:text-rose"
                    >
                      <X size={12} /> Kosongkan jawaban
                    </button>
                  )}
                </div>
              ) : s.tipe === 'isian' ? (
                <div className="mt-5">
                  <label className="block font-mono text-[0.66rem] font-bold tracking-[0.16em] text-paper-ink/55 uppercase" htmlFor="isian-jawaban">Jawaban singkat</label>
                  <input
                    id="isian-jawaban"
                    value={j.isi}
                    onChange={(e) => jawab(s.id, { isi: e.target.value })}
                    placeholder="Tuliskan jawaban singkat kamu…"
                    maxLength={500}
                    autoComplete="off"
                    className="mt-2 w-full rounded-xl border-2 border-paper-line bg-white/75 px-4 py-3 text-[1rem] text-paper-ink transition outline-none placeholder:text-paper-ink/35 focus:border-violet focus:bg-white focus:shadow-[0_0_0_4px_rgba(124,92,255,0.15)]"
                  />
                  <p className="mt-2 text-[0.72rem] text-paper-ink/55">Jawaban dinilai otomatis. Tulis tanpa satuan kecuali diminta, dan gunakan ejaan yang tepat.</p>
                </div>
              ) : (
                <div className="mt-5">
                  <label className="block font-mono text-[0.66rem] font-bold tracking-[0.16em] text-paper-ink/55 uppercase" htmlFor="esai-jawaban">Uraian jawaban</label>
                  <textarea
                    id="esai-jawaban"
                    value={j.isi}
                    onChange={(e) => jawab(s.id, { isi: e.target.value })}
                    rows={9}
                    maxLength={8000}
                    placeholder="Uraikan jawabanmu secara runtut: diketahui, ditanya, langkah penyelesaian, lalu kesimpulan…"
                    className="mt-2 w-full resize-y rounded-xl border-2 border-paper-line bg-white/75 px-4 py-3 text-[0.98rem] leading-[1.9] text-paper-ink transition outline-none placeholder:text-paper-ink/35 focus:border-violet focus:bg-white focus:shadow-[0_0_0_4px_rgba(124,92,255,0.15)]"
                    style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 30px, rgba(196,182,152,0.35) 30px 31px)', backgroundAttachment: 'local' }}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.72rem] text-paper-ink/55">Butir ini dinilai manual oleh guru. Jawaban lengkap dan runtut berpeluang memperoleh poin penuh.</p>
                    <span className="font-mono text-[0.72rem] font-bold text-paper-ink/60">{j.isi.length}/8000</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-paper-line pt-4">
                <button
                  type="button"
                  onClick={() => { bunyi('pilih'); jawab(s.id, { ragu: !j.ragu }) }}
                  aria-pressed={j.ragu}
                  className="inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-[0.82rem] font-bold transition active:scale-95"
                  style={{
                    borderColor: j.ragu ? '#FFB020' : '#ddd3ba',
                    background: j.ragu ? 'rgba(255,176,32,0.18)' : 'rgba(255,255,255,0.6)',
                    color: j.ragu ? '#8a5a00' : '#171d33',
                  }}
                >
                  <HelpCircle size={15} /> {j.ragu ? 'Ditandai ragu-ragu' : 'Tandai ragu-ragu'}
                  <span className="rounded border border-paper-ink/25 px-1 font-mono text-[0.62rem] opacity-60">R</span>
                </button>
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pindah(idx - 1)}
                    disabled={idx === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-paper-line bg-white/60 px-3.5 py-2 text-[0.82rem] font-bold text-paper-ink transition hover:border-violet disabled:opacity-35"
                  >
                    <ChevronLeft size={15} /> Sebelumnya
                  </button>
                  {idx === soal.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => { bunyi('buka'); setModalKirim(true) }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] px-4 py-2 text-[0.82rem] font-bold text-white shadow-[0_10px_26px_-12px_rgba(124,92,255,0.9)] transition hover:brightness-110 active:scale-95"
                    >
                      <Send size={15} /> Selesai & kirim
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pindah(idx + 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] px-4 py-2 text-[0.82rem] font-bold text-white shadow-[0_10px_26px_-12px_rgba(124,92,255,0.9)] transition hover:brightness-110 active:scale-95"
                    >
                      Berikutnya <ChevronRight size={15} />
                    </button>
                  )}
                </span>
              </div>
            </div>
          </article>

          <p className="mt-3 flex items-center justify-center gap-2 text-[0.72rem] text-mute">
            <IkonSimpan size={13} style={{ color: warnaSimpan }} />
            {teksSimpan} · jawaban dikirim otomatis ke server setiap kali kamu mengubah pilihan.
          </p>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-[92px] space-y-3">
            <section className="kartu p-4">
              <div className="flex items-center gap-3">
                <Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={40} />
                <div className="min-w-0">
                  <p className="truncate text-[0.86rem] font-bold text-chalk">{pengguna.nama}</p>
                  <p className="font-mono text-[0.68rem] text-mute">{pengguna.nis} · {pengguna.kelas}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-line-soft bg-ink-950/50 p-3">
                <Cincin nilai={progres} ukuran={58} tebal={6} warna={progres === 100 ? '#A3E635' : '#7C5CFF'}>
                  <span className="font-mono text-[0.82rem] font-bold text-chalk">{progres}%</span>
                </Cincin>
                <div className="flex-1 space-y-1.5">
                  <p className="flex items-center justify-between text-[0.72rem]"><span className="text-mute">Terjawab</span><span className="font-mono font-bold text-lime">{terjawab}/{soal.length}</span></p>
                  <p className="flex items-center justify-between text-[0.72rem]"><span className="text-mute">Ragu-ragu</span><span className="font-mono font-bold text-amber">{ragu}</span></p>
                  <p className="flex items-center justify-between text-[0.72rem]"><span className="text-mute">Belum dijawab</span><span className="font-mono font-bold text-chalk">{kosong}</span></p>
                </div>
              </div>
              <BilahProgres nilai={sisa === null ? 0 : (sisa / totalDetik) * 100} warna={warnaWaktu} tinggi={5} className="mt-3" />
              <p className="mt-1.5 flex items-center justify-between font-mono text-[0.66rem] text-mute">
                <span className="flex items-center gap-1"><Clock size={10} /> {data.ujian.durasi_menit} menit</span>
                <span>batas {jamSaja(data.percobaan.batas_pada)}</span>
              </p>
            </section>

            <section className="kartu p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[0.95rem]">Navigasi soal</h3>
                <Pil warna="#8A93B8">{soal.length} butir</Pil>
              </div>
              <div className="max-h-[340px] overflow-y-auto pr-1">
                <GridNomor soal={soal} jawaban={jawaban} idx={idx} onPilih={pindah} />
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
                {[
                  { w: 'linear-gradient(150deg,rgba(163,230,53,0.35),rgba(52,211,153,0.2))', b: 'rgba(163,230,53,0.6)', l: 'Sudah dijawab' },
                  { w: 'linear-gradient(150deg,rgba(255,176,32,0.4),rgba(255,77,109,0.16))', b: 'rgba(255,176,32,0.65)', l: 'Ditandai ragu-ragu' },
                  { w: 'rgba(5,7,15,0.45)', b: '#26315e', l: 'Belum dijawab' },
                ].map((x) => (
                  <li key={x.l} className="flex items-center gap-2 text-[0.72rem] text-mute">
                    <span className="size-4 flex-none rounded-md border" style={{ background: x.w, borderColor: x.b }} /> {x.l}
                  </li>
                ))}
              </ul>
            </section>

            <Tombol varian="utama" ikon={Send} className="w-full" onClick={() => { bunyi('buka'); setModalKirim(true) }}>
              Kirim jawaban sekarang
            </Tombol>
            <div className="flex gap-2">
              <Tombol varian="kedua" ikon={Keyboard} className="flex-1" onClick={() => { bunyi('buka'); setPetunjuk(true) }}>Petunjuk</Tombol>
              <Tombol varian="kedua" ikon={LogOut} className="flex-1" onClick={() => { bunyi('peringatan'); setModalKeluar(true) }}>Keluar</Tombol>
            </div>
          </div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-900/95 px-3 py-2.5 backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2">
          <TombolIkon ikon={ChevronLeft} label="Soal sebelumnya" onClick={() => pindah(idx - 1)} disabled={idx === 0} />
          <button onClick={() => { bunyi('buka'); setGridTerbuka(true) }} className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-ink-800 px-3 py-2">
            <LayoutGrid size={14} className="text-cyan" />
            <span className="font-mono text-[0.82rem] font-bold text-chalk">{idx + 1}/{soal.length}</span>
            <span className="truncate text-[0.7rem] text-mute">{terjawab} terjawab</span>
          </button>
          {idx === soal.length - 1
            ? <TombolIkon ikon={Send} label="Kirim jawaban" onClick={() => { bunyi('buka'); setModalKirim(true) }} className="border-violet/60 bg-violet/20 text-violet" />
            : <TombolIkon ikon={ChevronRight} label="Soal berikutnya" onClick={() => pindah(idx + 1)} />}
        </div>
      </div>

      <Modal terbuka={gridTerbuka} onTutup={() => setGridTerbuka(false)} judul="Navigasi soal" keterangan={`${terjawab} terjawab · ${ragu} ragu-ragu · ${kosong} belum dijawab`} ikon={LayoutGrid} warna="#22D3EE" lebar="max-w-lg">
        <GridNomor soal={soal} jawaban={jawaban} idx={idx} onPilih={pindah} className="grid-cols-8 sm:grid-cols-10" />
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line-soft pt-3">
          <Pil warna="#A3E635">Sudah dijawab</Pil>
          <Pil warna="#FFB020">Ragu-ragu</Pil>
          <Pil warna="#8A93B8">Belum dijawab</Pil>
        </div>
      </Modal>

      <Modal
        terbuka={petunjuk}
        onTutup={() => setPetunjuk(false)}
        judul="Petunjuk pengerjaan"
        keterangan="Baca sebelum melanjutkan agar tidak kehilangan waktu."
        ikon={Keyboard}
        warna="#7C5CFF"
        lebar="max-w-lg"
        kaki={<Tombol varian="utama" onClick={() => setPetunjuk(false)}>Saya mengerti</Tombol>}
      >
        <ul className="space-y-2.5">
          {[
            { w: '#A3E635', t: 'Jawaban tersimpan otomatis', d: 'Setiap perubahan langsung dikirim ke server. Tidak ada tombol simpan yang perlu ditekan.' },
            { w: '#22D3EE', t: 'Pindah soal bebas', d: 'Gunakan panel nomor soal, tombol sebelumnya/berikutnya, atau tombol panah kiri dan kanan pada papan ketik.' },
            { w: '#FFB020', t: 'Tandai ragu-ragu', d: 'Tekan tombol R atau tombol "Tandai ragu-ragu" untuk menandai butir yang ingin ditinjau ulang.' },
            { w: '#7C5CFF', t: 'Pilih cepat dengan papan ketik', d: `Tekan huruf ${HURUF.slice(0, Math.max(2, ...soal.map((x) => x.opsi?.length || 0))).join(', ')} atau angka 1–9 untuk memilih opsi pada soal pilihan ganda.` },
            { w: '#FF4D6D', t: 'Waktu terus berjalan', d: 'Menutup halaman tidak menghentikan hitungan mundur. Jawaban terkirim otomatis saat waktu habis.' },
            { w: '#F472B6', t: 'Tetap di halaman ini', d: 'Berpindah tab atau menyembunyikan jendela tercatat dan terlihat oleh pengawas ujian.' },
          ].map((x) => (
            <li key={x.t} className="flex gap-2.5 rounded-xl border border-line-soft bg-ink-950/40 p-3">
              <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: x.w, boxShadow: `0 0 8px ${x.w}88` }} />
              <span>
                <span className="block text-[0.84rem] font-bold text-chalk">{x.t}</span>
                <span className="mt-0.5 block text-[0.76rem] leading-relaxed text-mute">{x.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        terbuka={modalKeluar}
        onTutup={() => setModalKeluar(false)}
        judul="Keluar sementara dari ruang ujian?"
        keterangan="Waktu pengerjaan tetap berjalan di server."
        ikon={LogOut}
        warna="#FFB020"
        lebar="max-w-md"
        kaki={
          <>
            <Tombol varian="halus" onClick={() => setModalKeluar(false)}>Tetap di sini</Tombol>
            <Tombol
              varian="bahaya"
              ikon={LogOut}
              memuat={simpan.isPending}
              onClick={async () => {
                if (kotorRef.current.size) await simpan.mutateAsync().catch(() => {})
                bunyi('klik')
                setModalKeluar(false)
                navigate('/siswa')
              }}
            >
              Simpan & keluar
            </Tombol>
          </>
        }
      >
        <p className="text-[0.86rem] leading-relaxed text-body">
          Jawaban yang sudah terisi akan disimpan dan sesi tetap terbuka. Kamu dapat melanjutkan dari beranda peserta selama waktu belum habis.
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber/40 bg-amber/10 p-3">
          <Timer size={18} className="flex-none text-amber" />
          <span>
            <span className="block font-mono text-[1.1rem] font-bold text-amber">{sisa === null ? '--:--' : jamMenitDetik(sisa)}</span>
            <span className="block text-[0.72rem] text-mute">Sisa waktu terus berkurang meskipun kamu keluar.</span>
          </span>
        </div>
      </Modal>

      <Modal
        terbuka={modalKirim}
        onTutup={() => setModalKirim(false)}
        judul="Kirim seluruh jawaban?"
        keterangan={`${data.ujian.judul} · ${tanggal(data.percobaan.mulai_pada, { jam: true })}`}
        ikon={Send}
        warna={kosong > 0 ? '#FFB020' : '#A3E635'}
        lebar="max-w-lg"
        kaki={
          <>
            <Tombol varian="halus" onClick={() => setModalKirim(false)}>Periksa lagi</Tombol>
            <Tombol varian={kosong > 0 ? 'bahaya' : 'sukses'} ikon={Send} memuat={kirim.isPending} onClick={() => kirim.mutate()}>
              Ya, kirim sekarang
            </Tombol>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Terjawab', n: terjawab, w: '#A3E635' },
            { l: 'Ragu-ragu', n: ragu, w: '#FFB020' },
            { l: 'Belum dijawab', n: kosong, w: kosong > 0 ? '#FF4D6D' : '#8A93B8' },
          ].map((x) => (
            <div key={x.l} className="rounded-xl border border-line-soft bg-ink-950/50 p-3 text-center">
              <p className="font-mono text-[1.5rem] leading-none font-bold" style={{ color: x.w }}>{x.n}</p>
              <p className="mt-1.5 text-[0.64rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
            </div>
          ))}
        </div>

        {belumDijawab.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose/35 bg-rose/8 p-3">
            <p className="flex items-center gap-2 text-[0.8rem] font-bold text-chalk">
              <AlertTriangle size={14} className="text-rose" /> {belumDijawab.length} butir belum dijawab
            </p>
            <p className="mt-1 text-[0.74rem] text-mute">Klik nomor untuk langsung menuju butir tersebut. Butir kosong dihitung salah.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {belumDijawab.map((x) => (
                <button
                  key={x.s.id}
                  onClick={() => { setModalKirim(false); pindah(x.i) }}
                  className="grid size-8 place-items-center rounded-lg border border-rose/45 bg-rose/12 font-mono text-[0.76rem] font-bold text-rose transition hover:bg-rose/25"
                >
                  {x.i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {ragu > 0 && (
          <div className="mt-3 rounded-xl border border-amber/35 bg-amber/8 p-3">
            <p className="flex items-center gap-2 text-[0.8rem] font-bold text-chalk"><HelpCircle size={14} className="text-amber" /> {ragu} butir masih ditandai ragu-ragu</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {soal.map((x, i) => (jawaban[x.id]?.ragu ? (
                <button key={x.id} onClick={() => { setModalKirim(false); pindah(i) }} className="grid size-8 place-items-center rounded-lg border border-amber/45 bg-amber/12 font-mono text-[0.76rem] font-bold text-amber transition hover:bg-amber/25">
                  {i + 1}
                </button>
              ) : null))}
            </div>
          </div>
        )}

        <p className="mt-4 text-[0.78rem] leading-relaxed text-mute">
          Setelah dikirim, jawaban tidak dapat diubah. Nilai langsung dihitung untuk soal pilihan ganda, benar/salah, dan isian.
          Soal uraian menunggu penilaian guru sehingga nilai akhir dapat berubah.
        </p>
      </Modal>
    </div>
  )
}