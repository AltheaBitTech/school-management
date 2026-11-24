import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import StudentsPage from '@/app/(app)/students/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
  formatStudentStatus: (status: string) => (status === 'ACTIVE' ? 'Active' : 'Inactive'),
  formatStudentClassLabel: (student: { className?: string | null }) => student.className ?? '—',
  formatStudentDate: () => 'Sep 17, 2026',
  getStudentInitials: () => 'RK',
  downloadStudentImportSampleCsv: vi.fn(),
  downloadStudentImportGuidePdf: vi.fn(),
  previewStudentsCsv: vi.fn(),
  importStudentsCsv: vi.fn(),
  STUDENT_STATUSES: ['ACTIVE', 'INACTIVE'],
}));

import { listStudents } from '@/lib/students/students-client';
import {
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from '@/lib/features/feature-flags';

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.mocked(listStudents).mockReset();
  });

  it('shows a loading state while students are being fetched', () => {
    vi.mocked(listStudents).mockReturnValue(new Promise(() => undefined));
    renderWithAppProviders(<StudentsPage />);
    expect(screen.getByLabelText('Loading students')).toBeInTheDocument();
  });

  it('renders student rows', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Ravi',
          lastName: 'Kumar',
          className: '10-A',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    renderWithAppProviders(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('adm-001')).toBeInTheDocument();
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
      expect(screen.getByText('10-A')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('shows an empty state when no students are returned', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    renderWithAppProviders(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No students found/i)).toBeInTheDocument();
    });
  });

  it('shows an error state when the API fails', async () => {
    vi.mocked(listStudents).mockRejectedValue(new Error('Network error'));

    renderWithAppProviders(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listStudents).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('passes search text to the students API', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    renderWithAppProviders(<StudentsPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search students' }), {
      target: { value: 'ravi' },
    });

    await waitFor(() => {
      expect(listStudents).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ravi' }),
      );
    });
  });

  it('offers quick options for each student row', async () => {
    setFeatureFlagsFromSession({ attendanceEnabled: true });
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Ravi',
          lastName: 'Kumar',
          className: '10-A',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    renderWithAppProviders(<StudentsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Options for Ravi Kumar' }));

    const expected: Array<[string, string]> = [
      ['Student details', '/students/student-1'],
      ['Fees', '/students/student-1?tab=fees'],
      ['Attendance', '/students/student-1?tab=attendance'],
      ['Results', '/students/student-1?tab=results'],
      ['Linked parents', '/students/student-1?tab=parents'],
      ['Student ID card', '/documents/generate?studentId=student-1&type=STUDENT_ID_CARD'],
    ];
    for (const [name, href] of expected) {
      expect(screen.getByRole('menuitem', { name })).toHaveAttribute('href', href);
    }
    resetFeatureFlagsCacheForTests();
  });

  it('opens the student when a row is clicked', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Ravi',
          lastName: 'Kumar',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    renderWithAppProviders(<StudentsPage />);

    fireEvent.click(await screen.findByText('adm-001'));
    expect(push).toHaveBeenCalledWith('/students/student-1');
  });
});
