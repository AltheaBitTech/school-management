import { apiClient } from '@/lib/api/client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEK_OFF';

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  staffId: string;
  attendanceDate: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: AttendanceStatus;
  lateFlag: boolean;
  earlyDepartureFlag: boolean;
  remarks?: string | null;
  staff?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName?: string | null;
    departmentId?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginatedAttendanceResponse {
  data: AttendanceRecord[];
  meta: PaginationMeta;
}

interface AttendanceResponse {
  data: AttendanceRecord;
}

export const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEK_OFF',
];

export function formatAttendanceStatus(status: AttendanceStatus): string {
  return status.replace(/_/g, ' ');
}

export async function listAttendance(params?: {
  page?: number;
  pageSize?: number;
  attendanceDate?: string;
  fromDate?: string;
  toDate?: string;
  staffId?: string;
  departmentId?: string;
  status?: AttendanceStatus;
}): Promise<PaginatedAttendanceResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.attendanceDate) searchParams.set('attendanceDate', params.attendanceDate);
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  if (params?.staffId) searchParams.set('staffId', params.staffId);
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  return apiClient.get<PaginatedAttendanceResponse>(`/attendance${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function createAttendance(input: {
  staffId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  remarks?: string;
}): Promise<AttendanceRecord> {
  const response = await apiClient.post<AttendanceResponse>('/attendance', input);
  return response.data;
}

export async function updateAttendance(
  id: string,
  input: Partial<{
    status: AttendanceStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    remarks: string | null;
  }>,
): Promise<AttendanceRecord> {
  const response = await apiClient.patch<AttendanceResponse>(`/attendance/${id}`, input);
  return response.data;
}

export async function saveAttendanceForStaff(input: {
  existingRecord?: AttendanceRecord | null;
  staffId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  remarks?: string;
}): Promise<AttendanceRecord> {
  if (input.existingRecord) {
    return updateAttendance(input.existingRecord.id, {
      status: input.status,
      checkInAt: input.checkInAt ?? null,
      checkOutAt: input.checkOutAt ?? null,
      remarks: input.remarks ?? null,
    });
  }

  return createAttendance({
    staffId: input.staffId,
    attendanceDate: input.attendanceDate,
    status: input.status,
    checkInAt: input.checkInAt,
    checkOutAt: input.checkOutAt,
    remarks: input.remarks,
  });
}
