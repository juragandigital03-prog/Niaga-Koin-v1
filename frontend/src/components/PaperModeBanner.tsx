// Environment switcher + simulation notice. Live Trading is rendered as a
// permanently disabled control — per master prompt: "Jangan menampilkan
// kontrol live trading sebagai kontrol aktif pada fase ini." This is not a
// styling choice, it enforces the BLOCKED status from PROJECT_STATUS.md.
export function PaperModeBanner() {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between bg-surface-container-lowest p-1 rounded-xl">
        <button
          type="button"
          className="flex-1 py-1.5 px-3 rounded-lg bg-surface-container-high text-tertiary flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
          </span>
          <span className="font-ticker-sm text-ticker-sm font-semibold tracking-wider uppercase">
            Mode Simulasi (Paper)
          </span>
        </button>
        <div className="relative group flex-1">
          <button
            type="button"
            disabled
            aria-label="Live Trading terkunci — menunggu kepatuhan hukum"
            className="w-full py-1.5 px-3 rounded-lg text-on-surface-variant/40 flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span className="font-ticker-sm text-ticker-sm font-medium">Live Trading</span>
          </button>
        </div>
      </div>
      <div className="bg-surface-container-low rounded-xl p-space-sm flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-tertiary-container/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-tertiary text-[20px]">science</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider">
            Lingkungan Latihan Virtual
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
            Simulasi order virtual tanpa risiko dana riil. Order dicocokkan dengan orderbook live
            exchange tanpa transfer kapital.
          </p>
        </div>
      </div>
    </section>
  );
}
