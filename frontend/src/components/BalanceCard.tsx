import { useState } from 'react';

export interface BalanceCardProps {
  balanceUsdt: number;
  pnlUsdt: number;
  pnlPercent: number;
  ordersFilledTotal: number;
  onResetBalance: () => void;
  onCreateBot: () => void;
  onViewHistory: () => void;
}

const formatUsdt = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Virtual (paper) balance card. All figures here are simulated — the
 * "Total Estimasi Saldo Virtual" label and lack of any real-money framing
 * are load-bearing, not cosmetic (master prompt: "Jangan menampilkan angka
 * finansial seolah-olah nyata jika berasal dari simulasi").
 *
 * `pnlUsdt`/`pnlPercent` are PnL *since the last balance reset*, not a
 * rolling 24-hour window — the backend doesn't track historical/daily
 * balance snapshots yet (F-AN-01 is still TODO), so a "24h" figure would
 * be fabricated. See DashboardPage for how this is derived.
 */
export function BalanceCard({
  balanceUsdt,
  pnlUsdt,
  pnlPercent,
  ordersFilledTotal,
  onResetBalance,
  onCreateBot,
  onViewHistory,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);
  const pnlPositive = pnlUsdt >= 0;

  return (
    <section className="rounded-xl bg-surface-container-low p-space-md relative overflow-hidden shadow-lg flex flex-col gap-space-md">
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-secondary text-[18px]">
            account_balance_wallet
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
            Total Estimasi Saldo Virtual
          </span>
        </div>
        <button
          type="button"
          aria-label={hidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}
          onClick={() => setHidden((v) => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {hidden ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-ticker-xl text-ticker-xl text-on-surface tracking-tight">
            {hidden ? '••••••' : formatUsdt(balanceUsdt)}
          </span>
          <span className="font-ticker-md text-ticker-md text-secondary font-semibold">USDT</span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start bg-surface-container-high px-2.5 py-1.5 rounded-lg">
        <span
          className={`material-symbols-outlined text-[18px] ${pnlPositive ? 'text-primary' : 'text-error'}`}
        >
          {pnlPositive ? 'trending_up' : 'trending_down'}
        </span>
        <span
          className={`font-ticker-sm text-ticker-sm font-bold ${pnlPositive ? 'text-primary' : 'text-error'}`}
        >
          {pnlPositive ? '+' : ''}
          {formatUsdt(pnlUsdt)} USDT ({pnlPositive ? '+' : ''}
          {pnlPercent.toFixed(2)}% Sejak Reset)
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          · {ordersFilledTotal} Order Berhasil
        </span>
      </div>

      <div className="grid grid-cols-3 gap-space-xs pt-1">
        <button
          type="button"
          onClick={onResetBalance}
          className="min-h-[44px] px-2 rounded-lg bg-surface-container-high hover:bg-surface-bright active:scale-95 text-on-surface flex flex-col items-center justify-center gap-0.5 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">
            restart_alt
          </span>
          <span className="font-label-caps text-label-caps">Reset Saldo</span>
        </button>
        <button
          type="button"
          onClick={onCreateBot}
          className="min-h-[44px] px-2 rounded-lg bg-primary hover:brightness-110 active:scale-95 text-on-primary flex flex-col items-center justify-center gap-0.5 font-medium transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px] text-on-primary">
            add_circle
          </span>
          <span className="font-label-caps text-label-caps font-bold text-on-primary">
            + Bot Baru
          </span>
        </button>
        <button
          type="button"
          onClick={onViewHistory}
          className="min-h-[44px] px-2 rounded-lg bg-surface-container-high hover:bg-surface-bright active:scale-95 text-on-surface flex flex-col items-center justify-center gap-0.5 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            receipt_long
          </span>
          <span className="font-label-caps text-label-caps">Riwayat</span>
        </button>
      </div>
    </section>
  );
}
