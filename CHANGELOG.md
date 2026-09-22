# CHANGELOG — GAIN (Niaga Koin)

Format: setiap entri merepresentasikan satu fase kerja (bukan setiap commit kecil).

## [Fase 6b] Dashboard: hubungkan ke API nyata — 2026-09-22
### Ditambahkan
- `frontend/src/lib/wallet.ts` (`getWallet`/`resetWallet`), `frontend/src/lib/bots.ts` (`listBots`/`startBot`/`pauseBot`/`stopBot`), `frontend/src/lib/orders.ts` (`listOrders`) — semuanya tipis di atas `apiFetch` (Fase 6a), mengikuti kontrak persis `API_CONTRACT.md`.
- `DashboardPage` sekarang fetch ketiganya lewat `Promise.all` saat mount, dengan loading state ("Memuat data dashboard...") dan error state (banner `role="alert"`, pesan asli dari backend).
- `BotList`/`BotCard` ditulis ulang total: badge status tiga-state (`ACTIVE`/`PAUSED`/`STOPPED`), tombol start/pause/stop yang benar-benar memanggil `PATCH /bots/{id}/...` dengan state per-bot pending saat aksi berlangsung (tombol disabled sampai respons datang).

### Diubah
- `MOCK_BOTS` dan saldo hardcode Fase 1 di `DashboardPage` **dihapus total** (bukan disembunyikan di belakang flag).
- `lib/types.ts`: `Bot`/`BotStatus` diselaraskan penuh dengan kontrak backend nyata (`{id, name, symbol, strategyType, status: 'active'|'paused'|'stopped', createdAt}`). Field rekaan Fase 1 (`exchange`, `strategyLabel`, `pnl24hUsdt`, `pnl24hPercent`, `winTrades`, `totalTrades`, `note`, `alert`) dihapus — backend tidak pernah mengembalikannya.
- `BalanceCard`: prop `pnl24hUsdt`/`pnl24hPercent` → `pnlUsdt`/`pnlPercent`, `ordersSucceeded24h` → `ordersFilledTotal`; label "24j" diganti "Sejak Reset".

### Keputusan Desain Penting
- **Fase 6 dipecah lebih lanjut** — menghubungkan tiga layar (`dashboard_paper_trading_mobile`, `portfolio_alokasi_saldo_scr_06`, `detail_bot_analitik_performa`) sekaligus terlalu besar untuk satu patch; dua yang terakhir bahkan belum punya halaman sama sekali. Fase 6b hanya menghubungkan Dashboard yang sudah ada; Portofolio + Detail Bot jadi Fase 6c.
- **Tidak ada angka finansial rekaan.** Backend tidak menghitung PnL/win-rate per bot (F-AN-01 masih TODO) dan tidak melacak snapshot saldo historis/harian, jadi UI tidak bisa jujur menampilkan "PnL 24 Jam" atau win-rate — diganti catatan "Analitik performa belum tersedia" di kartu bot, dan label "Sejak Reset" (bukan "24 jam") untuk PnL saldo, dihitung sebagai `saldo saat ini - saldo default` (satu-satunya PnL yang bisa dihitung tanpa mengarang data). Ini menegakkan langsung larangan eksplisit master prompt: "Jangan menampilkan angka finansial seolah-olah nyata jika berasal dari simulasi".
- **`/api/v1/portfolio` (F-PORT-01) diputuskan tidak dibangun untuk sekarang** — hanya ada satu sumber data (paper wallet), jadi endpoint agregasi baru di atas `GET /wallet` yang sudah ada tidak memberi nilai tambah nyata. Didokumentasikan sebagai keputusan sadar di `IMPLEMENTATION_PLAN.md`/`API_CONTRACT.md`, bukan dilewati diam-diam.
- **"Order Berhasil" dihitung client-side dari `GET /orders`** (`status === 'filled'`), bukan field agregat dari backend (backend belum punya filter tanggal/status di endpoint itu, lihat catatan TODO di `API_CONTRACT.md`) — cukup untuk kebutuhan tampilan saat ini tanpa perlu endpoint baru.

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, 1 warning pre-existing-style di `AuthContext.tsx`), `npx vitest run` PASS (39/39 test — `BalanceCard` 5, `BotList` 6 ditulis ulang total, `DashboardPage` 5 baru: loading, data nyata bukan mock, error banner, reset saldo, aksi pause bot), `npm run build` PASS.
- **Smoke test manual lewat browser sungguhan** (Playwright/Chromium terhadap `vite dev` + backend nyata): register→login→dashboard menampilkan saldo default nyata (10,000.00, bukan mock 10,412.50 Fase 1) dan state kosong "Belum ada bot" yang jujur → bot dibuat lewat API (belum ada wizard UI) → reload menampilkan bot nyata dengan badge STOPPED, tanpa teks PnL rekaan apa pun → klik "Jalankan Bot" di UI memanggil `PATCH .../start` sungguhan dan badge berubah ke ACTIVE → klik "Jeda Bot" memanggil `PATCH .../pause` dan badge berubah ke PAUSED → klik Reset Saldo lewat modal memanggil `POST /wallet/reset` sungguhan dan dialog tertutup. Screenshot akhir memverifikasi tampilan visual sesuai desain token.

