# CHANGELOG — GAIN (Niaga Koin)

Format: setiap entri merepresentasikan satu fase kerja (bukan setiap commit kecil).

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
