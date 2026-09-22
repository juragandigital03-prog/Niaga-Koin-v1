import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  Candle,
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
  MarketDataUnavailableError,
  Ticker,
} from '../src/market-data/market-data-provider.interface';

/**
 * Uses an injected fake provider rather than the real Binance API: this
 * sandbox's egress policy blocks api.binance.com outright, and even
 * without that restriction, tests should not depend on a live third-party
 * API being reachable/stable. Real connectivity must be checked on the
 * developer's own machine (see README.md) — not claimed as verified here.
 */
class FakeMarketDataProvider implements MarketDataProvider {
  public shouldFail = false;

  async getTicker(symbol: string): Promise<Ticker> {
    if (this.shouldFail) {
      throw new MarketDataUnavailableError('simulated outage');
    }
    return { symbol, price: 65000.12, asOf: new Date().toISOString() };
  }

  async getCandles(_symbol: string): Promise<Candle[]> {
    return [
      {
        openTime: new Date(0).toISOString(),
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 42,
        closeTime: new Date(60_000).toISOString(),
      },
    ];
  }
}

describe('Market Data (e2e)', () => {
  let app: INestApplication;
  const fakeProvider = new FakeMarketDataProvider();

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://gain_dev:gain_dev_local@localhost:5432/gain_dev';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MARKET_DATA_PROVIDER)
      .useValue(fakeProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the supported symbols', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/market-data/symbols').expect(200);
    expect(res.body.symbols).toContain('BTCUSDT');
  });

  it('returns a ticker for a supported symbol without requiring auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/market-data/ticker/BTCUSDT')
      .expect(200);
    expect(res.body.symbol).toBe('BTCUSDT');
    expect(typeof res.body.price).toBe('number');
  });

  it('rejects an unsupported symbol with 400', async () => {
    await request(app.getHttpServer()).get('/api/v1/market-data/ticker/DOGEUSDT').expect(400);
  });

  it('returns candles for valid interval/limit query params', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/market-data/candles/BTCUSDT?interval=1h&limit=10')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('close');
  });

  it('rejects an invalid interval with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/market-data/candles/BTCUSDT?interval=3m&limit=10')
      .expect(400);
  });

  it('surfaces a provider outage as 503, not a fabricated response', async () => {
    fakeProvider.shouldFail = true;
    await request(app.getHttpServer()).get('/api/v1/market-data/ticker/ETHUSDT').expect(503);
    fakeProvider.shouldFail = false;
  });
});
