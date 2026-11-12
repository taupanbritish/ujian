import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, FileStack, Pencil, Archive, Send, Lock, Radio, ChartNoAxesCombined,
  ListOrdered, Clock, Users, X, CalendarClock, KeyRound, RotateCcw, FileSpreadsheet, CheckCircle2, XCircle,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, TombolIkon, Pil, Kosong, Galat, Segmen, Konfirmasi, JudulBagian, BilahProgres, Salin, TitikNyala, OpsiMapel,
} from '../../components/ui'
import UjianForm from '../../components/UjianForm'
import ImporExcel from '../../components/ImporExcel'
import { STATUS_UJIAN, tanggal, hitungMundur, nilaiTeks, warnaNilai } from '../../lib/format'

// Kolom yang dikenali saat impor Excel paket ujian. Waktu dibaca sebagai teks.
const KOLOM_IMPOR_UJIAN = [
  { kunci: 'judul', label: 'Judul Ujian', wajib: true, contoh: 'Penilaian Harian 3 — Matematika' },
  { kunci: 'mapel', label: 'Mata Pelajaran', wajib: true, alias: ['mapel kode', 'kode mapel'], contoh: 'MTK' },
  { kunci: 'mulai_pada', label: 'Mulai (YYYY-MM-DD HH:mm)', wajib: true, alias: ['mulai', 'waktu mulai', 'tanggal mulai'], contoh: '2026-11-20 08:00' },
  { kunci: 'selesai_pada', label: 'Selesai (YYYY-MM-DD HH:mm)', wajib: true, alias: ['selesai', 'waktu selesai', 'tanggal selesai'], contoh: '2026-11-20 10:00' },
  { kunci: 'durasi_menit', label: 'Durasi (menit)', alias: ['durasi'], contoh: '90' },
  { kunci: 'kkm', label: 'KKM', contoh: '75' },
  { kunci: 'batas_percobaan', label: 'Batas Percobaan', alias: ['percobaan'], contoh: '1' },
  { kunci: 'kelas_target', label: 'Kelas Sasaran', alias: ['kelas', 'kelas target'], contoh: 'IX-A, IX-B' },
  { kunci: 'deskripsi', label: 'Deskripsi', contoh: 'Penilaian harian bab statistik.' },
]

