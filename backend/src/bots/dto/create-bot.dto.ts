import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

// Only RSI exists as a real, implemented strategy so far — see
// prisma/schema.prisma StrategyType. Listing it explicitly rather than
// accepting any string avoids "supporting" a strategy nothing computes.
const SUPPORTED_STRATEGIES = ['rsi'];

export class CreateBotDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  symbol!: string;

  @IsIn(SUPPORTED_STRATEGIES)
  strategyType!: string;

  // Structure is strategy-specific; this layer only checks it's a plain
  // object. Semantic validity (e.g. RSI period in range, FR-STRAT-002) is
  // enforced by StrategyEngineService.validateParameters in BotsService.create.
  @IsObject()
  parameters!: Record<string, unknown>;

  // Currently only `maxPositionUsdt` is interpreted, by
  // RiskEngineService.validateRiskLimits (FR-RISK-001).
  @IsObject()
  riskLimits!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  exchangeAccountId?: string;
}
