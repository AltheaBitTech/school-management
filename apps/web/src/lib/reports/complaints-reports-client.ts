import { apiClient } from '@/lib/api/client';
import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@/lib/complaints/complaints-client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface ComplaintReportRecord {
  id: string;
  complaintCode: string;
  title: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  departmentId: string | null;
  departmentName: string | null;
  assigneeStaffId: string | null;
  assigneeName: string | null;
  createdAt: string;
  ageDays: number;
  closedAt: string | null;
}

export interface ComplaintReport {
  data: ComplaintReportRecord[];
  meta: PaginationMeta;
  summary: {
    fromDate: string | null;
    toDate: string | null;
    timezone: string;
    dateFilterApplied: boolean;
    totalComplaints: number;
    openComplaints: number;
    assignedComplaints: number;
    inProgressComplaints: number;
    completedComplaints: number;
    closedComplaints: number;
    highPriorityComplaints: number;
  };
  breakdown: {
    byStatus: Array<{ status: ComplaintStatus; count: number }>;
    byPriority: Array<{ priority: ComplaintPriority; count: number }>;
    byCategory: Array<{ category: ComplaintCategory; count: number }>;
    byDepartment: Array<{
      departmentId: string | null;
      departmentName: string;
      total: number;
      open: number;
      completed: number;
    }>;
    byAssignee: Array<{
      staffId: string;
      staffName: string;
      total: number;
      open: number;
      completed: number;
    }>;
  };
  ageing: Array<{ key: string; label: string; count: number }>;
}

export async function getComplaintsReport(params?: {
  startDate?: string;
  endDate?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
  departmentId?: string;
  assigneeId?: string;
  openOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ComplaintReport> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.category) query.set('category', params.category);
  if (params?.departmentId) query.set('departmentId', params.departmentId);
  if (params?.assigneeId) query.set('assigneeId', params.assigneeId);
  if (params?.openOnly) query.set('openOnly', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString();
  return apiClient.get<ComplaintReport>(
    `/reports/complaints${suffix ? `?${suffix}` : ''}`,
    { auth: true },
  );
}
