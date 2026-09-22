import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BotEvaluationService } from './bot-evaluation.service';
import { StrategyEngineService } from '../strategy/strategy-engine.service';
import { RiskEngineService } from '../risk/risk-engine.service';

const fakeLogger = { setContext: jest.fn(), info: jest.fn(), warn: jest.fn() } as any;

function buildBot(overrides: Partial<any> = {}) {
  return {
    id: 'bot-1',
    userId: 'user-1',
    symbol: 'BTCUSDT',
    strategyType: 'rsi',
    parameters: { period: 14, oversold: 30, overbought: 70 },
    riskLimits: { maxPositionUsdt: 500 },
    status: 'active',
    ...overrides,
  };
}

describe('BotEvaluationService', () => {
  let prisma: any;
  let config: any;
  let marketData: any;
  let strategyEngine: jest.Mocked<Pick<StrategyEngineService, 'requiredCandleCount' | 'evaluate'>>;
  let riskEngine: jest.Mocked<Pick<RiskEngineService, 'evaluateBuy' | 'evaluateSell'>>;
  let orderService: any;
  let bots: any;
  let service: BotEvaluationService;

  const CANDLES = [{ close: 100 }];

  beforeEach(() => {
    prisma = { position: { findUnique: jest.fn().mockResolvedValue(null) } };
    config = { get: () => undefined };
    marketData = { getCandles: jest.fn().mockResolvedValue(CANDLES) };
    strategyEngine = { requiredCandleCount: jest.fn().mockReturnValue(15), evaluate: jest.fn() };
    riskEngine = { evaluateBuy: jest.fn(), evaluateSell: jest.fn() };
    orderService = { placeOrder: jest.fn() };
    bots = { get: jest.fn().mockResolvedValue(buildBot()) };

    service = new BotEvaluationService(
      prisma,
      config,
      marketData,
      strategyEngine as any,
      riskEngine as any,
      orderService,
      bots,
      fakeLogger,
    );
  });

  it('refuses to evaluate a bot that is not active', async () => {
    bots.get.mockResolvedValue(buildBot({ status: 'stopped' }));
    await expect(service.evaluate('user-1', 'bot-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(marketData.getCandles).not.toHaveBeenCalled();
  });

  it('returns a MARKET_DATA_UNAVAILABLE result when candles cannot be fetched, without throwing', async () => {
    marketData.getCandles.mockRejectedValue(new ServiceUnavailableException('down'));

    const result = await service.evaluate('user-1', 'bot-1');

    expect(result).toEqual({
      botId: 'bot-1',
      signal: 'hold',
      indicator: null,
      indicatorValue: null,
      executed: false,
      blockedReason: 'MARKET_DATA_UNAVAILABLE',
      order: null,
    });
    expect(orderService.placeOrder).not.toHaveBeenCalled();
  });

  it('does not place an order when the strategy signal is hold', async () => {
    strategyEngine.evaluate.mockReturnValue({ signal: 'hold', indicator: 'rsi', value: 50 });

    const result = await service.evaluate('user-1', 'bot-1');

    expect(result.executed).toBe(false);
    expect(result.blockedReason).toBeNull();
    expect(orderService.placeOrder).not.toHaveBeenCalled();
  });

  it('never places an order when the Risk Engine rejects a buy signal (FR-RISK-001)', async () => {
    strategyEngine.evaluate.mockReturnValue({ signal: 'buy', indicator: 'rsi', value: 20 });
    riskEngine.evaluateBuy.mockReturnValue({ approved: false, reason: 'MAX_POSITION_EXCEEDED', quantity: null });

    const result = await service.evaluate('user-1', 'bot-1');

    expect(result.executed).toBe(false);
    expect(result.blockedReason).toBe('MAX_POSITION_EXCEEDED');
    expect(orderService.placeOrder).not.toHaveBeenCalled();
  });

  it('places a buy order with the risk-approved quantity when everything is approved', async () => {
    strategyEngine.evaluate.mockReturnValue({ signal: 'buy', indicator: 'rsi', value: 20 });
    riskEngine.evaluateBuy.mockReturnValue({ approved: true, reason: null, quantity: new Prisma.Decimal(5) });
    orderService.placeOrder.mockResolvedValue({ id: 'order-1', status: 'filled' });

    const result = await service.evaluate('user-1', 'bot-1');

    expect(orderService.placeOrder).toHaveBeenCalledWith('user-1', {
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: 5,
    });
    expect(result.executed).toBe(true);
    expect(result.order).toEqual({ id: 'order-1', status: 'filled' });
  });

  it('rejects a sell signal with NO_OPEN_POSITION when there is nothing to sell', async () => {
    strategyEngine.evaluate.mockReturnValue({ signal: 'sell', indicator: 'rsi', value: 80 });
    riskEngine.evaluateSell.mockReturnValue({ approved: false, reason: 'NO_OPEN_POSITION', quantity: null });

    const result = await service.evaluate('user-1', 'bot-1');

    expect(result.executed).toBe(false);
    expect(result.blockedReason).toBe('NO_OPEN_POSITION');
    expect(orderService.placeOrder).not.toHaveBeenCalled();
  });

  it('places a sell order for the full existing position when approved', async () => {
    prisma.position.findUnique.mockResolvedValue({ quantity: new Prisma.Decimal(2.5) });
    strategyEngine.evaluate.mockReturnValue({ signal: 'sell', indicator: 'rsi', value: 80 });
    riskEngine.evaluateSell.mockReturnValue({ approved: true, reason: null, quantity: new Prisma.Decimal(2.5) });
    orderService.placeOrder.mockResolvedValue({ id: 'order-2', status: 'filled' });

    const result = await service.evaluate('user-1', 'bot-1');

    expect(orderService.placeOrder).toHaveBeenCalledWith('user-1', {
      symbol: 'BTCUSDT',
      side: 'sell',
      quantity: 2.5,
    });
    expect(result.executed).toBe(true);
  });
});
