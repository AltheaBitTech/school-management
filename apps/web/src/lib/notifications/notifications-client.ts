import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';
export type NotificationEventKey = 'leave.approved' | 'leave.rejected';

export interface Notification {
  id: string;
  channel: NotificationChannel;
  eventKey: NotificationEventKey;
  title: string;
  body: string;
  status: NotificationStatus;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: PaginationMeta;
}

interface NotificationResponse {
  data: Notification;
}

export async function listNotifications(params?: {
  page?: number;
  pageSize?: number;
}): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  return apiClient.get<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await apiClient.post<NotificationResponse>(`/notifications/${id}/read`);
  return response.data;
}

export function formatNotificationCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString();
}

export function countUnreadNotifications(notifications: Notification[]): number {
  return notifications.filter((notification) => !notification.readAt).length;
}

export function formatUnreadBadgeCount(unreadCount: number): string {
  return unreadCount > 9 ? '9+' : String(unreadCount);
}
