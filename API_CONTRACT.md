# API CONTRACT — GAIN (Niaga Koin)

> **Status:** Fase 2 (Auth), Fase 3 (Market Data), Fase 4a (Exchange Account Connection), Fase 4b (Paper Trading Core), Fase 5a (Bot Lifecycle), Fase 5b (Strategy Engine + Risk Engine), Fase 6a (Frontend Foundation: API Client + Auth Flow), dan Fase 6b (Dashboard: hubungkan ke API nyata) selesai — sisanya masih rancangan berdasarkan SDD §7, untuk dikonfirmasi/direvisi saat masing-masing fase implementasi berjalan. OpenAPI/Swagger otomatis dari kode belum digenerate (TBD, bisa ditambah saat modul bertambah banyak) — dokumen ini masih sumber kebenaran manual untuk sementara.

Base path: `/api/v1` (versioning wajib sejak awal — NFR-MAINT-005).

## Auth
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/auth/register` | 2 | **DONE** — `{email, password}` → `201 {userId, status, registrationToken}`. Email saja (bukan telepon — SMS gateway belum dipilih, lihat PROJECT_STATUS.md). Memanggil ulang untuk email yang sama berstatus `pending_verification` berfungsi sebagai resend OTP. |
| POST | `/auth/verify-otp` | 2 | **DONE** — Header `Authorization: Bearer <registrationToken>`, body `{code}` (6 digit) → `200 {verified: true}`. Salah kode 3x atau kedaluwarsa → daftar ulang untuk kode baru. |
| POST | `/auth/login` | 2 | **DONE** — `{email, password}` → `200 {accessToken, refreshToken}`. Lockout otomatis setelah `LOGIN_MAX_ATTEMPTS` (default 5) gagal berturut-turut, selama `LOGIN_LOCKOUT_MINUTES` (default 15). |
| POST | `/auth/2fa/verify` | — | **DITUNDA** (bukan TODO biasa) — FR-AUTH-003 berstatus Should Have di PRD, bukan Must Have; sengaja tidak dibangun di Fase 2 agar slice tetap fokus. Dipertimbangkan lagi bersama fitur Pusat Keamanan (Fase 7). |

Endpoint OTP saat ini **belum terhubung provider pengiriman nyata** — kode dikirim ke log aplikasi saja (`ConsoleOtpProvider`, dev-only, lihat `backend/src/auth/otp/`). Siap diganti begitu Notification Worker (Fase 7) ada.

**Konsumen nyata sejak Fase 6a:** `frontend/src/lib/auth.ts` (`register`/`verifyOtp`/`login`/`getMe`) + `LoginPage`/`RegisterPage`/`VerifyOtpPage` — kontrak di atas sekarang benar-benar dipakai UI, bukan hanya curl manual. `getMe` (`GET /users/me`) dipakai `AuthContext` untuk memvalidasi token tersimpan saat hidrasi sesi.

## Users
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/users/me` | 2 | **DONE** — butuh `Authorization: Bearer <accessToken>`. Tidak pernah mengembalikan `passwordHash`. |
| PATCH | `/users/me` | — | TODO — belum ada kebutuhan konkret field apa yang bisa diubah, ditunda sampai ada UI profil (F-USER-01, belum ada mockup). |

