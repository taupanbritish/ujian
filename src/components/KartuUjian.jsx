import { useSekolah } from '../context/SekolahContext'
import { Logo } from '../components/Logo'
import { inisial } from '../lib/format'

/**
 * Kartu peserta per kelas. Warna sengaja hitam-putih agar aman dicetak di
 * printer sekolah, dan ukuran foto tetap sama saat foto belum diunggah.
 * Isi kartu: alamat di bawah nama sekolah, foto, nama, kelas, username, password.
 */
export default function KartuUjian({ peserta }) {
  const sekolah = useSekolah()
  return (
    <article className="pecah-hindari relative overflow-hidden rounded-lg border-2 border-neutral-800 bg-white text-neutral-900">
      <div className="flex items-center gap-2 border-b-2 border-neutral-800 px-3 py-2">
        <Logo ukuran={26} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] leading-tight font-extrabold tracking-wide uppercase">{sekolah.nama_sekolah}</p>
          {sekolah.alamat_sekolah && (
            <p className="mt-0.5 text-[0.5rem] leading-tight text-neutral-600">{sekolah.alamat_sekolah}</p>
          )}
        </div>
        <span className="flex-none rounded border border-neutral-800 px-1.5 py-0.5 text-[0.46rem] leading-none font-bold tracking-[0.14em] uppercase">
          Kartu Ujian
        </span>
      </div>

      <div className="flex gap-2.5 p-3">
        <div className="grid h-[29mm] w-[21.5mm] flex-none place-items-center overflow-hidden border border-neutral-400 bg-neutral-100">
          {peserta.foto_url ? (
            <img src={peserta.foto_url} alt={`Foto ${peserta.nama}`} className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-neutral-400">
              <span className="text-[1.1rem] font-extrabold text-neutral-500">{inisial(peserta.nama)}</span>
              <span className="text-[0.44rem] font-bold tracking-widest uppercase">Foto 3 × 4</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[0.46rem] font-bold tracking-[0.16em] text-neutral-500 uppercase">Nama peserta</p>
          <p className="truncate text-[0.82rem] leading-tight font-extrabold">{peserta.nama}</p>
          <div className="mt-1 flex items-baseline justify-between gap-2 text-[0.62rem]">
            <span className="text-neutral-500">Kelas</span>
            <span className="truncate font-semibold">{peserta.kelas || '—'}</span>
          </div>
          <div className="mt-1.5 rounded border border-neutral-400 bg-neutral-100 px-1.5 py-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[0.42rem] font-bold tracking-[0.12em] text-neutral-500 uppercase">Username</span>
              <span className="min-w-0 text-right font-mono text-[0.58rem] font-extrabold break-all">{peserta.nis || '—'}</span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-[0.42rem] font-bold tracking-[0.12em] text-neutral-500 uppercase">Password</span>
              <span className="min-w-0 text-right font-mono text-[0.58rem] font-extrabold break-all">{peserta.sandi || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-300 bg-neutral-50 px-3 py-1">
        <span className="text-[0.46rem] leading-tight text-neutral-500">Simpan kartu ini dan tunjukkan kepada pengawas saat ujian.</span>
        <span className="flex-none font-mono text-[0.46rem] text-neutral-500">TA {sekolah.tahun_ajaran}</span>
      </div>
    </article>
  )
}
