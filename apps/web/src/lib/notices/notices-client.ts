import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type NoticeStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export type NoticeAudienceType = 'ENTIRE_SCHOOL' | 'STAFF' | 'DEPARTMENT';

export interface NoticeAudienceInput {
  audienceType: NoticeAudienceType;
  departmentId?: string;
}

export interface NoticeDepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface NoticeAudience {
  id: string;
  audienceType: NoticeAudienceType;
  departmentId?: string | null;
  department?: NoticeDepartmentSummary | null;
}

export interface NoticeUserSummary {
  id: string;
  email: string;
}

export interface NoticeReadState {
  readAt: string;
  acknowledgedAt?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  status: NoticeStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: NoticeUserSummary;
  audiences: NoticeAudience[];
  readState?: NoticeReadState | null;
}

interface PaginatedNoticesResponse {
  data: Notice[];
  meta: PaginationMeta;
}

interface NoticeResponse {
  data: Notice;
}

export async function listNotices(params?: {
  page?: number;
  pageSize?: number;
  status?: NoticeStatus;
  audienceType?: NoticeAudienceType;
  departmentId?: string;
  search?: string;
}): Promise<PaginatedNoticesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.audienceType) searchParams.set('audienceType', params.audienceType);
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get<PaginatedNoticesResponse>(`/notices${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getNotice(id: string): Promise<Notice> {
  const response = await apiClient.get<NoticeResponse>(`/notices/${id}`, { auth: true });
  return response.data;
}

export async function createNotice(payload: {
  title: string;
  content: string;
  audiences: NoticeAudienceInput[];
}): Promise<Notice> {
  const response = await apiClient.post<NoticeResponse>('/notices', payload, { auth: true });
  return response.data;
}

export async function updateNotice(
  id: string,
  payload: {
    title?: string;
    content?: string;
    audiences?: NoticeAudienceInput[];
    scheduledAt?: string | null;
  },
): Promise<Notice> {
  const response = await apiClient.patch<NoticeResponse>(`/notices/${id}`, payload, { auth: true });
  return response.data;
}

export async function publishNotice(id: string): Promise<Notice> {
  const response = await apiClient.post<NoticeResponse>(`/notices/${id}/publish`, {}, { auth: true });
  return response.data;
}

export async function archiveNotice(id: string): Promise<Notice> {
  const response = await apiClient.post<NoticeResponse>(`/notices/${id}/archive`, {}, { auth: true });
  return response.data;
}

export async function markNoticeRead(id: string): Promise<Notice> {
  const response = await apiClient.post<NoticeResponse>(`/notices/${id}/read`, {}, { auth: true });
  return response.data;
}

export async function acknowledgeNotice(id: string): Promise<Notice> {
  const response = await apiClient.post<NoticeResponse>(
    `/notices/${id}/acknowledge`,
    {},
    { auth: true },
  );
  return response.data;
}

export function formatNoticeStatus(status: NoticeStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatAudienceType(type: NoticeAudienceType): string {
  switch (type) {
    case 'ENTIRE_SCHOOL':
      return 'Entire school';
    case 'STAFF':
      return 'All staff';
    case 'DEPARTMENT':
      return 'Department';
    default:
      return type;
  }
}

export function formatAudienceLabel(audience: NoticeAudience): string {
  if (audience.audienceType === 'DEPARTMENT' && audience.department) {
    return audience.department.name;
  }

  return formatAudienceType(audience.audienceType);
}

export const NOTICE_STATUSES: NoticeStatus[] = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];

export const NOTICE_AUDIENCE_TYPES: NoticeAudienceType[] = [
  'ENTIRE_SCHOOL',
  'STAFF',
  'DEPARTMENT',
];

export function isEditableNoticeStatus(status: NoticeStatus): boolean {
  return status === 'DRAFT' || status === 'SCHEDULED';
}
