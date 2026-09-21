import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BalanceCard } from './BalanceCard';

const baseProps = {
  balanceUsdt: 10412.5,
  pnl24hUsdt: 412.5,
  pnl24hPercent: 4.12,
  ordersSucceeded24h: 22,
  onResetBalance: vi.fn(),
  onCreateBot: vi.fn(),
  onViewHistory: vi.fn(),
};

describe('BalanceCard', () => {
  it('formats the virtual balance and labels it as an estimate, not a real balance', () => {
    render(<BalanceCard {...baseProps} />);
    expect(screen.getByText('10,412.50')).toBeInTheDocument();
    expect(screen.getByText(/Total Estimasi Saldo Virtual/i)).toBeInTheDocument();
  });

  it('hides the balance behind masked dots when the visibility toggle is used', () => {
    render(<BalanceCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sembunyikan Saldo/i }));
    expect(screen.queryByText('10,412.50')).not.toBeInTheDocument();
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });

  it('calls onResetBalance when the reset action is clicked', () => {
    const onResetBalance = vi.fn();
    render(<BalanceCard {...baseProps} onResetBalance={onResetBalance} />);
    fireEvent.click(screen.getByText('Reset Saldo'));
    expect(onResetBalance).toHaveBeenCalledTimes(1);
  });

  it('renders negative PnL with the error color path, not the primary/positive one', () => {
    render(<BalanceCard {...baseProps} pnl24hUsdt={-50} pnl24hPercent={-0.5} />);
    const pnlText = screen.getByText(/-50\.00 USDT \(-0\.50% 24j\)/);
    expect(pnlText.className).toContain('text-error');
  });
});
