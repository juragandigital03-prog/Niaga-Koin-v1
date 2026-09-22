import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';

@Module({
  imports: [AuthModule, MarketDataModule],
  controllers: [BotsController],
  providers: [BotsService],
  exports: [BotsService],
})
export class BotsModule {}
