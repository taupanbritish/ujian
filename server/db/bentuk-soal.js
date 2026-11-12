// Bentuk soal & pembentuknya. Dipakai bersama oleh bank soal SMP maupun bank per jenjang.
// Setiap soal uraian (es) membawa contoh jawaban siswa (jw) agar bank mandiri per jenjang.
export const pg = (q, o, k, p, lv = 'sedang', topik = '', bobot = 1) => ({ t: 'pg', q, o, k, p, lv, topik, bobot })
export const bs = (q, k, p, lv = 'mudah', topik = '', bobot = 1) => ({ t: 'bs', q, k, p, lv, topik, bobot })
export const is = (q, k, p, lv = 'sedang', topik = '', bobot = 1) => ({ t: 'is', q, k, p, lv, topik, bobot })
export const es = (q, k, p, lv = 'sulit', topik = '', bobot = 3, jw = []) => ({ t: 'es', q, k, p, lv, topik, bobot, jw })

export const tipeDb = { pg: 'pilihan_ganda', bs: 'benar_salah', is: 'isian', es: 'esai' }
export const huruf = ['a', 'b', 'c', 'd', 'e']

export function bentukSoal(item) {
  const tipe = tipeDb[item.t]
  if (tipe === 'pilihan_ganda') {
    return { tipe, opsi: item.o.map((teks, i) => ({ id: huruf[i], teks })), kunci: huruf[item.k] }
  }
  if (tipe === 'benar_salah') {
    return { tipe, opsi: [{ id: 'benar', teks: 'Benar' }, { id: 'salah', teks: 'Salah' }], kunci: item.k ? 'benar' : 'salah' }
  }
  return { tipe, opsi: [], kunci: item.k }
}