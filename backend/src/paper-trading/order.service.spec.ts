import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderService } from './order.service';

const CONFIG: Record<string, string> = {
  PAPER_TRADING_FEE_PERCENT: '0.1',
  PAPER_TRADING_SLIPPAGE_PERCENT: '0.05',
  PAPER_TRADING_MIN_NOTIONAL_USDT: '10',
  PAPER_TRADING_QUANTITY_PRECISION: '6',
};
const fakeConfig = { get: (key: string) => CONFIG[key] } as any;
const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as any;

function buildOrderRow(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    symbol: 'BTCUSDT',
    side: 'buy',
    quantity: new Prisma.Decimal('0.001'),
    status: 'filled',
    rejectReason: null,
    isPaper: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('OrderService', () => {
  let prisma: any;
  let marketData: { supportedSymbols: string[]; getTicker: jest.Mock };
  let wallet: { getOrCreateBalance: jest.Mock };
  let service: OrderService;

  beforeEach(() => {
    prisma = {
      balance: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
      position: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
      order: { create: jest.fn(), findMany: jest.fn() },
      trade: { create: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    marketData = { supportedSymbols: ['BTCUSDT', 'ETHUSDT'], getTicker: jest.fn() };
    wallet = { getOrCreateBalance: jest.fn().mockResolvedValue({}) };
    service = new OrderService(prisma, fakeConfig, marketData as any, wallet as any, fakeLogger);
  });

  it('rejects an unsupported symbol at the input level, without creating any Order row', async () => {
    await expect(
      service.placeOrder('user-1', { symbol: 'DOGEUSDT', side: 'buy', quantity: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rejects when rounding quantity down to the configured precision yields zero', async () => {
    await expect(
      service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.0000001 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a rejected order (not a 503) when market data is unavailable — fail-safe with an audit trail', async () => {
    marketData.getTicker.mockRejectedValue(new ServiceUnavailableException());
    prisma.order.create.mockResolvedValue(
      buildOrderRow({ status: 'rejected', rejectReason: 'MARKET_DATA_UNAVAILABLE' }),
    );

    const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 });

    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toBe('MARKET_DATA_UNAVAILABLE');
    expect(prisma.balance.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an order below the configured minimum notional, without touching balance', async () => {
    marketData.getTicker.mockResolvedValue({ symbol: 'BTCUSDT', price: 100, asOf: new Date().toISOString() });
    prisma.order.create.mockResolvedValue(
      buildOrderRow({ quantity: new Prisma.Decimal('0.001'), status: 'rejected', rejectReason: 'BELOW_MIN_NOTIONAL' }),
    );

    // 0.001 * 100 = 0.1 USDT notional, well under the 10 USDT minimum
    const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.001 });

    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toBe('BELOW_MIN_NOTIONAL');
    expect(prisma.balance.updateMany).not.toHaveBeenCalled();
  });

  describe('buy', () => {
    beforeEach(() => {
      marketData.getTicker.mockResolvedValue({ symbol: 'BTCUSDT', price: 60000, asOf: new Date().toISOString() });
    });

    it('rejects for insufficient balance and never creates a position or trade', async () => {
      prisma.balance.updateMany.mockResolvedValue({ count: 0 }); // conditional debit found nothing to debit
      prisma.order.create.mockResolvedValue(
        buildOrderRow({ status: 'rejected', rejectReason: 'INSUFFICIENT_BALANCE' }),
      );

      const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 });

      expect(result.status).toBe('rejected');
      expect(result.rejectReason).toBe('INSUFFICIENT_BALANCE');
      expect(prisma.position.upsert).not.toHaveBeenCalled();
      expect(prisma.trade.create).not.toHaveBeenCalled();
    });

    it('applies positive slippage on buy, charges a fee, and fills at a price above the raw ticker', async () => {
      prisma.balance.updateMany.mockResolvedValue({ count: 1 });
      prisma.position.findUnique.mockResolvedValue(null);
      prisma.position.upsert.mockResolvedValue({});
      prisma.order.create.mockResolvedValue(buildOrderRow({ quantity: new Prisma.Decimal('0.01') }));
      prisma.trade.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'trade-1', ...data }));

      const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 });

      expect(result.status).toBe('filled');
      expect(result.trade).not.toBeNull();
      // ticker 60000, +0.05% slippage => 60030 execution price
      expect(result.trade!.executedPrice).toBe('60030');
      // notional = 0.01 * 60030 = 600.3, fee = 0.1% = 0.6003
      expect(result.trade!.fee).toBe('0.6003');

      const debitArgs = prisma.balance.updateMany.mock.calls[0][0];
      expect(debitArgs.where.amount.gte.toString()).toBe('600.9003'); // notional + fee
    });

    it('computes a quantity-weighted average entry price when adding to an existing position', async () => {
      prisma.balance.updateMany.mockResolvedValue({ count: 1 });
      prisma.position.findUnique.mockResolvedValue({
        quantity: new Prisma.Decimal('0.01'),
        avgEntryPrice: new Prisma.Decimal('50000'),
      });
      prisma.position.upsert.mockResolvedValue({});
      prisma.order.create.mockResolvedValue(buildOrderRow());
      prisma.trade.create.mockResolvedValue({
        executedPrice: new Prisma.Decimal('60030'),
        executedQuantity: new Prisma.Decimal('0.01'),
        fee: new Prisma.Decimal('0.6003'),
        executedAt: new Date(),
      });

      await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'buy', quantity: 0.01 });

      const upsertArgs = prisma.position.upsert.mock.calls[0][0];
      // (0.01*50000 + 0.01*60030) / 0.02 = 55015
      expect(upsertArgs.update.avgEntryPrice.toString()).toBe('55015');
      expect(upsertArgs.update.quantity.toString()).toBe('0.02');
    });
  });

  describe('sell', () => {
    beforeEach(() => {
      marketData.getTicker.mockResolvedValue({ symbol: 'BTCUSDT', price: 60000, asOf: new Date().toISOString() });
    });

    it('rejects when the user does not hold enough of the symbol (no short selling)', async () => {
      prisma.position.updateMany.mockResolvedValue({ count: 0 });
      prisma.order.create.mockResolvedValue(
        buildOrderRow({ side: 'sell', status: 'rejected', rejectReason: 'INSUFFICIENT_POSITION' }),
      );

      const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'sell', quantity: 0.01 });

      expect(result.status).toBe('rejected');
      expect(result.rejectReason).toBe('INSUFFICIENT_POSITION');
      expect(prisma.balance.upsert).not.toHaveBeenCalled();
    });

    it('applies negative slippage on sell and credits proceeds net of fee', async () => {
      prisma.position.updateMany.mockResolvedValue({ count: 1 });
      prisma.balance.upsert.mockResolvedValue({});
      prisma.order.create.mockResolvedValue(buildOrderRow({ side: 'sell' }));
      prisma.trade.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'trade-1', ...data }));

      const result = await service.placeOrder('user-1', { symbol: 'BTCUSDT', side: 'sell', quantity: 0.01 });

      expect(result.status).toBe('filled');
      // ticker 60000, -0.05% slippage => 59970 execution price
      expect(result.trade!.executedPrice).toBe('59970');

      const creditArgs = prisma.balance.upsert.mock.calls[0][0];
      // notional = 0.01*59970 = 599.7, fee = 0.5997, proceeds = 599.1003
      expect(creditArgs.create.amount.toString()).toBe('599.1003');
    });
  });

  describe('listOrders', () => {
    it('scopes to the requesting user and paper orders only, newest first', async () => {
      prisma.order.findMany.mockResolvedValue([buildOrderRow({ trade: null })]);

      await service.listOrders('user-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isPaper: true },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('filters by symbol when provided', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.listOrders('user-1', 'ethusdt');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', isPaper: true, symbol: 'ETHUSDT' } }),
      );
    });
  });
});
