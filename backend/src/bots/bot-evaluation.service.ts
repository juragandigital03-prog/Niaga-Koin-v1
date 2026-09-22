import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { Candle, CandleInterval } from '../market-data/market-data-provider.interface';
import { MarketDataService } from '../market-data/market-data.service';
import { StrategyEngineService } from '../strategy/strategy-engine.service';
import { RiskEngineService } from '../risk/risk-engine.service';
import { OrderService, OrderResult } from '../paper-trading/order.service';
import { BotsService } from './bots.service';

export interface EvaluateResult {
  botId: string;
  signal: 'buy' | 'sell' | 'hold';
  indicator: string | null;
  indicatorValue: number | null;
  executed: boolean;
  blockedReason: 'MARKET_DATA_UNAVAILABLE' | 'MAX_POSITION_EXCEEDED' | 'NO_OPEN_POSITION' | null;
  order: OrderResult | null;
}

/**
 * Orchestrates one full Strategy Engine -> Risk Engine -> Trading Engine
 * cycle for a single bot (SDD §5.3-5.5). Deliberately synchronous and
 * manually triggered (`POST /bots/{id}/evaluate`) — no scheduler/queue
 * yet, see IMPLEMENTATION_PLAN.md Fase 5b notes. A signal the Risk Engine
 * rejects, or that Strategy Engine resolves to 'hold', never reaches
 * OrderService (FR-RISK-001).
 */
@Injectable()
export class BotEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly marketData: MarketDataService,
    private readonly strategyEngine: StrategyEngineService,
    private readonly riskEngine: RiskEngineService,
    private readonly orderService: OrderService,
    private readonly bots: BotsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BotEvaluationService.name);
  }

  private get candleInterval(): CandleInterval {
    return (this.config.get<string>('BOT_EVALUATE_CANDLE_INTERVAL') ?? '1h') as CandleInterval;
  }

  async evaluate(userId: string, botId: string): Promise<EvaluateResult> {
    const bot = await this.bots.get(userId, botId);
    if (bot.status !== 'active') {
      throw new BadRequestException('Bot harus berstatus active untuk dievaluasi');
    }

    const parameters = bot.parameters as Record<string, unknown>;
    const riskLimits = bot.riskLimits as Record<string, unknown>;
    const limit = this.strategyEngine.requiredCandleCount(bot.strategyType, parameters);

    let candles: Candle[];
    try {
      candles = await this.marketData.getCandles(bot.symbol, this.candleInterval, limit);
      const evaluation = this.strategyEngine.evaluate(bot.strategyType, parameters, candles);
      return this.act(userId, bot.id, bot.symbol, riskLimits, evaluation, candles);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) {
        this.logger.warn({ userId, botId, symbol: bot.symbol }, 'Bot evaluation: market data unavailable');
        return {
          botId: bot.id,
          signal: 'hold',
          indicator: null,
          indicatorValue: null,
          executed: false,
          blockedReason: 'MARKET_DATA_UNAVAILABLE',
          order: null,
        };
      }
      throw err;
    }
  }

  private async act(
    userId: string,
    botId: string,
    symbol: string,
    riskLimits: Record<string, unknown>,
    evaluation: { signal: 'buy' | 'sell' | 'hold'; indicator: string; value: number },
    candles: Candle[],
  ): Promise<EvaluateResult> {
    const base: Omit<EvaluateResult, 'executed' | 'blockedReason' | 'order'> = {
      botId,
      signal: evaluation.signal,
      indicator: evaluation.indicator,
      indicatorValue: evaluation.value,
    };

    if (evaluation.signal === 'hold') {
      return { ...base, executed: false, blockedReason: null, order: null };
    }

    const currentPrice = new Prisma.Decimal(candles[candles.length - 1].close);
    const position = await this.prisma.position.findUnique({
      where: { userId_symbol_isPaper: { userId, symbol, isPaper: true } },
    });
    const currentQuantity = position?.quantity ?? new Prisma.Decimal(0);

    const decision =
      evaluation.signal === 'buy'
        ? this.riskEngine.evaluateBuy(riskLimits, currentQuantity.mul(currentPrice), currentPrice)
        : this.riskEngine.evaluateSell(currentQuantity);

    if (!decision.approved || !decision.quantity) {
      this.logger.warn(
        { userId, botId, symbol, signal: evaluation.signal, reason: decision.reason },
        'Risk Engine rejected signal',
      );
      return { ...base, executed: false, blockedReason: decision.reason, order: null };
    }

    const order = await this.orderService.placeOrder(userId, {
      symbol,
      side: evaluation.signal,
      quantity: decision.quantity.toNumber(),
    });

    this.logger.info(
      { userId, botId, symbol, signal: evaluation.signal, orderId: order.id, orderStatus: order.status },
      'Bot evaluation placed an order',
    );
    return { ...base, executed: order.status === 'filled', blockedReason: null, order };
  }
}
