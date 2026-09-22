import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Candle } from '../../market-data/market-data-provider.interface';
import { StrategyEvaluation, StrategyPlugin } from './strategy-plugin.interface';

// Textbook RSI defaults (Wilder, 14-period, 30/70 thresholds) — public
// technical-analysis convention, not a fabricated business rule. SRS
// FR-STRAT-002 leaves the valid range TBD ("rentang final ditetapkan tim
// strategi"); these bounds are a PROPOSED sane default, documented here
// and in FEATURE_MATRIX.md, not a hidden assumption.
const DEFAULTS = { period: 14, oversold: 30, overbought: 70 };
const MIN_PERIOD = 2;
const MAX_PERIOD = 100;

interface RsiParameters {
  period: number;
  oversold: number;
  overbought: number;
}

function readParameters(parameters: Record<string, unknown>): RsiParameters {
  return {
    period: Number(parameters.period ?? DEFAULTS.period),
    oversold: Number(parameters.oversold ?? DEFAULTS.oversold),
    overbought: Number(parameters.overbought ?? DEFAULTS.overbought),
  };
}

/**
 * Simple (non-Wilder-smoothed) RSI over the most recent `period + 1`
 * closes — a documented simplification, same spirit as the paper trading
 * slippage model: deterministic and easy to test, not a full recursive
 * smoothing over the entire candle history.
 */
function computeRsi(closes: number[], period: number): number {
  const window = closes.slice(-(period + 1));
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i < window.length; i++) {
    const delta = window[i] - window[i - 1];
    if (delta >= 0) {
      gainSum += delta;
    } else {
      lossSum += Math.abs(delta);
    }
  }
  const avgGain = gainSum / period;
  const avgLoss = lossSum / period;
  if (avgLoss === 0) {
    return 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export class RsiStrategy implements StrategyPlugin {
  validateParameters(parameters: Record<string, unknown>): void {
    const { period, oversold, overbought } = readParameters(parameters);
    if (!Number.isInteger(period) || period < MIN_PERIOD || period > MAX_PERIOD) {
      throw new BadRequestException(
        `Parameter 'period' RSI harus bilangan bulat antara ${MIN_PERIOD}-${MAX_PERIOD}`,
      );
    }
    if (!Number.isFinite(oversold) || oversold < 1 || oversold > 49) {
      throw new BadRequestException("Parameter 'oversold' RSI harus antara 1-49");
    }
    if (!Number.isFinite(overbought) || overbought < 51 || overbought > 99) {
      throw new BadRequestException("Parameter 'overbought' RSI harus antara 51-99");
    }
    if (oversold >= overbought) {
      throw new BadRequestException("Parameter 'oversold' harus lebih kecil dari 'overbought'");
    }
  }

  requiredCandleCount(parameters: Record<string, unknown>): number {
    return readParameters(parameters).period + 1;
  }

  evaluate(parameters: Record<string, unknown>, candles: Candle[]): StrategyEvaluation {
    const { period, oversold, overbought } = readParameters(parameters);
    if (candles.length < period + 1) {
      throw new ServiceUnavailableException(
        `Candle tidak cukup untuk menghitung RSI (butuh minimal ${period + 1}, tersedia ${candles.length})`,
      );
    }

    const rsi = computeRsi(
      candles.map((c) => c.close),
      period,
    );

    let signal: StrategyEvaluation['signal'] = 'hold';
    if (rsi < oversold) {
      signal = 'buy';
    } else if (rsi > overbought) {
      signal = 'sell';
    }

    return { signal, indicator: 'rsi', value: rsi };
  }
}
