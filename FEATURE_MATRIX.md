# FEATURE MATRIX — GAIN (Niaga Koin)

> Status per fitur. Diperbarui setiap fase menyelesaikan/mengubah suatu fitur — jangan buat dokumen status terpisah per fitur. Legenda status: `DONE` / `PARTIAL` / `TODO` / `BLOCKED` / `TBD`.

| Feature ID | Nama Fitur | Halaman UI (desain) | Endpoint/Service (rencana) | Status Implementasi | Status Pengujian | Dependency | Risiko |
|---|---|---|---|---|---|---|---|
| F-SYS-01 | Health Check & Observability Dasar | — | `GET /api/v1/health` | **DONE** | **DONE** (unit + e2e) | PostgreSQL | — |
| F-AUTH-01 | Registrasi & Login | *(belum ada mockup)* | `/api/v1/auth/register`, `/auth/login`, `/auth/verify-otp` | **DONE** (email saja; OTP dev-only, belum ada provider nyata) | **DONE** (26 unit test + 5 e2e test, termasuk smoke test manual penuh) | ~~Layanan OTP~~ selesai lewat `OtpProvider` dev-console — provider nyata masih TBD | Rendah untuk sekarang; risiko pindah ke provider nyata saat Fase 7 |
| F-AUTH-02 | 2FA | Disebut sebagai item di `pusat_keamanan_audit_trail_scr_08` (tanpa alur setup lengkap) | `/api/v1/auth/2fa/verify` | **DITUNDA** (keputusan sadar — Should Have, bukan Must Have, lihat `API_CONTRACT.md`) | — | F-AUTH-01 (selesai) | Alur setup 2FA belum didesain penuh; dipertimbangkan lagi bersama Fase 7 |
| F-AUTH-04 | RBAC (role user/admin) | — | `RolesGuard`/`@Roles()` (infrastruktur) | **DONE** (infrastruktur); **PARTIAL** (belum ada endpoint admin nyata untuk uji e2e) | **DONE** (unit test 403/allow), e2e penuh menunggu endpoint admin pertama | F-AUTH-01 | Rendah — logic diuji, hanya menunggu konsumen nyata (Fase 7) |
| F-USER-01 | Profil Pengguna | *(belum ada mockup)* | `GET /api/v1/users/me` (baca) — **DONE**; `PATCH` (ubah) — TODO | **PARTIAL** | **DONE** untuk bagian yang ada (e2e) | F-AUTH-01 (selesai) | — |
| F-EXC-01 | Koneksi API Exchange | `exchange_api_connection_brankas_kunci_scr_05` | `/api/v1/exchange-accounts` | TODO | TODO | F-AUTH-01, Binance API | Validasi trade-only wajib; kebocoran key = risiko finansial |
| F-MKT-01 | Data Harga & Candle | *(embedded di beberapa layar, belum ada layar mandiri)* | Market Data Worker (internal) + WS ke frontend | TODO | TODO | Exchange API eksternal | Ketergantungan uptime pihak ketiga |
| F-STRAT-01/02 | Pilih & Kustomisasi Strategi | `buat_bot_baru_validasi_risk_engine` | `/api/v1/bots` (embedded config) | TODO | TODO | F-MKT-01 | Rentang parameter valid masih `TBD` di SRS |
| F-BOT-01 | Lifecycle Bot | `buat_bot_baru_validasi_risk_engine`, `detail_bot_analitik_performa` | `/api/v1/bots/*` | TODO | TODO | F-EXC-01, F-STRAT-01 | — |
| F-PAPER-01 | Mode Paper Trading | `dashboard_paper_trading_mobile` (toggle Paper/Live, Live terkunci) | Trading Engine internal (paper path) | TODO | TODO | F-BOT-01 | Wajib isolasi total dari live sejak desain DB |
| F-PORT-01 | Portofolio & Alokasi | `portfolio_alokasi_saldo_scr_06` | `/api/v1/portfolio` | TODO | TODO | F-PAPER-01 | — |
| F-ORD-01 | Riwayat Order & Slippage | `riwayat_order_simulasi_slippage_scr_07` | `/api/v1/orders` | TODO | TODO | F-PAPER-01 | Model slippage simulasi `TBD` di SDD §9 |
| F-RISK-01/02 | Risk Engine & Circuit Breaker | Bagian "Pengaman Risiko Keras" di `buat_bot_baru_validasi_risk_engine` | Internal, gate wajib sebelum eksekusi | TODO | TODO | F-STRAT-01 | Ambang circuit breaker belum kuantitatif (SRS FR-RISK-002) |
| F-AN-01 | Laporan PnL / Analitik Bot | `detail_bot_analitik_performa` | `/api/v1/reports/pnl` | TODO | TODO | F-ORD-01 | — |
| F-NOTIF-01 | Notifikasi | *(belum ada mockup pengaturan)* | Notification Worker | TODO | TODO | Provider Telegram/email — belum dikonfirmasi | Should Have, bisa ditunda pasca-MVP inti |
| F-SEC-01 | Audit Log & Pusat Keamanan | `pusat_keamanan_audit_trail_scr_08`, `konfirmasi_putuskan_sesi_scr_08_modal`, `..._sukses` | `/api/v1/admin/audit-logs`, session management | TODO | TODO | F-AUTH-01 | — |
| F-ADM-01 | Panel Admin | *(belum ada mockup)* | `/api/v1/admin/users` | TODO | TODO | F-AUTH-01, RBAC | — |
| F-SUB-01 | Paket Langganan | *(belum ada mockup)* | *(belum ada — gap SRS juga)* | TBD | TBD | Keputusan model bisnis (PO) | Gap requirement di SRS juga — jangan implementasi sebelum keputusan |
| F-WL-01 *(baru, dari desain)* | Whitelist Alamat Withdrawal + Timelock 24 Jam | `tambah_alamat_whitelist_24h_timelock_modal` | *(tidak dirancang)* | **EXCLUDED dari MVP** (keputusan 2026-09-21, default aman — lihat `PROJECT_STATUS.md` §5) | — | — | Bisa dipertimbangkan ulang jika Product Owner menetapkan kebutuhan konkret di fase lanjutan |
| Live Trading (seluruh modul) | — | Toggle "Live Trading" tampil terkunci di dashboard | Trading Engine (live path) | **BLOCKED** (by design, jangan diaktifkan) | — | Kepatuhan hukum Bappebti/OJK | Jangan pernah diaktifkan tanpa persetujuan eksplisit |

## Ringkasan
- **DONE:** 3 (F-SYS-01, F-AUTH-01, F-AUTH-04-infrastruktur)
- **PARTIAL:** 1 (F-USER-01 — baca selesai, ubah belum)
- **TODO:** 12
- **DITUNDA (keputusan sadar):** 1 (F-AUTH-02 — 2FA, Should Have)
- **TBD:** 1 (F-SUB-01)
- **EXCLUDED:** 1 (F-WL-01 — keputusan sadar, bukan celah)
- **BLOCKED:** 1 (Live Trading — permanen sampai kepatuhan hukum selesai)

Fase 1 (Foundation) dan Fase 2 (Authentication) selesai: kerangka backend/frontend berjalan, health check dan alur auth inti (register→OTP→login→profil) terverifikasi end-to-end dengan test otomatis dan smoke test manual. Fitur produk lanjutan (exchange, bot, dst.) mulai Fase 3 — matriks diperbarui baris-per-baris saat masing-masing selesai.
