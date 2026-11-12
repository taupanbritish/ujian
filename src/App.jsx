import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { Logo } from './components/Logo'
import { Tombol } from './components/ui'
import AppShell from './components/AppShell'
import Login from './pages/Login'

const Ringkasan = lazy(() => import('./pages/admin/Ringkasan'))
const BankSoal = lazy(() => import('./pages/admin/BankSoal'))
const Ujian = lazy(() => import('./pages/admin/Ujian'))
const UjianDetail = lazy(() => import('./pages/admin/UjianDetail'))
const Monitoring = lazy(() => import('./pages/admin/Monitoring'))
const Hasil = lazy(() => import('./pages/admin/Hasil'))
const Mapel = lazy(() => import('./pages/admin/Mapel'))
const Peserta = lazy(() => import('./pages/admin/Peserta'))
const Pengaturan = lazy(() => import('./pages/admin/Pengaturan'))
const Profil = lazy(() => import('./pages/Profil'))
const BerandaSiswa = lazy(() => import('./pages/siswa/Beranda'))
const Riwayat = lazy(() => import('./pages/siswa/Riwayat'))
const RuangUjian = lazy(() => import('./pages/siswa/RuangUjian'))
const HasilSiswa = lazy(() => import('./pages/siswa/HasilSiswa'))

function MemuatSesi() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="anim-apung"><Logo ukuran={56} /></div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-ink-800">
          <div className="rangka h-full w-full" />
        </div>
        <p className="font-mono text-[0.72rem] tracking-widest text-mute uppercase">Menyiapkan ruang ujian</p>
      </div>
    </div>
  )
}

// Guru mendarat di Bank Soal (alur mengajar pertama); admin di Ringkasan;
// peserta di beranda siswa. Dipakai semua pengarah agar konsisten.
const berandaPeran = (peran) => (peran === 'siswa' ? '/siswa' : peran === 'guru' ? '/admin/bank-soal' : '/admin')

function ButuhPeran({ peran, children }) {
  const { pengguna, memuat } = useAuth()
  const lokasi = useLocation()
  if (memuat) return <MemuatSesi />
  if (!pengguna) return <Navigate to="/masuk" state={{ dari: lokasi.pathname }} replace />
  const cocok = peran === 'staf' ? pengguna.peran !== 'siswa' : pengguna.peran === peran
  if (!cocok) return <Navigate to={berandaPeran(pengguna.peran)} replace />
  return children
}

// Ringkasan, Mata Pelajaran, Peserta & Akun, dan Pengaturan hanya administrator.
// Guru yang mencoba membuka rute ini dialihkan ke Bank Soal.
function HanyaAdmin({ children }) {
  const { pengguna } = useAuth()
  if (pengguna?.peran !== 'admin') return <Navigate to="/admin/bank-soal" replace />
  return children
}

function Awal() {
  const { pengguna, memuat } = useAuth()
  if (memuat) return <MemuatSesi />
  if (!pengguna) return <Navigate to="/masuk" replace />
  return <Navigate to={berandaPeran(pengguna.peran)} replace />
}

function TidakAda() {
  const { pengguna } = useAuth()
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-6">
      <div className="aurora opacity-40" />
      <div className="relative text-center">
        <Logo ukuran={54} />
        <p className="mt-6 font-display text-[5rem] leading-none text-chalk">404</p>
        <h1 className="mt-2 text-[1.3rem]">Halaman tidak ada di lembar ini</h1>
        <p className="mx-auto mt-2 max-w-sm text-[0.85rem] text-mute">
          Tautan yang Anda buka tidak terdaftar. Kembali ke ruang kerja untuk melanjutkan.
        </p>
        <Tombol
          varian="utama"
          ikon={Compass}
          className="mt-6"
          onClick={() => { window.location.href = pengguna ? berandaPeran(pengguna.peran) : '/masuk' }}
        >
          Kembali ke ruang utama
        </Tombol>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<MemuatSesi />}>
      <Routes>
        <Route path="/masuk" element={<Login />} />
        <Route path="/" element={<Awal />} />

        <Route path="/admin" element={<ButuhPeran peran="staf"><AppShell /></ButuhPeran>}>
          <Route index element={<HanyaAdmin><Ringkasan /></HanyaAdmin>} />
          <Route path="bank-soal" element={<BankSoal />} />
          <Route path="ujian" element={<Ujian />} />
          <Route path="ujian/:id" element={<UjianDetail />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="hasil" element={<Hasil />} />
          <Route path="mapel" element={<HanyaAdmin><Mapel /></HanyaAdmin>} />
          <Route path="peserta" element={<HanyaAdmin><Peserta /></HanyaAdmin>} />
          <Route path="pengaturan" element={<HanyaAdmin><Pengaturan /></HanyaAdmin>} />
          <Route path="profil" element={<Profil />} />
        </Route>

        <Route path="/siswa" element={<ButuhPeran peran="siswa"><AppShell /></ButuhPeran>}>
          <Route index element={<BerandaSiswa />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="hasil/:id" element={<HasilSiswa />} />
          <Route path="profil" element={<Profil />} />
        </Route>

        <Route path="/siswa/ujian/:id" element={<ButuhPeran peran="siswa"><RuangUjian /></ButuhPeran>} />
        <Route path="*" element={<TidakAda />} />
      </Routes>
    </Suspense>
  )
}