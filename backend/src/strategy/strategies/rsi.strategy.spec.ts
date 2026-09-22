import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { RsiStrategy } from './rsi.strategy';
import { Candle } from '../../market-data/market-data-provider.interface';

function candle(close: number): Candle {
  return { openTime: '', open: close, high: close, low: close, close, volume: 0, closeTime: '' };
}

describe('RsiStrategy', () => {
  const strategy = new RsiStrategy();

  describe('validateParameters', () => {
    it('accepts the defaults (empty parameters object)', () => {
      expect(() => strategy.validateParameters({})).not.toThrow();
    });

    it('rejects a non-integer or out-of-range period', () => {
      expect(() => strategy.validateParameters({ period: 1 })).toThrow(BadRequestException);
      expect(() => strategy.validateParameters({ period: 101 })).toThrow(BadRequestException);
      expect(() => strategy.validateParameters({ period: 14.5 })).toThrow(BadRequestException);
    });

    it('rejects an out-of-range oversold/overbought threshold', () => {
      expect(() => strategy.validateParameters({ oversold: 0 })).toThrow(BadRequestException);
      expect(() => strategy.validateParameters({ overbought: 100 })).toThrow(BadRequestException);
    });

    it('rejects oversold >= overbought', () => {
      expect(() => strategy.validateParameters({ oversold: 70, overbought: 30 })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('requiredCandleCount', () => {
    it('is period + 1', () => {
      expect(strategy.requiredCandleCount({ period: 14 })).toBe(15);
      expect(strategy.requiredCandleCount({})).toBe(15); // default period 14
    });
  });

  describe('evaluate', () => {
    it('throws ServiceUnavailableException when fewer candles than required are given', () => {
      const candles = [candle(100)];
      expect(() => strategy.evaluate({ period: 14 }, candles)).toThrow(ServiceUnavailableException);
    });

    it('signals buy when the market has been steadily declining (low RSI)', () => {
      // 15 closes, strictly decreasing -> all losses, no gains -> RSI = 0
      const candles = Array.from({ length: 15 }, (_, i) => candle(100 - i));
      const result = strategy.evaluate({ period: 14, oversold: 30, overbought: 70 }, candles);
      expect(result.signal).toBe('buy');
      expect(result.value).toBe(0);
    });

    it('signals sell when the market has been steadily rising (high RSI)', () => {
      // 15 closes, strictly increasing -> all gains, no losses -> RSI = 100
      const candles = Array.from({ length: 15 }, (_, i) => candle(100 + i));
      const result = strategy.evaluate({ period: 14, oversold: 30, overbought: 70 }, candles);
      expect(result.signal).toBe('sell');
      expect(result.value).toBe(100);
    });

    it('signals hold when gains and losses are balanced (neutral RSI)', () => {
      // Alternating +1/-1 over 14 deltas -> equal avgGain/avgLoss -> RSI = 50
      const closes = [100];
      for (let i = 0; i < 14; i++) {
        closes.push(closes[closes.length - 1] + (i % 2 === 0 ? 1 : -1));
      }
      const candles = closes.map(candle);
      const result = strategy.evaluate({ period: 14, oversold: 30, overbought: 70 }, candles);
      expect(result.signal).toBe('hold');
      expect(result.value).toBe(50);
    });
  });
});
