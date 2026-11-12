import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, LogIn, ArrowRight, AlertCircle, Timer, Radio, LibraryBig } from 'lucide-react'
import { api, pesanGalat } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSekolah } from '../context/SekolahContext'
import { useToast } from '../context/ToastContext'
import { useSuara } from '../context/SoundContext'
import { Tombol, Pil } from '../components/ui'
import { Logo, NamaBrand } from '../components/Logo'
import { namaPanggilan } from '../lib/format'

// Arahkan seusai peran: guru ke Bank Soal, admin ke Ringkasan, peserta ke beranda.
const berandaPeran = (peran) => (peran === 'siswa' ? '/siswa' : peran === 'guru' ? '/admin/bank-soal' : '/admin')

const FITUR = [
  { ikon: LibraryBig, judul: 'Bank soal terstruktur', pesan: 'Pilihan ganda, benar/salah, isian, dan uraian dengan bobot serta pembahasan.', warna: '#7C5CFF' },
  { ikon: Timer, judul: 'Timer & autosave', pesan: 'Sesi tahan muat ulang, jawaban tersimpan otomatis, waktu habis dikirim sendiri.', warna: '#22D3EE' },
  { ikon: Radio, judul: 'Pengawasan langsung', pesan: 'Pantau progres tiap peserta, tambah waktu, atau akhiri sesi dari satu layar.', warna: '#FFB020' },
]

