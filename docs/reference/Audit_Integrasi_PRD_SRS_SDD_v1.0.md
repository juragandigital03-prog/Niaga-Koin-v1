# Audit Integrasi — PRD, SRS, dan SDD
## Platform Trading Kripto Terpadu ("Nexa Trade" — nama kerja/placeholder)

> Dokumen pelengkap yang memeriksa konsistensi antara PRD_Platform_Trading_Terpadu_v1.0.md, SRS_Platform_Trading_Terpadu_v1.0.md, dan SDD_Platform_Trading_Terpadu_v1.0.md, sesuai Bagian 6 dari brief penyusunan dokumen.

---

## A. Validasi Konsistensi

| Pertanyaan Audit | Hasil Pemeriksaan |
|---|---|
| Apakah setiap fitur PRD memiliki requirement SRS? | Sebagian besar ya (F-AUTH-*, F-EXC-*, F-PAPER-*, F-RISK-*, F-BOT-*, F-SEC-* semua memiliki FR/NFR terkait). **Gap:** F-SUB-01 (Paket Langganan) di PRD belum punya FR eksplisit di SRS — model bisnis langganan belum diturunkan menjadi requirement teknis. Status: `TBD`. |
| Apakah setiap requirement SRS memiliki rancangan di SDD? | Sebagian besar ya. **Gap:** FR-USER-002 (kelola alamat penarikan/rekening referensi) berstatus `TBD` di SRS dan sengaja belum dirancang di SDD karena keputusan kebutuhannya sendiri belum jelas. |
| Apakah setiap requirement kritis memiliki skenario pengujian? | FR-EXC-001 dan FR-RISK-001 sudah punya skenario detail di SRS Bagian 10. **Gap:** FR-BOT-002, FR-PAPER-001, FR-NOTIF-001 belum punya skenario pengujian serinci itu — ditandai `TBD` di SRS Bagian 10 untuk dilengkapi tim QA. |
| Apakah ada fitur di SDD yang tidak memiliki dasar kebutuhan di PRD/SRS? | Tidak ditemukan — seluruh komponen SDD (Authentication Service, Exchange Adapter, Strategy Engine, Risk Engine, Trading Engine, Portfolio Service, Notification Worker, Administration Service) memetakan balik ke modul PRD/FR SRS yang sesuai. |
| Apakah ada konflik terminologi? | Tidak ditemukan konflik signifikan. Istilah "Bot", "Strategi", "Sinyal", "Paper Trading", "Live Trading" dipakai konsisten di ketiga dokumen sesuai definisi SRS Bagian 2.3. |
| Apakah ada kebutuhan yang belum punya keputusan desain? | Ya — lihat daftar gap di Bagian C di bawah (mis. rentang parameter strategi, ambang circuit breaker, model slippage simulasi). |
| Apakah ada dependensi yang belum ditangani? | Ya — status hukum/perizinan (Bappebti/OJK) adalah dependensi eksternal yang memblokir (`BLOCKED`) pembukaan live trading di seluruh tiga dokumen secara konsisten. |

**Kesimpulan validasi:** Ketiga dokumen secara umum konsisten dan saling terhubung. Gap yang ditemukan bersifat detail teknis/bisnis yang memang secara sengaja ditandai `TBD`/`PROPOSED` sesuai instruksi untuk tidak menebak kebutuhan yang belum dikonfirmasi — bukan indikasi dokumen saling bertentangan.

---

## B. Matriks Keterlacakan Terpadu

| Product Feature ID (PRD) | Requirement ID (SRS) | Design Component (SDD) | API/Database | Test Scenario | Status |
|---|---|---|---|---|---|
| F-AUTH-01 | FR-AUTH-001, FR-AUTH-002 | 5.1 Authentication Service | `/api/v1/auth/*`, tabel `USERS` | SRS 10 (belum lengkap untuk auth, `TBD`) | PROPOSED |
| F-AUTH-02 | FR-AUTH-003 | 5.1 Authentication Service | `/api/v1/auth/2fa/verify` | `TBD` | PROPOSED |
| F-EXC-01 | FR-EXC-001, FR-EXC-002 | 5.2 Exchange Adapter | `/api/v1/exchange-accounts`, tabel `EXCHANGE_ACCOUNTS`, `API_CREDENTIALS` | SRS 10.1 (lengkap) | PROPOSED |
| F-STRAT-01 | FR-STRAT-001 | 5.3 Strategy Engine | tabel `STRATEGIES`, `BOT_CONFIGURATIONS` | `TBD` | PROPOSED |
| F-STRAT-02 | FR-STRAT-002 | 5.3 Strategy Engine, 9 (Strategy interface) | `BOT_CONFIGURATIONS.parameters` | `TBD` | PROPOSED |
| F-BOT-01 | FR-BOT-001, FR-BOT-002, FR-BOT-003 | 5.5 Trading Engine (lifecycle), 9 | `/api/v1/bots/*`, tabel `BOTS` | `TBD` | PROPOSED |
| F-PAPER-01 | FR-PAPER-001, FR-PAPER-002 | 5.5 Paper Trading Simulator, 9 | tabel `ORDERS`/`TRADES`/`POSITIONS` (kolom `is_paper`) | Dijelaskan di SDD 13 (paper trading test) | PROPOSED |
| F-PORT-01 | FR-PORT-001 | 5.6 Portfolio Service | `/api/v1/portfolio`, tabel `PORTFOLIO_SNAPSHOTS` | `TBD` | PROPOSED |
| F-ORD-01 | FR-ORD-001, FR-ORD-002 | 5.5 Trading Engine | `/api/v1/orders`, tabel `ORDERS` | `TBD` | PROPOSED (paper) / BLOCKED (live) |
| F-RISK-01 | FR-RISK-001 | 5.4 Risk Engine | Bagian internal Risk Engine, tidak ada endpoint publik langsung | SRS 10.2 (lengkap) | PROPOSED |
| F-RISK-02 | FR-RISK-002 | 5.4 Risk Engine (circuit breaker) | `TBD` | `TBD` | PROPOSED |
| F-AN-01 | FR-AN-001 | 7.4 Desain API Portfolio & Order | `/api/v1/reports/pnl` | `TBD` | PROPOSED |
| F-NOTIF-01 | FR-NOTIF-001 | 5.7 Notification Worker | Internal queue consumer, tidak ada endpoint publik | `TBD` | PROPOSED |
| F-SUB-01 | *(belum ada FR eksplisit — GAP)* | *(belum dirancang — GAP)* | - | - | TBD |
| F-ADM-01 | FR-ADM-001 | 5.8 Administration Service | `/api/v1/admin/users` | `TBD` | PROPOSED |
| F-SEC-01 | FR-SEC-001 | 5.8 Administration Service (audit) | `/api/v1/admin/audit-logs`, tabel `AUDIT_LOGS` | `TBD` | PROPOSED |

