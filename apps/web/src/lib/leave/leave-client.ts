import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type LeaveRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type HalfDayPart = 'FIRST_HALF' | 'SECOND_HALF';

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  tracksBalance: boolean;
  allowsHalfDay: boolean;
  requiresReason: boolean;
  requiresAttachment: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  organizationId: string;
  staffId: string;
  leaveTypeId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  allocatedAmount: number;
  usedAmount: number;
  pendingAmount: number;
  adjustmentAmount: number;
  availableAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  organizationId: string;
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  duration: number;
  halfDayPart?: HalfDayPart | null;
  reason?: string | null;
  status: LeaveRequestStatus;
  submittedAt: string;
  decidedAt?: string | null;
  decidedByUserId?: string | null;
  staff?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName?: string | null;
  };
  leaveType?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginatedLeaveTypesResponse {
  data: LeaveType[];
  meta: PaginationMeta;
}

interface PaginatedLeaveBalancesResponse {
  data: LeaveBalance[];
  meta: PaginationMeta;
}

interface PaginatedLeaveRequestsResponse {
  data: LeaveRequest[];
  meta: PaginationMeta;
}

interface LeaveTypeResponse {
  data: LeaveType;
}

interface LeaveRequestResponse {
  data: LeaveRequest;
}

export async function listLeaveTypes(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedLeaveTypesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return apiClient.get<PaginatedLeaveTypesResponse>(`/leave/types${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function createLeaveType(input: {
  name: string;
  code: string;
  description?: string;
  tracksBalance?: boolean;
  allowsHalfDay?: boolean;
  requiresReason?: boolean;
}): Promise<LeaveType> {
  const response = await apiClient.post<LeaveTypeResponse>('/leave/types', input);
  return response.data;
}

export async function updateLeaveType(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    active: boolean;
  }>,
): Promise<LeaveType> {
  const response = await apiClient.patch<LeaveTypeResponse>(`/leave/types/${id}`, input);
  return response.data;
}

export async function listLeaveBalances(params?: {
  page?: number;
  pageSize?: number;
  staffId?: string;
  leaveTypeId?: string;
}): Promise<PaginatedLeaveBalancesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.staffId) searchParams.set('staffId', params.staffId);
  if (params?.leaveTypeId) searchParams.set('leaveTypeId', params.leaveTypeId);
  const query = searchParams.toString();
  return apiClient.get<PaginatedLeaveBalancesResponse>(
    `/leave/balances${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function createLeaveBalance(input: {
  staffId: string;
  leaveTypeId: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: number;
  openingBalance?: number;
}): Promise<LeaveBalance> {
  const response = await apiClient.post<{ data: LeaveBalance }>('/leave/balances', input);
  return response.data;
}

export async function listLeaveRequests(params?: {
  page?: number;
  pageSize?: number;
  staffId?: string;
  status?: LeaveRequestStatus;
}): Promise<PaginatedLeaveRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.staffId) searchParams.set('staffId', params.staffId);
  if (params?.status) searchParams.set('status', params.status);
  const query = searchParams.toString();
  return apiClient.get<PaginatedLeaveRequestsResponse>(
    `/leave/requests${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function createLeaveRequest(input: {
  staffId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDayPart?: HalfDayPart;
  reason?: string;
}): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequestResponse>('/leave/requests', input);
  return response.data;
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequestResponse>(`/leave/requests/${id}/approve`);
  return response.data;
}

export async function rejectLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await apiClient.post<LeaveRequestResponse>(`/leave/requests/${id}/reject`);
  return response.data;
}

export function formatLeaveStatus(status: LeaveRequestStatus): string {
  return status.replace(/_/g, ' ');
}

export function getStaffDisplayNameFromLeave(staff?: LeaveRequest['staff']): string {
  if (!staff) return 'Unknown staff';
  return staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
}
