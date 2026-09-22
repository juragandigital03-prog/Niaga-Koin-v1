import { UpstreamUnavailableError } from '../../common/http/upstream-unavailable.error';
import { InvalidExchangeCredentialsError } from '../exchange-adapter.interface';
import { BinanceExchangeAdapter } from './binance-exchange.adapter';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('BinanceExchangeAdapter', () => {
  const originalFetch = global.fetch;
  const config = { get: () => undefined } as any;
  const adapter = new BinanceExchangeAdapter(config);

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses canTrade/canWithdraw from a valid signed account response', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ canTrade: true, canWithdraw: false }));

    const result = await adapter.checkPermissions('api-key', 'api-secret');

    expect(result).toEqual({ canTrade: true, canWithdraw: false });
  });

  it('signs the request with HMAC-SHA256 and sends the key as a header, not the secret', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ canTrade: true, canWithdraw: false }));

    await adapter.checkPermissions('my-api-key', 'my-api-secret');

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/v3\/account\?timestamp=\d+&recvWindow=5000&signature=[0-9a-f]{64}$/);
    expect(url).not.toContain('my-api-secret');
    expect(init.headers['X-MBX-APIKEY']).toBe('my-api-key');
  });

  it('throws InvalidExchangeCredentialsError on a definitive 401 rejection, without retrying', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: -2015, msg: 'Invalid API-key' }, false, 401));

    await expect(adapter.checkPermissions('bad-key', 'bad-secret')).rejects.toBeInstanceOf(
      InvalidExchangeCredentialsError,
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws InvalidExchangeCredentialsError on a bad-signature 400, without retrying', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: -1022, msg: 'Signature invalid' }, false, 400));

    await expect(adapter.checkPermissions('key', 'wrong-secret')).rejects.toBeInstanceOf(
      InvalidExchangeCredentialsError,
    );
  });

  it('throws UpstreamUnavailableError (not InvalidExchangeCredentialsError) when Binance is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(adapter.checkPermissions('key', 'secret')).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });
});
