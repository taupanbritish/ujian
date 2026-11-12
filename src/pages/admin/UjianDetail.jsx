import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, Undo2, GripVertical, Plus, X, Search, ListOrdered, Users, Pencil,
  Send, Lock, ChevronUp, ChevronDown, Check, Clock, Target, Layers, Radio, KeyRound, Sparkles,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useSekolah } from '../../context/SekolahContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, Kosong, Galat, Rangka, Segmen, Salin, Avatar, BilahProgres, OpsiMapel,
} from '../../components/ui'
import UjianForm from '../../components/UjianForm'
import { TIPE, TINGKAT, STATUS_UJIAN, tanggal, hitungMundur, nilaiTeks } from '../../lib/format'

export default function UjianDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sekolah = useSekolah()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [tab, setTab] = useState('soal')
  const [daftar, setDaftar] = useState(null)
  const [cari, setCari] = useState('')
  const [mapelFilter, setMapelFilter] = useState('')
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [seret, setSeret] = useState(null)
  const [tujuan, setTujuan] = useState(null)
  const refAsal = useRef(null)

  const { data, isPending, error, refetch } = useQuery({ queryKey: ['ujian-detail', id], queryFn: () => api(`/ujian/${id}`) })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })
  const { data: bank, isFetching: bankMemuat } = useQuery({
    queryKey: ['soal', { picker: true, cari, mapel: mapelFilter }],
    queryFn: () => {
      const p = new URLSearchParams({ batas: 40, urutan: 'terbaru' })
      if (cari) p.set('cari', cari)
      if (mapelFilter) p.set('mapel', mapelFilter)
      return api(`/soal?${p}`)
    },
    enabled: tab === 'soal',
  })

  useEffect(() => {
    if (data) setDaftar(data.soal.map((s) => ({ soal_id: s.id, bobot: Number(s.bobot), data: s })))
  }, [data])

  const simpan = useMutation({
    mutationFn: () => api(`/ujian/${id}/soal`, { method: 'PUT', body: { daftar: daftar.map((d) => ({ soal_id: d.soal_id, bobot: d.bobot })) } }),
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['ujian-detail', id] })
      qc.invalidateQueries({ queryKey: ['ujian'] })
      toast.sukses(d.pesan)
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Susunan belum tersimpan', { pesan: pesanGalat(e) }) },
  })

  const ubahStatus = useMutation({
    mutationFn: (status) => api(`/ujian/${id}/status`, { method: 'POST', body: { status } }),
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['ujian-detail', id] })
      qc.invalidateQueries({ queryKey: ['ujian'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(d.pesan)
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Status belum berubah', { pesan: pesanGalat(e) }) },
  })

  const berubah = useMemo(() => {
    if (!data || !daftar) return false
    if (data.soal.length !== daftar.length) return true
    return data.soal.some((s, i) => s.id !== daftar[i].soal_id || Number(s.bobot) !== Number(daftar[i].bobot))
  }, [data, daftar])

  const totalBobot = (daftar || []).reduce((a, b) => a + Number(b.bobot || 0), 0)
  const dipakai = new Set((daftar || []).map((d) => d.soal_id))
  const kandidat = (bank?.data || []).filter((s) => !dipakai.has(s.id))

  const tambah = (s) => {
    bunyi('pilih')
    setDaftar((d) => [...d, { soal_id: s.id, bobot: Number(s.bobot), data: s }])
  }
  const hapus = (idx) => {
    bunyi('klik')
    setDaftar((d) => d.filter((_, i) => i !== idx))
  }
  const geser = (dari, ke) => {
    if (ke < 0 || ke >= daftar.length) return
    bunyi('klik')
    setDaftar((d) => {
      const a = [...d]
      const [item] = a.splice(dari, 1)
      a.splice(ke, 0, item)
      return a
    })
  }

  if (isPending) return <Rangka baris={6} />
  if (error) return <Galat pesan={error.message} onUlang={refetch} />
  if (!daftar) return <Rangka baris={6} />

  const u = data.ujian
  const s = STATUS_UJIAN[u.status_efektif]
  const estimasi = Math.max(1, Math.round(totalBobot * 1.2))

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/admin/ujian')} className="inline-flex items-center gap-1.5 text-[0.78rem] font-bold text-mute transition hover:gap-2.5 hover:text-cyan">
        <ArrowLeft size={14} /> Kembali ke daftar ujian
      </button>

      <section className="kartu relative overflow-hidden p-5">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${s.warna})` }} />
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full opacity-20 blur-3xl" style={{ background: u.mapel_warna }} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Pil warna={u.mapel_warna}>{u.mapel_nama}</Pil>
              <Pil warna={s.warna}>{s.label}</Pil>
              <Pil warna="#8A93B8">#{u.id}</Pil>
            </div>
            <h2 className="mt-3 text-[1.5rem] leading-tight sm:text-[1.8rem]">{u.judul}</h2>
            {u.deskripsi && <p className="mt-2 text-[0.85rem] leading-relaxed text-mute">{u.deskripsi}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.76rem] text-mute">
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber" /> {tanggal(u.mulai_pada, { jam: true })} → {tanggal(u.selesai_pada, { jam: true })}</span>
              <span className="flex items-center gap-1.5"><Users size={12} className="text-sky" /> {u.kelas_target.length ? u.kelas_target.join(', ') : 'Semua kelas'}</span>
              {u.status_efektif === 'akan_datang' && <span className="font-bold text-cyan">Dibuka {hitungMundur(u.mulai_pada)} lagi</span>}
              {u.status_efektif === 'berlangsung' && <span className="font-bold text-lime">Ditutup {hitungMundur(u.selesai_pada)} lagi</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink-950/50 px-3 py-2">
              <KeyRound size={13} className="text-amber" />
              <span className="font-mono text-[0.95rem] font-bold tracking-[0.2em] text-chalk">{u.token}</span>
              <Salin teks={u.token} label="Salin" />
            </span>
            <Tombol varian="kedua" ikon={Pencil} onClick={() => setFormTerbuka(true)}>Pengaturan</Tombol>
            {u.status === 'terbit' ? (
              <Tombol varian="kedua" ikon={Lock} onClick={() => ubahStatus.mutate('ditutup')}>Tutup ujian</Tombol>
            ) : (
              <Tombol varian="sukses" ikon={Send} disabled={(daftar?.length || 0) === 0 || berubah} onClick={() => ubahStatus.mutate('terbit')}>Terbitkan</Tombol>
            )}
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-line-soft pt-4 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { l: 'Butir soal', n: daftar?.length ?? 0, w: '#7C5CFF', ikon: ListOrdered },
            { l: 'Total bobot', n: totalBobot, w: '#22D3EE', ikon: Layers },
            { l: 'Durasi', n: `${u.durasi_menit} mnt`, w: '#FFB020', ikon: Clock },
            { l: 'KKM', n: Number(u.kkm), w: '#A3E635', ikon: Target },
            { l: 'Peserta sasaran', n: u.sasaran, w: '#38BDF8', ikon: Users },
            { l: 'Rata-rata nilai', n: u.rata_nilai === null ? '—' : nilaiTeks(u.rata_nilai), w: '#F472B6', ikon: Sparkles },
          ].map((x) => {
            const Ikon = x.ikon
            return (
              <div key={x.l} className="rounded-xl border border-line-soft bg-ink-950/40 p-3">
                <Ikon size={14} style={{ color: x.w }} />
                <p className="mt-2 font-mono text-[1.2rem] leading-none font-bold text-chalk">{x.n}</p>
                <p className="mt-1.5 text-[0.68rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
              </div>
            )
          })}
        </div>
      </section>

      {berubah && (
        <div className="anim-naik sticky top-[76px] z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-amber/45 bg-ink-800/95 p-3 shadow-lift backdrop-blur-xl">
          <span className="grid size-8 place-items-center rounded-lg bg-amber/20 text-amber"><ListOrdered size={16} /></span>
          <p className="text-[0.84rem] font-semibold text-chalk">Susunan soal berubah dan belum tersimpan.</p>
          <span className="text-[0.76rem] text-mute">{daftar.length} butir · total bobot {totalBobot}</span>
          <div className="ml-auto flex gap-2">
            <Tombol ukuran="sm" varian="halus" ikon={Undo2} onClick={() => { setDaftar(data.soal.map((x) => ({ soal_id: x.id, bobot: Number(x.bobot), data: x }))); bunyi('klik') }}>Batalkan</Tombol>
            <Tombol ukuran="sm" varian="utama" ikon={Save} memuat={simpan.isPending} onClick={() => simpan.mutate()}>Simpan susunan</Tombol>
          </div>
        </div>
      )}

      <Segmen
        nilai={tab}
        onChange={setTab}
        pilihan={[{ nilai: 'soal', label: 'Susunan soal', jumlah: daftar?.length || 0 }, { nilai: 'peserta', label: 'Peserta sasaran', jumlah: data.peserta.length }]}
      />

      {tab === 'soal' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="kartu p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[1rem]">Urutan pengerjaan</h3>
                <p className="mt-0.5 text-[0.75rem] text-mute">Seret baris untuk mengubah urutan, atau pakai tombol panah. Bobot menentukan kontribusi nilai.</p>
              </div>
              <Pil warna="#22D3EE">bobot {totalBobot}</Pil>
            </div>

            {daftar.length === 0 ? (
              <Kosong ikon={ListOrdered} judul="Belum ada soal dipilih" pesan="Tambahkan butir dari panel bank soal di sebelah kanan." />
            ) : (
              <ol className="space-y-2">
                {daftar.map((item, i) => {
                  const d = item.data
                  const sedangSeret = seret === i
                  const jadiTujuan = tujuan === i && seret !== i
                  return (
                    <li
                      key={item.soal_id}
                      draggable
                      onDragStart={(e) => { setSeret(i); refAsal.current = i; e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnter={() => setTujuan(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (refAsal.current !== null) geser(refAsal.current, i); setSeret(null); setTujuan(null); refAsal.current = null }}
                      onDragEnd={() => { setSeret(null); setTujuan(null); refAsal.current = null }}
                      className="flex items-start gap-2 rounded-xl border bg-ink-950/40 p-2.5 transition-all"
                      style={{
                        borderColor: jadiTujuan ? '#22D3EE' : sedangSeret ? '#7C5CFF' : '#1c2549',
                        opacity: sedangSeret ? 0.45 : 1,
                        transform: jadiTujuan ? 'translateY(2px)' : undefined,
                        cursor: 'grab',
                      }}
                    >
                      <span className="mt-1 flex flex-col items-center gap-1">
                        <GripVertical size={14} className="text-mute" />
                        <span className="grid size-6 place-items-center rounded-md bg-ink-700 font-mono text-[0.7rem] font-bold text-chalk">{i + 1}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[0.82rem] leading-snug font-medium text-body">{d.pertanyaan}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Pil warna={TIPE[d.tipe].warna}>{TIPE[d.tipe].singkat}</Pil>
                          <Pil warna={TINGKAT[d.tingkat].warna}>{TINGKAT[d.tingkat].label}</Pil>
                          {d.topik && <span className="text-[0.68rem] text-mute">{d.topik}</span>}
                        </div>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1.5">
                        <label className="flex items-center gap-1">
                          <span className="text-[0.62rem] font-bold text-mute uppercase">Bobot</span>
                          <input
                            type="number" min="0.5" max="20" step="0.5" value={item.bobot}
                            onChange={(e) => setDaftar((dd) => dd.map((x, j) => (j === i ? { ...x, bobot: e.target.value === '' ? '' : Number(e.target.value) } : x)))}
                            onBlur={(e) => { if (!e.target.value || Number(e.target.value) < 0.5) setDaftar((dd) => dd.map((x, j) => (j === i ? { ...x, bobot: 1 } : x))) }}
                            className="kolom-field w-16 px-2 py-1 text-center font-mono text-[0.78rem]"
                            aria-label={`Bobot soal nomor ${i + 1}`}
                          />
                        </label>
                        <span className="flex gap-1">
                          <button onClick={() => geser(i, i - 1)} disabled={i === 0} aria-label="Naikkan urutan" className="grid size-6 place-items-center rounded-md border border-line-soft text-mute transition hover:border-cyan hover:text-cyan disabled:opacity-25"><ChevronUp size={12} /></button>
                          <button onClick={() => geser(i, i + 1)} disabled={i === daftar.length - 1} aria-label="Turunkan urutan" className="grid size-6 place-items-center rounded-md border border-line-soft text-mute transition hover:border-cyan hover:text-cyan disabled:opacity-25"><ChevronDown size={12} /></button>
                          <button onClick={() => hapus(i)} aria-label="Keluarkan soal" className="grid size-6 place-items-center rounded-md border border-line-soft text-mute transition hover:border-rose hover:text-rose"><X size={12} /></button>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}

            {daftar.length > 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-line-soft bg-ink-950/40 px-3 py-2 text-[0.74rem] text-mute">
                <Clock size={12} className="text-amber" /> Perkiraan waktu ideal ±{estimasi} menit dari total bobot. Durasi ujian diatur {u.durasi_menit} menit.
              </p>
            )}
          </section>

          <section className="kartu flex max-h-[760px] flex-col p-4">
            <div className="mb-3">
              <h3 className="text-[1rem]">Bank soal</h3>
              <p className="mt-0.5 text-[0.75rem] text-mute">{kandidat.length} butir tersedia dari {bank?.total ?? 0} hasil pencarian.</p>
            </div>
            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari pertanyaan atau topik…" className="kolom-field py-2 pl-9 text-[0.82rem]" aria-label="Cari soal untuk ditambahkan" />
              </div>
              <select value={mapelFilter} onChange={(e) => setMapelFilter(e.target.value)} className="kolom-field py-2 text-[0.82rem]" aria-label="Saring mapel bank soal">
                <option value="">Semua mata pelajaran</option>
                <OpsiMapel mapel={meta?.mapel || []} />
              </select>
              {kandidat.length > 0 && (
                <Tombol ukuran="sm" varian="kedua" ikon={Plus} className="w-full" onClick={() => { bunyi('pilih'); setDaftar((d) => [...d, ...kandidat.map((x) => ({ soal_id: x.id, bobot: Number(x.bobot), data: x }))]) }}>
                  Tambahkan semua {kandidat.length} hasil
                </Tombol>
              )}
            </div>

            <div className={`-mr-1 flex-1 space-y-2 overflow-y-auto pr-1 ${bankMemuat ? 'opacity-70' : ''}`}>
              {kandidat.length === 0 ? (
                <Kosong ikon={Check} judul="Semua hasil sudah masuk" pesan="Ubah kata pencarian atau saringan mapel untuk menemukan butir lain." className="py-8" />
              ) : kandidat.map((x) => (
                <div key={x.id} className="group flex items-start gap-2 rounded-xl border border-line-soft bg-ink-950/40 p-2.5 transition hover:border-violet/50">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[0.8rem] leading-snug text-body">{x.pertanyaan}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Pil warna={x.mapel_warna}>{x.mapel_kode}</Pil>
                      <Pil warna={TIPE[x.tipe].warna}>{TIPE[x.tipe].singkat}</Pil>
                      <Pil warna={TINGKAT[x.tingkat].warna}>{TINGKAT[x.tingkat].label}</Pil>
                      <span className="font-mono text-[0.66rem] text-mute">bobot {Number(x.bobot)}</span>
                    </div>
                  </div>
                  <button onClick={() => tambah(x)} aria-label="Tambahkan ke ujian" className="grid size-8 flex-none place-items-center rounded-lg border border-line bg-ink-800 text-mute transition group-hover:border-lime/60 group-hover:text-lime hover:bg-lime/15">
                    <Plus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="kartu overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-4">
            <div>
              <h3 className="text-[1rem]">Peserta sasaran</h3>
              <p className="mt-0.5 text-[0.75rem] text-mute">{data.peserta.length} peserta dari kelas {u.kelas_target.length ? u.kelas_target.join(', ') : `seluruh kelas ${sekolah.jenjang}`}.</p>
            </div>
            <div className="flex gap-2">
              {u.jumlah_berlangsung > 0 && <Tombol ukuran="sm" varian="sukses" ikon={Radio} onClick={() => navigate(`/admin/monitoring?ujian_id=${u.id}`)}>Awasi {u.jumlah_berlangsung} sesi</Tombol>}
              <Link to={`/admin/hasil?ujian_id=${u.id}`}><Tombol ukuran="sm" varian="kedua">Rekap nilai</Tombol></Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-line bg-ink-950/40">
                  {['Peserta', 'Kelas', 'NIS', 'Percobaan', 'Status terakhir', 'Nilai terbaik'].map((h) => (
                    <th key={h} className="p-3 text-[0.66rem] font-bold tracking-widest text-mute uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.peserta.map((p) => (
                  <tr key={p.id} className="garis-tabel">
                    <td className="p-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar nama={p.nama} gender={p.gender} ukuran={32} />
                        <span className="text-[0.84rem] font-semibold text-chalk">{p.nama}</span>
                      </span>
                    </td>
                    <td className="p-3"><Pil warna="#38BDF8">{p.kelas}</Pil></td>
                    <td className="p-3 font-mono text-[0.8rem] text-mute">{p.nis}</td>
                    <td className="p-3 font-mono text-[0.82rem] text-body">{p.percobaan}/{u.batas_percobaan}</td>
                    <td className="p-3">
                      {p.status_terakhir ? (
                        <Pil warna={p.status_terakhir === 'berlangsung' ? '#A3E635' : '#7C5CFF'}>{p.status_terakhir === 'berlangsung' ? 'Sedang mengerjakan' : 'Selesai'}</Pil>
                      ) : <Pil warna="#8A93B8">Belum mulai</Pil>}
                    </td>
                    <td className="p-3">
                      {p.nilai_terbaik === null ? <span className="text-mute">—</span> : (
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[0.88rem] font-bold text-chalk">{nilaiTeks(p.nilai_terbaik)}</span>
                          <BilahProgres nilai={p.nilai_terbaik} warna={p.nilai_terbaik >= Number(u.kkm) ? '#A3E635' : '#FFB020'} className="w-16" tinggi={4} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <UjianForm terbuka={formTerbuka} onTutup={() => setFormTerbuka(false)} ujian={u} mapel={meta?.mapel || []} kelas={meta?.kelas || []} />
    </div>
  )
}