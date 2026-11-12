import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Save, School, Building2, CalendarDays, Layers, Terminal,
  GraduationCap, Sparkles, Lock, CheckCircle2, ArrowRight, RotateCcw, Info, Check,
  Plus, X, Users,
} from 'lucide-react'
import { api, pesanGalat } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSekolah } from '../../context/SekolahContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import { Tombol, Pil, Field, JudulBagian, Salin, Kosong, Konfirmasi, Segmen } from '../../components/ui'
import { Logo } from '../../components/Logo'
import { JENJANG_INFO, DAFTAR_JENJANG, labelJenjang, warnaJenjang } from '../../lib/jenjang'

function Pratinjau({ namaSekolah, namaAplikasi, tahun, jenjang, labelJenjang: label }) {
  const bagian = (namaAplikasi || 'ShanaTech CBT').trim().split(/\s+/)
  const warna = warnaJenjang(jenjang)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-950 p-5">
      <div className="aurora opacity-30" />
      <div className="teksturnoda pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <div className="relative">
        <p className="mb-3 font-mono text-[0.62rem] font-bold tracking-[0.22em] text-mute uppercase">Pratinjau langsung</p>
        <div className="flex items-center gap-3">
          <Logo ukuran={42} />
          <div className="min-w-0">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[1.15rem] leading-none font-extrabold tracking-tight text-chalk">{bagian[0]}</span>
              {bagian.slice(1).join(' ') && (
                <span className="rounded-md bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] px-1.5 py-0.5 font-mono text-[0.6rem] font-bold tracking-widest text-white">{bagian.slice(1).join(' ')}</span>
              )}
            </span>
            <p className="mt-1 truncate text-[0.72rem] font-semibold text-mute">{namaSekolah || 'Nama sekolah'}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-line-soft bg-ink-900/70 p-3.5">
          <p className="font-mono text-[0.6rem] font-bold tracking-[0.2em] uppercase" style={{ color: warna }}>Tahun ajaran {tahun || '—'}</p>
          <p className="mt-1.5 font-display text-[1.5rem] leading-tight text-chalk">Ruang ujian yang tenang untuk semua.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pil warna={warna} ikon={GraduationCap}>{jenjang}</Pil>
            <Pil warna="#8A93B8">{label}</Pil>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-mute">
          <Sparkles size={12} className="text-cyan" /> Beginilah identitas tampil di halaman masuk, bilah samping, dan lembar jawaban.
        </p>
      </div>
    </div>
  )
}

