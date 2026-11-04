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

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  await apiClient.post<void>(`/rbac/users/${userId}/roles`, { roleId }, { auth: true });
}
