import { getApiV1BaseUrl } from '@/lib/api/config';
import { ApiError, apiClient } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth/session';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type DocumentType = 'BONAFIDE_CERTIFICATE';
export type DocumentOwnerType = 'STUDENT';
export type GeneratedDocumentStatus = 'GENERATED';

export interface GeneratedDocumentStudentSummary {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  className?: string | null;
}

export interface GeneratedDocumentUserSummary {
  id: string;
  email: string;
}

export interface GeneratedDocumentFileSummary {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface GeneratedDocument {
  id: string;
  documentType: DocumentType;
  ownerType: DocumentOwnerType;
  ownerId: string;
  templateId: string;
  templateVersion: number;
  status: GeneratedDocumentStatus;
  generatedByUserId: string;
  createdAt: string;
  student?: GeneratedDocumentStudentSummary;
  generatedBy?: GeneratedDocumentUserSummary;
  file?: GeneratedDocumentFileSummary;
}

interface PaginatedDocumentsResponse {
  data: GeneratedDocument[];
  meta: PaginationMeta;
}

interface GeneratedDocumentResponse {
  data: GeneratedDocument;
}

export async function listDocuments(params?: {
  page?: number;
  pageSize?: number;
  documentType?: DocumentType;
  studentId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PaginatedDocumentsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.documentType) searchParams.set('documentType', params.documentType);
  if (params?.studentId) searchParams.set('studentId', params.studentId);
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);

  const query = searchParams.toString();
  return apiClient.get<PaginatedDocumentsResponse>(`/documents${query ? `?${query}` : ''}`, {
    auth: true,
  });
}

export async function getDocument(id: string): Promise<GeneratedDocument> {
  const response = await apiClient.get<GeneratedDocumentResponse>(`/documents/${id}`, {
    auth: true,
  });
  return response.data;
}

export async function generateBonafideCertificate(studentId: string): Promise<GeneratedDocument> {
  const response = await apiClient.post<GeneratedDocumentResponse>(
    '/documents/bonafide',
    { studentId },
    { auth: true },
  );
  return response.data;
}

export async function downloadGeneratedDocument(id: string): Promise<Blob> {
  const accessToken = getAccessToken();
  const url = `${getApiV1BaseUrl()}/documents/${id}/download`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
    } | null;
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.code,
    );
  }

  return response.blob();
}

export function formatDocumentType(documentType: DocumentType): string {
  switch (documentType) {
    case 'BONAFIDE_CERTIFICATE':
      return 'Bonafide Certificate';
    default:
      return documentType;
  }
}

export function getDocumentStudentDisplayName(
  student: GeneratedDocumentStudentSummary,
): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}

export function formatDocumentDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export const DOCUMENT_TYPES: DocumentType[] = ['BONAFIDE_CERTIFICATE'];
