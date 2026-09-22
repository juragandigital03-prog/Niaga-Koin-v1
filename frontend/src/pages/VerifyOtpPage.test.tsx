import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyOtpPage } from './VerifyOtpPage';

function LoginProbe() {
  const location = useLocation();
  const state = location.state as { justVerified?: boolean } | null;
  return <span>login-page:{state?.justVerified ? 'justVerified' : 'plain'}</span>;
}

function renderVerifyOtpPage(initialState: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/verify-otp', state: initialState }]}>
      <Routes>
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/register" element={<span>register page</span>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyOtpPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /register when there is no registrationToken in router state', () => {
    renderVerifyOtpPage(null);
    expect(screen.getByText('register page')).toBeInTheDocument();
  });

  it('navigates to /login with justVerified on a correct code', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ verified: true }), { status: 200 }));

    renderVerifyOtpPage({ registrationToken: 'reg-token', email: 'new@example.com' });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Kode OTP/i), '123456');
    await user.click(screen.getByRole('button', { name: /Verifikasi/i }));

    await waitFor(() => expect(screen.getByText('login-page:justVerified')).toBeInTheDocument());

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer reg-token');
  });

  it('shows an error and stays on the page for a wrong/expired code', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Kode salah' }), { status: 400 }),
    );

    renderVerifyOtpPage({ registrationToken: 'reg-token', email: 'new@example.com' });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Kode OTP/i), '000000');
    await user.click(screen.getByRole('button', { name: /Verifikasi/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kode salah');
  });
});
