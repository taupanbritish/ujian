import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  UserCircle, Save, KeyRound, ShieldCheck, Mail, IdCard, CalendarDays, LogOut, Volume2, VolumeX,
  Eye, EyeOff, CheckCircle2, GraduationCap, Clock, Fingerprint, Sparkles,
} from 'lucide-react'
import { api, pesanGalat } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useSuara } from '../context/SoundContext'
import { Tombol, Pil, Avatar, Field, Sakelar, JudulBagian, BilahProgres } from '../components/ui'
import { tanggal, relatif } from '../lib/format'

function kekuatan(sandi) {
  if (!sandi) return { skor: 0, label: 'Belum diisi', warna: '#8A93B8' }
  let skor = 0
  if (sandi.length >= 8) skor++
  if (sandi.length >= 12) skor++
  if (/[A-Z]/.test(sandi) && /[a-z]/.test(sandi)) skor++
  if (/\d/.test(sandi)) skor++
  if (/[^A-Za-z0-9]/.test(sandi)) skor++
  const tingkat = Math.min(4, skor)
  return {
    skor: tingkat,
    label: ['Terlalu lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][tingkat],
    warna: ['#FF4D6D', '#FF4D6D', '#FFB020', '#22D3EE', '#A3E635'][tingkat],
  }
}

export default function Profil() {
  const { pengguna, setPengguna, keluar } = useAuth()
  const { aktif: suara, toggle: toggleSuara, bunyi } = useSuara()
  const toast = useToast()
  const navigate = useNavigate()
  const siswa = pengguna.peran === 'siswa'
  const [nama, setNama] = useState(pengguna.nama)
  const [sandilama, setSandiLama] = useState('')
  const [sandiBaru, setSandiBaru] = useState('')
  const [ulangi, setUlangi] = useState('')
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState({})

  const kuat = useMemo(() => kekuatan(sandiBaru), [sandiBaru])
  const namaBerubah = nama.trim() !== pengguna.nama && nama.trim().length >= 3

  const simpanNama = useMutation({
    mutationFn: () => api('/auth/profil', { method: 'PATCH', body: { nama: nama.trim() } }),
    onSuccess: (d) => {
      bunyi('simpan')
      setPengguna(d.pengguna)
      setNama(d.pengguna.nama)
      toast.sukses('Nama tampilan diperbarui')
    },
    onError: (e) => { bunyi('gagal'); toast.gagal('Nama belum tersimpan', { pesan: pesanGalat(e) }) },
  })

  const ubahSandi = useMutation({
    mutationFn: () => api('/auth/profil', { method: 'PATCH', body: { kata_sandi_lama: sandilama, kata_sandi_baru: sandiBaru } }),
    onSuccess: (d) => {
      bunyi('selesai')
      setPengguna(d.pengguna)
      setSandiLama(''); setSandiBaru(''); setUlangi(''); setGalat({})
      toast.sukses('Kata sandi berhasil diganti', { pesan: 'Gunakan kata sandi baru pada masuk berikutnya.' })
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) { const g = {}; e.rincian.forEach((r) => { g[r.kolom] = r.pesan }); setGalat(g) }
      toast.gagal('Kata sandi belum diganti', { pesan: pesanGalat(e) })
    },
  })

  const kirimSandi = () => {
    const g = {}
    if (!sandilama) g.kata_sandi_lama = 'Kata sandi lama wajib diisi.'
    if (sandiBaru.length < 8) g.kata_sandi_baru = 'Kata sandi baru minimal 8 karakter.'
    if (sandiBaru !== ulangi) g.ulangi = 'Pengulangan kata sandi tidak sama.'
    if (sandilama && sandiBaru && sandilama === sandiBaru) g.kata_sandi_baru = 'Kata sandi baru harus berbeda dari yang lama.'
    setGalat(g)
    if (Object.keys(g).length) { bunyi('peringatan'); return }
    ubahSandi.mutate()
  }

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Akun saya"
        judul={siswa ? 'Profil peserta' : 'Profil & keamanan'}
        pesan="Perbarui nama tampilan dan kata sandi akun. Identitas lain seperti NIS, kelas, dan peran dikelola oleh sekolah."
      />

      <section className="kartu relative overflow-hidden p-5">
        <div className="aurora opacity-[0.18]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="anim-apung"><Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={84} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.5rem] leading-tight sm:text-[1.85rem]">{pengguna.nama}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pil warna={siswa ? '#22D3EE' : pengguna.peran === 'admin' ? '#FF4D6D' : '#A3E635'} ikon={siswa ? GraduationCap : ShieldCheck}>
                {siswa ? `Peserta · ${pengguna.kelas}` : pengguna.peran === 'admin' ? 'Administrator' : 'Guru pengampu'}
              </Pil>
              <Pil warna="#8A93B8" ikon={Fingerprint}>ID akun {pengguna.id}</Pil>
              {pengguna.aktif && <Pil warna="#A3E635" ikon={CheckCircle2}>Aktif</Pil>}
            </div>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-mute">
              <span className="flex items-center gap-1.5"><Mail size={12} className="text-cyan" /> {pengguna.email}</span>
              {pengguna.nis && <span className="flex items-center gap-1.5"><IdCard size={12} className="text-amber" /> NIS {pengguna.nis}</span>}
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-lime" /> Masuk terakhir {relatif(pengguna.terakhir_masuk)}</span>
            </p>
          </div>
          <Tombol
            varian="bahaya"
            ikon={LogOut}
            onClick={() => { bunyi('klik'); keluar(); navigate('/masuk') }}
          >
            Keluar dari akun
          </Tombol>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="kartu p-5">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><UserCircle size={17} className="text-violet" /> Identitas tampilan</h3>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-mute">Nama ini muncul pada lembar jawaban, rekap nilai, dan papan pengawasan.</p>

          <div className="mt-4 space-y-3">
            <Field label="Nama lengkap" wajib pesan={nama.trim().length > 0 && nama.trim().length < 3 ? 'Nama minimal 3 karakter.' : undefined}>
              <input value={nama} onChange={(e) => setNama(e.target.value)} className="kolom-field" maxLength={120} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email" petunjuk="Diubah oleh administrator sekolah.">
                <input value={pengguna.email} readOnly className="kolom-field cursor-not-allowed opacity-60" />
              </Field>
              <Field label={siswa ? 'NIS' : 'NIS / NIP'} petunjuk="Diubah oleh administrator sekolah.">
                <input value={pengguna.nis || '—'} readOnly className="kolom-field cursor-not-allowed font-mono opacity-60" />
              </Field>
            </div>
            {siswa && (
              <Field label="Kelas" petunjuk="Penempatan kelas mengikuti data induk sekolah.">
                <input value={pengguna.kelas || '—'} readOnly className="kolom-field cursor-not-allowed opacity-60" />
              </Field>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Tombol varian="utama" ikon={Save} disabled={!namaBerubah} memuat={simpanNama.isPending} onClick={() => simpanNama.mutate()}>
                Simpan nama
              </Tombol>
              {namaBerubah && (
                <Tombol varian="halus" onClick={() => { bunyi('klik'); setNama(pengguna.nama) }}>Batalkan</Tombol>
              )}
              {!namaBerubah && <span className="text-[0.74rem] text-mute">Belum ada perubahan.</span>}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line-soft pt-4">
            <div className="rounded-xl border border-line-soft bg-ink-950/40 p-3">
              <CalendarDays size={14} className="text-sky" />
              <p className="mt-2 text-[0.82rem] font-bold text-chalk">{tanggal(pengguna.dibuat_pada)}</p>
              <p className="mt-1 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">Terdaftar sejak</p>
            </div>
            <div className="rounded-xl border border-line-soft bg-ink-950/40 p-3">
              <Clock size={14} className="text-lime" />
              <p className="mt-2 text-[0.82rem] font-bold text-chalk">{tanggal(pengguna.terakhir_masuk, { jam: true })}</p>
              <p className="mt-1 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">Masuk terakhir</p>
            </div>
          </div>
        </section>

        <section className="kartu p-5">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><KeyRound size={17} className="text-amber" /> Ganti kata sandi</h3>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-mute">Kata sandi disimpan sebagai hash bcrypt dan tidak dapat dibaca ulang oleh siapa pun.</p>

          <div className="mt-4 space-y-3">
            <Field label="Kata sandi lama" wajib pesan={galat.kata_sandi_lama}>
              <input
                type={lihat ? 'text' : 'password'} value={sandilama} onChange={(e) => { setSandiLama(e.target.value); setGalat((g) => ({ ...g, kata_sandi_lama: undefined })) }}
                className="kolom-field" autoComplete="current-password" placeholder="Kata sandi saat ini"
              />
            </Field>
            <Field label="Kata sandi baru" wajib pesan={galat.kata_sandi_baru}>
              <span className="relative block">
                <input
                  type={lihat ? 'text' : 'password'} value={sandiBaru}
                  onChange={(e) => { setSandiBaru(e.target.value); setGalat((g) => ({ ...g, kata_sandi_baru: undefined })) }}
                  className="kolom-field pr-11" autoComplete="new-password" placeholder="Minimal 8 karakter"
                />
                <button
                  type="button" onClick={() => setLihat((v) => !v)}
                  aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-chalk"
                >
                  {lihat ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </span>
            </Field>

            {sandiBaru && (
              <div className="anim-naik rounded-xl border border-line-soft bg-ink-950/40 p-3">
                <div className="flex items-center justify-between text-[0.74rem]">
                  <span className="font-semibold text-body">Kekuatan kata sandi</span>
                  <span className="font-bold" style={{ color: kuat.warna }}>{kuat.label}</span>
                </div>
                <BilahProgres nilai={(kuat.skor / 4) * 100} warna={kuat.warna} className="mt-2" />
                <ul className="mt-2.5 grid gap-1 sm:grid-cols-2">
                  {[
                    { l: 'Minimal 8 karakter', ok: sandiBaru.length >= 8 },
                    { l: 'Huruf besar & kecil', ok: /[A-Z]/.test(sandiBaru) && /[a-z]/.test(sandiBaru) },
                    { l: 'Mengandung angka', ok: /\d/.test(sandiBaru) },
                    { l: 'Mengandung simbol', ok: /[^A-Za-z0-9]/.test(sandiBaru) },
                  ].map((x) => (
                    <li key={x.l} className="flex items-center gap-1.5 text-[0.72rem]" style={{ color: x.ok ? '#A3E635' : '#8a93b8' }}>
                      <CheckCircle2 size={11} className={x.ok ? '' : 'opacity-35'} /> {x.l}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Ulangi kata sandi baru" wajib pesan={galat.ulangi}>
              <input
                type={lihat ? 'text' : 'password'} value={ulangi}
                onChange={(e) => { setUlangi(e.target.value); setGalat((g) => ({ ...g, ulangi: undefined })) }}
                className="kolom-field" autoComplete="new-password" placeholder="Ketik ulang kata sandi baru"
              />
            </Field>

            <Tombol
              varian="utama" ikon={ShieldCheck} className="w-full"
              memuat={ubahSandi.isPending}
              disabled={!sandilama || !sandiBaru || !ulangi}
              onClick={kirimSandi}
            >
              Perbarui kata sandi
            </Tombol>
          </div>
        </section>
      </div>

      <section className="kartu p-5">
        <h3 className="flex items-center gap-2 text-[1.05rem]"><Sparkles size={17} className="text-cyan" /> Preferensi ruang ujian</h3>
        <p className="mt-1 mb-4 text-[0.78rem] text-mute">Pengaturan ini tersimpan pada perangkat yang Anda pakai.</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <Sakelar
            aktif={suara}
            onChange={() => { toggleSuara(); bunyi('pilih') }}
            label="Efek suara antarmuka"
            keterangan="Bunyi pendek saat memilih jawaban, menyimpan, dan mengirim ujian. Tidak memengaruhi jalannya ujian."
            warna="#22D3EE"
          />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-ink-950/40 p-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[0.84rem] font-semibold text-chalk">
                {suara ? <Volume2 size={15} className="text-cyan" /> : <VolumeX size={15} className="text-mute" />}
                Status suara saat ini
              </span>
              <span className="mt-0.5 block text-[0.74rem] text-mute">
                {suara ? 'Aktif — dapat dibisukan kapan saja dari bilah atas.' : 'Dibisukan — seluruh efek suara dimatikan.'}
              </span>
            </span>
            <Pil warna={suara ? '#A3E635' : '#8A93B8'}>{suara ? 'Aktif' : 'Bisu'}</Pil>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-line-soft pt-4 sm:grid-cols-3">
          {[
            { ikon: ShieldCheck, w: '#A3E635', t: 'Sesi terlindungi', d: 'Token masuk berlaku 12 jam dan otomatis berakhir bila kedaluwarsa.' },
            { ikon: GraduationCap, w: '#22D3EE', t: siswa ? 'Token ujian dari pengawas' : 'Token ujian per sesi', d: siswa ? 'Mintakan token kepada guru pengawas sebelum memulai ujian.' : 'Bagikan token hanya kepada peserta pada kelas sasaran.' },
            { ikon: Clock, w: '#FFB020', t: 'Jawaban tersimpan otomatis', d: 'Setiap perubahan jawaban dikirim ke server tanpa perlu menekan tombol simpan.' },
          ].map((x) => {
            const Ikon = x.ikon
            return (
              <div key={x.t} className="flex gap-2.5 rounded-xl border border-line-soft bg-ink-950/40 p-3">
                <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${x.w} 16%, transparent)`, color: x.w }}>
                  <Ikon size={13} />
                </span>
                <span>
                  <span className="block text-[0.8rem] font-bold text-chalk">{x.t}</span>
                  <span className="mt-0.5 block text-[0.73rem] leading-relaxed text-mute">{x.d}</span>
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}