## Market Data (baru — tidak ada di SDD §7, ditambahkan Fase 3 karena PRD F-MKT-01/SRS FR-MKT-001 butuh cara bagi frontend membaca harga)
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/market-data/symbols` | 3 | **DONE** — `200 {symbols: string[]}`. Whitelist dari `MARKET_DATA_SUPPORTED_SYMBOLS` (default `BTCUSDT,ETHUSDT,SOLUSDT`, mengikuti pasangan aset di mockup desain — cakupan final masih `TBD` di SRS §6.1). |
| GET | `/market-data/ticker/{symbol}` | 3 | **DONE** — `200 {symbol, price, asOf}`. Publik, tidak butuh auth (data pasar bukan data pengguna). Symbol di luar whitelist → `400`. Kegagalan/timeout ke exchange → `503` (fail-safe, tidak pernah mengarang data). |
| GET | `/market-data/candles/{symbol}?interval=&limit=` | 3 | **DONE** — `200 Candle[]`. `interval` ∈ `1m,5m,15m,1h,4h,1d`; `limit` 1-500 (default 100). Validasi sama seperti ticker. |

Sumber data: Binance public REST (`BinanceMarketDataProvider`, `GET /api/v3/ticker/price`, `GET /api/v3/klines`) — tidak butuh API key (baca publik saja). Retry terbatas (default 2x) + timeout (default 5s) + cache in-memory per simbol (default TTL 5 detik, bukan Redis — belum diperlukan untuk skala MVP). **Belum diverifikasi terhadap Binance sungguhan di sesi ini** — sandbox pengembangan ini memblokir akses keluar ke `api.binance.com` (kebijakan organisasi); logic pemanggilan API sudah diuji lewat mock/fixture (unit + e2e), tapi konektivitas nyata **wajib dicek di mesin pengguna** (`curl https://api.binance.com/api/v3/ping`) sebelum fitur ini dianggap benar-benar tervalidasi end-to-end — lihat `CHANGELOG.md` Fase 3.

## Exchange (koneksi API key milik pengguna — beda dari Market Data publik di atas)
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/exchange-accounts` | 4a | **DONE** — dilindungi `JwtAuthGuard`. `{exchangeName: "binance", apiKey, apiSecret}` → validasi via signed call ke Binance `/api/v3/account`. Sukses: `201 {id, connectionStatus}`. Key dengan izin withdrawal aktif: `422 {error: "INVALID_PERMISSION_SCOPE"}` (BR-KEY-001, tanpa terkecuali). Kredensial tidak valid: `400 {error: "INVALID_CREDENTIALS"}`. Exchange tidak terjangkau: `503` (fail-safe — key TIDAK PERNAH disimpan tanpa tervalidasi). `exchangeName` di luar whitelist (`binance` satu-satunya untuk saat ini): `400`. |
| GET | `/exchange-accounts` | 4a | **DONE** — daftar milik pengguna yang login saja (difilter `user_id`), tidak pernah menyertakan credential. |
| DELETE | `/exchange-accounts/{id}` | 4a | **DONE** — `204` jika berhasil, `404` jika bukan milik pengguna yang login (tidak membocorkan keberadaan akun user lain). Kredensial terenkripsi ikut dihapus (hard delete, bukan soft-delete — user secara eksplisit minta putus koneksi). **Sejak Fase 5a:** bot (`active`/`paused`) yang bergantung pada koneksi ini otomatis dihentikan (`status: stopped`) sebelum koneksi dihapus (FR-EXC-002) — diuji e2e lintas modul. |

Kredensial disimpan terenkripsi AES-256-GCM (`CredentialsEncryptionService`, `backend/src/common/crypto/`) — kunci dari `CREDENTIALS_ENCRYPTION_KEY`, aplikasi menolak start tanpa variabel ini. **Konektivitas Binance sungguhan untuk endpoint ini juga belum diverifikasi di sesi ini** (alasan sama seperti Market Data — sandbox blokir egress) — logic teruji penuh lewat fake adapter ter-inject; verifikasi nyata wajib di mesin pengguna sebelum dianggap tervalidasi produksi.

## Paper Trading (baru — tidak ada di SDD §7 sebagai endpoint tersendiri; SDD merancang wallet/order lewat Bot+Portfolio Service. Ditambahkan Fase 4b karena master prompt secara eksplisit mengurutkan "paper trading dengan saldo virtual" dan "order/trade simulation" SEBELUM "bot lifecycle" — mesin simulasinya harus ada & teruji dulu sebelum bot memanggilnya di Fase 5)
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/wallet` | 4b | **DONE** — dilindungi `JwtAuthGuard`. `200 {balanceUsdt, positions: [{symbol, quantity, avgEntryPrice}]}`. Wallet dibuat otomatis (lazy) dengan saldo default `PAPER_TRADING_DEFAULT_BALANCE_USDT` (10,000 USDT) saat pertama diakses — **tidak butuh koneksi exchange/API key** (SRS §3.8). |
| POST | `/wallet/reset` | 4b | **DONE** — reset saldo ke default & hapus semua posisi. UI **wajib** menampilkan dialog konfirmasi sebelum memanggil ini (aksi ireversibel — lihat komponen `ResetBalanceModal` Fase 1). |
| POST | `/orders` | 4b | **DONE** — `{symbol, side: "buy"\|"sell", quantity}` → **selalu** `201`, isi body membedakan hasil: `status: "filled"` (dengan objek `trade`: `executedPrice, executedQuantity, fee, executedAt`) atau `status: "rejected"` (dengan `rejectReason`: `INSUFFICIENT_BALANCE` \| `INSUFFICIENT_POSITION` \| `BELOW_MIN_NOTIONAL` \| `MARKET_DATA_UNAVAILABLE`). Symbol di luar whitelist atau quantity ≤ 0 setelah pembulatan presisi → `400` (input error, order tidak dicatat sama sekali). Setiap percobaan (termasuk yang ditolak) dicatat untuk transparansi riwayat (SRS FR-ORD-002). |
| GET | `/orders?symbol=` | 4b | **DONE** — riwayat order milik pengguna yang login, terbaru dahulu. (Filter `status`/`from`/`to` dan `botId` masih `TODO` — akan ditambah Fase 5b/7 saat relevan.) |

