# PROJECT STATUS — GAIN (Niaga Koin)

> Dokumen ini adalah ringkasan proyek yang dapat digunakan kembali di setiap fase, sesuai ATURAN EFISIENSI KREDIT AI pada MASTER_PROMPT. **Jangan membaca ulang seluruh PRD/SRS/SDD di fase berikutnya — baca dokumen ini dulu.**
>
> Terakhir diperbarui: 2026-09-22 (Fase 6a — Frontend Foundation: API Client + Auth Flow, DONE)

---

## 1. Ringkasan Eksekutif

Repository `Niaga-Koin-v1` sebelum sesi ini **kosong** (hanya `README.md` satu baris, commit tunggal). Tidak ada backend, tidak ada aplikasi frontend, tidak ada konfigurasi, tidak ada test. Ini adalah proyek **greenfield** — bukan proyek existing yang perlu diperbaiki.

Yang sudah tersedia (diimpor ke repo pada Fase 0 ini):
- 5 dokumen sumber kebenaran (PRD, SRS, SDD, Audit Integrasi, Riset Kompetitor) → `docs/reference/`.
- Master prompt pembangunan → `docs/reference/MASTER_PROMPT_BUILD_GAIN_FULLSTACK_HEMAT_KREDIT.txt`.
- Export desain UI/UX dari Stitch (Google AI Studio) → `docs/design/stitch-export/`. **Ini BUKAN aplikasi frontend yang berfungsi** — lihat Bagian 3.

Live trading **tidak diimplementasikan dan tidak boleh diaktifkan** pada fase manapun sampai ada persetujuan eksplisit + audit keamanan + kejelasan hukum (Bappebti/OJK) — status `BLOCKED` konsisten di seluruh dokumen sumber.

## 2. Struktur Repository Saat Ini

```
Niaga-Koin-v1/
├── README.md                   (instruksi run lokal — sudah bisa diikuti)
├── PROJECT_STATUS.md
├── IMPLEMENTATION_PLAN.md
├── FEATURE_MATRIX.md
├── API_CONTRACT.md
├── .env.example
├── CHANGELOG.md
├── docker-compose.yml           (PostgreSQL lokal)
├── docs/
│   ├── reference/                (5 dokumen sumber + master prompt)
│   └── design/stitch-export/     (10 mockup layar statis + design tokens + logo)
├── backend/                      (NestJS + Prisma + PostgreSQL — modular monolith)
│   ├── src/{config,health,prisma}/
│   ├── prisma/schema.prisma + migrations/
│   └── test/ (e2e)
└── frontend/                     (React + TS + Vite + Tailwind)
    └── src/{components,pages,lib,styles}/
```

**Belum ada:** proses `worker/` terpisah (baru dibutuhkan mulai Fase 3 — market data), CI config. Model database masih minimal (`User` saja) — model trading (bots, orders, dst.) ditambah bertahap per fase sesuai kebutuhan fitur, bukan sekaligus.

## 3. Status Desain UI (Penting)

File `stitch_gain_trading_platform_ui_ux_design_system.zip` berisi **export statis dari alat desain Stitch**, bukan source code aplikasi:
- 10 folder layar, masing-masing berisi `code.html` (HTML statis + Tailwind CDN + data contoh hardcoded, tanpa framework, tanpa state management, tanpa pemanggilan API) dan `screen.png` (screenshot referensi visual).
- 1 folder `gain_monogram_logo/` — hanya aset logo (screen.png).
- 1 folder `gain_trading_terminal/` — hanya `DESIGN.md` (design tokens: warna, tipografi, spacing, elevation, komponen).

**Implikasi:** Instruksi master prompt "UI/frontend GAIN sudah dibuat, jangan membangun ulang" perlu ditafsirkan sebagai **"desain visual sudah difinalisasi, gunakan sebagai sumber kebenaran tampilan"** — bukan "aplikasi frontend yang tinggal disambungkan ke API", karena secara teknis belum ada aplikasi frontend (framework, routing, komponen reusable, state, API client) sama sekali. Fase 1+ perlu membangun aplikasi frontend nyata (lihat rekomendasi stack di Bagian 5) yang mereplikasi tampilan `code.html` ini secara pixel-faithful memakai token dari `DESIGN.md`, lalu menyambungkannya ke API asli secara bertahap.