function LembarJawaban() {
  const baris = [
    [1, 0, 2, 0], [0, 2, 0, 1], [2, 0, 1, 0], [0, 1, 0, 2], [1, 0, 0, 2],
  ]
  return (
    <div className="kertas relative w-[248px] rotate-[-7deg] rounded-2xl border border-paper-line p-4 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.85)]">
      <div className="mb-3 flex items-center justify-between border-b border-paper-line pb-2">
        <span className="font-mono text-[0.58rem] font-bold tracking-widest text-paper-ink/70 uppercase">Lembar Jawaban</span>
        <span className="font-mono text-[0.58rem] text-paper-ink/50">No. 26001</span>
      </div>
      <div className="space-y-2">
        {baris.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 font-mono text-[0.6rem] font-bold text-paper-ink/60">{i + 1}</span>
            {b.map((isi, j) => (
              <span
                key={j}
                className="grid size-5 place-items-center rounded-full border-2 font-mono text-[0.5rem] font-bold transition-all"
                style={{
                  borderColor: isi ? '#7C5CFF' : 'rgba(23,29,51,0.28)',
                  background: isi === 1 ? '#7C5CFF' : isi === 2 ? 'rgba(124,92,255,0.22)' : 'transparent',
                  color: isi === 1 ? '#fff' : 'rgba(23,29,51,0.5)',
                  animation: isi ? `apung ${5 + j}s ease-in-out ${i * 0.3}s infinite` : undefined,
                }}
              >
                {['A', 'B', 'C', 'D'][j]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-paper-line pt-2">
        <span className="font-mono text-[0.55rem] text-paper-ink/55">NILAI</span>
        <span className="font-display text-[1.5rem] leading-none text-paper-ink">86,5</span>
      </div>
    </div>
  )
}

export default function Login() {
  const { masuk, pengguna } = useAuth()
  const sekolah = useSekolah()
  const toast = useToast()
  const { bunyi } = useSuara()
  const navigate = useNavigate()
  const [identitas, setIdentitas] = useState('')
  const [sandi, setSandi] = useState('')
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  const { data: info } = useQuery({ queryKey: ['info-masuk'], queryFn: () => api('/auth/info'), staleTime: 60000 })

  useEffect(() => {
    if (pengguna) navigate(berandaPeran(pengguna.peran), { replace: true })
  }, [pengguna, navigate])

  const kirim = async (e) => {
    e?.preventDefault()
    setGalat('')
    setSibuk(true)
    try {
      const p = await masuk(identitas, sandi)
      bunyi('selesai')
      toast.sukses(`Selamat datang, ${namaPanggilan(p.nama)}`, { pesan: p.peran === 'siswa' ? 'Periksa jadwal ujian yang tersedia hari ini.' : 'Panel kerja siap digunakan.' })
      navigate(berandaPeran(p.peran), { replace: true })
    } catch (err) {
      bunyi('gagal')
      setGalat(pesanGalat(err))
    } finally {
      setSibuk(false)
    }
  }

  const stat = info?.statistik

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="aurora opacity-70" />
      <div className="teksturnoda pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="relative flex flex-col justify-between px-6 py-8 sm:px-10 lg:py-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo ukuran={44} />
              <div>
                <NamaBrand />
                <p className="mt-1 text-[0.7rem] font-semibold tracking-wide text-mute">{sekolah.nama_sekolah}</p>
              </div>
            </div>
            <span className="hidden sm:block">
              <Pil warna="#A3E635">
                <span className="size-1.5 animate-pulse rounded-full bg-lime" /> Server ujian aktif
              </Pil>
            </span>
          </div>

          <div className="relative py-10 lg:py-0">
            <p className="anim-naik mb-4 font-mono text-[0.7rem] font-bold tracking-[0.28em] text-cyan uppercase">
              Tahun ajaran {sekolah.tahun_ajaran} · Computer Based Test
            </p>
            <h1 className="anim-naik tunda-1 max-w-[15ch] text-[2.6rem] leading-[0.98] font-extrabold sm:text-[3.4rem] lg:text-[4rem]">
              Ruang ujian yang{' '}
              <span className="font-display bg-[linear-gradient(100deg,#A3E635,#22D3EE_45%,#7C5CFF)] bg-clip-text font-normal text-transparent italic">
                tenang
              </span>{' '}
              untuk semua.
            </h1>
            <p className="anim-naik tunda-2 mt-5 max-w-[46ch] text-[0.95rem] leading-relaxed text-body">
              Susun soal, jadwalkan ujian, awasi pengerjaan secara langsung, dan biarkan penilaian berjalan otomatis.
              Peserta cukup satu token untuk masuk ke lembar jawabannya.
            </p>

            <div className="anim-naik tunda-3 mt-8 flex flex-wrap items-end gap-8">
              <ul className="grid gap-3 sm:grid-cols-1 lg:max-w-[420px]">
                {FITUR.map((f) => {
                  const Ikon = f.ikon
                  return (
                    <li key={f.judul} className="flex items-start gap-3">
                      <span className="grid size-9 flex-none place-items-center rounded-xl border" style={{ borderColor: `color-mix(in oklab, ${f.warna} 40%, transparent)`, background: `color-mix(in oklab, ${f.warna} 12%, transparent)`, color: f.warna }}>
                        <Ikon size={16} strokeWidth={2.2} />
                      </span>
                      <span>
                        <span className="block text-[0.85rem] font-bold text-chalk">{f.judul}</span>
                        <span className="mt-0.5 block max-w-[42ch] text-[0.78rem] leading-snug text-mute">{f.pesan}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="anim-apung hidden lg:block" style={{ '--rot': '-7deg' }}>
                <LembarJawaban />
              </div>
            </div>
          </div>

          <div className="anim-naik tunda-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { n: stat?.soal ?? '—', l: 'Butir soal', w: '#7C5CFF' },
              { n: stat?.mapel ?? '—', l: 'Mata pelajaran', w: '#22D3EE' },
              { n: stat?.ujian ?? '—', l: 'Paket ujian', w: '#A3E635' },
              { n: stat?.peserta ?? '—', l: 'Peserta terdaftar', w: '#FFB020' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-line-soft bg-ink-900/60 px-3 py-2.5 backdrop-blur">
                <p className="font-mono text-[1.35rem] leading-none font-bold" style={{ color: s.w }}>{s.n}</p>
                <p className="mt-1.5 text-[0.68rem] font-semibold tracking-wide text-mute uppercase">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center border-t border-line-soft px-5 py-10 sm:px-8 lg:border-t-0 lg:border-l">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(124,92,255,0.16),transparent_70%)]" />
          <div className="anim-naik tunda-2 relative w-full max-w-[420px]">
            <div className="kartu overflow-hidden p-6 sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[linear-gradient(140deg,#7C5CFF,#22D3EE)] text-white shadow-[0_12px_30px_-12px_rgba(124,92,255,0.9)]">
                  <LogIn size={20} strokeWidth={2.3} />
                </span>
                <div>
                  <h2 className="text-[1.2rem] leading-tight">Masuk ke ruang ujian</h2>
                  <p className="mt-0.5 text-[0.78rem] text-mute">Gunakan email sekolah atau NIS peserta.</p>
                </div>
              </div>

              <form onSubmit={kirim} className="space-y-4">
                <label className="block">
                  <span className="label-field">Email atau NIS</span>
                  <input
                    value={identitas}
                    onChange={(e) => setIdentitas(e.target.value)}
                    autoComplete="username"
                    required
                    placeholder="nama@cendekia.sch.id atau 26001"
                    className="kolom-field"
                  />
                </label>
                <label className="block">
                  <span className="label-field">Kata sandi</span>
                  <span className="relative block">
                    <input
                      type={lihat ? 'text' : 'password'}
                      value={sandi}
                      onChange={(e) => setSandi(e.target.value)}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="kolom-field pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => { bunyi('klik'); setLihat((v) => !v) }}
                      aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-chalk"
                    >
                      {lihat ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                </label>

                {galat && (
                  <p className="flex items-start gap-2 rounded-xl border border-rose/40 bg-rose/10 p-3 text-[0.8rem] leading-snug font-semibold text-rose">
                    <AlertCircle size={15} className="mt-0.5 flex-none" /> {galat}
                  </p>
                )}

                <Tombol type="submit" varian="utama" ukuran="lg" memuat={sibuk} ikon={ArrowRight} className="w-full">
                  Masuk sekarang
                </Tombol>
              </form>

            </div>

            <p className="mt-4 text-center text-[0.72rem] leading-relaxed text-mute">
              Lupa kata sandi? Hubungi administrator sekolah untuk pengaturan ulang.
              <br />
              Seluruh sesi ujian tercatat pada basis data PostgreSQL.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}