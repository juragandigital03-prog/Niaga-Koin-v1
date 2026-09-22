import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJsonWithRetry } from '../fetch-with-retry';
import { Candle, CandleInterval, MarketDataProvider, Ticker } from '../market-data-provider.interface';

interface BinanceTickerPriceResponse {
  symbol: string;
  price: string;
}

// [openTime, open, high, low, close, volume, closeTime, ...ignored]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];

@Injectable()
export class BinanceMarketDataProvider implements MarketDataProvider {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('BINANCE_API_BASE_URL') ?? 'https://api.binance.com';
  }

  private get requestOptions() {
    return {
      timeoutMs: Number(this.config.get('MARKET_DATA_REQUEST_TIMEOUT_MS') ?? 5000),
      maxRetries: Number(this.config.get('MARKET_DATA_MAX_RETRIES') ?? 2),
    };
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const url = `${this.baseUrl}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
    const body = (await fetchJsonWithRetry(url, this.requestOptions)) as BinanceTickerPriceResponse;

    return {
      symbol: body.symbol,
      price: Number(body.price),
      asOf: new Date().toISOString(),
    };
  }

  async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]> {
    const url =
      `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    const body = (await fetchJsonWithRetry(url, this.requestOptions)) as BinanceKline[];

    return body.map((k) => ({
      openTime: new Date(k[0]).toISOString(),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      closeTime: new Date(k[6]).toISOString(),
    }));
  }
}
