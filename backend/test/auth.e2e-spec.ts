import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OTP_PROVIDER, OtpProvider } from '../src/auth/otp/otp-provider.interface';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let capturedCode: string;

  const spyOtpProvider: OtpProvider = {
    send: async (_destination, code) => {
      capturedCode = code;
    },
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://gain_dev:gain_dev_local@localhost:5432/gain_dev';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OTP_PROVIDER)
      .useValue(spyOtpProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-auth-test' } } });
    await app.close();
  });

  const email = `e2e-auth-test-${Date.now()}@example.com`;
  const password = 'correct-horse-battery-9';

  it('walks the full register -> verify-otp -> login -> me flow', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    expect(registerRes.body.userId).toBeDefined();
    expect(registerRes.body.registrationToken).toBeDefined();
    expect(capturedCode).toMatch(/^\d{6}$/);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .set('Authorization', `Bearer ${registerRes.body.registrationToken}`)
      .send({ code: capturedCode })
      .expect(200);

    expect(verifyRes.body).toEqual({ verified: true });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
    expect(meRes.body.status).toBe('active');
    expect(meRes.body).not.toHaveProperty('passwordHash');
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong-password-entirely' })
      .expect(401);
  });

  it('rejects a wrong OTP code and rejects /users/me without a token', async () => {
    const otherEmail = `e2e-auth-test-wrongotp-${Date.now()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: otherEmail, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .set('Authorization', `Bearer ${registerRes.body.registrationToken}`)
      .send({ code: '000000' })
      .expect(400);

    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('rejects a registration token being reused on a protected app route', async () => {
    const otherEmail = `e2e-auth-test-tokenreuse-${Date.now()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: otherEmail, password })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${registerRes.body.registrationToken}`)
      .expect(401);
  });
});
