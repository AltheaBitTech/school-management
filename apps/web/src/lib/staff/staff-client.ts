import { apiClient } from '@/lib/api/client';
import {
  downloadAuthenticatedFile,
  postCsvFile,
  type ImportPreviewResult,
} from '@/lib/imports/csv-transfer';
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
  loginRole?: { id: string; code: string; name: string } | null;
  loginRoles?: Array<{ id: string; code: string; name: string }>;
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

export async function suggestNextEmployeeCode(): Promise<string> {
  const response = await apiClient.get<{ data: { code: string } }>('/staff/next-code', {
    auth: true,
  });
  return response.data.code;
}

export async function createStaff(input: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  mobile?: string;
  email: string;
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
  roleId: string;
}

export interface ProvisionStaffLoginResult {
  staff: StaffMember;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
}

export interface StaffImportRowResult {
  row: number;
  status: 'imported' | 'error';
  category?: 'validation' | 'duplicate';
  column?: string;
  name?: string;
  email?: string;
  inviteUrl?: string;
  inviteExpiresAt?: string;
  employeeCode?: string;
  reason?: string;
}

export interface StaffImportResult {
  imported: number;
  skipped: number;
  duplicateCount?: number;
  rows: StaffImportRowResult[];
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

export async function previewStaffCsv(file: File): Promise<ImportPreviewResult> {
  return postCsvFile<ImportPreviewResult>('/staff/import/preview', file);
}

export async function importStaffCsv(file: File): Promise<StaffImportResult> {
  return postCsvFile<StaffImportResult>('/staff/import', file);
}

export async function downloadStaffImportSampleCsv(): Promise<void> {
  await downloadAuthenticatedFile('/staff/import/sample.csv', 'campusops-staff-import-sample.csv');
}

export async function downloadStaffImportGuidePdf(): Promise<void> {
  await downloadAuthenticatedFile('/staff/import/guide.pdf', 'campusops-staff-import-guide.pdf');
}

export function getStaffDisplayName(staff: Pick<StaffMember, 'firstName' | 'lastName' | 'displayName'>): string {
  return staff.displayName?.trim() || `${staff.firstName} ${staff.lastName}`.trim();
}

export function getStaffInitials(staff: Pick<StaffMember, 'firstName' | 'lastName' | 'displayName'>): string {
  const parts = getStaffDisplayName(staff).split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}
