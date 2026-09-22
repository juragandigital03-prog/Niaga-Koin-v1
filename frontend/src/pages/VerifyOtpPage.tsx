import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp } from '../lib/auth';
import { ApiError } from '../lib/api';

interface RegisterHandoffState {
  registrationToken: string;
  email: string;
}

export function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as RegisterHandoffState | null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // registrationToken only exists in router state right after register() —
  // it's never persisted (it's short-lived, see backend AuthService), so a
  // page refresh or direct visit here has nothing to verify against.
  if (!state || !state.registrationToken) {
    return <Navigate to="/register" replace />;
  }
  const { registrationToken, email } = state;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(registrationToken, code);
      navigate('/login', { state: { justVerified: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kode OTP salah atau kedaluwarsa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-margin-mobile">
      <div className="w-full max-w-sm rounded-xl bg-surface-container p-space-md shadow-2xl flex flex-col gap-space-md">
        <div className="flex flex-col items-center gap-1 mb-1">
          <span className="font-headline-lg text-headline-lg text-on-surface font-bold">GAIN</span>
          <span className="font-ticker-sm text-ticker-sm text-primary tracking-widest uppercase font-medium">
            Verifikasi Akun
          </span>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Kode OTP untuk <span className="text-on-surface">{email}</span>. Di fase
          pengembangan ini belum ada provider pengiriman nyata — kode dicatat di log server
          backend, bukan dikirim ke email sungguhan (lihat README.md).
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm" noValidate>
          <label className="flex flex-col gap-1">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Kode OTP (6 digit)</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="rounded-lg bg-surface-container-low px-3 py-2.5 text-on-surface font-ticker-lg text-ticker-lg tracking-[0.3em] text-center outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          {error && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="mt-1 py-2.5 rounded-lg bg-primary text-on-primary font-body-md text-body-md font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
          >
            {submitting ? 'Memverifikasi...' : 'Verifikasi'}
          </button>
        </form>
      </div>
    </main>
  );
}
