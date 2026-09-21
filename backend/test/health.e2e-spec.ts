import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://gain_dev:gain_dev_local@localhost:5432/gain_dev';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns paper-only status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.tradingMode).toBe('paper-only');
    expect(res.body.liveTradingEnabled).toBe(false);
  });
});
