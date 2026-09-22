import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { GetCandlesQueryDto } from './dto/get-candles-query.dto';

// Public read-only market data — no auth required (no user-specific data),
// matches SRS §3.6/§3.8: paper trading can browse market data without an
// exchange API key.
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketData: MarketDataService) {}

  @Get('symbols')
  getSymbols() {
    return { symbols: this.marketData.supportedSymbols };
  }

  @Get('ticker/:symbol')
  getTicker(@Param('symbol') symbol: string) {
    return this.marketData.getTicker(symbol);
  }

  @Get('candles/:symbol')
  getCandles(@Param('symbol') symbol: string, @Query() query: GetCandlesQueryDto) {
    return this.marketData.getCandles(symbol, query.interval, query.limit);
  }
}
