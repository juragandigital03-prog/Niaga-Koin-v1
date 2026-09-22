# API CONTRACT — GAIN (Niaga Koin)

> **Status:** Fase 2 (Auth), Fase 3 (Market Data), dan Fase 4a (Exchange Account Connection) selesai — sisanya masih rancangan berdasarkan SDD §7, untuk dikonfirmasi/direvisi saat masing-masing fase implementasi berjalan. OpenAPI/Swagger otomatis dari kode belum digenerate (TBD, bisa ditambah saat modul bertambah banyak) — dokumen ini masih sumber kebenaran manual untuk sementara.

Base path: `/api/v1` (versioning wajib sejak awal — NFR-MAINT-005).

## Auth
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/auth/register` | 2 | **DONE** — `{email, password}` → `201 {userId, status, registrationToken}`. Email saja (bukan telepon — SMS gateway belum dipilih, lihat PROJECT_STATUS.md). Memanggil ulang untuk email yang sama berstatus `pending_verification` berfungsi sebagai resend OTP. |
| POST | `/auth/verify-otp` | 2 | **DONE** — Header `Authorization: Bearer <registrationToken>`, body `{code}` (6 digit) → `200 {verified: true}`. Salah kode 3x atau kedaluwarsa → daftar ulang untuk kode baru. |
| POST | `/auth/login` | 2 | **DONE** — `{email, password}` → `200 {accessToken, refreshToken}`. Lockout otomatis setelah `LOGIN_MAX_ATTEMPTS` (default 5) gagal berturut-turut, selama `LOGIN_LOCKOUT_MINUTES` (default 15). |
| POST | `/auth/2fa/verify` | — | **DITUNDA** (bukan TODO biasa) — FR-AUTH-003 berstatus Should Have di PRD, bukan Must Have; sengaja tidak dibangun di Fase 2 agar slice tetap fokus. Dipertimbangkan lagi bersama fitur Pusat Keamanan (Fase 7). |

Endpoint OTP saat ini **belum terhubung provider pengiriman nyata** — kode dikirim ke log aplikasi saja (`ConsoleOtpProvider`, dev-only, lihat `backend/src/auth/otp/`). Siap diganti begitu Notification Worker (Fase 7) ada.

## Users
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/users/me` | 2 | **DONE** — butuh `Authorization: Bearer <accessToken>`. Tidak pernah mengembalikan `passwordHash`. |
| PATCH | `/users/me` | — | TODO — belum ada kebutuhan konkret field apa yang bisa diubah, ditunda sampai ada UI profil (F-USER-01, belum ada mockup). |

## Market Data (baru — tidak ada di SDD §7, ditambahkan Fase 3 karena PRD F-MKT-01/SRS FR-MKT-001 butuh cara bagi frontend membaca harga)
| Method | Path | Fase | Status |
|---|---|---|---|
| GET | `/market-data/symbols` | 3 | **DONE** — `200 {symbols: string[]}`. Whitelist dari `MARKET_DATA_SUPPORTED_SYMBOLS` (default `BTCUSDT,ETHUSDT,SOLUSDT`, mengikuti pasangan aset di mockup desain — cakupan final masih `TBD` di SRS §6.1). |
| GET | `/market-data/ticker/{symbol}` | 3 | **DONE** — `200 {symbol, price, asOf}`. Publik, tidak butuh auth (data pasar bukan data pengguna). Symbol di luar whitelist → `400`. Kegagalan/timeout ke exchange → `503` (fail-safe, tidak pernah mengarang data). |
| GET | `/market-data/candles/{symbol}?interval=&limit=` | 3 | **DONE** — `200 Candle[]`. `interval` ∈ `1m,5m,15m,1h,4h,1d`; `limit` 1-500 (default 100). Validasi sama seperti ticker. |

