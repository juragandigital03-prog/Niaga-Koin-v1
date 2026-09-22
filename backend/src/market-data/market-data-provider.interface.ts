export const MARKET_DATA_PROVIDER = Symbol('MARKET_DATA_PROVIDER');

export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Ticker {
  symbol: string;
  price: number;
  /** When GAIN fetched this price — not the exchange's own event time. */
  asOf: string;
}

export interface Candle {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: string;
}

/**
 * Read-only market data slice of what SDD §5.2 calls the "Exchange
 * Adapter". Deliberately excludes placeOrder/cancelOrder/getBalance —
 * those require a user's API key and are Fase 4/5 scope (and placeOrder
 * for live trading is BLOCKED regardless, see PROJECT_STATUS.md). This
 * interface only covers PRD F-MKT-01 / SRS FR-MKT-001.
 */
export interface MarketDataProvider {
  getTicker(symbol: string): Promise<Ticker>;
  getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]>;
}

export class MarketDataUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MarketDataUnavailableError';
  }
}
