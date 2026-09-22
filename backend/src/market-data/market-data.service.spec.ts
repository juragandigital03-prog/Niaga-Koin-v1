import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataUnavailableError, Ticker } from './market-data-provider.interface';

const CONFIG: Record<string, string> = {
  MARKET_DATA_SUPPORTED_SYMBOLS: 'BTCUSDT,ETHUSDT',
  MARKET_DATA_CACHE_TTL_MS: '5000',
};
const fakeConfig = { get: (key: string) => CONFIG[key] } as any;
const fakeLogger = { setContext: jest.fn(), warn: jest.fn(), info: jest.fn() } as any;

function buildTicker(price: number): Ticker {
  return { symbol: 'BTCUSDT', price, asOf: new Date().toISOString() };
}

describe('MarketDataService', () => {
  let provider: { getTicker: jest.Mock; getCandles: jest.Mock };
  let service: MarketDataService;

  beforeEach(() => {
    provider = { getTicker: jest.fn(), getCandles: jest.fn() };
    service = new MarketDataService(provider, fakeConfig, fakeLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes the configured symbol whitelist', () => {
    expect(service.supportedSymbols).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('rejects a symbol outside the whitelist without calling the provider', async () => {
    await expect(service.getTicker('DOGEUSDT')).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.getTicker).not.toHaveBeenCalled();
  });

  it('fetches and caches a ticker, returning the cached value on the next call', async () => {
    provider.getTicker.mockResolvedValue(buildTicker(65000));

    const first = await service.getTicker('btcusdt'); // lower-case input, normalized
    const second = await service.getTicker('BTCUSDT');

    expect(first.price).toBe(65000);
    expect(second.price).toBe(65000);
    expect(provider.getTicker).toHaveBeenCalledTimes(1); // second call served from cache
  });

  it('re-fetches once the cache TTL has elapsed', async () => {
    jest.useFakeTimers();
    provider.getTicker
      .mockResolvedValueOnce(buildTicker(65000))
      .mockResolvedValueOnce(buildTicker(66000));

    const first = await service.getTicker('BTCUSDT');
    jest.advanceTimersByTime(5001);
    const second = await service.getTicker('BTCUSDT');

    expect(first.price).toBe(65000);
    expect(second.price).toBe(66000);
    expect(provider.getTicker).toHaveBeenCalledTimes(2);
  });

  it('maps a provider outage to 503 instead of leaking the internal error (fail-safe)', async () => {
    provider.getTicker.mockRejectedValue(new MarketDataUnavailableError('unreachable'));

    await expect(service.getTicker('BTCUSDT')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects an invalid candle interval', async () => {
    await expect(service.getCandles('BTCUSDT', '3m' as any, 100)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an out-of-range candle limit', async () => {
    await expect(service.getCandles('BTCUSDT', '1h', 5000)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getCandles('BTCUSDT', '1h', 0)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fetches and caches candles per symbol+interval+limit key', async () => {
    provider.getCandles.mockResolvedValue([]);

    await service.getCandles('BTCUSDT', '1h', 50);
    await service.getCandles('BTCUSDT', '1h', 50);
    await service.getCandles('BTCUSDT', '4h', 50); // different key -> new fetch

    expect(provider.getCandles).toHaveBeenCalledTimes(2);
  });
});
