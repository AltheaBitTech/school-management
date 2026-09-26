import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';
import type { VisitorStatus } from '@/lib/visitors/visitors-client';

export interface VisitorReportRecord {
  id: string;
  visitorCode: string;
  name: string;
  mobile: string;
  purpose: string;
  hostStaffId: string;
  hostName: string;
  departmentId: string | null;
  departmentName: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  status: VisitorStatus;
  visitDate: string;
}

export interface VisitorReport {
  data: VisitorReportRecord[];
  meta: PaginationMeta;
  summary: {
    fromDate: string | null;
    toDate: string | null;
    timezone: string;
    dateFilterApplied: boolean;
    scope: 'none' | 'single_day' | 'date_range';
    totalVisits: number;
    checkedInVisits: number;
    checkedOutVisits: number;
    activeOnCampus: number;
    checkedInOnSelectedDay: number | null;
  };
  breakdown: {
    byStatus: Array<{ status: VisitorStatus; count: number }>;
    byPurpose: Array<{ purpose: string; count: number }>;
    byHost: Array<{ staffId: string; staffName: string; total: number; active: number }>;
    byDepartment: Array<{
      departmentId: string | null;
      departmentName: string;
      total: number;
      active: number;
    }>;
  };
}

export async function getVisitorsReport(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: VisitorStatus;
  hostStaffId?: string;
  departmentId?: string;
  purpose?: string;
  page?: number;
  pageSize?: number;
}): Promise<VisitorReport> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.status) query.set('status', params.status);
  if (params?.hostStaffId) query.set('hostStaffId', params.hostStaffId);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.purpose) query.set('purpose', params.purpose);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString();
  return apiClient.get<VisitorReport>(
    `/reports/visitors${suffix ? `?${suffix}` : ''}`,
    { auth: true },
  );
}
