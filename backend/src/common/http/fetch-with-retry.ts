import { UpstreamUnavailableError } from './upstream-unavailable.error';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface FetchWithRetryOptions {
  timeoutMs: number;
  maxRetries: number;
  init?: RequestInit;
}

/** A definitive rejection (e.g. HTTP 401 invalid credentials) — retrying would never help, so this is thrown immediately instead of being wrapped as UpstreamUnavailableError. */
export class NonRetryableHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Non-retryable HTTP ${status}`);
    this.name = 'NonRetryableHttpError';
  }
}

/**
 * Bounded retry + timeout wrapper around fetch, per master prompt: "Tangani
 * rate limit, timeout, retry terbatas, dan kegagalan koneksi." Never retries
 * forever — after maxRetries it fails loudly (UpstreamUnavailableError)
 * rather than hanging or returning stale/fabricated data (fail-safe).
 *
 * @param isNonRetryableStatus optional predicate — statuses for which
 * retrying is pointless (e.g. auth rejection). When it matches, throws
 * NonRetryableHttpError immediately instead of exhausting the retry budget.
 */
export async function fetchJsonWithRetry(
  url: string,
  { timeoutMs, maxRetries, init }: FetchWithRetryOptions,
  isNonRetryableStatus?: (status: number) => boolean,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (!res.ok) {
        if (isNonRetryableStatus?.(res.status)) {
          const body = await res.json().catch(() => undefined);
          throw new NonRetryableHttpError(res.status, body);
        }
        throw new Error(`Upstream responded with HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err instanceof NonRetryableHttpError) {
        throw err;
      }
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(200 * 2 ** attempt); // 200ms, 400ms, 800ms, ...
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new UpstreamUnavailableError(
    `Failed to reach upstream after ${maxRetries + 1} attempt(s): ${url}`,
    lastError,
  );
}
