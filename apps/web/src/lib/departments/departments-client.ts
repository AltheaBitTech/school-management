import { apiClient } from '@/lib/api/client';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

interface PaginatedDepartmentsResponse {
  data: Department[];
  meta: PaginationMeta;
}

interface DepartmentResponse {
  data: Department;
}

export async function listDepartments(params?: {
  page?: number;
  pageSize?: number;
  status?: Department['status'];
}): Promise<PaginatedDepartmentsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get<PaginatedDepartmentsResponse>(
    `/departments${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function createDepartment(input: {
  name: string;
  code: string;
}): Promise<Department> {
  const response = await apiClient.post<DepartmentResponse>('/departments', input);
  return response.data;
}

export async function updateDepartment(
  id: string,
  input: { name: string },
): Promise<Department> {
  const response = await apiClient.patch<DepartmentResponse>(`/departments/${id}`, input);
  return response.data;
}

export async function deactivateDepartment(id: string): Promise<Department> {
  const response = await apiClient.post<DepartmentResponse>(`/departments/${id}/deactivate`);
  return response.data;
}
