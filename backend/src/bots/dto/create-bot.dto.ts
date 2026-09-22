import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

// Only RSI exists as a real, implemented strategy so far (Fase 5b) — see
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

  // Structure is strategy-specific and interpreted by the Strategy Engine
  // (Fase 5b) — this layer only checks it's a plain object, not its
  // semantic validity (e.g. RSI period in range). See FR-STRAT-002.
  @IsObject()
  parameters!: Record<string, unknown>;

  @IsObject()
  riskLimits!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  exchangeAccountId?: string;
}
