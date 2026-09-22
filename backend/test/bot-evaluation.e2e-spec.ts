import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OTP_PROVIDER, OtpProvider } from '../src/auth/otp/otp-provider.interface';
import {
  Candle,
  CandleInterval,
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
  Ticker,
} from '../src/market-data/market-data-provider.interface';

/**
 * Deterministic, mutable-per-test candle source for the Strategy Engine
 * (see market-data.e2e-spec.ts for why a fake provider is used instead of
 * real Binance). `closes` is reassigned before each test to force a known
 * RSI value.
 */
class FakeMarketDataProvider implements MarketDataProvider {
  public closes: number[] = [];

  async getTicker(symbol: string): Promise<Ticker> {
    return { symbol, price: this.closes[this.closes.length - 1] ?? 100, asOf: new Date().toISOString() };
  }

  async getCandles(_symbol: string, _interval: CandleInterval, limit: number): Promise<Candle[]> {
    return this.closes.slice(-limit).map((close, i) => ({
      openTime: new Date(i * 60_000).toISOString(),
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
      closeTime: new Date((i + 1) * 60_000).toISOString(),
    }));
  }
}

function decliningCloses(start = 114, count = 15): number[] {
  return Array.from({ length: count }, (_, i) => start - i);
}

function risingCloses(start = 100, count = 15): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

describe('Bot evaluate: Strategy Engine -> Risk Engine -> Trading Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fakeMarketData = new FakeMarketDataProvider();
  let capturedCode: string;
  const spyOtpProvider: OtpProvider = {
    send: async (_destination, code) => {
      capturedCode = code;
    },
  };

  async function registerAndLogin(email: string) {
    const password = 'correct-horse-battery-9';
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .set('Authorization', `Bearer ${registerRes.body.registrationToken}`)
      .send({ code: capturedCode })
      .expect(200);
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return loginRes.body.accessToken as string;
  }

  const validBotPayload = {
    name: 'BTC Trend Scalper',
    symbol: 'BTCUSDT',
    strategyType: 'rsi',
    parameters: { period: 14, oversold: 30, overbought: 70 },
    riskLimits: { maxPositionUsdt: 500 },
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://gain_dev:gain_dev_local@localhost:5432/gain_dev';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
    // Unconditional (not ??=): other e2e spec files sharing this Jest
    // worker's process.env may already have forced this to the .env
    // file's 5000 via ConfigModule's assignVariablesToProcess (which only
    // skips keys already present) before this file's beforeAll runs — a
    // ??= here would then silently no-op and leave stale candles cached
    // across this file's own evaluate() calls.
    process.env.MARKET_DATA_CACHE_TTL_MS = '0';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OTP_PROVIDER)
      .useValue(spyOtpProvider)
      .overrideProvider(MARKET_DATA_PROVIDER)
      .useValue(fakeMarketData)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-bot-eval-test' } } });
    await app.close();
  });

  it('refuses to evaluate a bot that is not active', async () => {
    const token = await registerAndLogin(`e2e-bot-eval-test-inactive-${Date.now()}@example.com`);
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('evaluates a declining market as a buy signal and places a filled paper order', async () => {
    fakeMarketData.closes = decliningCloses(); // -> RSI 0 -> buy
    const token = await registerAndLogin(`e2e-bot-eval-test-buy-${Date.now()}@example.com`);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${createRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const evalRes = await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(evalRes.body.signal).toBe('buy');
    expect(evalRes.body.executed).toBe(true);
    expect(evalRes.body.blockedReason).toBeNull();
    expect(evalRes.body.order.status).toBe('filled');
    expect(evalRes.body.order.side).toBe('buy');
  });

  it('blocks a buy signal once the user is already at the bot maxPositionUsdt cap (FR-RISK-001)', async () => {
    fakeMarketData.closes = decliningCloses(); // last close 100 -> RSI 0 -> buy
    const token = await registerAndLogin(`e2e-bot-eval-test-cap-${Date.now()}@example.com`);

    // Manually establish a ~600 USDT position at price 100 before the bot ever runs.
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 6 })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBotPayload, riskLimits: { maxPositionUsdt: 500 } })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${createRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const evalRes = await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(evalRes.body.signal).toBe('buy');
    expect(evalRes.body.executed).toBe(false);
    expect(evalRes.body.blockedReason).toBe('MAX_POSITION_EXCEEDED');
    expect(evalRes.body.order).toBeNull();
  });

  it('evaluates a rising market as a sell signal and closes the position the bot itself opened', async () => {
    const token = await registerAndLogin(`e2e-bot-eval-test-sell-${Date.now()}@example.com`);

    fakeMarketData.closes = decliningCloses(); // buy first to have something to sell
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${createRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const buyRes = await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(buyRes.body.executed).toBe(true);

    fakeMarketData.closes = risingCloses(); // flip to RSI 100 -> sell
    const sellRes = await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(sellRes.body.signal).toBe('sell');
    expect(sellRes.body.executed).toBe(true);
    expect(sellRes.body.order.side).toBe('sell');
  });

  it('rejects a sell signal with NO_OPEN_POSITION when the bot has nothing to sell', async () => {
    fakeMarketData.closes = risingCloses(); // RSI 100 -> sell, but no position exists yet
    const token = await registerAndLogin(`e2e-bot-eval-test-nosell-${Date.now()}@example.com`);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${createRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const evalRes = await request(app.getHttpServer())
      .post(`/api/v1/bots/${createRes.body.id}/evaluate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(evalRes.body.signal).toBe('sell');
    expect(evalRes.body.executed).toBe(false);
    expect(evalRes.body.blockedReason).toBe('NO_OPEN_POSITION');
    expect(evalRes.body.order).toBeNull();
  });
});
