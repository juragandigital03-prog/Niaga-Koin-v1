# IMPLEMENTATION PLAN — GAIN (Niaga Koin)

> Rencana per fase sesuai `ATURAN EKSEKUSI PER FASE` di master prompt. Satu fase dikerjakan pada satu waktu, incremental, vertical slice. Baca `PROJECT_STATUS.md` dulu — jangan baca ulang PRD/SRS/SDD penuh di setiap fase.

## Status Ringkas Fase

| Fase | Nama | Status |
|---|---|---|
| 0 | Discovery & Audit | **DONE** |
| 1 | Foundation | **DONE** |
| 2 | Authentication | **DONE** |
| 3 | Market Data | **DONE** |
| 4a | Exchange Account Connection | **DONE** |
| 4b | Paper Trading Core | NOT STARTED |
| 5 | Bot & Strategy | NOT STARTED |
| 6 | Portfolio & Dashboard | NOT STARTED |
| 7 | History, Notification, Admin | NOT STARTED |
| 8 | Hardening & QA | NOT STARTED |
| 9 | Local Release | NOT STARTED |
| 10 | VPS/Domain Readiness | NOT STARTED |

## Keputusan Dikonfirmasi (2026-09-21)

Pengguna mengonfirmasi memakai default yang diusulkan untuk seluruh blocker Fase 0:
1. Stack sederhana: React+TS, NestJS modular monolith (satu proses, worker terpisah baru ditambah saat Fase 3 butuh), PostgreSQL saja, Redis ditunda sampai benar-benar perlu, secrets via `.env`.
2. Exchange pertama: **Binance**.
3. Fitur whitelist alamat withdrawal: **tidak masuk MVP** (default aman — sistem tidak mengkustodi dana, selaras SRS FR-USER-002).
4. Saldo virtual awal paper trading: **10,000 USDT**.

Detail alasan tiap keputusan ada di `PROJECT_STATUS.md` §5.

## Fase 1 — Foundation — **DONE** (2026-09-21)
- Monorepo `backend/` (NestJS+TS+Prisma) dan `frontend/` (Vite+React+TS+Tailwind) diinisialisasi. `worker/` sengaja belum dibuat — ditambah Fase 3.
- `docker-compose.yml` — PostgreSQL 16, bind `127.0.0.1` saja.
- TypeScript strict, ESLint, Prettier, Jest (backend) / Vitest (frontend) — lint & typecheck bersih di kedua proyek.
- `GET /api/v1/health` — cek konektivitas DB, melaporkan `tradingMode`/`liveTradingEnabled` eksplisit.
- Logging terstruktur JSON (nestjs-pino) dengan redaction header sensitif.
- Kill switch keselamatan finansial: boot gagal jika `LIVE_TRADING_ENABLED=true` (diuji unit + smoke test manual).
- Prisma + migration pertama (`init_users`) diterapkan ke PostgreSQL lokal.
- README diperbarui — instruksi run lokal diverifikasi benar-benar berjalan (bukan asumsi).
- Frontend: token desain disalin verbatim dari `code.html` Stitch ke `tailwind.config.js`; halaman Dashboard direplikasi sebagai komponen React statis (Header, PaperModeBanner, BalanceCard, BotList, ResetBalanceModal) dengan data mock eksplisit — divalidasi via screenshot Playwright dan dibandingkan visual terhadap `screen.png` referensi, hasil cocok struktural.
- Bukti test: lihat `CHANGELOG.md` Fase 1 dan laporan STATUS pada percakapan.