Model eksekusi: harga dari `MarketDataService` (Fase 3) + slippage searah order (`PAPER_TRADING_SLIPPAGE_PERCENT`, default 0.05%, deterministik — bukan simulasi depth order book) + fee (`PAPER_TRADING_FEE_PERCENT`, default 0.1%). Quantity dibulatkan ke bawah sesuai `PAPER_TRADING_QUANTITY_PRECISION` (default 6 desimal, satu aturan generik untuk semua simbol — bukan LOT_SIZE per-simbol asli Binance, itu TBD). Debit saldo/posisi memakai UPDATE bersyarat (`WHERE amount >= totalCost`) di dalam transaksi database, bukan read-lalu-write terpisah — dua order bersamaan pada wallet yang sama tidak bisa berdua lolos melebihi saldo yang benar-benar tersedia. Tidak ada short selling (SELL divalidasi terhadap quantity posisi yang benar-benar dimiliki).

**Konsumen nyata sejak Fase 6b:** `frontend/src/lib/wallet.ts` (`getWallet`/`resetWallet`) + `frontend/src/lib/orders.ts` (`listOrders`) dipakai `DashboardPage` — `BalanceCard` menampilkan `balanceUsdt` nyata dan jumlah order `status:"filled"` yang dihitung dari `GET /orders` (bukan angka hardcode). **Tidak ada endpoint `/api/v1/portfolio` terpisah** — F-PORT-01 diputuskan cukup memakai `GET /wallet` yang sudah ada selama cuma satu sumber data (paper wallet); lihat `IMPLEMENTATION_PLAN.md` Fase 6b.

