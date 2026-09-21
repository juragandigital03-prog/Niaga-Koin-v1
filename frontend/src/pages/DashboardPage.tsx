import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { PaperModeBanner } from '../components/PaperModeBanner';
import { BalanceCard } from '../components/BalanceCard';
import { BotList } from '../components/BotList';
import { ResetBalanceModal } from '../components/ResetBalanceModal';
import type { Bot } from '../lib/types';

const PAPER_TRADING_DEFAULT_BALANCE_USDT = 10_000;

/**
 * MOCK DATA — Fase 1 (Foundation) only replicates the visual/design
 * fidelity of docs/design/stitch-export/dashboard_paper_trading_mobile.
 * Wiring to real endpoints (/api/v1/portfolio, /api/v1/bots) happens in
 * Fase 6 per IMPLEMENTATION_PLAN.md. Do not treat these numbers as live.
 */
const MOCK_BOTS: Bot[] = [
  {
    id: 'mock-bot-1',
    name: 'BTC Trend Scalper v2',
    exchange: 'binance',
    strategyLabel: 'RSI Reversal + EMA 20/50',
    status: 'running',
    pnl24hUsdt: 284.2,
    pnl24hPercent: 2.84,
    winTrades: 14,
    totalTrades: 18,
    note: 'Siklus: 15m · Terakhir order 3m lalu',
  },
  {
    id: 'mock-bot-2',
    name: 'ETH Grid Accumulator',
    exchange: 'tokocrypto',
    strategyLabel: 'Dynamic Grid 15-Levels',
    status: 'running',
    pnl24hUsdt: 128.3,
    pnl24hPercent: 1.28,
    winTrades: 9,
    totalTrades: 11,
    note: 'Spread: 0.35% · 4 Limit Aktif',
  },
  {
    id: 'mock-bot-3',
    name: 'SOL Momentum Breakout',
    exchange: 'binance',
    strategyLabel: 'Donchian 20 High/Low Channel',
    status: 'paused',
    pnl24hUsdt: 0,
    pnl24hPercent: 0,
    winTrades: 0,
    totalTrades: 0,
    note: '',
    alert: 'Proteksi: Stop-loss auto hit (-1.5%)',
  },
];

export function DashboardPage() {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [balance, setBalance] = useState(10_412.5);

  return (
    <main className="flex flex-col relative w-full pt-16 pb-safe bg-surface min-h-screen">
      <AppHeader />
      <ResetBalanceModal
        open={resetModalOpen}
        resetToUsdt={PAPER_TRADING_DEFAULT_BALANCE_USDT}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={() => {
          setBalance(PAPER_TRADING_DEFAULT_BALANCE_USDT);
          setResetModalOpen(false);
        }}
      />
      <div className="px-margin-mobile py-space-sm flex flex-col gap-space-md">
        <PaperModeBanner />
        <BalanceCard
          balanceUsdt={balance}
          pnl24hUsdt={412.5}
          pnl24hPercent={4.12}
          ordersSucceeded24h={22}
          onResetBalance={() => setResetModalOpen(true)}
          onCreateBot={() => {
            /* TODO(Fase 5): navigate to bot creation wizard */
          }}
          onViewHistory={() => {
            /* TODO(Fase 7): navigate to order history */
          }}
        />
        <BotList bots={MOCK_BOTS} />
      </div>
    </main>
  );
}
