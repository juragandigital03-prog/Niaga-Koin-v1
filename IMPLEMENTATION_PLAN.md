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
| 4b | Paper Trading Core | **DONE** |
| 5a | Bot Lifecycle | **DONE** |
| 5b | Strategy Engine + Risk Engine | **DONE** |
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

## Fase 4b — Paper Trading Core — **DONE** (2026-09-22)
- Model Prisma baru: `Balance`, `Position`, `Order`, `Trade` — **satu set tabel untuk paper maupun live** (dibedakan kolom `is_paper`, mengikuti pola SDD §6.2), bukan tabel terpisah, agar siap dipakai Bot Lifecycle (Fase 5) tanpa migrasi ulang. Migration `paper_trading_core`.
- **Penyimpangan terdokumentasi dari ERD SDD §6.1:** `Balance`/`Position` diikat ke `userId` langsung, bukan ke `exchangeAccountId`/`botId` seperti SDD — karena SRS §3.8 eksplisit: paper trading tidak memerlukan API key/exchange account untuk mulai. Mewajibkan `ExchangeAccount` di sini akan melanggar requirement itu sendiri. `botId` akan ditambahkan sebagai kolom nullable saat Bot Lifecycle (Fase 5) dibangun.
- `WalletService`: wallet dibuat lazy (saldo default `PAPER_TRADING_DEFAULT_BALANCE_USDT`, 10.000 USDT) saat pertama diakses — tidak butuh registrasi/setup terpisah. `reset()` mengembalikan saldo default & menghapus semua posisi (aksi ireversibel — konfirmasi ada di sisi UI, backend menyediakan endpoint khusus sebagai bagian kontraknya).
- `OrderService` — simulator market order: harga dari `MarketDataService` (Fase 3, **reuse langsung**, tidak duplikasi) + slippage searah order (`PAPER_TRADING_SLIPPAGE_PERCENT`, default 0.05%, **deterministik** agar test dapat direproduksi — bukan model depth order book, ditandai TBD sesuai instruksi master prompt "gunakan konfigurasi development yang terdokumentasi") + fee (`PAPER_TRADING_FEE_PERCENT`, default 0.1%). Quantity dibulatkan ke bawah ke presisi yang dikonfigurasi (meniru cara exchange membulatkan ke lot-size, bukan menolak).
- **Setiap percobaan order dicatat** — termasuk yang ditolak (saldo tidak cukup, di bawah minimum notional, data pasar tidak tersedia) — bukan hanya error HTTP tanpa jejak, demi transparansi riwayat (SRS FR-ORD-002) dan semangat audit (mirip FR-RISK-001: penolakan tetap dicatat).
- **Fail-safe dibuktikan nyata** (bukan cuma diklaim): saat `MarketDataService` melempar `ServiceUnavailableException` (Binance tak terjangkau — persis kondisi sandbox ini), `OrderService` menangkapnya dan mencatat order sebagai `rejected` dengan alasan `MARKET_DATA_UNAVAILABLE`, **tanpa pernah menyentuh saldo/posisi** — diverifikasi lewat smoke test manual melawan server nyata (bukan hanya mock).
- **Keamanan konkurensi:** debit saldo (BUY) dan pengurangan posisi (SELL) memakai `updateMany` dengan kondisi `WHERE amount/quantity >= jumlah` di dalam transaksi interaktif Prisma (`$transaction(async (tx) => ...)`) — bukan pola read-lalu-write terpisah yang rentan race condition saat dua order datang bersamaan pada wallet yang sama.
- Tidak ada short selling — SELL divalidasi terhadap quantity posisi yang benar-benar dimiliki pengguna saat itu.
- Endpoint baru (`JwtAuthGuard`): `GET /wallet`, `POST /wallet/reset`, `POST /orders`, `GET /orders?symbol=`.
- Isolasi teknis paper vs live ditegakkan di level DB (`is_paper`) + service + API sejak awal — konsisten dengan prinsip #10 SDD.
- Test: 15 unit test baru (`WalletService` 4, `OrderService` 11 — termasuk assersi numerik tangan atas slippage/fee/weighted-avg-entry-price) + 8 e2e test baru (alur penuh buy→sell, race-safety saldo tak pernah negatif, isolasi antar-user, reset, unauth) — total 75 unit + 25 e2e lulus di seluruh backend. Plus smoke test manual melawan server & Postgres nyata yang membuktikan fail-safe bekerja saat market data benar-benar tak terjangkau.

