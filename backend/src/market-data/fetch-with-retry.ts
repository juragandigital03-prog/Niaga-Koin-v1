import { MarketDataUnavailableError } from './market-data-provider.interface';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FetchWithRetryOptions {
  timeoutMs: number;
  maxRetries: number;
}

/**
 * Bounded retry + timeout wrapper around fetch, per master prompt: "Tangani
 * rate limit, timeout, retry terbatas, dan kegagalan koneksi." Never retries
 * forever — after maxRetries it fails loudly (MarketDataUnavailableError)
 * rather than hanging or returning stale/fabricated data (fail-safe).
 */
export async function fetchJsonWithRetry(
  url: string,
  { timeoutMs, maxRetries }: FetchWithRetryOptions,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Upstream responded with HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(200 * 2 ** attempt); // 200ms, 400ms, 800ms, ...
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new MarketDataUnavailableError(
    `Failed to reach market data provider after ${maxRetries + 1} attempt(s): ${url}`,
    lastError,
  );
}
