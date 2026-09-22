import { apiFetch } from './api';

export interface OrderResult {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  trade: { executedPrice: string; executedQuantity: string; fee: string; executedAt: string } | null;
}

export function listOrders(): Promise<OrderResult[]> {
  return apiFetch<OrderResult[]>('/orders');
}
