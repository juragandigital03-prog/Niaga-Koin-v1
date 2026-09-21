# API CONTRACT — GAIN (Niaga Koin)

> **Status: SKELETON.** Belum ada satu endpoint pun yang diimplementasikan (Fase 0 — repo masih kosong). Tabel di bawah adalah kontrak yang direncanakan berdasarkan SDD §7, untuk dikonfirmasi/direvisi saat masing-masing fase implementasi berjalan. Setelah backend nyata mulai dibangun, dokumen ini wajib disinkronkan dengan OpenAPI/Swagger yang digenerate dari kode (bukan ditulis manual terus-menerus).

Base path: `/api/v1` (versioning wajib sejak awal — NFR-MAINT-005).

## Auth
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/auth/register` | 2 | TODO |
| POST | `/auth/verify-otp` | 2 | TODO |
| POST | `/auth/login` | 2 | TODO |
| POST | `/auth/2fa/verify` | 2 | TODO |

## Users
| Method | Path | Fase | Status |
|---|---|---|---|
| GET/PATCH | `/users/me` | 2 | TODO |

## Exchange
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/exchange-accounts` | 3 | TODO |
| GET | `/exchange-accounts` | 3 | TODO |
| DELETE | `/exchange-accounts/{id}` | 3 | TODO |

## Bots
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/bots` | 5 | TODO |
| GET | `/bots/{id}` | 5 | TODO |
| PATCH | `/bots/{id}/start` | 5 | TODO |
| PATCH | `/bots/{id}/stop` | 5 | TODO |
| DELETE | `/bots/{id}` | 5 | TODO |

## Portfolio & Orders
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/portfolio` | 6 | TODO |
| GET | `/orders?botId=&status=&from=&to=` | 7 | TODO |
| GET | `/reports/pnl?botId=&period=` | 6 | TODO |

## Admin
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/admin/users` | 7 | TODO |
| PATCH | `/admin/users/{id}/suspend` | 7 | TODO |
| GET | `/admin/audit-logs` | 7 | TODO |

## System
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/health` | 1 | **DONE** — `backend/src/health/health.controller.ts`. Response: `{status, timestamp, database, tradingMode, liveTradingEnabled}` |

## Belum Ditentukan
- Endpoint whitelist alamat withdrawal (lihat `PROJECT_STATUS.md` §3.2) — **tidak didefinisikan sampai ada keputusan produk**.
- Endpoint subscription/langganan (F-SUB-01) — gap requirement, belum ada rancangan.
- Endpoint notifikasi (preferensi channel) — belum ada di SDD, akan ditambah saat Fase 7 jika masuk scope.

## Aturan Kontrak (berlaku untuk seluruh endpoint saat diimplementasikan)
- Seluruh query data pengguna difilter `user_id` dari token tervalidasi.
- Endpoint admin dilindungi RBAC.
- Error response konsisten, tidak membocorkan detail internal/secret.
- Endpoint sensitif (login, OTP, trading) punya rate limiting.
- Operasi start/stop bot bersifat idempotent.
