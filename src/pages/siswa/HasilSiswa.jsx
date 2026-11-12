import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Target, CheckCircle2, XCircle, CircleSlash, Clock, ChevronLeft, ChevronRight, BookOpen,
  PenLine, Sparkles, Users, Award, Lock, Copy, Check, Filter, Eye, GraduationCap, TrendingUp,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSekolah } from '../../context/SekolahContext'
import { useToast } from '../../context/ToastContext'
import { useSuara } from '../../context/SoundContext'
import {
  Tombol, Pil, Cincin, BilahProgres, Kosong, Galat, Rangka, Segmen, Avatar,
} from '../../components/ui'
import { TIPE, nilaiTeks, warnaNilai, tanggal, jamSaja, durasiPendek, jawabanTeks, namaPanggilan } from '../../lib/format'

function statusJawaban(d) {
  if (!(d.isi || '').trim()) return { kunci: 'kosong', label: 'Kosong', warna: '#8A93B8', ikon: CircleSlash }
  if (d.skor === null) return { kunci: 'menunggu', label: 'Menunggu poin', warna: '#FFB020', ikon: PenLine }
  if (d.skor >= 1) return { kunci: 'benar', label: 'Benar', warna: '#A3E635', ikon: CheckCircle2 }
  if (d.skor <= 0) return { kunci: 'salah', label: 'Salah', warna: '#FF4D6D', ikon: XCircle }
  return { kunci: 'sebagian', label: `${Math.round(d.skor * 100)}% poin`, warna: '#22D3EE', ikon: Sparkles }
}

