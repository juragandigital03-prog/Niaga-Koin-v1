# GAIN (Niaga Koin)

Platform trading kripto otomatis — **mode paper trading (simulasi) secara default**. Live trading dinonaktifkan permanen sampai ada persetujuan eksplisit, audit keamanan, dan kejelasan hukum/regulasi. Lihat `PROJECT_STATUS.md` untuk status proyek lengkap dan `IMPLEMENTATION_PLAN.md` untuk rencana per fase.

## Prasyarat

- Node.js 22+ dan npm 10+
- Docker + Docker Compose (untuk PostgreSQL lokal) **atau** PostgreSQL 16 terpasang lokal
- macOS/Linux (dikembangkan dan diuji untuk dijalankan lokal di MacBook)

## Instalasi

```bash
# 1. Install dependency backend
cd backend && npm install

# 2. Install dependency frontend
cd ../frontend && npm install
```

## Konfigurasi Environment

```bash
cd backend
cp ../.env.example .env
# Edit backend/.env sesuai kebutuhan lokal Anda (nilai default sudah cocok
# dengan docker-compose.yml di bawah).
```

`backend/.env` tidak pernah di-commit (lihat `.gitignore`). `LIVE_TRADING_ENABLED` **wajib** `false` — aplikasi akan menolak untuk start jika diset `true` (lihat `backend/src/config/env.validation.ts`).

## Menyalakan Database

```bash
docker compose up -d
```

Ini menjalankan PostgreSQL 16 di `localhost:5432` (kredensial: `gain_dev` / `gain_dev_local`, database `gain_dev`), hanya bind ke `127.0.0.1` (tidak diekspos ke jaringan).

Jika Anda sudah punya PostgreSQL lokal tanpa Docker, buat database secara manual:

```bash
createuser gain_dev --pwprompt
createdb gain_dev --owner=gain_dev
```

## Migration

```bash
cd backend
npx prisma migrate deploy   # menerapkan migration yang sudah ada
# atau, saat mengembangkan skema baru:
npx prisma migrate dev
```

## Menjalankan Backend

```bash
cd backend
npm run start:dev
```

Backend berjalan di `http://localhost:3000`. Cek kesehatan sistem:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"...","database":"ok","tradingMode":"paper-only","liveTradingEnabled":false}
```

## Menjalankan Frontend

```bash
cd frontend
npm run dev
```

Frontend berjalan di `http://localhost:5173`. Fase 1 ini hanya menampilkan halaman Dashboard sebagai replika desain (`docs/design/stitch-export/dashboard_paper_trading_mobile`) dengan data contoh (mock) — belum terhubung ke backend. Integrasi data nyata dilakukan bertahap sesuai `IMPLEMENTATION_PLAN.md`.

## Menjalankan Test

```bash
# Backend
cd backend
npm run lint
npm run typecheck
npm test              # unit test
npm run test:e2e      # integration test (butuh database aktif)
npm run build          # build production

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test               # unit/component test
npm run build          # build production
```

## Menghentikan & Mereset Environment Development

```bash
# Hentikan backend/frontend: Ctrl+C pada masing-masing proses

# Hentikan database (data tetap tersimpan di volume Docker)
docker compose stop

# Reset total database (menghapus seluruh data lokal)
docker compose down -v
```

## Troubleshooting

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Backend gagal start, error `Missing required environment variables: DATABASE_URL` | `backend/.env` belum dibuat/salah | `cp .env.example backend/.env`, sesuaikan `DATABASE_URL` |
| Backend gagal start, error `LIVE_TRADING_ENABLED=true is not permitted` | Variabel live trading sengaja/tidak sengaja diaktifkan | Set `LIVE_TRADING_ENABLED=false` — ini penegakan aturan keselamatan finansial, bukan bug |
| `GET /api/v1/health` mengembalikan `503` | Database tidak menyala atau `DATABASE_URL` salah | Pastikan `docker compose up -d` berjalan dan port 5432 dapat diakses |
| Port 5432/3000/5173 sudah dipakai | Proses lain sedang berjalan | Hentikan proses lama atau ubah port di `.env`/`vite.config.ts` |
| `npx prisma migrate dev` gagal konek | Database belum siap saat migration dijalankan | Tunggu healthcheck `docker compose ps` menunjukkan status `healthy`, lalu ulangi |

## Struktur Proyek

```
backend/    NestJS + Prisma + PostgreSQL — API modular monolith
frontend/   React + TypeScript + Vite + Tailwind — replikasi desain Stitch
docs/       Dokumen sumber (PRD/SRS/SDD) dan referensi desain UI/UX
```

## Dokumen Lain

- `PROJECT_STATUS.md` — ringkasan proyek lintas-fase
- `IMPLEMENTATION_PLAN.md` — rencana per fase
- `FEATURE_MATRIX.md` — status implementasi per fitur
- `API_CONTRACT.md` — kontrak endpoint `/api/v1/*`
- `CHANGELOG.md` — riwayat perubahan per fase
