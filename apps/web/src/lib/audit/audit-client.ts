import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface AuditLogRow {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogListResponse {
  data: AuditLogRow[];
  meta: PaginationMeta;
}

export async function listAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AuditLogListResponse> {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.pageSize) search.set('pageSize', String(params.pageSize));
  if (params?.action) search.set('action', params.action);
  if (params?.entityType) search.set('entityType', params.entityType);
  if (params?.entityId) search.set('entityId', params.entityId);
  if (params?.fromDate) search.set('fromDate', params.fromDate);
  if (params?.toDate) search.set('toDate', params.toDate);

  const qs = search.toString();
  return apiClient.get<AuditLogListResponse>(`/audit-logs${qs ? `?${qs}` : ''}`, { auth: true });
}