### 3.1 Daftar 10 Layar Desain → Pemetaan Fitur PRD

| Folder | Judul Layar | Fitur PRD Terkait |
|---|---|---|
| `dashboard_paper_trading_mobile` | Dashboard mobile — saldo virtual, bot aktif, mode Paper/Live switcher (Live terkunci) | F-DASH-01, F-PAPER-01 |
| `buat_bot_baru_validasi_risk_engine` | Wizard buat bot: alokasi modal, parameter strategi, pengaman risiko keras | F-BOT-01, F-STRAT-01/02, F-RISK-01 |
| `detail_bot_analitik_performa` | Detail bot: kurva ekuitas, parameter strategi aktif, log eksekusi & sinyal | F-BOT-01, F-AN-01 |
| `exchange_api_connection_brankas_kunci_scr_05` | Koneksi API exchange — input kunci ke "brankas" | F-EXC-01 |
| `portfolio_alokasi_saldo_scr_06` | Portofolio & alokasi aset, distribusi komposisi koin | F-PORT-01 |
| `riwayat_order_simulasi_slippage_scr_07` | Riwayat order + audit slippage simulasi | F-ORD-01 (paper) |
| `pusat_keamanan_audit_trail_scr_08` | Pusat Keamanan: proteksi & otentikasi, audit trail | F-SEC-01, F-AUTH-03 |
| `konfirmasi_putuskan_sesi_scr_08_modal` | Modal konfirmasi "putuskan semua sesi lain" | F-SEC-01, session management |
| `pusat_keamanan_sesi_dicabut_log_audit_scr_08_sukses` | State sukses setelah sesi dicabut | F-SEC-01 |
| `tambah_alamat_whitelist_24h_timelock_modal` | Modal tambah alamat whitelist dengan timelock 24 jam | **Lihat konflik 3.2** |
| `gain_monogram_logo` | Aset logo saja | — |
| `gain_trading_terminal` | `DESIGN.md` — token desain, bukan layar | — (referensi lintas layar) |

### 3.2 KONFLIK yang Ditemukan (butuh keputusan Product Owner)

**Fitur whitelist alamat withdrawal dengan timelock 24 jam** muncul eksplisit di desain (`tambah_alamat_whitelist_24h_timelock_modal`), tetapi requirement teknisnya di SRS (**FR-USER-002** — "Kelola Alamat Penarikan/Rekening Referensi") berstatus `TBD` dengan catatan eksplisit: *"Kemungkinan tidak diperlukan pada v1 karena dana tetap di exchange"* (SRS §4.2), dan Audit Integrasi menandai ini sebagai fitur yang "perlu keputusan apakah benar-benar diperlukan mengingat sistem tidak mengkustodi dana."

Desain UI sudah mengasumsikan fitur ini ada dan cukup matang (timelock 24 jam, log audit terpisah). Ini **bukan hanya gap dokumentasi** — ini keputusan produk/keamanan yang mengubah scope backend (perlu tabel `WITHDRAWAL_WHITELIST`, business rule timelock, endpoint baru yang belum ada di SDD §7). **Tidak diimplementasikan sampai ada keputusan eksplisit** — lihat RISIKO/BLOCKER pada laporan Fase 0.

### 3.3 Fitur Must-Have PRD **tanpa** layar desain yang tersedia

Tidak ada mockup untuk: Registrasi/Login/OTP (F-AUTH-01), 2FA setup (F-AUTH-02, hanya disebut sebagai item di Pusat Keamanan tanpa alur lengkap), Profil pengguna (F-USER-01), tampilan Market Data mandiri (F-MKT-01), Panel Admin (F-ADM-01), pengaturan Notifikasi (F-NOTIF-01), halaman Langganan (F-SUB-01 — konsisten dengan gap di Audit Integrasi). Layar-layar ini perlu didesain kemudian atau dibangun dengan UI minimal konsisten-token mengikuti `DESIGN.md` sampai desain resmi tersedia — **ditandai TBD, jangan diasumsikan.**

## 4. Status Backend

