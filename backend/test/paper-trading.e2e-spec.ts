import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OTP_PROVIDER, OtpProvider } from '../src/auth/otp/otp-provider.interface';
import {
  Candle,
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
  Ticker,
} from '../src/market-data/market-data-provider.interface';

/**
 * Uses an injected fake MarketDataProvider (same reasoning as
 * market-data.e2e-spec.ts) so this test is deterministic and doesn't
 * depend on live Binance prices — a real trading engine test must not
 * have its assertions depend on whatever BTC costs today.
 */
class FixedPriceMarketDataProvider implements MarketDataProvider {
  public price = 60000;

  async getTicker(symbol: string): Promise<Ticker> {
    return { symbol, price: this.price, asOf: new Date().toISOString() };
  }

  async getCandles(): Promise<Candle[]> {
    return [];
  }
}

describe('Paper Trading (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fakeProvider = new FixedPriceMarketDataProvider();
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

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://gain_dev:gain_dev_local@localhost:5432/gain_dev';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
    process.env.CREDENTIALS_ENCRYPTION_KEY ??= 'test-credentials-encryption-key';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OTP_PROVIDER)
      .useValue(spyOtpProvider)
      .overrideProvider(MARKET_DATA_PROVIDER)
      .useValue(fakeProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-paper-trading-test' } } });
    await app.close();
  });

  it('starts a new user with no wallet, then lazily creates the default 10,000 USDT balance', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-wallet-${Date.now()}@example.com`);

    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.balanceUsdt).toBe('10000');
    expect(res.body.positions).toEqual([]);
  });

  it('walks buy -> position appears -> sell -> position clears, with balance moving both times', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-buysell-${Date.now()}@example.com`);
    fakeProvider.price = 60000;

    const buyRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 })
      .expect(201);
    expect(buyRes.body.status).toBe('filled');
    expect(buyRes.body.trade.executedPrice).toBe('60030'); // +0.05% slippage on buy

    const walletAfterBuy = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(walletAfterBuy.body.positions).toEqual([
      { symbol: 'BTCUSDT', quantity: '0.01', avgEntryPrice: '60030' },
    ]);
    expect(Number(walletAfterBuy.body.balanceUsdt)).toBeLessThan(10000);

    const sellRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'sell', quantity: 0.01 })
      .expect(201);
    expect(sellRes.body.status).toBe('filled');

    const walletAfterSell = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(walletAfterSell.body.positions).toEqual([]);
    // Round-trip buy+sell loses a bit to fees+slippage, but shouldn't be wildly off.
    expect(Number(walletAfterSell.body.balanceUsdt)).toBeLessThan(10000);
    expect(Number(walletAfterSell.body.balanceUsdt)).toBeGreaterThan(9990);

    const history = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body.map((o: any) => o.side)).toEqual(['sell', 'buy']); // newest first
  });

  it('rejects a sell with no position, and never lets balance go negative on a too-large buy', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-reject-${Date.now()}@example.com`);
    fakeProvider.price = 60000;

    const sellRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'sell', quantity: 0.01 })
      .expect(201);
    expect(sellRes.body.status).toBe('rejected');
    expect(sellRes.body.rejectReason).toBe('INSUFFICIENT_POSITION');

    // 10 BTC at 60000 vastly exceeds the 10,000 USDT starting balance.
    const buyRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 10 })
      .expect(201);
    expect(buyRes.body.status).toBe('rejected');
    expect(buyRes.body.rejectReason).toBe('INSUFFICIENT_BALANCE');

    const wallet = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(wallet.body.balanceUsdt).toBe('10000'); // untouched by either rejection
  });

  it('rejects an order below the minimum notional', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-minnotional-${Date.now()}@example.com`);
    fakeProvider.price = 60000;

    // 0.0001 * 60000 ≈ 6 USDT, under the 10 USDT default minimum.
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.0001 })
      .expect(201);
    expect(res.body.status).toBe('rejected');
    expect(res.body.rejectReason).toBe('BELOW_MIN_NOTIONAL');
  });

  it('rejects an unsupported symbol with 400', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-badsymbol-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'DOGEUSDT', side: 'buy', quantity: 1 })
      .expect(400);
  });

  it('resets the wallet to the default balance and clears positions, only for the requesting user', async () => {
    const token = await registerAndLogin(`e2e-paper-trading-test-reset-${Date.now()}@example.com`);
    fakeProvider.price = 60000;

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 })
      .expect(201);

    const resetRes = await request(app.getHttpServer())
      .post('/api/v1/wallet/reset')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(resetRes.body.balanceUsdt).toBe('10000');
    expect(resetRes.body.positions).toEqual([]);
  });

  it("never lets one user's wallet or orders be visible to another user", async () => {
    const tokenA = await registerAndLogin(`e2e-paper-trading-test-isolation-a-${Date.now()}@example.com`);
    const tokenB = await registerAndLogin(`e2e-paper-trading-test-isolation-b-${Date.now()}@example.com`);
    fakeProvider.price = 60000;

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 })
      .expect(201);

    const walletB = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(walletB.body.balanceUsdt).toBe('10000');
    expect(walletB.body.positions).toEqual([]);

    const ordersB = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(ordersB.body).toEqual([]);
  });

  it('requires authentication on every paper trading endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/wallet').expect(401);
    await request(app.getHttpServer()).post('/api/v1/wallet/reset').expect(401);
    await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ symbol: 'BTCUSDT', side: 'buy', quantity: 1 })
      .expect(401);
  });
});
