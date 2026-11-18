import { apiClient, apiRequest } from '@/lib/api/client';

export type StudentAttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
export type SectionAccessRole = 'ADMIN' | 'CLASS_TEACHER' | 'SUBSTITUTE';

export const STUDENT_ATTENDANCE_STATUS_OPTIONS: Array<{
  value: StudentAttendanceStatus;
  short: string;
  label: string;
}> = [
  { value: 'PRESENT', short: 'P', label: 'Present' },
  { value: 'ABSENT', short: 'A', label: 'Absent' },
  { value: 'HALF_DAY', short: 'H', label: 'Half day' },
  { value: 'ON_LEAVE', short: 'L', label: 'On leave' },
];

export interface AttendanceSection {
  id: string;
  name: string;
  classId: string;
  className: string;
  label: string;
  classTeacherId: string | null;
  classTeacherName: string | null;
  role: SectionAccessRole;
  substituteUntil?: string | null;
}

export interface MySectionsResult {
  attendanceDate: string;
  today: string;
  sections: AttendanceSection[];
}

export interface SectionStudentAttendance {
  id: string;
  studentCode: string;
  name: string;
  rollNumber: string | null;
  attendance: {
    id: string;
    status: StudentAttendanceStatus;
    remarks: string | null;
    updatedAt: string;
  } | null;
}

export interface SectionAttendance {
  section: AttendanceSection;
  attendanceDate: string;
  canMark: boolean;
  students: SectionStudentAttendance[];
}

export interface SectionSubstitute {
  id: string;
  sectionId: string;
  staffId: string;
  staffName: string | null;
  fromDate: string;
  toDate: string;
  reason: string | null;
  createdAt: string;
}

export async function listMyAttendanceSections(date?: string): Promise<MySectionsResult> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const response = await apiClient.get<{ data: MySectionsResult }>(`/student-attendance/my-sections${query}`, {
    auth: true,
  });
  return response.data;
}

export async function getSectionAttendance(sectionId: string, date: string): Promise<SectionAttendance> {
  const response = await apiClient.get<{ data: SectionAttendance }>(
    `/student-attendance/sections/${sectionId}?date=${encodeURIComponent(date)}`,
    { auth: true },
  );
  return response.data;
}

export async function saveSectionAttendance(
  sectionId: string,
  input: {
    attendanceDate: string;
    entries: Array<{ studentId: string; status: StudentAttendanceStatus; remarks?: string }>;
  },
): Promise<SectionAttendance> {
  const response = await apiClient.put<{ data: SectionAttendance }>(`/student-attendance/sections/${sectionId}`, input);
  return response.data;
}

export async function listSectionSubstitutes(sectionId: string): Promise<SectionSubstitute[]> {
  const response = await apiClient.get<{ data: SectionSubstitute[] }>(
    `/student-attendance/sections/${sectionId}/substitutes`,
    { auth: true },
  );
  return response.data;
}

export async function createSectionSubstitute(
  sectionId: string,
  input: { staffId: string; fromDate: string; toDate: string; reason?: string },
): Promise<SectionSubstitute> {
  const response = await apiClient.post<{ data: SectionSubstitute }>(
    `/student-attendance/sections/${sectionId}/substitutes`,
    input,
  );
  return response.data;
}

export async function revokeSectionSubstitute(id: string): Promise<void> {
  await apiRequest<void>(`/student-attendance/substitutes/${id}`, { method: 'DELETE', auth: true });
}

export function formatAttendanceDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
