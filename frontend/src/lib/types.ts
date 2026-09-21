// Shared frontend types. Kept intentionally small in Fase 1 — extended as
// each backend fase (Bot lifecycle, Portfolio, dst.) ships its contract.
// See API_CONTRACT.md for the endpoints these will eventually come from.

export type BotStatus = 'running' | 'paused' | 'stopped';

export interface Bot {
  id: string;
  name: string;
  exchange: string;
  strategyLabel: string;
  status: BotStatus;
  pnl24hUsdt: number;
  pnl24hPercent: number;
  winTrades: number;
  totalTrades: number;
  note: string;
  alert?: string;
}
