import { apiFetch } from './api';
import type { Bot } from './types';

export function listBots(): Promise<Bot[]> {
  return apiFetch<Bot[]>('/bots');
}

export function startBot(id: string): Promise<Bot> {
  return apiFetch<Bot>(`/bots/${id}/start`, { method: 'PATCH' });
}

export function pauseBot(id: string): Promise<Bot> {
  return apiFetch<Bot>(`/bots/${id}/pause`, { method: 'PATCH' });
}

export function stopBot(id: string): Promise<Bot> {
  return apiFetch<Bot>(`/bots/${id}/stop`, { method: 'PATCH' });
}
