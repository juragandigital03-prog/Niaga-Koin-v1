import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RiskEngineService } from './risk-engine.service';

describe('RiskEngineService', () => {
  const risk = new RiskEngineService();

  describe('validateRiskLimits', () => {
    it('rejects a missing maxPositionUsdt', () => {
      expect(() => risk.validateRiskLimits({})).toThrow(BadRequestException);
    });

    it('rejects a zero or negative maxPositionUsdt', () => {
      expect(() => risk.validateRiskLimits({ maxPositionUsdt: 0 })).toThrow(BadRequestException);
      expect(() => risk.validateRiskLimits({ maxPositionUsdt: -5 })).toThrow(BadRequestException);
    });

    it('accepts a positive maxPositionUsdt', () => {
      expect(() => risk.validateRiskLimits({ maxPositionUsdt: 500 })).not.toThrow();
    });
  });

  describe('evaluateBuy', () => {
    it('approves with quantity = headroom / price when under the cap', () => {
      const decision = risk.evaluateBuy(
        { maxPositionUsdt: 500 },
        new Prisma.Decimal(0),
        new Prisma.Decimal(100),
      );
      expect(decision.approved).toBe(true);
      expect(decision.quantity?.toNumber()).toBe(5); // 500 / 100
    });

    it('approves with only the remaining headroom once a position already exists', () => {
      const decision = risk.evaluateBuy(
        { maxPositionUsdt: 500 },
        new Prisma.Decimal(400), // already holding 400 USDT worth
        new Prisma.Decimal(100),
      );
      expect(decision.approved).toBe(true);
      expect(decision.quantity?.toNumber()).toBe(1); // (500-400) / 100
    });

    it('rejects with MAX_POSITION_EXCEEDED once the cap is reached', () => {
      const decision = risk.evaluateBuy(
        { maxPositionUsdt: 500 },
        new Prisma.Decimal(500),
        new Prisma.Decimal(100),
      );
      expect(decision.approved).toBe(false);
      expect(decision.reason).toBe('MAX_POSITION_EXCEEDED');
      expect(decision.quantity).toBeNull();
    });
  });

  describe('evaluateSell', () => {
    it('approves with quantity = the full current position', () => {
      const decision = risk.evaluateSell(new Prisma.Decimal(3.5));
      expect(decision.approved).toBe(true);
      expect(decision.quantity?.toNumber()).toBe(3.5);
    });

    it('rejects with NO_OPEN_POSITION when there is nothing to sell', () => {
      const decision = risk.evaluateSell(new Prisma.Decimal(0));
      expect(decision.approved).toBe(false);
      expect(decision.reason).toBe('NO_OPEN_POSITION');
    });
  });
});
