import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { isAuthenticated, isLoading, email, login, logout } = useAuth();
  if (isLoading) return <span>loading</span>;
  return (
    <div>
      <span>{isAuthenticated ? 'authed' : 'anonymous'}</span>
      <span>{email ?? 'no-email'}</span>
      <button onClick={() => login('user@example.com', 'correct-horse-battery-9')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts anonymous with no stored token', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
  });

  it('hydrates as authenticated when a valid token is already stored', async () => {
    localStorage.setItem('gain_access_token', 'stored-token');
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ email: 'stored@example.com' }), { status: 200 }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('authed')).toBeInTheDocument());
    expect(screen.getByText('stored@example.com')).toBeInTheDocument();
  });

  it('drops an expired/invalid stored token instead of staying stuck authenticated', async () => {
    localStorage.setItem('gain_access_token', 'expired-token');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(localStorage.getItem('gain_access_token')).toBeNull();
  });

  it('login() stores tokens and flips to authenticated', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'new-token', refreshToken: 'refresh' }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'user@example.com' }), { status: 200 }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(screen.getByText('authed')).toBeInTheDocument());
    expect(localStorage.getItem('gain_access_token')).toBe('new-token');
  });

  it('logout() clears the stored session', async () => {
    localStorage.setItem('gain_access_token', 'stored-token');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ email: 'x@example.com' }), { status: 200 }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('authed')).toBeInTheDocument());

    act(() => {
      screen.getByText('logout').click();
    });

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(localStorage.getItem('gain_access_token')).toBeNull();
  });
});
