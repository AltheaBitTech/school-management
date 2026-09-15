import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type ComplaintCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'FURNITURE'
  | 'IT'
  | 'CLEANING'
  | 'SECURITY'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED';

export interface ComplaintStaffSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}

export interface ComplaintUserSummary {
  id: string;
  email: string;
}

export interface ComplaintHistoryEntry {
  id: string;
  actorUserId: string;
  oldStatus?: ComplaintStatus | null;
  newStatus?: ComplaintStatus | null;
  comment?: string | null;
  createdAt: string;
  actor?: ComplaintUserSummary;
}

export interface Complaint {
  id: string;
  organizationId: string;
  complaintCode: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdByUserId: string;
  assignedToStaffId?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  createdBy?: ComplaintUserSummary;
  assignedToStaff?: ComplaintStaffSummary | null;
  history?: ComplaintHistoryEntry[];
}

interface PaginatedComplaintsResponse {
  data: Complaint[];
  meta: PaginationMeta;
}

interface ComplaintResponse {
  data: Complaint;
}

export async function listComplaints(params?: {
  page?: number;
  pageSize?: number;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  assignedToStaffId?: string;
  category?: ComplaintCategory;
  search?: string;
}): Promise<PaginatedComplaintsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.assignedToStaffId) searchParams.set('assignedToStaffId', params.assignedToStaffId);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get<PaginatedComplaintsResponse>(`/complaints${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getComplaint(id: string): Promise<Complaint> {
  const response = await apiClient.get<ComplaintResponse>(`/complaints/${id}`, { auth: true });
  return response.data;
}

export async function createComplaint(payload: {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  location?: string;
}): Promise<Complaint> {
  const response = await apiClient.post<ComplaintResponse>('/complaints', payload, { auth: true });
  return response.data;
}

export async function assignComplaint(
  id: string,
  assignedToStaffId: string,
): Promise<Complaint> {
  const response = await apiClient.post<ComplaintResponse>(
    `/complaints/${id}/assign`,
    { assignedToStaffId },
    { auth: true },
  );
  return response.data;
}

export async function changeComplaintStatus(
  id: string,
  status: ComplaintStatus,
): Promise<Complaint> {
  const response = await apiClient.post<ComplaintResponse>(
    `/complaints/${id}/status`,
    { status },
    { auth: true },
  );
  return response.data;
}

export async function addComplaintComment(id: string, comment: string): Promise<Complaint> {
  const response = await apiClient.post<ComplaintResponse>(
    `/complaints/${id}/comments`,
    { comment },
    { auth: true },
  );
  return response.data;
}

export function formatComplaintStatus(status: ComplaintStatus): string {
  return status.replace(/_/g, ' ');
}

export function formatComplaintCategory(category: ComplaintCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function formatComplaintPriority(priority: ComplaintPriority): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function getStaffDisplayName(staff?: ComplaintStaffSummary | null): string {
  if (!staff) {
    return 'Unassigned';
  }

  return staff.displayName || `${staff.firstName} ${staff.lastName}`;
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'ELECTRICAL',
  'PLUMBING',
  'FURNITURE',
  'IT',
  'CLEANING',
  'SECURITY',
  'OTHER',
];

export const COMPLAINT_PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
];

export function getNextComplaintStatus(status: ComplaintStatus): ComplaintStatus | null {
  switch (status) {
    case 'OPEN':
      return 'ASSIGNED';
    case 'ASSIGNED':
      return 'IN_PROGRESS';
    case 'IN_PROGRESS':
      return 'COMPLETED';
    case 'COMPLETED':
      return 'CLOSED';
    default:
      return null;
  }
}
