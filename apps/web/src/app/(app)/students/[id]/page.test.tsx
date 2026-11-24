import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import StudentDetailPage from '@/app/(app)/students/[id]/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/students/students-client', () => ({
  getStudent: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
  formatStudentStatus: (status: string) => (status === 'ACTIVE' ? 'Active' : 'Inactive'),
  formatStudentClassLabel: (student: { className?: string | null }) => student.className ?? '—',
  formatStudentDate: () => 'Sep 17, 2026',
  getStudentInitials: () => 'RK',
  listLinkedParents: vi.fn().mockResolvedValue([]),
  searchParentCandidates: vi.fn().mockResolvedValue([]),
  linkParent: vi.fn().mockResolvedValue(undefined),
  provisionStudentLogin: vi.fn(),
}));

vi.mock('@/lib/fees/fees-client', () => ({
  getStudentFeeSummary: vi.fn().mockResolvedValue({
    studentId: 'student-1',
    totalAssigned: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    fees: [],
  }),
  formatCurrency: (amount: number) => `₹${amount}`,
}));

vi.mock('@/lib/documents/documents-client', () => ({
  listDocuments: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
  formatDocumentType: (documentType: string) => documentType,
  downloadGeneratedDocument: vi.fn(),
}));

import { getStudent } from '@/lib/students/students-client';
import {
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

describe('StudentDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getStudent).mockReset();
  });

  it('renders student details', async () => {
    vi.mocked(getStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      className: '10-A',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });

    renderWithAppProviders(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('adm-001')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ravi Kumar' })).toBeInTheDocument();
      expect(screen.getByText('10-A')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Generate bonafide' })).toHaveAttribute(
      'href',
      '/documents/generate?studentId=student-1',
    );
    expect(screen.getByRole('link', { name: 'Open student attendance' })).toHaveAttribute(
      'href',
      '/attendance/students',
    );
  });

  it('hides attendance section when attendance feature is disabled', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    vi.mocked(getStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      className: '10-A',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });

    renderWithAppProviders(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ravi Kumar' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Open student attendance' })).not.toBeInTheDocument();
    expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
  });

  it('shows attendance section when attendance feature is enabled', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: true });
    vi.mocked(getStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      className: '10-A',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });

    renderWithAppProviders(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open student attendance' })).toBeInTheDocument();
    });
    resetFeatureFlagsCacheForTests();
  });

  it('shows a not found state on 404 responses', async () => {
    vi.mocked(getStudent).mockRejectedValue(new ApiError('Not found', 404));

    renderWithAppProviders(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Student not found.')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(getStudent).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