## [Fase 6a] Frontend Foundation: API Client + Auth Flow — 2026-09-22
### Ditambahkan
- `frontend/src/lib/api.ts` — fetch wrapper tipis (`apiFetch`), `ApiError` (status + message, menggabungkan array pesan validasi class-validator jadi satu string kalau perlu), token akses disimpan di modul-level variable (`setAccessToken`) bukan React state, supaya setiap pemanggilan `apiFetch` di mana pun konsisten melihat token yang sama.
- `frontend/src/lib/auth.ts` — `register`/`verifyOtp`/`login`/`getMe`, mengikuti kontrak persis `API_CONTRACT.md` (tidak menambah field yang tidak ada di respons backend nyata).
- `frontend/src/lib/AuthContext.tsx` — sesi disimpan di `localStorage` (`gain_access_token`/`gain_refresh_token`), hidrasi saat mount memvalidasi token tersimpan lewat `GET /users/me` (token kedaluwarsa/invalid dihapus diam-diam, bukan macet di state "authenticated" palsu).
- Routing (`react-router-dom`, dependency baru pertama di luar React/Vite/Tailwind sejak Fase 1): `/login`, `/register`, `/verify-otp` publik; `/` (Dashboard) di belakang `ProtectedRoute`.
- Halaman baru `LoginPage`, `RegisterPage`, `VerifyOtpPage` — memakai token desain yang sama (`tailwind.config.js`), karena **tidak ada mockup Stitch untuk layar ini** (F-AUTH-01 tidak punya desain resmi, lihat `PROJECT_STATUS.md` §3.3). `VerifyOtpPage` secara eksplisit memberi tahu pengguna bahwa OTP dev-only dicatat di log backend, bukan email sungguhan.
- `AppHeader` — tombol avatar sekarang memicu `logout()` nyata.
- `frontend/.env.example` (`VITE_API_BASE_URL`, default `http://localhost:3000/api/v1`), `frontend/src/vite-env.d.ts` (referensi tipe `vite/client` — sebelumnya tidak ada sama sekali, jadi `import.meta.env` belum bertipe).

