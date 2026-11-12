import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Users, GraduationCap, ShieldCheck, UserCog, Pencil, KeyRound, Archive,
  ArrowUpDown, Mail, CheckCircle2, XCircle, Activity, Sparkles, Eye, EyeOff, UserPlus, Lock,
  FileSpreadsheet, Copy, Download,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, TombolIkon, Pil, Avatar, Sakelar, Kosong, Galat, Rangka, Segmen, Modal, Konfirmasi,
  JudulBagian, Field, BilahProgres,
} from '../../components/ui'
import ImporExcel from '../../components/ImporExcel'
import { Donut, BatangHorizontal } from '../../components/charts'
import { nilaiTeks, warnaNilai, relatif, tanggal } from '../../lib/format'

const PERAN = {
  admin: { label: 'Administrator', warna: '#FF4D6D', ikon: ShieldCheck },
  guru: { label: 'Guru', warna: '#A3E635', ikon: UserCog },
  siswa: { label: 'Peserta', warna: '#22D3EE', ikon: GraduationCap },
}

const KOSONG_FORM = { nama: '', email: '', nis: '', peran: 'siswa', kelas: '', gender: '', aktif: true, kata_sandi: '' }

// Kolom yang dikenali saat impor Excel peserta/akun.
const KOLOM_IMPOR_PESERTA = [
  { kunci: 'nama', label: 'Nama Lengkap', wajib: true, contoh: 'Ahmad Fauzan Ramadhan' },
  { kunci: 'email', label: 'Email', wajib: true, alias: ['surel'], contoh: 'ahmad@cendekia.sch.id' },
  { kunci: 'nis', label: 'NIS', alias: ['nis/nip', 'nip', 'nomor induk'], contoh: '26010' },
  { kunci: 'kelas', label: 'Kelas', alias: ['rombel'], contoh: 'IX-A' },
  { kunci: 'peran', label: 'Peran', alias: ['role'], contoh: 'siswa' },
  { kunci: 'gender', label: 'Jenis Kelamin', alias: ['jk', 'gender', 'l/p'], contoh: 'L' },
]

function kredensialKeCsv(kredensial) {
  const header = ['Nama', 'Email', 'NIS', 'Kelas', 'Kata Sandi']
  const baris = kredensial.map((k) => [k.nama, k.email, k.nis, k.kelas, k.kata_sandi])
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [header, ...baris].map((r) => r.map(esc).join(',')).join('\r\n')
}

