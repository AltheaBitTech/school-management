import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type ApprovalEntityType = 'LEAVE';
export type ApprovalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalActionType = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  status: ApprovalRequestStatus;
  currentLevel: number;
  submittedById: string;
  completedAt?: string | null;
  currentLevelName?: string | null;
  currentApproverSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  id: string;
  level: number;
  action: ApprovalActionType;
  actorUserId: string;
  comment?: string | null;
  createdAt: string;
}

interface PaginatedApprovalsResponse {
  data: ApprovalRequest[];
  meta: PaginationMeta;
}

interface ApprovalResponse {
  data: ApprovalRequest;
}

interface ApprovalHistoryResponse {
  data: ApprovalAction[];
}

export async function listApprovalRequests(params?: {
  page?: number;
  pageSize?: number;
  entityType?: ApprovalEntityType;
  status?: ApprovalRequestStatus | '';
}): Promise<PaginatedApprovalsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.entityType) searchParams.set('entityType', params.entityType);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get<PaginatedApprovalsResponse>(`/approvals${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getApprovalRequest(id: string): Promise<ApprovalRequest> {
  const response = await apiClient.get<ApprovalResponse>(`/approvals/${id}`, { auth: true });
  return response.data;
}

export async function getApprovalHistory(id: string): Promise<ApprovalAction[]> {
  const response = await apiClient.get<ApprovalHistoryResponse>(`/approvals/${id}/history`, {
    auth: true,
  });
  return response.data;
}

export async function approveApprovalRequest(
  id: string,
  comment?: string,
): Promise<ApprovalRequest> {
  const response = await apiClient.post<ApprovalResponse>(
    `/approvals/${id}/approve`,
    comment ? { comment } : {},
    { auth: true },
  );
  return response.data;
}

export async function rejectApprovalRequest(
  id: string,
  comment?: string,
): Promise<ApprovalRequest> {
  const response = await apiClient.post<ApprovalResponse>(
    `/approvals/${id}/reject`,
    comment ? { comment } : {},
    { auth: true },
  );
  return response.data;
}

export function formatApprovalStatus(status: ApprovalRequestStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function formatApprovalEntityType(entityType: ApprovalEntityType): string {
  switch (entityType) {
    case 'LEAVE':
      return 'Leave';
    default:
      return entityType;
  }
}

export function formatApprovalAction(action: ApprovalActionType): string {
  switch (action) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return action;
  }
}

export const APPROVAL_STATUSES: ApprovalRequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];
