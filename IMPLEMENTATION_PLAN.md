# IMPLEMENTATION PLAN — GAIN (Niaga Koin)

> Rencana per fase sesuai `ATURAN EKSEKUSI PER FASE` di master prompt. Satu fase dikerjakan pada satu waktu, incremental, vertical slice. Baca `PROJECT_STATUS.md` dulu — jangan baca ulang PRD/SRS/SDD penuh di setiap fase.

## Status Ringkas Fase

| Fase | Nama | Status |
|---|---|---|
| 0 | Discovery & Audit | **DONE** |
| 1 | Foundation | **DONE** |
| 2 | Authentication | NOT STARTED |
| 3 | Market Data | NOT STARTED |
| 4 | Paper Trading Core | NOT STARTED |
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