**Fase 1 (Foundation), Fase 2 (Authentication), Fase 3 (Market Data), Fase 4a (Exchange Account Connection), Fase 4b (Paper Trading Core), Fase 5a (Bot Lifecycle), dan Fase 5b (Strategy Engine + Risk Engine) selesai.** Backend NestJS modular monolith berjalan, dengan:
- `GET /api/v1/health` — mengecek konektivitas database, mengembalikan `tradingMode: "paper-only"` dan `liveTradingEnabled: false` secara eksplisit di setiap response.
- **Kill switch keselamatan finansial di level boot:** `backend/src/config/env.validation.ts` membuat aplikasi **menolak untuk start** jika `LIVE_TRADING_ENABLED=true` — diverifikasi dengan test otomatis dan smoke test manual (proses exit dengan error, bukan diam-diam mengizinkan).
- Prisma + PostgreSQL terhubung, migration diterapkan (`init_users`, `auth_fields`).
- Logging terstruktur JSON (pino) dengan redaction header `authorization`/`cookie`.
- Helmet (security headers) + CORS aktif di `main.ts`.
- **Auth (Fase 2):** `POST /auth/register` (email + password, OTP 6-digit dev-only via `ConsoleOtpProvider`), `POST /auth/verify-otp` (dilindungi token registrasi sementara terpisah dari access token), `POST /auth/login` (JWT access 15m + refresh 7d, lockout 5x gagal → kunci 15 menit), `GET /users/me` (dilindungi `JwtAuthGuard`). RBAC (`RolesGuard`/`@Roles()`) siap dipakai modul lain, diuji unit — belum ada endpoint admin nyata untuk uji e2e penuh (menunggu Fase 7). Rate limiting global + endpoint-level (NFR-SEC-007). Password & kode OTP di-hash (bcryptjs), tidak pernah plaintext.
- **Market Data (Fase 3):** `GET /market-data/symbols`, `GET /market-data/ticker/{symbol}`, `GET /market-data/candles/{symbol}` — publik (tanpa auth). Adapter Binance (`BinanceMarketDataProvider`) di belakang interface `MarketDataProvider` (pola adapter SDD §5.2, siap tambah exchange lain tanpa ubah service/controller). Retry terbatas + timeout + cache in-memory per simbol. Symbol whitelist tervalidasi sebelum memanggil exchange. Kegagalan koneksi → `503` eksplisit (fail-safe), bukan data palsu. **Konektivitas nyata ke `api.binance.com` tidak bisa diverifikasi di sandbox ini** (egress diblokir kebijakan organisasi — dikonfirmasi via curl, `403 connect_rejected`) — logic sudah teruji penuh via mock/fake provider, tapi pengguna **wajib verifikasi manual di mesin sendiri** sebelum menganggap ini tervalidasi end-to-end sungguhan.
- **Exchange Account Connection (Fase 4a):** `POST /exchange-accounts`, `GET /exchange-accounts`, `DELETE /exchange-accounts/{id}` — dilindungi `JwtAuthGuard`, difilter per `userId` (satu user tidak bisa melihat/hapus akun exchange user lain — diuji e2e). Kredensial dienkripsi AES-256-GCM sebelum disimpan (`CredentialsEncryptionService`, kunci dari `CREDENTIALS_ENCRYPTION_KEY`, app gagal start jika env ini kosong). Adapter Binance terautentikasi (`BinanceExchangeAdapter`) memvalidasi key via signed call ke `/api/v3/account`; key dengan izin withdrawal **selalu ditolak** (BR-KEY-001, `422 INVALID_PERMISSION_SCOPE`) — tidak pernah disimpan. Kredensial tidak valid → `400`; exchange tak terjangkau → `503` (key tidak pernah diterima tanpa tervalidasi). Refactor kecil: helper retry/timeout dipindah ke `common/http/` agar dipakai bareng Market Data & Exchange (menghindari duplikasi).
- **Paper Trading Core (Fase 4b):** `GET /wallet`, `POST /wallet/reset`, `POST /orders`, `GET /orders?symbol=` — dilindungi `JwtAuthGuard`. Wallet virtual (10.000 USDT default) dibuat lazy, **tidak butuh koneksi exchange/API key** (SRS §3.8 ditegakkan, bukan cuma didokumentasikan). Simulator order market: harga dari `MarketDataService` + slippage deterministik + fee, semua dapat dikonfigurasi via env. **Setiap percobaan order dicatat**, termasuk yang ditolak — saldo tidak cukup, posisi tidak cukup (tidak ada short selling), di bawah minimum notional, atau data pasar tak tersedia. Debit saldo/posisi pakai UPDATE bersyarat di dalam transaksi database (aman dari race condition dua order bersamaan). Model Prisma `Balance`/`Position`/`Order`/`Trade` mengikuti pola SDD §6.2 (satu set tabel untuk paper & live, dibedakan `is_paper`) dengan satu penyimpangan terdokumentasi: diikat ke `userId`, bukan `exchangeAccountId`/`botId` (karena paper trading tidak wajib exchange account) — lihat `IMPLEMENTATION_PLAN.md` Fase 4b untuk detail lengkap.
- **Bot Lifecycle (Fase 5a):** `POST/GET /bots`, `GET /bots/{id}`, `PATCH .../start|pause|stop`, `DELETE /bots/{id}` — dilindungi `JwtAuthGuard`, difilter per `userId`. Bot baru selalu `stopped`; `start`/`stop` idempotent; `pause` hanya valid dari `active`; hapus hanya diizinkan saat `stopped` (`409` jika masih berjalan). Batas jumlah bot per pengguna (`MAX_BOTS_PER_USER`) sebagai pengganti sementara limit langganan (F-SUB-01 masih gap). **Menuntaskan TODO Fase 4a:** memutuskan koneksi exchange kini benar-benar menghentikan bot `active`/`paused` yang bergantung padanya (FR-EXC-002), diuji e2e lintas modul.
- **Strategy Engine + Risk Engine (Fase 5b):** bot sekarang benar-benar **berdagang**. `POST /bots/{id}/evaluate` (dilindungi `JwtAuthGuard`, `400` jika bot bukan `active`) menjalankan satu siklus Strategy Engine → Risk Engine → `OrderService` (Fase 4b) secara sinkron. Strategy Engine (`StrategyEngineService` + `RsiStrategy`, `backend/src/strategy/`) menghitung RSI dari candle `MarketDataService`, memvalidasi semantik `parameters` sejak `BotsService.create` (FR-STRAT-002, rentang default PROPOSED — SRS menandainya `TBD`). Risk Engine (`RiskEngineService`, `backend/src/risk/`) memvalidasi sinyal terhadap `riskLimits.maxPositionUsdt` (FR-RISK-001) — sinyal yang ditolak **tidak pernah** mencapai `OrderService`, dicatat lewat structured log. FR-RISK-002 (circuit breaker) tetap **DITUNDA**. Trigger masih **manual saja** — evaluasi otomatis berkala belum dibangun (TODO fase mendatang). Diuji lewat fake market-data provider (deterministik) + **dibuktikan lewat smoke test manual terhadap server nyata**, termasuk membuktikan fail-safe `MARKET_DATA_UNAVAILABLE` saat Binance sungguhan tak terjangkau di sandbox ini.
- Model database: `User` (+role, lockout), `OtpChallenge`, `ExchangeAccount`, `ApiCredential`, `Balance`, `Position`, `Order`, `Trade`, `Bot`.

