import { fetchJsonWithRetry, NonRetryableHttpError } from './fetch-with-retry';
import { UpstreamUnavailableError } from './upstream-unavailable.error';

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

  it('throws UpstreamUnavailableError instead of hanging forever once retries are exhausted', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down'));

    await expect(
      fetchJsonWithRetry('https://example.test/ping', { timeoutMs: 1000, maxRetries: 2 }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
    expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('treats a non-2xx HTTP response as a failure (retries, then gives up)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false, 500));

    await expect(
      fetchJsonWithRetry('https://example.test/ping', { timeoutMs: 1000, maxRetries: 0 }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('stops immediately on a status matched by isNonRetryableStatus, without exhausting retries', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: -2015, msg: 'Invalid API-key' }, false, 401));

    await expect(
      fetchJsonWithRetry(
        'https://example.test/account',
        { timeoutMs: 1000, maxRetries: 3 },
        (status) => status === 401,
      ),
    ).rejects.toBeInstanceOf(NonRetryableHttpError);
    expect(global.fetch).toHaveBeenCalledTimes(1); // no retries wasted on a definitive rejection
  });

  it('exposes the parsed body on NonRetryableHttpError for the caller to inspect', async () => {
    expect.assertions(3);
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: -2015, msg: 'Invalid API-key' }, false, 401));

    try {
      await fetchJsonWithRetry(
        'https://example.test/account',
        { timeoutMs: 1000, maxRetries: 0 },
        (status) => status === 401,
      );
    } catch (err) {
      expect(err).toBeInstanceOf(NonRetryableHttpError);
      expect((err as NonRetryableHttpError).status).toBe(401);
      expect((err as NonRetryableHttpError).body).toEqual({ code: -2015, msg: 'Invalid API-key' });
    }
  });
});
