# GAIN (Niaga Koin)

Platform trading kripto otomatis — **mode paper trading (simulasi) secara default**. Live trading dinonaktifkan permanen sampai ada persetujuan eksplisit, audit keamanan, dan kejelasan hukum/regulasi. Lihat `PROJECT_STATUS.md` untuk status proyek lengkap dan `IMPLEMENTATION_PLAN.md` untuk rencana per fase.

## Prasyarat

- Node.js 22+ dan npm 10+
- Docker + Docker Compose (untuk PostgreSQL lokal) **atau** PostgreSQL 16 terpasang lokal
- macOS/Linux (dikembangkan dan diuji untuk dijalankan lokal di MacBook)

## Instalasi

```bash
# 1. Install dependency backend
cd backend && npm install

# 2. Install dependency frontend
cd ../frontend && npm install
```

## Konfigurasi Environment

```bash
cd backend
cp ../.env.example .env
# Edit backend/.env sesuai kebutuhan lokal Anda (nilai default sudah cocok
# dengan docker-compose.yml di bawah).
```

`backend/.env` tidak pernah di-commit (lihat `.gitignore`). `LIVE_TRADING_ENABLED` **wajib** `false` — aplikasi akan menolak untuk start jika diset `true` (lihat `backend/src/config/env.validation.ts`).

```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL default sudah cocok untuk backend lokal di atas.
```

## Menyalakan Database

```bash
docker compose up -d
```

Ini menjalankan PostgreSQL 16 di `localhost:5432` (kredensial: `gain_dev` / `gain_dev_local`, database `gain_dev`), hanya bind ke `127.0.0.1` (tidak diekspos ke jaringan).

Jika Anda sudah punya PostgreSQL lokal tanpa Docker, buat database secara manual:

```bash
createuser gain_dev --pwprompt
createdb gain_dev --owner=gain_dev
```

## Migration

```bash
cd backend
npx prisma migrate deploy   # menerapkan migration yang sudah ada
# atau, saat mengembangkan skema baru:
npx prisma migrate dev
```

## Menjalankan Backend

```bash
cd backend
npm run start:dev
```

Backend berjalan di `http://localhost:3000`. Cek kesehatan sistem:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"...","database":"ok","tradingMode":"paper-only","liveTradingEnabled":false}
```

## Mencoba Alur Autentikasi (Fase 2)

Backend belum punya provider OTP nyata (SMS/email) — kode OTP dev muncul di log terminal backend.

```bash
# 1. Registrasi
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"anda@example.com","password":"password123"}'
# -> {"userId":"...", "status":"pending_verification", "registrationToken":"..."}
# Cari baris log backend: "[DEV OTP ...] code=XXXXXX"

# 2. Verifikasi OTP (pakai registrationToken dari langkah 1)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Authorization: Bearer <registrationToken>" \
  -H "Content-Type: application/json" \
  -d '{"code":"XXXXXX"}'

# 3. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anda@example.com","password":"password123"}'
# -> {"accessToken":"...", "refreshToken":"..."}

# 4. Panggil endpoint terproteksi
curl http://localhost:3000/api/v1/users/me -H "Authorization: Bearer <accessToken>"
```

Detail lengkap tiap endpoint (rate limit, aturan lockout, dll.) ada di `API_CONTRACT.md`.

## Mencoba Market Data (Fase 3)

```bash
curl http://localhost:3000/api/v1/market-data/symbols
curl http://localhost:3000/api/v1/market-data/ticker/BTCUSDT
curl "http://localhost:3000/api/v1/market-data/candles/BTCUSDT?interval=1h&limit=10"
```

**Penting:** endpoint ini benar-benar memanggil Binance (`api.binance.com`) dari mesin Anda. Kalau mendapat `503`, itu berarti backend tidak bisa menjangkau Binance (bukan bug kode) — cek dulu dengan `curl https://api.binance.com/api/v3/ping` di luar aplikasi untuk memastikan koneksi internet/firewall Anda mengizinkannya.

## Menghubungkan Akun Exchange (Fase 4a)

```bash
curl -X POST http://localhost:3000/api/v1/exchange-accounts \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"exchangeName":"binance","apiKey":"<api-key-anda>","apiSecret":"<api-secret-anda>"}'
```

Gunakan API key **trade-only** (tanpa izin withdrawal) — key dengan izin withdrawal akan selalu ditolak (`422`). Sama seperti market data, endpoint ini benar-benar memanggil Binance dari mesin Anda; `503` berarti Binance tidak terjangkau, bukan bug.

```bash
curl http://localhost:3000/api/v1/exchange-accounts -H "Authorization: Bearer <accessToken>"          # daftar koneksi Anda
curl -X DELETE http://localhost:3000/api/v1/exchange-accounts/<id> -H "Authorization: Bearer <accessToken>"  # putuskan koneksi
```

