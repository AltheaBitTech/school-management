import { apiClient } from '@/lib/api/client';
import type { LeaveRequestStatus } from '@/lib/leave/leave-client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface LeaveReportRecord {
  id: string;
  staffId: string;
  staffName: string;
  employeeCode: string;
  departmentId: string | null;
  departmentName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: LeaveRequestStatus;
  approvalRequestId: string | null;
  approvalStatus: string | null;
  submittedAt: string;
  decidedAt: string | null;
}

export interface LeaveReportDepartmentRow {
  departmentId: string | null;
  departmentName: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  leaveDays: number;
}

export interface LeaveReportBalanceRow {
  id: string;
  staffId: string;
  leaveTypeId: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: number;
  usedAmount: number;
  pendingAmount: number;
  availableAmount: number;
}

export interface LeaveReport {
  data: LeaveReportRecord[];
  meta: PaginationMeta;
  summary: {
    fromDate: string | null;
    toDate: string | null;
    timezone: string;
    dateFilterApplied: boolean;
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    employeesOnLeave: number;
    leaveDaysApproved: number;
  };
  breakdown: {
    byDepartment: LeaveReportDepartmentRow[];
  };
  balances: LeaveReportBalanceRow[] | null;
}

export async function getLeaveReport(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  staffId?: string;
  leaveTypeId?: string;
  status?: LeaveRequestStatus;
  page?: number;
  pageSize?: number;
}): Promise<LeaveReport> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.staffId) query.set('staffId', params.staffId);
  if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<LeaveReport>(`/reports/leave${suffix}`, { auth: true });
}
