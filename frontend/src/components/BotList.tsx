import type { Bot } from '../lib/types';

const formatSigned = (value: number, digits = 2) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;

function BotCard({ bot }: { bot: Bot }) {
  if (bot.status === 'paused') {
    return (
      <div className="rounded-xl bg-surface-container p-space-md flex flex-col gap-2.5 opacity-90">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                speed
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">
                {bot.name}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {bot.strategyLabel}
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container-highest">
            <span className="w-2 h-2 rounded-full bg-error" />
            <span className="font-ticker-sm text-ticker-sm text-error font-bold">PAUSED</span>
          </div>
        </div>
        {bot.alert && (
          <div className="bg-surface-container-low px-3 py-2 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-error text-[18px] flex-shrink-0">
                shield
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {bot.alert}
              </span>
            </div>
            <button
              type="button"
              className="font-label-caps text-label-caps text-secondary font-semibold hover:underline flex-shrink-0"
            >
              RESUME
            </button>
          </div>
        )}
      </div>
    );
  }

  const winRate = bot.totalTrades > 0 ? (bot.winTrades / bot.totalTrades) * 100 : 0;

  return (
    <div className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3 transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[24px]">
              smart_toy
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">
                {bot.name}
              </span>
              <span className="font-label-caps text-label-caps bg-surface-container-high px-1.5 py-0.5 rounded text-secondary-fixed-dim">
                {bot.exchange.toUpperCase()}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {bot.strategyLabel}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="font-ticker-sm text-ticker-sm text-primary font-bold">RUNNING</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2.5 rounded-lg">
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            PnL 24 Jam
          </span>
          <span className="font-ticker-md text-ticker-md text-primary font-bold mt-0.5">
            {formatSigned(bot.pnl24hUsdt)} USDT ({formatSigned(bot.pnl24hPercent)}%)
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
            Win Rate / Trades
          </span>
          <span className="font-ticker-md text-ticker-md text-on-surface font-semibold mt-0.5">
            {bot.winTrades}/{bot.totalTrades} Win ({winRate.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 text-on-surface-variant font-ticker-sm text-ticker-sm">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          <span>{bot.note}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Jeda Bot"
            type="button"
            className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">pause</span>
          </button>
          <button
            aria-label="Pengaturan Bot"
            type="button"
            className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function BotList({ bots }: { bots: Bot[] }) {
  const running = bots.filter((b) => b.status === 'running').length;
  const paused = bots.filter((b) => b.status === 'paused').length;

  return (
    <section className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-headline-md text-headline-md text-on-surface">Bot Aktif</span>
          <span className="font-ticker-sm text-ticker-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-semibold">
            {running} Running · {paused} Paused
          </span>
        </div>
        <a
          className="font-body-sm text-body-sm text-secondary hover:underline flex items-center gap-0.5"
          href="#"
        >
          Lihat Semua
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </a>
      </div>
      <div className="flex flex-col gap-2.5">
        {bots.map((bot) => (
          <BotCard key={bot.id} bot={bot} />
        ))}
      </div>
    </section>
  );
}
