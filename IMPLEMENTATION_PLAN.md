# IMPLEMENTATION PLAN — GAIN (Niaga Koin)

> Rencana per fase sesuai `ATURAN EKSEKUSI PER FASE` di master prompt. Satu fase dikerjakan pada satu waktu, incremental, vertical slice. Baca `PROJECT_STATUS.md` dulu — jangan baca ulang PRD/SRS/SDD penuh di setiap fase.

## Status Ringkas Fase

| Fase | Nama | Status |
|---|---|---|
| 0 | Discovery & Audit | **DONE** (dokumen ini) |
| 1 | Foundation | NOT STARTED — menunggu konfirmasi stack (lihat blocker) |
| 2 | Authentication | NOT STARTED |
| 3 | Market Data | NOT STARTED |
| 4 | Paper Trading Core | NOT STARTED |
| 5 | Bot & Strategy | NOT STARTED |
| 6 | Portfolio & Dashboard | NOT STARTED |
| 7 | History, Notification, Admin | NOT STARTED |
| 8 | Hardening & QA | NOT STARTED |
| 9 | Local Release | NOT STARTED |
| 10 | VPS/Domain Readiness | NOT STARTED |

## Blocker Sebelum Fase 1

Keputusan stack teknologi (Bagian 5, `PROJECT_STATUS.md`) perlu dikonfirmasi pengguna:
1. Setuju stack sederhana (React+TS, NestJS/Express modular monolith + 1 worker, PostgreSQL saja, Redis opsional, secrets via `.env`)?
2. Exchange pertama: Binance (disebut sebagai kandidat di PRD/SDD) — dikonfirmasi?
3. Fitur whitelist alamat withdrawal (dari desain, tidak ada di SRS) — masuk scope MVP atau ditunda ke fase lanjutan?
4. Saldo virtual awal paper trading — berapa (SRS/PRD tidak menetapkan angka pasti; mockup dashboard menampilkan `10,000.00 USDT` sebagai nilai reset default)?

Tanpa jawaban #1, Fase 1 tidak bisa dimulai secara aman (risiko membangun kerangka yang salah dan memboroskan kredit — bertentangan dengan ATURAN EFISIENSI KREDIT AI).

## Fase 1 — Foundation (rencana, belum dieksekusi)
- Inisialisasi monorepo: `backend/`, `frontend/`, `worker/` (atau digabung di backend sebagai proses terpisah jika NestJS), `docker-compose.yml` (PostgreSQL [+Redis jika dikonfirmasi]).
- Setup TypeScript, ESLint, Prettier, test runner (Jest) di backend & frontend.
- Health check endpoint `/api/v1/health`.
- Struktur logging terstruktur dasar (JSON).
- `.env.example` diisi nilai nyata sesuai stack final.
- Migration tool dipilih (Prisma disebut sebagai kandidat SDD §6.2) + migration pertama (tabel `users` minimal).
- README diperbarui dengan instruksi run lokal yang benar-benar bisa diikuti.
- Frontend: scaffold Vite+React+TS, import token `docs/design/stitch-export/gain_trading_terminal/DESIGN.md` ke `tailwind.config`, replikasi 1 layar (dashboard) sebagai komponen React statis (belum terhubung API) untuk validasi kesetiaan desain.

## Fase 2 — Authentication (rencana)
- FR-AUTH-001 (register+OTP), FR-AUTH-002 (login), FR-AUTH-004 (RBAC). FR-AUTH-003 (2FA) jika dikonfirmasi masuk MVP awal (PRD menandainya Should Have).
- Tabel `users`, password hashing (bcrypt/argon2), JWT access+refresh token, middleware auth.
- Test: registrasi sukses/gagal, login sukses/gagal, lockout setelah N percobaan, isolasi RBAC user vs admin.

## Fase 3 — Market Data (rencana)
- Adapter Binance public REST/WS untuk harga & candle. Retry/backoff terbatas, timeout, fallback fixture untuk test.
- Endpoint baca data pasar untuk dashboard.

## Fase 4 — Paper Trading Core (rencana)
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
