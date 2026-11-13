import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Play, KeyRound, Clock, Target, Trophy, Sparkles, CheckCircle2, ChevronRight,
  CalendarClock, Shuffle, BookOpen, AlertTriangle, ArrowRight, Flame, Hourglass, Eye, GraduationCap,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, TitikNyala, Avatar, Cincin, BilahProgres, Kosong, Galat, Rangka, Modal, Field, JudulBagian,
} from '../../components/ui'
import { Sparkline } from '../../components/charts'
import {
  STATUS_UJIAN, tanggal, jamSaja, hitungMundur, jamMenitDetik, nilaiTeks, warnaNilai, relatif, perangkatRingkas, namaDepan,
} from '../../lib/format'

function sapaan() {
  const j = new Date().getHours()
  if (j < 11) return { teks: 'Selamat pagi', ikon: '☀' }
  if (j < 15) return { teks: 'Selamat siang', ikon: '◐' }
  if (j < 18) return { teks: 'Selamat sore', ikon: '◑' }
  return { teks: 'Selamat malam', ikon: '☾' }
}

function KartuUjian({ u, tick, onMulai }) {
  const s = STATUS_UJIAN[u.status_efektif]
  const sisaDetik = Math.max(0, Math.round((new Date(u.selesai_pada).getTime() - tick) / 1000))
  const menujuBuka = Math.max(0, Math.round((new Date(u.mulai_pada).getTime() - tick) / 1000))
  const habisKesempatan = u.sisa_percobaan <= 0
  const bisa = u.bisa_mulai && !habisKesempatan

  return (
    <article className="kartu kartu-hover relative flex flex-col overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${s.warna})` }} />
      <span className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full opacity-[0.13] blur-2xl" style={{ background: u.mapel_warna }} />

      <div className="relative flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 flex-none place-items-center rounded-xl font-mono text-[0.7rem] font-bold" style={{ background: `color-mix(in oklab, ${u.mapel_warna} 18%, transparent)`, color: u.mapel_warna, border: `1px solid color-mix(in oklab, ${u.mapel_warna} 40%, transparent)` }}>
            {u.mapel_kode}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.78rem] font-bold" style={{ color: u.mapel_warna }}>{u.mapel_nama}</span>
            <span className="block text-[0.66rem] text-mute">{u.jumlah_soal} butir · KKM {u.kkm}</span>
          </span>
        </span>
        <Pil warna={s.warna}>{s.label}</Pil>
      </div>

      <h3 className="relative mt-3 text-[1.02rem] leading-snug">{u.judul}</h3>
      {u.deskripsi && <p className="relative mt-1.5 line-clamp-2 text-[0.78rem] leading-relaxed text-mute">{u.deskripsi}</p>}

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-950/40 px-2.5 py-1.5 text-[0.72rem] text-body">
          <Clock size={12} className="text-amber" /> {u.durasi_menit} menit
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-950/40 px-2.5 py-1.5 text-[0.72rem] text-body">
          <Target size={12} className="text-lime" /> KKM {u.kkm}
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-950/40 px-2.5 py-1.5 text-[0.72rem] text-body">
          <Shuffle size={12} className="text-cyan" /> {u.acak_soal ? 'Soal diacak' : 'Urutan tetap'}
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-950/40 px-2.5 py-1.5 text-[0.72rem] text-body">
          <Flame size={12} className="text-rose" /> {u.sisa_percobaan} kesempatan
        </span>
      </div>

      <div className="relative mt-3 rounded-xl border border-line-soft bg-ink-950/50 p-2.5">
        <p className="flex items-center justify-between text-[0.7rem]">
          <span className="flex items-center gap-1.5 font-semibold text-mute"><CalendarClock size={11} /> Jadwal</span>
          <span className="font-mono text-mute">{tanggal(u.mulai_pada, { tahun: false })} {jamSaja(u.mulai_pada)}</span>
        </p>
        <p className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[0.72rem] font-bold" style={{ color: u.status_efektif === 'berlangsung' ? '#A3E635' : '#22D3EE' }}>
            {u.status_efektif === 'berlangsung' ? `Ditutup ${hitungMundur(u.selesai_pada)} lagi` : u.status_efektif === 'akan_datang' ? `Dibuka ${hitungMundur(u.mulai_pada)} lagi` : 'Jadwal telah berakhir'}
          </span>
          {u.status_efektif === 'berlangsung' && sisaDetik < 86400 && (
            <span className="font-mono text-[0.78rem] font-bold text-lime">{jamMenitDetik(sisaDetik)}</span>
          )}
          {u.status_efektif === 'akan_datang' && menujuBuka < 86400 && (
            <span className="font-mono text-[0.78rem] font-bold text-cyan">{jamMenitDetik(menujuBuka)}</span>
          )}
        </p>
      </div>

      {u.nilai_terbaik !== null && (
        <div className="relative mt-2.5 flex items-center gap-2 rounded-xl border border-line-soft bg-ink-950/40 px-2.5 py-2">
          <Trophy size={13} style={{ color: warnaNilai(u.nilai_terbaik, u.kkm) }} />
          <span className="text-[0.72rem] text-mute">Nilai terbaik Anda</span>
          <span className="ml-auto font-mono text-[0.92rem] font-bold" style={{ color: warnaNilai(u.nilai_terbaik, u.kkm) }}>{nilaiTeks(u.nilai_terbaik)}</span>
        </div>
      )}

      <div className="relative mt-auto pt-4">
        {u.sesi_aktif ? (
          <Link to={`/siswa/ujian/${u.sesi_aktif}`} className="block">
            <Tombol varian="sukses" ikon={Play} className="w-full">Lanjutkan sesi berjalan</Tombol>
          </Link>
        ) : bisa ? (
          <Tombol varian="utama" ikon={KeyRound} className="w-full" onClick={() => onMulai(u)}>Masukkan token & mulai</Tombol>
        ) : habisKesempatan ? (
          <div className="rounded-xl border border-line-soft bg-ink-950/40 p-2.5 text-center">
            <p className="text-[0.76rem] font-semibold text-mute">Kesempatan mengerjakan sudah habis.</p>
            <Link to="/siswa/riwayat" className="mt-1 inline-flex items-center gap-1 text-[0.74rem] font-bold text-cyan transition hover:gap-2">
              Lihat hasil sebelumnya <ChevronRight size={12} />
            </Link>
          </div>
        ) : (
          <Tombol varian="kedua" ikon={Hourglass} className="w-full" disabled>Belum dibuka</Tombol>
        )}
      </div>
    </article>
  )
}

