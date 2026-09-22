export const EXCHANGE_ADAPTER = Symbol('EXCHANGE_ADAPTER');

export interface ExchangePermissions {
  canTrade: boolean;
  canWithdraw: boolean;
}

/**
 * Authenticated slice of the Exchange Adapter (SDD §5.2) — separate from
 * MarketDataProvider (Fase 3, public/unauthenticated). This is what
 * connect() uses to prove an API key is real and check its permission
 * scope (BR-KEY-001). placeOrder/cancelOrder are intentionally still not
 * here — those are Fase 5, and live order placement stays BLOCKED
 * regardless (see PROJECT_STATUS.md).
 */
export interface ExchangeAdapter {
  /**
   * @throws InvalidExchangeCredentialsError if the key/secret is rejected
   * by the exchange.
   * @throws UpstreamUnavailableError if the exchange can't be reached at
   * all (network/timeout) — never conflate this with "the key is bad".
   */
  checkPermissions(apiKey: string, apiSecret: string): Promise<ExchangePermissions>;
}

export class InvalidExchangeCredentialsError extends Error {
  constructor(message = 'Exchange API credentials were rejected') {
    super(message);
    this.name = 'InvalidExchangeCredentialsError';
  }
}