## Fase 5a — Bot Lifecycle — **DONE** (2026-09-22)
- Dipecah dari "Fase 5 — Bot & Strategy" gabungan menjadi dua vertical slice (lifecycle dulu, lalu strategi+risk), pola yang sama seperti pemecahan Fase 4 — patch tetap kecil dan reviewable.
- Model Prisma `Bot` (migration `bot_lifecycle`) — konfigurasi (nama, symbol, `strategyType`, `parameters` JSON, `riskLimits` JSON, `exchangeAccountId` opsional) disediakan lengkap saat pembuatan, bot baru langsung `stopped` (tidak ada state "Configured" transisional terpisah dari SDD §9 — konfigurasi & pembuatan terjadi bersamaan dalam satu request).
- Endpoint baru (`JwtAuthGuard`): `POST/GET /bots`, `GET /bots/{id}`, `PATCH .../start|pause|stop` (idempotent — memanggil `start` pada bot yang sudah aktif mengembalikan state saat ini, bukan error), `DELETE /bots/{id}` (`409` jika belum `stopped`).
- `PATCH .../pause` ditambahkan sebagai endpoint baru (tidak ada di SDD §7 asli) — SDD §9 lifecycle punya state `Paused` terpisah dari `Stopped`, dan master prompt eksplisit menyebut "pause" sebagai aksi lifecycle sendiri.
- Batas jumlah bot per pengguna (`MAX_BOTS_PER_USER`, default 10) — pengganti sementara untuk limit per-tier langganan (F-SUB-01 masih gap requirement, tidak diimplementasikan sebagai TODO tanpa fallback).
- **Menuntaskan TODO dari Fase 4a:** `ExchangeService.disconnect()` sekarang benar-benar menghentikan (bukan hanya mencatat rencana) setiap bot `active`/`paused` yang bergantung pada koneksi exchange sebelum koneksi itu dihapus (FR-EXC-002) — via query Prisma langsung, tanpa membuat `ExchangeModule` bergantung pada `BotsModule` (menghindari siklus dependency modul).
- **Sengaja BELUM dibangun di Fase 5a:** komputasi strategi (Strategy Engine yang membaca `parameters` dan menghasilkan sinyal RSI nyata), Risk Engine (validasi sinyal terhadap `riskLimits`), dan mekanisme yang menyambungkan bot ke `OrderService` (Fase 4b) baik manual maupun terjadwal. Bot Fase 5a murni wadah konfigurasi + siklus hidup — **belum benar-benar berdagang**. Itu semua Fase 5b.
- Test: 12 unit test (`BotsService`) + 1 unit test tambahan (`ExchangeService.disconnect` FR-EXC-002) + 6 e2e test baru (lifecycle penuh, guard pause dari status salah, symbol tak didukung, isolasi antar-user, integrasi lintas-modul disconnect→stop bot, wajib auth) — total 88 unit + 31 e2e lulus di seluruh backend. Smoke test manual membuktikan create→start→(gagal delete saat active, 409)→stop→delete (204) bekerja melawan server & Postgres nyata.

