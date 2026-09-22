import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BotsService } from './bots.service';

const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as any;
const CONFIG: Record<string, string> = { MAX_BOTS_PER_USER: '10' };
const fakeConfig = { get: (key: string) => CONFIG[key] } as any;

function buildBot(overrides: Partial<any> = {}) {
  return {
    id: 'bot-1',
    userId: 'user-1',
    exchangeAccountId: null,
    name: 'BTC Trend Scalper',
    symbol: 'BTCUSDT',
    strategyType: 'rsi',
    parameters: { period: 14 },
    riskLimits: { maxPositionUsdt: 500 },
    status: 'stopped',
    isPaper: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validDto = {
  name: 'BTC Trend Scalper',
  symbol: 'BTCUSDT',
  strategyType: 'rsi',
  parameters: { period: 14 },
  riskLimits: { maxPositionUsdt: 500 },
};

describe('BotsService', () => {
  let prisma: any;
  let marketData: { supportedSymbols: string[] };
  let service: BotsService;

  beforeEach(() => {
    prisma = {
      bot: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
      exchangeAccount: { findFirst: jest.fn() },
    };
    marketData = { supportedSymbols: ['BTCUSDT', 'ETHUSDT'] };
    service = new BotsService(prisma, fakeConfig, marketData as any, fakeLogger);
  });

  describe('create', () => {
    it('rejects an unsupported symbol without creating a row', async () => {
      await expect(service.create('user-1', { ...validDto, symbol: 'DOGEUSDT' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.bot.create).not.toHaveBeenCalled();
    });

    it('rejects once the per-user bot limit is reached', async () => {
      prisma.bot.count.mockResolvedValue(10);
      await expect(service.create('user-1', validDto)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.bot.create).not.toHaveBeenCalled();
    });

    it("rejects an exchangeAccountId that doesn't belong to the requesting user", async () => {
      prisma.bot.count.mockResolvedValue(0);
      prisma.exchangeAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { ...validDto, exchangeAccountId: 'someone-elses-account' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.bot.create).not.toHaveBeenCalled();
    });

    it('creates the bot in stopped status when everything is valid', async () => {
      prisma.bot.count.mockResolvedValue(0);
      prisma.bot.create.mockResolvedValue(buildBot());

      const bot = await service.create('user-1', validDto);

      expect(bot.status).toBe('stopped');
      expect(prisma.bot.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', status: 'stopped' }) }),
      );
    });
  });

  describe('lifecycle transitions', () => {
    it('start activates a stopped bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'stopped' }));
      prisma.bot.update.mockResolvedValue(buildBot({ status: 'active' }));

      const bot = await service.start('user-1', 'bot-1');

      expect(bot.status).toBe('active');
      expect(prisma.bot.update).toHaveBeenCalledWith({ where: { id: 'bot-1' }, data: { status: 'active' } });
    });

    it('start is idempotent on an already-active bot (no error, no redundant write)', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'active' }));

      const bot = await service.start('user-1', 'bot-1');

      expect(bot.status).toBe('active');
      expect(prisma.bot.update).not.toHaveBeenCalled();
    });

    it('pause requires the bot to currently be active', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'stopped' }));

      await expect(service.pause('user-1', 'bot-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.bot.update).not.toHaveBeenCalled();
    });

    it('pause is idempotent when already paused', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'paused' }));

      const bot = await service.pause('user-1', 'bot-1');

      expect(bot.status).toBe('paused');
      expect(prisma.bot.update).not.toHaveBeenCalled();
    });

    it('stop works from active or paused, and is idempotent when already stopped', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'active' }));
      prisma.bot.update.mockResolvedValue(buildBot({ status: 'stopped' }));

      const bot = await service.stop('user-1', 'bot-1');
      expect(bot.status).toBe('stopped');

      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'stopped' }));
      prisma.bot.update.mockClear();
      const second = await service.stop('user-1', 'bot-1');
      expect(second.status).toBe('stopped');
      expect(prisma.bot.update).not.toHaveBeenCalled();
    });

    it('throws 404 for a bot that does not belong to the requesting user', async () => {
      prisma.bot.findFirst.mockResolvedValue(null);
      await expect(service.start('user-2', 'bot-owned-by-user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a stopped bot', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'stopped' }));

      await service.remove('user-1', 'bot-1');

      expect(prisma.bot.delete).toHaveBeenCalledWith({ where: { id: 'bot-1' } });
    });

    it('refuses to delete a bot that is still active', async () => {
      prisma.bot.findFirst.mockResolvedValue(buildBot({ status: 'active' }));

      await expect(service.remove('user-1', 'bot-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.bot.delete).not.toHaveBeenCalled();
    });
  });
});
