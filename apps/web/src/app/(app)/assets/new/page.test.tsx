import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewAssetPage from '@/app/(app)/assets/new/page';
import { ApiError } from '@/lib/api/client';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/assets/assets-client', () => ({
  createAsset: vi.fn(),
  listAssetCategories: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', status: 'ACTIVE' },
  ]),
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'IT', code: 'IT', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'staff-1',
        organizationId: 'org-1',
        employeeCode: 'EMP-1',
        firstName: 'Assigned',
        lastName: 'Staff',
        employmentStatus: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

import { createAsset } from '@/lib/assets/assets-client';

describe('NewAssetPage', () => {
  beforeEach(() => {
    vi.mocked(createAsset).mockReset();
    push.mockReset();
  });

  it('requires core fields before submit', async () => {
    render(<NewAssetPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: 'Asset name' })).toBeRequired();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeRequired();
  });

  it('registers an asset and navigates to detail', async () => {
    vi.mocked(createAsset).mockResolvedValue({
      id: 'asset-1',
      assetCode: 'AST-000001',
      categoryId: 'cat-1',
      name: 'Dell Latitude 5440',
      status: 'AVAILABLE',
      createdByUserId: 'user-1',
      createdAt: '2026-09-16T10:00:00.000Z',
      updatedAt: '2026-09-16T10:00:00.000Z',
    });

    render(<NewAssetPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Laptops' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Asset name' }), {
      target: { value: 'Dell Latitude 5440' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register asset/i }));

    await waitFor(() => {
      expect(createAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-1',
          name: 'Dell Latitude 5440',
        }),
      );
      expect(push).toHaveBeenCalledWith('/assets/asset-1');
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(createAsset).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<NewAssetPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Laptops' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Asset name' }), {
      target: { value: 'Dell Latitude 5440' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register asset/i }));

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
