import { describe, expect, it } from 'vitest';

import { render, screen, fireEvent } from '@/test-utils';
import { SubscriptionPlans } from '../subscription-plans';

describe('SubscriptionPlans', () => {
  it('shows individual plans by default, with the supporter plan linking to /contribute', () => {
    render(<SubscriptionPlans />);

    expect(screen.getByRole('tab', { name: 'Individual' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Individual Free')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contribute' })).toHaveAttribute('href', '/contribute');
  });

  it('switches to church plans', () => {
    render(<SubscriptionPlans />);

    fireEvent.click(screen.getByRole('tab', { name: 'Church' }));

    expect(screen.getByText('Church Pro')).toBeInTheDocument();
    expect(screen.queryByText('Individual Free')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose Pro' })).toHaveAttribute('href', '/login');
  });
});