function KelolaKelas({ jenjangAktif }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const [jenjang, setJenjang] = useState(jenjangAktif)
  const [nama, setNama] = useState('')
  const [galat, setGalat] = useState('')

  const { data, isPending } = useQuery({
    queryKey: ['rombel', jenjang],
    queryFn: () => api(`/pengaturan/rombel?jenjang=${jenjang}`),
    placeholderData: (d) => d,
  })

  const segarkan = () => {
    qc.invalidateQueries({ queryKey: ['rombel'] })
    qc.invalidateQueries({ queryKey: ['pengaturan'] })
    qc.invalidateQueries({ queryKey: ['meta'] })
  }

  const tambah = useMutation({
    mutationFn: () => api('/pengaturan/rombel', { method: 'POST', body: { jenjang, nama: nama.trim() } }),
    onSuccess: (d) => { bunyi('simpan'); setNama(''); setGalat(''); segarkan(); toast.sukses(d.pesan) },
    onError: (e) => { bunyi('gagal'); setGalat(pesanGalat(e)); toast.gagal('Kelas belum ditambahkan', { pesan: pesanGalat(e) }) },
  })

  const hapus = useMutation({
    mutationFn: (id) => api(`/pengaturan/rombel/${id}`, { method: 'DELETE' }),
    onSuccess: (d) => { bunyi('peringatan'); segarkan(); toast.ingat(d.pesan) },
    onError: (e) => { bunyi('gagal'); toast.gagal('Kelas belum dihapus', { pesan: pesanGalat(e) }) },
  })

  const kirim = () => {
    const v = nama.trim()
    if (!v) { setGalat('Nama kelas wajib diisi.'); bunyi('peringatan'); return }
    if (v.length > 20) { setGalat('Nama kelas maksimal 20 karakter.'); bunyi('peringatan'); return }
    setGalat('')
    tambah.mutate()
  }

  const bawaan = data?.bawaan || []
  const manual = data?.manual || []
  const bukanAktif = jenjang !== jenjangAktif

  return (
    <div className="mt-4 rounded-xl border border-line-soft bg-ink-950/40 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[0.62rem] font-bold tracking-[0.18em] text-mute uppercase">
          <Users size={12} /> Rombongan belajar
        </p>
        <Segmen
          nilai={jenjang}
          onChange={(j) => { bunyi('pilih'); setJenjang(j); setGalat('') }}
          pilihan={DAFTAR_JENJANG.map((j) => ({ nilai: j, label: j }))}
        />
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className="mb-1.5 text-[0.66rem] font-bold tracking-wide text-mute uppercase">Kelas bawaan {jenjang}</p>
          <div className="flex flex-wrap gap-1.5">
            {bawaan.map((k) => (
              <span key={k} className="rounded-lg border border-line-soft bg-ink-950/50 px-2.5 py-1 font-mono text-[0.72rem] font-bold text-mute" title="Kelas bawaan jenjang (tidak dapat dihapus)">{k}</span>
            ))}
            {!bawaan.length && <span className="text-[0.76rem] text-mute">{isPending ? 'Memuat…' : '—'}</span>}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[0.66rem] font-bold tracking-wide text-mute uppercase">Kelas tambahan · {manual.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {manual.map((k) => (
              <span key={k.id} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[0.72rem] font-bold" style={{ borderColor: warnaJenjang(jenjang), color: warnaJenjang(jenjang), background: `color-mix(in oklab, ${warnaJenjang(jenjang)} 10%, transparent)` }}>
                {k.nama}
                <button type="button" onClick={() => { bunyi('klik'); hapus.mutate(k.id) }} aria-label={`Hapus kelas ${k.nama}`} className="grid size-4 place-items-center rounded transition hover:bg-ink-700">
                  <X size={11} />
                </button>
              </span>
            ))}
            {!manual.length && <span className="text-[0.76rem] text-mute">Belum ada kelas tambahan untuk jenjang {jenjang}.</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2 border-t border-line-soft pt-3">
          <span className="relative min-w-[10rem] flex-1">
            <input
              value={nama}
              onChange={(e) => { setNama(e.target.value); setGalat('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); kirim() } }}
              placeholder={`Tambah kelas ${jenjang}, mis. ${jenjang === 'SMK' ? 'X RPL' : 'X-D'}`}
              className="kolom-field py-2 font-mono text-[0.8rem] uppercase"
              maxLength={20}
              aria-label="Nama kelas baru"
            />
          </span>
          <Tombol varian="utama" ikon={Plus} memuat={tambah.isPending} onClick={kirim}>Tambah kelas</Tombol>
        </div>
        {galat && <p className="text-[0.72rem] font-semibold text-rose">{galat}</p>}
        {bukanAktif && (
          <p className="flex items-center gap-1.5 text-[0.72rem] text-amber">
            <Info size={12} /> Kelas ini untuk jenjang {jenjang} (bukan jenjang aktif). Tetap tersimpan dan otomatis tersedia saat jenjang {jenjang} diaktifkan.
          </p>
        )}
      </div>
    </div>
  )
}

export default function Pengaturan() {
  const { pengguna } = useAuth()
  const sekolah = useSekolah()
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const admin = pengguna.peran === 'admin'

  const [form, setForm] = useState({
    nama_sekolah: sekolah.nama_sekolah,
    nama_aplikasi: sekolah.nama_aplikasi,
    tahun_ajaran: sekolah.tahun_ajaran,
  })
  const [galat, setGalat] = useState({})
  const [jenjangPilih, setJenjangPilih] = useState(sekolah.jenjang)
  const [konfirmasiJenjang, setKonfirmasiJenjang] = useState(false)

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setGalat((g) => ({ ...g, [k]: undefined })) }

  const berubah = useMemo(() => (
    form.nama_sekolah.trim() !== sekolah.nama_sekolah ||
    form.nama_aplikasi.trim() !== sekolah.nama_aplikasi ||
    form.tahun_ajaran.trim() !== sekolah.tahun_ajaran
  ), [form, sekolah.nama_sekolah, sekolah.nama_aplikasi, sekolah.tahun_ajaran])

  const berubahJenjang = jenjangPilih !== sekolah.jenjang

  const simpan = useMutation({
    mutationFn: () => api('/pengaturan', {
      method: 'PUT',
      body: {
        nama_sekolah: form.nama_sekolah.trim(),
        nama_aplikasi: form.nama_aplikasi.trim(),
        tahun_ajaran: form.tahun_ajaran.trim(),
      },
    }),
    onSuccess: (d) => {
      bunyi('simpan')
      sekolah.terapkan(d)
      setForm({ nama_sekolah: d.nama_sekolah, nama_aplikasi: d.nama_aplikasi, tahun_ajaran: d.tahun_ajaran })
      toast.sukses('Identitas sekolah diperbarui', { pesan: 'Seluruh antarmuka kini memakai nama dan tahun ajaran baru.' })
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) { const g = {}; e.rincian.forEach((r) => { g[r.kolom] = r.pesan }); setGalat(g) }
      toast.gagal('Identitas belum tersimpan', { pesan: pesanGalat(e) })
    },
  })

  const terapkanJenjang = useMutation({
    mutationFn: () => api('/pengaturan', { method: 'PUT', body: { jenjang: jenjangPilih } }),
    onSuccess: (d) => {
      bunyi('simpan')
      sekolah.terapkan(d)
      qc.invalidateQueries({ queryKey: ['meta'] })
      qc.invalidateQueries({ queryKey: ['mapel'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      setKonfirmasiJenjang(false)
      toast.sukses(`Jenjang ${d.jenjang} diterapkan`, { pesan: 'Struktur kelas dan katalog mata pelajaran menyesuaikan jenjang baru. Data lama tetap utuh.' })
    },
    onError: (e) => {
      bunyi('gagal')
      setKonfirmasiJenjang(false)
      toast.gagal('Jenjang belum diterapkan', { pesan: pesanGalat(e) })
    },
  })

  const kirim = () => {
    const g = {}
    if (form.nama_sekolah.trim().length < 3) g.nama_sekolah = 'Nama sekolah minimal 3 karakter.'
    if (form.nama_aplikasi.trim().length < 3) g.nama_aplikasi = 'Nama aplikasi minimal 3 karakter.'
    if (form.tahun_ajaran.trim().length < 4) g.tahun_ajaran = 'Tahun ajaran tidak valid (contoh 2026/2027).'
    setGalat(g)
    if (Object.keys(g).length) { bunyi('peringatan'); return }
    simpan.mutate()
  }

  const blokEnv = useMemo(() => [
    `# Identitas sekolah — ubah nilai ini saat distribusi ke sekolah lain`,
    `SEKOLAH_NAMA="${form.nama_sekolah.trim() || sekolah.nama_sekolah}"`,
    `SEKOLAH_JENJANG=${sekolah.jenjang}`,
    `TAHUN_AJARAN="${form.tahun_ajaran.trim() || sekolah.tahun_ajaran}"`,
    `NAMA_APLIKASI="${form.nama_aplikasi.trim() || sekolah.nama_aplikasi}"`,
  ].join('\n'), [form, sekolah.nama_sekolah, sekolah.jenjang, sekolah.tahun_ajaran, sekolah.nama_aplikasi])

  if (!admin) {
    return (
      <div className="space-y-5">
        <JudulBagian eyebrow="Administrasi" judul="Pengaturan Sekolah" pesan="Identitas sekolah dan jenjang yang aktif." />
        <Kosong
          ikon={Lock}
          judul="Hanya administrator yang dapat mengubah identitas"
          pesan="Anda masuk sebagai guru. Nama sekolah, nama aplikasi, jenjang, dan tahun ajaran dikelola oleh administrator sekolah."
        />
        <section className="kartu p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { l: 'Nama sekolah', v: sekolah.nama_sekolah, ikon: School, w: '#22D3EE' },
              { l: 'Nama aplikasi', v: sekolah.nama_aplikasi, ikon: Sparkles, w: '#7C5CFF' },
              { l: 'Jenjang', v: `${sekolah.jenjang} · ${sekolah.label_jenjang}`, ikon: GraduationCap, w: warnaJenjang(sekolah.jenjang) },
              { l: 'Tahun ajaran', v: sekolah.tahun_ajaran, ikon: CalendarDays, w: '#A3E635' },
            ].map((x) => {
              const Ikon = x.ikon
              return (
                <div key={x.l} className="flex items-center gap-3 rounded-xl border border-line-soft bg-ink-950/40 p-3.5">
                  <span className="grid size-9 flex-none place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${x.w} 16%, transparent)`, color: x.w }}><Ikon size={16} /></span>
                  <span className="min-w-0">
                    <span className="block text-[0.66rem] font-bold tracking-wide text-mute uppercase">{x.l}</span>
                    <span className="block truncate text-[0.9rem] font-bold text-chalk">{x.v}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  const warnaAktif = warnaJenjang(sekolah.jenjang)

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Administrasi"
        judul="Pengaturan Sekolah"
        pesan="Satu sumber identitas untuk seluruh aplikasi. Ubah nama sekolah, nama aplikasi, tahun ajaran, dan jenjang satuan pendidikan di sini — setiap halaman, lembar jawaban, katalog mapel, dan rekap nilai ikut menyesuaikan secara langsung."
        kanan={<Pil warna={warnaAktif} ikon={GraduationCap}>{sekolah.jenjang} · {labelJenjang(sekolah.jenjang)}</Pil>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="kartu p-5">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><Building2 size={17} className="text-cyan" /> Identitas sekolah</h3>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-mute">Perubahan berlaku serta-merta untuk semua pengguna setelah disimpan.</p>

          <div className="mt-4 space-y-3.5">
            <Field label="Nama sekolah" wajib pesan={galat.nama_sekolah} petunjuk="Tampil di bilah samping, halaman masuk, kop lembar jawaban, dan footer.">
              <input value={form.nama_sekolah} onChange={(e) => set('nama_sekolah', e.target.value)} className="kolom-field" maxLength={120} placeholder="Contoh: SMP Negeri 1 Nusantara" />
            </Field>
            <Field label="Nama aplikasi" wajib pesan={galat.nama_aplikasi} petunjuk="Kata pertama menjadi nama utama, sisanya menjadi lencana (mis. “ShanaTech CBT”).">
              <input value={form.nama_aplikasi} onChange={(e) => set('nama_aplikasi', e.target.value)} className="kolom-field" maxLength={60} placeholder="Contoh: ShanaTech CBT" />
            </Field>
            <Field label="Tahun ajaran" wajib pesan={galat.tahun_ajaran} petunjuk="Format bebas, umumnya tahun/tahun.">
              <input value={form.tahun_ajaran} onChange={(e) => set('tahun_ajaran', e.target.value)} className="kolom-field font-mono" maxLength={20} placeholder="2026/2027" />
            </Field>

            <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
              <Tombol varian="utama" ikon={Save} disabled={!berubah} memuat={simpan.isPending} onClick={kirim}>Simpan identitas</Tombol>
              {berubah && (
                <Tombol varian="halus" ikon={RotateCcw} onClick={() => { bunyi('klik'); setForm({ nama_sekolah: sekolah.nama_sekolah, nama_aplikasi: sekolah.nama_aplikasi, tahun_ajaran: sekolah.tahun_ajaran }); setGalat({}) }}>
                  Batalkan
                </Tombol>
              )}
              {!berubah && <span className="flex items-center gap-1.5 text-[0.74rem] text-mute"><CheckCircle2 size={13} className="text-lime" /> Tersinkron dengan server.</span>}
            </div>
          </div>
        </section>

        <Pratinjau
          namaSekolah={form.nama_sekolah}
          namaAplikasi={form.nama_aplikasi}
          tahun={form.tahun_ajaran}
          jenjang={jenjangPilih}
          labelJenjang={labelJenjang(jenjangPilih)}
        />
      </div>

      <section className="kartu p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[1.05rem]"><Layers size={17} style={{ color: warnaJenjang(jenjangPilih) }} /> Jenjang satuan pendidikan</h3>
            <p className="mt-1 max-w-2xl text-[0.78rem] leading-relaxed text-mute">
              Pilih jenjang yang aktif untuk sekolah ini. Jenjang menentukan struktur rombongan belajar dan katalog mata pelajaran
              yang direkomendasikan. Perubahan berlaku langsung setelah diterapkan — data soal, ujian, dan peserta yang sudah ada tetap utuh.
            </p>
          </div>
          <Pil warna={warnaAktif} ikon={GraduationCap}>Aktif: {sekolah.jenjang}</Pil>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DAFTAR_JENJANG.map((j) => {
            const info = JENJANG_INFO[j]
            const dipilih = jenjangPilih === j
            const isActive = sekolah.jenjang === j
            return (
              <button
                key={j}
                type="button"
                aria-pressed={dipilih}
                onClick={() => { bunyi('pilih'); setJenjangPilih(j) }}
                className="relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: dipilih ? info.warna : '#1c2549',
                  background: dipilih ? `color-mix(in oklab, ${info.warna} 12%, transparent)` : 'rgba(5,7,15,0.4)',
                  boxShadow: dipilih ? `0 16px 34px -20px ${info.warna}` : 'none',
                }}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-display text-[1.9rem] leading-none" style={{ color: dipilih ? info.warna : '#8a93b8' }}>{j}</span>
                  {isActive ? <Pil warna={info.warna} padat>Aktif</Pil>
                    : dipilih ? (
                      <span className="grid size-5 place-items-center rounded-full" style={{ background: info.warna }}>
                        <Check size={12} className="text-ink-950" strokeWidth={3} />
                      </span>
                    ) : null}
                </span>
                <span className="mt-1 text-[0.8rem] font-bold text-chalk">{info.label}</span>
                <span className="font-mono text-[0.64rem] text-mute">{info.tingkat}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
          {berubahJenjang ? (
            <>
              <span className="flex items-center gap-2 text-[0.82rem] text-body">
                <ArrowRight size={14} className="text-amber" />
                Perubahan: <b className="text-chalk">{sekolah.jenjang}</b> → <b style={{ color: warnaJenjang(jenjangPilih) }}>{jenjangPilih}</b>
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Tombol varian="halus" ikon={RotateCcw} onClick={() => { bunyi('klik'); setJenjangPilih(sekolah.jenjang) }}>Batalkan</Tombol>
                <Tombol varian="utama" ikon={Check} memuat={terapkanJenjang.isPending} onClick={() => { bunyi('peringatan'); setKonfirmasiJenjang(true) }}>Terapkan jenjang</Tombol>
              </div>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-[0.78rem] text-mute"><CheckCircle2 size={14} className="text-lime" /> Jenjang {sekolah.jenjang} aktif dan tersinkron dengan server.</span>
          )}
        </div>

        <KelolaKelas jenjangAktif={sekolah.jenjang} />
      </section>

      <section className="kartu overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5">
          <div>
            <h3 className="flex items-center gap-2 text-[1.05rem]"><Terminal size={17} className="text-lime" /> Distribusi ke sekolah lain</h3>
            <p className="mt-1 max-w-2xl text-[0.78rem] leading-relaxed text-mute">
              Untuk memakai aplikasi ini di sekolah berbeda, cukup salin blok berikut ke berkas <code className="rounded bg-ink-950 px-1 py-0.5 font-mono text-[0.72rem] text-cyan">.env</code>,
              sesuaikan nilainya, lalu jalankan migrasi dan seeder. Tidak perlu mengubah kode.
            </p>
          </div>
          <Salin teks={blokEnv} label="Salin .env" />
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <pre className="overflow-x-auto rounded-xl border border-line-soft bg-ink-950 p-4 font-mono text-[0.76rem] leading-relaxed text-body">{blokEnv}</pre>
          <ol className="space-y-2.5">
            {[
              { t: 'Salin blok environment', d: 'Tempel ke .env server, ubah SEKOLAH_NAMA dan SEKOLAH_JENJANG sesuai sekolah tujuan.' },
              { t: 'Siapkan database', d: 'Arahkan DATABASE_URL ke PostgreSQL sekolah tersebut (cloud atau lokal).' },
              { t: 'Migrasi & seed', d: 'Jalankan npm run db:migrate lalu npm run db:seed — struktur kelas, mapel, dan soal menyesuaikan jenjang.' },
              { t: 'Bangun & jalankan', d: 'npm run build lalu npm start. Identitas baru langsung tampil di seluruh antarmuka.' },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3 rounded-xl border border-line-soft bg-ink-950/40 p-3">
                <span className="grid size-6 flex-none place-items-center rounded-lg bg-[linear-gradient(105deg,#7C5CFF,#22D3EE)] font-mono text-[0.7rem] font-bold text-white">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[0.82rem] font-bold text-chalk">{x.t} {i < 3 && <ArrowRight size={12} className="text-mute" />}</span>
                  <span className="mt-0.5 block text-[0.73rem] leading-relaxed text-mute">{x.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex items-start gap-2.5 border-t border-line-soft bg-ink-900/50 px-5 py-3.5">
          <Info size={15} className="mt-0.5 flex-none text-cyan" />
          <p className="text-[0.75rem] leading-relaxed text-mute">
            Nama sekolah, nama aplikasi, tahun ajaran, dan jenjang dapat diubah kapan saja lewat antarmuka ini tanpa proses distribusi ulang.
            Jenjang yang dipilih menentukan struktur kelas dan katalog mata pelajaran; data lama tetap menyimpan kelas serta jenjang asalnya.
          </p>
        </div>
      </section>

      <Konfirmasi
        state={konfirmasiJenjang && {
          judul: `Terapkan jenjang ${jenjangPilih}?`,
          keterangan: `${sekolah.jenjang} → ${jenjangPilih} · ${labelJenjang(jenjangPilih)}`,
          ikon: GraduationCap,
          warna: warnaJenjang(jenjangPilih),
          varian: 'utama',
          isi: 'Struktur kelas dan katalog mata pelajaran akan menyesuaikan jenjang baru. Data soal, ujian, dan peserta yang sudah ada tetap menyimpan kelas serta jenjang lamanya, sehingga tidak ada yang hilang.',
          label: `Ya, terapkan ${jenjangPilih}`,
          ikonTombol: Check,
        }}
        onTutup={() => setKonfirmasiJenjang(false)}
        onLanjut={() => terapkanJenjang.mutate()}
        memuat={terapkanJenjang.isPending}
      />
    </div>
  )
}