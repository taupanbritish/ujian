import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, ChartNoAxesCombined, Trophy, TrendingDown, Users, BadgeCheck, ClipboardCheck,
  Eye, CheckCircle2, XCircle, CircleSlash, PenLine, Save, Sparkles, Clock, MonitorSmartphone,
  ArrowUpDown, Filter, ChevronRight, MessageSquareText, Award,
} from 'lucide-react'
import { api, pesanGalat, unduhBerkas } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, Avatar, Cincin, BilahProgres, Kosong, Galat, Rangka, Segmen, Laci, JudulBagian, Field, Memuat, Paginasi,
} from '../../components/ui'
import { BatangDistribusi } from '../../components/charts'
import {
  TIPE, TINGKAT, nilaiTeks, warnaNilai, tanggal, jamSaja, durasiPendek, jawabanTeks,
} from '../../lib/format'

const RENTANG = [
  { label: '0–19', min: 0, max: 19.99, warna: '#FF4D6D' },
  { label: '20–39', min: 20, max: 39.99, warna: '#FF7A45' },
  { label: '40–59', min: 40, max: 59.99, warna: '#FFB020' },
  { label: '60–69', min: 60, max: 69.99, warna: '#F472B6' },
  { label: '70–79', min: 70, max: 79.99, warna: '#38BDF8' },
  { label: '80–89', min: 80, max: 89.99, warna: '#22D3EE' },
  { label: '90–99', min: 90, max: 99.99, warna: '#A3E635' },
  { label: '100', min: 100, max: 100, warna: '#34D399' },
]

function StatusJawaban({ d }) {
  if (!(d.isi || '').trim()) return <Pil warna="#8A93B8" ikon={CircleSlash}>Kosong</Pil>
  if (d.skor === null || d.skor === undefined) {
    return d.tipe === 'esai'
      ? <Pil warna="#FFB020" ikon={PenLine}>Menunggu dinilai</Pil>
      : <Pil warna="#8A93B8" ikon={CircleSlash}>Belum dinilai</Pil>
  }
  if (d.skor >= 1) return <Pil warna="#A3E635" ikon={CheckCircle2}>Benar</Pil>
  if (d.skor <= 0) return <Pil warna="#FF4D6D" ikon={XCircle}>Salah</Pil>
  return <Pil warna="#22D3EE" ikon={Sparkles}>{Math.round(d.skor * 100)}% poin</Pil>
}

