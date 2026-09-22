import { Module } from '@nestjs/common';
import { StrategyEngineService } from './strategy-engine.service';

@Module({
  providers: [StrategyEngineService],
  exports: [StrategyEngineService],
})
export class StrategyModule {}
