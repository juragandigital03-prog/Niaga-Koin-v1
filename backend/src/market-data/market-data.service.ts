import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import {
  Candle,
  CandleInterval,
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
  Ticker,
} from './market-data-provider.interface';
import { UpstreamUnavailableError } from '../common/http/upstream-unavailable.error';

const VALID_INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const MAX_CANDLE_LIMIT = 500;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class MarketDataService {
  private readonly tickerCache = new Map<string, CacheEntry<Ticker>>();
  private readonly candleCache = new Map<string, CacheEntry<Candle[]>>();

  constructor(
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MarketDataService.name);
  }

  get supportedSymbols(): string[] {
    const raw = this.config.get<string>('MARKET_DATA_SUPPORTED_SYMBOLS') ?? 'BTCUSDT,ETHUSDT,SOLUSDT';
    return raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  private get cacheTtlMs(): number {
    return Number(this.config.get('MARKET_DATA_CACHE_TTL_MS') ?? 5000);
  }

  private assertSupportedSymbol(symbol: string): string {
    const normalized = symbol.toUpperCase();
    if (!this.supportedSymbols.includes(normalized)) {
      throw new BadRequestException(
        `Symbol tidak didukung: ${symbol}. Simbol yang didukung: ${this.supportedSymbols.join(', ')}`,
      );
    }
    return normalized;
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const normalized = this.assertSupportedSymbol(symbol);
    const cached = this.tickerCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const ticker = await this.provider.getTicker(normalized);
      this.tickerCache.set(normalized, { data: ticker, expiresAt: Date.now() + this.cacheTtlMs });
      return ticker;
    } catch (err) {
      this.handleProviderFailure(err, `ticker ${normalized}`);
    }
  }

  async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]> {
    const normalized = this.assertSupportedSymbol(symbol);

    if (!VALID_INTERVALS.includes(interval)) {
      throw new BadRequestException(`Interval tidak valid: ${interval}. Pilihan: ${VALID_INTERVALS.join(', ')}`);
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CANDLE_LIMIT) {
      throw new BadRequestException(`limit harus antara 1 dan ${MAX_CANDLE_LIMIT}`);
    }

    const cacheKey = `${normalized}:${interval}:${limit}`;
    const cached = this.candleCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const candles = await this.provider.getCandles(normalized, interval, limit);
      this.candleCache.set(cacheKey, { data: candles, expiresAt: Date.now() + this.cacheTtlMs });
      return candles;
    } catch (err) {
      this.handleProviderFailure(err, `candles ${cacheKey}`);
    }
  }

  /**
   * Fail-safe per master prompt: on connection failure/invalid data, never
   * fabricate a response — surface it as 503 so callers (frontend) show an
   * explicit "data pasar tidak tersedia" state instead of silently guessing.
   */
  private handleProviderFailure(err: unknown, context: string): never {
    if (err instanceof UpstreamUnavailableError) {
      this.logger.warn({ context, cause: String(err.cause) }, 'Market data provider unavailable');
      throw new ServiceUnavailableException('Data pasar sedang tidak tersedia, coba lagi sebentar lagi');
    }
    throw err;
  }
}