### Keputusan Desain Penting
- **Dipecah dari Fase 6 gabungan** — frontend Fase 1 tidak punya infrastruktur sama sekali (tanpa router, API client, atau auth), jadi menghubungkan layar dashboard ke API nyata (rencana Fase 6 semula) butuh fondasi ini lebih dulu. Pola pemecahan sama seperti Fase 4a/4b dan 5a/5b.
- **Dashboard belum diubah** — `MOCK_BOTS`/saldo hardcoded di `DashboardPage` sengaja tetap dipertahankan; menggantinya dengan data live (`GET /wallet`, `GET /bots`) adalah Fase 6b, agar patch tetap kecil dan reviewable.
- **Tidak pakai data-fetching library** (react-query/swr) — cakupan sejauh ini (beberapa panggilan API sederhana) belum butuh cache/refetch/invalidation kompleks; `fetch` + wrapper tipis lebih sederhana, konsisten dengan prinsip "jangan bangun sebelum dibutuhkan".
- **`registrationToken` tidak pernah dipersist** — hanya diteruskan lewat React Router state dari `RegisterPage` ke `VerifyOtpPage`; refresh/kunjungan langsung ke `/verify-otp` redirect ke `/register` (token backend memang berumur pendek, ~5 menit, jadi menyimpannya di `localStorage` tidak ada gunanya dan cuma menambah permukaan risiko).

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, 1 warning pre-existing-style `react-refresh/only-export-components` di `AuthContext.tsx` — pola umum untuk file context yang mengekspor Provider + hook sekaligus), `npx vitest run` PASS (30/30 test, 21 baru: `api.ts` 7, `AuthContext` 5, `ProtectedRoute` 2, `LoginPage` 2, `RegisterPage` 2, `VerifyOtpPage` 3), `npm run build` (tsc + vite build) PASS.
- **Smoke test manual lewat browser sungguhan** (Playwright/Chromium terhadap `vite dev` + backend nyata — bukan cuma unit test bermock, sesuai instruksi "start dev server dan uji fitur di browser"): alur penuh register → baca kode OTP dari log backend nyata → verify-otp → login → dashboard render → sesi bertahan setelah hard reload → logout → redirect ke `/login` → akses `/` setelah logout otomatis redirect lagi. Juga diverifikasi: pesan error asli backend ("Email atau password salah") tampil di UI untuk login gagal.
- **Catatan lingkungan (bukan bug produksi):** font Material Symbols tidak bisa dimuat di sandbox ini (egress dibatasi — isu yang sama dengan screenshot smoke test Fase 1), sehingga ikon tampil sebagai teks literal dan sempat menutupi tombol avatar secara visual saat smoke test, menyebabkan Playwright gagal hit-test klik normal pada tombol logout. Diatasi di skrip smoke test dengan memanggil `.click()` langsung pada elemen DOM (bukan simulasi klik berbasis koordinat) — bukan perubahan kode aplikasi; font akan dimuat normal di browser pengguna sungguhan dengan akses internet biasa.

## [Fase 5b] Strategy Engine + Risk Engine — 2026-09-22
### Ditambahkan
- `StrategyEngineService` + `RsiStrategy` (`backend/src/strategy/`) — Strategy Engine berbasis plugin (SDD §5.3, Prinsip 9 "extensibility"; hanya satu plugin ada: RSI). Menghitung RSI dari `MarketDataService.getCandles` (metode rata-rata sederhana atas `period+1` close terakhir — simplifikasi terdokumentasi, bukan Wilder smoothing rekursif penuh, sama semangatnya dengan model slippage paper trading di Fase 4b). Sinyal: `rsi < oversold` → `buy`; `rsi > overbought` → `sell`; selain itu `hold`.
- `RiskEngineService` (`backend/src/risk/`) — gate wajib SDD §5.4 (FR-RISK-001). Hanya mendukung `riskLimits.maxPositionUsdt` (satu-satunya contoh konkret SDD §5.4 "ukuran posisi maksimum"). Buy disetujui sebesar sisa headroom di bawah cap; habis headroom → `MAX_POSITION_EXCEEDED`. Sell selalu disetujui untuk seluruh posisi ada; tidak ada posisi → `NO_OPEN_POSITION`.
- `BotEvaluationService` (`backend/src/bots/bot-evaluation.service.ts`) — orkestrator Strategy Engine → Risk Engine → `OrderService` (Fase 4b), dipanggil lewat endpoint baru `POST /api/v1/bots/{id}/evaluate`.
- `BotsService.create` kini memanggil `StrategyEngineService.validateParameters` dan `RiskEngineService.validateRiskLimits` (FR-STRAT-002/FR-RISK-001) — bot tidak bisa lagi dibuat dengan `parameters`/`riskLimits` yang secara semantik tidak masuk akal, bukan cuma "objek JSON apa saja" seperti Fase 5a.
- Env baru: `BOT_EVALUATE_CANDLE_INTERVAL` (default `1h`) — interval candle yang diminta Strategy Engine; jumlah candle otomatis mengikuti `period` RSI bot (`period + 1`), tidak dikonfigurasi terpisah.

