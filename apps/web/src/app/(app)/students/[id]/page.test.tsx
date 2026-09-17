import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StudentDetailPage from '@/app/(app)/students/[id]/page';
import { ApiError } from '@/lib/api/client';

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
  formatStudentDate: () => 'Sep 17, 2026',
}));

import { getStudent } from '@/lib/students/students-client';

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

    render(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('adm-001')).toBeInTheDocument();
      expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
      expect(screen.getByText('10-A')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Generate bonafide certificate' })).toHaveAttribute(
      'href',
      '/documents/generate?studentId=student-1',
    );
  });

  it('shows a not found state on 404 responses', async () => {
    vi.mocked(getStudent).mockRejectedValue(new ApiError('Not found', 404));

    render(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Student not found.')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(getStudent).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<StudentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
