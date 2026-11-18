import { apiClient } from '@/lib/api/client';

export interface PlatformRecentOrganization {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  planCode: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
}

export interface PlatformAnalytics {
  organizationsByStatus: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
  pendingRegistrations: number;
  totalStudents: number;
  totalStaff: number;
  newOrganizationsLast30Days: number;
  trialsEndingSoon: number;
  recentOrganizations: PlatformRecentOrganization[];
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const response = await apiClient.get<{ data: PlatformAnalytics }>('/platform/analytics', { auth: true });
  return response.data;
}
