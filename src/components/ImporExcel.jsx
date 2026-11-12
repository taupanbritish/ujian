import { useMemo, useRef, useState } from 'react'
import {
  FileSpreadsheet, Download, UploadCloud, CheckCircle2, AlertTriangle, XCircle,
  ArrowLeft, Trash2, Table2,
} from 'lucide-react'
import { Modal, Tombol, Pil } from './ui'
import { useSuara } from '../context/SoundContext'

// xlsx (~400KB) dimuat malas hanya saat fitur impor benar-benar dipakai,
// agar tidak membebani bundel awal halaman admin.
const muatXLSX = () => import('xlsx')

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Ubah baris mentah (kunci = teks header Excel) menjadi objek berkunci kanonik
// dengan mencocokkan header terhadap label/alias tiap kolom secara longgar.
function petakanBaris(json, kolom) {
  if (!json.length) return []
  const headerAsli = Object.keys(json[0])
  const alias = {}
  for (const k of kolom) {
    for (const a of [k.label, k.kunci, ...(k.alias || [])]) alias[norm(a)] = k.kunci
  }
  const peta = {}
  for (const h of headerAsli) { const n = norm(h); if (alias[n]) peta[h] = alias[n] }
  return json.map((row) => {
    const o = {}
    for (const h of headerAsli) { const kk = peta[h]; if (kk) o[kk] = String(row[h] ?? '').trim() }
    return o
  })
}

/**
 * Modal impor Excel generik.
 * props:
 *  - terbuka, onTutup
 *  - judul, keterangan, ikon, warna, lebar
 *  - kolom: [{ kunci, label, alias?, contoh?, wajib? }]  (urutan = kolom template)
 *  - namaTemplate: 'peserta.xlsx'
 *  - onKirim(baris) => Promise<hasil>   (hasil = respons server)
 *  - renderHasil(hasil, {reset}) => ReactNode  (opsional; tampilan pasca-impor)
 *  - ringkasHasil(hasil) => {label,nilai,warna,ikon}[]  (opsional; kartu ringkasan)
 */
