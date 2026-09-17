import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GenerateDocumentPage from '@/app/(app)/documents/generate/page';
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
  listStudents: vi.fn(),
  getStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
}));

vi.mock('@/lib/documents/documents-client', () => ({
  generateBonafideCertificate: vi.fn(),
}));

import { generateBonafideCertificate } from '@/lib/documents/documents-client';
import { listStudents } from '@/lib/students/students-client';

describe('GenerateDocumentPage', () => {
  beforeEach(() => {
    vi.mocked(listStudents).mockReset();
    vi.mocked(generateBonafideCertificate).mockReset();
    push.mockReset();
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
    vi.mocked(generateBonafideCertificate).mockResolvedValue({
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

    render(<GenerateDocumentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bonafide Student \(adm-001\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate bonafide certificate/i }));

    await waitFor(() => {
      expect(generateBonafideCertificate).toHaveBeenCalledWith('student-1');
      expect(push).toHaveBeenCalledWith('/documents/doc-1');
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
    vi.mocked(generateBonafideCertificate).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<GenerateDocumentPage />);

    await waitFor(() => {
      expect(screen.getByText(/Bonafide Student \(adm-001\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate bonafide certificate/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });
});
