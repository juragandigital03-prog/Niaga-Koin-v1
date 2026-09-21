# PROJECT STATUS — GAIN (Niaga Koin)

> Dokumen ini adalah ringkasan proyek yang dapat digunakan kembali di setiap fase, sesuai ATURAN EFISIENSI KREDIT AI pada MASTER_PROMPT. **Jangan membaca ulang seluruh PRD/SRS/SDD di fase berikutnya — baca dokumen ini dulu.**
>
> Terakhir diperbarui: 2026-09-21 (Fase 0 — Discovery/Audit)

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
├── README.md
├── PROJECT_STATUS.md          (baru — dokumen ini)
├── IMPLEMENTATION_PLAN.md     (baru)
├── FEATURE_MATRIX.md          (baru)
├── API_CONTRACT.md            (baru — skeleton, belum ada implementasi)
├── .env.example                (baru — skeleton)
├── CHANGELOG.md                (baru)
└── docs/
    ├── reference/               (5 dokumen sumber + master prompt)
    └── design/stitch-export/    (10 mockup layar statis + design tokens + logo)
```

Belum ada: `backend/`, `frontend/`, `worker/`, `docker-compose.yml`, migration, test suite, CI config, package manager manifest apa pun (tidak ada `package.json`, `requirements.txt`, `go.mod`, dll).

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

**Tidak ada backend sama sekali.** Tidak ada kerangka kerja, tidak ada koneksi database, tidak ada satu endpoint pun. Seluruh SCOPE MVP di master prompt (auth, market data, paper trading, bot lifecycle, dst.) perlu dibangun dari nol pada Fase 2 dan seterusnya.

## 5. Keputusan Arsitektur — Perlu Konfirmasi Sebelum Fase 1

SDD v1.0 mengusulkan stack yang relatif berat untuk MVP (Node.js/NestJS + Go + Python + PostgreSQL + TimescaleDB + Redis + RabbitMQ + Vault + microservice-ish worker terpisah). Master prompt secara eksplisit melarang menambah RabbitMQ/TimescaleDB/Go/service terpisah **kecuali kompleksitasnya sudah diperlukan untuk MVP**, dan mengarahkan memilih stack berdasarkan **codebase aktual** — yang saat ini kosong.

**Usulan stack MVP yang disederhanakan** (mengikuti prinsip "modular monolith paling sederhana", tetap konsisten dengan pilihan bahasa di SDD agar tidak menyimpang jauh dari dokumen sumber):
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (menyalin token `DESIGN.md` ke `tailwind.config`) — konsisten dengan SDD §4 dan langsung kompatibel dengan class Tailwind yang sudah dipakai di `code.html`.
- **Backend:** Node.js + TypeScript (NestJS atau Express — NestJS sesuai SDD §4 dan cocok untuk struktur modular monolith) sebagai satu proses API + satu proses worker terpisah (market data polling + strategy/risk/paper-trading loop) — **tanpa Go/Python terpisah dulu**, karena strategi indikator dasar (RSI/MACD/dll.) bisa dihitung di TypeScript untuk MVP.
- **Database:** PostgreSQL saja (tanpa TimescaleDB dulu — candle history volume MVP kecil, bisa ditambah ekstensi nanti tanpa migrasi besar).
- **Cache/Queue:** Redis hanya jika diperlukan untuk session/rate-limit/pub-sub event ke worker (kemungkinan besar dibutuhkan untuk update real-time dashboard) — **tanpa RabbitMQ** dulu, Redis pub/sub atau polling DB cukup untuk skala MVP satu pengguna developer.
- **Secrets:** environment variables untuk development; **bukan** HashiCorp Vault dulu (over-engineering untuk MVP lokal) — dengan catatan tegas bahwa ini harus di-upgrade sebelum ada dana riil/produksi publik.
- **Exchange:** Binance public REST/WebSocket untuk market data spot; API key trade-only untuk pembacaan saldo (read-only) — order execution riil tetap `BLOCKED`.

Ini adalah **penyimpangan terdokumentasi dari SDD** (sesuai instruksi "Dokumentasikan setiap penyimpangan dari SDD") demi menghindari over-engineering di MVP. **Menunggu konfirmasi pengguna sebelum Fase 1 dimulai** karena ini memengaruhi scope, biaya waktu, dan struktur proyek jangka panjang.

## 6. Aturan Keselamatan Finansial — Status

Belum ada kode, jadi belum ada pelanggaran. Aturan berikut **wajib ditegakkan sejak baris kode pertama**:
- Paper trading = mode default & satu-satunya mode aktif.
- Kolom `is_paper` di setiap tabel transaksional sejak migrasi pertama.
- Tidak ada endpoint/kode yang memanggil order eksekusi riil exchange.
- Tidak ada secret di source/log/DB plaintext — `.env` di `.gitignore` sejak commit pertama kode.

## 7. Cara Menjalankan Proyek Saat Ini

**Belum bisa dijalankan** — belum ada aplikasi. Instruksi local development akan ditulis di Fase 1 (Foundation) setelah kerangka backend/frontend ada.

## 8. Dokumen Terkait

- `IMPLEMENTATION_PLAN.md` — rencana per fase.
- `FEATURE_MATRIX.md` — status implementasi per fitur.
- `API_CONTRACT.md` — kontrak endpoint (skeleton, akan diisi bertahap).
- `.env.example` — variabel environment yang diantisipasi.
- `CHANGELOG.md` — riwayat perubahan per fase.
- `docs/reference/` — PRD, SRS, SDD, Audit Integrasi, Riset Kompetitor, Master Prompt.
- `docs/design/stitch-export/` — mockup layar & design tokens.
