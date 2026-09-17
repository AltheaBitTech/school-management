import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewStudentPage from '@/app/(app)/students/new/page';
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

vi.mock('@/lib/students/students-client', () => ({
  createStudent: vi.fn(),
}));

import { createStudent } from '@/lib/students/students-client';

describe('NewStudentPage', () => {
  beforeEach(() => {
    vi.mocked(createStudent).mockReset();
    push.mockReset();
  });

  it('renders the create student form', () => {
    render(<NewStudentPage />);
    expect(screen.getByRole('textbox', { name: 'Student code' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'First name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Class' })).toBeInTheDocument();
  });

  it('submits the correct payload and navigates to the list', async () => {
    vi.mocked(createStudent).mockResolvedValue({
      id: 'student-1',
      studentCode: 'adm-001',
      firstName: 'Ravi',
      lastName: 'Kumar',
      className: '10-A',
      status: 'ACTIVE',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });

    render(<NewStudentPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Student code' }), {
      target: { value: 'adm-001' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Ravi' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Kumar' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Class' }), {
      target: { value: '10-A' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(createStudent).toHaveBeenCalledWith({
        studentCode: 'adm-001',
        firstName: 'Ravi',
        lastName: 'Kumar',
        className: '10-A',
      });
      expect(push).toHaveBeenCalledWith('/students');
    });
  });

  it('shows an API error message', async () => {
    vi.mocked(createStudent).mockRejectedValue(new Error('Student code already exists'));

    render(<NewStudentPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Student code' }), {
      target: { value: 'adm-001' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Ravi' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Kumar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(screen.getByText('Student code already exists')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(createStudent).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<NewStudentPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Student code' }), {
      target: { value: 'adm-001' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
      target: { value: 'Ravi' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
      target: { value: 'Kumar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
