import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BotList } from './BotList';
import type { Bot } from '../lib/types';

const bots: Bot[] = [
  {
    id: '1',
    name: 'BTC Trend Scalper',
    symbol: 'BTCUSDT',
    strategyType: 'rsi',
    status: 'active',
    createdAt: '2026-09-22T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'SOL Momentum Breakout',
    symbol: 'SOLUSDT',
    strategyType: 'rsi',
    status: 'paused',
    createdAt: '2026-09-22T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'ETH Grid Idle',
    symbol: 'ETHUSDT',
    strategyType: 'rsi',
    status: 'stopped',
    createdAt: '2026-09-22T00:00:00.000Z',
  },
];

const noop = { onStart: vi.fn(), onPause: vi.fn(), onStop: vi.fn() };

describe('BotList', () => {
  it('summarizes active vs paused counts', () => {
    render(<BotList bots={bots} {...noop} />);
    expect(screen.getByText('1 Active · 1 Paused')).toBeInTheDocument();
  });

  it('never fabricates PnL/win-rate — says analytics are unavailable instead', () => {
    render(<BotList bots={bots} {...noop} />);
    expect(screen.getAllByText(/Analitik performa .* belum tersedia/)).toHaveLength(3);
  });

  it('shows an empty state when there are no bots', () => {
    render(<BotList bots={[]} {...noop} />);
    expect(screen.getByText(/Belum ada bot/)).toBeInTheDocument();
  });

  it('shows pause+stop for an active bot, and start+stop for a paused one', () => {
    render(<BotList bots={bots} {...noop} />);
    expect(screen.getAllByLabelText('Jeda Bot')).toHaveLength(1);
    expect(screen.getAllByLabelText('Jalankan Bot')).toHaveLength(2); // paused + stopped
    expect(screen.getAllByLabelText('Hentikan Bot')).toHaveLength(2); // active + paused
  });

  it('calls onPause with the bot id when the pause button is clicked', () => {
    const onPause = vi.fn();
    render(<BotList bots={bots} onStart={vi.fn()} onPause={onPause} onStop={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Jeda Bot'));
    expect(onPause).toHaveBeenCalledWith('1');
  });

  it('disables the action buttons for the bot with a pending action', () => {
    render(<BotList bots={bots} pendingId="1" {...noop} />);
    expect(screen.getByLabelText('Jeda Bot')).toBeDisabled();
  });
});
