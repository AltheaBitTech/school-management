import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AssetDetailPage from '@/app/(app)/assets/[id]/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'asset-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/assets/assets-client', () => ({
  getAsset: vi.fn(),
  assignAsset: vi.fn(),
  unassignAsset: vi.fn(),
  transferAsset: vi.fn(),
  startAssetMaintenance: vi.fn(),
  completeAssetMaintenance: vi.fn(),
  retireAsset: vi.fn(),
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
  formatAssetHistoryEvent: (eventType: string) => {
    switch (eventType) {
      case 'CREATED':
        return 'Created';
      case 'ASSIGNED':
        return 'Assigned';
      case 'RETIRED':
        return 'Retired';
      default:
        return eventType;
    }
  },
  formatAssetDate: (value: string) => value,
  formatAssetDateTime: (value: string) => value,
  formatMaintenanceType: (type: string) => type,
  getAssetStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
  isWarrantyActive: () => false,
  MAINTENANCE_TYPES: ['REPAIR', 'SERVICE', 'INSPECTION', 'OTHER'],
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'staff-1',
        employeeCode: 'EMP-1',
        firstName: 'Assigned',
        lastName: 'Staff',
        employmentStatus: 'ACTIVE',
      },
      {
        id: 'staff-2',
        employeeCode: 'EMP-2',
        firstName: 'New',
        lastName: 'Assignee',
        employmentStatus: 'ACTIVE',
      },
    ],
    meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
  }),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
  }),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
}));

vi.mock('@/lib/departments/departments-client', () => ({
  listDepartments: vi.fn().mockResolvedValue({
    data: [{ id: 'dept-1', name: 'IT', code: 'IT', status: 'ACTIVE' }],
    meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  }),
}));

import { assignAsset, getAsset, retireAsset } from '@/lib/assets/assets-client';

const baseAsset = {
  id: 'asset-1',
  assetCode: 'AST-000001',
  categoryId: 'cat-1',
  name: 'Dell Latitude 5440',
  status: 'AVAILABLE' as const,
  createdByUserId: 'user-1',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  category: { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', status: 'ACTIVE' as const },
  department: { id: 'dept-1', name: 'IT', code: 'IT' },
  location: 'Lab 1',
  maintenances: [],
  transfers: [],
  history: [
    {
      id: 'history-1',
      eventType: 'CREATED' as const,
      actorUserId: 'user-1',
      comment: 'Asset registered',
      createdAt: '2026-09-16T10:00:00.000Z',
      actorUser: { id: 'user-1', email: 'admin@example.com' },
    },
  ],
};

describe('AssetDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getAsset).mockReset();
    vi.mocked(assignAsset).mockReset();
    vi.mocked(retireAsset).mockReset();
  });

  it('shows a loading state while asset detail is fetched', () => {
    vi.mocked(getAsset).mockReturnValue(new Promise(() => undefined));
    render(<AssetDetailPage />);
    expect(screen.getByLabelText('Loading asset')).toBeInTheDocument();
  });

  it('renders asset detail and history', async () => {
    vi.mocked(getAsset).mockResolvedValue(baseAsset);
    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Dell Latitude 5440')).toBeInTheDocument();
      expect(screen.getByText(/Asset registered/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Assign$/i })).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(getAsset).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('shows a not found state on 404 responses', async () => {
    vi.mocked(getAsset).mockRejectedValue(new ApiError('Not found', 404));
    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Asset not found/i)).toBeInTheDocument();
    });
  });

  it('assigns an asset and reloads detail', async () => {
    vi.mocked(getAsset)
      .mockResolvedValueOnce(baseAsset)
      .mockResolvedValueOnce({
        ...baseAsset,
        status: 'ASSIGNED',
        assignedStaffId: 'staff-2',
        assignedStaff: {
          id: 'staff-2',
          employeeCode: 'EMP-2',
          firstName: 'New',
          lastName: 'Assignee',
        },
      });
    vi.mocked(assignAsset).mockResolvedValue({
      ...baseAsset,
      status: 'ASSIGNED',
      assignedStaffId: 'staff-2',
    });

    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Staff member' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Staff member' }));
    fireEvent.click(await screen.findByRole('option', { name: 'New Assignee' }));
    fireEvent.click(screen.getByRole('button', { name: /^Assign$/i }));

    await waitFor(() => {
      expect(assignAsset).toHaveBeenCalledWith('asset-1', { staffId: 'staff-2' });
      expect(screen.getByRole('alert')).toHaveTextContent('Asset assigned.');
    });
  });

  it('retires an asset after confirmation', async () => {
    vi.mocked(getAsset)
      .mockResolvedValueOnce(baseAsset)
      .mockResolvedValueOnce({
        ...baseAsset,
        status: 'RETIRED',
        retiredAt: '2026-09-16T12:00:00.000Z',
        retirementReason: 'End of life',
      });
    vi.mocked(retireAsset).mockResolvedValue({
      ...baseAsset,
      status: 'RETIRED',
      retiredAt: '2026-09-16T12:00:00.000Z',
      retirementReason: 'End of life',
    });

    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retire asset/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Retire asset/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Retirement reason' }), {
      target: { value: 'End of life' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirm retire/i }));

    await waitFor(() => {
      expect(retireAsset).toHaveBeenCalledWith('asset-1', { reason: 'End of life' });
      expect(screen.getByRole('alert')).toHaveTextContent('Asset retired.');
    });
  });

  it('shows a conflict message on action 409 responses', async () => {
    vi.mocked(getAsset).mockResolvedValue(baseAsset);
    vi.mocked(assignAsset).mockRejectedValue(new ApiError('Conflict', 409));

    render(<AssetDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Staff member' })).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Staff member' }));
    fireEvent.click(await screen.findByRole('option', { name: 'New Assignee' }));
    fireEvent.click(screen.getByRole('button', { name: /^Assign$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
    });
  });
});