## 4a. Status Frontend

**Fase 1 (replika visual statis) dan Fase 6a (fondasi API client + alur auth) selesai.** Frontend React + Vite + Tailwind:
- **Fase 1:** `DashboardPage` mereplikasi `docs/design/stitch-export/dashboard_paper_trading_mobile` pixel-faithful dengan token desain asli, **masih data mock** (belum terhubung backend).
- **Fase 6a:** `frontend/src/lib/api.ts` (fetch wrapper tipis, `ApiError`) + `frontend/src/lib/auth.ts` (request functions sesuai `API_CONTRACT.md`) + `AuthContext` (sesi via `localStorage`, hidrasi tervalidasi lewat `GET /users/me`) + routing (`react-router-dom`, dependency pertama di luar React/Vite/Tailwind) + `ProtectedRoute`. Halaman baru **tanpa mockup Stitch** (F-AUTH-01 tidak punya desain — lihat §3.3): `LoginPage`, `RegisterPage`, `VerifyOtpPage`, dibangun dengan token desain yang sama, bukan gaya baru. `AppHeader` kini punya aksi logout nyata.
- **Dashboard (`DashboardPage`) tetap memakai `MOCK_BOTS`/saldo hardcoded** — menghubungkannya ke `GET /wallet`/`GET /bots` sungguhan adalah Fase 6b, belum dikerjakan.
- **Dibuktikan lewat browser sungguhan** (Playwright/Chromium terhadap `vite dev` + backend nyata, bukan cuma unit test bermock): alur penuh register → baca OTP dari log backend nyata → verify → login → dashboard → sesi bertahan setelah hard reload → logout → redirect proteksi rute bekerja.
- Model database frontend-side: token disimpan di `localStorage` (`gain_access_token`/`gain_refresh_token`), tidak pernah di cookie/sessionStorage — perilaku "logout di satu tab tidak otomatis logout tab lain" adalah trade-off yang diketahui, bukan bug, dan belum jadi prioritas untuk MVP.

