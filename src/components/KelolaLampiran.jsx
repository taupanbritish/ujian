import { useRef, useState } from 'react'
import {
  Paperclip, UploadCloud, Link2, ArrowUp, ArrowDown, Image as ImageIcon,
  Headphones, Film, X, Plus,
} from 'lucide-react'
import { apiUnggah, pesanGalat } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useSuara } from '../context/SoundContext'

const JENIS = {
  gambar: { label: 'Gambar', Ikon: ImageIcon, warna: '#22D3EE' },
  audio: { label: 'Audio', Ikon: Headphones, warna: '#FFB020' },
  video: { label: 'Video', Ikon: Film, warna: '#7C5CFF' },
}

const namaDari = (url) => {
  try {
    const u = new URL(url)
    return decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname)
  } catch {
    return 'Tautan'
  }
}

const normalkan = (baris = []) => baris.map((l) => (
  l.media_id
    ? { jenis: l.jenis, media_id: l.media_id, alt: l.alt || null, nama: l.nama || null }
    : { jenis: l.jenis, url: l.url, alt: l.alt || null, nama: l.nama || null }
))

/**
 * Pengelola lampiran butir soal/opsi. Berkas diunggah lewat /api/media,
 * tautan eksternal disimpan langsung. `onLepas(id)` dipanggil saat lampiran
 * unggahan dilepas agar SoalForm dapat menghapus berkas setelah soal tersimpan.
 */
