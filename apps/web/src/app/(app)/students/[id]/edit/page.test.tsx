import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import EditStudentPage from '@/app/(app)/students/[id]/edit/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'student-1' }),
  useRouter: () => ({ push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/students/students-client', () => ({
  getStudent: vi.fn(),
  updateStudent: vi.fn(),
  formatStudentStatus: (status: string) => (status === 'ACTIVE' ? 'Active' : 'Inactive'),
  STUDENT_STATUSES: ['ACTIVE', 'INACTIVE'],
}));

import { getStudent, updateStudent } from '@/lib/students/students-client';

describe('EditStudentPage', () => {
  beforeEach(() => {
    vi.mocked(getStudent).mockReset();
    vi.mocked(updateStudent).mockReset();
    push.mockReset();
  });

  it('loads student and saves changes', async () => {
    vi.mocked(getStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      studentClass: '10',
      section: 'A',
      rollNumber: '14',
      academicYear: '2025-2026',
      guardianName: 'Avinash',
      guardianPhone: '7893446784',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });
    vi.mocked(updateStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Patel',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T11:00:00.000Z',
    });

    renderWithAppProviders(<EditStudentPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ravi')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Patel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateStudent).toHaveBeenCalledWith(
        'student-1',
        expect.objectContaining({ lastName: 'Patel' }),
      );
      expect(push).toHaveBeenCalledWith('/students/student-1');
    });
  });

  it('shows forbidden state on 403 when loading', async () => {
    vi.mocked(getStudent).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<EditStudentPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
