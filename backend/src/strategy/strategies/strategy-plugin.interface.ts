import { Candle } from '../../market-data/market-data-provider.interface';

export type TradeSignal = 'buy' | 'sell' | 'hold';

export interface StrategyEvaluation {
  signal: TradeSignal;
  indicator: string;
  value: number;
}

/**
 * SDD §5.3 requires the Strategy Engine to be plugin-based so new
 * indicators can be added without touching the engine itself (Prinsip 9).
 * Only one plugin (RSI) exists today — see FR-STRAT-001, which lists
 * RSI/MACD/Bollinger as common examples, not an exhaustive requirement.
 */
export interface StrategyPlugin {
  /** Throws BadRequestException on an out-of-range/malformed parameter (FR-STRAT-002). */
  validateParameters(parameters: Record<string, unknown>): void;
  /** How many most-recent candles this plugin needs to produce one evaluation. */
  requiredCandleCount(parameters: Record<string, unknown>): number;
  /** Throws ServiceUnavailableException if `candles` is shorter than required. */
  evaluate(parameters: Record<string, unknown>, candles: Candle[]): StrategyEvaluation;
}
