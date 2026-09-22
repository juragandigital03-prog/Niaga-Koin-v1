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
  InvalidExchangeCredentialsError,
} from '../src/exchange/exchange-adapter.interface';

/**
 * Uses an injected fake adapter — same reasoning as market-data.e2e-spec.ts:
 * this sandbox blocks egress to api.binance.com, and tests shouldn't depend
 * on a live third-party API regardless. Real Binance credential validation
 * must be checked on the developer's own machine.
 */
class FakeExchangeAdapter implements ExchangeAdapter {
  public nextResult: ExchangePermissions | 'invalid' = { canTrade: true, canWithdraw: false };

  async checkPermissions(): Promise<ExchangePermissions> {
    if (this.nextResult === 'invalid') {
      throw new InvalidExchangeCredentialsError();
    }
    return this.nextResult;
  }
}

describe('Exchange Accounts (e2e)', () => {
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
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-exchange-test' } } });
    await app.close();
  });

  it('connects, lists, and disconnects an exchange account for the authenticated user', async () => {
    const token = await registerAndLogin(`e2e-exchange-test-${Date.now()}@example.com`);
    fakeAdapter.nextResult = { canTrade: true, canWithdraw: false };

    const connectRes = await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ exchangeName: 'binance', apiKey: 'my-key', apiSecret: 'my-secret' })
      .expect(201);
    expect(connectRes.body.connectionStatus).toBe('connected');

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(connectRes.body.id);
    expect(JSON.stringify(listRes.body)).not.toContain('my-secret');

    await request(app.getHttpServer())
      .delete(`/api/v1/exchange-accounts/${connectRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const listAfterDelete = await request(app.getHttpServer())
      .get('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listAfterDelete.body).toHaveLength(0);
  });

  it('rejects a key with withdrawal permission with 422 and stores nothing', async () => {
    const token = await registerAndLogin(`e2e-exchange-test-withdraw-${Date.now()}@example.com`);
    fakeAdapter.nextResult = { canTrade: true, canWithdraw: true };

    await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ exchangeName: 'binance', apiKey: 'my-key', apiSecret: 'my-secret' })
      .expect(422)
      .expect((res) => expect(res.body.error).toBe('INVALID_PERMISSION_SCOPE'));

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body).toHaveLength(0);
  });

  it('rejects invalid credentials with 400', async () => {
    const token = await registerAndLogin(`e2e-exchange-test-invalid-${Date.now()}@example.com`);
    fakeAdapter.nextResult = 'invalid';

    await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ exchangeName: 'binance', apiKey: 'bad', apiSecret: 'bad' })
      .expect(400)
      .expect((res) => expect(res.body.error).toBe('INVALID_CREDENTIALS'));
  });

  it('rejects an unsupported exchange name', async () => {
    const token = await registerAndLogin(`e2e-exchange-test-unsupported-${Date.now()}@example.com`);

    await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ exchangeName: 'okx', apiKey: 'key', apiSecret: 'secret' })
      .expect(400);
  });

  it('never lets one user see or delete another user\'s exchange account', async () => {
    fakeAdapter.nextResult = { canTrade: true, canWithdraw: false };
    const tokenA = await registerAndLogin(`e2e-exchange-test-isolation-a-${Date.now()}@example.com`);
    const tokenB = await registerAndLogin(`e2e-exchange-test-isolation-b-${Date.now()}@example.com`);

    const connectRes = await request(app.getHttpServer())
      .post('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ exchangeName: 'binance', apiKey: 'a-key', apiSecret: 'a-secret' })
      .expect(201);

    const listAsB = await request(app.getHttpServer())
      .get('/api/v1/exchange-accounts')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listAsB.body).toHaveLength(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/exchange-accounts/${connectRes.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/exchange-accounts').expect(401);
  });
});
