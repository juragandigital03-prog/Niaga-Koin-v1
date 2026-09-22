# CHANGELOG — GAIN (Niaga Koin)

Format: setiap entri merepresentasikan satu fase kerja (bukan setiap commit kecil).

## [Fase 4a] Exchange Account Connection — 2026-09-22
### Ditambahkan
- `CredentialsEncryptionService` (`backend/src/common/crypto/`) — AES-256-GCM, kunci dari `CREDENTIALS_ENCRYPTION_KEY` (hash SHA-256 dari passphrase apa pun → kunci 32-byte). Aplikasi menolak start tanpa variabel ini (diverifikasi manual: pesan error eksplisit, bukan crash tak jelas).
- `ExchangeAdapter` interface + `BinanceExchangeAdapter` — signed request HMAC-SHA256 ke `GET /api/v3/account` Binance untuk memvalidasi API key & membaca `canTrade`/`canWithdraw`. Auth ditolak (`400`/`401`) gagal cepat tanpa buang retry; kegagalan jaringan tetap retry lalu `503`.
- `ExchangeService` + `POST/GET/DELETE /api/v1/exchange-accounts` — BR-KEY-001 ditegakkan (key `canWithdraw=true` selalu `422 INVALID_PERMISSION_SCOPE`, tidak pernah disimpan); kredensial tidak valid → `400 INVALID_CREDENTIALS`; exchange tak terjangkau → `503`; query difilter `userId` di WHERE clause (bukan post-hoc check).
- Model Prisma baru: `ExchangeAccount`, `ApiCredential` (migration `exchange_accounts`).
- Env baru: `CREDENTIALS_ENCRYPTION_KEY`, `EXCHANGE_REQUEST_TIMEOUT_MS`, `EXCHANGE_MAX_RETRIES`.

### Refactor Kecil (bukan fitur baru)
- `fetchJsonWithRetry` dan error kegagalan upstream dipindah dari `market-data/fetch-with-retry.ts` ke `common/http/fetch-with-retry.ts` + `common/http/upstream-unavailable.error.ts` (nama digeneralisasi dari `MarketDataUnavailableError` ke `UpstreamUnavailableError`) — dipakai bersama oleh Market Data dan Exchange, menghindari dua implementasi retry/timeout yang nyaris identik. Ditambah dukungan `isNonRetryableStatus` untuk kasus seperti 401 (auth ditolak — retry tidak akan pernah berhasil, beda dengan kegagalan jaringan sementara).

### Keterbatasan Diketahui (konsisten dengan Fase 3, didokumentasikan bukan disembunyikan)
- Konektivitas Binance sungguhan untuk `checkPermissions` **tidak diverifikasi di sesi ini** — sandbox pengembangan memblokir egress ke `api.binance.com`. Diuji penuh lewat unit test (mock fetch, termasuk verifikasi bahwa secret tidak pernah masuk ke URL) dan e2e test (fake `ExchangeAdapter` ter-inject). Pengguna wajib verifikasi manual di mesin sendiri.

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, warning `no-explicit-any` di file test saja), `npx jest` PASS (60/60 unit test, +19 baru: enkripsi 6, Binance adapter 5, ExchangeService 7, retry-helper +2 untuk `isNonRetryableStatus`), `npx jest --config test/jest-e2e.json` PASS (17/17 e2e test, +6 baru: connect/list/disconnect penuh, tolak izin withdrawal, tolak kredensial tidak valid, tolak exchange tidak didukung, isolasi antar-user, wajib auth), `npx nest build` PASS.
- Smoke test manual: (1) boot tanpa `CREDENTIALS_ENCRYPTION_KEY` → aplikasi gagal start dengan pesan error eksplisit; (2) alur register→verify→login→connect exchange lengkap via curl — `POST /exchange-accounts` mengembalikan `503` (Binance tak terjangkau dari sandbox, perilaku fail-safe yang benar); (3) exchange tidak didukung (`okx`) → `400`; (4) tanpa token → `401`.