## 5. Keputusan Arsitektur — DIKONFIRMASI (2026-09-21)

Pengguna mengonfirmasi memakai stack sederhana yang diusulkan (bukan stack penuh SDD v1.0). Ini **penyimpangan terdokumentasi dari SDD** (sesuai instruksi "Dokumentasikan setiap penyimpangan dari SDD"), dipilih untuk menghindari over-engineering di MVP:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS. Token desain (`tailwind.config.js`) disalin **verbatim** dari config Tailwind yang di-generate Stitch di `code.html`, bukan ditulis ulang dari `DESIGN.md` — karena `code.html` adalah yang benar-benar menghasilkan `screen.png` yang disetujui (ada sedikit perbedaan `borderRadius` antara `DESIGN.md` dan `code.html`; `code.html` dijadikan ground truth, lihat komentar di `frontend/tailwind.config.js`).
- **Backend:** Node.js + TypeScript (NestJS), modular monolith satu proses. Worker terpisah (market data, strategy/risk/paper-trading loop) **belum dibuat** — ditambahkan mulai Fase 3 saat benar-benar dibutuhkan, bukan sekarang.
- **Database:** PostgreSQL saja (tanpa TimescaleDB).
- **Cache/Queue:** Redis **belum ditambahkan** — akan ditambah saat sebuah fitur (real-time dashboard/worker coordination) benar-benar membutuhkannya.
- **Secrets:** environment variables (`.env`, digitignore) untuk development; **bukan** HashiCorp Vault. Harus di-upgrade sebelum ada dana riil/produksi publik.
- **Exchange:** Binance dikonfirmasi sebagai exchange pertama (public REST/WS untuk market data; API key trade-only untuk saldo read-only saat Fase 3+). Order execution riil tetap `BLOCKED`.
- **Saldo virtual awal paper trading:** dikonfirmasi **10,000 USDT** (mengikuti nilai default di mockup desain) — sudah dipakai sebagai konstanta di `.env.example` (`PAPER_TRADING_DEFAULT_BALANCE_USDT`) dan di komponen `ResetBalanceModal` frontend.
- **Fitur whitelist alamat withdrawal + timelock 24 jam** (dari desain, gap di SRS): **default aman diambil — TIDAK diimplementasikan di MVP.** Sistem tidak mengkustodi dana sehingga fitur ini tidak punya dasar kebutuhan yang jelas (selaras dengan catatan SRS FR-USER-002). Tetap `BLOCKED` di `FEATURE_MATRIX.md` sampai ada keputusan eksplisit sebaliknya dari Product Owner.

## 6. Aturan Keselamatan Finansial — Status

