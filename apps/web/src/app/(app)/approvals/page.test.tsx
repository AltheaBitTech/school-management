import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ApprovalsPage from '@/app/(app)/approvals/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/approvals/approvals-client', () => ({
  listApprovalRequests: vi.fn(),
  formatApprovalStatus: (status: string) => status,
  formatApprovalEntityType: () => 'Leave',
  APPROVAL_STATUSES: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
}));

import { listApprovalRequests } from '@/lib/approvals/approvals-client';

describe('ApprovalsPage', () => {
  beforeEach(() => {
    vi.mocked(listApprovalRequests).mockReset();
  });

  it('shows a loading state while approvals are being fetched', () => {
    vi.mocked(listApprovalRequests).mockReturnValue(new Promise(() => undefined));
    render(<ApprovalsPage />);
    expect(screen.getByLabelText('Loading approvals')).toBeInTheDocument();
  });

  it('renders approval rows', async () => {
    vi.mocked(listApprovalRequests).mockResolvedValue({
      data: [
        {
          id: 'approval-1',
          workflowId: 'workflow-1',
          entityType: 'LEAVE',
          entityId: 'leave-1',
          status: 'PENDING',
          currentLevel: 1,
          submittedById: 'user-1',
          currentLevelName: 'Level 1',
          currentApproverSummary: 'Role: School Admin',
          createdAt: '2026-09-17T10:00:00.000Z',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Leave')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });
  });

  it('shows a forbidden state on 403 responses', async () => {
    vi.mocked(listApprovalRequests).mockRejectedValue(new ApiError('Forbidden', 403));
    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });
  });
});
