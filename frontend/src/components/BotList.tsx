import type { Bot, BotStatus } from '../lib/types';

const STATUS_STYLE: Record<BotStatus, { label: string; dot: string; badgeBg: string; text: string }> = {
  active: { label: 'ACTIVE', dot: 'bg-primary', badgeBg: 'bg-primary/10', text: 'text-primary' },
  paused: { label: 'PAUSED', dot: 'bg-error', badgeBg: 'bg-surface-container-highest', text: 'text-error' },
  stopped: {
    label: 'STOPPED',
    dot: 'bg-on-surface-variant',
    badgeBg: 'bg-surface-container-highest',
    text: 'text-on-surface-variant',
  },
};

interface BotCardProps {
  bot: Bot;
  pending: boolean;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
}

function BotCard({ bot, pending, onStart, onPause, onStop }: BotCardProps) {
  const style = STATUS_STYLE[bot.status];

  return (
    <div className="rounded-xl bg-surface-container p-space-md flex flex-col gap-3 transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-[24px]">smart_toy</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-md text-headline-md text-on-surface leading-tight">
                {bot.name}
              </span>
              <span className="font-label-caps text-label-caps bg-surface-container-high px-1.5 py-0.5 rounded text-secondary-fixed-dim">
                {bot.symbol}
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant uppercase">
              {bot.strategyType}
            </span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${style.badgeBg}`}>
          <span className="relative flex h-2 w-2">
            {bot.status === 'active' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
          </span>
          <span className={`font-ticker-sm text-ticker-sm font-bold ${style.text}`}>{style.label}</span>
        </div>
      </div>

      {/* No fabricated PnL/win-rate — the backend doesn't compute bot
          analytics yet (F-AN-01 is TODO), so we say so instead of
          inventing numbers. */}
      <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2">
        Analitik performa (PnL, win rate) belum tersedia untuk bot ini.
      </p>

      <div className="flex items-center justify-end gap-1.5 pt-1">
        {bot.status !== 'active' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStart(bot.id)}
            aria-label="Jalankan Bot"
            className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-primary transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          </button>
        )}
        {bot.status === 'active' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onPause(bot.id)}
            aria-label="Jeda Bot"
            className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">pause</span>
          </button>
        )}
        {bot.status !== 'stopped' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStop(bot.id)}
            aria-label="Hentikan Bot"
            className="w-9 h-9 rounded-lg bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-error transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">stop</span>
          </button>
        )}
      </div>
    </div>
  );
}

export interface BotListProps {
  bots: Bot[];
  pendingId?: string | null;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
}

export function BotList({ bots, pendingId = null, onStart, onPause, onStop }: BotListProps) {
  const active = bots.filter((b) => b.status === 'active').length;
  const paused = bots.filter((b) => b.status === 'paused').length;

  return (
    <section className="flex flex-col gap-space-sm">
      <div className="flex items-center gap-2">
        <span className="font-headline-md text-headline-md text-on-surface">Bot Saya</span>
        <span className="font-ticker-sm text-ticker-sm px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-semibold">
          {active} Active · {paused} Paused
        </span>
      </div>

      {bots.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-space-md">
          Belum ada bot. Buat bot baru untuk mulai paper trading otomatis.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              pending={pendingId === bot.id}
              onStart={onStart}
              onPause={onPause}
              onStop={onStop}
            />
          ))}
        </div>
      )}
    </section>
  );
}
