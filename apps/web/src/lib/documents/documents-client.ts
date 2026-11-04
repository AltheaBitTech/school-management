import { getApiV1BaseUrl } from '@/lib/api/config';
import { ApiError, apiClient } from '@/lib/api/client';
import { getAccessToken } from '@/lib/auth/session';
import type { PaginationMeta } from '@/lib/departments/departments-client';

export type DocumentType =
  | 'BONAFIDE_CERTIFICATE'
  | 'CHARACTER_CERTIFICATE'
  | 'EXPERIENCE_LETTER'
  | 'SALARY_CERTIFICATE'
  | 'VISITOR_PASS'
  | 'STUDENT_ID_CARD'
  | 'STAFF_ID_CARD';

export type DocumentOwnerType = 'STUDENT' | 'STAFF' | 'VISITOR';
export type GeneratedDocumentStatus = 'GENERATED';

export interface GeneratedDocumentStudentSummary {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  className?: string | null;
}

export interface GeneratedDocumentStaffSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  designation?: string | null;
}

export interface GeneratedDocumentVisitorSummary {
  id: string;
  visitorCode: string;
  name: string;
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
  staff?: GeneratedDocumentStaffSummary;
  visitor?: GeneratedDocumentVisitorSummary;
  generatedBy?: GeneratedDocumentUserSummary;
  file?: GeneratedDocumentFileSummary;
}

export interface DocumentTemplateOption {
  type: DocumentType;
  name: string;
  description: string;
  ownerType: DocumentOwnerType;
}

export const DOCUMENT_TEMPLATE_OPTIONS: DocumentTemplateOption[] = [
  {
    type: 'BONAFIDE_CERTIFICATE',
    name: 'Bonafide Certificate',
    description: 'Certifies student enrollment for official use.',
    ownerType: 'STUDENT',
  },
  {
    type: 'CHARACTER_CERTIFICATE',
    name: 'Character Certificate',
    description: 'States student conduct and character.',
    ownerType: 'STUDENT',
  },
  {
    type: 'EXPERIENCE_LETTER',
    name: 'Experience Letter',
    description: 'Employment history for staff members.',
    ownerType: 'STAFF',
  },
  {
    type: 'SALARY_CERTIFICATE',
    name: 'Salary Certificate',
    description: 'Monthly salary confirmation for staff.',
    ownerType: 'STAFF',
  },
  {
    type: 'VISITOR_PASS',
    name: 'Visitor Pass',
    description: 'Check-in pass for active visitors.',
    ownerType: 'VISITOR',
  },
  {
    type: 'STUDENT_ID_CARD',
    name: 'Student ID Card',
    description: 'Printable student identification card.',
    ownerType: 'STUDENT',
  },
  {
    type: 'STAFF_ID_CARD',
    name: 'Staff ID Card',
    description: 'Printable staff identification card.',
    ownerType: 'STAFF',
  },
];

export interface GenerateDocumentInput {
  documentType: DocumentType;
  ownerId: string;
  purpose?: string;
  conduct?: string;
  salaryAmount?: number;
  salaryMonth?: string;
  relievingReason?: string;
  leavingDate?: string;
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

export async function generateDocument(input: GenerateDocumentInput): Promise<GeneratedDocument> {
  const response = await apiClient.post<GeneratedDocumentResponse>('/documents/generate', input, {
    auth: true,
  });
  return response.data;
}

/** @deprecated Prefer generateDocument */
export async function generateBonafideCertificate(studentId: string): Promise<GeneratedDocument> {
  return generateDocument({ documentType: 'BONAFIDE_CERTIFICATE', ownerId: studentId });
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
  return DOCUMENT_TEMPLATE_OPTIONS.find((option) => option.type === documentType)?.name ?? documentType;
}

export function getDocumentTypeChipColor(
  documentType: DocumentType,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' {
  switch (documentType) {
    case 'BONAFIDE_CERTIFICATE':
      return 'primary';
    case 'CHARACTER_CERTIFICATE':
      return 'secondary';
    case 'EXPERIENCE_LETTER':
      return 'info';
    case 'SALARY_CERTIFICATE':
      return 'success';
    case 'VISITOR_PASS':
      return 'warning';
    case 'STUDENT_ID_CARD':
    case 'STAFF_ID_CARD':
      return 'info';
    default:
      return 'default';
  }
}

export function getDocumentOwnerLabel(document: GeneratedDocument): string {
  if (document.student) {
    return `${getDocumentStudentDisplayName(document.student)} (${document.student.studentCode})`;
  }
  if (document.staff) {
    return `${getDocumentStaffDisplayName(document.staff)} (${document.staff.employeeCode})`;
  }
  if (document.visitor) {
    return `${document.visitor.name} (${document.visitor.visitorCode})`;
  }
  return '—';
}

export function getDocumentStudentDisplayName(student: GeneratedDocumentStudentSummary): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }
  return `${student.firstName} ${student.lastName}`.trim();
}

export function getDocumentStaffDisplayName(staff: GeneratedDocumentStaffSummary): string {
  if (staff.displayName?.trim()) {
    return staff.displayName.trim();
  }
  return `${staff.firstName} ${staff.lastName}`.trim();
}

export function formatDocumentDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export const DOCUMENT_TYPES: DocumentType[] = DOCUMENT_TEMPLATE_OPTIONS.map((option) => option.type);

const OWNER_LIST_PERMISSION: Record<DocumentOwnerType, string> = {
  STUDENT: 'student.view',
  STAFF: 'staff.view',
  VISITOR: 'visitor.view',
};

/** Templates whose subject list the active role is allowed to load. */
export interface DocumentSubject {
  id: string;
  code: string;
  label: string;
}

export function documentTemplatesForPermissions(
  permissions: string[] | undefined,
): DocumentTemplateOption[] {
  const canOpenOwnerList = DOCUMENT_TEMPLATE_OPTIONS.some((option) =>
    permissions?.includes(OWNER_LIST_PERMISSION[option.ownerType]),
  );
  if (!canOpenOwnerList && permissions?.includes('document.generate')) {
    return DOCUMENT_TEMPLATE_OPTIONS;
  }

  return DOCUMENT_TEMPLATE_OPTIONS.filter((option) =>
    permissions?.includes(OWNER_LIST_PERMISSION[option.ownerType]),
  );
}

export function usesLimitedDocumentSubjects(
  permissions: string[] | undefined,
  ownerType: DocumentOwnerType,
): boolean {
  return Boolean(
    permissions?.includes('document.generate') &&
      !permissions.includes(OWNER_LIST_PERMISSION[ownerType]),
  );
}

export async function listDocumentSubjects(params: {
  ownerType: DocumentOwnerType;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ data: DocumentSubject[]; meta: PaginationMeta }> {
  const query = new URLSearchParams({ ownerType: params.ownerType });
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.search?.trim()) {
    query.set('search', params.search.trim());
  }
  const response = await apiClient.get<{ data: DocumentSubject[]; meta: PaginationMeta }>(
    `/documents/subjects?${query.toString()}`,
    { auth: true },
  );
  return { data: response.data, meta: response.meta };
}
