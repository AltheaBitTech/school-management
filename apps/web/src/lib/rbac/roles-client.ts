import { apiClient } from '@/lib/api/client';

export interface OrganizationRole {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  isCustomized?: boolean;
  isLocked?: boolean;
  permissionCount?: number;
  userCount?: number;
}

export interface OrganizationRoleDetail extends OrganizationRole {
  permissions: string[];
}

export interface PermissionCatalogEntry {
  code: string;
  description: string;
}

export interface PermissionCatalogGroup {
  key: string;
  label: string;
  permissions: PermissionCatalogEntry[];
}

export interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

interface DataResponse<T> {
  data: T;
}

export async function listOrganizationRoles(): Promise<OrganizationRole[]> {
  const response = await apiClient.get<DataResponse<OrganizationRole[]>>('/roles', { auth: true });
  return response.data;
}

export async function getOrganizationRole(roleId: string): Promise<OrganizationRoleDetail> {
  const response = await apiClient.get<DataResponse<OrganizationRoleDetail>>(`/roles/${roleId}`, {
    auth: true,
  });
  return response.data;
}

export async function getPermissionCatalog(): Promise<PermissionCatalogGroup[]> {
  const response = await apiClient.get<DataResponse<PermissionCatalogGroup[]>>(
    '/roles/permissions-catalog',
    { auth: true },
  );
  return response.data;
}

export async function createOrganizationRole(
  input: Required<Pick<RoleInput, 'name' | 'permissions'>> & Pick<RoleInput, 'description'>,
): Promise<OrganizationRoleDetail> {
  const response = await apiClient.post<DataResponse<OrganizationRoleDetail>>('/roles', input);
  return response.data;
}

export async function updateOrganizationRole(
  roleId: string,
  input: RoleInput,
): Promise<OrganizationRoleDetail> {
  const response = await apiClient.patch<DataResponse<OrganizationRoleDetail>>(
    `/roles/${roleId}`,
    input,
  );
  return response.data;
}

export async function resetOrganizationRole(roleId: string): Promise<OrganizationRoleDetail> {
  const response = await apiClient.post<DataResponse<OrganizationRoleDetail>>(
    `/roles/${roleId}/reset`,
  );
  return response.data;
}

export async function deleteOrganizationRole(roleId: string): Promise<void> {
  await apiClient.delete<void>(`/roles/${roleId}`);
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  await apiClient.post<void>(`/rbac/users/${userId}/roles`, { roleId }, { auth: true });
}