## Bots
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/bots` | 5a/5b | **DONE** — `{name, symbol, strategyType, parameters, riskLimits, exchangeAccountId?}` → `201`, bot baru selalu berstatus `stopped` (konfigurasi & pembuatan terjadi bersamaan, tidak ada state "Configured" terpisah dari SDD §9). `strategyType` saat ini hanya `"rsi"` (satu-satunya strategi yang benar-benar diimplementasikan) — nilai lain → `400`. **Sejak Fase 5b:** `parameters`/`riskLimits` divalidasi secara semantik, bukan cuma "objek JSON" — RSI `period` harus integer 2-100 (default 14), `oversold` 1-49 (default 30), `overbought` 51-99 (default 70) dan harus lebih besar dari `oversold`; nilai di luar rentang → `400` (FR-STRAT-002, lihat catatan PROPOSED default di bawah). `riskLimits.maxPositionUsdt` wajib angka positif → `400` jika tidak (FR-RISK-001). Symbol di luar whitelist Market Data → `400`. `exchangeAccountId` yang bukan milik pengguna → `404`. Batas jumlah bot per pengguna (`MAX_BOTS_PER_USER`, default 10) — pengganti sementara untuk limit per-tier langganan yang belum ada (F-SUB-01 masih gap). |
| GET | `/bots` | 5a | **DONE** — daftar bot milik pengguna yang login, terbaru dahulu. |
| GET | `/bots/{id}` | 5a | **DONE** — `404` jika bukan milik pengguna yang login. |
| PATCH | `/bots/{id}/start` | 5a | **DONE** — idempotent: memanggil pada bot yang sudah `active` mengembalikan state saat ini (`200`), bukan error. |
| PATCH | `/bots/{id}/pause` | 5a | **DONE** (baru — tidak ada di SDD §7, ditambahkan karena SDD §9 lifecycle punya state `Paused` terpisah dari `Stopped`, dan master prompt eksplisit menyebut "pause" sebagai aksi lifecycle sendiri). Hanya valid dari status `active`; idempotent jika sudah `paused`; `400` jika dipanggil dari `stopped`. |
| PATCH | `/bots/{id}/stop` | 5a | **DONE** — idempotent dari status manapun. |
| DELETE | `/bots/{id}` | 5a | **DONE** — `204` jika berhasil. `409` jika bot belum `stopped` (harus dihentikan dulu — bot yang masih berjalan tidak boleh langsung dihapus). |
| POST | `/bots/{id}/evaluate` | 5b | **DONE** (baru — bukan di SDD §7 sebagai endpoint tersendiri; SDD §5.3-5.5 merancang Strategy/Risk/Trading Engine sebagai alur internal event-driven via Market Data Worker + Message Queue, yang belum ada di stack MVP ini — lihat deviasi arsitektur di `PROJECT_STATUS.md`. Diganti dengan trigger manual sinkron, dipertimbangkan cukup untuk MVP). Menjalankan satu siklus penuh Strategy Engine → Risk Engine → Trading Engine untuk bot ini. `400` jika bot bukan `active`. `200` selalu untuk bot yang aktif — hasil (termasuk penolakan) ada di body: `{botId, signal: "buy"\|"sell"\|"hold", indicator, indicatorValue, executed: boolean, blockedReason: "MARKET_DATA_UNAVAILABLE"\|"MAX_POSITION_EXCEEDED"\|"NO_OPEN_POSITION"\|null, order}`. `order` hanya terisi jika `executed`/sinyal diteruskan ke `OrderService` (Fase 4b) — bisa `status: "rejected"` di sana juga (mis. `INSUFFICIENT_BALANCE`) meski Risk Engine sudah menyetujui, karena Risk Engine dan Trading Engine adalah gate terpisah (SDD §5.4-5.5). |

**Strategy Engine (FR-STRAT-001/002):** hanya RSI, dihitung dari `MarketDataService.getCandles` (interval `BOT_EVALUATE_CANDLE_INTERVAL`, default `1h`) memakai metode rata-rata sederhana atas `period+1` close terakhir (simplifikasi terdokumentasi, bukan Wilder smoothing rekursif penuh — sama semangatnya dengan model slippage paper trading). `rsi < oversold` → sinyal `buy`; `rsi > overbought` → sinyal `sell`; selain itu `hold`. Rentang parameter valid masih `TBD` resmi di SRS ("rentang final ditetapkan tim strategi") — nilai di atas adalah **default PROPOSED** (konvensi RSI 14/30/70 yang umum dikenal, bukan aturan bisnis yang dikarang), didokumentasikan eksplisit di sini dan `FEATURE_MATRIX.md`.

**Risk Engine (FR-RISK-001):** hanya `riskLimits.maxPositionUsdt` yang didukung (satu-satunya contoh konkret di SDD §5.4, "ukuran posisi maksimum"). Sinyal `buy` disetujui sebesar sisa headroom (`maxPositionUsdt - notional posisi saat ini`); jika headroom ≤ 0 → ditolak `MAX_POSITION_EXCEEDED`, tidak pernah diteruskan ke `OrderService` (acceptance criteria FR-RISK-001). Sinyal `sell` selalu disetujui untuk seluruh posisi yang ada (menutup posisi tidak pernah melanggar limit maksimum) — kecuali tidak ada posisi sama sekali → ditolak `NO_OPEN_POSITION`. **Posisi tidak per-bot** — `Balance`/`Position` tetap terikat `userId+symbol` (deviasi arsitektur yang sama sejak Fase 4b, lihat `PROJECT_STATUS.md`), jadi beberapa bot pada simbol yang sama berbagi eksposur yang sama. FR-RISK-002 (circuit breaker) tetap **DITUNDA** (Should Have, ambang belum kuantitatif di SRS — status sama seperti FR-AUTH-002).

**Trigger:** hanya manual (`POST /bots/{id}/evaluate`) di fase ini. Evaluasi otomatis berkala (bot "berjalan sendiri" tanpa dipanggil manual) **belum dibangun** — dipertimbangkan sebagai tambahan ringan (`@nestjs/schedule` in-process) di fase mendatang jika diperlukan, bukan komitmen Fase 5b.

**Konsumen nyata sejak Fase 6b:** `frontend/src/lib/bots.ts` (`listBots`/`startBot`/`pauseBot`/`stopBot`) dipakai `DashboardPage` — daftar bot + tombol start/pause/stop di `BotList` benar-benar memanggil endpoint di atas. `POST /bots` (wizard buat bot) dan `POST /bots/{id}/evaluate` **belum ada UI-nya** — itu Fase 6c/mendatang.

## Portfolio & Orders
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/portfolio` | 6c | TODO — **diputuskan Fase 6b: tidak dibangun untuk sekarang.** Akan mengagregasi `/wallet` (Fase 4b) lintas exchange/bot, tapi belum ada lebih dari satu sumber data untuk diagregasi (paper wallet saja) — `GET /wallet` yang sudah ada sudah cukup, lihat `IMPLEMENTATION_PLAN.md` Fase 6b. Dipertimbangkan lagi begitu ada exchange live terhubung. |
| GET | `/reports/pnl?botId=&period=` | 7 | TODO — F-AN-01, belum dibangun. |