## [Fase 3] Market Data — 2026-09-22
### Ditambahkan
- `MarketDataProvider` interface (`backend/src/market-data/market-data-provider.interface.ts`) — subset read-only dari pola Exchange Adapter SDD §5.2, sengaja tidak termasuk `placeOrder`/`getBalance` (butuh API key pengguna, Fase 4).
- `BinanceMarketDataProvider` — Binance public REST (`/api/v3/ticker/price`, `/api/v3/klines`), tanpa API key.
- `fetchJsonWithRetry` — retry terbatas (default 2x, backoff 200/400/800ms) + timeout (default 5s) via `AbortController`. Gagal setelah retry habis → `MarketDataUnavailableError`, bukan hang atau data palsu.
- `MarketDataService` — validasi whitelist simbol (`MARKET_DATA_SUPPORTED_SYMBOLS`, default `BTCUSDT,ETHUSDT,SOLUSDT`) sebelum memanggil exchange sama sekali; validasi interval/limit candle; cache in-memory per simbol (TTL default 5 detik, bukan Redis — belum diperlukan skala MVP); memetakan kegagalan provider ke `503` (fail-safe).
- Endpoint baru: `GET /api/v1/market-data/symbols`, `GET /api/v1/market-data/ticker/{symbol}`, `GET /api/v1/market-data/candles/{symbol}?interval=&limit=` — publik, tanpa auth (bukan data milik pengguna).
- Env baru: `MARKET_DATA_SUPPORTED_SYMBOLS`, `MARKET_DATA_CACHE_TTL_MS`, `MARKET_DATA_REQUEST_TIMEOUT_MS`, `MARKET_DATA_MAX_RETRIES`.

### Keterbatasan Diketahui (didokumentasikan, bukan disembunyikan)
- **Konektivitas Binance sungguhan TIDAK diverifikasi di sesi ini.** Sandbox pengembangan ini memblokir egress ke `api.binance.com` oleh kebijakan organisasi — dikonfirmasi eksplisit: `curl https://api.binance.com/api/v3/ping` mengembalikan `curl: (56) CONNECT tunnel failed, response 403` dengan pesan proxy "connect_rejected (organization policy)". Ini **bukan bug di kode GAIN** — ini pembatasan jaringan sandbox itu sendiri, tidak akan terjadi di MacBook pengguna dengan akses internet normal.
- Untuk tetap membuktikan logic benar tanpa akses jaringan nyata: unit test memakai `fetch` yang di-mock, e2e test memakai `MarketDataProvider` palsu yang di-inject (`overrideProvider`), dan smoke test manual membuktikan bahwa jalur kegagalan koneksi sungguhan (Binance tidak terjangkau) menghasilkan `503` yang benar — bukan crash atau hang.
- **Belum ada endpoint yang divalidasi lulus melawan Binance API sungguhan.** Pengguna wajib menjalankan `curl http://localhost:3000/api/v1/market-data/ticker/BTCUSDT` di mesin sendiri setelah `npm run start:dev` sebagai langkah verifikasi wajib sebelum fitur ini dianggap selesai divalidasi end-to-end — dicatat eksplisit di `FEATURE_MATRIX.md`, bukan diam-diam ditandai DONE tanpa syarat.
- WebSocket/streaming real-time (disebut di PRD/SDD) dan proses worker market data terpisah **belum dibangun** — REST + cache cukup untuk kebutuhan Fase 3 (belum ada consumer yang butuh streaming terus-menerus; Strategy Engine di Fase 5 adalah kandidat consumer pertama).

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, warning `no-explicit-any` di file test saja), `npx jest` PASS (40/40 unit test, +14 baru untuk market data), `npx jest --config test/jest-e2e.json` PASS (11/11 e2e test, +5 baru — simbol tidak didukung → 400, interval tidak valid → 400, outage provider → 503, melawan fake provider ter-inject), `npx nest build` PASS.
- Smoke test manual: server nyata di-boot, `GET /market-data/symbols` mengembalikan whitelist; `GET /market-data/ticker/BTCUSDT` mengembalikan `503` (karena Binance tak terjangkau dari sandbox ini — perilaku fail-safe yang benar, bukan bug); `GET /market-data/ticker/DOGEUSDT` (di luar whitelist) → `400`; interval tidak valid → `400`.

