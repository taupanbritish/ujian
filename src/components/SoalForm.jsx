import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Check, Save, FileQuestion, ListChecks, ToggleLeft, TextCursorInput, AlignLeft } from 'lucide-react'
import { api, pesanGalat } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useSuara } from '../context/SoundContext'
import { Field, Modal, Pil, Tombol, OpsiMapel } from './ui'
import { TIPE, TINGKAT } from '../lib/format'

const IKON_TIPE = { pilihan_ganda: ListChecks, benar_salah: ToggleLeft, isian: TextCursorInput, esai: AlignLeft }
const HURUF = ['a', 'b', 'c', 'd', 'e']

const kosong = (mapelId) => ({
  mapel_id: mapelId || '',
  tipe: 'pilihan_ganda',
  pertanyaan: '',
  opsi: [{ id: 'a', teks: '' }, { id: 'b', teks: '' }, { id: 'c', teks: '' }, { id: 'd', teks: '' }],
  kunci: '',
  pembahasan: '',
  tingkat: 'sedang',
  bobot: 1,
  topik: '',
})

function dariSoal(s) {
  return {
    mapel_id: s.mapel_id,
    tipe: s.tipe,
    pertanyaan: s.pertanyaan,
    opsi: s.tipe === 'pilihan_ganda' ? s.opsi.map((o) => ({ ...o })) : [{ id: 'a', teks: '' }, { id: 'b', teks: '' }, { id: 'c', teks: '' }, { id: 'd', teks: '' }],
    kunci: s.kunci || '',
    pembahasan: s.pembahasan || '',
    tingkat: s.tingkat,
    bobot: Number(s.bobot),
    topik: s.topik || '',
  }
}

