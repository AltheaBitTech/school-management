import { apiClient } from '@/lib/api/client';
import type { EventStatus, EventType, Venue } from '@/lib/events/events-client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface EventReportRow {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  startAt: string;
  endAt: string;
  venue: Pick<Venue, 'id' | 'name'>;
}

export interface EventReport {
  data: EventReportRow[];
  meta: PaginationMeta;
  summary: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export async function getEventReport(params?: {
  fromDate?: string;
  toDate?: string;
  type?: EventType;
  status?: EventStatus;
  venueId?: string;
  page?: number;
  pageSize?: number;
}): Promise<EventReport> {
  const query = new URLSearchParams();
  if (params?.fromDate) query.set('fromDate', params.fromDate);
  if (params?.toDate) query.set('toDate', params.toDate);
  if (params?.type) query.set('type', params.type);
  if (params?.status) query.set('status', params.status);
  if (params?.venueId) query.set('venueId', params.venueId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<EventReport>(`/reports/events${suffix}`, { auth: true });
}
