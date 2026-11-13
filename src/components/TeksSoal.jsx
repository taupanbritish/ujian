import { memo, useEffect, useMemo, useState } from 'react'
import 'katex/dist/katex.min.css'

// KaTeX (~80 KB gzip) dimuat malas: halaman tanpa rumus tidak membayar biayanya.
// CSS diimpor statis karena ukurannya kecil dan mencegah kedipan tata letak saat
// rumus pertama muncul.
let janjiKatex = null
const muatKatex = () => (janjiKatex ||= import('katex').then((m) => m.default || m))

const PENANDA = '\u0000'
const POLA = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g

/**
 * Pisahkan teks menjadi potongan biasa dan rumus. Delimiter yang didukung:
 *   $...$  inline        $$...$$  blok
 *   \(...\) inline       \[...\]  blok
 * Tanda \$ dipulihkan sebagai dolar biasa agar "harga \$5" tidak dianggap rumus.
 */
export function pecahRumus(teks) {
  const asli = String(teks ?? '')
  if (!asli.includes('$') && !asli.includes('\\(') && !asli.includes('\\[')) {
    return [{ jenis: 'teks', isi: asli }]
  }
  const lindungi = asli.replace(/\\\$/g, PENANDA)
  const bagian = []
  let akhir = 0
  let m
  POLA.lastIndex = 0
  while ((m = POLA.exec(lindungi))) {
    if (m.index > akhir) bagian.push({ jenis: 'teks', isi: lindungi.slice(akhir, m.index) })
    const potong = m[0]
    let isi
    let blok = false
    if (potong.startsWith('$$')) { isi = potong.slice(2, -2); blok = true }
    else if (potong.startsWith('\\[')) { isi = potong.slice(2, -2); blok = true }
    else if (potong.startsWith('\\(')) { isi = potong.slice(2, -2) }
    else { isi = potong.slice(1, -1) }
    bagian.push({ jenis: 'rumus', isi: isi.trim(), blok })
    akhir = m.index + potong.length
  }
  if (akhir < lindungi.length) bagian.push({ jenis: 'teks', isi: lindungi.slice(akhir) })
  return bagian.map((b) => (b.jenis === 'teks' ? { ...b, isi: b.isi.split(PENANDA).join('$') } : b))
}

function Rumus({ isi, blok, katex }) {
  const html = useMemo(() => {
    if (!katex || !isi) return null
    try {
      return katex.renderToString(isi, {
        displayMode: blok,
        throwOnError: false,
        trust: false, // mematikan \href, \includegraphics, \htmlClass, dsb.
        strict: 'ignore',
        output: 'html',
        errorColor: '#FF4D6D',
      })
    } catch {
      return null
    }
  }, [isi, blok, katex])

  if (!html) {
    // Selagi KaTeX dimuat (atau bila sintaks gagal total), tampilkan sumbernya
    // agar butir soal tidak pernah kosong.
    return (
      <span className="rumus-mentah" title="Rumus sedang dimuat">
        {blok ? `$$${isi}$$` : `$${isi}$`}
      </span>
    )
  }
  return (
    <span
      className={blok ? 'rumus-blok' : 'rumus-inline'}
      // Aman: KaTeX menghasilkan HTML sendiri dari input yang di-escape, dan
      // trust:false melarang perintah yang dapat menyisipkan tautan/gambar.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Render teks soal dengan dukungan rumus LaTeX. Bungkus dengan elemen yang
 * mengatur whitespace (mis. whitespace-pre-wrap) seperti sebelumnya.
 */
const TeksSoal = memo(function TeksSoal({ teks, className = '' }) {
  const bagian = useMemo(() => pecahRumus(teks), [teks])
  const adaRumus = bagian.some((b) => b.jenis === 'rumus')
  const [katex, setKatex] = useState(null)

  useEffect(() => {
    if (!adaRumus || katex) return
    let hidup = true
    muatKatex()
      .then((k) => { if (hidup) setKatex(k) })
      .catch(() => {})
    return () => { hidup = false }
  }, [adaRumus, katex])

  if (!adaRumus) return <span className={className}>{String(teks ?? '')}</span>

  return (
    <span className={className}>
      {bagian.map((b, i) => (
        b.jenis === 'teks'
          ? <span key={i}>{b.isi}</span>
          : <Rumus key={i} isi={b.isi} blok={b.blok} katex={katex} />
      ))}
    </span>
  )
})

export default TeksSoal
