-- Cendekia CBT — skema PostgreSQL (idempoten)
CREATE TABLE IF NOT EXISTS pengguna (
  id               SERIAL PRIMARY KEY,
  nama             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  nis              TEXT UNIQUE,
  kata_sandi_hash  TEXT NOT NULL,
  peran            TEXT NOT NULL CHECK (peran IN ('admin','guru','siswa')),
  kelas            TEXT,
  gender           TEXT CHECK (gender IN ('L','P')),
  aktif            BOOLEAN NOT NULL DEFAULT TRUE,
  terakhir_masuk   TIMESTAMPTZ,
  dibuat_pada      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mapel (
  id      SERIAL PRIMARY KEY,
  nama    TEXT NOT NULL UNIQUE,
  kode    TEXT NOT NULL UNIQUE,
  warna   TEXT NOT NULL DEFAULT '#7C5CFF',
  guru    TEXT
);

CREATE TABLE IF NOT EXISTS soal (
  id           SERIAL PRIMARY KEY,
  mapel_id     INTEGER NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
  tipe         TEXT NOT NULL CHECK (tipe IN ('pilihan_ganda','benar_salah','isian','esai')),
  pertanyaan   TEXT NOT NULL,
  opsi         JSONB NOT NULL DEFAULT '[]'::jsonb,
  kunci        TEXT,
  pembahasan   TEXT,
  tingkat      TEXT NOT NULL DEFAULT 'sedang' CHECK (tingkat IN ('mudah','sedang','sulit')),
  bobot        NUMERIC(5,2) NOT NULL DEFAULT 1,
  topik        TEXT,
  dibuat_oleh  INTEGER REFERENCES pengguna(id) ON DELETE SET NULL,
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now(),
  diubah_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_soal_mapel ON soal(mapel_id);
CREATE INDEX IF NOT EXISTS idx_soal_tingkat ON soal(tingkat);

CREATE TABLE IF NOT EXISTS ujian (
  id                 SERIAL PRIMARY KEY,
  judul              TEXT NOT NULL,
  mapel_id           INTEGER NOT NULL REFERENCES mapel(id) ON DELETE CASCADE,
  deskripsi          TEXT,
  durasi_menit       INTEGER NOT NULL DEFAULT 60 CHECK (durasi_menit > 0),
  token              TEXT NOT NULL,
  mulai_pada         TIMESTAMPTZ NOT NULL,
  selesai_pada       TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf','terbit','ditutup')),
  acak_soal          BOOLEAN NOT NULL DEFAULT TRUE,
  acak_opsi          BOOLEAN NOT NULL DEFAULT FALSE,
  tampil_pembahasan  BOOLEAN NOT NULL DEFAULT TRUE,
  kkm                NUMERIC(5,2) NOT NULL DEFAULT 70,
  batas_percobaan    INTEGER NOT NULL DEFAULT 1,
  kelas_target       TEXT[] NOT NULL DEFAULT '{}',
  dibuat_oleh        INTEGER REFERENCES pengguna(id) ON DELETE SET NULL,
  dibuat_pada        TIMESTAMPTZ NOT NULL DEFAULT now(),
  diubah_pada        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (selesai_pada > mulai_pada)
);
CREATE INDEX IF NOT EXISTS idx_ujian_status ON ujian(status);

CREATE TABLE IF NOT EXISTS ujian_soal (
  ujian_id  INTEGER NOT NULL REFERENCES ujian(id) ON DELETE CASCADE,
  soal_id   INTEGER NOT NULL REFERENCES soal(id) ON DELETE CASCADE,
  urutan    INTEGER NOT NULL DEFAULT 0,
  bobot     NUMERIC(5,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (ujian_id, soal_id)
);
CREATE INDEX IF NOT EXISTS idx_ujian_soal_urutan ON ujian_soal(ujian_id, urutan);

CREATE TABLE IF NOT EXISTS percobaan (
  id               SERIAL PRIMARY KEY,
  ujian_id         INTEGER NOT NULL REFERENCES ujian(id) ON DELETE CASCADE,
  pengguna_id      INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  mulai_pada       TIMESTAMPTZ NOT NULL DEFAULT now(),
  batas_pada       TIMESTAMPTZ NOT NULL,
  selesai_pada     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'berlangsung' CHECK (status IN ('berlangsung','selesai')),
  urutan           JSONB NOT NULL DEFAULT '[]'::jsonb,
  nilai            NUMERIC(5,2),
  benar            INTEGER NOT NULL DEFAULT 0,
  salah            INTEGER NOT NULL DEFAULT 0,
  kosong           INTEGER NOT NULL DEFAULT 0,
  perlu_penilaian  BOOLEAN NOT NULL DEFAULT FALSE,
  fokus_hilang     INTEGER NOT NULL DEFAULT 0,
  perangkat        TEXT,
  dibuat_pada      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_percobaan_ujian ON percobaan(ujian_id);
CREATE INDEX IF NOT EXISTS idx_percobaan_peserta ON percobaan(pengguna_id);
CREATE INDEX IF NOT EXISTS idx_percobaan_status ON percobaan(status);

CREATE TABLE IF NOT EXISTS jawaban (
  id            SERIAL PRIMARY KEY,
  percobaan_id  INTEGER NOT NULL REFERENCES percobaan(id) ON DELETE CASCADE,
  soal_id       INTEGER NOT NULL REFERENCES soal(id) ON DELETE CASCADE,
  isi           TEXT,
  ragu          BOOLEAN NOT NULL DEFAULT FALSE,
  skor          NUMERIC(4,3),
  catatan       TEXT,
  dinilai_oleh  INTEGER REFERENCES pengguna(id) ON DELETE SET NULL,
  diubah_pada   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (percobaan_id, soal_id)
);
CREATE INDEX IF NOT EXISTS idx_jawaban_percobaan ON jawaban(percobaan_id);

CREATE TABLE IF NOT EXISTS aktivitas (
  id           SERIAL PRIMARY KEY,
  pengguna_id  INTEGER REFERENCES pengguna(id) ON DELETE SET NULL,
  aksi         TEXT NOT NULL,
  keterangan   TEXT NOT NULL,
  warna        TEXT NOT NULL DEFAULT '#22D3EE',
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aktivitas_waktu ON aktivitas(dibuat_pada DESC);

-- Penghapusan lunak: data tetap utuh sehingga aksi hapus dapat dibatalkan (undo).
ALTER TABLE soal      ADD COLUMN IF NOT EXISTS dihapus_pada TIMESTAMPTZ;
ALTER TABLE ujian     ADD COLUMN IF NOT EXISTS dihapus_pada TIMESTAMPTZ;
ALTER TABLE pengguna  ADD COLUMN IF NOT EXISTS dihapus_pada TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_soal_aktif ON soal(dihapus_pada);
CREATE INDEX IF NOT EXISTS idx_ujian_aktif ON ujian(dihapus_pada);

-- Identitas sekolah satu sumber (white-label). Nilai bawaan berasal dari environment;
-- baris di sini menimpanya bila administrator mengubah lewat antarmuka.
CREATE TABLE IF NOT EXISTS pengaturan (
  kunci        TEXT PRIMARY KEY,
  nilai        TEXT NOT NULL,
  diubah_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mata pelajaran milik sebuah jenjang: nama/kode boleh sama antar jenjang
-- (mis. "Matematika" SD dan SMA) tetapi unik di dalam jenjang yang sama.
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS jenjang TEXT;
UPDATE mapel SET jenjang = COALESCE((SELECT nilai FROM pengaturan WHERE kunci='jenjang'), 'SMP') WHERE jenjang IS NULL;
ALTER TABLE mapel ALTER COLUMN jenjang SET DEFAULT 'SMP';
ALTER TABLE mapel ALTER COLUMN jenjang SET NOT NULL;
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS dihapus_pada TIMESTAMPTZ;
ALTER TABLE mapel DROP CONSTRAINT IF EXISTS mapel_nama_key;
ALTER TABLE mapel DROP CONSTRAINT IF EXISTS mapel_kode_key;
CREATE UNIQUE INDEX IF NOT EXISTS mapel_jenjang_nama_uniq ON mapel(jenjang, nama) WHERE dihapus_pada IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mapel_jenjang_kode_uniq ON mapel(jenjang, kode) WHERE dihapus_pada IS NULL;
CREATE INDEX IF NOT EXISTS idx_mapel_jenjang ON mapel(jenjang);

-- Relasi guru pengampu -> akun pengguna. Kolom `guru` (teks) tetap dipakai untuk
-- tampilan nama; `guru_id` menjadi sumber kebenaran pembatasan data guru per mapel.
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS guru_id INTEGER REFERENCES pengguna(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mapel_guru ON mapel(guru_id);
UPDATE mapel m
SET guru_id = p.id
FROM pengguna p
WHERE m.guru_id IS NULL
  AND m.guru IS NOT NULL
  AND p.peran = 'guru'
  AND p.dihapus_pada IS NULL
  AND lower(trim(p.nama)) = lower(trim(m.guru));

-- Rombongan belajar (kelas) tambahan yang dikelola administrator per jenjang.
-- Kelas bawaan jenjang tetap dihitung dari server/lib/jenjang.js (kelasUntuk);
-- baris di sini DIGABUNGKAN dengan kelas bawaan sehingga keduanya tersedia.
CREATE TABLE IF NOT EXISTS rombel (
  id           SERIAL PRIMARY KEY,
  jenjang      TEXT NOT NULL,
  nama         TEXT NOT NULL,
  urutan       INTEGER NOT NULL DEFAULT 0,
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jenjang, nama)
);
CREATE INDEX IF NOT EXISTS idx_rombel_jenjang ON rombel(jenjang);

-- Lampiran media pada butir soal. Bentuk tiap elemen:
--   { jenis: 'gambar'|'audio'|'video', media_id?: int, url?: text,
--     alt?: text, nama?: text }
-- `media_id` menunjuk berkas yang diunggah ke server; `url` dipakai untuk
-- tautan eksternal (YouTube, Drive, dsb.). Lampiran per opsi jawaban disimpan
-- di dalam JSONB `opsi` dengan bentuk yang sama.
ALTER TABLE soal ADD COLUMN IF NOT EXISTS lampiran JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Berkas media yang diunggah. Berkas fisik disimpan di MEDIA_DIR
-- (bawaan: server/uploads) dengan nama acak; kolom nama_simpan tidak pernah
-- memuat path sehingga aman dari path traversal.
CREATE TABLE IF NOT EXISTS media (
  id           SERIAL PRIMARY KEY,
  nama_asli    TEXT NOT NULL,
  nama_simpan  TEXT NOT NULL UNIQUE,
  mime         TEXT NOT NULL,
  jenis        TEXT NOT NULL CHECK (jenis IN ('gambar','audio','video')),
  ukuran       INTEGER NOT NULL,
  dibuat_oleh  INTEGER REFERENCES pengguna(id) ON DELETE SET NULL,
  dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_jenis ON media(jenis);