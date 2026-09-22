import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { PaperModeBanner } from '../components/PaperModeBanner';
import { BalanceCard } from '../components/BalanceCard';
import { BotList } from '../components/BotList';
import { ResetBalanceModal } from '../components/ResetBalanceModal';
import { getWallet, resetWallet } from '../lib/wallet';
import { listBots, pauseBot, startBot, stopBot } from '../lib/bots';
import { listOrders } from '../lib/orders';
import { ApiError } from '../lib/api';
import type { Bot } from '../lib/types';

// Matches PAPER_TRADING_DEFAULT_BALANCE_USDT in .env.example. Used only to
// derive an honest "PnL since reset" figure (current balance - starting
// balance) — the backend doesn't track historical/daily balance snapshots
// yet (F-AN-01 is still TODO), so a real "24h PnL" can't be computed.
const PAPER_TRADING_DEFAULT_BALANCE_USDT = 10_000;

export function DashboardPage() {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [balanceUsdt, setBalanceUsdt] = useState<number | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [ordersFilledTotal, setOrdersFilledTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingBotId, setPendingBotId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [wallet, botsRes, orders] = await Promise.all([getWallet(), listBots(), listOrders()]);
        if (cancelled) return;
        setBalanceUsdt(Number(wallet.balanceUsdt));
        setBots(botsRes);
        setOrdersFilledTotal(orders.filter((o) => o.status === 'filled').length);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Gagal memuat data dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleResetBalance() {
    try {
      const wallet = await resetWallet();
      setBalanceUsdt(Number(wallet.balanceUsdt));
      setResetModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mereset saldo.');
    }
  }

  async function handleBotAction(id: string, action: (id: string) => Promise<Bot>) {
    setPendingBotId(id);
    setError(null);
    try {
      const updated = await action(id);
      setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengubah status bot.');
    } finally {
      setPendingBotId(null);
    }
  }

  const pnlUsdt = balanceUsdt !== null ? balanceUsdt - PAPER_TRADING_DEFAULT_BALANCE_USDT : 0;
  const pnlPercent = (pnlUsdt / PAPER_TRADING_DEFAULT_BALANCE_USDT) * 100;

  return (
    <main className="flex flex-col relative w-full pt-16 pb-safe bg-surface min-h-screen">
      <AppHeader />
      <ResetBalanceModal
        open={resetModalOpen}
        resetToUsdt={PAPER_TRADING_DEFAULT_BALANCE_USDT}
        onCancel={() => setResetModalOpen(false)}
        onConfirm={handleResetBalance}
      />
      <div className="px-margin-mobile py-space-sm flex flex-col gap-space-md">
        <PaperModeBanner />

        {error && (
          <p
            role="alert"
            className="font-body-sm text-body-sm text-error bg-error-container/20 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-space-lg">
            Memuat data dashboard...
          </p>
        ) : (
          <>
            <BalanceCard
              balanceUsdt={balanceUsdt ?? 0}
              pnlUsdt={pnlUsdt}
              pnlPercent={pnlPercent}
              ordersFilledTotal={ordersFilledTotal}
              onResetBalance={() => setResetModalOpen(true)}
              onCreateBot={() => {
                /* TODO(Fase 6c): belum ada wizard pembuatan bot di frontend */
              }}
              onViewHistory={() => {
                /* TODO(Fase 6c/7): belum ada halaman riwayat order */
              }}
            />
            <BotList
              bots={bots}
              pendingId={pendingBotId}
              onStart={(id) => handleBotAction(id, startBot)}
              onPause={(id) => handleBotAction(id, pauseBot)}
              onStop={(id) => handleBotAction(id, stopBot)}
            />
          </>
        )}
      </div>
    </main>
  );
}
