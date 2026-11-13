import { Logo } from './Logo'
import { useSekolah } from '../context/SekolahContext'

/**
 * Kop surat resmi untuk dokumen cetak (laporan, dsb.). Sengaja hitam-putih
 * dengan latar putih agar hasil cetak/PDF tetap tajam, memuat logo sekolah,
 * nama sekolah, dan alamat sekolah dari Pengaturan.
 */
export default function KopSurat({ judul, keterangan }) {
  const sekolah = useSekolah()
  return (
    <header className="mb-4 text-neutral-900">
      <div className="flex items-center gap-4">
        <Logo ukuran={62} />
        <div className="min-w-0 flex-1 pr-[78px] text-center">
          <h1 className="text-[1.15rem] leading-tight font-extrabold tracking-wide text-neutral-900 uppercase">
            {sekolah.nama_sekolah}
          </h1>
          {sekolah.alamat_sekolah ? (
            <p className="mt-0.5 text-[0.72rem] leading-snug text-neutral-600">{sekolah.alamat_sekolah}</p>
          ) : (
            <p className="mt-0.5 text-[0.68rem] text-neutral-400">Alamat sekolah dapat dilengkapi di menu Pengaturan</p>
          )}
        </div>
      </div>
      <div className="mt-[3mm] border-t-2 border-neutral-900" />
      <div className="mt-[1mm] border-t border-neutral-900" />
      <div className="mt-[2.5mm] text-center">
        <h2 className="text-[1rem] font-extrabold tracking-[0.08em] text-neutral-900 uppercase">{judul}</h2>
        {keterangan && <p className="mt-0.5 text-[0.7rem] text-neutral-600">{keterangan}</p>}
      </div>
    </header>
  )
}
