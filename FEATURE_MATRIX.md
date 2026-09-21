# FEATURE MATRIX — GAIN (Niaga Koin)

> Status per fitur. Diperbarui setiap fase menyelesaikan/mengubah suatu fitur — jangan buat dokumen status terpisah per fitur. Legenda status: `DONE` / `PARTIAL` / `TODO` / `BLOCKED` / `TBD`.

| Feature ID | Nama Fitur | Halaman UI (desain) | Endpoint/Service (rencana) | Status Implementasi | Status Pengujian | Dependency | Risiko |
|---|---|---|---|---|---|---|---|
| F-SYS-01 | Health Check & Observability Dasar | — | `GET /api/v1/health` | **DONE** | **DONE** (unit + e2e) | PostgreSQL | — |
| F-AUTH-01 | Registrasi & Login | *(belum ada mockup)* | `/api/v1/auth/register`, `/auth/login`, `/auth/verify-otp` | TODO | TODO | Layanan OTP (email/SMS) — provider belum dipilih | Tanpa ini, seluruh fitur lain terkunci (semua endpoint butuh auth) |
| F-AUTH-02 | 2FA | Disebut sebagai item di `pusat_keamanan_audit_trail_scr_08` (tanpa alur setup lengkap) | `/api/v1/auth/2fa/verify` | TODO | TODO | F-AUTH-01 | Alur setup 2FA belum didesain penuh |
| F-USER-01 | Profil Pengguna | *(belum ada mockup)* | `/api/v1/users/me` | TODO | TODO | F-AUTH-01 | — |
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
- **DONE:** 1 (F-SYS-01 — health check)
- **PARTIAL:** 0
- **TODO:** 15
- **TBD:** 1 (F-SUB-01)
- **EXCLUDED:** 1 (F-WL-01 — keputusan sadar, bukan celah)
- **BLOCKED:** 1 (Live Trading — permanen sampai kepatuhan hukum selesai)

Fase 1 (Foundation) selesai: kerangka backend/frontend berjalan, health check terverifikasi end-to-end. Fitur produk (auth, exchange, bot, dst.) mulai dikerjakan Fase 2 dan seterusnya — matriks diperbarui baris-per-baris saat masing-masing selesai.
