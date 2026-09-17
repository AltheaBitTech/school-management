import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface Student {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  dateOfBirth?: string | null;
  className?: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedStudentsResponse {
  data: Student[];
  meta: PaginationMeta;
}

interface StudentResponse {
  data: Student;
}

export async function listStudents(params?: {
  page?: number;
  pageSize?: number;
  status?: StudentStatus;
  search?: string;
}): Promise<PaginatedStudentsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiClient.get<PaginatedStudentsResponse>(`/students${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getStudent(id: string): Promise<Student> {
  const response = await apiClient.get<StudentResponse>(`/students/${id}`, { auth: true });
  return response.data;
}

export async function createStudent(payload: {
  studentCode: string;
  firstName: string;
  lastName: string;
  className?: string;
}): Promise<Student> {
  const response = await apiClient.post<StudentResponse>('/students', payload, { auth: true });
  return response.data;
}

export function getStudentDisplayName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}

export function formatStudentStatus(status: StudentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    default:
      return status;
  }
}

export function formatStudentDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export const STUDENT_STATUSES: StudentStatus[] = ['ACTIVE', 'INACTIVE'];
