import { apiClient } from '@/lib/api/client';
import type { GeneratedDocument } from '@/lib/documents/documents-client';
import type { Student } from '@/lib/students/students-client';
import type { StudentFeeDetail } from '@/lib/fees/fees-client';
import type { PaginationMeta } from '@/lib/departments/departments-client';

interface StudentSelfProfileResponse {
  data: Student;
}

interface PaginatedStudentFeesResponse {
  data: StudentFeeDetail[];
  meta: PaginationMeta;
}

export async function getStudentSelfProfile(): Promise<Student> {
  const response = await apiClient.get<StudentSelfProfileResponse>('/student-self/profile', {
    auth: true,
  });
  return response.data;
}

export async function listStudentSelfFees(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedStudentFeesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const query = searchParams.toString();

  return apiClient.get<PaginatedStudentFeesResponse>(
    `/student-self/fees${query ? `?${query}` : ''}`,
    { auth: true },
  );
}

export async function generateStudentSelfIdCard(): Promise<GeneratedDocument> {
  const response = await apiClient.post<{ data: GeneratedDocument }>(
    '/student-self/certificates/id-card',
    {},
    { auth: true },
  );
  return response.data;
}

export async function generateStudentSelfBonafide(purpose?: string): Promise<GeneratedDocument> {
  const response = await apiClient.post<{ data: GeneratedDocument }>(
    '/student-self/certificates/bonafide',
    { purpose },
    { auth: true },
  );
  return response.data;
}

export async function downloadStudentSelfPaymentReceipt(
  studentFeeId: string,
  paymentId: string,
): Promise<void> {
  const { getAccessToken } = await import('@/lib/auth/session');
  const { getApiV1BaseUrl } = await import('@/lib/api/config');
  const token = getAccessToken();
  if (!token) {
    throw new Error('Authentication is required');
  }

  const response = await fetch(
    `${getApiV1BaseUrl()}/student-self/fees/${studentFeeId}/payments/${paymentId}/receipt`,
    {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const { createApiError } = await import('@/lib/api/client');
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
      requestId?: string;
    } | null;
    throw createApiError(payload, response.status, 'Failed to download receipt');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `fee-receipt-${paymentId}.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
