import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AssetsPage from '@/app/(app)/assets/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/assets/assets-client', () => ({
  listAssets: vi.fn(),
  listAssetCategories: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', status: 'ACTIVE' },
  ]),
  formatAssetStatus: (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'ASSIGNED':
        return 'Assigned';
      case 'UNDER_MAINTENANCE':
        return 'Under maintenance';
      case 'RETIRED':
        return 'Retired';
      default:
        return status;
    }
  },
  getAssetStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  isWarrantyActive: () => true,
  ASSET_STATUSES: ['AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED'],
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'IT', code: 'IT', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [{ id: 'staff-1', firstName: 'Assigned', lastName: 'Staff', employmentStatus: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import { listAssets } from '@/lib/assets/assets-client';

describe('AssetsPage', () => {
  beforeEach(() => {
    vi.mocked(listAssets).mockReset();
  });

  it('shows a loading state while assets are being fetched', () => {
    vi.mocked(listAssets).mockReturnValue(new Promise(() => undefined));
    render(<AssetsPage />);
    expect(screen.getByLabelText('Loading assets')).toBeInTheDocument();
  });

  it('renders asset rows', async () => {
    vi.mocked(listAssets).mockResolvedValue({
      data: [
        {
          id: 'asset-1',
          assetCode: 'AST-000001',
          categoryId: 'cat-1',
          name: 'Dell Latitude 5440',
          status: 'ASSIGNED',
          createdByUserId: 'user-1',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
          category: { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', status: 'ACTIVE' },
          department: { id: 'dept-1', name: 'IT', code: 'IT' },
          assignedStaff: {
            id: 'staff-1',
            employeeCode: 'EMP-1',
            firstName: 'Assigned',
            lastName: 'Staff',
          },
          location: 'Lab 1',
          warrantyStartDate: '2026-01-01',
          warrantyEndDate: '2029-01-01',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Dell Latitude 5440')).toBeInTheDocument();
      expect(screen.getByText('AST-000001')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'Assigned' })).toBeInTheDocument();
      expect(screen.getByText('Lab 1')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no assets are returned', async () => {
    vi.mocked(listAssets).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
    });

    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No assets found/i)).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listAssets).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