## [Fase 2] Authentication — 2026-09-22
### Ditambahkan
- `POST /api/v1/auth/register` — email + password, membuat user `pending_verification`, menerbitkan OTP 6-digit (di-hash sebelum disimpan) dan token registrasi sementara. Registrasi ulang untuk email yang sama & masih `pending_verification` berfungsi sebagai resend OTP.
- `POST /api/v1/auth/verify-otp` — dilindungi token registrasi (bukan access token — dua namespace token dipisah tegas via klaim `purpose`, ditegakkan di `JwtStrategy` dan `RegistrationTokenGuard`). Salah kode 3x atau kedaluwarsa → harus daftar ulang.
- `POST /api/v1/auth/login` — JWT access (15m) + refresh (7d, stateless — tabel revoke sengaja ditunda ke Fase 7). Lockout otomatis 5x gagal berturut-turut → kunci 15 menit.
- `GET /api/v1/users/me` — dilindungi `JwtAuthGuard`, tidak pernah mengembalikan `passwordHash`.
- Infrastruktur RBAC: `RolesGuard` + `@Roles()` decorator, siap dipakai endpoint admin (Fase 7).
- `OtpProvider` interface + `ConsoleOtpProvider` (dev-only — log kode ke terminal, bukan kirim nyata; provider SMS/email sungguhan belum dipilih).
- Rate limiting global (`@nestjs/throttler`, 60 req/menit) + override 10 req/menit pada seluruh endpoint auth.
- Model Prisma baru: `User.role`/`failedLoginAttempts`/`lockedUntil`, `OtpChallenge`. Migration `auth_fields`.
- Validasi input global (`ValidationPipe` whitelist+forbidNonWhitelisted) di `main.ts`.

### Ditunda (keputusan sadar, bukan celah)
- **2FA (FR-AUTH-003)** — Should Have di PRD, bukan Must Have. Ditunda ke Fase 7 (Pusat Keamanan) agar Fase 2 tetap satu vertical slice fokus pada Must-Have auth.
- **Refresh token revocation/session table** — tidak ada endpoint `POST /auth/refresh` di kontrak SDD untuk fase ini, jadi tabel penyimpanan sesi belum dibangun tanpa konsumen. Jadi bagian alami fitur Pusat Keamanan (mockup desain: daftar sesi + "putuskan sesi").
- **Registrasi via nomor telepon** — SRS mengizinkan "email dan/atau telepon", tapi SMS gateway belum dipilih (`OTP_PROVIDER=TBD`). Email saja untuk Fase 2, didokumentasikan bukan dihilangkan diam-diam.

### Bug Ditemukan & Diperbaiki (lewat e2e test, bukan lolos ke produksi)
- `ConfigService.get()` NestJS mengembalikan string mentah dari env var, bukan number — nilai `OTP_MAX_ATTEMPTS`/`LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`/`OTP_TTL_SECONDS` sempat dikirim sebagai string ke kolom Prisma bertipe `Int`, menyebabkan `PrismaClientValidationError` di endpoint register (HTTP 500). Diperbaiki dengan membungkus `Number(...)` di seluruh titik baca config numerik di `auth.service.ts`. Ditangkap oleh test e2e `auth.e2e-spec.ts`, bukan lolos ke smoke test manual.

