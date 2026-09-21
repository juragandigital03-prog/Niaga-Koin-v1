export interface EnvConfig {
  nodeEnv: string;
  port: number;
  apiBasePath: string;
  databaseUrl: string;
  liveTradingEnabled: boolean;
}

/**
 * Fail-fast on missing required env vars instead of booting with undefined
 * config — a silently-missing DATABASE_URL should not surface as a runtime
 * crash on the first request.
 */
export function loadEnvConfig(): EnvConfig {
  const required = ['DATABASE_URL'];
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
  };
}
