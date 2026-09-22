// Shared frontend types. Matches the real backend contract (see
// API_CONTRACT.md "Bots") — no fabricated fields like PnL/win-rate that
// the backend doesn't compute yet (F-AN-01 is still TODO). Fase 1's mock
// data used a richer shape (exchange, strategyLabel, pnl24h...); that was
// invented for the static replica and is not what `GET /bots` returns.

export type BotStatus = 'active' | 'paused' | 'stopped';

export interface Bot {
  id: string;
  name: string;
  symbol: string;
  strategyType: string;
  status: BotStatus;
  createdAt: string;
}
