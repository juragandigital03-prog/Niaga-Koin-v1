import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { StrategyModule } from '../strategy/strategy.module';
import { RiskModule } from '../risk/risk.module';
import { PaperTradingModule } from '../paper-trading/paper-trading.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { BotEvaluationService } from './bot-evaluation.service';

@Module({
  imports: [AuthModule, MarketDataModule, StrategyModule, RiskModule, PaperTradingModule],
  controllers: [BotsController],
  providers: [BotsService, BotEvaluationService],
  exports: [BotsService],
})
export class BotsModule {}
