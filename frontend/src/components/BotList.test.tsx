import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BotList } from './BotList';
import type { Bot } from '../lib/types';

const bots: Bot[] = [
  {
    id: '1',
    name: 'BTC Trend Scalper v2',
    exchange: 'binance',
    strategyLabel: 'RSI Reversal + EMA 20/50',
    status: 'running',
    pnl24hUsdt: 284.2,
    pnl24hPercent: 2.84,
    winTrades: 14,
    totalTrades: 18,
    note: 'Siklus: 15m',
  },
  {
    id: '2',
    name: 'SOL Momentum Breakout',
    exchange: 'binance',
    strategyLabel: 'Donchian 20',
    status: 'paused',
    pnl24hUsdt: 0,
    pnl24hPercent: 0,
    winTrades: 0,
    totalTrades: 0,
    note: '',
    alert: 'Proteksi: Stop-loss auto hit (-1.5%)',
  },
];

describe('BotList', () => {
  it('summarizes running vs paused counts', () => {
    render(<BotList bots={bots} />);
    expect(screen.getByText('1 Running · 1 Paused')).toBeInTheDocument();
  });

  it('computes win rate from win/total trades', () => {
    render(<BotList bots={bots} />);
    expect(screen.getByText(/14\/18 Win \(77\.8%\)/)).toBeInTheDocument();
  });

  it('shows the risk alert and RESUME action for a paused bot', () => {
    render(<BotList bots={bots} />);
    expect(screen.getByText(/Proteksi: Stop-loss auto hit/)).toBeInTheDocument();
    expect(screen.getByText('RESUME')).toBeInTheDocument();
  });
});
