import { apiClient } from '@/lib/api/client';
import type { LeaveRequest } from '@/lib/leave/leave-client';

export interface StaffSelfProfile {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  departmentName: string | null;
}

export interface StaffSelfTodayAttendance {
  date: string;
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface StaffSelfLeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeName: string;
  availableAmount: number;
  usedAmount: number;
  pendingAmount: number;
}

export interface StaffSelfLeaveRequestSummary {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: string;
  submittedAt: string;
}

export interface StaffSelfDashboard {
  staff: StaffSelfProfile;
  localDate: string;
  todayAttendance: StaffSelfTodayAttendance;
  leaveBalances: StaffSelfLeaveBalanceSummary[];
  pendingLeaveRequestCount: number;
  recentLeaveRequests: StaffSelfLeaveRequestSummary[];
  unreadNotificationCount: number;
}

export interface StaffSelfAttendanceRecord {
  id: string;
  attendanceDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  remarks: string | null;
}

export interface StaffSelfLeaveBalance {
  id: string;
  leaveTypeId: string;
  periodStart: string;
  periodEnd: string;
  availableAmount: number;
  usedAmount: number;
  pendingAmount: number;
  allocatedAmount: number;
}

export interface StaffSelfLeaveType {
  id: string;
  name: string;
  code: string;
  allowsHalfDay: boolean;
  requiresReason: boolean;
  active: boolean;
}

export interface StaffSelfLeaveRequestDetail {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string | null;
  status: string;
  submittedAt: string;
  rejectionReason?: string | null;
  approval: {
    id: string;
    status: string;
    currentLevel: number;
    currentLevelName: string | null;
  } | null;
  approvalHistory: Array<{
    id: string;
    action: string;
    comment: string | null;
    createdAt: string;
  }>;
}

interface DashboardResponse {
  data: StaffSelfDashboard;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

interface DetailResponse<T> {
  data: T;
}

export function formatStaffDisplayName(staff: StaffSelfProfile): string {
  return staff.displayName || `${staff.firstName} ${staff.lastName}`;
}

export async function getStaffSelfDashboard(): Promise<StaffSelfDashboard> {
  const response = await apiClient.get<DashboardResponse>('/me/dashboard', { auth: true });
  return response.data;
}

function buildPaginationQuery(params?: { page?: number; pageSize?: number }): string {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function listStaffSelfAttendance(params?: {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<PaginatedResponse<StaffSelfAttendanceRecord>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  const query = searchParams.toString();
  return apiClient.get<PaginatedResponse<StaffSelfAttendanceRecord>>(
    `/me/attendance${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function listStaffSelfLeaveBalances(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<StaffSelfLeaveBalance>> {
  return apiClient.get<PaginatedResponse<StaffSelfLeaveBalance>>(
    `/me/leave/balances${buildPaginationQuery(params)}`,
    { auth: true },
  );
}

export async function listStaffSelfLeaveRequests(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<LeaveRequest>> {
  return apiClient.get<PaginatedResponse<LeaveRequest>>(
    `/me/leave/requests${buildPaginationQuery(params)}`,
    { auth: true },
  );
}

export async function listStaffSelfLeaveTypes(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<StaffSelfLeaveType>> {
  return apiClient.get<PaginatedResponse<StaffSelfLeaveType>>(
    `/me/leave/types${buildPaginationQuery(params)}`,
    { auth: true },
  );
}

export async function getStaffSelfLeaveRequest(id: string): Promise<StaffSelfLeaveRequestDetail> {
  const response = await apiClient.get<DetailResponse<StaffSelfLeaveRequestDetail>>(
    `/me/leave/requests/${id}`,
    { auth: true },
  );
  return response.data;
}

export async function createStaffSelfLeaveRequest(input: {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveRequest> {
  const response = await apiClient.post<DetailResponse<LeaveRequest>>('/me/leave/requests', input, {
    auth: true,
  });
  return response.data;
}

export function formatAttendanceTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
