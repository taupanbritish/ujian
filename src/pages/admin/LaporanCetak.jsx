import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSekolah } from '../../context/SekolahContext'
import { Tombol, Galat, Rangka } from '../../components/ui'
import KopSurat from '../../components/KopSurat'
import { nilaiTeks, tanggal } from '../../lib/format'

const PERHALAMAN = 80

export default function LaporanCetak() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sekolah = useSekolah()
  const { pengguna } = useAuth()

  const mapelId = params.get('mapel_id') || ''
  const kelas = params.get('kelas') || 'semua'
  const ujianId = params.get('ujian_id') || ''

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (mapelId) p.set('mapel_id', mapelId)
    if (kelas !== 'semua') p.set('kelas', kelas)
    if (ujianId) p.set('ujian_id', ujianId)
    return p.toString()
  }, [mapelId, kelas, ujianId])

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['laporan', queryString],
    queryFn: () => api(`/laporan${queryString ? `?${queryString}` : ''}`),
  })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })
  const { data: daftarUjian } = useQuery({ queryKey: ['ujian'], queryFn: () => api('/ujian'), staleTime: 60000 })

  const detail = data?.detail || []
  const perUjian = data?.perUjian || []
  const r = data?.ringkas || {}

  const labelMapel = meta?.mapel?.find((m) => String(m.id) === String(mapelId))?.nama
  const labelUjian = (daftarUjian?.data || []).find((u) => String(u.id) === String(ujianId))?.judul

  const cakupan = [
    mapelId ? `Mata pelajaran ${labelMapel || `#${mapelId}`}` : 'Semua mata pelajaran',
    kelas !== 'semua' ? `Kelas ${kelas}` : 'Semua kelas',
    ujianId ? `Ujian ${labelUjian || `#${ujianId}`}` : 'Semua ujian',
  ].join(' · ')

  const dicetak = tanggal(new Date())

  useEffect(() => {
    const lama = document.title
    document.title = `Laporan Hasil Ujian — ${sekolah.nama_sekolah}`
    return () => { document.title = lama }
  }, [sekolah.nama_sekolah])

  const cetak = () => {
    setTimeout(() => window.print(), 350)
  }

  const halaman = []
  for (let i = 0; i < detail.length; i += PERHALAMAN) halaman.push(detail.slice(i, i + PERHALAMAN))

  return (
    <div className="min-h-screen bg-neutral-300 print:min-h-0 print:bg-white">
      <div className="tanpa-cetak sticky top-0 z-20 border-b border-neutral-400 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-3 px-4 py-3">
          <Tombol varian="kedua" ikon={ArrowLeft} onClick={() => navigate(`/admin/laporan${queryString ? `?${queryString}` : ''}`)}>
            Kembali
          </Tombol>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-extrabold text-neutral-900">Pratinjau laporan cetak</p>
            <p className="text-[0.72rem] text-neutral-600">{sekolah.nama_sekolah} · {detail.length} lembar nilai · {perUjian.length} ujian</p>
          </div>
          <Tombol varian="utama" ikon={Printer} onClick={cetak} disabled={!detail.length}>
            Cetak / Simpan PDF
          </Tombol>
        </div>
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-2">
          <p className="text-[0.7rem] text-neutral-500">
            Di dialog cetak pilih “Simpan sebagai PDF”. Kop surat memakai logo, nama, dan alamat sekolah dari menu Pengaturan.
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mx-auto my-8 w-[210mm] max-w-full bg-white p-8 shadow-2xl"><Rangka baris={10} /></div>
      ) : error ? (
        <div className="mx-auto my-8 w-[210mm] max-w-full bg-white p-8 shadow-2xl"><Galat pesan={error.message} onUlang={refetch} /></div>
      ) : (
        <div className="lembar-cetak mx-auto my-6 w-[210mm] max-w-full bg-white px-[12mm] py-[10mm] text-neutral-900 shadow-2xl print:my-0 print:w-auto print:max-w-none print:px-0 print:py-0 print:shadow-none">
          <KopSurat
            judul="Laporan Hasil Ujian"
            keterangan={`Tahun ajaran ${sekolah.tahun_ajaran} · Dicetak ${dicetak}`}
          />

          <p className="mb-3 text-[0.68rem] text-neutral-600">
            <span className="font-bold text-neutral-800">Cakupan: </span>{cakupan}
          </p>

          <section className="mb-4 grid grid-cols-4 gap-2 text-center">
            {[
              { l: 'Ujian tercakup', n: r.ujian ?? 0 },
              { l: 'Lembar nilai', n: r.lembar ?? 0 },
              { l: 'Rata-rata nilai', n: nilaiTeks(r.rata) },
              { l: 'Tuntas KKM', n: `${r.lulus ?? 0}/${r.lembar ?? 0}` },
            ].map((x) => (
              <div key={x.l} className="rounded border border-neutral-300 px-2 py-1.5">
                <p className="font-mono text-[1rem] leading-none font-extrabold">{x.n}</p>
                <p className="mt-1 text-[0.56rem] font-semibold tracking-wide text-neutral-500 uppercase">{x.l}</p>
              </div>
            ))}
          </section>

          {!detail.length ? (
            <p className="py-16 text-center text-[0.8rem] text-neutral-600">
              Tidak ada lembar nilai selesai yang cocok dengan cakupan ini. Ubah saringan pada halaman laporan.
            </p>
          ) : (
            <>
              <section className="mb-4">
                <h3 className="mb-1.5 text-[0.78rem] font-extrabold tracking-wide text-neutral-900 uppercase">Rekap per ujian</h3>
                <table className="w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Ujian</th>
                      <th className="w-[13mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Kelas</th>
                      <th className="w-[12mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Peserta</th>
                      <th className="w-[14mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Rata²</th>
                      <th className="w-[13mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Tinggi</th>
                      <th className="w-[13mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Rendah</th>
                      <th className="w-[14mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Tuntas</th>
                      <th className="w-[17mm] border border-neutral-300 px-1.5 py-1 text-[0.6rem] font-bold uppercase">Menunggu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perUjian.map((x) => (
                      <tr key={x.id} className="pecah-hindari">
                        <td className="border border-neutral-300 px-1.5 py-1 text-[0.64rem]">
                          <span className="block font-semibold">{x.judul}</span>
                          <span className="text-[0.56rem] text-neutral-500">{x.mapel_nama} · {x.mapel_kode}</span>
                        </td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-[0.64rem]">{x.kelas}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center font-mono text-[0.64rem]">{x.peserta}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center font-mono text-[0.64rem] font-bold">{nilaiTeks(x.rata)}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center font-mono text-[0.64rem]">{nilaiTeks(x.tertinggi)}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center font-mono text-[0.64rem]">{nilaiTeks(x.terendah)}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center font-mono text-[0.64rem]">{x.lulus}/{x.peserta}</td>
                        <td className="border border-neutral-300 px-1.5 py-1 text-center text-[0.6rem]">{x.perlu_penilaian ? `${x.perlu_penilaian} lembar` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {halaman.map((baris, h) => (
                <section key={h} className={h ? 'mt-4' : ''}>
                  <h3 className="mb-1.5 text-[0.78rem] font-extrabold tracking-wide text-neutral-900 uppercase">
                    Nilai per peserta{halaman.length > 1 ? ` · bagian ${h + 1}/${halaman.length}` : ''}
                  </h3>
                  <table className="w-full table-fixed border-collapse text-left">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="w-[7mm] border border-neutral-300 px-1 py-1 text-[0.56rem] font-bold uppercase">No</th>
                        <th className="border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">Peserta</th>
                        <th className="w-[19mm] border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">NIS</th>
                        <th className="w-[12mm] border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">Kelas</th>
                        <th className="border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">Mata pelajaran</th>
                        <th className="border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">Ujian</th>
                        <th className="w-[11mm] border border-neutral-300 px-1 py-1 text-[0.56rem] font-bold uppercase">Nilai</th>
                        <th className="w-[20mm] border border-neutral-300 px-1.5 py-1 text-[0.56rem] font-bold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baris.map((x, i) => {
                        const status = x.perlu_penilaian ? 'Menunggu poin' : Number(x.nilai) >= Number(x.kkm) ? 'Tuntas' : 'Belum tuntas'
                        return (
                          <tr key={x.id} className="pecah-hindari">
                            <td className="border border-neutral-300 px-1 py-1 text-center font-mono text-[0.58rem]">{h * PERHALAMAN + i + 1}</td>
                            <td className="border border-neutral-300 px-1.5 py-1 text-[0.6rem]">
                              <span className="block leading-tight font-semibold">{x.nama}</span>
                              <span className="block text-[0.5rem] text-neutral-500">{tanggal(x.selesai_pada)}</span>
                            </td>
                            <td className="border border-neutral-300 px-1.5 py-1 font-mono text-[0.58rem]">{x.nis || '—'}</td>
                            <td className="border border-neutral-300 px-1.5 py-1 text-[0.6rem]">{x.kelas || '—'}</td>
                            <td className="border border-neutral-300 px-1.5 py-1 text-[0.6rem]">{x.mapel_nama}</td>
                            <td className="border border-neutral-300 px-1.5 py-1 text-[0.6rem]">
                              <span className="block leading-tight">{x.ujian_judul}</span>
                            </td>
                            <td className="border border-neutral-300 px-1 py-1 text-center font-mono text-[0.66rem] font-bold">
                              {nilaiTeks(x.nilai)}
                              <span className="block text-[0.48rem] font-normal text-neutral-500">KKM {x.kkm}</span>
                            </td>
                            <td className="border border-neutral-300 px-1.5 py-1 text-[0.56rem]">{status}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </section>
              ))}
            </>
          )}

          <div className="pecah-hindari mt-8 grid grid-cols-2 gap-12 text-center text-[0.68rem]">
            <div>
              <p>Mengetahui,</p>
              <p className="font-semibold">Kepala Sekolah</p>
              <div className="h-14" />
              <p className="border-t border-neutral-500 pt-1">(...................................)</p>
            </div>
            <div>
              <p>{dicetak}</p>
              <p className="font-semibold">Administrator</p>
              <div className="h-14" />
              <p className="border-t border-neutral-500 pt-1">{pengguna?.nama || '(...................................)'}</p>
            </div>
          </div>

          <p className="mt-4 border-t border-neutral-300 pt-1.5 text-[0.55rem] text-neutral-500">
            Laporan hanya memuat percobaan berstatus selesai. Nilai yang masih menunggu poin uraian ditandai dan belum dihitung tuntas.
          </p>
        </div>
      )}
    </div>
  )
}