## Mencoba Paper Trading (Fase 4b)

Saldo virtual (10.000 USDT default) dibuat otomatis saat pertama diakses — **tidak perlu** menghubungkan akun exchange dulu.

```bash
# Lihat wallet (saldo + posisi)
curl http://localhost:3000/api/v1/wallet -H "Authorization: Bearer <accessToken>"

# Beli 0.01 BTC (market order — selalu 201, cek "status" di body: "filled" atau "rejected")
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"buy","quantity":0.01}'

# Jual kembali
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","side":"sell","quantity":0.01}'

# Riwayat order
curl http://localhost:3000/api/v1/orders -H "Authorization: Bearer <accessToken>"

# Reset saldo ke default & hapus semua posisi (aksi ireversibel)
curl -X POST http://localhost:3000/api/v1/wallet/reset -H "Authorization: Bearer <accessToken>"
```

Order butuh harga dari Binance (lewat Market Data, Fase 3) — kalau `status` yang kembali adalah `"rejected"` dengan `rejectReason: "MARKET_DATA_UNAVAILABLE"`, itu berarti backend tidak bisa menjangkau Binance saat itu (fail-safe yang disengaja, saldo Anda tidak tersentuh) — cek koneksi internet Anda.

## Mengelola & Menjalankan Bot (Fase 5a + 5b)

`parameters` RSI: `period` (2-100, default 14), `oversold` (1-49, default 30), `overbought` (51-99, default 70, harus > oversold) — rentang PROPOSED, lihat `API_CONTRACT.md`. `riskLimits.maxPositionUsdt` wajib angka positif.

```bash
# Buat bot baru (selalu mulai berstatus "stopped"; parameters/riskLimits divalidasi semantik — FR-STRAT-002/FR-RISK-001)
curl -X POST http://localhost:3000/api/v1/bots \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"BTC Trend Scalper","symbol":"BTCUSDT","strategyType":"rsi","parameters":{"period":14,"oversold":30,"overbought":70},"riskLimits":{"maxPositionUsdt":500}}'

curl http://localhost:3000/api/v1/bots -H "Authorization: Bearer <accessToken>"                       # daftar bot Anda
curl -X PATCH http://localhost:3000/api/v1/bots/<id>/start -H "Authorization: Bearer <accessToken>"    # jalankan
curl -X PATCH http://localhost:3000/api/v1/bots/<id>/pause -H "Authorization: Bearer <accessToken>"    # jeda (harus dari status active)
curl -X PATCH http://localhost:3000/api/v1/bots/<id>/stop -H "Authorization: Bearer <accessToken>"     # hentikan
curl -X DELETE http://localhost:3000/api/v1/bots/<id> -H "Authorization: Bearer <accessToken>"         # hapus (harus berstatus stopped, kalau tidak → 409)

# Jalankan satu siklus Strategy Engine -> Risk Engine -> paper order (bot harus "active"; trigger manual saja, belum ada penjadwalan otomatis)
curl -X POST http://localhost:3000/api/v1/bots/<id>/evaluate -H "Authorization: Bearer <accessToken>"
# -> {"botId","signal":"buy"|"sell"|"hold","indicator","indicatorValue","executed":bool,"blockedReason":"MARKET_DATA_UNAVAILABLE"|"MAX_POSITION_EXCEEDED"|"NO_OPEN_POSITION"|null,"order"}
```

## Menjalankan Frontend

```bash
cd frontend
npm run dev
```

Frontend berjalan di `http://localhost:5173` (butuh backend berjalan di `http://localhost:3000`, lihat bagian sebelumnya). Kunjungan pertama otomatis redirect ke `/login` — daftar lewat `/register` (kode OTP muncul di log terminal **backend**, bukan email sungguhan — dev-only, lihat bagian "Mencoba Alur Autentikasi" di atas), verifikasi di `/verify-otp`, lalu masuk. Setelah login, Dashboard tampil dengan **saldo dan daftar bot nyata** dari backend Anda (bukan data contoh lagi sejak Fase 6b) — akun baru akan menampilkan saldo default 10,000.00 USDT dan "Belum ada bot" sampai Anda membuat satu lewat curl (lihat bagian "Mengelola & Menjalankan Bot" di atas — belum ada wizard buat-bot di UI). Tombol start/pause/stop di kartu bot dan tombol Reset Saldo semuanya memanggil API sungguhan. Tombol avatar di header untuk logout.

## Menjalankan Test

```bash
# Backend
cd backend
npm run lint
npm run typecheck
npm test              # unit test
npm run test:e2e      # integration test (butuh database aktif)
npm run build          # build production

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test               # unit/component test
npm run build          # build production
```

