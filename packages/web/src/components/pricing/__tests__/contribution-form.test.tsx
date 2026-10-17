import { describe, expect, it } from 'vitest';

import { render, screen, fireEvent } from '@/test-utils';
import { ContributionForm } from '../contribution-form';

describe('ContributionForm', () => {
  it('defaults to a one-time HK$300 gift', () => {
    render(<ContributionForm />);

    expect(screen.getByRole('button', { name: 'Give HK$300' })).toBeEnabled();
  });

  it('uses a custom monthly amount and shows a summary without taking payment', () => {
    render(<ContributionForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    fireEvent.change(screen.getByLabelText('Other amount'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Where should it go?'), {
      target: { value: 'translation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Give HK$1,234 monthly' }));

    expect(screen.getByText('Thank you for your generosity')).toBeInTheDocument();
    expect(
      screen.getByText(/HK\$1,234 every month towards “Translation and accessibility”/),
    ).toBeInTheDocument();
    expect(screen.getByText(/no money has been taken/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change my gift' }));
    expect(screen.getByRole('button', { name: 'Give HK$1,234 monthly' })).toBeInTheDocument();
  });

  it('returns to a preset when one is clicked after typing a custom amount', () => {
    render(<ContributionForm />);

    fireEvent.change(screen.getByLabelText('Other amount'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'HK$1,000' }));

    expect(screen.getByLabelText('Other amount')).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Give HK$1,000' })).toBeInTheDocument();
  });
});
