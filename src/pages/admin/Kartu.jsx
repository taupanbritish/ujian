import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IdCard, Printer, Users, Camera, ImageOff, KeyRound, AlertTriangle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  Tombol, Pil, Kosong, Galat, Rangka, JudulBagian,
} from '../../components/ui'
import KartuUjian from '../../components/KartuUjian'

const PRATINJAU_MAKS = 6

function KartuRingkas({ label, nilai, ikon: Ikon, warna, petunjuk }) {
  return (
    <div className="kartu relative overflow-hidden p-3.5">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: warna }} />
      <Ikon size={15} style={{ color: warna }} />
      <p className="mt-2 font-mono text-[1.4rem] leading-none font-bold text-chalk">{nilai}</p>
      <p className="mt-1.5 text-[0.66rem] font-semibold tracking-wide text-mute uppercase">{label}</p>
      {petunjuk && <p className="mt-1 text-[0.64rem] text-mute">{petunjuk}</p>}
    </div>
  )
}

export default function Kartu() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const kelas = params.get('kelas') || ''

  const ubah = (nilai) => {
    const p = new URLSearchParams(params)
    if (!nilai) p.delete('kelas')
    else p.set('kelas', nilai)
    setParams(p, { replace: true })
  }

  // Daftar kelas yang benar-benar memiliki peserta aktif, lengkap dengan jumlahnya.
  const { data: daftarKelas, isPending: memuatKelas } = useQuery({
    queryKey: ['kelas-peserta'],
    queryFn: () => api('/pengguna/kelas/daftar?aktif=1'),
    staleTime: 60000,
  })

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (kelas) p.set('kelas', kelas)
    return p.toString()
  }, [kelas])

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ['kartu', queryString],
    queryFn: () => api(`/kartu?${queryString}`),
    enabled: !!kelas,
    placeholderData: (d) => d,
  })

  const peserta = data?.peserta || []
  const berfoto = peserta.filter((p) => p.foto_url).length
  const tanpaFoto = peserta.length - berfoto
  const tanpaSandi = peserta.filter((p) => !p.sandi).length
  const pratinjau = peserta.slice(0, PRATINJAU_MAKS)

  const cetak = () => {
    if (!kelas) {
      toast.ingat('Pilih kelas lebih dulu', { pesan: 'Kartu dibuat per kelas peserta, bukan per ujian.' })
      return
    }
    if (!peserta.length) {
      toast.ingat('Belum ada peserta untuk dicetak', { pesan: 'Kelas ini belum memiliki akun peserta aktif.' })
      return
    }
    navigate(`/admin/kartu/cetak?${queryString}`)
  }

  return (
    <div className="space-y-5">
      <JudulBagian
        eyebrow="Administrasi ujian"
        judul="Cetak kartu ujian"
        pesan="Pilih satu kelas, lalu cetak kartu berisi identitas sekolah, foto, nama, kelas, username, dan password akun peserta."
        kanan={
          <Tombol varian="utama" ikon={Printer} onClick={cetak} disabled={!kelas || !peserta.length}>
            Cetak kartu
          </Tombol>
        }
      />

      <section className="kartu p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <label>
            <span className="label-field">Kelas</span>
            <select
              value={kelas}
              onChange={(e) => ubah(e.target.value)}
              className="kolom-field py-2.5 text-[0.84rem]"
              aria-label="Pilih kelas"
            >
              <option value="">{memuatKelas ? 'Memuat kelas…' : 'Pilih kelas…'}</option>
              {(daftarKelas?.data || []).map((k) => (
                <option key={k.kelas} value={k.kelas}>{k.kelas} · {k.jumlah} peserta</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-1 pb-1">
            <p className="text-[0.72rem] text-mute">
              {kelas
                ? `Kartu untuk seluruh peserta aktif di kelas ${kelas}. Tidak terikat pada mata pelajaran atau ujian tertentu.`
                : 'Kartu tidak lagi bergantung pada pilihan ujian—cukup pilih kelas.'}
            </p>
            {tanpaSandi > 0 && (
              <p className="flex items-start gap-1.5 text-[0.7rem] text-amber">
                <AlertTriangle size={12} className="mt-0.5 flex-none" />
                {tanpaSandi} peserta belum memiliki password tersimpan (akun lama). Atur ulang kata sandi di menu Peserta & Akun agar kartu lengkap.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-amber/35 bg-amber/8 px-3.5 py-2.5 text-[0.72rem] text-body">
        <KeyRound size={14} className="mt-0.5 flex-none text-amber" />
        <p>
          Kartu memuat password akun dalam bentuk terbaca. Cetak dan bagikan hanya kepada peserta yang bersangkutan,
          lalu minta mereka mengganti kata sandi setelah masuk pertama kali.
        </p>
      </div>

      {!kelas ? (
        <div className="kartu p-4">
          <Kosong
            ikon={IdCard}
            judul="Pilih kelas untuk melihat kartu"
            pesan="Setelah kelas dipilih, seluruh peserta aktif pada kelas tersebut langsung ditampilkan beserta username dan password-nya."
            className="py-10"
          />
        </div>
      ) : isPending ? (
        <div className="kartu p-4"><Rangka baris={6} /></div>
      ) : error ? (
        <div className="kartu p-4"><Galat pesan={error.message} onUlang={refetch} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KartuRingkas label="Peserta" nilai={peserta.length} ikon={Users} warna="#7C5CFF" />
            <KartuRingkas label="Sudah berfoto" nilai={berfoto} ikon={Camera} warna="#A3E635" />
            <KartuRingkas
              label="Tanpa foto"
              nilai={tanpaFoto}
              ikon={ImageOff}
              warna="#FFB020"
              petunjuk={tanpaFoto ? 'Kartu memakai kotak inisial' : 'Semua kartu lengkap'}
            />
          </div>

          <section className="kartu p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-[1rem]">Kartu ujian kelas {kelas}</h3>
                <p className="mt-1 text-[0.72rem] text-mute">
                  Nama peserta, kelas, username (NIS), dan password akun dicetak di setiap kartu.
                </p>
              </div>
              <span className="flex items-center gap-2">
                {isFetching && <Pil warna="#22D3EE">memperbarui…</Pil>}
                <Pil warna="#7C5CFF">{peserta.length} kartu</Pil>
              </span>
            </div>

            {!peserta.length ? (
              <Kosong
                ikon={Users}
                judul="Belum ada peserta aktif di kelas ini"
                pesan="Tambahkan akun peserta pada menu Peserta & Akun, atau pilih kelas lain."
                className="py-10"
              />
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {pratinjau.map((p) => (
                    <div key={p.id} className="rounded-xl bg-white p-1 shadow-lift">
                      <KartuUjian peserta={p} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
                  <p className="text-[0.72rem] text-mute">
                    Pratinjau {pratinjau.length} dari {peserta.length} kartu. Dokumen cetak memuat seluruh peserta dalam tata letak A4.
                  </p>
                  <Tombol ukuran="sm" varian="kedua" ikon={Printer} onClick={cetak}>Buka halaman cetak</Tombol>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
