import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns ok with paper-only trading mode when the database responds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.tradingMode).toBe('paper-only');
    expect(result.liveTradingEnabled).toBe(false);
  });

  it('throws ServiceUnavailableException when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
