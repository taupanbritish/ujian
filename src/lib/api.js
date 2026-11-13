const KUNCI = 'shanatech.token'

export const ambilToken = () => localStorage.getItem(KUNCI)
export const simpanToken = (t) => localStorage.setItem(KUNCI, t)
export const hapusToken = () => localStorage.removeItem(KUNCI)

export class ApiError extends Error {
  constructor(status, pesan, rincian) {
    super(pesan)
    this.status = status
    this.rincian = rincian
  }
}

export async function api(path, { method = 'GET', body, sinyal } = {}) {
  const token = ambilToken()
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal: sinyal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.')
  }
  const teks = await res.text()
  let data = null
  try {
    data = teks ? JSON.parse(teks) : null
  } catch {
    data = { pesan: teks.slice(0, 200) }
  }
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/masuk') {
      window.dispatchEvent(new CustomEvent('shanatech:sesi-berakhir'))
    }
    throw new ApiError(res.status, data?.pesan || `Permintaan gagal (${res.status}).`, data?.rincian)
  }
  return data
}

/**
 * Unggahan multipart (berkas media). Tidak memakai header Content-Type agar
 * peramban menuliskan boundary multipart sendiri.
 */
export async function apiUnggah(path, formData, { sinyal } = {}) {
  const token = ambilToken()
  let res
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      signal: sinyal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError(0, 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.')
  }
  const teks = await res.text()
  let data = null
  try {
    data = teks ? JSON.parse(teks) : null
  } catch {
    data = { pesan: teks.slice(0, 200) }
  }
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('shanatech:sesi-berakhir'))
    throw new ApiError(res.status, data?.pesan || `Unggahan gagal (${res.status}).`, data?.rincian)
  }
  return data
}

export async function unduhBerkas(path, namaBerkas) {  const token = ambilToken()
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.pesan || 'Berkas gagal diunduh.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaBerkas
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const pesanGalat = (e) => e?.pesan || e?.message || 'Terjadi kesalahan tak terduga.'