export default function KelolaLampiran({ nilai = [], onChange, onLepas, ringkas: padat = false }) {
  const toast = useToast()
  const { bunyi } = useSuara()
  const masukan = useRef(null)
  const [sibuk, setSibuk] = useState(false)
  const [bukaTautan, setBukaTautan] = useState(false)
  const [jenisTautan, setJenisTautan] = useState('gambar')
  const [tautan, setTautan] = useState('')
  const [alt, setAlt] = useState('')

  const ubah = (baru) => onChange(normalkan(baru))

  async function unggah(file) {
    if (!file) return
    setSibuk(true)
    try {
      const fd = new FormData()
      fd.append('berkas', file)
      const d = await apiUnggah('/media', fd)
      ubah([...nilai, { jenis: d.media.jenis, media_id: d.media.id, url: d.media.url, nama: d.media.nama_asli, alt: null }])
      bunyi('simpan')
      toast.sukses('Berkas terunggah', { pesan: `${JENIS[d.media.jenis].label} siap dilampirkan pada soal ini.` })
    } catch (e) {
      bunyi('gagal')
      toast.gagal('Berkas belum terunggah', { pesan: pesanGalat(e) })
    } finally {
      setSibuk(false)
      if (masukan.current) masukan.current.value = ''
    }
  }

  function lepas(i) {
    const l = nilai[i]
    ubah(nilai.filter((_, j) => j !== i))
    if (l?.media_id) onLepas?.(l.media_id)
    bunyi('klik')
  }

  function geser(i, arah) {
    const j = i + arah
    if (j < 0 || j >= nilai.length) return
    const baru = [...nilai]
    ;[baru[i], baru[j]] = [baru[j], baru[i]]
    ubah(baru)
  }

  function tambahTautan() {
    const u = tautan.trim()
    if (!/^https?:\/\//i.test(u)) {
      toast.gagal('Tautan belum valid', { pesan: 'Awali tautan dengan http:// atau https://.' })
      return
    }
    if (nilai.length >= 10) {
      toast.ingat('Batas lampiran tercapai', { pesan: 'Maksimal 10 lampiran per butir.' })
      return
    }
    ubah([...nilai, { jenis: jenisTautan, url: u, alt: alt.trim() || null, nama: namaDari(u) }])
    setTautan('')
    setAlt('')
    setBukaTautan(false)
    bunyi('simpan')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { bunyi('klik'); masukan.current?.click() }}
          disabled={sibuk || nilai.length >= 10}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-950/60 px-2.5 py-1.5 text-[0.74rem] font-bold text-body transition hover:border-cyan/60 hover:text-cyan disabled:opacity-40"
        >
          <UploadCloud size={13} /> {sibuk ? 'Mengunggah…' : 'Unggah berkas'}
        </button>
        <button
          type="button"
          onClick={() => { bunyi('klik'); setBukaTautan((x) => !x) }}
          disabled={nilai.length >= 10}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-950/60 px-2.5 py-1.5 text-[0.74rem] font-bold text-body transition hover:border-violet/60 hover:text-violet disabled:opacity-40"
        >
          <Link2 size={13} /> Tempel tautan
        </button>
        <span className="text-[0.66rem] text-mute">Gambar ≤ 5 MB · Audio ≤ 20 MB · Video ≤ 50 MB</span>
        <span className="ml-auto font-mono text-[0.64rem] text-mute">{nilai.length}/10</span>
      </div>

      <input
        ref={masukan}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/ogg,audio/mp4,audio/wav,video/mp4,video/webm"
        onChange={(e) => unggah(e.target.files?.[0])}
      />

      {bukaTautan && (
        <div className="mt-2 rounded-xl border border-line-soft bg-ink-950/50 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(JENIS).map(([k, j]) => {
              const Ikon = j.Ikon
              const aktif = jenisTautan === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setJenisTautan(k)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.68rem] font-bold transition"
                  style={{
                    borderColor: aktif ? j.warna : '#26315e',
                    background: aktif ? `color-mix(in oklab, ${j.warna} 16%, transparent)` : 'transparent',
                    color: aktif ? j.warna : '#8A93B8',
                  }}
                >
                  <Ikon size={11} /> {j.label}
                </button>
              )
            })}
          </div>
          <input
            value={tautan}
            onChange={(e) => setTautan(e.target.value)}
            placeholder="https://contoh.sch.id/gambar-grafik.png"
            className="kolom-field mt-2 py-1.5 font-mono text-[0.76rem]"
            aria-label="Tautan lampiran"
          />
          {jenisTautan === 'gambar' && (
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Teks alternatif gambar (untuk pembaca layar)"
              className="kolom-field mt-1.5 py-1.5 text-[0.76rem]"
              maxLength={300}
              aria-label="Teks alternatif gambar"
            />
          )}
          <div className="mt-2 flex justify-end gap-1.5">
            <button type="button" onClick={() => { setBukaTautan(false); setTautan(''); setAlt('') }} className="rounded-lg border border-line px-2.5 py-1 text-[0.7rem] font-bold text-mute hover:text-chalk">
              Batal
            </button>
            <button type="button" onClick={tambahTautan} className="inline-flex items-center gap-1 rounded-lg border border-lime/50 bg-lime/12 px-2.5 py-1 text-[0.7rem] font-bold text-lime">
              <Plus size={11} /> Tambahkan
            </button>
          </div>
        </div>
      )}

      {nilai.length > 0 && (
        <ul className={`mt-2 space-y-1.5 ${padat ? '' : 'sm:space-y-2'}`}>
          {nilai.map((l, i) => {
            const j = JENIS[l.jenis] || JENIS.gambar
            const Ikon = j.Ikon
            return (
              <li key={`${l.media_id || l.url}-${i}`} className="rounded-xl border border-line-soft bg-ink-950/40 p-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 flex-none place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${j.warna} 16%, transparent)`, color: j.warna }}>
                    <Ikon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.74rem] font-semibold text-chalk">{l.nama || l.url}</span>
                    <span className="block font-mono text-[0.6rem] text-mute">
                      {j.label} · {l.media_id ? `unggahan #${l.media_id}` : 'tautan eksternal'}
                    </span>
                  </span>
                  <span className="flex flex-none gap-0.5">
                    <button type="button" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan lampiran" className="grid size-6 place-items-center rounded border border-line-soft text-mute hover:text-cyan disabled:opacity-25"><ArrowUp size={11} /></button>
                    <button type="button" onClick={() => geser(i, 1)} disabled={i === nilai.length - 1} aria-label="Turunkan lampiran" className="grid size-6 place-items-center rounded border border-line-soft text-mute hover:text-cyan disabled:opacity-25"><ArrowDown size={11} /></button>
                    <button type="button" onClick={() => lepas(i)} aria-label="Lepas lampiran" className="grid size-6 place-items-center rounded border border-line-soft text-mute hover:border-rose/60 hover:text-rose"><X size={11} /></button>
                  </span>
                </div>
                {l.jenis === 'gambar' && (
                  <input
                    value={l.alt || ''}
                    onChange={(e) => {
                      const baru = [...nilai]
                      baru[i] = { ...l, alt: e.target.value }
                      ubah(baru)
                    }}
                    placeholder="Teks alternatif gambar (wajib untuk aksesibilitas)"
                    maxLength={300}
                    aria-label={`Teks alternatif lampiran ${i + 1}`}
                    className="kolom-field mt-1.5 py-1 text-[0.7rem]"
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {nilai.length === 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-mute">
          <Paperclip size={10} /> Belum ada lampiran. Butir tetap bisa disimpan tanpa lampiran.
        </p>
      )}
    </div>
  )
}
