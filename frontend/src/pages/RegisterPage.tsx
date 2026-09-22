import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/auth';
import { ApiError } from '../lib/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await register(email, password);
      navigate('/verify-otp', { state: { registrationToken: res.registrationToken, email } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mendaftar. Coba lagi.');
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
            Niaga Koin
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm" noValidate>
          <label className="flex flex-col gap-1">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg bg-surface-container-low px-3 py-2.5 text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Kata Sandi</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg bg-surface-container-low px-3 py-2.5 text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          {error && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 py-2.5 rounded-lg bg-primary text-on-primary font-body-md text-body-md font-semibold hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
          >
            {submitting ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-secondary hover:underline font-medium">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
