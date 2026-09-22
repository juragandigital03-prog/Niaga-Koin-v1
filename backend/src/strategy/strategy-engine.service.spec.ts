import { InternalServerErrorException } from '@nestjs/common';
import { StrategyEngineService } from './strategy-engine.service';

describe('StrategyEngineService', () => {
  const service = new StrategyEngineService();

  it('routes to the rsi plugin for validateParameters/requiredCandleCount', () => {
    expect(() => service.validateParameters('rsi', { period: 14 })).not.toThrow();
    expect(service.requiredCandleCount('rsi', { period: 14 })).toBe(15);
  });

  it('throws for an unknown strategyType (defensive — DTO already whitelists this)', () => {
    expect(() => service.validateParameters('macd', {})).toThrow(InternalServerErrorException);
  });
});