export default function Beranda() {
  const { pengguna } = useAuth()
  const toast = useToast()
  const { bunyi } = useSuara()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tick, setTick] = useState(Date.now())
  const [untuk, setUntuk] = useState(null)
  const [token, setToken] = useState('')
  const [galatToken, setGalatToken] = useState('')

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['beranda-siswa'],
    queryFn: () => api('/siswa/beranda'),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const mulai = useMutation({
    mutationFn: () => api(`/siswa/ujian/${untuk.id}/mulai`, { method: 'POST', body: { token: token.trim().toUpperCase(), perangkat: perangkatRingkas() } }),
    onSuccess: (d) => {
      bunyi('buka')
      qc.invalidateQueries({ queryKey: ['beranda-siswa'] })
      if (d.lanjut) toast.info('Melanjutkan sesi sebelumnya', { pesan: 'Jawaban yang sudah tersimpan tetap ada.' })
      else toast.sukses('Ujian dimulai', { pesan: 'Jawaban tersimpan otomatis. Tetap berada di halaman ujian sampai selesai.' })
      setUntuk(null)
      setToken('')
      // Setiap kali sesi dimulai/dilanjutkan, buang cache lama lalu ambil paket soal
      // sekali di sini; halaman ujian memakai cache yang sama tanpa fetch ulang.
      qc.removeQueries({ queryKey: ['sesi-ujian', String(d.percobaan_id)] })
      qc.removeQueries({ queryKey: ['sesi-status', String(d.percobaan_id)] })
      qc.prefetchQuery({
        queryKey: ['sesi-ujian', String(d.percobaan_id)],
        queryFn: () => api(`/siswa/percobaan/${d.percobaan_id}`),
        staleTime: Infinity,
      })
      navigate(`/siswa/ujian/${d.percobaan_id}`)
    },
    onError: (e) => {
      bunyi('gagal')
      setGalatToken(pesanGalat(e))
      if (e.status !== 401) toast.gagal('Ujian belum dapat dimulai', { pesan: pesanGalat(e) })
    },
  })

  const sapa = sapaan()
  const tersedia = data?.tersedia || []
  const riwayat = data?.riwayat || []
  const st = data?.statistik
  const sesiAktif = useMemo(() => tersedia.find((u) => u.sesi_aktif), [tersedia])
  const tren = useMemo(() => [...riwayat].filter((r) => r.status === 'selesai' && r.nilai !== null).reverse().map((r) => r.nilai), [riwayat])
  const terdekat = useMemo(() => [...tersedia].sort((a, b) => new Date(a.mulai_pada) - new Date(b.mulai_pada)).slice(0, 4), [tersedia])

  if (isPending) return <Rangka baris={7} />
  if (error) return <Galat pesan={error.message} onUlang={refetch} />

  return (
    <div className="space-y-5">
      <section className="kartu relative overflow-hidden p-5 sm:p-6">
        <div className="aurora opacity-[0.22]" />
        <div className="teksturnoda pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-[0.7rem] font-bold tracking-[0.24em] text-cyan uppercase">{sapa.teks} · {pengguna.kelas}</p>
            <h2 className="mt-2 font-display text-[2rem] leading-[1.1] font-normal text-chalk sm:text-[2.6rem]">
              {namaDepan(pengguna.nama, 2)},<br />
              <span className="text-[1.5rem] sm:text-[1.9rem]">lembar ujianmu sudah disiapkan.</span>
            </h2>
            <p className="mt-3 max-w-xl text-[0.86rem] leading-relaxed text-mute">
              {tersedia.length > 0
                ? `Ada ${tersedia.length} ujian yang berlangsung hari ini untuk kelasmu. Masukkan token dari pengawas, lalu kerjakan dengan tenang — jawaban tersimpan otomatis setiap kali kamu memilih.`
                : 'Tidak ada ujian yang dijadwalkan hari ini untuk kelasmu. Gunakan waktu ini untuk meninjau riwayat nilai dan pembahasan ujian sebelumnya.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pil warna="#22D3EE" ikon={GraduationCap}>NIS {pengguna.nis}</Pil>
              <Pil warna="#A3E635" ikon={CheckCircle2}>{st?.selesai || 0} ujian selesai</Pil>
              {st?.tuntas > 0 && <Pil warna="#7C5CFF" ikon={Trophy}>{st.tuntas} tuntas KKM</Pil>}
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <Cincin nilai={st?.rata ?? 0} ukuran={132} tebal={11} warna={warnaNilai(st?.rata ?? 0)}>
              <span className="text-center">
                <span className="block font-mono text-[2rem] leading-none font-bold text-chalk">{nilaiTeks(st?.rata)}</span>
                <span className="mt-1.5 block text-[0.6rem] font-bold tracking-[0.18em] text-mute uppercase">Rata-rata</span>
              </span>
            </Cincin>
            {tren.length > 1 && (
              <span className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink-950/50 px-3 py-1.5">
                <Sparkline data={tren} warna="#22D3EE" lebar={80} tinggi={24} />
                <span className="text-[0.68rem] font-semibold text-mute">{tren.length} ujian</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {sesiAktif && (
        <section className="anim-naik relative overflow-hidden rounded-2xl border border-lime/45 bg-[linear-gradient(115deg,rgba(163,230,53,0.16),rgba(11,16,36,0.7)_55%)] p-4">
          <span className="pointer-events-none absolute -top-16 -left-10 size-44 rounded-full bg-lime/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid size-12 flex-none place-items-center rounded-2xl bg-lime/20 text-lime"><Play size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <TitikNyala warna="#A3E635" label="Sesi sedang berjalan" />
                <Pil warna={sesiAktif.mapel_warna}>{sesiAktif.mapel_nama}</Pil>
              </div>
              <p className="mt-1.5 text-[1rem] font-bold text-chalk">{sesiAktif.judul}</p>
              <p className="mt-0.5 text-[0.78rem] text-mute">Waktu terus berjalan meskipun kamu menutup halaman. Segera lanjutkan sebelum batas waktu habis.</p>
            </div>
            <Link to={`/siswa/ujian/${sesiAktif.sesi_aktif}`} className="flex-none">
              <Tombol varian="sukses" ukuran="lg" ikon={ArrowRight}>Lanjutkan sekarang</Tombol>
            </Link>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'Ujian selesai', n: st?.selesai ?? 0, w: '#7C5CFF', ikon: CheckCircle2 },
          { l: 'Nilai terbaik', n: nilaiTeks(st?.terbaik), w: '#A3E635', ikon: Trophy },
          { l: 'Jawaban benar', n: st?.total_benar ?? 0, w: '#22D3EE', ikon: Sparkles },
          { l: 'Tuntas KKM', n: st?.selesai ? `${Math.round((st.tuntas / st.selesai) * 100)}%` : '—', w: '#FFB020', ikon: Target },
        ].map((x, i) => {
          const Ikon = x.ikon
          return (
            <div key={x.l} className={`kartu anim-naik tunda-${i + 1} relative overflow-hidden p-4`}>
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: x.w }} />
              <Ikon size={16} style={{ color: x.w }} />
              <p className="mt-2.5 font-mono text-[1.6rem] leading-none font-bold text-chalk">{x.n}</p>
              <p className="mt-2 text-[0.68rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <JudulBagian
            eyebrow="Ruang ujian"
            judul="Ujian hari ini"
            pesan="Hanya ujian yang berlangsung hari ini dan menyasar kelasmu yang tampil di sini."
            kanan={<Pil warna="#8A93B8">{tersedia.length} ujian hari ini</Pil>}
          />
          {tersedia.length === 0 ? (
            <Kosong
              ikon={BookOpen}
              judul="Tidak ada ujian hari ini"
              pesan="Belum ada ujian yang dijadwalkan berlangsung hari ini untuk kelasmu. Periksa kembali esok hari, atau tinjau riwayat nilai dan pembahasan ujian sebelumnya."
              aksi={<Link to="/siswa/riwayat"><Tombol varian="kedua" ikon={ChevronRight}>Buka riwayat nilai</Tombol></Link>}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tersedia.map((u) => (
                <KartuUjian
                  key={u.id}
                  u={u}
                  tick={tick}
                  onMulai={(x) => { bunyi('buka'); setUntuk(x); setToken(''); setGalatToken('') }}
                />
              ))}
            </div>
          )}

          <section className="kartu overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft p-4">
              <div>
                <h3 className="text-[1rem]">Pengerjaan terakhir</h3>
                <p className="mt-0.5 text-[0.75rem] text-mute">Empat sesi paling baru beserta capaiannya.</p>
              </div>
              <Link to="/siswa/riwayat" className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-cyan transition hover:gap-2">
                Semua riwayat <ChevronRight size={13} />
              </Link>
            </div>
            {riwayat.length === 0 ? (
              <div className="p-4"><Kosong ikon={Clock} judul="Belum ada pengerjaan" pesan="Hasil akan muncul di sini setelah kamu mengirimkan jawaban ujian." className="py-8" /></div>
            ) : (
              <ul className="divide-y divide-[#1c2549]">
                {riwayat.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link to={r.status === 'selesai' ? `/siswa/hasil/${r.id}` : `/siswa/ujian/${r.id}`} className="flex items-center gap-3 p-3.5 transition hover:bg-ink-700/40">
                      <span className="size-2.5 flex-none rounded-full" style={{ background: r.mapel_warna, boxShadow: `0 0 10px ${r.mapel_warna}88` }} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[0.86rem] leading-snug font-semibold text-chalk">{r.judul}</span>
                        <span className="mt-0.5 block text-[0.7rem] text-mute">{r.mapel_nama} · {relatif(r.selesai_pada || r.mulai_pada)}</span>
                      </span>
                      {r.status === 'berlangsung' ? (
                        <Pil warna="#A3E635">Berlangsung</Pil>
                      ) : (
                        <span className="flex flex-none items-center gap-2.5">
                          {r.perlu_penilaian && <span className="hidden sm:block"><Pil warna="#FFB020">Menunggu poin</Pil></span>}
                          <span className="text-right">
                            <span className="block font-mono text-[1.05rem] leading-none font-bold" style={{ color: warnaNilai(r.nilai, r.kkm) }}>{nilaiTeks(r.nilai)}</span>
                            <span className="mt-1 block text-[0.62rem] text-mute">KKM {r.kkm}</span>
                          </span>
                          <span className="hidden w-14 sm:block"><BilahProgres nilai={r.nilai ?? 0} warna={warnaNilai(r.nilai, r.kkm)} tinggi={4} /></span>
                        </span>
                      )}
                      <ChevronRight size={15} className="flex-none text-mute" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="kartu p-4">
            <h3 className="flex items-center gap-2 text-[1rem]"><CalendarClock size={16} className="text-cyan" /> Jadwal terdekat</h3>
            {terdekat.length === 0 ? (
              <p className="mt-3 text-[0.8rem] text-mute">Belum ada jadwal ujian untuk kelasmu.</p>
            ) : (
              <ol className="mt-4 space-y-0">
                {terdekat.map((u, i) => (
                  <li key={u.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < terdekat.length - 1 && <span className="absolute top-6 left-[11px] h-full w-px bg-line" />}
                    <span className="relative z-10 mt-0.5 grid size-6 flex-none place-items-center rounded-full border-2" style={{ borderColor: u.mapel_warna, background: '#0b1024' }}>
                      <span className="size-2 rounded-full" style={{ background: u.mapel_warna }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.82rem] font-bold text-chalk">{u.judul}</span>
                      <span className="mt-0.5 block font-mono text-[0.68rem] text-mute">{tanggal(u.mulai_pada, { jam: true, tahun: false })}</span>
                      <span className="mt-1 block text-[0.7rem] font-semibold" style={{ color: STATUS_UJIAN[u.status_efektif].warna }}>
                        {u.status_efektif === 'berlangsung' ? `Berlangsung · ditutup ${hitungMundur(u.selesai_pada)} lagi` : `Dibuka ${hitungMundur(u.mulai_pada)} lagi`}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="kartu p-4">
            <h3 className="flex items-center gap-2 text-[1rem]"><Eye size={16} className="text-amber" /> Sebelum memulai</h3>
            <ul className="mt-3 space-y-2.5">
              {[
                { w: '#22D3EE', t: 'Siapkan token ujian', d: 'Token diberikan pengawas sesaat sebelum ujian dibuka dan berbeda untuk setiap ujian.' },
                { w: '#A3E635', t: 'Jawaban tersimpan otomatis', d: 'Setiap pilihan langsung dikirim ke server. Bila koneksi terputus, jawaban terakhir tetap tersimpan.' },
                { w: '#FFB020', t: 'Waktu tidak berhenti', d: 'Hitungan mundur tetap berjalan walau halaman ditutup atau perangkat mati.' },
                { w: '#FF4D6D', t: 'Tetap di halaman ujian', d: 'Berpindah tab atau menyembunyikan jendela tercatat dan terlihat oleh pengawas.' },
              ].map((x) => (
                <li key={x.t} className="flex gap-2.5">
                  <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: x.w, boxShadow: `0 0 8px ${x.w}88` }} />
                  <span>
                    <span className="block text-[0.8rem] font-bold text-chalk">{x.t}</span>
                    <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-mute">{x.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="kartu relative overflow-hidden p-4">
            <span className="pointer-events-none absolute -right-10 -bottom-12 size-40 rounded-full bg-violet/15 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={44} />
              <div className="min-w-0">
                <p className="truncate text-[0.88rem] font-bold text-chalk">{pengguna.nama}</p>
                <p className="text-[0.7rem] text-mute">{pengguna.kelas} · NIS {pengguna.nis}</p>
              </div>
            </div>
            <Link to="/siswa/profil" className="relative mt-3 block">
              <Tombol varian="kedua" className="w-full" ikon={ChevronRight}>Kelola profil & kata sandi</Tombol>
            </Link>
          </section>
        </div>
      </div>

      <Modal
        terbuka={!!untuk}
        onTutup={() => { setUntuk(null); setGalatToken('') }}
        judul="Masukkan token ujian"
        keterangan={untuk ? `${untuk.judul} · ${untuk.mapel_nama}` : ''}
        ikon={KeyRound}
        warna={untuk?.mapel_warna || '#FFB020'}
        lebar="max-w-md"
        kaki={
          <>
            <Tombol varian="halus" onClick={() => { setUntuk(null); setGalatToken('') }}>Batal</Tombol>
            <Tombol
              varian="utama"
              ikon={Play}
              memuat={mulai.isPending}
              disabled={token.trim().length < 3}
              onClick={() => { setGalatToken(''); mulai.mutate() }}
            >
              Mulai mengerjakan
            </Tombol>
          </>
        }
      >
        {untuk && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Durasi', n: `${untuk.durasi_menit} mnt`, w: '#FFB020' },
                { l: 'Butir soal', n: untuk.jumlah_soal, w: '#7C5CFF' },
                { l: 'Kesempatan', n: `${untuk.sisa_percobaan}×`, w: '#22D3EE' },
              ].map((x) => (
                <div key={x.l} className="rounded-xl border border-line-soft bg-ink-950/50 p-2.5 text-center">
                  <p className="font-mono text-[1.05rem] leading-none font-bold" style={{ color: x.w }}>{x.n}</p>
                  <p className="mt-1.5 text-[0.62rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
                </div>
              ))}
            </div>

            <Field label="Token dari pengawas" wajib className="mt-4" pesan={galatToken} petunjuk="Token tidak membedakan huruf besar dan kecil.">
              <input
                value={token}
                onChange={(e) => { setToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)); setGalatToken('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && token.trim().length >= 3 && !mulai.isPending) { setGalatToken(''); mulai.mutate() } }}
                placeholder="XXXXXX"
                className="kolom-field text-center font-mono text-[1.6rem] font-bold tracking-[0.4em] uppercase"
                autoComplete="off"
                autoFocus
                aria-label="Token ujian"
              />
            </Field>

            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber/35 bg-amber/8 p-3">
              <AlertTriangle size={15} className="mt-0.5 flex-none text-amber" />
              <p className="text-[0.76rem] leading-relaxed text-body">
                Begitu dimulai, hitungan waktu {untuk.durasi_menit} menit berjalan dan tidak dapat dijeda.
                Pastikan perangkat terisi daya dan koneksi stabil. Meninggalkan halaman ujian akan tercatat oleh pengawas.
              </p>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}