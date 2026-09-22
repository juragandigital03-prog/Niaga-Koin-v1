import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../lib/AuthContext';

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<span>dashboard</span>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('navigates to the dashboard after a successful login', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'token', refreshToken: 'refresh' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'user@example.com' }), { status: 200 }));

    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'correct-horse-battery-9');
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
  });

  it('shows the backend error message on a failed login and does not navigate', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Email atau password salah' }), { status: 401 }),
    );

    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Kata Sandi'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email atau password salah');
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });
});