function BarisEsai({ d, percobaanId, onTersimpan }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const [skor, setSkor] = useState(d.skor === null ? 0.5 : d.skor)
  const [catatan, setCatatan] = useState(d.catatan || '')
  useEffect(() => { setSkor(d.skor === null ? 0.5 : d.skor); setCatatan(d.catatan || '') }, [d.skor, d.catatan, d.jawaban_id])

  const simpan = useMutation({
    mutationFn: () => api(`/hasil/${percobaanId}/jawaban/${d.jawaban_id}`, { method: 'PATCH', body: { skor: Number(skor), catatan } }),
    onSuccess: (r) => { bunyi('simpan'); onTersimpan(r); toast.sukses(`Poin nomor ${d.nomor} tersimpan`, { pesan: `Nilai sementara menjadi ${nilaiTeks(r.rekap.nilai)}.` }) },
    onError: (e) => { bunyi('gagal'); toast.gagal('Poin belum tersimpan', { pesan: pesanGalat(e) }) },
  })

  const berubah = d.skor === null ? true : Number(d.skor) !== Number(skor) || (d.catatan || '') !== catatan

  return (
    <div className="mt-3 rounded-xl border border-pink/35 bg-[linear-gradient(140deg,rgba(244,114,182,0.09),rgba(8,11,26,0.4))] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[0.72rem] font-bold tracking-wide text-pink uppercase">
          <PenLine size={12} /> Penilaian manual
        </span>
        {d.penilai && <span className="text-[0.68rem] text-mute">dinilai oleh {d.penilai}</span>}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.74rem] font-semibold text-body">Poin yang diberikan</span>
          <span className="font-mono text-[1.05rem] font-bold text-pink">{Math.round(Number(skor) * 100)}<span className="text-[0.7rem] text-mute">/100</span></span>
        </div>
        <input
          type="range" min="0" max="1" step="0.05" value={skor}
          onChange={(e) => setSkor(Number(e.target.value))}
          className="mt-2 w-full accent-[#F472B6]"
          aria-label={`Poin soal uraian nomor ${d.nomor}`}
        />
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <button
              key={v}
              onClick={() => { bunyi('pilih'); setSkor(v) }}
              className={`rounded-lg border py-1.5 font-mono text-[0.72rem] font-bold transition ${
                Number(skor) === v ? 'border-pink bg-pink/20 text-pink' : 'border-line-soft bg-ink-950/50 text-mute hover:border-ink-500 hover:text-chalk'
              }`}
            >
              {v * 100}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.7rem] text-mute">
          Kontribusi ke nilai akhir: <span className="font-mono font-bold text-chalk">{(Number(skor) * Number(d.bobot)).toFixed(2)}</span> dari bobot {Number(d.bobot)}.
        </p>
      </div>

      <Field label="Catatan untuk peserta" className="mt-3">
        <textarea
          value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} maxLength={1000}
          placeholder="Tuliskan alasan pemberian poin, bagian yang sudah tepat, atau yang perlu diperbaiki…"
          className="kolom-field resize-y text-[0.82rem]"
        />
      </Field>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tombol ukuran="sm" varian="utama" ikon={Save} memuat={simpan.isPending} disabled={!berubah} onClick={() => simpan.mutate()}>
          {d.skor === null ? 'Simpan poin' : 'Perbarui poin'}
        </Tombol>
        {!berubah && d.skor !== null && <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-lime"><CheckCircle2 size={12} /> Tersimpan</span>}
        {berubah && <span className="text-[0.72rem] text-amber">Perubahan belum tersimpan</span>}
      </div>
    </div>
  )
}

