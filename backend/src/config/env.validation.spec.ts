import { loadEnvConfig } from './env.validation';

describe('loadEnvConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => loadEnvConfig()).toThrow(/Missing required environment variables/);
  });

  it('throws when JWT secrets are missing', () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => loadEnvConfig()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('applies documented defaults for OTP and login lockout tuning', () => {
    const config = loadEnvConfig();
    expect(config.otpTtlSeconds).toBe(300);
    expect(config.otpMaxAttempts).toBe(3);
    expect(config.loginMaxAttempts).toBe(5);
    expect(config.loginLockoutMinutes).toBe(15);
  });

  it('refuses to boot when LIVE_TRADING_ENABLED=true', () => {
    process.env.LIVE_TRADING_ENABLED = 'true';
    expect(() => loadEnvConfig()).toThrow(/Live trading is BLOCKED/);
  });

  it('defaults liveTradingEnabled to false when unset', () => {
    delete process.env.LIVE_TRADING_ENABLED;
    const config = loadEnvConfig();
    expect(config.liveTradingEnabled).toBe(false);
  });

  it('treats any non-"true" value as disabled (fail-safe default)', () => {
    process.env.LIVE_TRADING_ENABLED = 'yes';
    const config = loadEnvConfig();
    expect(config.liveTradingEnabled).toBe(false);
  });
});