## Admin
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/admin/users` | 7 | TODO |
| PATCH | `/admin/users/{id}/suspend` | 7 | TODO |
| GET | `/admin/audit-logs` | 7 | TODO |

## System
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/health` | 1 | **DONE** — `backend/src/health/health.controller.ts`. Response: `{status, timestamp, database, tradingMode, liveTradingEnabled}` |

## Belum Ditentukan
- Endpoint whitelist alamat withdrawal (lihat `PROJECT_STATUS.md` §3.2) — **tidak didefinisikan sampai ada keputusan produk**.
- Endpoint subscription/langganan (F-SUB-01) — gap requirement, belum ada rancangan.
- Endpoint notifikasi (preferensi channel) — belum ada di SDD, akan ditambah saat Fase 7 jika masuk scope.

## Aturan Kontrak (berlaku untuk seluruh endpoint saat diimplementasikan)
- Seluruh query data pengguna difilter `user_id` dari token tervalidasi.
- Endpoint admin dilindungi RBAC.
- Error response konsisten, tidak membocorkan detail internal/secret.
- Endpoint sensitif (login, OTP, trading) punya rate limiting.
- Operasi start/stop bot bersifat idempotent.

## Infrastruktur Auth Siap Dipakai Modul Lain (sejak Fase 2)
- `JwtAuthGuard` (`backend/src/auth/guards/jwt-auth.guard.ts`) — pasang `@UseGuards(JwtAuthGuard)` di controller mana pun yang butuh login.
- `RolesGuard` + `@Roles('admin')` (`backend/src/auth/guards/roles.guard.ts`, `decorators/roles.decorator.ts`) — siap dipasang begitu endpoint admin pertama dibangun (Fase 7). Diuji unit (403 untuk role salah), belum ada endpoint nyata untuk uji e2e penuh — dicatat sebagai utang pembuktian di `FEATURE_MATRIX.md`.
- `req.user` (dari `JwtAuthGuard`) berisi `{id, role}` — dipakai untuk memfilter query per `user_id` di modul manapun.
- Rate limit global 60 req/menit (`ThrottlerGuard` di `AppModule`), endpoint auth di-override ke 10 req/menit.
