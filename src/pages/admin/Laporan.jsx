import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, BadgeCheck, ChartNoAxesCombined, Download, FileText, Filter,
  GraduationCap, PenLine, Trophy, Users, XCircle,
} from 'lucide-react'
import { api, pesanGalat, unduhBerkas } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, Kosong, Galat, Rangka, BilahProgres, Paginasi, JudulBagian,
} from '../../components/ui'
import { nilaiTeks, warnaNilai, tanggal } from '../../lib/format'

function KartuRingkas({ label, nilai, ikon: Ikon, warna }) {
  return (
    <div className="kartu relative overflow-hidden p-3.5">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: warna }} />
      <Ikon size={15} style={{ color: warna }} />
      <p className="mt-2 font-mono text-[1.4rem] leading-none font-bold text-chalk">{nilai}</p>
      <p className="mt-1.5 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">{label}</p>
    </div>
  )
}

function StatusNilai({ d }) {
  if (d.perlu_penilaian) return <Pil warna="#FFB020" ikon={PenLine}>Menunggu poin</Pil>
  return Number(d.nilai) >= Number(d.kkm)
    ? <Pil warna="#A3E635" ikon={BadgeCheck}>Tuntas</Pil>
    : <Pil warna="#FF4D6D" ikon={XCircle}>Belum tuntas</Pil>
}

const BATAS = 20

