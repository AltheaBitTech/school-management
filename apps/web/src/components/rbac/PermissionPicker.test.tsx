import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionPicker } from './PermissionPicker';

const groups = [
  {
    key: 'fees',
    label: 'Fees',
    permissions: [
      { code: 'fee.view', description: 'View fee structures and student fees' },
      { code: 'fee.create', description: 'Create fee structures' },
    ],
  },
];

describe('PermissionPicker', () => {
  it('shows the selected count per module', () => {
    render(<PermissionPicker groups={groups} selected={new Set(['fee.view'])} onChange={vi.fn()} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('toggles a single permission', () => {
    const onChange = vi.fn();
    render(<PermissionPicker groups={groups} selected={new Set()} onChange={onChange} />);

    fireEvent.click(screen.getByText('Fees'));
    fireEvent.click(screen.getByLabelText(/Create fee structures/));

    expect([...onChange.mock.calls[0][0]]).toEqual(['fee.create']);
  });

  it('selects every permission in a module', () => {
    const onChange = vi.fn();
    render(<PermissionPicker groups={groups} selected={new Set(['fee.view'])} onChange={onChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all Fees permissions' }));

    expect([...onChange.mock.calls[0][0]].sort()).toEqual(['fee.create', 'fee.view']);
  });

  it('disables checkboxes when read-only', () => {
    render(<PermissionPicker groups={groups} selected={new Set()} onChange={vi.fn()} disabled />);
    for (const checkbox of screen.getAllByRole('checkbox', { hidden: true })) {
      expect(checkbox).toBeDisabled();
    }
  });
});
