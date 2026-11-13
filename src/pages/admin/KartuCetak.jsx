import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ImageOff, Printer } from 'lucide-react'
import { api } from '../../lib/api'
import { Tombol, Galat, Rangka } from '../../components/ui'
import { Logo } from '../../components/Logo'
import KartuUjian from '../../components/KartuUjian'
import { useSekolah } from '../../context/SekolahContext'

export default function KartuCetak() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sekolah = useSekolah()

  const kelas = params.get('kelas') || ''
  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (kelas) p.set('kelas', kelas)
    return p.toString()
  }, [kelas])

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['kartu', queryString],
    queryFn: () => api(`/kartu?${queryString}`),
    enabled: !!kelas,
  })

  const judul = `Kartu Ujian Kelas ${kelas}`
  const peserta = data?.peserta || []
  const tanpaFoto = peserta.filter((p) => !p.foto_url).length

  useEffect(() => {
    const lama = document.title
    document.title = kelas ? `Kartu Ujian — ${kelas}` : 'Kartu Ujian'
    return () => { document.title = lama }
  }, [kelas])

  if (!kelas) return <Navigate to="/admin/kartu" replace />

  const cetak = () => {
    // Beri waktu satu putaran render + pemuatan gambar bertanda tangan sebelum dialog cetak.
    setTimeout(() => window.print(), 350)
  }

  return (
    <div className="min-h-screen bg-neutral-300 print:min-h-0 print:bg-white">
      <div className="tanpa-cetak sticky top-0 z-20 border-b border-neutral-400 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-3 px-4 py-3">
          <Tombol varian="kedua" ikon={ArrowLeft} onClick={() => navigate(`/admin/kartu${queryString}`)}>
            Kembali
          </Tombol>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-extrabold text-neutral-900">{judul}</p>
            <p className="text-[0.72rem] text-neutral-600">
              {sekolah.nama_sekolah} · {peserta.length} kartu
              {tanpaFoto ? ` · ${tanpaFoto} peserta belum berfoto` : ''}
            </p>
          </div>
          <Tombol varian="utama" ikon={Printer} onClick={cetak} disabled={!peserta.length}>
            Cetak / Simpan PDF
          </Tombol>
        </div>
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-2">
          <p className="flex items-center gap-1.5 text-[0.7rem] text-neutral-500">
            <ImageOff size={12} />
            Kartu memuat password akun. Di dialog cetak pilih “Simpan sebagai PDF” bila kartu ingin dibagikan secara digital.
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mx-auto my-8 w-[210mm] max-w-full bg-white p-6 shadow-2xl">
          <Rangka baris={8} />
        </div>
      ) : error ? (
        <div className="mx-auto my-8 w-[210mm] max-w-full bg-white p-6 shadow-2xl">
          <Galat pesan={error.message} onUlang={refetch} />
        </div>
      ) : (
        <div className="lembar-cetak mx-auto my-6 w-[210mm] max-w-full bg-white px-[10mm] py-[8mm] text-neutral-900 shadow-2xl print:my-0 print:w-auto print:max-w-none print:px-0 print:py-0 print:shadow-none">
          <header className="mb-[6mm] flex items-center gap-3 border-b-2 border-neutral-900 pb-2">
            <Logo ukuran={40} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[0.95rem] leading-tight font-extrabold tracking-wide text-neutral-900 uppercase">{sekolah.nama_sekolah}</h1>
              {sekolah.alamat_sekolah && (
                <p className="text-[0.62rem] leading-tight text-neutral-600">{sekolah.alamat_sekolah}</p>
              )}
              <p className="mt-0.5 text-[0.68rem] text-neutral-600">
                Kartu peserta ujian · Tahun ajaran {sekolah.tahun_ajaran}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.7rem] font-bold">Kelas {kelas}</p>
              <p className="text-[0.62rem] text-neutral-600">{peserta.length} peserta</p>
            </div>
          </header>

          {!peserta.length ? (
            <p className="py-16 text-center text-[0.8rem] text-neutral-600">
              Tidak ada peserta aktif pada kelas ini. Tambahkan akun peserta lebih dulu melalui menu Peserta &amp; Akun.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-[4mm] sm:grid-cols-2 print:grid-cols-2">
              {peserta.map((p) => (
                <KartuUjian key={p.id} peserta={p} />
              ))}
            </div>
          )}

          <p className="mt-[6mm] border-t border-neutral-300 pt-1.5 text-[0.55rem] text-neutral-500">
            Dicetak dari {sekolah.nama_aplikasi} · {peserta.length} kartu · {tanpaFoto ? `${tanpaFoto} kartu memakai kotak inisial karena foto belum diunggah.` : 'Seluruh kartu dilengkapi foto peserta.'} Password akun bersifat rahasia—bagikan kartu hanya kepada pemiliknya.
          </p>
        </div>
      )}
    </div>
  )
}