export default function ImporExcel({
  terbuka, onTutup, judul, keterangan, ikon: Ikon = FileSpreadsheet, warna = '#22D3EE',
  lebar = 'max-w-3xl', kolom, namaTemplate, onKirim, renderHasil, ringkasHasil,
}) {
  const { bunyi } = useSuara()
  const masukanFile = useRef(null)
  const [tahap, setTahap] = useState('pilih') // pilih | pratinjau | hasil
  const [namaFile, setNamaFile] = useState('')
  const [baris, setBaris] = useState([])
  const [pesanFile, setPesanFile] = useState('')
  const [hasil, setHasil] = useState(null)
  const [kirim, setKirim] = useState(false)
  const [galatKirim, setGalatKirim] = useState('')

  const kolomWajib = useMemo(() => kolom.filter((k) => k.wajib), [kolom])
  const barisTakLengkap = useMemo(
    () => baris.filter((b) => kolomWajib.some((k) => !String(b[k.kunci] ?? '').trim())).length,
    [baris, kolomWajib],
  )

  const reset = () => {
    setTahap('pilih'); setNamaFile(''); setBaris([]); setPesanFile('')
    setHasil(null); setGalatKirim(''); setKirim(false)
    if (masukanFile.current) masukanFile.current.value = ''
  }

  const tutup = () => { reset(); onTutup() }

  const unduhTemplate = async () => {
    bunyi('klik')
    const XLSX = await muatXLSX()
    const header = kolom.map((k) => k.label)
    const contoh = kolom.map((k) => k.contoh ?? '')
    const ws = XLSX.utils.aoa_to_sheet([header, contoh])
    ws['!cols'] = header.map((h) => ({ wch: Math.max(12, h.length + 4) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, namaTemplate)
  }

  async function bacaFile(file) {
    if (!file) return
    bunyi('buka')
    setPesanFile('')
    const ekst = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ekst)) {
      setPesanFile('Format tidak didukung. Gunakan .xlsx, .xls, atau .csv.')
      return
    }
    try {
      const XLSX = await muatXLSX()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
      const dipetakan = petakanBaris(json, kolom).filter((b) => Object.values(b).some((v) => String(v).trim()))
      if (!dipetakan.length) {
        setPesanFile('Tidak ada baris data yang dikenali. Pastikan baris pertama adalah header kolom yang sesuai template.')
        return
      }
      if (dipetakan.length > 1000) {
        setPesanFile('Maksimal 1000 baris per impor. Pecah file Anda menjadi beberapa bagian.')
        return
      }
      setNamaFile(file.name)
      setBaris(dipetakan)
      setTahap('pratinjau')
    } catch (e) {
      setPesanFile('Gagal membaca file: ' + (e?.message || 'kesalahan tidak diketahui'))
    }
  }

  async function jalankanImpor() {
    bunyi('peringatan')
    setKirim(true); setGalatKirim('')
    try {
      const h = await onKirim(baris)
      setHasil(h)
      setTahap('hasil')
      bunyi('simpan')
    } catch (e) {
      setGalatKirim(e?.pesan || e?.message || 'Impor gagal.')
      bunyi('gagal')
    } finally {
      setKirim(false)
    }
  }

  const judulTahap = tahap === 'hasil' ? 'Hasil impor' : tahap === 'pratinjau' ? 'Pratinjau data' : judul

  return (
    <Modal
      terbuka={terbuka}
      onTutup={tutup}
      judul={judulTahap}
      keterangan={tahap === 'pilih' ? keterangan : undefined}
      ikon={Ikon}
      warna={warna}
      lebar={lebar}
      kaki={
        tahap === 'pilih' ? (
          <>
            <Tombol varian="halus" ikon={Download} onClick={unduhTemplate}>Unduh template</Tombol>
            <Tombol varian="utama" ikon={UploadCloud} onClick={() => masukanFile.current?.click()}>Pilih file Excel</Tombol>
          </>
        ) : tahap === 'pratinjau' ? (
          <>
            <Tombol varian="halus" ikon={ArrowLeft} onClick={() => { bunyi('klik'); setTahap('pilih'); setBaris([]); setNamaFile('') }}>Ganti file</Tombol>
            <Tombol varian="utama" ikon={CheckCircle2} memuat={kirim} onClick={jalankanImpor}>Impor {baris.length} baris</Tombol>
          </>
        ) : (
          <>
            <Tombol varian="halus" ikon={Trash2} onClick={reset}>Impor file lain</Tombol>
            <Tombol varian="utama" onClick={tutup}>Selesai</Tombol>
          </>
        )
      }
    >
      <input
        ref={masukanFile}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => bacaFile(e.target.files?.[0])}
      />

      {tahap === 'pilih' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => masukanFile.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); bacaFile(e.dataTransfer.files?.[0]) }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ink-950/40 px-4 py-8 text-center transition hover:border-cyan/60 hover:bg-ink-900/50"
          >
            <UploadCloud size={26} className="text-cyan" />
            <span className="text-[0.86rem] font-bold text-chalk">Seret file ke sini atau klik untuk memilih</span>
            <span className="text-[0.72rem] text-mute">Mendukung .xlsx, .xls, dan .csv · maksimal 1000 baris</span>
          </button>

          {pesanFile && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[0.76rem] font-semibold text-rose">
              <XCircle size={14} /> {pesanFile}
            </p>
          )}

          <div className="rounded-xl border border-line-soft bg-ink-950/40 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.62rem] font-bold tracking-[0.18em] text-mute uppercase">
              <Table2 size={12} /> Kolom yang dikenali
            </p>
            <div className="flex flex-wrap gap-1.5">
              {kolom.map((k) => (
                <span key={k.kunci} className="flex items-center gap-1 rounded-lg border border-line-soft bg-ink-950/60 px-2 py-1 text-[0.7rem] font-semibold text-body">
                  {k.label}
                  {k.wajib && <b className="text-rose">*</b>}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-mute">
              Baris pertama file harus berisi nama kolom. Urutan bebas; kolom bertanda <b className="text-rose">*</b> wajib diisi.
              Unduh template untuk contoh format yang pasti cocok.
            </p>
          </div>
        </div>
      )}

      {tahap === 'pratinjau' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pil warna={warna} ikon={FileSpreadsheet}>{namaFile}</Pil>
            <Pil warna="#A3E635">{baris.length} baris</Pil>
            {barisTakLengkap > 0 && <Pil warna="#FFB020" ikon={AlertTriangle}>{barisTakLengkap} baris belum lengkap</Pil>}
          </div>

          {barisTakLengkap > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-[0.74rem] text-amber">
              <AlertTriangle size={14} className="mt-0.5 flex-none" />
              <span>{barisTakLengkap} baris kekurangan kolom wajib. Baris tersebut akan dilewati atau dilaporkan gagal oleh server.</span>
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-line-soft">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-line bg-ink-950/50">
                  <th className="p-2 text-[0.6rem] font-bold tracking-widest text-mute uppercase">#</th>
                  {kolom.map((k) => (
                    <th key={k.kunci} className="p-2 text-[0.6rem] font-bold tracking-widest text-mute uppercase">{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baris.slice(0, 8).map((b, i) => (
                  <tr key={i} className="border-b border-line-soft/60 last:border-0">
                    <td className="p-2 font-mono text-[0.7rem] text-mute">{i + 2}</td>
                    {kolom.map((k) => (
                      <td key={k.kunci} className="max-w-[16rem] truncate p-2 text-[0.76rem] text-body">{b[k.kunci] || <span className="text-mute">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {baris.length > 8 && <p className="text-[0.72rem] text-mute">Menampilkan 8 baris pertama dari {baris.length}. Semua baris akan diproses saat impor.</p>}
          {galatKirim && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-[0.76rem] font-semibold text-rose">
              <XCircle size={14} /> {galatKirim}
            </p>
          )}
        </div>
      )}

      {tahap === 'hasil' && hasil && (
        <div className="space-y-3">
          {ringkasHasil && (
            <div className="grid grid-cols-3 gap-2">
              {ringkasHasil(hasil).map((x) => {
                const Ik = x.ikon
                return (
                  <div key={x.label} className="kartu relative overflow-hidden p-3">
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: x.warna }} />
                    <Ik size={15} style={{ color: x.warna }} />
                    <p className="mt-1.5 font-mono text-[1.3rem] leading-none font-bold text-chalk">{x.nilai}</p>
                    <p className="mt-1 text-[0.62rem] font-semibold tracking-wide text-mute uppercase">{x.label}</p>
                  </div>
                )
              })}
            </div>
          )}
          {renderHasil ? renderHasil(hasil, { reset }) : (
            <p className="rounded-lg border border-line-soft bg-ink-950/40 px-3 py-2 text-[0.8rem] text-body">{hasil.pesan}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
