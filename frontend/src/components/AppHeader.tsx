import { useAuth } from '../lib/AuthContext';

// Faithful replica of the Stitch mockup header
// (docs/design/stitch-export/dashboard_paper_trading_mobile/code.html:4),
// plus a logout action on the avatar (no mockup covers session controls —
// see PROJECT_STATUS.md 3.3).
export function AppHeader() {
  const { logout } = useAuth();

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-xs min-w-0 flex-shrink-0">
          <div className="flex flex-col justify-center select-none">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface leading-none font-bold">
              GAIN
            </span>
            <span className="font-ticker-sm text-ticker-sm text-primary tracking-widest leading-tight uppercase font-medium">
              NIAGA KOIN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs flex-1 justify-center px-space-xs overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container-high/80 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <span className="font-ticker-sm text-ticker-sm text-tertiary font-semibold tracking-wide whitespace-nowrap">
              PAPER
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs flex-shrink-0">
          <button
            aria-label="Notifikasi Sistem"
            type="button"
            className="w-11 h-11 relative rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface active:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface" />
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Keluar"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
}
