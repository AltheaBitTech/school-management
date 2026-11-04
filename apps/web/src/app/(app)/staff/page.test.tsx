import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StaffListPage from '@/app/(app)/staff/page';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import { ApiError } from '@/lib/api/client';

function renderStaffPage() {
  return render(
    <AppThemeProvider>
      <StaffListPage />
    </AppThemeProvider>,
  );
}

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn(),
  downloadStaffImportSampleCsv: vi.fn(),
  downloadStaffImportGuidePdf: vi.fn(),
  previewStaffCsv: vi.fn(),
  importStaffCsv: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  getStaffInitials: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`.toUpperCase(),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } }),
}));

import { listStaff } from '@/lib/staff/staff-client';

describe('StaffListPage', () => {
  beforeEach(() => {
    vi.mocked(listStaff).mockReset();
  });

  it('shows a loading state while staff are being fetched', () => {
    vi.mocked(listStaff).mockReturnValue(new Promise(() => undefined));

    renderStaffPage();

    expect(screen.getByLabelText('Loading staff')).toBeInTheDocument();
  });

  it('renders staff rows after loading', async () => {
    vi.mocked(listStaff).mockResolvedValue({
      data: [
        {
          id: 'staff-1',
          organizationId: 'org-1',
          employeeCode: 'emp-001',
          firstName: 'Anita',
          lastName: 'Desai',
          employmentStatus: 'ACTIVE',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    renderStaffPage();

    await waitFor(() => {
      expect(screen.getByText('Anita Desai')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no staff are returned', async () => {
    vi.mocked(listStaff).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    renderStaffPage();

    await waitFor(() => {
      expect(screen.getByText(/No staff members found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listStaff).mockRejectedValue(new ApiError('Forbidden', 403));

    renderStaffPage();

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
