let konteks = null
let aktif = true

const buka = () => {
  if (!aktif) return null
  if (!konteks) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    konteks = new AudioCtx()
  }
  if (konteks.state === 'suspended') konteks.resume().catch(() => {})
  return konteks
}

function nada(ctx, { frekuensi, mulai = 0, durasi = 0.16, tipe = 'sine', volume = 0.16 }) {
  const os = ctx.createOscillator()
  const gain = ctx.createGain()
  os.type = tipe
  os.frequency.setValueAtTime(frekuensi, ctx.currentTime + mulai)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + mulai)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + mulai + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + mulai + durasi)
  os.connect(gain).connect(ctx.destination)
  os.start(ctx.currentTime + mulai)
  os.stop(ctx.currentTime + mulai + durasi + 0.03)
}

const resep = {
  klik: (c) => nada(c, { frekuensi: 660, durasi: 0.06, volume: 0.05, tipe: 'triangle' }),
  pilih: (c) => {
    nada(c, { frekuensi: 523.25, durasi: 0.09, volume: 0.09 })
    nada(c, { frekuensi: 783.99, mulai: 0.05, durasi: 0.12, volume: 0.07 })
  },
  simpan: (c) => nada(c, { frekuensi: 880, durasi: 0.07, volume: 0.045, tipe: 'sine' }),
  buka: (c) => {
    nada(c, { frekuensi: 392, durasi: 0.12, volume: 0.08 })
    nada(c, { frekuensi: 587.33, mulai: 0.08, durasi: 0.16, volume: 0.07 })
  },
  peringatan: (c) => {
    nada(c, { frekuensi: 740, durasi: 0.18, volume: 0.13, tipe: 'triangle' })
    nada(c, { frekuensi: 740, mulai: 0.26, durasi: 0.18, volume: 0.13, tipe: 'triangle' })
  },
  bahaya: (c) => {
    nada(c, { frekuensi: 440, durasi: 0.22, volume: 0.15, tipe: 'sawtooth' })
    nada(c, { frekuensi: 370, mulai: 0.24, durasi: 0.3, volume: 0.13, tipe: 'sawtooth' })
  },
  selesai: (c) => {
    nada(c, { frekuensi: 523.25, durasi: 0.16, volume: 0.12 })
    nada(c, { frekuensi: 659.25, mulai: 0.13, durasi: 0.16, volume: 0.12 })
    nada(c, { frekuensi: 783.99, mulai: 0.26, durasi: 0.18, volume: 0.12 })
    nada(c, { frekuensi: 1046.5, mulai: 0.4, durasi: 0.34, volume: 0.11 })
  },
  gagal: (c) => {
    nada(c, { frekuensi: 320, durasi: 0.16, volume: 0.11, tipe: 'square' })
    nada(c, { frekuensi: 240, mulai: 0.14, durasi: 0.22, volume: 0.09, tipe: 'square' })
  },
}

export const bunyi = (nama) => {
  const ctx = buka()
  if (!ctx || !resep[nama]) return
  try {
    resep[nama](ctx)
  } catch {
    /* audio bukan syarat berjalannya ujian */
  }
}

export const setSuaraAktif = (v) => {
  aktif = v
  if (!v && konteks) konteks.suspend().catch(() => {})
  if (v) buka()
}