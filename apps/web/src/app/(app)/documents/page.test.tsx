import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DocumentsPage from '@/app/(app)/documents/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/documents/documents-client', () => ({
  listDocuments: vi.fn(),
  formatDocumentType: () => 'Bonafide Certificate',
  formatDocumentDateTime: () => 'Sep 17, 2026, 10:00:00 AM',
  getDocumentStudentDisplayName: (student: { firstName: string; lastName: string }) =>
    `${student.firstName} ${student.lastName}`,
}));

import { listDocuments } from '@/lib/documents/documents-client';

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.mocked(listDocuments).mockReset();
  });

  it('shows a loading state while documents are being fetched', () => {
    vi.mocked(listDocuments).mockReturnValue(new Promise(() => undefined));
    render(<DocumentsPage />);
    expect(screen.getByLabelText('Loading documents')).toBeInTheDocument();
  });

  it('renders generated document rows', async () => {
    vi.mocked(listDocuments).mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          documentType: 'BONAFIDE_CERTIFICATE',
          ownerType: 'STUDENT',
          ownerId: 'student-1',
          templateId: 'template-1',
          templateVersion: 1,
          status: 'GENERATED',
          generatedByUserId: 'user-1',
          createdAt: '2026-09-17T10:00:00.000Z',
          student: {
            id: 'student-1',
            studentCode: 'adm-001',
            firstName: 'Bonafide',
            lastName: 'Student',
            className: 'Grade 8-A',
          },
          generatedBy: { id: 'user-1', email: 'admin@example.com' },
          file: {
            id: 'file-1',
            originalName: 'bonafide-adm-001.pdf',
            mimeType: 'application/pdf',
            size: 1024,
          },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bonafide Student (adm-001)')).toBeInTheDocument();
    });
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('shows forbidden state when document list is denied', async () => {
    vi.mocked(listDocuments).mockRejectedValue(new ApiError('Forbidden', 403));

    render(<DocumentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });
});
