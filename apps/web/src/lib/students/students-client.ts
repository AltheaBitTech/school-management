import { apiClient } from '@/lib/api/client';
import {
  downloadAuthenticatedFile,
  postCsvFile,
  type ImportPreviewResult,
} from '@/lib/imports/csv-transfer';
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
  studentClass?: string | null;
  section?: string | null;
  sectionId?: string | null;
  rollNumber?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  academicYear?: string | null;
  currentTerm?: number | null;
  userId?: string | null;
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
  studentClass?: string;
  section?: string;
  classId?: string;
  sectionId?: string;
}): Promise<PaginatedStudentsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.studentClass) searchParams.set('studentClass', params.studentClass);
  if (params?.section) searchParams.set('section', params.section);
  if (params?.classId) searchParams.set('classId', params.classId);
  if (params?.sectionId) searchParams.set('sectionId', params.sectionId);

  const query = searchParams.toString();
  return apiClient.get<PaginatedStudentsResponse>(`/students${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getStudent(id: string): Promise<Student> {
  const response = await apiClient.get<StudentResponse>(`/students/${id}`, { auth: true });
  return response.data;
}

export async function suggestNextStudentCode(): Promise<string> {
  const response = await apiClient.get<{ data: { code: string } }>('/students/next-code', {
    auth: true,
  });
  return response.data.code;
}

export async function createStudent(payload: {
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  dateOfBirth?: string;
  className?: string;
  sectionId?: string;
  studentClass?: string;
  section?: string;
  rollNumber: string;
  guardianName: string;
  guardianPhone: string;
  academicYear: string;
  currentTerm?: number | null;
}): Promise<Student> {
  const response = await apiClient.post<StudentResponse>('/students', payload, { auth: true });
  return response.data;
}

export async function updateStudent(
  id: string,
  payload: {
    firstName?: string;
    lastName?: string;
    displayName?: string | null;
    dateOfBirth?: string | null;
    className?: string | null;
    sectionId?: string;
    studentClass?: string | null;
    section?: string | null;
    rollNumber?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    academicYear?: string | null;
    currentTerm?: number | null;
    status?: StudentStatus;
  },
): Promise<Student> {
  const response = await apiClient.patch<StudentResponse>(`/students/${id}`, payload, { auth: true });
  return response.data;
}

export interface LinkedParent {
  linkId: string;
  parentUserId: string;
  email: string;
  name: string;
}

export interface ParentCandidate {
  id: string;
  email: string;
  name: string;
}

export async function listLinkedParents(studentId: string): Promise<LinkedParent[]> {
  const response = await apiClient.get<{ data: LinkedParent[] }>(`/students/${studentId}/parents`, {
    auth: true,
  });
  return response.data;
}

export async function searchParentCandidates(
  studentId: string,
  search: string,
): Promise<ParentCandidate[]> {
  const params = new URLSearchParams({ search });
  const response = await apiClient.get<{ data: ParentCandidate[] }>(
    `/students/${studentId}/parent-candidates?${params.toString()}`,
    { auth: true },
  );
  return response.data;
}

export async function provisionStudentLogin(
  id: string,
  email: string,
): Promise<{
  userId: string;
  loginEmail: string;
  inviteUrl: string;
  inviteExpiresAt: string;
  emailSent?: boolean;
  emailError?: { code: string; message: string };
}> {
  const response = await apiClient.post<{
    data: {
      userId: string;
      loginEmail: string;
      inviteUrl: string;
      inviteExpiresAt: string;
      emailSent?: boolean;
      emailError?: { code: string; message: string };
    };
  }>(`/students/${id}/provision-login`, { email }, { auth: true });
  return response.data;
}

export async function linkParent(studentId: string, parentUserId: string): Promise<void> {
  await apiClient.post(`/students/${studentId}/parents`, { parentUserId }, { auth: true });
}

export function getStudentDisplayName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}

export function getStudentInitials(
  student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>,
): string {
  const parts = getStudentDisplayName(student).split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  const initials = letters.join('');
  return initials || '?';
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

export function formatStudentClassLabel(
  student: Pick<Student, 'className' | 'studentClass' | 'section'>,
): string {
  if (student.className?.trim()) {
    return student.className.trim();
  }
  const studentClass = student.studentClass?.trim();
  const section = student.section?.trim();
  if (studentClass && section) {
    return `${studentClass} - ${section}`;
  }
  if (studentClass) {
    return studentClass;
  }
  return '—';
}

export const STUDENT_STATUSES: StudentStatus[] = ['ACTIVE', 'INACTIVE'];

export interface StudentImportRowResult {
  row: number;
  status: 'imported' | 'error';
  category?: 'validation' | 'duplicate';
  column?: string;
  studentCode?: string;
  name?: string;
  reason?: string;
}

export interface StudentImportResult {
  imported: number;
  skipped: number;
  duplicateCount?: number;
  rows: StudentImportRowResult[];
}

export async function previewStudentsCsv(file: File): Promise<ImportPreviewResult> {
  return postCsvFile<ImportPreviewResult>('/students/import/preview', file);
}

export async function importStudentsCsv(file: File): Promise<StudentImportResult> {
  return postCsvFile<StudentImportResult>('/students/import', file);
}

export async function downloadStudentImportSampleCsv(): Promise<void> {
  await downloadAuthenticatedFile('/students/import/sample.csv', 'campusops-students-import-sample.csv');
}

export async function downloadStudentImportGuidePdf(): Promise<void> {
  await downloadAuthenticatedFile('/students/import/guide.pdf', 'campusops-student-import-guide.pdf');
}
