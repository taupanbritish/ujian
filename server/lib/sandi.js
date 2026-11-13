// bcrypt native (Rust) dijalankan di thread pool libuv, bukan di thread JS utama,
// sehingga gelombang login bersamaan tidak memblokir event loop Express.
// Paket membawa biner per platform (linux/darwin/win32, gnu/musl, x64/arm64).
let bcrypt
try {
  bcrypt = await import('@node-rs/bcrypt')
} catch (e) {
  throw new Error(
    '[sandi] @node-rs/bcrypt gagal dimuat. Pastikan biner platform ikut terpasang '
    + '(mis. @node-rs/bcrypt-linux-x64-gnu) dengan menjalankan ulang "npm ci" di server. '
    + `Penyebab: ${e.message}`,
  )
}

// Biaya 10 disamakan dengan seluruh hash yang sudah tersimpan di database. Nilai
// bawaan pustaka ini 12, jadi cost WAJIB disebut eksplisit agar waktu login tidak
// melonjak empat kali lipat dan hash lama tetap konsisten diverifikasi.
export const BIAYA_SANDI = 10

/** Membuat hash bcrypt untuk kata sandi baru. */
export const hashSandi = (sandi) => bcrypt.hash(sandi, { cost: BIAYA_SANDI })

/** Memeriksa kata sandi terhadap hash tersimpan (cost dibaca dari hash itu sendiri). */
export const cocokSandi = (sandi, hashTersimpan) => bcrypt.verify(sandi, hashTersimpan)
