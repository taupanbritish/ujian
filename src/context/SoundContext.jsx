import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { bunyi as mainkan, setSuaraAktif } from '../lib/sound'

const Konteks = createContext(null)
const KUNCI = 'cendekia.suara'

export function SoundProvider({ children }) {
  const [aktif, setAktif] = useState(() => localStorage.getItem(KUNCI) !== 'mati')

  useEffect(() => {
    localStorage.setItem(KUNCI, aktif ? 'nyala' : 'mati')
    setSuaraAktif(aktif)
  }, [aktif])

  const bunyi = useCallback((nama) => mainkan(nama), [])
  const toggle = useCallback(() => setAktif((v) => !v), [])
  const nilai = useMemo(() => ({ aktif, toggle, bunyi }), [aktif, toggle, bunyi])
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

export const useSuara = () => {
  const v = useContext(Konteks)
  if (!v) throw new Error('useSuara harus berada di dalam SoundProvider')
  return v
}