### Keputusan Desain Penting
- **Rentang parameter RSI adalah default PROPOSED, bukan requirement final** — SRS FR-STRAT-002 eksplisit menandai rentang valid `TBD` ("rentang final ditetapkan tim strategi"). Dipilih: `period` 2-100 (default 14), `oversold` 1-49 (default 30), `overbought` 51-99 (default 70, harus > oversold) — konvensi indikator publik yang umum dikenal (bukan kekayaan intelektual kompetitor manapun, sesuai catatan riset di SRS §4.5), bukan aturan bisnis yang dikarang. Didokumentasikan di `API_CONTRACT.md`/`FEATURE_MATRIX.md`, bukan asumsi diam-diam.
- **Posisi tidak per-bot** — `RiskEngineService` mengevaluasi `maxPositionUsdt` terhadap notional posisi `userId+symbol` total (`Position` tabel dari Fase 4b), bukan posisi milik satu bot secara terisolasi, karena `Position` memang diikat ke `userId`, bukan `botId` (penyimpangan arsitektur yang sama, konsisten sejak Fase 4b). Konsekuensinya: beberapa bot pada simbol yang sama berbagi eksposur yang sama terhadap cap `maxPositionUsdt` masing-masing — didokumentasikan eksplisit, bukan celah tersembunyi.
- **Sinyal yang ditolak Risk Engine dicatat via structured log (pino), bukan tabel database baru** — FR-RISK-001 acceptance criteria minta "dicatat di log", bukan mensyaratkan audit trail berelasi database; menghindari tabel baru yang belum ada kebutuhan konkretnya (konsisten dengan prinsip "jangan bangun sebelum dibutuhkan").
- **Trigger tetap manual (`POST /bots/{id}/evaluate`)** — evaluasi otomatis berkala (bot "berjalan sendiri") sengaja **tidak** dibangun di fase ini; rencana Fase 5b awal menyebutnya "jika waktu/kredit memungkinkan", bukan komitmen. Dipertimbangkan sebagai tambahan ringan (`@nestjs/schedule` in-process) di fase mendatang, bukan kegagalan cakupan.
- **`OrderService.placeOrder` dipanggil apa adanya** (Fase 4b, tidak diubah) — jika Risk Engine menyetujui suatu sinyal tapi `OrderService` sendiri menolaknya (mis. `INSUFFICIENT_BALANCE`), respons `evaluate()` tetap `executed: false` dengan `order.status: "rejected"` terlampir — Risk Engine dan Trading Engine tetap dua gate independen (SDD §5.4 vs §5.5), bukan digabung jadi satu keputusan.
- FR-RISK-002 (circuit breaker) — **DITUNDA**, status sama seperti FR-AUTH-002 (Should Have, ambang belum kuantitatif di SRS).

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error, hanya warning `no-explicit-any` pre-existing di file test), `npx jest` PASS (116/116 unit test, +28 baru: `RsiStrategy` 9, `StrategyEngineService` 2, `RiskEngineService` 8, `BotEvaluationService` 7, `BotsService` +2 validasi create), `npx jest --config test/jest-e2e.json` PASS (36/36 e2e test, +5 baru di `test/bot-evaluation.e2e-spec.ts`: guard bot-harus-active, buy signal dari candle deterministik menghasilkan order `filled`, `MAX_POSITION_EXCEEDED` saat posisi sudah di cap, sell signal menutup posisi yang bot buka sendiri, `NO_OPEN_POSITION` saat sell tanpa posisi), `npx nest build` PASS.
- Smoke test manual melawan server & PostgreSQL nyata: `POST /bots` dengan `parameters`/`riskLimits` tidak valid → `400` dengan pesan spesifik (bukan generic); bot valid dibuat → `evaluate` saat `stopped` → `400`; `start` → `evaluate` saat Binance sungguhan tak terjangkau (sandbox ini) → `200` dengan `blockedReason: "MARKET_DATA_UNAVAILABLE"`, **bukan** data karangan atau crash — pembuktian fail-safe nyata di luar test suite bermock.
- **Catatan teknis dari proses debugging (bukan bug produksi):** `process.env` dibagi antar file e2e dalam satu Jest worker yang sama — `??=` untuk override `MARKET_DATA_CACHE_TTL_MS` bisa no-op kalau file e2e lain (mis. `market-data.e2e-spec.ts`) sudah lebih dulu memicu `ConfigModule` menetapkan nilai dari `.env` (`assignVariablesToProcess` hanya skip key yang **sudah** ada di `process.env`, dan urutan file di satu Jest worker tidak dijamin). Awalnya menyebabkan candle basi ter-cache lintas test dalam `bot-evaluation.e2e-spec.ts`, membuat sinyal `sell` yang diharapkan malah terbaca `buy`. Diperbaiki dengan assignment `=` (unconditional, bukan `??=`) di file itu — dan sekalian dipisah dari `bots.e2e-spec.ts` supaya juga tidak melebihi limit throttle `/auth/register` (10/60s) yang mulai tersentuh begitu jumlah `registerAndLogin` per file bertambah banyak.

