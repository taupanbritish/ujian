import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Eye, Pencil, Copy, Archive, X,
  CheckSquare, Square, BookmarkPlus, Bookmark, FileQuestion, Layers,
  FileSpreadsheet, CheckCircle2, XCircle, Table2,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, TombolIkon, Pil, Laci, Kosong, Galat, Rangka, Segmen, Paginasi, Konfirmasi, JudulBagian, OpsiMapel,
} from '../../components/ui'
import SoalForm from '../../components/SoalForm'
import ImporExcel from '../../components/ImporExcel'
import TeksSoal from '../../components/TeksSoal'
import LampiranSoal from '../../components/LampiranSoal'
import { TIPE, TINGKAT, tanggal, jawabanTeks } from '../../lib/format'

const KUNCI_TAMPILAN = 'shanatech.tampilan-soal'

// Kolom template impor soal. Urutan ini pula yang dipakai menyusun file template.
const KOLOM_IMPOR_SOAL = [
  { kunci: 'tipe', label: 'Bentuk', contoh: 'pilihan_ganda', wajib: true, alias: ['bentuk', 'jenis', 'type'] },
  { kunci: 'pertanyaan', label: 'Pertanyaan', contoh: 'Urutan langkah logis untuk menyelesaikan masalah disebut …', wajib: true, alias: ['soal', 'question'] },
  { kunci: 'mapel', label: 'Mapel', contoh: 'INF', alias: ['mata pelajaran', 'kode mapel'] },
  { kunci: 'opsi_a', label: 'Opsi A', contoh: 'algoritma', alias: ['a', 'pilihan a'] },
  { kunci: 'opsi_b', label: 'Opsi B', contoh: 'sintaks', alias: ['b', 'pilihan b'] },
  { kunci: 'opsi_c', label: 'Opsi C', contoh: 'kompilasi', alias: ['c', 'pilihan c'] },
  { kunci: 'opsi_d', label: 'Opsi D', contoh: 'iterasi', alias: ['d', 'pilihan d'] },
  { kunci: 'opsi_e', label: 'Opsi E', contoh: '', alias: ['e', 'pilihan e'] },
  { kunci: 'kunci', label: 'Kunci', contoh: 'a', alias: ['jawaban', 'kunci jawaban', 'answer'] },
  { kunci: 'tingkat', label: 'Tingkat', contoh: 'mudah', alias: ['kesukaran', 'level'] },
  { kunci: 'bobot', label: 'Bobot', contoh: '1', alias: ['score', 'weight'] },
  { kunci: 'topik', label: 'Topik', contoh: 'Berpikir Komputasional', alias: ['materi'] },
  { kunci: 'pembahasan', label: 'Pembahasan', contoh: 'Algoritma adalah urutan langkah terbatas yang menghasilkan solusi.', alias: ['explanation'] },
  { kunci: 'gambar', label: 'Gambar', contoh: 'https://sekolah.sch.id/grafik.png', alias: ['foto', 'image', 'url gambar', 'tautan gambar'] },
  { kunci: 'gambar_alt', label: 'Alt Gambar', contoh: 'Grafik parabola membuka ke atas', alias: ['teks alternatif', 'alt'] },
  { kunci: 'audio', label: 'Audio', contoh: 'https://sekolah.sch.id/percakapan.mp3', alias: ['suara', 'sound', 'tautan audio'] },
  { kunci: 'video', label: 'Video', contoh: 'https://youtu.be/abc123', alias: ['tautan video', 'vidio'] },
]
const BAWAAN = [
  { nama: 'Semua soal', filter: {} },
  { nama: 'Tingkat sulit', filter: { tingkat: 'sulit' } },
  { nama: 'Perlu dinilai manual', filter: { tipe: 'esai' } },
  { nama: 'Belum dipakai', filter: { urutan: 'sering', belum: '1' } },
]