export default function HasilSiswa() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pengguna } = useAuth()
  const sekolah = useSekolah()
  const toast = useToast()
  const { bunyi } = useSuara()
  const [saringan, setSaringan] = useState('semua')
  const [tersalin, setTersalin] = useState(false)

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['hasil-siswa', id],
    queryFn: () => api(`/siswa/percobaan/${id}/hasil`),
    retry: false,
  })

  const detail = data?.detail || []
  const tampil = useMemo(() => detail.filter((d) => {
    const st = statusJawaban(d).kunci
    if (saringan === 'benar') return st === 'benar' || st === 'sebagian'
    if (saringan === 'salah') return st === 'salah'
    if (saringan === 'kosong') return st === 'kosong'
    if (saringan === 'uraian') return d.tipe === 'esai'
    return true
  }), [detail, saringan])

  if (isPending) return <Rangka baris={7} />
  if (error) {
    return (
      <div className="space-y-4">
        <Galat pesan={error.status === 409 ? 'Ujian ini belum selesai dikerjakan. Lanjutkan sesi terlebih dahulu.' : error.message} onUlang={error.status === 409 ? undefined : refetch} />
        <Link to={error.status === 409 ? `/siswa/ujian/${id}` : '/siswa/riwayat'}>
          <Tombol varian="utama" ikon={ChevronLeft}>{error.status === 409 ? 'Lanjutkan sesi ujian' : 'Kembali ke riwayat'}</Tombol>
        </Link>
      </div>
    )
  }

  const p = data.percobaan
  const u = data.ujian
  const rekan = data.rekan
  const tuntas = !p.perlu_penilaian && p.nilai >= u.kkm
  const warna = p.perlu_penilaian ? '#FFB020' : warnaNilai(p.nilai, u.kkm)
  const uraianMenunggu = detail.filter((d) => d.tipe === 'esai' && d.skor === null && (d.isi || '').trim()).length
  const jumlahBenar = detail.filter((d) => statusJawaban(d).kunci === 'benar').length
  const jumlahSalah = detail.filter((d) => statusJawaban(d).kunci === 'salah').length
  const jumlahKosong = detail.filter((d) => statusJawaban(d).kunci === 'kosong').length
  const jumlahUraian = detail.filter((d) => d.tipe === 'esai').length

  const salinRingkasan = async () => {
    const teks = [
      `HASIL UJIAN — ${u.judul}`,
      `${sekolah.nama_sekolah} · Tahun ajaran ${sekolah.tahun_ajaran}`,
      `Nama: ${pengguna.nama} (${pengguna.nis}) · Kelas ${pengguna.kelas}`,
      `Mata pelajaran: ${u.mapel_nama}`,
      `Nilai: ${nilaiTeks(p.nilai)} · KKM ${u.kkm} · ${p.perlu_penilaian ? 'Menunggu penilaian uraian' : tuntas ? 'Tuntas' : 'Belum tuntas'}`,
      `Benar ${p.benar} · Salah ${p.salah} · Kosong ${p.kosong} dari ${detail.length} butir`,
      `Waktu pengerjaan: ${durasiPendek(p.durasi_detik)}`,
      `Selesai: ${tanggal(p.selesai_pada, { jam: true })}`,
      rekan?.jumlah ? `Peringkat ${rekan.peringkat} dari ${rekan.jumlah} peserta · rata-rata kelas ${nilaiTeks(rekan.rata)}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(teks)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = teks
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    bunyi('simpan')
    setTersalin(true)
    setTimeout(() => setTersalin(false), 1800)
    toast.sukses('Ringkasan nilai disalin', { pesan: 'Tempelkan ke catatan atau kirimkan kepada orang tua.' })
  }

  return (
    <div className="space-y-5">
      <button onClick={() => { bunyi('klik'); navigate('/siswa/riwayat') }} className="inline-flex items-center gap-1.5 text-[0.78rem] font-bold text-mute transition hover:gap-2.5 hover:text-cyan">
        <ChevronLeft size={14} /> Kembali ke riwayat nilai
      </button>

      <section className="kartu relative overflow-hidden p-5 sm:p-7">
        <div className="aurora opacity-[0.2]" />
        <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${warna}, #22D3EE)` }} />
        {tuntas && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className="anim-apung absolute block rounded-full"
                style={{
                  left: `${6 + i * 6.7}%`,
                  top: `${12 + ((i * 37) % 70)}%`,
                  width: 5 + (i % 3) * 3,
                  height: 5 + (i % 3) * 3,
                  background: ['#A3E635', '#22D3EE', '#FFB020', '#7C5CFF', '#F472B6'][i % 5],
                  opacity: 0.5,
                  animationDelay: `${i * 0.32}s`,
                  animationDuration: `${5 + (i % 4)}s`,
                }}
              />
            ))}
          </span>
        )}

        <div className="relative flex flex-wrap items-center gap-6">
          <div className="relative">
            <Cincin nilai={p.nilai} ukuran={168} tebal={13} warna={warna} trek="rgba(38,49,94,0.75)">
              <span className="text-center">
                <span className="block font-mono text-[2.9rem] leading-none font-bold text-chalk">{nilaiTeks(p.nilai)}</span>
                <span className="mt-2 block text-[0.62rem] font-bold tracking-[0.2em] text-mute uppercase">KKM {u.kkm}</span>
              </span>
            </Cincin>
            {tuntas && (
              <span className="absolute -right-1 -bottom-1 grid size-12 place-items-center rounded-2xl border border-lime/50 bg-ink-900 text-lime shadow-lift">
                <Trophy size={22} />
              </span>
            )}
          </div>

          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Pil warna={u.mapel_warna} ikon={GraduationCap}>{u.mapel_nama}</Pil>
              {p.perlu_penilaian
                ? <Pil warna="#FFB020" ikon={PenLine}>Nilai sementara</Pil>
                : tuntas ? <Pil warna="#A3E635" ikon={CheckCircle2}>Tuntas KKM</Pil> : <Pil warna="#FF4D6D" ikon={XCircle}>Belum tuntas</Pil>}
              {p.fokus_hilang > 0 && <Pil warna="#FF7A45" ikon={Eye}>{p.fokus_hilang}× pindah tab</Pil>}
            </div>
            <h2 className="mt-3 font-display text-[1.8rem] leading-tight font-normal text-chalk sm:text-[2.3rem]">{u.judul}</h2>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-mute">
              {p.perlu_penilaian
                ? `Jawaban pilihan ganda dan isian sudah dinilai. ${uraianMenunggu} soal uraian masih menunggu poin dari guru, sehingga nilai akhir dapat berubah.`
                : tuntas
                  ? `Kerja bagus, ${namaPanggilan(pengguna.nama)}. Capaianmu berada ${p.nilai >= (rekan?.rata ?? 0) ? 'di atas' : 'di bawah'} rata-rata peserta lain pada ujian ini.`
                  : `Nilai ini masih di bawah KKM ${u.kkm}. Pelajari pembahasan tiap butir di bawah untuk mengetahui bagian yang perlu diperbaiki.`}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.76rem] text-mute">
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber" /> {durasiPendek(p.durasi_detik)} dari {u.durasi_menit} menit</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-lime" /> Selesai {tanggal(p.selesai_pada, { jam: true })}</span>
              <span className="font-mono">mulai {jamSaja(p.mulai_pada)} → {jamSaja(p.selesai_pada)}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tombol varian="kedua" ikon={tersalin ? Check : Copy} onClick={salinRingkasan}>{tersalin ? 'Tersalin' : 'Salin ringkasan nilai'}</Tombol>
              <Link to="/siswa"><Tombol varian="utama" ikon={ChevronRight}>Lihat ujian lain</Tombol></Link>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { l: 'Jawaban benar', n: p.benar, w: '#A3E635', ikon: CheckCircle2 },
            { l: 'Jawaban salah', n: p.salah, w: '#FF4D6D', ikon: XCircle },
            { l: 'Tidak dijawab', n: p.kosong, w: '#8A93B8', ikon: CircleSlash },
            { l: 'Total butir', n: detail.length, w: '#7C5CFF', ikon: BookOpen },
            { l: 'Peringkat', n: rekan?.jumlah ? `${rekan.peringkat}/${rekan.jumlah}` : '—', w: '#22D3EE', ikon: Award },
            { l: 'Rata-rata peserta', n: nilaiTeks(rekan?.rata), w: '#F472B6', ikon: Users },
          ].map((x) => {
            const Ikon = x.ikon
            return (
              <div key={x.l} className="rounded-xl border border-line-soft bg-ink-950/45 p-3">
                <Ikon size={14} style={{ color: x.w }} />
                <p className="mt-2 font-mono text-[1.3rem] leading-none font-bold text-chalk">{x.n}</p>
                <p className="mt-1.5 text-[0.64rem] font-semibold tracking-wide text-mute uppercase">{x.l}</p>
              </div>
            )
          })}
        </div>
      </section>

      {rekan?.jumlah > 1 && (
        <section className="kartu p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[1rem]"><TrendingUp size={16} className="text-cyan" /> Posisi di antara peserta</h3>
            <span className="text-[0.74rem] text-mute">{rekan.jumlah} lembar selesai pada ujian ini</span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { l: 'Nilai kamu', n: p.nilai, w: warna, avatar: true },
              { l: 'Rata-rata peserta', n: rekan.rata, w: '#22D3EE' },
              { l: 'Nilai tertinggi', n: rekan.tertinggi, w: '#A3E635' },
              { l: `Batas KKM`, n: u.kkm, w: '#FFB020' },
            ].map((x) => (
              <div key={x.l} className="flex items-center gap-3">
                <span className="flex w-[150px] flex-none items-center gap-2 text-[0.78rem] font-semibold text-body">
                  {x.avatar && <Avatar nama={pengguna.nama} gender={pengguna.gender} ukuran={22} />}
                  <span className="truncate">{x.l}</span>
                </span>
                <BilahProgres nilai={x.n ?? 0} warna={x.w} tinggi={9} className="flex-1" />
                <span className="w-12 flex-none text-right font-mono text-[0.86rem] font-bold" style={{ color: x.w }}>{nilaiTeks(x.n)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!data.pembahasan_terbuka && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky/35 bg-[linear-gradient(115deg,rgba(56,189,248,0.12),rgba(11,16,36,0.6))] p-4">
          <span className="grid size-10 flex-none place-items-center rounded-xl bg-sky/18 text-sky"><Lock size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9rem] font-bold text-chalk">Kunci jawaban dan pembahasan belum dibuka</p>
            <p className="mt-0.5 text-[0.78rem] leading-relaxed text-mute">
              {p.perlu_penilaian
                ? 'Pembahasan terbuka otomatis setelah seluruh soal uraian selesai dinilai guru.'
                : u.tampil_pembahasan
                  ? 'Pembahasan akan tersedia setelah penilaian guru dituntaskan.'
                  : 'Guru memilih untuk tidak menampilkan kunci dan pembahasan pada ujian ini. Rincian jawabanmu tetap dapat dilihat.'}
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmen
          nilai={saringan}
          onChange={setSaringan}
          pilihan={[
            { nilai: 'semua', label: 'Semua', jumlah: detail.length },
            { nilai: 'benar', label: 'Benar', jumlah: jumlahBenar + detail.filter((d) => statusJawaban(d).kunci === 'sebagian').length },
            { nilai: 'salah', label: 'Salah', jumlah: jumlahSalah },
            { nilai: 'kosong', label: 'Kosong', jumlah: jumlahKosong },
            { nilai: 'uraian', label: 'Uraian', jumlah: jumlahUraian },
          ]}
        />
        <span className="text-[0.74rem] text-mute">{tampil.length} butir tampil · urutan sesuai lembar ujianmu</span>
      </div>

      {tampil.length === 0 ? (
        <Kosong ikon={Filter} judul="Tidak ada butir pada saringan ini" pesan="Pilih saringan lain untuk meninjau jawabanmu." className="py-10" />
      ) : (
        <ol className="space-y-3">
          {tampil.map((d) => {
            const st = statusJawaban(d)
            const Ikon = st.ikon
            const jawaban = jawabanTeks(d, d.isi)
            return (
              <li key={d.soal_id} className="kartu relative overflow-hidden p-4">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: st.warna }} />
                <div className="flex flex-wrap items-start gap-2">
                  <span className="grid size-8 flex-none place-items-center rounded-lg font-mono text-[0.82rem] font-bold" style={{ background: `color-mix(in oklab, ${st.warna} 18%, transparent)`, color: st.warna }}>
                    {d.nomor}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    <Pil warna={TIPE[d.tipe].warna}>{TIPE[d.tipe].label}</Pil>
                    {d.ragu && <Pil warna="#FFB020" ikon={Eye}>Ragu-ragu</Pil>}
                    <span className="font-mono text-[0.68rem] text-mute">bobot {Number(d.bobot)}</span>
                  </div>
                  <Pil warna={st.warna} ikon={Ikon}>{st.label}</Pil>
                </div>

                <p className="mt-3 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-chalk">{d.pertanyaan}</p>

                {d.opsi?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {d.opsi.map((o, i) => {
                      const dipilih = d.isi === o.id
                      const benar = data.pembahasan_terbuka && d.kunci === o.id
                      return (
                        <li
                          key={o.id}
                          className="flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[0.85rem] leading-snug"
                          style={{
                            borderColor: benar ? 'rgba(163,230,53,0.45)' : dipilih ? (d.skor >= 1 ? 'rgba(163,230,53,0.45)' : 'rgba(255,77,109,0.45)') : '#1c2549',
                            background: benar ? 'rgba(163,230,53,0.09)' : dipilih ? (d.skor >= 1 ? 'rgba(163,230,53,0.09)' : 'rgba(255,77,109,0.09)') : 'rgba(5,7,15,0.4)',
                            color: benar || (dipilih && d.skor >= 1) ? '#dcf7ac' : dipilih ? '#ffc2cd' : '#8a93b8',
                          }}
                        >
                          <span className="mt-px grid size-5 flex-none place-items-center rounded-full border border-current/40 font-mono text-[0.62rem] font-bold">
                            {d.tipe === 'benar_salah' ? (o.id === 'benar' ? 'B' : 'S') : String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1">{o.teks}</span>
                          {dipilih && <span className="flex-none rounded-md bg-current/15 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase">jawabanmu</span>}
                          {benar && <CheckCircle2 size={14} className="mt-px flex-none text-lime" />}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {!d.opsi?.length && (
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    <div className="rounded-xl border border-line-soft bg-ink-950/50 p-3">
                      <p className="text-[0.62rem] font-bold tracking-widest text-mute uppercase">Jawabanmu</p>
                      <p className={`mt-1.5 text-[0.86rem] leading-relaxed whitespace-pre-wrap ${jawaban ? 'text-chalk' : 'text-mute italic'}`}>{jawaban || 'Tidak dijawab'}</p>
                    </div>
                    {d.tipe === 'esai' ? (
                      <div className="rounded-xl border border-pink/30 bg-pink/8 p-3">
                        <p className="flex items-center gap-1.5 text-[0.62rem] font-bold tracking-widest text-pink uppercase"><PenLine size={10} /> Penilaian guru</p>
                        {d.skor === null ? (
                          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-mute">Belum dinilai. Poin akan muncul setelah guru memeriksa uraianmu.</p>
                        ) : (
                          <>
                            <p className="mt-1.5 font-mono text-[1.1rem] font-bold text-pink">{Math.round(d.skor * 100)}<span className="text-[0.72rem] text-mute">/100 poin</span></p>
                            {d.catatan && <p className="mt-1.5 text-[0.82rem] leading-relaxed whitespace-pre-wrap text-body">{d.catatan}</p>}
                          </>
                        )}
                      </div>
                    ) : data.pembahasan_terbuka && (
                      <div className="rounded-xl border border-lime/30 bg-lime/8 p-3">
                        <p className="text-[0.62rem] font-bold tracking-widest text-lime uppercase">Kunci jawaban</p>
                        <p className="mt-1.5 text-[0.86rem] leading-relaxed whitespace-pre-wrap text-chalk">{d.kunci || '—'}</p>
                      </div>
                    )}
                  </div>
                )}

                {d.tipe === 'esai' && d.opsi?.length > 0 && d.catatan && (
                  <p className="mt-2.5 rounded-lg border border-pink/30 bg-pink/8 p-2.5 text-[0.8rem] leading-relaxed text-body">{d.catatan}</p>
                )}

                {data.pembahasan_terbuka && d.pembahasan && (
                  <details className="group mt-3 rounded-xl border border-cyan/30 bg-cyan/6 p-3" open={st.kunci === 'salah' || st.kunci === 'kosong'}>
                    <summary className="flex cursor-pointer items-center gap-2 text-[0.8rem] font-bold text-cyan">
                      <BookOpen size={14} /> Pembahasan
                      <ChevronRight size={13} className="ml-auto transition group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-[0.84rem] leading-relaxed whitespace-pre-wrap text-body">{d.pembahasan}</p>
                    {d.tipe !== 'esai' && d.kunci && (
                      <p className="mt-2 border-t border-cyan/20 pt-2 text-[0.78rem] text-mute">
                        Kunci: <span className="font-mono font-bold text-lime">{d.tipe === 'pilihan_ganda' || d.tipe === 'benar_salah' ? (d.opsi.find((o) => o.id === d.kunci)?.teks || d.kunci) : d.kunci}</span>
                      </p>
                    )}
                  </details>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <section className="kartu flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><Target size={17} className="text-lime" /> Langkah berikutnya</h3>
          <p className="mt-1 max-w-xl text-[0.82rem] leading-relaxed text-mute">
            {tuntas
              ? 'Pertahankan capaian ini. Tinjau pembahasan butir yang salah agar pemahamanmu semakin utuh, lalu lanjut ke ujian berikutnya.'
              : p.perlu_penilaian
                ? 'Nilai akhir menyusul setelah guru menilai uraianmu. Sementara itu, pelajari kembali materi pada butir yang belum tepat.'
                : `Kamu masih ${Math.max(0, u.kkm - p.nilai).toFixed(1)} poin di bawah KKM. Baca pembahasan tiap butir yang salah, lalu coba ujian lain yang dibuka gurumu.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/siswa/riwayat"><Tombol varian="kedua" ikon={ChevronLeft}>Riwayat nilai</Tombol></Link>
          <Link to="/siswa"><Tombol varian="utama" ikon={ChevronRight}>Ujian tersedia</Tombol></Link>
        </div>
      </section>
    </div>
  )
}