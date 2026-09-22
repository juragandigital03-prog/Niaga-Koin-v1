import { fetchJsonWithRetry } from './fetch-with-retry';
import { MarketDataUnavailableError } from './market-data-provider.interface';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('fetchJsonWithRetry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns parsed JSON on the first successful attempt', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ ok: true }));

    const result = await fetchJsonWithRetry('https://example.test/ping', {
      timeoutMs: 1000,
      maxRetries: 2,
    });

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on transient failure and succeeds within the retry budget', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(jsonResponse({ recovered: true }));

    const result = await fetchJsonWithRetry('https://example.test/ping', {
      timeoutMs: 1000,
      maxRetries: 2,
    });

    expect(result).toEqual({ recovered: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws MarketDataUnavailableError instead of hanging forever once retries are exhausted', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down'));

    await expect(
      fetchJsonWithRetry('https://example.test/ping', { timeoutMs: 1000, maxRetries: 2 }),
    ).rejects.toBeInstanceOf(MarketDataUnavailableError);
    expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('treats a non-2xx HTTP response as a failure (retries, then gives up)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false, 500));

    await expect(
      fetchJsonWithRetry('https://example.test/ping', { timeoutMs: 1000, maxRetries: 0 }),
    ).rejects.toBeInstanceOf(MarketDataUnavailableError);
  });
});
