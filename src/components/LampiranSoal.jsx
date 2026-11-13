import { useState } from 'react'
import { Film, Headphones, Play, Image as ImageIcon } from 'lucide-react'

// Tautan eksternal http(s) atau berkas unggahan yang disajikan server dengan
// URL relatif bertanda tangan (/api/media/…). Path relatif lain ditolak.
const aman = (url) => {
  const s = String(url || '')
  return /^https?:\/\//i.test(s) || /^\/(?!\/)/.test(s)
}

const berkasServer = (url) => /^\/(?!\/)/.test(String(url || ''))

const idYouTube = (url) => {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0]
    if (/(^|\.)youtube\.com$/.test(u.hostname) || u.hostname === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/)
      if (m) return m[2]
    }
    return null
  } catch {
    return null
  }
}

const ekstensiVideo = (url) => /\.(mp4|webm|ogv)(\?|#|$)/i.test(String(url || ''))

function VideoLampiran({ l, tema }) {
  const [putar, setPutar] = useState(false)
  const yt = idYouTube(l.url)
  const gelap = tema === 'gelap'
  const bingkai = gelap ? 'border-line bg-ink-950/60' : 'border-paper-line bg-white/60'
  const teks = gelap ? 'text-chalk' : 'text-paper-ink'
  const redup = gelap ? 'text-mute' : 'text-paper-ink/60'

  if (yt && putar) {
    return (
      <div className={`overflow-hidden rounded-xl border ${bingkai}`}>
        <div className="relative aspect-video w-full">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
            title={l.alt || l.nama || 'Video soal'}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    )
  }

  if (ekstensiVideo(l.url) || berkasServer(l.url)) {
    return (
      <div className={`overflow-hidden rounded-xl border ${bingkai}`}>
        <video src={l.url} controls preload="none" playsInline className="max-h-[22rem] w-full bg-black" aria-label={l.alt || l.nama || 'Video soal'} />
      </div>
    )
  }

  // Tautan video (YouTube/pages): jangan memuat iframe sebelum diklik. Tiga
  // puluh peserta yang membuka soal bersamaan tidak boleh memicu 30 embed.
  return (
    <button
      type="button"
      onClick={() => { if (yt) setPutar(true); else window.open(l.url, '_blank', 'noopener,noreferrer') }}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${bingkai}`}
    >
      <span className={`grid size-11 flex-none place-items-center rounded-lg ${gelap ? 'bg-violet/15 text-violet' : 'bg-violet/12 text-violet'}`}>
        <Play size={17} fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[0.85rem] font-bold ${teks}`}>{l.nama || l.alt || 'Video'}</span>
        <span className={`block text-[0.7rem] ${redup}`}>{yt ? 'Klik untuk memutar video' : 'Buka tautan video di tab baru'}</span>
      </span>
      <Film size={16} className={redup} />
    </button>
  )
}

/**
 * Render lampiran butir soal. `tema="kertas"` untuk lembar ujian/hasil siswa
 * (latar terang), `tema="gelap"` untuk panel admin.
 */
export default function LampiranSoal({ lampiran = [], tema = 'gelap', kompak = false, className = '' }) {
  const daftar = (Array.isArray(lampiran) ? lampiran : []).filter((l) => l && aman(l.url))
  if (!daftar.length) return null
  const gelap = tema === 'gelap'
  const bingkai = gelap ? 'border-line bg-ink-950/50' : 'border-paper-line bg-white/70'
  const redup = gelap ? 'text-mute' : 'text-paper-ink/60'
  const teks = gelap ? 'text-body' : 'text-paper-ink'

  return (
    <div className={`${kompak ? 'mt-2 space-y-1.5' : 'mt-3 space-y-2.5'} ${className}`}>
      {daftar.map((l, i) => {
        if (l.jenis === 'gambar') {
          return (
            <figure key={`${l.url}-${i}`} className="m-0">
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka gambar ukuran penuh"
                className={`group block overflow-hidden rounded-xl border ${bingkai}`}
              >
                <img
                  src={l.url}
                  alt={l.alt || l.nama || 'Gambar soal'}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={`mx-auto w-auto max-w-full object-contain transition group-hover:opacity-95 ${kompak ? 'max-h-56' : 'max-h-[26rem]'}`}
                />
              </a>
              {(l.alt || l.nama) && (
                <figcaption className={`mt-1 flex items-center gap-1.5 text-[0.68rem] ${redup}`}>
                  <ImageIcon size={11} className="flex-none" /> <span className="truncate">{l.alt || l.nama}</span>
                </figcaption>
              )}
            </figure>
          )
        }
        if (l.jenis === 'audio') {
          return (
            <div key={`${l.url}-${i}`} className={`rounded-xl border p-2.5 ${bingkai}`}>
              <p className={`mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold ${teks}`}>
                <Headphones size={12} className={redup} /> <span className="truncate">{l.nama || l.alt || 'Rekaman audio'}</span>
              </p>
              <audio src={l.url} controls preload="none" className="w-full" aria-label={l.alt || l.nama || 'Audio soal'}>
                Peramban Anda tidak mendukung pemutar audio. <a href={l.url}>Buka berkas audio</a>.
              </audio>
            </div>
          )
        }
        return <VideoLampiran key={`${l.url}-${i}`} l={l} tema={tema} />
      })}
    </div>
  )
}
