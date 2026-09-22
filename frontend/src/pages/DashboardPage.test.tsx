import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { AuthProvider } from '../lib/AuthContext';

const WALLET_BODY = JSON.stringify({
  balanceUsdt: '10412.50',
  positions: [{ symbol: 'BTCUSDT', quantity: '0.01', avgEntryPrice: '65000' }],
});
const BOTS_BODY = JSON.stringify([
  { id: 'bot-1', name: 'BTC Scalper', symbol: 'BTCUSDT', strategyType: 'rsi', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
]);
const ORDERS_BODY = JSON.stringify([
  { id: 'o1', symbol: 'BTCUSDT', side: 'buy', quantity: '0.01', status: 'filled', rejectReason: null, createdAt: '2026-01-01T00:00:00.000Z', trade: null },
  { id: 'o2', symbol: 'BTCUSDT', side: 'buy', quantity: '0.01', status: 'rejected', rejectReason: 'INSUFFICIENT_BALANCE', createdAt: '2026-01-01T00:00:00.000Z', trade: null },
]);

function mockDashboardFetch() {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/wallet')) return Promise.resolve(new Response(WALLET_BODY, { status: 200 }));
    if (url.includes('/bots')) return Promise.resolve(new Response(BOTS_BODY, { status: 200 }));
    if (url.includes('/orders')) return Promise.resolve(new Response(ORDERS_BODY, { status: 200 }));
    if (url.includes('/users/me'))
      return Promise.resolve(new Response(JSON.stringify({ email: 'x@example.com' }), { status: 200 }));
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('gain_access_token', 'token');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows a loading state before the real wallet/bots data arrives', async () => {
    mockDashboardFetch();
    renderDashboard();
    expect(screen.getByText(/Memuat data dashboard/)).toBeInTheDocument();
    // Let every pending fetch (including AuthProvider's own hydration
    // call) settle before the test ends, so React doesn't warn about an
    // unwrapped state update landing after teardown.
    await waitFor(() => expect(screen.getByText('10,412.50')).toBeInTheDocument());
  });

  it('renders the real wallet balance and bot list once loaded, never mock data', async () => {
    mockDashboardFetch();
    renderDashboard();

    await waitFor(() => expect(screen.getByText('10,412.50')).toBeInTheDocument());
    expect(screen.getByText('BTC Scalper')).toBeInTheDocument();
    expect(screen.queryByText('BTC Trend Scalper v2')).not.toBeInTheDocument(); // old Fase 1 mock name
    expect(screen.getByText(/1 Order Berhasil/)).toBeInTheDocument(); // only the filled one counted
  });

  it('shows an error banner when a request fails, instead of crashing or faking data', async () => {
    // A fresh Response per call — reusing one instance across fetch() calls
    // would throw "body stream already read" on the 2nd/3rd call instead.
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Server error' }), { status: 500 })),
    );
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
  });

  it('resets the balance through the real API when confirmed', async () => {
    mockDashboardFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('10,412.50')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByText('Reset Saldo'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balanceUsdt: '10000.00', positions: [] }), { status: 200 }),
    );
    await user.click(screen.getByText('Konfirmasi'));

    await waitFor(() => expect(screen.getByText('10,000.00')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pauses an active bot through the real API and reflects the new status', async () => {
    mockDashboardFetch();
    renderDashboard();
    await waitFor(() => expect(screen.getByText('BTC Scalper')).toBeInTheDocument());

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'bot-1',
          name: 'BTC Scalper',
          symbol: 'BTCUSDT',
          strategyType: 'rsi',
          status: 'paused',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Jeda Bot'));

    await waitFor(() => expect(screen.getByText('0 Active · 1 Paused')).toBeInTheDocument());
  });
});
