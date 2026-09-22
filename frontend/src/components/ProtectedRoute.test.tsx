import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../lib/AuthContext';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<span>login page</span>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<span>dashboard</span>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /login when there is no session', async () => {
    renderAt('/');
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders the protected content when a valid session is stored', async () => {
    localStorage.setItem('gain_access_token', 'stored-token');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ email: 'x@example.com' }), { status: 200 }));

    renderAt('/');
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
  });
});