## Menghentikan & Mereset Environment Development

```bash
# Hentikan backend/frontend: Ctrl+C pada masing-masing proses

# Hentikan database (data tetap tersimpan di volume Docker)
docker compose stop

# Reset total database (menghapus seluruh data lokal)
docker compose down -v
```

## Troubleshooting

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Backend gagal start, error `Missing required environment variables: DATABASE_URL` | `backend/.env` belum dibuat/salah | `cp .env.example backend/.env`, sesuaikan `DATABASE_URL` |
| Backend gagal start, error `LIVE_TRADING_ENABLED=true is not permitted` | Variabel live trading sengaja/tidak sengaja diaktifkan | Set `LIVE_TRADING_ENABLED=false` — ini penegakan aturan keselamatan finansial, bukan bug |
| Backend gagal start, error `Missing required environment variables: ... JWT_ACCESS_SECRET` | `.env` dibuat sebelum Fase 2 (belum ada variabel JWT) | Salin ulang dari `.env.example` terbaru, atau tambahkan `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` manual |
| `POST /auth/login` selalu `401` walau password benar | Akun belum diverifikasi OTP, atau terkunci sementara (5x gagal) | Selesaikan `verify-otp` dulu; jika terkunci, tunggu `LOGIN_LOCKOUT_MINUTES` (default 15 menit) |
| `POST /auth/register` mengembalikan `500` | Kemungkinan migration Prisma belum diterapkan (`OtpChallenge`/kolom baru belum ada) | Jalankan `npx prisma migrate deploy` |
| `GET /api/v1/health` mengembalikan `503` | Database tidak menyala atau `DATABASE_URL` salah | Pastikan `docker compose up -d` berjalan dan port 5432 dapat diakses |
| Port 5432/3000/5173 sudah dipakai | Proses lain sedang berjalan | Hentikan proses lama atau ubah port di `.env`/`vite.config.ts` |
| `npx prisma migrate dev` gagal konek | Database belum siap saat migration dijalankan | Tunggu healthcheck `docker compose ps` menunjukkan status `healthy`, lalu ulangi |
| `GET /market-data/ticker/{symbol}` mengembalikan `503` | Backend tidak bisa menjangkau Binance (firewall/proxy/internet mati) | Cek `curl https://api.binance.com/api/v3/ping` di luar aplikasi; ini bukan bug kode — ini fail-safe yang disengaja saat exchange tak terjangkau |
| `GET /market-data/ticker/{symbol}` mengembalikan `400` | Symbol di luar whitelist `MARKET_DATA_SUPPORTED_SYMBOLS` | Cek `GET /market-data/symbols` untuk daftar yang didukung, atau tambahkan symbol ke env tersebut |
| Backend gagal start, error `Missing required environment variable: CREDENTIALS_ENCRYPTION_KEY` | `.env` dibuat sebelum Fase 4a | Salin ulang dari `.env.example` terbaru, atau tambahkan `CREDENTIALS_ENCRYPTION_KEY` manual |
| `POST /exchange-accounts` mengembalikan `503` | Backend tidak bisa menjangkau Binance untuk memvalidasi API key | Sama seperti market data — cek `curl https://api.binance.com/api/v3/ping`; API key TIDAK disimpan sampai berhasil tervalidasi |
| `POST /exchange-accounts` mengembalikan `422 INVALID_PERMISSION_SCOPE` | API key yang dipakai punya izin withdrawal aktif | Buat API key baru di Binance dengan izin **trade-only** saja (nonaktifkan izin withdrawal) |
| `POST /orders` mengembalikan `201` tapi `status:"rejected", rejectReason:"MARKET_DATA_UNAVAILABLE"` | Backend tidak bisa menjangkau Binance untuk mengambil harga | Ini bukan bug — order memang selalu `201`, hasilnya ada di `status`/`rejectReason`. Cek koneksi internet, lalu coba lagi |
| `POST /orders` mengembalikan `rejected, INSUFFICIENT_BALANCE` padahal saldo terlihat cukup | Fee + slippage membuat total biaya sedikit lebih tinggi dari notional murni | Perbesar sedikit saldo (via reset) atau kecilkan quantity — ini validasi yang benar, bukan bug |
| `POST /orders` mengembalikan `400` | Symbol di luar whitelist, atau quantity ≤ 0 setelah dibulatkan ke `PAPER_TRADING_QUANTITY_PRECISION` | Cek `GET /market-data/symbols`, atau perbesar quantity |
| `POST /bots` mengembalikan `400` "Batas jumlah bot tercapai" | Sudah mencapai `MAX_BOTS_PER_USER` (default 10) | Hapus bot yang tidak dipakai (harus `stopped` dulu), atau naikkan `MAX_BOTS_PER_USER` di `.env` |
| `PATCH /bots/{id}/pause` mengembalikan `400` | Bot belum berstatus `active` (mis. masih `stopped`) | `pause` hanya valid dari `active` — panggil `start` dulu |
| `DELETE /bots/{id}` mengembalikan `409` | Bot masih `active`/`paused` | Panggil `PATCH .../stop` dulu, baru hapus |
| `POST /bots` mengembalikan `400` "Parameter 'period'/'oversold'/'overbought' RSI harus..." | `parameters` di luar rentang valid (FR-STRAT-002) | Cek rentang di `API_CONTRACT.md` (`period` 2-100, `oversold` 1-49, `overbought` 51-99, `oversold` < `overbought`) |
| `POST /bots` mengembalikan `400` "riskLimits.maxPositionUsdt wajib diisi..." | `riskLimits.maxPositionUsdt` kosong/0/negatif (FR-RISK-001) | Isi dengan angka USDT positif, mis. `{"maxPositionUsdt":500}` |
| `POST /bots/{id}/evaluate` mengembalikan `400` | Bot belum berstatus `active` | Panggil `PATCH .../start` dulu |
| `POST /bots/{id}/evaluate` mengembalikan `200` dengan `blockedReason:"MARKET_DATA_UNAVAILABLE"` | Backend tidak bisa menjangkau Binance untuk candle | Ini bukan bug — fail-safe yang sama seperti market data/paper trading. Cek `curl https://api.binance.com/api/v3/ping` |
| `POST /bots/{id}/evaluate` mengembalikan `200` dengan `blockedReason:"MAX_POSITION_EXCEEDED"` | Posisi `userId+symbol` saat ini sudah mencapai/melebihi `riskLimits.maxPositionUsdt` bot | Ini Risk Engine bekerja sesuai desain, bukan bug — perbesar `maxPositionUsdt` atau kurangi posisi lewat `POST /orders` (sell) |
| `POST /bots/{id}/evaluate` mengembalikan `200` dengan `blockedReason:"NO_OPEN_POSITION"` | Sinyal `sell` muncul tapi tidak ada posisi `userId+symbol` untuk ditutup | Ini bukan bug — beli dulu (manual lewat `POST /orders` atau tunggu sinyal `buy`) sebelum sinyal `sell` bisa dieksekusi |
| Buka `http://localhost:5173/` langsung redirect ke `/login`, meski sudah pernah login | Sesi di `localStorage` browser kosong/beda browser/mode incognito | Ini bukan bug — login lagi. Sesi memang per-browser, tidak disinkronkan lintas perangkat |
| Frontend menampilkan "Failed to fetch" / network error saat login-register | Backend tidak berjalan, atau `VITE_API_BASE_URL` di `frontend/.env` tidak cocok dengan port backend | Pastikan `cd backend && npm run start:dev` aktif; cek `frontend/.env` |
| Kode OTP tidak pernah sampai ke halaman `/verify-otp` | Wajar — OTP dev-only dicatat di **log terminal backend**, bukan dikirim ke email sungguhan (belum ada provider nyata, lihat Fase 7) | Cek terminal tempat `npm run start:dev` berjalan, cari baris `[DEV OTP ...] destination=... code=...` |
| Refresh halaman `/verify-otp` redirect balik ke `/register` | Disengaja — `registrationToken` cuma ada di router state (tidak disimpan), dan token backend memang berumur pendek (~5 menit) | Daftar ulang untuk mendapat kode/token baru |
| Dashboard menampilkan "Belum ada bot" padahal sudah ada bot | Bot dibuat lewat curl/user lain, atau belum di-refresh setelah membuat bot baru | Refresh halaman — belum ada auto-refresh/polling; bot juga difilter per pengguna yang login (lihat isolasi `userId` di `API_CONTRACT.md`) |
| Tombol start/pause/stop di kartu bot tidak merespons | Backend sedang memproses (tombol disabled sementara saat aksi berlangsung) atau backend tidak terjangkau | Tunggu sebentar; kalau tetap tidak berubah, cek console browser dan pastikan backend berjalan |

## Struktur Proyek

```
backend/    NestJS + Prisma + PostgreSQL — API modular monolith
frontend/   React + TypeScript + Vite + Tailwind — replikasi desain Stitch
docs/       Dokumen sumber (PRD/SRS/SDD) dan referensi desain UI/UX
```

## Dokumen Lain

- `PROJECT_STATUS.md` — ringkasan proyek lintas-fase
- `IMPLEMENTATION_PLAN.md` — rencana per fase
- `FEATURE_MATRIX.md` — status implementasi per fitur
- `API_CONTRACT.md` — kontrak endpoint `/api/v1/*`
- `CHANGELOG.md` — riwayat perubahan per fase