export default function Ujian() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [status, setStatus] = useState(params.get('status') || 'semua')
  const [cari, setCari] = useState('')
  const [mapel, setMapel] = useState('')
  const [formTerbuka, setFormTerbuka] = useState(params.get('baru') === '1')
  const [ujianEdit, setUjianEdit] = useState(null)
  const [konfirmasi, setKonfirmasi] = useState(null)
  const [impor, setImpor] = useState(false)

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['ujian', { status, mapel, cari }],
    queryFn: () => {
      const p = new URLSearchParams({ status })
      if (mapel) p.set('mapel', mapel)
      if (cari) p.set('cari', cari)
      return api(`/ujian?${p}`)
    },
    refetchInterval: 45000,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['ujian'] })
    qc.invalidateQueries({ queryKey: ['ringkasan'] })
    qc.invalidateQueries({ queryKey: ['monitoring'] })
  }

  const ubahStatus = useMutation({
    mutationFn: ({ id, status: s }) => api(`/ujian/${id}/status`, { method: 'POST', body: { status: s } }),
    onSuccess: (d) => { bunyi('simpan'); refresh(); toast.sukses(d.pesan) },
    onError: (e) => { bunyi('gagal'); toast.gagal('Status belum berubah', { pesan: pesanGalat(e) }) },
  })

  const tokenBaru = useMutation({
    mutationFn: (id) => api(`/ujian/${id}/token`, { method: 'POST' }),
    onSuccess: (d) => { bunyi('simpan'); refresh(); toast.sukses(d.pesan, { pesan: `Token baru: ${d.token}` }) },
    onError: (e) => toast.gagal('Token gagal diperbarui', { pesan: pesanGalat(e) }),
  })

  const arsip = useMutation({
    mutationFn: (id) => api(`/ujian/${id}`, { method: 'DELETE' }),
    onSuccess: (d, id) => {
      bunyi('simpan')
      refresh()
      toast.info(d.pesan, {
        aksi: {
          label: 'Batalkan',
          fn: async () => {
            try {
              await api(`/ujian/${id}/pulihkan`, { method: 'POST' })
              refresh()
              toast.sukses('Ujian dipulihkan')
            } catch (e) { toast.gagal('Gagal memulihkan', { pesan: pesanGalat(e) }) }
          },
        },
      })
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Ujian gagal diarsipkan', { pesan: pesanGalat(e) }) },
  })

  const daftar = data?.data || []
  const pilihan = [
    { nilai: 'semua', label: 'Semua' },
    ...['berlangsung', 'akan_datang', 'selesai', 'draf', 'ditutup'].map((s) => ({ nilai: s, label: STATUS_UJIAN[s].label })),
  ]

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Penjadwalan perangkat"
        judul="Paket ujian"
        pesan="Atur jadwal, token, durasi, dan sasaran kelas. Peserta hanya melihat ujian yang diterbitkan dan sedang dalam rentang waktunya."
        kanan={
          <span className="flex flex-wrap items-center gap-2">
            <Tombol varian="kedua" ikon={FileSpreadsheet} onClick={() => { bunyi('buka'); setImpor(true) }}>Import Excel</Tombol>
            <Tombol varian="utama" ikon={Plus} onClick={() => { setUjianEdit(null); setFormTerbuka(true) }}>Buat ujian</Tombol>
          </span>
        }
      />

      <div className="kartu flex flex-wrap items-center gap-3 p-4">
        <Segmen nilai={status} onChange={(v) => { setStatus(v); params.set('status', v); setParams(params, { replace: true }) }} pilihan={pilihan} className="flex-wrap" />
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari judul atau token…" className="kolom-field pl-9" aria-label="Cari ujian" />
          {cari && <button onClick={() => setCari('')} aria-label="Bersihkan pencarian" className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-mute hover:text-chalk"><X size={14} /></button>}
        </div>
        <select value={mapel} onChange={(e) => setMapel(e.target.value)} className="kolom-field w-auto min-w-[150px]" aria-label="Saring mata pelajaran">
          <option value="">Semua mapel</option>
          <OpsiMapel mapel={meta?.mapel || []} />
        </select>
      </div>

      {error ? (
        <Galat pesan={error.message} onUlang={refetch} />
      ) : isPending ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="rangka h-64 rounded-2xl" />)}</div>
      ) : daftar.length === 0 ? (
        <Kosong
          ikon={FileStack}
          judul={status !== 'semua' || cari || mapel ? 'Tidak ada ujian pada saringan ini' : 'Belum ada paket ujian'}
          pesan="Buat paket ujian, pilih butir soal dari bank soal, lalu terbitkan agar peserta dapat masuk dengan token."
          aksi={<Tombol varian="utama" ikon={Plus} onClick={() => { setUjianEdit(null); setFormTerbuka(true) }}>Buat ujian pertama</Tombol>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {daftar.map((u, i) => {
            const s = STATUS_UJIAN[u.status_efektif]
            const progres = u.sasaran ? Math.round((u.jumlah_selesai / u.sasaran) * 100) : 0
            return (
              <article key={u.id} className={`kartu kartu-hover anim-naik tunda-${Math.min(i % 6 + 1, 6)} relative flex flex-col overflow-hidden`}>
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${s.warna})` }} />
                <div className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full opacity-15 blur-3xl" style={{ background: u.mapel_warna }} />

                <div className="relative flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Pil warna={u.mapel_warna}>{u.mapel_nama}</Pil>
                    <div className="flex items-center gap-1.5">
                      {u.status_efektif === 'berlangsung' && <TitikNyala warna="#A3E635" />}
                      <Pil warna={s.warna}>{s.label}</Pil>
                    </div>
                  </div>

                  <Link to={`/admin/ujian/${u.id}`} className="mt-3 block">
                    <h3 className="line-clamp-2 min-h-[2.8rem] text-[1rem] leading-snug transition hover:text-cyan">{u.judul}</h3>
                  </Link>
                  {u.deskripsi && <p className="mt-1.5 line-clamp-2 text-[0.76rem] leading-snug text-mute">{u.deskripsi}</p>}

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[0.72rem]">
                    <span className="flex items-center gap-1.5 text-mute"><CalendarClock size={12} className="text-cyan" /> {tanggal(u.mulai_pada, { jam: true, tahun: false })}</span>
                    <span className="flex items-center gap-1.5 text-mute"><Clock size={12} className="text-amber" /> {u.durasi_menit} menit</span>
                    <span className="flex items-center gap-1.5 text-mute"><ListOrdered size={12} className="text-violet" /> {u.jumlah_soal} soal · bobot {u.total_bobot}</span>
                    <span className="flex items-center gap-1.5 text-mute"><Users size={12} className="text-sky" /> {u.kelas_target.length ? u.kelas_target.join(', ') : 'Semua kelas'}</span>
                  </div>

                  {(u.status_efektif === 'akan_datang' || u.status_efektif === 'berlangsung') && (
                    <p className="mt-2.5 rounded-lg border border-line-soft bg-ink-950/50 px-2.5 py-1.5 font-mono text-[0.72rem]" style={{ color: s.warna }}>
                      {u.status_efektif === 'akan_datang' ? `Dibuka ${hitungMundur(u.mulai_pada)} lagi` : `Ditutup ${hitungMundur(u.selesai_pada)} lagi`}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line-soft bg-ink-950/40 p-2.5">
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide text-mute uppercase"><KeyRound size={12} /> Token</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[0.9rem] font-bold tracking-[0.18em] text-chalk">{u.token}</span>
                      <Salin teks={u.token} label="Salin" />
                      <TombolIkon ikon={RotateCcw} label="Buat token baru" onClick={() => setKonfirmasi({ jenis: 'token', u })} />
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[0.72rem]">
                      <span className="text-mute">{u.jumlah_selesai}/{u.sasaran} peserta selesai{u.jumlah_berlangsung > 0 && <span className="ml-1.5 font-bold text-lime">· {u.jumlah_berlangsung} live</span>}</span>
                      <span className="font-mono font-bold" style={{ color: warnaNilai(u.rata_nilai, Number(u.kkm)) }}>{u.rata_nilai === null ? '—' : nilaiTeks(u.rata_nilai)}</span>
                    </div>
                    <BilahProgres nilai={progres} warna={u.mapel_warna} className="mt-1.5" />
                  </div>

                  {u.perlu_penilaian > 0 && (
                    <Link to={`/admin/hasil?ujian_id=${u.id}&penilaian=perlu`} className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber/35 bg-amber/10 px-2.5 py-1.5 text-[0.74rem] font-bold text-amber transition hover:bg-amber/18">
                      <Pencil size={12} /> {u.perlu_penilaian} lembar uraian menunggu dinilai
                    </Link>
                  )}
                </div>

                <div className="relative flex flex-wrap items-center justify-between gap-1.5 border-t border-line-soft bg-ink-950/40 p-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Tombol ukuran="sm" varian="utama" ikon={ListOrdered} onClick={() => navigate(`/admin/ujian/${u.id}`)}>Susun soal</Tombol>
                    {u.status === 'terbit' ? (
                      <Tombol ukuran="sm" varian="kedua" ikon={Lock} onClick={() => setKonfirmasi({ jenis: 'status', u, status: 'ditutup' })}>Tutup</Tombol>
                    ) : (
                      <Tombol ukuran="sm" varian="sukses" ikon={Send} onClick={() => ubahStatus.mutate({ id: u.id, status: 'terbit' })} disabled={u.jumlah_soal === 0}>Terbitkan</Tombol>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {u.jumlah_berlangsung > 0 && <TombolIkon ikon={Radio} label="Pengawasan langsung" onClick={() => navigate(`/admin/monitoring?ujian_id=${u.id}`)} />}
                    {u.jumlah_selesai > 0 && <TombolIkon ikon={ChartNoAxesCombined} label="Lihat hasil" onClick={() => navigate(`/admin/hasil?ujian_id=${u.id}`)} />}
                    <TombolIkon ikon={Pencil} label="Ubah pengaturan" onClick={() => { setUjianEdit(u); setFormTerbuka(true) }} />
                    <TombolIkon ikon={Archive} label="Arsipkan ujian" className="hover:border-rose/60 hover:text-rose" onClick={() => setKonfirmasi({ jenis: 'arsip', u })} />
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <UjianForm
        terbuka={formTerbuka}
        onTutup={() => { setFormTerbuka(false); setUjianEdit(null); if (params.get('baru')) { params.delete('baru'); setParams(params, { replace: true }) } }}
        ujian={ujianEdit}
        mapel={meta?.mapel || []}
        kelas={meta?.kelas || []}
        onTersimpan={(id) => { if (!ujianEdit) navigate(`/admin/ujian/${id}`) }}
      />

      <ImporExcel
        terbuka={impor}
        onTutup={() => setImpor(false)}
        judul="Import paket ujian dari Excel"
        keterangan="Unggah berkas .xlsx/.xls/.csv berisi jadwal ujian. Mata pelajaran dikenali dari kode atau nama (mis. MTK atau Matematika). Ujian hasil impor dibuat sebagai DRAF — pilih soal lalu terbitkan dari halaman detail ujian."
        ikon={FileSpreadsheet}
        warna="#A3E635"
        lebar="max-w-3xl"
        kolom={KOLOM_IMPOR_UJIAN}
        namaTemplate="template-ujian.xlsx"
        onKirim={async (baris) => {
          const h = await api('/ujian/import', { method: 'POST', body: { baris } })
          qc.invalidateQueries({ queryKey: ['ujian'] })
          qc.invalidateQueries({ queryKey: ['ringkasan'] })
          return h
        }}
        ringkasHasil={(h) => ([
          { label: 'Dibuat', nilai: h.dibuat, warna: '#A3E635', ikon: CheckCircle2 },
          { label: 'Dilewati', nilai: h.dilewati, warna: '#FFB020', ikon: Clock },
          { label: 'Gagal', nilai: h.galat, warna: '#FF4D6D', ikon: XCircle },
        ])}
        renderHasil={(h) => (
          <div className="space-y-3">
            {h.rincian_dibuat?.length > 0 && (
              <div className="rounded-xl border border-lime/35 bg-lime/8 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.78rem] font-bold text-lime">
                  <CheckCircle2 size={14} /> {h.rincian_dibuat.length} ujian dibuat sebagai draf
                </p>
                <div className="max-h-52 overflow-auto rounded-lg border border-line-soft">
                  <table className="w-full min-w-[460px] text-left">
                    <thead className="sticky top-0 bg-ink-950">
                      <tr className="border-b border-line">
                        {['Judul', 'Mapel', 'Token'].map((x) => (
                          <th key={x} className="p-2 text-[0.6rem] font-bold tracking-widest text-mute uppercase">{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {h.rincian_dibuat.map((u, i) => (
                        <tr key={i} className="border-b border-line-soft/60 last:border-0">
                          <td className="max-w-[18rem] truncate p-2 text-[0.76rem] text-chalk">{u.judul}</td>
                          <td className="p-2 text-[0.72rem] text-body">{u.mapel}</td>
                          <td className="p-2 font-mono text-[0.74rem] font-bold text-cyan">{u.token}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {h.rincian_galat?.length > 0 && (
              <div className="rounded-xl border border-rose/35 bg-rose/8 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.76rem] font-bold text-rose"><XCircle size={13} /> Baris gagal ({h.rincian_galat.length})</p>
                <ul className="max-h-28 space-y-0.5 overflow-auto text-[0.72rem] text-body">
                  {h.rincian_galat.map((x, i) => <li key={i}>Baris {x.baris} — {x.pesan}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      />

      <Konfirmasi
        state={konfirmasi && (konfirmasi.jenis === 'arsip' ? {
          judul: 'Arsipkan paket ujian?',
          keterangan: konfirmasi.u.judul,
          isi: 'Ujian disembunyikan dari daftar aktif. Seluruh percobaan, jawaban, dan rekap nilai tetap tersimpan dan dapat dipulihkan lewat notifikasi pembatalan.',
          label: 'Arsipkan ujian',
          ikon: Archive,
          ikonTombol: Archive,
        } : konfirmasi.jenis === 'token' ? {
          judul: 'Buat token baru?',
          keterangan: konfirmasi.u.judul,
          isi: 'Token lama langsung tidak berlaku. Peserta yang sudah masuk tetap dapat melanjutkan sesinya, tetapi peserta baru wajib memakai token yang baru.',
          label: 'Buat token baru',
          ikon: KeyRound,
          ikonTombol: RotateCcw,
          varian: 'utama',
          warna: '#22D3EE',
        } : {
          judul: 'Tutup ujian ini?',
          keterangan: konfirmasi.u.judul,
          isi: 'Peserta tidak dapat memulai sesi baru. Sesi yang sedang berjalan tetap lanjut sampai waktunya habis atau diakhiri pengawas.',
          label: 'Tutup ujian',
          ikon: Lock,
          ikonTombol: Lock,
        })}
        onTutup={() => setKonfirmasi(null)}
        onLanjut={() => {
          if (konfirmasi.jenis === 'arsip') arsip.mutate(konfirmasi.u.id)
          else if (konfirmasi.jenis === 'token') tokenBaru.mutate(konfirmasi.u.id)
          else ubahStatus.mutate({ id: konfirmasi.u.id, status: konfirmasi.status })
          setKonfirmasi(null)
        }}
      />
    </div>
  )
}