import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GenerateDocumentPage from '@/app/(app)/documents/generate/page';
import { ApiError } from '@/lib/api/client';
import { renderWithAppProviders } from '@/test/render-app';

let currentSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/students/students-client', () => ({
  listStudents: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
}));

vi.mock('@/lib/staff/staff-client', () => ({
  listStaff: vi.fn(),
  getStaffDisplayName: (staff: { firstName: string; lastName: string }) =>
    `${staff.firstName} ${staff.lastName}`,
}));

vi.mock('@/lib/visitors/visitors-client', () => ({
  listVisitors: vi.fn(),
}));

vi.mock('@/lib/documents/documents-client', () => ({
  DOCUMENT_TEMPLATE_OPTIONS: [
    {
      type: 'BONAFIDE_CERTIFICATE',
      name: 'Bonafide Certificate',
      description: 'Certifies student enrollment for official use.',
      ownerType: 'STUDENT',
    },
    {
      type: 'STUDENT_ID_CARD',
      name: 'Student ID Card',
      description: 'Printable student identification card.',
      ownerType: 'STUDENT',
    },
  ],
  generateDocument: vi.fn(),
  downloadGeneratedDocument: vi.fn(),
}));

import { generateDocument } from '@/lib/documents/documents-client';
import { listStudents } from '@/lib/students/students-client';

describe('GenerateDocumentPage', () => {
  beforeEach(() => {
    vi.mocked(listStudents).mockReset();
    vi.mocked(generateDocument).mockReset();
  });

  it('loads students and generates a bonafide certificate', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Bonafide',
          lastName: 'Student',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
          className: 'Grade 8-A',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(generateDocument).mockResolvedValue({
      id: 'doc-1',
      documentType: 'BONAFIDE_CERTIFICATE',
      ownerType: 'STUDENT',
      ownerId: 'student-1',
      templateId: 'template-1',
      templateVersion: 1,
      status: 'GENERATED',
      generatedByUserId: 'user-1',
      createdAt: '2026-09-17T10:00:00.000Z',
    });

    renderWithAppProviders(<GenerateDocumentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bonafide Student \(adm-001\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));

    await waitFor(() => {
      expect(generateDocument).toHaveBeenCalledWith({
        documentType: 'BONAFIDE_CERTIFICATE',
        ownerId: 'student-1',
        purpose: undefined,
        conduct: undefined,
        salaryAmount: undefined,
        salaryMonth: undefined,
        relievingReason: undefined,
        leavingDate: undefined,
      });
      expect(screen.getByText(/Document generated successfully/i)).toBeInTheDocument();
    });
  });

  it('shows forbidden state when generation is denied', async () => {
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Bonafide',
          lastName: 'Student',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(generateDocument).mockRejectedValue(new ApiError('Forbidden', 403));

    renderWithAppProviders(<GenerateDocumentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bonafide Student \(adm-001\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  it('preselects the student and document type from the URL', async () => {
    currentSearch = 'studentId=student-1&type=STUDENT_ID_CARD';
    vi.mocked(listStudents).mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentCode: 'adm-001',
          firstName: 'Card',
          lastName: 'Student',
          status: 'ACTIVE',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.mocked(generateDocument).mockResolvedValue({
      id: 'doc-2',
      documentType: 'STUDENT_ID_CARD',
      ownerType: 'STUDENT',
      ownerId: 'student-1',
      templateId: 'template-2',
      templateVersion: 1,
      status: 'GENERATED',
      generatedByUserId: 'user-1',
      createdAt: '2026-09-17T10:00:00.000Z',
    });

    renderWithAppProviders(<GenerateDocumentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Card Student \(adm-001\)/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));

    await waitFor(() => {
      expect(generateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: 'STUDENT_ID_CARD', ownerId: 'student-1' }),
      );
    });
    currentSearch = '';
  });
});