function LembarHasil({ id, onTutup, onPerubahan }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [saringan, setSaringan] = useState('semua')
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['hasil-detail', id], queryFn: () => api(`/hasil/${id}`), enabled: !!id })

  const finalisasi = useMutation({
    mutationFn: () => api(`/hasil/${id}/finalisasi`, { method: 'POST' }),
    onSuccess: (r) => {
      bunyi('selesai')
      qc.invalidateQueries({ queryKey: ['hasil-detail', id] })
      onPerubahan()
      toast.sukses(r.pesan)
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Penilaian belum dapat dituntaskan', { pesan: pesanGalat(e) }) },
  })

  const tersimpan = () => {
    qc.invalidateQueries({ queryKey: ['hasil-detail', id] })
    onPerubahan()
  }

  const p = data?.percobaan
  const detail = (data?.detail || []).map((d, i) => ({ ...d, nomor: i + 1 }))
  const esaiBelum = detail.filter((d) => d.tipe === 'esai' && d.skor === null && (d.isi || '').trim()).length
  const tampil = useMemo(() => detail.filter((d) => {
    if (saringan === 'salah') return d.skor !== null && d.skor < 1
    if (saringan === 'esai') return d.tipe === 'esai'
    if (saringan === 'kosong') return !(d.isi || '').trim()
    return true
  }), [detail, saringan])

  return (
    <Laci
      terbuka={!!id}
      onTutup={onTutup}
      judul={p ? `Lembar jawaban · ${p.nama}` : 'Lembar jawaban'}
      keterangan={p ? `${p.ujian_judul} · ${p.kelas} · NIS ${p.nis}` : ''}
      lebar="max-w-3xl"
      warna={p?.mapel_warna || '#F472B6'}
      kaki={
        <>
          <span className="mr-auto text-[0.74rem] text-mute">
            {esaiBelum > 0 ? `${esaiBelum} jawaban uraian menunggu poin.` : 'Seluruh jawaban sudah memiliki poin.'}
          </span>
          <Tombol varian="halus" onClick={onTutup}>Tutup</Tombol>
          <Tombol
            varian="sukses"
            ikon={BadgeCheck}
            memuat={finalisasi.isPending}
            disabled={!p || esaiBelum > 0}
            onClick={() => finalisasi.mutate()}
          >
            Tuntaskan penilaian
          </Tombol>
        </>
      }
    >
      {isPending ? <Memuat pesan="Membuka lembar jawaban…" /> : error ? <Galat pesan={error.message} onUlang={refetch} /> : (
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-line-soft bg-ink-950/50 p-4">
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${p.mapel_warna}, ${warnaNilai(p.nilai, p.kkm)})` }} />
            <div className="flex flex-wrap items-center gap-4">
              <Cincin nilai={p.nilai ?? 0} ukuran={92} tebal={9} warna={warnaNilai(p.nilai, p.kkm)}>
                <span className="text-center">
                  <span className="block font-mono text-[1.5rem] leading-none font-bold text-chalk">{nilaiTeks(p.nilai)}</span>
                  <span className="mt-1 block text-[0.58rem] font-bold tracking-widest text-mute uppercase">KKM {p.kkm}</span>
                </span>
              </Cincin>
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar nama={p.nama} gender={p.gender} ukuran={30} />
                  <span className="text-[0.95rem] font-bold text-chalk">{p.nama}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Pil warna={p.mapel_warna}>{p.mapel_nama}</Pil>
                  {p.perlu_penilaian
                    ? <Pil warna="#FFB020" ikon={PenLine}>Menunggu penilaian</Pil>
                    : p.nilai >= p.kkm ? <Pil warna="#A3E635" ikon={BadgeCheck}>Tuntas</Pil> : <Pil warna="#FF4D6D" ikon={XCircle}>Belum tuntas</Pil>}
                  {p.fokus_hilang > 0 && <Pil warna="#FF7A45" ikon={Eye}>{p.fokus_hilang}× pindah tab</Pil>}
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-mute">
                  <span className="flex items-center gap-1"><Clock size={11} /> {durasiPendek(p.durasi_detik)} dari {p.durasi_menit} menit</span>
                  <span className="flex items-center gap-1"><MonitorSmartphone size={11} /> {p.perangkat || '—'}</span>
                  <span>{tanggal(p.selesai_pada, { jam: true })}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line-soft pt-3 sm:grid-cols-4">
              {[
                { l: 'Benar', n: p.benar, w: '#A3E635', ikon: CheckCircle2 },
                { l: 'Salah', n: p.salah, w: '#FF4D6D', ikon: XCircle },
                { l: 'Kosong', n: p.kosong, w: '#8A93B8', ikon: CircleSlash },
                { l: 'Peringkat kelas', n: data.rekan?.jumlah ? `${(data.rekan.di_atas || 0) + 1}/${data.rekan.jumlah}` : '—', w: '#22D3EE', ikon: Trophy },
              ].map((x) => {
                const Ikon = x.ikon
                return (
                  <div key={x.l} className="rounded-xl border border-line-soft bg-ink-900/60 p-2.5">
                    <Ikon size={13} style={{ color: x.w }} />
                    <p className="mt-1.5 font-mono text-[1.1rem] leading-none font-bold text-chalk">{x.n}</p>
                    <p className="mt-1 text-[0.62rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
                  </div>
                )
              })}
            </div>
            {data.rekan?.rata !== null && data.rekan?.rata !== undefined && (
              <p className="mt-3 text-[0.74rem] text-mute">
                Rata-rata peserta pada ujian ini <span className="font-mono font-bold text-chalk">{nilaiTeks(data.rekan.rata)}</span> dari {data.rekan.jumlah} lembar.
                Selisih Anda <span className="font-mono font-bold" style={{ color: p.nilai >= data.rekan.rata ? '#A3E635' : '#FFB020' }}>
                  {p.nilai >= data.rekan.rata ? '+' : ''}{(p.nilai - data.rekan.rata).toFixed(1)}
                </span>.
              </p>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmen
              nilai={saringan}
              onChange={setSaringan}
              pilihan={[
                { nilai: 'semua', label: 'Semua', jumlah: detail.length },
                { nilai: 'salah', label: 'Belum penuh', jumlah: detail.filter((d) => d.skor !== null && d.skor < 1).length },
                { nilai: 'esai', label: 'Uraian', jumlah: detail.filter((d) => d.tipe === 'esai').length },
                { nilai: 'kosong', label: 'Kosong', jumlah: detail.filter((d) => !(d.isi || '').trim()).length },
              ]}
            />
            <span className="text-[0.72rem] text-mute">Urutan sesuai lembar peserta</span>
          </div>

          {tampil.length === 0 ? (
            <Kosong ikon={Filter} judul="Tidak ada butir pada saringan ini" pesan="Pilih saringan lain untuk melihat jawaban peserta." className="py-8" />
          ) : (
            <ol className="space-y-3">
              {tampil.map((d) => {
                const jawaban = jawabanTeks(d, d.isi)
                const kosong = !jawaban
                return (
                  <li key={d.soal_id} className="rounded-2xl border border-line-soft bg-ink-850/60 p-3.5">
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="grid size-7 flex-none place-items-center rounded-lg bg-ink-700 font-mono text-[0.76rem] font-bold text-chalk">{d.nomor}</span>
                      <div className="flex flex-1 flex-wrap items-center gap-1.5">
                        <Pil warna={TIPE[d.tipe].warna}>{TIPE[d.tipe].singkat}</Pil>
                        <Pil warna={TINGKAT[d.tingkat].warna}>{TINGKAT[d.tingkat].label}</Pil>
                        {d.topik && <span className="text-[0.68rem] text-mute">{d.topik}</span>}
                        <span className="font-mono text-[0.66rem] text-mute">bobot {Number(d.bobot)}</span>
                      </div>
                      <StatusJawaban d={d} />
                    </div>

                    <p className="mt-2.5 text-[0.86rem] leading-relaxed whitespace-pre-wrap text-body">{d.pertanyaan}</p>

                    {d.opsi?.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {d.opsi.map((o) => {
                          const dipilih = d.isi === o.id
                          const benar = d.kunci === o.id
                          return (
                            <li
                              key={o.id}
                              className="flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[0.8rem] leading-snug"
                              style={{
                                borderColor: benar ? 'rgba(163,230,53,0.45)' : dipilih ? 'rgba(255,77,109,0.45)' : '#1c2549',
                                background: benar ? 'rgba(163,230,53,0.09)' : dipilih ? 'rgba(255,77,109,0.09)' : 'rgba(5,7,15,0.4)',
                                color: benar ? '#d7f5a0' : dipilih ? '#ffc2cd' : '#8a93b8',
                              }}
                            >
                              {d.tipe !== 'benar_salah' && <span className="mt-px font-mono text-[0.72rem] font-bold opacity-80">{o.id.toUpperCase()}.</span>}
                              <span className="flex-1">{o.teks}</span>
                              {benar && <CheckCircle2 size={13} className="mt-px flex-none text-lime" />}
                              {dipilih && !benar && <XCircle size={13} className="mt-px flex-none text-rose" />}
                              {dipilih && <span className="flex-none text-[0.62rem] font-bold tracking-wide uppercase">dipilih</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {!d.opsi?.length && (
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-line-soft bg-ink-950/50 p-2.5">
                          <p className="text-[0.62rem] font-bold tracking-widest text-mute uppercase">Jawaban peserta</p>
                          <p className={`mt-1 text-[0.82rem] leading-relaxed whitespace-pre-wrap ${kosong ? 'text-mute italic' : 'text-chalk'}`}>{jawaban || 'Tidak dijawab'}</p>
                        </div>
                        {d.tipe !== 'esai' && (
                          <div className="rounded-lg border border-lime/30 bg-lime/8 p-2.5">
                            <p className="text-[0.62rem] font-bold tracking-widest text-lime uppercase">Kunci jawaban</p>
                            <p className="mt-1 text-[0.82rem] leading-relaxed whitespace-pre-wrap text-chalk">{d.kunci || '—'}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {d.ragu && <p className="mt-2 text-[0.7rem] font-semibold text-amber">Peserta menandai butir ini ragu-ragu.</p>}

                    {d.tipe === 'esai' && (d.isi || '').trim() && (
                      <BarisEsai d={d} percobaanId={id} onTersimpan={tersimpan} />
                    )}

                    {d.catatan && d.tipe !== 'esai' && (
                      <p className="mt-2 flex items-start gap-1.5 text-[0.74rem] text-mute"><MessageSquareText size={12} className="mt-0.5 flex-none" /> {d.catatan}</p>
                    )}
                    {d.tipe === 'esai' && d.catatan && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-line-soft bg-ink-950/40 p-2 text-[0.74rem] leading-relaxed text-body">
                        <MessageSquareText size={12} className="mt-0.5 flex-none text-pink" /> {d.catatan}
                      </p>
                    )}

                    {d.pembahasan && d.tipe !== 'esai' && (
                      <details className="mt-2.5 rounded-lg border border-line-soft bg-ink-950/40 p-2.5">
                        <summary className="cursor-pointer text-[0.74rem] font-bold text-cyan">Pembahasan butir</summary>
                        <p className="mt-1.5 text-[0.78rem] leading-relaxed whitespace-pre-wrap text-mute">{d.pembahasan}</p>
                      </details>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}
    </Laci>
  )
}

export default function Hasil() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [terbuka, setTerbuka] = useState(null)
  const [mengunduh, setMengunduh] = useState(false)
  const [halaman, setHalaman] = useState(1)
  const BATAS = 12

  const ujianId = params.get('ujian_id') || ''
  const kelas = params.get('kelas') || 'semua'
  const cari = params.get('cari') || ''
  const urutan = params.get('urutan') || 'terbaru'
  const penilaian = params.get('penilaian') || 'semua'
  const kelulusan = params.get('kelulusan') || 'semua'

  const ubah = (kunci, nilai) => {
    const p = new URLSearchParams(params)
    if (!nilai || nilai === 'semua' || nilai === 'terbaru') p.delete(kunci)
    else p.set(kunci, nilai)
    setParams(p, { replace: true })
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (ujianId) p.set('ujian_id', ujianId)
    if (kelas !== 'semua') p.set('kelas', kelas)
    if (cari) p.set('cari', cari)
    if (urutan !== 'terbaru') p.set('urutan', urutan)
    if (penilaian !== 'semua') p.set('penilaian', penilaian)
    if (kelulusan !== 'semua') p.set('kelulusan', kelulusan)
    return p.toString()
  }, [ujianId, kelas, cari, urutan, penilaian, kelulusan])

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['hasil', queryString],
    queryFn: () => api(`/hasil${queryString ? `?${queryString}` : ''}`),
    placeholderData: (d) => d,
  })
  const { data: daftarUjian } = useQuery({ queryKey: ['ujian'], queryFn: () => api('/ujian'), staleTime: 60000 })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })

  const unduh = async () => {
    setMengunduh(true)
    bunyi('buka')
    try {
      await unduhBerkas(`/hasil/ekspor/csv${queryString ? `?${queryString}` : ''}`, `rekap-nilai-cendekia-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.sukses('Rekap nilai diunduh', { pesan: 'Berkas CSV memakai pemisah titik koma dan siap dibuka di Excel atau Google Sheets.' })
    } catch (e) {
      bunyi('gagal')
      toast.gagal('Rekap gagal diunduh', { pesan: pesanGalat(e) })
    } finally {
      setMengunduh(false)
    }
  }

  const perubahan = () => {
    qc.invalidateQueries({ queryKey: ['hasil'] })
    qc.invalidateQueries({ queryKey: ['ringkasan'] })
  }

  const rows = data?.data || []
  const r = data?.ringkas
  useEffect(() => { setHalaman(1) }, [queryString])
  const tampil = rows.slice((halaman - 1) * BATAS, halaman * BATAS)
  const distribusi = RENTANG.map((x) => ({
    label: x.label,
    warna: x.warna,
    jumlah: rows.filter((d) => d.nilai !== null && d.nilai >= x.min && d.nilai <= x.max).length,
  }))
  const adaSaringan = ujianId || kelas !== 'semua' || cari || penilaian !== 'semua' || kelulusan !== 'semua'

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Rekap & penilaian"
        judul="Hasil ujian peserta"
        pesan="Telusuri setiap lembar jawaban, berikan poin untuk soal uraian, lalu tuntaskan penilaian agar nilai akhir terkunci."
        kanan={
          <>
            <Tombol varian="kedua" ikon={Download} memuat={mengunduh} onClick={unduh} disabled={rows.length === 0}>Unduh CSV</Tombol>
            <Tombol varian="utama" ikon={ClipboardCheck} onClick={() => { bunyi('klik'); ubah('penilaian', penilaian === 'perlu' ? 'semua' : 'perlu') }}>
              {penilaian === 'perlu' ? 'Lihat semua lembar' : 'Perlu dinilai'}
              {r?.perlu_penilaian > 0 && penilaian !== 'perlu' && <span className="ml-1 rounded-full bg-ink-950/40 px-1.5 font-mono text-[0.7rem]">{r.perlu_penilaian}</span>}
            </Tombol>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { l: 'Lembar selesai', n: r?.total ?? 0, w: '#7C5CFF', ikon: ChartNoAxesCombined },
          { l: 'Rata-rata nilai', n: nilaiTeks(r?.rata), w: '#22D3EE', ikon: Sparkles },
          { l: 'Nilai tertinggi', n: nilaiTeks(r?.tertinggi), w: '#A3E635', ikon: Trophy },
          { l: 'Nilai terendah', n: nilaiTeks(r?.rendah), w: '#FF4D6D', ikon: TrendingDown },
          { l: 'Tuntas KKM', n: r ? `${r.lulus}/${r.total}` : '—', w: '#34D399', ikon: BadgeCheck },
          { l: 'Menunggu poin', n: r?.perlu_penilaian ?? 0, w: '#FFB020', ikon: PenLine },
        ].map((x) => {
          const Ikon = x.ikon
          return (
            <div key={x.l} className="kartu relative overflow-hidden p-3.5">
              <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: x.w }} />
              <Ikon size={15} style={{ color: x.w }} />
              <p className="mt-2 font-mono text-[1.4rem] leading-none font-bold text-chalk">{isPending ? '…' : x.n}</p>
              <p className="mt-1.5 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
            </div>
          )
        })}
      </div>

      <section className="kartu p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <input
              value={cari} onChange={(e) => ubah('cari', e.target.value)}
              placeholder="Cari nama, NIS, atau judul ujian…"
              className="kolom-field py-2.5 pl-9 text-[0.84rem]"
              aria-label="Cari lembar hasil"
            />
          </div>
          <select value={ujianId} onChange={(e) => ubah('ujian_id', e.target.value)} className="kolom-field py-2.5 text-[0.84rem]" aria-label="Saring berdasarkan ujian">
            <option value="">Semua ujian</option>
            {(daftarUjian?.data || []).map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
          </select>
          <select value={kelas} onChange={(e) => ubah('kelas', e.target.value)} className="kolom-field py-2.5 text-[0.84rem]" aria-label="Saring berdasarkan kelas">
            <option value="semua">Semua kelas</option>
            {(meta?.kelas || []).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <label className="relative">
            <ArrowUpDown size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <select value={urutan} onChange={(e) => ubah('urutan', e.target.value)} className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Urutkan hasil">
              <option value="terbaru">Paling baru dikirim</option>
              <option value="nilai_tinggi">Nilai tertinggi</option>
              <option value="nilai_rendah">Nilai terendah</option>
              <option value="nama">Nama peserta</option>
              <option value="kelas">Kelas lalu nama</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
          <Segmen
            nilai={penilaian}
            onChange={(v) => ubah('penilaian', v)}
            pilihan={[{ nilai: 'semua', label: 'Semua status' }, { nilai: 'perlu', label: 'Perlu dinilai' }, { nilai: 'tuntas', label: 'Sudah tuntas' }]}
          />
          <Segmen
            nilai={kelulusan}
            onChange={(v) => ubah('kelulusan', v)}
            pilihan={[{ nilai: 'semua', label: 'Semua capaian' }, { nilai: 'lulus', label: 'Tuntas KKM' }, { nilai: 'belum', label: 'Belum tuntas' }]}
          />
          {adaSaringan && (
            <Tombol ukuran="sm" varian="halus" ikon={Filter} className="ml-auto" onClick={() => { bunyi('klik'); setParams(new URLSearchParams(), { replace: true }) }}>
              Bersihkan saringan
            </Tombol>
          )}
        </div>
      </section>

      <div className="space-y-4">
        <section className="kartu overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft p-4">
            <div>
              <h3 className="text-[1rem]">Daftar lembar jawaban</h3>
              <p className="mt-0.5 text-[0.75rem] text-mute">{rows.length} lembar cocok dengan saringan aktif.</p>
            </div>
            {isFetching && <Pil warna="#22D3EE">memperbarui…</Pil>}
          </div>

          {isPending ? <div className="p-4"><Rangka baris={6} /></div> : error ? <div className="p-4"><Galat pesan={error.message} onUlang={refetch} /></div> : rows.length === 0 ? (
            <div className="p-4">
              <Kosong
                ikon={ChartNoAxesCombined}
                judul="Belum ada lembar yang cocok"
                pesan={adaSaringan ? 'Longgarkan saringan atau pilih ujian lain untuk melihat hasil.' : 'Hasil akan muncul begitu peserta mengirimkan jawabannya.'}
                aksi={adaSaringan ? <Tombol ukuran="sm" varian="kedua" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Bersihkan saringan</Tombol> : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-950/40">
                    {['Peserta', 'Ujian', 'Nilai', 'Benar / salah / kosong', 'Durasi', 'Status', ''].map((h) => (
                      <th key={h} className="p-3 text-[0.64rem] font-bold tracking-widest text-mute uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((x) => (
                    <tr key={x.id} className="garis-tabel group cursor-pointer" onClick={() => { bunyi('buka'); setTerbuka(x.id) }}>
                      <td className="p-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar nama={x.nama} gender={x.gender} ukuran={34} />
                          <span className="min-w-0">
                            <span className="block truncate text-[0.84rem] font-semibold text-chalk">{x.nama}</span>
                            <span className="block font-mono text-[0.66rem] text-mute">{x.nis} · {x.kelas}</span>
                          </span>
                        </span>
                      </td>
                      <td className="max-w-[300px] p-3">
                        <span className="block truncate text-[0.8rem] text-body" title={x.ujian_judul}>{x.ujian_judul}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ background: x.mapel_warna }} />
                          <span className="text-[0.68rem] text-mute">{x.mapel_nama}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[1.05rem] font-bold" style={{ color: warnaNilai(x.nilai, x.kkm) }}>{nilaiTeks(x.nilai)}</span>
                          <span className="w-14"><BilahProgres nilai={x.nilai ?? 0} warna={warnaNilai(x.nilai, x.kkm)} tinggi={4} /></span>
                        </span>
                        <span className="mt-0.5 block font-mono text-[0.62rem] text-mute">KKM {x.kkm}</span>
                      </td>
                      <td className="p-3">
                        <span className="flex items-center gap-1.5 font-mono text-[0.78rem]">
                          <span className="text-lime">{x.benar}</span><span className="text-line">/</span>
                          <span className="text-rose">{x.salah}</span><span className="text-line">/</span>
                          <span className="text-mute">{x.kosong}</span>
                        </span>
                        <span className="mt-0.5 block text-[0.64rem] text-mute">{x.total_soal} butir</span>
                      </td>
                      <td className="p-3">
                        <span className="block font-mono text-[0.78rem] text-body">{Math.round((x.durasi_detik || 0) / 60)} mnt</span>
                        <span className="mt-0.5 block text-[0.64rem] text-mute">{jamSaja(x.selesai_pada)} · {tanggal(x.selesai_pada, { tahun: false })}</span>
                      </td>
                      <td className="p-3">
                        <span className="flex flex-col items-start gap-1">
                          {x.perlu_penilaian
                            ? <Pil warna="#FFB020" ikon={PenLine}>Perlu poin</Pil>
                            : x.nilai >= x.kkm ? <Pil warna="#A3E635" ikon={BadgeCheck}>Tuntas</Pil> : <Pil warna="#FF4D6D" ikon={XCircle}>Belum tuntas</Pil>}
                          {x.fokus_hilang > 0 && <span className="flex items-center gap-1 text-[0.64rem] text-amber"><Eye size={10} /> {x.fokus_hilang}× pindah tab</span>}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-line-soft px-2 py-1 text-[0.72rem] font-bold text-mute transition group-hover:border-pink/60 group-hover:text-pink">
                          Tinjau <ChevronRight size={12} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > BATAS && (
            <div className="px-4 pb-4">
              <Paginasi halaman={halaman} batas={BATAS} total={rows.length} onChange={setHalaman} satuan="lembar" />
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="kartu p-4">
            <h3 className="text-[1rem]">Sebaran nilai</h3>
            <p className="mt-0.5 mb-3 text-[0.75rem] text-mute">Delapan rentang nilai dari lembar yang tampil. Arahkan kursor untuk jumlah pastinya.</p>
            {rows.length === 0 ? <Kosong ikon={Users} judul="Belum ada data" pesan="Sebaran muncul setelah ada lembar yang cocok." className="py-8" /> : <BatangDistribusi data={distribusi} tinggi={200} />}
          </section>

          <section className="kartu p-4">
            <h3 className="flex items-center gap-2 text-[1rem]"><Award size={16} className="text-amber" /> Capaian tertinggi</h3>
            {rows.length === 0 ? (
              <p className="mt-3 text-[0.8rem] text-mute">Belum ada lembar untuk diperingkat.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {[...rows].filter((x) => x.nilai !== null).sort((a, b) => b.nilai - a.nilai).slice(0, 6).map((x, i) => (
                  <li key={x.id}>
                    <button onClick={() => { bunyi('buka'); setTerbuka(x.id) }} className="flex w-full items-center gap-2.5 rounded-xl border border-line-soft bg-ink-950/40 p-2 text-left transition hover:border-violet/50">
                      <span className="grid size-6 flex-none place-items-center rounded-md font-mono text-[0.72rem] font-bold" style={{ background: i === 0 ? 'rgba(255,176,32,0.2)' : 'rgba(38,49,94,0.6)', color: i === 0 ? '#FFB020' : '#8a93b8' }}>{i + 1}</span>
                      <Avatar nama={x.nama} gender={x.gender} ukuran={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8rem] font-semibold text-chalk">{x.nama}</span>
                        <span className="block truncate text-[0.66rem] text-mute">{x.kelas} · {x.mapel_kode}</span>
                      </span>
                      <span className="font-mono text-[0.92rem] font-bold" style={{ color: warnaNilai(x.nilai, x.kkm) }}>{nilaiTeks(x.nilai)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <LembarHasil id={terbuka} onTutup={() => setTerbuka(null)} onPerubahan={perubahan} />
    </div>
  )
}