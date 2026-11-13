import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IdCard, Printer, Users, Camera, ImageOff, CalendarDays, Clock, School,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  Tombol, Pil, Kosong, Galat, Rangka, JudulBagian,
} from '../../components/ui'
import KartuUjian from '../../components/KartuUjian'
import { STATUS_UJIAN, tanggal } from '../../lib/format'

const PRATINJAU_MAKS = 6

function KartuRingkas({ label, nilai, ikon: Ikon, warna, petunjuk }) {
  return (
    <div className="kartu relative overflow-hidden p-3.5">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: warna }} />
      <Ikon size={15} style={{ color: warna }} />
      <p className="mt-2 font-mono text-[1.4rem] leading-none font-bold text-chalk">{nilai}</p>
      <p className="mt-1.5 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">{label}</p>
      {petunjuk && <p className="mt-1 text-[0.64rem] text-mute">{petunjuk}</p>}
    </div>
  )
}

export default function Kartu() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const ujianId = params.get('ujian_id') || ''
  const kelas = params.get('kelas') || 'semua'

  const ubah = (kunci, nilai) => {
    const p = new URLSearchParams(params)
    if (!nilai || nilai === 'semua') p.delete(kunci)
    else p.set(kunci, nilai)
    setParams(p, { replace: true })
  }

  const { data: daftarUjian, isPending: memuatUjian } = useQuery({
    queryKey: ['ujian'],
    queryFn: () => api('/ujian'),
    staleTime: 60000,
  })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })

  const ujian = useMemo(
    () => (daftarUjian?.data || []).find((u) => String(u.id) === String(ujianId)),
    [daftarUjian, ujianId],
  )

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (ujianId) p.set('ujian_id', ujianId)
    if (kelas !== 'semua') p.set('kelas', kelas)
    return p.toString()
  }, [ujianId, kelas])

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['kartu', queryString],
    queryFn: () => api(`/kartu?${queryString}`),
    enabled: !!ujianId,
    placeholderData: (d) => d,
  })

  const peserta = data?.peserta || []
  const berfoto = peserta.filter((p) => p.foto_url).length
  const tanpaFoto = peserta.length - berfoto
  const pratinjau = peserta.slice(0, PRATINJAU_MAKS)

  const cetak = () => {
    if (!peserta.length) {
      toast.ingat('Belum ada peserta untuk dicetak', { pesan: 'Pilih ujian yang memiliki peserta pada kelas sasaran.' })
      return
    }
    navigate(`/admin/kartu/cetak?${queryString}`)
  }

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Administrasi ujian"
        judul="Cetak kartu ujian"
        pesan="Kartu memuat identitas sekolah, logo, dan foto peserta. Unduh foto lewat Peserta & Akun agar kartu tampil lengkap."
        kanan={
          <Tombol varian="utama" ikon={Printer} onClick={cetak} disabled={!peserta.length}>
            Cetak kartu
          </Tombol>
        }
      />

      <section className="kartu p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
          <label>
            <span className="label-field">Ujian</span>
            <select
              value={ujianId}
              onChange={(e) => ubah('ujian_id', e.target.value)}
              className="kolom-field py-2.5 text-[0.84rem]"
              aria-label="Pilih ujian"
            >
              <option value="">{memuatUjian ? 'Memuat ujian…' : 'Pilih ujian…'}</option>
              {(daftarUjian?.data || []).map((u) => (
                <option key={u.id} value={u.id}>{u.judul} · {u.mapel_nama}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-field">Kelas</span>
            <select
              value={kelas}
              onChange={(e) => ubah('kelas', e.target.value)}
              className="kolom-field py-2.5 text-[0.84rem]"
              aria-label="Saring kelas"
            >
              <option value="semua">Semua kelas sasaran</option>
              {(meta?.kelas || []).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            {ujian ? (
              <span className="pb-2 text-[0.72rem] text-mute">
                {ujian.kelas_target?.length ? `Sasaran: ${ujian.kelas_target.join(', ')}` : 'Sasaran: semua kelas'}
              </span>
            ) : (
              <span className="pb-2 text-[0.72rem] text-mute">Pilih ujian untuk melihat kartu pesertanya.</span>
            )}
          </div>
        </div>
      </section>

      {!ujianId ? (
        <div className="kartu p-4">
          <Kosong
            ikon={IdCard}
            judul="Belum ada ujian yang dipilih"
            pesan="Tentukan ujian lebih dulu. Kartu akan dibuat untuk seluruh peserta aktif pada kelas sasaran ujian."
            className="py-10"
          />
        </div>
      ) : isPending ? (
        <div className="kartu p-4"><Rangka baris={6} /></div>
      ) : error ? (
        <div className="kartu p-4"><Galat pesan={error.message} onUlang={refetch} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KartuRingkas label="Peserta" nilai={peserta.length} ikon={Users} warna="#7C5CFF" />
            <KartuRingkas label="Sudah berfoto" nilai={berfoto} ikon={Camera} warna="#A3E635" />
            <KartuRingkas label="Tanpa foto" nilai={tanpaFoto} ikon={ImageOff} warna="#FFB020" petunjuk={tanpaFoto ? 'Kartu memakai kotak inisial' : 'Semua kartu lengkap'} />
            <KartuRingkas label="Kelas tercakup" nilai={new Set(peserta.map((p) => p.kelas).filter(Boolean)).size} ikon={School} warna="#22D3EE" />
          </div>

          <section className="kartu p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-[1rem]">{ujian?.judul}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.72rem] text-mute">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: ujian?.mapel_warna }} />
                    {ujian?.mapel_nama} · {ujian?.mapel_kode}
                  </span>
                  <span className="flex items-center gap-1"><CalendarDays size={12} /> {tanggal(ujian?.mulai_pada, { jam: true })}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {ujian?.durasi_menit} menit</span>
                </div>
              </div>
              <span className="flex items-center gap-2">
                {isFetching && <Pil warna="#22D3EE">memperbarui…</Pil>}
                <Pil warna={STATUS_UJIAN[ujian?.status_efektif]?.warna}>{STATUS_UJIAN[ujian?.status_efektif]?.label || '—'}</Pil>
              </span>
            </div>

            {!peserta.length ? (
              <Kosong
                ikon={Users}
                judul="Belum ada peserta pada saringan ini"
                pesan="Pastikan kelas sasaran ujian sudah memiliki akun peserta aktif, atau pilih kelas lain."
                className="py-10"
              />
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pratinjau.map((p) => (
                    <div key={p.id} className="rounded-xl bg-white p-1 shadow-lift">
                      <KartuUjian ujian={{ ...data.ujian, ...ujian }} peserta={p} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
                  <p className="text-[0.72rem] text-mute">
                    Pratinjau {pratinjau.length} dari {peserta.length} kartu. Dokumen cetak memuat seluruh peserta dalam tata letak A4.
                  </p>
                  <Tombol ukuran="sm" varian="kedua" ikon={Printer} onClick={cetak}>Buka halaman cetak</Tombol>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
