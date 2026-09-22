import { Module } from '@nestjs/common';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MARKET_DATA_PROVIDER } from './market-data-provider.interface';
import { BinanceMarketDataProvider } from './providers/binance-market-data.provider';

@Module({
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    // Adapter pattern (SDD §5.2): swap this binding to add a second
    // exchange later without touching MarketDataService/Controller.
    { provide: MARKET_DATA_PROVIDER, useClass: BinanceMarketDataProvider },
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
