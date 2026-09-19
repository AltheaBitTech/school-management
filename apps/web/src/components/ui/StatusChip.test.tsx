import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '@/components/ui/StatusChip';

describe('StatusChip', () => {
  it('renders the provided label', () => {
    render(<StatusChip status="PENDING" label="Pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('falls back to the status value when no label is provided', () => {
    render(<StatusChip status="APPROVED" />);
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });
});
