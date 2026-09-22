import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

function VerifyOtpProbe() {
  const location = useLocation();
  const state = location.state as { registrationToken?: string; email?: string } | null;
  return (
    <span>
      verify-otp-page:{state?.registrationToken ?? 'none'}:{state?.email ?? 'none'}
    </span>
  );
}

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-otp" element={<VerifyOtpProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hands off the registrationToken + email to /verify-otp on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ userId: 'u1', status: 'pending_verification', registrationToken: 'reg-token' }),
        { status: 201 },
      ),
    );

    renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'correct-horse-battery-9');
    await user.click(screen.getByRole('button', { name: /Daftar/i }));

    await waitFor(() =>
      expect(screen.getByText('verify-otp-page:reg-token:new@example.com')).toBeInTheDocument(),
    );
  });

  it('shows the backend error message on a failed registration', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Email sudah terdaftar' }), { status: 409 }),
    );

    renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'dup@example.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'correct-horse-battery-9');
    await user.click(screen.getByRole('button', { name: /Daftar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email sudah terdaftar');
  });
});
