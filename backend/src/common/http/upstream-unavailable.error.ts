/**
 * Generic "we tried to reach an external service and it didn't work" error.
 * Shared between Market Data (Fase 3) and Exchange Account (Fase 4) — both
 * talk to Binance and both need the same fail-safe contract: never fabricate
 * a response, surface this as 503 to the caller.
 */
export class UpstreamUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UpstreamUnavailableError';
  }
}