export default function SoalForm({ terbuka, onTutup, soal, mapel, mapelAktif }) {
  const [form, setForm] = useState(kosong(mapelAktif))
  const [galat, setGalat] = useState({})
  const toast = useToast()
  const { bunyi } = useSuara()
  const qc = useQueryClient()
  const edit = !!soal

  useEffect(() => {
    if (terbuka) {
      setForm(soal ? dariSoal(soal) : kosong(mapelAktif))
      setGalat({})
    }
  }, [terbuka, soal, mapelAktif])

  const ubah = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const simpan = useMutation({
    mutationFn: (body) => (edit ? api(`/soal/${soal.id}`, { method: 'PATCH', body }) : api('/soal', { method: 'POST', body })),
    onSuccess: (d) => {
      bunyi('simpan')
      qc.invalidateQueries({ queryKey: ['soal'] })
      qc.invalidateQueries({ queryKey: ['ringkasan'] })
      qc.invalidateQueries({ queryKey: ['meta'] })
      if (edit) qc.invalidateQueries({ queryKey: ['soal-detail', soal.id] })
      toast.sukses(d.pesan || (edit ? 'Soal diperbarui.' : 'Soal ditambahkan.'), { pesan: edit && d.dipakai ? `Soal ini dipakai pada ${d.dipakai} paket ujian.` : undefined })
      onTutup()
    },
    onError: (e) => {
      bunyi('gagal')
      if (e.rincian) {
        const g = {}
        e.rincian.forEach((r) => { g[r.kolom] = r.pesan })
        setGalat(g)
      }
      toast.gagal('Soal belum tersimpan', { pesan: pesanGalat(e) })
    },
  })

  const kirim = () => {
    const g = {}
    if (!form.mapel_id) g.mapel_id = 'Pilih mata pelajaran.'
    if (form.pertanyaan.trim().length < 8) g.pertanyaan = 'Pertanyaan minimal 8 karakter.'
    if (form.tipe === 'pilihan_ganda') {
      const terisi = form.opsi.filter((o) => o.teks.trim())
      if (terisi.length < 2) g.opsi = 'Isi minimal dua opsi jawaban.'
      else if (!terisi.some((o) => o.id === form.kunci)) g.kunci = 'Tentukan kunci jawaban.'
    }
    if (form.tipe === 'benar_salah' && !['benar', 'salah'].includes(form.kunci)) g.kunci = 'Pilih Benar atau Salah.'
    if (form.tipe === 'isian' && !form.kunci.trim()) g.kunci = 'Isi kunci jawaban. Pisahkan alternatif dengan tanda |'
    if (Object.keys(g).length) {
      setGalat(g)
      bunyi('gagal')
      return
    }
    const opsi = form.tipe === 'pilihan_ganda'
      ? form.opsi.filter((o) => o.teks.trim()).map((o) => ({ id: o.id, teks: o.teks.trim() }))
      : form.tipe === 'benar_salah' ? [{ id: 'benar', teks: 'Benar' }, { id: 'salah', teks: 'Salah' }] : []
    simpan.mutate({
      mapel_id: Number(form.mapel_id),
      tipe: form.tipe,
      pertanyaan: form.pertanyaan.trim(),
      opsi,
      kunci: form.tipe === 'esai' ? (form.kunci.trim() || null) : form.kunci,
      pembahasan: form.pembahasan.trim() || null,
      tingkat: form.tingkat,
      bobot: Number(form.bobot) || 1,
      topik: form.topik.trim() || null,
    })
  }

  const tambahOpsi = () => {
    if (form.opsi.length >= 5) return
    const id = HURUF.find((h) => !form.opsi.some((o) => o.id === h)) || `o${form.opsi.length}`
    ubah('opsi', [...form.opsi, { id, teks: '' }])
  }

  return (
    <Modal
      terbuka={terbuka}
      onTutup={onTutup}
      judul={edit ? 'Ubah butir soal' : 'Tambah butir soal'}
      keterangan={edit ? `Soal #${soal.id} · perubahan langsung berlaku pada seluruh paket yang memakainya` : 'Soal baru langsung tersedia untuk disusun ke paket ujian mana pun.'}
      ikon={FileQuestion}
      lebar="max-w-3xl"
      kaki={
        <>
          <Tombol varian="halus" onClick={onTutup}>Batal</Tombol>
          <Tombol varian="utama" ikon={Save} memuat={simpan.isPending} onClick={kirim}>{edit ? 'Simpan perubahan' : 'Tambahkan ke bank soal'}</Tombol>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="label-field">Bentuk soal</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(TIPE).map(([kunci, t]) => {
              const Ikon = IKON_TIPE[kunci]
              const aktif = form.tipe === kunci
              return (
                <button
                  key={kunci}
                  type="button"
                  onClick={() => {
                    bunyi('klik')
                    setForm((f) => ({
                      ...f,
                      tipe: kunci,
                      kunci: kunci === 'benar_salah' ? '' : kunci === f.tipe ? f.kunci : '',
                      bobot: kunci === 'esai' ? Math.max(3, f.bobot) : f.bobot,
                    }))
                  }}
                  className="flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all duration-200"
                  style={{
                    borderColor: aktif ? t.warna : '#1c2549',
                    background: aktif ? `color-mix(in oklab, ${t.warna} 14%, transparent)` : 'rgba(5,7,15,0.4)',
                  }}
                >
                  <Ikon size={17} style={{ color: t.warna }} />
                  <span className="text-[0.78rem] font-bold text-chalk">{t.label}</span>
                  <span className="font-mono text-[0.62rem] text-mute">{t.singkat}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Mata pelajaran" wajib pesan={galat.mapel_id}>
            <select value={form.mapel_id} onChange={(e) => ubah('mapel_id', e.target.value)} className="kolom-field">
              <option value="">Pilih mapel…</option>
              <OpsiMapel mapel={mapel} />
            </select>
          </Field>
          <Field label="Tingkat kesukaran">
            <select value={form.tingkat} onChange={(e) => ubah('tingkat', e.target.value)} className="kolom-field">
              {Object.entries(TINGKAT).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Bobot nilai" petunjuk="Uraian biasanya berbobot lebih besar.">
            <input type="number" min="0.5" max="20" step="0.5" value={form.bobot} onChange={(e) => ubah('bobot', e.target.value)} className="kolom-field font-mono" />
          </Field>
        </div>

        <Field label="Topik / materi" petunjuk="Contoh: Aljabar, Teks Eksposisi, Pembiasan.">
          <input value={form.topik} onChange={(e) => ubah('topik', e.target.value)} placeholder="Materi yang diukur" className="kolom-field" maxLength={80} />
        </Field>

        <Field label="Pertanyaan" wajib pesan={galat.pertanyaan}>
          <textarea
            value={form.pertanyaan}
            onChange={(e) => ubah('pertanyaan', e.target.value)}
            rows={4}
            placeholder="Tuliskan pokok pertanyaan. Baris baru akan ditampilkan apa adanya pada lembar peserta."
            className="kolom-field resize-y leading-relaxed"
          />
        </Field>

        {form.tipe === 'pilihan_ganda' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label-field mb-0">Opsi jawaban & kunci</span>
              <Tombol ukuran="sm" varian="kedua" ikon={Plus} onClick={tambahOpsi} disabled={form.opsi.length >= 5}>Tambah opsi</Tombol>
            </div>
            <div className="space-y-2">
              {form.opsi.map((o, i) => {
                const aktif = form.kunci === o.id
                return (
                  <div key={o.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { bunyi('pilih'); ubah('kunci', o.id) }}
                      title={aktif ? 'Kunci jawaban' : 'Jadikan kunci jawaban'}
                      className="grid size-9 flex-none place-items-center rounded-xl border font-mono text-[0.8rem] font-bold transition-all"
                      style={{
                        borderColor: aktif ? '#A3E635' : '#26315e',
                        background: aktif ? 'rgba(163,230,53,0.16)' : 'rgba(5,7,15,0.5)',
                        color: aktif ? '#A3E635' : '#8A93B8',
                      }}
                    >
                      {aktif ? <Check size={15} strokeWidth={3} /> : o.id.toUpperCase()}
                    </button>
                    <input
                      value={o.teks}
                      onChange={(e) => ubah('opsi', form.opsi.map((x) => (x.id === o.id ? { ...x, teks: e.target.value } : x)))}
                      placeholder={`Opsi ${o.id.toUpperCase()}`}
                      className="kolom-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        bunyi('klik')
                        const sisa = form.opsi.filter((x) => x.id !== o.id)
                        setForm((f) => ({ ...f, opsi: sisa, kunci: f.kunci === o.id ? '' : f.kunci }))
                      }}
                      disabled={form.opsi.length <= 2}
                      aria-label={`Hapus opsi ${i + 1}`}
                      className="grid size-9 flex-none place-items-center rounded-xl border border-line-soft text-mute transition hover:border-rose/60 hover:text-rose disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
            {(galat.opsi || galat.kunci) && <p className="mt-2 text-[0.74rem] font-semibold text-rose">{galat.opsi || galat.kunci}</p>}
            <p className="mt-2 text-[0.72rem] text-mute">Klik huruf di sebelah kiri untuk menandai kunci jawaban.</p>
          </div>
        )}

        {form.tipe === 'benar_salah' && (
          <div>
            <span className="label-field">Kunci jawaban</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ id: 'benar', label: 'Benar', warna: '#A3E635' }, { id: 'salah', label: 'Salah', warna: '#FF4D6D' }].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { bunyi('pilih'); ubah('kunci', p.id) }}
                  className="rounded-xl border p-3 text-[0.88rem] font-bold transition-all"
                  style={{
                    borderColor: form.kunci === p.id ? p.warna : '#1c2549',
                    background: form.kunci === p.id ? `color-mix(in oklab, ${p.warna} 16%, transparent)` : 'rgba(5,7,15,0.4)',
                    color: form.kunci === p.id ? p.warna : '#8A93B8',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {galat.kunci && <p className="mt-2 text-[0.74rem] font-semibold text-rose">{galat.kunci}</p>}
          </div>
        )}

        {form.tipe === 'isian' && (
          <Field label="Kunci jawaban" wajib pesan={galat.kunci} petunjuk="Pisahkan beberapa jawaban yang diterima dengan tanda | contoh: 7|tujuh">
            <input value={form.kunci} onChange={(e) => ubah('kunci', e.target.value)} placeholder="dispersi" className="kolom-field font-mono" />
          </Field>
        )}

        {form.tipe === 'esai' && (
          <Field label="Pedoman penskoran" petunjuk="Ditampilkan kepada guru saat menilai, tidak kepada peserta.">
            <textarea value={form.kunci} onChange={(e) => ubah('kunci', e.target.value)} rows={3} placeholder="Skor 3 bila … Skor 2 bila … Skor 1 bila …" className="kolom-field resize-y leading-relaxed" />
          </Field>
        )}

        <Field label="Pembahasan" petunjuk="Tampil pada lembar hasil peserta bila ujian mengizinkan pembahasan.">
          <textarea value={form.pembahasan} onChange={(e) => ubah('pembahasan', e.target.value)} rows={3} placeholder="Jelaskan langkah atau alasan jawaban yang benar." className="kolom-field resize-y leading-relaxed" />
        </Field>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-ink-950/40 p-3">
          <span className="text-[0.74rem] text-mute">Pratinjau:</span>
          <Pil warna={TIPE[form.tipe].warna}>{TIPE[form.tipe].label}</Pil>
          <Pil warna={TINGKAT[form.tingkat].warna}>{TINGKAT[form.tingkat].label}</Pil>
          <Pil warna="#22D3EE">Bobot {form.bobot}</Pil>
          {form.topik && <Pil warna="#8A93B8">{form.topik}</Pil>}
        </div>
      </div>
    </Modal>
  )
}