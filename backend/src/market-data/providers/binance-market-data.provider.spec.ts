import { BinanceMarketDataProvider } from './binance-market-data.provider';

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('BinanceMarketDataProvider', () => {
  const originalFetch = global.fetch;
  const config = { get: () => undefined } as any;
  const provider = new BinanceMarketDataProvider(config);

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses a ticker price response into our domain shape', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ symbol: 'BTCUSDT', price: '65000.50' }));

    const ticker = await provider.getTicker('BTCUSDT');

    expect(ticker.symbol).toBe('BTCUSDT');
    expect(ticker.price).toBe(65000.5);
    expect(typeof ticker.asOf).toBe('string');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v3/ticker/price?symbol=BTCUSDT'),
      expect.anything(),
    );
  });

  it('parses Binance kline arrays into typed candles', async () => {
    const rawKline = [
      1699999999000, '65000.00', '65500.00', '64900.00', '65400.00', '123.456', 1700000059000,
      'ignored1', 100, 'ignored2', 'ignored3', 'ignored4',
    ];
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([rawKline]));

    const candles = await provider.getCandles('BTCUSDT', '1h', 1);

    expect(candles).toHaveLength(1);
    expect(candles[0]).toEqual({
      openTime: new Date(1699999999000).toISOString(),
      open: 65000,
      high: 65500,
      low: 64900,
      close: 65400,
      volume: 123.456,
      closeTime: new Date(1700000059000).toISOString(),
    });
  });
});