## [Fase 5a] Bot Lifecycle — 2026-09-22
### Ditambahkan
- Model Prisma `Bot` (migration `bot_lifecycle`) — `name`, `symbol`, `strategyType` (enum, hanya `rsi` untuk saat ini), `parameters`/`riskLimits` (JSON generik), `exchangeAccountId` opsional, `status` (`stopped`/`active`/`paused`), `isPaper`.
- `BotsService` (`backend/src/bots/`) — `create` (validasi symbol whitelist, ownership `exchangeAccountId`, batas `MAX_BOTS_PER_USER`), `list`, `get`, `start`/`pause`/`stop` (idempotent sesuai aturan), `remove` (hanya saat `stopped`).
- Endpoint baru: `POST/GET /api/v1/bots`, `GET /api/v1/bots/{id}`, `PATCH /api/v1/bots/{id}/start|pause|stop`, `DELETE /api/v1/bots/{id}` — seluruhnya `JwtAuthGuard`, difilter per `userId`.
- Env baru: `MAX_BOTS_PER_USER` (default 10) — pengganti sementara limit tier langganan (F-SUB-01 masih gap requirement).
- **`PATCH .../pause`** — endpoint baru di luar skeleton SDD §7 (yang hanya menyebut start/stop) karena SDD §9 lifecycle-nya sendiri punya state `Paused` terpisah dari `Stopped`, dan master prompt eksplisit menyebut "pause" sebagai aksi lifecycle tersendiri.

### Menuntaskan TODO dari Fase 4a
- `ExchangeService.disconnect()` sekarang benar-benar menghentikan setiap bot `active`/`paused` yang bergantung pada koneksi exchange sebelum koneksi itu dihapus (FR-EXC-002 acceptance criteria) — dulunya hanya komentar `TODO(Fase 5)` karena belum ada model Bot untuk dirujuk. Diimplementasikan lewat query Prisma langsung di `ExchangeService` (bukan meng-inject `BotsService`) supaya `ExchangeModule` dan `BotsModule` tidak saling bergantung.

### Keputusan Desain Penting
- **Fase 5 dipecah jadi 5a (lifecycle) dan 5b (strategi+risk)** — pola yang sama seperti Fase 4a/4b, menjaga patch tetap kecil dan reviewable sesuai aturan efisiensi kredit master prompt.
- **Bot Fase 5a murni wadah konfigurasi + siklus hidup — belum benar-benar berdagang.** `parameters`/`riskLimits` disimpan sebagai JSON generik dan hanya divalidasi strukturnya (harus objek), bukan isinya — validasi semantik (mis. rentang period RSI wajar, FR-STRAT-002) adalah tanggung jawab Strategy Engine di Fase 5b yang benar-benar menafsirkan field-field itu. Status `active` pada bot Fase 5a **tidak memicu eksekusi apa pun** — belum ada mekanisme yang membaca status ini dan bertindak.
- `exchangeAccountId` pada Bot bersifat opsional — bot paper trading tidak wajib punya koneksi exchange (konsisten dengan keputusan yang sama di Fase 4b untuk `Balance`/`Position`, selaras SRS §3.8).

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error), `npx jest` PASS (88/88 unit test, +13 baru: BotsService 12 + ExchangeService disconnect-stops-bots 1), `npx jest --config test/jest-e2e.json` PASS (31/31 e2e test, +6 baru: lifecycle penuh create→start→pause→stop→delete, guard pause dari status salah, symbol tak didukung, isolasi antar-user, integrasi lintas-modul disconnect exchange → bot berhenti otomatis, wajib auth), `npx nest build` PASS.
- Smoke test manual melawan server & PostgreSQL nyata: register→login→`POST /bots`→`PATCH .../start`→`GET /bots` (status `active`)→`DELETE` saat masih aktif (`409`, ditolak dengan benar)→`PATCH .../stop`→`DELETE` (`204`, berhasil).

