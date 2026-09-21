# PROJECT STATUS — GAIN (Niaga Koin)

> Dokumen ini adalah ringkasan proyek yang dapat digunakan kembali di setiap fase, sesuai ATURAN EFISIENSI KREDIT AI pada MASTER_PROMPT. **Jangan membaca ulang seluruh PRD/SRS/SDD di fase berikutnya — baca dokumen ini dulu.**
>
> Terakhir diperbarui: 2026-09-21 (Fase 1 — Foundation, DONE)

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

**Fase 1 (Foundation) selesai.** Backend NestJS modular monolith berjalan, dengan:
- `GET /api/v1/health` — mengecek konektivitas database, mengembalikan `tradingMode: "paper-only"` dan `liveTradingEnabled: false` secara eksplisit di setiap response.
- **Kill switch keselamatan finansial di level boot:** `backend/src/config/env.validation.ts` membuat aplikasi **menolak untuk start** jika `LIVE_TRADING_ENABLED=true` — diverifikasi dengan test otomatis dan smoke test manual (proses exit dengan error, bukan diam-diam mengizinkan).
- Prisma + PostgreSQL terhubung, migration pertama (`init_users`) diterapkan.
- Logging terstruktur JSON (pino) dengan redaction header `authorization`/`cookie`.
- Helmet (security headers) + CORS aktif di `main.ts`.

Modul fitur (auth, exchange, bot, dst.) **belum dibangun** — itu scope Fase 2 dan seterusnya. Model database masih hanya `User` minimal.

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
- Belum ada endpoint/kode yang memanggil order eksekusi riil exchange (belum ada modul exchange sama sekali).
- Tidak ada secret di source/log/DB plaintext: `backend/.env` (berisi kredensial dev lokal) ada di `.gitignore` root sejak commit pertama kode; log pino me-redact header `authorization`/`cookie`.
- Kolom `is_paper` di tabel transaksional **belum relevan** — belum ada tabel order/trade/position (baru dibuat Fase 4).

## 7. Cara Menjalankan Proyek Saat Ini

**Bisa dijalankan penuh secara lokal** — lihat `README.md` untuk instruksi lengkap. Ringkasan:
1. `docker compose up -d` (PostgreSQL).
2. `cd backend && npm install && cp ../.env.example .env && npx prisma migrate deploy && npm run start:dev` → `http://localhost:3000/api/v1/health`.
3. `cd frontend && npm install && npm run dev` → `http://localhost:5173` (dashboard replika desain, data mock).

Diverifikasi end-to-end pada sesi ini: lint, typecheck, unit test, e2e test (backend, melawan PostgreSQL nyata), production build (backend & frontend), boot smoke test, dan screenshot visual dashboard dibandingkan terhadap `screen.png` referensi desain — hasil cocok secara struktural (lihat `CHANGELOG.md` Fase 1).

## 8. Dokumen Terkait

- `IMPLEMENTATION_PLAN.md` — rencana per fase.
- `FEATURE_MATRIX.md` — status implementasi per fitur.
- `API_CONTRACT.md` — kontrak endpoint (skeleton, akan diisi bertahap).
- `.env.example` — variabel environment yang diantisipasi.
- `CHANGELOG.md` — riwayat perubahan per fase.
- `docs/reference/` — PRD, SRS, SDD, Audit Integrasi, Riset Kompetitor, Master Prompt.
- `docs/design/stitch-export/` — mockup layar & design tokens.