## Fase 2 — Authentication — **DONE** (2026-09-22)
- FR-AUTH-001 (register + OTP, email saja), FR-AUTH-002 (login + lockout), FR-AUTH-004 (RBAC — infrastruktur, `RolesGuard`/`@Roles()`, belum ada endpoint admin nyata untuk uji e2e penuh).
- **FR-AUTH-003 (2FA) sengaja ditunda** — Should Have di PRD, bukan Must Have; dipertimbangkan lagi bersama Pusat Keamanan (Fase 7) agar Fase 2 tetap satu vertical slice fokus, bukan scope creep.
- Password + kode OTP di-hash (bcryptjs, tidak pernah plaintext). JWT access (15m default) + refresh (7d default) — refresh **stateless**, belum ada tabel revoke (disengaja: tidak ada endpoint refresh yang memakainya di fase ini; revoke session jadi bagian Fase 7 Pusat Keamanan, sesuai mockup desain).
- OTP dikirim lewat `OtpProvider` yang bisa diganti — implementasi Fase 2 hanya `ConsoleOtpProvider` (log, dev-only). Registrasi ulang untuk email yang sama & masih `pending_verification` berfungsi sebagai resend OTP alami (tidak butuh endpoint terpisah).
- Account lockout: 5 percobaan gagal → kunci 15 menit (default, dapat dikonfigurasi via env — SRS BR-ACC-001 menandai ambang sebagai TBD).
- Endpoint baru: `POST /auth/register`, `POST /auth/verify-otp` (dilindungi token registrasi sementara terpisah dari access token), `POST /auth/login`, `GET /users/me`.
- Rate limiting global (`@nestjs/throttler`, 60 req/menit) + override lebih ketat (10 req/menit) di seluruh endpoint auth (NFR-SEC-007).
- Bug nyata ditemukan & diperbaiki lewat e2e test: `ConfigService.get()` mengembalikan string env mentah, sempat dikirim sebagai `maxAttempts` (Int) ke Prisma tanpa `Number(...)` — lihat `CHANGELOG.md` Fase 2.
- Test: 26 unit test (AuthService, RolesGuard, JwtStrategy, env validation) + 5 e2e test (alur penuh register→verify→login→me, wrong password, wrong OTP, token-purpose reuse ditolak) — seluruhnya melawan PostgreSQL nyata. Plus smoke test manual via curl.

## Fase 3 — Market Data — **DONE** (2026-09-22)
- `MarketDataProvider` interface (SDD §5.2 adapter pattern, subset read-only — tidak termasuk placeOrder/getBalance yang butuh API key pengguna, itu Fase 4) + `BinanceMarketDataProvider` (Binance public REST, tanpa API key).
- Retry terbatas (default 2x, backoff 200/400/800ms) + timeout (default 5s) via `fetchJsonWithRetry`; kegagalan → `MarketDataUnavailableError` → `503` (fail-safe, bukan data palsu/hang selamanya).
- Cache in-memory per simbol (TTL default 5 detik) — mengurangi beban ke Binance & risiko rate limit, tanpa perlu Redis untuk skala MVP.
- Whitelist simbol (`MARKET_DATA_SUPPORTED_SYMBOLS`, default BTC/ETH/SOL mengikuti mockup) — symbol di luar whitelist ditolak `400` sebelum memanggil exchange sama sekali.
- Endpoint baru: `GET /market-data/symbols`, `GET /market-data/ticker/{symbol}`, `GET /market-data/candles/{symbol}` — publik (tanpa auth, bukan data pengguna).
- **Worker terpisah belum dibuat** — endpoint REST cukup untuk kebutuhan Fase 3 (dashboard belum terhubung nyata, itu Fase 6); WebSocket/streaming real-time dan proses worker mandiri dipertimbangkan lagi saat Strategy Engine (Fase 5) benar-benar perlu mengonsumsi event market data terus-menerus.
- **Konektivitas Binance sungguhan TIDAK dapat diverifikasi di sesi ini** — sandbox pengembangan memblokir egress ke `api.binance.com` (kebijakan organisasi, dikonfirmasi via `curl` yang mengembalikan `403 connect_rejected`). Logic terverifikasi penuh lewat unit test (mock fetch) + e2e test (fake provider ter-inject) + smoke test manual yang membuktikan jalur fail-safe 503 bekerja. **Pengguna wajib mengecek konektivitas nyata di mesin sendiri** sebelum menganggap fitur ini selesai diverifikasi end-to-end (`curl https://api.binance.com/api/v3/ping`).
- Test: 14 unit test (retry helper, Binance provider parsing, service caching/validation) + 5 e2e test baru (melawan fake provider) — total 40 unit + 11 e2e lulus di seluruh backend.

