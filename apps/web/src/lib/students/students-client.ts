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

export function getStudentDisplayName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}
