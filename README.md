# ShanaTech CBT

Aplikasi **ujian berbasis komputer** (Computer-Based Test) untuk sekolah, dengan pendekatan
*white-label* dan dukungan multi-jenjang (**SD / SMP / SMA / SMK**). Satu kode sumber dapat
didistribusikan ke sekolah lain cukup dengan mengubah identitas pada berkas `.env` atau menu
**Pengaturan Sekolah**, tanpa menulis ulang aplikasi.

- **Frontend:** React 18 + Vite 6 + Tailwind CSS v4, React Router v6, TanStack Query v5.
- **Backend:** Express 4 + PostgreSQL (`pg`), autentikasi JWT, hashing sandi `@node-rs/bcrypt`
  (bcrypt native di thread pool libuv), validasi `zod`.
- **Impor/ekspor:** `xlsx` untuk impor Excel (soal, peserta, ujian) dan ekspor hasil ke CSV.

---

## Daftar isi

1. [Fitur utama](#fitur-utama)
2. [Prasyarat](#prasyarat)
3. [Mulai cepat](#mulai-cepat)
4. [Skrip npm](#skrip-npm)
5. [Konfigurasi lingkungan (.env)](#konfigurasi-lingkungan-env)
6. [Akun demo & data dummy](#akun-demo--data-dummy)
7. [Hak akses per peran](#hak-akses-per-peran)
8. [Impor Excel bank soal](#impor-excel-bank-soal)
9. [Struktur folder](#struktur-folder)
10. [Catatan arsitektur](#catatan-arsitektur)
11. [Kapasitas database & auto-save](#kapasitas-database--auto-save)
12. [Build & produksi](#build--produksi)
13. [Pengembangan & pemeriksaan](#pengembangan--pemeriksaan)

---

## Fitur utama

**Administrator**

- **Ringkasan** sekolah: statistik soal, ujian, peserta, dan aktivitas terbaru.
- **Bank Soal**: empat bentuk soal (pilihan ganda, benar/salah, isian singkat, uraian) lengkap
  dengan kunci, bobot, tingkat kesukaran, topik, dan pembahasan. Tampilan tabel/kartu, filter
  tersimpan, duplikat, dan arsip (soft delete). **Impor Excel** + unduh template.
- **Ujian**: penyusun paket soal, token akses, jadwal mulai/selesai, durasi, kelas target,
  pengacakan soal/opsi. **Impor Excel** untuk membuat banyak ujian sekaligus.
- **Pengawasan** langsung: status peserta, progres pengerjaan, sisa waktu, dan log aktivitas.
- **Hasil & Nilai**: penilaian otomatis (PG/benar-salah/isian) dan manual (uraian), ekspor CSV.
- **Mata Pelajaran** per jenjang + katalog rekomendasi bawaan; penentuan guru pengampu.
- **Peserta & Akun**: CRUD akun, **impor Excel** peserta dengan pembangkitan sandi acak.
- **Pengaturan Sekolah**: nama sekolah, nama aplikasi, tahun ajaran, jenjang, dan kelas manual (rombel).

**Guru**

- Empat alur mengajar: **Bank Soal, Ujian, Pengawasan, Hasil & Nilai** (plus Profil).
- Seluruh data **dibatasi pada mata pelajaran yang diampu** (`mapel.guru_id`): guru hanya melihat
  soal, paket ujian, pengawasan, dan hasil untuk mapel miliknya. Akses langsung ke mapel lain ditolak (404).

**Peserta didik (siswa)**

- **Beranda** hanya menampilkan ujian yang berlangsung hari ini.
- **Ruang ujian** dengan penghitung waktu, navigasi soal, dan penanda ragu-ragu.
- **Riwayat nilai** dan halaman hasil per ujian, serta **Profil** (ganti sandi).

**Umum**

- Tombol **masuk cepat demo** satu klik untuk pengujian (wajib dinonaktifkan di produksi).
- Antarmuka berbahasa Indonesia, tema gelap, responsif (desktop & mobile).

---

## Prasyarat

| Kebutuhan | Versi | Keterangan |
|---|---|---|
| Node.js | 20 atau lebih baru | Disarankan 20 / 22 / 24 |
| PostgreSQL | 14 atau lebih baru | Lokal atau cloud (Neon, Supabase, Railway, RDS) |
| npm | bawaan Node.js | Untuk memasang dependensi & menjalankan skrip |

### Menyiapkan PostgreSQL lokal di macOS

Pastikan layanan PostgreSQL sudah berjalan. Jika PostgreSQL dipasang lewat installer
EnterpriseDB versi 18 dengan lokasi bawaan, periksa koneksi dengan:

```bash
/Library/PostgreSQL/18/bin/pg_isready -h 127.0.0.1 -p 5432
```

Jika hasilnya `accepting connections`, masuk ke PostgreSQL menggunakan akun administrator
yang dibuat saat instalasi:

```bash
/Library/PostgreSQL/18/bin/psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

Masukkan kata sandi PostgreSQL saat diminta, lalu buat database aplikasi:

```sql
CREATE DATABASE cendekia;
\q
```

Selanjutnya, salin konfigurasi contoh dan sesuaikan `DATABASE_URL` di `.env` dengan username
dan kata sandi PostgreSQL lokal:

```bash
cp .env.example .env
```

Contoh jika username-nya `postgres`:

```env
DATABASE_URL=postgresql://postgres:KATA_SANDI@127.0.0.1:5432/cendekia
```

Ganti `KATA_SANDI` dengan kata sandi yang dipakai saat instalasi. Jika kata sandi mengandung
karakter khusus seperti `@`, `#`, atau `/`, lakukan URL-encoding pada karakter tersebut.
Lokasi executable `psql` dapat berbeda jika PostgreSQL dipasang dengan cara lain; sesuaikan
perintah di atas dengan lokasi instalasi dan port server Anda.

Setelah itu, dari folder project jalankan migrasi dan seeder:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend tersedia di <http://localhost:5180> dan API di <http://127.0.0.1:4310>.

Jika migrasi gagal terhubung, pastikan layanan PostgreSQL aktif dan host, port, username,
kata sandi, serta nama database pada `DATABASE_URL` sudah benar.

---

## Mulai cepat

```bash
# 1. Pasang dependensi
npm install

# 2. Salin contoh konfigurasi lalu sesuaikan
cp .env.example .env
#    Edit .env: DATABASE_URL, JWT_SECRET, dan identitas sekolah (SEKOLAH_*, NAMA_APLIKASI).

# 3. Buat skema database
npm run db:migrate

# 4. Isi data dummy minimal (1 admin, 1 guru, 5 siswa, 1 mapel, 10 soal)
npm run db:seed

# 5. Jalankan API + frontend sekaligus
npm run dev
```

Setelah `npm run dev` berjalan:

- Frontend (Vite): <http://localhost:5180>
- API (Express): <http://127.0.0.1:4310> (Vite mem-proxy `/api` ke port ini)

Masuk memakai salah satu [akun demo](#akun-demo--data-dummy) di bawah, atau tombol masuk cepat
demo bila `DEMO_MASUK=true`.

> **Reset total data:** `npm run db:seed -- --force` **menghapus seluruh** isi database
> (pengguna, soal, ujian, percobaan, jawaban, aktivitas, mapel) lalu mengisi ulang data dummy.
> Gunakan hanya pada lingkungan pengembangan/demo.

---

## Skrip npm

| Skrip | Perintah | Fungsi |
|---|---|---|
| `dev` | `npm run dev` | Menjalankan API (`--watch`) + Vite bersamaan |
| `dev:api` | `npm run dev:api` | Hanya API dengan auto-reload |
| `dev:web` | `npm run dev:web` | Hanya frontend Vite (port 5180) |
| `build` | `npm run build` | Build produksi frontend ke `dist/` |
| `preview` | `npm run preview` | Pratinjau hasil build Vite |
| `start` | `npm start` | Menjalankan API produksi + menyajikan `dist/` |
| `db:migrate` | `npm run db:migrate` | Menjalankan `server/db/schema.sql` |
| `db:seed` | `npm run db:seed` | Mengisi data dummy (idempoten) |
| `db:seed -- --force` | — | Mengosongkan lalu mengisi ulang data dummy |
| `db:setup` | `npm run db:setup` | `db:migrate` lalu `db:seed` |
| `db:check` | `npm run db:check` | Memeriksa koneksi & isi database |

---

## Konfigurasi lingkungan (.env)

Salin dari `.env.example`. Nilai penting:

| Variabel | Bawaan / contoh | Keterangan |
|---|---|---|
| `PORT` | `4310` | Port API Express |
| `DATABASE_URL` | `postgresql://user:pass@127.0.0.1:5433/cendekia` | Koneksi PostgreSQL; arahkan ke cloud bila perlu |
| `DATABASE_SSL` | otomatis | SSL aktif otomatis bila host bukan localhost; paksa `true`/`false` |
| `DATABASE_POOL_MAX` | `10` | Koneksi maksimum per proses Node; lihat [Kapasitas database](#kapasitas-database--auto-save) |
| `DATABASE_APP_INSTANCES` | `1` | Jumlah proses API bersamaan (cluster/PM2) untuk peringatan kapasitas |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` | Koneksi menganggur ditutup setelah durasi ini |
| `DATABASE_CONNECT_TIMEOUT_MS` | `15000` | Batas waktu membuka koneksi baru |
| `DATABASE_PGBOUNCER` | `false` | `true` bila `DATABASE_URL` menunjuk PgBouncer |
| `JWT_SECRET` | ganti untuk produksi | Rahasia penandatanganan token; pakai `openssl rand -hex 32` |
| `JWT_EXPIRES` | `12h` | Masa berlaku token |
| `SEED_ADMIN_EMAIL` | `admin@cendekia.sch.id` | Email admin yang dibuat seeder |
| `SEED_ADMIN_PASSWORD` | `"Cendekia#2026"` | Sandi admin (kutip bila mengandung `#`/`$`) |
| `SEED_GURU_PASSWORD` | `"Cendekia#2026"` | Sandi guru |
| `SEED_SISWA_PASSWORD` | `"Cendekia#2026"` | Sandi seluruh siswa demo |
| `DEMO_MASUK` | `true` | Tombol masuk cepat demo; **wajib `false` di produksi** |
| `SEKOLAH_JENJANG` | `SMP` | `SD` / `SMP` / `SMA` / `SMK`; menentukan kelas, mapel, paket soal |
| `SEKOLAH_NAMA` | `"SMP Cendekia Nusantara"` | Nama sekolah tampil di antarmuka |
| `TAHUN_AJARAN` | `"2026/2027"` | Tahun ajaran aktif |
| `NAMA_APLIKASI` | `"ShanaTech CBT"` | Kata pertama = nama utama, sisanya = lencana |

> `NODE_ENV` sengaja **tidak** ditulis di `.env`. Vite ikut membaca `.env`; nilai `development`
> di sana membuat `npm run build` membundel React versi development. Biarkan Vite/platform
> hosting menentukan, atau paksa lewat shell: `NODE_ENV=production npm start`.

Identitas sekolah (`SEKOLAH_NAMA`, `TAHUN_AJARAN`, `NAMA_APLIKASI`) juga dapat diubah langsung
dari menu **Pengaturan Sekolah** (admin) tanpa seed ulang. Jenjang dikunci saat distribusi.

---

## Akun demo & data dummy

Seeder minimal menghasilkan **7 akun, 1 mata pelajaran, 10 butir soal, 0 ujian** — keadaan
bersih yang siap dipakai menyusun ujian pertama.

| Peran | Nama | Email | NIS | Sandi |
|---|---|---|---|---|
| Administrator | Administrator Sekolah | `admin@cendekia.sch.id` | `ADM-001` | `Cendekia#2026` |
| Guru | Guru Informatika | `guru@shanatech.sch.id` | `GR-001` | `Cendekia#2026` |
| Siswa | Ahmad Fauzan Ramadhan | `ahmad.fauzan@siswa.shanatech.sch.id` | `26001` | `Cendekia#2026` |
| Siswa | Nadia Putri Anggraini | `nadia.putri@siswa.shanatech.sch.id` | `26002` | `Cendekia#2026` |
| Siswa | Rizky Aditya Nugroho | `rizky.aditya@siswa.shanatech.sch.id` | `26003` | `Cendekia#2026` |
| Siswa | Salsabila Azzahra | `salsabila.azzahra@siswa.shanatech.sch.id` | `26004` | `Cendekia#2026` |
| Siswa | Bagas Dwi Prakoso | `bagas.dwi@siswa.shanatech.sch.id` | `26005` | `Cendekia#2026` |

- Login menerima **email atau NIS** (tidak peka huruf besar/kecil).
- Sandi mengikuti `SEED_*_PASSWORD` pada `.env`; tabel di atas memakai nilai bawaan contoh.
- Mata pelajaran: **Informatika** (kode `INF`), diampu oleh akun Guru Informatika.
- Kelima siswa berada pada kelas demo pertama jenjang aktif (mis. `IX-A` untuk SMP).
- **Kredensial demo tidak ditampilkan di antarmuka aplikasi**; hanya tercantum di README dan `.env`.

---

## Hak akses per peran

| Menu / alur | Admin | Guru | Siswa |
|---|:---:|:---:|:---:|
| Ringkasan sekolah | ✔ | – | – |
| Bank Soal (+ impor Excel) | ✔ | ✔¹ | – |
| Ujian / penyusun paket | ✔ | ✔¹ | – |
| Pengawasan langsung | ✔ | ✔¹ | – |
| Hasil & Nilai (+ ekspor CSV) | ✔ | ✔¹ | – |
| Mata Pelajaran | ✔ | – | – |
| Peserta & Akun | ✔ | – | – |
| Pengaturan Sekolah | ✔ | – | – |
| Beranda / riwayat / ruang ujian | – | – | ✔ |
| Profil & keamanan | ✔ | ✔ | ✔ |

¹ **Terbatas mapel yang diampu.** Sumber kebenaran penugasan adalah kolom `mapel.guru_id`.
Guru hanya melihat dan mengubah soal, ujian, pengawasan, dan hasil pada mapel tersebut;
permintaan langsung ke butir/mapel lain dikembalikan sebagai 404. Administrator tidak dibatasi.

Pembatasan diterapkan di dua lapis: guard rute frontend (`HanyaAdmin`, `ButuhPeran`) dan
middleware/penyaring kueri backend (`server/lib/guru.js`: `batasiMapel`, `milikGuru`).

---

## Impor Excel bank soal

Buka **Bank Soal → Import Excel**. Mendukung `.xlsx`, `.xls`, dan `.csv`; baris pertama wajib
berisi nama kolom (urutan bebas). Modal membaca hingga **1000 baris**; endpoint memproses
maksimal **500 baris per impor**, sehingga file lebih besar perlu dipecah. Tersedia tombol
**Unduh template** untuk contoh format yang pasti cocok.

| Kolom | Wajib | Contoh | Alias yang dikenali |
|---|:---:|---|---|
| `tipe` (Bentuk) | ✔ | `pilihan_ganda` | `bentuk`, `jenis`, `type` |
| `pertanyaan` | ✔ | `Urutan langkah logis … disebut …` | `soal`, `question` |
| `mapel` | –² | `INF` | `mata pelajaran`, `kode mapel` |
| `opsi_a` … `opsi_e` | –³ | `algoritma` | `a`…`e`, `pilihan a`… |
| `kunci` | –³ | `a` | `jawaban`, `kunci jawaban`, `answer` |
| `tingkat` | – | `mudah` / `sedang` / `sulit` | `kesukaran`, `level` |
| `bobot` | – | `1` | `score`, `weight` |
| `topik` | – | `Berpikir Komputasional` | `materi` |
| `pembahasan` | – | `Algoritma adalah urutan langkah …` | `explanation` |

² Bila hanya ada satu mapel yang dapat diakses (mis. guru dengan satu mapel), kolom `mapel`
boleh kosong dan otomatis dipakai mapel tersebut. Bila ada lebih dari satu, kolom `mapel`
wajib diisi (kode atau nama mapel).
³ Untuk pilihan ganda, isi `opsi_a`… dan `kunci` (huruf `a`–`e`, angka `1`–`5`, atau teks opsi
persis). Untuk benar/salah, `kunci` = `benar`/`salah`. Untuk isian, `kunci` = teks jawaban.

Bentuk soal yang diterima: `pilihan_ganda`/`pg`, `benar_salah`/`bs`, `isian`/`is`, `esai`/`es`/`uraian`/`essay`.
Hasil impor melaporkan jumlah **dibuat**, **galat**, dan rincian galat per nomor baris.

---

## Struktur folder

```
.
├── index.html               # Entry HTML Vite
├── vite.config.js           # Port 5180, proxy /api → 4310, manualChunks
├── package.json
├── .env.example             # Contoh konfigurasi (salin ke .env)
├── public/                  # Aset statis (favicon)
├── deploy/pgbouncer/        # Konfigurasi PgBouncer (opsional, peserta > 500)
├── src/
│   ├── main.jsx             # Bootstrap React + QueryClient + Router
│   ├── App.jsx              # Rute bersarang + guard peran
│   ├── index.css            # Tailwind v4 + token desain
│   ├── components/          # AppShell, ui, ImporExcel, SoalForm, UjianForm, charts, Logo
│   ├── context/             # AuthContext (sesi JWT)
│   ├── lib/                 # klien API, util
│   └── pages/
│       ├── Login.jsx
│       ├── Profil.jsx
│       ├── admin/           # Ringkasan, BankSoal, Ujian, UjianDetail, Monitoring,
│       │                    # Hasil, Mapel, Peserta, Pengaturan
│       └── siswa/           # Beranda, Riwayat, RuangUjian, HasilSiswa
└── server/
    ├── index.js             # Express, rute API, penyajian dist/ saat produksi
    ├── middleware/auth.js   # wajibMasuk, boleh, staf (JWT)
    ├── lib/                 # http, guru (scoping), jenjang, pengaturan, penilaian,
    │                        # sandi (bcrypt native), jawaban (batch UPSERT), ujian
    ├── routes/              # auth, soal, ujian, monitoring, hasil, pengguna, mapel,
    │                        # ringkasan, siswa, pengaturan
    └── db/
        ├── schema.sql       # Skema + migrasi idempoten
        ├── migrate.js       # Menjalankan schema.sql
        ├── seed.js          # Seeder dummy minimal (--force untuk reset)
        ├── pool.js          # Pool pg, statistik, ukuran koneksi, info SSL
        ├── check.js         # Pemeriksa koneksi
        ├── data-jenjang.js  # Katalog kelas/mapel/soal per jenjang
        ├── data-seed.js     # Nama siswa demo + bank soal
        └── bentuk-soal.js   # Pembentuk opsi/kunci per bentuk soal
```

Tabel database: `pengguna`, `mapel`, `rombel`, `soal`, `ujian`, `ujian_soal`, `percobaan`,
`jawaban`, `aktivitas`, `pengaturan`. Penghapusan bersifat *soft delete* (`dihapus_pada`).

---

## Catatan arsitektur

- **Code splitting:** setiap rute dimuat malas (`React.lazy`); `manualChunks` memisahkan
  `ikon`, `query`, `router`, `react`, `vendor`, dan `excel`. Pustaka `xlsx` hanya diunduh saat
  modal impor dibuka, sehingga halaman lain tetap ringan.
- **Satu sumber identitas:** nama sekolah/aplikasi/tahun ajaran/jenjang dibaca dari pengaturan
  (database) dengan fallback `.env`; endpoint `/api/pengaturan` bersifat publik untuk branding.
- **Scoping guru:** `server/lib/guru.js` menerjemahkan `mapel.guru_id` menjadi daftar id mapel;
  penyaring kueri menambahkan `mapel_id = ANY($n::int[])` pada soal, ujian, monitoring, dan hasil.
- **Penilaian:** PG/benar-salah/isian dinilai otomatis saat submit; uraian ditandai
  `perlu_penilaian` dan dinilai manual oleh guru/admin pada menu Hasil & Nilai.
- **Produksi satu origin:** bila `dist/` ada, Express menyajikan aset statis + fallback SPA,
  sehingga frontend dan API berada pada port yang sama.
- **Hashing sandi:** seluruh hash dibuat/diverifikasi lewat `server/lib/sandi.js` memakai
  `@node-rs/bcrypt` (cost 10). Perhitungan berjalan di thread pool libuv, bukan di thread JS
  utama, sehingga gelombang login bersamaan tidak memblokir event loop. Hash lama `$2a$`/`$2b$`
  hasil bcryptjs tetap valid tanpa migrasi data.

---

## Kapasitas database & auto-save

### Pool koneksi

`pg.Pool` membuka koneksi sekali lalu memakainya ulang; tidak ada koneksi baru per request.
Total koneksi ke PostgreSQL = `DATABASE_POOL_MAX` × `DATABASE_APP_INSTANCES`.

| Spesifikasi server database | `DATABASE_POOL_MAX` per proses |
|---|---|
| 2 vCPU / 4 GB | 5–8 |
| 4 vCPU / 8 GB | 10–16 |
| 8 vCPU / 16 GB | 20–30 |

Aturan praktis: total koneksi ≤ 2–4 × vCPU dan ≤ 80% `max_connections`. Saat start,
API mencatat ukuran pool dan memberi peringatan bila totalnya mendekati `max_connections`.
`GET /api/kesehatan` menampilkan `pool.total`, `pool.menganggur`, dan `pool.menunggu`.

Bila peserta serentak **> 500** atau API berjalan banyak proses, tempatkan **PgBouncer** di
depan PostgreSQL dengan `pool_mode = transaction`. Konfigurasi siap pakai dan panduan ukuran
pool ada di [`deploy/pgbouncer/`](deploy/pgbouncer/README.md). Arahkan `DATABASE_URL` ke port
PgBouncer dan set `DATABASE_PGBOUNCER=true`.

### Auto-save jawaban

Alur penyimpanan jawaban sengaja tidak menulis satu baris setiap kali opsi diklik:

1. Di klien, jawaban yang berubah ditandai "kotor". Pengiriman dijadwalkan **3 detik** setelah
   perubahan terakhir, dikirim segera saat siswa **berpindah nomor soal**, ditambah pemeriksaan
   tiap 10 detik; hanya soal yang berubah yang dikirim (maksimal 150 soal per permintaan).
2. Di klien, seluruh baris disimpan dengan **satu perintah** di server: `INSERT ... SELECT FROM
   unnest(...) ON CONFLICT (percobaan_id, soal_id) DO UPDATE`, bukan satu `UPDATE` per soal.
   Duplikat `soal_id` dalam satu payload diringkas (yang terakhir menang).
3. Paket soal diambil **sekali** saat tombol "Mulai" ditekan: halaman beranda mem-prefetch
   `['sesi-ujian', percobaan_id]`, lalu ruang ujian memakai `staleTime: Infinity`,
   `refetchOnWindowFocus: false`, dan `refetchOnReconnect: false`. Berpindah tab tidak
   memicu unduhan ulang soal. Status sesi (waktu habis/selesai) dipantau terpisah lewat
   `GET /siswa/percobaan/:id/status` yang berpayload kecil setiap 30 detik.

Jadi satu klik tidak sama dengan satu tulis ke PostgreSQL, dan satu permintaan tidak sama
dengan N perintah. Untuk beban jauh di atas 2.000 peserta serentak, buffer Redis dapat
ditambahkan sebagai lapisan tulis-asinkron, tetapi itu menukar daya tahan data dengan
pengurangan tulis; pola batch UPSERT saat ini tetap aman untuk ujian sekolah.

### Render ruang ujian

Ruang ujian dirancang agar dua beban berat tidak saling menular:

- **Timer terisolasi.** Countdown berada di `src/components/HitungMundur.jsx`, bukan di state
  halaman. Komponen ini memiliki interval 1 detik sendiri dan di-`memo`; tiap tick hanya
  me-render ulang angka timer, bukan lembar soal. Sisa waktu dihitung dari jangkar
  `{ sisa, at }` di `useRef`, diperbarui dari respons simpan jawaban dan polling status
  (sehingga penambahan waktu oleh pengawas ikut terbaca). Peringatan 5 menit/1 menit dan
  pengiriman otomatis saat waktu habis tetap ditangani komponen yang sama lewat callback stabil.
- **Satu soal aktif di DOM.** Lembar soal hanya merender `soal[idx]`; butir lain tetap berupa
  data di memori dan baru dipasang sebagai elemen saat nomornya dibuka. Ujian dengan puluhan
  hingga ratusan butir (termasuk soal bergambar) tidak membuat semua kartu sekaligus.
- **Skeleton saat prefetch.** Selama paket soal diambil (prefetch dari beranda atau muat ulang
  langsung), `RangkaRuangUjian` menampilkan kerangka header, kartu soal, dan panel navigasi
  dengan `aria-busy`, lalu diganti lembar soal tanpa lompatan tata letak.

---

## Build & produksi

```bash
npm run build        # menghasilkan dist/
npm start            # Express melayani API + dist/ di http://127.0.0.1:4310
```

Checklist sebelum publik:

1. `JWT_SECRET` diisi nilai acak panjang (`openssl rand -hex 32`).
2. `DEMO_MASUK=false` (menonaktifkan tombol masuk cepat demo).
3. `DATABASE_URL` menunjuk database produksi; SSL aktif otomatis untuk host cloud.
4. Jalankan `npm run db:migrate`; isi data awal lewat `db:seed` **atau** impor akun asli.
5. Server bind ke `127.0.0.1`; tempatkan di belakang reverse proxy (nginx/Caddy) untuk akses
   publik dan TLS.
6. Bila memaksa mode produksi lewat shell: `NODE_ENV=production npm start`.
7. Untuk gelombang login besar (ratusan peserta di menit awal), naikkan `UV_THREADPOOL_SIZE`
   (bawaan 4) dan/atau jalankan beberapa proses (cluster/PM2) di belakang proxy.
8. Sesuaikan `DATABASE_POOL_MAX` dengan spesifikasi server database; bila peserta serentak
   > 500 atau API berjalan banyak proses, pasang PgBouncer (`deploy/pgbouncer/`).

---

## Pengembangan & pemeriksaan

- **Kesehatan API:** `GET /api/kesehatan` mengembalikan status database dan info koneksi.
- **Periksa database:** `npm run db:check`.
- **Migrasi idempoten:** setelah memperbarui kode, jalankan `npm run db:migrate` sebelum aplikasi dipakai. `schema.sql` aman dijalankan berulang dan menghubungkan kembali penugasan guru lama bila nama guru pada mapel cocok dengan akun aktif.
- **Seeder idempoten:** `db:seed` melewati bila database sudah terisi; `--force` untuk reset penuh.
- **Verifikasi runtime:** jalankan `npm run dev`, masuk sebagai admin/guru/siswa, dan uji alur
  bank soal → penyusun ujian → ruang ujian siswa → pengawasan → hasil & penilaian.

---

© ShanaTech — ShanaTech CBT. Dibangun dengan React, Vite, Tailwind CSS, dan PostgreSQL.