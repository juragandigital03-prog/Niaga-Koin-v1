import { apiFetch } from './api';

// balanceUsdt/quantity/avgEntryPrice are strings on the wire — the backend
// serializes Prisma.Decimal via toString() (see WalletService.getSummary
// in backend/src/paper-trading/wallet.service.ts) to avoid float precision
// loss in transit. Parse with Number() only where arithmetic is needed.
export interface WalletSummary {
  balanceUsdt: string;
  positions: Array<{ symbol: string; quantity: string; avgEntryPrice: string }>;
}

export function getWallet(): Promise<WalletSummary> {
  return apiFetch<WalletSummary>('/wallet');
}

export function resetWallet(): Promise<WalletSummary> {
  return apiFetch<WalletSummary>('/wallet/reset', { method: 'POST' });
}
