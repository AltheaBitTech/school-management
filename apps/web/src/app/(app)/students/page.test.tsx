import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentsPage from '@/app/(app)/students/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
  formatStudentStatus: (status: string) => (status === 'ACTIVE' ? 'Active' : 'Inactive'),
  formatStudentDate: () => 'Sep 17, 2026',
  STUDENT_STATUSES: ['ACTIVE', 'INACTIVE'],
}));

import { listStudents } from '@/lib/students/students-client';

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.mocked(listStudents).mockReset();
  });

  it('shows a loading state while students are being fetched', () => {
    vi.mocked(listStudents).mockReturnValue(new Promise(() => undefined));
    render(<StudentsPage />);
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

    render(<StudentsPage />);

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

    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No students found/i)).toBeInTheDocument();
    });
  });

  it('shows an error state when the API fails', async () => {
    vi.mocked(listStudents).mockRejectedValue(new Error('Network error'));

    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listStudents).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<StudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('passes search text to the students API', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
    });

    render(<StudentsPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search students' }), {
      target: { value: 'ravi' },
    });

    await waitFor(() => {
      expect(listStudents).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ravi' }),
      );
    });
  });
});
