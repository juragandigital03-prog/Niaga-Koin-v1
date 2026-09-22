export interface ResetBalanceModalProps {
  open: boolean;
  resetToUsdt: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetBalanceModal({
  open,
  resetToUsdt,
  onCancel,
  onConfirm,
}: ResetBalanceModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reset Saldo Virtual"
      className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile bg-surface-container-lowest/80 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-xl bg-surface-container p-space-md shadow-2xl flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">restart_alt</span>
            <span className="font-headline-md text-headline-md text-on-surface">
              Reset Saldo Virtual
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Kembalikan akun Paper Trading ke saldo awal {resetToUsdt.toLocaleString('en-US')}
          .00 USDT. Riwayat eksekusi bot virtual akan diarsipkan.
        </p>
        <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Saldo Reset:</span>
          <span className="font-ticker-md text-ticker-md text-primary font-bold">
            {resetToUsdt.toLocaleString('en-US')}.00 USDT
          </span>
        </div>
        <div className="flex items-center gap-space-xs mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface font-body-md text-body-md hover:bg-surface-bright transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-primary-container text-on-primary font-body-md text-body-md font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}
