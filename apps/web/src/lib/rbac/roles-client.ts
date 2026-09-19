import { apiClient } from '@/lib/api/client';

export interface OrganizationRole {
  id: string;
  code: string;
  name: string;
}

interface RoleListResponse {
  data: OrganizationRole[];
}

export async function listOrganizationRoles(): Promise<OrganizationRole[]> {
  const response = await apiClient.get<RoleListResponse>('/roles', { auth: true });
  return response.data;
}
