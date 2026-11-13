import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ambilToken, simpanToken, hapusToken } from '../lib/api'

const Konteks = createContext(null)

export function AuthProvider({ children }) {
  const qc = useQueryClient()
  const [pengguna, setPengguna] = useState(null)
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    if (!ambilToken()) {
      setMemuat(false)
      return
    }
    api('/auth/saya')
      .then((d) => setPengguna(d.pengguna))
      .catch(() => hapusToken())
      .finally(() => setMemuat(false))
  }, [])

  // Cache React Query tidak boleh dibawa lintas akun: meta mapel untuk guru
  // dan admin berbeda, dan data hasil bersifat sensitif. Bersihkan saat
  // pergantian sesi agar daftar mapel selalu mengikuti akun yang aktif.
  const keluar = useCallback(() => {
    hapusToken()
    qc.clear()
    setPengguna(null)
  }, [qc])

  useEffect(() => {
    const handler = () => keluar()
    window.addEventListener('shanatech:sesi-berakhir', handler)
    return () => window.removeEventListener('shanatech:sesi-berakhir', handler)
  }, [keluar])

  const mulaiSesi = useCallback((d) => {
    simpanToken(d.token)
    qc.clear()
    setPengguna(d.pengguna)
    return d.pengguna
  }, [qc])

  const masuk = useCallback(async (identitas, kata_sandi) => {
    const d = await api('/auth/masuk', { method: 'POST', body: { identitas, kata_sandi } })
    return mulaiSesi(d)
  }, [mulaiSesi])

  const masukDemo = useCallback(async (peran) => {
    const d = await api('/auth/masuk-demo', { method: 'POST', body: { peran } })
    return mulaiSesi(d)
  }, [mulaiSesi])

  const nilai = useMemo(() => ({ pengguna, memuat, masuk, masukDemo, keluar, setPengguna }), [pengguna, memuat, masuk, masukDemo, keluar])
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

export const useAuth = () => {
  const v = useContext(Konteks)
  if (!v) throw new Error('useAuth harus berada di dalam AuthProvider')
  return v
}