import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import StudentDetailPage from '@/app/(app)/students/[id]/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

let currentSearch = '';
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-1' }),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/students/student-1',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('@/lib/student-attendance/student-attendance-client', () => ({
  getStudentAttendanceHistory: vi.fn().mockResolvedValue({
    studentId: 'student-1',
    from: '2026-10-26',
    to: '2026-11-24',
    summary: { total: 2, present: 1, absent: 1, halfDay: 0, onLeave: 0, percentage: 50 },
    records: [
      { id: 'r1', date: '2026-11-24', status: 'PRESENT', remarks: null, sectionLabel: '10 - A' },
      { id: 'r2', date: '2026-11-23', status: 'ABSENT', remarks: 'Sick', sectionLabel: '10 - A' },
    ],
  }),
  formatStudentAttendanceStatus: (status: string) => (status === 'PRESENT' ? 'Present' : 'Absent'),
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
  const activeStudent = {
    id: 'student-1',
    studentCode: 'adm-001',
    firstName: 'Ravi',
    lastName: 'Kumar',
    className: '10-A',
    status: 'ACTIVE' as const,
    createdAt: '2026-09-17T10:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.mocked(getStudent).mockReset();
    currentSearch = '';
    replace.mockReset();
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
    expect(screen.getByRole('tab', { name: 'Details', selected: true })).toBeInTheDocument();
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
    expect(screen.queryByRole('tab', { name: 'Attendance' })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('tab', { name: 'Attendance' })).toBeInTheDocument();
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

  it('opens the tab named in the URL', async () => {
    currentSearch = 'tab=fees';
    vi.mocked(getStudent).mockResolvedValue(activeStudent);

    renderWithAppProviders(<StudentDetailPage />);

    expect(await screen.findByRole('tab', { name: 'Fees', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View fee records' })).toHaveAttribute(
      'href',
      '/fees/student-fees?studentId=student-1',
    );
    expect(screen.queryByText('Academic details')).not.toBeInTheDocument();
  });

  it('shows attendance history on the attendance tab', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: true });
    currentSearch = 'tab=attendance';
    vi.mocked(getStudent).mockResolvedValue(activeStudent);

    renderWithAppProviders(<StudentDetailPage />);

    expect(await screen.findByText('Attendance 50%')).toBeInTheDocument();
    expect(screen.getByText('Sick')).toBeInTheDocument();
    resetFeatureFlagsCacheForTests();
  });

  it('shows the results placeholder and updates the URL when switching tabs', async () => {
    currentSearch = 'tab=results';
    vi.mocked(getStudent).mockResolvedValue(activeStudent);

    renderWithAppProviders(<StudentDetailPage />);

    expect(await screen.findByText(/report cards are coming soon/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }));
    expect(replace).toHaveBeenCalledWith('/students/student-1?tab=documents', { scroll: false });
  });

  it('falls back to details for an unknown tab', async () => {
    currentSearch = 'tab=nope';
    vi.mocked(getStudent).mockResolvedValue(activeStudent);

    renderWithAppProviders(<StudentDetailPage />);

    expect(await screen.findByRole('tab', { name: 'Details', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Academic details')).toBeInTheDocument();
  });
});
