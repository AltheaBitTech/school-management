import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewVisitorPage from '@/app/(app)/visitors/new/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/visitors/visitors-client', () => ({
  createVisitor: vi.fn(),
  listVisitorHostStaff: vi.fn().mockResolvedValue([
    {
      id: 'staff-1',
      employeeCode: 'EMP-1',
      firstName: 'Host',
      lastName: 'Staff',
    },
  ]),
  getVisitorHostStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import { createVisitor } from '@/lib/visitors/visitors-client';

describe('NewVisitorPage', () => {
  beforeEach(() => {
    vi.mocked(createVisitor).mockReset();
    push.mockReset();
  });

  it('requires core fields before submit', () => {
    renderWithAppProviders(<NewVisitorPage />);
    expect(screen.getByRole('textbox', { name: 'Visitor name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Mobile' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Purpose' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Host staff' })).toBeRequired();
  });

  it('registers a visitor and navigates to detail', async () => {
    vi.mocked(createVisitor).mockResolvedValue({
      id: 'visitor-1',
      visitorCode: 'VIS-000001',
      name: 'Ramesh Kumar',
      mobile: '9876543210',
      purpose: 'Meeting',
      hostStaffId: 'staff-1',
      checkInAt: '2026-09-16T10:00:00.000Z',
      status: 'CHECKED_IN',
      createdByUserId: 'user-1',
      createdAt: '2026-09-16T10:00:00.000Z',
      updatedAt: '2026-09-16T10:00:00.000Z',
    });

    renderWithAppProviders(<NewVisitorPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Visitor name' }), {
      target: { value: 'Ramesh Kumar' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Mobile' }), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Purpose' }), {
      target: { value: 'Meeting' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Host staff' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Host Staff' }));

    fireEvent.click(screen.getByRole('button', { name: /Register & check in/i }));

    await waitFor(() => {
      expect(createVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramesh Kumar',
          mobile: '9876543210',
          purpose: 'Meeting',
          hostStaffId: 'staff-1',
        }),
      );
      expect(push).toHaveBeenCalledWith('/visitors/visitor-1');
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(createVisitor).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<NewVisitorPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Visitor name' }), {
      target: { value: 'Ramesh Kumar' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Mobile' }), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Purpose' }), {
      target: { value: 'Meeting' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Host staff' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Host Staff' }));
    fireEvent.click(screen.getByRole('button', { name: /Register & check in/i }));

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