Sumber data: Binance public REST (`BinanceMarketDataProvider`, `GET /api/v3/ticker/price`, `GET /api/v3/klines`) — tidak butuh API key (baca publik saja). Retry terbatas (default 2x) + timeout (default 5s) + cache in-memory per simbol (default TTL 5 detik, bukan Redis — belum diperlukan untuk skala MVP). **Belum diverifikasi terhadap Binance sungguhan di sesi ini** — sandbox pengembangan ini memblokir akses keluar ke `api.binance.com` (kebijakan organisasi); logic pemanggilan API sudah diuji lewat mock/fixture (unit + e2e), tapi konektivitas nyata **wajib dicek di mesin pengguna** (`curl https://api.binance.com/api/v3/ping`) sebelum fitur ini dianggap benar-benar tervalidasi end-to-end — lihat `CHANGELOG.md` Fase 3.

## Exchange (koneksi API key milik pengguna — beda dari Market Data publik di atas)
| Method | Path | Fase | Status |
|---|---|---|---|
| POST | `/exchange-accounts` | 4a | **DONE** — dilindungi `JwtAuthGuard`. `{exchangeName: "binance", apiKey, apiSecret}` → validasi via signed call ke Binance `/api/v3/account`. Sukses: `201 {id, connectionStatus}`. Key dengan izin withdrawal aktif: `422 {error: "INVALID_PERMISSION_SCOPE"}` (BR-KEY-001, tanpa terkecuali). Kredensial tidak valid: `400 {error: "INVALID_CREDENTIALS"}`. Exchange tidak terjangkau: `503` (fail-safe — key TIDAK PERNAH disimpan tanpa tervalidasi). `exchangeName` di luar whitelist (`binance` satu-satunya untuk saat ini): `400`. |
| GET | `/exchange-accounts` | 4a | **DONE** — daftar milik pengguna yang login saja (difilter `user_id`), tidak pernah menyertakan credential. |
| DELETE | `/exchange-accounts/{id}` | 4a | **DONE** — `204` jika berhasil, `404` jika bukan milik pengguna yang login (tidak membocorkan keberadaan akun user lain). Kredensial terenkripsi ikut dihapus (hard delete, bukan soft-delete — user secara eksplisit minta putus koneksi). **TODO (Fase 5):** hentikan bot yang bergantung pada koneksi ini sebelum hapus (FR-EXC-002) — belum relevan karena bot belum ada. |

Kredensial disimpan terenkripsi AES-256-GCM (`CredentialsEncryptionService`, `backend/src/common/crypto/`) — kunci dari `CREDENTIALS_ENCRYPTION_KEY`, aplikasi menolak start tanpa variabel ini. **Konektivitas Binance sungguhan untuk endpoint ini juga belum diverifikasi di sesi ini** (alasan sama seperti Market Data — sandbox blokir egress) — logic teruji penuh lewat fake adapter ter-inject; verifikasi nyata wajib di mesin pengguna sebelum dianggap tervalidasi produksi.

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

## Infrastruktur Auth Siap Dipakai Modul Lain (sejak Fase 2)
- `JwtAuthGuard` (`backend/src/auth/guards/jwt-auth.guard.ts`) — pasang `@UseGuards(JwtAuthGuard)` di controller mana pun yang butuh login.
- `RolesGuard` + `@Roles('admin')` (`backend/src/auth/guards/roles.guard.ts`, `decorators/roles.decorator.ts`) — siap dipasang begitu endpoint admin pertama dibangun (Fase 7). Diuji unit (403 untuk role salah), belum ada endpoint nyata untuk uji e2e penuh — dicatat sebagai utang pembuktian di `FEATURE_MATRIX.md`.
- `req.user` (dari `JwtAuthGuard`) berisi `{id, role}` — dipakai untuk memfilter query per `user_id` di modul manapun.
- Rate limit global 60 req/menit (`ThrottlerGuard` di `AppModule`), endpoint auth di-override ke 10 req/menit.
