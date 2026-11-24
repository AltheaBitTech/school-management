import { apiClient } from '@/lib/api/client';
import type { AttendanceStatus } from '@/lib/attendance/attendance-client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface AttendanceReportRecord {
  id: string;
  attendanceDate: string;
  staffId: string;
  staffName: string;
  employeeCode: string;
  departmentId: string | null;
  departmentName: string | null;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface AttendanceReportDepartmentRow {
  departmentId: string | null;
  departmentName: string;
  total: number;
  present: number;
  absent: number;
  attendancePercentage: number | null;
}

export interface AttendanceReport {
  data: AttendanceReportRecord[];
  meta: PaginationMeta;
  summary: {
    scope: 'single_day' | 'date_range';
    fromDate: string;
    toDate: string;
    timezone: string;
    activeStaff: number | null;
    totalMarked: number;
    present: number;
    absent: number;
    unmarked: number | null;
    attendancePercentage: number | null;
    byStatus: Record<string, number>;
  };
  breakdown: {
    byDepartment: AttendanceReportDepartmentRow[];
  };
}

export async function getAttendanceReport(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  staffId?: string;
  status?: AttendanceStatus;
  page?: number;
  pageSize?: number;
}): Promise<AttendanceReport> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.staffId) query.set('staffId', params.staffId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AttendanceReport>(`/reports/attendance${suffix}`, { auth: true });
}
