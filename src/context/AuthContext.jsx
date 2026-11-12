import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ambilToken, simpanToken, hapusToken } from '../lib/api'

const Konteks = createContext(null)

export function AuthProvider({ children }) {
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

  const keluar = useCallback(() => {
    hapusToken()
    setPengguna(null)
  }, [])

  useEffect(() => {
    const handler = () => keluar()
    window.addEventListener('cendekia:sesi-berakhir', handler)
    return () => window.removeEventListener('cendekia:sesi-berakhir', handler)
  }, [keluar])

  const masuk = useCallback(async (identitas, kata_sandi) => {
    const d = await api('/auth/masuk', { method: 'POST', body: { identitas, kata_sandi } })
    simpanToken(d.token)
    setPengguna(d.pengguna)
    return d.pengguna
  }, [])

  const masukDemo = useCallback(async (peran) => {
    const d = await api('/auth/masuk-demo', { method: 'POST', body: { peran } })
    simpanToken(d.token)
    setPengguna(d.pengguna)
    return d.pengguna
  }, [])

  const nilai = useMemo(() => ({ pengguna, memuat, masuk, masukDemo, keluar, setPengguna }), [pengguna, memuat, masuk, masukDemo, keluar])
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

export const useAuth = () => {
  const v = useContext(Konteks)
  if (!v) throw new Error('useAuth harus berada di dalam AuthProvider')
  return v
}