- Paper trading = satu-satunya mode yang ada di kode saat ini (belum ada modul trading sama sekali, jadi belum ada modul live untuk disalahgunakan).
- `LIVE_TRADING_ENABLED` ditegakkan sebagai kill switch di level boot aplikasi (lihat Bagian 4) — **diuji otomatis** (`env.validation.spec.ts`) dan **diverifikasi manual** (proses gagal start saat `LIVE_TRADING_ENABLED=true`).
- Endpoint `/api/v1/health` secara eksplisit melaporkan `tradingMode`/`liveTradingEnabled` — status paper/live tidak pernah ambigu bagi siapa pun yang memonitor sistem.
- Belum ada endpoint/kode yang memanggil order eksekusi riil exchange (`ExchangeAdapter` Fase 4a hanya punya `checkPermissions` — tidak ada `placeOrder`, disengaja; `MarketDataProvider` Fase 3 juga tidak punya; `OrderService` Fase 4b hanya mensimulasikan, tidak pernah memanggil Exchange Adapter sama sekali). Ini tetap berlaku meski bot kini bisa "berdagang" sejak Fase 5b — `BotEvaluationService` hanya memanggil `OrderService` (paper), tidak pernah `ExchangeAdapter`.
- **Prinsip fail-safe (SDD §2 prinsip #8) sudah dibuktikan nyata, bukan cuma diklaim, di TIGA lapisan berbeda**: (1) Market Data (Fase 3) — exchange tak terjangkau → `503`; (2) Exchange Account (Fase 4a) — API key tidak pernah disimpan tanpa tervalidasi; (3) Paper Trading (Fase 4b) — saat harga pasar tidak tersedia, order dicatat `rejected` dengan alasan `MARKET_DATA_UNAVAILABLE` dan saldo/posisi **tidak pernah tersentuh** — dibuktikan lewat smoke test manual melawan server & database nyata (bukan simulasi test doubles saja).
- **Validasi saldo tahan race condition:** debit saldo (BUY) dan pengurangan posisi (SELL) memakai UPDATE bersyarat (`WHERE amount/quantity >= jumlah`) di dalam transaksi database — bukan baca-lalu-tulis terpisah yang rentan dua request bersamaan sama-sama lolos melebihi saldo yang benar-benar ada.
- API key/secret exchange pengguna dienkripsi AES-256-GCM at-rest (NFR-SEC-005/006), kunci terpisah dari database (env var `CREDENTIALS_ENCRYPTION_KEY`, bukan hardcoded/disimpan di kolom yang sama). Key dengan izin withdrawal **selalu ditolak sebelum disimpan** (BR-KEY-001) — dibuktikan lewat unit + e2e test, bukan cuma dijanjikan di dokumen.
- Tidak ada secret di source/log/DB plaintext: `backend/.env` (berisi kredensial dev lokal) ada di `.gitignore` root sejak commit pertama kode; log pino me-redact header `authorization`/`cookie` (diverifikasi lagi di Fase 2 — token JWT di header `Authorization` tampil `[Redacted]` di log e2e).
- Password & kode OTP di-hash (bcryptjs) — tidak pernah plaintext di DB. Error login tidak pernah membedakan "email tidak ada" vs "password salah" (cegah user enumeration).
- Isolasi data antar pengguna: query `exchange-accounts`, `wallet`, `orders`, dan `bots` difilter `userId` di WHERE clause — satu pengguna tidak bisa melihat/mengubah data pengguna lain (diuji e2e eksplisit untuk semuanya, bukan asumsi).
- Bot kini bisa mengeksekusi order paper (Fase 5b), tapi **hanya lewat trigger manual** (`POST /bots/{id}/evaluate`) — tidak ada evaluasi otomatis/terjadwal yang berjalan sendiri di latar belakang, jadi tidak ada risiko "bot lepas kendali" tanpa sepengetahuan pengguna. Risk Engine (FR-RISK-001) adalah gate wajib yang ditegakkan SEBELUM `OrderService` dipanggil, bukan opsional — diuji unit + e2e bahwa sinyal yang ditolak tidak pernah membuat order.
- Kolom `is_paper` kini benar-benar ditegakkan di tabel transaksional (`Balance`, `Position`, `Order`, `Trade` — dibuat Fase 4b), bukan cuma direncanakan.

## 7. Cara Menjalankan Proyek Saat Ini

**Bisa dijalankan penuh secara lokal** — lihat `README.md` untuk instruksi lengkap. Ringkasan:
1. `docker compose up -d` (PostgreSQL).
2. `cd backend && npm install && cp ../.env.example .env && npx prisma migrate deploy && npm run start:dev` → `http://localhost:3000/api/v1/health`.
3. `cd frontend && npm install && cp .env.example .env && npm run dev` → `http://localhost:5173` — redirect otomatis ke `/login`. Alur register → verify-otp (baca kode dari terminal backend) → login → dashboard (masih data mock, Fase 6b) → logout, semua bisa dicoba nyata di browser sejak Fase 6a.
4. Alur auth nyata juga bisa dicoba lewat curl (tanpa UI): `POST /api/v1/auth/register` → baca kode OTP dari log terminal backend → `POST /api/v1/auth/verify-otp` (header `Authorization: Bearer <registrationToken>`) → `POST /api/v1/auth/login` → `GET /api/v1/users/me` (header `Authorization: Bearer <accessToken>`). Detail lengkap di `API_CONTRACT.md`.
5. Market data: `curl http://localhost:3000/api/v1/market-data/ticker/BTCUSDT`. **Penting:** di mesin pengguna (bukan sandbox ini) ini akan benar-benar memanggil Binance — pastikan koneksi internet aktif; jika belum pernah dicoba, verifikasi dulu dengan `curl https://api.binance.com/api/v3/ping` di luar aplikasi.
6. Koneksi exchange: `POST /api/v1/exchange-accounts` (header `Authorization: Bearer <accessToken>`, body `{exchangeName:"binance", apiKey, apiSecret}`) — sama seperti market data, ini benar-benar memanggil Binance di mesin pengguna.
7. Paper trading: `GET /api/v1/wallet` (saldo virtual dibuat otomatis, tidak butuh koneksi exchange) → `POST /api/v1/orders` (body `{symbol:"BTCUSDT", side:"buy", quantity:0.01}`) → `GET /api/v1/orders`. Butuh Binance benar-benar terjangkau agar order bisa `filled` (bukan `rejected` dengan alasan `MARKET_DATA_UNAVAILABLE`).
8. Bot: `POST /api/v1/bots` (body `{name, symbol:"BTCUSDT", strategyType:"rsi", parameters:{period:14,oversold:30,overbought:70}, riskLimits:{maxPositionUsdt:500}}`) → `PATCH /api/v1/bots/{id}/start` → `POST /api/v1/bots/{id}/evaluate` — menjalankan satu siklus Strategy Engine → Risk Engine → paper order. Butuh Binance benar-benar terjangkau agar candle nyata terambil (kalau tidak, hasilnya `blockedReason: "MARKET_DATA_UNAVAILABLE"`, bukan error — fail-safe by design).

Diverifikasi end-to-end pada sesi ini: lint, typecheck, unit test backend (116) + frontend (30), e2e test backend (36, melawan PostgreSQL nyata), production build backend + frontend, boot smoke test, screenshot visual dashboard (Fase 1), alur auth/market-data/exchange/paper-trading/bot/evaluate penuh via curl manual — termasuk pembuktian nyata jalur fail-safe (kill switch live trading, 503 saat exchange tak terjangkau, order ditolak aman tanpa menyentuh saldo, disconnect exchange otomatis menghentikan bot terkait, evaluate mengembalikan `MARKET_DATA_UNAVAILABLE` bukan data karangan saat Binance tak terjangkau) — dan sejak Fase 6a, alur auth frontend penuh (register→verify-otp→login→dashboard→reload→logout) diverifikasi lewat browser sungguhan (Playwright), bukan cuma test bermock — lihat `CHANGELOG.md` untuk rincian per fase.

## 8. Dokumen Terkait

- `IMPLEMENTATION_PLAN.md` — rencana per fase.
- `FEATURE_MATRIX.md` — status implementasi per fitur.
- `API_CONTRACT.md` — kontrak endpoint (skeleton, akan diisi bertahap).
- `.env.example` — variabel environment yang diantisipasi.
- `CHANGELOG.md` — riwayat perubahan per fase.
- `docs/reference/` — PRD, SRS, SDD, Audit Integrasi, Riset Kompetitor, Master Prompt.
- `docs/design/stitch-export/` — mockup layar & design tokens.
