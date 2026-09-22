import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface RiskDecision {
  approved: boolean;
  reason: 'MAX_POSITION_EXCEEDED' | 'NO_OPEN_POSITION' | null;
  /** Quantity of the base asset the Trading Engine may act on, when approved. */
  quantity: Prisma.Decimal | null;
}

/**
 * SDD §5.4: mandatory gatekeeper between the Strategy Engine and the
 * Trading Engine (FR-RISK-001). Only `riskLimits.maxPositionUsdt` is
 * supported so far — the sole concrete example SDD §5.4 gives ("ukuran
 * posisi maksimum"). FR-RISK-002 (circuit breaker) stays deferred, same
 * status as FR-AUTH-002 — see FEATURE_MATRIX.md.
 */
@Injectable()
export class RiskEngineService {
  validateRiskLimits(riskLimits: Record<string, unknown>): void {
    const maxPositionUsdt = Number(riskLimits.maxPositionUsdt);
    if (!Number.isFinite(maxPositionUsdt) || maxPositionUsdt <= 0) {
      throw new BadRequestException("riskLimits.maxPositionUsdt wajib diisi dan bernilai positif");
    }
  }

  /**
   * A buy signal is approved up to the remaining headroom under
   * `maxPositionUsdt` (cap on total position size, not per-order size) —
   * so repeated buy signals on a bot already at its cap are rejected and
   * never reach the Trading Engine (FR-RISK-001 acceptance criteria).
   */
  evaluateBuy(
    riskLimits: Record<string, unknown>,
    currentPositionNotionalUsdt: Prisma.Decimal,
    price: Prisma.Decimal,
  ): RiskDecision {
    const maxPositionUsdt = new Prisma.Decimal(riskLimits.maxPositionUsdt as number);
    const headroom = maxPositionUsdt.minus(currentPositionNotionalUsdt);
    if (headroom.lessThanOrEqualTo(0)) {
      return { approved: false, reason: 'MAX_POSITION_EXCEEDED', quantity: null };
    }
    return { approved: true, reason: null, quantity: headroom.div(price) };
  }

  /**
   * Selling only closes exposure, so it never violates a max-position
   * limit — the sole rejection case is having nothing to sell (no risk
   * limit is actually being tested here, but the same "reject before it
   * reaches the Trading Engine" gate applies).
   */
  evaluateSell(currentQuantity: Prisma.Decimal): RiskDecision {
    if (currentQuantity.lessThanOrEqualTo(0)) {
      return { approved: false, reason: 'NO_OPEN_POSITION', quantity: null };
    }
    return { approved: true, reason: null, quantity: currentQuantity };
  }
}
