import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, LibraryBig, FileStack, Radio, ChartNoAxesCombined, Users, Menu, X,
  Volume2, VolumeX, LogOut, UserCircle, Search, ChevronRight, Database, GraduationCap, Bell, Settings2, BookOpen,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useSekolah } from '../context/SekolahContext'
import { useSuara } from '../context/SoundContext'
import { Avatar, TombolIkon, Pil, Rangka } from './ui'
import { Logo, NamaBrand } from './Logo'
import { jamSaja, tanggal, namaPanggilan } from '../lib/format'

// Guru hanya empat alur mengajar; menu strategis & struktur hanya administrator.
const MENU_GURU = [
  { ke: '/admin/bank-soal', label: 'Bank Soal', ikon: LibraryBig, warna: '#22D3EE' },
  { ke: '/admin/ujian', label: 'Ujian', ikon: FileStack, warna: '#A3E635' },
  { ke: '/admin/monitoring', label: 'Pengawasan', ikon: Radio, warna: '#FFB020', badge: 'live' },
  { ke: '/admin/hasil', label: 'Hasil & Nilai', ikon: ChartNoAxesCombined, warna: '#F472B6', badge: 'perlu' },
]

const MENU_ADMIN = [
  { ke: '/admin', label: 'Ringkasan', ikon: LayoutDashboard, akhir: true, warna: '#7C5CFF' },
  ...MENU_GURU,
  { ke: '/admin/mapel', label: 'Mata Pelajaran', ikon: BookOpen, warna: '#34D399' },
  { ke: '/admin/peserta', label: 'Peserta & Akun', ikon: Users, warna: '#38BDF8' },
]

const MENU_SISWA = [
  { ke: '/siswa', label: 'Beranda', ikon: LayoutDashboard, akhir: true, warna: '#7C5CFF' },
  { ke: '/siswa/riwayat', label: 'Riwayat Nilai', ikon: ChartNoAxesCombined, warna: '#A3E635' },
  { ke: '/siswa/profil', label: 'Profil Saya', ikon: UserCircle, warna: '#22D3EE' },
]

const JUDUL = [
  [/^\/admin\/?$/, 'Ringkasan Sekolah'],
  [/^\/admin\/bank-soal/, 'Bank Soal'],
  [/^\/admin\/mapel/, 'Mata Pelajaran'],
  [/^\/admin\/ujian\/\d+/, 'Penyusun Ujian'],
  [/^\/admin\/ujian/, 'Daftar Ujian'],
  [/^\/admin\/monitoring/, 'Pengawasan Langsung'],
  [/^\/admin\/hasil/, 'Hasil & Penilaian'],
  [/^\/admin\/peserta/, 'Peserta & Akun'],
  [/^\/admin\/pengaturan/, 'Pengaturan Sekolah'],
  [/^\/admin\/profil/, 'Profil Akun'],
  [/^\/siswa\/?$/, 'Beranda Peserta'],
  [/^\/siswa\/riwayat/, 'Riwayat Nilai'],
  [/^\/siswa\/profil/, 'Profil Saya'],
  [/^\/siswa\/hasil/, 'Hasil Ujian'],
]

function ItemMenu({ item, badge, onKlik }) {
  const Ikon = item.ikon
  return (
    <NavLink
      to={item.ke}
      end={item.akhir}
      onClick={onKlik}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.86rem] font-semibold transition-all duration-200 ${
          isActive ? 'bg-ink-700/90 text-chalk' : 'text-mute hover:bg-ink-800/70 hover:text-body'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300"
            style={{ background: item.warna, opacity: isActive ? 1 : 0, height: isActive ? 26 : 8 }}
          />
          <span
            className="grid size-8 flex-none place-items-center rounded-lg border transition-all duration-200"
            style={{
              color: isActive ? item.warna : undefined,
              borderColor: isActive ? `color-mix(in oklab, ${item.warna} 45%, transparent)` : '#1c2549',
              background: isActive ? `color-mix(in oklab, ${item.warna} 14%, transparent)` : 'rgba(8,11,26,0.5)',
            }}
          >
            <Ikon size={16} strokeWidth={2.2} />
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] font-bold"
              style={{ background: `color-mix(in oklab, ${item.warna} 22%, transparent)`, color: item.warna }}
            >
              {badge}
            </span>
          )}
          {isActive && <ChevronRight size={14} className="text-mute" />}
        </>
      )}
    </NavLink>
  )
}

