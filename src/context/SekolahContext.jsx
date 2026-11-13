import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// Identitas sekolah satu sumber di sisi klien. Nilai bawaan dipakai sementara
// selama /api/pengaturan dimuat agar antarmuka tidak pernah kosong.
const BAWAAN = {
  nama_sekolah: 'SMP ShanaTech',
  jenjang: 'SMP',
  label_jenjang: 'Sekolah Menengah Pertama',
  tahun_ajaran: '2026/2027',
  nama_aplikasi: 'ShanaTech CBT',
  kelas: [],
}

const Konteks = createContext(null)

export function SekolahProvider({ children }) {
  const queryClient = useQueryClient()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: () => api('/pengaturan'),
    staleTime: 60000,
    retry: 1,
  })

  const segarkan = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
    await queryClient.invalidateQueries({ queryKey: ['info-masuk'] })
    return refetch()
  }, [queryClient, refetch])

  // Judul tab peramban mengikuti identitas sekolah yang aktif.
  useEffect(() => {
    if (!data) return
    document.title = `${data.nama_aplikasi} — ${data.nama_sekolah}`
  }, [data])

  // Terapkan hasil mutasi langsung ke cache supaya seluruh antarmuka ikut berubah.
  const terapkan = useCallback((hasil) => {
    queryClient.setQueryData(['pengaturan'], hasil)
    queryClient.invalidateQueries({ queryKey: ['info-masuk'] })
  }, [queryClient])

  const nilai = useMemo(() => {
    const sekolah = { ...BAWAAN, ...(data || {}) }
    return { ...sekolah, memuat: isPending, galat: isError, segarkan, terapkan }
  }, [data, isPending, isError, segarkan, terapkan])

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>
}

export const useSekolah = () => {
  const v = useContext(Konteks)
  if (!v) throw new Error('useSekolah harus berada di dalam SekolahProvider')
  return v
}