import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import NewStudentPage from '@/app/(app)/students/new/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

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
  provisionStudentLogin: vi.fn(),
  suggestNextStudentCode: vi.fn().mockReturnValue(new Promise(() => undefined)),
}));

vi.mock('@/lib/classes/classes-client', () => ({
  listClasses: vi.fn(),
}));

import { listClasses } from '@/lib/classes/classes-client';
import { createStudent, provisionStudentLogin } from '@/lib/students/students-client';
import { CLASS_FIXTURES } from '@/test/class-fixtures';

async function fillValidStudentForm(): Promise<void> {
  fireEvent.change(screen.getByRole('textbox', { name: 'Student code' }), {
    target: { value: 'adm-001' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Ravi' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Last name' }), {
    target: { value: 'Kumar' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Login email' }), {
    target: { value: 'ravi.student@example.com' },
  });
  await waitFor(() => {
    expect(screen.getByRole('combobox', { name: 'Class' })).not.toHaveAttribute('aria-disabled');
  });
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Class' }));
  fireEvent.click(await screen.findByRole('option', { name: '10' }));
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Section' }));
  fireEvent.click(await screen.findByRole('option', { name: /^A/ }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Roll number' }), {
    target: { value: '14' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Academic year' }), {
    target: { value: '2025-2026' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Guardian name' }), {
    target: { value: 'Avinash' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Guardian phone' }), {
    target: { value: '7893446784' },
  });
}

describe('NewStudentPage', () => {
  beforeEach(() => {
    vi.mocked(createStudent).mockReset();
    vi.mocked(provisionStudentLogin).mockReset();
    vi.mocked(listClasses).mockReset();
    vi.mocked(listClasses).mockResolvedValue(CLASS_FIXTURES);
    push.mockReset();
    sessionStorage.clear();
  });

  it('renders the create student form', async () => {
    renderWithAppProviders(<NewStudentPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Class' })).toBeRequired();
    });
    expect(screen.getByRole('textbox', { name: 'Student code' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'First name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Academic year' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Guardian name' })).toBeRequired();
    expect(screen.getByRole('textbox', { name: 'Login email' })).toBeRequired();
  });

  it('blocks a year that is not two consecutive years', async () => {
    renderWithAppProviders(<NewStudentPage />);
    await fillValidStudentForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Academic year' }), {
      target: { value: '2025' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    expect(await screen.findByText('Use an academic year such as 2025-2026')).toBeInTheDocument();
    expect(createStudent).not.toHaveBeenCalled();
  });

  it('submits the profile, sends the invite, and opens the student', async () => {
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
    vi.mocked(provisionStudentLogin).mockResolvedValue({
      userId: 'user-1',
      loginEmail: 'ravi.student@example.com',
      inviteUrl: 'http://localhost:3000/reset-password?token=abc',
      inviteExpiresAt: '2026-11-04T13:00:00.000Z',
    });

    renderWithAppProviders(<NewStudentPage />);
    await fillValidStudentForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(createStudent).toHaveBeenCalledWith({
        studentCode: 'adm-001',
        firstName: 'Ravi',
        lastName: 'Kumar',
        sectionId: 'sec-a',
        rollNumber: '14',
        academicYear: '2025-2026',
        guardianName: 'Avinash',
        guardianPhone: '7893446784',
      });
      expect(provisionStudentLogin).toHaveBeenCalledWith('student-1', 'ravi.student@example.com');
      expect(push).toHaveBeenCalledWith('/students/student-1');
    });
  });

  it('shows an API error message', async () => {
    vi.mocked(createStudent).mockRejectedValue(new Error('Student code already exists'));

    renderWithAppProviders(<NewStudentPage />);
    await fillValidStudentForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(screen.getByText('Student code already exists')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(createStudent).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<NewStudentPage />);
    await fillValidStudentForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });

  it('picks the only section automatically', async () => {
    renderWithAppProviders(<NewStudentPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Class' })).not.toHaveAttribute('aria-disabled');
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Class' }));
    fireEvent.click(await screen.findByRole('option', { name: '9' }));
    expect(screen.getByRole('combobox', { name: 'Section' })).toHaveTextContent('A');
  });

  it('tells the user to set up classes first when none exist', async () => {
    vi.mocked(listClasses).mockResolvedValue([]);
    renderWithAppProviders(<NewStudentPage />);
    expect(await screen.findByText(/No classes are set up yet/)).toBeInTheDocument();
  });
});
