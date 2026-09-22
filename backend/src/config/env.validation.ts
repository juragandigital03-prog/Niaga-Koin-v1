export interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiBasePath: string;
  databaseUrl: string;
  liveTradingEnabled: boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  loginMaxAttempts: number;
  loginLockoutMinutes: number;
}

/**
 * Fail-fast on missing required env vars instead of booting with undefined
 * config — a silently-missing DATABASE_URL should not surface as a runtime
 * crash on the first request.
 */
export function loadEnvConfig(): EnvConfig {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
  if (liveTradingEnabled) {
    // Financial safety hard rule: live trading must never be enabled silently.
    // See PROJECT_STATUS.md — status hukum/perizinan masih BLOCKED.
    throw new Error(
      'LIVE_TRADING_ENABLED=true is not permitted. Live trading is BLOCKED pending legal/regulatory approval.',
    );
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiBasePath: process.env.API_BASE_PATH ?? '/api/v1',
    databaseUrl: process.env.DATABASE_URL as string,
    liveTradingEnabled: false,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET as string,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    // OTP/lockout defaults — SRS menandai nilai pasti sebagai TBD
    // (FR-AUTH-001, BR-ACC-001). Nilai di bawah adalah default aman yang
    // bisa dikonfigurasi ulang lewat env tanpa perubahan kode.
    otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
    otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 3),
    loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
    loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15),
  };
}
