import { Prisma } from '@prisma/client';
import { WalletService } from './wallet.service';

const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as any;
const CONFIG: Record<string, string> = { PAPER_TRADING_DEFAULT_BALANCE_USDT: '10000' };
const fakeConfig = { get: (key: string) => CONFIG[key] } as any;

describe('WalletService', () => {
  let prisma: any;
  let service: WalletService;

  beforeEach(() => {
    prisma = {
      balance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      position: { findMany: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new WalletService(prisma, fakeConfig, fakeLogger);
  });

  it('creates a wallet with the configured default balance on first access', async () => {
    prisma.balance.findUnique.mockResolvedValue(null);
    prisma.balance.create.mockResolvedValue({ id: 'bal-1', amount: new Prisma.Decimal(10000) });

    const balance = await service.getOrCreateBalance('user-1');

    expect(prisma.balance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', asset: 'USDT', isPaper: true }),
      }),
    );
    expect(balance.amount.toString()).toBe('10000');
  });

  it('does not recreate a wallet that already exists', async () => {
    prisma.balance.findUnique.mockResolvedValue({ id: 'bal-1', amount: new Prisma.Decimal(5000) });

    const balance = await service.getOrCreateBalance('user-1');

    expect(prisma.balance.create).not.toHaveBeenCalled();
    expect(balance.amount.toString()).toBe('5000');
  });

  it('summarizes balance and positions, excluding zero-quantity positions', async () => {
    prisma.balance.findUnique.mockResolvedValue({ id: 'bal-1', amount: new Prisma.Decimal(8000) });
    prisma.position.findMany.mockResolvedValue([
      { symbol: 'BTCUSDT', quantity: new Prisma.Decimal('0.5'), avgEntryPrice: new Prisma.Decimal(60000) },
    ]);

    const summary = await service.getSummary('user-1');

    expect(summary.balanceUsdt).toBe('8000');
    expect(summary.positions).toEqual([
      { symbol: 'BTCUSDT', quantity: '0.5', avgEntryPrice: '60000' },
    ]);
    expect(prisma.position.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ quantity: { gt: 0 } }) }),
    );
  });

  it('reset restores the default balance and clears all positions', async () => {
    prisma.balance.findUnique
      .mockResolvedValueOnce({ id: 'bal-1', amount: new Prisma.Decimal(500) }) // getOrCreateBalance guard
      .mockResolvedValueOnce({ id: 'bal-1', amount: new Prisma.Decimal(10000) }); // getSummary after reset
    prisma.position.findMany.mockResolvedValue([]);

    const summary = await service.reset('user-1');

    expect(prisma.balance.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { amount: expect.any(Prisma.Decimal) } }),
    );
    expect(prisma.position.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isPaper: true },
    });
    expect(summary.balanceUsdt).toBe('10000');
    expect(summary.positions).toEqual([]);
  });
});