## Fase 4a — Exchange Account Connection — **DONE** (2026-09-22)
- Dipecah dari Fase 4 gabungan menjadi dua vertical slice terpisah (koneksi exchange, lalu paper trading) agar tiap patch tetap kecil dan mudah ditinjau, sesuai aturan efisiensi kredit.
- Refactor kecil (bukan fitur baru): `fetchJsonWithRetry`/`UpstreamUnavailableError` dipindah dari `market-data/` ke `common/http/` agar dipakai bersama oleh Market Data (Fase 3) dan Exchange (Fase 4a) — mengurangi duplikasi retry/timeout logic. Ditambah dukungan `isNonRetryableStatus` (mis. `401`/`400` — auth ditolak, tidak ada gunanya di-retry).
- `CredentialsEncryptionService` (`common/crypto/`) — AES-256-GCM, kunci dari `CREDENTIALS_ENCRYPTION_KEY` (fail-fast jika kosong, app menolak start). Diuji: round-trip, IV acak per enkripsi, deteksi tamper (GCM auth tag), isolasi antar kunci berbeda.
- `ExchangeAdapter` interface (SDD §5.2, authenticated) + `BinanceExchangeAdapter` — signed request HMAC-SHA256 ke `GET /api/v3/account`, membaca `canTrade`/`canWithdraw`. Auth ditolak (`400`/`401`) → gagal cepat tanpa retry; kegagalan jaringan → retry lalu `UpstreamUnavailableError`.
- `ExchangeService`: BR-KEY-001 ditegakkan (key `canWithdraw=true` **selalu** ditolak `422`, tidak pernah disimpan); kredensial dienkripsi sebelum disimpan; query `list`/`disconnect` difilter `userId` di level WHERE clause (bukan dicek setelah query — satu user tidak bisa melihat/menghapus akun user lain, dibuktikan lewat e2e test isolasi).
- Model Prisma baru: `ExchangeAccount`, `ApiCredential` (migration `exchange_accounts`).
- Endpoint baru (`JwtAuthGuard`): `POST /exchange-accounts`, `GET /exchange-accounts`, `DELETE /exchange-accounts/{id}`.
- **Konektivitas Binance sungguhan TIDAK dapat diverifikasi di sesi ini** (alasan sama seperti Fase 3 — sandbox blokir egress). Logic teruji lewat unit test (adapter dengan mock fetch) + e2e test (fake `ExchangeAdapter` ter-inject) + smoke test manual yang membuktikan `503` fail-safe saat Binance benar-benar tak terjangkau. Pengguna wajib verifikasi nyata di mesin sendiri.
- Test: +19 unit test (encryption 6, Binance adapter 5, ExchangeService 7, refactor retry-helper +2) + 6 e2e test baru — total 60 unit + 17 e2e lulus di seluruh backend.

## Fase 4b — Paper Trading Core (rencana)
- Saldo virtual, tabel `orders`/`trades`/`positions`/`balances` dengan kolom `is_paper`, simulator eksekusi (fee & slippage eksplisit, ditandai TBD jika belum diputuskan), validasi saldo/quantity/precision.
- Isolasi teknis paper vs live ditegakkan di level DB + service + API sejak awal.

## Fase 5 — Bot & Strategy (rencana)
- Lifecycle bot (create/configure/start/pause/stop/delete), strategi indikator dasar (RSI/MACD — disebut eksplisit di SRS FR-STRAT-001), Risk Engine sebagai gate wajib sebelum eksekusi/simulasi (FR-RISK-001).

## Fase 6 — Portfolio & Dashboard (rencana)
- Hubungkan layar `dashboard_paper_trading_mobile`, `portfolio_alokasi_saldo_scr_06`, `detail_bot_analitik_performa` ke API nyata, ganti data hardcoded di mockup dengan data live dari backend.

## Fase 7 — History, Notification, Admin (rencana)
- Layar `riwayat_order_simulasi_slippage_scr_07` → FR-ORD-002. Notifikasi (FR-NOTIF-001, channel diusulkan Telegram/email — perlu konfirmasi). Admin & audit log → layar `pusat_keamanan_*`.

## Fase 8-10 — Hardening, Local Release, VPS Readiness (rencana)
- Sesuai checklist TESTING WAJIB, KEAMANAN DAN AUDIT, DEPLOYMENT VPS/CLOUD di master prompt. Tidak dieksekusi sampai fase sebelumnya selesai.

## Catatan Efisiensi
- Setiap fase: update `PROJECT_STATUS.md` (state proyek) dan `CHANGELOG.md` (riwayat), bukan menulis ulang narasi arsitektur yang sudah ada.
- Setiap fitur baru: update baris terkait di `FEATURE_MATRIX.md`, jangan buat dokumen status baru per fitur.