function PratinjauSoal({ soal, ringkas = false }) {
  return (
    <div className="kertas rounded-2xl border border-paper-line p-4">
      <p className="whitespace-pre-line text-[0.9rem] leading-relaxed font-medium text-paper-ink"><TeksSoal teks={soal.pertanyaan} /></p>
      <LampiranSoal lampiran={soal.lampiran} tema="kertas" />
      {soal.tipe === 'pilihan_ganda' && (
        <ul className="mt-3 space-y-1.5">
          {soal.opsi.map((o) => (
            <li key={o.id} className="flex items-start gap-2 text-[0.84rem]">
              <span
                className="grid size-5 flex-none place-items-center rounded-full border-2 font-mono text-[0.6rem] font-bold"
                style={{
                  borderColor: soal.kunci === o.id ? '#7C5CFF' : 'rgba(23,29,51,0.3)',
                  background: soal.kunci === o.id ? '#7C5CFF' : 'transparent',
                  color: soal.kunci === o.id ? '#fff' : 'rgba(23,29,51,0.6)',
                }}
              >
                {o.id.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className={soal.kunci === o.id ? 'font-bold text-paper-ink' : 'text-paper-ink/80'}><TeksSoal teks={o.teks} /></span>
                {o.lampiran?.length > 0 && <LampiranSoal lampiran={o.lampiran} tema="kertas" kompak />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {soal.tipe === 'benar_salah' && (
        <p className="mt-3 text-[0.84rem] text-paper-ink/80">
          Kunci: <span className="font-bold text-paper-ink">{soal.kunci === 'benar' ? 'Benar' : 'Salah'}</span>
        </p>
      )}
      {soal.tipe === 'isian' && (
        <p className="mt-3 text-[0.84rem] text-paper-ink/80">Kunci diterima: <span className="font-mono font-bold text-paper-ink"><TeksSoal teks={soal.kunci} /></span></p>
      )}
      {soal.tipe === 'esai' && soal.kunci && !ringkas && (
        <div className="mt-3 rounded-lg border border-paper-line bg-white/50 p-2.5">
          <p className="font-mono text-[0.6rem] font-bold tracking-widest text-paper-ink/60 uppercase">Pedoman penskoran</p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-paper-ink/85"><TeksSoal teks={soal.kunci} /></p>
        </div>
      )}
    </div>
  )
}

export default function BankSoal() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()

  const [cari, setCari] = useState(params.get('cari') || '')
  const [cariDeb, setCariDeb] = useState(cari)
  const [mapel, setMapel] = useState('')
  const [tipe, setTipe] = useState('')
  const [tingkat, setTingkat] = useState('')
  const [urutan, setUrutan] = useState('terbaru')
  const [belumDipakai, setBelumDipakai] = useState(false)
  const [halaman, setHalaman] = useState(1)
  const [tampilan, setTampilan] = useState(() => localStorage.getItem('shanatech.mode-soal') || 'tabel')
  const [terpilih, setTerpilih] = useState([])
  const [formTerbuka, setFormTerbuka] = useState(params.get('baru') === '1')
  const [imporTerbuka, setImporTerbuka] = useState(false)
  const [soalEdit, setSoalEdit] = useState(null)
  const [detail, setDetail] = useState(null)
  const [konfirmasi, setKonfirmasi] = useState(null)
  const [tersimpan, setTersimpan] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KUNCI_TAMPILAN) || '[]') } catch { return [] }
  })
  const [namaTampilan, setNamaTampilan] = useState('')
  const [simpanTampilan, setSimpanTampilan] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setCariDeb(cari); setHalaman(1) }, 320)
    return () => clearTimeout(t)
  }, [cari])

  useEffect(() => { localStorage.setItem('shanatech.mode-soal', tampilan) }, [tampilan])
  useEffect(() => { setTerpilih([]) }, [cariDeb, mapel, tipe, tingkat, halaman])

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })

  const kunci = ['soal', { cari: cariDeb, mapel, tipe, tingkat, urutan, halaman }]
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: kunci,
    queryFn: () => {
      const p = new URLSearchParams({ halaman, batas: 12, urutan })
      if (cariDeb) p.set('cari', cariDeb)
      if (mapel) p.set('mapel', mapel)
      if (tipe) p.set('tipe', tipe)
      if (tingkat) p.set('tingkat', tingkat)
      return api(`/soal?${p}`)
    },
    placeholderData: keepPreviousData,
  })

  const arsip = useMutation({
    mutationFn: (ids) => api('/soal/hapus-banyak', { method: 'POST', body: { ids } }),
    onSuccess: (d, ids) => {
      bunyi('simpan')
      setTerpilih([])
      setDetail(null)
      qc.invalidateQueries({ queryKey: ['soal'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      toast.info(d.pesan, {
        pesan: 'Soal disembunyikan dari bank, riwayat ujian tetap utuh.',
        aksi: {
          label: 'Batalkan',
          fn: async () => {
            try {
              await api('/soal/pulihkan', { method: 'POST', body: { ids } })
              qc.invalidateQueries({ queryKey: ['soal'] })
              qc.invalidateQueries({ queryKey: ['ringkasan'] })
              toast.sukses('Pengarsipan dibatalkan', { pesan: `${ids.length} soal kembali ke bank soal.` })
            } catch (e) { toast.gagal('Gagal memulihkan', { pesan: pesanGalat(e) }) }
          },
        },
      })
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Soal gagal diarsipkan', { pesan: pesanGalat(e) }) },
  })

  const duplikat = useMutation({
    mutationFn: (id) => api(`/soal/${id}/duplikat`, { method: 'POST' }),
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['soal'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(d.pesan, { pesan: 'Salinan muncul di urutan terbaru.' })
    },
    onError: (e) => toast.gagal('Duplikasi gagal', { pesan: pesanGalat(e) }),
  })

  const { data: detailData } = useQuery({
    queryKey: ['soal-detail', detail?.id],
    queryFn: () => api(`/soal/${detail.id}`),
    enabled: !!detail,
  })

  const daftar = useMemo(() => {
    const d = data?.data || []
    return belumDipakai ? d.filter((s) => s.dipakai === 0) : d
  }, [data, belumDipakai])

  const semuaTerpilih = daftar.length > 0 && daftar.every((s) => terpilih.includes(s.id))
  const filterAktif = [cariDeb, mapel, tipe, tingkat, belumDipakai].filter(Boolean).length

  const terapkan = (f) => {
    setCari(f.cari || '')
    setMapel(f.mapel || '')
    setTipe(f.tipe || '')
    setTingkat(f.tingkat || '')
    setUrutan(f.urutan || 'terbaru')
    setBelumDipakai(f.belum === '1')
    setHalaman(1)
    bunyi('buka')
  }

  const simpanTampilanBaru = () => {
    if (!namaTampilan.trim()) return
    const baru = [...tersimpan, {
      nama: namaTampilan.trim(),
      filter: { cari: cariDeb, mapel, tipe, tingkat, urutan, belum: belumDipakai ? '1' : '' },
    }].slice(-6)
    setTersimpan(baru)
    localStorage.setItem(KUNCI_TAMPILAN, JSON.stringify(baru))
    setNamaTampilan('')
    setSimpanTampilan(false)
    toast.sukses('Tampilan tersimpan', { pesan: 'Filter ini bisa dipanggil kembali kapan saja.' })
  }

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Persiapan perangkat"
        judul="Bank soal sekolah"
        pesan="Satu sumber soal untuk seluruh paket ujian. Setiap butir menyimpan kunci, bobot, tingkat kesukaran, dan pembahasan."
        kanan={
          <>
            <Segmen nilai={tampilan} onChange={setTampilan} pilihan={[{ nilai: 'tabel', label: 'Tabel' }, { nilai: 'kartu', label: 'Kartu' }]} />
            <Tombol varian="kedua" ikon={FileSpreadsheet} onClick={() => setImporTerbuka(true)}>Import Excel</Tombol>
            <Tombol varian="utama" ikon={Plus} onClick={() => { setSoalEdit(null); setFormTerbuka(true) }}>Tambah soal</Tombol>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total butir', nilai: data?.ringkas?.total, warna: '#C8D0EA' },
          { label: 'Pilihan ganda', nilai: data?.ringkas?.pilihan_ganda, warna: TIPE.pilihan_ganda.warna },
          { label: 'Benar / salah', nilai: data?.ringkas?.benar_salah, warna: TIPE.benar_salah.warna },
          { label: 'Isian singkat', nilai: data?.ringkas?.isian, warna: TIPE.isian.warna },
          { label: 'Uraian', nilai: data?.ringkas?.esai, warna: TIPE.esai.warna },
          { label: 'Tingkat sulit', nilai: data?.ringkas?.sulit, warna: '#FF4D6D' },
        ].map((s) => (
          <div key={s.label} className="kartu flex items-center justify-between gap-2 px-3.5 py-3">
            <span className="text-[0.72rem] leading-tight font-semibold text-mute">{s.label}</span>
            <span className="font-mono text-[1.15rem] font-bold" style={{ color: s.warna }}>{isPending ? '·' : s.nilai ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="kartu space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari pertanyaan, topik, atau pembahasan…"
              className="kolom-field pl-9"
              aria-label="Cari soal"
            />
            {cari && <button onClick={() => setCari('')} aria-label="Bersihkan pencarian" className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-mute hover:text-chalk"><X size={14} /></button>}
          </div>
          <select value={mapel} onChange={(e) => { setMapel(e.target.value); setHalaman(1) }} className="kolom-field w-auto min-w-[150px]" aria-label="Saring mata pelajaran">
            <option value="">Semua mapel</option>
            <OpsiMapel mapel={meta?.mapel || []} />
          </select>
          <select value={tipe} onChange={(e) => { setTipe(e.target.value); setHalaman(1) }} className="kolom-field w-auto min-w-[140px]" aria-label="Saring bentuk soal">
            <option value="">Semua bentuk</option>
            {Object.entries(TIPE).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
          <select value={tingkat} onChange={(e) => { setTingkat(e.target.value); setHalaman(1) }} className="kolom-field w-auto min-w-[130px]" aria-label="Saring tingkat">
            <option value="">Semua tingkat</option>
            {Object.entries(TINGKAT).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
          <select value={urutan} onChange={(e) => { setUrutan(e.target.value); setHalaman(1) }} className="kolom-field w-auto min-w-[150px]" aria-label="Urutkan">
            <option value="terbaru">Terbaru dibuat</option>
            <option value="terlama">Terlama dibuat</option>
            <option value="tingkat">Tingkat kesukaran</option>
            <option value="mapel">Mata pelajaran</option>
            <option value="sering">Paling sering dipakai</option>
          </select>
          <TombolIkon ikon={Layers} label="Hanya soal yang belum dipakai ujian" aktif={belumDipakai} onClick={() => { setBelumDipakai((v) => !v); setHalaman(1) }} />
          {filterAktif > 0 && (
            <Tombol varian="halus" ukuran="sm" ikon={X} onClick={() => terapkan({})}>Reset {filterAktif} filter</Tombol>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide text-mute uppercase"><Bookmark size={12} /> Tampilan</span>
          {[...BAWAAN, ...tersimpan].map((t, i) => (
            <span key={`${t.nama}-${i}`} className="group inline-flex items-center">
              <button onClick={() => terapkan(t.filter)} className="rounded-full border border-line-soft bg-ink-950/50 px-3 py-1 text-[0.74rem] font-semibold text-body transition hover:border-cyan/60 hover:text-cyan">
                {t.nama}
              </button>
              {i >= BAWAAN.length && (
                <button
                  onClick={() => {
                    const baru = tersimpan.filter((_, j) => j !== i - BAWAAN.length)
                    setTersimpan(baru)
                    localStorage.setItem(KUNCI_TAMPILAN, JSON.stringify(baru))
                  }}
                  aria-label={`Hapus tampilan ${t.nama}`}
                  className="ml-0.5 grid size-5 place-items-center rounded-full text-mute opacity-0 transition group-hover:opacity-100 hover:text-rose"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          <button onClick={() => setSimpanTampilan((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-[0.74rem] font-semibold text-mute transition hover:border-violet hover:text-violet">
            <BookmarkPlus size={12} /> Simpan filter ini
          </button>
          {simpanTampilan && (
            <span className="flex items-center gap-1.5">
              <input value={namaTampilan} onChange={(e) => setNamaTampilan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && simpanTampilanBaru()} placeholder="Nama tampilan" className="kolom-field w-40 py-1 text-[0.76rem]" autoFocus />
              <Tombol ukuran="sm" varian="utama" onClick={simpanTampilanBaru}>Simpan</Tombol>
            </span>
          )}
        </div>
      </div>

      {terpilih.length > 0 && (
        <div className="anim-naik sticky top-[76px] z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-violet/45 bg-ink-800/95 p-3 shadow-lift backdrop-blur-xl">
          <span className="grid size-8 place-items-center rounded-lg bg-violet/20 font-mono text-[0.8rem] font-bold text-violet">{terpilih.length}</span>
          <span className="text-[0.84rem] font-semibold text-chalk">soal dipilih</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Tombol ukuran="sm" varian="halus" onClick={() => setTerpilih([])}>Bersihkan</Tombol>
            <Tombol ukuran="sm" varian="bahaya" ikon={Archive} memuat={arsip.isPending} onClick={() => setKonfirmasi({ ids: terpilih })}>Arsipkan terpilih</Tombol>
          </div>
        </div>
      )}

      {error ? (
        <Galat pesan={error.message} onUlang={refetch} />
      ) : isPending ? (
        <Rangka baris={6} />
      ) : daftar.length === 0 ? (
        <Kosong
          ikon={FileQuestion}
          judul={filterAktif ? 'Tidak ada soal yang cocok' : 'Bank soal masih kosong'}
          pesan={filterAktif ? 'Coba longgarkan filter atau ubah kata pencarian.' : 'Tambahkan butir soal pertama untuk mulai menyusun paket ujian.'}
          aksi={<Tombol varian="utama" ikon={Plus} onClick={() => { setSoalEdit(null); setFormTerbuka(true) }}>Tambah soal</Tombol>}
        />
      ) : (
        <>
          {tampilan === 'tabel' ? (
            <div className={`kartu overflow-hidden ${isFetching ? 'opacity-80' : ''}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-ink-950/50">
                      <th className="w-10 p-3">
                        <button onClick={() => setTerpilih(semuaTerpilih ? [] : daftar.map((s) => s.id))} aria-label="Pilih semua pada halaman ini" className="grid place-items-center text-mute transition hover:text-cyan">
                          {semuaTerpilih ? <CheckSquare size={16} className="text-cyan" /> : <Square size={16} />}
                        </button>
                      </th>
                      <th className="p-3 text-[0.68rem] font-bold tracking-widest text-mute uppercase">Pertanyaan</th>
                      <th className="p-3 text-[0.68rem] font-bold tracking-widest text-mute uppercase">Mapel</th>
                      <th className="p-3 text-[0.68rem] font-bold tracking-widest text-mute uppercase">Bentuk</th>
                      <th className="p-3 text-[0.68rem] font-bold tracking-widest text-mute uppercase">Tingkat</th>
                      <th className="p-3 text-right text-[0.68rem] font-bold tracking-widest text-mute uppercase">Bobot</th>
                      <th className="p-3 text-right text-[0.68rem] font-bold tracking-widest text-mute uppercase">Dipakai</th>
                      <th className="w-32 p-3 text-right text-[0.68rem] font-bold tracking-widest text-mute uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((s) => {
                      const dipilih = terpilih.includes(s.id)
                      return (
                        <tr key={s.id} className="garis-tabel" style={{ background: dipilih ? 'rgba(124,92,255,0.09)' : undefined }}>
                          <td className="p-3 align-top">
                            <button onClick={() => setTerpilih((t) => (dipilih ? t.filter((x) => x !== s.id) : [...t, s.id]))} aria-label={`Pilih soal ${s.id}`} className="grid place-items-center text-mute transition hover:text-cyan">
                              {dipilih ? <CheckSquare size={16} className="text-violet" /> : <Square size={16} />}
                            </button>
                          </td>
                          <td className="max-w-[420px] p-3">
                            <button onClick={() => { bunyi('buka'); setDetail(s) }} className="text-left">
                              <p className="line-clamp-2 text-[0.85rem] leading-snug font-semibold text-chalk transition hover:text-cyan"><TeksSoal teks={s.pertanyaan} /></p>
                              <p className="mt-1 flex items-center gap-2 text-[0.7rem] text-mute">
                                <span className="font-mono">#{s.id}</span>
                                {s.topik && <><span className="size-1 rounded-full bg-line" /><span className="truncate">{s.topik}</span></>}
                              </p>
                            </button>
                          </td>
                          <td className="p-3"><Pil warna={s.mapel_warna}>{s.mapel_kode}</Pil></td>
                          <td className="p-3"><Pil warna={TIPE[s.tipe].warna}>{TIPE[s.tipe].singkat}</Pil></td>
                          <td className="p-3"><Pil warna={TINGKAT[s.tingkat].warna}>{TINGKAT[s.tingkat].label}</Pil></td>
                          <td className="p-3 text-right font-mono text-[0.82rem] font-bold text-body">{Number(s.bobot)}</td>
                          <td className="p-3 text-right">
                            <span className={`font-mono text-[0.82rem] font-bold ${s.dipakai ? 'text-lime' : 'text-mute'}`}>{s.dipakai}×</span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <TombolIkon ikon={Eye} label="Lihat soal" onClick={() => { bunyi('buka'); setDetail(s) }} />
                              <TombolIkon ikon={Pencil} label="Ubah soal" onClick={() => { setSoalEdit(s); setFormTerbuka(true) }} />
                              <TombolIkon ikon={Copy} label="Duplikat soal" onClick={() => duplikat.mutate(s.id)} />
                              <TombolIkon ikon={Archive} label="Arsipkan soal" className="hover:border-rose/60 hover:text-rose" onClick={() => setKonfirmasi({ ids: [s.id] })} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-80' : ''}`}>
              {daftar.map((s, i) => {
                const dipilih = terpilih.includes(s.id)
                return (
                  <article key={s.id} className={`kartu kartu-hover anim-naik tunda-${Math.min(i % 6 + 1, 6)} flex flex-col p-4`} style={{ borderColor: dipilih ? '#7C5CFF' : undefined }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Pil warna={s.mapel_warna}>{s.mapel_kode}</Pil>
                        <Pil warna={TIPE[s.tipe].warna}>{TIPE[s.tipe].singkat}</Pil>
                        <Pil warna={TINGKAT[s.tingkat].warna}>{TINGKAT[s.tingkat].label}</Pil>
                      </div>
                      <button onClick={() => setTerpilih((t) => (dipilih ? t.filter((x) => x !== s.id) : [...t, s.id]))} aria-label={`Pilih soal ${s.id}`} className="text-mute transition hover:text-violet">
                        {dipilih ? <CheckSquare size={17} className="text-violet" /> : <Square size={17} />}
                      </button>
                    </div>
                    <button onClick={() => { bunyi('buka'); setDetail(s) }} className="mt-3 flex-1 text-left">
                      <p className="line-clamp-4 text-[0.86rem] leading-relaxed font-medium text-body transition hover:text-chalk"><TeksSoal teks={s.pertanyaan} /></p>
                    </button>
                    <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
                      <span className="flex items-center gap-2 text-[0.7rem] text-mute">
                        <span className="font-mono">#{s.id}</span>
                        <span className="size-1 rounded-full bg-line" />
                        <span>bobot {Number(s.bobot)}</span>
                        <span className="size-1 rounded-full bg-line" />
                        <span className={s.dipakai ? 'text-lime' : ''}>{s.dipakai}× dipakai</span>
                      </span>
                      <span className="flex gap-1">
                        <TombolIkon ikon={Pencil} label="Ubah soal" onClick={() => { setSoalEdit(s); setFormTerbuka(true) }} />
                        <TombolIkon ikon={Archive} label="Arsipkan soal" className="hover:border-rose/60 hover:text-rose" onClick={() => setKonfirmasi({ ids: [s.id] })} />
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <Paginasi halaman={halaman} batas={data.batas} total={belumDipakai ? daftar.length : data.total} onChange={setHalaman} />
        </>
      )}

      <SoalForm terbuka={formTerbuka} onTutup={() => { setFormTerbuka(false); setSoalEdit(null); if (params.get('baru')) { params.delete('baru'); setParams(params, { replace: true }) } }} soal={soalEdit} mapel={meta?.mapel || []} mapelAktif={mapel} />

      <ImporExcel
        terbuka={imporTerbuka}
        onTutup={() => setImporTerbuka(false)}
        judul="Import soal dari Excel"
        keterangan="Unggah berkas .xlsx/.xls/.csv berisi butir soal. Bentuk soal, pertanyaan, dan kunci wajib diisi; opsi A–E dipakai untuk pilihan ganda. Rumus ditulis di antara $...$ dan lampiran diisi sebagai tautan http(s) pada kolom Gambar/Audio/Video (pisahkan beberapa tautan dengan titik koma)."
        ikon={FileSpreadsheet}
        warna="#7C5CFF"
        lebar="max-w-4xl"
        kolom={KOLOM_IMPOR_SOAL}
        namaTemplate="template-soal.xlsx"
        onKirim={async (baris) => {
          const h = await api('/soal/import', { method: 'POST', body: { baris } })
          qc.invalidateQueries({ queryKey: ['soal'] })
          qc.invalidateQueries({ queryKey: ['meta'] })
          qc.invalidateQueries({ queryKey: ['ringkasan'] })
          return h
        }}
        ringkasHasil={(h) => [
          { label: 'Berhasil', nilai: h.dibuat, warna: '#A3E635', ikon: CheckCircle2 },
          { label: 'Gagal', nilai: h.galat, warna: '#FF4D65', ikon: XCircle },
          { label: 'Total baris', nilai: h.dibuat + h.galat, warna: '#22D3EE', ikon: Table2 },
        ]}
        renderHasil={(h) => (
          <div className="space-y-2">
            <p className="rounded-lg border border-line-soft bg-ink-950/40 px-3 py-2 text-[0.8rem] text-body">{h.pesan}</p>
            {h.rincianGalat?.length > 0 && (
              <div className="rounded-xl border border-rose/30 bg-rose/8 p-3">
                <p className="mb-1.5 font-mono text-[0.62rem] font-bold tracking-widest text-rose uppercase">Baris yang gagal ({h.galat})</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {h.rincianGalat.map((g) => (
                    <li key={g.baris} className="text-[0.76rem] text-body"><span className="font-mono font-bold text-rose">Baris {g.baris}:</span> {g.pesan}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      />

      <Laci
        terbuka={!!detail}
        onTutup={() => setDetail(null)}
        judul={`Butir soal #${detail?.id ?? ''}`}
        keterangan={detail ? `${detail.mapel_nama} · dibuat ${tanggal(detail.dibuat_pada)}` : ''}
        warna={detail?.mapel_warna}
        kaki={
          detail && (
            <>
              <Tombol varian="halus" ikon={Copy} onClick={() => duplikat.mutate(detail.id)}>Duplikat</Tombol>
              <Tombol varian="bahaya" ikon={Archive} onClick={() => setKonfirmasi({ ids: [detail.id] })}>Arsipkan</Tombol>
              <Tombol varian="utama" ikon={Pencil} onClick={() => { setSoalEdit(detail); setDetail(null); setFormTerbuka(true) }}>Ubah soal</Tombol>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Pil warna={TIPE[detail.tipe].warna}>{TIPE[detail.tipe].label}</Pil>
              <Pil warna={TINGKAT[detail.tingkat].warna}>{TINGKAT[detail.tingkat].label}</Pil>
              <Pil warna="#22D3EE">Bobot {Number(detail.bobot)}</Pil>
              {detail.topik && <Pil warna="#8A93B8">{detail.topik}</Pil>}
            </div>
            <PratinjauSoal soal={detail} />
            {detail.pembahasan && (
              <div className="rounded-2xl border border-cyan/30 bg-cyan/8 p-4">
                <p className="mb-1.5 font-mono text-[0.65rem] font-bold tracking-widest text-cyan uppercase">Pembahasan</p>
                <p className="whitespace-pre-line text-[0.85rem] leading-relaxed text-body"><TeksSoal teks={detail.pembahasan} /></p>
              </div>
            )}
            <div className="rounded-2xl border border-line-soft bg-ink-950/40 p-4">
              <p className="mb-2 font-mono text-[0.65rem] font-bold tracking-widest text-mute uppercase">Dipakai pada paket ujian</p>
              {!detailData ? (
                <div className="rangka h-10 rounded-lg" />
              ) : detailData.ujian.length === 0 ? (
                <p className="text-[0.82rem] text-mute">Belum dipakai. Soal ini siap disusun ke paket ujian baru.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detailData.ujian.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft bg-ink-800/50 px-3 py-2">
                      <span className="truncate text-[0.82rem] text-body">{u.judul}</span>
                      <Pil warna={u.status === 'terbit' ? '#A3E635' : '#8A93B8'}>{u.status}</Pil>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {detail.tipe === 'isian' && (
              <p className="text-[0.75rem] text-mute">Jawaban peserta dinilai benar bila sama dengan salah satu alternatif kunci: <span className="font-mono text-chalk">{detail.kunci.split('|').join(' / ')}</span> (huruf besar-kecil dan tanda baca diabaikan).</p>
            )}
            {jawabanTeks(detail, detail.kunci) && detail.tipe !== 'isian' && detail.tipe !== 'esai' && (
              <p className="text-[0.75rem] text-mute">Kunci tersimpan: <span className="font-semibold text-lime"><TeksSoal teks={jawabanTeks(detail, detail.kunci)} /></span></p>
            )}
          </div>
        )}
      </Laci>

      <Konfirmasi
        state={konfirmasi && {
          judul: konfirmasi.ids.length > 1 ? `Arsipkan ${konfirmasi.ids.length} soal?` : 'Arsipkan soal ini?',
          keterangan: 'Soal dapat dipulihkan lewat notifikasi pembatalan.',
          isi: 'Soal yang diarsipkan tidak muncul lagi di bank soal maupun penyusun ujian. Paket ujian yang sudah berjalan tetap menyimpan salinan soal beserta riwayat jawabannya.',
          label: 'Arsipkan',
          ikon: Archive,
          ikonTombol: Archive,
        }}
        memuat={arsip.isPending}
        onTutup={() => setKonfirmasi(null)}
        onLanjut={() => { arsip.mutate(konfirmasi.ids); setKonfirmasi(null) }}
      />
    </div>
  )
}