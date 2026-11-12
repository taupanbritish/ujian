import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, Search, Pencil, Trash2, LibraryBig, GraduationCap, Sparkles,
  CheckCircle2, ArrowUpDown, UserCog, Palette, Check, Info, Settings2,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useSekolah } from '../../context/SekolahContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, TombolIkon, Pil, Field, Modal, Konfirmasi, Kosong, Galat, Rangka, Segmen, JudulBagian,
} from '../../components/ui'
import { DAFTAR_JENJANG, labelJenjang, warnaJenjang } from '../../lib/jenjang'

const PALET = ['#7C5CFF', '#22D3EE', '#A3E635', '#FFB020', '#FF4D6D', '#38BDF8', '#F472B6', '#34D399']
const KOSONG = { nama: '', kode: '', warna: '#7C5CFF', guru_id: null }

function FormMapel({ terbuka, onTutup, mapel, preset, jenjang, daftarGuru }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [form, setForm] = useState(KOSONG)
  const [galat, setGalat] = useState({})
  const edit = !!mapel

  useEffect(() => {
    if (!terbuka) return
    setGalat({})
    if (mapel) setForm({ nama: mapel.nama, kode: mapel.kode, warna: mapel.warna || '#7C5CFF', guru_id: mapel.guru_id ?? null })
    else if (preset) setForm({ nama: preset.nama, kode: preset.kode, warna: preset.warna || '#7C5CFF', guru_id: null })
    else setForm({ ...KOSONG })
  }, [terbuka, mapel, preset])

  // Saat menambah mapel baru, otomatis pilih guru pengampu bila hanya ada satu
  // akun guru; bila lebih dari satu, admin memilih sendiri dari daftar.
  useEffect(() => {
    if (!terbuka || edit) return
    if (daftarGuru.length === 1) setForm((f) => (f.guru_id == null ? { ...f, guru_id: daftarGuru[0].id } : f))
  }, [terbuka, edit, daftarGuru])

  const guruTerpilih = daftarGuru.find((g) => g.id === form.guru_id) || null

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setGalat((g) => ({ ...g, [k]: undefined })) }

  const simpan = useMutation({
    mutationFn: () => {
      const body = { nama: form.nama.trim(), kode: form.kode.trim(), warna: form.warna, jenjang }
      // Kirim guru_id hanya saat membuat baru atau saat pilihan berubah, agar nama
      // guru teks lama (belum tertaut akun) tidak terhapus bila picker tidak disentuh.
      if (!edit || form.guru_id !== (mapel?.guru_id ?? null)) body.guru_id = form.guru_id ?? null
      return api(edit ? `/mapel/${mapel.id}` : '/mapel', { method: edit ? 'PATCH' : 'POST', body })
    },
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['mapel'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(edit ? 'Mata pelajaran diperbarui' : 'Mata pelajaran ditambahkan', { pesan: `${d.nama} (${d.kode}) · jenjang ${d.jenjang}.` })
      onTutup()
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) { const g = {}; e.rincian.forEach((r) => { g[r.kolom] = r.pesan }); setGalat(g) }
      toast.gagal('Mata pelajaran belum tersimpan', { pesan: pesanGalat(e) })
    },
  })

  const kirim = () => {
    const g = {}
    if (form.nama.trim().length < 2) g.nama = 'Nama mapel minimal 2 karakter.'
    if (form.kode.trim().length < 2) g.kode = 'Kode minimal 2 karakter.'
    else if (!/^[A-Za-z0-9-]+$/.test(form.kode.trim())) g.kode = 'Kode hanya huruf, angka, dan tanda hubung.'
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.warna)) g.warna = 'Warna tidak valid.'
    setGalat(g)
    if (Object.keys(g).length) { bunyi('peringatan'); return }
    simpan.mutate()
  }

  const w = /^#[0-9A-Fa-f]{6}$/.test(form.warna) ? form.warna : '#7C5CFF'

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={edit ? `Ubah mapel · ${mapel.nama}` : 'Tambah mata pelajaran'}
      keterangan={edit ? 'Perbarui nama, kode, warna penanda, atau guru pengampu.' : `Mapel baru akan terdaftar pada jenjang ${jenjang}.`}
      ikon={edit ? Pencil : Plus}
      warna={w}
      lebar="max-w-lg"
      kaki={
        <>
          <Tombol varian="halus" onClick={onTutup}>Batal</Tombol>
          <Tombol varian="utama" ikon={CheckCircle2} memuat={simpan.isPending} onClick={kirim}>{edit ? 'Simpan perubahan' : 'Tambah mapel'}</Tombol>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-ink-950/40 p-3">
          <GraduationCap size={15} style={{ color: warnaJenjang(jenjang) }} />
          <span className="text-[0.74rem] font-bold tracking-wide text-mute uppercase">Jenjang</span>
          <Pil warna={warnaJenjang(jenjang)}>{jenjang} · {labelJenjang(jenjang)}</Pil>
          <span className="ml-auto font-mono text-[0.66rem] text-mute">terkunci per jenjang</span>
        </div>

        <Field label="Nama mata pelajaran" wajib pesan={galat.nama}>
          <input value={form.nama} onChange={(e) => set('nama', e.target.value)} className="kolom-field" maxLength={80} placeholder="Contoh: Matematika" />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kode" wajib pesan={galat.kode} petunjuk="Huruf, angka, tanda hubung. Mis. MTK.">
            <input value={form.kode} onChange={(e) => set('kode', e.target.value.toUpperCase())} className="kolom-field font-mono" maxLength={12} placeholder="MTK" />
          </Field>
          <Field label="Guru pengampu" pesan={galat.guru_id} petunjuk="Terhubung ke akun guru; menentukan mapel yang ia lihat.">
            <select
              value={form.guru_id ?? ''}
              onChange={(e) => set('guru_id', e.target.value ? Number(e.target.value) : null)}
              className="kolom-field"
              aria-label="Pilih guru pengampu"
            >
              <option value="">Belum ada guru pengampu</option>
              {daftarGuru.map((g) => (
                <option key={g.id} value={g.id}>{g.nama}{g.aktif ? '' : ' (nonaktif)'} · {g.nis || g.email}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Warna penanda" pesan={galat.warna} petunjuk="Dipakai pada kartu mapel, pil, dan aksen bank soal.">
          <div className="flex flex-wrap items-center gap-2">
            {PALET.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { bunyi('pilih'); set('warna', p) }}
                aria-label={`Pilih warna ${p}`}
                aria-pressed={form.warna.toLowerCase() === p.toLowerCase()}
                className="grid size-8 place-items-center rounded-lg border-2 transition active:scale-90"
                style={{ background: p, borderColor: form.warna.toLowerCase() === p.toLowerCase() ? '#fff' : 'transparent', boxShadow: form.warna.toLowerCase() === p.toLowerCase() ? `0 0 0 2px ${p}` : 'none' }}
              >
                {form.warna.toLowerCase() === p.toLowerCase() && <Check size={15} className="text-ink-950" strokeWidth={3} />}
              </button>
            ))}
            <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-lg border border-line bg-ink-950 text-mute transition hover:text-chalk" title="Warna kustom">
              <Palette size={15} />
              <input type="color" value={w} onChange={(e) => set('warna', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Warna kustom" />
            </label>
            <span className="ml-1 font-mono text-[0.78rem] font-bold text-body uppercase">{form.warna}</span>
          </div>
        </Field>

        <div className="rounded-xl border border-line-soft bg-ink-950/50 p-3">
          <p className="mb-2 font-mono text-[0.62rem] font-bold tracking-[0.2em] text-mute uppercase">Pratinjau kartu</p>
          <div className="flex items-center gap-3">
            <span className="grid size-11 flex-none place-items-center rounded-xl font-mono text-[0.78rem] font-extrabold" style={{ color: w, background: `color-mix(in oklab, ${w} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${w} 40%, transparent)` }}>
              {form.kode.trim() || 'KODE'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.9rem] font-bold text-chalk">{form.nama.trim() || 'Nama mata pelajaran'}</span>
              <span className="mt-0.5 flex items-center gap-1 truncate text-[0.72rem] text-mute"><UserCog size={11} /> {guruTerpilih ? guruTerpilih.nama : (edit && mapel.guru ? mapel.guru : 'Belum ada guru pengampu')}</span>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function KartuMapel({ mapel: m, onUbah, onHapus }) {
  const w = m.warna || '#7C5CFF'
  return (
    <div className="kartu group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5" style={{ borderColor: `color-mix(in oklab, ${w} 22%, #1c2549)` }}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: w }} />
      <div className="flex items-start gap-3">
        <span className="grid size-12 flex-none place-items-center rounded-xl font-mono text-[0.78rem] font-extrabold" style={{ color: w, background: `color-mix(in oklab, ${w} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${w} 40%, transparent)` }}>
          {m.kode}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-bold text-chalk">{m.nama}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[0.72rem] text-mute">
            <UserCog size={11} className="flex-none" /> {m.guru || 'Belum ada guru pengampu'}
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line-soft pt-3">
        <span className="flex items-center gap-1.5 text-[0.76rem] text-mute">
          <LibraryBig size={13} style={{ color: w }} />
          <b className="font-mono text-[0.86rem] text-chalk">{m.jumlah_soal}</b> soal
        </span>
        <span className="flex gap-1.5 opacity-70 transition group-hover:opacity-100">
          <TombolIkon ikon={Pencil} label={`Ubah ${m.nama}`} onClick={onUbah} />
          <TombolIkon ikon={Trash2} label={`Hapus ${m.nama}`} onClick={onHapus} />
        </span>
      </div>
    </div>
  )
}

export default function Mapel() {
  const sekolah = useSekolah()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [jenjangOverride, setJenjangOverride] = useState(null)
  const jenjang = jenjangOverride ?? sekolah.jenjang
  const [cari, setCari] = useState('')
  const [urutan, setUrutan] = useState('nama')
  const [form, setForm] = useState(null)
  const [konfirmasi, setKonfirmasi] = useState(null)

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['mapel', jenjang],
    queryFn: () => api(`/mapel?jenjang=${jenjang}`),
    placeholderData: (d) => d,
  })

  // Daftar akun guru untuk picker pengampu pada form mapel.
  const { data: dataGuru } = useQuery({
    queryKey: ['guru-opsi'],
    queryFn: () => api('/pengguna?peran=guru&urutan=nama'),
  })
  const daftarGuru = useMemo(() => dataGuru?.data || [], [dataGuru])

  const invalidasi = () => {
    qc.invalidateQueries({ queryKey: ['mapel'] })
    qc.invalidateQueries({ queryKey: ['meta'] })
    qc.invalidateQueries({ queryKey: ['ringkasan'] })
  }

  const pulihkan = useMutation({
    mutationFn: (id) => api(`/mapel/${id}/pulihkan`, { method: 'POST' }),
    onSuccess: (d) => { bunyi('simpan'); invalidasi(); toast.sukses('Mata pelajaran dipulihkan', { pesan: `${d.nama} kembali aktif pada jenjang ${d.jenjang}.` }) },
    onError: (e) => { bunyi('gagal'); toast.gagal('Mapel belum dapat dipulihkan', { pesan: pesanGalat(e) }) },
  })

  const hapus = useMutation({
    mutationFn: (id) => api(`/mapel/${id}`, { method: 'DELETE' }),
    onSuccess: (d) => {
      bunyi('peringatan')
      setKonfirmasi(null)
      invalidasi()
      toast.ingat('Mata pelajaran dihapus', {
        pesan: 'Mapel disembunyikan dari picker; butir soal yang sudah ada tetap tersimpan.',
        aksi: { label: 'Urungkan', fn: () => pulihkan.mutate(d.id) },
      })
    },
    onError: (e) => { bunyi('gagal'); setKonfirmasi(null); toast.gagal('Mapel belum dapat dihapus', { pesan: pesanGalat(e) }) },
  })

  const semua = data?.mapel || []
  const katalog = data?.katalog || []
  const totalSoal = semua.reduce((a, m) => a + (m.jumlah_soal || 0), 0)

  const tampil = useMemo(() => {
    const c = cari.trim().toLowerCase()
    const arr = semua.filter((m) => !c || m.nama.toLowerCase().includes(c) || m.kode.toLowerCase().includes(c) || (m.guru || '').toLowerCase().includes(c))
    return [...arr].sort((a, b) => (
      urutan === 'kode' ? a.kode.localeCompare(b.kode)
        : urutan === 'soal' ? (b.jumlah_soal || 0) - (a.jumlah_soal || 0) || a.nama.localeCompare(b.nama)
          : a.nama.localeCompare(b.nama)
    ))
  }, [semua, cari, urutan])

  const aktif = sekolah.jenjang === jenjang
  const w = warnaJenjang(jenjang)

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Struktur akademik"
        judul="Mata Pelajaran"
        pesan="Kelola mata pelajaran per jenjang. Katalog rekomendasi menyesuaikan satuan pendidikan yang dipilih; mapel yang sudah memiliki soal tetap aman saat dihapus dan dapat diurungkan."
        kanan={<Tombol varian="utama" ikon={Plus} onClick={() => { bunyi('buka'); setForm({}) }}>Tambah mapel</Tombol>}
      />

      <section className="kartu p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 flex-none place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${w} 16%, transparent)`, color: w }}>
              <GraduationCap size={19} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[0.62rem] font-bold tracking-[0.2em] text-mute uppercase">Jenjang ditampilkan</p>
              <p className="truncate text-[0.95rem] font-bold text-chalk">{jenjang} · {labelJenjang(jenjang)}</p>
            </div>
          </div>
          <Segmen nilai={jenjang} onChange={(j) => { bunyi('pilih'); setJenjangOverride(j) }} pilihan={DAFTAR_JENJANG.map((j) => ({ nilai: j, label: j }))} />
        </div>
        {!aktif && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber/30 bg-amber/8 p-3 text-[0.78rem] text-body">
            <Info size={14} className="flex-none text-amber" />
            <span>Jenjang aktif sekolah saat ini <b className="text-chalk">{sekolah.jenjang}</b>. Anda sedang melihat mapel jenjang {jenjang}.</span>
            <Tombol ukuran="sm" varian="halus" ikon={Settings2} className="ml-auto" onClick={() => navigate('/admin/pengaturan')}>Ubah jenjang aktif</Tombol>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: `Mapel ${jenjang}`, n: semua.length, w, ikon: BookOpen },
          { l: 'Total butir soal', n: totalSoal, w: '#22D3EE', ikon: LibraryBig },
          { l: 'Katalog tersedia', n: katalog.length, w: '#A3E635', ikon: Sparkles },
          { l: 'Jenjang aktif', n: sekolah.jenjang, w: warnaJenjang(sekolah.jenjang), ikon: GraduationCap },
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, kode, atau guru pengampu…" className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Cari mata pelajaran" />
          </div>
          <label className="relative">
            <ArrowUpDown size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <select value={urutan} onChange={(e) => setUrutan(e.target.value)} className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Urutkan mapel">
              <option value="nama">Nama A–Z</option>
              <option value="kode">Kode A–Z</option>
              <option value="soal">Soal terbanyak</option>
            </select>
          </label>
        </div>
        <p className="mt-3 border-t border-line-soft pt-3 text-[0.74rem] text-mute">
          {tampil.length} mapel tampil{cari.trim() ? ` dari ${semua.length}` : ''}{isFetching ? ' · memperbarui…' : ''}
        </p>
      </section>

      {katalog.length > 0 && (
        <section className="kartu p-4">
          <h3 className="flex items-center gap-2 text-[1rem]"><Sparkles size={16} className="text-lime" /> Katalog rekomendasi {jenjang}</h3>
          <p className="mt-0.5 text-[0.76rem] leading-relaxed text-mute">Mata pelajaran bawaan jenjang ini yang belum ditambahkan. Klik salah satu untuk mengisi formulir secara otomatis.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {katalog.map((k) => (
              <button
                key={k.kode}
                type="button"
                onClick={() => { bunyi('buka'); setForm({ preset: k }) }}
                className="group flex items-center gap-2 rounded-xl border border-line-soft bg-ink-950/50 px-3 py-2 text-left transition-all duration-200 hover:translate-x-0.5"
                style={{ borderColor: `color-mix(in oklab, ${k.warna} 30%, #1c2549)` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `color-mix(in oklab, ${k.warna} 60%, transparent)` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}
              >
                <span className="size-2.5 flex-none rounded-full" style={{ background: k.warna }} />
                <span className="text-[0.82rem] font-bold text-chalk">{k.nama}</span>
                <span className="font-mono text-[0.7rem] text-mute">{k.kode}</span>
                <Plus size={13} className="text-mute transition group-hover:text-lime" />
              </button>
            ))}
          </div>
        </section>
      )}

      {isPending ? (
        <section className="kartu p-4"><Rangka baris={6} /></section>
      ) : error ? (
        <Galat pesan={error.message} onUlang={refetch} />
      ) : tampil.length === 0 ? (
        <Kosong
          ikon={BookOpen}
          judul={cari.trim() ? 'Tidak ada mapel yang cocok' : `Belum ada mapel untuk jenjang ${jenjang}`}
          pesan={cari.trim() ? 'Ubah kata pencarian untuk menemukan mata pelajaran.' : 'Tambahkan mapel secara manual atau pilih dari katalog rekomendasi jenjang ini.'}
          aksi={
            cari.trim()
              ? <Tombol ukuran="sm" varian="kedua" onClick={() => setCari('')}>Bersihkan pencarian</Tombol>
              : <Tombol ukuran="sm" varian="utama" ikon={Plus} onClick={() => { bunyi('buka'); setForm({}) }}>Tambah mapel</Tombol>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tampil.map((m) => (
            <KartuMapel key={m.id} mapel={m} onUbah={() => { bunyi('buka'); setForm({ mapel: m }) }} onHapus={() => { bunyi('peringatan'); setKonfirmasi(m) }} />
          ))}
        </div>
      )}

      <FormMapel
        terbuka={!!form}
        onTutup={() => setForm(null)}
        mapel={form?.mapel || null}
        preset={form?.preset || null}
        jenjang={form?.mapel?.jenjang || jenjang}
        daftarGuru={daftarGuru}
      />

      <Konfirmasi
        state={konfirmasi && {
          judul: 'Hapus mata pelajaran ini?',
          keterangan: `${konfirmasi.nama} · ${konfirmasi.kode} · jenjang ${konfirmasi.jenjang}`,
          ikon: Trash2,
          warna: '#FF4D6D',
          isi: 'Mapel disembunyikan dari pilihan soal dan ujian. Butir soal yang sudah tersimpan tidak ikut terhapus dan mapel dapat dipulihkan kembali lewat tombol urungkan.',
          rincian: konfirmasi.jumlah_soal > 0 ? `${konfirmasi.jumlah_soal} soal terkait mapel ini.` : 'Belum ada soal pada mapel ini.',
          label: 'Ya, hapus',
          ikonTombol: Trash2,
        }}
        onTutup={() => setKonfirmasi(null)}
        onLanjut={() => hapus.mutate(konfirmasi.id)}
        memuat={hapus.isPending}
      />
    </div>
  )
}