function unduhKredensial(kredensial) {
  const blob = new Blob(['\ufeff' + kredensialKeCsv(kredensial)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kredensial-akun-diimpor.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

async function salinKredensial(kredensial) {
  const teks = [['Nama', 'Email', 'NIS', 'Kelas', 'Kata Sandi'],
    ...kredensial.map((k) => [k.nama, k.email, k.nis, k.kelas, k.kata_sandi])].map((r) => r.join('\t')).join('\n')
  await navigator.clipboard.writeText(teks)
}

function FormAkun({ terbuka, onTutup, akun, kelas }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const { pengguna } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState(KOSONG_FORM)
  const [galat, setGalat] = useState({})
  const [lihatSandi, setLihatSandi] = useState(false)
  const admin = pengguna.peran === 'admin'
  const edit = !!akun

  useEffect(() => {
    if (!terbuka) return
    setGalat({})
    setLihatSandi(false)
    setForm(akun ? {
      nama: akun.nama, email: akun.email, nis: akun.nis || '', peran: akun.peran,
      kelas: akun.kelas || '', gender: akun.gender || '', aktif: akun.aktif, kata_sandi: '',
    } : { ...KOSONG_FORM })
  }, [terbuka, akun])

  // Opsi kelas mengikuti Pengaturan → Kelas (bawaan + manual). Saat mengubah akun,
  // sertakan kelas lamanya walau sudah tidak ada di daftar agar tidak hilang diam-diam.
  const opsiKelas = useMemo(() => {
    const s = new Set(kelas)
    if (form.kelas) s.add(form.kelas)
    return [...s]
  }, [kelas, form.kelas])

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setGalat((g) => ({ ...g, [k]: undefined })) }

  const simpan = useMutation({
    mutationFn: () => {
      const body = {
        nama: form.nama.trim(), email: form.email.trim(), nis: form.nis.trim() || null,
        peran: form.peran, kelas: form.peran === 'siswa' ? form.kelas.trim() || null : null,
        gender: form.gender || null, aktif: form.aktif,
      }
      if (form.kata_sandi) body.kata_sandi = form.kata_sandi
      return api(edit ? `/pengguna/${akun.id}` : '/pengguna', { method: edit ? 'PATCH' : 'POST', body })
    },
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['pengguna'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(edit ? 'Perubahan akun tersimpan' : 'Akun baru dibuat', { pesan: d.pesan })
      onTutup()
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) { const g = {}; e.rincian.forEach((r) => { g[r.kolom] = r.pesan }); setGalat(g) }
      toast.gagal('Akun belum tersimpan', { pesan: pesanGalat(e) })
    },
  })

  const kirim = () => {
    const g = {}
    if (form.nama.trim().length < 3) g.nama = 'Nama minimal 3 karakter.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) g.email = 'Format email tidak valid.'
    if (form.peran === 'siswa' && !form.nis.trim()) g.nis = 'NIS wajib diisi untuk akun peserta.'
    if (form.peran === 'siswa' && !form.kelas.trim()) g.kelas = 'Kelas wajib diisi untuk akun peserta.'
    if (!edit && form.kata_sandi.length < 8) g.kata_sandi = 'Kata sandi awal minimal 8 karakter.'
    if (edit && form.kata_sandi && form.kata_sandi.length < 8) g.kata_sandi = 'Kata sandi minimal 8 karakter.'
    setGalat(g)
    if (Object.keys(g).length) { bunyi('peringatan'); return }
    simpan.mutate()
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={edit ? `Ubah akun · ${akun.nama}` : 'Tambah akun baru'}
      keterangan={edit ? 'Perbarui identitas, peran, atau kata sandi akun ini.' : 'Akun dapat langsung digunakan untuk masuk ke ruang ujian.'}
      ikon={edit ? Pencil : UserPlus}
      warna={PERAN[form.peran].warna}
      lebar="max-w-xl"
      kaki={
        <>
          <Tombol varian="halus" onClick={onTutup}>Batal</Tombol>
          <Tombol varian="utama" ikon={CheckCircle2} memuat={simpan.isPending} onClick={kirim}>{edit ? 'Simpan perubahan' : 'Buat akun'}</Tombol>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nama lengkap" wajib pesan={galat.nama}>
          <input value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Contoh: Ahmad Fauzan Ramadhan" className="kolom-field" maxLength={120} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" wajib pesan={galat.email}>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@cendekia.sch.id" className="kolom-field" />
          </Field>
          <Field label="NIS / NIP" pesan={galat.nis} petunjuk={form.peran === 'siswa' ? 'Dipakai peserta untuk masuk.' : 'Opsional untuk staf.'}>
            <input value={form.nis} onChange={(e) => set('nis', e.target.value)} placeholder="26001" className="kolom-field font-mono" maxLength={30} />
          </Field>
        </div>

        <div>
          <span className="label-field">Peran akun</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PERAN).map(([k, v]) => {
              const Ikon = v.ikon
              const boleh = admin || k === 'siswa'
              const dipilih = form.peran === k
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!boleh}
                  onClick={() => { bunyi('pilih'); set('peran', k) }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition disabled:cursor-not-allowed disabled:opacity-35"
                  style={{
                    borderColor: dipilih ? v.warna : '#1c2549',
                    background: dipilih ? `color-mix(in oklab, ${v.warna} 14%, transparent)` : 'rgba(5,7,15,0.4)',
                    color: dipilih ? v.warna : '#8a93b8',
                  }}
                >
                  <Ikon size={17} />
                  <span className="text-[0.76rem] font-bold">{v.label}</span>
                </button>
              )
            })}
          </div>
          {!admin && <p className="mt-1.5 text-[0.72rem] text-mute">Akun guru hanya dapat mengelola peserta. Perubahan peran staf dilakukan administrator.</p>}
        </div>

        {form.peran === 'siswa' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kelas" wajib pesan={galat.kelas} petunjuk="Daftar kelas mengikuti Pengaturan → Kelas.">
              <select
                value={form.kelas}
                onChange={(e) => set('kelas', e.target.value)}
                className="kolom-field"
                aria-label="Pilih kelas"
                disabled={opsiKelas.length === 0}
              >
                <option value="">{opsiKelas.length ? 'Pilih kelas…' : 'Belum ada kelas di Pengaturan'}</option>
                {opsiKelas.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Jenis kelamin">
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="kolom-field">
                <option value="">Tidak disebutkan</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </Field>
          </div>
        )}

        <Field
          label={edit ? 'Kata sandi baru (opsional)' : 'Kata sandi awal'}
          wajib={!edit}
          pesan={galat.kata_sandi}
          petunjuk={edit ? 'Kosongkan bila tidak ingin mengubah kata sandi.' : 'Minimal 8 karakter. Sampaikan langsung kepada pemilik akun.'}
        >
          <span className="relative block">
            <input
              type={lihatSandi ? 'text' : 'password'}
              value={form.kata_sandi}
              onChange={(e) => set('kata_sandi', e.target.value)}
              placeholder={edit ? 'Biarkan kosong bila tetap' : 'Minimal 8 karakter'}
              className="kolom-field pr-11"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setLihatSandi((v) => !v)}
              aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-chalk"
            >
              {lihatSandi ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </Field>

        <Sakelar aktif={form.aktif} onChange={(v) => set('aktif', v)} label="Akun aktif" keterangan="Akun nonaktif tidak dapat masuk ke ruang ujian." />
      </div>
    </Modal>
  )
}

