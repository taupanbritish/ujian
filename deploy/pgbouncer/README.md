# PgBouncer untuk ShanaTech CBT

PgBouncer adalah connection pooler di depan PostgreSQL. Aplikasi membuka koneksi
ke PgBouncer, lalu PgBouncer meminjamkan sejumlah kecil koneksi nyata ke PostgreSQL.

## Kapan dibutuhkan

`pg.Pool` di aplikasi **sudah** memakai ulang koneksi (tidak membuka koneksi baru
per request). PgBouncer diperlukan ketika:

- peserta serentak **> 500** dan/atau API dijalankan beberapa proses (cluster/PM2),
  sehingga total `DATABASE_POOL_MAX × jumlah proses` mendekati `max_connections`
  PostgreSQL;
- sering ada deploy/restart yang membuat banyak koneksi dibuat ulang;
- database cloud membatasi jumlah koneksi (mis. paket kecil Neon/Supabase).

Perkiraan total koneksi tanpa PgBouncer:

```
total_koneksi = DATABASE_POOL_MAX × DATABASE_APP_INSTANCES
```

Contoh: 4 proses × 10 = 40 koneksi ke PostgreSQL. Dengan PgBouncer, keempat proses
tetap membuka 40 koneksi klien, tetapi PgBouncer hanya memakai `default_pool_size`
(20) koneksi nyata ke PostgreSQL.

## Instalasi (Debian/Ubuntu)

```bash
sudo apt install pgbouncer
sudo cp deploy/pgbouncer/pgbouncer.ini      /etc/pgbouncer/pgbouncer.ini
sudo cp deploy/pgbouncer/userlist.txt.example /etc/pgbouncer/userlist.txt
sudo chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt
sudo chmod 600 /etc/pgbouncer/userlist.txt
sudo systemctl enable --now pgbouncer
```

Sesuaikan `[databases]`, `listen_addr`, dan angka pool di `pgbouncer.ini`.
Ambil verifier sandi dari PostgreSQL:

```bash
psql "postgresql://.../cendekia" -Atc \
  "SELECT usename, passwd FROM pg_shadow WHERE usename='cendekia'"
```

Tempel hasilnya ke `userlist.txt` (format `"cendekia" "SCRAM-SHA-256$..."`).

## Mengarahkan aplikasi

```dotenv
DATABASE_URL=postgresql://cendekia:SANDI@127.0.0.1:6432/cendekia
DATABASE_PGBOUNCER=true
DATABASE_POOL_MAX=10
DATABASE_APP_INSTANCES=4
```

- `DATABASE_POOL_MAX` kini berarti koneksi **ke PgBouncer**, bukan ke PostgreSQL.
- `DATABASE_PGBOUNCER=true` melewati pemeriksaan `max_connections` saat start
  (mode transaction tidak menjamin sesi yang sama).
- Migrasi dan seeder tetap bisa lewat PgBouncer: `schema.sql` hanya DDL biasa.
  Bila kelak ada `CREATE INDEX CONCURRENTLY`, jalankan langsung ke port 5432.

## Ukuran pool

| Komponen | Patokan |
|---|---|
| `default_pool_size` (PgBouncer → PostgreSQL) | 2–4 × vCPU server database |
| `max_db_connections` | `default_pool_size` + reserve, ≤ 80% `max_connections` |
| `max_client_conn` | `DATABASE_POOL_MAX × jumlah proses` + margin |
| `DATABASE_POOL_MAX` (aplikasi → PgBouncer) | 10–20 per proses |

Contoh server database 4 vCPU / 8 GB: `default_pool_size = 16`, `max_db_connections = 40`,
aplikasi 4 proses × 10 = 40 klien, `max_client_conn = 600`.

## Pemeriksaan

```bash
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "SHOW STATS;"
```

Yang perlu dipantau: `cl_waiting` (klien menunggu koneksi; bila terus > 0, naikkan
`default_pool_size` atau turunkan jumlah proses), `sv_active` (koneksi sibuk), dan
`avg_wait_time`. Endpoint `/api/kesehatan` aplikasi juga menampilkan `pool.total`,
`pool.menganggur`, dan `pool.menunggu` dari sisi Node.

## Catatan mode transaction

Aplikasi ini tidak memakai `LISTEN/NOTIFY`, advisory lock, temporary table, atau
`SET` sesi, sehingga aman dengan `pool_mode = transaction`. `node-postgres` memakai
prepared statement tanpa nama; biarkan `max_prepared_statements = 0`.

## Kembali tanpa PgBouncer

Arahkan `DATABASE_URL` kembali ke port 5432 dan hapus `DATABASE_PGBOUNCER`.
Tidak ada perubahan skema atau data.