---

## C. Identifikasi Gap dan Konflik

### Requirement yang Belum Jelas
- Rentang parameter strategi yang valid (batas atas/bawah tiap indikator) — SRS FR-STRAT-002 menandainya `TBD`.
- Ambang/kriteria pemicu circuit breaker (FR-RISK-002) — belum ada definisi kuantitatif.
- Model matematis simulasi slippage pada paper trading (SDD Bagian 9) — masih `TBD`.
- Requirement teknis untuk model langganan (F-SUB-01) belum diturunkan sama sekali ke SRS — **gap paling signifikan** yang perlu ditutup sebelum implementasi modul Subscription.

### Fitur yang Masih Perlu Validasi
- Kebutuhan menyimpan alamat/rekening referensi pengguna (FR-USER-002) — perlu keputusan apakah benar-benar diperlukan mengingat sistem tidak mengkustodi dana.
- Cakupan exchange pertama yang diintegrasikan (PRD Bagian 9, SRS Bagian 6.1) — masih `TBD`.

### Keputusan Arsitektur yang Belum Final
- Bahasa/stack final Strategy Engine (Python vs. alternatif) — sudah diusulkan di SDD Bagian 4 namun belum disetujui Product Owner/Architect.
- Pilihan tool migrasi database (SDD Bagian 6.2) — masih `TBD`.
- Kanal alerting produksi (SDD Bagian 12) — belum ditentukan.

### Risiko Implementasi
- Ketergantungan pada Risk Engine sebagai gatekeeper wajib berarti kegagalan/bug di Risk Engine berisiko memblokir seluruh trading — perlu pengujian paling ketat di antara semua komponen (ditegaskan di SDD Bagian 3.3 dan 13).
- Pemisahan paper/live trading harus konsisten di setiap lapisan (DB, service, API, UI) — kegagalan di satu lapisan saja (mis. lupa filter `is_paper` di satu query) berisiko fatal secara finansial dan reputasi.

### Dependensi Eksternal
- Stabilitas dan kebijakan API exchange pihak ketiga (SRS Bagian 3.7, 6.1).
- Kepatuhan hukum Bappebti/OJK sebagai prasyarat pembukaan live trading (PRD Bagian 9, seluruh dokumen menandai ini `BLOCKED`).

### Informasi yang Belum Tersedia
- Ukuran dan kapasitas tim pengembang aktual (memengaruhi estimasi roadmap dan target NFR performa).
- Anggaran dan target waktu peluncuran.
- Hasil konsultasi hukum kekayaan intelektual dan regulasi keuangan.

### Pertanyaan yang Harus Dijawab Pemilik Produk
1. Apakah F-SUB-01 (langganan) menjadi prioritas MVP atau ditunda? Ini menentukan apakah gap requirement di atas perlu segera ditutup.
2. Exchange mana yang menjadi target integrasi pertama?
3. Apakah live trading akan dibuka pada v1 dengan kelompok terbatas (closed beta dengan pengawasan ketat) atau ditunda total sampai kepatuhan hukum selesai?
4. Siapa yang bertindak sebagai Product Owner untuk menyetujui/menolak status `PROPOSED` menjadi `CONFIRMED` di seluruh dokumen ini?

---

## Kesimpulan Akhir

Ketiga dokumen (PRD, SRS, SDD) telah disusun dengan ruang lingkup, terminologi, dan struktur requirement-ke-desain yang saling konsisten, serta secara konsisten menegakkan pemisahan paper trading vs. live trading dan menandai status hukum sebagai pemblokir pembukaan live trading. Dokumentasi ini **belum berarti sistem siap diimplementasikan tanpa keputusan lebih lanjut** — sejumlah keputusan bisnis, arsitektur, dan hukum masih berstatus `TBD`/`BLOCKED` dan harus diselesaikan pemilik produk sebelum tim developer mulai membangun modul yang bersangkutan. Dokumentasi yang lengkap tidak sama dengan sistem yang siap produksi.
