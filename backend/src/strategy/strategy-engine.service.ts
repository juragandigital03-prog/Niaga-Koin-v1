import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Candle } from '../market-data/market-data-provider.interface';
import { StrategyEvaluation, StrategyPlugin } from './strategies/strategy-plugin.interface';
import { RsiStrategy } from './strategies/rsi.strategy';

/**
 * Routes to the plugin for a bot's `strategyType`. `CreateBotDto` already
 * whitelists `strategyType` to keys that exist here, so a missing plugin
 * would be an internal inconsistency, not user input — hence 500, not 400.
 */
@Injectable()
export class StrategyEngineService {
  private readonly plugins: Record<string, StrategyPlugin> = {
    rsi: new RsiStrategy(),
  };

  private resolve(strategyType: string): StrategyPlugin {
    const plugin = this.plugins[strategyType];
    if (!plugin) {
      throw new InternalServerErrorException(`Strategi tidak dikenal: ${strategyType}`);
    }
    return plugin;
  }

  validateParameters(strategyType: string, parameters: Record<string, unknown>): void {
    this.resolve(strategyType).validateParameters(parameters);
  }

  requiredCandleCount(strategyType: string, parameters: Record<string, unknown>): number {
    return this.resolve(strategyType).requiredCandleCount(parameters);
  }

  evaluate(
    strategyType: string,
    parameters: Record<string, unknown>,
    candles: Candle[],
  ): StrategyEvaluation {
    return this.resolve(strategyType).evaluate(parameters, candles);
  }
}