export default function Laporan() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { bunyi } = useSuara()
  const [mengunduh, setMengunduh] = useState(false)
  const [halaman, setHalaman] = useState(1)

  const mapelId = params.get('mapel_id') || ''
  const kelas = params.get('kelas') || 'semua'
  const ujianId = params.get('ujian_id') || ''

  const ubah = (kunci, nilai) => {
    const p = new URLSearchParams(params)
    if (!nilai || nilai === 'semua') p.delete(kunci)
    else p.set(kunci, nilai)
    setParams(p, { replace: true })
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (mapelId) p.set('mapel_id', mapelId)
    if (kelas !== 'semua') p.set('kelas', kelas)
    if (ujianId) p.set('ujian_id', ujianId)
    return p.toString()
  }, [mapelId, kelas, ujianId])

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['laporan', queryString],
    queryFn: () => api(`/laporan${queryString ? `?${queryString}` : ''}`),
    placeholderData: (d) => d,
  })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })
  const { data: daftarUjian } = useQuery({ queryKey: ['ujian'], queryFn: () => api('/ujian'), staleTime: 60000 })

  useEffect(() => { setHalaman(1) }, [queryString])

  const unduh = async () => {
    setMengunduh(true)
    bunyi('buka')
    try {
      await unduhBerkas(
        `/laporan/ekspor/csv${queryString ? `?${queryString}` : ''}`,
        `laporan-nilai-shanatech-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      toast.sukses('Laporan diunduh', { pesan: 'Berkas CSV memakai pemisah titik koma dan siap dibuka di Excel.' })
    } catch (e) {
      bunyi('gagal')
      toast.gagal('Laporan gagal diunduh', { pesan: pesanGalat(e) })
    } finally {
      setMengunduh(false)
    }
  }

  const perUjian = data?.perUjian || []
  const detail = data?.detail || []
  const r = data?.ringkas
  const tampil = detail.slice((halaman - 1) * BATAS, halaman * BATAS)
  const adaSaringan = mapelId || kelas !== 'semua' || ujianId
  const kembali = new URLSearchParams()
  if (kelas !== 'semua') kembali.set('kelas', kelas)
  if (ujianId) kembali.set('ujian_id', ujianId)

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Rekap & pelaporan"
        judul="Laporan hasil & nilai ujian"
        pesan="Rekap nilai yang sudah selesai dikelompokkan per mata pelajaran dan kelas. Saringan yang sama dipakai saat mengunduh CSV."
        kanan={
          <>
            <Tombol
              varian="kedua"
              ikon={ArrowLeft}
              onClick={() => { bunyi('buka'); navigate(`/admin/hasil${kembali.toString() ? `?${kembali}` : ''}`) }}
            >
              Buka hasil
            </Tombol>
            <Tombol varian="utama" ikon={Download} memuat={mengunduh} onClick={unduh} disabled={!detail.length}>
              Unduh CSV
            </Tombol>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuRingkas label="Ujian tercakup" nilai={isPending ? '…' : r?.ujian ?? 0} ikon={ChartNoAxesCombined} warna="#7C5CFF" />
        <KartuRingkas label="Lembar nilai" nilai={isPending ? '…' : r?.lembar ?? 0} ikon={FileText} warna="#22D3EE" />
        <KartuRingkas label="Rata-rata nilai" nilai={isPending ? '…' : nilaiTeks(r?.rata)} ikon={Trophy} warna="#A3E635" />
        <KartuRingkas label="Tuntas KKM" nilai={isPending ? '…' : `${r?.lulus ?? 0}/${r?.lembar ?? 0}`} ikon={BadgeCheck} warna="#34D399" />
      </div>

      <section className="kartu p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <label>
            <span className="label-field">Mata pelajaran</span>
            <select value={mapelId} onChange={(e) => ubah('mapel_id', e.target.value)} className="kolom-field py-2.5 text-[0.84rem]">
              <option value="">Semua mapel</option>
              {(meta?.mapel || []).map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </select>
          </label>
          <label>
            <span className="label-field">Kelas</span>
            <select value={kelas} onChange={(e) => ubah('kelas', e.target.value)} className="kolom-field py-2.5 text-[0.84rem]">
              <option value="semua">Semua kelas</option>
              {(meta?.kelas || []).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>
            <span className="label-field">Ujian</span>
            <select value={ujianId} onChange={(e) => ubah('ujian_id', e.target.value)} className="kolom-field py-2.5 text-[0.84rem]">
              <option value="">Semua ujian</option>
              {(daftarUjian?.data || []).map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            {adaSaringan ? (
              <Tombol ukuran="sm" varian="halus" ikon={Filter} onClick={() => { bunyi('klik'); setParams(new URLSearchParams(), { replace: true }) }}>
                Bersihkan saringan
              </Tombol>
            ) : (
              <span className="pb-2 text-[0.72rem] text-mute">Menampilkan seluruh mapel & kelas.</span>
            )}
          </div>
        </div>
      </section>

      {isPending ? (
        <div className="kartu p-4"><Rangka baris={6} /></div>
      ) : error ? (
        <div className="kartu p-4"><Galat pesan={error.message} onUlang={refetch} /></div>
      ) : !detail.length ? (
        <div className="kartu p-4">
          <Kosong
            ikon={ChartNoAxesCombined}
            judul="Belum ada nilai untuk dilaporkan"
            pesan={adaSaringan ? 'Tidak ada lembar selesai yang cocok dengan mapel, kelas, atau ujian ini.' : 'Laporan terisi setelah peserta menyelesaikan ujian.'}
            aksi={adaSaringan ? <Tombol ukuran="sm" varian="kedua" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Bersihkan saringan</Tombol> : undefined}
            className="py-10"
          />
        </div>
      ) : (
        <>
          <section className="kartu overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft p-4">
              <div>
                <h3 className="text-[1rem]">Rekap per ujian</h3>
                <p className="mt-0.5 text-[0.75rem] text-mute">{perUjian.length} ujian dengan lembar selesai pada saringan ini.</p>
              </div>
              {isFetching && <Pil warna="#22D3EE">memperbarui…</Pil>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-950/40">
                    {['Ujian', 'Kelas', 'Peserta', 'Rata-rata', 'Tertinggi', 'Terendah', 'Tuntas', 'Menunggu poin'].map((h) => (
                      <th key={h} className="p-3 text-[0.64rem] font-bold tracking-widest text-mute uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perUjian.map((x) => (
                    <tr key={x.id} className="garis-tabel">
                      <td className="p-3">
                        <span className="block max-w-[340px] truncate text-[0.84rem] font-semibold text-chalk" title={x.judul}>{x.judul}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ background: x.mapel_warna }} />
                          <span className="text-[0.68rem] text-mute">{x.mapel_nama} · {x.mapel_kode}</span>
                        </span>
                      </td>
                      <td className="p-3 text-[0.8rem] text-body">{x.kelas}</td>
                      <td className="p-3 font-mono text-[0.84rem] font-bold text-chalk">{x.peserta}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[0.92rem] font-bold" style={{ color: warnaNilai(x.rata, x.kkm) }}>{nilaiTeks(x.rata)}</span>
                          <span className="w-14"><BilahProgres nilai={x.rata ?? 0} warna={warnaNilai(x.rata, x.kkm)} tinggi={4} /></span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[0.62rem] text-mute">KKM {x.kkm}</span>
                      </td>
                      <td className="p-3 font-mono text-[0.84rem] text-lime">{nilaiTeks(x.tertinggi)}</td>
                      <td className="p-3 font-mono text-[0.84rem] text-rose">{nilaiTeks(x.terendah)}</td>
                      <td className="p-3">
                        <span className="font-mono text-[0.84rem] font-bold text-chalk">{x.lulus}/{x.peserta}</span>
                        <span className="mt-0.5 block text-[0.62rem] text-mute">{Math.round((x.lulus / Math.max(1, x.peserta)) * 100)}% tuntas</span>
                      </td>
                      <td className="p-3">
                        {x.perlu_penilaian > 0
                          ? <Pil warna="#FFB020" ikon={PenLine}>{x.perlu_penilaian} lembar</Pil>
                          : <span className="text-[0.72rem] text-mute">Sudah final</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="kartu overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft p-4">
              <div>
                <h3 className="text-[1rem]">Nilai per peserta</h3>
                <p className="mt-0.5 text-[0.75rem] text-mute">{detail.length} lembar nilai, diurutkan per kelas lalu nama.</p>
              </div>
              <span className="flex items-center gap-1.5 text-[0.72rem] text-mute"><Users size={13} /> {new Set(detail.map((d) => d.nis)).size} peserta</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-950/40">
                    {['Peserta', 'Kelas', 'Mata pelajaran', 'Ujian', 'Nilai', 'Status', 'Selesai'].map((h) => (
                      <th key={h} className="p-3 text-[0.64rem] font-bold tracking-widest text-mute uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((x) => (
                    <tr key={x.id} className="garis-tabel">
                      <td className="p-3">
                        <span className="block truncate text-[0.82rem] font-semibold text-chalk">{x.nama}</span>
                        <span className="block font-mono text-[0.64rem] text-mute">{x.nis}</span>
                      </td>
                      <td className="p-3 text-[0.8rem] text-body">{x.kelas || '—'}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ background: x.mapel_warna }} />
                          <span className="text-[0.72rem] text-body">{x.mapel_nama}</span>
                        </span>
                      </td>
                      <td className="max-w-[280px] p-3">
                        <span className="block truncate text-[0.8rem] text-body" title={x.ujian_judul}>{x.ujian_judul}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[0.95rem] font-bold" style={{ color: warnaNilai(x.nilai, x.kkm) }}>{nilaiTeks(x.nilai)}</span>
                        <span className="mt-0.5 block font-mono text-[0.62rem] text-mute">KKM {x.kkm}</span>
                      </td>
                      <td className="p-3"><StatusNilai d={x} /></td>
                      <td className="p-3 text-[0.74rem] text-mute">{tanggal(x.selesai_pada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.length > BATAS && (
              <div className="px-4 pb-4">
                <Paginasi halaman={halaman} batas={BATAS} total={detail.length} onChange={setHalaman} satuan="lembar" />
              </div>
            )}
          </section>

          <p className="flex items-start gap-1.5 text-[0.72rem] text-mute">
            <GraduationCap size={13} className="mt-0.5 flex-none text-violet" />
            Laporan hanya memuat percobaan berstatus selesai. Nilai yang masih menunggu poin uraian ditandai dan belum dihitung tuntas.
          </p>
        </>
      )}
    </div>
  )
}
