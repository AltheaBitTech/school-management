import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApprovalDetailPage from '@/app/(app)/approvals/[id]/page';
import { ApiError } from '@/lib/api/client';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'approval-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/approvals/approvals-client', () => ({
  getApprovalRequest: vi.fn(),
  getApprovalHistory: vi.fn(),
  approveApprovalRequest: vi.fn(),
  rejectApprovalRequest: vi.fn(),
  formatApprovalStatus: () => 'Pending',
  formatApprovalEntityType: () => 'Leave',
  formatApprovalAction: (action: string) => action,
}));

import {
  approveApprovalRequest,
  getApprovalHistory,
  getApprovalRequest,
  rejectApprovalRequest,
} from '@/lib/approvals/approvals-client';

describe('ApprovalDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getApprovalRequest).mockReset();
    vi.mocked(getApprovalHistory).mockReset();
    vi.mocked(approveApprovalRequest).mockReset();
    vi.mocked(rejectApprovalRequest).mockReset();
  });

  it('renders approval detail and history', async () => {
    vi.mocked(getApprovalRequest).mockResolvedValue({
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
    });
    vi.mocked(getApprovalHistory).mockResolvedValue([
      {
        id: 'action-1',
        level: 0,
        action: 'SUBMITTED',
        actorUserId: 'user-1',
        createdAt: '2026-09-17T10:00:00.000Z',
      },
    ]);

    render(<ApprovalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('leave-1')).toBeInTheDocument();
      expect(screen.getByText(/SUBMITTED/)).toBeInTheDocument();
    });
  });

  it('approves a pending request', async () => {
    vi.mocked(getApprovalRequest)
      .mockResolvedValueOnce({
        id: 'approval-1',
        workflowId: 'workflow-1',
        entityType: 'LEAVE',
        entityId: 'leave-1',
        status: 'PENDING',
        currentLevel: 1,
        submittedById: 'user-1',
        createdAt: '2026-09-17T10:00:00.000Z',
        updatedAt: '2026-09-17T10:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'approval-1',
        workflowId: 'workflow-1',
        entityType: 'LEAVE',
        entityId: 'leave-1',
        status: 'APPROVED',
        currentLevel: 1,
        submittedById: 'user-1',
        createdAt: '2026-09-17T10:00:00.000Z',
        updatedAt: '2026-09-17T10:00:00.000Z',
      });
    vi.mocked(getApprovalHistory).mockResolvedValue([]);
    vi.mocked(approveApprovalRequest).mockResolvedValue({
      id: 'approval-1',
      workflowId: 'workflow-1',
      entityType: 'LEAVE',
      entityId: 'leave-1',
      status: 'APPROVED',
      currentLevel: 1,
      submittedById: 'user-1',
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
    });

    render(<ApprovalDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(approveApprovalRequest).toHaveBeenCalledWith('approval-1', undefined);
    });
  });

  it('shows not found on 404', async () => {
    vi.mocked(getApprovalRequest).mockRejectedValue(new ApiError('Not found', 404));
    vi.mocked(getApprovalHistory).mockRejectedValue(new ApiError('Not found', 404));

    render(<ApprovalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Approval request not found.')).toBeInTheDocument();
    });
  });
});