### Pengujian (hasil pada sesi ini)
- Backend: `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, 6 warning `no-explicit-any` di file test — dapat diterima untuk test double), `npx jest` PASS (26/26 unit test), `npx jest --config test/jest-e2e.json` PASS (6/6 e2e test — health + auth penuh, melawan PostgreSQL nyata), `npx nest build` PASS.
- Smoke test manual end-to-end via curl: register → baca OTP dari log server → verify-otp → login → `GET /users/me` → berhasil. Reuse token registrasi di `/users/me` → `401` (ditolak, sesuai desain).
- Vulnerability audit dependency (`npm audit --omit=dev`): sisa kerentanan (`multer`, `qs`, `lodash` — transitif dari `@nestjs/platform-express`/`@nestjs/config`) butuh upgrade major NestJS v10→v12 (breaking change) — **tidak dilakukan sekarang** (di luar scope vertical slice ini), dicatat untuk Fase 8 (Hardening & QA).

## [Fase 1] Foundation — 2026-09-21
### Keputusan Dikonfirmasi
- Pengguna memilih "pakai default yang diusulkan" untuk seluruh blocker Fase 0 (lihat `PROJECT_STATUS.md` §5): stack sederhana (React+TS/NestJS/PostgreSQL, tanpa Go/Python/RabbitMQ/TimescaleDB/Vault dulu), exchange pertama Binance, saldo virtual awal 10,000 USDT, fitur whitelist withdrawal **dikeluarkan dari MVP** (default aman).

### Ditambahkan
- `backend/` — NestJS + TypeScript + Prisma modular monolith. `GET /api/v1/health` mengecek DB dan melaporkan status paper/live eksplisit. Kill switch keselamatan finansial di `env.validation.ts` — proses menolak boot jika `LIVE_TRADING_ENABLED=true`. Logging JSON terstruktur (pino) dengan redaction header sensitif. Helmet + CORS.
- Migration Prisma pertama (`init_users`) — model `User` minimal.
- `frontend/` — Vite + React + TypeScript + Tailwind. Token desain disalin verbatim dari Tailwind config yang di-generate Stitch (`code.html`) ke `tailwind.config.js`. Halaman Dashboard direplikasi sebagai komponen statis: `AppHeader`, `PaperModeBanner` (Live Trading tampil terkunci/disabled, bukan sekadar styling), `BalanceCard` (label eksplisit "Estimasi Saldo Virtual"), `BotList`, `ResetBalanceModal`. Data masih mock — belum terhubung API (rencana Fase 6).
- `docker-compose.yml` — PostgreSQL 16, bind `127.0.0.1` saja.
- `README.md` diperbarui — instruksi instalasi, konfigurasi env, migration, run backend/frontend, test, troubleshooting — seluruhnya diverifikasi benar-benar berjalan pada sesi ini.

### Pengujian (hasil pada sesi ini)
- Backend: `npm run lint` PASS, `npx tsc --noEmit` PASS, `npx jest` PASS (6/6 unit test, termasuk test kill-switch live trading), `npx jest --config test/jest-e2e.json` PASS (1/1, melawan PostgreSQL nyata), `npx nest build` PASS.
- Smoke test manual: server boot dan `curl /api/v1/health` mengembalikan `200` dengan `tradingMode: "paper-only"`; boot dengan `LIVE_TRADING_ENABLED=true` **gagal dengan error eksplisit** (perilaku yang diinginkan).
- Frontend: `npm run lint` PASS, `npx tsc --noEmit` PASS, `npx vitest run` PASS (9/9 test), `npm run build` PASS.
- Verifikasi visual: screenshot Playwright halaman Dashboard dibandingkan dengan `docs/design/stitch-export/dashboard_paper_trading_mobile/screen.png` — struktur, warna, tipografi, dan ikon cocok untuk bagian yang diimplementasikan (header, mode banner, balance card, bot list).

### Tidak Dilakukan (di luar scope Fase 1)
- Belum ada modul fitur produk (auth, exchange, bot, dst.) — mulai Fase 2.
- Belum ada proses `worker/` terpisah — ditambah saat Fase 3 (market data) benar-benar membutuhkannya.
- Redis belum ditambahkan — akan ditambah saat suatu fitur membutuhkannya.

## [Fase 0] Discovery & Audit — 2026-09-21
### Ditambahkan
- `docs/reference/` — 5 dokumen sumber kebenaran (PRD, SRS, SDD, Audit Integrasi, Riset Kompetitor) + master prompt pembangunan, diimpor ke repo sebagai referensi versi-terkontrol.
- `docs/design/stitch-export/` — export desain UI/UX Stitch: 10 mockup layar statis (`code.html` + `screen.png`), design tokens (`DESIGN.md`), dan aset logo.
- `PROJECT_STATUS.md` — ringkasan proyek reusable lintas-fase.
- `IMPLEMENTATION_PLAN.md` — rencana 11 fase (0-10) sesuai master prompt.
- `FEATURE_MATRIX.md` — 17 baris fitur, seluruhnya berstatus TODO/TBD/BLOCKED (belum ada implementasi).
- `API_CONTRACT.md` — skeleton kontrak endpoint `/api/v1/*` berdasarkan SDD §7.
- `.env.example` — skeleton variabel environment yang diantisipasi.

### Temuan Audit
- Repository sebelumnya kosong (hanya `README.md`); proyek ini greenfield, bukan perbaikan codebase existing.
- Desain UI adalah export statis Stitch (HTML+Tailwind CDN tanpa framework/API), bukan aplikasi frontend yang berfungsi — perlu dibangun ulang sebagai aplikasi nyata (React+TS diusulkan) yang meniru tampilan ini secara pixel-faithful.
- Ditemukan konflik: fitur "whitelist alamat withdrawal + timelock 24 jam" ada di desain tapi requirement-nya (FR-USER-002) berstatus TBD/kemungkinan tidak diperlukan di SRS — butuh keputusan Product Owner.
- Beberapa fitur Must-Have PRD (Auth, Profil, Market Data mandiri, Admin, Notifikasi) belum punya mockup desain.

### Tidak Dilakukan (di luar scope Fase 0)
- Tidak ada kode aplikasi (backend/frontend) yang ditulis.
- Tidak ada dependency yang diinstal.
- Tidak ada keputusan stack yang difinalisasi tanpa konfirmasi pengguna (lihat blocker di `IMPLEMENTATION_PLAN.md`).