## Fase 5b — Strategy Engine + Risk Engine — **DONE** (2026-09-22)
- **Strategy Engine** (`backend/src/strategy/`): `StrategyEngineService` merutekan ke plugin per `strategyType` (SDD §5.3 "plugin-based", Prinsip 9) — hanya `RsiStrategy` ada. RSI dihitung dari `MarketDataService.getCandles` (interval `BOT_EVALUATE_CANDLE_INTERVAL`, default `1h`) dengan metode rata-rata sederhana atas `period+1` close terakhir (simplifikasi terdokumentasi, bukan Wilder smoothing rekursif). Validasi semantik `parameters` (FR-STRAT-002): `period` integer 2-100 (default 14), `oversold` 1-49 (default 30), `overbought` 51-99 (default 70, harus > oversold) — dijalankan di `BotsService.create`, jadi bot tidak bisa dibuat dengan parameter tidak valid sejak awal. Rentang ini **default PROPOSED** (SRS menandainya `TBD`, "rentang final ditetapkan tim strategi") — konvensi RSI publik yang umum dikenal, bukan aturan bisnis dikarang.
- **Risk Engine** (`backend/src/risk/`): `RiskEngineService` — gate wajib (FR-RISK-001), hanya mendukung `riskLimits.maxPositionUsdt` (satu-satunya contoh konkret SDD §5.4). Sinyal `buy` disetujui sebesar sisa headroom di bawah `maxPositionUsdt` (dihitung dari notional posisi `userId+symbol` saat ini, bukan per-bot — deviasi arsitektur yang sama sejak Fase 4b); habis headroom → ditolak `MAX_POSITION_EXCEEDED`. Sinyal `sell` selalu disetujui untuk seluruh posisi yang ada; tidak ada posisi → ditolak `NO_OPEN_POSITION`. Sinyal yang ditolak **tidak pernah** mencapai `OrderService` — dicatat lewat structured log (`PinoLogger.warn`), setara "dicatat di log" pada acceptance criteria FR-RISK-001.
- **Orkestrasi** (`backend/src/bots/bot-evaluation.service.ts`): `POST /bots/{id}/evaluate` — trigger manual sinkron menjalankan Strategy Engine → Risk Engine → `OrderService` (Fase 4b) satu siklus penuh. `400` jika bot bukan `active`. Kegagalan candle (fail-safe, termasuk sandbox ini yang memblokir egress Binance) menghasilkan `blockedReason: "MARKET_DATA_UNAVAILABLE"` dengan HTTP `200`, bukan data karangan atau crash — **dibuktikan lewat smoke test manual terhadap server nyata**, bukan cuma mock.
- Evaluasi otomatis berkala (bot "berjalan sendiri" tanpa dipanggil manual) — **belum dibangun**, didokumentasikan eksplisit sebagai TODO fase mendatang (kandidat: `@nestjs/schedule` in-process, bukan worker/queue terpisah) — sesuai rencana awal yang menyebutnya "jika waktu/kredit memungkinkan", bukan kegagalan Fase 5b.
- FR-RISK-002 (circuit breaker) — **DITUNDA** (Should Have, kandidat sama seperti FR-AUTH-003, ambang belum kuantitatif di SRS).
- Test: 26 unit test baru (`RsiStrategy` 9, `StrategyEngineService` 2, `RiskEngineService` 8, `BotEvaluationService` 7) + 2 unit test baru di `BotsService` (validasi parameter/riskLimits saat create) + 5 e2e test baru (`bot-evaluation.e2e-spec.ts`, file terpisah dari `bots.e2e-spec.ts` agar tidak melebihi limit throttle `/auth/register` 10/60s) — total 116 unit + 36 e2e lulus di seluruh backend. Smoke test manual terhadap server & Postgres nyata membuktikan: validasi parameter RSI/riskLimits saat create (400), guard bot-harus-active saat evaluate (400), dan fail-safe `MARKET_DATA_UNAVAILABLE` saat Binance sungguhan tak terjangkau (200, bukan data karangan).
- **Catatan teknis (bukan bug produksi, ditemukan & diperbaiki selama fase ini):** `process.env` dibagi antar file e2e dalam satu Jest worker — override env var pakai `??=` di satu file bisa no-op kalau file lain sudah lebih dulu memicu `ConfigModule` menetapkan nilai dari `.env`. Fix: `bot-evaluation.e2e-spec.ts` memakai assignment `=` (bukan `??=`) untuk `MARKET_DATA_CACHE_TTL_MS`, didokumentasikan sebagai komentar di kode.

## Fase 6 — Portfolio & Dashboard (rencana)
- Hubungkan layar `dashboard_paper_trading_mobile`, `portfolio_alokasi_saldo_scr_06`, `detail_bot_analitik_performa` ke API nyata, ganti data hardcoded di mockup dengan data live dari backend.

## Fase 7 — History, Notification, Admin (rencana)
- Layar `riwayat_order_simulasi_slippage_scr_07` → FR-ORD-002. Notifikasi (FR-NOTIF-001, channel diusulkan Telegram/email — perlu konfirmasi). Admin & audit log → layar `pusat_keamanan_*`.

## Fase 8-10 — Hardening, Local Release, VPS Readiness (rencana)
- Sesuai checklist TESTING WAJIB, KEAMANAN DAN AUDIT, DEPLOYMENT VPS/CLOUD di master prompt. Tidak dieksekusi sampai fase sebelumnya selesai.

## Catatan Efisiensi
- Setiap fase: update `PROJECT_STATUS.md` (state proyek) dan `CHANGELOG.md` (riwayat), bukan menulis ulang narasi arsitektur yang sudah ada.
- Setiap fitur baru: update baris terkait di `FEATURE_MATRIX.md`, jangan buat dokumen status baru per fitur.