## [Fase 4b] Paper Trading Core — 2026-09-22
### Ditambahkan
- Model Prisma `Balance`, `Position`, `Order`, `Trade` (migration `paper_trading_core`) — satu set tabel untuk paper maupun live (dibedakan `is_paper`, pola SDD §6.2), bukan tabel terpisah.
- `WalletService` (`backend/src/paper-trading/`) — `getOrCreateBalance` (lazy init 10.000 USDT default), `getSummary`, `reset` (kembalikan saldo default + hapus posisi).
- `OrderService` — simulator market order: fetch harga dari `MarketDataService` (reuse Fase 3), slippage deterministik searah order (`PAPER_TRADING_SLIPPAGE_PERCENT`, default 0.05%), fee (`PAPER_TRADING_FEE_PERCENT`, default 0.1%), pembulatan quantity ke bawah sesuai presisi yang dikonfigurasi. Weighted-average entry price dihitung ulang setiap BUY menambah posisi.
- Endpoint baru: `GET /api/v1/wallet`, `POST /api/v1/wallet/reset`, `POST /api/v1/orders`, `GET /api/v1/orders?symbol=` — seluruhnya dilindungi `JwtAuthGuard`, difilter per `userId`.
- Env baru: `PAPER_TRADING_SLIPPAGE_PERCENT` (mengganti `PAPER_TRADING_SLIPPAGE_MODEL=TBD` dengan nilai konkret terdokumentasi), `PAPER_TRADING_MIN_NOTIONAL_USDT`, `PAPER_TRADING_QUANTITY_PRECISION`.

### Keputusan Desain Penting (didokumentasikan, termasuk penyimpangan dari SDD)
- **Setiap percobaan order dicatat, termasuk yang ditolak** — `Order.status='rejected'` dengan `rejectReason` (`INSUFFICIENT_BALANCE`, `INSUFFICIENT_POSITION`, `BELOW_MIN_NOTIONAL`, `MARKET_DATA_UNAVAILABLE`), bukan sekadar respons error HTTP tanpa jejak. Endpoint `POST /orders` **selalu** mengembalikan `201` — hasil (`filled` vs `rejected`) ada di body, bukan di status code, mengikuti bagaimana exchange sungguhan mencatat percobaan order.
- **Penyimpangan terdokumentasi dari ERD SDD §6.1:** `Balance`/`Position` diikat ke `userId`, bukan `exchangeAccountId` — karena SRS §3.8 eksplisit menyatakan paper trading tidak memerlukan API key untuk mulai. `botId` sengaja belum ada di `Order`/`Position` (nullable, ditambahkan saat Bot Lifecycle Fase 5 dibangun) — menghindari memodelkan relasi ke entitas yang belum ada.
- **Konkurensi:** debit saldo/posisi memakai `updateMany` dengan kondisi (`WHERE amount/quantity >= jumlah`) di dalam transaksi interaktif Prisma — bukan baca-lalu-tulis. Dua order bersamaan pada wallet yang sama tidak bisa berdua lolos melebihi yang tersedia.
- **Fail-safe untuk data pasar:** kegagalan `MarketDataService.getTicker()` (mis. exchange tak terjangkau) ditangkap dan dicatat sebagai order `rejected` — bukan 503 polos tanpa jejak, dan saldo/posisi dijamin tidak berubah.
- Tidak ada short selling — SELL selalu divalidasi terhadap quantity posisi yang benar-benar dimiliki saat itu.

### Pengujian (hasil pada sesi ini)
- `npx tsc --noEmit` PASS, `npx eslint` PASS (0 error), `npx jest` PASS (75/75 unit test, +15 baru: WalletService 4, OrderService 11 — termasuk assersi numerik tangan atas slippage/fee/weighted-avg-entry-price), `npx jest --config test/jest-e2e.json` PASS (25/25 e2e test, +8 baru: wallet lazy-init, buy→sell round trip dengan assersi harga persis, saldo tak pernah negatif pada order yang jauh melebihi saldo, minimum notional, symbol tak didukung, reset, isolasi antar-user, wajib auth), `npx nest build` PASS.
- Smoke test manual melawan server & PostgreSQL nyata (bukan mock): register→login→`GET /wallet` (10.000 USDT default, tanpa exchange account) → `POST /orders` → **`201` dengan `status:"rejected", rejectReason:"MARKET_DATA_UNAVAILABLE"`** (Binance tak terjangkau dari sandbox — perilaku fail-safe yang benar) → `GET /orders` menampilkan order yang ditolak → `GET /wallet` membuktikan saldo tetap `10000`, tidak tersentuh → `POST /wallet/reset` berhasil.

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