function IsiSidebar({ menu, badge, onKlik, pengguna, kesehatan, sekolah }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden border-b border-line-soft px-5 py-5">
        <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-violet/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <Logo />
          <div className="min-w-0">
            <NamaBrand />
            <p className="mt-1 truncate text-[0.68rem] font-semibold tracking-wide text-mute">{sekolah.nama_sekolah}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 font-mono text-[0.62rem] font-bold tracking-[0.2em] text-mute/70 uppercase">
          {pengguna.peran === 'siswa' ? 'Ruang Peserta' : 'Ruang Kerja'}
        </p>
        {menu.map((m) => (
          <ItemMenu key={m.ke} item={m} onKlik={onKlik} badge={m.badge === 'live' ? badge.live : m.badge === 'perlu' ? badge.perlu : 0} />
        ))}
        {pengguna.peran !== 'siswa' && (
          <>
            <p className="px-3 pt-5 pb-2 font-mono text-[0.62rem] font-bold tracking-[0.2em] text-mute/70 uppercase">Akun</p>
            {pengguna.peran === 'admin' && (
              <ItemMenu item={{ ke: '/admin/pengaturan', label: 'Pengaturan Sekolah', ikon: Settings2, warna: '#FFB020' }} onKlik={onKlik} />
            )}
            <ItemMenu item={{ ke: '/admin/profil', label: 'Profil & Keamanan', ikon: UserCircle, warna: '#F472B6' }} onKlik={onKlik} />
          </>
        )}
      </nav>

      <div className="space-y-3 border-t border-line-soft p-3">
        <div className="rounded-xl border border-line-soft bg-ink-950/60 p-3">
          <div className="flex items-center gap-2">
            <Database size={13} className={kesehatan ? 'text-lime' : 'text-amber'} />
            <span className="text-[0.7rem] font-bold text-body">PostgreSQL</span>
            <span className={`ml-auto size-1.5 rounded-full ${kesehatan ? 'bg-lime' : 'bg-amber'}`} />
          </div>
          <p className="mt-1.5 font-mono text-[0.64rem] leading-relaxed text-mute">
            {kesehatan ? `${kesehatan.database.host}:${kesehatan.database.port} · SSL ${kesehatan.database.ssl ? 'on' : 'off'}` : 'menghubungkan…'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-ink-800/60 p-2.5">
          <Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.78rem] font-bold text-chalk">{pengguna.nama}</p>
            <p className="truncate text-[0.66rem] text-mute">
              {pengguna.peran === 'siswa' ? `${pengguna.nis} · ${pengguna.kelas}` : pengguna.peran === 'admin' ? 'Administrator' : 'Guru Pengampu'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { pengguna, keluar } = useAuth()
  const sekolah = useSekolah()
  const { aktif: suara, toggle: toggleSuara, bunyi } = useSuara()
  const lokasi = useLocation()
  const navigate = useNavigate()
  const [terbuka, setTerbuka] = useState(false)
  const [menuAkun, setMenuAkun] = useState(false)
  const [cari, setCari] = useState('')
  const [waktu, setWaktu] = useState(new Date())
  const refAkun = useRef(null)
  const siswa = pengguna.peran === 'siswa'
  const admin = pengguna.peran === 'admin'
  const menu = siswa ? MENU_SISWA : admin ? MENU_ADMIN : MENU_GURU

  const { data: ringkas } = useQuery({
    queryKey: ['ringkasan'],
    queryFn: () => api('/ringkasan'),
    enabled: admin,
    refetchInterval: 30000,
  })
  const { data: kesehatan } = useQuery({ queryKey: ['kesehatan'], queryFn: () => api('/kesehatan'), refetchInterval: 60000 })

  useEffect(() => {
    const t = setInterval(() => setWaktu(new Date()), 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { setTerbuka(false); setMenuAkun(false) }, [lokasi.pathname])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setMenuAkun(false); setTerbuka(false) } }
    const onKlik = (e) => { if (refAkun.current && !refAkun.current.contains(e.target)) setMenuAkun(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onKlik)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onKlik) }
  }, [])

  const judul = JUDUL.find(([re]) => re.test(lokasi.pathname))?.[1] || sekolah.nama_aplikasi
  const badge = { live: ringkas?.kpi?.sedang_mengerjakan || 0, perlu: ringkas?.kpi?.perlu_penilaian || 0 }

  return (
    <div className="min-h-screen bg-ink-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-violet/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-[560px] rounded-full bg-cyan/8 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-lime/5 blur-[120px]" />
        <div className="teksturnoda absolute inset-0 opacity-[0.035] mix-blend-overlay" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line-soft bg-ink-850/95 backdrop-blur-xl lg:block">
        <IsiSidebar menu={menu} badge={badge} pengguna={pengguna} kesehatan={kesehatan} sekolah={sekolah} />
      </aside>

      {terbuka && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setTerbuka(false)} />
          <aside className="anim-kanan absolute inset-y-0 left-0 w-[280px] border-r border-line bg-ink-850">
            <button onClick={() => setTerbuka(false)} aria-label="Tutup menu" className="absolute top-4 right-3 z-10 grid size-8 place-items-center rounded-lg border border-line text-mute">
              <X size={15} />
            </button>
            <IsiSidebar menu={menu} badge={badge} pengguna={pengguna} kesehatan={kesehatan} sekolah={sekolah} onKlik={() => setTerbuka(false)} />
          </aside>
        </div>
      )}

      <div className="relative lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-line-soft bg-ink-900/85 backdrop-blur-xl">
          <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
            <button onClick={() => { bunyi('buka'); setTerbuka(true) }} aria-label="Buka menu" className="grid size-9 flex-none place-items-center rounded-xl border border-line-soft bg-ink-800 text-body lg:hidden">
              <Menu size={17} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="line-clamp-2 min-w-0 text-[1.02rem] leading-tight font-extrabold sm:text-[1.15rem]">{judul}</h1>
                {!siswa && badge.live > 0 && (
                  <span className="hidden sm:block">
                    <Pil warna="#A3E635">
                      <span className="size-1.5 animate-pulse rounded-full bg-lime" /> {badge.live} sesi live
                    </Pil>
                  </span>
                )}
              </div>
              <p className="mt-0.5 hidden text-[0.7rem] text-mute sm:block">
                {tanggal(waktu)} · <span className="font-mono">{jamSaja(waktu)}</span> WIB · Tahun ajaran {sekolah.tahun_ajaran}
              </p>
            </div>

            {!siswa && (
              <form
                className="relative hidden xl:block"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (cari.trim()) navigate(`/admin/bank-soal?cari=${encodeURIComponent(cari.trim())}`)
                }}
              >
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
                <input
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari soal, topik, pembahasan…"
                  className="kolom-field w-[260px] py-2 pl-9 text-[0.8rem]"
                  aria-label="Cari di bank soal"
                />
              </form>
            )}

            <TombolIkon ikon={suara ? Volume2 : VolumeX} label={suara ? 'Suara aktif — klik untuk membisukan' : 'Suara dibisukan — klik untuk mengaktifkan'} aktif={suara} onClick={toggleSuara} />

            {!siswa && badge.perlu > 0 && (
              <button
                onClick={() => navigate('/admin/hasil?penilaian=perlu')}
                className="relative grid size-9 place-items-center rounded-xl border border-amber/40 bg-amber/12 text-amber transition hover:bg-amber/20"
                aria-label={`${badge.perlu} lembar menunggu penilaian`}
                title={`${badge.perlu} lembar menunggu penilaian`}
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-amber font-mono text-[0.6rem] font-bold text-ink-950">{badge.perlu}</span>
              </button>
            )}

            <div className="relative" ref={refAkun}>
              <button onClick={() => { bunyi('buka'); setMenuAkun((v) => !v) }} className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink-800/70 p-1 pr-2 transition hover:border-violet/60" aria-expanded={menuAkun}>
                <Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={30} />
                <span className="hidden max-w-[110px] truncate text-[0.78rem] font-bold text-chalk sm:block">{namaPanggilan(pengguna.nama)}</span>
              </button>
              {menuAkun && (
                <div className="anim-naik absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-ink-850 shadow-lift">
                  <div className="border-b border-line-soft p-3">
                    <p className="truncate text-[0.85rem] font-bold text-chalk">{pengguna.nama}</p>
                    <p className="truncate text-[0.72rem] text-mute">{pengguna.email}</p>
                    <Pil warna={siswa ? '#22D3EE' : '#A3E635'} className="mt-2">{siswa ? `Peserta · ${pengguna.kelas}` : pengguna.peran === 'admin' ? 'Administrator' : 'Guru'}</Pil>
                  </div>
                  <button onClick={() => navigate(siswa ? '/siswa/profil' : '/admin/profil')} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[0.82rem] font-semibold text-body transition hover:bg-ink-700">
                    <UserCircle size={15} /> Profil & keamanan
                  </button>
                  <button onClick={() => { bunyi('klik'); keluar(); navigate('/masuk') }} className="flex w-full items-center gap-2.5 border-t border-line-soft px-3 py-2.5 text-left text-[0.82rem] font-semibold text-rose transition hover:bg-rose/10">
                    <LogOut size={15} /> Keluar dari akun
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1500px] px-4 pt-5 pb-16 sm:px-6 sm:pt-7">
          <Suspense fallback={<Rangka baris={6} className="min-h-[55vh]" />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="relative border-t border-line-soft px-6 py-4">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 text-[0.7rem] text-mute">
            <span className="flex items-center gap-1.5"><GraduationCap size={13} className="text-violet" /> {sekolah.nama_aplikasi} · Ruang ujian digital {sekolah.nama_sekolah}</span>
            <span className="font-mono">React · Vite · Tailwind · PostgreSQL</span>
          </div>
        </footer>
      </div>
    </div>
  )
}