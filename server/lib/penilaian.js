export const normalisasi = (v) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’'`.,;:!?()\[\]{}"“”\-–—_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function cocokIsian(kunci, isi) {
  const target = normalisasi(isi)
  if (!target) return false
  return String(kunci ?? '')
    .split('|')
    .map(normalisasi)
    .filter(Boolean)
    .some((k) => k === target)
}

export function kosong(isi) {
  return isi === null || isi === undefined || String(isi).trim() === ''
}

export function skorOtomatis(soal, isi) {
  if (soal.tipe === 'esai') return null
  if (kosong(isi)) return 0
  if (soal.tipe === 'isian') return cocokIsian(soal.kunci, isi) ? 1 : 0
  return normalisasi(isi) === normalisasi(soal.kunci) ? 1 : 0
}

export function rekapNilai(daftar) {
  let totalBobot = 0
  let perolehan = 0
  let benar = 0
  let salah = 0
  let kosongCount = 0
  let perlu = false
  for (const row of daftar) {
    const bobot = Number(row.bobot || 1)
    totalBobot += bobot
    const tanpaJawaban = kosong(row.isi)
    if (tanpaJawaban) kosongCount += 1
    if (row.skor === null || row.skor === undefined) {
      if (row.tipe === 'esai' && !tanpaJawaban) perlu = true
      continue
    }
    const skor = Number(row.skor)
    perolehan += bobot * skor
    if (skor >= 0.999) benar += 1
    else if (!tanpaJawaban) salah += 1
  }
  const nilai = totalBobot > 0 ? Math.round((perolehan / totalBobot) * 1000) / 10 : 0
  return { nilai, benar, salah, kosong: kosongCount, perlu_penilaian: perlu }
}