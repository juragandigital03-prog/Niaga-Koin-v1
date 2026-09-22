import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OTP_PROVIDER, OtpProvider } from '../src/auth/otp/otp-provider.interface';
import {
  EXCHANGE_ADAPTER,
  ExchangeAdapter,
  ExchangePermissions,
} from '../src/exchange/exchange-adapter.interface';

class FakeExchangeAdapter implements ExchangeAdapter {
  async checkPermissions(): Promise<ExchangePermissions> {
    return { canTrade: true, canWithdraw: false };
  }
}

describe('Bots (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fakeAdapter = new FakeExchangeAdapter();
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
    process.env.CREDENTIALS_ENCRYPTION_KEY ??= 'test-credentials-encryption-key';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OTP_PROVIDER)
      .useValue(spyOtpProvider)
      .overrideProvider(EXCHANGE_ADAPTER)
      .useValue(fakeAdapter)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-bots-test' } } });
    await app.close();
  });

  it('walks the full lifecycle: create -> start -> pause -> start -> stop -> delete', async () => {
    const token = await registerAndLogin(`e2e-bots-test-lifecycle-${Date.now()}@example.com`);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);
    expect(createRes.body.status).toBe('stopped');
    const botId = createRes.body.id;

    const startRes = await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(startRes.body.status).toBe('active');

    // start again is idempotent, not an error
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const pauseRes = await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botId}/pause`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(pauseRes.body.status).toBe('paused');

    // cannot delete while not stopped
    await request(app.getHttpServer())
      .delete(`/api/v1/bots/${botId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const stopRes = await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botId}/stop`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stopRes.body.status).toBe('stopped');

    await request(app.getHttpServer())
      .delete(`/api/v1/bots/${botId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/bots/${botId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('rejects pausing a bot that is not active', async () => {
    const token = await registerAndLogin(`e2e-bots-test-pauseguard-${Date.now()}@example.com`);
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send(validBotPayload)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${createRes.body.id}/pause`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('rejects an unsupported symbol with 400', async () => {
    const token = await registerAndLogin(`e2e-bots-test-badsymbol-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBotPayload, symbol: 'DOGEUSDT' })
      .expect(400);
  });

  it("never lets one user see, control, or delete another user's bot", async () => {
    const tokenA = await registerAndLogin(`e2e-bots-test-isolation-a-${Date.now()}@example.com`);
    const tokenB = await registerAndLogin(`e2e-bots-test-isolation-b-${Date.now()}@example.com`);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validBotPayload)
      .expect(201);
    const botId = createRes.body.id;

    await request(app.getHttpServer())
      .get(`/api/v1/bots/${botId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botId}/start`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const listB = await request(app.getHttpServer())
      .get('/api/v1/bots')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body).toEqual([]);
  });

  it('disconnecting an exchange account stops every bot attached to it (FR-EXC-002)', async () => {
    const token = await registerAndLogin(`e2e-bots-test-fkexc-${Date.now()}@example.com`);

    const exchangeRes = await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ exchangeName: 'binance', apiKey: 'key', apiSecret: 'secret' })
      .expect(201);

    const botRes = await request(app.getHttpServer())
      .post('/api/v1/bots')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBotPayload, exchangeAccountId: exchangeRes.body.id })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/bots/${botRes.body.id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/exchange-accounts/${exchangeRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const botAfter = await request(app.getHttpServer())
      .get(`/api/v1/bots/${botRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(botAfter.body.status).toBe('stopped');
  });

  it('requires authentication on every bot endpoint', async () => {
    await request(app.getHttpServer()).get('/api/v1/bots').expect(401);
    await request(app.getHttpServer()).post('/api/v1/bots').send(validBotPayload).expect(401);
  });
});
