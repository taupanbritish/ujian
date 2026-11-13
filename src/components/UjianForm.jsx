import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, FileStack, RefreshCw, CalendarClock } from 'lucide-react'
import { api, pesanGalat } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useSuara } from '../context/SoundContext'
import { Field, Modal, Sakelar, Tombol, OpsiMapel } from './ui'
import { keInputLokal } from '../lib/format'

const awal = () => {
  const mulai = new Date(Date.now() + 3600_000)
  mulai.setMinutes(0, 0, 0)
  const selesai = new Date(mulai.getTime() + 4 * 3600_000)
  return {
    judul: '',
    mapel_id: '',
    deskripsi: '',
    durasi_menit: 60,
    token: '',
    mulai_pada: keInputLokal(mulai),
    selesai_pada: keInputLokal(selesai),
    status: 'draf',
    acak_soal: true,
    acak_opsi: false,
    tampil_pembahasan: true,
    kkm: 75,
    batas_percobaan: 1,
    kelas_target: [],
  }
}

export default function UjianForm({ terbuka, onTutup, ujian, mapel, kelas, onTersimpan }) {
  const mapelTunggal = mapel?.length === 1 ? mapel[0].id : ''
  const [form, setForm] = useState(awal)
  const [galat, setGalat] = useState({})
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const edit = !!ujian

  useEffect(() => {
    if (!terbuka) return
    setGalat({})
    setForm(ujian ? {
      judul: ujian.judul,
      mapel_id: ujian.mapel_id,
      deskripsi: ujian.deskripsi || '',
      durasi_menit: ujian.durasi_menit,
      token: ujian.token,
      mulai_pada: keInputLokal(ujian.mulai_pada),
      selesai_pada: keInputLokal(ujian.selesai_pada),
      status: ujian.status,
      acak_soal: ujian.acak_soal,
      acak_opsi: ujian.acak_opsi,
      tampil_pembahasan: ujian.tampil_pembahasan,
      kkm: Number(ujian.kkm),
      batas_percobaan: ujian.batas_percobaan,
      kelas_target: ujian.kelas_target || [],
    } : { ...awal(), mapel_id: mapelTunggal })
  }, [terbuka, ujian, mapelTunggal])

  const ubah = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const simpan = useMutation({
    mutationFn: (body) => (edit ? api(`/ujian/${ujian.id}`, { method: 'PATCH', body }) : api('/ujian', { method: 'POST', body })),
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['ujian'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      toast.sukses(d.pesan)
      onTutup()
      onTersimpan?.(d.id)
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) {
        const g = {}
        e.rincian.forEach((r) => { g[r.kolom] = r.pesan })
        setGalat(g)
      }
      toast.gagal('Ujian belum tersimpan', { pesan: pesanGalat(e) })
    },
  })

  const kirim = () => {
    const g = {}
    if (form.judul.trim().length < 5) g.judul = 'Judul minimal 5 karakter.'
    if (!form.mapel_id) g.mapel_id = 'Pilih mata pelajaran.'
    if (!form.mulai_pada) g.mulai_pada = 'Tentukan waktu mulai.'
    if (!form.selesai_pada) g.selesai_pada = 'Tentukan waktu selesai.'
    if (form.mulai_pada && form.selesai_pada && new Date(form.selesai_pada) <= new Date(form.mulai_pada)) g.selesai_pada = 'Waktu selesai harus setelah waktu mulai.'
    if (form.durasi_menit < 5) g.durasi_menit = 'Durasi minimal 5 menit.'
    if (Object.keys(g).length) { setGalat(g); bunyi('gagal'); return }
    simpan.mutate({
      ...form,
      judul: form.judul.trim(),
      mapel_id: Number(form.mapel_id),
      durasi_menit: Number(form.durasi_menit),
      kkm: Number(form.kkm),
      batas_percobaan: Number(form.batas_percobaan),
      deskripsi: form.deskripsi.trim() || null,
      token: form.token.trim() || null,
      mulai_pada: new Date(form.mulai_pada).toISOString(),
      selesai_pada: new Date(form.selesai_pada).toISOString(),
    })
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={edit ? 'Ubah pengaturan ujian' : 'Buat paket ujian'}
      keterangan={edit ? ujian.judul : 'Langkah berikutnya: menyusun butir soal ke dalam paket ini.'}
      ikon={FileStack}
      lebar="max-w-3xl"
      kaki={
        <>
          <Tombol varian="halus" onClick={onTutup}>Batal</Tombol>
          <Tombol varian="utama" ikon={Save} memuat={simpan.isPending} onClick={kirim}>{edit ? 'Simpan pengaturan' : 'Buat dan susun soal'}</Tombol>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Judul ujian" wajib pesan={galat.judul}>
          <input value={form.judul} onChange={(e) => ubah('judul', e.target.value)} placeholder="Penilaian Harian 2 — Sistem Persamaan Linear" className="kolom-field" maxLength={160} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mata pelajaran" wajib pesan={galat.mapel_id}>
            <select value={form.mapel_id} onChange={(e) => ubah('mapel_id', e.target.value)} className="kolom-field">
              <option value="">Pilih mapel…</option>
              <OpsiMapel mapel={mapel} />
            </select>
          </Field>
          <Field label="Status publikasi">
            <select value={form.status} onChange={(e) => ubah('status', e.target.value)} className="kolom-field">
              <option value="draf">Draf — belum terlihat peserta</option>
              <option value="terbit">Terbit — terlihat sesuai jadwal</option>
              <option value="ditutup">Ditutup — tidak bisa dikerjakan</option>
            </select>
          </Field>
        </div>

        <Field label="Petunjuk untuk peserta">
          <textarea value={form.deskripsi} onChange={(e) => ubah('deskripsi', e.target.value)} rows={2} placeholder="Cakupan materi, aturan pengerjaan, atau catatan khusus." className="kolom-field resize-y" maxLength={1200} />
        </Field>

        <div className="rounded-2xl border border-line-soft bg-ink-950/40 p-4">
          <p className="mb-3 flex items-center gap-2 font-mono text-[0.68rem] font-bold tracking-widest text-cyan uppercase"><CalendarClock size={13} /> Jadwal & durasi</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mulai" wajib pesan={galat.mulai_pada}>
              <input type="datetime-local" value={form.mulai_pada} onChange={(e) => ubah('mulai_pada', e.target.value)} className="kolom-field font-mono text-[0.82rem]" />
            </Field>
            <Field label="Selesai" wajib pesan={galat.selesai_pada}>
              <input type="datetime-local" value={form.selesai_pada} onChange={(e) => ubah('selesai_pada', e.target.value)} className="kolom-field font-mono text-[0.82rem]" />
            </Field>
            <Field label="Durasi (menit)" pesan={galat.durasi_menit} petunjuk="Hitung mundur per peserta.">
              <input type="number" min="5" max="300" value={form.durasi_menit} onChange={(e) => ubah('durasi_menit', e.target.value)} className="kolom-field font-mono" />
            </Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Token masuk" petunjuk="Kosongkan untuk dibuat otomatis.">
            <span className="flex gap-2">
              <input value={form.token} onChange={(e) => ubah('token', e.target.value.toUpperCase())} placeholder="OTOMATIS" className="kolom-field font-mono tracking-widest" maxLength={12} />
              <TombolIkonGenerate onClick={() => {
                const kode = (mapel.find((m) => String(m.id) === String(form.mapel_id))?.kode || 'UJN').slice(0, 3)
                ubah('token', kode + String(Math.floor(Math.random() * 900) + 100))
                bunyi('klik')
              }} />
            </span>
          </Field>
          <Field label="KKM" petunjuk="Batas tuntas untuk rekap.">
            <input type="number" min="0" max="100" value={form.kkm} onChange={(e) => ubah('kkm', e.target.value)} className="kolom-field font-mono" />
          </Field>
          <Field label="Kesempatan mengerjakan" petunjuk="Nilai terbaik yang tercatat.">
            <input type="number" min="1" max="10" value={form.batas_percobaan} onChange={(e) => ubah('batas_percobaan', e.target.value)} className="kolom-field font-mono" />
          </Field>
        </div>

        <div>
          <span className="label-field">Kelas peserta</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { bunyi('klik'); ubah('kelas_target', []) }}
              className="rounded-xl border px-3 py-2 text-[0.8rem] font-bold transition"
              style={{ borderColor: form.kelas_target.length === 0 ? '#22D3EE' : '#1c2549', background: form.kelas_target.length === 0 ? 'rgba(34,211,238,0.14)' : 'transparent', color: form.kelas_target.length === 0 ? '#22D3EE' : '#8A93B8' }}
            >
              Semua kelas
            </button>
            {kelas.map((k) => {
              const aktif = form.kelas_target.includes(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { bunyi('klik'); ubah('kelas_target', aktif ? form.kelas_target.filter((x) => x !== k) : [...form.kelas_target, k]) }}
                  className="rounded-xl border px-3 py-2 text-[0.8rem] font-bold transition"
                  style={{ borderColor: aktif ? '#A3E635' : '#1c2549', background: aktif ? 'rgba(163,230,53,0.14)' : 'transparent', color: aktif ? '#A3E635' : '#8A93B8' }}
                >
                  {k}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Sakelar label="Acak urutan soal" keterangan="Tiap peserta mendapat urutan berbeda." aktif={form.acak_soal} onChange={(v) => ubah('acak_soal', v)} warna="#7C5CFF" />
          <Sakelar label="Acak opsi jawaban" keterangan="Urutan A–E berbeda per peserta." aktif={form.acak_opsi} onChange={(v) => ubah('acak_opsi', v)} warna="#22D3EE" />
          <Sakelar label="Buka pembahasan" keterangan="Peserta melihat kunci setelah selesai." aktif={form.tampil_pembahasan} onChange={(v) => ubah('tampil_pembahasan', v)} warna="#A3E635" />
        </div>
      </div>
    </Modal>
  )
}

function TombolIkonGenerate({ onClick }) {
  return (
    <button type="button" onClick={onClick} title="Buat token acak" aria-label="Buat token acak" className="grid size-[42px] flex-none place-items-center rounded-xl border border-line bg-ink-800 text-mute transition hover:border-cyan hover:text-cyan">
      <RefreshCw size={15} />
    </button>
  )
}