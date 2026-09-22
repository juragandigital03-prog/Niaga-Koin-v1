import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaperModeBanner } from './PaperModeBanner';

describe('PaperModeBanner', () => {
  it('shows paper trading as the active mode', () => {
    render(<PaperModeBanner />);
    expect(screen.getByText(/Mode Simulasi \(Paper\)/i)).toBeInTheDocument();
  });

  it('renders the Live Trading control as disabled — must never be an active control on this fase', () => {
    render(<PaperModeBanner />);
    const liveButton = screen.getByRole('button', { name: /Live Trading terkunci/i });
    expect(liveButton).toBeDisabled();
  });
});
