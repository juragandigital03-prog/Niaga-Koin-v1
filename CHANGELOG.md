# CHANGELOG — GAIN (Niaga Koin)

Format: setiap entri merepresentasikan satu fase kerja (bukan setiap commit kecil).

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