export default function Peserta() {
  const toast = useToast()
  const { bunyi } = useSuara()
  const { pengguna } = useAuth()
  const qc = useQueryClient()
  const [peran, setPeran] = useState('semua')
  const [cari, setCari] = useState('')
  const [kelas, setKelas] = useState('semua')
  const [urutan, setUrutan] = useState('kelas')
  const [form, setForm] = useState(null)
  const [sandiUntuk, setSandiUntuk] = useState(null)
  const [sandiBaru, setSandiBaru] = useState('')
  const [konfirmasi, setKonfirmasi] = useState(null)
  const [impor, setImpor] = useState(false)
  const admin = pengguna.peran === 'admin'

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ urutan })
    if (peran !== 'semua') p.set('peran', peran)
    if (kelas !== 'semua') p.set('kelas', kelas)
    if (cari.trim()) p.set('cari', cari.trim())
    return p.toString()
  }, [peran, kelas, cari, urutan])

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['pengguna', queryString],
    queryFn: () => api(`/pengguna?${queryString}`),
    placeholderData: (d) => d,
  })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api('/auth/meta'), staleTime: 120000 })
  const { data: kelasData } = useQuery({ queryKey: ['kelas-daftar'], queryFn: () => api('/pengguna/kelas/daftar'), staleTime: 60000 })

  const invalidasi = () => {
    qc.invalidateQueries({ queryKey: ['pengguna'] })
    qc.invalidateQueries({ queryKey: ['kelas-daftar'] })
    qc.invalidateQueries({ queryKey: ['meta'] })
    qc.invalidateQueries({ queryKey: ['ringkasan'] })
  }

  const pulihkan = useMutation({
    mutationFn: (id) => api(`/pengguna/${id}/pulihkan`, { method: 'POST' }),
    onSuccess: (d) => { bunyi('simpan'); invalidasi(); toast.sukses(d.pesan) },
    onError: (e) => { bunyi('gagal'); toast.gagal('Akun belum dapat dipulihkan', { pesan: pesanGalat(e) }) },
  })

  const arsip = useMutation({
    mutationFn: (id) => api(`/pengguna/${id}`, { method: 'DELETE' }),
    onSuccess: (d) => {
      bunyi('peringatan')
      setKonfirmasi(null)
      invalidasi()
      toast.ingat(d.pesan, {
        pesan: 'Akun dipindahkan ke arsip dan tidak dapat masuk.',
        aksi: { label: 'Pulihkan akun', fn: () => pulihkan.mutate(d.id) },
      })
    },
    onError: (e) => { bunyi('gagal'); setKonfirmasi(null); toast.gagal('Akun belum dapat diarsipkan', { pesan: pesanGalat(e) }) },
  })

  const resetSandi = useMutation({
    mutationFn: () => api(`/pengguna/${sandiUntuk.id}/reset-sandi`, { method: 'POST', body: { kata_sandi: sandiBaru } }),
    onSuccess: (d) => {
      bunyi('simpan')
      setSandiUntuk(null)
      setSandiBaru('')
      invalidasi()
      toast.sukses(d.pesan, { pesan: 'Sampaikan kata sandi baru secara langsung kepada pemilik akun.' })
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Kata sandi belum diatur ulang', { pesan: pesanGalat(e) }) },
  })

  const rows = data?.data || []
  const r = data?.ringkas
  const tampil = rows
  const sebaranKelas = (kelasData?.data || []).map((k, i) => ({
    label: k.kelas,
    nilai: k.jumlah,
    warna: ['#7C5CFF', '#22D3EE', '#A3E635', '#FFB020', '#FF4D6D', '#38BDF8', '#F472B6', '#34D399'][i % 8],
  }))

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Administrasi akun"
        judul="Peserta & akun sekolah"
        pesan="Kelola identitas peserta, guru, dan administrator. Akun yang diarsipkan tetap menyimpan riwayat nilainya."
        kanan={
          <span className="flex flex-wrap items-center gap-2">
            <Tombol varian="kedua" ikon={FileSpreadsheet} onClick={() => { bunyi('buka'); setImpor(true) }}>Import Excel</Tombol>
            <Tombol varian="utama" ikon={Plus} onClick={() => { bunyi('buka'); setForm({ baru: true }) }}>Tambah akun</Tombol>
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: 'Total akun', n: r?.total ?? 0, w: '#7C5CFF', ikon: Users },
          { l: 'Peserta', n: r?.siswa ?? 0, w: '#22D3EE', ikon: GraduationCap },
          { l: 'Guru', n: r?.guru ?? 0, w: '#A3E635', ikon: UserCog },
          { l: 'Administrator', n: r?.admin ?? 0, w: '#FF4D6D', ikon: ShieldCheck },
          { l: 'Nonaktif', n: r?.nonaktif ?? 0, w: '#FFB020', ikon: XCircle },
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
          <div className="relative">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, email, atau NIS…" className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Cari akun" />
          </div>
          <select value={kelas} onChange={(e) => setKelas(e.target.value)} className="kolom-field py-2.5 text-[0.84rem]" aria-label="Saring kelas">
            <option value="semua">Semua kelas</option>
            {(meta?.kelas || []).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <label className="relative">
            <ArrowUpDown size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-mute" />
            <select value={urutan} onChange={(e) => setUrutan(e.target.value)} className="kolom-field py-2.5 pl-9 text-[0.84rem]" aria-label="Urutkan akun">
              <option value="kelas">Kelas lalu nama</option>
              <option value="nama">Nama A–Z</option>
              <option value="nilai">Rata-rata nilai tertinggi</option>
              <option value="baru">Paling baru terdaftar</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
          <Segmen
            nilai={peran}
            onChange={setPeran}
            pilihan={[
              { nilai: 'semua', label: 'Semua peran' },
              { nilai: 'siswa', label: 'Peserta', jumlah: r?.siswa },
              { nilai: 'guru', label: 'Guru', jumlah: r?.guru },
              { nilai: 'admin', label: 'Admin', jumlah: r?.admin },
            ]}
          />
          <span className="ml-auto text-[0.74rem] text-mute">{tampil.length} akun tampil{isFetching ? ' · memperbarui…' : ''}</span>
        </div>
      </section>

      <div className="space-y-4">
        <section className="kartu overflow-hidden">
          {isPending ? <div className="p-4"><Rangka baris={7} /></div> : error ? <div className="p-4"><Galat pesan={error.message} onUlang={refetch} /></div> : tampil.length === 0 ? (
            <div className="p-4">
              <Kosong
                ikon={Users}
                judul="Tidak ada akun yang cocok"
                pesan="Ubah kata pencarian, kelas, atau saringan peran untuk menemukan akun."
                aksi={<Tombol ukuran="sm" varian="kedua" onClick={() => { setCari(''); setKelas('semua'); setPeran('semua') }}>Bersihkan saringan</Tombol>}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-950/40">
                    {['Akun', 'Peran', 'Kelas / NIS', 'Percobaan', 'Rata nilai', 'Terakhir masuk', 'Status', 'Tindakan'].map((h) => (
                      <th key={h} className="p-3 text-[0.64rem] font-bold tracking-widest text-mute uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((x) => {
                    const p = PERAN[x.peran]
                    const Ikon = p.ikon
                    const bolehUbah = admin || x.peran === 'siswa'
                    return (
                      <tr key={x.id} className="garis-tabel">
                        <td className="p-3">
                          <span className="flex items-center gap-2.5">
                            <Avatar nama={x.nama} gender={x.gender} ukuran={36} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[0.85rem] font-semibold text-chalk">{x.nama}</span>
                                {x.id === pengguna.id && <Pil warna="#F472B6">Anda</Pil>}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-mute"><Mail size={10} /> {x.email}</span>
                            </span>
                          </span>
                        </td>
                        <td className="p-3"><Pil warna={p.warna} ikon={Ikon}>{p.label}</Pil></td>
                        <td className="p-3">
                          <span className="block text-[0.8rem] font-semibold text-body">{x.kelas || '—'}</span>
                          <span className="block font-mono text-[0.68rem] text-mute">{x.nis || 'tanpa NIS'}</span>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1.5 font-mono text-[0.82rem] text-body">
                            {x.jumlah_percobaan}
                            {x.sedang_mengerjakan > 0 && <span className="size-1.5 animate-pulse rounded-full bg-lime" title="Sedang mengerjakan" />}
                          </span>
                        </td>
                        <td className="p-3">
                          {x.rata_nilai === null ? <span className="text-[0.8rem] text-mute">—</span> : (
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[0.88rem] font-bold" style={{ color: warnaNilai(x.rata_nilai) }}>{nilaiTeks(x.rata_nilai)}</span>
                              <span className="w-12"><BilahProgres nilai={x.rata_nilai} warna={warnaNilai(x.rata_nilai)} tinggi={4} /></span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="block text-[0.76rem] text-body">{relatif(x.terakhir_masuk)}</span>
                          <span className="block text-[0.64rem] text-mute">terdaftar {tanggal(x.dibuat_pada, { tahun: false })}</span>
                        </td>
                        <td className="p-3">
                          {x.aktif ? <Pil warna="#A3E635" ikon={CheckCircle2}>Aktif</Pil> : <Pil warna="#8A93B8" ikon={XCircle}>Nonaktif</Pil>}
                        </td>
                        <td className="p-3">
                          <span className="flex gap-1.5">
                            <TombolIkon ikon={Pencil} label={`Ubah akun ${x.nama}`} onClick={() => { bunyi('buka'); setForm({ akun: x }) }} disabled={!bolehUbah} />
                            <TombolIkon ikon={KeyRound} label={`Atur ulang kata sandi ${x.nama}`} onClick={() => { bunyi('buka'); setSandiUntuk(x); setSandiBaru('') }} disabled={!bolehUbah} />
                            <TombolIkon ikon={Archive} label={`Arsipkan akun ${x.nama}`} onClick={() => { bunyi('peringatan'); setKonfirmasi(x) }} disabled={!bolehUbah || x.id === pengguna.id} />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="kartu p-4">
            <h3 className="text-[1rem]">Komposisi peran</h3>
            <p className="mt-0.5 mb-4 text-[0.75rem] text-mute">Perbandingan akun aktif maupun nonaktif pada saringan saat ini.</p>
            <Donut
              judul="Akun"
              data={[
                { label: 'Peserta', jumlah: r?.siswa || 0, warna: '#22D3EE' },
                { label: 'Guru', jumlah: r?.guru || 0, warna: '#A3E635' },
                { label: 'Administrator', jumlah: r?.admin || 0, warna: '#FF4D6D' },
              ]}
            />
          </section>

          <section className="kartu p-4">
            <h3 className="text-[1rem]">Sebaran kelas</h3>
            <p className="mt-0.5 mb-3 text-[0.75rem] text-mute">Jumlah peserta terdaftar pada setiap rombongan belajar.</p>
            {sebaranKelas.length === 0 ? (
              <p className="text-[0.8rem] text-mute">Belum ada kelas terdaftar.</p>
            ) : (
              <BatangHorizontal data={sebaranKelas} maks={Math.max(...sebaranKelas.map((k) => k.nilai))} satuan=" peserta" />
            )}
          </section>

          <section className="kartu p-4">
            <h3 className="flex items-center gap-2 text-[1rem]"><Lock size={15} className="text-pink" /> Keamanan akun</h3>
            <ul className="mt-3 space-y-2.5">
              {[
                { ikon: KeyRound, w: '#FFB020', t: 'Kata sandi terenkripsi', d: 'Disimpan sebagai hash bcrypt, tidak pernah ditampilkan kembali di aplikasi.' },
                { ikon: Archive, w: '#22D3EE', t: 'Arsip, bukan hapus', d: 'Akun yang diarsipkan kehilangan akses masuk namun riwayat nilainya tetap utuh dan dapat dipulihkan.' },
                { ikon: Activity, w: '#A3E635', t: 'Sesi berjalan terlindungi', d: 'Akun yang sedang mengerjakan ujian tidak dapat diarsipkan sampai sesinya selesai atau direset.' },
                { ikon: Sparkles, w: '#F472B6', t: 'Masuk dengan NIS', d: 'Peserta cukup memakai NIS dan kata sandi, tanpa perlu mengingat alamat email.' },
              ].map((x) => {
                const Ikon = x.ikon
                return (
                  <li key={x.t} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${x.w} 16%, transparent)`, color: x.w }}>
                      <Ikon size={13} />
                    </span>
                    <span>
                      <span className="block text-[0.8rem] font-bold text-chalk">{x.t}</span>
                      <span className="mt-0.5 block text-[0.74rem] leading-relaxed text-mute">{x.d}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      <FormAkun
        terbuka={!!form}
        onTutup={() => setForm(null)}
        akun={form?.akun || null}
        kelas={meta?.kelas || []}
      />

      <ImporExcel
        terbuka={impor}
        onTutup={() => setImpor(false)}
        judul="Import peserta & akun dari Excel"
        keterangan="Unggah berkas .xlsx/.xls/.csv berisi data peserta. Kata sandi awal dibuat otomatis oleh sistem dan ditampilkan setelah impor selesai agar dapat Anda sampaikan ke masing-masing pemilik akun."
        ikon={FileSpreadsheet}
        warna="#22D3EE"
        lebar="max-w-3xl"
        kolom={KOLOM_IMPOR_PESERTA}
        namaTemplate="template-peserta.xlsx"
        onKirim={async (baris) => {
          const h = await api('/pengguna/import', { method: 'POST', body: { baris } })
          invalidasi()
          return h
        }}
        ringkasHasil={(h) => ([
          { label: 'Dibuat', nilai: h.dibuat, warna: '#A3E635', ikon: CheckCircle2 },
          { label: 'Dilewati', nilai: h.dilewati, warna: '#FFB020', ikon: Activity },
          { label: 'Gagal', nilai: h.galat, warna: '#FF4D6D', ikon: XCircle },
        ])}
        renderHasil={(h) => (
          <div className="space-y-3">
            {h.kredensial?.length > 0 && (
              <div className="rounded-xl border border-lime/35 bg-lime/8 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[0.8rem] font-bold text-lime">
                    <KeyRound size={14} /> Kata sandi dibuat otomatis untuk {h.kredensial.length} akun baru
                  </p>
                  <span className="flex gap-2">
                    <Tombol ukuran="sm" varian="halus" ikon={Copy} onClick={async () => { bunyi('klik'); await salinKredensial(h.kredensial); toast.sukses('Kredensial disalin ke papan klip') }}>Salin</Tombol>
                    <Tombol ukuran="sm" varian="kedua" ikon={Download} onClick={() => { bunyi('klik'); unduhKredensial(h.kredensial); toast.sukses('Berkas kredensial diunduh') }}>Unduh CSV</Tombol>
                  </span>
                </div>
                <p className="mt-1 text-[0.72rem] text-body">Simpan sekarang — daftar kata sandi ini tidak ditampilkan lagi setelah modal ditutup.</p>
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line-soft">
                  <table className="w-full min-w-[520px] text-left">
                    <thead className="sticky top-0 bg-ink-950">
                      <tr className="border-b border-line">
                        {['Nama', 'Email', 'NIS', 'Kelas', 'Kata sandi'].map((x) => (
                          <th key={x} className="p-2 text-[0.6rem] font-bold tracking-widest text-mute uppercase">{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {h.kredensial.map((k, i) => (
                        <tr key={i} className="border-b border-line-soft/60 last:border-0">
                          <td className="p-2 text-[0.76rem] text-chalk">{k.nama}</td>
                          <td className="p-2 text-[0.72rem] text-mute">{k.email}</td>
                          <td className="p-2 font-mono text-[0.72rem] text-body">{k.nis || '—'}</td>
                          <td className="p-2 text-[0.72rem] text-body">{k.kelas || '—'}</td>
                          <td className="p-2 font-mono text-[0.76rem] font-bold text-lime">{k.kata_sandi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {h.rincian_lewat?.length > 0 && (
              <div className="rounded-xl border border-amber/35 bg-amber/8 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.76rem] font-bold text-amber"><Activity size={13} /> Dilewati ({h.rincian_lewat.length})</p>
                <ul className="max-h-28 space-y-0.5 overflow-auto text-[0.72rem] text-body">
                  {h.rincian_lewat.map((x, i) => <li key={i}>Baris {x.baris} · {x.nama || '—'} — {x.alasan}</li>)}
                </ul>
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

      <Modal
        terbuka={!!sandiUntuk}
        onTutup={() => setSandiUntuk(null)}
        judul="Atur ulang kata sandi"
        keterangan={sandiUntuk ? `${sandiUntuk.nama} · ${sandiUntuk.email}` : ''}
        ikon={KeyRound}
        warna="#FFB020"
        lebar="max-w-md"
        kaki={
          <>
            <Tombol varian="halus" onClick={() => setSandiUntuk(null)}>Batal</Tombol>
            <Tombol
              varian="utama"
              ikon={KeyRound}
              memuat={resetSandi.isPending}
              disabled={sandiBaru.length < 8}
              onClick={() => resetSandi.mutate()}
            >
              Simpan kata sandi
            </Tombol>
          </>
        }
      >
        <Field label="Kata sandi baru" wajib petunjuk="Minimal 8 karakter. Pemilik akun dapat menggantinya lagi melalui halaman profil.">
          <input
            type="text"
            value={sandiBaru}
            onChange={(e) => setSandiBaru(e.target.value)}
            placeholder="Kata sandi baru"
            className="kolom-field font-mono"
            autoComplete="new-password"
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Sekolah2026', 'Ujian#2026', 'Belajar2026!'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { bunyi('pilih'); setSandiBaru(s) }}
              className="rounded-lg border border-line-soft bg-ink-950/50 px-2.5 py-1 font-mono text-[0.74rem] text-mute transition hover:border-cyan hover:text-cyan"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-xl border border-amber/35 bg-amber/8 p-3 text-[0.76rem] leading-relaxed text-body">
          Kata sandi lama langsung tidak berlaku. Pastikan pemilik akun menerima kata sandi baru sebelum sesi ujian berikutnya.
        </p>
      </Modal>

      <Konfirmasi
        state={konfirmasi && {
          judul: 'Arsipkan akun ini?',
          keterangan: `${konfirmasi.nama} · ${PERAN[konfirmasi.peran].label}`,
          ikon: Archive,
          warna: '#FFB020',
          isi: 'Akun kehilangan akses masuk dan tidak lagi dihitung sebagai peserta sasaran. Riwayat ujian serta nilainya tetap tersimpan.',
          rincian: `${konfirmasi.jumlah_percobaan} percobaan tercatat · rata-rata nilai ${nilaiTeks(konfirmasi.rata_nilai)}`,
          label: 'Ya, arsipkan',
          ikonTombol: Archive,
        }}
        onTutup={() => setKonfirmasi(null)}
        onLanjut={() => arsip.mutate(konfirmasi.id)}
        memuat={arsip.isPending}
      />
    </div>
  )
}