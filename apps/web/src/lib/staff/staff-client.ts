import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export interface StaffDepartmentSummary {
  id: string;
  name: string;
  code: string;
}

export interface StaffMember {
  id: string;
  organizationId: string;
  employeeCode: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  mobile?: string | null;
  email?: string | null;
  departmentId?: string | null;
  designation?: string | null;
  joiningDate?: string | null;
  lastWorkingDate?: string | null;
  reportingManagerId?: string | null;
  employmentStatus: 'ACTIVE' | 'OFFBOARDING' | 'OFFBOARDED';
  department?: StaffDepartmentSummary | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedStaffResponse {
  data: StaffMember[];
  meta: PaginationMeta;
}

interface StaffResponse {
  data: StaffMember;
}

export async function listStaff(params?: {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  search?: string;
  sortBy?: 'firstName' | 'lastName' | 'employeeCode' | 'joiningDate';
  sortOrder?: 'asc' | 'desc';
  employmentStatus?: StaffMember['employmentStatus'];
}): Promise<PaginatedStaffResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params?.employmentStatus) searchParams.set('employmentStatus', params.employmentStatus);

  const query = searchParams.toString();
  return apiClient.get<PaginatedStaffResponse>(`/staff${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getStaff(id: string): Promise<StaffMember> {
  const response = await apiClient.get<StaffResponse>(`/staff/${id}`, { auth: true });
  return response.data;
}

export async function createStaff(input: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  mobile?: string;
  email?: string;
  departmentId?: string;
  designation?: string;
  joiningDate?: string;
}): Promise<StaffMember> {
  const response = await apiClient.post<StaffResponse>('/staff', input);
  return response.data;
}

export async function updateStaff(
  id: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    displayName: string | null;
    mobile: string | null;
    email: string | null;
    departmentId: string | null;
    designation: string | null;
    joiningDate: string | null;
  }>,
): Promise<StaffMember> {
  const response = await apiClient.patch<StaffResponse>(`/staff/${id}`, input);
  return response.data;
}

export async function deactivateStaff(id: string): Promise<StaffMember> {
  const response = await apiClient.post<StaffResponse>(`/staff/${id}/deactivate`);
  return response.data;
}

export interface ProvisionStaffLoginInput {
  email: string;
  password: string;
  roleId: string;
}

export interface ProvisionStaffLoginResult {
  staff: StaffMember;
  loginEmail: string;
}

interface ProvisionStaffLoginResponse {
  data: ProvisionStaffLoginResult;
}

export async function provisionStaffLogin(
  id: string,
  input: ProvisionStaffLoginInput,
): Promise<ProvisionStaffLoginResult> {
  const response = await apiClient.post<ProvisionStaffLoginResponse>(
    `/staff/${id}/provision-login`,
    input,
  );
  return response.data;
}

export function getStaffDisplayName(staff: StaffMember): string {
  return staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
}
