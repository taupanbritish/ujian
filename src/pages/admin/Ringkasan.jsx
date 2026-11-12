import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, LibraryBig, Target, Award, ClipboardCheck, Plus, ArrowUpRight, Radio,
  Activity, Trophy, CalendarClock, ChevronRight, Sparkles, FileStack,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { BatangDistribusi, Donut, GarisTren, BatangHorizontal, Sparkline } from '../../components/charts'
import { Avatar, BilahProgres, Cincin, Galat, Pil, Rangka, Tombol, TitikNyala } from '../../components/ui'
import { STATUS_UJIAN, nilaiTeks, relatif, tanggal, hitungMundur, warnaNilai, namaPanggilan } from '../../lib/format'

function KartuKpi({ ikon: Ikon, label, nilai, satuan, warna, keterangan, aksi, children }) {
  return (
    <div className="kartu kartu-hover anim-naik group overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-12 -right-10 size-28 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50" style={{ background: warna }} />
      <div className="relative flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl border" style={{ borderColor: `color-mix(in oklab, ${warna} 40%, transparent)`, background: `color-mix(in oklab, ${warna} 13%, transparent)`, color: warna }}>
          <Ikon size={17} strokeWidth={2.2} />
        </span>
        {children}
      </div>
      <p className="relative mt-3.5 font-mono text-[1.9rem] leading-none font-bold text-chalk">
        {nilai}
        {satuan && <span className="ml-1 text-[0.9rem] font-semibold text-mute">{satuan}</span>}
      </p>
      <p className="relative mt-1.5 text-[0.78rem] font-bold text-body">{label}</p>
      {keterangan && <p className="relative mt-1 text-[0.72rem] leading-snug text-mute">{keterangan}</p>}
      {aksi && (
        <Link to={aksi.ke} className="relative mt-3 inline-flex items-center gap-1 text-[0.74rem] font-bold transition hover:gap-2" style={{ color: warna }}>
          {aksi.label} <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  )
}

export default function Ringkasan() {
  const { pengguna } = useAuth()
  const navigate = useNavigate()
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['ringkasan'], queryFn: () => api('/ringkasan'), refetchInterval: 30000 })

  if (isPending) return <div className="space-y-5"><div className="rangka h-32 rounded-2xl" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="rangka h-40 rounded-2xl" />)}</div><Rangka baris={4} /></div>
  if (error) return <Galat pesan={error.message} onUlang={refetch} />

  const k = data.kpi
  const jam = new Date().getHours()
  const sapaan = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 19 ? 'Selamat sore' : 'Selamat malam'
  const live = data.ujian_sorotan.filter((u) => u.status_efektif === 'berlangsung')

  return (
    <div className="space-y-6">
      <section className="kartu relative overflow-hidden">
        <div className="aurora opacity-30" />
        <div className="teksturnoda pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay" />
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] font-bold tracking-[0.24em] text-cyan uppercase">{sapaan}, {namaPanggilan(pengguna.nama)}</p>
            <h2 className="mt-2 max-w-[24ch] text-[1.7rem] leading-[1.1] sm:text-[2.1rem]">
              {k.sedang_mengerjakan > 0 ? (
                <>Ada <span className="font-display font-normal text-lime italic">{k.sedang_mengerjakan} peserta</span> sedang mengerjakan ujian.</>
              ) : (
                <>Semua ruang ujian <span className="font-display font-normal text-cyan italic">tenang</span> saat ini.</>
              )}
            </h2>
            <p className="mt-2.5 max-w-[52ch] text-[0.85rem] leading-relaxed text-mute">
              {tanggal(new Date(), { jam: true })} · {k.percobaan_selesai} lembar jawaban telah dinilai dari {k.ujian} paket ujian pada {data.per_mapel.length} mata pelajaran.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Tombol varian="utama" ikon={Plus} onClick={() => navigate('/admin/ujian?baru=1')}>Buat ujian baru</Tombol>
              <Tombol varian="kedua" ikon={LibraryBig} onClick={() => navigate('/admin/bank-soal?baru=1')}>Tambah soal</Tombol>
              {k.sedang_mengerjakan > 0 && (
                <Tombol varian="sukses" ikon={Radio} onClick={() => navigate('/admin/monitoring')}>Awasi {k.sedang_mengerjakan} sesi</Tombol>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-line-soft bg-ink-950/50 p-4 backdrop-blur">
            <Cincin nilai={k.kelulusan || 0} ukuran={92} tebal={9} warna="#A3E635">
              <span className="text-center">
                <span className="block font-mono text-[1.3rem] leading-none font-bold text-chalk">{k.kelulusan ?? 0}%</span>
                <span className="mt-0.5 block text-[0.58rem] font-bold tracking-widest text-mute uppercase">Tuntas</span>
              </span>
            </Cincin>
            <div className="space-y-2 text-[0.75rem]">
              <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-lime" /> <span className="text-mute">Rata-rata</span> <span className="font-mono font-bold text-chalk">{nilaiTeks(k.rata_nilai)}</span></p>
              <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-cyan" /> <span className="text-mute">Selesai hari ini</span> <span className="font-mono font-bold text-chalk">{k.selesai_hari_ini}</span></p>
              <p className="flex items-center gap-2"><span className="size-2 rounded-full bg-amber" /> <span className="text-mute">Perlu dinilai</span> <span className="font-mono font-bold text-chalk">{k.perlu_penilaian}</span></p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuKpi ikon={Users} label="Peserta aktif" nilai={k.siswa} warna="#38BDF8" keterangan={`${k.guru} guru pengampu terdaftar`} aksi={{ ke: '/admin/peserta', label: 'Kelola peserta' }}>
          <Sparkline data={[12, 16, 14, 19, 21, 22, k.siswa]} warna="#38BDF8" />
        </KartuKpi>
        <KartuKpi ikon={LibraryBig} label="Butir soal siap pakai" nilai={k.soal} warna="#7C5CFF" keterangan="Tersusun per mata pelajaran dan tingkat kesulitan" aksi={{ ke: '/admin/bank-soal', label: 'Buka bank soal' }} />
        <KartuKpi ikon={Target} label="Rata-rata nilai sekolah" nilai={nilaiTeks(k.rata_nilai)} warna="#22D3EE" keterangan={`Dari ${k.percobaan_selesai} percobaan selesai`}>
          <Cincin nilai={k.rata_nilai || 0} ukuran={40} tebal={4} warna="#22D3EE" />
        </KartuKpi>
        <KartuKpi ikon={ClipboardCheck} label="Menunggu penilaian guru" nilai={k.perlu_penilaian} warna="#FFB020" keterangan="Jawaban uraian yang belum diberi skor" aksi={{ ke: '/admin/hasil?penilaian=perlu', label: 'Nilai sekarang' }}>
          {k.perlu_penilaian > 0 && <TitikNyala warna="#FFB020" label="Perlu tindakan" />}
        </KartuKpi>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="kartu anim-naik p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-[1.05rem]"><Award size={17} className="text-lime" /> Sebaran nilai peserta</h3>
              <p className="mt-1 text-[0.78rem] text-mute">Delapan rentang nilai dari seluruh percobaan yang telah selesai.</p>
            </div>
            <Pil warna="#7C5CFF">{k.percobaan_selesai} lembar</Pil>
          </div>
          <BatangDistribusi data={data.distribusi} />
        </div>

        <div className="kartu anim-naik tunda-1 p-5">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><FileStack size={17} className="text-cyan" /> Status paket ujian</h3>
          <p className="mt-1 mb-4 text-[0.78rem] text-mute">Klik kategori untuk menyaring daftar ujian.</p>
          <Donut data={data.status_ujian} judul="Paket" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.status_ujian.filter((s) => ['berlangsung', 'akan_datang'].includes(s.kunci)).map((s) => (
              <button key={s.kunci} onClick={() => navigate(`/admin/ujian?status=${s.kunci}`)} className="rounded-xl border border-line-soft bg-ink-950/50 p-2.5 text-left transition hover:border-violet/60">
                <p className="font-mono text-[1.1rem] font-bold" style={{ color: s.warna }}>{s.jumlah}</p>
                <p className="text-[0.7rem] text-mute">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="kartu anim-naik p-5 xl:col-span-2">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-[1.05rem]"><Activity size={17} className="text-cyan" /> Denyut pengerjaan 7 hari</h3>
              <p className="mt-1 text-[0.78rem] text-mute">Jumlah lembar jawaban yang dikirim setiap hari.</p>
            </div>
          </div>
          <GarisTren data={data.tren} tinggi={210} />
        </div>

        <div className="kartu anim-naik tunda-1 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[1.05rem]"><Trophy size={17} className="text-amber" /> Peraih nilai tertinggi</h3>
          <ol className="space-y-2">
            {data.peringkat.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-transparent p-1.5 transition hover:border-line-soft hover:bg-ink-800/60">
                <span className="grid size-6 flex-none place-items-center rounded-lg font-mono text-[0.72rem] font-bold"
                  style={{ background: i < 3 ? ['#FFB02022', '#C8D0EA22', '#FF7A4522'][i] : '#101736', color: i < 3 ? ['#FFB020', '#C8D0EA', '#FF7A45'][i] : '#8A93B8' }}>
                  {i + 1}
                </span>
                <Avatar nama={p.nama} gender={p.gender} ukuran={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8rem] font-bold text-chalk">{p.nama}</span>
                  <span className="block text-[0.68rem] text-mute">{p.kelas} · {p.jumlah} ujian</span>
                </span>
                <span className="font-mono text-[0.9rem] font-bold" style={{ color: warnaNilai(p.rata) }}>{nilaiTeks(p.rata)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[1.05rem]"><CalendarClock size={17} className="text-violet" /> Ujian yang perlu perhatian</h3>
          <Link to="/admin/ujian" className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-cyan transition hover:gap-2">Semua ujian <ChevronRight size={14} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.ujian_sorotan.map((u, i) => {
            const s = STATUS_UJIAN[u.status_efektif]
            const progres = u.sasaran ? Math.round((u.jumlah_selesai / u.sasaran) * 100) : 0
            return (
              <Link key={u.id} to={`/admin/ujian/${u.id}`} className={`kartu kartu-hover anim-naik tunda-${Math.min(i + 1, 6)} block overflow-hidden p-4`}>
                <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${u.mapel_warna}, ${s.warna})` }} />
                <div className="flex items-start justify-between gap-2">
                  <Pil warna={u.mapel_warna}>{u.mapel_nama}</Pil>
                  <Pil warna={s.warna}>{s.label}</Pil>
                </div>
                <h4 className="mt-3 line-clamp-2 min-h-[2.6rem] text-[0.92rem] leading-snug">{u.judul}</h4>
                <p className="mt-1.5 text-[0.72rem] text-mute">
                  {u.status_efektif === 'akan_datang' ? `Mulai ${hitungMundur(u.mulai_pada)} lagi` : u.status_efektif === 'berlangsung' ? `Tutup ${hitungMundur(u.selesai_pada)} lagi` : tanggal(u.mulai_pada, { jam: true })}
                </p>
                <div className="mt-3 flex items-center justify-between text-[0.72rem]">
                  <span className="text-mute">{u.jumlah_selesai}/{u.sasaran} peserta</span>
                  <span className="font-mono font-bold text-chalk">{progres}%</span>
                </div>
                <BilahProgres nilai={progres} warna={u.mapel_warna} className="mt-1.5" />
                <div className="mt-3 flex items-center gap-3 text-[0.7rem] text-mute">
                  <span>{u.jumlah_soal} soal</span>
                  <span className="size-1 rounded-full bg-line" />
                  <span>{u.durasi_menit} menit</span>
                  {u.jumlah_berlangsung > 0 && <><span className="size-1 rounded-full bg-line" /><span className="font-bold text-lime">{u.jumlah_berlangsung} live</span></>}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="kartu anim-naik p-5 xl:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-[1.05rem]"><Sparkles size={17} className="text-pink" /> Aktivitas terbaru</h3>
          <ol className="relative space-y-3 pl-5">
            <span className="absolute top-2 bottom-2 left-[6px] w-px bg-[linear-gradient(180deg,#7C5CFF,#22D3EE,transparent)]" />
            {data.aktivitas.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute top-1.5 -left-5 size-3 rounded-full border-2 border-ink-850" style={{ background: a.warna, boxShadow: `0 0 10px ${a.warna}88` }} />
                <p className="text-[0.83rem] leading-snug text-body">{a.keterangan}</p>
                <p className="mt-0.5 text-[0.7rem] text-mute">{relatif(a.dibuat_pada)}{a.nama ? ` · ${a.nama}` : ''}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="kartu anim-naik tunda-1 p-5">
          <h3 className="mb-1 flex items-center gap-2 text-[1.05rem]"><Target size={17} className="text-lime" /> Capaian per mata pelajaran</h3>
          <p className="mb-4 text-[0.78rem] text-mute">Rata-rata nilai lintas ujian yang sudah selesai.</p>
          <BatangHorizontal data={data.per_mapel.map((m) => ({ label: m.nama, nilai: m.rata, warna: m.warna }))} />
        </div>
      </section>

      {live.length > 0 && (
        <section className="kartu relative overflow-hidden border-lime/30 p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_50%,rgba(163,230,53,0.12),transparent_70%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-lime/40 bg-lime/12 text-lime"><Radio size={20} /></span>
              <div>
                <p className="text-[0.95rem] font-bold text-chalk">Pengawasan langsung tersedia</p>
                <p className="mt-0.5 text-[0.8rem] text-mute">{live.map((u) => u.judul).join(' · ')}</p>
              </div>
            </div>
            <Tombol varian="sukses" ikon={Radio} onClick={() => navigate('/admin/monitoring')}>Buka ruang pengawasan</Tombol>
          </div>
        </section>
      )}
    </div>
  )
}