import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StudentFeesPage from '@/app/(app)/fees/student-fees/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/fees/fees-client', () => ({
  listStudentFees: vi.fn(),
  listFeeStructures: vi.fn(),
  assignStudentFee: vi.fn(),
  formatCurrency: (value: number) => `₹${value.toFixed(2)}`,
  formatFeeDate: (value: string) => value,
  formatStudentFeeStatus: (status: string) => status,
  getStudentDisplayNameFromFee: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
  STUDENT_FEE_STATUSES: ['PENDING', 'PARTIALLY_PAID', 'PAID'],
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
}));

import { listFeeStructures, listStudentFees } from '@/lib/fees/fees-client';
import { listStudents } from '@/lib/students/students-client';

describe('StudentFeesPage', () => {
  beforeEach(() => {
    vi.mocked(listStudentFees).mockReset();
    vi.mocked(listStudents).mockReset();
    vi.mocked(listFeeStructures).mockReset();
  });

  it('shows a loading state while student fees are being fetched', () => {
    vi.mocked(listStudentFees).mockReturnValue(new Promise(() => undefined));
    vi.mocked(listStudents).mockReturnValue(new Promise(() => undefined));
    vi.mocked(listFeeStructures).mockReturnValue(new Promise(() => undefined));

    render(<StudentFeesPage />);
    expect(screen.getByLabelText('Loading student fees')).toBeInTheDocument();
  });

  it('renders student fee rows', async () => {
    vi.mocked(listStudentFees).mockResolvedValue({
      data: [
        {
          id: 'student-fee-1',
          studentId: 'student-1',
          feeStructureId: 'structure-1',
          assignedAmount: 50000,
          paidAmount: 0,
          outstandingAmount: 50000,
          dueDate: '2026-06-15',
          status: 'PENDING',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
          student: {
            id: 'student-1',
            studentCode: 'ADM-001',
            firstName: 'Ravi',
            lastName: 'Kumar',
          },
          feeStructure: {
            id: 'structure-1',
            name: 'Annual Tuition 2026',
          },
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'ADM-001',
          firstName: 'Ravi',
          lastName: 'Kumar',
          status: 'ACTIVE',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(listFeeStructures).mockResolvedValue({
      data: [
        {
          id: 'structure-1',
          name: 'Annual Tuition 2026',
          amount: 50000,
          periodStart: '2026-04-01',
          periodEnd: '2027-03-31',
          status: 'ACTIVE',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    render(<StudentFeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
      expect(screen.getByText('Annual Tuition 2026')).toBeInTheDocument();
      expect(screen.getAllByText('₹50000.00').length).toBeGreaterThan(0);
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listStudentFees).mockRejectedValue(new ApiError('Forbidden', 403));
    vi.mocked(listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });
    vi.mocked(listFeeStructures).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    render(<StudentFeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
